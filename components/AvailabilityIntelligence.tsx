'use client';
import { useState } from 'react';
import {
  Package, AlertCircle, TrendingDown, CheckCircle2,
  Loader2, Sparkles, Store, Truck, BarChart3
} from 'lucide-react';
import { useApp } from '@/lib/context';
import ConfidenceScore, { DecisionMemory } from '@/components/ConfidenceScore';

const fmt = {
  currency: (v: number) => `£${v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v.toFixed(0)}`,
};

const STOCKOUT_EVENTS = [
  {
    id: 'AV001',
    sku: 'P012 Chilled Ready Meal — Chicken Tikka 450g',
    category: 'Chilled',
    lostRevenue: 12400,
    affectedStores: 5,
    rootCause: 'Greencore Ready Meals delivery failure on Friday/Saturday (45% delay rate). Evening OOS window ran 4.5 hours without replenishment.',
    rootCauseType: 'supply',
    replenishment: 'Activate emergency stock transfer from Trafford DC. Adjust order lead time to 48h buffer for Friday deliveries.',
    actionLabel: 'Request DC Transfer',
    confidence: 94,
    skus: 3,
    durationHours: 4.5,
    peakImpact: 'Friday 18:00–22:30',
  },
  {
    id: 'AV002',
    sku: 'P020 Broccoli Head (Loose)',
    category: 'Produce',
    lostRevenue: 8200,
    affectedStores: 8,
    rootCause: 'FreshDirect UK delivery failures (42% delay rate) caused a 3.2-day shelf life compression. Stock arrived already past optimal display window.',
    rootCauseType: 'supply',
    replenishment: 'Redirect 40% of FreshDirect produce volume to Total Produce. Reduce ordering cycle from weekly to twice-weekly for high-velocity SKUs.',
    actionLabel: 'Reroute to Total Produce',
    confidence: 89,
    skus: 7,
    durationHours: 9.0,
    peakImpact: 'Thursday–Saturday',
  },
  {
    id: 'AV003',
    sku: 'P041 Cheddar Mature 400g',
    category: 'Dairy',
    lostRevenue: 4600,
    affectedStores: 4,
    rootCause: 'Reorder threshold set at 12 units is too high relative to shelf capacity (8 units max). Over-sensitive replenishment trigger causing order omissions.',
    rootCauseType: 'threshold',
    replenishment: 'Lower reorder threshold from 12 to 6 units. Increase safety stock level from 0 to 2 units minimum.',
    actionLabel: 'Adjust Reorder Rule',
    confidence: 77,
    skus: 2,
    durationHours: 6.0,
    peakImpact: 'Weekend afternoons',
  },
  {
    id: 'AV004',
    sku: 'P067 Sourdough Loaf 800g',
    category: 'Bakery',
    lostRevenue: 2900,
    affectedStores: 11,
    rootCause: 'Promotional uplift (24%) exceeded forecast demand model estimate (18%). Stores ran out of promoted SKUs by 14:00 on promotion days.',
    rootCauseType: 'demand',
    replenishment: 'Increase promotional order quantity by 15% for top-10 stores. Add intra-day replenishment trigger at 60% stock depletion.',
    actionLabel: 'Increase Promo Order',
    confidence: 71,
    skus: 1,
    durationHours: 5.5,
    peakImpact: 'Promotion days 12:00–18:00',
  },
];

const AFFECTED_STORES = [
  { store: 'S001 Manchester Piccadilly', events: 3, lostRevenue: 6400, severity: 'high' },
  { store: 'S015 London Shoreditch', events: 4, lostRevenue: 5900, severity: 'high' },
  { store: 'S006 Leeds City Centre', events: 2, lostRevenue: 4100, severity: 'medium' },
  { store: 'S004 Liverpool Central', events: 2, lostRevenue: 3800, severity: 'medium' },
  { store: 'S010 Birmingham Bullring', events: 2, lostRevenue: 3200, severity: 'medium' },
];

const ROOT_CAUSE_COLORS: Record<string, string> = {
  supply: 'var(--danger)',
  threshold: 'var(--warning)',
  demand: 'var(--accent)',
};

export default function AvailabilityIntelligence() {
  const { role } = useApp();
  const [resolvedEvents, setResolvedEvents] = useState<Record<string, boolean>>({});
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>('AV001');

  const totalLostRevenue = STOCKOUT_EVENTS.reduce((a, e) => a + e.lostRevenue, 0);
  const totalEvents = STOCKOUT_EVENTS.reduce((a, e) => a + e.skus, 0);
  const totalStores = AFFECTED_STORES.length;

  const handleResolve = async (id: string) => {
    setResolvingId(id);
    await new Promise(r => setTimeout(r, 1200));
    setResolvedEvents(prev => ({ ...prev, [id]: true }));
    setResolvingId(null);
    setExpandedEvent(null);
  };

  const scopeEvents = role === 'store_manager'
    ? STOCKOUT_EVENTS.filter(e => e.id !== 'AV004') // store managers don't see national bakery events
    : STOCKOUT_EVENTS;

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2>Availability Intelligence</h2>
          <p style={{ marginTop: 4 }}>
            {role === 'store_manager'
              ? 'Store-level stockout events, lost revenue, and replenishment actions'
              : 'National stockout analysis, lost revenue estimation, and AI replenishment recommendations'}
            {' '}· 4 Jun 2026
          </p>
        </div>
        <span className="badge badge-danger" style={{ fontSize: '0.8125rem', padding: '6px 12px' }}>
          {fmt.currency(totalLostRevenue)} estimated lost revenue
        </span>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Lost Revenue', value: fmt.currency(totalLostRevenue), sub: 'Estimated from OOS events', danger: true, Icon: TrendingDown },
          { label: 'OOS SKUs', value: totalEvents.toString(), sub: 'Active stockout events', danger: false, Icon: Package },
          { label: 'Stores Affected', value: totalStores.toString(), sub: 'Reporting OOS events', danger: false, Icon: Store },
          { label: 'Avg OOS Duration', value: '6.3h', sub: 'Per event this week', danger: false, Icon: AlertCircle },
        ].map(({ label, value, sub, danger, Icon }) => (
          <div key={label} className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: danger ? 'var(--danger-light)' : 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={14} strokeWidth={1.75} color={danger ? 'var(--danger)' : 'var(--text-muted)'} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
            </div>
            <div style={{ fontSize: '1.375rem', fontWeight: 700, color: danger ? 'var(--danger)' : 'var(--text-primary)' }}>{value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        {/* Left: OOS Events */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: 4 }}>Stockout Events — AI Root Cause & Replenishment</h3>
          {scopeEvents.map(event => {
            const resolved = resolvedEvents[event.id];
            const expanded = expandedEvent === event.id;
            const causeColor = ROOT_CAUSE_COLORS[event.rootCauseType] || 'var(--text-muted)';
            return (
              <div
                key={event.id}
                className="card"
                style={{
                  background: resolved ? 'var(--success-light)' : 'var(--bg-card)',
                  borderColor: resolved ? 'rgba(16,185,129,0.25)' : 'var(--border)',
                  cursor: resolved ? 'default' : 'pointer',
                  transition: 'var(--transition)',
                }}
                onClick={() => !resolved && setExpandedEvent(expanded ? null : event.id)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: resolved ? 'rgba(16,185,129,0.12)' : 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    {resolved ? <CheckCircle2 size={16} color="var(--success)" /> : <Package size={16} color="var(--danger)" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 4 }}>{event.sku}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: '0.6875rem' }}>{event.category}</span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{event.affectedStores} stores · {event.durationHours}h avg OOS</span>
                      <span style={{ fontSize: '0.6875rem', color: causeColor, fontWeight: 600 }}>
                        {event.rootCauseType === 'supply' ? '⚠ Supply Failure' : event.rootCauseType === 'threshold' ? '⚙ Threshold Issue' : '📈 Demand Spike'}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: resolved ? 'var(--success)' : 'var(--danger)', textDecoration: resolved ? 'line-through' : 'none' }}>
                      {fmt.currency(event.lostRevenue)}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>lost revenue</div>
                  </div>
                </div>

                {expanded && !resolved && (
                  <div
                    style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 14 }}
                    onClick={e => e.stopPropagation()}
                  >
                    <div>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: causeColor, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                        AI Root Cause
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.6, margin: '0 0 8px' }}>
                        {event.rootCause}
                      </p>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Peak impact window: <strong style={{ color: 'var(--text-primary)' }}>{event.peakImpact}</strong>
                      </div>
                    </div>
                    <ConfidenceScore score={event.confidence} reasons={['Cross-referenced POS, EPOS, and supply chain data', 'Validated against historical OOS patterns']} />
                    <DecisionMemory anomalyId={event.id} />
                    <div>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                        AI Replenishment Recommendation
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.6, margin: '0 0 12px' }}>
                        {event.replenishment}
                      </p>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span className="badge badge-warning">Human Review Required</span>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleResolve(event.id)}
                          disabled={resolvingId === event.id}
                          style={{ gap: 6, marginLeft: 'auto' }}
                        >
                          {resolvingId === event.id ? (
                            <><Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} />Executing…</>
                          ) : (
                            <><Sparkles size={12} />{event.actionLabel}</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Affected Stores */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {role !== 'store_manager' && (
            <div className="card">
              <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Store size={16} color="var(--accent)" />
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Top Affected Stores</h3>
                </div>
              </div>
              {AFFECTED_STORES.map((s, i) => (
                <div key={s.store} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < AFFECTED_STORES.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', width: 16, textAlign: 'center' }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{s.store}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{s.events} OOS events</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: s.severity === 'high' ? 'var(--danger)' : 'var(--warning)' }}>
                      {fmt.currency(s.lostRevenue)}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>lost</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Root Cause Breakdown */}
          <div className="card">
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={16} color="var(--accent)" />
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Root Cause Breakdown</h3>
              </div>
            </div>
            {[
              { type: 'Supply Chain Failure', pct: 62, color: 'var(--danger)' },
              { type: 'Ordering Threshold Issue', pct: 22, color: 'var(--warning)' },
              { type: 'Demand Forecasting Gap', pct: 16, color: 'var(--accent)' },
            ].map(({ type, pct, color }) => (
              <div key={type} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{type}</span>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color }}>{pct}%</span>
                </div>
                <div style={{ height: 5, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, opacity: 0.8, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Supply Chain Link */}
          <div className="card" style={{ background: 'var(--accent-light)', borderColor: 'var(--border-accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Truck size={16} color="var(--accent)" />
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Supply Chain Link</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              62% of availability events this week are directly linked to FreshDirect UK and Greencore Ready Meals supply failures.
            </p>
            <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>
              → View in Supply Chain Radar
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
