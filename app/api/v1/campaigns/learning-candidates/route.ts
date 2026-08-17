import { NextRequest, NextResponse } from 'next/server';
import { learningCandidateStore } from '@/lib/learning-candidate-store';
import { learningLoopErrorResponse } from '@/lib/learning-loop-api-errors';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get('tenant_id');
    const sessionId = request.nextUrl.searchParams.get('session_id');
    const contractId = request.nextUrl.searchParams.get('contract_id');

    if (!tenantId || !sessionId) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'BadRequest',
          message: 'tenant_id and session_id are required'
        },
        { status: 400 }
      );
    }

    const rows = contractId
      ? learningCandidateStore.listForContract(contractId, tenantId, sessionId)
      : learningCandidateStore.listForSession(tenantId, sessionId);

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-learning-loop',
      data: rows
    });
  } catch (e) {
    return learningLoopErrorResponse(e);
  }
}
