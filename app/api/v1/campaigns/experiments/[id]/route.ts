import { NextRequest, NextResponse } from 'next/server';
import { campaignExperimentStore } from '@/lib/campaign-experiment-store';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id') || 'tenant_uk_retail_01';
    const sessionId = searchParams.get('session_id') || 'sess_001';

    const experiment = campaignExperimentStore.getExperimentById(id, tenantId, sessionId);
    if (!experiment) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'NotFound',
          message: `Experiment ${id} not found for this tenant and session`,
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-decision-experiments',
      data: experiment
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
