/**
 * CogniX Observability Client — `SCI-06`, converged at Gate C
 * ───────────────────────────────────────────────────────────────────────────────
 * The Observability & Governance surface's one route to Living Evidence, the Refresh Operation,
 * Restart and the Models & Methods register.
 *
 * **There is no fixture here, and there is no fallback to one.** `SCI-06` legitimately built
 * against `lib/fixtures/living-evidence-fixtures.ts` while `SCI-05` implemented the engines in the
 * parallel lane — that is what the Gate-A contract freeze exists to permit. At convergence that
 * fixture became a second answer to a question the estate now answers for real, so it was removed
 * rather than demoted: a runtime path that can silently fall back to authored data is a path that
 * will eventually present authored data as measurement, and `run-wave2-convergence-tests.ts`
 * asserts against it rather than trusting this comment.
 *
 * A failed call therefore FAILS, visibly, with the reason. An Observability surface that hid a
 * broken evidence path behind plausible numbers would be the opposite of observability.
 *
 * Nothing here derives anything. Materiality, decision relevance, the Refresh delta, the decision
 * position and the register are all computed by `lib/living-evidence-engine.ts`, which
 * `run-gate-a-tests.ts` §3 asserts is the estate's only implementation of them.
 */

import {
  RefreshDelta,
  MethodsRegister,
  ScenarioAsAtMarker
} from '@/packages/contracts/src/living-evidence-contracts';
import type {
  AssessedObservation,
  ScenarioDecisionPosition
} from '@/lib/living-evidence-engine';

/** The Living Evidence a scenario publishes at its current as-at marker. */
export interface LivingEvidenceScenarioData {
  scenario_id: string;
  scenario_name: string;
  /** The ACTIVE scenario's own clock instant, resolved by the scenario clock. Never civil time. */
  scenario_clock: string;
  as_at: ScenarioAsAtMarker;
  observations: AssessedObservation[];
  decision_position: ScenarioDecisionPosition;
  /** What the next advance WOULD publish, without taking it. */
  next_refresh_preview: RefreshDelta;
}

/**
 * The lifecycle a reader watching the Refresh control sees.
 *
 * `unchanged` is a first-class success, not a degraded one: ADR-081 part 3 forbids manufacturing
 * movement to make the interface look alive, so an advance that moved nothing must be able to say
 * so in its own state rather than be dressed as a change.
 */
export type RefreshLifecycleState = 'idle' | 'refreshing' | 'refreshed' | 'unchanged' | 'failed';

export interface RefreshOperationResult {
  status: 'success' | 'failed';
  state: RefreshLifecycleState;
  delta: RefreshDelta | null;
  error?: string;
  hasChanged: boolean;
}

/**
 * Routes are served relative to the app on the browser and need an origin on the server.
 * `NEXT_PUBLIC_APP_ORIGIN` is only consulted where `window` is absent, so a browser always calls
 * its own origin and no client-side configuration can redirect the evidence path.
 */
function apiUrl(path: string): string {
  if (typeof window !== 'undefined') return path;
  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || 'http://localhost:3000';
  return `${origin}${path}`;
}

async function readGoverned<T>(response: Response, what: string): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok || !body || body.status !== 'success') {
    throw new Error(
      body?.message || body?.error || `${what} failed with HTTP ${response.status}`
    );
  }
  return body as T;
}

/**
 * The scenario's Living Evidence, as at its own marker.
 *
 * A scenario is NAMED, never defaulted (ADR-077 part 4) — the route refuses a request that names
 * none rather than answering about whichever scenario happened to be active, so this function
 * refuses to call it without one.
 */
export async function getLivingEvidence(scenarioId: string): Promise<LivingEvidenceScenarioData> {
  if (!scenarioId) throw new Error('A scenario must be named. Living Evidence has no default scenario.');
  const res = await fetch(apiUrl(`/api/v1/evidence?scenario_id=${encodeURIComponent(scenarioId)}`), {
    cache: 'no-store'
  });
  const body = await readGoverned<{
    scenario_id: string;
    scenario_name: string;
    as_at: ScenarioAsAtMarker;
    data: {
      observed: AssessedObservation[];
      decision_position: ScenarioDecisionPosition;
      next_refresh_preview: RefreshDelta;
    };
  }>(res, 'Living Evidence');

  return {
    scenario_id: body.scenario_id,
    scenario_name: body.scenario_name,
    scenario_clock: body.as_at.period_instant_iso,
    as_at: body.as_at,
    observations: body.data.observed,
    decision_position: body.data.decision_position,
    next_refresh_preview: body.data.next_refresh_preview
  };
}

/**
 * Advance the scenario's evidence one period and report what it changed.
 *
 * `POST`, because it CHANGES the as-at marker. There is no mode, no forced outcome and no
 * simulated latency: whether the state lands on `refreshed` or `unchanged` is read off the delta
 * the engine returns, and an advance that moved nothing reports `unchanged` honestly.
 */
export async function triggerScenarioRefresh(scenarioId: string): Promise<RefreshOperationResult> {
  if (!scenarioId) {
    return {
      status: 'failed',
      state: 'failed',
      delta: null,
      error: 'A scenario must be named. Refresh has no default scenario.',
      hasChanged: false
    };
  }
  try {
    const res = await fetch(apiUrl('/api/v1/evidence/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario_id: scenarioId })
    });
    const body = await readGoverned<{ data: RefreshDelta }>(res, 'Refresh');
    const delta = body.data;
    const hasChanged =
      delta.material_movements.length > 0
      || delta.decision_changes.some(c => c.changed !== 'NONE');
    return {
      status: 'success',
      state: hasChanged ? 'refreshed' : 'unchanged',
      delta,
      hasChanged
    };
  } catch (error: any) {
    return {
      status: 'failed',
      state: 'failed',
      delta: null,
      error: error?.message || 'Refresh failed',
      hasChanged: false
    };
  }
}

/** Return the scenario's evidence to its opening position, so the same advance repeats exactly. */
export async function restartScenarioEvidence(scenarioId: string): Promise<ScenarioAsAtMarker> {
  if (!scenarioId) throw new Error('A scenario must be named. Restart has no default scenario.');
  const res = await fetch(apiUrl('/api/v1/evidence/restart'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario_id: scenarioId })
  });
  const body = await readGoverned<{ data: { as_at: ScenarioAsAtMarker } }>(res, 'Restart');
  return body.data.as_at;
}

/** The Models & Methods register for the scenario, composed by the engine from what genuinely ran. */
export async function getMethodsRegister(scenarioId: string): Promise<MethodsRegister> {
  if (!scenarioId) throw new Error('A scenario must be named. The register has no default scenario.');
  const res = await fetch(apiUrl(`/api/v1/methods?scenario_id=${encodeURIComponent(scenarioId)}`), {
    cache: 'no-store'
  });
  const body = await readGoverned<{ data: MethodsRegister }>(res, 'Models & Methods');
  return body.data;
}
