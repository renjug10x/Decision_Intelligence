/**
 * `SCI-06` — Observability & Governance Experience.
 * Run via: npx tsx tests/unit/run-sci06-observability-tests.ts
 *
 * REWRITTEN AT THE WAVE-2 CONVERGENCE (2026-09-18), and the reason is the point of the suite.
 *
 * Before convergence these assertions ran against `lib/fixtures/living-evidence-fixtures.ts` —
 * contract-shaped data `SCI-06` authored so it could build while `SCI-05` implemented the engines
 * in the parallel lane. That was the correct thing to do in Wave 2 and it proved something real:
 * that the surface can render the declared shapes. What it could NOT prove is that the estate
 * produces them, because the fixture was the answer and the question at the same time.
 *
 * At Gate C the surface is wired to `SCI-05`'s engines, so every assertion below is made against
 * what the estate genuinely computes for the three certified scenarios. The fixture is gone and
 * `run-wave2-convergence-tests.ts` asserts it cannot come back on a runtime path.
 *
 *  1. Living Evidence for all three certified scenarios, in the EXACT frozen vocabulary
 *  2. Materiality is derived and mixed — and decision relevance is a different question
 *  3. Refresh end to end, per scenario, with determinism and Restart
 *  4. Models & Methods: the four governed mechanism classes, and no provider internals
 *  5. Platform Health reports only what it measures
 *  6. The ACTIVE scenario's own clock, and no stale identity anywhere
 *  7. Contextual Decision Trace, reachable from the decisions it explains
 *  8. Concurrency guards: one implementation owner, and no fixture on a runtime path
 *  9. Responsive CSS at 1440 / 1024 / 720
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  CANONICAL_SCENARIO_ID,
  CHILLED_SALMON_SCENARIO_ID,
  PREMIUM_BAKERY_SCENARIO_ID
} from '../../packages/contracts/src/index';
import {
  PROVENANCE_ORIGINS,
  PROVENANCE_METHODS,
  PROVENANCE_AUTHORITIES
} from '../../packages/contracts/src/provenance-vocabulary';
import {
  MATERIALITY_BAND_THRESHOLDS_PCT,
  assessedEvidenceAt,
  scenarioDecisionPosition,
  refreshScenario,
  previewRefresh,
  restartScenarioEvidence,
  restartAllScenarioEvidence,
  scenarioMethodsRegister,
  currentAsAtMarker
} from '../../lib/living-evidence-engine';

const ROOT = join(__dirname, '..', '..');
let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) { console.log(`[PASS] ${name}`); passed++; }
  else { console.error(`[FAIL] ${name} — ${detail ?? 'assertion failed'}`); failed++; }
}

const read = (...p: string[]) => readFileSync(join(ROOT, ...p), 'utf8');
const stripComments = (code: string) =>
  code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const SCENARIOS = [
  { id: CANONICAL_SCENARIO_ID, label: 'Fresh Dairy' },
  { id: CHILLED_SALMON_SCENARIO_ID, label: 'Chilled Salmon' },
  { id: PREMIUM_BAKERY_SCENARIO_ID, label: 'Premium Bakery' }
] as const;

/*
 * The vocabularies are read OUT OF the frozen declaration rather than restated here. A suite that
 * restates a contract's members can drift from it silently, which is the one thing a vocabulary
 * assertion must not do.
 */
const DECLARATION = read('packages', 'contracts', 'src', 'living-evidence-contracts.ts');
const unionMembers = (typeName: string): string[] => {
  const m = stripComments(DECLARATION).match(new RegExp(`export type ${typeName} =([^;]+);`));
  return m ? (m[1].match(/'([^']+)'/g) ?? []).map(x => x.replace(/'/g, '')) : [];
};
const MATERIALITY_BANDS = unionMembers('MaterialityBand');
const DECISION_CHANGE_KINDS = unionMembers('DecisionChangeKind');

const EVIDENCE_SECTION = read('components', 'observability', 'EvidenceSignalsSection.tsx');
const METHODS_SECTION = read('components', 'observability', 'ModelsMethodsSection.tsx');
const HEALTH_SECTION = read('components', 'observability', 'PlatformHealthSection.tsx');
const TRACE_VIEW = read('components', 'observability', 'DecisionTraceView.tsx');
const TRACE_MODAL = read('components', 'observability', 'DecisionTraceModal.tsx');
const OBSERVABILITY = read('components', 'ObservabilityGovernance.tsx');
const CLIENT = read('lib', 'observability-client.ts');

restartAllScenarioEvidence();

console.log('\n=== 1. LIVING EVIDENCE FOR THREE CERTIFIED SCENARIOS ===============\n');

assert(MATERIALITY_BANDS.length === 4, 'The frozen declaration still names four materiality bands', MATERIALITY_BANDS.join(','));
assert(DECISION_CHANGE_KINDS.length === 4, 'The frozen declaration still names four decision-change kinds', DECISION_CHANGE_KINDS.join(','));

for (const { id, label } of SCENARIOS) {
  const { as_at, observations } = assessedEvidenceAt(id);
  assert(as_at.scenario_id === id, `${label}: the as-at marker names its own scenario`);
  assert(observations.length >= 3, `${label}: carries ${observations.length} assessed observations`);
  assert(
    observations.every(o => o.signal.scenario_id === id),
    `${label}: every observation belongs to this scenario and no other`
  );

  const badBand = observations.find(o => !MATERIALITY_BANDS.includes(o.materiality.band));
  assert(!badBand, `${label}: every materiality band is one the contract declares`, badBand?.materiality.band);

  const badKind = observations.find(o => !DECISION_CHANGE_KINDS.includes(o.decision_relevance.changed));
  assert(!badKind, `${label}: every decision-change kind is one the contract declares`, badKind?.decision_relevance.changed);

  const badProv = observations.find(o =>
    !PROVENANCE_ORIGINS.includes(o.materiality.provenance.origin)
    || !PROVENANCE_METHODS.includes(o.materiality.provenance.method)
    || !PROVENANCE_AUTHORITIES.includes(o.materiality.provenance.authority)
  );
  assert(!badProv, `${label}: every assessment carries the ADR-082 triple and nothing outside it`);

  assert(
    observations.every(o => !!o.signal.source_system && !!o.signal.source_type),
    `${label}: every observation names the system it came from`
  );
  assert(
    observations.every(o => o.age_scenario_days >= 0 && Number.isFinite(o.age_scenario_days)),
    `${label}: freshness is a real reading in scenario days`
  );
  assert(
    observations.every(o => o.materiality.rationale.trim().length > 0 && o.decision_relevance.statement.trim().length > 0),
    `${label}: every assessment says what it means — never a blank`
  );
  assert(
    observations.every(o => o.materiality.movements.every(m => m.delta_pct === null || Number.isFinite(m.delta_pct))),
    `${label}: a movement from zero publishes null, never Infinity`
  );
}

console.log('\n=== 2. MATERIALITY IS DERIVED, RELEVANCE IS A DIFFERENT QUESTION ===\n');

for (const { id, label } of SCENARIOS) {
  const { observations } = assessedEvidenceAt(id);
  const bands = new Set(observations.map(o => o.materiality.band));
  assert(
    bands.has('IMMATERIAL'),
    `${label}: some observation moved nothing, and IMMATERIAL is published as the measured answer`
  );
  assert(
    observations.some(o => o.materiality.band !== 'IMMATERIAL'),
    `${label}: some observation moved a published quantity`
  );
  assert(
    observations.filter(o => o.materiality.band !== 'IMMATERIAL').every(o => o.materiality.movements.length > 0),
    `${label}: no observation is banded above IMMATERIAL without a published movement behind it`
  );
  /*
   * IMMATERIAL is a band over a movement, not the absence of one: an observation may nudge a
   * quantity below the declared NOTABLE threshold and is then correctly immaterial. What must hold
   * is that the band and the arithmetic behind it agree, which is the whole reason ADR-081 part 5
   * makes the thresholds a published constant.
   */
  assert(
    observations.filter(o => o.materiality.band === 'IMMATERIAL').every(o =>
      o.materiality.movements.every(m =>
        (m.delta_pct === null ? 0 : Math.abs(m.delta_pct)) < MATERIALITY_BAND_THRESHOLDS_PCT.NOTABLE)
    ),
    `${label}: nothing banded IMMATERIAL moved a quantity past the declared NOTABLE threshold`
  );
  assert(
    observations.filter(o => o.materiality.band === 'DECISIVE').every(o =>
      o.decision_relevance.changed !== 'NONE'
      || o.materiality.movements.some(m =>
        (m.delta_pct === null ? 0 : Math.abs(m.delta_pct)) >= MATERIALITY_BAND_THRESHOLDS_PCT.DECISIVE)
    ),
    `${label}: nothing is DECISIVE without either a decision change or a movement that earns it`
  );
  const highConfidenceImmaterial = observations.find(o => o.signal.confidence >= 85 && o.materiality.band === 'IMMATERIAL');
  assert(
    !!highConfidenceImmaterial,
    `${label}: a high-confidence observation can still be immaterial — confidence is not relevance`
  );
  assert(
    observations.filter(o => o.decision_relevance.changed === 'NONE')
      .every(o => o.decision_relevance.before_statement === null && o.decision_relevance.after_statement === null),
    `${label}: where no decision changed, no before/after is invented`
  );
}

assert(
  /leave-one-out|without the observation|with it/i.test(EVIDENCE_SECTION),
  'The surface explains that materiality is measured by leaving the observation out'
);
assert(
  EVIDENCE_SECTION.includes('og-badge--decisive') && EVIDENCE_SECTION.includes('og-badge--material')
    && EVIDENCE_SECTION.includes('og-badge--notable') && EVIDENCE_SECTION.includes('og-badge--immaterial'),
  'Evidence & Signals supports all four governed materiality badges'
);
assert(EVIDENCE_SECTION.includes('describeProvenance'), 'Evidence & Signals uses the governed provenance vocabulary');
assert(
  EVIDENCE_SECTION.includes('provenanceFromSignalSourceType'),
  'Evidence & Signals maps a signal onto ADR-082 through the governed mapping, not a local one'
);

console.log('\n=== 3. REFRESH END TO END, PER SCENARIO ============================\n');

for (const { id, label } of SCENARIOS) {
  restartScenarioEvidence(id);

  const before = assessedEvidenceAt(id);
  const preview = previewRefresh(id);
  assert(
    currentAsAtMarker(id).period === before.as_at.period,
    `${label}: previewing the next advance does not move the marker`
  );

  const delta = refreshScenario(id);
  const after = assessedEvidenceAt(id);

  assert(delta.from.period === before.as_at.period, `${label}: the delta opens where the scenario stood`);
  assert(
    after.as_at.period === delta.to.period,
    `${label}: Refresh advanced the marker ${delta.from.period} → ${delta.to.period}`
  );
  assert(
    after.observations.length >= before.observations.length,
    `${label}: evidence after the advance is ${before.observations.length} → ${after.observations.length} observations`
  );
  assert(
    delta.decision_consequence_statement.trim().length > 0,
    `${label}: the advance states its decision consequence`
  );
  const movedOrSaidSo = delta.material_movements.length > 0
    || /unchanged|no published quantity moved|nothing changed/i.test(delta.decision_consequence_statement);
  assert(
    movedOrSaidSo,
    `${label}: either something moved, or the statement says plainly that nothing did`,
    delta.decision_consequence_statement
  );
  assert(
    delta.observations.every(o => o.change === 'NEW' || o.change === 'AGED' || o.change === 'MOVED' || o.change === 'UNCHANGED'),
    `${label}: every observation in the delta is classified changed or unchanged`
  );
  assert(
    delta.decision_changes.every(c => DECISION_CHANGE_KINDS.includes(c.changed)),
    `${label}: every decision change is one the contract declares`
  );
  assert(
    preview.to.period === delta.to.period && preview.material_movements.length === delta.material_movements.length,
    `${label}: the preview told the truth about the advance that followed`
  );

  // Determinism — same scenario, same starting period, same state.
  restartScenarioEvidence(id);
  const again = refreshScenario(id);
  assert(
    JSON.stringify(again) === JSON.stringify(delta),
    `${label}: the same advance from the same opening state is byte-identical`
  );

  // Restart returns the scenario to its OPENING evidence state.
  const reopened = restartScenarioEvidence(id);
  assert(
    reopened.period === reopened.opening_period && reopened.period === before.as_at.period,
    `${label}: Restart returns the scenario to its opening evidence position`
  );
  assert(
    JSON.stringify(assessedEvidenceAt(id)) === JSON.stringify(before),
    `${label}: and the evidence after Restart is the evidence it opened with`
  );
}

assert(
  EVIDENCE_SECTION.includes("'idle'") && EVIDENCE_SECTION.includes("'refreshing'")
    && EVIDENCE_SECTION.includes("'refreshed'") && EVIDENCE_SECTION.includes("'unchanged'")
    && EVIDENCE_SECTION.includes("'failed'"),
  'Evidence & Signals models all five Refresh lifecycle states'
);
assert(
  EVIDENCE_SECTION.includes('og-refresh-panel') && EVIDENCE_SECTION.includes('og-consequence-statement'),
  'Evidence & Signals renders the Refresh panel and its consequence statement'
);
assert(
  /og-btn-restart-evidence/.test(EVIDENCE_SECTION) && /restartScenarioEvidence/.test(EVIDENCE_SECTION),
  'Evidence & Signals offers Restart beside Refresh, so the demonstration is repeatable'
);
assert(
  !/force_changed|force_unchanged|force_fail/.test(CLIENT + EVIDENCE_SECTION),
  'No control can force a Refresh outcome — the delta is whatever the engine returns'
);
assert(
  !/setTimeout\s*\(/.test(stripComments(CLIENT)),
  'The client simulates no latency — a Refresh takes exactly as long as the operation takes'
);

console.log('\n=== 4. MODELS & METHODS, AND PROVIDER INTERNALS ====================\n');

for (const { id, label } of SCENARIOS) {
  const register = scenarioMethodsRegister(id);
  assert(register.scenario_id === id, `${label}: the register names its own scenario`);
  assert(register.entries.length >= 4, `${label}: ${register.entries.length} methods are registered`);
  assert(
    register.entries.every(e => PROVENANCE_METHODS.includes(e.mechanism)),
    `${label}: every mechanism is one the ADR-082 vocabulary declares`
  );
  assert(
    register.entries.every(e => e.implementation_ref.trim().length > 0),
    `${label}: every entry names the file that implements it, so the claim is checkable`
  );
  const serialised = JSON.stringify(register);
  assert(
    !/prompt|token|temperature|api[_-]?key|gemini-\d|gpt-|claude-\d/i.test(serialised),
    `${label}: the published register carries no prompt, token, temperature, key or model id (ADR-067)`
  );

  /*
   * Google GenAI appears only where it genuinely contributes. Where no provider credential is
   * configured it is DECLARED undescribed with its reason, never listed as an active mechanism —
   * the `ATL-FINAL` discipline. Both states are legitimate; reporting the wrong one is not.
   */
  const drafted = register.entries.filter(e => e.mechanism === 'llm');
  const declaredUndescribed = register.undescribed.some(u => /genai/i.test(u.method_id));
  assert(
    (drafted.length > 0) !== declaredUndescribed,
    `${label}: GenAI is either an active mechanism or a declared undescribed one, never both or neither`,
    `llm entries=${drafted.length} undescribed=${declaredUndescribed}`
  );
  assert(
    register.undescribed.every(u => u.reason.trim().length > 0),
    `${label}: an undescribed mechanism says WHY it is undescribed`
  );
}

const cleanMethods = stripComments(METHODS_SECTION);
assert(!/prompt_tokens|completion_tokens|total_tokens/i.test(cleanMethods), 'No token leakage on the Models & Methods surface');
assert(!/temperature\s*[:=]\s*\d/i.test(cleanMethods), 'No temperature parameter on the Models & Methods surface');
assert(!/api[_-]?key/i.test(cleanMethods), 'No API key reference on the Models & Methods surface');
assert(!/gpt-4|claude-3|gemini-1\.5/i.test(cleanMethods), 'No raw model identifier on the Models & Methods surface');
assert(
  METHODS_SECTION.includes('Calculated') && METHODS_SECTION.includes('Fitted')
    && METHODS_SECTION.includes('Drafted') && METHODS_SECTION.includes('Human'),
  'Models & Methods presents the four governed mechanism classes'
);
assert(
  /'rule'/.test(METHODS_SECTION) && /'measured'/.test(METHODS_SECTION) && /'statistical'/.test(METHODS_SECTION)
    && /'llm'/.test(METHODS_SECTION) && /'manual'/.test(METHODS_SECTION),
  '…over the exact ADR-082 method vocabulary, not a second one beside it'
);
assert(
  !/Global method/.test(METHODS_SECTION),
  'An empty applicability list is not reported as "global" — the contract says it applies to none'
);

console.log('\n=== 5. PLATFORM HEALTH REPORTS ONLY WHAT IT MEASURES ===============\n');

assert(HEALTH_SECTION.includes('<AtlasHealth'), 'Platform Health mounts the Atlas record audit');
assert(/unmeasured/i.test(HEALTH_SECTION), 'Platform Health declares unmeasured readings honestly');
assert(
  /ATL-FINAL/.test(HEALTH_SECTION) || /measurable health/.test(HEALTH_SECTION),
  'Platform Health states the ATL-FINAL measurable-only precedent'
);
/*
 * The property is that no unmeasurable reading is REPORTED — not that the words never appear. The
 * surface is entitled to say in prose that it publishes no synthetic error rates, and forbidding
 * the phrase would push that honesty off the page. So the guard looks for a CLAIM: one of these
 * readings carrying a number.
 */
const healthClean = stripComments(HEALTH_SECTION);
assert(
  !/(99\.9|p95|uptime|latency)/i.test(healthClean),
  'Platform Health names no uptime, latency or percentile reading the estate does not measure'
);
assert(
  !/(SLA|error rate|availability|error_rate)[^.]{0,30}\d/i.test(healthClean)
    && !/\d[^.]{0,30}(SLA|error rate|availability)/i.test(healthClean),
  'Platform Health attaches no figure to an SLA, availability or error-rate claim'
);
assert(
  !/<AtlasHealth/.test(OBSERVABILITY),
  'Atlas Health is mounted once, inside Platform Health — never a second hidden copy'
);
assert(
  !/display:\s*'none'/.test(OBSERVABILITY),
  'Nothing on the Observability surface is rendered hidden to satisfy a test'
);

console.log('\n=== 6. THE ACTIVE SCENARIO’S OWN CLOCK, AND NO STALE IDENTITY ====\n');

const clocks = new Map<string, string>();
for (const { id, label } of SCENARIOS) {
  const marker = currentAsAtMarker(id);
  clocks.set(id, marker.period_instant_iso);
  assert(
    /^\d{4}-\d{2}-\d{2}T/.test(marker.period_instant_iso),
    `${label}: publishes a resolved scenario instant`,
    marker.period_instant_iso
  );
}
assert(
  new Set(clocks.values()).size === SCENARIOS.length,
  'The three scenarios each run on their OWN clock, not one shared date',
  [...clocks.values()].join(' | ')
);

const surfaces = OBSERVABILITY + EVIDENCE_SECTION + METHODS_SECTION + HEALTH_SECTION + TRACE_VIEW + TRACE_MODAL + CLIENT;
assert(!surfaces.includes('FreshDirect'), 'No Observability surface names FreshDirect UK');
assert(!surfaces.includes('SCN-PROMO-01'), 'No Observability surface names SCN-PROMO-01');
assert(!/temporal_evidence/.test(surfaces), 'No Observability surface reads the legacy temporal evidence series');
assert(
  !/2026-09-08/.test(surfaces),
  'The Wave-2 fixture clock 2026-09-08 survives nowhere on a surface'
);
assert(
  EVIDENCE_SECTION.includes('scenario_clock') && /as_at/.test(EVIDENCE_SECTION),
  'Evidence & Signals reads the clock off the active scenario’s as-at marker'
);

console.log('\n=== 7. CONTEXTUAL DECISION TRACE ===================================\n');

const PROMOTION = read('components', 'PromotionPlanner.tsx');
const CAMPAIGN = read('components', 'CampaignDecisionCanvas.tsx');

for (const [name, src] of [['Promotion', PROMOTION], ['Campaign Decision', CAMPAIGN]] as [string, string][]) {
  assert(src.includes('DecisionTraceModal'), `${name} mounts the contextual Decision Trace`);
  assert(/isTraceModalOpen/.test(src), `${name} holds the state that opens it`);
  assert(/Decision Trace/.test(src), `${name} offers a discoverable Decision Trace control`);
}
assert(/role="dialog"/.test(TRACE_MODAL) && /aria-modal/.test(TRACE_MODAL) && /Escape/.test(TRACE_MODAL),
  'The Decision Trace is a proper dialog and closes on Escape');

assert(
  /getLivingEvidence/.test(TRACE_VIEW) && /getMethodsRegister/.test(TRACE_VIEW),
  'Decision Trace reads real evidence and the real register'
);
assert(
  /decision_position/.test(TRACE_VIEW),
  'Decision Trace reads the decision the estate holds, rather than stating one of its own'
);
assert(
  /useDecisionState/.test(TRACE_VIEW) && /journey\/events/.test(TRACE_VIEW),
  'Decision Trace reads Shared Decision State and journey telemetry'
);
assert(
  /next_refresh_preview/.test(TRACE_VIEW),
  'Decision Trace shows what a Refresh would change, from the engine’s own preview'
);
assert(
  /describeProvenance/.test(TRACE_VIEW),
  'Decision Trace composes its provenance sentence from the governed vocabulary'
);
assert(
  /refreshState/.test(TRACE_VIEW) && /resetScenario/.test(TRACE_VIEW),
  'Decision Trace keeps the only controls that refresh and reset decision state'
);

console.log('\n=== 8. CONCURRENCY GUARDS AND ONE IMPLEMENTATION OWNER =============\n');

const SURFACE_FILES = [
  'lib/observability-client.ts',
  'components/ObservabilityGovernance.tsx',
  'components/observability/EvidenceSignalsSection.tsx',
  'components/observability/ModelsMethodsSection.tsx',
  'components/observability/PlatformHealthSection.tsx',
  'components/observability/DecisionTraceView.tsx',
  'components/observability/DecisionTraceModal.tsx'
];
for (const rel of SURFACE_FILES) {
  const code = stripComments(read(rel));
  assert(
    !/function\s+(deriveMateriality|deriveDecisionRelevance|refreshScenario|buildMethodsRegister)/.test(code),
    `No SCI-05 engine function is reimplemented in ${rel}`
  );
  assert(
    !/living-evidence-fixtures/.test(code),
    `No Living Evidence fixture is imported by ${rel}`
  );
}
assert(
  existsSync(join(ROOT, 'packages/contracts/src/living-evidence-contracts.ts')),
  'The Living Evidence contracts remain in their single owning module'
);
assert(
  !existsSync(join(ROOT, 'lib/fixtures/living-evidence-fixtures.ts')),
  'The Wave-2 isolation fixture was removed at convergence, not merely bypassed'
);

console.log('\n=== 9. RESPONSIVE CSS AT 1440 / 1024 / 720 =========================\n');

const CSS = read('app', 'globals.css');
for (const cls of ['.og-evidence-signals', '.og-models-methods', '.og-platform-health', '.og-decision-trace', '.og-modal-backdrop']) {
  assert(CSS.includes(cls), `CSS carries ${cls}`);
}
for (const cls of ['.og-refresh-preview', '.og-delta-none', '.og-trace-quantities', '.og-trace-mech']) {
  assert(CSS.includes(cls), `CSS carries the converged element ${cls}`);
}
assert(CSS.includes('@media (max-width: 1024px)'), 'CSS carries the 1024px breakpoint');
assert(CSS.includes('@media (max-width: 720px)'), 'CSS carries the 720px breakpoint');

console.log('\n===================================================================');
console.log(`SCI-06 Observability & Governance: ${passed} PASSED, ${failed} FAILED`);
console.log('===================================================================\n');

if (failed > 0) process.exit(1);
