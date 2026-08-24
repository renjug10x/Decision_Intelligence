import { NextRequest } from 'next/server';
import { capabilityRepository } from '@/services/atlas/src/capability-registry';
import { loadKnowledge } from '@/services/atlas/src/capability-knowledge-store';
import { orderForLens, lensSignals } from '@/lib/atlas/lens';
import { ATLAS_LENSES, type AudienceLens, type ResolvedCapability } from '@/packages/contracts/src/capability-atlas-model';
import { parseFilter, ok, filterError, FilterError } from '../_shared';

/**
 * `?lens=` REORDERS the list. It cannot filter it.
 *
 * The response is a permutation of the filtered set under every lens — same members, same count —
 * which is `ADR-045` enforced at the transport boundary rather than trusted to the client. Each
 * item carries `lens_signals`: the governed reasons it sits where it sits, in words. No score is
 * returned, because a lens affinity rendered as a number would be an invented metric (Principle 12).
 */
export async function GET(request: NextRequest) {
  try {
    const filter = parseFilter(request.nextUrl.searchParams);
    const raw = request.nextUrl.searchParams.get('lens');
    if (raw !== null && !ATLAS_LENSES.includes(raw as AudienceLens)) {
      throw new FilterError('lens', raw, [...ATLAS_LENSES]);
    }
    const lens = (raw as AudienceLens | null) ?? null;

    const identities = capabilityRepository.listIdentities(filter);
    // All three ADR-047 maturity dimensions accompany every capability in every response.
    const base = identities.map(identity => ({
      ...identity,
      demo_maturity: capabilityRepository.resolveDemoMaturity(identity)
    }));

    if (!lens) {
      return ok('capability-atlas', base, { count: base.length, applied_filters: filter, lens: null });
    }

    // Ranking reads authored knowledge — demo paths, contracts, runners — so knowledge is loaded
    // for the ordering pass. Modules are cached after first load, so this costs one pass per
    // process rather than one per request, and the knowledge itself is NOT returned here: the list
    // response shape is unchanged beyond the additive `lens_signals`.
    const resolved: ResolvedCapability[] = [];
    for (const identity of identities) {
      resolved.push({
        identity,
        demo_maturity: capabilityRepository.resolveDemoMaturity(identity),
        relationships: capabilityRepository.resolveRelationships(identity),
        knowledge: await loadKnowledge(identity.knowledge_ref),
        lens,
        lens_field_order: []
      });
    }

    const ordered = orderForLens(resolved, lens);
    const byId = new Map(base.map(b => [b.capability_id, b]));
    const data = ordered.map(r => ({
      ...byId.get(r.identity.capability_id)!,
      lens_signals: lensSignals(r, lens)
    }));

    return ok('capability-atlas', data, { count: data.length, applied_filters: filter, lens });
  } catch (e) {
    if (e instanceof FilterError) return filterError(e);
    throw e;
  }
}
