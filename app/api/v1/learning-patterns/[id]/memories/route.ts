import { NextRequest, NextResponse } from 'next/server';
import { learningPatternRepository } from '@/services/learning/src/learning-pattern-store';

const LEARNING_SERVICE_URL = process.env.LEARNING_SERVICE_URL || 'http://localhost:8082';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenantId = request.nextUrl.searchParams.get('tenant_id') || request.headers.get('x-tenant-id') || 'tenant_uk_retail_01';

  try {
    const res = await fetch(`${LEARNING_SERVICE_URL}/api/v1/learning-patterns/${id}/memories?tenant_id=${encodeURIComponent(tenantId)}`, {
      headers: { 'x-tenant-id': tenantId }
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (e) {}

  const supporting = learningPatternRepository.getSupportingMemories(id, tenantId);
  return NextResponse.json({
    status: 'success',
    service: 'cognix-web-bff',
    domain: 'enterprise-learning-patterns',
    pattern_id: id,
    tenant_id: tenantId,
    count: supporting.length,
    data: supporting
  });
}
