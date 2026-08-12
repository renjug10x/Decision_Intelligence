/**
 * Next.js Same-Origin Compatibility Proxy (BFF Route)
 * 
 * Receives browser requests on /api/v1/scenarios (port 3000).
 * Server-side selection between service / demo-fallback / local modes is controlled strictly by:
 * - COGNIX_WORLD_MODE ('service' | 'demo-fallback' | 'local')
 * - COGNIX_WORLD_SERVICE_URL ('http://localhost:8081' or 'http://cognix-world:8081' in Docker Compose)
 * 
 * Internal service URLs and container hostnames are strictly hidden from browser JavaScript.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCanonicalScenario, ScenarioFamilyId } from '@/packages/contracts/src/index';

const WORLD_SERVICE_URL = process.env.COGNIX_WORLD_SERVICE_URL || 'http://localhost:8081';
const WORLD_MODE = (process.env.COGNIX_WORLD_MODE as 'service' | 'demo-fallback' | 'local') || 'demo-fallback';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenant_id') || 'tenant_uk_retail_01';
  const familyId = searchParams.get('family_id') as ScenarioFamilyId | null;
  const correlationId = request.headers.get('x-correlation-id') || `corr_proxy_${Math.random().toString(36).substr(2, 9)}`;

  // Mode 1: Explicit Server-side Local Mode
  if (WORLD_MODE === 'local') {
    console.info(`[NextJS BFF Proxy] COGNIX_WORLD_MODE=local: Serving canonical in-process scenario generator.`);
    const scenarios = generateCanonicalScenario(familyId || undefined, tenantId);
    return NextResponse.json({
      status: 'local',
      service: 'cognix-web-proxy-local',
      tenant_id: tenantId,
      correlation_id: correlationId,
      timestamp: new Date().toISOString(),
      data: scenarios
    });
  }

  // Mode 2 & 3: Server-side Service Call to cognix-world
  try {
    const targetUrl = new URL('/api/v1/scenarios', WORLD_SERVICE_URL);
    targetUrl.searchParams.set('tenant_id', tenantId);
    if (familyId) targetUrl.searchParams.set('family_id', familyId);

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
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }

  // Mode 3: Demo Fallback Mode
  console.warn(`[NextJS BFF Proxy] COGNIX_WORLD_MODE=demo-fallback: Upstream cognix-world service unreachable at ${WORLD_SERVICE_URL}. Using canonical local generator for demo continuity.`);
  const scenarios = generateCanonicalScenario(familyId || undefined, tenantId);
  return NextResponse.json({
    status: 'demo_fallback',
    service: 'cognix-web-proxy-fallback',
    tenant_id: tenantId,
    correlation_id: correlationId,
    timestamp: new Date().toISOString(),
    data: scenarios
  });
}
