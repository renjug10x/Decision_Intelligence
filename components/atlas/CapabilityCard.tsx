'use client';

/**
 * A capability result. Everything rendered here arrives from the Atlas API; the component holds
 * no capability content (ADR-046).
 */

import { ArrowUpRight, Repeat } from 'lucide-react';
import MaturityTriad from './MaturityTriad';
import type { SearchResult } from '@/packages/contracts/src/capability-atlas-model';

export interface CardCapability extends SearchResult {
  platform_reusable?: boolean;
  domains?: string[];
  /** Why the active lens placed this capability where it did. Words, never a score (ADR-064). */
  lens_signals?: { id: string; rationale: string }[];
}

export default function CapabilityCard({
  capability,
  onOpen,
  showWhy
}: {
  capability: CardCapability;
  onOpen: (id: string) => void;
  showWhy?: boolean;
}) {
  const why = capability.matches?.length
    ? `matched on ${capability.matches.map(m => m.field.replace(/_/g, ' ')).join(', ')}`
    : null;

  return (
    <button
      type="button"
      className="atlas-card"
      onClick={() => onOpen(capability.capability_id)}
      aria-label={`Open ${capability.name}`}
    >
      <span className="atlas-card-head">
        <span className="atlas-card-name">{capability.name}</span>
        <ArrowUpRight size={15} strokeWidth={1.75} color="var(--text-muted)" style={{ flexShrink: 0 }} />
      </span>
      <p className="atlas-card-summary">{capability.summary}</p>
      <span className="atlas-card-foot">
        <MaturityTriad
          lifecycle={capability.lifecycle_state}
          demoMaturity={capability.demo_maturity}
          implementation={capability.implementation_status}
        />
        {capability.platform_reusable && (
          <span className="atlas-reuse">
            <Repeat size={12} strokeWidth={2} /> Reusable across domains
          </span>
        )}
        {showWhy && why && <span className="atlas-card-why">{why}</span>}
        {capability.lens_signals?.length ? (
          <span className="atlas-card-why atlas-card-lenswhy" title={capability.lens_signals.map(s => s.rationale).join(' ')}>
            {capability.lens_signals[0].rationale}
          </span>
        ) : null}
      </span>
    </button>
  );
}
