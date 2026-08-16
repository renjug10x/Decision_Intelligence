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
    dimensions: GrainDimension[];
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
    tenant_id: string;
    display_name: string;
    /** Reused from ESF-3 unchanged — this is what maps to SignalSourceType. No new category. */
    category: ExternalSignalCategory;
    observation_categories: ObservationCategory[];
    supported_signal_types: CanonicalSignalType[];
    supported_grain_capabilities: AttestedGrainCapability[];
    supported_measurement_bases: AttestedMeasurementBasis[];
    attestation: SourceAttestation;
    status: AttestedSourceStatus;
    /** SERVER-DERIVED, never accepted from a request body. `false` only via the attested path. */
    synthetic_demo: boolean;
    schema_version: string;
}
export type ReceiptKind = 'SOURCE_REGISTRATION' | 'CONTRACT_REGISTRATION' | 'OBSERVATION_ADMISSION';
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
export declare const RESERVED_SERVER_PREFIXES: readonly ["asrc_", "att_", "rcpt_"];
export declare const RESERVED_SERVER_FIELD_NAMES: readonly ["attestation_id", "admission_receipt_id", "receipt_id", "sequence"];
export declare const ATTESTED_OBSERVATION_SCHEMA_VERSION = "cognix.esf6.attested_observation.v1";
/**
 * Validates whether an arbitrary payload contains prohibited server-issued fields or values.
 * Fails closed if any field asserts a reserved prefix or reserved field name.
 */
export declare function checkNoReservedServerFields(payload: unknown, allowedFieldNames?: string[]): {
    ok: boolean;
    errors: string[];
};
/**
 * Validates a SourceAttestation payload.
 */
export declare function validateSourceAttestation(attestation: unknown): {
    valid: boolean;
    errors: string[];
};
/**
 * Validates an AttestedObservationSource descriptor.
 */
export declare function validateAttestedObservationSource(source: unknown): {
    valid: boolean;
    errors: string[];
};
/**
 * Validates a ServerReceipt record.
 */
export declare function validateServerReceipt(receipt: unknown): {
    valid: boolean;
    errors: string[];
};
