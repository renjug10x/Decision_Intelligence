/**
 * CogniX Scenario Client Registry — the browser-side scenario entry point
 * ───────────────────────────────────────────────────────────────────────────────
 * THE module a client surface imports to resolve a scenario, and the counterpart to
 * `lib/scenario-runtime.ts` on the server.
 *
 * Why this module exists — a Wave-1 convergence finding
 * ----------------------------------------------------
 * The scenario registry is populated by module load, and `SCI-03` registers the curated
 * packs from `packages/contracts/src/scenario-packs`. Every SERVER path reaches that module,
 * because routes import the contracts barrel, which re-exports it.
 *
 * No CLIENT path reached it. `SCI-04`'s surfaces import `scenario-registry` directly — which
 * is correct, and which at `SCI-04`'s own head resolved every scenario there was, because
 * there was one. Converged with `SCI-03`, the browser held a one-scenario registry while the
 * server held three: `isScenarioRegistered('SCN-CHILLED-SALMON-002')` answered false in the
 * browser, so `ScenarioContextStrip` fell through to `getActiveScenario()` and kept rendering
 * the reference scenario's identity, SKU, supplier and horizon after a switch. Stale identity
 * on every surface that reads the strip, from two changes that are individually correct.
 *
 * Neither lane could have found it: `SCI-03` registered packs nothing client-side consumed,
 * and `SCI-04` resolved a catalogue that had nothing else in it. It is a convergence defect in
 * the exact sense ADR-084 part 4 gates for, and the fix belongs here rather than in either
 * packet's files.
 *
 * What it does
 * ------------
 * Importing it registers the curated catalogue in THIS process — the browser's — and re-exports
 * the resolution helpers a client surface needs. Registration is idempotent and is still
 * declared in exactly one place (`scenario-packs`); this module imports that declaration, it
 * does not restate it.
 *
 * Registered is still not activated. This module grants no activation and installs no policy.
 * ADR-080 gates activation on certification, the gate is installed server-side by
 * `lib/scenario-runtime.ts`, and `POST /api/v1/scenarios` remains the single place a scenario
 * earns its way past it. A client surface resolves what the server has already admitted.
 */

// Imported for its registration side effect: this is what puts the curated packs in the
// browser's registry. `SCI-03` owns the declaration; this module owns reaching it from a client.
import '@/packages/contracts/src/scenario-packs';

import {
  getActiveScenarioId,
  isScenarioRegistered,
  activateScenario,
  registerScenario
} from '@/packages/contracts/src/scenario-registry';
import type { CanonicalScenario } from '@/packages/contracts/src/canonical-scenario-model';

export {
  getActiveScenario,
  getActiveScenarioId,
  resolveScenario,
  isScenarioRegistered,
  scenarioCatalogue,
  activateScenario,
  ScenarioResolutionError,
  type ScenarioRegistryEntry
} from '@/packages/contracts/src/scenario-registry';

/**
 * Mirror the SERVER's active scenario into this browser's registry.
 *
 * Wave-1 convergence (R-33). The client registry bootstraps on the reference scenario and is only
 * changed by an explicit `activateScenario`. `SCI-04` called it once, at the moment of selection,
 * inside a swallowing `catch` — so a page LOAD, a refresh, or any selection whose mirror threw left
 * the browser resolving the reference scenario while the server ran another.
 *
 * That split is not cosmetic. Every client-side engine resolves through `scenarioInScope()`, which
 * falls back to this registry's active scenario, so Promotion published the reference scenario's
 * curve — "a 20% cut lifts demand 44.16% … £33.0K at 14%" — under a bakery identity whose own
 * derived answer is 0%, do not promote; and Campaign Decision opened on "Cheddar Mature 400g ·
 * National, 14 days" under the same strip. Three scenarios reduced to label variations, which is
 * exactly what `SCI-03`'s cross-surface invariant forbids.
 *
 * The server is the authority and this is a mirror of a decision it has ALREADY gated: only a
 * certified scenario can be activated (ADR-080), and the id passed here comes from the estate's own
 * Shared Decision State. Mirroring grants nothing the server did not already grant.
 *
 * It returns whether the browser now agrees with the server, rather than throwing or failing
 * silently: a caller that needs to know can ask, and a disagreement is reported rather than
 * rendered.
 */
export function syncActiveScenario(scenarioId: string | undefined | null): boolean {
  if (!scenarioId) return false;
  if (getActiveScenarioId() === scenarioId) return true;
  if (!isScenarioRegistered(scenarioId)) {
    console.warn(
      `[scenario-client-registry] The server is running ${scenarioId}, which this browser's registry `
      + 'does not know. Surfaces would resolve a different scenario, so the mismatch is reported '
      + 'rather than hidden.'
    );
    return false;
  }
  try {
    activateScenario(scenarioId);
    return true;
  } catch (error: any) {
    console.warn(`[scenario-client-registry] Could not mirror ${scenarioId} locally: ${error?.message}`);
    return false;
  }
}

/**
 * Project a scenario the SERVER holds into this browser's registry (`SCI-07R`, ADR-085 part 3).
 *
 * This registry is seeded from the compiled packs, so a scenario authored and certified on the server
 * never existed here: after selecting one, `syncActiveScenario` refused to mirror it and every client
 * engine kept computing the previous scenario — in every `COGNIX_WORLD_MODE`, including `local`.
 *
 * The browser registry is a READ PROJECTION of the server's authority, and this is the only way an
 * authored record enters it:
 *   - it is fetched from `GET /api/v1/scenarios/record`, which serves a record only if it is
 *     registered, certified and visible to this tenant;
 *   - the identity served must be the identity asked for, or nothing is registered;
 *   - a record this browser already holds is never replaced — compiled packs cannot be shadowed.
 *
 * It grants nothing: activation is still the server's, through the gate. Returns whether this browser
 * now holds the scenario; a failure is reported, never guessed around.
 */
export async function projectScenarioFromServer(
  scenarioId: string | undefined | null,
  tenantId: string = 'tenant_uk_retail_01'
): Promise<boolean> {
  if (!scenarioId) return false;
  if (isScenarioRegistered(scenarioId)) return true;
  try {
    const query = new URLSearchParams({ scenario_id: scenarioId, tenant_id: tenantId });
    const response = await fetch(`/api/v1/scenarios/record?${query.toString()}`, {
      headers: { Accept: 'application/json', 'X-Tenant-ID': tenantId },
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => null);
    const record = payload?.data as CanonicalScenario | undefined;
    if (!response.ok || payload?.status !== 'success' || payload?.certification_state !== 'CERTIFIED'
      || record?.identity?.scenario_id !== scenarioId) {
      console.warn(
        `[scenario-client-registry] The server did not publish a certified record for ${scenarioId}; `
        + 'it is not projected into this browser.'
      );
      return false;
    }
    if (!isScenarioRegistered(scenarioId)) registerScenario(record);
    return true;
  } catch (error: any) {
    console.warn(`[scenario-client-registry] Could not project ${scenarioId}: ${error?.message}`);
    return false;
  }
}
