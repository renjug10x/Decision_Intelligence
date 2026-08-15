import { NextRequest, NextResponse } from 'next/server';
import {
  NOT_A_DECISION_VERDICT_DISCLOSURE,
  OBSERVED_COUNTERFACTUAL_REQUIRED_INPUT,
  QUANTITATIVE_DECISION_HALF_LIFE_REQUIRED_INPUT
} from '@/packages/contracts/src/campaign-learning-loop-model';
import {
  comparePredictionToReality,
  resolveContractOrReject
} from '@/lib/campaign-learning-loop-engine';
import { learningLoopErrorResponse } from '@/lib/learning-loop-api-errors';

/** CDI-07B — recompute prediction vs reality at caller-supplied as_of. Never stored. */
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
    const observations = body.observations;

    if (!tenantId || !sessionId || !asOf || !Array.isArray(observations)) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'BadRequest',
          message: 'tenant_id, session_id, as_of and observations[] are required'
        },
        { status: 400 }
      );
    }

    const contract = resolveContractOrReject(id, tenantId, sessionId, body.contract_digest);
    const comparison = comparePredictionToReality({
      contract,
      as_of: asOf,
      observations,
      decision_state: body.decision_state
    });

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-learning-loop',
      data: comparison,
      disclosures: {
        not_a_decision_verdict: NOT_A_DECISION_VERDICT_DISCLOSURE,
        observed_counterfactual: OBSERVED_COUNTERFACTUAL_REQUIRED_INPUT,
        quantitative_decision_half_life: QUANTITATIVE_DECISION_HALF_LIFE_REQUIRED_INPUT
      }
    });
  } catch (e) {
    return learningLoopErrorResponse(e);
  }
}
