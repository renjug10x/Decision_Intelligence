'use client';

/**
 * The Demand & Forecast decision narrative — what changed, and why.
 *
 * This states the outlook as a business story rather than as an engine decomposition. Every
 * figure below is read from the governed `DemandDecisionFrontierEvaluation`; nothing is invented
 * and no attribution percentage is manufactured where the engine does not produce one.
 *
 * The attribution identity this relies on is the frontier's own, on its own shared denominator
 * (`base_demand_units`):
 *
 *   underlying trend  = baseline_demand_units      → pp above base
 *   planned promotion = contextualised − baseline  → pp above base
 *   observed evidence = emerging − contextualised  → pp above base
 *   ───────────────────────────────────────────────────────────────
 *   sum                                            = emerging_frontier_pct
 *
 * `baseline_demand_units` is defined by the engine as the same projection with commercial
 * promotion removed, so the middle term is genuinely the promotion's contribution to emerging
 * demand — the Promotion → Demand link, not a restatement of the slider.
 */

import { DemandDecisionFrontierEvaluation } from '@/packages/contracts/src/index';
import { demandLabel, deriveOutlookContributors } from '@/lib/demand-decision-language';

const C = {
  ink: '#0F172A', body: '#334155', muted: '#64748B', faint: '#94A3B8',
  line: '#E2E8F0', hairline: '#F1F5F9', surface: '#FFFFFF', sunken: '#F8FAFC',
  demand: '#0284C7', capacity: '#D97706', risk: '#DC2626', good: '#059669'
};

const fmtPp = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}pp`;
const fmtInt = (v: number) => Math.round(v).toLocaleString();
const fmtMoney = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `£${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 1000) return `£${(v / 1000).toFixed(1)}K`;
  return `£${Math.round(v).toLocaleString()}`;
};

interface Props {
  evaluation: DemandDecisionFrontierEvaluation;
  /** The gap currently on screen — the simulated one while a simulation is active. */
  gap: DemandDecisionFrontierEvaluation['decision_gap'];
  promotionDepthPct: number;
  horizonDays: number;
  simulationActive: boolean;
  /** The declared scenario event, so the baseline contributor can name it. */
  scenarioEvent?: string;
}

/**
 * The lead of the Demand & Forecast surface: one sentence on what moved, the ranked reasons it
 * moved, and one line on what that costs the business. The quantified consequence, the
 * recommendation and its expected impact follow in the cards and action bar beneath.
 */
export default function DemandDecisionNarrative({
  evaluation, gap, promotionDepthPct, horizonDays, simulationActive, scenarioEvent
}: Props) {
  const f = evaluation.demand_frontier;
  const stability = evaluation.forecast_stability;
  const contributors = deriveOutlookContributors(evaluation, promotionDepthPct, scenarioEvent);
  const strongest = contributors[0];
  const outlookPct = f.emerging_frontier_pct;
  const unitsAboveBase = Math.max(0, f.emerging_demand_units - f.base_demand_units);
  const maxPp = contributors.reduce((m, c) => Math.max(m, Math.abs(c.pp)), 0) || 1;

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10,
      boxShadow: '0 1px 2px rgba(15,23,42,0.03)', padding: '18px 22px', marginBottom: 12
    }}>
      {/* ── What changed ── */}
      <div style={{
        fontSize: '0.6875rem', color: C.muted, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6
      }}>
        What changed
      </div>

      <div style={{
        fontSize: '1.0625rem', fontWeight: 700, color: C.ink,
        letterSpacing: '-0.01em', lineHeight: 1.4, maxWidth: 760
      }}>
        Expected demand is running{' '}
        <span style={{ color: outlookPct >= 0 ? C.demand : C.capacity }}>
          {outlookPct >= 0 ? '+' : '−'}{Math.abs(outlookPct).toFixed(1)}%
        </span>{' '}
        above the un-promoted base over the next {horizonDays} days
        {strongest ? <>, led by {strongest.label.toLowerCase()}</> : null}.
      </div>

      <div style={{ fontSize: '0.75rem', color: C.muted, marginTop: 5 }}>
        {fmtInt(unitsAboveBase)} units above a base of {fmtInt(f.base_demand_units)}
        {simulationActive ? ' · figures below reflect the modelled intervention' : ''}
      </div>

      {/* ── Why ── */}
      {contributors.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{
            fontSize: '0.6875rem', color: C.muted, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8
          }}>
            Why
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {contributors.map(c => (
              <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 210, flex: '1 1 210px' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: C.ink }}>
                    {c.label}
                    {c.qualifier && (
                      <span style={{ fontWeight: 400, color: C.muted }}> · {c.qualifier}</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: C.faint, marginTop: 1, lineHeight: 1.4 }}>
                    {c.detail}
                  </div>
                </div>

                {/* Proportional bar — relative weight at a glance, never a second number to read. */}
                <div style={{
                  flex: '2 1 160px', height: 6, background: C.hairline,
                  borderRadius: 3, overflow: 'hidden', minWidth: 90
                }}>
                  <div style={{
                    width: `${Math.min(100, (Math.abs(c.pp) / maxPp) * 100)}%`, height: '100%',
                    background: c.key === 'promotion' ? C.demand : c.key === 'observed' ? C.good : C.faint,
                    borderRadius: 3
                  }} />
                </div>

                <div style={{
                  fontSize: '0.8125rem', fontWeight: 700, color: C.ink,
                  minWidth: 62, textAlign: 'right'
                }}>
                  {fmtPp(c.pp)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── What it affects — one line, handing off to the measures beneath ── */}
      <div style={{
        marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.hairline}`,
        fontSize: '0.8125rem', color: C.body, lineHeight: 1.6
      }}>
        <span style={{ fontWeight: 600, color: C.ink }}>What it affects: </span>
        {gap.exposed_demand_units > 0 ? (
          <>
            we can serve {fmtInt(gap.executable_demand_units)} of the {fmtInt(gap.emerging_demand_units)} units
            now expected, leaving a Decision Gap of {gap.exposed_demand_pp.toFixed(1)}pp —{' '}
            <strong style={{ color: C.risk }}>{fmtMoney(gap.revenue_at_risk_gbp)}</strong> of revenue and{' '}
            {fmtMoney(gap.margin_at_risk_gbp)} of gross margin exposed. The forecast itself is{' '}
            {demandLabel('stability_state', stability.stability_state).toLowerCase()}.
          </>
        ) : (
          <>
            executable capacity still covers the demand now expected, so no Decision Gap is open.
            The forecast itself is {demandLabel('stability_state', stability.stability_state).toLowerCase()}.
          </>
        )}
      </div>
    </div>
  );
}
