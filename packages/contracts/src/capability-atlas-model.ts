/**
 * CogniX Capability Atlas (ATL-02) Domain Model
 * Transport-neutral types and contracts for capability identity, capability knowledge,
 * relationship resolution, deterministic retrieval and provenance.
 *
 * Domain Ownership: CogniX Capability Atlas (ATL-01 … ATL-07)
 * Governed by: COGNIX_CAPABILITY_ATLAS.md, CAPABILITY_KNOWLEDGE_MODEL.md,
 *              CAPABILITY_ATLAS_ARCHITECTURE.md & ARCHITECTURE_DECISIONS.md (ADR-045..ADR-052)
 *
 * ── The identity/knowledge boundary (ADR-046, ADR-052) ──────────────────────
 * This file declares TWO records for one capability, and the split is deliberate:
 *
 *   CapabilityIdentity  — small, always loaded, one entry per capability in the
 *                         canonical registry. Carries identity, relationships,
 *                         placement, the three maturity dimensions and a bounded
 *                         `summary`. Everything a card, a filter or a search result
 *                         needs, and nothing else.
 *
 *   CapabilityKnowledge — large, loaded on demand, one module per capability.
 *                         Carries architecture, evidence, demo paths, market context
 *                         and the rest of the ATL-03 payload.
 *
 * The registry must stay legible as a registry. Prose belongs in knowledge modules,
 * which is what allows ATL-03 to populate deep content without touching this contract
 * or the registry's shape.
 */

// ── Identifier namespaces ────────────────────────────────────────────────────

/** `CAP-*` — what CogniX can do. Stable, immutable, never reused (ADR-052). */
export type CapabilityId = string;
/** `SOL-*` — a packaged Demonstration Solution (DEMONSTRATION_SOLUTION_MODEL.md). */
export type SolutionId = string;
/** `EXP-*` — an Innovation Experiment (EXPERIMENT_MODEL.md). */
export type ExperimentId = string;
/** `PAT-*` — an Enterprise Learning Pattern (services/learning/src/learning-pattern-store.ts). */
export type PatternId = string;
/** A unit of delivery work: `DDF-01`, `CDI-08`, `ESF-6`, `WP10-C`, … */
export type WorkPackageId = string;

export const CAPABILITY_ID_PATTERN = /^CAP-[A-Z0-9]+(-[A-Z0-9]+)*$/;

// ── Classification ───────────────────────────────────────────────────────────

export type CapabilityType =
  | 'domain-capability'
  | 'platform-capability'
  | 'enabling-service'
  | 'governance-control'
  | 'experience';

/**
 * ADR-047 dimension 1 — innovation lifecycle. Owned by EXPERIMENT_LIFECYCLE.md.
 * `null` where no experiment owns the capability; it is then resolved through
 * `originated_as` if an experiment is related, and otherwise legitimately absent.
 */
export type LifecycleState =
  | 'Concept' | 'Research' | 'Prototype' | 'Pilot Ready'
  | 'Accelerator' | 'Industry Pattern' | 'Retired';

/**
 * ADR-047 dimension 2 — demonstration maturity. Owned by CognixSolution.demoMaturity.
 * NEVER stored on a capability record; always resolved through `demonstrated_by`.
 */
export type DemoMaturity = 'Production Ready' | 'Interactive Prototype' | 'Reference Pattern';

/**
 * ADR-047 dimension 3 — implementation status. Introduced by the Atlas because nothing
 * else owned it. Answers: is the thing behind this screen actually computing?
 */
export type ImplementationStatus =
  | 'implemented' | 'partially-implemented' | 'simulated'
  | 'experimental' | 'concept' | 'roadmap';

export const IMPLEMENTATION_STATUSES: ImplementationStatus[] = [
  'implemented', 'partially-implemented', 'simulated', 'experimental', 'concept', 'roadmap'
];

/** Statuses that are not fully real, and therefore require a limitation (V7) and demo warnings (V12). */
export const NON_REAL_STATUSES: ImplementationStatus[] = [
  'simulated', 'experimental', 'concept', 'roadmap'
];

// ── Capability identity (the compact registry record) ────────────────────────

export interface CapabilityIdentity {
  capability_id: CapabilityId;
  name: string;
  /** Bounded on purpose (V15, 240 chars). The registry is not a documentation store. */
  summary: string;
  capability_type: CapabilityType;

  /** Placement. Values resolve against config/domains.ts and config/personas.ts (V3). */
  domains: string[];
  personas: string[];
  business_problems: string[];
  tags: string[];

  /** Relationships to other governed identities. Many-to-many in both directions (ADR-052). */
  demonstrated_by: SolutionId[];
  originated_as: ExperimentId[];
  evidenced_by: PatternId[];
  delivered_by: WorkPackageId[];

  /** ADR-047 dimensions 1 and 3. Dimension 2 is resolved, never stored. */
  lifecycle_state: LifecycleState | null;
  implementation_status: ImplementationStatus;

  platform_reusable: boolean;

  /**
   * Key of the knowledge module carrying this capability's ATL-03 payload, or `null`
   * where no knowledge has been authored yet. A null here is honest and expected before
   * ATL-03 — it is not a validation failure.
   */
  knowledge_ref: string | null;

  owner: string;
  created_at: string;
  updated_at: string;
  reviewed_at: string;
  version: string;
}

// ── Capability knowledge (the on-demand content record) ──────────────────────

export interface EvidenceRef {
  kind: 'test' | 'build' | 'code' | 'measurement' | 'demo-recording' | 'review' | 'report';
  ref: string;
  outcome: string;
  observed_at: string;
  observed_by: string;
}

export interface ImplementationReference {
  path: string;
  symbol?: string;
  note?: string;
}

/** Where one part of a capability differs in status from the whole (ADR-047, V6). */
export interface FieldStatus {
  field: string;
  implementation_status: ImplementationStatus;
  note: string;
}

export interface KnownLimitation {
  limitation: string;
  severity: 'low' | 'medium' | 'high';
  applies_to?: string;
}

export interface CrossDomainApplicability {
  domain_id: string;
  applicability: 'proven' | 'likely' | 'hypothetical' | 'not-assessed';
  rationale: string;
  evidence?: string;
}

export type DemoPathType =
  | 'three-minute' | 'ten-minute' | 'technical-deep-dive' | 'executive-discussion';

export interface DemoPathStep {
  action: string;
  what_to_say: string;
  what_to_show: string;
  expected_observation: string;
}

export interface DemoPath {
  path_type: DemoPathType;
  title: string;
  audience: string;
  duration_mins: number;
  steps: DemoPathStep[];
  prerequisites: string[];
  /** MANDATORY and non-empty where implementation status is not `implemented` (V12). */
  warnings: string[];
  follow_ups: CapabilityId[];
}

export interface ExternalEvidenceRef {
  claim: string;
  source_url: string;
  source_title: string;
  publisher: string;
  /** ISO-8601 or the literal 'undated'. Never guessed (V9). */
  published_at: string;
  retrieved_at: string;
  retrieval_method: 'manual' | 'search-grounding' | 'api';
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
}

export type CapabilityRelation =
  | 'depends-on' | 'enables' | 'complements'
  | 'alternative-to' | 'supersedes' | 'superseded-by';

export interface RelatedCapability {
  ref: CapabilityId;
  relation: CapabilityRelation;
}

/** Symmetric pairs enforced by V5. */
export const SYMMETRIC_RELATIONS: Record<CapabilityRelation, CapabilityRelation | null> = {
  'depends-on': 'enables',
  'enables': 'depends-on',
  'supersedes': 'superseded-by',
  'superseded-by': 'supersedes',
  'complements': 'complements',
  'alternative-to': 'alternative-to'
};

export interface CapabilityKnowledge {
  capability_id: CapabilityId;

  description: string;
  innovation_thesis: string;
  usage_instructions: string;
  testing_instructions: string;

  field_status: FieldStatus[];

  architecture_narrative: string;
  architecture_flow: string[];
  apis: { method: string; path: string; purpose: string }[];
  contracts: { name: string; path: string; direction: 'in' | 'out' }[];
  data_sources: { name: string; kind: 'live' | 'synthetic' | 'static' | 'external'; path?: string }[];
  implementation_references: ImplementationReference[];

  validation_evidence: EvidenceRef[];
  test_runners: string[];
  acceptance_criteria_refs: string[];
  known_limitations: KnownLimitation[];
  open_defects: { ref: string; summary: string }[];
  assumptions: string[];

  use_cases: { title: string; context: string; outcome: string }[];
  demo_scenarios: DemoPath[];
  /** References into the curiosity-question registry (ADR-046 migration target). */
  questions_worth_asking: string[];
  client_questions: { question: string; audience: string; difficulty: 'low' | 'medium' | 'high' }[];

  cross_domain_applicability: CrossDomainApplicability[];

  external_evidence: ExternalEvidenceRef[];
  related_capabilities: RelatedCapability[];
  related_decisions: string[];
  related_governance: string[];
}

// ── Curiosity questions — first-class governed knowledge objects ─────────────

/**
 * A Question Worth Asking. Owner decision (2026-08-20): curiosity questions are governed
 * knowledge objects in their own right, not a presentation detail of one screen and not a
 * field copied into every capability record.
 *
 * Relationships are many-to-many across three namespaces and are **explicit**:
 *
 *   related_solutions / related_experiments  — PRESERVED PROVENANCE. These are the targets the
 *       question has always carried and they are not re-derived or dropped.
 *
 *   related_capabilities — ADDED ONLY WHERE CAPABILITY SEMANTICS OR EVIDENCE SUPPORT IT, each
 *       carrying a written rationale. A capability link is NEVER inferred from a shared solution
 *       or experiment reference: `SOL-PROMO-01` is demonstrated by several capabilities, so
 *       deriving links transitively would attach a question to capabilities it does not ask
 *       about. The rationale field exists so that every link can be audited as deliberate.
 */
export interface CuriosityQuestionCapabilityLink {
  ref: CapabilityId;
  /** Why this question is genuinely about this capability. Never "shares a solution". */
  rationale: string;
}

export interface CuriosityQuestion {
  question_id: string;
  question: string;
  category: string;
  /** Why the question is worth asking, with the situation that prompts it. */
  why_asking: string;
  summary_narrative: string;
  evidence_points: string[];

  /** Preserved provenance — many-to-many. */
  related_solutions: SolutionId[];
  related_experiments: ExperimentId[];
  /** Explicit capability links only, each with a rationale. */
  related_capabilities: CuriosityQuestionCapabilityLink[];

  owner: string;
  reviewed_at: string;
}

// ── Resolved view (what the API returns) ─────────────────────────────────────

/**
 * Relationship targets resolved to their source registries. Nothing here is stored on a
 * capability record — it is read through the relationship at request time, which is what
 * keeps ADR-045's "reference, never copy" rule true in the implementation and not only
 * in the governance.
 */
export interface ResolvedRelationships {
  solutions: { id: SolutionId; name: string; demo_maturity: DemoMaturity }[];
  experiments: { id: ExperimentId; name: string; maturity: string }[];
  patterns: { id: PatternId; title: string }[];
  work_packages: WorkPackageId[];
}

export interface ResolvedCapability {
  identity: CapabilityIdentity;
  /** ADR-047 dimension 2, resolved through `demonstrated_by`. `null` where no solution demonstrates it. */
  demo_maturity: DemoMaturity | null;
  relationships: ResolvedRelationships;
  /** Present only when requested and only when `knowledge_ref` is non-null. */
  knowledge: CapabilityKnowledge | null;
  /** Ordering hint for the requested audience lens. Content is identical across lenses (ADR-045). */
  lens: AudienceLens | null;
  lens_field_order: string[];
}

// ── Retrieval ────────────────────────────────────────────────────────────────

/**
 * Atlas audience lenses. Deliberately a SEPARATE, small vocabulary from the 19-entry
 * `config/personas.ts` decision-lens catalogue, and the distinction is load-bearing:
 *
 *   `CapabilityIdentity.personas`  — WHO IN THE BUSINESS the capability serves. Product
 *                                    personas, owned by config/personas.ts, validated by V3.
 *   `AudienceLens`                 — WHO IS READING THE ATLAS. Four reading modes over one
 *                                    record (CAPABILITY_KNOWLEDGE_MODEL.md §8).
 *
 * They overlap but are not the same set: `exec` maps cleanly onto Innovation Executive and
 * `enterprise_architect` onto Architect, while the Sales lens has NO counterpart in the
 * persona catalogue — CogniX models the client's decision-makers, not its own sellers.
 * Collapsing the two would either invent a sales persona in the product or lose the lens.
 * ATL-04 reconciles the presentation of both.
 */
export const ATLAS_LENSES = ['innovation-executive', 'sales', 'architect', 'developer'] as const;
export type AudienceLens = typeof ATLAS_LENSES[number];

export interface CapabilityFilter {
  domain?: string[];
  persona?: string[];
  business_problem?: string[];
  lifecycle_state?: LifecycleState[];
  demo_maturity?: DemoMaturity[];
  implementation_status?: ImplementationStatus[];
  capability_type?: CapabilityType[];
  platform_reusable?: boolean;
  cross_domain_applicability?: string[];
  tags?: string[];
  delivered_by?: WorkPackageId[];
  demonstrated_by?: SolutionId[];
}

/** Which field produced a Level 1 match. Returned so ranking is inspectable (ADR-050). */
export interface SearchMatch {
  /** Set when this match came from an alias-expanded term rather than the searcher's own words. */
  via_alias?: string;
  field: string;
  weight: number;
  excerpt: string;
}

export interface SearchResult {
  capability_id: CapabilityId;
  name: string;
  summary: string;
  score: number;
  matches: SearchMatch[];
  /** Always present so a searcher never reaches a simulated capability unaware (ADR-047). */
  lifecycle_state: LifecycleState | null;
  demo_maturity: DemoMaturity | null;
  implementation_status: ImplementationStatus;
  /** ADR-050: which search level produced this result. */
  level: 'structured' | 'semantic';
}

export interface SearchResponse {
  query: string;
  level: 'structured';
  total: number;
  results: SearchResult[];
  /** Nearest filter relaxation offered when nothing matched. Never an empty page (ADR-050). */
  suggestion: string | null;
  applied_filters: CapabilityFilter;
}

// ── Validation ───────────────────────────────────────────────────────────────

export interface ValidationIssue {
  /** `V1` … `V14`, matching CAPABILITY_KNOWLEDGE_MODEL.md §9. */
  rule: string;
  capability_id: CapabilityId;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationReport {
  valid: boolean;
  checked: number;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

// ── Governed search vocabulary (ADR-058, ADR-059) ────────────────────────────

export const VOCABULARY_ALIAS_ID_PATTERN = /^VOC-\d{3}$/;

/**
 * One governed mapping from how a business person asks for something to the vocabulary the corpus
 * actually uses.
 *
 * This is CONTENT, not configuration, and it is shaped like every other governed record in the
 * estate: it carries an owner, a review date, a written rationale, and — the load-bearing field —
 * `evidenced_by`, the capabilities whose governed text actually contains the terms it introduces.
 * An alias that cannot name a capability whose text uses its terms is inventing vocabulary, which is
 * the failure ATL-01 caught in the taxonomy and rule V3 has forbidden ever since (ADR-059).
 *
 * `governed_terms` are single lowercase tokens because they are injected into Level 1's term pass.
 * A multi-word concept is expressed as its component tokens, so the search stays one deterministic
 * mechanism rather than growing a second phrase syntax.
 */
export interface VocabularyAlias {
  alias_id: string;
  /** The business phrasing, lowercase. Matched as a substring of the query. */
  phrase: string;
  /** Governed tokens added to the query when the phrase is present. */
  governed_terms: string[];
  /** Why this mapping is legitimate, in a sentence a reviewer can disagree with. */
  rationale: string;
  /** Capabilities whose governed text uses these terms. Checked by rule W6. */
  evidenced_by: CapabilityId[];
  owner: string;
  reviewed_at: string;
}

/**
 * An alias that fired on a query. Returned with the search response and rendered to the searcher,
 * so an expansion is never invisible: the reader sees which phrase fired, what it added and why.
 */
export interface QueryExpansion {
  alias_id: string;
  phrase: string;
  governed_terms: string[];
  rationale: string;
}

export const SUMMARY_MAX_LENGTH = 240;

/** Markup that must never appear in a governed field (V11). */
export const MARKUP_PATTERN = /<\/?[a-z][\s\S]*?>/i;
