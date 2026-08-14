import { NextRequest, NextResponse } from 'next/server';
import { PatternMatchRequest } from '@/packages/contracts/src/index';
import { learningPatternRepository } from '@/services/learning/src/learning-pattern-store';

const LEARNING_SERVICE_URL = process.env.LEARNING_SERVICE_URL || 'http://localhost:8082';

export async function POST(request: NextRequest) {
  try {
    const payload: PatternMatchRequest = await request.json();

    try {
      const res = await fetch(`${LEARNING_SERVICE_URL}/api/v1/learning-patterns/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': payload.tenant_id || 'tenant_uk_retail_01' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch (e) {}

    const matches = learningPatternRepository.matchLearningPatterns(payload);
    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'enterprise-learning-patterns',
      count: matches.length,
      data: matches
    });
  } catch (e: any) {
    return NextResponse.json({ status: 'error', error: 'BadRequest', message: e.message }, { status: 400 });
  }
}
