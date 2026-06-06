'use client';
import { useEffect, useState, useRef } from 'react';
import { Send, Sparkles, Loader2, CheckCircle2, TrendingUp, TrendingDown, Package, Percent, Trash2, Truck, History, ChevronDown } from 'lucide-react';
import { useApp } from '@/lib/context';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler } from 'chart.js';
import { GUIDED_PROMPTS } from '@/lib/semantic-layer';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler);

const STORES = [
  'S001:Manchester Piccadilly','S002:Manchester Trafford','S003:Manchester Ancoats',
  'S004:Liverpool Central','S005:Liverpool Wavertree','S006:Leeds City Centre',
  'S007:Leeds Headingley','S008:Sheffield Hillsborough','S009:Sheffield City',
  'S010:Birmingham Bullring','S015:London Shoreditch','S017:London Stratford',
  'S019:London Croydon','S031:Edinburgh Princes','S033:Glasgow Sauchiehall',
  'S036:Cardiff Bay','S039:Newcastle Eldon',
].map(s => ({ id: s.split(':')[0], name: s.split(':')[1] }));

const CHART_OPTS: any = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1A2235', titleColor: '#F0F4FF', bodyColor: '#8B9DC3', borderColor: '#2A3550', borderWidth: 1 } },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4A5A7A', font: { size: 10 } } },
    y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4A5A7A', font: { size: 10 } } },
  },
};

const fmt = {
  currency: (v: number) => `£${v >= 1000 ? (v/1000).toFixed(1)+'K' : v.toFixed(0)}`,
  pct:      (v: number) => `${(v*100).toFixed(1)}%`,
};

const KPI_STORE_CONFIG = [
  { key: 'revenue',    label: 'Revenue (7 days)', Icon: TrendingUp,  format: 'currency', invertPositive: false },
  { key: 'units',      label: 'Units Sold',        Icon: Package,     format: 'int',      invertPositive: false },
  { key: 'margin_pct', label: 'Margin %',          Icon: Percent,     format: 'pct',      invertPositive: false },
  { key: 'waste_units',label: 'Waste Units',       Icon: Trash2,      format: 'int',      invertPositive: true  },
];

export default function StoreCopilot() {
  const { role, apiKey, selectedStore, setSelectedStore } = useApp();
  const [question, setQuestion]     = useState('');
  const [storeData, setStoreData]   = useState<any>(null);
  const [aiResponse, setAiResponse] = useState<any>(null);
  const [loading, setLoading]       = useState(false);
  const [loadingStore, setLdStore]  = useState(true);
  const [history, setHistory]       = useState<Array<{ q: string; a: any }>>([]);
  const [displayText, setDisplayText] = useState('');
  const [typing, setTyping]           = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLdStore(true);
    fetch(`/api/data?type=store&store=${selectedStore}`)
      .then(r => r.json())
      .then(d => { setStoreData(d); setLdStore(false); })
      .catch(() => setLdStore(false));
    setAiResponse(null);
    setDisplayText('');
    setHistory([]);
  }, [selectedStore]);

  const typewriterEffect = (text: string) => {
    setTyping(true);
    setDisplayText('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) setDisplayText(text.slice(0, ++i));
      else { clearInterval(interval); setTyping(false); }
    }, 12);
  };

  const askQuestion = async (q: string) => {
    if (!q.trim() || loading) return;
    setLoading(true);
    setAiResponse(null);
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, role, storeId: selectedStore, apiKey }),
    });
    const data = await res.json();
    setAiResponse(data);
    setHistory(h => [{ q, a: data }, ...h].slice(0, 5));
    setLoading(false);
    typewriterEffect(data.answer || '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    askQuestion(question);
    setQuestion('');
  };

  const prompts = GUIDED_PROMPTS[role] || GUIDED_PROMPTS.store_manager;
  const store   = STORES.find(s => s.id === selectedStore);

  const trendData = storeData?.trend ? {
    labels: storeData.trend.map((t: any) => t.date.slice(5)),
    datasets: [{
      data: storeData.trend.map((t: any) => t.revenue),
      borderColor: '#0078FF', backgroundColor: 'rgba(0,120,255,0.08)',
      fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#0078FF',
    }],
  } : null;

  const catData = storeData?.categories ? {
    labels: storeData.categories.slice(0, 6).map((c: any) => c.category),
    datasets: [{
      data: storeData.categories.slice(0, 6).map((c: any) => c.revenue),
      backgroundColor: 'rgba(0,120,255,0.65)',
      hoverBackgroundColor: '#0078FF',
      borderRadius: 6, borderWidth: 0,
    }],
  } : null;

  const CONFIDENCE_COLOR: Record<string, string> = {
    high: 'badge-success', medium: 'badge-warning', low: 'badge-danger',
  };

  return (
    <div className="page-content">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2>Store Ops Copilot</h2>
          <p style={{ marginTop: 4 }}>Ask any question about your store — get AI-powered answers</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <select
            className="select"
            value={selectedStore}
            onChange={e => setSelectedStore(e.target.value)}
            disabled={role === 'store_manager'}
            style={{ width: 220, opacity: role === 'store_manager' ? 0.75 : 1 }}
          >
            {STORES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {role === 'store_manager' && (
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              Locked to assigned store (IAM restriction)
            </span>
          )}
        </div>
      </div>

      {/* NLQ Bar */}
      <div className="nlq-container">
        <form onSubmit={handleSubmit}>
          <div className="nlq-bar">
            <div className="ai-orb" style={{ width: 32, height: 32, flexShrink: 0 }}>
              <Sparkles size={13} strokeWidth={1.75} color="white" />
            </div>
            <input
              ref={inputRef}
              type="text"
              placeholder={`Ask about ${store?.name || 'your store'}…`}
              value={question}
              onChange={e => setQuestion(e.target.value)}
            />
            <button type="submit" className="nlq-send" disabled={loading || !question.trim()}>
              {loading
                ? <Loader2 size={16} strokeWidth={1.75} color="white" style={{ animation: 'spin 0.8s linear infinite' }} />
                : <Send size={15} strokeWidth={1.75} color="white" />
              }
            </button>
          </div>
        </form>
        <div className="nlq-chips">
          {prompts.map((p: string, i: number) => (
            <button key={i} className="nlq-chip" onClick={() => { askQuestion(p); setQuestion(''); }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* AI Response */}
      {(loading || aiResponse) && (
        <div className="ai-response mb-6 animate-slide">
          <div className="ai-response-header">
            <div className="ai-orb">
              <Sparkles size={12} strokeWidth={1.75} color="white" />
            </div>
            <div>
              <div className="ai-label">Gemini · Decision Intelligence</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                via Looker semantic layer · {store?.name}
              </div>
            </div>
            {aiResponse?.confidence && (
              <span className={`badge ${CONFIDENCE_COLOR[aiResponse.confidence] || 'badge-accent'}`} style={{ marginLeft: 'auto' }}>
                {aiResponse.confidence} confidence
              </span>
            )}
          </div>
          <div className="ai-response-body">
            {loading ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0' }}>
                <Loader2 size={16} strokeWidth={1.75} color="#0078FF" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Querying Looker semantic layer…</span>
              </div>
            ) : (
              <>
                <div className={`ai-answer ${typing ? 'typewriter-cursor' : ''}`}>{displayText}</div>
                {aiResponse?.insight && (
                  <div className="ai-insight-box">
                    <div className="ai-insight-label">Key Insight</div>
                    <div className="ai-insight-text">{aiResponse.insight}</div>
                  </div>
                )}
                {aiResponse?.recommendation && (
                  <div className="ai-rec-box">
                    <CheckCircle2 size={15} strokeWidth={1.75} color="#10B981" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div className="ai-rec-text">
                      <strong>Recommended action: </strong>{aiResponse.recommendation}
                    </div>
                  </div>
                )}
                {aiResponse?.data_sources?.length > 0 && (
                  <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Data sources: {aiResponse.data_sources.join(' · ')}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Store KPIs */}
      {!loadingStore && storeData?.kpi && (
        <>
          <div className="kpi-grid mb-6">
            {KPI_STORE_CONFIG.map(({ key, label, Icon, format, invertPositive }) => {
              const m = storeData.kpi[key];
              if (!m) return null;
              const rawPos = m.wow >= 0;
              const positive = invertPositive ? !rawPos : rawPos;
              return (
                <div key={key} className="kpi-card">
                  <div className="kpi-icon" style={{ background: positive ? 'var(--success-light)' : 'var(--danger-light)' }}>
                    <Icon size={17} strokeWidth={1.75} color={positive ? '#10B981' : '#EF4444'} />
                  </div>
                  <div className="kpi-label">{label}</div>
                  <div className="kpi-value">
                    {format === 'currency' ? fmt.currency(m.value)
                      : format === 'pct'   ? fmt.pct(m.value)
                      : m.value?.toLocaleString()}
                  </div>
                  <div className={`kpi-change ${positive ? 'positive' : 'negative'}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {positive
                      ? <TrendingUp  size={12} strokeWidth={2} color="currentColor" />
                      : <TrendingDown size={12} strokeWidth={2} color="currentColor" />
                    }
                    {Math.abs(m.wow * 100).toFixed(1)}% vs prior week
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid-2">
            {trendData && (
              <div className="card">
                <div className="card-header"><span className="card-title">Revenue Trend — 7 Days</span></div>
                <div className="chart-container" style={{ height: 180 }}>
                  <Line data={trendData} options={CHART_OPTS} />
                </div>
              </div>
            )}
            {catData && (
              <div className="card">
                <div className="card-header"><span className="card-title">Revenue by Category</span></div>
                <div className="chart-container" style={{ height: 180 }}>
                  <Bar data={catData} options={CHART_OPTS} />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <History size={14} strokeWidth={1.75} color="#4A5A7A" />
              Recent Questions
            </span>
          </div>
          {history.map((h, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: i < history.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
                <ChevronDown size={13} strokeWidth={1.75} color="#4A5A7A" />
                {h.q}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {h.a?.answer?.slice(0, 120)}…
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
