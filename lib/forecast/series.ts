/**
 * CTW-03 — building a forecast dataset from the demand history, with its provenance.
 *
 * This deliberately does not reuse `lib/query-engine.ts`'s window helpers. Three of the six defects
 * recorded in `COGNIX_FORECAST_MODEL_TRUTH_RECORD.md` live in those helpers and are corrected here
 * rather than inherited:
 *
 *   `D-FM-1` — the previous engine divided an empty trailing day into its own mean, understating
 *             every forecast by 7.14%. A period with no rows is **excluded and published as an
 *             exclusion**, never carried as a zero.
 *   `D-FM-2` — the previous window was anchored to a hard-coded `2026-06-04` and never read the
 *             data. The window here is derived from the data's own coverage.
 *   `D-FM-3` — the previous day-of-week table read a local weekday from a UTC-parsed date, shifting
 *             the whole seasonal pattern by a day west of UTC. No local time is used anywhere on
 *             this path; the model estimates seasonality from the series rather than reading a
 *             weekday at all.
 *
 * The legacy path is untouched — correcting it is not in CTW-03's scope, and the defects stay open
 * on the register.
 */

import {
  ForecastDataProvenance,
  ForecastDataset,
  ForecastObservation
} from '../../packages/contracts/src/forecast-model-model';

let sales: any[] | null = null;

async function getSales(): Promise<any[]> {
  if (!sales) {
    const data = await import('../../data/sales_daily.json');
    sales = data.default as any[];
  }
  return sales;
}

export interface SeriesScope {
  store_id?: string;
  category?: string;
  sku_id?: string;
}

export type SeriesMeasure = 'units_sold' | 'revenue' | 'waste_units';

/**
 * Aggregate the demand history into one daily series.
 *
 * A day is included only if it carries at least one row in scope. A day with rows summing to zero
 * is a real zero and is kept; a day with no rows at all is an absence of evidence and is excluded
 * with its reason recorded. Those are different things, and conflating them is `D-FM-1`.
 */
export async function buildForecastDataset(params: {
  scope?: SeriesScope;
  measure?: SeriesMeasure;
  /** Optional cap on how much history to fit, most recent first. Omit to use everything. */
  maxObservations?: number;
}): Promise<ForecastDataset> {
  const scope = params.scope || {};
  const measure = params.measure || 'units_sold';
  const rows = await getSales();

  const totals = new Map<string, number>();
  const rowCounts = new Map<string, number>();
  const allDates = new Set<string>();

  for (const r of rows) {
    allDates.add(r.date);
    if (scope.store_id && r.store_id !== scope.store_id) continue;
    if (scope.category && r.category !== scope.category) continue;
    if (scope.sku_id && r.sku_id !== scope.sku_id) continue;
    totals.set(r.date, (totals.get(r.date) || 0) + (r[measure] || 0));
    rowCounts.set(r.date, (rowCounts.get(r.date) || 0) + 1);
  }

  const ordered = [...allDates].sort();
  const excluded: ForecastDataProvenance['excluded_periods'] = [];
  let observations: ForecastObservation[] = [];

  for (const date of ordered) {
    const count = rowCounts.get(date) || 0;
    if (count === 0) {
      excluded.push({
        period: date,
        reason: 'No observations in scope for this day. An absent day is not a zero and is not fitted.'
      });
      continue;
    }
    observations.push({ period: date, value: Number((totals.get(date) || 0).toFixed(4)) });
  }

  // Trim leading exclusions out of the window entirely so the series starts on real evidence, then
  // apply any cap from the most recent end.
  if (typeof params.maxObservations === 'number' && observations.length > params.maxObservations) {
    observations = observations.slice(observations.length - params.maxObservations);
  }

  const scopeLabel = Object.keys(scope).length
    ? Object.entries(scope).map(([k, v]) => `${k}=${v}`).join(',')
    : 'national';

  const provenance: ForecastDataProvenance = {
    dataset_id: `sales_daily:${measure}:${scopeLabel}:${observations.length}`,
    source: 'data/sales_daily.json',
    scope: Object.keys(scope).length ? (scope as Record<string, string>) : { scope: 'national' },
    measure,
    grain: 'DAY',
    first_period: observations[0]?.period ?? '',
    last_period: observations[observations.length - 1]?.period ?? '',
    observation_count: observations.length,
    excluded_periods: excluded,
    synthetic_demo: true
  };

  return { provenance, observations };
}
