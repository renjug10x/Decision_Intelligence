import { NextRequest, NextResponse } from 'next/server';
import { attestedObservationStore } from '@/lib/attested-observation-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = attestedObservationStore.admitObservation(body);

    if (!result.ok) {
      return NextResponse.json(
        {
          status: 'error',
          error: result.rejection,
          rejection_code: result.rejection,
          message: result.error_details || `Observation rejected by admission predicate: ${result.rejection}`
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        status: 'success',
        service: 'cognix-web-bff',
        domain: 'attested-observation-admission',
        data: {
          observation: result.observation,
          receipt: result.receipt
        }
      },
      { status: 201 }
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'InternalError',
        message: e?.message || 'Failed to admit observation'
      },
      { status: 500 }
    );
  }
}
