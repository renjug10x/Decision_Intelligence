/**
 * Wave-0 convergence / Gate-A closure assertions.
 * Run via: npx tsx tests/unit/run-gate-a-tests.ts
 *
 * These are not packet tests. `SCI-01` and `SCI-02` each carry their own, and both are green
 * on their own branches. What this suite asserts is the part of Gate A that belongs to the
 * CONVERGENCE rather than to either packet: that the contracts frozen here are the ones
 * governance names, that the Wave-2 contracts declared here are declarations and stay
 * declarations, and that every one of them has exactly one owner.
 *
 * Condition 9 is the reason this file exists. §0 of the work-packet record requires a
 * contract a Wave-N parallel partner must consume to be declared and frozen at the Wave N-1
 * gate. `SCI-06` consumes three contracts `SCI-05` owns, and the two run concurrently in
 * Wave 2 — so if the declaration drifts into implementation, or if a second module starts
 * defining the same shapes, the mechanism that keeps those lanes apart has failed silently.
 * A silent failure of that mechanism is what ADR-084 exists to prevent.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  CANONICAL_SCENARIO,
  CANONICAL_SCENARIO_ID,
  CERTIFICATION_DIMENSION_IDS,
  validateCertificationResult,
  getActiveScenarioId,
  scenarioDepthResponsePp,
  scenarioRealisedRevenuePerUnitGbp,
  scenarioExposedDemandUnits,
  scenarioWeeklyPopulationUnits,
  type SignalMateriality,
  type DecisionRelevance,
  type RefreshDelta,
  type MethodsRegister,
  type ScenarioAsAtMarker,
  type MaterialQuantityMovement
} from '../../packages/contracts/src/index';
import { certifyScenario } from '../../lib/scenario-certification';
import { CANONICAL_ELASTICITY_CURVE } from '../../lib/campaign-archetypes';

const ROOT = join(__dirname, '..', '..');
let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) { console.log(`[PASS] ${name}`); passed++; }
  else { console.error(`[FAIL] ${name} — ${detail ?? 'assertion failed'}`); failed++; }
}

const stripComments = (code: string) =>
  code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const DECLARATION = 'packages/contracts/src/living-evidence-contracts.ts';

console.log('\n=== 1. THE WAVE-2 DECLARATION IS A DECLARATION =====================\n');

{
  const raw = readFileSync(join(ROOT, DECLARATION), 'utf8');
  const code = stripComments(raw);

  /*
   * The distinction this suite exists to hold: DECLARED is not IMPLEMENTED. A declaration
   * that acquires a function has quietly become `SCI-05`'s implementation living in the
   * wrong wave, and `SCI-06` would then be building against something that can change under
   * it without a convergence event.
   */
  assert(!/\bfunction\b/.test(code), 'The declaration defines no function');
  assert(!/=>/.test(code.replace(/^export type .*=>.*$/gm, '')), 'The declaration contains no arrow implementation');
  assert(!/\breturn\b/.test(code), 'The declaration returns nothing — it computes nothing');
  assert(!/\bclass\b/.test(code), 'The declaration defines no class');
  assert(
    !/export const /.test(code),
    'The declaration exports no value — a value is data, and data is implementation'
  );

  // It must still be substantive enough to build against.
  const exportedTypes = (code.match(/export (?:interface|type) (\w+)/g) || []).map(m => m.split(' ').pop()!);
  assert(
    exportedTypes.length >= 12,
    'The declaration is substantive enough for SCI-06 to build against',
    `${exportedTypes.length} exported types`
  );

  // All three governed contracts are present by name.
  for (const [contract, required] of [
    ['Signal Materiality & Decision Relevance', ['SignalMateriality', 'DecisionRelevance', 'MaterialityBand', 'MaterialQuantityMovement']],
    ['Refresh Operation', ['RefreshDelta', 'ScenarioAsAtMarker', 'RefreshScenarioOperation', 'RestartScenarioOperation']],
    ['Models & Methods', ['MethodsRegister', 'MethodRegisterEntry', 'MethodMechanism']]
  ] as [string, string[]][]) {
    const missing = required.filter(t => !exportedTypes.includes(t));
    assert(missing.length === 0, `Contract declared: ${contract}`, `missing ${missing.join(', ')}`);
  }

  // Ownership is stated in the artefact itself, not only in the register.
  assert(
    /OWNER: `SCI-05`/.test(raw) && /DECLARED at Gate A/.test(raw) && /IMPLEMENTED in Wave 2/.test(raw),
    'The declaration states its owner and that it is declared, not implemented'
  );

  /*
   * ADR-072 and ADR-081 part 5: no third confidence score beside the `confidence` and
   * `quality` ESF-1 already carries. Materiality is a BAND over a fully published movement,
   * not a number competing with those two.
   */
  assert(
    !/materiality_score|relevance_score|confidence_score/.test(code),
    'No third confidence or materiality score is introduced (ADR-072, ADR-081 part 5)'
  );

  // ADR-067: nothing that would put provider internals on a client surface.
  assert(
    !/\b(prompt|token|temperature|model_name|api_key)\b/i.test(code),
    'The Models & Methods shape carries no prompt, token, temperature or provider identifier (ADR-067)'
  );
}

console.log('\n=== 2. CONTRACT OWNERSHIP IS SINGULAR ==============================\n');

{
  /*
   * ADR-084 part 1: exactly one owning packet per contract, and no packet may alter one it
   * does not own. The structural expression of that is that exactly one module DEFINES each
   * contract type; everything else imports it.
   */
  const contractFiles: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (/\.tsx?$/.test(entry.name)) contractFiles.push(rel);
    }
  };
  walk('packages/contracts/src');
  walk('lib');
  walk('services');
  walk('app');

  const OWNED_TYPES = [
    'SignalMateriality', 'DecisionRelevance', 'MaterialityBand', 'MaterialQuantityMovement',
    'MaterialQuantityId', 'RefreshDelta', 'RefreshedObservation', 'ScenarioAsAtMarker',
    'MethodsRegister', 'MethodRegisterEntry'
  ];

  for (const type of OWNED_TYPES) {
    const definers = contractFiles.filter(rel => {
      const code = stripComments(readFileSync(join(ROOT, rel), 'utf8'));
      return new RegExp(`export (?:interface|type) ${type}\\b`).test(code);
    });
    assert(
      definers.length === 1 && definers[0] === DECLARATION,
      `Exactly one module defines ${type}, and it is the SCI-05 declaration`,
      definers.join(', ') || 'none'
    );
  }

  // And the SCI-01 / SCI-02 contracts likewise have one definer each.
  for (const [type, owner] of [
    ['CanonicalScenario', 'packages/contracts/src/canonical-scenario-model.ts'],
    ['ScenarioRegistryEntry', 'packages/contracts/src/scenario-registry.ts'],
    ['ProvenanceDescriptor', 'packages/contracts/src/provenance-vocabulary.ts'],
    ['ScenarioCertificationResult', 'packages/contracts/src/scenario-certification-model.ts']
  ] as [string, string][]) {
    const definers = contractFiles.filter(rel => {
      const code = stripComments(readFileSync(join(ROOT, rel), 'utf8'));
      return new RegExp(`export (?:interface|type) ${type}\\b`).test(code);
    });
    assert(
      definers.length === 1 && definers[0] === owner,
      `Exactly one module defines ${type}, and it is its owning packet's`,
      definers.join(', ') || 'none'
    );
  }

  /*
   * A declaration nothing can reach is not a contract. It must be exported from the barrel
   * `SCI-06` will import from.
   */
  const barrel = readFileSync(join(ROOT, 'packages/contracts/src/index.ts'), 'utf8');
  assert(
    barrel.includes("export * from './living-evidence-contracts'"),
    'The declaration is reachable through the contracts barrel'
  );
}

console.log('\n=== 3. NO WAVE-2 IMPLEMENTATION HAS BEEN SMUGGLED IN ===============\n');

{
  /*
   * Gate A closes Wave 0. Anything that computes materiality, decision relevance or a Refresh
   * delta belongs to `SCI-05` in Wave 2, and its presence here would mean Wave 1 was being
   * cut from a state that already contained work nobody had reviewed as a packet.
   */
  const engineDirs: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (/\.tsx?$/.test(entry.name) && rel !== DECLARATION) engineDirs.push(rel);
    }
  };
  walk('lib');
  walk('services');
  walk('app');
  walk('components');

  const implementers = engineDirs.filter(rel => {
    const code = stripComments(readFileSync(join(ROOT, rel), 'utf8'));
    return /function\s+(deriveMateriality|deriveDecisionRelevance|refreshScenario|buildMethodsRegister)/.test(code);
  });
  assert(
    implementers.length === 0,
    'No module implements materiality, decision relevance, Refresh or the register',
    implementers.join(', ')
  );
}

console.log('\n=== 4. THE CONVERGED STATE STILL CERTIFIES ========================\n');

{
  // Not a reuse of SCI-02's claim — the gate is re-run here, from the convergence state.
  const result = certifyScenario(CANONICAL_SCENARIO);
  assert(
    validateCertificationResult(result).valid,
    'The certification result is admissible from the convergence state',
    validateCertificationResult(result).errors.join('; ')
  );
  assert(
    result.state === 'CERTIFIED',
    'SCN-FRESH-DAIRY-CHEDDAR-001 is CERTIFIED from the convergence state',
    `${result.state}: ${result.failed_dimensions.join(', ')}`
  );
  assert(
    result.dimensions.length === CERTIFICATION_DIMENSION_IDS.length
      && result.dimensions.every(d => d.verdict === 'PASS'),
    'All twelve dimensions pass, none resting on a declared non-applicability'
  );
  assert(
    getActiveScenarioId() === CANONICAL_SCENARIO_ID,
    'The demo-active scenario is the certified reference scenario'
  );
}

console.log('\n=== 5. THE AUTHORITATIVE ECONOMICS ARE UNMOVED =====================\n');

{
  /*
   * The values Gate A is required to verify, pinned here so the convergence state cannot
   * drift from them. `skuContextFactor` produced 46.8% and +£8.1K at 20% depth; ADR-079
   * retired it and these are what the record's declared terms produce.
   */
  const at20 = CANONICAL_ELASTICITY_CURVE.find(p => p.discount_pct === 20)!;
  const at14 = CANONICAL_ELASTICITY_CURVE.find(p => p.discount_pct === 14)!;

  assert(at20.expected_demand_uplift_pct === 44.16, 'Promotion at 20% depth: +44.16% demand', String(at20.expected_demand_uplift_pct));
  assert(at20.net_contribution_delta_gbp === -5167, 'Promotion at 20% depth: −£5,167 contribution', String(at20.net_contribution_delta_gbp));
  assert(at14.expected_demand_uplift_pct === 33.65, 'Promotion at 14% depth: +33.65% demand', String(at14.expected_demand_uplift_pct));
  assert(at14.net_contribution_delta_gbp === 32976, 'Promotion at 14% depth: +£32,976 contribution', String(at14.net_contribution_delta_gbp));

  // And they are what the RECORD produces, not a restated literal.
  assert(
    scenarioDepthResponsePp(CANONICAL_SCENARIO, 20) === 44.16
      && scenarioDepthResponsePp(CANONICAL_SCENARIO, 14) === 33.65,
    'The curve is the scenario record\'s own declared depth response, not a literal beside it'
  );
  assert(
    Object.keys(CANONICAL_SCENARIO.differentiation.scope_response_multipliers).length === 0,
    'No hash-derived or unexplained scope multiplier has returned'
  );

  // Protected Demand-side values.
  assert(scenarioRealisedRevenuePerUnitGbp(CANONICAL_SCENARIO) === 2.07, 'Realised revenue per unit is £2.07');
  assert(Math.round(scenarioExposedDemandUnits(CANONICAL_SCENARIO)) === 130130, 'Exposed demand is unchanged at the declared scale');
  assert(scenarioWeeklyPopulationUnits(CANONICAL_SCENARIO) === 350000, 'The weekly population is unchanged');
  assert(
    CANONICAL_SCENARIO.supply.supplier_id === 'SUP002'
      && CANONICAL_SCENARIO.supply.supplier_name === 'Cheshire Cheese Co',
    'The governed supplier is unchanged'
  );
}

console.log('\n=== 6. THE DECLARED SHAPES ARE USABLE BY A CONSUMER ================\n');

{
  /*
   * A type-level smoke test. It compiles, therefore `SCI-06` can construct and render these
   * shapes without inventing anything — which is the whole purpose of declaring them a wave
   * early. Nothing here is an implementation: these are literals a consumer could hold.
   */
  const movement: MaterialQuantityMovement = {
    quantity: 'EXPOSED_DEMAND_UNITS',
    display_label: 'Units exposed',
    before: 130130,
    after: 46130,
    delta: -84000,
    delta_pct: -64.55,
    unit: 'units'
  };
  const materiality: SignalMateriality = {
    signal_id: 'sig_ps_004',
    scenario_id: CANONICAL_SCENARIO_ID,
    assessed_at_period: 'Today',
    movements: [movement],
    band: 'DECISIVE',
    rationale: 'The flex notice closes 84,000 units of the exposure.',
    provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
  };
  const relevance: DecisionRelevance = {
    signal_id: 'sig_ps_004',
    scenario_id: CANONICAL_SCENARIO_ID,
    assessed_at_period: 'Today',
    changed: 'RECOMMENDATION',
    before_statement: 'Hold',
    after_statement: 'Serve the volume flex notice',
    statement: 'The recommendation changed because servable volume changed.',
    provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
  };
  const marker: ScenarioAsAtMarker = {
    scenario_id: CANONICAL_SCENARIO_ID,
    period: 'Today',
    period_instant_iso: '2026-06-03T00:00:00.000Z',
    opening_period: 'Today'
  };
  const delta: RefreshDelta = {
    scenario_id: CANONICAL_SCENARIO_ID,
    from: marker,
    to: { ...marker, period: 'T+1', period_instant_iso: '2026-06-04T00:00:00.000Z' },
    observations: [{
      signal_id: 'sig_ps_004',
      change: 'MOVED',
      age_scenario_days: 1,
      materiality,
      decision_relevance: relevance
    }],
    material_movements: [movement],
    decision_changes: [relevance],
    decision_consequence_statement: 'The recommendation changed.',
    provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
  };
  const register: MethodsRegister = {
    scenario_id: CANONICAL_SCENARIO_ID,
    entries: [{
      method_id: 'HOLT_WINTERS_ADDITIVE',
      display_name: 'Holt-Winters additive',
      mechanism: 'statistical',
      purpose: 'Project demand over the horizon.',
      inputs: ['observed daily units'],
      output: 'daily projection with interval',
      implementation_ref: 'lib/forecast/adapters/holt-winters.ts',
      last_run_scenario_iso: '2026-06-03T00:00:00.000Z',
      applies_to_scenario_ids: [CANONICAL_SCENARIO_ID],
      measured_error: { metric: 'MAPE', value: 4.2, unit: 'percent' },
      limitations: ['Models no promotional uplift of its own.']
    }],
    undescribed: [],
    provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
  };

  assert(materiality.band === 'DECISIVE', 'A materiality record is constructible by a consumer');
  assert(relevance.changed === 'RECOMMENDATION', 'A decision-relevance record is constructible by a consumer');
  assert(delta.decision_changes.length === 1, 'A Refresh delta is constructible by a consumer');
  assert(register.entries[0].mechanism === 'statistical', 'A Models & Methods register is constructible by a consumer');
  assert(
    delta.from.period === 'Today' && delta.to.period === 'T+1',
    'A Refresh advances the as-at marker along the scenario clock'
  );
  assert(
    register.entries.every(e => e.last_run_scenario_iso === null || e.last_run_scenario_iso.endsWith('Z')),
    'The register stamps last-run on the scenario clock, or declares it unmeasured'
  );
}

console.log(`\n=================================================================`);
console.log(`Passed: ${passed}   Failed: ${failed}`);
console.log(`=================================================================\n`);
process.exit(failed === 0 ? 0 : 1);
