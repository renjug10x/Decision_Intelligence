'use client';
import { useState } from 'react';
import {
  Trash2, AlertTriangle, TrendingDown, CheckCircle2,
  Loader2, Sparkles, ShieldAlert, Package, Store
} from 'lucide-react';
import { useApp } from '@/lib/context';
import ConfidenceScore from '@/components/ConfidenceScore';

const fmt = {
  currency: (v: number) => `£${v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v.toFixed(0)}`,
  pct:      (v: number) => `${(v * 100).toFixed(1)}%`,
};

// Simulated waste intelligence data
const WASTE_DRIVERS = [
  {
    id: 'WD001',
    driver: 'FreshDirect UK Delivery Delays',
    category: 'Produce',
    impact: 18600,
    wasteUnits: 4210,
    affectedStores: 8,
    wow: 0.24,
    confidence: 91,
    rootCause: 'Average 4.1-day delivery latency from FreshDirect UK is compressing shelf-life rotation, forcing pre-shelf spoilage of Broccoli, Baby Spinach, and Salad Leaf.',
    action: 'Activate Total Produce backup supply for 35% of Northern produce volume',
    actionLabel: 'Activate Backup Supplier',
    status: 'pending',
  },
  {
    id: 'WD002',
    driver: 'Markdown Threshold Too Conservative',
    category: 'Chilled',
    impact: 7200,
    wasteUnits: 1840,
    affectedStores: 5,
    wow: 0.11,
    confidence: 82,
    rootCause: 'Current 15% markdown threshold triggers too late — products expire before markdown is applied, resulting in full write-off rather than discounted sale.',
    action: 'Reduce markdown threshold to 30% for items within 24 hours of expiry',
    actionLabel: 'Adjust Markdown Rule',
    status: 'pending',
  },
  {
    id: 'WD003',
    driver: 'Over-Ordering on Promotional SKUs',
    category: 'Bakery',
    impact: 4100,
    wasteUnits: 920,
    affectedStores: 12,
    wow: 0.08,
    confidence: 76,
    rootCause: 'Promotional order uplift (24%) not adjusted for actual sell-through rate (18%), resulting in consistent Friday evening surplus in sourdough and seeded bloomer.',
    action: 'Reduce promotional order quantity by 12% and increase intra-day markdown triggers',
    actionLabel: 'Adjust Order Quantity',
    status: 'pending',
  },
  {
    id: 'WD004',
    driver: 'Dairy Shelf Rotation Gap',
    category: 'Dairy',
    impact: 2800,
    wasteUnits: 640,
    affectedStores: 7,
    wow: 0.04,
    confidence: 68,
    rootCause: 'Inconsistent FIFO rotation compliance in 7 stores resulting in older stock being pushed to back of shelf. Primarily affecting Cheddar (200g) and semi-skimmed milk.',
    action: 'Issue compliance alert to store managers and schedule rotation training',
    actionLabel: 'Issue Store Alert',
    status: 'pending',
  },
];

const TOP_WASTE_STORES = [
  { store: 'S001 Manchester Piccadilly', waste: 1240, wow: 0.18, category: 'Produce' },
  { store: 'S015 London Shoreditch', waste: 980, wow: 0.14, category: 'Chilled' },
  { store: 'S006 Leeds City Centre', waste: 820, wow: 0.22, category: 'Produce' },
  { store: 'S004 Liverpool Central', waste: 710, wow: 0.09, category: 'Bakery' },
  { store: 'S010 Birmingham Bullring', waste: 650, wow: 0.06, category: 'Dairy' },
];

const CATEGORY_WASTE = [
  { category: 'Produce', waste: 4210, impact: 18600, wow: 0.24 },
  { category: 'Chilled', waste: 1840, impact: 7200, wow: 0.11 },
  { category: 'Bakery', waste: 920, impact: 4100, wow: 0.08 },
  { category: 'Dairy', waste: 640, impact: 2800, wow: 0.04 },
];

export default function WasteIntelligence() {
  const { role, selectedStore } = useApp();
  const [resolvedDrivers, setResolvedDrivers] = useState<Record<string, boolean>>({});
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [expandedDriver, setExpandedDriver] = useState<string | null>('WD001');

  const totalWasteImpact = WASTE_DRIVERS.reduce((a, d) => a + d.impact, 0);
  const totalWasteUnits = WASTE_DRIVERS.reduce((a, d) => a + d.wasteUnits, 0);

  const handleResolve = async (id: string) => {
    setResolvingId(id);
    await new Promise(r => setTimeout(r, 1200));
    setResolvedDrivers(prev => ({ ...prev, [id]: true }));
    setResolvingId(null);
    setExpandedDriver(null);
  };

  const scopeDrivers = role === 'store_manager'
    ? WASTE_DRIVERS.filter(d => d.category !== 'Bakery') // stores don't see national bakery ordering issues
    : WASTE_DRIVERS;

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2>Waste Intelligence</h2>
          <p style={{ marginTop: 4 }}>
            {role === 'store_manager'
              ? 'Store-level waste diagnostics and corrective actions'
              : 'National waste driver analysis, financial impact, and AI corrective actions'}
            {' '}· 4 Jun 2026
          </p>
        </div>
        <span className="badge badge-danger" style={{ fontSize: '0.8125rem', padding: '6px 12px' }}>
          {fmt.currency(totalWasteImpact)} total waste impact this week
        </span>
      </div>

      {/* KPI Summary Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Waste Impact', value: fmt.currency(totalWasteImpact), sub: '+14.8% WoW', danger: true, Icon: Trash2 },
          { label: 'Total Waste Units', value: totalWasteUnits.toLocaleString(), sub: 'Across all categories', danger: false, Icon: Package },
          { label: 'Stores Affected', value: '18', sub: 'Active waste drivers', danger: false, Icon: Store },
          { label: 'Active Drivers', value: `${scopeDrivers.filter(d => !resolvedDrivers[d.id]).length}`, sub: `${Object.keys(resolvedDrivers).length} resolved today`, danger: false, Icon: AlertTriangle },
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        {/* Left: Waste Drivers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: 4 }}>Waste Drivers — AI Root Cause Analysis</h3>
          {scopeDrivers.map(driver => {
            const resolved = resolvedDrivers[driver.id];
            const expanded = expandedDriver === driver.id;
            return (
              <div
                key={driver.id}
                className="card"
                style={{
                  background: resolved ? 'var(--success-light)' : 'var(--bg-card)',
                  borderColor: resolved ? 'rgba(16,185,129,0.25)' : 'var(--border)',
                  cursor: resolved ? 'default' : 'pointer',
                  transition: 'var(--transition)',
                }}
                onClick={() => !resolved && setExpandedDriver(expanded ? null : driver.id)}
              >
                {/* Row Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: resolved ? 'rgba(16,185,129,0.12)' : 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {resolved ? <CheckCircle2 size={16} color="var(--success)" /> : <Trash2 size={16} color="var(--danger)" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{driver.driver}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {driver.category} · {driver.affectedStores} stores · {driver.wasteUnits.toLocaleString()} units wasted
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: resolved ? 'var(--success)' : 'var(--danger)', textDecoration: resolved ? 'line-through' : 'none' }}>
                      {fmt.currency(driver.impact)}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      +{(driver.wow * 100).toFixed(0)}% WoW
                    </div>
                  </div>
                </div>

                {/* Expanded Detail */}
                {expanded && !resolved && (
                  <div
                    style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 14 }}
                    onClick={e => e.stopPropagation()}
                  >
                    <div>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                        AI Root Cause
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
                        {driver.rootCause}
                      </p>
                    </div>
                    <ConfidenceScore score={driver.confidence} reasons={['Cross-referenced POS and supply chain data', 'Validated against 14-day waste baseline']} />
                    <div>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                        AI Recommended Action
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.6, margin: '0 0 12px' }}>
                        {driver.action}
                      </p>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span className="badge badge-warning">Human Review Required</span>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleResolve(driver.id)}
                          disabled={resolvingId === driver.id}
                          style={{ gap: 6, marginLeft: 'auto' }}
                        >
                          {resolvingId === driver.id ? (
                            <><Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} />Executing…</>
                          ) : (
                            <><Sparkles size={12} />{driver.actionLabel}</>
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

        {/* Right: Store ranking + Category breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Top Stores by Waste */}
          {role !== 'store_manager' && (
            <div className="card">
              <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Store size={16} color="var(--accent)" />
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Top Stores — Waste Impact</h3>
                </div>
              </div>
              {TOP_WASTE_STORES.map((s, i) => (
                <div key={s.store} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < TOP_WASTE_STORES.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', width: 16, textAlign: 'center' }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{s.store}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{s.category}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--danger)' }}>{s.waste} units</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                      <TrendingDown size={11} color="var(--danger)" />
                      <span style={{ fontSize: '0.6875rem', color: 'var(--danger)' }}>+{(s.wow * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Category Waste Breakdown */}
          <div className="card">
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trash2 size={16} color="var(--warning)" />
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Category Breakdown</h3>
              </div>
            </div>
            {CATEGORY_WASTE.map(c => (
              <div key={c.category} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{c.category}</span>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--danger)' }}>{fmt.currency(c.impact)}</span>
                </div>
                <div style={{ height: 5, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{
                    height: '100%',
                    width: `${(c.impact / totalWasteImpact * 100).toFixed(0)}%`,
                    background: 'var(--danger)',
                    borderRadius: 3,
                    opacity: 0.7,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                  {c.waste.toLocaleString()} units · +{(c.wow * 100).toFixed(0)}% WoW
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
