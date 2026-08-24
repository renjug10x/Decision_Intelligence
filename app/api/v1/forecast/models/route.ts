import { NextResponse } from 'next/server';
import { listForecastModels, DEFAULT_FORECAST_MODEL_ID } from '@/lib/forecast/registry';
import { NOT_LEARNING_DISCLOSURE } from '@/packages/contracts/src/forecast-model-model';

/**
 * CTW-03 — the registered models. Every entry has an implementation that genuinely fits and
 * predicts; there is no placeholder and no name without code behind it.
 */
export async function GET() {
  return NextResponse.json({
    status: 'success',
    service: 'cognix-web-bff',
    domain: 'forecast-models',
    data: { models: listForecastModels(), default_model_id: DEFAULT_FORECAST_MODEL_ID },
    disclosures: {
      registration:
        'A model appears here only when an implementation executes it. A name with no implementation ' +
        'is not offered, so it cannot be selected and cannot be displayed.',
      not_learning: NOT_LEARNING_DISCLOSURE
    }
  });
}
