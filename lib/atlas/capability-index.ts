/**
 * Deterministic Level 1 search index (ADR-050).
 *
 * ATL-02's search scored identity fields only. ADR-050 requires Level 1 to cover description,
 * innovation thesis, use cases, architecture narrative and technology terms as well — all of
 * which live in knowledge modules. This index loads the knowledge corpus once and flattens it
 * into weighted field groups.
 *
 * Nothing here is semantic. There is no embedding, no model and no network call: the index is a
 * lowercased token map over governed text, and the same query over the same corpus always
 * produces the same ordering. Level 2 semantic retrieval is ATL-05 and is additive to this.
 */

import type { CapabilityIdentity } from '../../packages/contracts/src/capability-atlas-model';
import { loadKnowledge } from '../../services/atlas/src/capability-knowledge-store';

export interface IndexedCapability {
  identity: CapabilityIdentity;
  /** Field group -> searchable text, already lowercased. */
  fields: Record<string, string>;
  /** Whole governed identifiers this capability answers to. */
  identifiers: string[];
}

export type CapabilityIndex = IndexedCapability[];

let cached: CapabilityIndex | null = null;

function join(...parts: (string | string[] | undefined)[]): string {
  const flat: string[] = [];
  for (const p of parts) {
    if (!p) continue;
    if (Array.isArray(p)) flat.push(...p);
    else flat.push(p);
  }
  return flat.join(' \n ').toLowerCase();
}

export async function buildCapabilityIndex(identities: CapabilityIdentity[]): Promise<CapabilityIndex> {
  const index: CapabilityIndex = [];
  for (const identity of identities) {
    const k = await loadKnowledge(identity.knowledge_ref);
    index.push({
      identity,
      identifiers: [
        identity.capability_id,
        ...identity.delivered_by,
        ...identity.demonstrated_by,
        ...identity.originated_as,
        ...identity.evidenced_by
      ].map(i => i.toLowerCase()),
      fields: {
        name: join(identity.name),
        summary: join(identity.summary),
        business_problems: join(identity.business_problems),
        tags: join(identity.tags),
        domains: join(identity.domains),
        personas: join(identity.personas),
        capability_type: join(identity.capability_type),
        // Knowledge-backed groups. Empty where ATL-03 authored nothing, which is honest.
        description: join(k?.description),
        innovation_thesis: join(k?.innovation_thesis),
        usage: join(k?.usage_instructions),
        testing: join(k?.testing_instructions, k?.test_runners),
        architecture: join(k?.architecture_narrative, k?.architecture_flow),
        technology: join(
          k?.contracts.map(c => `${c.name} ${c.path}`),
          k?.apis.map(a => `${a.method} ${a.path} ${a.purpose}`),
          k?.implementation_references.map(r => `${r.path} ${r.symbol ?? ''}`),
          k?.data_sources.map(d => d.name)
        ),
        use_cases: join(k?.use_cases.flatMap(u => [u.title, u.context, u.outcome])),
        demo: join(k?.demo_scenarios.flatMap(d => [d.title, ...d.steps.map(s => s.what_to_say)])),
        limitations: join(k?.known_limitations.map(l => l.limitation)),
        cross_domain: join(k?.cross_domain_applicability.map(a => `${a.domain_id} ${a.applicability} ${a.rationale}`)),
        client_questions: join(k?.client_questions.map(q => q.question))
      }
    });
  }
  return index;
}

export async function getCapabilityIndex(identities: CapabilityIdentity[]): Promise<CapabilityIndex> {
  if (!cached || cached.length !== identities.length) {
    cached = await buildCapabilityIndex(identities);
  }
  return cached;
}

/** Test-only. */
export function clearCapabilityIndex(): void {
  cached = null;
}
