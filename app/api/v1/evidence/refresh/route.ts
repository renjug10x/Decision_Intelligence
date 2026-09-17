import { NextRequest, NextResponse } from 'next/server';
import { requireScenarioId, ScenarioResolutionError } from '@/lib/scenario-runtime';
import { platformReceiptNowIso } from '@/packages/contracts/src/index';
import { refreshScenario } from '@/lib/living-evidence-engine';

/**
 * Refresh — a scenario operation, not a fetch (ADR-081 part 1).
 *
 * `POST` because it CHANGES the scenario's as-at marker. The previous Refresh control re-issued a
 * `GET` and appeared inert, correctly, because re-reading an unchanged snapshot is what it did.
 *
 * The response is the `RefreshDelta` exactly as the contract declares it, including the mandatory
 * `decision_consequence_statement`. `SCI-06` renders it and recomputes no part of it.
 */
export async function POST(request: NextRequest) {
  const correlationId = request.headers.get('x-correlation-id') || `corr_rfr_${Math.random().toString(36).slice(2, 11)}`;
  try {
    const body = await request.json().catch(() => ({}));
    const { searchParams } = new URL(request.url);
    const scenarioId = requireScenarioId(
      body.scenario_id ?? searchParams.get('scenario_id') ?? undefined,
      'POST /api/v1/evidence/refresh'
    ).identity.scenario_id;

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'living-evidence',
      correlation_id: correlationId,
      data: refreshScenario(scenarioId),
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
      { status: 'error', error: 'InternalError', message: error?.message ?? 'Refresh failed', timestamp: platformReceiptNowIso() },
      { status: 500 }
    );
  }
}
