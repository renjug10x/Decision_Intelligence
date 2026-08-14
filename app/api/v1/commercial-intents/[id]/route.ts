import { NextRequest, NextResponse } from 'next/server';
import { getCommercialIntentById } from '@/lib/commercial-intent-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const intent = getCommercialIntentById(id);

  if (!intent) {
    return NextResponse.json({
      status: 'error',
      error: 'NotFound',
      message: `CommercialIntent '${id}' not found`,
      timestamp: new Date().toISOString()
    }, { status: 404 });
  }

  return NextResponse.json({
    status: 'success',
    service: 'cognix-web-bff',
    domain: 'commercial-intents',
    data: intent
  });
}
