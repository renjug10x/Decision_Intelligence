import { NextRequest, NextResponse } from 'next/server';
import { generateSyntheticSignalSnapshot } from '@/services/world/src/enterprise-signal-generator';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tenantId = searchParams.get('tenant_id') || 'tenant_uk_retail_01';
  const scenarioFamily = searchParams.get('family_id') || searchParams.get('scenario_family') || 'promotion_surge';
  const scenarioId = searchParams.get('scenario_id') || 'SCN-PROMO-01';

  const mode = process.env.COGNIX_WORLD_MODE || 'service';
  const serviceUrl = process.env.COGNIX_WORLD_SERVICE_URL || 'http://localhost:8081';

  if (mode === 'service') {
    try {
      const url = new URL('/api/v1/signals', serviceUrl);
      searchParams.forEach((value, key) => url.searchParams.set(key, value));

      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
      return NextResponse.json({
        status: 'error',
        error: 'ServiceError',
        message: `cognix-world signals endpoint returned HTTP ${res.status}`,
        timestamp: new Date().toISOString()
      }, { status: res.status });
    } catch (e: any) {
      return NextResponse.json({
        status: 'error',
        error: 'ServiceUnavailable',
        message: `Mandatory cognix-world signals service call failed: ${e.message}`,
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }
  }

  // Demo Fallback Mode
  const signals = generateSyntheticSignalSnapshot(scenarioFamily, tenantId, scenarioId);
  return NextResponse.json({
    status: 'success',
    service: 'cognix-web-demo-fallback',
    domain: 'enterprise-signals',
    tenant_id: tenantId,
    scenario_id: scenarioId,
    count: signals.length,
    timestamp: new Date().toISOString(),
    data: signals
  });
}
