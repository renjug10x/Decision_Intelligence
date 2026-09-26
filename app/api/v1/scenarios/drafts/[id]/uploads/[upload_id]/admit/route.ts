/**
 * Attested Upload admission (BFF route, `SCI-10`, ADR-086)
 * ───────────────────────────────────────────────────────────────────────────────
 * `AttestedUploadAdmissionRequest` → `ADMITTED` and the updated draft assessment, or a closed refusal.
 *
 * The person names the fingerprint they reviewed, confirms the column mapping and attests — by name —
 * where the data came from. CogniX then reduces the mapped columns by the two declared rules and writes
 * the values into the DRAFT. That is the last thing an upload does: the draft is still a draft, and it is
 * confirmed, certified and run exactly as any other (ADR-086 part 3). Nothing is partially admitted.
 */

import { NextRequest } from 'next/server';
import { admitAttestedUpload } from '@/lib/scenario-authoring';
import { requireTenant } from '@/app/api/v1/_shared/authoring-request';
import { uploadOutcomeResponse } from '@/app/api/v1/_shared/attested-upload-request';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string; upload_id: string }> }) {
  const { id, upload_id: uploadId } = await context.params;
  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const tenant = requireTenant(payload?.tenant_id);
  if (!tenant.ok) return tenant.response;

  const { tenant_id: _tenant, ...request_fields } = payload;
  return uploadOutcomeResponse(
    admitAttestedUpload(tenant.tenantId, id, uploadId, request_fields),
    tenant.tenantId,
    'scenario-draft-upload-admission'
  );
}
