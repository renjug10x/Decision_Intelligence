import { NextRequest } from 'next/server';
import { capabilityRepository } from '@/services/atlas/src/capability-registry';
import { searchCapabilities } from '@/lib/atlas/capability-search';
import { getCapabilityIndex } from '@/lib/atlas/capability-index';
import { parseFilter, ok, filterError, FilterError } from '../_shared';

/**
 * Level 1 structured search (ADR-050). Deterministic and fully functional with no AI provider
 * configured. The index covers governed knowledge text as well as identity fields; it contains no
 * embedding and makes no network call.
 *
 * The response carries `expansions`: where the governed vocabulary reached a capability the
 * searcher's own words would have missed, it says which alias fired, what it added and why
 * (ADR-059). Level 2 semantic retrieval is **deferred on measurement** — the failures it was meant
 * to fix were lexical, and the vocabulary closed them (ADR-058).
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const query = params.get('q') ?? '';
    const filter = parseFilter(params);
    const identities = capabilityRepository.listIdentities(filter);
    const index = await getCapabilityIndex(capabilityRepository.listIdentities());
    const response = searchCapabilities(identities, query, filter, {
      resolveDemoMaturity: c => capabilityRepository.resolveDemoMaturity(c)
    }, { index });
    return ok('capability-atlas-search', response);
  } catch (e) {
    if (e instanceof FilterError) return filterError(e);
    throw e;
  }
}
