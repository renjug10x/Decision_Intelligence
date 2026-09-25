/**
 * `SCI-08` — Create Your Own Scenario Experience.
 *
 * Two halves. The browser TRANSPORT the experience uses is driven end to end against the REAL route
 * handlers — a same-origin `fetch` is routed to them in-process, so nothing is mocked but the network
 * hop — through create → update → confirm → run → understand, and through a refusal. Then the
 * experience's SOURCE is held to the authority boundaries ADR-083 and ADR-085 set, because a component
 * that quietly calculates, certifies or activates is exactly what a lane suite would not notice.
 *
 * The rendered journey at 1440 / 1024 / 720 is `scripts/sci08-browser-acceptance.cjs`.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

process.env.COGNIX_WORLD_MODE = 'local';
delete process.env.GEMINI_API_KEY;

const ROOT = join(__dirname, '..', '..');
const REFERENCE_ID = 'SCN-FRESH-DAIRY-CHEDDAR-001';
let passed = 0;
let failed = 0;
function assert(condition: boolean, name: string, detail?: string) {
  if (condition) { console.log(`[PASS] ${name}`); passed++; }
  else { console.error(`[FAIL] ${name} — ${detail ?? 'assertion failed'}`); failed++; }
}
const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
const codeOf = (rel: string) => stripComments(readFileSync(join(ROOT, rel), 'utf8'));

async function run() {
  const { NextRequest } = await import('next/server');
  const authoringRoute = await import('../../app/api/v1/scenarios/authoring/route');
  const draftsRoute = await import('../../app/api/v1/scenarios/drafts/route');
  const draftRoute = await import('../../app/api/v1/scenarios/drafts/[id]/route');
  const confirmRoute = await import('../../app/api/v1/scenarios/drafts/[id]/confirm/route');
  const assistRoute = await import('../../app/api/v1/scenarios/drafts/[id]/assist/route');
  const catalogueRoute = await import('../../app/api/v1/scenarios/route');
  const recordRoute = await import('../../app/api/v1/scenarios/record/route');
  const decisionRoute = await import('../../app/api/v1/scenarios/decision/route');
  const runtime = await import('../../lib/scenario-runtime');
  const { evaluateAuthoritativeScenarioDecision } = await import('../../lib/canonical-decision-evaluator');
  const transport = await import('../../lib/scenario-authoring-client');
  const { activateScenarioOnServer, fetchScenarioCatalogue } = await import('../../lib/world-client');
  const { projectScenarioFromServer, syncActiveScenario } = await import('../../lib/scenario-client-registry');

  /* Same-origin fetch, routed to the real handlers. */
  const calls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    calls.push(`${init?.method ?? 'GET'} ${url.pathname}`);
    const req = new NextRequest(url, { method: init?.method ?? 'GET', headers: init?.headers as HeadersInit, body: init?.body as BodyInit | undefined });
    const draft = url.pathname.match(/^\/api\/v1\/scenarios\/drafts\/([^/]+)(\/(assist|confirm))?$/);
    const ctx = draft ? { params: Promise.resolve({ id: decodeURIComponent(draft[1]) }) } : undefined;
    const method = init?.method ?? 'GET';
    if (url.pathname === '/api/v1/scenarios/authoring') return authoringRoute.GET();
    if (url.pathname === '/api/v1/scenarios/drafts') return method === 'POST' ? draftsRoute.POST(req) : draftsRoute.GET(req);
    if (draft && draft[3] === 'confirm') return confirmRoute.POST(req, ctx as any);
    if (draft && draft[3] === 'assist') return assistRoute.POST(req, ctx as any);
    if (draft) return method === 'PATCH' ? draftRoute.PATCH(req, ctx as any) : draftRoute.GET(req, ctx as any);
    if (url.pathname === '/api/v1/scenarios') return method === 'POST' ? catalogueRoute.POST(req) : catalogueRoute.GET(req);
    if (url.pathname === '/api/v1/scenarios/record') return recordRoute.GET(req);
    if (url.pathname === '/api/v1/scenarios/decision') return decisionRoute.GET(req);
    return new Response(JSON.stringify({ status: 'error', message: `unrouted ${url.pathname}` }), { status: 404 });
  }) as typeof fetch;

  // ═════════════════════════════════════════════════════════════════════════════
  console.log('\n=== A. CREATE → REVIEW → CONFIRM → RUN → UNDERSTAND, THROUGH THE TRANSPORT ==\n');

  const options = await transport.fetchAuthoringOptions();
  assert(options.situations.length === 3 && options.products.length > 0 && options.manual_authoring_available,
    'A1: The experience opens on the governed situations and product master');
  assert(options.genai_drafting_available === false,
    'A2: With no credential the server reports AI suggestions unavailable — and the manual path is still offered');

  const created = await transport.createScenarioDraft('SUPPLIER_LEAD_TIME_RISK', { sku_id: 'P009' });
  assert(created.draft.state === 'DRAFT' && created.readiness.length >= 4 && !!created.provenance_statement,
    'A3: Create returns the server\'s draft, readiness per capability and provenance — nothing computed client-side');
  const NAME = 'Chicken breast lead-time squeeze';
  const reviewed = await transport.updateScenarioDraft(created.draft.draft_id, { scenario_name: NAME, national_store_count: 1200 });
  assert(reviewed.draft.inputs.scenario_name === NAME && reviewed.draft.inputs.national_store_count === 1200
    && reviewed.field_provenance.find(p => p.field === 'national_store_count')?.descriptor.origin === 'stated',
    'A4: Review edits reach the draft, and a figure the author enters is recorded as stated by them');

  let assistRefused: unknown = null;
  try { await transport.requestDraftAssistance(created.draft.draft_id, 'Chicken supply is late and the promotion is live.'); }
  catch (e) { assistRefused = e; }
  assert(assistRefused instanceof transport.AuthoringRequestError && (assistRefused as any).status === 503
    && !/AIza|key=/i.test((assistRefused as Error).message),
    'A5: Asking for AI help with no provider is a clean refusal that points to the manual path and leaks no secret');

  const before = await fetchScenarioCatalogue();
  const confirmed = await transport.confirmScenarioDraft(reviewed.draft.draft_id, 'SCI-08 Owner', reviewed.draft.content_hash);
  const id = confirmed.scenario.scenario_id;
  const afterConfirm = await fetchScenarioCatalogue();
  assert(confirmed.certified && afterConfirm.scenarios.some(s => s.scenario_id === id && s.certification_state === 'CERTIFIED')
    && afterConfirm.active_scenario_id === before.active_scenario_id,
    'A6: Confirm certifies and adds it to the SAME catalogue the selector reads — without running it');

  const activation = await activateScenarioOnServer(id, 'sci08-session');
  const projected = await projectScenarioFromServer(id);
  const mirrored = syncActiveScenario(id);
  assert(activation.success && activation.active_scenario_id === id && projected && mirrored && runtime.getActiveScenarioId() === id,
    'A7: Run takes the curated selection path — gated activation, record projection, mirror');
  const understood = await transport.fetchEvaluatedDecision(id);
  const authoritative = await evaluateAuthoritativeScenarioDecision(runtime.resolveScenario(id));
  assert(isDeepStrictEqual(understood, JSON.parse(JSON.stringify(authoritative))),
    'A8: Understand reads the authoritative evaluator\'s decision, figure for figure');

  const stale = await transport.createScenarioDraft('PROMOTION_DEMAND_SURGE', { sku_id: 'P004' });
  let conflict: unknown = null;
  try { await transport.confirmScenarioDraft(stale.draft.draft_id, 'SCI-08 Owner', 'not-the-current-hash'); } catch (e) { conflict = e; }
  assert(conflict instanceof transport.AuthoringRequestError && !runtime.isScenarioRegistered(stale.draft.scenario_id),
    'A9: A confirmation made against an out-of-date review is refused, and nothing is registered');

  // ═════════════════════════════════════════════════════════════════════════════
  console.log('\n=== B. AN INVALID SCENARIO ===========================================\n');

  const invalid = await transport.createScenarioDraft('PROMOTION_DEMAND_SURGE', { sku_id: 'P004', promotion_participation_pct: 1 });
  const countBefore = (await fetchScenarioCatalogue()).scenarios.length;
  let refusal: any = null;
  try { await transport.confirmScenarioDraft(invalid.draft.draft_id, 'SCI-08 Owner', invalid.draft.content_hash); } catch (e) { refusal = e; }
  assert(refusal instanceof transport.AuthoringRequestError && refusal.status === 422
    && refusal.issues.some((i: any) => i.field === 'certification'),
    'B1: The gate refuses it and the experience receives the named reasons to show');
  const afterRefusal = await fetchScenarioCatalogue();
  assert(!runtime.isScenarioRegistered(invalid.draft.scenario_id) && afterRefusal.scenarios.length === countBefore
    && afterRefusal.active_scenario_id === id,
    'B2: …not registered, not catalogued, nothing activated');
  assert(!(await activateScenarioOnServer(invalid.draft.scenario_id)).success && !(await projectScenarioFromServer(invalid.draft.scenario_id)),
    'B3: …and it can be neither run nor projected');

  await activateScenarioOnServer(REFERENCE_ID);
  syncActiveScenario(REFERENCE_ID);

  const unrouted = calls.filter(c => !/\/api\/v1\/scenarios(\/|$)/.test(c));
  assert(unrouted.length === 0, 'B4: The experience\'s transport calls nothing but the governed scenario routes', unrouted.join(', '));

  // ═════════════════════════════════════════════════════════════════════════════
  console.log('\n=== C. THE EXPERIENCE HOLDS NO AUTHORITY ============================\n');

  const studio = codeOf('components/scenario-authoring/ScenarioAuthoringStudio.tsx');
  const client = codeOf('lib/scenario-authoring-client.ts');
  assert(!/\b(registerScenario|activateScenario|certifyScenario|resolveScenarioDraft|confirmDraft|createDraft|updateDraft)\s*\(/.test(studio + client),
    'C1: No registration, activation, certification or lifecycle step runs in the browser');
  assert(/activateScenarioOnServer\(/.test(studio) && /projectScenarioFromServer\(/.test(studio) && /syncActiveScenario\(/.test(studio)
    && /refreshState\(/.test(studio),
    'C2: Run uses the curated selection path, not one of its own');
  assert(!/decision\.\w+\s*[-+*/]\s*[\w(]|[\w)]\s*[-+*/]\s*decision\.\w+/.test(studio),
    'C3: No arithmetic on the evaluator\'s figures — they are formatted, never derived');
  assert(/money\(decision\.revenueExposureGbp\)/.test(studio) && /money\(decision\.marginExposureGbp\)/.test(studio),
    'C4: Money goes through the estate\'s currency formatter');
  assert(!/GEMINI|apiKey|api_key|NEXT_PUBLIC_/i.test(studio + client),
    'C5: No credential, key field or public env name anywhere in the experience');
  assert(!/\{[^}]*\b(scenario_id|draft_id|content_hash|tenant_id)\s*\}/.test(studio.replace(/key=\{[^}]*\}/g, '')),
    'C6: No internal id is rendered as text');
  assert(/SCN-\[A-Z0-9-\]\+/.test(studio) && /No earlier dimension failed/.test(studio),
    'C7: Server refusals are shown without scenario ids, and without the gate\'s cascade restatement');
  assert(/Suggested by AI/.test(studio) && /AI-proposed, kept by you/.test(studio) && /keepProposal/.test(studio) && /ignoreProposal/.test(studio),
    'C8: A suggestion is shown as a proposal, visibly marked, kept or ignored by the author — never applied by itself');
  assert(/createPortal\(/.test(studio) && /createPortal\(/.test(codeOf('components/ScenarioSelectorModal.tsx')),
    'C9: Both dialogs render over the viewport, not inside the navigation drawer (R-SCI07R-6)');
  const planner = codeOf('components/PromotionPlanner.tsx');
  assert(/scenarioProjection\.default_sku\s*\)\s*&&/.test(planner) || /a\.default_sku === scenarioProjection\.default_sku/.test(planner),
    'C10: The Promotion planner always offers the active scenario\'s own product');
  assert(/\.og-arch-select\s*\{[^}]*max-width:\s*100%/.test(readFileSync(join(ROOT, 'app/globals.css'), 'utf8')),
    'C11: The Architecture scenario select is bounded by its card (R-SCI07R-6)');

  // ═════════════════════════════════════════════════════════════════════════════
  console.log('\n=== D. CONTRACTS ===================================================\n');
  for (const rel of [
    'packages/contracts/src/canonical-scenario-model.ts',
    'packages/contracts/src/scenario-clock.ts',
    'packages/contracts/src/scenario-registry.ts',
    'packages/contracts/src/provenance-vocabulary.ts',
    'packages/contracts/src/scenario-certification-model.ts',
    'packages/contracts/src/living-evidence-contracts.ts',
    'packages/contracts/src/scenario-draft-model.ts'
  ]) {
    const gateD = execSync(`git rev-parse 2f8d7ed8b479452a804c61e4202c87697b62e4de:${rel}`, { cwd: ROOT }).toString().trim();
    const now = execSync(`git hash-object ${rel}`, { cwd: ROOT }).toString().trim();
    assert(gateD === now, `D1: ${rel} is byte-identical to SHA-D`);
  }

  console.log(`\n=== SCI-08: ${passed} passed, ${failed} failed ===`);
  process.exit(failed === 0 ? 0 : 1);
}

run().catch(error => {
  console.error('[FAIL] SCI-08 suite crashed —', error);
  process.exit(1);
});
