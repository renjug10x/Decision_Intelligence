/**
 * Draft → Scenario resolution (`SCI-07`, ADR-083 part 2)
 * ───────────────────────────────────────────────────────────────────────────────
 * THE deterministic materialisation. Authoring inputs in, `CanonicalScenario` out.
 *
 * The acceptance condition this module carries
 * --------------------------------------------
 * ADR-083 part 2: *"A scenario confirmed with GenAI assistance must resolve, certify and run
 * identically with `GEMINI_API_KEY` unset."* Everything that makes that true is here, and it
 * is true for one structural reason rather than for a careful one: **nothing in this file can
 * reach a provider.** It imports no network client, no credential, no clock and no random
 * source. It is a pure function of the draft inputs and two governed masters, so a draft that
 * resolved once resolves to the same bytes for ever, and whether a model helped write the
 * draft is not a fact the resolution can observe.
 *
 * Why the product master is the authority for price, name and supplier
 * -------------------------------------------------------------------
 * Certification dimensions `C-1.6`, `C-1.7`, `C-1.8` and `C-2.10` reconcile a scenario's SKU,
 * supplier and list price against `data/products.json` and `data/suppliers.json` — data the
 * scenario did not author. So authoring does not offer those fields at all: a person chooses
 * a product, and the product answers for its own name, its supplier, its list price and its
 * cost. Offering an editable list price would let an author create a second price basis for a
 * SKU the master already answers, which is ADR-073 rule 1 with the numbers changed.
 *
 * Nothing derived is authorable
 * -----------------------------
 * Decision Gap, revenue and margin exposure, cover days, the flex allowance, the elasticity
 * curve and every pound value on the journey are absent from the draft contract and are
 * computed by `scenario*(…)` from the record this module builds. An author cannot state them,
 * a model cannot propose them, and an import cannot carry them.
 */

import {
  CanonicalScenario,
  ScenarioMarketScope
} from '@/packages/contracts/src/canonical-scenario-model';
import { MODELLED_SCENARIO_PROVENANCE, ProvenanceDescriptor } from '@/packages/contracts/src/provenance-vocabulary';
import {
  AUTHORED_SCENARIO_ID_PREFIX,
  DERIVED_INPUT_PROVENANCE,
  MODELLED_INPUT_PROVENANCE,
  STATED_INPUT_PROVENANCE,
  scenarioSituation,
  type ScenarioDraftFieldId,
  type ScenarioDraftFieldProvenance,
  type ScenarioDraftInputs,
  type ScenarioDraftMovementDriver,
  type ScenarioSituationId
} from '@/packages/contracts/src/scenario-draft-model';
import {
  AUTHORED_SCENARIO_PROVENANCE_STATEMENT,
  COMMERCIAL_INTENT_SHARE_OF_MOVEMENT,
  CORE_SUPERSTORE_SHARE,
  DEFAULT_AUTHORED_HISTORY_END_DATE,
  DEFAULT_CANNIBALISATION_RATE_PCT,
  DEFAULT_PROMOTION_PARTICIPATION_PCT,
  DEFAULT_SUBSTITUTION_RECOVERY_PCT,
  DEMAND_MOVEMENT_PROFILE,
  DEMAND_SCALE_UNITS_PER_STORE_WEEK,
  ESTATE_PROFILE,
  HIGH_OPPORTUNITY_INCREMENTAL_SHARE_PCT,
  HIGH_OPPORTUNITY_STORE_SHARE,
  HORIZON_PROFILE,
  INVENTORY_POSITION_PROFILE,
  LEAD_TIME_PROFILE,
  PRICE_SENSITIVITY_PP_PER_DEPTH_POINT,
  PROMOTION_INTENT_DEPTH_PCT,
  REGION_ESTATE_SHARES,
  SITUATION_OPENING_POSTURES,
  SUPPLIER_FLEX_POSTURE,
  SUPPLIER_FUNDING_POSTURE,
  SUPPLY_HEADROOM_PROFILE,
  WASTE_EXPOSURE_PCT_OF_WEEKLY_BASE
} from './scenario-model-defaults';
import { authorableProduct, type AuthorableProduct } from './product-master';

/** Raised when a draft cannot become a scenario at all. Never swallowed into a default. */
export class ScenarioDraftResolutionError extends Error {
  readonly field: string;
  constructor(message: string, field: string) {
    super(message);
    this.name = 'ScenarioDraftResolutionError';
    this.field = field;
  }
}

interface Resolved<T> {
  value: T;
  descriptor: ProvenanceDescriptor;
  note: string;
}

const round2 = (v: number) => Number(v.toFixed(2));

export interface ResolvedScenarioDraft {
  scenario: CanonicalScenario;
  field_provenance: ScenarioDraftFieldProvenance[];
  /** The product the scenario is about, so a caller need not read the master a second time. */
  product: AuthorableProduct;
}

/**
 * Resolve a draft into a scenario record.
 *
 * Deterministic and total: given the same inputs it returns the same record, and where an
 * input is absent it states in provenance which declared assumption stood in for it.
 */
export function resolveScenarioDraft(
  inputs: ScenarioDraftInputs,
  scenarioId: string
): ResolvedScenarioDraft {
  const provenance: ScenarioDraftFieldProvenance[] = [];

  const record = <T,>(field: ScenarioDraftFieldId, resolved: Resolved<T>): T => {
    provenance.push({ field, descriptor: resolved.descriptor, note: resolved.note });
    return resolved.value;
  };

  /**
   * Explicit value → `stated`. Posture → `modelled`, carrying the posture's declared reason.
   *
   * Numeric by signature rather than generic: every quantitative dimension resolves this way and a
   * generic here would have to cast, which is how a posture token could one day be written into a
   * numeric field without the compiler noticing.
   */
  const fromPosture = (
    explicit: number | undefined,
    postureValue: number,
    postureReason: string,
    label: string
  ): Resolved<number> =>
    explicit !== undefined && explicit !== null
      ? { value: explicit, descriptor: STATED_INPUT_PROVENANCE, note: `${label} was stated by the author.` }
      : { value: postureValue, descriptor: MODELLED_INPUT_PROVENANCE, note: `${label} is modelled: ${postureReason}` };

  // ── The situation decides the taxonomy and the opening postures ──
  const situationId = (inputs.situation ?? 'PROMOTION_DEMAND_SURGE') as ScenarioSituationId;
  const situation = scenarioSituation(situationId);
  if (!situation) {
    throw new ScenarioDraftResolutionError(
      `"${inputs.situation}" is not a situation CogniX can model.`,
      'situation'
    );
  }
  const opening = SITUATION_OPENING_POSTURES[situationId];
  record('situation', {
    value: situationId,
    descriptor: inputs.situation ? STATED_INPUT_PROVENANCE : MODELLED_INPUT_PROVENANCE,
    note: inputs.situation
      ? `The author chose the situation: ${situation.label.toLowerCase()}.`
      : 'No situation was chosen, so the promotion-surge situation stands in.'
  });

  // ── Product, from the governed master ──
  if (!inputs.sku_id) {
    throw new ScenarioDraftResolutionError('A scenario needs a product before it can be resolved.', 'sku_id');
  }
  const product = authorableProduct(inputs.sku_id);
  if (!product) {
    throw new ScenarioDraftResolutionError(
      `"${inputs.sku_id}" is not a product CogniX holds. Choose one from the product catalogue.`,
      'sku_id'
    );
  }
  record('sku_id', {
    value: product.sku_id,
    descriptor: STATED_INPUT_PROVENANCE,
    note: `The author chose ${product.sku_name}.`
  });

  // ── Estate and scope ──
  const estateProfileId = inputs.estate_profile ?? opening.estate_profile;
  const estateProfile = ESTATE_PROFILE[estateProfileId];
  const storeCount = record('national_store_count', fromPosture(
    inputs.national_store_count,
    estateProfile.national_store_count,
    estateProfile.reason,
    'The number of stores ranging the line'
  ));
  const onlineSharePct = record('online_demand_share_pct', fromPosture(
    inputs.online_demand_share_pct,
    estateProfile.online_demand_share_pct,
    estateProfile.reason,
    'The share of demand transacting online'
  ));

  const marketScope = (inputs.market_scope ?? opening.market_scope) as ScenarioMarketScope;
  const focusRegion = inputs.focus_region ?? opening.focus_region;
  const channels = inputs.channels?.length ? [...inputs.channels] : [...opening.channels];
  record('market_scope', {
    value: marketScope,
    descriptor: inputs.market_scope ? STATED_INPUT_PROVENANCE : MODELLED_INPUT_PROVENANCE,
    note: inputs.market_scope
      ? 'The author stated where the decision applies.'
      : 'Where the decision applies was not stated, so the situation\'s national scope stands in.'
  });
  record('focus_region', {
    value: focusRegion,
    descriptor: inputs.focus_region ? STATED_INPUT_PROVENANCE : MODELLED_INPUT_PROVENANCE,
    note: inputs.focus_region
      ? 'The author stated where the movement concentrates.'
      : 'Where the movement concentrates was not stated, so the situation\'s declared focus stands in.'
  });
  record('channels', {
    value: channels,
    descriptor: inputs.channels?.length ? STATED_INPUT_PROVENANCE : MODELLED_INPUT_PROVENANCE,
    note: inputs.channels?.length
      ? 'The author stated the routes to customer.'
      : 'The routes to customer were not stated, so the situation\'s declared routes stand in.'
  });

  const regionStoreCounts: Record<string, number> = { National: storeCount };
  for (const [region, share] of Object.entries(REGION_ESTATE_SHARES)) {
    regionStoreCounts[region] = Math.max(1, Math.round(storeCount * share));
  }
  // The focal region must resolve to a count even where it is not one of the declared six.
  if (!regionStoreCounts[focusRegion]) {
    regionStoreCounts[focusRegion] = Math.max(1, Math.round(storeCount * 0.12));
  }

  // ── Calendar ──
  const horizonProfileId = inputs.horizon_profile ?? opening.horizon_profile;
  const horizonDays = record('forecast_horizon_days', fromPosture(
    inputs.forecast_horizon_days,
    HORIZON_PROFILE[horizonProfileId].value,
    HORIZON_PROFILE[horizonProfileId].reason,
    'The decision horizon'
  ));
  const leadProfileId = inputs.supply_lead_time_profile ?? opening.supply_lead_time_profile;
  const leadTimeDays = record('supplier_lead_time_days', fromPosture(
    inputs.supplier_lead_time_days,
    LEAD_TIME_PROFILE[leadProfileId].value,
    LEAD_TIME_PROFILE[leadProfileId].reason,
    'The supplier lead time'
  ));
  const historyEnd = record('observed_history_end_date', {
    value: inputs.observed_history_end_date ?? DEFAULT_AUTHORED_HISTORY_END_DATE,
    descriptor: inputs.observed_history_end_date ? STATED_INPUT_PROVENANCE : MODELLED_INPUT_PROVENANCE,
    note: inputs.observed_history_end_date
      ? 'The author stated the last day the scenario holds observed demand for.'
      : 'The scenario\'s Today was not stated, so the declared authoring clock stands in. It is never civil time.'
  });

  // ── Commercial intent ──
  const intentId = inputs.promotion_intent ?? opening.promotion_intent;
  const depthPct = record('promotion_depth_pct', fromPosture(
    inputs.promotion_depth_pct,
    PROMOTION_INTENT_DEPTH_PCT[intentId].value,
    PROMOTION_INTENT_DEPTH_PCT[intentId].reason,
    'The depth off list'
  ));
  const participationPct = record('promotion_participation_pct', fromPosture(
    inputs.promotion_participation_pct,
    DEFAULT_PROMOTION_PARTICIPATION_PCT,
    'every certified scenario declares the same participation, because it is a property of execution rather than a decision.',
    'The share of volume at the promoted price'
  ));
  /*
   * The promotion runs for the horizon unless the author says otherwise. A promotion window
   * shorter than the horizon it is decided over is a legitimate scenario; one LONGER than it
   * is a window the decision cannot see the end of, so it is clamped rather than accepted.
   */
  const promotionDurationDays = record('promotion_duration_days', fromPosture(
    inputs.promotion_duration_days === undefined
      ? undefined
      : Math.min(inputs.promotion_duration_days, horizonDays),
    depthPct > 0 ? horizonDays : 0,
    depthPct > 0
      ? 'a committed promotion runs for the horizon the decision is taken over unless the author shortens it.'
      : 'nothing is running, so the promotion window is empty.',
    'The days the promotion runs'
  ));

  // ── Demand ──
  const scaleProfileId = inputs.demand_scale_profile ?? opening.demand_scale_profile;
  const baseWeekly = record('base_demand_units_per_week', fromPosture(
    inputs.base_demand_units_per_week,
    Math.round(DEMAND_SCALE_UNITS_PER_STORE_WEEK[scaleProfileId].value * storeCount),
    `${DEMAND_SCALE_UNITS_PER_STORE_WEEK[scaleProfileId].reason} Applied across ${storeCount} stores.`,
    'Un-promoted weekly demand'
  ));

  const movementProfileId = inputs.demand_movement_profile ?? opening.demand_movement_profile;
  const movementProfile = DEMAND_MOVEMENT_PROFILE[movementProfileId];
  const totalMovementPct = record('total_demand_movement_pct', fromPosture(
    inputs.total_demand_movement_pct,
    movementProfile.total_movement_pct,
    movementProfile.reason,
    'The movement above the un-promoted base'
  ));

  const drivers = record('demand_movement_drivers', inputs.demand_movement_drivers?.length
    ? {
      value: inputs.demand_movement_drivers,
      descriptor: STATED_INPUT_PROVENANCE,
      note: 'The author decomposed the demand movement themselves.'
    }
    : {
      value: declaredMovementAttribution(totalMovementPct, movementProfile.underlying_trend_pp, intentId, depthPct),
      descriptor: MODELLED_INPUT_PROVENANCE,
      note:
        'The movement was not decomposed by the author, so CogniX declares a decomposition: the '
        + 'committed promotion carries a declared share of the movement above trend, observed '
        + 'behaviour carries the remainder, and the trend is the situation\'s declared trend.'
    });

  // ── Supply ──
  const headroomId = inputs.supply_headroom_profile ?? opening.supply_headroom_profile;
  const capacityIndex = record('supplier_capacity_index', fromPosture(
    inputs.supplier_capacity_index,
    SUPPLY_HEADROOM_PROFILE[headroomId].value,
    SUPPLY_HEADROOM_PROFILE[headroomId].reason,
    'The standing allocation'
  ));
  const flexPostureId = inputs.supplier_flex_posture ?? opening.supplier_flex_posture;
  const flexPosture = SUPPLIER_FLEX_POSTURE[flexPostureId];
  const flexRatePct = record('supplier_flex_rate_pct', fromPosture(
    inputs.supplier_flex_rate_pct,
    flexPosture.flex_rate_pct,
    flexPosture.reason,
    'The contractual flex allowance'
  ));
  const flexPremiumPct = record('flex_premium_rate_pct', fromPosture(
    inputs.flex_premium_rate_pct,
    flexPosture.flex_premium_rate_pct,
    flexPosture.reason,
    'The premium charged on flexed volume'
  ));

  // ── Inventory ──
  const inventoryProfileId = inputs.inventory_position_profile ?? opening.inventory_position_profile;
  const inventoryProfile = INVENTORY_POSITION_PROFILE[inventoryProfileId];
  const runRatePerDay = baseWeekly / 7;
  const storeCoverDays = record('store_cover_days', fromPosture(
    inputs.store_cover_days,
    inventoryProfile.store_cover_days,
    inventoryProfile.reason,
    'Days of cover in store'
  ));
  const dcCoverDays = record('distribution_centre_cover_days', fromPosture(
    inputs.distribution_centre_cover_days,
    inventoryProfile.distribution_centre_cover_days,
    inventoryProfile.reason,
    'Days of cover in the network'
  ));
  const onOrderCoverDays = record('on_order_cover_days', fromPosture(
    inputs.on_order_cover_days,
    inventoryProfile.on_order_cover_days,
    inventoryProfile.reason,
    'Days of cover already on order'
  ));

  // ── Economics ──
  /*
   * The margin rate is DERIVED from the product master, not authored and not assumed.
   *
   * `gross_margin_rate_pct` is the rate earned on REALISED revenue, and the master already
   * holds this SKU's cost. Deriving the rate from that cost is what stops an authored
   * scenario declaring a margin the product master contradicts — the same discipline
   * `C-2.10` applies to price, applied to cost, one level down.
   */
  const realisedPerUnit = product.list_price_gbp * (1 - (depthPct / 100) * (participationPct / 100));
  const derivedMarginRatePct = realisedPerUnit > 0
    ? round2(Math.max(0, (1 - product.unit_cost_gbp / realisedPerUnit)) * 100)
    : 0;
  const grossMarginRatePct = record('gross_margin_rate_pct', inputs.gross_margin_rate_pct !== undefined
    ? {
      value: inputs.gross_margin_rate_pct,
      descriptor: STATED_INPUT_PROVENANCE,
      note: 'The gross margin rate was stated by the author.'
    }
    : {
      value: derivedMarginRatePct,
      descriptor: DERIVED_INPUT_PROVENANCE,
      note: `The gross margin rate is derived by CogniX from the product master's cost of £${product.unit_cost_gbp.toFixed(2)} against the realised price.`
    });

  const fundingPostureId = inputs.supplier_funding_posture ?? opening.supplier_funding_posture;
  const fundingPct = record('supplier_promotional_funding_pct', fromPosture(
    inputs.supplier_promotional_funding_pct,
    SUPPLIER_FUNDING_POSTURE[fundingPostureId].value,
    SUPPLIER_FUNDING_POSTURE[fundingPostureId].reason,
    'The share of the price investment the supplier funds'
  ));

  const sensitivityId = inputs.price_sensitivity ?? opening.price_sensitivity;
  const responsePp = record('promotional_response_pp_per_depth_point', fromPosture(
    inputs.promotional_response_pp_per_depth_point,
    PRICE_SENSITIVITY_PP_PER_DEPTH_POINT[sensitivityId].value,
    PRICE_SENSITIVITY_PP_PER_DEPTH_POINT[sensitivityId].reason,
    'The demand response per point of depth'
  ));

  const wasteId = inputs.waste_exposure ?? opening.waste_exposure;
  const wasteUnits = record('waste_units_per_week', fromPosture(
    inputs.waste_units_per_week,
    Math.round(baseWeekly * (WASTE_EXPOSURE_PCT_OF_WEEKLY_BASE[wasteId].value / 100)),
    WASTE_EXPOSURE_PCT_OF_WEEKLY_BASE[wasteId].reason,
    'Units lost to waste each week'
  ));

  const cannibalisationPct = record('cannibalisation_rate_pct', fromPosture(
    inputs.cannibalisation_rate_pct,
    DEFAULT_CANNIBALISATION_RATE_PCT,
    'the demonstration estate\'s declared category cannibalisation rate.',
    'The share of promoted volume taken from neighbouring lines'
  ));
  const substitutionPct = record('substitution_recovery_pct', fromPosture(
    inputs.substitution_recovery_pct,
    DEFAULT_SUBSTITUTION_RECOVERY_PCT,
    'the demonstration estate\'s declared substitution recovery rate.',
    'The share of unserved demand recovered by a substitute'
  ));

  // ── Framing ──
  const scenarioName = inputs.scenario_name?.trim()
    || `${product.category} — ${situation.label.toLowerCase()}`;
  const decisionQuestion = inputs.decision_question?.trim() || situation.decision_shape;
  const familyRationale = inputs.family_rationale?.trim()
    || `${situation.decision_shape} The family supplies the classification only — the economics are this record's.`;

  record('scenario_name', {
    value: scenarioName,
    descriptor: inputs.scenario_name?.trim() ? STATED_INPUT_PROVENANCE : MODELLED_INPUT_PROVENANCE,
    note: inputs.scenario_name?.trim()
      ? 'The scenario name was written by the author.'
      : 'No name was given, so one is composed from the product and the situation.'
  });
  record('decision_question', {
    value: decisionQuestion,
    descriptor: inputs.decision_question?.trim() ? STATED_INPUT_PROVENANCE : MODELLED_INPUT_PROVENANCE,
    note: inputs.decision_question?.trim()
      ? 'The decision question was written by the author.'
      : 'No decision question was given, so the situation\'s declared decision shape stands in.'
  });
  record('family_rationale', {
    value: familyRationale,
    descriptor: inputs.family_rationale?.trim() ? STATED_INPUT_PROVENANCE : MODELLED_INPUT_PROVENANCE,
    note: inputs.family_rationale?.trim()
      ? 'The classification rationale was written by the author.'
      : 'No rationale was given, so the situation\'s own is used.'
  });
  if (inputs.business_situation?.trim()) {
    record('business_situation', {
      value: inputs.business_situation.trim(),
      descriptor: STATED_INPUT_PROVENANCE,
      note: 'The situation description is the author\'s own words. It is held as data and nothing is derived from it.'
    });
  }
  if (inputs.qualitative_assumptions?.length) {
    record('qualitative_assumptions', {
      value: inputs.qualitative_assumptions,
      descriptor: STATED_INPUT_PROVENANCE,
      note: 'The assumptions were kept by the author.'
    });
  }

  const differentiationStatement = inputs.differentiation_statement?.trim()
    || 'This scenario declares no SKU or region differentiation, so its depth response is identical at every scope.';
  record('differentiation_statement', {
    value: differentiationStatement,
    descriptor: inputs.differentiation_statement?.trim() ? STATED_INPUT_PROVENANCE : MODELLED_INPUT_PROVENANCE,
    note: inputs.differentiation_statement?.trim()
      ? 'The differentiation statement was written by the author.'
      : 'No differentiation was declared, so the scenario states that it has none (ADR-079).'
  });

  const scenario: CanonicalScenario = {
    identity: {
      scenario_id: scenarioId,
      scenario_name: scenarioName,
      decision_question: decisionQuestion,
      // Category, subcategory and product name are the MASTER's, never the author's.
      category: product.category,
      subcategory: product.subcategory,
      sku_id: product.sku_id,
      sku_name: product.sku_name,
      market_scope: marketScope,
      market_scope_label: marketScopeLabel(marketScope, focusRegion),
      focus_region: focusRegion,
      channels
    },
    taxonomy: {
      family_id: situation.family_id,
      archetype_id: situation.archetype_id,
      family_rationale: familyRationale
    },
    estate: {
      national_store_count: storeCount,
      region_store_counts: regionStoreCounts,
      online_demand_share_pct: onlineSharePct,
      high_opportunity_store_count: Math.max(1, Math.round(storeCount * HIGH_OPPORTUNITY_STORE_SHARE)),
      high_opportunity_incremental_share_pct: HIGH_OPPORTUNITY_INCREMENTAL_SHARE_PCT,
      core_superstore_count: Math.max(1, Math.round(storeCount * CORE_SUPERSTORE_SHARE))
    },
    calendar: {
      forecast_horizon_days: horizonDays,
      scenario_clock_basis:
        'Midnight UTC on the day before the first projected day of the demand history in view.',
      supplier_cut_off_weekday: 5,
      supplier_cut_off_hour_utc: 14,
      supplier_lead_time_days: leadTimeDays,
      promotion_duration_days: promotionDurationDays,
      observed_history_end_date: historyEnd
    },
    demand: {
      base_demand_units_per_week: baseWeekly,
      total_demand_movement_pct: totalMovementPct,
      movement_attribution: drivers
    },
    supply: {
      // The supplier is the SKU's own supplier in the master — a flex notice is served on
      // whoever makes the product (`C-1.8`, R-20).
      supplier_id: product.supplier_id,
      supplier_name: product.supplier_name,
      supplier_capacity_index: capacityIndex,
      supplier_flex_rate_pct: flexRatePct,
      flex_clause_reference: SUPPLIER_FLEX_POSTURE[flexPostureId].clause_reference,
      flex_premium_rate_pct: flexPremiumPct
    },
    inventory: {
      // Declared as DAYS of cover and converted to units here, so the position rescales with
      // the scenario exactly as ADR-073 rule 2 requires of supply.
      store_units: Math.round(storeCoverDays * runRatePerDay),
      distribution_centre_units: Math.round(dcCoverDays * runRatePerDay),
      on_order_units: Math.round(onOrderCoverDays * runRatePerDay),
      cover_basis: 'DERIVED_FROM_BASE_RUN_RATE'
    },
    economics: {
      base_currency: 'GBP',
      list_price_gbp: product.list_price_gbp,
      promotion_depth_pct: depthPct,
      promotion_participation_pct: participationPct,
      gross_margin_rate_pct: grossMarginRatePct,
      supplier_promotional_funding_pct: fundingPct,
      promotional_response_pp_per_depth_point: responsePp,
      waste_units_per_week: wasteUnits,
      cannibalisation_rate_pct: cannibalisationPct,
      substitution_recovery_pct: substitutionPct
    },
    differentiation: {
      /*
       * An authored scenario declares NO differentiation. ADR-079: where a scenario does not
       * genuinely differ there is no modifier and the multiplier is 1. An author who believes
       * their line differs says so in the statement; a multiplier without a modelled reason is
       * exactly the hash this estate retired.
       */
      scope_response_multipliers: {},
      scope_response_reasons: {},
      depth_response_anomalies: [],
      statement: differentiationStatement
    },
    provenance: {
      basis: 'MODELLED_DEMONSTRATION_ASSUMPTION',
      // Server-derived, never read from the draft (`C-11`, ESF-6).
      synthetic_demo: true,
      statement: AUTHORED_SCENARIO_PROVENANCE_STATEMENT,
      descriptor: MODELLED_SCENARIO_PROVENANCE
    }
  };

  return { scenario, field_provenance: provenance, product };
}

/** `NATIONAL` reads as "National"; every other scope reads as the region it applies to. */
function marketScopeLabel(scope: ScenarioMarketScope, focusRegion: string): string {
  switch (scope) {
    case 'NATIONAL': return 'National';
    case 'REGION': return focusRegion;
    case 'STORE_CLUSTER': return 'Selected store cluster';
    case 'FULFILMENT_AREA': return 'Fulfilment area';
    case 'SELECTED_STORES': return 'Selected stores';
    default: return 'National';
  }
}

/**
 * The declared decomposition of a demand movement.
 *
 * Three driver classes, because those are the three the record's contract declares. The
 * promotion carries a declared share of the movement ABOVE trend; observed behaviour carries
 * what is left; the trend is the situation's own. The parts sum to the total by construction
 * rather than by adjustment, which is what `C-5` and the `R-36` attribution engine need.
 */
function declaredMovementAttribution(
  totalMovementPct: number,
  underlyingTrendPp: number,
  intentId: keyof typeof COMMERCIAL_INTENT_SHARE_OF_MOVEMENT,
  depthPct: number
): ScenarioDraftMovementDriver[] {
  const aboveTrend = totalMovementPct - underlyingTrendPp;
  const intentShare = depthPct > 0 ? COMMERCIAL_INTENT_SHARE_OF_MOVEMENT[intentId].value : 0;
  const commercial = round2(aboveTrend * intentShare);
  const behaviour = round2(aboveTrend - commercial);

  const drivers: ScenarioDraftMovementDriver[] = [];
  if (depthPct > 0) {
    drivers.push({
      driver: `Committed promotion at ${depthPct}% depth`,
      contribution_pp: commercial,
      driver_class: 'COMMERCIAL_INTENT'
    });
  }
  drivers.push({
    driver: 'Observed customer behaviour',
    contribution_pp: behaviour,
    driver_class: 'OBSERVED_BEHAVIOUR'
  });
  drivers.push({
    driver: 'Underlying demand trend',
    contribution_pp: round2(underlyingTrendPp),
    driver_class: 'UNDERLYING_TREND'
  });
  return drivers;
}

/** The identity an authored scenario takes. Stable for a draft, and legible about its origin. */
export function authoredScenarioIdFor(draftSuffix: string): string {
  return `${AUTHORED_SCENARIO_ID_PREFIX}${draftSuffix.toUpperCase()}`;
}
