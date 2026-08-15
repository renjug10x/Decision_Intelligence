import { NextRequest, NextResponse } from 'next/server';
import { CampaignEvaluationRequest } from '@/packages/contracts/src/campaign-counterfactual-model';
import { evaluateCampaignDecision } from '@/lib/campaign-causal-engine';

/** Combined CDI-02 evaluation: counterfactual + causal in one response. */
export async function POST(request: NextRequest) {
  try {
    const payload: CampaignEvaluationRequest = await request.json();
    const result = evaluateCampaignDecision(payload);
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
