import { NextRequest, NextResponse } from 'next/server';
import { listIngestedExternalSignals } from '@/services/world/src/external-signal-connector';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tenantId = searchParams.get('tenant_id') || 'tenant_uk_retail_01';
  const sessionId = searchParams.get('session_id') || undefined;
  const mode = process.env.COGNIX_WORLD_MODE || 'service';
  const serviceUrl = process.env.COGNIX_WORLD_SERVICE_URL || 'http://localhost:8081';

  if (mode === 'service') {
    try {
      const url = new URL('/api/v1/signals/connectors/ingested', serviceUrl);
      searchParams.forEach((value, key) => url.searchParams.set(key, value));
      if (!url.searchParams.get('tenant_id')) url.searchParams.set('tenant_id', tenantId);

      const res = await fetch(url.toString(), {
        headers: { 'X-Tenant-ID': tenantId },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
      return NextResponse.json({
        status: 'error',
        error: 'ServiceError',
        message: `cognix-world ingested connectors endpoint returned HTTP ${res.status}`,
        timestamp: new Date().toISOString()
      }, { status: res.status });
    } catch (e: any) {
      return NextResponse.json({
        status: 'error',
        error: 'ServiceUnavailable',
        message: `Mandatory cognix-world ingested connectors call failed: ${e.message}`,
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }
  }

  const signals = listIngestedExternalSignals(tenantId, sessionId);
  return NextResponse.json({
    status: 'success',
    service: 'cognix-web-demo-fallback',
    domain: 'enterprise-signal-connectors',
    tenant_id: tenantId,
    count: signals.length,
    timestamp: new Date().toISOString(),
    data: signals
  });
}
