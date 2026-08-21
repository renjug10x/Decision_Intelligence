/**
 * Live grounding and interpretation validation (ATL-06C).
 *
 * Run:  GEMINI_API_KEY=... npx tsx scripts/atlas-live-grounding-check.ts "your research question"
 *
 * Everything in ATL-06A and ATL-06B is proven against recorded fixtures, which is the right way to
 * prove refusal behaviour: a live search cannot be made to return a stale source on demand. What
 * fixtures cannot prove is that the real service accepts the request this estate sends and returns
 * the shape this estate parses. That is what this script is for, and it is deliberately a script
 * rather than a test — a check that needs a credential and spends quota does not belong in a suite
 * that has to run on every change.
 *
 * It runs in two stages, and the first needs no credential:
 *
 *   1. CONTRACT — posts to the real endpoint with a deliberately invalid key and confirms that
 *      Google's own schema validator accepts `tools: [{ googleSearch: {} }]` and the structured
 *      `responseSchema`, rejecting only the credential. A request shaped wrongly fails here with a
 *      field error instead, which is exactly how the legacy `googleSearchRetrieval` form would be
 *      caught.
 *   2. ROUND TRIP — with a real key, performs a grounded retrieval and prints the admission ledger:
 *      what was retrieved, what survived, what was rejected and why, how much ungrounded model prose
 *      was discarded, and what interpretation verification accepted or refused.
 *
 * Nothing here prints, logs or stores the credential.
 */

import { createGoogleSearchGroundingProvider } from '../lib/atlas/grounding/providers/google-search-grounding';
import { registerGroundingProvider, clearGroundingProviders } from '../lib/atlas/grounding/provider';
import { registerInterpretationProvider, clearInterpretationProviders } from '../lib/atlas/interpretation/provider';
import { createGeminiInterpretationProvider } from '../lib/atlas/interpretation/gemini-interpreter';
import { ask } from '../lib/atlas/ai/gateway';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

async function probe(label: string, body: unknown, expectAccepted = true): Promise<void> {
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': 'contract-probe-not-a-key' },
      body: JSON.stringify(body)
    });
    const payload: any = await response.json();
    const message = payload?.error?.message ?? '(no message)';
    const shapeAccepted = /API key not valid/i.test(message);
    const ok = shapeAccepted === expectAccepted;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}`);
    console.log(`        HTTP ${response.status} :: ${message.slice(0, 140)}`);
  } catch (e: unknown) {
    console.log(`  FAIL  ${label} — ${e instanceof Error ? e.message : 'request failed'}`);
  }
}

async function main() {
  const question = process.argv[2] ?? 'how does CogniX compare to the market on promotion monitoring';

  console.log('\n=== Stage 1 — request contract against the live service (no credential needed) ===\n');
  await probe('grounding tool `googleSearch` is a recognised field', {
    contents: [{ role: 'user', parts: [{ text: 'probe' }] }],
    tools: [{ googleSearch: {} }]
  });
  await probe('structured output `responseSchema` is a recognised field', {
    contents: [{ role: 'user', parts: [{ text: 'probe' }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: { statements: { type: 'ARRAY', items: { type: 'STRING' } } },
        required: ['statements']
      }
    }
  });
  // The control. If this ALSO reports the key error, the validator is not checking field names and
  // stage 1 proves nothing — so the negative case is run rather than assumed.
  console.log('  control (an unknown tool name must fail differently):');
  await probe('  …`notARealTool` is rejected as an unknown field, not on the credential', {
    contents: [{ role: 'user', parts: [{ text: 'probe' }] }],
    tools: [{ notARealTool: {} }]
  }, false);

  if (!process.env.GEMINI_API_KEY) {
    console.log('\n=== Stage 2 — skipped ===\n');
    console.log('  GEMINI_API_KEY is not set, so no live round trip was attempted.');
    console.log('  Re-run as:  GEMINI_API_KEY=... npx tsx scripts/atlas-live-grounding-check.ts "question"\n');
    return;
  }

  console.log('\n=== Stage 2 — live grounded round trip ===\n');
  clearGroundingProviders();
  clearInterpretationProviders();
  registerGroundingProvider(createGoogleSearchGroundingProvider());
  registerInterpretationProvider(createGeminiInterpretationProvider());

  const answer = await ask({ question, research: true });
  const g = answer.grounding;

  console.log(`  question       : ${question}`);
  console.log(`  outcome        : ${answer.outcome}`);
  console.log(`  intent         : ${g.decision.intent}`);
  console.log(`  provider       : ${g.provider ?? '(none)'}  model: ${g.search_transparency?.provider_model ?? '(n/a)'}`);
  console.log(`  queries run    : ${(g.search_transparency?.queries ?? []).join(' | ') || '(none reported)'}`);
  console.log(`  discarded      : ${g.search_transparency?.discarded_ungrounded_segments ?? 0} ungrounded model sentence(s)`);
  console.log(`  unresolved     : ${g.search_transparency?.unresolved_sources ?? 0} source(s)`);

  console.log(`\n  ADMITTED (${g.market_context.statements.length}):`);
  for (const s of g.market_context.statements) {
    console.log(`   - ${s.claim}`);
    console.log(`     ${s.source.publisher} · ${s.source.tier} · published ${s.source.published_at} · ${s.freshness.verdict}`);
    console.log(`     ${s.source.url}`);
  }

  console.log(`\n  REJECTED (${g.rejected_claims.length}):`);
  for (const r of g.rejected_claims) {
    console.log(`   - [${r.reason}] ${r.claim.slice(0, 110)}`);
  }

  const audit = g.interpretation_audit;
  console.log(`\n  INTERPRETATION: proposed ${audit?.proposed ?? 0}, verified ${audit?.verified ?? 0}, dropped ${audit?.dropped.length ?? 0}`);
  for (const s of g.ai_interpretation.statements) {
    console.log(`   - (${s.origin ?? 'templated'}) ${s.text}`);
  }
  for (const d of audit?.dropped ?? []) {
    console.log(`   x [${d.reason}] ${d.text.slice(0, 110)}`);
  }
  console.log(`\n  contradictions : ${g.contradictions.length}`);
  console.log('');
}

main().catch(e => { console.error('Live check failed:', e instanceof Error ? e.message : e); process.exit(1); });
