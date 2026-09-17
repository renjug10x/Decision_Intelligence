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
import { useState } from 'react';
import { Package, ArrowLeftRight, RotateCcw, Check, Loader2 } from 'lucide-react';
import {
  getActiveScenario,
  resolveScenario,
  isScenarioRegistered
} from '@/lib/scenario-client-registry';
import { useDecisionState } from '@/context/DecisionStateContext';
import { getOrCreateSessionId } from '@/lib/journey-client';
import ScenarioSelectorModal from '@/components/ScenarioSelectorModal';

export default function ScenarioContextStrip() {
  const { decisionState, resetScenario, refreshState } = useDecisionState();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [restartPhase, setRestartPhase] = useState<'idle' | 'working' | 'done'>('idle');

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

  return (
    <>
      <div
        className="scenario-context-strip"
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface, #FFFFFF)'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4
          }}
        >
          <div
            style={{
              fontSize: '0.5625rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)'
            }}
          >
            This decision
          </div>
          <span
            style={{
              fontSize: '0.5625rem',
              fontWeight: 600,
              color: 'var(--success, #16A34A)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}
          >
            Active Case
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <Package size={12} strokeWidth={1.75} color="var(--g10x-orange)" style={{ flexShrink: 0 }} />
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={identity.sku_name}
          >
            {identity.sku_name}
          </span>
        </div>

        <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
          {identity.category} · {identity.market_scope_label} · {calendar.forecast_horizon_days} days
        </div>

        <div
          style={{
            fontSize: '0.6875rem',
            color: 'var(--text-muted)',
            lineHeight: 1.45,
            marginBottom: 8
          }}
        >
          {identity.focus_region} in focus · {supply.supplier_name}
        </div>

        {/* Executive Action Controls: Change Scenario & Quick Restart */}
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <button
            type="button"
            onClick={() => setSelectorOpen(true)}
            title="Choose another certified scenario from the laboratory catalogue"
            aria-label="Change scenario"
            style={{
              flex: 1,
              padding: '4px 8px',
              fontSize: '0.6875rem',
              fontWeight: 600,
              borderRadius: 4,
              border: '1px solid var(--border)',
              background: '#FFFFFF',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              lineHeight: 1.3
            }}
          >
            <ArrowLeftRight size={11} color="var(--g10x-orange)" strokeWidth={2} />
            <span>Change</span>
          </button>

          <button
            type="button"
            onClick={handleRestart}
            disabled={restartPhase === 'working'}
            title={`Restart ${identity.scenario_name} to its opening position`}
            aria-label="Restart active scenario"
            style={{
              padding: '4px 8px',
              fontSize: '0.6875rem',
              fontWeight: 500,
              borderRadius: 4,
              border: '1px solid var(--border)',
              background: '#FFFFFF',
              color: restartPhase === 'done' ? 'var(--success)' : 'var(--text-muted)',
              cursor: restartPhase === 'working' ? 'progress' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              lineHeight: 1.3
            }}
          >
            {restartPhase === 'working' && <Loader2 size={11} className="spin" />}
            {restartPhase === 'done' && <Check size={11} />}
            {restartPhase === 'idle' && <RotateCcw size={11} />}
            <span>{restartPhase === 'done' ? 'Reset' : 'Restart'}</span>
          </button>
        </div>
      </div>

      <ScenarioSelectorModal
        isOpen={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        activeScenarioId={identity.scenario_id}
        onScenarioActivated={handleScenarioActivated}
      />
    </>
  );
}
