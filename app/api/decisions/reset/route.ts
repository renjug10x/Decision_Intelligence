import { NextResponse } from 'next/server';
import { resetDecisions } from '@/lib/decision-engine';

export async function POST() {
  try {
    const decisions = resetDecisions();
    return NextResponse.json({ decisions, reset: true });
  } catch {
    return NextResponse.json({ error: 'Failed to reset decisions' }, { status: 500 });
  }
}
