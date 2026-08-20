import { NextRequest } from 'next/server';
import { DOMAIN_CATALOGUE } from '@/config/domains';
import { capabilityRepository } from '@/services/atlas/src/capability-registry';
import { ok } from '../_shared';

/** Domains are data (ADR-002/ADR-003). This route reads config/domains.ts; it owns nothing. */
export async function GET(_request: NextRequest) {
  const all = capabilityRepository.listIdentities();
  const data = DOMAIN_CATALOGUE.map(category => ({
    category: category.category,
    items: category.items.map(item => ({
      id: item.id,
      name: item.name,
      status: item.status,
      capability_count: all.filter(c => c.domains.includes(item.id)).length
    }))
  }));
  return ok('capability-atlas-domains', data);
}
