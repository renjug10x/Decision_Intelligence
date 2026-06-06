'use client';
import { useEffect, useState } from 'react';
import {
  Sparkles, Loader2, Truck, Building2, Clock, XCircle,
  AlertTriangle, AlertCircle, TrendingDown, DollarSign, Store,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '@/lib/context';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const fmt = {
  currency: (v: number) => `£${v >= 1000 ? (v/1000).toFixed(1)+'K' : v.toFixed(0)}`,
  pct:      (v: number) => `${(v*100).toFixed(1)}%`,
};

export default function SupplyChainRadar() {
  const { apiKey } = useApp();
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [aiRec, setAiRec]       = useState('');
  const [aiLoading, setAiLoad]  = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/data?type=supply')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const getAiRecommendation = async (alert: any) => {
    if (aiLoading) return;
    setSelected(alert.supplier_id);
    setAiLoad(true);
    setAiRec('');
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: `${alert.supplier_name} has a ${fmt.pct(alert.delay_rate)} delay rate with ${alert.affected_stores} stores affected and estimated impact of ${fmt.currency(alert.estimated_impact)}. What should we do?`,
        role: 'exec',
        apiKey,
        dataContext: { supply_alert: alert, all_alerts: data?.alerts },
      }),
    });
    const r = await res.json();
    setAiRec(r.answer + (r.recommendation ? `\n\nRecommended action: ${r.recommendation}` : ''));
    setAiLoad(false);
  };

  const alerts   = data?.alerts   || [];
  const timeline = data?.timeline || [];

  const timelineData = {
    labels: timeline.map((t: any) => t.date.slice(5)),
    datasets: [
      { label: 'On Time',   data: timeline.map((t: any) => t.on_time),   backgroundColor: 'rgba(16,185,129,0.7)',  borderRadius: 4, borderWidth: 0 },
      { label: 'Delayed',   data: timeline.map((t: any) => t.delayed),   backgroundColor: 'rgba(245,158,11,0.7)',  borderRadius: 4, borderWidth: 0 },
      { label: 'Cancelled', data: timeline.map((t: any) => t.cancelled), backgroundColor: 'rgba(239,68,68,0.7)',   borderRadius: 4, borderWidth: 0 },
    ],
  };

  const STAT_CARDS = [
    { label: 'Suppliers Monitored', Icon: Building2,    value: alerts.length + 2,    raw: false },
    { label: 'Delayed Deliveries',  Icon: Clock,        value: alerts.reduce((a: number, b: any) => a + b.delayed_count, 0), raw: false },
    { label: 'Stores Affected',     Icon: Store,        value: Math.max(...alerts.map((a: any) => a.affected_stores), 0), raw: false },
    { label: 'Est. Total Impact',   Icon: DollarSign,   value: `£${(alerts.reduce((a: number, b: any) => a + b.estimated_impact, 0) / 1000).toFixed(0)}K`, raw: true },
  ];

  return (
    <div className="page-content">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2>Supply Chain Radar</h2>
          <p style={{ marginTop: 4 }}>Delivery performance · Last 14 days · Click a supplier for AI recommendation</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertCircle size={11} strokeWidth={2} color="currentColor" />
            {alerts.filter((a: any) => a.delay_rate > 0.3).length} Critical
          </span>
          <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertTriangle size={11} strokeWidth={2} color="currentColor" />
            {alerts.filter((a: any) => a.delay_rate > 0.1 && a.delay_rate <= 0.3).length} At Risk
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 24 }}>
          <Loader2 size={16} strokeWidth={1.75} color="#0078FF" style={{ animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading supply chain data…</span>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="kpi-grid mb-6">
            {STAT_CARDS.map(({ label, Icon, value, raw }) => (
              <div key={label} className="kpi-card">
                <div className="kpi-icon" style={{ background: 'var(--warning-light)' }}>
                  <Icon size={17} strokeWidth={1.75} color="#F59E0B" />
                </div>
                <div className="kpi-label">{label}</div>
                <div className="kpi-value">{raw ? value : (value as number).toLocaleString()}</div>
              </div>
            ))}
          </div>

          {/* AI Recommendation */}
          {(aiLoading || aiRec) && (
            <div className="ai-response mb-6 animate-slide">
              <div className="ai-response-header">
                <div className="ai-orb">
                  <Sparkles size={12} strokeWidth={1.75} color="white" />
                </div>
                <div className="ai-label">
                  AI Supply Chain Recommendation · {selected}
                </div>
              </div>
              <div className="ai-response-body">
                {aiLoading ? (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Loader2 size={16} strokeWidth={1.75} color="#0078FF" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Generating recommendation…</span>
                  </div>
                ) : (
                  <div className="ai-answer" style={{ whiteSpace: 'pre-line' }}>{aiRec}</div>
                )}
              </div>
            </div>
          )}

          {/* Supplier alert rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {alerts.map((a: any) => {
              const isCritical = a.delay_rate > 0.3;
              const isSelected = selected === a.supplier_id;
              return (
                <div
                  key={a.supplier_id}
                  className="card"
                  onClick={() => getAiRecommendation(a)}
                  style={{
                    cursor: 'pointer',
                    borderColor: isSelected
                      ? 'var(--accent)'
                      : isCritical
                        ? 'rgba(239,68,68,0.28)'
                        : 'rgba(245,158,11,0.2)',
                    background: isSelected ? 'var(--accent-light)' : undefined,
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>

                    {/* Severity indicator */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: isCritical ? 'var(--danger-light)' : 'var(--warning-light)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Truck size={17} strokeWidth={1.75} color={isCritical ? '#EF4444' : '#F59E0B'} />
                    </div>

                    {/* Supplier name */}
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{a.supplier_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {a.supplier_id} · {a.affected_stores} stores affected
                      </div>
                    </div>

                    {/* Delay rate */}
                    <div style={{ textAlign: 'center', minWidth: 90 }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isCritical ? 'var(--danger)' : 'var(--warning)' }}>
                        {fmt.pct(a.delay_rate)}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Delay Rate
                      </div>
                    </div>

                    {/* Delayed count */}
                    <div style={{ textAlign: 'center', minWidth: 70 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Clock size={13} strokeWidth={1.75} color="#F59E0B" />
                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--warning)' }}>{a.delayed_count}</span>
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delayed</div>
                    </div>

                    {/* Cancelled count */}
                    <div style={{ textAlign: 'center', minWidth: 70 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <XCircle size={13} strokeWidth={1.75} color="#EF4444" />
                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--danger)' }}>{a.cancelled_count}</span>
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cancelled</div>
                    </div>

                    {/* Impact */}
                    <div style={{ textAlign: 'center', minWidth: 100 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <TrendingDown size={13} strokeWidth={1.75} color="#D1D5DB" />
                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{fmt.currency(a.estimated_impact)}</span>
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Est. Impact</div>
                    </div>

                    {/* CTA */}
                    <ChevronRight size={16} strokeWidth={1.75} color={isSelected ? '#0078FF' : '#4A5A7A'} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Delivery timeline chart */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Delivery Status Timeline — Last 14 Days</span>
            </div>
            <div className="chart-container" style={{ height: 220 }}>
              <Bar
                data={timelineData}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: {
                    legend: { display: true, labels: { color: '#8B9DC3', font: { size: 11 }, boxWidth: 12 } },
                    tooltip: { backgroundColor: '#1A2235', titleColor: '#F0F4FF', bodyColor: '#8B9DC3', borderColor: '#2A3550', borderWidth: 1 },
                  },
                  scales: {
                    x: { stacked: true, grid: { display: false }, ticks: { color: '#4A5A7A', font: { size: 10 } } },
                    y: { stacked: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4A5A7A', font: { size: 10 } } },
                  },
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
