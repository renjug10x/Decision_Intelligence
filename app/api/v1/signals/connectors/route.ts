import { NextRequest, NextResponse } from 'next/server';
import { listExternalSignalConnectors } from '@/services/world/src/external-signal-connector';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = process.env.COGNIX_WORLD_MODE || 'service';
  const serviceUrl = process.env.COGNIX_WORLD_SERVICE_URL || 'http://localhost:8081';

  if (mode === 'service') {
    try {
      const url = new URL('/api/v1/signals/connectors', serviceUrl);
      searchParams.forEach((value, key) => url.searchParams.set(key, value));

      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
      return NextResponse.json({
        status: 'error',
        error: 'ServiceError',
        message: `cognix-world connectors endpoint returned HTTP ${res.status}`,
        timestamp: new Date().toISOString()
      }, { status: res.status });
    } catch (e: any) {
      return NextResponse.json({
        status: 'error',
        error: 'ServiceUnavailable',
        message: `Mandatory cognix-world connectors service call failed: ${e.message}`,
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }
  }

  const category = searchParams.get('category') || undefined;
  const status = searchParams.get('status') || undefined;
  const connectors = listExternalSignalConnectors({ category, status });

  return NextResponse.json({
    status: 'success',
    service: 'cognix-web-demo-fallback',
    domain: 'enterprise-signal-connectors',
    count: connectors.length,
    timestamp: new Date().toISOString(),
    data: connectors
  });
}
