/**
 * Scenario Registry (BFF Route)
 *
 * Publishes the REGISTERED SCENARIO CATALOGUE and which scenario the estate is running.
 * `SCI-04` builds selection against this shape, frozen at Gate A.
 *
 * What this route used to be. It served `ENTERPRISE_WORLD_SCENARIOS` — six families
 * carrying their own economics, including `SCN-PROMO-01` at a 55,000-unit week against
 * supplier FreshDirect UK. That was the second scenario world ADR-077 retires. The family
 * taxonomy survives; its `baselineMetrics` do not survive as an economic authority.
 *
 * `temporal_evidence` no longer survives either, and `SCI-03` is what settled it (R-30)
 * -----------------------------------------------------------------------------------
 * `SCI-01` kept each family's `temporalData` on this route as "a shape, not a baseline". With
 * ONE scenario published that was arguable. With three certified packs it stopped being:
 *
 *   `SCN-CHILLED-SALMON-002` declares 47,040 units a week at an allocation of 1.02; the
 *   `supplier_breach` family series declares 41,000 against a flat 40,000 capacity.
 *   `SCN-BAKERY-SOURDOUGH-003` declares demand 11.2% ABOVE its base under the promotion;
 *   the `fresh_perishable_waste` series has demand FALLING at Today.
 *
 * Those are not a scale that could be rescaled — they are a different model, disagreeing in
 * direction as well as magnitude. Publishing them beside a certified record would put two
 * demand numbers on one catalogue card, which is precisely what ADR-073 and ADR-075 exist to
 * prevent, and nothing renders the field today.
 *
 * `SCI-03` therefore stops serving it rather than rescaling a series it did not model. A real
 * per-scenario evidence series over `T-90 … T+30` is `SCI-05`'s: its Refresh contract already
 * declares `ScenarioAsAtMarker` and `RefreshDelta` for exactly this, and a scenario's history
 * should come from the same place its advance does. Recorded as R-30 rather than absorbed.
 *
 * A consumer that needs a demand, capacity or exposure figure reads the scenario's own record.
 *
 * One authority, in every mode (`SCI-07R`, ADR-085)
 * -------------------------------------------------
 * This route used to proxy the catalogue from `cognix-world` in `service` mode. That process holds its
 * own copy of the registry, bootstrapped from compiled data, and never learns of a scenario registered
 * here — so an authored scenario confirmed and certified in this process was absent from the catalogue
 * the selector renders (`R-SCI07-6`), while activation, which happens here, still accepted it. The
 * catalogue now comes from the gated scenario runtime in this process in every `COGNIX_WORLD_MODE`,
 * the same process that registers, certifies and activates. `cognix-world` serves no catalogue.
 *
 * The catalogue is TENANT-SCOPED: compiled scenarios for everyone, an authored scenario for the
 * workspace that confirmed it (ADR-085 part 4).
 *
 * Internal service URLs and container hostnames are strictly hidden from browser JavaScript.
 */

import { NextRequest, NextResponse } from 'next/server';
import { platformReceiptNowIso } from '@/packages/contracts/src/index';
// Through the scenario runtime: importing it installs the Scenario Certification Gate.
import {
  scenarioCatalogueForTenant,
  isScenarioVisibleToTenant,
  getActiveScenarioId,
  activateScenario,
  certifyRegisteredScenarios,
  summariseCertification,
  toScenarioRegistryEntry,
  ScenarioResolutionError,
  type CertificationState
} from '@/lib/scenario-runtime';
import { decisionStateStore } from '@/lib/decision-state-store';
import { DEFAULT_TENANT_ID, requestTenantId } from '@/app/api/v1/_shared/scenario-request';

/**
 * The catalogue, each entry carrying its CERTIFICATION STATE (`SCI-04`) and nothing else added.
 *
 * Wave-1 convergence: where the two lanes met on this function
 * -----------------------------------------------------------
 * `SCI-03` removed `temporal_evidence` from this route (R-30) because two of the three
 * certified packs contradict their family's legacy series in DIRECTION, not merely scale, and
 * the converged Wave-1 experience prefers absence to contradictory evidence. `SCI-04`
 * independently added the certification enrichment a client-facing selector needs, on top of
 * the field `SCI-03` was removing. Both intents survive here: the certification enrichment is
 * kept, the retired field is not reinstated. A real per-scenario evidence series remains
 * `SCI-05`'s under its declared Refresh contract.
 *
 * Certification is MEASURED, never inferred. An entry the gate did not return a result for is
 * reported `UNCERTIFIED`, not assumed certified because it happens to be demo-active — a route
 * that infers a verdict it did not run is the formality this gate exists to prevent.
 */
type CertificationBadge = {
  certification_state: CertificationState | 'UNCERTIFIED';
  certification_summary: string;
};

function certificationBadges(): Map<string, CertificationBadge> {
  return new Map(
    certifyRegisteredScenarios().map(result => [
      result.scenario_id,
      {
        certification_state: result.state,
        certification_summary: summariseCertification(result)
      }
    ])
  );
}

/** Add the gate's verdict to whatever catalogue entries the route is about to serve. */
function withCertification<T extends { scenario_id?: string; scenarioId?: string }>(entries: T[]): (T & { scenario_id: string } & CertificationBadge)[] {
  const badges = certificationBadges();
  const seenIds = new Set<string>();
  const results: (T & { scenario_id: string } & CertificationBadge)[] = [];

  for (const rawEntry of entries) {
    const id = rawEntry.scenario_id || rawEntry.scenarioId;
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.warn('[withCertification] Skipping catalogue entry with invalid or missing scenario_id');
      continue;
    }
    const cleanId = id.trim();
    if (seenIds.has(cleanId)) {
      console.warn(`[withCertification] Deduplicating scenario catalogue entry with id: ${cleanId}`);
      continue;
    }
    seenIds.add(cleanId);

    const normalizedEntry = {
      ...rawEntry,
      scenario_id: cleanId
    };

    results.push({
      ...normalizedEntry,
      ...(badges.get(cleanId) ?? {
        certification_state: 'UNCERTIFIED' as const,
        certification_summary: `${cleanId} was not returned by the Scenario Certification Gate in this process; it is reported uncertified rather than assumed.`
      })
    });
  }

  return results;
}

/** The tenant's catalogue from the gated scenario runtime, certified. */
function catalogueWithCertification(tenantId: string) {
  return withCertification(scenarioCatalogueForTenant(tenantId));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = requestTenantId(searchParams, request.headers.get('x-tenant-id'));
  const correlationId = request.headers.get('x-correlation-id') || `corr_proxy_${Math.random().toString(36).slice(2, 11)}`;
  const data = catalogueWithCertification(tenantId);

  /*
   * `active_scenario_id` has been answered here since Wave-1 convergence (`R-32`), because activation
   * happens here. The catalogue now comes from the same place, so the two answers can no longer
   * disagree about which scenarios exist. Activation remains estate-wide (`R-SCI07R-2`).
   */
  return NextResponse.json({
    status: 'success',
    service: 'cognix-web-bff',
    authority: 'scenario-runtime',
    tenant_id: tenantId,
    correlation_id: correlationId,
    active_scenario_id: getActiveScenarioId(),
    count: data.length,
    // A server receipt. Each entry carries its own scenario clock (ADR-078 part 2).
    timestamp: platformReceiptNowIso(),
    data
  });
}

/**
 * Scenario Activation (BFF Route)
 *
 * Activates a scenario through the gated scenario runtime.
 * Under ADR-080, an uncertified scenario cannot become demo-active and is refused.
 * When session_id is provided, the session's Shared Decision State is re-initialised
 * so no prior-scenario state survives.
 */
export async function POST(request: NextRequest) {
  const correlationId = request.headers.get('x-correlation-id') || `corr_act_${Math.random().toString(36).slice(2, 11)}`;
  try {
    const body = await request.json().catch(() => ({}));
    const scenarioId = body.scenario_id;
    const sessionId = body.session_id;
    const tenantId = body.tenant_id || request.headers.get('x-tenant-id') || DEFAULT_TENANT_ID;

    if (!scenarioId || typeof scenarioId !== 'string' || !scenarioId.trim()) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'BadRequest',
          message: 'An explicit scenario_id is required to activate a scenario (ADR-077 part 4).',
          timestamp: platformReceiptNowIso()
        },
        { status: 400 }
      );
    }

    /*
     * `SCI-07R` (ADR-085 part 4): a scenario this tenant cannot see cannot be activated by it, and the
     * refusal is the one an unregistered id receives.
     */
    if (!isScenarioVisibleToTenant(scenarioId.trim(), tenantId)) {
      throw new ScenarioResolutionError(
        `Scenario "${scenarioId.trim()}" is not registered and cannot be activated.`,
        scenarioId.trim()
      );
    }

    // Gated activation: imports from '@/lib/scenario-runtime'
    const scenario = activateScenario(scenarioId.trim());

    // If session_id is provided, switch the session's Shared Decision State to the new scenario
    if (sessionId) {
      decisionStateStore.switchScenarioForSession(
        tenantId,
        sessionId,
        scenario.identity.scenario_id,
        scenario.taxonomy.family_id
      );
    }

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-proxy',
      tenant_id: tenantId,
      correlation_id: correlationId,
      active_scenario_id: scenario.identity.scenario_id,
      scenario: toScenarioRegistryEntry(scenario),
      timestamp: platformReceiptNowIso()
    });
  } catch (error: any) {
    if (error instanceof ScenarioResolutionError) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'ScenarioActivationRefused',
          message: error.message,
          requested_scenario_id: error.requested ?? null,
          timestamp: platformReceiptNowIso()
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        status: 'error',
        error: 'InternalError',
        message: error?.message || 'Failed to activate scenario',
        timestamp: platformReceiptNowIso()
      },
      { status: 500 }
    );
  }
}
