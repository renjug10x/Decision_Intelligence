'use client';

import React, { useState } from 'react';
import {
  Layers, Activity, Sparkles, Lock, CheckCircle2,
  Zap, ArrowRight, ShieldAlert, Award
} from 'lucide-react';
import ArchitectureExplorer from '@/components/ArchitectureExplorer';

import { useDecisionState } from '@/context/DecisionStateContext';

export default function Help() {
  const [activeTab, setActiveTab] = useState<'storyboard' | 'lifecycle' | 'telemetry' | 'decision_state'>('storyboard');
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const [journeyEvents, setJourneyEvents] = useState<any[]>([]);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);
  const { decisionState, resetScenario, refreshState } = useDecisionState();

  const fetchTelemetry = async () => {
    setLoadingTelemetry(true);
    try {
      const res = await fetch('/api/v1/journey/events?limit=30');
      const json = await res.json();
      if (json.data) setJourneyEvents(json.data);
    } catch (e) {
      console.warn('Failed to fetch telemetry events', e);
    }
    setLoadingTelemetry(false);
  };

  React.useEffect(() => {
    if (activeTab === 'telemetry') {
      fetchTelemetry();
    }
  }, [activeTab]);

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2>Help & Platform Architecture</h2>
          <p style={{ marginTop: 4 }}>
            Explore the platform's inner mechanics, security layers, and governed Looker semantic query lifecycle.
          </p>
        </div>
        
        {/* Help Tab Switcher */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-elevated)',
          padding: 4,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)'
        }}>
          {[
            { id: 'storyboard', label: 'Architecture Storyboard', Icon: Layers },
            { id: 'lifecycle', label: 'Decision Lifecycle', Icon: Activity },
            { id: 'telemetry', label: 'Journey Telemetry', Icon: Sparkles },
            { id: 'decision_state', label: 'Shared Decision State Diagnostics', Icon: Zap }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: isActive ? 700 : 600,
                  background: isActive ? 'var(--accent)' : 'none',
                  color: isActive ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <tab.Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: '65vh', position: 'relative' }}>
        
        {/* TAB 1: Architecture Storyboard */}
        {activeTab === 'storyboard' && (
          <div className="animate-fade">
            <ArchitectureExplorer />
          </div>
        )}

        {/* TAB 2: Decision Lifecycle Flowchart */}
        {activeTab === 'lifecycle' && (
          <div className="card animate-fade" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Decision Verification & Query Lifecycle</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                A transparent, audit-ready data verification path ensuring Looker governance rules are applied at every stage of AI suggestion generation.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800, margin: '20px auto 0', width: '100%' }}>
              {[
                {
                  step: 1,
                  title: 'Signal Detection',
                  desc: 'Telemetry anomalies (IoT cold chain, delivery delays, margin drops) are logged in BigQuery.',
                  tech: 'BigQuery / Analytics Rules Engine',
                  icon: Zap,
                  color: 'var(--warning)',
                  detail: 'The platform scans structured databases to identify metrics exceeding pre-configured WoW thresholds.'
                },
                {
                  step: 2,
                  title: 'IAM & RLS Scope Enforcement',
                  desc: 'User identity dictates data constraints. Category managers see only their category; store managers see only their store.',
                  tech: 'Looker User Attributes / IAM Policies',
                  icon: Lock,
                  color: 'var(--text-secondary)',
                  detail: 'Ensures data privacy and prevents horizontal escalations before any queries are formed.'
                },
                {
                  step: 3,
                  title: 'Governed Looker Query Compilation',
                  desc: 'Platform constructs a query targeting LookML-defined semantic metrics. No direct database queries.',
                  tech: 'Looker SDK / Semantic Translation API',
                  icon: Layers,
                  color: '#06B6D4',
                  detail: 'Standardizes calculations (e.g. margin, waste WoW) globally, preventing LLM hallucination of core metrics.'
                },
                {
                  step: 4,
                  title: 'Gemini Contextual Reasoning',
                  desc: 'Gemini consumes the clean, semantic metrics and evaluates secondary data context (weather, holidays) via MCP.',
                  tech: 'gemini-1.5-flash / Model Context Protocol (MCP)',
                  icon: Sparkles,
                  color: '#8B5CF6',
                  detail: 'Formulates a structured root cause explanation and suggests concrete operational adjustments.'
                },
                {
                  step: 5,
                  title: 'Confidence Assessment & Human Review',
                  desc: 'The recommendation is scored (0-100) and presented to the scoped user in a simplified operational card.',
                  tech: 'Confidence Engine / Decision Cockpit UI',
                  icon: Award,
                  color: 'var(--accent)',
                  detail: 'High-confidence alerts can trigger automated rules; lower confidence alerts demand manual approval.'
                },
                {
                  step: 6,
                  title: 'Governed Write-Back Execution',
                  desc: 'User approval dispatches the resolution to external APIs or AppSheet webhooks, logging the outcome.',
                  tech: 'AppSheet Webhooks / ERP Write-Back API',
                  icon: CheckCircle2,
                  color: 'var(--success)',
                  detail: 'Completes the operational feedback loop, logging actions back to BigQuery to feed Enterprise Memory.'
                }
              ].map((life) => {
                const isHovered = hoveredStep === life.step;
                return (
                  <div
                    key={life.step}
                    className="card"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 16,
                      background: isHovered ? 'var(--bg-elevated)' : 'var(--bg-card)',
                      border: `1px solid ${isHovered ? 'var(--accent)' : 'var(--border)'}`,
                      padding: 16,
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={() => setHoveredStep(life.step)}
                    onMouseLeave={() => setHoveredStep(null)}
                  >
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: isHovered ? 'var(--accent)' : 'var(--border)',
                      color: isHovered ? 'white' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem',
                      fontWeight: 800,
                      flexShrink: 0
                    }}>
                      0{life.step}
                    </div>
                    
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: life.color,
                      flexShrink: 0
                    }}>
                      <life.icon size={16} strokeWidth={2} />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>{life.title}</h4>
                        <span style={{ fontSize: '0.6875rem', fontFamily: 'monospace', color: 'var(--accent)', background: 'var(--accent-light)', padding: '1px 6px', borderRadius: 4 }}>
                          {life.tech}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
                        {life.desc}
                      </p>
                      
                      {isHovered && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: '0.7125rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          <strong>Deep Dive:</strong> {life.detail}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: Journey Telemetry Diagnostics */}
        {activeTab === 'telemetry' && (
          <div className="animate-fade" style={{ background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  WP10-B Journey Telemetry Diagnostic Buffer
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  In-memory diagnostic ring buffer displaying recent canonical journey events captured across CogniX.
                </p>
              </div>
              <button
                onClick={fetchTelemetry}
                disabled={loadingTelemetry}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  background: '#F8FAFC',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                {loadingTelemetry ? 'Refreshing...' : 'Refresh Events'}
              </button>
            </div>

            {journeyEvents.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                No telemetry events captured yet. Navigate through CogniX to generate observable decision intent.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 450, overflowY: 'auto' }}>
                {journeyEvents.map((evt, idx) => (
                  <div
                    key={evt.event_id || idx}
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      padding: '10px 14px',
                      fontSize: '0.75rem',
                      fontFamily: 'monospace'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: 'var(--g10x-orange)' }}>
                        #{evt.sequence_number || idx + 1} {evt.event_type}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : ''}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span>ID: <strong>{evt.event_id}</strong></span>
                      <span>Session: <strong>{evt.session_id}</strong></span>
                      <span>Tenant: <strong>{evt.tenant_id}</strong></span>
                      <span>Persona: <strong>{evt.persona_id}</strong></span>
                      <span>Source: <strong>{evt.source}</strong></span>
                    </div>
                    {(evt.previous_state || evt.new_state || evt.metadata) && (
                      <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #E2E8F0', color: 'var(--text-muted)', fontSize: '0.6875rem' }}>
                        {evt.previous_state && <div>Prev: {JSON.stringify(evt.previous_state)}</div>}
                        {evt.new_state && <div>New: {JSON.stringify(evt.new_state)}</div>}
                        {evt.metadata && <div>Meta: {JSON.stringify(evt.metadata)}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Decision State Diagnostic Tab */}
        {activeTab === 'decision_state' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 20
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Authoritative Shared Decision State Context
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Active deterministic enterprise state versioning, cross-functional impacts, and provenance.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => refreshState()}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                  >
                    Refresh State
                  </button>
                  <button
                    onClick={() => resetScenario()}
                    className="btn btn-primary"
                    style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                  >
                    Reset to Baseline
                  </button>
                </div>
              </div>

              {decisionState ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Summary Bar */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 12,
                    background: 'var(--bg-surface)',
                    padding: 12,
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    fontSize: '0.8125rem'
                  }}>
                    <div>State ID: <strong style={{ color: 'var(--accent)' }}>{decisionState.decision_state_id}</strong></div>
                    <div>Version: <strong style={{ color: 'var(--g10x-orange)' }}>v{decisionState.state_version}</strong></div>
                    <div>Session: <strong>{decisionState.session_id}</strong></div>
                    <div>Tenant: <strong>{decisionState.tenant_id}</strong></div>
                    <div>Scenario: <strong>{decisionState.scenario_id}</strong></div>
                  </div>

                  {/* Scenario Parameters & Derived Impacts */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      padding: 14
                    }}>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                        Scenario Parameters
                      </h4>
                      <pre style={{ fontSize: '0.75rem', fontFamily: 'monospace', margin: 0, color: 'var(--text-secondary)' }}>
                        {JSON.stringify(decisionState.scenario_parameters, null, 2)}
                      </pre>
                    </div>

                    <div style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      padding: 14
                    }}>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                        Deterministic Derived Impacts
                      </h4>
                      <pre style={{ fontSize: '0.75rem', fontFamily: 'monospace', margin: 0, color: 'var(--text-secondary)' }}>
                        {JSON.stringify(decisionState.derived_impacts, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Selected Interventions & Version History */}
                  <div style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: 14
                  }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                      Version History ({decisionState.history?.length || 0} transitions)
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                      {decisionState.history?.map((h: any, idx: number) => (
                        <div key={idx} style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)', display: 'flex', gap: 12 }}>
                          <span>v{h.version}</span>
                          <span style={{ color: 'var(--accent)' }}>{h.command_type}</span>
                          <span style={{ color: 'var(--text-muted)' }}>[{h.changed_fields.join(', ')}]</span>
                          <span style={{ color: 'var(--text-muted)' }}>{new Date(h.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No active Decision State found.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
