/**
 * CTW-03 — the model registry.
 *
 * A model is registered only when an adapter genuinely fits and predicts it. There is no
 * placeholder, no "unavailable" entry and no name without an implementation behind it — which is
 * why the registry is the only thing a surface may enumerate when offering a model choice.
 */

import { ForecastModelId, ForecastModelDeclaration } from '../../packages/contracts/src/forecast-model-model';
import { ForecastModelAdapter } from './adapters/adapter';
import { holtWintersAdapter } from './adapters/holt-winters';
import { seasonalNaiveAdapter } from './adapters/seasonal-naive';

const ADAPTERS: Record<ForecastModelId, ForecastModelAdapter> = {
  HOLT_WINTERS_ADDITIVE: holtWintersAdapter,
  SEASONAL_NAIVE: seasonalNaiveAdapter
};

/** The governed default. Chosen because it fits the data rather than repeating it. */
export const DEFAULT_FORECAST_MODEL_ID: ForecastModelId = 'HOLT_WINTERS_ADDITIVE';

export function listForecastModels(): ForecastModelDeclaration[] {
  return Object.values(ADAPTERS).map(a => a.declaration);
}

export function getForecastAdapter(id: ForecastModelId): ForecastModelAdapter | null {
  return ADAPTERS[id] || null;
}

export function isRegisteredModel(id: string): id is ForecastModelId {
  return Object.prototype.hasOwnProperty.call(ADAPTERS, id);
}
