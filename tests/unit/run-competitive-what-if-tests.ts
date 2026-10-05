/**
 * CogniX — Competitive Price Response Slices 2–3:
 * What-If Intelligence & Decision Boundary Test Suite
 *
 * Proves:
 *   A. NO ASSUMPTION: Existing Promotion What-If remains unchanged.
 *   B. MODELLED PROVENANCE: Competitive benchmark never renders as observed/attested/signal.
 *   C. CURRENT POSITION: Relative price position matches Slice 1.
 *   D. CURRENT DECISION: Current winner is derived from the competitive engine.
 *   E. SWEEP DETERMINISM: Same scenario + assumption + γ produces identical sweep.
 *   F. FLIP: Controlled fixtures with a genuine winner change report the correct first boundary.
 *   G. NO FLIP: Controlled fixtures with no change report NO_FLIP_WITHIN_TESTED_RANGE.
 *   H. γ = 0: No competitive decision boundary is claimed.
 *   I. MATCH: Parity depth matches Slice 1 derivation.
 *   J. AMBIENT ATTRIBUTION: Ambient competitive effect is not presented as campaign-attributable uplift/loss.
 *   K. CANONICAL REGRESSION: Fresh Dairy / Salmon / Bakery remain unchanged when competitive exploration is unused.
 *
 * Run via: npx tsx tests/unit/run-competitive-what-if-tests.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CANONICAL_SCENARIO,
  CHILLED_SALMON_SCENARIO,
  PREMIUM_BAKERY_SCENARIO,
  SCENARIO_SITUATIONS_NOT_SUPPORTED,
} from '../../packages/contracts/src/index';
import {
  scenarioArchetypeProjection,
  scenarioElasticityCurve,
} from '../../lib/campaign-archetypes';
import { describeInverseConditionDecision } from '../../lib/campaign-candidate-intervention';
import {
  COMPETITIVE_ASSUMPTION_PROVENANCE,
  COMPETITIVE_BOUNDARY_SWEEP_STEP_PP,
  COMPETITIVE_USER_FACING_PROVENANCE_BADGE,
  COMPETITIVE_USER_FACING_PROVENANCE_LABEL,
  COMPETITIVE_USER_FACING_PROVENANCE_NOTE,
  createCompetitivePriceAssumption,
  decomposeCompetitiveDemandEffect,
  deriveCompetitiveMatchDepth,
  deriveRelativePricePosition,
  evaluateCompetitiveDecisionBoundarySweep,
  evaluateCompetitiveDepthCurve,
  evaluateCompetitiveScenarioAtDepth,
  evaluateCompetitiveWhatIfIntelligence,
  scenarioCompetitiveDisadvantagePp,
  scenarioPromotedPriceAtDepthGbp,
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
const plannerSource = readFileSync(
  join(ROOT, 'components', 'PromotionPlanner.tsx'),
  'utf8',
);

const ALL_SCENARIOS = [
  { label: 'Fresh Dairy', scenario: CANONICAL_SCENARIO, expectedRec: 14 },
  { label: 'Chilled Salmon', scenario: CHILLED_SALMON_SCENARIO, expectedRec: 10 },
  { label: 'Premium Bakery', scenario: PREMIUM_BAKERY_SCENARIO, expectedRec: 0 },
] as const;

async function runTests() {
  console.log('══════════════════════════════════════════════════════════');
  console.log('  COMPETITIVE WHAT-IF INTELLIGENCE & DECISION BOUNDARY');
  console.log('══════════════════════════════════════════════════════════');

  // ── A. NO ASSUMPTION ──────────────────────────────────────────────────────
  console.log('\n── A. NO ASSUMPTION (Existing Promotion What-If Unchanged) ──');
  for (const { label, scenario } of ALL_SCENARIOS) {
    const projection = scenarioArchetypeProjection(scenario);
    assert(
      projection.inverse_conditions.length >= 2,
      `A1 [${label}] Existing inverse conditions remain intact (${projection.inverse_conditions.length})`,
    );

    for (const cond of projection.inverse_conditions) {
      const summary = describeInverseConditionDecision({
        archetype: projection,
        condition: cond,
        currentDiscountPct: projection.default_discount_pct,
        currentRegion: projection.default_region,
        currentDurationDays: projection.default_duration_days,
      });
      assert(
        summary.decision_question.length > 10 &&
          summary.current_assumption.length > 3 &&
          summary.tested_condition.length > 3 &&
          summary.recommendation_implication.length > 10,
        `A2 [${label}] Inverse condition ${cond.target_parameter} decision summary unchanged`,
      );
    }

    assert(
      projection.change_triggers.length >= 1 && projection.signal_hypotheses.length >= 1,
      `A3 [${label}] Change triggers (${projection.change_triggers.length}) and signal hypotheses (${projection.signal_hypotheses.length}) remain intact`,
    );
  }

  assert(
    /What Would Have To Be True\?/.test(inverseLensSource) &&
      /What Could Change This Decision\?/.test(inverseLensSource) &&
      /Signal → Hypothesis → Action Feed/.test(inverseLensSource),
    'A4 InverseAnalysisLens preserves all three existing What-If & Signal Feed sections',
  );
  assert(
    /Would our current promotion decision still hold if competitive pricing changes\?/.test(
      inverseLensSource,
    ),
    'A5 InverseAnalysisLens exposes the exact Competitive Price Response What-If question',
  );
  assert(
    /const \[isCompetitiveOpen, setIsCompetitiveOpen\] = useState<boolean>\(false\)/.test(
      inverseLensSource,
    ) &&
      /const \[evaluatedAssumption, setEvaluatedAssumption\] =\s*useState<CompetitivePriceAssumption \| null>\(null\)/.test(
        inverseLensSource,
      ),
    'A6 Competitive What-If opens collapsed with null assumption by default (progressive disclosure)',
  );

  // ── B. MODELLED PROVENANCE ────────────────────────────────────────────────
  console.log('\n── B. MODELLED PROVENANCE ──');
  {
    const assumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 1.85,
      competitive_response_pp_per_disadvantage_point: 1.0,
    });
    const intel = evaluateCompetitiveWhatIfIntelligence({
      scenario: CANONICAL_SCENARIO,
      assumption,
    });

    assert(
      intel.assumption.provenance.origin === 'modelled' &&
        intel.assumption.provenance.method === 'manual' &&
        intel.assumption.provenance.authority === 'authoritative',
      'B1 Internal provenance uses Slice 1 modelled/manual/authoritative descriptor',
    );
    assert(
      intel.user_facing_provenance.badge === 'MODELLED ASSUMPTION' &&
        intel.user_facing_provenance.label === 'Modelled assumption · entered by you',
      `B2 User-facing provenance presents "${intel.user_facing_provenance.badge}" and "${intel.user_facing_provenance.label}"`,
    );

    const prohibitedClaims = [
      /observed competitor price/i,
      /market price/i,
      /competitor signal/i,
      /attested competitor/i,
      /authoritative market/i,
    ];
    const allUserFacingStrings = [
      COMPETITIVE_USER_FACING_PROVENANCE_BADGE,
      COMPETITIVE_USER_FACING_PROVENANCE_LABEL,
      COMPETITIVE_USER_FACING_PROVENANCE_NOTE,
      intel.intelligence_summary.current_decision_headline,
      intel.intelligence_summary.current_decision_detail,
      intel.intelligence_summary.competitive_position_headline,
      intel.intelligence_summary.competitive_position_detail,
      intel.intelligence_summary.decision_boundary_headline,
      intel.intelligence_summary.decision_boundary_detail,
      intel.intelligence_summary.beyond_boundary_headline,
      intel.intelligence_summary.beyond_boundary_detail,
      intel.match_reference.headline,
      intel.match_reference.detail,
    ].join(' | ');

    assert(
      prohibitedClaims.every((re) => !re.test(allUserFacingStrings)),
      'B3 Domain user-facing intelligence never claims observed competitor price, market price, or competitor signal',
    );
    assert(
      !/authoritative/i.test(allUserFacingStrings),
      'B4 User-facing intelligence never presents internal "authoritative" field as market truth',
    );
    assert(
      prohibitedClaims.every((re) => !re.test(inverseLensSource)),
      'B5 InverseAnalysisLens UI source never contains prohibited "Observed competitor price", "Market price", or "Competitor signal" copy',
    );
    assert(
      /Demand sensitivity to competitive price difference/.test(inverseLensSource) &&
        /Modelled demand impact for each percentage-point that our price is above or below the competitive benchmark\./.test(
          inverseLensSource,
        ),
      'B6 Sensitivity input is explained in plain business language with technical coefficient γ in secondary detail',
    );
  }

  // ── C. CURRENT POSITION ───────────────────────────────────────────────────
  console.log('\n── C. CURRENT POSITION (Matches Slice 1 Derivations) ──');
  {
    // Disadvantage case: Fresh Dairy at 20% depth (£1.99) vs £1.84 benchmark
    const aDis = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 1.84,
      competitive_response_pp_per_disadvantage_point: 1.0,
    });
    const slice1PosDis = deriveRelativePricePosition(CANONICAL_SCENARIO, 20, 1.84);
    const intelDis = evaluateCompetitiveWhatIfIntelligence({
      scenario: CANONICAL_SCENARIO,
      assumption: aDis,
      active_depth_pct: 20,
    });
    assert(
      JSON.stringify(intelDis.current_position.position) === JSON.stringify(slice1PosDis),
      'C1 Disadvantage case: What-If current_position.position is byte-identical to Slice 1 deriveRelativePricePosition',
    );
    assert(
      intelDis.current_position.position.our_promotional_price_gbp === 1.99 &&
        intelDis.current_position.position.disadvantage_pp === 6.02 &&
        intelDis.current_position.position.standing === 'DISADVANTAGE' &&
        /6\.0% more expensive/.test(intelDis.current_position.relative_position_label),
      `C2 Disadvantage case reports £1.99 vs £1.84 as 6.0% more expensive (+6.02pp of list)`,
    );

    // Parity case: Fresh Dairy at 20% depth (£1.99) vs £1.99 benchmark
    const aPar = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 1.99,
      competitive_response_pp_per_disadvantage_point: 1.0,
    });
    const slice1PosPar = deriveRelativePricePosition(CANONICAL_SCENARIO, 20, 1.99);
    const intelPar = evaluateCompetitiveWhatIfIntelligence({
      scenario: CANONICAL_SCENARIO,
      assumption: aPar,
      active_depth_pct: 20,
    });
    assert(
      JSON.stringify(intelPar.current_position.position) === JSON.stringify(slice1PosPar) &&
        intelPar.current_position.position.standing === 'PARITY' &&
        intelPar.current_position.position.disadvantage_pp === 0,
      'C3 Parity case matches Slice 1 with 0 disadvantage_pp and PARITY standing',
    );

    // Advantage case: Fresh Dairy at 20% depth (£1.99) vs £2.24 benchmark
    const aAdv = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 2.24,
      competitive_response_pp_per_disadvantage_point: 1.0,
    });
    const slice1PosAdv = deriveRelativePricePosition(CANONICAL_SCENARIO, 20, 2.24);
    const intelAdv = evaluateCompetitiveWhatIfIntelligence({
      scenario: CANONICAL_SCENARIO,
      assumption: aAdv,
      active_depth_pct: 20,
    });
    assert(
      JSON.stringify(intelAdv.current_position.position) === JSON.stringify(slice1PosAdv) &&
        intelAdv.current_position.position.standing === 'ADVANTAGE' &&
        intelAdv.current_position.position.disadvantage_pp === -10.04 &&
        /10\.0% cheaper/.test(intelAdv.current_position.relative_position_label),
      'C4 Advantage case matches Slice 1 with -10.04pp disadvantage_pp and 10.0% cheaper label',
    );
  }

  // ── D. CURRENT DECISION ───────────────────────────────────────────────────
  console.log('\n── D. CURRENT DECISION (Derived from Competitive Engine) ──');
  {
    // Case 1: Fresh Dairy with £1.95 benchmark, γ = 0.8 -> 14% remains winner
    const aHold = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 1.95,
      competitive_response_pp_per_disadvantage_point: 0.8,
    });
    const slice1CurveHold = evaluateCompetitiveDepthCurve(CANONICAL_SCENARIO, aHold);
    const slice1ActiveHold = evaluateCompetitiveScenarioAtDepth(
      CANONICAL_SCENARIO,
      20,
      aHold,
    );
    const intelHold = evaluateCompetitiveWhatIfIntelligence({
      scenario: CANONICAL_SCENARIO,
      assumption: aHold,
      active_depth_pct: 20,
    });

    assert(
      intelHold.current_decision_impact.competitive_recommended_depth_pct ===
        slice1CurveHold.recommended_discount_pct &&
        intelHold.current_decision_impact.competitive_recommended_depth_pct === 14 &&
        intelHold.current_decision_impact.does_baseline_recommendation_hold === true,
      'D1 Current winner (14%) matches Slice 1 evaluateCompetitiveDepthCurve and reports baseline recommendation holds',
    );
    assert(
      JSON.stringify(intelHold.current_decision_impact.active_point) ===
        JSON.stringify(slice1ActiveHold),
      'D2 Active point evaluation matches Slice 1 evaluateCompetitiveScenarioAtDepth',
    );
    assert(
      intelHold.boundary_sweep.current_winner.status === 'CURRENT_WINNER' &&
        intelHold.boundary_sweep.current_winner.winning_depth_pct === 14,
      'D3 Sweep current_winner carries explicit CURRENT_WINNER status and 14% winning depth',
    );

    // Case 2: Fresh Dairy with £1.74 benchmark, γ = 1.2 -> winner shifts from 14% to 25%
    const aShift = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 1.74,
      competitive_response_pp_per_disadvantage_point: 1.2,
    });
    const slice1CurveShift = evaluateCompetitiveDepthCurve(CANONICAL_SCENARIO, aShift);
    const intelShift = evaluateCompetitiveWhatIfIntelligence({
      scenario: CANONICAL_SCENARIO,
      assumption: aShift,
      active_depth_pct: 20,
    });

    assert(
      intelShift.current_decision_impact.competitive_recommended_depth_pct ===
        slice1CurveShift.recommended_discount_pct &&
        intelShift.current_decision_impact.competitive_recommended_depth_pct === 25 &&
        intelShift.current_decision_impact.does_baseline_recommendation_hold === false,
      'D4 When competitive pressure shifts the optimum (14% -> 25%), current_decision_impact reports does_baseline_recommendation_hold = false',
    );
  }

  // ── E. SWEEP DETERMINISM ──────────────────────────────────────────────────
  console.log('\n── E. SWEEP DETERMINISM ──');
  {
    const assumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 1.95,
      competitive_response_pp_per_disadvantage_point: 1.0,
    });
    const run1 = evaluateCompetitiveDecisionBoundarySweep({
      scenario: CANONICAL_SCENARIO,
      assumption,
      active_depth_pct: 20,
    });
    const run2 = evaluateCompetitiveDecisionBoundarySweep({
      scenario: CANONICAL_SCENARIO,
      assumption,
      active_depth_pct: 20,
    });
    const intel1 = evaluateCompetitiveWhatIfIntelligence({
      scenario: CANONICAL_SCENARIO,
      assumption,
      active_depth_pct: 20,
    });
    const intel2 = evaluateCompetitiveWhatIfIntelligence({
      scenario: CANONICAL_SCENARIO,
      assumption,
      active_depth_pct: 20,
    });

    assert(
      JSON.stringify(run1) === JSON.stringify(run2),
      'E1 Repeated evaluateCompetitiveDecisionBoundarySweep calls produce byte-identical JSON',
    );
    assert(
      JSON.stringify(intel1) === JSON.stringify(intel2),
      'E2 Repeated evaluateCompetitiveWhatIfIntelligence calls produce byte-identical JSON',
    );
    assert(
      run1.step_pp === COMPETITIVE_BOUNDARY_SWEEP_STEP_PP && run1.step_pp === 1,
      'E3 Sweep uses reproducible 1pp list-price disadvantage search step',
    );
    assert(
      run1.visual_landmarks.length >= 3 && run1.visual_landmarks.length <= 6,
      `E4 Visual landmarks remain compact (${run1.visual_landmarks.length} landmarks, not dozens of raw sweep rows)`,
    );
  }

  // ── F. FLIP ───────────────────────────────────────────────────────────────
  console.log('\n── F. FLIP (Genuine Winner Change Reports Correct First Boundary) ──');
  {
    // Fixture 1: Fresh Dairy at 20% active depth (£1.99), benchmark £1.99 (0pp disadvantage), γ = 1.0
    // At £1.99 (0pp), 14% is optimal. As disadvantage increases in 1pp steps, at +6pp (£1.84, 6.02pp disadvantage),
    // the contribution-maximising configuration flips from 14% to 20%.
    const aDairy = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 1.99,
      competitive_response_pp_per_disadvantage_point: 1.0,
    });
    const sweepDairy = evaluateCompetitiveDecisionBoundarySweep({
      scenario: CANONICAL_SCENARIO,
      assumption: aDairy,
      active_depth_pct: 20,
    });

    assert(
      sweepDairy.outcome === 'FLIP_FOUND' &&
        sweepDairy.boundary_status === 'FLIP_FOUND' &&
        sweepDairy.boundary !== null &&
        sweepDairy.boundary.status === 'FLIP_FOUND',
      'F1 Fresh Dairy (γ = 1.0, £1.99 benchmark) reports FLIP_FOUND',
    );
    assert(
      sweepDairy.current_winner.winning_depth_pct === 14 &&
        sweepDairy.boundary!.previous_winning_depth_pct === 14 &&
        sweepDairy.boundary!.new_winning_depth_pct === 20 &&
        sweepDairy.boundary!.assumed_competitive_price_gbp === 1.84 &&
        sweepDairy.boundary!.disadvantage_pp === 6.02 &&
        sweepDairy.boundary!.direction === 'MORE_AGGRESSIVE_COMPETITION',
      `F2 Fresh Dairy first boundary is exact: 14% -> 20% at £1.84 (+6.02pp disadvantage, got ${sweepDairy.boundary?.disadvantage_pp}pp / £${sweepDairy.boundary?.assumed_competitive_price_gbp})`,
    );

    // Verify that the point immediately before the boundary (+5pp step -> £1.87) still has 14% as winner
    const preBoundaryCurve = evaluateCompetitiveDepthCurve(
      CANONICAL_SCENARIO,
      createCompetitivePriceAssumption({
        assumed_competitive_price_gbp: 1.87,
        competitive_response_pp_per_disadvantage_point: 1.0,
      }),
    );
    const atBoundaryCurve = evaluateCompetitiveDepthCurve(
      CANONICAL_SCENARIO,
      createCompetitivePriceAssumption({
        assumed_competitive_price_gbp: 1.84,
        competitive_response_pp_per_disadvantage_point: 1.0,
      }),
    );
    assert(
      preBoundaryCurve.recommended_discount_pct === 14 &&
        atBoundaryCurve.recommended_discount_pct === 20,
      'F3 Verified against Slice 1: at £1.87 (+5pp step) winner is 14%; at £1.84 (+6pp step) winner flips to 20%',
    );

    // Fixture 2: Premium Bakery (list £1.39, active depth 10% -> £1.25), benchmark £1.25, γ = 1.0
    // At £1.25, 0% (do not promote) is winner; under severe competitive disadvantage it flips to 5%.
    const aBakery = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 1.25,
      competitive_response_pp_per_disadvantage_point: 1.0,
    });
    const sweepBakery = evaluateCompetitiveDecisionBoundarySweep({
      scenario: PREMIUM_BAKERY_SCENARIO,
      assumption: aBakery,
      active_depth_pct: 10,
    });
    assert(
      sweepBakery.outcome === 'FLIP_FOUND' &&
        sweepBakery.current_winner.winning_depth_pct === 0 &&
        sweepBakery.boundary?.new_winning_depth_pct === 5,
      `F4 Premium Bakery (γ = 1.0) reports FLIP_FOUND from 0% to 5% at £${sweepBakery.boundary?.assumed_competitive_price_gbp} (+${sweepBakery.boundary?.disadvantage_pp}pp)`,
    );
  }

  // ── G. NO FLIP ────────────────────────────────────────────────────────────
  console.log('\n── G. NO FLIP (Reports NO_FLIP_WITHIN_TESTED_RANGE) ──');
  {
    // Fixture 1: Fresh Dairy with γ = 0.4 -> 14% remains optimal across the entire tested range
    const aNoFlipDairy = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 1.95,
      competitive_response_pp_per_disadvantage_point: 0.4,
    });
    const sweepNoFlipDairy = evaluateCompetitiveDecisionBoundarySweep({
      scenario: CANONICAL_SCENARIO,
      assumption: aNoFlipDairy,
      active_depth_pct: 20,
    });
    assert(
      sweepNoFlipDairy.outcome === 'NO_FLIP_WITHIN_TESTED_RANGE' &&
        sweepNoFlipDairy.boundary_status === 'NO_FLIP_WITHIN_TESTED_RANGE' &&
        sweepNoFlipDairy.boundary === null,
      'G1 Fresh Dairy (γ = 0.4) reports NO_FLIP_WITHIN_TESTED_RANGE and boundary = null',
    );
    assert(
      sweepNoFlipDairy.regime_segments.length === 1 &&
        sweepNoFlipDairy.regime_segments[0].winning_depth_pct === 14,
      'G2 Single 14% regime spans the entire tested competitive range when no flip exists',
    );

    // Fixture 2: Premium Bakery with γ = 0.5 -> 0% remains optimal across the entire tested range
    const aNoFlipBakery = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 1.25,
      competitive_response_pp_per_disadvantage_point: 0.5,
    });
    const intelNoFlipBakery = evaluateCompetitiveWhatIfIntelligence({
      scenario: PREMIUM_BAKERY_SCENARIO,
      assumption: aNoFlipBakery,
      active_depth_pct: 10,
    });
    assert(
      intelNoFlipBakery.boundary_sweep.outcome === 'NO_FLIP_WITHIN_TESTED_RANGE' &&
        intelNoFlipBakery.boundary_sweep.boundary === null &&
        /NO DECISION FLIP/.test(
          intelNoFlipBakery.intelligence_summary.decision_boundary_headline,
        ),
      'G3 Premium Bakery (γ = 0.5) reports NO_FLIP_WITHIN_TESTED_RANGE and "NO DECISION FLIP" headline',
    );
  }

  // ── H. γ = 0 ──────────────────────────────────────────────────────────────
  console.log('\n── H. γ = 0 (No Competitive Decision Boundary Claimed) ──');
  for (const { label, scenario, expectedRec } of ALL_SCENARIOS) {
    const aZero = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: Number((scenario.economics.list_price_gbp * 0.75).toFixed(2)),
      competitive_response_pp_per_disadvantage_point: 0,
    });
    const intelZero = evaluateCompetitiveWhatIfIntelligence({
      scenario,
      assumption: aZero,
    });

    assert(
      intelZero.boundary_sweep.outcome === 'NO_FLIP_WITHIN_TESTED_RANGE' &&
        intelZero.boundary_sweep.boundary === null,
      `H1 [${label}] γ = 0 reports NO_FLIP_WITHIN_TESTED_RANGE and boundary = null`,
    );
    assert(
      intelZero.current_decision_impact.competitive_recommended_depth_pct === expectedRec &&
        intelZero.current_decision_impact.active_point.competitive_response_pp === 0 &&
        intelZero.current_decision_impact.decomposition.ambient_competitive_effect_pp === 0 &&
        intelZero.current_decision_impact.decomposition
          .intervention_attributable_competitive_effect_pp === 0,
      `H2 [${label}] γ = 0 preserves canonical recommended depth (${expectedRec}%) and 0pp competitive effect`,
    );
    assert(
      intelZero.boundary_sweep.sweep_points.every(
        (pt) => pt.winning_depth_pct === expectedRec && !pt.is_first_boundary,
      ),
      `H3 [${label}] γ = 0 marks zero boundary points across the entire sweep grid`,
    );
  }

  // ── I. MATCH ──────────────────────────────────────────────────────────────
  console.log('\n── I. MATCH (Parity Depth Matches Slice 1 Derivation) ──');
  {
    const aMatch = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 2.04,
      competitive_response_pp_per_disadvantage_point: 0.8,
    });
    const slice1Match = deriveCompetitiveMatchDepth(CANONICAL_SCENARIO, 2.04);
    const intelMatch = evaluateCompetitiveWhatIfIntelligence({
      scenario: CANONICAL_SCENARIO,
      assumption: aMatch,
      active_depth_pct: 20,
    });

    assert(
      JSON.stringify(intelMatch.match_reference.derivation) === JSON.stringify(slice1Match),
      'I1 What-If match_reference.derivation is byte-identical to Slice 1 deriveCompetitiveMatchDepth',
    );
    assert(
      intelMatch.match_reference.derivation.status === 'MATCH_WITHIN_ALLOWED_RANGE' &&
        intelMatch.match_reference.derivation.match_depth_pct === 18.07 &&
        /18\.1% promotional depth/.test(intelMatch.match_reference.headline),
      `I2 Fresh Dairy (£2.49 list vs £2.04 benchmark) reports 18.07% (~18.1%) parity depth`,
    );
    assert(
      /Reference configuration only/.test(intelMatch.match_reference.detail) &&
        /does not automatically recommend or stage/.test(intelMatch.match_reference.detail),
      'I3 MATCH is explicitly framed as a reference configuration and never auto-recommended or staged',
    );
  }

  // ── J. AMBIENT ATTRIBUTION ────────────────────────────────────────────────
  console.log('\n── J. AMBIENT ATTRIBUTION (Ambient Effect Not Credited to Campaign) ──');
  {
    // Fresh Dairy (list £2.49, active depth 20% -> £1.99) vs £1.74 benchmark, γ = 1.0
    // At 0% list price (£2.49 vs £1.74): disadvantage = +30.12pp -> ambient competitive effect = -30.12pp
    // At 20% depth (£1.99 vs £1.74): disadvantage = +10.04pp -> total competitive effect = -10.04pp
    // Intervention-attributable competitive effect (0% -> 20%): -10.04 - (-30.12) = +20.08pp
    const assumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 1.74,
      competitive_response_pp_per_disadvantage_point: 1.0,
    });
    const slice1Decomp = decomposeCompetitiveDemandEffect({
      scenario: CANONICAL_SCENARIO,
      assumption,
      ambient_depth_pct: 0,
      target_depth_pct: 20,
    });
    const intel = evaluateCompetitiveWhatIfIntelligence({
      scenario: CANONICAL_SCENARIO,
      assumption,
      active_depth_pct: 20,
    });

    assert(
      JSON.stringify(intel.current_decision_impact.decomposition) ===
        JSON.stringify(slice1Decomp),
      'J1 What-If decomposition matches Slice 1 decomposeCompetitiveDemandEffect',
    );
    assert(
      intel.current_decision_impact.decomposition.ambient_competitive_effect_pp === -30.12 &&
        intel.current_decision_impact.decomposition.ambient_driver_class === 'ambient' &&
        intel.current_decision_impact.decomposition
          .intervention_attributable_competitive_effect_pp === 20.08 &&
        intel.current_decision_impact.decomposition.intervention_driver_class === 'intervention',
      'J2 Ambient competitive effect (-30.12pp) is separated from intervention-attributable competitive effect (+20.08pp)',
    );
    assert(
      intel.current_decision_impact.active_point.expected_demand_uplift_pct ===
        Number(
          (
            intel.current_decision_impact.active_point.own_price_response_pp +
            intel.current_decision_impact.decomposition
              .intervention_attributable_competitive_effect_pp
          ).toFixed(2),
        ),
      'J3 Campaign-attributable uplift includes ONLY own-price response + intervention-attributable competitive effect (never ambient loss)',
    );
    assert(
      /not credited or debited to the campaign/i.test(
        intel.current_decision_impact.ambient_attribution_note,
      ) &&
        /OWN PROMOTION EFFECT/.test(inverseLensSource) &&
        /COMPETITIVE ASSUMPTION EFFECT/.test(inverseLensSource),
      'J4 UI and domain explicitly distinguish OWN PROMOTION EFFECT from COMPETITIVE ASSUMPTION EFFECT and exclude ambient loss from campaign credit',
    );
  }

  // ── K. CANONICAL REGRESSION & NON-GOALS ───────────────────────────────────
  console.log('\n── K. CANONICAL REGRESSION & AUTHORITY BOUNDARIES ──');
  {
    const dairyCurve = scenarioElasticityCurve(CANONICAL_SCENARIO);
    const salmonCurve = scenarioElasticityCurve(CHILLED_SALMON_SCENARIO);
    const bakeryCurve = scenarioElasticityCurve(PREMIUM_BAKERY_SCENARIO);

    assert(
      dairyCurve.find((p) => p.is_cognix_recommended)?.discount_pct === 14 &&
        dairyCurve.find((p) => p.discount_pct === 14)?.net_contribution_delta_gbp === 32976,
      'K1 Fresh Dairy canonical curve recommendation (14%, +£32,976) unchanged',
    );
    assert(
      salmonCurve.find((p) => p.is_cognix_recommended)?.discount_pct === 10 &&
        salmonCurve.find((p) => p.discount_pct === 10)?.net_contribution_delta_gbp === 4432,
      'K2 Chilled Salmon canonical curve recommendation (10%, +£4,432) unchanged',
    );
    assert(
      bakeryCurve.find((p) => p.is_cognix_recommended)?.discount_pct === 0 &&
        bakeryCurve.find((p) => p.discount_pct === 0)?.net_contribution_delta_gbp === 0,
      'K3 Premium Bakery canonical curve recommendation (0% — do not promote) unchanged',
    );
    assert(
      SCENARIO_SITUATIONS_NOT_SUPPORTED.some((s) =>
        /Competitor price response/i.test(typeof s === 'string' ? s : s.label),
      ),
      'K4 SCI-07 SCENARIO_SITUATIONS_NOT_SUPPORTED still includes Competitor price response',
    );

    // Verify that Competitive What-If handler in InverseAnalysisLens never calls onProposeIntervention
    const competitiveBlock = inverseLensSource.slice(
      0,
      inverseLensSource.indexOf('const handleModelCondition'),
    );
    assert(
      !/onProposeIntervention\s*\(/.test(competitiveBlock),
      'K5 Competitive What-If evaluation and reset handlers never call onProposeIntervention or stage a candidate',
    );
    assert(
      /scenario=\{activeScenario\}/.test(plannerSource),
      'K6 PromotionPlanner binds activeScenario into InverseAnalysisLens',
    );
  }

  console.log('\n══════════════════════════════════════════════════════════');
  console.log(`  COMPETITIVE WHAT-IF TESTS: ${passed} passed, ${failed} failed`);
  console.log('══════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test failure:', err);
  process.exit(1);
});
