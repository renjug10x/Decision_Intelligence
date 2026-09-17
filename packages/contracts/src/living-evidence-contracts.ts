/**
 * CogniX Living Evidence — WAVE-2 CONTRACT DECLARATION
 * ───────────────────────────────────────────────────────────────────────────────
 * **OWNER: `SCI-05`. DECLARED at Gate A. IMPLEMENTED in Wave 2, by `SCI-05` alone.**
 *
 * Read this paragraph before reading anything else in the file.
 *
 * **Nothing here computes anything, and nothing here may.** This module contains types,
 * enumerated vocabularies and the governed semantics attached to them. There is no engine,
 * no calculation, no data and no default. It exists so that `SCI-06` can build the
 * Observability & Governance experience against a shape that is already fixed, while
 * `SCI-05` implements the engines behind it in the same wave — which is the whole mechanism
 * that lets the two lanes run without contending (§0 of the work-packet record).
 *
 * Why a declaration is a real deliverable
 * ---------------------------------------
 * §0: *"A contract owned by a Wave-N packet that a Wave-N parallel partner must consume is
 * declared and frozen at the Wave N-1 convergence gate, not when its implementation lands."*
 * Without this file, `SCI-06` would reach Wave 2 with nothing to build against and would
 * invent a second shape — and two lanes independently defining one contract is precisely
 * the failure ADR-084 exists to prevent, arriving through the process rather than the code.
 *
 * What `SCI-06` may and may not assume
 * ------------------------------------
 * MAY assume: every field below exists, carries the meaning documented on it, and will be
 * populated by `SCI-05`'s engines.
 * MAY NOT assume: any particular value, ordering beyond what is stated, or that a field it
 * would find convenient will appear. A field `SCI-06` needs and does not find here is a
 * convergence event raised at Gate C (ADR-084 part 2) — never a local addition.
 *
 * What `SCI-05` may change
 * ------------------------
 * Its own contract, as the owner (ADR-084 part 1) — but only as a convergence event once
 * this declaration is frozen at Gate A, not as a commit.
 *
 * The standing decisions these types are bounded by
 * -------------------------------------------------
 * ADR-081 — Refresh advances scenario evidence and must publish whether the decision changed.
 * ADR-078 — the scenario clock is the only clock for deterministic evidence.
 * ADR-072 — uncertainty is published twice and NEVER as a bare confidence percentage.
 * ADR-082 — one provenance vocabulary: `origin` / `method` / `authority`.
 * ADR-067 — no prompt, token, temperature or model identifier reaches a client surface.
 */

import { SimulationPeriod } from './enterprise-signal-model';
import { ProvenanceDescriptor, ProvenanceMethod } from './provenance-vocabulary';

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT 1 — Signal Materiality & Decision Relevance
// Owner: SCI-05 · Consumers: SCI-06
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * WHICH published quantity an observation moved.
 *
 * Named rather than free-text, because materiality is *"did it move a published quantity and
 * by how much"* (ADR-081 part 4) — and a quantity nobody can point at on a surface is not a
 * published quantity. Every member here is a figure the connected journey already publishes.
 */
export type MaterialQuantityId =
  | 'EXPECTED_DEMAND_UNITS'
  | 'SERVABLE_DEMAND_UNITS'
  | 'EXPOSED_DEMAND_UNITS'
  | 'REVENUE_EXPOSURE_GBP'
  | 'MARGIN_EXPOSURE_GBP'
  | 'DECISION_GAP_PP'
  | 'DECISION_WINDOW_HOURS'
  | 'FORECAST_STABILITY'
  | 'PROMOTION_DEPTH_RESPONSE_PP'
  | 'CAMPAIGN_CONTRIBUTION_GBP';

/**
 * How far a quantity moved, in the terms the surface publishes it in.
 *
 * `before` and `after` are both carried because a delta without its endpoints cannot be
 * checked against the surface that published them, and checking is the point.
 */
export interface MaterialQuantityMovement {
  quantity: MaterialQuantityId;
  /** The label the surface uses. `SCI-06` renders this rather than mapping the enum itself. */
  display_label: string;
  before: number;
  after: number;
  delta: number;
  /** Signed, relative to `before`. Null where `before` is zero — never Infinity on a surface. */
  delta_pct: number | null;
  unit: string;
}

/**
 * How much a movement matters, as a BAND rather than a score.
 *
 * ADR-081 part 5 and ADR-072 together forbid a third number sitting beside the `confidence`
 * and `quality` that `ESF-1` already carries. A band is not a score: it is a classification
 * of a movement that is itself fully published above, and a reader can always reach the
 * arithmetic behind it.
 */
export type MaterialityBand = 'IMMATERIAL' | 'NOTABLE' | 'MATERIAL' | 'DECISIVE';

/**
 * What an observation moved. **Derived, never authored** (ADR-081 part 4).
 *
 * A signal that declares its own importance is marketing; a signal whose importance is
 * computed from what it moved is intelligence. `SCI-05` derives every field here by
 * re-evaluating the dependent quantity — there is no seeded materiality and no field a
 * scenario pack may set.
 */
export interface SignalMateriality {
  signal_id: string;
  scenario_id: string;
  /** The period on the SCENARIO clock at which this was assessed (ADR-078). */
  assessed_at_period: SimulationPeriod;
  /** Empty where the observation moved nothing. An empty list is a real answer, not an absence. */
  movements: MaterialQuantityMovement[];
  band: MaterialityBand;
  /** Why this band, in one sentence a business reader can act on. Never empty. */
  rationale: string;
  /** How this assessment was produced. Always `derived` under ADR-082. */
  provenance: ProvenanceDescriptor;
}

/** What kind of decision artefact changed. */
export type DecisionChangeKind =
  | 'RECOMMENDATION'
  | 'READINESS_VERDICT'
  | 'DECISION_WINDOW'
  | 'NONE';

/**
 * Whether an observation changed a DECISION, which is a different question from whether it
 * moved a number (ADR-081 part 4).
 *
 * This is the field that turns *signal → evidence → material change → decision relevance*
 * into a computation rather than a caption, and it is the one `SCI-06` renders when it
 * answers *"did this change what we should do?"*.
 */
export interface DecisionRelevance {
  signal_id: string;
  scenario_id: string;
  assessed_at_period: SimulationPeriod;
  changed: DecisionChangeKind;
  /** Populated only where `changed` is not `NONE`. The artefact as it stood before and after. */
  before_statement: string | null;
  after_statement: string | null;
  /**
   * The statement a reader sees. Where nothing changed it says so plainly — *"the
   * recommendation is unchanged"* is an answer, not a blank.
   */
  statement: string;
  provenance: ProvenanceDescriptor;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT 2 — Refresh Operation
// Owner: SCI-05 · Consumers: SCI-06
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Where a scenario's evidence currently stands, on the scenario clock.
 *
 * Refresh is *"a scenario operation, not a fetch"* (ADR-081 part 1): it advances this marker
 * one `SimulationPeriod`. The marker is the thing `Restart scenario` returns to its opening
 * position, and it is why two reads of an unadvanced scenario are byte-identical.
 */
export interface ScenarioAsAtMarker {
  scenario_id: string;
  period: SimulationPeriod;
  /** The instant that period falls on, resolved through the scenario clock. Never civil time. */
  period_instant_iso: string;
  /** The period this scenario opens at, so a reader can see how far it has been advanced. */
  opening_period: SimulationPeriod;
}

/** What happened to one observation across a single advance. */
export type RefreshObservationChange = 'NEW' | 'AGED' | 'MOVED' | 'UNCHANGED';

export interface RefreshedObservation {
  signal_id: string;
  change: RefreshObservationChange;
  /** Scenario days since observation, at the new marker. A real reading, because of ADR-078. */
  age_scenario_days: number;
  materiality: SignalMateriality | null;
  decision_relevance: DecisionRelevance | null;
}

/**
 * What one Refresh changed.
 *
 * ADR-081 part 2: *"A Refresh that cannot say what it changed has not earned the control."*
 * The four questions it must answer are the four groupings below, and
 * `decision_consequence_statement` is the one that makes this Decision Intelligence rather
 * than a data view.
 */
export interface RefreshDelta {
  scenario_id: string;
  from: ScenarioAsAtMarker;
  to: ScenarioAsAtMarker;
  /** What is new, what aged, what moved — every observation, classified. */
  observations: RefreshedObservation[];
  /** Quantities that moved materially across this advance, deduplicated across signals. */
  material_movements: MaterialQuantityMovement[];
  /** Whether the recommendation, readiness verdict or window changed, and to what. */
  decision_changes: DecisionRelevance[];
  /**
   * The sentence a presenter reads out. Where nothing changed it says so — ADR-081 part 3
   * forbids movement whose only purpose is to make the interface look alive.
   */
  decision_consequence_statement: string;
  provenance: ProvenanceDescriptor;
}

/**
 * The Refresh operation itself, as a type rather than an implementation.
 *
 * Synchronous in shape and deterministic by contract: the same scenario advanced to the same
 * period produces the same delta on every run (ADR-081 part 3). `SCI-05` provides the
 * implementation; `SCI-06` calls it and renders the result without recomputing any part of it.
 */
export type RefreshScenarioOperation = (scenarioId: string) => RefreshDelta;

/** Returns the scenario to its opening position exactly, including the as-at marker. */
export type RestartScenarioOperation = (scenarioId: string) => ScenarioAsAtMarker;

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT 3 — Models & Methods register
// Owner: SCI-05 · Consumers: SCI-06, SCI-09
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * What KIND of thing produced a published value.
 *
 * This is the ADR-082 `method` dimension, surfaced as the register's organising idea, so that
 * *"nothing on the page reads as 'AI' by default"* — the rule
 * `COGNIX_SCENARIO_INTELLIGENCE.md` §9 states for the architecture surface and which applies
 * with equal force here.
 */
export type MethodMechanism = ProvenanceMethod;

/**
 * One entry in the register.
 *
 * The fields are exactly what `SCI-05`'s packet authorises publishing: *"purpose, inputs,
 * output, last run, scenario applicability and measured error"*. What is absent is as
 * governed as what is present — ADR-067 keeps prompts, tokens, temperature and model
 * identifiers off any client-facing surface, so there is no field here to carry them.
 */
export interface MethodRegisterEntry {
  method_id: string;
  display_name: string;
  mechanism: MethodMechanism;
  /** What it is for, in one sentence. */
  purpose: string;
  inputs: string[];
  output: string;
  /**
   * The implementation file, so the claim is checkable rather than asserted — the discipline
   * `ForecastModelDeclaration.implementation_ref` already applies to forecast models.
   */
  implementation_ref: string;
  /**
   * When it last ran for this scenario, on the SCENARIO clock where it describes the modelled
   * world. Null where it has not run — declared unmeasured rather than reported as a zero it
   * could not earn (the `ATL-FINAL` precedent).
   */
  last_run_scenario_iso: string | null;
  /** The scenarios this method applies to. Empty means it applies to none, and says so. */
  applies_to_scenario_ids: string[];
  /**
   * Measured error where the method has been backtested, expressed in its own units.
   * Null where unmeasured — never a placeholder figure.
   */
  measured_error: { metric: string; value: number; unit: string } | null;
  /** What this method is genuinely not. Published so nothing is inferred from silence. */
  limitations: string[];
}

/**
 * The register as a surface reads it.
 *
 * `SCI-05` composes it from the forecast registry (`lib/forecast/registry.ts`, read-only) and
 * capability knowledge. `SCI-06` and `SCI-09` render it and hold no second copy — there is one
 * truth about what ran, and a surface that maintained its own would drift from it.
 */
export interface MethodsRegister {
  scenario_id: string;
  entries: MethodRegisterEntry[];
  /**
   * Methods the register knows exist but cannot describe for this scenario, with the reason.
   * Declared rather than omitted, because a register that silently drops what it cannot
   * measure reads as a complete list and is not one.
   */
  undescribed: { method_id: string; reason: string }[];
  provenance: ProvenanceDescriptor;
}
