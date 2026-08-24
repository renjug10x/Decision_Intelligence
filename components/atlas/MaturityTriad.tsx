'use client';

/**
 * The three ADR-047 maturity dimensions, always rendered together.
 *
 * A capability can be Production Ready to demonstrate while still being partially implemented or
 * simulated. That combination is legitimate in a demonstration estate and misleading only when
 * hidden, so this component never collapses the three into one badge and never omits one because
 * it is inconvenient. Where a dimension is genuinely absent it says so rather than defaulting.
 *
 * Meaning is carried by the label and the word, not by colour alone.
 */

import type { DemoMaturity, ImplementationStatus, LifecycleState } from '@/packages/contracts/src/capability-atlas-model';

const IMPLEMENTATION_LABEL: Record<ImplementationStatus, string> = {
  'implemented': 'Implemented',
  'partially-implemented': 'Partly built',
  'simulated': 'Simulated',
  'experimental': 'Experimental',
  'concept': 'Concept',
  'roadmap': 'Roadmap'
};

function dotClass(status: ImplementationStatus): string {
  if (status === 'implemented') return 'atlas-dot atlas-dot--implemented';
  if (status === 'partially-implemented') return 'atlas-dot atlas-dot--partial';
  return 'atlas-dot atlas-dot--simulated';
}

function dimClass(status: ImplementationStatus): string {
  if (status === 'partially-implemented') return 'atlas-dim atlas-dim--partial';
  if (status === 'implemented') return 'atlas-dim';
  return 'atlas-dim atlas-dim--simulated';
}

export default function MaturityTriad({
  lifecycle,
  demoMaturity,
  implementation
}: {
  lifecycle: LifecycleState | null;
  demoMaturity: DemoMaturity | null;
  implementation: ImplementationStatus;
}) {
  return (
    <span className="atlas-triad">
      {/* Dimension 1 — innovation lifecycle, owned by EXPERIMENT_LIFECYCLE.md */}
      <span
        className={lifecycle ? 'atlas-dim' : 'atlas-dim atlas-dim--absent'}
        title={lifecycle
          ? `Innovation lifecycle state: ${lifecycle}`
          : 'No experiment owns this capability, so it carries no lifecycle state. Not inferred.'}
      >
        <span className="atlas-dim-key">Lifecycle</span>
        {lifecycle ?? 'not owned'}
      </span>

      {/* Dimension 2 — demonstration maturity, resolved from the solution registry */}
      <span
        className={demoMaturity ? 'atlas-dim' : 'atlas-dim atlas-dim--absent'}
        title={demoMaturity
          ? `Demonstration maturity: ${demoMaturity}`
          : 'No demonstration solution surfaces this capability, so it carries no demo maturity.'}
      >
        <span className="atlas-dim-key">Demo</span>
        {demoMaturity ?? 'no surface'}
      </span>

      {/* Dimension 3 — implementation truth */}
      <span
        className={dimClass(implementation)}
        title={`Implementation status: ${IMPLEMENTATION_LABEL[implementation]}`}
      >
        <span className={dotClass(implementation)} aria-hidden="true" />
        <span className="atlas-dim-key">Build</span>
        {IMPLEMENTATION_LABEL[implementation]}
      </span>
    </span>
  );
}
