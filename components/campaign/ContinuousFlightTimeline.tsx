'use client';

/**
 * CTW-01 — the continuous campaign timeline.
 *
 * One horizon, three declared classes, never blended (ADR-070). The elapsed and remaining
 * halves of the horizon are drawn with different strokes, on different backgrounds, in
 * different colours, and are separated by a labelled TODAY divider — because the one failure
 * this surface must not have is a prediction that reads as an observation.
 *
 * It renders. It does not compute: every value here comes from the CTW-01 projection, whose
 * expectation is the CDI-05 projection bound by the activated decision contract.
 */

import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Eye,
  Info,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Minus
} from 'lucide-react';
import {
  CampaignFlightProjection,
  ContinuousLensSeries,
  DayAttention,
  FlightLens
} from '@/packages/contracts/src/campaign-continuous-timeline-model';

const ATTENTION_STYLE: Record<DayAttention, { bg: string; border: string; text: string; label: string }> = {
  NONE: { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', label: 'Tracking to plan' },
  MONITOR: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', label: 'Monitor' },
  ATTENTION: { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', label: 'Needs attention' }
};

const BLUE = '#2563EB';
const VIOLET = '#7C3AED';
const SLATE = '#0F172A';
const MUTED = '#64748B';
const LINE = '#E2E8F0';

const W = 900;
const H = 300;
const PAD = { top: 18, right: 20, bottom: 34, left: 66 };

function fmt(lens: FlightLens, v: number | null): string {
  if (v === null) return '—';
  if (lens === 'CONTRIBUTION') return `£${Math.round(v).toLocaleString('en-GB')}`;
  return Math.round(v).toLocaleString('en-GB');
}

export default function ContinuousFlightTimeline({
  flight
}: {
  flight: CampaignFlightProjection;
}) {
  const [lens, setLens] = useState<FlightLens>('DEMAND');
  /**
   * Which day the reader is inspecting. Defaults to today, because that is the day an analyst
   * arrives asking about. Hovering previews; clicking pins, so the panel can be read without
   * keeping the pointer on the chart.
   */
  const [pinnedDay, setPinnedDay] = useState<number | null>(null);
  const [hoverDay, setHoverDay] = useState<number | null>(null);
  const series: ContinuousLensSeries =
    flight.lenses.find(l => l.lens === lens) || flight.lenses[0];
  const summary = flight.deviation.find(d => d.lens === series.lens);
  const { horizon } = flight;

  const pts = series.points;
  const values: number[] = [];
  for (const p of pts) {
    if (p.expectation_value !== null) values.push(p.expectation_value);
    if (p.actual_value !== null) values.push(p.actual_value);
    if (p.expectation_lower !== null) values.push(p.expectation_lower);
    if (p.expectation_upper !== null) values.push(p.expectation_upper);
  }
  const rawMin = values.length ? Math.min(...values) : 0;
  const rawMax = values.length ? Math.max(...values) : 1;
  const span = rawMax - rawMin || Math.abs(rawMax) || 1;
  const yMin = rawMin - span * 0.18;
  const yMax = rawMax + span * 0.18;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (day: number) =>
    PAD.left + (horizon.flight_days === 1 ? plotW / 2 : ((day - 1) / (horizon.flight_days - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  const elapsed = pts.filter(p => p.horizon_class !== 'PREDICTED_REMAINING');
  const remaining = pts.filter(p => p.horizon_class === 'PREDICTED_REMAINING');
  /** The expectation line is continuous, so the dashed half starts at the last elapsed day. */
  const remainingWithJoin = elapsed.length > 0 ? [elapsed[elapsed.length - 1], ...remaining] : remaining;

  const path = (list: typeof pts, pick: (p: (typeof pts)[number]) => number | null) => {
    const seg = list.filter(p => pick(p) !== null);
    if (seg.length === 0) return '';
    return seg.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.flight_day)} ${y(pick(p) as number)}`).join(' ');
  };

  const bandPts = pts.filter(p => p.expectation_lower !== null && p.expectation_upper !== null);
  const bandPath =
    bandPts.length > 1
      ? `${bandPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.flight_day)} ${y(p.expectation_upper as number)}`).join(' ')} ` +
        `${[...bandPts].reverse().map(p => `L ${x(p.flight_day)} ${y(p.expectation_lower as number)}`).join(' ')} Z`
      : '';

  const todayX = horizon.elapsed_days > 0 ? x(horizon.elapsed_days) : null;
  const predictedFromX =
    horizon.remaining_days > 0 ? x(Math.max(1, horizon.elapsed_days || 1)) : null;

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / ticks);
  /**
   * Axis precision follows the range, not a fixed rule. A campaign whose whole horizon sits
   * inside one thousand units would otherwise print the same rounded label on every gridline,
   * which reads as a flat axis and hides the movement the chart exists to show.
   */
  const tickDecimals = (yMax - yMin) / 1000 < 4 ? 1 : 0;
  const tickLabel = (t: number) =>
    `${lens === 'CONTRIBUTION' ? '£' : ''}${(t / 1000).toFixed(tickDecimals)}k`;
  const dayStep = horizon.flight_days > 16 ? 3 : horizon.flight_days > 8 ? 2 : 1;

  const activeDay =
    hoverDay ?? pinnedDay ?? (horizon.today_flight_day > 0 ? horizon.today_flight_day : 1);
  const narrative = flight.day_narratives.find(n => n.flight_day === activeDay);
  const attentionStyle = narrative ? ATTENTION_STYLE[narrative.attention] : ATTENTION_STYLE.NONE;

  const DevIcon =
    summary?.state === 'AHEAD_OF_PLAN' ? TrendingUp : summary?.state === 'BEHIND_PLAN' ? TrendingDown : Minus;
  const devColour =
    summary?.state === 'AHEAD_OF_PLAN' ? '#047857' : summary?.state === 'BEHIND_PLAN' ? '#B91C1C' : MUTED;

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: `1px solid ${LINE}`,
        borderRadius: 12,
        padding: '20px 22px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 14,
          flexWrap: 'wrap',
          marginBottom: 14
        }}
      >
        <div>
          <h3
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: SLATE,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Activity size={17} color={BLUE} />
            Continuous campaign timeline
          </h3>
          <div style={{ fontSize: '0.8rem', color: MUTED, marginTop: 4 }}>
            Day {horizon.today_flight_day} of {horizon.flight_days} —{' '}
            <strong style={{ color: SLATE }}>{horizon.elapsed_days} elapsed</strong> and{' '}
            <strong style={{ color: SLATE }}>{horizon.remaining_days} still to come</strong>, against the
            decision that was activated.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', padding: 3, borderRadius: 8 }}>
          {(['DEMAND', 'CONTRIBUTION'] as FlightLens[]).map(id => {
            const on = lens === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setLens(id)}
                aria-pressed={on}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: on ? 700 : 500,
                  background: on ? '#FFFFFF' : 'transparent',
                  color: on ? SLATE : MUTED,
                  boxShadow: on ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                {id === 'DEMAND' ? 'Demand' : 'Contribution'}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Chart ── */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', minWidth: 480, height: 'auto', display: 'block' }}
          role="img"
          aria-label={`${series.lens} over the full campaign horizon: ${horizon.elapsed_days} elapsed days shown as simulated, ${horizon.remaining_days} remaining days shown as predicted.`}
        >
          <defs>
            <pattern id="ctw-predicted" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <rect width="7" height="7" fill="#F8FAFC" />
              <line x1="0" y1="0" x2="0" y2="7" stroke="#E2E8F0" strokeWidth="2.5" />
            </pattern>
          </defs>

          {/* Predicted region — hatched, so "not observed" is legible before any line is read */}
          {predictedFromX !== null && (
            <rect
              x={predictedFromX}
              y={PAD.top}
              width={W - PAD.right - predictedFromX}
              height={plotH}
              fill="url(#ctw-predicted)"
            />
          )}

          {/* Grid + y axis */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={PAD.left} y1={y(t)} x2={W - PAD.right} y2={y(t)} stroke={LINE} strokeWidth="1" />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="10.5" fill={MUTED}>
                {tickLabel(t)}
              </text>
            </g>
          ))}

          {/* Declared uncertainty band */}
          {bandPath && <path d={bandPath} fill={BLUE} fillOpacity="0.09" stroke="none" />}

          {/* Expectation — solid over elapsed, dashed over remaining */}
          <path d={path(elapsed, p => p.expectation_value)} fill="none" stroke={BLUE} strokeWidth="2.25" />
          <path
            d={path(remainingWithJoin, p => p.expectation_value)}
            fill="none"
            stroke={BLUE}
            strokeWidth="2.25"
            strokeDasharray="6 5"
          />

          {/* Running series — elapsed only. It stops at TODAY and is never extended. */}
          <path d={path(elapsed, p => p.actual_value)} fill="none" stroke={VIOLET} strokeWidth="2.6" />
          {elapsed
            .filter(p => p.actual_value !== null)
            .map(p => (
              <circle
                key={p.flight_day}
                cx={x(p.flight_day)}
                cy={y(p.actual_value as number)}
                r="3.4"
                fill="#FFFFFF"
                stroke={VIOLET}
                strokeWidth="2"
              />
            ))}

          {/* TODAY divider */}
          {todayX !== null && (
            <g>
              <line
                x1={todayX}
                y1={PAD.top - 4}
                x2={todayX}
                y2={PAD.top + plotH}
                stroke={SLATE}
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <rect x={todayX - 24} y={PAD.top - 16} width="48" height="15" rx="3" fill={SLATE} />
              <text x={todayX} y={PAD.top - 5} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#FFFFFF">
                TODAY
              </text>
            </g>
          )}

          {/* Selected day marker */}
          {narrative && (
            <line
              x1={x(activeDay)}
              y1={PAD.top}
              x2={x(activeDay)}
              y2={PAD.top + plotH}
              stroke={narrative.horizon_class === 'PREDICTED_REMAINING' ? BLUE : VIOLET}
              strokeWidth="1.25"
              strokeOpacity="0.55"
            />
          )}

          {/* Per-day hit targets — a full-height band per day, so a day is easy to hit */}
          {pts.map(p => {
            const half = horizon.flight_days > 1 ? plotW / (horizon.flight_days - 1) / 2 : plotW / 2;
            return (
              <rect
                key={`hit-${p.flight_day}`}
                x={x(p.flight_day) - half}
                y={PAD.top}
                width={half * 2}
                height={plotH}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoverDay(p.flight_day)}
                onMouseLeave={() => setHoverDay(null)}
                onClick={() => setPinnedDay(p.flight_day)}
              >
                <title>{`Day ${p.flight_day}`}</title>
              </rect>
            );
          })}

          {/* X axis */}
          <line x1={PAD.left} y1={PAD.top + plotH} x2={W - PAD.right} y2={PAD.top + plotH} stroke="#CBD5E1" strokeWidth="1" />
          {pts
            .filter(p => p.flight_day === 1 || p.flight_day % dayStep === 0 || p.flight_day === horizon.flight_days)
            .map(p => (
              <text
                key={p.flight_day}
                x={x(p.flight_day)}
                y={PAD.top + plotH + 15}
                textAnchor="middle"
                fontSize="10"
                fill={MUTED}
              >
                {p.flight_day}
              </text>
            ))}
          <text x={PAD.left + plotW / 2} y={H - 4} textAnchor="middle" fontSize="10" fill={MUTED}>
            Campaign day
          </text>
        </svg>
      </div>

      {/* ── Legend — names each class in words, never by colour alone ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 10, fontSize: '0.74rem', color: MUTED }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="26" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="26" y2="4" stroke={BLUE} strokeWidth="2.25" />
          </svg>
          What the activated decision expected
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="26" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="26" y2="4" stroke={VIOLET} strokeWidth="2.6" />
          </svg>
          What the campaign is running at — <em>simulated, elapsed days only</em>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="26" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="26" y2="4" stroke={BLUE} strokeWidth="2.25" strokeDasharray="5 4" />
          </svg>
          Predicted — these days have not happened
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="16" height="10" aria-hidden="true">
            <rect width="16" height="10" fill={BLUE} fillOpacity="0.09" />
          </svg>
          Declared uncertainty
        </span>
      </div>

      {/* ── Narrated day detail — derived from governed facts, never authored per day ── */}
      {narrative && (
        <div
          style={{
            marginTop: 16,
            background: attentionStyle.bg,
            border: `1px solid ${attentionStyle.border}`,
            borderRadius: 10,
            padding: '14px 16px'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', flex: 1, minWidth: 240 }}>
              {narrative.attention === 'NONE' ? (
                <Eye size={16} color={attentionStyle.text} style={{ flexShrink: 0, marginTop: 2 }} />
              ) : (
                <AlertTriangle size={16} color={attentionStyle.text} style={{ flexShrink: 0, marginTop: 2 }} />
              )}
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: SLATE }}>{narrative.headline}</div>
                <p style={{ fontSize: '0.8rem', color: '#334155', margin: '4px 0 0 0', lineHeight: 1.55 }}>
                  {narrative.statement}
                </p>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: attentionStyle.text,
                border: `1px solid ${attentionStyle.border}`,
                background: '#FFFFFF',
                padding: '3px 9px',
                borderRadius: 4,
                whiteSpace: 'nowrap'
              }}
            >
              {attentionStyle.label}
            </span>
          </div>

          <div
            style={{
              marginTop: 12,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))',
              gap: 10
            }}
          >
            {narrative.readings.map(r => (
              <div
                key={r.lens}
                style={{ background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: 8, padding: '9px 11px' }}
              >
                <div
                  style={{
                    fontSize: '0.64rem',
                    color: MUTED,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  {r.lens === 'DEMAND' ? 'Demand' : 'Contribution'}
                </div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: SLATE, marginTop: 3 }}>
                  {r.actual_value !== null ? fmt(r.lens, r.actual_value) : fmt(r.lens, r.expectation_value)}
                  {r.deviation_pct !== null && (
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        marginLeft: 6,
                        color: r.deviation_pct >= 0 ? '#047857' : '#B91C1C'
                      }}
                    >
                      {r.deviation_pct > 0 ? '+' : ''}
                      {r.deviation_pct.toFixed(1)}%
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.68rem', color: MUTED, marginTop: 2 }}>
                  {r.actual_value !== null
                    ? `expected ${fmt(r.lens, r.expectation_value)}`
                    : r.expectation_lower !== null && r.expectation_upper !== null
                      ? `${fmt(r.lens, r.expectation_lower)} – ${fmt(r.lens, r.expectation_upper)} declared range`
                      : 'projected'}
                </div>
              </div>
            ))}
            {narrative.supplementary.map(sup => (
              <div
                key={sup.label}
                style={{ background: '#FFFFFF', border: `1px dashed ${LINE}`, borderRadius: 8, padding: '9px 11px' }}
              >
                <div
                  style={{
                    fontSize: '0.64rem',
                    color: MUTED,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  {sup.label}
                </div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: SLATE, marginTop: 3 }}>{sup.value}</div>
                <div style={{ fontSize: '0.66rem', color: MUTED, marginTop: 2, lineHeight: 1.4 }}>{sup.basis}</div>
              </div>
            ))}
          </div>

          <details style={{ marginTop: 10 }}>
            <summary style={{ fontSize: '0.72rem', color: MUTED, cursor: 'pointer' }}>
              Why CogniX says this
            </summary>
            <p style={{ fontSize: '0.72rem', color: MUTED, margin: '6px 0 0 0', lineHeight: 1.5 }}>
              {narrative.attention_reason}
            </p>
            <ul style={{ fontSize: '0.7rem', color: MUTED, margin: '6px 0 0 0', paddingLeft: 18, lineHeight: 1.5 }}>
              {narrative.basis.map(b => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </details>

          <div style={{ fontSize: '0.68rem', color: MUTED, marginTop: 8 }}>
            {hoverDay !== null
              ? 'Click a day to keep it open.'
              : pinnedDay !== null
                ? 'Pinned — hover another day to preview it.'
                : 'Hover or click any day on the timeline.'}
          </div>
        </div>
      )}

      {/* ── Deviation summary ── */}
      {summary && (
        <div
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: 12
          }}
        >
          <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: '0.68rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Latest day vs expectation
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <DevIcon size={16} color={devColour} />
              <span style={{ fontSize: '1.15rem', fontWeight: 700, color: devColour }}>
                {summary.latest_deviation_pct === null
                  ? '—'
                  : `${summary.latest_deviation_pct > 0 ? '+' : ''}${summary.latest_deviation_pct.toFixed(1)}%`}
              </span>
            </div>
          </div>
          <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: '0.68rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Average across {summary.elapsed_days_assessed} elapsed {summary.elapsed_days_assessed === 1 ? 'day' : 'days'}
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: SLATE, marginTop: 4 }}>
              {summary.mean_deviation_pct === null
                ? '—'
                : `${summary.mean_deviation_pct > 0 ? '+' : ''}${summary.mean_deviation_pct.toFixed(1)}%`}
            </div>
          </div>
          <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: '0.68rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Expected on the final day
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: SLATE, marginTop: 4 }}>
              {fmt(series.lens, pts[pts.length - 1]?.expectation_value ?? null)}
            </div>
          </div>
        </div>
      )}

      {summary && (
        <p style={{ fontSize: '0.8rem', color: '#334155', marginTop: 12, marginBottom: 0, lineHeight: 1.5 }}>
          {summary.statement}
        </p>
      )}

      {/* ── Basis disclosures — the reasons, not a caveat strip ── */}
      <div
        style={{
          marginTop: 14,
          borderTop: `1px solid ${LINE}`,
          paddingTop: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 7
        }}
      >
        <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
          <ShieldCheck size={13} color={MUTED} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: '0.72rem', color: MUTED, lineHeight: 1.5 }}>
            {flight.activation.disclosure}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
          <Info size={13} color={MUTED} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: '0.72rem', color: MUTED, lineHeight: 1.5 }}>{series.disclosure}</span>
        </div>
        <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
          <Info size={13} color={MUTED} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: '0.72rem', color: MUTED, lineHeight: 1.5 }}>
            {series.uncertainty_disclosure}
          </span>
        </div>
        {series.non_correspondence_reason && (
          <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
            <Info size={13} color="#B45309" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: '0.72rem', color: '#92400E', lineHeight: 1.5 }}>
              {series.non_correspondence_reason}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
