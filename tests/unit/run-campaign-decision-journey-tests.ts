/**
 * Campaign Decision journey, reset, experiment history, and executive-language regression suite.
 *
 * Covers all 16 regression requirements in Section 20:
 * 1. Fresh session starts with 0 stages completed (completed_areas: []).
 * 2. Structural validity check works independently of user confirmation.
 * 3. User confirmation via Save & Continue records stage in completed_areas.
 * 4. Stage rail renders checkmarks on confirmed stages and numbers on unconfirmed.
 * 5. Redundant COMPLETE badges are absent from UI.
 * 6. Progress indicator renders '{completed_count} of 4 stages reviewed'.
 * 7. Registering freezes contract while keeping stages navigable.
 * 8. Reset decision clears draft, analysis, and journey progress back to 0 completed stages.
 * 9. Reset preserves completed historical decision experiments in CampaignDecisionExperiment store.
 * 10. Preservation assigns sequential EXP-001 format IDs and captures snapshots, metrics, trade-offs, and evidence posture.
 * 11. Preserving an experiment does NOT create an unverified LearningCase.
 * 12. Experiment history filtering by category, region, objective, recommendation.
 * 13. Historical review banner renders read-only notification and return route.
 * 14. Comparison modal generates deterministic 'What changed?' and 'Why it matters' narrative synthesis.
 * 15. Execution Brief renders 20-second executive summary with 'Prepare Commitment Handoff' and execution boundary notice without claiming external campaign execution.
 * 16. Promotion planner and discovery hero surfaces remain unregressed.
 *
 * Run via: npx tsx tests/unit/run-campaign-decision-journey-tests.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CAMPAIGN_CANVAS_AREA_ORDER,
  deriveCanvasProgress,
  evaluateCanvasAreaCompletion,
  evaluateCanvasAreaStructural,
  createDefaultCampaignIntentDraft,
  type CampaignIntent
} from '../../packages/contracts/src/campaign-intent-model';
import {
  validateCampaignDecisionExperiment,
  validateExperimentComparison,
  validateExecutionBrief,
  mapReadinessStateToVerdict,
  type CampaignDecisionExperiment
} from '../../packages/contracts/src/campaign-experiment-model';
import { campaignExperimentStore } from '../../lib/campaign-experiment-store';
import {
  getOrCreateCampaignIntentDraft,
  saveCampaignIntentDraft,
  registerCampaignIntent,
  getCurrentCampaignIntent,
  getCampaignIntentById,
  clearCampaignIntents
} from '../../lib/campaign-intent-store';
import { decisionContractStore } from '../../lib/decision-contract-store';
import { learningCandidateStore } from '../../lib/learning-candidate-store';
import { POST as experimentsPOST, GET as experimentsGET } from '../../app/api/v1/campaigns/experiments/route';
import { GET as experimentByIdGET } from '../../app/api/v1/campaigns/experiments/[id]/route';
import { GET as experimentBriefGET } from '../../app/api/v1/campaigns/experiments/[id]/brief/route';
import { POST as experimentComparePOST } from '../../app/api/v1/campaigns/experiments/compare/route';
import { evaluateCampaignDecision } from '../../lib/campaign-causal-engine';
import {
  label as executiveLabel,
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
  console.log(' COGNIX CAMPAIGN DECISION EXPERIMENT & JOURNEY TEST SUITE');
  console.log('======================================================\n');

  // ────────────────────────────────────────────────────────────
  console.log('--- 1. Stage Order & Decoupled Progression ---');

  assert(
    CAMPAIGN_CANVAS_AREA_ORDER.join(',') ===
      'CAMPAIGN_INTENT,BASELINE_OBJECTIVE,AUDIENCE_MARKET,DECISION_CONTEXT',
    'Stage order is Campaign Intent → Baseline → Audience → Decision Context'
  );

  clearCampaignIntents(TENANT, SESSION);
  campaignExperimentStore.clear(TENANT, SESSION);
  const fresh = getOrCreateCampaignIntentDraft(TENANT, SESSION);
  assert(fresh.status === 'DRAFT', 'A fresh session starts as an unregistered draft');
  assert(
    fresh.canvas_progress.completed_areas.length === 0,
    'Requirement 1: Fresh session starts with 0 stages completed (completed_areas: [])'
  );

  const full = completeIntent();

  // Requirement 2: Structural validity check works independently of user confirmation
  assert(
    evaluateCanvasAreaStructural(full).length === 4,
    'Requirement 2: Structural validity check evaluates all 4 areas as valid'
  );
  assert(
    evaluateCanvasAreaCompletion(full).length === 0,
    'Requirement 2: Completed areas remain empty until user explicitly confirms them'
  );

  // Requirement 3: User confirmation via Save & Continue records stage in completed_areas
  const stage1Confirmed: CampaignIntent = {
    ...fresh,
    campaign_intent: full.campaign_intent,
    canvas_progress: {
      active_area: 'BASELINE_OBJECTIVE',
      completed_areas: ['CAMPAIGN_INTENT'],
      ready_to_register: false
    }
  };
  const savedStage1 = saveCampaignIntentDraft(stage1Confirmed);
  assert(
    savedStage1.canvas_progress.completed_areas.includes('CAMPAIGN_INTENT'),
    'Requirement 3: Save & Continue confirms stage 1 into completed_areas'
  );

  const stage2Confirmed: CampaignIntent = {
    ...savedStage1,
    baseline_objective: full.baseline_objective,
    canvas_progress: {
      active_area: 'AUDIENCE_MARKET',
      completed_areas: ['CAMPAIGN_INTENT', 'BASELINE_OBJECTIVE'],
      ready_to_register: false
    }
  };
  const savedStage2 = saveCampaignIntentDraft(stage2Confirmed);
  assert(
    savedStage2.canvas_progress.completed_areas.includes('BASELINE_OBJECTIVE'),
    'Requirement 3: Stage 2 confirmation preserves stage 1 and adds stage 2'
  );

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 2. UI Semantics & Progress Indicators ---');

  const canvasSource = readFileSync(
    join(__dirname, '..', '..', 'components', 'CampaignDecisionCanvas.tsx'),
    'utf8'
  );

  assert(
    /CheckCircle2/.test(canvasSource) && /AREA_META\[area\]\.step/.test(canvasSource),
    'Requirement 4: Stage rail renders checkmarks on confirmed stages and numbers on unconfirmed'
  );
  assert(
    !/COMPLETE/.test(canvasSource.slice(canvasSource.indexOf('CAMPAIGN_CANVAS_AREA_ORDER.map'), canvasSource.indexOf('{/* Active area panel */}'))),
    'Requirement 5: Redundant COMPLETE text badges are eliminated from stage rail'
  );
  assert(
    /of 4 stages reviewed/.test(canvasSource),
    'Requirement 6: Progress indicator renders "{completed_count} of 4 stages reviewed"'
  );

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 3. Registration Freezes Contract But Keeps Stages Navigable ---');

  const allConfirmed: CampaignIntent = {
    ...full,
    canvas_progress: {
      active_area: 'DECISION_CONTEXT',
      completed_areas: [...CAMPAIGN_CANVAS_AREA_ORDER],
      ready_to_register: true
    }
  };
  const registered = registerCampaignIntent(allConfirmed);
  assert(registered.status === 'REGISTERED', 'Requirement 7: Intent registers successfully');
  assert(
    deriveCanvasProgress(registered).completed_areas.length === 4,
    'Requirement 7: Registered intent reports the four stages the user actually confirmed'
  );
  assert(
    /disabled=\{isFieldsDisabled\}|disabled=\{isRegistered\}/.test(canvasSource),
    'Requirement 7: Registered fields are read-only while stages remain navigable'
  );

  // Registration must not retrospectively invent stage review. A registered intent whose user
  // never confirmed the stages reports what they confirmed, not a full set of checkmarks.
  const registeredWithoutReview: CampaignIntent = {
    ...registered,
    canvas_progress: { ...registered.canvas_progress, completed_areas: ['CAMPAIGN_INTENT'] }
  };
  assert(
    deriveCanvasProgress(registeredWithoutReview).completed_areas.length === 1,
    'Requirement 7: Registration does not fabricate completed_areas the user never confirmed'
  );
  assert(
    evaluateCanvasAreaStructural(registeredWithoutReview).length === 4,
    'Requirement 7: Structural completeness stays independent of user-confirmed review'
  );
  assert(
    /const canRegisterDecision = isCurrentStageValid && unreviewedOtherStages\.length === 0/.test(
      canvasSource
    ),
    'Requirement 7: Register is gated on every stage having been reviewed'
  );

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 4. Reset Semantics & Historical Experiment Preservation ---');

  // Preserve an experiment before reset
  const exp1 = campaignExperimentStore.saveExperiment(TENANT, SESSION, {
    campaign_intent_id: registered.campaign_intent_id,
    framing_question: registered.campaign_intent.framing_question,
    objective_type: registered.campaign_intent.objective_type,
    objective_label: 'Revenue Acceleration',
    category: 'Dairy',
    sku_scope: ['P004'],
    region: 'North West',
    audience_segment: 'Family Shoppers',
    timing_mode: 'KNOWN_DATES',
    planned_window: '2026-09-01 to 2026-09-14',
    intervention_posture: 'CONSIDER_PROMOTION',
    posture_label: 'Consider Promotion',
    primary_metric: 'CONTRIBUTION',
    target_direction: 'INCREASE',
    major_constraints: ['Depot capacity at 80%'],
    decision_recommendation: 'Targeted promotion (15% TPR)',
    incremental_demand_pct: 12.4,
    contribution_impact_gbp: 4500,
    readiness_status: 'READY',
    readiness_summary: 'Depot capacity verified',
    primary_trade_off: 'Incremental volume offset against TPR margin investment',
    evidence_posture: 'Demonstration evidence basis: uncalibrated simulation data',
    technical_provenance: { intent_id: registered.campaign_intent_id },
    intent_snapshot: registered
  });

  assert(
    exp1.experiment_id.startsWith('EXP-'),
    'Requirement 10: Assigned stable sequential experiment ID (e.g. EXP-001)'
  );
  assert(
    validateCampaignDecisionExperiment(exp1).valid,
    'Requirement 10: Preserved experiment conforms to CampaignDecisionExperiment contract'
  );

  // Now execute reset
  clearCampaignIntents(TENANT, SESSION);
  decisionContractStore.clear(TENANT, SESSION);
  const postResetDraft = getOrCreateCampaignIntentDraft(TENANT, SESSION);

  assert(
    postResetDraft.status === 'DRAFT' && postResetDraft.canvas_progress.completed_areas.length === 0,
    'Requirement 8: Reset decision clears active draft and resets completed_areas to 0'
  );

  const preservedExperiments = campaignExperimentStore.listExperiments(TENANT, SESSION);
  assert(
    preservedExperiments.length === 1 && preservedExperiments[0].experiment_id === exp1.experiment_id,
    'Requirement 9: Reset preserves completed historical decision experiments in store'
  );

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 5. Governed Learning Independence ---');

  // Preserving a decision experiment is a review artefact, not evidence. It must not manufacture
  // a LearningCase candidate, which carries its own eligibility and evidence rules.
  const LC_T = 'tenant_learning_boundary';
  const LC_S = 'sess_learning_boundary';
  learningCandidateStore.clear(LC_T, LC_S);
  campaignExperimentStore.clear(LC_T, LC_S);
  campaignExperimentStore.saveExperiment(LC_T, LC_S, {
    campaign_intent_id: 'intent-learning-boundary',
    category: 'Dairy',
    region: 'North West',
    decision_recommendation: 'Targeted promotion',
    incremental_demand_pct: 5,
    contribution_impact_gbp: 900,
    intent_snapshot: completeIntent(LC_T, LC_S)
  });
  assert(
    learningCandidateStore.listForSession(LC_T, LC_S).length === 0,
    'Requirement 11: Preserving a decision experiment does NOT create an unverified LearningCase'
  );
  campaignExperimentStore.clear(LC_T, LC_S);

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 6. Experiment History Filtering & Drawer ---');

  // A second experiment is a second *decision*. Start New Decision releases the identity the
  // previous decision owned; without that boundary the store correctly deepens the same record.
  campaignExperimentStore.closeActiveExperiment(TENANT, SESSION);
  const exp2 = campaignExperimentStore.saveExperiment(TENANT, SESSION, {
    campaign_intent_id: 'intent-exp-2',
    framing_question: 'Should we defend market share on bakery in London?',
    objective_type: 'MARKET_DEFENSE',
    objective_label: 'Market Defense',
    category: 'Bakery',
    sku_scope: ['B001'],
    region: 'London',
    audience_segment: 'City Professionals',
    timing_mode: 'FIND_BEST_WINDOW',
    planned_window: 'Optimal discovery window',
    intervention_posture: 'CONSIDER_DO_NOTHING',
    posture_label: 'Do Nothing',
    primary_metric: 'CONTRIBUTION',
    target_direction: 'MAINTAIN',
    major_constraints: ['No price changes'],
    decision_recommendation: 'Do nothing',
    incremental_demand_pct: 0.0,
    contribution_impact_gbp: 0,
    readiness_status: 'READY',
    readiness_summary: 'No operational risks',
    primary_trade_off: 'No change to demand baseline',
    evidence_posture: 'Demonstration evidence basis: uncalibrated simulation data',
    technical_provenance: { intent_id: 'intent-exp-2' },
    intent_snapshot: completeIntent()
  });

  const dairyFiltered = campaignExperimentStore.listExperiments(TENANT, SESSION, { category: 'Dairy' });
  const londonFiltered = campaignExperimentStore.listExperiments(TENANT, SESSION, { region: 'London' });
  const marketFiltered = campaignExperimentStore.listExperiments(TENANT, SESSION, { objective_type: 'MARKET_DEFENSE' });

  assert(
    dairyFiltered.length === 1 && dairyFiltered[0].category === 'Dairy',
    'Requirement 12: History filters accurately by Category (Dairy)'
  );
  assert(
    londonFiltered.length === 1 && londonFiltered[0].region === 'London',
    'Requirement 12: History filters accurately by Region (London)'
  );
  assert(
    marketFiltered.length === 1 && marketFiltered[0].objective_type === 'MARKET_DEFENSE',
    'Requirement 12: History filters accurately by Objective Type'
  );

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 7. Historical Review Banner & Snapshot Isolation ---');

  assert(
    /Historical Decision Experiment/.test(canvasSource) && /Return to Active Decision/.test(canvasSource),
    'Requirement 13: Historical review banner renders read-only notification and return route'
  );

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 8. Experiment Comparison & What Changed Synthesis ---');

  const comparison = campaignExperimentStore.compareExperiments(TENANT, SESSION, exp1.experiment_id, exp2.experiment_id);
  assert(
    comparison !== null,
    'Requirement 14: Comparison generated successfully between two experiments'
  );
  assert(
    validateExperimentComparison(comparison!).valid,
    'Requirement 14: Comparison conforms to ExperimentComparison contract'
  );
  // Content, not merely presence: the synthesis must name the differences the snapshots show.
  assert(
    comparison!.synthesis.what_changed.includes('North West') &&
      comparison!.synthesis.what_changed.includes('London'),
    'Requirement 14: "What changed?" names the actual region difference between the snapshots',
    comparison!.synthesis.what_changed
  );
  assert(
    comparison!.synthesis.what_changed.includes('Dairy') && comparison!.synthesis.what_changed.includes('Bakery'),
    'Requirement 14: "What changed?" names the actual category difference',
    comparison!.synthesis.what_changed
  );
  assert(
    comparison!.synthesis.what_changed.includes('4,500') ||
      comparison!.synthesis.what_changed.includes('4500'),
    'Requirement 14: "What changed?" quantifies the contribution movement from the snapshots',
    comparison!.synthesis.what_changed
  );
  assert(
    comparison!.synthesis.stronger_experiment_id === exp1.experiment_id,
    'Requirement 14: "Why it matters" names the higher-contribution experiment as stronger',
    `got ${comparison!.synthesis.stronger_experiment_id}`
  );
  assert(
    comparison!.dimensions.filter(d => d.is_focal_difference).length >= 4,
    'Requirement 14: Focal differences are flagged across objective, scope, region and outcome'
  );

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 9. Executive Execution Brief & Boundary Notice ---');

  const brief = campaignExperimentStore.generateExecutionBrief(TENANT, SESSION, exp1.experiment_id);
  assert(
    brief !== null,
    'Requirement 15: Execution Brief generated for experiment'
  );
  assert(
    validateExecutionBrief(brief!).valid,
    'Requirement 15: Execution Brief conforms to ExecutionBrief contract'
  );
  assert(
    brief!.next_step.action === 'Prepare Commitment Handoff',
    'Requirement 15: Next step action is "Prepare Commitment Handoff"'
  );
  assert(
    brief!.next_step.execution_boundary_notice.includes('No external campaign systems have been executed'),
    'Requirement 15: Explicit execution boundary notice without false execution claims'
  );

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 10. Promotion Surface & Discovery Hero Protected ---');

  const plannerSource = readFileSync(
    join(__dirname, '..', '..', 'components', 'PromotionPlanner.tsx'),
    'utf8'
  );
  const heroSource = readFileSync(
    join(__dirname, '..', '..', 'components', 'campaign', 'CampaignDiscoveryHero.tsx'),
    'utf8'
  );

  assert(
    /CAMPAIGN_DEMO_TENANT_ID/.test(plannerSource) && /Live engine evaluation failed/.test(plannerSource),
    'Requirement 16: PromotionPlanner remains unregressed'
  );
  assert(
    /SEEDED DEMO MODEL \(UNCALIBRATED\)/.test(heroSource),
    'Requirement 16: CampaignDiscoveryHero remains unregressed'
  );

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 11. Experiment Identity Lifecycle ---');

  const ID_T = 'tenant_identity_test';
  const ID_S = 'sess_identity_test';
  campaignExperimentStore.clear(ID_T, ID_S);

  const decisionPayload = (over: Partial<CampaignDecisionExperiment> = {}) => ({
    campaign_intent_id: 'cdi_intent_fixed',
    category: 'Fresh Dairy',
    region: 'North West',
    decision_recommendation: 'Targeted promotion',
    incremental_demand_pct: 12,
    contribution_impact_gbp: 2100,
    intent_snapshot: completeIntent(ID_T, ID_S),
    ...over
  });

  assert(
    campaignExperimentStore.getActiveExperimentId(ID_T, ID_S) === null,
    'Identity: a new decision owns no experiment id until one is preserved'
  );

  const first = campaignExperimentStore.saveExperiment(ID_T, ID_S, decisionPayload());
  assert(first.experiment_id === 'EXP-001', 'Identity: first preserved decision is EXP-001');
  assert(
    campaignExperimentStore.getActiveExperimentId(ID_T, ID_S) === 'EXP-001',
    'Identity: the in-progress decision owns EXP-001 after preservation'
  );

  // The canvas preserves after evaluation, opportunity, readiness, frontier and contract
  // registration; a double-click or reload replays those. All belong to ONE decision.
  for (let i = 0; i < 6; i++) {
    campaignExperimentStore.saveExperiment(ID_T, ID_S, decisionPayload({ contribution_impact_gbp: 2100 + i }));
  }
  assert(
    campaignExperimentStore.listExperiments(ID_T, ID_S).length === 1,
    'Duplicate attack: repeated preservation of one decision yields exactly one experiment record',
    `got ${campaignExperimentStore.listExperiments(ID_T, ID_S).length}`
  );
  assert(
    campaignExperimentStore.getActiveExperimentId(ID_T, ID_S) === 'EXP-001',
    'Duplicate attack: the experiment id is immutable across repeated preservation'
  );
  assert(
    campaignExperimentStore.getExperimentById('EXP-001', ID_T, ID_S)!.contribution_impact_gbp === 2105,
    'Duplicate attack: repeated preservation deepens the same record rather than forking it'
  );
  assert(
    campaignExperimentStore.getExperimentById('EXP-001', ID_T, ID_S)!.created_at === first.created_at,
    'Duplicate attack: created_at is stable across updates to one decision'
  );

  // Later stages carry less context than earlier ones in some paths; a merge must not blank
  // a value already established for this decision.
  campaignExperimentStore.saveExperiment(ID_T, ID_S, {
    campaign_intent_id: 'cdi_intent_fixed',
    category: 'Fresh Dairy',
    region: 'North West',
    decision_recommendation: 'Targeted promotion',
    incremental_demand_pct: 12,
    contribution_impact_gbp: 2105
  });
  assert(
    !!campaignExperimentStore.getExperimentById('EXP-001', ID_T, ID_S)!.intent_snapshot,
    'Duplicate attack: a later preservation cannot blank a snapshot the decision already holds'
  );

  // Start New Decision releases the identity; history keeps the closed record.
  campaignExperimentStore.closeActiveExperiment(ID_T, ID_S);
  assert(
    campaignExperimentStore.getActiveExperimentId(ID_T, ID_S) === null,
    'Identity: Start New Decision clears the active experiment identity'
  );
  assert(
    campaignExperimentStore.listExperiments(ID_T, ID_S).length === 1,
    'Identity: Start New Decision preserves the previous experiment in history'
  );
  const second = campaignExperimentStore.saveExperiment(
    ID_T,
    ID_S,
    decisionPayload({ region: 'London', contribution_impact_gbp: 800 })
  );
  assert(second.experiment_id === 'EXP-002', 'Identity: the next preserved decision receives EXP-002');
  assert(
    campaignExperimentStore.getExperimentById('EXP-001', ID_T, ID_S)!.region === 'North West',
    'Identity: creating EXP-002 leaves EXP-001 untouched'
  );

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 12. Tenant / Session Scope Isolation ---');

  const A_T = 'tenant_scope_a';
  const A_S = 'sess_scope_a';
  const B_S = 'sess_scope_b';
  const B_T = 'tenant_scope_b';
  campaignExperimentStore.clear(A_T, A_S);
  campaignExperimentStore.clear(A_T, B_S);
  campaignExperimentStore.clear(B_T, A_S);

  const scopedA = campaignExperimentStore.saveExperiment(A_T, A_S, {
    campaign_intent_id: 'intent-a',
    category: 'Dairy',
    region: 'North West',
    decision_recommendation: 'Targeted promotion',
    incremental_demand_pct: 10,
    contribution_impact_gbp: 5000,
    intent_snapshot: completeIntent(A_T, A_S)
  });
  const scopedB = campaignExperimentStore.saveExperiment(A_T, B_S, {
    campaign_intent_id: 'intent-b',
    category: 'Bakery',
    region: 'London',
    decision_recommendation: 'Do nothing',
    incremental_demand_pct: 0,
    contribution_impact_gbp: 0,
    intent_snapshot: completeIntent(A_T, B_S)
  });
  const scopedC = campaignExperimentStore.saveExperiment(B_T, A_S, {
    campaign_intent_id: 'intent-c',
    category: 'Produce',
    region: 'Scotland',
    decision_recommendation: 'Hold',
    incremental_demand_pct: 1,
    contribution_impact_gbp: 100,
    intent_snapshot: completeIntent(B_T, A_S)
  });

  assert(
    scopedA.experiment_id === 'EXP-001' && scopedB.experiment_id === 'EXP-001' && scopedC.experiment_id === 'EXP-001',
    'Isolation: each scope mints its own EXP-001 without collision'
  );
  assert(
    campaignExperimentStore.getExperimentById('EXP-001', A_T, A_S)!.category === 'Dairy' &&
      campaignExperimentStore.getExperimentById('EXP-001', A_T, B_S)!.category === 'Bakery' &&
      campaignExperimentStore.getExperimentById('EXP-001', B_T, A_S)!.category === 'Produce',
    'Isolation: identical display ids resolve to the correct record inside each scope'
  );
  assert(
    campaignExperimentStore.getExperimentById('EXP-001', A_T, 'sess_does_not_exist') === null,
    'Isolation: an experiment id is not readable from another session'
  );
  assert(
    campaignExperimentStore.getExperimentById('EXP-001', 'tenant_does_not_exist', A_S) === null,
    'Isolation: an experiment id is not readable from another tenant'
  );
  assert(
    (campaignExperimentStore.getExperimentById as any)('EXP-001', A_T, undefined) === null,
    'Isolation: a read without session scope is refused rather than defaulting wide'
  );
  assert(
    campaignExperimentStore.listExperiments(A_T, A_S).length === 1 &&
      campaignExperimentStore.listExperiments(A_T, A_S)[0].category === 'Dairy',
    'Isolation: history lists never leak records from another scope'
  );
  assert(
    campaignExperimentStore.compareExperiments(A_T, A_S, 'EXP-001', 'EXP-002') === null,
    'Isolation: comparison refuses an id that does not exist in the caller scope'
  );

  // Clearing one scope must not reach into another.
  campaignExperimentStore.clear(A_T, B_S);
  assert(
    campaignExperimentStore.listExperiments(A_T, B_S).length === 0 &&
      campaignExperimentStore.listExperiments(A_T, A_S).length === 1 &&
      campaignExperimentStore.listExperiments(B_T, A_S).length === 1,
    'Isolation: reset in one scope cannot delete another scope’s experiments'
  );

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 13. Historical Snapshot Immutability ---');

  const H_T = 'tenant_hist_test';
  const H_S = 'sess_hist_test';
  campaignExperimentStore.clear(H_T, H_S);

  const histA = campaignExperimentStore.saveExperiment(H_T, H_S, {
    campaign_intent_id: 'intent-hist-a',
    objective_type: 'REVENUE_ACCELERATION',
    objective_label: 'Revenue Acceleration',
    category: 'Fresh Dairy',
    sku_scope: ['P004'],
    region: 'National',
    intervention_posture: 'CONSIDER_PROMOTION',
    posture_label: 'Consider Promotion',
    decision_recommendation: 'National blanket promotion',
    incremental_demand_pct: 24.5,
    contribution_impact_gbp: -1200,
    readiness_status: 'CONDITIONAL',
    readiness_summary: 'Supplier headroom breached at national scale',
    primary_trade_off: 'High volume at negative contribution',
    evidence_posture: 'Demonstration evidence basis: uncalibrated simulation data',
    intent_snapshot: completeIntent(H_T, H_S)
  });
  const briefABefore = campaignExperimentStore.generateExecutionBrief(H_T, H_S, histA.experiment_id)!;

  campaignExperimentStore.closeActiveExperiment(H_T, H_S);
  campaignExperimentStore.saveExperiment(H_T, H_S, {
    campaign_intent_id: 'intent-hist-b',
    objective_type: 'MARKET_DEFENSE',
    objective_label: 'Market Defense',
    category: 'Fresh Dairy',
    sku_scope: ['P004'],
    region: 'North West',
    intervention_posture: 'CONSIDER_PROMOTION',
    posture_label: 'Consider Promotion',
    decision_recommendation: 'Targeted micro-market promotion',
    incremental_demand_pct: 17.5,
    contribution_impact_gbp: 2100,
    readiness_status: 'READY',
    readiness_summary: 'All gates passed',
    primary_trade_off: 'Lower volume, positive contribution',
    evidence_posture: 'Demonstration evidence basis: uncalibrated simulation data',
    intent_snapshot: completeIntent(H_T, H_S)
  });

  const histAAfter = campaignExperimentStore.getExperimentById(histA.experiment_id, H_T, H_S)!;
  assert(
    histAAfter.region === 'National' &&
      histAAfter.objective_type === 'REVENUE_ACCELERATION' &&
      histAAfter.incremental_demand_pct === 24.5 &&
      histAAfter.contribution_impact_gbp === -1200 &&
      histAAfter.readiness_status === 'CONDITIONAL' &&
      histAAfter.decision_recommendation === 'National blanket promotion',
    'Snapshot immutability: reviewing EXP-001 after EXP-002 exists returns EXP-001 values only'
  );
  const briefAAfter = campaignExperimentStore.generateExecutionBrief(H_T, H_S, histA.experiment_id)!;
  assert(
    briefAAfter.proposal.title === briefABefore.proposal.title &&
      briefAAfter.expected_impact.contribution_impact === briefABefore.expected_impact.contribution_impact &&
      briefAAfter.expected_impact.incremental_demand === briefABefore.expected_impact.incremental_demand,
    'Snapshot immutability: EXP-001 execution brief is unchanged after EXP-002 is created'
  );
  assert(
    briefAAfter.experiment_id === histA.experiment_id && briefAAfter.brief_id === `BRIEF-${histA.experiment_id}`,
    'Snapshot immutability: a brief is bound to the experiment it was requested for'
  );

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 14. Comparison Honesty: Identical, Self, and Unavailable Evidence ---');

  const identicalComparison = campaignExperimentStore.compareExperiments(
    ID_T,
    ID_S,
    'EXP-001',
    'EXP-001'
  )!;
  assert(
    identicalComparison.synthesis.why_it_matters.includes('No material decision differences detected'),
    'Comparison honesty: an experiment compared with itself reports no material differences',
    identicalComparison.synthesis.why_it_matters
  );
  assert(
    !identicalComparison.synthesis.stronger_experiment_id,
    'Comparison honesty: no winner is manufactured when comparing an experiment with itself'
  );

  // Two genuinely equivalent preserved decisions.
  const EQ_T = 'tenant_equal_test';
  const EQ_S = 'sess_equal_test';
  campaignExperimentStore.clear(EQ_T, EQ_S);
  const equalPayload = {
    campaign_intent_id: 'intent-equal',
    objective_type: 'REVENUE_ACCELERATION' as const,
    objective_label: 'Revenue Acceleration',
    category: 'Fresh Dairy',
    sku_scope: ['P004'],
    region: 'North West',
    intervention_posture: 'CONSIDER_DO_NOTHING' as const,
    posture_label: 'Do Nothing',
    decision_recommendation: 'Do nothing',
    incremental_demand_pct: 0,
    contribution_impact_gbp: 0,
    readiness_status: 'READY' as const,
    primary_trade_off: 'Balanced demand uplift with margin protection',
    intent_snapshot: completeIntent(EQ_T, EQ_S)
  };
  campaignExperimentStore.saveExperiment(EQ_T, EQ_S, equalPayload);
  campaignExperimentStore.closeActiveExperiment(EQ_T, EQ_S);
  campaignExperimentStore.saveExperiment(EQ_T, EQ_S, equalPayload);
  const equalComparison = campaignExperimentStore.compareExperiments(EQ_T, EQ_S, 'EXP-001', 'EXP-002')!;

  assert(
    equalComparison.dimensions.every(d => !d.is_focal_difference),
    'Comparison honesty: equivalent experiments flag no focal differences'
  );
  assert(
    equalComparison.synthesis.what_changed.includes('No material decision differences detected'),
    'Comparison honesty: equivalent experiments state that no material differences exist',
    equalComparison.synthesis.what_changed
  );
  assert(
    !/distinct trade-off|distinct operational posture/i.test(
      `${equalComparison.synthesis.what_changed} ${equalComparison.synthesis.why_it_matters}`
    ),
    'Comparison honesty: equivalent experiments are never given a fabricated distinct-trade-off narrative',
    equalComparison.synthesis.why_it_matters
  );
  assert(
    !equalComparison.synthesis.stronger_experiment_id,
    'Comparison honesty: no stronger experiment is named when nothing material differs'
  );

  // Configuration differs but no economics are modelled: state that, do not rank.
  const NE_T = 'tenant_noecon_test';
  const NE_S = 'sess_noecon_test';
  campaignExperimentStore.clear(NE_T, NE_S);
  campaignExperimentStore.saveExperiment(NE_T, NE_S, {
    campaign_intent_id: 'intent-ne-a',
    category: 'Fresh Dairy',
    region: 'North West',
    decision_recommendation: 'Do nothing',
    incremental_demand_pct: 0,
    contribution_impact_gbp: 0,
    intent_snapshot: completeIntent(NE_T, NE_S)
  });
  campaignExperimentStore.closeActiveExperiment(NE_T, NE_S);
  campaignExperimentStore.saveExperiment(NE_T, NE_S, {
    campaign_intent_id: 'intent-ne-b',
    category: 'Bakery',
    region: 'London',
    decision_recommendation: 'Do nothing',
    incremental_demand_pct: 0,
    contribution_impact_gbp: 0,
    intent_snapshot: completeIntent(NE_T, NE_S)
  });
  const noEconComparison = campaignExperimentStore.compareExperiments(NE_T, NE_S, 'EXP-001', 'EXP-002')!;
  assert(
    noEconComparison.synthesis.why_it_matters.includes('Commercial separation is unavailable'),
    'Comparison honesty: unavailable economics are reported as unavailable, not ranked',
    noEconComparison.synthesis.why_it_matters
  );
  assert(
    !noEconComparison.synthesis.stronger_experiment_id,
    'Comparison honesty: no winner is manufactured when economics are unavailable'
  );

  // A higher-contribution configuration that cannot proceed must not be recommended.
  const GATED_T = 'tenant_gated_test';
  const GATED_S = 'sess_gated_test';
  campaignExperimentStore.clear(GATED_T, GATED_S);
  campaignExperimentStore.saveExperiment(GATED_T, GATED_S, {
    campaign_intent_id: 'intent-gated-a',
    category: 'Fresh Dairy',
    region: 'North West',
    decision_recommendation: 'Targeted promotion',
    incremental_demand_pct: 5,
    contribution_impact_gbp: 500,
    readiness_status: 'READY',
    intent_snapshot: completeIntent(GATED_T, GATED_S)
  });
  campaignExperimentStore.closeActiveExperiment(GATED_T, GATED_S);
  campaignExperimentStore.saveExperiment(GATED_T, GATED_S, {
    campaign_intent_id: 'intent-gated-b',
    category: 'Fresh Dairy',
    region: 'National',
    decision_recommendation: 'National promotion',
    incremental_demand_pct: 20,
    contribution_impact_gbp: 9000,
    readiness_status: 'DO_NOT_PROCEED',
    intent_snapshot: completeIntent(GATED_T, GATED_S)
  });
  const gatedComparison = campaignExperimentStore.compareExperiments(GATED_T, GATED_S, 'EXP-001', 'EXP-002')!;
  assert(
    !gatedComparison.synthesis.stronger_experiment_id,
    'Comparison honesty: a Do Not Proceed configuration is not recommended despite higher contribution'
  );
  assert(
    gatedComparison.synthesis.why_it_matters.includes('not currently actionable'),
    'Comparison honesty: the readiness gate on the higher-contribution option is stated explicitly',
    gatedComparison.synthesis.why_it_matters
  );

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 15. API Route Contracts & Cross-Scope Refusal ---');

  const API_T = 'tenant_api_test';
  const API_S = 'sess_api_test';
  const OTHER_S = 'sess_api_other';
  campaignExperimentStore.clear(API_T, API_S);
  campaignExperimentStore.clear(API_T, OTHER_S);

  const postExperiment = async (body: Record<string, unknown>) => {
    const res = await experimentsPOST(
      new Request('http://localhost/api/v1/campaigns/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }) as any
    );
    return { status: res.status, json: await res.json() };
  };

  const apiBody = {
    tenant_id: API_T,
    session_id: API_S,
    campaign_intent_id: 'intent-api',
    category: 'Fresh Dairy',
    region: 'North West',
    decision_recommendation: 'Targeted promotion',
    incremental_demand_pct: 8,
    contribution_impact_gbp: 1500
  };

  const created = await postExperiment(apiBody);
  assert(
    created.status === 200 && created.json.data.experiment_id === 'EXP-001',
    'API: POST /experiments preserves a decision as EXP-001'
  );

  // Duplicate POST storm — a double-click, a retry, a replayed stage.
  await postExperiment(apiBody);
  await postExperiment(apiBody);
  const listed = await experimentsGET(
    new Request(`http://localhost/api/v1/campaigns/experiments?tenant_id=${API_T}&session_id=${API_S}`) as any
  );
  const listedJson = await listed.json();
  assert(
    listedJson.data.count === 1 && listedJson.data.active_experiment_id === 'EXP-001',
    'API: repeated POSTs for one decision do not create additional experiments',
    `count=${listedJson.data.count}`
  );

  const otherScope = await postExperiment({ ...apiBody, session_id: OTHER_S, campaign_intent_id: 'intent-api-other' });
  assert(
    otherScope.status === 200 && otherScope.json.data.experiment_id === 'EXP-001',
    'API: a second session mints its own EXP-001 instead of failing on a collision'
  );

  const crossRead = await experimentByIdGET(
    new Request(`http://localhost/api/v1/campaigns/experiments/EXP-001?tenant_id=${API_T}&session_id=sess_absent`) as any,
    { params: Promise.resolve({ id: 'EXP-001' }) }
  );
  assert(crossRead.status === 404, 'API: GET /experiments/[id] refuses an id outside the caller scope');

  const crossBrief = await experimentBriefGET(
    new Request(`http://localhost/api/v1/campaigns/experiments/EXP-001/brief?tenant_id=${API_T}&session_id=sess_absent`) as any,
    { params: Promise.resolve({ id: 'EXP-001' }) }
  );
  assert(crossBrief.status === 404, 'API: execution brief cannot be fetched across scopes');

  const briefInScope = await experimentBriefGET(
    new Request(`http://localhost/api/v1/campaigns/experiments/EXP-001/brief?tenant_id=${API_T}&session_id=${API_S}`) as any,
    { params: Promise.resolve({ id: 'EXP-001' }) }
  );
  const briefInScopeJson = await briefInScope.json();
  assert(
    briefInScope.status === 200 && briefInScopeJson.data.experiment_id === 'EXP-001',
    'API: execution brief resolves the requested experiment inside the caller scope'
  );

  const crossCompare = await experimentComparePOST(
    new Request('http://localhost/api/v1/campaigns/experiments/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: API_T,
        session_id: API_S,
        experiment_a_id: 'EXP-001',
        experiment_b_id: 'EXP-999'
      })
    }) as any
  );
  assert(crossCompare.status === 404, 'API: comparison refuses an experiment absent from the caller scope');

  campaignExperimentStore.clear(API_T, API_S);
  campaignExperimentStore.clear(API_T, OTHER_S);

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 16. Engine Result Fidelity ---');

  // CDI-02 publishes the campaign delta on the counterfactual, CDI-04 a readiness state, and
  // CDI-06 a selection. Preserving from invented field names silently recorded every decision
  // as +0.0%, +£0 and "Ready"; these guard the real paths.
  assert(
    mapReadinessStateToVerdict('GO') === 'READY' &&
      mapReadinessStateToVerdict('CONDITIONAL_GO') === 'CONDITIONAL' &&
      mapReadinessStateToVerdict('REVIEW') === 'REVIEW' &&
      mapReadinessStateToVerdict('DO_NOT_PROCEED') === 'DO_NOT_PROCEED',
    'Engine fidelity: every CDI-04 readiness state maps to its own verdict'
  );
  assert(
    mapReadinessStateToVerdict(undefined) === 'NOT_ASSESSED' &&
      mapReadinessStateToVerdict('SOMETHING_ELSE') === 'NOT_ASSESSED',
    'Engine fidelity: an unassessed or unrecognised readiness state is never reported as Ready'
  );
  assert(
    /counterfactual\?\.campaign_delta/.test(canvasSource) &&
      /attributable_uplift_pp/.test(canvasSource) &&
      /contribution_delta_gbp/.test(canvasSource),
    'Engine fidelity: preservation reads the CDI-02 campaign delta rather than absent top-level fields'
  );
  assert(
    !/evalData\?\.attributable_volume_uplift_pp|frontData\?\.recommended_play_name|frontData\?\.trade_off_summary/.test(
      canvasSource
    ),
    'Engine fidelity: no preservation field reads an engine property that does not exist'
  );
  assert(
    /readData\?\.readiness\?\.state/.test(canvasSource) && /mapReadinessStateToVerdict/.test(canvasSource),
    'Engine fidelity: readiness is preserved from the CDI-04 state, not defaulted to Ready'
  );
  assert(
    /selection\?\.open_trade_off/.test(canvasSource) && /CHOICE_REQUIRED/.test(canvasSource),
    'Engine fidelity: an unresolved frontier is preserved as a choice required, not as a recommendation'
  );

  // label() is (domain, value). Calling it with one argument silently yields the em-dash
  // placeholder, which is how preserved history came to show "— · Fresh Dairy".
  assert(
    executiveLabel('campaign_objective', 'REVENUE_ACCELERATION') === 'Revenue acceleration' &&
      executiveLabel('intervention_posture', 'CONSIDER_PROMOTION') === 'Consider promotion',
    'Engine fidelity: executive labels resolve for objective and posture rather than degrading to a dash'
  );
  assert(
    !/executiveLabel\([^'")]*\.(objective_type|intervention_posture)\)/.test(canvasSource),
    'Engine fidelity: no executive label is resolved without its vocabulary domain'
  );

  // A preserved experiment must never present an unassessed decision as operationally cleared.
  const FID_T = 'tenant_fidelity_test';
  const FID_S = 'sess_fidelity_test';
  campaignExperimentStore.clear(FID_T, FID_S);
  const unassessed = campaignExperimentStore.saveExperiment(FID_T, FID_S, {
    campaign_intent_id: 'intent-fidelity',
    category: 'Fresh Dairy',
    region: 'North West',
    decision_recommendation: 'Outcome frontier not yet evaluated',
    incremental_demand_pct: 14.6,
    contribution_impact_gbp: -316,
    intent_snapshot: completeIntent(FID_T, FID_S)
  });
  assert(
    unassessed.readiness_status === 'NOT_ASSESSED',
    'Engine fidelity: a decision preserved without a readiness assessment is recorded as not assessed'
  );
  const unassessedBrief = campaignExperimentStore.generateExecutionBrief(FID_T, FID_S, unassessed.experiment_id)!;
  assert(
    unassessedBrief.expected_impact.readiness_verdict.startsWith('Not assessed'),
    'Engine fidelity: the execution brief states an unassessed readiness rather than implying clearance',
    unassessedBrief.expected_impact.readiness_verdict
  );
  assert(
    unassessedBrief.expected_impact.contribution_impact === '-£316',
    'Engine fidelity: a negative contribution survives preservation into the brief',
    unassessedBrief.expected_impact.contribution_impact
  );
  const briefSource = readFileSync(
    join(__dirname, '..', '..', 'components', 'campaign', 'ExecutionBriefModal.tsx'),
    'utf8'
  );
  assert(
    /contributionIsNegative/.test(briefSource) && !/>Net profit recovery</.test(briefSource),
    'Engine fidelity: a contribution loss is not captioned or coloured as a gain in the brief'
  );

  campaignExperimentStore.clear(FID_T, FID_S);

  // ────────────────────────────────────────────────────────────
  console.log('\n--- 17. Canvas Identity Semantics ---');

  assert(
    !/EXP-CDI-01 · Campaign Decision Intelligence/.test(canvasSource),
    'Identity UX: the capability identifier no longer masquerades as the current experiment number'
  );
  assert(
    /decisionIdentityLabel/.test(canvasSource) && /'New Decision'/.test(canvasSource),
    'Identity UX: an unpreserved decision is labelled New Decision'
  );
  assert(
    /Reviewing \$\{reviewedExperiment\.experiment_id\}/.test(canvasSource),
    'Identity UX: a historical experiment is labelled Reviewing EXP-xxx'
  );
  assert(
    /Capability reference CDI-01/.test(canvasSource),
    'Identity UX: CDI-01 is retained as an explicitly labelled capability reference'
  );
  assert(
    /if \(currentIntent\.status !== 'REGISTERED'\) return;/.test(canvasSource) &&
      /if \(!evalData\) return;/.test(canvasSource),
    'Preservation gate: an unregistered or unevaluated decision is not preserved as an experiment'
  );
  assert(
    /preservingRef\.current/.test(canvasSource),
    'Duplicate attack: concurrent preservation calls are guarded in the canvas'
  );

  // Cleanup test state
  clearCampaignIntents(TENANT, SESSION);
  campaignExperimentStore.clear(TENANT, SESSION);
  for (const [t, s] of [
    [ID_T, ID_S],
    [A_T, A_S],
    [B_T, A_S],
    [H_T, H_S],
    [EQ_T, EQ_S],
    [NE_T, NE_S],
    [GATED_T, GATED_S]
  ]) {
    campaignExperimentStore.clear(t, s);
  }

  console.log('\n======================================================');
  console.log(` TEST SUMMARY: ${passed} passed, ${failed} failed, ${total} total`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
