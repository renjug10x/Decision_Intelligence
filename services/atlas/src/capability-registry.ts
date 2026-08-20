/**
 * Capability repository — the single access path to capability identity and knowledge.
 *
 * ADR-046: no route, component, search path or AI path reads the registry modules directly.
 * Everything goes through this abstraction, which is what allows the persistence mechanism to
 * change later behind one interface rather than by rewriting the Atlas.
 *
 * ADR-045 (unamended portion): relationship targets are RESOLVED here at request time from
 * their own registries. No solution, experiment or pattern field is ever copied onto a
 * capability record, so the source registry stays authoritative and a copy cannot drift.
 */

import { CAPABILITY_REGISTRY } from '../../../config/capabilities';
import { DEMONSTRATION_SOLUTIONS } from '../../../config/solutions';
import { CANONICAL_LEARNING_PATTERNS } from '../../learning/src/learning-pattern-store';
import { loadKnowledge } from './capability-knowledge-store';
import type {
  CapabilityIdentity,
  CapabilityFilter,
  ResolvedCapability,
  ResolvedRelationships,
  DemoMaturity,
  AudienceLens,
  CapabilityId
} from '../../../packages/contracts/src/capability-atlas-model';

/**
 * Experiment registry access. `config/experiments.ts` shape is read defensively — the Atlas
 * consumes it, it does not own it, and it must not break if that registry gains fields.
 */
import { EXPERIMENT_REGISTRY } from '../../../config/experiments';

// ── Lens field ordering (CAPABILITY_KNOWLEDGE_MODEL.md §8) ───────────────────
// A lens reorders. It never changes content, and never selects a different record.
const LENS_FIELD_ORDER: Record<AudienceLens, string[]> = {
  'innovation-executive': ['innovation_thesis', 'business_problems', 'cross_domain_applicability', 'external_evidence', 'validation_evidence', 'known_limitations'],
  'sales': ['use_cases', 'demo_scenarios', 'client_questions', 'known_limitations', 'related_capabilities'],
  'architect': ['architecture_narrative', 'architecture_flow', 'apis', 'contracts', 'data_sources', 'related_decisions'],
  'developer': ['implementation_references', 'apis', 'contracts', 'testing_instructions', 'test_runners', 'known_limitations', 'open_defects']
};

/** Fields no lens may suppress (ADR-047 + CAPABILITY_KNOWLEDGE_MODEL.md §8). */
export const NEVER_SUPPRESSED = [
  'name', 'summary', 'lifecycle_state', 'demo_maturity', 'implementation_status', 'known_limitations'
];

export interface ICapabilityRepository {
  listIdentities(filter?: CapabilityFilter): CapabilityIdentity[];
  getIdentity(id: CapabilityId): CapabilityIdentity | null;
  resolve(id: CapabilityId, opts?: { includeKnowledge?: boolean; lens?: AudienceLens }): Promise<ResolvedCapability | null>;
  resolveRelationships(identity: CapabilityIdentity): ResolvedRelationships;
  resolveDemoMaturity(identity: CapabilityIdentity): DemoMaturity | null;
  listTags(): { tag: string; count: number }[];
  listDeliveredBy(): { work_package: string; capability_ids: CapabilityId[] }[];
}

function matchesAny(values: string[], filter?: string[]): boolean {
  if (!filter || filter.length === 0) return true;
  return values.some(v => filter.includes(v));
}

export class InMemoryCapabilityRepository implements ICapabilityRepository {
  private readonly identities: CapabilityIdentity[];

  constructor(identities: CapabilityIdentity[] = CAPABILITY_REGISTRY) {
    this.identities = identities;
  }

  listIdentities(filter: CapabilityFilter = {}): CapabilityIdentity[] {
    return this.identities.filter(c => {
      if (!matchesAny(c.domains, filter.domain)) return false;
      if (!matchesAny(c.personas, filter.persona)) return false;
      if (!matchesAny(c.business_problems, filter.business_problem)) return false;
      if (!matchesAny(c.tags, filter.tags)) return false;
      if (!matchesAny(c.delivered_by, filter.delivered_by)) return false;
      if (!matchesAny(c.demonstrated_by, filter.demonstrated_by)) return false;
      if (filter.capability_type && !filter.capability_type.includes(c.capability_type)) return false;
      if (filter.implementation_status && !filter.implementation_status.includes(c.implementation_status)) return false;
      if (filter.lifecycle_state) {
        if (c.lifecycle_state === null) return false;
        if (!filter.lifecycle_state.includes(c.lifecycle_state)) return false;
      }
      if (filter.demo_maturity) {
        const dm = this.resolveDemoMaturity(c);
        if (dm === null || !filter.demo_maturity.includes(dm)) return false;
      }
      if (typeof filter.platform_reusable === 'boolean' && c.platform_reusable !== filter.platform_reusable) return false;
      return true;
    });
  }

  getIdentity(id: CapabilityId): CapabilityIdentity | null {
    return this.identities.find(c => c.capability_id === id) ?? null;
  }

  /**
   * ADR-047 dimension 2. Resolved through `demonstrated_by`, never stored on the capability.
   * `null` where no solution demonstrates the capability — which is honest, not missing data.
   * Where several solutions demonstrate one capability the LEAST mature is reported, because
   * a capability is only as demonstrable as its weakest surface.
   */
  resolveDemoMaturity(identity: CapabilityIdentity): DemoMaturity | null {
    const order: DemoMaturity[] = ['Reference Pattern', 'Interactive Prototype', 'Production Ready'];
    const maturities = identity.demonstrated_by
      .map(sid => DEMONSTRATION_SOLUTIONS.find(s => s.id === sid))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .map(s => s.demoMaturity as DemoMaturity);
    if (maturities.length === 0) return null;
    return maturities.reduce((lowest, m) =>
      order.indexOf(m) < order.indexOf(lowest) ? m : lowest
    );
  }

  resolveRelationships(identity: CapabilityIdentity): ResolvedRelationships {
    return {
      solutions: identity.demonstrated_by
        .map(id => DEMONSTRATION_SOLUTIONS.find(s => s.id === id))
        .filter((s): s is NonNullable<typeof s> => Boolean(s))
        .map(s => ({ id: s.id, name: s.name, demo_maturity: s.demoMaturity as DemoMaturity })),
      experiments: identity.originated_as
        .map(id => EXPERIMENT_REGISTRY.find(e => e.id === id))
        .filter((e): e is NonNullable<typeof e> => Boolean(e))
        .map(e => ({ id: e.id, name: e.name, maturity: String(e.maturity) })),
      patterns: identity.evidenced_by
        .map(id => CANONICAL_LEARNING_PATTERNS.find(p => p.pattern_id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map(p => ({ id: p.pattern_id, title: p.pattern_name })),
      work_packages: [...identity.delivered_by]
    };
  }

  async resolve(
    id: CapabilityId,
    opts: { includeKnowledge?: boolean; lens?: AudienceLens } = {}
  ): Promise<ResolvedCapability | null> {
    const identity = this.getIdentity(id);
    if (!identity) return null;
    const knowledge = opts.includeKnowledge ? await loadKnowledge(identity.knowledge_ref) : null;
    const lens = opts.lens ?? null;
    return {
      identity,
      demo_maturity: this.resolveDemoMaturity(identity),
      relationships: this.resolveRelationships(identity),
      knowledge,
      lens,
      lens_field_order: lens && LENS_FIELD_ORDER[lens] ? LENS_FIELD_ORDER[lens] : []
    };
  }

  listTags(): { tag: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const c of this.identities) {
      for (const t of c.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }

  /** The ADR-052 cardinality view: which capabilities each work package delivered. */
  listDeliveredBy(): { work_package: string; capability_ids: CapabilityId[] }[] {
    const map = new Map<string, CapabilityId[]>();
    for (const c of this.identities) {
      for (const wp of c.delivered_by) {
        map.set(wp, [...(map.get(wp) ?? []), c.capability_id]);
      }
    }
    return [...map.entries()]
      .map(([work_package, capability_ids]) => ({ work_package, capability_ids }))
      .sort((a, b) => a.work_package.localeCompare(b.work_package));
  }
}

export const capabilityRepository = new InMemoryCapabilityRepository();
