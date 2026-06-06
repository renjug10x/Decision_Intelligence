import { Info } from 'lucide-react';

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
