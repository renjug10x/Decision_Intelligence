/**
 * CogniX Scenario Registry & Activation (ADR-077)
 * ───────────────────────────────────────────────────────────────────────────────
 * The one place a scenario identity is resolved, and the one place a scenario becomes
 * demo-active.
 *
 * The contradiction this closes
 * -----------------------------
 * The Observability & Governance signals panel issued `GET /api/v1/signals` with no
 * scenario parameter. The route read `family_id` and `scenario_id` with literal
 * fallbacks — `promotion_surge` and `SCN-PROMO-01` — and a governance surface published
 * `SUPPLIER_CAPACITY_PRESSURE` against **FreshDirect UK**, a supplier the connected
 * journey had already replaced with Cheshire Cheese Co because a flex notice has to be
 * served on whoever makes the product. The generator was half-migrated: it already named
 * Fresh Dairy and P004 correctly, which is exactly why the defect survived review.
 *
 * Fixing the literal alone would have left the shape of the defect in place. ADR-077
 * part 4 is what closes it structurally:
 *
 *   > No surface resolves a scenario by default. A missing scenario is an ERROR.
 *
 * Declared activation is not defaulting
 * -------------------------------------
 * The registry holds exactly one demo-active scenario, and it is DECLARED once, here, in
 * the catalogue. That is a governed statement about which scenario the estate is running.
 * What ADR-077 part 4 forbids is a request that names no scenario silently acquiring one
 * at the edge — a per-route `|| 'SCN-PROMO-01'`, which is how the estate came to publish
 * two suppliers for one decision. A caller that needs the active scenario asks for it by
 * name through `getActiveScenarioId()`; a caller that supplies a scenario gets that one
 * or an error. Neither path guesses.
 *
 * Certification is `SCI-02`'s, not this module's
 * ----------------------------------------------
 * ADR-080 rules that no scenario becomes demo-active until it is certified. That gate,
 * its twelve dimensions and its verdicts belong to `SCI-02`. This module declares the
 * ACTIVATION seam the gate installs itself into — `setScenarioActivationPolicy` — and
 * nothing else about certification. The default policy admits any registered scenario,
 * which is the honest state of the estate until the gate exists.
 */

import { CanonicalScenario, CANONICAL_SCENARIO } from './canonical-scenario-model';
import { ScenarioFamilyId } from './enterprise-world-model';
import { ProvenanceDescriptor } from './provenance-vocabulary';

/** Raised whenever a scenario identity cannot be resolved. Never swallowed into a default. */
export class ScenarioResolutionError extends Error {
  readonly requested: string | null | undefined;
  constructor(message: string, requested?: string | null) {
    super(message);
    this.name = 'ScenarioResolutionError';
    this.requested = requested;
  }
}

/**
 * The catalogue shape. A projection of the scenario record — never a second model of it.
 *
 * `SCI-04` builds selection against this shape, frozen at Gate A. Everything a selector
 * needs to render a choice is here; everything else is read from the record itself.
 */
export interface ScenarioRegistryEntry {
  scenario_id: string;
  scenario_name: string;
  decision_question: string;
  category: string;
  subcategory: string;
  sku_id: string;
  sku_name: string;
  market_scope_label: string;
  focus_region: string;
  supplier_id: string;
  supplier_name: string;
  /** The world family and commercial archetype this scenario projects onto. Taxonomy only. */
  taxonomy: {
    family_id: ScenarioFamilyId;
    archetype_id: string;
    family_rationale: string;
  };
  /** The scenario's own Today. Never the wall clock. */
  scenario_clock_iso: string;
  horizon_days: number;
  /** Whether this scenario is the one the estate is currently running. */
  demo_active: boolean;
  provenance: {
    basis: string;
    synthetic_demo: boolean;
    statement: string;
    descriptor: ProvenanceDescriptor;
  };
}

/**
 * Whether a scenario may be activated.
 *
 * `SCI-02` replaces the default with the Scenario Certification Gate, at which point an
 * uncertified scenario cannot be activated at all. Declared as a seam so the gate is
 * installed in one place rather than threaded through every activation call site.
 */
export type ScenarioActivationPolicy = (scenario: CanonicalScenario) => {
  admitted: boolean;
  reason: string;
};

const DEFAULT_ACTIVATION_POLICY: ScenarioActivationPolicy = () => ({
  admitted: true,
  reason: 'No certification gate is installed. SCI-02 owns ADR-080 and replaces this policy.'
});

let activationPolicy: ScenarioActivationPolicy = DEFAULT_ACTIVATION_POLICY;

/** Install the activation policy. `SCI-02`'s certification gate is its intended caller. */
export function setScenarioActivationPolicy(policy: ScenarioActivationPolicy): void {
  activationPolicy = policy;
}

/** Restore the default policy. Test-support only. */
export function resetScenarioActivationPolicy(): void {
  activationPolicy = DEFAULT_ACTIVATION_POLICY;
}

// ── The catalogue ─────────────────────────────────────────────────────────────

const registry = new Map<string, CanonicalScenario>();
let activeScenarioId: string | null = null;

/** Register a scenario. Re-registering the same identity replaces its record. */
export function registerScenario(scenario: CanonicalScenario): void {
  const id = scenario?.identity?.scenario_id;
  if (!id || !id.trim()) {
    throw new ScenarioResolutionError('A scenario must carry a non-empty scenario_id to be registered.');
  }
  registry.set(id, scenario);
}

/**
 * Declare which registered scenario the estate is running.
 *
 * Refuses an unregistered identity, and refuses one the activation policy does not admit.
 * There is no override flag and no provisional state (ADR-080 §2).
 */
export function activateScenario(scenarioId: string): CanonicalScenario {
  const scenario = registry.get(scenarioId);
  if (!scenario) {
    throw new ScenarioResolutionError(
      `Scenario "${scenarioId}" is not registered and cannot be activated.`,
      scenarioId
    );
  }
  const verdict = activationPolicy(scenario);
  if (!verdict.admitted) {
    throw new ScenarioResolutionError(
      `Scenario "${scenarioId}" may not be activated: ${verdict.reason}`,
      scenarioId
    );
  }
  activeScenarioId = scenarioId;
  return scenario;
}

/** Every registered scenario, in registration order. */
export function listRegisteredScenarios(): CanonicalScenario[] {
  return [...registry.values()];
}

/** Whether an identity is registered. Does not resolve it. */
export function isScenarioRegistered(scenarioId: string): boolean {
  return registry.has(scenarioId);
}

/**
 * Resolve a scenario BY NAME.
 *
 * ADR-077 part 4 in one function: an absent or unknown identity raises rather than
 * resolving to whatever happens to be first in the catalogue.
 */
export function resolveScenario(scenarioId: string | null | undefined): CanonicalScenario {
  if (!scenarioId || !scenarioId.trim()) {
    throw new ScenarioResolutionError(
      'No scenario_id was supplied. A missing scenario is an error, never a default (ADR-077 part 4).',
      scenarioId
    );
  }
  const scenario = registry.get(scenarioId);
  if (!scenario) {
    throw new ScenarioResolutionError(
      `Scenario "${scenarioId}" is not registered. Registered: ${[...registry.keys()].join(', ') || 'none'}.`,
      scenarioId
    );
  }
  return scenario;
}

/** The identity of the scenario the estate is running, or `null` if none is declared active. */
export function getActiveScenarioId(): string | null {
  return activeScenarioId;
}

/** The scenario the estate is running. Raises if nothing has been declared active. */
export function getActiveScenario(): CanonicalScenario {
  if (!activeScenarioId) {
    throw new ScenarioResolutionError('No scenario is demo-active. Activate one before resolving it.');
  }
  return resolveScenario(activeScenarioId);
}

/**
 * Resolve the scenario a REQUEST is about.
 *
 * The helper every route uses in place of `searchParams.get('scenario_id') || '<literal>'`.
 * A request that names a scenario gets that one; a request that names none is an error
 * naming the parameter it is missing, which is what stops the `SCN-PROMO-01` contradiction
 * returning through a route nobody was looking at.
 */
export function requireScenarioId(
  scenarioId: string | null | undefined,
  requestContext: string
): CanonicalScenario {
  if (!scenarioId || !scenarioId.trim()) {
    throw new ScenarioResolutionError(
      `${requestContext} requires an explicit scenario_id. A missing scenario is an error, `
      + 'never a default (ADR-077 part 4).',
      scenarioId
    );
  }
  return resolveScenario(scenarioId);
}

// ── Catalogue projection ──────────────────────────────────────────────────────

export function toScenarioRegistryEntry(scenario: CanonicalScenario): ScenarioRegistryEntry {
  return {
    scenario_id: scenario.identity.scenario_id,
    scenario_name: scenario.identity.scenario_name,
    decision_question: scenario.identity.decision_question,
    category: scenario.identity.category,
    subcategory: scenario.identity.subcategory,
    sku_id: scenario.identity.sku_id,
    sku_name: scenario.identity.sku_name,
    market_scope_label: scenario.identity.market_scope_label,
    focus_region: scenario.identity.focus_region,
    supplier_id: scenario.supply.supplier_id,
    supplier_name: scenario.supply.supplier_name,
    taxonomy: {
      family_id: scenario.taxonomy.family_id,
      archetype_id: scenario.taxonomy.archetype_id,
      family_rationale: scenario.taxonomy.family_rationale
    },
    scenario_clock_iso: `${scenario.calendar.observed_history_end_date}T00:00:00.000Z`,
    horizon_days: scenario.calendar.forecast_horizon_days,
    demo_active: scenario.identity.scenario_id === activeScenarioId,
    provenance: {
      basis: scenario.provenance.basis,
      synthetic_demo: scenario.provenance.synthetic_demo,
      statement: scenario.provenance.statement,
      descriptor: scenario.provenance.descriptor
    }
  };
}

/** The catalogue a selector renders. */
export function scenarioCatalogue(): ScenarioRegistryEntry[] {
  return listRegisteredScenarios().map(toScenarioRegistryEntry);
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

/*
 * The protected reference scenario is registered and declared demo-active at module load.
 * At `SCI-01` it is the only registered scenario; `SCI-03` adds curated packs and `SCI-04`
 * adds the surface that chooses between them. Declaring it here, once, is what lets every
 * route refuse to guess.
 */
registerScenario(CANONICAL_SCENARIO);
activateScenario(CANONICAL_SCENARIO.identity.scenario_id);

/** Return the registry to its opening position. Test-support only. */
export function resetScenarioRegistry(): void {
  registry.clear();
  activeScenarioId = null;
  resetScenarioActivationPolicy();
  registerScenario(CANONICAL_SCENARIO);
  activateScenario(CANONICAL_SCENARIO.identity.scenario_id);
}
