/**
 * FX rate provider boundary.
 *
 * Source: the European Central Bank's euro foreign exchange reference rates, served through
 * Frankfurter (frankfurter.app). Chosen deliberately:
 *   - the underlying rates are published by a central bank, not by a commercial aggregator;
 *   - it needs NO API KEY, so there is no secret to leak into a browser bundle, a log or an image;
 *   - it is a stable, long-lived public endpoint with a documented contract.
 *
 * The provider is an interface, not a hard dependency: a tenant that must use its own treasury
 * rates implements `FxRateProvider` and registers it, and nothing else in the platform changes.
 *
 * This module is SERVER-SIDE ONLY. The browser never calls an FX host directly — it reads the
 * platform's own cached route, so rates are fetched once per process rather than once per render,
 * and so no third-party host sees traffic from a client demonstration.
 */
import {
  FxRateSet,
  SupportedCurrency,
  SUPPORTED_CURRENCIES,
  CANONICAL_BASE_CURRENCY
} from '@/packages/contracts/src/currency-model';

export interface FxRateProvider {
  readonly id: string;
  fetchRates(base: SupportedCurrency, quotes: readonly SupportedCurrency[]): Promise<FxRateSet>;
}

/** How long a provider call may take before the service gives up and degrades. */
export const FX_FETCH_TIMEOUT_MS = 4000;

export class FrankfurterProvider implements FxRateProvider {
  readonly id = 'frankfurter-ecb';
  private readonly endpoint: string;

  constructor(endpoint = process.env.COGNIX_FX_ENDPOINT || 'https://api.frankfurter.app') {
    this.endpoint = endpoint.replace(/\/$/, '');
  }

  async fetchRates(base: SupportedCurrency, quotes: readonly SupportedCurrency[]): Promise<FxRateSet> {
    const wanted = quotes.filter(c => c !== base);
    const url = `${this.endpoint}/latest?base=${base}&symbols=${wanted.join(',')}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FX_FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`FX provider responded ${response.status}`);
      }
      const body = await response.json() as { base?: string; date?: string; rates?: Record<string, number> };

      const rates: Record<SupportedCurrency, number> = { GBP: 0, USD: 0, EUR: 0 };
      rates[base] = 1;
      for (const code of wanted) {
        const value = body.rates?.[code];
        // A rate that is absent, zero or non-finite is a FAILED fetch, not a zero rate. Returning
        // it would silently multiply every pound on the surface by nothing.
        if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
          throw new Error(`FX provider returned no usable rate for ${code}`);
        }
        rates[code] = value;
      }

      return {
        base,
        rates,
        rate_date: typeof body.date === 'string' ? body.date : new Date().toISOString().slice(0, 10),
        retrieved_at: new Date().toISOString(),
        source: 'LIVE_PROVIDER',
        provider: this.id
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

let registered: FxRateProvider = new FrankfurterProvider();

/** Replace the provider — used by tenants with their own treasury rates, and by the test suite. */
export function registerFxProvider(provider: FxRateProvider): void {
  registered = provider;
}

export function getFxProvider(): FxRateProvider {
  return registered;
}

export const DEFAULT_FX_BASE = CANONICAL_BASE_CURRENCY;
export const DEFAULT_FX_QUOTES = SUPPORTED_CURRENCIES;
