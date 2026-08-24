import { NextRequest } from 'next/server';
import { capabilityRepository } from '@/services/atlas/src/capability-registry';
import { clarify, applyChoice } from '@/lib/atlas/clarification';
import { parseFilter, ok, filterError, FilterError } from '../_shared';
import type {
  ExplorationContext,
  ClarificationChoice
} from '@/packages/contracts/src/capability-atlas-model';

/**
 * Progressive clarification (ATL-04R, ADR-061).
 *
 * POST rather than GET because the accumulated `ExplorationContext` is a structure, not a query
 * string. Deterministic end to end: no provider is consulted, no credential is required and no
 * network call leaves the process, which is what allows clarification to be the way a reader
 * reaches everything else even when grounding is unavailable.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const query = typeof body.query === 'string' ? body.query : '';
    const step = Number.isFinite(body.step) ? Number(body.step) : 0;
    let context = (body.context ?? undefined) as Partial<ExplorationContext> | undefined;

    // Choices are folded in HERE rather than in the browser. `applyChoice` reads the governed area
    // records to resolve an aspect back to its owning area, and that resolution belongs on the
    // server for the same reason capability prose does (ADR-046) — the client renders a decision,
    // it does not hold the vocabulary the decision is made from.
    const choices = Array.isArray(body.choices) ? (body.choices as ClarificationChoice[]) : [];
    const refinement = typeof body.refinement === 'string' ? body.refinement.trim() : '';
    if (choices.length > 0 || refinement) {
      let next: ExplorationContext = {
        query,
        areas: context?.areas ?? [],
        aspects: context?.aspects ?? [],
        lens: context?.lens ?? null,
        domain: context?.domain ?? null,
        refinements: context?.refinements ?? []
      };
      for (const choice of choices) next = applyChoice(next, choice);
      if (refinement && !next.refinements.includes(refinement)) {
        next = { ...next, refinements: [...next.refinements, refinement] };
      }
      context = next;
    }

    const filter = parseFilter(request.nextUrl.searchParams);
    const identities = capabilityRepository.listIdentities(filter);

    const response = clarify(identities, { query, context, step }, filter, {
      resolveDemoMaturity: c => capabilityRepository.resolveDemoMaturity(c)
    });

    return ok('capability-atlas-clarify', response);
  } catch (e) {
    if (e instanceof FilterError) return filterError(e);
    throw e;
  }
}
