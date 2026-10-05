'use client';
/**
 * The decision case, stated once and always in view.
 *
 * The continuity problem this answers is not that any single screen was wrong — it is that a
 * reader moving between Demand, Promotion and Campaign Decision had nothing telling them they
 * were still looking at the same product, the same scope and the same fortnight. They had to
 * infer it, and where the numbers moved they inferred the opposite.
 *
 * Four facts, one line each, and nothing else: it must not become a second header competing with
 * the decision on screen. The live economics belong to the surfaces; what belongs here is
 * IDENTITY, which does not change as the reader moves.
 *
 * Under SCI-04, ScenarioContextStrip also provides executive discovery and activation of
 * certified scenarios from the frozen catalogue, and direct restart of the active case.
 */
import { useState, useEffect } from 'react';
import { Crosshair, ArrowLeftRight, RotateCcw, Check, Loader2 } from 'lucide-react';
import {
  getActiveScenario,
  resolveScenario,
  isScenarioRegistered
} from '@/lib/scenario-client-registry';
import { useDecisionState } from '@/context/DecisionStateContext';
import { getOrCreateSessionId } from '@/lib/journey-client';
import ScenarioSelectorModal from '@/components/ScenarioSelectorModal';
import ScenarioAuthoringStudio from '@/components/scenario-authoring/ScenarioAuthoringStudio';

interface ScenarioContextStripProps {
  active?: boolean;
  onOpenStudio?: () => void;
}

export default function ScenarioContextStrip({
  active = false,
  onOpenStudio
}: ScenarioContextStripProps = {}) {
  const { decisionState, resetScenario, refreshState } = useDecisionState();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [authoringOpen, setAuthoringOpen] = useState(false);
  const [restartPhase, setRestartPhase] = useState<'idle' | 'working' | 'done'>('idle');
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Dynamically resolve the active scenario from decision state or the canonical registry
  const activeScenario = (() => {
    try {
      if (decisionState?.scenario_id && isScenarioRegistered(decisionState.scenario_id)) {
        return resolveScenario(decisionState.scenario_id);
      }
      return getActiveScenario();
    } catch {
      return getActiveScenario();
    }
  })();

  const { identity, calendar, supply } = activeScenario;

  useEffect(() => {
    if (!detailsOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDetailsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [detailsOpen]);

  const handleRestart = async () => {
    if (restartPhase === 'working') return;
    setRestartPhase('working');
    try {
      await fetch('/api/v1/campaigns/decision-session/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: decisionState?.tenant_id || 'tenant_uk_retail_01',
          session_id: getOrCreateSessionId()
        })
      }).catch(() => null);

      await resetScenario();
      setRestartPhase('done');
      setTimeout(() => setRestartPhase('idle'), 2000);
    } catch {
      setRestartPhase('idle');
    }
  };

  const handleScenarioActivated = async () => {
    await refreshState();
  };

  const compactSummary = [
    identity?.category,
    identity?.market_scope_label,
    calendar?.forecast_horizon_days ? `${calendar.forecast_horizon_days} days` : null
  ]
    .filter(Boolean)
    .join(' · ');

  const detailFields = [
    { label: 'Product', value: identity?.sku_name },
    { label: 'Category', value: identity?.category },
    { label: 'Geographic scope', value: identity?.market_scope_label },
    { label: 'Focus region', value: identity?.focus_region },
    { label: 'Supplier', value: supply?.supplier_name },
    {
      label: 'Horizon',
      value: calendar?.forecast_horizon_days ? `${calendar.forecast_horizon_days} days` : undefined
    },
    { label: 'Current scenario', value: identity?.scenario_name }
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));

  return (
    <>
      <div
        className={`scenario-context-strip${active ? ' is-active' : ''}`}
        onMouseEnter={() => setDetailsOpen(true)}
        onMouseLeave={() => setDetailsOpen(false)}
      >
        <div className="scenario-context-heading">This decision</div>

        <div className="scenario-context-row">
          <button
            type="button"
            className={`scenario-decision-trigger${active ? ' is-active' : ''}`}
            onClick={() => {
              setDetailsOpen(false);
              onOpenStudio?.();
            }}
            onFocus={() => setDetailsOpen(true)}
            onBlur={() => setDetailsOpen(false)}
            aria-describedby="active-decision-details-popover"
            aria-current={active ? 'page' : undefined}
            title={`Open Dynamic Scenario Studio for ${identity.sku_name}`}
          >
            <Crosshair
              size={13}
              strokeWidth={1.85}
              color={active ? 'var(--g10x-orange)' : 'var(--text-secondary)'}
              style={{ flexShrink: 0 }}
            />
            <span className="scenario-decision-name">{identity.sku_name}</span>
          </button>

          <div className="scenario-strip-actions">
            <button
              type="button"
              className="scenario-strip-icon-btn"
              onClick={() => {
                setDetailsOpen(false);
                setSelectorOpen(true);
              }}
              title="Change decision"
              aria-label="Change decision"
            >
              <ArrowLeftRight size={12} strokeWidth={1.85} />
            </button>

            <button
              type="button"
              className="scenario-strip-icon-btn"
              onClick={handleRestart}
              disabled={restartPhase === 'working'}
              title={
                restartPhase === 'done'
                  ? 'Reset complete'
                  : `Restart scenario (${identity.scenario_name})`
              }
              aria-label="Restart scenario"
            >
              {restartPhase === 'working' && <Loader2 size={12} className="spin" />}
              {restartPhase === 'done' && <Check size={12} color="var(--success, #16A34A)" />}
              {restartPhase === 'idle' && <RotateCcw size={12} strokeWidth={1.85} />}
            </button>
          </div>
        </div>

        {compactSummary && (
          <div
            className="scenario-context-meta"
            onClick={() => {
              setDetailsOpen(false);
              onOpenStudio?.();
            }}
          >
            {compactSummary}
          </div>
        )}

        <div
          id="active-decision-details-popover"
          role="tooltip"
          className={`scenario-decision-popover${detailsOpen ? ' is-open' : ''}`}
        >
          <div className="scenario-decision-popover-title">Active decision context</div>
          <dl className="scenario-decision-popover-list">
            {detailFields.map(field => (
              <div key={field.label} className="scenario-decision-popover-row">
                <dt>{field.label}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
          </dl>
          <div className="scenario-decision-popover-hint">
            Select to open Dynamic Scenario Studio
          </div>
        </div>
      </div>

      <ScenarioSelectorModal
        isOpen={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        activeScenarioId={identity.scenario_id}
        onScenarioActivated={handleScenarioActivated}
        onCreateScenario={() => {
          setSelectorOpen(false);
          if (active) {
            onOpenStudio?.();
          } else {
            setAuthoringOpen(true);
          }
        }}
      />
      <ScenarioAuthoringStudio isOpen={authoringOpen} onClose={() => setAuthoringOpen(false)} />
    </>
  );
}

