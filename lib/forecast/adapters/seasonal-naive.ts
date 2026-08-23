/**
 * CTW-03 — Seasonal naive benchmark.
 *
 * ŷ_{n+h} = y_{n+h−m·⌈h/m⌉} — each forecast is the value from the same weekday of a recent week.
 *
 * It is registered as a first-class model rather than hidden, for two reasons. It is the standard
 * benchmark a forecast must beat before it is worth anything, and it is the denominator of MASE,
 * which is the only metric here that makes two models comparable. A model that cannot beat this is
 * not a better model, and CTW-03 would rather show that than conceal it.
 *
 * It fits nothing, and says so: `fits_parameters` is false and `estimated_parameters` is empty.
 * Its interval comes from the spread of its own seasonal differences and widens by whole cycles,
 * because that is the only thing it can defend.
 */

import {
  DatasetQualification,
  DEFAULT_INTERVAL_LEVEL,
  ForecastDataset,
  ForecastModelDeclaration,
  ForecastPoint,
  ForecastUncertainty,
  INTERVAL_DISCLOSURE_SEASONAL_NAIVE,
  Z_80
} from '../../../packages/contracts/src/forecast-model-model';
import { ForecastModelAdapter, FitResult, futurePeriods } from './adapter';

const M = 7;
const MIN_OBS = 2 * M;

export const SEASONAL_NAIVE_DECLARATION: ForecastModelDeclaration = {
  model_id: 'SEASONAL_NAIVE',
  family: 'NAIVE_BENCHMARK',
  display_name: 'Same weekday last week',
  summary:
    'Repeats the most recent value for each weekday. It estimates nothing, and exists as the ' +
    'benchmark a real forecast has to beat.',
  runtime: 'first_party_typescript',
  implementation_ref: 'lib/forecast/adapters/seasonal-naive.ts',
  version: '1.0.0',
  grain: 'DAY',
  seasonal_period: M,
  minimum_observations: MIN_OBS,
  maximum_horizon: 90,
  fits_parameters: false,
  publishes_interval: true,
  data_requirements: [
    {
      requirement_id: 'SN-1',
      statement: `At least ${MIN_OBS} daily observations — two whole weeks, so every weekday has a value to repeat.`,
      refusal: 'INSUFFICIENT_HISTORY'
    },
    {
      requirement_id: 'SN-2',
      statement: 'One observation per calendar day with no gaps.',
      refusal: 'IRREGULAR_FREQUENCY'
    },
    {
      requirement_id: 'SN-3',
      statement: 'Every value present and finite.',
      refusal: 'MISSING_VALUES'
    }
  ],
  limitations: [
    'It estimates nothing: no level, no trend, no parameters. Last week is the forecast.',
    'It cannot respond to a trend, and drifts further from a moving series the longer the horizon.',
    'It is a benchmark. Choosing it over a fitted model is choosing not to forecast.'
  ]
};

interface SnState {
  values: number[];
  sigma: number;
  residuals: number;
}

export const seasonalNaiveAdapter: ForecastModelAdapter = {
  declaration: SEASONAL_NAIVE_DECLARATION,

  qualify(dataset: ForecastDataset): DatasetQualification {
    return {
      model_id: 'SEASONAL_NAIVE',
      dataset_id: dataset.provenance.dataset_id,
      suitable: true,
      checks: [],
      remediation: []
    };
  },

  fit(values: number[]): FitResult {
    // The "residuals" of a seasonal naive forecast are its own seasonal differences.
    let sse = 0;
    let count = 0;
    for (let t = M; t < values.length; t++) {
      const e = values[t] - values[t - M];
      sse += e * e;
      count++;
    }
    const sigma = count > 0 ? Math.sqrt(sse / count) : 0;

    return {
      state: { values: [...values], sigma, residuals: count } as SnState,
      fit: {
        fitted: false,
        method: 'No estimation. The forecast is the observed value from the same weekday.',
        estimated_parameters: {},
        residual_count: count,
        residual_sigma: Number(sigma.toFixed(6)),
        sse: Number(sse.toFixed(4)),
        search: 'None — this model has no parameters to search for',
        candidates_evaluated: 0,
        deterministic: true
      }
    };
  },

  predict(stateIn: unknown, horizon: number, lastPeriod: string): ForecastPoint[] {
    const s = stateIn as SnState;
    const periods = futurePeriods(lastPeriod, horizon);
    const n = s.values.length;

    return Array.from({ length: horizon }, (_, i) => {
      const h = i + 1;
      // Cycles ahead: 1 for the first week out, 2 for the second, and so on.
      const cycles = Math.ceil(h / M);
      // 0-based index of the source observation. The -1 is the difference between "the value at
      // time n+h-mk" and "the array slot holding it"; without it, step 7 reads past the end.
      const value = s.values[n + h - M * cycles - 1];
      // A seasonal naive interval widens by whole cycles, not by day.
      const sigmaH = s.sigma * Math.sqrt(cycles);
      const halfWidth = Z_80 * sigmaH;
      return {
        horizon_step: h,
        period: periods[i],
        value: Number(value.toFixed(4)),
        lower: Number((value - halfWidth).toFixed(4)),
        upper: Number((value + halfWidth).toFixed(4))
      };
    });
  },

  uncertainty(): ForecastUncertainty {
    return {
      basis: 'SEASONAL_DIFFERENCE_RESIDUALS',
      level: DEFAULT_INTERVAL_LEVEL,
      disclosure: INTERVAL_DISCLOSURE_SEASONAL_NAIVE
    };
  }
};
