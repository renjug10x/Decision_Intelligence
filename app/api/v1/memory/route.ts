import { NextRequest, NextResponse } from 'next/server';
import { EnterpriseMemoryCase, validateEnterpriseMemoryCase } from '@/packages/contracts/src/index';
import { memoryRepository } from '@/services/learning/src/memory-store';

const LEARNING_SERVICE_URL = process.env.LEARNING_SERVICE_URL || 'http://localhost:8082';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tenantId = searchParams.get('tenant_id') || 'tenant_uk_retail_01';
  const category = searchParams.get('category') || undefined;
  const patternId = searchParams.get('pattern_id') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    const res = await fetch(`${LEARNING_SERVICE_URL}/api/v1/memory?tenant_id=${tenantId}${category ? `&category=${category}` : ''}${patternId ? `&pattern_id=${patternId}` : ''}&limit=${limit}`, {
      headers: { 'X-Tenant-ID': tenantId }
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (e) {
    // Local fallback if learning service container is building
  }

  const cases = memoryRepository.queryMemoryCases({ tenant_id: tenantId, category, pattern_id: patternId, limit });
  return NextResponse.json({
    status: 'success',
    service: 'cognix-web-bff',
    domain: 'enterprise-memory',
    tenant_id: tenantId,
    count: cases.length,
    data: cases
  });
}

export async function POST(request: NextRequest) {
  try {
    const payload: EnterpriseMemoryCase = await request.json();
    const valResult = validateEnterpriseMemoryCase(payload);

    if (!valResult.valid) {
      return NextResponse.json({
        status: 'error',
        error: 'BadRequest',
        message: valResult.errors.join(', '),
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    try {
      const res = await fetch(`${LEARNING_SERVICE_URL}/api/v1/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': payload.tenant_id },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch (e) {
      // Local fallback
    }

    const registered = memoryRepository.registerMemoryCase(payload);
    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'enterprise-memory',
      data: registered
    });
  } catch (e: any) {
    return NextResponse.json({ status: 'error', error: 'BadRequest', message: e.message }, { status: 400 });
  }
}
