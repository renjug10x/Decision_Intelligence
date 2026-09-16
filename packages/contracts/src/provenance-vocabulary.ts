/**
 * CogniX Provenance Vocabulary (ADR-082)
 * ───────────────────────────────────────────────────────────────────────────────
 * ONE vocabulary, in three dimensions, that the five vocabularies the estate already
 * carries MAP ONTO. Nothing here replaces an existing enum.
 *
 * Why mapping rather than replacement
 * -----------------------------------
 * Provenance is already carried in at least five places and they overlap without
 * contradicting: `EvidenceProvenance` (learning loop), `DemandInputProvenanceClass`
 * (demand frontier), `TelemetryProvenance` (learning patterns), the archetype
 * decision-graph enum, and the structured `provenance{}` on signal observations, with
 * attested-observation authority under `ESF-6` on top. Rewriting 146 call sites to
 * satisfy a vocabulary is a large change for no behavioural gain, and it would touch
 * files three later packets need frozen. So the existing enums stay exactly where they
 * are and this module states what each of them MEANS in one shared language.
 *
 * The reader test (ADR-082 part 3)
 * --------------------------------
 * The vocabulary must reduce to one sentence a business user can read:
 *
 *   "Demand is observed from your file; supplier capacity is modelled because you did
 *    not supply it; the margin exposure is derived by CogniX; the summary was drafted
 *    by AI and confirmed by you."
 *
 * If a proposed addition cannot appear in that sentence, it does not belong here.
 *
 * There is no fourth dimension (ADR-082 part 4). Not a confidence score on top of
 * ADR-072, not a provenance graph, not a lineage tree.
 */

// ── The three declared dimensions ─────────────────────────────────────────────

/**
 * WHERE the value came from.
 *
 * `observed`  — measured in the world and admitted as a measurement.
 * `attested`  — supplied by a registered source whose authority is server-derived (`ESF-6`).
 * `stated`    — declared by a person or by a governed record, as an input rather than a reading.
 * `derived`   — computed by CogniX from values that are themselves declared or observed.
 * `modelled`  — a declared assumption standing in for evidence that is absent.
 * `drafted`   — proposed by a model and not yet confirmed. Never authoritative.
 */
export type ProvenanceOrigin =
  | 'observed'
  | 'attested'
  | 'stated'
  | 'derived'
  | 'modelled'
  | 'drafted';

/**
 * HOW the value was produced. This is the dimension the Models & Methods register
 * publishes, so a reader can see where ML contributed, where Google GenAI did, and
 * where the answer is deterministic arithmetic.
 */
export type ProvenanceMethod =
  | 'measured'
  | 'rule'
  | 'statistical'
  | 'llm'
  | 'manual';

/**
 * WHETHER the value may stand as CogniX's answer. `ADR-044` already rules that a GenAI
 * draft is never evidence; this is that rule named as a field.
 */
export type ProvenanceAuthority = 'authoritative' | 'non_authoritative_draft';

export interface ProvenanceDescriptor {
  origin: ProvenanceOrigin;
  method: ProvenanceMethod;
  authority: ProvenanceAuthority;
}

export const PROVENANCE_ORIGINS: readonly ProvenanceOrigin[] = [
  'observed', 'attested', 'stated', 'derived', 'modelled', 'drafted'
];

export const PROVENANCE_METHODS: readonly ProvenanceMethod[] = [
  'measured', 'rule', 'statistical', 'llm', 'manual'
];

export const PROVENANCE_AUTHORITIES: readonly ProvenanceAuthority[] = [
  'authoritative', 'non_authoritative_draft'
];

/**
 * Reader-facing language for each origin. `modelled` is preferred over `synthetic` in
 * anything a client reads: the canonical record already calls itself a
 * `MODELLED_DEMONSTRATION_ASSUMPTION`, and it reads as engineering rigour rather than
 * as fabrication. `synthetic_demo` remains the machine-level flag.
 */
export const PROVENANCE_ORIGIN_LANGUAGE: Readonly<Record<ProvenanceOrigin, string>> = {
  observed: 'observed',
  attested: 'attested by a registered source',
  stated: 'stated',
  derived: 'derived by CogniX',
  modelled: 'modelled',
  drafted: 'drafted by AI'
};

export const PROVENANCE_METHOD_LANGUAGE: Readonly<Record<ProvenanceMethod, string>> = {
  measured: 'measurement',
  rule: 'a declared rule',
  statistical: 'a statistical model',
  llm: 'Google GenAI',
  manual: 'human judgement'
};

/** The one sentence a business user reads. ADR-082 part 3 in code. */
export function describeProvenance(descriptor: ProvenanceDescriptor, subject: string): string {
  const origin = PROVENANCE_ORIGIN_LANGUAGE[descriptor.origin];
  const method = PROVENANCE_METHOD_LANGUAGE[descriptor.method];
  const draft = descriptor.authority === 'non_authoritative_draft' ? ', and is not confirmed' : '';
  return `${subject} is ${origin}, through ${method}${draft}.`;
}

export function isAuthoritative(descriptor: ProvenanceDescriptor): boolean {
  return descriptor.authority === 'authoritative';
}

// ── Mappings from the five vocabularies the estate already carries ─────────────
// Each mapping is total over its source enum. A source value that gains a member and
// is not mapped here is a compile error at the call site rather than a silent default.

/** `EvidenceProvenance.origin` — the learning-loop evidence envelope. */
export type EvidenceProvenanceOrigin =
  | 'ESF-3_CONNECTOR'
  | 'ESF-1_SIMULATION'
  | 'WP10-C_SCENARIO'
  | 'ESF-6_ATTESTED_SOURCE'
  | 'UNKNOWN';

const EVIDENCE_ORIGIN_MAP: Readonly<Record<EvidenceProvenanceOrigin, ProvenanceDescriptor>> = {
  // A connector carries a reading taken outside CogniX and admitted under ESF-3.
  'ESF-3_CONNECTOR': { origin: 'observed', method: 'measured', authority: 'authoritative' },
  // The simulation fabric produces evidence from declared rules against the scenario clock.
  'ESF-1_SIMULATION': { origin: 'modelled', method: 'rule', authority: 'authoritative' },
  // Shared Decision State values are computed from the scenario's declared parameters.
  'WP10-C_SCENARIO': { origin: 'derived', method: 'rule', authority: 'authoritative' },
  // ESF-6 authority is server-derived from source registration, never from the payload.
  'ESF-6_ATTESTED_SOURCE': { origin: 'attested', method: 'measured', authority: 'authoritative' },
  // Unattributed evidence is never promoted to a stronger origin than it earned.
  UNKNOWN: { origin: 'stated', method: 'manual', authority: 'non_authoritative_draft' }
};

export function provenanceFromEvidenceOrigin(origin: EvidenceProvenanceOrigin): ProvenanceDescriptor {
  return EVIDENCE_ORIGIN_MAP[origin] ?? EVIDENCE_ORIGIN_MAP.UNKNOWN;
}

/** `DemandInputProvenanceClass` — the demand frontier's assumption inventory. */
export type DemandInputProvenanceClassValue =
  | 'SYNTHETIC_OBSERVED'
  | 'DERIVED_FROM_DECISION_STATE'
  | 'MODELLED_DEMO_ASSUMPTION'
  | 'DECLARED_OPERATIONAL_CONSTRAINT';

const DEMAND_INPUT_MAP: Readonly<Record<DemandInputProvenanceClassValue, ProvenanceDescriptor>> = {
  /*
   * Deliberately `modelled`, not `observed`. `SYNTHETIC_OBSERVED` is the Level-0
   * cognix-world observation class and AC-DDF-25 exists precisely so a synthetic value
   * cannot masquerade as client telemetry. Mapping it to `observed` here would undo
   * that ruling through the vocabulary.
   */
  SYNTHETIC_OBSERVED: { origin: 'modelled', method: 'rule', authority: 'authoritative' },
  DERIVED_FROM_DECISION_STATE: { origin: 'derived', method: 'rule', authority: 'authoritative' },
  MODELLED_DEMO_ASSUMPTION: { origin: 'modelled', method: 'rule', authority: 'authoritative' },
  DECLARED_OPERATIONAL_CONSTRAINT: { origin: 'stated', method: 'manual', authority: 'authoritative' }
};

export function provenanceFromDemandInputClass(
  value: DemandInputProvenanceClassValue
): ProvenanceDescriptor {
  return DEMAND_INPUT_MAP[value] ?? DEMAND_INPUT_MAP.MODELLED_DEMO_ASSUMPTION;
}

/** `TelemetryProvenance` — the learning-pattern telemetry classes. */
export type TelemetryProvenanceValue = 'measured' | 'derived' | 'seeded_demonstration' | 'unavailable';

const TELEMETRY_MAP: Readonly<Record<TelemetryProvenanceValue, ProvenanceDescriptor>> = {
  measured: { origin: 'observed', method: 'measured', authority: 'authoritative' },
  derived: { origin: 'derived', method: 'rule', authority: 'authoritative' },
  seeded_demonstration: { origin: 'modelled', method: 'rule', authority: 'authoritative' },
  /*
   * `unavailable` keeps the ATL-FINAL discipline: a reading that could not be taken is
   * declared unmeasured rather than reported as a zero the route could not earn. It maps
   * to a non-authoritative descriptor so nothing downstream can publish it as a value.
   */
  unavailable: { origin: 'stated', method: 'manual', authority: 'non_authoritative_draft' }
};

export function provenanceFromTelemetryProvenance(value: TelemetryProvenanceValue): ProvenanceDescriptor {
  return TELEMETRY_MAP[value] ?? TELEMETRY_MAP.unavailable;
}

/** The archetype decision-graph enum. */
export type ArchetypeGraphProvenance = 'SEEDED_OBSERVATION' | 'DERIVED' | 'SIMULATED' | 'SEEDED';

const ARCHETYPE_GRAPH_MAP: Readonly<Record<ArchetypeGraphProvenance, ProvenanceDescriptor>> = {
  /*
   * ADR-073 rule 4: behaviour may be seeded, economics must be derived. A seeded
   * observation is therefore a declared behavioural property — `stated`, not `observed`.
   */
  SEEDED_OBSERVATION: { origin: 'stated', method: 'manual', authority: 'authoritative' },
  DERIVED: { origin: 'derived', method: 'rule', authority: 'authoritative' },
  SIMULATED: { origin: 'modelled', method: 'rule', authority: 'authoritative' },
  SEEDED: { origin: 'stated', method: 'manual', authority: 'authoritative' }
};

export function provenanceFromArchetypeGraphProvenance(
  value: ArchetypeGraphProvenance
): ProvenanceDescriptor {
  return ARCHETYPE_GRAPH_MAP[value] ?? ARCHETYPE_GRAPH_MAP.SEEDED;
}

/** `ESF-6` attested-observation measurement basis, and the authority that carries it. */
export type AttestedMeasurementBasisValue = 'DIRECT_MEASUREMENT' | 'MODELLED';

export function provenanceFromAttestedBasis(
  basis: AttestedMeasurementBasisValue
): ProvenanceDescriptor {
  return basis === 'DIRECT_MEASUREMENT'
    ? { origin: 'attested', method: 'measured', authority: 'authoritative' }
    : { origin: 'modelled', method: 'rule', authority: 'authoritative' };
}

/** `EnterpriseSignal.source_type` — how a signal reached the fabric. */
export type SignalSourceTypeValue =
  | 'SYNTHETIC_WORLD'
  | 'EXTERNAL_CONNECTOR'
  | 'INTERNAL_SYSTEM'
  | 'DERIVED_ANALYTIC';

const SIGNAL_SOURCE_MAP: Readonly<Record<SignalSourceTypeValue, ProvenanceDescriptor>> = {
  SYNTHETIC_WORLD: { origin: 'modelled', method: 'rule', authority: 'authoritative' },
  EXTERNAL_CONNECTOR: { origin: 'observed', method: 'measured', authority: 'authoritative' },
  INTERNAL_SYSTEM: { origin: 'observed', method: 'measured', authority: 'authoritative' },
  DERIVED_ANALYTIC: { origin: 'derived', method: 'statistical', authority: 'authoritative' }
};

export function provenanceFromSignalSourceType(value: string): ProvenanceDescriptor {
  return SIGNAL_SOURCE_MAP[value as SignalSourceTypeValue] ?? SIGNAL_SOURCE_MAP.SYNTHETIC_WORLD;
}

/**
 * The descriptor a governed GenAI draft carries before a person confirms it (ADR-044,
 * extended to scenario drafting by ADR-044 Amendment B / ADR-083). Declared here so
 * `SCI-07` consumes the vocabulary rather than inventing a second one.
 */
export const GENAI_DRAFT_PROVENANCE: ProvenanceDescriptor = {
  origin: 'drafted',
  method: 'llm',
  authority: 'non_authoritative_draft'
};

/** The descriptor the canonical scenario's own declared values carry. */
export const MODELLED_SCENARIO_PROVENANCE: ProvenanceDescriptor = {
  origin: 'modelled',
  method: 'rule',
  authority: 'authoritative'
};

/** The descriptor every quantity a CogniX engine computes carries. */
export const DERIVED_ENGINE_PROVENANCE: ProvenanceDescriptor = {
  origin: 'derived',
  method: 'rule',
  authority: 'authoritative'
};

export function validateProvenanceDescriptor(
  descriptor: ProvenanceDescriptor
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!PROVENANCE_ORIGINS.includes(descriptor?.origin)) {
    errors.push(`provenance.origin must be one of ${PROVENANCE_ORIGINS.join(' | ')}`);
  }
  if (!PROVENANCE_METHODS.includes(descriptor?.method)) {
    errors.push(`provenance.method must be one of ${PROVENANCE_METHODS.join(' | ')}`);
  }
  if (!PROVENANCE_AUTHORITIES.includes(descriptor?.authority)) {
    errors.push(`provenance.authority must be one of ${PROVENANCE_AUTHORITIES.join(' | ')}`);
  }
  /*
   * ADR-044 / ADR-083: a drafted value is never authoritative. The vocabulary refuses
   * the combination rather than leaving it to each consumer to remember.
   */
  if (descriptor?.origin === 'drafted' && descriptor?.authority === 'authoritative') {
    errors.push('a drafted value may not carry authority: authoritative');
  }
  return { valid: errors.length === 0, errors };
}
