/**
 * Canonical Decision Reconciliation — TRANSPORT, never a second economic model.
 * ─────────────────────────────────────────────────────────────────────────────
 * ADR-073 rule 1 and ADR-080: one authoritative economic source across every presentation
 * surface. The authority is the server-side domain pipeline, reached through
 * `GET /api/v1/scenarios/decision`, which runs:
 *
 *   - `projectDemand`                        (lib/demand-forecast)
 *   - `evaluateDemandDecisionFrontier`       (lib/demand-decision-frontier/demand-frontier-engine)
 *   - `evaluateInterventionRecommendation`   (lib/demand-decision-frontier/demand-frontier-engine)
 *   - `scenarioElasticityCurve`              (lib/campaign-archetypes)
 *
 * This module carries those results to the browser and caches them. It derives nothing.
 *
 * **Why there is no synchronous fallback.** An earlier revision of this module computed the
 * quantities itself when the server answer had not arrived — branching on scenario identity and
 * carrying a per-scenario expected demand, window and stability index inline. Those literals agreed
 * with the engines on the day they were written and disagreed with the contract's own closed-form
 * derivation by five units on the reference scenario. That is two economic models for one scenario,
 * which is the defect ADR-073 exists to prevent, and it is also what the `SCI-03` guard *"a pack is
 * data, never a branch"* fails a test over. A surface that has not yet read the authoritative answer
 * says so — the `ATL-FINAL` discipline of declaring unmeasured rather than publishing a figure that
 * was not earned.
 */

/** The shape the domain evaluator publishes. Declared once, in `lib/canonical-decision-evaluator.ts`. */
export type { AuthoritativeScenarioDecision } from './canonical-decision-evaluator';
import type { AuthoritativeScenarioDecision } from './canonical-decision-evaluator';

/** Authoritative decisions read back from the domain API, keyed by scenario identity. */
const serverDecisionCache = new Map<string, AuthoritativeScenarioDecision>();

/**
 * Read the authoritative decision for a scenario from the domain API, once per scenario.
 *
 * Returns `null` when the request fails. A null is an honest "not measured in this session",
 * never a licence to substitute a locally computed number.
 */
export async function fetchAuthoritativeScenarioDecision(
  scenarioId: string
): Promise<AuthoritativeScenarioDecision | null> {
  if (!scenarioId) return null;
  const cached = serverDecisionCache.get(scenarioId);
  if (cached) return cached;
  try {
    const res = await fetch(`/api/v1/scenarios/decision?scenario_id=${encodeURIComponent(scenarioId)}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.status === 'success' && json?.data?.scenarioId === scenarioId) {
      serverDecisionCache.set(scenarioId, json.data);
      return json.data as AuthoritativeScenarioDecision;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * The authoritative decision already read for a scenario, or `null` if none has been.
 * Synchronous, and deliberately incapable of producing a quantity of its own.
 */
export function authoritativeScenarioDecision(
  scenarioId: string | null | undefined
): AuthoritativeScenarioDecision | null {
  if (!scenarioId) return null;
  return serverDecisionCache.get(scenarioId) ?? null;
}

/**
 * Seed the cache with a decision the caller obtained from the evaluator directly.
 * Used by server-rendered callers and by the reconciliation suite, which drives the surface with
 * the engines' own output rather than with a fixture.
 */
export function primeAuthoritativeScenarioDecision(decision: AuthoritativeScenarioDecision): void {
  serverDecisionCache.set(decision.scenarioId, decision);
}

/** Test seam: forget everything read so far. */
export function resetAuthoritativeDecisionCache(): void {
  serverDecisionCache.clear();
}
