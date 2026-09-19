/**
 * Scenario Draft confirmation (BFF route, `SCI-07`, ADR-083)
 * ───────────────────────────────────────────────────────────────────────────────
 * The one place a draft becomes a scenario.
 *
 * Three refusals this route makes, and each of them is the point of the packet
 * -----------------------------------------------------------------------------
 *  - **No implicit confirmation.** `confirm: true` and a named person are both required.
 *    A save is not a confirmation, and nothing that is not a person may confirm.
 *  - **No confirmation without certification.** The service registers the resolved scenario
 *    and runs the full twelve-dimension gate. A scenario that does not certify is refused
 *    with the failed dimensions named, and the draft stays a draft.
 *  - **No activation.** A confirmed, certified scenario is REGISTERED and selectable. Making
 *    it the scenario the estate is running stays at `POST /api/v1/scenarios`, behind the same
 *    ADR-080 gate every curated scenario passes through. This route says so in the response
 *    rather than leaving a reader to infer it.
 *
 * Nothing here can reach a provider. Confirmation is deterministic resolution followed by
 * certification, and both run identically with `GEMINI_API_KEY` unset — which is ADR-083
 * part 2's acceptance condition expressed as the absence of an import.
 */

import { NextRequest, NextResponse } from 'next/server';
import { platformReceiptNowIso } from '@/packages/contracts/src/scenario-clock';
import { toScenarioRegistryEntry } from '@/lib/scenario-runtime';
import { confirmDraft } from '@/lib/scenario-authoring';
import { authoringError, errorResponse, requireTenant } from '@/app/api/v1/_shared/authoring-request';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const tenant = requireTenant(payload?.tenant_id);
  if (!tenant.ok) return tenant.response;

  const confirmedBy = typeof payload.confirmed_by === 'string' ? payload.confirmed_by.trim().slice(0, 120) : '';
  if (payload.confirm !== true || !confirmedBy) {
    return errorResponse(
      'BadRequest',
      'Confirming a scenario needs an explicit confirm and the name of the person confirming it. '
      + 'A scenario is never confirmed on someone\'s behalf.',
      400
    );
  }

  try {
    const result = confirmDraft({
      tenant_id: tenant.tenantId,
      draft_id: id,
      confirmed_by: confirmedBy,
      confirm: true,
      expected_content_hash: typeof payload.expected_content_hash === 'string'
        ? payload.expected_content_hash
        : undefined
    });

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'scenario-draft-confirmation',
      tenant_id: tenant.tenantId,
      timestamp: platformReceiptNowIso(),
      data: {
        draft: result.draft,
        scenario: toScenarioRegistryEntry(result.scenario),
        certified: result.certified,
        certification_summary: result.certification_summary,
        readiness: result.readiness,
        provenance_statement: result.provenance_statement,
        activation_note: result.activation_note,
        // Said as data as well as in words, so a client cannot render it as active by accident.
        demo_active: false
      }
    }, { status: 201 });
  } catch (error) {
    return authoringError(error);
  }
}
