/**
 * CogniX Scenario Registry Client
 *
 * Reads the registered scenario catalogue and which scenario the estate is running.
 *
 * Clean Architectural Rule:
 * Browser JavaScript ALWAYS fetches the same-origin relative endpoint: '/api/v1/scenarios'.
 * No NEXT_PUBLIC_* environment variables or internal service URLs (e.g. port 8081 / http://cognix-world)
 * are ever exposed to the browser.
 *
 * Server-side runtime modes (service / demo-fallback / local) are controlled strictly on the server
 * by COGNIX_WORLD_MODE and COGNIX_WORLD_SERVICE_URL inside the Next.js API proxy (app/api/v1/scenarios/route.ts).
 *
 * This client used to fetch a world FAMILY and receive that family's own economics. The
 * families are taxonomy now; the catalogue is the scenario registry (ADR-077).
 */

import { ScenarioRegistryEntry, TemporalDataPoint } from '@/packages/contracts/src/index';

export interface ScenarioCatalogueEntry extends ScenarioRegistryEntry {
  /** The family's declared shape over `T-90 … T+30`. Evidence, never an economic baseline. */
  temporal_evidence?: TemporalDataPoint[];
  /** Certification status from the Scenario Certification Gate (ADR-080). */
  certification_state?: 'CERTIFIED' | 'FAILED' | 'UNCERTIFIED';
  /** Human-readable certification summary from the gate. */
  certification_summary?: string;
}

export interface ScenarioCatalogue {
  active_scenario_id: string | null;
  scenarios: ScenarioCatalogueEntry[];
}

export async function fetchScenarioCatalogue(
  tenantId: string = 'tenant_uk_retail_01'
): Promise<ScenarioCatalogue> {
  const query = new URLSearchParams({ tenant_id: tenantId });

  // Same-origin relative endpoint for browser-side requests
  const response = await fetch(`/api/v1/scenarios?${query.toString()}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-Tenant-ID': tenantId
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    throw new Error(`API proxy responded with HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (payload && payload.status === 'error') {
    throw new Error(payload.message || 'Upstream service error');
  }
  if (!payload || !Array.isArray(payload.data)) {
    throw new Error('Empty payload from API proxy');
  }

  return {
    active_scenario_id: payload.active_scenario_id ?? null,
    scenarios: payload.data as ScenarioCatalogueEntry[]
  };
}

/** The identity of the scenario the estate is running, resolved from the registry. */
export async function fetchActiveScenarioId(
  tenantId: string = 'tenant_uk_retail_01'
): Promise<string | null> {
  const catalogue = await fetchScenarioCatalogue(tenantId);
  return catalogue.active_scenario_id
    ?? catalogue.scenarios.find(s => s.demo_active)?.scenario_id
    ?? null;
}

export interface ScenarioActivationResult {
  success: boolean;
  active_scenario_id?: string;
  error?: string;
}

/**
 * Activate a registered scenario on the server through the gated runtime.
 * Under ADR-080, only certified scenarios are admitted.
 */
export async function activateScenarioOnServer(
  scenarioId: string,
  sessionId?: string,
  tenantId: string = 'tenant_uk_retail_01'
): Promise<ScenarioActivationResult> {
  try {
    const response = await fetch('/api/v1/scenarios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Tenant-ID': tenantId
      },
      body: JSON.stringify({
        scenario_id: scenarioId,
        session_id: sessionId,
        tenant_id: tenantId
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.status === 'error') {
      return {
        success: false,
        error: payload.message || `Activation refused (HTTP ${response.status})`
      };
    }

    return {
      success: true,
      active_scenario_id: payload.active_scenario_id
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Network error during scenario activation'
    };
  }
}
