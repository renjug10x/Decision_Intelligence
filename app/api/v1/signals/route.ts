import { NextRequest, NextResponse } from 'next/server';
import { generateSyntheticSignalSnapshot } from '@/services/world/src/enterprise-signal-generator';
import { platformReceiptNowIso } from '@/packages/contracts/src/scenario-clock';
import { resolveScenarioForRequest } from '../_shared/scenario-request';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tenantId = searchParams.get('tenant_id') || 'tenant_uk_retail_01';

  /*
   * ADR-077 part 4. This route used to default to `family_id=promotion_surge` and
   * `scenario_id=SCN-PROMO-01`, which is how the Observability & Governance panel — which
   * sent neither — came to publish a supplier the connected journey had retired. The
   * scenario is now resolved or refused; the family is a property of the scenario, never a
   * parameter that can contradict it.
   */
  const resolution = resolveScenarioForRequest(searchParams, 'GET /api/v1/signals');
  if (!resolution.ok) return resolution.response;
  const scenario = resolution.scenario;

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
        timestamp: platformReceiptNowIso()
      }, { status: res.status });
    } catch (e: any) {
      return NextResponse.json({
        status: 'error',
        error: 'ServiceUnavailable',
        message: `Mandatory cognix-world signals service call failed: ${e.message}`,
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
    tenant_id: tenantId,
    scenario_id: scenario.identity.scenario_id,
    scenario_family: scenario.taxonomy.family_id,
    /*
     * The scenario's own Today, published beside the signals so a reader can check the
     * freshness of an observation rather than take it on trust (ADR-078 part 3).
     */
    scenario_clock: `${scenario.calendar.observed_history_end_date}T00:00:00.000Z`,
    count: signals.length,
    // A server receipt. The evidence above carries scenario time; this carries civil time.
    timestamp: platformReceiptNowIso(),
    data: signals
  });
}
