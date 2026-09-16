/**
 * Scenario resolution for route handlers (ADR-077 part 4).
 *
 * The one place a route turns a request into a scenario, so the rule is stated once and
 * cannot drift back in through a route nobody was looking at.
 *
 * What this replaces. Every signal route used to read `searchParams.get('scenario_id')`
 * with a literal fallback of `'SCN-PROMO-01'` and a family fallback of `'promotion_surge'`.
 * The Observability & Governance panel sent neither, so a governance surface published a
 * supplier the connected journey had retired — and it did so through three different
 * routes, which is why correcting the literal in one of them would not have closed it.
 *
 *   > A missing scenario is an ERROR, never a default.
 *
 * `HTTP 400` naming the missing parameter is the whole of the rule. A caller that wants
 * the scenario the estate is running asks for it by name through the registry.
 */

import { NextResponse } from 'next/server';
import {
  CanonicalScenario,
  requireScenarioId,
  ScenarioResolutionError
} from '@/packages/contracts/src/index';
import { platformReceiptNowIso } from '@/packages/contracts/src/scenario-clock';

export type ScenarioRequestResult =
  | { ok: true; scenario: CanonicalScenario }
  | { ok: false; response: NextResponse };

/**
 * Resolve the scenario a request is about, or produce the refusal.
 *
 * `400` rather than `404` deliberately: an absent or unregistered `scenario_id` is a
 * malformed request about a scenario that does not exist, not a missing document.
 */
export function resolveScenarioForRequest(
  searchParams: URLSearchParams,
  requestContext: string
): ScenarioRequestResult {
  try {
    return { ok: true, scenario: requireScenarioId(searchParams.get('scenario_id'), requestContext) };
  } catch (error) {
    if (error instanceof ScenarioResolutionError) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            status: 'error',
            error: 'ScenarioNotResolved',
            message: error.message,
            required_parameter: 'scenario_id',
            requested_scenario_id: error.requested ?? null,
            // A server receipt, not scenario evidence (ADR-078 part 2).
            timestamp: platformReceiptNowIso()
          },
          { status: 400 }
        )
      };
    }
    throw error;
  }
}
