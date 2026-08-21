/**
 * The Google Search grounding adapter (ATL-06B, ADR-055, ADR-056).
 *
 * Server-side only, behind the ATL-06A `ExternalGroundingProvider` seam, and subject to the
 * unmodified ATL-06A admission gate. Everything it returns is a CANDIDATE. Nothing it says is
 * evidence until a real page has been resolved, its publisher recognised, its tier declared and its
 * publication date read from the page itself.
 *
 * Four design choices are load-bearing, and each was made against a more convenient alternative:
 *
 *   1. **REST, not the installed SDK.** `@google/generative-ai@0.24.1` mistypes the grounding
 *      response — `segment` as a string, `groundingChunckIndices` misspelled, no `domain`, and the
 *      legacy `googleSearchRetrieval` tool. Reading evidence through those types would silently
 *      yield zero supports. Calling the documented wire contract adds no dependency and puts the
 *      shape somewhere reviewable (`gemini-grounding-types.ts`).
 *
 *   2. **Only grounded segments become claims.** The model's connective prose is discarded and
 *      counted, never shown. See `grounding-extraction.ts`.
 *
 *   3. **Provenance comes from the page, not the model.** The adapter never asks Gemini who
 *      published something or when. It follows the redirect and reads the page's own metadata. What
 *      the page will not say stays empty, and ATL-06A refuses it.
 *
 *   4. **The key is read from the server environment and never travels.** `GEMINI_API_KEY` is
 *      resolved here, following the ADR-044 precedent set by the CDI-01 drafting route; it is never
 *      accepted from a request body — which the estate's older `/api/ask` and `/api/briefing` demo
 *      routes do — and never appears in a claim, an envelope, a cache key, a notice or an error
 *      message. A provider failure reports that it failed, not what it was holding.
 */

import type {
  ExternalClaim, ExternalSource, GroundingSearchTransparency
} from '../../../../packages/contracts/src/atlas-grounding-model';
import type { ExternalGroundingProvider, GroundingRequest, GroundingRetrieval } from '../provider';
import type { GeminiGenerateContentRequest, GeminiGenerateContentResponse } from './gemini-grounding-types';
import { extractGroundedSegments } from './grounding-extraction';
import { resolveSource, type SourceFetcher, type SourceFetchResponse } from './source-resolution';
import {
  DEFAULT_CACHE_TTL_MS, budgetRemaining, cacheKey, getCached, recordLiveCall, setCached
} from './grounding-cache';

export const GEMINI_ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
export const GEMINI_API_KEY_HEADER = 'x-goog-api-key';

/** Tried in order, matching the estate's existing tolerance for Google retiring model aliases. */
export const GROUNDING_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-flash-latest'] as const;

export const PROVIDER_NAME = 'google-search-grounding';

/**
 * The instruction sent to the model.
 *
 * It asks for market context and forbids two things outright: statements about CogniX, and any
 * claim the model cannot ground. Neither instruction is trusted — a claim about CogniX is rejected
 * by ATL-06A regardless, and an ungrounded sentence is discarded by extraction regardless. The
 * prompt exists to make the useful output more likely, not to make the unsafe output impossible;
 * that is the gate's job, and a prompt that had to be obeyed would be a guardrail made of manners.
 */
export function buildPrompt(question: string, topics: string[]): string {
  return [
    'You are researching market and industry context for an enterprise capability catalogue.',
    `Research question: ${question}`,
    topics.length ? `Focus on: ${topics.join('; ')}.` : '',
    '',
    'Rules:',
    '- Report only what you can support with a specific web source you retrieved.',
    '- State findings as short, self-contained factual sentences.',
    '- Do not make any statement about CogniX, G10X, or their capabilities, roadmap or maturity.',
    '- Do not speculate, and do not fill gaps from memory. If the search returns little, say little.',
    '- Prefer analyst, research, standards-body and established trade sources.'
  ].filter(Boolean).join('\n');
}

/** Default fetcher. Follows redirects and reports where it actually landed. */
const defaultSourceFetcher: SourceFetcher = async (url: string): Promise<SourceFetchResponse> => {
  const response = await fetch(url, { redirect: 'follow', headers: { accept: 'text/html,*/*' } });
  const html = response.ok ? (await response.text()).slice(0, 200_000) : '';
  return { finalUrl: response.url || url, html, status: response.status };
};

export type GeminiTransport = (
  model: string,
  apiKey: string,
  body: GeminiGenerateContentRequest
) => Promise<GeminiGenerateContentResponse>;

const defaultTransport: GeminiTransport = async (model, apiKey, body) => {
  const response = await fetch(`${GEMINI_ENDPOINT_BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', [GEMINI_API_KEY_HEADER]: apiKey },
    body: JSON.stringify(body)
  });
  const payload = (await response.json()) as GeminiGenerateContentResponse;
  if (!response.ok) {
    // Report the status, never the request. The key travelled in a header on this call and must not
    // reappear in a message that will be logged or surfaced.
    const status = payload?.error?.status ?? String(response.status);
    throw new Error(`Gemini grounding request failed (${status}).`);
  }
  return payload;
};

export interface GoogleGroundingOptions {
  /** Injected in test. Production reads `GEMINI_API_KEY` from the server environment. */
  apiKey?: string;
  transport?: GeminiTransport;
  sourceFetcher?: SourceFetcher;
  models?: readonly string[];
  cacheTtlMs?: number;
  now?: () => Date;
}

/**
 * Words that appear in many capability names AND in most market prose. Matching on them relates
 * every claim to every capability, which manufactures contradictions between a record and a claim
 * that was never about it. Declared here so the exclusion is reviewable rather than tuned.
 */
export const GENERIC_CAPABILITY_WORDS = new Set([
  'intelligence', 'platform', 'market', 'window', 'micro', 'graph', 'data', 'state',
  'contract', 'context', 'service', 'management', 'system', 'model', 'engine', 'registry'
]);

/**
 * Which of the answer's capabilities a claim is actually ABOUT.
 *
 * A claim relates to a capability when it names a distinctive word from that capability's name.
 * Anything else is general market context, relates to nothing, and therefore cannot contradict a
 * record it never mentioned. Where the caller supplies no names — an ATL-06A adapter contract — the
 * request's capability ids are used unchanged, so earlier behaviour is preserved exactly.
 */
export function relateClaimToCapabilities(claim: string, request: GroundingRequest): string[] {
  if (!request.capabilities || request.capabilities.length === 0) return request.capability_ids;
  const lower = claim.toLowerCase();
  return request.capabilities
    .filter(c => c.name.toLowerCase().split(/[^a-z]+/).some(word =>
      word.length >= 5 && !GENERIC_CAPABILITY_WORDS.has(word) && new RegExp(`\\b${word}`).test(lower)))
    .map(c => c.id);
}

function claimId(text: string, url: string): string {
  let hash = 0;
  const input = `${url}|${text}`;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) | 0;
  return `GC-${(hash >>> 0).toString(36).toUpperCase()}`;
}

export function createGoogleSearchGroundingProvider(options: GoogleGroundingOptions = {}): ExternalGroundingProvider {
  const transport = options.transport ?? defaultTransport;
  const sourceFetcher = options.sourceFetcher ?? defaultSourceFetcher;
  const models = options.models ?? GROUNDING_MODELS;
  const now = options.now ?? (() => new Date());

  const resolveKey = (): string => (options.apiKey ?? process.env.GEMINI_API_KEY ?? '').trim();

  async function retrieveGrounded(request: GroundingRequest): Promise<GroundingRetrieval> {
    const apiKey = resolveKey();
    if (!apiKey) {
      // ADR-044: name the missing variable, generate nothing.
      throw new Error('Grounding requires the GEMINI_API_KEY environment variable to be set on the server.');
    }

    const key = cacheKey(request.question, request.topics, models[0]);
    const cached = getCached(key, now().getTime());
    if (cached) {
      return { ...cached, transparency: { ...cached.transparency, cache: 'hit' } };
    }
    if (budgetRemaining() === 0) {
      throw new Error('The external grounding call budget for this process is exhausted.');
    }

    const body: GeminiGenerateContentRequest = {
      contents: [{ role: 'user', parts: [{ text: buildPrompt(request.question, request.topics) }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: { temperature: 0 }
    };

    let response: GeminiGenerateContentResponse | null = null;
    let lastError: unknown = null;
    let usedModel: string | null = null;
    for (const model of models) {
      try {
        recordLiveCall();
        response = await transport(model, apiKey, body);
        usedModel = model;
        break;
      } catch (e: unknown) {
        lastError = e;
        const message = e instanceof Error ? e.message : String(e);
        if (/404|NOT_FOUND|not found|no longer available/i.test(message)) continue;
        throw e;
      }
    }
    if (!response || !usedModel) throw lastError ?? new Error('No grounding model was available.');

    const candidate = response.candidates?.[0];
    const extraction = extractGroundedSegments(candidate);
    const meta = candidate?.groundingMetadata;
    const chunks = meta?.groundingChunks ?? [];

    // Resolve each referenced chunk ONCE. A chunk index repeated across supports is the same page.
    const resolutions = new Map<number, Awaited<ReturnType<typeof resolveSource>>>();
    const referenced = [...new Set(extraction.segments.flatMap(s => s.chunkIndices))];
    for (const index of referenced) {
      resolutions.set(index, await resolveSource(chunks[index]?.web, sourceFetcher));
    }

    let unresolved = 0;
    const seenUrls = new Set<string>();
    const claims: ExternalClaim[] = [];
    const topic = request.topics[0] ?? 'market and competitor landscape';
    const retrievedAt = now().toISOString().slice(0, 10);

    for (const segment of extraction.segments) {
      for (const index of segment.chunkIndices) {
        const resolution = resolutions.get(index);
        if (!resolution || !resolution.source) { unresolved++; continue; }
        const resolved = resolution.source;

        // Duplicate sources: the same page cited for the same sentence adds nothing.
        const dedupeKey = `${resolved.url}::${segment.text}`;
        if (seenUrls.has(dedupeKey)) continue;
        seenUrls.add(dedupeKey);

        const source: ExternalSource = {
          url: resolved.url,
          publisher: resolved.publisher,
          title: resolved.title,
          published_at: resolved.published_at,
          retrieved_at: retrievedAt,
          tier: resolved.tier,
          retrieval_method: 'search-grounding'
        };
        claims.push({
          claim_id: claimId(segment.text, resolved.url),
          claim: segment.text,
          source,
          topic,
          // Only the capabilities this claim actually names. A market claim cannot raise a
          // contradiction against a capability it never mentioned.
          about_capabilities: relateClaimToCapabilities(segment.text, request),
          provider: PROVIDER_NAME
        });
      }
    }

    const transparency: GroundingSearchTransparency = {
      queries: meta?.webSearchQueries ?? [],
      search_entry_point_html: meta?.searchEntryPoint?.renderedContent ?? null,
      provider_model: usedModel,
      cache: 'miss',
      discarded_ungrounded_segments: extraction.discardedUngrounded,
      unresolved_sources: unresolved
    };

    const retrieval: GroundingRetrieval = { claims, transparency };
    setCached(key, retrieval, options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS, now().getTime());
    return retrieval;
  }

  return {
    name: PROVIDER_NAME,
    isConfigured: () => resolveKey().length > 0,
    retrieve: async (request) => (await retrieveGrounded(request)).claims,
    retrieveGrounded
  };
}
