'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { X, ChevronDown, ChevronRight, Scale, ShieldCheck, TrendingUp, AlertTriangle } from 'lucide-react';
import {
  ExperimentComparison,
  CampaignDecisionExperiment,
  formatContributionGbp,
  formatDemandPct,
  readinessVerdictLabel
} from '@/packages/contracts/src/campaign-experiment-model';
import {
  categoryLabel,
  segmentLabel,
  channelLabel
} from '@/packages/contracts/src/campaign-decision-taxonomy-model';

interface ExperimentComparisonModalProps {
  comparison: ExperimentComparison;
  onClose: () => void;
  onSelectExperiment?: (experimentId: string) => void;
}

/**
 * Comparison of 2–4 preserved decisions.
 *
 * The order is deliberate: what each option is, then only what differs between them, then
 * the assessment, then one action. The full dimension list is available but collapsed —
 * rendering every dimension of four experiments at once produces a spreadsheet, and a
 * spreadsheet is what an analyst opens this modal to avoid.
 */
export function ExperimentComparisonModal({
  comparison,
  onClose,
  onSelectExperiment
}: ExperimentComparisonModalProps) {
  const { experiments, dimensions, synthesis } = comparison;
  const [showAllDimensions, setShowAllDimensions] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const focal = dimensions.filter(d => d.is_focal_difference);
  const count = experiments.length;
  const columns = count <= 2 ? 2 : count === 3 ? 3 : 4;
  /** Column order is the compared-experiment order, so a value row reads under its own id. */
  const experimentIds = experiments.map(e => e.experiment_id);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Comparing ${count} preserved decisions`}
        style={{
          background: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid var(--border)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          width: '100%',
          maxWidth: count >= 3 ? 1040 : 880,
          maxHeight: '92vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={eyebrowStyle}>Decision Comparison</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {count} preserved decisions
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              {synthesis.headline}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close comparison"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 4,
              borderRadius: 6
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 1. Comparison overview — what each option is */}
        <section style={{ padding: '18px 24px 4px' }}>
          <h3 style={sectionHeadingStyle}>Comparison overview</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gap: 10
            }}
          >
            {experiments.map(exp => (
              <ExperimentSummaryCard
                key={exp.experiment_id}
                experiment={exp}
                isCommercialLeader={synthesis.stronger_experiment_id === exp.experiment_id}
                isLowestRisk={synthesis.lowest_execution_risk_experiment_id === exp.experiment_id}
                onSelect={onSelectExperiment}
              />
            ))}
          </div>
        </section>

        {/* 2. Key differences — only what actually differs */}
        <section style={{ padding: '18px 24px 4px' }}>
          <h3 style={sectionHeadingStyle}>Key differences</h3>
          {focal.length === 0 ? (
            <p style={mutedParagraphStyle}>
              No material decision differences detected across these configurations.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              <DimensionColumnHeader experimentIds={experimentIds} columns={columns} />
              {focal.map(dim => (
                <DimensionRow key={dim.dimension} dimension={dim} columns={columns} />
              ))}
            </div>
          )}
        </section>

        {/* Progressive disclosure — the full dimension list stays available, not primary */}
        <section style={{ padding: '10px 24px 4px' }}>
          <button
            type="button"
            onClick={() => setShowAllDimensions(v => !v)}
            aria-expanded={showAllDimensions}
            style={discloseButtonStyle}
          >
            {showAllDimensions ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            All compared dimensions ({dimensions.length})
          </button>
          {showAllDimensions && (
            <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
              <DimensionColumnHeader experimentIds={experimentIds} columns={columns} />
              {dimensions
                .filter(d => !d.is_focal_difference)
                .map(dim => (
                  <DimensionRow key={dim.dimension} dimension={dim} columns={columns} muted />
                ))}
            </div>
          )}
        </section>

        {/* 3. CogniX assessment */}
        <section style={{ padding: '18px 24px 4px' }}>
          <h3 style={sectionHeadingStyle}>CogniX assessment</h3>
          <div
            style={{
              padding: '16px 18px',
              borderRadius: 10,
              background: 'var(--curiosity-light)',
              border: '1px solid #FED7AA',
              display: 'grid',
              gap: 12
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <AssessmentSlot
                icon={<TrendingUp size={13} />}
                label="Strongest commercial option"
                value={synthesis.stronger_experiment_id}
                fallback="No single winner on the preserved evidence"
              />
              <AssessmentSlot
                icon={<ShieldCheck size={13} />}
                label="Lowest execution risk"
                value={synthesis.lowest_execution_risk_experiment_id}
                fallback="Readiness does not separate these options"
              />
            </div>

            <div style={{ borderTop: '1px dashed #FDBA74', paddingTop: 10 }}>
              <div style={subLabelStyle}>Why</div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {synthesis.why_it_matters}
              </p>
            </div>

            {(synthesis.trade_offs?.length ?? 0) > 0 && (
              <div style={{ borderTop: '1px dashed #FDBA74', paddingTop: 10 }}>
                <div style={subLabelStyle}>Trade-offs</div>
                <ul style={listStyle}>
                  {synthesis.trade_offs!.map((t, i) => (
                    <li key={i} style={listItemStyle}>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(synthesis.watch_items?.length ?? 0) > 0 && (
              <div style={{ borderTop: '1px dashed #FDBA74', paddingTop: 10 }}>
                <div style={{ ...subLabelStyle, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <AlertTriangle size={12} /> Watch
                </div>
                <ul style={listStyle}>
                  {synthesis.watch_items!.map((w, i) => (
                    <li key={i} style={listItemStyle}>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {synthesis.next_move && (
              <div style={{ borderTop: '1px dashed #FDBA74', paddingTop: 10 }}>
                <div style={subLabelStyle}>Next move</div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    lineHeight: 1.5
                  }}
                >
                  {synthesis.next_move}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* What changed — supporting narrative, below the assessment */}
        <section style={{ padding: '14px 24px 20px' }}>
          <h3 style={sectionHeadingStyle}>What changed</h3>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            {synthesis.what_changed}
          </p>
        </section>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            background: '#F8FAFC',
            borderRadius: '0 0 14px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Comparing preserved decisions. No active session state has been modified.
          </div>
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>
            Close comparison
          </button>
        </div>
      </div>
    </div>
  );
}

function ExperimentSummaryCard({
  experiment,
  isCommercialLeader,
  isLowestRisk,
  onSelect
}: {
  experiment: CampaignDecisionExperiment;
  isCommercialLeader: boolean;
  isLowestRisk: boolean;
  onSelect?: (experimentId: string) => void;
}) {
  const contribution = experiment.contribution_impact_gbp;
  return (
    <div
      style={{
        border: isCommercialLeader ? '1.5px solid var(--g10x-orange)' : '1px solid var(--border)',
        background: isCommercialLeader ? '#FFFAF5' : '#FFFFFF',
        borderRadius: 10,
        padding: '12px 13px',
        display: 'grid',
        gap: 7,
        minWidth: 0
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {onSelect ? (
          <button
            type="button"
            onClick={() => onSelect(experiment.experiment_id)}
            title={`Review ${experiment.experiment_id}`}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.8125rem',
              color: 'var(--text-primary)',
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
              textUnderlineOffset: 3
            }}
          >
            {experiment.experiment_id}
          </button>
        ) : (
          <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
            {experiment.experiment_id}
          </span>
        )}
      </div>

      {(isCommercialLeader || isLowestRisk) && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {isCommercialLeader && <span style={leaderBadgeStyle}>Best commercial</span>}
          {isLowestRisk && <span style={riskBadgeStyle}>Lowest risk</span>}
        </div>
      )}

      <div style={{ display: 'grid', gap: 2, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
        <span style={truncateStyle}>{categoryLabel(experiment.category)} · {experiment.region}</span>
        <span style={truncateStyle}>{segmentLabel(experiment.audience_segment)}</span>
        <span style={truncateStyle}>{channelLabel(experiment.sales_channel)}</span>
      </div>

      <div style={{ display: 'grid', gap: 3, borderTop: '1px solid var(--border)', paddingTop: 7 }}>
        <MetricLine label="Demand" value={formatDemandPct(experiment.incremental_demand_pct)} />
        <MetricLine
          label="Contribution"
          value={formatContributionGbp(contribution)}
          // A preserved loss must never render in the colour of a gain.
          color={contribution < 0 ? '#DC2626' : contribution > 0 ? '#059669' : 'var(--text-secondary)'}
        />
        <MetricLine label="Readiness" value={readinessVerdictLabel(experiment.readiness_status)} />
      </div>
    </div>
  );
}

function MetricLine({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: '0.75rem' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 650, color: color || 'var(--text-primary)', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function DimensionColumnHeader({
  experimentIds,
  columns
}: {
  experimentIds: string[];
  columns: number;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `minmax(120px, 0.9fr) repeat(${columns}, minmax(0, 1fr))`,
        gap: 8,
        padding: '0 10px 4px',
        fontSize: '0.6875rem',
        fontWeight: 650,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        color: 'var(--text-muted)'
      }}
    >
      <div>Dimension</div>
      {experimentIds.map(id => (
        <div key={id} style={{ minWidth: 0 }}>
          {id}
        </div>
      ))}
    </div>
  );
}

function DimensionRow({
  dimension,
  columns,
  muted
}: {
  dimension: { dimension: string; values: string[]; difference_summary?: string };
  columns: number;
  muted?: boolean;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `minmax(120px, 0.9fr) repeat(${columns}, minmax(0, 1fr))`,
        gap: 8,
        padding: '8px 10px',
        borderRadius: 8,
        background: muted ? '#FFFFFF' : 'rgba(254, 243, 199, 0.25)',
        border: '1px solid var(--border)',
        alignItems: 'start',
        fontSize: '0.75rem'
      }}
    >
      <div style={{ fontWeight: 600, color: 'var(--text-secondary)', minWidth: 0 }}>
        {dimension.dimension}
        {dimension.difference_summary && (
          <div style={{ fontSize: '0.6875rem', color: 'var(--g10x-orange)', fontWeight: 550 }}>
            {dimension.difference_summary}
          </div>
        )}
      </div>
      {dimension.values.map((value, i) => (
        <div
          key={i}
          style={{
            color: muted ? 'var(--text-muted)' : 'var(--text-primary)',
            fontWeight: muted ? 400 : 600,
            minWidth: 0,
            overflowWrap: 'anywhere'
          }}
        >
          {value}
        </div>
      ))}
    </div>
  );
}

function AssessmentSlot({
  icon,
  label,
  value,
  fallback
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  fallback: string;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...subLabelStyle, display: 'flex', alignItems: 'center', gap: 5 }}>
        {icon}
        {label}
      </div>
      <div
        style={{
          fontSize: value ? '1rem' : '0.8125rem',
          fontWeight: value ? 700 : 500,
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          lineHeight: 1.35
        }}
      >
        {value || fallback}
      </div>
    </div>
  );
}

const eyebrowStyle: CSSProperties = {
  fontSize: '0.6875rem',
  fontWeight: 650,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--g10x-orange)',
  background: 'var(--curiosity-light)',
  padding: '3px 8px',
  borderRadius: 6
};

const sectionHeadingStyle: CSSProperties = {
  margin: '0 0 10px',
  fontSize: '0.6875rem',
  fontWeight: 650,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-muted)'
};

const subLabelStyle: CSSProperties = {
  fontSize: '0.6875rem',
  fontWeight: 650,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--g10x-orange)',
  marginBottom: 3
};

const listStyle: CSSProperties = {
  margin: 0,
  paddingLeft: 16,
  display: 'grid',
  gap: 4
};

const listItemStyle: CSSProperties = {
  fontSize: '0.8125rem',
  color: 'var(--text-primary)',
  lineHeight: 1.5
};

const mutedParagraphStyle: CSSProperties = {
  margin: 0,
  fontSize: '0.8125rem',
  color: 'var(--text-secondary)'
};

const truncateStyle: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
};

const discloseButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  background: 'transparent',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--text-secondary)'
};

const secondaryButtonStyle: CSSProperties = {
  padding: '8px 16px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: '#FFFFFF',
  color: 'var(--text-secondary)',
  fontSize: '0.8125rem',
  fontWeight: 600,
  cursor: 'pointer'
};

const leaderBadgeStyle: CSSProperties = {
  fontSize: '0.625rem',
  fontWeight: 650,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: '#059669',
  background: '#ECFDF5',
  border: '1px solid #A7F3D0',
  padding: '2px 6px',
  borderRadius: 4
};

const riskBadgeStyle: CSSProperties = {
  fontSize: '0.625rem',
  fontWeight: 650,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--g10x-orange)',
  background: 'var(--curiosity-light)',
  border: '1px solid #FED7AA',
  padding: '2px 6px',
  borderRadius: 4
};
