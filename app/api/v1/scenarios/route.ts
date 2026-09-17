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
 * Server-side selection between service / demo-fallback / local modes is controlled strictly by:
 * - COGNIX_WORLD_MODE ('service' | 'demo-fallback' | 'local')
 * - COGNIX_WORLD_SERVICE_URL ('http://localhost:8081' or 'http://cognix-world:8081' in Docker Compose)
 *
 * Internal service URLs and container hostnames are strictly hidden from browser JavaScript.
 */

import { NextRequest, NextResponse } from 'next/server';
import { platformReceiptNowIso } from '@/packages/contracts/src/index';
// Through the scenario runtime: importing it installs the Scenario Certification Gate.
import {
  scenarioCatalogue,
  getActiveScenarioId,
  activateScenario,
  certifyRegisteredScenarios,
  summariseCertification,
  toScenarioRegistryEntry,
  ScenarioResolutionError,
  type CertificationState
} from '@/lib/scenario-runtime';
import { decisionStateStore } from '@/lib/decision-state-store';

const WORLD_SERVICE_URL = process.env.COGNIX_WORLD_SERVICE_URL || 'http://localhost:8081';
const WORLD_MODE = (process.env.COGNIX_WORLD_MODE as 'service' | 'demo-fallback' | 'local') || 'demo-fallback';

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
function withCertification<T extends { scenario_id: string }>(entries: T[]): (T & CertificationBadge)[] {
  const badges = certificationBadges();
  return entries.map(entry => ({
    ...entry,
    ...(badges.get(entry.scenario_id) ?? {
      certification_state: 'UNCERTIFIED' as const,
      certification_summary: `${entry.scenario_id} was not returned by the Scenario Certification Gate in this process; it is reported uncertified rather than assumed.`
    })
  }));
}

/** The in-process catalogue, certified. */
function catalogueWithCertification() {
  return withCertification(scenarioCatalogue());
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenant_id') || 'tenant_uk_retail_01';
  const correlationId = request.headers.get('x-correlation-id') || `corr_proxy_${Math.random().toString(36).slice(2, 11)}`;

  const body = (status: string, service: string) => ({
    status,
    service,
    tenant_id: tenantId,
    correlation_id: correlationId,
    active_scenario_id: getActiveScenarioId(),
    count: scenarioCatalogue().length,
    // A server receipt. Each entry carries its own scenario clock (ADR-078 part 2).
    timestamp: platformReceiptNowIso(),
    data: catalogueWithCertification()
  });

  // Mode 1: Explicit Server-side Local Mode
  if (WORLD_MODE === 'local') {
    console.info('[NextJS BFF Proxy] COGNIX_WORLD_MODE=local: Serving the in-process scenario registry.');
    return NextResponse.json(body('local', 'cognix-web-proxy-local'));
  }

  // Mode 2 & 3: Server-side Service Call to cognix-world
  try {
    const targetUrl = new URL('/api/v1/scenarios', WORLD_SERVICE_URL);
    targetUrl.searchParams.set('tenant_id', tenantId);

    const upstreamRes = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Tenant-ID': tenantId,
        'X-Correlation-ID': correlationId
      },
      next: { revalidate: 0 }
    });

    if (upstreamRes.ok) {
      const data = await upstreamRes.json();
      /*
       * The DOMAIN catalogue is the world service's; the CERTIFICATION-AWARE view of it is this
       * route's. `cognix-world` does not install the Scenario Certification Gate (R-28), so a
       * proxied catalogue arrives with no verdict on it and a selector reading it would show
       * every certified pack as unavailable. The gate IS installed in this process, so the
       * badge is applied here rather than duplicating domain logic upstream — one catalogue,
       * one certification authority, whichever mode served the entries.
       */
      if (Array.isArray(data?.data)) {
        /*
         * `active_scenario_id` is answered HERE, not upstream. Activation happens in this process
         * (`POST` below, through the gated runtime); `cognix-world` holds its own registry, has no
         * activation endpoint and never learns of a switch, so its `active_scenario_id` is
         * whatever it bootstrapped with. Proxying that verbatim published a stale active scenario
         * to the client after every switch in service mode — two registries answering the same
         * question differently, which is the duplicate scenario state Wave-1 convergence is for.
         * The domain catalogue stays upstream's; which of it the estate is RUNNING is this
         * process's to say. Recorded as R-32 against whichever packet makes `cognix-world`
         * activation-aware; see also R-28.
         */
        return NextResponse.json({
          ...data,
          active_scenario_id: getActiveScenarioId(),
          data: withCertification(data.data)
        });
      }
      return NextResponse.json(data);
    }

    console.warn(`[NextJS BFF Proxy] Upstream cognix-world returned HTTP ${upstreamRes.status}`);
  } catch (error: any) {
    console.warn(`[NextJS BFF Proxy] Upstream cognix-world service unreachable at ${WORLD_SERVICE_URL}: ${error.message}`);
  }

  // If in strict 'service' mode and upstream service failed, return explicit HTTP 503 error (NO silent fallback)
  if (WORLD_MODE === 'service') {
    return NextResponse.json(
      {
        status: 'error',
        service: 'cognix-web-proxy',
        error: 'ServiceUnavailable',
        message: `Upstream cognix-world domain service unreachable at ${WORLD_SERVICE_URL}`,
        timestamp: platformReceiptNowIso()
      },
      { status: 503 }
    );
  }

  // Mode 3: Demo Fallback Mode
  console.warn(`[NextJS BFF Proxy] COGNIX_WORLD_MODE=demo-fallback: Upstream cognix-world service unreachable at ${WORLD_SERVICE_URL}. Using the in-process scenario registry for demo continuity.`);
  return NextResponse.json(body('demo_fallback', 'cognix-web-proxy-fallback'));
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
    const tenantId = body.tenant_id || request.headers.get('x-tenant-id') || 'tenant_uk_retail_01';

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
