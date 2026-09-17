/**
 * `SCI-03` — Curated Scenario Domain Packs
 * ───────────────────────────────────────────────────────────────────────────────
 * Three certified scenarios, one engine, and no branch in the estate that knows which
 * scenario it is running.
 *
 * What this suite is FOR, stated so a later packet does not blur it
 * -----------------------------------------------------------------
 * `run-canonical-scenario-tests.ts` holds the protected journey's own digits.
 * `run-sci02-certification-tests.ts` holds the gate's behaviour as a gate.
 * This suite holds the two things `SCI-03` is answerable for:
 *
 *   1. R-27 IS CLOSED. An engine answers with the scenario in scope, not with the reference
 *      instance, and the protected journey is unchanged by that having become true.
 *   2. THE CATALOGUE IS REAL. Three scenarios certify on all twelve dimensions, they differ
 *      in the decisions they produce, and every difference is DERIVED from a declared input
 *      rather than applied as a label afterwards.
 *
 * Section 4 is the one worth reading twice. A platform that can only ever answer "promote
 * differently" is a promotion planner; the premium bakery pack answers "do not promote", and
 * the assertions there are what stop that answer being a caption someone typed.
 */

import {
  CANONICAL_SCENARIO,
  CANONICAL_SCENARIO_ID,
  CanonicalScenario,
  CHILLED_SALMON_SCENARIO,
  CHILLED_SALMON_SCENARIO_ID,
  PREMIUM_BAKERY_SCENARIO,
  PREMIUM_BAKERY_SCENARIO_ID,
  CURATED_SCENARIO_PACKS,
  resolveScenario,
  listRegisteredScenarios,
  scenarioCatalogue,
  getActiveScenarioId,
  activateScenario,
  scenarioInScope,
  scenarioInScopeId,
  isScenarioBound,
  withScenarioInScope,
  scenarioDepthResponsePp,
  scenarioRealisedRevenuePerUnitGbp,
  scenarioWeeklyPopulationUnits,
  scenarioContributionPerUnitAtListGbp,
  scenarioExposedDemandUnits,
  scenarioFlexCapacityUnits,
  scenarioClockNowIso,
  calculateDerivedImpacts,
  cdi02BaseWeeklyUnits,
  createDefaultCampaignIntentDraft,
  wp10cRecoveryLeverHeadroom,
  DecisionScenarioParameters
} from '../../packages/contracts/src/index';
import '../../lib/scenario-runtime';
import { certifyScenario, certifyRegisteredScenarios } from '../../lib/scenario-certification';
import {
  deriveUnitEconomics,
  ddfGrossMarginRatePct,
  ddfFlexPremiumRatePct,
  ddfSlaFlexUnitsPerWeek
} from '../../lib/demand-decision-frontier/demand-frontier-engine';
import {
  scenarioElasticityCurve,
  elasticityCurveInScope,
  curvePoint,
  canonicalCurvePoint,
  assertRecommendationIsDerived,
  regionStoreCounts,
  CANONICAL_ELASTICITY_CURVE
} from '../../lib/campaign-archetypes';
import { evaluateCampaignDecision } from '../../lib/campaign-causal-engine';
import { clearCampaignIntents, registerCampaignIntent } from '../../lib/campaign-intent-store';
import { generateSyntheticSignalSnapshot } from '../../services/world/src/enterprise-signal-generator';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) { console.log(`[PASS] ${name}`); passed++; }
  else { console.error(`[FAIL] ${name} — ${detail ?? 'assertion failed'}`); failed++; }
}

function close(a: number, b: number, tolerancePct: number): boolean {
  const denom = Math.max(Math.abs(a), Math.abs(b), 1e-9);
  return (Math.abs(a - b) / denom) * 100 <= tolerancePct;
}

const PACKS: CanonicalScenario[] = [CHILLED_SALMON_SCENARIO, PREMIUM_BAKERY_SCENARIO];
const ALL: CanonicalScenario[] = [CANONICAL_SCENARIO, ...PACKS];

const paramsFor = (s: CanonicalScenario): DecisionScenarioParameters => ({
  promotion_lift: s.economics.promotion_depth_pct,
  supplier_capacity_cap: Math.round((s.supply.supplier_capacity_index - 1) * 100),
  forecast_horizon_days: s.calendar.forecast_horizon_days,
  promotion_method: '20_percent_off',
  campaign_scope: 'national',
  cannibalisation_factor: 0,
  event_boost: 'none'
});

function evaluateCommittedPromotion(session: string) {
  clearCampaignIntents();
  const scenario = scenarioInScope();
  const draft = createDefaultCampaignIntentDraft('tenant_uk_retail_01', session);
  draft.campaign_intent.intervention_posture = 'CONSIDER_PROMOTION';
  draft.campaign_intent.provisional_mechanic = '20_percent_off';
  draft.campaign_intent.provisional_discount_depth = scenario.economics.promotion_depth_pct;
  const campaign = registerCampaignIntent(draft);
  const result = evaluateCampaignDecision({
    tenant_id: campaign.tenant_id,
    session_id: campaign.session_id,
    campaign_intent_id: campaign.campaign_intent_id,
    include_signals: false
  });
  clearCampaignIntents();
  return result;
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 1. THE CATALOGUE IS REGISTERED, AND REGISTERED IS NOT ACTIVATED ===\n');

assert(
  CURATED_SCENARIO_PACKS.length === 2,
  '`SCI-03` adds exactly two curated packs beside the protected reference scenario',
  String(CURATED_SCENARIO_PACKS.length)
);
assert(
  !CURATED_SCENARIO_PACKS.some(p => p.identity.scenario_id === CANONICAL_SCENARIO_ID),
  'The reference scenario is not re-registered by the pack catalogue — one identity, one registration site'
);
for (const pack of PACKS) {
  assert(
    resolveScenario(pack.identity.scenario_id) === pack,
    `${pack.identity.scenario_id} resolves through the registry to its own record`
  );
}
assert(
  listRegisteredScenarios().length === 3,
  'Three scenarios are registered',
  listRegisteredScenarios().map(s => s.identity.scenario_id).join(', ')
);

/*
 * ADR-080: registration makes a scenario KNOWN; activation makes it the one the estate runs,
 * and only certification opens that door. `SCI-03` publishes a catalogue and changes nothing
 * about what is running — choosing between them is `SCI-04`'s, behind the same gate.
 */
assert(
  getActiveScenarioId() === CANONICAL_SCENARIO_ID,
  'Registering the packs did NOT change what the estate is running',
  String(getActiveScenarioId())
);
const catalogue = scenarioCatalogue();
assert(
  catalogue.length === 3 && catalogue.filter(e => e.demo_active).length === 1,
  'The catalogue a selector renders carries three scenarios and exactly one demo-active',
  catalogue.map(e => `${e.scenario_id}${e.demo_active ? '*' : ''}`).join(', ')
);
assert(
  catalogue.every(e => !!e.decision_question.trim() && !!e.taxonomy.archetype_id && !!e.scenario_clock_iso),
  'Every catalogue entry carries the question, the archetype and its own clock — enough for `SCI-04` to render a choice'
);
assert(
  new Set(catalogue.map(e => e.scenario_clock_iso)).size === 3,
  'Each scenario carries its OWN clock — three scenarios, three Todays (ADR-078)',
  catalogue.map(e => e.scenario_clock_iso.slice(0, 10)).join(', ')
);

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 2. R-27 IS CLOSED: AN ENGINE ANSWERS WITH THE SCENARIO IN SCOPE ===\n');

/*
 * The finding `SCI-02` recorded: `deriveUnitEconomics()` returned the reference scenario's
 * realised price whatever was being certified, `CDI02_BASE_WEEKLY_UNITS` was its weekly
 * population, and the elasticity curve was its curve. Each of those is now a function of the
 * scenario in scope, and the assertions below are the evidence rather than the claim.
 */
for (const pack of PACKS) {
  withScenarioInScope(pack, () => {
    const id = pack.identity.scenario_id;
    assert(
      deriveUnitEconomics(null).revenue_per_unit_gbp === scenarioRealisedRevenuePerUnitGbp(pack),
      `${id}: the demand engine's unit revenue basis is THIS scenario's realised price`,
      `${deriveUnitEconomics(null).revenue_per_unit_gbp} vs ${scenarioRealisedRevenuePerUnitGbp(pack)}`
    );
    assert(
      ddfGrossMarginRatePct() === pack.economics.gross_margin_rate_pct
        && ddfFlexPremiumRatePct() === pack.supply.flex_premium_rate_pct,
      `${id}: the demand engine's declared rates are THIS scenario's rates`
    );
    assert(
      close(ddfSlaFlexUnitsPerWeek(), scenarioWeeklyPopulationUnits(pack) * (pack.supply.supplier_flex_rate_pct / 100), 0.0001),
      `${id}: the flex allowance is a share of THIS scenario's own population`
    );
    assert(
      cdi02BaseWeeklyUnits() === scenarioWeeklyPopulationUnits(pack),
      `${id}: the campaign timeline works on THIS scenario's own week`,
      `${cdi02BaseWeeklyUnits()} vs ${scenarioWeeklyPopulationUnits(pack)}`
    );
    assert(
      close(calculateDerivedImpacts(paramsFor(pack), []).supplier_capacity_units,
        scenarioWeeklyPopulationUnits(pack) * pack.supply.supplier_capacity_index, 0.5),
      `${id}: shared decision state derives capacity from THIS scenario's population and index`
    );
    assert(
      wp10cRecoveryLeverHeadroom().SLA_FLEX_RULE_4
        === Math.round(scenarioWeeklyPopulationUnits(pack) * (pack.supply.supplier_flex_rate_pct / 100)),
      `${id}: the recovery-lever mirror is derived from THIS scenario, so it cannot drift from the engine`
    );
    const draft = createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_sci03_open');
    assert(
      draft.decision_context.scenario_id === id
        && draft.campaign_intent.sku_scope.includes(pack.identity.sku_id)
        && draft.decision_context.scenario_family === pack.taxonomy.family_id,
      `${id}: a new decision opens on THIS scenario's identity, SKU and family`,
      `${draft.decision_context.scenario_id} / ${draft.campaign_intent.sku_scope.join(',')} / ${draft.decision_context.scenario_family}`
    );
    assert(
      curvePoint(pack.economics.promotion_depth_pct).expected_demand_uplift_pct
        === scenarioDepthResponsePp(pack, pack.economics.promotion_depth_pct),
      `${id}: the planning curve plots THIS scenario's declared depth response`
    );
    const bridge = evaluateCommittedPromotion('sess_sci03_causal').counterfactual.demand_bridge;
    assert(
      close(bridge?.price_depth_response_pp ?? NaN, scenarioDepthResponsePp(pack, pack.economics.promotion_depth_pct), 0.5),
      `${id}: the causal engine's price-depth response IS the declared response`,
      `${bridge?.price_depth_response_pp} vs ${scenarioDepthResponsePp(pack, pack.economics.promotion_depth_pct)}`
    );
  });
}

/*
 * And the other half, which matters just as much: outside a binding, an engine answers with
 * the DEMO-ACTIVE scenario. The binding is a scope, not a global assignment.
 */
assert(
  !isScenarioBound() && scenarioInScopeId() === CANONICAL_SCENARIO_ID,
  'Outside a binding the scenario in scope is the demo-active one — engine + active certified scenario'
);
assert(
  deriveUnitEconomics(null).revenue_per_unit_gbp === scenarioRealisedRevenuePerUnitGbp(CANONICAL_SCENARIO),
  'Outside a binding the demand engine answers with the demo-active scenario'
);

// The binding restores on the way out of a throw, or a failed scenario would poison every run after it.
let threw = false;
try {
  withScenarioInScope(PREMIUM_BAKERY_SCENARIO, () => { throw new Error('probe'); });
} catch { threw = true; }
assert(
  threw && scenarioInScopeId() === CANONICAL_SCENARIO_ID,
  'A binding is released even when the computation inside it throws'
);

// Re-entrant: a nested binding restores its PARENT, not the registry.
withScenarioInScope(CHILLED_SALMON_SCENARIO, () => {
  withScenarioInScope(PREMIUM_BAKERY_SCENARIO, () => {
    assert(scenarioInScopeId() === PREMIUM_BAKERY_SCENARIO_ID, 'A nested binding takes effect');
  });
  assert(
    scenarioInScopeId() === CHILLED_SALMON_SCENARIO_ID,
    'A nested binding restores its parent, not the registry'
  );
});

// Synchronous by contract, and enforced rather than documented.
let refusedAsync = false;
try {
  withScenarioInScope(CHILLED_SALMON_SCENARIO, (() => Promise.resolve(1)) as unknown as () => number);
} catch { refusedAsync = true; }
assert(
  refusedAsync,
  'A callback returning a thenable is REFUSED — the binding cannot leak across an await'
);

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 3. ALL THREE CERTIFY, ON ALL TWELVE DIMENSIONS ===============\n');

const results = certifyRegisteredScenarios();
assert(results.length === 3, 'Certification runs over the whole catalogue', String(results.length));

for (const result of results) {
  assert(
    result.state === 'CERTIFIED',
    `${result.scenario_id} is CERTIFIED`,
    `${result.state}: ${result.failed_dimensions.join(', ')}`
  );
  assert(
    result.dimensions.length === 12 && result.dimensions.every(d => d.verdict === 'PASS'),
    `${result.scenario_id}: every one of the twelve dimensions PASSES — nothing carried by a declared non-applicability`,
    result.dimensions.filter(d => d.verdict !== 'PASS').map(d => `${d.dimension}=${d.verdict}`).join(', ')
  );
  assert(
    result.assertion_count >= 60,
    `${result.scenario_id} is certified on a substantial body of executed checks`,
    String(result.assertion_count)
  );
  assert(
    result.evaluated_at_scenario_clock
      === scenarioClockNowIso(resolveScenario(result.scenario_id)),
    `${result.scenario_id}: the result is stamped on ITS OWN scenario clock`,
    result.evaluated_at_scenario_clock
  );
}

/*
 * The same invariant set ran for all three. One framework, many scenarios — which is the
 * property that makes a fourth pack a data exercise rather than an engineering one.
 */
assert(
  new Set(results.map(r => r.assertion_count)).size === 1,
  'The same invariant set ran for every scenario — the framework is generalised, not copied',
  results.map(r => `${r.scenario_id}=${r.assertion_count}`).join(', ')
);

for (const pack of PACKS) {
  assert(
    JSON.stringify(certifyScenario(pack)) === JSON.stringify(certifyScenario(pack)),
    `${pack.identity.scenario_id}: certification is deterministic — two runs are byte-identical`
  );
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 4. THE SCENARIOS PRODUCE DIFFERENT DECISIONS, BY ARITHMETIC ===\n');

const curves = new Map(ALL.map(s => [s.identity.scenario_id, scenarioElasticityCurve(s)]));
const recommendedOf = (id: string) => curves.get(id)!.find(p => p.is_cognix_recommended)!;

for (const scenario of ALL) {
  const verdict = assertRecommendationIsDerived(scenario);
  assert(
    verdict.ok,
    `${scenario.identity.scenario_id}: the recommended depth is DERIVED from contribution, never marked on a tier`,
    verdict.violations.join('; ')
  );
}

/*
 * THE assertion this packet exists to make possible.
 *
 * One engine, three declared records, three different answers — and every one of them falls
 * out of the arithmetic rather than being written on the record:
 *
 *   Fresh Dairy     committed 20% destroys contribution; 14% is better        → promote shallower
 *   Chilled Salmon  the committed depth is already the best tier on its curve → the depth is not the problem
 *   Premium Bakery  every plotted depth destroys contribution                 → DO NOT PROMOTE
 */
assert(
  recommendedOf(CANONICAL_SCENARIO_ID).discount_pct === 14
    && recommendedOf(CANONICAL_SCENARIO_ID).discount_pct !== CANONICAL_SCENARIO.economics.promotion_depth_pct,
  'Fresh Dairy: the curve recommends a SHALLOWER depth than the committed plan',
  `${recommendedOf(CANONICAL_SCENARIO_ID).discount_pct}% vs committed ${CANONICAL_SCENARIO.economics.promotion_depth_pct}%`
);
assert(
  recommendedOf(CHILLED_SALMON_SCENARIO_ID).discount_pct === CHILLED_SALMON_SCENARIO.economics.promotion_depth_pct,
  'Chilled Salmon: the committed depth IS the best tier on its own curve — depth is not this decision',
  `${recommendedOf(CHILLED_SALMON_SCENARIO_ID).discount_pct}% vs committed ${CHILLED_SALMON_SCENARIO.economics.promotion_depth_pct}%`
);
assert(
  recommendedOf(PREMIUM_BAKERY_SCENARIO_ID).discount_pct === 0
    && curves.get(PREMIUM_BAKERY_SCENARIO_ID)!
      .filter(p => p.discount_pct > 0)
      .every(p => p.net_contribution_delta_gbp < 0),
  'Premium Bakery: EVERY plotted depth destroys contribution, so the derived answer is do not promote',
  curves.get(PREMIUM_BAKERY_SCENARIO_ID)!.map(p => `${p.discount_pct}%=${p.net_contribution_delta_gbp}`).join(', ')
);

/*
 * And the difference is traceable to DECLARED INPUTS, not to a scenario's name. Supplier
 * funding is the single term that decides whether depth pays for itself, and the three packs
 * declare 35%, 60% and 10% of the price investment.
 */
assert(
  CANONICAL_SCENARIO.economics.supplier_promotional_funding_pct === 35
    && CHILLED_SALMON_SCENARIO.economics.supplier_promotional_funding_pct === 60
    && PREMIUM_BAKERY_SCENARIO.economics.supplier_promotional_funding_pct === 10,
  'The three packs declare materially different supplier funding — the term the answer turns on'
);
assert(
  new Set(ALL.map(s => s.economics.promotional_response_pp_per_depth_point)).size === 3
    && new Set(ALL.map(s => s.taxonomy.family_id)).size === 3
    && new Set(ALL.map(s => s.taxonomy.archetype_id)).size === 3,
  'Each pack declares its own elasticity, world family and commercial archetype'
);

/*
 * Differentiation is DECLARED, never hashed (ADR-079). The bakery pack is the proof in both
 * directions: it declares two anomalies with their reasons, and both are NEGATIVE — a curve
 * that reduces the response where the price position is damaged, which no hash would produce
 * and which no label could justify.
 */
const bakeryAnomalies = PREMIUM_BAKERY_SCENARIO.differentiation.depth_response_anomalies;
assert(
  bakeryAnomalies.length === 2
    && bakeryAnomalies.every(a => a.uplift_bonus_pp < 0 && !!a.reason.trim()),
  'Premium Bakery declares NEGATIVE depth-response anomalies, each carrying its stated reason'
);
assert(
  scenarioDepthResponsePp(PREMIUM_BAKERY_SCENARIO, 30)
    < scenarioDepthResponsePp(PREMIUM_BAKERY_SCENARIO, 20),
  'The declared quality-signal damage COMPOUNDS — a third off buys less volume than a fifth off',
  `30%=${scenarioDepthResponsePp(PREMIUM_BAKERY_SCENARIO, 30)}pp vs 20%=${scenarioDepthResponsePp(PREMIUM_BAKERY_SCENARIO, 20)}pp`
);
assert(
  ALL.every(s => Object.keys(s.differentiation.scope_response_multipliers).length
    === Object.keys(s.differentiation.scope_response_reasons).length),
  'No pack declares a scope multiplier without a stated reason'
);

/*
 * Supply is the salmon pack's binding constraint and margin is the bakery's. Both are
 * consequences of declared allocation and flex, published as units rather than asserted.
 */
const salmonExposed = scenarioExposedDemandUnits(CHILLED_SALMON_SCENARIO);
const salmonFlex = scenarioFlexCapacityUnits(CHILLED_SALMON_SCENARIO);
assert(
  salmonExposed > 0 && salmonFlex > 0 && salmonFlex < salmonExposed,
  'Chilled Salmon: the flex clause closes part of the gap and leaves a stated residual',
  `${Math.round(salmonFlex)} of ${Math.round(salmonExposed)} exposed`
);
assert(
  scenarioExposedDemandUnits(CHILLED_SALMON_SCENARIO) / (CHILLED_SALMON_SCENARIO.demand.base_demand_units_per_week * 2)
    > scenarioExposedDemandUnits(PREMIUM_BAKERY_SCENARIO) / PREMIUM_BAKERY_SCENARIO.demand.base_demand_units_per_week,
  'Chilled Salmon carries a materially larger supply gap, as a share of its own base, than Premium Bakery'
);

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 5. EACH PACK HAS ITS OWN SIGNAL TIMELINE, ON ITS OWN CLOCK ====\n');

for (const scenario of ALL) {
  const id = scenario.identity.scenario_id;
  const first = generateSyntheticSignalSnapshot(scenario, 'tenant_uk_retail_01');
  const second = generateSyntheticSignalSnapshot(scenario, 'tenant_uk_retail_01');
  assert(first.length > 1, `${id}: publishes a signal timeline`, `${first.length} signals`);
  assert(
    JSON.stringify(first) === JSON.stringify(second),
    `${id}: two consecutive reads are byte-identical, timestamps included`
  );
  assert(
    first.every(s => s.scenario_id === id),
    `${id}: every observation carries this scenario's identity`
  );
  assert(
    first.every(s => Date.parse(s.observed_at) <= Date.parse(scenarioClockNowIso(scenario)))
      && first.every(s => s.provenance?.scenario_clock === scenarioClockNowIso(scenario)),
    `${id}: every observation is stamped at or before THIS scenario's own clock`
  );
  const supplierSignals = first.filter(s => s.entity_type === 'SUPPLIER');
  assert(
    supplierSignals.length > 0 && supplierSignals.every(s => s.entity_id === scenario.supply.supplier_name),
    `${id}: the supplier named in the signals is the supplier named in the economics (R-20)`,
    supplierSignals.map(s => s.entity_id).join(', ')
  );
}

const types = (s: CanonicalScenario) =>
  new Set(generateSyntheticSignalSnapshot(s, 'tenant_uk_retail_01').map(x => x.signal_type));
assert(
  types(CHILLED_SALMON_SCENARIO).has('SUPPLIER_LEAD_TIME_DRIFT')
    && types(PREMIUM_BAKERY_SCENARIO).has('PERISHABLE_AGEING_PRESSURE')
    && types(CANONICAL_SCENARIO).has('SEARCH_VELOCITY_ACCELERATION'),
  'Each family publishes a domain-coherent timeline — lead-time drift, ageing pressure, search velocity'
);

/*
 * The values are DERIVED, not seeded. The `supplier_breach` branch carried three literals
 * until `SCI-03` ran it for a real pack: a lead time that doubled, a 0.5-to-4.5-hour
 * replenishment delay and a stockout probability of 68%, none belonging to any scenario.
 */
const salmonSignals = generateSyntheticSignalSnapshot(CHILLED_SALMON_SCENARIO, 'tenant_uk_retail_01');
const leadDrift = salmonSignals.find(s => s.signal_type === 'SUPPLIER_LEAD_TIME_DRIFT')!;
assert(
  leadDrift.baseline_value === CHILLED_SALMON_SCENARIO.calendar.supplier_lead_time_days * 24,
  'Chilled Salmon: the lead-time signal opens on THIS scenario\'s contracted lead time',
  String(leadDrift.baseline_value)
);
assert(
  close(
    leadDrift.observed_value,
    leadDrift.baseline_value
      * ((1 + CHILLED_SALMON_SCENARIO.demand.total_demand_movement_pct / 100)
        / CHILLED_SALMON_SCENARIO.supply.supplier_capacity_index),
    0.5
  ),
  'Chilled Salmon: the drift is derived from the declared allocation shortfall, not asserted as a doubling',
  `${leadDrift.observed_value} hours`
);
const bakerySignals = generateSyntheticSignalSnapshot(PREMIUM_BAKERY_SCENARIO, 'tenant_uk_retail_01');
const compression = bakerySignals.find(s => s.signal_type === 'MARGIN_COMPRESSION')!;
assert(
  close(compression.baseline_value, scenarioContributionPerUnitAtListGbp(PREMIUM_BAKERY_SCENARIO), 1)
    && compression.observed_value < compression.baseline_value,
  'Premium Bakery: the margin-compression signal opens on contribution at list and falls at the committed depth',
  `${compression.baseline_value} → ${compression.observed_value}`
);

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 6. THE PROTECTED JOURNEY IS UNCHANGED =========================\n');

/*
 * `SCI-03` parameterised the engines the protected journey runs on. Every published figure
 * below is the one the sync delta records, resolved through the layer-C path.
 */
assert(
  getActiveScenarioId() === CANONICAL_SCENARIO_ID,
  'The reference scenario is still the one the estate runs'
);
const canonicalBridge = evaluateCommittedPromotion('sess_sci03_protected').counterfactual.demand_bridge;
assert(
  canonicalBridge?.price_depth_response_pp === 44.16,
  'Fresh Dairy at 20%: the price-depth response is still +44.16pp',
  String(canonicalBridge?.price_depth_response_pp)
);
assert(
  canonicalCurvePoint(20).net_contribution_delta_gbp === -5167,
  'Fresh Dairy at 20%: the committed plan still destroys £5,167 of contribution',
  String(canonicalCurvePoint(20).net_contribution_delta_gbp)
);
assert(
  canonicalCurvePoint(14).net_contribution_delta_gbp === 32976
    && canonicalCurvePoint(14).expected_demand_uplift_pct === 33.65,
  'Fresh Dairy at 14%: still +33.65% demand and +£32,976 of contribution',
  `${canonicalCurvePoint(14).expected_demand_uplift_pct} / ${canonicalCurvePoint(14).net_contribution_delta_gbp}`
);
assert(
  calculateDerivedImpacts(paramsFor(CANONICAL_SCENARIO), []).financial_exposure_gbp === 47093,
  'Fresh Dairy: the published exposure is still £47,093',
  String(calculateDerivedImpacts(paramsFor(CANONICAL_SCENARIO), []).financial_exposure_gbp)
);
assert(
  JSON.stringify(elasticityCurveInScope()) === JSON.stringify(CANONICAL_ELASTICITY_CURVE),
  'With the reference scenario active, the in-scope curve IS the reference curve'
);
assert(
  regionStoreCounts().National === CANONICAL_SCENARIO.estate.national_store_count,
  'The estate a surface reads is the active scenario\'s own'
);

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 7. NO ENGINE KNOWS WHICH SCENARIO IT IS RUNNING ===============\n');

/*
 * R-27's acceptance condition, stated as a source guard rather than a promise: the result had
 * to be *engine + active certified scenario*, never *if scenario A … if scenario B*.
 *
 * Two properties are checked. No engine names a curated pack, and no engine branches on a
 * scenario identity. The pack modules and the registry are excluded by name — a record is
 * allowed to know its own identity; an engine is not.
 */
function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === 'node_modules' || entry === 'dist' || entry === '.next') continue;
    if (statSync(full).isDirectory()) sourceFiles(full, acc);
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) acc.push(full);
  }
  return acc;
}

const ENGINE_DIRS = [join(ROOT, 'lib'), join(ROOT, 'packages', 'contracts', 'src'), join(ROOT, 'services', 'world', 'src'), join(ROOT, 'app'), join(ROOT, 'components')];
const EXCLUDED = ['scenario-packs', 'scenario-registry.ts', 'canonical-scenario-model.ts'];
const engineFiles = ENGINE_DIRS
  .flatMap(d => sourceFiles(d))
  .filter(f => !EXCLUDED.some(x => f.includes(x)));

/*
 * Comments are stripped before both checks. The property is about CODE: a governance comment that
 * explains WHY something was retired is expected to name the scenarios that forced the decision,
 * and forbidding that would push the reasoning out of the file it belongs in.
 */
const codeOf = (f: string) =>
  readFileSync(f, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const namesPack = engineFiles.filter(f =>
  /CHILLED_SALMON_SCENARIO|PREMIUM_BAKERY_SCENARIO|SCN-CHILLED-SALMON|SCN-BAKERY-SOURDOUGH/.test(codeOf(f))
);
assert(
  namesPack.length === 0,
  'No engine, route or surface names a curated pack — a pack is data, never a branch',
  namesPack.map(f => f.replace(ROOT + '/', '')).join(', ')
);

// And nothing outside the pack directory imports a pack module directly.
const importsPack = engineFiles.filter(f =>
  /from\s+['"`][^'"`]*scenario-packs\/(chilled-salmon-import|premium-bakery-artisan)['"`]/.test(codeOf(f))
);
assert(
  importsPack.length === 0,
  'No engine imports a pack module — packs reach the estate through the registry alone',
  importsPack.map(f => f.replace(ROOT + '/', '')).join(', ')
);

const branchesOnIdentity = engineFiles.filter(f => {
  const code = codeOf(f);
  // A comparison of a scenario identity against a string literal is the shape R-27 forbids.
  return /(scenario_id|scenarioId)\s*===\s*['"`]SCN-/.test(code)
    || /['"`]SCN-[A-Z0-9-]+['"`]\s*===\s*\w*[Ss]cenario/.test(code);
});
assert(
  branchesOnIdentity.length === 0,
  'No engine branches on a scenario identity — engine + active certified scenario, not if A / if B',
  branchesOnIdentity.map(f => f.replace(ROOT + '/', '')).join(', ')
);

/*
 * And the layer that used to hold the coupling now holds a function per quantity. A module
 * constant evaluated at import is exactly how a surface came to be pinned to one scenario, so
 * the ones R-27 named must not come back as constants.
 */
const revived = engineFiles.filter(f =>
  /export const (DDF_GROSS_MARGIN_RATE_PCT|DDF_FLEX_PREMIUM_RATE_PCT|DDF_SLA_FLEX_UNITS_PER_WEEK|CDI02_BASE_WEEKLY_UNITS|WP10C_RECOVERY_LEVER_HEADROOM|REGION_STORE_COUNTS)\b/
    .test(readFileSync(f, 'utf8'))
);
assert(
  revived.length === 0,
  'The quantities R-27 named are functions of the scenario in scope, never module constants again',
  revived.map(f => f.replace(ROOT + '/', '')).join(', ')
);

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 8. ACTIVATION STILL RUNS THROUGH THE GATE =====================\n');

/*
 * A catalogue does not weaken the gate. Each pack can be activated because it is CERTIFIED,
 * and the estate is returned to the reference scenario afterwards because `SCI-03` does not
 * change what is running — `SCI-04` owns choosing.
 */
for (const pack of PACKS) {
  let activated = false;
  try {
    activateScenario(pack.identity.scenario_id);
    activated = getActiveScenarioId() === pack.identity.scenario_id;
  } catch (e: any) {
    activated = false;
    console.error(`        ${e?.message}`);
  }
  assert(activated, `${pack.identity.scenario_id} can be activated because it passes the gate`);
}
activateScenario(CANONICAL_SCENARIO_ID);
assert(
  getActiveScenarioId() === CANONICAL_SCENARIO_ID,
  'The estate is returned to the reference scenario — `SCI-03` publishes a catalogue, it does not choose'
);

let refused = false;
try {
  activateScenario('SCN-NOT-A-SCENARIO');
} catch { refused = true; }
assert(refused, 'An unregistered identity is still refused rather than defaulted (ADR-077 part 4)');

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=================================================================');
console.log(`Passed: ${passed}   Failed: ${failed}`);
console.log('=================================================================\n');
process.exit(failed === 0 ? 0 : 1);
