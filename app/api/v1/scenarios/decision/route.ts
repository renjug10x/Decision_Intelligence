import { NextRequest, NextResponse } from 'next/server';
import { evaluateAuthoritativeScenarioDecision } from '@/lib/canonical-decision-evaluator';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scenarioId = searchParams.get('scenario_id') || 'SCN-FRESH-DAIRY-CHEDDAR-001';

  try {
    const decision = await evaluateAuthoritativeScenarioDecision(scenarioId);
    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'scenario-authoritative-decision',
      data: decision
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'EvaluationFailed',
        message: e?.message ?? 'Failed to evaluate authoritative scenario decision'
      },
      { status: 500 }
    );
  }
}
