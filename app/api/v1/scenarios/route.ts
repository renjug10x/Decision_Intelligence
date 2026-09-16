/**
 * Scenario Registry (BFF Route)
 *
 * Publishes the REGISTERED SCENARIO CATALOGUE and which scenario the estate is running.
 * `SCI-04` builds selection against this shape, frozen at Gate A.
 *
 * What this route used to be. It served `ENTERPRISE_WORLD_SCENARIOS` — six families
 * carrying their own economics, including `SCN-PROMO-01` at a 55,000-unit week against
 * supplier FreshDirect UK. That was the second scenario world ADR-077 retires. The family
 * taxonomy survives, and each family's temporal series survives AS A SCENARIO'S DECLARED
 * EVIDENCE; their `baselineMetrics` do not survive as an economic authority and are not
 * served from here. A consumer that needs a demand, capacity or exposure figure reads the
 * scenario's own record.
 *
 * Server-side selection between service / demo-fallback / local modes is controlled strictly by:
 * - COGNIX_WORLD_MODE ('service' | 'demo-fallback' | 'local')
 * - COGNIX_WORLD_SERVICE_URL ('http://localhost:8081' or 'http://cognix-world:8081' in Docker Compose)
 *
 * Internal service URLs and container hostnames are strictly hidden from browser JavaScript.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  scenarioCatalogue,
  getActiveScenarioId,
  scenarioTemporalEvidence,
  platformReceiptNowIso
} from '@/packages/contracts/src/index';

const WORLD_SERVICE_URL = process.env.COGNIX_WORLD_SERVICE_URL || 'http://localhost:8081';
const WORLD_MODE = (process.env.COGNIX_WORLD_MODE as 'service' | 'demo-fallback' | 'local') || 'demo-fallback';

/** The catalogue, each entry carrying its family's declared temporal evidence. */
function catalogueWithEvidence() {
  return scenarioCatalogue().map(entry => ({
    ...entry,
    temporal_evidence: scenarioTemporalEvidence(entry.taxonomy.family_id)
  }));
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
    data: catalogueWithEvidence()
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
