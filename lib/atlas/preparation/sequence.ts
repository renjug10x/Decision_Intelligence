/**
 * Conversation and demonstration sequencing (ATL-06D §10, §13, §14, §34).
 *
 * ── A narrative, not a feature list ─────────────────────────────────────────
 * §10 asks for a movement — problem → evidence → signals → forecast → uncertainty → decision →
 * consequence → learning — using ONLY the stages the recommended capabilities can support. The
 * stage vocabulary below is therefore a filter over governed capability knowledge, not a template
 * to be populated: a stage with no capability behind it is DROPPED, and rule `P3` refuses a pack
 * that carries one anyway.
 *
 * ── What the corpus can actually support, measured rather than assumed ──────
 * The registry holds 33 `three-minute` demo paths and 5 `ten-minute` paths. It holds NO
 * `technical-deep-dive` and NO `executive-discussion` paths. That measurement decides this module's
 * shape and is the reason it does not simply emit three demo scripts:
 *
 *   `demonstration`  is built from real `DemoPath.steps`, because those exist.
 *   `executive`      is built from innovation theses and business problems — governed text, framed
 *                    as talking points, and explicitly NOT presented as demo steps.
 *   `technical`      is built from `architecture_flow`, `apis` and `contracts` — again governed
 *                    facts, and again not dressed up as a demo script.
 *
 * Inventing `what_to_say` for a capability that has no authored demo path would be exactly the
 * fabrication §34 forbids, so `demo_steps` is non-empty ONLY where a governed path supplied it.
 * A sequence that could not be built at all is not returned, and the pack says why.
 */

import type { CapabilityId, DemoPath } from '../../../packages/contracts/src/capability-atlas-model';
import type {
  CapabilityRecommendation, ClientContext, ConversationSequence, ConversationStage, DemoPathKind
} from '../../../packages/contracts/src/atlas-preparation-model';
import type { ResolvedCapability } from '../../../packages/contracts/src/capability-atlas-model';

/**
 * The governed narrative stages, in the order a conversation moves through them.
 *
 * A stage claims a capability by reading its name, summary, tags and business problems — governed
 * identity fields, so a capability's stage is derived from what it IS rather than from a mapping
 * table that would drift as the registry grows. A capability that matches no stage is not dropped
 * and is not forced into a catch-all: it is appended under its own name (see `buildStages`).
 */
const NARRATIVE_STAGES: { stage: string; purpose: string; matches: (c: ResolvedCapability) => boolean }[] = [
  {
    stage: 'Problem',
    purpose: 'Establish the situation in the client’s own language before any CogniX vocabulary is used.',
    matches: c => c.identity.business_problems.length > 0 && (c.knowledge?.use_cases.length ?? 0) > 0
  },
  {
    stage: 'Signals',
    purpose: 'Show what the organisation can already see, and what it currently cannot.',
    matches: c => hasAny(c, ['signal', 'observation', 'intent', 'external', 'connector'])
  },
  {
    stage: 'Forecast',
    purpose: 'Move from what is observed to what is expected.',
    matches: c => hasAny(c, ['forecast', 'demand', 'prediction', 'inventory'])
  },
  {
    stage: 'Uncertainty',
    purpose: 'Make the confidence in that expectation explicit rather than implied.',
    matches: c => hasAny(c, ['stability', 'uncertainty', 'confidence', 'readiness', 'window'])
  },
  {
    stage: 'Decision',
    purpose: 'Show the judgement the organisation actually has to make, and what informs it.',
    matches: c => hasAny(c, ['decision', 'commitment', 'contract', 'frontier', 'opportunity'])
  },
  {
    stage: 'Consequence',
    purpose: 'Follow the decision outward into what it costs and what it moves.',
    matches: c => hasAny(c, ['ripple', 'consequence', 'regret', 'counterfactual', 'impact', 'margin'])
  },
  {
    stage: 'Learning',
    purpose: 'Close the loop: what the organisation retains from having decided.',
    matches: c => hasAny(c, ['memory', 'learning', 'pattern', 'recall', 'telemetry'])
  }
];

function hasAny(c: ResolvedCapability, needles: string[]): boolean {
  const hay = [
    c.identity.name, c.identity.summary, ...c.identity.tags, ...c.identity.business_problems
  ].join(' ').toLowerCase();
  return needles.some(n => hay.includes(n));
}

/**
 * Duration bands (§14).
 *
 * Design principles rather than rigid templates: the band decides HOW MANY movements the
 * conversation can carry, and the minutes are then divided across the stages that survived. Where
 * no duration was supplied, no duration is invented — `duration_mins` stays `null` and stage
 * minutes are the governed demo durations themselves.
 */
export function stagesForDuration(mins: number | null): number {
  if (mins === null) return 5;
  if (mins <= 10) return 2;
  if (mins <= 20) return 3;
  if (mins <= 35) return 4;
  if (mins <= 50) return 5;
  return 6;
}

/** The shortest governed demo path for a capability, which is what a constrained meeting needs. */
function shortestPath(c: ResolvedCapability): DemoPath | null {
  const paths = c.knowledge?.demo_scenarios ?? [];
  if (!paths.length) return null;
  return paths.slice().sort((a, b) => a.duration_mins - b.duration_mins)[0];
}

export interface SequenceInput {
  recommendations: CapabilityRecommendation[];
  resolved: Map<CapabilityId, ResolvedCapability>;
  context: ClientContext;
}

/**
 * Assign the lead capabilities to narrative stages.
 *
 * One capability per stage at most, and a capability appears once. A stage that attracts nothing is
 * omitted — which is what makes the sequence honest about the estate's actual shape rather than
 * always producing the full eight-movement arc.
 */
function buildStages(input: SequenceInput, budget: number, forKind: DemoPathKind): ConversationStage[] {
  const leads = input.recommendations.filter(r => r.tier === 'lead');
  const used = new Set<CapabilityId>();
  const stages: ConversationStage[] = [];

  for (const spec of NARRATIVE_STAGES) {
    if (stages.length >= budget) break;
    const match = leads.find(r => {
      if (used.has(r.capability_id)) return false;
      const c = input.resolved.get(r.capability_id);
      return c ? spec.matches(c) : false;
    });
    if (!match) continue;
    used.add(match.capability_id);
    const c = input.resolved.get(match.capability_id)!;
    const path = shortestPath(c);

    stages.push({
      stage: spec.stage,
      purpose: spec.purpose,
      supported_by: [match.capability_id],
      minutes: 0, // allocated below
      // Demo steps ONLY where a governed path exists AND this is the demonstration reading.
      // The executive and technical readings talk about the capability; they do not script a demo
      // that was never authored (§13, §34).
      demo_steps: forKind === 'demonstration' && path
        ? path.steps.map(s => ({
            action: s.action, what_to_say: s.what_to_say, expected_observation: s.expected_observation
          }))
        : [],
      warnings: path?.warnings ?? []
    });
  }

  /*
    A lead capability that matched no narrative stage still belongs in the conversation. An earlier
    version appended each one as another stage called "Decision", which produced sequences reading
    `Problem → Decision → Decision → Decision` — a movement that has stopped moving. Each leftover
    now names the capability it is about, so the sequence stays a narrative rather than a list
    wearing stage labels.
  */
  if (stages.length < budget) {
    for (const r of leads) {
      if (stages.length >= budget) break;
      if (used.has(r.capability_id)) continue;
      const c = input.resolved.get(r.capability_id);
      if (!c) continue;
      used.add(r.capability_id);
      const path = shortestPath(c);
      stages.push({
        stage: `Also: ${r.name}`,
        purpose: `Where ${r.name} changes the judgement being made. It matched no earlier movement, so it sits here rather than being dropped from the conversation.`,
        supported_by: [r.capability_id],
        minutes: 0,
        demo_steps: forKind === 'demonstration' && path
          ? path.steps.map(s => ({ action: s.action, what_to_say: s.what_to_say, expected_observation: s.expected_observation }))
          : [],
        warnings: path?.warnings ?? []
      });
    }
  }

  return stages;
}

/** Divide the stated duration across the stages, leaving a fifth of the time for the client to talk. */
function allocate(stages: ConversationStage[], mins: number | null, resolved: SequenceInput['resolved']): void {
  if (!stages.length) return;
  if (mins === null) {
    // No duration was supplied, so none is invented: each stage carries the governed demo duration
    // where one exists, and zero where the stage is a talking point rather than a demonstration.
    for (const s of stages) {
      const c = resolved.get(s.supported_by[0]);
      const path = c ? shortestPath(c) : null;
      s.minutes = path?.duration_mins ?? 0;
    }
    return;
  }
  const usable = Math.max(stages.length, Math.round(mins * 0.8));
  const each = Math.floor(usable / stages.length);
  let remainder = usable - each * stages.length;
  for (const s of stages) {
    s.minutes = each + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
  }
}

const KIND_TITLE: Record<DemoPathKind, string> = {
  executive: 'Executive path — the business narrative',
  demonstration: 'Demonstration path — problem, capability, decision, consequence',
  technical: 'Technical deep dive — architecture, signals, contracts, evidence'
};

/**
 * Which readings the evidence supports.
 *
 * `demonstration` requires at least one lead capability with a governed demo path carried by a
 * solution surface. Without that there is nothing to demonstrate, and offering a demonstration path
 * anyway would be the §34 "insufficient demo evidence" failure.
 */
export function buildSequences(input: SequenceInput): { sequences: ConversationSequence[]; notice: string | null } {
  const mins = input.context.duration_mins?.value ?? null;
  const budget = stagesForDuration(mins);
  const leads = input.recommendations.filter(r => r.tier === 'lead');
  const orientation = input.context.orientation?.value ?? null;
  const objective = input.context.objective?.value ?? null;

  const demonstrable = leads.some(r => r.demonstrable);
  const technicalEvidence = leads.some(r => {
    const c = input.resolved.get(r.capability_id);
    return (c?.knowledge?.contracts.length ?? 0) > 0 || (c?.knowledge?.apis.length ?? 0) > 0;
  });

  // Which readings to offer, and in which order — the room decides, not a fixed list.
  const kinds: DemoPathKind[] = [];
  if (orientation === 'technical' || objective === 'architecture') {
    kinds.push('technical');
    if (demonstrable) kinds.push('demonstration');
    kinds.push('executive');
  } else if (orientation === 'executive' || objective === 'executive-innovation') {
    kinds.push('executive');
    if (demonstrable) kinds.push('demonstration');
  } else {
    if (demonstrable) kinds.push('demonstration');
    kinds.push('executive');
    if (technicalEvidence) kinds.push('technical');
  }

  const sequences: ConversationSequence[] = [];
  for (const kind of new Set(kinds)) {
    if (kind === 'technical' && !technicalEvidence) continue;
    if (kind === 'demonstration' && !demonstrable) continue;
    const stages = buildStages(input, kind === 'executive' ? Math.min(budget, 4) : budget, kind);
    if (!stages.length) continue;
    allocate(stages, mins, input.resolved);

    const dropped = leads.length - new Set(stages.flatMap(s => s.supported_by)).size;
    sequences.push({
      kind,
      title: KIND_TITLE[kind],
      duration_mins: mins,
      stages,
      omission_notice: dropped > 0
        ? `${dropped} recommended capabilit${dropped === 1 ? 'y is' : 'ies are'} not in this sequence — ${mins === null ? 'the narrative carries only what the stages support' : `${mins} minutes does not carry them`}. They remain in the recommendations above.`
        : null
    });
  }

  const notice = sequences.length === 0
    ? 'No conversation sequence was built: the recommended capabilities carry no governed demonstration path, architecture flow or use case to sequence. Rather than script a demonstration that does not exist, the pack offers the capability evidence directly.'
    : (!demonstrable
        ? 'No demonstration path is offered: none of the lead capabilities has a governed demo path carried by a solution surface. This is a discussion, not a demonstration.'
        : null);

  return { sequences, notice };
}
