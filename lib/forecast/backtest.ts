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
 */

import { BacktestMetrics } from '../../packages/contracts/src/forecast-model-model';
import { ForecastModelAdapter } from './adapters/adapter';

const SEASON = 7;

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
  minTrainOverride?: number
): BacktestMetrics | null {
  const minTrain = Math.max(adapter.declaration.minimum_observations, minTrainOverride ?? 0);
  if (values.length < minTrain + horizon) return null;

  // Origins spaced one horizon apart, most recent first, oldest fold still leaving minTrain behind.
  const origins: number[] = [];
  for (let end = values.length - horizon; end >= minTrain && origins.length < maxFolds; end -= horizon) {
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

  for (const end of origins) {
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
      if (p.lower !== null && p.upper !== null) {
        intervalPoints++;
        if (actual >= p.lower && actual <= p.upper) covered++;
      }
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
    folds: origins.length,
    horizon,
    points_scored: scored,
    mae: Number((absSum / scored).toFixed(4)),
    rmse: Number(Math.sqrt(sqSum / scored).toFixed(4)),
    mape: anyZeroActual ? null : Number(((apeSum / scored) * 100).toFixed(4)),
    smape: Number(((sapeSum / scored) * 100).toFixed(4)),
    mase: naiveScale > 0 ? Number((absSum / scored / naiveScale).toFixed(6)) : null,
    interval_coverage: intervalPoints > 0 ? Number((covered / intervalPoints).toFixed(4)) : null
  };
}
