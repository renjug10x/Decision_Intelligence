/**
 * The client preparation engine (ATL-06D).
 *
 * ── What this file does NOT do ──────────────────────────────────────────────
 * It does not implement a second evidence pipeline. Market context and AI interpretation arrive
 * through `groundAnswer` and `applyInterpretation` — the SAME ATL-06A gate, the SAME ATL-06B
 * provider path, the SAME ATL-06C verification that Ask CogniX uses. There is no code here that can
 * admit a source, relax a freshness rule, or reach a search engine, and that is deliberate: §38
 * forbids weakening admission to make a preparation pack richer, and the most reliable way to
 * honour that is to have no second door to weaken.
 *
 * The consequence is worth stating plainly. A preparation pack's Market Context section will often
 * be EMPTY, carrying a reason. That is correct. Sparse truthful evidence is preferable to fluent
 * unsupported material, and a commercial surface is precisely where that trade is under pressure.
 *
 * ── Degradation (§34) ───────────────────────────────────────────────────────
 * Every layer degrades independently and the pack states which layer went missing:
 *
 *   Gemini unavailable          → recommendations, sequences, questions, warnings all still build.
 *                                 They are deterministic and read only governed records.
 *   External research off/failed→ internal preparation is unaffected; the market block says why.
 *   No relevant capabilities    → state `no-relevant-capabilities`, say so, recommend nothing.
 *   Ambiguous context           → state `needs-clarification`, ask one question.
 *   Contradictory context       → build the pack AND surface the contradiction.
 *   Insufficient demo evidence  → no demonstration sequence, and the reason is named.
 */

import { capabilityRepository } from '../../../services/atlas/src/capability-registry';
import { getCapabilityIndex } from '../capability-index';
import { CURIOSITY_QUESTIONS } from '../../../content/atlas/curiosity-questions';
import { assembleAnswer } from '../ai/answer';
import { retrieve } from '../ai/retrieval';
import { groundAnswer } from '../grounding/engine';
import { ensureGroundingProviderRegistered } from '../grounding/providers/register';
import { applyInterpretation } from '../interpretation/engine';
import { ensureInterpretationProviderRegistered } from '../interpretation/register';
import { orderForLens } from '../lens';

import { readContext, applyChoiceToContext, EMPTY_CONTEXT } from './intake';
import { clarifyPreparation, detectContextContradictions, unknowns, parseChoice, objectiveFromRefinement } from './clarify';
import { recommend } from './recommend';
import { buildSequences } from './sequence';
import { selectQuestions, anticipateQuestions, vendorPositioning } from './questions';
import { collectWarnings, avoidClaiming, dedupeWarnings } from './integrity';

import {
  PREPARATION_VERSION, validatePack,
  type ClientContext, type ClientProblemInterpretation, type PreparationPack, type PreparationRequest
} from '../../../packages/contracts/src/atlas-preparation-model';
import type { CapabilityId, ResolvedCapability, AudienceLens } from '../../../packages/contracts/src/capability-atlas-model';
import { businessProblemLabel, getBusinessProblem } from '../../../content/atlas/business-problems';
import { getDomainById } from '../../../config/domains';

/**
 * Build the "what CogniX understands the client's challenge to be" section (§10).
 *
 * `supplied` and `inferred` are separate arrays and never concatenated into prose. The user must be
 * able to look at the inferred column and disagree with it — which they cannot do if the two have
 * been run together into a fluent paragraph that reads as though CogniX knows the client.
 */
function interpretProblem(context: ClientContext): ClientProblemInterpretation {
  const supplied: string[] = [];
  if (context.brief.trim()) supplied.push(context.brief.trim());

  const inferredOut: { statement: string; because: string }[] = [];

  for (const p of context.business_problems) {
    const problem = getBusinessProblem(p.value);
    if (!problem) continue;
    inferredOut.push({
      statement: `Their situation involves ${problem.label.toLowerCase()} — “${problem.question}”`,
      because: p.source === 'inferred' && p.evidence
        ? `read from “${p.evidence}” in what you wrote`
        : 'you selected this'
    });
  }

  if (context.domain) {
    const name = getDomainById(context.domain.value)?.name ?? context.domain.value.replace(/_/g, ' ');
    inferredOut.push({
      statement: `The conversation sits in ${name}.`,
      because: context.domain.source === 'inferred' && context.domain.evidence
        ? `read from “${context.domain.evidence}”`
        : 'you selected this'
    });
  }

  if (context.orientation) {
    const o = context.orientation.value;
    inferredOut.push({
      statement: o === 'technical'
        ? 'The room will reason about how it works before whether it is worth doing.'
        : o === 'executive'
          ? 'The room will reason about whether it is worth doing before how it works.'
          : 'The room sits between the commercial and the operational — they will want both the outcome and the mechanism.',
      because: context.orientation.evidence
        ? `read from the role “${context.client_role?.value ?? context.orientation.evidence}”`
        : 'you selected this'
    });
  }

  return {
    supplied,
    inferred: inferredOut,
    contradictions: detectContextContradictions(context),
    unknowns: unknowns(context)
  };
}

/** Follow-up suggestions, chosen by objective. Never a generic "book a follow-up". */
function followUps(context: ClientContext, hasTechnical: boolean, hasDemo: boolean): { suggestion: string; because: string }[] {
  const out: { suggestion: string; because: string }[] = [];
  const objective = context.objective?.value;

  if (objective === 'understand-challenges') {
    out.push({
      suggestion: 'Come back with a demonstration built around the one problem they name most concretely.',
      because: 'Discovery earns the right to demonstrate; demonstrating first spends attention on a problem they may not have.'
    });
  }
  if (objective === 'demonstrate' && hasTechnical) {
    out.push({
      suggestion: 'Offer an architecture session for whoever owns their planning platform.',
      because: 'A demonstration that lands produces an integration question, and the recommended capabilities publish contracts that can answer it.'
    });
  }
  if (objective === 'architecture') {
    out.push({
      suggestion: 'Send the published contracts and API surfaces for the capabilities discussed.',
      because: 'An architect evaluates after the meeting, against artefacts. The estate has them; leaving without sending them wastes the session.'
    });
  }
  if (objective === 'executive-innovation') {
    out.push({
      suggestion: 'Propose a narrow, evidenced pilot on one decision rather than a platform evaluation.',
      because: 'The recommended capabilities carry governed maturity states, and a scoped pilot is what those states actually support.'
    });
  }
  if (objective === 'pilot') {
    out.push({
      suggestion: 'Agree what evidence would count as success before agreeing scope.',
      because: 'The estate records validation evidence per capability; a pilot without an agreed success test cannot be validated against it.'
    });
  }
  if (!out.length) {
    out.push({
      suggestion: hasDemo
        ? 'Offer a demonstration of the lead capability against a problem they raised in this meeting.'
        : 'Ask which of the problems discussed they would want evidenced first.',
      because: 'No meeting objective was stated, so the follow-up is derived from what the pack could actually support.'
    });
  }
  return out;
}

export interface PrepareResult {
  pack: PreparationPack;
  /** Rule violations. Non-empty means the pack failed its own integrity rules and must not render. */
  violations: ReturnType<typeof validatePack>;
}

/**
 * Assemble a preparation pack.
 *
 * Deterministic except for the market-context and interpretation classes, which are the only parts
 * that consult a provider — and only when the reader asked for research AND ATL-06A policy permits
 * it for this question (§18: the toggle permits, it does not compel).
 */
export async function prepare(request: PreparationRequest): Promise<PrepareResult> {
  const lens: AudienceLens | null = request.lens ?? null;

  // ── 1. Context ────────────────────────────────────────────────────────────
  let context: ClientContext = { ...EMPTY_CONTEXT, ...request.context } as ClientContext;
  for (const raw of request.choices ?? []) {
    const { dimension, value } = parseChoice(raw);
    context = applyChoiceToContext(context, dimension, value);
  }
  if (request.brief?.trim()) context = readContext(request.brief, context);
  if (request.refinement?.trim()) {
    // A refinement REFINES: it is read as a brief, merged over the existing context, and recorded.
    // Nothing is discarded, which is what §31 requires — "focus on promotions" must not erase the
    // client, the role or the duration already established.
    context = readContext(request.refinement, context);
    context = { ...context, refinements: [...context.refinements, request.refinement.trim()] };
    const objective = objectiveFromRefinement(request.refinement);
    if (objective && context.objective?.source !== 'chosen') {
      context = { ...context, objective: { value: objective, source: 'inferred', evidence: request.refinement.trim() } };
    }
  }

  const step = (request.choices?.length ?? 0) + (request.refinement ? 1 : 0);
  const question = clarifyPreparation(context, step);

  // ── 2. The governed estate ────────────────────────────────────────────────
  const identities = capabilityRepository.listIdentities();
  const index = await getCapabilityIndex(identities);
  const resolvedList: ResolvedCapability[] = [];
  for (const identity of identities) {
    const r = await capabilityRepository.resolve(identity.capability_id, { includeKnowledge: true, lens: lens ?? undefined });
    if (r) resolvedList.push(r);
  }
  const resolvedMap = new Map<CapabilityId, ResolvedCapability>(
    resolvedList.map(r => [r.identity.capability_id, r])
  );

  const interpretation = interpretProblem(context);

  // ── 3. Clarification short-circuit ────────────────────────────────────────
  // A question is returned WITH whatever the Atlas already understands, not instead of it. The
  // reader sees what was read from their brief while they answer, which is what makes the question
  // feel like a conversation rather than a form gate (§8).
  if (question) {
    const empty = await emptyEnvelope(context.brief || request.brief || '');
    return {
      pack: {
        state: 'needs-clarification',
        context, lens, clarification: question,
        interpretation,
        recommendations: [], sequences: [], questions_to_ask: [], likely_client_questions: [],
        demo_warnings: [], avoid_claiming: [],
        follow_up: [],
        envelope: empty,
        preparation_version: PREPARATION_VERSION
      },
      violations: []
    };
  }

  // ── 4. Recommendation ─────────────────────────────────────────────────────
  const { recommendations, field_is_flat } = recommend({
    context, lens,
    // Ordering by lens first means an otherwise-equal pair breaks toward what this reader needs.
    resolved: orderForLens(resolvedList, lens),
    searchContext: { resolveDemoMaturity: c => capabilityRepository.resolveDemoMaturity(c) },
    index
  });

  if (recommendations.length === 0) {
    const empty = await emptyEnvelope(context.brief);
    return {
      pack: {
        state: 'no-relevant-capabilities',
        context, lens, clarification: null,
        interpretation: {
          ...interpretation,
          inferred: [
            ...interpretation.inferred,
            {
              statement: 'No registered CogniX capability connects to this conversation through a governed business problem, domain, objective or matched term.',
              because: 'Nothing was recommended rather than something being recommended on a keyword collision.'
            }
          ]
        },
        recommendations: [], sequences: [], questions_to_ask: [], likely_client_questions: [],
        demo_warnings: [], avoid_claiming: [],
        follow_up: [{
          suggestion: 'Describe the client’s problem in their own words and try again, or explore the Atlas directly.',
          because: 'The estate covers demand, campaign, signals, decisions, learning, evidence and discovery; this brief reached none of them.'
        }],
        envelope: empty,
        preparation_version: PREPARATION_VERSION
      },
      violations: []
    };
  }

  // ── 5. Sequencing, questions, integrity ───────────────────────────────────
  const { sequences, notice: sequenceNotice } = buildSequences({ recommendations, resolved: resolvedMap, context });

  const questionInput = { recommendations, resolved: resolvedMap, questions: CURIOSITY_QUESTIONS, context };
  const questionsToAsk = selectQuestions(questionInput);
  const anticipated = anticipateQuestions(questionInput);

  const integrityInput = { recommendations, resolved: resolvedMap };
  const warnings = dedupeWarnings(collectWarnings(integrityInput));
  const avoid = avoidClaiming(integrityInput);

  // ── 6. Evidence classes, through the existing gate and no other door ──────
  const envelope = await buildEnvelope({
    question: context.brief,
    resolved: recommendations
      .map(r => resolvedMap.get(r.capability_id))
      .filter((r): r is ResolvedCapability => Boolean(r)),
    research: request.research === true
  });

  const marketAdmitted = envelope.market_context.available && envelope.market_context.statements.length > 0;
  const positioning = vendorPositioning(context.vendors_mentioned, recommendations, marketAdmitted);

  const hasTechnical = recommendations.some(r => {
    const c = resolvedMap.get(r.capability_id);
    return (c?.knowledge?.contracts.length ?? 0) > 0 || (c?.knowledge?.apis.length ?? 0) > 0;
  });

  const pack: PreparationPack = {
    state: 'prepared',
    context, lens, clarification: null,
    interpretation: {
      ...interpretation,
      inferred: [
        ...interpretation.inferred,
        ...(field_is_flat ? [{
          statement: 'Several capabilities are close in relevance here, so the lead set is wider than usual.',
          because: 'Cutting to a confident top three would have implied a separation the evidence does not support.'
        }] : []),
        ...(sequenceNotice ? [{ statement: sequenceNotice, because: 'derived from what the recommended capabilities can actually support' }] : [])
      ]
    },
    recommendations,
    sequences,
    questions_to_ask: questionsToAsk,
    likely_client_questions: [...positioning, ...anticipated],
    demo_warnings: warnings,
    avoid_claiming: avoid,
    follow_up: followUps(context, hasTechnical, sequences.some(s => s.kind === 'demonstration')),
    envelope,
    preparation_version: PREPARATION_VERSION
  };

  return { pack, violations: validatePack(pack) };
}

/**
 * The three evidence classes, assembled by the engine Ask CogniX uses.
 *
 * `assembleAnswer` is called with a real retrieval so the From CogniX block carries governed
 * statements with their maturity attached. Everything external goes through `groundAnswer`, which
 * consults policy BEFORE a provider and therefore refuses on its own for an internal question even
 * when research is on (§18).
 */
async function buildEnvelope(input: { question: string; resolved: ResolvedCapability[]; research: boolean }) {
  const identities = capabilityRepository.listIdentities();
  const index = await getCapabilityIndex(identities);
  const retrieval = retrieve(input.question, {
    identities, index,
    questions: CURIOSITY_QUESTIONS,
    resolveDemoMaturity: c => capabilityRepository.resolveDemoMaturity(c)
  });
  const answer = assembleAnswer({ question: input.question, retrieval, resolved: input.resolved, degradationNotice: null });

  ensureGroundingProviderRegistered();
  ensureInterpretationProviderRegistered();

  const grounded = await groundAnswer({
    question: input.question,
    answer,
    resolved: input.resolved,
    researchRequested: input.research
  });
  return applyInterpretation({ question: input.question, envelope: grounded });
}

/** The envelope for a pack that has no recommendations yet. Still a real, gated envelope. */
async function emptyEnvelope(question: string) {
  return buildEnvelope({ question, resolved: [], research: false });
}
