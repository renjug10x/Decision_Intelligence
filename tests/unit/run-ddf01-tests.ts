/**
 * Unit & Integration Test Suite for CogniX DDF-01 Demand Decision Frontier (P0)
 * Run via: npx tsx tests/unit/run-ddf01-tests.ts
 *
 * These assertions test BUSINESS INVARIANTS, not the shape of the implementation's formulas.
 * The rule applied throughout: an assertion must be capable of failing if the arithmetic stops
 * meaning what the surface claims it means. Re-stating a formula the engine already computed
 * (`gbp === units * rate`) proves nothing and is deliberately avoided.
 */

import {
  DecisionScenarioParameters,
  DecisionDerivedImpacts,
  ContextualisedDecisionOutlook,
  EnterpriseSignal,
  calculateDerivedImpacts
} from '../../packages/contracts/src/index';

import {
  evaluateForecastStability,
  evaluateDemandFrontier,
  evaluateDecisionGap,
  evaluateDecisionWindow,
  evaluateDecisionRegret,
  evaluateInterventionRecommendation,
  evaluateDemandDecisionFrontier,
  deriveScenarioNowIso,
  deriveUnitEconomics,
  deriveDemandBase
} from '../../lib/demand-decision-frontier/demand-frontier-engine';

import { evaluateIntentFusion } from '../../lib/intent-fusion/intent-fusion-engine';
import { projectDemand, isDemandRefusal } from '../../lib/demand-forecast';
import {
  getDecisionState,
  transitionDecisionState,
  resetDecisionState
} from '../../lib/decision-state-store';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, errorDetail?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName} - ${errorDetail || 'Assertion failed'}`);
    failed++;
  }
}

/** Recursively assert no NaN/Infinity has leaked into any numeric field. */
function allNumbersFinite(node: any, path = '$'): string | null {
  if (typeof node === 'number') {
    return Number.isFinite(node) ? null : path;
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const bad = allNumbersFinite(node[i], `${path}[${i}]`);
      if (bad) return bad;
    }
    return null;
  }
  if (node && typeof node === 'object') {
    for (const key of Object.keys(node)) {
      const bad = allNumbersFinite(node[key], `${path}.${key}`);
      if (bad) return bad;
    }
  }
  return null;
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const baseScenarioParams: DecisionScenarioParameters = {
  promotion_lift: 20,
  supplier_capacity_cap: 10,
  forecast_horizon_days: 14,
  promotion_method: '20_percent_off',
  campaign_scope: 'national',
  cannibalisation_factor: 0,
  event_boost: 'none'
};

const baseDerivedImpacts = calculateDerivedImpacts(baseScenarioParams, []);

function signal(
  id: string, type: string, deltaPct: number, confidence = 85
): EnterpriseSignal {
  return {
    signal_id: id,
    signal_type: type as any,
    category: 'DEMAND',
    tenant_id: 'tenant_uk_retail_01',
    entity_type: 'CATEGORY',
    entity_id: 'Chilled',
    observed_at: '2026-08-14T00:00:00.000Z',
    effective_at: '2026-08-14T00:00:00.000Z',
    baseline_value: 100,
    observed_value: 100 + deltaPct,
    delta: deltaPct,
    delta_pct: deltaPct,
    unit: 'percent',
    source_type: 'SYNTHETIC_WORLD',
    source_system: 'cognix_synthetic_world',
    confidence,
    quality: 90,
    provenance: { generator: 'enterprise_world_seed' },
    synthetic_demo: true,
    schema_version: '1.0'
  } as EnterpriseSignal;
}

const divergingSignals = [
  signal('sig_ps_001', 'FORECAST_DIVERGENCE', 18),
  signal('sig_ps_002', 'ORDER_VELOCITY_ACCELERATION', 14),
  signal('sig_ps_003', 'SEARCH_VELOCITY_ACCELERATION', 22)
];
const alignedSignals = [
  signal('sig_al_001', 'FORECAST_DIVERGENCE', 1),
  signal('sig_al_002', 'ORDER_VELOCITY_ACCELERATION', -1),
  signal('sig_al_003', 'CATEGORY_DEMAND_ACCELERATION', 0.5)
];
const contractingSignals = [
  signal('sig_dn_001', 'FORECAST_DIVERGENCE', -16),
  signal('sig_dn_002', 'ORDER_VELOCITY_ACCELERATION', -12),
  signal('sig_dn_003', 'CATEGORY_DEMAND_ACCELERATION', -20)
];

/** Flat 100,000 units/day, so the demand base is exactly 1,400,000 over the horizon. */
const RUN_RATE_PER_DAY = 100_000;
const flatHistory = Array.from({ length: 14 }, (_, i) => ({
  date: `2026-08-${String(i + 1).padStart(2, '0')}`,
  value: RUN_RATE_PER_DAY
}));
/** Flat 120,000 units/day = 1,680,000 over the horizon: a +20% contextualised outlook. */
const flatForecast = Array.from({ length: 14 }, (_, i) => ({
  date: `2026-08-${String(i + 15).padStart(2, '0')}`,
  value: RUN_RATE_PER_DAY * 1.2
}));

const outlook: ContextualisedDecisionOutlook = evaluateIntentFusion({
  tenant_id: 'tenant_uk_retail_01',
  session_id: 'sess_ddf_tests',
  baseline_forecast_lift_pct: 12
});

const econ = deriveUnitEconomics(2.5);

function buildChain(
  params: DecisionScenarioParameters,
  impacts: DecisionDerivedImpacts,
  signals: EnterpriseSignal[],
  history = flatHistory,
  forecast = flatForecast
) {
  const stability = evaluateForecastStability(params, signals, outlook);
  const frontier = evaluateDemandFrontier(history, forecast, params, impacts, outlook, stability);
  const gap = evaluateDecisionGap(params, impacts, frontier, econ);
  return { stability, frontier, gap };
}

async function runTests() {
  console.log('====================================================');
  console.log('COGNIX DDF-01 DEMAND DECISION FRONTIER UNIT TESTS');
  console.log('====================================================\n');

  resetDecisionState('tenant_uk_retail_01', 'sess_001');

  // ══════════════════════════════════════════════════════════════════════════
  // P0-A — Forecast Stability Intelligence
  // ══════════════════════════════════════════════════════════════════════════

  const stableCase = evaluateForecastStability(baseScenarioParams, alignedSignals, outlook);
  assert(
    stableCase.status === 'VALID' &&
    stableCase.stability_state === 'STABLE' &&
    stableCase.revision_risk === 'LOW' &&
    (stableCase.material_revision_probability_pct ?? 100) < 20 &&
    stableCase.likely_revision_direction === 'BALANCED',
    'S1: Signals aligned with baseline yield high stability, low revision risk, balanced direction'
  );

  const divergentCase = evaluateForecastStability(baseScenarioParams, divergingSignals, outlook);
  assert(
    divergentCase.stability_state !== 'STABLE' &&
    (divergentCase.stability_score ?? 100) < (stableCase.stability_score ?? 0) &&
    divergentCase.likely_revision_direction === 'UPWARD' &&
    divergentCase.expected_revision_pct > 0,
    'S2: Upward signal divergence lowers stability and points the expected revision upward'
  );

  const contractingCase = evaluateForecastStability(baseScenarioParams, contractingSignals, outlook);
  assert(
    contractingCase.likely_revision_direction === 'DOWNWARD' &&
    contractingCase.expected_revision_pct < 0 &&
    contractingCase.stability_state !== 'STABLE',
    'S3: Contracting demand signals produce a DOWNWARD revision — the outlook can fall, not only rise'
  );

  assert(
    contractingCase.likely_revision_magnitude_min_pct >= 0 &&
    contractingCase.likely_revision_magnitude_max_pct >= contractingCase.likely_revision_magnitude_min_pct,
    'S4: Revision magnitudes stay unsigned and ordered under negative divergence (direction carries the sign)'
  );

  // Scenario controls must not manufacture instability — stability is an evidence property.
  const stabilityHeavyScenario = evaluateForecastStability(
    { ...baseScenarioParams, promotion_lift: 50, event_boost: 'christmas', cannibalisation_factor: 20 },
    alignedSignals,
    outlook
  );
  assert(
    stabilityHeavyScenario.stability_score === stableCase.stability_score &&
    stabilityHeavyScenario.stability_state === 'STABLE',
    'S5: Scenario plan (promo/event/cannibalisation) does not degrade stability — ADR-040 evidence-only rule'
  );

  const noEvidence = evaluateForecastStability(baseScenarioParams, [], outlook);
  assert(
    noEvidence.status === 'INDETERMINATE' &&
    noEvidence.stability_score === null &&
    noEvidence.material_revision_probability_pct === null &&
    noEvidence.evidence_confidence_pct === null &&
    noEvidence.contributing_signal_refs.length === 0 &&
    !!noEvidence.indeterminate_reason &&
    noEvidence.expected_revision_pct === 0,
    'S6: With no signal evidence, stability is INDETERMINATE with a null score — never a fabricated default'
  );

  const supplyOnlySignals = [
    signal('sig_sup_01', 'SUPPLIER_LEAD_TIME_DRIFT', 800),
    signal('sig_sup_02', 'PROJECTED_STOCKOUT_RISK', 1260)
  ];
  const supplyOnly = evaluateForecastStability(baseScenarioParams, supplyOnlySignals, outlook);
  assert(
    supplyOnly.status === 'INDETERMINATE',
    'S7: Supply-side signals do not stand in for demand-divergence evidence (ADR-040 scoping)'
  );

  assert(
    divergentCase.contributing_signal_refs.every(ref => divergingSignals.some(s => s.signal_id === ref)) &&
    divergentCase.contributing_signal_refs.length === divergingSignals.length,
    'S8: Every contributing signal reference is a real EnterpriseSignal supplied to the engine (AC-DDF-07)'
  );

  assert(
    divergentCase.stability_score !== outlook.confidence &&
    divergentCase.confidence_distinction_statement.includes('Forecast Confidence') &&
    divergentCase.confidence_distinction_statement.includes('Forecast Stability'),
    'S9: Stability is not the IFI-01 confidence constant and the distinction is published (AC-DDF-05)'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // P0-B — Demand Frontier & Decision Gap
  // ══════════════════════════════════════════════════════════════════════════

  const chain = buildChain(baseScenarioParams, baseDerivedImpacts, divergingSignals);

  // The load-bearing invariant: percentage points and units share one denominator.
  assert(
    Math.abs(
      chain.gap.exposed_demand_pp - (chain.gap.exposed_demand_units / chain.gap.base_demand_units) * 100
    ) < 0.15,
    'G1: exposed_demand_pp equals exposed units over the demand base (AC-DDF-27 reconciliation)',
    `pp=${chain.gap.exposed_demand_pp}, units=${chain.gap.exposed_demand_units}, base=${chain.gap.base_demand_units}`
  );

  assert(
    Math.abs(
      chain.gap.exposed_demand_pp - (chain.gap.emerging_demand_pct - chain.gap.executable_demand_pct)
    ) < 0.15,
    'G2: The gap equals the frontier difference it is drawn from (AC-DDF-27)',
    `pp=${chain.gap.exposed_demand_pp}, emerging=${chain.gap.emerging_demand_pct}, executable=${chain.gap.executable_demand_pct}`
  );

  assert(
    Math.abs(chain.gap.exposed_demand_units - (chain.gap.emerging_demand_units - chain.gap.executable_demand_units)) <= 1,
    'G3: Exposed units equal emerging minus executable units exactly'
  );

  // Money must follow the units it claims to price, and be labelled for what it is.
  assert(
    chain.gap.revenue_at_risk_gbp > chain.gap.margin_at_risk_gbp &&
    chain.gap.margin_at_risk_gbp > 0 &&
    Math.abs(
      chain.gap.margin_at_risk_gbp / chain.gap.revenue_at_risk_gbp - chain.gap.unit_economics.margin_rate_pct / 100
    ) < 0.01,
    'G4: Revenue at risk and margin at risk are separate quantities in the declared margin ratio'
  );

  // A flat 1,000/day history over 14 days is a 14,000-unit base; a flat 1,200/day forecast is +20%.
  const flatBase = deriveDemandBase(baseScenarioParams, baseDerivedImpacts, flatHistory, 14);
  assert(
    flatBase.base_demand_units === RUN_RATE_PER_DAY * 14 &&
    Math.abs(chain.frontier.contextualised_outlook_pct - 20) < 0.2,
    'G5: The demand base is the observed run rate and the contextualised outlook is measured against it',
    `base=${flatBase.base_demand_units}, contextualised=${chain.frontier.contextualised_outlook_pct}`
  );

  // Executable capacity comes from Decision State and nowhere else.
  assert(
    Math.abs(chain.frontier.executable_frontier_pct - baseScenarioParams.supplier_capacity_cap) < 0.2,
    'G6: The executable frontier reflects the Shared Decision State allocation cap read-only (AC-DDF-13)',
    `executable=${chain.frontier.executable_frontier_pct}, cap=${baseScenarioParams.supplier_capacity_cap}`
  );

  // Runtime truth — each scenario control must move the gap.
  const higherPromo = buildChain(
    { ...baseScenarioParams, promotion_lift: 40 },
    calculateDerivedImpacts({ ...baseScenarioParams, promotion_lift: 40 }, []),
    divergingSignals,
    flatHistory,
    flatForecast.map(f => ({ ...f, value: f.value * 1.4 / 1.2 }))
  );
  assert(
    higherPromo.gap.exposed_demand_units > chain.gap.exposed_demand_units,
    'G7: Raising promotion depth widens the Decision Gap (AC-DDF-28 runtime truth)'
  );

  const higherCapacity = buildChain(
    { ...baseScenarioParams, supplier_capacity_cap: 45 },
    calculateDerivedImpacts({ ...baseScenarioParams, supplier_capacity_cap: 45 }, []),
    divergingSignals
  );
  assert(
    higherCapacity.gap.exposed_demand_units === 0 &&
    higherCapacity.gap.exposed_demand_pp === 0 &&
    higherCapacity.gap.revenue_at_risk_gbp === 0 &&
    higherCapacity.gap.margin_at_risk_gbp === 0 &&
    higherCapacity.gap.risk_state === 'LOW',
    'G8: Capacity above the emerging frontier closes the gap to zero on every measure'
  );

  const contractingChain = buildChain(baseScenarioParams, baseDerivedImpacts, contractingSignals);
  assert(
    contractingChain.gap.emerging_demand_units < chain.gap.emerging_demand_units &&
    contractingChain.gap.exposed_demand_units < chain.gap.exposed_demand_units,
    'G9: A downward revision lowers the emerging frontier and narrows the gap (stability feeds the frontier, AC-DDF-14)'
  );

  assert(
    chain.gap.contributing_constraints.length === 3 &&
    chain.gap.contributing_constraints[0].rank === 1 &&
    Math.abs(
      chain.gap.contributing_constraints.reduce((s, c) => s + c.impact_units, 0) - chain.gap.exposed_demand_units
    ) <= 1 &&
    chain.gap.contributing_constraints.some(c => c.provenance_basis === 'MODELLED_DEMO_ASSUMPTION'),
    'G10: Ranked constraints sum exactly to the exposure and carry an explicit provenance basis (AC-DDF-12)'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // Decision Window
  // ══════════════════════════════════════════════════════════════════════════

  const scenarioNow = deriveScenarioNowIso(flatForecast);
  const windowModelled = evaluateDecisionWindow(null, scenarioNow);
  assert(
    windowModelled.provenance_basis === 'MODELLED_DEMO_ASSUMPTION' &&
    !windowModelled.is_indeterminate &&
    windowModelled.scenario_now_iso === scenarioNow &&
    windowModelled.remaining_hours !== null &&
    Math.abs(
      (windowModelled.remaining_hours as number) -
      (Date.parse(windowModelled.deadline_iso as string) - Date.parse(scenarioNow as string)) / 3600000
    ) < 0.51,
    'W1: Remaining hours are computed from the scenario clock to the deadline, never asserted as a literal'
  );

  assert(
    !!windowModelled.deadline_display?.includes('UTC') &&
    !!windowModelled.timezone_note?.includes('BST'),
    'W2: The contractual deadline is labelled UTC and the UK BST offset is stated (timezone semantics)'
  );

  // The window must not drift with real civil time.
  const windowRepeat = evaluateDecisionWindow(null, scenarioNow);
  assert(
    windowRepeat.remaining_hours === windowModelled.remaining_hours,
    'W3: The window is anchored to scenario time and does not move with the real clock'
  );

  const windowNoAnchor = evaluateDecisionWindow(null, null);
  assert(
    windowNoAnchor.window_state === 'INDETERMINATE' &&
    windowNoAnchor.is_indeterminate &&
    windowNoAnchor.remaining_hours === null &&
    windowNoAnchor.deadline_iso === null &&
    windowNoAnchor.provenance_basis === 'INDETERMINATE',
    'W4: With no scenario anchor the window is INDETERMINATE and renders no countdown (AC-DDF-15)'
  );

  const windowDeclared = evaluateDecisionWindow(
    {
      deadlineIso: '2026-08-21T14:00:00.000Z',
      declaredConstraintName: 'FreshDirect UK Order Confirmation Cut-Off',
      declaredBy: 'Commercial Supply Agreement (SLA Rule 4)'
    },
    '2026-08-20T00:00:00.000Z'
  );
  assert(
    windowDeclared.provenance_basis === 'DECLARED_OPERATIONAL_CONSTRAINT' &&
    windowDeclared.remaining_hours === 38 &&
    windowDeclared.window_state === 'OPEN' &&
    windowDeclared.declared_by === 'Commercial Supply Agreement (SLA Rule 4)',
    'W5: A declared constraint yields a derived duration with its declarer named (AC-DDF-18)',
    `remaining=${windowDeclared.remaining_hours}`
  );

  const windowExpired = evaluateDecisionWindow(
    { deadlineIso: '2026-08-20T14:00:00.000Z', declaredConstraintName: 'Cut-off' },
    '2026-08-21T00:00:00.000Z'
  );
  assert(
    windowExpired.window_state === 'RESTRICTED' &&
    (windowExpired.remaining_hours as number) <= 0,
    'W6: A deadline already passed on the scenario clock reports RESTRICTED, not a negative countdown'
  );

  const windowClosing = evaluateDecisionWindow(
    { deadlineIso: '2026-08-21T14:00:00.000Z', declaredConstraintName: 'Cut-off' },
    '2026-08-21T00:00:00.000Z'
  );
  assert(windowClosing.window_state === 'CLOSING_SOON', 'W7: Under 24 scenario hours the window reports CLOSING_SOON');

  // ══════════════════════════════════════════════════════════════════════════
  // P0-C — Decision Regret
  // ══════════════════════════════════════════════════════════════════════════

  const interventionForGap = evaluateInterventionRecommendation(
    chain.gap, baseScenarioParams, baseDerivedImpacts, 14, 1
  );
  const regretClosing = evaluateDecisionRegret(
    chain.gap, baseScenarioParams, divergentCase, windowClosing,
    interventionForGap.expected_units_recovered, interventionForGap.intervention_cost_gbp
  );

  const alts = [
    regretClosing.alternatives.act_now,
    regretClosing.alternatives.wait,
    regretClosing.alternatives.do_nothing
  ];
  assert(
    alts.every(a => a.expected_regret_gbp >= 0) &&
    alts.filter(a => a.expected_regret_gbp === 0).length >= 1 &&
    alts.every(a =>
      Math.abs(a.expected_regret_gbp - (regretClosing.best_expected_value_gbp - a.expected_decision_value_gbp)) < 1
    ),
    'R1: Regret is the shortfall against the best alternative, is never negative, and is zero for the winner'
  );

  assert(
    regretClosing.alternatives.do_nothing.expected_regret_gbp !== chain.gap.revenue_at_risk_gbp &&
    regretClosing.alternatives.do_nothing.expected_regret_gbp !== chain.gap.margin_at_risk_gbp &&
    regretClosing.alternatives.act_now.expected_regret_gbp !== chain.gap.exposed_demand_units,
    'R2: Regret is not exposed revenue, lost margin or the Decision Gap wearing a new label (ADR-043)'
  );

  assert(
    regretClosing.recommended_action === 'ACT_NOW' &&
    regretClosing.separation_significant &&
    regretClosing.separation_gbp >= regretClosing.separation_threshold_gbp,
    'R3: With strong evidence and a closing window, Act Now wins on a material separation',
    `rec=${regretClosing.recommended_action} sep=${regretClosing.separation_gbp} thr=${regretClosing.separation_threshold_gbp}`
  );

  // A wide window makes waiting genuinely competitive — Wait is not a strawman.
  const wideWindow = evaluateDecisionWindow(
    { deadlineIso: '2026-08-30T14:00:00.000Z', declaredConstraintName: 'Cut-off' },
    '2026-08-20T00:00:00.000Z'
  );
  const regretWide = evaluateDecisionRegret(
    chain.gap, baseScenarioParams,
    evaluateForecastStability(baseScenarioParams, divergingSignals.map(s => ({ ...s, confidence: 62 })), outlook),
    wideWindow, interventionForGap.expected_units_recovered, interventionForGap.intervention_cost_gbp
  );
  assert(
    regretWide.alternatives.wait.expected_decision_value_gbp >
      regretWide.alternatives.act_now.expected_decision_value_gbp &&
    regretWide.alternatives.wait.expected_regret_gbp === 0,
    'R4: With time in hand and weaker evidence, Wait is the highest-value alternative',
    `wait=${regretWide.alternatives.wait.expected_decision_value_gbp} act=${regretWide.alternatives.act_now.expected_decision_value_gbp}`
  );

  // Weak evidence plus a closing window should make committing perishable volume a loss.
  const regretDoNothing = evaluateDecisionRegret(
    chain.gap, baseScenarioParams,
    evaluateForecastStability(baseScenarioParams, divergingSignals.map(s => ({ ...s, confidence: 41 })), outlook),
    windowClosing, interventionForGap.expected_units_recovered, interventionForGap.intervention_cost_gbp
  );
  assert(
    regretDoNothing.alternatives.do_nothing.expected_decision_value_gbp >=
      regretDoNothing.alternatives.act_now.expected_decision_value_gbp &&
    regretDoNothing.alternatives.act_now.expected_decision_value_gbp < 0,
    'R5: On weak evidence with a closing window, acting destroys value and Do Nothing is not dominated',
    `act=${regretDoNothing.alternatives.act_now.expected_decision_value_gbp} nothing=${regretDoNothing.alternatives.do_nothing.expected_decision_value_gbp}`
  );

  const noGapIntervention = evaluateInterventionRecommendation(
    higherCapacity.gap, { ...baseScenarioParams, supplier_capacity_cap: 45 },
    calculateDerivedImpacts({ ...baseScenarioParams, supplier_capacity_cap: 45 }, []), 14, 1
  );
  const regretNoGap = evaluateDecisionRegret(
    higherCapacity.gap, baseScenarioParams, divergentCase, windowModelled,
    noGapIntervention.expected_units_recovered, noGapIntervention.intervention_cost_gbp
  );
  assert(
    regretNoGap.recommended_action === 'CHOICE_REQUIRED' &&
    !regretNoGap.separation_significant,
    'R6: With no gap the alternatives do not separate and CogniX names no winner (AC-DDF-22)'
  );

  const regretIndeterminate = evaluateDecisionRegret(
    chain.gap, baseScenarioParams, noEvidence, windowClosing,
    interventionForGap.expected_units_recovered, interventionForGap.intervention_cost_gbp
  );
  assert(
    regretIndeterminate.recommended_action === 'CHOICE_REQUIRED',
    'R7: Where the evidence is INDETERMINATE no probability is invented and no winner is named'
  );

  const regretNoWindow = evaluateDecisionRegret(
    chain.gap, baseScenarioParams, divergentCase, windowNoAnchor,
    interventionForGap.expected_units_recovered, interventionForGap.intervention_cost_gbp
  );
  assert(
    regretNoWindow.alternatives.wait.feasibility_status === 'GATED_BY_READINESS' &&
    regretNoWindow.recommended_action !== 'WAIT',
    'R8: Without a declared deadline, Wait is reported as gated and is never the recommendation (AC-DDF-23)'
  );

  assert(
    regretClosing.valuation_basis === 'MODELLED_EXPECTED_VALUE' &&
    regretClosing.regret_definition.toLowerCase().includes('not calibrated probabilities') &&
    alts.every(a => !!a.what_it_captures && !!a.what_it_risks && !!a.what_it_forgoes),
    'R9: Alternatives publish what each captures, risks and forgoes, on a labelled modelled basis (AC-DDF-20, AC-DDF-24)'
  );

  const sharedInputs = regretClosing.shared_inputs_summary;
  assert(
    sharedInputs.exposed_demand_units === chain.gap.exposed_demand_units &&
    sharedInputs.emerging_demand_units === chain.gap.emerging_demand_units &&
    sharedInputs.executable_units === chain.gap.executable_demand_units &&
    sharedInputs.revenue_per_unit_gbp === chain.gap.unit_economics.revenue_per_unit_gbp,
    'R10: All three alternatives are computed from the same inspectable inputs (AC-DDF-21)'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // Full evaluation, simulation and provenance
  // ══════════════════════════════════════════════════════════════════════════

  const live = evaluateDemandDecisionFrontier({
    tenantId: 'tenant_uk_retail_01',
    sessionId: 'sess_ddf_tests',
    scenarioParams: baseScenarioParams,
    derivedImpacts: baseDerivedImpacts,
    intentFusionOutlook: outlook,
    enterpriseSignals: divergingSignals,
    historySales: flatHistory,
    forecastSales: flatForecast,
    revenuePerUnitGbp: 2.5,
    metric: 'revenue',
    activeInterventionId: null
  });

  const simulated = evaluateDemandDecisionFrontier({
    tenantId: 'tenant_uk_retail_01',
    sessionId: 'sess_ddf_tests',
    scenarioParams: baseScenarioParams,
    derivedImpacts: baseDerivedImpacts,
    intentFusionOutlook: outlook,
    enterpriseSignals: divergingSignals,
    historySales: flatHistory,
    forecastSales: flatForecast,
    revenuePerUnitGbp: 2.5,
    metric: 'revenue',
    activeInterventionId: 'SLA_FLEX_RULE_4'
  });

  assert(
    live.simulated_intervention === undefined && !!simulated.simulated_intervention,
    'X1: Simulation state is present only while an intervention is active (reset restores the live evaluation)'
  );

  const simBlock = simulated.simulated_intervention!;
  assert(
    simBlock.recomputed_gap.exposed_demand_units < live.decision_gap.exposed_demand_units &&
    simBlock.recomputed_gap.exposed_demand_pp < live.decision_gap.exposed_demand_pp &&
    simBlock.gap_closed_units > 0,
    'X2: Simulating the intervention visibly reduces the Decision Gap in units and pp (AC-DDF-29)'
  );

  assert(
    Math.abs(
      simBlock.gap_closed_units -
      (live.decision_gap.exposed_demand_units - simBlock.recomputed_gap.exposed_demand_units)
    ) <= 1 &&
    Math.abs(
      simBlock.margin_recovered_gbp -
      simBlock.gap_closed_units * live.decision_gap.unit_economics.gross_margin_per_unit_gbp
    ) < 1,
    'X3: The simulated intervention arithmetic closes — units recovered and margin recovered agree'
  );

  assert(
    simBlock.is_modelled_only === true &&
    simBlock.outcome_statement.toLowerCase().includes('modelled outcome') &&
    simBlock.outcome_statement.toLowerCase().includes('nothing has been ordered'),
    'X4: The simulated outcome states it is modelled and claims no execution (intervention semantics)'
  );

  assert(
    simBlock.recomputed_regret.alternatives.do_nothing.expected_regret_gbp <=
      live.decision_regret.alternatives.do_nothing.expected_regret_gbp,
    'X5: Regret is recomputed alongside the gap rather than carried over stale'
  );

  // Determinism: identical inputs must produce an identical evaluation identity.
  const repeat = evaluateDemandDecisionFrontier({
    tenantId: 'tenant_uk_retail_01', sessionId: 'sess_ddf_tests',
    scenarioParams: baseScenarioParams, derivedImpacts: baseDerivedImpacts,
    intentFusionOutlook: outlook, enterpriseSignals: divergingSignals,
    historySales: flatHistory, forecastSales: flatForecast,
    revenuePerUnitGbp: 2.5, metric: 'revenue', activeInterventionId: null
  });
  assert(
    repeat.evaluation_id === live.evaluation_id &&
    repeat.decision_gap.exposed_demand_units === live.decision_gap.exposed_demand_units,
    'X6: The evaluation is deterministic for identical inputs'
  );

  const nonFinite = allNumbersFinite(simulated);
  assert(nonFinite === null, 'X7: No NaN or Infinity reaches any published field', `offending path: ${nonFinite}`);

  const degenerate = evaluateDemandDecisionFrontier({
    scenarioParams: { ...baseScenarioParams, promotion_lift: 0 },
    derivedImpacts: calculateDerivedImpacts({ ...baseScenarioParams, promotion_lift: 0 }, []),
    intentFusionOutlook: outlook,
    enterpriseSignals: [],
    historySales: [],
    forecastSales: [],
    metric: 'units',
    activeInterventionId: null
  });
  assert(
    allNumbersFinite(degenerate) === null &&
    degenerate.decision_gap.exposed_demand_units >= 0 &&
    degenerate.decision_gap.revenue_at_risk_gbp >= 0 &&
    degenerate.forecast_stability.status === 'INDETERMINATE' &&
    degenerate.decision_window.is_indeterminate,
    'X8: Empty series degrade to INDETERMINATE and non-negative bounds rather than NaN'
  );

  // No stale literal from the pre-correction build may reappear through any fallback path.
  const serialised = JSON.stringify(degenerate) + JSON.stringify(live) + JSON.stringify(simulated);
  const bannedLiterals = ['21400', '"91%"', 'Model Accuracy', 'ARIMA', 'Prophet', 'GenAI', 'live API feed'];
  const found = bannedLiterals.filter(literal => serialised.includes(literal));
  assert(
    found.length === 0,
    'X9: No stale literal or unsupported ML/live-feed claim survives in engine output',
    `found: ${found.join(', ')}`
  );

  assert(
    !serialised.includes('"confidence_pct"'),
    'X10: The prohibited `confidence_pct` vocabulary is not reintroduced (AC-DDF-31)'
  );

  assert(
    live.assumptions.length > 0 &&
    live.assumptions.every(a => !!a.label && !!a.value && !!a.source) &&
    live.assumptions.some(a => a.provenance_class === 'MODELLED_DEMO_ASSUMPTION') &&
    live.assumptions.some(a => a.provenance_class === 'DERIVED_FROM_DECISION_STATE'),
    'X11: Every published input carries a provenance class and a named source (AC-DDF-25)'
  );

  assert(
    live.synthetic_demo === true && !JSON.stringify(live.assumptions).includes('"OBSERVED"'),
    'X12: No demand datum is labelled with the governed bare OBSERVED class (AC-DDF-31)'
  );

  const derivedEcon = deriveUnitEconomics(2.5);
  const fallbackEcon = deriveUnitEconomics(null);
  assert(
    derivedEcon.revenue_per_unit_basis === 'DERIVED_FROM_PROJECTION' &&
    fallbackEcon.revenue_per_unit_basis === 'MODELLED_DEMO_ASSUMPTION' &&
    derivedEcon.gross_margin_per_unit_gbp < derivedEcon.revenue_per_unit_gbp,
    'X13: Unit economics declare whether revenue per unit was derived or assumed'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // Shared Decision State propagation (D-DDF-5)
  // ══════════════════════════════════════════════════════════════════════════

  const initState = getDecisionState('tenant_uk_retail_01', 'sess_001');
  const v0 = initState.state_version;

  const transCann = transitionDecisionState('tenant_uk_retail_01', 'sess_001', 'SET_CANNIBALISATION_FACTOR', {
    cannibalisation_factor: 8
  });
  assert(
    transCann.state_version === v0 + 1 && transCann.scenario_parameters.cannibalisation_factor === 8,
    'P1: SET_CANNIBALISATION_FACTOR propagates to Shared Decision State (D-DDF-5)'
  );

  const transEvent = transitionDecisionState('tenant_uk_retail_01', 'sess_001', 'SET_EVENT_BOOST', {
    event_boost: 'heatwave'
  });
  assert(
    transEvent.state_version === v0 + 2 && transEvent.scenario_parameters.event_boost === 'heatwave',
    'P2: SET_EVENT_BOOST propagates to Shared Decision State (D-DDF-5)'
  );

  const transPromo = transitionDecisionState('tenant_uk_retail_01', 'sess_001', 'SET_PROMOTION_LIFT', {
    promotion_lift: 35
  });
  assert(
    transPromo.scenario_parameters.promotion_lift === 35 &&
    transPromo.derived_impacts.weekly_demand_units > initState.derived_impacts.weekly_demand_units,
    'P3: Promotion depth propagates through to derived impacts, which the frontier consumes read-only'
  );

  // The engine must never write to Shared Decision State.
  const versionBeforeEval = getDecisionState('tenant_uk_retail_01', 'sess_001').state_version;
  evaluateDemandDecisionFrontier({
    scenarioParams: baseScenarioParams, derivedImpacts: baseDerivedImpacts,
    intentFusionOutlook: outlook, enterpriseSignals: divergingSignals,
    historySales: flatHistory, forecastSales: flatForecast,
    revenuePerUnitGbp: 2.5, activeInterventionId: 'SLA_FLEX_RULE_4'
  });
  assert(
    getDecisionState('tenant_uk_retail_01', 'sess_001').state_version === versionBeforeEval,
    'P4: Evaluating and simulating never writes to Shared Decision State (AC-DDF-13 read-only)'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // Projection engine end-to-end
  // ══════════════════════════════════════════════════════════════════════════

  // FM-01 migrated these three from the retired `getForecastProjections` onto the governed
  // boundary. The assertions are the DDF-01 ones unchanged in intent: a complete series for the
  // requested horizon, a promotion depth that genuinely moves it, and the offered horizons being
  // the horizons produced.
  const DEMAND_MODEL = 'HOLT_WINTERS_ADDITIVE' as const;
  const projection = await projectDemand({
    metric: 'units', horizon: 14, modelId: DEMAND_MODEL,
    promoLift: 20, cannibalization: 0, eventBoost: 'none',
    executedAsOf: '2026-08-23T00:00:00.000Z', backtest: false
  });
  assert(!isDemandRefusal(projection), 'E0: The governed boundary produces a units projection for the national scope');
  if (isDemandRefusal(projection)) throw new Error('demand projection refused');
  assert(
    projection.forecast.length === 14 &&
    projection.history.length > 0 &&
    projection.kpi.projected_total > 0,
    'E1: The projection engine returns a complete units series for the requested horizon'
  );

  const projectionHighPromo = await projectDemand({
    metric: 'units', horizon: 14, modelId: DEMAND_MODEL,
    promoLift: 45, cannibalization: 0, eventBoost: 'none',
    executedAsOf: '2026-08-23T00:00:00.000Z', backtest: false
  });
  if (isDemandRefusal(projectionHighPromo)) throw new Error('demand projection refused');
  const lowTotal = projection.forecast.reduce((a, f) => a + f.value, 0);
  const highTotal = projectionHighPromo.forecast.reduce((a, f) => a + f.value, 0);
  assert(highTotal > lowTotal, 'E2: Promotion depth genuinely moves the projection the frontier is built on');

  const horizon30 = await projectDemand({
    metric: 'units', horizon: 30, modelId: DEMAND_MODEL,
    promoLift: 20, cannibalization: 0, eventBoost: 'none',
    executedAsOf: '2026-08-23T00:00:00.000Z', backtest: false
  });
  if (isDemandRefusal(horizon30)) throw new Error('demand projection refused');
  assert(
    horizon30.forecast.length === 30,
    'E3: The supported horizons the selector offers are the horizons the engine produces (D-DDF-7)'
  );

  // Summary
  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('DDF-01 test suite failed with an error:', err);
  process.exit(1);
});
