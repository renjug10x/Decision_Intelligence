/**
 * Request shaping and refusals for the scenario authoring routes (`SCI-07`).
 *
 * Held outside the route modules because a Next.js App Router route may export only its
 * handlers and route config — anything else exported from one is a build error. Held here,
 * these boundaries can be exercised directly rather than asserted by reading route source,
 * which is the same reason `CDI-01`'s validation lives outside its route.
 *
 * Every refusal here follows ADR-044's rule for an error path: it names what is wrong and
 * what to do about it, and it never echoes a credential, an environment dump or a stack
 * trace.
 */

import { NextResponse } from 'next/server';
import { platformReceiptNowIso } from '@/packages/contracts/src/scenario-clock';
import { ScenarioAuthoringError, ScenarioDraftResolutionError } from '@/lib/scenario-authoring';

export type TenantResult =
  | { ok: true; tenantId: string }
  | { ok: false; response: NextResponse };

const TENANT_MAX_CHARS = 64;

/**
 * A draft belongs to a tenant, and the store is keyed on one.
 *
 * Required rather than defaulted, for the reason ADR-077 part 4 requires a scenario to be:
 * a tenant resolved by fallback is a tenant nobody chose, and drafts would pool in whichever
 * bucket the default named.
 */
export function requireTenant(value: unknown): TenantResult {
  const tenantId = typeof value === 'string' ? value.trim().slice(0, TENANT_MAX_CHARS) : '';
  if (!tenantId) {
    return {
      ok: false,
      response: errorResponse('BadRequest', 'tenant_id is required so a draft belongs to someone.', 400)
    };
  }
  return { ok: true, tenantId };
}

export function errorResponse(
  error: string,
  message: string,
  status: number,
  extra: Record<string, unknown> = {},
  headers?: Record<string, string>
): NextResponse {
  return NextResponse.json(
    { status: 'error', error, message, ...extra, timestamp: platformReceiptNowIso() },
    { status, headers }
  );
}

/**
 * Turn an authoring failure into a refusal a person can act on.
 *
 * `422` rather than `400` for an authoring error: the request was well formed and the
 * SCENARIO is not admissible, which is the same distinction the scenario activation route
 * already draws when the certification gate refuses.
 */
export function authoringError(error: unknown): NextResponse {
  if (error instanceof ScenarioAuthoringError) {
    const notFound = error.field === 'draft_id';
    return errorResponse(
      notFound ? 'NotFound' : 'ScenarioDraftRefused',
      error.message,
      notFound ? 404 : 422,
      { field: error.field, issues: error.issues }
    );
  }
  if (error instanceof ScenarioDraftResolutionError) {
    return errorResponse('ScenarioDraftRefused', error.message, 422, { field: error.field });
  }
  /*
   * Anything else is unexpected, so it is logged server-side and reported without its detail.
   * An unexpected error's message can carry anything the process was holding, and a route that
   * forwards it verbatim is one bug away from publishing something it should not.
   */
  console.error('Scenario authoring request failed:', error);
  return errorResponse(
    'InternalError',
    'The scenario authoring request could not be completed.',
    500
  );
}
