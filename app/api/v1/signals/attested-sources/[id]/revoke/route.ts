import { NextRequest, NextResponse } from 'next/server';
import { attestedObservationStore } from '@/lib/attested-observation-store';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const tenantId = body.tenant_id as string | undefined;

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

    const result = attestedObservationStore.revokeSource(id, tenantId);
    if (!result.ok) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'NotFound',
          message: result.error || 'Source not found for revocation'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'attested-observation-admission',
      message: `Source ${id} has been revoked`
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'InternalError',
        message: e?.message || 'Failed to revoke attested source'
      },
      { status: 500 }
    );
  }
}
