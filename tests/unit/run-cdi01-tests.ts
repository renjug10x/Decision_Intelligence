/**
 * Unit Test Suite for CogniX CDI-01 Campaign Decision Canvas & Intent Model
 * Run via: node --import tsx tests/unit/run-cdi01-tests.ts
 */

import {
  assertNoFutureCdiCalculations,
  createDefaultCampaignIntentDraft,
  deriveCanvasProgress,
  evaluateCanvasAreaStructural,
  projectCampaignIntentToCommercialIntent,
  validateCampaignIntent,
  validateCommercialIntent,
  validateJourneyEvent,
  calculateDerivedImpacts
} from '../../packages/contracts/src/index';
import {
  clearCampaignIntents,
  getCampaignIntentById,
  getCurrentCampaignIntent,
  registerCampaignIntent,
  saveCampaignIntentDraft
} from '../../lib/campaign-intent-store';
import {
  clearCommercialIntents,
  getCurrentCommercialIntent,
  registerCommercialIntent
} from '../../lib/commercial-intent-store';
import { transitionDecisionState, getDecisionState } from '../../lib/decision-state-store';

function runTests() {
  console.log('====================================================');
  console.log('COGNIX CDI-01 CAMPAIGN DECISION CANVAS UNIT TESTS');
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

  clearCampaignIntents();
  clearCommercialIntents();

  // TEST 1: Default draft has four-area structure
  const draft = createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_cdi01');
  assert(
    !!draft.campaign_intent &&
      !!draft.baseline_objective &&
      !!draft.audience_market &&
      !!draft.decision_context &&
      draft.status === 'DRAFT' &&
      draft.synthetic_demo === true,
    'Test 1: Default draft exposes four-area CampaignIntent structure with synthetic_demo'
  );

  // TEST 2: Progressive completion tracking
  const structuralAreas = evaluateCanvasAreaStructural(draft);
  const progress = deriveCanvasProgress(draft);
  assert(
    structuralAreas.includes('CAMPAIGN_INTENT') &&
      structuralAreas.includes('BASELINE_OBJECTIVE') &&
      structuralAreas.includes('AUDIENCE_MARKET') &&
      structuralAreas.includes('DECISION_CONTEXT') &&
      progress.completed_areas.length === 0 &&
      progress.ready_to_register === true,
    'Test 2: Default draft areas are structurally complete and ready_to_register with 0 completed_areas until confirmed'
  );

  // TEST 3: Required field semantics — incomplete intent rejected
  const incomplete = {
    ...draft,
    campaign_intent: { ...draft.campaign_intent, framing_question: '', category: '' }
  };
  const incompleteVal = validateCampaignIntent(incomplete);
  assert(
    !incompleteVal.valid && incompleteVal.errors.some(e => e.includes('framing_question')),
    'Test 3: Required Campaign Intent fields enforced'
  );

  // TEST 4: KNOWN_DATES requires planned dates
  const knownDates = {
    ...draft,
    audience_market: {
      ...draft.audience_market,
      timing_mode: 'KNOWN_DATES' as const,
      planned_start: undefined,
      planned_end: undefined
    }
  };
  const datesVal = validateCampaignIntent(knownDates);
  assert(
    !datesVal.valid && datesVal.errors.some(e => e.includes('planned_start')),
    'Test 4: Optional/required timing semantics — KNOWN_DATES requires dates'
  );

  // TEST 5: FIND_BEST_WINDOW does not require dates
  const findWindow = {
    ...draft,
    audience_market: {
      ...draft.audience_market,
      timing_mode: 'FIND_BEST_WINDOW' as const,
      planned_start: undefined,
      planned_end: undefined
    }
  };
  assert(validateCampaignIntent(findWindow).valid, 'Test 5: FIND_BEST_WINDOW allows omitted dates');

  // TEST 6: Store tenant/session isolation
  clearCampaignIntents();
  const a = saveCampaignIntentDraft({
    ...createDefaultCampaignIntentDraft('tenant_a', 'sess_1'),
    campaign_intent: {
      ...createDefaultCampaignIntentDraft('tenant_a', 'sess_1').campaign_intent,
      framing_question: 'Tenant A framing'
    }
  });
  const b = getCurrentCampaignIntent('tenant_b', 'sess_1');
  assert(
    a.tenant_id === 'tenant_a' &&
      b.tenant_id === 'tenant_b' &&
      b.campaign_intent.framing_question !== 'Tenant A framing',
    'Test 6: Campaign Intent store preserves tenant/session isolation'
  );

  // TEST 7: Registration + SDS transition
  clearCampaignIntents();
  const toRegister = {
    ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_cdi01_reg'),
    campaign_intent: {
      ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_cdi01_reg').campaign_intent,
      intervention_posture: 'CONSIDER_DO_NOTHING' as const
    }
  };
  const registered = registerCampaignIntent(toRegister);
  const before = getDecisionState('tenant_uk_retail_01', 'sess_cdi01_reg');
  const transitioned = transitionDecisionState(
    'tenant_uk_retail_01',
    'sess_cdi01_reg',
    'REGISTER_CAMPAIGN_INTENT',
    {
      campaign_intent_ref: registered.campaign_intent_id,
      intervention_posture: registered.campaign_intent.intervention_posture,
      promotion_lift: 0
    }
  );
  assert(
    registered.status === 'REGISTERED' &&
      transitioned.state_version === before.state_version + 1 &&
      transitioned.campaign_intent_ref === registered.campaign_intent_id,
    'Test 7: Registration updates Shared Decision State (vN → vN+1) with campaign_intent_ref'
  );

  // TEST 8: Commercial Intent projection only for CONSIDER_PROMOTION
  const promoCampaign = {
    ...registered,
    campaign_intent: {
      ...registered.campaign_intent,
      intervention_posture: 'CONSIDER_PROMOTION' as const,
      provisional_mechanic: '20_percent_off',
      provisional_discount_depth: 20
    }
  };
  const projected = projectCampaignIntentToCommercialIntent(promoCampaign);
  const noneProjected = projectCampaignIntentToCommercialIntent(registered);
  assert(
    !!projected &&
      validateCommercialIntent(projected).valid &&
      noneProjected === null,
    'Test 8: Commercial Intent projection is additive and promotion-posture gated'
  );

  // TEST 9: Existing Commercial Intent compatibility
  clearCommercialIntents();
  if (projected) {
    const commercial = registerCommercialIntent(projected);
    const current = getCurrentCommercialIntent(commercial.tenant_id, commercial.session_id);
    assert(
      current.commercial_intent_id === commercial.commercial_intent_id &&
        current.provenance.campaign_intent_id === promoCampaign.campaign_intent_id,
      'Test 9: Existing Commercial Intent store accepts CDI-01 projection without breaking IFI-01'
    );
  } else {
    assert(false, 'Test 9: Existing Commercial Intent store accepts CDI-01 projection without breaking IFI-01');
  }

  // TEST 10: Canvas state transitions (draft save → progress)
  clearCampaignIntents();
  const draft2 = createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_progress');
  draft2.canvas_progress.active_area = 'BASELINE_OBJECTIVE';
  const saved = saveCampaignIntentDraft(draft2);
  assert(
    saved.status === 'DRAFT' && saved.canvas_progress.active_area === 'BASELINE_OBJECTIVE',
    'Test 10: Canvas draft state transitions preserve active_area'
  );

  // TEST 11: Absence of CDI-02+ calculation fields
  const leakage = assertNoFutureCdiCalculations(registered);
  const smuggled = assertNoFutureCdiCalculations({
    ...registered,
    counterfactual_baseline: { delta: 1 }
  });
  assert(
    leakage.ok && !smuggled.ok && smuggled.offenders.includes('counterfactual_baseline'),
    'Test 11: CDI-01 payloads reject future CDI calculation field leakage'
  );

  // TEST 12: Journey telemetry event validation
  const journey = validateJourneyEvent({
    event_id: 'evt_cdi01',
    event_type: 'CAMPAIGN_INTENT_REGISTERED',
    tenant_id: 'tenant_uk_retail_01',
    session_id: 'sess_cdi01_reg',
    user_id: 'user_exec_01',
    timestamp: new Date().toISOString(),
    schema_version: '1.0'
  });
  assert(journey.valid, 'Test 12: CAMPAIGN_INTENT_REGISTERED journey event validates');

  // TEST 13: Intervention posture encodes promotion-is-optional premise
  assert(
    ['UNDECIDED', 'CONSIDER_PROMOTION', 'CONSIDER_NON_PROMOTION', 'CONSIDER_DO_NOTHING'].every(p =>
      typeof p === 'string'
    ) && draft.campaign_intent.intervention_posture === 'UNDECIDED',
    'Test 13: Default intervention posture is UNDECIDED (promotion not assumed)'
  );

  // TEST 14: WP10-C impact engine regression
  const impacts = calculateDerivedImpacts(
    {
      promotion_lift: 20,
      supplier_capacity_cap: 10,
      forecast_horizon_days: 14,
      promotion_method: '20_percent_off',
      campaign_scope: 'national',
      cannibalisation_factor: 0,
      event_boost: 'none'
    },
    []
  );
  assert(impacts.weekly_demand_units === 12000, 'Test 14: WP10-C derived impact regression clean');

  // TEST 15: IFI-01 Commercial Intent validation regression
  assert(
    validateCommercialIntent({
      commercial_intent_id: 'intent_cdi01_reg',
      tenant_id: 'tenant_uk_retail_01',
      session_id: 'sess_x',
      category: 'Fresh Dairy',
      sku_scope: ['P004'],
      region: 'North West',
      promotion_type: '20_percent_off',
      discount_depth: 20,
      planned_start: '2026-08-20T00:00:00.000Z',
      planned_end: '2026-08-27T00:00:00.000Z',
      expected_uplift: 25,
      source_system: 'cognix_promotion_planner',
      source_type: 'PROMOTION_PLANNER',
      created_at: '2026-08-15T08:00:00.000Z',
      provenance: {},
      synthetic_demo: true,
      schema_version: '1.0'
    }).valid,
    'Test 15: IFI-01 Commercial Intent regression clean'
  );

  // TEST 16: Incomplete registration rejected
  let threw = false;
  try {
    registerCampaignIntent({
      ...draft,
      campaign_intent: { ...draft.campaign_intent, framing_question: '' },
      status: 'REGISTERED'
    } as any);
  } catch {
    threw = true;
  }
  assert(threw, 'Test 16: Incomplete four-area registration is rejected');

  // TEST 17: Campaign Intent ids are collision-free across ambiguous tenant/session pairs.
  // ('acme_eu','north') and ('acme','eu_north') sanitise to the same readable stem.
  clearCampaignIntents();
  const collideA = getCurrentCampaignIntent('acme_eu', 'north');
  const collideB = getCurrentCampaignIntent('acme', 'eu_north');
  assert(
    collideA.campaign_intent_id !== collideB.campaign_intent_id,
    'Test 17: Ambiguous tenant/session pairs produce distinct Campaign Intent ids',
    `${collideA.campaign_intent_id} === ${collideB.campaign_intent_id}`
  );

  // TEST 18: A known id does not authorise a cross-tenant read.
  clearCampaignIntents();
  const victim = getCurrentCampaignIntent('tenant_victim', 'sess_001');
  assert(
    getCampaignIntentById(victim.campaign_intent_id, 'tenant_attacker') === null &&
      getCampaignIntentById(victim.campaign_intent_id, 'tenant_victim') !== null,
    'Test 18: Campaign Intent id lookup is tenant-scoped'
  );

  // TEST 19: A payload cannot relocate an existing intent into another tenant.
  clearCampaignIntents();
  const owned = getCurrentCampaignIntent('tenant_good', 'sess_x');
  let relocationBlocked = false;
  try {
    saveCampaignIntentDraft({ ...owned, tenant_id: 'tenant_other' });
  } catch {
    relocationBlocked = true;
  }
  assert(
    relocationBlocked && getCurrentCampaignIntent('tenant_good', 'sess_x').tenant_id === 'tenant_good',
    'Test 19: Cross-tenant Campaign Intent relocation is rejected'
  );

  // TEST 20: Placeholder promotion parameters are labelled, never presented as stated intent.
  clearCampaignIntents();
  const promoDraft = getCurrentCampaignIntent('tenant_prov', 'sess_prov');
  const unstated = projectCampaignIntentToCommercialIntent({
    ...promoDraft,
    campaign_intent: {
      ...promoDraft.campaign_intent,
      intervention_posture: 'CONSIDER_PROMOTION',
      provisional_mechanic: undefined,
      provisional_discount_depth: undefined
    }
  });
  const statedMechanic = projectCampaignIntentToCommercialIntent({
    ...promoDraft,
    campaign_intent: {
      ...promoDraft.campaign_intent,
      intervention_posture: 'CONSIDER_PROMOTION',
      provisional_mechanic: 'BOGOF',
      provisional_discount_depth: 15
    }
  });
  assert(
    unstated?.provenance.promotion_type_source === 'cdi01_placeholder_default' &&
      unstated?.provenance.discount_depth_source === 'cdi01_placeholder_default' &&
      statedMechanic?.provenance.promotion_type_source === 'canvas_stated' &&
      statedMechanic?.provenance.discount_depth_source === 'canvas_stated',
    'Test 20: Projected promotion parameters distinguish stated intent from placeholder defaults'
  );

  // TEST 21: Non-promotion postures still reach Shared Decision State via campaign_intent_ref.
  clearCampaignIntents();
  const npDraft = getCurrentCampaignIntent('tenant_np', 'sess_np');
  const npRegistered = registerCampaignIntent({
    ...npDraft,
    campaign_intent: { ...npDraft.campaign_intent, intervention_posture: 'CONSIDER_NON_PROMOTION' }
  });
  const npBefore = getDecisionState('tenant_np', 'sess_np');
  const npState = transitionDecisionState('tenant_np', 'sess_np', 'REGISTER_CAMPAIGN_INTENT', {
    campaign_intent_ref: npRegistered.campaign_intent_id,
    intervention_posture: 'CONSIDER_NON_PROMOTION',
    promotion_lift: 0,
    promotion_method: 'none',
    campaign_scope: 'regional'
  });
  assert(
    npState.campaign_intent_ref === npRegistered.campaign_intent_id &&
      npState.state_version === npBefore.state_version + 1 &&
      !npState.commercial_intent_ref &&
      projectCampaignIntentToCommercialIntent(npRegistered) === null,
    'Test 21: Non-promotion Campaign Intent joins Decision State without a phantom Commercial Intent'
  );

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
