import { NextRequest, NextResponse } from 'next/server';
import { requireScenarioForTenant, ScenarioResolutionError } from '@/lib/scenario-runtime';
import { requestTenantId } from '@/app/api/v1/_shared/scenario-request';
import { platformReceiptNowIso } from '@/packages/contracts/src/index';
import { restartScenarioEvidence } from '@/lib/living-evidence-engine';

/**
 * Restart a scenario's EVIDENCE to its opening position (ADR-081 part 3).
 *
 * The counterpart to Refresh, and what makes the demonstration repeatable: two reads of an
 * unadvanced scenario are byte-identical, so a presenter can run the same advance twice and get the
 * same answer. It returns the as-at marker only — scenario activation and Shared Decision State
 * reset are `SCI-01` and `SCI-04`'s and are not touched here.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { searchParams } = new URL(request.url);
    const scenarioId = requireScenarioForTenant(
      body.scenario_id ?? searchParams.get('scenario_id') ?? undefined,
      'POST /api/v1/evidence/restart',
      body.tenant_id || requestTenantId(searchParams, request.headers.get('x-tenant-id'))
    ).identity.scenario_id;

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'living-evidence',
      data: { as_at: restartScenarioEvidence(scenarioId) },
      timestamp: platformReceiptNowIso()
    });
  } catch (error: any) {
    if (error instanceof ScenarioResolutionError) {
      return NextResponse.json(
        { status: 'error', error: 'ScenarioNotResolved', message: error.message, timestamp: platformReceiptNowIso() },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { status: 'error', error: 'InternalError', message: error?.message ?? 'Restart failed', timestamp: platformReceiptNowIso() },
      { status: 500 }
    );
  }
}
