import { NextRequest } from 'next/server';
import { capabilityRepository } from '@/services/atlas/src/capability-registry';
import { searchCapabilities } from '@/lib/atlas/capability-search';
import { getCapabilityIndex } from '@/lib/atlas/capability-index';
import { parseFilter, ok, filterError, FilterError } from '../_shared';

/**
 * Level 1 structured search (ADR-050). Deterministic and fully functional with no AI provider
 * configured. The index covers governed knowledge text as well as identity fields; it contains
 * no embedding and makes no network call. Level 2 semantic retrieval is ATL-05 and is additive.
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
