import { NextRequest, NextResponse } from 'next/server';
import { SignalSimulationRequest } from '@/packages/contracts/src/index';
import { simulateEnterpriseSignalTimelines } from '@/services/world/src/dynamic-signal-simulator';

export async function POST(request: NextRequest) {
  const mode = process.env.COGNIX_WORLD_MODE || 'service';
  const serviceUrl = process.env.COGNIX_WORLD_SERVICE_URL || 'http://localhost:8081';

  try {
    const payload: SignalSimulationRequest = await request.json();

    if (mode === 'service') {
      const res = await fetch(`${serviceUrl}/api/v1/signals/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store'
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
      const errText = await res.text();
      return NextResponse.json({
        status: 'error',
        error: 'ServiceError',
        message: `cognix-world simulate returned HTTP ${res.status}: ${errText}`,
        timestamp: new Date().toISOString()
      }, { status: res.status });
    }

    // Demo Fallback Mode
    const result = simulateEnterpriseSignalTimelines(payload);
    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-demo-fallback',
      domain: 'enterprise-signals',
      data: result
    });
  } catch (e: any) {
    return NextResponse.json({
      status: 'error',
      error: 'BadRequest',
      message: `Failed to process simulation request: ${e.message}`,
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }
}
