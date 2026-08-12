'use client';

import React, { useState } from 'react';
import {
  Layers, Activity, BookOpen, Sparkles, Lock, CheckCircle2,
  Zap, Play, Check, Loader2, ArrowRight, ShieldAlert, Award
} from 'lucide-react';
import ArchitectureExplorer from '@/components/ArchitectureExplorer';

// Sample data for Resolution Pattern Library (Decision Memory V2)
interface PatternItem {
  id: string;
  trigger: string;
  category: string;
  cause: string;
  action: string;
  result: string;
  confidence: number;
  storesImpacted: number;
}

const INITIAL_PATTERNS: PatternItem[] = [
  {
    id: 'PAT001',
    trigger: 'Fresh Produce Waste Spike',
    category: 'Produce',
    cause: 'Promotion + Weather',
    action: 'Reduce Reorder Threshold by 8% and accelerate markdown to 24h',
    result: '14% Waste Reduction',
    confidence: 91,
    storesImpacted: 12
  },
  {
    id: 'PAT002',
    trigger: 'Chilled Ready Meal Stockout',
    category: 'Chilled',
    cause: 'High Weekend Demand',
    action: 'Rebalance 40 units from Trafford (S002) to Piccadilly (S001)',
    result: 'Saved £820 in lost sales',
    confidence: 94,
    storesImpacted: 5
  },
  {
    id: 'PAT003',
    trigger: 'Dairy Margin Compression',
    category: 'Dairy',
    cause: 'Promo Price Matching',
    action: 'Activate bakery-cheese bundle promotions in 8 stores',
    result: 'Dairy Margin recovered to 32.8%',
    confidence: 79,
    storesImpacted: 8
  },
  {
    id: 'PAT004',
    trigger: 'Store Staffing Shortage',
    category: 'Labour',
    cause: 'Local Football Event',
    action: 'Reallocate 2 ambient stockers to checkouts during peak hours',
    result: 'Customer queue times kept < 2.5 mins',
    confidence: 85,
    storesImpacted: 3
  }
];

export default function Help() {
  const [activeTab, setActiveTab] = useState<'storyboard' | 'lifecycle' | 'learning'>('storyboard');
  const [patterns, setPatterns] = useState<PatternItem[]>(INITIAL_PATTERNS);
  const [appliedPatterns, setAppliedPatterns] = useState<Record<string, boolean>>({});
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const handleApplyResolution = async (id: string) => {
    setApplyingId(id);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setAppliedPatterns((prev) => ({ ...prev, [id]: true }));
    setApplyingId(null);
  };

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2>Help & Platform Architecture</h2>
          <p style={{ marginTop: 4 }}>
            Explore the platform\'s inner mechanics, security layers, and organisational learning database.
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
            { id: 'learning', label: 'Resolution Pattern Library', Icon: BookOpen }
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
                  detail: 'Completes the operational feedback loop, logging actions back to BigQuery to feed the Resolution Library.'
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

        {/* TAB 3: Resolution Pattern Library (Decision Memory V2) */}
        {activeTab === 'learning' && (
          <div className="card animate-fade" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Resolution Pattern Library (Closed-Loop Learning)</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                CogniX Enterprise Innovation Lab platform acts as a learning organizational brain, logging historical incident outcomes and surfacing verified patterns for instant reuse.
              </p>
            </div>

            <div style={{ overflowX: 'auto', marginTop: 12 }}>
              <table className="table" style={{ width: '100%', minWidth: 700 }}>
                <thead>
                  <tr>
                    <th>Incident Trigger</th>
                    <th>Category</th>
                    <th>Identified Cause</th>
                    <th>Action Taken</th>
                    <th>Measurable Result</th>
                    <th>Confidence</th>
                    <th>Impact Scope</th>
                    <th style={{ textAlign: 'right' }}>Reuse Pattern</th>
                  </tr>
                </thead>
                <tbody>
                  {patterns.map((p) => {
                    const applied = appliedPatterns[p.id];
                    const isApplying = applyingId === p.id;
                    
                    return (
                      <tr key={p.id} style={{ opacity: applied ? 0.6 : 1, transition: 'opacity 0.25s ease' }}>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{p.trigger}</div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>ID: {p.id}</div>
                        </td>
                        <td>
                          <span className="badge badge-yellow" style={{ fontSize: '0.6875rem', padding: '2px 6px' }}>{p.category}</span>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.cause}</td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-primary)', maxWidth: 220 }}>{p.action}</td>
                        <td style={{ fontSize: 0.75 + 'rem', fontWeight: 600, color: 'var(--success)' }}>{p.result}</td>
                        <td style={{ fontSize: '0.75rem', fontWeight: 700, color: p.confidence >= 90 ? 'var(--success)' : 'var(--warning)' }}>
                          {p.confidence}%
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.storesImpacted} stores</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className={`btn btn-sm ${applied ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={() => !applied && handleApplyResolution(p.id)}
                            disabled={applied || isApplying}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 140, justifyContent: 'center' }}
                          >
                            {isApplying ? (
                              <>
                                <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} />
                                Applying...
                              </>
                            ) : applied ? (
                              <>
                                <Check size={12} />
                                Resolution Active
                              </>
                            ) : (
                              <>
                                <Play size={10} fill="currentColor" />
                                Apply Pattern
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Simulated write-back popup notification */}
            {Object.keys(appliedPatterns).length > 0 && (
              <div
                className="card animate-fade"
                style={{
                  background: 'rgba(16, 185, 129, 0.04)',
                  border: '1px solid var(--border-success)',
                  padding: 12,
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: 10
                }}
              >
                <CheckCircle2 size={16} color="var(--success)" />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', flex: 1 }}>
                  <strong>Simulated Pattern Triggered Successfully:</strong> ERP threshold parameters updated for {Object.keys(appliedPatterns).length * 8} stores. Rules written to Looker semantic audit logs.
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setAppliedPatterns({})}
                  style={{ color: 'var(--text-muted)' }}
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
