/**
 * Unit Test Suite for CogniX CDI-02 Counterfactual Baseline & Causal Campaign Engine
 * Run via: node --import tsx tests/unit/run-cdi02-tests.ts
 */

import {
  createDefaultCampaignIntentDraft,
  projectCampaignIntentToCommercialIntent,
  validateCampaignIntent,
  validateCommercialIntent,
  validateCounterfactualBaseline,
  validateCausalDemandContribution,
  calculateDerivedImpacts
} from '../../packages/contracts/src/index';
import {
  clearCampaignIntents,
  registerCampaignIntent,
  saveCampaignIntentDraft
} from '../../lib/campaign-intent-store';
import {
  evaluateCampaignDecision,
  evaluateCausalDemandContribution,
  evaluateCounterfactualBaseline,
  resolveStatedMechanic
} from '../../lib/campaign-causal-engine';
import { simulateEnterpriseSignalTimelines } from '../../services/world/src/dynamic-signal-simulator';
import { listExternalSignalConnectors } from '../../services/world/src/external-signal-connector';

function runTests() {
  console.log('====================================================');
  console.log('COGNIX CDI-02 COUNTERFACTUAL & CAUSAL UNIT TESTS');
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

  const base = createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_cdi02');
  const registeredDoNothing = registerCampaignIntent({
    ...base,
    campaign_intent: {
      ...base.campaign_intent,
      intervention_posture: 'CONSIDER_DO_NOTHING'
    }
  });

  // TEST 1: Three-way baseline separation exists
  const cfDoNothing = evaluateCounterfactualBaseline(registeredDoNothing, undefined, { include_signals: false });
  assert(
    cfDoNothing.current_baseline.label === 'CURRENT_BASELINE' &&
      cfDoNothing.expected_without_intervention.label === 'EXPECTED_WITHOUT_INTERVENTION' &&
      cfDoNothing.predicted_with_intervention.label === 'PREDICTED_WITH_INTERVENTION' &&
      validateCounterfactualBaseline(cfDoNothing).valid,
    'Test 1: Counterfactual baseline separates Current / Without / With trajectories'
  );

  // TEST 2: Do Nothing → predicted ≈ without
  assert(
    Math.abs(
      cfDoNothing.predicted_with_intervention.volume_units -
        cfDoNothing.expected_without_intervention.volume_units
    ) < 1 && cfDoNothing.campaign_delta.intervention_indistinguishable_from_do_nothing,
    'Test 2: CONSIDER_DO_NOTHING predicted path matches expected without intervention'
  );

  // TEST 3: Stated promotion produces positive campaign delta
  clearCampaignIntents();
  const promoDraft = createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_cdi02_promo');
  const promo = registerCampaignIntent({
    ...promoDraft,
    campaign_intent: {
      ...promoDraft.campaign_intent,
      intervention_posture: 'CONSIDER_PROMOTION',
      provisional_mechanic: '20_percent_off',
      provisional_discount_depth: 20
    },
    audience_market: {
      ...promoDraft.audience_market,
      timing_mode: 'KNOWN_DATES',
      planned_start: '2026-08-20T00:00:00.000Z',
      planned_end: '2026-08-27T00:00:00.000Z'
    }
  });
  const cfPromo = evaluateCounterfactualBaseline(promo, undefined, { include_signals: false });
  assert(
    cfPromo.campaign_delta.volume_delta_units > 0 &&
      cfPromo.predicted_with_intervention.volume_index_pct >
        cfPromo.expected_without_intervention.volume_index_pct,
    'Test 3: Canvas-stated promotion yields positive campaign delta vs do-nothing'
  );

  // TEST 4: Causal reconciliation
  const causalPromo = evaluateCausalDemandContribution(promo, { include_signals: false });
  assert(
    causalPromo.reconciliation_ok &&
      validateCausalDemandContribution(causalPromo).valid &&
      Math.abs(causalPromo.reconciled_sum_pp - causalPromo.total_predicted_uplift_pp) < 0.05,
    'Test 4: Causal demand contributions reconcile to total predicted uplift'
  );

  // TEST 5: Placeholder provenance excluded from causal attribution
  clearCampaignIntents();
  const placeholderCampaign = registerCampaignIntent({
    ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_cdi02_ph'),
    campaign_intent: {
      ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_cdi02_ph').campaign_intent,
      intervention_posture: 'CONSIDER_PROMOTION'
      // no provisional_mechanic / discount → projection uses placeholders
    }
  });
  const projected = projectCampaignIntentToCommercialIntent(placeholderCampaign)!;
  const resolved = resolveStatedMechanic(placeholderCampaign);
  const causalPh = evaluateCausalDemandContribution(placeholderCampaign, { include_signals: false });
  const mechanicDriver = causalPh.drivers.find(d => d.driver_id === 'mechanic_response')!;
  assert(
    projected.provenance.promotion_type_source === 'cdi01_placeholder_default' &&
      projected.provenance.discount_depth_source === 'cdi01_placeholder_default' &&
      !resolved.mechanic_attributed &&
      mechanicDriver.contribution_pp === 0 &&
      !mechanicDriver.attributed &&
      causalPh.placeholder_fields_excluded.includes('promotion_type') &&
      causalPh.placeholder_fields_excluded.includes('discount_depth'),
    'Test 5: cdi01_placeholder_default fields are never attributed as causal campaign inputs'
  );

  // TEST 6: Placeholder promotion campaign delta collapses toward do-nothing (no mechanic)
  const cfPh = evaluateCounterfactualBaseline(placeholderCampaign, causalPh, { include_signals: false });
  assert(
    Math.abs(cfPh.campaign_delta.volume_delta_units) <
      Math.abs(cfPromo.campaign_delta.volume_delta_units) / 2,
    'Test 6: Placeholder-only promotion does not invent a stated-mechanic uplift'
  );

  // TEST 7: SKU/context differentiation
  clearCampaignIntents();
  const skuA = registerCampaignIntent({
    ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_sku_a'),
    campaign_intent: {
      ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_sku_a').campaign_intent,
      intervention_posture: 'CONSIDER_PROMOTION',
      provisional_mechanic: '20_percent_off',
      provisional_discount_depth: 20,
      sku_scope: ['P004'],
      category: 'Fresh Dairy'
    },
    audience_market: {
      ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_sku_a').audience_market,
      region: 'North West',
      timing_mode: 'KNOWN_DATES',
      planned_start: '2026-08-20T00:00:00.000Z',
      planned_end: '2026-08-27T00:00:00.000Z'
    }
  });
  const skuB = registerCampaignIntent({
    ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_sku_b'),
    campaign_intent: {
      ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_sku_b').campaign_intent,
      intervention_posture: 'CONSIDER_PROMOTION',
      provisional_mechanic: '20_percent_off',
      provisional_discount_depth: 20,
      sku_scope: ['P999'],
      category: 'Ambient Bakery'
    },
    audience_market: {
      ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_sku_b').audience_market,
      region: 'London',
      timing_mode: 'KNOWN_DATES',
      planned_start: '2026-08-20T00:00:00.000Z',
      planned_end: '2026-08-27T00:00:00.000Z'
    }
  });
  const causalA = evaluateCausalDemandContribution(skuA, { include_signals: false });
  const causalB = evaluateCausalDemandContribution(skuB, { include_signals: false });
  assert(
    causalA.total_predicted_uplift_pp !== causalB.total_predicted_uplift_pp,
    'Test 7: SKU/context differentiation changes deterministic causal uplift'
  );

  // TEST 8: Non-promotion posture uses non-promo lever, not placeholders
  clearCampaignIntents();
  const nonPromo = registerCampaignIntent({
    ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_nonpromo'),
    campaign_intent: {
      ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_nonpromo').campaign_intent,
      intervention_posture: 'CONSIDER_NON_PROMOTION'
    }
  });
  const causalNon = evaluateCausalDemandContribution(nonPromo, { include_signals: false });
  assert(
    causalNon.drivers.find(d => d.driver_id === 'non_promotion_response')!.attributed &&
      !causalNon.drivers.find(d => d.driver_id === 'mechanic_response')!.attributed &&
      causalNon.total_predicted_uplift_pp > 0,
    'Test 8: CONSIDER_NON_PROMOTION attributes non-promotion response without promo mechanic'
  );

  // TEST 9: Tenant/session isolation on evaluation
  let crossTenantBlocked = false;
  try {
    evaluateCampaignDecision({
      tenant_id: 'tenant_other',
      session_id: nonPromo.session_id,
      campaign_intent: nonPromo
    });
  } catch (e: any) {
    crossTenantBlocked = String(e.message).includes('Tenant boundary');
  }
  assert(crossTenantBlocked, 'Test 9: Cross-tenant evaluation is rejected');

  // TEST 10: Cross-session adversarial rejection
  let crossSessionBlocked = false;
  try {
    evaluateCampaignDecision({
      tenant_id: nonPromo.tenant_id,
      session_id: 'sess_attacker',
      campaign_intent: nonPromo
    });
  } catch (e: any) {
    crossSessionBlocked = String(e.message).includes('Session boundary');
  }
  assert(crossSessionBlocked, 'Test 10: Cross-session adversarial evaluation is rejected');

  // TEST 11: Combined evaluation response shape
  const combined = evaluateCampaignDecision({
    tenant_id: promo.tenant_id,
    session_id: promo.session_id,
    campaign_intent: promo,
    include_signals: true
  });
  assert(
    !!combined.counterfactual &&
      !!combined.causal &&
      combined.campaign_intent_id === promo.campaign_intent_id &&
      combined.causal.synthetic_demo === true,
    'Test 11: Combined evaluation returns counterfactual + causal with synthetic provenance'
  );

  // TEST 12: ESF-2 signal consumption does not break determinism for identical inputs
  const eval1 = evaluateCampaignDecision({
    tenant_id: promo.tenant_id,
    session_id: promo.session_id,
    campaign_intent: promo,
    include_signals: true
  });
  const eval2 = evaluateCampaignDecision({
    tenant_id: promo.tenant_id,
    session_id: promo.session_id,
    campaign_intent: promo,
    include_signals: true
  });
  assert(
    eval1.causal.total_predicted_uplift_pp === eval2.causal.total_predicted_uplift_pp &&
      eval1.counterfactual.predicted_with_intervention.volume_units ===
        eval2.counterfactual.predicted_with_intervention.volume_units,
    'Test 12: ESF-2-integrated evaluation is deterministic for identical CampaignIntent'
  );

  // TEST 13: CDI-01 contract regression
  assert(
    validateCampaignIntent(promo, { requireRegistered: true }).valid,
    'Test 13: CDI-01 CampaignIntent regression clean'
  );

  // TEST 14: IFI-01 Commercial Intent regression
  assert(
    validateCommercialIntent(
      projectCampaignIntentToCommercialIntent(promo)!
    ).valid,
    'Test 14: IFI-01 Commercial Intent projection regression clean'
  );

  // TEST 15: WP10-C impact engine regression
  assert(
    calculateDerivedImpacts(
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
    ).weekly_demand_units === 12000,
    'Test 15: WP10-C derived impact regression clean'
  );

  // TEST 16: ESF-2 simulator regression
  const sim = simulateEnterpriseSignalTimelines({
    context: {
      session_id: 'sess_cdi02_esf2',
      decision_state_id: 'ds_cdi02',
      decision_state_version: 1,
      tenant_id: 'tenant_uk_retail_01',
      scenario_id: 'SCN-PROMO-01',
      scenario_family: 'promotion_surge',
      promotion_lift: 20,
      supplier_capacity_cap: 10,
      forecast_horizon_days: 14,
      promotion_method: '20_percent_off',
      campaign_scope: 'national',
      cannibalisation_factor: 0,
      event_boost: 'none',
      selected_interventions: []
    }
  });
  assert(sim.timelines.length === 4, 'Test 16: ESF-2 dynamic simulation regression clean');

  // TEST 17: ESF-3 connector registry regression
  assert(listExternalSignalConnectors().length === 7, 'Test 17: ESF-3 connector registry regression clean');

  // TEST 18: Without intervention exceeds current baseline (intrinsic drift)
  assert(
    cfDoNothing.expected_without_intervention.volume_index_pct >
      cfDoNothing.current_baseline.volume_index_pct,
    'Test 18: Expected without intervention includes intrinsic run-rate drift above current baseline'
  );

  // TEST 19: Draft save still works (CDI-01 lifecycle untouched)
  clearCampaignIntents();
  const draft = createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_draft_cdi02');
  const saved = saveCampaignIntentDraft(draft);
  assert(saved.status === 'DRAFT', 'Test 19: CDI-01 draft lifecycle remains intact');

  // TEST 20: Undecided posture also collapses to do-nothing prediction
  clearCampaignIntents();
  const undecided = registerCampaignIntent({
    ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_undecided'),
    campaign_intent: {
      ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_undecided').campaign_intent,
      intervention_posture: 'UNDECIDED'
    }
  });
  const cfUnd = evaluateCounterfactualBaseline(undecided, undefined, { include_signals: false });
  assert(
    cfUnd.campaign_delta.intervention_indistinguishable_from_do_nothing,
    'Test 20: UNDECIDED posture does not invent an intervention uplift'
  );

  // ---------------------------------------------------------------------------
  // Independent review regressions (2026-08-15) — each pins a corrected defect.
  // ---------------------------------------------------------------------------

  // TEST 21: Do Nothing means "no intervention", NOT "no external change".
  // Intrinsic ambient drift still moves both paths. Promotional ESF-2 pressure must NOT
  // be seeded when stated promo depth is 0 (interim causal integrity — D1).
  clearCampaignIntents();
  const dnSig = registerCampaignIntent({
    ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_dn_signals'),
    campaign_intent: {
      ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_dn_signals').campaign_intent,
      intervention_posture: 'CONSIDER_DO_NOTHING'
    }
  });
  const dnSigCausal = evaluateCausalDemandContribution(dnSig, { include_signals: true });
  const dnSigDriver = dnSigCausal.drivers.find(d => d.driver_id === 'external_signal_response')!;
  const dnSigIntrinsic = dnSigCausal.drivers.find(d => d.driver_id === 'intrinsic_demand')!;
  const dnSigCf = evaluateCounterfactualBaseline(dnSig, dnSigCausal, { include_signals: true });
  assert(
    dnSigDriver.driver_class === 'ambient' &&
      dnSigDriver.contribution_pp === 0 &&
      dnSigCausal.intervention_uplift_pp === 0 &&
      dnSigIntrinsic.contribution_pp !== 0 &&
      Math.abs(
        dnSigCf.expected_without_intervention.volume_index_pct - (100 + dnSigIntrinsic.contribution_pp)
      ) < 0.05 &&
      dnSigCf.expected_without_intervention.waste_units ===
        dnSigCf.predicted_with_intervention.waste_units &&
      dnSigCf.campaign_delta.waste_delta_units === 0,
    'Test 21: Do Nothing keeps intrinsic ambient movement, seeds no promotional signal world, and has zero intervention waste delta',
    `signal_pp=${dnSigDriver.contribution_pp} without_idx=${dnSigCf.expected_without_intervention.volume_index_pct} waste_delta=${dnSigCf.campaign_delta.waste_delta_units}`
  );

  // TEST 22: Ambient signal movement must NOT be credited to the campaign.
  // Turning signals on shifts both paths equally, leaving Campaign Delta unchanged.
  clearCampaignIntents();
  const ambDraft = createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_ambient');
  const ambPromo = registerCampaignIntent({
    ...ambDraft,
    campaign_intent: {
      ...ambDraft.campaign_intent,
      intervention_posture: 'CONSIDER_PROMOTION',
      provisional_mechanic: '20_percent_off',
      provisional_discount_depth: 20
    },
    audience_market: {
      ...ambDraft.audience_market,
      timing_mode: 'KNOWN_DATES',
      planned_start: '2026-08-20T00:00:00.000Z',
      planned_end: '2026-08-27T00:00:00.000Z'
    }
  });
  const ambOff = evaluateCounterfactualBaseline(ambPromo, undefined, { include_signals: false });
  const ambOn = evaluateCounterfactualBaseline(ambPromo, undefined, { include_signals: true });
  assert(
    ambOn.expected_without_intervention.volume_index_pct >
      ambOff.expected_without_intervention.volume_index_pct &&
      ambOn.campaign_delta.volume_delta_units === ambOff.campaign_delta.volume_delta_units,
    'Test 22: External signal uplift shifts the without-intervention path, not the Campaign Delta',
    `delta_off=${ambOff.campaign_delta.volume_delta_units} delta_on=${ambOn.campaign_delta.volume_delta_units}`
  );

  // TEST 23: Components reconcile exactly to the predicted trajectory, and the campaign
  // is credited only with the intervention-class share.
  const recCausal = evaluateCausalDemandContribution(ambPromo, { include_signals: true });
  const recCf = evaluateCounterfactualBaseline(ambPromo, recCausal, { include_signals: true });
  const recAll = Number(recCausal.drivers.reduce((s, d) => s + d.contribution_pp, 0).toFixed(2));
  const recGap = Number(
    (recCf.predicted_with_intervention.volume_index_pct -
      recCf.expected_without_intervention.volume_index_pct).toFixed(2)
  );
  assert(
    Math.abs(recAll - recCausal.total_predicted_uplift_pp) < 0.005 &&
      Math.abs(
        recCausal.ambient_uplift_pp + recCausal.intervention_uplift_pp -
          recCausal.total_predicted_uplift_pp
      ) < 0.005 &&
      Math.abs(recGap - recCausal.intervention_uplift_pp) < 0.05 &&
      recCf.campaign_delta.attributable_uplift_pp === recCausal.intervention_uplift_pp &&
      recCausal.intervention_uplift_pp < recCausal.total_predicted_uplift_pp,
    'Test 23: Drivers reconcile to predicted index; Campaign Delta equals intervention share only',
    `all=${recAll} total=${recCausal.total_predicted_uplift_pp} ambient=${recCausal.ambient_uplift_pp} interv=${recCausal.intervention_uplift_pp} gap=${recGap}`
  );

  // TEST 24: An unattributed driver must never carry demand — otherwise the trajectory
  // moves while the UI presents the driver as excluded.
  const leakScan = [dnSigCausal, recCausal, causalPh, causalNon].every(c =>
    c.drivers.every(d => d.attributed || d.contribution_pp === 0)
  );
  assert(leakScan, 'Test 24: Unattributed drivers carry zero contribution across all postures');

  // TEST 25: Reconciliation must span ALL drivers. Summing only attributed rows would let
  // a non-zero unattributed driver drop out of both sides and still "reconcile".
  const tamperedCausal = {
    ...recCausal,
    drivers: recCausal.drivers.map(d =>
      d.driver_id === 'portfolio_effects' ? { ...d, attributed: false, contribution_pp: -3.5 } : d
    )
  };
  assert(
    !validateCausalDemandContribution(tamperedCausal).valid,
    'Test 25: Validator rejects a non-zero unattributed driver instead of silently dropping it'
  );

  // TEST 26/27: A by-id request is answered with that campaign or not at all — never by
  // silently substituting the caller's own current intent.
  clearCampaignIntents();
  const ownerIntent = registerCampaignIntent({
    ...createDefaultCampaignIntentDraft('tenant_owner', 'sess_owner'),
    campaign_intent: {
      ...createDefaultCampaignIntentDraft('tenant_owner', 'sess_owner').campaign_intent,
      intervention_posture: 'CONSIDER_NON_PROMOTION'
    }
  });
  registerCampaignIntent({
    ...createDefaultCampaignIntentDraft('tenant_intruder', 'sess_intruder'),
    campaign_intent: {
      ...createDefaultCampaignIntentDraft('tenant_intruder', 'sess_intruder').campaign_intent,
      intervention_posture: 'CONSIDER_DO_NOTHING'
    }
  });
  let byIdBlocked = false;
  try {
    evaluateCampaignDecision({
      tenant_id: 'tenant_intruder',
      session_id: 'sess_intruder',
      campaign_intent_id: ownerIntent.campaign_intent_id
    });
  } catch (e: any) {
    byIdBlocked = String(e.message).startsWith('CampaignIntentNotFound');
  }
  assert(byIdBlocked, 'Test 26: Cross-tenant by-id evaluation returns not-found, never a substituted intent');

  let unknownIdBlocked = false;
  try {
    evaluateCampaignDecision({
      tenant_id: 'tenant_intruder',
      session_id: 'sess_intruder',
      campaign_intent_id: 'cdi_intent_no_such_campaign'
    });
  } catch (e: any) {
    unknownIdBlocked = String(e.message).startsWith('CampaignIntentNotFound');
  }
  assert(unknownIdBlocked, 'Test 27: Unknown campaign_intent_id returns not-found, never a fallback evaluation');

  // TEST 28: Campaign economics must run in both directions. Promoted units carry an
  // eroded unit contribution, so depth cannot mechanically buy more contribution.
  function contributionDeltaAtDepth(depth: number): number {
    clearCampaignIntents();
    const d = createDefaultCampaignIntentDraft('tenant_uk_retail_01', `sess_econ_${depth}`);
    const c = registerCampaignIntent({
      ...d,
      campaign_intent: {
        ...d.campaign_intent,
        intervention_posture: 'CONSIDER_PROMOTION',
        provisional_mechanic: 'x_percent_off',
        provisional_discount_depth: depth
      },
      audience_market: {
        ...d.audience_market,
        timing_mode: 'KNOWN_DATES',
        planned_start: '2026-08-20T00:00:00.000Z',
        planned_end: '2026-08-27T00:00:00.000Z'
      }
    });
    return evaluateCounterfactualBaseline(c, undefined, { include_signals: false })
      .campaign_delta.contribution_delta_gbp;
  }
  const shallowDelta = contributionDeltaAtDepth(5);
  const deepDelta = contributionDeltaAtDepth(60);
  assert(
    shallowDelta > 0 && deepDelta < 0 && shallowDelta > deepDelta,
    'Test 28: Shallow discount is contribution-accretive while deep discount destroys contribution',
    `shallow=${shallowDelta} deep=${deepDelta}`
  );

  // TEST 29: Margin erosion is gated on the SAME provenance rule as demand attribution —
  // a placeholder depth must not move the economics either.
  clearCampaignIntents();
  const phEcon = registerCampaignIntent({
    ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_ph_econ'),
    campaign_intent: {
      ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_ph_econ').campaign_intent,
      intervention_posture: 'CONSIDER_PROMOTION'
    }
  });
  const phEconCf = evaluateCounterfactualBaseline(phEcon, undefined, { include_signals: false });
  assert(
    phEconCf.predicted_with_intervention.unit_contribution_gbp ===
      phEconCf.expected_without_intervention.unit_contribution_gbp,
    'Test 29: Placeholder promotion erodes no margin (economics honour the same provenance gate)',
    `pred=${phEconCf.predicted_with_intervention.unit_contribution_gbp} without=${phEconCf.expected_without_intervention.unit_contribution_gbp}`
  );

  // TEST 30: The counterfactual validator is a real guard, not decoration — a trajectory
  // that no longer matches its declared attributable uplift must be rejected.
  const tamperedBaseline = {
    ...recCf,
    campaign_delta: { ...recCf.campaign_delta, attributable_uplift_pp: recGap + 5 }
  };
  assert(
    validateCounterfactualBaseline(recCf).valid &&
      !validateCounterfactualBaseline(tamperedBaseline).valid,
    'Test 30: Counterfactual validator rejects a trajectory that does not reconcile to its Campaign Delta'
  );

  // ---------------------------------------------------------------------------
  // Interim causal integrity regressions (pre-CDI-06) — D1 ambient zero / D2 waste.
  // ---------------------------------------------------------------------------

  // TEST 31: Explicit promotion_lift 0 stays 0 in ESF-2 (never coerced to 20).
  const lift0 = simulateEnterpriseSignalTimelines({
    context: {
      session_id: 'sess_lift0',
      decision_state_id: 'ds_lift0',
      decision_state_version: 1,
      tenant_id: 'tenant_uk_retail_01',
      scenario_id: 'SCN-PROMO-01',
      scenario_family: 'promotion_surge',
      promotion_lift: 0,
      supplier_capacity_cap: 10,
      forecast_horizon_days: 14,
      promotion_method: 'none',
      campaign_scope: 'national',
      cannibalisation_factor: 0,
      event_boost: 'none',
      selected_interventions: []
    }
  });
  const lift20 = simulateEnterpriseSignalTimelines({
    context: {
      session_id: 'sess_lift20',
      decision_state_id: 'ds_lift20',
      decision_state_version: 1,
      tenant_id: 'tenant_uk_retail_01',
      scenario_id: 'SCN-PROMO-01',
      scenario_family: 'promotion_surge',
      promotion_lift: 20,
      supplier_capacity_cap: 10,
      forecast_horizon_days: 14,
      promotion_method: '20_percent_off',
      campaign_scope: 'national',
      cannibalisation_factor: 0,
      event_boost: 'none',
      selected_interventions: []
    }
  });
  const today0 = lift0.timelines[0].observations.find(o => o.period === 'Today')!;
  const today20 = lift20.timelines[0].observations.find(o => o.period === 'Today')!;
  assert(
    today0.delta_pct === 0 && today20.delta_pct > 0 && today0.delta_pct !== today20.delta_pct,
    'Test 31: Explicit promotion_lift 0 stays 0; distinct from default/20% world',
    `delta0=${today0.delta_pct} delta20=${today20.delta_pct}`
  );

  // TEST 32: Absent promotion_lift receives the intended default (20).
  const liftAbsent = simulateEnterpriseSignalTimelines({
    context: {
      session_id: 'sess_lift_abs',
      decision_state_id: 'ds_lift_abs',
      decision_state_version: 1,
      tenant_id: 'tenant_uk_retail_01',
      scenario_id: 'SCN-PROMO-01',
      scenario_family: 'promotion_surge',
      // promotion_lift omitted — default semantics
      supplier_capacity_cap: 10,
      forecast_horizon_days: 14,
      promotion_method: '20_percent_off',
      campaign_scope: 'national',
      cannibalisation_factor: 0,
      event_boost: 'none',
      selected_interventions: []
    } as any
  });
  const todayAbsent = liftAbsent.timelines[0].observations.find(o => o.period === 'Today')!;
  assert(
    todayAbsent.delta_pct === today20.delta_pct,
    'Test 32: Absent promotion_lift follows intended default (same as explicit 20)',
    `deltaAbsent=${todayAbsent.delta_pct} delta20=${today20.delta_pct}`
  );

  // TEST 33: Do Nothing does not receive promotional ambient signal uplift.
  clearCampaignIntents();
  const dnNoPromo = registerCampaignIntent({
    ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_dn_nopromo'),
    campaign_intent: {
      ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_dn_nopromo').campaign_intent,
      intervention_posture: 'CONSIDER_DO_NOTHING'
    }
  });
  const dnNoPromoCausal = evaluateCausalDemandContribution(dnNoPromo, { include_signals: true });
  const dnSignalPp =
    dnNoPromoCausal.drivers.find(d => d.driver_id === 'external_signal_response')!.contribution_pp;
  assert(
    dnSignalPp === 0 && dnNoPromoCausal.intervention_uplift_pp === 0 && dnNoPromoCausal.reconciliation_ok,
    'Test 33: Do Nothing does not receive promotional ambient uplift from ESF-2',
    `signal_pp=${dnSignalPp}`
  );

  // TEST 34: Do Nothing → zero intervention-attributable waste delta (D2).
  const dnWasteCf = evaluateCounterfactualBaseline(dnNoPromo, dnNoPromoCausal, { include_signals: true });
  assert(
    dnWasteCf.campaign_delta.waste_delta_units === 0 &&
      dnWasteCf.predicted_with_intervention.waste_units ===
        dnWasteCf.expected_without_intervention.waste_units &&
      dnWasteCf.campaign_delta.intervention_indistinguishable_from_do_nothing,
    'Test 34: Do Nothing produces zero intervention-attributable waste delta',
    `waste_delta=${dnWasteCf.campaign_delta.waste_delta_units} pred=${dnWasteCf.predicted_with_intervention.waste_units} without=${dnWasteCf.expected_without_intervention.waste_units}`
  );

  // TEST 35: Non-zero intervention can still affect waste where the model supports clearance.
  clearCampaignIntents();
  const wastePromoDraft = createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_waste_promo');
  const wastePromo = registerCampaignIntent({
    ...wastePromoDraft,
    campaign_intent: {
      ...wastePromoDraft.campaign_intent,
      intervention_posture: 'CONSIDER_PROMOTION',
      provisional_mechanic: '20_percent_off',
      provisional_discount_depth: 20
    },
    audience_market: {
      ...wastePromoDraft.audience_market,
      timing_mode: 'KNOWN_DATES',
      planned_start: '2026-08-20T00:00:00.000Z',
      planned_end: '2026-08-27T00:00:00.000Z'
    }
  });
  const wastePromoCausal = evaluateCausalDemandContribution(wastePromo, { include_signals: false });
  const wastePromoCf = evaluateCounterfactualBaseline(wastePromo, wastePromoCausal, {
    include_signals: false
  });
  assert(
    wastePromoCausal.intervention_uplift_pp > 0 &&
      wastePromoCf.campaign_delta.waste_delta_units < 0 &&
      wastePromoCf.predicted_with_intervention.waste_units <
        wastePromoCf.expected_without_intervention.waste_units &&
      wastePromoCausal.reconciliation_ok,
    'Test 35: Stated promotion with positive intervention uplift still reduces waste vs counterfactual',
    `interv_pp=${wastePromoCausal.intervention_uplift_pp} waste_delta=${wastePromoCf.campaign_delta.waste_delta_units}`
  );

  // TEST 36: CDI-02 attribution remains reconciled after D1/D2 corrections.
  assert(
    dnNoPromoCausal.reconciliation_ok &&
      wastePromoCausal.reconciliation_ok &&
      Math.abs(dnNoPromoCausal.reconciled_sum_pp - dnNoPromoCausal.total_predicted_uplift_pp) < 0.005 &&
      Math.abs(wastePromoCausal.reconciled_sum_pp - wastePromoCausal.total_predicted_uplift_pp) < 0.005,
    'Test 36: CDI-02 attribution remains reconciled (Do Nothing + stated promotion)'
  );

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
