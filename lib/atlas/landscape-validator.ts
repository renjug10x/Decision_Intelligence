/**
 * Capability landscape validation (ATL-04R).
 *
 * The landscape is the first thing a reader sees, which makes it the first place a convenient
 * fiction would land: an area invented to round the grid to six, a member quietly dropped because
 * it did not fit the story, a clarification choice that selects a capability the area does not own.
 * Each of those failures is invisible on the page and obvious to this file.
 *
 * Rule **L3** is the one that matters most. It requires the areas to PARTITION the registry —
 * every registered capability in exactly one area, no capability in none, no capability in two.
 * That is a stronger claim than "the areas are populated", and it is what lets the interface tell a
 * reader that walking seven surfaces means they have seen the estate. Without it the landscape
 * degrades into a curated selection of the flattering capabilities, which is the presentational
 * failure `ATL-01` found in the Innovation Portfolio and recorded as a limitation against
 * `CAP-INNOVATION-PORTFOLIO`.
 *
 * Rule **L5** keeps clarification honest: an aspect may only select members of its own area, so a
 * prepared response can narrow what a reader already found and can never widen it or reach a
 * capability from somewhere else.
 */

import type {
  CapabilityArea,
  BusinessProblem,
  CapabilityIdentity,
  ValidationIssue,
  ValidationReport,
  VisualSpec
} from '../../packages/contracts/src/capability-atlas-model';
import { CAPABILITY_AREA_ID_PATTERN } from '../../packages/contracts/src/capability-atlas-model';

function issue(rule: string, subject: string, field: string, message: string): ValidationIssue {
  return { rule, capability_id: subject, field, message, severity: 'error' };
}

export function validateLandscape(
  areas: CapabilityArea[],
  problems: BusinessProblem[],
  identities: CapabilityIdentity[]
): ValidationReport {
  const errors: ValidationIssue[] = [];
  const registered = new Set(identities.map(c => c.capability_id));
  const seenAreaIds = new Set<string>();
  const seenAspectIds = new Set<string>();
  const homeCount = new Map<string, string[]>();

  for (const area of areas) {
    // L1 — identity
    if (!CAPABILITY_AREA_ID_PATTERN.test(area.area_id)) {
      errors.push(issue('L1', area.area_id, 'area_id', `'${area.area_id}' does not match the CAPAREA-* namespace.`));
    }
    if (seenAreaIds.has(area.area_id)) {
      errors.push(issue('L1', area.area_id, 'area_id', 'Duplicate area identifier.'));
    }
    seenAreaIds.add(area.area_id);

    // L2 — an area must explain itself in the reader's language
    for (const field of ['name', 'problem_space', 'what_cognix_does', 'invitation'] as const) {
      if (!(area[field] ?? '').trim()) {
        errors.push(issue('L2', area.area_id, field, `An area must carry a ${field.replace(/_/g, ' ')}.`));
      }
    }
    if ((area.rationale ?? '').trim().length < 40) {
      errors.push(issue('L2', area.area_id, 'rationale',
        'An area must carry a written rationale of at least 40 characters, so its membership can be disagreed with.'));
    }
    if (!area.owner?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(area.reviewed_at ?? '')) {
      errors.push(issue('L2', area.area_id, 'reviewed_at', 'An area must carry an owner and an ISO review date.'));
    }

    // L3 (first half) — members are real, and no area is empty
    if (!area.members?.length) {
      errors.push(issue('L3', area.area_id, 'members',
        'An area with no members is a category invented to fill the landscape.'));
    }
    for (const member of area.members ?? []) {
      if (!registered.has(member)) {
        errors.push(issue('L3', area.area_id, 'members', `'${member}' is not a registered capability.`));
      }
      homeCount.set(member, [...(homeCount.get(member) ?? []), area.area_id]);
    }

    // L4 — aspects are well formed and distinct
    for (const aspect of area.aspects ?? []) {
      if (!aspect.aspect_id?.trim() || !aspect.label?.trim()) {
        errors.push(issue('L4', area.area_id, 'aspects', 'Every aspect needs an identifier and a label.'));
      }
      if (seenAspectIds.has(aspect.aspect_id)) {
        errors.push(issue('L4', area.area_id, 'aspects', `Duplicate aspect identifier '${aspect.aspect_id}'.`));
      }
      seenAspectIds.add(aspect.aspect_id);
      if (!aspect.selects?.length) {
        errors.push(issue('L4', area.area_id, 'aspects',
          `Aspect '${aspect.aspect_id}' selects nothing, so choosing it would return an empty result.`));
      }

      // L5 — THE RULE. An aspect may only select its own area's members.
      for (const ref of aspect.selects ?? []) {
        if (!(area.members ?? []).includes(ref)) {
          errors.push(issue('L5', area.area_id, 'aspects',
            `Aspect '${aspect.aspect_id}' selects '${ref}', which this area does not own. A clarification choice narrows what a reader already found; it may not reach outside the area.`));
        }
      }
    }
  }

  // L3 (second half) — the partition
  for (const id of registered) {
    const homes = homeCount.get(id) ?? [];
    if (homes.length === 0) {
      errors.push(issue('L3', id, 'members',
        `'${id}' belongs to no capability area, so it is unreachable from the landscape.`));
    } else if (homes.length > 1) {
      errors.push(issue('L3', id, 'members',
        `'${id}' belongs to ${homes.length} areas (${homes.join(', ')}). An area is where a capability lives, and it lives in one place.`));
    }
  }

  // L6 — the business-problem catalogue agrees with the registry, in both directions
  const claimed = new Set(identities.flatMap(c => c.business_problems));
  const catalogued = new Set(problems.map(p => p.problem_id));
  for (const id of claimed) {
    if (!catalogued.has(id)) {
      errors.push(issue('L6', id, 'business_problems',
        `'${id}' is used by the registry but has no catalogue entry, so it can only be rendered as a slug.`));
    }
  }
  for (const p of problems) {
    if (!claimed.has(p.problem_id)) {
      errors.push(issue('L6', p.problem_id, 'business_problems',
        `'${p.problem_id}' is catalogued but no capability claims it. That is a problem nobody has.`));
    }
    if (!p.label?.trim() || !p.question?.trim().endsWith('?')) {
      errors.push(issue('L6', p.problem_id, 'question',
        'A business problem needs a label and a question phrased as a question.'));
    }
  }

  return { valid: errors.length === 0, checked: areas.length + problems.length, errors, warnings: [] };
}

/**
 * L7 — a visual must carry its own text equivalent.
 *
 * Separated from `validateLandscape` because visuals arrive with capability knowledge, which is
 * loaded on demand. The rule is the same either way: a diagram nobody can read without seeing it
 * is not an explanation, it is decoration with an accessibility defect.
 */
export function validateVisual(capabilityId: string, visual: VisualSpec): ValidationIssue[] {
  const errors: ValidationIssue[] = [];
  if ((visual.description ?? '').trim().length < 40) {
    errors.push(issue('L7', capabilityId, 'visualisation.description',
      'A visual must carry a text equivalent of at least 40 characters. A reader who cannot see it must still learn what it says.'));
  }
  if (!visual.concept?.trim()) {
    errors.push(issue('L7', capabilityId, 'visualisation.concept', 'A visual must name the concept it explains.'));
  }
  if ((visual.nodes ?? []).length < 2) {
    errors.push(issue('L7', capabilityId, 'visualisation.nodes',
      'A visual needs at least two nodes; a single node explains no relationship.'));
  }
  for (const node of visual.nodes ?? []) {
    if (!node.label?.trim()) {
      errors.push(issue('L7', capabilityId, 'visualisation.nodes', 'Every node needs a label.'));
    }
    // The schema has no numeric field, but a label can smuggle one in. An unsupported figure on a
    // diagram is the `ATL-01` storyboard failure returning by another route.
    if (/\d+\s*(%|per cent|percent)|[£$€]\s*\d/.test(node.label ?? '')) {
      errors.push(issue('L7', capabilityId, 'visualisation.nodes',
        `Node label '${node.label}' carries a quantitative claim. Visuals explain structure; quantitative evidence is cited as evidence, in words.`));
    }
  }
  return errors;
}
