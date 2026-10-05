/**
 * CogniX — Competitive Price Response Domain Foundation (Slice 1)
 *
 * Pure domain semantics, competitive response term, provenance discipline,
 * ambient vs intervention-attributable decomposition, MATCH parity depth
 * derivation, and single-path economic evaluation.
 *
 * Authority boundaries:
 *   1. Generic competitive benchmark only — no specific retailer/competitor named.
 *   2. Decision objective remains MAXIMUM NET CONTRIBUTION.
 *   3. MATCH means: our promotional shelf price = assumed competitive shelf price.
 *   4. Competitive response coefficient γ (`competitive_response_pp_per_disadvantage_point`)
 *      is an explicit MODELLED assumption (`origin: 'modelled'`, `method: 'manual'`,
 *      `authority: 'authoritative'`) and never reuses or mutates own-price
 *      `promotional_response_pp_per_depth_point` or `scenarioDepthResponsePp`.
 *   5. Zero-default invariant: when assumption is absent or γ = 0, all existing
 *      CogniX outputs remain byte-identical to canonical outputs.
 */

import {
  type CampaignDeltaSummary,
  type CampaignEvaluationRequest,
  type CampaignEvaluationResponse,
  type CanonicalScenario,
  type CausalDemandContribution,
  type CausalDriverContribution,
  type CounterfactualBaseline,
  type DemandTrajectoryPoint,
  type ProvenanceDescriptor,
  DERIVED_ENGINE_PROVENANCE,
  describeProvenance,
  numericFieldBounds,
  resolveScenario,
  scenarioBaseDemandUnits,
  scenarioContributionAtDepthGbp,
  scenarioContributionErosionPerDepthPoint,
  scenarioContributionPerUnitAtListGbp,
  scenarioDepthResponsePp,
  scenarioExpectedDemandUnits,
  scenarioGrossMarginPerUnitGbp,
  scenarioImpliedUnitCostGbp,
  scenarioMarginExposureGbp,
  scenarioPromotedPriceGbp,
  scenarioScopeResponseMultiplier,
  scenarioStoreCount,
  scenarioWeeklyPopulationUnits,
  validateProvenanceDescriptor,
  withScenarioInScope,
} from '../packages/contracts/src/index';
import {
  type ElasticityPoint,
  archetypeBaselineUnits,
  scenarioElasticityCurve,
} from './campaign-archetypes';
import { evaluateCampaignDecision } from './campaign-causal-engine';
import {
  type AuthoritativeScenarioDecision,
  evaluateAuthoritativeScenarioDecision,
} from './canonical-decision-evaluator';

function round2(n: number): number {
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
}

function round3(n: number): number {
  const r = Number(n.toFixed(3));
  return Object.is(r, -0) ? 0 : r;
}

function round4(n: number): number {
  const r = Number(n.toFixed(4));
  return Object.is(r, -0) ? 0 : r;
}

function round1(n: number): number {
  const r = Math.round(n * 10) / 10;
  return Object.is(r, -0) ? 0 : r;
}

// ─── Provenance Vocabulary ──────────────────────────────────────────────────

/**
 * Authoritative provenance descriptor for V1 competitive price assumptions:
 * MODELLED through human judgement (`origin: 'modelled'`, `method: 'manual'`,
 * `authority: 'authoritative'`).
 *
 * Never `observed`, `attested`, or `signal`.
 */
export const COMPETITIVE_ASSUMPTION_PROVENANCE: Readonly<ProvenanceDescriptor> = Object.freeze({
  origin: 'modelled',
  method: 'manual',
  authority: 'authoritative',
});

/**
 * Provenance descriptor for deterministic derivations computed by this module
 * from the modelled competitive assumption and canonical scenario truth.
 */
export const COMPETITIVE_DERIVED_PROVENANCE: Readonly<ProvenanceDescriptor> = Object.freeze({
  ...DERIVED_ENGINE_PROVENANCE,
});

// ─── Competitive Assumption Representation ──────────────────────────────────

/**
 * Ephemeral evaluation assumption for competitive price response exploration.
 *
 * Does NOT alter `scenario_id`, certified scenario truth, `ScenarioDraft`,
 * or canonical scenario packs. Does NOT persist `disadvantage_pp` or any
 * redundant relative-price field.
 */
export interface CompetitivePriceAssumption {
  /** Assumed generic competitive benchmark shelf price in GBP (> 0, finite). */
  readonly assumed_competitive_price_gbp: number;
  /**
   * Explicit modelled competitive response coefficient γ (>= 0, finite):
   * demand response in percentage points of base demand per 1 percentage point
   * of list-price competitive disadvantage.
   *
   * Strictly separate from `promotional_response_pp_per_depth_point`.
   */
  readonly competitive_response_pp_per_disadvantage_point: number;
  /**
   * Provenance descriptor. Must be MODELLED through human judgement
   * (`origin: 'modelled'`, `method: 'manual'`, `authority: 'authoritative'`).
   */
  readonly provenance: ProvenanceDescriptor;
}

export interface CompetitivePriceAssumptionInput {
  readonly assumed_competitive_price_gbp: number;
  readonly competitive_response_pp_per_disadvantage_point: number;
  readonly provenance?: ProvenanceDescriptor;
}

export class CompetitiveAssumptionValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'CompetitiveAssumptionValidationError';
    this.code = code;
  }
}

const PROHIBITED_REDUNDANT_ASSUMPTION_KEYS = [
  'disadvantage_pp',
  'relative_price_gbp',
  'relative_price_pp',
  'price_gap_gbp',
  'promotional_response_pp_per_depth_point',
  'scenario_id',
] as const;

/**
 * Validates a `CompetitivePriceAssumption`.
 *
 * Rejects:
 * - non-object or null/undefined input
 * - non-finite or non-positive `assumed_competitive_price_gbp` (<= 0, NaN, ±Infinity)
 * - non-finite or negative `competitive_response_pp_per_disadvantage_point` (< 0, NaN, ±Infinity)
 * - invalid provenance or provenance with origin !== 'modelled' or method !== 'manual'
 * - redundant stored relative-price or own-price coefficient fields
 */
export function validateCompetitivePriceAssumption(
  assumption: unknown,
): asserts assumption is CompetitivePriceAssumption {
  if (!assumption || typeof assumption !== 'object') {
    throw new CompetitiveAssumptionValidationError(
      'INVALID_ASSUMPTION_OBJECT',
      'Competitive price assumption must be a non-null object.',
    );
  }

  const record = assumption as Record<string, unknown>;

  for (const forbiddenKey of PROHIBITED_REDUNDANT_ASSUMPTION_KEYS) {
    if (forbiddenKey in record && record[forbiddenKey] !== undefined) {
      throw new CompetitiveAssumptionValidationError(
        'REDUNDANT_OR_FORBIDDEN_FIELD',
        `Competitive price assumption must not store "${forbiddenKey}"; derive relative price and preserve own-price parameters separately.`,
      );
    }
  }

  const price = record.assumed_competitive_price_gbp;
  if (typeof price !== 'number' || !Number.isFinite(price)) {
    throw new CompetitiveAssumptionValidationError(
      'NON_FINITE_COMPETITIVE_PRICE',
      'assumed_competitive_price_gbp must be a finite number.',
    );
  }
  if (price <= 0) {
    throw new CompetitiveAssumptionValidationError(
      'NON_POSITIVE_COMPETITIVE_PRICE',
      `assumed_competitive_price_gbp must be strictly positive (> 0); received ${price}.`,
    );
  }

  const gamma = record.competitive_response_pp_per_disadvantage_point;
  if (typeof gamma !== 'number' || !Number.isFinite(gamma)) {
    throw new CompetitiveAssumptionValidationError(
      'NON_FINITE_GAMMA',
      'competitive_response_pp_per_disadvantage_point (γ) must be a finite number.',
    );
  }
  if (gamma < 0) {
    throw new CompetitiveAssumptionValidationError(
      'NEGATIVE_GAMMA',
      `competitive_response_pp_per_disadvantage_point (γ) must be >= 0; received ${gamma}.`,
    );
  }

  const provenance = record.provenance as ProvenanceDescriptor | undefined;
  if (!provenance || typeof provenance !== 'object') {
    throw new CompetitiveAssumptionValidationError(
      'INVALID_PROVENANCE_DESCRIPTOR',
      'Competitive price assumption requires a valid ProvenanceDescriptor.',
    );
  }
  if (provenance.origin !== 'modelled') {
    throw new CompetitiveAssumptionValidationError(
      'INVALID_PROVENANCE_ORIGIN',
      `Competitive price assumption provenance origin must be "modelled" (not "${String(provenance.origin)}").`,
    );
  }
  if (provenance.method !== 'manual') {
    throw new CompetitiveAssumptionValidationError(
      'INVALID_PROVENANCE_METHOD',
      `Competitive price assumption provenance method must be "manual" (human judgement), not "${String(provenance.method)}".`,
    );
  }
  if (provenance.authority !== 'authoritative') {
    throw new CompetitiveAssumptionValidationError(
      'INVALID_PROVENANCE_AUTHORITY',
      `Competitive price assumption provenance authority must be "authoritative", not "${String(provenance.authority)}".`,
    );
  }
  const provValidation = validateProvenanceDescriptor(provenance);
  if (!provValidation.valid) {
    throw new CompetitiveAssumptionValidationError(
      'INVALID_PROVENANCE_DESCRIPTOR',
      `Invalid ProvenanceDescriptor: ${provValidation.errors.join('; ')}`,
    );
  }
}

/**
 * Constructs and validates an immutable `CompetitivePriceAssumption`.
 */
export function createCompetitivePriceAssumption(
  input: CompetitivePriceAssumptionInput,
): Readonly<CompetitivePriceAssumption> {
  if (!input || typeof input !== 'object') {
    throw new CompetitiveAssumptionValidationError(
      'INVALID_ASSUMPTION_OBJECT',
      'Competitive price assumption input must be a non-null object.',
    );
  }

  const inputRecord = input as unknown as Record<string, unknown>;
  for (const forbiddenKey of PROHIBITED_REDUNDANT_ASSUMPTION_KEYS) {
    if (forbiddenKey in inputRecord && inputRecord[forbiddenKey] !== undefined) {
      throw new CompetitiveAssumptionValidationError(
        'REDUNDANT_OR_FORBIDDEN_FIELD',
        `Competitive price assumption must not store "${forbiddenKey}"; derive relative price and preserve own-price parameters separately.`,
      );
    }
  }

  if (
    typeof input.assumed_competitive_price_gbp !== 'number' ||
    !Number.isFinite(input.assumed_competitive_price_gbp)
  ) {
    throw new CompetitiveAssumptionValidationError(
      'NON_FINITE_COMPETITIVE_PRICE',
      'assumed_competitive_price_gbp must be a finite number.',
    );
  }
  if (input.assumed_competitive_price_gbp <= 0) {
    throw new CompetitiveAssumptionValidationError(
      'NON_POSITIVE_COMPETITIVE_PRICE',
      `assumed_competitive_price_gbp must be strictly positive (> 0); received ${input.assumed_competitive_price_gbp}.`,
    );
  }

  const provenance: ProvenanceDescriptor = Object.freeze({
    ...(input.provenance ?? COMPETITIVE_ASSUMPTION_PROVENANCE),
  });

  const candidate: CompetitivePriceAssumption = {
    assumed_competitive_price_gbp: round2(input.assumed_competitive_price_gbp),
    competitive_response_pp_per_disadvantage_point:
      Object.is(input.competitive_response_pp_per_disadvantage_point, -0)
        ? 0
        : input.competitive_response_pp_per_disadvantage_point,
    provenance,
  };

  validateCompetitivePriceAssumption(candidate);
  return Object.freeze(candidate);
}

/**
 * Returns true when the competitive assumption is absent or has γ = 0.
 * If an assumption object is provided, it is validated first so invalid inputs
 * never silently pass as a zero-default.
 */
export function isZeroCompetitiveAssumption(
  assumption?: CompetitivePriceAssumption | null,
): boolean {
  if (assumption === undefined || assumption === null) {
    return true;
  }
  validateCompetitivePriceAssumption(assumption);
  return assumption.competitive_response_pp_per_disadvantage_point === 0;
}

/**
 * Generates human-readable provenance statement for the competitive assumption
 * using the canonical provenance vocabulary (`describeProvenance`).
 */
export function describeCompetitiveAssumptionProvenance(
  assumption: CompetitivePriceAssumption,
  fieldLabel = 'Assumed competitive benchmark price and response strength (γ)',
): string {
  validateCompetitivePriceAssumption(assumption);
  return describeProvenance(assumption.provenance, fieldLabel);
}

// ─── Relative Price Position ────────────────────────────────────────────────

export type RelativePriceStanding = 'DISADVANTAGE' | 'PARITY' | 'ADVANTAGE';

export interface RelativePricePosition {
  readonly list_price_gbp: number;
  readonly promotion_depth_pct: number;
  readonly our_promotional_price_gbp: number;
  readonly assumed_competitive_price_gbp: number;
  readonly price_gap_gbp: number;
  /**
   * Competitive disadvantage in percentage points of LIST PRICE:
   *   `((our_promotional_price_gbp - assumed_competitive_price_gbp) / list_price_gbp) * 100`
   *
   * Semantics:
   * - `disadvantage_pp > 0` → we are more expensive (`'DISADVANTAGE'`)
   * - `disadvantage_pp = 0` → price parity (`'PARITY'`)
   * - `disadvantage_pp < 0` → we are cheaper (`'ADVANTAGE'`)
   */
  readonly disadvantage_pp: number;
  readonly standing: RelativePriceStanding;
  readonly provenance: ProvenanceDescriptor;
}

function validateScenarioAndDepth(scenario: CanonicalScenario, depthPct: number): void {
  if (!scenario || !scenario.economics) {
    throw new CompetitiveAssumptionValidationError(
      'INVALID_SCENARIO',
      'A valid CanonicalScenario is required.',
    );
  }
  const listPrice = scenario.economics.list_price_gbp;
  if (typeof listPrice !== 'number' || !Number.isFinite(listPrice) || listPrice <= 0) {
    throw new CompetitiveAssumptionValidationError(
      'INVALID_LIST_PRICE',
      `Scenario list_price_gbp must be a finite positive number; received ${listPrice}.`,
    );
  }
  if (typeof depthPct !== 'number' || !Number.isFinite(depthPct)) {
    throw new CompetitiveAssumptionValidationError(
      'NON_FINITE_DEPTH',
      `Promotional depth must be a finite number; received ${depthPct}.`,
    );
  }
  if (depthPct < 0 || depthPct > 100) {
    throw new CompetitiveAssumptionValidationError(
      'OUT_OF_RANGE_DEPTH',
      `Promotional depth must be between 0 and 100%; received ${depthPct}.`,
    );
  }
}

function validateAssumedCompetitivePriceGbp(assumedCompetitivePriceGbp: number): number {
  if (
    typeof assumedCompetitivePriceGbp !== 'number' ||
    !Number.isFinite(assumedCompetitivePriceGbp)
  ) {
    throw new CompetitiveAssumptionValidationError(
      'NON_FINITE_COMPETITIVE_PRICE',
      'assumed_competitive_price_gbp must be a finite number.',
    );
  }
  const normalized = round2(assumedCompetitivePriceGbp);
  if (assumedCompetitivePriceGbp <= 0 || normalized <= 0) {
    throw new CompetitiveAssumptionValidationError(
      'NON_POSITIVE_COMPETITIVE_PRICE',
      `assumed_competitive_price_gbp must be strictly positive (> 0); received ${assumedCompetitivePriceGbp}.`,
    );
  }
  return normalized;
}

/**
 * Derives our promotional shelf price (GBP) at a given promotional depth (%)
 * by delegating to the authoritative `scenarioPromotedPriceGbp` function
 * without mutating `scenario`.
 */
export function scenarioPromotedPriceAtDepthGbp(
  scenario: CanonicalScenario,
  depthPct: number = scenario?.economics?.promotion_depth_pct,
): number {
  validateScenarioAndDepth(scenario, depthPct);
  if (depthPct === scenario.economics.promotion_depth_pct) {
    return scenarioPromotedPriceGbp(scenario);
  }
  const ephemeralScenario: CanonicalScenario = {
    ...scenario,
    economics: {
      ...scenario.economics,
      promotion_depth_pct: depthPct,
    },
  };
  return scenarioPromotedPriceGbp(ephemeralScenario);
}

/**
 * Derives competitive disadvantage in percentage points of LIST PRICE:
 *
 *   `disadvantage_pp = ((our_promotional_price - assumed_competitive_price) / list_price) * 100`
 *
 * Required semantics:
 * - `disadvantage_pp > 0` → we are more expensive than the assumed competitive price
 * - `disadvantage_pp = 0` → shelf-price parity
 * - `disadvantage_pp < 0` → we are cheaper than the assumed competitive price
 */
export function scenarioCompetitiveDisadvantagePp(
  scenario: CanonicalScenario,
  depthPct: number,
  assumedCompetitivePriceGbp: number,
): number {
  validateScenarioAndDepth(scenario, depthPct);
  const competitivePrice = validateAssumedCompetitivePriceGbp(assumedCompetitivePriceGbp);
  const ourPromotionalPrice = scenarioPromotedPriceAtDepthGbp(scenario, depthPct);
  const listPrice = scenario.economics.list_price_gbp;

  return round2(((ourPromotionalPrice - competitivePrice) / listPrice) * 100);
}

/**
 * Derives the full ephemeral `RelativePricePosition` at `depthPct` for an
 * assumed competitive benchmark price.
 */
export function deriveRelativePricePosition(
  scenario: CanonicalScenario,
  depthPct: number,
  assumedCompetitivePriceGbp: number,
): RelativePricePosition {
  validateScenarioAndDepth(scenario, depthPct);
  const competitivePrice = validateAssumedCompetitivePriceGbp(assumedCompetitivePriceGbp);
  const ourPromotionalPrice = scenarioPromotedPriceAtDepthGbp(scenario, depthPct);
  const disadvantagePp = scenarioCompetitiveDisadvantagePp(scenario, depthPct, competitivePrice);
  const priceGapGbp = round2(ourPromotionalPrice - competitivePrice);

  const standing: RelativePriceStanding =
    disadvantagePp > 0 ? 'DISADVANTAGE' : disadvantagePp < 0 ? 'ADVANTAGE' : 'PARITY';

  return {
    list_price_gbp: scenario.economics.list_price_gbp,
    promotion_depth_pct: round2(depthPct),
    our_promotional_price_gbp: ourPromotionalPrice,
    assumed_competitive_price_gbp: competitivePrice,
    price_gap_gbp: priceGapGbp,
    disadvantage_pp: disadvantagePp,
    standing,
    provenance: COMPETITIVE_DERIVED_PROVENANCE,
  };
}

// ─── Competitive Response Term ──────────────────────────────────────────────

/**
 * Single pure competitive-response function.
 *
 * Computes the demand response (in percentage points of base demand) to our
 * relative price position against the assumed competitive benchmark price:
 *
 *   `competitive_response_pp = round2(-γ * disadvantage_pp * scopeMultiplier)`
 *
 * Strictly separate from `scenarioDepthResponsePp` (which continues to represent
 * demand response to OUR promotional depth via `promotional_response_pp_per_depth_point`).
 *
 * Semantics across relative-price regimes:
 * - `disadvantage_pp > 0` (we are more expensive) → `competitive_response_pp < 0` (negative demand effect)
 * - `disadvantage_pp = 0` (price parity)          → `competitive_response_pp = 0`
 * - `disadvantage_pp < 0` (we are cheaper)        → `competitive_response_pp > 0` (positive demand effect)
 * - `assumption` absent or `γ = 0`                → `competitive_response_pp = 0`
 *
 * Symmetry rationale:
 * Linear symmetry across `disadvantage_pp < 0` is economically well-posed in CogniX
 * because unit margin erosion (`scenarioContributionAtDepthGbp`) is charged against
 * total volume (base + incremental), making net contribution a concave quadratic
 * function of depth that naturally reaches an interior optimum and turns negative at
 * excessive discount depths without arbitrary commercial caps or kinks.
 */
export function scenarioCompetitiveResponsePp(
  scenario: CanonicalScenario,
  depthPct: number = scenario?.economics?.promotion_depth_pct,
  assumption?: CompetitivePriceAssumption | null,
  scope?: string,
): number {
  validateScenarioAndDepth(scenario, depthPct);
  if (assumption === undefined || assumption === null) {
    return 0;
  }
  validateCompetitivePriceAssumption(assumption);
  if (assumption.competitive_response_pp_per_disadvantage_point === 0) {
    return 0;
  }

  const disadvantagePp = scenarioCompetitiveDisadvantagePp(
    scenario,
    depthPct,
    assumption.assumed_competitive_price_gbp,
  );
  if (disadvantagePp === 0) {
    return 0;
  }

  const scopeMultiplier = scope ? scenarioScopeResponseMultiplier(scenario, scope) : 1;
  return round2(
    -assumption.competitive_response_pp_per_disadvantage_point * disadvantagePp * scopeMultiplier,
  );
}

// ─── Ambient vs Intervention-Attributable Competitive Effect ────────────────

export interface CompetitiveEffectDecompositionInput {
  readonly scenario: CanonicalScenario;
  readonly assumption?: CompetitivePriceAssumption | null;
  /**
   * Promotional depth (%) in the current / baseline state prior to the evaluated
   * intervention change. Defaults to `0` (unpromoted list-price baseline).
   */
  readonly ambient_depth_pct?: number;
  /**
   * Promotional depth (%) in the target / candidate intervention configuration.
   * Defaults to `scenario.economics.promotion_depth_pct`.
   */
  readonly target_depth_pct?: number;
  /** Scope active in the ambient baseline state. */
  readonly ambient_scope?: string;
  /** Scope active in the target intervention state. Defaults to `ambient_scope`. */
  readonly target_scope?: string;
  /** Evaluation horizon in days. Defaults to `scenario.calendar.promotion_duration_days`. */
  readonly horizon_days?: number;
}

export interface CompetitiveEffectDecomposition {
  readonly ambient_depth_pct: number;
  readonly target_depth_pct: number;
  readonly ambient_disadvantage_pp: number;
  readonly target_disadvantage_pp: number;
  /**
   * AMBIENT COMPETITIVE EFFECT (`driver_class: 'ambient'`):
   * The demand effect (in pp of base demand) that already exists under the
   * current/baseline configuration because of the assumed competitive price.
   * This existing disadvantage/advantage is NOT campaign-created uplift/loss.
   */
  readonly ambient_competitive_effect_pp: number;
  /**
   * Total competitive demand effect (in pp of base demand) under the target
   * configuration (`ambient_competitive_effect_pp + intervention_attributable_competitive_effect_pp`).
   */
  readonly total_target_competitive_effect_pp: number;
  /**
   * INTERVENTION-ATTRIBUTABLE COMPETITIVE EFFECT (`driver_class: 'intervention'`):
   * The change in competitive demand effect caused ONLY when OUR depth/scope/configuration
   * changes from ambient to target:
   *   `total_target_competitive_effect_pp - ambient_competitive_effect_pp`
   */
  readonly intervention_attributable_competitive_effect_pp: number;
  readonly ambient_competitive_units_delta: number;
  readonly total_target_competitive_units_delta: number;
  readonly intervention_attributable_competitive_units_delta: number;
  readonly ambient_driver_class: 'ambient';
  readonly intervention_driver_class: 'intervention';
  readonly provenance: ProvenanceDescriptor;
}

function scenarioBaselineUnitsForScopeAndDuration(
  scenario: CanonicalScenario,
  scope?: string,
  durationDays?: number,
): number {
  const region = scope ?? scenario.identity.market_scope_label;
  const days = durationDays ?? scenario.calendar.promotion_duration_days;
  return archetypeBaselineUnits(
    scenarioWeeklyPopulationUnits(scenario) / scenarioStoreCount(scenario, 'National'),
    region,
    days,
    scenario,
  );
}

/**
 * Separates AMBIENT COMPETITIVE EFFECT (existing under the current/baseline
 * configuration because of the assumed competitive price) from
 * INTERVENTION-ATTRIBUTABLE COMPETITIVE EFFECT (the change in competitive
 * effect caused when OUR depth/scope/configuration changes).
 */
export function decomposeCompetitiveDemandEffect(
  input: CompetitiveEffectDecompositionInput,
): CompetitiveEffectDecomposition {
  const {
    scenario,
    assumption,
    ambient_depth_pct = 0,
    target_depth_pct = scenario?.economics?.promotion_depth_pct,
    ambient_scope,
    target_scope = ambient_scope,
    horizon_days = scenario?.calendar?.promotion_duration_days,
  } = input;

  validateScenarioAndDepth(scenario, ambient_depth_pct);
  validateScenarioAndDepth(scenario, target_depth_pct);

  if (assumption !== undefined && assumption !== null) {
    validateCompetitivePriceAssumption(assumption);
  }

  if (!assumption) {
    return {
      ambient_depth_pct: round2(ambient_depth_pct),
      target_depth_pct: round2(target_depth_pct),
      ambient_disadvantage_pp: 0,
      target_disadvantage_pp: 0,
      ambient_competitive_effect_pp: 0,
      total_target_competitive_effect_pp: 0,
      intervention_attributable_competitive_effect_pp: 0,
      ambient_competitive_units_delta: 0,
      total_target_competitive_units_delta: 0,
      intervention_attributable_competitive_units_delta: 0,
      ambient_driver_class: 'ambient',
      intervention_driver_class: 'intervention',
      provenance: COMPETITIVE_DERIVED_PROVENANCE,
    };
  }

  const ambientDisadvantagePp = scenarioCompetitiveDisadvantagePp(
    scenario,
    ambient_depth_pct,
    assumption.assumed_competitive_price_gbp,
  );
  const targetDisadvantagePp = scenarioCompetitiveDisadvantagePp(
    scenario,
    target_depth_pct,
    assumption.assumed_competitive_price_gbp,
  );

  const ambientEffectPp = scenarioCompetitiveResponsePp(
    scenario,
    ambient_depth_pct,
    assumption,
    ambient_scope,
  );
  const targetEffectPp = scenarioCompetitiveResponsePp(
    scenario,
    target_depth_pct,
    assumption,
    target_scope,
  );
  const attributableEffectPp = round2(targetEffectPp - ambientEffectPp);

  const ambientBaseUnits = scenarioBaselineUnitsForScopeAndDuration(
    scenario,
    ambient_scope,
    horizon_days,
  );
  const targetBaseUnits = scenarioBaselineUnitsForScopeAndDuration(
    scenario,
    target_scope,
    horizon_days,
  );

  const ambientUnitsDelta = Math.round(ambientBaseUnits * (ambientEffectPp / 100));
  const targetUnitsDelta = Math.round(targetBaseUnits * (targetEffectPp / 100));
  const attributableUnitsDelta = targetUnitsDelta - ambientUnitsDelta;

  return {
    ambient_depth_pct: round2(ambient_depth_pct),
    target_depth_pct: round2(target_depth_pct),
    ambient_disadvantage_pp: ambientDisadvantagePp,
    target_disadvantage_pp: targetDisadvantagePp,
    ambient_competitive_effect_pp: ambientEffectPp,
    total_target_competitive_effect_pp: targetEffectPp,
    intervention_attributable_competitive_effect_pp: attributableEffectPp,
    ambient_competitive_units_delta: ambientUnitsDelta,
    total_target_competitive_units_delta: targetUnitsDelta,
    intervention_attributable_competitive_units_delta: attributableUnitsDelta,
    ambient_driver_class: 'ambient',
    intervention_driver_class: 'intervention',
    provenance: COMPETITIVE_DERIVED_PROVENANCE,
  };
}

// ─── MATCH Parity Depth Derivation ──────────────────────────────────────────

export type CompetitiveMatchStatus =
  | 'MATCH_WITHIN_ALLOWED_RANGE'
  | 'PARITY_AT_LIST'
  | 'COMPETITOR_ABOVE_LIST'
  | 'EXCEEDS_MAX_ALLOWED_DEPTH';

export interface CompetitiveMatchBounds {
  readonly min: number;
  readonly max: number;
}

export interface CompetitiveMatchDerivation {
  readonly list_price_gbp: number;
  readonly assumed_competitive_price_gbp: number;
  /**
   * Exact algebraic promotional depth (%) required for shelf-price parity:
   *   `round2(((list_price_gbp - assumed_competitive_price_gbp) / list_price_gbp) * 100)`
   */
  readonly raw_required_depth_pct: number;
  /**
   * Promotional depth (%) within `[min_depth_pct, max_depth_pct]` that achieves
   * exact shelf-price parity (`our_promotional_price_gbp === assumed_competitive_price_gbp`),
   * or `null` when parity requires a negative depth (`COMPETITOR_ABOVE_LIST`) or exceeds
   * `max_depth_pct` (`EXCEEDS_MAX_ALLOWED_DEPTH`).
   */
  readonly match_depth_pct: number | null;
  /**
   * Executable depth (%) clamped to `[min_depth_pct, max_depth_pct]`.
   */
  readonly clamped_depth_pct: number;
  readonly min_depth_pct: number;
  readonly max_depth_pct: number;
  readonly is_achievable_within_bounds: boolean;
  readonly our_promoted_price_at_clamped_depth_gbp: number;
  readonly residual_disadvantage_at_clamped_depth_pp: number;
  readonly status: CompetitiveMatchStatus;
  readonly provenance: ProvenanceDescriptor;
}

/**
 * Deterministically derives the promotional depth (%) required for our
 * promotional shelf price to equal the assumed competitive shelf price (MATCH).
 *
 * MATCH is a configuration derivation (`our_promotional_price = assumed_competitive_price`),
 * not a commercial recommendation.
 *
 * Handles:
 * - `assumed_competitive_price_gbp <= 0` or non-finite → throws `CompetitiveAssumptionValidationError`
 * - `assumed_competitive_price_gbp === list_price_gbp` → `PARITY_AT_LIST` (`match_depth_pct = 0`)
 * - `assumed_competitive_price_gbp > list_price_gbp`   → `COMPETITOR_ABOVE_LIST` (`raw < 0`, `match_depth_pct = null`, `clamped_depth_pct = min`)
 * - `raw_required_depth_pct > max_depth_pct`           → `EXCEEDS_MAX_ALLOWED_DEPTH` (`match_depth_pct = null`, `clamped_depth_pct = max`)
 * - `min <= raw_required_depth_pct <= max`             → `MATCH_WITHIN_ALLOWED_RANGE` (`match_depth_pct = raw_required_depth_pct`)
 */
export function deriveCompetitiveMatchDepth(
  scenario: CanonicalScenario,
  assumedCompetitivePriceGbp: number,
  bounds?: CompetitiveMatchBounds,
): CompetitiveMatchDerivation {
  validateScenarioAndDepth(scenario, 0);
  const competitivePrice = validateAssumedCompetitivePriceGbp(assumedCompetitivePriceGbp);
  const listPrice = scenario.economics.list_price_gbp;

  const defaultBounds = numericFieldBounds('promotion_depth_pct') ?? { min: 0, max: 60 };
  const minDepthPct = bounds ? bounds.min : defaultBounds.min;
  const maxDepthPct = bounds ? bounds.max : defaultBounds.max;

  if (
    typeof minDepthPct !== 'number' ||
    !Number.isFinite(minDepthPct) ||
    typeof maxDepthPct !== 'number' ||
    !Number.isFinite(maxDepthPct) ||
    minDepthPct < 0 ||
    maxDepthPct > 100 ||
    minDepthPct > maxDepthPct
  ) {
    throw new CompetitiveAssumptionValidationError(
      'INVALID_DEPTH_BOUNDS',
      `Depth bounds must be finite numbers in [0, 100] with min <= max; received [${minDepthPct}, ${maxDepthPct}].`,
    );
  }

  const rawRequiredDepthPct = round2(((listPrice - competitivePrice) / listPrice) * 100);

  let status: CompetitiveMatchStatus;
  let matchDepthPct: number | null;
  let clampedDepthPct: number;
  let isAchievable: boolean;

  if (competitivePrice > listPrice) {
    status = 'COMPETITOR_ABOVE_LIST';
    matchDepthPct = null;
    clampedDepthPct = round2(minDepthPct);
    isAchievable = false;
  } else if (competitivePrice === listPrice || rawRequiredDepthPct === 0) {
    status = 'PARITY_AT_LIST';
    matchDepthPct = minDepthPct <= 0 ? 0 : null;
    clampedDepthPct = round2(Math.max(minDepthPct, 0));
    isAchievable = minDepthPct <= 0;
  } else if (rawRequiredDepthPct > maxDepthPct || rawRequiredDepthPct < minDepthPct) {
    status = 'EXCEEDS_MAX_ALLOWED_DEPTH';
    matchDepthPct = null;
    clampedDepthPct = round2(Math.min(Math.max(rawRequiredDepthPct, minDepthPct), maxDepthPct));
    isAchievable = false;
  } else {
    status = 'MATCH_WITHIN_ALLOWED_RANGE';
    matchDepthPct = rawRequiredDepthPct;
    clampedDepthPct = rawRequiredDepthPct;
    isAchievable = true;
  }

  const ourPriceAtClamped = scenarioPromotedPriceAtDepthGbp(scenario, clampedDepthPct);
  const residualDisadvantagePp = scenarioCompetitiveDisadvantagePp(
    scenario,
    clampedDepthPct,
    competitivePrice,
  );

  return {
    list_price_gbp: listPrice,
    assumed_competitive_price_gbp: competitivePrice,
    raw_required_depth_pct: rawRequiredDepthPct,
    match_depth_pct: matchDepthPct,
    clamped_depth_pct: clampedDepthPct,
    min_depth_pct: minDepthPct,
    max_depth_pct: maxDepthPct,
    is_achievable_within_bounds: isAchievable,
    our_promoted_price_at_clamped_depth_gbp: ourPriceAtClamped,
    residual_disadvantage_at_clamped_depth_pp: residualDisadvantagePp,
    status,
    provenance: COMPETITIVE_DERIVED_PROVENANCE,
  };
}

// ─── Single Economic Path Evaluators ────────────────────────────────────────

export interface CompetitiveEvaluationOptions {
  readonly scope?: string;
  readonly ambient_depth_pct?: number;
  readonly ambient_scope?: string;
  readonly horizon_days?: number;
  readonly candidate_depths_pct?: readonly number[];
}

export interface CompetitiveDepthEvaluationPoint {
  readonly discount_pct: number;
  readonly promoted_price_gbp: number;
  /** Authoritative own-price demand response (pp) from `scenarioDepthResponsePp` — unchanged by γ. */
  readonly own_price_response_pp: number;
  /** Separate competitive response (pp) from `scenarioCompetitiveResponsePp`. */
  readonly competitive_response_pp: number;
  /** Ambient competitive response (pp) at the ambient baseline configuration. */
  readonly ambient_competitive_effect_pp: number;
  /** Intervention-attributable competitive response (pp) caused by moving from ambient to `discount_pct`. */
  readonly intervention_attributable_competitive_effect_pp: number;
  /** Total intervention-attributable demand uplift (pp) at `discount_pct`. */
  readonly expected_demand_uplift_pct: number;
  /** Total demand uplift (pp) including ambient competitive effect. */
  readonly total_demand_uplift_with_ambient_pct: number;
  /** Derived competitive disadvantage (pp of list price) at `discount_pct`, or `0` when no assumption is present. */
  readonly disadvantage_pp: number;
  /** Baseline units across the campaign window before competitive/promotional movement. */
  readonly baseline_units: number;
  /** Expected physical demand units in the ambient baseline state (floored at 0). */
  readonly ambient_expected_demand_units: number;
  /** Expected physical demand units at `discount_pct` (floored at 0). */
  readonly expected_demand_units: number;
  /** Incremental units attributable to moving from ambient baseline to `discount_pct`. */
  readonly incremental_units: number;
  /** Unit contribution (GBP, 3dp to match `ElasticityPoint`). */
  readonly unit_contribution_gbp: number;
  /** Exact 4dp unit contribution (GBP) from `scenarioContributionAtDepthGbp`. */
  readonly exact_unit_contribution_gbp: number;
  /** Total contribution (GBP) at `discount_pct`. */
  readonly total_contribution_gbp: number;
  /** Net contribution delta (GBP, integer-rounded to match `ElasticityPoint`) relative to the ambient baseline. */
  readonly net_contribution_delta_gbp: number;
  /** Unit margin as % of promoted shelf price. */
  readonly margin_pct: number;
  /** Margin exposure (GBP) across the scenario forecast horizon at `discount_pct`. */
  readonly margin_exposure_gbp: number;
  readonly is_current?: boolean;
  readonly is_cognix_recommended?: boolean;
  readonly notes?: string;
}

export interface CompetitiveElasticityCurveResult {
  /** Curve points in exact `ElasticityPoint` shape used by Promotion and Campaign Intelligence. */
  readonly curve: readonly ElasticityPoint[];
  /** Detailed competitive depth evaluation points along the curve. */
  readonly competitive_points: readonly CompetitiveDepthEvaluationPoint[];
  /** Recommended promotional depth (%) under the MAXIMUM NET CONTRIBUTION objective. */
  readonly recommended_discount_pct: number;
  /** Net contribution delta (GBP) at the recommended depth. */
  readonly recommended_contribution_gbp: number;
  /** Whether any depth on the curve produces positive net contribution delta (> 0). */
  readonly has_accretive_depth: boolean;
  readonly assumption: CompetitivePriceAssumption | null;
  readonly match_derivation: CompetitiveMatchDerivation | null;
  readonly provenance: ProvenanceDescriptor;
}

/**
 * Evaluates a single promotional depth (`depthPct`) on a single authoritative
 * economic path reusable by future What-If, sensitivity sweeps, candidate
 * comparisons, and CDI evaluation.
 *
 * Guarantees the Zero-Default Invariant:
 * When `assumption` is absent or `γ = 0`, `expected_demand_uplift_pct`,
 * `unit_contribution_gbp`, `net_contribution_delta_gbp`, `expected_demand_units`,
 * and `margin_exposure_gbp` are byte-identical to canonical scenario functions.
 */
export function evaluateCompetitiveScenarioAtDepth(
  scenario: CanonicalScenario,
  depthPct: number = scenario?.economics?.promotion_depth_pct,
  assumption?: CompetitivePriceAssumption | null,
  options?: CompetitiveEvaluationOptions,
): CompetitiveDepthEvaluationPoint {
  validateScenarioAndDepth(scenario, depthPct);
  const scope = options?.scope;
  const ambientDepthPct = options?.ambient_depth_pct ?? 0;
  const ambientScope = options?.ambient_scope ?? scope;
  const horizonDays = options?.horizon_days ?? scenario.calendar.promotion_duration_days;

  if (assumption !== undefined && assumption !== null) {
    validateCompetitivePriceAssumption(assumption);
  }

  const zeroDefault = isZeroCompetitiveAssumption(assumption);
  const promotedPrice = scenarioPromotedPriceAtDepthGbp(scenario, depthPct);
  const ownPriceResponsePp = scenarioDepthResponsePp(scenario, depthPct, scope);
  const competitiveResponsePp = scenarioCompetitiveResponsePp(
    scenario,
    depthPct,
    assumption,
    scope,
  );
  const decomposition = decomposeCompetitiveDemandEffect({
    scenario,
    assumption,
    ambient_depth_pct: ambientDepthPct,
    target_depth_pct: depthPct,
    ambient_scope: ambientScope,
    target_scope: scope,
    horizon_days: horizonDays,
  });

  const baselineUnits = scenarioBaselineUnitsForScopeAndDuration(scenario, scope, horizonDays);
  const exactUnitContrib = scenarioContributionAtDepthGbp(scenario, depthPct);
  const exactUnitContribAt0 = scenarioContributionAtDepthGbp(scenario, 0);
  const unitContrib3dp = round3(exactUnitContrib);
  const marginPct = promotedPrice > 0 ? round1((exactUnitContrib / promotedPrice) * 100) : 0;

  if (zeroDefault) {
    const promotedUnitsFloat = Math.max(0, baselineUnits * (1 + ownPriceResponsePp / 100));
    const expectedUnits =
      !scope &&
      depthPct === scenario.economics.promotion_depth_pct &&
      horizonDays === scenario.calendar.promotion_duration_days
        ? scenarioExpectedDemandUnits(scenario)
        : Math.round(promotedUnitsFloat);
    const ambientUnits =
      !scope &&
      ambientDepthPct === 0 &&
      horizonDays === scenario.calendar.promotion_duration_days
        ? scenarioBaseDemandUnits(scenario)
        : Math.round(baselineUnits);
    const baselineContribution = baselineUnits * exactUnitContribAt0;
    const netContribDeltaGbp = Math.round(
      promotedUnitsFloat * exactUnitContrib - baselineContribution,
    );
    const totalContributionGbp = round2(promotedUnitsFloat * exactUnitContrib);
    const marginExposureGbp =
      !scope && depthPct === scenario.economics.promotion_depth_pct
        ? scenarioMarginExposureGbp(scenario)
        : round2(
            Math.max(0, expectedUnits - baselineUnits * scenario.supply.supplier_capacity_index) *
              scenarioGrossMarginPerUnitGbp(scenario),
          );

    return {
      discount_pct: depthPct,
      promoted_price_gbp: promotedPrice,
      own_price_response_pp: ownPriceResponsePp,
      competitive_response_pp: 0,
      ambient_competitive_effect_pp: 0,
      intervention_attributable_competitive_effect_pp: 0,
      expected_demand_uplift_pct: ownPriceResponsePp,
      total_demand_uplift_with_ambient_pct: ownPriceResponsePp,
      disadvantage_pp: decomposition.target_disadvantage_pp,
      baseline_units: Math.round(baselineUnits),
      ambient_expected_demand_units: Math.round(ambientUnits),
      expected_demand_units: Math.round(expectedUnits),
      incremental_units: Math.round(expectedUnits - ambientUnits),
      unit_contribution_gbp: unitContrib3dp,
      exact_unit_contribution_gbp: exactUnitContrib,
      total_contribution_gbp: totalContributionGbp,
      net_contribution_delta_gbp: netContribDeltaGbp,
      margin_pct: marginPct,
      margin_exposure_gbp: marginExposureGbp,
      is_current: depthPct === scenario.economics.promotion_depth_pct,
    };
  }

  // Competitive assumption active (γ > 0):
  // Ambient state (at ambient_depth_pct) carries ambient own-price response + ambient competitive response.
  // Target state (at depthPct) carries target own-price response + target competitive response.
  // Physical demand units are floored at 0 (`Math.max(0, ...)`).
  const ambientOwnResponsePp = scenarioDepthResponsePp(scenario, ambientDepthPct, ambientScope);
  const ambientTotalPct = round2(
    ambientOwnResponsePp + decomposition.ambient_competitive_effect_pp,
  );
  const targetTotalPct = round2(ownPriceResponsePp + competitiveResponsePp);
  const interventionAttributableUpliftPct = round2(
    ownPriceResponsePp -
      ambientOwnResponsePp +
      decomposition.intervention_attributable_competitive_effect_pp,
  );

  const ambientPromotedUnitsFloat = Math.max(0, baselineUnits * (1 + ambientTotalPct / 100));
  const targetPromotedUnitsFloat = Math.max(0, baselineUnits * (1 + targetTotalPct / 100));

  const ambientExpectedUnits = Math.max(0, Math.round(ambientPromotedUnitsFloat));
  const expectedUnits = Math.max(0, Math.round(targetPromotedUnitsFloat));
  const incrementalUnits = expectedUnits - ambientExpectedUnits;

  const exactUnitContribAtAmbient = scenarioContributionAtDepthGbp(scenario, ambientDepthPct);
  const ambientBaselineContribution = ambientPromotedUnitsFloat * exactUnitContribAtAmbient;
  const totalContributionGbp = round2(targetPromotedUnitsFloat * exactUnitContrib);
  const netContribDeltaGbp = Math.round(
    targetPromotedUnitsFloat * exactUnitContrib - ambientBaselineContribution,
  );

  const servableUnits = baselineUnits * scenario.supply.supplier_capacity_index;
  const exposedUnits = Math.max(0, expectedUnits - servableUnits);
  const marginExposureGbp = round2(exposedUnits * scenarioGrossMarginPerUnitGbp(scenario));

  return {
    discount_pct: depthPct,
    promoted_price_gbp: promotedPrice,
    own_price_response_pp: ownPriceResponsePp,
    competitive_response_pp: competitiveResponsePp,
    ambient_competitive_effect_pp: decomposition.ambient_competitive_effect_pp,
    intervention_attributable_competitive_effect_pp:
      decomposition.intervention_attributable_competitive_effect_pp,
    expected_demand_uplift_pct: interventionAttributableUpliftPct,
    total_demand_uplift_with_ambient_pct: targetTotalPct,
    disadvantage_pp: decomposition.target_disadvantage_pp,
    baseline_units: Math.round(baselineUnits),
    ambient_expected_demand_units: ambientExpectedUnits,
    expected_demand_units: expectedUnits,
    incremental_units: incrementalUnits,
    unit_contribution_gbp: unitContrib3dp,
    exact_unit_contribution_gbp: exactUnitContrib,
    total_contribution_gbp: totalContributionGbp,
    net_contribution_delta_gbp: netContribDeltaGbp,
    margin_pct: marginPct,
    margin_exposure_gbp: marginExposureGbp,
    is_current: depthPct === scenario.economics.promotion_depth_pct,
  };
}

/**
 * Evaluates the promotional depth curve under an optional `CompetitivePriceAssumption`,
 * selecting `recommended_discount_pct` to maximise `net_contribution_delta_gbp`
 * (MAXIMUM NET CONTRIBUTION objective).
 *
 * When `assumption` is absent or `γ = 0` (and default depth tiers are used),
 * delegates directly to `scenarioElasticityCurve(scenario)` so `curve`,
 * `recommended_discount_pct`, and `recommended_contribution_gbp` are byte-identical
 * to canonical CogniX outputs.
 */
export function evaluateCompetitiveDepthCurve(
  scenario: CanonicalScenario,
  assumption?: CompetitivePriceAssumption | null,
  options?: CompetitiveEvaluationOptions,
): CompetitiveElasticityCurveResult {
  validateScenarioAndDepth(scenario, scenario?.economics?.promotion_depth_pct ?? 0);
  if (assumption !== undefined && assumption !== null) {
    validateCompetitivePriceAssumption(assumption);
  }

  const zeroDefault = isZeroCompetitiveAssumption(assumption);
  const matchDerivation = assumption
    ? deriveCompetitiveMatchDepth(scenario, assumption.assumed_competitive_price_gbp)
    : null;

  const canonicalCurve = scenarioElasticityCurve(scenario);
  const candidateDepths =
    options?.candidate_depths_pct ?? canonicalCurve.map((pt) => pt.discount_pct);

  if (zeroDefault && !options?.candidate_depths_pct && !options?.scope && !options?.horizon_days) {
    const competitivePoints: CompetitiveDepthEvaluationPoint[] = canonicalCurve.map((pt) => {
      const pointEval = evaluateCompetitiveScenarioAtDepth(
        scenario,
        pt.discount_pct,
        assumption,
        options,
      );
      return {
        ...pointEval,
        expected_demand_uplift_pct: pt.expected_demand_uplift_pct,
        unit_contribution_gbp: pt.unit_contribution_gbp,
        net_contribution_delta_gbp: pt.net_contribution_delta_gbp,
        is_current: pt.is_current,
        is_cognix_recommended: pt.is_cognix_recommended,
        notes: pt.notes,
      };
    });

    const recommended =
      canonicalCurve.find((p) => p.is_cognix_recommended) ?? canonicalCurve[0];

    return {
      curve: canonicalCurve,
      competitive_points: competitivePoints,
      recommended_discount_pct: recommended.discount_pct,
      recommended_contribution_gbp: recommended.net_contribution_delta_gbp,
      has_accretive_depth: canonicalCurve.some((p) => p.net_contribution_delta_gbp > 0),
      assumption: assumption ?? null,
      match_derivation: matchDerivation,
      provenance: COMPETITIVE_DERIVED_PROVENANCE,
    };
  }

  const rawPoints = candidateDepths.map((depthPct) => {
    const canonicalTier = canonicalCurve.find((t) => t.discount_pct === depthPct);
    const evaluated = evaluateCompetitiveScenarioAtDepth(
      scenario,
      depthPct,
      assumption,
      options,
    );
    return {
      ...evaluated,
      notes: canonicalTier?.notes,
    };
  });

  const best = rawPoints.reduce(
    (a, b) => (b.net_contribution_delta_gbp > a.net_contribution_delta_gbp ? b : a),
    rawPoints[0],
  );

  const competitivePoints: CompetitiveDepthEvaluationPoint[] = rawPoints.map((pt) => ({
    ...pt,
    is_cognix_recommended: pt.discount_pct === best.discount_pct,
  }));

  const curve: ElasticityPoint[] = competitivePoints.map((pt) => ({
    discount_pct: pt.discount_pct,
    expected_demand_uplift_pct: pt.expected_demand_uplift_pct,
    unit_contribution_gbp: pt.unit_contribution_gbp,
    net_contribution_delta_gbp: pt.net_contribution_delta_gbp,
    is_current: pt.is_current,
    is_cognix_recommended: pt.is_cognix_recommended,
    notes: pt.notes,
  }));

  return {
    curve,
    competitive_points: competitivePoints,
    recommended_discount_pct: best.discount_pct,
    recommended_contribution_gbp: best.net_contribution_delta_gbp,
    has_accretive_depth: curve.some((p) => p.net_contribution_delta_gbp > 0),
    assumption: assumption ?? null,
    match_derivation: matchDerivation,
    provenance: COMPETITIVE_DERIVED_PROVENANCE,
  };
}

// ─── Candidate Comparison on the Single Economic Path ───────────────────────

export interface CompetitiveCandidateConfiguration {
  readonly depth_pct: number;
  readonly scope?: string;
}

export interface CompetitiveCandidateComparisonResult {
  readonly current: CompetitiveDepthEvaluationPoint;
  readonly candidate: CompetitiveDepthEvaluationPoint;
  readonly competitive_decomposition: CompetitiveEffectDecomposition;
  readonly own_price_response_delta_pp: number;
  readonly units_delta: number;
  readonly net_contribution_delta_gbp: number;
  readonly provenance: ProvenanceDescriptor;
}

/**
 * Compares a current configuration against a candidate configuration under the
 * same `CompetitivePriceAssumption`, explicitly attributing only the change caused
 * by moving from `currentConfig` to `candidateConfig`.
 */
export function evaluateCompetitiveCandidateComparison(
  scenario: CanonicalScenario,
  assumption: CompetitivePriceAssumption | null | undefined,
  currentConfig: CompetitiveCandidateConfiguration,
  candidateConfig: CompetitiveCandidateConfiguration,
  horizonDays: number = scenario?.calendar?.promotion_duration_days,
): CompetitiveCandidateComparisonResult {
  const currentEval = evaluateCompetitiveScenarioAtDepth(
    scenario,
    currentConfig.depth_pct,
    assumption,
    {
      scope: currentConfig.scope,
      ambient_depth_pct: currentConfig.depth_pct,
      ambient_scope: currentConfig.scope,
      horizon_days: horizonDays,
    },
  );

  const candidateEval = evaluateCompetitiveScenarioAtDepth(
    scenario,
    candidateConfig.depth_pct,
    assumption,
    {
      scope: candidateConfig.scope,
      ambient_depth_pct: currentConfig.depth_pct,
      ambient_scope: currentConfig.scope,
      horizon_days: horizonDays,
    },
  );

  const decomposition = decomposeCompetitiveDemandEffect({
    scenario,
    assumption,
    ambient_depth_pct: currentConfig.depth_pct,
    target_depth_pct: candidateConfig.depth_pct,
    ambient_scope: currentConfig.scope,
    target_scope: candidateConfig.scope,
    horizon_days: horizonDays,
  });

  return {
    current: currentEval,
    candidate: candidateEval,
    competitive_decomposition: decomposition,
    own_price_response_delta_pp: round2(
      candidateEval.own_price_response_pp - currentEval.own_price_response_pp,
    ),
    units_delta: candidateEval.expected_demand_units - currentEval.expected_demand_units,
    net_contribution_delta_gbp:
      candidateEval.net_contribution_delta_gbp - currentEval.net_contribution_delta_gbp,
    provenance: COMPETITIVE_DERIVED_PROVENANCE,
  };
}

// ─── CDI-02 & Authoritative Decision Evaluation Integration ─────────────────

export interface CompetitiveCdiDecisionResult {
  readonly cdi_response: CampaignEvaluationResponse;
  readonly competitive_decomposition: CompetitiveEffectDecomposition;
  readonly assumption: CompetitivePriceAssumption | null;
  readonly provenance: ProvenanceDescriptor;
}

/**
 * Evaluates a CDI-02 `CampaignEvaluationRequest` for a `CanonicalScenario` with
 * an optional `CompetitivePriceAssumption`.
 *
 * Enforces two core invariants:
 * 1. Zero-Default Invariant: when `assumption` is absent or `γ = 0`, `cdi_response`
 *    is the exact, unmodified output of `evaluateCampaignDecision(request)`.
 * 2. Ambient vs Intervention Attribution: when `γ > 0`, `ambient_competitive_effect_pp`
 *    (at 0% unpromoted baseline) is classified as `driver_class: 'ambient'` and adjusts
 *    `expected_without_intervention`, while ONLY `intervention_attributable_competitive_effect_pp`
 *    is classified as `driver_class: 'intervention'` and adjusts `campaign_delta`.
 *    The ambient competitive disadvantage is never credited or debited to the campaign.
 */
export function evaluateCompetitiveCdiDecision(
  scenario: CanonicalScenario,
  request: CampaignEvaluationRequest,
  assumption?: CompetitivePriceAssumption | null,
): CompetitiveCdiDecisionResult {
  if (assumption !== undefined && assumption !== null) {
    validateCompetitivePriceAssumption(assumption);
  }

  return withScenarioInScope(scenario, () => {
    const baseCdi = evaluateCampaignDecision(request);
    const posture = baseCdi.causal.intervention_posture;
    const mechanicDriver = baseCdi.causal.drivers.find(
      (d) => d.driver_id === 'mechanic_response',
    );
    const mechanicAttributed = Boolean(
      posture === 'CONSIDER_PROMOTION' && mechanicDriver?.attributed,
    );

    const statedDepth =
      mechanicAttributed && request.campaign_intent
        ? request.campaign_intent.campaign_intent.provisional_discount_depth ??
          scenario.economics.promotion_depth_pct
        : 0;
    const targetScope =
      request.campaign_intent?.audience_market?.region ??
      scenario.identity.market_scope_label;

    const decomposition = decomposeCompetitiveDemandEffect({
      scenario,
      assumption,
      ambient_depth_pct: 0,
      target_depth_pct: mechanicAttributed ? statedDepth : 0,
      ambient_scope: targetScope,
      target_scope: targetScope,
      horizon_days: baseCdi.counterfactual.horizon_days,
    });

    if (isZeroCompetitiveAssumption(assumption)) {
      return {
        cdi_response: baseCdi,
        competitive_decomposition: decomposition,
        assumption: assumption ?? null,
        provenance: COMPETITIVE_DERIVED_PROVENANCE,
      };
    }

    const attributableCompetitivePp = mechanicAttributed
      ? decomposition.intervention_attributable_competitive_effect_pp
      : 0;

    const updatedDrivers: CausalDriverContribution[] = baseCdi.causal.drivers.map((d) => {
      if (
        d.driver_id === 'intrinsic_demand' &&
        decomposition.ambient_competitive_effect_pp !== 0
      ) {
        const combinedPp = round2(
          d.contribution_pp + decomposition.ambient_competitive_effect_pp,
        );
        return {
          ...d,
          contribution_pp: combinedPp,
          attributed: true,
          rationale:
            `${d.rationale} Includes ambient competitive price position ` +
            `(${decomposition.ambient_competitive_effect_pp >= 0 ? '+' : ''}${decomposition.ambient_competitive_effect_pp}pp, modelled assumption).`,
          evidence_refs: [...d.evidence_refs, 'MODELLED_COMPETITIVE_ASSUMPTION'],
        };
      }
      if (d.driver_id === 'interaction_residual' && attributableCompetitivePp !== 0) {
        const combinedPp = round2(d.contribution_pp + attributableCompetitivePp);
        return {
          ...d,
          contribution_pp: combinedPp,
          attributed: true,
          rationale:
            `Intervention-attributable competitive price response ` +
            `(${attributableCompetitivePp >= 0 ? '+' : ''}${attributableCompetitivePp}pp) caused by moving promotional depth from 0% to ${statedDepth}%.`,
          evidence_refs: [...d.evidence_refs, 'MODELLED_COMPETITIVE_ASSUMPTION'],
        };
      }
      return d;
    });

    const sumWhere = (pred: (d: CausalDriverContribution) => boolean) =>
      round2(updatedDrivers.filter(pred).reduce((s, d) => s + d.contribution_pp, 0));

    const newAmbientPp = sumWhere((d) => d.driver_class === 'ambient');
    const newInterventionPp = sumWhere((d) => d.driver_class === 'intervention');
    const newTotalPp = round2(newAmbientPp + newInterventionPp);
    const newReconciledPp = sumWhere(() => true);

    const updatedCausal: CausalDemandContribution = {
      ...baseCdi.causal,
      ambient_uplift_pp: newAmbientPp,
      intervention_uplift_pp: newInterventionPp,
      total_predicted_uplift_pp: newTotalPp,
      drivers: updatedDrivers,
      reconciled_sum_pp: newReconciledPp,
      reconciliation_ok: Math.abs(newReconciledPp - newTotalPp) < 0.005,
    };

    const weeklyPop = scenarioWeeklyPopulationUnits(scenario);
    const wasteBase = scenario.economics.waste_units_per_week;
    const unitContribAtList = scenarioContributionPerUnitAtListGbp(scenario);
    const predictedUnitContrib =
      baseCdi.counterfactual.predicted_with_intervention.unit_contribution_gbp ??
      (mechanicAttributed && statedDepth > 0
        ? round4(
            unitContribAtList *
              Math.max(
                0,
                1 - statedDepth * scenarioContributionErosionPerDepthPoint(scenario),
              ),
          )
        : unitContribAtList);

    const withoutIndex = round2(100 + newAmbientPp);
    const predictedIndex = round2(withoutIndex + newInterventionPp);

    const withoutVolume = Math.max(0, Math.round(weeklyPop * (withoutIndex / 100)));
    const predictedVolume = Math.max(0, Math.round(weeklyPop * (predictedIndex / 100)));

    const applyClearance = newInterventionPp > 0;
    const withoutWaste = Math.round(wasteBase * (withoutIndex > 105 ? 1.05 : 1));
    const predictedWaste = Math.round(
      wasteBase * (applyClearance && predictedIndex > 100 ? 0.92 : 1) * (predictedIndex > 105 ? 1.05 : 1),
    );

    const updatedWithout: DemandTrajectoryPoint = {
      ...baseCdi.counterfactual.expected_without_intervention,
      volume_units: withoutVolume,
      volume_index_pct: withoutIndex,
      contribution_gbp: round2(withoutVolume * unitContribAtList),
      unit_contribution_gbp: unitContribAtList,
      waste_units: withoutWaste,
    };

    const updatedPredicted: DemandTrajectoryPoint = {
      ...baseCdi.counterfactual.predicted_with_intervention,
      volume_units: predictedVolume,
      volume_index_pct: predictedIndex,
      contribution_gbp: round2(predictedVolume * predictedUnitContrib),
      unit_contribution_gbp: predictedUnitContrib,
      waste_units: predictedWaste,
    };

    const volumeDeltaUnits = updatedPredicted.volume_units - updatedWithout.volume_units;
    const volumeDeltaPct =
      updatedWithout.volume_units === 0
        ? 0
        : round2((volumeDeltaUnits / updatedWithout.volume_units) * 100);
    const contributionDeltaGbp = round2(
      updatedPredicted.contribution_gbp - updatedWithout.contribution_gbp,
    );

    const updatedDelta: CampaignDeltaSummary = {
      volume_delta_units: volumeDeltaUnits,
      volume_delta_pct: volumeDeltaPct,
      contribution_delta_gbp: contributionDeltaGbp,
      waste_delta_units: updatedPredicted.waste_units - updatedWithout.waste_units,
      attributable_uplift_pp: newInterventionPp,
      intervention_indistinguishable_from_do_nothing: Math.abs(newInterventionPp) < 0.005,
    };

    const existingBridge = baseCdi.counterfactual.demand_bridge;
    const existingBasis = baseCdi.counterfactual.economic_basis;
    const ratePeriodDays = existingBasis?.rate_period_days ?? 7;
    const windowDays = existingBasis?.campaign_window_days ?? baseCdi.counterfactual.horizon_days;

    const updatedCounterfactual: CounterfactualBaseline = {
      ...baseCdi.counterfactual,
      expected_without_intervention: updatedWithout,
      predicted_with_intervention: updatedPredicted,
      campaign_delta: updatedDelta,
      demand_bridge: existingBridge
        ? {
            ...existingBridge,
            campaign_design_response_pp: round2(
              newInterventionPp - existingBridge.price_depth_response_pp,
            ),
            total_attributable_pp: newInterventionPp,
          }
        : undefined,
      economic_basis: existingBasis
        ? {
            ...existingBasis,
            contribution_delta_over_window_gbp: round2(
              contributionDeltaGbp * (windowDays / ratePeriodDays),
            ),
            volume_delta_over_window_units: Math.round(
              volumeDeltaUnits * (windowDays / ratePeriodDays),
            ),
          }
        : undefined,
    };

    return {
      cdi_response: {
        ...baseCdi,
        causal: updatedCausal,
        counterfactual: updatedCounterfactual,
      },
      competitive_decomposition: decomposition,
      assumption: assumption ?? null,
      provenance: COMPETITIVE_DERIVED_PROVENANCE,
    };
  });
}

/**
 * Evaluates authoritative scenario decision (`AuthoritativeScenarioDecision`)
 * with an optional `CompetitivePriceAssumption`.
 *
 * When `assumption` is absent or `γ = 0`, returns the exact result of
 * `evaluateAuthoritativeScenarioDecision(scenarioOrId)`.
 */
export async function evaluateCompetitiveAuthoritativeDecision(
  scenarioOrId: CanonicalScenario | string,
  assumption?: CompetitivePriceAssumption | null,
): Promise<AuthoritativeScenarioDecision> {
  if (isZeroCompetitiveAssumption(assumption)) {
    return evaluateAuthoritativeScenarioDecision(scenarioOrId);
  }
  const scenario =
    typeof scenarioOrId === 'string' ? resolveScenario(scenarioOrId) : scenarioOrId;
  const baseEval = await evaluateAuthoritativeScenarioDecision(scenario);
  const competitiveCurve = evaluateCompetitiveDepthCurve(scenario, assumption);

  return {
    ...baseEval,
    recommendedDepth: competitiveCurve.recommended_discount_pct,
  };
}
