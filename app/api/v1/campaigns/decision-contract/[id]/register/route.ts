import { NextRequest, NextResponse } from 'next/server';
import { resolveContractOrReject } from '@/lib/campaign-learning-loop-engine';
import { attestedObservationStore } from '@/lib/attested-observation-store';
import { learningLoopErrorResponse } from '@/lib/learning-loop-api-errors';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const tenantId = body.tenant_id as string | undefined;
    const sessionId = body.session_id as string | undefined;

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

    const contract = resolveContractOrReject(id, tenantId, sessionId, body.contract_digest);
    const result = attestedObservationStore.registerContract(contract);

    if (!result.ok) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'ContractValidationFailed',
          errors: result.errors
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        status: 'success',
        service: 'cognix-web-bff',
        domain: 'attested-observation-admission',
        data: {
          receipt: result.receipt
        }
      },
      { status: 201 }
    );
  } catch (e: any) {
    return learningLoopErrorResponse(e);
  }
}
