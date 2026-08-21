/**
 * Unit & Integration Test Suite for CogniX ATL-02 Capability Knowledge Backend
 * Run via: npx tsx tests/unit/run-atl02-tests.ts
 *
 * These assertions test GOVERNANCE INVARIANTS, not the shape of the implementation. The rule
 * applied throughout: an assertion must be capable of failing if the backend stops meaning what
 * the governance claims it means. Re-stating a mapping the repository already performed proves
 * nothing and is deliberately avoided.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { CAPABILITY_REGISTRY } from '../../config/capabilities';
import { DEMONSTRATION_SOLUTIONS } from '../../config/solutions';
import { CANONICAL_LEARNING_PATTERNS } from '../../services/learning/src/learning-pattern-store';
import { InMemoryCapabilityRepository, capabilityRepository } from '../../services/atlas/src/capability-registry';
import { loadKnowledge, listKnowledgeRefs } from '../../services/atlas/src/capability-knowledge-store';
import { validateIdentities, validateKnowledge, validateRelationSymmetry } from '../../lib/atlas/capability-validator';
import { searchCapabilities, FIELD_WEIGHTS } from '../../lib/atlas/capability-search';
import { CURIOSITY_QUESTIONS } from '../../content/atlas/curiosity-questions';
import type { CapabilityIdentity, CapabilityKnowledge } from '../../packages/contracts/src/capability-atlas-model';

import { GET as getCapabilities } from '../../app/api/v1/atlas/capabilities/route';
import { GET as getCapabilityById } from '../../app/api/v1/atlas/capabilities/[id]/route';
import { GET as getDomains } from '../../app/api/v1/atlas/domains/route';
import { GET as getTags } from '../../app/api/v1/atlas/tags/route';
import { GET as getRelationships } from '../../app/api/v1/atlas/relationships/route';
import { GET as getEvidence } from '../../app/api/v1/atlas/evidence/route';
import { GET as getSearch } from '../../app/api/v1/atlas/search/route';

const ROOT = join(__dirname, '..', '..');

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, errorDetail?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName} - ${errorDetail || 'Assertion failed'}`);
    failed++;
  }
}

/** Build a NextRequest-shaped object good enough for a route handler's `nextUrl` access. */
function req(url: string): any {
  const u = new URL(url, 'http://localhost');
  return { nextUrl: u, url: u.toString() };
}

async function json(res: any): Promise<any> {
  return await res.json();
}

function baseIdentity(overrides: Partial<CapabilityIdentity> = {}): CapabilityIdentity {
  return {
    capability_id: 'CAP-TEST-ONE',
    name: 'Test capability',
    summary: 'A capability used only by the ATL-02 suite.',
    capability_type: 'platform-capability',
    domains: ['retail_grocery'],
    personas: ['exec'],
    business_problems: ['bp-decision-latency'],
    tags: ['detection'],
    demonstrated_by: [],
    originated_as: [],
    evidenced_by: [],
    delivered_by: ['WP-TEST'],
    lifecycle_state: 'Prototype',
    implementation_status: 'implemented',
    platform_reusable: false,
    knowledge_ref: null,
    owner: 'ATL-02 suite',
    created_at: '2026-08-20',
    updated_at: '2026-08-20',
    reviewed_at: '2026-08-20',
    version: '1.0.0',
    ...overrides
  };
}

async function runTests() {
  console.log('\n=== ATL-02 — Capability Knowledge Backend ===\n');

  // ── A. Seed registry integrity ────────────────────────────────────────────
  const report = validateIdentities(CAPABILITY_REGISTRY);
  assert(report.valid, 'A1: The seeded capability registry passes identity validation',
    report.errors.map(e => `${e.rule} ${e.capability_id}.${e.field}: ${e.message}`).join(' | '));

  assert(
    new Set(CAPABILITY_REGISTRY.map(c => c.capability_id)).size === CAPABILITY_REGISTRY.length,
    'A2: Capability identifiers are unique across the registry'
  );

  // ── B. AC-ATL-02-9 — the cardinality case that decided ADR-052 ────────────
  const ddf = CAPABILITY_REGISTRY.filter(c => c.delivered_by.includes('DDF-01'));
  assert(ddf.length === 4,
    'B1: DDF-01 delivered FOUR independently addressable capabilities (AC-ATL-02-9)',
    `expected 4, found ${ddf.length}`);

  assert(new Set(ddf.map(c => c.capability_id)).size === 4,
    'B2: Those four carry four DISTINCT capability identifiers');

  const ddfResolved = await Promise.all(ddf.map(c => capabilityRepository.resolve(c.capability_id)));
  assert(ddfResolved.every(r => r !== null && r.identity.delivered_by.includes('DDF-01')),
    'B3: Each of the four is independently retrievable and resolves delivered_by DDF-01');

  const deliveredBy = capabilityRepository.listDeliveredBy();
  const ddfEntry = deliveredBy.find(d => d.work_package === 'DDF-01');
  assert(ddfEntry?.capability_ids.length === 4,
    'B4: The delivered-by view reports DDF-01 → four capabilities, not one');

  // Inverse cardinality: one capability across two work packages.
  const multiWp = CAPABILITY_REGISTRY.find(c => c.delivered_by.length > 1);
  assert(
    multiWp !== undefined && multiWp.delivered_by.includes('CDI-08') && multiWp.delivered_by.includes('ESF-6'),
    'B5: One capability spans TWO work packages (CDI-08 + ESF-6) — the inverse cardinality case'
  );

  // ── C. AC-ATL-02-8 — reference, never copy ────────────────────────────────
  const registrySource = readFileSync(join(ROOT, 'config', 'capabilities.ts'), 'utf8');
  assert(!/demoMaturity|demo_maturity\s*:/.test(registrySource),
    'C1: No demonstration maturity value is STORED on any capability record (ADR-047 dim. 2 is resolved)');

  const stability = await capabilityRepository.resolve('CAP-FORECAST-STABILITY');
  const solDemand = DEMONSTRATION_SOLUTIONS.find(s => s.id === 'SOL-DEMAND-02')!;
  assert(stability?.demo_maturity === solDemand.demoMaturity,
    'C2: Demonstration maturity is resolved from the solution registry at request time',
    `resolved '${stability?.demo_maturity}' vs source '${solDemand.demoMaturity}'`);

  // The load-bearing part: change the source, and the resolved value follows. A copy would not.
  const probeRepo = new InMemoryCapabilityRepository([
    baseIdentity({ capability_id: 'CAP-PROBE', demonstrated_by: ['SOL-DEMAND-02'] })
  ]);
  const originalMaturity = solDemand.demoMaturity;
  (solDemand as any).demoMaturity = 'Reference Pattern';
  const afterMutation = probeRepo.resolveDemoMaturity(probeRepo.getIdentity('CAP-PROBE')!);
  (solDemand as any).demoMaturity = originalMaturity;
  assert(afterMutation === 'Reference Pattern',
    'C3: Mutating the source registry changes the resolved maturity — proving it is a reference, not a copy');

  const unregistered = capabilityRepository.getIdentity('CAP-SHARED-DECISION-STATE')!;
  assert(capabilityRepository.resolveDemoMaturity(unregistered) === null,
    'C4: A capability no solution demonstrates resolves demo maturity as null — honestly absent, not defaulted');

  // ── D. AC-ATL-02-3 — identity and relationship validation ─────────────────
  const malformed = validateIdentities([baseIdentity({ capability_id: 'FORECAST-STABILITY' })]);
  assert(!malformed.valid && malformed.errors.some(e => e.rule === 'V1' && e.field === 'capability_id'),
    'D1: A malformed capability id is rejected and the offending field is named');

  const dangling = validateIdentities([baseIdentity({ demonstrated_by: ['SOL-DOES-NOT-EXIST'] })]);
  assert(!dangling.valid && dangling.errors.some(e => e.field === 'demonstrated_by'),
    'D2: A dangling solution reference fails validation');

  const danglingExp = validateIdentities([baseIdentity({ originated_as: ['EXP-NOPE-99'] })]);
  assert(!danglingExp.valid && danglingExp.errors.some(e => e.field === 'originated_as'),
    'D3: A dangling experiment reference fails validation');

  const dupes = validateIdentities([baseIdentity(), baseIdentity()]);
  assert(!dupes.valid && dupes.errors.some(e => e.message.includes('Duplicate')),
    'D4: Duplicate capability identifiers are rejected');

  const noEvidence = validateIdentities([baseIdentity({ delivered_by: [], knowledge_ref: null })]);
  assert(!noEvidence.valid && noEvidence.errors.some(e => e.rule === 'V1'),
    'D5: A capability with no relationship and no knowledge is refused — admission is on evidence (ADR-052)');

  // ── E. AC-ATL-02-10 — full-identifier matching (ATL-01 gap G6) ────────────
  const beh = CANONICAL_LEARNING_PATTERNS.find(p => p.pattern_id === 'PAT-BEH-05');
  const int = CANONICAL_LEARNING_PATTERNS.find(p => p.pattern_id === 'PAT-INT-05');
  assert(beh !== undefined && int !== undefined && beh.pattern_id !== int.pattern_id,
    'E1: PAT-BEH-05 and PAT-INT-05 are distinct patterns sharing a numeric suffix');

  const suffixProbe = new InMemoryCapabilityRepository([
    baseIdentity({ capability_id: 'CAP-SUFFIX', evidenced_by: ['PAT-BEH-05'] })
  ]);
  const suffixRel = suffixProbe.resolveRelationships(suffixProbe.getIdentity('CAP-SUFFIX')!);
  assert(suffixRel.patterns.length === 1 && suffixRel.patterns[0].id === 'PAT-BEH-05',
    'E2: Pattern resolution keys on the FULL identifier — the suffix-05 collision does not conflate them');

  // ── F. V-rule enforcement over knowledge ──────────────────────────────────
  const allIds = new Set(CAPABILITY_REGISTRY.map(c => c.capability_id));
  const knowledgeEntries: { id: string; knowledge: CapabilityKnowledge }[] = [];
  for (const identity of CAPABILITY_REGISTRY) {
    const k = await loadKnowledge(identity.knowledge_ref);
    if (!k) continue;
    knowledgeEntries.push({ id: identity.capability_id, knowledge: k });
    const kr = validateKnowledge(identity, k, allIds, p => existsSync(join(ROOT, p)));
    assert(kr.valid, `F1[${identity.capability_id}]: Knowledge passes V4–V12 including V8 path existence`,
      kr.errors.map(e => `${e.rule} ${e.field}: ${e.message}`).join(' | '));
  }
  assert(knowledgeEntries.length >= 3, 'F2: At least three knowledge modules exist to exercise the content path');

  const window = CAPABILITY_REGISTRY.find(c => c.capability_id === 'CAP-DECISION-WINDOW')!;
  const windowK = (await loadKnowledge(window.knowledge_ref))!;
  const strippedWarnings: CapabilityKnowledge = {
    ...windowK,
    demo_scenarios: windowK.demo_scenarios.map(d => ({ ...d, warnings: [] }))
  };
  const v12 = validateKnowledge(window, strippedWarnings, allIds);
  assert(!v12.valid && v12.errors.some(e => e.rule === 'V12'),
    'F3: V12 — a demo path for a not-fully-implemented capability with no warnings is refused');

  const noLimits: CapabilityKnowledge = { ...windowK, known_limitations: [] };
  const v7 = validateKnowledge({ ...window, implementation_status: 'simulated' }, noLimits, allIds);
  assert(!v7.valid && v7.errors.some(e => e.rule === 'V7'),
    'F4: V7 — a simulated capability with no stated limitation is refused');

  const badPath: CapabilityKnowledge = {
    ...windowK,
    implementation_references: [{ path: 'lib/does-not-exist.ts' }]
  };
  const v8 = validateKnowledge(window, badPath, allIds, p => existsSync(join(ROOT, p)));
  assert(!v8.valid && v8.errors.some(e => e.rule === 'V8'),
    'F5: V8 — an implementation reference to a non-existent path is refused');

  const unsourced: CapabilityKnowledge = {
    ...windowK,
    external_evidence: [{
      claim: 'A market claim', source_url: '', source_title: 't', publisher: '',
      published_at: '', retrieved_at: '2026-08-20', retrieval_method: 'manual', confidence: 'low'
    }]
  };
  const v9 = validateKnowledge(window, unsourced, allIds);
  assert(!v9.valid && v9.errors.some(e => e.rule === 'V9'),
    'F6: V9 — an external claim without provenance is refused');

  const symmetry = validateRelationSymmetry(knowledgeEntries);
  assert(symmetry.valid, 'F7: V5 — declared symmetric relations are reciprocated across the record set',
    symmetry.errors.map(e => e.message).join(' | '));

  const asymmetric = validateRelationSymmetry([
    { id: 'CAP-A', knowledge: { ...windowK, capability_id: 'CAP-A', related_capabilities: [{ ref: 'CAP-B', relation: 'depends-on' }] } },
    { id: 'CAP-B', knowledge: { ...windowK, capability_id: 'CAP-B', related_capabilities: [] } }
  ]);
  assert(!asymmetric.valid && asymmetric.errors.some(e => e.rule === 'V5'),
    'F8: V5 — an unreciprocated depends-on/enables pair is refused');

  const longSummary = validateIdentities([baseIdentity({ summary: 'x'.repeat(241) })]);
  assert(!longSummary.valid && longSummary.errors.some(e => e.rule === 'V2'),
    'F9: V2 — the registry refuses long-form prose, keeping it a registry and not a documentation store');

  const badDomain = validateIdentities([baseIdentity({ domains: ['not_a_domain'] })]);
  assert(!badDomain.valid && badDomain.errors.some(e => e.rule === 'V3'),
    'F10: V3 — an unknown domain is refused; the taxonomy is closed and owned by config/domains.ts');

  // ── G. AC-ATL-02-1 / AC-ATL-02-5 — the ADR-046 migration ──────────────────
  // `ATL-04R` folded the standalone Questions page into the Atlas, so this reads the Atlas renderer.
  // Both assertions still guard exactly what they always guarded — no authored capability content in
  // the component, and the content read from the governed registry rather than owned by the screen.
  // G2 is now STRICTER than it was: the old surface imported `content/atlas/curiosity-questions`
  // directly into a client component, and the replacement reads it through `/api/v1/atlas/questions`,
  // which is the ADR-046 boundary the rest of the Atlas has always observed.
  const componentSource = readFileSync(join(ROOT, 'components', 'atlas', 'QuestionsWorthExploring.tsx'), 'utf8');
  assert(!componentSource.includes('whyAsking:') && !componentSource.includes('evidencePoints:'),
    'G1: AC-ATL-02-1 — no capability content is authored inside the component (ADR-046)');
  assert(componentSource.includes('fetchQuestions') && !componentSource.includes("from '@/content/atlas/curiosity-questions'"),
    'G2: The component reads the registry through the Atlas API rather than owning the content');

  const originalCount = 4;
  assert(CURIOSITY_QUESTIONS.length === originalCount,
    'G3: AC-ATL-02-5 — all four curiosity questions survived the migration',
    `found ${CURIOSITY_QUESTIONS.length}`);
  // The owner decision of 2026-08-20 upgraded these into first-class governed knowledge objects.
  // The assertions still guard what they always guarded: content preserved, routing preserved.
  assert(CURIOSITY_QUESTIONS.every(q => q.question && q.why_asking && q.evidence_points.length > 0),
    'G4: Migrated question records retain question, rationale and evidence — no content lost');
  assert(CURIOSITY_QUESTIONS.every(q =>
      q.related_experiments.every(e => e.startsWith('EXP-')) &&
      q.related_solutions.every(sl => sl.startsWith('SOL-')) &&
      q.related_experiments.length > 0 && q.related_solutions.length > 0),
    'G5: Solution and experiment provenance is preserved, not dropped or re-derived');

  // ── H. AC-ATL-02-4 — filtering across every required dimension ────────────
  const repo = capabilityRepository;
  assert(repo.listIdentities({ domain: ['retail_grocery'] }).length > 0, 'H1: Filter by domain');
  assert(repo.listIdentities({ persona: ['exec'] }).length > 0, 'H2: Filter by persona lens');
  assert(repo.listIdentities({ business_problem: ['bp-forecast-uncertainty'] }).length > 0, 'H3: Filter by business problem');
  assert(repo.listIdentities({ lifecycle_state: ['Prototype'] }).length > 0, 'H4: Filter by innovation lifecycle state');
  assert(repo.listIdentities({ demo_maturity: ['Production Ready'] }).length > 0, 'H5: Filter by demonstration maturity (resolved, not stored)');
  assert(repo.listIdentities({ implementation_status: ['partially-implemented'] }).length > 0, 'H6: Filter by implementation status');
  assert(repo.listIdentities({ capability_type: ['governance-control'] }).length > 0, 'H7: Filter by capability type');
  assert(repo.listIdentities({ platform_reusable: true }).length > 0, 'H8: Filter by platform reusability');
  assert(repo.listIdentities({ tags: ['detection'] }).length > 0, 'H9: Filter by tag');
  assert(repo.listIdentities({ delivered_by: ['DDF-01'] }).length === 4, 'H10: Filter by delivering work package');

  const andFilter = repo.listIdentities({ domain: ['retail_grocery'], implementation_status: ['implemented'] });
  assert(andFilter.every(c => c.domains.includes('retail_grocery') && c.implementation_status === 'implemented'),
    'H11: Filters combine as AND across dimensions');

  const orFilter = repo.listIdentities({ implementation_status: ['implemented', 'partially-implemented'] });
  assert(orFilter.length > andFilter.length,
    'H12: Repeated values within one dimension combine as OR');

  // ── I. Domain independence (ADR-002/ADR-003) ──────────────────────────────
  const fictitious = new InMemoryCapabilityRepository([
    baseIdentity({ capability_id: 'CAP-FICTITIOUS', domains: ['atlantis_shipping'] })
  ]);
  assert(fictitious.listIdentities({ domain: ['atlantis_shipping'] }).length === 1,
    'I1: A domain the code has never seen is queryable without any code change — domains are data');
  assert(fictitious.listIdentities({ domain: ['retail_grocery'] }).length === 0,
    'I2: Domain filtering discriminates correctly for an unknown domain');

  // ── J. Level 1 search (ADR-050) ───────────────────────────────────────────
  const ctx = { resolveDemoMaturity: (c: CapabilityIdentity) => repo.resolveDemoMaturity(c) };
  const all = repo.listIdentities();

  const s1 = searchCapabilities(all, 'decision gap', {}, ctx);
  assert(s1.results.length > 0 && s1.results[0].capability_id === 'CAP-DECISION-GAP',
    'J1: Structured search ranks the exact-name capability first');

  const s2 = searchCapabilities(all, 'decision gap', {}, ctx);
  assert(JSON.stringify(s1.results.map(r => r.capability_id)) === JSON.stringify(s2.results.map(r => r.capability_id)),
    'J2: Search is deterministic — identical corpus and query give identical ordering');

  assert(s1.results[0].matches.some(m => m.field === 'name'),
    'J3: The response names the fields that matched, so ranking is inspectable');

  assert(s1.results.every(r => r.implementation_status !== undefined && r.lifecycle_state !== undefined && 'demo_maturity' in r),
    'J4: Every result carries all three maturity dimensions — a searcher never reaches a simulated capability unaware');

  const s3 = searchCapabilities(all, 'DDF-01', {}, ctx);
  const topFour = s3.results.slice(0, 4).map(r => r.capability_id).sort();
  assert(
    JSON.stringify(topFour) === JSON.stringify(ddf.map(c => c.capability_id).sort()),
    'J5: Searching a work package ranks all four capabilities it delivered above any incidental match',
    `top four were ${topFour.join(', ')}`
  );
  assert(
    s3.results.slice(0, 4).every(r => r.score > (s3.results[4]?.score ?? 0)),
    'J6: Weighted scoring separates a delivered_by match from a coincidental substring match'
  );

  const s4 = searchCapabilities(all, 'zzzznomatch', { domain: ['retail_grocery'] }, ctx);
  assert(s4.results.length === 0 && typeof s4.suggestion === 'string' && s4.suggestion.length > 0,
    'J7: Zero results return the nearest filter relaxation, never a bare empty page');

  const s5 = searchCapabilities(all, '', {}, ctx);
  assert(s5.results.length === all.length, 'J8: An empty query with no filters returns the full corpus');

  assert(FIELD_WEIGHTS.name > FIELD_WEIGHTS.summary && FIELD_WEIGHTS.summary > FIELD_WEIGHTS.domains,
    'J9: Field weighting is published and ordered, so ranking is explainable');

  // ── K. Routes — real handlers, not mocks ──────────────────────────────────
  const rCaps = await json(await getCapabilities(req('/api/v1/atlas/capabilities')));
  assert(rCaps.status === 'success' && rCaps.count === CAPABILITY_REGISTRY.length,
    'K1: GET /api/v1/atlas/capabilities returns the registry');
  assert(rCaps.data.every((d: any) => 'demo_maturity' in d),
    'K2: The list response attaches resolved demonstration maturity to every capability');

  const rFiltered = await json(await getCapabilities(req('/api/v1/atlas/capabilities?delivered_by=DDF-01')));
  assert(rFiltered.count === 4, 'K3: Route-level filtering by work package returns the four DDF-01 capabilities');

  const rBad = await getCapabilities(req('/api/v1/atlas/capabilities?domain=not_a_domain'));
  const rBadBody = await json(rBad);
  assert(rBad.status === 400 && rBadBody.field === 'domain',
    'K4: An unknown filter value returns a typed 400 naming the field — never a silent empty result');

  const rOne = await json(await getCapabilityById(req('/api/v1/atlas/capabilities/CAP-DECISION-GAP'), { params: Promise.resolve({ id: 'CAP-DECISION-GAP' }) }));
  assert(rOne.data.identity.capability_id === 'CAP-DECISION-GAP' && rOne.data.knowledge !== null,
    'K5: GET by id resolves identity and loads its knowledge module');
  assert(rOne.data.relationships.solutions.length === 1 && rOne.data.relationships.solutions[0].id === 'SOL-DEMAND-02',
    'K6: Relationship targets are resolved from their own registries in the response');

  const rNoK = await json(await getCapabilityById(req('/api/v1/atlas/capabilities/CAP-DECISION-GAP?knowledge=false'), { params: Promise.resolve({ id: 'CAP-DECISION-GAP' }) }));
  assert(rNoK.data.knowledge === null,
    'K7: Knowledge is loaded on demand — the identity path does not pay for content it was not asked for');

  const rMissing = await getCapabilityById(req('/api/v1/atlas/capabilities/CAP-NOPE'), { params: Promise.resolve({ id: 'CAP-NOPE' }) });
  assert(rMissing.status === 404, 'K8: An unknown capability id returns 404');

  const rLens = await json(await getCapabilityById(req('/api/v1/atlas/capabilities/CAP-DECISION-GAP?lens=architect'), { params: Promise.resolve({ id: 'CAP-DECISION-GAP' }) }));
  const rLensDev = await json(await getCapabilityById(req('/api/v1/atlas/capabilities/CAP-DECISION-GAP?lens=developer'), { params: Promise.resolve({ id: 'CAP-DECISION-GAP' }) }));
  assert(JSON.stringify(rLens.data.knowledge) === JSON.stringify(rLensDev.data.knowledge),
    'K9: Two lenses return IDENTICAL content — a lens reorders, it never forks the record');
  assert(JSON.stringify(rLens.data.lens_field_order) !== JSON.stringify(rLensDev.data.lens_field_order),
    'K10: …but the ordering hint differs between lenses');

  const rDomains = await json(await getDomains(req('/api/v1/atlas/domains')));
  const retail = rDomains.data.flatMap((c: any) => c.items).find((i: any) => i.id === 'retail_grocery');
  assert(retail && retail.capability_count > 0,
    'K11: GET domains reads config/domains.ts and reports live capability counts');

  const rTags = await json(await getTags(req('/api/v1/atlas/tags')));
  assert(rTags.count > 0 && rTags.data[0].count >= rTags.data[rTags.data.length - 1].count,
    'K12: GET tags returns the controlled vocabulary ordered by frequency');

  const rRel = await json(await getRelationships(req('/api/v1/atlas/relationships')));
  const relDdf = rRel.data.delivered_by.find((d: any) => d.work_package === 'DDF-01');
  assert(relDdf?.capability_ids.length === 4,
    'K13: GET relationships exposes the ADR-052 cardinality view (DDF-01 → four capabilities)');

  const rEvidence = await json(await getEvidence(req('/api/v1/atlas/evidence?capability_id=CAP-FORECAST-STABILITY')));
  assert(rEvidence.data.length === 1 && rEvidence.data[0].validation_evidence.length > 0,
    'K14: GET evidence returns provenance-bearing evidence refs for a capability');
  assert(rEvidence.data[0].validation_evidence.every((e: any) => e.ref && e.observed_at && e.observed_by),
    'K15: Every evidence ref carries what it demonstrates, when it was observed and by whom');

  // Before ATL-03 this asserted that an unauthored capability returned an honest empty. ATL-03
  // authored knowledge for every capability, so that state no longer exists in the corpus. The
  // mechanism is still asserted — an unknown id returns empty rather than inventing a record —
  // and the ATL-03 completion property is asserted alongside it.
  const rEvidenceNone = await json(await getEvidence(req('/api/v1/atlas/evidence?capability_id=CAP-DOES-NOT-EXIST')));
  assert(rEvidenceNone.data.length === 0,
    'K16: An unknown capability id returns an honest empty, not a fabricated record');

  const rEvidenceAll = await json(await getEvidence(req('/api/v1/atlas/evidence')));
  assert(rEvidenceAll.data.length === CAPABILITY_REGISTRY.length,
    'K16b: ATL-03 completion — every registered capability carries evidence',
    `${rEvidenceAll.data.length} of ${CAPABILITY_REGISTRY.length} capabilities carry evidence`);
  assert(rEvidenceAll.data.every((d: any) => d.validation_evidence.length > 0),
    'K16c: Every capability cites at least one evidence reference');

  const rSearch = await json(await getSearch(req('/api/v1/atlas/search?q=forecast')));
  assert(rSearch.data.level === 'structured' && rSearch.data.results.length > 0,
    'K17: GET search returns Level 1 structured results');
  assert(rSearch.data.results.every((r: any) => r.level === 'structured'),
    'K18: Every result declares which search level produced it, so ATL-05 can merge levels honestly');

  const rSearchBad = await getSearch(req('/api/v1/atlas/search?implementation_status=invented'));
  assert(rSearchBad.status === 400, 'K19: Search rejects an unknown filter value with a typed 400');

  // ── L. No AI dependency at ATL-02 (ADR-049/ADR-050) ───────────────────────
  const atlasFiles = [
    'services/atlas/src/capability-registry.ts',
    'services/atlas/src/capability-knowledge-store.ts',
    'lib/atlas/capability-search.ts',
    'lib/atlas/capability-validator.ts'
  ];
  /** Strip comments: a doc comment SAYING "no AI provider" must not read as one. */
  const stripComments = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const atlasCode = atlasFiles.map(p => stripComments(readFileSync(join(ROOT, p), 'utf8'))).join('\n');
  assert(!/gemini|generative-ai|openai|embedding/i.test(atlasCode),
    'L1: No AI provider or embedding dependency exists in ATL-02 backend CODE — Level 1 stands alone');
  assert(!/fetch\(|https?:\/\//.test(atlasCode),
    'L2: The ATL-02 backend makes no network call — retrieval is local and deterministic');

  // ── M. Registry compactness (the ATL-02 boundary constraint) ──────────────
  const registryLines = registrySource.split('\n').length;
  const knowledgeRefs = listKnowledgeRefs();
  assert(knowledgeRefs.length >= 3,
    'M1: Capability knowledge lives in separate on-demand modules, not in the registry');
  assert(!/description:|innovation_thesis:|architecture_narrative:|usage_instructions:/.test(registrySource),
    'M2: The identity registry carries NO long-form knowledge fields — the boundary holds');
  assert(CAPABILITY_REGISTRY.every(c => c.summary.length <= 240),
    'M3: Every registry summary is bounded, so the registry cannot silently become a documentation store');
  console.log(`       (registry: ${registryLines} lines for ${CAPABILITY_REGISTRY.length} capabilities; knowledge modules: ${knowledgeRefs.length})`);

  // Summary
  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('ATL-02 test suite failed with an error:', err);
  process.exit(1);
});
