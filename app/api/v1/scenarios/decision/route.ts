/**
 * The authoritative decision quantities for one scenario, evaluated server-side.
 *
 * `SCI-09` consumes this rather than deriving economics in the browser: the Architecture Surface
 * must publish what the domain engines produced, not a second arithmetic that agrees with them
 * until one of them moves (ADR-073 rule 1, ADR-080).
 *
 * A missing `scenario_id` is refused through the shared resolver, never defaulted to a literal —
 * ADR-077 part 4, and the `SCI-01` source guard that fails a test rather than a browser.
 */
import { NextRequest, NextResponse } from 'next/server';
import { resolveScenarioForRequest } from '@/app/api/v1/_shared/scenario-request';
import { evaluateAuthoritativeScenarioDecision } from '@/lib/canonical-decision-evaluator';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const resolution = resolveScenarioForRequest(searchParams, 'scenario authoritative decision');
  if (!resolution.ok) return resolution.response;

  try {
    const decision = await evaluateAuthoritativeScenarioDecision(resolution.scenario);
    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'scenario-authoritative-decision',
      data: decision
    });
  } catch (e: unknown) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'EvaluationFailed',
        message: e instanceof Error ? e.message : 'Failed to evaluate authoritative scenario decision'
      },
      { status: 500 }
    );
  }
}
