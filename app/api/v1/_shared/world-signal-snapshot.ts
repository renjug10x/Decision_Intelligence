/**
 * Scenario signals from `cognix-world`, carrying the record (`SCI-07R`, ADR-085 part 2).
 *
 * The one way a BFF route asks the world service for a scenario's signals in `service` mode. The
 * scenario has ALREADY been resolved here, through the gated scenario runtime and for the caller's
 * tenant; the world service receives that record and computes over it. It never resolves an identity,
 * so a scenario authored and certified in this process is served exactly as a curated pack is.
 *
 * Failure is explicit. `/api/v1/signals/current` used to fall through to in-process generation on any
 * non-OK upstream while the estate was configured `service`, labelling the result
 * `cognix-web-demo-fallback` — which is how an authored scenario appeared to work in `service` mode
 * while never reaching the service. An upstream refusal is now passed on as a refusal, and an
 * unreachable upstream is `503`.
 */
import { NextResponse } from 'next/server';
import type { CanonicalScenario } from '@/packages/contracts/src/canonical-scenario-model';
import { platformReceiptNowIso } from '@/packages/contracts/src/scenario-clock';
import {
  SIGNAL_SNAPSHOT_PATH,
  type ScenarioSignalSnapshotFilters,
  type ScenarioSignalSnapshotRequest
} from '@/services/world/src/scenario-signal-snapshot';

export function snapshotFiltersFrom(searchParams: URLSearchParams): ScenarioSignalSnapshotFilters {
  const filters: ScenarioSignalSnapshotFilters = {};
  for (const key of ['signal_type', 'category', 'entity_type', 'entity_id'] as const) {
    const value = searchParams.get(key);
    if (value) filters[key] = value;
  }
  return filters;
}

export async function worldSignalSnapshotResponse(
  serviceUrl: string,
  scenario: CanonicalScenario,
  tenantId: string,
  filters: ScenarioSignalSnapshotFilters,
  routeName: string
): Promise<NextResponse> {
  const body: ScenarioSignalSnapshotRequest = { tenant_id: tenantId, scenario, filters };
  try {
    const res = await fetch(new URL(SIGNAL_SNAPSHOT_PATH, serviceUrl).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantId },
      body: JSON.stringify(body),
      cache: 'no-store'
    });
    const payload = await res.json().catch(() => null);
    if (res.ok && payload) return NextResponse.json(payload);
    return NextResponse.json({
      status: 'error',
      error: 'ServiceError',
      message: `cognix-world ${routeName} returned HTTP ${res.status}${payload?.message ? `: ${payload.message}` : ''}`,
      timestamp: platformReceiptNowIso()
    }, { status: res.ok ? 502 : res.status });
  } catch (e: unknown) {
    return NextResponse.json({
      status: 'error',
      error: 'ServiceUnavailable',
      message: `Mandatory cognix-world ${routeName} call failed: ${e instanceof Error ? e.message : 'unreachable'}`,
      timestamp: platformReceiptNowIso()
    }, { status: 503 });
  }
}
