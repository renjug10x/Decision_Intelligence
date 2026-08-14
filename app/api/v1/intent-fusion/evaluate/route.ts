import { NextRequest, NextResponse } from 'next/server';
import { IntentFusionRequest, validateIntentFusionRequest } from '@/packages/contracts/src/index';
import { evaluateIntentFusion } from '@/lib/intent-fusion/intent-fusion-engine';

export async function POST(request: NextRequest) {
  try {
    const payload: IntentFusionRequest = await request.json();
    const valResult = validateIntentFusionRequest(payload);

    if (!valResult.valid) {
      return NextResponse.json({
        status: 'error',
        error: 'BadRequest',
        message: valResult.errors.join(', '),
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const outlook = evaluateIntentFusion(payload);

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'intent-fusion',
      data: outlook
    });
  } catch (e: any) {
    return NextResponse.json({
      status: 'error',
      error: 'BadRequest',
      message: `Failed to evaluate Intent Fusion: ${e.message}`,
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }
}
