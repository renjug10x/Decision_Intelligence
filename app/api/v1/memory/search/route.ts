import { NextRequest, NextResponse } from 'next/server';
import { MemorySearchRequest } from '@/packages/contracts/src/index';
import { memoryRepository } from '@/services/learning/src/memory-store';

const LEARNING_SERVICE_URL = process.env.LEARNING_SERVICE_URL || 'http://localhost:8082';

export async function POST(request: NextRequest) {
  try {
    const payload: MemorySearchRequest = await request.json();

    try {
      const res = await fetch(`${LEARNING_SERVICE_URL}/api/v1/memory/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': payload.tenant_id || 'tenant_uk_retail_01' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch (e) {}

    const results = memoryRepository.searchMemoryPrecedents(payload);
    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'enterprise-memory',
      count: results.length,
      data: results
    });
  } catch (e: any) {
    return NextResponse.json({ status: 'error', error: 'BadRequest', message: e.message }, { status: 400 });
  }
}
