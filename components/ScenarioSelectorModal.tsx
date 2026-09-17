'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Check, AlertTriangle, ShieldCheck, Loader2, ArrowRight, HelpCircle } from 'lucide-react';
import {
  fetchScenarioCatalogue,
  activateScenarioOnServer,
  ScenarioCatalogueEntry
} from '@/lib/world-client';
import { syncActiveScenario as clientSyncActiveScenario } from '@/lib/scenario-client-registry';
import { getOrCreateSessionId } from '@/lib/journey-client';

interface ScenarioSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeScenarioId: string;
  onScenarioActivated?: (scenarioId: string) => void;
}

export default function ScenarioSelectorModal({
  isOpen,
  onClose,
  activeScenarioId,
  onScenarioActivated
}: ScenarioSelectorModalProps) {
  const [catalogue, setCatalogue] = useState<ScenarioCatalogueEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setLoading(true);
    setErrorMessage(null);

    fetchScenarioCatalogue()
      .then(res => {
        if (mounted) {
          setCatalogue(res.scenarios);
          setLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setErrorMessage(err.message || 'Could not load scenario catalogue.');
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, activeScenarioId]);

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleActivate = async (scenario: ScenarioCatalogueEntry) => {
    // Under ADR-080, an uncertified scenario must never be activated
    const isCertified =
      scenario.certification_state === 'CERTIFIED' ||
      scenario.demo_active ||
      (scenario.certification_state === undefined && scenario.scenario_id === activeScenarioId);

    if (!isCertified) {
      setErrorMessage(
        `Scenario "${scenario.scenario_name}" cannot be activated: only certified scenarios may be demo-active (ADR-080).`
      );
      return;
    }

    if (scenario.scenario_id === activeScenarioId) {
      onClose();
      return;
    }

    setActivatingId(scenario.scenario_id);
    setErrorMessage(null);

    try {
      const sessionId = getOrCreateSessionId();
      const res = await activateScenarioOnServer(scenario.scenario_id, sessionId);

      if (!res.success) {
        setErrorMessage(res.error || 'Scenario activation was refused by the domain.');
        setActivatingId(null);
        return;
      }

      /*
       * Mirror the server's activation into this browser's registry so client-side engines resolve
       * the scenario that was just activated. This used to swallow its own failure, which is how a
       * selection could succeed on the server while every surface kept computing the previous
       * scenario (R-33). The shared mirror reports a disagreement instead of hiding it.
       */
      clientSyncActiveScenario(scenario.scenario_id);

      onScenarioActivated?.(scenario.scenario_id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Unexpected failure during scenario activation.');
    } finally {
      setActivatingId(null);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.48)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16
      }}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scenario-selector-title"
        style={{
          background: '#FFFFFF',
          borderRadius: 8,
          border: '1px solid var(--border)',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.16)',
          width: 'min(760px, 100%)',
          maxHeight: 'calc(100vh - 40px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            background: 'var(--bg-surface, #F8FAFC)'
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.625rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: 4
              }}
            >
              CogniX Scenario Laboratory
            </div>
            <h2
              id="scenario-selector-title"
              style={{
                fontSize: '1.0625rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
                lineHeight: 1.3
              }}
            >
              Choose a Scenario
            </h2>
            <p
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                margin: '4px 0 0 0',
                lineHeight: 1.45,
                maxWidth: '600px'
              }}
            >
              Select a certified scenario. Activating changes the complete retail decision context across
              Demand, Promotion, and Campaign operations.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close scenario selector"
            style={{
              border: '1px solid var(--border)',
              background: '#FFFFFF',
              borderRadius: 4,
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 0
            }}
          >
            <X size={15} strokeWidth={1.8} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              padding: '10px 16px',
              background: 'rgba(239, 68, 68, 0.08)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
              color: 'var(--danger, #DC2626)',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Body / Catalogue */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {loading ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.8125rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              <Loader2 size={16} className="spin" />
              <span>Loading scenario catalogue…</span>
            </div>
          ) : catalogue.length === 0 ? (
            <div
              style={{
                padding: '36px 20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.8125rem'
              }}
            >
              No registered scenarios found in catalogue.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {catalogue.map(entry => {
                const isCurrentlyActive = entry.scenario_id === activeScenarioId;
                const isCertified =
                  entry.certification_state === 'CERTIFIED' ||
                  entry.demo_active ||
                  (entry.certification_state === undefined && isCurrentlyActive);
                const isActivatingThis = activatingId === entry.scenario_id;

                return (
                  <div
                    key={entry.scenario_id}
                    style={{
                      border: isCurrentlyActive
                        ? '1px solid var(--g10x-orange)'
                        : '1px solid var(--border)',
                      borderLeft: isCurrentlyActive
                        ? '3px solid var(--g10x-orange)'
                        : '1px solid var(--border)',
                      borderRadius: 6,
                      background: isCurrentlyActive
                        ? 'rgba(255, 107, 0, 0.02)'
                        : '#FFFFFF',
                      padding: '14px 16px',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                    }}
                  >
                    {/* Header Row: Title & Badges */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 12,
                        marginBottom: 6
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '0.875rem',
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              lineHeight: 1.3
                            }}
                          >
                            {entry.scenario_name}
                          </span>
                          {isCurrentlyActive && (
                            <span
                              style={{
                                fontSize: '0.625rem',
                                fontWeight: 700,
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                                padding: '2px 6px',
                                borderRadius: 3,
                                background: 'rgba(255, 107, 0, 0.1)',
                                color: 'var(--g10x-orange)',
                                border: '1px solid rgba(255, 107, 0, 0.25)'
                              }}
                            >
                              Active Demo
                            </span>
                          )}
                          {isCertified ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                fontSize: '0.625rem',
                                fontWeight: 600,
                                color: 'var(--success, #16A34A)',
                                background: 'rgba(22, 163, 74, 0.08)',
                                padding: '2px 6px',
                                borderRadius: 3,
                                border: '1px solid rgba(22, 163, 74, 0.2)'
                              }}
                              title={entry.certification_summary || 'Certified under ADR-080'}
                            >
                              <ShieldCheck size={11} strokeWidth={2} /> Certified
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                fontSize: '0.625rem',
                                fontWeight: 600,
                                color: '#D97706',
                                background: 'rgba(217, 119, 6, 0.08)',
                                padding: '2px 6px',
                                borderRadius: 3,
                                border: '1px solid rgba(217, 119, 6, 0.2)'
                              }}
                              title={entry.certification_summary || 'Not certified for demo use'}
                            >
                              <AlertTriangle size={11} strokeWidth={2} /> Uncertified
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div>
                        {isCurrentlyActive ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: 'var(--success, #16A34A)',
                              padding: '5px 10px',
                              background: '#F0FDF4',
                              borderRadius: 4,
                              border: '1px solid #BBF7D0'
                            }}
                          >
                            <Check size={13} strokeWidth={2.2} /> Active
                          </span>
                        ) : isCertified ? (
                          <button
                            type="button"
                            onClick={() => handleActivate(entry)}
                            disabled={isActivatingThis || activatingId !== null}
                            style={{
                              padding: '5px 12px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              borderRadius: 4,
                              background: 'var(--g10x-orange)',
                              border: '1px solid var(--g10x-orange)',
                              color: '#FFFFFF',
                              cursor: isActivatingThis ? 'progress' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5
                            }}
                          >
                            {isActivatingThis ? (
                              <>
                                <Loader2 size={12} className="spin" /> Activating…
                              </>
                            ) : (
                              <>
                                Select <ArrowRight size={12} strokeWidth={2} />
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            style={{
                              padding: '5px 10px',
                              fontSize: '0.6875rem',
                              fontWeight: 500,
                              borderRadius: 4,
                              background: 'var(--bg-surface, #F1F5F9)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-muted)',
                              cursor: 'not-allowed'
                            }}
                            title="Uncertified scenarios cannot be demo-active (ADR-080)"
                          >
                            Unavailable
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Decision Question */}
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: 'var(--text-secondary)',
                        fontStyle: 'italic',
                        marginBottom: 8,
                        lineHeight: 1.45
                      }}
                    >
                      &ldquo;{entry.decision_question}&rdquo;
                    </div>

                    {/* Business Context Metadata Row */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px 14px',
                        fontSize: '0.6875rem',
                        color: 'var(--text-muted)',
                        paddingTop: 6,
                        borderTop: '1px solid var(--border-light, #F1F5F9)'
                      }}
                    >
                      <div>
                        <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Product:</strong>{' '}
                        {entry.sku_name} ({entry.category})
                      </div>
                      <div>
                        <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Scope:</strong>{' '}
                        {entry.market_scope_label} · {entry.focus_region}
                      </div>
                      <div>
                        <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Supplier:</strong>{' '}
                        {entry.supplier_name}
                      </div>
                      <div>
                        <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Horizon:</strong>{' '}
                        {entry.horizon_days} days
                      </div>
                    </div>

                    {/* Uncertified Warning Note */}
                    {!isCertified && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: '6px 10px',
                          background: 'rgba(217, 119, 6, 0.05)',
                          borderRadius: 4,
                          border: '1px solid rgba(217, 119, 6, 0.15)',
                          fontSize: '0.6875rem',
                          color: '#B45309',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <HelpCircle size={12} style={{ flexShrink: 0 }} />
                        <span>
                          {entry.certification_summary ||
                            'This scenario has not completed the twelve-dimension Scenario Certification Gate and is withheld from executive presentation.'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface, #F8FAFC)',
            fontSize: '0.6875rem',
            color: 'var(--text-muted)'
          }}
        >
          <span>
            The scenario clock, demand baseline, supplier capacity, and decision state update consistently upon selection.
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '5px 14px',
              fontSize: '0.75rem',
              fontWeight: 500,
              borderRadius: 4,
              border: '1px solid var(--border)',
              background: '#FFFFFF',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
