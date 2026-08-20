/**
 * Capability knowledge store — on-demand loading of ATL-03 content.
 *
 * The identity registry (`config/capabilities.ts`) is always resident. Knowledge modules are
 * NOT: each is a separate module under `content/atlas/capabilities/` loaded only when a caller
 * asks for that capability's knowledge. That is what keeps the registry compact while allowing
 * ATL-03 to author arbitrarily deep content per capability (ADR-046).
 *
 * Adding a capability's knowledge is adding one module and one `knowledge_ref`. No schema
 * change, no registry growth, no architectural redesign.
 */

import type { CapabilityKnowledge } from '../../../packages/contracts/src/capability-atlas-model';

/**
 * Static import map. Every entry is a lazy `import()` — the module body is not evaluated
 * until the ref is requested. A literal map rather than a dynamic path expression so that
 * the bundler can resolve every target at build time and an unknown ref fails loudly here
 * rather than at runtime in a route.
 */
const KNOWLEDGE_MODULES: Record<string, () => Promise<{ knowledge: CapabilityKnowledge }>> = {
  'cap-forecast-stability': () => import('../../../content/atlas/capabilities/cap-forecast-stability'),
  'cap-decision-gap': () => import('../../../content/atlas/capabilities/cap-decision-gap'),
  'cap-decision-window': () => import('../../../content/atlas/capabilities/cap-decision-window')
};

const cache = new Map<string, CapabilityKnowledge>();

export function knowledgeRefExists(ref: string): boolean {
  return Object.prototype.hasOwnProperty.call(KNOWLEDGE_MODULES, ref);
}

export function listKnowledgeRefs(): string[] {
  return Object.keys(KNOWLEDGE_MODULES);
}

/**
 * Load a capability's knowledge. Returns `null` for an unknown ref rather than throwing:
 * a capability with no authored knowledge is the expected state before ATL-03, not an error.
 */
export async function loadKnowledge(ref: string | null): Promise<CapabilityKnowledge | null> {
  if (!ref) return null;
  const cached = cache.get(ref);
  if (cached) return cached;
  const loader = KNOWLEDGE_MODULES[ref];
  if (!loader) return null;
  const mod = await loader();
  cache.set(ref, mod.knowledge);
  return mod.knowledge;
}

/** Test-only. Never called from a route. */
export function clearKnowledgeCache(): void {
  cache.clear();
}
