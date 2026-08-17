/**
 * CogniX ESF-6 / Y3a — Attested Observation Store & Admission Predicate
 *
 * Implements:
 * - ServerReceiptStore with per-tenant strictly monotonic sequence counters (E4)
 * - AttestedObservationSource registry with federated resolution (E1)
 * - Admission predicate A0–A9 (§5)
 * - Contract registration receipt issuance (E3 / W1 / W2)
 * - Shared lifetime invariant (E4)
 */

import {
  AttestedObservationSource,
  AttestedSourceStatus,
  ObservationCategory,
  AttestedMeasurementBasis,
  AttestedGrainCapability,
  SourceAttestation,
  ServerReceipt,
  ReceiptKind,
  RESERVED_SERVER_PREFIXES,
  RESERVED_SERVER_FIELD_NAMES,
  ATTESTED_OBSERVATION_SCHEMA_VERSION,
  checkNoReservedServerFields,
  validateSourceAttestation,
  validateAttestedObservationSource,
  validateServerReceipt,
  CanonicalSignalType,
  ExternalSignalCategory,
  SignalSourceType,
  SignalEntityType,
  OutcomeObservation,
  ObservationGrainKey,
  EvidenceProvenance,
  SYNTHETIC_OBSERVATION_DISCLOSURE,
  DecisionContract,
  computeContractDigest,
  validateDecisionContract,
  mapCategoryToSourceType,
  determineObservationAuthority,
  ObservationAuthorityEvaluationContext,
  ExternalSignalConnectorDescriptor
} from '../packages/contracts/src/index';
import { getExternalSignalConnector } from '../services/world/src/external-signal-connector';

import { createHash } from 'crypto';

function contentId(parts: (string | number | undefined | null)[]): string {
  const norm = parts.map(p => (p === undefined || p === null ? '' : String(p))).join('::');
  return createHash('sha256').update(norm, 'utf8').digest('hex').slice(0, 16);
}

export type { AttestedObservationSource, ServerReceipt };

export interface RegisterAttestedSourceRequest {
  tenant_id: string;
  display_name: string;
  category: ExternalSignalCategory;
  observation_categories: ObservationCategory[];
  supported_signal_types: CanonicalSignalType[];
  supported_grain_capabilities: AttestedGrainCapability[];
  supported_measurement_bases: AttestedMeasurementBasis[];
  attestation: {
    attested_by: string;
    attestation_statement: string;
    attestation_kind: 'FIRST_PARTY_OPERATOR_ATTESTATION';
  };
}

export interface ObservationAdmissionRequest {
  tenant_id: string;
  session_id?: string;
  source_id: string;
  observation_category: ObservationCategory;
  signal_type: CanonicalSignalType;
  grain_key: ObservationGrainKey | Record<string, string>;
  measurement_window: { start: string; end: string };
  measurement_design: AttestedMeasurementBasis;
  observed_quantity: number;
  baseline_quantity?: number;
  unit: string;
  entity_type?: SignalEntityType;
  entity_id?: string;
  source_system?: string;
  confidence?: number;
  quality?: number;
  synthetic_demo?: boolean;
}

export interface AdmissionResult {
  ok: boolean;
  rejection?: string;
  error_details?: string;
  observation?: OutcomeObservation;
  receipt?: ServerReceipt;
}

/**
 * Normalises a grain key into a list of dimension names.
 */
function extractGrainDimensions(grainKey: ObservationGrainKey | Record<string, string> | undefined): string[] {
  if (!grainKey) return [];
  if (typeof grainKey === 'object' && 'dimensions' in grainKey && Array.isArray((grainKey as ObservationGrainKey).dimensions)) {
    return (grainKey as ObservationGrainKey).dimensions.map(d => d.dimension).sort();
  }
  return Object.keys(grainKey).sort();
}

/**
 * Normalises a grain key into canonical ObservationGrainKey structure.
 */
function normalizeToObservationGrainKey(grainKey: ObservationGrainKey | Record<string, string>): ObservationGrainKey {
  if (typeof grainKey === 'object' && 'dimensions' in grainKey && Array.isArray((grainKey as ObservationGrainKey).dimensions)) {
    return grainKey as ObservationGrainKey;
  }
  const dims = Object.entries(grainKey as Record<string, string>).map(([dimension, token]) => ({
    dimension: dimension as ObservationGrainKey['dimensions'][0]['dimension'],
    token: String(token)
  }));
  return { dimensions: dims };
}

class AttestedObservationStore {
  // Shared lifetime invariant: counters, receipts, and sources share state lifetime (E4)
  private sequenceByTenant = new Map<string, number>();
  private receiptsById = new Map<string, ServerReceipt>();
  private contractReceipts = new Map<string, ServerReceipt>(); // key: `${tenant_id}::${contract_id}`
  private sourceReceipts = new Map<string, ServerReceipt>(); // key: `${tenant_id}::${source_id}`
  private sourcesById = new Map<string, AttestedObservationSource>(); // key: `${tenant_id}::${source_id}`
  private observationsById = new Map<string, OutcomeObservation>();

  /**
   * Clears all store state simultaneously (E4 lifetime invariant).
   */
  public clear(): void {
    this.sequenceByTenant.clear();
    this.receiptsById.clear();
    this.contractReceipts.clear();
    this.sourceReceipts.clear();
    this.sourcesById.clear();
    this.observationsById.clear();
  }

  /**
   * E4 — strictly monotonic per-tenant counter.
   */
  public nextSequence(tenantId: string): number {
    const current = this.sequenceByTenant.get(tenantId) || 0;
    const next = current + 1;
    this.sequenceByTenant.set(tenantId, next);
    return next;
  }

  public currentSequence(tenantId: string): number {
    return this.sequenceByTenant.get(tenantId) || 0;
  }

  /**
   * Issues and records a ServerReceipt.
   */
  public issueReceipt(params: {
    kind: ReceiptKind;
    tenant_id: string;
    session_id?: string;
    subject_id: string;
    contract_digest?: string;
    source_id?: string;
  }): ServerReceipt {
    const seq = this.nextSequence(params.tenant_id);
    const receipt_id = `rcpt_${contentId([params.tenant_id, params.subject_id, String(seq)])}`;
    const receipt: ServerReceipt = {
      receipt_id,
      kind: params.kind,
      tenant_id: params.tenant_id,
      session_id: params.session_id,
      sequence: seq,
      subject_id: params.subject_id,
      contract_digest: params.contract_digest,
      source_id: params.source_id,
      issued_at_display: new Date().toISOString(),
      schema_version: ATTESTED_OBSERVATION_SCHEMA_VERSION
    };

    this.receiptsById.set(`${params.tenant_id}::${receipt_id}`, receipt);

    if (params.kind === 'CONTRACT_REGISTRATION') {
      this.contractReceipts.set(`${params.tenant_id}::${params.subject_id}`, receipt);
    } else if (params.kind === 'SOURCE_REGISTRATION') {
      this.sourceReceipts.set(`${params.tenant_id}::${params.subject_id}`, receipt);
      // The attestation_id index is written by registerSource, which is the only path that
      // knows the attestation_id actually issued. Recomputing it here from a different content
      // tuple produced an id that could never be looked up.
    }

    return receipt;
  }

  public getReceipt(receiptId: string, tenantId: string): ServerReceipt | null {
    return this.receiptsById.get(`${tenantId}::${receiptId}`) || null;
  }

  public getContractRegistrationReceipt(contractId: string, tenantId: string): ServerReceipt | null {
    return this.contractReceipts.get(`${tenantId}::${contractId}`) || null;
  }

  public getSourceRegistrationReceipt(sourceId: string, tenantId: string): ServerReceipt | null {
    return this.sourceReceipts.get(`${tenantId}::${sourceId}`) || null;
  }

  public listReceiptsForTenant(tenantId: string): ServerReceipt[] {
    const out: ServerReceipt[] = [];
    for (const [key, r] of this.receiptsById.entries()) {
      if (key.startsWith(`${tenantId}::`)) {
        out.push(r);
      }
    }
    return out.sort((a, b) => a.sequence - b.sequence);
  }

  /**
   * Registers a DecisionContract and issues a CONTRACT_REGISTRATION receipt.
   */
  public registerContract(contract: DecisionContract): { ok: true; receipt: ServerReceipt } | { ok: false; errors: string[] } {
    const validation = validateDecisionContract(contract);
    if (!validation.valid) {
      return { ok: false, errors: validation.errors };
    }

    const digest = computeContractDigest(contract);
    const receipt = this.issueReceipt({
      kind: 'CONTRACT_REGISTRATION',
      tenant_id: contract.tenant_id,
      session_id: contract.session_id,
      subject_id: contract.contract_id,
      contract_digest: digest
    });

    return { ok: true, receipt };
  }

  /**
   * Registers a new AttestedObservationSource (E1 / §4.1).
   */
  public registerSource(
    request: RegisterAttestedSourceRequest
  ): { ok: true; source: AttestedObservationSource; receipt: ServerReceipt } | { ok: false; errors: string[] } {
    // Check no reserved server fields or prefixes asserted in request body
    const reservedCheck = checkNoReservedServerFields(request);
    if (!reservedCheck.ok) {
      return { ok: false, errors: reservedCheck.errors };
    }

    const errors: string[] = [];
    if (!request.tenant_id || !request.tenant_id.trim()) {
      errors.push('tenant_id is required');
    }
    if (!request.display_name || !request.display_name.trim()) {
      errors.push('display_name is required');
    }
    if (!request.category) {
      errors.push('category is required');
    }
    if (!Array.isArray(request.observation_categories) || request.observation_categories.length === 0) {
      errors.push('observation_categories must be a non-empty array');
    } else {
      for (const cat of request.observation_categories) {
        if (cat !== 'REALISED_COMMERCIAL_ACTUAL' && cat !== 'REALISED_OPERATIONAL_ACTUAL') {
          errors.push(`Invalid observation category: ${cat}`);
        }
      }
    }
    if (!Array.isArray(request.supported_signal_types) || request.supported_signal_types.length === 0) {
      errors.push('supported_signal_types must be a non-empty array');
    }
    if (!Array.isArray(request.supported_grain_capabilities) || request.supported_grain_capabilities.length === 0) {
      errors.push('supported_grain_capabilities must be a non-empty array');
    } else {
      for (const cap of request.supported_grain_capabilities) {
        if (!cap || !Array.isArray(cap.dimensions) || cap.dimensions.length === 0) {
          errors.push('Grain capability must declare a non-empty dimensions array');
        }
      }
    }
    if (!Array.isArray(request.supported_measurement_bases) || request.supported_measurement_bases.length === 0) {
      errors.push('supported_measurement_bases must be a non-empty array');
    } else {
      for (const b of request.supported_measurement_bases) {
        if (b !== 'DIRECT_MEASUREMENT' && b !== 'MODELLED') {
          errors.push(`Invalid measurement basis: ${b} (CONTROLLED_DIFFERENCE is not permitted)`);
        }
      }
    }

    const attVal = validateSourceAttestation(request.attestation);
    if (!attVal.valid) {
      errors.push(...attVal.errors);
    }

    if (errors.length > 0) {
      return { ok: false, errors };
    }

    const tenantId = request.tenant_id.trim();
    // Issue sequence for source and attestation
    const seq = this.nextSequence(tenantId);
    const sourceId = `asrc_${contentId([tenantId, request.display_name.trim(), String(seq)])}`;
    const attestationId = `att_${contentId([tenantId, request.attestation.attested_by.trim(), String(seq)])}`;

    const source: AttestedObservationSource = {
      source_id: sourceId,
      attestation_id: attestationId,
      tenant_id: tenantId,
      display_name: request.display_name.trim(),
      category: request.category,
      observation_categories: request.observation_categories,
      supported_signal_types: request.supported_signal_types,
      supported_grain_capabilities: request.supported_grain_capabilities,
      supported_measurement_bases: request.supported_measurement_bases,
      attestation: {
        attested_by: request.attestation.attested_by.trim(),
        attestation_statement: request.attestation.attestation_statement.trim(),
        attestation_kind: 'FIRST_PARTY_OPERATOR_ATTESTATION'
      },
      status: 'ACTIVE',
      synthetic_demo: false,
      schema_version: ATTESTED_OBSERVATION_SCHEMA_VERSION
    };

    // Issue SOURCE_REGISTRATION receipt
    const receipt_id = `rcpt_${contentId([tenantId, sourceId, String(seq)])}`;
    const receipt: ServerReceipt = {
      receipt_id,
      kind: 'SOURCE_REGISTRATION',
      tenant_id: tenantId,
      sequence: seq,
      subject_id: sourceId,
      issued_at_display: new Date().toISOString(),
      schema_version: ATTESTED_OBSERVATION_SCHEMA_VERSION
    };

    this.receiptsById.set(`${tenantId}::${receipt_id}`, receipt);
    this.receiptsById.set(`${tenantId}::${attestationId}`, receipt);
    this.sourceReceipts.set(`${tenantId}::${sourceId}`, receipt);
    this.sourcesById.set(`${tenantId}::${sourceId}`, source);

    return { ok: true, source, receipt };
  }

  public getSource(sourceId: string, tenantId: string): AttestedObservationSource | null {
    return this.sourcesById.get(`${tenantId}::${sourceId}`) || null;
  }

  public listSources(tenantId: string): AttestedObservationSource[] {
    const list: AttestedObservationSource[] = [];
    for (const [key, s] of this.sourcesById.entries()) {
      if (key.startsWith(`${tenantId}::`)) {
        list.push(s);
      }
    }
    return list;
  }

  public revokeSource(sourceId: string, tenantId: string): { ok: boolean; error?: string } {
    const source = this.getSource(sourceId, tenantId);
    if (!source) {
      return { ok: false, error: `Source not found: ${sourceId}` };
    }
    source.status = 'REVOKED';
    return { ok: true };
  }

  public disableSource(sourceId: string, tenantId: string): { ok: boolean; error?: string } {
    const source = this.getSource(sourceId, tenantId);
    if (!source) {
      return { ok: false, error: `Source not found: ${sourceId}` };
    }
    source.status = 'DISABLED';
    return { ok: true };
  }

  /**
   * Federated source resolution (E1):
   * 1. ESF-6 attested source registry first
   * 2. ESF-3 reference connector registry second
   */
  public resolveSourceFederated(
    id: string,
    tenantId: string
  ): { kind: 'ATTESTED'; source: AttestedObservationSource } | { kind: 'CONNECTOR'; connector: ExternalSignalConnectorDescriptor } | null {
    const attested = this.getSource(id, tenantId);
    if (attested) return { kind: 'ATTESTED', source: attested };

    const connector = getExternalSignalConnector(id);
    if (connector) return { kind: 'CONNECTOR', connector };

    return null;
  }

  /**
   * The Admission Predicate (§5 A0–A9):
   * source × context -> admissibility
   * First failure wins; no test skipped; fail-closed.
   */
  public admitObservation(request: ObservationAdmissionRequest): AdmissionResult {
    // A0 — Reserved fields check: no server-issued identifier or sequence in request payload
    const reservedCheck = checkNoReservedServerFields(request, ['source_id']);
    if (!reservedCheck.ok) {
      return {
        ok: false,
        rejection: 'SERVER_FIELD_ASSERTED',
        error_details: reservedCheck.errors.join('; ')
      };
    }

    // A1 — Source resolves in ESF-6 registry
    const source = this.getSource(request.source_id, request.tenant_id);
    if (!source) {
      return {
        ok: false,
        rejection: 'UNKNOWN_SOURCE',
        error_details: `Source ${request.source_id} not found in ESF-6 registry for tenant ${request.tenant_id}`
      };
    }

    // A2 — Tenant ownership and session coherence
    if (source.tenant_id !== request.tenant_id) {
      return {
        ok: false,
        rejection: 'SOURCE_TENANT_MISMATCH',
        error_details: `Source tenant (${source.tenant_id}) does not match request tenant (${request.tenant_id})`
      };
    }
    if (request.session_id !== undefined && (!request.session_id || !request.session_id.trim())) {
      return {
        ok: false,
        rejection: 'MALFORMED_PROVENANCE',
        error_details: 'session_id if provided must not be blank'
      };
    }

    // A3 — Source live
    if (source.status === 'DISABLED') {
      return {
        ok: false,
        rejection: 'SOURCE_DISABLED',
        error_details: `Source ${source.source_id} is DISABLED`
      };
    }
    if (source.status === 'REVOKED') {
      return {
        ok: false,
        rejection: 'SOURCE_REVOKED',
        error_details: `Source ${source.source_id} is REVOKED`
      };
    }

    // A4 — Observation category
    if (!source.observation_categories.includes(request.observation_category)) {
      return {
        ok: false,
        rejection: 'OBSERVATION_CATEGORY_NOT_PERMITTED',
        error_details: `Observation category ${request.observation_category} not permitted by source ${source.source_id}`
      };
    }

    // A5 — Signal type
    if (!source.supported_signal_types.includes(request.signal_type)) {
      return {
        ok: false,
        rejection: 'SIGNAL_TYPE_NOT_PERMITTED',
        error_details: `Signal type ${request.signal_type} not permitted by source ${source.source_id}`
      };
    }

    // A6 — Grain capability (dimension set equality, not subset, not superset, Z4)
    const reqDims = extractGrainDimensions(request.grain_key);
    const hasMatchingGrain = source.supported_grain_capabilities.some(cap => {
      const capDims = [...cap.dimensions].sort();
      return capDims.length === reqDims.length && capDims.every((d, i) => d === reqDims[i]);
    });
    if (!hasMatchingGrain) {
      return {
        ok: false,
        rejection: 'GRAIN_NOT_PERMITTED',
        error_details: `Grain dimension set [${reqDims.join(', ')}] not declared in source supported grain capabilities`
      };
    }

    // A7 — Measurement basis
    if (
      (request.measurement_design as string) === 'CONTROLLED_DIFFERENCE' ||
      !source.supported_measurement_bases.includes(request.measurement_design)
    ) {
      return {
        ok: false,
        rejection: 'MEASUREMENT_BASIS_NOT_PERMITTED',
        error_details: `Measurement design ${request.measurement_design} not permitted by source ${source.source_id}`
      };
    }

    // A8 — Provenance well-formed: measurement window bounds present, parseable, start <= end; entity/grain non-empty
    if (
      !request.measurement_window ||
      !request.measurement_window.start ||
      !request.measurement_window.end ||
      typeof request.measurement_window.start !== 'string' ||
      typeof request.measurement_window.end !== 'string'
    ) {
      return {
        ok: false,
        rejection: 'MALFORMED_PROVENANCE',
        error_details: 'Measurement window must include non-empty start and end string bounds'
      };
    }
    const startMs = Date.parse(request.measurement_window.start);
    const endMs = Date.parse(request.measurement_window.end);
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || startMs > endMs) {
      return {
        ok: false,
        rejection: 'MALFORMED_PROVENANCE',
        error_details: `Measurement window [${request.measurement_window.start} -> ${request.measurement_window.end}] is invalid (start > end or unparseable)`
      };
    }
    if (!request.unit || !request.unit.trim()) {
      return {
        ok: false,
        rejection: 'MALFORMED_PROVENANCE',
        error_details: 'unit is required'
      };
    }
    if (request.entity_id !== undefined && !request.entity_id.trim()) {
      return {
        ok: false,
        rejection: 'MALFORMED_PROVENANCE',
        error_details: 'entity_id if provided must not be blank'
      };
    }

    // A9 — Attestation intact: source.attestation present with non-empty fields and attestation_id resolves
    if (
      !source.attestation ||
      !source.attestation.attested_by ||
      !source.attestation.attested_by.trim() ||
      !source.attestation.attestation_statement ||
      !source.attestation.attestation_statement.trim()
    ) {
      return {
        ok: false,
        rejection: 'ATTESTATION_UNRESOLVED',
        error_details: 'Source attestation declaration is incomplete'
      };
    }
    const attReceipt = this.getReceipt(source.attestation_id, source.tenant_id);
    if (!attReceipt) {
      return {
        ok: false,
        rejection: 'ATTESTATION_UNRESOLVED',
        error_details: `Attestation ID ${source.attestation_id} does not resolve to a server registration receipt`
      };
    }

    // All A0–A9 pass: Admit observation, issue receipt, derive authority (E2, E7)
    const effectiveSynthetic = Boolean(request.synthetic_demo || source.synthetic_demo);
    const confidenceProvenance = request.confidence !== undefined ? 'SUPPLIED' : 'ADAPTER_DEFAULT';
    const qualityProvenance = request.quality !== undefined ? 'SUPPLIED' : 'ADAPTER_DEFAULT';
    const confidenceVal = request.confidence ?? 80;
    const qualityVal = request.quality ?? 85;

    const seq = this.nextSequence(request.tenant_id);
    const observation_id = `obs_att_${contentId([source.source_id, request.tenant_id, request.session_id || 'tenant_wide', String(seq)])}`;
    const receipt_id = `rcpt_${contentId([request.tenant_id, observation_id, String(seq)])}`;

    const receipt: ServerReceipt = {
      receipt_id,
      kind: 'OBSERVATION_ADMISSION',
      tenant_id: request.tenant_id,
      session_id: request.session_id,
      sequence: seq,
      subject_id: observation_id,
      source_id: source.source_id,
      issued_at_display: new Date().toISOString(),
      schema_version: ATTESTED_OBSERVATION_SCHEMA_VERSION
    };

    this.receiptsById.set(`${request.tenant_id}::${receipt_id}`, receipt);

    const provenance: EvidenceProvenance = {
      origin: 'ESF-6_ATTESTED_SOURCE',
      connector_id: source.source_id,
      envelope_id: `env_${source.source_id}_${seq}`,
      adapter_version: '1.0.0',
      source_system: request.source_system || source.display_name,
      metrics_supplied: true,
      confidence: confidenceVal,
      quality: qualityVal,
      confidence_provenance: confidenceProvenance,
      quality_provenance: qualityProvenance,
      attestation_id: source.attestation_id,
      admission_receipt_id: receipt_id,
      synthetic_demo: effectiveSynthetic,
      ...(effectiveSynthetic ? { synthetic_disclosure: SYNTHETIC_OBSERVATION_DISCLOSURE } : {})
    };

    const sourceType = mapCategoryToSourceType(source.category);
    const canonicalGrain = normalizeToObservationGrainKey(request.grain_key);

    const deltaPct = request.baseline_quantity !== undefined && request.baseline_quantity !== 0
      ? ((request.observed_quantity - request.baseline_quantity) / request.baseline_quantity) * 100
      : (request.unit === 'pp' || request.unit === 'percent')
        ? request.observed_quantity
        : 0;

    const draftObservation: OutcomeObservation = {
      observation_id,
      tenant_id: request.tenant_id,
      session_id: request.session_id || '',
      signal_id: `sig_${observation_id}`,
      connector_id: source.source_id,
      external_category: source.category,
      signal_type: request.signal_type,
      source_type: sourceType,
      entity_type: request.entity_type || 'CAMPAIGN',
      entity_id: request.entity_id || request.tenant_id,
      baseline_value: request.baseline_quantity ?? 0,
      observed_value: request.observed_quantity,
      delta_pct: deltaPct,
      unit: request.unit,
      observed_at: request.measurement_window.end,
      effective_at: request.measurement_window.end,
      authority: 'AUTHORITATIVE_EXTERNAL', // populated below via determineObservationAuthority
      provenance,
      completeness: {
        covered_quantities: [],
        missing_quantities: [],
        window_start_observed: true,
        window_end_observed: true,
        adapter_capability_gap: false,
        gap_reasons: [],
        complete: true
      },
      synthetic_demo: effectiveSynthetic,
      schema_version: ATTESTED_OBSERVATION_SCHEMA_VERSION,
      grain_key: canonicalGrain,
      measurement_window_start: request.measurement_window.start,
      measurement_window_end: request.measurement_window.end,
      measurement_design: request.measurement_design,
      admission_receipt_id: receipt_id,
      source_id: source.source_id
    };

    // Admission-time authority. Every field is derived from registry state, never echoed from the
    // request. `comparison_invariants` is contract-owned and unknown here: admission has no
    // contract, so no contract semantics are invented. determineObservationAuthority does not
    // read them (nor confidence/quality — E7); correspondence against a real contract is CDI-08's
    // job and runs independently at comparison time (E6).
    const authContext: ObservationAuthorityEvaluationContext = {
      connector_synthetic_demo: source.synthetic_demo,
      connector_status: source.status === 'ACTIVE' ? 'AVAILABLE' : 'DISABLED',
      connector_resolves: !!this.getSource(source.source_id, request.tenant_id),
      scenario_derived_lineage: false,
      planned_start: null,
      comparison_invariants: {
        category: '',
        region: '',
        sku_scope: [],
        customer_segment: '',
        timing_mode: 'KNOWN_DATES',
        planned_start: '',
        planned_end: '',
        objective_type: 'VOLUME',
        primary_metric: 'VOLUME',
        target_direction: 'INCREASE',
        tenant_id: request.tenant_id,
        session_id: request.session_id || ''
      },
      admission_receipt_resolves: !!this.resolveAdmissionReceiptFor(draftObservation, request.tenant_id),
      resolved_source_type: sourceType
    };

    draftObservation.authority = determineObservationAuthority(draftObservation, authContext);

    this.observationsById.set(`${request.tenant_id}::${observation_id}`, draftObservation);

    return {
      ok: true,
      observation: draftObservation,
      receipt
    };
  }

  public getObservation(observationId: string, tenantId: string): OutcomeObservation | null {
    return this.observationsById.get(`${tenantId}::${observationId}`) || null;
  }

  /**
   * Resolves the admission receipt that BINDS a specific observation, or null.
   *
   * A receipt only witnesses the observation it was issued for. Three facts must hold
   * together; any one alone is forgeable by a caller who holds an unrelated receipt id:
   *   - the receipt resolves under this tenant
   *   - its kind is OBSERVATION_ADMISSION (a SOURCE_REGISTRATION or CONTRACT_REGISTRATION
   *     receipt is not an admission and must never stand in for one)
   *   - its subject_id is this observation
   *
   * Without the kind and subject tests a body-supplied observation could present any receipt
   * the tenant has ever been issued and be read as admitted. Fail closed.
   */
  public resolveAdmissionReceiptFor(
    observation: Pick<OutcomeObservation, 'observation_id' | 'admission_receipt_id'>,
    tenantId: string
  ): ServerReceipt | null {
    if (!observation.admission_receipt_id) return null;
    const receipt = this.getReceipt(observation.admission_receipt_id, tenantId);
    if (!receipt) return null;
    if (receipt.tenant_id !== tenantId) return null;
    if (receipt.kind !== 'OBSERVATION_ADMISSION') return null;
    if (receipt.subject_id !== observation.observation_id) return null;
    return receipt;
  }
}

export const attestedObservationStore = new AttestedObservationStore();
