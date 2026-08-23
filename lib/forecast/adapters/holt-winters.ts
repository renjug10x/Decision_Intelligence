/**
 * CTW-03 — Holt-Winters additive exponential smoothing, ETS(A,A,A).
 *
 * This genuinely executes: it estimates three smoothing parameters from the supplied series by
 * minimising in-sample one-step-ahead squared error, and its prediction interval comes from the
 * fitted model's own residual variance and the additive-error variance expansion — not from a
 * declared width.
 *
 * Recurrences (smoothing form), with seasonal period m:
 *   ℓ_t = α(y_t − s_{t−m}) + (1 − α)(ℓ_{t−1} + b_{t−1})
 *   b_t = β*(ℓ_t − ℓ_{t−1}) + (1 − β*)b_{t−1}
 *   s_t = γ*(y_t − ℓ_{t−1} − b_{t−1}) + (1 − γ*)s_{t−m}
 *   ŷ_{t+h|t} = ℓ_t + h·b_t + s_{t+h−m(k+1)},  k = ⌊(h−1)/m⌋
 *
 * Interval, from Hyndman, Koehler, Ord & Snyder (2008) for ETS(A,A,A):
 *   σ²_h = σ²[1 + Σ_{j=1..h−1} c_j²],   c_j = α + βj + γ·1{j mod m = 0}
 * where the state-space β and γ relate to the smoothing parameters by β = αβ* and γ = γ*(1 − α).
 */

import {
  DatasetQualification,
  DEFAULT_INTERVAL_LEVEL,
  ForecastDataset,
  ForecastModelDeclaration,
  ForecastPoint,
  ForecastUncertainty,
  INTERVAL_DISCLOSURE_FITTED,
  Z_80
} from '../../../packages/contracts/src/forecast-model-model';
import { ForecastModelAdapter, FitResult, futurePeriods } from './adapter';

const M = 7; // weekly cycle on a daily grain
const MIN_OBS = 3 * M; // three complete cycles: two to initialise, one to have something to fit

export const HOLT_WINTERS_DECLARATION: ForecastModelDeclaration = {
  model_id: 'HOLT_WINTERS_ADDITIVE',
  family: 'EXPONENTIAL_SMOOTHING',
  display_name: 'Holt-Winters seasonal',
  summary:
    'Fits level, trend and a repeating weekly pattern to the demand history, then projects them ' +
    'forward. Every parameter is estimated from this campaign’s own data.',
  runtime: 'first_party_typescript',
  implementation_ref: 'lib/forecast/adapters/holt-winters.ts',
  version: '1.0.0',
  grain: 'DAY',
  seasonal_period: M,
  minimum_observations: MIN_OBS,
  maximum_horizon: 90,
  fits_parameters: true,
  publishes_interval: true,
  data_requirements: [
    {
      requirement_id: 'HW-1',
      statement: `At least ${MIN_OBS} daily observations — three whole weeks, so a weekly pattern can be estimated rather than guessed.`,
      refusal: 'INSUFFICIENT_HISTORY'
    },
    {
      requirement_id: 'HW-2',
      statement: 'One observation per calendar day with no gaps, so the weekly position of every value is known.',
      refusal: 'IRREGULAR_FREQUENCY'
    },
    {
      requirement_id: 'HW-3',
      statement: 'Every value present and finite. A missing day is not treated as a zero.',
      refusal: 'MISSING_VALUES'
    }
  ],
  limitations: [
    'Additive seasonality only: it models a weekly pattern of constant size, not one that grows with the level.',
    'A single seasonal cycle of 7 days. It does not model annual seasonality, holidays or events.',
    'It knows nothing about promotions, price or stock — it projects the history it was given.',
    'The interval assumes roughly symmetric errors and is not a guarantee.'
  ]
};

interface HwState {
  alpha: number;
  betaStar: number;
  gammaStar: number;
  level: number;
  trend: number;
  /**
   * Seasonal indices by slot. The filter reads and writes `season[t % M]` at each t, so slot
   * `(n + h - 1) % M` is the one a forecast step `h` lands in.
   */
  season: number[];
  /** Observations fitted, so the forecast lands in the right seasonal slot. */
  n: number;
  sigma: number;
  residuals: number;
}

/**
 * Deterministic initialisation by classical decomposition over **every** complete cycle in the
 * series supplied, not just the first two.
 *
 * Averaging a weekly index over twelve weeks rather than two is the difference between estimating
 * a pattern and guessing it, and it is standard practice. It uses only data the caller passed in,
 * so a backtest fold initialises from its own training slice and never sees across its origin.
 */
function initialise(values: number[]): { level: number; trend: number; season: number[] } {
  const cycles = Math.floor(values.length / M);
  const used = cycles * M;

  // Mean of each complete cycle, then the deviation of each within-cycle position from its own
  // cycle mean, averaged across cycles. Centring removes the level so indices sum to zero.
  const cycleMeans: number[] = [];
  for (let c = 0; c < cycles; c++) {
    const slice = values.slice(c * M, (c + 1) * M);
    cycleMeans.push(slice.reduce((a, b) => a + b, 0) / M);
  }

  const raw = new Array(M).fill(0);
  for (let c = 0; c < cycles; c++) {
    for (let i = 0; i < M; i++) raw[i] += values[c * M + i] - cycleMeans[c];
  }
  for (let i = 0; i < M; i++) raw[i] /= cycles;
  const rawMean = raw.reduce((a, b) => a + b, 0) / M;
  const season = raw.map(s => s - rawMean);

  // Level and trend from a least-squares line through the cycle means, expressed per period.
  const n = cycleMeans.length;
  const xMean = (n - 1) / 2;
  const yMean = cycleMeans.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let c = 0; c < n; c++) {
    num += (c - xMean) * (cycleMeans[c] - yMean);
    den += (c - xMean) * (c - xMean);
  }
  const slopePerCycle = den === 0 ? 0 : num / den;

  void used;
  return { level: cycleMeans[0], trend: slopePerCycle / M, season };
}

/** One pass of the recurrences. Returns SSE and the terminal state. */
function runFilter(
  values: number[],
  alpha: number,
  betaStar: number,
  gammaStar: number
): { sse: number; level: number; trend: number; season: number[]; residuals: number } {
  const init = initialise(values);
  let level = init.level;
  let trend = init.trend;
  const season = [...init.season];
  let sse = 0;
  let residuals = 0;

  // Initialisation is a decomposition over the whole series rather than a warm-up over the first
  // two cycles, so filtering starts after one cycle — enough for every seasonal slot to exist.
  for (let t = M; t < values.length; t++) {
    const sIdx = t % M;
    const sPrev = season[sIdx];
    const forecast = level + trend + sPrev;
    const e = values[t] - forecast;
    sse += e * e;
    residuals++;

    const prevLevel = level;
    level = alpha * (values[t] - sPrev) + (1 - alpha) * (prevLevel + trend);
    trend = betaStar * (level - prevLevel) + (1 - betaStar) * trend;
    season[sIdx] = gammaStar * (values[t] - prevLevel - trend) + (1 - gammaStar) * sPrev;
  }

  return { sse, level, trend, season, residuals };
}

/**
 * Coarse-to-fine grid search over (α, β*, γ*). Deterministic and reproducible: the same series
 * always yields the same parameters, which is what makes a stored forecast reproducible.
 */
function estimate(values: number[]): { alpha: number; betaStar: number; gammaStar: number; sse: number; candidates: number } {
  let best = { alpha: 0.3, betaStar: 0.1, gammaStar: 0.1, sse: Infinity };
  let candidates = 0;
  let lo = 0.02;
  let hi = 0.98;
  let step = 0.16;

  for (let round = 0; round < 3; round++) {
    const aLo = round === 0 ? lo : Math.max(0.01, best.alpha - step);
    const aHi = round === 0 ? hi : Math.min(0.99, best.alpha + step);
    const bLo = round === 0 ? lo : Math.max(0.001, best.betaStar - step);
    const bHi = round === 0 ? hi : Math.min(0.99, best.betaStar + step);
    const gLo = round === 0 ? lo : Math.max(0.001, best.gammaStar - step);
    const gHi = round === 0 ? hi : Math.min(0.99, best.gammaStar + step);

    for (let a = aLo; a <= aHi + 1e-9; a += step) {
      for (let b = bLo; b <= bHi + 1e-9; b += step) {
        for (let g = gLo; g <= gHi + 1e-9; g += step) {
          candidates++;
          const r = runFilter(values, a, b, g);
          if (r.sse < best.sse) best = { alpha: a, betaStar: b, gammaStar: g, sse: r.sse };
        }
      }
    }
    step = step / 4;
  }

  return { ...best, candidates };
}

export const holtWintersAdapter: ForecastModelAdapter = {
  declaration: HOLT_WINTERS_DECLARATION,

  qualify(_dataset: ForecastDataset): DatasetQualification {
    // Model-specific checks beyond the shared ones live here; Holt-Winters adds none of its own
    // that the shared minimum-observation, regularity and finiteness checks do not already make.
    return {
      model_id: 'HOLT_WINTERS_ADDITIVE',
      dataset_id: _dataset.provenance.dataset_id,
      suitable: true,
      checks: [],
      remediation: []
    };
  },

  fit(values: number[]): FitResult {
    const est = estimate(values);
    const run = runFilter(values, est.alpha, est.betaStar, est.gammaStar);
    // Three estimated smoothing parameters, so the residual variance is corrected for them.
    const dof = Math.max(1, run.residuals - 3);
    const sigma = Math.sqrt(run.sse / dof);

    const state: HwState = {
      alpha: est.alpha,
      betaStar: est.betaStar,
      gammaStar: est.gammaStar,
      level: run.level,
      trend: run.trend,
      season: run.season,
      n: values.length,
      sigma,
      residuals: run.residuals
    };

    return {
      state,
      fit: {
        fitted: true,
        method: 'Minimised in-sample one-step squared error over the three smoothing parameters',
        estimated_parameters: {
          alpha: Number(est.alpha.toFixed(6)),
          beta_star: Number(est.betaStar.toFixed(6)),
          gamma_star: Number(est.gammaStar.toFixed(6))
        },
        residual_count: run.residuals,
        residual_sigma: Number(sigma.toFixed(6)),
        sse: Number(run.sse.toFixed(4)),
        search: 'Deterministic coarse-to-fine grid, three rounds, step 0.16 refined by ×1/4',
        candidates_evaluated: est.candidates,
        deterministic: true
      }
    };
  },

  predict(stateIn: unknown, horizon: number, lastPeriod: string): ForecastPoint[] {
    const s = stateIn as HwState;
    const periods = futurePeriods(lastPeriod, horizon);

    // State-space parameters, derived from the smoothing parameters that were actually fitted:
    // beta = alpha x beta*, gamma = gamma* x (1 - alpha). Using the smoothing parameters directly
    // in the variance expansion would understate the interval.
    const betaState = s.alpha * s.betaStar;
    const gammaState = s.gammaStar * (1 - s.alpha);

    const points: ForecastPoint[] = [];
    // Running sum of c_j^2 for j = 1..h-1, so the expansion is O(h) rather than O(h^2).
    let cSquaredSum = 0;

    for (let h = 1; h <= horizon; h++) {
      if (h > 1) {
        const j = h - 1;
        const c = s.alpha + betaState * j + (j % M === 0 ? gammaState : 0);
        cSquaredSum += c * c;
      }

      const slot = (s.n + h - 1) % M;
      const value = s.level + h * s.trend + s.season[slot];
      const sigmaH = s.sigma * Math.sqrt(1 + cSquaredSum);
      const halfWidth = Z_80 * sigmaH;

      points.push({
        horizon_step: h,
        period: periods[h - 1],
        value: Number(value.toFixed(4)),
        lower: Number((value - halfWidth).toFixed(4)),
        upper: Number((value + halfWidth).toFixed(4))
      });
    }

    return points;
  },

  uncertainty(): ForecastUncertainty {
    return {
      basis: 'FITTED_RESIDUAL_VARIANCE',
      level: DEFAULT_INTERVAL_LEVEL,
      disclosure: INTERVAL_DISCLOSURE_FITTED
    };
  }
};

