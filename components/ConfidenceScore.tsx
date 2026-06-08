import { Info, BookOpen } from 'lucide-react';

interface ConfidenceScoreProps {
  score: number; // 0 to 100
  compact?: boolean;
  reasons?: string[];
}

export default function ConfidenceScore({ score, compact = false, reasons = [] }: ConfidenceScoreProps) {
  const getScoreColor = () => {
    if (score >= 85) return 'var(--success)';
    if (score >= 70) return 'var(--warning)';
    return 'var(--danger)';
  };
  
  const getScoreLabel = () => {
    if (score >= 85) return 'High Confidence';
    if (score >= 70) return 'Medium Confidence';
    return 'Low Confidence';
  };

  const color = getScoreColor();

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.6875rem', fontWeight: 600, color }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color }} />
        {score}% AI Confidence
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '12px', 
      borderRadius: 'var(--radius-md)', 
      background: 'rgba(255, 255, 255, 0.02)', 
      border: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
          {getScoreLabel()} ({score}%)
        </div>
        <Info size={14} color="var(--text-muted)" />
      </div>
      
      {reasons && reasons.length > 0 && (
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
          <ul style={{ margin: 0, paddingLeft: 14 }}>
            {reasons.map((r, i) => <li key={i} style={{ marginBottom: 2 }}>{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export function DecisionMemory({ anomalyId }: { anomalyId: string }) {
  const memoryMap: Record<string, { date: string; title: string; action: string; outcome: string }> = {
    A001: {
      date: 'April 2026',
      title: 'Piccadilly ready meal stockout',
      action: 'Rebalanced 40 units of chilled ready meals from S002 (Trafford).',
      outcome: 'Saved £820 in lost sales; rebalance completed via AppSheet.'
    },
    A002: {
      date: 'May 2026',
      title: 'Southern logistics delay',
      action: 'Rerouted 25% of fresh product orders to Total Produce.',
      outcome: 'Maintained 94% availability across 8 affected Southern stores.'
    },
    A003: {
      date: 'April 2026',
      title: 'Dairy margin compression',
      action: 'Activated bakery-cheese bundle promotions in 3 stores.',
      outcome: 'Recovered dairy margins back to 32.8% (plan: 33.5%).'
    },
    A004: {
      date: 'March 2026',
      title: 'Produce waste spike',
      action: 'Triggered automatic 30% markdown rate for salad bags early.',
      outcome: 'Waste reduced by 14% WoW, saving £1.2K in margins.'
    },
    A005: {
      date: 'May 2026',
      title: 'Store footfall spike (football event)',
      action: 'Reallocated 2 ambient stockers to checkout tills.',
      outcome: 'Maintained customer queue times below 2.5 minutes.'
    },
    WD001: {
      date: 'March 2026',
      title: 'Produce delivery delays from FreshDirect',
      action: 'Activated Total Produce backup supply for Piccadilly and Leeds stores.',
      outcome: 'Reduced fresh produce waste by 11% and protected £4.5K in weekly margins.'
    },
    WD002: {
      date: 'April 2026',
      title: 'Chilled ready meal markdown lag',
      action: 'Adjusted chilled ready meal markdown rule to trigger at 24 hours (30% discount).',
      outcome: 'Wastage units decreased by 18% WoW; increased discount sell-through rate by 34%.'
    },
    WD003: {
      date: 'May 2026',
      title: 'Bakery promo over-ordering surplus',
      action: 'Scaled back bakery order quantities by 10% on promotional Fridays.',
      outcome: 'Saved £900 in weekend bakery write-offs without affecting promotion revenue.'
    },
    WD004: {
      date: 'April 2026',
      title: 'Dairy FIFO rotation issue in Northern region',
      action: 'Issued store manager compliance alerts and scheduled assistant manager training.',
      outcome: 'Compliance rates rose to 95%; FIFO-related dairy write-offs fell by 40%.'
    },
    AV001: {
      date: 'April 2026',
      title: 'Chicken Tikka Ready Meal OOS',
      action: 'Requested emergency stock transfer from Trafford DC and adjusted lead buffer.',
      outcome: 'Restored availability in 3.5 hours; saved £650 in weekend lost sales.'
    },
    AV002: {
      date: 'March 2026',
      title: 'Fresh produce availability gap',
      action: 'Rerouted 40% of loose broccoli orders to Total Produce backup vendor.',
      outcome: 'Improved loose broccoli fill rate to 98% within 24 hours.'
    },
    AV003: {
      date: 'April 2026',
      title: 'Dairy mature cheddar reorder failure',
      action: 'Lowered reorder threshold rule in ERP from 12 to 6 units.',
      outcome: 'Eliminated shelf over-sensitivity issues; restored cheese category stock levels.'
    },
    AV004: {
      date: 'May 2026',
      title: 'Bakery sourdough promotional stockout',
      action: 'Increased sourdough promotion order quantity by 15% for Leeds and Manchester.',
      outcome: 'Availability maintained at 100% on Saturday; promotion sales grew by 18%.'
    }
  };

  const mem = memoryMap[anomalyId];
  if (!mem) return null;

  return (
    <div style={{
      marginTop: '12px',
      padding: '12px',
      borderRadius: 'var(--radius-md)',
      background: 'rgba(0, 120, 255, 0.02)',
      border: '1px dashed var(--border-accent)',
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>
        <BookOpen size={14} />
        Decision Memory & Learning Loop
      </div>
      <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
        <strong>Previous Similar Incident ({mem.date}):</strong> {mem.title}<br />
        <strong>Action:</strong> {mem.action}<br />
        <strong style={{ color: 'var(--success)' }}>Outcome:</strong> {mem.outcome}
      </div>
    </div>
  );
}

