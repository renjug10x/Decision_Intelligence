/**
 * Wave-2 convergence / Gate-C assertions.
 * Run via: npx tsx tests/unit/run-wave2-convergence-tests.ts
 *
 * These are not packet tests. `SCI-05` and `SCI-06` each carry their own. What this suite asserts
 * is the part of Gate C that belongs to the CONVERGENCE rather than to either lane: that the two
 * were joined deliberately and not merely merged.
 *
 * The specific failure it exists to prevent is the one that makes a converged product LOOK right
 * and be wrong — a presentation lane that keeps rendering its own isolation data after the domain
 * lane has arrived. `SCI-06` legitimately built against
 * `lib/fixtures/living-evidence-fixtures.ts` in Wave 2, and that fixture carried a clock no
 * scenario runs on and demand quantities `R-38` had already corrected. A convergence that left it
 * on a runtime path would publish authored numbers beside measured ones with nothing on the screen
 * to tell them apart, and every test in the estate would still pass.
 *
 *  A. No production or runtime path depends on a Living Evidence fixture
 *  B. Every Gate-A frozen contract is byte-identical to the declared Wave-2 base
 *  C. One module implements Living Evidence, and the surface reimplements no part of it
 *  D. Each scenario runs on its OWN clock, and the fixture clock survives nowhere
 *  E. No surface branches on a scenario identity
 *  F. The protected Fresh Dairy journey, re-measured from the convergence state
 *  G. `R-41` is a recorded residual inside the governed tolerance, not a retuned number
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  CANONICAL_SCENARIO_ID,
  CHILLED_SALMON_SCENARIO_ID,
  PREMIUM_BAKERY_SCENARIO_ID,
  CanonicalScenario,
  resolveScenario,
  withScenarioInScope,
  scenarioOpeningDecisionParameters,
  calculateDerivedImpacts
} from '../../packages/contracts/src/index';
import '../../lib/scenario-runtime';
import {
  currentAsAtMarker,
  restartAllScenarioEvidence,
  restartScenarioEvidence,
  refreshScenario,
  scenarioDecisionPosition
} from '../../lib/living-evidence-engine';
import { projectDemand, isDemandRefusal } from '../../lib/demand-forecast';
import {
  evaluateDemandDecisionFrontier,
  evaluateInterventionRecommendation
} from '../../lib/demand-decision-frontier/demand-frontier-engine';
import { deriveOutlookContributors } from '../../lib/demand-decision-language';
import { generateSyntheticSignalSnapshot } from '../../services/world/src/enterprise-signal-generator';

const ROOT = join(__dirname, '..', '..');
let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) { console.log(`[PASS] ${name}`); passed++; }
  else { console.error(`[FAIL] ${name} — ${detail ?? 'assertion failed'}`); failed++; }
}

const stripComments = (code: string) =>
  code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Every `.ts`/`.tsx` the application SHIPS — the estate minus its test harness. */
function runtimeFiles(dir: string, acc: string[] = []): string[] {
  const full = join(ROOT, dir);
  if (!existsSync(full)) return acc;
  for (const entry of readdirSync(full)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.next' || entry.startsWith('.')) continue;
    const rel = `${dir}/${entry}`;
    if (statSync(join(ROOT, rel)).isDirectory()) runtimeFiles(rel, acc);
    else if (/\.tsx?$/.test(entry)) acc.push(rel);
  }
  return acc;
}

const RUNTIME_DIRS = ['app', 'components', 'lib', 'packages/contracts/src', 'services', 'context', 'utils'];
const RUNTIME = RUNTIME_DIRS.flatMap(d => runtimeFiles(d));
const codeOf = (rel: string) => stripComments(readFileSync(join(ROOT, rel), 'utf8'));

(async () => {

console.log('\n=== A. NO RUNTIME PATH DEPENDS ON A LIVING EVIDENCE FIXTURE ========\n');

assert(RUNTIME.length > 100, `The runtime estate is ${RUNTIME.length} files, so the guard has something to scan`);

assert(
  !existsSync(join(ROOT, 'lib/fixtures/living-evidence-fixtures.ts')),
  'The Wave-2 isolation fixture is gone from the tree, not merely unreferenced'
);

const fixtureImporters = RUNTIME.filter(rel => /living-evidence-fixtures|getLivingEvidenceFixture/.test(codeOf(rel)));
assert(
  fixtureImporters.length === 0,
  'No runtime file imports a Living Evidence fixture',
  fixtureImporters.join(', ')
);

/*
 * A fallback is the dangerous shape, not an import: a path that reaches for authored data when the
 * governed one fails publishes fiction exactly when a reader most needs to be told something is
 * wrong. The client must carry no `catch` that answers with data.
 */
const client = codeOf('lib/observability-client.ts');
assert(
  !/fixture|FIXTURE|fallback|Fallback/.test(client),
  'The Observability client names no fixture and no fallback'
);
assert(
  /fetch\(/.test(client) && /\/api\/v1\/evidence/.test(client) && /\/api\/v1\/methods/.test(client),
  'The Observability client reads Living Evidence and the register from the governed routes'
);
assert(
  /\/api\/v1\/evidence\/refresh/.test(client) && /\/api\/v1\/evidence\/restart/.test(client),
  'Refresh and Restart go to the governed operations, not to a local simulation'
);
assert(
  !/setTimeout|Math\.random/.test(client),
  'The client manufactures neither latency nor variation'
);

/*
 * And nothing on the Observability surface may author a materiality band, a decision-change kind or
 * a consequence statement as a literal. Those are answers, and the estate has exactly one place
 * that produces them.
 */
const SURFACES = RUNTIME.filter(rel => /^components\/(observability\/|ObservabilityGovernance)/.test(rel));
assert(SURFACES.length >= 6, `The Observability surface is ${SURFACES.length} files`);
for (const rel of SURFACES) {
  const code = codeOf(rel);
  assert(
    !/(band|materiality)\s*[:=]\s*'(IMMATERIAL|NOTABLE|MATERIAL|DECISIVE)'/.test(code),
    `No materiality band is authored in ${rel}`
  );
  assert(
    !/decision_consequence_statement\s*[:=]\s*['"`]/.test(code),
    `No consequence statement is authored in ${rel}`
  );
}

console.log('\n=== B. FROZEN CONTRACTS ARE BYTE-IDENTICAL TO THE WAVE-2 BASE ======\n');

/*
 * The blob hashes these six files carry at `cacbb5b364ad6dcab841f7e8bb96557a44054a49`, the declared
 * Wave-2 base that carries SHA-B. Hashed here the way git hashes a blob, so the property is
 * asserted from the file's bytes rather than from a repository the suite happens to run inside.
 */
const FROZEN_AT_BASE: Record<string, string> = {
  'packages/contracts/src/canonical-scenario-model.ts': 'a56c56ab1dcd05b41f1345c163c2b9d249be402f',
  'packages/contracts/src/scenario-clock.ts': '8e68e22c0e72ad8456f8c15b4d379bb860845f6a',
  'packages/contracts/src/scenario-registry.ts': '986cf15f52df432aed0ad9c355f706d73500e8d9',
  'packages/contracts/src/provenance-vocabulary.ts': '74129f5ba8f8fb25d7427d91941e7a93ef99aa8b',
  'packages/contracts/src/scenario-certification-model.ts': 'e58e2cae8aa82823c9281a0b73a6c7b3079d8720',
  'packages/contracts/src/living-evidence-contracts.ts': '65e9b7f0ff5bbbfbe95ba2ad414eb663de135625'
};

const gitBlobHash = (rel: string) => {
  const content = readFileSync(join(ROOT, rel));
  return createHash('sha1')
    .update(Buffer.concat([Buffer.from(`blob ${content.length}\0`), content]))
    .digest('hex');
};

for (const [rel, expected] of Object.entries(FROZEN_AT_BASE)) {
  const actual = gitBlobHash(rel);
  assert(actual === expected, `Frozen at the Wave-2 base and unchanged by convergence: ${rel}`, actual);
}

console.log('\n=== C. ONE OWNER IMPLEMENTS LIVING EVIDENCE ========================\n');

const OWNER = 'lib/living-evidence-engine.ts';
const implementers = RUNTIME.filter(rel =>
  /export function (assessSignalMateriality|assessDecisionRelevance|refreshScenario|scenarioMethodsRegister|assessedEvidenceAt|scenarioDecisionPosition)\b/
    .test(codeOf(rel))
);
assert(
  implementers.length === 1 && implementers[0] === OWNER,
  `Exactly one module implements materiality, relevance, Refresh, the register, the assessed evidence and the decision position (${OWNER})`,
  implementers.join(', ')
);

/*
 * The Gate-C convergence event, asserted rather than described: the seam `SCI-06` needed is
 * published by the route, and it is published FROM the owner rather than assembled in the route.
 */
const evidenceRoute = codeOf('app/api/v1/evidence/route.ts');
assert(
  /assessedEvidenceAt/.test(evidenceRoute) && /scenarioDecisionPosition/.test(evidenceRoute),
  'The evidence route publishes the assessments from the engine that owns them'
);
assert(
  !/movements\s*[:=]\s*\[/.test(evidenceRoute) && !/band\s*[:=]/.test(evidenceRoute),
  'The evidence route composes no assessment of its own'
);

console.log('\n=== D. EACH SCENARIO RUNS ON ITS OWN CLOCK =========================\n');

restartAllScenarioEvidence();
const IDS = [CANONICAL_SCENARIO_ID, CHILLED_SALMON_SCENARIO_ID, PREMIUM_BAKERY_SCENARIO_ID];
const instants = IDS.map(id => currentAsAtMarker(id).period_instant_iso);
assert(new Set(instants).size === 3, 'The three scenarios resolve three different clock instants', instants.join(' | '));

/* The clock the Wave-2 fixture carried. No scenario runs on it, so nothing may publish it. */
const FIXTURE_CLOCK = '2026-09-08';
assert(
  !instants.some(i => i.startsWith(FIXTURE_CLOCK)),
  'No scenario resolves the Wave-2 fixture clock'
);
const clockLeakers = RUNTIME.filter(rel => codeOf(rel).includes(FIXTURE_CLOCK));
assert(clockLeakers.length === 0, 'The fixture clock appears in no runtime file', clockLeakers.join(', '));

/*
 * Scoped to the GOVERNED SCENARIO JOURNEY, deliberately. `FreshDirect UK` and `SCN-PROMO-01` are
 * the pre-`SCI` demonstration identities and they still appear on legacy surfaces the scenario
 * programme has not reached — that is a known state of the estate, recorded rather than silently
 * widened into this gate. What `SCI-01` removed, and what every gate since has had to keep removed,
 * is the contradiction on the surfaces that publish a CERTIFIED scenario's decision. Those are the
 * files below.
 */
const JOURNEY = RUNTIME.filter(rel =>
  /^components\/(observability\/|ObservabilityGovernance|PromotionPlanner|CampaignDecisionCanvas|DemandForecast)/.test(rel)
  || /^lib\/(living-evidence-engine|observability-client)\.ts$/.test(rel)
  || /^app\/api\/v1\/(evidence|methods)\//.test(rel)
);
assert(JOURNEY.length >= 10, `The governed scenario journey is ${JOURNEY.length} files`);
const staleIdentity = JOURNEY.filter(rel => /FreshDirect|SCN-PROMO-01/.test(codeOf(rel)));
assert(
  staleIdentity.length === 0,
  'No surface on the governed scenario journey names FreshDirect UK or SCN-PROMO-01',
  staleIdentity.join(', ')
);

/* `SCI-01` retired the legacy family series; nothing on the journey may read it again. */
const legacySeries = JOURNEY.filter(rel => /temporal_evidence|temporalData/.test(codeOf(rel)));
assert(
  legacySeries.length === 0,
  'No surface on the governed scenario journey reads the legacy temporal evidence series',
  legacySeries.join(', ')
);

console.log('\n=== E. NO SURFACE BRANCHES ON A SCENARIO IDENTITY ==================\n');

/*
 * `SCI-03`'s guard catches `scenario_id === 'SCN-…'`. It did not catch a substring test on the
 * identity, and the pre-convergence Decision Trace used exactly that — `scenarioId.includes('SALMON')`
 * selecting a hand-written recommendation per scenario. Widened here so the defect class fails a
 * test rather than a demonstration.
 */
const EXCLUDED = ['scenario-packs', 'scenario-registry.ts', 'canonical-scenario-model.ts'];
const identityBranchers = RUNTIME
  .filter(rel => !EXCLUDED.some(x => rel.includes(x)))
  .filter(rel => {
    const code = codeOf(rel);
    return /(scenario_?[Ii]d)\s*===\s*['"`]SCN-/.test(code)
      || /(scenario_?[Ii]d)\s*\.\s*(includes|startsWith|endsWith|match)\s*\(\s*['"`\/]/.test(code)
      || /['"`]SCN-[A-Z0-9-]+['"`]\s*===\s*\w*[Ss]cenario/.test(code);
  });
assert(
  identityBranchers.length === 0,
  'No runtime file selects behaviour by testing a scenario identity',
  identityBranchers.join(', ')
);

console.log('\n=== E2. A REFRESH DOES NOT CONTRADICT ITS OWN SCENARIO =============\n');

/*
 * The defect this section exists to prevent was found at the gate and fixed in the owning engine.
 *
 * Refresh deliberately evaluates both bodies of evidence at the SAME marker, so an observation is
 * never credited with the passage of time. Applying that isolation to the ADVANCE as well made the
 * consequence statement say *"the state of the Decision Window are the same as before the advance"*
 * for two of the three certified scenarios whose window genuinely moved — `CLOSING_SOON → OPEN` and
 * `OPEN → CLOSING_SOON`. ADR-081 part 2 is that a Refresh which cannot say what it changed has not
 * earned the control; one that denies what it changed is worse.
 */
for (const id of IDS) {
  restartScenarioEvidence(id);
  const positionBefore = scenarioDecisionPosition(id);
  const delta = refreshScenario(id);
  const positionAfter = scenarioDecisionPosition(id);

  const windowMoved = positionBefore.decision_window !== positionAfter.decision_window;
  const recommendationMoved = positionBefore.recommendation !== positionAfter.recommendation;
  const claimsUnchanged = /are the same as before the advance|is unchanged|nothing changed/i
    .test(delta.decision_consequence_statement);

  assert(
    !((windowMoved || recommendationMoved) && claimsUnchanged),
    `${id}: the consequence statement does not claim the decision is unchanged when it moved`,
    `${positionBefore.decision_window} → ${positionAfter.decision_window} | ${delta.decision_consequence_statement}`
  );
  if (windowMoved || recommendationMoved) {
    assert(
      delta.decision_changes.some(c => c.changed !== 'NONE'),
      `${id}: a decision that moved across the advance is published as a decision change`
    );
  }
  /*
   * And the other half of the property: an advance must not band an observation DECISIVE merely
   * because the clock moved the decision. Materiality stays attributed to evidence.
   */
  const decisiveNew = delta.observations.filter(o => o.materiality?.band === 'DECISIVE');
  assert(
    decisiveNew.every(o =>
      o.decision_relevance?.changed !== 'NONE'
      || o.materiality!.movements.some(m => Math.abs(m.delta_pct ?? 0) >= 5)),
    `${id}: no observation is banded DECISIVE by the passage of time alone`
  );
  restartScenarioEvidence(id);
}

console.log('\n=== F. THE PROTECTED FRESH DAIRY JOURNEY, FROM THE CONVERGED STATE ==\n');

const dairy: CanonicalScenario = resolveScenario(CANONICAL_SCENARIO_ID);
const params = withScenarioInScope(dairy, () => scenarioOpeningDecisionParameters(dairy));
const projection = await projectDemand({
  scenario: dairy,
  metric: 'units',
  horizon: params.forecast_horizon_days as never,
  modelId: 'HOLT_WINTERS_ADDITIVE' as never,
  promoLift: params.promotion_lift,
  cannibalization: params.cannibalisation_factor,
  eventBoost: params.event_boost,
  executedAsOf: '2026-01-01T00:00:00.000Z',
  backtest: false,
  historyDisplayDays: 21
});

if (isDemandRefusal(projection)) {
  assert(false, 'Fresh Dairy: the Demand decision is served from the convergence state');
} else {
  const derived = withScenarioInScope(dairy, () => calculateDerivedImpacts(params, []));
  const evaluation = withScenarioInScope(dairy, () => evaluateDemandDecisionFrontier({
    tenantId: 'tenant_uk_retail_01',
    sessionId: 'sess_gate_c',
    scenarioParams: params,
    derivedImpacts: derived,
    intentFusionOutlook: null as never,
    enterpriseSignals: generateSyntheticSignalSnapshot(dairy, 'tenant_uk_retail_01'),
    historySales: projection.history,
    forecastSales: projection.forecast.map(f => ({ date: f.date, value: f.value })),
    revenuePerUnitGbp: 1,
    metric: 'units'
  }));

  const f = evaluation.demand_frontier;
  const gap = evaluation.decision_gap;
  const checks: [string, number, number, number][] = [
    ['economic base is 700,000', f.base_demand_units, 700_000, 1],
    ['expected demand is 900,125', f.emerging_demand_units, 900_125, 1],
    ['servable demand is 770,000', f.executable_demand_units, 770_000, 1],
    ['exposed demand is 130,125', gap.exposed_demand_units, 130_125, 1],
    ['Decision Gap is 18.6pp', gap.exposed_demand_pp, 18.6, 0.05],
    ['total movement is +28.6%', (f.emerging_demand_units / f.base_demand_units - 1) * 100, 28.6, 0.05]
  ];
  for (const [label, actual, expected, tol] of checks) {
    assert(Math.abs(actual - expected) <= tol, `Fresh Dairy: ${label}`, String(actual));
  }

  /*
   * `R-38` also moved the post-intervention exposure, 46,130 → 46,125, and
   * `COGNIX_PRESENTATION_SYNC_DELTA.md` §1a records it. It is measured here rather than quoted,
   * because §2 of that record is the conclusion a presenter reads out.
   */
  const intervention = withScenarioInScope(dairy, () =>
    evaluateInterventionRecommendation(gap, params, derived, params.forecast_horizon_days, 1)
  );
  assert(
    Math.abs(intervention.residual_gap_units - 46_125) <= 1,
    'Fresh Dairy: exposure after the recommended intervention is 46,125',
    String(intervention.residual_gap_units)
  );
  assert(
    Math.abs(intervention.expected_units_recovered - 84_000) <= 1,
    'Fresh Dairy: the intervention recovers 84,000 units',
    String(intervention.expected_units_recovered)
  );

  /* The superseded pair must not come back through a presentation route. */
  assert(
    Math.round(gap.exposed_demand_units) !== 130_129 && Math.round(intervention.residual_gap_units) !== 46_130,
    'Fresh Dairy: the pre-R-38 unit quantities are not restored'
  );

  console.log('\n=== G. R-41 IS A RECORDED RESIDUAL, NOT A RETUNED NUMBER ===========\n');

  const contributors = withScenarioInScope(dairy, () => deriveOutlookContributors(evaluation, params.promotion_lift));
  const pp = (key: string) => contributors.find(c => c.key === key)?.pp ?? 0;
  assert(
    Math.abs(pp('promotion') - 19.6) <= 0.05,
    'Fresh Dairy: the declared commercial intent is published as declared',
    pp('promotion').toFixed(2)
  );
  assert(
    Math.abs(pp('baseline') - (-2.0)) <= 0.05,
    'Fresh Dairy: the declared underlying trend is published as declared',
    pp('baseline').toFixed(2)
  );
}

/*
 * `R-41`: the two curated packs' observed-behaviour legs are within the tolerance
 * `run-r37-observed-behaviour-tests.ts` §8 asserts, and the convergence DID NOT re-tune the carrier
 * amplitudes to close the last tenth of a point on a published total. What is asserted here is that
 * the amplitudes are the ones `R-37` declared — a convergence that quietly moved them would close
 * the residual by number-chasing and would pass every other test in the estate.
 */
const carriers = readFileSync(join(ROOT, 'services/world/src/observed-behaviour-carriers.ts'), 'utf8');
const carrierHash = createHash('sha256').update(carriers).digest('hex').slice(0, 16);
assert(
  carrierHash === '8354f380dd40cd5a',
  'The R-37 carrier amplitudes are untouched by the convergence (R-41 recorded, not retuned)',
  carrierHash
);

console.log('\n===================================================================');
console.log(`Wave-2 convergence / Gate C: ${passed} PASSED, ${failed} FAILED`);
console.log('===================================================================\n');

if (failed > 0) process.exit(1);

})();
