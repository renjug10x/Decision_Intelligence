/**
 * Ask CogniX — grounded answer assembly (ATL-05).
 *
 * Every sentence that asserts a CogniX capability fact is QUOTED FROM a governed record and
 * carries a citation to it. Nothing here generates prose about what CogniX does; the assembler
 * selects and arranges governed text, which is why the answer is safe with no provider configured.
 *
 * Three behaviours matter more than the happy path:
 *
 *   1. AMBIGUITY IS ANSWERED, NOT RESOLVED ARBITRARILY. Where several capabilities are plausible
 *      readings of one question, the answer presents the interpretations side by side with their
 *      evidence rather than picking a winner. "Why did the decision change" has at least three
 *      legitimate readings in this estate and the answer says so.
 *
 *   2. A GAP IS STATED. If the corpus does not support an answer, the answer says what is missing
 *      and offers the nearest governed capabilities. It never fills the gap.
 *
 *   3. EXTERNAL KNOWLEDGE IS REFUSED, NOT APPROXIMATED. Where a question needs current market or
 *      competitor knowledge, the answer states that the internal Atlas cannot substantiate that
 *      portion and names the phase that owns it. No external claim is made.
 */

import type {
  CapabilityIdentity, ResolvedCapability, CuriosityQuestion, DemoMaturity,
  ImplementationStatus, LifecycleState
} from '../../../packages/contracts/src/capability-atlas-model';
import type { RetrievalResult } from './retrieval';

export interface Citation {
  /** `CAP-*`, or a governed evidence reference such as a test runner or report path. */
  ref: string;
  kind: 'capability' | 'evidence' | 'implementation' | 'limitation' | 'question' | 'demo';
  label: string;
}

export interface AnswerSection {
  heading: string;
  text: string;
  citations: Citation[];
  /** Maturity truth travels with the claim, never only on the page (ADR-047). */
  maturity?: {
    capability_id: string;
    lifecycle_state: LifecycleState | null;
    demo_maturity: DemoMaturity | null;
    implementation_status: ImplementationStatus;
  };
}

export interface Interpretation {
  reading: string;
  capability_id: string;
  capability_name: string;
  why_this_reading: string;
  citations: Citation[];
  maturity: {
    lifecycle_state: LifecycleState | null;
    demo_maturity: DemoMaturity | null;
    implementation_status: ImplementationStatus;
  };
}

export interface AskAnswer {
  question: string;
  /** `answered` · `ambiguous` · `partial` · `gap` */
  outcome: 'answered' | 'ambiguous' | 'partial' | 'gap';
  /** One-line framing. Never a claim about a capability; claims live in cited sections. */
  framing: string;
  sections: AnswerSection[];
  /** Populated when several governed readings are defensible. */
  interpretations: Interpretation[];
  questionsWorthAsking: { question_id: string; question: string; capability_refs: string[] }[];
  /** Stated when the question needs knowledge the internal Atlas cannot hold. */
  externalKnowledgeNotice: string | null;
  gapNotice: string | null;
  degradationNotice: string | null;
  retrievalLevel: 'structured' | 'semantic';
  citations: Citation[];
}

/** A retrieval score gap below this means the leading readings are not separable. */
export const AMBIGUITY_SEPARATION_RATIO = 1.35;
/** Fewer than this many points and nothing is confidently retrieved. */
export const MINIMUM_CONFIDENT_SCORE = 12;

/**
 * Field groups that can GROUND an assertion, as opposed to merely supporting one.
 *
 * A capability whose only match is a word buried in an architecture narrative has not been
 * identified as the subject of the question — it has been brushed against. Requiring at least one
 * discriminating match is what stops "zzz nothing at all" from producing four confident readings
 * out of incidental prose collisions.
 */
export const DISCRIMINATING_FIELDS = new Set([
  'identifier', 'name', 'capability_id', 'summary', 'business_problems', 'tags', 'use_cases'
]);

export function isGrounded(matchedFields: string[]): boolean {
  return matchedFields.some(f => DISCRIMINATING_FIELDS.has(f));
}

function cap(c: ResolvedCapability): Citation {
  return { ref: c.identity.capability_id, kind: 'capability', label: c.identity.name };
}

function maturityOf(c: ResolvedCapability) {
  return {
    lifecycle_state: c.identity.lifecycle_state,
    demo_maturity: c.demo_maturity,
    implementation_status: c.identity.implementation_status
  };
}

/** Builds the section that answers "what is this and does it actually work". */
function capabilitySection(c: ResolvedCapability): AnswerSection {
  const citations: Citation[] = [cap(c)];
  // Summary and description overlap heavily on most records — the description is the fuller
  // statement, so concatenating both reads as a stutter. Prefer one governed statement.
  const parts: string[] = [c.knowledge?.description || c.identity.summary];

  const notReal = c.identity.implementation_status !== 'implemented';
  if (notReal && c.knowledge?.known_limitations.length) {
    const first = c.knowledge.known_limitations[0];
    parts.push(`Recorded limitation: ${first.limitation}`);
    citations.push({ ref: c.identity.capability_id, kind: 'limitation', label: `${c.identity.name} — known limitations` });
  }
  if (c.knowledge?.validation_evidence.length) {
    const ev = c.knowledge.validation_evidence[0];
    citations.push({ ref: ev.ref, kind: 'evidence', label: `${ev.kind}: ${ev.outcome}` });
  }
  if (c.knowledge?.implementation_references.length) {
    const ref = c.knowledge.implementation_references[0];
    citations.push({ ref: ref.path, kind: 'implementation', label: ref.note ?? ref.path });
  }

  return {
    heading: c.identity.name,
    text: parts.join(' '),
    citations,
    maturity: { capability_id: c.identity.capability_id, ...maturityOf(c) }
  };
}

export interface AssembleInput {
  question: string;
  retrieval: RetrievalResult;
  resolved: ResolvedCapability[];
  degradationNotice: string | null;
}

export function assembleAnswer(input: AssembleInput): AskAnswer {
  const { question, retrieval, resolved, degradationNotice } = input;

  const externalKnowledgeNotice = retrieval.requiresExternalKnowledge
    ? `The internal Atlas cannot substantiate the ${retrieval.externalTopics.join(' and ')} part of this question. CogniX-owned records describe what CogniX does; they hold no external market or competitor evidence. External retrieval and grounding are delivered by ATL-06B and require a grounding provider configured on the server.`
    : null;

  const questionsWorthAsking = retrieval.questions.map(q => ({
    question_id: q.question_id,
    question: q.question,
    capability_refs: q.related_capabilities.map(r => r.ref)
  }));

  // Nothing retrieved with confidence — state the gap rather than filling it.
  const top = retrieval.capabilities[0];
  if (!top || top.score < MINIMUM_CONFIDENT_SCORE || !isGrounded(top.matched_fields)) {
    const nearest = retrieval.capabilities.slice(0, 3).map(c => c.name);
    return {
      question,
      outcome: 'gap',
      framing: 'The governed corpus does not confidently answer this question.',
      sections: [],
      interpretations: [],
      questionsWorthAsking,
      externalKnowledgeNotice,
      gapNotice: nearest.length
        ? `No capability record clearly addresses this. The nearest governed capabilities are ${nearest.join(', ')}. Nothing has been inferred beyond what the records state.`
        : 'No capability record addresses this question, and nothing has been inferred.',
      degradationNotice,
      retrievalLevel: retrieval.level,
      citations: []
    };
  }

  // Ambiguity: several leading readings that the scores do not separate.
  const contenders = retrieval.capabilities
    .filter(c => c.score >= MINIMUM_CONFIDENT_SCORE)
    .filter(c => isGrounded(c.matched_fields))
    .filter(c => top.score / Math.max(c.score, 1) < AMBIGUITY_SEPARATION_RATIO)
    .slice(0, 4);

  const byId = new Map(resolved.map(r => [r.identity.capability_id, r]));
  const isAmbiguous = contenders.length >= 2;

  if (isAmbiguous) {
    const interpretations: Interpretation[] = contenders
      .map(c => byId.get(c.capability_id))
      .filter((c): c is ResolvedCapability => Boolean(c))
      .map(c => {
        const fields = retrieval.capabilities.find(r => r.capability_id === c.identity.capability_id)?.matched_fields ?? [];
        // Differentiate the readings by what each capability is FOR, not only by how it was
        // retrieved — four identical "retrieved on name, summary" lines explain nothing.
        const problems = c.identity.business_problems
          .map(b => b.replace(/^bp-/, '').replace(/-/g, ' '))
          .join(', ');
        const how = fields.length
          ? `matched on ${fields.slice(0, 2).map(f => f.replace(/_/g, ' ')).join(' and ')}`
          : 'retrieved from governed capability knowledge';
        return {
          reading: c.identity.summary,
          capability_id: c.identity.capability_id,
          capability_name: c.identity.name,
          why_this_reading: problems
            ? `Reads the question as being about ${problems}; ${how}.`
            : `Reads the question through this capability; ${how}.`,
          citations: [cap(c)],
          maturity: maturityOf(c)
        };
      });

    return {
      question,
      outcome: 'ambiguous',
      framing: `This question has ${interpretations.length} defensible readings in the governed corpus. Rather than choosing one, here is each reading with the capability that answers it.`,
      sections: interpretations
        .map(i => byId.get(i.capability_id))
        .filter((c): c is ResolvedCapability => Boolean(c))
        .map(capabilitySection),
      interpretations,
      questionsWorthAsking,
      externalKnowledgeNotice,
      gapNotice: null,
      degradationNotice,
      retrievalLevel: retrieval.level,
      citations: interpretations.flatMap(i => i.citations)
    };
  }

  // A single clear reading.
  const leading = byId.get(top.capability_id);
  const supporting = retrieval.capabilities.slice(1, 3)
    .map(c => byId.get(c.capability_id))
    .filter((c): c is ResolvedCapability => Boolean(c));

  const sections = leading
    ? [capabilitySection(leading), ...supporting.map(capabilitySection)]
    : [];

  return {
    question,
    outcome: externalKnowledgeNotice ? 'partial' : 'answered',
    framing: leading
      ? `The governed corpus answers this through ${leading.identity.name}.`
      : 'The governed corpus partially answers this question.',
    sections,
    interpretations: [],
    questionsWorthAsking,
    externalKnowledgeNotice,
    gapNotice: null,
    degradationNotice,
    retrievalLevel: retrieval.level,
    citations: sections.flatMap(s => s.citations)
  };
}
