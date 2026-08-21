/**
 * Source resolution (ATL-06B, ADR-055).
 *
 * Grounding metadata does not tell you who published a claim or when. It gives a
 * `vertexaisearch.cloud.google.com/grounding-api-redirect/...` URL and a page title, and — on the
 * Gemini Developer API — no `domain` field at all. ATL-06A's admission gate needs a real publisher
 * host, a source tier and a publication date, and refuses to guess any of them.
 *
 * There are two ways to close that gap and only one of them is honest.
 *
 * The tempting one is to ask the model for the publisher and the date. It answers confidently, the
 * fields populate, the claim sails through admission — and the provenance is now model recall
 * wearing the costume of evidence, which is the precise failure ADR-048 exists to prevent.
 *
 * The honest one is to go and look. This module follows the redirect to the real page, reads the
 * publisher from what the page says about itself, and reads the publication date from the page's own
 * structured metadata. What cannot be read is left empty, and ATL-06A then rejects the claim as
 * `undated-source` or `source-not-allowlisted`. **Failing closed is the intended outcome, not a
 * shortfall**: a market claim whose page will not say when it was written has not earned a place
 * beside a governed capability record.
 *
 * The fetcher is injected, so every path here — including redirect failure and a page with no dates
 * anywhere — is provable without a network.
 */

import type { SourceTier } from '../../../../packages/contracts/src/atlas-grounding-model';
import { TRUSTED_SOURCE_HOSTS } from '../provenance';
import type { GeminiGroundingChunkWeb } from './gemini-grounding-types';

export interface SourceFetchResponse {
  /** The URL after redirects. This, not the grounding redirect, is the source's real address. */
  finalUrl: string;
  html: string;
  status: number;
}

export type SourceFetcher = (url: string) => Promise<SourceFetchResponse>;

/**
 * Declared tier per publisher host.
 *
 * Kept in lockstep with ATL-06A's `TRUSTED_SOURCE_HOSTS` — a test asserts every allowlisted host has
 * a tier here and that no tier is declared for a host that is not allowlisted. The two lists are
 * different questions ("may we cite it" and "what kind of source is it") and both must be answered
 * before a claim is shown, so leaving one of them implicit would make a rejection unexplainable.
 */
export const SOURCE_TIER_BY_HOST: Record<string, SourceTier> = {
  'gartner.com': 'analyst', 'forrester.com': 'analyst', 'idc.com': 'analyst',
  'mckinsey.com': 'primary-research', 'bain.com': 'primary-research', 'bcg.com': 'primary-research',
  'deloitte.com': 'primary-research', 'pwc.com': 'primary-research', 'kpmg.com': 'primary-research',
  'accenture.com': 'primary-research',
  'nature.com': 'peer-reviewed', 'science.org': 'peer-reviewed', 'acm.org': 'peer-reviewed',
  'ieee.org': 'peer-reviewed', 'arxiv.org': 'peer-reviewed',
  'iso.org': 'standards-body', 'nist.gov': 'standards-body', 'w3.org': 'standards-body',
  'gs1.org': 'standards-body',
  'grocerydive.com': 'trade-press', 'retailweek.com': 'trade-press',
  'supplychaindive.com': 'trade-press', 'ft.com': 'trade-press', 'economist.com': 'trade-press'
};

/** Fallback publisher names for the allowlisted hosts, used only when a page names no site. */
export const PUBLISHER_BY_HOST: Record<string, string> = {
  'gartner.com': 'Gartner', 'forrester.com': 'Forrester', 'idc.com': 'IDC',
  'mckinsey.com': 'McKinsey & Company', 'bain.com': 'Bain & Company',
  'bcg.com': 'Boston Consulting Group', 'deloitte.com': 'Deloitte', 'pwc.com': 'PwC',
  'kpmg.com': 'KPMG', 'accenture.com': 'Accenture',
  'nature.com': 'Nature', 'science.org': 'Science', 'acm.org': 'ACM', 'ieee.org': 'IEEE',
  'arxiv.org': 'arXiv', 'iso.org': 'ISO', 'nist.gov': 'NIST', 'w3.org': 'W3C', 'gs1.org': 'GS1',
  'grocerydive.com': 'Grocery Dive', 'retailweek.com': 'Retail Week',
  'supplychaindive.com': 'Supply Chain Dive', 'ft.com': 'Financial Times',
  'economist.com': 'The Economist'
};

export function registrableHost(host: string): string | null {
  const lower = host.toLowerCase();
  return TRUSTED_SOURCE_HOSTS.find(h => lower === h || lower.endsWith(`.${h}`)) ?? null;
}

/** `unknown` for anything unrecognised, which ATL-06A treats as inadmissible. */
export function tierForHost(host: string): SourceTier {
  const registrable = registrableHost(host);
  return registrable ? SOURCE_TIER_BY_HOST[registrable] ?? 'unknown' : 'unknown';
}

const DATE_PATTERNS: RegExp[] = [
  /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']article:published_time["']/i,
  /"datePublished"\s*:\s*"([^"]+)"/i,
  /<meta[^>]+name=["'](?:citation_publication_date|dcterms\.date|dc\.date|pubdate|publish-date|date)["'][^>]+content=["']([^"']+)["']/i,
  /<time[^>]+datetime=["'](\d{4}-\d{2}-\d{2}[^"']*)["']/i
];

/**
 * The page's own statement of when it was published, or `null`.
 *
 * `null` is a real answer and is never replaced by "today", by the retrieval date, or by a year
 * scraped out of body copy. A guessed date is worse than no date: no date is refused, a guessed one
 * is believed.
 */
export function extractPublishedDate(html: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const match = html.match(pattern);
    if (!match) continue;
    const raw = match[1].trim();
    const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }
  return null;
}

export function extractSiteName(html: string): string | null {
  const match = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i);
  return match ? match[1].trim() : null;
}

export function extractTitle(html: string): string | null {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og) return og[1].trim();
  const title = html.match(/<title[^>]*>([\s\S]{1,300}?)<\/title>/i);
  return title ? title[1].replace(/\s+/g, ' ').trim() : null;
}

export interface ResolvedSource {
  url: string;
  host: string;
  publisher: string;
  title: string;
  /** ISO date, or `''` when the page does not say. ATL-06A rejects the empty case. */
  published_at: string;
  tier: SourceTier;
}

export type SourceResolutionFailure =
  | 'no-uri' | 'fetch-failed' | 'bad-status' | 'unparseable-url';

export interface SourceResolution {
  source: ResolvedSource | null;
  failure: SourceResolutionFailure | null;
  detail: string | null;
}

/**
 * Follow one grounding chunk to its real page and read what that page says about itself.
 *
 * Failures return a `null` source rather than a partly-filled one. A half-resolved source is the
 * most dangerous object this module could produce, because it looks admissible.
 */
export async function resolveSource(
  web: GeminiGroundingChunkWeb | undefined,
  fetcher: SourceFetcher
): Promise<SourceResolution> {
  const uri = web?.uri;
  if (!uri) return { source: null, failure: 'no-uri', detail: 'The grounding chunk carried no URI.' };

  let response: SourceFetchResponse;
  try {
    response = await fetcher(uri);
  } catch (e: unknown) {
    return {
      source: null, failure: 'fetch-failed',
      detail: `The grounding redirect could not be resolved, so the real publisher is unknown: ${e instanceof Error ? e.message : 'request failed'}.`
    };
  }
  if (response.status >= 400) {
    return { source: null, failure: 'bad-status', detail: `The source returned HTTP ${response.status}.` };
  }

  let host: string;
  try {
    const parsed = new URL(response.finalUrl);
    host = parsed.hostname.toLowerCase();
  } catch {
    return { source: null, failure: 'unparseable-url', detail: `Resolved location '${response.finalUrl}' is not a URL.` };
  }

  const registrable = registrableHost(host);
  const html = response.html ?? '';
  return {
    source: {
      url: response.finalUrl,
      host,
      publisher: extractSiteName(html) ?? (registrable ? PUBLISHER_BY_HOST[registrable] : null) ?? host,
      title: extractTitle(html) ?? web?.title ?? '',
      published_at: extractPublishedDate(html) ?? '',
      tier: tierForHost(host)
    },
    failure: null,
    detail: null
  };
}
