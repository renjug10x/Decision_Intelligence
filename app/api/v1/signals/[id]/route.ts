import { NextRequest, NextResponse } from 'next/server';
import { generateSyntheticSignalSnapshot } from '@/services/world/src/enterprise-signal-generator';
import { listRegisteredScenarios } from '@/packages/contracts/src/scenario-registry';
import { platformReceiptNowIso } from '@/packages/contracts/src/scenario-clock';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mode = process.env.COGNIX_WORLD_MODE || 'service';
  const serviceUrl = process.env.COGNIX_WORLD_SERVICE_URL || 'http://localhost:8081';

  if (mode === 'service') {
    try {
      const res = await fetch(`${serviceUrl}/api/v1/signals/${id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
      if (res.status === 404) {
        return NextResponse.json({ status: 'error', error: 'NotFound', message: `Signal ${id} not found` }, { status: 404 });
      }
    } catch (e: any) {
      return NextResponse.json({
        status: 'error',
        error: 'ServiceUnavailable',
        message: `Mandatory cognix-world signal lookup failed: ${e.message}`,
        timestamp: platformReceiptNowIso()
      }, { status: 503 });
    }
  }

  /*
   * Demo Fallback Mode. A signal is looked up across the REGISTERED catalogue rather than
   * across two hard-coded worlds, one of which (`SCN-PROMO-01`) had already been retired
   * from the connected journey while still being served from here.
   */
  const allSignals = listRegisteredScenarios().flatMap(scenario =>
    generateSyntheticSignalSnapshot(scenario, 'tenant_uk_retail_01')
  );
  const match = allSignals.find(s => s.signal_id === id);
  if (match) {
    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-demo-fallback',
      domain: 'enterprise-signals',
      data: match
    });
  }

  return NextResponse.json({ status: 'error', error: 'NotFound', message: `Signal ${id} not found` }, { status: 404 });
}
