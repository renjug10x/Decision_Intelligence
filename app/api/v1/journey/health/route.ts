import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    service: 'cognix-journey-domain',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
}
