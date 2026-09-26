/**
 * CogniX Attested Upload (`SCI-10`, ADR-086)
 * Enriches a DRAFT with measured inputs from a first-party CSV extract. It never certifies,
 * confirms, activates or executes, and it carries no published quantity.
 */
import type { SourceAttestation } from './attested-observation-model';
import type { ProvenanceDescriptor } from './provenance-vocabulary';
import type { ScenarioDraftFieldId } from './scenario-draft-model';

export const ATTESTED_UPLOAD_SCHEMA_VERSION = 'cognix.sci10.attested_upload.v1' as const;
export const ATTESTED_UPLOAD_ID_PREFIX = 'upl_' as const;

export const ATTESTED_UPLOAD_LIMITS = {
  max_bytes: 5 * 1024 * 1024,
  max_rows: 50_000,
  max_columns: 60,
  min_periods: 4,
  profile_retention_minutes: 30,
  max_samples_to_model: 3
} as const;

/** Grain columns: required, never scenario fields. */
export const ATTESTED_UPLOAD_GRAIN_COLUMNS = ['period_end', 'sku_id'] as const;

export type AttestedUploadReduction = 'MEAN_OF_PERIODS' | 'LATEST_PERIOD';

/** Closed. The only fields an upload may set, and the only rule each may be reduced by. */
export const ATTESTED_UPLOAD_ADMISSIBLE_FIELDS: Readonly<Partial<Record<ScenarioDraftFieldId, AttestedUploadReduction>>> = {
  base_demand_units_per_week: 'MEAN_OF_PERIODS',
  waste_units_per_week: 'MEAN_OF_PERIODS',
  national_store_count: 'LATEST_PERIOD',
  online_demand_share_pct: 'LATEST_PERIOD',
  gross_margin_rate_pct: 'LATEST_PERIOD',
  store_cover_days: 'LATEST_PERIOD',
  distribution_centre_cover_days: 'LATEST_PERIOD',
  on_order_cover_days: 'LATEST_PERIOD'
};

export type AttestedUploadState =
  | 'RECEIVED'     // bytes accepted, fingerprinted; not yet parsed
  | 'PROFILED'     // valid in form; profile and mapping proposals available
  | 'ADMITTED'     // values written into the draft; receipt issued
  | 'REFUSED'      // terminal; nothing admitted
  | 'WITHDRAWN'    // was ADMITTED; its values removed from the (still DRAFT) draft
  | 'EXPIRED';     // PROFILED and not admitted within the retention window

export type AttestedUploadRefusalReason =
  | 'UNSUPPORTED_MEDIA_TYPE' | 'TOO_LARGE' | 'TOO_MANY_ROWS' | 'TOO_MANY_COLUMNS' | 'NOT_UTF8'
  | 'NO_HEADER_ROW' | 'MALFORMED_CSV' | 'DUPLICATE_HEADER' | 'PERSONAL_DATA_COLUMN'
  | 'MISSING_REQUIRED_COLUMN' | 'GRAIN_MISMATCH' | 'FUTURE_PERIOD' | 'INSUFFICIENT_PERIODS'
  | 'NON_NUMERIC_VALUE' | 'OUT_OF_BOUNDS' | 'FIELD_NOT_ADMISSIBLE'
  | 'DUPLICATE_UPLOAD' | 'FIELD_ALREADY_ATTESTED'
  | 'CONTENT_CHANGED' | 'SERVER_FIELD_ASSERTED' | 'ATTESTATION_INVALID' | 'MAPPING_NOT_CONFIRMED'
  | 'DRAFT_NOT_FOUND' | 'DRAFT_NOT_EDITABLE' | 'UPLOAD_NOT_FOUND' | 'UPLOAD_EXPIRED';

export interface AttestedUploadRefusal {
  reason: AttestedUploadRefusalReason;
  /** Reader-facing. Never contains a cell value. */
  message: string;
  /** Header name, where the refusal is about a column. */
  column?: string;
}

export interface AttestedUploadColumnProfile {
  header: string;
  inferred_type: 'DATE' | 'NUMBER' | 'TEXT';
  non_empty_count: number;
  /** Server-proposed field, or null. Deterministic header matching first; a GenAI proposal is advisory. */
  proposed_field: ScenarioDraftFieldId | null;
  proposal_basis: 'HEADER_MATCH' | 'GENAI_PROPOSAL' | 'NONE';
}

export interface AttestedUploadProfile {
  row_count: number;
  column_count: number;
  period_count: number;
  /** ISO dates, inclusive, from `period_end`. */
  period_window: { start: string; end: string };
  columns: AttestedUploadColumnProfile[];
}

/** The mapping a PERSON confirmed: header → admissible field. Nothing else is admitted. */
export interface AttestedUploadMapping {
  header: string;
  field: ScenarioDraftFieldId;
}

export interface AttestedUploadAdmittedValue {
  field: ScenarioDraftFieldId;
  value: number;
  reduction: AttestedUploadReduction;
  /** Rows the reduction read. */
  periods_used: number;
  provenance: ProvenanceDescriptor;
}

export interface AttestedUpload {
  /** SERVER-ISSUED, prefix `upl_`. */
  upload_id: string;
  tenant_id: string;
  /** The one draft this upload may enrich. Bound at receipt; never changed. */
  draft_id: string;
  /** The identity the draft will take; carried for audit only. Never used to resolve a scenario. */
  scenario_id: string;
  state: AttestedUploadState;
  file_name_display: string;
  media_type: string;
  byte_size: number;
  /** SHA-256 over the exact uploaded bytes, hex. */
  content_sha256: string;
  profile: AttestedUploadProfile | null;
  mapping: AttestedUploadMapping[];
  /** Reused from ESF-6 unchanged. A declaration, never a proof. */
  attestation: SourceAttestation | null;
  /** SERVER-ISSUED, ESF-6 prefix `att_`. Present from admission. */
  attestation_id: string | null;
  admitted_values: AttestedUploadAdmittedValue[];
  /** ESF-6 `ServerReceipt.receipt_id` of kind `SCENARIO_UPLOAD_ADMISSION`. Present from admission. */
  admission_receipt_id: string | null;
  refusal: AttestedUploadRefusal | null;
  /** SERVER-DERIVED. `false` only for an ADMITTED upload. Never accepted from a request. */
  synthetic_demo: boolean;
  /** Platform receipt times (civil time — ADR-078 leaves platform artefacts on it). Display only. */
  received_at: string;
  admitted_at: string | null;
  schema_version: typeof ATTESTED_UPLOAD_SCHEMA_VERSION;
}

/** What the person sends to admit. Server-issued fields in it are refused (`SERVER_FIELD_ASSERTED`). */
export interface AttestedUploadAdmissionRequest {
  tenant_id: string;
  upload_id: string;
  /** The hash the person reviewed; must equal the stored one. */
  expected_content_sha256: string;
  mapping: AttestedUploadMapping[];
  attestation: SourceAttestation;
}
