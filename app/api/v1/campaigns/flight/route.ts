import { NextRequest, NextResponse } from 'next/server';
import { FlightProjectionRequest } from '@/packages/contracts/src/campaign-continuous-timeline-model';
import { projectCampaignFlight } from '@/lib/campaign-continuous-timeline-engine';
import { buildForecastDataset } from '@/lib/forecast/series';
import { executeForecast } from '@/lib/forecast/forecast-engine';
import { DEFAULT_FORECAST_MODEL_ID, isRegisteredModel } from '@/lib/forecast/registry';
import { ForecastExecution, isRefusal } from '@/packages/contracts/src/forecast-model-model';

/**
 * CTW-01 Continuous Campaign Timeline. Orchestration only — the flight arithmetic lives in the
 * engine, and the expectation it renders lives in CDI-05 behind the activated CDI-07A contract.
 */
export async function POST(request: NextRequest) {
  try {
    const payload: FlightProjectionRequest = await request.json();
    const body = payload as FlightProjectionRequest & { forecast_model_id?: string };

    /**
     * CTW-03. The horizon's shape comes from a governed forecast, chosen by the caller or falling
     * back to the governed default. A caller naming an unregistered model is refused rather than
     * quietly served the default — that is the whole point of the registry.
     *
     * If the forecast refuses (an unsuitable dataset, say) the flight is still projected: it simply
     * stays flat and says so. A campaign losing its horizon shape is better than a campaign losing
     * its timeline.
     */
    let forecast: ForecastExecution | undefined = payload.forecast;
    if (!forecast) {
      const requested = body.forecast_model_id;
      if (requested && !isRegisteredModel(requested)) {
        return NextResponse.json(
          {
            status: 'error',
            error: 'MODEL_NOT_REGISTERED',
            message:
              `No forecasting model is registered under "${requested}". A model is offered only when ` +
              'an implementation genuinely executes it.',
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        );
      }
      const modelId = isRegisteredModel(requested || '') ? (requested as any) : DEFAULT_FORECAST_MODEL_ID;
      const horizonNeeded = Math.max(1, payload.timeline?.grid?.campaign_days ?? 14);
      const dataset = await buildForecastDataset({});
      const outcome = executeForecast({
        model_id: modelId,
        dataset,
        horizon: horizonNeeded,
        executed_as_of: new Date().toISOString(),
        backtest: true
      });
      if (!isRefusal(outcome)) forecast = outcome;
    }

    const projection = projectCampaignFlight({ ...payload, forecast });
    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-continuous-flight',
      data: projection,
      disclosures: {
        baseline: projection.activation.disclosure,
        actual_series: projection.lenses[0]?.disclosure,
        uncertainty:
          'Declared horizon uncertainty profile, not a calibrated interval — ' +
          projection.uncertainty.horizon_basis,
        horizon_shape: projection.horizon_shape_disclosure,
        forecast_model: projection.forecast
          ? `${projection.forecast.model_display_name} (${projection.forecast.implementation_ref})`
          : 'None bound — the horizon is flat and says so.',
        non_scope: projection.non_scope
      }
    });
  } catch (e: any) {
    const rejection = e.rejection_id as string | undefined;
    const message = String(e.message || '');
    const notFound = message.startsWith('ContractNotFound');
    return NextResponse.json(
      {
        status: 'error',
        error: notFound ? 'NotFound' : rejection || 'BadRequest',
        rejection_id: rejection,
        message,
        timestamp: new Date().toISOString()
      },
      { status: notFound ? 404 : 400 }
    );
  }
}
