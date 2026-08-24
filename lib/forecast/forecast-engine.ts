/**
 * CTW-03 — the governed forecast execution boundary.
 *
 * qualify → fit → predict → validate → publish, with the model that ran named on the result.
 * Nothing downstream may branch on `model_id`; everything it needs is on the execution.
 */

import {
  DEFAULT_INTERVAL_LEVEL,
  ForecastDataset,
  ForecastPoint,
  IntervalCalibration,
  ForecastExecution,
  ForecastExecutionRequest,
  ForecastModelId,
  ForecastOutcome,
  ForecastRefusal,
  FORECAST_SCHEMA_VERSION,
  ModelComparison,
  ModelComparisonEntry,
  NOT_LEARNING_DISCLOSURE,
  COMPARISON_SEPARATION_MASE,
  INTERVAL_COVERAGE_TOLERANCE,
  validateForecastExecution
} from '../../packages/contracts/src/forecast-model-model';
import { DEFAULT_FORECAST_MODEL_ID, getForecastAdapter, isRegisteredModel, listForecastModels } from './registry';
import { qualifyDataset } from './qualification';
import { backtest, calibrationBacktest } from './backtest';
import { calibrateInterval } from './calibration';

function reject(id: string, message: string): never {
  const err: any = new Error(message);
  err.rejection_id = id;
  throw err;
}

/** A short, stable id derived from what produced it — never from the clock. */
function executionId(modelId: string, datasetId: string, horizon: number, n: number): string {
  let h = 0;
  const s = `${modelId}|${datasetId}|${horizon}|${n}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `fx_${modelId.toLowerCase()}_${h.toString(16)}`;
}

export function executeForecast(request: ForecastExecutionRequest): ForecastOutcome {
  if (request.points_override !== undefined) {
    reject('RJ-F1', 'A caller-supplied forecast is forbidden. The forecast is what the model produced.');
  }
  if (request.fit_override !== undefined) {
    reject('RJ-F2', 'Caller-supplied fitted parameters are forbidden. Parameters are estimated from the data.');
  }

  const { dataset, horizon } = request;

  if (!isRegisteredModel(request.model_id)) {
    const refusal: ForecastRefusal = {
      refused: true,
      model_id: null,
      reason: 'MODEL_NOT_REGISTERED',
      statement:
        `No forecasting model is registered under "${request.model_id}". A model is registered only ` +
        'when an implementation genuinely executes it, so an unrecognised name is refused rather ' +
        'than quietly served by a default.'
    };
    return refusal;
  }

  const adapter = getForecastAdapter(request.model_id)!;
  const declaration = adapter.declaration;

  if (!Number.isInteger(horizon) || horizon < 1 || horizon > declaration.maximum_horizon) {
    return {
      refused: true,
      model_id: declaration.model_id,
      reason: 'HORIZON_OUT_OF_RANGE',
      statement: `Horizon must be a whole number between 1 and ${declaration.maximum_horizon}; ${horizon} was requested.`
    };
  }

  const shared = qualifyDataset(dataset, declaration);
  const specific = adapter.qualify(dataset);
  const qualification = {
    ...shared,
    checks: [...shared.checks, ...specific.checks],
    suitable: shared.suitable && specific.suitable,
    remediation: [...shared.remediation, ...specific.remediation]
  };

  if (!qualification.suitable) {
    return {
      refused: true,
      model_id: declaration.model_id,
      reason: qualification.refusal_reason ?? 'INSUFFICIENT_HISTORY',
      statement:
        `This dataset cannot support ${declaration.display_name}. ` +
        qualification.checks.filter(c => !c.passed).map(c => c.detail).join(' '),
      qualification
    };
  }

  const values = dataset.observations.map(o => o.value);
  const periods = dataset.observations.map(o => o.period);

  const fitResult = adapter.fit(values);
  if (!Number.isFinite(fitResult.fit.residual_sigma ?? NaN)) {
    return {
      refused: true,
      model_id: declaration.model_id,
      reason: 'FIT_DID_NOT_CONVERGE',
      statement: `${declaration.display_name} did not produce a usable fit for this series.`,
      qualification
    };
  }

  const rawPoints = adapter.predict(fitResult.state, horizon, periods[periods.length - 1]);
  const uncertainty = adapter.uncertainty(fitResult.state);

  const run = request.backtest
    ? backtest(adapter, values, periods, horizon, 5, request.common_min_train)
    : null;
  const metrics = run?.metrics ?? null;

  /**
   * FM-01 — the empirical calibration.
   *
   * It is attempted only where a backtest ran, because there is otherwise no held-out error to
   * calibrate against, and a calibration from in-sample residuals would be the model marking its own
   * homework. Where the evidence is too thin the calibration still reports — with `reliable: false`
   * and its sample size — and **no calibrated interval is published**, so nothing on screen can
   * claim a width the evidence did not support.
   */
  const calibrationRun = request.backtest ? calibrationBacktest(adapter, values, periods, horizon) : null;
  const calibration: IntervalCalibration | null = calibrationRun
    ? calibrateInterval(calibrationRun.residuals, uncertainty.level ?? DEFAULT_INTERVAL_LEVEL)
    : null;

  const points: ForecastPoint[] = rawPoints.map(p => {
    if (!calibration || !calibration.reliable || p.lower === null || p.upper === null) return p;
    const half = ((p.upper - p.lower) / 2) * calibration.multiplier;
    return {
      ...p,
      calibrated_lower: Number((p.value - half).toFixed(4)),
      calibrated_upper: Number((p.value + half).toFixed(4))
    };
  });

  const execution: ForecastExecution = {
    execution_id: executionId(declaration.model_id, dataset.provenance.dataset_id, horizon, values.length),
    model_id: declaration.model_id,
    model_display_name: declaration.display_name,
    model_version: declaration.version,
    runtime: declaration.runtime,
    implementation_ref: declaration.implementation_ref,
    data_provenance: dataset.provenance,
    qualification,
    fit: fitResult.fit,
    horizon,
    points,
    uncertainty,
    calibration,
    validation: {
      backtest: metrics,
      diagnostics: [
        {
          check: 'residual_sigma_positive',
          passed: (fitResult.fit.residual_sigma ?? 0) > 0,
          detail: `Residual sigma ${fitResult.fit.residual_sigma}.`
        },
        {
          check: 'forecast_values_finite',
          passed: points.every(p => Number.isFinite(p.value)),
          detail: `${points.length} forecast values.`
        },
        {
          check: 'interval_brackets_point',
          passed: points.every(p => p.lower === null || p.upper === null || (p.lower <= p.value && p.upper >= p.value)),
          detail: 'Every published interval contains its own point forecast.'
        },
        // Published whenever a backtest ran, and allowed to fail. An interval that covers far less
        // than it claims is the single most misleading thing a forecast can show, so it is measured
        // and reported rather than assumed — and never widened after the fact to pass its own check.
        ...(metrics && metrics.interval_coverage !== null
          ? [
              {
                check: 'interval_coverage_near_nominal',
                passed:
                  Math.abs(metrics.interval_coverage - (uncertainty.level ?? 0)) <= INTERVAL_COVERAGE_TOLERANCE,
                detail:
                  `Measured coverage ${(metrics.interval_coverage * 100).toFixed(1)}% against a nominal ` +
                  `${((uncertainty.level ?? 0) * 100).toFixed(0)}% over ${metrics.folds} backtest folds. ` +
                  'The interval is model-implied and is not calibrated to realised coverage.'
              }
            ]
          : []),
        // FM-01. The calibrated interval gets its own diagnostic, scored on held-out folds rather
        // than on the residuals it was fitted to. It is allowed to fail, for the same reason its
        // model-implied sibling is: a check that cannot fail reports nothing.
        ...(calibration
          ? [
              {
                check: 'interval_calibration_held_out_coverage',
                passed:
                  calibration.reliable &&
                  calibration.held_out_coverage !== null &&
                  Math.abs(calibration.held_out_coverage - calibration.target_coverage) <=
                    INTERVAL_COVERAGE_TOLERANCE,
                detail: calibration.reliable
                  ? `Calibrated by a factor of ${calibration.multiplier} from ${calibration.sample_size} ` +
                    `held-out points over ${calibration.folds} folds. Leave-one-fold-out coverage ` +
                    `${calibration.held_out_coverage === null ? 'could not be computed' : `${(calibration.held_out_coverage * 100).toFixed(1)}%`} ` +
                    `against a target of ${(calibration.target_coverage * 100).toFixed(0)}%, where the ` +
                    `model-implied interval measured ${(calibration.model_implied_coverage * 100).toFixed(1)}%.`
                  : `Not calibrated: ${calibration.sample_size} held-out point(s) over ${calibration.folds} ` +
                    'fold(s) is below the declared floor, so no calibrated interval is published.'
              }
            ]
          : [])
      ]
    },
    executed_as_of: request.executed_as_of,
    calculation_mode: 'governed_forecast_execution',
    synthetic_demo: dataset.provenance.synthetic_demo,
    schema_version: FORECAST_SCHEMA_VERSION,
    provenance: {
      package: 'CTW-03',
      runtime: declaration.runtime,
      implementation: declaration.implementation_ref,
      fitting: fitResult.fit.method,
      interval: uncertainty.basis,
      calibration: calibration
        ? `${calibration.method} · x${calibration.multiplier} on ${calibration.sample_size} held-out points` +
          (calibration.reliable ? '' : ' (declared unreliable — no calibrated interval published)')
        : 'none — no backtest was run, so there is no held-out error to calibrate against',
      not_learning: NOT_LEARNING_DISCLOSURE
    }
  };

  const violations = validateForecastExecution(execution, declaration);
  if (violations.length > 0) {
    reject(
      'RJ-F3',
      `Forecast violates its own invariants and is refused rather than returned: ${violations
        .map(v => `${v.invariant} ${v.detail}`)
        .join('; ')}`
    );
  }

  return execution;
}

/**
 * Compare every registered model on the same dataset and horizon, by backtest.
 *
 * A winner is named only when every model produced metrics **and** the MASE separation exceeds the
 * declared threshold. A comparison that cannot separate two models says so — naming a winner on a
 * difference smaller than the benchmark's own noise would be an aesthetic judgement wearing a
 * statistical name.
 */
export function compareForecastModels(
  dataset: ForecastDataset,
  horizon: number,
  executedAsOf: string
): ModelComparison {
  // Every model is scored on identical folds, from the largest minimum history in the set.
  const commonMinTrain = Math.max(...listForecastModels().map(d => d.minimum_observations));

  const entries: ModelComparisonEntry[] = listForecastModels().map(d => {
    const outcome = executeForecast({
      model_id: d.model_id,
      dataset,
      horizon,
      executed_as_of: executedAsOf,
      backtest: true,
      common_min_train: commonMinTrain
    });
    if ('refused' in outcome) {
      return { model_id: d.model_id, display_name: d.display_name, metrics: null, refused: outcome.reason };
    }
    return { model_id: d.model_id, display_name: d.display_name, metrics: outcome.validation.backtest };
  });

  const scored = entries.filter(e => e.metrics && e.metrics.mase !== null);
  let best: ForecastModelId | undefined;
  if (scored.length === entries.length && scored.length >= 2) {
    const sorted = [...scored].sort((a, b) => (a.metrics!.mase as number) - (b.metrics!.mase as number));
    const gap = (sorted[1].metrics!.mase as number) - (sorted[0].metrics!.mase as number);
    if (gap > COMPARISON_SEPARATION_MASE) best = sorted[0].model_id;
  }

  return {
    dataset_id: dataset.provenance.dataset_id,
    horizon,
    entries,
    best_model_id: best,
    basis:
      'Rolling-origin backtest, ranked on MASE against the in-sample seasonal-naive error. A model ' +
      `is named best only when every model scored and the MASE gap exceeds ${COMPARISON_SEPARATION_MASE}.`
  };
}

/**
 * The model the evidence supports for this dataset and horizon, measured rather than declared.
 *
 * §23: a recommendation must never silently override a user's choice. This returns a suggestion and
 * the comparison it came from; choosing remains the caller's, and `DEFAULT_FORECAST_MODEL_ID` is
 * only ever a fallback when no comparison could separate the models.
 */
export function recommendForecastModel(
  dataset: ForecastDataset,
  horizon: number,
  executedAsOf: string
): { recommended: ForecastModelId; measured: boolean; comparison: ModelComparison; statement: string } {
  const comparison = compareForecastModels(dataset, horizon, executedAsOf);
  if (comparison.best_model_id) {
    const winner = comparison.entries.find(e => e.model_id === comparison.best_model_id)!;
    return {
      recommended: comparison.best_model_id,
      measured: true,
      comparison,
      statement:
        `${winner.display_name} is recommended for this series: it scored the lowest error in a ` +
        `rolling-origin backtest over ${winner.metrics?.folds} folds (MASE ${winner.metrics?.mase}).`
    };
  }
  return {
    recommended: DEFAULT_FORECAST_MODEL_ID,
    measured: false,
    comparison,
    statement:
      'No model separated from the others by more than the declared margin on this series, so the ' +
      'governed default stands. This is a statement about the evidence, not about the models.'
  };
}

export const FORECAST_INTERVAL_LEVEL = DEFAULT_INTERVAL_LEVEL;
