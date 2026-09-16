/**
 * A SECOND scenario, instantiated from the same model as the canonical one.
 *
 * Its purpose is to let the suites that assert scenario DIFFERENTIATION keep asserting it
 * now that the estate resolves scenarios through the registry instead of accepting any
 * string. Before `SCI-01` those suites passed `'SCN-BREACH-02'` — an identity from the
 * retired world seed that nothing registered and nothing could reconcile.
 *
 * It is also the first demonstration that `CanonicalScenario` is a MODEL rather than a
 * constant (ADR-073 Amendment A): this record declares a different family, supplier,
 * category and scale, and every derivation resolves for it without a line of engine code
 * knowing it exists.
 *
 * It is a TEST FIXTURE and is not a curated scenario. Curated packs are `SCI-03`'s, and a
 * scenario reaching a demonstration must pass the certification gate `SCI-02` owns.
 */

import {
  CanonicalScenario,
  CANONICAL_SCENARIO,
  registerScenario,
  MODELLED_SCENARIO_PROVENANCE
} from '../../../packages/contracts/src/index';

export const SECOND_SCENARIO_ID = 'SCN-TEST-SUPPLY-BREACH-001';

export const SECOND_SCENARIO: CanonicalScenario = {
  ...CANONICAL_SCENARIO,
  identity: {
    ...CANONICAL_SCENARIO.identity,
    scenario_id: SECOND_SCENARIO_ID,
    scenario_name: 'Chilled Ready Meals — supplier lead-time breach under an SLA threshold',
    decision_question:
      'The primary supplier is running at twice its contracted lead time. Do we hold, re-source or accept the service hit?',
    category: 'Chilled',
    subcategory: 'Ready Meals',
    sku_id: 'P012',
    sku_name: 'Chilled Ready Meal',
    focus_region: 'Midlands'
  },
  taxonomy: {
    family_id: 'supplier_breach',
    archetype_id: 'ARCH-SUPPLY-CONSTRAINED',
    family_rationale:
      'The binding constraint is the supplier meeting its contracted lead time, not the price of the line.'
  },
  supply: {
    ...CANONICAL_SCENARIO.supply,
    supplier_id: 'SUP009',
    supplier_name: 'Greencore Ready Meals'
  },
  demand: {
    ...CANONICAL_SCENARIO.demand,
    // A different scale, to prove the arithmetic spine rescales from one number.
    base_demand_units_per_week: 120_000
  },
  provenance: {
    ...CANONICAL_SCENARIO.provenance,
    statement:
      'A test fixture scenario. Every value is modelled for testing and no figure represents the '
      + 'operating data of any named retailer.',
    descriptor: MODELLED_SCENARIO_PROVENANCE
  }
};

/** Register the fixture so identity resolution can find it. Idempotent. */
export function registerSecondScenario(): CanonicalScenario {
  registerScenario(SECOND_SCENARIO);
  return SECOND_SCENARIO;
}
