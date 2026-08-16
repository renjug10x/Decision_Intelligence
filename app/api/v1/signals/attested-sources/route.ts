import { NextRequest, NextResponse } from 'next/server';
import { attestedObservationStore } from '@/lib/attested-observation-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = attestedObservationStore.registerSource(body);

    if (!result.ok) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'BadRequest',
          errors: result.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        status: 'success',
        service: 'cognix-web-bff',
        domain: 'attested-observation-admission',
        data: {
          source: result.source,
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
        message: e?.message || 'Failed to register attested source'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id') || request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'BadRequest',
          message: 'tenant_id is required'
        },
        { status: 400 }
      );
    }

    const sources = attestedObservationStore.listSources(tenantId);
    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'attested-observation-admission',
      data: sources
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'InternalError',
        message: e?.message || 'Failed to list attested sources'
      },
      { status: 500 }
    );
  }
}
