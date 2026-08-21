import { NextRequest } from 'next/server';
import { CURIOSITY_QUESTIONS, getQuestionsForCapability } from '@/content/atlas/curiosity-questions';
import { ok } from '../_shared';

/**
 * Questions Worth Asking as governed knowledge objects.
 *
 * `capability_id` returns only questions EXPLICITLY linked to that capability. Links are never
 * resolved transitively through a shared solution or experiment — that would attach a question to
 * capabilities it does not ask about (owner decision, 2026-08-20).
 */
export async function GET(request: NextRequest) {
  const capabilityId = request.nextUrl.searchParams.get('capability_id');
  const data = capabilityId ? getQuestionsForCapability(capabilityId) : CURIOSITY_QUESTIONS;
  return ok('capability-atlas-questions', data, { count: data.length });
}
