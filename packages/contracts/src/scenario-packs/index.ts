/**
 * CogniX Curated Scenario Packs — the catalogue (`SCI-03`)
 * ───────────────────────────────────────────────────────────────────────────────
 * Registration, and registration only.
 *
 * Registered is not activated
 * ---------------------------
 * A registered scenario is one the estate KNOWS ABOUT and can resolve by name. An activated
 * scenario is the one the estate is RUNNING. ADR-080 gates the second on certification, and
 * this module performs neither the certification nor the activation: the gate lives in
 * `lib/scenario-certification.ts` and is installed by `lib/scenario-runtime.ts`, so a pack
 * registered here still has to pass twelve dimensions before any surface can run it.
 *
 * That separation is what makes a catalogue safe to publish. `scenarioCatalogue()` can list
 * three scenarios for `SCI-04` to build a selector against, while `activateScenario()` remains
 * the single place a scenario has to earn its way past the gate.
 *
 * Why registration happens at module load
 * ---------------------------------------
 * The same reason the registry bootstraps the reference scenario at module load: a catalogue
 * assembled lazily by whoever happens to import first is a catalogue whose contents depend on
 * import order. Declaring it once, here, is what lets every route refuse to guess (ADR-077
 * part 4) while still having something to resolve.
 */

import { CanonicalScenario } from '../canonical-scenario-model';
import { registerScenario, resetScenarioRegistry } from '../scenario-registry';
import { CHILLED_SALMON_SCENARIO, CHILLED_SALMON_SCENARIO_ID } from './chilled-salmon-import';
import { PREMIUM_BAKERY_SCENARIO, PREMIUM_BAKERY_SCENARIO_ID } from './premium-bakery-artisan';

export { CHILLED_SALMON_SCENARIO, CHILLED_SALMON_SCENARIO_ID } from './chilled-salmon-import';
export { PREMIUM_BAKERY_SCENARIO, PREMIUM_BAKERY_SCENARIO_ID } from './premium-bakery-artisan';

/**
 * The curated packs `SCI-03` adds beside the protected reference scenario.
 *
 * The reference scenario is NOT in this list. It is registered by the registry's own bootstrap
 * and is the one the estate runs until `SCI-04` gives a reader a way to choose; listing it here
 * as well would give one scenario two registration sites, which is the shape of defect ADR-077
 * exists to prevent.
 */
export const CURATED_SCENARIO_PACKS: readonly CanonicalScenario[] = [
  CHILLED_SALMON_SCENARIO,
  PREMIUM_BAKERY_SCENARIO
];

export const CURATED_SCENARIO_PACK_IDS: readonly string[] = [
  CHILLED_SALMON_SCENARIO_ID,
  PREMIUM_BAKERY_SCENARIO_ID
];

/** Register every curated pack. Idempotent — re-registering an identity replaces its record. */
export function registerCuratedScenarioPacks(): void {
  for (const pack of CURATED_SCENARIO_PACKS) registerScenario(pack);
}

/**
 * Return the registry to its opening position WITH the curated catalogue restored.
 *
 * `resetScenarioRegistry` is `SCI-01`'s and restores the reference scenario alone, which was
 * the whole catalogue when it was written. Test support that wants the `SCI-03` estate back
 * calls this instead of reaching past it — the frozen contract is not edited to know about a
 * later packet's data (ADR-084 part 1).
 */
export function resetCuratedScenarioRegistry(): void {
  resetScenarioRegistry();
  registerCuratedScenarioPacks();
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
registerCuratedScenarioPacks();
