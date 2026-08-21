/**
 * Unit Test Suite for CogniX ATL-03 Retail & Grocery Knowledge Population
 * Run via: npx tsx tests/unit/run-atl03-tests.ts
 *
 * ATL-02 asserted that the backend works. This suite asserts that what was POPULATED into it is
 * honest: that every claim is traceable, that nothing not-fully-real is presented as real, and
 * that the absences the content standard requires are stated rather than filled.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { CAPABILITY_REGISTRY } from '../../config/capabilities';
import { capabilityRepository } from '../../services/atlas/src/capability-registry';
import { loadKnowledge, listKnowledgeRefs } from '../../services/atlas/src/capability-knowledge-store';
import { validateIdentities, validateKnowledge, validateRelationSymmetry } from '../../lib/atlas/capability-validator';
import { NON_REAL_STATUSES } from '../../packages/contracts/src/capability-atlas-model';
import type { CapabilityKnowledge } from '../../packages/contracts/src/capability-atlas-model';

const ROOT = join(__dirname, '..', '..');
let passed = 0, failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) { console.log(`[PASS] ${testName}`); passed++; }
  else { console.error(`[FAIL] ${testName} - ${detail || 'Assertion failed'}`); failed++; }
}

async function run() {
  console.log('\n=== ATL-03 — Capability Knowledge Population ===\n');

  const all = CAPABILITY_REGISTRY;
  const ids = new Set(all.map(c => c.capability_id));
  const entries: { id: string; k: CapabilityKnowledge }[] = [];
  for (const c of all) {
    const k = await loadKnowledge(c.knowledge_ref);
    if (k) entries.push({ id: c.capability_id, k });
  }

  // ── A. Coverage ───────────────────────────────────────────────────────────
  assert(all.length >= 33, 'A1: The registry covers at least the 33 capabilities ATL-01 inventoried',
    `registry holds ${all.length}`);
  assert(all.every(c => c.knowledge_ref !== null),
    'A2: AC-ATL-03-1 — every registered capability has an authored knowledge module',
    `${all.filter(c => c.knowledge_ref === null).length} without knowledge`);
  assert(entries.length === all.length,
    'A3: Every declared knowledge_ref resolves to a loadable module',
    `${entries.length} loaded of ${all.length}`);
  assert(listKnowledgeRefs().length === all.length,
    'A4: The knowledge store map and the registry agree on module count');

  // ── B. Identity validation over the full corpus ───────────────────────────
  const idReport = validateIdentities(all);
  assert(idReport.valid, 'B1: The fully populated registry passes identity validation',
    idReport.errors.slice(0, 5).map(e => `${e.rule} ${e.capability_id}.${e.field}: ${e.message}`).join(' | '));

  // ── C. Knowledge validation, including V8 path existence ──────────────────
  let knowledgeErrors = 0;
  for (const { id, k } of entries) {
    const c = all.find(x => x.capability_id === id)!;
    const r = validateKnowledge(c, k, ids, p => existsSync(join(ROOT, p)));
    if (!r.valid) {
      knowledgeErrors++;
      console.error(`       ${id}: ${r.errors.map(e => `${e.rule} ${e.field}`).join(', ')}`);
    }
  }
  assert(knowledgeErrors === 0,
    'C1: AC-ATL-03-2 — every knowledge module passes V4 to V12, including V8 path existence',
    `${knowledgeErrors} capabilities failed`);

  // ── D. Every claim is traceable ───────────────────────────────────────────
  assert(entries.every(e => e.k.implementation_references.length > 0),
    'D1: Every capability cites at least one implementation reference');
  assert(entries.every(e => e.k.validation_evidence.length > 0),
    'D2: Every capability cites at least one evidence reference');

  const badPaths: string[] = [];
  for (const { id, k } of entries) {
    for (const r of k.implementation_references) {
      if (!existsSync(join(ROOT, r.path))) badPaths.push(`${id}:${r.path}`);
    }
  }
  assert(badPaths.length === 0,
    'D3: Every cited implementation path exists in the repository', badPaths.slice(0, 5).join(', '));

  const badRunners: string[] = [];
  for (const { id, k } of entries) {
    for (const t of k.test_runners) {
      if (!existsSync(join(ROOT, t))) badRunners.push(`${id}:${t}`);
    }
  }
  assert(badRunners.length === 0,
    'D4: Every cited test runner exists', badRunners.slice(0, 5).join(', '));

  const badReports: string[] = [];
  for (const { id, k } of entries) {
    for (const ev of k.validation_evidence) {
      if (ev.kind === 'report' && !existsSync(join(ROOT, ev.ref))) badReports.push(`${id}:${ev.ref}`);
    }
    for (const g of k.related_governance) {
      if (!existsSync(join(ROOT, g))) badReports.push(`${id}:${g}`);
    }
  }
  assert(badReports.length === 0,
    'D5: Every cited report and governance document exists', badReports.slice(0, 5).join(', '));

  // ── E. Honesty — AC-ATL-03-3 and AC-ATL-03-5 ──────────────────────────────
  const notFullyReal = all.filter(c =>
    NON_REAL_STATUSES.includes(c.implementation_status) || c.implementation_status === 'partially-implemented');
  assert(notFullyReal.length > 0, 'E1: The corpus contains capabilities that are not fully implemented');

  const missingWarnings: string[] = [];
  for (const c of notFullyReal) {
    const k = entries.find(e => e.id === c.capability_id)?.k;
    if (!k) continue;
    for (const d of k.demo_scenarios) if (d.warnings.length === 0) missingWarnings.push(c.capability_id);
  }
  assert(missingWarnings.length === 0,
    'E2: AC-ATL-03-5 — every demo path for a not-fully-implemented capability carries warnings',
    missingWarnings.join(', '));

  const missingLimits = notFullyReal.filter(c => {
    const k = entries.find(e => e.id === c.capability_id)?.k;
    return !k || k.known_limitations.length === 0;
  });
  assert(missingLimits.length === 0,
    'E3: Every not-fully-implemented capability states what is not real',
    missingLimits.map(c => c.capability_id).join(', '));

  const withFieldStatus = entries.filter(e => e.k.field_status.length > 0);
  assert(withFieldStatus.length >= 8,
    'E4: AC-ATL-03-3 — field-level status is recorded where a part differs from the whole',
    `${withFieldStatus.length} capabilities carry field-level status`);
  assert(withFieldStatus.every(e => e.k.field_status.every(f => f.note.trim().length > 0)),
    'E5: Every field-level status carries an explanatory note');

  // ── F. Cross-domain applicability — AC-ATL-03-6 ───────────────────────────
  assert(entries.every(e => e.k.cross_domain_applicability.length > 0),
    'F1: AC-ATL-03-6 — every capability states cross-domain applicability, including not-assessed');
  assert(entries.every(e => e.k.cross_domain_applicability.every(a => a.rationale.trim().length > 0)),
    'F2: Every applicability entry carries a rationale rather than a bare verdict');

  const notAssessed = entries.flatMap(e => e.k.cross_domain_applicability).filter(a => a.applicability === 'not-assessed');
  assert(notAssessed.length > 0,
    'F3: not-assessed is used where no reuse assessment was performed — absence is stated, not filled');

  const reusable = all.filter(c => c.platform_reusable);
  const underJustified = reusable.filter(c => {
    const k = entries.find(e => e.id === c.capability_id)?.k;
    return !k || k.cross_domain_applicability.filter(a => a.rationale.trim()).length < 2;
  });
  assert(underJustified.length === 0,
    'F4: V10 — every platform-reusable claim is justified by at least two assessed domains',
    underJustified.map(c => c.capability_id).join(', '));

  // ── G. Relationship graph — AC-ATL-03-7 ───────────────────────────────────
  const sym = validateRelationSymmetry(entries.map(e => ({ id: e.id, knowledge: e.k })));
  assert(sym.valid, 'G1: V5 — the capability relationship graph is symmetric across all 38 capabilities',
    sym.errors.slice(0, 5).map(e => e.message).join(' | '));

  const dangling: string[] = [];
  for (const { id, k } of entries) {
    for (const r of k.related_capabilities) if (!ids.has(r.ref)) dangling.push(`${id}->${r.ref}`);
  }
  assert(dangling.length === 0, 'G2: No dangling capability relationship', dangling.join(', '));

  const connected = entries.filter(e => e.k.related_capabilities.length > 0);
  assert(connected.length >= 25,
    'G3: The graph genuinely connects the estate rather than leaving islands',
    `${connected.length} of ${entries.length} capabilities carry a relationship`);

  // ── H. Cardinality preserved after population (ADR-052) ───────────────────
  const ddf = all.filter(c => c.delivered_by.includes('DDF-01'));
  assert(ddf.length === 4, 'H1: DDF-01 still resolves to four distinct capabilities after population');
  const multiWp = all.filter(c => c.delivered_by.length > 1);
  assert(multiWp.length >= 1, 'H2: At least one capability still spans multiple work packages');

  // ── I. No invented capability — AC-ATL-03-2 ───────────────────────────────
  const forbidden = ['Demand Fusion', 'Forecast Regret'];
  const inventions: string[] = [];
  for (const c of all) {
    for (const term of forbidden) {
      if (c.name.includes(term)) inventions.push(`${c.capability_id}:${term}`);
    }
  }
  assert(inventions.length === 0,
    'I1: No capability is named for a concept the repository does not implement (Demand Fusion, Forecast Regret)',
    inventions.join(', '));

  const conceptOrRoadmap = all.filter(c => c.implementation_status === 'concept' || c.implementation_status === 'roadmap');
  assert(conceptOrRoadmap.length === 0,
    'I2: Every registered capability is evidenced in code — none is admitted on documentation alone',
    conceptOrRoadmap.map(c => c.capability_id).join(', '));

  // ── J. Registry stayed compact — the ATL-02 boundary held under population ─
  const registryChars = JSON.stringify(all).length;
  const knowledgeChars = JSON.stringify(entries.map(e => e.k)).length;
  assert(all.every(c => c.summary.length <= 240),
    'J1: Every summary is still within the registry bound after population');
  assert(knowledgeChars > registryChars * 2,
    'J2: Knowledge content substantially exceeds registry content — the boundary did its job',
    `registry ${registryChars} chars, knowledge ${knowledgeChars} chars`);
  console.log(`       (registry ${registryChars} chars; knowledge ${knowledgeChars} chars across ${entries.length} modules)`);

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
  if (failed > 0) process.exit(1);
}

run().catch(err => { console.error('ATL-03 test suite failed with an error:', err); process.exit(1); });
