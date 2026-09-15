/**
 * CogniX Currency Model
 * ───────────────────────────────────────────────────────────────────────────────
 * One conversion layer for the connected decision journey.
 *
 * The rule this exists to enforce: a displayed money value is the CANONICAL value converted
 * once, at a rate that is named and dated. Not a symbol swap, and never a value that has been
 * through the layer twice. Everything the platform models — exposure, contribution, premiums,
 * recovery — is held in the canonical base currency and converted only at the point of display.
 */

export type SupportedCurrency = 'GBP' | 'USD' | 'EUR';

/** The currency every modelled value is held in. Conversion is a display concern, never a storage one. */
export const CANONICAL_BASE_CURRENCY: SupportedCurrency = 'GBP';

export const SUPPORTED_CURRENCIES: readonly SupportedCurrency[] = ['GBP', 'USD', 'EUR'];

export interface CurrencyDefinition {
  code: SupportedCurrency;
  symbol: string;
  name: string;
  /** IETF tag used for grouping and decimal conventions. */
  locale: string;
}

export const CURRENCY_DEFINITIONS: Readonly<Record<SupportedCurrency, CurrencyDefinition>> = {
  GBP: { code: 'GBP', symbol: '£', name: 'Pound sterling', locale: 'en-GB' },
  USD: { code: 'USD', symbol: '$', name: 'US dollar', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'en-IE' }
};

export type FxRateSource = 'LIVE_PROVIDER' | 'CACHED_PROVIDER' | 'SEEDED_FALLBACK';

export interface FxRateSet {
  base: SupportedCurrency;
  /** Units of each quoted currency per one unit of `base`. The base's own rate is always 1. */
  rates: Readonly<Record<SupportedCurrency, number>>;
  /** The date the rates were published by the provider, or the date the fallback was recorded. */
  rate_date: string;
  /** When this set was retrieved. Distinct from `rate_date`: a cached set is older than its fetch. */
  retrieved_at: string;
  source: FxRateSource;
  provider: string;
  /**
   * Set when the rates in use are not live. The surface says so rather than presenting a stale
   * or seeded rate as a current one — a converted figure whose provenance is hidden is worse
   * than an unconverted one.
   */
  degraded_reason?: string;
}

export function isSupportedCurrency(value: unknown): value is SupportedCurrency {
  return typeof value === 'string' && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

/**
 * Convert an amount held in the canonical base currency into a display currency.
 *
 * Takes the BASE amount, never a previously converted one — the signature is the guard against
 * double conversion, and the test suite asserts that converting to the base returns the input
 * unchanged rather than multiplying by a near-1.0 rate.
 */
export function convertFromBase(
  amountInBase: number,
  target: SupportedCurrency,
  rates: FxRateSet
): number {
  if (!Number.isFinite(amountInBase)) return amountInBase;
  if (target === rates.base) return amountInBase;
  const rate = rates.rates[target];
  if (!Number.isFinite(rate) || rate <= 0) return amountInBase;
  return amountInBase * rate;
}

/**
 * Rates recorded as a last-known-good fallback, with the date they were observed.
 *
 * The demonstration must never depend on a network call to render a number, and a failed FX
 * lookup must never blank a decision surface. These are indicative rates carried so the product
 * degrades to a dated, declared conversion instead of to an error. They are deliberately NOT
 * presented as current: any surface using them is told, through `degraded_reason`.
 */
export const SEEDED_FALLBACK_RATES: FxRateSet = {
  base: 'GBP',
  rates: { GBP: 1, USD: 1.34, EUR: 1.16 },
  rate_date: '2026-05-01',
  retrieved_at: '2026-05-01T00:00:00.000Z',
  source: 'SEEDED_FALLBACK',
  provider: 'cognix-seeded-reference',
  degraded_reason: 'No live rate available — showing the last recorded reference rates.'
};


// ── Structured money in engine narrative ─────────────────────────────────────

/**
 * A monetary amount an engine computed, with what it MEANS, before anyone decides how to show it.
 *
 * The engine owns economic meaning; the surface owns currency presentation. Where an engine
 * composes a whole sentence with a pound sign already in it, that separation is lost: the amount
 * stops being a number with a meaning and becomes characters in a string, and the only way to show
 * it in another currency is to parse the sentence back apart again. `meaning` is deliberately a
 * semantic key rather than a label, so a surface can style, order or omit an amount rather than
 * only reprint it.
 */
export interface MoneyAmount {
  /** The value, in `base_currency`. Never pre-converted — conversion happens at display. */
  amount: number;
  base_currency: SupportedCurrency;
  /** What this amount IS, e.g. 'gross_margin_recovered'. Not a display label. */
  meaning: string;
}

export type NarrativeSegment =
  | { kind: 'text'; text: string }
  | { kind: 'money'; money: MoneyAmount; compact?: boolean; decimals?: number };

/**
 * A sentence an engine composed, with its money still structured.
 *
 * Rendered by the surface through the shared currency layer. An engine emits this ALONGSIDE its
 * plain-text form rather than instead of it, so a consumer that only wants a string — a log, an
 * export, a recorded contract — is unaffected.
 */
export type NarrativeStatement = readonly NarrativeSegment[];

export function moneyAmount(amount: number, meaning: string): MoneyAmount {
  return { amount, base_currency: CANONICAL_BASE_CURRENCY, meaning };
}

/** Flatten a statement to plain text in the base currency. The engine's own string form. */
export function statementToBaseText(statement: NarrativeStatement): string {
  return statement
    .map(seg => {
      if (seg.kind === 'text') return seg.text;
      const symbol = CURRENCY_DEFINITIONS[seg.money.base_currency].symbol;
      const abs = Math.abs(seg.money.amount);
      const sign = seg.money.amount < 0 ? '\u2212' : '';
      if (seg.compact && abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(2)}M`;
      if (seg.compact && abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(1)}K`;
      return `${sign}${symbol}${abs.toLocaleString('en-GB', {
        minimumFractionDigits: seg.decimals ?? 0,
        maximumFractionDigits: seg.decimals ?? 0
      })}`;
    })
    .join('');
}
