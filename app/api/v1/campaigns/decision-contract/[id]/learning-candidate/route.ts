import { NextRequest, NextResponse } from 'next/server';
import {
  PATTERN_PROMOTION_REQUIRED_INPUT,
  QUANTITATIVE_DECISION_HALF_LIFE_REQUIRED_INPUT,
  SINGLE_CASE_DISCLOSURE
} from '@/packages/contracts/src/campaign-learning-loop-model';
import {
  buildLearningCandidate,
  comparePredictionToReality,
  resolveContractOrReject
} from '@/lib/campaign-learning-loop-engine';
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

    let comparison = body.comparison;
    if (!comparison && Array.isArray(body.observations)) {
      comparison = comparePredictionToReality({
        contract,
        as_of: asOf,
        observations: body.observations,
        decision_state: body.decision_state
      });
    }
    if (!comparison) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'BadRequest',
          message: 'comparison or observations[] is required'
        },
        { status: 400 }
      );
    }

    const candidate = buildLearningCandidate({
      contract,
      comparison,
      as_of: asOf,
      register_memory: body.register_memory === true,
      pattern_refs: body.pattern_refs,
      decision_state: body.decision_state
    });

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-learning-loop',
      data: candidate,
      disclosures: {
        single_case: SINGLE_CASE_DISCLOSURE,
        pattern_promotion: PATTERN_PROMOTION_REQUIRED_INPUT,
        quantitative_decision_half_life: QUANTITATIVE_DECISION_HALF_LIFE_REQUIRED_INPUT
      }
    });
  } catch (e) {
    return learningLoopErrorResponse(e);
  }
}
