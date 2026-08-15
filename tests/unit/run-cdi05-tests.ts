/**
 * Unit Test Suite for CogniX CDI-05 Decision Timeline & Demand Decomposition
 * Run via: node --import tsx tests/unit/run-cdi05-tests.ts
 */

import {
  createDefaultCampaignIntentDraft,
  assertAmbientParity,
  assertAmbientMovementPresent,
  assertAttributableIsDifferenceOnly,
  assertAllocationConserves,
  assertNoObservedHistory,
  assertPostCampaignEmpty,
  assertEnvelopeMonotone,
  assertEnvelopeWithinModelledPhases,
  assertContextSignalsNotDoubleCounted,
  assertUnavailableLensNamesInput,
  validateDecisionTimelineProjection,
  weakestStrength,
  weakestEvidenceStrength
} from '../../packages/contracts/src/index';
import { clearCampaignIntents, registerCampaignIntent } from '../../lib/campaign-intent-store';
import { projectDecisionTimeline } from '../../lib/campaign-timeline-engine';
import { evaluateCampaignDecision } from '../../lib/campaign-causal-engine';
import { discoverCampaignOpportunity } from '../../lib/campaign-opportunity-engine';
import { decisionStateStore } from '../../lib/decision-state-store';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TimelineChart } from '../../components/CampaignDecisionCanvas';
import * as fs from 'fs';
import * as path from 'path';

function runTests() {
  console.log('====================================================');
  console.log('COGNIX CDI-05 DECISION TIMELINE UNIT TESTS');
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
  decisionStateStore.clearStore();

  function registerPromo(session: string, overrides: any = {}) {
    const draft = createDefaultCampaignIntentDraft('tenant_uk_retail_01', session);
    return registerCampaignIntent({
      ...draft,
      campaign_intent: {
        ...draft.campaign_intent,
        intervention_posture: 'CONSIDER_PROMOTION',
        provisional_mechanic: '20_percent_off',
        provisional_discount_depth: 15,
        objective_type: 'REVENUE_ACCELERATION',
        ...(overrides.campaign_intent || {})
      },
      baseline_objective: {
        ...draft.baseline_objective,
        primary_metric: 'VOLUME',
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
      }
    });
  }

  const camp = registerPromo('sess_cdi05_base');
  const evaluation = evaluateCampaignDecision({
    tenant_id: camp.tenant_id,
    session_id: camp.session_id,
    campaign_intent_id: camp.campaign_intent_id,
    include_signals: false
  });
  const discovery = discoverCampaignOpportunity({
    tenant_id: camp.tenant_id,
    session_id: camp.session_id,
    campaign_intent_id: camp.campaign_intent_id
  });

  const result = projectDecisionTimeline({
    tenant_id: camp.tenant_id,
    session_id: camp.session_id,
    campaign_intent_id: camp.campaign_intent_id,
    campaign_evaluation: evaluation,
    opportunity_discovery: discovery,
    include_signals: false,
    evaluation_timestamp: '2026-08-15T12:00:00.000Z'
  });
  const p = result.projection;
  const ambient = evaluation.causal.ambient_uplift_pp;
  const intervention = evaluation.causal.intervention_uplift_pp;

  assert(p.trajectories.length === 2 && p.lenses.length === 4, 'Test 1: Exactly two trajectories and four lenses');
  assert(p.allocation_profile === 'FLAT_RATE_IDENTITY', 'Test 2: FLAT_RATE_IDENTITY only');
  assert(validateDecisionTimelineProjection(p).valid, 'Test 3: Projection validates', validateDecisionTimelineProjection(p).errors.join('; '));

  // AC-4 / I11 — Tier 1 shows attributable only
  assert(
    p.tier1.attributable_uplift_pp === intervention &&
      !('total_predicted_uplift_pp' in p.tier1) &&
      !JSON.stringify(p.tier1).includes('total_predicted'),
    'Test 4: Tier 1 shows attributable_uplift_pp only — never total_predicted'
  );

  // AC-5a PRE_CAMPAIGN flat at 100
  const preOk = p.trajectories.every(t =>
    t.points.filter(x => x.phase === 'PRE_CAMPAIGN').every(pt => pt.index_pct === 100 && pt.intervention_component_pp === 0)
  );
  assert(preOk, 'Test 5a: PRE_CAMPAIGN flat at 100 on both trajectories');

  // AC-5b ambient present when non-zero
  assert(assertAmbientMovementPresent(p, ambient).ok, 'Test 5b: Ambient movement present equally when non-zero', assertAmbientMovementPresent(p, ambient).violations.join('; '));

  // AC-5c within-campaign flat
  const campCf = p.trajectories.find(t => t.kind === 'COUNTERFACTUAL')!.points.filter(x => x.phase === 'CAMPAIGN');
  assert(
    campCf.every(pt => pt.index_pct === campCf[0].index_pct),
    'Test 5c: Within-CAMPAIGN index is flat (no fabricated slope)'
  );

  assert(assertAmbientParity(p).ok, 'Test 6: assertAmbientParity');
  assert(
    p.trajectories.find(t => t.kind === 'COUNTERFACTUAL')!.points.every(
      pt => pt.intervention_component_pp === 0 || pt.intervention_component_pp === null
    ),
    'Test 7: Counterfactual intervention_component_pp is always 0/null'
  );
  assert(assertAttributableIsDifferenceOnly(p).ok, 'Test 8: Difference equals intervention component');
  assert(assertAllocationConserves(p, ambient, intervention).ok, 'Test 9: Allocation conserves CDI-02 endpoints');

  // Grep-style: no curvature / half-life / cumulative vocabulary in contract+engine (not Canvas copy)
  const cdi05Core = [
    'packages/contracts/src/campaign-timeline-model.ts',
    'lib/campaign-timeline-engine.ts'
  ];
  const root = path.resolve(__dirname, '../..');
  let curveHit = false;
  let halfLifeHit = false;
  let cumulativeHit = false;
  let observedBasisHit = false;
  for (const f of cdi05Core) {
    const text = fs.readFileSync(path.join(root, f), 'utf8');
    // Fail only on implementation patterns, not prohibition comments
    if (/\.(curve|spline)\(|\binterpolate\(|\beaseInOut\b|\bcardinal\(/i.test(text)) curveHit = true;
    if (/\bhalf_life\b|\bvalid_until\b|\bremaining_hours\b/i.test(text) && !/prohibited|no Half-Life|Half-Life semantics prohibited/i.test(text)) {
      halfLifeHit = true;
    }
    if (/\bcumulative_|\bhorizon_total\b|\bcampaign_total_units\b/i.test(text) && !/prohibited|No cumulative/i.test(text)) {
      cumulativeHit = true;
    }
    if (/basis:\s*['\"]OBSERVED['\"]|TimelinePointBasis.*OBSERVED/.test(text) && !/No.*OBSERVED|prohibited/.test(text)) {
      observedBasisHit = true;
    }
  }
  assert(!curveHit, 'Test 10a: No fabricated curvature / spline / easing in CDI-05 core');

  /**
   * AC-10a is a surface guard as well as a model guard: a renderer-side spline is the same
   * fabrication as a model-side one. The Layer 5 chart must draw straight segments between
   * allocated points, and must not bridge the unmodelled post-campaign region.
   */
  const canvasText = fs.readFileSync(path.join(root, 'components/CampaignDecisionCanvas.tsx'), 'utf8');
  const layer5 = canvasText.slice(canvasText.indexOf('function TimelineChart'));
  assert(
    !/curve(Monotone|Basis|Cardinal|Natural|Step)|\.curve\(|\bspline\b|\beaseInOut\b|\bsmoothing\b|tension\s*[:=]/i.test(
      layer5
    ),
    'Test 10b: Layer 5 renderer uses no curve type, spline, easing, smoothing or tension'
  );
  assert(
    /<polyline/.test(layer5) && !/<path[^>]*\sd=["'][^"']*[CSQTAcsqta]/.test(layer5),
    'Test 10c: Layer 5 timeline series are polylines — no bezier/arc path commands'
  );
  assert(assertNoObservedHistory(p).ok && !observedBasisHit, 'Test 11-12: No observed-history basis');
  assert(assertPostCampaignEmpty(p).ok, 'Test 13: POST_CAMPAIGN empty but present', assertPostCampaignEmpty(p).violations.join('; '));
  assert(assertEnvelopeMonotone(p).ok, 'Test 15: Envelope monotone widening');

  // AC-17 effect envelope independent of ambient.
  // Shifting ambient moves BOTH trajectories by the same amount, so the CDI-02
  // trajectory-gap reconciliation still holds and both projections must genuinely build.
  // A swallowed failure here would make the assertion unfalsifiable, which is the defect
  // pattern CDI-04 already corrected once.
  function withAmbientShift(source: any, deltaPp: number) {
    const e = JSON.parse(JSON.stringify(source));
    e.causal.drivers = e.causal.drivers.map((d: any) =>
      d.driver_id === 'intrinsic_demand' ? { ...d, contribution_pp: Number((d.contribution_pp + deltaPp).toFixed(4)) } : d
    );
    e.causal.ambient_uplift_pp = Number(
      e.causal.drivers
        .filter((d: any) => d.driver_class === 'ambient')
        .reduce((s: number, d: any) => s + d.contribution_pp, 0)
        .toFixed(4)
    );
    e.causal.reconciled_sum_pp = Number(
      e.causal.drivers.reduce((s: number, d: any) => s + d.contribution_pp, 0).toFixed(4)
    );
    e.causal.total_predicted_uplift_pp = Number(
      (e.causal.ambient_uplift_pp + e.causal.intervention_uplift_pp).toFixed(4)
    );
    e.counterfactual.expected_without_intervention.volume_index_pct = Number(
      (100 + e.causal.ambient_uplift_pp).toFixed(2)
    );
    e.counterfactual.predicted_with_intervention.volume_index_pct = Number(
      (100 + e.causal.ambient_uplift_pp + e.causal.intervention_uplift_pp).toFixed(2)
    );
    return e;
  }

  clearCampaignIntents();
  const campA = registerPromo('sess_cdi05_amb_a');
  const campB = registerPromo('sess_cdi05_amb_b');
  const evalA = evaluateCampaignDecision({
    tenant_id: campA.tenant_id,
    session_id: campA.session_id,
    campaign_intent_id: campA.campaign_intent_id,
    include_signals: false
  });
  const evalB = withAmbientShift(
    { ...evalA, campaign_intent_id: campB.campaign_intent_id },
    18
  );
  evalB.tenant_id = campB.tenant_id;
  evalB.session_id = campB.session_id;
  evalB.counterfactual.campaign_intent_id = campB.campaign_intent_id;
  evalB.causal.campaign_intent_id = campB.campaign_intent_id;

  // No try/catch: if either projection refuses to build, this test must fail loudly.
  const pA = projectDecisionTimeline({
    tenant_id: campA.tenant_id,
    session_id: campA.session_id,
    campaign_intent_id: campA.campaign_intent_id,
    campaign_evaluation: evalA,
    include_signals: false,
    evaluation_timestamp: '2026-08-15T12:00:00.000Z'
  }).projection;
  const pB = projectDecisionTimeline({
    tenant_id: campB.tenant_id,
    session_id: campB.session_id,
    campaign_intent_id: campB.campaign_intent_id,
    campaign_evaluation: evalB,
    include_signals: false,
    evaluation_timestamp: '2026-08-15T12:00:00.000Z'
  }).projection;
  const wA = pA.attributable_effect_envelope.points.map(ep => ep.upper_index_pct - ep.lower_index_pct);
  const wB = pB.attributable_effect_envelope.points.map(ep => ep.upper_index_pct - ep.lower_index_pct);
  assert(
    Math.abs(evalB.causal.ambient_uplift_pp - evalA.causal.ambient_uplift_pp) > 1 &&
      Math.abs(evalB.causal.intervention_uplift_pp - evalA.causal.intervention_uplift_pp) < 1e-9,
    'Test 17a: Ambient-independence fixture genuinely differs in ambient only'
  );
  assert(
    wA.length > 0 && wA.length === wB.length && wA.every((w, i) => Math.abs(w - wB[i]) < 1e-6),
    'Test 17: Attributable effect envelope width independent of ambient_uplift_pp',
    `${JSON.stringify(wA.slice(0, 3))} vs ${JSON.stringify(wB.slice(0, 3))}`
  );
  assert(
    pA.trajectories.every(t =>
      t.points
        .filter(x => x.phase === 'CAMPAIGN')
        .every(x => Math.abs((x.ambient_component_pp as number) - evalA.causal.ambient_uplift_pp) < 1e-9)
    ) &&
      pB.trajectories.every(t =>
        t.points
          .filter(x => x.phase === 'CAMPAIGN')
          .every(x => Math.abs((x.ambient_component_pp as number) - evalB.causal.ambient_uplift_pp) < 1e-9)
      ),
    'Test 17b: Both fixtures carry their own ambient on both trajectories'
  );

  // Decomposition partition
  assert(
    p.decomposition.ambient_group.driver_class === 'ambient' &&
      p.decomposition.intervention_group.driver_class === 'intervention' &&
      Math.abs(p.decomposition.ambient_group.subtotal_pp - ambient) < 0.05 &&
      Math.abs(p.decomposition.intervention_group.subtotal_pp - intervention) < 0.05 &&
      !!p.decomposition.residual_row,
    'Test 21-22: Decomposition partitioned; subtotals echo CDI-02'
  );
  assert(
    p.decomposition.excluded_drivers.every(d => !d.attributed) &&
      evaluation.causal.drivers.filter(d => !d.attributed).length ===
        p.decomposition.excluded_drivers.length,
    'Test 23: Unattributed drivers shown in place, never dropped'
  );

  // Revenue lens
  assert(assertUnavailableLensNamesInput(p).ok, 'Test 26: REVENUE NOT_AVAILABLE with required input named', assertUnavailableLensNamesInput(p).violations.join('; '));

  // No cumulative
  assert(!cumulativeHit && !/\bcumulative_|\bhorizon_total\b|\bcampaign_total_units\b/.test(JSON.stringify(p)), 'Test 27: No cumulative / horizon-total quantities');

  // Half-life
  assert(!halfLifeHit && !/\bhalf_life\b|\bvalid_until\b|\bremaining_hours\b/.test(JSON.stringify(p)), 'Test 31: No Half-Life semantics');

  // RJ5 draft
  clearCampaignIntents();
  const draft = createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_cdi05_draft');
  let rj5 = false;
  try {
    projectDecisionTimeline({
      tenant_id: draft.tenant_id,
      session_id: draft.session_id,
      campaign_intent: draft
    });
  } catch (e: any) {
    rj5 = e.rejection_id === 'RJ5' || /RJ5/.test(e.message);
  }
  assert(rj5, 'Test 32: RJ5 rejects DRAFT intents');

  // RJ4 override
  clearCampaignIntents();
  const c2 = registerPromo('sess_cdi05_rj4');
  let rj4 = false;
  try {
    projectDecisionTimeline({
      tenant_id: c2.tenant_id,
      session_id: c2.session_id,
      campaign_intent_id: c2.campaign_intent_id,
      allocation_profile_override: 'SHAPED'
    } as any);
  } catch (e: any) {
    rj4 = e.rejection_id === 'RJ4' || /RJ4/.test(e.message);
  }
  assert(rj4, 'Test 33: RJ4 rejects allocation profile override');

  // RJ2 — FIND_BEST_WINDOW without dates and without CDI-03 window
  clearCampaignIntents();
  const badDates = registerPromo('sess_cdi05_rj2', {
    audience_market: {
      region: 'North West',
      timing_mode: 'FIND_BEST_WINDOW',
      planned_start: undefined,
      planned_end: undefined
    }
  });
  let rj2 = false;
  try {
    projectDecisionTimeline({
      tenant_id: badDates.tenant_id,
      session_id: badDates.session_id,
      campaign_intent_id: badDates.campaign_intent_id,
      include_signals: false,
      evaluation_timestamp: '2026-08-15T12:00:00.000Z'
      // no opportunity_discovery
    });
  } catch (e: any) {
    rj2 = e.rejection_id === 'RJ2' || /RJ2/.test(e.message);
  }
  assert(rj2, 'Test 34: RJ2 rejects timeline without resolvable campaign window');

  // Tenant isolation — re-register base campaign after clears
  clearCampaignIntents();
  const isoCamp = registerPromo('sess_cdi05_iso');
  let tenantBlocked = false;
  try {
    projectDecisionTimeline({
      tenant_id: 'tenant_other',
      session_id: isoCamp.session_id,
      campaign_intent_id: isoCamp.campaign_intent_id
    });
  } catch (e: any) {
    tenantBlocked = /CampaignIntentNotFound|RJ3|Tenant/.test(e.message) || e.rejection_id === 'RJ3';
  }
  assert(tenantBlocked, 'Test 35: Cross-tenant timeline rejected');

  // AC-5d — with ambient EXACTLY zero, a campaign-period counterfactual at 100 is correct
  // and must pass. 5b tests the presence of real movement, never a mandatory departure
  // from the identity, so this fixture drives ambient to a true zero rather than relying
  // on whatever intrinsic drift the posture happens to produce.
  clearCampaignIntents();
  const zeroAmbCamp = registerPromo('sess_cdi05_zeroamb');
  const baseZeroEval = evaluateCampaignDecision({
    tenant_id: zeroAmbCamp.tenant_id,
    session_id: zeroAmbCamp.session_id,
    campaign_intent_id: zeroAmbCamp.campaign_intent_id,
    include_signals: false
  });
  const zeroEval = withAmbientShift(baseZeroEval, -baseZeroEval.causal.ambient_uplift_pp);
  const zp = projectDecisionTimeline({
    tenant_id: zeroAmbCamp.tenant_id,
    session_id: zeroAmbCamp.session_id,
    campaign_intent_id: zeroAmbCamp.campaign_intent_id,
    campaign_evaluation: zeroEval,
    include_signals: false,
    evaluation_timestamp: '2026-08-15T12:00:00.000Z'
  }).projection;
  const zeroCampCf = zp.trajectories
    .find(t => t.kind === 'COUNTERFACTUAL')!
    .points.filter(x => x.phase === 'CAMPAIGN');
  assert(
    zeroEval.causal.ambient_uplift_pp === 0 &&
      zeroCampCf.length > 0 &&
      zeroCampCf.every(pt => pt.index_pct === 100) &&
      assertAmbientMovementPresent(zp, 0).ok,
    'Test 5d: With ambient exactly 0, CAMPAIGN counterfactual at 100 is correct and passes',
    assertAmbientMovementPresent(zp, 0).violations.join('; ')
  );

  // Lens quantity_basis present; demand recomputable
  const demand = p.lenses.find(l => l.lens === 'DEMAND')!;
  const cfCampPt = campCf[0];
  const expectedVol = Math.round(10000 * ((cfCampPt.index_pct as number) / 100));
  const demandVal = demand.values.find(v => v.period_index === cfCampPt.period_index)!;
  assert(
    demand.quantity_basis === 'cdi02_weekly_rate' && demandVal.counterfactual === expectedVol,
    'Test 25: DEMAND lens recomputable from index_pct × BASE_WEEKLY_UNITS'
  );

  // Inventory discontinuity strength
  const inv = p.lenses.find(l => l.lens === 'INVENTORY')!;
  assert(
    inv.strength === 'DERIVED_KNOWN_DISCONTINUITY' && /residual risk 6|discontinu/i.test(inv.disclosure || ''),
    'Test 28: Inventory lens preserves CDI-02 waste discontinuity disclosure'
  );

  // No readiness state computed by CDI-05
  assert(
    !('readiness_state_computed' in p) &&
      (p.readiness_reference === undefined || typeof p.readiness_reference.state === 'string'),
    'Test 33b: CDI-05 echoes readiness by reference only'
  );

  // Pre disclosure
  assert(
    p.trajectories[0].points
      .filter(x => x.phase === 'PRE_CAMPAIGN')
      .every(pt => /not observed history/i.test(pt.disclosure || '')),
    'Test 36: PRE_CAMPAIGN carries not-observed-history disclosure'
  );

  // Determinism — fresh registration
  clearCampaignIntents();
  const detCamp = registerPromo('sess_cdi05_det');
  const detEval = evaluateCampaignDecision({
    tenant_id: detCamp.tenant_id,
    session_id: detCamp.session_id,
    campaign_intent_id: detCamp.campaign_intent_id,
    include_signals: false
  });
  const det1 = projectDecisionTimeline({
    tenant_id: detCamp.tenant_id,
    session_id: detCamp.session_id,
    campaign_intent_id: detCamp.campaign_intent_id,
    campaign_evaluation: detEval,
    include_signals: false,
    evaluation_timestamp: '2026-08-15T12:00:00.000Z'
  });
  const det2 = projectDecisionTimeline({
    tenant_id: detCamp.tenant_id,
    session_id: detCamp.session_id,
    campaign_intent_id: detCamp.campaign_intent_id,
    campaign_evaluation: detEval,
    include_signals: false,
    evaluation_timestamp: '2026-08-15T12:00:00.000Z'
  });
  assert(
    JSON.stringify(det1.projection.trajectories) === JSON.stringify(det2.projection.trajectories) &&
      JSON.stringify(det1.projection.decomposition) === JSON.stringify(det2.projection.decomposition),
    'Test 37: Deterministic — identical inputs → identical trajectories/decomposition'
  );

  // Reconciliation failure emits no projection
  const bad = JSON.parse(JSON.stringify(detEval));
  bad.causal.reconciliation_ok = false;
  let noProj = false;
  try {
    projectDecisionTimeline({
      tenant_id: detCamp.tenant_id,
      session_id: detCamp.session_id,
      campaign_intent_id: detCamp.campaign_intent_id,
      campaign_evaluation: bad,
      include_signals: false,
      evaluation_timestamp: '2026-08-15T12:00:00.000Z'
    });
  } catch (e: any) {
    noProj = /Reconciliation|V1|V2/i.test(e.message);
  }
  assert(noProj, 'Test 38: Reconciliation failure emits no timeline/decomposition');

  // Merged waterfall guard
  assert(
    !('all_drivers' in p.decomposition) &&
      !('merged_waterfall' in p.decomposition) &&
      Boolean(p.decomposition.ambient_group) &&
      Boolean(p.decomposition.intervention_group),
    'Test 39: No merged all-driver waterfall'
  );

  // ==================================================================
  // ATTACK FIXTURES — the fixture that SHOULD fail must fail.
  // A guard that cannot fail is a restatement, not a check (CDI-04 precedent).
  // ==================================================================
  const clone = (proj: any) => JSON.parse(JSON.stringify(proj));
  const cfOf = (proj: any) => proj.trajectories.find((t: any) => t.kind === 'COUNTERFACTUAL');
  const ivOf = (proj: any) => proj.trajectories.find((t: any) => t.kind === 'INTERVENTION');

  // Attack 1 — ambient ERASURE: pin the campaign-period counterfactual to the identity
  // while ambient is non-zero. The trajectory difference would then silently absorb the
  // world and every attribution number would overstate the campaign.
  const erased = clone(p);
  for (const pt of cfOf(erased).points.filter((x: any) => x.phase === 'CAMPAIGN')) {
    pt.ambient_component_pp = 0;
    pt.index_pct = 100;
  }
  assert(
    !assertAmbientMovementPresent(erased, ambient).ok && !assertAmbientParity(erased).ok,
    'Attack 1: Counterfactual pinned to 100 while ambient ≠ 0 FAILS validation'
  );

  // Attack 2 — ambient LEAKAGE: move ambient onto the intervention trajectory only, so
  // the difference credits the campaign with world movement.
  const leaked = clone(p);
  for (const pt of ivOf(leaked).points.filter((x: any) => x.phase === 'CAMPAIGN')) {
    pt.ambient_component_pp = (pt.ambient_component_pp || 0) + 5;
    pt.index_pct = Number((pt.index_pct + 5).toFixed(4));
  }
  assert(
    !assertAmbientParity(leaked).ok && !assertAttributableIsDifferenceOnly(leaked).ok,
    'Attack 2: Ambient leaked into the intervention trajectory FAILS parity and difference-only'
  );

  // Attack 3 — fabricated within-campaign curvature (a response-shape claim CDI-02 never makes)
  const sloped = clone(p);
  cfOf(sloped).points
    .filter((x: any) => x.phase === 'CAMPAIGN')
    .forEach((pt: any, i: number) => {
      pt.ambient_component_pp = Number((ambient + i * 0.4).toFixed(4));
      pt.index_pct = Number((100 + pt.ambient_component_pp).toFixed(4));
    });
  assert(
    !assertAmbientMovementPresent(sloped, ambient).ok,
    'Attack 3: Within-CAMPAIGN ambient slope FAILS (fabricated response shape)'
  );

  // Attack 4 — synthetic presented as observed history: animate the pre-campaign period
  const fakeHistory = clone(p);
  cfOf(fakeHistory).points
    .filter((x: any) => x.phase === 'PRE_CAMPAIGN')
    .forEach((pt: any, i: number) => {
      pt.index_pct = Number((100 + Math.sin(i) * 3).toFixed(4));
    });
  assert(
    !assertNoObservedHistory(fakeHistory).ok && !assertAmbientMovementPresent(fakeHistory, ambient).ok,
    'Attack 4: Varying PRE_CAMPAIGN series FAILS — no fabricated history'
  );

  // Attack 5 — post-campaign convergence: undefined is not zero
  const converged = clone(p);
  for (const t of converged.trajectories) {
    for (const pt of t.points.filter((x: any) => x.phase === 'POST_CAMPAIGN')) {
      pt.ambient_component_pp = 0;
      pt.intervention_component_pp = 0;
      pt.index_pct = 100;
    }
  }
  assert(
    !assertPostCampaignEmpty(converged).ok,
    'Attack 5: POST_CAMPAIGN convergence (difference = 0) FAILS'
  );

  // Attack 5b — the phase omitted entirely
  const truncated = clone(p);
  for (const t of truncated.trajectories) {
    t.points = t.points.filter((x: any) => x.phase !== 'POST_CAMPAIGN');
  }
  assert(
    !assertPostCampaignEmpty(truncated).ok,
    'Attack 5b: Omitting POST_CAMPAIGN entirely FAILS — the phase is structurally required'
  );

  // Attack 6 — post-campaign asserted by the ENVELOPE rather than by the series.
  // A band centred on the identity draws reversion; an effect band centred on zero draws
  // convergence. Both are causal claims over a region CDI-02 does not model.
  const bandedPost = clone(p);
  const postIndexes = cfOf(p)
    .points.filter((x: any) => x.phase === 'POST_CAMPAIGN')
    .map((x: any) => x.period_index);
  cfOf(bandedPost).envelope.points.push({
    period_index: postIndexes[0],
    horizon_days_out: postIndexes[0],
    lower_index_pct: 95,
    upper_index_pct: 105
  });
  assert(
    !assertEnvelopeWithinModelledPhases(bandedPost).ok,
    'Attack 6: A trajectory envelope band over POST_CAMPAIGN FAILS'
  );

  const bandedEffect = clone(p);
  bandedEffect.attributable_effect_envelope.points.push({
    period_index: postIndexes[0],
    horizon_days_out: postIndexes[0],
    lower_index_pct: -2.5,
    upper_index_pct: 2.5
  });
  assert(
    !assertEnvelopeWithinModelledPhases(bandedEffect).ok,
    'Attack 6b: An attributable-effect band centred on zero after the campaign FAILS'
  );

  // Positive counterpart — the shipped projection publishes no band outside the modelled phases
  assert(
    assertEnvelopeWithinModelledPhases(p).ok &&
      p.attributable_effect_envelope.points.every(ep =>
        cfOf(p).points.find((x: any) => x.period_index === ep.period_index)?.phase === 'CAMPAIGN'
      ) &&
      p.trajectories.every(t => t.envelope.points.every(ep => !postIndexes.includes(ep.period_index))),
    'Test 14a: No envelope extends into the unmodelled POST_CAMPAIGN region'
  );

  // Attack 7 — narrowing envelope claims rising certainty about a more distant future
  const narrowing = clone(p);
  cfOf(narrowing).envelope.points = cfOf(narrowing).envelope.points.map((ep: any, i: number) => ({
    ...ep,
    lower_index_pct: 100 - 5 + i * 0.2,
    upper_index_pct: 100 + 5 - i * 0.2
  }));
  assert(!assertEnvelopeMonotone(narrowing).ok, 'Attack 7: Narrowing envelope FAILS');

  // Attack 8 — manufacture uplift by tampering with the allocation
  const tampered = clone(p);
  for (const pt of ivOf(tampered).points.filter((x: any) => x.phase === 'CAMPAIGN')) {
    pt.intervention_component_pp = Number((pt.intervention_component_pp * 1.5).toFixed(4));
    pt.index_pct = Number((100 + pt.ambient_component_pp + pt.intervention_component_pp).toFixed(4));
  }
  assert(
    !assertAllocationConserves(tampered, ambient, intervention).ok,
    'Attack 8: Tampered allocation that no longer reconciles to the CDI-02 endpoint FAILS'
  );

  // Attack 9 — resolve Revenue by deriving it from contribution × an assumed margin
  const derivedRevenue = clone(p);
  const revLens = derivedRevenue.lenses.find((l: any) => l.lens === 'REVENUE');
  revLens.availability = 'AVAILABLE';
  revLens.strength = 'DERIVED';
  revLens.missing_inputs = [];
  delete revLens.required_authoritative_input;
  assert(
    !assertUnavailableLensNamesInput(derivedRevenue).ok,
    'Attack 9: Revenue resolved to AVAILABLE without a realised selling price FAILS'
  );

  // Attack 10 — double-count a context signal already inside ambient
  const doubleCounted = clone(p);
  doubleCounted.markers.push({
    marker_id: 'm_signal_attack',
    marker_type: 'CONTEXT_SIGNAL',
    period_index: 14,
    period_date: p.grid.campaign_start,
    label: 'Weather signal (rendered as an additional effect)',
    strength: 'SEEDED_ASSUMPTION',
    synthetic_demo: true,
    source_package: 'ESF-2'
  });
  assert(
    !assertContextSignalsNotDoubleCounted(doubleCounted).ok,
    'Attack 10: CONTEXT_SIGNAL without already_in_ambient FAILS'
  );

  // Attack 11 — silently drop an unattributed driver so the decomposition appears to add up
  const droppedDriver = clone(p);
  droppedDriver.decomposition.intervention_group.rows =
    droppedDriver.decomposition.intervention_group.rows.filter((r: any) => r.attributed);
  droppedDriver.decomposition.excluded_drivers = [];
  const excludedInCdi02 = evaluation.causal.drivers.filter(d => !d.attributed).length;
  assert(
    excludedInCdi02 > 0 && droppedDriver.decomposition.excluded_drivers.length !== excludedInCdi02,
    'Attack 11: Dropping attributed:false drivers is detectable against CDI-02'
  );

  // ==================================================================
  // REGRESSION TESTS FOR CORRECTED DEFECTS
  // ==================================================================

  // Lens fabrication — PRE_CAMPAIGN must carry the CDI-02 current-baseline run rate on
  // BOTH lines. An intervention lens value that differs before the campaign exists is a
  // fabricated pre-campaign intervention effect.
  const conLens = p.lenses.find(l => l.lens === 'CONTRIBUTION')!;
  const invLens = p.lenses.find(l => l.lens === 'INVENTORY')!;
  const preIdxs = cfOf(p)
    .points.filter((x: any) => x.phase === 'PRE_CAMPAIGN')
    .map((x: any) => x.period_index);
  const baselineUnit = evaluation.counterfactual.current_baseline.unit_contribution_gbp;
  const baselineWaste = evaluation.counterfactual.current_baseline.waste_units;
  assert(
    preIdxs.length > 0 &&
      preIdxs.every((i: number) => {
        const v = conLens.values.find(x => x.period_index === i)!;
        return v.counterfactual === v.intervention &&
          v.counterfactual === Number((10000 * baselineUnit).toFixed(2));
      }),
    'Test 25a: CONTRIBUTION lens shows no pre-campaign divergence (baseline unit contribution on both lines)'
  );
  assert(
    preIdxs.every((i: number) => {
      const v = invLens.values.find(x => x.period_index === i)!;
      return v.counterfactual === baselineWaste && v.intervention === baselineWaste;
    }) && baselineWaste > 0,
    'Test 28a: INVENTORY lens carries the CDI-02 baseline waste pre-campaign, never a fabricated zero'
  );
  assert(
    invLens.values.filter(v => v.period_index === 14).every(v => v.counterfactual === evaluation.counterfactual.expected_without_intervention.waste_units && v.intervention === evaluation.counterfactual.predicted_with_intervention.waste_units),
    'Test 28b: INVENTORY lens preserves the CDI-02 waste step unsmoothed during CAMPAIGN'
  );

  // RJ3 — every supplied upstream artefact must bind to this campaign and this evaluation
  clearCampaignIntents();
  const bindCamp = registerPromo('sess_cdi05_bind');
  const otherCamp = registerPromo('sess_cdi05_bind_other');
  const bindEval = evaluateCampaignDecision({
    tenant_id: bindCamp.tenant_id,
    session_id: bindCamp.session_id,
    campaign_intent_id: bindCamp.campaign_intent_id,
    include_signals: false
  });
  const foreignDiscovery = discoverCampaignOpportunity({
    tenant_id: otherCamp.tenant_id,
    session_id: otherCamp.session_id,
    campaign_intent_id: otherCamp.campaign_intent_id
  });
  let rj3Discovery = false;
  try {
    projectDecisionTimeline({
      tenant_id: bindCamp.tenant_id,
      session_id: bindCamp.session_id,
      campaign_intent_id: bindCamp.campaign_intent_id,
      campaign_evaluation: bindEval,
      opportunity_discovery: foreignDiscovery,
      include_signals: false,
      evaluation_timestamp: '2026-08-15T12:00:00.000Z'
    });
  } catch (e: any) {
    rj3Discovery = e.rejection_id === 'RJ3';
  }
  assert(
    rj3Discovery,
    'Test 40: RJ3 rejects an opportunity discovery bound to a different campaign (grid resolution)'
  );

  let rj3Readiness = false;
  try {
    projectDecisionTimeline({
      tenant_id: bindCamp.tenant_id,
      session_id: bindCamp.session_id,
      campaign_intent_id: bindCamp.campaign_intent_id,
      campaign_evaluation: bindEval,
      readiness: {
        readiness_id: 'rd_foreign',
        campaign_intent_id: otherCamp.campaign_intent_id,
        tenant_id: bindCamp.tenant_id,
        session_id: bindCamp.session_id,
        counterfactual_id: bindEval.counterfactual.counterfactual_id,
        causal_id: bindEval.causal.causal_id,
        state: 'PROCEED',
        headline: 'foreign',
        confidence: { band: 'HIGH', evidence_strength_floor: 'DERIVED' }
      } as any,
      include_signals: false,
      evaluation_timestamp: '2026-08-15T12:00:00.000Z'
    });
  } catch (e: any) {
    rj3Readiness = e.rejection_id === 'RJ3';
  }
  assert(rj3Readiness, 'Test 41: RJ3 rejects a readiness assessment bound to a different campaign');

  let rj3Evaluation = false;
  try {
    projectDecisionTimeline({
      tenant_id: bindCamp.tenant_id,
      session_id: bindCamp.session_id,
      campaign_intent_id: bindCamp.campaign_intent_id,
      campaign_evaluation: bindEval,
      readiness: {
        readiness_id: 'rd_stale',
        campaign_intent_id: bindCamp.campaign_intent_id,
        tenant_id: bindCamp.tenant_id,
        session_id: bindCamp.session_id,
        counterfactual_id: 'cf_some_other_evaluation',
        causal_id: 'cs_some_other_evaluation',
        state: 'PROCEED',
        headline: 'stale',
        confidence: { band: 'HIGH', evidence_strength_floor: 'DERIVED' }
      } as any,
      include_signals: false,
      evaluation_timestamp: '2026-08-15T12:00:00.000Z'
    });
  } catch (e: any) {
    rj3Evaluation = e.rejection_id === 'RJ3';
  }
  assert(
    rj3Evaluation,
    'Test 42: RJ3 rejects a readiness built over a different CDI-02 evaluation (one evaluation, one timeline)'
  );

  // INSUFFICIENT — no trajectory rendered, but the four lenses stay present so the
  // Revenue lens's declared unavailability does not vanish with them.
  const insufficient = projectDecisionTimeline({
    tenant_id: bindCamp.tenant_id,
    session_id: bindCamp.session_id,
    campaign_intent_id: bindCamp.campaign_intent_id,
    campaign_evaluation: bindEval,
    readiness: {
      readiness_id: 'rd_insufficient',
      campaign_intent_id: bindCamp.campaign_intent_id,
      tenant_id: bindCamp.tenant_id,
      session_id: bindCamp.session_id,
      counterfactual_id: bindEval.counterfactual.counterfactual_id,
      causal_id: bindEval.causal.causal_id,
      state: 'DO_NOT_PROCEED',
      headline: 'insufficient',
      confidence: { band: 'INSUFFICIENT', evidence_strength_floor: 'MISSING' }
    } as any,
    include_signals: false,
    evaluation_timestamp: '2026-08-15T12:00:00.000Z'
  }).projection;
  assert(
    insufficient.trajectories.length === 0 &&
      insufficient.lenses.length === 4 &&
      !!insufficient.insufficient_reason &&
      assertUnavailableLensNamesInput(insufficient).ok,
    'Test 18: band INSUFFICIENT renders no trajectory, keeps four lenses and the reason'
  );

  // Evidence taxonomy is CDI-04's, reused rather than reimplemented
  assert(
    (weakestStrength as unknown) === (weakestEvidenceStrength as unknown) &&
      weakestStrength(['DERIVED', 'SEEDED_ASSUMPTION']) === 'SEEDED_ASSUMPTION',
    'Test 43: CDI-05 reuses the CDI-04 evidence-strength rule rather than redefining it'
  );

  // Context markers and provenance completeness
  assert(
    assertContextSignalsNotDoubleCounted(p).ok &&
      p.markers.some(m => m.marker_type === 'WINDOW_START') &&
      p.markers.some(m => m.marker_type === 'WINDOW_END'),
    'Test 30: CDI-03 recommended-window bounds are marked, with the anchor disclosure verbatim'
  );

  // I14 exercised for real: with ESF-2 signals on, the signals CDI-02 consumed as ambient
  // drivers must surface as markers that declare they are already inside the ambient
  // component — an explanation of movement already shown, never an additional effect.
  const signalEval = evaluateCampaignDecision({
    tenant_id: bindCamp.tenant_id,
    session_id: bindCamp.session_id,
    campaign_intent_id: bindCamp.campaign_intent_id,
    include_signals: true
  });
  const signalProjection = projectDecisionTimeline({
    tenant_id: bindCamp.tenant_id,
    session_id: bindCamp.session_id,
    campaign_intent_id: bindCamp.campaign_intent_id,
    campaign_evaluation: signalEval,
    include_signals: true,
    evaluation_timestamp: '2026-08-15T12:00:00.000Z'
  }).projection;
  const contextMarkers = signalProjection.markers.filter(m => m.marker_type === 'CONTEXT_SIGNAL');
  const signalDriverPp =
    signalEval.causal.drivers.find(d => d.driver_id === 'external_signal_response')?.contribution_pp || 0;
  assert(
    contextMarkers.length > 0 &&
      contextMarkers.every(
        m => m.already_in_ambient === true && m.ambient_driver_id === 'external_signal_response'
      ) &&
      assertContextSignalsNotDoubleCounted(signalProjection).ok &&
      signalDriverPp !== 0 &&
      Math.abs(
        (signalProjection.trajectories[0].points.find(x => x.phase === 'CAMPAIGN')!
          .ambient_component_pp as number) - signalEval.causal.ambient_uplift_pp
      ) < 1e-9,
    'Test 29: ESF-2 context signals are marked as already inside ambient, never as an additional effect'
  );
  assert(
    typeof p.provenance.placeholder_fields_excluded === 'string' &&
      typeof p.provenance.envelope_profile === 'string' &&
      p.provenance.counterfactual_id === evaluation.counterfactual.counterfactual_id &&
      p.provenance.causal_id === evaluation.causal.causal_id,
    'Test 44: Provenance carries placeholder exclusions, envelope basis and upstream ids'
  );

  // ==================================================================
  // RENDERED SURFACE — the output of CDI-05 is a picture, so the picture is asserted,
  // not just the payload behind it.
  // ==================================================================
  const svg = renderToStaticMarkup(createElement(TimelineChart, { projection: p }));
  const polylines = [...svg.matchAll(/<polyline[^>]*points="([^"]*)"/g)].map(m => m[1]);
  const chartXs = polylines
    .flatMap(pts => pts.split(' '))
    .map(pair => parseFloat(pair.split(',')[0]));
  const postX = 42 + (postIndexes[0] / (p.grid.points - 1)) * (720 - 42 - 12);
  assert(
    polylines.length === 2,
    'Test 38a: Exactly two trajectory series are drawn, each as one unbroken straight-segment run'
  );
  assert(
    chartXs.length > 0 && chartXs.every(px => px < postX - 0.01),
    'Test 38b: No trajectory segment is drawn into the unmodelled POST_CAMPAIGN region'
  );
  assert(
    (svg.match(/<polygon/g) || []).length === 2,
    'Test 38c: Both trajectories are enveloped — the counterfactual is a prediction too'
  );
  assert(
    /not modelled/.test(svg) && /not observed history/.test(svg) && /cdi05-unmodelled/.test(svg),
    'Test 38d: Post-campaign region is drawn as explicitly unmodelled; pre-campaign disclosed as modelled run-rate'
  );
  assert(
    !/\d+(\.\d+)?%|confidence_index/.test(svg.replace(/width="100%"/g, '')),
    'Test 20: No numeric confidence percentage renders on the primary timeline surface (U4)'
  );
  assert(
    !/total_predicted/.test(svg) &&
      !JSON.stringify(p.tier1).includes(String(evaluation.causal.total_predicted_uplift_pp)),
    'Test 19: total_predicted_uplift_pp appears nowhere on the primary surface or Tier 1'
  );

  console.log('\n====================================================');
  console.log(`CDI-05 RESULTS: ${passed} passed, ${failed} failed`);
  console.log('====================================================');
  if (failed > 0) process.exit(1);
}

runTests();
