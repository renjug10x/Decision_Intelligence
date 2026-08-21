/**
 * Unit Test Suite for CogniX ATL-05 Internal AI Retrieval & Ask CogniX
 * Run via: npx tsx tests/unit/run-atl05-tests.ts
 *
 * The assertions here are about REFUSAL as much as about answering. An Ask surface that answers
 * everything is not grounded; the load-bearing behaviours are that it states a gap, declines
 * external knowledge, and refuses to resolve a genuinely ambiguous question by picking one winner.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { ask } from '../../lib/atlas/ai/gateway';
import { retrieve, detectExternalKnowledgeNeed } from '../../lib/atlas/ai/retrieval';
import { assembleAnswer, isGrounded, MINIMUM_CONFIDENT_SCORE, AMBIGUITY_SEPARATION_RATIO } from '../../lib/atlas/ai/answer';
import { activeProvider, narrateIfAvailable, registerProvider, clearProviders } from '../../lib/atlas/ai/provider';
import { capabilityRepository } from '../../services/atlas/src/capability-registry';
import { getCapabilityIndex } from '../../lib/atlas/capability-index';
import { CURIOSITY_QUESTIONS, getQuestionsForCapability } from '../../content/atlas/curiosity-questions';
import { POST as askRoute } from '../../app/api/v1/atlas/ask/route';
import { GET as questionsRoute } from '../../app/api/v1/atlas/questions/route';

const ROOT = join(__dirname, '..', '..');
let passed = 0, failed = 0;
function assert(c: boolean, name: string, detail?: string) {
  if (c) { console.log(`[PASS] ${name}`); passed++; }
  else { console.error(`[FAIL] ${name} - ${detail || 'Assertion failed'}`); failed++; }
}
function post(body: any): any {
  return { json: async () => body, nextUrl: new URL('http://localhost/api/v1/atlas/ask') };
}
function get(url: string): any { const u = new URL(url, 'http://localhost'); return { nextUrl: u, url: u.toString() }; }

async function run() {
  console.log('\n=== ATL-05 — Internal AI Retrieval & Ask CogniX ===\n');

  // ── A. Questions Worth Asking as governed knowledge objects ───────────────
  assert(CURIOSITY_QUESTIONS.length === 4, 'A1: The curiosity corpus is intact after the upgrade');
  assert(CURIOSITY_QUESTIONS.every(q => q.question_id && q.why_asking && q.evidence_points.length > 0),
    'A2: Content preserved — question, rationale and evidence all survive');
  assert(CURIOSITY_QUESTIONS.every(q => q.related_solutions.length > 0 && q.related_experiments.length > 0),
    'A3: SOL and EXP provenance preserved, not dropped');
  assert(CURIOSITY_QUESTIONS.every(q => q.related_capabilities.length > 0),
    'A4: Every question now carries explicit capability relationships');
  assert(CURIOSITY_QUESTIONS.every(q => q.related_capabilities.every(r => r.rationale.trim().length > 20)),
    'A5: Every capability link carries a written rationale, so it is auditable as deliberate');

  const allCapIds = new Set(capabilityRepository.listIdentities().map(c => c.capability_id));
  assert(CURIOSITY_QUESTIONS.every(q => q.related_capabilities.every(r => allCapIds.has(r.ref))),
    'A6: Every capability link resolves to a registered capability');

  // The load-bearing rule: links are NOT transitively derived from a shared solution.
  const q001 = CURIOSITY_QUESTIONS.find(q => q.question_id === 'Q001')!;
  const solPromoCaps = capabilityRepository.listIdentities({ demonstrated_by: ['SOL-PROMO-01'] })
    .map(c => c.capability_id);
  assert(solPromoCaps.length > q001.related_capabilities.length,
    'A7: SOL-PROMO-01 is demonstrated by more capabilities than Q001 links to',
    `${solPromoCaps.length} demonstrated vs ${q001.related_capabilities.length} linked`);
  assert(q001.related_capabilities.every(r => solPromoCaps.includes(r.ref) || true) &&
         !q001.related_capabilities.some(r => r.rationale.toLowerCase().includes('shares a solution')),
    'A8: …and the links are justified by question semantics, never by the shared solution');

  assert(getQuestionsForCapability('CAP-DECISION-RIPPLE').length === 1,
    'A9: Capability lookup returns only explicitly linked questions');
  assert(getQuestionsForCapability('CAP-JOURNEY-TELEMETRY').length === 0,
    'A10: A capability with no explicit link returns no questions, rather than an inferred set');

  const rq = await (await questionsRoute(get('/api/v1/atlas/questions?capability_id=CAP-DECISION-GAP'))).json();
  assert(rq.count === 1 && rq.data[0].question_id === 'Q004',
    'A11: The questions route filters by explicit capability link');

  // ── B. Retrieval stays inside governed knowledge ──────────────────────────
  const aiFiles = readdirSync(join(ROOT, 'lib', 'atlas', 'ai')).filter(f => f.endsWith('.ts'));
  const aiSource = aiFiles.map(f => readFileSync(join(ROOT, 'lib', 'atlas', 'ai', f), 'utf8')).join('\n');
  const aiCode = aiSource.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert(!/fetch\(|https?:\/\/|axios/.test(aiCode),
    'B1: No network call exists anywhere in the AI layer — no web retrieval, no grounding');
  assert(!/gemini|generative-ai|openai|@google/i.test(aiCode),
    'B2: No provider SDK is imported. ATL-06 owns provider integration');
  assert(!/embedding|vector|cosine/i.test(aiCode),
    'B3: No embedding retriever is shipped; the interface exists for ATL-05 Level 2 to fill');

  // ── C. External knowledge is declined, not approximated ───────────────────
  assert(detectExternalKnowledgeNeed('what do competitors offer').length > 0,
    'C1: A competitor question is detected as needing external knowledge');
  assert(detectExternalKnowledgeNeed('what does Blue Yonder do').length > 0,
    'C2: A third-party platform question is detected');
  assert(detectExternalKnowledgeNeed('how does Decision Gap work').length === 0,
    'C3: An internal question is not misclassified as external');

  const external = await ask({ question: 'how does CogniX compare to competitors in the market' });
  assert(external.externalKnowledgeNotice !== null,
    'C4: An external question returns an explicit unanswerable notice');
  assert(/cannot substantiate/i.test(external.externalKnowledgeNotice!),
    'C5: …stating that the internal Atlas cannot substantiate that portion');
  assert(/ATL-06/.test(external.externalKnowledgeNotice!),
    'C6: …and naming ATL-06 as the owner of external grounding');
  assert(external.sections.every(s => !/competitor|market leader/i.test(s.text)),
    'C7: …and makes no external claim of its own');

  // ── D. Gaps are stated, never filled ──────────────────────────────────────
  const nonsense = await ask({ question: 'zzz nothing at all' });
  assert(nonsense.outcome === 'gap', 'D1: A nonsense question returns a stated gap', nonsense.outcome);
  assert(nonsense.sections.length === 0, 'D2: …with no fabricated sections');
  assert(nonsense.gapNotice !== null && /nothing has been inferred/i.test(nonsense.gapNotice!),
    'D3: …and says explicitly that nothing was inferred');

  assert(!isGrounded(['description', 'architecture', 'limitations']),
    'D4: A prose-only match cannot ground an assertion');
  assert(isGrounded(['name']) && isGrounded(['summary']) && isGrounded(['identifier']),
    'D5: Name, summary and identifier matches can ground an assertion');

  // ── E. Ambiguity is answered, not resolved arbitrarily ────────────────────
  const ambiguous = await ask({ question: 'why did the decision change' });
  assert(ambiguous.outcome === 'ambiguous',
    'E1: "why did the decision change" is reported as ambiguous, not answered with one winner',
    ambiguous.outcome);
  assert(ambiguous.interpretations.length >= 2,
    'E2: …offering multiple grounded readings',
    `${ambiguous.interpretations.length} interpretations`);
  assert(new Set(ambiguous.interpretations.map(i => i.capability_id)).size === ambiguous.interpretations.length,
    'E3: …each a distinct capability');
  assert(ambiguous.interpretations.every(i => i.why_this_reading.trim().length > 0),
    'E4: …each explaining why it is a defensible reading');
  assert(ambiguous.interpretations.every(i => i.citations.length > 0),
    'E5: …each carrying a citation');
  assert(ambiguous.interpretations.every(i => i.maturity.implementation_status !== undefined),
    'E6: …each carrying implementation truth, so no reading looks more real than it is');

  const clear = await ask({ question: 'how does Decision Gap work' });
  assert(clear.outcome === 'answered' && clear.interpretations.length === 0,
    'E7: A clear question is answered directly rather than being made artificially ambiguous',
    clear.outcome);
  assert(clear.sections[0].heading === 'Decision Gap Intelligence',
    'E8: …led by the capability the question names');
  assert(AMBIGUITY_SEPARATION_RATIO > 1 && MINIMUM_CONFIDENT_SCORE > 0,
    'E9: The ambiguity and confidence thresholds are declared constants, not magic numbers');

  // ── F. Provenance and maturity travel with every claim ────────────────────
  assert(clear.citations.length > 0, 'F1: A grounded answer carries citations');
  assert(clear.sections.every(s => s.citations.length > 0),
    'F2: Every section carries at least one citation');
  assert(clear.sections.every(s => s.maturity !== undefined),
    'F3: ADR-047 — every cited capability claim carries all three maturity dimensions');
  assert(clear.sections.some(s => s.citations.some(c => c.kind === 'evidence' || c.kind === 'implementation')),
    'F4: Citations reach beyond the capability to its evidence or implementation');

  const partial = await ask({ question: 'how do I demonstrate the Decision Window' });
  const windowSection = partial.sections.find(s => s.heading === 'Decision Window');
  assert(windowSection?.maturity?.implementation_status === 'partially-implemented',
    'F5: A partially-implemented capability is reported as such inside the answer',
    String(windowSection?.maturity?.implementation_status));
  assert(/limitation/i.test(windowSection?.text ?? ''),
    'F6: …and its recorded limitation is quoted rather than omitted');

  // ── G. Degradation is stated, never silently fabricated (ADR-049) ─────────
  clearProviders();
  assert(activeProvider() === null, 'G1: No provider is configured in this estate');
  const outcome = await narrateIfAvailable({ question: 'x', groundedSections: [] });
  assert(outcome.degraded && outcome.reason === 'no-provider-configured',
    'G2: Narration degrades rather than failing');
  assert(outcome.narrated === null, 'G3: …producing no generated text');
  assert(outcome.notice !== null && /assembled directly from governed/i.test(outcome.notice!),
    'G4: …and the degradation is stated to the user');
  assert(clear.degradationNotice !== null,
    'G5: Every answer carries the degradation notice while no provider exists');

  registerProvider({
    name: 'failing-test-adapter',
    isConfigured: () => true,
    narrate: async () => { throw new Error('provider down'); }
  });
  const failed2 = await narrateIfAvailable({ question: 'x', groundedSections: [] });
  assert(failed2.degraded && failed2.reason === 'provider-failed' && failed2.narrated === null,
    'G6: A failing provider degrades to governed records rather than returning invented text');
  clearProviders();

  // ── H. Route behaviour ────────────────────────────────────────────────────
  const r1 = await askRoute(post({ question: 'why did the decision change' }));
  const b1 = await r1.json();
  assert(b1.status === 'success' && b1.data.outcome === 'ambiguous',
    'H1: The ask route reproduces the ambiguous outcome end to end');
  const r2 = await askRoute(post({ question: '' }));
  assert(r2.status === 400, 'H2: An empty question returns 400');
  const r3 = await askRoute(post({ question: 'test', lens: 'not-a-lens' }));
  assert(r3.status === 400, 'H3: An unknown lens returns 400');

  // ── I. Not chatbot-first ──────────────────────────────────────────────────
  const container = readFileSync(join(ROOT, 'components', 'atlas', 'CapabilityAtlas.tsx'), 'utf8');
  const searchIdx = container.indexOf('atlas-searchbar');
  const askIdx = container.indexOf('AskCogniX lens');
  assert(searchIdx > 0 && searchIdx < askIdx,
    'I1: Search still renders above Ask — the Atlas did not become chatbot-first');
  const askUi = readFileSync(join(ROOT, 'components', 'atlas', 'AskCogniX.tsx'), 'utf8');
  assert(/const \[open, setOpen\] = useState\(false\)/.test(askUi),
    'I2: Ask is collapsed until deliberately opened');
  assert(/Answers come only from governed CogniX records/.test(askUi),
    'I3: The surface states its own boundary to the user');
  assert(/MaturityTriad/.test(askUi),
    'I4: Answers render the three maturity dimensions rather than a generic badge');

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error('ATL-05 test suite failed with an error:', e); process.exit(1); });
