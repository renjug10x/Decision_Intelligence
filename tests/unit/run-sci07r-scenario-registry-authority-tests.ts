/**
 * `SCI-07R` — Scenario Registry Authority (ADR-085). Closes `R-SCI07-6` and `R-32`.
 *
 * Runs the governed lifecycle through the REAL route handlers of the BFF, in `service` mode, against a
 * REAL `cognix-world` process spawned from its own source on its own port — two processes, the BFF's
 * registry in this one and world's compiled copy in the other, which is exactly the boundary the
 * defect lived on. Nothing is injected into a catalogue: every scenario reaches it the way a person's
 * would.
 *
 * The production-build, three-process acceptance over HTTP is `scripts/sci07r-service-acceptance.mjs`.
 */
import { spawn, execSync, type ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const ROOT = join(__dirname, '..', '..');
const WORLD_PORT = 18000 + Math.floor(Math.random() * 1000);
const WORLD_URL = `http://127.0.0.1:${WORLD_PORT}`;
process.env.COGNIX_WORLD_MODE = 'service';
process.env.COGNIX_WORLD_SERVICE_URL = WORLD_URL;
delete process.env.GEMINI_API_KEY;

const TENANT = 'tenant_uk_retail_01';
const OTHER_TENANT = 'tenant_sci07r_other';
const REFERENCE_ID = 'SCN-FRESH-DAIRY-CHEDDAR-001';
const COMPILED_IDS = [REFERENCE_ID, 'SCN-CHILLED-SALMON-002', 'SCN-BAKERY-SOURDOUGH-003'];

let passed = 0;
let failed = 0;
function assert(condition: boolean, name: string, detail?: string) {
  if (condition) { console.log(`[PASS] ${name}`); passed++; }
  else { console.error(`[FAIL] ${name} — ${detail ?? 'assertion failed'}`); failed++; }
}
const stripComments = (code: string) =>
  code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const codeOf = (rel: string) => stripComments(readFileSync(join(ROOT, rel), 'utf8'));

/** Every measured and declared input supplied — the fixture `SCI-07`'s suite uses. */
const FULLY_STATED = {
  sku_id: 'P004',
  situation: 'PROMOTION_DEMAND_SURGE',
  market_scope: 'NATIONAL',
  focus_region: 'North West',
  channels: ['In store', 'Online'],
  scenario_name: 'Cheddar under a committed national cut',
  decision_question: 'Is the committed depth still right, and can we serve what it creates?',
  national_store_count: 1450,
  online_demand_share_pct: 14,
  base_demand_units_per_week: 350_000,
  total_demand_movement_pct: 28.59,
  forecast_horizon_days: 14,
  promotion_duration_days: 14,
  promotion_depth_pct: 20,
  promotion_participation_pct: 85,
  gross_margin_rate_pct: 30,
  supplier_promotional_funding_pct: 35,
  promotional_response_pp_per_depth_point: 2.4,
  supplier_capacity_index: 1.1,
  supplier_flex_rate_pct: 12,
  flex_premium_rate_pct: 12,
  supplier_lead_time_days: 3,
  store_cover_days: 4,
  distribution_centre_cover_days: 6,
  on_order_cover_days: 8,
  observed_history_end_date: '2026-06-03',
  waste_units_per_week: 14_700,
  cannibalisation_rate_pct: 8,
  substitution_recovery_pct: 35
};

let world: ChildProcess | null = null;
async function startWorld(): Promise<void> {
  world = spawn(join(ROOT, 'node_modules', '.bin', 'tsx'), [join(ROOT, 'services/world/src/server.ts')], {
    env: { ...process.env, PORT: String(WORLD_PORT) },
    stdio: 'ignore'
  });
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`${WORLD_URL}/api/v1/health`);
      if (res.ok) return;
    } catch { /* not yet */ }
    await new Promise(r => setTimeout(r, 150));
  }
  throw new Error('cognix-world did not start');
}
async function stopWorld(): Promise<void> {
  if (!world) return;
  const exited = new Promise(r => world!.once('exit', r));
  world.kill('SIGTERM');
  await exited;
  world = null;
}

async function run() {
  const { NextRequest } = await import('next/server');
  const catalogueRoute = await import('../../app/api/v1/scenarios/route');
  const draftsRoute = await import('../../app/api/v1/scenarios/drafts/route');
  const confirmRoute = await import('../../app/api/v1/scenarios/drafts/[id]/confirm/route');
  const recordRoute = await import('../../app/api/v1/scenarios/record/route');
  const decisionRoute = await import('../../app/api/v1/scenarios/decision/route');
  const signalsRoute = await import('../../app/api/v1/signals/route');
  const currentRoute = await import('../../app/api/v1/signals/current/route');
  const evidenceRoute = await import('../../app/api/v1/evidence/route');
  const runtime = await import('../../lib/scenario-runtime');
  const { evaluateAuthoritativeScenarioDecision } = await import('../../lib/canonical-decision-evaluator');
  const { generateSyntheticSignalSnapshot } = await import('../../services/world/src/enterprise-signal-generator');
  const ownership = await import('../../lib/scenario-authoring/authored-scenario-ownership');
  const clientRegistry = await import('../../lib/scenario-client-registry');

  const get = (path: string, headers: Record<string, string> = {}) =>
    new NextRequest(new URL(path, 'http://localhost'), { headers });
  const post = (path: string, body: unknown) =>
    new NextRequest(new URL(path, 'http://localhost'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
  const json = async (res: Response) => ({ status: res.status, body: await res.json() as any });
  const catalogue = async (tenant = TENANT) => json(await catalogueRoute.GET(get(`/api/v1/scenarios?tenant_id=${tenant}`)));
  const idsOf = (c: any) => (c.body.data as any[]).map(e => e.scenario_id);
  const activate = async (id: string, tenant = TENANT) =>
    json(await catalogueRoute.POST(post('/api/v1/scenarios', { scenario_id: id, tenant_id: tenant })));
  const author = async (inputs: Record<string, unknown>, tenant = TENANT) => {
    const created = await json(await draftsRoute.POST(post('/api/v1/scenarios/drafts', {
      tenant_id: tenant, situation: 'PROMOTION_DEMAND_SURGE', inputs
    })));
    const draft = created.body.data.draft;
    const confirmed = await json(await confirmRoute.POST(
      post(`/api/v1/scenarios/drafts/${draft.draft_id}/confirm`, { tenant_id: tenant, confirm: true, confirmed_by: 'SCI-07R Operator' }),
      { params: Promise.resolve({ id: draft.draft_id }) }
    ));
    return { created, draft, confirmed };
  };
  const scoped = (path: string, id: string, tenant = TENANT) => `${path}?scenario_id=${encodeURIComponent(id)}&tenant_id=${tenant}`;

  await startWorld();

  // ═════════════════════════════════════════════════════════════════════════════
  console.log('\n=== A. THE COMPILED SCENARIOS, UNCHANGED, FROM ONE AUTHORITY ==========\n');

  const opening = await catalogue();
  assert(opening.status === 200 && opening.body.service === 'cognix-web-bff' && opening.body.authority === 'scenario-runtime',
    'A1: In service mode the catalogue is published by the BFF scenario runtime, not proxied from cognix-world',
    JSON.stringify({ status: opening.status, service: opening.body.service }));
  assert(isDeepStrictEqual(idsOf(opening), COMPILED_IDS),
    'A2: The three compiled scenarios, in registration order, by canonical id', idsOf(opening).join(', '));
  assert((opening.body.data as any[]).every(e => e.certification_state === 'CERTIFIED'),
    'A3: …each CERTIFIED by the gate in the authority\'s process');
  assert(opening.body.active_scenario_id === REFERENCE_ID && opening.body.count === 3,
    'A4: …with the reference scenario active and the count matching the entries');

  const worldCatalogue = await fetch(`${WORLD_URL}/api/v1/scenarios`);
  assert(worldCatalogue.status === 410,
    'A5: cognix-world serves NO catalogue (410) — a second catalogue authority no longer exists (R-32)');
  const worldById = await fetch(`${WORLD_URL}/api/v1/signals?scenario_id=${REFERENCE_ID}`);
  assert(worldById.status === 410,
    'A6: …and resolves no scenario identity for signals (410, record required)');

  for (const id of COMPILED_IDS) {
    const sig = await json(await signalsRoute.GET(get(scoped('/api/v1/signals', id))));
    const expected = generateSyntheticSignalSnapshot(runtime.resolveScenario(id), TENANT);
    assert(sig.status === 200 && sig.body.service === 'cognix-world' && sig.body.scenario_id === id
      && isDeepStrictEqual(sig.body.data, JSON.parse(JSON.stringify(expected))),
      `A7: ${id} signals are generated BY cognix-world over the record, identical to the generator's own output`);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  console.log('\n=== B. AN AUTHORED SCENARIO, AUTHOR → EXECUTE, IN SERVICE MODE ========\n');

  const authored = await author({ sku_id: 'P004' });
  const id: string = authored.draft.scenario_id;
  assert(authored.created.status === 201 && /^SCN-AUTHORED-[0-9A-F]{10}$/.test(id),
    'B1: The draft is created with its canonical scenario id fixed at creation', id);
  assert(authored.confirmed.status === 201 && authored.confirmed.body.data.certified === true
    && authored.confirmed.body.data.demo_active === false,
    'B2: Resolve → certify → register → certify authoritatively → confirm, and confirmation does NOT activate');
  assert(authored.confirmed.body.data.scenario.scenario_id === id,
    'B3: The confirmed registry entry carries the same id');

  const withAuthored = await catalogue();
  const entry = (withAuthored.body.data as any[]).find(e => e.scenario_id === id);
  assert(!!entry, 'B4: THE AUTHORED SCENARIO APPEARS IN THE CATALOGUE THE SELECTOR RENDERS, in service mode (R-SCI07-6)',
    idsOf(withAuthored).join(', '));
  assert(entry?.certification_state === 'CERTIFIED' && entry?.demo_active === false,
    'B5: …certified, and not active until someone selects it');
  assert(isDeepStrictEqual(idsOf(withAuthored).slice(0, 3), COMPILED_IDS) && withAuthored.body.count === 4,
    'B6: …after the compiled scenarios, which are untouched');

  const record = await json(await recordRoute.GET(get(scoped('/api/v1/scenarios/record', id))));
  assert(record.status === 200 && record.body.certification_state === 'CERTIFIED'
    && isDeepStrictEqual(record.body.data, JSON.parse(JSON.stringify(runtime.resolveScenario(id)))),
    'B7: The record route publishes the registered record exactly, for the browser projection');

  const selected = await activate(id);
  assert(selected.status === 200 && selected.body.active_scenario_id === id,
    'B8: It is selectable — activation through the gate, as a curated pack is');
  const afterSelect = await catalogue();
  assert(afterSelect.body.active_scenario_id === id
    && (afterSelect.body.data as any[]).find(e => e.scenario_id === id)?.demo_active === true,
    'B9: …and the catalogue and the active pointer now agree about it (the R-32 split cannot recur)');

  const decision = await json(await decisionRoute.GET(get(scoped('/api/v1/scenarios/decision', id))));
  const authoritative = await evaluateAuthoritativeScenarioDecision(runtime.resolveScenario(id));
  assert(decision.status === 200 && decision.body.data.scenarioId === id
    && isDeepStrictEqual(decision.body.data, JSON.parse(JSON.stringify(authoritative))),
    'B10: It executes through the authoritative evaluator — the decision is the evaluator\'s, figure for figure',
    JSON.stringify(decision.body.data));

  const authoredSignals = await json(await signalsRoute.GET(get(scoped('/api/v1/signals', id))));
  assert(authoredSignals.status === 200 && authoredSignals.body.service === 'cognix-world'
    && authoredSignals.body.scenario_id === id && authoredSignals.body.count > 0,
    'B11: Its signals are generated BY cognix-world in service mode — the record travelled, the id did not have to',
    JSON.stringify({ status: authoredSignals.status, service: authoredSignals.body.service, message: authoredSignals.body.message }));
  const authoredCurrent = await json(await currentRoute.GET(get(scoped('/api/v1/signals/current', id))));
  assert(authoredCurrent.status === 200 && authoredCurrent.body.service === 'cognix-world',
    'B12: /signals/current reaches cognix-world too — no silent in-process fallback in service mode');
  const evidence = await json(await evidenceRoute.GET(get(scoped('/api/v1/evidence', id))));
  assert(evidence.status === 200, 'B13: Living Evidence resolves it for its tenant');

  // ═════════════════════════════════════════════════════════════════════════════
  console.log('\n=== C. A REFUSED SCENARIO REACHES NOTHING ============================\n');

  const refused = await author({ ...FULLY_STATED, promotion_participation_pct: 1 });
  const refusedId: string = refused.draft.scenario_id;
  assert(refused.confirmed.status === 422, 'C1: A draft the gate refuses is not confirmed', String(refused.confirmed.status));
  assert(!runtime.isScenarioRegistered(refusedId), 'C2: …it is not registered');
  assert(!idsOf(await catalogue()).includes(refusedId), 'C3: …it is not in the catalogue');
  assert((await recordRoute.GET(get(scoped('/api/v1/scenarios/record', refusedId)))).status === 400,
    'C4: …its record is not published');
  assert((await activate(refusedId)).status === 422, 'C5: …it cannot be activated');
  assert((await decisionRoute.GET(get(scoped('/api/v1/scenarios/decision', refusedId)))).status === 400
    && (await signalsRoute.GET(get(scoped('/api/v1/signals', refusedId)))).status === 400,
    'C6: …and it cannot be executed');
  assert(runtime.getActiveScenarioId() === id, 'C7: …and the refusal changed nothing that was active');

  // ═════════════════════════════════════════════════════════════════════════════
  console.log('\n=== D. TENANT ISOLATION ============================================\n');

  const other = await catalogue(OTHER_TENANT);
  assert(isDeepStrictEqual(idsOf(other), COMPILED_IDS),
    'D1: Another tenant sees the compiled scenarios and NOT this tenant\'s authored one', idsOf(other).join(', '));
  const otherRecord = await json(await recordRoute.GET(get(scoped('/api/v1/scenarios/record', id, OTHER_TENANT))));
  assert(otherRecord.status === 400, 'D2: …cannot fetch its record');
  const otherActivation = await activate(id, OTHER_TENANT);
  assert(otherActivation.status === 422, 'D3: …cannot activate it');
  assert((await decisionRoute.GET(get(scoped('/api/v1/scenarios/decision', id, OTHER_TENANT)))).status === 400
    && (await signalsRoute.GET(get(scoped('/api/v1/signals', id, OTHER_TENANT)))).status === 400
    && (await evidenceRoute.GET(get(scoped('/api/v1/evidence', id, OTHER_TENANT)))).status === 400,
    'D4: …cannot execute it — decision, signals and Living Evidence all refuse');
  const unknown = await json(await recordRoute.GET(get(scoped('/api/v1/scenarios/record', 'SCN-AUTHORED-0000000000', OTHER_TENANT))));
  assert(otherRecord.body.error === unknown.body.error
    && otherRecord.body.message.replace(id, 'X') === unknown.body.message.replace('SCN-AUTHORED-0000000000', 'X'),
    'D5: Invisible is indistinguishable from unregistered — an id is not an existence oracle');
  assert(!String(unknown.body.message).includes(id),
    'D6: …and a refusal never lists another tenant\'s registered ids');
  const otherAuthored = await author({ sku_id: 'P004' }, OTHER_TENANT);
  assert(!idsOf(await catalogue()).includes(otherAuthored.draft.scenario_id)
    && idsOf(await catalogue(OTHER_TENANT)).includes(otherAuthored.draft.scenario_id),
    'D7: …in both directions');

  // ═════════════════════════════════════════════════════════════════════════════
  console.log('\n=== E. IDENTITY AND DUPLICATES =====================================\n');

  const reconfirm = await json(await confirmRoute.POST(
    post(`/api/v1/scenarios/drafts/${authored.draft.draft_id}/confirm`, { tenant_id: TENANT, confirm: true, confirmed_by: 'Second Person' }),
    { params: Promise.resolve({ id: authored.draft.draft_id }) }
  ));
  assert(reconfirm.status === 422, 'E1: A confirmed draft cannot be confirmed a second time');
  let collisionRefused = false;
  try { ownership.assertAuthoredScenarioAssignable(id, OTHER_TENANT); } catch (e) {
    collisionRefused = e instanceof ownership.AuthoredScenarioOwnershipError;
  }
  assert(collisionRefused, 'E2: An authored id owned by one tenant can never be assigned to another');
  assert(COMPILED_IDS.every(c => !c.startsWith('SCN-AUTHORED-')),
    'E3: Authored ids cannot collide with a compiled id — different namespace');
  const idsSeen = [authored.draft.scenario_id, authored.confirmed.body.data.scenario.scenario_id, entry?.scenario_id,
    record.body.scenario_id, record.body.data.identity.scenario_id, selected.body.active_scenario_id,
    decision.body.data.scenarioId, authoredSignals.body.scenario_id, authoredCurrent.body.scenario_id];
  assert(idsSeen.every(x => x === id),
    'E4: One canonical id across draft, confirmation, catalogue, record, activation, decision and signals', idsSeen.join(' | '));

  // ═════════════════════════════════════════════════════════════════════════════
  console.log('\n=== F. cognix-world RESTART, AND cognix-world UNAVAILABLE ============\n');

  await stopWorld();
  const whileDown = await catalogue();
  assert(whileDown.status === 200 && idsOf(whileDown).includes(id),
    'F1: With cognix-world DOWN the catalogue, and the authored scenario in it, are unaffected');
  const downSignals = await signalsRoute.GET(get(scoped('/api/v1/signals', id)));
  const downCurrent = await currentRoute.GET(get(scoped('/api/v1/signals/current', id)));
  assert(downSignals.status === 503 && downCurrent.status === 503,
    'F2: …and signal routes fail explicitly (503) — no silent fallback in service mode');
  await startWorld();
  const afterRestart = await json(await signalsRoute.GET(get(scoped('/api/v1/signals', id))));
  assert(idsOf(await catalogue()).includes(id) && afterRestart.status === 200 && afterRestart.body.service === 'cognix-world',
    'F3: After cognix-world RESTARTS the authored scenario is still listed and still executes there — world held nothing to lose');

  // ═════════════════════════════════════════════════════════════════════════════
  console.log('\n=== G. THE BROWSER PROJECTION =======================================\n');

  const realFetch = globalThis.fetch;
  const projected = { ...runtime.resolveScenario(REFERENCE_ID), identity: { ...runtime.resolveScenario(REFERENCE_ID).identity, scenario_id: 'SCN-AUTHORED-PROJECTION' } };
  let fetchCalls = 0;
  const stub = (payload: unknown, status = 200) => {
    globalThis.fetch = (async () => { fetchCalls++; return new Response(JSON.stringify(payload), { status }); }) as typeof fetch;
  };
  try {
    stub({ status: 'success', certification_state: 'CERTIFIED', data: { ...projected, identity: { ...projected.identity, scenario_id: 'SCN-AUTHORED-SOMETHING-ELSE' } } });
    assert(!(await clientRegistry.projectScenarioFromServer('SCN-AUTHORED-PROJECTION')) && !runtime.isScenarioRegistered('SCN-AUTHORED-PROJECTION'),
      'G1: A served record whose identity is not the one asked for is NOT projected');
    stub({ status: 'error', error: 'ScenarioNotCertified' }, 409);
    assert(!(await clientRegistry.projectScenarioFromServer('SCN-AUTHORED-PROJECTION')),
      'G2: A record the server will not certify is NOT projected');
    stub({ status: 'success', certification_state: 'CERTIFIED', data: projected });
    assert(await clientRegistry.projectScenarioFromServer('SCN-AUTHORED-PROJECTION') && runtime.isScenarioRegistered('SCN-AUTHORED-PROJECTION'),
      'G3: A certified record for the requested id IS projected, so the mirror can follow the server');
    fetchCalls = 0;
    const before = runtime.resolveScenario(REFERENCE_ID);
    stub({ status: 'success', certification_state: 'CERTIFIED', data: projected });
    assert(await clientRegistry.projectScenarioFromServer(REFERENCE_ID) && fetchCalls === 0 && runtime.resolveScenario(REFERENCE_ID) === before,
      'G4: A record already held is never fetched or replaced — a compiled pack cannot be shadowed');
  } finally {
    globalThis.fetch = realFetch;
  }
  const projectionCode = codeOf('lib/scenario-client-registry.ts');
  const projectionBody = projectionCode.slice(projectionCode.indexOf('export async function projectScenarioFromServer'));
  assert(!/activateScenario\s*\(/.test(projectionBody),
    'G5: Projection grants nothing — it never activates');

  // ═════════════════════════════════════════════════════════════════════════════
  console.log('\n=== H. STRUCTURE — ONE AUTHORITY, NO NEW ECONOMICS ===================\n');

  const worldServer = codeOf('services/world/src/server.ts');
  assert(!/\b(registerScenario|scenarioCatalogue|getActiveScenarioId|requireScenarioId|activateScenario|resolveScenario)\b/.test(worldServer),
    'H1: cognix-world\'s server registers, catalogues, activates and resolves nothing');
  const catalogueCode = codeOf('app/api/v1/scenarios/route.ts');
  assert(!/fetch\s*\(|WORLD_SERVICE_URL|COGNIX_WORLD_MODE/.test(catalogueCode),
    'H2: The catalogue route does not consult cognix-world or vary by mode');
  const newModules = [
    'lib/scenario-authoring/authored-scenario-ownership.ts',
    'app/api/v1/scenarios/record/route.ts',
    'app/api/v1/_shared/world-signal-snapshot.ts',
    'services/world/src/scenario-signal-snapshot.ts'
  ];
  for (const rel of newModules) {
    const code = codeOf(rel);
    assert(!/(demand-forecast|campaign-|demand-decision-frontier|canonical-decision-evaluator|scenarioElasticityCurve|revenue|margin|gap_?pct|exposed)/i.test(code),
      `H3: ${rel} imports no economic engine and names no economic quantity`);
  }
  const visibility = codeOf('lib/scenario-runtime.ts');
  assert(!/(revenue|margin|expected_?demand|servable|exposed)/i.test(visibility),
    'H4: The runtime\'s visibility filter is a filter — it computes nothing');
  assert(!/activateScenario\s*\(/.test(codeOf('lib/scenario-authoring/authoring-service.ts'))
    && !/activateScenario\s*\(/.test(codeOf('lib/scenario-authoring/authored-scenario-ownership.ts')),
    'H5: There is still no path from authoring to activation');

  const FROZEN = [
    'packages/contracts/src/canonical-scenario-model.ts',
    'packages/contracts/src/scenario-clock.ts',
    'packages/contracts/src/scenario-registry.ts',
    'packages/contracts/src/provenance-vocabulary.ts',
    'packages/contracts/src/scenario-certification-model.ts',
    'packages/contracts/src/living-evidence-contracts.ts',
    'packages/contracts/src/scenario-draft-model.ts'
  ];
  for (const rel of FROZEN) {
    let gateD = '';
    let now = '';
    try {
      gateD = execSync(`git rev-parse 2f8d7ed8b479452a804c61e4202c87697b62e4de:${rel}`, { cwd: ROOT }).toString().trim();
      now = execSync(`git hash-object ${rel}`, { cwd: ROOT }).toString().trim();
    } catch { /* reported below */ }
    assert(!!gateD && gateD === now, `H6: ${rel} is byte-identical to SHA-D`, `${gateD} vs ${now}`);
  }

  // Leave the estate as it was found.
  await activate(REFERENCE_ID);
  await stopWorld();

  console.log(`\n=== SCI-07R: ${passed} passed, ${failed} failed ===`);
  process.exit(failed === 0 ? 0 : 1);
}

run().catch(async error => {
  console.error('[FAIL] SCI-07R suite crashed —', error);
  await stopWorld().catch(() => undefined);
  process.exit(1);
});
