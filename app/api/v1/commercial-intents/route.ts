import { NextRequest, NextResponse } from 'next/server';
import { CommercialIntent, validateCommercialIntent } from '@/packages/contracts/src/index';
import { registerCommercialIntent, getCurrentCommercialIntent } from '@/lib/commercial-intent-store';
import { transitionDecisionState } from '@/lib/decision-state-store';
import { ingestJourneyEvent } from '@/lib/journey-store';

export async function POST(request: NextRequest) {
  try {
    const payload: CommercialIntent = await request.json();
    const valResult = validateCommercialIntent(payload);

    if (!valResult.valid) {
      return NextResponse.json({
        status: 'error',
        error: 'BadRequest',
        message: valResult.errors.join(', '),
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // 1. Register in Commercial Intent Store
    const registered = registerCommercialIntent(payload);

    // 2. Propagate to Shared Decision State (vN -> vN+1 transition)
    transitionDecisionState(registered.tenant_id, registered.session_id, 'REGISTER_COMMERCIAL_INTENT', {
      promotion_lift: registered.discount_depth,
      promotion_method: registered.promotion_type,
      commercial_intent_ref: registered.commercial_intent_id
    });

    // 3. Record Journey Telemetry event (Records user action without duplicating intent object)
    ingestJourneyEvent({
      event_id: `evt_${Math.random().toString(36).substr(2, 9)}`,
      event_type: 'COMMERCIAL_INTENT_REGISTERED',
      tenant_id: registered.tenant_id,
      session_id: registered.session_id,
      user_id: 'user_exec_01',
      persona_id: 'commercial_director',
      source: 'web_promotion_planner',
      timestamp: new Date().toISOString(),
      schema_version: '1.0',
      metadata: {
        commercial_intent_id: registered.commercial_intent_id,
        category: registered.category,
        discount_depth: registered.discount_depth
      }
    });

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'commercial-intents',
      data: registered
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tenantId = searchParams.get('tenant_id') || 'tenant_uk_retail_01';
  const sessionId = searchParams.get('session_id') || 'sess_001';

  const intent = getCurrentCommercialIntent(tenantId, sessionId);
  return NextResponse.json({
    status: 'success',
    service: 'cognix-web-bff',
    domain: 'commercial-intents',
    data: intent
  });
}
