/**
 * Progressive clarification for client preparation (ATL-06D §8, §28, §34).
 *
 * ── The bar for asking, and why it is set this low ─────────────────────────
 * §8 is unambiguous: *"Ask the minimum number of questions necessary. Do not turn preparation into
 * a questionnaire."* A first version of this file required an explicit OBJECTIVE before it would
 * build anything, and running the §39 scenarios showed how wrong that is — Scenario 1 supplies a
 * role, a domain, a duration and a stated problem, and was still interrogated about its objective.
 * A brief that rich being met with a question is precisely the §28 failure.
 *
 * So the bar is now: ASK ONLY WHEN THE ATLAS KNOWS NOTHING IT COULD SELECT ON. Concretely, a
 * question is returned only when the brief yields no client role, no objective, no business
 * problem and no named vendor. A domain alone does not clear it, which is what keeps Scenario 4
 * ("Prepare me for a retail client meeting") clarifying while every other scenario builds.
 *
 * Everything else — a missing duration, a missing objective on an otherwise clear brief — is a
 * REFINEMENT the reader may offer, surfaced through `unknowns()` as something that would improve
 * the pack rather than as a gate in front of it. A pack that says what it does not know is more
 * useful than a form that refuses to start.
 *
 * This mirrors `lib/atlas/clarification.ts` rather than reimplementing it: same
 * `ClarificationQuestion` shape, same "prepared responses are shortcuts, not restrictions" rule,
 * same free-text escape on every question. A reader who wants to type instead of click always can.
 */

import type { ClarificationQuestion, ClarificationChoice } from '../../../packages/contracts/src/capability-atlas-model';
import {
  MEETING_OBJECTIVES, MEETING_OBJECTIVE_LABEL,
  type ClientContext, type MeetingObjective
} from '../../../packages/contracts/src/atlas-preparation-model';
import { DOMAIN_CATALOGUE } from '../../../config/domains';

/** Preparation never asks more than this before producing a pack. Matches MAX_CLARIFICATION_STEPS. */
export const MAX_PREPARATION_STEPS = 2;

function choice(id: string, label: string, value: string): ClarificationChoice {
  // `selects` is empty because a preparation clarification narrows CONTEXT, not a capability set.
  // The ATL-04R rule that a choice may never widen a result set is preserved by construction:
  // there is no result set here to widen.
  return { choice_id: id, label, dimension: 'depth', value, selects: [] };
}

/**
 * What the Atlas would most benefit from knowing next, or `null` when it has enough.
 *
 * Returns at most one question. Two questions in a row is the questionnaire §8 forbids; the second
 * step exists only for the case where the first answer leaves the pack still unselectable.
 */
export function clarifyPreparation(context: ClientContext, step: number): ClarificationQuestion | null {
  if (step >= MAX_PREPARATION_STEPS) return null;

  const hasWho = context.client_role !== null;
  const hasObjective = context.objective !== null;
  const hasProblem = context.business_problems.length > 0;
  const hasVendor = context.vendors_mentioned.length > 0;

  // The only blocking case: nothing to select capabilities on. A domain by itself does not clear
  // this — "a retail client meeting" names an industry and no conversation (§39 Scenario 4).
  if (!hasWho && !hasObjective && !hasProblem && !hasVendor) {
    return {
      dimension: 'depth',
      question: 'Who are you meeting, and what do you want from the conversation?',
      multi_select: false,
      choices: MEETING_OBJECTIVES.filter(o => o !== 'other').map(o =>
        choice(`obj-${o}`, MEETING_OBJECTIVE_LABEL[o], `objective:${o}`)
      )
    };
  }

  // A second step exists only for a brief that answered the first question and STILL names no
  // subject — a role and an objective with nothing the client is trying to fix.
  if (step > 0 && !hasProblem && !context.domain) {
    return {
      dimension: 'depth',
      question: 'What is the client’s situation about?',
      multi_select: false,
      choices: topDomains().map(d => choice(`dom-${d.id}`, d.name, `domain:${d.id}`))
    };
  }

  return null;
}

/** The domains that actually carry registered capabilities, plus the nearest adjacent ones. */
function topDomains(): { id: string; name: string }[] {
  const preferred = ['retail_grocery', 'digital_commerce', 'cpg', 'logistics_distribution'];
  const all = DOMAIN_CATALOGUE.flatMap(c => c.items);
  return preferred
    .flatMap(id => {
      const item = all.find(i => i.id === id);
      return item ? [{ id: item.id, name: item.name }] : [];
    });
}

/**
 * Split a choice value of the form `dimension:value`.
 *
 * Free text arrives with no colon and is returned as a refinement, which is what keeps every
 * clarification a shortcut rather than a restriction.
 */
export function parseChoice(raw: string): { dimension: string; value: string } {
  const at = raw.indexOf(':');
  if (at < 0) return { dimension: 'refinement', value: raw };
  return { dimension: raw.slice(0, at), value: raw.slice(at + 1) };
}

/**
 * Contradictions in what the user has told us (§34).
 *
 * SURFACED, never resolved silently. "I have 10 minutes" alongside "I want a full architecture deep
 * dive" is a real tension the user needs to see; picking one and building on it would produce a pack
 * that quietly ignores half the brief.
 */
export function detectContextContradictions(context: ClientContext): { statement: string; conflicts_with: string }[] {
  const out: { statement: string; conflicts_with: string }[] = [];
  const mins = context.duration_mins?.value ?? null;
  const objective = context.objective?.value ?? null;
  const orientation = context.orientation?.value ?? null;

  if (mins !== null && mins <= 15 && (objective === 'architecture' || objective === 'pilot')) {
    out.push({
      statement: `${mins} minutes`,
      conflicts_with: objective === 'architecture'
        ? 'an architecture and integration discussion, which does not fit in that time without cutting it to one integration point'
        : 'scoping a pilot, which needs more time than this to reach anything actionable'
    });
  }

  if (orientation === 'technical' && objective === 'executive-innovation') {
    out.push({
      statement: `a technical audience (${context.client_role?.value ?? 'technical role'})`,
      conflicts_with: 'an executive innovation objective — the pack can lead with either, but the two want different first ten minutes'
    });
  }

  if (orientation === 'executive' && objective === 'architecture') {
    out.push({
      statement: `an executive audience (${context.client_role?.value ?? 'executive role'})`,
      conflicts_with: 'an architecture objective — worth confirming whether an architect will actually be in the room'
    });
  }

  return out;
}

/**
 * What would most improve the pack if supplied. Never blocks, and never invented.
 *
 * These become the "you could tell me more about…" affordances. They are honest statements of what
 * the Atlas does not know, which is the opposite of the pattern where a tool silently assumes a
 * default and presents the result as though it were informed.
 */
export function unknowns(context: ClientContext): string[] {
  const out: string[] = [];
  if (!context.duration_mins) out.push('How long the meeting is — the sequence adapts to it, and without one the pack uses each capability’s own governed demo duration.');
  if (!context.client_role) out.push('Who you are meeting — the role changes which questions are worth asking and how technical the pack should be.');
  if (!context.business_problems.length) out.push('What the client has actually said is going wrong — a stated business problem is the strongest signal for selecting capabilities.');
  if (!context.domain) out.push('The client’s industry — it decides whether a capability is being shown in its home domain or as assessed reuse.');
  return out;
}

/** Objective read from a free-text refinement, so "make this about integration" moves the pack. */
export function objectiveFromRefinement(text: string): MeetingObjective | null {
  const lower = text.toLowerCase();
  if (/\barchitect|integrat|technical\b/.test(lower)) return 'architecture';
  if (/\bdemo|demonstrat|show\b/.test(lower)) return 'demonstrate';
  if (/\bpilot|proof of concept|poc\b/.test(lower)) return 'pilot';
  if (/\binnovat|strateg|different\b/.test(lower)) return 'executive-innovation';
  if (/\bdiscover|challeng|listen\b/.test(lower)) return 'understand-challenges';
  return null;
}
