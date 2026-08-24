/**
 * Grounding cache and call budget (ATL-06B, ADR-056).
 *
 * External research costs money and quota, and the same question asked twice in a demonstration is
 * the common case rather than the exception. Two controls, both deliberately boring:
 *
 *   - a short-lived cache keyed on the normalised question, the topics the policy permitted and the
 *     model, so a repeat within the window is served without a call;
 *   - a per-process call budget, so a loop in a caller cannot quietly spend a quota.
 *
 * The cache stores what the provider returned, never a rendered answer, and it is bypassed entirely
 * when nothing was retrieved — caching an empty result would turn one transient failure into an
 * hour of silent emptiness.
 */

import type { GroundingRetrieval } from '../provider';

export const DEFAULT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
export const DEFAULT_MAX_ENTRIES = 64;
/** Bound on live provider calls per process. Generous for a demonstration, finite for a loop. */
export const DEFAULT_CALL_BUDGET = 40;

interface CacheEntry { value: GroundingRetrieval; expires: number }

const cache = new Map<string, CacheEntry>();
let liveCalls = 0;

export function cacheKey(question: string, topics: string[], model: string): string {
  const q = question.trim().toLowerCase().replace(/\s+/g, ' ');
  return `${model}::${[...topics].sort().join('|')}::${q}`;
}

export function getCached(key: string, now = Date.now()): GroundingRetrieval | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expires <= now) { cache.delete(key); return null; }
  return entry.value;
}

export function setCached(key: string, value: GroundingRetrieval, ttlMs = DEFAULT_CACHE_TTL_MS, now = Date.now()): void {
  // An empty retrieval is not cached: one bad minute must not become six quiet hours.
  if (value.claims.length === 0) return;
  if (cache.size >= DEFAULT_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expires: now + ttlMs });
}

export function clearGroundingCache(): void { cache.clear(); liveCalls = 0; }

export function liveCallCount(): number { return liveCalls; }

export function budgetRemaining(budget = DEFAULT_CALL_BUDGET): number {
  return Math.max(0, budget - liveCalls);
}

export function recordLiveCall(): void { liveCalls++; }
