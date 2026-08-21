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
  'cap-architecture-storyboard': () => import('../../../content/atlas/capabilities/cap-architecture-storyboard'),
  'cap-auth-platform-setup': () => import('../../../content/atlas/capabilities/cap-auth-platform-setup'),
  'cap-campaign-decision': () => import('../../../content/atlas/capabilities/cap-campaign-decision'),
  'cap-category-intelligence': () => import('../../../content/atlas/capabilities/cap-category-intelligence'),
  'cap-commitment-intelligence': () => import('../../../content/atlas/capabilities/cap-commitment-intelligence'),
  'cap-contract-verification': () => import('../../../content/atlas/capabilities/cap-contract-verification'),
  'cap-counterfactual-baseline': () => import('../../../content/atlas/capabilities/cap-counterfactual-baseline'),
  'cap-curiosity-questions': () => import('../../../content/atlas/capabilities/cap-curiosity-questions'),
  'cap-decision-contract': () => import('../../../content/atlas/capabilities/cap-decision-contract'),
  'cap-decision-gap': () => import('../../../content/atlas/capabilities/cap-decision-gap'),
  'cap-decision-lifecycle-view': () => import('../../../content/atlas/capabilities/cap-decision-lifecycle-view'),
  'cap-decision-readiness': () => import('../../../content/atlas/capabilities/cap-decision-readiness'),
  'cap-decision-regret': () => import('../../../content/atlas/capabilities/cap-decision-regret'),
  'cap-decision-ripple': () => import('../../../content/atlas/capabilities/cap-decision-ripple'),
  'cap-decision-timeline': () => import('../../../content/atlas/capabilities/cap-decision-timeline'),
  'cap-decision-window': () => import('../../../content/atlas/capabilities/cap-decision-window'),
  'cap-demand-forecast': () => import('../../../content/atlas/capabilities/cap-demand-forecast'),
  'cap-domain-persona-context': () => import('../../../content/atlas/capabilities/cap-domain-persona-context'),
  'cap-enterprise-memory': () => import('../../../content/atlas/capabilities/cap-enterprise-memory'),
  'cap-enterprise-signal': () => import('../../../content/atlas/capabilities/cap-enterprise-signal'),
  'cap-experiment-canvas': () => import('../../../content/atlas/capabilities/cap-experiment-canvas'),
  'cap-forecast-stability': () => import('../../../content/atlas/capabilities/cap-forecast-stability'),
  'cap-governance-settings': () => import('../../../content/atlas/capabilities/cap-governance-settings'),
  'cap-innovation-portfolio': () => import('../../../content/atlas/capabilities/cap-innovation-portfolio'),
  'cap-intent-fusion': () => import('../../../content/atlas/capabilities/cap-intent-fusion'),
  'cap-journey-telemetry': () => import('../../../content/atlas/capabilities/cap-journey-telemetry'),
  'cap-learning-loop': () => import('../../../content/atlas/capabilities/cap-learning-loop'),
  'cap-learning-pattern-registry': () => import('../../../content/atlas/capabilities/cap-learning-pattern-registry'),
  'cap-memory-learning-api': () => import('../../../content/atlas/capabilities/cap-memory-learning-api'),
  'cap-observation-correspondence': () => import('../../../content/atlas/capabilities/cap-observation-correspondence'),
  'cap-opportunity-intelligence': () => import('../../../content/atlas/capabilities/cap-opportunity-intelligence'),
  'cap-opportunity-window': () => import('../../../content/atlas/capabilities/cap-opportunity-window'),
  'cap-outcome-frontier': () => import('../../../content/atlas/capabilities/cap-outcome-frontier'),
  'cap-predictive-inventory': () => import('../../../content/atlas/capabilities/cap-predictive-inventory'),
  'cap-promotion-intelligence': () => import('../../../content/atlas/capabilities/cap-promotion-intelligence'),
  'cap-shared-decision-state': () => import('../../../content/atlas/capabilities/cap-shared-decision-state'),
  'cap-signal-connector': () => import('../../../content/atlas/capabilities/cap-signal-connector'),
  'cap-signal-simulation': () => import('../../../content/atlas/capabilities/cap-signal-simulation')
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
