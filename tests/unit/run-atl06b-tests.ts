/**
 * Unit Test Suite for CogniX ATL-06B Grounded Market Intelligence
 * Run via: npx tsx tests/unit/run-atl06b-tests.ts
 *
 * ATL-06A proved the gate with no provider. ATL-06B puts a real one behind it, so the question this
 * suite answers is narrower and harder: **does anything the provider says reach a reader without
 * having been earned?**
 *
 * The adversarial cases are the suite. A grounding provider fails in ways a cooperative test never
 * finds — it writes fluent unsourced prose in the same paragraph as sourced findings, it cites a
 * vendor's own marketing, it returns the same page twice, it hands back a redirect that resolves
 * nowhere, it volunteers a flattering statement about this estate from an impeccable publisher, and
 * sometimes it returns a confident answer with no grounding metadata at all. Each of those has a
 * fixture here, and in each case the correct output is less than the provider offered.
 *
 * Three properties are asserted repeatedly because they are the ones worth losing sleep over:
 *   - every shown claim traces to an admitted source, and ungrounded model text is counted and dropped;
 *   - external research never happens unless a reader asked for it;
 *   - with the provider off, the Atlas is exactly as trustworthy and as functional as at ATL-05.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  extractGroundedSegments
} from '../../lib/atlas/grounding/providers/grounding-extraction';
import {
  SOURCE_TIER_BY_HOST, extractPublishedDate, extractSiteName, registrableHost,
  resolveSource, tierForHost
} from '../../lib/atlas/grounding/providers/source-resolution';
import {
  GEMINI_API_KEY_HEADER, GEMINI_ENDPOINT_BASE, GENERIC_CAPABILITY_WORDS,
  PROVIDER_NAME, buildPrompt, createGoogleSearchGroundingProvider, relateClaimToCapabilities
} from '../../lib/atlas/grounding/providers/google-search-grounding';
import {
  GEMINI_MODEL_PATTERN, VERIFIED_GEMINI_MODEL, primaryGeminiModel, resolveGeminiModelConfig, resolveGeminiModels
} from '../../config/gemini-models';
import {
  cacheKey, clearGroundingCache, getCached, liveCallCount, setCached
} from '../../lib/atlas/grounding/providers/grounding-cache';
import {
  ensureGroundingProviderRegistered, groundingProviderStatus, resetGroundingProviderRegistration
} from '../../lib/atlas/grounding/providers/register';
import { TRUSTED_SOURCE_HOSTS } from '../../lib/atlas/grounding/provenance';
import { clearGroundingProviders, registerGroundingProvider, type GroundingRequest } from '../../lib/atlas/grounding/provider';
import { groundAnswer } from '../../lib/atlas/grounding/engine';

import { ask } from '../../lib/atlas/ai/gateway';
import { retrieve } from '../../lib/atlas/ai/retrieval';
import { assembleAnswer } from '../../lib/atlas/ai/answer';
import { narrateIfAvailable } from '../../lib/atlas/ai/provider';
import { capabilityRepository } from '../../services/atlas/src/capability-registry';
import { getCapabilityIndex } from '../../lib/atlas/capability-index';
import { CURIOSITY_QUESTIONS } from '../../content/atlas/curiosity-questions';
import { POST as askRoute } from '../../app/api/v1/atlas/ask/route';
import { GET as groundingRoute } from '../../app/api/v1/atlas/grounding/route';
import type { ResolvedCapability } from '../../packages/contracts/src/capability-atlas-model';
import type { GeminiGenerateContentResponse } from '../../lib/atlas/grounding/providers/gemini-grounding-types';

import { FIXTURES, PAGES, SOURCE_FETCHER, NOW, daysAgo } from '../fixtures/atlas-grounding/gemini-grounding-fixtures';

const ROOT = join(__dirname, '..', '..');
let passed = 0, failed = 0;
function assert(c: boolean, name: string, detail?: string) {
  if (c) { console.log(`[PASS] ${name}`); passed++; }
  else { console.error(`[FAIL] ${name} - ${detail || 'Assertion failed'}`); failed++; }
}

const FAKE_KEY = 'not-a-real-credential';
const MARKET_QUESTION = 'how does CogniX compare to the market on promotion monitoring';

function makeProvider(fixture: GeminiGenerateContentResponse, opts: { calls?: string[]; fail?: boolean } = {}) {
  return createGoogleSearchGroundingProvider({
    apiKey: FAKE_KEY,
    now: () => NOW,
    transport: async (model) => {
      opts.calls?.push(model);
      if (opts.fail) throw new Error('Gemini grounding request failed (UNAVAILABLE).');
      return fixture;
    },
    sourceFetcher: SOURCE_FETCHER
  });
}

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

/** Runs one fixture end to end through the unmodified ATL-06A gate. */
async function groundWith(fixture: GeminiGenerateContentResponse, question = MARKET_QUESTION, opts: { fail?: boolean; research?: boolean } = {}) {
  clearGroundingProviders();
  clearGroundingCache();
  registerGroundingProvider(makeProvider(fixture, { fail: opts.fail }));
  const { answer, resolved } = await atl05Answer(question);
  const promo = await capabilityRepository.resolve('CAP-PROMOTION-INTELLIGENCE', { includeKnowledge: true });
  const envelope = await groundAnswer({
    question, answer,
    resolved: resolved.some(r => r.identity.capability_id === 'CAP-PROMOTION-INTELLIGENCE') ? resolved : [...resolved, promo!],
    now: NOW,
    researchRequested: opts.research !== false
  });
  return { envelope, answer };
}

function post(body: any): any {
  return { json: async () => body, nextUrl: new URL('http://localhost/api/v1/atlas/ask') };
}

async function run() {
  console.log('\n=== ATL-06B — Grounded Market Intelligence ===\n');

  // ── A. The wire contract, and why it is transcribed rather than imported ──
  const sdkTypes = join(ROOT, 'node_modules', '@google', 'generative-ai', 'dist', 'generative-ai.d.ts');
  if (existsSync(sdkTypes)) {
    const sdk = readFileSync(sdkTypes, 'utf8');
    assert(/groundingChunckIndices/.test(sdk),
      'A1: The installed SDK misspells the chunk-index field, so grounding read through it yields nothing');
    assert(/GroundingSupport[\s\S]{0,400}segment\?: string/.test(sdk),
      'A2: …and types `segment` as a string when the wire contract carries byte offsets');
    assert(!/interface GroundingChunkWeb[\s\S]{0,200}domain/.test(sdk),
      'A3: …and has no `domain`, which the Gemini Developer API does not populate anyway');
  } else {
    assert(false, 'A1-A3: The installed Google SDK could not be read to justify the REST decision');
  }
  assert(GEMINI_ENDPOINT_BASE === 'https://generativelanguage.googleapis.com/v1beta/models' &&
    GEMINI_API_KEY_HEADER === 'x-goog-api-key',
    'A4: The adapter calls the documented Gemini endpoint with the documented key header');
  const adapterSrc = readFileSync(join(ROOT, 'lib', 'atlas', 'grounding', 'providers', 'google-search-grounding.ts'), 'utf8');
  assert(/tools: \[\{ googleSearch: \{\} \}\]/.test(adapterSrc),
    'A5: The current googleSearch tool is declared, not the legacy googleSearchRetrieval form');
  const adapterCode = adapterSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert(!/@google\/generative-ai|@google\/genai/.test(adapterCode),
    'A6: No SDK is imported, so no dependency was added to ship this phase');
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  assert(!pkg.dependencies?.['@google/genai'] && !pkg.devDependencies?.['@google/genai'],
    'A6b: …and package.json gained no new provider dependency');
  // A7 previously asserted that a hard-coded fallback list existed. That design is what let three
  // call sites drift onto retired aliases while every fixture-backed test kept passing, so the
  // assertion now checks the property that replaced it (ADR-067).
  assert(GEMINI_MODEL_PATTERN.test(VERIFIED_GEMINI_MODEL) && primaryGeminiModel() === VERIFIED_GEMINI_MODEL,
    `A7: The model comes from one governed configuration, defaulting to the verified ${VERIFIED_GEMINI_MODEL}`);
  const providerLayer = [
    ...readdirSync(join(ROOT, 'lib', 'atlas', 'grounding', 'providers')).map(f => join(ROOT, 'lib', 'atlas', 'grounding', 'providers', f)),
    ...readdirSync(join(ROOT, 'lib', 'atlas', 'interpretation')).map(f => join(ROOT, 'lib', 'atlas', 'interpretation', f)),
    join(ROOT, 'scripts', 'atlas-live-grounding-check.ts')
  ].filter(f => f.endsWith('.ts')).map(f => readFileSync(f, 'utf8')).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  // Version-shaped identifiers only: `gemini-3.6-flash`, `gemini-2.5-pro`, `gemini-flash-latest`.
  // `gemini-interpretation` is a provider name, and `gemini-does-not-exist-9x` is the deliberate
  // negative control in the validation script's failure probe.
  const HARDCODED_MODEL = /['\`"]gemini-(?:\d[\d.]*|flash|pro)[a-z0-9.-]*['\`"]/g;
  const hardcoded = (providerLayer.match(HARDCODED_MODEL) ?? []);
  assert(hardcoded.length === 0,
    'A7b: …and no model name is hard-coded anywhere in the provider layer or the validation script',
    hardcoded.join(', '));
  assert(resolveGeminiModels('').length === 1 && resolveGeminiModelConfig('').source === 'default',
    'A7c: With no override the list is a SINGLE verified model — nothing falls back silently onto a retired alias');
  assert(resolveGeminiModelConfig('gemini-3.6-flash, gemini-3.6-pro').models.length === 2,
    'A7d: …while an operator can still configure an explicit chain, in one place');
  let malformed = '';
  try { resolveGeminiModels('not-a-model'); } catch (e: any) { malformed = e.message; }
  assert(/GEMINI_MODEL/.test(malformed) && /unusable model name/.test(malformed),
    'A7e: A mistyped override fails loudly naming the variable, rather than resolving to nothing');

  // ── B. Only grounded segments become claims ──────────────────────────────
  const admissibleExtract = extractGroundedSegments(FIXTURES.admissible.candidates![0]);
  assert(admissibleExtract.segments.length === 2,
    'B1: Two supported sentences become two segments', `got ${admissibleExtract.segments.length}`);
  assert(admissibleExtract.segments.every(s => s.chunkIndices.length > 0),
    'B2: Every segment names at least one retrieved source');
  assert(!admissibleExtract.segments.some(s => /widely accepted/.test(s.text)),
    'B3: The fluent unsourced sentence is NOT among them');
  assert(admissibleExtract.discardedUngrounded > 0 &&
    admissibleExtract.notices.some(n => /no grounding support/.test(n)),
    'B4: …it is counted as discarded and the count is reported, not silently dropped');

  const noMeta = extractGroundedSegments(FIXTURES.noGroundingMetadata.candidates![0]);
  assert(noMeta.segments.length === 0 && noMeta.discardedUngrounded === 3,
    'B5: A confident answer with NO grounding metadata yields zero claims and counts every sentence',
    `segments ${noMeta.segments.length}, discarded ${noMeta.discardedUngrounded}`);
  assert(noMeta.notices.some(n => /no grounding metadata at all/.test(n)),
    'B6: …and says so, so model recall is never mistaken for a thin search');

  const noChunks = extractGroundedSegments(FIXTURES.metadataWithoutChunks.candidates![0]);
  assert(noChunks.segments.length === 0 && noChunks.notices.some(n => /no source chunks/.test(n)),
    'B7: Grounding metadata with no source chunks grounds nothing');

  const orphanSupport = extractGroundedSegments(FIXTURES.supportWithoutChunks.candidates![0]);
  assert(orphanSupport.segments.length === 0 &&
    orphanSupport.notices.some(n => /named no usable source/.test(n)),
    'B8: A support naming no chunk grounds nothing, however confident it looks');

  // The live contract: startIndex is elided at its default value on the first segment.
  const liveShape = extractGroundedSegments(FIXTURES.liveFirstSegmentShape.candidates![0]);
  const firstSupport: any = FIXTURES.liveFirstSegmentShape.candidates![0].groundingMetadata!.groundingSupports![0];
  assert(firstSupport.segment.startIndex === undefined && typeof firstSupport.segment.endIndex === 'number',
    'B9a: The recorded live shape really does omit startIndex on the first support');
  assert(liveShape.segments.length === 2,
    'B9b: …and BOTH segments are extracted — an omitted startIndex means byte 0, not "no offsets, skip it"',
    `${liveShape.segments.length} extracted`);
  assert(liveShape.segments[0].text.startsWith('Grocery retailers increasingly evaluate') &&
    liveShape.segments[0].text.endsWith('rather than a refinement.'),
    'B9c: …and the opening claim reconstructs exactly, start to finish',
    liveShape.segments[0].text.slice(0, 60));
  assert(liveShape.discardedUngrounded === 0 && liveShape.notices.length === 0,
    'B9d: …with nothing dropped and nothing to warn about');

  const noEnd = extractGroundedSegments(FIXTURES.missingEndIndex.candidates![0]);
  assert(noEnd.segments.length === 0 && noEnd.notices.some(n => /unusable byte offsets/.test(n)),
    'B9e: A support with no endIndex is DROPPED — a span with no end is malformed, not partial');

  const inconsistent = extractGroundedSegments(FIXTURES.inconsistentOffsets.candidates![0]);
  assert(inconsistent.segments.length === 0 &&
    inconsistent.notices.some(n => /did not reconstruct their own quoted text/.test(n)),
    'B9f: Offsets that do not reconstruct their own quoted text are dropped — internally inconsistent provenance is not shown on the strength of whichever half looks better');

  const byteCase = extractGroundedSegments(FIXTURES.byteOffsets.candidates![0]);
  assert(byteCase.segments.length === 1 &&
    byteCase.segments[0].text === 'Capacity-aware promotion planning is now assessed before launch in most tier-one grocers.',
    'B9: Byte offsets are sliced as bytes — a passage containing an em dash and a curly apostrophe still extracts exactly',
    byteCase.segments[0]?.text);
  assert(extractGroundedSegments(undefined).segments.length === 0,
    'B10: A missing candidate yields nothing rather than throwing');

  // ── C. Provenance comes from the page, never from the model ──────────────
  const gartner = await resolveSource({ uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/gartner-fresh' }, SOURCE_FETCHER);
  assert(gartner.source?.host === 'www.gartner.com' && gartner.source?.publisher === 'Gartner',
    'C1: The redirect is followed and the real publisher is read from the page');
  assert(gartner.source?.published_at === daysAgo(60),
    'C2: …as is the publication date, from the page metadata', gartner.source?.published_at);
  assert(gartner.source?.tier === 'analyst', 'C3: …and the tier is declared for the resolved host');

  const undated = await resolveSource({ uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/idc-undated' }, SOURCE_FETCHER);
  assert(undated.source !== null && undated.source.published_at === '',
    'C4: A page that states no publication date yields an EMPTY date — never today, never the retrieval date');

  const dead = await resolveSource({ uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/dead-link' }, SOURCE_FETCHER);
  assert(dead.source === null && dead.failure === 'bad-status',
    'C5: A dead source resolves to nothing rather than to a half-filled record');
  const unresolvable = await resolveSource({ uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/no-such-page' }, SOURCE_FETCHER);
  assert(unresolvable.source === null && unresolvable.failure === 'fetch-failed',
    'C6: An unresolvable redirect resolves to nothing');
  assert((await resolveSource(undefined, SOURCE_FETCHER)).failure === 'no-uri',
    'C7: A chunk with no URI resolves to nothing');

  assert(extractPublishedDate('<html><head></head><body>Published sometime in 2024</body></html>') === null,
    'C8: A year in body copy is not a publication date — nothing is scraped out of prose');
  assert(extractPublishedDate('<script type="application/ld+json">{"datePublished":"2026-03-04T10:00:00Z"}</script>') === '2026-03-04',
    'C9: JSON-LD datePublished is read');
  assert(extractSiteName('<meta property="og:site_name" content="Retail Week">') === 'Retail Week',
    'C10: The publisher is what the page calls itself');

  assert(TRUSTED_SOURCE_HOSTS.every(h => SOURCE_TIER_BY_HOST[h] !== undefined),
    'C11: Every allowlisted host has a declared tier — a rejection is always explainable');
  assert(Object.keys(SOURCE_TIER_BY_HOST).every(h => (TRUSTED_SOURCE_HOSTS as readonly string[]).includes(h)),
    'C12: …and no tier is declared for a host that is not allowlisted, so the two lists cannot drift');
  assert(tierForHost('blueyonder.com') === 'unknown' && registrableHost('blueyonder.com') === null,
    'C13: An unrecognised host is `unknown`, which ATL-06A treats as inadmissible');

  // ── D. The adapter turns segments into candidate claims ──────────────────
  const request: GroundingRequest = {
    question: MARKET_QUESTION, topics: ['market and competitor landscape'],
    capability_ids: ['CAP-PROMOTION-INTELLIGENCE']
  };
  clearGroundingCache();
  const models: string[] = [];
  const result = await makeProvider(FIXTURES.admissible, { calls: models }).retrieveGrounded!(request);
  assert(result.claims.length === 2, 'D1: Two grounded segments become two candidate claims');
  assert(result.claims.every(c => c.provider === PROVIDER_NAME && c.source.retrieval_method === 'search-grounding'),
    'D2: Every claim records which adapter produced it and how');
  assert(result.claims.every(c => c.source.retrieved_at === NOW.toISOString().slice(0, 10)),
    'D3: The retrieval date is when the claim was retrieved');
  assert(result.claims.every(c => c.about_capabilities.length === 1),
    'D4: Claims are scoped to the capabilities the governed answer was built from, not sprayed across the corpus');
  assert(result.transparency.queries.length === 2 && result.transparency.provider_model === primaryGeminiModel(),
    'D5: The searches actually run and the model that ran them are reported');
  assert(result.transparency.discarded_ungrounded_segments > 0,
    'D6: …alongside how much model prose was thrown away');
  assert(result.transparency.search_entry_point_html !== null,
    'D7: Google Search Suggestions markup is carried through for display, as required');

  clearGroundingCache();
  const dupes = await makeProvider(FIXTURES.duplicateSources).retrieveGrounded!(request);
  assert(dupes.claims.length === 1,
    'D8: The same page cited twice for one sentence yields ONE claim, not two', `got ${dupes.claims.length}`);

  clearGroundingCache();
  const unresolved = await makeProvider(FIXTURES.unresolvableSource).retrieveGrounded!(request);
  assert(unresolved.claims.length === 0 && unresolved.transparency.unresolved_sources === 1,
    'D9: A source that cannot be resolved produces no claim and is counted');

  const scoped: GroundingRequest = {
    ...request,
    capabilities: [
      { id: 'CAP-PROMOTION-INTELLIGENCE', name: 'Promotion Intelligence' },
      { id: 'CAP-OPPORTUNITY-WINDOW', name: 'Opportunity Window & Micro-Market Graph' }
    ]
  };
  assert(JSON.stringify(relateClaimToCapabilities('Real-time promotion monitoring against live supplier feeds is expected of production-grade retail planning platforms.', scoped)) === JSON.stringify(['CAP-PROMOTION-INTELLIGENCE']),
    'D11: A claim relates only to the capability it actually names — not to every capability on screen');
  assert(relateClaimToCapabilities('Retail margins tightened across European grocery in 2026.', scoped).length === 0,
    'D12: General market context relates to nothing, and therefore cannot contradict a record it never mentioned');
  assert(JSON.stringify(relateClaimToCapabilities('anything', { ...request, capabilities: undefined })) === JSON.stringify(request.capability_ids),
    'D13: An ATL-06A adapter that supplies no names keeps its previous behaviour exactly');
  assert(GENERIC_CAPABILITY_WORDS.has('market') && GENERIC_CAPABILITY_WORDS.has('intelligence'),
    'D14: Words common to capability names and market prose are excluded by declaration, not by tuning');

  assert(/Do not make any statement about CogniX/.test(buildPrompt('q', [])),
    'D10: The prompt forbids statements about this estate — belt, with the ATL-06A gate as braces');

  // ── E. Adversarial cases, end to end through the unmodified ATL-06A gate ──
  const admissible = await groundWith(FIXTURES.admissible);
  assert(admissible.envelope.market_context.available &&
    admissible.envelope.market_context.statements.length === 2,
    'E1: Credible, dated, allowlisted evidence is admitted and shown');
  assert(admissible.envelope.market_context.statements.every(s =>
    s.source.publisher && s.source.published_at && s.source.retrieved_at && s.source.url.startsWith('https://')),
    'E2: …with complete provenance on every statement');
  assert(admissible.envelope.search_transparency?.discarded_ungrounded_segments! > 0,
    'E3: …and the discarded model prose is reported to the reader');

  const contradictory = await groundWith(FIXTURES.contradictory);
  assert(contradictory.envelope.contradictions.length === 1,
    'E3b: The disagreement is raised once, against the capability the claim names',
    `${contradictory.envelope.contradictions.length} contradictions`);
  assert(contradictory.envelope.ai_interpretation.statements.length === 1,
    'E3c: …and an interpretation repeated word for word is emitted once, citing every record it rests on');
  assert(contradictory.envelope.market_context.available && contradictory.envelope.contradictions.length >= 1,
    'E4: Contradictory BUT CREDIBLE evidence is admitted, and the disagreement is surfaced');
  const contra = contradictory.envelope.contradictions[0];
  assert(contra.resolution === 'cognix-authoritative' && /synthetic enterprise world/.test(contra.from_cognix),
    'E5: …with the governed record authoritative and quoted, exactly as at ATL-06A');
  assert(!JSON.stringify(contradictory.envelope.from_cognix).includes('Real-time promotion monitoring'),
    'E6: …and nothing the provider said entered the From CogniX class');

  const agreeable = await groundWith(FIXTURES.agreeableButInadmissible);
  assert(!agreeable.envelope.market_context.available &&
    agreeable.envelope.rejected_claims[0]?.reason === 'source-not-allowlisted',
    'E7: AGREEABLE evidence from an unlisted publisher is rejected — comfort is not provenance');

  const stale = await groundWith(FIXTURES.stale);
  assert(stale.envelope.rejected_claims[0]?.reason === 'stale-source',
    'E8: An expired source is rejected, not shown with a warning',
    stale.envelope.rejected_claims[0]?.reason);

  const undatedEnv = await groundWith(FIXTURES.undated);
  assert(undatedEnv.envelope.rejected_claims[0]?.reason === 'undated-source',
    'E9: A page that will not say when it was written is refused');

  const vendor = await groundWith(FIXTURES.vendorMarketing);
  assert(vendor.envelope.rejected_claims[0]?.reason === 'source-not-allowlisted',
    'E10: A vendor marketing page is not placed beside a governed capability record');

  const asserts = await groundWith(FIXTURES.assertsCogniXFact);
  assert(asserts.envelope.rejected_claims[0]?.reason === 'asserts-cognix-fact',
    'E11: A claim about what CogniX does is rejected even from an impeccable publisher');
  assert(!asserts.envelope.market_context.available &&
    !JSON.stringify(asserts.envelope.from_cognix).includes('fully implemented'),
    'E12: …and it reaches no class at all');

  const noMetaEnv = await groundWith(FIXTURES.noGroundingMetadata);
  assert(!noMetaEnv.envelope.market_context.available &&
    noMetaEnv.envelope.rejected_claims.length === 0 &&
    noMetaEnv.envelope.search_transparency?.discarded_ungrounded_segments === 3,
    'E13: Ungrounded model knowledge never becomes a candidate at all — there is nothing to reject');

  const failed06b = await groundWith(FIXTURES.admissible, MARKET_QUESTION, { fail: true });
  assert(!failed06b.envelope.market_context.available &&
    (failed06b.envelope.market_context.absence_reason ?? '').includes('none has been substituted from memory'),
    'E14: Provider failure degrades to stated absence, never to remembered evidence');
  assert(failed06b.envelope.from_cognix.statements.length > 0,
    'E15: …and the governed answer survives it intact');

  const deadEnv = await groundWith(FIXTURES.deadSource);
  assert(!deadEnv.envelope.market_context.available && deadEnv.envelope.search_transparency?.unresolved_sources === 1,
    'E16: Missing grounding metadata on the source side — a dead page — yields nothing, and is counted');

  const mixed = await groundWith(FIXTURES.mixed);
  assert(mixed.envelope.market_context.statements.length === 1,
    'E17: In a realistic mixed response, ONE of five candidate claims survives admission',
    `${mixed.envelope.market_context.statements.length} admitted`);
  const mixedReasons = mixed.envelope.rejected_claims.map(r => r.reason).sort();
  assert(JSON.stringify(mixedReasons) === JSON.stringify(['asserts-cognix-fact', 'source-not-allowlisted', 'stale-source', 'undated-source']),
    'E18: …and each of the other four is rejected by its own named reason',
    mixedReasons.join(', '));
  assert(mixed.envelope.rejected_claims.every(r => r.detail.length > 30),
    'E19: …each carrying an explanation a reader can act on');
  assert(mixed.envelope.search_transparency?.queries.length === 2,
    'E20: …with the searches actually run reported alongside');

  // ── F. External research is user-initiated ───────────────────────────────
  const spy: GroundingRequest[] = [];
  clearGroundingProviders(); clearGroundingCache();
  registerGroundingProvider({
    name: 'spy', isConfigured: () => true,
    retrieve: async (r) => { spy.push(r); return []; },
    retrieveGrounded: async (r) => { spy.push(r); return { claims: [], transparency: { queries: [], search_entry_point_html: null, provider_model: null, cache: 'miss', discarded_ungrounded_segments: 0, unresolved_sources: 0 } }; }
  });
  const { answer: offAnswer, resolved: offResolved } = await atl05Answer(MARKET_QUESTION);
  const off = await groundAnswer({ question: MARKET_QUESTION, answer: offAnswer, resolved: offResolved, now: NOW, researchRequested: false });
  assert(spy.length === 0, 'F1: With research not requested, the provider is never called');
  assert(!off.market_context.available &&
    (off.market_context.absence_reason ?? '').includes('does not search outward on its own'),
    'F2: …and the absence says the Atlas did not look, rather than that nothing was found');
  assert(off.provider === null,
    'F3: …and no provider is named, because none ran');

  const onEnv = await groundAnswer({ question: MARKET_QUESTION, answer: offAnswer, resolved: offResolved, now: NOW, researchRequested: true });
  assert(spy.length === 1 && onEnv.provider === 'spy',
    'F4: With research requested, the provider runs once');

  const internalSpyBefore = spy.length;
  const { answer: intAnswer, resolved: intResolved } = await atl05Answer('how does Decision Gap work');
  await groundAnswer({ question: 'how does Decision Gap work', answer: intAnswer, resolved: intResolved, now: NOW, researchRequested: true });
  assert(spy.length === internalSpyBefore,
    'F5: Asking for research on a CogniX question still calls nothing — policy outranks the request');

  const { answer: reqAnswer, resolved: reqResolved } = await atl05Answer('what do competitors offer for promotional forecasting');
  const refused = await groundAnswer({ question: 'what do competitors offer for promotional forecasting', answer: reqAnswer, resolved: reqResolved, now: NOW, researchRequested: false });
  assert(refused.refusal?.reason === 'research-not-requested',
    'F6: A question only external evidence could answer is refused distinctly when research was not asked for');
  assert((refused.refusal?.message ?? '').includes('nothing was looked up'),
    'F7: …saying nothing was looked up, which is a different statement from nothing being found');

  clearGroundingProviders();
  const defaulted = await ask({ question: MARKET_QUESTION });
  assert(defaulted.grounding.decision.external_allowed === true &&
    !defaulted.grounding.market_context.available,
    'F8: ask() defaults to research OFF — policy may permit external evidence and none is fetched');

  const routeDefault = await (await askRoute(post({ question: MARKET_QUESTION }))).json();
  assert(routeDefault.data.grounding.market_context.available === false,
    'F9: The route defaults to research off');
  const routeOn = await (await askRoute(post({ question: MARKET_QUESTION, research: true }))).json();
  assert(routeOn.status === 'success' && routeOn.data.grounding.refusal === null || routeOn.data.grounding.market_context.available === false,
    'F10: The route accepts an explicit research opt-in without changing the governed answer');

  // ── G. Cache and cost control ────────────────────────────────────────────
  clearGroundingCache();
  const calls: string[] = [];
  const cached = makeProvider(FIXTURES.admissible, { calls });
  const first = await cached.retrieveGrounded!(request);
  const second = await cached.retrieveGrounded!(request);
  assert(calls.length === 1, 'G1: A repeated research question is served from cache, not a second call', `calls ${calls.length}`);
  assert(first.transparency.cache === 'miss' && second.transparency.cache === 'hit',
    'G2: …and the reader is told which they are looking at');
  assert(liveCallCount() === 1, 'G3: Live provider calls are counted for cost visibility');

  clearGroundingCache();
  const emptyKey = cacheKey('q', ['t'], 'm');
  setCached(emptyKey, { claims: [], transparency: first.transparency });
  assert(getCached(emptyKey) === null,
    'G4: An empty retrieval is never cached — one bad minute must not become six quiet hours');
  assert(cacheKey('Promotion  Monitoring ', ['b', 'a'], 'm') === cacheKey('promotion monitoring', ['a', 'b'], 'm'),
    'G5: Cache keys normalise wording and topic order, so trivial variation does not re-spend quota');

  // ── H. The credential never travels ──────────────────────────────────────
  const providerFiles = readdirSync(join(ROOT, 'lib', 'atlas', 'grounding', 'providers')).filter(f => f.endsWith('.ts'));
  const providerSrc = providerFiles.map(f => readFileSync(join(ROOT, 'lib', 'atlas', 'grounding', 'providers', f), 'utf8')).join('\n');
  const providerCode = providerSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert((providerCode.match(/process\.env\.GEMINI_API_KEY/g) ?? []).length === 1,
    'H1: The key is read from the server environment in exactly one place');
  assert(!/body\.apiKey|request\.apiKey|req\.apiKey|body\.api_key/.test(providerCode),
    'H2: …and is never accepted from a request body, unlike the estate’s older demo routes');
  assert(!/console\.(log|warn|error)\([^)]*apiKey/.test(providerCode),
    'H3: …and never logged');
  const envelopeJson = JSON.stringify(admissible.envelope);
  assert(!envelopeJson.includes(FAKE_KEY),
    'H4: No envelope produced with a configured provider contains the credential');
  assert(!JSON.stringify(await (await groundingRoute()).json()).includes(FAKE_KEY),
    'H5: …nor does the published policy');
  let keyError = '';
  try {
    await createGoogleSearchGroundingProvider({ apiKey: '', transport: async () => FIXTURES.admissible }).retrieveGrounded!(request);
  } catch (e: any) { keyError = e.message; }
  assert(/GEMINI_API_KEY/.test(keyError) && /environment variable/.test(keyError),
    'H6: With no key the adapter names the missing variable and generates nothing (ADR-044)');
  assert(createGoogleSearchGroundingProvider({ apiKey: '' }).isConfigured() === false,
    'H7: An adapter with no key reports itself unconfigured and is never selected');

  resetGroundingProviderRegistration();
  clearGroundingProviders();
  ensureGroundingProviderRegistered();
  ensureGroundingProviderRegistered();
  assert(groundingProviderStatus().registered && groundingProviderStatus().configured === false,
    'H8: Registration is idempotent and does not by itself configure anything');

  // ── I. Provider off is no less trustworthy than ATL-05 ───────────────────
  clearGroundingProviders(); clearGroundingCache();
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
      `I1[${q}]: With the provider off, the ATL-05 answer is byte-identical`);
    assert(grounding.market_context.absence_reason !== null,
      `I2[${q}]: …and the market section is explicitly absent with a reason`);
  }
  const gapOff = await ask({ question: 'zzz nothing at all', research: true });
  assert(gapOff.outcome === 'gap',
    'I3: Asking for research does not turn an unanswerable question into an answerable one');

  // With the provider ON and returning admissible evidence, the governed answer is still identical.
  clearGroundingProviders(); clearGroundingCache();
  registerGroundingProvider(makeProvider(FIXTURES.admissible));
  for (const q of QUESTIONS) {
    const gated = await ask({ question: q, research: true });
    const { grounding: _g, ...atl05Portion } = gated;
    const { answer: independent } = await atl05Answer(q);
    assert(JSON.stringify(atl05Portion) === JSON.stringify(independent),
      `I4[${q}]: With the provider ON, the governed answer is unchanged`);
  }
  clearGroundingProviders(); clearGroundingCache();

  // ── J. ATL-06A is the gate, unmodified ───────────────────────────────────
  const resolutionSrc = readFileSync(join(ROOT, 'lib', 'atlas', 'grounding', 'providers', 'source-resolution.ts'), 'utf8');
  assert(/import \{ TRUSTED_SOURCE_HOSTS \} from '\.\.\/provenance'/.test(resolutionSrc),
    'J1: ATL-06B imports the ATL-06A allowlist rather than restating it');
  assert(!/ADMISSIBLE_SOURCE_TIERS\s*=|TRUSTED_SOURCE_HOSTS\s*=/.test(providerCode),
    'J2: …and redefines neither the allowlist nor the admissible tiers');
  const engineSrc = readFileSync(join(ROOT, 'lib', 'atlas', 'grounding', 'engine.ts'), 'utf8');
  assert(/admitClaim\(claim, externalAllowed, now\)/.test(engineSrc),
    'J3: Every claim still passes through admitClaim — there is no second path into Market Context');
  assert(/const externalAllowed = decision\.external_allowed && researchRequested/.test(engineSrc),
    'J4: The research flag can only narrow what policy already permitted, never widen it');
  const provenanceSrc = readFileSync(join(ROOT, 'lib', 'atlas', 'grounding', 'provenance.ts'), 'utf8');
  const policySrc = readFileSync(join(ROOT, 'lib', 'atlas', 'grounding', 'policy.ts'), 'utf8');
  assert(!/from '\.\/providers|from '\.\.\/providers/.test(provenanceSrc + policySrc),
    'J5: Neither the admission gate nor the policy imports anything from the adapter — the dependency runs one way');
  assert(TRUSTED_SOURCE_HOSTS.length === 24,
    'J6: The allowlist was not widened to make this phase’s evidence admissible', `${TRUSTED_SOURCE_HOSTS.length} hosts`);

  // ── K. The surface shows how it searched and what it dropped ─────────────
  const ev = readFileSync(join(ROOT, 'components', 'atlas', 'EvidenceClasses.tsx'), 'utf8');
  assert(/discarded_ungrounded_segments/.test(ev) && /transparency\.queries/.test(ev),
    'K1: The reader sees the searches run and the model prose discarded');
  assert(/atlas-ev-ledger/.test(ev) && /r\.reason\.replace/.test(ev) && /r\.detail/.test(ev),
    'K2: Every rejected claim is listed with its reason and explanation, not just counted');
  assert(/search_entry_point_html/.test(ev) && /dangerouslySetInnerHTML/.test(ev),
    'K3: Google Search Suggestions markup is rendered as supplied, as required for Grounding with Google Search');
  assert((ev.match(/dangerouslySetInnerHTML/g) ?? []).length === 1,
    'K4: …and that is the only place raw markup is injected');
  const askUi = readFileSync(join(ROOT, 'components', 'atlas', 'AskCogniX.tsx'), 'utf8');
  assert(/const \[research, setResearch\] = useState\(false\)/.test(askUi),
    'K5: External research is off until the reader turns it on');
  assert(/JSON\.stringify\(\{ question, lens: lens \?\? undefined, research \}\)/.test(askUi),
    'K6: …and the choice is what the request carries');
  assert(/Include external market research/.test(askUi) && /Off by default/.test(askUi),
    'K7: …stated in the interface rather than buried in a payload');
  const css = readFileSync(join(ROOT, 'app', 'globals.css'), 'utf8');
  assert(/\.atlas-research-toggle/.test(css) && /\.atlas-ev-ledger/.test(css) && /\.atlas-ev-query/.test(css),
    'K8: The control, the rejection ledger and the query list are styled rather than unstyled markup');

  // ── L. Governance ────────────────────────────────────────────────────────
  const charter = readFileSync(join(ROOT, 'docs', 'governance', 'COGNIX_CAPABILITY_ATLAS.md'), 'utf8');
  assert(/### `ATL-06B` — Grounded Market Intelligence \[COMPLETED\]/.test(charter),
    'L1: The charter records ATL-06B as delivered under its redefined name');
  assert(/AI Interpretation/.test(charter.split('### `ATL-06C`')[1]?.split('### `ATL-06D`')[0] ?? ''),
    'L2: …and ATL-06C now owns AI Interpretation, per the owner decision');
  const master = readFileSync(join(ROOT, 'docs', 'governance', 'MASTER_PLAN.md'), 'utf8');
  assert(/`ATL-06B` — Grounded Market Intelligence \[COMPLETED\]/.test(master),
    'L3: The master plan carries the same redefinition');
  const adrs = readFileSync(join(ROOT, 'docs', 'architecture', 'ARCHITECTURE_DECISIONS.md'), 'utf8');
  assert(/### ADR-055:/.test(adrs) && /### ADR-056:/.test(adrs),
    'L4: The two decisions ATL-06B took are recorded as ADRs');
  assert(existsSync(join(ROOT, 'docs', 'reports', 'COGNIX_ATL_06B_GROUNDED_MARKET_INTELLIGENCE_REPORT.md')),
    'L5: The phase report exists at the path the status board cites');

  // ── M. No assistant attribution in any delivered artefact ────────────────
  const delivered = [
    ...providerFiles.map(f => join(ROOT, 'lib', 'atlas', 'grounding', 'providers', f)),
    join(ROOT, 'components', 'atlas', 'EvidenceClasses.tsx'),
    join(ROOT, 'components', 'atlas', 'AskCogniX.tsx'),
    join(ROOT, 'tests', 'fixtures', 'atlas-grounding', 'gemini-grounding-fixtures.ts')
  ].map(f => readFileSync(f, 'utf8')).join('\n');
  assert(!/claude|anthropic|generated by|co-authored/i.test(delivered),
    'M1: No assistant identity, attribution or generation marker appears in any delivered artefact');

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error('ATL-06B test suite failed with an error:', e); process.exit(1); });
