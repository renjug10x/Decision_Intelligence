/**
 * Sales integrity (ATL-06D §20, §21) — the section this feature stands or falls on.
 *
 * Everything else in a preparation pack helps someone sell. This module is the part that stops them
 * selling something that is not there, and it is written on one assumption: **the pressure to soften
 * a limitation arrives at exactly the moment the pack is most useful.** So the warnings are not
 * advisory text appended at the end. They are:
 *
 *   - DERIVED, never authored here. Every warning names the governed field it came from
 *     (`derived_from`), and a warning that cannot name one is not emitted. §21 is explicit: *"Do not
 *     invent warnings merely to populate a section."* A capability with nothing to warn about
 *     produces no warning, and the pack is honest about that too.
 *
 *   - STRUCTURAL. Rule `P2` refuses a pack that recommends a non-`implemented` capability with no
 *     warning attached. The pack does not render; it is invalid.
 *
 *   - LENS-INVARIANT. A Sales pack carries the same warnings as a Developer pack, and
 *     `run-atl06d-tests.ts` §D asserts that over the whole registry. A lens that could quieten a
 *     limitation would be a mechanism for exactly the overselling this exists to prevent, and it is
 *     the single most tempting feature nobody is going to build.
 *
 * ── "Avoid claiming" needs a replacement, not just a prohibition ────────────
 * `AvoidClaiming.instead` is required. Telling a seller "do not say this runs on live supplier
 * feeds" without giving them the true sentence to use instead is advice that gets discarded in the
 * room. The honest alternative is derived from the same governed limitation as the prohibition.
 */

import type { CapabilityId, ResolvedCapability } from '../../../packages/contracts/src/capability-atlas-model';
import type {
  AvoidClaiming, CapabilityRecommendation, DemoWarning
} from '../../../packages/contracts/src/atlas-preparation-model';

export interface IntegrityInput {
  recommendations: CapabilityRecommendation[];
  resolved: Map<CapabilityId, ResolvedCapability>;
}

/** Human phrasing for the status, used in both warnings and replacements so they agree. */
const STATUS_PHRASE: Record<string, string> = {
  'partially-implemented': 'partially implemented',
  simulated: 'simulated',
  experimental: 'experimental',
  concept: 'a concept',
  roadmap: 'on the roadmap, not built'
};

/**
 * Warnings that are NEVER scoped away, whatever tier the capability sits in.
 *
 * The distinction below is between a warning about what a capability IS and a warning about
 * running a demonstration you are not going to run. The first is non-negotiable on every
 * recommendation; the second is only preparation if the demo is in the conversation.
 *
 * Running §39's Scenario 2 produced 35 warnings across 11 recommendations, which is a wall nobody
 * reads — and a wall nobody reads is how the one that mattered gets missed. Scoping is therefore a
 * legibility measure, not a softening one: no status, synthetic-data, defect or missing-evidence
 * warning is ever dropped, and rule `P2` still refuses a pack that recommends a non-`implemented`
 * capability without one.
 */
const NON_NEGOTIABLE: ReadonlySet<string> = new Set([
  'simulated', 'partially-implemented', 'roadmap-not-implementation',
  'synthetic-data', 'open-defect', 'missing-evidence'
]);

export function collectWarnings(input: IntegrityInput): DemoWarning[] {
  const out: DemoWarning[] = [];

  for (const rec of input.recommendations) {
    const c = input.resolved.get(rec.capability_id);
    if (!c) continue;
    const name = c.identity.name;
    const id = c.identity.capability_id;
    const k = c.knowledge;
    const lead = rec.tier === 'lead';

    // ── Implementation status ──────────────────────────────────────────────
    const status = c.identity.implementation_status;
    if (status !== 'implemented') {
      out.push({
        kind: status === 'simulated' ? 'simulated'
          : status === 'roadmap' ? 'roadmap-not-implementation'
          : 'partially-implemented',
        capability_id: id, capability_name: name,
        warning: status === 'roadmap'
          ? `${name} is on the roadmap and is not built. Do not demonstrate it or describe it as available.`
          : `${name} is ${STATUS_PHRASE[status] ?? status}. Say so before showing it — the behaviour on screen is not the behaviour a client would get in production.`,
        derived_from: 'identity.implementation_status'
      });
    }

    // ── Fields that differ from the whole (ADR-047 V6) ─────────────────────
    for (const f of lead ? (k?.field_status ?? []) : []) {
      if (f.implementation_status === 'implemented') continue;
      out.push({
        kind: 'partially-implemented',
        capability_id: id, capability_name: name,
        warning: `Within ${name}, ${f.field} is ${STATUS_PHRASE[f.implementation_status] ?? f.implementation_status} even though the capability as a whole is ${c.identity.implementation_status.replace(/-/g, ' ')}. ${f.note}`,
        derived_from: `knowledge.field_status:${f.field}`
      });
    }

    // ── Synthetic data ─────────────────────────────────────────────────────
    const synthetic = (k?.data_sources ?? []).filter(s => s.kind === 'synthetic');
    if (synthetic.length) {
      out.push({
        kind: 'synthetic-data',
        capability_id: id, capability_name: name,
        warning: `${name} runs on synthetic data (${synthetic.map(s => s.name).join(', ')}). Do not describe what is on screen as the client's own numbers or as a live feed.`,
        derived_from: 'knowledge.data_sources'
      });
    }

    // ── The governed demo path's own warnings ──────────────────────────────
    // Lead capabilities only: a warning about demonstrating something that is not in the sequence
    // is not preparation for this conversation. The capability's STATUS warning above is unscoped.
    for (const path of lead ? (k?.demo_scenarios ?? []) : []) {
      for (const w of path.warnings) {
        out.push({
          kind: 'simulated',
          capability_id: id, capability_name: name,
          warning: `Before demonstrating ${name} (${path.title}): ${w}`,
          derived_from: `knowledge.demo_scenarios:${path.path_type}`
        });
      }
    }

    // ── A demo path with no surface carrying it ────────────────────────────
    if (lead && (k?.demo_scenarios.length ?? 0) > 0 && c.demo_maturity === null) {
      out.push({
        kind: 'no-demo-surface',
        capability_id: id, capability_name: name,
        warning: `${name} has a written demonstration path but no solution surface carries it, so there is nothing to show on screen. Treat it as a talking point, not a demo.`,
        derived_from: 'demo_maturity'
      });
    }

    // ── Nothing proves it works ────────────────────────────────────────────
    if (!(k?.validation_evidence.length)) {
      out.push({
        kind: 'missing-evidence',
        capability_id: id, capability_name: name,
        warning: `No validation evidence is recorded for ${name}. If the client asks how it was proven, the honest answer is that it has not been, in this estate.`,
        derived_from: 'knowledge.validation_evidence'
      });
    }

    // ── Open defects ───────────────────────────────────────────────────────
    for (const d of k?.open_defects ?? []) {
      out.push({
        kind: 'open-defect',
        capability_id: id, capability_name: name,
        warning: `${name} carries open defect ${d.ref}: ${d.summary}`,
        derived_from: `knowledge.open_defects:${d.ref}`
      });
    }

    // ── Declared assumptions that the client would have to accept ──────────
    for (const a of lead ? (k?.assumptions ?? []) : []) {
      out.push({
        kind: 'integration-assumption',
        capability_id: id, capability_name: name,
        warning: `${name} assumes: ${a} If that does not hold in the client's estate, the capability behaves differently.`,
        derived_from: 'knowledge.assumptions'
      });
    }
  }

  return out;
}

/**
 * Turn governed limitations into "do not say this / say this instead" pairs.
 *
 * Only limitations of `medium` or `high` severity become prohibitions. A `low`-severity limitation
 * is real and stays visible on the recommendation, but promoting every one of them into a
 * prohibition would produce a wall of warnings that gets skimmed — which is how a genuinely
 * important one gets missed. The severity field exists to make that judgement; using it is not
 * softening anything.
 */
export function avoidClaiming(input: IntegrityInput): AvoidClaiming[] {
  const out: AvoidClaiming[] = [];

  for (const rec of input.recommendations) {
    const c = input.resolved.get(rec.capability_id);
    if (!c) continue;
    const name = c.identity.name;
    const id = c.identity.capability_id;

    const lead = rec.tier === 'lead';
    for (const l of c.knowledge?.known_limitations ?? []) {
      // `low` never becomes a prohibition; `medium` becomes one only for a lead capability. Both
      // remain visible in full on `CapabilityRecommendation.limitations`, which is never trimmed —
      // so nothing is hidden, and the prohibition list stays short enough to be read.
      if (l.severity === 'low') continue;
      if (l.severity === 'medium' && !lead) continue;
      out.push({
        capability_id: id,
        capability_name: name,
        avoid: `Do not present ${name} as though this were not true: ${l.limitation}`,
        instead: `Say what is actually governed: ${c.identity.summary} ${l.applies_to ? `The limitation applies to ${l.applies_to}.` : ''}`.trim(),
        derived_from: `knowledge.known_limitations:${l.severity}`
      });
    }

    // The synthetic-data prohibition is the one §21 names by example, so it is derived explicitly
    // rather than left to depend on a limitation happening to have been authored about it.
    const synthetic = (c.knowledge?.data_sources ?? []).filter(s => s.kind === 'synthetic');
    if (synthetic.length) {
      out.push({
        capability_id: id,
        capability_name: name,
        avoid: `Do not describe ${name} as operating on live client feeds.`,
        instead: `The current implementation runs on synthetic enterprise-world data (${synthetic.map(s => s.name).join(', ')}). Say that the mechanism is real and the data is modelled — which is true, and is a stronger position than being corrected later.`,
        derived_from: 'knowledge.data_sources'
      });
    }

    if (c.identity.implementation_status === 'simulated') {
      out.push({
        capability_id: id,
        capability_name: name,
        avoid: `Do not describe ${name} as computing a result. Its implementation status is simulated.`,
        instead: `Describe it as a modelled demonstration of the behaviour: the interaction is real, the reasoning behind it is not yet running.`,
        derived_from: 'identity.implementation_status'
      });
    }
  }

  return out;
}

/**
 * Deduplicate while PRESERVING every distinct statement.
 *
 * Identical warnings on the same capability collapse; similar warnings on different capabilities do
 * not. Aggressive deduplication here would be indistinguishable from suppression, which is why the
 * key includes the capability and the full text rather than only the kind.
 */
export function isNonNegotiable(kind: string): boolean {
  return NON_NEGOTIABLE.has(kind);
}

export function dedupeWarnings(warnings: DemoWarning[]): DemoWarning[] {
  const seen = new Set<string>();
  return warnings.filter(w => {
    const key = `${w.capability_id}::${w.warning}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
