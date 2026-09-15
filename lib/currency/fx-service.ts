/**
 * FX service: one cached, degrading read of the rate set.
 *
 * Three guarantees, in priority order:
 *   1. A rate set is ALWAYS returned. A provider outage degrades the provenance, never the
 *      surface — a failed lookup must not blank a decision screen mid-demonstration.
 *   2. No live call per render. Rates are cached for `FX_CACHE_TTL_MS` per process.
 *   3. Provenance is never lost. Cached and seeded sets say so, with the date they were taken,
 *      so a reader is never shown a stale rate presented as a current one.
 */
import {
  FxRateSet,
  SEEDED_FALLBACK_RATES,
  SupportedCurrency
} from '@/packages/contracts/src/currency-model';
import { getFxProvider, DEFAULT_FX_BASE, DEFAULT_FX_QUOTES } from './fx-provider';

/** Reference rates are published once a working day, so an hour is a generous cache. */
export const FX_CACHE_TTL_MS = 60 * 60 * 1000;

interface CacheEntry {
  set: FxRateSet;
  fetchedAtMs: number;
}

let cache: CacheEntry | null = null;
let inFlight: Promise<FxRateSet> | null = null;

/** Drops the cached rate set. Used by the test suite and by a scenario reset. */
export function clearFxCache(): void {
  cache = null;
  inFlight = null;
}

function asCached(set: FxRateSet, ageMs: number): FxRateSet {
  if (set.source === 'SEEDED_FALLBACK') return set;
  return {
    ...set,
    source: 'CACHED_PROVIDER',
    degraded_reason: ageMs > FX_CACHE_TTL_MS
      ? `Live rates unavailable — showing the rates retrieved on ${set.rate_date}.`
      : undefined
  };
}

export async function getFxRates(base: SupportedCurrency = DEFAULT_FX_BASE): Promise<FxRateSet> {
  const now = Date.now();

  if (cache && cache.set.base === base && now - cache.fetchedAtMs < FX_CACHE_TTL_MS) {
    return asCached(cache.set, now - cache.fetchedAtMs);
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const set = await getFxProvider().fetchRates(base, DEFAULT_FX_QUOTES);
      cache = { set, fetchedAtMs: Date.now() };
      return set;
    } catch (error) {
      /*
       * Last known good first, seeded reference second. A provider outage mid-demonstration must
       * cost provenance, not the screen. The reason is carried forward so the currency control can
       * say what the reader is looking at.
       */
      const reason = error instanceof Error ? error.message : 'FX provider unavailable';
      if (cache && cache.set.base === base) {
        return {
          ...cache.set,
          source: 'CACHED_PROVIDER' as const,
          degraded_reason: `Live rates unavailable (${reason}) — showing the rates retrieved on ${cache.set.rate_date}.`
        };
      }
      return {
        ...SEEDED_FALLBACK_RATES,
        degraded_reason: `Live rates unavailable (${reason}) — showing the last recorded reference rates from ${SEEDED_FALLBACK_RATES.rate_date}.`
      };
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
