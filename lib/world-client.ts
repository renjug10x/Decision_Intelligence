/**
 * CogniX World Client Adapter
 * 
 * Clean Architectural Rule:
 * Browser JavaScript ALWAYS fetches the same-origin relative endpoint: '/api/v1/scenarios'.
 * No NEXT_PUBLIC_* environment variables or internal service URLs (e.g. port 8081 / http://cognix-world)
 * are ever exposed to the browser.
 * 
 * Server-side runtime modes (service / demo-fallback / local) are controlled strictly on the server
 * by COGNIX_WORLD_MODE and COGNIX_WORLD_SERVICE_URL inside the Next.js API proxy (app/api/v1/scenarios/route.ts).
 */

import { EnterpriseWorldScenario, ScenarioFamilyId } from '@/packages/contracts/src/index';

export async function fetchWorldScenario(
  familyId?: ScenarioFamilyId,
  tenantId: string = 'tenant_uk_retail_01'
): Promise<EnterpriseWorldScenario[]> {
  try {
    const query = new URLSearchParams({ tenant_id: tenantId });
    if (familyId) query.append('family_id', familyId);

    // Same-origin relative endpoint for browser-side requests
    const sameOriginUrl = `/api/v1/scenarios?${query.toString()}`;
    const response = await fetch(sameOriginUrl, {
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
    if (payload && Array.isArray(payload.data) && payload.data.length > 0) {
      return payload.data as EnterpriseWorldScenario[];
    }

    if (payload && payload.status === 'error') {
      throw new Error(payload.message || 'Upstream service error');
    }

    throw new Error('Empty payload from API proxy');
  } catch (error: any) {
    console.warn(`[WorldClient] Client fetch error for ${familyId || 'all'}: ${error.message}`);
    throw error;
  }
}
