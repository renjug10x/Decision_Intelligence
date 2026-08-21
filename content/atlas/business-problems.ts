/**
 * The governed business-problem catalogue (ATL-04R).
 *
 * The `bp-*` identifiers have been in the registry since `ATL-02` and have been searchable since
 * `ATL-04` — `business_problems` carries field weight 5, above tags. What no file anywhere supplied
 * was a human name for them, so the Atlas rendered them by stripping the prefix and swapping dashes
 * for spaces: "forecast uncertainty", "ai trust", "decision recall". Those are slugs, shown to an
 * executive, in the one place the interface asks what they are trying to improve.
 *
 * This catalogue supplies the display layer and nothing else. It introduces no capability facts, no
 * placement and no relationships: `label` is the problem stated as a business concern, `question` is
 * the question a reader would actually ask when they have it. Rule L6 keeps the catalogue and the
 * registry in agreement in both directions — every `bp-*` the registry uses must appear here, and an
 * entry no capability claims is a problem nobody has and must be removed.
 *
 * Governed by: CAPABILITY_KNOWLEDGE_MODEL.md · ADR-046 · ADR-060
 */

import type { BusinessProblem } from '../../packages/contracts/src/capability-atlas-model';

const OWNER = 'G10X Enterprise Innovation Lab';
const REVIEWED = '2026-08-21';

function problem(problem_id: string, label: string, question: string): BusinessProblem {
  return { problem_id, label, question, owner: OWNER, reviewed_at: REVIEWED };
}

export const BUSINESS_PROBLEMS: BusinessProblem[] = [
  problem('bp-forecast-uncertainty', 'Forecast uncertainty',
    'Can we trust this number, and will it move again?'),
  problem('bp-decision-latency', 'Slow decisions',
    'Why does it take so long to act on what we already know?'),
  problem('bp-ai-trust', 'Trust in automated reasoning',
    'Why should we believe a recommendation this system produced?'),
  problem('bp-decision-recall', 'Organisational forgetting',
    'What did we decide last time, and what happened?'),
  problem('bp-promotion-effectiveness', 'Promotion effectiveness',
    'Did the promotion pay for itself, or would it have sold anyway?'),
  problem('bp-capability-discovery', 'Knowing what the platform can do',
    'What can CogniX actually do, and how mature is it?'),
  problem('bp-supplier-reliability', 'Supplier reliability',
    'Can we still keep the promise we made to the customer?'),
  problem('bp-stock-availability', 'Stock availability',
    'Will the product be on the shelf when the demand arrives?'),
  problem('bp-margin-compression', 'Margin compression',
    'Where is margin leaking across the category?'),
  problem('bp-access-governance', 'Access and governance',
    'Who may see what, and how is that enforced?')
];

export function getBusinessProblem(id: string): BusinessProblem | null {
  return BUSINESS_PROBLEMS.find(p => p.problem_id === id) ?? null;
}

/** Display label for a `bp-*` id, falling back to the id where the catalogue has no entry. */
export function businessProblemLabel(id: string): string {
  return getBusinessProblem(id)?.label ?? id.replace(/^bp-/, '').replace(/-/g, ' ');
}
