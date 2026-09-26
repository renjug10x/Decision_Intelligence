/**
 * The attested upload store (`SCI-10`, ADR-086 part 5)
 * ───────────────────────────────────────────────────────────────────────────────
 * In-process and tenant-scoped, keyed `tenant_id::upload_id`, with **the same lifetime as the draft
 * it enriches** (contract §4.11): an upload whose draft is gone — evicted, or lost with the process on
 * a BFF restart — is gone too, and resolves as not found. No durable store is introduced
 * (`R-SCI07R-1` unchanged), for the reason the contract gives: the person's own file plus a
 * deterministic admission already reproduce the values.
 *
 * Two things are held, and they are held differently
 * ---------------------------------------------------
 *  - the `AttestedUpload` record — the audit: profile, mapping, attestation, receipt, admitted
 *    values. It never contains a cell value.
 *  - the parsed COLUMNS, held only between `PROFILED` and admission, for at most
 *    `profile_retention_minutes`. They are discarded at admission, on expiry, on withdrawal and
 *    whenever the record itself is dropped (contract §4.10). Nothing else in the estate holds them.
 */

import type {
  AttestedUpload,
  AttestedUploadAdmittedValue
} from '@/packages/contracts/src/attested-upload-model';
import { ATTESTED_UPLOAD_LIMITS } from '@/packages/contracts/src/attested-upload-model';
import type { ScenarioDraftFieldId } from '@/packages/contracts/src/scenario-draft-model';
import { scenarioDraftStore } from './draft-store';
import type { HeldColumns } from './attested-upload-validation';

/** The platform clock the retention window is measured on. A seam so the window can be tested. */
export const attestedUploadClock = { now: (): number => Date.now() };

interface HeldUpload {
  upload: AttestedUpload;
  /** Present only while `PROFILED`. */
  held: HeldColumns | null;
  /** The product and Today the file was validated against, re-checked at admission. */
  grain_sku: string;
  profiled_at_ms: number;
}

/** Bounds, so a long-running process cannot be made to hold uploads — or parsed columns — indefinitely. */
const MAX_UPLOADS_PER_DRAFT = 20;
const MAX_PROFILED_PER_TENANT = 10;
const MAX_PROFILED_TOTAL = 100;

class AttestedUploadStore {
  private readonly byKey = new Map<string, HeldUpload>();

  private key(tenantId: string, uploadId: string): string {
    return `${tenantId}::${uploadId}`;
  }

  /** The draft still exists in its tenant — the lifetime every upload shares. */
  private draftAlive(entry: HeldUpload): boolean {
    return !!scenarioDraftStore.get(entry.upload.tenant_id, entry.upload.draft_id);
  }

  private expire(entry: HeldUpload): void {
    entry.held = null;
    entry.upload = { ...entry.upload, state: 'EXPIRED', synthetic_demo: true };
  }

  /**
   * Drop uploads whose draft is gone, and expire `PROFILED` uploads past the retention window.
   * Run before every read and write, so no caller sees a stale record or a column past its window.
   */
  sweep(): void {
    const now = attestedUploadClock.now();
    const windowMs = ATTESTED_UPLOAD_LIMITS.profile_retention_minutes * 60_000;
    for (const [key, entry] of this.byKey) {
      if (!this.draftAlive(entry)) { this.byKey.delete(key); continue; }
      if (entry.upload.state === 'PROFILED' && now - entry.profiled_at_ms > windowMs) this.expire(entry);
    }
  }

  put(upload: AttestedUpload, held: HeldColumns | null, grainSku: string): AttestedUpload {
    this.sweep();
    this.byKey.set(this.key(upload.tenant_id, upload.upload_id), {
      upload,
      held,
      grain_sku: grainSku,
      profiled_at_ms: attestedUploadClock.now()
    });
    this.bound(upload.tenant_id, upload.draft_id);
    return upload;
  }

  /** Replace the record, and optionally discard the columns. Never re-attaches columns. */
  update(upload: AttestedUpload, discardColumns: boolean): AttestedUpload {
    const entry = this.byKey.get(this.key(upload.tenant_id, upload.upload_id));
    if (!entry) return upload;
    entry.upload = upload;
    if (discardColumns) entry.held = null;
    return upload;
  }

  private bound(tenantId: string, draftId: string): void {
    const forDraft = [...this.byKey.values()].filter(e => e.upload.tenant_id === tenantId && e.upload.draft_id === draftId);
    // Oldest first, never an ADMITTED one: its values are in the draft and its record is their audit.
    let excess = forDraft.length - MAX_UPLOADS_PER_DRAFT;
    for (const entry of forDraft) {
      if (excess <= 0) break;
      if (entry.upload.state === 'ADMITTED') continue;
      this.byKey.delete(this.key(entry.upload.tenant_id, entry.upload.upload_id));
      excess -= 1;
    }
    const profiled = [...this.byKey.values()].filter(e => e.upload.state === 'PROFILED');
    const tenantProfiled = profiled.filter(e => e.upload.tenant_id === tenantId);
    for (const entry of tenantProfiled.slice(0, Math.max(0, tenantProfiled.length - MAX_PROFILED_PER_TENANT))) this.expire(entry);
    const stillProfiled = [...this.byKey.values()].filter(e => e.upload.state === 'PROFILED');
    for (const entry of stillProfiled.slice(0, Math.max(0, stillProfiled.length - MAX_PROFILED_TOTAL))) this.expire(entry);
  }

  /** Tenant-scoped: a foreign tenant's upload is not found, exactly as a nonexistent one is. */
  get(tenantId: string, uploadId: string): { upload: AttestedUpload; held: HeldColumns | null; grain_sku: string } | undefined {
    this.sweep();
    const entry = this.byKey.get(this.key(tenantId, uploadId));
    return entry ? { upload: entry.upload, held: entry.held, grain_sku: entry.grain_sku } : undefined;
  }

  listForDraft(tenantId: string, draftId: string): AttestedUpload[] {
    this.sweep();
    return [...this.byKey.values()]
      .filter(e => e.upload.tenant_id === tenantId && e.upload.draft_id === draftId)
      .map(e => e.upload);
  }

  /** Whether any upload in this process still holds parsed columns. Retention evidence for tests. */
  heldColumnCount(): number {
    this.sweep();
    return [...this.byKey.values()].filter(e => e.held !== null).length;
  }

  clear(tenantId?: string): void {
    if (!tenantId) { this.byKey.clear(); return; }
    for (const [key, entry] of this.byKey) if (entry.upload.tenant_id === tenantId) this.byKey.delete(key);
  }
}

export const attestedUploadStore = new AttestedUploadStore();

/** What a field's attestation rests on: the live admission that set it, and who attested it. */
export interface LiveAdmission extends AttestedUploadAdmittedValue {
  upload_id: string;
  attested_by: string;
  file_name_display: string;
}

/**
 * The admissions that currently stand for a draft, by field — `ADMITTED` uploads only.
 *
 * Whether a field IS attested is decided by the authoring domain from this and the draft's current
 * value (contract §5: attested only while the draft value equals the admitted value). Kept here as a
 * pure read so the authoring service can depend on it without depending on the upload service.
 */
export function liveAdmissionsFor(tenantId: string, draftId: string): Map<ScenarioDraftFieldId, LiveAdmission> {
  const out = new Map<ScenarioDraftFieldId, LiveAdmission>();
  for (const upload of attestedUploadStore.listForDraft(tenantId, draftId)) {
    if (upload.state !== 'ADMITTED') continue;
    for (const admitted of upload.admitted_values) {
      out.set(admitted.field, {
        ...admitted,
        upload_id: upload.upload_id,
        attested_by: upload.attestation?.attested_by ?? '',
        file_name_display: upload.file_name_display
      });
    }
  }
  return out;
}
