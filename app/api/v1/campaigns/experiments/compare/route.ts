import { NextRequest, NextResponse } from 'next/server';
import { campaignExperimentStore } from '@/lib/campaign-experiment-store';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => ({}));
    const tenantId = payload.tenant_id || 'tenant_uk_retail_01';
    const sessionId = payload.session_id || 'sess_001';
    const experimentAId = payload.experiment_a_id;
    const experimentBId = payload.experiment_b_id;

    if (!experimentAId || !experimentBId) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'BadRequest',
          message: 'Both experiment_a_id and experiment_b_id are required for comparison',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    const comparison = campaignExperimentStore.compareExperiments(
      tenantId,
      sessionId,
      experimentAId,
      experimentBId
    );

    if (!comparison) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'NotFound',
          message: `One or both experiments (${experimentAId}, ${experimentBId}) could not be found for comparison`,
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-decision-experiment-comparison',
      data: comparison
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
