'use client';

/**
 * FM-01 — model choice, forecast range, and the evidence behind both.
 *
 * Two rules shape this panel.
 *
 * **A model identifier names an implementation.** The selector is populated from the governed
 * registry, which admits a model only when an adapter genuinely fits and predicts it. There is no
 * "coming soon" entry, and nothing here translates a display name into a different wire value.
 *
 * **The range is described by what it was measured against, never by a bare percentage.** The
 * headline says *"Forecast range"*, not *"Confidence: 80%"*. Where the range is calibrated it says
 * what it was calibrated on and what share of held-out days it actually covered; where it is not, it
 * says the range is the model's own and reports the coverage that was measured. A planner is never
 * shown a number that implies more than the evidence supports.
 */

import React, { useState } from 'react';
import { ChevronRight, Cpu, Info, Target } from 'lucide-react';
import {
  ForecastExecution,
  ForecastModelDeclaration,
  ModelComparison
} from '@/packages/contracts/src/forecast-model-model';

const INK = '#0F172A';
const BODY = '#334155';
const MUTED = '#64748B';
const FAINT = '#94A3B8';
const LINE = '#E2E8F0';
const HAIRLINE = '#F1F5F9';
const SUNKEN = '#F8FAFC';
const DEMAND = '#0284C7';
const GOOD = '#059669';

const eyebrow: React.CSSProperties = {
  fontSize: '0.6875rem',
  color: MUTED,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

export interface ForecastModelPanelProps {
  execution: ForecastExecution;
  models: ForecastModelDeclaration[];
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  recommendation: {
    recommended: string;
    measured: boolean;
    comparison: ModelComparison;
    statement: string;
  } | null;
  onRequestComparison: () => void;
  comparisonLoading: boolean;
}

function pct(v: number | null | undefined, digits = 0): string {
  return v === null || v === undefined ? '—' : `${(v * 100).toFixed(digits)}%`;
}

export default function ForecastModelPanel({
  execution,
  models,
  selectedModelId,
  onSelectModel,
  recommendation,
  onRequestComparison,
  comparisonLoading
}: ForecastModelPanelProps) {
  const [showEvidence, setShowEvidence] = useState(false);
  const calibration = execution.calibration;
  const calibrated = calibration?.reliable === true;
  const backtest = execution.validation.backtest;
  const declaration = models.find(m => m.model_id === execution.model_id);
  const provenance = execution.data_provenance;

  const recommendedDeclaration = recommendation
    ? models.find(m => m.model_id === recommendation.recommended)
    : undefined;
  const recommendationDiffers =
    recommendation?.measured === true && recommendation.recommended !== execution.model_id;

  return (
    <div style={{ background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: 10, boxShadow: '0 1px 2px rgba(15,23,42,0.03)' }}>
      {/* ── The two sentences a planner needs ── */}
      <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <div>
          <div style={{ ...eyebrow, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Cpu size={12} /> Forecast model
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: INK, marginTop: 5 }}>
            {execution.model_display_name}
          </div>
          <div style={{ fontSize: '0.75rem', color: MUTED, marginTop: 4, lineHeight: 1.5 }}>
            {declaration?.summary}
          </div>
        </div>

        <div>
          <div style={{ ...eyebrow, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Target size={12} /> Forecast range
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: INK, marginTop: 5 }}>
            {calibrated ? 'Calibrated against history' : 'Model-implied only'}
          </div>
          <div style={{ fontSize: '0.75rem', color: MUTED, marginTop: 4, lineHeight: 1.5 }}>
            {calibrated ? (
              <>
                The shaded band is widened to match the errors this model actually made on days it had
                not seen. On held-out weeks it contained{' '}
                <strong style={{ color: BODY }}>{pct(calibration!.held_out_coverage, 0)}</strong> of what
                happened, against a target of {pct(calibration!.target_coverage, 0)}.
              </>
            ) : (
              <>
                The band is what the model’s own mathematics implies. It has not been calibrated —{' '}
                {backtest?.interval_coverage !== null && backtest?.interval_coverage !== undefined ? (
                  <>
                    on backtesting it contained{' '}
                    <strong style={{ color: BODY }}>{pct(backtest.interval_coverage, 0)}</strong> of what
                    happened, so read it as indicative rather than as a range.
                  </>
                ) : (
                  'and no backtest measured what it covers, so read it as indicative only.'
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── The measured recommendation. A simple benchmark winning is evidence, not embarrassment. ── */}
      {recommendationDiffers && (
        <div
          style={{
            margin: '0 18px 14px',
            padding: '10px 14px',
            background: '#F0F9FF',
            border: '1px solid #BAE6FD',
            borderRadius: 8,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            flexWrap: 'wrap'
          }}
        >
          <Info size={14} color="#0369A1" style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#075985' }}>
              Recommended model: {recommendedDeclaration?.display_name ?? recommendation!.recommended}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#0C4A6E', marginTop: 2, lineHeight: 1.5 }}>
              {recommendation!.statement}
            </div>
          </div>
          <button
            onClick={() => onSelectModel(recommendation!.recommended)}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              border: '1px solid #7DD3FC',
              background: '#FFFFFF',
              color: '#0369A1',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Use this model
          </button>
        </div>
      )}

      {/* ── Selector ── */}
      <div style={{ padding: '0 18px 14px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ ...eyebrow, marginRight: 2 }} htmlFor="fm-model-select">
          Model
        </label>
        <select
          id="fm-model-select"
          className="select"
          value={selectedModelId}
          onChange={e => onSelectModel(e.target.value)}
          style={{ height: 34, fontSize: '0.8125rem', minWidth: 220 }}
        >
          {models.map(m => (
            <option key={m.model_id} value={m.model_id}>
              {m.display_name}
            </option>
          ))}
        </select>
        {!recommendation && (
          <button
            onClick={onRequestComparison}
            disabled={comparisonLoading}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: `1px solid ${LINE}`,
              background: '#FFFFFF',
              color: BODY,
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: comparisonLoading ? 'wait' : 'pointer'
            }}
          >
            {comparisonLoading ? 'Backtesting…' : 'Compare models on held-out history'}
          </button>
        )}
      </div>

      {/* ── Model comparison: which model performed better on held-out history ── */}
      {recommendation && (
        <div style={{ padding: '0 18px 14px' }}>
          <div style={{ ...eyebrow, marginBottom: 6 }}>Measured on held-out history</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', minWidth: 380 }}>
              <thead>
                <tr style={{ color: MUTED, textAlign: 'left' }}>
                  <th style={{ padding: '4px 8px 4px 0', fontWeight: 600 }}>Model</th>
                  <th style={{ padding: '4px 8px', fontWeight: 600, textAlign: 'right' }}>Error (MASE)</th>
                  <th style={{ padding: '4px 8px', fontWeight: 600, textAlign: 'right' }}>Range covered</th>
                  <th style={{ padding: '4px 0 4px 8px', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recommendation.comparison.entries.map(e => {
                  const isSelected = e.model_id === execution.model_id;
                  const isBest = e.model_id === recommendation.comparison.best_model_id;
                  return (
                    <tr key={e.model_id} style={{ borderTop: `1px solid ${HAIRLINE}` }}>
                      <td style={{ padding: '6px 8px 6px 0', color: INK, fontWeight: isSelected ? 700 : 500 }}>
                        {e.display_name}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: BODY, fontVariantNumeric: 'tabular-nums' }}>
                        {e.metrics?.mase !== null && e.metrics?.mase !== undefined ? e.metrics.mase.toFixed(3) : '—'}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: BODY, fontVariantNumeric: 'tabular-nums' }}>
                        {pct(e.metrics?.interval_coverage, 0)}
                      </td>
                      <td style={{ padding: '6px 0 6px 8px' }}>
                        <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                          {isSelected && (
                            <span style={{ fontSize: '0.625rem', fontWeight: 700, color: DEMAND, background: '#E0F2FE', padding: '1px 6px', borderRadius: 4 }}>
                              Selected
                            </span>
                          )}
                          {isBest && (
                            <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#065F46', background: '#D1FAE5', padding: '1px 6px', borderRadius: 4 }}>
                              Recommended
                            </span>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: '0.6875rem', color: FAINT, marginTop: 6, lineHeight: 1.5 }}>
            {recommendation.comparison.basis} Below 1 beats repeating last week.
          </div>
        </div>
      )}

      {/* ── Everything an analyst or architect might need, one click away and no further ── */}
      <div style={{ borderTop: `1px solid ${HAIRLINE}`, padding: '10px 18px 14px' }}>
        <button
          onClick={() => setShowEvidence(v => !v)}
          aria-expanded={showEvidence}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: MUTED,
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}
        >
          <ChevronRight size={13} style={{ transform: showEvidence ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s' }} />
          {showEvidence ? 'Hide model evidence' : 'Model evidence, calibration and provenance'}
        </button>

        {showEvidence && (
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
            <div style={{ background: SUNKEN, border: `1px solid ${LINE}`, borderRadius: 8, padding: 12, fontSize: '0.6875rem', color: MUTED, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, color: INK, fontSize: '0.75rem', marginBottom: 6 }}>What ran</div>
              <div>
                Implementation <code>{execution.implementation_ref}</code>
              </div>
              <div>
                Runtime {execution.runtime.replace(/_/g, ' ')} · version {execution.model_version} · execution{' '}
                <code>{execution.execution_id}</code>
              </div>
              <div style={{ marginTop: 4 }}>{execution.fit.method.replace(/\.$/, '')}.</div>
              {Object.keys(execution.fit.estimated_parameters).length > 0 ? (
                <div style={{ marginTop: 4 }}>
                  Fitted{' '}
                  {Object.entries(execution.fit.estimated_parameters)
                    .map(([k, v]) => `${k} ${Number(v).toFixed(3)}`)
                    .join(' · ')}{' '}
                  over {execution.fit.candidates_evaluated} candidates.
                </div>
              ) : (
                <div style={{ marginTop: 4 }}>This model estimates no parameters, and says so.</div>
              )}
              <div style={{ marginTop: 4 }}>
                Residual sigma {execution.fit.residual_sigma} over {execution.fit.residual_count} one-step residuals.
              </div>
            </div>

            <div style={{ background: SUNKEN, border: `1px solid ${LINE}`, borderRadius: 8, padding: 12, fontSize: '0.6875rem', color: MUTED, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, color: INK, fontSize: '0.75rem', marginBottom: 6 }}>What it was fitted on</div>
              <div>
                {provenance.observation_count} daily observations, {provenance.first_period} to {provenance.last_period}.
              </div>
              <div>
                Source <code>{provenance.source}</code> · measure {provenance.measure} · scope{' '}
                {Object.entries(provenance.scope)
                  .map(([k, v]) => `${k}=${v}`)
                  .join(', ')}
              </div>
              <div style={{ marginTop: 4 }}>
                {provenance.excluded_periods.length === 0
                  ? 'No period was excluded: every day in the window carries data.'
                  : `${provenance.excluded_periods.length} period(s) excluded and published as exclusions — an absent day is not a zero.`}
              </div>
              {provenance.synthetic_demo && (
                <div style={{ marginTop: 4, color: '#92400E' }}>Synthetic demonstration data.</div>
              )}
            </div>

            <div style={{ background: SUNKEN, border: `1px solid ${LINE}`, borderRadius: 8, padding: 12, fontSize: '0.6875rem', color: MUTED, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, color: INK, fontSize: '0.75rem', marginBottom: 6 }}>Backtest</div>
              {backtest ? (
                <>
                  <div>
                    {backtest.folds} rolling origins · {backtest.points_scored} points scored at horizon {backtest.horizon}.
                  </div>
                  <div style={{ marginTop: 4 }}>
                    MASE {backtest.mase ?? '—'} · RMSE {Math.round(backtest.rmse).toLocaleString('en-GB')} · sMAPE{' '}
                    {backtest.smape.toFixed(1)}%
                  </div>
                  <div style={{ marginTop: 4 }}>
                    Model-implied range covered {pct(backtest.interval_coverage, 1)} of held-out actuals.
                  </div>
                </>
              ) : (
                <div>No backtest was run for this projection.</div>
              )}
            </div>

            <div style={{ background: SUNKEN, border: `1px solid ${LINE}`, borderRadius: 8, padding: 12, fontSize: '0.6875rem', color: MUTED, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, color: INK, fontSize: '0.75rem', marginBottom: 6 }}>Range calibration</div>
              {calibration ? (
                <>
                  <div>{calibration.basis}</div>
                  <div style={{ marginTop: 4 }}>
                    Factor <strong style={{ color: calibrated ? GOOD : MUTED }}>×{calibration.multiplier}</strong> from{' '}
                    {calibration.sample_size} held-out points over {calibration.folds} folds.
                  </div>
                  <div style={{ marginTop: 4 }}>
                    Target {pct(calibration.target_coverage)} · model-implied {pct(calibration.model_implied_coverage, 1)} ·
                    calibrated {pct(calibration.calibrated_coverage_in_sample, 1)} on the calibration sample ·{' '}
                    <strong style={{ color: BODY }}>held-out {pct(calibration.held_out_coverage, 1)}</strong>.
                  </div>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 16 }}>
                    {calibration.limitations.map((l, i) => (
                      <li key={i} style={{ marginTop: 2 }}>
                        {l}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div>No calibration was attempted, because no backtest ran for this projection.</div>
              )}
            </div>

            <div style={{ background: SUNKEN, border: `1px solid ${LINE}`, borderRadius: 8, padding: 12, fontSize: '0.6875rem', color: MUTED, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, color: INK, fontSize: '0.75rem', marginBottom: 6 }}>What this model is not</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {(declaration?.limitations ?? []).map((l, i) => (
                  <li key={i} style={{ marginTop: 2 }}>
                    {l}
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 6 }}>{execution.provenance.not_learning}</div>
            </div>

            <div style={{ background: SUNKEN, border: `1px solid ${LINE}`, borderRadius: 8, padding: 12, fontSize: '0.6875rem', color: MUTED, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, color: INK, fontSize: '0.75rem', marginBottom: 6 }}>Diagnostics</div>
              {execution.validation.diagnostics.map(d => (
                <div key={d.check} style={{ marginTop: 3 }}>
                  <span style={{ color: d.passed ? GOOD : '#B45309', fontWeight: 700 }}>{d.passed ? 'pass' : 'flag'}</span>{' '}
                  <code>{d.check}</code> — {d.detail}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
