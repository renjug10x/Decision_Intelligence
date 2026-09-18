import { NextRequest, NextResponse } from 'next/server';
// Through the scenario runtime: importing it installs the Scenario Certification Gate.
import { requireScenarioId, ScenarioResolutionError } from '@/lib/scenario-runtime';
import { platformReceiptNowIso } from '@/packages/contracts/src/index';
import { resolveScenario } from '@/packages/contracts/src/scenario-registry';
import {
  scenarioEvidenceTimelines,
  previewRefresh,
  assessedEvidenceAt,
  scenarioDecisionPosition
} from '@/lib/living-evidence-engine';

/**
 * Living Evidence for a scenario (`SCI-05`).
 *
 * The DOMAIN behaviour `SCI-06` consumes. This route publishes; it renders nothing and decides
 * nothing about presentation, which is `SCI-06`'s and is deliberately untouched here.
 *
 * A scenario is NAMED, never defaulted (ADR-077 part 4). `requireScenarioId` refuses a request that
 * names none rather than answering about whichever scenario happened to be active.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const correlationId = request.headers.get('x-correlation-id') || `corr_evd_${Math.random().toString(36).slice(2, 11)}`;

  try {
    const scenario = requireScenarioId(searchParams.get('scenario_id') ?? undefined, 'GET /api/v1/evidence');
    const scenarioId = scenario.identity.scenario_id;
    const timelines = scenarioEvidenceTimelines(scenario);
    /*
     * The Gate-C convergence seam. `observed` carries each observation WITH its materiality and
     * decision relevance, assessed by the engine above — the single owner. Before convergence this
     * route published the timelines and a count, and the Observability surface had nowhere to read
     * an assessment from except a fixture. ADR-084 part 2: a field a consumer needs and does not
     * find is a convergence event raised at the gate, and this is it.
     */
    const assessed = assessedEvidenceAt(scenarioId);

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'living-evidence',
      correlation_id: correlationId,
      scenario_id: scenarioId,
      scenario_name: scenario.identity.scenario_name,
      as_at: assessed.as_at,
      data: {
        timelines,
        /* Every observation visible at the marker, with what it moved and whether it changed the decision. */
        observed: assessed.observations,
        observed_signal_count: assessed.observations.length,
        /* Where the decision stands right now, from the same derivation the relevance assessment compares. */
        decision_position: scenarioDecisionPosition(scenarioId),
        /*
         * What the NEXT advance would publish, without taking it. A reader deciding whether to
         * refresh is entitled to know whether anything would change — and computing it here rather
         * than in a surface is what stops two surfaces answering differently.
         */
        next_refresh_preview: previewRefresh(scenarioId)
      },
      timestamp: platformReceiptNowIso()
    });
  } catch (error: any) {
    if (error instanceof ScenarioResolutionError) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'ScenarioNotResolved',
          message: error.message,
          requested_scenario_id: error.requested ?? null,
          timestamp: platformReceiptNowIso()
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { status: 'error', error: 'InternalError', message: error?.message ?? 'Living Evidence failed', timestamp: platformReceiptNowIso() },
      { status: 500 }
    );
  }
}
