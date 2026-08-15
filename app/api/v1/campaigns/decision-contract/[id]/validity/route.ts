import { NextRequest, NextResponse } from 'next/server';
import {
  NOT_A_PREDICTION_DISCLOSURE,
  QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT
} from '@/packages/contracts/src/campaign-decision-contract-model';
import { assessDecisionValidity } from '@/lib/campaign-decision-contract-engine';
import { decisionContractStore } from '@/lib/decision-contract-store';

/**
 * CDI-07A — assess Decision Contract validity at a caller-supplied as_of.
 * Computation only; never writes the store. Not a GET resource read.
 */
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
          message: 'tenant_id, session_id and as_of are required',
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

    const assessment = assessDecisionValidity({
      contract,
      as_of: asOf,
      current_campaign_intent: body.current_campaign_intent,
      current_frontier: body.current_frontier,
      current_decision_state: body.current_decision_state,
      signal_observations: body.signal_observations
    });

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-decision-contract',
      data: assessment,
      disclosures: {
        half_life: NOT_A_PREDICTION_DISCLOSURE,
        quantitative_half_life: QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT,
        not_a_prediction: NOT_A_PREDICTION_DISCLOSURE
      }
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
