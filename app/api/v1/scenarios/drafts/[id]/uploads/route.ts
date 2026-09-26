/**
 * Attested Uploads — a draft's uploads (BFF route, `SCI-10`, ADR-086)
 * ───────────────────────────────────────────────────────────────────────────────
 * `POST` receive ONE CSV file (multipart), fingerprint it, validate it and profile it → `PROFILED`, or
 *        `REFUSED` with a closed reason. Nothing is admitted here: the draft is unchanged.
 * `GET`  the draft's uploads — profiles, mappings, attestations and receipts. **Never a cell value.**
 *
 * Tenant-scoped through `requireTenant` and the authoring domain's store: another tenant's draft is not
 * found, exactly as a nonexistent one is. No route here accepts a published quantity, a certification,
 * a confirmation or an activation, and nothing here can reach a provider.
 */

import { NextRequest } from 'next/server';
import { listAttestedUploads, receiveAttestedUpload } from '@/lib/scenario-authoring';
import { requireTenant } from '@/app/api/v1/_shared/authoring-request';
import { readCappedBody, uploadOutcomeResponse, uploadRefusal } from '@/app/api/v1/_shared/attested-upload-request';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const tenant = requireTenant(request.nextUrl.searchParams.get('tenant_id'));
  if (!tenant.ok) return tenant.response;
  return uploadOutcomeResponse(listAttestedUploads(tenant.tenantId, id), tenant.tenantId, 'scenario-draft-uploads');
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const contentType = request.headers.get('content-type') ?? '';
  if (!/^multipart\/form-data/i.test(contentType)) {
    return uploadRefusal({ reason: 'UNSUPPORTED_MEDIA_TYPE', message: 'Send one CSV file as a form upload.' });
  }

  const body = await readCappedBody(request);
  if (!body.ok) return uploadRefusal(body.refusal);

  let form: FormData;
  try {
    form = await new Response(body.bytes as BodyInit, { headers: { 'content-type': contentType } }).formData();
  } catch {
    return uploadRefusal({ reason: 'UNSUPPORTED_MEDIA_TYPE', message: 'The upload could not be read as a form. Send one CSV file.' });
  }

  const tenant = requireTenant(form.get('tenant_id') ?? request.nextUrl.searchParams.get('tenant_id'));
  if (!tenant.ok) return tenant.response;

  const files = form.getAll('file').filter((f): f is File => typeof f === 'object' && f !== null && 'arrayBuffer' in f);
  if (files.length !== 1) {
    return uploadRefusal({ reason: 'UNSUPPORTED_MEDIA_TYPE', message: 'Attach exactly one CSV file.' });
  }
  const file = files[0];

  const asserted: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) {
    if (key === 'tenant_id' || key === 'file') continue;
    asserted[key] = typeof value === 'string' ? value : '[file]';
  }

  const outcome = receiveAttestedUpload({
    tenant_id: tenant.tenantId,
    draft_id: id,
    file_name: file.name,
    media_type: file.type,
    bytes: new Uint8Array(await file.arrayBuffer()),
    asserted_fields: asserted
  });
  return uploadOutcomeResponse(outcome, tenant.tenantId, 'scenario-draft-upload', 201);
}
