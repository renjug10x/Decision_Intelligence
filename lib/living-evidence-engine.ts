/**
 * CogniX Living Evidence Engine — `SCI-05`, reactivating `ESF-4`
 * ───────────────────────────────────────────────────────────────────────────────
 * `signal → material change → decision relevance → observable decision consequence`, as a
 * computation rather than a caption.
 *
 * The three contracts this implements were DECLARED and frozen at Gate A in
 * `packages/contracts/src/living-evidence-contracts.ts`, and are implemented here without
 * redefining a single shape: Signal Materiality & Decision Relevance, the Refresh Operation, and
 * the Models & Methods register.
 *
 * What was already built, and is reused rather than rebuilt
 * ---------------------------------------------------------
 * ADR-081's context records that the engine for a meaningful Refresh already existed and that the
 * Observability surface simply did not call it. That remains true, so nothing here is new
 * machinery:
 *
 *   `simulateEnterpriseSignalTimelines`  `ESF-2`'s deterministic timeline generator, T-90 … T+30,
 *                                        with per-observation provenance naming the rule and drivers
 *   `evaluateForecastStability`          the governed, synchronous, pure derivation of how far
 *                                        observed evidence moves the outlook
 *   `nextSupplierCutOff`                 the Decision Window's own deadline derivation, exported
 *                                        rather than duplicated
 *   the scenario clock                   every instant, age and freshness reading (ADR-078)
 *
 * Why this is synchronous
 * -----------------------
 * `RefreshScenarioOperation` is declared `(scenarioId: string) => RefreshDelta`. That is a contract
 * commitment, not an oversight: a Refresh that had to await a fetch could not be deterministic in
 * the way ADR-081 part 3 requires. Every quantity below is therefore derived synchronously from the
 * scenario record and the governed stability engine.
 *
 * The published quantities move because EVIDENCE moves them
 * ---------------------------------------------------------
 * A scenario's record declares its expected, servable and exposed demand. Evidence does not replace
 * those — it REVISES the expectation, through the same `expected_revision_pct` the Demand frontier
 * already carries the emerging outlook forward by. So:
 *
 *   expected(evidence)  = declared expected × (1 + revision(evidence) / 100)
 *   exposed(evidence)   = max(0, expected(evidence) − declared servable)
 *   exposures, gap      = the record's own per-unit economics applied to that exposure
 *
 * One basis, the record's, moved by one governed revision. No second demand model, and no quantity
 * invented where the record is silent (ADR-073 Amendment A).
 *
 * Determinism
 * -----------
 * No `Math.random`, no civil time, no wall clock. The same scenario at the same as-at marker with
 * the same decision state and interventions produces a byte-identical result, which
 * `run-sci05-living-evidence-tests.ts` asserts rather than assumes.
 */

import {
  CanonicalScenario,
  scenarioExpectedDemandUnits,
  scenarioServableDemandUnits,
  scenarioBaseDemandUnits,
  scenarioRealisedRevenuePerUnitGbp,
  scenarioGrossMarginPerUnitGbp,
  scenarioDepthResponsePp,
  scenarioContributionAtDepthGbp
} from '../packages/contracts/src/canonical-scenario-model';
import {
  SimulationPeriod,
  ORDERED_SIMULATION_PERIODS,
  EnterpriseSignal,
  EnterpriseSignalTimeline,
  SignalSimulationContext
} from '../packages/contracts/src/enterprise-signal-model';
import {
  scenarioPeriodInstantIso,
  simulationPeriodDayOffset,
  scenarioNowIso
} from '../packages/contracts/src/scenario-clock';
import {
  MaterialQuantityId,
  MaterialQuantityMovement,
  MaterialityBand,
  SignalMateriality,
  DecisionRelevance,
  DecisionChangeKind,
  ScenarioAsAtMarker,
  RefreshDelta,
  RefreshedObservation,
  RefreshObservationChange,
  MethodsRegister,
  MethodRegisterEntry
} from '../packages/contracts/src/living-evidence-contracts';
import { ProvenanceDescriptor } from '../packages/contracts/src/provenance-vocabulary';
import { resolveScenario, getActiveScenarioId } from '../packages/contracts/src/scenario-registry';
import { withScenarioInScope } from '../packages/contracts/src/scenario-scope';
import { scenarioOpeningDecisionParameters } from '../packages/contracts/src/decision-state-model';
import { DecisionScenarioParameters } from '../packages/contracts/src/decision-state-model';
import { simulateEnterpriseSignalTimelines } from '../services/world/src/dynamic-signal-simulator';
import {
  evaluateForecastStability,
  nextSupplierCutOff
} from './demand-decision-frontier/demand-frontier-engine';
import { scenarioElasticityCurve } from './campaign-archetypes';
import { listForecastModels } from './forecast/registry';

const HOUR_MS = 3_600_000;

/**
 * The period a scenario's evidence opens at.
 *
 * `Today` on the scenario clock: everything up to and including the scenario's own now is observed,
 * and Refresh advances into the projected periods ahead of it. Opening anywhere else would mean the
 * demonstration starts by hiding evidence it already has.
 */
export const OPENING_EVIDENCE_PERIOD: SimulationPeriod = 'Today';

/**
 * Where each scenario's evidence currently stands. Server-side and in-memory, exactly like the
 * Shared Decision State store — a scenario's as-at marker is session-independent because it
 * describes the modelled world, not one reader's view of it.
 */
const asAtMarkers = new Map<string, SimulationPeriod>();

/**
 * How large a movement has to be to earn each band.
 *
 * Declared here as a constant rather than buried in a comparison, so a reader can check the
 * classification against the arithmetic it classifies — which is the whole reason ADR-081 part 5
 * makes materiality a BAND over a published movement rather than a score beside it.
 */
export const MATERIALITY_BAND_THRESHOLDS_PCT = {
  NOTABLE: 0.5,
  MATERIAL: 2,
  DECISIVE: 5
} as const;

/*
 * `ProvenanceDescriptor` is the frozen ADR-082 triple and carries no free-text field. Everything
 * here is `derived / rule / authoritative`: computed from the record and the governed engines by a
 * deterministic rule, and admissible as CogniX's own answer. The reasoning that would have gone in
 * a statement field belongs in `rationale`, `statement` and `decision_consequence_statement`, which
 * the Living Evidence contracts already provide for exactly that.
 */
const DERIVED_BY_RULE: ProvenanceDescriptor = {
  origin: 'derived',
  method: 'rule',
  authority: 'authoritative'
};

// ═══════════════════════════════════════════════════════════════════════════════
// The as-at marker
// ═══════════════════════════════════════════════════════════════════════════════

function markerFor(scenario: CanonicalScenario, period: SimulationPeriod): ScenarioAsAtMarker {
  return {
    scenario_id: scenario.identity.scenario_id,
    period,
    period_instant_iso: scenarioPeriodInstantIso(scenario, period),
    opening_period: OPENING_EVIDENCE_PERIOD
  };
}

/** Where this scenario's evidence opens. */
export function openingAsAtMarker(scenario: CanonicalScenario): ScenarioAsAtMarker {
  return markerFor(scenario, OPENING_EVIDENCE_PERIOD);
}

/** Where this scenario's evidence currently stands. */
export function currentAsAtMarker(scenarioId: string): ScenarioAsAtMarker {
  const scenario = resolveScenario(scenarioId);
  return markerFor(scenario, asAtMarkers.get(scenarioId) ?? OPENING_EVIDENCE_PERIOD);
}

/**
 * Return the scenario's evidence to its opening position exactly.
 *
 * `RestartScenarioOperation`. This is what `Restart scenario` reaches, and it is why two reads of an
 * unadvanced scenario are byte-identical (ADR-081 part 3).
 */
export function restartScenarioEvidence(scenarioId: string): ScenarioAsAtMarker {
  const scenario = resolveScenario(scenarioId);
  asAtMarkers.delete(scenarioId);
  return markerFor(scenario, OPENING_EVIDENCE_PERIOD);
}

/** Test and reset support: return every scenario's evidence to its opening position. */
export function restartAllScenarioEvidence(): void {
  asAtMarkers.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// The evidence timeline — R-30's governed successor
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The simulation context a scenario's evidence is generated under.
 *
 * Every field is the scenario's own declared opening position, so the timeline is a property of the
 * scenario rather than of whoever asked for it. That is what makes it reproducible.
 */
export function scenarioSimulationContext(
  scenario: CanonicalScenario,
  params?: DecisionScenarioParameters
): SignalSimulationContext {
  const p = params ?? withScenarioInScope(scenario, () => scenarioOpeningDecisionParameters(scenario));
  return {
    session_id: `evidence_${scenario.identity.scenario_id}`,
    decision_state_id: `evidence_${scenario.identity.scenario_id}`,
    decision_state_version: 1,
    tenant_id: 'tenant_uk_retail_01',
    scenario_id: scenario.identity.scenario_id,
    scenario_family: scenario.taxonomy.family_id,
    promotion_lift: p.promotion_lift,
    supplier_capacity_cap: p.supplier_capacity_cap,
    forecast_horizon_days: p.forecast_horizon_days,
    promotion_method: p.promotion_method,
    campaign_scope: p.campaign_scope,
    cannibalisation_factor: p.cannibalisation_factor,
    event_boost: p.event_boost,
    selected_interventions: []
  };
}

/**
 * THE evidence timeline for a scenario (`R-30`).
 *
 * `SCI-01` kept each legacy world FAMILY's `temporalData` as a scenario's declared evidence;
 * `SCI-03` stopped serving it because two of the three certified packs contradicted their family's
 * series in DIRECTION as well as scale, and recorded `R-30` rather than rescale a series it had not
 * modelled. This is the successor, and it is a different thing entirely: a per-scenario series
 * generated by `ESF-2`'s simulator FROM THAT SCENARIO'S OWN declared world, on that scenario's own
 * clock, with per-observation provenance naming the rule and the drivers that produced it.
 *
 * The legacy family series is not restored, rescaled or consulted.
 */
export function scenarioEvidenceTimelines(
  scenario: CanonicalScenario,
  params?: DecisionScenarioParameters
): EnterpriseSignalTimeline[] {
  return withScenarioInScope(scenario, () =>
    simulateEnterpriseSignalTimelines({
      context: scenarioSimulationContext(scenario, params)
    }).timelines
  );
}

/** Whether a period has been reached at a given marker. */
function periodIndex(period: SimulationPeriod): number {
  return ORDERED_SIMULATION_PERIODS.indexOf(period);
}

/**
 * The evidence OBSERVED as at a marker, flattened to the `EnterpriseSignal` shape the stability
 * engine reads. Nothing after the marker is visible — that is what an as-at marker means.
 */
export function observedEvidenceAt(
  scenario: CanonicalScenario,
  marker: SimulationPeriod,
  timelines?: EnterpriseSignalTimeline[]
): EnterpriseSignal[] {
  const lines = timelines ?? scenarioEvidenceTimelines(scenario);
  const limit = periodIndex(marker);
  const out: EnterpriseSignal[] = [];
  for (const t of lines) {
    for (const o of t.observations) {
      if (periodIndex(o.period) > limit) continue;
      out.push({
        signal_id: `${t.timeline_id}::${o.period}`,
        signal_type: t.signal_type,
        category: t.category,
        tenant_id: t.tenant_id,
        scenario_id: t.scenario_id,
        entity_type: t.entity_type,
        entity_id: t.entity_id,
        observed_at: o.observed_at,
        effective_at: o.effective_at,
        baseline_value: o.baseline_value,
        observed_value: o.observed_value,
        delta: o.delta,
        delta_pct: o.delta_pct,
        unit: o.unit,
        source_type: 'SYNTHETIC_WORLD' as EnterpriseSignal['source_type'],
        source_system: 'cognix_world_simulator',
        confidence: o.confidence,
        quality: o.quality,
        provenance: {
          rule_id: o.provenance.rule_id,
          generator_version: o.provenance.generator_version,
          period: o.period
        },
        synthetic_demo: true,
        schema_version: t.schema_version
      });
    }
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════════
// The published quantities, as evidence moves them
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lead-time drift OBSERVED in the evidence, in hours beyond the declared lead time.
 *
 * Read from the signal's own published movement rather than re-modelled: a
 * `SUPPLIER_LEAD_TIME_DRIFT` observation states its baseline and its observed value in hours, and
 * the drift is the difference. The latest observation wins, because lead time is a state and not a
 * running total.
 */
function observedLeadTimeDriftHours(evidence: EnterpriseSignal[]): number {
  const drifts = evidence.filter(s => s.signal_type === 'SUPPLIER_LEAD_TIME_DRIFT');
  if (drifts.length === 0) return 0;
  const latest = drifts.reduce((a, b) => (Date.parse(b.observed_at) >= Date.parse(a.observed_at) ? b : a));
  return Math.max(0, latest.observed_value - latest.baseline_value);
}

interface PublishedQuantity {
  value: number;
  unit: string;
  label: string;
}

/**
 * Every quantity the materiality contract names, evaluated against one body of evidence.
 *
 * The scenario record is the basis for all of them; evidence enters through ONE governed route —
 * `evaluateForecastStability`'s `expected_revision_pct`, the same revision the Demand frontier
 * carries its emerging outlook forward by. Quantities that genuinely do not move with demand
 * evidence (the declared depth response, the supply-side servable volume) are published unmoved
 * rather than given artificial movement, which is ADR-081 part 3 in a single decision.
 */
export function publishedQuantitiesAt(
  scenario: CanonicalScenario,
  marker: SimulationPeriod,
  evidence: EnterpriseSignal[],
  params: DecisionScenarioParameters
): Record<MaterialQuantityId, PublishedQuantity> {
  return withScenarioInScope(scenario, () => {
    const stability = evaluateForecastStability(params, evidence);
    const revision = stability.expected_revision_pct ?? 0;

    const declaredExpected = scenarioExpectedDemandUnits(scenario);
    const declaredServable = scenarioServableDemandUnits(scenario);
    const base = scenarioBaseDemandUnits(scenario);

    const expected = declaredExpected * (1 + revision / 100);

    /*
     * SUPPLY evidence moves the SUPPLY side, and the demand revision does not reach it.
     *
     * `DDF_STABILITY_SIGNAL_TYPES` is `DDF-01`'s declaration of which signals revise a demand
     * forecast, and it is deliberately demand-side. Routing a lead-time drift through it would have
     * been the quickest way to make every scenario's Refresh look busy, and it would have meant a
     * supplier's lateness silently editing a demand forecast — two things ADR-081 part 3 and
     * ADR-041 respectively forbid.
     *
     * What lateness genuinely changes is how much of the expected volume can be SERVED INSIDE THE
     * HORIZON. Volume that lands after the horizon closes is not servable within it. The arithmetic
     * is the scenario's own declared lead time against its own declared horizon, and it is the
     * decision the supply-constrained pack exists to pose: hold, pull early, or pay the premium.
     */
    const driftHours = observedLeadTimeDriftHours(evidence);
    const horizonDays = Math.max(1, scenario.calendar.forecast_horizon_days);
    const daysLost = Math.min(horizonDays, driftHours / 24);
    const servable = declaredServable * ((horizonDays - daysLost) / horizonDays);

    const exposed = Math.max(0, expected - servable);

    const committedDepth = scenario.economics.promotion_depth_pct;
    const curve = scenarioElasticityCurve(scenario);
    const committedPoint = curve.find(p => p.discount_pct === committedDepth) ?? curve[0];

    const asAtIso = scenarioPeriodInstantIso(scenario, marker);
    const deadlineIso = nextSupplierCutOff(asAtIso);
    const windowHours = Math.max(
      0,
      Math.round((Date.parse(deadlineIso) - Date.parse(asAtIso)) / HOUR_MS)
    );

    return {
      EXPECTED_DEMAND_UNITS: { value: Math.round(expected), unit: 'units', label: 'Expected demand' },
      SERVABLE_DEMAND_UNITS: { value: Math.round(servable), unit: 'units', label: 'Servable demand' },
      EXPOSED_DEMAND_UNITS: { value: Math.round(exposed), unit: 'units', label: 'Exposed demand' },
      REVENUE_EXPOSURE_GBP: {
        value: Math.round(exposed * scenarioRealisedRevenuePerUnitGbp(scenario)),
        unit: 'GBP',
        label: 'Revenue exposed'
      },
      MARGIN_EXPOSURE_GBP: {
        value: Math.round(exposed * scenarioGrossMarginPerUnitGbp(scenario)),
        unit: 'GBP',
        label: 'Gross margin exposed'
      },
      DECISION_GAP_PP: {
        value: base > 0 ? Number(((exposed / base) * 100).toFixed(2)) : 0,
        unit: 'pp',
        label: 'Decision Gap'
      },
      DECISION_WINDOW_HOURS: { value: windowHours, unit: 'hours', label: 'Decision Window' },
      FORECAST_STABILITY: {
        value: stability.stability_score ?? 0,
        unit: 'index',
        label: 'Forecast stability'
      },
      PROMOTION_DEPTH_RESPONSE_PP: {
        value: Number(scenarioDepthResponsePp(scenario, committedDepth).toFixed(2)),
        unit: 'pp',
        label: 'Promotion depth response'
      },
      CAMPAIGN_CONTRIBUTION_GBP: {
        value: Math.round(committedPoint?.net_contribution_delta_gbp ?? scenarioContributionAtDepthGbp(scenario, committedDepth)),
        unit: 'GBP',
        label: 'Campaign contribution'
      }
    };
  });
}

function movementsBetween(
  before: Record<MaterialQuantityId, PublishedQuantity>,
  after: Record<MaterialQuantityId, PublishedQuantity>
): MaterialQuantityMovement[] {
  const out: MaterialQuantityMovement[] = [];
  for (const key of Object.keys(after) as MaterialQuantityId[]) {
    const b = before[key];
    const a = after[key];
    if (!b || !a || b.value === a.value) continue;
    out.push({
      quantity: key,
      display_label: a.label,
      before: b.value,
      after: a.value,
      delta: Number((a.value - b.value).toFixed(4)),
      // Null rather than Infinity where there is nothing to be a percentage of.
      delta_pct: b.value === 0 ? null : Number((((a.value - b.value) / Math.abs(b.value)) * 100).toFixed(4)),
      unit: a.unit
    });
  }
  return out;
}

/** The band a set of movements earns, from the largest relative movement among them. */
export function bandFor(movements: MaterialQuantityMovement[], decisionChanged: boolean): MaterialityBand {
  if (movements.length === 0) return 'IMMATERIAL';
  /*
   * A movement that changed a DECISION is decisive whatever its size. That is not a shortcut around
   * the thresholds — it is ADR-081 part 4's distinction honoured: materiality asks how far a
   * quantity moved, and the top of that scale is reserved for a movement that reached the decision.
   */
  if (decisionChanged) return 'DECISIVE';
  const largest = movements.reduce(
    (max, m) => Math.max(max, m.delta_pct === null ? 0 : Math.abs(m.delta_pct)),
    0
  );
  if (largest >= MATERIALITY_BAND_THRESHOLDS_PCT.DECISIVE) return 'DECISIVE';
  if (largest >= MATERIALITY_BAND_THRESHOLDS_PCT.MATERIAL) return 'MATERIAL';
  if (largest >= MATERIALITY_BAND_THRESHOLDS_PCT.NOTABLE) return 'NOTABLE';
  return 'IMMATERIAL';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Materiality and decision relevance — derived, never authored
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * What ONE observation moved, by leaving it out and re-evaluating.
 *
 * ADR-081 part 4: *"A signal does not declare its own importance."* Nothing is read from a seed —
 * the quantities are computed twice, once with the whole body of evidence and once with this
 * observation removed, and the difference IS the materiality. A scenario pack has no field that
 * could set it.
 */
export function assessSignalMateriality(
  scenario: CanonicalScenario,
  signal: EnterpriseSignal,
  evidence: EnterpriseSignal[],
  marker: SimulationPeriod,
  params: DecisionScenarioParameters,
  decisionChanged = false
): SignalMateriality {
  const without = evidence.filter(s => s.signal_id !== signal.signal_id);
  const before = publishedQuantitiesAt(scenario, marker, without, params);
  const after = publishedQuantitiesAt(scenario, marker, evidence, params);
  const movements = movementsBetween(before, after);
  const band = bandFor(movements, decisionChanged);

  const largest = movements
    .slice()
    .sort((a, b) => Math.abs(b.delta_pct ?? 0) - Math.abs(a.delta_pct ?? 0))[0];

  const rationale = movements.length === 0
    ? 'This observation moved no published quantity. Immaterial is a measured answer here, not an absence of assessment.'
    : `${largest.display_label} moved from ${largest.before.toLocaleString('en-GB')} to `
      + `${largest.after.toLocaleString('en-GB')} ${largest.unit}`
      + (largest.delta_pct === null ? '' : ` (${largest.delta_pct >= 0 ? '+' : ''}${largest.delta_pct.toFixed(2)}%)`)
      + `${movements.length > 1 ? `, and ${movements.length - 1} other published quantit${movements.length === 2 ? 'y' : 'ies'} moved with it` : ''}.`;

  return {
    signal_id: signal.signal_id,
    scenario_id: scenario.identity.scenario_id,
    assessed_at_period: marker,
    movements,
    band,
    rationale,
    provenance: DERIVED_BY_RULE
  };
}

interface DecisionArtefacts {
  recommendation: string;
  window: string;
}

/**
 * The decision artefacts as they stand under one body of evidence.
 *
 * Two are genuinely derivable from demand evidence and both are published on a surface today. The
 * third kind the contract names — a readiness verdict — needs a REGISTERED campaign intent, which a
 * scenario does not have until a reader creates one; where there is none, the statement says so
 * rather than reporting `NONE` as though it had been checked.
 */
function decisionArtefactsAt(
  scenario: CanonicalScenario,
  marker: SimulationPeriod,
  evidence: EnterpriseSignal[],
  params: DecisionScenarioParameters
): DecisionArtefacts {
  const q = publishedQuantitiesAt(scenario, marker, evidence, params);
  const exposed = q.EXPOSED_DEMAND_UNITS.value;
  const gap = q.DECISION_GAP_PP.value;

  /*
   * The recommended lever, on the same rule the Demand frontier recommends one by: an exposure the
   * supply agreement cannot serve calls for capacity, and no exposure calls for none. Derived from
   * the quantities above, so it moves when they move and not otherwise.
   */
  const recommendation = exposed <= 0
    ? 'No intervention required — expected demand is within what the supply agreement can serve'
    : gap >= 10
      ? 'Serve the exposure — release supplier flex capacity'
      : 'Hold and monitor — the exposure is inside the tolerance the plan already carries';

  const hours = q.DECISION_WINDOW_HOURS.value;
  const window = hours <= 0 ? 'RESTRICTED' : hours < 24 ? 'CLOSING_SOON' : 'OPEN';

  return { recommendation, window };
}

/**
 * Whether an observation changed a DECISION — a different question from whether it moved a number.
 *
 * ADR-081 part 4. This is the field that makes *signal → material change → decision relevance* a
 * computation, and the one a reader is actually asking about when they ask whether the evidence
 * matters.
 */
export function assessDecisionRelevance(
  scenario: CanonicalScenario,
  signalId: string,
  evidenceBefore: EnterpriseSignal[],
  evidenceAfter: EnterpriseSignal[],
  marker: SimulationPeriod,
  params: DecisionScenarioParameters,
  /*
   * The marker the BEFORE side is evaluated at. It defaults to `marker`, which is what every
   * leave-one-out assessment wants: both bodies of evidence at the same instant, so the only thing
   * that differs between them is the evidence, and a signal is never credited with the passage of
   * time.
   *
   * Refresh passes the OLD marker for one question only — *"did the decision change across this
   * advance?"* — because that question is about the scenario, not about a signal. Answering it with
   * both sides at the new marker made the estate state that the Decision Window was unchanged while
   * the scenario's own window had moved from `OPEN` to `CLOSING_SOON`, which is the one thing a
   * Refresh must never do (ADR-081 part 2).
   */
  markerBefore: SimulationPeriod = marker
): DecisionRelevance {
  const before = decisionArtefactsAt(scenario, markerBefore, evidenceBefore, params);
  const after = decisionArtefactsAt(scenario, marker, evidenceAfter, params);

  let changed: DecisionChangeKind = 'NONE';
  let beforeStatement: string | null = null;
  let afterStatement: string | null = null;

  if (before.recommendation !== after.recommendation) {
    changed = 'RECOMMENDATION';
    beforeStatement = before.recommendation;
    afterStatement = after.recommendation;
  } else if (before.window !== after.window) {
    changed = 'DECISION_WINDOW';
    beforeStatement = `Decision Window ${before.window}`;
    afterStatement = `Decision Window ${after.window}`;
  }

  const statement = changed === 'NONE'
    ? 'The recommendation and the Decision Window are unchanged. A readiness verdict was not '
      + 'assessed, because no campaign intent is registered for this scenario.'
    : changed === 'RECOMMENDATION'
      ? `The recommendation changed: "${beforeStatement}" became "${afterStatement}".`
      : `The Decision Window changed from ${before.window} to ${after.window}.`;

  return {
    signal_id: signalId,
    scenario_id: scenario.identity.scenario_id,
    assessed_at_period: marker,
    changed,
    before_statement: beforeStatement,
    after_statement: afterStatement,
    statement,
    provenance: DERIVED_BY_RULE
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Refresh
// ═══════════════════════════════════════════════════════════════════════════════

/** The period after this one, or null where the timeline has been fully advanced. */
export function nextPeriodAfter(period: SimulationPeriod): SimulationPeriod | null {
  const i = periodIndex(period);
  return i >= 0 && i < ORDERED_SIMULATION_PERIODS.length - 1
    ? ORDERED_SIMULATION_PERIODS[i + 1]
    : null;
}

/**
 * Advance a scenario's evidence one `SimulationPeriod` and publish what it changed.
 *
 * `RefreshScenarioOperation`. ADR-081 part 1: Refresh is a scenario operation, not a fetch. It
 * advances the as-at marker, re-evaluates the intelligence that depends on the advanced evidence,
 * and answers the four questions part 2 requires — what is new, what aged, what moved materially,
 * and whether the decision changed.
 *
 * **"No material change" is a valid outcome and is reported as one.** ADR-081 part 3 forbids
 * movement whose only purpose is to make the interface look alive, so nothing here manufactures a
 * change to fill a delta.
 */
export function refreshScenario(scenarioId: string): RefreshDelta {
  const scenario = resolveScenario(scenarioId);
  const params = withScenarioInScope(scenario, () => scenarioOpeningDecisionParameters(scenario));

  const fromPeriod = asAtMarkers.get(scenarioId) ?? OPENING_EVIDENCE_PERIOD;
  const next = nextPeriodAfter(fromPeriod);
  const toPeriod = next ?? fromPeriod;

  const timelines = scenarioEvidenceTimelines(scenario, params);
  const evidenceBefore = observedEvidenceAt(scenario, fromPeriod, timelines);
  const evidenceAfter = observedEvidenceAt(scenario, toPeriod, timelines);

  const from = markerFor(scenario, fromPeriod);
  const to = markerFor(scenario, toPeriod);

  const beforeIds = new Set(evidenceBefore.map(s => s.signal_id));
  const newSignals = evidenceAfter.filter(s => !beforeIds.has(s.signal_id));

  /*
   * TWO questions, deliberately kept apart, because they have different right answers.
   *
   * `decisionFromEvidence` — did the EVIDENCE change the decision? Both bodies at the same marker,
   * so time is held still. This is what bands an observation's materiality, and banding a new
   * observation `DECISIVE` because a day passed would be the fabricated significance ADR-081 part 3
   * forbids.
   *
   * `decisionAcrossAdvance` — did the decision change across this advance, as the scenario really
   * stood on each side of it? Evidence AND clock both move, because that is what a reader who
   * pressed Refresh is asking. This is the one the consequence statement reads out.
   */
  const decisionFromEvidence = assessDecisionRelevance(
    scenario, `advance::${fromPeriod}->${toPeriod}`, evidenceBefore, evidenceAfter, toPeriod, params
  );
  const decisionChanged = decisionFromEvidence.changed !== 'NONE';

  const decisionAcrossAdvance = assessDecisionRelevance(
    scenario, `advance::${fromPeriod}->${toPeriod}`, evidenceBefore, evidenceAfter, toPeriod, params,
    fromPeriod
  );

  const toIso = scenarioPeriodInstantIso(scenario, toPeriod);
  const observations: RefreshedObservation[] = evidenceAfter.map(signal => {
    const isNew = !beforeIds.has(signal.signal_id);
    const ageDays = Math.max(
      0,
      Math.round((Date.parse(toIso) - Date.parse(signal.observed_at)) / 86_400_000)
    );

    const materiality = isNew
      ? assessSignalMateriality(scenario, signal, evidenceAfter, toPeriod, params, decisionChanged)
      : null;

    let change: RefreshObservationChange;
    if (isNew) change = 'NEW';
    else if (ageDays > 0) change = 'AGED';
    else change = 'UNCHANGED';
    if (isNew && materiality && materiality.movements.length > 0) change = 'MOVED';

    return {
      signal_id: signal.signal_id,
      change,
      age_scenario_days: ageDays,
      materiality,
      decision_relevance: isNew
        ? assessDecisionRelevance(
            scenario,
            signal.signal_id,
            evidenceAfter.filter(s => s.signal_id !== signal.signal_id),
            evidenceAfter,
            toPeriod,
            params
          )
        : null
    };
  });

  /*
   * What the EVIDENCE moved, isolated from what TIME moved.
   *
   * Both bodies of evidence are evaluated at the SAME marker — the new one — so the only thing
   * that differs between them is the evidence itself. Evaluating the old evidence at the old
   * marker instead would have mixed in the advance: the Decision Window shortens because a day
   * passed, not because anything was observed, and publishing that as "what this Refresh moved"
   * would credit evidence with the passage of time. The advance is already published, as `from`
   * and `to`.
   *
   * A window that CLOSES across the advance is still reported — as a decision change, by
   * `decisionAcrossAdvance` below, which compares the two markers as they really are.
   */
  const qBefore = publishedQuantitiesAt(scenario, toPeriod, evidenceBefore, params);
  const qAfter = publishedQuantitiesAt(scenario, toPeriod, evidenceAfter, params);
  const material_movements = movementsBetween(qBefore, qAfter).filter(m => {
    const pct = m.delta_pct === null ? 0 : Math.abs(m.delta_pct);
    return pct >= MATERIALITY_BAND_THRESHOLDS_PCT.NOTABLE;
  });

  const decision_changes = observations
    .map(o => o.decision_relevance)
    .filter((r): r is DecisionRelevance => !!r && r.changed !== 'NONE');

  const statement = buildConsequenceStatement({
    exhausted: next === null,
    from: fromPeriod,
    to: toPeriod,
    newCount: newSignals.length,
    movements: material_movements,
    decision: decisionAcrossAdvance,
    attributableToEvidence: decisionChanged
  });

  if (next !== null) asAtMarkers.set(scenarioId, toPeriod);

  return {
    scenario_id: scenarioId,
    from,
    to,
    observations,
    material_movements,
    decision_changes: decision_changes.length > 0 ? decision_changes : [decisionAcrossAdvance],
    decision_consequence_statement: statement,
    provenance: DERIVED_BY_RULE
  };
}

/**
 * The sentence a presenter reads out.
 *
 * ADR-081 part 2 makes it mandatory and non-null, and the Wave-0 declaration is explicit that where
 * nothing changed it must SAY so: *"that is an answer, not a blank."*
 */
function buildConsequenceStatement(input: {
  exhausted: boolean;
  from: SimulationPeriod;
  to: SimulationPeriod;
  newCount: number;
  movements: MaterialQuantityMovement[];
  decision: DecisionRelevance;
  /** Whether the evidence moved the decision, or only the clock did. */
  attributableToEvidence: boolean;
}): string {
  if (input.exhausted) {
    return `The scenario's evidence is already at ${input.from}, the end of its declared timeline. `
      + 'Nothing advanced, and nothing changed. Restart returns it to its opening position.';
  }

  const lead = `Advanced from ${input.from} to ${input.to}: `
    + `${input.newCount} new observation${input.newCount === 1 ? '' : 's'}`;

  if (input.decision.changed !== 'NONE') {
    /*
     * A decision that moved is reported, and WHY it moved is reported with it. A window that closed
     * because a day passed is a real thing a presenter must say out loud, and it is a different
     * statement from evidence changing the recommendation — collapsing the two would let the clock
     * borrow the evidence's credit.
     */
    const cause = input.attributableToEvidence
      ? 'The evidence moved it.'
      : 'The evidence did not move it — the advance of the scenario clock did, and the decision now '
        + 'stands differently because time has passed rather than because anything was observed.';
    return `${lead}. ${input.decision.statement} ${cause}`;
  }

  if (input.movements.length === 0) {
    return `${lead}, and no published quantity moved materially. The decision is unchanged — `
      + 'which is an answer, not an absence of one.';
  }

  const top = input.movements
    .slice()
    .sort((a, b) => Math.abs(b.delta_pct ?? 0) - Math.abs(a.delta_pct ?? 0))[0];
  return `${lead}. ${top.display_label} moved from ${top.before.toLocaleString('en-GB')} to `
    + `${top.after.toLocaleString('en-GB')} ${top.unit}`
    + (top.delta_pct === null ? '' : ` (${top.delta_pct >= 0 ? '+' : ''}${top.delta_pct.toFixed(2)}%)`)
    + `${input.movements.length > 1 ? `, with ${input.movements.length - 1} other quantit${input.movements.length === 2 ? 'y' : 'ies'} moving` : ''}. `
    + 'The evidence moved the numbers without changing the decision: the recommended intervention '
    + 'and the state of the Decision Window are the same as before the advance.';
}

/** The delta a Refresh WOULD produce, without advancing the marker. Used by tests and by reads. */
export function previewRefresh(scenarioId: string): RefreshDelta {
  const saved = asAtMarkers.get(scenarioId);
  const delta = refreshScenario(scenarioId);
  if (saved === undefined) asAtMarkers.delete(scenarioId);
  else asAtMarkers.set(scenarioId, saved);
  return delta;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT 3 — the Models & Methods register
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * What actually produced the values a scenario publishes.
 *
 * `SCI-05`'s packet authorises exactly six fields per entry — *purpose, inputs, output, last run,
 * scenario applicability and measured error* — and ADR-067 keeps prompts, tokens, temperature and
 * model identifiers off any client-facing surface. `MethodRegisterEntry` has no field that could
 * carry them, and nothing below names a model version or a provider SKU.
 *
 * **Only implemented mechanisms appear.** There is no entry for a capability that does not run in
 * this estate, and no entry claims an ML model where none ran. Where a mechanism exists but has not
 * run for a scenario, `last_run_scenario_iso` is null and the limitation says why — the `ATL-FINAL`
 * discipline of declaring unmeasured rather than reporting a zero that was not earned.
 *
 * The register is composed from `lib/forecast/registry.ts`, read-only, plus the deterministic
 * engines this estate genuinely runs. `SCI-06` and `SCI-09` render it and keep no second copy.
 */
export function scenarioMethodsRegister(scenarioId: string): MethodsRegister {
  const scenario = resolveScenario(scenarioId);
  const allScenarioIds = [scenario.identity.scenario_id];
  const scenarioNow = scenarioNowIso(scenario);

  const entries: MethodRegisterEntry[] = [];

  /*
   * STATISTICAL — the registered forecast models, read from their own declarations so the register
   * cannot drift from what the pipeline will actually execute.
   */
  for (const model of listForecastModels()) {
    entries.push({
      method_id: `forecast::${model.model_id}`,
      display_name: model.display_name,
      mechanism: 'statistical',
      purpose: model.summary,
      inputs: ['Scenario demand history (daily)', 'Forecast horizon'],
      output: 'Daily demand projection with a published uncertainty range',
      implementation_ref: model.implementation_ref,
      /*
       * A registered model has not been RUN for a scenario simply by being registered. The demand
       * projection is asynchronous and this register is synchronous by contract, so what can be
       * stated honestly here is that it is available and applicable — not when it last executed.
       */
      last_run_scenario_iso: null,
      applies_to_scenario_ids: allScenarioIds,
      measured_error: null,
      limitations: [
        'Fitted to a synthetic demonstration history, never to a real retailer series.',
        'Measured error and interval calibration are published on each execution, not here: they '
          + 'are properties of a run against a specific horizon, and a figure quoted without its run '
          + 'would be a claim this register cannot support.',
        ...(model.seasonal_period === null
          ? ['Models no seasonal cycle.']
          : [`Models a ${model.seasonal_period}-day seasonal cycle only — no annual seasonality, holidays or events.`])
      ]
    });
  }

  /* RULE — the deterministic engines. These genuinely run, synchronously, for every scenario. */
  entries.push(
    {
      method_id: 'engine::scenario-derivations',
      display_name: 'Scenario derivation engine',
      mechanism: 'rule',
      purpose: 'Derives every published quantity of a scenario from its declared record, so no surface restates a value as its own literal.',
      inputs: ['Canonical scenario record'],
      output: 'Expected, servable and exposed demand, exposures, cover and unit economics',
      implementation_ref: 'packages/contracts/src/canonical-scenario-model.ts',
      last_run_scenario_iso: scenarioNow,
      applies_to_scenario_ids: allScenarioIds,
      measured_error: null,
      limitations: ['Deterministic arithmetic over declared terms. It estimates nothing, so it has no error to measure.']
    },
    {
      method_id: 'engine::promotion-curve',
      display_name: 'Promotion depth-response curve',
      mechanism: 'rule',
      purpose: 'Derives the contribution of every depth tier from the scenario\'s declared elasticity, funding and anomalies, and selects the recommended depth as the contribution maximum.',
      inputs: ['Declared elasticity', 'Supplier funding share', 'Declared depth-response anomalies'],
      output: 'Depth-response curve and the derived recommendation',
      implementation_ref: 'lib/campaign-archetypes.ts',
      last_run_scenario_iso: scenarioNow,
      applies_to_scenario_ids: allScenarioIds,
      measured_error: null,
      limitations: ['The recommendation is the maximum of a declared curve, not a prediction of realised trading.']
    },
    {
      method_id: 'engine::living-evidence',
      display_name: 'Living Evidence engine',
      mechanism: 'rule',
      purpose: 'Derives what an observation moved, whether that changed a decision, and what one Refresh changed.',
      inputs: ['Scenario evidence timeline', 'Shared Decision State', 'Scenario clock'],
      output: 'Materiality bands, decision relevance and the Refresh delta',
      implementation_ref: 'lib/living-evidence-engine.ts',
      last_run_scenario_iso: scenarioNow,
      applies_to_scenario_ids: allScenarioIds,
      measured_error: null,
      limitations: [
        'Materiality is a band over a published movement, never a score (ADR-081 part 5).',
        'A readiness verdict is not assessed unless a campaign intent is registered.'
      ]
    },
    {
      method_id: 'engine::certification-gate',
      display_name: 'Scenario Certification Gate',
      mechanism: 'rule',
      purpose: 'Refuses to let a scenario become demo-active until it reconciles on all twelve governed dimensions.',
      inputs: ['Canonical scenario record', 'Enterprise masters'],
      output: 'A certification verdict per dimension, derived from its executed checks',
      implementation_ref: 'lib/scenario-certification.ts',
      last_run_scenario_iso: scenarioNow,
      applies_to_scenario_ids: allScenarioIds,
      measured_error: null,
      limitations: ['Reconciles internal coherence. It cannot validate a scenario against a real retailer.']
    },
    {
      method_id: 'engine::signal-simulator',
      display_name: 'Scenario evidence simulator',
      mechanism: 'rule',
      purpose: 'Produces each scenario\'s evidence timeline across its own clock from its own declared world.',
      inputs: ['Canonical scenario record', 'Shared Decision State', 'Selected interventions'],
      output: 'Per-scenario signal timelines with per-observation provenance',
      implementation_ref: 'services/world/src/dynamic-signal-simulator.ts',
      last_run_scenario_iso: scenarioNow,
      applies_to_scenario_ids: allScenarioIds,
      measured_error: null,
      limitations: [
        'Synthetic demonstration evidence. It is modelled from declared terms and is never presented as observed retailer data.',
        'The shape a pressure signal follows over the horizon is declared; its amplitude is derived.'
      ]
    }
  );

  /* MEASURED — the seeded observed history the forecast is fitted to. */
  entries.push({
    method_id: 'data::seeded-demand-history',
    display_name: 'Seeded demand history',
    mechanism: 'measured',
    purpose: 'The daily demand series the forecast models are fitted to.',
    inputs: ['Seeded estate sales history'],
    output: 'Daily observations by store, SKU and category',
    implementation_ref: 'lib/forecast/series.ts',
    last_run_scenario_iso: scenario.calendar.observed_history_end_date,
    applies_to_scenario_ids: allScenarioIds,
    measured_error: null,
    limitations: [
      'A synthetic demonstration estate, not a real retailer\'s sales.',
      'Where a scenario\'s declared window falls outside the seeded coverage, its history is modelled from declared terms and labelled as modelled.'
    ]
  });

  /* MANUAL — the human decision. It is a mechanism, and leaving it out would imply otherwise. */
  entries.push({
    method_id: 'human::decision-commitment',
    display_name: 'Human decision',
    mechanism: 'manual',
    purpose: 'The commitment itself. CogniX publishes evidence and a recommendation; a person decides.',
    inputs: ['Published evidence', 'Derived recommendation', 'Commercial judgement'],
    output: 'A recorded decision and its stated rationale',
    implementation_ref: 'lib/decision-contract-store.ts',
    last_run_scenario_iso: null,
    applies_to_scenario_ids: allScenarioIds,
    measured_error: null,
    limitations: ['Recorded only once a reader commits a decision. No decision is taken automatically.']
  });

  /*
   * LLM — the governed GenAI capability, and ONLY where it genuinely runs.
   *
   * ADR-044 and ADR-067: the key is read server-side at call time and never reaches a client, a
   * draft is never evidence, and no model identifier appears on a client-facing surface. With no
   * key configured the capability is implemented but has not run, and the register says exactly
   * that rather than implying activity.
   */
  const genAiConfigured = typeof process !== 'undefined' && !!process.env?.GEMINI_API_KEY;
  if (genAiConfigured) {
    entries.push({
      method_id: 'genai::decision-context-draft',
      display_name: 'Governed decision-context drafting',
      mechanism: 'llm',
      purpose: 'Drafts a decision context for a reader to accept, edit or reject. A draft is never evidence and never stands as CogniX\'s answer.',
      inputs: ['Campaign intent under construction', 'Scenario context'],
      output: 'A non-authoritative draft, marked as one',
      implementation_ref: 'app/api/v1/campaigns/decision-context/suggest/route.ts',
      last_run_scenario_iso: null,
      applies_to_scenario_ids: allScenarioIds,
      measured_error: null,
      limitations: [
        'Non-authoritative by contract (ADR-044): a draft is never admitted as evidence.',
        'Server-side only. No provider credential reaches a browser.',
        'Not used to produce any published economic quantity.'
      ]
    });
    /*
     * Wave-3 convergence event (ADR-084 part 2), taken in the owning module.
     *
     * `SCI-07` implemented a SECOND governed GenAI capability — scenario drafting under ADR-083 —
     * and this register is the one place the estate says what its mechanisms are. `SCI-09` renders
     * it and holds no second copy, so a register that still described only decision-context
     * drafting made the Architecture Surface untruthful about GenAI the moment the two lanes
     * converged. The entry adds no shape the contract does not already declare.
     *
     * The authority model below is `SCI-07`'s, quoted rather than restated: every quantitative
     * field is prohibited at the allowlist, confirmation requires a named person, and a confirmed
     * scenario resolves with the provider absent.
     */
    entries.push({
      method_id: 'genai::scenario-draft',
      display_name: 'Governed scenario drafting',
      mechanism: 'llm',
      purpose:
        'Proposes the STRUCTURE and qualitative context of a scenario a person is authoring — a '
        + 'situation, a posture, a name — for that person to keep, edit or reject. It proposes no '
        + 'quantity and confirms nothing.',
      inputs: ['A person\'s description of their own situation, fenced as data', 'The governed field register'],
      output: 'Non-authoritative draft proposals, each validated against the field allowlist before it is shown',
      implementation_ref: 'app/api/v1/scenarios/drafts/[id]/assist/route.ts',
      last_run_scenario_iso: null,
      applies_to_scenario_ids: allScenarioIds,
      measured_error: null,
      limitations: [
        'Non-authoritative by contract (ADR-083): a proposal is never evidence and never a decision.',
        'Server-side only, on `GEMINI_API_KEY` read at call time. No provider credential reaches a browser.',
        'Every quantitative field is prohibited at the allowlist, so it cannot propose demand, '
          + 'revenue, margin, a discount depth, an elasticity or a Decision Gap, Window or Regret.',
        'It cannot confirm, certify or activate a scenario — confirmation requires a named person.',
        'Once confirmed, a scenario resolves, certifies and runs identically with the provider absent: '
          + 'nothing on the resolution path reads a drafting envelope.'
      ]
    });
  }

  const undescribed = genAiConfigured
    ? []
    : [
        {
          method_id: 'genai::decision-context-draft',
          reason:
            'The governed GenAI drafting capability is implemented but no provider credential is '
            + 'configured in this environment, so it has not run. Reporting it as active would be the '
            + 'fake model activity this register exists to prevent.'
        },
        {
          method_id: 'genai::scenario-draft',
          reason:
            'Governed scenario drafting is implemented and reachable, but no provider credential is '
            + 'configured in this environment, so it has not run. Scenario authoring itself remains '
            + 'fully available by hand — drafting is an assist, never a dependency.'
        }
      ];

  return {
    scenario_id: scenario.identity.scenario_id,
    entries,
    undescribed,
    provenance: DERIVED_BY_RULE
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// The Gate-C convergence seam — what `SCI-06` reads
// ═══════════════════════════════════════════════════════════════════════════════

/*
 * ADR-084 part 2, recorded rather than performed quietly.
 *
 * `SCI-06` was built in Wave 2 against the Gate-A declaration, and the declaration gives it
 * `SignalMateriality` and `DecisionRelevance` per observation. `SCI-05` implemented both — but
 * published them only INSIDE a `RefreshDelta`, so the surface that wants to show a reader what
 * today's evidence moved, before advancing anything, had nowhere to read it from. That is a field a
 * consumer needs and does not find, which the declaration names a convergence event raised at
 * Gate C — never a local addition.
 *
 * It is taken here, in the owning module, and it adds NO shape the contract does not already
 * declare: the assessments below are the frozen `SignalMateriality` and `DecisionRelevance`,
 * produced by the same two functions `refreshScenario` calls. There is exactly one materiality
 * computation in this estate and it is the one above. A surface that computed its own would be two
 * answers to one question, which `run-gate-a-tests.ts` §3 asserts against.
 */

/**
 * One piece of observed evidence, with what it moved and whether it changed the decision.
 *
 * The composition `SCI-06`'s Evidence & Signals section renders. Every field is either the
 * `EnterpriseSignal` as `ESF-1` declares it or a frozen Living Evidence contract type — nothing
 * here is a new vocabulary.
 */
export interface AssessedObservation {
  signal: EnterpriseSignal;
  /** Scenario days between the observation and the as-at marker. Measured on the scenario clock. */
  age_scenario_days: number;
  materiality: SignalMateriality;
  decision_relevance: DecisionRelevance;
}

/**
 * Where a scenario's decision currently stands, at its as-at marker.
 *
 * The Decision Trace reads this. It is not a second decision engine and must never become one: the
 * recommendation and window below are `decisionArtefactsAt`'s, the same derivation
 * `assessDecisionRelevance` compares two bodies of evidence with, and the quantities are
 * `publishedQuantitiesAt`'s. A trace that recomputed either would be explaining a decision the
 * estate did not take.
 */
export interface ScenarioDecisionPosition {
  scenario_id: string;
  as_at: ScenarioAsAtMarker;
  recommendation: string;
  decision_window: string;
  quantities: MaterialQuantityMovement[];
  observed_signal_count: number;
  provenance: ProvenanceDescriptor;
}

/**
 * The observed evidence at a scenario's current marker, each observation assessed.
 *
 * Leave-one-out, exactly as `assessSignalMateriality` documents: the quantities are evaluated with
 * the whole body of evidence and again with the observation removed, and the difference IS the
 * materiality. Nothing is read from a seed, and no scenario record carries a field that could
 * author one.
 */
export function assessedEvidenceAt(scenarioId: string): {
  as_at: ScenarioAsAtMarker;
  observations: AssessedObservation[];
} {
  const scenario = resolveScenario(scenarioId);
  const params = withScenarioInScope(scenario, () => scenarioOpeningDecisionParameters(scenario));
  const marker = currentAsAtMarker(scenarioId);
  const timelines = scenarioEvidenceTimelines(scenario, params);
  const evidence = observedEvidenceAt(scenario, marker.period, timelines);
  const markerMs = Date.parse(marker.period_instant_iso);

  const observations = evidence.map(signal => {
    const relevance = assessDecisionRelevance(
      scenario,
      signal.signal_id,
      evidence.filter(s => s.signal_id !== signal.signal_id),
      evidence,
      marker.period,
      params
    );
    return {
      signal,
      age_scenario_days: Math.max(
        0,
        Math.round((markerMs - Date.parse(signal.observed_at)) / 86_400_000)
      ),
      materiality: assessSignalMateriality(
        scenario, signal, evidence, marker.period, params, relevance.changed !== 'NONE'
      ),
      decision_relevance: relevance
    };
  });

  return { as_at: marker, observations };
}

/**
 * The decision as it stands for a scenario, at its current marker.
 *
 * `quantities` are published as `MaterialQuantityMovement`s with `before === after` and a zero
 * delta, because the contract already carries endpoints and a unit on every published quantity and
 * inventing a second shape for "a quantity standing still" would give the estate two ways to say
 * one thing.
 */
export function scenarioDecisionPosition(scenarioId: string): ScenarioDecisionPosition {
  const scenario = resolveScenario(scenarioId);
  const params = withScenarioInScope(scenario, () => scenarioOpeningDecisionParameters(scenario));
  const marker = currentAsAtMarker(scenarioId);
  const evidence = observedEvidenceAt(scenario, marker.period);
  const artefacts = decisionArtefactsAt(scenario, marker.period, evidence, params);
  const published = publishedQuantitiesAt(scenario, marker.period, evidence, params);

  const quantities = (Object.keys(published) as MaterialQuantityId[]).map(id => ({
    quantity: id,
    display_label: published[id].label,
    before: published[id].value,
    after: published[id].value,
    delta: 0,
    delta_pct: null,
    unit: published[id].unit
  }));

  return {
    scenario_id: scenario.identity.scenario_id,
    as_at: marker,
    recommendation: artefacts.recommendation,
    decision_window: artefacts.window,
    quantities,
    observed_signal_count: evidence.length,
    provenance: DERIVED_BY_RULE
  };
}
