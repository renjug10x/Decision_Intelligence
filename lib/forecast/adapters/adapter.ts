/**
 * CTW-03 — the adapter seam.
 *
 * Everything downstream of this interface is model-agnostic. The Decision Twin, the routes and the
 * comparison surface see a `ForecastExecution`; none of them may branch on `model_id`. That is what
 * makes "which model produced this" a data question rather than a UI question.
 */

import {
  DatasetQualification,
  ForecastDataset,
  ForecastFitMetadata,
  ForecastModelDeclaration,
  ForecastPoint,
  ForecastUncertainty
} from '../../../packages/contracts/src/forecast-model-model';

export interface FitResult {
  fit: ForecastFitMetadata;
  /** Opaque to the caller — only the adapter that produced it may read it back. */
  state: unknown;
}

export interface ForecastModelAdapter {
  readonly declaration: ForecastModelDeclaration;
  /** Model-specific checks beyond the shared ones. Shared checks live in `qualification.ts`. */
  qualify(dataset: ForecastDataset): DatasetQualification;
  fit(values: number[]): FitResult;
  predict(state: unknown, horizon: number, lastPeriod: string): ForecastPoint[];
  uncertainty(state: unknown): ForecastUncertainty;
}

/** UTC-only date arithmetic. `D-FM-3` is what happens when local time is allowed anywhere near this. */
export function addUtcDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + days * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

export function futurePeriods(lastPeriod: string, horizon: number): string[] {
  return Array.from({ length: horizon }, (_, i) => addUtcDays(lastPeriod, i + 1));
}
