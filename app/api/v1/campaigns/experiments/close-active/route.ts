import { NextRequest, NextResponse } from 'next/server';
import { campaignExperimentStore } from '@/lib/campaign-experiment-store';

/**
 * CTW-01R — end the promotion experiment in progress without deleting it.
 *
 * "New Promotion Experiment" needs exactly one thing: the next preservation must allocate a fresh
 * experiment identity instead of updating the one the analyst just finished with. That is what
 * `closeActiveExperiment` does — history is preserved and nothing is removed.
 *
 * It is deliberately NOT the session reset. A reset also clears campaign intents, decision
 * contracts, pre-mortems, learning candidates and shared decision state for this tenant/session —
 * and the Campaign Decision Canvas shares that session, so resetting from the Promotion surface
 * would silently discard a decision being drafted on another screen. Starting a new promotion
 * experiment is not a reason to do that.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => ({}));
    const tenantId = payload.tenant_id;
    const sessionId = payload.session_id;

    if (!tenantId || !sessionId) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'BadRequest',
          message: 'tenant_id and session_id are required — closing an experiment is never global',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    const closedId = campaignExperimentStore.getActiveExperimentId(tenantId, sessionId);
    campaignExperimentStore.closeActiveExperiment(tenantId, sessionId);

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-experiments',
      data: {
        closed_experiment_id: closedId,
        next_experiment_id: campaignExperimentStore.getNextExperimentId(tenantId, sessionId)
      },
      disclosures: {
        preservation:
          'The closed experiment is preserved and remains readable in history. Nothing was deleted.'
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'BadRequest',
        message: String(e?.message || 'Could not close the active experiment'),
        timestamp: new Date().toISOString()
      },
      { status: 400 }
    );
  }
}
