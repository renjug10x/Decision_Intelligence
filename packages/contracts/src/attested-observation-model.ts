/**
 * CogniX ESF-6 / Y3a — Attested Observation Admission Model
 *
 * Predicate: source × context → authority
 * Authority derives from server-side registry state; request payload cannot create authority.
 */

import { CanonicalSignalType } from './enterprise-signal-model';
import { ExternalSignalCategory } from './external-signal-connector-model';

export type GrainDimension = 'category' | 'region' | 'sku' | 'customer_segment';

export type AttestedSourceStatus = 'ACTIVE' | 'DISABLED' | 'REVOKED';

/** Closed. What a source is permitted to assert an observation ABOUT. */
export type ObservationCategory = 'REALISED_COMMERCIAL_ACTUAL' | 'REALISED_OPERATIONAL_ACTUAL';

/** Closed. The measurement designs a source is permitted to declare.
 *  CONTROLLED_DIFFERENCE is deliberately absent — CDI-08 §4.4 rejects it at validation, and a
 *  source must not be able to declare a capability the estate refuses to honour. */
export type AttestedMeasurementBasis = 'DIRECT_MEASUREMENT' | 'MODELLED';

/** A composite grain the source can observe at. Dimension sets, never individual dimensions —
 *  the capability question is "can you produce the joint cell?", which Z4 makes indivisible. */
export interface AttestedGrainCapability {
  dimensions: GrainDimension[];        // structural twin of the CDI-08 type; set semantics
}

export interface SourceAttestation {
  /** Named accountable human. Mandatory, never defaulted, never inferred from a session or header. */
  attested_by: string;
  /** What is being attested and on what authority. Mandatory, non-empty after trim. */
  attestation_statement: string;
  /** Closed single member. This is an operator declaration recorded server-side, NOT a
   *  cryptographic proof — see §10. It must never be rendered as one. */
  attestation_kind: 'FIRST_PARTY_OPERATOR_ATTESTATION';
}

export interface AttestedObservationSource {
  /** SERVER-ISSUED. Reserved prefix `asrc_`. A caller-supplied value is rejected, never honoured. */
  source_id: string;
  /** SERVER-ISSUED at registration. Reserved prefix `att_`. */
  attestation_id: string;
  tenant_id: string;                   // ownership; a foreign tenant never resolves this source
  display_name: string;
  /** Reused from ESF-3 unchanged — this is what maps to SignalSourceType. No new category. */
  category: ExternalSignalCategory;
  observation_categories: ObservationCategory[];
  supported_signal_types: CanonicalSignalType[];      // no widening of CanonicalSignalType
  supported_grain_capabilities: AttestedGrainCapability[];
  supported_measurement_bases: AttestedMeasurementBasis[];
  attestation: SourceAttestation;
  status: AttestedSourceStatus;
  /** SERVER-DERIVED, never accepted from a request body. `false` only via the attested path. */
  synthetic_demo: boolean;
  schema_version: string;
}

export type ReceiptKind =
  | 'SOURCE_REGISTRATION'
  | 'CONTRACT_REGISTRATION'
  | 'OBSERVATION_ADMISSION';

export interface ServerReceipt {
  /** SERVER-ISSUED. Reserved prefix `rcpt_`. */
  receipt_id: string;
  kind: ReceiptKind;
  tenant_id: string;
  session_id?: string;
  /** E4 — per-tenant strictly monotonic. THE ONLY ordering input. Never a timestamp. */
  sequence: number;
  /** What was registered: source_id | contract_id | observation_id. */
  subject_id: string;
  /** CONTRACT_REGISTRATION only — the digest at registration, proving envelope immutability. */
  contract_digest?: string;
  /** OBSERVATION_ADMISSION only — the source that produced it. */
  source_id?: string;
  /** Recorded for audit and display ONLY. Never read by any predicate, ordering or ranking (E4). */
  issued_at_display: string;
  schema_version: string;
}

export const RESERVED_SERVER_PREFIXES = ['asrc_', 'att_', 'rcpt_'] as const;
export const RESERVED_SERVER_FIELD_NAMES = [
  'attestation_id',
  'admission_receipt_id',
  'receipt_id',
  'sequence'
] as const;

export const ATTESTED_OBSERVATION_SCHEMA_VERSION = 'cognix.esf6.attested_observation.v1';

/**
 * Validates whether an arbitrary payload contains prohibited server-issued fields or values.
 * Fails closed if any field asserts a reserved prefix or reserved field name.
 */
export function checkNoReservedServerFields(
  payload: unknown,
  allowedFieldNames: string[] = []
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!payload || typeof payload !== 'object') {
    return { ok: true, errors: [] };
  }

  function inspect(obj: unknown, path: string): void {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => inspect(item, `${path}[${idx}]`));
      return;
    }

    const record = obj as Record<string, unknown>;
    for (const [key, value] of Object.entries(record)) {
      const currentPath = path ? `${path}.${key}` : key;

      // Check if key is a reserved server field
      if (
        (RESERVED_SERVER_FIELD_NAMES as readonly string[]).includes(key) &&
        !allowedFieldNames.includes(key)
      ) {
        errors.push(`SERVER_FIELD_ASSERTED: Reserved field '${key}' asserted at ${currentPath}`);
      }

      // Check if value is a string with a reserved prefix
      if (typeof value === 'string') {
        for (const prefix of RESERVED_SERVER_PREFIXES) {
          if (value.startsWith(prefix) && !allowedFieldNames.includes(key)) {
            errors.push(
              `SERVER_FIELD_ASSERTED: Value with reserved prefix '${prefix}' asserted at ${currentPath}: '${value}'`
            );
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        inspect(value, currentPath);
      }
    }
  }

  inspect(payload, '');
  return { ok: errors.length === 0, errors };
}

/**
 * Validates a SourceAttestation payload.
 */
export function validateSourceAttestation(attestation: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!attestation || typeof attestation !== 'object') {
    return { valid: false, errors: ['attestation must be an object'] };
  }

  const a = attestation as Partial<SourceAttestation>;
  if (!a.attested_by || typeof a.attested_by !== 'string' || !a.attested_by.trim()) {
    errors.push('attested_by is required and cannot be empty after trim');
  }
  if (!a.attestation_statement || typeof a.attestation_statement !== 'string' || !a.attestation_statement.trim()) {
    errors.push('attestation_statement is required and cannot be empty after trim');
  }
  if (a.attestation_kind !== 'FIRST_PARTY_OPERATOR_ATTESTATION') {
    errors.push("attestation_kind must be 'FIRST_PARTY_OPERATOR_ATTESTATION'");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates an AttestedObservationSource descriptor.
 */
export function validateAttestedObservationSource(source: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!source || typeof source !== 'object') {
    return { valid: false, errors: ['AttestedObservationSource must be an object'] };
  }

  const s = source as Partial<AttestedObservationSource>;
  if (!s.source_id || typeof s.source_id !== 'string' || !s.source_id.startsWith('asrc_')) {
    errors.push("source_id is required and must have server-issued prefix 'asrc_'");
  }
  if (!s.attestation_id || typeof s.attestation_id !== 'string' || !s.attestation_id.startsWith('att_')) {
    errors.push("attestation_id is required and must have server-issued prefix 'att_'");
  }
  if (!s.tenant_id || typeof s.tenant_id !== 'string' || !s.tenant_id.trim()) {
    errors.push('tenant_id is required');
  }
  if (!s.display_name || typeof s.display_name !== 'string' || !s.display_name.trim()) {
    errors.push('display_name is required');
  }
  if (!s.category || typeof s.category !== 'string') {
    errors.push('category is required');
  }
  if (!Array.isArray(s.observation_categories) || s.observation_categories.length === 0) {
    errors.push('observation_categories must be a non-empty array');
  } else {
    for (const cat of s.observation_categories) {
      if (cat !== 'REALISED_COMMERCIAL_ACTUAL' && cat !== 'REALISED_OPERATIONAL_ACTUAL') {
        errors.push(`Invalid observation category: ${cat}`);
      }
    }
  }
  if (!Array.isArray(s.supported_signal_types) || s.supported_signal_types.length === 0) {
    errors.push('supported_signal_types must be a non-empty array');
  }
  if (!Array.isArray(s.supported_grain_capabilities) || s.supported_grain_capabilities.length === 0) {
    errors.push('supported_grain_capabilities must be a non-empty array');
  } else {
    s.supported_grain_capabilities.forEach((cap, idx) => {
      if (!cap || !Array.isArray(cap.dimensions) || cap.dimensions.length === 0) {
        errors.push(`supported_grain_capabilities[${idx}] must declare non-empty dimensions array`);
      }
    });
  }
  if (!Array.isArray(s.supported_measurement_bases) || s.supported_measurement_bases.length === 0) {
    errors.push('supported_measurement_bases must be a non-empty array');
  } else {
    for (const basis of s.supported_measurement_bases) {
      if (basis !== 'DIRECT_MEASUREMENT' && basis !== 'MODELLED') {
        errors.push(`Invalid supported measurement basis: ${basis} (CONTROLLED_DIFFERENCE is not permitted)`);
      }
    }
  }

  const attValidation = validateSourceAttestation(s.attestation);
  if (!attValidation.valid) {
    errors.push(...attValidation.errors);
  }

  if (s.status !== 'ACTIVE' && s.status !== 'DISABLED' && s.status !== 'REVOKED') {
    errors.push("status must be 'ACTIVE' | 'DISABLED' | 'REVOKED'");
  }
  if (typeof s.synthetic_demo !== 'boolean') {
    errors.push('synthetic_demo must be a boolean');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a ServerReceipt record.
 */
export function validateServerReceipt(receipt: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!receipt || typeof receipt !== 'object') {
    return { valid: false, errors: ['ServerReceipt must be an object'] };
  }

  const r = receipt as Partial<ServerReceipt>;
  if (!r.receipt_id || typeof r.receipt_id !== 'string' || !r.receipt_id.startsWith('rcpt_')) {
    errors.push("receipt_id is required and must have prefix 'rcpt_'");
  }
  if (r.kind !== 'SOURCE_REGISTRATION' && r.kind !== 'CONTRACT_REGISTRATION' && r.kind !== 'OBSERVATION_ADMISSION') {
    errors.push("kind must be 'SOURCE_REGISTRATION' | 'CONTRACT_REGISTRATION' | 'OBSERVATION_ADMISSION'");
  }
  if (!r.tenant_id || typeof r.tenant_id !== 'string' || !r.tenant_id.trim()) {
    errors.push('tenant_id is required');
  }
  if (typeof r.sequence !== 'number' || !Number.isInteger(r.sequence) || r.sequence < 1) {
    errors.push('sequence must be a positive integer');
  }
  if (!r.subject_id || typeof r.subject_id !== 'string' || !r.subject_id.trim()) {
    errors.push('subject_id is required');
  }
  if (r.kind === 'CONTRACT_REGISTRATION' && (!r.contract_digest || !r.contract_digest.trim())) {
    errors.push('contract_digest is required for CONTRACT_REGISTRATION receipt');
  }
  if (r.kind === 'OBSERVATION_ADMISSION' && (!r.source_id || !r.source_id.trim())) {
    errors.push('source_id is required for OBSERVATION_ADMISSION receipt');
  }
  if (!r.issued_at_display || typeof r.issued_at_display !== 'string') {
    errors.push('issued_at_display is required');
  }

  return { valid: errors.length === 0, errors };
}
