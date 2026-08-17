import { NextRequest, NextResponse } from 'next/server';
import { withdrawDecisionContract } from '@/lib/campaign-decision-contract-engine';

/** CDI-07A — human withdrawal of an ACTIVE Decision Contract. Never auto-withdraws. */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const tenantId = body.tenant_id as string | undefined;
    const sessionId = body.session_id as string | undefined;
    const withdrawnBy = body.withdrawn_by as string | undefined;
    const statement = body.statement as string | undefined;
    const withdrawnAsOf = body.withdrawn_as_of as string | undefined;

    if (!tenantId || !sessionId || !withdrawnBy || !statement || !withdrawnAsOf) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'BadRequest',
          message:
            'tenant_id, session_id, withdrawn_by, statement and withdrawn_as_of are required',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    const contract = withdrawDecisionContract({
      contract_id: id,
      tenant_id: tenantId,
      session_id: sessionId,
      withdrawal: {
        withdrawn_by: withdrawnBy,
        statement,
        withdrawn_as_of: withdrawnAsOf,
        ...(body.prompted_by_assessment_id
          ? { prompted_by_assessment_id: body.prompted_by_assessment_id }
          : {})
      }
    });

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
  } catch (e: any) {
    const rejection = e.rejection_id as string | undefined;
    const message = String(e.message || '');
    const notFound =
      message.startsWith('ContractNotFound') ||
      message.startsWith('NotFound') ||
      message.startsWith('DecisionContractNotFound');
    const isRjC = typeof rejection === 'string' && rejection.startsWith('RJ-C');
    return NextResponse.json(
      {
        status: 'error',
        error: notFound ? 'NotFound' : isRjC ? rejection : rejection || 'BadRequest',
        rejection_id: rejection,
        message,
        timestamp: new Date().toISOString()
      },
      { status: notFound ? 404 : 400 }
    );
  }
}
