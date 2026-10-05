/**
 * Focused Domain Test Suite — CogniX Competitive Price Response (Slice 1)
 *
 * Covers:
 *   A. ZERO DEFAULT (no assumption & γ = 0 across all canonical outputs)
 *   B. PARITY (our promotional price = competitive price → response = 0)
 *   C. DISADVANTAGE (we are more expensive → negative demand effect)
 *   D. ADVANTAGE (we are cheaper → positive demand effect + 0-unit floor)
 *   E. γ IS DISTINCT (own-price coefficient and γ never cross-mutate)
 *   F. DETERMINISM (byte-identical outputs for identical inputs)
 *   G. AMBIENT ATTRIBUTION (ambient vs intervention-attributable separation)
 *   H. MATCH (parity depth derivation & boundary cases)
 *   I. INVALID INPUT (non-positive price, negative γ, non-finite, bad provenance, redundant fields)
 *   J. CANONICAL REGRESSION (Fresh Dairy, Chilled Salmon, Premium Bakery unchanged)
 *
 * Run with: npx tsx tests/unit/run-competitive-price-response-tests.ts
 */

import {
  type CampaignEvaluationRequest,
  type CampaignEvaluationResponse,
  type CanonicalScenario,
  CANONICAL_SCENARIO,
  CHILLED_SALMON_SCENARIO,
  PREMIUM_BAKERY_SCENARIO,
  SCENARIO_SITUATIONS_NOT_SUPPORTED,
  scenarioContributionAtDepthGbp,
  scenarioDepthResponsePp,
  scenarioExpectedDemandUnits,
  scenarioMarginExposureGbp,
  scenarioPromotedPriceGbp,
  withScenarioInScope,
} from '../../packages/contracts/src/index';
import {
  CAMPAIGN_DEMO_SESSION_ID,
  CAMPAIGN_DEMO_TENANT_ID,
  buildCampaignIntentFromArchetype,
  scenarioArchetypeProjection,
  scenarioElasticityCurve,
} from '../../lib/campaign-archetypes';
import { evaluateCampaignDecision } from '../../lib/campaign-causal-engine';
import { evaluateAuthoritativeScenarioDecision } from '../../lib/canonical-decision-evaluator';
import {
  COMPETITIVE_ASSUMPTION_PROVENANCE,
  COMPETITIVE_DERIVED_PROVENANCE,
  CompetitiveAssumptionValidationError,
  createCompetitivePriceAssumption,
  decomposeCompetitiveDemandEffect,
  deriveCompetitiveMatchDepth,
  deriveRelativePricePosition,
  describeCompetitiveAssumptionProvenance,
  evaluateCompetitiveAuthoritativeDecision,
  evaluateCompetitiveCandidateComparison,
  evaluateCompetitiveCdiDecision,
  evaluateCompetitiveDepthCurve,
  evaluateCompetitiveScenarioAtDepth,
  isZeroCompetitiveAssumption,
  scenarioCompetitiveDisadvantagePp,
  scenarioCompetitiveResponsePp,
  scenarioPromotedPriceAtDepthGbp,
  validateCompetitivePriceAssumption,
} from '../../lib/competitive-price-response';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string, detail?: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    const msg = detail ? `${label} — ${detail}` : label;
    failures.push(msg);
    console.log(`  ✗ ${msg}`);
  }
}

function assertThrows(
  fn: () => unknown,
  label: string,
  expectedCode?: string,
): void {
  try {
    fn();
    failed++;
    const msg = `${label} — expected CompetitiveAssumptionValidationError, but no error was thrown`;
    failures.push(msg);
    console.log(`  ✗ ${msg}`);
  } catch (err) {
    if (err instanceof CompetitiveAssumptionValidationError) {
      if (expectedCode && err.code !== expectedCode) {
        failed++;
        const msg = `${label} — expected code "${expectedCode}", got "${err.code}" (${err.message})`;
        failures.push(msg);
        console.log(`  ✗ ${msg}`);
        return;
      }
      passed++;
      console.log(`  ✓ ${label}`);
    } else {
      failed++;
      const msg = `${label} — unexpected error type: ${String(err)}`;
      failures.push(msg);
      console.log(`  ✗ ${msg}`);
    }
  }
}

function stripCdiTimestamps(res: CampaignEvaluationResponse): unknown {
  return {
    ...res,
    evaluation_id: 'NORMALIZED_EVAL_ID',
    timestamp: 'NORMALIZED_TS',
    causal: {
      ...res.causal,
      signal_simulation_id: res.causal.signal_simulation_id ? 'NORMALIZED_SIM_ID' : undefined,
      timestamp: 'NORMALIZED_TS',
    },
    counterfactual: {
      ...res.counterfactual,
      timestamp: 'NORMALIZED_TS',
    },
  };
}

function buildScenarioCdiRequest(scenario: CanonicalScenario): CampaignEvaluationRequest {
  return withScenarioInScope(scenario, () => {
    const projection = scenarioArchetypeProjection(scenario);
    const intent = buildCampaignIntentFromArchetype(projection, {
      discount_pct: scenario.economics.promotion_depth_pct,
      tenant_id: CAMPAIGN_DEMO_TENANT_ID,
      session_id: CAMPAIGN_DEMO_SESSION_ID,
    });
    return {
      tenant_id: CAMPAIGN_DEMO_TENANT_ID,
      session_id: CAMPAIGN_DEMO_SESSION_ID,
      campaign_intent: intent,
      include_signals: true,
    };
  });
}

const CANONICAL_PACKS: readonly { name: string; scenario: CanonicalScenario }[] = [
  { name: 'Fresh Dairy', scenario: CANONICAL_SCENARIO },
  { name: 'Chilled Salmon', scenario: CHILLED_SALMON_SCENARIO },
  { name: 'Premium Bakery', scenario: PREMIUM_BAKERY_SCENARIO },
];

(async () => {
  // ─── A. ZERO DEFAULT ────────────────────────────────────────────────────────

  console.log('\n── A. ZERO DEFAULT ──');

  for (const { name, scenario } of CANONICAL_PACKS) {
    const canonicalCurve = scenarioElasticityCurve(scenario);
    const canonicalRecommended =
      canonicalCurve.find((p) => p.is_cognix_recommended) ?? canonicalCurve[0];
    const cdiReq = buildScenarioCdiRequest(scenario);
    const canonicalCdi = withScenarioInScope(scenario, () => evaluateCampaignDecision(cdiReq));
    const canonicalAuth = await evaluateAuthoritativeScenarioDecision(scenario);

    // 1. Absent assumption (undefined / null)
    const curveUndefined = evaluateCompetitiveDepthCurve(scenario, undefined);
    const curveNull = evaluateCompetitiveDepthCurve(scenario, null);
    assert(
      JSON.stringify(curveUndefined.curve) === JSON.stringify(canonicalCurve),
      `A1 [${name}] No assumption (undefined): scenario depth curve is byte-identical`,
    );
    assert(
      JSON.stringify(curveNull.curve) === JSON.stringify(canonicalCurve),
      `A2 [${name}] No assumption (null): scenario depth curve is byte-identical`,
    );
    assert(
      curveUndefined.recommended_discount_pct === canonicalRecommended.discount_pct &&
        curveUndefined.recommended_contribution_gbp ===
          canonicalRecommended.net_contribution_delta_gbp,
      `A3 [${name}] No assumption: recommended_discount_pct (${curveUndefined.recommended_discount_pct}%) & recommended_contribution_gbp (£${curveUndefined.recommended_contribution_gbp}) unchanged`,
    );

    const depthEvalNoAssumption = evaluateCompetitiveScenarioAtDepth(
      scenario,
      scenario.economics.promotion_depth_pct,
      undefined,
    );
    const expectedUnitsCanonical = Math.round(scenarioExpectedDemandUnits(scenario));
    const exactUnitContribCanonical = scenarioContributionAtDepthGbp(
      scenario,
      scenario.economics.promotion_depth_pct,
    );
    const marginExposureCanonical = scenarioMarginExposureGbp(scenario);
    assert(
      depthEvalNoAssumption.expected_demand_units === expectedUnitsCanonical &&
        depthEvalNoAssumption.exact_unit_contribution_gbp === exactUnitContribCanonical &&
        depthEvalNoAssumption.margin_exposure_gbp === marginExposureCanonical &&
        depthEvalNoAssumption.competitive_response_pp === 0,
      `A4 [${name}] No assumption: expected units (${expectedUnitsCanonical}), exact unit contribution (£${exactUnitContribCanonical}), margin exposure (£${marginExposureCanonical}) unchanged`,
    );

    const cdiNoAssumption = evaluateCompetitiveCdiDecision(scenario, cdiReq, undefined);
    assert(
      JSON.stringify(stripCdiTimestamps(cdiNoAssumption.cdi_response)) ===
        JSON.stringify(stripCdiTimestamps(canonicalCdi)),
      `A5 [${name}] No assumption: CDI-02 response is byte-identical`,
    );

    const authNoAssumption = await evaluateCompetitiveAuthoritativeDecision(scenario, undefined);
    assert(
      JSON.stringify(authNoAssumption) === JSON.stringify(canonicalAuth),
      `A6 [${name}] No assumption: authoritative decision & Frontier evaluation are byte-identical`,
    );

    // 2. γ = 0 with an aggressive competitive price (£1.80)
    const zeroGammaAssumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 1.8,
      competitive_response_pp_per_disadvantage_point: 0,
    });
    assert(
      isZeroCompetitiveAssumption(zeroGammaAssumption) === true,
      `A7 [${name}] isZeroCompetitiveAssumption returns true when γ = 0`,
    );

    const curveZeroGamma = evaluateCompetitiveDepthCurve(scenario, zeroGammaAssumption);
    assert(
      JSON.stringify(curveZeroGamma.curve) === JSON.stringify(canonicalCurve) &&
        curveZeroGamma.recommended_discount_pct === canonicalRecommended.discount_pct &&
        curveZeroGamma.recommended_contribution_gbp ===
          canonicalRecommended.net_contribution_delta_gbp,
      `A8 [${name}] γ = 0: depth curve, recommended depth, and contribution are byte-identical`,
    );

    const depthEvalZeroGamma = evaluateCompetitiveScenarioAtDepth(
      scenario,
      scenario.economics.promotion_depth_pct,
      zeroGammaAssumption,
    );
    assert(
      depthEvalZeroGamma.expected_demand_units === expectedUnitsCanonical &&
        depthEvalZeroGamma.exact_unit_contribution_gbp === exactUnitContribCanonical &&
        depthEvalZeroGamma.total_contribution_gbp ===
          depthEvalNoAssumption.total_contribution_gbp &&
        depthEvalZeroGamma.net_contribution_delta_gbp ===
          depthEvalNoAssumption.net_contribution_delta_gbp &&
        depthEvalZeroGamma.margin_pct === depthEvalNoAssumption.margin_pct &&
        depthEvalZeroGamma.margin_exposure_gbp === marginExposureCanonical &&
        depthEvalZeroGamma.competitive_response_pp === 0,
      `A9 [${name}] γ = 0: expected units, contribution, margin, and margin exposure are byte-identical`,
    );

    const cdiZeroGamma = evaluateCompetitiveCdiDecision(scenario, cdiReq, zeroGammaAssumption);
    assert(
      JSON.stringify(stripCdiTimestamps(cdiZeroGamma.cdi_response)) ===
        JSON.stringify(stripCdiTimestamps(canonicalCdi)),
      `A10 [${name}] γ = 0: CDI-02 response is byte-identical`,
    );

    const authZeroGamma = await evaluateCompetitiveAuthoritativeDecision(
      scenario,
      zeroGammaAssumption,
    );
    assert(
      JSON.stringify(authZeroGamma) === JSON.stringify(canonicalAuth),
      `A11 [${name}] γ = 0: authoritative evaluation and Frontier outputs remain byte-identical`,
    );
  }

  // ─── B. PARITY ──────────────────────────────────────────────────────────────

  console.log('\n── B. PARITY ──');

  {
    // Fresh Dairy: list_price = £2.49, at 20% depth promoted price = £1.99
    const dairyPromotedAt20 = scenarioPromotedPriceAtDepthGbp(CANONICAL_SCENARIO, 20);
    assert(
      dairyPromotedAt20 === 1.99 &&
        dairyPromotedAt20 === scenarioPromotedPriceGbp(CANONICAL_SCENARIO),
      `B1 Fresh Dairy at 20% depth has promotional shelf price £1.99 from authoritative function (got £${dairyPromotedAt20})`,
    );

    const parityAssumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 1.99,
      competitive_response_pp_per_disadvantage_point: 0.85,
    });

    const pos = deriveRelativePricePosition(CANONICAL_SCENARIO, 20, 1.99);
    assert(
      pos.disadvantage_pp === 0 && pos.price_gap_gbp === 0 && pos.standing === 'PARITY',
      'B2 Parity position has disadvantage_pp = 0, price_gap_gbp = 0, standing = PARITY',
    );

    const responsePp = scenarioCompetitiveResponsePp(CANONICAL_SCENARIO, 20, parityAssumption);
    assert(
      responsePp === 0 && !Object.is(responsePp, -0),
      'B3 Parity produces competitive_response_pp = 0 (not -0) for γ > 0',
    );

    // Chilled Salmon: check promoted price at its committed depth
    const salmonCommittedDepth = CHILLED_SALMON_SCENARIO.economics.promotion_depth_pct;
    const salmonPromoted = scenarioPromotedPriceGbp(CHILLED_SALMON_SCENARIO);
    const salmonAssumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: salmonPromoted,
      competitive_response_pp_per_disadvantage_point: 1.2,
    });
    assert(
      scenarioCompetitiveDisadvantagePp(
        CHILLED_SALMON_SCENARIO,
        salmonCommittedDepth,
        salmonPromoted,
      ) === 0 &&
        scenarioCompetitiveResponsePp(
          CHILLED_SALMON_SCENARIO,
          salmonCommittedDepth,
          salmonAssumption,
        ) === 0,
      `B4 Chilled Salmon at ${salmonCommittedDepth}% depth (£${salmonPromoted}) vs £${salmonPromoted} competitive price produces 0 disadvantage and 0 response`,
    );
  }

  // ─── C. DISADVANTAGE ────────────────────────────────────────────────────────

  console.log('\n── C. DISADVANTAGE ──');

  {
    // Fresh Dairy: list_price = £2.49. At 10% depth, our price = round2(2.49 * 0.9) = £2.24.
    // Assumed competitive price = £1.99 (which is 20% below £2.49 list).
    // disadvantage_pp = round2(((2.24 - 1.99) / 2.49) * 100) = round2((0.25 / 2.49) * 100) = +10.04 pp.
    const assumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 1.99,
      competitive_response_pp_per_disadvantage_point: 0.8,
    });

    const pos = deriveRelativePricePosition(CANONICAL_SCENARIO, 10, 1.99);
    assert(
      pos.our_promotional_price_gbp === 2.24 &&
        pos.disadvantage_pp === 10.04 &&
        pos.standing === 'DISADVANTAGE',
      `C1 At 10% depth (£2.24 vs £1.99), disadvantage_pp = +10.04pp and standing = DISADVANTAGE (got ${pos.disadvantage_pp})`,
    );

    const responsePp = scenarioCompetitiveResponsePp(CANONICAL_SCENARIO, 10, assumption);
    assert(
      responsePp === -8.03,
      `C2 With γ = 0.8 and disadvantage_pp = +10.04pp, competitive_response_pp = -8.03pp (got ${responsePp})`,
    );

    const evalWithoutComp = evaluateCompetitiveScenarioAtDepth(CANONICAL_SCENARIO, 10, null);
    const evalWithComp = evaluateCompetitiveScenarioAtDepth(CANONICAL_SCENARIO, 10, assumption);
    assert(
      evalWithComp.competitive_response_pp < 0 &&
        evalWithComp.expected_demand_units < evalWithoutComp.expected_demand_units,
      `C3 Disadvantage reduces expected demand units (${evalWithComp.expected_demand_units} < ${evalWithoutComp.expected_demand_units})`,
    );
  }

  // ─── D. ADVANTAGE & DEMAND FLOOR ────────────────────────────────────────────

  console.log('\n── D. ADVANTAGE & DEMAND FLOOR ──');

  {
    // Fresh Dairy: list_price = £2.49. At 20% depth, our price = £1.99.
    // Assumed competitive price = £2.24 (10% below list).
    // disadvantage_pp = round2(((1.99 - 2.24) / 2.49) * 100) = -10.04 pp.
    const assumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 2.24,
      competitive_response_pp_per_disadvantage_point: 0.8,
    });

    const pos = deriveRelativePricePosition(CANONICAL_SCENARIO, 20, 2.24);
    assert(
      pos.our_promotional_price_gbp === 1.99 &&
        pos.disadvantage_pp === -10.04 &&
        pos.standing === 'ADVANTAGE',
      `D1 At 20% depth (£1.99 vs £2.24), disadvantage_pp = -10.04pp and standing = ADVANTAGE (got ${pos.disadvantage_pp})`,
    );

    const responsePp = scenarioCompetitiveResponsePp(CANONICAL_SCENARIO, 20, assumption);
    assert(
      responsePp === 8.03,
      `D2 Linear symmetry: with γ = 0.8 and disadvantage_pp = -10.04pp, competitive_response_pp = +8.03pp (got ${responsePp})`,
    );

    const evalWithoutComp = evaluateCompetitiveScenarioAtDepth(CANONICAL_SCENARIO, 20, null);
    const evalWithComp = evaluateCompetitiveScenarioAtDepth(CANONICAL_SCENARIO, 20, assumption);
    assert(
      evalWithComp.competitive_response_pp > 0 &&
        evalWithComp.expected_demand_units > evalWithoutComp.expected_demand_units,
      `D3 Cheaper-than-competitor advantage increases expected demand units (${evalWithComp.expected_demand_units} > ${evalWithoutComp.expected_demand_units})`,
    );

    // Verify economic concavity under linear symmetry: deep discounts (e.g. 50%) erode unit margin,
    // so net contribution becomes strongly negative without needing arbitrary commercial caps on demand.
    const evalAt14 = evaluateCompetitiveScenarioAtDepth(CANONICAL_SCENARIO, 14, assumption);
    const evalAt50 = evaluateCompetitiveScenarioAtDepth(CANONICAL_SCENARIO, 50, assumption);
    assert(
      evalAt50.net_contribution_delta_gbp < 0 &&
        evalAt50.net_contribution_delta_gbp < evalAt14.net_contribution_delta_gbp,
      `D4 Margin erosion naturally penalizes excessive depth under linear symmetry (net contribution at 50% £${evalAt50.net_contribution_delta_gbp} < at 14% £${evalAt14.net_contribution_delta_gbp})`,
    );

    // Verify physical demand units floor at 0 under extreme competitive disadvantage
    const extremeAssumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 0.25,
      competitive_response_pp_per_disadvantage_point: 5,
    });
    const extremeEval = evaluateCompetitiveScenarioAtDepth(
      CANONICAL_SCENARIO,
      0,
      extremeAssumption,
    );
    assert(
      extremeEval.expected_demand_units === 0 && extremeEval.ambient_expected_demand_units === 0,
      `D5 Physical demand units floor at 0 under extreme competitive disadvantage (got ${extremeEval.expected_demand_units})`,
    );
  }

  // ─── E. γ IS DISTINCT FROM OWN-PRICE ELASTICITY ────────────────────────────

  console.log('\n── E. γ IS DISTINCT ──');

  {
    const assumptionGamma06 = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 1.99,
      competitive_response_pp_per_disadvantage_point: 0.6,
    });
    const assumptionGamma14 = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 1.99,
      competitive_response_pp_per_disadvantage_point: 1.4,
    });

    // 1. Changing γ does NOT mutate own-price response (`scenarioDepthResponsePp`)
    const evalG06 = evaluateCompetitiveScenarioAtDepth(CANONICAL_SCENARIO, 10, assumptionGamma06);
    const evalG14 = evaluateCompetitiveScenarioAtDepth(CANONICAL_SCENARIO, 10, assumptionGamma14);
    const canonicalOwn10 = scenarioDepthResponsePp(CANONICAL_SCENARIO, 10);

    assert(
      evalG06.own_price_response_pp === canonicalOwn10 &&
        evalG14.own_price_response_pp === canonicalOwn10 &&
        evalG06.competitive_response_pp !== evalG14.competitive_response_pp,
      `E1 Changing γ (0.6 → 1.4) changes competitive_response_pp (${evalG06.competitive_response_pp} → ${evalG14.competitive_response_pp}) while own_price_response_pp remains ${canonicalOwn10}pp`,
    );

    // 2. Changing `promotional_response_pp_per_depth_point` on the scenario does NOT mutate γ or competitive response
    const modifiedOwnPriceScenario: CanonicalScenario = {
      ...CANONICAL_SCENARIO,
      economics: {
        ...CANONICAL_SCENARIO.economics,
        promotional_response_pp_per_depth_point: 3.1,
      },
    };

    const evalOriginalOwn = evaluateCompetitiveScenarioAtDepth(
      CANONICAL_SCENARIO,
      10,
      assumptionGamma06,
    );
    const evalModifiedOwn = evaluateCompetitiveScenarioAtDepth(
      modifiedOwnPriceScenario,
      10,
      assumptionGamma06,
    );

    assert(
      evalOriginalOwn.own_price_response_pp !== evalModifiedOwn.own_price_response_pp &&
        evalOriginalOwn.competitive_response_pp === evalModifiedOwn.competitive_response_pp &&
        assumptionGamma06.competitive_response_pp_per_disadvantage_point === 0.6,
      `E2 Changing promotional_response_pp_per_depth_point (2.4 → 3.1) changes own_price_response_pp (${evalOriginalOwn.own_price_response_pp} → ${evalModifiedOwn.own_price_response_pp}) without mutating γ (0.6) or competitive_response_pp (${evalModifiedOwn.competitive_response_pp}pp)`,
    );
  }

  // ─── F. DETERMINISM ─────────────────────────────────────────────────────────

  console.log('\n── F. DETERMINISM ──');

  {
    const assumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 2.1,
      competitive_response_pp_per_disadvantage_point: 0.95,
    });
    const cdiReq = buildScenarioCdiRequest(CANONICAL_SCENARIO);

    const run1 = {
      pos: deriveRelativePricePosition(CANONICAL_SCENARIO, 14, 2.1),
      resp: scenarioCompetitiveResponsePp(CANONICAL_SCENARIO, 14, assumption),
      decomp: decomposeCompetitiveDemandEffect({
        scenario: CANONICAL_SCENARIO,
        assumption,
        ambient_depth_pct: 0,
        target_depth_pct: 14,
      }),
      match: deriveCompetitiveMatchDepth(CANONICAL_SCENARIO, 2.1),
      curve: evaluateCompetitiveDepthCurve(CANONICAL_SCENARIO, assumption),
      cdi: stripCdiTimestamps(
        evaluateCompetitiveCdiDecision(CANONICAL_SCENARIO, cdiReq, assumption).cdi_response,
      ),
    };

    const run2 = {
      pos: deriveRelativePricePosition(CANONICAL_SCENARIO, 14, 2.1),
      resp: scenarioCompetitiveResponsePp(CANONICAL_SCENARIO, 14, assumption),
      decomp: decomposeCompetitiveDemandEffect({
        scenario: CANONICAL_SCENARIO,
        assumption,
        ambient_depth_pct: 0,
        target_depth_pct: 14,
      }),
      match: deriveCompetitiveMatchDepth(CANONICAL_SCENARIO, 2.1),
      curve: evaluateCompetitiveDepthCurve(CANONICAL_SCENARIO, assumption),
      cdi: stripCdiTimestamps(
        evaluateCompetitiveCdiDecision(CANONICAL_SCENARIO, cdiReq, assumption).cdi_response,
      ),
    };

    assert(
      JSON.stringify(run1) === JSON.stringify(run2),
      'F1 Repeated evaluations with identical (scenario, depth, competitive price, γ) produce byte-identical JSON',
    );
  }

  // ─── G. AMBIENT ATTRIBUTION ─────────────────────────────────────────────────

  console.log('\n── G. AMBIENT VS INTERVENTION ATTRIBUTION ──');

  {
    // Fresh Dairy: list_price = £2.49.
    // Suppose competitor is at £1.99 (20.08% below our £2.49 list price), γ = 1.0.
    // Before our promotion (ambient_depth_pct = 0%, our shelf price = £2.49):
    //   ambient_disadvantage_pp = round2(((2.49 - 1.99) / 2.49) * 100) = +20.08pp
    //   ambient_competitive_effect_pp = -20.08pp (existing headwind, NOT campaign-created).
    // When we promote at 10% depth (our shelf price = £2.24):
    //   target_disadvantage_pp = round2(((2.24 - 1.99) / 2.49) * 100) = +10.04pp
    //   total_target_competitive_effect_pp = -10.04pp
    //   intervention_attributable_competitive_effect_pp = -10.04 - (-20.08) = +10.04pp (recovered headwind).
    const assumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 1.99,
      competitive_response_pp_per_disadvantage_point: 1.0,
    });

    const decomp0To10 = decomposeCompetitiveDemandEffect({
      scenario: CANONICAL_SCENARIO,
      assumption,
      ambient_depth_pct: 0,
      target_depth_pct: 10,
    });

    assert(
      decomp0To10.ambient_competitive_effect_pp === -20.08 &&
        decomp0To10.ambient_driver_class === 'ambient',
      `G1 Ambient competitive effect at 0% depth is -20.08pp with driver_class = "ambient" (got ${decomp0To10.ambient_competitive_effect_pp})`,
    );
    assert(
      decomp0To10.total_target_competitive_effect_pp === -10.04 &&
        decomp0To10.intervention_attributable_competitive_effect_pp === 10.04 &&
        decomp0To10.intervention_driver_class === 'intervention',
      `G2 Moving from 0% to 10% depth produces total = -10.04pp and intervention_attributable = +10.04pp with driver_class = "intervention"`,
    );

    // Holding configuration unchanged (e.g. ambient = 14%, target = 14%):
    // Ambient effect is non-zero (-6.02pp), but intervention-attributable effect MUST be 0!
    const decompHold14 = decomposeCompetitiveDemandEffect({
      scenario: CANONICAL_SCENARIO,
      assumption,
      ambient_depth_pct: 14,
      target_depth_pct: 14,
    });
    assert(
      decompHold14.ambient_competitive_effect_pp === -6.02 &&
        decompHold14.intervention_attributable_competitive_effect_pp === 0 &&
        decompHold14.intervention_attributable_competitive_units_delta === 0,
      `G3 Holding configuration at 14% has ambient effect -6.02pp but intervention_attributable_competitive_effect_pp = 0`,
    );

    // Candidate comparison between 14% current depth and 20% candidate depth (parity):
    const comparison14To20 = evaluateCompetitiveCandidateComparison(
      CANONICAL_SCENARIO,
      assumption,
      { depth_pct: 14 },
      { depth_pct: 20 },
    );
    assert(
      comparison14To20.competitive_decomposition.ambient_competitive_effect_pp === -6.02 &&
        comparison14To20.competitive_decomposition.total_target_competitive_effect_pp === 0 &&
        comparison14To20.competitive_decomposition.intervention_attributable_competitive_effect_pp ===
          6.02,
      `G4 Candidate comparison (14% → 20% match) attributes only +6.02pp competitive recovery to the candidate move`,
    );

    // CDI-02 integration proof: ambient disadvantage adjusts expected_without_intervention,
    // while campaign_delta reflects only the intervention-attributable change.
    const cdiReq = buildScenarioCdiRequest(CANONICAL_SCENARIO);
    const baseCdi = withScenarioInScope(CANONICAL_SCENARIO, () => evaluateCampaignDecision(cdiReq));
    const compCdi = evaluateCompetitiveCdiDecision(CANONICAL_SCENARIO, cdiReq, assumption);

    const expectedAmbientIndex = round2(
      baseCdi.counterfactual.expected_without_intervention.volume_index_pct +
        compCdi.competitive_decomposition.ambient_competitive_effect_pp,
    );
    const expectedAttributablePp = round2(
      baseCdi.causal.intervention_uplift_pp +
        compCdi.competitive_decomposition.intervention_attributable_competitive_effect_pp,
    );

    assert(
      compCdi.cdi_response.counterfactual.expected_without_intervention.volume_index_pct ===
        expectedAmbientIndex,
      `G5 CDI-02 expected_without_intervention absorbs ambient competitive effect (${compCdi.competitive_decomposition.ambient_competitive_effect_pp}pp → index ${expectedAmbientIndex})`,
    );
    assert(
      compCdi.cdi_response.counterfactual.campaign_delta.attributable_uplift_pp ===
        expectedAttributablePp &&
        compCdi.cdi_response.causal.reconciliation_ok === true,
      `G6 CDI-02 campaign_delta absorbs ONLY intervention-attributable competitive effect (+${compCdi.competitive_decomposition.intervention_attributable_competitive_effect_pp}pp → ${expectedAttributablePp}pp), never the ambient level`,
    );
  }

  // ─── H. MATCH DERIVATION ────────────────────────────────────────────────────

  console.log('\n── H. MATCH DERIVATION ──');

  {
    // 1. Match within allowed range: Chilled Salmon list = £5.00, comp = £4.00 → exact 20% depth
    // Let's also test Fresh Dairy (£2.49 list) vs £1.992 → 20% depth, and Chilled Salmon (£5.00 list) vs £4.25 → 15% depth
    const salmonList = CHILLED_SALMON_SCENARIO.economics.list_price_gbp;
    const salmonTargetPrice = round2(salmonList * 0.85);
    const matchSalmon15 = deriveCompetitiveMatchDepth(CHILLED_SALMON_SCENARIO, salmonTargetPrice);
    assert(
      matchSalmon15.status === 'MATCH_WITHIN_ALLOWED_RANGE' &&
        matchSalmon15.is_achievable_within_bounds === true &&
        matchSalmon15.match_depth_pct !== null &&
        matchSalmon15.our_promoted_price_at_clamped_depth_gbp === salmonTargetPrice &&
        matchSalmon15.residual_disadvantage_at_clamped_depth_pp === 0,
      `H1 Chilled Salmon (£${salmonList} list) vs £${salmonTargetPrice} competitive price derives exact MATCH depth (${matchSalmon15.match_depth_pct}%) with 0 residual disadvantage`,
    );

    // 2. Competitor price = list price → PARITY_AT_LIST (0% depth)
    const matchAtList = deriveCompetitiveMatchDepth(
      CANONICAL_SCENARIO,
      CANONICAL_SCENARIO.economics.list_price_gbp,
    );
    assert(
      matchAtList.status === 'PARITY_AT_LIST' &&
        matchAtList.is_achievable_within_bounds === true &&
        matchAtList.raw_required_depth_pct === 0 &&
        matchAtList.match_depth_pct === 0 &&
        matchAtList.clamped_depth_pct === 0 &&
        matchAtList.residual_disadvantage_at_clamped_depth_pp === 0,
      'H2 Competitive price = list price (£2.49) derives PARITY_AT_LIST with match_depth_pct = 0%',
    );

    // 3. Competitor price > list price → COMPETITOR_ABOVE_LIST (raw < 0, match_depth_pct = null, clamped = 0%)
    const matchAboveList = deriveCompetitiveMatchDepth(CANONICAL_SCENARIO, 2.99);
    assert(
      matchAboveList.status === 'COMPETITOR_ABOVE_LIST' &&
        matchAboveList.is_achievable_within_bounds === false &&
        matchAboveList.raw_required_depth_pct < 0 &&
        matchAboveList.match_depth_pct === null &&
        matchAboveList.clamped_depth_pct === 0 &&
        matchAboveList.residual_disadvantage_at_clamped_depth_pp < 0,
      'H3 Competitive price > list price (£2.99 > £2.49) derives COMPETITOR_ABOVE_LIST with match_depth_pct = null and clamped_depth_pct = 0%',
    );

    // 4. Required depth > max allowed depth (60%) → EXCEEDS_MAX_ALLOWED_DEPTH
    // £0.75 vs £2.49 requires 69.88% depth (> 60% max)
    const matchExceedsMax = deriveCompetitiveMatchDepth(CANONICAL_SCENARIO, 0.75);
    assert(
      matchExceedsMax.status === 'EXCEEDS_MAX_ALLOWED_DEPTH' &&
        matchExceedsMax.is_achievable_within_bounds === false &&
        matchExceedsMax.raw_required_depth_pct === 69.88 &&
        matchExceedsMax.match_depth_pct === null &&
        matchExceedsMax.clamped_depth_pct === 60 &&
        matchExceedsMax.our_promoted_price_at_clamped_depth_gbp === 1 &&
        matchExceedsMax.residual_disadvantage_at_clamped_depth_pp === 10.04,
      'H4 Competitive price requiring 69.88% depth (> 60% max) derives EXCEEDS_MAX_ALLOWED_DEPTH with match_depth_pct = null and clamped_depth_pct = 60%',
    );

    // 5. Non-positive competitive price rejected in MATCH
    assertThrows(
      () => deriveCompetitiveMatchDepth(CANONICAL_SCENARIO, 0),
      'H5 deriveCompetitiveMatchDepth rejects competitive price = 0',
      'NON_POSITIVE_COMPETITIVE_PRICE',
    );
    assertThrows(
      () => deriveCompetitiveMatchDepth(CANONICAL_SCENARIO, -2.5),
      'H6 deriveCompetitiveMatchDepth rejects negative competitive price',
      'NON_POSITIVE_COMPETITIVE_PRICE',
    );
  }

  // ─── I. INVALID INPUT & PROVENANCE DISCIPLINE ───────────────────────────────

  console.log('\n── I. INVALID INPUT & PROVENANCE DISCIPLINE ──');

  {
    // 1. Provenance of valid assumption is MODELLED / manual / authoritative
    const validAssumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: 2.1,
      competitive_response_pp_per_disadvantage_point: 0.75,
    });
    assert(
      validAssumption.provenance.origin === 'modelled' &&
        validAssumption.provenance.method === 'manual' &&
        validAssumption.provenance.authority === 'authoritative' &&
        COMPETITIVE_DERIVED_PROVENANCE.origin === 'derived' &&
        COMPETITIVE_DERIVED_PROVENANCE.method === 'rule',
      'I1 Valid assumption carries origin="modelled", method="manual" (human judgement), authority="authoritative"',
    );
    const provenanceDescription = describeCompetitiveAssumptionProvenance(validAssumption);
    assert(
      provenanceDescription.includes('modelled') &&
        provenanceDescription.includes('human judgement'),
      `I2 describeCompetitiveAssumptionProvenance renders canonical human-judgement description: "${provenanceDescription}"`,
    );

    // 2. Non-positive competitive price
    assertThrows(
      () =>
        createCompetitivePriceAssumption({
          assumed_competitive_price_gbp: 0,
          competitive_response_pp_per_disadvantage_point: 0.5,
        }),
      'I3 Rejects assumed_competitive_price_gbp = 0',
      'NON_POSITIVE_COMPETITIVE_PRICE',
    );
    assertThrows(
      () =>
        createCompetitivePriceAssumption({
          assumed_competitive_price_gbp: -1.99,
          competitive_response_pp_per_disadvantage_point: 0.5,
        }),
      'I4 Rejects negative assumed_competitive_price_gbp',
      'NON_POSITIVE_COMPETITIVE_PRICE',
    );

    // 3. Invalid γ (negative)
    assertThrows(
      () =>
        createCompetitivePriceAssumption({
          assumed_competitive_price_gbp: 2.1,
          competitive_response_pp_per_disadvantage_point: -0.1,
        }),
      'I5 Rejects negative γ',
      'NEGATIVE_GAMMA',
    );

    // 4. Non-finite values (NaN, Infinity, -Infinity)
    assertThrows(
      () =>
        createCompetitivePriceAssumption({
          assumed_competitive_price_gbp: Number.NaN,
          competitive_response_pp_per_disadvantage_point: 0.5,
        }),
      'I6 Rejects NaN competitive price',
      'NON_FINITE_COMPETITIVE_PRICE',
    );
    assertThrows(
      () =>
        createCompetitivePriceAssumption({
          assumed_competitive_price_gbp: Number.POSITIVE_INFINITY,
          competitive_response_pp_per_disadvantage_point: 0.5,
        }),
      'I7 Rejects +Infinity competitive price',
      'NON_FINITE_COMPETITIVE_PRICE',
    );
    assertThrows(
      () =>
        createCompetitivePriceAssumption({
          assumed_competitive_price_gbp: 2.1,
          competitive_response_pp_per_disadvantage_point: Number.NaN,
        }),
      'I8 Rejects NaN γ',
      'NON_FINITE_GAMMA',
    );
    assertThrows(
      () =>
        createCompetitivePriceAssumption({
          assumed_competitive_price_gbp: 2.1,
          competitive_response_pp_per_disadvantage_point: Number.POSITIVE_INFINITY,
        }),
      'I9 Rejects +Infinity γ',
      'NON_FINITE_GAMMA',
    );
    assertThrows(
      () => scenarioCompetitiveDisadvantagePp(CANONICAL_SCENARIO, Number.NaN, 2.1),
      'I10 Rejects NaN depthPct in scenarioCompetitiveDisadvantagePp',
      'NON_FINITE_DEPTH',
    );

    // 5. Reject non-MODELLED provenance (observed, attested, stated, derived, drafted)
    for (const forbiddenOrigin of ['observed', 'attested', 'stated', 'derived', 'drafted'] as const) {
      assertThrows(
        () =>
          createCompetitivePriceAssumption({
            assumed_competitive_price_gbp: 2.1,
            competitive_response_pp_per_disadvantage_point: 0.5,
            provenance: {
              origin: forbiddenOrigin,
              method: 'manual',
              authority: 'authoritative',
            },
          }),
        `I11-${forbiddenOrigin} Rejects provenance origin "${forbiddenOrigin}" (must be "modelled")`,
        'INVALID_PROVENANCE_ORIGIN',
      );
    }

    // 6. Reject redundant relative-price or own-price fields on assumption
    assertThrows(
      () =>
        validateCompetitivePriceAssumption({
          assumed_competitive_price_gbp: 2.1,
          competitive_response_pp_per_disadvantage_point: 0.5,
          provenance: COMPETITIVE_ASSUMPTION_PROVENANCE,
          disadvantage_pp: 10,
        }),
      'I12 Rejects redundant stored disadvantage_pp on assumption object',
      'REDUNDANT_OR_FORBIDDEN_FIELD',
    );
    assertThrows(
      () =>
        validateCompetitivePriceAssumption({
          assumed_competitive_price_gbp: 2.1,
          competitive_response_pp_per_disadvantage_point: 0.5,
          provenance: COMPETITIVE_ASSUMPTION_PROVENANCE,
          promotional_response_pp_per_depth_point: 2.4,
        }),
      'I13 Rejects promotional_response_pp_per_depth_point on assumption object',
      'REDUNDANT_OR_FORBIDDEN_FIELD',
    );
  }

  // ─── J. CANONICAL REGRESSION & AUTHORITY BOUNDARIES ─────────────────────────

  console.log('\n── J. CANONICAL REGRESSION & AUTHORITY BOUNDARIES ──');

  {
    const snapshotsBefore = CANONICAL_PACKS.map(({ scenario }) => JSON.stringify(scenario));

    // Run full competitive evaluations across all three canonical packs
    for (const { scenario } of CANONICAL_PACKS) {
      const assumption = createCompetitivePriceAssumption({
        assumed_competitive_price_gbp: round2(scenario.economics.list_price_gbp * 0.82),
        competitive_response_pp_per_disadvantage_point: 0.9,
      });
      const cdiReq = buildScenarioCdiRequest(scenario);
      evaluateCompetitiveDepthCurve(scenario, assumption);
      evaluateCompetitiveCdiDecision(scenario, cdiReq, assumption);
      await evaluateCompetitiveAuthoritativeDecision(scenario, assumption);
    }

    const snapshotsAfter = CANONICAL_PACKS.map(({ scenario }) => JSON.stringify(scenario));
    for (let i = 0; i < CANONICAL_PACKS.length; i++) {
      assert(
        snapshotsBefore[i] === snapshotsAfter[i],
        `J1-${i + 1} [${CANONICAL_PACKS[i].name}] Canonical scenario object and scenario_id (${CANONICAL_PACKS[i].scenario.identity.scenario_id}) are never mutated`,
      );
    }

    // Verify Fresh Dairy, Chilled Salmon, Premium Bakery canonical recommendations with no assumption
    const dairyCurve = scenarioElasticityCurve(CANONICAL_SCENARIO);
    const salmonCurve = scenarioElasticityCurve(CHILLED_SALMON_SCENARIO);
    const bakeryCurve = scenarioElasticityCurve(PREMIUM_BAKERY_SCENARIO);

    const dairyRec = dairyCurve.find((p) => p.is_cognix_recommended)!;
    const salmonRec = salmonCurve.find((p) => p.is_cognix_recommended)!;
    const bakeryRec = bakeryCurve.find((p) => p.is_cognix_recommended)!;

    assert(
      dairyRec.discount_pct === 14 && scenarioPromotedPriceGbp(CANONICAL_SCENARIO) === 1.99,
      `J2 Fresh Dairy canonical outputs unchanged (recommended depth ${dairyRec.discount_pct}%, promoted price £1.99)`,
    );
    assert(
      salmonRec.discount_pct === 10,
      `J3 Chilled Salmon canonical outputs unchanged (recommended depth ${salmonRec.discount_pct}%)`,
    );
    assert(
      bakeryRec.discount_pct === 0,
      `J4 Premium Bakery canonical outputs unchanged (recommended depth ${bakeryRec.discount_pct}% — do not promote)`,
    );

    // Verify SCI-07 unsupported situations still contains Competitor price response
    const hasCompPriceUnsupported = SCENARIO_SITUATIONS_NOT_SUPPORTED.some(
      (s) => s.label.toLowerCase() === 'competitor price response',
    );
    assert(
      hasCompPriceUnsupported === true,
      'J5 SCI-07 SCENARIO_SITUATIONS_NOT_SUPPORTED still lists "Competitor price response" unchanged',
    );
  }

  function round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  // ─── Summary ────────────────────────────────────────────────────────────────

  console.log(`\n══════════════════════════════════════════`);
  console.log(`  COMPETITIVE PRICE RESPONSE DOMAIN TESTS`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`══════════════════════════════════════════\n`);

  if (failed > 0) {
    console.error('Failed assertions:');
    for (const f of failures) {
      console.error(`  - ${f}`);
    }
    process.exit(1);
  }
})();
