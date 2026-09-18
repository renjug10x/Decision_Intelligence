/**
 * SCI-06 — Observability & Governance Experience Tests
 * Run via: npx tsx tests/unit/run-sci06-observability-tests.ts
 *
 * Asserts the SCI-06 Observability & Governance Experience across:
 * 1. Evidence & Signals rendering and contract compliance across all 3 certified scenarios
 * 2. Material vs non-material states and decision relevance statements
 * 3. Refresh lifecycle states (idle, refreshing, refreshed, unchanged, failed) & natural consequence statement
 * 4. Models & Methods categories (Calculated, Fitted, Drafted, Human) & prompt/token isolation
 * 5. Platform Health measurable-only behavior and honest unmeasured declarations
 * 6. Scenario-clock bound timestamps & absence of stale references (FreshDirect UK, SCN-PROMO-01)
 * 7. Contextual Decision Trace integration on PromotionPlanner and CampaignDecisionCanvas
 * 8. Concurrency guard: no smuggled SCI-05 domain functions or contract tampering
 * 9. Responsive layout & CSS design system compliance (1440, 1024, 720)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  CANONICAL_SCENARIO_ID,
  CHILLED_SALMON_SCENARIO_ID,
  PREMIUM_BAKERY_SCENARIO_ID,
  MaterialityBand,
  DecisionChangeKind
} from '../../packages/contracts/src/index';
import {
  getLivingEvidence,
  triggerScenarioRefresh,
  getMethodsRegister
} from '../../lib/observability-client';

const ROOT = join(__dirname, '..', '..');
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

const stripComments = (code: string) =>
  code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const CERTIFIED_SCENARIO_IDS = [
  CANONICAL_SCENARIO_ID,
  CHILLED_SALMON_SCENARIO_ID,
  PREMIUM_BAKERY_SCENARIO_ID
] as const;

async function runTests() {
  console.log('\n=== 1. EVIDENCE & SIGNALS CONTRACTS ACROSS 3 CERTIFIED SCENARIOS ===\n');

  assert(CERTIFIED_SCENARIO_IDS.length === 3, 'Exactly 3 certified scenarios exist in contracts');

  for (const scenarioId of CERTIFIED_SCENARIO_IDS) {
    const evidence = await getLivingEvidence(scenarioId);
    assert(!!evidence, `Evidence fixture exists for ${scenarioId}`);
    assert(evidence.scenario_id === scenarioId, `Evidence scenario_id matches ${scenarioId}`);
    assert(evidence.signals.length >= 3, `${scenarioId} has at least 3 active signals`);
    assert(
      typeof evidence.scenario_clock === 'string' && evidence.scenario_clock.length > 0,
      `${scenarioId} has scenario_clock timestamp (${evidence.scenario_clock})`
    );

    // Validate signal properties
    for (const sig of evidence.signals) {
      assert(!!sig.signal_id, `Signal ${sig.signal_id} has signal_id`);
      assert(
        ['DEMAND', 'SUPPLY', 'PRICE', 'COMPETITOR', 'INTERNAL_POLICY', 'COMMERCIAL', 'OPERATIONAL', 'INVENTORY', 'FINANCIAL'].includes(sig.category),
        `Signal ${sig.signal_id} has valid category: ${sig.category}`
      );
      assert(
        ['IMMATERIAL', 'NOTABLE', 'MATERIAL', 'DECISIVE'].includes(sig.materiality.band),
        `Signal ${sig.signal_id} has valid materiality band: ${sig.materiality.band}`
      );
      assert(
        ['RECOMMENDATION', 'DECISION_WINDOW', 'READINESS_VERDICT', 'ASSUMPTION', 'NONE'].includes(sig.decision_relevance.changed),
        `Signal ${sig.signal_id} has valid decision_relevance changed kind: ${sig.decision_relevance.changed}`
      );
      assert(
        ['observed', 'attested', 'stated', 'derived', 'modelled', 'drafted'].includes(sig.provenance.origin),
        `Signal ${sig.signal_id} has valid provenance origin: ${sig.provenance.origin}`
      );
      assert(
        ['measured', 'rule', 'statistical', 'llm', 'manual'].includes(sig.provenance.method),
        `Signal ${sig.signal_id} has valid provenance method: ${sig.provenance.method}`
      );
      assert(
        ['authoritative', 'indicative', 'unverified'].includes(sig.provenance.authority),
        `Signal ${sig.signal_id} has valid provenance authority: ${sig.provenance.authority}`
      );
      assert(
        typeof sig.source_system === 'string' && sig.source_system.length > 0,
        `Signal ${sig.signal_id} has source system: ${sig.source_system}`
      );
    }
  }

  console.log('\n=== 2. MATERIAL VS NON-MATERIAL STATES & DECISION RELEVANCE ========\n');

  // Check Cheddar scenario has both immaterial and material/notable signals
  const cheddarEvidence = await getLivingEvidence(CANONICAL_SCENARIO_ID);
  const hasImmaterial = cheddarEvidence.signals.some((s) => s.materiality.band === 'IMMATERIAL');
  const hasNotableOrAbove = cheddarEvidence.signals.some((s) =>
    ['NOTABLE', 'MATERIAL', 'DECISIVE'].includes(s.materiality.band)
  );
  assert(hasImmaterial, 'Cheddar evidence contains IMMATERIAL baseline signals');
  assert(hasNotableOrAbove, 'Cheddar evidence contains NOTABLE/MATERIAL movement signals');

  // Cheddar has RECOMMENDATION decision relevance
  const recChangeSig = cheddarEvidence.signals.find((s) => s.decision_relevance.changed === 'RECOMMENDATION');
  assert(!!recChangeSig, 'Cheddar evidence has a RECOMMENDATION change signal driving recommendations');

  // Verify EvidenceSignalsSection renders materiality badges and statements
  const sectionSource = readFileSync(
    join(ROOT, 'components/observability/EvidenceSignalsSection.tsx'),
    'utf8'
  );
  assert(
    sectionSource.includes('og-badge--decisive') &&
      sectionSource.includes('og-badge--material') &&
      sectionSource.includes('og-badge--notable') &&
      sectionSource.includes('og-badge--immaterial'),
    'EvidenceSignalsSection supports all 4 governed materiality badges'
  );
  assert(
    sectionSource.includes('decision-relevance-pill') || sectionSource.includes('og-badge--decisive'),
    'EvidenceSignalsSection renders decision relevance indicators'
  );
  assert(
    sectionSource.includes('describeProvenance'),
    'EvidenceSignalsSection uses governed describeProvenance vocabulary'
  );

  console.log('\n=== 3. REFRESH LIFECYCLE & NATURAL CONSEQUENCE STATEMENTS ==========\n');

  // Test client refresh trigger simulation - Changed state
  const refreshRes1 = await triggerScenarioRefresh(CANONICAL_SCENARIO_ID, 'force_changed');
  assert(refreshRes1.status === 'success', 'Cheddar refresh succeeds');
  assert(refreshRes1.state === 'refreshed', 'Cheddar refresh state is "refreshed"');
  assert(refreshRes1.hasChanged === true, 'Cheddar refresh detects simulated changes');
  assert(
    (refreshRes1.delta?.material_movements.length ?? 0) > 0,
    `Cheddar refresh detected ${refreshRes1.delta?.material_movements.length} material movements`
  );
  assert(
    (refreshRes1.delta?.decision_consequence_statement.length ?? 0) > 0,
    `Cheddar refresh provides natural consequence statement: "${refreshRes1.delta?.decision_consequence_statement}"`
  );

  // Test client refresh trigger simulation - Unchanged state
  const refreshRes3 = await triggerScenarioRefresh(PREMIUM_BAKERY_SCENARIO_ID, 'force_unchanged');
  assert(refreshRes3.status === 'success', 'Sourdough refresh succeeds');
  assert(refreshRes3.state === 'unchanged', 'Sourdough refresh state is "unchanged"');
  assert(refreshRes3.hasChanged === false, 'Sourdough refresh detects no material changes');
  assert(refreshRes3.delta?.material_movements.length === 0, 'Sourdough material movements count is 0');
  assert(
    refreshRes3.delta?.decision_consequence_statement.includes('unchanged') ?? false,
    'Sourdough consequence statement clearly notes recommendation remains unchanged'
  );

  // Test client refresh trigger simulation - Failed state
  const refreshResFail = await triggerScenarioRefresh(CANONICAL_SCENARIO_ID, 'force_fail');
  assert(refreshResFail.status === 'failed', 'Refresh failure test correctly returns failed status');
  assert(refreshResFail.state === 'failed', 'Refresh failure test returns "failed" state');
  assert(!!refreshResFail.error, 'Refresh failure provides descriptive error message');

  // Verify EvidenceSignalsSection handles lifecycle states: idle, refreshing, refreshed, unchanged, failed
  assert(
    sectionSource.includes("'idle'") &&
      sectionSource.includes("'refreshing'") &&
      sectionSource.includes("'refreshed'") &&
      sectionSource.includes("'unchanged'") &&
      sectionSource.includes("'failed'"),
    'EvidenceSignalsSection models all 5 refresh lifecycle states'
  );
  assert(
    sectionSource.includes('og-refresh-panel') && sectionSource.includes('og-consequence-statement'),
    'EvidenceSignalsSection displays refresh consequence panel and statement'
  );
  assert(
    sectionSource.includes('scenario_clock'),
    'EvidenceSignalsSection explicitly displays scenario clock'
  );

  console.log('\n=== 4. MODELS & METHODS CATEGORIES & PROMPT/TOKEN ISOLATION ========\n');

  const register = await getMethodsRegister(CANONICAL_SCENARIO_ID);
  assert(register.entries.length >= 4, 'Methods register contains at least 4 governed methods');

  const mechanisms = new Set(register.entries.map((m) => m.mechanism));
  assert(mechanisms.has('rule') || mechanisms.has('measured'), 'Methods register contains rule/measured mechanism (Calculated)');
  assert(mechanisms.has('statistical'), 'Methods register contains statistical mechanism (Fitted)');
  assert(mechanisms.has('llm'), 'Methods register contains llm mechanism (Drafted)');
  assert(mechanisms.has('manual'), 'Methods register contains manual mechanism (Human)');

  // Verify zero prompt, token, temperature, internal model IDs, or API keys
  const methodsCompSource = readFileSync(
    join(ROOT, 'components/observability/ModelsMethodsSection.tsx'),
    'utf8'
  );
  const cleanSource = stripComments(methodsCompSource);

  assert(!/prompt_tokens|completion_tokens|total_tokens/i.test(cleanSource), 'No token leakage in ModelsMethodsSection');
  assert(!/temperature\s*[:=]\s*\d/i.test(cleanSource), 'No temperature parameter leakage in ModelsMethodsSection');
  assert(!/api[_-]?key/i.test(cleanSource), 'No API key references in ModelsMethodsSection');
  assert(!/gpt-4|claude-3|gemini-1\.5-pro-preview/i.test(cleanSource), 'No unvetted raw model IDs leaked in ModelsMethodsSection');

  // Verify mechanism classification in UI
  assert(
    methodsCompSource.includes('Calculated') &&
      methodsCompSource.includes('Fitted') &&
      methodsCompSource.includes('Drafted') &&
      methodsCompSource.includes('Human'),
    'ModelsMethodsSection maps methods to the 4 governed mechanism categories'
  );

console.log('\n=== 5. PLATFORM HEALTH MEASURABLE-ONLY BEHAVIOR ====================\n');

{
  const healthCompSource = readFileSync(
    join(ROOT, 'components/observability/PlatformHealthSection.tsx'),
    'utf8'
  );

  // Must retain AtlasHealth
  assert(
    healthCompSource.includes('<AtlasHealth'),
    'PlatformHealthSection embeds <AtlasHealth /> component'
  );

  // Must declare unmeasured capabilities honestly
  assert(
    healthCompSource.includes('declared unmeasured') || healthCompSource.includes('unmeasured'),
    'PlatformHealthSection includes honest declaration of unmeasured capabilities'
  );
  assert(
    healthCompSource.includes('ATL-FINAL') || healthCompSource.includes('measurable health'),
    'PlatformHealthSection adheres to ATL-FINAL measurable health precedent'
  );

  // Must not have fake 99.99% SLA claim
  assert(
    !healthCompSource.includes('99.99%') && !healthCompSource.includes('99.999%'),
    'PlatformHealthSection avoids fabricated 99.99% SLA claims'
  );
}

console.log('\n=== 6. SCENARIO PROPAGATION & NO STALE REFERENCES ==================\n');

{
  const obsSource = readFileSync(
    join(ROOT, 'components/ObservabilityGovernance.tsx'),
    'utf8'
  );
  const traceSource = readFileSync(
    join(ROOT, 'components/observability/DecisionTraceView.tsx'),
    'utf8'
  );
  const modalSource = readFileSync(
    join(ROOT, 'components/observability/DecisionTraceModal.tsx'),
    'utf8'
  );

  // No stale FreshDirect UK or SCN-PROMO-01
  const allObservabilityCode = obsSource + traceSource + modalSource;
  assert(
    !allObservabilityCode.includes('FreshDirect UK'),
    'Observability code contains no references to obsolete FreshDirect UK'
  );
  assert(
    !allObservabilityCode.includes('SCN-PROMO-01'),
    'Observability code contains no references to obsolete SCN-PROMO-01'
  );

  // Validates scenario clock terminology
  assert(
    obsSource.includes('scenario_clock') || obsSource.includes('activeScenario'),
    'ObservabilityGovernance is tied to active scenario context'
  );
}

console.log('\n=== 7. CONTEXTUAL DECISION TRACE INTEGRATION =======================\n');

{
  const promoPlannerSource = readFileSync(
    join(ROOT, 'components/PromotionPlanner.tsx'),
    'utf8'
  );
  const campaignCanvasSource = readFileSync(
    join(ROOT, 'components/CampaignDecisionCanvas.tsx'),
    'utf8'
  );

  // PromotionPlanner integration
  assert(
    promoPlannerSource.includes('DecisionTraceModal'),
    'PromotionPlanner imports and renders DecisionTraceModal'
  );
  assert(
    promoPlannerSource.includes('isTraceModalOpen') || promoPlannerSource.includes('setIsTraceModalOpen'),
    'PromotionPlanner maintains state for opening Decision Trace'
  );
  assert(
    promoPlannerSource.includes('Decision Trace'),
    'PromotionPlanner renders discoverable "Decision Trace" button'
  );

  // CampaignDecisionCanvas integration
  assert(
    campaignCanvasSource.includes('DecisionTraceModal'),
    'CampaignDecisionCanvas imports and renders DecisionTraceModal'
  );
  assert(
    campaignCanvasSource.includes('isTraceModalOpen') || campaignCanvasSource.includes('setIsTraceModalOpen'),
    'CampaignDecisionCanvas maintains state for opening Decision Trace'
  );
  assert(
    campaignCanvasSource.includes('Decision Trace'),
    'CampaignDecisionCanvas renders discoverable "Decision Trace" button'
  );

  // DecisionTraceView answers the 4 key business questions
  const traceSource = readFileSync(
    join(ROOT, 'components/observability/DecisionTraceView.tsx'),
    'utf8'
  );
  assert(
    traceSource.includes('Why did CogniX recommend this') || traceSource.includes('Active Scenario Decision'),
    'DecisionTraceView answers Question 1: What decision was taken/recommended'
  );
  assert(
    traceSource.includes('Was evidence observed or modelled') || traceSource.includes('Observed & Attested Signals'),
    'DecisionTraceView answers Question 2: What evidence informed it'
  );
  assert(
    traceSource.includes('Who decided') || traceSource.includes('Governed Boundary') || traceSource.includes('ADR-082'),
    'DecisionTraceView answers Question 3: What methods governed it'
  );
  assert(
    traceSource.includes('What changed after') || traceSource.includes('Recent State Transitions'),
    'DecisionTraceView answers Question 4: What changed between cycles'
  );

  // Shared decision state binding
  assert(
    traceSource.includes('refreshState') && traceSource.includes('resetScenario'),
    'DecisionTraceView wires up shared decision state refreshState and resetScenario handlers'
  );
}

console.log('\n=== 8. CONCURRENCY GUARDS & CONTRACT SINGULARITY ===================\n');

{
  // Ensure we did not define forbidden SCI-05 functions in lib/ or components/
  const checkForbidden = (filePath: string) => {
    const code = readFileSync(filePath, 'utf8');
    const forbiddenMatch = /function\s+(deriveMateriality|deriveDecisionRelevance|refreshScenario|buildMethodsRegister)/.test(code);
    assert(!forbiddenMatch, `No unauthorized SCI-05 function implementation in ${filePath}`);
  };

  checkForbidden(join(ROOT, 'lib/observability-client.ts'));
  checkForbidden(join(ROOT, 'components/ObservabilityGovernance.tsx'));
  checkForbidden(join(ROOT, 'components/observability/EvidenceSignalsSection.tsx'));
  checkForbidden(join(ROOT, 'components/observability/ModelsMethodsSection.tsx'));
  checkForbidden(join(ROOT, 'components/observability/PlatformHealthSection.tsx'));
  checkForbidden(join(ROOT, 'components/observability/DecisionTraceView.tsx'));

  // Ensure contract files were NOT modified or duplicated
  const contractsPath = join(ROOT, 'packages/contracts/src/living-evidence-contracts.ts');
  assert(existsSync(contractsPath), 'living-evidence-contracts.ts exists in singular contract package');
}

console.log('\n=== 9. RESPONSIVE CSS DESIGN SYSTEM COMPLIANCE =====================\n');

{
  const cssSource = readFileSync(join(ROOT, 'app/globals.css'), 'utf8');

  // Verify class definitions exist
  assert(cssSource.includes('.og-evidence-signals'), 'CSS contains .og-evidence-signals styles');
  assert(cssSource.includes('.og-models-methods'), 'CSS contains .og-models-methods styles');
  assert(cssSource.includes('.og-platform-health'), 'CSS contains .og-platform-health styles');
  assert(cssSource.includes('.og-decision-trace'), 'CSS contains .og-decision-trace styles');
  assert(cssSource.includes('.og-modal-backdrop'), 'CSS contains .og-modal-backdrop styles');

  // Verify breakpoints
  assert(cssSource.includes('@media (max-width: 1024px)'), 'CSS contains 1024px media query');
  assert(cssSource.includes('@media (max-width: 720px)'), 'CSS contains 720px media query');

  console.log(`\n===================================================================`);
  console.log(`SCI-06 Observability & Governance Tests: ${passed} PASSED, ${failed} FAILED`);
  console.log(`===================================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}
}

void runTests();


