/**
 * Live grounding and interpretation validation (ATL-06C, `AC-ATL-06C-9`).
 *
 * Run:  GEMINI_API_KEY=… npx tsx scripts/atlas-live-grounding-check.ts [--out evidence.json]
 *
 * Everything in ATL-06A/06B/06C is proven against recorded fixtures, which is the right way to prove
 * refusal behaviour — a live search cannot be made to return a stale source on demand. What fixtures
 * cannot prove is that the real service accepts the request this estate sends, returns the shape this
 * estate parses, and that real pages carry the provenance ADR-054 insists on. That is what this
 * script exists for, and it is deliberately a script rather than a test: a check that needs a
 * credential and spends quota does not belong in a suite that runs on every change.
 *
 * Two stages. The first needs no credential.
 *
 *   1. CONTRACT — posts to the real endpoint with a deliberately invalid key and confirms that
 *      Google's own schema validator accepts `tools: [{ googleSearch: {} }]` and the structured
 *      `responseSchema`, rejecting only the credential. A negative control proves the validator is
 *      actually checking field names, so a pass means something.
 *
 *   2. ROUND TRIP — with a real key, runs the three scenarios `AC-ATL-06C-9` requires and records
 *      what actually happened: grounding metadata shape, grounding supports, byte-offset extraction,
 *      redirect resolution, whether real publishers carry machine-readable dates, admission and
 *      rejection by reason, discarded ungrounded prose, Search Suggestions, latency, and failure
 *      behaviour. It also runs **contract-drift checks** against what the fixtures assume, because
 *      the instruction if they differ is to fix the implementation — never to relax the admission
 *      rules to accommodate the provider.
 *
 * Nothing here prints, logs or writes the credential, including into the evidence file.
 */

import { writeFileSync } from 'node:fs';

import { createGoogleSearchGroundingProvider } from '../lib/atlas/grounding/providers/google-search-grounding';
import {
  clearGroundingProviders, registerGroundingProvider,
  type ExternalGroundingProvider, type GroundingRequest
} from '../lib/atlas/grounding/provider';
import { clearGroundingCache } from '../lib/atlas/grounding/providers/grounding-cache';
import { createGeminiInterpretationProvider } from '../lib/atlas/interpretation/gemini-interpreter';
import { clearInterpretationProviders, registerInterpretationProvider } from '../lib/atlas/interpretation/provider';
import { extractGroundedSegments } from '../lib/atlas/grounding/providers/grounding-extraction';
import { resolveSource } from '../lib/atlas/grounding/providers/source-resolution';
import { ask } from '../lib/atlas/ai/gateway';
import type { GeminiGenerateContentResponse } from '../lib/atlas/grounding/providers/gemini-grounding-types';
import { GEMINI_MODEL_ENV_VAR, primaryGeminiModel, resolveGeminiModelConfig } from '../config/gemini-models';

const ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
/** The same governed configuration the adapters use — never a name written here (ADR-067). */
const MODEL = primaryGeminiModel();

/** The three scenarios `AC-ATL-06C-9` requires. */
const SCENARIOS = [
  {
    id: 'S1',
    label: 'current grocery demand-forecasting market question',
    question: 'what are the current market approaches to grocery demand forecasting',
    research: true,
    expectProviderCalled: true
  },
  {
    id: 'S2',
    label: 'current forecast-uncertainty / decision-support market question',
    question: 'how are vendors currently handling forecast uncertainty in decision support',
    research: true,
    expectProviderCalled: true
  },
  {
    id: 'S3',
    label: 'internal CogniX Decision Gap question WITH research requested',
    question: 'how does Decision Gap work',
    research: true,
    expectProviderCalled: false
  }
] as const;

type Json = Record<string, unknown>;
const evidence: Json = { stages: {} as Json };
let failures = 0;

function report(ok: boolean, label: string, detail?: string) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (detail) console.log(`        ${detail}`);
}

// ── Stage 1 ────────────────────────────────────────────────────────────────

async function probe(label: string, body: unknown, expectAccepted = true): Promise<Json> {
  try {
    const response = await fetch(`${ENDPOINT_BASE}/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': 'contract-probe-not-a-key' },
      body: JSON.stringify(body)
    });
    const payload: any = await response.json();
    const message: string = payload?.error?.message ?? '(no message)';
    const shapeAccepted = /API key not valid/i.test(message);
    report(shapeAccepted === expectAccepted, label, `HTTP ${response.status} :: ${message.slice(0, 140)}`);
    return { label, status: response.status, shapeAccepted, message: message.slice(0, 200) };
  } catch (e: unknown) {
    report(false, label, e instanceof Error ? e.message : 'request failed');
    return { label, error: true };
  }
}

async function stageOne(): Promise<void> {
  console.log('\n=== Stage 1 — request contract against the live service (no credential needed) ===\n');
  const results: Json[] = [];
  results.push(await probe('grounding tool `googleSearch` is a recognised field', {
    contents: [{ role: 'user', parts: [{ text: 'probe' }] }],
    tools: [{ googleSearch: {} }]
  }));
  results.push(await probe('structured output `responseSchema` is a recognised field', {
    contents: [{ role: 'user', parts: [{ text: 'probe' }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: { statements: { type: 'ARRAY', items: { type: 'STRING' } } },
        required: ['statements']
      }
    }
  }));
  console.log('  control (the validator must actually be checking field names):');
  results.push(await probe('  …`notARealTool` is rejected as an unknown field, not on the credential', {
    contents: [{ role: 'user', parts: [{ text: 'probe' }] }],
    tools: [{ notARealTool: {} }]
  }, false));
  (evidence.stages as Json).contract = results;
}

// ── Stage 2 ────────────────────────────────────────────────────────────────

/** Wraps the real adapter so we can prove whether it was called at all. */
function countingProvider(inner: ExternalGroundingProvider, calls: GroundingRequest[]): ExternalGroundingProvider {
  return {
    name: inner.name,
    isConfigured: () => inner.isConfigured(),
    retrieve: (r) => { calls.push(r); return inner.retrieve(r); },
    retrieveGrounded: inner.retrieveGrounded ? (r) => { calls.push(r); return inner.retrieveGrounded!(r); } : undefined
  };
}

/** One raw call, kept separate so the wire shape can be inspected before the pipeline touches it. */
async function rawGroundedCall(apiKey: string, question: string): Promise<{ payload: GeminiGenerateContentResponse; ms: number }> {
  const started = Date.now();
  const response = await fetch(`${ENDPOINT_BASE}/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `Research question: ${question}. Report only findings you can support with a specific retrieved web source. Do not speculate.` }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: { temperature: 0 }
    })
  });
  const payload = (await response.json()) as GeminiGenerateContentResponse;
  if (!response.ok) throw new Error(`Gemini grounding request failed (${(payload as any)?.error?.status ?? response.status}).`);
  return { payload, ms: Date.now() - started };
}

/** Compares the observed wire shape against what the fixtures assume. Exported so the
 * assertions that decide a pass can themselves be regression-tested against a recorded live
 * response — the failure this script exists to catch was once a failure IN this script. */
export function contractDrift(payload: GeminiGenerateContentResponse): Json {
  const candidate = payload.candidates?.[0];
  const meta: any = candidate?.groundingMetadata;
  const supports: any[] = meta?.groundingSupports ?? [];
  const chunks: any[] = meta?.groundingChunks ?? [];
  const firstSupport = supports[0];
  const drift = {
    has_grounding_metadata: Boolean(meta),
    chunk_count: chunks.length,
    support_count: supports.length,
    segment_is_object: firstSupport ? typeof firstSupport.segment === 'object' : null,
    // endIndex is required; startIndex is elided at its default value, so its absence on a segment
    // beginning at byte 0 is the contract behaving normally, not a defect to flag.
    segment_has_end_index: firstSupport ? typeof firstSupport.segment?.endIndex === 'number' : null,
    supports_omitting_start_index: supports.filter(x => x?.segment?.startIndex === undefined).length,
    supports_missing_end_index: supports.filter(x => typeof x?.segment?.endIndex !== 'number').length,
    segment_echoes_text: firstSupport ? typeof firstSupport.segment?.text === 'string' : null,
    uses_groundingChunkIndices: firstSupport ? Array.isArray(firstSupport.groundingChunkIndices) : null,
    uses_misspelled_groundingChunckIndices: firstSupport ? 'groundingChunckIndices' in (firstSupport ?? {}) : null,
    web_chunk_has_domain: chunks[0]?.web ? 'domain' in chunks[0].web : null,
    uri_is_vertex_redirect: typeof chunks[0]?.web?.uri === 'string'
      ? chunks[0].web.uri.includes('vertexaisearch.cloud.google.com')
      : null,
    has_search_entry_point: Boolean(meta?.searchEntryPoint?.renderedContent),
    web_search_queries: meta?.webSearchQueries ?? []
  };
  report(drift.has_grounding_metadata === true, 'the live response carries groundingMetadata');
  report(drift.support_count > 0, `groundingSupports present (${drift.support_count})`);
  report(drift.segment_is_object !== false, 'segment is an object, not the string the installed SDK declares');
  report(drift.supports_missing_end_index === 0,
    `every segment carries the required endIndex (${supports.length - drift.supports_missing_end_index}/${supports.length})`);
  if (drift.supports_omitting_start_index > 0) {
    console.log(`        note: ${drift.supports_omitting_start_index} support(s) omit startIndex — elided at its default value, read as byte 0`);
  }
  report(drift.uses_groundingChunkIndices !== false, 'chunk indices use groundingChunkIndices (not the SDK misspelling)');
  report(drift.uri_is_vertex_redirect !== false, 'chunk URIs are grounding redirects, so publisher must be resolved');
  return drift;
}

/** Byte-offset extraction, verified against the passage the service actually returned. Exported
 * for the same reason as `contractDrift`. */
export function byteOffsetEvidence(payload: GeminiGenerateContentResponse): Json {
  const candidate = payload.candidates?.[0];
  const passage = (candidate?.content?.parts ?? []).map(p => p.text ?? '').join('');
  const extraction = extractGroundedSegments(candidate);
  const meta: any = candidate?.groundingMetadata;
  const supports: any[] = meta?.groundingSupports ?? [];

  // Where the service echoes segment.text, a byte slice at the same offsets must reproduce it.
  const buffer = Buffer.from(passage, 'utf8');
  let checked = 0, matched = 0, stringSliceWouldDiffer = 0, impliedStart = 0;
  const mismatches: string[] = [];
  for (const s of supports) {
    const rawStart = s?.segment?.startIndex, end = s?.segment?.endIndex, text = s?.segment?.text;
    if (typeof end !== 'number' || typeof text !== 'string') continue;
    // An absent startIndex means byte 0 — the field is elided at its default value.
    const start = rawStart === undefined ? 0 : rawStart;
    if (typeof start !== 'number') continue;
    if (rawStart === undefined) impliedStart++;
    checked++;
    const byteSlice = buffer.subarray(start, end).toString('utf8');
    if (byteSlice.trim() === text.trim()) matched++;
    else mismatches.push(`[${start},${end}) expected "${text.slice(0, 40)}…" got "${byteSlice.slice(0, 40)}…"`);
    if (passage.slice(start, end).trim() !== text.trim()) stringSliceWouldDiffer++;
  }
  // Mandatory: reconstruction must be exact for every echoed segment, including the ones whose start
  // was implied. A single mismatch means the offsets and the quoted text disagree about what was
  // retrieved, and the whole provenance chain rests on them agreeing.
  report(checked > 0 && matched === checked,
    `byte-offset slicing reproduces EVERY echoed segment (${matched}/${checked}, ${impliedStart} with an implied start of 0)`,
    mismatches.slice(0, 3).join(' | ') || undefined);
  if (stringSliceWouldDiffer > 0) {
    console.log(`        note: a JavaScript string slice would have corrupted ${stringSliceWouldDiffer} of ${checked} segments — the byte-offset handling is load-bearing on this response`);
  }
  return {
    passage_chars: passage.length,
    passage_bytes: buffer.length,
    non_ascii: buffer.length !== passage.length,
    segments_extracted: extraction.segments.length,
    discarded_ungrounded: extraction.discardedUngrounded,
    notices: extraction.notices,
    byte_offsets_checked: checked,
    byte_offsets_matched: matched,
    byte_offsets_with_implied_start: impliedStart,
    string_slice_would_differ: stringSliceWouldDiffer
  };
}

/** Follows every referenced redirect and records what real publishers actually expose. */
async function sourceEvidence(payload: GeminiGenerateContentResponse): Promise<Json> {
  const candidate = payload.candidates?.[0];
  const chunks = candidate?.groundingMetadata?.groundingChunks ?? [];
  const rows: Json[] = [];
  let dated = 0, allowlisted = 0;
  for (const chunk of chunks.slice(0, 8)) {
    const started = Date.now();
    const resolution = await resolveSource(chunk.web, async (url) => {
      const response = await fetch(url, { redirect: 'follow', headers: { accept: 'text/html,*/*' } });
      const html = response.ok ? (await response.text()).slice(0, 200_000) : '';
      return { finalUrl: response.url || url, html, status: response.status };
    });
    const s = resolution.source;
    if (s?.published_at) dated++;
    if (s && s.tier !== 'unknown') allowlisted++;
    rows.push({
      resolved: Boolean(s), failure: resolution.failure, ms: Date.now() - started,
      host: s?.host ?? null, publisher: s?.publisher ?? null,
      published_at: s?.published_at || null, tier: s?.tier ?? null
    });
  }
  console.log(`        resolved ${rows.filter(r => r.resolved).length}/${rows.length} sources · ${dated} carry a machine-readable date · ${allowlisted} are allowlisted`);
  return { count: rows.length, with_date: dated, allowlisted, rows };
}

async function stageTwo(apiKey: string): Promise<void> {
  console.log('\n=== Stage 2 — live grounded round trip ===\n');
  const scenarios: Json[] = [];

  // One raw call first, so the wire contract and byte handling are inspected on real output.
  console.log('  Wire contract on a real grounded response:');
  let raw: { payload: GeminiGenerateContentResponse; ms: number } | null = null;
  try {
    raw = await rawGroundedCall(apiKey, SCENARIOS[0].question);
    console.log(`        first grounded call: ${raw.ms} ms`);
  } catch (e) {
    report(false, 'raw grounded call', e instanceof Error ? e.message : 'failed');
  }
  if (raw) {
    (evidence.stages as Json).wire = {
      latency_ms: raw.ms,
      drift: contractDrift(raw.payload),
      bytes: byteOffsetEvidence(raw.payload),
      sources: await sourceEvidence(raw.payload)
    };
  }

  for (const scenario of SCENARIOS) {
    console.log(`\n  ${scenario.id} — ${scenario.label}`);
    clearGroundingProviders();
    clearInterpretationProviders();
    clearGroundingCache();
    const calls: GroundingRequest[] = [];
    registerGroundingProvider(countingProvider(createGoogleSearchGroundingProvider(), calls));
    registerInterpretationProvider(createGeminiInterpretationProvider());

    const started = Date.now();
    let answer: Awaited<ReturnType<typeof ask>> | null = null;
    let error: string | null = null;
    try {
      answer = await ask({ question: scenario.question, research: scenario.research });
    } catch (e) {
      error = e instanceof Error ? e.message : 'failed';
    }
    const ms = Date.now() - started;

    if (!answer) {
      report(false, `${scenario.id} completed`, error ?? 'no answer');
      scenarios.push({ id: scenario.id, question: scenario.question, error, ms });
      continue;
    }

    const g = answer.grounding;
    report(calls.length > 0 === scenario.expectProviderCalled,
      scenario.expectProviderCalled
        ? `${scenario.id}: the grounding provider was called`
        : `${scenario.id}: the grounding provider was NOT called, though research was requested`,
      `intent=${g.decision.intent} · provider calls=${calls.length} · ${ms} ms`);

    if (!scenario.expectProviderCalled) {
      report(g.market_context.available === false && (g.market_context.absence_reason ?? '').length > 0,
        `${scenario.id}: market context is explicitly absent, with a reason`);
    } else {
      report(g.market_context.statements.every(s =>
        s.source.url.startsWith('https://') && s.source.publisher && s.source.published_at && s.source.tier !== 'unknown'),
        `${scenario.id}: every admitted claim carries complete provenance`,
        `${g.market_context.statements.length} admitted · ${g.rejected_claims.length} rejected`);
      const reasons = [...new Set(g.rejected_claims.map(r => r.reason))];
      if (reasons.length) console.log(`        rejection reasons: ${reasons.join(', ')}`);
      for (const s of g.market_context.statements) {
        console.log(`        + ${s.source.publisher} · ${s.source.tier} · ${s.source.published_at} · ${s.freshness.verdict}`);
        console.log(`          ${s.claim.slice(0, 150)}`);
      }
    }

    const audit = g.interpretation_audit;
    console.log(`        interpretation: proposed ${audit?.proposed ?? 0}, verified ${audit?.verified ?? 0}, dropped ${audit?.dropped.length ?? 0}`);
    for (const d of audit?.dropped ?? []) console.log(`        x [${d.reason}] ${d.text.slice(0, 110)}`);

    scenarios.push({
      id: scenario.id,
      question: scenario.question,
      latency_ms: ms,
      intent: g.decision.intent,
      provider_calls: calls.length,
      queries: g.search_transparency?.queries ?? [],
      discarded_ungrounded: g.search_transparency?.discarded_ungrounded_segments ?? 0,
      unresolved_sources: g.search_transparency?.unresolved_sources ?? 0,
      search_suggestions_present: Boolean(g.search_transparency?.search_entry_point_html),
      admitted: g.market_context.statements.map(s => ({
        publisher: s.source.publisher, tier: s.source.tier,
        published_at: s.source.published_at, freshness: s.freshness.verdict, url: s.source.url
      })),
      rejected: g.rejected_claims.map(r => ({ reason: r.reason })),
      contradictions: g.contradictions.length,
      interpretation: {
        proposed: audit?.proposed ?? 0, verified: audit?.verified ?? 0,
        dropped: (audit?.dropped ?? []).map(d => d.reason)
      }
    });
  }
  (evidence.stages as Json).scenarios = scenarios;

  // Failure behaviour, observed rather than assumed.
  console.log('\n  Failure behaviour:');
  clearGroundingProviders(); clearGroundingCache();
  const badModel = createGoogleSearchGroundingProvider({ models: ['gemini-does-not-exist-9x'] });
  let failureMessage = '';
  try {
    await badModel.retrieveGrounded!({ question: 'probe', topics: ['market and competitor landscape'], capability_ids: [] });
  } catch (e) {
    failureMessage = e instanceof Error ? e.message : String(e);
  }
  report(failureMessage.length > 0 && !failureMessage.includes(apiKey),
    'a provider failure reports a status and never echoes the credential',
    failureMessage.slice(0, 140));
  (evidence.stages as Json).failure = { message: failureMessage.slice(0, 200), leaks_credential: failureMessage.includes(apiKey) };
}

async function main() {
  await stageOne();

  const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
  if (!apiKey) {
    console.log('\n=== Stage 2 — SKIPPED, NOT PASSED ===\n');
    console.log('  GEMINI_API_KEY is not set, so no live round trip was attempted.');
    console.log('  AC-ATL-06C-9 remains OPEN. Re-run as:');
    console.log('    GEMINI_API_KEY=… npx tsx scripts/atlas-live-grounding-check.ts\n');
    evidence.stage_two = 'skipped — no credential';
    process.exit(0);
  }

  await stageTwo(apiKey);

  const outIndex = process.argv.indexOf('--out');
  if (outIndex > -1 && process.argv[outIndex + 1]) {
    const serialised = JSON.stringify(evidence, null, 2);
    if (serialised.includes(apiKey)) {
      console.error('\nRefusing to write evidence: the credential appears in it.');
      process.exit(1);
    }
    writeFileSync(process.argv[outIndex + 1], serialised);
    console.log(`\n  Evidence written to ${process.argv[outIndex + 1]} (credential-free).`);
  }

  console.log('\n====================================================');
  console.log(failures === 0
    ? 'LIVE VALIDATION PASSED — AC-ATL-06C-9 can be closed.'
    : `LIVE VALIDATION FAILED — ${failures} check(s) did not pass. AC-ATL-06C-9 stays open.`);
  console.log('====================================================\n');
  process.exit(failures === 0 ? 0 : 1);
}

// Only run when invoked directly. Importing this module — which the ATL-06C suite does, to regression
// test the assertions themselves — must not fire a live check or exit the process.
const invokedDirectly = (process.argv[1] ?? '').endsWith('atlas-live-grounding-check.ts');
if (invokedDirectly) {
  main().catch(e => { console.error('Live check failed:', e instanceof Error ? e.message : e); process.exit(1); });
}
