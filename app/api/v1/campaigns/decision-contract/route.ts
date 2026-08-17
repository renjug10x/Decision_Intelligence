import { NextRequest, NextResponse } from 'next/server';
import {
  ContractCreationRequest,
  NOT_A_PREDICTION_DISCLOSURE,
  SNAPSHOT_AUTHORITY_DISCLOSURE
} from '@/packages/contracts/src/campaign-decision-contract-model';
import { createDecisionContract } from '@/lib/campaign-decision-contract-engine';

/** CDI-07A Decision Contract create. Orchestration only — contract math lives in the engine. No PATCH. */
export async function POST(request: NextRequest) {
  try {
    const payload: ContractCreationRequest = await request.json();
    const contract = createDecisionContract(payload);
    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-decision-contract',
      data: contract,
      disclosures: {
        half_life: NOT_A_PREDICTION_DISCLOSURE,
        snapshot: SNAPSHOT_AUTHORITY_DISCLOSURE
      }
    });
  } catch (e: any) {
    const rejection = e.rejection_id as string | undefined;
    const message = String(e.message || '');
    const notFound =
      message.startsWith('ContractNotFound') || message.startsWith('NotFound');
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
