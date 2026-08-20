import { NextRequest } from 'next/server';
import { capabilityRepository } from '@/services/atlas/src/capability-registry';
import { parseFilter, ok, filterError, FilterError } from '../_shared';

export async function GET(request: NextRequest) {
  try {
    const filter = parseFilter(request.nextUrl.searchParams);
    const identities = capabilityRepository.listIdentities(filter);
    // All three ADR-047 maturity dimensions accompany every capability in every response.
    const data = identities.map(identity => ({
      ...identity,
      demo_maturity: capabilityRepository.resolveDemoMaturity(identity)
    }));
    return ok('capability-atlas', data, { count: data.length, applied_filters: filter });
  } catch (e) {
    if (e instanceof FilterError) return filterError(e);
    throw e;
  }
}
