# CogniX — Attested Upload Contract (`SCI-10`)

**Status:** **DECLARED and FROZEN AS A DECLARATION** — 2026-09-25, at the `SCI-10` reconciliation design
gate ([`COGNIX_SCI_10_RECONCILIATION_DESIGN_GATE.md`](../reports/COGNIX_SCI_10_RECONCILIATION_DESIGN_GATE.md)).
**IMPLEMENTED 2026-09-26** (below). **Owner:** `SCI-10` (ADR-084 part 1). **Consumers:** `SCI-08` (the experience that
renders it). **Decision:** ADR-086.
**Declared against:** `feature/cognix-sci-08-create-your-own` at `aad33e90b4ee3fb4b65c85d8cdd38e63d709f6c6`.
**Implemented:** 2026-09-26 by `SCI-10` on `feature/cognix-sci-10-csv-admission`, SHA-E `c5fce33c` —
§6 committed byte for byte as `packages/contracts/src/attested-upload-model.ts`; the declaration below is
unchanged. Conformance: [`COGNIX_SCI_10_ATTESTED_UPLOAD_REPORT.md`](../reports/COGNIX_SCI_10_ATTESTED_UPLOAD_REPORT.md).

**How this declaration becomes code.** §6 is normative TypeScript. `SCI-10` commits it verbatim as
`packages/contracts/src/attested-upload-model.ts`, adds one `export *` line to the contracts barrel, and
adds behaviour (validators) beneath it. A change to any declared shape after this date is a convergence
event (ADR-084 part 2), not a commit.

---

## 1. What an Attested Upload is — in one paragraph

A person uploads a CSV extract from their own systems — for example twelve weeks of sales for the
product their draft scenario is about — and states, by name, where it came from. CogniX checks the
file, shows what it found, and proposes which columns correspond to which scenario inputs. The person
confirms the mapping. CogniX then reduces the rows to a small number of **measured inputs** by declared
rules, writes them into the **draft**, and records that those values are *attested*. Nothing else
happens: the draft is still a draft. It is confirmed, certified and run exactly as any other draft —
by a person and by the existing gate.

## 2. Seven operations, never collapsed

| Operation | Who / what | Produces | Authority it carries |
|---|---|---|---|
| **Upload** | a person, through `SCI-08` | an `AttestedUpload` in `RECEIVED`, content fingerprinted | none |
| **Validation** | CogniX, deterministically, before and during parse | `PROFILED` with a profile, or `REFUSED` with a closed reason | none — it establishes that the file is admissible *in form* |
| **Attestation** | the **named person** admitting it | a `SourceAttestation` recorded server-side | a first-party operator declaration of origin. **Not** a proof (§4.4) |
| **Admission** | CogniX, on the person's confirmed mapping + attestation | measured inputs written into the draft, `ADMITTED`, a server receipt | the values stand as `attested` evidence **in that draft only** |
| **Certification** | the Scenario Certification Gate (`SCI-02`), unchanged | a verdict on the resolved scenario | the gate's, as today |
| **Confirmation** | a named person, `SCI-07` path, unchanged | a `CONFIRMED` draft and a registered scenario | the person's, as today |
| **Activation / execution** | a person selecting it; the `SCI-07R` runtime and existing engines | a running scenario | as today (ADR-080, ADR-085) |

**An upload never certifies, confirms, activates or executes anything.** Admission is the last step it
owns; everything after it is the lifecycle every other draft already goes through.

## 3. What an admitted upload may and may not influence

| May | Must never |
|---|---|
| set the value of an **admissible field** (§5) in a `DRAFT` of the same tenant | set any field outside §5 — no `DECLARATION`, no modelled coefficient, no posture, no structure |
| raise that field's provenance to `attested` and so its capability readiness to `Ready` | produce, carry or override any published quantity — demand exposure, Decision Gap, revenue, margin, window, regret, recommendation |
| appear in the draft's provenance sentence | self-certify, self-confirm, self-activate, or register a scenario |
| be withdrawn while the draft is a `DRAFT` | alter a `CONFIRMED` draft or a registered scenario |
| be reproduced by uploading the same bytes with the same mapping | reach a model as raw cell values |
| | be admitted as an ESF-6 `OutcomeObservation` (ADR-086 part 2) |

## 4. The trust model

### 4.1 Identity
Every identifier is **server-issued** and carries a reserved prefix; a caller-supplied value is refused
through ESF-6's existing `checkNoReservedServerFields` (`SERVER_FIELD_ASSERTED`).
`upl_` — the upload. `att_` — the attestation (ESF-6's prefix, reused). `rcpt_` — the admission receipt
(ESF-6's receipt, reused). An upload is always bound to exactly one `draft_id` and one `tenant_id` at
receipt time; it has no identity outside that draft.

### 4.2 Provenance
Retained: file name (display only, sanitised), media type, byte size, row and column counts, header
names, the confirmed mapping, the reduction rule per field, the period window covered, the attestation
(named person + statement), the receipt and its per-tenant sequence. **Not retained: raw bytes or cell
values** beyond admission (§4.10). `synthetic_demo` on the admitted evidence is **server-derived**
(`false` only through this attested path), never accepted from a request (ESF-6 rule, reused).

### 4.3 Integrity
`content_sha256` — SHA-256 over the exact uploaded bytes, computed server-side at receipt. Admission
names the hash the person reviewed; a mismatch is `CONTENT_CHANGED`. The admission record carries the
hash for audit. Re-uploading identical bytes against the same draft is `DUPLICATE_UPLOAD`.

### 4.4 Attestation — what it proves, and what it does not
Reuses ESF-6's `SourceAttestation` **unchanged**: `attested_by` (a named accountable human, mandatory,
never defaulted or inferred), `attestation_statement` (what is attested and on what authority), and
`attestation_kind: 'FIRST_PARTY_OPERATOR_ATTESTATION'`.

**It proves:** that a named person, at a recorded point in this platform's receipt order, declared this
fingerprinted file to be an extract of the stated origin, and accepted the stated mapping.
**It does NOT prove:** that the data is accurate, complete, representative or from the system named;
that the person is who they say (the demonstration has no authenticated identity — `R-SCI07R-2`); or
anything cryptographic. It must never be rendered as a verification, a certification or a signature.

### 4.5 Validation (before admission)
Enforced **before parse**: media type `text/csv` (or `application/vnd.ms-excel` from browsers that
mislabel CSV) and a `.csv` name; **≤ 5 MB, ≤ 50,000 rows, ≤ 60 columns**; UTF-8 (a BOM is tolerated and
stripped); a header row. **During parse:** RFC 4180 quoting; cells are text and never evaluated; a cell
beginning `= + - @ \t \r` is treated as text and never re-exported; duplicate or empty headers refused;
a column whose header or content matches an e-mail, telephone, postcode or person-name pattern is
refused (`PERSONAL_DATA_COLUMN`) — not warned, because nothing SCI-10 admits needs one.

**Grain.** Two columns are required and are not scenario fields: `period_end` (ISO date, one row per
week) and `sku_id`. Every row's `sku_id` must equal the draft's product (`GRAIN_MISMATCH`). No
`period_end` may fall after the draft's scenario Today, `observed_history_end_date` (`FUTURE_PERIOD`) —
a measurement of the future is not a measurement. At least **4** weekly rows are required
(`INSUFFICIENT_PERIODS`).

### 4.6 Tenant isolation
An upload is keyed `tenant_id::upload_id` and bound at receipt to a draft of the **same** tenant; the
draft is resolved through the authoring domain's tenant-scoped store. A foreign tenant's upload, draft
or receipt resolves as **not found** — indistinguishable from nonexistent (ADR-085 part 4). Receipts use
ESF-6's per-tenant strictly monotonic sequence. `tenant_id` is self-declared in the demonstration:
scoping, not authentication.

### 4.7 Authority
§3. Admission writes values; the resolver, readiness, certification, the evaluator and every engine read
them **exactly as they read a stated value**. There is no second path, engine or registry.

### 4.8 Certification
Unchanged. An admitted value is an input like any other; the gate certifies the resolved scenario at
confirmation. An admitted value that makes the scenario fail certification makes the confirmation fail —
as today — and the person may withdraw the upload or correct the draft.

### 4.9 Failure semantics
Every refusal is a closed `AttestedUploadRefusalReason` (§6) with a reader-facing message; nothing is
partially admitted. A refused upload changes no draft. Refusals are:

| Class | Reasons |
|---|---|
| Malformed / unsupported | `UNSUPPORTED_MEDIA_TYPE` · `TOO_LARGE` · `TOO_MANY_ROWS` · `TOO_MANY_COLUMNS` · `NOT_UTF8` · `NO_HEADER_ROW` · `MALFORMED_CSV` · `DUPLICATE_HEADER` · `PERSONAL_DATA_COLUMN` |
| Not admissible content | `MISSING_REQUIRED_COLUMN` · `GRAIN_MISMATCH` · `FUTURE_PERIOD` · `INSUFFICIENT_PERIODS` · `NON_NUMERIC_VALUE` · `OUT_OF_BOUNDS` · `FIELD_NOT_ADMISSIBLE` |
| Duplicate / conflict | `DUPLICATE_UPLOAD` · `FIELD_ALREADY_ATTESTED` |
| Tampered / unverifiable | `CONTENT_CHANGED` · `SERVER_FIELD_ASSERTED` · `ATTESTATION_INVALID` · `MAPPING_NOT_CONFIRMED` |
| State / ownership | `DRAFT_NOT_FOUND` (includes a foreign tenant's) · `DRAFT_NOT_EDITABLE` · `UPLOAD_NOT_FOUND` · `UPLOAD_EXPIRED` |

`OUT_OF_BOUNDS` is decided by the Scenario Draft contract's own `validateScenarioDraftInputs` over the
draft inputs with the reduced values applied — its bounds are not restated or copied here. "Unverifiable" has no separate reason: an attestation cannot be
verified by construction (§4.4), and the platform says so rather than pretending to check it.

### 4.10 Reproduction and retention
Admission is a pure function of `(bytes, confirmed mapping, draft product, draft scenario Today)`. The
same accepted upload admits the same values, so the scenario resolves, certifies and evaluates
identically; the provider is never on this path (a GenAI mapping proposal is advisory and must be
confirmed like any other mapping). **Retention:** parsed columns are held server-side only between
`PROFILED` and admission, for at most 30 minutes (`UPLOAD_EXPIRED`); at admission they are discarded and
only the reduced values, the profile and the record remain. Logs carry counts, header names and mapping
decisions, **never cell values**.

### 4.11 Persistence
In-process and tenant-scoped, **with the same lifetime as the draft it enriches**: evicted with the
draft, lost on BFF restart with the draft (`R-SCI07R-1`, unchanged). No durable store is introduced —
because the reproducibility need is met by the person's own file plus §4.10. An **exported** draft
carries the admitted values as inputs but **not** their attested provenance (the export contract is
frozen and carries inputs only); re-importing it yields `stated`, and re-uploading the file restores
`attested`. That is the honest behaviour: a copied number is not an attested one.

## 5. Admissible fields and reduction rules — closed

Only `MEASUREMENT`-kind fields (Scenario Draft `DRAFT_FIELD_EVIDENCE_KIND`) that a first-party extract
can observe **directly**. Coefficients a model would have to estimate — price response, cannibalisation,
substitution, supplier capacity index, demand movement — are **not admissible**: estimating them from
data is statistical modelling, which is not an admission rule and is not `SCI-10`'s.

| Field | Reduction over the admitted weekly rows | Why this rule |
|---|---|---|
| `base_demand_units_per_week` | `MEAN_OF_PERIODS`, rounded to a whole unit | a weekly rate |
| `waste_units_per_week` | `MEAN_OF_PERIODS`, rounded to a whole unit | a weekly rate |
| `national_store_count` | `LATEST_PERIOD` | a level, as it stands at Today |
| `online_demand_share_pct` | `LATEST_PERIOD` | a level |
| `gross_margin_rate_pct` | `LATEST_PERIOD` | a level |
| `store_cover_days` | `LATEST_PERIOD` | a stock position at Today |
| `distribution_centre_cover_days` | `LATEST_PERIOD` | a stock position at Today |
| `on_order_cover_days` | `LATEST_PERIOD` | a stock position at Today |

These two reductions are the **only arithmetic** `SCI-10` performs. They produce **inputs**; no published
quantity is computed. Admitted provenance: `{ origin: 'attested', method: 'measured', authority:
'authoritative' }` for `LATEST_PERIOD`, and `{ origin: 'attested', method: 'rule', authority:
'authoritative' }` for `MEAN_OF_PERIODS` — both valid under the frozen Provenance Vocabulary.

**A field is `attested` only while its draft value equals the admitted value.** If the person edits it,
the field is `stated` again, derived rather than stored — the rule `field_provenance` already follows.

## 6. Normative declaration

```ts
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
```

**One additive change to an existing contract, authorised here.** `packages/contracts/src/attested-observation-model.ts`
(ESF-6, not a Gate-D frozen contract) gains one `ReceiptKind` member, `'SCENARIO_UPLOAD_ADMISSION'`, with
`subject_id` = the `upload_id` and no `source_id`; `validateServerReceipt` accepts it. Reusing
`OBSERVATION_ADMISSION` instead would label an input admission as an outcome observation, and
`prediction-comparison` resolves observation receipts to `OutcomeObservation`s — the defect ADR-086
part 2 exists to prevent. A separate receipt type would be a parallel receipt model. The member is
additive; every existing kind, the sequence and the store are unchanged.

**No other contract changes.** The six Gate-D frozen contracts and the Scenario Draft contract remain
byte-identical: the attested state of a field is DERIVED by the authoring domain (implementation) from
the draft value and the live admission, and written into the existing
`ScenarioDraftFieldProvenance.descriptor`, whose vocabulary already contains `attested`.

## 7. Routes `SCI-10` implements (BFF, `nodejs` runtime)

| Route | Does |
|---|---|
| `POST /api/v1/scenarios/drafts/{id}/uploads` | receive + validate + profile (multipart, one file) → `PROFILED` or `REFUSED` |
| `GET /api/v1/scenarios/drafts/{id}/uploads` | the draft's uploads (no cell values) |
| `POST /api/v1/scenarios/drafts/{id}/uploads/{upload_id}/admit` | `AttestedUploadAdmissionRequest` → `ADMITTED` + updated draft assessment, or refusal |
| `POST /api/v1/scenarios/drafts/{id}/uploads/{upload_id}/withdraw` | `ADMITTED` → `WITHDRAWN`; the admitted fields return to CogniX's assumption through the governed unset (ADR-086 part 4) |

All tenant-scoped through `requireTenant` and the authoring domain's store; all refusals through the
closed reasons. No route accepts a published quantity, a certification, a confirmation or an activation.
