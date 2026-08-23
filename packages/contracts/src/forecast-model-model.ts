/**
 * CogniX CTW-03 — Governed Forecast Model Execution Boundary
 *
 * One authoritative contract between a dataset, a model selection, model fitting, prediction,
 * uncertainty and the Decision Twin.
 *
 * The rule this file exists to make structural:
 *
 *   > **The model name shown to a user is the implementation that produced the forecast.**
 *
 * Before CTW-03 that was false everywhere. `lib/query-engine.ts` selected among three closed-form
 * curves over a loop index; `arima`, `baseline` and an unrecognised string all reached the same
 * branch and returned identical numbers. The full evidence is in
 * `docs/governance/COGNIX_FORECAST_MODEL_TRUTH_RECORD.md`, and this contract is the correction.
 *
 * Consequences that are deliberate:
 *   - A model that cannot be proven to execute is not registered, so it cannot be selected, so it
 *     cannot be named. There is no "coming soon" state that renders as a choice.
 *   - Qualification precedes execution. A dataset that cannot support a model is refused with the
 *     reason, never silently fitted to something it does not satisfy.
 *   - Uncertainty is computed from the fitted model's own residuals. Where a model cannot produce a
 *     defensible interval it publishes none, rather than a declared band wearing a statistical name.
 *   - Running a statistical model is not organisational learning. Fitting is not the gated ML
 *     programme (`P10-F/G/H/K/L/M`) and nothing here touches attested observation or eligibility.
 */

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/**
 * Registered models. **A value exists here only if an implementation genuinely executes it.**
 * Adding a member without an adapter that fits and predicts is a defect, and the test suite fails
 * on any registry entry whose adapter does not demonstrably run.
 */
export type ForecastModelId = 'HOLT_WINTERS_ADDITIVE' | 'SEASONAL_NAIVE';

export type ForecastModelFamily = 'EXPONENTIAL_SMOOTHING' | 'NAIVE_BENCHMARK';

/** What actually runs the arithmetic. No value here may name a library that is not a dependency. */
export type ForecastRuntime = 'first_party_typescript';

export type TimeGrain = 'DAY';

/** Why a model refused, in the vocabulary a caller can act on. */
export type ForecastRefusalReason =
  | 'INSUFFICIENT_HISTORY'
  | 'IRREGULAR_FREQUENCY'
  | 'MISSING_VALUES'
  | 'DUPLICATE_PERIODS'
  | 'NON_FINITE_VALUES'
  | 'HORIZON_OUT_OF_RANGE'
  | 'MODEL_NOT_REGISTERED'
  | 'FIT_DID_NOT_CONVERGE';

// ---------------------------------------------------------------------------
// Dataset
// ---------------------------------------------------------------------------

export interface ForecastObservation {
  /** ISO date, `YYYY-MM-DD`. */
  period: string;
  value: number;
}

/**
 * Where a series came from. Carried on every forecast so a projection can always be traced back to
 * the data it was fitted on — which is what makes a historical experiment reproducible.
 */
export interface ForecastDataProvenance {
  dataset_id: string;
  source: string;
  /** The filter that produced this series, stated rather than implied. */
  scope: Record<string, string>;
  measure: string;
  grain: TimeGrain;
  first_period: string;
  last_period: string;
  observation_count: number;
  /**
   * Periods excluded before fitting and why. `D-FM-1` is the reason this field exists: the previous
   * engine divided an empty trailing day into its own mean and understated every forecast by 7.14%.
   * Exclusions are published, never silent.
   */
  excluded_periods: Array<{ period: string; reason: string }>;
  synthetic_demo: boolean;
}

export interface ForecastDataset {
  provenance: ForecastDataProvenance;
  observations: ForecastObservation[];
}

// ---------------------------------------------------------------------------
// Model declaration — what a model needs, published before it is chosen
// ---------------------------------------------------------------------------

export interface ForecastDataRequirement {
  requirement_id: string;
  /** Stated for an analyst, not for a statistician. */
  statement: string;
  /** The refusal a dataset failing this requirement receives. */
  refusal: ForecastRefusalReason;
}

export interface ForecastModelDeclaration {
  model_id: ForecastModelId;
  family: ForecastModelFamily;
  /** The name a user sees. It must describe the implementation, never a vendor or a fashion. */
  display_name: string;
  /** One sentence an analyst can act on. */
  summary: string;
  runtime: ForecastRuntime;
  /** The implementation file, so the claim is checkable rather than asserted. */
  implementation_ref: string;
  version: string;
  grain: TimeGrain;
  /** Seasonal cycle length in periods, or null where the model models no seasonality. */
  seasonal_period: number | null;
  minimum_observations: number;
  maximum_horizon: number;
  /** Whether the model estimates parameters from the data at all. */
  fits_parameters: boolean;
  /** Whether the model can publish a prediction interval derived from its own residuals. */
  publishes_interval: boolean;
  data_requirements: ForecastDataRequirement[];
  /** What this model is genuinely not. Published so nothing is inferred from silence. */
  limitations: string[];
}

// ---------------------------------------------------------------------------
// Qualification — asked before a model is run, never after
// ---------------------------------------------------------------------------

export interface QualificationCheck {
  requirement_id: string;
  statement: string;
  passed: boolean;
  detail: string;
}

export interface DatasetQualification {
  model_id: ForecastModelId;
  dataset_id: string;
  /** True only when every check passed. There is no partial fitness. */
  suitable: boolean;
  checks: QualificationCheck[];
  refusal_reason?: ForecastRefusalReason;
  /** What the caller would have to change. Empty when suitable. */
  remediation: string[];
}

// ---------------------------------------------------------------------------
// Fit
// ---------------------------------------------------------------------------

/**
 * What the fitting step actually estimated. A model with `fits_parameters: false` publishes an
 * empty `estimated_parameters` and says so, rather than inventing numbers to look sophisticated.
 */
export interface ForecastFitMetadata {
  fitted: boolean;
  method: string;
  estimated_parameters: Record<string, number>;
  /** In-sample one-step-ahead error, the basis for every interval this contract publishes. */
  residual_count: number;
  residual_sigma: number | null;
  sse: number | null;
  /** How the estimate was searched for, so the result is reproducible. */
  search: string;
  candidates_evaluated: number;
  deterministic: true;
}

// ---------------------------------------------------------------------------
// Forecast
// ---------------------------------------------------------------------------

export interface ForecastPoint {
  /** 1-based step ahead of the last observed period. */
  horizon_step: number;
  period: string;
  value: number;
  /** Null where the model cannot defend an interval; never a placeholder width. */
  lower: number | null;
  upper: number | null;
}

export type IntervalBasis =
  /** Derived from the fitted model's own in-sample residuals and its variance expansion. */
  | 'FITTED_RESIDUAL_VARIANCE'
  /** Derived from the residuals of the benchmark's own seasonal differences. */
  | 'SEASONAL_DIFFERENCE_RESIDUALS'
  | 'NONE';

export interface ForecastUncertainty {
  basis: IntervalBasis;
  /** e.g. 0.8 for an 80% interval. Null when no interval is published. */
  level: number | null;
  /** Stated plainly, including what it is not. */
  disclosure: string;
}

// ---------------------------------------------------------------------------
// Validation — backtesting, so "which model is better" is measured, never asserted
// ---------------------------------------------------------------------------

export interface BacktestMetrics {
  /** Rolling-origin folds actually evaluated. */
  folds: number;
  horizon: number;
  points_scored: number;
  mae: number;
  rmse: number;
  /** Null when any actual is zero — a percentage error on zero is undefined, not infinite. */
  mape: number | null;
  smape: number;
  /**
   * Mean absolute scaled error against the in-sample seasonal-naive error. Scale-free, defined for
   * zero actuals, and the metric that makes two models comparable. < 1 beats seasonal naive.
   */
  mase: number | null;
  /** Share of actuals falling inside the published interval. Null when no interval is published. */
  interval_coverage: number | null;
}

export interface ForecastValidation {
  backtest: BacktestMetrics | null;
  /** Checks on the fit itself, not on the data. */
  diagnostics: Array<{ check: string; passed: boolean; detail: string }>;
}

// ---------------------------------------------------------------------------
// Execution result
// ---------------------------------------------------------------------------

export interface ForecastExecution {
  execution_id: string;
  model_id: ForecastModelId;
  /** Copied from the registry at execution time so a stored result is self-describing. */
  model_display_name: string;
  model_version: string;
  runtime: ForecastRuntime;
  implementation_ref: string;

  data_provenance: ForecastDataProvenance;
  qualification: DatasetQualification;
  fit: ForecastFitMetadata;

  horizon: number;
  points: ForecastPoint[];
  uncertainty: ForecastUncertainty;
  validation: ForecastValidation;

  /** Caller-supplied reference instant. Never an input to any arithmetic above. */
  executed_as_of: string;
  calculation_mode: 'governed_forecast_execution';
  synthetic_demo: boolean;
  schema_version: string;
  provenance: Record<string, string>;
}

/** A refusal is a first-class result. It is never an empty forecast. */
export interface ForecastRefusal {
  refused: true;
  model_id: ForecastModelId | null;
  reason: ForecastRefusalReason;
  statement: string;
  qualification?: DatasetQualification;
}

export type ForecastOutcome = ForecastExecution | ForecastRefusal;

export function isRefusal(outcome: ForecastOutcome): outcome is ForecastRefusal {
  return (outcome as ForecastRefusal).refused === true;
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export interface ForecastExecutionRequest {
  model_id: ForecastModelId;
  dataset: ForecastDataset;
  horizon: number;
  executed_as_of: string;
  /** Off by default: backtesting re-fits the model many times and is not free. */
  backtest?: boolean;
  /** A common training floor, so every model in a comparison is scored on identical folds. */
  common_min_train?: number;
  /** Forbidden — a caller may never supply forecast values (RJ-F1). */
  points_override?: unknown;
  /** Forbidden — a caller may never supply fitted parameters (RJ-F2). */
  fit_override?: unknown;
}

export interface ModelComparisonEntry {
  model_id: ForecastModelId;
  display_name: string;
  metrics: BacktestMetrics | null;
  refused?: ForecastRefusalReason;
}

export interface ModelComparison {
  dataset_id: string;
  horizon: number;
  entries: ModelComparisonEntry[];
  /**
   * The model with the lowest MASE, **only** when every compared model produced metrics and the
   * separation exceeds `COMPARISON_SEPARATION_MASE`. Absent otherwise — a comparison that cannot
   * separate two models says so instead of naming a winner.
   */
  best_model_id?: ForecastModelId;
  basis: string;
}

// ---------------------------------------------------------------------------
// Declared constants
// ---------------------------------------------------------------------------

export const FORECAST_SCHEMA_VERSION = '1.0.0';

/** 80% is the operating interval: wide enough to be honest, narrow enough to be useful. */
export const DEFAULT_INTERVAL_LEVEL = 0.8;

/** Two-sided 80% normal quantile. Declared, not looked up at runtime. */
export const Z_80 = 1.2815515655446004;

/**
 * Below this MASE gap two models are not meaningfully separated on this evidence, and no winner is
 * named. Chosen so a difference smaller than a few percent of the benchmark's own error does not
 * get reported as a result.
 */
export const COMPARISON_SEPARATION_MASE = 0.02;

/**
 * How far measured coverage may sit from nominal before the diagnostic fails.
 *
 * It is deliberately generous — a backtest over a handful of folds cannot resolve coverage finely —
 * and it is deliberately not zero, because a check nothing can fail tells a reader nothing.
 */
export const INTERVAL_COVERAGE_TOLERANCE = 0.15;

export const INTERVAL_DISCLOSURE_FITTED =
  'Computed from the fitted model’s own one-step-ahead residuals and its additive-error variance ' +
  'expansion. It widens with horizon because the model says it should, not by declaration. It ' +
  'assumes the residuals are roughly symmetric and is not a guarantee.';

export const INTERVAL_DISCLOSURE_SEASONAL_NAIVE =
  'Computed from the residuals of the seasonal differences this benchmark forecasts by. It is a ' +
  'benchmark interval and is expected to be wider than a fitted model’s.';

export const NOT_LEARNING_DISCLOSURE =
  'Fitting a statistical model to a time series is not organisational learning. It reads no ' +
  'attested observation, creates no learning candidate or case, and does not begin the deferred ' +
  'CogniX adaptive-learning programme.';

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

export interface ForecastInvariantViolation {
  invariant: string;
  detail: string;
}

/**
 * `F-INV-1` every horizon step is present exactly once, in order
 * `F-INV-2` an interval, where published, brackets its own point
 * `F-INV-3` a model declaring no interval publishes none
 * `F-INV-4` the execution names the model that produced it
 * `F-INV-5` no forecast value is non-finite
 * `F-INV-6` qualification passed, or there is no execution at all
 */
export function validateForecastExecution(
  exec: ForecastExecution,
  declaration: ForecastModelDeclaration
): ForecastInvariantViolation[] {
  const v: ForecastInvariantViolation[] = [];

  exec.points.forEach((p, i) => {
    if (p.horizon_step !== i + 1) {
      v.push({ invariant: 'F-INV-1', detail: `step ${p.horizon_step} at index ${i}` });
    }
    if (!Number.isFinite(p.value)) {
      v.push({ invariant: 'F-INV-5', detail: `non-finite value at step ${p.horizon_step}` });
    }
    if (p.lower !== null && p.upper !== null) {
      if (p.lower > p.value || p.upper < p.value) {
        v.push({
          invariant: 'F-INV-2',
          detail: `step ${p.horizon_step} interval [${p.lower}, ${p.upper}] excludes ${p.value}`
        });
      }
      if (!declaration.publishes_interval) {
        v.push({
          invariant: 'F-INV-3',
          detail: `${exec.model_id} publishes an interval it declares it cannot produce`
        });
      }
    }
  });

  if (exec.points.length !== exec.horizon) {
    v.push({ invariant: 'F-INV-1', detail: `${exec.points.length} points for horizon ${exec.horizon}` });
  }
  if (exec.model_id !== declaration.model_id || exec.implementation_ref !== declaration.implementation_ref) {
    v.push({ invariant: 'F-INV-4', detail: 'execution does not name the declaration that produced it' });
  }
  if (!exec.qualification.suitable) {
    v.push({ invariant: 'F-INV-6', detail: 'an execution exists for an unsuitable dataset' });
  }

  return v;
}
