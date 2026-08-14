import { NextRequest, NextResponse } from 'next/server';
import { learningPatternRepository } from '@/services/learning/src/learning-pattern-store';

const LEARNING_SERVICE_URL = process.env.LEARNING_SERVICE_URL || 'http://localhost:8082';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tenantId = searchParams.get('tenant_id') || 'tenant_uk_retail_01';
  const type = searchParams.get('type') || undefined;
  const category = searchParams.get('category') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    const res = await fetch(`${LEARNING_SERVICE_URL}/api/v1/learning-patterns?tenant_id=${tenantId}${type ? `&type=${type}` : ''}${category ? `&category=${category}` : ''}&limit=${limit}`, {
      headers: { 'X-Tenant-ID': tenantId }
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (e) {}

  const patterns = learningPatternRepository.queryLearningPatterns({ tenant_id: tenantId, type, category, limit });
  return NextResponse.json({
    status: 'success',
    service: 'cognix-web-bff',
    domain: 'enterprise-learning-patterns',
    tenant_id: tenantId,
    count: patterns.length,
    data: patterns
  });
}
