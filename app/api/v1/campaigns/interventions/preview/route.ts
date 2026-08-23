import { NextRequest, NextResponse } from 'next/server';
import { projectDecisionTimeline } from '@/lib/campaign-timeline-engine';
import { projectCampaignFlight } from '@/lib/campaign-continuous-timeline-engine';
import { buildInterventionPreview } from '@/lib/campaign-intervention-preview';
import { buildForecastDataset } from '@/lib/forecast/series';
import { executeForecast } from '@/lib/forecast/forecast-engine';
import { DEFAULT_FORECAST_MODEL_ID } from '@/lib/forecast/registry';
import { ForecastExecution, isRefusal } from '@/packages/contracts/src/forecast-model-model';
import { InterventionCandidate } from '@/packages/contracts/src/campaign-intervention-model';

/**
 * CTW-02 — do nothing versus intervene, computed server-side so both sides come from the same
 * engines on the same inputs.
 *
 * The "with" side is CDI-02/CDI-05 re-evaluated at the proposed promotional depth and reshaped by
 * the **same** CTW-03 forecast. No second forecasting model is run, and nothing is extrapolated.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenant_id, session_id, contract_id, campaign_intent, candidate, effective_from_flight_day, elapsed_telemetry } =
      body as {
        tenant_id: string;
        session_id: string;
        contract_id: string;
        campaign_intent: any;
        candidate: InterventionCandidate;
        effective_from_flight_day: number;
        elapsed_telemetry: any[];
        moment_id: string;
      };

    if (!campaign_intent || !candidate) {
      return NextResponse.json({ status: 'error', error: 'BadRequest', message: 'A preview needs the campaign intent and a candidate action.' }, { status: 400 });
    }

    const baseTimeline: any = projectDecisionTimeline({
      tenant_id,
      session_id,
      campaign_intent_id: campaign_intent.campaign_intent_id,
      campaign_intent
    } as any);
    const timeline = baseTimeline.projection ?? baseTimeline;

    // The intervention is a change of promotional depth on the same campaign, evaluated by the same
    // engine. Nothing else about the intent moves.
    const modifiedIntent = {
      ...campaign_intent,
      campaign_intent: {
        ...campaign_intent.campaign_intent,
        provisional_discount_depth: candidate.proposed_discount_pct
      }
    };
    const ivTimelineRaw: any = projectDecisionTimeline({
      tenant_id,
      session_id,
      campaign_intent_id: modifiedIntent.campaign_intent_id,
      campaign_intent: modifiedIntent
    } as any);
    const ivTimeline = ivTimelineRaw.projection ?? ivTimelineRaw;

    const dataset = await buildForecastDataset({});
    const fx = executeForecast({
      model_id: DEFAULT_FORECAST_MODEL_ID,
      dataset,
      horizon: Math.max(1, timeline.grid.campaign_days),
      executed_as_of: new Date().toISOString(),
      backtest: false
    });
    const forecast: ForecastExecution | undefined = isRefusal(fx) ? undefined : fx;

    const baseArgs = {
      tenant_id,
      session_id,
      contract_id,
      timeline,
      elapsed_telemetry: elapsed_telemetry || [],
      forecast
    };

    const baseline = projectCampaignFlight(baseArgs);
    const intervened = projectCampaignFlight({
      ...baseArgs,
      applied_intervention: {
        intervention_id: 'preview',
        action_label: candidate.label,
        effective_from_flight_day,
        confirmed_by: 'preview',
        statement: 'Preview only — nothing is confirmed.',
        reason: 'Preview',
        timeline: ivTimeline
      }
    });

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-interventions',
      data: buildInterventionPreview({
        momentId: body.moment_id,
        candidate,
        effectiveFromFlightDay: effective_from_flight_day,
        baseline,
        intervened
      }),
      disclosures: {
        preview: 'A preview changes nothing. It compares two evaluations of the same campaign.',
        basis: 'Both sides are CDI-02 at two promotional depths, shaped by the same governed forecast.'
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      { status: 'error', error: e.rejection_id || 'BadRequest', rejection_id: e.rejection_id, message: String(e?.message || 'Preview failed') },
      { status: 400 }
    );
  }
}
