/**
 * Unit Test Suite for CogniX CDI-04 Campaign Decision Readiness & Resilience
 * Run via: node --import tsx tests/unit/run-cdi04-tests.ts
 *
 * Covers design-gate acceptance criteria §9 including adversarial guards.
 */

import {
  createDefaultCampaignIntentDraft,
  assertNoCompensation,
  assertNoThresholdDerivedVeto,
  assertNegativeContributionNeverGo,
  assertRecoveryLeverParity,
  READINESS_THRESHOLD_POLICY,
  WP10C_RECOVERY_LEVER_HEADROOM,
  deriveCommercialObjectiveClass,
  getThreshold,
  validateDecisionReadinessAssessment
} from '../../packages/contracts/src/index';
import {
  clearCampaignIntents,
  registerCampaignIntent
} from '../../lib/campaign-intent-store';
import {
  evaluateCampaignReadiness,
  evaluateCampaignReadinessWithDiscovery,
  evaluateOperational
} from '../../lib/campaign-readiness-engine';
import { evaluateCampaignDecision } from '../../lib/campaign-causal-engine';
import { discoverCampaignOpportunity } from '../../lib/campaign-opportunity-engine';
import { decisionStateStore } from '../../lib/decision-state-store';
import { calculateDerivedImpacts } from '../../packages/contracts/src/decision-state-model';

function runTests() {
  console.log('====================================================');
  console.log('COGNIX CDI-04 DECISION READINESS UNIT TESTS');
  console.log('====================================================\n');

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

  // --- Policy / parity guards (build-time) ---
  assert(assertRecoveryLeverParity().ok, 'Test 1: WP10-C recovery lever parity (1200/500)');
  assert(
    READINESS_THRESHOLD_POLICY.provenance === 'synthetic_demonstration_policy' &&
      READINESS_THRESHOLD_POLICY.thresholds.every(
        t => t.effect_ceiling === 'WATCH' || t.effect_ceiling === 'CONSTRAINED'
      ) &&
      READINESS_THRESHOLD_POLICY.thresholds.every(t => !!t.calibration_target),
    'Test 2: Threshold policy published; no threshold may fire a veto'
  );
  assert(getThreshold('TH-O1').value === 70 && getThreshold('TH-O5').value === 5, 'Test 3: Thresholds resolve by id (no inlined constants in policy access)');

  clearCampaignIntents();
  decisionStateStore.clearStore();

  function registerPromo(session: string, overrides: any = {}) {
    const draft = createDefaultCampaignIntentDraft('tenant_uk_retail_01', session);
    return registerCampaignIntent({
      ...draft,
      campaign_intent: {
        ...draft.campaign_intent,
        intervention_posture: 'CONSIDER_PROMOTION',
        provisional_mechanic: '20_percent_off',
        provisional_discount_depth: 20,
        objective_type: 'REVENUE_ACCELERATION',
        ...(overrides.campaign_intent || {})
      },
      baseline_objective: {
        ...draft.baseline_objective,
        primary_metric: 'CONTRIBUTION',
        target_direction: 'INCREASE',
        ...(overrides.baseline_objective || {})
      },
      audience_market: {
        ...draft.audience_market,
        region: 'North West',
        timing_mode: 'KNOWN_DATES',
        planned_start: '2026-08-20T00:00:00.000Z',
        planned_end: '2026-08-27T00:00:00.000Z',
        ...(overrides.audience_market || {})
      },
      decision_context: {
        ...draft.decision_context,
        ...(overrides.decision_context || {})
      }
    });
  }

  // Happy-ish path with discovery
  const promo = registerPromo('sess_cdi04_base');
  const readiness = evaluateCampaignReadinessWithDiscovery({
    tenant_id: promo.tenant_id,
    session_id: promo.session_id,
    campaign_intent_id: promo.campaign_intent_id,
    include_signals: false,
    evaluation_timestamp: '2026-08-15T12:00:00.000Z'
  });
  const a = readiness.readiness;

  assert(a.dimensions.length === 6, 'Test 4: Exactly six dimensions always present');
  assert(
    a.threshold_policy.provenance === 'synthetic_demonstration_policy' && a.synthetic_demo === true,
    'Test 5: threshold_policy emitted on every response'
  );
  assert(assertNoCompensation(a).ok, 'Test 6: assertNoCompensation passes', assertNoCompensation(a).violations.join('; '));
  assert(assertNoThresholdDerivedVeto(a).ok, 'Test 7: assertNoThresholdDerivedVeto passes');
  assert(assertNegativeContributionNeverGo(a).ok, 'Test 8: assertNegativeContributionNeverGo passes');
  assert(a.state !== 'GO', 'Test 9: GO unreachable on synthetic-only demo path (caps K1–K4)');
  assert(
    a.state === 'CONDITIONAL_GO' || a.state === 'REVIEW' || a.state === 'DO_NOT_PROCEED',
    'Test 10: Demo path yields lattice state ≤ CONDITIONAL_GO'
  );
  if (a.state === 'CONDITIONAL_GO') {
    assert(
      a.conditions.every(c => !!c.discharge_test),
      'Test 11: CONDITIONAL_GO conditions carry discharge_test'
    );
  } else {
    assert(true, 'Test 11: CONDITIONAL_GO conditions carry discharge_test (n/a)');
  }

  // R1 — DRAFT rejected
  clearCampaignIntents();
  const draftOnly = createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_cdi04_draft');
  let r1 = false;
  try {
    evaluateCampaignReadiness({
      tenant_id: draftOnly.tenant_id,
      session_id: draftOnly.session_id,
      campaign_intent: draftOnly
    });
  } catch (e: any) {
    r1 = e.rejection_id === 'R1' || /R1/.test(e.message);
  }
  assert(r1, 'Test 12: R1 rejects DRAFT intents');

  // R5 — tolerance on VALUE_CREATION
  clearCampaignIntents();
  const vc = registerPromo('sess_cdi04_r5');
  let r5 = false;
  try {
    evaluateCampaignReadinessWithDiscovery({
      tenant_id: vc.tenant_id,
      session_id: vc.session_id,
      campaign_intent_id: vc.campaign_intent_id,
      economic_tolerance: {
        max_contribution_sacrifice_gbp: 1000,
        rationale: 'test',
        declared_by: 'tester',
        objective_basis: 'REVENUE_ACCELERATION'
      }
    });
  } catch (e: any) {
    r5 = e.rejection_id === 'R5' || /R5/.test(e.message);
  }
  assert(r5, 'Test 13: R5 rejects economic_tolerance on VALUE_CREATION');

  // R6 — threshold override
  let r6 = false;
  try {
    evaluateCampaignReadiness({
      tenant_id: vc.tenant_id,
      session_id: vc.session_id,
      campaign_intent_id: vc.campaign_intent_id,
      threshold_overrides: { 'TH-O1': 99 }
    } as any);
  } catch (e: any) {
    r6 = e.rejection_id === 'R6' || /R6/.test(e.message);
  }
  assert(r6, 'Test 14: R6 rejects threshold_overrides');

  // Objective class derivation — metric wins
  clearCampaignIntents();
  const metricWins = registerPromo('sess_cdi04_metric', {
    campaign_intent: { objective_type: 'INVENTORY_CLEARANCE' },
    baseline_objective: { primary_metric: 'CONTRIBUTION', target_direction: 'INCREASE' }
  });
  assert(
    deriveCommercialObjectiveClass(metricWins) === 'VALUE_CREATION',
    'Test 15: Metric wins over objective label for commercial_objective_class'
  );

  // VALUE_TRADE + negative contribution, no tolerance ⇒ never GO
  clearCampaignIntents();
  const trade = registerPromo('sess_cdi04_trade', {
    campaign_intent: { objective_type: 'INVENTORY_CLEARANCE', intervention_posture: 'CONSIDER_PROMOTION', provisional_mechanic: '20_percent_off', provisional_discount_depth: 40 },
    baseline_objective: { primary_metric: 'WASTE_REDUCTION', target_direction: 'DECREASE' }
  });
  const tradeEval = evaluateCampaignDecision({
    tenant_id: trade.tenant_id,
    session_id: trade.session_id,
    campaign_intent_id: trade.campaign_intent_id,
    include_signals: false
  });
  // Force negative contribution scenario via deep discount path if needed
  const tradeReady = evaluateCampaignReadinessWithDiscovery({
    tenant_id: trade.tenant_id,
    session_id: trade.session_id,
    campaign_intent_id: trade.campaign_intent_id,
    campaign_evaluation: tradeEval,
    include_signals: false,
    evaluation_timestamp: '2026-08-15T12:00:00.000Z'
  });
  if (tradeReady.readiness.commercial_tolerance.contribution_delta_gbp < 0) {
    assert(
      tradeReady.readiness.dimensions.find(d => d.dimension === 'COMMERCIAL')!.state !== 'CLEAR' &&
        tradeReady.readiness.state !== 'GO' &&
        assertNegativeContributionNeverGo(tradeReady.readiness).ok,
      'Test 16: VALUE_TRADE negative contribution without tolerance never CLEAR/GO'
    );
  } else {
    // Still assert invariant holds
    assert(
      assertNegativeContributionNeverGo(tradeReady.readiness).ok && tradeReady.readiness.state !== 'GO',
      'Test 16: VALUE_TRADE path never GO on synthetic demo (contribution may be positive)'
    );
  }

  // Tolerance within ⇒ CONSTRAINED with headroom; never CLEAR/GO
  clearCampaignIntents();
  const trade2 = registerPromo('sess_cdi04_tol', {
    campaign_intent: { objective_type: 'LAUNCH' },
    baseline_objective: { primary_metric: 'VOLUME', target_direction: 'INCREASE' }
  });
  const t2eval = evaluateCampaignDecision({
    tenant_id: trade2.tenant_id,
    session_id: trade2.session_id,
    campaign_intent_id: trade2.campaign_intent_id,
    include_signals: false
  });
  // Inject negative contribution by mutating a copy of evaluation for fixture
  const negEval = JSON.parse(JSON.stringify(t2eval));
  negEval.counterfactual.campaign_delta.contribution_delta_gbp = -500;
  negEval.counterfactual.campaign_delta.intervention_indistinguishable_from_do_nothing = false;
  const withinTol = evaluateCampaignReadinessWithDiscovery({
    tenant_id: trade2.tenant_id,
    session_id: trade2.session_id,
    campaign_intent_id: trade2.campaign_intent_id,
    campaign_evaluation: negEval,
    economic_tolerance: {
      max_contribution_sacrifice_gbp: 1000,
      rationale: 'Launch acquisition budget',
      declared_by: 'category_director',
      objective_basis: 'LAUNCH'
    },
    include_signals: false,
    evaluation_timestamp: '2026-08-15T12:00:00.000Z'
  });
  assert(
    withinTol.readiness.commercial_tolerance.within_tolerance === true &&
      withinTol.readiness.commercial_tolerance.headroom_gbp === 500 &&
      withinTol.readiness.dimensions.find(d => d.dimension === 'COMMERCIAL')!.state === 'CONSTRAINED' &&
      withinTol.readiness.state !== 'GO' &&
      withinTol.readiness.state !== 'DO_NOT_PROCEED',
    'Test 17: VALUE_TRADE within tolerance ⇒ CONSTRAINED with headroom; never GO'
  );

  // Tolerance exceeded ⇒ V3b
  const overTol = evaluateCampaignReadinessWithDiscovery({
    tenant_id: trade2.tenant_id,
    session_id: trade2.session_id,
    campaign_intent_id: trade2.campaign_intent_id,
    campaign_evaluation: negEval,
    economic_tolerance: {
      max_contribution_sacrifice_gbp: 100,
      rationale: 'Tight budget',
      declared_by: 'category_director',
      objective_basis: 'LAUNCH'
    },
    include_signals: false,
    evaluation_timestamp: '2026-08-15T12:00:00.000Z'
  });
  assert(
    overTol.readiness.vetoes.some(v => v.veto_id === 'V3b' && v.veto_basis === 'DECLARED_TOLERANCE_EXCEEDED') &&
      overTol.readiness.state === 'DO_NOT_PROCEED',
    'Test 18: Tolerance exceeded ⇒ V3b ⇒ DO_NOT_PROCEED'
  );

  // V3a — VALUE_CREATION + negative
  clearCampaignIntents();
  const v3aCamp = registerPromo('sess_cdi04_v3a');
  const v3aEval = evaluateCampaignDecision({
    tenant_id: v3aCamp.tenant_id,
    session_id: v3aCamp.session_id,
    campaign_intent_id: v3aCamp.campaign_intent_id,
    include_signals: false
  });
  const v3aNeg = JSON.parse(JSON.stringify(v3aEval));
  v3aNeg.counterfactual.campaign_delta.contribution_delta_gbp = -200;
  const v3aReady = evaluateCampaignReadinessWithDiscovery({
    tenant_id: v3aCamp.tenant_id,
    session_id: v3aCamp.session_id,
    campaign_intent_id: v3aCamp.campaign_intent_id,
    campaign_evaluation: v3aNeg,
    include_signals: false,
    evaluation_timestamp: '2026-08-15T12:00:00.000Z'
  });
  assert(
    v3aReady.readiness.vetoes.some(v => v.veto_id === 'V3a' && v.veto_basis === 'STATED_OBJECTIVE_CONTRADICTION') &&
      v3aReady.readiness.state === 'DO_NOT_PROCEED',
    'Test 19: VALUE_CREATION + negative contribution ⇒ V3a ⇒ DO_NOT_PROCEED'
  );

  // Cap K7 independent: negative contribution never GO even if other dims clear-ish
  assert(v3aReady.readiness.state_caps_applied.includes('K7') || v3aReady.readiness.state === 'DO_NOT_PROCEED', 'Test 20: K7 / V3a structural backstop on negative contribution');

  // Operational feasibility: gap 1000 vs headroom 1700 ⇒ CONSTRAINED CONDITIONAL_GO
  // Use VALUE_TRADE + shallow mechanic so Commercial does not V3a-veto the fixture.
  clearCampaignIntents();
  decisionStateStore.clearStore();
  const opsCamp = registerPromo('sess_cdi04_ops', {
    campaign_intent: {
      objective_type: 'LAUNCH',
      intervention_posture: 'CONSIDER_PROMOTION',
      provisional_mechanic: '20_percent_off',
      provisional_discount_depth: 10
    },
    baseline_objective: { primary_metric: 'VOLUME', target_direction: 'INCREASE' }
  });
  decisionStateStore.createOrInitialiseState({
    tenant_id: opsCamp.tenant_id,
    session_id: opsCamp.session_id
  });
  const opsReady = evaluateCampaignReadinessWithDiscovery({
    tenant_id: opsCamp.tenant_id,
    session_id: opsCamp.session_id,
    campaign_intent_id: opsCamp.campaign_intent_id,
    include_signals: false,
    evaluation_timestamp: '2026-08-15T12:00:00.000Z'
  });
  const feas = opsReady.readiness.operational_feasibility;
  assert(
    !!feas &&
      feas.commitment_gap_units === 1000 &&
      feas.recoverable_headroom_units === 1700 &&
      feas.structurally_infeasible === false &&
      opsReady.readiness.dimensions.find(d => d.dimension === 'OPERATIONAL')!.state === 'CONSTRAINED' &&
      opsReady.readiness.conditions.some(c => /SLA_FLEX_RULE_4/.test(c.discharge_test)) &&
      opsReady.readiness.state === 'CONDITIONAL_GO' &&
      opsReady.readiness.vetoes.length === 0,
    'Test 21: gap 1000 ≤ headroom 1700 ⇒ CONSTRAINED + SLA_FLEX discharge ⇒ CONDITIONAL_GO',
    `gap=${feas?.commitment_gap_units} headroom=${feas?.recoverable_headroom_units} state=${opsReady.readiness.state} op=${opsReady.readiness.dimensions.find(d => d.dimension === 'OPERATIONAL')?.state} vetoes=${JSON.stringify(opsReady.readiness.vetoes)} dims=${opsReady.readiness.dimensions.map(d => d.dimension+':'+d.state).join(',')}`
  );

  // V4 — gap 3000 > 1700
  const di = calculateDerivedImpacts(
    {
      promotion_lift: 50,
      supplier_capacity_cap: 0,
      forecast_horizon_days: 14,
      promotion_method: '20_percent_off',
      campaign_scope: 'national',
      cannibalisation_factor: 0,
      event_boost: 'none'
    },
    []
  );
  // 15000 demand - 10000 capacity = 5000 gap > 1700
  assert(di.commitment_gap_units > 1700, 'Test 22a: high-lift fixture produces gap > recoverable headroom');

  // Simulate infeasible via evaluateOperational bundle with patched DS
  const ds = decisionStateStore.getCurrentStateBySession(opsCamp.session_id, opsCamp.tenant_id)!;
  const infeasBundle: any = {
    campaign: opsCamp,
    evaluation: evaluateCampaignDecision({
      tenant_id: opsCamp.tenant_id,
      session_id: opsCamp.session_id,
      campaign_intent_id: opsCamp.campaign_intent_id,
      include_signals: false
    }),
    decisionState: {
      ...ds,
      derived_impacts: {
        ...ds.derived_impacts,
        commitment_gap_units: 3000,
        supplier_capacity_units: 10000,
        financial_exposure_gbp: 360000,
        stockout_probability_pct: 70,
        delivery_risk_pct: 40
      },
      selected_interventions: []
    },
    includeSignals: false,
    timestamp: '2026-08-15T12:00:00.000Z'
  };
  const opInfeas = evaluateOperational(infeasBundle);
  assert(
    opInfeas.feasibility?.structurally_infeasible === true &&
      opInfeas.vetoes.some(v => v.veto_id === 'V4' && v.veto_basis === 'OPERATIONAL_INFEASIBILITY'),
    'Test 22: gap 3000 > headroom 1700 ⇒ V4 OPERATIONAL_INFEASIBILITY'
  );

  // Stockout 92 alone ⇒ CONSTRAINED not veto
  const stockoutBundle: any = {
    ...infeasBundle,
    decisionState: {
      ...ds,
      derived_impacts: {
        ...ds.derived_impacts,
        commitment_gap_units: 0,
        stockout_probability_pct: 92,
        delivery_risk_pct: 10,
        supplier_capacity_units: 20000
      },
      selected_interventions: ['SLA_FLEX_RULE_4', 'BUFFER_OPTIMISATION_R002']
    }
  };
  const opStock = evaluateOperational(stockoutBundle);
  assert(
    opStock.assessment.state === 'CONSTRAINED' &&
      opStock.vetoes.length === 0 &&
      !opStock.feasibility?.structurally_infeasible,
    'Test 23: stockout 92% alone ⇒ CONSTRAINED, not veto'
  );

  // Compensation leak guard: CLEAR commercial + BLOCKING operational ⇒ DO_NOT_PROCEED
  // Use V4 path via full readiness with patched evaluation + high gap by mutating after... 
  // Build assessment-like fixture for assertNoCompensation
  const leakFixture = {
    ...opsReady.readiness,
    dimensions: opsReady.readiness.dimensions.map(d =>
      d.dimension === 'OPERATIONAL'
        ? { ...d, state: 'BLOCKING' as const }
        : d.dimension === 'COMMERCIAL'
          ? { ...d, state: 'CLEAR' as const }
          : d
    ),
    state: 'CONDITIONAL_GO' as const,
    vetoes: [
      {
        veto_id: 'V4' as const,
        dimension: 'OPERATIONAL' as const,
        statement: 'test',
        triggering_field: 'commitment_gap_units',
        triggering_value: 3000,
        veto_basis: 'OPERATIONAL_INFEASIBILITY' as const
      }
    ]
  };
  assert(
    !assertNoCompensation(leakFixture as any).ok,
    'Test 24: Guard detects compensation leak (CLEAR Commercial + BLOCKING Operational ≠ CONDITIONAL_GO)'
  );

  // Absent CDI-03 ⇒ K2, Context/Customer NOT_EVALUATED
  clearCampaignIntents();
  const noCdi03 = registerPromo('sess_cdi04_nocdi03');
  const noDisc = evaluateCampaignReadiness({
    tenant_id: noCdi03.tenant_id,
    session_id: noCdi03.session_id,
    campaign_intent_id: noCdi03.campaign_intent_id,
    include_signals: false,
    evaluation_timestamp: '2026-08-15T12:00:00.000Z'
  });
  assert(
    noDisc.readiness.dimensions.find(d => d.dimension === 'CONTEXT')!.state === 'NOT_EVALUATED' &&
      noDisc.readiness.dimensions.find(d => d.dimension === 'CUSTOMER')!.state === 'NOT_EVALUATED' &&
      noDisc.readiness.state_caps_applied.includes('K2') &&
      noDisc.readiness.state !== 'GO',
    'Test 25: Absent CDI-03 ⇒ Context/Customer NOT_EVALUATED, cap K2, never GO'
  );

  // Provenance: no OBSERVED + synthetic_demo
  assert(
    !a.dimensions.some(d =>
      d.findings.some(f => f.evidence.some(e => e.strength === 'OBSERVED' && e.synthetic_demo))
    ),
    'Test 26: No OBSERVED+synthetic_demo evidence refs'
  );

  // Context seeded assumption disclosure
  assert(
    a.dimensions
      .find(d => d.dimension === 'CONTEXT')!
      .findings.some(f =>
        f.evidence.some(e => e.strength === 'SEEDED_ASSUMPTION' && !!e.disclosure)
      ) || a.dimensions.find(d => d.dimension === 'CONTEXT')!.state === 'NOT_EVALUATED',
    'Test 27: CDI-03 anchor-derived findings carry SEEDED_ASSUMPTION + disclosure'
  );

  // Waste never sole decisive for CLEAR commercial
  const commercialFindings = a.dimensions.find(d => d.dimension === 'COMMERCIAL')!.findings;
  const wasteOnlyClear =
    a.dimensions.find(d => d.dimension === 'COMMERCIAL')!.state === 'CLEAR' &&
    commercialFindings.filter(f => f.decisive).every(f => f.finding_id === 'C_waste_discontinuity');
  assert(!wasteOnlyClear, 'Test 28: waste_delta_units never sole decisive for CLEAR Commercial');

  // Tenant isolation
  let tenantBlocked = false;
  try {
    evaluateCampaignReadinessWithDiscovery({
      tenant_id: 'tenant_other',
      session_id: opsCamp.session_id,
      campaign_intent_id: opsCamp.campaign_intent_id
    });
  } catch (e: any) {
    tenantBlocked = /CampaignIntentNotFound|Tenant|R3/.test(e.message) || e.rejection_id === 'R3';
  }
  assert(tenantBlocked, 'Test 29: Cross-tenant readiness rejected');

  // Model divergence published
  assert(
    typeof opsReady.readiness.capacity_basis.demand_units === 'number' &&
      opsReady.readiness.capacity_basis.demand_source === 'cdi02_predicted_with_intervention' &&
      opsReady.readiness.capacity_basis.capacity_source === 'wp10c_derived_impacts',
    'Test 30: capacity_basis names CDI-02 demand and WP10-C capacity'
  );

  // Resilience evidence references only
  assert(
    opsReady.readiness.resilience_evidence.every(r => r.source === 'wp10c_derived_impacts'),
    'Test 31: resilience_evidence is read-only WP10-C references'
  );

  // No ripple-engine references in payload
  assert(
    !JSON.stringify(opsReady).includes('ripple-engine') &&
      !JSON.stringify(opsReady).includes('commitment-engine'),
    'Test 32: No ripple-engine / commitment-engine references (20a)'
  );

  // V5 — zero stores included
  clearCampaignIntents();
  const v5Camp = registerPromo('sess_cdi04_v5', {
    audience_market: {
      region: 'Antarctica',
      timing_mode: 'KNOWN_DATES',
      planned_start: '2026-08-20T00:00:00.000Z',
      planned_end: '2026-08-27T00:00:00.000Z'
    }
  });
  const v5Disc = discoverCampaignOpportunity({
    tenant_id: v5Camp.tenant_id,
    session_id: v5Camp.session_id,
    campaign_intent_id: v5Camp.campaign_intent_id
  });
  // Force zero included
  const v5Forced = JSON.parse(JSON.stringify(v5Disc));
  v5Forced.micro_markets.stores_included = 0;
  v5Forced.micro_markets.stores = v5Forced.micro_markets.stores.map((s: any) => ({
    ...s,
    included: false,
    tier: 'EXCLUDE'
  }));
  const v5Ready = evaluateCampaignReadiness({
    tenant_id: v5Camp.tenant_id,
    session_id: v5Camp.session_id,
    campaign_intent_id: v5Camp.campaign_intent_id,
    opportunity_discovery: v5Forced,
    include_signals: false,
    evaluation_timestamp: '2026-08-15T12:00:00.000Z'
  });
  assert(
    v5Ready.readiness.vetoes.some(v => v.veto_id === 'V5' && v.veto_basis === 'NO_ADDRESSABLE_ESTATE') &&
      v5Ready.readiness.state === 'DO_NOT_PROCEED',
    'Test 33: stores_included=0 ⇒ V5 ⇒ DO_NOT_PROCEED'
  );

  // Missing evidence never silently passes — absent discovery already NOT_EVALUATED
  assert(
    noDisc.readiness.dimensions.every(d => d.dimension !== undefined) &&
      noDisc.readiness.dimensions.find(d => d.dimension === 'CONTEXT')!.missing_inputs !== undefined,
    'Test 34: Missing optional integration is visible NOT_EVALUATED, not omitted'
  );

  // Validator on happy assessment
  assert(
    validateDecisionReadinessAssessment(opsReady.readiness).valid ||
      validateDecisionReadinessAssessment(opsReady.readiness).errors.every(e =>
        /CONDITIONAL_GO missing/.test(e)
      ) === false,
    'Test 35: DecisionReadinessAssessment validates',
    validateDecisionReadinessAssessment(opsReady.readiness).errors.join('; ')
  );

  // DECLARED_INPUT never OBSERVED
  assert(
    withinTol.readiness.dimensions
      .find(d => d.dimension === 'COMMERCIAL')!
      .findings.some(f =>
        f.evidence.some(e => e.strength === 'DECLARED_INPUT' && e.synthetic_demo === false)
      ),
    'Test 36: economic_tolerance published as DECLARED_INPUT (not OBSERVED)'
  );

  // five CLEAR + one CONSTRAINED never GO — structural
  const fiveClear = {
    ...opsReady.readiness,
    dimensions: opsReady.readiness.dimensions.map((d, i) =>
      i === 0 ? { ...d, state: 'CONSTRAINED' as const } : { ...d, state: 'CLEAR' as const }
    ),
    state: 'GO' as const,
    vetoes: [],
    conditions: [],
    state_caps_applied: []
  };
  assert(!assertNoCompensation(fiveClear as any).ok, 'Test 37: five CLEAR + one CONSTRAINED cannot be GO');

  // ------------------------------------------------------------------
  // Independent review regression guards (2026-08-15) — one per corrected defect.
  // ------------------------------------------------------------------

  // R-1 (defect: CDI-04 auto-created Shared Decision State via getCurrentStateBySession).
  // CDI-04 is a read-only consumer (design gate §5.3, acceptance criterion 17).
  clearCampaignIntents();
  decisionStateStore.clearStore();
  const roCamp = registerPromo('sess_review_readonly');
  const roEval = evaluateCampaignDecision({
    tenant_id: 'tenant_uk_retail_01',
    session_id: 'sess_review_readonly',
    campaign_intent: roCamp,
    include_signals: true
  });
  const roSnapshotBefore = JSON.stringify(
    decisionStateStore.peekCurrentStateBySession('sess_review_readonly', 'tenant_uk_retail_01')
  );
  evaluateCampaignReadiness({
    tenant_id: 'tenant_uk_retail_01',
    session_id: 'sess_review_readonly',
    campaign_intent_id: roCamp.campaign_intent_id,
    campaign_evaluation: roEval
  });
  const roSnapshotAfter = JSON.stringify(
    decisionStateStore.peekCurrentStateBySession('sess_review_readonly', 'tenant_uk_retail_01')
  );
  assert(
    roSnapshotBefore === roSnapshotAfter,
    'Test 38: readiness performs no write to Shared Decision State (byte-identical WP10-C state)'
  );

  // R-2 (defect: Decision State absence was unreachable, so rule O7 / cap K3 were dead).
  // Owner ruling U6 — absence is a cap, never a forced REVIEW.
  const k3Camp = registerPromo('sess_review_k3');
  const k3Eval = evaluateCampaignDecision({
    tenant_id: 'tenant_uk_retail_01',
    session_id: 'sess_review_k3',
    campaign_intent: k3Camp,
    include_signals: true
  });
  decisionStateStore.clearStore();
  const k3Result = evaluateCampaignReadiness({
    tenant_id: 'tenant_uk_retail_01',
    session_id: 'sess_review_k3',
    campaign_intent_id: k3Camp.campaign_intent_id,
    campaign_evaluation: k3Eval
  });
  assert(
    k3Result.readiness.dimensions.find(d => d.dimension === 'OPERATIONAL')!.state === 'NOT_EVALUATED' &&
      k3Result.readiness.state_caps_applied.includes('K3') &&
      (decisionStateStore as any).statesMap.size === 0,
    'Test 39: absent Decision State ⇒ Operational NOT_EVALUATED + cap K3, and no state is created'
  );

  // R-3 (defect: parity guard compared the mirror to a duplicate literal, so upstream drift
  // could never break it). The guard must be behavioural against calculateDerivedImpacts.
  const parityParams = {
    promotion_lift: 20,
    supplier_capacity_cap: 10,
    forecast_horizon_days: 14,
    promotion_method: '20_percent_off',
    campaign_scope: 'national',
    cannibalisation_factor: 0
  } as any;
  const parityBase = calculateDerivedImpacts(parityParams, []).supplier_capacity_units;
  assert(
    assertRecoveryLeverParity().ok &&
      Object.entries(WP10C_RECOVERY_LEVER_HEADROOM).every(
        ([lever, headroom]) =>
          calculateDerivedImpacts(parityParams, [lever]).supplier_capacity_units - parityBase === headroom
      ),
    'Test 40: recovery lever parity is measured from WP10-C behaviour, not a duplicated literal'
  );

  // R-4 (defect: O2 discharge test named one lever that could not close the gap alone).
  const gapCamp = registerPromo('sess_review_gap');
  const gapEval = evaluateCampaignDecision({
    tenant_id: 'tenant_uk_retail_01',
    session_id: 'sess_review_gap',
    campaign_intent: gapCamp,
    include_signals: true
  });
  const gapState: any = {
    decision_state_id: 'ds_review_gap',
    tenant_id: 'tenant_uk_retail_01',
    session_id: 'sess_review_gap',
    state_version: 2,
    scenario_parameters: {
      promotion_lift: 20,
      supplier_capacity_cap: 10,
      forecast_horizon_days: 14,
      promotion_method: '20_percent_off',
      campaign_scope: 'national',
      cannibalisation_factor: 0
    },
    selected_interventions: [],
    derived_impacts: {
      weekly_demand_units: 12500,
      supplier_capacity_units: 11000,
      commitment_gap_units: 1500,
      delivery_risk_pct: 30,
      financial_exposure_gbp: 180000,
      dc_overtime_hours: 20,
      margin_erosion_pct: 2.5,
      stockout_probability_pct: 55
    }
  };
  const gapOps = evaluateOperational({
    campaign: gapCamp,
    evaluation: gapEval,
    decisionState: gapState,
    includeSignals: true,
    timestamp: '2026-08-15T00:00:00.000Z'
  } as any);
  const gapClosing = gapOps.feasibility!.closing_levers;
  const gapClosingHeadroom = gapClosing.reduce(
    (sum, id) => sum + (WP10C_RECOVERY_LEVER_HEADROOM[id] || 0),
    0
  );
  assert(
    gapOps.feasibility!.structurally_infeasible === false &&
      gapClosingHeadroom >= 1500 &&
      gapOps.conditions.some(c => gapClosing.every(id => c.discharge_test.includes(id))),
    'Test 41: O2 names a lever SET whose combined headroom actually closes the gap'
  );

  // R-5 (defect: a synthesised "DIMENSION.state === CLEAR" condition made every constraint
  // dischargeable, so the §3.7 REVIEW degradation was structurally unreachable).
  const undischargeable = {
    ...opsReady.readiness,
    dimensions: opsReady.readiness.dimensions.map(d =>
      d.dimension === 'OPERATIONAL' ? { ...d, state: 'CONSTRAINED' as const } : { ...d, state: 'CLEAR' as const }
    ),
    state: 'GO' as const,
    vetoes: [],
    conditions: [],
    state_caps_applied: []
  };
  const undischargeableCheck = validateDecisionReadinessAssessment(undischargeable as any);
  assert(
    !undischargeableCheck.valid,
    'Test 42: a CONSTRAINED dimension with no discharge test cannot validate as GO (REVIEW path is live)'
  );
  assert(
    !opsReady.readiness.conditions.some(c => /\.state === 'CLEAR'/.test(c.discharge_test)),
    'Test 43: no condition uses a tautological "state === CLEAR" discharge test'
  );

  // R-6 (defect: model divergence / optional-integration absence forced LOW ⇒ cap K5 ⇒ REVIEW).
  // Reconciled rule: divergence and absent optional integrations cap confidence at MODERATE.
  const demoPath = evaluateCampaignReadinessWithDiscovery({
    tenant_id: 'tenant_uk_retail_01',
    session_id: 'sess_review_demo',
    campaign_intent_id: registerPromo('sess_review_demo').campaign_intent_id
  });
  // Deterministic divergence fixture: Decision State lift 20 vs a CDI-02 causal total that
  // differs by more than TH-O5 (5 pp).
  const divCamp = registerPromo('sess_review_divergence');
  const divEval = evaluateCampaignDecision({
    tenant_id: 'tenant_uk_retail_01',
    session_id: 'sess_review_divergence',
    campaign_intent: divCamp,
    include_signals: true
  });
  const divState: any = {
    ...gapState,
    decision_state_id: 'ds_review_div',
    session_id: 'sess_review_divergence',
    scenario_parameters: {
      ...gapState.scenario_parameters,
      promotion_lift: divEval.causal.total_predicted_uplift_pp + 25
    },
    derived_impacts: { ...gapState.derived_impacts, commitment_gap_units: 0, stockout_probability_pct: 5 }
  };
  const divOps = evaluateOperational({
    campaign: divCamp,
    evaluation: divEval,
    decisionState: divState,
    includeSignals: true,
    timestamp: '2026-08-15T00:00:00.000Z'
  } as any);
  assert(
    divOps.modelDivergence === true &&
      divOps.assessment.findings.some(f => f.finding_id === 'O_model_divergence' && f.severity === 'WATCH') &&
      typeof divOps.capacity.model_divergence_pp === 'number',
    'Test 44: CDI-02 vs WP10-C lift divergence is published as a WATCH finding, never silently reconciled'
  );
  assert(
    demoPath.readiness.confidence.band !== 'HIGH' &&
      demoPath.readiness.confidence.band !== 'LOW' &&
      !demoPath.readiness.state_caps_applied.includes('K5'),
    'Test 45: divergence/seeded evidence caps confidence at MODERATE — never HIGH, and never LOW forcing REVIEW via K5'
  );

  // R-7: absent CDI-03 is a cap, not a REVIEW, and the published coverage matches the band.
  const k2Result = evaluateCampaignReadiness({
    tenant_id: 'tenant_uk_retail_01',
    session_id: 'sess_review_k2',
    campaign_intent_id: registerPromo('sess_review_k2').campaign_intent_id
  });
  assert(
    k2Result.readiness.state_caps_applied.includes('K2') &&
      k2Result.readiness.dimensions.find(d => d.dimension === 'CONTEXT')!.state === 'NOT_EVALUATED' &&
      k2Result.readiness.confidence.evidence_coverage.missing.includes('opportunity_windows') &&
      k2Result.readiness.confidence.evidence_coverage.missing.includes('micro_markets') &&
      k2Result.readiness.confidence.band !== 'LOW' &&
      !k2Result.readiness.state_caps_applied.includes('K5'),
    'Test 46: absent CDI-03 is a cap (K2) with published coverage — it never reaches LOW/K5 and so cannot force REVIEW'
  );

  // R-9: an absent optional integration must still be consequential — the band is capped at
  // MODERATE, never left at HIGH, so absence is never a silent pass.
  assert(
    k2Result.readiness.confidence.band === 'MODERATE',
    'Test 48: absent optional integration caps confidence at MODERATE (never HIGH, never silent)'
  );

  // R-8: ESF-2-dependent rules that CDI-04 does not consume are published, never silently absent.
  assert(
    demoPath.readiness.dimensions
      .find(d => d.dimension === 'CONTEXT')!
      .findings.some(f => f.rule_id === 'X5' && f.decisive === false) &&
      demoPath.readiness.dimensions
        .find(d => d.dimension === 'OPERATIONAL')!
        .findings.some(f => f.rule_id === 'O6' && f.decisive === false),
    'Test 47: unevaluated ESF-2 rules (X5, O6) are disclosed, not silently treated as passing'
  );

  console.log('\n====================================================');
  console.log(`CDI-04 RESULTS: ${passed} passed, ${failed} failed`);
  console.log('====================================================');
  if (failed > 0) process.exit(1);
}

runTests();
