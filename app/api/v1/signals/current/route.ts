import { NextRequest, NextResponse } from 'next/server';
import { generateSyntheticSignalSnapshot } from '@/services/world/src/enterprise-signal-generator';
import { platformReceiptNowIso } from '@/packages/contracts/src/scenario-clock';
import { requestTenantId, resolveScenarioForRequest } from '../../_shared/scenario-request';
import { snapshotFiltersFrom, worldSignalSnapshotResponse } from '../../_shared/world-signal-snapshot';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tenantId = requestTenantId(searchParams);

  // ADR-077 part 4: resolved or refused, never defaulted to `SCN-PROMO-01`.
  const resolution = resolveScenarioForRequest(searchParams, 'GET /api/v1/signals/current');
  if (!resolution.ok) return resolution.response;
  const scenario = resolution.scenario;

  const mode = process.env.COGNIX_WORLD_MODE || 'service';
  const serviceUrl = process.env.COGNIX_WORLD_SERVICE_URL || 'http://localhost:8081';

  if (mode === 'service') {
    // `SCI-07R` (ADR-085): the resolved record travels; an upstream refusal is never a fallback.
    return worldSignalSnapshotResponse(serviceUrl, scenario, tenantId, snapshotFiltersFrom(searchParams), 'current signals snapshot');
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
