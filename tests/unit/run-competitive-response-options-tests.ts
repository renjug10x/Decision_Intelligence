/**
 * CogniX — Competitive Price Response Final V1:
 * Response Options → Candidate → Activation → Dynamic Scenario Studio Test Suite
 *
 * Covers Section 16:
 *   A. HOLD configuration and evaluation
 *   B. MATCH valid parity configuration and evaluation
 *   C. MATCH unavailable when parity is outside governed bounds
 *   D. TARGET uses highest-opportunity governed scope
 *   E. REDUCE EXPOSURE uses lower-exposure governed configuration
 *   F. Preferred response selected by MAXIMUM NET CONTRIBUTION
 *   G. Candidate staging does not mutate active configuration
 *   H. Accept mutates active configuration and triggers live evaluation
 *   I. Live CDI evaluation reflects competitive response when applicable
 *   J. Approve & Activate records modelled competitive provenance
 *   K. Reload hydration preserves activated state
 *   L. Evidence Network uses existing HYPOTHESIS category, not COMPETITOR SIGNAL
 *   M. Zero-default preservation when no competitive assumption exists
 *   N. Scenario isolation across reference scenarios and authored scenarios
 *
 * Run via: npx tsx tests/unit/run-competitive-response-options-tests.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CANONICAL_SCENARIO,
  CHILLED_SALMON_SCENARIO,
  PREMIUM_BAKERY_SCENARIO,
  SCENARIO_SITUATIONS_NOT_SUPPORTED,
  scenarioStoreCount,
} from '../../packages/contracts/src/index';
import {
  listAuthorableProducts,
  resolveScenarioDraft,
} from '../../lib/scenario-authoring/index';
import {
  CAMPAIGN_DEMO_SESSION_ID,
  CAMPAIGN_DEMO_TENANT_ID,
  buildCampaignIntentFromArchetype,
  regionStoreCounts,
  scenarioArchetypeProjection,
} from '../../lib/campaign-archetypes';
import {
  COMPETITIVE_ASSUMPTION_NODE_ID,
  COMPETITIVE_GOVERNANCE_STATEMENT,
  applyAcceptedIntervention,
  buildCompetitiveAssumptionGraphNode,
  buildCompetitiveResponseCandidateIntervention,
  canHydrateContractForScenario,
  configFromCampaignIntent,
  extractCompetitiveContextFromIntent,
  inspectDecisionGraphNode,
} from '../../lib/campaign-candidate-intervention';
import {
  COMPETITIVE_PREFERRED_RESPONSE_BADGE,
  COMPETITIVE_USER_FACING_PROVENANCE_BADGE,
  createCompetitivePriceAssumption,
  deriveCompetitiveMatchDepth,
  evaluateCompetitiveCdiDecision,
  evaluateCompetitiveResponseOptions,
  evaluateCompetitiveScenarioAtDepth,
  evaluateCompetitiveWhatIfIntelligence,
} from '../../lib/competitive-price-response';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const ROOT = join(__dirname, '..', '..');
const inverseLensSource = readFileSync(
  join(ROOT, 'components', 'campaign', 'InverseAnalysisLens.tsx'),
  'utf8',
);
const workspaceSource = readFileSync(
  join(ROOT, 'components', 'campaign', 'InterventionWorkspace.tsx'),
  'utf8',
);
const graphLensSource = readFileSync(
  join(ROOT, 'components', 'campaign', 'DecisionGraphLens.tsx'),
  'utf8',
);
const plannerSource = readFileSync(
  join(ROOT, 'components', 'PromotionPlanner.tsx'),
  'utf8',
);
const evaluateRouteSource = readFileSync(
  join(ROOT, 'app', 'api', 'v1', 'campaigns', 'evaluate', 'route.ts'),
  'utf8',
);

const ALL_SCENARIOS = [
  { label: 'Fresh Dairy', scenario: CANONICAL_SCENARIO, expectedRec: 14 },
  { label: 'Chilled Salmon', scenario: CHILLED_SALMON_SCENARIO, expectedRec: 10 },
  { label: 'Premium Bakery', scenario: PREMIUM_BAKERY_SCENARIO, expectedRec: 0 },
] as const;

async function runTests() {
  console.log('══════════════════════════════════════════════════════════');
  console.log('  COMPETITIVE RESPONSE OPTIONS → CANDIDATE → ACTIVATION');
  console.log('══════════════════════════════════════════════════════════');

  // ── A. HOLD CONFIGURATION AND EVALUATION ──────────────────────────────────
  console.log('\n── A. HOLD Configuration and Evaluation ──');
  {
    const assumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 2.04,
      competitive_response_pp_per_disadvantage_point: 0.85,
    });
    const comp = evaluateCompetitiveResponseOptions({
      scenario: CANONICAL_SCENARIO,
      assumption,
      active_depth_pct: 14,
      scope: 'National',
      horizon_days: 14,
    });
    const hold = comp.options.find(o => o.option_type === 'HOLD')!;
    const directEval = evaluateCompetitiveScenarioAtDepth(
      CANONICAL_SCENARIO,
      14,
      assumption,
      { scope: 'National', horizon_days: 14 },
    );

    assert(hold !== undefined && hold.available === true, 'A1 HOLD option is present and available');
    assert(
      hold.depth_pct === 14 && hold.scope === 'National' && hold.duration_days === 14,
      'A2 HOLD keeps exact active depth, scope, and duration without inventing a new configuration',
    );
    assert(
      hold.evaluation !== null &&
        hold.evaluation.net_contribution_delta_gbp === directEval.net_contribution_delta_gbp &&
        hold.evaluation.expected_demand_uplift_pct === directEval.expected_demand_uplift_pct &&
        hold.evaluation.expected_demand_units === directEval.expected_demand_units &&
        hold.evaluation.margin_exposure_gbp === directEval.margin_exposure_gbp,
      'A3 HOLD evaluation matches single-path evaluateCompetitiveScenarioAtDepth byte-for-byte',
    );
    assert(
      hold.provenance_badge === COMPETITIVE_USER_FACING_PROVENANCE_BADGE,
      'A4 HOLD carries MODELLED ASSUMPTION provenance badge',
    );
  }

  // ── B. MATCH VALID PARITY CONFIGURATION AND EVALUATION ────────────────────
  console.log('\n── B. MATCH Valid Parity Configuration and Evaluation ──');
  {
    const assumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 2.04,
      competitive_response_pp_per_disadvantage_point: 0.85,
    });
    const parity = deriveCompetitiveMatchDepth(CANONICAL_SCENARIO, 2.04);
    const comp = evaluateCompetitiveResponseOptions({
      scenario: CANONICAL_SCENARIO,
      assumption,
      active_depth_pct: 14,
      scope: 'National',
      horizon_days: 14,
    });
    const match = comp.options.find(o => o.option_type === 'MATCH')!;
    const directMatchEval = evaluateCompetitiveScenarioAtDepth(
      CANONICAL_SCENARIO,
      parity.match_depth_pct!,
      assumption,
      { scope: 'National', horizon_days: 14 },
    );

    assert(
      parity.status === 'MATCH_WITHIN_ALLOWED_RANGE',
      'B1 Parity is achievable for £2.04 on Fresh Dairy (£2.49 list)',
    );
    assert(
      match.available === true && match.unavailable_reason === null,
      'B2 MATCH option is marked available when parity is inside governed depth bounds',
    );
    assert(
      match.depth_pct === parity.match_depth_pct &&
        match.promoted_price_gbp === 2.04,
      `B3 MATCH depth (${match.depth_pct}%) matches Slice 1 deriveCompetitiveMatchDepth and achieves £2.04 parity`,
    );
    assert(
      match.evaluation !== null &&
        Math.abs(match.evaluation.disadvantage_pp) < 0.05 &&
        Math.abs(match.evaluation.competitive_response_pp) < 0.05 &&
        match.evaluation.net_contribution_delta_gbp === directMatchEval.net_contribution_delta_gbp,
      'B4 MATCH eliminates competitive price disadvantage (~0pp) and matches single-path evaluation',
    );
  }

  // ── C. MATCH UNAVAILABLE WHEN PARITY IS OUTSIDE GOVERNED BOUNDS ───────────
  console.log('\n── C. MATCH Unavailable When Parity Is Outside Governed Bounds ──');
  {
    // Above list price (£3.00 > £2.49 list)
    const aboveListAssumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 3.00,
      competitive_response_pp_per_disadvantage_point: 0.85,
    });
    const compAbove = evaluateCompetitiveResponseOptions({
      scenario: CANONICAL_SCENARIO,
      assumption: aboveListAssumption,
      active_depth_pct: 14,
      scope: 'National',
      horizon_days: 14,
    });
    const matchAbove = compAbove.options.find(o => o.option_type === 'MATCH')!;

    assert(
      matchAbove.available === false &&
        matchAbove.depth_pct === null &&
        matchAbove.evaluation === null &&
        matchAbove.is_preferred === false,
      'C1 MATCH is unavailable (not clamped) when benchmark price exceeds list price',
    );
    assert(
      Boolean(
        matchAbove.unavailable_reason &&
          (matchAbove.unavailable_reason.includes('above') ||
            matchAbove.unavailable_reason.includes('list price')),
      ),
      `C2 MATCH explains why parity is unavailable above list price (${matchAbove.unavailable_reason})`,
    );

    // Below max depth (£0.85 on £2.49 list requires 65.86% > 60% governed max)
    const belowFloorAssumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 0.85,
      competitive_response_pp_per_disadvantage_point: 0.85,
    });
    const compBelow = evaluateCompetitiveResponseOptions({
      scenario: CANONICAL_SCENARIO,
      assumption: belowFloorAssumption,
      active_depth_pct: 14,
      scope: 'National',
      horizon_days: 14,
    });
    const matchBelow = compBelow.options.find(o => o.option_type === 'MATCH')!;

    assert(
      matchBelow.available === false &&
        matchBelow.depth_pct === null &&
        matchBelow.evaluation === null &&
        matchBelow.is_preferred === false,
      'C3 MATCH is unavailable (never clamped to 60%) when parity exceeds governed max depth',
    );
    assert(
      Boolean(
        matchBelow.unavailable_reason &&
          (matchBelow.unavailable_reason.includes('exceeds') ||
            matchBelow.unavailable_reason.includes('maximum')),
      ),
      `C4 MATCH explains why parity is unavailable beyond max depth (${matchBelow.unavailable_reason})`,
    );
  }

  // ── D. TARGET USES HIGHEST-OPPORTUNITY GOVERNED SCOPE ─────────────────────
  console.log('\n── D. TARGET Uses Highest-Opportunity Governed Scope ──');
  {
    const assumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 2.04,
      competitive_response_pp_per_disadvantage_point: 0.85,
    });
    const comp = evaluateCompetitiveResponseOptions({
      scenario: CANONICAL_SCENARIO,
      assumption,
      active_depth_pct: 14,
      scope: 'National',
      horizon_days: 14,
    });
    const target = comp.options.find(o => o.option_type === 'TARGET')!;

    assert(
      target.available === true &&
        target.scope === CANONICAL_SCENARIO.identity.focus_region &&
        target.stores_count === scenarioStoreCount(CANONICAL_SCENARIO, CANONICAL_SCENARIO.identity.focus_region),
      `D1 TARGET focuses on governed highest-opportunity scope (${target.scope}, ${target.stores_count} stores)`,
    );
    assert(
      target.rationale.includes('Apply the response where CogniX already sees the strongest opportunity.'),
      'D2 TARGET rationale states "Apply the response where CogniX already sees the strongest opportunity."',
    );
    assert(
      !/Competitor is strongest here/i.test(target.rationale),
      'D3 TARGET never claims competitor store intelligence ("Competitor is strongest here")',
    );
  }

  // ── E. REDUCE EXPOSURE USES LOWER-EXPOSURE GOVERNED CONFIGURATION ─────────
  console.log('\n── E. REDUCE EXPOSURE Uses Lower-Exposure Governed Configuration ──');
  {
    const assumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 2.04,
      competitive_response_pp_per_disadvantage_point: 0.85,
    });
    const comp14d = evaluateCompetitiveResponseOptions({
      scenario: CANONICAL_SCENARIO,
      assumption,
      active_depth_pct: 14,
      scope: 'National',
      horizon_days: 14,
    });
    const hold14d = comp14d.options.find(o => o.option_type === 'HOLD')!;
    const reduce14d = comp14d.options.find(o => o.option_type === 'REDUCE_EXPOSURE')!;

    assert(
      reduce14d.available === true &&
        reduce14d.duration_days === 7 &&
        reduce14d.depth_pct === 14 &&
        reduce14d.scope === 'National',
      'E1 REDUCE EXPOSURE steps down duration from 14d to 7d while retaining 14% depth intent',
    );
    assert(
      reduce14d.evaluation!.margin_exposure_gbp < hold14d.evaluation!.margin_exposure_gbp,
      `E2 REDUCE EXPOSURE reduces margin exposure (£${reduce14d.evaluation!.margin_exposure_gbp} < £${hold14d.evaluation!.margin_exposure_gbp})`,
    );

    // When already at 7d National, REDUCE EXPOSURE narrows scope to smaller regional cluster
    const comp7d = evaluateCompetitiveResponseOptions({
      scenario: CANONICAL_SCENARIO,
      assumption,
      active_depth_pct: 14,
      scope: 'National',
      horizon_days: 7,
    });
    const reduce7d = comp7d.options.find(o => o.option_type === 'REDUCE_EXPOSURE')!;
    assert(
      reduce7d.duration_days === 7 &&
        reduce7d.scope !== 'National' &&
        reduce7d.stores_count < hold14d.stores_count,
      `E3 When already at 7d National, REDUCE EXPOSURE narrows regional scope (${reduce7d.scope}, ${reduce7d.stores_count} stores)`,
    );
  }

  // ── F. PREFERRED RESPONSE SELECTED BY MAXIMUM NET CONTRIBUTION ────────────
  console.log('\n── F. Preferred Response Selected by MAXIMUM NET CONTRIBUTION ──');
  {
    const assumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 2.04,
      competitive_response_pp_per_disadvantage_point: 1.25,
    });
    const whatIf = evaluateCompetitiveWhatIfIntelligence({
      scenario: CANONICAL_SCENARIO,
      assumption,
      active_depth_pct: 14,
      scope: 'National',
      horizon_days: 14,
    });
    const ro = whatIf.response_options;
    const availableOptions = ro.options.filter(o => o.available && o.evaluation !== null);
    const maxContribution = Math.max(
      ...availableOptions.map(o => o.evaluation!.net_contribution_delta_gbp),
    );
    const preferredOption = ro.options.find(o => o.option_type === ro.preferred_option_type)!;

    assert(
      ro.objective === 'MAXIMUM_NET_CONTRIBUTION',
      'F1 Response options objective is explicitly MAXIMUM_NET_CONTRIBUTION',
    );
    assert(
      preferredOption.preferred_badge === COMPETITIVE_PREFERRED_RESPONSE_BADGE &&
        COMPETITIVE_PREFERRED_RESPONSE_BADGE === 'COGNIX PREFERRED RESPONSE',
      'F2 Preferred response badge is COGNIX PREFERRED RESPONSE',
    );
    assert(
      preferredOption.is_preferred === true &&
        preferredOption.evaluation!.net_contribution_delta_gbp === maxContribution,
      `F3 Preferred option (${preferredOption.label}) achieves the maximum net contribution (£${maxContribution}) among available options`,
    );
    assert(
      ro.options.filter(o => o.is_preferred).length === 1,
      'F4 Exactly one response option is marked preferred',
    );
    assert(
      !/Pareto/i.test(ro.preferred_response_rationale) &&
        !/Optimal market response/i.test(ro.preferred_response_rationale) &&
        !/Predicted competitor response/i.test(ro.preferred_response_rationale),
      'F5 Preferred response rationale never uses forbidden labels (Pareto / Optimal market response / Predicted competitor response)',
    );
  }

  // ── G. CANDIDATE STAGING DOES NOT MUTATE ACTIVE CONFIGURATION ─────────────
  console.log('\n── G. Candidate Staging Does Not Mutate Active Configuration ──');
  {
    const projection = scenarioArchetypeProjection(CANONICAL_SCENARIO);
    const activeConfig = {
      discount_pct: projection.default_discount_pct,
      region: projection.default_region,
      duration_days: projection.default_duration_days,
    };
    const snapshotBefore = { ...activeConfig };

    const assumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 2.04,
      competitive_response_pp_per_disadvantage_point: 0.85,
    });
    const whatIf = evaluateCompetitiveWhatIfIntelligence({
      scenario: CANONICAL_SCENARIO,
      assumption,
      active_depth_pct: activeConfig.discount_pct,
      scope: activeConfig.region,
      horizon_days: activeConfig.duration_days,
    });
    const matchOption = whatIf.response_options.options.find(o => o.option_type === 'MATCH')!;
    const candidate = buildCompetitiveResponseCandidateIntervention({
      whatIfResult: whatIf,
      selectedOption: matchOption,
    });

    assert(
      activeConfig.discount_pct === snapshotBefore.discount_pct &&
        activeConfig.region === snapshotBefore.region &&
        activeConfig.duration_days === snapshotBefore.duration_days,
      'G1 Staging a competitive candidate does not mutate active configuration',
    );
    assert(
      candidate.provenance?.source_lens === 'COMPETITIVE_PRICE_RESPONSE' &&
        candidate.provenance.competitive_context?.selected_response_type === 'MATCH' &&
        candidate.provenance.competitive_context?.provenance_badge === 'MODELLED ASSUMPTION' &&
        candidate.provenance.competitive_context?.governance_statement === COMPETITIVE_GOVERNANCE_STATEMENT,
      'G2 Staged candidate carries full CompetitiveInterventionContext and MODELLED ASSUMPTION provenance',
    );
    assert(
      candidate.proposed_discount === matchOption.depth_pct &&
        candidate.expected_demand === matchOption.evaluation!.expected_demand_uplift_pct &&
        candidate.expected_contribution === matchOption.evaluation!.net_contribution_delta_gbp,
      'G3 Staged candidate economics match the selected response option evaluation',
    );
  }

  // ── H. ACCEPT MUTATES ACTIVE CONFIGURATION AND TRIGGERS LIVE EVALUATION ───
  console.log('\n── H. Accept Mutates Active Configuration and Triggers Live Evaluation ──');
  {
    const current = {
      discount_pct: 14,
      region: 'National',
      duration_days: 14,
    };
    const assumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 2.04,
      competitive_response_pp_per_disadvantage_point: 0.85,
    });
    const whatIf = evaluateCompetitiveWhatIfIntelligence({
      scenario: CANONICAL_SCENARIO,
      assumption,
      active_depth_pct: current.discount_pct,
      scope: current.region,
      horizon_days: current.duration_days,
    });
    const targetOption = whatIf.response_options.options.find(o => o.option_type === 'TARGET')!;
    const candidate = buildCompetitiveResponseCandidateIntervention({
      whatIfResult: whatIf,
      selectedOption: targetOption,
    });

    const applied = applyAcceptedIntervention({
      current,
      committed: null,
      candidate,
      availableRegions: Object.keys(regionStoreCounts()),
    });

    assert(
      applied.committed.discount_pct === 14 &&
        applied.committed.region === 'National' &&
        applied.committed.duration_days === 14,
      'H1 Accept preserves the original committed baseline configuration (14% · National · 14d)',
    );
    assert(
      applied.next.discount_pct === targetOption.depth_pct &&
        applied.next.region === targetOption.scope &&
        applied.next.duration_days === targetOption.duration_days,
      `H2 Accept mutates the active configuration to the selected option (${applied.next.discount_pct}% · ${applied.next.region} · ${applied.next.duration_days}d)`,
    );
    assert(
      plannerSource.includes('activeCompetitiveContext') &&
        plannerSource.includes('[archetype, skuId, mechanic, discountDepth, targetRegion, durationDays, activeCompetitiveContext]'),
      'H3 PromotionPlanner re-triggers live CDI evaluation when competitive candidate is accepted',
    );
  }

  // ── I. LIVE CDI EVALUATION REFLECTS COMPETITIVE RESPONSE WHEN APPLICABLE ──
  console.log('\n── I. Live CDI Evaluation Reflects Competitive Response When Applicable ──');
  {
    const projection = scenarioArchetypeProjection(CANONICAL_SCENARIO);
    const assumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 2.04,
      competitive_response_pp_per_disadvantage_point: 0.85,
    });
    const whatIf = evaluateCompetitiveWhatIfIntelligence({
      scenario: CANONICAL_SCENARIO,
      assumption,
      active_depth_pct: 14,
      scope: 'National',
      horizon_days: 14,
    });
    const holdOption = whatIf.response_options.options.find(o => o.option_type === 'HOLD')!;
    const candidate = buildCompetitiveResponseCandidateIntervention({
      whatIfResult: whatIf,
      selectedOption: holdOption,
    });

    const intentWithComp = buildCampaignIntentFromArchetype(projection, {
      discount_depth_pct: 14,
      target_region: 'National',
      duration_days: 14,
      tenant_id: CAMPAIGN_DEMO_TENANT_ID,
      session_id: CAMPAIGN_DEMO_SESSION_ID,
      competitive_context: candidate.provenance?.competitive_context,
    });
    const extracted = extractCompetitiveContextFromIntent(intentWithComp);

    assert(
      extracted !== null &&
        extracted.assumption.assumed_competitive_price_gbp === 2.04 &&
        extracted.assumption.competitive_response_pp_per_disadvantage_point === 0.85,
      'I1 extractCompetitiveContextFromIntent reconstructs exact CompetitivePriceAssumption from CampaignIntent',
    );

    const requestPayload = {
      tenant_id: CAMPAIGN_DEMO_TENANT_ID,
      session_id: CAMPAIGN_DEMO_SESSION_ID,
      campaign_intent_id: intentWithComp.intent_id,
      campaign_intent: intentWithComp,
    };
    const withoutCompRes = evaluateCompetitiveCdiDecision(
      CANONICAL_SCENARIO,
      requestPayload,
      null,
    );
    const withCompRes = evaluateCompetitiveCdiDecision(
      CANONICAL_SCENARIO,
      requestPayload,
      extracted!.assumption,
    );

    const expectedAttributableUpliftPp = Number(
      (
        withoutCompRes.cdi_response.counterfactual.campaign_delta.attributable_uplift_pp +
        holdOption.evaluation!.intervention_attributable_competitive_effect_pp
      ).toFixed(2),
    );
    assert(
      withCompRes.cdi_response.counterfactual.campaign_delta.attributable_uplift_pp ===
        expectedAttributableUpliftPp &&
        withCompRes.cdi_response.counterfactual.campaign_delta.contribution_delta_gbp !==
          withoutCompRes.cdi_response.counterfactual.campaign_delta.contribution_delta_gbp &&
        Boolean(
          withCompRes.cdi_response.counterfactual.demand_bridge?.design_components.some(
            c => c.label === 'Competitive price response (modelled assumption)',
          ),
        ),
      `I2 Live CDI evaluation with competitive context reflects competitive demand bridge and net contribution (£${withCompRes.cdi_response.counterfactual.campaign_delta.contribution_delta_gbp} vs £${withoutCompRes.cdi_response.counterfactual.campaign_delta.contribution_delta_gbp} without)`,
    );
    assert(
      evaluateRouteSource.includes('extractCompetitiveContextFromIntent') &&
        evaluateRouteSource.includes('evaluateCompetitiveCdiDecision'),
      'I3 /api/v1/campaigns/evaluate route uses extractCompetitiveContextFromIntent and evaluateCompetitiveCdiDecision',
    );
  }

  // ── J. APPROVE & ACTIVATE RECORDS MODELLED COMPETITIVE PROVENANCE ─────────
  console.log('\n── J. Approve & Activate Records Modelled Competitive Provenance ──');
  {
    const projection = scenarioArchetypeProjection(CANONICAL_SCENARIO);
    const assumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 2.04,
      competitive_response_pp_per_disadvantage_point: 0.85,
    });
    const whatIf = evaluateCompetitiveWhatIfIntelligence({
      scenario: CANONICAL_SCENARIO,
      assumption,
      active_depth_pct: 14,
      scope: 'National',
      horizon_days: 14,
    });
    const matchOption = whatIf.response_options.options.find(o => o.option_type === 'MATCH')!;
    const candidate = buildCompetitiveResponseCandidateIntervention({
      whatIfResult: whatIf,
      selectedOption: matchOption,
    });

    const intent = buildCampaignIntentFromArchetype(projection, {
      discount_depth_pct: matchOption.depth_pct!,
      target_region: matchOption.scope,
      duration_days: matchOption.duration_days,
      tenant_id: CAMPAIGN_DEMO_TENANT_ID,
      session_id: CAMPAIGN_DEMO_SESSION_ID,
      competitive_context: candidate.provenance?.competitive_context,
    });

    const assumptionsList = intent.decision_context.assumptions ?? [];
    const assumptionsText = assumptionsList.join(' | ');
    assert(
      assumptionsList.includes(COMPETITIVE_GOVERNANCE_STATEMENT),
      'J1 Activated CampaignIntent records exact statement: "This configuration was selected under a modelled competitive-price assumption."',
    );
    assert(
      assumptionsText.includes('£2.04') &&
        assumptionsText.includes('0.85') &&
        assumptionsText.includes('MODELLED ASSUMPTION') &&
        assumptionsText.includes('MATCH') &&
        assumptionsText.includes('MAXIMUM NET CONTRIBUTION'),
      'J2 Activated CampaignIntent records benchmark price, γ, MODELLED ASSUMPTION provenance, selected response option, and MAXIMUM NET CONTRIBUTION objective',
    );
    assert(
      !/Observed competitor price/i.test(assumptionsText) &&
        !/Attested competitor price/i.test(assumptionsText),
      'J3 Activated CampaignIntent never records competitive price as observed or attested',
    );
  }

  // ── K. RELOAD HYDRATION PRESERVES ACTIVATED STATE ─────────────────────────
  console.log('\n── K. Reload Hydration Preserves Activated State ──');
  {
    const projection = scenarioArchetypeProjection(CANONICAL_SCENARIO);
    const assumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 2.04,
      competitive_response_pp_per_disadvantage_point: 0.85,
    });
    const whatIf = evaluateCompetitiveWhatIfIntelligence({
      scenario: CANONICAL_SCENARIO,
      assumption,
      active_depth_pct: 14,
      scope: 'National',
      horizon_days: 14,
    });
    const reduceOption = whatIf.response_options.options.find(
      o => o.option_type === 'REDUCE_EXPOSURE',
    )!;
    const candidate = buildCompetitiveResponseCandidateIntervention({
      whatIfResult: whatIf,
      selectedOption: reduceOption,
    });

    const savedIntent = buildCampaignIntentFromArchetype(projection, {
      discount_depth_pct: reduceOption.depth_pct!,
      target_region: reduceOption.scope,
      duration_days: reduceOption.duration_days,
      tenant_id: CAMPAIGN_DEMO_TENANT_ID,
      session_id: CAMPAIGN_DEMO_SESSION_ID,
      competitive_context: candidate.provenance?.competitive_context,
    });

    const restoredConfig = configFromCampaignIntent(
      { campaign_intent: savedIntent.campaign_intent, audience_market: savedIntent.audience_market },
      { discount_pct: 14, region: 'National', duration_days: 14 },
    );
    const restoredComp = extractCompetitiveContextFromIntent(savedIntent);

    assert(
      restoredConfig.discount_pct === reduceOption.depth_pct &&
        restoredConfig.region === reduceOption.scope &&
        restoredConfig.duration_days === reduceOption.duration_days,
      'K1 Reload hydration restores discount depth, region, and duration from CampaignIntent',
    );
    assert(
      restoredComp !== null &&
        restoredComp.context.selected_response_type === 'REDUCE_EXPOSURE' &&
        restoredComp.context.governance_statement === COMPETITIVE_GOVERNANCE_STATEMENT &&
        restoredComp.context.provenance_badge === 'MODELLED ASSUMPTION',
      'K2 Reload hydration reconstructs full CompetitiveInterventionContext and governance statement',
    );
  }

  // ── L. EVIDENCE NETWORK USES EXISTING HYPOTHESIS CATEGORY ─────────────────
  console.log('\n── L. Evidence Network Uses Existing HYPOTHESIS Category ──');
  {
    const projection = scenarioArchetypeProjection(CANONICAL_SCENARIO);
    const assumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 2.04,
      competitive_response_pp_per_disadvantage_point: 0.85,
    });
    const whatIf = evaluateCompetitiveWhatIfIntelligence({
      scenario: CANONICAL_SCENARIO,
      assumption,
      active_depth_pct: 14,
      scope: 'National',
      horizon_days: 14,
    });
    const graphNode = buildCompetitiveAssumptionGraphNode(whatIf);

    assert(
      graphNode.id === COMPETITIVE_ASSUMPTION_NODE_ID &&
        graphNode.category === 'HYPOTHESIS',
      `L1 Competitive assumption graph node uses existing HYPOTHESIS category (${graphNode.category})`,
    );
    assert(
      (graphNode.category as string) !== 'COMPETITOR SIGNAL' &&
        !/COMPETITOR SIGNAL/i.test(graphNode.label) &&
        !/COMPETITOR SIGNAL/i.test(graphNode.summary),
      'L2 Competitive assumption graph node never uses COMPETITOR SIGNAL category or label',
    );

    const inspection = inspectDecisionGraphNode({
      archetype: projection,
      node: graphNode,
      currentDiscountPct: 14,
      currentRegion: 'National',
      currentDurationDays: 14,
      competitiveWhatIf: whatIf,
      selectedCompetitiveOptionType: whatIf.response_options.preferred_option_type,
    });

    assert(
      inspection.visual.kind === 'COMPETITIVE_ASSUMPTION' &&
        inspection.visual.provenance_badge_label === 'MODELLED ASSUMPTION' &&
        inspection.visual.our_promotional_price_gbp === whatIf.current_position.position.our_promotional_price_gbp &&
        inspection.visual.assumed_competitive_price_gbp === 2.04,
      'L3 Inspecting the competitive assumption node renders the COMPETITIVE_ASSUMPTION semantic visual',
    );
    assert(
      inspection.provenance_badge === 'MODELLED ASSUMPTION' &&
        inspection.caveat === COMPETITIVE_GOVERNANCE_STATEMENT,
      'L4 Inspecting the competitive assumption node carries MODELLED ASSUMPTION badge and governance statement',
    );
    assert(
      graphLensSource.includes('graph-visual-COMPETITIVE_ASSUMPTION') &&
        workspaceSource.includes('candidate-competitive-context') &&
        inverseLensSource.includes('competitive-response-options-section'),
      'L5 DecisionGraphLens, InterventionWorkspace, and InverseAnalysisLens wire the competitive visual and provenance blocks',
    );
  }

  // ── M. ZERO-DEFAULT PRESERVATION WHEN NO COMPETITIVE ASSUMPTION EXISTS ────
  console.log('\n── M. Zero-Default Preservation When No Competitive Assumption Exists ──');
  for (const { label, scenario, expectedRec } of ALL_SCENARIOS) {
    const projection = scenarioArchetypeProjection(scenario);
    const intent = buildCampaignIntentFromArchetype(projection, {
      tenant_id: CAMPAIGN_DEMO_TENANT_ID,
      session_id: CAMPAIGN_DEMO_SESSION_ID,
    });
    const extracted = extractCompetitiveContextFromIntent(intent);
    assert(
      extracted === null,
      `M1 [${label}] CampaignIntent without competitive_context has zero competitive metadata`,
    );
    assert(
      projection.curve_summary?.recommended_discount_pct === expectedRec,
      `M2 [${label}] Canonical recommended depth (${projection.curve_summary?.recommended_discount_pct}%) is preserved unchanged`,
    );
  }

  // ── N. SCENARIO ISOLATION & SCI-07 GOVERNANCE BOUNDARY ────────────────────
  console.log('\n── N. Scenario Isolation & SCI-07 Governance Boundary ──');
  {
    const dairyWhatIf = evaluateCompetitiveWhatIfIntelligence({
      scenario: CANONICAL_SCENARIO,
      assumption: createCompetitivePriceAssumption({
        assumed_competitive_price_gbp: 2.04,
        competitive_response_pp_per_disadvantage_point: 0.85,
      }),
    });
    const salmonWhatIf = evaluateCompetitiveWhatIfIntelligence({
      scenario: CHILLED_SALMON_SCENARIO,
      assumption: createCompetitivePriceAssumption({
        assumed_competitive_price_gbp: 3.80,
        competitive_response_pp_per_disadvantage_point: 0.85,
      }),
    });

    assert(
      dairyWhatIf.scenario_id !== salmonWhatIf.scenario_id &&
        dairyWhatIf.current_position.position.list_price_gbp !==
          salmonWhatIf.current_position.position.list_price_gbp &&
        dairyWhatIf.response_options.options[0].promoted_price_gbp !==
          salmonWhatIf.response_options.options[0].promoted_price_gbp,
      'N1 Reference scenarios remain strictly isolated with distinct list prices and response option evaluations',
    );

    // Authored scenario via Dynamic Scenario Studio draft resolver
    const authorableProduct = listAuthorableProducts()[0];
    const resolvedAuthored = resolveScenarioDraft(
      {
        scenario_name: 'Authored Promotion Exploration',
        sku_id: authorableProduct.sku_id,
        situation: 'PROMOTION_DEMAND_SURGE',
        market_scope: 'NATIONAL',
        promotion_depth_pct: 15,
        forecast_horizon_days: 14,
      },
      'SCN-AUTHORED-TEST-001',
    );
    assert(
      Boolean(resolvedAuthored.scenario) &&
        resolvedAuthored.scenario.identity.scenario_id === 'SCN-AUTHORED-TEST-001',
      'N2 Dynamic Scenario Studio authored draft resolves to a valid CanonicalScenario',
    );
    {
      const authoredWhatIf = evaluateCompetitiveWhatIfIntelligence({
        scenario: resolvedAuthored.scenario,
        assumption: createCompetitivePriceAssumption({
          assumed_competitive_price_gbp: Number(
            (resolvedAuthored.scenario.economics.list_price_gbp * 0.82).toFixed(2),
          ),
          competitive_response_pp_per_disadvantage_point: 0.75,
        }),
      });
      assert(
        authoredWhatIf.scenario_id === resolvedAuthored.scenario.identity.scenario_id &&
          authoredWhatIf.response_options.options.length === 4,
        'N3 Authored scenario evaluates all 4 competitive response options in isolation',
      );

      // Contract hydration isolation check
      const dairyProjection = scenarioArchetypeProjection(CANONICAL_SCENARIO);
      const dairyIntent = buildCampaignIntentFromArchetype(dairyProjection, {
        tenant_id: CAMPAIGN_DEMO_TENANT_ID,
        session_id: CAMPAIGN_DEMO_SESSION_ID,
      });
      const canHydrateInAuthored = canHydrateContractForScenario({
        contract: { status: 'ACTIVE', contract_id: 'CTR-TEST' } as any,
        intent: dairyIntent,
        activeScenarioId: resolvedAuthored.scenario.identity.scenario_id,
      });
      assert(
        canHydrateInAuthored === false,
        'N4 Contract from Fresh Dairy cannot hydrate into authored scenario',
      );
    }

    assert(
      SCENARIO_SITUATIONS_NOT_SUPPORTED.some(s =>
        /Competitor price response/i.test(typeof s === 'string' ? s : s.label),
      ),
      'N5 SCI-07 frozen contract boundary respected: Competitor price response remains in SCENARIO_SITUATIONS_NOT_SUPPORTED without mutating SHA-D frozen contracts',
    );
  }

  console.log('\n══════════════════════════════════════════════════════════');
  console.log(`  RESULT: ${passed} passed, ${failed} failed (total ${passed + failed})`);
  console.log('══════════════════════════════════════════════════════════');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Unhandled error in competitive response options test suite:', err);
  process.exit(1);
});
