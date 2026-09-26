#!/usr/bin/env node
/**
 * `R-SCI10-3` production browser smoke — the credential stays on the server.
 *
 * Against a RUNNING production estate (standalone BFF in `service` mode, `cognix-world`,
 * `cognix-learning`), at 1440 and 720:
 *   - the manual path runs: Create → Review → Confirm → Run → Understand;
 *   - the upload path loads: the "Use your own data" card profiles an extract;
 *   - PROVIDER=off: AI drafting is reported unavailable, safely; PROVIDER=on: it is offered (never clicked
 *     here — the one controlled live request is made server-side, separately);
 *   - EVERY response body the browser receives — HTML, scripts, JSON — is searched for the credential's
 *     value and for a NEXT_PUBLIC_* credential name. The value is read from SECRET_ENV_FILE (default
 *     `.env`) only to compare against, and is never printed.
 *
 *   PROVIDER=off|on node scripts/sci10-secret-boundary-smoke.cjs
 */
const { readFileSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const B = process.env.BFF_URL || 'http://127.0.0.1:3000';
const PROVIDER = process.env.PROVIDER === 'on' ? 'on' : 'off';

const secretLine = readFileSync(process.env.SECRET_ENV_FILE || '.env', 'utf8').split(/\r?\n/).find(l => /^GEMINI_API_KEY=/.test(l)) || '';
const SECRET = secretLine.slice('GEMINI_API_KEY='.length).trim().replace(/^(['"])(.*)\1$/, '$2');

let passed = 0, failed = 0;
const assert = (ok, name, detail) => {
  if (ok) { console.log(`[PASS] ${name}`); passed++; }
  else { console.error(`[FAIL] ${name} — ${String(detail ?? '').split(SECRET).join('[REDACTED]')}`); failed++; }
};
const weeks = Array.from({ length: 12 }, (_, k) => new Date(Date.parse('2026-08-09T00:00:00Z') - (11 - k) * 7 * 86_400_000).toISOString().slice(0, 10));
const EXTRACT = ['period_end,sku_id,base_demand_units,store_count,store_cover_days',
  ...weeks.map((w, k) => `${w},P009,${58213 + k * 611},${k === 11 ? 1437 : 1431},${k === 11 ? 3.25 : 3}`)].join('\n') + '\n';

(async () => {
  assert(SECRET.length >= 16, 'a credential value is available locally to search for (it is compared, never printed)');
  const authoring = await (await fetch(`${B}/api/v1/scenarios/authoring`)).json();
  assert(authoring.data.genai_drafting_available === (PROVIDER === 'on'),
    `the server reports AI drafting ${PROVIDER === 'on' ? 'AVAILABLE — the key was injected at runtime' : 'UNAVAILABLE — no key in the process or the artefact'}`);

  const browser = await chromium.launch(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {});
  for (const width of [1440, 720]) {
    const W = `@${width} provider-${PROVIDER}`;
    await fetch(`${B}/api/v1/scenarios`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scenario_id: 'SCN-FRESH-DAIRY-CHEDDAR-001' }) });
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    page.setDefaultTimeout(25000);
    const leaks = [], publicNames = [], errors = [], http5xx = [];
    let bodies = 0;
    page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_CERT/.test(m.text())) errors.push(m.text()); });
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', async r => {
      if (r.status() >= 500) http5xx.push(`${r.status()} ${new URL(r.url()).pathname}`);
      try {
        const body = await r.body();
        bodies += 1;
        if (body.indexOf(SECRET) !== -1) leaks.push(new URL(r.url()).pathname);
        if (/NEXT_PUBLIC_[A-Z_]*GEMINI|NEXT_PUBLIC_[A-Z_]*(API_?KEY|SECRET|TOKEN)/.test(body.toString('latin1'))) publicNames.push(new URL(r.url()).pathname);
      } catch { /* redirects and aborted requests have no body */ }
    });
    const openNav = async () => {
      const t = page.getByRole('button', { name: 'Open navigation' });
      if (await t.count() && await t.first().isVisible()) { await t.first().click(); await page.waitForTimeout(400); }
    };

    await page.goto(`${B}/`, { waitUntil: 'networkidle' });
    await page.locator('.scenario-context-strip').first().waitFor();
    await openNav();
    await page.getByRole('button', { name: 'Change scenario' }).first().click();
    await page.getByRole('button', { name: /Create your own/ }).click();
    const studio = page.getByRole('dialog', { name: 'Create your own scenario' });
    await studio.waitFor();
    await studio.getByRole('radio', { name: /supplier cannot land the volume/i }).click();
    await studio.locator('#sci08-product').selectOption('P009');
    await studio.getByRole('button', { name: 'Start' }).click();
    await studio.getByRole('heading', { name: 'What CogniX can answer' }).waitFor();

    if (PROVIDER === 'off') {
      assert(await studio.getByText('AI suggestions are not available here. Everything below works without them.').count() === 1,
        `${W} provider off is safe: the studio says AI is unavailable and offers the manual path`);
    } else {
      assert(await studio.getByRole('button', { name: /Suggest a structure/ }).count() === 1,
        `${W} provider injected at runtime: the studio offers AI suggestions (not clicked in the browser)`);
    }

    // Upload path loads and profiles an extract.
    const panel = studio.locator('.sci10-upload');
    await panel.locator('input[type=file]').setInputFiles({ name: 'chicken-weekly.csv', mimeType: 'text/csv', buffer: Buffer.from(EXTRACT) });
    await panel.locator('.sci10-review').waitFor();
    assert(/12 weeks/.test(await panel.innerText()) && await panel.locator('.sci10-map-row select').count() === 3,
      `${W} the upload path loads: the extract is profiled and its columns matched`);
    await panel.getByRole('button', { name: 'Discard' }).click();

    // Manual path end to end.
    await studio.locator('#sci08-field-scenario_name').fill(`Secret-boundary smoke ${PROVIDER} ${width}`);
    await studio.getByRole('button', { name: 'Update assessment' }).click();
    await page.waitForFunction(() => !document.querySelector('.sci08-panel')?.textContent?.includes('You have changes'));
    await studio.getByRole('button', { name: 'Review and confirm' }).click();
    await studio.locator('#sci08-confirmed-by').fill('Smoke Operator');
    await studio.getByRole('checkbox').check();
    await studio.getByRole('button', { name: 'Confirm and certify' }).click();
    await studio.getByText('is certified and in your scenario catalogue').waitFor();
    await studio.getByRole('button', { name: 'Run this scenario' }).click();
    await studio.getByRole('heading', { name: /Now running:/ }).waitFor();
    assert(/Decision Gap/i.test(await studio.innerText()), `${W} the manual path runs: Create → Review → Confirm → Run → Understand`);
    await studio.getByRole('button', { name: 'Done' }).click();

    const html = await page.content();
    assert(bodies > 20 && leaks.length === 0 && !html.includes(SECRET),
      `${W} no response the browser received (${bodies} bodies: HTML, scripts, JSON) and not the rendered page contain the credential`, leaks.join(', '));
    assert(publicNames.length === 0, `${W} no NEXT_PUBLIC_* credential name in anything served`, publicNames.join(', '));
    assert(errors.length === 0 && http5xx.length === 0, `${W} no console error and no 5xx`, [...errors, ...http5xx].join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log(`=== R-SCI10-3 secret-boundary smoke (provider ${PROVIDER}): ${passed} passed, ${failed} failed ===`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('[FAIL] crashed —', String(e?.stack ?? e).split(SECRET).join('[REDACTED]')); process.exit(1); });
