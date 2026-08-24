import { NextRequest, NextResponse } from 'next/server';
import { executeForecast } from '@/lib/forecast/forecast-engine';
import { buildForecastDataset } from '@/lib/forecast/series';
import { isRefusal, ForecastModelId } from '@/packages/contracts/src/forecast-model-model';

/** CTW-03 forecast execution. Orchestration only — fitting and prediction live in the adapters. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dataset =
      body.dataset ||
      (await buildForecastDataset({ scope: body.scope, measure: body.measure, maxObservations: body.max_observations }));

    const outcome = executeForecast({
      model_id: body.model_id as ForecastModelId,
      dataset,
      horizon: body.horizon,
      executed_as_of: body.executed_as_of || new Date().toISOString(),
      backtest: body.backtest === true
    });

    if (isRefusal(outcome)) {
      return NextResponse.json(
        { status: 'refused', service: 'cognix-web-bff', domain: 'forecast-execution', data: outcome },
        { status: 200 }
      );
    }

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'forecast-execution',
      data: outcome,
      disclosures: {
        model: `Produced by ${outcome.model_display_name} (${outcome.implementation_ref}).`,
        interval: outcome.uncertainty.disclosure,
        not_learning: outcome.provenance.not_learning
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        status: 'error',
        error: e.rejection_id || 'BadRequest',
        rejection_id: e.rejection_id,
        message: String(e?.message || 'Forecast execution failed'),
        timestamp: new Date().toISOString()
      },
      { status: 400 }
    );
  }
}
