/**
 * CogniX Enterprise Signal Client
 * Typed client for interacting with same-origin /api/v1/signals endpoints.
 */

import { EnterpriseSignal } from '../packages/contracts/src/enterprise-signal-model';

export interface QuerySignalsParams {
  tenant_id?: string;
  family_id?: string;
  scenario_id?: string;
  signal_type?: string;
  category?: string;
  entity_type?: string;
  entity_id?: string;
}

export async function fetchEnterpriseSignals(params: QuerySignalsParams = {}): Promise<EnterpriseSignal[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params.tenant_id) searchParams.set('tenant_id', params.tenant_id);
    if (params.family_id) searchParams.set('family_id', params.family_id);
    if (params.scenario_id) searchParams.set('scenario_id', params.scenario_id);
    if (params.signal_type) searchParams.set('signal_type', params.signal_type);
    if (params.category) searchParams.set('category', params.category);
    if (params.entity_type) searchParams.set('entity_type', params.entity_type);
    if (params.entity_id) searchParams.set('entity_id', params.entity_id);

    const res = await fetch(`/api/v1/signals?${searchParams.toString()}`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      console.warn(`[EnterpriseSignalClient] HTTP ${res.status} when fetching signals`);
      return [];
    }

    const data = await res.json();
    return data.data || [];
  } catch (e: any) {
    console.error(`[EnterpriseSignalClient] Fetch failed: ${e.message}`);
    return [];
  }
}

export async function fetchCurrentScenarioSignals(scenarioId: string = 'SCN-PROMO-01', tenantId: string = 'tenant_uk_retail_01'): Promise<EnterpriseSignal[]> {
  try {
    const res = await fetch(`/api/v1/signals/current?scenario_id=${scenarioId}&tenant_id=${tenantId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (e: any) {
    console.error(`[EnterpriseSignalClient] Fetch current failed: ${e.message}`);
    return [];
  }
}

export async function fetchSignalById(signalId: string): Promise<EnterpriseSignal | null> {
  try {
    const res = await fetch(`/api/v1/signals/${signalId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch (e: any) {
    console.error(`[EnterpriseSignalClient] Lookup failed: ${e.message}`);
    return null;
  }
}

export async function simulateSignalTimelines(request: any): Promise<any | null> {
  try {
    const res = await fetch('/api/v1/signals/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch (e: any) {
    console.error(`[EnterpriseSignalClient] Simulation failed: ${e.message}`);
    return null;
  }
}

export async function fetchExternalSignalConnectors(params: { category?: string; status?: string } = {}): Promise<any[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params.category) searchParams.set('category', params.category);
    if (params.status) searchParams.set('status', params.status);
    const qs = searchParams.toString();
    const res = await fetch(`/api/v1/signals/connectors${qs ? `?${qs}` : ''}`, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (e: any) {
    console.error(`[EnterpriseSignalClient] Connector discovery failed: ${e.message}`);
    return [];
  }
}

export async function ingestExternalSignalEnvelopes(request: any): Promise<any | null> {
  try {
    const res = await fetch('/api/v1/signals/connectors/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    const data = await res.json();
    return data.data || null;
  } catch (e: any) {
    console.error(`[EnterpriseSignalClient] Connector ingest failed: ${e.message}`);
    return null;
  }
}
