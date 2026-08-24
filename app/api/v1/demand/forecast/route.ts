import { NextRequest, NextResponse } from 'next/server';
import { projectDemand, isDemandRefusal, SUPPORTED_HORIZONS, DemandMetric } from '@/lib/demand-forecast';
import { recommendForecastModel } from '@/lib/forecast/forecast-engine';
import { buildForecastDataset } from '@/lib/forecast/series';
import { isRegisteredModel } from '@/lib/forecast/registry';

/**
 * FM-01 — the Demand & Forecast projection, on the governed forecast boundary.
 *
 * This route replaces `GET /api/data?type=forecast`, which selected among three closed-form curves
 * over a loop index and defaulted to `model=arima`. Nothing here branches on a model name: an
 * unregistered model is refused with the reason, exactly as it is on the Twin's path, because a name
 * that reaches no implementation must not reach a chart either.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const metric = (body.metric ?? 'revenue') as DemandMetric;
    if (!['revenue', 'units', 'waste'].includes(metric)) {
      return NextResponse.json(
        { status: 'error', error: 'BadRequest', message: `Unknown metric "${metric}".` },
        { status: 400 }
      );
    }

    const horizon = Number(body.horizon ?? 14);
    if (!SUPPORTED_HORIZONS.includes(horizon as any)) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'HORIZON_NOT_OFFERED',
          message:
            `This surface offers ${SUPPORTED_HORIZONS.join(', ')} day horizons and was asked for ${horizon}. ` +
            'A horizon the surface does not offer is refused rather than served.'
        },
        { status: 400 }
      );
    }

    const modelId = String(body.model_id ?? '');
    if (!isRegisteredModel(modelId)) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'MODEL_NOT_REGISTERED',
          message:
            `No forecasting model is registered under "${modelId}". A model is offered only when an ` +
            'implementation genuinely executes it, so an unrecognised name is refused rather than ' +
            'quietly served by a default.'
        },
        { status: 400 }
      );
    }

    const outcome = await projectDemand({
      storeId: body.store_id || undefined,
      category: body.category || undefined,
      metric,
      horizon,
      modelId,
      promoLift: Number(body.promotion_lift ?? 0),
      cannibalization: Number(body.cannibalisation ?? 0),
      eventBoost: String(body.event ?? 'none'),
      executedAsOf: body.executed_as_of || new Date().toISOString(),
      backtest: body.backtest !== false,
      historyDisplayDays: body.history_display_days ? Number(body.history_display_days) : undefined
    });

    if (isDemandRefusal(outcome)) {
      return NextResponse.json(
        { status: 'refused', service: 'cognix-web-bff', domain: 'demand-forecast', data: outcome },
        { status: 200 }
      );
    }

    // The measured recommendation, requested separately because it refits every registered model and
    // a planner changing a slider does not need it recomputed.
    let recommendation = null;
    if (body.include_recommendation === true) {
      const dataset = await buildForecastDataset({
        scope: outcome.scope,
        measure: outcome.measure
      });
      recommendation = recommendForecastModel(dataset, horizon, outcome.execution.executed_as_of);
    }

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'demand-forecast',
      data: { projection: outcome, recommendation },
      disclosures: {
        model: `Produced by ${outcome.execution.model_display_name} (${outcome.execution.implementation_ref}).`,
        interval: outcome.execution.uncertainty.disclosure,
        calibration: outcome.execution.calibration
          ? outcome.execution.calibration.reliable
            ? `The published range is calibrated against ${outcome.execution.calibration.sample_size} held-out ` +
              `backtest errors and covered ${
                outcome.execution.calibration.held_out_coverage === null
                  ? 'an unmeasured share'
                  : `${(outcome.execution.calibration.held_out_coverage * 100).toFixed(0)}%`
              } of them on folds it was not calibrated on.`
            : 'The evidence was too thin to calibrate a range on, so the model-implied range stands with its measured coverage.'
          : 'No backtest was run, so no calibration was attempted.',
        scenario: outcome.scenario.statement,
        not_learning: outcome.execution.provenance.not_learning
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        status: 'error',
        error: e?.rejection_id || 'BadRequest',
        rejection_id: e?.rejection_id,
        message: String(e?.message || 'Demand projection failed'),
        timestamp: new Date().toISOString()
      },
      { status: 400 }
    );
  }
}
