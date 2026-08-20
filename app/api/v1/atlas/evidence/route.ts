import { NextRequest } from 'next/server';
import { capabilityRepository } from '@/services/atlas/src/capability-registry';
import { ok } from '../_shared';

/**
 * Evidence refs across capabilities, filterable by capability. Evidence lives in knowledge
 * modules, so this route resolves knowledge on demand and returns nothing for capabilities
 * ATL-03 has not yet authored — an honest empty, not a fabricated one.
 */
export async function GET(request: NextRequest) {
  const capabilityId = request.nextUrl.searchParams.get('capability_id');
  const identities = capabilityRepository
    .listIdentities()
    .filter(c => !capabilityId || c.capability_id === capabilityId);

  const data = [];
  for (const identity of identities) {
    const resolved = await capabilityRepository.resolve(identity.capability_id, { includeKnowledge: true });
    if (!resolved?.knowledge) continue;
    data.push({
      capability_id: identity.capability_id,
      validation_evidence: resolved.knowledge.validation_evidence,
      test_runners: resolved.knowledge.test_runners,
      acceptance_criteria_refs: resolved.knowledge.acceptance_criteria_refs,
      external_evidence: resolved.knowledge.external_evidence
    });
  }
  return ok('capability-atlas-evidence', data, { count: data.length });
}
