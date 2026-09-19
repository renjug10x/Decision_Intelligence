/**
 * Scenario Drafts — collection (BFF route, `SCI-07`)
 * ───────────────────────────────────────────────────────────────────────────────
 * `GET`  the drafts this tenant is working on.
 * `POST` open a draft — empty, on a situation's declared postures, or from an exported
 *        draft file.
 *
 * No provider is reachable from here. Opening a draft is a purely structural act and works
 * with `GEMINI_API_KEY` unset, which is the manual authoring path ADR-083 requires to exist
 * independently of the model: GenAI accelerates authoring; it is not the architecture.
 */

import { NextRequest, NextResponse } from 'next/server';
import { platformReceiptNowIso } from '@/packages/contracts/src/scenario-clock';
import type {
  ScenarioDraftInputs,
  ScenarioSituationId
} from '@/packages/contracts/src/scenario-draft-model';
import { createDraft, importDraft, listDrafts } from '@/lib/scenario-authoring';
import { authoringError, requireTenant } from '@/app/api/v1/_shared/authoring-request';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const tenant = requireTenant(request.nextUrl.searchParams.get('tenant_id'));
  if (!tenant.ok) return tenant.response;

  return NextResponse.json({
    status: 'success',
    service: 'cognix-web-bff',
    domain: 'scenario-drafts',
    tenant_id: tenant.tenantId,
    timestamp: platformReceiptNowIso(),
    data: listDrafts(tenant.tenantId)
  });
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const tenant = requireTenant(payload?.tenant_id);
  if (!tenant.ok) return tenant.response;

  try {
    const assessment = payload.import
      ? importDraft(tenant.tenantId, payload.import)
      : createDraft({
        tenant_id: tenant.tenantId,
        situation: payload.situation as ScenarioSituationId | undefined,
        inputs: (payload.inputs ?? {}) as ScenarioDraftInputs
      });

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'scenario-drafts',
      tenant_id: tenant.tenantId,
      timestamp: platformReceiptNowIso(),
      data: assessment
    }, { status: 201 });
  } catch (error) {
    return authoringError(error);
  }
}
