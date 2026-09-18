'use client';

/**
 * Evidence & Signals — `SCI-06`, converged onto `SCI-05` at Gate C
 * ───────────────────────────────────────────────────────────────────────────────
 * Answers five questions about every observation the ACTIVE scenario carries: where it came from,
 * how fresh it is on that scenario's own clock, what produced it, what it moved, and whether it
 * changed the decision.
 *
 * Every figure below is read from `GET /api/v1/evidence`. Nothing on this surface computes a
 * materiality, a relevance or a Refresh outcome — those are `lib/living-evidence-engine.ts`'s, and
 * a second computation here would be two answers to one question.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Loader2,
  AlertCircle,
  Clock,
  Database,
  Layers,
  ArrowRight,
  RotateCcw,
  Info
} from 'lucide-react';
import {
  describeProvenance,
  provenanceFromSignalSourceType
} from '@/packages/contracts/src/provenance-vocabulary';
import {
  type MaterialityBand,
  type DecisionChangeKind
} from '@/packages/contracts/src/living-evidence-contracts';
import {
  getLivingEvidence,
  triggerScenarioRefresh,
  restartScenarioEvidence,
  type LivingEvidenceScenarioData,
  type RefreshLifecycleState,
  type RefreshOperationResult
} from '@/lib/observability-client';

interface EvidenceSignalsSectionProps {
  scenarioId: string;
}

const num = (v: number) => v.toLocaleString('en-GB', { maximumFractionDigits: 2 });
const pct = (v: number | null) => (v === null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`);

export default function EvidenceSignalsSection({ scenarioId }: EvidenceSignalsSectionProps) {
  const [data, setData] = useState<LivingEvidenceScenarioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lifecycle, setLifecycle] = useState<RefreshLifecycleState>('idle');
  const [refreshResult, setRefreshResult] = useState<RefreshOperationResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [materialityFilter, setMaterialityFilter] = useState<string>('ALL');

  const loadScenarioEvidence = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await getLivingEvidence(id);
      setData(res);
      setLoadError(null);
    } catch (err: any) {
      /*
       * A failed evidence read is SHOWN. The alternative — quietly rendering whatever was last in
       * state, or authored stand-in data — is how an Observability surface comes to publish
       * something it never measured.
       */
      setData(null);
      setLoadError(err?.message || 'Living Evidence could not be read for this scenario.');
    } finally {
      setLoading(false);
    }
  }, []);

  /* The scenario is the identity of everything on this surface, so a change reloads all of it. */
  useEffect(() => {
    setRefreshResult(null);
    setLifecycle('idle');
    setSelectedCategory('ALL');
    setMaterialityFilter('ALL');
    void loadScenarioEvidence(scenarioId);
  }, [scenarioId, loadScenarioEvidence]);

  const handleRefresh = async () => {
    if (lifecycle === 'refreshing') return;
    setLifecycle('refreshing');
    const res = await triggerScenarioRefresh(scenarioId);
    setRefreshResult(res);
    setLifecycle(res.state);
    /* The marker moved, so the evidence list and the next preview are both stale. Re-read them. */
    if (res.status === 'success') await loadScenarioEvidence(scenarioId);
  };

  const handleRestart = async () => {
    if (lifecycle === 'refreshing') return;
    setLifecycle('refreshing');
    try {
      await restartScenarioEvidence(scenarioId);
      setRefreshResult(null);
      setLifecycle('idle');
      await loadScenarioEvidence(scenarioId);
    } catch (err: any) {
      setLifecycle('failed');
      setRefreshResult({
        status: 'failed',
        state: 'failed',
        delta: null,
        error: err?.message || 'Restart failed',
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

  const observations = data?.observations ?? [];
  const categories = Array.from(new Set(observations.map(o => o.signal.category))).sort();

  const filtered = observations.filter(o => {
    if (selectedCategory !== 'ALL' && o.signal.category !== selectedCategory) return false;
    if (materialityFilter === 'MATERIAL_ONLY') {
      return o.materiality.band === 'MATERIAL' || o.materiality.band === 'DECISIVE';
    }
    if (materialityFilter === 'NOTABLE_ONLY') return o.materiality.band === 'NOTABLE';
    if (materialityFilter === 'DECISION_CHANGE_ONLY') return o.decision_relevance.changed !== 'NONE';
    return true;
  });

  const preview = data?.next_refresh_preview ?? null;
  const previewExhausted = preview !== null && preview.from.period === preview.to.period;

  return (
    <div className="og-evidence-signals">
      <div className="og-section-lead">
        <div className="og-scenario-meta-bar">
          <span className="og-scenario-pill">
            Scenario: <strong>{data?.scenario_name || scenarioId}</strong>
          </span>
          {data && (
            <span className="og-clock-pill">
              <Clock size={12} />
              Scenario clock: <strong>{data.scenario_clock.slice(0, 10)}</strong>
              <span className="og-subtext">
                as at {data.as_at.period} (opens at {data.as_at.opening_period}) — this scenario&apos;s
                own time, not the civil clock
              </span>
            </span>
          )}
        </div>
        <p className="og-lead-questions">
          <strong>Key business questions answered:</strong> Where did this come from? What changed?
          How fresh is it? Does it matter? Did it change the decision?
        </p>
      </div>

      <div className="og-refresh-panel" aria-label="Refresh Operation Control">
        <div className="og-refresh-header">
          <div className="og-refresh-title-group">
            <h3>Living Evidence Refresh</h3>
            <p className="og-refresh-subtitle">
              Advances this scenario&apos;s evidence one period along its own clock, re-evaluates
              every published quantity, and states whether the decision changed. Restart returns the
              scenario to its opening evidence, so the same advance can be run again and produce the
              same answer.
            </p>
          </div>

          <div className="og-refresh-actions">
            <button
              type="button"
              id="og-btn-refresh-evidence"
              className={`og-btn-refresh ${lifecycle === 'refreshing' ? 'og-btn--busy' : ''}`}
              onClick={handleRefresh}
              disabled={lifecycle === 'refreshing' || !!loadError}
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

            <button
              type="button"
              id="og-btn-restart-evidence"
              className="og-btn-subtle"
              onClick={handleRestart}
              disabled={lifecycle === 'refreshing' || !!loadError}
            >
              <RotateCcw size={12} />
              <span>Restart scenario evidence</span>
            </button>
          </div>
        </div>

        {/*
          What the NEXT advance would publish, without taking it — read from the engine's own
          preview so the surface and the operation cannot disagree about what is coming.
        */}
        {preview && lifecycle !== 'refreshing' && (
          <p className="og-refresh-preview">
            <Info size={13} />
            <span>
              {previewExhausted
                ? 'This scenario’s evidence is already at the end of its declared timeline. '
                  + 'Refresh will advance nothing; Restart returns it to its opening position.'
                : `Next advance: ${preview.from.period} → ${preview.to.period}. `
                  + `${preview.material_movements.length} published `
                  + `quantit${preview.material_movements.length === 1 ? 'y' : 'ies'} would move materially.`}
            </span>
          </p>
        )}

        {refreshResult && (
          <div className={`og-refresh-result og-refresh-result--${lifecycle}`}>
            <div className="og-refresh-result-header">
              <span className={`og-lifecycle-pill og-lifecycle-pill--${lifecycle}`}>
                {lifecycle === 'refreshing' && 'Refreshing…'}
                {lifecycle === 'refreshed' && 'Evidence refreshed — something changed'}
                {lifecycle === 'unchanged' && 'Evidence refreshed — no material change'}
                {lifecycle === 'failed' && 'Refresh failed'}
              </span>
              {refreshResult.delta && (
                <span className="og-period-advance">
                  Period: <strong>{refreshResult.delta.from.period}</strong>{' '}
                  ({refreshResult.delta.from.period_instant_iso.slice(0, 10)})
                  {' → '}
                  <strong>{refreshResult.delta.to.period}</strong>{' '}
                  ({refreshResult.delta.to.period_instant_iso.slice(0, 10)})
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
                  <span className="og-consequence-label">Decision consequence:</span>
                  <strong className="og-consequence-text">
                    {refreshResult.delta.decision_consequence_statement}
                  </strong>
                </div>

                {refreshResult.delta.material_movements.length > 0 ? (
                  <div className="og-delta-movements">
                    <span className="og-delta-subhead">Material movements across this advance:</span>
                    <div className="og-movements-grid">
                      {refreshResult.delta.material_movements.map(m => (
                        <div key={m.quantity} className="og-movement-item">
                          <span className="og-movement-label">{m.display_label}</span>
                          <span className="og-movement-vals">
                            {num(m.before)} → <strong>{num(m.after)} {m.unit}</strong>
                          </span>
                          <span className={`og-movement-delta ${m.delta >= 0 ? 'og-delta--up' : 'og-delta--down'}`}>
                            {m.delta >= 0 ? `+${num(m.delta)}` : num(m.delta)} ({pct(m.delta_pct)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="og-delta-none">
                    No published quantity moved materially across this advance. That is a measured
                    answer, not a missing one — the recommendation stands as it did.
                  </p>
                )}

                {/*
                  The four classes the contract declares, counted separately. Collapsing them into
                  "changed / unchanged" reads as though every aged observation had moved: after a
                  one-period advance every prior observation is a day older, which is a fact about
                  the clock and not about the evidence.
                */}
                <div className="og-delta-stats">
                  <span>Observations: <strong>{refreshResult.delta.observations.length}</strong> at the new marker</span>
                  {(['NEW', 'MOVED', 'AGED', 'UNCHANGED'] as const).map(kind => (
                    <span key={kind}>
                      {kind.charAt(0) + kind.slice(1).toLowerCase()}:{' '}
                      <strong>{refreshResult.delta!.observations.filter(o => o.change === kind).length}</strong>
                    </span>
                  ))}
                  <span>
                    Decision changes:{' '}
                    <strong>
                      {refreshResult.delta.decision_changes.filter(c => c.changed !== 'NONE').length}
                    </strong>
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="og-signals-filter-bar">
        <div className="og-filter-group">
          <label htmlFor="og-category-select">Category:</label>
          <select
            id="og-category-select"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="ALL">All categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="og-filter-group">
          <label htmlFor="og-materiality-select">Materiality &amp; relevance:</label>
          <select
            id="og-materiality-select"
            value={materialityFilter}
            onChange={e => setMaterialityFilter(e.target.value)}
          >
            <option value="ALL">All observations ({observations.length})</option>
            <option value="MATERIAL_ONLY">Material &amp; decisive only</option>
            <option value="NOTABLE_ONLY">Notable only</option>
            <option value="DECISION_CHANGE_ONLY">Changed the decision only</option>
          </select>
        </div>

        <span className="og-filter-count">
          Showing {filtered.length} of {observations.length} observations
        </span>
      </div>

      {loading ? (
        <div className="og-loading-state">
          <Loader2 size={24} className="atlas-spin" />
          <p>Reading this scenario&apos;s Living Evidence…</p>
        </div>
      ) : loadError ? (
        <p className="og-refresh-error">
          <AlertCircle size={14} />
          <span>{loadError}</span>
        </p>
      ) : filtered.length === 0 ? (
        <p className="og-empty">No observation matches these filters for the active scenario.</p>
      ) : (
        <div className="og-signals-list">
          {filtered.map(o => {
            const sig = o.signal;
            /* The governed ADR-082 mapping from how the signal reached the fabric. One vocabulary. */
            const provDesc = provenanceFromSignalSourceType(sig.source_type);
            const provSentence = describeProvenance(provDesc, sig.signal_type.replace(/_/g, ' '));

            return (
              <article key={sig.signal_id} className="og-signal-card" id={`sig-${sig.signal_id}`}>
                <div className="og-signal-header">
                  <div className="og-signal-title-area">
                    <span className="og-category-tag">{sig.category}</span>
                    <h4 className="og-signal-name">{sig.signal_type.replace(/_/g, ' ')}</h4>
                    <span className="og-signal-entity">{sig.entity_type}: {sig.entity_id}</span>
                  </div>

                  <div className="og-signal-metrics-pill">
                    <span className="og-metric-observed">{num(sig.observed_value)} {sig.unit}</span>
                    <span className={`og-metric-delta ${sig.delta_pct >= 0 ? 'og-delta--up' : 'og-delta--down'}`}>
                      {pct(sig.delta_pct)}
                    </span>
                    <span className="og-metric-baseline">vs {num(sig.baseline_value)} baseline</span>
                  </div>
                </div>

                <div className="og-signal-freshness-bar">
                  <span className="og-freshness-item" title="Measured on the scenario clock, never civil time">
                    <Clock size={12} />
                    <span>
                      Observed <strong>{sig.observed_at.slice(0, 10)}</strong> —{' '}
                      {o.age_scenario_days === 0
                        ? 'as at the current marker'
                        : `${o.age_scenario_days} scenario day${o.age_scenario_days === 1 ? '' : 's'} old`}
                    </span>
                  </span>
                  <span className="og-freshness-item">
                    <ArrowRight size={12} />
                    <span>Effective: <strong>{sig.effective_at.slice(0, 10)}</strong></span>
                  </span>
                  <span className="og-freshness-item">
                    <Database size={12} />
                    <span>
                      Source: <strong>{sig.source_system}</strong> ({sig.source_type.replace(/_/g, ' ').toLowerCase()})
                    </span>
                  </span>
                  <span className="og-freshness-item">
                    Confidence: <strong>{sig.confidence}%</strong> · Quality: <strong>{sig.quality}%</strong>
                  </span>
                </div>

                <div className="og-provenance-row">
                  <div className="og-prov-sentence">
                    <Layers size={13} />
                    <span>{provSentence}</span>
                  </div>
                  <div className="og-prov-badges">
                    <span className="og-prov-badge og-prov-badge--origin">Origin: {provDesc.origin}</span>
                    <span className="og-prov-badge og-prov-badge--method">Method: {provDesc.method}</span>
                    <span
                      className={`og-prov-badge og-prov-badge--authority ${
                        provDesc.authority === 'authoritative' ? 'og-badge--authoritative' : 'og-badge--draft'
                      }`}
                    >
                      {provDesc.authority.replace(/_/g, ' ')}
                    </span>
                    {sig.provenance?.rule_id && (
                      <span className="og-prov-badge og-prov-badge--rule">
                        Rule: {sig.provenance.rule_id}
                      </span>
                    )}
                  </div>
                </div>

                <div className="og-materiality-block">
                  <div className="og-materiality-header">
                    <div className="og-materiality-band-wrap">
                      <span className="og-subheading">Materiality:</span>
                      <span className={`og-band-badge ${getBandBadgeClass(o.materiality.band)}`}>
                        {o.materiality.band}
                      </span>
                    </div>
                    <p className="og-materiality-rationale">{o.materiality.rationale}</p>
                  </div>

                  {o.materiality.movements.length > 0 && (
                    <div className="og-movements-table-wrap">
                      <table className="og-movements-table">
                        <thead>
                          <tr>
                            <th>Published quantity</th>
                            <th>Without this observation</th>
                            <th>With it</th>
                            <th>Delta</th>
                          </tr>
                        </thead>
                        <tbody>
                          {o.materiality.movements.map(mov => (
                            <tr key={mov.quantity}>
                              <td><strong>{mov.display_label}</strong></td>
                              <td>{num(mov.before)} {mov.unit}</td>
                              <td>{num(mov.after)} {mov.unit}</td>
                              <td className={mov.delta >= 0 ? 'og-delta--pos' : 'og-delta--neg'}>
                                {mov.delta >= 0 ? `+${num(mov.delta)}` : num(mov.delta)} {mov.unit}{' '}
                                ({pct(mov.delta_pct)})
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="og-decision-relevance-block">
                  <div className="og-decision-relevance-header">
                    <span className="og-subheading">Did this change the decision?</span>
                    <span className={`og-relevance-badge ${getDecisionChangeBadgeClass(o.decision_relevance.changed)}`}>
                      {o.decision_relevance.changed === 'NONE'
                        ? 'NO DECISION CHANGE'
                        : `CHANGED ${o.decision_relevance.changed}`}
                    </span>
                  </div>
                  <p className="og-relevance-statement">{o.decision_relevance.statement}</p>
                  {o.decision_relevance.before_statement && o.decision_relevance.after_statement && (
                    <div className="og-relevance-transition">
                      <span className="og-before-state">Before: {o.decision_relevance.before_statement}</span>
                      <ArrowRight size={12} />
                      <span className="og-after-state">
                        After: <strong>{o.decision_relevance.after_statement}</strong>
                      </span>
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
