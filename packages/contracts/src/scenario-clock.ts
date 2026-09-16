/**
 * CogniX Scenario Clock (ADR-078)
 * ───────────────────────────────────────────────────────────────────────────────
 * THE clock for deterministic scenario evidence. Civil wall-clock time does not enter
 * the modelled world.
 *
 * What was wrong before this module
 * ---------------------------------
 * `canonicalScenarioNowIso()` already existed, was already correct, and already stated
 * the rule in its own comment — the clock is anchored to the demand history the journey
 * is reading, "never to civil time, so the demonstration never goes stale and never
 * drifts between surfaces." The signal fabric did not obey it. Two consecutive identical
 * `GET /api/v1/signals` calls returned byte-identical values and differed only in
 * `observed_at` and `effective_at`, which were stamped `new Date()`. The scenario clock
 * read `2026-06-03T00:00:00.000Z`; the signals read the wall clock.
 *
 * Two consequences, both live: signal freshness was meaningless because every signal was
 * permanently zero seconds old, and the Observability Refresh control appeared inert
 * because the only field that moved was the one field that should never move.
 *
 * The test that decides which clock a value takes (ADR-078 part 2)
 * ---------------------------------------------------------------
 *   If the value describes the MODELLED WORLD    → scenario time (this module).
 *   If the value describes the RUNNING PLATFORM  → civil time (`new Date()`).
 *
 * Server receipts, journey telemetry ingestion, audit records and operational health
 * readings describe when the platform did something and keep wall-clock time. A record
 * that is genuinely both carries both, named.
 *
 * Scope note. This module establishes the clock CONTRACT and the correct binding. The
 * Refresh semantics that advance a scenario's as-at marker belong to `SCI-05`/ADR-081
 * and are deliberately not implemented here.
 */

import { SimulationPeriod } from './enterprise-signal-model';

const MS_PER_DAY = 86_400_000;

/**
 * The minimum a value needs to carry for the clock to read it: its own last observed
 * day. Declared as a structural type rather than as `CanonicalScenario` so the clock has
 * no dependency on the scenario record and the scenario record can depend on the clock.
 */
export interface ScenarioClockBasis {
  calendar: {
    observed_history_end_date: string;
  };
}

/**
 * Midnight UTC on the scenario's last observed day — the instant every window on the
 * journey is measured from.
 */
export function scenarioNowIso(scenario: ScenarioClockBasis): string {
  return `${scenario.calendar.observed_history_end_date}T00:00:00.000Z`;
}

/** The scenario clock as milliseconds since the epoch. */
export function scenarioNowMs(scenario: ScenarioClockBasis): number {
  return Date.parse(scenarioNowIso(scenario));
}

/** A date `daysAfterNow` days along the scenario clock, as an ISO instant. */
export function scenarioDateIso(scenario: ScenarioClockBasis, daysAfterNow: number): string {
  return new Date(scenarioNowMs(scenario) + daysAfterNow * MS_PER_DAY).toISOString();
}

/**
 * Day offsets from the scenario clock for every `SimulationPeriod`.
 *
 * The period labels have always MEANT days relative to Today; this states it once so
 * `T-90` is ninety scenario days before the scenario's own Today on every machine, in
 * every timezone, on every run, in September and in March (ADR-078 part 3).
 */
export const SIMULATION_PERIOD_DAY_OFFSETS: Readonly<Record<SimulationPeriod, number>> = {
  'T-90': -90,
  'T-30': -30,
  'T-7': -7,
  'T-5': -5,
  'T-3': -3,
  'T-2': -2,
  'T-1': -1,
  Today: 0,
  'T+1': 1,
  'T+3': 3,
  'T+7': 7,
  'T+30': 30
};

/** Day offset from the scenario clock for a simulation period. */
export function simulationPeriodDayOffset(period: SimulationPeriod): number {
  return SIMULATION_PERIOD_DAY_OFFSETS[period] ?? 0;
}

/** The scenario-clock instant a simulation period falls on. */
export function scenarioPeriodInstantIso(
  scenario: ScenarioClockBasis,
  period: SimulationPeriod
): string {
  return scenarioDateIso(scenario, simulationPeriodDayOffset(period));
}

/**
 * Day offsets for the coarser `TemporalPeriod` labels the enterprise world families use.
 * Stated here so the two period vocabularies resolve against one clock rather than two.
 */
export const TEMPORAL_PERIOD_DAY_OFFSETS: Readonly<Record<string, number>> = {
  'T-90': -90,
  'T-30': -30,
  'T-7': -7,
  Today: 0,
  'T+7': 7,
  'T+30': 30
};

/**
 * How old an observation is, in scenario days, at the scenario's own Today.
 *
 * This is the field that was permanently zero. A signal observed at `T-5` is five
 * scenario days old — demonstrably, repeatably, and on any machine.
 */
export function scenarioFreshnessDays(scenario: ScenarioClockBasis, observedAtIso: string): number {
  const observed = Date.parse(observedAtIso);
  if (!Number.isFinite(observed)) return Number.NaN;
  return (scenarioNowMs(scenario) - observed) / MS_PER_DAY;
}

/** Whether an ISO instant falls at or before the scenario's own Today. */
export function isWithinScenarioPast(scenario: ScenarioClockBasis, iso: string): boolean {
  const t = Date.parse(iso);
  return Number.isFinite(t) && t <= scenarioNowMs(scenario);
}

/**
 * A window on the scenario clock, inclusive of both endpoints.
 *
 * Inclusive because a promotion running 04 June to 17 June is fourteen days of trading,
 * not thirteen — counting it exclusively put the campaign one day short of the forecast
 * horizon it is supposed to be answering.
 */
export function scenarioWindow(
  scenario: ScenarioClockBasis,
  startDayOffset: number,
  durationDays: number
): { start_iso: string; end_iso: string } {
  return {
    start_iso: scenarioDateIso(scenario, startDayOffset),
    end_iso: scenarioDateIso(scenario, startDayOffset + durationDays - 1)
  };
}

/**
 * The civil-time reading, named so that a deliberate use of it is legible in review and
 * an accidental one is not. Use this for server receipts, telemetry ingestion, audit
 * records and platform health — never for scenario evidence.
 */
export function platformReceiptNowIso(): string {
  return new Date().toISOString();
}
