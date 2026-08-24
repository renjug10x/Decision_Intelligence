'use client';

/**
 * FM-01 — the Demand & Forecast visual.
 *
 * Built in the same visual grammar as the Continuous Live Decision Twin (`ContinuousFlightTimeline`),
 * because the two surfaces are two halves of one product and a planner should not have to learn the
 * chart twice. The grammar, in the order a reader meets it:
 *
 *   1. the predicted half of the horizon is **hatched** before any line is read;
 *   2. a labelled **TODAY** divider separates what happened from what has not;
 *   3. observed history is a **solid** stroke with points; the forecast is **dashed** and carries no
 *      points, because a point mark reads as a measurement;
 *   4. the forecast range is a filled band, drawn behind every line;
 *   5. the decision layer — what we can serve, and the gap — is a separate switch, because the
 *      question *"what will demand do"* and the question *"can we serve it"* are answered by
 *      different lines and asking both at once is how a chart becomes a picture.
 *
 * It renders. Every number arrives computed: nothing here derives, adjusts or rounds a quantity into
 * existence.
 */

import React from 'react';

export interface ChartForecastPoint {
  date: string;
  value: number;
  lower: number | null;
  upper: number | null;
}

export type ChartRangeBasis = 'EMPIRICALLY_CALIBRATED' | 'MODEL_IMPLIED' | 'NONE';

export interface DemandForecastChartProps {
  history: { date: string; value: number }[];
  forecast: ChartForecastPoint[];
  /**
   * The model's own expectation before any declared commercial assumption, aligned with `forecast`.
   * Drawn only where it differs, because the gap between the two lines is exactly the part of the
   * outlook a person assumed rather than the part the data supports — and that is the most useful
   * thing this chart can show a planner who has just moved a slider.
   */
  baseline?: (number | null)[] | null;
  rangeBasis: ChartRangeBasis;
  /** Decision layer, aligned index-for-index with `forecast`. Null entries are simply not drawn. */
  emerging?: (number | null)[] | null;
  executable?: (number | null)[] | null;
  simulated?: (number | null)[] | null;
  showDecisionLayer: boolean;
  /** How to print a value on an axis or in a label. */
  format: (v: number) => string;
  /** The day the Decision Window closes, if one is declared. */
  decisionWindowDate?: string | null;
  activeDate: string | null;
  onActiveDate: (date: string | null) => void;
  height?: number;
}

const INK = '#0F172A';
const MUTED = '#64748B';
const FAINT = '#94A3B8';
const LINE = '#E2E8F0';
const OBSERVED = '#334155';
const FORECAST = '#0284C7';
const CAPACITY = '#D97706';
const GOOD = '#059669';

/**
 * The viewBox is sized so the chart renders at roughly 1:1 in its card at desktop widths. A wider
 * viewBox scaled down looks identical in shape and renders its axis labels two points smaller than
 * everything around them, which is how a chart quietly stops being readable.
 */
const W = 740;
const PAD = { top: 20, right: 16, bottom: 30, left: 56 };

export default function DemandForecastChart({
  history,
  forecast,
  baseline,
  rangeBasis,
  emerging,
  executable,
  simulated,
  showDecisionLayer,
  format,
  decisionWindowDate,
  activeDate,
  onActiveDate,
  height = 300
}: DemandForecastChartProps) {
  const H = height;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const n = history.length + forecast.length;
  if (n < 2) {
    return (
      <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, fontSize: '0.8125rem' }}>
        Not enough data to draw a horizon.
      </div>
    );
  }

  const values: number[] = [];
  for (const h of history) values.push(h.value);
  for (const f of forecast) {
    values.push(f.value);
    if (f.lower !== null) values.push(f.lower);
    if (f.upper !== null) values.push(f.upper);
  }
  if (showDecisionLayer) {
    for (const list of [emerging, executable, simulated]) {
      for (const v of list ?? []) if (v !== null && v !== undefined) values.push(v);
    }
  }
  for (const v of baseline ?? []) if (v !== null && v !== undefined) values.push(v);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = rawMax - rawMin || Math.abs(rawMax) || 1;
  const yMin = Math.max(0, rawMin - span * 0.16);
  const yMax = rawMax + span * 0.16;

  const x = (i: number) => PAD.left + (i / (n - 1)) * plotW;
  const y = (v: number) => PAD.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  const histIdx = (i: number) => i;
  const foreIdx = (i: number) => history.length + i;

  const line = (pts: Array<{ i: number; v: number }>) =>
    pts.length === 0 ? '' : pts.map((p, k) => `${k === 0 ? 'M' : 'L'} ${x(p.i)} ${y(p.v)}`).join(' ');

  const observedPts = history.map((h, i) => ({ i: histIdx(i), v: h.value }));
  const lastObserved = observedPts[observedPts.length - 1];

  /** The forecast line is joined to the last observed day so the horizon reads as continuous. */
  const forecastPts = [
    ...(lastObserved ? [lastObserved] : []),
    ...forecast.map((f, i) => ({ i: foreIdx(i), v: f.value }))
  ];

  const bandPts = forecast
    .map((f, i) => ({ i: foreIdx(i), lo: f.lower, hi: f.upper }))
    .filter(p => p.lo !== null && p.hi !== null) as Array<{ i: number; lo: number; hi: number }>;
  const bandPath =
    bandPts.length > 1
      ? `${bandPts.map((p, k) => `${k === 0 ? 'M' : 'L'} ${x(p.i)} ${y(p.hi)}`).join(' ')} ` +
        `${[...bandPts].reverse().map(p => `L ${x(p.i)} ${y(p.lo)}`).join(' ')} Z`
      : '';

  const layerPts = (list: (number | null)[] | null | undefined) =>
    !list
      ? []
      : (list
          .map((v, i) => (v === null || v === undefined ? null : { i: foreIdx(i), v }))
          .filter(Boolean) as Array<{ i: number; v: number }>);

  const baselinePts = baseline ? layerPts(baseline) : [];
  const emergingPts = showDecisionLayer ? layerPts(emerging) : [];
  const executablePts = showDecisionLayer ? layerPts(executable) : [];
  const simulatedPts = showDecisionLayer ? layerPts(simulated) : [];

  /**
   * The gap shading. Demand we cannot serve is shaded as exposure; spare capacity is shaded as
   * headroom. Filling both the same colour would render slack as if it were a shortfall — the
   * distinction the previous Chart.js build made with `above`/`below` and which is kept here.
   */
  const gapPath =
    emergingPts.length > 1 && executablePts.length === emergingPts.length
      ? `${emergingPts.map((p, k) => `${k === 0 ? 'M' : 'L'} ${x(p.i)} ${y(p.v)}`).join(' ')} ` +
        `${[...executablePts].reverse().map(p => `L ${x(p.i)} ${y(p.v)}`).join(' ')} Z`
      : '';
  const exposed =
    emergingPts.length > 0 && executablePts.length > 0
      ? emergingPts.reduce((a, p, k) => a + (p.v - (executablePts[k]?.v ?? p.v)), 0) > 0
      : false;

  const todayX = history.length > 0 ? x(history.length - 1) : null;

  const windowIdx = decisionWindowDate
    ? forecast.findIndex(f => f.date >= decisionWindowDate.slice(0, 10))
    : -1;
  const windowX = windowIdx >= 0 ? x(foreIdx(windowIdx)) : null;

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / ticks);

  const allDates = [...history.map(h => h.date), ...forecast.map(f => f.date)];
  const step = n > 28 ? 4 : n > 16 ? 3 : 2;
  const activeIdx = activeDate ? allDates.indexOf(activeDate) : -1;

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', minWidth: 460, height: 'auto', display: 'block' }}
        role="img"
        aria-label={
          `${history.length} observed days followed by ${forecast.length} forecast days. ` +
          (rangeBasis === 'EMPIRICALLY_CALIBRATED'
            ? 'The shaded band is the calibrated forecast range.'
            : rangeBasis === 'MODEL_IMPLIED'
              ? 'The shaded band is the model-implied forecast range.'
              : 'No forecast range is published.')
        }
        onMouseLeave={() => onActiveDate(null)}
      >
        <defs>
          <pattern id="fm-predicted" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width="7" height="7" fill="#F8FAFC" />
            <line x1="0" y1="0" x2="0" y2="7" stroke="#E2E8F0" strokeWidth="2.5" />
          </pattern>
        </defs>

        {/* Predicted region — legible as "not observed" before a line is read */}
        {todayX !== null && (
          <rect x={todayX} y={PAD.top} width={W - PAD.right - todayX} height={plotH} fill="url(#fm-predicted)" />
        )}

        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={y(t)} x2={W - PAD.right} y2={y(t)} stroke={LINE} strokeWidth="1" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="10.5" fill={MUTED}>
              {format(t)}
            </text>
          </g>
        ))}

        {/* Forecast range, behind everything */}
        {bandPath && <path d={bandPath} fill={FORECAST} fillOpacity={rangeBasis === 'EMPIRICALLY_CALIBRATED' ? 0.13 : 0.07} stroke="none" />}

        {/* Decision gap */}
        {showDecisionLayer && gapPath && (
          <path d={gapPath} fill={exposed ? '#DC2626' : GOOD} fillOpacity={exposed ? 0.1 : 0.07} stroke="none" />
        )}

        {/* Observed — solid, with points */}
        <path d={line(observedPts)} fill="none" stroke={OBSERVED} strokeWidth="2.2" />
        {observedPts.map(p => (
          <circle key={`o-${p.i}`} cx={x(p.i)} cy={y(p.v)} r="2.4" fill="#FFFFFF" stroke={OBSERVED} strokeWidth="1.5" />
        ))}

        {/* The model's own expectation, before anything was assumed on top of it */}
        {baselinePts.length > 1 && (
          <path
            d={line(lastObserved ? [lastObserved, ...baselinePts] : baselinePts)}
            fill="none"
            stroke={MUTED}
            strokeWidth="1.4"
            strokeDasharray="2 4"
          />
        )}

        {/* Forecast — dashed, no points */}
        <path d={line(forecastPts)} fill="none" stroke={FORECAST} strokeWidth="2.4" strokeDasharray="6 5" />

        {showDecisionLayer && emergingPts.length > 1 && (
          <path d={line(emergingPts)} fill="none" stroke={FORECAST} strokeWidth="1.4" strokeOpacity="0.55" />
        )}
        {showDecisionLayer && executablePts.length > 1 && (
          <path d={line(executablePts)} fill="none" stroke={CAPACITY} strokeWidth="2" strokeDasharray="7 4" />
        )}
        {showDecisionLayer && simulatedPts.length > 1 && (
          <path d={line(simulatedPts)} fill="none" stroke={GOOD} strokeWidth="2.2" strokeDasharray="2 3" />
        )}

        {/* Decision window */}
        {showDecisionLayer && windowX !== null && (
          <g>
            <line x1={windowX} y1={PAD.top} x2={windowX} y2={PAD.top + plotH} stroke={FAINT} strokeWidth="1" strokeDasharray="2 3" />
            <text
              x={windowX > W - PAD.right - 120 ? windowX - 5 : windowX + 5}
              y={PAD.top + 11}
              textAnchor={windowX > W - PAD.right - 120 ? 'end' : 'start'}
              fontSize="9.5"
              fontWeight="600"
              fill={MUTED}
            >
              decision window closes
            </text>
          </g>
        )}

        {/* TODAY */}
        {todayX !== null && (
          <g>
            <line x1={todayX} y1={PAD.top - 4} x2={todayX} y2={PAD.top + plotH} stroke={INK} strokeWidth="1.5" strokeDasharray="3 3" />
            <rect x={todayX - 24} y={PAD.top - 17} width="48" height="15" rx="3" fill={INK} />
            <text x={todayX} y={PAD.top - 6} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#FFFFFF">
              TODAY
            </text>
          </g>
        )}

        {/* Selected day */}
        {activeIdx >= 0 && (
          <line
            x1={x(activeIdx)}
            y1={PAD.top}
            x2={x(activeIdx)}
            y2={PAD.top + plotH}
            stroke={INK}
            strokeWidth="1"
            strokeOpacity="0.28"
          />
        )}

        {/* X labels */}
        {allDates.map((d, i) =>
          i % step === 0 || i === n - 1 ? (
            <text key={d} x={x(i)} y={H - 10} textAnchor="middle" fontSize="9.5" fill={i >= history.length ? FAINT : MUTED}>
              {d.slice(5)}
            </text>
          ) : null
        )}

        {/* Hit targets — one per day, so hovering anywhere in the column selects it */}
        {allDates.map((d, i) => (
          <rect
            key={`hit-${d}`}
            x={x(i) - plotW / (n - 1) / 2}
            y={PAD.top}
            width={plotW / (n - 1)}
            height={plotH}
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => onActiveDate(d)}
            onFocus={() => onActiveDate(d)}
            onClick={() => onActiveDate(d)}
          />
        ))}
      </svg>
    </div>
  );
}
