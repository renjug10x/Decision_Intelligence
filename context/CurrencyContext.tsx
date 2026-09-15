'use client';
/**
 * Currency selection for the connected journey.
 *
 * Holds the reader's chosen display currency and the rate set every surface converts through.
 * Rates are read ONCE per session from the platform's own endpoint; switching currency re-renders
 * against rates already in hand and never refetches, so a currency change is instant and cannot
 * fail. The demonstration keeps working with no network at all: the provider degrades to the
 * dated reference set and the control says so.
 */
import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import {
  SupportedCurrency,
  FxRateSet,
  SEEDED_FALLBACK_RATES,
  CANONICAL_BASE_CURRENCY,
  isSupportedCurrency
} from '@/packages/contracts/src/currency-model';
import { formatBaseMoney, localiseMoneyInText, convertBaseAmount, MoneyFormatOptions } from '@/lib/currency/format';

const STORAGE_KEY = 'cognix.display_currency';

interface CurrencyContextValue {
  currency: SupportedCurrency;
  setCurrency: (currency: SupportedCurrency) => void;
  rates: FxRateSet;
  isBaseCurrency: boolean;
  /** Format an amount held in the base currency. */
  money: (amountInBase: number, options?: MoneyFormatOptions) => string;
  /** Convert an amount held in the base currency, without formatting. */
  convert: (amountInBase: number) => number;
  /** Convert pound amounts inside an engine-composed sentence. */
  localise: (text: string) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<SupportedCurrency>(CANONICAL_BASE_CURRENCY);
  const [rates, setRates] = useState<FxRateSet>(SEEDED_FALLBACK_RATES);

  // Restore the reader's choice before the first paint of any money value.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isSupportedCurrency(stored)) setCurrencyState(stored);
    } catch {
      /* Private browsing or blocked storage: the default currency is correct, not an error. */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/v1/fx', { cache: 'no-store' });
        if (!response.ok) return;
        const body = await response.json() as FxRateSet;
        if (!cancelled && body?.rates?.USD && body?.rates?.EUR) setRates(body);
      } catch {
        /* The seeded set is already in state and already carries its own provenance. */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setCurrency = useCallback((next: SupportedCurrency) => {
    setCurrencyState(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* not worth failing over */ }
  }, []);

  const value = useMemo<CurrencyContextValue>(() => ({
    currency,
    setCurrency,
    rates,
    isBaseCurrency: currency === rates.base,
    money: (amountInBase, options) => formatBaseMoney(amountInBase, currency, rates, options),
    convert: amountInBase => convertBaseAmount(amountInBase, currency, rates),
    localise: text => localiseMoneyInText(text, currency, rates)
  }), [currency, rates, setCurrency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

/**
 * Surfaces outside the provider (a standalone render, a test harness) get the base currency and
 * the dated reference rates rather than a thrown error: a money value must always render.
 */
export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (ctx) return ctx;
  return {
    currency: CANONICAL_BASE_CURRENCY,
    setCurrency: () => {},
    rates: SEEDED_FALLBACK_RATES,
    isBaseCurrency: true,
    money: (amountInBase, options) => formatBaseMoney(amountInBase, CANONICAL_BASE_CURRENCY, SEEDED_FALLBACK_RATES, options),
    convert: amountInBase => amountInBase,
    localise: text => text
  };
}
