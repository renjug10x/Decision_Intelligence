/**
 * Unit Test Suite for CogniX ATL-06A External Grounding & Provenance Architecture
 * Run via: npx tsx tests/unit/run-atl06a-tests.ts
 *
 * ATL-06A ships no provider, so almost nothing here can be proven by asking a question and liking
 * the answer. What it proves instead is that the DANGEROUS OUTPUTS ARE UNREACHABLE:
 *
 *   - an external claim reaching a reader without provenance,
 *   - an external claim reaching a reader for a question about what CogniX does,
 *   - an external claim overwriting, softening or contradicting a governed capability fact,
 *   - a contradiction being resolved into one fluent reconciled paragraph,
 *   - a market section that is absent reading as a market section that found nothing,
 *   - the ATL-05 answer changing because a grounding layer was added above it.
 *
 * The hostile-provider tests are the load-bearing ones. A provider that behaves is not evidence of
 * anything; a provider that tries to write CogniX facts, backdate a source, cite an unlisted
 * publisher and volunteer results for an internal-only question — and still changes nothing a
 * reader sees — is.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  ADMISSIBLE_SOURCE_TIERS, EVIDENCE_CLASSES, EVIDENCE_CLASS_LABEL,
  GROUNDING_INTENTS, SOURCE_TIERS,
  type ExternalClaim, type ExternalSource
} from '../../packages/contracts/src/atlas-grounding-model';
import {
  AGING_THRESHOLD_RATIO, COGNIX_IDENTITY_SIGNALS, DEFAULT_MAX_AGE_DAYS,
  GROUNDING_POLICY_VERSION, TOPIC_MAX_AGE_DAYS, classifyQuestion, maxAgeDaysFor
} from '../../lib/atlas/grounding/policy';
import {
  TRUSTED_SOURCE_HOSTS, admitClaim, assertsCogniXFact, assessFreshness, isAllowlistedHost
} from '../../lib/atlas/grounding/provenance';
import {
  CLAIM_ASSERTION_MARKERS, assertedDimensions, detectContradictions, extractConstraints
} from '../../lib/atlas/grounding/contradiction';
import {
  activeGroundingProvider, clearGroundingProviders, registerGroundingProvider,
  type ExternalGroundingProvider, type GroundingRequest
} from '../../lib/atlas/grounding/provider';
import { groundAnswer } from '../../lib/atlas/grounding/engine';

import { ask } from '../../lib/atlas/ai/gateway';
import { retrieve } from '../../lib/atlas/ai/retrieval';
import { assembleAnswer } from '../../lib/atlas/ai/answer';
import { narrateIfAvailable } from '../../lib/atlas/ai/provider';
import { capabilityRepository } from '../../services/atlas/src/capability-registry';
import { getCapabilityIndex } from '../../lib/atlas/capability-index';
import { CURIOSITY_QUESTIONS } from '../../content/atlas/curiosity-questions';
import { GET as groundingRoute } from '../../app/api/v1/atlas/grounding/route';
import type { ResolvedCapability } from '../../packages/contracts/src/capability-atlas-model';

const ROOT = join(__dirname, '..', '..');
let passed = 0, failed = 0;
function assert(c: boolean, name: string, detail?: string) {
  if (c) { console.log(`[PASS] ${name}`); passed++; }
  else { console.error(`[FAIL] ${name} - ${detail || 'Assertion failed'}`); failed++; }
}

const NOW = new Date('2026-08-21T00:00:00Z');
function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * 86_400_000).toISOString().slice(0, 10);
}

function source(over: Partial<ExternalSource> = {}): ExternalSource {
  return {
    url: 'https://www.gartner.com/en/documents/retail-promotion-monitoring',
    publisher: 'Gartner',
    title: 'Promotion monitoring in tier-one grocery platforms',
    published_at: daysAgo(60),
    retrieved_at: daysAgo(1),
    tier: 'analyst',
    retrieval_method: 'search-grounding',
    ...over
  };
}

function claim(over: Partial<ExternalClaim> = {}): ExternalClaim {
  return {
    claim_id: 'X1',
    claim: 'Real-time promotion monitoring against live supplier feeds is expected of production-grade retail planning platforms.',
    source: source(),
    topic: 'third-party platform capability',
    about_capabilities: ['CAP-PROMOTION-INTELLIGENCE'],
    provider: 'fake-grounding',
    ...over
  };
}

/** A provider that returns whatever it is told to, including things it must not be allowed to say. */
function fakeProvider(claims: ExternalClaim[], opts: { name?: string; fail?: boolean; spy?: GroundingRequest[] } = {}): ExternalGroundingProvider {
  return {
    name: opts.name ?? 'fake-grounding',
    isConfigured: () => true,
    retrieve: async (req) => {
      opts.spy?.push(req);
      if (opts.fail) throw new Error('provider exploded');
      return claims;
    }
  };
}

/** Recomputes the ATL-05 answer from the ATL-05 modules only, with no grounding layer involved. */
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

async function run() {
  console.log('\n=== ATL-06A — External Grounding & Provenance Architecture ===\n');

  // ── A. The contract encodes ADR-048 rather than describing it ─────────────
  assert(EVIDENCE_CLASSES.length === 3 &&
    EVIDENCE_CLASSES[0] === 'from-cognix' && EVIDENCE_CLASSES[1] === 'market-context' && EVIDENCE_CLASSES[2] === 'ai-interpretation',
    'A1: Three evidence classes exist in reading order — governed first, interpretation last');
  assert(EVIDENCE_CLASS_LABEL['from-cognix'] === 'From CogniX' &&
    EVIDENCE_CLASS_LABEL['market-context'] === 'Market Context' &&
    EVIDENCE_CLASS_LABEL['ai-interpretation'] === 'AI Interpretation',
    'A2: The labels are ADR-048 verbatim, so the surface cannot rename a class');

  const contractSrc = readFileSync(join(ROOT, 'packages', 'contracts', 'src', 'atlas-grounding-model.ts'), 'utf8');
  const contractBody = contractSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const contradictionType = contractBody.slice(
    contractBody.indexOf('export interface ContradictionRecord'),
    contractBody.indexOf('export interface FromCogniXStatement')
  );
  assert(!/resolved_statement|merged|reconcil|synthesis|combined_text/i.test(contradictionType),
    'A3: ContradictionRecord has no field capable of holding a merged or reconciled statement (ADR-053)');
  assert(/resolution: 'cognix-authoritative'/.test(contradictionType),
    'A4: …and its resolution is a literal type with exactly one value — the governed record wins');

  const sourceType = contractBody.slice(contractBody.indexOf('export interface ExternalSource'), contractBody.indexOf('export interface ExternalClaim'));
  assert(!/\?\s*:/.test(sourceType),
    'A5: No provenance field on ExternalSource is optional — an unprovenanced claim is unrepresentable');
  assert(ADMISSIBLE_SOURCE_TIERS.every(t => (SOURCE_TIERS as readonly string[]).includes(t)) &&
    !ADMISSIBLE_SOURCE_TIERS.includes('vendor-marketing') && !ADMISSIBLE_SOURCE_TIERS.includes('unknown'),
    'A6: Admissible tiers are a strict subset — vendor marketing and unclassified sources are excluded by name');
  assert(GROUNDING_INTENTS.length === 3 && GROUNDING_INTENTS[0] === 'internal-only',
    'A7: internal-only is declared first and is the fail-safe default');

  // ── B. Policy: when external knowledge is allowed at all ──────────────────
  const dGap = classifyQuestion('how does Decision Gap work');
  assert(dGap.intent === 'internal-only' && dGap.external_allowed === false,
    'B1: A question about what CogniX does is internal-only, and no external retrieval is permitted');

  const dCompetitor = classifyQuestion('what do competitors offer for promotional forecasting');
  assert(dCompetitor.intent === 'external-required' && dCompetitor.external_allowed === true &&
    dCompetitor.topics.includes('market and competitor landscape'),
    'B2: A pure market question is external-required and names the topic it needs');

  const dMixed = classifyQuestion('how does CogniX compare to Blue Yonder on promotion planning');
  assert(dMixed.intent === 'external-permitted' && dMixed.failed_safe === true,
    'B3: A comparative question fails safe — the CogniX part stays governed, the market part is context');
  assert(dMixed.matched_signals.includes('cognix'),
    'B4: …and the decision names the signal that forced the fail-safe, so routing is inspectable');

  const dNonsense = classifyQuestion('zzz nothing at all');
  assert(dNonsense.intent === 'internal-only' && dNonsense.external_allowed === false,
    'B5: An unclassifiable question defaults to internal-only rather than reaching for the web');

  const dNamed = classifyQuestion('is CAP-DECISION-GAP more mature than the market alternatives');
  assert(dNamed.intent === 'external-permitted' && dNamed.matched_signals.includes('names a CAP-* identifier'),
    'B6: Naming a CAP-* identifier is itself a CogniX-identity signal');

  assert(COGNIX_IDENTITY_SIGNALS.length > 0 && Object.keys(TOPIC_MAX_AGE_DAYS).length > 0,
    'B7: The policy is declared data, not a heuristic — signals and bounds are enumerable');
  assert(maxAgeDaysFor('a topic nobody declared') === DEFAULT_MAX_AGE_DAYS && DEFAULT_MAX_AGE_DAYS <= Math.min(...Object.values(TOPIC_MAX_AGE_DAYS)),
    'B8: An unrecognised topic falls back to the STRICTEST bound, so novelty does not buy leniency');

  // ── C. Provenance is an admission condition ───────────────────────────────
  const okAdmission = admitClaim(claim(), true, NOW);
  assert(okAdmission.admitted && okAdmission.freshness?.verdict === 'fresh',
    'C1: A fully provenanced, allowlisted, in-date claim is admitted');

  const noProv = admitClaim(claim({ source: source({ publisher: '' }) }), true, NOW);
  assert(!noProv.admitted && noProv.rejection?.reason === 'missing-provenance',
    'C2: A claim missing a publisher is DROPPED, not rendered with a blank field (ADR-048)');

  const undated = admitClaim(claim({ source: source({ published_at: 'undated' }) }), true, NOW);
  assert(!undated.admitted && undated.rejection?.reason === 'undated-source',
    'C3: An undated source is inadmissible — a publication date is never inferred');

  const insecure = admitClaim(claim({ source: source({ url: 'http://www.gartner.com/x' }) }), true, NOW);
  assert(!insecure.admitted && insecure.rejection?.reason === 'insecure-source',
    'C4: A non-https source is inadmissible');

  const unlisted = admitClaim(claim({ source: source({ url: 'https://someblog.example.com/post' }) }), true, NOW);
  assert(!unlisted.admitted && unlisted.rejection?.reason === 'source-not-allowlisted',
    'C5: An unlisted publisher is inadmissible — the allowlist admits, it does not merely warn');

  const badTier = admitClaim(claim({ source: source({ tier: 'vendor-marketing' }) }), true, NOW);
  assert(!badTier.admitted && badTier.rejection?.reason === 'inadmissible-tier',
    'C6: Vendor marketing is not placed beside a governed capability record');

  const future = admitClaim(claim({ source: source({ published_at: '2027-01-01' }) }), true, NOW);
  assert(!future.admitted && future.rejection?.reason === 'implausible-date',
    'C7: A source dated in the future is rejected rather than treated as very fresh');

  const beforePub = admitClaim(claim({ source: source({ published_at: daysAgo(10), retrieved_at: daysAgo(40) }) }), true, NOW);
  assert(!beforePub.admitted && beforePub.rejection?.reason === 'implausible-date',
    'C8: A claim retrieved before its source was published is rejected');

  const empty = admitClaim(claim({ claim: '   ' }), true, NOW);
  assert(!empty.admitted && empty.rejection?.reason === 'empty-claim', 'C9: An empty claim is rejected');

  const notPermitted = admitClaim(claim(), false, NOW);
  assert(!notPermitted.admitted && notPermitted.rejection?.reason === 'external-not-permitted',
    'C10: When policy says internal-only, a perfectly sourced claim is still not shown');

  assert((noProv.rejection?.detail.length ?? 0) > 40 && (unlisted.rejection?.detail ?? '').includes('someblog.example.com'),
    'C11: Every rejection carries an explanation naming what was wrong, so an omission is auditable');

  // Ordering: the first failure is the reason reported.
  const multiplyBad = admitClaim(claim({
    claim: 'CogniX provides real-time monitoring.',
    source: source({ url: 'http://blog.example.com/x', publisher: '', tier: 'unknown', published_at: 'undated' })
  }), true, NOW);
  assert(multiplyBad.rejection?.reason === 'missing-provenance',
    'C12: A claim wrong in several ways reports the first structural failure, not an incidental later one');

  // ── D. Freshness ──────────────────────────────────────────────────────────
  const fresh = assessFreshness(source({ published_at: daysAgo(10) }), 'third-party platform capability', NOW);
  const aging = assessFreshness(source({ published_at: daysAgo(300) }), 'third-party platform capability', NOW);
  const stale = assessFreshness(source({ published_at: daysAgo(500) }), 'third-party platform capability', NOW);
  assert(fresh.verdict === 'fresh' && aging.verdict === 'aging' && stale.verdict === 'stale',
    'D1: Freshness has three verdicts, not a binary in-date flag');
  assert(aging.age_days > maxAgeDaysFor('third-party platform capability') * AGING_THRESHOLD_RATIO,
    'D2: The aging threshold is the declared ratio of the topic bound, not an arbitrary cut');
  assert(fresh.label.includes('365') && stale.label.includes('beyond'),
    'D3: The verdict is rendered as words a reader can act on, with the bound stated');

  const staleClaim = admitClaim(claim({ source: source({ published_at: daysAgo(500) }) }), true, NOW);
  assert(!staleClaim.admitted && staleClaim.rejection?.reason === 'stale-source',
    'D4: An expired source is not shown with a warning — it is not shown');

  const pricing = assessFreshness(source({ published_at: daysAgo(200) }), 'commercial pricing', NOW);
  assert(pricing.verdict === 'stale' && maxAgeDaysFor('commercial pricing') === 180,
    'D5: Currency is per topic — a 200-day-old price is stale where a 200-day-old study is not');

  assert(isAllowlistedHost('www.gartner.com') && isAllowlistedHost('gartner.com') &&
    !isAllowlistedHost('gartner.com.example.net') && !isAllowlistedHost('notgartner.com'),
    'D6: Host matching is dot-bounded — a lookalike domain does not inherit a publisher’s standing');
  assert(TRUSTED_SOURCE_HOSTS.length > 0 && TRUSTED_SOURCE_HOSTS.length < 40,
    'D7: The allowlist is small enough to be a decision rather than a formality');

  // ── E. No provider may overwrite governed capability facts ────────────────
  clearGroundingProviders();
  const promoBefore = await capabilityRepository.resolve('CAP-PROMOTION-INTELLIGENCE', { includeKnowledge: true });
  const promoBeforeJson = JSON.stringify(promoBefore);

  assert(assertsCogniXFact('CogniX supports real-time promotion monitoring against live supplier feeds.'),
    'E1: A claim asserting what CogniX does is recognised as such');
  assert(assertsCogniXFact('The CogniX platform is production ready.') &&
    assertsCogniXFact('G10X offers continuous monitoring.'),
    'E2: …in its several phrasings, including the platform and the lab');
  assert(!assertsCogniXFact('Real-time promotion monitoring is expected of production-grade retail platforms.'),
    'E3: …while a claim about the market that does not name CogniX is not falsely accused');

  const hostile = claim({
    claim_id: 'H1',
    claim: 'CogniX provides fully implemented real-time promotion monitoring against live client supplier feeds.'
  });
  const hostileAdmission = admitClaim(hostile, true, NOW);
  assert(!hostileAdmission.admitted && hostileAdmission.rejection?.reason === 'asserts-cognix-fact',
    'E4: A perfectly sourced claim that redefines a CogniX capability is rejected outright (ADR-048)');

  const spy: GroundingRequest[] = [];
  registerGroundingProvider(fakeProvider([hostile, claim()], { spy }));
  const { answer: mixedAnswer, resolved: mixedResolved } = await atl05Answer('how does CogniX compare to Blue Yonder on promotion planning');
  const hostileEnvelope = await groundAnswer({ question: 'how does CogniX compare to Blue Yonder on promotion planning', answer: mixedAnswer, resolved: mixedResolved, now: NOW });
  assert(hostileEnvelope.rejected_claims.some(r => r.reason === 'asserts-cognix-fact'),
    'E5: The hostile claim is recorded as rejected rather than silently vanishing');
  assert(!JSON.stringify(hostileEnvelope.from_cognix).includes('fully implemented real-time'),
    'E6: Nothing the provider said reached the From CogniX class');
  assert(hostileEnvelope.from_cognix.statements.every(s => s.capability_id.startsWith('CAP-')),
    'E7: Every From CogniX statement is still attributed to a governed capability');

  const promoAfter = await capabilityRepository.resolve('CAP-PROMOTION-INTELLIGENCE', { includeKnowledge: true });
  assert(JSON.stringify(promoAfter) === promoBeforeJson,
    'E8: The governed record is byte-identical after a hostile provider ran against it');

  clearGroundingProviders();
  const internalSpy: GroundingRequest[] = [];
  registerGroundingProvider(fakeProvider([claim()], { spy: internalSpy }));
  const { answer: internalAnswer, resolved: internalResolved } = await atl05Answer('how does Decision Gap work');
  const internalEnvelope = await groundAnswer({ question: 'how does Decision Gap work', answer: internalAnswer, resolved: internalResolved, now: NOW });
  assert(internalSpy.length === 0,
    'E9: For an internal-only question the provider is never called — the policy gate is before the adapter');
  assert(internalEnvelope.market_context.available === false && internalEnvelope.market_context.statements.length === 0,
    'E10: …and no market evidence appears however willing the adapter was (AC-ATL-06-7)');
  assert((internalEnvelope.market_context.absence_reason ?? '').includes('governed CogniX records only'),
    'E11: …with the absence explained rather than left blank');

  // ── F. Contradiction precedence — the worked example ──────────────────────
  clearGroundingProviders();
  const promo = promoBefore!;
  const constraints = extractConstraints(promo);
  assert(constraints.some(c => c.dimension === 'data-provenance' && /synthetic enterprise world/.test(c.statement)),
    'F1: The governed record yields its own data-provenance constraint, quoted from its limitations');

  const dims = assertedDimensions(claim().claim);
  assert(dims.includes('data-provenance') && dims.includes('implementation'),
    'F2: The external claim is read for the dimensions it asserts, by declared markers only');

  const contradictions = detectContradictions([promo], [claim()]);
  const dataProv = contradictions.filter(c => c.dimension === 'data-provenance');
  assert(dataProv.length === 1,
    'F3: The disagreement is detected exactly once per capability, dimension and claim',
    `got ${dataProv.length}`);
  const worked = dataProv[0];
  assert(worked.resolution === 'cognix-authoritative' && worked.cognix_citation === 'CAP-PROMOTION-INTELLIGENCE',
    'F4: The governed record is authoritative and the record it cites is named');
  assert(/synthetic enterprise world, not a client planning system/.test(worked.from_cognix),
    'F5: From CogniX quotes the governed limitation rather than paraphrasing it into something softer');
  assert(worked.market_context === claim().claim,
    'F6: Market Context carries the external claim UNALTERED — it is not edited to agree with the record');
  assert(worked.market_source.publisher === 'Gartner' && !!worked.market_source.published_at && !!worked.market_source.retrieved_at,
    'F7: …and travels with its publisher and both dates');
  assert(/productisation direction rather than a current capability/.test(worked.ai_interpretation),
    'F8: AI Interpretation names a direction, not a capability — the owner’s worked example exactly');
  assert(!assertsCogniXFact(worked.ai_interpretation),
    'F9: …and the interpretation itself would not survive admission as a CogniX fact, because it asserts none');
  assert(new Set([worked.from_cognix, worked.market_context, worked.ai_interpretation]).size === 3,
    'F10: The three classes are three distinct strings — nothing was merged');

  assert(!contradictions.some(c => c.dimension === 'implementation'),
    'F11: An asserted dimension the record does not constrain produces NO contradiction — Promotion Intelligence is implemented, so the implementation assertion is not a disagreement');

  // CAP-CONTRACT-VERIFICATION is implemented, carries no synthetic-input limitation and is not
  // demonstrated at a prototype standard, so it declares no constraint for a claim to collide with.
  const clean = await capabilityRepository.resolve('CAP-CONTRACT-VERIFICATION', { includeKnowledge: true });
  assert(extractConstraints(clean!).length === 0 &&
    detectContradictions([clean!], [claim({ about_capabilities: ['CAP-CONTRACT-VERIFICATION'] })]).length === 0,
    'F12: A capability with no governed constraint cannot manufacture a contradiction out of a market claim');

  // …and detection is not special-cased to the worked example. The connector records its own
  // synthetic limitation, so the same claim contradicts it too, for the same declared reason.
  const connector = await capabilityRepository.resolve('CAP-SIGNAL-CONNECTOR', { includeKnowledge: true });
  const connectorContradiction = detectContradictions([connector!], [claim({ about_capabilities: ['CAP-SIGNAL-CONNECTOR'] })]);
  assert(connectorContradiction.length === 1 && connectorContradiction[0].dimension === 'data-provenance' &&
    /reference implementations marked synthetic/.test(connectorContradiction[0].from_cognix),
    'F12b: Detection generalises — any record that declares synthetic inputs is protected by the same rule');

  assert(detectContradictions([promo], [claim({ about_capabilities: [] })]).length === 0,
    'F13: A claim naming no capability is general market context and contradicts nothing');

  assert(CLAIM_ASSERTION_MARKERS.length === 4 &&
    new Set(CLAIM_ASSERTION_MARKERS.map(m => m.dimension)).size === 4,
    'F14: Assertion markers cover all four governed dimensions, one group each');

  // The full envelope for the worked example.
  registerGroundingProvider(fakeProvider([claim()]));
  const { answer: wa, resolved: wr } = await atl05Answer('how does CogniX compare to Blue Yonder on promotion monitoring');
  const workedEnvelope = await groundAnswer({
    question: 'how does CogniX compare to Blue Yonder on promotion monitoring',
    answer: wa,
    resolved: [...wr, promo],
    now: NOW
  });
  assert(workedEnvelope.market_context.available && workedEnvelope.market_context.statements.length === 1,
    'F15: The admitted claim reaches the Market Context class and only that class');
  assert(workedEnvelope.contradictions.length >= 1 && workedEnvelope.ai_interpretation.available,
    'F16: The contradiction surfaces, and it is what makes an interpretation available');
  assert(workedEnvelope.ai_interpretation.statements.every(s => s.rests_on.length > 0),
    'F17: No interpretation is emitted that does not rest on a governed statement it cites (ADR-048)');
  assert(workedEnvelope.from_cognix.statements.length > 0 &&
    !JSON.stringify(workedEnvelope.from_cognix).includes('Real-time promotion monitoring'),
    'F18: The governed class is unaffected by the presence of a contradicting claim');

  // ── G. Refusal when grounding is insufficient ─────────────────────────────
  clearGroundingProviders();
  const { answer: ma, resolved: mr } = await atl05Answer('what do competitors offer for promotional forecasting');
  const noProvider = await groundAnswer({ question: 'what do competitors offer for promotional forecasting', answer: ma, resolved: mr, now: NOW });
  assert(noProvider.refusal?.reason === 'no-grounding-provider',
    'G1: A question that only external evidence could answer is REFUSED when none can be retrieved');
  assert((noProvider.refusal?.message ?? '').includes('refused rather than answered'),
    'G2: …in words, not as an empty section');
  assert((noProvider.market_context.absence_reason ?? '').includes('ATL-06B'),
    'G3: The absence names what has not been built yet, so it reads as unbuilt rather than as nothing found');

  registerGroundingProvider(fakeProvider([claim({ source: source({ url: 'https://someblog.example.com/x' }) })]));
  const { answer: ma2, resolved: mr2 } = await atl05Answer('what do competitors offer for promotional forecasting');
  const allRejected = await groundAnswer({ question: 'what do competitors offer for promotional forecasting', answer: ma2, resolved: mr2, now: NOW });
  assert(allRejected.refusal?.reason === 'all-claims-rejected' && allRejected.rejected_claims.length === 1,
    'G4: Evidence retrieved and none admissible is a refusal, not a thin answer');

  clearGroundingProviders();
  registerGroundingProvider(fakeProvider([], { name: 'empty-grounding' }));
  const { answer: ma3, resolved: mr3 } = await atl05Answer('what do competitors offer for promotional forecasting');
  const nothingFound = await groundAnswer({ question: 'what do competitors offer for promotional forecasting', answer: ma3, resolved: mr3, now: NOW });
  assert(nothingFound.refusal?.reason === 'insufficient-grounding',
    'G5: A provider that found nothing is distinguished from a provider that does not exist');

  clearGroundingProviders();
  registerGroundingProvider(fakeProvider([claim()], { fail: true }));
  const { answer: ma4, resolved: mr4 } = await atl05Answer('what do competitors offer for promotional forecasting');
  const afterFailure = await groundAnswer({ question: 'what do competitors offer for promotional forecasting', answer: ma4, resolved: mr4, now: NOW });
  assert(afterFailure.market_context.available === false &&
    (afterFailure.market_context.absence_reason ?? '').includes('none has been substituted from memory'),
    'G6: A provider failure degrades to stated absence, never to remembered market evidence (ADR-049)');
  assert(afterFailure.from_cognix.statements.length === ma4.sections.filter(s => s.maturity).length,
    'G7: …and the governed answer survives the provider failure intact');

  // ── H. ATL-05 behaviour is preserved exactly ──────────────────────────────
  clearGroundingProviders();
  const QUESTIONS = [
    'how does Decision Gap work',
    'why did the decision change',
    'what do competitors offer',
    'zzz nothing at all'
  ];
  for (const q of QUESTIONS) {
    const gated = await ask({ question: q });
    const { grounding, ...atl05Portion } = gated;
    const { answer: independent } = await atl05Answer(q);
    assert(JSON.stringify(atl05Portion) === JSON.stringify(independent),
      `H1[${q}]: The ATL-05 answer is byte-identical to one assembled without the grounding layer`);
    assert(grounding.market_context.available === false && grounding.market_context.absence_reason !== null,
      `H2[${q}]: Market Context is shown as explicitly absent, with a reason — never omitted silently`);
  }

  // …and it stays identical with a provider running.
  registerGroundingProvider(fakeProvider([claim()]));
  for (const q of QUESTIONS) {
    const gated = await ask({ question: q });
    const { grounding: _g, ...atl05Portion } = gated;
    const { answer: independent } = await atl05Answer(q);
    assert(JSON.stringify(atl05Portion) === JSON.stringify(independent),
      `H3[${q}]: Turning a provider ON changes no governed field of the answer`);
  }
  clearGroundingProviders();

  const gapAnswer = await ask({ question: 'zzz nothing at all' });
  assert(gapAnswer.outcome === 'gap' && gapAnswer.grounding.decision.intent === 'internal-only',
    'H4: A gap is still a gap — grounding did not turn an unanswerable question into an answerable one');
  const externalAnswer = await ask({ question: 'what do competitors offer' });
  assert(externalAnswer.externalKnowledgeNotice !== null && externalAnswer.grounding.refusal !== null,
    'H5: The ATL-05 external notice and the ATL-06A refusal coexist rather than replacing one another');

  // ── I. The layer holds no network, no SDK and no credential ───────────────
  const groundingFiles = readdirSync(join(ROOT, 'lib', 'atlas', 'grounding')).filter(f => f.endsWith('.ts'));
  const groundingSrc = groundingFiles.map(f => readFileSync(join(ROOT, 'lib', 'atlas', 'grounding', f), 'utf8')).join('\n');
  const groundingCode = groundingSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert(!/\bfetch\s*\(|\baxios\b|node-fetch|XMLHttpRequest/.test(groundingCode),
    'I1: ATL-06A performs no network call — retrieval is ATL-06B’s to add behind the interface');
  assert(!/gemini|generative-ai|openai|@google\//i.test(groundingCode),
    'I2: No provider SDK is imported');
  assert(!/process\.env|API_KEY|apiKey|Authorization|Bearer /i.test(groundingCode),
    'I3: No credential is read, named or logged anywhere in the grounding layer (ADR-049)');
  assert(groundingFiles.length === 5,
    'I4: The layer is five modules — policy, provenance, contradiction, provider, engine');
  assert(!/from '\.\.\/grounding/.test(readFileSync(join(ROOT, 'lib', 'atlas', 'ai', 'answer.ts'), 'utf8')),
    'I5: Answer assembly does not import the grounding layer — the dependency runs one way only');

  // ── J. The declared policy is published ───────────────────────────────────
  const policyBody = await (await groundingRoute()).json();
  assert(policyBody.status === 'success' && policyBody.domain === 'capability-atlas-grounding-policy',
    'J1: The grounding policy is served on the estate envelope');
  const p = policyBody.data;
  assert(p.policy_version === GROUNDING_POLICY_VERSION && p.default_intent === 'internal-only',
    'J2: …reporting the same policy version the engine stamps on every envelope');
  assert(JSON.stringify(p.source_admission.trusted_hosts) === JSON.stringify([...TRUSTED_SOURCE_HOSTS]) &&
    JSON.stringify(p.freshness.topic_max_age_days) === JSON.stringify(TOPIC_MAX_AGE_DAYS),
    'J3: The published values ARE the engine’s values — the route reads the constants, it does not restate them');
  assert(p.provider.configured === false && p.provider.name === null,
    'J4: Provider status is reported without naming a key, an endpoint or a credential');
  assert(!JSON.stringify(p).toLowerCase().includes('key') && !JSON.stringify(p).toLowerCase().includes('token'),
    'J5: …and no key or token material appears anywhere in the published policy');
  assert(p.contradiction.resolution === 'cognix-authoritative' && p.not_yet_delivered['ATL-06B'],
    'J6: The policy states the contradiction rule and what remains unbuilt');

  // ── K. The surface renders the separation ─────────────────────────────────
  const ev = readFileSync(join(ROOT, 'components', 'atlas', 'EvidenceClasses.tsx'), 'utf8');
  assert(/From CogniX/.test(ev) && /Market Context/.test(ev) && /AI Interpretation/.test(ev),
    'K1: All three classes carry a standing visible label (ADR-048 visual separation)');
  assert(/atlas-contradiction-row--cognix/.test(ev) && /atlas-contradiction-row--market/.test(ev) &&
    /atlas-contradiction-row--interpretation/.test(ev),
    'K2: A contradiction renders as three separately styled rows');
  assert(!/reconcil|merged|combined/i.test(ev.replace(/\/\*[\s\S]*?\*\//g, '')),
    'K3: …and the surface has no fourth, reconciling row');
  assert(/s\.source\.publisher/.test(ev) && /s\.source\.published_at/.test(ev) &&
    /s\.source\.retrieved_at/.test(ev) && /s\.source\.url/.test(ev),
    'K4: Every market claim renders url, publisher, publication date and retrieval date (AC-ATL-06-2)');
  assert(/market\.absence_reason/.test(ev) && /interpretation\.absence_reason/.test(ev),
    'K5: An absent class renders its reason rather than disappearing');
  assert(/rejected_claims\.length > 0/.test(ev),
    'K6: What was dropped at admission is visible to the reader, not only to the payload');
  assert(/contradicting\.has\(s\.claim\)/.test(ev) && /disagrees with a governed record/.test(ev),
    'K6b: A claim shown in both the contradiction block and the market record says why, rather than reading as duplication');

  const css = readFileSync(join(ROOT, 'app', 'globals.css'), 'utf8');
  assert(/\.atlas-ev-block--cognix/.test(css) && /\.atlas-ev-block--market/.test(css) &&
    /\.atlas-ev-block--interpretation/.test(css),
    'K7: The three classes have three distinct visual treatments in stylesheet, not one shared block');
  assert(/\.atlas-ev-fresh--stale/.test(css) && /\.atlas-ev-fresh--aging/.test(css),
    'K8: Currency is rendered, so a reader judges a source without doing date arithmetic');

  const askUi = readFileSync(join(ROOT, 'components', 'atlas', 'AskCogniX.tsx'), 'utf8');
  assert(/EvidenceClassHead cls="from-cognix"/.test(askUi) && /<EvidenceClasses grounding=/.test(askUi),
    'K9: Ask CogniX labels its governed answer as a class and renders the other two beneath it');
  assert(askUi.indexOf('EvidenceClassHead cls="from-cognix"') < askUi.indexOf('<EvidenceClasses grounding='),
    'K10: …in ADR-048 order — governed evidence is read before market context and interpretation');
  assert(/const \[open, setOpen\] = useState\(false\)/.test(askUi),
    'K11: Ask is still collapsed by default — ATL-06A did not make the Atlas chatbot-first');

  // ── L. Governance is updated, not merely intended ─────────────────────────
  const charter = readFileSync(join(ROOT, 'docs', 'governance', 'COGNIX_CAPABILITY_ATLAS.md'), 'utf8');
  assert(/### `ATL-06A`/.test(charter) && /### `ATL-06B`/.test(charter) &&
    /### `ATL-06C`/.test(charter) && /### `ATL-06D`/.test(charter),
    'L1: ATL-06 is split into four specified work packages');
  assert(/\| `ATL-06A` \|/.test(charter) && /\*\*\[COMPLETED\]\*\*/.test(charter.split('| `ATL-06A` |')[1].split('\n')[0]),
    'L2: The status board records ATL-06A as completed with evidence');
  assert(/`ATL-06B`\*\* — /.test(charter) || /Next executable work package:\*\* \*\*`ATL-06B`/.test(charter),
    'L3: The next executable work package is ATL-06B');
  const master = readFileSync(join(ROOT, 'docs', 'governance', 'MASTER_PLAN.md'), 'utf8');
  assert(/`ATL-06A`/.test(master) && /`ATL-06D`/.test(master),
    'L4: The master plan carries the same four-way split');
  const adrs = readFileSync(join(ROOT, 'docs', 'architecture', 'ARCHITECTURE_DECISIONS.md'), 'utf8');
  assert(/### ADR-053:/.test(adrs) && /### ADR-054:/.test(adrs),
    'L5: The two decisions ATL-06A actually took are recorded as ADRs');
  assert(existsSync(join(ROOT, 'docs', 'reports', 'COGNIX_ATL_06A_EXTERNAL_GROUNDING_PROVENANCE_REPORT.md')),
    'L6: The phase report exists at the path the status board cites');

  // ── M. No AI attribution anywhere in the delivered artefacts ──────────────
  const delivered = [
    join(ROOT, 'packages', 'contracts', 'src', 'atlas-grounding-model.ts'),
    join(ROOT, 'components', 'atlas', 'EvidenceClasses.tsx'),
    join(ROOT, 'app', 'api', 'v1', 'atlas', 'grounding', 'route.ts'),
    ...groundingFiles.map(f => join(ROOT, 'lib', 'atlas', 'grounding', f))
  ].map(f => readFileSync(f, 'utf8')).join('\n');
  assert(!/claude|anthropic|generated by|co-authored/i.test(delivered),
    'M1: No assistant identity, attribution or generation marker appears in any delivered artefact');

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error('ATL-06A test suite failed with an error:', e); process.exit(1); });
