import { NextRequest, NextResponse } from 'next/server';
import { campaignExperimentStore } from '@/lib/campaign-experiment-store';
import {
  MIN_COMPARISON_EXPERIMENTS,
  MAX_COMPARISON_EXPERIMENTS
} from '@/packages/contracts/src/campaign-experiment-model';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => ({}));
    const tenantId = payload.tenant_id || 'tenant_uk_retail_01';
    const sessionId = payload.session_id || 'sess_001';

    // `experiment_ids` is the current shape. The earlier two-experiment payload is still
    // accepted so a client that has not reloaded keeps working across a deploy.
    const experimentIds: string[] = Array.isArray(payload.experiment_ids)
      ? payload.experiment_ids.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
      : [payload.experiment_a_id, payload.experiment_b_id].filter(
          (id: unknown): id is string => typeof id === 'string' && id.length > 0
        );

    if (
      experimentIds.length < MIN_COMPARISON_EXPERIMENTS ||
      experimentIds.length > MAX_COMPARISON_EXPERIMENTS
    ) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'BadRequest',
          message: `A comparison takes between ${MIN_COMPARISON_EXPERIMENTS} and ${MAX_COMPARISON_EXPERIMENTS} experiment ids`,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    const comparison = campaignExperimentStore.compareExperiments(tenantId, sessionId, experimentIds);

    if (!comparison) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'NotFound',
          message: `One or more experiments (${experimentIds.join(', ')}) could not be found for comparison`,
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
