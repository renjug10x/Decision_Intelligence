'use client';

/**
 * The Atlas visual explainability renderer (ATL-04R).
 *
 * One component, four patterns, zero capability content. Everything this file draws arrives as a
 * `VisualSpec` from a capability's governed knowledge module — the labels, the roles, the ordering
 * and the text equivalent are all authored content, and this file only decides how a `kind` is
 * laid out. That boundary is ADR-046 applied to pictures: a diagram hand-written into a component
 * is capability knowledge in JSX, which is exactly what the Atlas backend exists to prevent, and
 * exactly what the retired storyboard's twelve bespoke slide blocks became.
 *
 * ── Why there is no number anywhere in here ─────────────────────────────────
 * `VisualSpec` has no numeric field, so no axis is scaled, no bar is sized to a value and no node
 * carries a figure. That is deliberate and it is the lesson of `ATL-01`: the storyboard's twelve
 * `outcomeLabel` constants were invented to make diagrams look authoritative, and every one was
 * marked Discard. These visuals explain STRUCTURE — what sits where, what leads to what, what
 * differs from what. Where governed quantitative evidence exists it is cited as evidence, in words,
 * beside the visual, not encoded into its geometry.
 *
 * ── Accessibility is structural, not an attribute ───────────────────────────
 * Every spec carries a mandatory `description` (rule L7), rendered here as a real, always-present
 * text equivalent rather than hidden behind an `aria-label` a sighted reader can never check and a
 * screen-reader user has to trust. The graphic itself is `aria-hidden`, so assistive technology
 * reads the equivalent once instead of walking a decorative node tree.
 */

import type { VisualSpec, VisualNode } from '@/packages/contracts/src/capability-atlas-model';

interface Props {
  visual: VisualSpec;
  /** Rendered smaller where the visual accompanies a summary rather than leading a detail page. */
  compact?: boolean;
}

function nodeClass(node: VisualNode): string {
  return node.role ? `atlas-vis-node atlas-vis-node--${node.role}` : 'atlas-vis-node';
}

function Node({ node }: { node: VisualNode }) {
  return (
    <div className={nodeClass(node)}>
      <span className="atlas-vis-label">{node.label}</span>
      {node.detail && <span className="atlas-vis-detail">{node.detail}</span>}
    </div>
  );
}

/**
 * The Decision Gap reference pattern. Two positions on one track and the distance named between
 * them, because the distance is the concept — not the endpoints.
 */
function GapVisual({ visual }: { visual: VisualSpec }) {
  const [from, to] = [visual.nodes[0], visual.nodes[visual.nodes.length - 1]];
  return (
    <div className="atlas-vis-gap">
      <Node node={from} />
      <div className="atlas-vis-span">
        <span className="atlas-vis-span-rule" />
        <span className="atlas-vis-span-label">{visual.concept}</span>
      </div>
      <Node node={to} />
    </div>
  );
}

function FlowVisual({ visual }: { visual: VisualSpec }) {
  return (
    <ol className="atlas-vis-flow">
      {visual.nodes.map((node, i) => (
        <li key={`${node.label}-${i}`} className="atlas-vis-flow-item">
          <Node node={node} />
        </li>
      ))}
    </ol>
  );
}

/** Several evidence sources meeting in one judgement. */
function ConvergenceVisual({ visual }: { visual: VisualSpec }) {
  const outcome = visual.nodes.find(n => n.role === 'outcome') ?? visual.nodes[visual.nodes.length - 1];
  const sources = visual.nodes.filter(n => n !== outcome);
  return (
    <div className="atlas-vis-converge">
      <div className="atlas-vis-converge-sources">
        {sources.map((node, i) => (
          <Node key={`${node.label}-${i}`} node={node} />
        ))}
      </div>
      <div className="atlas-vis-converge-join" aria-hidden="true">
        <span className="atlas-vis-converge-stem" />
      </div>
      <div className="atlas-vis-converge-outcome">
        <Node node={outcome} />
      </div>
    </div>
  );
}

function ComparisonVisual({ visual }: { visual: VisualSpec }) {
  return (
    <div className="atlas-vis-compare">
      {visual.nodes.map((node, i) => (
        <div key={`${node.label}-${i}`} className="atlas-vis-compare-side">
          <Node node={node} />
        </div>
      ))}
    </div>
  );
}

const RENDERERS = {
  gap: GapVisual,
  flow: FlowVisual,
  convergence: ConvergenceVisual,
  comparison: ComparisonVisual
} as const;

export default function CapabilityVisual({ visual, compact = false }: Props) {
  const Renderer = RENDERERS[visual.kind];
  if (!Renderer || !visual.nodes?.length) return null;

  return (
    <figure className={`atlas-vis${compact ? ' atlas-vis--compact' : ''}`}>
      <div className="atlas-vis-canvas" aria-hidden="true">
        <Renderer visual={visual} />
      </div>
      <figcaption className="atlas-vis-equivalent">
        <span className="atlas-vis-equivalent-label">{visual.concept}</span>
        <span className="atlas-vis-equivalent-text">{visual.description}</span>
      </figcaption>
    </figure>
  );
}
