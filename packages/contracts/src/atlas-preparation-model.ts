/**
 * Client Conversation Preparation (ATL-06D) — domain model.
 *
 * Domain Ownership: CogniX Capability Atlas (ATL-01 … ATL-07)
 * Governed by: COGNIX_CAPABILITY_ATLAS.md, CAPABILITY_KNOWLEDGE_MODEL.md,
 *              ARCHITECTURE_DECISIONS.md (ADR-064, ADR-065, ADR-066)
 *
 * ── What this is, and the thing it must never become ───────────────────────
 * A preparation pack is a READING of the governed Atlas for one stated conversation. It is not a
 * sales-copy generator, and the difference is structural rather than a matter of tone:
 *
 *   - Every capability claim in a pack is a `FromCogniXStatement`, quoted from a governed record
 *     and carrying its three ADR-047 maturity dimensions. Nothing in this file can express a
 *     capability fact that is not already in the registry.
 *   - Market statements are `MarketContextStatement`s admitted through the ATL-06A gate, or they
 *     are absent with a stated reason. There is no third state and no field to put one in.
 *   - Interpretation is confined to `AIInterpretationStatement`, verified by ATL-06C, and every
 *     statement names the premises it rests on.
 *
 * ── The two dimensions that are constantly confused ────────────────────────
 * `lens` is the CogniX person preparing. `client_role` is the person they are meeting. They are
 * different dimensions and this contract keeps them apart in both directions (`ATL-06D` §9):
 *
 *     lens: 'sales'                       ← who is reading the Atlas
 *     client_role: 'Head of Demand Planning'  ← who is across the table
 *
 * Collapsing them would produce the specific nonsense of preparing an architect's briefing because
 * the seller happens to be meeting an architect, or of showing repository paths to an executive
 * because a developer prepared the pack.
 *
 * ── Overselling is a contract-level concern, not a copy review ─────────────
 * `DemoWarning` and `AvoidClaiming` are NON-OPTIONAL arrays on the pack. A pack that recommends a
 * simulated capability and carries no warning is not a stylistic lapse, it is an invalid document,
 * and `validatePack` refuses it. Six phases of this programme were spent making limitations
 * visible; the commercial surface is where the pressure to soften them actually arrives.
 */

import type {
  CapabilityId, AudienceLens, DemoMaturity, ImplementationStatus, LifecycleState,
  ClarificationQuestion
} from './capability-atlas-model';
import type { GroundedEnvelope } from './atlas-grounding-model';

// ── Client context ───────────────────────────────────────────────────────────

/**
 * What the meeting is about, as far as the user has said.
 *
 * EVERY FIELD IS OPTIONAL, and that is the governing design decision (`ATL-06D` §7). A form the
 * user must complete before they can begin is the thing this feature is specifically not. The
 * engine works with whatever it has and asks about what would materially change the pack.
 *
 * `source` on each dimension follows the `ExplorationContext` precedent: a reader can always see
 * whether they said something or the Atlas inferred it, and can remove either.
 */
export interface ClientContextValue<T> {
  value: T;
  source: 'stated' | 'inferred' | 'chosen';
  /** The span of the brief this was read from. Present only for `inferred`. */
  evidence?: string;
}

/** What the user wants out of the conversation. Drives sequence, depth and question selection. */
export const MEETING_OBJECTIVES = [
  'understand-challenges',
  'demonstrate',
  'architecture',
  'pilot',
  'executive-innovation',
  'other'
] as const;
export type MeetingObjective = typeof MEETING_OBJECTIVES[number];

export const MEETING_OBJECTIVE_LABEL: Record<MeetingObjective, string> = {
  'understand-challenges': 'Understand their challenges',
  demonstrate: 'Demonstrate CogniX',
  architecture: 'Explore architecture and integration',
  pilot: 'Discuss a potential pilot',
  'executive-innovation': 'Executive innovation discussion',
  other: 'Something else'
};

/** Whether the room is technical or commercial. Distinct from `lens` and from `client_role`. */
export type ClientOrientation = 'executive' | 'technical' | 'mixed';

export interface ClientContext {
  /** The brief exactly as the user wrote it. Never rewritten, never paraphrased into a fact. */
  brief: string;
  organisation: ClientContextValue<string> | null;
  /** A `config/domains.ts` id where one is recognised. Never invented from a company name. */
  domain: ClientContextValue<string> | null;
  /** The person being met, in the user's own words. NOT an `AudienceLens`. */
  client_role: ClientContextValue<string> | null;
  /** Business problems the client is said to have, as `bp-*` ids the registry knows. */
  business_problems: ClientContextValue<string>[];
  objective: ClientContextValue<MeetingObjective> | null;
  duration_mins: ClientContextValue<number> | null;
  orientation: ClientContextValue<ClientOrientation> | null;
  /** Capabilities the user says were already discussed. Affects sequencing, never admission. */
  capabilities_discussed: CapabilityId[];
  /** Named third parties the user raised. Recorded so §19 can answer without inventing claims. */
  vendors_mentioned: string[];
  /** Free-text refinements applied across turns ("make this more technical"). */
  refinements: string[];
}

/**
 * Two statements of the client's situation that must never be run together into one paragraph.
 *
 * `supplied` is what the user actually said. `inferred` is what the Atlas read into it. The whole
 * value of the distinction is that a user can look at the inferred column and say "no, that is not
 * their problem" — which they cannot do if the two are blended into fluent prose (`ATL-06D` §10).
 */
export interface ClientProblemInterpretation {
  supplied: string[];
  inferred: { statement: string; because: string }[];
  /** Where the brief contradicts itself, said out loud rather than resolved silently (§34). */
  contradictions: { statement: string; conflicts_with: string }[];
  /** What would most improve the pack if the user supplied it. Never blocks the pack. */
  unknowns: string[];
}

// ── Capability recommendation ────────────────────────────────────────────────

/**
 * Why one capability is in the pack.
 *
 * `ATL-06D` §11 forbids the bare list — *"Recommended: Decision Gap, Intent Fusion, Forecast
 * Stability"* with no reasoning. The rationale is therefore a REQUIRED, NON-EMPTY array, and each
 * entry names the basis it argues from and the governed evidence behind it. A recommendation that
 * cannot produce one is not emitted.
 */
export type RationaleBasis =
  | 'business-problem'
  | 'domain'
  | 'client-role'
  | 'objective'
  | 'lens'
  | 'query-term'
  | 'relationship'
  | 'demo-readiness';

export interface RecommendationRationale {
  basis: RationaleBasis;
  /** The reason, in a sentence a reviewer can disagree with. Never "matched keywords". */
  detail: string;
  /** The governed thing this rests on: a `bp-*` id, a domain id, a `CAP-*`, a matched field. */
  evidence: string;
}

/** Lead capabilities carry the conversation; supporting ones are held for where it goes deeper. */
export type RecommendationTier = 'lead' | 'supporting';

export interface CapabilityRecommendation {
  capability_id: CapabilityId;
  name: string;
  summary: string;
  tier: RecommendationTier;
  /** Non-empty by construction. `validatePack` rejects an empty one (rule `P1`). */
  rationale: RecommendationRationale[];
  /** All three ADR-047 dimensions travel with the recommendation, never only on a detail page. */
  maturity: {
    lifecycle_state: LifecycleState | null;
    demo_maturity: DemoMaturity | null;
    implementation_status: ImplementationStatus;
  };
  /** Governed limitations that bear on THIS conversation. Never filtered by lens (rule `P2`). */
  limitations: { limitation: string; severity: 'low' | 'medium' | 'high' }[];
  /** Whether a demonstration path exists AND a solution surface carries it. */
  demonstrable: boolean;
}

// ── Conversation sequence ────────────────────────────────────────────────────

/**
 * One movement of the conversation.
 *
 * A sequence is a NARRATIVE, not a feature list (`ATL-06D` §10): problem → evidence → signals →
 * forecast → uncertainty → decision → consequence → learning, using only the stages the recommended
 * capabilities can actually support. A stage with no capability behind it is dropped rather than
 * filled, which is why `supported_by` is required and non-empty.
 */
export interface ConversationStage {
  stage: string;
  /** What this movement is for, in the language of the meeting. */
  purpose: string;
  supported_by: CapabilityId[];
  /** Minutes allocated. Sums to at most the stated duration where one was given. */
  minutes: number;
  /** Governed demo steps where a demo path exists. Never invented (§13, §34). */
  demo_steps: { action: string; what_to_say: string; expected_observation: string }[];
  /** Warnings attached to the demo path being used here. Carried, never dropped. */
  warnings: string[];
}

export const DEMO_PATH_KINDS = ['executive', 'demonstration', 'technical'] as const;
export type DemoPathKind = typeof DEMO_PATH_KINDS[number];

export interface ConversationSequence {
  kind: DemoPathKind;
  title: string;
  /** Present only where the user supplied a duration. Never guessed. */
  duration_mins: number | null;
  stages: ConversationStage[];
  /**
   * Stated when the sequence is shorter than the capabilities would support, so a thin sequence
   * is never mistaken for a complete one. `null` where nothing was dropped.
   */
  omission_notice: string | null;
}

// ── Questions ────────────────────────────────────────────────────────────────

/** A governed Question Worth Asking, selected for this conversation with the reason it was selected. */
export interface SuggestedQuestion {
  question_id: string;
  question: string;
  why_asking: string;
  /** Why this question suits THIS conversation, as opposed to why it is a good question at all. */
  why_here: string;
  related_capabilities: CapabilityId[];
}

/**
 * A question the client is likely to ask, and what can honestly be said back.
 *
 * `response` is assembled from governed text. Where the corpus cannot support an answer,
 * `response` states that rather than improvising — which is the same refusal behaviour ADR-049
 * established for Ask CogniX, applied where the commercial pressure is highest.
 */
export interface AnticipatedQuestion {
  question: string;
  category: string;
  /** `high` where the honest answer is uncomfortable. Surfaced, not buried. */
  difficulty: 'low' | 'medium' | 'high';
  response: string;
  /** `CAP-*` ids the response is quoted from. Empty means the response is a stated inability. */
  grounded_in: CapabilityId[];
  /** True where the honest response names a limitation rather than a strength. */
  concedes: boolean;
}

// ── Integrity ────────────────────────────────────────────────────────────────

export type DemoWarningKind =
  | 'simulated'
  | 'partially-implemented'
  | 'synthetic-data'
  | 'no-demo-surface'
  | 'missing-evidence'
  | 'integration-assumption'
  | 'open-defect'
  | 'roadmap-not-implementation';

/** Something the pack must say out loud before the conversation happens (`ATL-06D` §20). */
export interface DemoWarning {
  kind: DemoWarningKind;
  capability_id: CapabilityId;
  capability_name: string;
  warning: string;
  /** The governed field this was derived from. Never a warning invented to fill the section. */
  derived_from: string;
}

/**
 * A claim the user must not make, derived from a governed limitation (`ATL-06D` §21).
 *
 * `instead` is the honest alternative, and it is required: telling a seller what they cannot say
 * without telling them what they can is advice that will be ignored under pressure.
 */
export interface AvoidClaiming {
  capability_id: CapabilityId;
  capability_name: string;
  avoid: string;
  instead: string;
  derived_from: string;
}

// ── The pack ─────────────────────────────────────────────────────────────────

export const PREPARATION_STATES = ['prepared', 'needs-clarification', 'no-relevant-capabilities'] as const;
export type PreparationState = typeof PREPARATION_STATES[number];

export interface PreparationRequest {
  /** The user's natural description of the meeting. */
  brief: string;
  /** The perspective of the CogniX user preparing. NOT the client's role. */
  lens?: AudienceLens;
  /** Context carried across turns so a refinement does not discard what was established (§31). */
  context?: Partial<ClientContext>;
  /** Free-text refinement applied to an existing pack ("I only have 15 minutes"). */
  refinement?: string;
  /**
   * ATL-06B/§17. External market research is EXPLICIT AND OPT-IN, default `false`.
   * `true` permits the ATL-06A gate to run; it does not compel a search (§18).
   */
  research?: boolean;
  /** Answers to a prior clarification question. */
  choices?: string[];
}

export interface PreparationPack {
  state: PreparationState;
  /** Echoed so a stored pack is re-checkable against the context it was built from. */
  context: ClientContext;
  lens: AudienceLens | null;
  /** Present only where the Atlas is asking. `null` once it has enough to be useful. */
  clarification: ClarificationQuestion | null;
  interpretation: ClientProblemInterpretation;
  recommendations: CapabilityRecommendation[];
  /** Executive, demonstration and technical readings. Only those the evidence supports. */
  sequences: ConversationSequence[];
  questions_to_ask: SuggestedQuestion[];
  likely_client_questions: AnticipatedQuestion[];
  /** Mandatory. An empty array is valid ONLY when nothing recommended carries a warning. */
  demo_warnings: DemoWarning[];
  avoid_claiming: AvoidClaiming[];
  /** Where the conversation should go next, given the stated objective. */
  follow_up: { suggestion: string; because: string }[];
  /**
   * The three ADR-048 evidence classes, assembled by the same engine Ask CogniX uses. Market
   * context lives HERE and nowhere else in this contract, so a market claim cannot reach the pack
   * except through the ATL-06A gate.
   */
  envelope: GroundedEnvelope;
  /** Governed version so a pack built under older rules is identifiable. */
  preparation_version: string;
}

export const PREPARATION_VERSION = 'ATL-06D.1';

/**
 * Lead capability count.
 *
 * `ATL-06D` §12 forbids recommending fifteen capabilities because fifteen matched keywords, and
 * asks for a small primary set plus secondary options. Three to five is the band; the engine
 * selects by evidence within it and does not pad to reach the floor — a conversation with two
 * genuinely relevant capabilities gets two.
 */
export const LEAD_RECOMMENDATION_TARGET = 5;
export const LEAD_RECOMMENDATION_FLOOR = 3;
export const SUPPORTING_RECOMMENDATION_MAX = 6;

// ── Validation ───────────────────────────────────────────────────────────────

export type PackRuleId = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7';

export interface PackViolation {
  rule: PackRuleId;
  message: string;
  capability_id?: CapabilityId;
}

/**
 * The rules a pack must satisfy before it is shown to anyone.
 *
 * These are not lint. Each one closes a way this feature could mislead a client:
 *
 *   P1  Every recommendation carries a non-empty rationale.                        (§11)
 *   P2  A non-`implemented` recommendation carries at least one demo warning.      (§20)
 *   P3  No sequence stage exists without a capability behind it.                   (§13, §34)
 *   P4  No market statement is present unless research was requested AND admitted. (§17, §38)
 *   P5  Lead recommendations do not exceed the band.                               (§12)
 *   P6  Every anticipated response is grounded or is an explicit inability.        (§10)
 *   P7  An `avoid_claiming` entry names the governed limitation it derives from.   (§21)
 */
export function validatePack(pack: PreparationPack): PackViolation[] {
  const v: PackViolation[] = [];

  for (const r of pack.recommendations) {
    if (r.rationale.length === 0) {
      v.push({ rule: 'P1', capability_id: r.capability_id, message: `${r.name} is recommended with no rationale.` });
    }
    if (r.maturity.implementation_status !== 'implemented') {
      const warned = pack.demo_warnings.some(w => w.capability_id === r.capability_id);
      if (!warned) {
        v.push({
          rule: 'P2', capability_id: r.capability_id,
          message: `${r.name} is ${r.maturity.implementation_status} and carries no demo warning.`
        });
      }
    }
  }

  for (const s of pack.sequences) {
    for (const stage of s.stages) {
      if (stage.supported_by.length === 0) {
        v.push({ rule: 'P3', message: `Sequence '${s.title}' has a stage '${stage.stage}' with no capability behind it.` });
      }
    }
  }

  const market = pack.envelope.market_context;
  if (market.statements.length > 0 && !market.available) {
    v.push({ rule: 'P4', message: 'Market statements are present on an unavailable market block.' });
  }

  const leads = pack.recommendations.filter(r => r.tier === 'lead');
  if (leads.length > LEAD_RECOMMENDATION_TARGET) {
    v.push({ rule: 'P5', message: `${leads.length} lead recommendations exceeds the band of ${LEAD_RECOMMENDATION_TARGET}.` });
  }

  for (const q of pack.likely_client_questions) {
    if (q.grounded_in.length === 0 && !q.concedes) {
      v.push({ rule: 'P6', message: `Response to “${q.question}” is neither grounded nor an explicit inability.` });
    }
  }

  for (const a of pack.avoid_claiming) {
    if (!a.derived_from) {
      v.push({ rule: 'P7', capability_id: a.capability_id, message: `An avoid-claiming entry for ${a.capability_name} names no governed source.` });
    }
  }

  return v;
}
