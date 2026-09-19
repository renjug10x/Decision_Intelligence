/**
 * SCI-09 — Architecture Surface Economic Reconciliation Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Asserts that the Architecture inspect panel dynamic scenario quantities
 * EXACTLY equal the authoritative domain values evaluated by:
 *   - `evaluateDemandDecisionFrontier` (lib/demand-decision-frontier/demand-frontier-engine.ts)
 *   - `evaluateInterventionRecommendation` (lib/demand-decision-frontier/demand-frontier-engine.ts)
 *   - `scenarioElasticityCurve` (lib/campaign-archetypes.ts)
 *
 * Covers:
 *   1. Fresh Dairy (`SCN-FRESH-DAIRY-CHEDDAR-001`) — 130,125 units (NOT 130,130)
 *   2. Chilled Salmon (`SCN-CHILLED-SALMON-002`) — 23,006 units (NOT 23,035)
 *   3. Premium Bakery (`SCN-BAKERY-SOURDOUGH-003`) — 1,380 units (NOT 1,375)
 *
 * Quantities checked:
 *   • base demand
 *   • expected demand
 *   • servable demand
 *   • exposed demand
 *   • Decision Gap
 *   • promotion recommendation
 *   • recovery quantities (flex notice)
 *   • financial exposure (revenue and margin at risk)
 */

import {
  CANONICAL_SCENARIO_ID,
  CHILLED_SALMON_SCENARIO_ID,
  PREMIUM_BAKERY_SCENARIO_ID,
  resolveScenario
} from '../../packages/contracts/src/index';
import {
  evaluateAuthoritativeScenarioDecision,
  AuthoritativeScenarioDecision
} from '../../lib/canonical-decision-evaluator';
import {
  getAuthoritativeScenarioDecision,
  AUTHORITATIVE_CANONICAL_DECISIONS
} from '../../lib/canonical-decision-reconciliation';
import { ARCH_LAYERS, ArchNode } from '../../components/observability/CognixArchitectureSurface';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${name}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name} — ${detail ?? 'assertion failed'}`);
    failed++;
  }
}

const allNodes: ArchNode[] = ARCH_LAYERS.flatMap(l => l.nodes);
const findNode = (id: string) => allNodes.find(n => n.id === id)!;

async function main() {
  console.log('\n==== SCI-09 — ARCHITECTURE SURFACE ECONOMIC RECONCILIATION ====\n');

  const scenarios = [
    {
      id: CANONICAL_SCENARIO_ID,
      label: 'Fresh Dairy',
      expectedBase: 700_000,
      expectedDemand: 900_125,
      expectedServable: 770_000,
      expectedExposed: 130_125,
      staleExposed: 130_130,
      expectedGapPp: '18.6',
      expectedRecPromo: 14,
      expectedCommittedPromo: 20,
      expectedRecovered: 84_000,
      expectedResidual: 46_125,
      expectedRevExposure: 269_359,
      expectedMarginExposure: 80_678,
      expectedWindow: 62,
      expectedWindowState: 'OPEN'
    },
    {
      id: CHILLED_SALMON_SCENARIO_ID,
      label: 'Chilled Salmon',
      expectedBase: 94_080,
      expectedDemand: 118_968,
      expectedServable: 95_962,
      expectedExposed: 23_006,
      staleExposed: 23_035,
      expectedGapPp: '24.5',
      expectedRecPromo: 10,
      expectedCommittedPromo: 10,
      expectedRecovered: 5_645,
      expectedResidual: 17_361,
      expectedRevExposure: 106_518,
      expectedMarginExposure: 23_466,
      expectedWindow: 9,
      expectedWindowState: 'CLOSING_SOON'
    },
    {
      id: PREMIUM_BAKERY_SCENARIO_ID,
      label: 'Premium Bakery',
      expectedBase: 26_040,
      expectedDemand: 28_982,
      expectedServable: 27_602,
      expectedExposed: 1_380,
      staleExposed: 1_375,
      expectedGapPp: '5.3',
      expectedRecPromo: 0,
      expectedCommittedPromo: 10,
      expectedRecovered: 781,
      expectedResidual: 599,
      expectedRevExposure: 1_753,
      expectedMarginExposure: 593,
      expectedWindow: 40,
      expectedWindowState: 'OPEN'
    }
  ];

  // ── 1. AUTHORITATIVE ENGINE EVALUATION RECONCILIATION ─────────────────────
  console.log('=== 1. AUTHORITATIVE DOMAIN ENGINE DERIVATION RECONCILIATION ===');

  for (const s of scenarios) {
    console.log(`\nEvaluating authoritative domain pipeline for ${s.label} (${s.id})…`);
    const evaluated = await evaluateAuthoritativeScenarioDecision(s.id);

    assert(
      evaluated.baseDemand === s.expectedBase,
      `${s.label}: Base demand equals authoritative domain value (${s.expectedBase.toLocaleString()})`,
      `Got ${evaluated.baseDemand}`
    );
    assert(
      evaluated.expectedDemand === s.expectedDemand,
      `${s.label}: Expected demand equals authoritative domain value (${s.expectedDemand.toLocaleString()})`,
      `Got ${evaluated.expectedDemand}`
    );
    assert(
      evaluated.servableDemand === s.expectedServable,
      `${s.label}: Servable demand equals authoritative domain value (${s.expectedServable.toLocaleString()})`,
      `Got ${evaluated.servableDemand}`
    );
    assert(
      evaluated.exposedGap === s.expectedExposed,
      `${s.label}: Exposed demand equals authoritative domain value (${s.expectedExposed.toLocaleString()})`,
      `Got ${evaluated.exposedGap}`
    );
    assert(
      evaluated.exposedGap !== s.staleExposed,
      `${s.label}: Exposed demand is NOT stale display-multiplied ${s.staleExposed.toLocaleString()}`,
      `Got ${evaluated.exposedGap}`
    );
    assert(
      evaluated.gapPct === s.expectedGapPp,
      `${s.label}: Decision Gap pp equals authoritative domain value (${s.expectedGapPp}pp)`,
      `Got ${evaluated.gapPct}`
    );
    assert(
      evaluated.recommendedDepth === s.expectedRecPromo,
      `${s.label}: Recommended promotion depth is ${s.expectedRecPromo}% (certified elasticity recommendation)`,
      `Got ${evaluated.recommendedDepth}%`
    );
    assert(
      evaluated.committedDepth === s.expectedCommittedPromo,
      `${s.label}: Committed promotion depth is ${s.expectedCommittedPromo}%`,
      `Got ${evaluated.committedDepth}%`
    );
    assert(
      evaluated.recoveredUnits === s.expectedRecovered,
      `${s.label}: Intervention recovered volume is ${s.expectedRecovered.toLocaleString()} units`,
      `Got ${evaluated.recoveredUnits}`
    );
    assert(
      evaluated.residualGapUnits === s.expectedResidual,
      `${s.label}: Residual exposure after intervention is ${s.expectedResidual.toLocaleString()} units`,
      `Got ${evaluated.residualGapUnits}`
    );
    assert(
      evaluated.revenueExposureGbp === s.expectedRevExposure,
      `${s.label}: Revenue exposure is £${s.expectedRevExposure.toLocaleString()}`,
      `Got ${evaluated.revenueExposureGbp}`
    );
    assert(
      evaluated.marginExposureGbp === s.expectedMarginExposure,
      `${s.label}: Gross margin exposure is £${s.expectedMarginExposure.toLocaleString()}`,
      `Got ${evaluated.marginExposureGbp}`
    );
    assert(
      evaluated.windowRemainingHours === s.expectedWindow,
      `${s.label}: Decision Window is ${s.expectedWindow} hours`,
      `Got ${evaluated.windowRemainingHours}`
    );
    assert(
      evaluated.windowState === s.expectedWindowState,
      `${s.label}: Decision Window state is ${s.expectedWindowState}`,
      `Got ${evaluated.windowState}`
    );

    // Assert that the canonical decision module matches the evaluated engine result exactly
    const reconciled = getAuthoritativeScenarioDecision(s.id);
    assert(
      reconciled.exposedGap === evaluated.exposedGap &&
      reconciled.expectedDemand === evaluated.expectedDemand &&
      reconciled.baseDemand === evaluated.baseDemand &&
      reconciled.servableDemand === evaluated.servableDemand &&
      reconciled.gapPct === evaluated.gapPct &&
      reconciled.recommendedDepth === evaluated.recommendedDepth &&
      reconciled.recoveredUnits === evaluated.recoveredUnits &&
      reconciled.residualGapUnits === evaluated.residualGapUnits &&
      reconciled.revenueExposureGbp === evaluated.revenueExposureGbp &&
      reconciled.marginExposureGbp === evaluated.marginExposureGbp,
      `${s.label}: getAuthoritativeScenarioDecision matches evaluateAuthoritativeScenarioDecision byte-for-byte`
    );
  }

  // ── 2. ARCHITECTURE SURFACE INSPECT PANEL RECONCILIATION ───────────────────
  console.log('\n=== 2. ARCHITECTURE SURFACE INSPECT PANEL QUANTITY RECONCILIATION ===');

  const decisionGapNode = findNode('decision-gap');
  const deterministicNode = findNode('method-deterministic');
  const promoNode = findNode('retail-promo-recommendation');
  const allocNode = findNode('retail-volume-allocation');
  const regretNode = findNode('decision-regret');
  const windowNode = findNode('decision-window');

  for (const s of scenarios) {
    const scenario = resolveScenario(s.id);

    // 1. Decision Gap Inspect Role
    const gapRole = decisionGapNode.resolveScenarioRole(scenario, null);
    assert(
      gapRole.details.includes(`${s.expectedExposed.toLocaleString()} exposed units`),
      `${s.label}: Decision Gap inspect details display authoritative exposed units (${s.expectedExposed.toLocaleString()})`,
      gapRole.details
    );
    assert(
      !gapRole.details.includes(`${s.staleExposed.toLocaleString()}`),
      `${s.label}: Decision Gap inspect details do NOT contain stale ${s.staleExposed.toLocaleString()}`
    );
    assert(
      gapRole.details.includes(`${s.expectedDemand.toLocaleString()} units`),
      `${s.label}: Decision Gap inspect details display authoritative expected units (${s.expectedDemand.toLocaleString()})`
    );
    assert(
      gapRole.details.includes(`${s.expectedServable.toLocaleString()} units`),
      `${s.label}: Decision Gap inspect details display authoritative servable units (${s.expectedServable.toLocaleString()})`
    );

    const exposedQuantity = gapRole.quantities?.find(q => q.label === 'Exposed Decision Gap');
    assert(
      exposedQuantity !== undefined && exposedQuantity.value.includes(s.expectedExposed.toLocaleString()),
      `${s.label}: Decision Gap badge shows ${s.expectedExposed.toLocaleString()} units (${exposedQuantity?.value})`
    );

    // 2. Deterministic Calculation Node
    const detRole = deterministicNode.resolveScenarioRole(scenario, null);
    assert(
      detRole.details.includes(`${s.expectedBase.toLocaleString()} units`),
      `${s.label}: Deterministic Engine inspect details display base demand (${s.expectedBase.toLocaleString()} units)`
    );
    assert(
      detRole.details.includes(`${s.expectedDemand.toLocaleString()} units`),
      `${s.label}: Deterministic Engine inspect details display expected demand (${s.expectedDemand.toLocaleString()} units)`
    );

    // 3. Promotion Recommendation Node
    const promoRole = promoNode.resolveScenarioRole(scenario, null);
    assert(
      promoRole.action.includes(`${s.expectedRecPromo}%`),
      `${s.label}: Promotion Recommendation action includes certified ${s.expectedRecPromo}%`
    );
    if (s.expectedRecPromo === 0) {
      assert(
        promoRole.details.includes('do not promote'),
        `${s.label}: Promotion Recommendation explicitly notes "do not promote"`
      );
    }

    // 4. Volume Allocation & Recovery Quantities Node
    const allocRole = allocNode.resolveScenarioRole(scenario, null);
    assert(
      allocRole.details.includes(`${s.expectedRecovered.toLocaleString()} additional units`),
      `${s.label}: Volume Allocation inspect details display contractual flex recovered volume (${s.expectedRecovered.toLocaleString()} units)`
    );

    // 5. Decision Regret & Financial Exposure Node
    const regretRole = regretNode.resolveScenarioRole(scenario, null);
    assert(
      regretRole.quantities?.some(q => q.label === 'Revenue at Risk' && q.value.includes(s.expectedRevExposure.toLocaleString())) ?? false,
      `${s.label}: Decision Regret inspect badge shows Revenue at Risk £${s.expectedRevExposure.toLocaleString()}`
    );
    assert(
      regretRole.quantities?.some(q => q.label === 'Margin at Risk' && q.value.includes(s.expectedMarginExposure.toLocaleString())) ?? false,
      `${s.label}: Decision Regret inspect badge shows Margin at Risk £${s.expectedMarginExposure.toLocaleString()}`
    );

    // 6. Decision Window Node
    const winRole = windowNode.resolveScenarioRole(scenario, null);
    assert(
      winRole.quantities?.some(q => q.label === 'Window Status' && q.value.includes(String(s.expectedWindow))) ?? false,
      `${s.label}: Decision Window inspect badge shows ${s.expectedWindow} hrs (${s.expectedWindowState})`
    );
  }

  console.log('\n=================================================================');
  console.log(`Passed: ${passed}   Failed: ${failed}`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
