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
  authoritativeScenarioDecision,
  primeAuthoritativeScenarioDecision,
  resetAuthoritativeDecisionCache
} from '../../lib/canonical-decision-reconciliation';
import {
  ARCH_LAYERS,
  ArchNode,
  type DynamicScenarioContext
} from '../../components/observability/CognixArchitectureSurface';
import { readFileSync } from 'fs';
import { join } from 'path';

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

    /*
     * The reconciliation module is a CARRIER. Before the domain answer has been read it holds
     * nothing, and after it has been read it holds exactly what was read — no rounding of its own,
     * no per-scenario literal, no branch on which scenario it is.
     */
    assert(
      authoritativeScenarioDecision(s.id) === null,
      `${s.label}: the reconciliation carrier holds nothing before the domain evaluation is read`
    );
    primeAuthoritativeScenarioDecision(evaluated);
    const carried = authoritativeScenarioDecision(s.id);
    assert(
      JSON.stringify(carried) === JSON.stringify(evaluated),
      `${s.label}: the reconciliation carrier returns the evaluated decision byte-for-byte`,
      JSON.stringify(carried)
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
    /*
     * Every node below is driven with the decision the DOMAIN EVALUATOR produced, carried in on the
     * inspect context. That is the whole property: the surface RENDERS the authoritative answer, it
     * does not arrive at one. §3 asserts the other half — that it cannot.
     */
    const ctx = {
      scenario,
      methodsRegister: null,
      livingEvidence: null,
      decision: await evaluateAuthoritativeScenarioDecision(s.id)
    } as unknown as DynamicScenarioContext;

    // 1. Decision Gap Inspect Role
    const gapRole = decisionGapNode.resolveScenarioRole(scenario, null, ctx);
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
    const detRole = deterministicNode.resolveScenarioRole(scenario, null, ctx);
    assert(
      detRole.details.includes(`${s.expectedBase.toLocaleString()} units`),
      `${s.label}: Deterministic Engine inspect details display base demand (${s.expectedBase.toLocaleString()} units)`
    );
    assert(
      detRole.details.includes(`${s.expectedDemand.toLocaleString()} units`),
      `${s.label}: Deterministic Engine inspect details display expected demand (${s.expectedDemand.toLocaleString()} units)`
    );

    // 3. Promotion Recommendation Node
    const promoRole = promoNode.resolveScenarioRole(scenario, null, ctx);
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
    const allocRole = allocNode.resolveScenarioRole(scenario, null, ctx);
    assert(
      allocRole.details.includes(`${s.expectedRecovered.toLocaleString()} additional units`),
      `${s.label}: Volume Allocation inspect details display contractual flex recovered volume (${s.expectedRecovered.toLocaleString()} units)`
    );

    // 5. Decision Regret & Financial Exposure Node
    const regretRole = regretNode.resolveScenarioRole(scenario, null, ctx);
    assert(
      regretRole.quantities?.some(q => q.label === 'Revenue at Risk' && q.value.includes(s.expectedRevExposure.toLocaleString())) ?? false,
      `${s.label}: Decision Regret inspect badge shows Revenue at Risk £${s.expectedRevExposure.toLocaleString()}`
    );
    assert(
      regretRole.quantities?.some(q => q.label === 'Margin at Risk' && q.value.includes(s.expectedMarginExposure.toLocaleString())) ?? false,
      `${s.label}: Decision Regret inspect badge shows Margin at Risk £${s.expectedMarginExposure.toLocaleString()}`
    );

    // 6. Decision Window Node
    const winRole = windowNode.resolveScenarioRole(scenario, null, ctx);
    assert(
      winRole.quantities?.some(q => q.label === 'Window Status' && q.value.includes(String(s.expectedWindow))) ?? false,
      `${s.label}: Decision Window inspect badge shows ${s.expectedWindow} hrs (${s.expectedWindowState})`
    );
  }

  // ── 3. THE SURFACE CANNOT PRODUCE AN ECONOMIC QUANTITY OF ITS OWN ─────────
  console.log('\n=== 3. NO SECOND ECONOMIC MODEL ON THE PRESENTATION PATH =========');

  /*
   * An earlier revision of `canonical-decision-reconciliation.ts` computed the quantities itself
   * when the server answer had not arrived, branching on scenario identity and carrying a
   * per-scenario expected demand, window and stability index inline. Those literals agreed with the
   * engines on the day they were written and disagreed with the contract's own closed-form
   * derivation by five units on the reference scenario — two economic models for one scenario,
   * which ADR-073 rule 1 forbids. These are the properties that keep it a carrier.
   */
  const carrierSource = readFileSync(
    join(process.cwd(), 'lib', 'canonical-decision-reconciliation.ts'),
    'utf8'
  ).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  assert(
    !/[0-9]{4,}/.test(carrierSource),
    'The reconciliation carrier holds no economic literal',
    (carrierSource.match(/[0-9]{4,}/g) ?? []).join(', ')
  );
  assert(
    !/SCN-[A-Z]/.test(carrierSource) && !/SCENARIO_ID\b/.test(carrierSource),
    'The reconciliation carrier names no scenario and branches on no scenario identity'
  );
  assert(
    !/[-+*/]\s*100\b|Math\.round|toFixed/.test(carrierSource),
    'The reconciliation carrier performs no arithmetic on a published quantity'
  );

  /*
   * And the surface itself. The property is about EVALUATED quantities, not declared ones: a node
   * may legitimately publish the scenario's contractual list price or its store count, because
   * those are terms of the frozen `SCI-01` record and there is exactly one of them. What it may
   * not do is publish a figure only the domain pipeline can produce when the pipeline has not been
   * read. Asserted per scenario, against that scenario's own evaluated figures.
   */
  resetAuthoritativeDecisionCache();
  const evaluatedNodes = [
    decisionGapNode,
    deterministicNode,
    promoNode,
    allocNode,
    regretNode,
    windowNode,
    findNode('forecast-stability'),
    findNode('human-review-override')
  ];

  for (const s of scenarios) {
    const scenario = resolveScenario(s.id);
    const evaluatedFigures = [
      s.expectedDemand.toLocaleString(),
      s.expectedExposed.toLocaleString(),
      s.expectedRevExposure.toLocaleString(),
      s.expectedMarginExposure.toLocaleString(),
      s.expectedRecovered.toLocaleString(),
      /* Matched as the surface renders it: a bare "40" also occurs inside "ADR-040". */
      `${s.expectedWindow} hrs`,
      s.expectedWindowState
    ];

    for (const node of evaluatedNodes) {
      const role = node.resolveScenarioRole(scenario, null, null);
      const rendered = [role.action, role.details, ...(role.quantities ?? []).map(q => q.value)].join(' | ');
      const leaked = evaluatedFigures.filter(f => rendered.includes(f));
      assert(
        leaked.length === 0,
        `${s.label}: node "${node.name}" publishes no evaluated quantity without an authoritative evaluation`,
        `leaked ${leaked.join(', ')} in ${rendered}`
      );
    }
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
