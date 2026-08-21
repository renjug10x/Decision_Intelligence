/**
 * Unit Test Suite for CogniX ATL-04 Atlas UX & Structured Search
 * Run via: npx tsx tests/unit/run-atl04-tests.ts
 *
 * Two things are asserted here that no earlier suite could assert:
 *   1. Search answers REAL QUESTIONS, not just keywords. The seven acceptance queries are run
 *      against the live corpus and their top results are checked for relevance, not for count.
 *   2. The UI consumes the backend and holds no capability content of its own (ADR-046), and
 *      never collapses the three maturity dimensions into one badge (ADR-047).
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { capabilityRepository } from '../../services/atlas/src/capability-registry';
import { searchCapabilities } from '../../lib/atlas/capability-search';
import { getCapabilityIndex, clearCapabilityIndex } from '../../lib/atlas/capability-index';
import { understandQuery, STOPWORDS } from '../../lib/atlas/query-understanding';
import { GET as getSearch } from '../../app/api/v1/atlas/search/route';
import { ATLAS_LENSES } from '../../packages/contracts/src/capability-atlas-model';
import { LENS_PROFILES, DEFAULT_HEADLINES, orderForLens } from '../../lib/atlas/lens';
import { CAPABILITY_REGISTRY as REGISTRY_FOR_LENS } from '../../config/capabilities';
import type { CapabilityIdentity } from '../../packages/contracts/src/capability-atlas-model';

const ROOT = join(__dirname, '..', '..');
const ATLAS_DIR = join(ROOT, 'components', 'atlas');
let passed = 0, failed = 0;

function assert(c: boolean, name: string, detail?: string) {
  if (c) { console.log(`[PASS] ${name}`); passed++; }
  else { console.error(`[FAIL] ${name} - ${detail || 'Assertion failed'}`); failed++; }
}
function req(url: string): any { const u = new URL(url, 'http://localhost'); return { nextUrl: u, url: u.toString() }; }

async function run() {
  console.log('\n=== ATL-04 — Atlas UX & Structured Search ===\n');

  clearCapabilityIndex();
  const all = capabilityRepository.listIdentities();
  const index = await getCapabilityIndex(all);
  const ctx = { resolveDemoMaturity: (c: CapabilityIdentity) => capabilityRepository.resolveDemoMaturity(c) };
  const search = (q: string, f = {}) => searchCapabilities(all, q, f, ctx, { index });

  // ── A. The index covers governed knowledge, not just identity ─────────────
  assert(index.length === all.length, 'A1: The index covers every registered capability');
  assert(index.every(e => 'description' in e.fields && 'testing' in e.fields && 'architecture' in e.fields),
    'A2: ADR-050 knowledge field groups are indexed, not only identity fields');
  assert(index.some(e => e.fields.testing.length > 0),
    'A3: Testing instructions are searchable — "how do I test X" has something to match');

  // ── B. Query understanding is deterministic and declared ──────────────────
  const u1 = understandQuery('why did the decision change');
  assert(!u1.terms.includes('why') && !u1.terms.includes('did') && !u1.terms.includes('the'),
    'B1: Function words are removed rather than matching every capability');
  assert(u1.terms.includes('decision') && u1.terms.includes('change'),
    'B2: Content words survive');
  assert(u1.phrases.includes('decision change'),
    'B3: Adjacent content words form phrases for phrase boosting');
  assert(STOPWORDS.has('how') && STOPWORDS.has('what') && STOPWORDS.has('i'),
    'B4: The stopword list is declared and covers question openers');

  const u2 = understandQuery('what can I reuse outside retail');
  assert(u2.hints.some(h => h.filter?.platform_reusable === true),
    'B5: A reuse question produces a declared platform-reusable hint');
  assert(u2.hints.every(h => h.trigger.length > 0),
    'B6: Every hint names the phrase that produced it, so the user can see why');

  const u3 = understandQuery('capabilities for an architect');
  assert(u3.hints.some(h => h.kind === 'lens' && h.lens === 'architect'),
    'B7: A role question produces a declared lens hint');
  assert(u3.hints.filter(h => h.kind === 'lens').length === 1,
    'B8: At most one lens hint is offered');

  const u4 = understandQuery('DDF-01');
  assert(u4.identifiers.includes('ddf-01') && u4.terms.length === 0,
    'B9: A governed identifier is extracted whole and never split into ddf and 01');

  // ── C. The seven acceptance questions ─────────────────────────────────────
  const top = (q: string, n = 3) => search(q).results.slice(0, n).map(r => r.capability_id);

  assert(top('forecast uncertainty').includes('CAP-FORECAST-STABILITY'),
    'C1: "forecast uncertainty" surfaces Forecast Stability', top('forecast uncertainty').join(', '));
  assert(top('forecast uncertainty')[0] === 'CAP-DEMAND-FORECAST',
    'C2: …led by the Demand & Forecast surface that presents it');

  const decisionChange = search('why did the decision change');
  assert(decisionChange.total < all.length,
    'C3: "why did the decision change" no longer matches the entire corpus',
    `${decisionChange.total} of ${all.length}`);
  assert(decisionChange.results.slice(0, 5).some(r =>
    ['CAP-DECISION-CONTRACT', 'CAP-SHARED-DECISION-STATE', 'CAP-DECISION-TIMELINE'].includes(r.capability_id)),
    'C4: …and surfaces capabilities that explain decision change');

  assert(top('promotion risk')[0] === 'CAP-PROMOTION-INTELLIGENCE',
    'C5: "promotion risk" leads with Promotion Intelligence', top('promotion risk').join(', '));

  const signals = top('external signals');
  assert(signals.includes('CAP-SIGNAL-CONNECTOR'),
    'C6: "external signals" surfaces the External Signal Connector', signals.join(', '));

  const reuse = search('what can I reuse outside retail');
  assert(reuse.hints.some(h => h.filter?.platform_reusable === true),
    'C7: "what can I reuse outside retail" offers the reusable filter');
  const reuseApplied = searchCapabilities(
    capabilityRepository.listIdentities({ platform_reusable: true }),
    'what can I reuse outside retail', { platform_reusable: true }, ctx, { index });
  assert(reuseApplied.total > 0 && reuseApplied.total < all.length,
    'C8: …and applying it narrows the corpus to reusable capabilities',
    `${reuseApplied.total} of ${all.length}`);

  const testGap = search('how do I test Decision Gap');
  assert(testGap.results[0].capability_id === 'CAP-DECISION-GAP',
    'C9: "how do I test Decision Gap" ranks Decision Gap FIRST, not Decision Window',
    testGap.results.slice(0, 3).map(r => r.capability_id).join(', '));
  assert(testGap.results[0].score > testGap.results[1].score * 1.5,
    'C10: …decisively, because the phrase match outweighs the shared word "decision"');

  const architect = search('capabilities for an architect');
  assert(architect.hints.some(h => h.lens === 'architect'),
    'C11: "capabilities for an architect" offers the Architect lens');
  assert(architect.total < all.length,
    'C12: …and does not return the entire corpus', `${architect.total} of ${all.length}`);

  // ── D. Determinism and explainability (ADR-050) ───────────────────────────
  const a = search('promotion risk').results.map(r => r.capability_id);
  const b = search('promotion risk').results.map(r => r.capability_id);
  assert(JSON.stringify(a) === JSON.stringify(b), 'D1: Search is deterministic');
  assert(search('promotion risk').results[0].matches.length > 0,
    'D2: Results name the fields that matched, so ranking is inspectable');
  assert(search('zzzznothingmatches').total === 0 && Boolean(search('zzzznothingmatches').suggestion),
    'D3: A zero-result search returns guidance, never a bare empty page');

  // ── E. Every result carries all three maturity dimensions ─────────────────
  const anyResults = search('decision').results;
  assert(anyResults.every(r => 'lifecycle_state' in r && 'demo_maturity' in r && r.implementation_status),
    'E1: ADR-047 — every result carries all three dimensions');
  assert(anyResults.some(r => r.lifecycle_state === null),
    'E2: A null lifecycle is preserved honestly rather than inferred');
  assert(anyResults.some(r => r.implementation_status !== 'implemented'),
    'E3: Not-fully-implemented capabilities appear in results rather than being hidden');

  // ── F. Route-level behaviour ──────────────────────────────────────────────
  const r1 = await (await getSearch(req('/api/v1/atlas/search?q=how%20do%20I%20test%20Decision%20Gap'))).json();
  assert(r1.data.results[0].capability_id === 'CAP-DECISION-GAP',
    'F1: The search route reproduces the ranking end to end');
  assert(Array.isArray(r1.data.hints), 'F2: The route returns declared hints for the UI to surface');
  const r2 = await getSearch(req('/api/v1/atlas/search?domain=not_a_domain'));
  assert(r2.status === 400, 'F3: An unknown filter value still returns a typed 400');

  // ── G. The UI consumes the backend and holds no capability content ────────
  const uiFiles = readdirSync(ATLAS_DIR).filter(f => f.endsWith('.tsx'));
  assert(uiFiles.length >= 4, 'G1: The Atlas UI exists', uiFiles.join(', '));

  const uiSource = uiFiles.map(f => readFileSync(join(ATLAS_DIR, f), 'utf8')).join('\n');
  assert(!/from '@\/config\/capabilities'/.test(uiSource) && !/CAPABILITY_REGISTRY/.test(uiSource),
    'G2: ADR-046 — no Atlas component imports the registry directly; content arrives via the API');
  assert(!/content\/atlas\/capabilities/.test(uiSource),
    'G3: No component imports a knowledge module directly');
  assert(/atlas-client/.test(uiSource),
    'G4: Components read through the Atlas API client');

  // No capability prose authored in the UI. Knowledge field names must not be assigned literals.
  assert(!/innovation_thesis:\s*'/.test(uiSource) && !/description:\s*'/.test(uiSource),
    'G5: No capability content is authored as a literal in any Atlas component');

  // ── H. Maturity is never collapsed into one badge (ADR-047) ───────────────
  const triad = readFileSync(join(ATLAS_DIR, 'MaturityTriad.tsx'), 'utf8');
  assert(/Lifecycle/.test(triad) && /Demo/.test(triad) && /Build/.test(triad),
    'H1: The maturity component renders three separately labelled dimensions');
  assert(/not owned/.test(triad) && /no surface/.test(triad),
    'H2: Absent dimensions are stated honestly rather than defaulted or hidden');
  assert(/atlas-dot--simulated/.test(triad) && /Simulated/.test(triad),
    'H3: Implementation truth is carried by shape AND word, not colour alone');

  const detail = readFileSync(join(ATLAS_DIR, 'CapabilityDetail.tsx'), 'utf8');

  /*
    H4 and H5 originally grepped this component for four literal question strings and for the
    `LENS_PRIORITY` table that ordered its sections. `ATL-06D` moved both into the governed lens
    profile (`lib/atlas/lens.ts`, ADR-064), because owner evaluation found that a lens which only
    reordered sections read as decorative — defect `D-ATL-04R-1`.

    Re-pointed rather than relaxed. What H4 protects is that the detail view answers four questions
    ABOVE THE FOLD before any disclosure, and what H5 protects is that a lens reorders without
    hiding. Both are now asserted against the profile itself, which is a stronger check than a
    string match: the four questions are verified for every lens AND for the neutral default, and
    the reorder-never-hide rule is verified as a property of `orderForLens` rather than as a
    sentence in the interface. The original four questions survive as the unlensed default.
  */
  assert(/atlas-fourup/.test(detail) && /resolveHeadlines/.test(detail),
    'H4a: The detail view still answers four questions above the fold, now resolved per lens');
  const defaultQuestions = DEFAULT_HEADLINES.map(h => h.question);
  assert(defaultQuestions.includes('What problem does this solve?') &&
         defaultQuestions.includes('Why does it matter?') &&
         defaultQuestions.includes('Can I demonstrate it?') &&
         defaultQuestions.includes('Can I reuse it elsewhere?'),
    'H4: The four required questions are the neutral default, unchanged when no lens is selected');
  assert(ATLAS_LENSES.every(l => LENS_PROFILES[l].headlines.length === 4) && DEFAULT_HEADLINES.length === 4,
    'H4b: …and every lens answers exactly four, so the shape above the fold is constant');

  assert(ATLAS_LENSES.every(l => {
    const ordered = orderForLens(REGISTRY_FOR_LENS.map(identity => ({
      identity, demo_maturity: null, relationships: { solutions: [], experiments: [], patterns: [], work_packages: [] },
      knowledge: null, lens: l, lens_field_order: []
    })), l);
    return ordered.length === REGISTRY_FOR_LENS.length;
  }), 'H5: Lenses reorder rather than hide — a lens ordering is a permutation, asserted not stated');
  assert(/never changes a fact/.test(detail) && /present under every lens/.test(detail),
    'H5a: …and the interface says so to the reader');
  assert(/Before you show this/.test(detail),
    'H6: Demo warnings are surfaced to the presenter, not buried in the payload');

  // ── I. ATL-05/06 scope is not pre-empted ──────────────────────────────────
  // Scoped to the files ATL-04 owns. ATL-05 later added AskCogniX and ATL-06A added EvidenceClasses;
  // both legitimately name grounding, and folding them in would turn this scope guard into an
  // assertion that later phases never shipped — which is not what it was written to protect.
  const ATL04_UI = ['CapabilityAtlas.tsx', 'CapabilityCard.tsx', 'CapabilityDetail.tsx', 'MaturityTriad.tsx'];
  const atl04UiSource = ATL04_UI.map(f => readFileSync(join(ATLAS_DIR, f), 'utf8')).join('\n');
  const atlasCode = atl04UiSource + readFileSync(join(ROOT, 'lib', 'atlas', 'capability-search.ts'), 'utf8') +
                    readFileSync(join(ROOT, 'lib', 'atlas', 'capability-index.ts'), 'utf8') +
                    readFileSync(join(ROOT, 'lib', 'atlas', 'query-understanding.ts'), 'utf8');
  const stripped = atlasCode.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert(!/gemini|generative-ai|openai|embedding|grounding/i.test(stripped),
    'I1: No semantic retrieval, provider or grounding code exists in ATL-04');
  /*
    I2 originally required the detail view to say "Planned for ATL-06" — a guard against ATL-04
    simulating a feature it had not built. `ATL-06D` built it, so requiring the placeholder would
    turn this into an assertion that a later phase never shipped, which the note above I1 already
    identifies as the wrong thing for a scope guard to become.

    What I2 protects is that the preparation surface is NOT SIMULATED. That is now checked directly
    and far more strictly: the workspace must obtain its content from the governed API, and must not
    carry capability knowledge, warnings or recommendations of its own (ADR-046).
  */
  const prepSurface = readFileSync(join(ATLAS_DIR, 'ClientPreparation.tsx'), 'utf8');
  assert(/preparePack\(/.test(prepSurface),
    'I2: The client-preparation surface obtains its content from the governed API');
  const prepStripped = prepSurface.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert(!/CAP-[A-Z]/.test(prepStripped),
    'I2a: …and hardcodes no capability, so nothing on it is simulated');

  // ── J. Responsive behaviour is specified, not assumed ─────────────────────
  const css = readFileSync(join(ROOT, 'app', 'globals.css'), 'utf8');
  const atlasCss = css.slice(css.indexOf('CAPABILITY ATLAS (ATL-04)'));
  assert(/@media \(max-width: 1024px\)/.test(atlasCss) && /@media \(max-width: 720px\)/.test(atlasCss),
    'J1: The Atlas defines reduced-viewport behaviour at two breakpoints');
  assert(/\.atlas-fourup \{[^}]*grid-template-columns: repeat\(4, 1fr\)/.test(atlasCss),
    'J2: The four questions are a four-column grid at desktop');
  assert(/grid-template-columns: repeat\(2, 1fr\)/.test(atlasCss) && /grid-template-columns: 1fr/.test(atlasCss),
    'J3: …collapsing to two columns and then one as width reduces');
  assert(/max-width: 1180px/.test(atlasCss), 'J4: Content is width-bounded rather than sprawling');
  assert(/:focus-visible/.test(atlasCss), 'J5: Keyboard focus is visible on interactive elements');

  // ── K. Search is primary, not a toolbar control ───────────────────────────
  const container = readFileSync(join(ATLAS_DIR, 'CapabilityAtlas.tsx'), 'utf8');
  const searchIdx = container.indexOf('atlas-searchbar');
  const resultsIdx = container.indexOf('atlas-results');
  const filtersIdx = container.indexOf('atlas-filters');
  assert(searchIdx > 0 && searchIdx < resultsIdx && searchIdx < filtersIdx,
    'K1: Search is rendered above both the filters and the result list');
  assert(/EXAMPLE_QUERIES/.test(container) && /how do I test Decision Gap/.test(container),
    'K2: The landing offers real questions, not keyword hints');
  assert(/Ask a question/.test(container),
    'K3: The placeholder invites a question rather than a keyword');

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error('ATL-04 test suite failed with an error:', e); process.exit(1); });
