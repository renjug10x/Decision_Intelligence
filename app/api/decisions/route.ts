import { NextResponse } from 'next/server';
import { getDecisions } from '@/lib/decision-engine';

export async function GET() {
  try {
    const decisions = getDecisions();
    return NextResponse.json({ decisions });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load decisions' }, { status: 500 });
  }
}
