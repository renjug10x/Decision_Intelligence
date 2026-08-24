import { NextRequest } from 'next/server';
import { capabilityRepository } from '@/services/atlas/src/capability-registry';
import { ok } from '../_shared';

/**
 * The capability graph, plus the ADR-052 cardinality view: which capabilities each work
 * package delivered. `DDF-01` returning four capability ids is the case that decided ADR-052.
 */
export async function GET(_request: NextRequest) {
  const identities = capabilityRepository.listIdentities();
  const edges = identities.map(identity => ({
    capability_id: identity.capability_id,
    name: identity.name,
    ...capabilityRepository.resolveRelationships(identity)
  }));
  return ok('capability-atlas-relationships', {
    edges,
    delivered_by: capabilityRepository.listDeliveredBy()
  }, { count: edges.length });
}
