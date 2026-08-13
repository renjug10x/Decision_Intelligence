import { NextResponse } from 'next/server';

export async function GET() {
  const mode = process.env.COGNIX_WORLD_MODE || 'service';
  const serviceUrl = process.env.COGNIX_WORLD_SERVICE_URL || 'http://localhost:8081';

  if (mode === 'service') {
    try {
      const res = await fetch(`${serviceUrl}/api/v1/signals/health`, {
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch (e: any) {
      return NextResponse.json({
        status: 'error',
        error: 'ServiceUnavailable',
        message: `Mandatory cognix-world signals health call failed: ${e.message}`,
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }
  }

  return NextResponse.json({
    status: 'ok',
    service: 'cognix-web-proxy',
    domain: 'enterprise-signals',
    mode,
    timestamp: new Date().toISOString()
  });
}
