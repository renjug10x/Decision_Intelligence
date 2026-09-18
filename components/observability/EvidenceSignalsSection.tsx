'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Database,
  Layers,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Info
} from 'lucide-react';
import {
  describeProvenance,
  type ProvenanceDescriptor
} from '@/packages/contracts/src/provenance-vocabulary';
import {
  type MaterialityBand,
  type DecisionChangeKind
} from '@/packages/contracts/src/living-evidence-contracts';
import {
  getLivingEvidence,
  triggerScenarioRefresh,
  type RefreshLifecycleState,
  type RefreshOperationResult
} from '@/lib/observability-client';
import type { LivingEvidenceScenarioData } from '@/lib/fixtures/living-evidence-fixtures';

interface EvidenceSignalsSectionProps {
  scenarioId: string;
}

export default function EvidenceSignalsSection({ scenarioId }: EvidenceSignalsSectionProps) {
  const [data, setData] = useState<LivingEvidenceScenarioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lifecycle, setLifecycle] = useState<RefreshLifecycleState>('idle');
  const [refreshResult, setRefreshResult] = useState<RefreshOperationResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [materialityFilter, setMaterialityFilter] = useState<string>('ALL');
  const [hasChanged, setHasChanged] = useState(false);

  const loadScenarioEvidence = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await getLivingEvidence(id);
      setData(res);
      setRefreshResult(null);
      setLifecycle('idle');
      setHasChanged(false);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadScenarioEvidence(scenarioId);
  }, [scenarioId, loadScenarioEvidence]);

  const handleRefresh = async (mode: 'toggle' | 'force_changed' | 'force_unchanged' | 'force_fail' = 'toggle') => {
    if (lifecycle === 'refreshing') return;
    setLifecycle('refreshing');
    try {
      const res = await triggerScenarioRefresh(scenarioId, mode, hasChanged);
      setRefreshResult(res);
      setLifecycle(res.state);
      setHasChanged(res.hasChanged);
    } catch (err: any) {
      setLifecycle('failed');
      setRefreshResult({
        status: 'failed',
        state: 'failed',
        delta: null,
        error: err?.message || 'Refresh operation failed unexpectedly',
        hasChanged: false
      });
    }
  };

  const getBandBadgeClass = (band: MaterialityBand) => {
    switch (band) {
      case 'DECISIVE': return 'og-badge--decisive';
      case 'MATERIAL': return 'og-badge--material';
      case 'NOTABLE': return 'og-badge--notable';
      default: return 'og-badge--immaterial';
    }
  };

  const getDecisionChangeBadgeClass = (kind: DecisionChangeKind) => {
    switch (kind) {
      case 'RECOMMENDATION': return 'og-badge--decisive';
      case 'DECISION_WINDOW': return 'og-badge--material';
      case 'READINESS_VERDICT': return 'og-badge--notable';
      default: return 'og-badge--neutral';
    }
  };

  const filteredSignals = (data?.signals || []).filter(sig => {
    if (selectedCategory !== 'ALL' && sig.category !== selectedCategory) return false;
    if (materialityFilter === 'MATERIAL_ONLY') {
      return sig.materiality.band === 'MATERIAL' || sig.materiality.band === 'DECISIVE';
    }
    if (materialityFilter === 'NOTABLE_ONLY') {
      return sig.materiality.band === 'NOTABLE';
    }
    if (materialityFilter === 'DECISION_CHANGE_ONLY') {
      return sig.decision_relevance.changed !== 'NONE';
    }
    return true;
  });

  return (
    <div className="og-evidence-signals">
      {/* Section Header with Business Questions */}
      <div className="og-section-lead">
        <div className="og-scenario-meta-bar">
          <span className="og-scenario-pill">
            Scenario: <strong>{data?.scenario_name || scenarioId}</strong>
          </span>
          <span className="og-clock-pill">
            <Clock size={12} />
            Scenario Clock: <strong>{data?.scenario_clock?.slice(0, 10) || '2026-09-08'}</strong>
            <span className="og-subtext">(deterministic scenario time, not civil clock)</span>
          </span>
        </div>
        <p className="og-lead-questions">
          <strong>Key business questions answered:</strong> Where did this come from? What changed? How fresh is it? Does it matter? Did it change the decision?
        </p>
      </div>

      {/* Governed Refresh Operation Banner */}
      <div className="og-refresh-panel" aria-label="Refresh Operation Control">
        <div className="og-refresh-header">
          <div className="og-refresh-title-group">
            <h3>Living Evidence Refresh</h3>
            <p className="og-refresh-subtitle">
              Advances scenario evidence along the scenario clock and evaluates whether published quantities or decisions changed.
            </p>
          </div>

          <div className="og-refresh-actions">
            <button
              type="button"
              id="og-btn-refresh-evidence"
              className={`og-btn-refresh ${lifecycle === 'refreshing' ? 'og-btn--busy' : ''}`}
              onClick={() => handleRefresh('toggle')}
              disabled={lifecycle === 'refreshing'}
            >
              {lifecycle === 'refreshing' ? (
                <>
                  <Loader2 size={14} className="atlas-spin" />
                  <span>Advancing scenario evidence…</span>
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  <span>Refresh evidence</span>
                </>
              )}
            </button>

            {/* Governed Testing Shortcuts to scrutinise both changed and unchanged outcomes */}
            <div className="og-refresh-modes" title="Test governed Refresh states">
              <button
                type="button"
                className="og-btn-subtle"
                onClick={() => handleRefresh('force_changed')}
                disabled={lifecycle === 'refreshing'}
              >
                Test Changed
              </button>
              <button
                type="button"
                className="og-btn-subtle"
                onClick={() => handleRefresh('force_unchanged')}
                disabled={lifecycle === 'refreshing'}
              >
                Test Unchanged
              </button>
              <button
                type="button"
                className="og-btn-subtle"
                onClick={() => handleRefresh('force_fail')}
                disabled={lifecycle === 'refreshing'}
              >
                Test Failure
              </button>
            </div>
          </div>
        </div>

        {/* Refresh Lifecycle Output Card */}
        {refreshResult && (
          <div className={`og-refresh-result og-refresh-result--${lifecycle}`}>
            <div className="og-refresh-result-header">
              <span className={`og-lifecycle-pill og-lifecycle-pill--${lifecycle}`}>
                {lifecycle === 'refreshing' && 'Refreshing…'}
                {lifecycle === 'refreshed' && 'Evidence Refreshed (Changed)'}
                {lifecycle === 'unchanged' && 'Evidence Refreshed (Unchanged)'}
                {lifecycle === 'failed' && 'Refresh Failed'}
              </span>
              {refreshResult.delta && (
                <span className="og-period-advance">
                  Period: <strong>{refreshResult.delta.from.period}</strong> ({refreshResult.delta.from.period_instant_iso.slice(0, 10)})
                  {' → '}
                  <strong>{refreshResult.delta.to.period}</strong> ({refreshResult.delta.to.period_instant_iso.slice(0, 10)})
                </span>
              )}
            </div>

            {lifecycle === 'failed' ? (
              <p className="og-refresh-error">
                <AlertCircle size={14} />
                <span>{refreshResult.error}</span>
              </p>
            ) : refreshResult.delta ? (
              <div className="og-refresh-delta-body">
                <div className="og-consequence-statement">
                  <span className="og-consequence-label">Decision Consequence:</span>
                  <strong className="og-consequence-text">"{refreshResult.delta.decision_consequence_statement}"</strong>
                </div>

                {refreshResult.delta.material_movements.length > 0 && (
                  <div className="og-delta-movements">
                    <span className="og-delta-subhead">Material movements across this advance:</span>
                    <div className="og-movements-grid">
                      {refreshResult.delta.material_movements.map((m, idx) => (
                        <div key={idx} className="og-movement-item">
                          <span className="og-movement-label">{m.display_label}</span>
                          <span className="og-movement-vals">
                            {m.before.toLocaleString()} → <strong>{m.after.toLocaleString()} {m.unit}</strong>
                          </span>
                          <span className={`og-movement-delta ${m.delta > 0 ? 'og-delta--up' : 'og-delta--down'}`}>
                            {m.delta > 0 ? `+${m.delta.toLocaleString()}` : m.delta.toLocaleString()}
                            {m.delta_pct !== null && ` (${m.delta_pct > 0 ? `+${m.delta_pct}` : m.delta_pct}%)`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="og-delta-stats">
                  <span>
                    Observations: <strong>{refreshResult.delta.observations.length}</strong> total
                  </span>
                  <span>
                    Changed: <strong>{refreshResult.delta.observations.filter(o => o.change !== 'UNCHANGED').length}</strong>
                  </span>
                  <span>
                    Unchanged: <strong>{refreshResult.delta.observations.filter(o => o.change === 'UNCHANGED').length}</strong>
                  </span>
                  <span>
                    Decision changes: <strong>{refreshResult.delta.decision_changes.length}</strong>
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Signal Filtering & Inventory Controls */}
      <div className="og-signals-filter-bar">
        <div className="og-filter-group">
          <label htmlFor="og-category-select">Category:</label>
          <select
            id="og-category-select"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            <option value="DEMAND">Demand</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="SUPPLY">Supply</option>
            <option value="INVENTORY">Inventory</option>
            <option value="FINANCIAL">Financial</option>
          </select>
        </div>

        <div className="og-filter-group">
          <label htmlFor="og-materiality-select">Materiality &amp; Relevance:</label>
          <select
            id="og-materiality-select"
            value={materialityFilter}
            onChange={e => setMaterialityFilter(e.target.value)}
          >
            <option value="ALL">All Signals ({data?.signals.length || 0})</option>
            <option value="MATERIAL_ONLY">Material &amp; Decisive Only</option>
            <option value="NOTABLE_ONLY">Notable Only</option>
            <option value="DECISION_CHANGE_ONLY">Changed Decision Only</option>
          </select>
        </div>

        <span className="og-filter-count">
          Showing {filteredSignals.length} of {data?.signals.length || 0} signals
        </span>
      </div>

      {/* Signals List */}
      {loading ? (
        <div className="og-loading-state">
          <Loader2 size={24} className="atlas-spin" />
          <p>Loading living evidence and signal intelligence…</p>
        </div>
      ) : filteredSignals.length === 0 ? (
        <p className="og-empty">No enterprise signals matching criteria for active scenario.</p>
      ) : (
        <div className="og-signals-list">
          {filteredSignals.map(sig => {
            const provDesc = sig.provenance;
            const provSentence = describeProvenance(provDesc, sig.signal_type);

            return (
              <article key={sig.signal_id} className="og-signal-card" id={`sig-${sig.signal_id}`}>
                <div className="og-signal-header">
                  <div className="og-signal-title-area">
                    <span className="og-category-tag">{sig.category}</span>
                    <h4 className="og-signal-name">{sig.signal_type.replace(/_/g, ' ')}</h4>
                    <span className="og-signal-entity">{sig.entity_id}</span>
                  </div>

                  <div className="og-signal-metrics-pill">
                    <span className="og-metric-observed">
                      {sig.observed_value.toLocaleString()} {sig.unit}
                    </span>
                    <span className={`og-metric-delta ${sig.delta_pct > 0 ? 'og-delta--up' : 'og-delta--down'}`}>
                      {sig.delta_pct > 0 ? `+${sig.delta_pct}` : sig.delta_pct}%
                    </span>
                    <span className="og-metric-baseline">
                      vs {sig.baseline_value.toLocaleString()} baseline
                    </span>
                  </div>
                </div>

                {/* Provenance & Freshness Bar */}
                <div className="og-signal-freshness-bar">
                  <span className="og-freshness-item" title="Scenario clock observation period">
                    <Clock size={12} />
                    <span>Observed: <strong>{sig.observed_period}</strong></span>
                  </span>
                  <span className="og-freshness-item" title="Scenario clock effective horizon">
                    <ArrowRight size={12} />
                    <span>Effective: <strong>{sig.effective_period}</strong></span>
                  </span>
                  <span className="og-freshness-item">
                    <Database size={12} />
                    <span>Source: <strong>{sig.source_system}</strong> ({sig.source_type.replace(/_/g, ' ')})</span>
                  </span>
                  <span className="og-freshness-item">
                    Confidence: <strong>{sig.confidence}%</strong> · Quality: <strong>{sig.quality}%</strong>
                  </span>
                </div>

                {/* Provenance Sentence (ADR-082 Reader Test) */}
                <div className="og-provenance-row">
                  <div className="og-prov-sentence">
                    <Layers size={13} />
                    <span>{provSentence}</span>
                  </div>
                  <div className="og-prov-badges">
                    <span className="og-prov-badge og-prov-badge--origin">Origin: {provDesc.origin}</span>
                    <span className="og-prov-badge og-prov-badge--method">Method: {provDesc.method}</span>
                    <span className={`og-prov-badge og-prov-badge--authority ${provDesc.authority === 'authoritative' ? 'og-badge--authoritative' : 'og-badge--draft'}`}>
                      {provDesc.authority.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Materiality Assessment Grid */}
                <div className="og-materiality-block">
                  <div className="og-materiality-header">
                    <div className="og-materiality-band-wrap">
                      <span className="og-subheading">Materiality:</span>
                      <span className={`og-band-badge ${getBandBadgeClass(sig.materiality.band)}`}>
                        {sig.materiality.band}
                      </span>
                    </div>
                    <p className="og-materiality-rationale">{sig.materiality.rationale}</p>
                  </div>

                  {sig.materiality.movements.length > 0 && (
                    <div className="og-movements-table-wrap">
                      <table className="og-movements-table">
                        <thead>
                          <tr>
                            <th>Published Quantity</th>
                            <th>Before</th>
                            <th>After</th>
                            <th>Delta</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sig.materiality.movements.map((mov, mIdx) => (
                            <tr key={mIdx}>
                              <td><strong>{mov.display_label}</strong></td>
                              <td>{mov.before.toLocaleString()} {mov.unit}</td>
                              <td>{mov.after.toLocaleString()} {mov.unit}</td>
                              <td className={mov.delta >= 0 ? 'og-delta--pos' : 'og-delta--neg'}>
                                {mov.delta > 0 ? `+${mov.delta.toLocaleString()}` : mov.delta.toLocaleString()} {mov.unit}
                                {mov.delta_pct !== null && ` (${mov.delta_pct > 0 ? `+${mov.delta_pct}` : mov.delta_pct}%)`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Decision Relevance */}
                <div className="og-decision-relevance-block">
                  <div className="og-decision-relevance-header">
                    <span className="og-subheading">Did this change the decision?</span>
                    <span className={`og-relevance-badge ${getDecisionChangeBadgeClass(sig.decision_relevance.changed)}`}>
                      {sig.decision_relevance.changed === 'NONE' ? 'NO DECISION CHANGE' : `CHANGED ${sig.decision_relevance.changed}`}
                    </span>
                  </div>
                  <p className="og-relevance-statement">
                    {sig.decision_relevance.statement}
                  </p>
                  {sig.decision_relevance.before_statement && sig.decision_relevance.after_statement && (
                    <div className="og-relevance-transition">
                      <span className="og-before-state">Before: {sig.decision_relevance.before_statement}</span>
                      <ArrowRight size={12} />
                      <span className="og-after-state">After: <strong>{sig.decision_relevance.after_statement}</strong></span>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
