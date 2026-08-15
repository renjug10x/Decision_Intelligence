/**
 * Unit Test Suite for CogniX CDI-03 Opportunity Window & Micro-Market Opportunity Graph
 * Run via: node --import tsx tests/unit/run-cdi03-tests.ts
 */

import {
  createDefaultCampaignIntentDraft,
  validateOpportunityWindowEvaluation,
  validateMicroMarketOpportunity
} from '../../packages/contracts/src/index';
import {
  clearCampaignIntents,
  registerCampaignIntent
} from '../../lib/campaign-intent-store';
import {
  discoverCampaignOpportunity,
  evaluateMicroMarketOpportunity,
  evaluateOpportunityWindows,
  resolveOpportunityCampaign,
  __test_scoreWindowDate
} from '../../lib/campaign-opportunity-engine';
import {
  evaluateCausalDemandContribution,
  evaluateCampaignDecision
} from '../../lib/campaign-causal-engine';

function runTests() {
  console.log('====================================================');
  console.log('COGNIX CDI-03 OPPORTUNITY WINDOW & MICRO-MARKET TESTS');
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

  const findBestDraft = createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_cdi03_fbw');
  const findBest = registerCampaignIntent({
    ...findBestDraft,
    campaign_intent: {
      ...findBestDraft.campaign_intent,
      objective_type: 'REVENUE_ACCELERATION',
      intervention_posture: 'CONSIDER_PROMOTION',
      provisional_mechanic: '20_percent_off',
      provisional_discount_depth: 20,
      category: 'ambient_grocery',
      sku_scope: ['ambient_grocery']
    },
    baseline_objective: {
      ...findBestDraft.baseline_objective,
      primary_metric: 'REVENUE',
      target_direction: 'INCREASE'
    },
    audience_market: {
      ...findBestDraft.audience_market,
      region: 'North West',
      timing_mode: 'FIND_BEST_WINDOW',
      planned_start: undefined,
      planned_end: undefined,
      store_cohort_hint: 'Superstore'
    }
  });

  // TEST 1: Opportunity window evaluation validates
  const windowsFbw = evaluateOpportunityWindows(findBest);
  assert(
    validateOpportunityWindowEvaluation(windowsFbw).valid &&
      windowsFbw.candidates.length >= 4 &&
      windowsFbw.timing_mode === 'FIND_BEST_WINDOW',
    'Test 1: FIND_BEST_WINDOW produces validated candidate set'
  );

  // TEST 2: Deterministic ranking — recommended is highest yield
  const sorted = [...windowsFbw.candidates].sort((a, b) => b.yield_score - a.yield_score);
  assert(
    windowsFbw.recommended_window_id === sorted[0].window_id &&
      windowsFbw.recommended_window.yield_score === sorted[0].yield_score,
    'Test 2: Deterministic ranking selects highest-yield window for FIND_BEST_WINDOW'
  );

  // TEST 3: Different dates produce materially different outcomes
  const early = __test_scoreWindowDate('2026-01-12', findBest);
  const late = __test_scoreWindowDate('2026-08-17', findBest);
  const autumn = __test_scoreWindowDate('2026-10-05', findBest);
  const spread = Math.max(early.yield_score, late.yield_score, autumn.yield_score) -
    Math.min(early.yield_score, late.yield_score, autumn.yield_score);
  assert(
    spread >= 5 &&
      (early.yield_score !== late.yield_score || late.yield_score !== autumn.yield_score),
    'Test 3: Different start dates produce materially different yield scores',
    `spread=${spread} early=${early.yield_score} late=${late.yield_score} autumn=${autumn.yield_score}`
  );

  // TEST 4: KNOWN_DATES recommends stated window even if not globally best
  clearCampaignIntents();
  const knownDraft = createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_cdi03_known');
  const known = registerCampaignIntent({
    ...knownDraft,
    campaign_intent: {
      ...knownDraft.campaign_intent,
      intervention_posture: 'CONSIDER_PROMOTION',
      provisional_mechanic: '20_percent_off',
      provisional_discount_depth: 15
    },
    audience_market: {
      ...knownDraft.audience_market,
      region: 'London',
      timing_mode: 'KNOWN_DATES',
      planned_start: '2026-09-01T00:00:00.000Z',
      planned_end: '2026-09-07T00:00:00.000Z'
    }
  });
  const windowsKnown = evaluateOpportunityWindows(known);
  const stated = windowsKnown.candidates.find(c => c.is_stated_dates);
  assert(
    !!stated &&
      windowsKnown.recommended_window_id === stated.window_id &&
      stated.start_date === '2026-09-01',
    'Test 4: KNOWN_DATES recommends the stated planned window'
  );

  // TEST 5: Factors are labelled synthetic_demo where appropriate
  assert(
    windowsFbw.recommended_window.factors.every(f => typeof f.synthetic_demo === 'boolean') &&
      windowsFbw.recommended_window.factors.some(f => f.synthetic_demo === true) &&
      windowsFbw.synthetic_demo === true,
    'Test 5: Window factors carry explicit synthetic_demo provenance'
  );

  // TEST 6: Micro-market evaluates all 50 stores
  const marketsNw = evaluateMicroMarketOpportunity(findBest);
  assert(
    validateMicroMarketOpportunity(marketsNw).valid &&
      marketsNw.stores_evaluated === 50 &&
      marketsNw.stores.length === 50,
    'Test 6: Micro-market evaluates canonical 50-store WP10-A seed'
  );

  // TEST 7: Store/cohort differentiation — North West vs London scopes differ
  clearCampaignIntents();
  const londonDraft = createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_cdi03_lon');
  const london = registerCampaignIntent({
    ...londonDraft,
    campaign_intent: {
      ...londonDraft.campaign_intent,
      intervention_posture: 'CONSIDER_NON_PROMOTION'
    },
    audience_market: {
      ...londonDraft.audience_market,
      region: 'London',
      timing_mode: 'FIND_BEST_WINDOW'
    }
  });
  const marketsLon = evaluateMicroMarketOpportunity(london);
  const nwIncluded = new Set(marketsNw.stores.filter(s => s.included).map(s => s.store_id));
  const lonIncluded = new Set(marketsLon.stores.filter(s => s.included).map(s => s.store_id));
  const nwOnly = [...nwIncluded].filter(id => !lonIncluded.has(id));
  const lonOnly = [...lonIncluded].filter(id => !nwIncluded.has(id));
  assert(
    nwIncluded.size > 0 &&
      lonIncluded.size > 0 &&
      (nwOnly.length > 0 || lonOnly.length > 0) &&
      marketsLon.stores.filter(s => s.included).every(s => s.region === 'London'),
    'Test 7: Regional scopes produce differentiated included store sets',
    `nw=${nwIncluded.size} lon=${lonIncluded.size} nwOnly=${nwOnly.length} lonOnly=${lonOnly.length}`
  );

  // TEST 8: Explainable inclusion/exclusion reasons on every store
  assert(
    marketsNw.stores.every(
      s =>
        (s.included ? s.inclusion_reasons.length > 0 : true) &&
        (s.inclusion_reasons.length > 0 || s.exclusion_reasons.length > 0)
    ),
    'Test 8: Every store has explainable inclusion and/or exclusion reasons'
  );

  // TEST 9: Tiers span the classification space (not a single opaque rank)
  const tiers = new Set(marketsNw.stores.map(s => s.tier));
  assert(
    tiers.size >= 2 &&
      marketsNw.recommended_store_ids.every(id => marketsNw.stores.find(s => s.store_id === id)?.included),
    'Test 9: Micro-market uses multi-tier classification with explainable recommendations'
  );

  // Re-register FIND_BEST_WINDOW campaign after prior clears (store is ephemeral)
  clearCampaignIntents();
  const findBest2 = registerCampaignIntent({
    ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_cdi03_fbw2'),
    campaign_intent: {
      ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_cdi03_fbw2').campaign_intent,
      objective_type: 'REVENUE_ACCELERATION',
      intervention_posture: 'CONSIDER_PROMOTION',
      provisional_mechanic: '20_percent_off',
      provisional_discount_depth: 20,
      category: 'ambient_grocery',
      sku_scope: ['ambient_grocery']
    },
    baseline_objective: {
      ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_cdi03_fbw2').baseline_objective,
      primary_metric: 'REVENUE',
      target_direction: 'INCREASE'
    },
    audience_market: {
      ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_cdi03_fbw2').audience_market,
      region: 'North West',
      timing_mode: 'FIND_BEST_WINDOW',
      store_cohort_hint: 'Superstore'
    }
  });

  // TEST 10: Combined discovery
  const discovery = discoverCampaignOpportunity({
    tenant_id: findBest2.tenant_id,
    session_id: findBest2.session_id,
    campaign_intent_id: findBest2.campaign_intent_id
  });
  assert(
    discovery.opportunity_windows.campaign_intent_id === findBest2.campaign_intent_id &&
      discovery.micro_markets.campaign_intent_id === findBest2.campaign_intent_id &&
      discovery.tenant_id === findBest2.tenant_id,
    'Test 10: Combined opportunity discovery returns both when/where evaluations'
  );

  // TEST 11: CDI-02 temporal hook — resolved window replaces FIND_BEST_WINDOW timing placeholder
  const windowsFbw2 = evaluateOpportunityWindows(findBest2);
  const causalFlat = evaluateCausalDemandContribution(findBest2, { include_signals: false });
  const temporalFlat = causalFlat.drivers.find(d => d.driver_id === 'temporal_response')!;
  const resolvedPp = windowsFbw2.resolved_temporal_uplift_pp;
  const causalResolved = evaluateCausalDemandContribution(findBest2, {
    include_signals: false,
    resolved_temporal_uplift_pp: resolvedPp,
    opportunity_window_id: windowsFbw2.recommended_window_id
  });
  const temporalResolved = causalResolved.drivers.find(d => d.driver_id === 'temporal_response')!;
  assert(
    // FIND_BEST_WINDOW without planned_start → timing placeholder → 0.5 when unresolved
    temporalFlat.contribution_pp === 0.5 &&
      temporalFlat.evidence_refs.includes('CDI01_TIMING_PLACEHOLDER_EXCLUDED') &&
      temporalResolved.contribution_pp === resolvedPp &&
      temporalResolved.evidence_refs.includes('CDI03_RESOLVED_OPPORTUNITY_WINDOW') &&
      causalResolved.reconciliation_ok,
    'Test 11: CDI-02 additive temporal hook uses resolved window uplift when supplied',
    `flat=${temporalFlat.contribution_pp} resolved=${temporalResolved.contribution_pp} expected=${resolvedPp}`
  );

  // TEST 12: Without resolved window, CDI-02 FIND_BEST_WINDOW placeholder behaviour unchanged
  assert(
    temporalFlat.contribution_pp === 0.5 &&
      temporalFlat.evidence_refs.includes('CDI01_TIMING_PLACEHOLDER_EXCLUDED'),
    'Test 12: CDI-02 FIND_BEST_WINDOW timing-placeholder dampener preserved when CDI-03 hook omitted'
  );

  // TEST 13: CONSIDER_PROMOTION alone does not invent mechanic from opportunity engine
  clearCampaignIntents();
  const postureOnlyDraft = createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_cdi03_posture');
  const postureOnly = registerCampaignIntent({
    ...postureOnlyDraft,
    campaign_intent: {
      ...postureOnlyDraft.campaign_intent,
      intervention_posture: 'CONSIDER_PROMOTION'
      // no provisional_mechanic
    },
    audience_market: {
      ...postureOnlyDraft.audience_market,
      region: 'Scotland',
      timing_mode: 'FIND_BEST_WINDOW'
    }
  });
  const windowsPosture = evaluateOpportunityWindows(postureOnly);
  assert(
    windowsPosture.candidates.every(
      c => !c.factors.some(f => /percent_off|BOGOF|mechanic/i.test(f.label + f.rationale))
    ),
    'Test 13: Opportunity windows do not infer a promotion mechanic from CONSIDER_PROMOTION'
  );

  // Restore findBest2 for isolation tests
  clearCampaignIntents();
  const findBest3 = registerCampaignIntent({
    ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_cdi03_fbw3'),
    campaign_intent: {
      ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_cdi03_fbw3').campaign_intent,
      intervention_posture: 'CONSIDER_PROMOTION',
      provisional_mechanic: '20_percent_off',
      provisional_discount_depth: 20
    },
    audience_market: {
      ...createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_cdi03_fbw3').audience_market,
      region: 'North West',
      timing_mode: 'FIND_BEST_WINDOW'
    }
  });

  // TEST 14: Tenant isolation — cross-tenant by-id discovery fails
  let tenantBlocked = false;
  try {
    discoverCampaignOpportunity({
      tenant_id: 'tenant_other',
      session_id: findBest3.session_id,
      campaign_intent_id: findBest3.campaign_intent_id
    });
  } catch (e: any) {
    tenantBlocked =
      String(e.message).includes('CampaignIntentNotFound') ||
      String(e.message).includes('Tenant boundary');
  }
  assert(tenantBlocked, 'Test 14: Cross-tenant opportunity discovery is rejected');

  // TEST 15: Session isolation
  let sessionBlocked = false;
  try {
    discoverCampaignOpportunity({
      tenant_id: findBest3.tenant_id,
      session_id: 'sess_intruder',
      campaign_intent_id: findBest3.campaign_intent_id
    });
  } catch (e: any) {
    sessionBlocked =
      String(e.message).includes('CampaignIntentNotFound') ||
      String(e.message).includes('Session boundary');
  }
  assert(sessionBlocked, 'Test 15: Cross-session opportunity discovery is rejected');

  // TEST 16: No cross-store leakage — scoped regions only include matching stores
  assert(
    marketsLon.stores.filter(s => s.included).every(s => s.region === 'London') &&
      marketsNw.stores.filter(s => s.included).every(s => s.region === 'North West'),
    'Test 16: No cross-region inclusion leakage for scoped campaigns'
  );

  // TEST 17: Evaluate endpoint accepts resolved temporal uplift
  clearCampaignIntents();
  const evalDraft = createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_cdi03_eval');
  const evalCampaign = registerCampaignIntent({
    ...evalDraft,
    campaign_intent: {
      ...evalDraft.campaign_intent,
      intervention_posture: 'CONSIDER_PROMOTION',
      provisional_mechanic: '20_percent_off',
      provisional_discount_depth: 20
    },
    audience_market: {
      ...evalDraft.audience_market,
      timing_mode: 'FIND_BEST_WINDOW',
      region: 'Midlands'
    }
  });
  const ow = evaluateOpportunityWindows(evalCampaign);
  const combined = evaluateCampaignDecision({
    tenant_id: evalCampaign.tenant_id,
    session_id: evalCampaign.session_id,
    campaign_intent_id: evalCampaign.campaign_intent_id,
    include_signals: false,
    resolved_temporal_uplift_pp: ow.resolved_temporal_uplift_pp,
    opportunity_window_id: ow.recommended_window_id
  });
  const temporal = combined.causal.drivers.find(d => d.driver_id === 'temporal_response')!;
  assert(
    temporal.contribution_pp === ow.resolved_temporal_uplift_pp &&
      combined.counterfactual.campaign_delta.attributable_uplift_pp !== 0,
    'Test 17: Combined evaluate accepts CDI-03 resolved temporal uplift'
  );

  // TEST 18: Adversarial — missing tenant rejected
  let missingTenant = false;
  try {
    discoverCampaignOpportunity({
      tenant_id: '',
      session_id: 'sess_x',
      campaign_intent: findBest
    } as any);
  } catch {
    missingTenant = true;
  }
  assert(missingTenant, 'Test 18: Adversarial empty tenant_id is rejected');

  // TEST 19: Adversarial — inline intent with mismatched tenant fails
  let mismatch = false;
  try {
    discoverCampaignOpportunity({
      tenant_id: 'tenant_uk_retail_01',
      session_id: 'sess_ok',
      campaign_intent: { ...findBest, tenant_id: 'tenant_evil', session_id: 'sess_ok' }
    });
  } catch (e: any) {
    mismatch = String(e.message).includes('Tenant boundary');
  }
  assert(mismatch, 'Test 19: Adversarial inline tenant mismatch is rejected');

  // TEST 20: Cohort hint influences Superstore preference without opaque AI ranking
  const superstoreAvg =
    marketsNw.stores.filter(s => s.format === 'Superstore' && s.region === 'North West')
      .reduce((a, s) => a + s.opportunity_score, 0) /
    Math.max(1, marketsNw.stores.filter(s => s.format === 'Superstore' && s.region === 'North West').length);
  const metroAvg =
    marketsNw.stores.filter(s => s.format === 'Metro' && s.region === 'North West')
      .reduce((a, s) => a + s.opportunity_score, 0) /
    Math.max(1, marketsNw.stores.filter(s => s.format === 'Metro' && s.region === 'North West').length || 1);
  // North West may have no Metro — compare Superstore vs Standard instead if needed
  const standardAvg =
    marketsNw.stores.filter(s => s.format === 'Standard' && s.region === 'North West')
      .reduce((a, s) => a + s.opportunity_score, 0) /
    Math.max(1, marketsNw.stores.filter(s => s.format === 'Standard' && s.region === 'North West').length);
  assert(
    superstoreAvg > standardAvg ||
      marketsNw.stores.some(s => s.format === 'Superstore' && s.factors.some(f => f.factor_id === 'cohort_hint' && f.contribution > 0)),
    'Test 20: Cohort hint / format fitness produce explainable Superstore preference',
    `super=${superstoreAvg} standard=${standardAvg} metro=${metroAvg}`
  );

  // TEST 21: Do Nothing campaign still discovers windows (timing is scope, not intervention)
  clearCampaignIntents();
  const dnDraft = createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_cdi03_dn');
  const dn = registerCampaignIntent({
    ...dnDraft,
    campaign_intent: {
      ...dnDraft.campaign_intent,
      intervention_posture: 'CONSIDER_DO_NOTHING'
    },
    audience_market: {
      ...dnDraft.audience_market,
      region: 'Wales',
      timing_mode: 'FIND_BEST_WINDOW'
    }
  });
  const dnWindows = evaluateOpportunityWindows(dn);
  const dnMarkets = evaluateMicroMarketOpportunity(dn);
  assert(
    dnWindows.candidates.length >= 4 &&
      dnMarkets.stores_evaluated === 50 &&
      dnMarkets.stores.filter(s => s.included).every(s => s.region === 'Wales'),
    'Test 21: Do Nothing posture still yields window/market intelligence (scope ≠ intervention)'
  );

  // ---------------------------------------------------------------------
  // Regression guards for defects found in independent CDI-03 review
  // ---------------------------------------------------------------------

  function inlineIntent(over: Partial<Record<string, any>> = {}) {
    const d = createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_cdi03_reg');
    return { ...d, audience_market: { ...d.audience_market, ...over } } as any;
  }

  // TEST 22 (regression): country qualifiers must not collapse regional scope.
  // Previously any region containing "uk" matched every store, and each store
  // was told it "matches campaign scope" — an untruthful inclusion reason.
  {
    const qualified = evaluateMicroMarketOpportunity(inlineIntent({ region: 'UK South East' }));
    const plain = evaluateMicroMarketOpportunity(inlineIntent({ region: 'South East' }));
    const qualifiedRegions = [...new Set(qualified.stores.filter(s => s.included).map(s => s.region))];
    assert(
      qualified.stores_included === plain.stores_included &&
        qualified.stores_included < 50 &&
        qualifiedRegions.length === 1 &&
        qualifiedRegions[0] === 'South East',
      'Test 22: Country-qualified region scope does not collapse to the whole estate',
      `qualified=${qualified.stores_included} plain=${plain.stores_included} regions=${JSON.stringify(qualifiedRegions)}`
    );
  }

  // TEST 23 (regression): explicit national scope still covers the estate.
  {
    const national = evaluateMicroMarketOpportunity(inlineIntent({ region: 'National' }));
    const ukWide = evaluateMicroMarketOpportunity(inlineIntent({ region: 'UK' }));
    assert(
      national.stores_included === 50 && ukWide.stores_included === 50,
      'Test 23: Explicit national / UK-wide scope includes the full estate',
      `national=${national.stores_included} uk=${ukWide.stores_included}`
    );
  }

  // TEST 24 (regression): window yield must not saturate at the 0-100 ceiling.
  // Clipping produced exact ties at the top of the ranking, so the recommended
  // window was decided by sort order and the CDI-02 uplift pinned to its max.
  {
    const c = inlineIntent({ region: 'North West' });
    const w = evaluateOpportunityWindows(c);
    const topScore = w.candidates[0].yield_score;
    const tiesAtTop = w.candidates.filter(x => x.yield_score === topScore).length;
    const yearly: number[] = [];
    for (let i = 0; i < 52; i++) {
      const day = new Date(Date.UTC(2026, 0, 5) + i * 7 * 86400000).toISOString().slice(0, 10);
      yearly.push(__test_scoreWindowDate(day, c).yield_score);
    }
    assert(
      tiesAtTop === 1 &&
        yearly.every(y => y > 0 && y < 100) &&
        new Set(yearly).size >= 50,
      'Test 24: Window yield scores never saturate the ceiling or tie at the top of the ranking',
      `tiesAtTop=${tiesAtTop} clamped=${yearly.filter(y => y >= 100 || y <= 0).length} distinct=${new Set(yearly).size}`
    );
  }

  // TEST 25 (regression): resolved temporal uplift must actually differentiate
  // rather than resolving to the ceiling for every campaign.
  {
    const pps = ['North West', 'London', 'Wales', 'Scotland'].map(
      r => evaluateOpportunityWindows(inlineIntent({ region: r })).resolved_temporal_uplift_pp
    );
    assert(
      new Set(pps).size > 1 && pps.every(p => p > 0.35 && p < 2.4),
      'Test 25: Resolved temporal uplift differentiates and is not pinned to the ceiling',
      `pps=${JSON.stringify(pps)}`
    );
  }

  // TEST 26 (regression): the fixed demo anchor must be disclosed, never
  // presented as live or current calendar evidence.
  {
    const w = evaluateOpportunityWindows(inlineIntent({ region: 'North West' }));
    const a = w.discovery_anchor;
    assert(
      !!a &&
        a.anchor_mode === 'fixed_demo_anchor' &&
        /^\d{4}-\d{2}-\d{2}$/.test(a.anchor_date) &&
        /not live/i.test(a.disclosure) &&
        w.provenance.discovery_anchor_date === a.anchor_date &&
        w.provenance.discovery_anchor_is_live_date === 'false' &&
        w.candidates.filter(c => !c.is_stated_dates).every(c => c.start_date >= a.anchor_date),
      'Test 26: Fixed demo anchor is disclosed in contract and provenance, not shown as live evidence'
    );
  }

  // TEST 27 (regression): KNOWN_DATES must never be satisfied by an anchor-grid
  // window. Previously a KNOWN_DATES intent with no planned dates silently
  // recommended a seeded window as if it were the campaign's stated dates.
  {
    let rejectedMissing = false;
    try {
      evaluateOpportunityWindows(
        inlineIntent({ timing_mode: 'KNOWN_DATES', planned_start: undefined, planned_end: undefined })
      );
    } catch (e: any) {
      rejectedMissing = String(e.message).includes('InvalidTimingIntent');
    }
    let rejectedInverted = false;
    try {
      evaluateOpportunityWindows(
        inlineIntent({
          timing_mode: 'KNOWN_DATES',
          planned_start: '2026-09-20T00:00:00.000Z',
          planned_end: '2026-09-01T00:00:00.000Z'
        })
      );
    } catch (e: any) {
      rejectedInverted = String(e.message).includes('InvalidTimingIntent');
    }
    assert(
      rejectedMissing && rejectedInverted,
      'Test 27: KNOWN_DATES without valid stated dates is rejected, not silently anchored',
      `missing=${rejectedMissing} inverted=${rejectedInverted}`
    );
  }

  // TEST 28 (regression): a stated window is reported verbatim. Previously any
  // stated span outside 1-28 days was silently replaced by a 7-day window, so
  // the canvas reported an end date the user never stated.
  {
    const w = evaluateOpportunityWindows(
      inlineIntent({
        timing_mode: 'KNOWN_DATES',
        planned_start: '2026-09-01T00:00:00.000Z',
        planned_end: '2027-03-01T00:00:00.000Z'
      })
    );
    const stated = w.candidates.find(c => c.is_stated_dates)!;
    assert(
      stated.start_date === '2026-09-01' &&
        stated.end_date === '2027-03-01' &&
        stated.duration_days === 182 &&
        w.recommended_window_id === stated.window_id,
      'Test 28: Stated KNOWN_DATES window is honoured verbatim, never silently rewritten',
      `start=${stated.start_date} end=${stated.end_date} dur=${stated.duration_days}`
    );
  }

  // TEST 29 (regression): window scoring is duration-invariant, so a long stated
  // window is not mechanically advantaged by counting more weekdays.
  {
    const short = evaluateOpportunityWindows(
      inlineIntent({
        timing_mode: 'KNOWN_DATES',
        planned_start: '2026-09-01T00:00:00.000Z',
        planned_end: '2026-09-07T00:00:00.000Z'
      })
    ).candidates.find(c => c.is_stated_dates)!;
    const long = evaluateOpportunityWindows(
      inlineIntent({
        timing_mode: 'KNOWN_DATES',
        planned_start: '2026-09-01T00:00:00.000Z',
        planned_end: '2026-11-01T00:00:00.000Z'
      })
    ).candidates.find(c => c.is_stated_dates)!;
    assert(
      short.yield_score > 0 && short.yield_score < 100 && long.yield_score > 0 && long.yield_score < 100,
      'Test 29: Long stated windows score on the same bounded scale as short windows',
      `short=${short.yield_score} long=${long.yield_score}`
    );
  }

  // TEST 30 (regression): proxy-derived micro-market factors must be labelled as
  // modelled proxies, never as observed store measurements.
  {
    const m = evaluateMicroMarketOpportunity(inlineIntent({ region: 'North West' }));
    const proxyIds = ['catchment_density', 'staff_capacity', 'availability_proxy'];
    const statedIds = ['region_match', 'cohort_hint'];
    const store = m.stores[0];
    assert(
      proxyIds.every(id => {
        const f = store.factors.find(x => x.factor_id === id)!;
        return f && f.synthetic_demo === true && /proxy|synthetic/i.test(f.label + f.rationale);
      }) &&
        statedIds.every(id => store.factors.find(x => x.factor_id === id)?.synthetic_demo === false) &&
        m.synthetic_demo === true,
      'Test 30: Proxy factors are labelled as modelled proxies; stated-scope factors are not synthetic'
    );
  }

  // TEST 31 (regression): tenant/session isolation holds on every CDI-03 entry
  // point, not only the combined discovery orchestrator.
  {
    clearCampaignIntents();
    const owner = registerCampaignIntent({
      ...createDefaultCampaignIntentDraft('tenant_owner', 'sess_owner'),
      audience_market: {
        ...createDefaultCampaignIntentDraft('tenant_owner', 'sess_owner').audience_market,
        region: 'North West',
        timing_mode: 'FIND_BEST_WINDOW'
      }
    });
    const attempts: Array<[string, string]> = [
      ['tenant_intruder', 'sess_owner'],
      ['tenant_owner', 'sess_intruder']
    ];
    const blocked = attempts.every(([t, s]) => {
      try {
        resolveOpportunityCampaign({
          tenant_id: t,
          session_id: s,
          campaign_intent_id: owner.campaign_intent_id
        });
        return false;
      } catch (e: any) {
        return (
          String(e.message).includes('CampaignIntentNotFound') ||
          String(e.message).includes('boundary violation')
        );
      }
    });
    assert(blocked, 'Test 31: Shared CDI-03 resolver enforces tenant and session boundaries');
  }

  console.log('\n====================================================');
  console.log(`CDI-03 RESULTS: ${passed} passed, ${failed} failed`);
  console.log('====================================================');
  if (failed > 0) process.exit(1);
}

runTests();
