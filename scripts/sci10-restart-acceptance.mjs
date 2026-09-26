#!/usr/bin/env node
/**
 * `SCI-10` restart acceptance, over HTTP, against a RUNNING production estate (BFF in `service` mode,
 * `cognix-world`, `cognix-learning`). Takes the attested scenario ids the browser acceptance printed.
 *
 *   node scripts/sci10-restart-acceptance.mjs present '<ATTESTED_IDS json>' [expected-active-id]
 *       after a `cognix-world`-only restart: every attested scenario, its confirmed draft, its attested
 *       provenance and its admitted upload are intact; it evaluates; signals come from the NEW world process.
 *   node scripts/sci10-restart-acceptance.mjs absent '<ATTESTED_IDS json>'
 *       after a BFF-only restart: authored and uploaded state is gone together and cleanly (ADR-085 part 5,
 *       ADR-086 part 5, `R-SCI07R-1`) — not found everywhere, never half-present — and the curated estate is
 *       intact with the reference scenario running. With PLAYWRIGHT_MODULE set, a browser opened afterwards
 *       lands on the reference scenario with no console error.
 *
 * Restart safety for authored or uploaded state is NOT claimed: it is measured to be absent, as decided.
 */
const BFF = process.env.BFF_URL || 'http://127.0.0.1:3000';
const TENANT = 'tenant_uk_retail_01';
const REFERENCE = 'SCN-FRESH-DAIRY-CHEDDAR-001';
const CURATED = [REFERENCE, 'SCN-CHILLED-SALMON-002', 'SCN-BAKERY-SOURDOUGH-003'];

let passed = 0;
let failed = 0;
const assert = (ok, name, detail) => {
  if (ok) { console.log(`[PASS] ${name}`); passed++; }
  else { console.error(`[FAIL] ${name} — ${detail ?? 'assertion failed'}`); failed++; }
};
const call = async (path, init) => {
  const res = await fetch(`${BFF}${path}`, init);
  let body = null;
  try { body = await res.json(); } catch { /* none */ }
  return { status: res.status, body };
};
const post = (path, body) => call(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const q = (path, id) => `${path}?scenario_id=${encodeURIComponent(id)}&tenant_id=${TENANT}`;
const draftOf = id => id.replace('SCN-AUTHORED-', 'DRAFT-');

async function present(ids, expectedActive) {
  const catalogue = await call(`/api/v1/scenarios?tenant_id=${TENANT}`);
  for (const id of ids) {
    const entry = catalogue.body.data.find(e => e.scenario_id === id);
    assert(entry?.certification_state === 'CERTIFIED', `${id}: still in the catalogue, certified`);
    const draft = await call(`/api/v1/scenarios/drafts/${draftOf(id)}?tenant_id=${TENANT}`);
    assert(draft.status === 200 && draft.body.data.draft.state === 'CONFIRMED'
      && draft.body.data.field_provenance.filter(p => p.descriptor.origin === 'attested').length === 8,
      `${id}: its confirmed draft and its eight attested inputs are intact (the BFF did not restart)`);
    const uploads = await call(`/api/v1/scenarios/drafts/${draftOf(id)}/uploads?tenant_id=${TENANT}`);
    const admitted = uploads.body?.data?.uploads?.find(u => u.state === 'ADMITTED');
    assert(uploads.status === 200 && admitted?.admitted_values.length === 8, `${id}: its admitted upload record is intact`);
    const record = await call(q('/api/v1/scenarios/record', id));
    assert(record.status === 200 && record.body.data.demand.base_demand_units_per_week === admitted?.admitted_values.find(v => v.field === 'base_demand_units_per_week')?.value,
      `${id}: the record still carries the admitted weekly demand`);
    const decision = await call(q('/api/v1/scenarios/decision', id));
    assert(decision.status === 200 && decision.body.data.scenarioId === id, `${id}: it evaluates`);
    const signals = await call(q('/api/v1/signals', id));
    assert(signals.status === 200 && signals.body.service === 'cognix-world' && signals.body.scenario_id === id,
      `${id}: signals come from the restarted cognix-world process, over the record`);
  }
  if (expectedActive) {
    assert(catalogue.body.active_scenario_id === expectedActive, `the active scenario is unchanged by the world restart (${expectedActive})`, catalogue.body.active_scenario_id);
  }
}

async function absent(ids) {
  const catalogue = await call(`/api/v1/scenarios?tenant_id=${TENANT}`);
  const listed = catalogue.body.data.map(e => e.scenario_id);
  assert(JSON.stringify(listed) === JSON.stringify(CURATED), 'the catalogue is exactly the three curated scenarios', listed.join(', '));
  assert(catalogue.body.active_scenario_id === REFERENCE, 'the reference scenario is running');
  for (const id of ids) {
    const record = await call(q('/api/v1/scenarios/record', id));
    const activation = await post('/api/v1/scenarios', { scenario_id: id, tenant_id: TENANT });
    const draft = await call(`/api/v1/scenarios/drafts/${draftOf(id)}?tenant_id=${TENANT}`);
    const uploads = await call(`/api/v1/scenarios/drafts/${draftOf(id)}/uploads?tenant_id=${TENANT}`);
    assert(record.status === 400 && activation.status === 422, `${id}: gone — its record is refused and it cannot be activated`);
    assert(draft.status === 404 && uploads.status === 404 && uploads.body.reason === 'DRAFT_NOT_FOUND',
      `${id}: its draft, attested provenance and upload records are gone TOGETHER — nothing half-present`);
  }
  const reference = await call(q('/api/v1/scenarios/decision', REFERENCE));
  assert(reference.body.data.exposedGap === 130_125, 'Fresh Dairy still publishes 130,125');

  if (process.env.PLAYWRIGHT_MODULE) {
    const { createRequire } = await import('node:module');
    const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE);
    const browser = await chromium.launch(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {});
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_CERT/.test(m.text())) errors.push(m.text()); });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BFF}/`, { waitUntil: 'networkidle' });
    const strip = await page.locator('.scenario-context-strip').first().innerText();
    assert(/Cheddar Mature 400g/.test(strip) && errors.length === 0,
      'a browser opened after the BFF restart lands on Fresh Dairy with no console error — no stale authored state', errors.join(' | '));
    await browser.close();
  }
}

const [mode, arg, expectedActive] = process.argv.slice(2);
const ids = Object.values(JSON.parse(arg || '{}'));
(mode === 'present' ? present(ids, expectedActive) : absent(ids))
  .then(() => {
    console.log(`=== SCI-10 restart (${mode}): ${passed} passed, ${failed} failed ===`);
    process.exit(failed ? 1 : 0);
  })
  .catch(e => { console.error('[FAIL] crashed —', e); process.exit(1); });
