/**
 * Wave-4 convergence — Gate E (`SCI-07`, `SCI-07R`, `SCI-08`, `SCI-09`, `SCI-10`).
 *
 * Not another SCI-10 suite. It follows ONE attested scenario across every authority the programme has
 * built and asserts that each hands the next the same truth — by id, by quantity and by provenance:
 *
 *   draft / admitted truth  =  confirmed scenario  =  server active scenario  =  browser projection
 *                           =  signals (a REAL cognix-world process)  =  evaluator
 *                           =  rendered business context (the Architecture surface, SCI-09)
 *
 * and that the manual SCI-08 path still converges the same way beside it. Run in `service` mode against
 * `cognix-world` spawned from its own source on its own port — the topology the demonstration runs on —
 * with the provider OFF.
 *
 * It also proves, through the actual prediction-comparison ROUTE with a real decision contract, that a
 * pre-decision attested input is never read as an ESF-6 realised outcome.
 *
 * The rendered chain at 1440 / 1024 / 720 is `scripts/sci10-browser-acceptance.cjs`.
 */
import { spawn, execSync, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const ROOT = join(__dirname, '..', '..');
const WORLD_PORT = 19000 + Math.floor(Math.random() * 900);
const WORLD_URL = `http://127.0.0.1:${WORLD_PORT}`;
process.env.COGNIX_WORLD_MODE = 'service';
process.env.COGNIX_WORLD_SERVICE_URL = WORLD_URL;
delete process.env.GEMINI_API_KEY;

const TENANT = 'tenant_uk_retail_01';
const REFERENCE_ID = 'SCN-FRESH-DAIRY-CHEDDAR-001';
const SHA_D = '2f8d7ed8b479452a804c61e4202c87697b62e4de';

let passed = 0;
let failed = 0;
function assert(condition: boolean, name: string, detail?: string) {
  if (condition) { console.log(`[PASS] ${name}`); passed++; }
  else { console.error(`[FAIL] ${name} — ${detail ?? 'assertion failed'}`); failed++; }
}
const plain = (v: unknown) => JSON.parse(JSON.stringify(v));

function weekly(end: string, n: number): string[] {
  const t = Date.parse(`${end}T00:00:00Z`);
  return Array.from({ length: n }, (_, k) => new Date(t - (n - 1 - k) * 7 * 86_400_000).toISOString().slice(0, 10));
}
const WEEKS = weekly('2026-08-09', 12);
const EXTRACT = [
  'period_end,sku_id,base_demand_units,waste_units,store_count,online_share_pct,gross_margin_pct,store_cover_days,dc_cover_days,on_order_cover_days',
  ...WEEKS.map((w, k) => {
    const last = k === WEEKS.length - 1;
    return [w, 'P009', 58_213 + k * 611, 1_409 + k * 7, last ? 1437 : 1431, last ? 15.57 : 15.1, last ? 27.43 : 27.1,
      last ? 3.25 : 3, last ? 5.5 : 5, last ? 7.75 : 7].join(',');
  })
].join('\n') + '\n';
const MEAN_BASE = Math.round(WEEKS.reduce((s, _, k) => s + 58_213 + k * 611, 0) / WEEKS.length);
const MEAN_WASTE = Math.round(WEEKS.reduce((s, _, k) => s + 1_409 + k * 7, 0) / WEEKS.length);

let world: ChildProcess | null = null;
async function startWorld(): Promise<number> {
  world = spawn(join(ROOT, 'node_modules', '.bin', 'tsx'), [join(ROOT, 'services/world/src/server.ts')], {
    env: { ...process.env, PORT: String(WORLD_PORT) },
    stdio: 'ignore'
  });
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(`${WORLD_URL}/api/v1/health`);
      if (res.ok) return world.pid ?? 0;
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
  const draftRoute = await import('../../app/api/v1/scenarios/drafts/[id]/route');
  const confirmRoute = await import('../../app/api/v1/scenarios/drafts/[id]/confirm/route');
  const uploadsRoute = await import('../../app/api/v1/scenarios/drafts/[id]/uploads/route');
  const admitRoute = await import('../../app/api/v1/scenarios/drafts/[id]/uploads/[upload_id]/admit/route');
  const recordRoute = await import('../../app/api/v1/scenarios/record/route');
  const decisionRoute = await import('../../app/api/v1/scenarios/decision/route');
  const signalsRoute = await import('../../app/api/v1/signals/route');
  const currentRoute = await import('../../app/api/v1/signals/current/route');
  const evidenceRoute = await import('../../app/api/v1/evidence/route');
  const comparisonRoute = await import('../../app/api/v1/campaigns/decision-contract/[id]/prediction-comparison/route');
  const runtime = await import('../../lib/scenario-runtime');
  const { evaluateAuthoritativeScenarioDecision } = await import('../../lib/canonical-decision-evaluator');
  const reconciliation = await import('../../lib/canonical-decision-reconciliation');
  const { ARCH_LAYERS } = await import('../../components/observability/CognixArchitectureSurface');
  const { generateSyntheticSignalSnapshot } = await import('../../services/world/src/enterprise-signal-generator');
  const { attestedObservationStore } = await import('../../lib/attested-observation-store');
  const contracts = await import('../../packages/contracts/src/index');
  const { registerCampaignIntent, clearCampaignIntents } = await import('../../lib/campaign-intent-store');
  const { evaluateOutcomeFrontier } = await import('../../lib/campaign-frontier-engine');
  const { createDecisionContract } = await import('../../lib/campaign-decision-contract-engine');

  const url = (path: string) => new URL(path, 'http://localhost');
  const get = (path: string) => new NextRequest(url(path));
  const post = (path: string, body: unknown) => new NextRequest(url(path), {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
  });
  const json = async (res: Response) => ({ status: res.status, body: await res.json() as any });
  const idCtx = (id: string) => ({ params: Promise.resolve({ id }) });
  const scoped = (path: string, id: string) => `${path}?scenario_id=${encodeURIComponent(id)}&tenant_id=${TENANT}`;
  const catalogue = async () => json(await catalogueRoute.GET(get(`/api/v1/scenarios?tenant_id=${TENANT}`)));
  const activate = async (id: string) => json(await catalogueRoute.POST(post('/api/v1/scenarios', { scenario_id: id, tenant_id: TENANT })));
  const gapNode = ARCH_LAYERS.flatMap(l => l.nodes).find(n => n.id === 'decision-gap')!;
  const detNode = ARCH_LAYERS.flatMap(l => l.nodes).find(n => n.id === 'method-deterministic')!;

  /** What the Architecture surface renders for a scenario: the decision it READ from the domain route. */
  const architectureOf = async (id: string) => {
    reconciliation.resetAuthoritativeDecisionCache();
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) =>
      decisionRoute.GET(get(`${String(input)}&tenant_id=${TENANT}`))) as typeof fetch;
    const read = await reconciliation.fetchAuthoritativeScenarioDecision(id);
    globalThis.fetch = realFetch;
    const scenario = runtime.resolveScenario(id);
    const ctx = { scenario, methodsRegister: null, livingEvidence: null, decision: reconciliation.authoritativeScenarioDecision(id) } as any;
    const gap = gapNode.resolveScenarioRole(scenario, null, ctx);
    const det = detNode.resolveScenarioRole(scenario, null, ctx);
    return { read, text: [gap.action, gap.details, ...(gap.quantities ?? []).map(q => q.value), det.details].join(' | ') };
  };

  await startWorld();

  // ═════════════════════════════════════════════════════════════════════════════
  console.log('\n=== A. GATE-E CONTRACT FREEZE ======================================\n');
  for (const rel of ['canonical-scenario-model', 'scenario-clock', 'scenario-registry', 'provenance-vocabulary',
    'scenario-certification-model', 'living-evidence-contracts', 'scenario-draft-model']) {
    const path = `packages/contracts/src/${rel}.ts`;
    assert(execSync(`git rev-parse ${SHA_D}:${path}`, { cwd: ROOT }).toString().trim() === execSync(`git hash-object ${path}`, { cwd: ROOT }).toString().trim(),
      `A1: ${rel} byte-identical to SHA-D`);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  console.log('\n=== B. ONE ATTESTED SCENARIO, AUTHORING → EVALUATOR ================\n');

  const created = await json(await draftsRoute.POST(post('/api/v1/scenarios/drafts', {
    tenant_id: TENANT, situation: 'SUPPLIER_LEAD_TIME_RISK',
    inputs: { sku_id: 'P009', scenario_name: 'Chicken breast supply squeeze on attested weekly data' }
  })));
  const draftId: string = created.body.data.draft.draft_id;
  const ID: string = created.body.data.draft.scenario_id;
  const form = new FormData();
  form.append('tenant_id', TENANT);
  form.append('file', new File([new TextEncoder().encode(EXTRACT)], 'chicken-weekly.csv', { type: 'text/csv' }));
  const uploaded = await json(await uploadsRoute.POST(new NextRequest(url(`/api/v1/scenarios/drafts/${draftId}/uploads`), { method: 'POST', body: form }), idCtx(draftId)));
  const up = uploaded.body.data.upload;
  const mapping = up.profile.columns.filter((c: any) => c.proposed_field).map((c: any) => ({ header: c.header, field: c.proposed_field }));
  const admitted = await json(await admitRoute.POST(post(`/api/v1/scenarios/drafts/${draftId}/uploads/${up.upload_id}/admit`, {
    tenant_id: TENANT, upload_id: up.upload_id, expected_content_sha256: up.content_sha256, mapping,
    attestation: { attested_by: 'Priya Shah', attestation_statement: 'Weekly EPOS extract', attestation_kind: 'FIRST_PARTY_OPERATOR_ATTESTATION' }
  }), { params: Promise.resolve({ id: draftId, upload_id: up.upload_id }) }));
  const admittedValues: Record<string, number> = Object.fromEntries(admitted.body.data.upload.admitted_values.map((v: any) => [v.field, v.value]));
  assert(admitted.status === 200 && Object.keys(admittedValues).length === 8 && admittedValues.base_demand_units_per_week === MEAN_BASE
    && admittedValues.waste_units_per_week === MEAN_WASTE && admittedValues.national_store_count === 1437,
    'B1: Draft/admitted truth: eight measured inputs admitted by the declared reductions');

  const confirmed = await json(await confirmRoute.POST(post(`/api/v1/scenarios/drafts/${draftId}/confirm`, {
    tenant_id: TENANT, confirm: true, confirmed_by: 'Priya Shah', expected_content_hash: admitted.body.data.assessment.draft.content_hash
  }), idCtx(draftId)));
  const cd = confirmed.body.data;
  assert(confirmed.status === 201 && cd.certified === true && cd.demo_active === false && cd.scenario.scenario_id === ID,
    'B2: = CONFIRMED scenario: certified by the unchanged gate, same id, not active');
  assert(Object.entries(admittedValues).every(([f, v]) => cd.draft.inputs[f] === v),
    'B3: …the confirmed draft\'s inputs are the admitted values');
  const confirmedAttested = cd.draft.field_provenance.filter((p: any) => p.descriptor.origin === 'attested').map((p: any) => p.field).sort();
  assert(isDeepStrictEqual(confirmedAttested, Object.keys(admittedValues).sort())
    && cd.draft.field_provenance.filter((p: any) => p.descriptor.origin === 'attested')
      .every((p: any) => isDeepStrictEqual(p.descriptor, admitted.body.data.upload.admitted_values.find((v: any) => v.field === p.field).provenance)),
    'B4: …and carries the admitted provenance, descriptor for descriptor, into the confirmed record of authorship');
  const readBack = await json(await draftRoute.GET(get(`/api/v1/scenarios/drafts/${draftId}?tenant_id=${TENANT}`), idCtx(draftId)));
  assert(readBack.body.data.draft.state === 'CONFIRMED'
    && readBack.body.data.field_provenance.filter((p: any) => p.descriptor.origin === 'attested').length === 8,
    'B5: …and the draft, read back from the authority, still says so');

  const record = runtime.resolveScenario(ID);
  const run7 = MEAN_BASE / 7;
  assert(record.demand.base_demand_units_per_week === MEAN_BASE && record.economics.waste_units_per_week === MEAN_WASTE
    && record.estate.national_store_count === 1437 && record.estate.online_demand_share_pct === 15.57
    && record.economics.gross_margin_rate_pct === 27.43
    && record.inventory.store_units === Math.round(3.25 * run7) && record.inventory.distribution_centre_units === Math.round(5.5 * run7)
    && record.inventory.on_order_units === Math.round(7.75 * run7),
    'B6: = the REGISTERED record: every admitted value, and the cover days converted to units by the resolver');
  assert(record.provenance.basis === 'MODELLED_DEMONSTRATION_ASSUMPTION' && record.provenance.synthetic_demo === true,
    'B7: …the frozen record\'s provenance is input-independent (the attestation lives on the draft, not in a second record)');

  const listed = await catalogue();
  const entry = (listed.body.data as any[]).find(e => e.scenario_id === ID);
  assert(!!entry && entry.certification_state === 'CERTIFIED' && listed.body.active_scenario_id === REFERENCE_ID,
    'B8: = the SELECTOR\'s catalogue lists it, certified — and the reference scenario is still the one running');

  const selected = await activate(ID);
  const afterSelect = await catalogue();
  assert(selected.status === 200 && selected.body.active_scenario_id === ID && afterSelect.body.active_scenario_id === ID
    && runtime.getActiveScenarioId() === ID,
    'B9: = SERVER ACTIVE scenario after selection, and the catalogue agrees');

  const projected = await json(await recordRoute.GET(get(scoped('/api/v1/scenarios/record', ID))));
  assert(projected.status === 200 && projected.body.certification_state === 'CERTIFIED' && isDeepStrictEqual(projected.body.data, plain(record)),
    'B10: = the BROWSER PROJECTION source: the record route publishes the registered record exactly');

  const signals = await json(await signalsRoute.GET(get(scoped('/api/v1/signals', ID))));
  assert(signals.status === 200 && signals.body.service === 'cognix-world' && signals.body.scenario_id === ID
    && isDeepStrictEqual(signals.body.data, plain(generateSyntheticSignalSnapshot(record, TENANT))),
    'B11: = SIGNALS: generated by the cognix-world PROCESS over the attested record, identical to the generator over that record');
  const current = await json(await currentRoute.GET(get(scoped('/api/v1/signals/current', ID))));
  assert(current.status === 200 && current.body.service === 'cognix-world', 'B12: …/signals/current too, with no in-process fallback');

  const decision = await json(await decisionRoute.GET(get(scoped('/api/v1/scenarios/decision', ID))));
  const evaluated = await evaluateAuthoritativeScenarioDecision(record);
  assert(decision.status === 200 && decision.body.data.scenarioId === ID && isDeepStrictEqual(decision.body.data, plain(evaluated)),
    'B13: = EVALUATOR: the decision route publishes the authoritative evaluator\'s decision, figure for figure');

  const arch = await architectureOf(ID);
  assert(!!arch.read && isDeepStrictEqual(arch.read, decision.body.data)
    && arch.text.includes(`${evaluated.exposedGap.toLocaleString()} exposed units`)
    && arch.text.includes(`${evaluated.expectedDemand.toLocaleString()} units`)
    && arch.text.includes(`${evaluated.baseDemand.toLocaleString()} units`),
    'B14: = RENDERED BUSINESS CONTEXT: the Architecture surface reads that decision and renders its figures (SCI-09)', arch.text.slice(0, 300));
  const evidence = await json(await evidenceRoute.GET(get(scoped('/api/v1/evidence', ID))));
  assert(evidence.status === 200, 'B15: Living Evidence resolves the attested scenario for its tenant');

  // ═════════════════════════════════════════════════════════════════════════════
  console.log('\n=== C. THE MANUAL PATH CONVERGES BESIDE IT ========================\n');

  const manualCreated = await json(await draftsRoute.POST(post('/api/v1/scenarios/drafts', {
    tenant_id: TENANT, situation: 'SUPPLIER_LEAD_TIME_RISK',
    inputs: { sku_id: 'P009', scenario_name: 'Chicken breast supply squeeze, figures typed by hand', ...admittedValues }
  })));
  const manualDraft = manualCreated.body.data.draft;
  assert(manualCreated.body.data.field_provenance.filter((p: any) => Object.keys(admittedValues).includes(p.field))
    .every((p: any) => p.descriptor.origin === 'stated'),
    'C1: The same eight figures typed by hand read `stated` — provenance is where they came from, not what they are');
  const manualConfirmed = await json(await confirmRoute.POST(post(`/api/v1/scenarios/drafts/${manualDraft.draft_id}/confirm`, {
    tenant_id: TENANT, confirm: true, confirmed_by: 'Priya Shah'
  }), idCtx(manualDraft.draft_id)));
  const MANUAL = manualDraft.scenario_id;
  await activate(MANUAL);
  const manualDecision = await json(await decisionRoute.GET(get(scoped('/api/v1/scenarios/decision', MANUAL))));
  const { scenarioId: _a, ...attestedFigures } = decision.body.data;
  const { scenarioId: _m, ...manualFigures } = manualDecision.body.data;
  assert(manualConfirmed.status === 201 && runtime.getActiveScenarioId() === MANUAL && isDeepStrictEqual(attestedFigures, manualFigures),
    'C2: Manual Create → Confirm → Select → Run is intact, and the SAME inputs give the SAME decision whichever way they arrived');
  const manualSignals = await json(await signalsRoute.GET(get(scoped('/api/v1/signals', MANUAL))));
  assert(manualSignals.body.service === 'cognix-world' && manualSignals.body.scenario_id === MANUAL, 'C3: …with its own signals from cognix-world');
  await activate(ID);

  // ═════════════════════════════════════════════════════════════════════════════
  console.log('\n=== D. cognix-world RESTART: THE ATTESTED SCENARIO STAYS COHERENT ==\n');

  const before = (world as ChildProcess).pid;
  await stopWorld();
  const after = await startWorld();
  const again = await json(await signalsRoute.GET(get(scoped('/api/v1/signals', ID))));
  const againDecision = await json(await decisionRoute.GET(get(scoped('/api/v1/scenarios/decision', ID))));
  assert(before !== after && again.status === 200 && again.body.service === 'cognix-world' && again.body.scenario_id === ID
    && isDeepStrictEqual(again.body.data, signals.body.data)
    && isDeepStrictEqual(againDecision.body.data, decision.body.data) && runtime.getActiveScenarioId() === ID,
    'D1: A new cognix-world process serves identical signals for the attested scenario; decision and active scenario unchanged',
    JSON.stringify({ before, after, status: again.status }));

  // ═════════════════════════════════════════════════════════════════════════════
  console.log('\n=== E. PRE-DECISION INPUTS ARE NOT REALISED OUTCOMES (ESF-6) ========\n');

  const receiptId: string = admitted.body.data.upload.admission_receipt_id;
  const receipt = attestedObservationStore.getReceipt(receiptId, TENANT);
  assert(receipt?.kind === 'SCENARIO_UPLOAD_ADMISSION' && receipt.subject_id === up.upload_id,
    'E1: The admission left an ESF-6 receipt of kind SCENARIO_UPLOAD_ADMISSION — never OBSERVATION_ADMISSION');

  clearCampaignIntents();
  const session = 'wave4-esf6-separation';
  const intent = contracts.createDefaultCampaignIntentDraft(TENANT, session);
  intent.audience_market.timing_mode = 'KNOWN_DATES';
  intent.audience_market.planned_start = '2026-08-20T00:00:00.000Z';
  intent.audience_market.planned_end = '2026-08-27T00:00:00.000Z';
  const camp = registerCampaignIntent(intent);
  const frontier = evaluateOutcomeFrontier({
    tenant_id: TENANT, session_id: session, campaign_intent_id: camp.campaign_intent_id, evaluation_timestamp: '2026-08-15T12:00:00.000Z'
  } as any).frontier;
  const play = frontier.plays.find((p: any) => p.admissibility === 'ADMISSIBLE');
  const contract = createDecisionContract({
    tenant_id: TENANT, session_id: session, frontier, campaign_intent: camp,
    resolution: { route: 'HUMAN_RESOLVED', selected_play_id: play!.play_id, resolved_by: 'wave4@retail', resolution_statement: 'Gate-E separation fixture' },
    created_as_of: '2026-08-15T12:00:00.000Z'
  } as any);
  const compare = async (ids: string[]) => json(await comparisonRoute.POST(
    post(`/api/v1/campaigns/decision-contract/${contract.contract_id}/prediction-comparison`, {
      tenant_id: TENANT, session_id: session, as_of: '2026-08-30T00:00:00.000Z', observation_receipt_ids: ids
    }), idCtx(contract.contract_id)));
  const without = await compare([]);
  const withUpload = await compare([receiptId]);
  const strip = (b: any) => JSON.stringify(b, (k, v) => (/(^timestamp$|_at$|evaluated_at|comparison_id)/.test(k) ? undefined : v));
  assert(without.status === 200 && withUpload.status === 200 && strip(withUpload.body) === strip(without.body),
    'E2: Handing the prediction-comparison ROUTE the upload\'s receipt resolves no observation: the comparison is unchanged',
    JSON.stringify({ without: without.status, with: withUpload.status, msg: withUpload.body?.message }));
  const observationsForTenant = [...((attestedObservationStore as any).observationsById as Map<string, unknown>).keys()].filter(k => k.startsWith(`${TENANT}::`));
  assert(observationsForTenant.length === 0 && attestedObservationStore.getObservation(up.upload_id, TENANT) === null,
    'E3: No OutcomeObservation exists for the tenant: the attested inputs are not in the realised-outcome store');

  // ═════════════════════════════════════════════════════════════════════════════
  console.log('\n=== F. THE CURATED ESTATE IS UNTOUCHED ============================\n');

  await activate(REFERENCE_ID);
  const reference = await json(await decisionRoute.GET(get(scoped('/api/v1/scenarios/decision', REFERENCE_ID))));
  assert(reference.body.data.exposedGap === 130_125 && reference.body.data.expectedDemand === 900_125 && reference.body.data.servableDemand === 770_000,
    'F1: Fresh Dairy still publishes 900,125 / 770,000 / 130,125 — nothing of the attested scenario leaked into it');
  const refArch = await architectureOf(REFERENCE_ID);
  assert(refArch.text.includes('130,125 exposed units') && !refArch.text.includes(evaluated.exposedGap.toLocaleString() + ' exposed'),
    'F2: …and the Architecture surface, back on Fresh Dairy, renders its own figures only');

  await stopWorld();
  console.log(`\n=== Wave-4 convergence (Gate E): ${passed} passed, ${failed} failed ===`);
  process.exit(failed === 0 ? 0 : 1);
}

run().catch(async error => {
  console.error('[FAIL] Wave-4 convergence suite crashed —', error);
  await stopWorld().catch(() => undefined);
  process.exit(1);
});
