/**
 * The governed capability landscape (ATL-04R).
 *
 * `ATL-04` shipped a landing that rendered all thirty-eight capabilities as one flat card list
 * ordered by name. Everything a reader needed was on the page and none of it was legible: the
 * screen answered "what is registered?" and never answered "what am I trying to improve?".
 *
 * An area is the missing middle term — the problem space a reader recognises before they know any
 * Atlas vocabulary. Seven of them partition the corpus, and the partition is what makes the
 * landscape trustworthy: rule L3 requires every registered capability to appear in exactly one
 * area, so a reader who has walked the seven surfaces has seen the estate, and a capability cannot
 * hide by belonging to none or dilute the map by belonging to four.
 *
 * ── Why these are declared and not derived ──────────────────────────────────
 * Deriving areas from `business_problems` was the obvious move and it was measured and rejected.
 * The ten `bp-*` values overlap heavily — `bp-decision-latency` and `bp-ai-trust` carry eight
 * capabilities each and share four — and two values (`bp-stock-availability`, `bp-margin-compression`)
 * carry exactly one. A derived landscape would open with two singleton boxes and place
 * `CAP-DECISION-REGRET` in three places at once. Areas and business problems answer different
 * questions: an area is WHERE a capability lives, a business problem is WHAT it is trying to fix.
 * Both are governed, and neither is derived from the other.
 *
 * ── Aspects, and the rule that keeps clarification honest ───────────────────
 * `aspects` are the prepared responses the Atlas offers when a query lands in an area ambiguously.
 * Each aspect names the members it selects, and rule L5 requires that set to be a subset of the
 * area's members. That is what stops a clarification choice from widening a result set or
 * conjuring a capability the query never reached — a clarification narrows what the reader already
 * found, or it does nothing.
 *
 * Adding an area is a governed act: it needs members, a rationale someone can disagree with, and a
 * review date. Removing one is only possible by rehoming its members.
 *
 * Governed by: CAPABILITY_KNOWLEDGE_MODEL.md · ADR-045 · ADR-046 · ADR-060
 */

import type { CapabilityArea } from '../../packages/contracts/src/capability-atlas-model';

const OWNER = 'G10X Enterprise Innovation Lab';
const REVIEWED = '2026-08-21';

export const CAPABILITY_AREAS: CapabilityArea[] = [
  {
    area_id: 'CAPAREA-DEMAND',
    name: 'Demand & Forecasting',
    problem_space: 'Whether the demand outlook can be trusted, what is moving it, and what it means for stock.',
    what_cognix_does: 'Separates whether a forecast is likely to hold from whether the model is accurate, and decomposes what is driving the number.',
    invitation: 'Explore how CogniX reads demand',
    members: [
      'CAP-DEMAND-FORECAST',
      'CAP-GOVERNED-FORECAST',
      'CAP-FORECAST-STABILITY',
      'CAP-DECISION-TIMELINE',
      'CAP-PREDICTIVE-INVENTORY'
    ],
    rationale:
      'These five are the only capabilities whose subject is the demand number itself — producing it, judging whether it will hold, decomposing what moves it, and carrying it into stock. Governed Forecast Execution sits here rather than under a platform heading because a reader asking about demand is asking what produced the number, and answering that question elsewhere would separate the forecast from the model that made it. Decision capabilities consume the forecast but are not about it.',
    aspects: [
      { aspect_id: 'demand-outlook', label: 'The forecast itself', selects: ['CAP-DEMAND-FORECAST', 'CAP-DECISION-TIMELINE'] },
      { aspect_id: 'demand-model', label: 'What produced the number', selects: ['CAP-GOVERNED-FORECAST'] },
      { aspect_id: 'demand-stability', label: 'Whether it will change again', selects: ['CAP-FORECAST-STABILITY', 'CAP-GOVERNED-FORECAST'] },
      { aspect_id: 'demand-drivers', label: 'What is driving it', selects: ['CAP-DECISION-TIMELINE', 'CAP-DEMAND-FORECAST'] },
      { aspect_id: 'demand-stock', label: 'What it means for stock', selects: ['CAP-PREDICTIVE-INVENTORY'] }
    ],
    owner: OWNER,
    reviewed_at: REVIEWED
  },
  {
    area_id: 'CAPAREA-CAMPAIGN',
    name: 'Campaign & Promotion',
    problem_space: 'Whether a promotion is worth running, when to run it, and what it actually caused.',
    what_cognix_does: 'Rehearses a campaign before commitment, separates what the promotion caused from what would have happened anyway, and shows the trade-offs rather than a single answer.',
    invitation: 'Explore how CogniX reasons about promotions',
    members: [
      'CAP-PROMOTION-INTELLIGENCE',
      'CAP-CAMPAIGN-DECISION',
      'CAP-CONTINUOUS-DECISION-TWIN',
      'CAP-PREDICTIVE-INTERVENTION',
      'CAP-OPPORTUNITY-WINDOW',
      'CAP-COUNTERFACTUAL-BASELINE',
      'CAP-OUTCOME-FRONTIER',
      'CAP-CATEGORY-INTELLIGENCE'
    ],
    rationale:
      'Every member takes a commercial intervention as its subject — planning it, timing it, pricing it, attributing its effect, reading its margin consequence, or following it into flight. The counterfactual baseline and the outcome frontier sit here rather than in Decision Intelligence because both were delivered against promotional attribution and neither is exercised outside it. The continuous twin and predictive intervention planning are platform-reusable in structure but are demonstrated only against a campaign, and placing them where they cannot be demonstrated would make them unreachable for the reader most likely to want them.',
    aspects: [
      { aspect_id: 'campaign-planning', label: 'Planning and simulation', selects: ['CAP-CAMPAIGN-DECISION', 'CAP-COUNTERFACTUAL-BASELINE', 'CAP-OUTCOME-FRONTIER'] },
      { aspect_id: 'campaign-demand', label: 'Demand impact', selects: ['CAP-PROMOTION-INTELLIGENCE', 'CAP-OPPORTUNITY-WINDOW'] },
      { aspect_id: 'campaign-decisions', label: 'Campaign decisions', selects: ['CAP-CAMPAIGN-DECISION', 'CAP-OPPORTUNITY-WINDOW'] },
      { aspect_id: 'campaign-in-flight', label: 'After the decision', selects: ['CAP-CONTINUOUS-DECISION-TWIN', 'CAP-PREDICTIVE-INTERVENTION'] },
      { aspect_id: 'campaign-commercial', label: 'Commercial outcomes', selects: ['CAP-PROMOTION-INTELLIGENCE', 'CAP-CATEGORY-INTELLIGENCE', 'CAP-OUTCOME-FRONTIER'] }
    ],
    owner: OWNER,
    reviewed_at: REVIEWED
  },
  {
    area_id: 'CAPAREA-SIGNALS',
    name: 'Signals & Intent',
    problem_space: 'What the world outside the business is saying, before it appears in the numbers.',
    what_cognix_does: 'Carries external observations under one contract and fuses them into a contextualised outlook rather than a list of alerts.',
    invitation: 'Explore how CogniX senses change',
    members: [
      'CAP-ENTERPRISE-SIGNAL',
      'CAP-SIGNAL-CONNECTOR',
      'CAP-SIGNAL-SIMULATION',
      'CAP-INTENT-FUSION'
    ],
    rationale:
      'These four form the evidence intake path: the signal contract, the connector that admits an external feed, the simulator that exercises it, and the fusion step that turns many signals into one outlook. They are upstream of every decision capability and are not decisions themselves.',
    aspects: [
      { aspect_id: 'signals-contract', label: 'What a signal is', selects: ['CAP-ENTERPRISE-SIGNAL'] },
      { aspect_id: 'signals-integration', label: 'Connecting our own data', selects: ['CAP-SIGNAL-CONNECTOR'] },
      { aspect_id: 'signals-fusion', label: 'Turning signals into an outlook', selects: ['CAP-INTENT-FUSION'] },
      { aspect_id: 'signals-simulation', label: 'Rehearsing signal conditions', selects: ['CAP-SIGNAL-SIMULATION'] }
    ],
    owner: OWNER,
    reviewed_at: REVIEWED
  },
  {
    area_id: 'CAPAREA-DECISION',
    name: 'Decision Intelligence',
    problem_space: 'Whether a decision is still the right one, how long it stays right, and what follows from it.',
    what_cognix_does: 'Treats a decision as an object with a lifetime — a window in which it can be made, a distance from the evidence-adjusted position, consequences that propagate, and a verdict once reality arrives.',
    invitation: 'Explore how CogniX reasons about decisions',
    members: [
      'CAP-DECISION-GAP',
      'CAP-DECISION-WINDOW',
      'CAP-DECISION-REGRET',
      'CAP-DECISION-RIPPLE',
      'CAP-DECISION-READINESS',
      'CAP-COMMITMENT-INTELLIGENCE',
      'CAP-OPPORTUNITY-INTELLIGENCE',
      'CAP-SHARED-DECISION-STATE'
    ],
    rationale:
      'Each member takes the decision itself as its subject rather than the number behind it or the evidence in front of it. Shared decision state belongs here because the problem it removes — two teams holding different versions of one situation — is a property of the decision, not of the data.',
    aspects: [
      { aspect_id: 'decision-gap', label: 'The gap between decision and evidence', selects: ['CAP-DECISION-GAP', 'CAP-OPPORTUNITY-INTELLIGENCE'] },
      { aspect_id: 'decision-timing', label: 'Timing and how long a call stays valid', selects: ['CAP-DECISION-WINDOW'] },
      { aspect_id: 'decision-consequence', label: 'Consequences and knock-on effects', selects: ['CAP-DECISION-RIPPLE', 'CAP-COMMITMENT-INTELLIGENCE'] },
      { aspect_id: 'decision-hindsight', label: 'Whether it was the right call', selects: ['CAP-DECISION-REGRET', 'CAP-DECISION-READINESS'] },
      { aspect_id: 'decision-alignment', label: 'Everyone seeing one situation', selects: ['CAP-SHARED-DECISION-STATE'] }
    ],
    owner: OWNER,
    reviewed_at: REVIEWED
  },
  {
    area_id: 'CAPAREA-LEARNING',
    name: 'Learning & Memory',
    problem_space: 'Whether the organisation remembers what it decided, and learns from what happened next.',
    what_cognix_does: 'Holds prior decisions and their outcomes, promotes what recurs into named patterns, and closes the loop between what was predicted and what occurred.',
    invitation: 'Explore how CogniX remembers',
    members: [
      'CAP-ENTERPRISE-MEMORY',
      'CAP-LEARNING-LOOP',
      'CAP-LEARNING-PATTERN-REGISTRY',
      'CAP-MEMORY-LEARNING-API',
      'CAP-JOURNEY-TELEMETRY'
    ],
    rationale:
      'These five are the retention path: what was observed, what was decided, what recurred often enough to name, and the contract that serves it back. Journey telemetry sits here because the record it keeps is of decision intent over time, which is what makes the loop measurable.',
    aspects: [
      { aspect_id: 'learning-recall', label: 'What happened last time', selects: ['CAP-ENTERPRISE-MEMORY'] },
      { aspect_id: 'learning-patterns', label: 'What keeps recurring', selects: ['CAP-LEARNING-PATTERN-REGISTRY'] },
      { aspect_id: 'learning-loop', label: 'Prediction against reality', selects: ['CAP-LEARNING-LOOP'] },
      { aspect_id: 'learning-contracts', label: 'How memory is served', selects: ['CAP-MEMORY-LEARNING-API', 'CAP-JOURNEY-TELEMETRY'] }
    ],
    owner: OWNER,
    reviewed_at: REVIEWED
  },
  {
    area_id: 'CAPAREA-EVIDENCE',
    name: 'Evidence & Governance',
    problem_space: 'Whether a recommendation can be trusted, traced back to its source, and governed.',
    what_cognix_does: 'Carries provenance from observation to decision, states what a recommendation commits to and when it expires, and keeps the controls that bound it visible.',
    invitation: 'Explore how CogniX earns trust',
    members: [
      'CAP-OBSERVATION-CORRESPONDENCE',
      'CAP-DECISION-CONTRACT',
      'CAP-CONTRACT-VERIFICATION',
      'CAP-GOVERNANCE-SETTINGS',
      'CAP-AUTH-PLATFORM-SETUP',
      'CAP-DECISION-LIFECYCLE-VIEW'
    ],
    rationale:
      'Every member exists to make a claim checkable rather than to produce one: where a figure came from, what a recommendation promises, whether a contract holds, who may see what, and how the whole path is explained. Two members are honestly incomplete and the area says so rather than hiding them.',
    aspects: [
      { aspect_id: 'evidence-provenance', label: 'Where a number came from', selects: ['CAP-OBSERVATION-CORRESPONDENCE'] },
      { aspect_id: 'evidence-contract', label: 'What a recommendation commits to', selects: ['CAP-DECISION-CONTRACT', 'CAP-CONTRACT-VERIFICATION'] },
      { aspect_id: 'evidence-controls', label: 'Controls and access', selects: ['CAP-GOVERNANCE-SETTINGS', 'CAP-AUTH-PLATFORM-SETUP'] },
      { aspect_id: 'evidence-explanation', label: 'How the reasoning path is explained', selects: ['CAP-DECISION-LIFECYCLE-VIEW'] }
    ],
    owner: OWNER,
    reviewed_at: REVIEWED
  },
  {
    area_id: 'CAPAREA-DISCOVERY',
    name: 'Exploring CogniX',
    problem_space: 'Understanding what CogniX can do, how mature it is, and how to explore or demonstrate it.',
    what_cognix_does: 'Makes the estate itself legible — the questions worth asking, the experiment portfolio, and the lenses through which any capability can be read.',
    invitation: 'Explore how CogniX explains itself',
    members: [
      'CAP-CURIOSITY-QUESTIONS',
      'CAP-INNOVATION-PORTFOLIO',
      'CAP-EXPERIMENT-CANVAS',
      'CAP-DOMAIN-PERSONA-CONTEXT',
      'CAP-ARCHITECTURE-STORYBOARD'
    ],
    rationale:
      'These five have the platform itself as their subject rather than any commercial decision, which is why they answer `bp-capability-discovery` almost exclusively. Keeping them in a named area rather than scattering them stops the estate from describing everything except itself.',
    aspects: [
      { aspect_id: 'discovery-questions', label: 'Questions worth asking', selects: ['CAP-CURIOSITY-QUESTIONS'] },
      { aspect_id: 'discovery-portfolio', label: 'What has been built', selects: ['CAP-INNOVATION-PORTFOLIO', 'CAP-EXPERIMENT-CANVAS'] },
      { aspect_id: 'discovery-lenses', label: 'Reading it from different perspectives', selects: ['CAP-DOMAIN-PERSONA-CONTEXT'] },
      { aspect_id: 'discovery-architecture', label: 'How the platform is explained', selects: ['CAP-ARCHITECTURE-STORYBOARD'] }
    ],
    owner: OWNER,
    reviewed_at: REVIEWED
  }
];

/** Area lookup by member. Built once; the partition guarantee (L3) makes this single-valued. */
export const AREA_BY_CAPABILITY: Record<string, string> = CAPABILITY_AREAS.reduce(
  (acc, area) => {
    for (const member of area.members) acc[member] = area.area_id;
    return acc;
  },
  {} as Record<string, string>
);

export function getArea(areaId: string): CapabilityArea | null {
  return CAPABILITY_AREAS.find(a => a.area_id === areaId) ?? null;
}
