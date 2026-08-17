import { NextRequest, NextResponse } from 'next/server';
import { FrontierEvaluationRequest } from '@/packages/contracts/src/campaign-frontier-model';
import { evaluateOutcomeFrontier } from '@/lib/campaign-frontier-engine';

/** CDI-06 Outcome Frontier & Competing Strategies. Orchestration only — frontier math lives in the engine. */
export async function POST(request: NextRequest) {
  try {
    const payload: FrontierEvaluationRequest = await request.json();
    const result = evaluateOutcomeFrontier(payload);
    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-decision-outcome-frontier',
      data: result,
      disclosures: {
        axes: 'exactly two Pareto axes — attributable_volume_uplift_pp and contribution_delta_gbp',
        ambient_frame: 'ARF-A (SIGNALS_EXCLUDED) only',
        scenario_zero: 'Do Nothing is always present; never framed as no change',
        selection: 'declared constraints only — no ranking, weights, or utilities',
        generation_policy: 'synthetic_demonstration_policy — play_grid_override forbidden (RJ-G1)'
      }
    });
  } catch (e: any) {
    const rejection = e.rejection_id as string | undefined;
    const notFound = String(e.message).startsWith('CampaignIntentNotFound');
    const isRjG1 = rejection === 'RJ-G1';
    return NextResponse.json(
      {
        status: 'error',
        error: notFound ? 'NotFound' : isRjG1 ? 'RJ-G1' : rejection || 'BadRequest',
        rejection_id: rejection,
        message: e.message,
        timestamp: new Date().toISOString()
      },
      { status: notFound ? 404 : 400 }
    );
  }
}
