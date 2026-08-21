import { NextRequest } from 'next/server';
import { CAPABILITY_AREAS } from '@/content/atlas/capability-areas';
import { BUSINESS_PROBLEMS } from '@/content/atlas/business-problems';
import { capabilityRepository } from '@/services/atlas/src/capability-registry';
import { validateLandscape } from '@/lib/atlas/landscape-validator';
import { ok } from '../_shared';

/**
 * The governed capability landscape (ATL-04R).
 *
 * Publishes the areas, their members resolved to names and truth dimensions, the business-problem
 * catalogue, and the landscape's own validation state. The last of those matters: the landscape
 * claims to partition the registry, and a reader is entitled to see whether that claim currently
 * holds rather than take it on trust (rule L3).
 */
export async function GET(_request: NextRequest) {
  const identities = capabilityRepository.listIdentities();
  const byId = new Map(identities.map(c => [c.capability_id, c]));

  const areas = CAPABILITY_AREAS.map(area => {
    const members = area.members
      .map(id => byId.get(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
    return {
      area_id: area.area_id,
      name: area.name,
      problem_space: area.problem_space,
      what_cognix_does: area.what_cognix_does,
      invitation: area.invitation,
      rationale: area.rationale,
      aspects: area.aspects,
      capability_count: members.length,
      reusable_count: members.filter(c => c.platform_reusable).length,
      implemented_count: members.filter(c => c.implementation_status === 'implemented').length,
      members: members.map(c => ({
        capability_id: c.capability_id,
        name: c.name,
        summary: c.summary,
        implementation_status: c.implementation_status,
        lifecycle_state: c.lifecycle_state,
        demo_maturity: capabilityRepository.resolveDemoMaturity(c),
        platform_reusable: c.platform_reusable,
        domains: c.domains,
        business_problems: c.business_problems
      }))
    };
  });

  const validation = validateLandscape(CAPABILITY_AREAS, BUSINESS_PROBLEMS, identities);

  return ok('capability-atlas-areas', {
    areas,
    business_problems: BUSINESS_PROBLEMS,
    validation: {
      valid: validation.valid,
      checked: validation.checked,
      errors: validation.errors
    }
  });
}
