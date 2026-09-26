/**
 * `SCI-10` — Attested Upload (ADR-086), and its first slice, the governed unset (`R-SCI08-2`).
 *
 * Driven through the REAL route handlers wherever a route exists — multipart uploads included — and
 * through the domain directly where a fixture needs to reach one closed refusal precisely. Nothing is
 * mocked: the draft store, the certification gate, the scenario runtime, the ESF-6 receipt store and the
 * authoritative evaluator are the estate's own. The provider is OFF for the whole run
 * (`GEMINI_API_KEY` deleted): acceptance does not depend on a model.
 *
 * Every console line the estate writes during the run is captured, and at the end the suite asserts
 * that no cell value from any fixture appeared in one (contract §4.10).
 *
 * The rendered journey at 1440 / 1024 / 720 is `scripts/sci10-browser-acceptance.cjs`.
 */
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

process.env.COGNIX_WORLD_MODE = 'local';
delete process.env.GEMINI_API_KEY;

const ROOT = join(__dirname, '..', '..');
const BASELINE = '6151960307051c7c8d455e7c04e22e5cb34f54f5';
const SHA_D = '2f8d7ed8b479452a804c61e4202c87697b62e4de';
const TENANT = 'tenant_uk_retail_01';
const OTHER = 'tenant_sci10_other';

let passed = 0;
let failed = 0;
function assert(condition: boolean, name: string, detail?: string) {
  if (condition) { process.stdout.write(`[PASS] ${name}\n`); passed++; }
  else { process.stderr.write(`[FAIL] ${name} — ${detail ?? 'assertion failed'}\n`); failed++; }
}
const section = (title: string) => process.stdout.write(`\n=== ${title} ${'='.repeat(Math.max(3, 66 - title.length))}\n\n`);

/* Every line the estate logs, captured for the retention check. */
const logged: string[] = [];
for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) {
  const original = console[level].bind(console);
  console[level] = (...args: unknown[]) => {
    logged.push(args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
    original(...args);
  };
}

const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
const codeOf = (rel: string) => stripComments(readFileSync(join(ROOT, rel), 'utf8'));
function filesUnder(rel: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(name)) out.push(relative(ROOT, full));
    }
  };
  walk(join(ROOT, rel));
  return out;
}

// ── Fixtures ────────────────────────────────────────────────────────────────────

function weekly(end: string, n: number): string[] {
  const t = Date.parse(`${end}T00:00:00Z`);
  return Array.from({ length: n }, (_, k) => new Date(t - (n - 1 - k) * 7 * 86_400_000).toISOString().slice(0, 10));
}
const WEEKS = weekly('2026-08-09', 12); // the draft's default Today is 2026-08-12
const HEADER = ['period_end', 'sku_id', 'base_demand_units', 'waste_units', 'store_count', 'online_share_pct',
  'gross_margin_pct', 'store_cover_days', 'dc_cover_days', 'on_order_cover_days', 'notes'];
const BASE = (k: number) => 58_213 + k * 611;
const WASTE = (k: number) => 1_409 + k * 7;
/** Cell values that must never be logged, echoed in a profile, or appear in a refusal. */
const CANARIES = [
  ...WEEKS.map((_, k) => String(BASE(k))), ...WEEKS.map((_, k) => String(WASTE(k))),
  'zq-canary-note', 'HYPERLINK', 'zq.example', '+SUM(A1)', '1437', '15.57', '27.43', '3.25', '7.75'
];
function goodRows(sku = 'P009', weeks = WEEKS): string[] {
  const n = weeks.length;
  return weeks.map((w, k) => {
    const last = k === n - 1;
    const note = k === 0 ? '"=HYPERLINK(""http://zq.example"")"' : k === 1 ? '+SUM(A1)' : `zq-canary-note-${7731 + k}`;
    return [w, sku, BASE(k), WASTE(k), last ? 1437 : 1431, last ? '15.57' : '15.1', last ? '27.43' : '27.1',
      last ? '3.25' : '3', last ? '5.5' : '5', last ? '7.75' : '7', note].join(',');
  });
}
const csv = (header: string[], rows: string[]) => [header.join(','), ...rows].join('\r\n') + '\r\n';
const GOOD = csv(HEADER, goodRows());
const bytes = (text: string) => new TextEncoder().encode(text);
const expectedMean = (f: (k: number) => number) => Math.round(WEEKS.reduce((s, _, k) => s + f(k), 0) / WEEKS.length);

const ATTESTATION = {
  attested_by: 'Priya Shah',
  attestation_statement: 'Weekly EPOS extract for chicken breast, exported from our sales ledger on Monday.',
  attestation_kind: 'FIRST_PARTY_OPERATOR_ATTESTATION'
};
const FULL_MAPPING = [
  { header: 'base_demand_units', field: 'base_demand_units_per_week' },
  { header: 'waste_units', field: 'waste_units_per_week' },
  { header: 'store_count', field: 'national_store_count' },
  { header: 'online_share_pct', field: 'online_demand_share_pct' },
  { header: 'gross_margin_pct', field: 'gross_margin_rate_pct' },
  { header: 'store_cover_days', field: 'store_cover_days' },
  { header: 'dc_cover_days', field: 'distribution_centre_cover_days' },
  { header: 'on_order_cover_days', field: 'on_order_cover_days' }
];

async function run() {
  const { NextRequest } = await import('next/server');
  const A = await import('../../lib/scenario-authoring');
  const contracts = await import('../../packages/contracts/src/index');
  const draftRoute = await import('../../app/api/v1/scenarios/drafts/[id]/route');
  const draftsRoute = await import('../../app/api/v1/scenarios/drafts/route');
  const confirmRoute = await import('../../app/api/v1/scenarios/drafts/[id]/confirm/route');
  const uploadsRoute = await import('../../app/api/v1/scenarios/drafts/[id]/uploads/route');
  const admitRoute = await import('../../app/api/v1/scenarios/drafts/[id]/uploads/[upload_id]/admit/route');
  const withdrawRoute = await import('../../app/api/v1/scenarios/drafts/[id]/uploads/[upload_id]/withdraw/route');
  const catalogueRoute = await import('../../app/api/v1/scenarios/route');
  const decisionRoute = await import('../../app/api/v1/scenarios/decision/route');
  const recordRoute = await import('../../app/api/v1/scenarios/record/route');
  const runtime = await import('../../lib/scenario-runtime');
  const { evaluateAuthoritativeScenarioDecision } = await import('../../lib/canonical-decision-evaluator');
  const { certifyScenario } = await import('../../lib/scenario-certification');
  const { attestedObservationStore } = await import('../../lib/attested-observation-store');

  const url = (path: string) => new URL(path, 'http://localhost');
  const json = async (res: Response) => ({ status: res.status, body: await res.json() as any });
  const idCtx = (id: string) => ({ params: Promise.resolve({ id }) });
  const upCtx = (id: string, upload_id: string) => ({ params: Promise.resolve({ id, upload_id }) });
  const postJson = (path: string, body: unknown) => new NextRequest(url(path), {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
  });

  const createDraft = async (tenant = TENANT, inputs: Record<string, unknown> = { sku_id: 'P009' }, situation = 'SUPPLIER_LEAD_TIME_RISK') =>
    (await json(await draftsRoute.POST(postJson('/api/v1/scenarios/drafts', { tenant_id: tenant, situation, inputs })))).body.data;
  const patch = async (id: string, body: Record<string, unknown>, tenant = TENANT) =>
    json(await draftRoute.PATCH(new NextRequest(url(`/api/v1/scenarios/drafts/${id}`), {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenant_id: tenant, ...body })
    }), idCtx(id)));
  const getDraft = async (id: string, tenant = TENANT) =>
    (await json(await draftRoute.GET(new NextRequest(url(`/api/v1/scenarios/drafts/${id}?tenant_id=${tenant}`)), idCtx(id)))).body;

  const upload = async (draftId: string, text: string | Uint8Array, opts: { tenant?: string; name?: string; type?: string; extra?: Record<string, string> } = {}) => {
    const form = new FormData();
    form.append('tenant_id', opts.tenant ?? TENANT);
    for (const [k, v] of Object.entries(opts.extra ?? {})) form.append(k, v);
    form.append('file', new File([(typeof text === 'string' ? bytes(text) : text) as BlobPart], opts.name ?? 'chicken-weekly.csv', { type: opts.type ?? 'text/csv' }));
    return json(await uploadsRoute.POST(new NextRequest(url(`/api/v1/scenarios/drafts/${draftId}/uploads`), { method: 'POST', body: form }), idCtx(draftId)));
  };
  const list = async (draftId: string, tenant = TENANT) =>
    json(await uploadsRoute.GET(new NextRequest(url(`/api/v1/scenarios/drafts/${draftId}/uploads?tenant_id=${tenant}`)), idCtx(draftId)));
  const admit = async (draftId: string, up: any, over: Record<string, unknown> = {}, tenant = TENANT) =>
    json(await admitRoute.POST(postJson(`/api/v1/scenarios/drafts/${draftId}/uploads/${up.upload_id}/admit`, {
      tenant_id: tenant,
      upload_id: up.upload_id,
      expected_content_sha256: up.content_sha256,
      mapping: FULL_MAPPING,
      attestation: ATTESTATION,
      ...over
    }), upCtx(draftId, up.upload_id)));
  const withdraw = async (draftId: string, uploadId: string, tenant = TENANT, extra: Record<string, unknown> = {}) =>
    json(await withdrawRoute.POST(postJson(`/api/v1/scenarios/drafts/${draftId}/uploads/${uploadId}/withdraw`, { tenant_id: tenant, ...extra }), upCtx(draftId, uploadId)));
  const confirm = async (draftId: string, tenant = TENANT) =>
    json(await confirmRoute.POST(postJson(`/api/v1/scenarios/drafts/${draftId}/confirm`, { tenant_id: tenant, confirm: true, confirmed_by: 'Priya Shah' }), idCtx(draftId)));
  const provOf = (assessment: any, field: string) => assessment.field_provenance.find((p: any) => p.field === field);
  const readinessOf = (assessment: any, cap: string) => assessment.readiness.find((r: any) => r.capability === cap)?.state;
  const snapshot = (draftId: string, tenant = TENANT) => {
    const d = A.scenarioDraftStore.get(tenant, draftId)!;
    return JSON.stringify({ inputs: d.inputs, hash: d.content_hash, state: d.state });
  };

  const reasonsSeen = new Set<string>();
  const refusalMessages: string[] = [];
  const seen = (r: { status: number; body: any }) => {
    if (r.body?.reason) { reasonsSeen.add(r.body.reason); refusalMessages.push(String(r.body.message)); }
    return r;
  };

  // ═════════════════════════════════════════════════════════════════════════════
  section('A. CONTRACT INTEGRITY');

  const doc = readFileSync(join(ROOT, 'docs/governance/COGNIX_ATTESTED_UPLOAD_CONTRACT.md'), 'utf8');
  const declared = doc.slice(doc.indexOf('## 6. Normative declaration')).match(/```ts\n([\s\S]*?)\n```/)?.[1];
  const committed = readFileSync(join(ROOT, 'packages/contracts/src/attested-upload-model.ts'), 'utf8');
  assert(!!declared && committed === `${declared}\n`,
    'A1: attested-upload-model.ts is §6 of the declared contract, byte for byte');
  const barrel = readFileSync(join(ROOT, 'packages/contracts/src/index.ts'), 'utf8');
  assert((barrel.match(/export \* from '\.\/attested-upload-model';/g) ?? []).length === 1,
    'A2: …and the contracts barrel exports it with exactly one `export *` line');

  for (const rel of [
    'packages/contracts/src/canonical-scenario-model.ts',
    'packages/contracts/src/scenario-clock.ts',
    'packages/contracts/src/scenario-registry.ts',
    'packages/contracts/src/provenance-vocabulary.ts',
    'packages/contracts/src/scenario-certification-model.ts',
    'packages/contracts/src/living-evidence-contracts.ts',
    'packages/contracts/src/scenario-draft-model.ts'
  ]) {
    const frozen = execSync(`git rev-parse ${SHA_D}:${rel}`, { cwd: ROOT }).toString().trim();
    const now = execSync(`git hash-object ${rel}`, { cwd: ROOT }).toString().trim();
    assert(frozen === now, `A3: ${rel} is byte-identical to SHA-D`);
  }
  const changedContracts = execSync(`git diff --name-only ${BASELINE} -- packages/contracts`, { cwd: ROOT }).toString().trim().split('\n').filter(Boolean);
  const untracked = execSync('git ls-files --others --exclude-standard -- packages/contracts', { cwd: ROOT }).toString().trim().split('\n').filter(Boolean);
  const touched = [...new Set([...changedContracts, ...untracked])].sort();
  assert(isDeepStrictEqual(touched, [
    'packages/contracts/src/attested-observation-model.ts',
    'packages/contracts/src/attested-upload-model.ts',
    'packages/contracts/src/index.ts'
  ]), 'A4: The only contract files touched are the new declaration, its barrel line, and ESF-6\'s authorised receipt kind', touched.join(', '));
  const barrelDiff = execSync(`git diff ${BASELINE} -- packages/contracts/src/index.ts`, { cwd: ROOT }).toString();
  assert(!/^-[^-]/m.test(barrelDiff), 'A5: …the barrel change is additive (no line removed)');

  const okReceipt = (kind: string, extra: Record<string, unknown> = {}) => contracts.validateServerReceipt({
    receipt_id: 'rcpt_x', kind, tenant_id: 't', sequence: 1, subject_id: 'subj', issued_at_display: 'now', schema_version: 'v', ...extra
  });
  assert(okReceipt('SOURCE_REGISTRATION').valid && okReceipt('CONTRACT_REGISTRATION', { contract_digest: 'd' }).valid
    && okReceipt('OBSERVATION_ADMISSION', { source_id: 'asrc_x' }).valid
    && !okReceipt('OBSERVATION_ADMISSION').valid && !okReceipt('CONTRACT_REGISTRATION').valid && !okReceipt('SOMETHING_ELSE').valid,
    'A6: ESF-6: every existing receipt kind validates exactly as before, and an unknown kind is still refused');
  assert(okReceipt('SCENARIO_UPLOAD_ADMISSION', { subject_id: 'upl_abc' }).valid
    && !okReceipt('SCENARIO_UPLOAD_ADMISSION', { subject_id: 'obs_abc' }).valid
    && !okReceipt('SCENARIO_UPLOAD_ADMISSION', { subject_id: 'upl_abc', source_id: 'asrc_x' }).valid,
    'A7: …and the one additive kind, SCENARIO_UPLOAD_ADMISSION, validates with an upload subject and no source');

  const admissible = Object.keys(contracts.ATTESTED_UPLOAD_ADMISSIBLE_FIELDS).sort();
  assert(isDeepStrictEqual(admissible, ['base_demand_units_per_week', 'distribution_centre_cover_days', 'gross_margin_rate_pct',
    'national_store_count', 'on_order_cover_days', 'online_demand_share_pct', 'store_cover_days', 'waste_units_per_week']),
    'A8: The admissible set is the closed §5 table — eight directly measurable fields');
  assert(admissible.every(f => contracts.draftFieldEvidenceKind(f as any) === 'MEASUREMENT'),
    'A9: …every one a MEASUREMENT; no DECLARATION is admissible');
  assert(['promotional_response_pp_per_depth_point', 'cannibalisation_rate_pct', 'substitution_recovery_pct', 'supplier_capacity_index',
    'total_demand_movement_pct', 'demand_movement_drivers'].every(f => !(f in contracts.ATTESTED_UPLOAD_ADMISSIBLE_FIELDS)),
  'A10: …and no coefficient a model would have to estimate (response, cannibalisation, substitution, capacity, movement)');

  // ═════════════════════════════════════════════════════════════════════════════
  section('B. THE GOVERNED UNSET (R-SCI08-2)');

  const u = await createDraft();
  const uid = u.draft.draft_id;
  const stated = await patch(uid, { inputs: { base_demand_units_per_week: 42_000, promotion_depth_pct: 15, gross_margin_rate_pct: 31 } });
  assert(stated.status === 200 && provOf(stated.body.data, 'base_demand_units_per_week').descriptor.origin === 'stated'
    && readinessOf(stated.body.data, 'DEMAND_OUTLOOK') === 'Modelled',
    'B1: A stated measurement reads `stated`');
  const hashStated = stated.body.data.draft.content_hash;
  const unset = await patch(uid, { inputs: {}, unset_fields: ['base_demand_units_per_week'] });
  const afterUnset = unset.body.data;
  assert(unset.status === 200 && !('base_demand_units_per_week' in afterUnset.draft.inputs)
    && provOf(afterUnset, 'base_demand_units_per_week').descriptor.origin === 'modelled',
    'B2: Unset returns it to CogniX\'s assumption: the key is ABSENT and the field reads `modelled`');
  const resolvedAfter = A.resolveScenarioDraft(afterUnset.draft.inputs, afterUnset.draft.scenario_id).scenario;
  const resolvedDefault = A.resolveScenarioDraft({ ...afterUnset.draft.inputs }, afterUnset.draft.scenario_id).scenario;
  assert(resolvedAfter.demand.base_demand_units_per_week !== 42_000
    && resolvedAfter.demand.base_demand_units_per_week === resolvedDefault.demand.base_demand_units_per_week,
    'B3: …no stale value survives: the resolved record carries the declared assumption, not 42,000');
  assert(afterUnset.draft.content_hash !== hashStated && !/un-promoted weekly demand[^;]*stated by you/.test(afterUnset.provenance_statement),
    'B4: …the content hash moved and the provenance sentence no longer calls it stated');
  const depthUnset = (await patch(uid, { inputs: {}, unset_fields: ['promotion_depth_pct'] })).body.data;
  assert(provOf(depthUnset, 'promotion_depth_pct').descriptor.origin === 'modelled' && !('promotion_depth_pct' in depthUnset.draft.inputs),
    'B5: A DECLARATION unsets the same way — back to the situation\'s declared posture');
  const marginUnset = (await patch(uid, { inputs: {}, unset_fields: ['gross_margin_rate_pct'] })).body.data;
  assert(provOf(marginUnset, 'gross_margin_rate_pct').descriptor.origin === 'derived',
    'B6: The gross margin rate returns to CogniX\'s own figure — derived from the product master');
  const before = snapshot(uid);
  const both = await patch(uid, { inputs: { national_store_count: 900 }, unset_fields: ['national_store_count'] });
  assert(both.status === 422 && snapshot(uid) === before,
    'B7: Setting and unsetting one field in the same change is refused, and nothing changes');
  const unknownUnset = await patch(uid, { inputs: {}, unset_fields: ['not_a_field'] });
  assert(unknownUnset.status === 422 && snapshot(uid) === before, 'B8: Unsetting a field that is not in the register is refused');
  const nulled = (await patch(uid, { inputs: { store_cover_days: null } })).body.data;
  assert(!('store_cover_days' in nulled.draft.inputs) && Object.values(nulled.draft.inputs).every(v => v !== null),
    'B9: A null never persists — it is an unset, not a value that is neither stated nor absent');
  const kept = A.updateDraft({
    tenant_id: TENANT, draft_id: uid, inputs: {},
    accepted_proposals: [{ field: 'scenario_name', value: 'Chicken supply squeeze', rationale: 'kept' }], accepted_from_model: 'gemini-test'
  });
  assert(kept.field_provenance.some(p => p.field === 'scenario_name' && p.drafted_by_model),
    'B10: (a proposal kept from AI is stamped as drafted…)');
  const unsetKept = A.updateDraft({ tenant_id: TENANT, draft_id: uid, inputs: {}, unset_fields: ['scenario_name'] });
  assert(!unsetKept.field_provenance.some(p => p.field === 'scenario_name' && p.drafted_by_model)
    && !/drafted by AI/.test(unsetKept.provenance_statement),
    'B11: …and unsetting it removes the stamp: a returned field is never described as "drafted by AI"');
  const studio = codeOf('components/scenario-authoring/ScenarioAuthoringStudio.tsx');
  const transport = codeOf('lib/scenario-authoring-client.ts');
  assert(/unsetFromForm/.test(studio) && /unset_fields: unsetFields/.test(transport),
    'B12: SCI-08 adopts it: an emptied box is sent as an unset, not silently kept (R-SCI08-2 closed)');

  // ═════════════════════════════════════════════════════════════════════════════
  section('C. VALIDATION — A FIXTURE PER CLOSED REASON, NOTHING ADMITTED');

  const v = await createDraft();
  const vid = v.draft.draft_id;
  const vBefore = snapshot(vid);
  const refusedAt = async (label: string, text: string | Uint8Array, reason: string, opts: Parameters<typeof upload>[2] = {}) => {
    const r = seen(await upload(vid, text, opts));
    assert(r.status >= 400 && r.body.reason === reason && snapshot(vid) === vBefore,
      `${label} → ${reason}, and the draft is unchanged`, JSON.stringify({ status: r.status, reason: r.body.reason, message: r.body.message }));
    return r;
  };

  await refusedAt('C1: A spreadsheet file', GOOD, 'UNSUPPORTED_MEDIA_TYPE', { name: 'chicken.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  await refusedAt('C2: JSON dressed as .csv', GOOD, 'UNSUPPORTED_MEDIA_TYPE', { type: 'application/json' });
  const big = new Uint8Array(5 * 1024 * 1024 + 10).fill(0x31);
  const tooBig = A.receiveAttestedUpload({ tenant_id: TENANT, draft_id: vid, file_name: 'big.csv', media_type: 'text/csv', bytes: big });
  if (!tooBig.ok) reasonsSeen.add(tooBig.refusal.reason);
  assert(!tooBig.ok && tooBig.refusal.reason === 'TOO_LARGE' && tooBig.status === 413 && snapshot(vid) === vBefore, 'C3: Over 5 MB → TOO_LARGE (413)');
  const declaredHuge = await json(await uploadsRoute.POST(new NextRequest(url(`/api/v1/scenarios/drafts/${vid}/uploads`), {
    method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=x', 'content-length': String(80 * 1024 * 1024) }, body: 'x'
  }), idCtx(vid)));
  assert(declaredHuge.status === 413 && declaredHuge.body.reason === 'TOO_LARGE',
    'C4: …and a declared 80 MB body is refused before a byte is read (limits before parse)');
  const streamed = new Uint8Array(5 * 1024 * 1024 + 200 * 1024).fill(0x31);
  const streamedRes = await json(await uploadsRoute.POST(new NextRequest(url(`/api/v1/scenarios/drafts/${vid}/uploads`), {
    method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=x' }, body: new ReadableStream({ start(c) { c.enqueue(streamed); c.close(); } }), duplex: 'half'
  } as any), idCtx(vid)));
  assert(streamedRes.status === 413, 'C5: …and a body that grows past the cap while streaming is abandoned at the cap');
  const manyRows = csv(['period_end', 'sku_id', 'store_count'], Array.from({ length: 50_001 }, () => '2026-08-09,P009,1'));
  await refusedAt('C6: 50,001 data rows', manyRows, 'TOO_MANY_ROWS');
  await refusedAt('C7: 61 columns', csv([...HEADER, ...Array.from({ length: 50 }, (_, k) => `extra_${k}`)], goodRows().map(r => r + ','.repeat(50))), 'TOO_MANY_COLUMNS');
  await refusedAt('C8: Latin-1 bytes', new Uint8Array([...bytes('period_end,sku_id,caf'), 0xe9, ...bytes('\n2026-08-09,P009,1\n')]), 'NOT_UTF8');
  await refusedAt('C9: An empty file', '', 'NO_HEADER_ROW');
  await refusedAt('C10: A file whose first row is data', csv(['2026-08-02', '12', '13'], ['2026-08-09,14,15']), 'NO_HEADER_ROW');
  await refusedAt('C11: An unclosed quote', `${HEADER.join(',')}\n2026-08-09,P009,"123`, 'MALFORMED_CSV');
  await refusedAt('C12: A ragged row', csv(HEADER, [...goodRows().slice(0, 5), '2026-08-09,P009,1']), 'MALFORMED_CSV');
  await refusedAt('C13: Two columns with one name', csv(['period_end', 'sku_id', 'store_count', 'Store Count'], WEEKS.map(w => `${w},P009,1,2`)), 'DUPLICATE_HEADER');
  await refusedAt('C14: An e-mail column by name', csv([...HEADER, 'customer_email'], goodRows().map(r => `${r},x`)), 'PERSONAL_DATA_COLUMN');
  await refusedAt('C15: An e-mail address hidden in a notes column', csv(HEADER, goodRows().map((r, k) => k === 4 ? r.replace(/zq-canary-note-\d+$/, 'buyer@zq.example') : r)), 'PERSONAL_DATA_COLUMN');
  await refusedAt('C16: A telephone number', csv([...HEADER, 'ref'], goodRows().map(r => `${r},07700 900123`)), 'PERSONAL_DATA_COLUMN');
  await refusedAt('C17: A postcode', csv([...HEADER, 'area'], goodRows().map(r => `${r},SW1A 1AA`)), 'PERSONAL_DATA_COLUMN');
  await refusedAt('C18: People\'s names', csv([...HEADER, 'owner'], goodRows().map((r, k) => `${r},${['Sarah Jones', 'James Patel', 'Emma Clarke'][k % 3]}`)), 'PERSONAL_DATA_COLUMN');
  await refusedAt('C19: No sku_id column', csv(['period_end', 'store_count'], WEEKS.map(w => `${w},1`)), 'MISSING_REQUIRED_COLUMN');
  await refusedAt('C20: A row for another product', csv(HEADER, goodRows().map((r, k) => k === 3 ? r.replace(',P009,', ',P004,') : r)), 'GRAIN_MISMATCH');
  await refusedAt('C21: Two rows for one week', csv(HEADER, [...goodRows(), goodRows()[11]]), 'GRAIN_MISMATCH');
  await refusedAt('C22: Rows five days apart', csv(HEADER, goodRows('P009', ['2026-07-20', '2026-07-25', '2026-07-30', '2026-08-04'])), 'GRAIN_MISMATCH');
  await refusedAt('C23: A week after the scenario\'s Today', csv(HEADER, goodRows('P009', weekly('2026-08-16', 6))), 'FUTURE_PERIOD');
  await refusedAt('C24: Three weeks', csv(HEADER, goodRows('P009', weekly('2026-08-09', 3))), 'INSUFFICIENT_PERIODS');
  await refusedAt('C25: A server-issued field asserted in the upload form', GOOD, 'SERVER_FIELD_ASSERTED', { extra: { synthetic_demo: 'false' } });
  await refusedAt('C26: …or a receipt id', GOOD, 'SERVER_FIELD_ASSERTED', { extra: { note: 'rcpt_forged' } });

  await refusedAt('C16b: A mobile number column by name', csv([...HEADER, 'mobile'], goodRows().map(r => `${r},x`)), 'PERSONAL_DATA_COLUMN');
  const notPersonal = A.profileAgainstDraft(A.parseCsv(csv([...HEADER, 'mobile_share_pct', 'sku_name'], goodRows().map(r => `${r},4.5,British Chicken Breast 640g`))), { sku_id: 'P009', today: '2026-08-12' });
  assert(notPersonal.profile.column_count === 13,
    'C16c: …while a measurement that merely mentions mobile, and a product name, are not personal data (no false positive)');
  const noDraft = seen(await upload('DRAFT-NOPE000000', GOOD));
  const foreign = seen(await upload(vid, GOOD, { tenant: OTHER }));
  assert(noDraft.status === 404 && foreign.status === 404 && noDraft.body.reason === 'DRAFT_NOT_FOUND'
    && foreign.body.reason === noDraft.body.reason && foreign.body.message === noDraft.body.message,
    'C27: Another tenant\'s draft is DRAFT_NOT_FOUND — status, reason and message identical to a draft that does not exist');

  const refusedRecords = (await list(vid)).body.data.uploads as any[];
  assert(refusedRecords.length > 0 && refusedRecords.every(r => r.state === 'REFUSED' && r.refusal && r.admitted_values.length === 0 && r.profile === null),
    'C28: A refused upload is REFUSED, holds no profile and admitted nothing');
  assert(A.attestedUploadStore.heldColumnCount() === 0, 'C29: …and no parsed column from any refused file is held');

  // ═════════════════════════════════════════════════════════════════════════════
  section('D. PROFILE — CELLS ARE TEXT, NEVER EVALUATED, NEVER RE-EXPORTED');

  const d = await createDraft();
  const did = d.draft.draft_id;
  const dOpening = snapshot(did);
  const received = await upload(did, GOOD);
  const up = received.body.data.upload;
  assert(received.status === 201 && up.state === 'PROFILED' && /^upl_[0-9a-f]{16}$/.test(up.upload_id)
    && up.tenant_id === TENANT && up.draft_id === did && up.scenario_id === d.draft.scenario_id,
    'D1: A valid extract is PROFILED, with a server-issued upl_ id, bound to one tenant and one draft');
  const sha = (await import('node:crypto')).createHash('sha256').update(bytes(GOOD)).digest('hex');
  assert(up.content_sha256 === sha, 'D2: SHA-256 over the exact uploaded bytes, computed server-side');
  assert(up.profile.row_count === 12 && up.profile.period_count === 12 && up.profile.column_count === 11
    && up.profile.period_window.start === WEEKS[0] && up.profile.period_window.end === WEEKS[11],
    'D3: The profile: 12 rows, 12 weekly periods, 11 columns, the period window');
  const byHeader = Object.fromEntries(up.profile.columns.map((c: any) => [c.header, c]));
  assert(FULL_MAPPING.every(m => byHeader[m.header].proposed_field === m.field && byHeader[m.header].proposal_basis === 'HEADER_MATCH'),
    'D4: Deterministic header matching proposes all eight admissible fields');
  assert(byHeader.notes.inferred_type === 'TEXT' && byHeader.notes.proposed_field === null
    && byHeader.period_end.inferred_type === 'DATE' && byHeader.sku_id.proposed_field === null,
    'D5: Formula-shaped cells are TEXT — profiled, never evaluated — and grain columns are never proposed');
  const receivedText = JSON.stringify(received.body) + JSON.stringify((await list(did)).body);
  assert(!CANARIES.some(c => receivedText.includes(c)),
    'D6: No cell value appears in the upload response or the draft\'s upload list — not a number, not a formula', CANARIES.find(c => receivedText.includes(c)));
  assert(up.synthetic_demo === true && up.attestation === null && up.admitted_values.length === 0 && up.admission_receipt_id === null,
    'D7: Profiled is not admitted: no attestation, no values, no receipt, and synthetic_demo is still server-derived true');
  assert(snapshot(did) === dOpening, 'D8: Upload and validation changed nothing in the draft');
  const dup = seen(await upload(did, GOOD));
  assert(dup.status === 409 && dup.body.reason === 'DUPLICATE_UPLOAD', 'D9: The same bytes again, into the same draft → DUPLICATE_UPLOAD');
  assert(dup.body.data?.upload?.upload_id === up.upload_id && dup.body.data.upload.state === 'PROFILED'
    && (await list(did)).body.data.uploads.length === 1,
    'D10: …nothing new is recorded, and the refusal returns the caller\'s OWN live upload so they can resume reviewing it');
  assert(/err\.reason !== 'DUPLICATE_UPLOAD' \|\| live\?\.state !== 'PROFILED'/.test(codeOf('components/scenario-authoring/AttestedUploadPanel.tsx')),
    'D11: The panel resumes that upload instead of leaving the person stuck behind a duplicate they cannot see');

  // ═════════════════════════════════════════════════════════════════════════════
  section('E. ADMISSION REFUSALS — NO PARTIAL ADMISSION');

  const dBefore = snapshot(did);
  const seqBefore = attestedObservationStore.currentSequence(TENANT);
  const refusedAdmit = async (label: string, over: Record<string, unknown>, reason: string, target = up, tenant = TENANT, draftId = did) => {
    const r = seen(await admit(draftId, target, over, tenant));
    const still = A.attestedUploadStore.get(TENANT, target.upload_id)?.upload.state;
    assert(r.status >= 400 && r.body.reason === reason && snapshot(did) === dBefore
      && attestedObservationStore.currentSequence(TENANT) === seqBefore && still === 'PROFILED',
      `${label} → ${reason}; nothing admitted, no receipt, the draft unchanged`, JSON.stringify({ status: r.status, reason: r.body.reason, message: r.body.message }));
  };
  await refusedAdmit('E1: The reviewed fingerprint differs', { expected_content_sha256: 'f'.repeat(64) }, 'CONTENT_CHANGED');
  await refusedAdmit('E2: A server-issued attestation id asserted', { attestation_id: 'att_forged' }, 'SERVER_FIELD_ASSERTED');
  await refusedAdmit('E3: A receipt asserted', { admission_receipt_id: 'rcpt_forged' }, 'SERVER_FIELD_ASSERTED');
  await refusedAdmit('E4: synthetic_demo asserted', { synthetic_demo: false }, 'SERVER_FIELD_ASSERTED');
  await refusedAdmit('E5: A sequence asserted', { sequence: 1 }, 'SERVER_FIELD_ASSERTED');
  await refusedAdmit('E6: No named person', { attestation: { ...ATTESTATION, attested_by: '  ' } }, 'ATTESTATION_INVALID');
  await refusedAdmit('E7: "AI" as the attesting person', { attestation: { ...ATTESTATION, attested_by: 'AI' } }, 'ATTESTATION_INVALID');
  await refusedAdmit('E8: Another kind of attestation', { attestation: { ...ATTESTATION, attestation_kind: 'CRYPTOGRAPHIC_PROOF' } }, 'ATTESTATION_INVALID');
  await refusedAdmit('E9: No mapping confirmed', { mapping: [] }, 'MAPPING_NOT_CONFIRMED');
  await refusedAdmit('E10: A column the file does not have', { mapping: [{ header: 'units', field: 'base_demand_units_per_week' }] }, 'MAPPING_NOT_CONFIRMED');
  await refusedAdmit('E11: A grain column mapped as a figure', { mapping: [{ header: 'period_end', field: 'store_cover_days' }] }, 'MAPPING_NOT_CONFIRMED');
  await refusedAdmit('E12: One field from two columns', { mapping: [{ header: 'store_cover_days', field: 'store_cover_days' }, { header: 'dc_cover_days', field: 'store_cover_days' }] }, 'MAPPING_NOT_CONFIRMED');
  await refusedAdmit('E13: A price-response coefficient', { mapping: [{ header: 'base_demand_units', field: 'promotional_response_pp_per_depth_point' }] }, 'FIELD_NOT_ADMISSIBLE');
  await refusedAdmit('E14: A declaration (promotion depth)', { mapping: [{ header: 'store_count', field: 'promotion_depth_pct' }] }, 'FIELD_NOT_ADMISSIBLE');
  await refusedAdmit('E15: Demand movement', { mapping: [{ header: 'online_share_pct', field: 'total_demand_movement_pct' }] }, 'FIELD_NOT_ADMISSIBLE');
  await refusedAdmit('E16: A formula-shaped text column mapped as a number', { mapping: [...FULL_MAPPING.slice(0, 7), { header: 'notes', field: 'on_order_cover_days' }] }, 'NON_NUMERIC_VALUE');
  await refusedAdmit('E17: A foreign tenant', {}, 'DRAFT_NOT_FOUND', up, OTHER);
  await refusedAdmit('E18: An upload named that does not exist', { upload_id: 'upl_0000000000000000' }, 'UPLOAD_NOT_FOUND');

  // A column with a blank week, and one with a signed value: both non-numeric; and one out of bounds.
  const blankRows = goodRows().map((r, k) => k === 6 ? r.split(',').map((c, i) => i === 7 ? '' : c).join(',') : r);
  const d2 = await createDraft();
  const blank = (await upload(d2.draft.draft_id, csv(HEADER, blankRows))).body.data.upload;
  const blankRes = seen(await admit(d2.draft.draft_id, blank));
  assert(blankRes.body.reason === 'NON_NUMERIC_VALUE' && blankRes.body.column === 'store_cover_days'
    && !('base_demand_units_per_week' in A.scenarioDraftStore.get(TENANT, d2.draft.draft_id)!.inputs),
    'E19: One blank week in one mapped column refuses the WHOLE admission — the seven good columns are not admitted either');
  const signedRows = goodRows().map((r, k) => k === 2 ? r.split(',').map((c, i) => i === 3 ? '-5' : c).join(',') : r);
  const d3 = await createDraft();
  const signed = (await upload(d3.draft.draft_id, csv(HEADER, signedRows))).body.data.upload;
  assert(seen(await admit(d3.draft.draft_id, signed)).body.reason === 'NON_NUMERIC_VALUE', 'E20: A signed cell is text (formula-shaped), so it is not a number');
  const boundsRows = goodRows().map((r, k) => k === 11 ? r.split(',').map((c, i) => i === 7 ? '200' : c).join(',') : r);
  const d4 = await createDraft();
  const d4Before = snapshot(d4.draft.draft_id);
  const outOfBounds = (await upload(d4.draft.draft_id, csv(HEADER, boundsRows))).body.data.upload;
  const oob = seen(await admit(d4.draft.draft_id, outOfBounds));
  assert(oob.body.reason === 'OUT_OF_BOUNDS' && oob.body.column === 'store_cover_days' && /between 0 and 120/.test(oob.body.message)
    && snapshot(d4.draft.draft_id) === d4Before,
    'E21: A latest-week store cover of 200 days → OUT_OF_BOUNDS, decided by the Scenario Draft contract\'s own validator');

  // ═════════════════════════════════════════════════════════════════════════════
  section('F. ADMISSION — ATTESTED PROVENANCE AND EXISTING READINESS');

  const registeredBefore = runtime.isScenarioRegistered(d.draft.scenario_id);
  const observationsBefore = (attestedObservationStore as any).observationsById.size as number;
  const admitted = await admit(did, up, { mapping: FULL_MAPPING.slice(0, 8), confirm: true, certified: true, demo_active: true });
  const adm = admitted.body.data;
  assert(admitted.status === 200 && adm?.upload?.state === 'ADMITTED', 'F1: A valid, attested, mapped extract is ADMITTED', JSON.stringify(admitted.body).slice(0, 400));
  const values = Object.fromEntries(adm.upload.admitted_values.map((x: any) => [x.field, x]));
  assert(values.base_demand_units_per_week.value === expectedMean(BASE) && values.base_demand_units_per_week.reduction === 'MEAN_OF_PERIODS'
    && values.base_demand_units_per_week.periods_used === 12
    && values.waste_units_per_week.value === expectedMean(WASTE),
    'F2: Weekly rates by MEAN_OF_PERIODS, rounded to a whole unit, over all twelve weeks',
    JSON.stringify({ got: values.base_demand_units_per_week?.value, want: expectedMean(BASE) }));
  assert(values.national_store_count.value === 1437 && values.online_demand_share_pct.value === 15.57
    && values.gross_margin_rate_pct.value === 27.43 && values.store_cover_days.value === 3.25
    && values.distribution_centre_cover_days.value === 5.5 && values.on_order_cover_days.value === 7.75
    && ['national_store_count', 'online_demand_share_pct', 'gross_margin_rate_pct', 'store_cover_days', 'distribution_centre_cover_days', 'on_order_cover_days']
      .every(f => values[f].reduction === 'LATEST_PERIOD' && values[f].periods_used === 1),
    'F3: Levels by LATEST_PERIOD — the latest week\'s value, exactly');
  assert(isDeepStrictEqual(values.base_demand_units_per_week.provenance, { origin: 'attested', method: 'rule', authority: 'authoritative' })
    && isDeepStrictEqual(values.national_store_count.provenance, { origin: 'attested', method: 'measured', authority: 'authoritative' })
    && Object.values(values).every((x: any) => contracts.validateProvenanceDescriptor(x.provenance).valid),
    'F4: Admitted provenance: attested/rule for a mean, attested/measured for a level — both valid in the frozen vocabulary');
  const inputs = adm.assessment.draft.inputs;
  assert(Object.entries(values).every(([f, x]: any) => inputs[f] === x.value) && adm.upload.admitted_values.length === 8,
    'F5: Exactly the mapped fields were written into the draft, and nothing else');
  assert(FULL_MAPPING.every(m => provOf(adm.assessment, m.field).descriptor.origin === 'attested'),
    'F6: Every admitted field reads `attested` in the draft\'s field provenance');
  assert(readinessOf(adm.assessment, 'INVENTORY_POSITION') === 'Ready',
    'F7: INVENTORY_POSITION is `Ready` — all three cover inputs attested — by the existing SCI-07 readiness rule');
  assert(readinessOf(adm.assessment, 'DEMAND_OUTLOOK') === 'Modelled'
    && adm.assessment.readiness.find((r: any) => r.capability === 'DEMAND_OUTLOOK').modelled_inputs.includes('total_demand_movement_pct'),
    'F8: …and a capability whose other inputs are still assumptions is NOT promoted — the file supplied only what it measured');
  assert(/came from data you uploaded and attested/.test(adm.assessment.provenance_statement)
    && !/verified|verification|certif/i.test(adm.assessment.provenance_statement + provOf(adm.assessment, 'store_cover_days').note),
    'F9: The provenance sentence says the figures came from attested data — and never calls it verified');
  assert(adm.assessment.draft.state === 'DRAFT' && !runtime.isScenarioRegistered(d.draft.scenario_id) && !registeredBefore
    && runtime.getActiveScenarioId() !== d.draft.scenario_id,
    'F10: The draft is still a DRAFT: nothing confirmed, registered, certified or activated — even with confirm/certified/demo_active in the request');
  assert(adm.upload.synthetic_demo === false && /^att_[0-9a-f]{16}$/.test(adm.upload.attestation_id)
    && adm.upload.attestation.attested_by === 'Priya Shah' && adm.upload.attestation.attestation_kind === 'FIRST_PARTY_OPERATOR_ATTESTATION',
    'F11: Server-derived synthetic_demo false, a server-issued att_ id, and the named person\'s attestation recorded');
  const receipt = attestedObservationStore.getReceipt(adm.upload.admission_receipt_id, TENANT);
  assert(!!receipt && receipt.kind === 'SCENARIO_UPLOAD_ADMISSION' && receipt.subject_id === adm.upload.upload_id
    && !receipt.source_id && contracts.validateServerReceipt(receipt).valid && receipt.sequence === seqBefore + 1,
    'F12: One ESF-6 receipt of kind SCENARIO_UPLOAD_ADMISSION, subject = the upload, on the tenant\'s monotonic sequence');
  assert((attestedObservationStore as any).observationsById.size === observationsBefore
    && attestedObservationStore.getObservation(adm.upload.upload_id, TENANT) === null
    && attestedObservationStore.resolveAdmissionReceiptFor({ observation_id: adm.upload.upload_id, admission_receipt_id: receipt!.receipt_id }, TENANT) === null,
    'F13: Nothing became an OutcomeObservation, and the upload receipt resolves no observation (ADR-086 part 2)');
  assert(A.attestedUploadStore.get(TENANT, up.upload_id)?.held === null,
    'F14: The parsed columns were discarded at admission — only the reduced values, the profile and the record remain');
  const admitAgain = seen(await admit(did, up));
  assert(admitAgain.status === 409 && admitAgain.body.reason === 'DUPLICATE_UPLOAD', 'F15: Admitting the same upload twice is refused');
  const dupAfter = seen(await upload(did, GOOD));
  assert(dupAfter.body.reason === 'DUPLICATE_UPLOAD', 'F16: …and so is uploading the admitted bytes again to the same draft');
  const second = csv(['period_end', 'sku_id', 'stores'], WEEKS.map(w => `${w},P009,1500`));
  const secondUp = (await upload(did, second)).body.data.upload;
  const already = seen(await admit(did, secondUp, { mapping: [{ header: 'stores', field: 'national_store_count' }] }));
  assert(already.status === 409 && already.body.reason === 'FIELD_ALREADY_ATTESTED' && A.scenarioDraftStore.get(TENANT, did)!.inputs.national_store_count === 1437,
    'F17: A second file cannot re-attest a field another file supplied → FIELD_ALREADY_ATTESTED, value unchanged');

  // ═════════════════════════════════════════════════════════════════════════════
  section('G. OVERRIDE — AN EDITED ATTESTED VALUE IS STATED');

  const edited = (await patch(did, { inputs: { store_cover_days: 4 } })).body.data;
  assert(provOf(edited, 'store_cover_days').descriptor.origin === 'stated' && readinessOf(edited, 'INVENTORY_POSITION') === 'Limited',
    'G1: Editing an attested value makes it `stated` again, and its capability drops to Limited (a stated measurement)');
  assert(provOf(edited, 'distribution_centre_cover_days').descriptor.origin === 'attested',
    'G2: …the fields the person did not touch stay attested');
  const restored = (await patch(did, { inputs: { store_cover_days: 3.25 } })).body.data;
  assert(provOf(restored, 'store_cover_days').descriptor.origin === 'attested' && readinessOf(restored, 'INVENTORY_POSITION') === 'Ready',
    'G3: Attested only while the value EQUALS the admitted value — derived, not stored (contract §5)');
  const resent = (await patch(did, { inputs: { ...restored.draft.inputs } })).body.data;
  assert(FULL_MAPPING.every(m => provOf(resent, m.field).descriptor.origin === 'attested'),
    'G4: Re-saving the unchanged form (what "Update assessment" does) keeps every attested field attested');
  await patch(did, { inputs: { waste_units_per_week: 1_000 } });

  // ═════════════════════════════════════════════════════════════════════════════
  section('H. WITHDRAWAL WHILE A DRAFT');

  const w = await withdraw(did, up.upload_id);
  const wd = w.body.data;
  assert(w.status === 200 && wd.upload.state === 'WITHDRAWN' && wd.upload.synthetic_demo === true,
    'H1: An admitted upload is WITHDRAWN while its draft is a DRAFT');
  assert(['base_demand_units_per_week', 'national_store_count', 'online_demand_share_pct', 'gross_margin_rate_pct', 'store_cover_days',
    'distribution_centre_cover_days', 'on_order_cover_days'].every(f => !(f in wd.assessment.draft.inputs)),
  'H2: Every still-attested field returns to CogniX\'s assumption through the governed unset (keys absent)');
  assert(provOf(wd.assessment, 'base_demand_units_per_week').descriptor.origin === 'modelled'
    && provOf(wd.assessment, 'gross_margin_rate_pct').descriptor.origin === 'derived'
    && !wd.assessment.field_provenance.some((p: any) => p.descriptor.origin === 'attested'),
    'H3: Provenance recomputes: modelled (or derived by CogniX for the margin rate), and nothing reads attested');
  assert(readinessOf(wd.assessment, 'INVENTORY_POSITION') === 'Modelled' && !/uploaded and attested/.test(wd.assessment.provenance_statement),
    'H4: Readiness recomputes (INVENTORY_POSITION back to Modelled) and the sentence no longer mentions attested data');
  assert(wd.assessment.draft.inputs.waste_units_per_week === 1_000 && provOf(wd.assessment, 'waste_units_per_week').descriptor.origin === 'stated'
    && isDeepStrictEqual(wd.returned_to_assumption.sort(), FULL_MAPPING.map(m => m.field).filter(f => f !== 'waste_units_per_week').sort()),
    'H5: A value the person changed after admission is theirs: withdrawal leaves their stated 1,000 alone');
  const resolvedW = A.resolveScenarioDraft(wd.assessment.draft.inputs, wd.assessment.draft.scenario_id).scenario;
  assert(resolvedW.estate.national_store_count !== 1437 && resolvedW.demand.base_demand_units_per_week !== expectedMean(BASE),
    'H6: …and the resolved record no longer carries any withdrawn value');
  const w2 = seen(await withdraw(did, up.upload_id));
  assert(w2.status === 404 && w2.body.reason === 'UPLOAD_NOT_FOUND', 'H7: Withdrawing twice finds nothing admitted to withdraw');
  const readmit = seen(await admit(did, up));
  assert(readmit.body.reason === 'UPLOAD_EXPIRED', 'H8: A withdrawn upload cannot be re-admitted — its columns are gone; upload the file again');
  const again = await upload(did, GOOD);
  assert(again.status === 201, 'H9: …which is allowed: a withdrawn upload is not a live duplicate');
  const profiledOnly = seen(await withdraw(did, again.body.data.upload.upload_id));
  assert(profiledOnly.body.reason === 'UPLOAD_NOT_FOUND', 'H10: A profiled-but-not-admitted upload has nothing to withdraw');

  // A confirmed draft refuses both admission and withdrawal.
  const c = await createDraft();
  const cid = c.draft.draft_id;
  const cUp = (await upload(cid, GOOD)).body.data.upload;
  const cAdm = await admit(cid, cUp);
  const cConfirmed = await confirm(cid);
  assert(cAdm.status === 200 && cConfirmed.status === 201 && cConfirmed.body.data.certified === true,
    'H11: An attested draft confirms and certifies through the unchanged SCI-07 path');
  const cWithdraw = seen(await withdraw(cid, cUp.upload_id));
  assert(cWithdraw.status === 409 && cWithdraw.body.reason === 'DRAFT_NOT_EDITABLE'
    && A.scenarioDraftStore.get(TENANT, cid)!.inputs.national_store_count === 1437,
    'H12: A CONFIRMED draft refuses withdrawal (DRAFT_NOT_EDITABLE): a confirmed scenario is immutable');
  const cUpload = seen(await upload(cid, second));
  assert(cUpload.body.reason === 'DRAFT_NOT_EDITABLE', 'H13: …and refuses a new upload');

  // ═════════════════════════════════════════════════════════════════════════════
  section('I. DUPLICATE vs REPRODUCTION');

  const r1 = await createDraft();
  const r2 = await createDraft();
  const up1 = (await upload(r1.draft.draft_id, GOOD)).body.data.upload;
  const up2 = (await upload(r2.draft.draft_id, GOOD)).body.data.upload;
  assert(up1.content_sha256 === up2.content_sha256 && up1.upload_id !== up2.upload_id,
    'I1: The same bytes in a NEW draft are not a duplicate: same fingerprint, a new upload');
  const a1 = (await admit(r1.draft.draft_id, up1)).body.data;
  const a2 = (await admit(r2.draft.draft_id, up2)).body.data;
  assert(JSON.stringify(a1.upload.admitted_values) === JSON.stringify(a2.upload.admitted_values),
    'I2: Same bytes, mapping, product and Today → byte-identical admitted values');
  const rec1 = A.resolveScenarioDraft(a1.assessment.draft.inputs, 'SCN-X').scenario;
  const rec2 = A.resolveScenarioDraft(a2.assessment.draft.inputs, 'SCN-X').scenario;
  assert(isDeepStrictEqual(rec1, rec2), 'I3: …an identical resolved scenario record');
  const cert1 = certifyScenario(A.resolveScenarioDraft(a1.assessment.draft.inputs, r1.draft.scenario_id).scenario);
  const cert2 = certifyScenario(A.resolveScenarioDraft(a2.assessment.draft.inputs, r2.draft.scenario_id).scenario);
  assert(cert1.assertion_count === cert2.assertion_count
    && isDeepStrictEqual(cert1.dimensions.map(x => [x.dimension, x.checks.map(k => k.passed)]), cert2.dimensions.map(x => [x.dimension, x.checks.map(k => k.passed)])),
    'I4: …and an identical certification, check for check');
  const conf1 = await confirm(r1.draft.draft_id);
  const conf2 = await confirm(r2.draft.draft_id);
  const eval1 = await evaluateAuthoritativeScenarioDecision(runtime.resolveScenario(r1.draft.scenario_id));
  const eval2 = await evaluateAuthoritativeScenarioDecision(runtime.resolveScenario(r2.draft.scenario_id));
  const { scenarioId: _s1, ...fig1 } = eval1 as any;
  const { scenarioId: _s2, ...fig2 } = eval2 as any;
  assert(conf1.status === 201 && conf2.status === 201 && isDeepStrictEqual(fig1, fig2),
    'I5: …and the evaluator\'s decision for both is identical, figure for figure');
  const twin = await createDraft(TENANT, { ...a1.assessment.draft.inputs });
  const twinConfirmed = await confirm(twin.draft.draft_id);
  const evalTwin = await evaluateAuthoritativeScenarioDecision(runtime.resolveScenario(twin.draft.scenario_id));
  const { scenarioId: _s3, ...figTwin } = evalTwin as any;
  assert(runtime.resolveScenario(r1.draft.scenario_id).demand.base_demand_units_per_week === expectedMean(BASE)
    && twinConfirmed.status === 201 && provOf(twin, 'base_demand_units_per_week').descriptor.origin === 'stated'
    && isDeepStrictEqual(fig1, figTwin),
    'I6: The evaluator reads admitted values exactly as it reads stated ones — the same figures typed by hand give the same decision');
  const pure1 = A.reduceMapped(A.profileAgainstDraft(A.parseCsv(A.decodeUtf8(bytes(GOOD))), { sku_id: 'P009', today: '2026-08-12' }).held, FULL_MAPPING as any);
  const pure2 = A.reduceMapped(A.profileAgainstDraft(A.parseCsv(A.decodeUtf8(bytes(GOOD))), { sku_id: 'P009', today: '2026-08-12' }).held, FULL_MAPPING as any);
  assert(JSON.stringify(pure1) === JSON.stringify(pure2) && JSON.stringify(pure1) === JSON.stringify(a1.upload.admitted_values),
    'I7: Admission is a pure function of (bytes, mapping, product, Today) — no clock, no provider, no store');
  const bom = await createDraft();
  const bomUp = await upload(bom.draft.draft_id, new Uint8Array([0xef, 0xbb, 0xbf, ...bytes(GOOD)]));
  const bomAdm = (await admit(bom.draft.draft_id, bomUp.body.data.upload)).body.data;
  assert(bomUp.status === 201 && bomUp.body.data.upload.content_sha256 !== up1.content_sha256
    && JSON.stringify(bomAdm.upload.admitted_values) === JSON.stringify(a1.upload.admitted_values),
    'I8: A UTF-8 byte-order mark is tolerated and stripped: a different fingerprint, the same admitted values');

  const exported = await json(await draftRoute.GET(new NextRequest(url(`/api/v1/scenarios/drafts/${bom.draft.draft_id}?tenant_id=${TENANT}&format=export`)), idCtx(bom.draft.draft_id)));
  const reimported = await json(await draftsRoute.POST(postJson('/api/v1/scenarios/drafts', { tenant_id: TENANT, import: exported.body.data })));
  assert(exported.status === 200 && !JSON.stringify(exported.body.data).includes('attested') && reimported.status === 201
    && FULL_MAPPING.every(m => reimported.body.data.draft.inputs[m.field] === bomAdm.assessment.draft.inputs[m.field]
      && provOf(reimported.body.data, m.field).descriptor.origin === 'stated'),
    'I9: An exported attested draft carries the values but not the attestation: re-imported, they are `stated` (contract §4.11)');

  // ═════════════════════════════════════════════════════════════════════════════
  section('J. TENANCY AND RECEIPTS');

  const t = await createDraft();
  const tid = t.draft.draft_id;
  const tUp = (await upload(tid, GOOD)).body.data.upload;
  const foreignList = seen(await list(tid, OTHER));
  const missingList = seen(await list('DRAFT-NOPE000000', OTHER));
  assert(foreignList.status === 404 && foreignList.body.reason === 'DRAFT_NOT_FOUND'
    && foreignList.body.message === missingList.body.message,
    'J1: Another tenant cannot list a draft\'s uploads — indistinguishable from a draft that does not exist');
  const foreignAdmit = seen(await admit(tid, tUp, {}, OTHER));
  const foreignWithdraw = seen(await withdraw(tid, tUp.upload_id, OTHER));
  assert(foreignAdmit.status === 404 && foreignWithdraw.status === 404
    && A.attestedUploadStore.get(TENANT, tUp.upload_id)?.upload.state === 'PROFILED'
    && A.attestedUploadStore.get(OTHER, tUp.upload_id) === undefined,
    'J2: …cannot admit or withdraw it, and cannot even resolve it: uploads are keyed tenant::upload');
  const otherDraft = await createDraft(OTHER);
  const crossDraft = seen(await admit(otherDraft.draft.draft_id, tUp, {}, OTHER));
  assert(crossDraft.body.reason === 'UPLOAD_NOT_FOUND', 'J3: An upload id carried into another tenant\'s draft is not found');
  const sameTenantOtherDraft = await createDraft();
  const wrongDraft = seen(await admit(sameTenantOtherDraft.draft.draft_id, tUp));
  assert(wrongDraft.body.reason === 'UPLOAD_NOT_FOUND', 'J4: An upload is bound to exactly one draft: another draft of the same tenant cannot use it');

  const beforeSeq = attestedObservationStore.currentSequence(TENANT);
  const tAdm = (await admit(tid, tUp)).body.data.upload;
  const source = attestedObservationStore.registerSource({
    tenant_id: TENANT, display_name: 'Reference EPOS actuals', category: 'COMMERCE' as any,
    observation_categories: ['REALISED_COMMERCIAL_ACTUAL'], supported_signal_types: ['ORDER_VELOCITY_ACCELERATION' as any],
    supported_grain_capabilities: [{ dimensions: ['sku'] }], supported_measurement_bases: ['DIRECT_MEASUREMENT'],
    attestation: { attested_by: 'Jane Doe', attestation_statement: 'EPOS feed', attestation_kind: 'FIRST_PARTY_OPERATOR_ATTESTATION' }
  });
  const t2 = await createDraft();
  const t2Up = (await upload(t2.draft.draft_id, GOOD)).body.data.upload;
  const t2Adm = (await admit(t2.draft.draft_id, t2Up)).body.data.upload;
  const receipts = [...new Map(attestedObservationStore.listReceiptsForTenant(TENANT)
    .filter(r => r.sequence > beforeSeq).map(r => [r.receipt_id, r])).values()];
  assert(source.ok && isDeepStrictEqual(receipts.map(r => r.kind), ['SCENARIO_UPLOAD_ADMISSION', 'SOURCE_REGISTRATION', 'SCENARIO_UPLOAD_ADMISSION'])
    && receipts.every((r, k) => r.sequence === beforeSeq + 1 + k)
    && receipts[0].receipt_id === tAdm.admission_receipt_id && receipts[2].receipt_id === t2Adm.admission_receipt_id,
    'J5: Upload admission receipts interleave with ESF-6 receipts on ONE strictly monotonic per-tenant sequence');
  const otherSeqBefore = attestedObservationStore.currentSequence(OTHER);
  const oUp = (await upload(otherDraft.draft.draft_id, GOOD, { tenant: OTHER })).body.data.upload;
  const oAdm = (await admit(otherDraft.draft.draft_id, oUp, {}, OTHER)).body.data.upload;
  assert(attestedObservationStore.getReceipt(oAdm.admission_receipt_id, OTHER)?.sequence === otherSeqBefore + 1
    && attestedObservationStore.getReceipt(oAdm.admission_receipt_id, TENANT) === null,
    'J6: …each tenant has its own sequence, and one tenant\'s receipt does not resolve under another');

  // ═════════════════════════════════════════════════════════════════════════════
  section('K. SEPARATION FROM ESF-6 REALISED OUTCOMES');

  const comparisonRoute = codeOf('app/api/v1/campaigns/decision-contract/[id]/prediction-comparison/route.ts');
  assert(/attestedObservationStore\.getObservation\(rcpt\.subject_id/.test(comparisonRoute),
    'K1: prediction-comparison resolves a receipt only to an OutcomeObservation by its subject id…');
  assert(attestedObservationStore.getObservation(tAdm.upload_id, TENANT) === null && attestedObservationStore.getObservation(t2Adm.upload_id, TENANT) === null,
    'K2: …and an upload receipt\'s subject is an upload, which is never an observation — so it resolves nothing');
  const uploadCode = ['lib/scenario-authoring/attested-upload-service.ts', 'lib/scenario-authoring/attested-upload-store.ts',
    'lib/scenario-authoring/attested-upload-validation.ts'].map(codeOf).join('\n');
  assert(!/admitObservation|OBSERVATION_ADMISSION|OutcomeObservation|REALISED_(COMMERCIAL|OPERATIONAL)_ACTUAL|observationsById/.test(uploadCode),
    'K3: The upload path never admits an observation, names an outcome category, or touches the observation store');
  const learning = codeOf('lib/campaign-learning-loop-engine.ts');
  assert(!/SCENARIO_UPLOAD_ADMISSION|attested-upload/.test(learning) && /receipt\.kind !== 'OBSERVATION_ADMISSION'/.test(codeOf('lib/attested-observation-store.ts')),
    'K4: The learning loop reads no upload, and binds an observation only to an OBSERVATION_ADMISSION receipt');

  // ═════════════════════════════════════════════════════════════════════════════
  section('M. THE LIFECYCLE THROUGH THE BROWSER TRANSPORT');

  const tx = await import('../../lib/scenario-authoring-client');
  const calls: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const target = new URL(String(input), 'http://localhost');
    const method = init?.method ?? 'GET';
    calls.push(`${method} ${target.pathname}`);
    const req = new NextRequest(target, { method, headers: init?.headers as HeadersInit, body: init?.body as BodyInit | undefined });
    const m = target.pathname.match(/^\/api\/v1\/scenarios\/drafts\/([^/]+)(?:\/(confirm|uploads)(?:\/([^/]+)\/(admit|withdraw))?)?$/);
    if (target.pathname === '/api/v1/scenarios/drafts') return draftsRoute.POST(req);
    if (m && m[2] === 'uploads' && m[4] === 'admit') return admitRoute.POST(req, upCtx(decodeURIComponent(m[1]), decodeURIComponent(m[3])));
    if (m && m[2] === 'uploads' && m[4] === 'withdraw') return withdrawRoute.POST(req, upCtx(decodeURIComponent(m[1]), decodeURIComponent(m[3])));
    if (m && m[2] === 'uploads') return method === 'POST' ? uploadsRoute.POST(req, idCtx(decodeURIComponent(m[1]))) : uploadsRoute.GET(req, idCtx(decodeURIComponent(m[1])));
    if (m && m[2] === 'confirm') return confirmRoute.POST(req, idCtx(decodeURIComponent(m[1])));
    if (m) return method === 'PATCH' ? draftRoute.PATCH(req, idCtx(decodeURIComponent(m[1]))) : draftRoute.GET(req, idCtx(decodeURIComponent(m[1])));
    if (target.pathname === '/api/v1/scenarios') return method === 'POST' ? catalogueRoute.POST(req) : catalogueRoute.GET(req);
    if (target.pathname === '/api/v1/scenarios/decision') return decisionRoute.GET(req);
    if (target.pathname === '/api/v1/scenarios/record') return recordRoute.GET(req);
    return new Response(JSON.stringify({ status: 'error', message: `unrouted ${target.pathname}` }), { status: 599 });
  }) as typeof fetch;

  const created = await tx.createScenarioDraft('SUPPLIER_LEAD_TIME_RISK', { sku_id: 'P009' });
  const sent = await tx.uploadScenarioExtract(created.draft.draft_id, new File([bytes(GOOD)], 'chicken-weekly.csv', { type: 'text/csv' }));
  const proposals = sent.upload.profile!.columns.filter(col => col.proposed_field).map(col => ({ header: col.header, field: col.proposed_field! }));
  const added = await tx.admitScenarioExtract(created.draft.draft_id, sent.upload, proposals, 'Priya Shah', 'Weekly EPOS extract');
  assert(added.upload.state === 'ADMITTED' && readinessOf(added.assessment, 'INVENTORY_POSITION') === 'Ready',
    'M1: Create → Upload → Map → Attest → Admit through the transport: admitted, attested, Ready');
  const txList = await tx.listScenarioExtracts(created.draft.draft_id);
  assert(txList.uploads.length === 1 && txList.uploads[0].state === 'ADMITTED', 'M2: The transport lists the draft\'s uploads');
  const emptied = await tx.updateScenarioDraft(created.draft.draft_id, {}, [], undefined, ['national_store_count']);
  assert(!('national_store_count' in emptied.draft.inputs) && provOf(emptied, 'national_store_count').descriptor.origin === 'modelled',
    'M3: An emptied attested box is sent as an unset: the value leaves the draft and the field is modelled');
  const outcome = await tx.withdrawScenarioExtract(created.draft.draft_id, sent.upload.upload_id);
  assert(outcome.upload.state === 'WITHDRAWN' && !outcome.assessment.field_provenance.some(p => p.descriptor.origin === 'attested'),
    'M4: Withdraw through the transport: nothing reads attested afterwards');
  const again2 = await tx.uploadScenarioExtract(created.draft.draft_id, new File([bytes(GOOD)], 'chicken-weekly.csv', { type: 'text/csv' }));
  await tx.admitScenarioExtract(created.draft.draft_id, again2.upload, proposals, 'Priya Shah', 'Weekly EPOS extract');
  const current = await tx.updateScenarioDraft(created.draft.draft_id, {}, []);
  const conf = await tx.confirmScenarioDraft(created.draft.draft_id, 'Priya Shah', current.draft.content_hash);
  assert(conf.certified && conf.draft.field_provenance.filter(p => p.descriptor.origin === 'attested').length === 8
    && /uploaded and attested/.test(conf.provenance_statement),
    'M5: Confirm carries the attested provenance into the confirmed draft and its provenance sentence');
  const listed = await (await fetch(`/api/v1/scenarios?tenant_id=${TENANT}`)).json() as any;
  const listedEntry = (listed.data as any[]).find(e => e.scenario_id === conf.scenario.scenario_id);
  assert(!!listedEntry && listedEntry.certification_state === 'CERTIFIED' && listed.active_scenario_id !== conf.scenario.scenario_id,
    'M6: …it is in the catalogue, certified — and NOT running: confirmation of an attested draft activates nothing');
  const uploadCalls = calls.filter(x => /uploads/.test(x));
  assert(calls.every(x => /^(GET|POST|PATCH) \/api\/v1\/scenarios(\/|$)/.test(x)) && uploadCalls.length >= 5,
    'M7: Only the governed scenario routes were called', calls.filter(x => !/\/api\/v1\/scenarios/.test(x)).join(', '));
  globalThis.fetch = realFetch;

  // ═════════════════════════════════════════════════════════════════════════════
  section('N. THE RETENTION WINDOW');

  // Expiry: the parsed columns are held for 30 minutes and then discarded.
  const d5 = await createDraft();
  const expiring = (await upload(d5.draft.draft_id, GOOD)).body.data.upload;
  const realNow = A.attestedUploadClock.now;
  A.attestedUploadClock.now = () => realNow() + 31 * 60_000;
  const expired = seen(await admit(d5.draft.draft_id, expiring));
  A.attestedUploadClock.now = realNow;
  assert(expired.status === 410 && expired.body.reason === 'UPLOAD_EXPIRED'
    && A.attestedUploadStore.get(TENANT, expiring.upload_id)?.upload.state === 'EXPIRED'
    && A.attestedUploadStore.get(TENANT, expiring.upload_id)?.held === null,
    'N1: Not admitted within 30 minutes → EXPIRED, its columns discarded, and admission is UPLOAD_EXPIRED');
  const reupload = await upload(d5.draft.draft_id, GOOD);
  assert(reupload.status === 201, 'N2: …and the same file may be uploaded again (an expired upload is not a live duplicate)');

  // ═════════════════════════════════════════════════════════════════════════════
  section('O. AUTHORITY, PROVIDER AND RETENTION');

  const serverUpload = ['lib/scenario-authoring/attested-upload-service.ts', 'lib/scenario-authoring/attested-upload-store.ts',
    'lib/scenario-authoring/attested-upload-validation.ts', 'app/api/v1/scenarios/drafts/[id]/uploads/route.ts',
    'app/api/v1/scenarios/drafts/[id]/uploads/[upload_id]/admit/route.ts', 'app/api/v1/scenarios/drafts/[id]/uploads/[upload_id]/withdraw/route.ts',
    'app/api/v1/_shared/attested-upload-request.ts'];
  const importsOf = (rel: string) => [...readFileSync(join(ROOT, rel), 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
  const forbidden = /scenario-certification|scenario-registry|scenario-runtime|canonical-decision|living-evidence-engine|world-client|genai|gemini|campaign-|economic|elasticity|services\/world|scenario-packs/;
  const offenders = serverUpload.flatMap(rel => importsOf(rel).filter(m => forbidden.test(m)).map(m => `${rel} → ${m}`));
  assert(offenders.length === 0, 'O1: No upload module imports certification, the registry or runtime, an engine, the evaluator, a provider or cognix-world', offenders.join('; '));
  assert(!/registerScenario|activateScenario|certifyScenario|confirmDraft|evaluateAuthoritative/.test(serverUpload.map(codeOf).join('\n')),
    'O2: …and calls none of them: an upload cannot register, certify, confirm, activate or evaluate');
  assert(!/(fetch\(|https?:\/\/|process\.env)/.test(serverUpload.filter(r => r.startsWith('lib/')).map(codeOf).join('\n')),
    'O3: No network, no URL and no environment read in the upload domain — the model is never on this path');
  const panel = codeOf('components/scenario-authoring/AttestedUploadPanel.tsx');
  const jsx = panel.slice(panel.indexOf('return (')).replace(/\w+=\{[^{}]*\}/g, '');
  assert(!/\{[^{}]*(upload_id|content_sha256|attestation_id|admission_receipt_id|draft_id)[^{}]*\}/.test(jsx) && !/JSON\.stringify/.test(panel),
    'O4: The panel renders no upload id, draft id, fingerprint, attestation id, receipt or JSON');
  assert(!/\breduce\(|Math\.(round|floor|ceil)|\/ ?periods|sum\s*\+/.test(panel) && /admitted_values\.map/.test(panel),
    'O5: The panel computes nothing: the values it shows are the server\'s admitted values');
  assert(/not verified by CogniX|checks its format, not its accuracy/.test(panel) && !/\bverified\b(?! by CogniX)/.test(panel.replace(/not verified by CogniX/g, '')),
    'O6: The panel says an attestation is a declaration, never that CogniX verified the data');
  assert(/from '@\/lib\/scenario-authoring-client'/.test(panel) && !/from '@\/lib\/scenario-authoring['/]/.test(panel),
    'O7: The panel reaches the server only through the browser transport — never the authoring runtime');
  assert(/ATTESTED_UPLOAD_ADMISSIBLE_FIELDS/.test(transport) && /uploads/.test(transport) && !/GEMINI|NEXT_PUBLIC/.test(transport),
    'O8: The transport carries the declared admissible vocabulary and no credential');
  assert(A.attestedUploadStore.heldColumnCount() === 1,
    'O9: Parsed columns are held ONLY for the one upload still awaiting admission (N2); every admitted, withdrawn, expired or refused one holds none',
    String(A.attestedUploadStore.heldColumnCount()));
  const uploadLogs = logged.filter(l => l.includes('[cognix:attested-upload]'));
  assert(uploadLogs.length > 10 && uploadLogs.some(l => l.includes('profiled')) && uploadLogs.some(l => l.includes('admitted')) && uploadLogs.some(l => l.includes('withdrawn')),
    'O10: The lifecycle is logged — counts, headers and mapping decisions', String(uploadLogs.length));
  const leaked = CANARIES.filter(cell => logged.some(l => l.includes(cell)));
  assert(leaked.length === 0, 'O11: NO cell value appears in ANY console line written during the whole run (contract §4.10)', leaked.join(', '));
  const leakedInRefusals = CANARIES.filter(cell => refusalMessages.some(m => m.includes(cell)));
  assert(leakedInRefusals.length === 0, 'O12: …nor in any refusal message', leakedInRefusals.join(', '));

  const allReasons = ['UNSUPPORTED_MEDIA_TYPE', 'TOO_LARGE', 'TOO_MANY_ROWS', 'TOO_MANY_COLUMNS', 'NOT_UTF8', 'NO_HEADER_ROW', 'MALFORMED_CSV',
    'DUPLICATE_HEADER', 'PERSONAL_DATA_COLUMN', 'MISSING_REQUIRED_COLUMN', 'GRAIN_MISMATCH', 'FUTURE_PERIOD', 'INSUFFICIENT_PERIODS',
    'NON_NUMERIC_VALUE', 'OUT_OF_BOUNDS', 'FIELD_NOT_ADMISSIBLE', 'DUPLICATE_UPLOAD', 'FIELD_ALREADY_ATTESTED', 'CONTENT_CHANGED',
    'SERVER_FIELD_ASSERTED', 'ATTESTATION_INVALID', 'MAPPING_NOT_CONFIRMED', 'DRAFT_NOT_FOUND', 'DRAFT_NOT_EDITABLE', 'UPLOAD_NOT_FOUND', 'UPLOAD_EXPIRED'];
  const missing = allReasons.filter(r => !reasonsSeen.has(r));
  assert(missing.length === 0, `O13: Every one of the ${allReasons.length} closed refusal reasons was exercised and returned`, missing.join(', '));


  process.stdout.write(`\n=== SCI-10: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed === 0 ? 0 : 1);
}

run().catch(error => {
  process.stderr.write(`[FAIL] SCI-10 suite crashed — ${error?.stack ?? error}\n`);
  process.exit(1);
});
