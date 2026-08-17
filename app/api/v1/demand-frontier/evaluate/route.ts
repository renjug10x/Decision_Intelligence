import { NextRequest, NextResponse } from 'next/server';
import { evaluateDemandDecisionFrontier } from '@/lib/demand-decision-frontier/demand-frontier-engine';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const evaluation = evaluateDemandDecisionFrontier(payload);

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'demand-decision-frontier',
      data: evaluation
    });
  } catch (e: any) {
    return NextResponse.json({
      status: 'error',
      error: 'BadRequest',
      message: `Failed to evaluate Demand Decision Frontier: ${e.message}`,
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }
}
