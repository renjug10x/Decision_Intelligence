import { NextRequest, NextResponse } from 'next/server';
import {
  CampaignIntent,
  assertNoFutureCdiCalculations,
  projectCampaignIntentToCommercialIntent,
  validateCampaignIntent
} from '@/packages/contracts/src/index';
import {
  getCurrentCampaignIntent,
  registerCampaignIntent,
  saveCampaignIntentDraft,
  patchRegisteredCampaignIntent
} from '@/lib/campaign-intent-store';
import { registerCommercialIntent } from '@/lib/commercial-intent-store';
import { transitionDecisionState } from '@/lib/decision-state-store';
import { ingestJourneyEvent } from '@/lib/journey-store';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tenantId = searchParams.get('tenant_id') || 'tenant_uk_retail_01';
  const sessionId = searchParams.get('session_id') || 'sess_001';
  const intent = getCurrentCampaignIntent(tenantId, sessionId);

  return NextResponse.json({
    status: 'success',
    service: 'cognix-web-bff',
    domain: 'campaign-decision-intent',
    data: intent
  });
}

export async function PUT(request: NextRequest) {
  try {
    const payload: CampaignIntent = await request.json();
    const leakage = assertNoFutureCdiCalculations(payload);
    if (!leakage.ok) {
      return NextResponse.json({
        status: 'error',
        error: 'BadRequest',
        message: `CDI-01 draft must not embed future CDI calculation fields: ${leakage.offenders.join(', ')}`,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const saved = saveCampaignIntentDraft(payload);
    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-decision-intent',
      data: saved
    });
  } catch (e: any) {
    return NextResponse.json({
      status: 'error',
      error: 'BadRequest',
      message: e.message,
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload: CampaignIntent = await request.json();
    const leakage = assertNoFutureCdiCalculations(payload);
    if (!leakage.ok) {
      return NextResponse.json({
        status: 'error',
        error: 'BadRequest',
        message: `CDI-01 registration must not embed future CDI calculation fields: ${leakage.offenders.join(', ')}`,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const registered = registerCampaignIntent(payload);
    const validation = validateCampaignIntent(registered, { requireRegistered: true });
    if (!validation.valid) {
      return NextResponse.json({
        status: 'error',
        error: 'BadRequest',
        message: validation.errors.join(', '),
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Additive IFI-01 projection only when promotion is explicitly under consideration
    let commercialIntentRef: string | undefined = registered.decision_context.commercial_intent_ref;
    const projected = projectCampaignIntentToCommercialIntent(registered);
    if (projected) {
      const commercial = registerCommercialIntent(projected);
      commercialIntentRef = commercial.commercial_intent_id;
      registered.decision_context = {
        ...registered.decision_context,
        commercial_intent_ref: commercialIntentRef
      };
    }

    const nextState = transitionDecisionState(
      registered.tenant_id,
      registered.session_id,
      'REGISTER_CAMPAIGN_INTENT',
      {
        campaign_intent_ref: registered.campaign_intent_id,
        commercial_intent_ref: commercialIntentRef,
        intervention_posture: registered.campaign_intent.intervention_posture,
        promotion_lift:
          registered.campaign_intent.intervention_posture === 'CONSIDER_PROMOTION'
            ? registered.campaign_intent.provisional_discount_depth ?? 20
            : 0,
        promotion_method:
          registered.campaign_intent.intervention_posture === 'CONSIDER_PROMOTION'
            ? registered.campaign_intent.provisional_mechanic || '20_percent_off'
            : 'none',
        campaign_scope: 'regional'
      }
    );

    registered.decision_context = {
      ...registered.decision_context,
      decision_state_id: nextState.decision_state_id,
      commercial_intent_ref: commercialIntentRef
    };

    const persisted = patchRegisteredCampaignIntent(registered.campaign_intent_id, {
      decision_context: registered.decision_context,
      provenance: {
        decision_state_version: String(nextState.state_version)
      }
    }) || registered;

    ingestJourneyEvent({
      event_id: `evt_${Math.random().toString(36).substr(2, 9)}`,
      event_type: 'CAMPAIGN_INTENT_REGISTERED',
      tenant_id: persisted.tenant_id,
      session_id: persisted.session_id,
      user_id: 'user_exec_01',
      persona_id: 'commercial_director',
      source: 'web_campaign_decision_canvas',
      experiment_id: 'EXP-CDI-01',
      timestamp: new Date().toISOString(),
      schema_version: '1.0',
      metadata: {
        campaign_intent_id: persisted.campaign_intent_id,
        intervention_posture: persisted.campaign_intent.intervention_posture,
        objective_type: persisted.campaign_intent.objective_type,
        commercial_intent_ref: commercialIntentRef || null
      }
    });

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-decision-intent',
      data: persisted,
      decision_state_version: nextState.state_version
    });
  } catch (e: any) {
    return NextResponse.json({
      status: 'error',
      error: 'BadRequest',
      message: e.message,
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }
}
