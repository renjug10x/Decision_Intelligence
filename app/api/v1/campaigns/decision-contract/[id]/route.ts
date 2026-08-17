import { NextRequest, NextResponse } from 'next/server';
import { decisionContractStore } from '@/lib/decision-contract-store';

/** CDI-07A — fetch Decision Contract by id, tenant/session scoped. No PATCH. */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const tenantId = request.nextUrl.searchParams.get('tenant_id');
  const sessionId = request.nextUrl.searchParams.get('session_id');

  if (!tenantId || !sessionId) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'BadRequest',
        message: 'tenant_id and session_id are required to resolve a DecisionContract by id',
        timestamp: new Date().toISOString()
      },
      { status: 400 }
    );
  }

  const contract = decisionContractStore.getById(id, tenantId, sessionId);

  if (!contract) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'NotFound',
        message: 'DecisionContractNotFound'
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: 'success',
    service: 'cognix-web-bff',
    domain: 'campaign-decision-contract',
    data: contract
  });
}
