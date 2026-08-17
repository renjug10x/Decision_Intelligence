import { NextRequest, NextResponse } from 'next/server';
import { ReadinessEvaluationRequest } from '@/packages/contracts/src/campaign-readiness-model';
import { evaluateCampaignReadinessWithDiscovery } from '@/lib/campaign-readiness-engine';

/** CDI-04 Campaign Decision Readiness & Resilience. Orchestration only — scoring lives in the engine. */
export async function POST(request: NextRequest) {
  try {
    const payload: ReadinessEvaluationRequest = await request.json();
    const result = evaluateCampaignReadinessWithDiscovery(payload);
    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-decision-readiness',
      data: result,
      disclosures: {
        threshold_policy: 'synthetic_demonstration_policy',
        decision_ripple: 'wp10c_derived_impacts_readonly',
        discovery_anchor: 'CDI-03 fixed_demo_anchor is SEEDED_ASSUMPTION, not live calendar evidence'
      }
    });
  } catch (e: any) {
    const rejection = e.rejection_id as string | undefined;
    const notFound = String(e.message).startsWith('CampaignIntentNotFound');
    const status = notFound ? 404 : 400;
    return NextResponse.json(
      {
        status: 'error',
        error: notFound ? 'NotFound' : rejection || 'BadRequest',
        rejection_id: rejection,
        message: e.message,
        timestamp: new Date().toISOString()
      },
      { status }
    );
  }
}
