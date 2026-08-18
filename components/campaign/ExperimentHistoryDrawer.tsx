'use client';

import { useEffect, useState, useMemo, type CSSProperties } from 'react';
import {
  X,
  History,
  Scale,
  FileText,
  Eye,
  Filter,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import {
  CampaignDecisionExperiment,
  ReadinessVerdict,
  MIN_COMPARISON_EXPERIMENTS,
  MAX_COMPARISON_EXPERIMENTS,
  readinessVerdictLabel,
  formatContributionGbp,
  formatDemandPct
} from '@/packages/contracts/src/campaign-experiment-model';
import {
  categoryLabel,
  segmentLabel,
  channelLabel
} from '@/packages/contracts/src/campaign-decision-taxonomy-model';

/**
 * Green reads as cleared, amber as qualified, red as blocked, grey as never assessed.
 * An unassessed decision must not borrow the colour of a verdict the engine never gave.
 */
function readinessChipPalette(verdict: ReadinessVerdict): CSSProperties {
  switch (verdict) {
    case 'READY':
      return { background: '#ECFDF5', color: 'var(--success, #059669)', border: '1px solid #A7F3D0' };
    case 'CONDITIONAL':
    case 'REVIEW':
      return { background: '#FFFBEB', color: 'var(--warning, #D97706)', border: '1px solid #FDE68A' };
    case 'DO_NOT_PROCEED':
      return { background: '#FEF2F2', color: 'var(--error, #DC2626)', border: '1px solid #FECACA' };
    default:
      return { background: '#F8FAFC', color: 'var(--text-muted)', border: '1px solid var(--border)' };
  }
}

interface ExperimentHistoryDrawerProps {
  isOpen: boolean;
  experiments: CampaignDecisionExperiment[];
  onClose: () => void;
  onReviewExperiment: (experiment: CampaignDecisionExperiment) => void;
  onViewBrief: (experiment: CampaignDecisionExperiment) => void;
  onCompareExperiments: (experimentIds: string[]) => void;
}

export function ExperimentHistoryDrawer({
  isOpen,
  experiments,
  onClose,
  onReviewExperiment,
  onViewBrief,
  onCompareExperiments
}: ExperimentHistoryDrawerProps) {
  const [categoryFilter, setCategoryFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [objectiveFilter, setObjectiveFilter] = useState('');
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null);

  /**
   * Selection and filters belong to one visit to the drawer. The component stays mounted
   * when closed, so without this a reopened drawer would still hold the previous visit's
   * selection and silently offer to compare experiments the user is no longer looking at.
   */
  useEffect(() => {
    if (!isOpen) {
      setSelectedForCompare([]);
      setSelectionNotice(null);
      setCategoryFilter('');
      setRegionFilter('');
      setObjectiveFilter('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!selectionNotice) return;
    const timer = setTimeout(() => setSelectionNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [selectionNotice]);

  const filteredExperiments = useMemo(() => {
    return experiments.filter(e => {
      if (categoryFilter && !e.category.toLowerCase().includes(categoryFilter.toLowerCase())) return false;
      if (regionFilter && !e.region.toLowerCase().includes(regionFilter.toLowerCase())) return false;
      if (objectiveFilter && e.objective_type !== objectiveFilter) return false;
      return true;
    });
  }, [experiments, categoryFilter, regionFilter, objectiveFilter]);

  /**
   * Selection is capped rather than rotated. Silently dropping an earlier pick to make room
   * for a fifth would change what the user is about to compare without telling them; saying
   * the cap is reached leaves the choice with them.
   */
  const toggleSelectForCompare = (id: string) => {
    setSelectedForCompare(prev => {
      if (prev.includes(id)) {
        setSelectionNotice(null);
        return prev.filter(item => item !== id);
      }
      if (prev.length >= MAX_COMPARISON_EXPERIMENTS) {
        setSelectionNotice(
          `You can compare up to ${MAX_COMPARISON_EXPERIMENTS} decisions at once. Deselect one to add another.`
        );
        return prev;
      }
      setSelectionNotice(null);
      return [...prev, id];
    });
  };

  const canCompare = selectedForCompare.length >= MIN_COMPARISON_EXPERIMENTS;

  const handleLaunchCompare = () => {
    if (canCompare) onCompareExperiments(selectedForCompare);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.35)',
        backdropFilter: 'blur(2px)',
        zIndex: 900,
        display: 'flex',
        justifyContent: 'flex-end'
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 580,
          background: '#FFFFFF',
          height: '100%',
          boxShadow: '-10px 0 25px -5px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid var(--border)'
        }}
      >
        {/* Drawer Header */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <History size={16} color="var(--g10x-orange)" />
              <span style={{ fontSize: '0.6875rem', fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--g10x-orange)' }}>
                Decision Memory
              </span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 650,
                  background: 'var(--curiosity-light)',
                  color: 'var(--g10x-orange)',
                  padding: '2px 6px',
                  borderRadius: 999
                }}
              >
                {experiments.length} {experiments.length === 1 ? 'experiment' : 'experiments'}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              Previous Decisions
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Explore and compare decision hypotheses explored during this session.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
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

        {/* Comparison action bar (when selections exist) */}
        {selectedForCompare.length > 0 && (
          <div
            style={{
              padding: '10px 24px',
              background: 'var(--curiosity-light)',
              borderBottom: '1px solid #FED7AA',
              display: 'grid',
              gap: 6
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap'
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {selectedForCompare.length} of {MAX_COMPARISON_EXPERIMENTS} selected
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>
                  ({selectedForCompare.join(', ')})
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedForCompare([]);
                    setSelectionNotice(null);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={!canCompare}
                  onClick={handleLaunchCompare}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: canCompare ? 'var(--g10x-orange)' : '#CBD5E1',
                    color: '#FFFFFF',
                    fontSize: '0.75rem',
                    fontWeight: 650,
                    cursor: canCompare ? 'pointer' : 'not-allowed'
                  }}
                >
                  <Scale size={13} />
                  Compare selected ({selectedForCompare.length})
                </button>
              </div>
            </div>
            {!canCompare && (
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                Select at least {MIN_COMPARISON_EXPERIMENTS} decisions to compare.
              </div>
            )}
            {selectionNotice && (
              <div role="status" style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--g10x-orange)' }}>
                {selectionNotice}
              </div>
            )}
          </div>
        )}

        {/* Lightweight Filter Bar */}
        <div
          style={{
            padding: '12px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            background: '#F8FAFC'
          }}
        >
          <input
            type="text"
            placeholder="Filter category..."
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={filterInputStyle}
          />
          <input
            type="text"
            placeholder="Filter region..."
            value={regionFilter}
            onChange={e => setRegionFilter(e.target.value)}
            style={filterInputStyle}
          />
          <select
            value={objectiveFilter}
            onChange={e => setObjectiveFilter(e.target.value)}
            style={filterInputStyle}
          >
            <option value="">All objectives</option>
            <option value="REVENUE_ACCELERATION">Revenue acceleration</option>
            <option value="INVENTORY_CLEARANCE">Inventory clearance</option>
            <option value="MARKET_DEFENSE">Market defence</option>
            <option value="LAUNCH">Launch</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* Experiments List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'grid', gap: 12 }}>
          {filteredExperiments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <History size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                No completed experiments found
              </div>
              <div style={{ fontSize: '0.8125rem', marginTop: 4 }}>
                Complete a decision journey on the canvas to preserve your first decision experiment.
              </div>
            </div>
          ) : (
            filteredExperiments.map(exp => {
              const isSelected = selectedForCompare.includes(exp.experiment_id);
              return (
                <div
                  key={exp.experiment_id}
                  style={{
                    borderRadius: 10,
                    border: isSelected ? '1.5px solid var(--g10x-orange)' : '1px solid var(--border)',
                    background: isSelected ? '#FFFAF5' : '#FFFFFF',
                    padding: '14px 16px',
                    display: 'grid',
                    gap: 10,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Top line: ID, Date, Readiness */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--g10x-orange)' }}>
                        {exp.experiment_id}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(exp.completed_at).toLocaleDateString([], {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 650,
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: 999,
                        ...readinessChipPalette(exp.readiness_status)
                      }}
                    >
                      {readinessVerdictLabel(exp.readiness_status)}
                    </span>
                  </div>

                  {/* Summary title & scope — the dimensions that tell two experiments apart */}
                  <div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 650, color: 'var(--text-primary)' }}>
                      {exp.objective_label} · {categoryLabel(exp.category)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      {exp.region} · {exp.sku_scope.join(', ')} · {exp.posture_label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {segmentLabel(exp.audience_segment)} · {channelLabel(exp.sales_channel)}
                    </div>
                  </div>

                  {/* Decision & Impacts */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 8,
                      padding: '8px 10px',
                      background: '#F8FAFC',
                      borderRadius: 6,
                      fontSize: '0.75rem'
                    }}
                  >
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.6875rem' }}>Decision</div>
                      {/* Recommendations run long ("Choice required — two defensible options"),
                          and a clipped recommendation is the one line that must stay readable. */}
                      <div
                        title={exp.decision_recommendation}
                        style={{ fontWeight: 650, color: 'var(--text-primary)', overflowWrap: 'anywhere' }}
                      >
                        {exp.decision_recommendation}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.6875rem' }}>Demand</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatDemandPct(exp.incremental_demand_pct)}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.6875rem' }}>Contribution</div>
                      {/* A preserved loss must never render in the colour of a gain. */}
                      <div
                        style={{
                          fontWeight: 700,
                          color:
                            exp.contribution_impact_gbp < 0
                              ? 'var(--error, #DC2626)'
                              : exp.contribution_impact_gbp > 0
                                ? 'var(--success, #059669)'
                                : 'var(--text-secondary)'
                        }}
                      >
                        {formatContributionGbp(exp.contribution_impact_gbp)}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectForCompare(exp.experiment_id)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Select for compare</span>
                    </label>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => onViewBrief(exp)}
                        style={cardActionBtnStyle}
                        title="View Executive Execution Brief"
                      >
                        <FileText size={12} />
                        View Brief
                      </button>
                      <button
                        type="button"
                        onClick={() => onReviewExperiment(exp)}
                        style={{ ...cardActionBtnStyle, color: 'var(--g10x-orange)', fontWeight: 650 }}
                        title="Review historical parameters and analysis without modifying current decision"
                      >
                        <Eye size={12} />
                        Review
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

const filterInputStyle: CSSProperties = {
  flex: '1 1 140px',
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid var(--border)',
  fontSize: '0.75rem',
  background: '#FFFFFF',
  color: 'var(--text-primary)'
};

const cardActionBtnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '5px 10px',
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: '#FFFFFF',
  color: 'var(--text-secondary)',
  fontSize: '0.75rem',
  fontWeight: 600,
  cursor: 'pointer'
};
