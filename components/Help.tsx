'use client';
import React from 'react';
import {
  Layers, Smartphone, GitBranch, Sparkles, Database, ArrowDown, Zap
} from 'lucide-react';

export default function Help() {
  return (
    <div className="page-content">
      {/* Page Header */}
      <div className="mb-6">
        <h2>Help & Platform Architecture</h2>
        <p style={{ marginTop: 4 }}>
          Understand how the Decision Intelligence platform integrates Looker semantic metrics and Gemini AI reasoning into Lidl's operational applications.
        </p>
      </div>

      {/* AppSheet Architecture Vision */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>How Every Lidl AppSheet App Becomes AI-Enabled</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 6 }}>
            The Decision Intelligence platform bridges Lidl's existing AppSheet operational apps with Gemini AI reasoning through a governed Looker semantic layer — without rebuilding any existing systems.
          </p>
        </div>

        {/* Architecture Flow */}
        <div className="card mb-6">
          <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Layers size={18} color="var(--accent)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Platform Architecture</h3>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            {[
              { label: 'AppSheet App', sublabel: 'Store Ops, Category, Supply Chain', color: 'var(--accent)', Icon: Smartphone, bg: 'var(--accent-light)', border: 'var(--border-accent)' },
              { label: 'Decision Intelligence API', sublabel: 'Governed NLQ + Anomaly Detection Layer', color: 'var(--text-primary)', Icon: GitBranch, bg: 'var(--bg-elevated)', border: 'var(--border-strong)' },
              { label: 'Gemini AI Reasoning', sublabel: 'Multi-modal analysis, briefing generation, recommendations', color: '#8B5CF6', Icon: Sparkles, bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.25)' },
              { label: 'Looker Semantic Layer', sublabel: 'Governed metrics, RLS, single source of truth', color: '#06B6D4', Icon: Layers, bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.25)' },
              { label: 'BigQuery Data Warehouse', sublabel: 'Raw transactional, supply chain, and operational data', color: '#10B981', Icon: Database, bg: 'var(--success-light)', border: 'rgba(16,185,129,0.25)' },
            ].map(({ label, sublabel, color, Icon, bg, border }, i) => (
              <React.Fragment key={label}>
                <div
                  style={{
                    width: '100%',
                    maxWidth: 520,
                    background: bg,
                    border: `1px solid ${border}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${bg}`, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} color={color} strokeWidth={1.75} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{sublabel}</div>
                  </div>
                </div>
                {i < 4 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 0' }}>
                    <ArrowDown size={18} color="var(--text-muted)" strokeWidth={1.5} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Three AppSheet Use Cases */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[
            {
              title: 'Store Ops App',
              description: 'Store managers use AppSheet to log waste, request stock transfers, and report incidents. The Decision Intelligence layer now analyses these inputs in real-time, detects anomalies, and surfaces AI recommendations directly inside the store app.',
              example: 'Store Manager logs a waste event → DI API detects waste spike pattern → Gemini recommends markdown rule adjustment → Manager approves in-app → Looker semantic layer records resolution.',
              Icon: Smartphone,
              color: 'var(--accent)',
            },
            {
              title: 'Category Management App',
              description: 'Category Managers use AppSheet to manage range plans and promotion schedules. With Decision Intelligence, every promotion action is cross-referenced against supply chain data and Gemini forecasts potential uplift vs cannibalization.',
              example: 'Category Manager creates new promotion → DI API checks supply availability and historical sell-through → Gemini forecasts promo uplift (+22%) and cannibalization risk → Manager adjusts quantity and approves.',
              Icon: Layers,
              color: '#8B5CF6',
            },
            {
              title: 'Supply Chain App',
              description: 'DC teams use AppSheet to record deliveries, flag delays, and manage supplier SLAs. Decision Intelligence correlates delivery events with in-store stock data to predict downstream availability risk before it hits the shelf.',
              example: 'DC team logs FreshDirect delay → DI API correlates with 8 affected stores → Gemini predicts OOS risk of £23K → Procurement team receives alert and approves backup supplier activation via AppSheet write-back.',
              Icon: Zap,
              color: '#10B981',
            },
          ].map(({ title, description, example, Icon, color }) => (
            <div key={title} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `rgba(${color === 'var(--accent)' ? '0,120,255' : color === '#8B5CF6' ? '139,92,246' : '16,185,129'},0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color={color} strokeWidth={1.75} />
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{title}</div>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{description}</p>
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6, borderLeft: `2px solid ${color}` }}>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>Example Flow:</strong>
                {example}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
