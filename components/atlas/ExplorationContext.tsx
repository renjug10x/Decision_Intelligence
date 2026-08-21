'use client';

/**
 * The exploration context ribbon (ATL-04R).
 *
 * What the Atlas believes it is exploring, stated plainly and made removable. When clarification
 * collapses, this is what it leaves behind — the concise interpretation summary that lets the
 * reader return to the landscape without losing what was established.
 *
 * Every element carries where it came from. An `inferred` element is one the Atlas worked out from
 * the reader's words; a `chosen` one they selected. The distinction is drawn visibly rather than
 * kept internal, because an interface that silently applies its own inferences and an interface
 * that shows them are the same interface right up until the inference is wrong — and then only one
 * of them can be corrected. Every chip removes.
 */

import { X, RotateCcw } from 'lucide-react';
import type { ExplorationContext as Context, AudienceLens } from '@/packages/contracts/src/capability-atlas-model';

export type ContextRemoval =
  | { kind: 'area'; value: string }
  | { kind: 'aspect'; value: string }
  | { kind: 'lens' }
  | { kind: 'domain' }
  | { kind: 'refinement'; value: string };

interface Props {
  context: Context;
  areaName: (areaId: string) => string;
  aspectLabel: (aspectId: string) => string;
  domainName: (domainId: string) => string;
  lensName: (lens: AudienceLens) => string;
  onRemove: (removal: ContextRemoval) => void;
  onReset: () => void;
}

function Chip({
  label,
  source,
  onRemove
}: {
  label: string;
  source: 'inferred' | 'chosen';
  onRemove: () => void;
}) {
  return (
    <span className={`atlas-ctx-chip atlas-ctx-chip--${source}`}>
      <span className="atlas-ctx-chip-label">{label}</span>
      {source === 'inferred' && <span className="atlas-ctx-chip-source">read from your question</span>}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label} from this exploration`}>
        <X size={12} strokeWidth={2.25} />
      </button>
    </span>
  );
}

export default function ExplorationContextBar({
  context,
  areaName,
  aspectLabel,
  domainName,
  lensName,
  onRemove,
  onReset
}: Props) {
  const empty =
    context.areas.length === 0 &&
    context.aspects.length === 0 &&
    context.refinements.length === 0 &&
    !context.lens &&
    !context.domain;

  if (empty) return null;

  return (
    <div className="atlas-ctx" role="status">
      <span className="atlas-ctx-lead">Exploring</span>
      <div className="atlas-ctx-chips">
        {context.domain && (
          <Chip
            label={domainName(context.domain.value)}
            source={context.domain.source}
            onRemove={() => onRemove({ kind: 'domain' })}
          />
        )}
        {context.lens && (
          <Chip
            label={`${lensName(context.lens.value)} lens`}
            source={context.lens.source}
            onRemove={() => onRemove({ kind: 'lens' })}
          />
        )}
        {context.areas.map(area => (
          <Chip
            key={area.area_id}
            label={areaName(area.area_id)}
            source={area.source}
            onRemove={() => onRemove({ kind: 'area', value: area.area_id })}
          />
        ))}
        {context.aspects.map(aspect => (
          <Chip
            key={aspect.aspect_id}
            label={aspectLabel(aspect.aspect_id)}
            source={aspect.source}
            onRemove={() => onRemove({ kind: 'aspect', value: aspect.aspect_id })}
          />
        ))}
        {context.refinements.map(refinement => (
          <Chip
            key={refinement}
            label={refinement}
            source="chosen"
            onRemove={() => onRemove({ kind: 'refinement', value: refinement })}
          />
        ))}
      </div>
      <button type="button" className="atlas-ctx-reset" onClick={onReset}>
        <RotateCcw size={12} strokeWidth={2} /> Start over
      </button>
    </div>
  );
}
