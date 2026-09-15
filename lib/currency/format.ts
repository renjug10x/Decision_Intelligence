/**
 * Currency display layer.
 *
 * Every monetary value in CogniX is modelled in GBP and converted ONCE, here, at the point of
 * display. Nothing upstream of this module knows what currency a reader has selected, which is
 * what makes double conversion structurally impossible rather than merely avoided.
 *
 * Two entry points:
 *   - `formatBaseMoney` for a number the caller holds in the base currency. Always prefer it.
 *   - `localiseMoneyInText` for a sentence an engine has already composed with pounds in it.
 *     A display-layer transform over engine prose, not a modelling step: it converts what the
 *     engine wrote, at the same rate, using the same rounding. It exists because the narrative
 *     surfaces compose whole sentences rather than emitting structured amounts. The structural
 *     fix is for those engines to emit amounts and let the surface compose — recorded as such,
 *     and not hidden behind this helper.
 */
import {
  CURRENCY_DEFINITIONS,
  FxRateSet,
  NarrativeStatement,
  SupportedCurrency,
  convertFromBase
} from '@/packages/contracts/src/currency-model';

export interface MoneyFormatOptions {
  /** Abbreviate to K / M above a thousand, as the KPI surfaces do. Default true. */
  compact?: boolean;
  /** Decimal places when not abbreviating. Default 0. */
  decimals?: number;
  /** Always show a leading + or −. Default false. */
  signed?: boolean;
}

/**
 * Format an amount held in the BASE currency for display in `currency`.
 *
 * The parameter name is the contract: pass the modelled value, never something already converted.
 */
export function formatBaseMoney(
  amountInBase: number,
  currency: SupportedCurrency,
  rates: FxRateSet,
  options: MoneyFormatOptions = {}
): string {
  const { compact = true, decimals = 0, signed = false } = options;
  if (!Number.isFinite(amountInBase)) return '—';

  const converted = convertFromBase(amountInBase, currency, rates);
  const symbol = CURRENCY_DEFINITIONS[currency].symbol;
  const locale = CURRENCY_DEFINITIONS[currency].locale;
  const abs = Math.abs(converted);
  const sign = converted < 0 ? '−' : signed ? '+' : '';

  if (compact && abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(2)}M`;
  if (compact && abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${symbol}${abs.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
}

/** A bare converted number, for chart axes and anywhere the symbol is supplied separately. */
export function convertBaseAmount(
  amountInBase: number,
  currency: SupportedCurrency,
  rates: FxRateSet
): number {
  return convertFromBase(amountInBase, currency, rates);
}

export function currencySymbol(currency: SupportedCurrency): string {
  return CURRENCY_DEFINITIONS[currency].symbol;
}

/*
 * Matches a pound amount as the engines write one: £1,234 · £269.4K · £1.71M · £0.62 · -£3,320.
 * Deliberately narrow — it will not touch a bare number, a percentage, a unit count or a date,
 * because a transform over prose must only ever change what it is certain about.
 */
const POUND_AMOUNT = /(-|−|\+)?£\s?(\d[\d,]*(?:\.\d+)?)\s?(K|M|k|m)?/g;

/**
 * Convert every pound amount inside an engine-composed sentence into the display currency.
 *
 * Returns the text unchanged when the display currency IS the base, so a GBP reader never sees a
 * re-rounded value and the transform is a no-op on the default path.
 */
export function localiseMoneyInText(
  text: string,
  currency: SupportedCurrency,
  rates: FxRateSet
): string {
  if (!text || currency === rates.base) return text;
  const symbol = CURRENCY_DEFINITIONS[currency].symbol;

  return text.replace(POUND_AMOUNT, (_match, sign: string | undefined, digits: string, suffix: string | undefined) => {
    const magnitude = suffix ? (suffix.toUpperCase() === 'M' ? 1_000_000 : 1_000) : 1;
    const baseAmount = Number(digits.replace(/,/g, '')) * magnitude;
    if (!Number.isFinite(baseAmount)) return _match;

    const converted = convertFromBase(baseAmount, currency, rates);
    const prefix = sign ?? '';

    // Preserve the engine's own choice of scale and precision, so a "£269.4K" stays a "$361.0K"
    // rather than becoming an unreadable exact figure.
    if (suffix) {
      const scaled = converted / magnitude;
      const decimals = suffix.toUpperCase() === 'M' ? 2 : 1;
      return `${prefix}${symbol}${scaled.toFixed(decimals)}${suffix.toUpperCase()}`;
    }
    const decimalPlaces = digits.includes('.') ? (digits.split('.')[1]?.length ?? 0) : 0;
    return `${prefix}${symbol}${converted.toLocaleString(CURRENCY_DEFINITIONS[currency].locale, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    })}`;
  });
}


/**
 * Render an engine-composed statement in the reader's currency.
 *
 * This is the target architecture that `localiseMoneyInText` stands in for: the amounts arrive
 * structured, so nothing is parsed out of prose and nothing can be mis-parsed. The engine decided
 * what the number means; this decides what it looks like.
 */
export function formatStatement(
  statement: NarrativeStatement,
  currency: SupportedCurrency,
  rates: FxRateSet
): string {
  return statement
    .map(seg =>
      seg.kind === 'text'
        ? seg.text
        : formatBaseMoney(seg.money.amount, currency, rates, {
            compact: seg.compact ?? false,
            decimals: seg.decimals ?? 0
          })
    )
    .join('');
}
