/**
 * Campaign Intelligence & Live Decision Twin — semantic test suite.
 *
 * Proves runtime invariants, not fixture shape alone:
 *   1. Every archetype's intent passes ALL four governed engines with the exact
 *      browser-shaped request (shared tenant/session identity).
 *   2. Scenario configuration (SKU, discount, region, duration) materially changes
 *      engine output — including the discount tier crossing an economic sign boundary.
 *   3. The HTTP client layer can never present a failed response as data.
 *   4. Building intents / estimating economics never mutates archetype data.
 *   5. Seeded model coherence: opportunity factors sum to the displayed index,
 *      waterfalls reconcile, elasticity demand is monotone in discount, frontier
 *      plays are distinct configurations with genuine trade-offs.
 *   6. Provenance honesty: no seeded datum may carry the bare governed 'OBSERVED'
 *      class, claim a live/production feed, or reintroduce prohibited vocabulary;
 *      twin telemetry is explicitly SIMULATED_DEMO.
 *
 * Run via: npx tsx tests/unit/run-campaign-intelligence-tests.ts
 */

import {
  CAMPAIGN_ARCHETYPES,
  getArchetypeById,
  buildCampaignIntentFromArchetype,
  estimateInterventionEconomics,
  CAMPAIGN_DEMO_TENANT_ID,
  CAMPAIGN_DEMO_SESSION_ID,
  REGION_STORE_COUNTS
} from '../../lib/campaign-archetypes';
import {
  evaluateCampaignDecisionClient,
  discoverCampaignOpportunityClient
} from '../../lib/campaign-intent-client';
import { evaluateCampaignDecision } from '../../lib/campaign-causal-engine';
import { discoverCampaignOpportunity } from '../../lib/campaign-opportunity-engine';
import { evaluateCampaignReadinessWithDiscovery } from '../../lib/campaign-readiness-engine';
import { projectDecisionTimeline } from '../../lib/campaign-timeline-engine';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
  }
}

function browserShapeRequest(archetype: (typeof CAMPAIGN_ARCHETYPES)[number], overrides: Record<string, unknown> = {}) {
  const intent = buildCampaignIntentFromArchetype(archetype, {
    ...overrides,
    tenant_id: CAMPAIGN_DEMO_TENANT_ID,
    session_id: CAMPAIGN_DEMO_SESSION_ID
  });
  return {
    tenant_id: CAMPAIGN_DEMO_TENANT_ID,
    session_id: CAMPAIGN_DEMO_SESSION_ID,
    campaign_intent_id: intent.intent_id,
    campaign_intent: intent
  } as any;
}

/** Recursively collect every string value and every object key in a data tree. */
function walkStringsAndKeys(value: unknown, strings: string[], keys: string[]) {
  if (typeof value === 'string') {
    strings.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) walkStringsAndKeys(item, strings, keys);
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      keys.push(k);
      walkStringsAndKeys(v, strings, keys);
    }
  }
}

async function runCampaignIntelligenceTests() {
  console.log('\n======================================================');
  console.log(' COGNIX CAMPAIGN INTELLIGENCE & LIVE DECISION TWIN TEST SUITE');
  console.log('======================================================\n');

  // ────────────────────────────────────────────────────────────
  console.log('--- 1. Archetype Registry Integrity ---');
  assert(CAMPAIGN_ARCHETYPES.length === 7, 'All 7 campaign archetypes registered');

  const skuIds = new Set(CAMPAIGN_ARCHETYPES.map(a => a.default_sku));
  assert(skuIds.size === 7, 'Each archetype anchors a distinct SKU');

  for (const arch of CAMPAIGN_ARCHETYPES) {
    assert(
      !!getArchetypeById(arch.id) && arch.waterfall.length >= 4 && arch.elasticity_curve.length >= 4 &&
        arch.opportunity_matrix.length >= 1 && arch.frontier_plays.length >= 1 &&
        arch.decision_graph.nodes.length >= 4 && !!arch.decision_twin,
      `${arch.id} resolves with complete analytical model`
    );
  }

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 2. Seeded Model Coherence Invariants ---');

  for (const arch of CAMPAIGN_ARCHETYPES) {
    // Opportunity Index must be compositional: displayed factors explain the score.
    const factorsExplainIndex = arch.opportunity_matrix.every(
      cell => cell.factors.reduce((s, f) => s + f.points, 0) === cell.opportunity_index
    );
    assert(factorsExplainIndex, `${arch.id}: every opportunity cell's factors sum exactly to its index`);

    // The declared tier must agree with the legend's index ranges the UI displays.
    const tierOfIndex = (i: number) =>
      i >= 80 ? 'PREFERRED' : i >= 65 ? 'ACCEPTABLE' : i >= 50 ? 'SUBOPTIMAL' : 'AVOID';
    assert(
      arch.opportunity_matrix.every(cell => cell.tier === tierOfIndex(cell.opportunity_index)),
      `${arch.id}: every opportunity cell's tier matches the legend range for its index`
    );

    // Waterfall must reconcile: final row equals the sum of the movement rows.
    const wf = arch.waterfall;
    const partsSum = wf.slice(1, -1).reduce((s, w) => s + w.contribution_pp, 0);
    assert(
      Math.abs(wf[wf.length - 1].contribution_pp - partsSum) < 0.05,
      `${arch.id}: waterfall net row reconciles with its component drivers`
    );

    // Elasticity: demand uplift strictly increases with discount depth.
    const curve = arch.elasticity_curve;
    const monotone = curve.every(
      (pt, i) => i === 0 || pt.expected_demand_uplift_pct > curve[i - 1].expected_demand_uplift_pct
    );
    assert(monotone, `${arch.id}: elasticity demand response is strictly monotone in discount`);

    // Frontier plays: genuinely different configurations, and the recommended play
    // must not strictly dominate every alternative on both axes (real trade-offs).
    const plays = arch.frontier_plays;
    const configs = new Set(plays.map(p => `${p.discount_pct}|${p.stores_count}|${p.duration_days}`));
    assert(configs.size === plays.length, `${arch.id}: frontier plays are distinct configurations`);
    const rec = plays.find(p => p.is_recommended);
    if (rec && plays.length > 1) {
      // Dominance across the declared decision axes: demand, contribution, and
      // waste clearance (more negative waste_impact_pct clears more waste).
      const dominatesAll = plays
        .filter(p => p !== rec)
        .every(
          p =>
            rec.expected_demand_uplift_pct >= p.expected_demand_uplift_pct &&
            rec.net_contribution_delta_gbp >= p.net_contribution_delta_gbp &&
            rec.waste_impact_pct <= p.waste_impact_pct
        );
      assert(!dominatesAll, `${arch.id}: recommended play involves a genuine trade-off, not free dominance`);
    }

    // Twin coherence: a non-valid verdict requires at least one detected deviation,
    // and severe telemetry deviation must never coexist with an untroubled verdict.
    const twin = arch.decision_twin;
    if (twin.is_decision_still_valid !== 'STILL VALID') {
      assert(twin.deviations.length >= 1, `${arch.id}: non-valid twin verdict is backed by detected deviations`);
    }
    const severeDays = twin.telemetry_streams.filter(s => s.deviation_status === 'SEVERE_DEVIATION').length;
    if (severeDays > 0) {
      assert(
        twin.is_decision_still_valid !== 'STILL VALID' || twin.deviations.length >= 1,
        `${arch.id}: severe telemetry deviation triggers reassessment or a logged deviation`
      );
    }
  }

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 3. Governed Engine Integration (browser-shaped requests, all archetypes) ---');

  for (const arch of CAMPAIGN_ARCHETYPES) {
    const req = browserShapeRequest(arch);
    assert(
      ['VOLUME', 'REVENUE', 'CONTRIBUTION', 'WASTE_REDUCTION', 'AVAILABILITY'].includes(
        req.campaign_intent.baseline_objective.primary_metric
      ),
      `${arch.id}: built intent carries a contract-valid primary_metric`
    );
    try {
      const ev = evaluateCampaignDecision(req);
      const opp = discoverCampaignOpportunity(req);
      const rd = evaluateCampaignReadinessWithDiscovery(req);
      const tl = projectDecisionTimeline(req);
      assert(
        !!ev?.evaluation_id && !!opp?.opportunity_windows && !!rd?.readiness?.state && !!tl,
        `${arch.id}: evaluate + opportunity + readiness + timeline all succeed with the browser-shaped request`
      );
      assert(
        ev.causal.reconciliation_ok === true,
        `${arch.id}: CDI-02 causal drivers reconcile with the predicted total`
      );
    } catch (e: any) {
      assert(false, `${arch.id}: engines accept the browser-shaped request`, e.message?.slice(0, 120));
    }
  }

  // The identity invariant behind the original browser 400s: a request whose
  // tenant does not match the inline intent must be rejected, never answered.
  const chilled = getArchetypeById('ARCH-CHILLED-ELASTIC')!;
  const mismatched = { ...browserShapeRequest(chilled), tenant_id: 'default', session_id: 'campaign-session' };
  let mismatchRejected = false;
  try {
    evaluateCampaignDecision(mismatched);
  } catch {
    mismatchRejected = true;
  }
  assert(mismatchRejected, 'Tenant/session mismatch between request and inline intent is rejected by the engine');

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 4. Configuration Responsiveness at Engine Runtime ---');

  const evalWith = (overrides: Record<string, unknown>) =>
    evaluateCampaignDecision(browserShapeRequest(chilled, overrides));

  const skuA = evalWith({ sku_id: 'P004' });
  const skuB = evalWith({ sku_id: 'P023' });
  assert(
    skuA.causal.intervention_uplift_pp !== skuB.causal.intervention_uplift_pp,
    'SKU change (P004 → P023) changes engine-attributed demand uplift'
  );
  assert(
    skuA.counterfactual.campaign_delta.contribution_delta_gbp !==
      skuB.counterfactual.campaign_delta.contribution_delta_gbp,
    'SKU change changes engine-computed contribution economics'
  );

  const d10 = evalWith({ discount_depth_pct: 10 });
  const d20 = evalWith({ discount_depth_pct: 20 });
  assert(
    d20.causal.intervention_uplift_pp > d10.causal.intervention_uplift_pp,
    '20% discount produces higher engine-attributed uplift than 10%'
  );
  assert(
    d10.counterfactual.campaign_delta.contribution_delta_gbp > 0 &&
      d20.counterfactual.campaign_delta.contribution_delta_gbp < 0,
    'Discount depth crosses the economic boundary: 10% accretive, 20% dilutive for the chilled scenario'
  );

  const regionLondon = discoverCampaignOpportunity(browserShapeRequest(chilled, { target_region: 'London' }));
  const regionNW = discoverCampaignOpportunity(browserShapeRequest(chilled, { target_region: 'North West' }));
  assert(
    JSON.stringify(regionLondon.micro_markets) !== JSON.stringify(regionNW.micro_markets),
    'Region change (London → North West) changes the engine micro-market opportunity structure'
  );
  assert(
    JSON.stringify(regionLondon.opportunity_windows.candidates) !==
      JSON.stringify(regionNW.opportunity_windows.candidates),
    'Region change changes the engine opportunity window candidates'
  );

  const stripTimestamps = (v: any) => JSON.stringify(v).replace(/"[^"]*(timestamp|_id)":"[^"]*"/g, '');
  const t7 = projectDecisionTimeline(browserShapeRequest(chilled, { duration_days: 7 }));
  const t14 = projectDecisionTimeline(browserShapeRequest(chilled, { duration_days: 14 }));
  assert(
    stripTimestamps(t7) !== stripTimestamps(t14),
    'Duration change (7 → 14 days) changes the projected decision timeline'
  );

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 5. Client Failure Honesty (failed HTTP can never surface as data) ---');

  const realFetch = (globalThis as any).fetch;
  try {
    (globalThis as any).fetch = async () =>
      new Response(JSON.stringify({ status: 'error', error: 'BadRequest', message: 'boom' }), { status: 400 });
    const failed = await evaluateCampaignDecisionClient({ campaign_intent_id: 'nonexistent' });
    assert(failed === null, 'HTTP 400 surfaces as null from the client — never as a payload');

    (globalThis as any).fetch = async () => {
      throw new Error('network down');
    };
    const netFail = await discoverCampaignOpportunityClient({ campaign_intent_id: 'nonexistent' });
    assert(netFail === null, 'Network failure surfaces as null from the client — never as a payload');

    (globalThis as any).fetch = async () =>
      new Response(JSON.stringify({ status: 'success', data: { evaluation_id: 'ok_1' } }), { status: 200 });
    const ok = await evaluateCampaignDecisionClient({ campaign_intent_id: 'x' });
    assert(ok?.evaluation_id === 'ok_1', 'Successful HTTP response yields the unwrapped engine payload');
  } finally {
    (globalThis as any).fetch = realFetch;
  }

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 6. Immutability of Scenario Data ---');

  const snapshotBefore = JSON.stringify(chilled);
  buildCampaignIntentFromArchetype(chilled, {
    sku_id: 'P023',
    discount_depth_pct: 33,
    target_region: 'Yorkshire',
    duration_days: 28
  });
  estimateInterventionEconomics(chilled, { discount_pct: 33, stores: 8, duration_days: 28 });
  evaluateCampaignDecision(browserShapeRequest(chilled, { discount_depth_pct: 33 }));
  assert(
    JSON.stringify(chilled) === snapshotBefore,
    'Building intents, estimating economics and evaluating never mutate the archetype'
  );

  const intentA = buildCampaignIntentFromArchetype(chilled, { discount_depth_pct: 10 });
  const intentB = buildCampaignIntentFromArchetype(chilled, { discount_depth_pct: 20 });
  assert(
    intentA.campaign_intent.provisional_discount_depth === 10 &&
      intentB.campaign_intent.provisional_discount_depth === 20,
    'Each built intent carries its own configuration — proposals never share state'
  );

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 7. Provenance & Evidence Honesty Guards ---');

  const bannedSubstrings = ['Real-time telemetry', 'web scrap', 'Met Office weather data', 'EPOS', 'mpirical'];
  for (const arch of CAMPAIGN_ARCHETYPES) {
    const strings: string[] = [];
    const keys: string[] = [];
    walkStringsAndKeys(arch, strings, keys);

    assert(
      !strings.includes('OBSERVED'),
      `${arch.id}: no seeded datum claims the bare governed OBSERVED evidence class`
    );
    const offending = strings.filter(s => bannedSubstrings.some(b => s.includes(b)));
    assert(
      offending.length === 0,
      `${arch.id}: no seeded datum claims a live/production data feed`,
      offending[0]?.slice(0, 60)
    );
    assert(
      !keys.includes('confidence_pct'),
      `${arch.id}: prohibited vocabulary (confidence_pct) is absent from the model`
    );
    assert(
      arch.decision_twin.telemetry_basis === 'SIMULATED_DEMO',
      `${arch.id}: twin telemetry is explicitly declared SIMULATED_DEMO`
    );
    assert(
      ['QUALIFIED', 'PLACEHOLDER_EXCLUDED', 'NON_AUTHORITATIVE'].includes(
        arch.decision_twin.post_campaign_learning.learning_case_status
      ) && arch.decision_twin.post_campaign_learning.learning_case_status !== 'QUALIFIED',
      `${arch.id}: simulated post-campaign outcome is not admissible as a qualified learning case`
    );

    const intent = buildCampaignIntentFromArchetype(arch, {});
    assert(intent.synthetic_demo === true, `${arch.id}: built intent is flagged synthetic_demo`);
  }

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 8. Derived Intervention Economics ---');

  const premium = getArchetypeById('ARCH-PREMIUM-ARTISAN')!;
  const baselineStores = REGION_STORE_COUNTS[premium.default_region] ?? 50;
  const fullScope = estimateInterventionEconomics(premium, {
    discount_pct: premium.default_discount_pct,
    stores: baselineStores,
    duration_days: premium.default_duration_days
  });
  const halfScope = estimateInterventionEconomics(premium, {
    discount_pct: premium.default_discount_pct,
    stores: Math.max(1, Math.round(baselineStores / 2)),
    duration_days: premium.default_duration_days
  });
  assert(
    Math.abs(halfScope.net_contribution_delta_gbp) < Math.abs(fullScope.net_contribution_delta_gbp),
    'Estimated contribution scales down with reduced store scope'
  );
  const curveTier = premium.elasticity_curve.reduce((best, pt) =>
    Math.abs(pt.discount_pct - premium.default_discount_pct) <
    Math.abs(best.discount_pct - premium.default_discount_pct)
      ? pt
      : best
  );
  assert(
    fullScope.expected_demand_uplift_pct === Math.round(curveTier.expected_demand_uplift_pct * 10) / 10,
    'Estimated demand uplift is traceable to the archetype elasticity curve tier'
  );

  // Summary
  console.log('\n======================================================');
  console.log(` TEST SUMMARY: ${passedTests} passed, ${failedTests} failed, ${totalTests} total`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runCampaignIntelligenceTests().catch(err => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
