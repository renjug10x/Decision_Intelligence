import { NextRequest, NextResponse } from 'next/server';
import { campaignExperimentStore } from '@/lib/campaign-experiment-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id') || 'tenant_uk_retail_01';
    const sessionId = searchParams.get('session_id') || 'sess_001';
    const category = searchParams.get('category') || undefined;
    const region = searchParams.get('region') || undefined;
    const objectiveType = searchParams.get('objective_type') || undefined;
    const recommendation = searchParams.get('recommendation') || undefined;

    const experiments = campaignExperimentStore.listExperiments(tenantId, sessionId, {
      category,
      region,
      objective_type: objectiveType,
      recommendation
    });

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-decision-experiments',
      data: {
        experiments,
        count: experiments.length,
        // The identity the in-progress decision already owns, if any. Null means the session is
        // drafting a new decision that has not yet earned an experiment id.
        active_experiment_id: campaignExperimentStore.getActiveExperimentId(tenantId, sessionId),
        next_suggested_id: campaignExperimentStore.getNextExperimentId(tenantId, sessionId)
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'BadRequest',
        message: e.message,
        timestamp: new Date().toISOString()
      },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => ({}));
    const tenantId = payload.tenant_id || 'tenant_uk_retail_01';
    const sessionId = payload.session_id || 'sess_001';

    // Deliberately no id is allocated here. The store resolves the target identity: an explicit
    // experiment_id, else the decision already in progress for this scope, else a new id. Minting
    // one per request is what turned a single decision into a row of near-identical experiments.
    const saved = campaignExperimentStore.saveExperiment(tenantId, sessionId, {
      ...payload,
      tenant_id: tenantId,
      session_id: sessionId,
      completed_at: payload.completed_at || new Date().toISOString(),
      schema_version: payload.schema_version || '1.0'
    });

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-decision-experiments',
      data: saved
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'BadRequest',
        message: e.message,
        timestamp: new Date().toISOString()
      },
      { status: 400 }
    );
  }
}
