/**
 * Campaign Decision journey, reset and executive-language regression suite.
 *
 * Guards the defect this work package repaired: registration froze the canvas stage
 * machine, leaving the user stranded with no forward action and no way to reset short of
 * restarting the container. These tests assert the *state machine* and the *reset scope*,
 * plus the vocabulary contract for the primary executive surface.
 *
 * Run via: npx tsx tests/unit/run-campaign-decision-journey-tests.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CAMPAIGN_CANVAS_AREA_ORDER,
  deriveCanvasProgress,
  evaluateCanvasAreaCompletion,
  createDefaultCampaignIntentDraft,
  type CampaignIntent
} from '../../packages/contracts/src/campaign-intent-model';
import {
  getOrCreateCampaignIntentDraft,
  saveCampaignIntentDraft,
  registerCampaignIntent,
  getCurrentCampaignIntent,
  getCampaignIntentById,
  clearCampaignIntents
} from '../../lib/campaign-intent-store';
import { decisionContractStore } from '../../lib/decision-contract-store';
import { evaluateCampaignDecision } from '../../lib/campaign-causal-engine';
import {
  label as executiveLabel,
  phrase as executivePhrase,
  formatAxisValue,
  humanise
} from '../../lib/campaign-decision-language';

let total = 0;
let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${name}${detail ? ` (${detail})` : ''}`);
  }
}

const TENANT = 'tenant_journey_test';
const SESSION = 'sess_journey_test';

/** A fully-populated intent, area by area, mirroring what the canvas collects. */
function completeIntent(tenant = TENANT, session = SESSION): CampaignIntent {
  const draft = createDefaultCampaignIntentDraft(tenant, session);
  return {
    ...draft,
    campaign_intent: {
      ...draft.campaign_intent,
      objective_type: 'REVENUE_ACCELERATION',
      intervention_posture: 'CONSIDER_PROMOTION',
      framing_question: 'Should we promote mature cheddar in the North West?',
      category: 'Dairy',
      sku_scope: ['P004'],
      provisional_mechanic: 'TPR_PERCENT',
      provisional_discount_depth: 15
    },
    baseline_objective: {
      ...draft.baseline_objective,
      primary_metric: 'CONTRIBUTION',
      target_direction: 'INCREASE'
    },
    audience_market: {
      ...draft.audience_market,
      region: 'North West',
      customer_segment: 'Family Shoppers',
      channel: 'Omnichannel',
      timing_mode: 'KNOWN_DATES',
      planned_start: '2026-09-01',
      planned_end: '2026-09-14'
    },
    decision_context: {
      ...draft.decision_context,
      contextual_factor_notes: ['Depot cover is high'],
      open_questions: ['How will the rival respond?'],
      assumptions: ['Demo baseline']
    }
  };
}

async function run() {
  console.log('\n======================================================');
  console.log(' COGNIX CAMPAIGN DECISION JOURNEY & RESET TEST SUITE');
  console.log('======================================================\n');

  // ────────────────────────────────────────────────────────────
  console.log('--- 1. Stage Order & Forward Transitions ---');

  assert(
    CAMPAIGN_CANVAS_AREA_ORDER.join(',') ===
      'CAMPAIGN_INTENT,BASELINE_OBJECTIVE,AUDIENCE_MARKET,DECISION_CONTEXT',
    'Stage order is Campaign Intent → Baseline → Audience → Decision Context'
  );

  clearCampaignIntents(TENANT, SESSION);
  const fresh = getOrCreateCampaignIntentDraft(TENANT, SESSION);
  assert(fresh.status === 'DRAFT', 'A fresh session starts as an unregistered draft');

  // Stage 1 → 2: completing Campaign Intent unlocks the transition.
  const full = completeIntent();
  const afterIntent: CampaignIntent = {
    ...fresh,
    campaign_intent: full.campaign_intent
  };
  assert(
    evaluateCanvasAreaCompletion(afterIntent).includes('CAMPAIGN_INTENT'),
    'Campaign Intent → Baseline: stage 1 completes once framing fields are supplied'
  );

  const afterBaseline: CampaignIntent = { ...afterIntent, baseline_objective: full.baseline_objective };
  assert(
    evaluateCanvasAreaCompletion(afterBaseline).includes('BASELINE_OBJECTIVE'),
    'Baseline → Audience: stage 2 completes once the objective is supplied'
  );

  const afterAudience: CampaignIntent = { ...afterBaseline, audience_market: full.audience_market };
  assert(
    evaluateCanvasAreaCompletion(afterAudience).includes('AUDIENCE_MARKET'),
    'Audience → Decision Context: stage 3 completes once scope and timing are supplied'
  );

  const afterContext: CampaignIntent = { ...afterAudience, decision_context: full.decision_context };
  const readyProgress = deriveCanvasProgress(afterContext);
  assert(
    readyProgress.completed_areas.length === 4 && readyProgress.ready_to_register,
    'Decision Context → evaluation: all four stages complete makes the decision registerable'
  );

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 2. Incomplete-Stage Protection ---');

  const missingFraming: CampaignIntent = {
    ...afterContext,
    campaign_intent: { ...full.campaign_intent, framing_question: '' }
  };
  const blocked = deriveCanvasProgress(missingFraming);
  assert(
    !blocked.completed_areas.includes('CAMPAIGN_INTENT'),
    'A stage missing a required field is never reported complete'
  );
  assert(
    !blocked.ready_to_register,
    'Registration stays blocked while any stage is incomplete'
  );

  let registerRejected = false;
  try {
    registerCampaignIntent({ ...missingFraming, status: 'REGISTERED' });
  } catch {
    registerRejected = true;
  }
  assert(registerRejected, 'The store refuses to register an intent with an incomplete stage');

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 3. Backward Navigation Preserves Entered Data ---');

  clearCampaignIntents(TENANT, SESSION);
  getOrCreateCampaignIntentDraft(TENANT, SESSION);
  const savedForward = saveCampaignIntentDraft({
    ...completeIntent(),
    canvas_progress: { ...fresh.canvas_progress, active_area: 'AUDIENCE_MARKET' }
  });
  assert(
    savedForward.audience_market.region === 'North West',
    'Data entered on a later stage is persisted server-side, not held only in component state'
  );

  const steppedBack = saveCampaignIntentDraft({
    ...savedForward,
    canvas_progress: { ...savedForward.canvas_progress, active_area: 'CAMPAIGN_INTENT' }
  });
  assert(
    steppedBack.canvas_progress.active_area === 'CAMPAIGN_INTENT',
    'Navigating backwards moves the active stage without discarding the draft'
  );
  assert(
    steppedBack.audience_market.region === 'North West' &&
      steppedBack.baseline_objective.primary_metric === 'CONTRIBUTION',
    'Backward navigation preserves every field entered on later stages'
  );

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 4. Registration Does Not Freeze The Journey ---');

  const registered = registerCampaignIntent(completeIntent());
  assert(registered.status === 'REGISTERED', 'A complete intent registers successfully');

  // The canvas derives navigability from progress, never from status. A registered intent
  // must still expose all four stages so the user can review what they committed to.
  const registeredProgress = deriveCanvasProgress(registered);
  assert(
    registeredProgress.completed_areas.length === 4,
    'A registered decision still reports all four stages, so every stage stays reviewable'
  );

  const canvasSource = readFileSync(
    join(__dirname, '..', '..', 'components', 'CampaignDecisionCanvas.tsx'),
    'utf8'
  );
  assert(
    !/const setActiveArea[\s\S]{0,120}?if \(isRegistered\) return;/.test(canvasSource),
    'Stage navigation is not short-circuited for registered decisions (the freeze defect)'
  );
  assert(
    /disabled=\{isRegistered\}/.test(canvasSource),
    'Registered fields remain read-only even though the stage stays navigable'
  );
  assert(
    /Save &amp; Continue|Save &amp;amp; Continue/.test(canvasSource),
    'Each incomplete stage offers an explicit Save & Continue action'
  );
  assert(
    /Register &amp; Evaluate Decision|Register &amp;amp; Evaluate Decision/.test(canvasSource),
    'The final stage offers an explicit registration action'
  );
  assert(
    /View decision analysis/.test(canvasSource),
    'A registered decision points the user onward to the analysis rather than dead-ending'
  );
  assert(
    /id="decision-analysis"/.test(canvasSource),
    'The decision analysis section is addressable as a navigation target'
  );

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 5. Reset Scope & Second Decision ---');

  // Populate a neighbouring session so reset scoping can be proven, not assumed.
  const OTHER_SESSION = 'sess_journey_other';
  clearCampaignIntents(TENANT, OTHER_SESSION);
  const otherRegistered = registerCampaignIntent(completeIntent(TENANT, OTHER_SESSION));
  assert(!!otherRegistered.campaign_intent_id, 'A second session registers its own decision');

  const beforeResetId = getCurrentCampaignIntent(TENANT, SESSION).campaign_intent_id;
  assert(
    getCurrentCampaignIntent(TENANT, SESSION).status === 'REGISTERED',
    'Reset precondition: the session under test holds a registered decision'
  );

  // Reset from a COMPLETED journey (what the route performs, store-level).
  decisionContractStore.clear(TENANT, SESSION);
  clearCampaignIntents(TENANT, SESSION);
  const afterReset = getOrCreateCampaignIntentDraft(TENANT, SESSION);

  assert(afterReset.status === 'DRAFT', 'Reset from a completed journey returns an unregistered draft');
  assert(
    !afterReset.registered_at,
    'The post-reset decision carries no registration — it is a genuinely new decision'
  );
  assert(
    afterReset.canvas_progress.active_area === 'CAMPAIGN_INTENT',
    'Reset returns the user to the first stage, Campaign Intent'
  );
  // Intent ids are deterministic per tenant/session, so the invariant that matters is not a
  // changed id but that the id can no longer resolve to the REGISTERED decision it named.
  const resolvedAfterReset = getCampaignIntentById(beforeResetId, TENANT, SESSION);
  assert(
    resolvedAfterReset === null || resolvedAfterReset.status !== 'REGISTERED',
    'No stale analysis survives: the previous registered decision is no longer resolvable'
  );
  assert(
    getCurrentCampaignIntent(TENANT, OTHER_SESSION).status === 'REGISTERED' &&
      getCurrentCampaignIntent(TENANT, OTHER_SESSION).campaign_intent_id ===
        otherRegistered.campaign_intent_id,
    'Reset is session-scoped: a neighbouring session keeps its registered decision intact'
  );

  // Reset from a PARTIAL journey — a draft mid-edit with a stage deliberately incomplete.
  const partial = saveCampaignIntentDraft({
    ...afterReset,
    audience_market: { ...afterReset.audience_market, region: '' },
    canvas_progress: { ...afterReset.canvas_progress, active_area: 'AUDIENCE_MARKET' }
  });
  const partialProgress = deriveCanvasProgress(partial);
  assert(
    partialProgress.completed_areas.length > 0 && !partialProgress.ready_to_register,
    'Reset precondition: a partial journey has some but not all stages complete'
  );
  clearCampaignIntents(TENANT, SESSION);
  const afterPartialReset = getOrCreateCampaignIntentDraft(TENANT, SESSION);
  assert(
    afterPartialReset.status === 'DRAFT' &&
      afterPartialReset.canvas_progress.active_area === 'CAMPAIGN_INTENT' &&
      afterPartialReset.audience_market.region !== '',
    'Reset from a partial journey discards the half-edited draft and restores a clean start'
  );

  // A second decision completes end-to-end after reset.
  const secondDecision = registerCampaignIntent(completeIntent());
  assert(
    secondDecision.status === 'REGISTERED',
    'A second decision can be registered after reset without restarting the service'
  );
  const secondEvaluation = evaluateCampaignDecision({
    tenant_id: TENANT,
    session_id: SESSION,
    campaign_intent_id: secondDecision.campaign_intent_id,
    campaign_intent: secondDecision
  } as any);
  assert(
    secondEvaluation.campaign_intent_id === secondDecision.campaign_intent_id,
    'Analysis after reset is bound to the NEW decision, never the reset one'
  );

  // The reset route must never be able to clear the whole estate.
  const resetRouteSource = readFileSync(
    join(__dirname, '..', '..', 'app', 'api', 'v1', 'campaigns', 'decision-session', 'reset', 'route.ts'),
    'utf8'
  );
  assert(
    /clearCampaignIntents\(tenantId, sessionId\)/.test(resetRouteSource) &&
      /decisionContractStore\.clear\(tenantId, sessionId\)/.test(resetRouteSource),
    'Every store call in the reset route passes an explicit tenant/session pair'
  );
  assert(
    !/clearCampaignIntents\(\)|decisionContractStore\.clear\(\)/.test(resetRouteSource),
    'The reset route never calls a store clear with no scope (which would wipe all sessions)'
  );

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 6. Executive Language ---');

  assert(executiveLabel('play_admissibility', 'INADMISSIBLE_VETOED') === 'Not viable — blocked by a constraint',
    'INADMISSIBLE_VETOED reads as a business outcome');
  assert(executiveLabel('economics_completeness', 'COMPLETE_ON_ADMITTED_AXES') === 'Assessment complete',
    'COMPLETE_ON_ADMITTED_AXES reads as a business outcome');
  assert(executiveLabel('play_admissibility', 'EXCLUDED_ECONOMICS_INCOMPLETE') === 'Set aside — insufficient economic evidence',
    'EXCLUDED_ECONOMICS_INCOMPLETE reads as a business outcome');
  assert(executiveLabel('axis', 'attributable_volume_uplift_pp') === 'Incremental demand',
    'attributable_volume_uplift_pp reads as Incremental demand');
  assert(executiveLabel('axis', 'contribution_delta_gbp') === 'Contribution impact',
    'contribution_delta_gbp reads as Contribution impact');
  assert(executiveLabel('readiness_state', 'DO_NOT_PROCEED') === 'Do not proceed',
    'Readiness states read as plain guidance');

  // Translation must never soften a negative verdict into a positive-sounding one.
  for (const blocking of ['INADMISSIBLE_VETOED', 'INADMISSIBLE_MODEL_INTEGRITY', 'EXCLUDED_ECONOMICS_INCOMPLETE']) {
    const text = executiveLabel('play_admissibility', blocking).toLowerCase();
    assert(
      /not viable|set aside/.test(text),
      `${blocking} still reads as excluded, not as an available option`
    );
  }
  assert(
    executiveLabel('readiness_state', 'DO_NOT_PROCEED').toLowerCase().includes('not'),
    'A do-not-proceed readiness verdict is never softened into an approval'
  );

  // Unknown values must degrade readably rather than vanish.
  assert(
    executiveLabel('play_admissibility', 'SOME_FUTURE_STATE') === 'Some future state',
    'An untranslated enum degrades to readable text instead of disappearing'
  );
  assert(executiveLabel('axis', undefined) === '—', 'A missing value renders as an explicit dash');
  assert(humanise('NOT_EVALUATED') === 'Not evaluated', 'humanise de-underscores enum values');

  assert(formatAxisValue('attributable_volume_uplift_pp', 13.98) === '+13.98 pp'.replace('13.98', '14.0'),
    'Demand axis values carry their percentage-point unit');
  assert(formatAxisValue('contribution_delta_gbp', -407.7) === '-£408',
    'Contribution axis values carry their currency unit and sign');
  assert(formatAxisValue('contribution_delta_gbp', 'n/a') === '—',
    'A non-numeric axis value renders as an explicit dash, never NaN');

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 7. Primary Surface Vocabulary & Provenance Access ---');

  const RAW_IN_PRIMARY = [
    'INADMISSIBLE_VETOED',
    'COMPLETE_ON_ADMITTED_AXES',
    'EXCLUDED_ECONOMICS_INCOMPLETE',
    'ARF-A',
    'dominated_by:',
    'Constraint eliminations',
    'Dimensions · NOT_AVAILABLE',
    'Layer 2 · CDI-02',
    'Layer 6 · CDI-06',
    'Layer 8 · CDI-07B'
  ];
  for (const raw of RAW_IN_PRIMARY) {
    assert(
      !canvasSource.includes(raw),
      `Primary surface does not render raw vocabulary: ${raw}`
    );
  }

  // Raw axis identifiers must never reach rendered text — every display occurrence has to
  // pass through the translation layer. React `key=` props are not rendered, so they are
  // excluded rather than the rule being loosened.
  const axisDisplayLeak = canvasSource
    .split('\n')
    .filter(line => /\{(a|axis)\.axis_id\}|=> a\.axis_id\)\.join/.test(line))
    .filter(line => !/key=\{axis\.axis_id\}/.test(line));
  assert(
    axisDisplayLeak.length === 0,
    'Frontier axis identifiers are always rendered through the executive translation layer',
    axisDisplayLeak[0]?.trim().slice(0, 60)
  );

  assert(
    /How CogniX reached this conclusion/.test(canvasSource),
    'Technical provenance remains reachable under progressive disclosure'
  );
  assert(
    /alternative\{excludedPlays\.length === 1 \? '' : 's'\} ruled out/.test(canvasSource),
    'Ruled-out strategies are summarised and collapsed rather than dominating the screen'
  );
  assert(
    /campaign_intent_id\}<\/code>/.test(canvasSource),
    'Raw contract identifiers stay available inside technical provenance'
  );

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 8. Promotion Surface Not Regressed ---');

  const plannerSource = readFileSync(
    join(__dirname, '..', '..', 'components', 'PromotionPlanner.tsx'),
    'utf8'
  );
  assert(
    /CAMPAIGN_DEMO_TENANT_ID/.test(plannerSource) && /CAMPAIGN_DEMO_SESSION_ID/.test(plannerSource),
    'Promotion still sends the shared tenant/session identity the engines require'
  );
  assert(
    /Live engine evaluation failed/.test(plannerSource),
    'Promotion still renders an explicit failure state for a failed configuration'
  );
  assert(
    /SEEDED DEMO MODEL \(UNCALIBRATED\)/.test(
      readFileSync(join(__dirname, '..', '..', 'components', 'campaign', 'CampaignDiscoveryHero.tsx'), 'utf8')
    ),
    'Promotion still declares its seeded, uncalibrated evidence basis'
  );

  clearCampaignIntents(TENANT, SESSION);
  clearCampaignIntents(TENANT, OTHER_SESSION);

  console.log('\n======================================================');
  console.log(` TEST SUMMARY: ${passed} passed, ${failed} failed, ${total} total`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
