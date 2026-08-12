import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const healthType = searchParams.get('type') || 'live';

  return NextResponse.json({
    status: 'ok',
    service: 'cognix-web-presentation',
    type: healthType,
    uptime_seconds: process.uptime(),
    timestamp: new Date().toISOString()
  });
}
