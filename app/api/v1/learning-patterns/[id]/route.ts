import { NextRequest, NextResponse } from 'next/server';
import { learningPatternRepository } from '@/services/learning/src/learning-pattern-store';

const LEARNING_SERVICE_URL = process.env.LEARNING_SERVICE_URL || 'http://localhost:8082';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const res = await fetch(`${LEARNING_SERVICE_URL}/api/v1/learning-patterns/${id}`);
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (e) {}

  const match = learningPatternRepository.getLearningPatternById(id);
  if (!match) {
    return NextResponse.json({
      status: 'error',
      error: 'NotFound',
      message: `LearningPattern '${id}' not found`,
      timestamp: new Date().toISOString()
    }, { status: 404 });
  }

  return NextResponse.json({
    status: 'success',
    service: 'cognix-web-bff',
    domain: 'enterprise-learning-patterns',
    data: match
  });
}
