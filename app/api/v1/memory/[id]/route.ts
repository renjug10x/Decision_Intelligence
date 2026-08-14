import { NextRequest, NextResponse } from 'next/server';
import { memoryRepository } from '@/services/learning/src/memory-store';

const LEARNING_SERVICE_URL = process.env.LEARNING_SERVICE_URL || 'http://localhost:8082';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const res = await fetch(`${LEARNING_SERVICE_URL}/api/v1/memory/${id}`);
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (e) {}

  const match = memoryRepository.getMemoryCaseById(id);
  if (!match) {
    return NextResponse.json({
      status: 'error',
      error: 'NotFound',
      message: `MemoryCase '${id}' not found`,
      timestamp: new Date().toISOString()
    }, { status: 404 });
  }

  return NextResponse.json({
    status: 'success',
    service: 'cognix-web-bff',
    domain: 'enterprise-memory',
    data: match
  });
}
