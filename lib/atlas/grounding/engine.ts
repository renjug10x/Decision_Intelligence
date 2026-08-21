/**
 * The grounding engine (ATL-06A) — assembles the three-class envelope (ADR-048).
 *
 * This is the only place the three classes are put together, and it is written so that the
 * dangerous outputs are unreachable rather than merely discouraged:
 *
 *   - The From CogniX block is built ONLY from the answer already assembled by `ATL-05`, which is
 *     itself built only from governed records. No external input can add a statement to it.
 *   - The provider is not consulted at all when policy says internal-only. A well-behaved adapter
 *     and a misbehaving one therefore produce the same result for a CogniX question: nothing.
 *   - Absence is a rendered state. Every block that has no content carries the reason it has none,
 *     so a missing market section can never be mistaken for a market section that found nothing to
 *     worry about.
 *   - An interpretation is emitted only where it rests on a governed statement it cites.
 *
 * `ATL-05` behaviour is preserved exactly. The envelope is ADDITIVE: `assembleAnswer` is unchanged,
 * is called with the same inputs, and its output is returned untouched alongside the envelope. With
 * no grounding provider configured — the state of this estate today — the reader sees precisely what
 * `ATL-05` showed them, plus an explicit statement that market context is unavailable and why.
 */

import {
  EVIDENCE_CLASS_LABEL,
  type ExternalClaim, type FromCogniXStatement, type GroundedEnvelope,
  type GroundingRefusal, type MarketContextStatement, type RejectedClaim,
  type AIInterpretationStatement, type GroundingSearchTransparency
} from '../../../packages/contracts/src/atlas-grounding-model';
import type { ResolvedCapability } from '../../../packages/contracts/src/capability-atlas-model';
import type { AskAnswer } from '../ai/answer';
import { classifyQuestion, GROUNDING_POLICY_VERSION } from './policy';
import { admitClaim } from './provenance';
import { detectContradictions } from './contradiction';
import { activeGroundingProvider } from './provider';

export interface GroundInput {
  question: string;
  answer: AskAnswer;
  resolved: ResolvedCapability[];
  /** Injected so freshness is testable without waiting for a source to age. */
  now?: Date;
  /**
   * ATL-06B. Whether the READER asked for external research on this question.
   *
   * It can only ever make the gate stricter: policy still decides whether external evidence is
   * permissible at all, and this decides whether it was wanted. The default is `true`, meaning
   * "the caller imposes no restriction beyond policy" — which is exactly the ATL-06A contract, and
   * is why `run-atl06a-tests.ts` passes unchanged. The user-facing entry point, `ask()`, requires an
   * explicit opt-in and defaults to `false`; the Atlas never reaches outward on its own (ADR-056).
   */
  researchRequested?: boolean;
}

function fromCogniXStatements(answer: AskAnswer, resolved: ResolvedCapability[]): FromCogniXStatement[] {
  const byId = new Map(resolved.map(r => [r.identity.capability_id, r]));
  const out: FromCogniXStatement[] = [];
  for (const section of answer.sections) {
    const capId = section.maturity?.capability_id;
    if (!capId) continue;
    const cap = byId.get(capId);
    if (!cap) continue;
    out.push({
      text: section.text,
      capability_id: cap.identity.capability_id,
      capability_name: cap.identity.name,
      maturity: {
        lifecycle_state: cap.identity.lifecycle_state,
        demo_maturity: cap.demo_maturity,
        implementation_status: cap.identity.implementation_status
      }
    });
  }
  return out;
}

export async function groundAnswer(input: GroundInput): Promise<GroundedEnvelope> {
  const now = input.now ?? new Date();
  const researchRequested = input.researchRequested !== false;
  const decision = classifyQuestion(input.question);
  const provider = activeGroundingProvider();
  const externalAllowed = decision.external_allowed && researchRequested;

  const fromCogniX = fromCogniXStatements(input.answer, input.resolved);

  // Policy first, provider second. An internal-only question never reaches an adapter, which is
  // what makes AC-ATL-06-7 hold regardless of what an adapter would have volunteered.
  let retrieved: ExternalClaim[] = [];
  let providerFailed = false;
  let transparency: GroundingSearchTransparency | null = null;
  if (externalAllowed && provider) {
    const request = {
      question: input.question,
      topics: decision.topics,
      capability_ids: fromCogniX.map(s => s.capability_id),
      capabilities: fromCogniX.map(s => ({ id: s.capability_id, name: s.capability_name }))
    };
    try {
      // ATL-06B providers account for how they searched. ATL-06A adapters do not, and are still
      // valid: the richer call is preferred where implemented and never required.
      if (provider.retrieveGrounded) {
        const result = await provider.retrieveGrounded(request);
        retrieved = result.claims;
        transparency = result.transparency;
      } else {
        retrieved = await provider.retrieve(request);
      }
    } catch {
      providerFailed = true;
      retrieved = [];
      transparency = null;
    }
  }

  const admitted: ExternalClaim[] = [];
  const rejected: RejectedClaim[] = [];
  const market: MarketContextStatement[] = [];
  for (const claim of retrieved) {
    const result = admitClaim(claim, externalAllowed, now);
    if (!result.admitted || !result.freshness) {
      if (result.rejection) rejected.push(result.rejection);
      continue;
    }
    admitted.push(claim);
    market.push({
      claim: claim.claim,
      source: claim.source,
      freshness: result.freshness,
      relates_to: claim.about_capabilities,
      provider: claim.provider
    });
  }

  const contradictions = detectContradictions(input.resolved, admitted);

  // Interpretation exists only where it rests on a governed statement. In ATL-06A the only such
  // case is a contradiction, whose interpretation is templated from the governed record and cites it.
  // One claim can disagree with several records on the same dimension, and the templated reading is
  // then word-for-word identical. Two identical paragraphs teach a reader nothing the second time,
  // so the statement is emitted once and cites every record it rests on.
  const interpretations: AIInterpretationStatement[] = [];
  for (const c of contradictions) {
    const existing = interpretations.find(i => i.text === c.ai_interpretation);
    if (existing) {
      if (!existing.rests_on.includes(c.cognix_citation)) existing.rests_on.push(c.cognix_citation);
      if (!existing.informed_by.includes(c.market_source.url)) existing.informed_by.push(c.market_source.url);
      continue;
    }
    interpretations.push({
      text: c.ai_interpretation,
      rests_on: [c.cognix_citation],
      informed_by: [c.market_source.url]
    });
  }

  const marketAbsenceReason = market.length > 0
    ? null
    : !decision.external_allowed
      ? `${EVIDENCE_CLASS_LABEL['market-context']} is not shown because this question is answered from governed CogniX records only. ${decision.reason}`
      : !researchRequested
        ? 'External research was not requested for this question, so nothing was looked up. The Atlas does not search outward on its own; ask again with external research enabled to include sourced market context.'
        : providerFailed
        ? 'External grounding was attempted and the provider was unavailable. No market evidence is shown, and none has been substituted from memory.'
        : !provider
          ? 'No external grounding provider is configured on this server, so no market evidence has been retrieved. This section is empty because nothing was looked up, not because nothing exists. External retrieval is delivered by ATL-06B and needs a provider credential present in the server environment.'
          : rejected.length > 0
            ? `External evidence was retrieved and none of it met the source-admission standard. ${rejected.length} claim(s) were dropped rather than shown: ${[...new Set(rejected.map(r => r.reason))].join(', ')}.`
            : 'External grounding returned no evidence for this question.';

  const interpretationAbsenceReason = interpretations.length > 0
    ? null
    : 'No interpretation is offered. An interpretation is only emitted where it rests on a governed CogniX statement it can cite, and nothing in this answer required one.';

  let refusal: GroundingRefusal | null = null;
  if (decision.intent === 'external-required' && !researchRequested) {
    refusal = {
      reason: 'research-not-requested',
      topics: decision.topics,
      message: `This question can only be answered with ${decision.topics.join(' and ')}, which governed CogniX records do not hold. External research is user-initiated and was not requested, so nothing was looked up and nothing has been inferred.`
    };
  } else if (decision.intent === 'external-required' && admitted.length === 0) {
    const reason = !provider
      ? 'no-grounding-provider' as const
      : rejected.length > 0 ? 'all-claims-rejected' as const : 'insufficient-grounding' as const;
    refusal = {
      reason,
      topics: decision.topics,
      message: reason === 'no-grounding-provider'
        ? `This question can only be answered with ${decision.topics.join(' and ')}, which governed CogniX records do not hold and no configured provider can supply. The question is refused rather than answered from an approximation.`
        : reason === 'all-claims-rejected'
          ? `This question can only be answered with ${decision.topics.join(' and ')}. Evidence was retrieved and none of it carried admissible provenance, so the question is refused rather than answered from unsourced material.`
          : `This question can only be answered with ${decision.topics.join(' and ')}, and no admissible evidence was found. The question is refused rather than answered from an approximation.`
    };
  }

  return {
    decision,
    from_cognix: { evidence_class: 'from-cognix', statements: fromCogniX },
    market_context: {
      evidence_class: 'market-context',
      available: market.length > 0,
      absence_reason: marketAbsenceReason,
      statements: market
    },
    ai_interpretation: {
      evidence_class: 'ai-interpretation',
      available: interpretations.length > 0,
      absence_reason: interpretationAbsenceReason,
      statements: interpretations
    },
    contradictions,
    rejected_claims: rejected,
    refusal,
    provider: externalAllowed ? provider?.name ?? null : null,
    policy_version: GROUNDING_POLICY_VERSION,
    search_transparency: transparency
  };
}

/**
 * The ATL-05 answer with the ADR-048 evidence envelope attached.
 *
 * Extension rather than replacement is the point. Every `AskAnswer` field keeps its ATL-05 meaning
 * and its ATL-05 value, so a consumer written against ATL-05 continues to work unchanged and a
 * grounding failure cannot degrade an answer that was already grounded internally.
 */
export interface GroundedAskAnswer extends AskAnswer {
  grounding: GroundedEnvelope;
}
