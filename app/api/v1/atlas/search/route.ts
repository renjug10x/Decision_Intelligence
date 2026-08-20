import { NextRequest } from 'next/server';
import { capabilityRepository } from '@/services/atlas/src/capability-registry';
import { searchCapabilities } from '@/lib/atlas/capability-search';
import { parseFilter, ok, filterError, FilterError } from '../_shared';

/**
 * Level 1 structured search (ADR-050). Deterministic and fully functional with no AI
 * provider configured. Level 2 semantic retrieval is added at ATL-05 and merges into this
 * response under a documented policy; the `level` field on each result distinguishes them.
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const query = params.get('q') ?? '';
    const filter = parseFilter(params);
    const identities = capabilityRepository.listIdentities(filter);
    const response = searchCapabilities(identities, query, filter, {
      resolveDemoMaturity: c => capabilityRepository.resolveDemoMaturity(c)
    });
    return ok('capability-atlas-search', response);
  } catch (e) {
    if (e instanceof FilterError) return filterError(e);
    throw e;
  }
}
