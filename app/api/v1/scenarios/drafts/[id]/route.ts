/**
 * Scenario Draft — one draft (BFF route, `SCI-07`)
 * ───────────────────────────────────────────────────────────────────────────────
 * `GET`    the draft, its issues, its readiness and its provenance.
 * `PATCH`  change authoring inputs, keep proposals a person chose to keep, and return named fields to
 *          CogniX's declared assumption (`unset_fields`, the governed unset — `R-SCI08-2`).
 * `DELETE` withdraw it.
 *
 * `GET` also serves the exportable form when asked for it, so a person can take a draft away
 * and bring it back without the estate holding a database. What travels is the INPUTS and a
 * content hash; every quantity CogniX publishes is recomputed from them.
 *
 * `PATCH` is where drafted proposals become part of the draft, and it is the only place they
 * can. A proposal a person keeps is stamped `origin: 'drafted'` on that field, so the
 * provenance sentence can say which words came from AI — which is the difference between a
 * draft that is identifiable as one and a draft that has quietly become authorship.
 */

import { NextRequest, NextResponse } from 'next/server';
import { platformReceiptNowIso } from '@/packages/contracts/src/scenario-clock';
import type {
  ScenarioDraftInputs,
  ScenarioDraftProposal
} from '@/packages/contracts/src/scenario-draft-model';
import {
  exportDraft,
  getDraftAssessment,
  updateDraft,
  withdrawDraft
} from '@/lib/scenario-authoring';
import { authoringError, requireTenant } from '@/app/api/v1/_shared/authoring-request';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const tenant = requireTenant(request.nextUrl.searchParams.get('tenant_id'));
  if (!tenant.ok) return tenant.response;

  try {
    const wantsExport = request.nextUrl.searchParams.get('format') === 'export';
    const data = wantsExport
      ? exportDraft(tenant.tenantId, id)
      : getDraftAssessment(tenant.tenantId, id);

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: wantsExport ? 'scenario-draft-export' : 'scenario-draft',
      tenant_id: tenant.tenantId,
      timestamp: platformReceiptNowIso(),
      data
    });
  } catch (error) {
    return authoringError(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const tenant = requireTenant(payload?.tenant_id);
  if (!tenant.ok) return tenant.response;

  try {
    const assessment = updateDraft({
      tenant_id: tenant.tenantId,
      draft_id: id,
      inputs: (payload.inputs ?? {}) as ScenarioDraftInputs,
      accepted_proposals: (payload.accepted_proposals ?? []) as ScenarioDraftProposal[],
      accepted_from_model: typeof payload.accepted_from_model === 'string'
        ? payload.accepted_from_model.slice(0, 64)
        : undefined,
      // The governed unset (`R-SCI08-2`): these fields return to CogniX's declared assumption.
      unset_fields: Array.isArray(payload.unset_fields)
        ? (payload.unset_fields as unknown[]).map(f => String(f))
        : undefined
    });

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'scenario-draft',
      tenant_id: tenant.tenantId,
      timestamp: platformReceiptNowIso(),
      data: assessment
    });
  } catch (error) {
    return authoringError(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const tenant = requireTenant(request.nextUrl.searchParams.get('tenant_id'));
  if (!tenant.ok) return tenant.response;

  try {
    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'scenario-draft',
      tenant_id: tenant.tenantId,
      timestamp: platformReceiptNowIso(),
      data: withdrawDraft(tenant.tenantId, id)
    });
  } catch (error) {
    return authoringError(error);
  }
}
