'use client';
/**
 * Scenario controls — the two things a presenter needs within reach and nothing else.
 *
 * Currency, because the same decision case is shown to readers who think in dollars and euros.
 * Restart, because a demonstration is run many times a day and the second run has to open exactly
 * where the first one did. Both sit at the foot of the navigation rail, out of the way of the
 * decision itself: they are stage controls, not part of the story.
 *
 * Deliberately plain language. "Restart scenario" is what it does; the reader never meets a
 * decision session, a state version or an endpoint.
 */
import { useState } from 'react';
import { RotateCcw, Check, Loader2 } from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';
import { useDecisionState } from '@/context/DecisionStateContext';
import { SUPPORTED_CURRENCIES, SupportedCurrency } from '@/packages/contracts/src/currency-model';
import {
  getActiveScenario,
  resolveScenario,
  isScenarioRegistered
} from '@/lib/scenario-client-registry';
import { getOrCreateSessionId } from '@/lib/journey-client';

type ResetPhase = 'idle' | 'working' | 'done';

export default function ScenarioControls({ onReset }: { onReset?: () => void } = {}) {
  const { currency, setCurrency, rates } = useCurrency();
  const { decisionState, resetScenario } = useDecisionState();
  const [phase, setPhase] = useState<ResetPhase>('idle');

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

  const handleRestart = async () => {
    if (phase === 'working') return;
    setPhase('working');
    try {
      /*
       * Clear the decision artefacts this session authored, then the shared scenario parameters.
       * Order matters: the workspace reset reads the session's intent while clearing it, so the
       * scenario must settle last or the restart lands on a half-cleared case.
       */
      await fetch('/api/v1/campaigns/decision-session/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: 'tenant_uk_retail_01', session_id: getOrCreateSessionId() })
      }).catch(() => null);
      await resetScenario();
      setPhase('done');
      onReset?.();
      setTimeout(() => setPhase('idle'), 2200);
    } catch {
      setPhase('idle');
    }
  };

  const chip = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '4px 0',
    fontSize: '0.6875rem',
    fontWeight: active ? 600 : 500,
    borderRadius: 4,
    border: `1px solid ${active ? 'var(--g10x-orange)' : 'var(--border)'}`,
    background: active ? 'rgba(255,107,0,0.08)' : '#FFFFFF',
    color: active ? 'var(--g10x-orange)' : 'var(--text-muted)',
    cursor: 'pointer',
    lineHeight: 1.4
  });

  const rateNote = rates.degraded_reason
    ? `Reference rates from ${rates.rate_date}`
    : `ECB rates, ${rates.rate_date}`;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }} role="group" aria-label="Display currency">
        {SUPPORTED_CURRENCIES.map((code: SupportedCurrency) => (
          <button
            key={code}
            onClick={() => setCurrency(code)}
            aria-pressed={currency === code}
            title={`Show money in ${code}`}
            style={chip(currency === code)}
          >
            {code}
          </button>
        ))}
      </div>
      <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.01em' }}>
        {currency === rates.base ? 'Modelled in GBP' : rateNote}
      </div>

      <button
        onClick={handleRestart}
        disabled={phase === 'working'}
        title={`Return to the opening position of ${activeScenario.identity.scenario_name}`}
        style={{
          width: '100%', padding: '6px 8px', fontSize: '0.75rem', borderRadius: 4,
          background: '#FFFFFF', border: '1px solid var(--border)',
          color: phase === 'done' ? 'var(--success)' : 'var(--text-muted)',
          cursor: phase === 'working' ? 'progress' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
        }}
      >
        {phase === 'working' && <Loader2 size={12} className="spin" />}
        {phase === 'done' && <Check size={12} />}
        {phase === 'idle' && <RotateCcw size={12} />}
        {phase === 'done' ? 'Scenario restarted' : 'Restart scenario'}
      </button>
    </div>
  );
}
