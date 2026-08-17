import { NextRequest, NextResponse } from 'next/server';
import { ExternalSignalIngestRequest } from '@/packages/contracts/src/index';
import { ingestExternalSignals } from '@/services/world/src/external-signal-connector';

export async function POST(request: NextRequest) {
  const mode = process.env.COGNIX_WORLD_MODE || 'service';
  const serviceUrl = process.env.COGNIX_WORLD_SERVICE_URL || 'http://localhost:8081';

  try {
    const payload: ExternalSignalIngestRequest = await request.json();

    if (mode === 'service') {
      const res = await fetch(`${serviceUrl}/api/v1/signals/connectors/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(payload.tenant_id ? { 'X-Tenant-ID': payload.tenant_id } : {})
        },
        body: JSON.stringify(payload),
        cache: 'no-store'
      });

      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    const result = ingestExternalSignals(payload);
    return NextResponse.json({
      status: result.accepted_count > 0 ? 'success' : 'error',
      service: 'cognix-web-demo-fallback',
      domain: 'enterprise-signal-connectors',
      data: result
    }, { status: result.accepted_count > 0 ? 200 : 400 });
  } catch (e: any) {
    return NextResponse.json({
      status: 'error',
      error: 'BadRequest',
      message: `Failed to process connector ingest request: ${e.message}`,
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }
}
