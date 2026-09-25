#!/usr/bin/env node
/**
 * `SCI-08` browser acceptance — Create → Review → Confirm → Run → Understand, through the real UI,
 * against a RUNNING production estate (BFF in `COGNIX_WORLD_MODE=service`, `cognix-world`,
 * `cognix-learning`). Built with `NEXT_PUBLIC_COGNIX_DEMO_MODE=true`, the demonstration configuration.
 *
 * Nothing is injected: every scenario is authored through the experience a person uses. Cross-surface
 * truth is proven from the NETWORK — every scenario-scoped request the surfaces make, and every response —
 * and from quantitative values, not labels.
 *
 * Requires Playwright. PLAYWRIGHT_MODULE may name its location (a global install is not on the module path).
 *   node scripts/sci08-browser-acceptance.cjs            → prints AUTHORED_IDS=<json> for the restart checks
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const B = process.env.BFF_URL || 'http://127.0.0.1:3000';
const SHOTS = process.env.SHOT_DIR || null;
const REFERENCE = 'SCN-FRESH-DAIRY-CHEDDAR-001';
const SALMON = 'SCN-CHILLED-SALMON-002';

let passed = 0, failed = 0;
const assert = (ok, name, detail) => {
  if (ok) { console.log(`[PASS] ${name}`); passed++; }
  else { console.error(`[FAIL] ${name} — ${detail ?? ''}`); failed++; }
};
const api = async (path, body) => {
  const r = await fetch(B + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
  return { status: r.status, body: await r.json().catch(() => null) };
};
const money = n => n >= 1_000_000 ? `£${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `£${(n / 1_000).toFixed(1)}K` : `£${n}`;
const units = n => n.toLocaleString('en-GB');

(async () => {
  const browser = await chromium.launch();
  const authored = {};

  for (const width of [1440, 1024, 720]) {
    const W = `@${width}`;
    await api('/api/v1/scenarios', { scenario_id: REFERENCE });
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    page.setDefaultTimeout(25000);
    const problems = [], http5xx = [], keyWarnings = [], environmental = [], scoped = [], expectedRefusals = [];
    let expectingRefusal = false;
    page.on('console', m => {
      const t = m.text();
      if (/ERR_CERT_AUTHORITY_INVALID/.test(t)) { environmental.push(t); return; }
      if (expectingRefusal && /status of 422/.test(t)) { expectedRefusals.push(t); return; }
      if (/unique "key"|same key/i.test(t)) keyWarnings.push(t);
      if (m.type() === 'error' || /does not know|did not publish a certified record|Could not project|Could not mirror/.test(t)) problems.push(`${m.type()}: ${t}`);
    });
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('response', async r => {
      if (r.status() >= 500) http5xx.push(`${r.status()} ${r.url()}`);
      const u = new URL(r.url());
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
    const strip = () => page.locator('.scenario-context-strip').first().innerText();
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

    await page.goto(B + '/', { waitUntil: 'networkidle' });
    await page.locator('.scenario-context-strip').first().waitFor();
    assert((await strip()).includes('Cheddar Mature 400g'), `${W} opens on Fresh Dairy`);

    // ── Selector, now rendered over the viewport rather than inside the drawer ────────────────
    await openSelector();
    const selector = page.getByRole('dialog').first();
    await selector.waitFor();
    const sBox = await selector.boundingBox();
    assert(sBox && sBox.width >= Math.min(width - 32, 560) - 1 && sBox.x + sBox.width <= width + 1,
      `${W} scenario selector uses the viewport, not the drawer (R-SCI07R-6)`, JSON.stringify(sBox));
    await page.getByRole('button', { name: /Create your own/ }).click();

    // ── Create ─────────────────────────────────────────────────────────────────────────────
    const studio = page.getByRole('dialog', { name: 'Create your own scenario' });
    await studio.waitFor();
    await studio.getByRole('radio', { name: /supplier cannot land the volume/i }).click();
    await studio.locator('#sci08-product').selectOption('P009');
    await studio.getByRole('button', { name: 'Start' }).click();

    // ── Review ─────────────────────────────────────────────────────────────────────────────
    await studio.getByRole('heading', { name: 'What CogniX can answer' }).waitFor();
    assert(await studio.getByText('AI suggestions are not available here. Everything below works without them.').count() === 1,
      `${W} with no provider configured, the manual path is offered and says so`);
    const NAME = `Chicken breast supply squeeze across the national estate before the bank holiday weekend (${width})`;
    await studio.locator('#sci08-field-scenario_name').fill(NAME);
    await studio.locator('#sci08-field-decision_question').fill('Do we hold the promotion or pay to accelerate supply?');
    await studio.getByRole('button', { name: 'Update assessment' }).click();
    await page.waitForFunction(() => !document.querySelector('.sci08-panel')?.textContent?.includes('You have changes'));
    const readiness = await studio.locator('.sci08-readiness li').count();
    assert(readiness >= 4, `${W} readiness is shown per capability, from the server`, String(readiness));
    const reviewText = await studio.innerText();
    assert(!/SCN-|DRAFT-|registry|tenant|cognix-world/i.test(reviewText), `${W} review shows no internal id or system term`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/sci08-${width}-review.png` });
    assert(await overflow() <= 1, `${W} no horizontal page scroll with the studio open`, String(await overflow()));

    // ── Confirm ────────────────────────────────────────────────────────────────────────────
    await studio.getByRole('button', { name: 'Review and confirm' }).click();
    await studio.locator('#sci08-confirmed-by').fill('Acceptance Owner');
    await studio.getByRole('checkbox').check();
    await studio.getByRole('button', { name: 'Confirm and certify' }).click();
    await studio.getByText('is certified and in your scenario catalogue').waitFor();
    const confirmedText = await studio.innerText();
    assert(!/SCN-|DRAFT-/.test(confirmedText), `${W} certification is reported by name, not id`);

    const catalogue = (await api('/api/v1/scenarios')).body;
    const entry = catalogue.data.find(e => e.scenario_name === NAME);
    assert(!!entry && entry.certification_state === 'CERTIFIED' && catalogue.active_scenario_id === REFERENCE,
      `${W} confirmed → certified, in the catalogue, and NOT running yet`);
    const ID = entry?.scenario_id;
    authored[width] = ID;

    // ── Run + Understand ───────────────────────────────────────────────────────────────────
    await studio.getByRole('button', { name: 'Run this scenario' }).click();
    await studio.getByRole('heading', { name: /Now running:/ }).waitFor();
    const truth = (await api(`/api/v1/scenarios/decision?scenario_id=${ID}`)).body.data;
    const understand = await studio.innerText();
    assert(understand.includes(`${units(truth.exposedGap)} units`) && understand.includes(`${units(truth.expectedDemand)} units`)
      && understand.includes(money(truth.revenueExposureGbp)) && understand.includes(money(truth.marginExposureGbp))
      && understand.includes(`${truth.recommendedDepth}% recommended`) && understand.includes(`${truth.windowRemainingHours} hours`),
      `${W} Understand renders the authoritative evaluator's figures exactly`, JSON.stringify(truth));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/sci08-${width}-understand.png` });
    await studio.getByRole('button', { name: 'Done' }).click();
    await studio.waitFor({ state: 'detached' });

    const active = (await api('/api/v1/scenarios')).body.active_scenario_id;
    assert(active === ID, `${W} server active scenario = the authored scenario`, active);
    await page.waitForFunction(() => /British Chicken Breast 640g/.test(document.querySelector('.scenario-context-strip')?.textContent || ''));
    assert(true, `${W} browser projection resolves it — the context strip names its product`);

    // ── Cross-surface truth: every surface, every scenario-scoped request, every figure ────────
    scoped.length = 0;
    await go(/Demand & Forecast/);
    await page.waitForTimeout(1500);
    const demand = await page.locator('main, body').first().innerText();
    await go(/Promotion/);
    const promotion = await page.locator('main, body').first().innerText();
    const skuSelected = await page.evaluate(() => [...document.querySelectorAll('select')]
      .filter(s => [...s.options].some(o => /\(P009\)/.test(o.text)))
      .map(s => s.options[s.selectedIndex]?.text ?? ''));
    assert(skuSelected.length > 0 && skuSelected.every(t => /\(P009\)/.test(t)),
      `${W} the Promotion planner's selected product is the authored scenario's`, JSON.stringify(skuSelected));
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
      `${W} every scenario-scoped request the surfaces made named the authored scenario, and every response served it (${scoped.length} requests: ${[...new Set(scoped.map(s => s.path))].join(', ')})`,
      JSON.stringify(wrong.slice(0, 3)));
    const signalCalls = scoped.filter(s => s.path === '/api/v1/signals/current');
    const signals = (await api(`/api/v1/signals/current?scenario_id=${ID}`)).body;
    assert(signals.service === 'cognix-world' && signals.scenario_id === ID && (signalCalls.length === 0 || signalCalls.every(s => s.served === ID)),
      `${W} signal scenario = authored scenario, generated by cognix-world`);
    assert(await sel.inputValue() === ID && (await sel.locator('option:checked').innerText()) === NAME,
      `${W} Architecture is on the authored scenario, labelled by name`);
    assert(arch.includes(units(truth.exposedGap)), `${W} Architecture publishes the evaluator's exposed gap ${truth.exposedGap}`);
    assert(demand.includes('British Chicken Breast') || demand.includes('Chicken Breast'), `${W} Demand & Forecast shows the authored product`);
    // Figures, not names: the Promotion planner lists every product in the master, Cheddar included.
    for (const [label, text] of [['Demand & Forecast', demand], ['Promotion', promotion], ['Campaign Decision', campaign], ['Architecture', arch]]) {
      assert(!/900,125|130,125|770,000/.test(text), `${W} ${label} carries no Fresh Dairy figure from the previously selected scenario`);
    }
    assert(!/Cheddar Mature 400g/.test(demand) && !/Cheddar Mature 400g/.test(arch) && !/Cheddar Mature 400g/.test(campaign),
      `${W} Demand & Forecast, Campaign Decision and Architecture name nothing from the previously selected scenario`);
    assert(await overflow() <= 1, `${W} Architecture: no horizontal page scroll with a long authored name (R-SCI07R-6)`, String(await overflow()));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/sci08-${width}-architecture.png` });
    assert(!/AI (calculated|certified|activated|confirmed)|GenAI (calculates|certifies|activates|confirms)/i.test(arch + demand + promotion + campaign),
      `${W} no GenAI authority claim on any surface`);

    // ── An invalid scenario: refused with a useful message, and nothing moves ─────────────────
    const before = (await api('/api/v1/scenarios')).body;
    await openSelector();
    await page.getByRole('button', { name: /Create your own/ }).click();
    await studio.waitFor();
    await studio.getByRole('radio', { name: /committed promotion is pulling demand/i }).click();
    await studio.locator('#sci08-product').selectOption('P004');
    await studio.getByRole('button', { name: 'Start' }).click();
    await studio.getByRole('heading', { name: 'What CogniX can answer' }).waitFor();
    await studio.getByText('Your own figures (optional)').click();
    await studio.locator('#sci08-field-promotion_participation_pct').fill('1');
    await studio.getByRole('button', { name: 'Update assessment' }).click();
    await page.waitForFunction(() => !document.querySelector('.sci08-panel')?.textContent?.includes('You have changes'));
    await studio.getByRole('button', { name: 'Review and confirm' }).click();
    await studio.locator('#sci08-confirmed-by').fill('Acceptance Owner');
    await studio.getByRole('checkbox').check();
    expectingRefusal = true;
    await studio.getByRole('button', { name: 'Confirm and certify' }).click();
    const refusal = studio.getByRole('alert');
    await refusal.waitFor();
    expectingRefusal = false;
    const refusalText = await refusal.innerText();
    assert(/does not pass CogniX certification/.test(refusalText) && /nothing was added to your catalogue/.test(refusalText)
      && refusalText.split('\n').length > 1 && !/No earlier dimension failed/.test(refusalText),
      `${W} an invalid scenario is refused with the reasons named`, refusalText.slice(0, 200));
    assert(!/SCN-|\bC-\d/.test(refusalText), `${W} the refusal shows no internal id or dimension code`);
    const after = (await api('/api/v1/scenarios')).body;
    assert(after.count === before.count && after.active_scenario_id === ID,
      `${W} refused: no catalogue entry, nothing activated, the running scenario unchanged`);
    await studio.getByRole('button', { name: 'Close' }).click();

    // ── The existing demo is intact ──────────────────────────────────────────────────────────
    for (const [id, marker] of [[SALMON, /Salmon/], [REFERENCE, /Cheddar Mature 400g/]]) {
      await openSelector();
      const dialog = page.getByRole('dialog').first();
      const name = catalogue.data.find(e => e.scenario_id === id).scenario_name;
      const card = dialog.locator('div', { hasText: name }).filter({ has: page.getByRole('button', { name: /Select/ }) }).last();
      await card.getByRole('button', { name: /Select/ }).click();
      await dialog.waitFor({ state: 'detached' });
      await page.waitForFunction(src => new RegExp(src).test(document.querySelector('.scenario-context-strip')?.textContent || ''), marker.source);
      assert((await api('/api/v1/scenarios')).body.active_scenario_id === id, `${W} curated ${id} selectable and running`);
    }
    await go(/Architecture/);
    await page.waitForTimeout(1500);
    const archDairy = await page.locator('body').innerText();
    assert(archDairy.includes('130,125') && !archDairy.includes(units(truth.exposedGap) + ' exposed'),
      `${W} back on Fresh Dairy, the Architecture publishes its own 130,125 and nothing of the authored scenario`);

    assert(problems.length === 0, `${W} zero application console errors and zero projection disagreements`, problems.join(' | ').slice(0, 400));
    assert(http5xx.length === 0, `${W} no 5xx`, http5xx.join(' | '));
    assert(keyWarnings.length === 0, `${W} zero React key warnings`);
    assert(expectedRefusals.length === 1, `${W} the only 4xx logged is the one deliberate refusal (422)`, String(expectedRefusals.length));
    console.log(`INFO ${W} environmental console lines (sandbox proxy refuses Google Fonts): ${environmental.length}`);
    await ctx.close();
  }

  await browser.close();
  console.log(`AUTHORED_IDS=${JSON.stringify(authored)}`);
  console.log(`=== SCI-08 browser acceptance: ${passed} passed, ${failed} failed ===`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('[FAIL] crashed —', e); process.exit(1); });
