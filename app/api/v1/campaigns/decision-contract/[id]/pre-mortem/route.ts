import { NextRequest, NextResponse } from 'next/server';
import {
  DERIVED_IMPACT_SCOPE_DISCLOSURE,
  NOT_A_DECISION_VERDICT_DISCLOSURE,
  QUANTITATIVE_DECISION_HALF_LIFE_REQUIRED_INPUT
} from '@/packages/contracts/src/campaign-learning-loop-model';
import {
  createPreMortem,
  resolveContractOrReject
} from '@/lib/campaign-learning-loop-engine';
import { preMortemStore } from '@/lib/pre-mortem-store';
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
    const asOf = body.as_of as string | undefined;

    if (!tenantId || !sessionId || !asOf) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'BadRequest',
          message: 'tenant_id, session_id and as_of are required'
        },
        { status: 400 }
      );
    }

    const contract = resolveContractOrReject(id, tenantId, sessionId, body.contract_digest);
    const preMortem = createPreMortem({
      contract,
      as_of: asOf,
      decision_state_derived_impacts: body.decision_state_derived_impacts
    });

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-learning-loop',
      data: preMortem,
      disclosures: {
        derived_impact_scope: DERIVED_IMPACT_SCOPE_DISCLOSURE,
        not_a_decision_verdict: NOT_A_DECISION_VERDICT_DISCLOSURE,
        quantitative_decision_half_life: QUANTITATIVE_DECISION_HALF_LIFE_REQUIRED_INPUT
      }
    });
  } catch (e) {
    return learningLoopErrorResponse(e);
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const tenantId = request.nextUrl.searchParams.get('tenant_id');
    const sessionId = request.nextUrl.searchParams.get('session_id');

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

    const preMortem = preMortemStore.getActiveForContract(id, tenantId, sessionId);
    if (!preMortem) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'NotFound',
          message: 'PreMortemNotFound'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-learning-loop',
      data: preMortem
    });
  } catch (e) {
    return learningLoopErrorResponse(e);
  }
}
