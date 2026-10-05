import { NextRequest, NextResponse } from 'next/server';
import { CampaignEvaluationRequest } from '@/packages/contracts/src/campaign-counterfactual-model';
import { resolveScenario, scenarioInScope } from '@/packages/contracts/src/index';
import { evaluateCampaignDecision } from '@/lib/campaign-causal-engine';
import { extractCompetitiveContextFromIntent } from '@/lib/campaign-candidate-intervention';
import { evaluateCompetitiveCdiDecision } from '@/lib/competitive-price-response';

/** Combined CDI-02 evaluation: counterfactual + causal in one response. */
export async function POST(request: NextRequest) {
  try {
    const payload: CampaignEvaluationRequest = await request.json();
    const extractedCompetitive = extractCompetitiveContextFromIntent(payload.campaign_intent);
    const result = extractedCompetitive
      ? (() => {
          const scenarioId = payload.campaign_intent?.decision_context?.scenario_id;
          const scenario = scenarioId ? resolveScenario(scenarioId) : scenarioInScope();
          return evaluateCompetitiveCdiDecision(
            scenario,
            payload,
            extractedCompetitive.assumption
          ).cdi_response;
        })()
      : evaluateCampaignDecision(payload);

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-decision-evaluation',
      data: result
    });
  } catch (e: any) {
    const notFound = String(e.message).startsWith('CampaignIntentNotFound');
    return NextResponse.json({
      status: 'error',
      error: notFound ? 'NotFound' : 'BadRequest',
      message: e.message,
      timestamp: new Date().toISOString()
    }, { status: notFound ? 404 : 400 });
  }
}
