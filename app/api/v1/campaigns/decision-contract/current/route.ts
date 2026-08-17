import { NextRequest, NextResponse } from 'next/server';
import { decisionContractStore } from '@/lib/decision-contract-store';

/** CDI-07A — ACTIVE Decision Contract for tenant/session, or null. */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tenantId = searchParams.get('tenant_id') || 'tenant_uk_retail_01';
  const sessionId = searchParams.get('session_id') || 'sess_001';
  const contract = decisionContractStore.getActiveForSession(tenantId, sessionId);

  return NextResponse.json({
    status: 'success',
    service: 'cognix-web-bff',
    domain: 'campaign-decision-contract',
    data: contract
  });
}
