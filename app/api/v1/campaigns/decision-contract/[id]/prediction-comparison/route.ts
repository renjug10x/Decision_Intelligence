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
import { attestedObservationStore } from '@/lib/attested-observation-store';
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
    const suppliedObservations = Array.isArray(body.observations) ? body.observations : [];
    const observations = [...suppliedObservations];

    if (Array.isArray(body.observation_receipt_ids) && tenantId) {
      for (const rcptId of body.observation_receipt_ids) {
        const rcpt = attestedObservationStore.getReceipt(rcptId, tenantId);
        if (rcpt && rcpt.subject_id) {
          const obs = attestedObservationStore.getObservation(rcpt.subject_id, tenantId);
          if (obs && !observations.some(o => o.observation_id === obs.observation_id)) {
            observations.push(obs);
          }
        }
      }
    }

    if (!tenantId || !sessionId || !asOf) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'BadRequest',
          message: 'tenant_id, session_id, and as_of are required'
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
