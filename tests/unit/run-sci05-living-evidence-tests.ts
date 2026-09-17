/**
 * `SCI-05` — Living Evidence: Materiality, Decision Relevance & Refresh (`ESF-4`)
 * ───────────────────────────────────────────────────────────────────────────────
 * `signal → material change → decision relevance → observable decision consequence`, asserted.
 *
 * What this suite holds, and what it leaves to its neighbours
 * -----------------------------------------------------------
 * `run-canonical-scenario-tests.ts`  the protected journey's digits
 * `run-sci02-certification-tests.ts` the gate's behaviour as a gate
 * `run-sci03-scenario-pack-tests.ts` `R-27` and the catalogue's own truth
 * `run-sci03r-perspective-tests.ts`  every perspective consuming the ACTIVE scenario
 * this suite                         the three Living Evidence contracts, and `R-30` and `R-36`
 *
 * §7 is the one worth reading twice. Materiality is DERIVED — the quantities are computed twice and
 * compared — and the assertion that matters is not that a band appears but that no scenario record
 * anywhere can set one.
 */

import {
  CANONICAL_SCENARIO_ID,
  CHILLED_SALMON_SCENARIO_ID,
  PREMIUM_BAKERY_SCENARIO_ID,
  CanonicalScenario,
  resolveScenario,
  withScenarioInScope,
  scenarioOpeningDecisionParameters,
  scenarioCommercialIntentPp,
  scenarioCommercialIntentFactor,
  scenarioCommercialIntentDeclaredPp,
  ORDERED_SIMULATION_PERIODS
} from '../../packages/contracts/src/index';
import '../../lib/scenario-runtime';
import {
  scenarioEvidenceTimelines,
  observedEvidenceAt,
  refreshScenario,
  previewRefresh,
  restartScenarioEvidence,
  restartAllScenarioEvidence,
  currentAsAtMarker,
  openingAsAtMarker,
  publishedQuantitiesAt,
  assessSignalMateriality,
  assessDecisionRelevance,
  scenarioMethodsRegister,
  bandFor,
  OPENING_EVIDENCE_PERIOD,
  MATERIALITY_BAND_THRESHOLDS_PCT
} from '../../lib/living-evidence-engine';
import { PROVENANCE_METHODS } from '../../packages/contracts/src/provenance-vocabulary';
import { certifyRegisteredScenarios } from '../../lib/scenario-certification';
import { readFileSync } from 'fs';
import { join } from 'path';

let passed = 0;
let failed = 0;
function assert(condition: boolean, name: string, detail?: string) {
  if (condition) { console.log(`[PASS] ${name}`); passed++; }
  else { console.error(`[FAIL] ${name} — ${detail ?? 'assertion failed'}`); failed++; }
}

const ROOT = join(__dirname, '..', '..');
const IDS = [CANONICAL_SCENARIO_ID, CHILLED_SALMON_SCENARIO_ID, PREMIUM_BAKERY_SCENARIO_ID];
const SCENARIOS: CanonicalScenario[] = IDS.map(id => resolveScenario(id));
const paramsOf = (s: CanonicalScenario) =>
  withScenarioInScope(s, () => scenarioOpeningDecisionParameters(s));

restartAllScenarioEvidence();

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 1. R-30 — a scenario-specific evidence timeline ===============\n');

for (const s of SCENARIOS) {
  const id = s.identity.scenario_id;
  const tl = scenarioEvidenceTimelines(s);

  assert(tl.length > 0, `${id}: has an evidence timeline`);
  assert(
    tl.every(t => t.scenario_id === id),
    `${id}: every timeline is stamped with its OWN scenario identity`
  );
  assert(
    tl.every(t => t.observations.length === ORDERED_SIMULATION_PERIODS.length),
    `${id}: every timeline spans the full declared period range`
  );
  assert(
    tl.every(t => t.observations.every(o => !!o.provenance?.rule_id && !!o.provenance?.generator_version)),
    `${id}: every observation carries provenance naming the rule that produced it`
  );
  assert(tl.every(t => t.synthetic_demo === true), `${id}: evidence is declared synthetic`);

  // Aligned to ITS OWN clock, never civil time.
  const opening = openingAsAtMarker(s);
  assert(
    opening.period_instant_iso.startsWith(s.calendar.observed_history_end_date),
    `${id}: the as-at marker resolves on its OWN scenario clock (${s.calendar.observed_history_end_date})`,
    opening.period_instant_iso
  );
  const todayObs = tl[0].observations.find(o => o.period === 'Today');
  assert(
    !!todayObs && todayObs.observed_at.startsWith(s.calendar.observed_history_end_date),
    `${id}: observations are stamped on the scenario clock, not the wall clock`
  );

  // Deterministic and reproducible.
  assert(
    JSON.stringify(scenarioEvidenceTimelines(s)) === JSON.stringify(tl),
    `${id}: the evidence timeline reproduces BYTE-IDENTICALLY`
  );
}

/*
 * Scenario-SPECIFIC, not one generic series three times. This is what `R-30` turns on: before this
 * packet the salmon and bakery packs shared one timeline of literal lead times belonging to neither.
 */
const signatures = SCENARIOS.map(s =>
  scenarioEvidenceTimelines(s).map(t => t.signal_type).sort().join(',')
);
assert(new Set(signatures).size === 3, 'Three scenarios carry three DIFFERENT evidence timelines', signatures.join(' | '));

for (const s of SCENARIOS) {
  const tl = scenarioEvidenceTimelines(s);
  const suppliers = tl.filter(t => t.entity_type === 'SUPPLIER').map(t => t.entity_id);
  assert(
    suppliers.every(n => n === s.supply.supplier_name),
    `${s.identity.scenario_id}: supplier-entity timelines name its OWN supplier (${s.supply.supplier_name})`,
    suppliers.join(', ')
  );
  // Values derive from the record: the timeline rescales with the scenario, never a fixed ladder.
  const capacity = tl.find(t => t.signal_type === 'SUPPLIER_CAPACITY_PRESSURE');
  if (capacity) {
    const declaredServable = Math.round(
      s.demand.base_demand_units_per_week * s.supply.supplier_capacity_index
    );
    assert(
      Math.abs(capacity.observations[0].baseline_value - declaredServable) <= 1,
      `${s.identity.scenario_id}: capacity evidence baselines on its OWN declared allocation`,
      `${capacity.observations[0].baseline_value} vs ${declaredServable}`
    );
  }
}

/*
 * The legacy world-family series is NOT restored. `SCI-03` retired `temporal_evidence` because two
 * of three certified packs contradicted their family's series in direction as well as scale, and
 * this packet supersedes it with a per-scenario timeline rather than bringing it back.
 */
const scenarioRoute = readFileSync(join(ROOT, 'app/api/v1/scenarios/route.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
assert(
  !/temporal_evidence/.test(scenarioRoute),
  'R-30: the retired legacy temporal_evidence field is NOT restored on the scenario catalogue'
);
const worldServer = readFileSync(join(ROOT, 'services/world/src/server.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
assert(
  !/temporal_evidence/.test(worldServer),
  'R-30: the retired legacy temporal_evidence field is NOT restored on the world service'
);

/* And the literal ladder the simulator used to carry for every non-reference family is gone. */
const simulator = readFileSync(join(ROOT, 'services/world/src/dynamic-signal-simulator.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
assert(
  !/observedDelay\s*=\s*\d+/.test(simulator),
  'R-30: the literal lead-time ladder is gone — evidence amplitudes derive from the record'
);

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 2. R-36 — ONE governed demand attribution source ==============\n');

for (const s of SCENARIOS) {
  const id = s.identity.scenario_id;
  const declared = scenarioCommercialIntentDeclaredPp(s);
  const committed = s.economics.promotion_depth_pct;

  assert(
    scenarioCommercialIntentPp(s, committed) === declared,
    `${id}: at its committed depth the answer IS the declared contribution (${declared}pp)`,
    String(scenarioCommercialIntentPp(s, committed))
  );
  assert(
    scenarioCommercialIntentPp(s, 0) === 0,
    `${id}: a promotion that is not running contributes nothing`
  );
  const shallower = scenarioCommercialIntentPp(s, Math.max(0, committed - 5));
  assert(
    Math.abs(shallower) < Math.abs(declared),
    `${id}: a shallower depth contributes less, scaled by its OWN declared curve`
  );
}

/*
 * The reference scenario is unchanged BY ARITHMETIC, not by exemption. Its declared 19.6pp against
 * its declared −2.0pp trend reproduces the retired generic factor exactly.
 */
const refScenario = resolveScenario(CANONICAL_SCENARIO_ID);
const refFactor = scenarioCommercialIntentFactor(refScenario, refScenario.economics.promotion_depth_pct);
assert(
  refFactor === 1.2,
  'PROTECTED: the reference scenario\'s governed factor is exactly 1.2 — the retired generic value, reproduced',
  String(refFactor)
);

/* The two reconstructions of `1 + depth/100` are gone from both sides of the seam. */
const executable = (p: string) =>
  readFileSync(join(ROOT, p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
for (const p of ['lib/demand-forecast.ts', 'lib/demand-decision-frontier/demand-frontier-engine.ts']) {
  assert(
    !/1\s*\+\s*(params\.)?promo(tion)?(_l|L)ift\s*\/\s*100/.test(executable(p)),
    `${p}: no longer reconstructs commercial intent from promotion depth`
  );
}
assert(
  /inScopeCommercialIntentFactor|scenarioCommercialIntentFactor/.test(executable('lib/demand-forecast.ts'))
    && /inScopeCommercialIntentFactor/.test(executable('lib/demand-decision-frontier/demand-frontier-engine.ts')),
  'Both sides of the seam read the SAME governed attribution function'
);

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 3. REFRESH — deterministic, and honest when nothing changed ===\n');

for (const id of IDS) {
  restartScenarioEvidence(id);
  const first = refreshScenario(id);
  restartScenarioEvidence(id);
  const again = refreshScenario(id);

  assert(
    JSON.stringify(first) === JSON.stringify(again),
    `${id}: the same scenario advanced to the same period produces a BYTE-IDENTICAL delta`
  );
  assert(first.from.period === OPENING_EVIDENCE_PERIOD, `${id}: Refresh advances from the opening period`);
  assert(
    ORDERED_SIMULATION_PERIODS.indexOf(first.to.period) === ORDERED_SIMULATION_PERIODS.indexOf(first.from.period) + 1,
    `${id}: Refresh advances exactly ONE simulation period`
  );
  assert(
    typeof first.decision_consequence_statement === 'string' && first.decision_consequence_statement.length > 0,
    `${id}: the decision-consequence statement is mandatory and non-empty`
  );
  assert(first.observations.length > 0, `${id}: the delta classifies every observation`);
  assert(
    first.observations.every(o => ['NEW', 'AGED', 'MOVED', 'UNCHANGED'].includes(o.change)),
    `${id}: every observation carries a governed change classification`
  );
  assert(first.decision_changes.length > 0, `${id}: the delta answers whether the decision changed`);

  // Advancing twice reaches the third period — the marker is state, not a constant.
  restartScenarioEvidence(id);
  refreshScenario(id);
  const second = refreshScenario(id);
  assert(
    second.from.period === first.to.period,
    `${id}: a second Refresh advances from where the first left the marker`
  );

  // Restart returns the marker to the opening position exactly.
  const restored = restartScenarioEvidence(id);
  assert(restored.period === OPENING_EVIDENCE_PERIOD, `${id}: Restart returns the evidence marker to its opening position`);
  assert(
    currentAsAtMarker(id).period === OPENING_EVIDENCE_PERIOD,
    `${id}: the marker reads as opening after Restart`
  );
  // And the whole delta reproduces after a Restart — the demonstration is repeatable.
  assert(
    JSON.stringify(refreshScenario(id)) === JSON.stringify(first),
    `${id}: after Restart, the same advance reproduces the same delta`
  );
  restartScenarioEvidence(id);
}

/* "No material change" is a valid outcome and is SAID, not left blank. */
{
  restartAllScenarioEvidence();
  const bakery = previewRefresh(PREMIUM_BAKERY_SCENARIO_ID);
  const quiet = bakery.material_movements.length === 0;
  assert(
    !quiet || /no published quantity moved materially|answer, not an absence/.test(bakery.decision_consequence_statement),
    'A Refresh that moved nothing SAYS so rather than leaving the statement blank',
    bakery.decision_consequence_statement
  );
  assert(
    bakery.decision_changes.every(c => c.statement.length > 0),
    'An unchanged decision still carries a statement — silence is not an answer'
  );
}

/* A Refresh at the end of the timeline does not invent an advance. */
{
  const id = CANONICAL_SCENARIO_ID;
  restartScenarioEvidence(id);
  let last = refreshScenario(id);
  for (let i = 0; i < ORDERED_SIMULATION_PERIODS.length + 2; i++) last = refreshScenario(id);
  assert(
    last.from.period === last.to.period && last.material_movements.length === 0,
    'At the end of its timeline a Refresh advances nothing and reports that plainly'
  );
  assert(
    /end of its declared timeline/.test(last.decision_consequence_statement),
    'The exhausted-timeline statement says what happened rather than implying movement'
  );
  restartScenarioEvidence(id);
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 4. MATERIALITY — derived, never authored =======================\n');

for (const s of SCENARIOS) {
  const id = s.identity.scenario_id;
  const params = paramsOf(s);
  const evidence = observedEvidenceAt(s, OPENING_EVIDENCE_PERIOD);
  if (evidence.length === 0) { assert(false, `${id}: has observable evidence at opening`); continue; }

  const m = assessSignalMateriality(s, evidence[evidence.length - 1], evidence, OPENING_EVIDENCE_PERIOD, params);
  assert(
    ['IMMATERIAL', 'NOTABLE', 'MATERIAL', 'DECISIVE'].includes(m.band),
    `${id}: materiality is one of the four governed bands`
  );
  assert(m.rationale.length > 0, `${id}: a band always carries a rationale a reader can act on`);
  assert(
    m.provenance.origin === 'derived' && m.provenance.method === 'rule',
    `${id}: materiality declares itself DERIVED`
  );
  assert(m.assessed_at_period === OPENING_EVIDENCE_PERIOD, `${id}: materiality is stamped on the scenario period it was assessed at`);
  assert(
    m.movements.every(mv => mv.before !== undefined && mv.after !== undefined && mv.unit.length > 0),
    `${id}: every movement carries BOTH endpoints and its unit, so it can be checked against the surface`
  );
  assert(
    m.movements.every(mv => mv.delta_pct === null || Number.isFinite(mv.delta_pct)),
    `${id}: a movement from zero publishes null rather than Infinity`
  );
  assert(
    JSON.stringify(assessSignalMateriality(s, evidence[evidence.length - 1], evidence, OPENING_EVIDENCE_PERIOD, params)) === JSON.stringify(m),
    `${id}: materiality reproduces byte-identically`
  );
}

/* The band is a classification of a published movement, and the thresholds are declared. */
assert(bandFor([], false) === 'IMMATERIAL', 'No movement is IMMATERIAL — a measured answer, not an absence');
assert(
  bandFor([{ quantity: 'EXPECTED_DEMAND_UNITS', display_label: 'x', before: 100, after: 101, delta: 1, delta_pct: 1, unit: 'units' }], false) === 'NOTABLE',
  'A movement above the NOTABLE threshold and below MATERIAL is NOTABLE'
);
assert(
  bandFor([{ quantity: 'EXPECTED_DEMAND_UNITS', display_label: 'x', before: 100, after: 110, delta: 10, delta_pct: 10, unit: 'units' }], false) === 'DECISIVE',
  'A movement above the DECISIVE threshold is DECISIVE'
);
assert(
  bandFor([{ quantity: 'EXPECTED_DEMAND_UNITS', display_label: 'x', before: 100, after: 100.1, delta: 0.1, delta_pct: 0.1, unit: 'units' }], true) === 'DECISIVE',
  'A movement that changed a DECISION is decisive whatever its size'
);
assert(
  MATERIALITY_BAND_THRESHOLDS_PCT.NOTABLE < MATERIALITY_BAND_THRESHOLDS_PCT.MATERIAL
    && MATERIALITY_BAND_THRESHOLDS_PCT.MATERIAL < MATERIALITY_BAND_THRESHOLDS_PCT.DECISIVE,
  'The declared thresholds are ordered, and are published rather than buried in a comparison'
);

/* ADR-072 / ADR-081 part 5: materiality is a BAND, never a third score. */
const engineSource = executable('lib/living-evidence-engine.ts');
assert(
  !/materiality_score|confidence_pct|materiality_pct\s*:/.test(engineSource),
  'No third confidence or materiality SCORE is introduced (ADR-072, ADR-081 part 5)'
);

/* Nothing on a scenario record can set materiality or relevance. */
for (const p of [
  'packages/contracts/src/canonical-scenario-model.ts',
  'packages/contracts/src/scenario-packs/chilled-salmon-import.ts',
  'packages/contracts/src/scenario-packs/premium-bakery-artisan.ts'
]) {
  assert(
    !/materiality|decision_relevance|MaterialityBand/.test(executable(p)),
    `${p}: a scenario record has NO field that could author materiality or relevance`
  );
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 5. DECISION RELEVANCE — derived, and distinct from movement ===\n');

for (const s of SCENARIOS) {
  const id = s.identity.scenario_id;
  const params = paramsOf(s);
  const evidence = observedEvidenceAt(s, OPENING_EVIDENCE_PERIOD);

  const unchanged = assessDecisionRelevance(s, 'self', evidence, evidence, OPENING_EVIDENCE_PERIOD, params);
  assert(unchanged.changed === 'NONE', `${id}: identical evidence changes no decision`);
  assert(
    unchanged.before_statement === null && unchanged.after_statement === null,
    `${id}: an unchanged decision publishes no before/after statement`
  );
  assert(
    unchanged.statement.length > 0 && /unchanged/i.test(unchanged.statement),
    `${id}: "the recommendation is unchanged" is said plainly — an answer, not a blank`
  );
  assert(
    unchanged.provenance.origin === 'derived',
    `${id}: decision relevance declares itself DERIVED`
  );
  assert(
    ['RECOMMENDATION', 'READINESS_VERDICT', 'DECISION_WINDOW', 'NONE'].includes(unchanged.changed),
    `${id}: relevance uses the governed change vocabulary`
  );
}

/*
 * Relevance is NOT confidence. A high-confidence observation that moves nothing is not relevant, and
 * this is the assertion that keeps the two apart.
 */
{
  const s = resolveScenario(CANONICAL_SCENARIO_ID);
  const params = paramsOf(s);
  const evidence = observedEvidenceAt(s, OPENING_EVIDENCE_PERIOD);
  const highConfidence = evidence.filter(e => e.confidence >= 95);
  assert(highConfidence.length > 0, 'The reference scenario carries high-confidence observations to test against');
  const irrelevant = highConfidence.filter(e => {
    const r = assessDecisionRelevance(s, e.signal_id, evidence.filter(x => x.signal_id !== e.signal_id), evidence, OPENING_EVIDENCE_PERIOD, params);
    return r.changed === 'NONE';
  });
  assert(
    irrelevant.length > 0,
    'A high-confidence observation can be decision-IRRELEVANT — confidence is not relevance'
  );
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 6. MODELS & METHODS — only what actually runs ==================\n');

for (const id of IDS) {
  const reg = scenarioMethodsRegister(id);
  assert(reg.scenario_id === id, `${id}: the register is for the scenario it was asked about`);
  assert(reg.entries.length > 0, `${id}: the register has entries`);
  assert(
    reg.entries.every(e => PROVENANCE_METHODS.includes(e.mechanism)),
    `${id}: every mechanism is in the governed ADR-082 vocabulary`
  );
  assert(
    reg.entries.every(e => e.implementation_ref.length > 0),
    `${id}: every entry names the implementation that backs it, so the claim is checkable`
  );
  assert(
    reg.entries.every(e => e.limitations.length > 0),
    `${id}: every entry publishes what it is NOT, so nothing is inferred from silence`
  );
  assert(
    reg.entries.every(e => e.applies_to_scenario_ids.includes(id)),
    `${id}: every entry declares the scenario it applies to`
  );
  // Distinguishes the mechanisms the estate genuinely has.
  const mechanisms = new Set(reg.entries.map(e => e.mechanism));
  assert(
    mechanisms.has('statistical') && mechanisms.has('rule') && mechanisms.has('measured') && mechanisms.has('manual'),
    `${id}: the register distinguishes statistical, rule, measured and manual mechanisms`,
    [...mechanisms].join(', ')
  );
  // ADR-067: nothing that could identify a provider or a prompt.
  const serialised = JSON.stringify(reg).toLowerCase();
  assert(
    !/(prompt|temperature|token|gemini|gpt-|claude-|model_version|api_key)/.test(serialised),
    `${id}: no prompt, token, temperature or model identifier is published (ADR-067)`
  );
  // No fake activity: an entry claiming a run must name a scenario-clock instant, never a wall clock.
  assert(
    reg.entries.every(e => e.last_run_scenario_iso === null || !Number.isNaN(Date.parse(e.last_run_scenario_iso))),
    `${id}: a last-run reading is either a real instant or declared null`
  );
  const llm = reg.entries.filter(e => e.mechanism === 'llm');
  const genAiConfigured = !!process.env.GEMINI_API_KEY;
  assert(
    genAiConfigured ? llm.length > 0 : llm.length === 0 && reg.undescribed.length > 0,
    `${id}: GenAI appears only where it genuinely runs; otherwise it is declared undescribed with a reason`
  );
  assert(
    reg.undescribed.every(u => u.reason.length > 0),
    `${id}: anything the register cannot describe carries its reason`
  );
  assert(
    JSON.stringify(scenarioMethodsRegister(id)) === JSON.stringify(reg),
    `${id}: the register reproduces byte-identically`
  );
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 7. PROTECTED VALUES, CERTIFICATION AND CONTRACT DRIFT ==========\n');

{
  const s = resolveScenario(CANONICAL_SCENARIO_ID);
  const params = paramsOf(s);
  const q = publishedQuantitiesAt(s, OPENING_EVIDENCE_PERIOD, [], params);
  assert(q.EXPECTED_DEMAND_UNITS.value === 900130, 'PROTECTED: the reference scenario\'s declared expected demand is 900,130 with no evidence applied', String(q.EXPECTED_DEMAND_UNITS.value));
  assert(q.SERVABLE_DEMAND_UNITS.value === 770000, 'PROTECTED: declared servable is 770,000', String(q.SERVABLE_DEMAND_UNITS.value));
  assert(q.EXPOSED_DEMAND_UNITS.value === 130130, 'PROTECTED: declared exposed is 130,130', String(q.EXPOSED_DEMAND_UNITS.value));
  assert(q.REVENUE_EXPOSURE_GBP.value === 269369, 'PROTECTED: declared revenue exposure is £269,369', String(q.REVENUE_EXPOSURE_GBP.value));
  assert(q.MARGIN_EXPOSURE_GBP.value === 80681, 'PROTECTED: declared margin exposure is £80,681', String(q.MARGIN_EXPOSURE_GBP.value));
  assert(q.PROMOTION_DEPTH_RESPONSE_PP.value === 44.16, 'PROTECTED: declared depth response at the committed depth is +44.16pp', String(q.PROMOTION_DEPTH_RESPONSE_PP.value));
  assert(Math.round(q.CAMPAIGN_CONTRIBUTION_GBP.value) === -5167, 'PROTECTED: contribution at the committed 20% is −£5,167', String(q.CAMPAIGN_CONTRIBUTION_GBP.value));
}

{
  const results = certifyRegisteredScenarios();
  assert(results.length === 3, `All three scenarios are still certified (${results.length})`);
  for (const r of results) {
    const dims = (r as any).dimensions ?? [];
    const checks = dims.reduce((n: number, d: any) => n + (d.checks?.length ?? 0), 0);
    assert(r.state === 'CERTIFIED', `${r.scenario_id}: still CERTIFIED after Living Evidence`);
    assert(dims.length === 12 && dims.every((d: any) => d.verdict === 'PASS'), `${r.scenario_id}: twelve dimensions still PASS`);
    assert(checks === 84, `${r.scenario_id}: still 84 executed checks`, String(checks));
    const signals = dims.find((d: any) => String(d.dimension_id).startsWith('C-4'));
    assert(!signals || signals.verdict === 'PASS', `${r.scenario_id}: the signals dimension C-4 is green`);
  }
}

/*
 * The three Living Evidence contracts are IMPLEMENTED here, not redefined. A contract changed by its
 * own implementation is the drift ADR-084 part 2 makes a convergence event.
 */
{
  const declaration = readFileSync(join(ROOT, 'packages/contracts/src/living-evidence-contracts.ts'), 'utf8');
  assert(!/\bfunction\b/.test(declaration), 'The Wave-2 declaration still defines no function');
  // A TYPE may be an arrow; an IMPLEMENTATION may not. Same exclusion the Gate-A suite applies.
  assert(
    !/=>/.test(declaration.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^export type .*=>.*$/gm, '')),
    'The Wave-2 declaration still contains no arrow implementation'
  );
  assert(!/\breturn\b/.test(declaration), 'The Wave-2 declaration still returns nothing');
  for (const t of ['SignalMateriality', 'DecisionRelevance', 'RefreshDelta', 'ScenarioAsAtMarker', 'MethodsRegister', 'MaterialityBand']) {
    assert(
      new RegExp(`export (interface|type) ${t}\\b`).test(declaration),
      `${t} is still declared in its owning module, unchanged in location`
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 8. DETERMINISM — no randomness, no civil time ==================\n');

assert(!/Math\.random/.test(engineSource), 'The Living Evidence engine contains no Math.random');
assert(
  !/new Date\(\)/.test(engineSource),
  'The Living Evidence engine reads no wall clock — every instant resolves through the scenario clock'
);
assert(
  !/Math\.random/.test(executable('packages/contracts/src/scenario-demand-attribution.ts')),
  'The governed attribution module contains no randomness'
);

/*
 * Freshness is measured on the SCENARIO clock, so it is identical under any host timezone — the
 * `D-FM-3` precedent, which found a whole seasonal pattern shifted by reading a local weekday.
 */
{
  const id = CANONICAL_SCENARIO_ID;
  const original = process.env.TZ;
  const readings: string[] = [];
  for (const tz of ['UTC', 'America/New_York', 'Asia/Tokyo']) {
    process.env.TZ = tz;
    restartScenarioEvidence(id);
    readings.push(JSON.stringify(refreshScenario(id)));
  }
  process.env.TZ = original;
  restartScenarioEvidence(id);
  assert(
    new Set(readings).size === 1,
    'A Refresh is byte-identical under UTC, America/New_York and Asia/Tokyo (the D-FM-3 precedent)'
  );
}

restartAllScenarioEvidence();

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=================================================================');
console.log(`Passed: ${passed}   Failed: ${failed}`);
console.log('=================================================================\n');
process.exit(failed === 0 ? 0 : 1);
