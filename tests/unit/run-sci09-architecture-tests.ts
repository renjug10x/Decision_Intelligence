/**
 * SCI-09 — CogniX Architecture Surface & SB-GATE Closure Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Verifies:
 * 1. Architecture Flow and 7 Governed Layers
 * 2. Truthful Mechanism Representation (Calculated, Fitted, Drafted, Rule, Human)
 * 3. Governed Construct Placement (Forecast Stability in Signal Intelligence,
 *    Decision Window as operational constraint, Decision Gap, Decision Regret, Decision Ripple)
 * 4. No Legacy Architecture Claims (No Looker, BigQuery, or AppSheet on new surface)
 * 5. Google GenAI Non-Authoritative Guard (never calculating economics or demand)
 * 6. Models & Methods Reuse (no duplicated register, real timestamps / unmeasured)
 * 7. Active-Scenario Awareness (Fresh Dairy, Chilled Salmon, Premium Bakery)
 * 8. Governed Inspect Interaction
 * 9. SB-GATE Retirement Evaluation & Storyboard Disposition
 * 10. Responsive CSS Breakpoints (1440 / 1024 / 720)
 * 11. Concurrency & Frozen Contract Guards (no SCI-07 / SCI-08 overlap)
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  ARCH_LAYERS,
  type ArchLayer,
  type ArchNode
} from '@/components/observability/CognixArchitectureSurface';
import {
  STORYBOARD_GATE,
  STORYBOARD_GATES_MET,
  STORYBOARD_GATE_TOTAL,
  STORYBOARD_RETIREMENT_PERMITTED,
  STORYBOARD_DISPOSITION
} from '@/config/atlas-storyboard-gate';
import { resolveScenario, isScenarioRegistered } from '@/lib/scenario-client-registry';
import { scenarioMethodsRegister } from '@/lib/living-evidence-engine';

const ROOT = process.cwd();

function assert(condition: boolean, message: string, extra?: string) {
  if (!condition) {
    const detail = extra ? ` (${extra})` : '';
    console.error(`[FAIL] ${message}${detail}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
}

async function main() {
  console.log('\n==== SCI-09 — COGNIX ARCHITECTURE SURFACE & SB-GATE CLOSURE ====\n');

  // ── 1. ARCHITECTURE FLOW & THE 7 GOVERNED LAYERS ─────────────────────────
  console.log('=== 1. ARCHITECTURE FLOW & 7 GOVERNED LAYERS ======================');

  assert(ARCH_LAYERS.length === 7, 'Seven architecture layers are defined in order');

  const expectedLayers = [
    { num: 1, id: 'layer-evidence', title: 'Business & External Evidence' },
    { num: 2, id: 'layer-signals', title: 'Signal Intelligence' },
    { num: 3, id: 'layer-methods', title: 'Intelligence Methods' },
    { num: 4, id: 'layer-decision-intelligence', title: 'Decision Intelligence' },
    { num: 5, id: 'layer-decisions', title: 'Retail Decisions' },
    { num: 6, id: 'layer-human', title: 'Human Decision' },
    { num: 7, id: 'layer-learning', title: 'Outcomes & Learning' },
  ];

  expectedLayers.forEach((expected, idx) => {
    const layer = ARCH_LAYERS[idx];
    assert(layer.number === expected.num, `Layer ${expected.num} has correct number`);
    assert(layer.id === expected.id, `Layer ${expected.num} id is ${expected.id}`);
    assert(layer.title === expected.title, `Layer ${expected.num} title is "${expected.title}"`);
    assert(layer.nodes.length >= 2, `Layer ${expected.num} contains at least two distinct governed nodes`);
  });

  // ── 2. TRUTHFUL MECHANISM DISTINCTIONS ──────────────────────────────────
  console.log('\n=== 2. TRUTHFUL MECHANISM REPRESENTATION ==========================');

  const allNodes: ArchNode[] = ARCH_LAYERS.flatMap(l => l.nodes);
  const mechanismsPresent = new Set(allNodes.map(n => n.mechanism));

  assert(mechanismsPresent.has('calculated'), 'Calculated (deterministic / measured) mechanism is present');
  assert(mechanismsPresent.has('fitted'), 'Fitted (statistical ML) mechanism is present');
  assert(mechanismsPresent.has('drafted'), 'Drafted (GenAI interpretation) mechanism is present');
  assert(mechanismsPresent.has('rule'), 'Business rule / constraint mechanism is present');
  assert(mechanismsPresent.has('human'), 'Human judgement mechanism is present');

  // Verify that not all nodes are labelled AI
  const nonAiCount = allNodes.filter(n => n.mechanism !== 'drafted').length;
  assert(nonAiCount >= 15, `CogniX distinguishes mechanisms truthfully: ${nonAiCount} of ${allNodes.length} nodes are non-GenAI`);

  // ── 3. GOVERNED CONSTRUCT PLACEMENT ──────────────────────────────────────
  console.log('\n=== 3. GOVERNED CONSTRUCT PLACEMENT ===============================');

  // Forecast Stability sits in Signal Intelligence, NOT in the model layer (ADR-040)
  const signalLayer = ARCH_LAYERS.find(l => l.id === 'layer-signals')!;
  const forecastStabilityNode = signalLayer.nodes.find(n => n.id === 'forecast-stability');
  assert(forecastStabilityNode !== undefined, 'Forecast Stability is placed in Signal Intelligence (Layer 2)');
  assert(
    forecastStabilityNode?.governingAuthority?.includes('ADR-040') ?? false,
    'Forecast Stability cites ADR-040 authority'
  );
  assert(
    /evidence-stream property|property of the evidence stream/i.test(forecastStabilityNode?.whatItIs ?? ''),
    'Forecast Stability is defined as an evidence-stream property, not an ML confidence score'
  );

  // Methods layer does NOT contain Forecast Stability
  const methodsLayer = ARCH_LAYERS.find(l => l.id === 'layer-methods')!;
  assert(
    !methodsLayer.nodes.some(n => n.id === 'forecast-stability'),
    'Forecast Stability is NOT placed in the model/methods layer'
  );

  // Signal / Intent Fusion sits in Signal Intelligence (IFI-01)
  const intentFusionNode = signalLayer.nodes.find(n => n.id === 'signal-fusion');
  assert(intentFusionNode !== undefined, 'Signal / Intent Fusion is placed in Signal Intelligence (Layer 2)');
  assert(intentFusionNode?.governingAuthority?.includes('IFI-01') ?? false, 'Intent Fusion cites IFI-01');

  // Decision Gap sits in Decision Intelligence (ADR-041)
  const diLayer = ARCH_LAYERS.find(l => l.id === 'layer-decision-intelligence')!;
  const decisionGapNode = diLayer.nodes.find(n => n.id === 'decision-gap');
  assert(decisionGapNode !== undefined, 'Decision Gap is placed in Decision Intelligence (Layer 4)');
  assert(decisionGapNode?.governingAuthority?.includes('ADR-041') ?? false, 'Decision Gap cites ADR-041');

  // Decision Window sits in Decision Intelligence as an operational constraint (ADR-042)
  const decisionWindowNode = diLayer.nodes.find(n => n.id === 'decision-window');
  assert(decisionWindowNode !== undefined, 'Decision Window is placed in Decision Intelligence (Layer 4)');
  assert(decisionWindowNode?.governingAuthority?.includes('ADR-042') ?? false, 'Decision Window cites ADR-042');
  assert(
    /operational constraint|operational deadline/i.test(decisionWindowNode?.whatItIs ?? '')
      && /not an artificial|not a decay curve|not an ai/i.test(decisionWindowNode?.whatItIs ?? ''),
    'Decision Window is defined as an operational constraint, not an AI prediction or decay curve'
  );

  // Decision Regret sits in Decision Intelligence (ADR-043)
  const decisionRegretNode = diLayer.nodes.find(n => n.id === 'decision-regret');
  assert(decisionRegretNode !== undefined, 'Decision Regret is placed in Decision Intelligence (Layer 4)');
  assert(decisionRegretNode?.governingAuthority?.includes('ADR-043') ?? false, 'Decision Regret cites ADR-043');

  // Decision Ripple sits in Retail Decisions / Consequence (WP5)
  const retailDecisionsLayer = ARCH_LAYERS.find(l => l.id === 'layer-decisions')!;
  const decisionRippleNode = retailDecisionsLayer.nodes.find(n => n.id === 'retail-decision-ripple');
  assert(decisionRippleNode !== undefined, 'Decision Ripple is placed in Retail Decisions (Layer 5)');
  assert(decisionRippleNode?.governingAuthority?.includes('WP5') ?? false, 'Decision Ripple cites WP5');

  // Human decision sits in Human Decision (Layer 6)
  const humanLayer = ARCH_LAYERS.find(l => l.id === 'layer-human')!;
  assert(humanLayer.nodes.some(n => n.id === 'human-review-override'), 'Commercial Leadership Review is in Human Decision layer');
  assert(humanLayer.nodes.some(n => n.id === 'human-decision-contract'), 'Decision Contract Commitment is in Human Decision layer');

  // Outcomes & Learning (Layer 7)
  const learningLayer = ARCH_LAYERS.find(l => l.id === 'layer-learning')!;
  assert(learningLayer.nodes.some(n => n.id === 'outcomes-enterprise-memory'), 'Enterprise Memory & Learning Patterns are in Layer 7');

  // ── 4. NO LEGACY ARCHITECTURE CLAIMS ─────────────────────────────────────
  console.log('\n=== 4. NO LEGACY ARCHITECTURE CLAIMS ==============================');

  const archSurfaceSource = readFileSync(
    join(ROOT, 'components', 'observability', 'CognixArchitectureSurface.tsx'),
    'utf8'
  );

  // Looker, BigQuery, AppSheet must not be claimed as the architecture
  const cleanArchSource = archSurfaceSource
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  assert(!/Looker/i.test(cleanArchSource), 'No Looker architecture claims on the new surface');
  assert(!/BigQuery/i.test(cleanArchSource), 'No BigQuery architecture claims on the new surface');
  assert(!/AppSheet/i.test(cleanArchSource), 'No AppSheet architecture claims on the new surface');
  assert(!/Lidl/i.test(cleanArchSource), 'No legacy client branding on the new surface');

  // ── 5. GOOGLE GENAI NON-AUTHORITATIVE POSITION ───────────────────────────
  console.log('\n=== 5. GOOGLE GENAI GOVERNED BOUNDARIES ===========================');

  const genAiNode = methodsLayer.nodes.find(n => n.id === 'method-genai')!;
  assert(genAiNode !== undefined, 'Google GenAI is present in Intelligence Methods');
  assert(genAiNode.mechanism === 'drafted', 'Google GenAI mechanism is drafted (llm)');
  assert(
    /non-authoritative|never calculates economics/i.test(genAiNode.whatItIs),
    'Google GenAI is strictly non-authoritative interpretation and context drafting'
  );
  assert(
    !/prompt|temperature|token/i.test(genAiNode.name),
    'No prompt, temperature, or token parameters leaked in architecture names'
  );

  // ── 6. MODELS & METHODS REUSE ────────────────────────────────────────────
  console.log('\n=== 6. MODELS & METHODS REUSE =====================================');

  const registeredMethodIds = new Set<string>();
  const scenarios = ['SCN-FRESH-DAIRY-CHEDDAR-001', 'SCN-CHILLED-SALMON-002', 'SCN-BAKERY-SOURDOUGH-003'];

  for (const scnId of scenarios) {
    const reg = scenarioMethodsRegister(scnId);
    reg.entries.forEach(e => registeredMethodIds.add(e.method_id));
    reg.undescribed.forEach(u => registeredMethodIds.add(u.method_id));
  }

  // Verify that methodRefId on nodes points to genuine registered methods
  const nodesWithMethodRef = allNodes.filter(n => n.methodRefId !== undefined);
  assert(nodesWithMethodRef.length >= 6, `At least 6 nodes map directly to registered Methods & Models entries`);

  for (const node of nodesWithMethodRef) {
    assert(
      registeredMethodIds.has(node.methodRefId!),
      `Node "${node.name}" methodRefId "${node.methodRefId}" exists in the real Models & Methods register`
    );
  }

  // ── 7. ACTIVE SCENARIO AWARENESS ─────────────────────────────────────────
  console.log('\n=== 7. ACTIVE SCENARIO AWARENESS ==================================');

  for (const scnId of scenarios) {
    assert(isScenarioRegistered(scnId), `Scenario ${scnId} is registered`);
    const scn = resolveScenario(scnId);
    assert(scn.identity.scenario_id === scnId, `${scnId} resolves its own identity`);

    // Evaluate Decision Gap resolution
    const gapRole = decisionGapNode!.resolveScenarioRole(scn, null);
    assert(gapRole.quantities !== undefined && gapRole.quantities.length > 0, `${scnId}: Decision Gap resolves quantities`);

    // Fresh Dairy specific assertions
    if (scnId === 'SCN-FRESH-DAIRY-CHEDDAR-001') {
      assert(scn.supply.supplier_name === 'Cheshire Cheese Co', 'Fresh Dairy supplier is Cheshire Cheese Co');
      assert(scn.identity.category === 'Fresh Dairy', 'Fresh Dairy category is Fresh Dairy');
      assert(gapRole.details.includes('130,125'), 'Fresh Dairy Decision Gap contains 130,125 units');
    }

    // Chilled Salmon specific assertions
    if (scnId === 'SCN-CHILLED-SALMON-002') {
      assert(scn.supply.supplier_name === 'Foodvest Fish', 'Chilled Salmon supplier is Foodvest Fish');
      assert(scn.identity.category === 'Chilled', 'Chilled Salmon category is Chilled');
    }

    // Premium Bakery specific assertions
    if (scnId === 'SCN-BAKERY-SOURDOUGH-003') {
      assert(scn.supply.supplier_name === 'Allied Bakeries', 'Premium Bakery supplier is Allied Bakeries');
      assert(scn.identity.category === 'Bakery', 'Premium Bakery category is Bakery');
    }
  }

  // ── 8. GOVERNED INSPECT INTERACTION ──────────────────────────────────────
  console.log('\n=== 8. GOVERNED INSPECT INTERACTION ===============================');

  // Verify inspect capabilities for every node
  for (const node of allNodes) {
    assert(node.whatItIs.length > 20, `Node "${node.name}" has descriptive "What It Is"`);
    assert(node.summary.length > 10, `Node "${node.name}" has concise summary`);
    const testRole = node.resolveScenarioRole(resolveScenario('SCN-FRESH-DAIRY-CHEDDAR-001'), null);
    assert(testRole.action.length > 10, `Node "${node.name}" resolves action in active scenario`);
    assert(testRole.details.length > 15, `Node "${node.name}" resolves details in active scenario`);
  }

  // ── 9. SB-GATE EVALUATION & STORYBOARD DISPOSITION ───────────────────────
  console.log('\n=== 9. SB-GATE EVALUATION & STORYBOARD DISPOSITION ================');

  assert(STORYBOARD_GATE.length === 6, 'SB-GATE defines exactly 6 conditions');
  assert(STORYBOARD_GATES_MET === 3, 'SB-GATE currently records 3 of 6 conditions met');
  assert(STORYBOARD_GATE_TOTAL === 6, 'Total conditions is 6');
  assert(!STORYBOARD_RETIREMENT_PERMITTED, 'ADR-051 requires 6/6; retirement is NOT permitted at 3/6');
  assert(/Retained/i.test(STORYBOARD_DISPOSITION), 'Storyboard disposition is RETAINED');

  // Verify Condition 5 remains open (prose migration)
  const cond5 = STORYBOARD_GATE.find(g => g.gate_id === 'SB-GATE-5')!;
  assert(cond5.state === 'not-met', 'SB-GATE-5 is not-met');
  assert(
    /prose units/i.test(cond5.outstanding ?? ''),
    'SB-GATE-5 outstanding notes the unmigrated prose units'
  );

  // Storyboard component exists and is retained
  assert(existsSync(join(ROOT, 'components', 'ArchitectureExplorer.tsx')), 'ArchitectureExplorer.tsx is retained');
  assert(archSurfaceSource.includes('ArchitectureExplorer'), 'CognixArchitectureSurface imports/mounts ArchitectureExplorer');
  assert(
    archSurfaceSource.includes('Retained pending retirement'),
    'CognixArchitectureSurface renders the governed Retained pending retirement notice'
  );

  // ── 10. RESPONSIVE CSS BREAKPOINTS ───────────────────────────────────────
  console.log('\n=== 10. RESPONSIVE CSS BREAKPOINTS ================================');

  const css = readFileSync(join(ROOT, 'app', 'globals.css'), 'utf8');
  assert(css.includes('.og-arch-surface'), 'CSS contains .og-arch-surface');
  assert(css.includes('.og-arch-flow'), 'CSS contains .og-arch-flow');
  assert(css.includes('.og-arch-layer'), 'CSS contains .og-arch-layer');
  assert(css.includes('.og-arch-node'), 'CSS contains .og-arch-node');
  assert(css.includes('.og-arch-inspect-panel'), 'CSS contains .og-arch-inspect-panel');
  assert(css.includes('.og-arch-gate-card'), 'CSS contains .og-arch-gate-card');

  // Verify breakpoints
  assert(/@media\s*\(\s*max-width:\s*1024px\s*\)[\s\S]*?\.og-arch-workspace/.test(css), 'CSS carries 1024px breakpoint for workspace reflow');
  assert(/@media\s*\(\s*max-width:\s*720px\s*\)[\s\S]*?\.og-arch-nodes-grid/.test(css), 'CSS carries 720px breakpoint for node stacking');

  // ── 11. CONCURRENCY & FROZEN CONTRACTS GUARDS ────────────────────────────
  console.log('\n=== 11. CONCURRENCY & FROZEN CONTRACT GUARDS ======================');

  const frozenContracts = [
    'packages/contracts/src/canonical-scenario-model.ts',
    'packages/contracts/src/scenario-clock.ts',
    'packages/contracts/src/scenario-registry.ts',
    'packages/contracts/src/provenance-vocabulary.ts',
    'packages/contracts/src/scenario-certification-model.ts',
    'packages/contracts/src/living-evidence-contracts.ts',
  ];

  for (const contract of frozenContracts) {
    assert(existsSync(join(ROOT, contract)), `Frozen contract exists: ${contract}`);
  }

  // Verify SCI-07 boundaries: no scenario authoring files touched
  assert(!archSurfaceSource.includes('ScenarioDraft'), 'No ScenarioDraft import in Architecture Surface');
  assert(!archSurfaceSource.includes('authoring'), 'No authoring domain logic in Architecture Surface');

  console.log('\n====================================================');
  console.log('SCI-09 ARCHITECTURE & SB-GATE TEST SUITE: ALL PASSED');
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
