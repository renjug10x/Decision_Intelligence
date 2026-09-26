#!/usr/bin/env node
/**
 * `SCI-10` browser acceptance — Create → Upload → Map → Review → Attest → Admit → Confirm → Select → Run →
 * Understand, through the real `SCI-08` studio, against a RUNNING production estate (BFF standalone build in
 * `COGNIX_WORLD_MODE=service`, `cognix-world`, `cognix-learning`), provider OFF.
 *
 * Nothing is injected: every scenario is authored and every file is uploaded through the experience a person
 * uses. Refusals a person cannot produce from the UI (a changed fingerprint, another tenant) are sent to the
 * same running server over HTTP. Cross-surface truth is proven from the NETWORK — every scenario-scoped request
 * the surfaces make and every response — and from quantitative values, not labels.
 *
 * Requires Playwright. PLAYWRIGHT_MODULE may name its location; CHROMIUM_EXECUTABLE may name a browser binary.
 *   node scripts/sci10-browser-acceptance.cjs            → prints ATTESTED_IDS=<json> for the restart checks
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const B = process.env.BFF_URL || 'http://127.0.0.1:3000';
const SHOTS = process.env.SHOT_DIR || null;
const TENANT = 'tenant_uk_retail_01';
const OTHER = 'tenant_sci10_browser_other';
const REFERENCE = 'SCN-FRESH-DAIRY-CHEDDAR-001';
const SALMON = 'SCN-CHILLED-SALMON-002';

let passed = 0, failed = 0;
const assert = (ok, name, detail) => {
  if (ok) { console.log(`[PASS] ${name}`); passed++; }
  else { console.error(`[FAIL] ${name} — ${detail ?? ''}`); failed++; }
};
const api = async (path, body, method) => {
  const r = await fetch(B + path, body ? { method: method || 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
  return { status: r.status, body: await r.json().catch(() => null) };
};
const apiUpload = async (draftId, text, tenant = TENANT, name = 'chicken-weekly.csv') => {
  const form = new FormData();
  form.append('tenant_id', tenant);
  form.append('file', new Blob([text], { type: 'text/csv' }), name);
  const r = await fetch(`${B}/api/v1/scenarios/drafts/${draftId}/uploads`, { method: 'POST', body: form });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const money = n => n >= 1_000_000 ? `£${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `£${(n / 1_000).toFixed(1)}K` : `£${n}`;
const units = n => n.toLocaleString('en-GB');

// ── Fixtures: the extract a category analyst would export ──────────────────────
function weekly(end, n) {
  const t = Date.parse(`${end}T00:00:00Z`);
  return Array.from({ length: n }, (_, k) => new Date(t - (n - 1 - k) * 7 * 86_400_000).toISOString().slice(0, 10));
}
const HEADER = 'period_end,sku_id,base_demand_units,waste_units,store_count,online_share_pct,gross_margin_pct,store_cover_days,dc_cover_days,on_order_cover_days,notes';
const rowsFor = (weeks, sku = 'P009') => weeks.map((w, k) => {
  const last = k === weeks.length - 1;
  return [w, sku, 58213 + k * 611, 1409 + k * 7, last ? 1437 : 1431, last ? '15.57' : '15.1', last ? '27.43' : '27.1',
    last ? '3.25' : '3', last ? '5.5' : '5', last ? '7.75' : '7', k === 0 ? '"=HYPERLINK(""http://zq.example"")"' : `zq-canary-note-${k}`].join(',');
});
const WEEKS = weekly('2026-08-09', 12);
const GOOD = [HEADER, ...rowsFor(WEEKS)].join('\n') + '\n';
const MEAN_BASE = Math.round(WEEKS.reduce((s, _, k) => s + 58213 + k * 611, 0) / WEEKS.length);
const CELL_CANARIES = ['58213', '58824', 'zq-canary-note', 'HYPERLINK', 'zq.example'];
const REFUSALS = [
  { label: 'personal data', text: [HEADER + ',customer_email', ...rowsFor(WEEKS).map(r => `${r},x`)].join('\n'), expect: /personal data/i },
  { label: 'a future week', text: [HEADER, ...rowsFor(weekly('2026-08-16', 6))].join('\n'), expect: /after this scenario's Today/ },
  { label: 'another product', text: [HEADER, ...rowsFor(WEEKS, 'P004')].join('\n'), expect: /this scenario's product/ },
  { label: 'three weeks of history', text: [HEADER, ...rowsFor(weekly('2026-08-09', 3))].join('\n'), expect: /at least 4/ },
  { label: 'a malformed file', text: `${HEADER}\n2026-08-09,P009,"123`, expect: /quot/i },
  { label: 'too many columns', text: [`${HEADER},${Array.from({ length: 50 }, (_, k) => `x${k}`).join(',')}`, ...rowsFor(WEEKS).map(r => r + ','.repeat(50))].join('\n'), expect: /61 columns/ }
];
const LEAK = /upl_|DRAFT-|SCN-|rcpt_|att_[0-9a-f]|\b[0-9a-f]{64}\b|tenant|cognix-world|SCENARIO_UPLOAD|sha-?256|registry|\bJSON\b|\{"/i;

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {});
  const attested = {};

  for (const width of [1440, 1024, 720]) {
    const W = `@${width}`;
    await api('/api/v1/scenarios', { scenario_id: REFERENCE });
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    page.setDefaultTimeout(25000);
    const problems = [], http5xx = [], keyWarnings = [], environmental = [], scoped = [], expected4xx = [], unexpected4xx = [];
    let expectingRefusal = false;
    let draftId = null;
    page.on('console', m => {
      const t = m.text();
      if (/ERR_CERT_AUTHORITY_INVALID|fonts\.g(oogleapis|static)\.com/.test(t)) { environmental.push(t); return; }
      if (/status of (409|413|415|422)/.test(t) && expectingRefusal) return;
      if (/unique "key"|same key/i.test(t)) keyWarnings.push(t);
      if (m.type() === 'error' || /does not know|did not publish a certified record|Could not project|Could not mirror/.test(t)) problems.push(`${m.type()}: ${t}`);
    });
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('response', async r => {
      const u = new URL(r.url());
      if (r.status() >= 500) http5xx.push(`${r.status()} ${u.pathname}`);
      if (r.status() >= 400 && r.status() < 500 && u.pathname.startsWith('/api/')) (expectingRefusal ? expected4xx : unexpected4xx).push(`${r.status()} ${u.pathname}`);
      if (u.pathname === '/api/v1/scenarios/drafts' && r.request().method() === 'POST') {
        try { draftId = (await r.json())?.data?.draft?.draft_id ?? draftId; } catch { /* ignore */ }
      }
      const sid = u.searchParams.get('scenario_id');
      if (sid && u.pathname.startsWith('/api/')) {
        let bodyId = null;
        try { const j = await r.json(); bodyId = j?.scenario_id ?? j?.data?.scenarioId ?? j?.data?.scenario_id ?? null; } catch { /* not json */ }
        scoped.push({ path: u.pathname, requested: sid, served: bodyId, status: r.status() });
      }
    });
    const openNav = async () => {
      const t = page.getByRole('button', { name: 'Open navigation' });
      if (await t.count() && await t.first().isVisible()) { await t.first().click(); await page.waitForTimeout(400); }
    };
    const go = async name => { await openNav(); await page.getByRole('button', { name }).first().click(); await page.waitForTimeout(1200); };
    const openSelector = async () => { await openNav(); await page.getByRole('button', { name: 'Change scenario' }).first().click(); };
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const draftNow = async () => (await api(`/api/v1/scenarios/drafts/${draftId}?tenant_id=${TENANT}`)).body.data;
    const settle = () => page.waitForFunction(() => !document.querySelector('.sci08-panel')?.textContent?.includes('You have changes'));

    await page.goto(B + '/', { waitUntil: 'networkidle' });
    await page.locator('.scenario-context-strip').first().waitFor();

    // ── Create ─────────────────────────────────────────────────────────────────────────────
    await openSelector();
    await page.getByRole('button', { name: /Create your own/ }).click();
    const studio = page.getByRole('dialog', { name: 'Create your own scenario' });
    await studio.waitFor();
    await studio.getByRole('radio', { name: /supplier cannot land the volume/i }).click();
    await studio.locator('#sci08-product').selectOption('P009');
    await studio.getByRole('button', { name: 'Start' }).click();
    await studio.getByRole('heading', { name: 'What CogniX can answer' }).waitFor();
    const NAME = `Chicken breast supply squeeze on our own weekly data (${width})`;
    await studio.locator('#sci08-field-scenario_name').fill(NAME);
    await studio.getByRole('button', { name: 'Update assessment' }).click();
    await settle();
    const panel = studio.locator('.sci10-upload');
    assert(await panel.count() === 1 && /Use your own data \(optional\)/.test(await panel.innerText()),
      `${W} the studio offers "Use your own data (optional)" inside Review — no second authoring surface`);
    assert(await studio.getByText('AI suggestions are not available here. Everything below works without them.').count() === 1,
      `${W} provider off: the manual path is offered and says so`);
    const opening = await draftNow();
    const fileInput = panel.locator('input[type=file]');
    /** Choose a file as a person would, and wait for the server's answer before reading the screen. */
    const choose = async (name, text) => {
      const answered = page.waitForResponse(r => /\/uploads$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST');
      await fileInput.setInputFiles({ name, mimeType: 'text/csv', buffer: Buffer.from(text) });
      await answered;
      await page.waitForFunction(() => !document.querySelector('.sci08-panel .spin'));
    };

    // ── Refusals through the UI: each named in business language, nothing admitted ────────────
    for (const r of REFUSALS) {
      expectingRefusal = true;
      await choose(`extract-${r.label.replace(/\W+/g, '-')}.csv`, r.text);
      const alert = studio.getByRole('alert');
      await alert.waitFor();
      const text = await alert.innerText();
      expectingRefusal = false;
      const after = await draftNow();
      if (SHOTS && r === REFUSALS[0]) { await alert.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${SHOTS}/sci10-${width}-refusal.png` }); }
      assert(r.expect.test(text) && !LEAK.test(text) && !CELL_CANARIES.some(c => text.includes(c))
        && after.draft.content_hash === opening.draft.content_hash && after.draft.state === 'DRAFT',
        `${W} ${r.label} is refused in business language, with no id or cell value, and the draft is unchanged`, text.slice(0, 160));
    }

    // ── Upload → Map (profile, deterministic proposals) ──────────────────────────────────────
    await choose('chicken-weekly.csv', GOOD);
    const review = panel.locator('.sci10-review');
    await review.waitFor();
    const reviewText = await review.innerText();
    assert(/12 weeks, 24 May 2026 – 9 Aug 2026/.test(reviewText), `${W} the profile reads as a person would: 12 weeks and the dates they cover`, reviewText.slice(0, 120));
    const selects = review.locator('.sci10-map-row select');
    const proposals = await selects.evaluateAll(els => els.map(e => e.value));
    assert(proposals.length === 8 && proposals.every(Boolean), `${W} eight numeric columns, each matched to a scenario figure by its header`, JSON.stringify(proposals));
    assert(/Not used: period_end, sku_id, notes/.test(reviewText) && !CELL_CANARIES.some(c => reviewText.includes(c)),
      `${W} the grain and text columns are listed as not used, and no cell value is shown`);
    assert(!LEAK.test(await studio.innerText()), `${W} no internal id, fingerprint or system term anywhere in the studio`);
    assert(await overflow() <= 1, `${W} no horizontal page scroll at the mapping step`, String(await overflow()));
    if (SHOTS) { await panel.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${SHOTS}/sci10-${width}-map.png` }); }

    // Discard, then the same file again: the person resumes it — no dead duplicate they cannot see.
    await review.getByRole('button', { name: 'Discard' }).click();
    expectingRefusal = true;
    await choose('chicken-weekly.csv', GOOD);
    await review.waitFor();
    expectingRefusal = false;
    assert(/uploaded this file already/.test(await studio.innerText()) && (await review.locator('.sci10-map-row select').count()) === 8,
      `${W} the same file again is a duplicate — and the studio resumes it rather than refusing outright`);

    // ── Attest → Admit ───────────────────────────────────────────────────────────────────────
    const add = review.getByRole('button', { name: 'Add to scenario' });
    assert(await add.isDisabled(), `${W} nothing can be added until a person names the source and themselves and declares it`);
    await review.locator('#sci10-statement').fill('Weekly EPOS extract for chicken breast, exported from our sales ledger on Monday.');
    await review.locator('#sci10-attested-by').fill('Priya Shah');
    await review.getByRole('checkbox').check();
    await add.click();
    await panel.locator('.sci10-admitted').waitFor();
    const admittedDraft = await draftNow();
    const uploads = (await api(`/api/v1/scenarios/drafts/${draftId}/uploads?tenant_id=${TENANT}`)).body.data.uploads;
    const admittedUpload = uploads.find(u => u.state === 'ADMITTED');
    const values = Object.fromEntries(admittedUpload.admitted_values.map(v => [v.field, v.value]));
    const panelText = await panel.innerText();
    assert(values.base_demand_units_per_week === MEAN_BASE && values.national_store_count === 1437 && values.store_cover_days === 3.25
      && panelText.includes(units(MEAN_BASE)) && panelText.includes('average of 12 weeks') && panelText.includes('latest week')
      && /declared by Priya Shah/.test(panelText),
      `${W} admitted: the server's values, shown as the server reduced them (average of 12 weeks / latest week), declared by name`);
    const attestedFields = admittedDraft.field_provenance.filter(p => p.descriptor.origin === 'attested').map(p => p.field);
    assert(attestedFields.length === 8 && Object.entries(values).every(([f, v]) => admittedDraft.draft.inputs[f] === v),
      `${W} the draft holds exactly the admitted values, each with attested provenance`);
    const inventory = studio.locator('.sci08-readiness li', { hasText: 'Inventory position' });
    assert(/Ready/.test(await inventory.innerText()), `${W} Inventory position reads Ready — attested evidence, the existing readiness rule`);
    const sideText = await studio.locator('.sci08-review-side').innerText();
    assert(/came from data you uploaded and attested/.test(sideText) && !/verified(?! by CogniX)/i.test(sideText.replace(/not verified by CogniX/g, '')),
      `${W} "Where the numbers come from" says attested — never verified`);
    assert(admittedDraft.draft.state === 'DRAFT' && !(await api(`/api/v1/scenarios?tenant_id=${TENANT}`)).body.data.some(e => e.scenario_id === admittedDraft.scenario_id),
      `${W} still a DRAFT and not in the catalogue: admission confirmed, certified and activated nothing`);
    await studio.getByText('Your own figures (optional)').click();
    assert(await studio.locator('.sci10-field-tag').count() === 8, `${W} each figure from the file is tagged "From your data"`);
    if (SHOTS) { await panel.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${SHOTS}/sci10-${width}-admitted.png` }); }

    // ── Override: an edited attested value is stated ─────────────────────────────────────────
    await studio.locator('#sci08-field-store_cover_days').fill('4');
    await studio.getByRole('button', { name: 'Update assessment' }).click();
    await settle();
    const overridden = await draftNow();
    assert(overridden.field_provenance.find(p => p.field === 'store_cover_days').descriptor.origin === 'stated'
      && await studio.locator('.sci10-field-tag').count() === 7 && /Limited/.test(await inventory.innerText()),
      `${W} editing an attested figure makes it stated: the tag goes and Inventory position reads Limited`);
    await studio.locator('#sci08-field-store_cover_days').fill('3.25');
    await studio.getByRole('button', { name: 'Update assessment' }).click();
    await settle();
    assert(await studio.locator('.sci10-field-tag').count() === 8 && /Ready/.test(await inventory.innerText()),
      `${W} …and restoring the admitted value restores attested (derived, never stored)`);

    // ── Withdraw while a draft, then add it again ─────────────────────────────────────────────
    await panel.getByRole('button', { name: /Withdraw/ }).click();
    await page.waitForFunction(() => !document.querySelector('.sci10-admitted'));
    const withdrawn = await draftNow();
    assert(!withdrawn.field_provenance.some(p => p.descriptor.origin === 'attested') && !('base_demand_units_per_week' in withdrawn.draft.inputs)
      && await studio.locator('.sci10-field-tag').count() === 0 && /Modelled/.test(await inventory.innerText())
      && !/uploaded and attested/.test(await studio.locator('.sci08-review-side').innerText()),
      `${W} withdrawn: the figures return to CogniX's assumptions, and readiness and provenance recompute`);
    await choose('chicken-weekly.csv', GOOD);
    await review.waitFor();
    await review.locator('#sci10-statement').fill('Weekly EPOS extract for chicken breast, exported from our sales ledger on Monday.');
    await review.locator('#sci10-attested-by').fill('Priya Shah');
    await review.getByRole('checkbox').check();
    await review.getByRole('button', { name: 'Add to scenario' }).click();
    await panel.locator('.sci10-admitted').waitFor();
    const readmitted = (await api(`/api/v1/scenarios/drafts/${draftId}/uploads?tenant_id=${TENANT}`)).body.data.uploads.find(u => u.state === 'ADMITTED');
    assert(JSON.stringify(readmitted.admitted_values) === JSON.stringify(admittedUpload.admitted_values),
      `${W} the same file added again admits byte-identical values`);

    // ── HTTP refusals a person cannot make from the UI, against the same running server ─────────
    const probe = (await api('/api/v1/scenarios/drafts', { tenant_id: TENANT, situation: 'SUPPLIER_LEAD_TIME_RISK', inputs: { sku_id: 'P009' } })).body.data;
    const probeUp = (await apiUpload(probe.draft.draft_id, GOOD)).body.data.upload;
    const admitBody = over => ({ tenant_id: TENANT, upload_id: probeUp.upload_id, expected_content_sha256: probeUp.content_sha256,
      mapping: probeUp.profile.columns.filter(c => c.proposed_field).map(c => ({ header: c.header, field: c.proposed_field })),
      attestation: { attested_by: 'Priya Shah', attestation_statement: 'Weekly EPOS extract', attestation_kind: 'FIRST_PARTY_OPERATOR_ATTESTATION' }, ...over });
    const changed = await api(`/api/v1/scenarios/drafts/${probe.draft.draft_id}/uploads/${probeUp.upload_id}/admit`, admitBody({ expected_content_sha256: '0'.repeat(64) }));
    const forged = await api(`/api/v1/scenarios/drafts/${probe.draft.draft_id}/uploads/${probeUp.upload_id}/admit`, admitBody({ attestation_id: 'att_forged' }));
    const coefficient = await api(`/api/v1/scenarios/drafts/${probe.draft.draft_id}/uploads/${probeUp.upload_id}/admit`,
      admitBody({ mapping: [{ header: 'base_demand_units', field: 'promotional_response_pp_per_depth_point' }] }));
    const foreign = await api(`/api/v1/scenarios/drafts/${draftId}/uploads?tenant_id=${OTHER}`);
    const missing = await api(`/api/v1/scenarios/drafts/DRAFT-0000000000/uploads?tenant_id=${OTHER}`);
    const probeAfter = (await api(`/api/v1/scenarios/drafts/${probe.draft.draft_id}?tenant_id=${TENANT}`)).body.data;
    assert(changed.body.reason === 'CONTENT_CHANGED' && forged.body.reason === 'SERVER_FIELD_ASSERTED' && coefficient.body.reason === 'FIELD_NOT_ADMISSIBLE'
      && probeAfter.draft.content_hash === probe.draft.content_hash,
      `${W} over HTTP: a changed fingerprint, a forged server field and an estimated coefficient are refused, and nothing is admitted`);
    assert(foreign.status === 404 && missing.status === 404 && foreign.body.reason === missing.body.reason && foreign.body.message === missing.body.message,
      `${W} another tenant cannot see this draft's uploads — indistinguishable from a draft that does not exist`);
    const repro = (await api(`/api/v1/scenarios/drafts/${probe.draft.draft_id}/uploads/${probeUp.upload_id}/admit`, admitBody({}))).body.data;
    assert(JSON.stringify(repro.upload.admitted_values) === JSON.stringify(admittedUpload.admitted_values),
      `${W} reproduction: the same file on a NEW draft admits byte-identical values`);

    // ── Confirm → catalogue ───────────────────────────────────────────────────────────────────
    await studio.getByRole('button', { name: 'Review and confirm' }).click();
    const confirmText = await studio.innerText();
    assert(/came from data you uploaded and attested/.test(confirmText) && !LEAK.test(confirmText),
      `${W} the confirmation step states which figures are attested, with no internal id`);
    await studio.locator('#sci08-confirmed-by').fill('Priya Shah');
    await studio.getByRole('checkbox').check();
    await studio.getByRole('button', { name: 'Confirm and certify' }).click();
    await studio.getByText('is certified and in your scenario catalogue').waitFor();
    const catalogue = (await api(`/api/v1/scenarios?tenant_id=${TENANT}`)).body;
    const entry = catalogue.data.find(e => e.scenario_name === NAME);
    const ID = entry && entry.scenario_id;
    attested[width] = ID;
    assert(!!entry && entry.certification_state === 'CERTIFIED' && catalogue.active_scenario_id === REFERENCE,
      `${W} confirmed → certified by the unchanged gate, in the catalogue, and NOT running yet`);
    const confirmedDraft = await draftNow();
    assert(confirmedDraft.draft.state === 'CONFIRMED' && confirmedDraft.field_provenance.filter(p => p.descriptor.origin === 'attested').length === 8,
      `${W} the confirmed draft keeps its attested provenance`);

    // ── Run → Understand ──────────────────────────────────────────────────────────────────────
    await studio.getByRole('button', { name: 'Run this scenario' }).click();
    await studio.getByRole('heading', { name: /Now running:/ }).waitFor();
    const truth = (await api(`/api/v1/scenarios/decision?scenario_id=${ID}&tenant_id=${TENANT}`)).body.data;
    const understand = await studio.innerText();
    assert(understand.includes(`${units(truth.exposedGap)} units`) && understand.includes(`${units(truth.expectedDemand)} units`)
      && understand.includes(money(truth.revenueExposureGbp)) && understand.includes(money(truth.marginExposureGbp))
      && understand.includes(`${truth.recommendedDepth}% recommended`) && understand.includes(`${truth.windowRemainingHours} hours`),
      `${W} Understand renders the authoritative evaluator's figures exactly`, JSON.stringify(truth));
    const record = (await api(`/api/v1/scenarios/record?scenario_id=${ID}&tenant_id=${TENANT}`)).body.data;
    assert(record.demand.base_demand_units_per_week === MEAN_BASE && record.estate.national_store_count === 1437,
      `${W} the running record carries the admitted weekly demand (${units(MEAN_BASE)}) and store count (1,437)`);
    assert(/Attested/.test(understand) && /Un-promoted weekly demand/.test(understand) && /not verified by CogniX/.test(understand) && !LEAK.test(understand),
      `${W} Understand names the attested inputs — declared by a person, not verified — and shows no internal id`);
    assert(await overflow() <= 1, `${W} no horizontal page scroll at Understand`, String(await overflow()));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/sci10-${width}-understand.png` });
    await studio.getByRole('button', { name: 'Done' }).click();
    await studio.waitFor({ state: 'detached' });

    const active = (await api(`/api/v1/scenarios?tenant_id=${TENANT}`)).body.active_scenario_id;
    assert(active === ID, `${W} server active scenario = the attested scenario`, active);
    await page.waitForFunction(() => /British Chicken Breast 640g/.test(document.querySelector('.scenario-context-strip')?.textContent || ''));
    assert(true, `${W} browser projection resolves it — the context strip names its product`);

    // ── Cross-surface truth ───────────────────────────────────────────────────────────────────
    scoped.length = 0;
    await go(/Demand & Forecast/);
    await page.waitForTimeout(1500);
    const demand = await page.locator('main, body').first().innerText();
    await go(/Promotion/);
    const promotion = await page.locator('main, body').first().innerText();
    await go(/Campaign Decision/);
    await page.waitForTimeout(1500);
    const campaign = await page.locator('main, body').first().innerText();
    await go(/Architecture/);
    const sel = page.locator('#arch-scenario-selector');
    await sel.waitFor();
    await page.waitForTimeout(1500);
    const arch = await page.locator('body').innerText();
    const wrong = scoped.filter(s => s.requested !== ID || (s.served && s.served !== ID));
    assert(scoped.length > 0 && wrong.length === 0,
      `${W} every scenario-scoped request the surfaces made named the attested scenario, and every response served it (${scoped.length} requests: ${[...new Set(scoped.map(s => s.path))].join(', ')})`,
      JSON.stringify(wrong.slice(0, 3)));
    const signals = (await api(`/api/v1/signals/current?scenario_id=${ID}&tenant_id=${TENANT}`)).body;
    assert(signals.service === 'cognix-world' && signals.scenario_id === ID, `${W} signal scenario = attested scenario, generated by cognix-world`);
    assert(await sel.inputValue() === ID && (await sel.locator('option:checked').innerText()) === NAME, `${W} Architecture is on the attested scenario, by name`);
    assert(arch.includes(units(truth.exposedGap)), `${W} Architecture publishes the evaluator's exposed gap ${units(truth.exposedGap)}`);
    for (const [label, text] of [['Demand & Forecast', demand], ['Promotion', promotion], ['Campaign Decision', campaign], ['Architecture', arch]]) {
      assert(!/900,125|130,125|770,000/.test(text), `${W} ${label} carries no Fresh Dairy figure from the previously selected scenario`);
      assert(!CELL_CANARIES.some(c => text.includes(c)), `${W} ${label} shows no raw cell from the uploaded file`);
    }
    assert(await overflow() <= 1, `${W} Architecture: no horizontal page scroll`, String(await overflow()));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/sci10-${width}-architecture.png` });

    // ── Back to the curated estate ────────────────────────────────────────────────────────────
    for (const [id, marker] of [[SALMON, /Salmon/], [REFERENCE, /Cheddar Mature 400g/]]) {
      await openSelector();
      const dialog = page.getByRole('dialog').first();
      const name = catalogue.data.find(e => e.scenario_id === id).scenario_name;
      const card = dialog.locator('div', { hasText: name }).filter({ has: page.getByRole('button', { name: /Select/ }) }).last();
      await card.getByRole('button', { name: /Select/ }).click();
      await dialog.waitFor({ state: 'detached' });
      await page.waitForFunction(src => new RegExp(src).test(document.querySelector('.scenario-context-strip')?.textContent || ''), marker.source);
      assert((await api(`/api/v1/scenarios?tenant_id=${TENANT}`)).body.active_scenario_id === id, `${W} curated ${id} selectable and running`);
    }
    await go(/Architecture/);
    await page.waitForTimeout(1500);
    const archDairy = await page.locator('body').innerText();
    assert(archDairy.includes('130,125'), `${W} back on Fresh Dairy, the Architecture publishes its own 130,125`);

    assert(problems.length === 0, `${W} zero application console errors and zero projection disagreements`, problems.join(' | ').slice(0, 400));
    assert(http5xx.length === 0, `${W} no 5xx`, http5xx.join(' | '));
    assert(keyWarnings.length === 0, `${W} zero React key warnings`);
    assert(unexpected4xx.length === 0 && expected4xx.length === REFUSALS.length + 1 && expected4xx.every(x => /\/uploads$/.test(x)),
      `${W} the only 4xx responses are the ${REFUSALS.length + 1} deliberate upload refusals`, JSON.stringify({ expected4xx, unexpected4xx }));
    console.log(`INFO ${W} environmental console lines (sandbox refuses Google Fonts): ${environmental.length}`);
    await ctx.close();
  }

  await browser.close();
  console.log(`ATTESTED_IDS=${JSON.stringify(attested)}`);
  console.log(`=== SCI-10 browser acceptance: ${passed} passed, ${failed} failed ===`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('[FAIL] crashed —', e); process.exit(1); });
