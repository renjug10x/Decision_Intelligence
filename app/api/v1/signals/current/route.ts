import { NextRequest, NextResponse } from 'next/server';
import { generateSyntheticSignalSnapshot } from '@/services/world/src/enterprise-signal-generator';
import { platformReceiptNowIso } from '@/packages/contracts/src/scenario-clock';
import { resolveScenarioForRequest } from '../../_shared/scenario-request';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tenantId = searchParams.get('tenant_id') || 'tenant_uk_retail_01';

  // ADR-077 part 4: resolved or refused, never defaulted to `SCN-PROMO-01`.
  const resolution = resolveScenarioForRequest(searchParams, 'GET /api/v1/signals/current');
  if (!resolution.ok) return resolution.response;
  const scenario = resolution.scenario;

  const mode = process.env.COGNIX_WORLD_MODE || 'service';
  const serviceUrl = process.env.COGNIX_WORLD_SERVICE_URL || 'http://localhost:8081';

  if (mode === 'service') {
    try {
      const url = new URL('/api/v1/signals/current', serviceUrl);
      searchParams.forEach((value, key) => url.searchParams.set(key, value));

      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch (e: any) {
      return NextResponse.json({
        status: 'error',
        error: 'ServiceUnavailable',
        message: `Mandatory cognix-world current signals call failed: ${e.message}`,
        timestamp: platformReceiptNowIso()
      }, { status: 503 });
    }
  }

  // Demo Fallback Mode
  const signals = generateSyntheticSignalSnapshot(scenario, tenantId);
  return NextResponse.json({
    status: 'success',
    service: 'cognix-web-demo-fallback',
    domain: 'enterprise-signals',
    scenario_id: scenario.identity.scenario_id,
    scenario_family: scenario.taxonomy.family_id,
    scenario_clock: `${scenario.calendar.observed_history_end_date}T00:00:00.000Z`,
    count: signals.length,
    timestamp: platformReceiptNowIso(),
    data: signals
  });
}
