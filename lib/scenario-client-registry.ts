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
