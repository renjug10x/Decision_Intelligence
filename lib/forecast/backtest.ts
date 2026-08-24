/**
 * CTW-03 — rolling-origin backtesting.
 *
 * "Which model is better" is measured here or it is not said. Each fold re-fits the model on
 * history up to an origin and scores it against the periods that followed, which the model did not
 * see. Metrics are chosen for what they can defend:
 *
 *   - MAE / RMSE — in the series' own units, so they cannot be compared across datasets.
 *   - MAPE — omitted entirely when any actual is zero, because a percentage error on zero is
 *     undefined rather than infinite.
 *   - sMAPE — the symmetric alternative, always defined here.
 *   - MASE — scaled by the in-sample seasonal-naive error, so it is unit-free and comparable.
 *     Below 1 beats the benchmark. This is the metric a comparison is decided on.
 *   - Interval coverage — the share of actuals inside the published interval, which is the only
 *     way to tell an honest interval from a decorative one.
 *
 * `FM-01` additionally returns the residuals themselves rather than only their summary. An interval
 * cannot be calibrated from an average; it is calibrated from the distribution of the errors the
 * model made on periods it did not see, and that distribution is exactly what a fold produces and a
 * mean discards.
 */

import { BacktestMetrics } from '../../packages/contracts/src/forecast-model-model';
import { ForecastModelAdapter } from './adapters/adapter';

const SEASON = 7;

/** One held-out point: what the model said, what happened, and how wide it claimed to be. */
export interface BacktestResidual {
  /** Which rolling origin this point came from. Calibration leaves one of these out at a time. */
  fold: number;
  /** 1-based step ahead of the fold's origin. */
  horizon_step: number;
  period: string;
  actual: number;
  predicted: number;
  error: number;
  /** The model-implied half-width at this step. Zero where the model published no interval. */
  model_half_width: number;
}

export interface BacktestRun {
  metrics: BacktestMetrics;
  residuals: BacktestResidual[];
}

export function backtest(
  adapter: ForecastModelAdapter,
  values: number[],
  periods: string[],
  horizon: number,
  maxFolds = 5,
  /**
   * A common training floor across every compared model. Without it each model chooses its own
   * origins from its own minimum history, and two models get scored on different folds — which is
   * not a comparison at all.
   */
  minTrainOverride?: number,
  /**
   * Spacing between rolling origins, in periods. Defaults to one whole horizon, which is what makes
   * the scored windows disjoint and the metrics above independent of one another.
   *
   * `FM-01`'s calibration pass passes a shorter stride deliberately: a 30-day horizon over 90 days of
   * history yields two disjoint folds, which is not enough evidence to estimate an 80% width from.
   * Overlapping windows buy sample size at the cost of independence, and the calibration record says
   * so rather than presenting the larger sample as if it were free.
   */
  stride?: number
): BacktestRun | null {
  const minTrain = Math.max(adapter.declaration.minimum_observations, minTrainOverride ?? 0);
  if (values.length < minTrain + horizon) return null;

  const step = Math.max(1, stride ?? horizon);

  // Origins most recent first, oldest fold still leaving minTrain behind.
  const origins: number[] = [];
  for (let end = values.length - horizon; end >= minTrain && origins.length < maxFolds; end -= step) {
    origins.push(end);
  }
  if (origins.length === 0) return null;

  let absSum = 0;
  let sqSum = 0;
  let apeSum = 0;
  let sapeSum = 0;
  let covered = 0;
  let intervalPoints = 0;
  let scored = 0;
  let anyZeroActual = false;
  const residuals: BacktestResidual[] = [];

  for (let foldIndex = 0; foldIndex < origins.length; foldIndex++) {
    const end = origins[foldIndex];
    const train = values.slice(0, end);
    const fit = adapter.fit(train);
    const pts = adapter.predict(fit.state, horizon, periods[end - 1]);

    for (let h = 0; h < horizon; h++) {
      const actual = values[end + h];
      if (actual === undefined) break;
      const p = pts[h];
      const err = actual - p.value;
      absSum += Math.abs(err);
      sqSum += err * err;
      if (actual === 0) anyZeroActual = true;
      else apeSum += Math.abs(err / actual);
      const denom = Math.abs(actual) + Math.abs(p.value);
      sapeSum += denom === 0 ? 0 : (2 * Math.abs(err)) / denom;
      let halfWidth = 0;
      if (p.lower !== null && p.upper !== null) {
        intervalPoints++;
        if (actual >= p.lower && actual <= p.upper) covered++;
        halfWidth = (p.upper - p.lower) / 2;
      }
      residuals.push({
        fold: foldIndex,
        horizon_step: h + 1,
        period: periods[end + h] ?? '',
        actual,
        predicted: p.value,
        error: err,
        model_half_width: halfWidth
      });
      scored++;
    }
  }

  if (scored === 0) return null;

  // MASE scale: in-sample mean absolute seasonal-naive error over the whole series.
  let naiveSum = 0;
  let naiveCount = 0;
  for (let t = SEASON; t < values.length; t++) {
    naiveSum += Math.abs(values[t] - values[t - SEASON]);
    naiveCount++;
  }
  const naiveScale = naiveCount > 0 ? naiveSum / naiveCount : 0;

  return {
    metrics: {
      folds: origins.length,
      horizon,
      points_scored: scored,
      mae: Number((absSum / scored).toFixed(4)),
      rmse: Number(Math.sqrt(sqSum / scored).toFixed(4)),
      mape: anyZeroActual ? null : Number(((apeSum / scored) * 100).toFixed(4)),
      smape: Number(((sapeSum / scored) * 100).toFixed(4)),
      mase: naiveScale > 0 ? Number((absSum / scored / naiveScale).toFixed(6)) : null,
      interval_coverage: intervalPoints > 0 ? Number((covered / intervalPoints).toFixed(4)) : null
    },
    residuals
  };
}

/**
 * `FM-01` — residuals gathered specifically for interval calibration.
 *
 * Deliberately a second pass rather than a reuse of the metrics pass. The two jobs want different
 * folds: *"which model is better"* wants disjoint scoring windows so its averages are independent,
 * while *"how wide does the range have to be"* wants as many held-out points as the history can
 * honestly yield. Sharing one fold scheme would have forced one job to accept the other's answer,
 * and would have meant re-recording `CTW-03`'s published MASE the moment calibration needed more
 * folds.
 */
export function calibrationBacktest(
  adapter: ForecastModelAdapter,
  values: number[],
  periods: string[],
  horizon: number
): BacktestRun | null {
  return backtest(adapter, values, periods, horizon, CALIBRATION_MAX_FOLDS, undefined, SEASON);
}

/** Enough origins to estimate an 80% quantile from, without walking off the front of the series. */
const CALIBRATION_MAX_FOLDS = 8;
