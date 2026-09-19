/**
 * The DECLARED SCENARIO MODEL behind scenario authoring (`SCI-07`, ADR-083 part 1)
 * ───────────────────────────────────────────────────────────────────────────────
 * ADR-083 part 1: *"Every quantitative field is set by the user or defaulted by a declared
 * scenario model."* This module is that declared scenario model.
 *
 * It is the ONLY place a posture becomes a number. A posture — `supplier_flex_posture:
 * 'limited'` — is a qualitative token a person or governed GenAI may choose; the quantity it
 * stands for is declared here, once, with a stated reason, and it is stamped
 * `origin: 'modelled'` wherever it is used so a reader can see that an assumption is
 * standing in for evidence.
 *
 * Why the numbers live here rather than in a prompt or in the resolver
 * -------------------------------------------------------------------
 * Three reasons, and each of them is a defect this estate has already paid for once.
 *
 *  1. A number in a prompt is a number the model can change. ADR-044's whole posture is that
 *     a rule stated to a model is not a rule.
 *  2. A number inline in the resolver is a number nobody can review. ADR-079 retired
 *     `skuContextFactor` because "because the hash of your region name was 1.03" is not an
 *     answer a Decision Trace can give; an undeclared default is the same defect wearing a
 *     different hat.
 *  3. A number in two places is two numbers. ADR-073 and `R-36` are both that failure.
 *
 * Every constant below is a MODELLED DEMONSTRATION ASSUMPTION for an illustrative UK
 * omnichannel grocer, exactly as `CANONICAL_SCENARIO` is. None of it is, or is derived from,
 * the operating data of any named retailer.
 *
 * Calibration note. Where a posture has an obvious analogue in the certified catalogue the
 * declared value is the catalogue's, so an authored scenario built on the defaults lands in
 * the same commercial territory as a curated one rather than in a territory nobody has
 * looked at. `high_volume_staple` is Fresh Dairy's 241 units a store a week; `mid_volume_line`
 * is Chilled Salmon's 48; `inelastic` is Premium Bakery's 0.8pp a point.
 */

import type {
  DemandMovementProfileId,
  DemandScaleProfileId,
  EstateProfileId,
  HorizonProfileId,
  InventoryPositionProfileId,
  LeadTimeProfileId,
  PriceSensitivityId,
  PromotionIntentId,
  ScenarioSituationId,
  SupplierFlexPostureId,
  SupplierFundingPostureId,
  SupplyHeadroomProfileId,
  WasteExposureId,
  ScenarioDraftInputs
} from '@/packages/contracts/src/scenario-draft-model';

/** A declared value and the sentence that justifies it. A value without a reason is not admissible. */
export interface DeclaredPostureValue<T> {
  value: T;
  reason: string;
}

const declare = <T,>(value: T, reason: string): DeclaredPostureValue<T> => ({ value, reason });

// ── Calendar ──────────────────────────────────────────────────────────────────

export const HORIZON_PROFILE: Readonly<Record<HorizonProfileId, DeclaredPostureValue<number>>> = {
  one_week: declare(7, 'One trading week — the shortest horizon a supplier cut-off can be answered inside.'),
  fortnight: declare(14, 'Two trading weeks — the horizon the certified catalogue runs on.'),
  four_weeks: declare(28, 'Four trading weeks — a period decision rather than a week decision.')
};

export const LEAD_TIME_PROFILE: Readonly<Record<LeadTimeProfileId, DeclaredPostureValue<number>>> = {
  same_week: declare(2, 'A domestic chilled line replenished inside the trading week.'),
  short_lead: declare(3, 'The standard domestic ambient and chilled lead time in the demonstration estate.'),
  extended_lead: declare(6, 'An imported chilled line: the lead time is the constraint, not the price.')
};

/**
 * The scenario clock an authored scenario opens on where the author does not choose one.
 *
 * DECLARED, not civil time (ADR-078 part 1). Deliberately not any of the three curated
 * scenarios' dates, so an authored scenario that happens to share a clock with a curated one
 * does so because its author said so and not by accident.
 */
export const DEFAULT_AUTHORED_HISTORY_END_DATE = '2026-08-12';

// ── Estate ────────────────────────────────────────────────────────────────────

export interface DeclaredEstateProfile {
  national_store_count: number;
  online_demand_share_pct: number;
  reason: string;
}

export const ESTATE_PROFILE: Readonly<Record<EstateProfileId, DeclaredEstateProfile>> = {
  convenience_led: {
    national_store_count: 2_150,
    online_demand_share_pct: 7,
    reason: 'A wide convenience estate: many small shops, low online penetration on this line.'
  },
  balanced_estate: {
    national_store_count: 1_450,
    online_demand_share_pct: 14,
    reason: 'The demonstration estate\'s standard omnichannel shape, as the reference scenario declares it.'
  },
  superstore_led: {
    national_store_count: 620,
    online_demand_share_pct: 19,
    reason: 'A large-format estate: fewer shops, higher basket values and higher online penetration.'
  }
};

/**
 * How the estate divides between named regions.
 *
 * Declared as SHARES of the national count so an estate of any size resolves coherently —
 * the same reason ADR-073 part 2 declares supply as ratios. The shares deliberately do not
 * sum to 1: the remainder is the estate outside the six regions the demonstration names, and
 * inventing a seventh region to make the arithmetic tidy would be a claim about an estate
 * this record does not have.
 */
export const REGION_ESTATE_SHARES: Readonly<Record<string, number>> = {
  'North West': 0.135,
  London: 0.145,
  Midlands: 0.165,
  Yorkshire: 0.105,
  'South East': 0.14,
  Scotland: 0.09
};

/** Share of the estate that carries a disproportionate share of a promotion's incremental volume. */
export const HIGH_OPPORTUNITY_STORE_SHARE = 0.25;
export const HIGH_OPPORTUNITY_INCREMENTAL_SHARE_PCT = 68;
/** Share of the estate that is large format. */
export const CORE_SUPERSTORE_SHARE = 0.12;

// ── Demand ────────────────────────────────────────────────────────────────────

export const DEMAND_SCALE_UNITS_PER_STORE_WEEK:
  Readonly<Record<DemandScaleProfileId, DeclaredPostureValue<number>>> = {
  convenience_line: declare(9, 'A slow line: roughly one unit a shop a day.'),
  mid_volume_line: declare(48, 'A mid-volume line, the rate the certified Chilled Fish pack declares.'),
  high_volume_staple: declare(241, 'A leading own-label staple, the rate the reference Fresh Dairy pack declares.')
};

export interface DeclaredMovementProfile {
  total_movement_pct: number;
  underlying_trend_pp: number;
  reason: string;
}

export const DEMAND_MOVEMENT_PROFILE:
  Readonly<Record<DemandMovementProfileId, DeclaredMovementProfile>> = {
  flat: {
    total_movement_pct: 0,
    underlying_trend_pp: 0,
    reason: 'Demand is where the plan expected it. Nothing has moved.'
  },
  softening: {
    total_movement_pct: -6,
    underlying_trend_pp: -6,
    reason: 'Demand is below the plan and the movement is trend rather than intervention.'
  },
  building: {
    total_movement_pct: 14,
    underlying_trend_pp: -2,
    reason: 'Demand is running ahead of plan against a mildly declining underlying trend.'
  },
  surging: {
    total_movement_pct: 28,
    underlying_trend_pp: 2,
    reason: 'Demand is well ahead of plan and the underlying trend is rising with it.'
  }
};

/**
 * Share of the movement ABOVE TREND that the committed promotion carries.
 *
 * Declared per intent rather than computed from the elasticity, because the elasticity
 * answers a different question — what one more point of depth would buy — and using it here
 * would derive a second basis for a quantity `movement_attribution` already answers, which
 * ADR-073 Amendment A forbids. A deeper cut carries more of the movement; that is the whole
 * of the model and it is stated rather than fitted.
 */
export const COMMERCIAL_INTENT_SHARE_OF_MOVEMENT:
  Readonly<Record<PromotionIntentId, DeclaredPostureValue<number>>> = {
  no_promotion: declare(0, 'Nothing is running, so nothing is attributable to commercial intent.'),
  shallow_cut: declare(0.45, 'A shallow cut moves volume but most of the movement is behaviour.'),
  committed_cut: declare(0.65, 'A committed depth is the largest single driver of the movement.'),
  deep_cut: declare(0.75, 'A deep cut dominates the movement it creates.')
};

// ── Commercial intent ─────────────────────────────────────────────────────────

export const PROMOTION_INTENT_DEPTH_PCT:
  Readonly<Record<PromotionIntentId, DeclaredPostureValue<number>>> = {
  no_promotion: declare(0, 'No price investment is committed.'),
  shallow_cut: declare(10, 'A shallow cut — the depth the certified Chilled Fish pack commits to.'),
  committed_cut: declare(20, 'The depth the reference Fresh Dairy pack commits to nationally.'),
  deep_cut: declare(30, 'A deep cut, at which most grocery lines stop earning their price investment.')
};

/**
 * Share of horizon volume transacting at the promoted price.
 *
 * One declared value rather than a posture of its own: participation is a property of how a
 * promotion is executed rather than a decision a scenario author is making, and every
 * certified pack declares the same 85%.
 */
export const DEFAULT_PROMOTION_PARTICIPATION_PCT = 85;

// ── Supply ────────────────────────────────────────────────────────────────────

export const SUPPLY_HEADROOM_PROFILE:
  Readonly<Record<SupplyHeadroomProfileId, DeclaredPostureValue<number>>> = {
  no_headroom: declare(1.0, 'The supplier is contracted to cover base demand and nothing beyond it.'),
  tight: declare(1.02, 'Two per cent of headroom — the certified Chilled Fish pack\'s allocation.'),
  standard: declare(1.06, 'Six per cent of headroom, the ordinary domestic allocation.'),
  comfortable: declare(1.12, 'Twelve per cent of headroom: the supplier can absorb an ordinary surge.')
};

export interface DeclaredFlexPosture {
  flex_rate_pct: number;
  flex_premium_rate_pct: number;
  clause_reference: string;
  reason: string;
}

export const SUPPLIER_FLEX_POSTURE: Readonly<Record<SupplierFlexPostureId, DeclaredFlexPosture>> = {
  none: {
    flex_rate_pct: 0,
    flex_premium_rate_pct: 0,
    clause_reference: 'No volume flex clause',
    reason: 'The agreement carries no flex clause, so no additional volume can be called off.'
  },
  limited: {
    flex_rate_pct: 5,
    flex_premium_rate_pct: 18,
    clause_reference: 'Limited volume flex notice',
    reason: 'A narrow flex clause, priced at a premium because the capacity is scarce.'
  },
  standard: {
    flex_rate_pct: 12,
    flex_premium_rate_pct: 12,
    clause_reference: 'Volume flex notice (Rule 4)',
    reason: 'The demonstration estate\'s standard flex clause, as the reference scenario declares it.'
  },
  generous: {
    flex_rate_pct: 20,
    flex_premium_rate_pct: 8,
    clause_reference: 'Extended volume flex notice',
    reason: 'A supplier with spare capacity it wants placed, so flex is wide and cheap.'
  }
};

// ── Economics ─────────────────────────────────────────────────────────────────

export const SUPPLIER_FUNDING_POSTURE:
  Readonly<Record<SupplierFundingPostureId, DeclaredPostureValue<number>>> = {
  unfunded: declare(0, 'The retailer funds the whole price investment.'),
  token: declare(15, 'A token contribution — the certified Premium Bakery pack\'s funding.'),
  shared: declare(35, 'A shared investment, as the reference Fresh Dairy pack declares it.'),
  supplier_led: declare(60, 'The supplier wants the throughput and funds most of the cut.')
};

export const PRICE_SENSITIVITY_PP_PER_DEPTH_POINT:
  Readonly<Record<PriceSensitivityId, DeclaredPostureValue<number>>> = {
  inelastic: declare(0.8, 'A premium or habitual line: price moves little volume.'),
  moderate: declare(1.6, 'A line that responds, but not enough for depth alone to carry a plan.'),
  responsive: declare(2.4, 'The reference Fresh Dairy elasticity: a staple that responds strongly.'),
  highly_responsive: declare(3.2, 'A highly promotable line where depth is the dominant lever.')
};

/** Waste as a share of un-promoted weekly demand. */
export const WASTE_EXPOSURE_PCT_OF_WEEKLY_BASE:
  Readonly<Record<WasteExposureId, DeclaredPostureValue<number>>> = {
  negligible: declare(0.4, 'A long-life line: waste is a rounding error on the week.'),
  moderate: declare(2, 'An ordinary chilled line with a working shelf life.'),
  material: declare(4.2, 'A short-life line where waste is part of the decision, as the reference pack declares.')
};

export const DEFAULT_CANNIBALISATION_RATE_PCT = 8;
export const DEFAULT_SUBSTITUTION_RECOVERY_PCT = 35;

// ── Inventory ─────────────────────────────────────────────────────────────────

export interface DeclaredInventoryProfile {
  store_cover_days: number;
  distribution_centre_cover_days: number;
  on_order_cover_days: number;
  reason: string;
}

export const INVENTORY_POSITION_PROFILE:
  Readonly<Record<InventoryPositionProfileId, DeclaredInventoryProfile>> = {
  short: {
    store_cover_days: 2,
    distribution_centre_cover_days: 3,
    on_order_cover_days: 4,
    reason: 'A short position: the network is already running hand to mouth.'
  },
  balanced: {
    store_cover_days: 4,
    distribution_centre_cover_days: 6,
    on_order_cover_days: 8,
    reason: 'The reference scenario\'s position — enough to absorb an ordinary week, not this one.'
  },
  long: {
    store_cover_days: 7,
    distribution_centre_cover_days: 11,
    on_order_cover_days: 14,
    reason: 'A long position: the network is carrying cover the run rate does not need.'
  }
};

// ── Per-situation opening postures ────────────────────────────────────────────

/**
 * The postures an authored scenario opens on for each situation.
 *
 * Not "sensible defaults" in the usual sense — they are the shape of the DECISION each
 * situation describes. A lead-time scenario opens with no allocation headroom because that
 * is what makes it a lead-time scenario; a waste scenario opens inelastic and short-life
 * because otherwise it is a promotion scenario with a different label, which is exactly the
 * relabelling `COGNIX_SCENARIO_INTELLIGENCE.md` §5.2 declined.
 *
 * Every one of these is `origin: 'modelled'` when it survives into a scenario. A person who
 * accepts them has accepted a declared assumption, and the readiness badge says so.
 */
export interface SituationOpeningPostures {
  estate_profile: EstateProfileId;
  demand_scale_profile: DemandScaleProfileId;
  demand_movement_profile: DemandMovementProfileId;
  horizon_profile: HorizonProfileId;
  supply_lead_time_profile: LeadTimeProfileId;
  promotion_intent: PromotionIntentId;
  supply_headroom_profile: SupplyHeadroomProfileId;
  supplier_flex_posture: SupplierFlexPostureId;
  supplier_funding_posture: SupplierFundingPostureId;
  price_sensitivity: PriceSensitivityId;
  inventory_position_profile: InventoryPositionProfileId;
  waste_exposure: WasteExposureId;
  market_scope: 'NATIONAL';
  focus_region: string;
  channels: readonly string[];
}

export const SITUATION_OPENING_POSTURES:
  Readonly<Record<ScenarioSituationId, SituationOpeningPostures>> = {
  PROMOTION_DEMAND_SURGE: {
    estate_profile: 'balanced_estate',
    demand_scale_profile: 'high_volume_staple',
    demand_movement_profile: 'surging',
    horizon_profile: 'fortnight',
    supply_lead_time_profile: 'short_lead',
    promotion_intent: 'committed_cut',
    supply_headroom_profile: 'standard',
    supplier_flex_posture: 'standard',
    supplier_funding_posture: 'shared',
    price_sensitivity: 'responsive',
    inventory_position_profile: 'balanced',
    waste_exposure: 'moderate',
    market_scope: 'NATIONAL',
    focus_region: 'North West',
    channels: ['In store', 'Online']
  },
  SUPPLIER_LEAD_TIME_RISK: {
    estate_profile: 'superstore_led',
    demand_scale_profile: 'mid_volume_line',
    demand_movement_profile: 'building',
    horizon_profile: 'fortnight',
    supply_lead_time_profile: 'extended_lead',
    promotion_intent: 'shallow_cut',
    supply_headroom_profile: 'no_headroom',
    supplier_flex_posture: 'limited',
    supplier_funding_posture: 'supplier_led',
    price_sensitivity: 'moderate',
    inventory_position_profile: 'short',
    waste_exposure: 'moderate',
    market_scope: 'NATIONAL',
    focus_region: 'South East',
    channels: ['In store', 'Online']
  },
  SHORT_LIFE_WASTE_EXPOSURE: {
    estate_profile: 'convenience_led',
    demand_scale_profile: 'convenience_line',
    demand_movement_profile: 'building',
    horizon_profile: 'fortnight',
    supply_lead_time_profile: 'same_week',
    promotion_intent: 'shallow_cut',
    supply_headroom_profile: 'tight',
    supplier_flex_posture: 'standard',
    supplier_funding_posture: 'token',
    price_sensitivity: 'inelastic',
    inventory_position_profile: 'short',
    waste_exposure: 'material',
    market_scope: 'NATIONAL',
    focus_region: 'London',
    channels: ['In store']
  }
};

/**
 * The postures a draft is opened with, for a declared situation.
 *
 * Returned as draft INPUTS rather than applied silently inside the resolver, so a person
 * sees what was assumed on their behalf and can change any of it. An assumption a user
 * cannot see is the thing `origin: 'modelled'` exists to prevent.
 */
export function openingPosturesFor(situation: ScenarioSituationId): ScenarioDraftInputs {
  const p = SITUATION_OPENING_POSTURES[situation];
  return {
    situation,
    estate_profile: p.estate_profile,
    demand_scale_profile: p.demand_scale_profile,
    demand_movement_profile: p.demand_movement_profile,
    horizon_profile: p.horizon_profile,
    supply_lead_time_profile: p.supply_lead_time_profile,
    promotion_intent: p.promotion_intent,
    supply_headroom_profile: p.supply_headroom_profile,
    supplier_flex_posture: p.supplier_flex_posture,
    supplier_funding_posture: p.supplier_funding_posture,
    price_sensitivity: p.price_sensitivity,
    inventory_position_profile: p.inventory_position_profile,
    waste_exposure: p.waste_exposure,
    market_scope: p.market_scope,
    focus_region: p.focus_region,
    channels: [...p.channels]
  };
}

/** The provenance statement every authored scenario record carries. */
export const AUTHORED_SCENARIO_PROVENANCE_STATEMENT =
  'A scenario authored in CogniX for demonstration. Structure and commercial intent were supplied by '
  + 'a person; values they did not supply stand on declared modelled assumptions; every published '
  + 'quantity is calculated by CogniX engines from those inputs. No figure is taken from, or '
  + 'represents, the operating data of any named retailer.';
