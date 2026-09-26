/**
 * Attested Upload lifecycle (`SCI-10`, ADR-086)
 * ───────────────────────────────────────────────────────────────────────────────
 * Upload → validation → attestation → admission, and withdrawal while the draft is still a draft.
 * Admission is the LAST step an upload owns. Certification, confirmation, activation and execution stay
 * exactly where ADR-080, ADR-083 and ADR-085 put them: nothing here imports the certification gate, the
 * registry, the scenario runtime or an engine, and that is asserted rather than promised.
 *
 * What admission does, and all it does
 * ------------------------------------
 * It writes the reduced values into the draft through the authoring domain's own update operation —
 * the same path a person's typed value takes — so the resolver, readiness, certification and every
 * engine read them exactly as they read a stated value (contract §4.7). The field's `attested`
 * provenance is DERIVED by the authoring domain from the draft value and the live admission; it is not
 * a second copy of the value. It issues one ESF-6 receipt of kind `SCENARIO_UPLOAD_ADMISSION` on the
 * tenant's monotonic sequence, and it records nothing as an `OutcomeObservation` (ADR-086 part 2).
 *
 * No provider is reachable from here. Column mapping is proposed by deterministic header matching and
 * confirmed by a person; the model is never on this path.
 */

import { createHash, randomBytes } from 'node:crypto';
import {
  ATTESTED_UPLOAD_ADMISSIBLE_FIELDS,
  ATTESTED_UPLOAD_ID_PREFIX,
  ATTESTED_UPLOAD_SCHEMA_VERSION,
  type AttestedUpload,
  type AttestedUploadRefusal
} from '@/packages/contracts/src/attested-upload-model';
import {
  scenarioDraftField,
  validateScenarioDraftInputs,
  type ScenarioDraft,
  type ScenarioDraftFieldId,
  type ScenarioDraftInputs
} from '@/packages/contracts/src/scenario-draft-model';
import { attestedObservationStore } from '@/lib/attested-observation-store';
import { ScenarioAuthoringError, getDraftAssessment, updateDraft, type ScenarioDraftAssessment } from './authoring-service';
import { scenarioDraftStore } from './draft-store';
import { authorableProduct } from './product-master';
import { DEFAULT_AUTHORED_HISTORY_END_DATE } from './scenario-model-defaults';
import { attestedUploadClock, attestedUploadStore } from './attested-upload-store';
import {
  AttestedUploadRefusalError,
  assertNoServerFields,
  checkMediaAndSize,
  decodeUtf8,
  parseCsv,
  profileAgainstDraft,
  reduceMapped,
  refusalHttpStatus,
  refuse,
  sanitiseFileName,
  validateAttestation,
  validateMapping
} from './attested-upload-validation';

export type AttestedUploadOutcome<T> =
  | ({ ok: true } & T)
  | { ok: false; status: number; refusal: AttestedUploadRefusal; upload?: AttestedUpload };

function nowIso(): string {
  return new Date(attestedUploadClock.now()).toISOString();
}

/**
 * Logs carry counts, header names and mapping decisions — **never a cell value** (contract §4.10).
 * One structured line per lifecycle event, so the rule is checkable rather than hoped for.
 */
function logUploadEvent(event: string, detail: Record<string, unknown>): void {
  console.info(`[cognix:attested-upload] ${event}`, JSON.stringify(detail));
}

function refusalOutcome(error: unknown, upload?: AttestedUpload): AttestedUploadOutcome<never> {
  /*
   * The authoring domain's own refusal can only arrive here through a race — the draft changed between
   * the checks above and the one write — and it is still a closed reason, never a 500 carrying detail.
   */
  if (error instanceof ScenarioAuthoringError) {
    const reason = error.field === 'draft_id' ? 'DRAFT_NOT_FOUND' : error.field === 'state' ? 'DRAFT_NOT_EDITABLE' : 'OUT_OF_BOUNDS';
    return refusalOutcome(new AttestedUploadRefusalError(reason, error.message), upload);
  }
  if (error instanceof AttestedUploadRefusalError) {
    logUploadEvent('refused', { reason: error.refusal.reason, column: error.refusal.column ?? null });
    return { ok: false, status: refusalHttpStatus(error.refusal.reason), refusal: error.refusal, upload };
  }
  throw error;
}

/** The draft, tenant-scoped through the authoring domain's store. A foreign tenant's is not found. */
function requireDraft(tenantId: string, draftId: string): ScenarioDraft {
  const draft = scenarioDraftStore.get(tenantId, draftId);
  if (!draft) refuse('DRAFT_NOT_FOUND', 'This scenario draft was not found.');
  return draft;
}

function requireEditable(draft: ScenarioDraft): void {
  if (draft.state !== 'DRAFT') {
    refuse('DRAFT_NOT_EDITABLE', `This scenario is ${draft.state.toLowerCase()}, so data can no longer be added to it or withdrawn from it.`);
  }
}

/** The draft's Today: stated, or the declared authoring clock the resolver would use (ADR-078). */
function draftToday(draft: ScenarioDraft): string {
  return draft.inputs.observed_history_end_date ?? DEFAULT_AUTHORED_HISTORY_END_DATE;
}

// ── Upload + validation ───────────────────────────────────────────────────────

export interface ReceiveAttestedUploadRequest {
  tenant_id: string;
  draft_id: string;
  file_name: string;
  media_type: string;
  bytes: Uint8Array;
  /** Every other field the request carried. A server-issued one is refused. */
  asserted_fields?: Record<string, unknown>;
}

export function receiveAttestedUpload(
  request: ReceiveAttestedUploadRequest
): AttestedUploadOutcome<{ upload: AttestedUpload }> {
  let record: AttestedUpload | undefined;
  try {
    assertNoServerFields(request.asserted_fields ?? {});
    const draft = requireDraft(request.tenant_id, request.draft_id);
    requireEditable(draft);

    const contentSha256 = createHash('sha256').update(request.bytes).digest('hex');
    const live = attestedUploadStore.listForDraft(draft.tenant_id, draft.draft_id)
      .find(u => u.content_sha256 === contentSha256 && (u.state === 'PROFILED' || u.state === 'ADMITTED'));
    if (live) {
      // The live duplicate is returned with the refusal: it is this tenant's, in this draft, so the
      // person can resume reviewing it rather than wait for it to expire. Nothing new is recorded.
      return refusalOutcome(new AttestedUploadRefusalError('DUPLICATE_UPLOAD', live.state === 'ADMITTED'
        ? 'This exact file has already been added to this scenario.'
        : 'This exact file is already uploaded to this scenario and waiting for you to match its columns.'), live);
    }

    record = {
      upload_id: `${ATTESTED_UPLOAD_ID_PREFIX}${randomBytes(8).toString('hex')}`,
      tenant_id: draft.tenant_id,
      draft_id: draft.draft_id,
      scenario_id: draft.scenario_id,
      state: 'RECEIVED',
      file_name_display: sanitiseFileName(request.file_name),
      media_type: String(request.media_type ?? '').split(';')[0].trim().toLowerCase().slice(0, 80),
      byte_size: request.bytes.byteLength,
      content_sha256: contentSha256,
      profile: null,
      mapping: [],
      attestation: null,
      attestation_id: null,
      admitted_values: [],
      admission_receipt_id: null,
      refusal: null,
      synthetic_demo: true,
      received_at: nowIso(),
      admitted_at: null,
      schema_version: ATTESTED_UPLOAD_SCHEMA_VERSION
    };

    const grainSku = draft.inputs.sku_id ?? '';
    try {
      checkMediaAndSize(request.file_name, request.media_type, request.bytes.byteLength);
      const parsed = parseCsv(decodeUtf8(request.bytes));
      const { profile, held } = profileAgainstDraft(parsed, {
        sku_id: draft.inputs.sku_id,
        today: draftToday(draft),
        product_name: draft.inputs.sku_id ? authorableProduct(draft.inputs.sku_id)?.sku_name : undefined
      });
      const profiled: AttestedUpload = { ...record, state: 'PROFILED', profile };
      attestedUploadStore.put(profiled, held, grainSku);
      logUploadEvent('profiled', {
        rows: profile.row_count,
        columns: profile.column_count,
        periods: profile.period_count,
        headers: profile.columns.map(c => c.header),
        proposals: profile.columns.filter(c => c.proposed_field).map(c => `${c.header}->${c.proposed_field}`)
      });
      return { ok: true, upload: profiled };
    } catch (error) {
      if (!(error instanceof AttestedUploadRefusalError)) throw error;
      // REFUSED is terminal and holds nothing of the file but its fingerprint and size.
      const refused: AttestedUpload = { ...record, state: 'REFUSED', refusal: error.refusal };
      attestedUploadStore.put(refused, null, grainSku);
      return refusalOutcome(error, refused);
    }
  } catch (error) {
    return refusalOutcome(error);
  }
}

export function listAttestedUploads(
  tenantId: string,
  draftId: string
): AttestedUploadOutcome<{ uploads: AttestedUpload[] }> {
  try {
    requireDraft(tenantId, draftId);
    return { ok: true, uploads: attestedUploadStore.listForDraft(tenantId, draftId) };
  } catch (error) {
    return refusalOutcome(error);
  }
}

// ── Attestation + admission ───────────────────────────────────────────────────

/**
 * Admit a profiled upload into its draft. Everything is checked before anything is written, and the
 * write is ONE update of the draft — so a refusal at any point admits nothing and changes no draft.
 */
export function admitAttestedUpload(
  tenantId: string,
  draftId: string,
  uploadId: string,
  payload: Record<string, unknown>
): AttestedUploadOutcome<{ upload: AttestedUpload; assessment: ScenarioDraftAssessment }> {
  try {
    assertNoServerFields(payload, ['upload_id']);
    const draft = requireDraft(tenantId, draftId);
    const held = attestedUploadStore.get(tenantId, uploadId);
    if (!held || held.upload.draft_id !== draft.draft_id
      || (payload.upload_id !== undefined && payload.upload_id !== uploadId)) {
      refuse('UPLOAD_NOT_FOUND', 'That uploaded file was not found for this scenario.');
    }
    const upload = held.upload;
    switch (upload.state) {
      case 'ADMITTED':
        refuse('DUPLICATE_UPLOAD', 'This file has already been added to this scenario.');
        break;
      case 'EXPIRED':
      case 'WITHDRAWN':
        refuse('UPLOAD_EXPIRED', 'This upload is no longer held. Upload the file again to add it.');
        break;
      case 'REFUSED':
        if (upload.refusal) refuse(upload.refusal.reason, upload.refusal.message, upload.refusal.column);
        refuse('UPLOAD_NOT_FOUND', 'That uploaded file was not found for this scenario.');
        break;
      default:
        break;
    }
    requireEditable(draft);

    if (payload.expected_content_sha256 !== upload.content_sha256) {
      refuse('CONTENT_CHANGED', 'The file being added is not the file you reviewed. Upload it again and review it before adding it.');
    }
    const attestation = validateAttestation(payload.attestation);
    const profile = upload.profile;
    if (!profile || !held.held) refuse('UPLOAD_EXPIRED', 'This upload is no longer held. Upload the file again to add it.');
    const mapping = validateMapping(payload.mapping, profile);

    const alreadyAttested = new Set(
      attestedUploadStore.listForDraft(tenantId, draftId)
        .filter(u => u.state === 'ADMITTED' && u.upload_id !== upload.upload_id)
        .flatMap(u => u.admitted_values.map(v => v.field as string))
    );
    const clash = mapping.find(m => alreadyAttested.has(m.field));
    if (clash) {
      refuse('FIELD_ALREADY_ATTESTED',
        `${scenarioDraftField(clash.field)?.label ?? clash.field} already comes from another file you added. Withdraw that file first to replace it.`,
        clash.header);
    }

    // Admission is a function of (bytes, mapping, product, Today): re-check the last two now.
    if ((draft.inputs.sku_id ?? '') !== held.grain_sku) {
      refuse('GRAIN_MISMATCH', 'The scenario\'s product has changed since this file was uploaded. Upload a file for the current product.');
    }
    if (profile.period_window.end > draftToday(draft)) {
      refuse('FUTURE_PERIOD', `The file includes weeks after this scenario's Today (${draftToday(draft)}). A measurement cannot come from the future.`);
    }

    const admitted = reduceMapped(held.held, mapping);
    const reduced: Record<string, number> = {};
    for (const value of admitted) reduced[value.field as string] = value.value;

    // Bounds are the Scenario Draft contract's own, over the draft with the reduced values applied.
    const bounds = validateScenarioDraftInputs({ ...draft.inputs, ...reduced });
    if (!bounds.valid) {
      const issue = bounds.issues.find(i => i.severity === 'ERROR' && i.field in reduced) ?? bounds.issues[0];
      const header = mapping.find(m => m.field === issue?.field)?.header;
      refuse('OUT_OF_BOUNDS', `${issue?.message ?? 'A value from this file is outside what a scenario can hold.'} Check the "${header ?? 'mapped'}" column.`, header);
    }

    // ── Everything is checked. One write. ──
    updateDraft({ tenant_id: tenantId, draft_id: draftId, inputs: reduced as ScenarioDraftInputs });

    const receipt = attestedObservationStore.issueReceipt({
      kind: 'SCENARIO_UPLOAD_ADMISSION',
      tenant_id: tenantId,
      subject_id: upload.upload_id
    });
    const attestationId = `att_${createHash('sha256')
      .update([tenantId, upload.upload_id, attestation.attested_by, String(receipt.sequence)].join('::'))
      .digest('hex').slice(0, 16)}`;

    const admittedUpload: AttestedUpload = {
      ...upload,
      state: 'ADMITTED',
      mapping,
      attestation,
      attestation_id: attestationId,
      admitted_values: admitted,
      admission_receipt_id: receipt.receipt_id,
      refusal: null,
      synthetic_demo: false,
      admitted_at: nowIso()
    };
    // The parsed columns are discarded HERE: only the reduced values, the profile and the record remain.
    attestedUploadStore.update(admittedUpload, true);
    logUploadEvent('admitted', {
      mapping: mapping.map(m => `${m.header}->${m.field}`),
      reductions: admitted.map(v => `${v.field}:${v.reduction}:${v.periods_used}`),
      receipt_sequence: receipt.sequence
    });

    return { ok: true, upload: admittedUpload, assessment: getDraftAssessment(tenantId, draftId) };
  } catch (error) {
    return refusalOutcome(error);
  }
}

// ── Withdrawal ────────────────────────────────────────────────────────────────

/**
 * Withdraw an admitted upload while its draft is still a draft (ADR-086 part 4).
 *
 * Every field this upload admitted that still holds the admitted value — that is, every field that is
 * still attested — returns to CogniX's declared assumption through the governed unset. A field the
 * person has since changed is theirs (`stated`) and is left alone: withdrawing a file does not withdraw
 * a statement the person made after it.
 */
export function withdrawAttestedUpload(
  tenantId: string,
  draftId: string,
  uploadId: string,
  payload: Record<string, unknown> = {}
): AttestedUploadOutcome<{ upload: AttestedUpload; assessment: ScenarioDraftAssessment; returned_to_assumption: ScenarioDraftFieldId[] }> {
  try {
    assertNoServerFields(payload);
    const draft = requireDraft(tenantId, draftId);
    const held = attestedUploadStore.get(tenantId, uploadId);
    if (!held || held.upload.draft_id !== draft.draft_id || held.upload.state !== 'ADMITTED') {
      refuse('UPLOAD_NOT_FOUND', 'There is no added file with that reference to withdraw from this scenario.');
    }
    requireEditable(draft);

    const current = draft.inputs as Record<string, unknown>;
    const unset = held.upload.admitted_values
      .filter(v => ATTESTED_UPLOAD_ADMISSIBLE_FIELDS[v.field] && current[v.field as string] === v.value)
      .map(v => v.field);
    if (unset.length > 0) {
      updateDraft({ tenant_id: tenantId, draft_id: draftId, inputs: {}, unset_fields: unset as string[] });
    }
    const withdrawn: AttestedUpload = { ...held.upload, state: 'WITHDRAWN', synthetic_demo: true };
    attestedUploadStore.update(withdrawn, true);
    logUploadEvent('withdrawn', { returned_to_assumption: unset });

    return { ok: true, upload: withdrawn, assessment: getDraftAssessment(tenantId, draftId), returned_to_assumption: unset };
  } catch (error) {
    return refusalOutcome(error);
  }
}
