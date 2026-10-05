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
            design_components:
              attributableCompetitivePp !== 0
                ? [
                    ...existingBridge.design_components,
                    {
                      driver_id: 'interaction_residual',
                      label: 'Competitive price response (modelled assumption)',
                      contribution_pp: attributableCompetitivePp,
                    },
                  ]
                : existingBridge.design_components,
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

// ─── Slices 2–3: What-If Intelligence & Decision Boundary Sweep ─────────────

/**
 * User-facing provenance semantics for competitive What-If assumptions.
 *
 * Internally Slice 1 uses `origin: 'modelled'`, `method: 'manual'`,
 * `authority: 'authoritative'` (meaning the governed engine accepts the input
 * as authoritative FOR THIS COUNTERFACTUAL EVALUATION only).
 *
 * User-facing copy must NEVER present the benchmark as market truth, observed
 * competitor price, attested evidence, or a competitor signal.
 */
export const COMPETITIVE_USER_FACING_PROVENANCE_BADGE = 'MODELLED ASSUMPTION' as const;
export const COMPETITIVE_USER_FACING_PROVENANCE_LABEL =
  'Modelled assumption · entered by you' as const;
export const COMPETITIVE_USER_FACING_PROVENANCE_NOTE =
  'Counterfactual exploration input only — evaluated deterministically against the certified scenario without external price feeds.' as const;

export interface CompetitiveUserFacingProvenance {
  readonly badge: typeof COMPETITIVE_USER_FACING_PROVENANCE_BADGE;
  readonly label: typeof COMPETITIVE_USER_FACING_PROVENANCE_LABEL;
  readonly note: typeof COMPETITIVE_USER_FACING_PROVENANCE_NOTE;
}

/**
 * Numerical search granularity for the deterministic decision-boundary sweep:
 * 1 percentage point of list-price competitive disadvantage.
 *
 * Documented explicitly as numerical search granularity for locating the first
 * regime transition across governed depth tiers, NOT a commercial threshold.
 */
export const COMPETITIVE_BOUNDARY_SWEEP_STEP_PP = 1;

export type CompetitiveDecisionBoundaryStatus =
  | 'CURRENT_WINNER'
  | 'FLIP_FOUND'
  | 'NO_FLIP_WITHIN_TESTED_RANGE';

export type CompetitiveBoundaryDirection =
  | 'MORE_AGGRESSIVE_COMPETITION'
  | 'LESS_AGGRESSIVE_COMPETITION';

export interface CompetitiveSweepPoint {
  /** Numerical search step index in percentage points of list-price disadvantage. */
  readonly tested_disadvantage_step_pp: number;
  /** Assumed generic competitive shelf price (GBP, 2dp) at this sweep point. */
  readonly assumed_competitive_price_gbp: number;
  /** Exact Slice 1 derived disadvantage (pp of list price) relative to our active promotional price. */
  readonly disadvantage_pp: number;
  /** Exact Slice 1 derived disadvantage (pp of list price) relative to our unpromoted list price (0% depth). */
  readonly disadvantage_at_list_pp: number;
  /** Contribution-maximising promotional depth (%) at this competitive price under MAXIMUM NET CONTRIBUTION. */
  readonly winning_depth_pct: number;
  /** Net contribution delta (GBP) at `winning_depth_pct`. */
  readonly winning_contribution_gbp: number;
  /** Net contribution delta (GBP) at the planner's active promotional depth. */
  readonly active_depth_contribution_gbp: number;
  /** Net contribution delta (GBP) at the current assumption's winning depth (`current_winner.winning_depth_pct`). */
  readonly current_winner_depth_contribution_gbp: number;
  /** True when this point corresponds to the user's entered competitive assumption. */
  readonly is_current_assumption: boolean;
  /** True when this point is the first decision boundary where the winning depth flips. */
  readonly is_first_boundary: boolean;
}

export interface CompetitiveCurrentWinnerSummary {
  readonly status: 'CURRENT_WINNER';
  readonly assumed_competitive_price_gbp: number;
  readonly disadvantage_pp: number;
  readonly disadvantage_at_list_pp: number;
  readonly winning_depth_pct: number;
  readonly winning_contribution_gbp: number;
  readonly active_depth_pct: number;
  readonly active_depth_contribution_gbp: number;
  readonly baseline_recommended_depth_pct: number;
  readonly baseline_recommended_contribution_gbp: number;
  readonly matches_baseline_recommendation: boolean;
  readonly is_active_depth_optimal: boolean;
}

export interface CompetitiveDecisionBoundaryPoint {
  readonly status: 'FLIP_FOUND';
  readonly direction: CompetitiveBoundaryDirection;
  readonly tested_disadvantage_step_pp: number;
  /** Competitive disadvantage (pp of list price) relative to our active promotional price at the flip. */
  readonly disadvantage_pp: number;
  /** Competitive disadvantage (pp of list price) relative to `previous_winning_depth_pct` at the flip. */
  readonly disadvantage_at_previous_winner_pp: number;
  /** Competitive disadvantage (pp of list price) relative to unpromoted list price (0% depth) at the flip. */
  readonly disadvantage_at_list_pp: number;
  /** Assumed competitive benchmark price (GBP) at the first flip point. */
  readonly assumed_competitive_price_gbp: number;
  /** Winning promotional depth (%) at the current assumption prior to the flip. */
  readonly previous_winning_depth_pct: number;
  /** Net contribution delta (GBP) of `previous_winning_depth_pct` evaluated at the boundary competitive price. */
  readonly previous_winning_contribution_at_boundary_gbp: number;
  /** New contribution-maximising promotional depth (%) at and beyond the boundary. */
  readonly new_winning_depth_pct: number;
  /** Net contribution delta (GBP) of `new_winning_depth_pct` at the boundary competitive price. */
  readonly new_winning_contribution_gbp: number;
  /** Net contribution advantage (GBP) of switching from `previous_winning_depth_pct` to `new_winning_depth_pct` at the boundary. */
  readonly contribution_advantage_gbp: number;
}

export interface CompetitiveRegimeSegment {
  readonly winning_depth_pct: number;
  readonly from_disadvantage_pp: number;
  readonly to_disadvantage_pp: number;
  readonly from_competitive_price_gbp: number;
  readonly to_competitive_price_gbp: number;
  readonly from_winning_contribution_gbp: number;
  readonly to_winning_contribution_gbp: number;
  readonly contains_current_assumption: boolean;
  readonly is_current_winner_regime: boolean;
  readonly is_beyond_boundary_regime: boolean;
}

export interface CompetitiveVisualLandmark {
  readonly id:
    | 'RANGE_START'
    | 'PRICE_PARITY'
    | 'CURRENT_ASSUMPTION'
    | 'DECISION_BOUNDARY'
    | 'BEYOND_BOUNDARY'
    | 'RANGE_END';
  readonly label: string;
  readonly assumed_competitive_price_gbp: number;
  readonly disadvantage_pp: number;
  readonly winning_depth_pct: number;
  readonly winning_contribution_gbp: number;
  readonly active_depth_contribution_gbp: number;
  readonly is_current_assumption: boolean;
  readonly is_boundary: boolean;
  readonly is_beyond_boundary: boolean;
}

export interface CompetitiveDecisionBoundarySweepInput {
  readonly scenario: CanonicalScenario;
  readonly assumption: CompetitivePriceAssumption;
  /**
   * Active promotional depth (%) in the planner.
   * Defaults to `scenario.economics.promotion_depth_pct`.
   */
  readonly active_depth_pct?: number;
  readonly scope?: string;
  readonly horizon_days?: number;
  /**
   * Governed depth alternatives to evaluate at each sweep point.
   * Defaults to the scenario's `scenarioElasticityCurve` depth tiers (`[0, 5, 10, 14, 20, 25, 30]`).
   */
  readonly candidate_depths_pct?: readonly number[];
  /**
   * Optional override for minimum tested competitive disadvantage (pp of list price
   * relative to `active_depth_pct`).
   */
  readonly min_disadvantage_pp?: number;
  /**
   * Optional override for maximum tested competitive disadvantage (pp of list price
   * relative to `active_depth_pct`).
   */
  readonly max_disadvantage_pp?: number;
  /**
   * Numerical search step in percentage points of list-price disadvantage.
   * Defaults to `COMPETITIVE_BOUNDARY_SWEEP_STEP_PP` (`1`).
   */
  readonly step_pp?: number;
}

export interface CompetitiveDecisionBoundarySweepResult {
  /** Explicit outcome status: `'FLIP_FOUND'` or `'NO_FLIP_WITHIN_TESTED_RANGE'`. */
  readonly outcome: 'FLIP_FOUND' | 'NO_FLIP_WITHIN_TESTED_RANGE';
  /** Alias for `outcome` matching boundary status vocabulary. */
  readonly boundary_status: 'FLIP_FOUND' | 'NO_FLIP_WITHIN_TESTED_RANGE';
  /** Explicit current-assumption winner record (`status: 'CURRENT_WINNER'`). */
  readonly current_winner: CompetitiveCurrentWinnerSummary;
  /** Computed first decision boundary (`status: 'FLIP_FOUND'`), or `null` when no flip exists in the tested range. */
  readonly boundary: CompetitiveDecisionBoundaryPoint | null;
  /** Minimum tested competitive disadvantage (pp of list price vs active promotional price). */
  readonly min_disadvantage_pp: number;
  /** Maximum tested competitive disadvantage (pp of list price vs active promotional price). */
  readonly max_disadvantage_pp: number;
  /** Numerical search granularity (pp of list price). */
  readonly step_pp: number;
  /** Governed depth alternatives evaluated at each point. */
  readonly evaluated_depths_pct: readonly number[];
  /** Contiguous optimal-depth regimes across the tested competitive disadvantage range. */
  readonly regime_segments: readonly CompetitiveRegimeSegment[];
  /** Compact set of 4–6 meaningful landmarks for the decision-boundary visual (avoids exposing dozens of sweep rows). */
  readonly visual_landmarks: readonly CompetitiveVisualLandmark[];
  /** Full deterministic sweep series for programmatic verification and unit tests. */
  readonly sweep_points: readonly CompetitiveSweepPoint[];
  readonly provenance: ProvenanceDescriptor;
}

/**
 * Deterministic domain-level decision-boundary sweep.
 *
 * Answers:
 *   "At what competitive price position does the preferred promotion configuration change?"
 *
 * Algorithm:
 * 1. Evaluates the baseline (no-assumption) curve and the current-assumption curve
 *    across governed depth alternatives under `MAXIMUM NET CONTRIBUTION`.
 * 2. Sweeps competitive disadvantage over the smallest deterministic range justified
 *    by governed depth bounds (`[0%, 60%]`) using `step_pp = 1` (1 percentage-point
 *    list-price disadvantage numerical search granularity).
 * 3. Evaluates all governed depth alternatives at each point and selects the
 *    contribution-maximising depth.
 * 4. Identifies the first point moving away from the current assumption where the
 *    winning depth differs from `current_winner.winning_depth_pct`.
 * 5. Never manufactures a boundary: when `γ = 0` or when a single depth remains optimal
 *    across the entire tested range, returns `NO_FLIP_WITHIN_TESTED_RANGE` with `boundary: null`.
 */
export function evaluateCompetitiveDecisionBoundarySweep(
  input: CompetitiveDecisionBoundarySweepInput,
): CompetitiveDecisionBoundarySweepResult {
  const {
    scenario,
    assumption,
    active_depth_pct = scenario?.economics?.promotion_depth_pct,
    scope,
    horizon_days = scenario?.calendar?.promotion_duration_days,
    candidate_depths_pct,
  } = input;

  validateScenarioAndDepth(scenario, active_depth_pct);
  validateCompetitivePriceAssumption(assumption);

  const stepPp = input.step_pp ?? COMPETITIVE_BOUNDARY_SWEEP_STEP_PP;
  if (typeof stepPp !== 'number' || !Number.isFinite(stepPp) || stepPp <= 0) {
    throw new CompetitiveAssumptionValidationError(
      'INVALID_SWEEP_STEP',
      `Sweep step_pp must be a finite positive number; received ${stepPp}.`,
    );
  }

  const evalOptions: CompetitiveEvaluationOptions = {
    scope,
    ambient_depth_pct: 0,
    ambient_scope: scope,
    horizon_days,
    candidate_depths_pct,
  };

  const baselineCurve = evaluateCompetitiveDepthCurve(scenario, null, evalOptions);
  const evaluatedDepths = baselineCurve.curve.map((pt) => pt.discount_pct);

  const currentCurve = evaluateCompetitiveDepthCurve(scenario, assumption, evalOptions);
  const currentPosition = deriveRelativePricePosition(
    scenario,
    active_depth_pct,
    assumption.assumed_competitive_price_gbp,
  );
  const currentDisadvantageAtListPp = scenarioCompetitiveDisadvantagePp(
    scenario,
    0,
    assumption.assumed_competitive_price_gbp,
  );
  const activePointAtCurrent = evaluateCompetitiveScenarioAtDepth(
    scenario,
    active_depth_pct,
    assumption,
    evalOptions,
  );

  const currentWinner: CompetitiveCurrentWinnerSummary = {
    status: 'CURRENT_WINNER',
    assumed_competitive_price_gbp: assumption.assumed_competitive_price_gbp,
    disadvantage_pp: currentPosition.disadvantage_pp,
    disadvantage_at_list_pp: currentDisadvantageAtListPp,
    winning_depth_pct: currentCurve.recommended_discount_pct,
    winning_contribution_gbp: currentCurve.recommended_contribution_gbp,
    active_depth_pct: round2(active_depth_pct),
    active_depth_contribution_gbp: activePointAtCurrent.net_contribution_delta_gbp,
    baseline_recommended_depth_pct: baselineCurve.recommended_discount_pct,
    baseline_recommended_contribution_gbp: baselineCurve.recommended_contribution_gbp,
    matches_baseline_recommendation:
      currentCurve.recommended_discount_pct === baselineCurve.recommended_discount_pct,
    is_active_depth_optimal:
      round2(active_depth_pct) === currentCurve.recommended_discount_pct,
  };

  // Governed depth bounds [0%, 60%] justify sweeping from list-price reference
  // (or -20pp advantage) to 60% below list price (+60pp disadvantage vs list).
  const depthBounds = numericFieldBounds('promotion_depth_pct') ?? { min: 0, max: 60 };
  const defaultMinDisadvantagePp = Math.min(-20, Math.floor(-active_depth_pct));
  const defaultMaxDisadvantagePp = Math.max(
    40,
    Math.ceil(depthBounds.max - active_depth_pct),
  );

  const minDisadvantagePp =
    input.min_disadvantage_pp !== undefined
      ? input.min_disadvantage_pp
      : Math.min(defaultMinDisadvantagePp, Math.floor(currentPosition.disadvantage_pp));
  const maxDisadvantagePp =
    input.max_disadvantage_pp !== undefined
      ? input.max_disadvantage_pp
      : Math.max(defaultMaxDisadvantagePp, Math.ceil(currentPosition.disadvantage_pp));

  const listPrice = scenario.economics.list_price_gbp;
  const ourPromotionalPrice = scenarioPromotedPriceAtDepthGbp(scenario, active_depth_pct);
  const gamma = assumption.competitive_response_pp_per_disadvantage_point;

  interface RawEvaluatedPoint {
    tested_disadvantage_step_pp: number;
    assumed_competitive_price_gbp: number;
    disadvantage_pp: number;
    disadvantage_at_list_pp: number;
    winning_depth_pct: number;
    winning_contribution_gbp: number;
    active_depth_contribution_gbp: number;
    current_winner_depth_contribution_gbp: number;
    is_current_assumption: boolean;
  }

  const byPriceKey = new Map<number, RawEvaluatedPoint>();

  const evaluateAtPrice = (
    compPriceGbp: number,
    stepDisadvantagePp: number,
    isCurrent: boolean,
  ): RawEvaluatedPoint => {
    const pointAssumption = createCompetitivePriceAssumption({
      assumed_competitive_price_gbp: compPriceGbp,
      competitive_response_pp_per_disadvantage_point: gamma,
    });
    const curveRes = evaluateCompetitiveDepthCurve(scenario, pointAssumption, evalOptions);
    const activeEval =
      curveRes.competitive_points.find((p) => p.discount_pct === active_depth_pct) ??
      evaluateCompetitiveScenarioAtDepth(scenario, active_depth_pct, pointAssumption, evalOptions);
    const currentWinnerEval =
      curveRes.competitive_points.find(
        (p) => p.discount_pct === currentWinner.winning_depth_pct,
      ) ??
      evaluateCompetitiveScenarioAtDepth(
        scenario,
        currentWinner.winning_depth_pct,
        pointAssumption,
        evalOptions,
      );

    return {
      tested_disadvantage_step_pp: round2(stepDisadvantagePp),
      assumed_competitive_price_gbp: pointAssumption.assumed_competitive_price_gbp,
      disadvantage_pp: scenarioCompetitiveDisadvantagePp(
        scenario,
        active_depth_pct,
        pointAssumption.assumed_competitive_price_gbp,
      ),
      disadvantage_at_list_pp: scenarioCompetitiveDisadvantagePp(
        scenario,
        0,
        pointAssumption.assumed_competitive_price_gbp,
      ),
      winning_depth_pct: curveRes.recommended_discount_pct,
      winning_contribution_gbp: curveRes.recommended_contribution_gbp,
      active_depth_contribution_gbp: activeEval.net_contribution_delta_gbp,
      current_winner_depth_contribution_gbp: currentWinnerEval.net_contribution_delta_gbp,
      is_current_assumption: isCurrent,
    };
  };

  // Always insert the exact user-entered current assumption first.
  const exactCurrentPoint = evaluateAtPrice(
    assumption.assumed_competitive_price_gbp,
    currentPosition.disadvantage_pp,
    true,
  );
  byPriceKey.set(exactCurrentPoint.assumed_competitive_price_gbp, exactCurrentPoint);

  // Evaluate deterministic 1pp disadvantage steps across [minDisadvantagePp, maxDisadvantagePp].
  for (
    let stepD = minDisadvantagePp;
    stepD <= maxDisadvantagePp + 1e-9;
    stepD = round2(stepD + stepPp)
  ) {
    const rawCompPrice = round2(ourPromotionalPrice - listPrice * (stepD / 100));
    if (rawCompPrice <= 0) {
      continue;
    }
    if (byPriceKey.has(rawCompPrice)) {
      continue;
    }
    byPriceKey.set(rawCompPrice, evaluateAtPrice(rawCompPrice, stepD, false));
  }

  // Sort in ascending order of competitive disadvantage (from lowest disadvantage / highest
  // competitor price to highest disadvantage / lowest competitor price).
  const sortedRawPoints = Array.from(byPriceKey.values()).sort((a, b) => {
    if (a.disadvantage_pp !== b.disadvantage_pp) {
      return a.disadvantage_pp - b.disadvantage_pp;
    }
    return b.assumed_competitive_price_gbp - a.assumed_competitive_price_gbp;
  });

  // Identify the first decision boundary where winning_depth_pct differs from currentWinner.
  // When γ = 0, no competitive decision boundary can exist.
  let boundary: CompetitiveDecisionBoundaryPoint | null = null;

  if (gamma > 0) {
    // 1. Search in direction of increasing competitive disadvantage (more aggressive competitor price)
    const moreAggressiveCandidate = sortedRawPoints
      .filter((pt) => pt.disadvantage_pp > currentPosition.disadvantage_pp)
      .find((pt) => pt.winning_depth_pct !== currentWinner.winning_depth_pct);

    if (moreAggressiveCandidate) {
      boundary = {
        status: 'FLIP_FOUND',
        direction: 'MORE_AGGRESSIVE_COMPETITION',
        tested_disadvantage_step_pp: moreAggressiveCandidate.tested_disadvantage_step_pp,
        disadvantage_pp: moreAggressiveCandidate.disadvantage_pp,
        disadvantage_at_previous_winner_pp: scenarioCompetitiveDisadvantagePp(
          scenario,
          currentWinner.winning_depth_pct,
          moreAggressiveCandidate.assumed_competitive_price_gbp,
        ),
        disadvantage_at_list_pp: moreAggressiveCandidate.disadvantage_at_list_pp,
        assumed_competitive_price_gbp: moreAggressiveCandidate.assumed_competitive_price_gbp,
        previous_winning_depth_pct: currentWinner.winning_depth_pct,
        previous_winning_contribution_at_boundary_gbp:
          moreAggressiveCandidate.current_winner_depth_contribution_gbp,
        new_winning_depth_pct: moreAggressiveCandidate.winning_depth_pct,
        new_winning_contribution_gbp: moreAggressiveCandidate.winning_contribution_gbp,
        contribution_advantage_gbp:
          moreAggressiveCandidate.winning_contribution_gbp -
          moreAggressiveCandidate.current_winner_depth_contribution_gbp,
      };
    } else {
      // 2. If no upward flip exists, search in direction of decreasing disadvantage (less aggressive competition)
      const lessAggressiveCandidate = [...sortedRawPoints]
        .filter((pt) => pt.disadvantage_pp < currentPosition.disadvantage_pp)
        .reverse()
        .find((pt) => pt.winning_depth_pct !== currentWinner.winning_depth_pct);

      if (lessAggressiveCandidate) {
        boundary = {
          status: 'FLIP_FOUND',
          direction: 'LESS_AGGRESSIVE_COMPETITION',
          tested_disadvantage_step_pp: lessAggressiveCandidate.tested_disadvantage_step_pp,
          disadvantage_pp: lessAggressiveCandidate.disadvantage_pp,
          disadvantage_at_previous_winner_pp: scenarioCompetitiveDisadvantagePp(
            scenario,
            currentWinner.winning_depth_pct,
            lessAggressiveCandidate.assumed_competitive_price_gbp,
          ),
          disadvantage_at_list_pp: lessAggressiveCandidate.disadvantage_at_list_pp,
          assumed_competitive_price_gbp: lessAggressiveCandidate.assumed_competitive_price_gbp,
          previous_winning_depth_pct: currentWinner.winning_depth_pct,
          previous_winning_contribution_at_boundary_gbp:
            lessAggressiveCandidate.current_winner_depth_contribution_gbp,
          new_winning_depth_pct: lessAggressiveCandidate.winning_depth_pct,
          new_winning_contribution_gbp: lessAggressiveCandidate.winning_contribution_gbp,
          contribution_advantage_gbp:
            lessAggressiveCandidate.winning_contribution_gbp -
            lessAggressiveCandidate.current_winner_depth_contribution_gbp,
        };
      }
    }
  }

  const sweepPoints: CompetitiveSweepPoint[] = sortedRawPoints.map((pt) => ({
    ...pt,
    is_first_boundary:
      boundary !== null &&
      pt.assumed_competitive_price_gbp === boundary.assumed_competitive_price_gbp,
  }));

  // Build contiguous optimal-depth regime segments across the tested range.
  const regimeSegments: CompetitiveRegimeSegment[] = [];
  for (const pt of sweepPoints) {
    const last = regimeSegments[regimeSegments.length - 1];
    if (!last || last.winning_depth_pct !== pt.winning_depth_pct) {
      regimeSegments.push({
        winning_depth_pct: pt.winning_depth_pct,
        from_disadvantage_pp: pt.disadvantage_pp,
        to_disadvantage_pp: pt.disadvantage_pp,
        from_competitive_price_gbp: pt.assumed_competitive_price_gbp,
        to_competitive_price_gbp: pt.assumed_competitive_price_gbp,
        from_winning_contribution_gbp: pt.winning_contribution_gbp,
        to_winning_contribution_gbp: pt.winning_contribution_gbp,
        contains_current_assumption: pt.is_current_assumption,
        is_current_winner_regime: pt.winning_depth_pct === currentWinner.winning_depth_pct,
        is_beyond_boundary_regime:
          boundary !== null && pt.winning_depth_pct === boundary.new_winning_depth_pct,
      });
    } else {
      regimeSegments[regimeSegments.length - 1] = {
        ...last,
        to_disadvantage_pp: pt.disadvantage_pp,
        to_competitive_price_gbp: pt.assumed_competitive_price_gbp,
        to_winning_contribution_gbp: pt.winning_contribution_gbp,
        contains_current_assumption: last.contains_current_assumption || pt.is_current_assumption,
      };
    }
  }

  // Build compact visual landmarks (4–6 key points, never dozens of raw sweep rows).
  const landmarks: CompetitiveVisualLandmark[] = [];
  const usedPrices = new Set<number>();

  const pushLandmark = (
    id: CompetitiveVisualLandmark['id'],
    label: string,
    pt: CompetitiveSweepPoint | undefined,
    flags?: { isBoundary?: boolean; isBeyond?: boolean },
  ) => {
    if (!pt || usedPrices.has(pt.assumed_competitive_price_gbp)) return;
    usedPrices.add(pt.assumed_competitive_price_gbp);
    landmarks.push({
      id,
      label,
      assumed_competitive_price_gbp: pt.assumed_competitive_price_gbp,
      disadvantage_pp: pt.disadvantage_pp,
      winning_depth_pct: pt.winning_depth_pct,
      winning_contribution_gbp: pt.winning_contribution_gbp,
      active_depth_contribution_gbp: pt.active_depth_contribution_gbp,
      is_current_assumption: pt.is_current_assumption,
      is_boundary: Boolean(flags?.isBoundary || pt.is_first_boundary),
      is_beyond_boundary: Boolean(flags?.isBeyond),
    });
  };

  const firstPoint = sweepPoints[0];
  const lastPoint = sweepPoints[sweepPoints.length - 1];
  const parityPoint = sweepPoints.reduce(
    (best, pt) =>
      Math.abs(pt.disadvantage_pp) < Math.abs(best.disadvantage_pp) ? pt : best,
    sweepPoints[0],
  );
  const currentSweepPoint = sweepPoints.find((pt) => pt.is_current_assumption);
  const boundarySweepPoint = sweepPoints.find((pt) => pt.is_first_boundary);
  const beyondSweepPoint =
    boundary && boundary.direction === 'MORE_AGGRESSIVE_COMPETITION'
      ? sweepPoints.find(
          (pt) =>
            pt.disadvantage_pp > boundary.disadvantage_pp &&
            pt.winning_depth_pct === boundary.new_winning_depth_pct,
        ) ?? boundarySweepPoint
      : boundary && boundary.direction === 'LESS_AGGRESSIVE_COMPETITION'
        ? [...sweepPoints]
            .reverse()
            .find(
              (pt) =>
                pt.disadvantage_pp < boundary.disadvantage_pp &&
                pt.winning_depth_pct === boundary.new_winning_depth_pct,
            ) ?? boundarySweepPoint
        : undefined;

  // Always prioritize Current Assumption and Decision Boundary so they are never omitted
  // when another landmark happens to share the same competitive price.
  pushLandmark('CURRENT_ASSUMPTION', 'Current Assumption', currentSweepPoint);
  if (boundarySweepPoint) {
    pushLandmark('DECISION_BOUNDARY', 'Decision Boundary', boundarySweepPoint, {
      isBoundary: true,
    });
  }
  if (beyondSweepPoint && beyondSweepPoint !== boundarySweepPoint) {
    pushLandmark('BEYOND_BOUNDARY', 'Beyond Boundary', beyondSweepPoint, {
      isBeyond: true,
    });
  }
  if (Math.abs(parityPoint.disadvantage_pp) <= 1.5) {
    pushLandmark('PRICE_PARITY', 'Price Parity Reference', parityPoint);
  }
  pushLandmark('RANGE_START', 'Tested Range Start', firstPoint);
  pushLandmark('RANGE_END', 'Tested Range End', lastPoint);

  landmarks.sort((a, b) => a.disadvantage_pp - b.disadvantage_pp);

  const outcome = boundary ? 'FLIP_FOUND' : 'NO_FLIP_WITHIN_TESTED_RANGE';

  return {
    outcome,
    boundary_status: outcome,
    current_winner: currentWinner,
    boundary,
    min_disadvantage_pp: sweepPoints[0]?.disadvantage_pp ?? minDisadvantagePp,
    max_disadvantage_pp:
      sweepPoints[sweepPoints.length - 1]?.disadvantage_pp ?? maxDisadvantagePp,
    step_pp: stepPp,
    evaluated_depths_pct: evaluatedDepths,
    regime_segments: regimeSegments,
    visual_landmarks: landmarks,
    sweep_points: sweepPoints,
    provenance: COMPETITIVE_DERIVED_PROVENANCE,
  };
}

// ─── Complete What-If Intelligence Evaluation ───────────────────────────────

export interface CompetitiveWhatIfPositionSummary {
  readonly position: RelativePricePosition;
  readonly relative_position_label: string;
  readonly headline: string;
  readonly detail: string;
}

export interface CompetitiveWhatIfDecisionImpact {
  readonly active_depth_pct: number;
  readonly baseline_recommended_depth_pct: number;
  readonly baseline_recommended_contribution_gbp: number;
  readonly competitive_recommended_depth_pct: number;
  readonly competitive_recommended_contribution_gbp: number;
  readonly does_baseline_recommendation_hold: boolean;
  readonly is_active_depth_optimal: boolean;
  readonly active_point: CompetitiveDepthEvaluationPoint;
  readonly recommended_point: CompetitiveDepthEvaluationPoint;
  readonly decomposition: CompetitiveEffectDecomposition;
  readonly own_promotion_effect_label: string;
  readonly competitive_assumption_effect_label: string;
  readonly ambient_attribution_note: string;
}

export interface CompetitiveWhatIfMatchReference {
  readonly derivation: CompetitiveMatchDerivation;
  readonly clamped_evaluation: CompetitiveDepthEvaluationPoint;
  readonly headline: string;
  readonly detail: string;
}

export interface CompetitiveWhatIfPlainLanguageSummary {
  readonly current_decision_headline: string;
  readonly current_decision_detail: string;
  readonly competitive_position_headline: string;
  readonly competitive_position_detail: string;
  readonly decision_boundary_headline: string;
  readonly decision_boundary_detail: string;
  readonly beyond_boundary_headline: string;
  readonly beyond_boundary_detail: string;
}

export type CompetitiveResponseOptionType =
  | 'HOLD'
  | 'MATCH'
  | 'TARGET'
  | 'REDUCE_EXPOSURE';

export const GOVERNED_PLANNER_DURATION_DAYS = [7, 14, 21, 28] as const;

export const COMPETITIVE_PREFERRED_RESPONSE_BADGE = 'COGNIX PREFERRED RESPONSE' as const;

export interface CompetitiveResponseOption {
  readonly option_type: CompetitiveResponseOptionType;
  readonly label: 'HOLD' | 'MATCH' | 'TARGET' | 'REDUCE EXPOSURE';
  readonly title: string;
  readonly available: boolean;
  readonly unavailable_reason: string | null;
  readonly depth_pct: number | null;
  readonly promoted_price_gbp: number | null;
  readonly scope: string;
  readonly stores_count: number;
  readonly duration_days: number;
  readonly relative_price_position: RelativePricePosition | null;
  readonly relative_position_label: string;
  readonly own_price_response_pp: number | null;
  readonly competitive_response_pp: number | null;
  readonly ambient_competitive_effect_pp: number | null;
  readonly intervention_attributable_competitive_effect_pp: number | null;
  readonly expected_demand_uplift_pct: number | null;
  readonly expected_demand_units: number | null;
  readonly incremental_units: number | null;
  readonly net_contribution_delta_gbp: number | null;
  readonly margin_exposure_gbp: number | null;
  readonly delta_vs_hold_contribution_gbp: number | null;
  readonly delta_vs_hold_uplift_pp: number | null;
  readonly delta_vs_hold_exposure_gbp: number | null;
  readonly rationale: string;
  readonly is_preferred: boolean;
  readonly preferred_badge: typeof COMPETITIVE_PREFERRED_RESPONSE_BADGE | null;
  readonly evaluation: CompetitiveDepthEvaluationPoint | null;
  readonly provenance_badge: typeof COMPETITIVE_USER_FACING_PROVENANCE_BADGE;
  readonly provenance_label: typeof COMPETITIVE_USER_FACING_PROVENANCE_LABEL;
}

export interface CompetitiveResponseOptionsInput {
  readonly scenario: CanonicalScenario;
  readonly assumption: CompetitivePriceAssumption;
  readonly active_depth_pct?: number;
  readonly scope?: string;
  readonly horizon_days?: number;
  readonly candidate_depths_pct?: readonly number[];
  readonly target_scope?: string;
  readonly secondary_scope?: string;
}

export interface CompetitiveResponseOptionsComparison {
  readonly objective: 'MAXIMUM_NET_CONTRIBUTION';
  readonly options: readonly CompetitiveResponseOption[];
  readonly preferred_option_type: CompetitiveResponseOptionType;
  readonly preferred_option: CompetitiveResponseOption;
  readonly preferred_response_rationale: string;
  readonly hold_is_preferred: boolean;
  readonly provenance: ProvenanceDescriptor;
}

export interface CompetitiveWhatIfIntelligenceInput {
  readonly scenario: CanonicalScenario;
  readonly assumption: CompetitivePriceAssumption;
  readonly active_depth_pct?: number;
  readonly scope?: string;
  readonly horizon_days?: number;
  readonly candidate_depths_pct?: readonly number[];
  readonly target_scope?: string;
  readonly secondary_scope?: string;
}

export interface CompetitiveWhatIfIntelligenceResult {
  readonly question: 'Would our current promotion decision still hold if competitive pricing changes?';
  readonly scenario_id: string;
  readonly sku_id: string;
  readonly sku_name: string;
  readonly assumption: CompetitivePriceAssumption;
  readonly user_facing_provenance: CompetitiveUserFacingProvenance;
  readonly current_position: CompetitiveWhatIfPositionSummary;
  readonly current_decision_impact: CompetitiveWhatIfDecisionImpact;
  readonly match_reference: CompetitiveWhatIfMatchReference;
  readonly boundary_sweep: CompetitiveDecisionBoundarySweepResult;
  readonly response_options: CompetitiveResponseOptionsComparison;
  readonly intelligence_summary: CompetitiveWhatIfPlainLanguageSummary;
  readonly curve_evaluation: CompetitiveElasticityCurveResult;
  readonly provenance: ProvenanceDescriptor;
}

function formatSignedPp(value: number, decimals = 2): string {
  const fixed = value.toFixed(decimals);
  return value > 0 ? `+${fixed}pp` : `${fixed}pp`;
}

function formatSignedPct(value: number, decimals = 1): string {
  const fixed = value.toFixed(decimals);
  return value > 0 ? `+${fixed}%` : `${fixed}%`;
}

function formatSignedGbpPlain(value: number): string {
  const abs = Math.abs(Math.round(value)).toLocaleString('en-GB');
  return value >= 0 ? `+£${abs}` : `-£${abs}`;
}

function formatRelativePositionShortLabel(pos: RelativePricePosition): string {
  if (pos.standing === 'DISADVANTAGE') {
    return `${pos.disadvantage_pp.toFixed(1)}% more expensive (£${pos.our_promotional_price_gbp.toFixed(2)} vs £${pos.assumed_competitive_price_gbp.toFixed(2)})`;
  }
  if (pos.standing === 'ADVANTAGE') {
    return `${Math.abs(pos.disadvantage_pp).toFixed(1)}% cheaper (£${pos.our_promotional_price_gbp.toFixed(2)} vs £${pos.assumed_competitive_price_gbp.toFixed(2)})`;
  }
  return `Price parity (£${pos.our_promotional_price_gbp.toFixed(2)} vs £${pos.assumed_competitive_price_gbp.toFixed(2)})`;
}

/**
 * Resolves the highest-opportunity regional scope for `TARGET` from the scenario's
 * governed regional scope multipliers and focus region.
 */
function resolveGovernedTargetScope(
  scenario: CanonicalScenario,
  explicitTargetScope?: string,
): string {
  const storeCounts = scenario.estate.region_store_counts;
  if (
    explicitTargetScope &&
    explicitTargetScope !== 'National' &&
    storeCounts[explicitTargetScope] !== undefined
  ) {
    return explicitTargetScope;
  }
  const focusRegion = scenario.identity.focus_region;
  if (focusRegion && focusRegion !== 'National' && storeCounts[focusRegion] !== undefined) {
    return focusRegion;
  }
  const regionalEntries = Object.entries(storeCounts).filter(([region]) => region !== 'National');
  regionalEntries.sort((a, b) => {
    const multA = scenarioScopeResponseMultiplier(scenario, a[0]);
    const multB = scenarioScopeResponseMultiplier(scenario, b[0]);
    if (multB !== multA) return multB - multA;
    return b[1] - a[1];
  });
  return regionalEntries[0]?.[0] ?? scenario.identity.market_scope_label;
}

/**
 * Resolves a lower-exposure regional scope when duration is already at the
 * minimum governed 7-day window.
 */
function resolveReducedExposureScope(
  scenario: CanonicalScenario,
  activeScope: string,
  explicitSecondaryScope?: string,
): string {
  const storeCounts = scenario.estate.region_store_counts;
  const activeStores = scenarioStoreCount(scenario, activeScope);
  if (
    explicitSecondaryScope &&
    storeCounts[explicitSecondaryScope] !== undefined &&
    storeCounts[explicitSecondaryScope] < activeStores
  ) {
    return explicitSecondaryScope;
  }
  const smallerRegions = Object.entries(storeCounts)
    .filter(([region, count]) => region !== 'National' && count < activeStores)
    .sort((a, b) => {
      const multA = scenarioScopeResponseMultiplier(scenario, a[0]);
      const multB = scenarioScopeResponseMultiplier(scenario, b[0]);
      if (multB !== multA) return multB - multA;
      return b[1] - a[1];
    });
  if (smallerRegions.length > 0) {
    return smallerRegions[0][0];
  }
  return resolveGovernedTargetScope(scenario);
}

/**
 * Evaluates the four governed business-readable competitive response options:
 *   - `HOLD`: keep current accepted/committed configuration (depth, scope, duration)
 *   - `MATCH`: adjust depth to shelf-price parity via Slice 1 `deriveCompetitiveMatchDepth`
 *     (marked `available: false` with explicit reason if outside governed depth bounds — never clamped)
 *   - `TARGET`: focus the promotional response on the highest-opportunity regional scope
 *   - `REDUCE_EXPOSURE`: reduce promotional exposure (shorter governed duration or smaller regional scope)
 *     while retaining the current promotional depth intent
 *
 * Every option is evaluated through the single Slice 1–3 competitive-price domain path
 * (`evaluateCompetitiveScenarioAtDepth`), and the preferred option is chosen strictly under
 * `MAXIMUM_NET_CONTRIBUTION`.
 */
export function evaluateCompetitiveResponseOptions(
  input: CompetitiveResponseOptionsInput,
): CompetitiveResponseOptionsComparison {
  const {
    scenario,
    assumption,
    active_depth_pct = scenario?.economics?.promotion_depth_pct,
    scope: rawScope,
    horizon_days: rawDurationDays,
    candidate_depths_pct,
    target_scope,
    secondary_scope,
  } = input;

  validateScenarioAndDepth(scenario, active_depth_pct);
  validateCompetitivePriceAssumption(assumption);

  const activeDepthPct = round2(active_depth_pct);
  const activeScope = rawScope ?? scenario.identity.market_scope_label;
  const activeDurationDays = rawDurationDays ?? scenario.calendar.promotion_duration_days;
  const activeStores = scenarioStoreCount(scenario, activeScope);

  // ── 1. HOLD ───────────────────────────────────────────────────────────────
  const holdEval = evaluateCompetitiveScenarioAtDepth(scenario, activeDepthPct, assumption, {
    scope: activeScope,
    ambient_depth_pct: 0,
    ambient_scope: activeScope,
    horizon_days: activeDurationDays,
  });
  const holdPos = deriveRelativePricePosition(
    scenario,
    activeDepthPct,
    assumption.assumed_competitive_price_gbp,
  );

  const holdOptionBase: Omit<CompetitiveResponseOption, 'is_preferred' | 'preferred_badge'> = {
    option_type: 'HOLD',
    label: 'HOLD',
    title: 'Hold Current Configuration',
    available: true,
    unavailable_reason: null,
    depth_pct: activeDepthPct,
    promoted_price_gbp: holdEval.promoted_price_gbp,
    scope: activeScope,
    stores_count: activeStores,
    duration_days: activeDurationDays,
    relative_price_position: holdPos,
    relative_position_label: formatRelativePositionShortLabel(holdPos),
    own_price_response_pp: holdEval.own_price_response_pp,
    competitive_response_pp: holdEval.competitive_response_pp,
    ambient_competitive_effect_pp: holdEval.ambient_competitive_effect_pp,
    intervention_attributable_competitive_effect_pp:
      holdEval.intervention_attributable_competitive_effect_pp,
    expected_demand_uplift_pct: holdEval.expected_demand_uplift_pct,
    expected_demand_units: holdEval.expected_demand_units,
    incremental_units: holdEval.incremental_units,
    net_contribution_delta_gbp: holdEval.net_contribution_delta_gbp,
    margin_exposure_gbp: holdEval.margin_exposure_gbp,
    delta_vs_hold_contribution_gbp: 0,
    delta_vs_hold_uplift_pp: 0,
    delta_vs_hold_exposure_gbp: 0,
    rationale: `Keep the current ${activeDepthPct}% promotional configuration across ${activeScope} (${activeStores} stores) for ${activeDurationDays} days without changing price depth or scope.`,
    evaluation: holdEval,
    provenance_badge: COMPETITIVE_USER_FACING_PROVENANCE_BADGE,
    provenance_label: COMPETITIVE_USER_FACING_PROVENANCE_LABEL,
  };

  // ── 2. MATCH ──────────────────────────────────────────────────────────────
  const matchDerivation = deriveCompetitiveMatchDepth(
    scenario,
    assumption.assumed_competitive_price_gbp,
  );

  let matchOptionBase: Omit<CompetitiveResponseOption, 'is_preferred' | 'preferred_badge'>;

  if (
    !matchDerivation.is_achievable_within_bounds ||
    matchDerivation.match_depth_pct === null
  ) {
    const unavailableReason =
      matchDerivation.status === 'COMPETITOR_ABOVE_LIST'
        ? `Unavailable — Modelled competitive benchmark (£${matchDerivation.assumed_competitive_price_gbp.toFixed(2)}) sits above our £${matchDerivation.list_price_gbp.toFixed(2)} list price (${matchDerivation.raw_required_depth_pct.toFixed(1)}% implied depth). Our unpromoted shelf price already undercuts the benchmark; parity cannot be achieved via promotional discounting.`
        : `Unavailable — Shelf-price parity with £${matchDerivation.assumed_competitive_price_gbp.toFixed(2)} requires ${matchDerivation.raw_required_depth_pct.toFixed(1)}% promotional depth, which exceeds the ${matchDerivation.max_depth_pct}% governed maximum depth bound. CogniX does not clamp out-of-bounds parity into a disguised recommendation.`;

    matchOptionBase = {
      option_type: 'MATCH',
      label: 'MATCH',
      title: 'Match Competitive Benchmark Price',
      available: false,
      unavailable_reason: unavailableReason,
      depth_pct: null,
      promoted_price_gbp: null,
      scope: activeScope,
      stores_count: activeStores,
      duration_days: activeDurationDays,
      relative_price_position: null,
      relative_position_label: `Parity out of bounds (${matchDerivation.raw_required_depth_pct.toFixed(1)}% implied depth vs 0–${matchDerivation.max_depth_pct}% governed range)`,
      own_price_response_pp: null,
      competitive_response_pp: null,
      ambient_competitive_effect_pp: null,
      intervention_attributable_competitive_effect_pp: null,
      expected_demand_uplift_pct: null,
      expected_demand_units: null,
      incremental_units: null,
      net_contribution_delta_gbp: null,
      margin_exposure_gbp: null,
      delta_vs_hold_contribution_gbp: null,
      delta_vs_hold_uplift_pp: null,
      delta_vs_hold_exposure_gbp: null,
      rationale: unavailableReason,
      evaluation: null,
      provenance_badge: COMPETITIVE_USER_FACING_PROVENANCE_BADGE,
      provenance_label: COMPETITIVE_USER_FACING_PROVENANCE_LABEL,
    };
  } else {
    const matchDepthPct = matchDerivation.match_depth_pct;
    const matchEval = evaluateCompetitiveScenarioAtDepth(
      scenario,
      matchDepthPct,
      assumption,
      {
        scope: activeScope,
        ambient_depth_pct: 0,
        ambient_scope: activeScope,
        horizon_days: activeDurationDays,
      },
    );
    const matchPos = deriveRelativePricePosition(
      scenario,
      matchDepthPct,
      assumption.assumed_competitive_price_gbp,
    );

    matchOptionBase = {
      option_type: 'MATCH',
      label: 'MATCH',
      title: 'Match Competitive Benchmark Price',
      available: true,
      unavailable_reason: null,
      depth_pct: matchDepthPct,
      promoted_price_gbp: matchEval.promoted_price_gbp,
      scope: activeScope,
      stores_count: activeStores,
      duration_days: activeDurationDays,
      relative_price_position: matchPos,
      relative_position_label: formatRelativePositionShortLabel(matchPos),
      own_price_response_pp: matchEval.own_price_response_pp,
      competitive_response_pp: matchEval.competitive_response_pp,
      ambient_competitive_effect_pp: matchEval.ambient_competitive_effect_pp,
      intervention_attributable_competitive_effect_pp:
        matchEval.intervention_attributable_competitive_effect_pp,
      expected_demand_uplift_pct: matchEval.expected_demand_uplift_pct,
      expected_demand_units: matchEval.expected_demand_units,
      incremental_units: matchEval.incremental_units,
      net_contribution_delta_gbp: matchEval.net_contribution_delta_gbp,
      margin_exposure_gbp: matchEval.margin_exposure_gbp,
      delta_vs_hold_contribution_gbp:
        matchEval.net_contribution_delta_gbp - holdEval.net_contribution_delta_gbp,
      delta_vs_hold_uplift_pp: round2(
        matchEval.expected_demand_uplift_pct - holdEval.expected_demand_uplift_pct,
      ),
      delta_vs_hold_exposure_gbp: round2(
        matchEval.margin_exposure_gbp - holdEval.margin_exposure_gbp,
      ),
      rationale: `Adjust promotional depth to ${matchDepthPct}% across ${activeScope} (${activeStores} stores, ${activeDurationDays} days) so our promotional shelf price (£${matchEval.promoted_price_gbp.toFixed(2)}) achieves parity with the £${assumption.assumed_competitive_price_gbp.toFixed(2)} modelled benchmark.`,
      evaluation: matchEval,
      provenance_badge: COMPETITIVE_USER_FACING_PROVENANCE_BADGE,
      provenance_label: COMPETITIVE_USER_FACING_PROVENANCE_LABEL,
    };
  }

  // ── 3. TARGET ─────────────────────────────────────────────────────────────
  const targetRegion = resolveGovernedTargetScope(scenario, target_scope);
  const targetStores = scenarioStoreCount(scenario, targetRegion);
  const targetDurationDays = activeDurationDays;
  const targetCurve = evaluateCompetitiveDepthCurve(scenario, assumption, {
    scope: targetRegion,
    ambient_depth_pct: 0,
    ambient_scope: targetRegion,
    horizon_days: targetDurationDays,
    candidate_depths_pct,
  });

  const positiveDepthPoints = targetCurve.competitive_points.filter(
    (pt) => pt.discount_pct > 0,
  );
  let targetDepthPct: number;
  if (targetCurve.recommended_discount_pct > 0) {
    if (
      targetRegion === activeScope &&
      targetCurve.recommended_discount_pct === activeDepthPct &&
      positiveDepthPoints.length > 1
    ) {
      const alternativePositive = positiveDepthPoints
        .filter((pt) => pt.discount_pct !== activeDepthPct)
        .reduce((best, pt) =>
          pt.net_contribution_delta_gbp > best.net_contribution_delta_gbp ? pt : best,
        );
      targetDepthPct = alternativePositive.discount_pct;
    } else {
      targetDepthPct = targetCurve.recommended_discount_pct;
    }
  } else if (positiveDepthPoints.length > 0) {
    const candidates =
      targetRegion === activeScope && positiveDepthPoints.length > 1
        ? positiveDepthPoints.filter((pt) => pt.discount_pct !== activeDepthPct)
        : positiveDepthPoints;
    const bestPositive = candidates.reduce((best, pt) =>
      pt.net_contribution_delta_gbp > best.net_contribution_delta_gbp ? pt : best,
    );
    targetDepthPct = bestPositive.discount_pct;
  } else {
    targetDepthPct = activeDepthPct > 0 ? activeDepthPct : scenario.economics.promotion_depth_pct;
  }

  const targetEval = evaluateCompetitiveScenarioAtDepth(
    scenario,
    targetDepthPct,
    assumption,
    {
      scope: targetRegion,
      ambient_depth_pct: 0,
      ambient_scope: targetRegion,
      horizon_days: targetDurationDays,
    },
  );
  const targetPos = deriveRelativePricePosition(
    scenario,
    targetDepthPct,
    assumption.assumed_competitive_price_gbp,
  );

  const targetOptionBase: Omit<CompetitiveResponseOption, 'is_preferred' | 'preferred_badge'> = {
    option_type: 'TARGET',
    label: 'TARGET',
    title: `Target Highest-Opportunity Scope (${targetRegion})`,
    available: true,
    unavailable_reason: null,
    depth_pct: targetDepthPct,
    promoted_price_gbp: targetEval.promoted_price_gbp,
    scope: targetRegion,
    stores_count: targetStores,
    duration_days: targetDurationDays,
    relative_price_position: targetPos,
    relative_position_label: formatRelativePositionShortLabel(targetPos),
    own_price_response_pp: targetEval.own_price_response_pp,
    competitive_response_pp: targetEval.competitive_response_pp,
    ambient_competitive_effect_pp: targetEval.ambient_competitive_effect_pp,
    intervention_attributable_competitive_effect_pp:
      targetEval.intervention_attributable_competitive_effect_pp,
    expected_demand_uplift_pct: targetEval.expected_demand_uplift_pct,
    expected_demand_units: targetEval.expected_demand_units,
    incremental_units: targetEval.incremental_units,
    net_contribution_delta_gbp: targetEval.net_contribution_delta_gbp,
    margin_exposure_gbp: targetEval.margin_exposure_gbp,
    delta_vs_hold_contribution_gbp:
      targetEval.net_contribution_delta_gbp - holdEval.net_contribution_delta_gbp,
    delta_vs_hold_uplift_pp: round2(
      targetEval.expected_demand_uplift_pct - holdEval.expected_demand_uplift_pct,
    ),
    delta_vs_hold_exposure_gbp: round2(
      targetEval.margin_exposure_gbp - holdEval.margin_exposure_gbp,
    ),
    rationale: `Apply the response where CogniX already sees the strongest opportunity. Focus ${targetDepthPct}% depth on ${targetRegion} (${targetStores} stores · ${targetDurationDays} days) using the existing governed regional opportunity model.`,
    evaluation: targetEval,
    provenance_badge: COMPETITIVE_USER_FACING_PROVENANCE_BADGE,
    provenance_label: COMPETITIVE_USER_FACING_PROVENANCE_LABEL,
  };

  // ── 4. REDUCE EXPOSURE ────────────────────────────────────────────────────
  const reduceDepthPct =
    activeDepthPct > 0 ? activeDepthPct : scenario.economics.promotion_depth_pct || 10;
  let reduceScope = activeScope;
  let reduceDurationDays = activeDurationDays;
  let reduceMechanismDetail: string;

  const shorterDurations = GOVERNED_PLANNER_DURATION_DAYS.filter(
    (d) => d < activeDurationDays,
  );
  if (shorterDurations.length > 0) {
    reduceDurationDays = shorterDurations[shorterDurations.length - 1];
    reduceMechanismDetail = `shortening campaign duration from ${activeDurationDays} days to ${reduceDurationDays} days across ${reduceScope}`;
  } else {
    reduceScope = resolveReducedExposureScope(scenario, activeScope, secondary_scope);
    reduceMechanismDetail = `narrowing store scope from ${activeScope} (${activeStores} stores) to ${reduceScope} (${scenarioStoreCount(scenario, reduceScope)} stores) over ${reduceDurationDays} days`;
  }
  const reduceStores = scenarioStoreCount(scenario, reduceScope);

  const reduceEval = evaluateCompetitiveScenarioAtDepth(
    scenario,
    reduceDepthPct,
    assumption,
    {
      scope: reduceScope,
      ambient_depth_pct: 0,
      ambient_scope: reduceScope,
      horizon_days: reduceDurationDays,
    },
  );
  const reducePos = deriveRelativePricePosition(
    scenario,
    reduceDepthPct,
    assumption.assumed_competitive_price_gbp,
  );

  const reduceOptionBase: Omit<CompetitiveResponseOption, 'is_preferred' | 'preferred_badge'> = {
    option_type: 'REDUCE_EXPOSURE',
    label: 'REDUCE EXPOSURE',
    title: `Reduce Exposure (${reduceDepthPct}% · ${reduceScope} · ${reduceDurationDays}d)`,
    available: true,
    unavailable_reason: null,
    depth_pct: reduceDepthPct,
    promoted_price_gbp: reduceEval.promoted_price_gbp,
    scope: reduceScope,
    stores_count: reduceStores,
    duration_days: reduceDurationDays,
    relative_price_position: reducePos,
    relative_position_label: formatRelativePositionShortLabel(reducePos),
    own_price_response_pp: reduceEval.own_price_response_pp,
    competitive_response_pp: reduceEval.competitive_response_pp,
    ambient_competitive_effect_pp: reduceEval.ambient_competitive_effect_pp,
    intervention_attributable_competitive_effect_pp:
      reduceEval.intervention_attributable_competitive_effect_pp,
    expected_demand_uplift_pct: reduceEval.expected_demand_uplift_pct,
    expected_demand_units: reduceEval.expected_demand_units,
    incremental_units: reduceEval.incremental_units,
    net_contribution_delta_gbp: reduceEval.net_contribution_delta_gbp,
    margin_exposure_gbp: reduceEval.margin_exposure_gbp,
    delta_vs_hold_contribution_gbp:
      reduceEval.net_contribution_delta_gbp - holdEval.net_contribution_delta_gbp,
    delta_vs_hold_uplift_pp: round2(
      reduceEval.expected_demand_uplift_pct - holdEval.expected_demand_uplift_pct,
    ),
    delta_vs_hold_exposure_gbp: round2(
      reduceEval.margin_exposure_gbp - holdEval.margin_exposure_gbp,
    ),
    rationale: `Reduce promotional exposure while retaining the ${reduceDepthPct}% promotional depth intent by ${reduceMechanismDetail}.`,
    evaluation: reduceEval,
    provenance_badge: COMPETITIVE_USER_FACING_PROVENANCE_BADGE,
    provenance_label: COMPETITIVE_USER_FACING_PROVENANCE_LABEL,
  };

  // ── 5. Preferred Option Selection (MAXIMUM NET CONTRIBUTION) ─────────────
  const baseOptions = [holdOptionBase, matchOptionBase, targetOptionBase, reduceOptionBase];
  const tiePriority: Record<CompetitiveResponseOptionType, number> = {
    HOLD: 0,
    TARGET: 1,
    REDUCE_EXPOSURE: 2,
    MATCH: 3,
  };

  const availableOptions = baseOptions.filter(
    (opt) => opt.available && opt.net_contribution_delta_gbp !== null,
  );
  const winningBase = availableOptions.reduce((best, candidate) => {
    const bestContrib = best.net_contribution_delta_gbp!;
    const candContrib = candidate.net_contribution_delta_gbp!;
    if (candContrib > bestContrib) return candidate;
    if (candContrib < bestContrib) return best;
    return tiePriority[candidate.option_type] < tiePriority[best.option_type]
      ? candidate
      : best;
  }, availableOptions[0]);

  const options: CompetitiveResponseOption[] = baseOptions.map((opt) => {
    const isPreferred = opt.option_type === winningBase.option_type;
    return {
      ...opt,
      is_preferred: isPreferred,
      preferred_badge: isPreferred ? COMPETITIVE_PREFERRED_RESPONSE_BADGE : null,
    };
  });

  const preferredOption = options.find((opt) => opt.is_preferred)!;
  let preferredRationale: string;

  if (preferredOption.option_type === 'HOLD') {
    preferredRationale = `HOLD is the CogniX Preferred Response because retaining the current ${preferredOption.depth_pct}% · ${preferredOption.scope} · ${preferredOption.duration_days}d configuration delivers the highest net contribution (${formatSignedGbpPlain(preferredOption.net_contribution_delta_gbp!)}) under this modelled competitive assumption without unnecessary reconfiguration.`;
  } else if (preferredOption.option_type === 'TARGET') {
    preferredRationale = `TARGET is the CogniX Preferred Response because focusing ${preferredOption.depth_pct}% depth on ${preferredOption.scope} (${preferredOption.stores_count} stores · ${preferredOption.duration_days}d) delivers the highest net contribution (${formatSignedGbpPlain(preferredOption.net_contribution_delta_gbp!)}, ${formatSignedGbpPlain(preferredOption.delta_vs_hold_contribution_gbp!)} vs HOLD) while applying the response where CogniX already sees the strongest opportunity.`;
  } else if (preferredOption.option_type === 'MATCH') {
    preferredRationale = `MATCH is the CogniX Preferred Response because adjusting promotional depth to ${preferredOption.depth_pct}% to reach shelf-price parity (£${preferredOption.promoted_price_gbp!.toFixed(2)}) delivers the highest net contribution (${formatSignedGbpPlain(preferredOption.net_contribution_delta_gbp!)}, ${formatSignedGbpPlain(preferredOption.delta_vs_hold_contribution_gbp!)} vs HOLD) under this modelled competitive assumption.`;
  } else {
    preferredRationale = `REDUCE EXPOSURE is the CogniX Preferred Response because narrowing promotional exposure to ${preferredOption.depth_pct}% · ${preferredOption.scope} · ${preferredOption.duration_days}d limits margin erosion and delivers the highest net contribution (${formatSignedGbpPlain(preferredOption.net_contribution_delta_gbp!)}, ${formatSignedGbpPlain(preferredOption.delta_vs_hold_contribution_gbp!)} vs HOLD) under this modelled competitive assumption.`;
  }

  return {
    objective: 'MAXIMUM_NET_CONTRIBUTION',
    options,
    preferred_option_type: preferredOption.option_type,
    preferred_option: preferredOption,
    preferred_response_rationale: preferredRationale,
    hold_is_preferred: preferredOption.option_type === 'HOLD',
    provenance: COMPETITIVE_DERIVED_PROVENANCE,
  };
}

/**
 * Evaluates the complete Competitive Price Response What-If Intelligence bundle
 * for a certified scenario and a validated `CompetitivePriceAssumption`.
 *
 * All calculations — relative price position, own-price vs competitive demand
 * decomposition, contribution-maximising winner, deterministic decision-boundary
 * sweep, MATCH parity derivation, and the four governed response options — execute
 * in this domain function so React components perform zero competitive arithmetic.
 */
export function evaluateCompetitiveWhatIfIntelligence(
  input: CompetitiveWhatIfIntelligenceInput,
): CompetitiveWhatIfIntelligenceResult {
  const {
    scenario,
    assumption,
    active_depth_pct = scenario?.economics?.promotion_depth_pct,
    scope,
    horizon_days = scenario?.calendar?.promotion_duration_days,
    candidate_depths_pct,
    target_scope,
    secondary_scope,
  } = input;

  validateScenarioAndDepth(scenario, active_depth_pct);
  validateCompetitivePriceAssumption(assumption);

  const evalOptions: CompetitiveEvaluationOptions = {
    scope,
    ambient_depth_pct: 0,
    ambient_scope: scope,
    horizon_days,
    candidate_depths_pct,
  };

  // 1. Current Position (Slice 1 derivation)
  const position = deriveRelativePricePosition(
    scenario,
    active_depth_pct,
    assumption.assumed_competitive_price_gbp,
  );

  let relativePositionLabel: string;
  let positionHeadline: string;
  let positionDetail: string;

  if (position.standing === 'DISADVANTAGE') {
    relativePositionLabel = `${position.disadvantage_pp.toFixed(1)}% more expensive`;
    positionHeadline = `We are ${position.disadvantage_pp.toFixed(1)}% more expensive under this modelled assumption`;
    positionDetail = `Our £${position.our_promotional_price_gbp.toFixed(2)} promotional shelf price (${position.promotion_depth_pct}% depth off £${position.list_price_gbp.toFixed(2)} list) sits £${position.price_gap_gbp.toFixed(2)} (+${position.disadvantage_pp.toFixed(2)}pp of list price) above the £${position.assumed_competitive_price_gbp.toFixed(2)} modelled benchmark.`;
  } else if (position.standing === 'ADVANTAGE') {
    const advPct = Math.abs(position.disadvantage_pp);
    const advGbp = Math.abs(position.price_gap_gbp);
    relativePositionLabel = `${advPct.toFixed(1)}% cheaper`;
    positionHeadline = `We are ${advPct.toFixed(1)}% cheaper under this modelled assumption`;
    positionDetail = `Our £${position.our_promotional_price_gbp.toFixed(2)} promotional shelf price (${position.promotion_depth_pct}% depth off £${position.list_price_gbp.toFixed(2)} list) undercuts the £${position.assumed_competitive_price_gbp.toFixed(2)} modelled benchmark by £${advGbp.toFixed(2)} (${position.disadvantage_pp.toFixed(2)}pp of list price).`;
  } else {
    relativePositionLabel = 'Price parity (0.0% difference)';
    positionHeadline = 'We are at price parity under this modelled assumption';
    positionDetail = `Our £${position.our_promotional_price_gbp.toFixed(2)} promotional shelf price (${position.promotion_depth_pct}% depth) matches the £${position.assumed_competitive_price_gbp.toFixed(2)} modelled competitive benchmark (0.00pp disadvantage).`;
  }

  // 2. Current Decision Impact (Slice 1 engine)
  const baselineCurve = evaluateCompetitiveDepthCurve(scenario, null, evalOptions);
  const curveEvaluation = evaluateCompetitiveDepthCurve(scenario, assumption, evalOptions);
  const activePoint = evaluateCompetitiveScenarioAtDepth(
    scenario,
    active_depth_pct,
    assumption,
    evalOptions,
  );
  const recommendedPoint =
    curveEvaluation.competitive_points.find(
      (pt) => pt.discount_pct === curveEvaluation.recommended_discount_pct,
    ) ??
    evaluateCompetitiveScenarioAtDepth(
      scenario,
      curveEvaluation.recommended_discount_pct,
      assumption,
      evalOptions,
    );
  const decomposition = decomposeCompetitiveDemandEffect({
    scenario,
    assumption,
    ambient_depth_pct: 0,
    target_depth_pct: active_depth_pct,
    ambient_scope: scope,
    target_scope: scope,
    horizon_days,
  });

  const doesBaselineHold =
    curveEvaluation.recommended_discount_pct === baselineCurve.recommended_discount_pct;
  const isActiveOptimal =
    round2(active_depth_pct) === curveEvaluation.recommended_discount_pct;

  const ownPromotionEffectLabel = `${formatSignedPp(activePoint.own_price_response_pp)} own-price demand response at ${round2(active_depth_pct)}% depth`;
  const competitiveAssumptionEffectLabel = `${formatSignedPp(activePoint.competitive_response_pp)} net competitive response (${formatSignedPp(decomposition.ambient_competitive_effect_pp)} ambient at list price; ${formatSignedPp(decomposition.intervention_attributable_competitive_effect_pp)} attributable to ${round2(active_depth_pct)}% depth)`;
  const ambientAttributionNote =
    `Ambient competitive effect at unpromoted list price (${formatSignedPp(decomposition.ambient_competitive_effect_pp)}) is classified as an ambient baseline condition and is not credited or debited to the campaign; only the ${formatSignedPp(decomposition.intervention_attributable_competitive_effect_pp)} shift caused by moving from 0% to ${round2(active_depth_pct)}% depth is campaign-attributable.`;

  // 3. Decision Boundary Sweep
  const boundarySweep = evaluateCompetitiveDecisionBoundarySweep({
    scenario,
    assumption,
    active_depth_pct,
    scope,
    horizon_days,
    candidate_depths_pct,
  });

  // 4. MATCH Parity Reference (Slice 1 derivation)
  const matchDerivation = deriveCompetitiveMatchDepth(
    scenario,
    assumption.assumed_competitive_price_gbp,
  );
  const clampedMatchEvaluation = evaluateCompetitiveScenarioAtDepth(
    scenario,
    matchDerivation.clamped_depth_pct,
    assumption,
    evalOptions,
  );

  let matchHeadline: string;
  if (matchDerivation.status === 'MATCH_WITHIN_ALLOWED_RANGE') {
    matchHeadline = `Price parity would require approximately ${matchDerivation.match_depth_pct!.toFixed(1)}% promotional depth (£${matchDerivation.assumed_competitive_price_gbp.toFixed(2)} shelf price).`;
  } else if (matchDerivation.status === 'PARITY_AT_LIST') {
    matchHeadline = `Price parity already holds at unpromoted list price (0% promotional depth · £${matchDerivation.list_price_gbp.toFixed(2)}).`;
  } else if (matchDerivation.status === 'COMPETITOR_ABOVE_LIST') {
    matchHeadline = `Modelled benchmark (£${matchDerivation.assumed_competitive_price_gbp.toFixed(2)}) sits above our £${matchDerivation.list_price_gbp.toFixed(2)} list price; 0% depth already undercuts the benchmark.`;
  } else {
    matchHeadline = `Price parity would require ${matchDerivation.raw_required_depth_pct.toFixed(1)}% depth, which exceeds the ${matchDerivation.max_depth_pct}% governed maximum depth bound (clamped reference: ${matchDerivation.clamped_depth_pct}%).`;
  }

  const matchDetail =
    `Reference configuration only — under Maximum Net Contribution, ${curveEvaluation.recommended_discount_pct}% depth remains the contribution-maximising configuration. CogniX does not automatically recommend or stage price matching.`;

  // 5. Response Options Comparison (HOLD, MATCH, TARGET, REDUCE EXPOSURE)
  const responseOptions = evaluateCompetitiveResponseOptions({
    scenario,
    assumption,
    active_depth_pct,
    scope,
    horizon_days,
    candidate_depths_pct,
    target_scope,
    secondary_scope,
  });

  // 6. Plain-Language Intelligence Summary
  const recDepth = curveEvaluation.recommended_discount_pct;
  const baseRecDepth = baselineCurve.recommended_discount_pct;

  const currentDecisionHeadline = doesBaselineHold
    ? recDepth === 0
      ? '0% (do not promote) remains preferred'
      : `${recDepth}% promotion remains preferred`
    : `${recDepth}% promotion becomes preferred (shifted from ${baseRecDepth}% baseline)`;

  const currentDecisionDetail = doesBaselineHold
    ? `Under this modelled competitive assumption (γ = ${assumption.competitive_response_pp_per_disadvantage_point}), the ${recDepth}% configuration remains the contribution-maximising choice across governed tiers.`
    : `Under this modelled competitive assumption (γ = ${assumption.competitive_response_pp_per_disadvantage_point}), the contribution-maximising depth shifts from the ${baseRecDepth}% baseline to ${recDepth}%.`;

  let decisionBoundaryHeadline: string;
  let decisionBoundaryDetail: string;
  let beyondBoundaryHeadline: string;
  let beyondBoundaryDetail: string;

  if (assumption.competitive_response_pp_per_disadvantage_point === 0) {
    decisionBoundaryHeadline = 'NO DECISION FLIP (γ = 0)';
    decisionBoundaryDetail = `With demand sensitivity to competitive price difference set to 0, the ${recDepth}% recommendation remains contribution-optimal throughout the tested competitive range.`;
    beyondBoundaryHeadline = 'No configuration shift across tested range';
    beyondBoundaryDetail = `When γ = 0, relative competitive price position has zero modelled demand effect, so no decision boundary exists.`;
  } else if (boundarySweep.outcome === 'FLIP_FOUND' && boundarySweep.boundary) {
    const b = boundarySweep.boundary;
    decisionBoundaryHeadline = `The ${b.previous_winning_depth_pct}% recommendation holds until approximately ${formatSignedPct(b.disadvantage_pp, 1)} relative disadvantage`;
    decisionBoundaryDetail = `Evaluating a 1pp disadvantage search grid across governed tiers shows ${b.previous_winning_depth_pct}% remains contribution-optimal until competitive benchmark pricing reaches £${b.assumed_competitive_price_gbp.toFixed(2)} (${formatSignedPp(b.disadvantage_pp, 2)} relative to our £${position.our_promotional_price_gbp.toFixed(2)} promotional price).`;

    if (b.new_winning_depth_pct > b.previous_winning_depth_pct) {
      beyondBoundaryHeadline = `A deeper ${b.new_winning_depth_pct}% promotional configuration becomes preferable`;
      beyondBoundaryDetail = `At and beyond ${formatSignedPct(b.disadvantage_pp, 1)} relative disadvantage (£${b.assumed_competitive_price_gbp.toFixed(2)} benchmark), deeper discounting (${b.new_winning_depth_pct}% depth) recovers enough competitive volume to outperform ${b.previous_winning_depth_pct}% on net contribution.`;
    } else {
      beyondBoundaryHeadline = `A shallower ${b.new_winning_depth_pct}% promotional configuration becomes preferable`;
      beyondBoundaryDetail = `When competitive disadvantage moderates to ${formatSignedPct(b.disadvantage_pp, 1)} (£${b.assumed_competitive_price_gbp.toFixed(2)} benchmark), a shallower ${b.new_winning_depth_pct}% depth retains more unit margin and outperforms ${b.previous_winning_depth_pct}% on net contribution.`;
    }
  } else {
    decisionBoundaryHeadline = 'NO DECISION FLIP';
    decisionBoundaryDetail = `The current ${recDepth}% recommendation remains contribution-optimal throughout the tested competitive range (${formatSignedPct(boundarySweep.min_disadvantage_pp, 1)} to ${formatSignedPct(boundarySweep.max_disadvantage_pp, 1)} relative disadvantage).`;
    beyondBoundaryHeadline = `No alternative depth outperforms ${recDepth}% within tested bounds`;
    beyondBoundaryDetail = `Across all tested competitive benchmark prices (£${boundarySweep.sweep_points[boundarySweep.sweep_points.length - 1]?.assumed_competitive_price_gbp.toFixed(2)} to £${boundarySweep.sweep_points[0]?.assumed_competitive_price_gbp.toFixed(2)}), ${recDepth}% maximises net contribution.`;
  }

  return {
    question: 'Would our current promotion decision still hold if competitive pricing changes?',
    scenario_id: scenario.identity.scenario_id,
    sku_id: scenario.identity.sku_id,
    sku_name: scenario.identity.sku_name,
    assumption,
    user_facing_provenance: {
      badge: COMPETITIVE_USER_FACING_PROVENANCE_BADGE,
      label: COMPETITIVE_USER_FACING_PROVENANCE_LABEL,
      note: COMPETITIVE_USER_FACING_PROVENANCE_NOTE,
    },
    current_position: {
      position,
      relative_position_label: relativePositionLabel,
      headline: positionHeadline,
      detail: positionDetail,
    },
    current_decision_impact: {
      active_depth_pct: round2(active_depth_pct),
      baseline_recommended_depth_pct: baseRecDepth,
      baseline_recommended_contribution_gbp: baselineCurve.recommended_contribution_gbp,
      competitive_recommended_depth_pct: recDepth,
      competitive_recommended_contribution_gbp: curveEvaluation.recommended_contribution_gbp,
      does_baseline_recommendation_hold: doesBaselineHold,
      is_active_depth_optimal: isActiveOptimal,
      active_point: activePoint,
      recommended_point: recommendedPoint,
      decomposition,
      own_promotion_effect_label: ownPromotionEffectLabel,
      competitive_assumption_effect_label: competitiveAssumptionEffectLabel,
      ambient_attribution_note: ambientAttributionNote,
    },
    match_reference: {
      derivation: matchDerivation,
      clamped_evaluation: clampedMatchEvaluation,
      headline: matchHeadline,
      detail: matchDetail,
    },
    boundary_sweep: boundarySweep,
    response_options: responseOptions,
    intelligence_summary: {
      current_decision_headline: currentDecisionHeadline,
      current_decision_detail: currentDecisionDetail,
      competitive_position_headline: positionHeadline,
      competitive_position_detail: positionDetail,
      decision_boundary_headline: decisionBoundaryHeadline,
      decision_boundary_detail: decisionBoundaryDetail,
      beyond_boundary_headline: beyondBoundaryHeadline,
      beyond_boundary_detail: beyondBoundaryDetail,
    },
    curve_evaluation: curveEvaluation,
    provenance: COMPETITIVE_DERIVED_PROVENANCE,
  };
}


