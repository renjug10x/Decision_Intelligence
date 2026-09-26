/**
 * Request shaping and refusals for the attested upload routes (`SCI-10`, ADR-086).
 *
 * Held outside the route modules for the reason `authoring-request.ts` is: a route may export only its
 * handlers, and these boundaries are exercised directly by the governed suite.
 *
 * The body is read with a CAP, before anything parses it (contract §4.5: limits are enforced before
 * parse). A declared `Content-Length` over the cap is refused without reading a byte; a body that grows
 * past it while streaming is abandoned at the cap. Only then is the multipart form parsed.
 */

import { NextResponse } from 'next/server';
import { platformReceiptNowIso } from '@/packages/contracts/src/scenario-clock';
import { ATTESTED_UPLOAD_LIMITS, type AttestedUploadRefusal } from '@/packages/contracts/src/attested-upload-model';
import type { AttestedUploadOutcome } from '@/lib/scenario-authoring';
import { refusalHttpStatus } from '@/lib/scenario-authoring';

/** The file limit plus room for the multipart envelope and the tenant field. */
export const UPLOAD_BODY_CAP_BYTES = ATTESTED_UPLOAD_LIMITS.max_bytes + 64 * 1024;

export function uploadRefusal(refusal: AttestedUploadRefusal, extra: Record<string, unknown> = {}): NextResponse {
  return NextResponse.json(
    {
      status: 'error',
      error: 'AttestedUploadRefused',
      reason: refusal.reason,
      message: refusal.message,
      ...(refusal.column ? { column: refusal.column } : {}),
      ...extra,
      timestamp: platformReceiptNowIso()
    },
    { status: refusalHttpStatus(refusal.reason) }
  );
}

export function uploadOutcomeResponse<T extends Record<string, unknown>>(
  outcome: AttestedUploadOutcome<T>,
  tenantId: string,
  domain: string,
  successStatus = 200
): NextResponse {
  if (!outcome.ok) {
    return uploadRefusal(outcome.refusal, outcome.upload ? { data: { upload: outcome.upload } } : {});
  }
  const { ok: _ok, ...data } = outcome;
  return NextResponse.json({
    status: 'success',
    service: 'cognix-web-bff',
    domain,
    tenant_id: tenantId,
    timestamp: platformReceiptNowIso(),
    data
  }, { status: successStatus });
}

export type CappedBody = { ok: true; bytes: Uint8Array } | { ok: false; refusal: AttestedUploadRefusal };

const TOO_LARGE: AttestedUploadRefusal = {
  reason: 'TOO_LARGE',
  message: `This file is larger than ${ATTESTED_UPLOAD_LIMITS.max_bytes / (1024 * 1024)} MB. Export only the weeks and columns the scenario needs.`
};

export async function readCappedBody(request: Request, cap = UPLOAD_BODY_CAP_BYTES): Promise<CappedBody> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > cap) return { ok: false, refusal: TOO_LARGE };
  if (!request.body) return { ok: true, bytes: new Uint8Array(0) };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > cap) {
      await reader.cancel().catch(() => undefined);
      return { ok: false, refusal: TOO_LARGE };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return { ok: true, bytes };
}
