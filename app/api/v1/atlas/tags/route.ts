import { NextRequest } from 'next/server';
import { capabilityRepository } from '@/services/atlas/src/capability-registry';
import { ok } from '../_shared';

export async function GET(_request: NextRequest) {
  const data = capabilityRepository.listTags();
  return ok('capability-atlas-tags', data, { count: data.length });
}
