/**
 * The Atlas audience lens, made material (ATL-06D, ADR-064).
 *
 * ── The residual this file exists to correct ────────────────────────────────
 * `ATL-04R` shipped the lens as a reordering of the disclosure sections plus a note reading
 * *"Ordering only — nothing is hidden, and the facts do not change."* Owner evaluation of the live
 * interface found the honest consequence of that design:
 *
 *   > Selecting Sales, Architect or Developer visibly changes the selected lens, but the overall
 *   > Atlas experience does not change materially enough from the default Innovation Executive
 *   > presentation.
 *
 * That is correct and it is a defect, recorded as `D-ATL-04R-1`. A reader who selects *Developer*
 * and meets the same four executive questions, the same opened section and the same ordering of
 * capabilities has been given a control that does nothing they can use.
 *
 * ── What changes, and what may never change ─────────────────────────────────
 * `ADR-045` says a lens REORDERS AND NEVER HIDES, and that constraint survives here unamended.
 * Everything this module produces is a READING of fields that are already on the governed record:
 *
 *   CHANGES   the four questions answered above the fold · which sections lead · which section is
 *             open on arrival · how deep evidence is exposed · the order capabilities are offered
 *             in · which questions are suggested · what an `ATL-06D` preparation pack leads with.
 *
 *   NEVER     the capability's identity, summary, lifecycle state, demonstration maturity,
 *   CHANGES   implementation status, limitations, evidence, architecture facts, or the presence of
 *             any section. Every section remains present and reachable under every lens, and
 *             `run-atl06d-tests.ts` §B asserts that field-by-field across the whole registry rather
 *             than trusting this comment.
 *
 * The distinction the whole design rests on: **a user does not become a persona, a user explores
 * CogniX through a persona perspective.** A lens is a question set, not an identity and not a
 * permission level. Which is why the Sales lens still meets every limitation the Developer lens
 * meets — a lens that could soften a limitation would be the exact overselling mechanism `ATL-06D`
 * §20 exists to prevent.
 */

import type {
  AudienceLens, ResolvedCapability, CapabilityKnowledge, CapabilityIdentity
} from '../../packages/contracts/src/capability-atlas-model';
import { businessProblemLabel } from '../../content/atlas/business-problems';

// ── The profile ──────────────────────────────────────────────────────────────

/**
 * One of the four questions a lens answers before any disclosure.
 *
 * `reads` names the governed fields the answer is derived from. It is not decoration: it is what
 * makes the claim "this is a reading, not a new fact" auditable, and rule `LN3` checks that every
 * field named here exists on the contract.
 */
export interface LensHeadline {
  id: string;
  /** The question, in the language of the reader who selected this lens. */
  question: string;
  /** Governed fields this question is answered from. Never a field that does not exist. */
  reads: string[];
}

/** A signal that moves a capability up or down a lens-ordered list. Ordering only, never a filter. */
export interface LensRankingSignal {
  id: string;
  /** Why this reader wants to meet these capabilities first, in a sentence a reviewer can dispute. */
  rationale: string;
  /** Points added when the signal is present. Relative weights only; never rendered as a score. */
  weight: number;
  test: (c: ResolvedCapability) => boolean;
}

export interface LensProfile {
  lens: AudienceLens;
  name: string;
  /** What this reader is trying to decide. Rendered, so the lens explains its own selection. */
  reading_for: string;
  /** What the reader is looking at when they arrive, stated as the change the lens makes. */
  orientation: string;
  /** Exactly four. The four-up above the fold is a fixed shape; only its questions vary. */
  headlines: LensHeadline[];
  /** Disclosure sections brought forward, in order. Section ids match `CapabilityDetail`. */
  lead_sections: string[];
  /** Opened on arrival. Must be a subset of `lead_sections` (rule `LN2`). */
  open_on_arrival: string[];
  /**
   * How deeply evidence is exposed.
   *
   *   `referenced` — evidence is named and counted; source paths stay collapsed.
   *   `detailed`   — repository paths, symbols, runners and contract paths are shown inline.
   *
   * This is emphasis, not permission: `referenced` collapses nothing that `detailed` expands, it
   * only declines to lead with a file path in an executive conversation (`ATL-06D` §25).
   */
  evidence_depth: 'referenced' | 'detailed';
  ranking: LensRankingSignal[];
}

// ── Small readers over governed fields ───────────────────────────────────────

const has = <T>(v: T[] | undefined | null): boolean => Array.isArray(v) && v.length > 0;

function k(c: ResolvedCapability): CapabilityKnowledge | null {
  return c.knowledge ?? null;
}

function demoReady(c: ResolvedCapability): boolean {
  return c.demo_maturity !== null && has(k(c)?.demo_scenarios);
}

function assessedReuse(c: ResolvedCapability) {
  return (k(c)?.cross_domain_applicability ?? []).filter(a => a.applicability !== 'not-assessed');
}

const ADVANCED_LIFECYCLE = new Set(['Pilot Ready', 'Accelerator', 'Industry Pattern']);

// ── The four profiles ────────────────────────────────────────────────────────

/**
 * Every headline question below is answerable from the corpus as it stands, and where a field is
 * sparse the answer says so rather than being dropped: `data_sources` is populated on 3 of 38
 * records, so the Architect's data question resolves to "not recorded" on most capabilities. That
 * is the correct outcome and the muted state already exists to render it. Removing the question to
 * avoid an empty answer would hide a genuine gap in the corpus, which is the failure `ATL-01`
 * recorded and rule V7 has forbidden since.
 */
export const LENS_PROFILES: Record<AudienceLens, LensProfile> = {

  // ── Innovation Executive ───────────────────────────────────────────────────
  'innovation-executive': {
    lens: 'innovation-executive',
    name: 'Innovation Executive',
    reading_for: 'whether this is a genuinely different idea, and whether it is worth backing further',
    orientation: 'Leading with the thesis, the strategic problem and how far the idea has travelled.',
    headlines: [
      { id: 'problem', question: 'What problem does this solve?', reads: ['identity.business_problems'] },
      { id: 'different', question: 'Why is this genuinely different?', reads: ['knowledge.innovation_thesis'] },
      { id: 'maturity', question: 'How far has the idea travelled?', reads: ['identity.lifecycle_state', 'identity.implementation_status'] },
      { id: 'portfolio', question: 'Where else could it apply?', reads: ['identity.platform_reusable', 'knowledge.cross_domain_applicability'] }
    ],
    lead_sections: ['thesis', 'reuse', 'usecases', 'curiosity', 'limitations', 'evidence'],
    open_on_arrival: ['thesis'],
    evidence_depth: 'referenced',
    ranking: [
      { id: 'reusable', weight: 3, rationale: 'A capability that carries beyond one domain is portfolio value rather than a point solution.', test: c => c.identity.platform_reusable },
      { id: 'assessed-reuse', weight: 2, rationale: 'Reuse that has actually been assessed outranks reuse that is merely asserted.', test: c => assessedReuse(c).length > 0 },
      { id: 'thesis', weight: 2, rationale: 'An innovation thesis is what this reader is here to evaluate.', test: c => Boolean(k(c)?.innovation_thesis) },
      { id: 'advanced-lifecycle', weight: 2, rationale: 'An idea that has reached Pilot Ready or beyond is a different conversation from a concept.', test: c => ADVANCED_LIFECYCLE.has(c.identity.lifecycle_state ?? '') }
    ]
  },

  // ── Sales ──────────────────────────────────────────────────────────────────
  sales: {
    lens: 'sales',
    name: 'Sales',
    reading_for: 'what a client will recognise as their problem, what can honestly be shown, and what must not be claimed',
    orientation: 'Leading with the client pain, what can be demonstrated today, and the claims to avoid.',
    headlines: [
      { id: 'pain', question: 'What client pain does this address?', reads: ['identity.business_problems', 'knowledge.use_cases'] },
      { id: 'show', question: 'Can I show this today?', reads: ['demo_maturity', 'knowledge.demo_scenarios'] },
      { id: 'avoid', question: 'What must I not claim?', reads: ['identity.implementation_status', 'knowledge.known_limitations'] },
      { id: 'ask', question: 'What will the client ask?', reads: ['knowledge.client_questions'] }
    ],
    lead_sections: ['usecases', 'demo', 'limitations', 'questions', 'curiosity', 'thesis'],
    open_on_arrival: ['usecases'],
    evidence_depth: 'referenced',
    ranking: [
      { id: 'demo-ready', weight: 4, rationale: 'A capability with a demonstration path and a solution carrying it is the one that can actually be shown in the meeting.', test: demoReady },
      { id: 'use-cases', weight: 2, rationale: 'A written use case is the sentence a client recognises as their own situation.', test: c => has(k(c)?.use_cases) },
      { id: 'client-questions', weight: 2, rationale: 'Anticipated client questions are what turn a demonstration into a conversation.', test: c => has(k(c)?.client_questions) },
      { id: 'real', weight: 2, rationale: 'An implemented capability can be shown without a caveat that costs the room its attention.', test: c => c.identity.implementation_status === 'implemented' }
    ]
  },

  // ── Architect ──────────────────────────────────────────────────────────────
  architect: {
    lens: 'architect',
    name: 'Architect',
    reading_for: 'how this fits an existing estate: its boundaries, its contracts, and what it assumes of everything around it',
    orientation: 'Leading with the flow, the integration surface and the constraints on adopting it.',
    headlines: [
      { id: 'works', question: 'How does it actually work?', reads: ['knowledge.architecture_flow', 'knowledge.architecture_narrative'] },
      { id: 'integrate', question: 'What does it integrate through?', reads: ['knowledge.apis', 'knowledge.contracts'] },
      { id: 'data', question: 'Where does its data come from?', reads: ['knowledge.data_sources'] },
      { id: 'constrains', question: 'What constrains adopting it?', reads: ['knowledge.known_limitations', 'knowledge.assumptions'] }
    ],
    lead_sections: ['architecture', 'contracts', 'limitations', 'decisions', 'evidence', 'relationships'],
    open_on_arrival: ['architecture'],
    evidence_depth: 'detailed',
    ranking: [
      { id: 'contracts', weight: 4, rationale: 'A published contract is the boundary an architect can design against; without one there is nothing to integrate.', test: c => has(k(c)?.contracts) || has(k(c)?.apis) },
      { id: 'flow', weight: 3, rationale: 'A declared architecture flow is what makes a capability reviewable rather than merely described.', test: c => has(k(c)?.architecture_flow) },
      { id: 'decisions', weight: 2, rationale: 'A capability governed by a recorded decision can be reasoned about after the meeting.', test: c => has(k(c)?.related_decisions) },
      { id: 'related', weight: 1, rationale: 'Dependencies determine what adopting one capability actually commits the estate to.', test: c => has(k(c)?.related_capabilities) }
    ]
  },

  // ── Developer ──────────────────────────────────────────────────────────────
  developer: {
    lens: 'developer',
    name: 'Developer',
    reading_for: 'whether the thing behind the screen is actually computing, where its code is, and how to prove it works',
    orientation: 'Leading with implementation status, where the code is and how to verify it.',
    headlines: [
      { id: 'built', question: 'Is this actually built?', reads: ['identity.implementation_status', 'knowledge.field_status'] },
      { id: 'code', question: 'Where is the code?', reads: ['knowledge.implementation_references'] },
      { id: 'verify', question: 'How do I verify it?', reads: ['knowledge.test_runners', 'knowledge.validation_evidence'] },
      { id: 'broken', question: 'What is known to be incomplete?', reads: ['knowledge.open_defects', 'knowledge.known_limitations'] }
    ],
    lead_sections: ['implementation', 'testing', 'contracts', 'limitations', 'usage', 'evidence'],
    open_on_arrival: ['implementation'],
    evidence_depth: 'detailed',
    ranking: [
      { id: 'runners', weight: 4, rationale: 'A capability with a test runner can be verified in a terminal rather than taken on trust.', test: c => has(k(c)?.test_runners) },
      { id: 'refs', weight: 3, rationale: 'Implementation references are where reading the capability actually starts.', test: c => has(k(c)?.implementation_references) },
      { id: 'implemented', weight: 2, rationale: 'Implementation status is the first fact a developer needs and the one most often assumed.', test: c => c.identity.implementation_status === 'implemented' },
      { id: 'apis', weight: 1, rationale: 'A declared API is a callable surface, not a description of one.', test: c => has(k(c)?.apis) }
    ]
  }
};

export const LENS_NAME: Record<AudienceLens, string> = {
  'innovation-executive': 'Innovation Executive',
  sales: 'Sales',
  architect: 'Architect',
  developer: 'Developer'
};

/** The default reading when no lens is selected. Neutral, and deliberately not one of the four. */
export const DEFAULT_HEADLINES: LensHeadline[] = [
  { id: 'problem', question: 'What problem does this solve?', reads: ['identity.business_problems'] },
  { id: 'matter', question: 'Why does it matter?', reads: ['knowledge.innovation_thesis'] },
  { id: 'demo', question: 'Can I demonstrate it?', reads: ['demo_maturity', 'knowledge.demo_scenarios'] },
  { id: 'reuse', question: 'Can I reuse it elsewhere?', reads: ['identity.platform_reusable', 'knowledge.cross_domain_applicability'] }
];

export function lensProfile(lens: AudienceLens | null): LensProfile | null {
  return lens ? LENS_PROFILES[lens] ?? null : null;
}

// ── Resolving a headline against one governed record ─────────────────────────

/**
 * One answered headline.
 *
 * `answered: false` is a RENDERED STATE, not an empty string — the same rule the grounding envelope
 * follows for an absent market section. "No data sources recorded" and "reads three synthetic
 * sources" are different statements about the corpus and the reader is entitled to both.
 */
export interface ResolvedHeadline {
  id: string;
  question: string;
  answer: string;
  answered: boolean;
  reads: string[];
}

function clampList(items: string[], max: number): string {
  if (items.length <= max) return items.join(', ');
  return `${items.slice(0, max).join(', ')} and ${items.length - max} more`;
}

/** Sentence-cases a `bp-*` label list without inventing punctuation. */
function problems(identity: CapabilityIdentity): string {
  return clampList(identity.business_problems.map(businessProblemLabel), 3);
}

function answerHeadline(id: string, c: ResolvedCapability): { answer: string; answered: boolean } {
  const kn = k(c);
  const { identity } = c;
  const notReal = identity.implementation_status !== 'implemented';

  switch (id) {
    // Shared with the neutral default.
    case 'problem':
      return identity.business_problems.length
        ? { answer: problems(identity), answered: true }
        : { answer: 'no business problem recorded', answered: false };

    case 'matter':
    case 'different':
      return kn?.innovation_thesis
        ? { answer: kn.innovation_thesis, answered: true }
        : { answer: 'no innovation thesis recorded', answered: false };

    case 'demo':
    case 'show': {
      if (!has(kn?.demo_scenarios)) return { answer: 'No demonstration path recorded', answered: false };
      const durations = kn!.demo_scenarios.map(d => `${d.duration_mins} min`).join(', ');
      const warned = kn!.demo_scenarios.some(d => d.warnings.length > 0);
      if (!c.demo_maturity) {
        return {
          answer: `A demonstration path exists (${durations}), but no solution surface carries it${warned || notReal ? '. Warnings apply.' : ''}`,
          answered: false
        };
      }
      return {
        answer: `Yes — ${durations}, as ${c.demo_maturity}${warned || notReal ? '. Warnings apply.' : ''}`,
        answered: true
      };
    }

    case 'reuse':
    case 'portfolio': {
      const assessed = assessedReuse(c);
      if (!identity.platform_reusable) {
        return { answer: 'Not classified as reusable beyond its domain', answered: false };
      }
      return assessed.length
        ? { answer: `Yes — ${assessed.length} domain${assessed.length === 1 ? '' : 's'} assessed (${clampList(assessed.map(a => a.domain_id.replace(/_/g, ' ')), 3)})`, answered: true }
        : { answer: 'Marked reusable, but no domain has been assessed yet', answered: false };
    }

    // ── Innovation Executive ────────────────────────────────────────────────
    case 'maturity': {
      const life = identity.lifecycle_state ?? 'no lifecycle state recorded';
      return {
        answer: `${life} · ${identity.implementation_status.replace(/-/g, ' ')}${c.demo_maturity ? ` · demonstrated as ${c.demo_maturity}` : ''}`,
        answered: identity.lifecycle_state !== null
      };
    }

    // ── Sales ───────────────────────────────────────────────────────────────
    case 'pain': {
      const lead = kn?.use_cases[0];
      if (lead) return { answer: `${lead.context} — ${lead.title}`, answered: true };
      return identity.business_problems.length
        ? { answer: problems(identity), answered: true }
        : { answer: 'no client pain recorded', answered: false };
    }

    case 'avoid': {
      // The most severe governed limitation, plus the status caveat where the status is not real.
      const severe = (kn?.known_limitations ?? [])
        .slice()
        .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0];
      if (notReal && severe) {
        return { answer: `This is ${identity.implementation_status.replace(/-/g, ' ')} — do not present it as live. ${severe.limitation}`, answered: true };
      }
      if (notReal) {
        return { answer: `This is ${identity.implementation_status.replace(/-/g, ' ')} — do not present it as live`, answered: true };
      }
      return severe
        ? { answer: severe.limitation, answered: true }
        : { answer: 'no limitation recorded — verify before claiming completeness', answered: false };
    }

    case 'ask':
      return has(kn?.client_questions)
        ? { answer: `${kn!.client_questions.length} anticipated — leading with “${kn!.client_questions[0].question}”`, answered: true }
        : { answer: 'no client questions recorded', answered: false };

    // ── Architect ───────────────────────────────────────────────────────────
    case 'works':
      if (has(kn?.architecture_flow)) return { answer: kn!.architecture_flow.join(' → '), answered: true };
      return kn?.architecture_narrative
        ? { answer: kn.architecture_narrative, answered: true }
        : { answer: 'no architecture recorded', answered: false };

    case 'integrate': {
      const apis = kn?.apis.length ?? 0;
      const contracts = kn?.contracts.length ?? 0;
      if (!apis && !contracts) return { answer: 'no API or contract recorded', answered: false };
      const parts = [
        apis ? `${apis} API${apis === 1 ? '' : 's'}` : null,
        contracts ? `${contracts} contract${contracts === 1 ? '' : 's'}` : null
      ].filter(Boolean);
      return { answer: `${parts.join(' · ')}${apis ? ` — ${kn!.apis[0].method} ${kn!.apis[0].path}` : ''}`, answered: true };
    }

    case 'data': {
      const sources = kn?.data_sources ?? [];
      if (!sources.length) return { answer: 'no data sources recorded', answered: false };
      const kinds = [...new Set(sources.map(s => s.kind))];
      return { answer: `${sources.length} source${sources.length === 1 ? '' : 's'} — ${kinds.join(', ')}`, answered: true };
    }

    case 'constrains': {
      const limits = kn?.known_limitations.length ?? 0;
      const assume = kn?.assumptions.length ?? 0;
      if (!limits && !assume) return { answer: 'no limitation or assumption recorded', answered: false };
      const parts = [
        limits ? `${limits} known limitation${limits === 1 ? '' : 's'}` : null,
        assume ? `${assume} declared assumption${assume === 1 ? '' : 's'}` : null
      ].filter(Boolean);
      return { answer: parts.join(' · '), answered: true };
    }

    // ── Developer ───────────────────────────────────────────────────────────
    case 'built': {
      const partial = (kn?.field_status ?? []).filter(f => f.implementation_status !== 'implemented');
      const base = identity.implementation_status.replace(/-/g, ' ');
      return partial.length
        ? { answer: `${base}, and ${partial.length} field${partial.length === 1 ? '' : 's'} differ from the whole`, answered: true }
        : { answer: base, answered: identity.implementation_status === 'implemented' };
    }

    case 'code': {
      const refs = kn?.implementation_references ?? [];
      if (!refs.length) return { answer: 'no implementation reference recorded', answered: false };
      return { answer: `${refs.length} reference${refs.length === 1 ? '' : 's'} — ${refs[0].path}`, answered: true };
    }

    case 'verify': {
      const runners = kn?.test_runners ?? [];
      const evidence = kn?.validation_evidence ?? [];
      if (!runners.length && !evidence.length) return { answer: 'no test runner or validation evidence recorded', answered: false };
      if (!runners.length) return { answer: `No dedicated runner — ${evidence.length} validation record${evidence.length === 1 ? '' : 's'}`, answered: false };
      return { answer: `${runners[0]}${runners.length > 1 ? ` and ${runners.length - 1} more` : ''}`, answered: true };
    }

    case 'broken': {
      const defects = kn?.open_defects ?? [];
      const limits = kn?.known_limitations ?? [];
      if (defects.length) return { answer: `${defects.length} open defect${defects.length === 1 ? '' : 's'} — ${defects[0].summary}`, answered: true };
      return limits.length
        ? { answer: `No open defect. ${limits.length} known limitation${limits.length === 1 ? ' applies' : 's apply'}.`, answered: true }
        : { answer: 'no open defect or limitation recorded', answered: false };
    }

    default:
      return { answer: 'not recorded', answered: false };
  }
}

function severityRank(s: 'low' | 'medium' | 'high'): number {
  return s === 'high' ? 3 : s === 'medium' ? 2 : 1;
}

/**
 * The four questions this lens answers about this capability, resolved from governed fields.
 *
 * Deterministic and total: it returns exactly four entries for every lens and for the neutral
 * default, and it never returns an empty answer string.
 */
export function resolveHeadlines(c: ResolvedCapability, lens: AudienceLens | null): ResolvedHeadline[] {
  const headlines = lens ? LENS_PROFILES[lens].headlines : DEFAULT_HEADLINES;
  return headlines.map(h => {
    const { answer, answered } = answerHeadline(h.id, c);
    return { id: h.id, question: h.question, answer, answered, reads: h.reads };
  });
}

// ── Lens-ordered capability lists ────────────────────────────────────────────

/** Why one capability sits above another under a lens. Ordering only — never rendered as a score. */
export interface LensOrdering {
  capability_id: string;
  /** Signals that fired, in declaration order. Empty is legitimate and means "no lens signal". */
  signals: { id: string; rationale: string }[];
}

/**
 * Score a capability for a lens. Relative only.
 *
 * This value NEVER reaches the interface as a number. `ATL-01` recorded twelve fabricated outcome
 * constants in the storyboard and Principle 12 has forbidden the pattern since; a lens affinity
 * printed as "87% relevant" would be exactly that failure with a new label. It orders a list and
 * explains itself in words, and that is all it is permitted to do.
 */
export function lensScore(c: ResolvedCapability, lens: AudienceLens): number {
  return LENS_PROFILES[lens].ranking.reduce((total, s) => total + (s.test(c) ? s.weight : 0), 0);
}

export function lensSignals(c: ResolvedCapability, lens: AudienceLens): { id: string; rationale: string }[] {
  return LENS_PROFILES[lens].ranking
    .filter(s => s.test(c))
    .map(s => ({ id: s.id, rationale: s.rationale }));
}

/**
 * Reorder — never filter.
 *
 * The returned array is a permutation of the input: same length, same members. That property is
 * `ADR-045` expressed as a postcondition rather than a promise, and it is asserted directly in
 * `run-atl06d-tests.ts` §B over the whole registry under all four lenses.
 */
export function orderForLens<T extends ResolvedCapability>(caps: T[], lens: AudienceLens | null): T[] {
  if (!lens) return caps.slice();
  return caps
    .map((c, i) => ({ c, i, s: lensScore(c, lens) }))
    // Stable: equal scores keep the order they arrived in, so a lens never shuffles arbitrarily.
    .sort((a, b) => (b.s - a.s) || (a.i - b.i))
    .map(x => x.c);
}
