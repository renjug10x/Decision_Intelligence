/**
 * Governed GenAI scenario drafting (BFF route, `SCI-07`, ADR-044 Amendment B, ADR-083)
 * ───────────────────────────────────────────────────────────────────────────────
 * The one route in scenario authoring that spends a credential, and the weakest thing in the
 * authoring path by design.
 *
 * What it does, and what it deliberately does not
 * -----------------------------------------------
 * It reads a person's description of their situation and returns PROPOSALS — a situation, a
 * product, a scope, postures, a name, a decision question, assumptions — each stamped
 * `GENAI_DRAFT` / `NON_AUTHORITATIVE_DRAFT`. It writes nothing to the draft. A proposal
 * enters the draft only when a person keeps it, through `PATCH` on the draft, which is
 * ADR-044's *"they enter the record only when the planner selects them"* applied one level up.
 *
 * Refusal over fabrication (ADR-044, ADR-083)
 * -------------------------------------------
 *   no `GEMINI_API_KEY`        → `503`, naming the variable, generating nothing
 *   provider unreachable/failed → `502`
 *   output that parses as nothing usable → `502`
 *
 * There is no canned fallback on any path and no example draft standing in for a real one.
 * The response says, on every refusal, that the scenario can still be authored by hand —
 * because it can, and because a person who cannot tell a refusal from an outage will assume
 * the capability is broken rather than unconfigured.
 *
 * Credential (ADR-083 part 3)
 * ---------------------------
 * `process.env.GEMINI_API_KEY`, resolved server-side inside the provider module. This route
 * reads no key, holds no key and passes no key. A key supplied in the request body is
 * structurally unable to reach the provider call, because no code path carries one — the
 * legacy client-key transport at `R-15` is not extended, not reused and not revived.
 *
 * Injection (ADR-083 part 4)
 * --------------------------
 * The description is bounded, flattened to one line and fenced with a per-request random
 * token before it reaches the prompt. Even if a model is talked past the prompt, the response
 * validator refuses anything outside the field allowlist, so the worst a crafted description
 * can achieve is a rejected proposal with a reason attached.
 */

import { NextRequest, NextResponse } from 'next/server';
import { platformReceiptNowIso } from '@/packages/contracts/src/scenario-clock';
import {
  ScenarioDraftProviderFailedError,
  ScenarioDraftProviderUnavailableError,
  buildScenarioDraftEnvelope,
  buildScenarioDraftPrompt,
  draftScenarioStructure,
  getDraftAssessment,
  parseScenarioDraftResponse,
  recordDraftEnvelope,
  validateNarrativeItems,
  validateNarrativeLine,
  validateScenarioDraftProposals,
  MAX_MISSING_INFORMATION_ITEMS
} from '@/lib/scenario-authoring';
import { boundedText } from '@/lib/campaign-decision-suggestion-validation';
import { authoringError, errorResponse, requireTenant } from '@/app/api/v1/_shared/authoring-request';

export const runtime = 'nodejs';

/** The longest description that reaches the prompt. Bounded so a caller cannot grow it without limit. */
const MAX_SITUATION_CHARS = 1_200;

/* ────────────────────────────────────────────────────────────────────────────
   Throttling — the provider key is a metered, billable server asset

   The same posture `CDI-01` takes, for the same reason: this is a route that spends a paid
   external credential on request, and until there is an authenticated identity to bill, use is
   capped per declared tenant and per process. The per-process cap is the one that actually
   bounds spend, because a declared tenant is self-declared.
   ──────────────────────────────────────────────────────────────────────────── */

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_CALLS_PER_TENANT = 8;
const MAX_CALLS_PER_PROCESS = 40;
const MAX_TRACKED_TENANTS = 2_000;

interface RateWindow { count: number; resets_at: number }

const tenantWindows = new Map<string, RateWindow>();
const processWindow: RateWindow = { count: 0, resets_at: 0 };

function rollWindow(window: RateWindow, now: number): void {
  if (now >= window.resets_at) {
    window.count = 0;
    window.resets_at = now + RATE_LIMIT_WINDOW_MS;
  }
}

function pruneTenantWindows(now: number): void {
  if (tenantWindows.size < MAX_TRACKED_TENANTS) return;
  for (const [key, window] of tenantWindows) {
    if (now >= window.resets_at) tenantWindows.delete(key);
  }
  if (tenantWindows.size >= MAX_TRACKED_TENANTS) tenantWindows.clear();
}

/** Both windows are checked before either is charged, so a rejected call costs no quota. */
function chargeProviderCall(tenantId: string, now: number): { allowed: boolean; retry_after: number } {
  pruneTenantWindows(now);
  const tenant = tenantWindows.get(tenantId) ?? { count: 0, resets_at: 0 };
  rollWindow(tenant, now);
  rollWindow(processWindow, now);

  if (tenant.count >= MAX_CALLS_PER_TENANT) {
    tenantWindows.set(tenantId, tenant);
    return { allowed: false, retry_after: Math.max(1, Math.ceil((tenant.resets_at - now) / 1000)) };
  }
  if (processWindow.count >= MAX_CALLS_PER_PROCESS) {
    tenantWindows.set(tenantId, tenant);
    return { allowed: false, retry_after: Math.max(1, Math.ceil((processWindow.resets_at - now) / 1000)) };
  }

  tenant.count += 1;
  processWindow.count += 1;
  tenantWindows.set(tenantId, tenant);
  return { allowed: true, retry_after: 0 };
}

const MANUAL_PATH_NOTE =
  'You can still build this scenario by choosing its situation, product and inputs directly — '
  + 'AI drafting only saves typing.';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const tenant = requireTenant(payload?.tenant_id);
  if (!tenant.ok) return tenant.response;

  const situationText = boundedText(payload?.business_situation, MAX_SITUATION_CHARS);
  if (!situationText) {
    return errorResponse(
      'BadRequest',
      'Describe the situation you want to model before asking for a draft.',
      400
    );
  }

  let assessment;
  try {
    assessment = getDraftAssessment(tenant.tenantId, id);
  } catch (error) {
    return authoringError(error);
  }

  const throttle = chargeProviderCall(tenant.tenantId, Date.now());
  if (!throttle.allowed) {
    // The tenant, never the description: a throttle log that carried user text would put the
    // content of a business situation into the server log for every rate-limited call.
    console.warn(`Scenario drafting throttled for tenant ${tenant.tenantId}.`);
    return errorResponse(
      'RateLimited',
      `Too many drafting requests. Nothing was generated. ${MANUAL_PATH_NOTE}`,
      429,
      {},
      { 'Retry-After': String(throttle.retry_after) }
    );
  }

  const built = buildScenarioDraftPrompt({
    business_situation: situationText,
    already_chosen: assessment.draft.inputs
  });

  let provider;
  try {
    provider = await draftScenarioStructure(built.prompt);
  } catch (error) {
    if (error instanceof ScenarioDraftProviderUnavailableError) {
      return errorResponse('ProviderUnavailable', `${error.message} ${MANUAL_PATH_NOTE}`, 503, {
        variable: error.variable
      });
    }
    /*
     * The provider's own message, and nothing else. It is written by the provider module and
     * carries a status rather than a payload, so no credential, request echo or stack trace
     * can reach a client through this path.
     */
    const message = error instanceof ScenarioDraftProviderFailedError
      ? error.message
      : 'The scenario drafting provider could not be reached.';
    console.error('Scenario drafting provider call failed.');
    return errorResponse('ProviderRequestFailed', `${message} Nothing was generated. ${MANUAL_PATH_NOTE}`, 502);
  }

  const parsed = parseScenarioDraftResponse(provider.raw_text);
  const { proposals, rejected } = validateScenarioDraftProposals(parsed, built.scaffolding_keys);

  if (proposals.length === 0) {
    return errorResponse(
      'ProviderResponseInvalid',
      `The drafting provider returned nothing CogniX can use. Nothing was applied to your draft. ${MANUAL_PATH_NOTE}`,
      502,
      { rejected }
    );
  }

  const envelope = buildScenarioDraftEnvelope({
    model: provider.model,
    generated_at: platformReceiptNowIso(),
    proposals,
    rejected,
    missing_information: validateNarrativeItems(parsed?.missing_information, MAX_MISSING_INFORMATION_ITEMS),
    readiness_explanation: validateNarrativeLine(parsed?.readiness_explanation)
  });

  // Recorded as the AUDIT of what was proposed. It changes no input: only a person keeping a
  // proposal through PATCH does that.
  const draft = recordDraftEnvelope(tenant.tenantId, id, envelope);

  return NextResponse.json({
    status: 'success',
    service: 'cognix-web-bff',
    domain: 'scenario-draft-assistance',
    tenant_id: tenant.tenantId,
    timestamp: platformReceiptNowIso(),
    data: {
      draft_id: draft.draft_id,
      envelope,
      applied: false,
      next_step:
        'Nothing has changed in your draft. Keep the proposals you agree with, and CogniX will '
        + 'calculate the scenario from them once you confirm it.'
    }
  });
}
