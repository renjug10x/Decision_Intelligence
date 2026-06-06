'use client';
import React, { useState } from 'react';
import {
  Lock, Sliders, Bell, RefreshCw, Database,
  DollarSign, Cpu, ShieldAlert, Sparkles, Check, CheckCircle,
  Smartphone, ArrowDown, Layers, GitBranch, Zap
} from 'lucide-react';
import { useApp } from '@/lib/context';
import { ICON_PROPS, ICON_PROPS_SM, ICON_SUCCESS, ICON_MUTED } from '@/lib/icons';

const STORES = [
  { id: 'All', name: 'All Stores (Inherit Role)' },
  { id: 'S001', name: 'S001 - Manchester Piccadilly' },
  { id: 'S002', name: 'S002 - Manchester Trafford' },
  { id: 'S003', name: 'S003 - Manchester Ancoats' },
  { id: 'S004', name: 'S004 - Liverpool Central' },
  { id: 'S006', name: 'S006 - Leeds City Centre' },
  { id: 'S015', name: 'S015 - London Shoreditch' },
];

const CATEGORIES = [
  { id: 'All', name: 'All Categories (Inherit Role)' },
  { id: 'Chilled', name: 'Chilled Foods' },
  { id: 'Dairy', name: 'Dairy' },
  { id: 'Produce', name: 'Produce' },
  { id: 'Bakery', name: 'Bakery' },
  { id: 'BWS', name: 'Beer, Wine & Spirits' },
];

export default function Settings() {
  const {
    role,
    wowDeclineThreshold, setWowDeclineThreshold,
    wasteSpikeThreshold, setWasteSpikeThreshold,
    aiAutopilot, setAiAutopilot,
    aiConfidenceThreshold, setAiConfidenceThreshold,
    geminiTemperature, setGeminiTemperature,
    muteNotificationNoise, setMuteNotificationNoise,
    userAttributeStoreScope, setUserAttributeStoreScope,
    userAttributeCategoryScope, setUserAttributeCategoryScope,
    lookerMode, setLookerMode
  } = useApp();

  const [clearingCache, setClearingCache] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [costCap, setCostCap] = useState(0.20);
  const [modelType, setModelType] = useState<'flash' | 'pro'>('flash');

  const isAdmin = role === 'exec';

  const handleClearCache = async () => {
    setClearingCache(true);
    setCacheCleared(false);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setClearingCache(false);
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 3000);
  };

  return (
    <div className="page-content">
      {/* Page Header */}
      <div className="mb-6">
        <h2>Governance & AI Operations</h2>
        <p style={{ marginTop: 4 }}>Configure system anomalies, AI confidence layers, Looker row-level security, and AppSheet write-back hooks.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        
        {/* LEFT COLUMN: System Parameters & Thresholds */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Anomaly Detection Settings */}
          <div className="card">
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sliders size={18} color="var(--accent)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Anomaly Detection Thresholds</h3>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    WoW Sales Decline Trigger
                  </span>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--accent)' }}>
                    {wowDeclineThreshold}% decline
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="20"
                  value={wowDeclineThreshold}
                  onChange={(e) => setWowDeclineThreshold(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: 6,
                    borderRadius: 3,
                    background: 'var(--bg-elevated)',
                    accentColor: 'var(--accent)',
                    cursor: 'pointer'
                  }}
                />
                <p style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--text-muted)' }}>
                  Triggers alerts when regional or store weekly revenue declines past this threshold.
                </p>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Produce Spoilage Spike Trigger
                  </span>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--yellow)' }}>
                    +{wasteSpikeThreshold}% waste
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="25"
                  value={wasteSpikeThreshold}
                  onChange={(e) => setWasteSpikeThreshold(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: 6,
                    borderRadius: 3,
                    background: 'var(--bg-elevated)',
                    accentColor: 'var(--yellow)',
                    cursor: 'pointer'
                  }}
                />
                <p style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--text-muted)' }}>
                  Triggers waste spikes when fresh produce discard volume increases WoW.
                </p>
              </div>
            </div>
          </div>

          {/* AppSheet Write-Back Visual */}
          <div className="card">
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle size={18} color="var(--success)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>AppSheet Write-Back Integration</h3>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Simulate Google Workspace integration. Anomaly resolution actions trigger automated AppSheet workflows to update underlying operational systems without leaving the platform.
              </p>
              
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Active Webhooks</span>
                  <span className="badge badge-success">3 Connected</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <Check size={14} color="var(--success)" /> Supplier Penalty Enforcement (Ariba)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <Check size={14} color="var(--success)" /> Markdown Ticket Generation (Store Ops)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <Check size={14} color="var(--success)" /> Staff Reallocation Broadcast (Workday)
                </div>
              </div>
            </div>
          </div>

          {/* Looker API connection & cache settings */}
          <div className="card">
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Database size={18} color="var(--accent)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Data Store & Looker Layer</h3>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Looker Connection Mode</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Toggle between simulated POC and active client API endpoint.</div>
                </div>
                <button
                  onClick={() => setLookerMode(lookerMode === 'live' ? 'mock' : 'live')}
                  className={`btn ${lookerMode === 'live' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ height: 32, fontSize: '0.75rem', padding: '0 12px' }}
                >
                  {lookerMode === 'live' ? 'Live SDK' : 'Mock Simulator'}
                </button>
              </div>

              {lookerMode === 'live' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Looker Instance Host URL</label>
                    <input type="text" readOnly value="https://lidl.cloud.looker.com" className="select" style={{ width: '100%', height: 32, marginTop: 4, fontSize: '0.75rem', cursor: 'not-allowed', color: 'var(--text-muted)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Looker API Client ID</label>
                    <input type="text" readOnly value="client_id_looker_prod_4021" className="select" style={{ width: '100%', height: 32, marginTop: 4, fontSize: '0.75rem', cursor: 'not-allowed', color: 'var(--text-muted)' }} />
                  </div>
                </div>
              )}

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Cost-per-Query Cap
                  </span>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--success)' }}>
                    ${costCap.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.50"
                  step="0.05"
                  value={costCap}
                  onChange={(e) => setCostCap(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: 6,
                    borderRadius: 3,
                    background: 'var(--bg-elevated)',
                    accentColor: 'var(--success)',
                    cursor: 'pointer'
                  }}
                />
                <p style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--text-muted)' }}>
                  Enforces automated query compilation blocks to keep individual BigQuery scans below cost budget.
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Looker Query Cache</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Force clear system schema caches.</div>
                </div>
                <button
                  onClick={handleClearCache}
                  disabled={clearingCache}
                  className="btn btn-ghost"
                  style={{ height: 34, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8, borderColor: 'var(--border-strong)' }}
                >
                  <RefreshCw size={14} className={clearingCache ? 'animate-spin' : ''} />
                  {clearingCache ? 'Invalidating…' : cacheCleared ? 'Cache Cleared!' : 'Invalidate Cache'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AI & IAM Sandbox Governed Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* AI Reasoning & Autopilot (Exec only) */}
          <div style={{ position: 'relative' }}>
            <div className="card" style={{ opacity: isAdmin ? 1 : 0.25, pointerEvents: isAdmin ? 'auto' : 'none' }}>
              <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Cpu size={18} color="var(--accent)" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>AI Reasoning & Autopilot</h3>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Autopilot toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Autonomous Decisions (Autopilot)</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Allow AI Agent to auto-resolve anomalies matching confidence thresholds.</div>
                  </div>
                  <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
                    <input
                      type="checkbox"
                      checked={aiAutopilot}
                      onChange={(e) => setAiAutopilot(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: aiAutopilot ? 'var(--accent)' : 'var(--bg-elevated)',
                      borderRadius: 24,
                      transition: '0.3s'
                    }}>
                      <span style={{
                        position: 'absolute',
                        content: '""',
                        height: 18, width: 18,
                        left: aiAutopilot ? 22 : 3,
                        bottom: 3,
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        transition: '0.3s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                      }} />
                    </span>
                  </label>
                </div>

                {/* Min AI Confidence Slider */}
                <div style={{ opacity: aiAutopilot ? 1 : 0.4, transition: 'var(--transition)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Min Auto-Resolve Confidence
                    </span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--accent)' }}>
                      {aiConfidenceThreshold}% confidence
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="90"
                    step="5"
                    disabled={!aiAutopilot}
                    value={aiConfidenceThreshold}
                    onChange={(e) => setAiConfidenceThreshold(Number(e.target.value))}
                    style={{
                      width: '100%',
                      height: 6,
                      borderRadius: 3,
                      background: 'var(--bg-elevated)',
                      accentColor: 'var(--accent)',
                      cursor: aiAutopilot ? 'pointer' : 'not-allowed'
                    }}
                  />
                  <p style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--text-muted)' }}>
                    Anomalies scoring higher than this will automatically change status to resolved.
                  </p>
                </div>

                {/* AI Model tier selector */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Gemini Reasoning Engine</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Select analytical processing capability tier.</div>
                  </div>
                  <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: 3, border: '1px solid var(--border)' }}>
                    <button
                      onClick={() => setModelType('flash')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: modelType === 'flash' ? 'var(--bg-card)' : 'none',
                        border: 'none',
                        color: modelType === 'flash' ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Flash 1.5
                    </button>
                    <button
                      onClick={() => setModelType('pro')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: modelType === 'pro' ? 'var(--bg-card)' : 'none',
                        border: 'none',
                        color: modelType === 'pro' ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Pro 1.5
                    </button>
                  </div>
                </div>

                {/* Gemini Temperature */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Gemini Creativity Temperature
                    </span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {geminiTemperature.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.1"
                    value={geminiTemperature}
                    onChange={(e) => setGeminiTemperature(Number(e.target.value))}
                    style={{
                      width: '100%',
                      height: 6,
                      borderRadius: 3,
                      background: 'var(--bg-elevated)',
                      accentColor: 'var(--text-primary)',
                      cursor: 'pointer'
                    }}
                  />
                  <p style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--text-muted)' }}>
                    Controls variety in NLQ answer synthesis and briefing diagnostics.
                  </p>
                </div>
              </div>
            </div>

            {/* Lock Cover overlay for Store / Category managers */}
            {!isAdmin && (
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backdropFilter: 'blur(3px)',
                backgroundColor: 'rgba(10,14,26,0.5)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                padding: 24,
                border: '1px dashed var(--border-strong)',
                boxSizing: 'border-box'
              }}>
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: 20,
                  maxWidth: 320,
                  textAlign: 'center',
                  boxShadow: 'var(--shadow-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Lock size={18} color="var(--danger)" />
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Looker IAM Security Active</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Autonomous AI Autopilot and advanced model tuning parameters are restricted to Central Operations Admins.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Looker Governed RLS User Attribute Sandbox (Exec only) */}
          <div style={{ position: 'relative' }}>
            <div className="card" style={{ opacity: isAdmin ? 1 : 0.25, pointerEvents: isAdmin ? 'auto' : 'none' }}>
              <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ShieldAlert size={18} color="var(--accent)" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Looker RLS Attribute Sandbox</h3>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Simulate Row-Level Security (RLS) data access rules by overriding active user context attributes.
                </p>
                
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                    user_attributes.store_scope
                  </label>
                  <select
                    className="select"
                    value={userAttributeStoreScope}
                    onChange={(e) => setUserAttributeStoreScope(e.target.value)}
                    style={{ width: '100%', height: 38 }}
                  >
                    {STORES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <p style={{ fontSize: '0.72rem', marginTop: 4, color: 'var(--text-muted)' }}>
                    Forces query scopes to simulate a Store Manager's restricted visibility.
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                    user_attributes.category_scope
                  </label>
                  <select
                    className="select"
                    value={userAttributeCategoryScope}
                    onChange={(e) => setUserAttributeCategoryScope(e.target.value)}
                    style={{ width: '100%', height: 38 }}
                  >
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <p style={{ fontSize: '0.72rem', marginTop: 4, color: 'var(--text-muted)' }}>
                    Forces query scopes to simulate a Category Manager's restricted visibility.
                  </p>
                </div>
              </div>
            </div>

            {/* Lock Cover overlay for Store / Category managers */}
            {!isAdmin && (
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backdropFilter: 'blur(3px)',
                backgroundColor: 'rgba(10,14,26,0.5)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                padding: 24,
                border: '1px dashed var(--border-strong)',
                boxSizing: 'border-box'
              }}>
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: 20,
                  maxWidth: 320,
                  textAlign: 'center',
                  boxShadow: 'var(--shadow-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Lock size={18} color="var(--danger)" />
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Looker IAM Security Active</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Looker User Attribute Sandbox overrides are locked for your assigned role attributes scope.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notification Preferences (All Roles) */}
          <div className="card">
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Bell size={18} color="var(--accent)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Notification noise filtering</h3>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Filter Medium-Severity Noise</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Silence non-critical warnings and only alert on high severity issues.</div>
              </div>
              <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
                <input
                  type="checkbox"
                  checked={muteNotificationNoise}
                  onChange={(e) => setMuteNotificationNoise(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: muteNotificationNoise ? 'var(--accent)' : 'var(--bg-elevated)',
                  borderRadius: 24,
                  transition: '0.3s'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: 18, width: 18,
                    left: muteNotificationNoise ? 22 : 3,
                    bottom: 3,
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: '0.3s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                  }} />
                </span>
              </label>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
