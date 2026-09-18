import { NextRequest, NextResponse } from 'next/server';
import { requireScenarioId, ScenarioResolutionError } from '@/lib/scenario-runtime';
import { platformReceiptNowIso } from '@/packages/contracts/src/index';
import { scenarioMethodsRegister } from '@/lib/living-evidence-engine';

/**
 * The Models & Methods register for a scenario (`SCI-05`).
 *
 * Composed from the forecast registry and the deterministic engines this estate genuinely runs.
 * Only implemented mechanisms appear, and a mechanism that exists but has not run is declared in
 * `undescribed` with its reason rather than omitted — a register that silently drops what it cannot
 * describe reads as a complete list and is not one.
 *
 * ADR-067: no prompt, token, temperature or model identifier is published here. The contract has no
 * field that could carry one.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  try {
    const scenarioId = requireScenarioId(
      searchParams.get('scenario_id') ?? undefined,
      'GET /api/v1/methods'
    ).identity.scenario_id;
    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'models-and-methods',
      data: scenarioMethodsRegister(scenarioId),
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
      { status: 'error', error: 'InternalError', message: error?.message ?? 'Register failed', timestamp: platformReceiptNowIso() },
      { status: 500 }
    );
  }
}
