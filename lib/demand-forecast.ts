/**
 * FM-01 — the governed demand projection.
 *
 * This replaces `getForecastProjections`, which was the last place in CogniX where a "forecast" was
 * produced by multiplying one fourteen-day mean through a closed-form curve over a loop index. The
 * full account of what that engine did is in `COGNIX_FORECAST_MODEL_TRUTH_RECORD.md`; the short
 * version is that selecting *ARIMA* and passing a garbage string returned identical numbers, and
 * every projection was 7.14% low because a day with no rows was divided into its own mean.
 *
 * Nothing here forecasts. It composes:
 *
 *     buildForecastDataset  →  executeForecast  →  declared scenario adjustment  →  decision layer
 *
 * and the one rule it exists to hold is that **the model named on screen is the implementation that
 * produced the numbers**. Demand & Forecast and the Continuous Live Decision Twin now reach the same
 * boundary; there is no second forecasting path in the estate.
 *
 * ── Why the scenario levers sit outside the model ────────────────────────────────────────────
 *
 * Promotion depth, cannibalisation and an event multiplier are **declared commercial assumptions**,
 * not model output. The old engine folded them into the projection and published one number, which
 * made a slider look like a forecast. Here the model's own expectation is published as
 * `baseline_value` and the adjusted expectation beside it, with the factors and their provenance
 * stated, so a reader can always see which part of a number the data supports and which part is an
 * assumption they are free to disagree with.
 */

import {
  ForecastExecution,
  ForecastOutcome,
  ForecastRefusal,
  ForecastModelId,
  isRefusal
} from '../packages/contracts/src/forecast-model-model';
import { buildForecastDataset, SeriesMeasure, SeriesScope } from './forecast/series';
import { executeForecast } from './forecast/forecast-engine';

export type DemandMetric = 'revenue' | 'units' | 'waste';

const MEASURE_BY_METRIC: Record<DemandMetric, SeriesMeasure> = {
  revenue: 'revenue',
  units: 'units_sold',
  waste: 'waste_units'
};

/** The horizons the surface offers. A horizon the surface cannot offer is not silently accepted. */
export const SUPPORTED_HORIZONS = [7, 14, 30] as const;
export type SupportedHorizon = (typeof SUPPORTED_HORIZONS)[number];

// ---------------------------------------------------------------------------
// Declared scenario adjustment
// ---------------------------------------------------------------------------

export interface ScenarioFactor {
  key: string;
  label: string;
  /** What the user set. */
  setting: string;
  /** The multiplier it contributes. 1 means it changes nothing. */
  factor: number;
}

export interface DeclaredScenarioAdjustment {
  factors: ScenarioFactor[];
  /** The product of every factor. Applied after the model, never inside it. */
  combined_factor: number;
  /** True when nothing is being assumed and the adjusted series equals the model's own. */
  neutral: boolean;
  provenance_class: 'MODELLED_DEMO_ASSUMPTION';
  statement: string;
}

const EVENT_LABELS: Record<string, string> = {
  none: 'None expected',
  heatwave: 'Heatwave / summer spike',
  holiday: 'Bank holiday weekend',
  christmas: 'Christmas spike'
};

/**
 * Event multipliers, unchanged in value from the retired engine and unchanged in nature: they are
 * declared demonstration assumptions and were never estimated from anything. What changes is that
 * they are now published as assumptions rather than folded into a line called a forecast.
 */
function eventFactor(event: string, category?: string): number {
  if (event === 'heatwave') {
    if (!category || category === 'Chilled' || category === 'Produce') return 1.25;
    if (category === 'BWS') return 1.2;
    return 1.0;
  }
  if (event === 'holiday') return 1.15;
  if (event === 'christmas') return 1.35;
  return 1.0;
}

export function declareScenarioAdjustment(params: {
  promoLift: number;
  cannibalization: number;
  eventBoost: string;
  category?: string;
}): DeclaredScenarioAdjustment {
  const promotion = 1 + params.promoLift / 100;
  const cannibalisation = 1 - params.cannibalization / 100;
  const event = eventFactor(params.eventBoost, params.category);

  const factors: ScenarioFactor[] = [
    { key: 'promotion_depth', label: 'Promotion depth', setting: `+${params.promoLift}%`, factor: Number(promotion.toFixed(6)) },
    { key: 'cannibalisation', label: 'Cannibalisation', setting: `−${params.cannibalization}%`, factor: Number(cannibalisation.toFixed(6)) },
    {
      key: 'event',
      label: 'Event or holiday',
      setting: EVENT_LABELS[params.eventBoost] ?? params.eventBoost,
      factor: Number(event.toFixed(6))
    }
  ];

  const combined = Number((promotion * cannibalisation * event).toFixed(6));
  return {
    factors,
    combined_factor: combined,
    neutral: combined === 1,
    provenance_class: 'MODELLED_DEMO_ASSUMPTION',
    statement:
      combined === 1
        ? 'No commercial assumption is applied. The line is the model’s own expectation.'
        : 'Promotion depth, cannibalisation and event uplift are declared commercial assumptions ' +
          'applied after the model, not estimated by it. The model’s own expectation is published ' +
          'beside the adjusted one so the two are never confused.'
  };
}

// ---------------------------------------------------------------------------
// The projection
// ---------------------------------------------------------------------------

/** Where a published range came from. A surface must never show a range without saying which. */
export type RangeBasis = 'EMPIRICALLY_CALIBRATED' | 'MODEL_IMPLIED' | 'NONE';

export interface DemandProjectionPoint {
  date: string;
  horizon_step: number;
  /** What the model projected, before any declared assumption. */
  baseline_value: number;
  /** The model's projection with the declared scenario assumptions applied. */
  value: number;
  /** The range a decision should be read against, on the same adjusted basis as `value`. */
  range_lower: number | null;
  range_upper: number | null;
  range_basis: RangeBasis;
  /** The model's own interval, adjusted, kept separately so the two are always comparable. */
  model_lower: number | null;
  model_upper: number | null;
}

export interface DemandNarrationPoint {
  date: string;
  horizon_step: number;
  /** One sentence, in words a planner uses, supported entirely by the governed figures above. */
  statement: string;
  /** What in the data made that sentence true. */
  basis: string[];
}

export interface DemandProjectionKpi {
  projected_total: number;
  projected_total_lower: number | null;
  projected_total_upper: number | null;
  /**
   * Expected daily demand across the horizon against the observed daily demand over the same number
   * of trailing days. `D-FM-5` is what happens when this is computed against a quantity that seeded
   * the forecast in the first place: it cancels, and the figure carries nothing.
   */
  expected_change_pct: number;
  /** The same comparison on the model's own expectation, with no commercial assumption applied. */
  baseline_change_pct: number;
  comparison_basis: string;
  observed_daily_mean: number;
  observed_days_compared: number;
  /** Relative width of the published range on the last day of the horizon. */
  range_width_pct_at_horizon: number | null;
}

export interface DemandProjection {
  metric: DemandMetric;
  measure: SeriesMeasure;
  horizon: number;
  scope: SeriesScope;
  /** Observed history. Only days the source actually carries rows for; an absent day is never a zero. */
  history: { date: string; value: number }[];
  forecast: DemandProjectionPoint[];
  narration: DemandNarrationPoint[];
  scenario: DeclaredScenarioAdjustment;
  /** The governed execution, verbatim. Model identity, fit, qualification, backtest, calibration. */
  execution: ForecastExecution;
  kpi: DemandProjectionKpi;
}

export type DemandProjectionOutcome = DemandProjection | ForecastRefusal;

export function isDemandRefusal(outcome: DemandProjectionOutcome): outcome is ForecastRefusal {
  return (outcome as ForecastRefusal).refused === true;
}

export interface DemandProjectionRequest {
  storeId?: string;
  category?: string;
  metric: DemandMetric;
  horizon: number;
  modelId: ForecastModelId;
  promoLift: number;
  cannibalization: number;
  eventBoost: string;
  executedAsOf: string;
  /** Off by default. Backtesting refits the model repeatedly and is what calibration needs. */
  backtest?: boolean;
  /** How much observed history the surface draws behind TODAY. Never what the model is fitted on. */
  historyDisplayDays?: number;
}

const DEFAULT_HISTORY_DISPLAY_DAYS = 21;

function round(v: number): number {
  return Number(v.toFixed(2));
}

export async function projectDemand(request: DemandProjectionRequest): Promise<DemandProjectionOutcome> {
  const scope: SeriesScope = {};
  if (request.storeId) scope.store_id = request.storeId;
  if (request.category) scope.category = request.category;

  const measure = MEASURE_BY_METRIC[request.metric];
  const dataset = await buildForecastDataset({ scope, measure });

  const outcome: ForecastOutcome = executeForecast({
    model_id: request.modelId,
    dataset,
    horizon: request.horizon,
    executed_as_of: request.executedAsOf,
    backtest: request.backtest !== false
  });
  if (isRefusal(outcome)) return outcome;
  const execution: ForecastExecution = outcome;

  const scenario = declareScenarioAdjustment({
    promoLift: request.promoLift,
    cannibalization: request.cannibalization,
    eventBoost: request.eventBoost,
    category: request.category
  });
  const k = scenario.combined_factor;

  const calibrated = execution.calibration?.reliable === true;
  const forecast: DemandProjectionPoint[] = execution.points.map(p => {
    const useCalibrated = calibrated && p.calibrated_lower !== null && p.calibrated_upper !== null;
    return {
      date: p.period,
      horizon_step: p.horizon_step,
      baseline_value: round(p.value),
      value: round(p.value * k),
      range_lower: useCalibrated
        ? round(Math.max(0, (p.calibrated_lower as number) * k))
        : p.lower !== null
          ? round(Math.max(0, p.lower * k))
          : null,
      range_upper: useCalibrated
        ? round((p.calibrated_upper as number) * k)
        : p.upper !== null
          ? round(p.upper * k)
          : null,
      range_basis: useCalibrated ? 'EMPIRICALLY_CALIBRATED' : p.lower !== null ? 'MODEL_IMPLIED' : 'NONE',
      model_lower: p.lower !== null ? round(Math.max(0, p.lower * k)) : null,
      model_upper: p.upper !== null ? round(p.upper * k) : null
    };
  });

  // ── History for display. Real observed days only; the exclusions are on the provenance. ──
  const displayDays = request.historyDisplayDays ?? DEFAULT_HISTORY_DISPLAY_DAYS;
  const history = dataset.observations
    .slice(Math.max(0, dataset.observations.length - displayDays))
    .map(o => ({ date: o.period, value: round(o.value) }));

  // ── The comparison D-FM-5 could not make ──
  const compareDays = Math.min(request.horizon, dataset.observations.length);
  const trailing = dataset.observations.slice(dataset.observations.length - compareDays);
  const observedDailyMean = trailing.length
    ? trailing.reduce((a, o) => a + o.value, 0) / trailing.length
    : 0;

  const projectedTotal = forecast.reduce((a, f) => a + f.value, 0);
  const baselineTotal = forecast.reduce((a, f) => a + f.baseline_value, 0);
  const forecastDailyMean = forecast.length ? projectedTotal / forecast.length : 0;
  const baselineDailyMean = forecast.length ? baselineTotal / forecast.length : 0;

  const anyRange = forecast.every(f => f.range_lower !== null && f.range_upper !== null);
  const last = forecast[forecast.length - 1];

  const kpi: DemandProjectionKpi = {
    projected_total: round(projectedTotal),
    projected_total_lower: anyRange ? round(forecast.reduce((a, f) => a + (f.range_lower as number), 0)) : null,
    projected_total_upper: anyRange ? round(forecast.reduce((a, f) => a + (f.range_upper as number), 0)) : null,
    expected_change_pct:
      observedDailyMean > 0 ? Number(((forecastDailyMean - observedDailyMean) / observedDailyMean).toFixed(6)) : 0,
    baseline_change_pct:
      observedDailyMean > 0 ? Number(((baselineDailyMean - observedDailyMean) / observedDailyMean).toFixed(6)) : 0,
    comparison_basis:
      `Expected daily ${request.metric} across the next ${request.horizon} days against the observed daily ` +
      `average over the last ${compareDays} days that carry data (${trailing[0]?.period ?? '—'} to ` +
      `${trailing[trailing.length - 1]?.period ?? '—'}). Days the source holds no rows for are excluded ` +
      'from both sides rather than counted as zero.',
    observed_daily_mean: round(observedDailyMean),
    observed_days_compared: compareDays,
    range_width_pct_at_horizon:
      last && last.range_lower !== null && last.range_upper !== null && last.value > 0
        ? Number((((last.range_upper - last.range_lower) / last.value) * 100).toFixed(2))
        : null
  };

  return {
    metric: request.metric,
    measure,
    horizon: request.horizon,
    scope,
    history,
    forecast,
    narration: narrate(forecast, execution, request.metric),
    scenario,
    execution,
    kpi
  };
}

// ---------------------------------------------------------------------------
// Narration — plain language, and only where a governed figure supports it
// ---------------------------------------------------------------------------

const METRIC_NOUN: Record<DemandMetric, string> = {
  revenue: 'revenue',
  units: 'demand',
  waste: 'waste'
};

/**
 * One sentence per forecast day, derived rather than authored.
 *
 * Every clause has to be true of the numbers beside it, which is why there is no sentence about
 * *why* a day is high: the models here fit level, trend and a weekly pattern, and none of them knows
 * about weather, price or a bank holiday. Saying "demand rises into the weekend" would be a
 * plausible sentence this evidence cannot support.
 */
function narrate(
  forecast: DemandProjectionPoint[],
  execution: ForecastExecution,
  metric: DemandMetric
): DemandNarrationPoint[] {
  if (forecast.length === 0) return [];
  const noun = METRIC_NOUN[metric];
  const mean = forecast.reduce((a, f) => a + f.value, 0) / forecast.length;
  const peak = forecast.reduce((a, b) => (b.value > a.value ? b : a));
  const trough = forecast.reduce((a, b) => (b.value < a.value ? b : a));

  const widthOf = (p: DemandProjectionPoint) =>
    p.range_lower !== null && p.range_upper !== null ? p.range_upper - p.range_lower : null;
  const firstWidth = widthOf(forecast[0]);

  return forecast.map((p, i) => {
    const basis: string[] = [
      `${execution.model_display_name} (${execution.implementation_ref}), execution ${execution.execution_id}`
    ];
    const parts: string[] = [];

    const deltaPct = mean > 0 ? ((p.value - mean) / mean) * 100 : 0;
    if (Math.abs(deltaPct) >= 2) {
      parts.push(
        `Expected ${noun} is ${Math.abs(deltaPct).toFixed(0)}% ${deltaPct > 0 ? 'above' : 'below'} the horizon average`
      );
      basis.push('Compared against the mean of this horizon’s own forecast values');
    } else {
      parts.push(`Expected ${noun} sits close to the horizon average`);
      basis.push('Compared against the mean of this horizon’s own forecast values');
    }

    if (p.horizon_step === peak.horizon_step && peak.value > trough.value) {
      parts.push('the highest day in the horizon');
    } else if (p.horizon_step === trough.horizon_step && peak.value > trough.value) {
      parts.push('the lowest day in the horizon');
    }

    const w = widthOf(p);
    if (w !== null && firstWidth !== null && firstWidth > 0) {
      const growth = w / firstWidth;
      if (growth >= 1.25) {
        parts.push(
          `the range is ${growth.toFixed(1)}× as wide as on day one, so this day carries materially more uncertainty`
        );
        basis.push(
          p.range_basis === 'EMPIRICALLY_CALIBRATED'
            ? 'Range calibrated against held-out backtest errors'
            : 'Range implied by the fitted model’s own residual variance'
        );
      }
    }

    if (i === 0) basis.push('First day beyond the last observed period; nothing here has happened');

    return {
      date: p.date,
      horizon_step: p.horizon_step,
      statement: `${parts.join(', ')}. This day has not happened.`,
      basis
    };
  });
}
