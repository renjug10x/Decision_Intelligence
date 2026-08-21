/**
 * Unit Test Suite for CogniX ATL-06C AI Explanation & Hybrid Reasoning
 * Run via: npx tsx tests/unit/run-atl06c-tests.ts
 *
 * ATL-06A decided what evidence may be shown. ATL-06B fetched it. ATL-06C says what it means — which
 * is the most persuasive way this estate could publish something ungoverned, and therefore the layer
 * that has to justify itself hardest.
 *
 * The suite is built around one asymmetry. A provider that behaves proves nothing: of course a
 * well-formed reading passes. What has to be proven is that a provider which cites a premise it was
 * never given, invents a statistic, names an analyst house nobody quoted, reproduces a claim this
 * estate refused, or simply declares what CogniX does, reaches the reader with **none** of it — and
 * that the refusal is visible rather than silent.
 *
 * Three properties are asserted repeatedly:
 *   - rejected and discarded evidence is audit material and can never enter reasoning;
 *   - every surviving reading stands on a governed premise it cites;
 *   - with no provider, the estate is exactly what ATL-06B left behind.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildPremises, governedPremises, marketPremises, renderPremises
} from '../../lib/atlas/interpretation/premises';
import {
  ECHO_NGRAM, MAX_INTERPRETATION_LENGTH, NAMEABLE_ORGANISATIONS,
  echoesRejectedClaim, unsupportedOrganisations, unsupportedQuantities, verifyInterpretation
} from '../../lib/atlas/interpretation/verification';
import {
  activeInterpretationProvider, clearInterpretationProviders, registerInterpretationProvider,
  type InterpretationProvider, type InterpretationRequest
} from '../../lib/atlas/interpretation/provider';
import {
  applyInterpretation, resetInterpretationCalls
} from '../../lib/atlas/interpretation/engine';
import {
  RESPONSE_SCHEMA, buildInterpretationPrompt, createGeminiInterpretationProvider
} from '../../lib/atlas/interpretation/gemini-interpreter';
import {
  ensureInterpretationProviderRegistered, interpretationProviderStatus, resetInterpretationProviderRegistration
} from '../../lib/atlas/interpretation/register';

import { groundAnswer } from '../../lib/atlas/grounding/engine';
import { clearGroundingProviders, registerGroundingProvider } from '../../lib/atlas/grounding/provider';
import { createGoogleSearchGroundingProvider } from '../../lib/atlas/grounding/providers/google-search-grounding';
import { clearGroundingCache } from '../../lib/atlas/grounding/providers/grounding-cache';
import { ask } from '../../lib/atlas/ai/gateway';
import { retrieve } from '../../lib/atlas/ai/retrieval';
import { assembleAnswer } from '../../lib/atlas/ai/answer';
import { narrateIfAvailable } from '../../lib/atlas/ai/provider';
import { capabilityRepository } from '../../services/atlas/src/capability-registry';
import { getCapabilityIndex } from '../../lib/atlas/capability-index';
import { searchCapabilities } from '../../lib/atlas/capability-search';
import { CURIOSITY_QUESTIONS } from '../../content/atlas/curiosity-questions';
import { GET as groundingRoute } from '../../app/api/v1/atlas/grounding/route';
import type { ResolvedCapability } from '../../packages/contracts/src/capability-atlas-model';
import type { GroundedEnvelope } from '../../packages/contracts/src/atlas-grounding-model';

import { FIXTURES, SOURCE_FETCHER, NOW } from '../fixtures/atlas-grounding/gemini-grounding-fixtures';
import { LEVEL2_CASES } from '../fixtures/atlas-grounding/level2-evaluation';
import { SEARCH_VOCABULARY, SEARCH_VOCABULARY_BY_LENGTH } from '../../content/atlas/vocabulary';
import { validateVocabulary } from '../../lib/atlas/vocabulary-validator';
import { understandQuery } from '../../lib/atlas/query-understanding';
import { ALIAS_TERM_WEIGHT_FACTOR, FIELD_WEIGHTS } from '../../lib/atlas/capability-search';
import { GET as vocabularyRoute } from '../../app/api/v1/atlas/vocabulary/route';

const ROOT = join(__dirname, '..', '..');
let passed = 0, failed = 0;
function assert(c: boolean, name: string, detail?: string) {
  if (c) { console.log(`[PASS] ${name}`); passed++; }
  else { console.error(`[FAIL] ${name} - ${detail || 'Assertion failed'}`); failed++; }
}

const QUESTION = 'how does CogniX compare to the market on promotion monitoring';

async function atl05Answer(question: string) {
  const identities = capabilityRepository.listIdentities();
  const index = await getCapabilityIndex(identities);
  const retrieval = retrieve(question, {
    identities, index, questions: CURIOSITY_QUESTIONS,
    resolveDemoMaturity: c => capabilityRepository.resolveDemoMaturity(c)
  });
  const resolved: ResolvedCapability[] = [];
  for (const c of retrieval.capabilities) {
    const r = await capabilityRepository.resolve(c.capability_id, { includeKnowledge: true });
    if (r) resolved.push(r);
  }
  const narration = await narrateIfAvailable({ question, groundedSections: [] });
  return { answer: assembleAnswer({ question, retrieval, resolved, degradationNotice: narration.notice }), resolved };
}

/** An envelope produced by the real ATL-06A/06B path from a recorded fixture. */
async function envelopeFrom(fixtureKey: keyof typeof FIXTURES): Promise<GroundedEnvelope> {
  clearGroundingProviders();
  clearGroundingCache();
  registerGroundingProvider(createGoogleSearchGroundingProvider({
    apiKey: 'fixture', now: () => NOW, transport: async () => FIXTURES[fixtureKey], sourceFetcher: SOURCE_FETCHER
  }));
  const { answer, resolved } = await atl05Answer(QUESTION);
  const promo = await capabilityRepository.resolve('CAP-PROMOTION-INTELLIGENCE', { includeKnowledge: true });
  return groundAnswer({
    question: QUESTION, answer,
    resolved: resolved.some(r => r.identity.capability_id === 'CAP-PROMOTION-INTELLIGENCE') ? resolved : [...resolved, promo!],
    now: NOW, researchRequested: true
  });
}

function fakeInterpreter(
  candidates: { text: string; rests_on: string[] }[],
  opts: { fail?: boolean; seen?: InterpretationRequest[]; name?: string } = {}
): InterpretationProvider {
  return {
    name: opts.name ?? 'fake-interpreter',
    isConfigured: () => true,
    interpret: async (request) => {
      opts.seen?.push(request);
      if (opts.fail) throw new Error('interpretation provider exploded');
      return { candidates, model: 'fake-model' };
    }
  };
}

async function run() {
  console.log('\n=== ATL-06C — AI Explanation & Hybrid Reasoning ===\n');
  resetInterpretationCalls();

  const admitted = await envelopeFrom('admissible');
  const mixed = await envelopeFrom('mixed');

  // ── A. The premise set is built by construction, not by instruction ──────
  const premises = buildPremises(admitted);
  assert(premises.length === admitted.from_cognix.statements.length + admitted.market_context.statements.length,
    'A1: Premises are exactly the governed statements plus the ADMITTED market statements');
  assert(governedPremises(premises).length > 0 && marketPremises(premises).length === 2,
    'A2: Both kinds are present and distinguishable');
  assert(premises.every(p => /^[GM]\d+$/.test(p.premise_id)),
    'A3: Premise ids are short and opaque, so a citation is cheap to emit exactly and trivial to verify');

  const mixedPremises = buildPremises(mixed);
  assert(mixed.rejected_claims.length === 4 && marketPremises(mixedPremises).length === 1,
    'A4: Four rejected claims and one admitted claim yields ONE market premise',
    `${mixed.rejected_claims.length} rejected, ${marketPremises(mixedPremises).length} market premises`);
  const premiseText = JSON.stringify(mixedPremises);
  assert(mixed.rejected_claims.every(r => !premiseText.includes(r.claim)),
    'A5: No rejected claim appears in the premise set, in any form');
  const premisesSrc = readFileSync(join(ROOT, 'lib', 'atlas', 'interpretation', 'premises.ts'), 'utf8');
  assert(!/rejected_claims|search_transparency/.test(premisesSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')),
    'A6: The premise builder never reads rejected claims or discarded segments — exclusion is structural, not a prompt rule');
  assert(/\[G1\]/.test(renderPremises(premises)) && /market source/.test(renderPremises(premises)),
    'A7: Rendered premises label their kind, so a model cannot confuse a market claim for a CogniX record');

  // ── B. Verification refuses, and names what it refused ───────────────────
  const good = { text: 'Capacity-aware promotion planning is an area where the governed record and market coverage point the same way.', rests_on: ['G1', 'M1'] };
  assert(verifyInterpretation(good, premises, admitted.rejected_claims).accepted,
    'B1: A well-formed reading citing a governed and a market premise is accepted');

  const noGoverned = verifyInterpretation({ text: 'The market is moving toward capacity-aware planning.', rests_on: ['M1'] }, premises, []);
  assert(!noGoverned.accepted && noGoverned.drop?.reason === 'no-governed-premise',
    'B2: A reading standing only on the market is refused — interpretation may read the market, not stand on it');

  const unknown = verifyInterpretation({ text: 'Something plausible about planning.', rests_on: ['G1', 'G99'] }, premises, []);
  assert(!unknown.accepted && unknown.drop?.reason === 'unknown-premise',
    'B3: A citation that does not resolve is refused — it is indistinguishable from an invented one');

  const cognixFact = verifyInterpretation({ text: 'CogniX provides real-time monitoring against live feeds.', rests_on: ['G1'] }, premises, []);
  assert(!cognixFact.accepted && cognixFact.drop?.reason === 'asserts-cognix-fact',
    'B4: A reading that declares what CogniX does is refused, however well cited');

  const invented = verifyInterpretation({ text: 'This suggests roughly 40% of grocers now assess capacity before launch.', rests_on: ['G1', 'M1'] }, premises, []);
  assert(!invented.accepted && invented.drop?.reason === 'unsupported-quantity',
    'B5: A figure appearing in no cited premise is refused — numbers are what survive a meeting');

  const namedHouse = verifyInterpretation({ text: 'Forrester and IDC both point in this direction for planning platforms.', rests_on: ['G1'] }, premises, []);
  assert(!namedHouse.accepted && namedHouse.drop?.reason === 'unsupported-publisher',
    'B6: Naming an analyst house no cited premise mentions is refused');

  assert(!verifyInterpretation({ text: '', rests_on: ['G1'] }, premises, []).accepted &&
    !verifyInterpretation({ text: '<b>bold</b> reading', rests_on: ['G1'] }, premises, []).accepted &&
    !verifyInterpretation({ text: 'x'.repeat(MAX_INTERPRETATION_LENGTH + 1), rests_on: ['G1'] }, premises, []).accepted,
    'B7: Empty, marked-up and essay-length readings are refused');

  const ordering = verifyInterpretation({ text: '<i>CogniX provides 90% accuracy</i>', rests_on: ['G404'] }, premises, []);
  assert(ordering.drop?.reason === 'markup',
    'B8: A reading wrong in several ways reports the FIRST structural failure, not an incidental later one',
    ordering.drop?.reason);
  assert((ordering.drop?.detail.length ?? 0) > 40 && (invented.drop?.detail ?? '').includes('40%'),
    'B9: Every refusal explains itself in terms a reader can check');

  // ── C. Rejected evidence is audit material and cannot be reasoned from ───
  const rejectedStale = mixed.rejected_claims.find(r => r.reason === 'stale-source')!;
  const echo = verifyInterpretation(
    { text: `Forecast accuracy in grocery has historically plateaued below planner expectations, which frames this.`, rests_on: ['G1'] },
    mixedPremises, mixed.rejected_claims
  );
  assert(!echo.accepted && echo.drop?.reason === 'echoes-rejected-claim',
    'C1: A reading reproducing a claim that failed source admission is refused, even though the premise set never contained it');
  assert((echo.drop?.detail ?? '').includes('stale-source'),
    'C2: …and the refusal names WHY that evidence was inadmissible', echo.drop?.detail);
  assert(echoesRejectedClaim('An unrelated statement about planning cadence and capacity.', mixed.rejected_claims) === null,
    'C3: An unrelated reading is not falsely accused of echoing');
  assert(echoesRejectedClaim(rejectedStale.claim.split(' ').reverse().join(' '), mixed.rejected_claims) !== null,
    'C4: A reordered restatement is caught by content-word containment, not only by exact runs');
  assert(ECHO_NGRAM >= 5 && NAMEABLE_ORGANISATIONS.includes('Gartner') && NAMEABLE_ORGANISATIONS.includes('Blue Yonder'),
    'C5: The echo window and the nameable-organisation list are declared, not tuned');
  assert(unsupportedQuantities('Growth of 12% was reported.', premises).length === 1 &&
    unsupportedQuantities('No figures here at all.', premises).length === 0,
    'C6: Quantity checking is precise in both directions');
  assert(unsupportedOrganisations('Gartner coverage supports this.', marketPremises(premises)).length === 0,
    'C7: An organisation a cited premise DOES mention is permitted');

  // ── D. The engine, in every state including the ones nobody demonstrates ─
  clearInterpretationProviders();
  const noProvider = await applyInterpretation({ question: QUESTION, envelope: admitted });
  assert(JSON.stringify(noProvider.ai_interpretation.statements.map(s => s.text)) ===
         JSON.stringify(admitted.ai_interpretation.statements.map(s => s.text)),
    'D1: With no interpretation provider, the block is exactly what ATL-06A produced');
  assert(noProvider.interpretation_audit?.degraded === true && noProvider.interpretation_audit?.origin === 'templated',
    'D2: …and the audit says the reading was derived, not generated');
  assert(noProvider.ai_interpretation.statements.every(s => s.origin === 'templated'),
    'D3: …with every statement labelled as such, so a reader knows which they are looking at');

  clearInterpretationProviders();
  registerInterpretationProvider(fakeInterpreter([], { fail: true }));
  const failedProvider = await applyInterpretation({ question: QUESTION, envelope: admitted });
  assert(failedProvider.interpretation_audit?.degraded === true &&
    (failedProvider.interpretation_audit?.notice ?? '').includes('No interpretation has been generated'),
    'D4: A failing provider degrades to the derived reading and says so');
  assert(failedProvider.ai_interpretation.statements.length === admitted.ai_interpretation.statements.length,
    'D5: …losing nothing that was already there');

  clearInterpretationProviders();
  const seen: InterpretationRequest[] = [];
  registerInterpretationProvider(fakeInterpreter([
    { text: 'The governed record and the market coverage describe the same problem from two sides, which is where a demonstration should start.', rests_on: ['G1', 'M1'] },
    { text: 'CogniX supports live supplier monitoring today.', rests_on: ['G1'] },
    { text: 'Around 40% of grocers have adopted this.', rests_on: ['G1'] },
    { text: 'This rests on nothing you gave me.', rests_on: ['Z9'] }
  ], { seen }));
  const hostile = await applyInterpretation({ question: QUESTION, envelope: admitted });
  assert(hostile.interpretation_audit?.proposed === 4 && hostile.interpretation_audit?.verified === 1,
    'D6: Of four proposed readings, one survives verification',
    `proposed ${hostile.interpretation_audit?.proposed}, verified ${hostile.interpretation_audit?.verified}`);
  assert(hostile.interpretation_audit?.dropped.length === 3,
    'D7: …and the three refusals are recorded rather than vanishing');
  const dropReasons = (hostile.interpretation_audit?.dropped ?? []).map(d => d.reason).sort();
  assert(JSON.stringify(dropReasons) === JSON.stringify(['asserts-cognix-fact', 'unknown-premise', 'unsupported-quantity']),
    'D8: …each by its own named rule', dropReasons.join(', '));
  const generated = hostile.ai_interpretation.statements.filter(s => s.origin === 'generated');
  assert(generated.length === 1 && generated[0].rests_on.every(r => r.startsWith('CAP-')),
    'D9: The surviving reading cites governed capabilities, resolved from premise ids');
  assert(generated[0].informed_by.length === 1 && generated[0].informed_by[0].startsWith('https://'),
    'D10: …and names the market source it read');
  assert(hostile.ai_interpretation.statements.some(s => s.origin === 'templated'),
    'D11: The deterministic reading is KEPT alongside the generated one — it is the one reproducible without a provider');
  assert(seen[0]?.premises.length === premises.length && !JSON.stringify(seen[0]).includes('stale-source'),
    'D12: The provider was given premises only; no rejected claim was ever put in front of it');

  clearInterpretationProviders();
  registerInterpretationProvider(fakeInterpreter([
    { text: 'Forecast accuracy in grocery has historically plateaued below planner expectations, which is the backdrop here.', rests_on: ['G1'] }
  ]));
  const echoEngine = await applyInterpretation({ question: QUESTION, envelope: mixed });
  assert(echoEngine.interpretation_audit?.verified === 0 &&
    echoEngine.interpretation_audit?.dropped[0]?.reason === 'echoes-rejected-claim',
    'D13: A provider reproducing refused evidence from its own memory is caught by verification');

  // ── E. The adapter reads; it does not look ──────────────────────────────
  const adapterSrc = readFileSync(join(ROOT, 'lib', 'atlas', 'interpretation', 'gemini-interpreter.ts'), 'utf8');
  const adapterCode = adapterSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert(!/googleSearch|tools\s*:/.test(adapterCode),
    'E1: The interpretation adapter has NO search tool — it may read the premises and may not go and look');
  assert(/responseMimeType: 'application\/json'/.test(adapterCode) && /responseSchema/.test(adapterCode),
    'E2: Output is structurally constrained, so the citation is a field rather than a convention');
  assert((RESPONSE_SCHEMA as any).properties.statements.items.required.includes('rests_on'),
    'E3: …and rests_on is required by the schema itself');
  assert((adapterCode.match(/process\.env\.GEMINI_API_KEY/g) ?? []).length === 1 &&
    !/body\.apiKey|request\.apiKey/.test(adapterCode),
    'E4: The credential is read from the server environment in one place and never from a request');
  assert(!/console\.(log|warn|error)/.test(adapterCode),
    'E5: …and nothing in the adapter logs');
  const prompt = buildInterpretationPrompt({ question: 'q', premises, contradictionSummaries: [] });
  assert(/Never state what CogniX is, has, does/.test(prompt) && /\[G1\]/.test(prompt),
    'E6: The prompt states the rules and shows the premises');
  assert(/enforced independently of this prompt/.test(prompt),
    'E7: …and says so, because a guardrail a model can decline to follow is not a guardrail');
  let keyError = '';
  try {
    await createGeminiInterpretationProvider({ apiKey: '' }).interpret({ question: 'q', premises, contradictionSummaries: [] });
  } catch (e: any) { keyError = e.message; }
  assert(/GEMINI_API_KEY/.test(keyError),
    'E8: With no key the adapter names the missing variable and generates nothing (ADR-044)');
  assert(createGeminiInterpretationProvider({ apiKey: '' }).isConfigured() === false,
    'E9: An adapter with no key reports itself unconfigured and is never selected');

  resetInterpretationProviderRegistration();
  clearInterpretationProviders();
  ensureInterpretationProviderRegistered();
  ensureInterpretationProviderRegistered();
  assert(interpretationProviderStatus().registered && interpretationProviderStatus().configured === false,
    'E10: Registration is idempotent and configures nothing by itself');
  assert(activeInterpretationProvider() === null,
    'E11: …so with no credential present, no interpretation provider is active');

  // ── F. The three classes stay separate ──────────────────────────────────
  clearInterpretationProviders();
  registerInterpretationProvider(fakeInterpreter([
    { text: 'The two accounts describe the same problem from different sides.', rests_on: ['G1', 'M1'] }
  ]));
  const separated = await applyInterpretation({ question: QUESTION, envelope: admitted });
  assert(JSON.stringify(separated.from_cognix) === JSON.stringify(admitted.from_cognix),
    'F1: Interpretation changed nothing in the From CogniX class');
  assert(JSON.stringify(separated.market_context) === JSON.stringify(admitted.market_context),
    'F2: …nor in Market Context');
  assert(JSON.stringify(separated.rejected_claims) === JSON.stringify(admitted.rejected_claims) &&
    JSON.stringify(separated.contradictions) === JSON.stringify(admitted.contradictions),
    'F3: …nor in the rejection ledger or the separated contradictions');
  assert(separated.ai_interpretation.evidence_class === 'ai-interpretation',
    'F4: The reading stays inside its own class');

  // ── G. Level 2 evaluation, and the governed vocabulary that answered it ──
  const identities = capabilityRepository.listIdentities();
  const index = await getCapabilityIndex(identities);
  const ctx = { resolveDemoMaturity: (c: any) => capabilityRepository.resolveDemoMaturity(c) };
  const rankWith = (q: string, want: string, expandAliases: boolean) =>
    searchCapabilities(identities, q, {}, ctx, { index, expandAliases }).results
      .map(r => r.capability_id).indexOf(want);

  const baseline = LEVEL2_CASES.map(c => rankWith(c.question, c.expect, false));
  const shipped = LEVEL2_CASES.map(c => rankWith(c.question, c.expect, true));
  const top3 = (ranks: number[]) => ranks.filter(r => r >= 0 && r < 3).length;
  const top1 = (ranks: number[]) => ranks.filter(r => r === 0).length;

  assert(LEVEL2_CASES.length === 18,
    'G1: The Level 2 evaluation set is eighteen business-phrased questions with one intended capability each');
  assert(top3(baseline) === 10 && top1(baseline) === 6,
    `G2: Unexpanded Level 1 finds the intended capability in the top three for ${top3(baseline)} of 18 — the measured baseline, still reproducible`,
    `top1 ${top1(baseline)}, top3 ${top3(baseline)}`);
  assert(baseline.filter(r => r < 0).length === 3,
    'G3: …and for three it is absent from the results entirely, which is lexical failure, not ranking failure');
  assert(top3(shipped) === 18 && shipped.every(r => r >= 0),
    `G4: The governed vocabulary lifts that to ${top3(shipped)} of 18, with no capability absent`,
    `top1 ${top1(shipped)}, top3 ${top3(shipped)}`);
  assert(top1(shipped) >= top1(baseline) + 8,
    `G5: …and moves the intended capability to first place for ${top1(shipped)} of 18, which ranking alone was not doing`);
  const runtimeFiles = readdirSync(join(ROOT, 'lib', 'atlas')).join(' ');
  assert(!/embedding|vector/i.test(runtimeFiles),
    'G6: No embedding index was introduced — the measured failures were lexical and were closed lexically (ADR-058)');

  // ── G′. The vocabulary is governed content, not a scoring tweak (ADR-059) ─
  const vocabReport = validateVocabulary(SEARCH_VOCABULARY, { identities, index });
  assert(vocabReport.valid && vocabReport.checked === 22,
    'G7: All 22 governed aliases validate', vocabReport.errors.map(e => `${e.rule} ${e.capability_id}`).join(', '));
  assert(SEARCH_VOCABULARY.every(a => a.owner && /^\d{4}-\d{2}-\d{2}$/.test(a.reviewed_at) && a.rationale.length >= 40),
    'G8: Every alias carries an owner, a review date and a written rationale — it is a record, not a config line');
  assert(SEARCH_VOCABULARY.every(a => a.evidenced_by.length > 0),
    'G9: …and names the capabilities whose governed text uses the terms it introduces');

  // W6 is the rule that keeps this honest: prove it rejects an invented term.
  const inventedTerm = validateVocabulary([{
    alias_id: 'VOC-999', phrase: 'made up phrasing', governed_terms: ['zzznotacorpusword'],
    rationale: 'A deliberately invented mapping used to prove the validator refuses vocabulary the corpus does not have.',
    evidenced_by: ['CAP-DECISION-GAP'], owner: 'test', reviewed_at: '2026-08-21'
  }], { identities, index });
  assert(!inventedTerm.valid && inventedTerm.errors[0].rule === 'W6',
    'G10: An alias introducing a term the corpus does not contain is REFUSED — governed vocabulary is mapped, never invented');
  const unevidenced = validateVocabulary([{
    alias_id: 'VOC-998', phrase: 'another phrasing', governed_terms: ['regret'],
    rationale: 'A real term pointed at a capability whose text does not contain it, proving evidence is checked per alias.',
    evidenced_by: ['CAP-AUTH-PLATFORM-SETUP'], owner: 'test', reviewed_at: '2026-08-21'
  }], { identities, index });
  assert(!unevidenced.valid && unevidenced.errors[0].rule === 'W6',
    'G11: …and a real term is still refused where the named capability does not use it');

  // Expansion is reported, not silent.
  const expanded = understandQuery('how long before this recommendation goes off');
  assert(expanded.expansions.length === 1 && expanded.expansions[0].alias_id === 'VOC-014',
    'G12: A firing alias is reported with its identifier');
  assert(expanded.expansions[0].rationale.length > 40 && expanded.expansions[0].phrase === 'goes off',
    'G13: …with the phrase that fired and the rationale, so the searcher can see why');
  assert(!expanded.terms.includes('expiry') && expanded.alias_terms.includes('expiry'),
    'G14: Alias terms are kept SEPARATE from the searcher’s own words rather than merged into them');
  assert(understandQuery('how long before this recommendation goes off', { expandAliases: false }).expansions.length === 0,
    'G15: Expansion is switchable, so the unexpanded baseline stays reproducible');

  const aliasResult = searchCapabilities(identities, 'how long before this recommendation goes off', {}, ctx, { index });
  assert(aliasResult.expansions.length === 1,
    'G16: The search response carries the expansion, so a surface can render it (ADR-050 inspectability)');
  const viaAlias = aliasResult.results
    .find(r => r.capability_id === 'CAP-DECISION-CONTRACT')?.matches.some(m => m.via_alias === 'VOC-014');
  assert(viaAlias === true,
    'G17: …and a match reached only through the vocabulary is attributed to the alias that reached it');
  assert(ALIAS_TERM_WEIGHT_FACTOR < 1,
    'G18: An alias-driven hit is discounted, so a capability the searcher actually named outranks one the vocabulary reached');

  // The searcher's own word must win a head-to-head against an alias-supplied one.
  const direct = searchCapabilities(identities, 'regret', {}, ctx, { index });
  const viaPhrase = searchCapabilities(identities, 'was it the right call', {}, ctx, { index });
  const directScore = direct.results.find(r => r.capability_id === 'CAP-DECISION-REGRET')?.score ?? 0;
  const aliasScore = viaPhrase.results.find(r => r.capability_id === 'CAP-DECISION-REGRET')?.score ?? 0;
  assert(directScore > aliasScore,
    'G19: …proven head to head — searching the governed word scores higher than reaching it through an alias',
    `direct ${directScore} vs alias ${aliasScore}`);
  assert(Math.abs(aliasScore - directScore * ALIAS_TERM_WEIGHT_FACTOR) < 0.001,
    'G20: …by exactly the published factor, not by an undocumented adjustment');

  assert(SEARCH_VOCABULARY_BY_LENGTH[0].phrase.length >= SEARCH_VOCABULARY_BY_LENGTH[1].phrase.length,
    'G21: Overlapping phrasings resolve longest-first, so the most specific entry wins');
  assert(Object.keys(FIELD_WEIGHTS).length > 10,
    'G22: Field weights remain published — the vocabulary did not move ranking into an opaque place');

  const vocabBody = await (await vocabularyRoute()).json();
  assert(vocabBody.status === 'success' && vocabBody.data.aliases.length === 22,
    'G23: The vocabulary is published, so a searcher can read every mapping that can change their results');
  assert(vocabBody.data.aliases.every((a: any) => a.rationale && a.evidenced_by.length > 0) &&
    vocabBody.data.validation.valid === true,
    'G24: …with rationale, evidence and its validation state');

  // ── H. ATL-06A and ATL-06B are unchanged ────────────────────────────────
  const gateFiles = ['policy.ts', 'provenance.ts', 'contradiction.ts']
    .map(f => readFileSync(join(ROOT, 'lib', 'atlas', 'grounding', f), 'utf8')).join('\n');
  assert(!/from '\.\.\/interpretation|from '\.\/interpretation/.test(gateFiles),
    'H1: The ATL-06A admission gate imports nothing from the interpretation layer — the dependency runs one way');
  const interpFiles = readdirSync(join(ROOT, 'lib', 'atlas', 'interpretation')).filter(f => f.endsWith('.ts'));
  const interpCode = interpFiles.map(f => readFileSync(join(ROOT, 'lib', 'atlas', 'interpretation', f), 'utf8')).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert(!/TRUSTED_SOURCE_HOSTS\s*=|ADMISSIBLE_SOURCE_TIERS\s*=|admitClaim\s*\(/.test(interpCode),
    'H2: ATL-06C neither redefines the admission rules nor admits anything itself');
  assert(interpFiles.length === 6,
    'H3: The layer is six modules — premises, verification, provider, adapter, engine, registration');

  clearInterpretationProviders();
  clearGroundingProviders();
  const QUESTIONS = ['how does Decision Gap work', 'why did the decision change', 'what do competitors offer', 'zzz nothing at all'];
  for (const q of QUESTIONS) {
    const gated = await ask({ question: q });
    const { grounding, ...atl05Portion } = gated;
    const { answer: independent } = await atl05Answer(q);
    assert(JSON.stringify(atl05Portion) === JSON.stringify(independent),
      `H4[${q}]: With no provider, the ATL-05 answer is still byte-identical`);
    assert(grounding.interpretation_audit?.degraded === true,
      `H5[${q}]: …and the interpretation audit reports the degradation rather than hiding it`);
  }

  // ── I. The surface shows the working ────────────────────────────────────
  const ev = readFileSync(join(ROOT, 'components', 'atlas', 'EvidenceClasses.tsx'), 'utf8');
  assert(/atlas-ev-origin--\$\{s\.origin/.test(ev) && /generated · verified/.test(ev) && /derived from the record/.test(ev),
    'I1: A reader can see whether a reading was derived from the record or generated and verified');
  assert(/audit\.dropped\.map/.test(ev) && /Proposed and refused/.test(ev),
    'I2: Refused readings are listed with the rule they broke');
  assert(/s\.premises/.test(ev) && /Verified against/.test(ev),
    'I3: Each reading shows the premises it was verified against');
  const css = readFileSync(join(ROOT, 'app', 'globals.css'), 'utf8');
  assert(/\.atlas-ev-origin--generated/.test(css) && /\.atlas-ev-premises/.test(css),
    'I4: …and it is styled rather than unstyled markup');
  assert(/EVIDENCE_CLASSES|from-cognix/.test(ev) && /market-context/.test(ev) && /ai-interpretation/.test(ev),
    'I5: The three classes remain structurally and visually separate');

  // ── J. Live validation is a script, and its first stage needs no key ─────
  const scriptPath = join(ROOT, 'scripts', 'atlas-live-grounding-check.ts');
  assert(existsSync(scriptPath), 'J1: A live validation script ships with the phase');
  const script = readFileSync(scriptPath, 'utf8');
  assert(/generativelanguage\.googleapis\.com/.test(script) && /notARealTool/.test(script),
    'J2: …which probes the real endpoint and runs a negative control, so stage 1 proves something');
  assert(/SKIPPED, NOT PASSED/.test(script) && /AC-ATL-06C-9 remains OPEN/.test(script),
    'J3: …and reports the round trip as skipped rather than passed when no credential is present');
  assert(/current market approaches to grocery demand forecasting/.test(script) &&
    /forecast uncertainty in decision support/.test(script) &&
    /how does Decision Gap work/.test(script),
    'J3b: The three scenarios AC-ATL-06C-9 requires are encoded in the script, not left to whoever runs it');
  assert(/expectProviderCalled: false/.test(script) && /countingProvider/.test(script),
    'J3c: …including the negative one — the internal question proves the provider is not called at all');
  assert(/contractDrift/.test(script) && /uses_misspelled_groundingChunckIndices/.test(script) &&
    /web_chunk_has_domain/.test(script),
    'J3d: The script checks the live wire shape against what the fixtures assume, so drift is detected rather than absorbed');
  assert(/byteOffsetEvidence/.test(script) && /string_slice_would_differ/.test(script),
    'J3e: …and verifies byte-offset extraction against the passage the service actually returned');
  assert(/sourceEvidence/.test(script) && /with_date/.test(script),
    'J3f: …and records whether real publishers carry a machine-readable publication date');
  assert(/leaks_credential/.test(script) && /Refusing to write evidence/.test(script),
    'J3g: …and refuses to emit evidence that contains the credential');
  assert(!readdirSync(join(ROOT, 'tests', 'unit')).some(f => /live/i.test(f)),
    'J4: It is deliberately not a unit test — a check that spends quota does not belong in a suite that runs on every change');

  const policy = await (await groundingRoute()).json();
  assert(policy.data.interpretation.configured === false &&
    policy.data.interpretation.verification_rules.length >= 6,
    'J5: The interpretation rules are published alongside the grounding policy');
  assert(/audit material/.test(policy.data.interpretation.excluded_from_reasoning),
    'J6: …including the statement that rejected evidence is audit material and unreachable from reasoning');

  // ── K. Governance ───────────────────────────────────────────────────────
  const charter = readFileSync(join(ROOT, 'docs', 'governance', 'COGNIX_CAPABILITY_ATLAS.md'), 'utf8');
  assert(/### `ATL-06C` — AI Explanation & Hybrid Reasoning \[COMPLETED — LIVE VALIDATION PENDING\]/.test(charter),
    'K1: The charter records ATL-06C honestly, including that live validation is pending');
  const adrs = readFileSync(join(ROOT, 'docs', 'architecture', 'ARCHITECTURE_DECISIONS.md'), 'utf8');
  assert(/### ADR-057:/.test(adrs) && /### ADR-058:/.test(adrs),
    'K2: The two decisions ATL-06C took are recorded as ADRs');
  assert(/### ADR-058:[\s\S]{0,4000}18/.test(adrs),
    'K3: …and the Level 2 decision cites the measurement rather than asserting a conclusion');
  const master = readFileSync(join(ROOT, 'docs', 'governance', 'MASTER_PLAN.md'), 'utf8');
  assert(/`ATL-06C` — AI Explanation & Hybrid Reasoning/.test(master),
    'K4: The master plan carries the same phase name');
  assert(existsSync(join(ROOT, 'docs', 'reports', 'COGNIX_ATL_06C_AI_EXPLANATION_REPORT.md')),
    'K5: The phase report exists at the path the status board cites');

  // ── L. No assistant attribution ─────────────────────────────────────────
  const delivered = [
    ...interpFiles.map(f => join(ROOT, 'lib', 'atlas', 'interpretation', f)),
    scriptPath,
    join(ROOT, 'tests', 'fixtures', 'atlas-grounding', 'level2-evaluation.ts')
  ].map(f => readFileSync(f, 'utf8')).join('\n');
  assert(!/claude|anthropic|generated by|co-authored/i.test(delivered),
    'L1: No assistant identity, attribution or generation marker appears in any delivered artefact');

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error('ATL-06C test suite failed with an error:', e); process.exit(1); });
