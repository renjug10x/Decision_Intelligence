/**
 * Attested Upload withdrawal (BFF route, `SCI-10`, ADR-086 part 4)
 * ───────────────────────────────────────────────────────────────────────────────
 * `ADMITTED` → `WITHDRAWN`, on a `DRAFT` only. The fields the upload admitted that are still attested
 * return to CogniX's declared assumption through the governed unset, and readiness and provenance are
 * re-derived. A confirmed scenario is immutable, so its draft refuses this.
 */

import { NextRequest } from 'next/server';
import { withdrawAttestedUpload } from '@/lib/scenario-authoring';
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
    withdrawAttestedUpload(tenant.tenantId, id, uploadId, request_fields),
    tenant.tenantId,
    'scenario-draft-upload-withdrawal'
  );
}
