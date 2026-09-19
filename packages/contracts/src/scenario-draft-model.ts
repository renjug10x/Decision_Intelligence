/**
 * CogniX Scenario Draft (ADR-083, `SCI-07`)
 * ───────────────────────────────────────────────────────────────────────────────
 * THE contract for authoring a scenario. Declared at Gate B, implemented here.
 *
 * What a draft is, and what it deliberately is not
 * -----------------------------------------------
 * A draft holds the BUSINESS INPUTS a person can legitimately author. It is not a second
 * scenario schema and must never become one: `CanonicalScenario` remains the single scenario
 * model, and a draft RESOLVES into one deterministically (`lib/scenario-authoring/`). Every
 * quantity the record derives — Decision Gap, revenue and margin exposure, the elasticity
 * curve, cover days, the flex allowance — is absent from this contract by construction,
 * because a field that can be authored is a field that can be authored WRONG, and an
 * authored Decision Gap is exactly the second economic universe ADR-073 and ADR-080 exist
 * to prevent.
 *
 * The architectural invariant, stated once
 * ----------------------------------------
 *   AI proposes structure. A person confirms. CogniX engines calculate. Certification
 *   decides whether it may be shown.
 *
 * Two tiers per quantitative dimension, and the distinction is the whole design
 * -----------------------------------------------------------------------------
 * ADR-083 part 1 rules that GenAI *"may propose that supplier flex is limited … It may not
 * propose that flex is 12%"*, and that *"every quantitative field is set by the user or
 * defaulted by a declared scenario model"*. That is two tiers, so this contract carries two:
 *
 *   a POSTURE   — a qualitative, closed-vocabulary token (`supplier_flex_posture: 'limited'`).
 *                 GenAI may propose it. It carries no number and cannot state one.
 *   a VALUE     — the explicit quantity (`supplier_flex_rate_pct: 12`). A person sets it, or
 *                 it is left absent and the declared scenario model supplies it FROM the
 *                 posture, as `origin: 'modelled'`.
 *
 * The rule is then enforceable by the type rather than remembered: a proposal naming a VALUE
 * field is refused structurally, before any text is read, because the field is not on the
 * GenAI allowlist. The response-content check (a percentage, a currency symbol, a decimal
 * quantity, a thousands-separated figure) runs on top of that as ADR-044's second line, not
 * as the only line.
 *
 * Precedence, declared here so no consumer invents its own:
 *
 *   explicit value  →  `origin: 'stated'`     the person said so
 *   posture only    →  `origin: 'modelled'`   a declared assumption stands in
 *   neither         →  `origin: 'modelled'`   the situation's declared default stands in
 *   master data     →  `origin: 'derived'`    read from the product/supplier masters
 *
 * Readiness follows from exactly that, which is why `Ready` cannot be reached by filling
 * blanks: a value the model supplied is `modelled` and says so.
 *
 * What this module is NOT
 * -----------------------
 * It holds no master data, no engines and no provider. Resolving a draft needs the product
 * and supplier masters and the certification harness; both live in `lib/`, and a contract
 * that imported them would invert the dependency the estate is built on. This module
 * declares the shapes, the closed vocabularies, the allowlists and the rules that stop a
 * draft — or a drafted proposal — from claiming something it has not earned.
 */

import {
  ProvenanceDescriptor,
  GENAI_DRAFT_PROVENANCE,
  MODELLED_SCENARIO_PROVENANCE,
  DERIVED_ENGINE_PROVENANCE,
  validateProvenanceDescriptor
} from './provenance-vocabulary';
import { ScenarioMarketScope } from './canonical-scenario-model';
import { ScenarioFamilyId } from './enterprise-world-model';

// ── Lifecycle ─────────────────────────────────────────────────────────────────

/**
 * `DRAFT` → `CONFIRMED`, and nothing else reaches a surface.
 *
 * `WITHDRAWN` exists so an abandoned draft is distinguishable from one nobody has finished,
 * which matters for the same reason `UNCERTIFIED` is distinguishable from `FAILED`: "they
 * stopped" and "they have not started" are different statements about a person's intent.
 *
 * There is no `ACTIVE`. Confirmation materialises a scenario and certifies it; ACTIVATION
 * stays where ADR-077 and ADR-080 put it — the registry, behind the certification gate. A
 * lifecycle that could activate would be a second activation path, and the estate has spent
 * two packets ensuring there is exactly one.
 */
export type ScenarioDraftState = 'DRAFT' | 'CONFIRMED' | 'WITHDRAWN';

export const SCENARIO_DRAFT_STATES: readonly ScenarioDraftState[] = ['DRAFT', 'CONFIRMED', 'WITHDRAWN'];

/** The identity prefix every authored scenario carries, so its origin is legible at a glance. */
export const AUTHORED_SCENARIO_ID_PREFIX = 'SCN-AUTHORED-';

/** The identity prefix every draft carries. */
export const SCENARIO_DRAFT_ID_PREFIX = 'DRAFT-';

// ── Governed situations — the closed set the estate can actually run ───────────

/**
 * What KIND of retail situation is being authored.
 *
 * This is a closed allowlist and it is short on purpose. The synthetic signal fabric
 * implements three scenario families (`services/world/src/enterprise-signal-generator.ts`),
 * and certification dimension `C-4.1` requires a signal timeline to exist. A situation
 * outside this set would author a scenario that cannot certify, so the honest answer is to
 * publish what the estate supports rather than to accept the request and fail later.
 *
 * `COGNIX_SCENARIO_INTELLIGENCE.md` §5.1 is the precedent: online fulfilment pressure is
 * declared roadmap rather than offered, because no engine consumes it economically. The
 * same rule is applied here to authoring.
 */
export type ScenarioSituationId =
  | 'PROMOTION_DEMAND_SURGE'
  | 'SUPPLIER_LEAD_TIME_RISK'
  | 'SHORT_LIFE_WASTE_EXPOSURE';

export interface ScenarioSituationSpec {
  id: ScenarioSituationId;
  /** Business language. This is what a reader chooses from, never the family id. */
  label: string;
  /** The decision the situation puts in front of a category team. */
  decision_shape: string;
  /** Taxonomy only — it carries no economics and no estate (ADR-077 part 2). */
  family_id: ScenarioFamilyId;
  /** The `ARCH-*` commercial projection that frames it. Narrative, never a second economics. */
  archetype_id: string;
  /** What the signal timeline will open on, so a reader knows what evidence to expect. */
  evidence_opens_on: string;
}

export const SCENARIO_SITUATIONS: readonly ScenarioSituationSpec[] = [
  {
    id: 'PROMOTION_DEMAND_SURGE',
    label: 'A committed promotion is pulling demand above the plan it was built on',
    decision_shape:
      'Demand has moved above the allocation the plan assumed. The question is whether the committed '
      + 'depth is still right, and whether the operation can serve what it creates.',
    family_id: 'promotion_surge',
    archetype_id: 'ARCH-CHILLED-ELASTIC',
    evidence_opens_on: 'search velocity, basket behaviour and supplier capacity pressure'
  },
  {
    id: 'SUPPLIER_LEAD_TIME_RISK',
    label: 'A supplier cannot land the volume inside its lead time',
    decision_shape:
      'The binding constraint is landed capacity rather than margin. The question is whether to hold, '
      + 'pull the promotion early, or pay to accelerate supply.',
    family_id: 'supplier_breach',
    archetype_id: 'ARCH-SUPPLY-CONSTRAINED',
    evidence_opens_on: 'lead-time drift, on-time delivery and allocation headroom'
  },
  {
    id: 'SHORT_LIFE_WASTE_EXPOSURE',
    label: 'A short-life line is carrying waste exposure under promotional pressure',
    decision_shape:
      'Volume bought by depth ages before it sells. The question is whether promoting this line adds '
      + 'contribution at all once waste is charged against it.',
    family_id: 'fresh_perishable_waste',
    archetype_id: 'ARCH-PREMIUM-ARTISAN',
    evidence_opens_on: 'surplus ageing, bake-plan headroom and margin compression'
  }
];

export const SCENARIO_SITUATION_IDS: readonly ScenarioSituationId[] =
  SCENARIO_SITUATIONS.map(s => s.id);

export function scenarioSituation(id: ScenarioSituationId): ScenarioSituationSpec | undefined {
  return SCENARIO_SITUATIONS.find(s => s.id === id);
}

/**
 * Situations the estate cannot model, published beside the ones it can.
 *
 * Offering only the supported set is half the honesty; saying what is NOT offered and why is
 * the other half, and it is what stops a demonstration being asked for a scenario the
 * platform would have to fabricate. Principle 12 and the `D-DDF-2` precedent.
 */
export const SCENARIO_SITUATIONS_NOT_SUPPORTED: readonly { label: string; reason: string }[] = [
  {
    label: 'Online fulfilment or picking-capacity pressure',
    reason:
      'the canonical record carries no fulfilment capacity, centre throughput or pick-rate term, and '
      + 'no engine consumes one economically. Registered roadmap, never demonstrated as present.'
  },
  {
    label: 'Competitor price response',
    reason:
      'no admitted evidence source describes a competitor, and a modelled competitor price would be '
      + 'a claim about a third party the estate cannot support.'
  },
  {
    label: 'Multi-SKU range or category-wide reallocation',
    reason:
      'the scenario record declares one SKU and one supplier so a flex notice can be served on the '
      + 'party that makes the product. A range decision needs a different record, not a wider draft.'
  }
];

// ── Closed posture vocabularies ───────────────────────────────────────────────
// Every one of these is a QUALITATIVE token. None carries a number. GenAI may propose any of
// them; the declared scenario model in `lib/scenario-authoring/` is what turns a token into a
// quantity, and it does so as `origin: 'modelled'` so the substitution is visible.

export type HorizonProfileId = 'one_week' | 'fortnight' | 'four_weeks';
export type DemandScaleProfileId = 'convenience_line' | 'mid_volume_line' | 'high_volume_staple';
export type DemandMovementProfileId = 'flat' | 'softening' | 'building' | 'surging';
export type PromotionIntentId = 'no_promotion' | 'shallow_cut' | 'committed_cut' | 'deep_cut';
export type SupplyHeadroomProfileId = 'no_headroom' | 'tight' | 'standard' | 'comfortable';
export type SupplierFlexPostureId = 'none' | 'limited' | 'standard' | 'generous';
export type SupplierFundingPostureId = 'unfunded' | 'token' | 'shared' | 'supplier_led';
export type PriceSensitivityId = 'inelastic' | 'moderate' | 'responsive' | 'highly_responsive';
export type InventoryPositionProfileId = 'short' | 'balanced' | 'long';
export type LeadTimeProfileId = 'same_week' | 'short_lead' | 'extended_lead';
export type EstateProfileId = 'convenience_led' | 'balanced_estate' | 'superstore_led';
export type WasteExposureId = 'negligible' | 'moderate' | 'material';

export type ScenarioDraftMarketScope = ScenarioMarketScope;

/** The regions a scenario may focus on. Closed, because a region must resolve to a store count. */
export const AUTHORABLE_REGIONS: readonly string[] = [
  'National', 'North West', 'London', 'Midlands', 'Yorkshire', 'South East', 'Scotland'
];

/** The routes to customer a scenario may declare. */
export const AUTHORABLE_CHANNELS: readonly string[] = ['In store', 'Online'];

export const AUTHORABLE_MARKET_SCOPES: readonly ScenarioMarketScope[] = [
  'NATIONAL', 'REGION', 'STORE_CLUSTER', 'FULFILMENT_AREA', 'SELECTED_STORES'
];

// ── The authoring inputs ──────────────────────────────────────────────────────

/**
 * One attributed driver of the demand movement.
 *
 * The DRIVER and its CLASS are business framing and GenAI may propose them. The
 * CONTRIBUTION is a measured decomposition and it may not — which is why the whole list is
 * off the GenAI allowlist and a drafted narrative is offered separately. A model that can
 * write "Committed promotion at 20% depth · 19.6pp" has authored the demand bridge.
 */
export interface ScenarioDraftMovementDriver {
  driver: string;
  contribution_pp: number;
  driver_class: 'COMMERCIAL_INTENT' | 'OBSERVED_BEHAVIOUR' | 'UNDERLYING_TREND';
}

/**
 * Everything a person may author.
 *
 * Every field is optional. A draft is a work in progress by definition, and a contract that
 * required a complete set would make "what is still missing?" unanswerable — which is
 * precisely the question readiness exists to answer.
 */
export interface ScenarioDraftInputs {
  // ── Identity and business framing ──
  scenario_name?: string;
  decision_question?: string;
  /**
   * The person's own description of their situation, in their own words. Held as DATA.
   * It is fenced before it reaches a provider, it is never read as instruction, and nothing
   * downstream derives a quantity from it.
   */
  business_situation?: string;
  family_rationale?: string;

  // ── Category and product ──
  /** A SKU from the governed product master. It fixes category, name, supplier and list price. */
  sku_id?: string;

  // ── Estate and scope ──
  market_scope?: ScenarioMarketScope;
  focus_region?: string;
  channels?: string[];
  estate_profile?: EstateProfileId;
  national_store_count?: number;
  online_demand_share_pct?: number;

  // ── The situation ──
  situation?: ScenarioSituationId;

  // ── Scenario calendar and horizon ──
  horizon_profile?: HorizonProfileId;
  forecast_horizon_days?: number;
  promotion_duration_days?: number;
  supply_lead_time_profile?: LeadTimeProfileId;
  supplier_lead_time_days?: number;
  /** The scenario's own Today. Never civil time (ADR-078). */
  observed_history_end_date?: string;

  // ── Demand situation ──
  demand_scale_profile?: DemandScaleProfileId;
  base_demand_units_per_week?: number;
  demand_movement_profile?: DemandMovementProfileId;
  total_demand_movement_pct?: number;
  demand_movement_drivers?: ScenarioDraftMovementDriver[];

  // ── Commercial intent ──
  promotion_intent?: PromotionIntentId;
  promotion_depth_pct?: number;
  promotion_participation_pct?: number;

  // ── Supply and constraint context ──
  supply_headroom_profile?: SupplyHeadroomProfileId;
  supplier_capacity_index?: number;
  supplier_flex_posture?: SupplierFlexPostureId;
  supplier_flex_rate_pct?: number;
  flex_premium_rate_pct?: number;

  // ── Inventory context ──
  inventory_position_profile?: InventoryPositionProfileId;
  store_cover_days?: number;
  distribution_centre_cover_days?: number;
  on_order_cover_days?: number;

  // ── Economics ──
  gross_margin_rate_pct?: number;
  supplier_funding_posture?: SupplierFundingPostureId;
  supplier_promotional_funding_pct?: number;
  price_sensitivity?: PriceSensitivityId;
  promotional_response_pp_per_depth_point?: number;
  waste_exposure?: WasteExposureId;
  waste_units_per_week?: number;
  cannibalisation_rate_pct?: number;
  substitution_recovery_pct?: number;

  // ── Qualitative assumptions ──
  qualitative_assumptions?: string[];
  differentiation_statement?: string;
}

export type ScenarioDraftFieldId = keyof ScenarioDraftInputs;

// ── The field register — the closed allowlist (ADR-083 part 4) ─────────────────

export type ScenarioDraftFieldKind = 'POSTURE' | 'QUANTITY' | 'STRUCTURE' | 'NARRATIVE';

export interface ScenarioDraftFieldSpec {
  id: ScenarioDraftFieldId;
  /** The authoring dimension a reader groups it under. */
  dimension:
    | 'framing'
    | 'product'
    | 'scope'
    | 'calendar'
    | 'demand'
    | 'commercial_intent'
    | 'supply'
    | 'inventory'
    | 'economics'
    | 'qualitative';
  kind: ScenarioDraftFieldKind;
  /** Business-language label. Internal field names never reach a reader. */
  label: string;
  /**
   * Whether governed GenAI may propose this field.
   *
   * `false` for every `QUANTITY`, without exception. This is ADR-083 part 1 expressed as
   * data rather than as prose, so the drafting route enforces it by lookup and a test can
   * assert the property over the whole register rather than field by field.
   */
  genai_authorable: boolean;
  /** The closed value set, where the field has one. Absent means free text or a number. */
  allowed_values?: readonly string[];
  /** Unit, for a quantity. Published so a reader is never shown a bare number. */
  unit?: string;
}

/**
 * THE register. Every authorable field, exactly once.
 *
 * A field absent from here cannot be authored, cannot be proposed and cannot be imported —
 * `validateScenarioDraftInputs` refuses an unknown key rather than ignoring it, because a
 * silently dropped field is how an import comes to mean something different from the export
 * it came from.
 */
export const SCENARIO_DRAFT_FIELDS: readonly ScenarioDraftFieldSpec[] = [
  // framing
  { id: 'scenario_name', dimension: 'framing', kind: 'NARRATIVE', label: 'Scenario name', genai_authorable: true },
  { id: 'decision_question', dimension: 'framing', kind: 'NARRATIVE', label: 'The decision question', genai_authorable: true },
  { id: 'business_situation', dimension: 'framing', kind: 'NARRATIVE', label: 'The situation in your words', genai_authorable: false },
  { id: 'family_rationale', dimension: 'framing', kind: 'NARRATIVE', label: 'Why this is the situation', genai_authorable: true },
  // product
  { id: 'sku_id', dimension: 'product', kind: 'STRUCTURE', label: 'Product', genai_authorable: true },
  // scope
  { id: 'market_scope', dimension: 'scope', kind: 'STRUCTURE', label: 'Where the decision applies', genai_authorable: true, allowed_values: AUTHORABLE_MARKET_SCOPES },
  { id: 'focus_region', dimension: 'scope', kind: 'STRUCTURE', label: 'Where the movement concentrates', genai_authorable: true, allowed_values: AUTHORABLE_REGIONS },
  { id: 'channels', dimension: 'scope', kind: 'STRUCTURE', label: 'Routes to customer', genai_authorable: true, allowed_values: AUTHORABLE_CHANNELS },
  { id: 'estate_profile', dimension: 'scope', kind: 'POSTURE', label: 'Shape of the estate', genai_authorable: true, allowed_values: ['convenience_led', 'balanced_estate', 'superstore_led'] },
  { id: 'national_store_count', dimension: 'scope', kind: 'QUANTITY', label: 'Stores ranging the line', genai_authorable: false, unit: 'stores' },
  { id: 'online_demand_share_pct', dimension: 'scope', kind: 'QUANTITY', label: 'Share of demand transacting online', genai_authorable: false, unit: 'percent' },
  // situation
  { id: 'situation', dimension: 'demand', kind: 'POSTURE', label: 'The situation', genai_authorable: true, allowed_values: SCENARIO_SITUATION_IDS },
  // calendar
  { id: 'horizon_profile', dimension: 'calendar', kind: 'POSTURE', label: 'How far ahead the decision looks', genai_authorable: true, allowed_values: ['one_week', 'fortnight', 'four_weeks'] },
  { id: 'forecast_horizon_days', dimension: 'calendar', kind: 'QUANTITY', label: 'Decision horizon', genai_authorable: false, unit: 'days' },
  { id: 'promotion_duration_days', dimension: 'calendar', kind: 'QUANTITY', label: 'Days the promotion runs', genai_authorable: false, unit: 'days' },
  { id: 'supply_lead_time_profile', dimension: 'calendar', kind: 'POSTURE', label: 'How quickly supply can respond', genai_authorable: true, allowed_values: ['same_week', 'short_lead', 'extended_lead'] },
  { id: 'supplier_lead_time_days', dimension: 'calendar', kind: 'QUANTITY', label: 'Supplier lead time', genai_authorable: false, unit: 'days' },
  { id: 'observed_history_end_date', dimension: 'calendar', kind: 'STRUCTURE', label: 'The scenario\'s Today', genai_authorable: false },
  // demand
  { id: 'demand_scale_profile', dimension: 'demand', kind: 'POSTURE', label: 'Size of the line', genai_authorable: true, allowed_values: ['convenience_line', 'mid_volume_line', 'high_volume_staple'] },
  { id: 'base_demand_units_per_week', dimension: 'demand', kind: 'QUANTITY', label: 'Un-promoted weekly demand', genai_authorable: false, unit: 'units per week' },
  { id: 'demand_movement_profile', dimension: 'demand', kind: 'POSTURE', label: 'Which way demand is moving', genai_authorable: true, allowed_values: ['flat', 'softening', 'building', 'surging'] },
  { id: 'total_demand_movement_pct', dimension: 'demand', kind: 'QUANTITY', label: 'Movement above the un-promoted base', genai_authorable: false, unit: 'percent' },
  { id: 'demand_movement_drivers', dimension: 'demand', kind: 'QUANTITY', label: 'What is driving the movement', genai_authorable: false, unit: 'percentage points' },
  // commercial intent
  { id: 'promotion_intent', dimension: 'commercial_intent', kind: 'POSTURE', label: 'Promotional intent', genai_authorable: true, allowed_values: ['no_promotion', 'shallow_cut', 'committed_cut', 'deep_cut'] },
  { id: 'promotion_depth_pct', dimension: 'commercial_intent', kind: 'QUANTITY', label: 'Depth off list', genai_authorable: false, unit: 'percent' },
  { id: 'promotion_participation_pct', dimension: 'commercial_intent', kind: 'QUANTITY', label: 'Share of volume at the promoted price', genai_authorable: false, unit: 'percent' },
  // supply
  { id: 'supply_headroom_profile', dimension: 'supply', kind: 'POSTURE', label: 'Allocation headroom', genai_authorable: true, allowed_values: ['no_headroom', 'tight', 'standard', 'comfortable'] },
  { id: 'supplier_capacity_index', dimension: 'supply', kind: 'QUANTITY', label: 'Standing allocation as a multiple of base demand', genai_authorable: false, unit: 'index' },
  { id: 'supplier_flex_posture', dimension: 'supply', kind: 'POSTURE', label: 'Contractual flex available', genai_authorable: true, allowed_values: ['none', 'limited', 'standard', 'generous'] },
  { id: 'supplier_flex_rate_pct', dimension: 'supply', kind: 'QUANTITY', label: 'Flex allowance', genai_authorable: false, unit: 'percent of weekly demand' },
  { id: 'flex_premium_rate_pct', dimension: 'supply', kind: 'QUANTITY', label: 'Premium charged on flexed volume', genai_authorable: false, unit: 'percent of unit revenue' },
  // inventory
  { id: 'inventory_position_profile', dimension: 'inventory', kind: 'POSTURE', label: 'Stock position', genai_authorable: true, allowed_values: ['short', 'balanced', 'long'] },
  { id: 'store_cover_days', dimension: 'inventory', kind: 'QUANTITY', label: 'Days of cover in store', genai_authorable: false, unit: 'days' },
  { id: 'distribution_centre_cover_days', dimension: 'inventory', kind: 'QUANTITY', label: 'Days of cover in the network', genai_authorable: false, unit: 'days' },
  { id: 'on_order_cover_days', dimension: 'inventory', kind: 'QUANTITY', label: 'Days of cover already on order', genai_authorable: false, unit: 'days' },
  // economics
  { id: 'gross_margin_rate_pct', dimension: 'economics', kind: 'QUANTITY', label: 'Gross margin rate', genai_authorable: false, unit: 'percent' },
  { id: 'supplier_funding_posture', dimension: 'economics', kind: 'POSTURE', label: 'Who funds the price investment', genai_authorable: true, allowed_values: ['unfunded', 'token', 'shared', 'supplier_led'] },
  { id: 'supplier_promotional_funding_pct', dimension: 'economics', kind: 'QUANTITY', label: 'Share of the price investment the supplier funds', genai_authorable: false, unit: 'percent' },
  { id: 'price_sensitivity', dimension: 'economics', kind: 'POSTURE', label: 'How the line responds to price', genai_authorable: true, allowed_values: ['inelastic', 'moderate', 'responsive', 'highly_responsive'] },
  { id: 'promotional_response_pp_per_depth_point', dimension: 'economics', kind: 'QUANTITY', label: 'Demand response per point of depth', genai_authorable: false, unit: 'percentage points' },
  { id: 'waste_exposure', dimension: 'economics', kind: 'POSTURE', label: 'Waste exposure on the line', genai_authorable: true, allowed_values: ['negligible', 'moderate', 'material'] },
  { id: 'waste_units_per_week', dimension: 'economics', kind: 'QUANTITY', label: 'Units lost to waste each week', genai_authorable: false, unit: 'units per week' },
  { id: 'cannibalisation_rate_pct', dimension: 'economics', kind: 'QUANTITY', label: 'Share of promoted volume taken from neighbouring lines', genai_authorable: false, unit: 'percent' },
  { id: 'substitution_recovery_pct', dimension: 'economics', kind: 'QUANTITY', label: 'Share of unserved demand recovered by a substitute', genai_authorable: false, unit: 'percent' },
  // qualitative
  { id: 'qualitative_assumptions', dimension: 'qualitative', kind: 'NARRATIVE', label: 'Assumptions this scenario rests on', genai_authorable: true },
  { id: 'differentiation_statement', dimension: 'qualitative', kind: 'NARRATIVE', label: 'What makes this line behave differently', genai_authorable: true }
];

export const SCENARIO_DRAFT_FIELD_IDS: readonly ScenarioDraftFieldId[] =
  SCENARIO_DRAFT_FIELDS.map(f => f.id);

const FIELD_INDEX: ReadonlyMap<string, ScenarioDraftFieldSpec> =
  new Map(SCENARIO_DRAFT_FIELDS.map(f => [f.id as string, f]));

export function scenarioDraftField(id: string): ScenarioDraftFieldSpec | undefined {
  return FIELD_INDEX.get(id);
}

/** The GenAI allowlist. Derived from the register, never restated — one source, one truth. */
export const GENAI_AUTHORABLE_FIELD_IDS: readonly ScenarioDraftFieldId[] =
  SCENARIO_DRAFT_FIELDS.filter(f => f.genai_authorable).map(f => f.id);

/** The fields GenAI may never author. The complement, derived the same way. */
export const GENAI_PROHIBITED_FIELD_IDS: readonly ScenarioDraftFieldId[] =
  SCENARIO_DRAFT_FIELDS.filter(f => !f.genai_authorable).map(f => f.id);

export function isGenAiAuthorableField(id: string): boolean {
  return FIELD_INDEX.get(id)?.genai_authorable === true;
}

/**
 * The invariant that makes the allowlist trustworthy, asserted rather than assumed.
 *
 * Every `QUANTITY` is prohibited to GenAI. Stated as a function so a test asserts the
 * property of the REGISTER, and a field added later without thinking fails it.
 */
export function assertNoQuantitativeFieldIsGenAiAuthorable(): { valid: boolean; offenders: string[] } {
  const offenders = SCENARIO_DRAFT_FIELDS
    .filter(f => f.kind === 'QUANTITY' && f.genai_authorable)
    .map(f => f.id as string);
  return { valid: offenders.length === 0, offenders };
}

// ── Field provenance ──────────────────────────────────────────────────────────

/**
 * How one field came to hold the value it holds.
 *
 * The ADR-082 vocabulary, plus the one thing the vocabulary deliberately does not carry: a
 * short human sentence saying where the value came from. ADR-082 part 4 forbids a fourth
 * DIMENSION; a note is not a dimension, and without it "modelled" cannot answer *modelled
 * how?* — which is the question a client actually asks.
 */
export interface ScenarioDraftFieldProvenance {
  field: ScenarioDraftFieldId;
  descriptor: ProvenanceDescriptor;
  /** One sentence, reader-facing. */
  note: string;
  /** Present where GenAI proposed the value and a person then kept it. */
  drafted_by_model?: string;
}

/** The person stated it. */
export const STATED_INPUT_PROVENANCE: ProvenanceDescriptor = {
  origin: 'stated',
  method: 'manual',
  authority: 'authoritative'
};

/** A declared assumption stands in for something the person did not supply. */
export const MODELLED_INPUT_PROVENANCE: ProvenanceDescriptor = MODELLED_SCENARIO_PROVENANCE;

/** Read from a governed master, or computed by CogniX from what is declared. */
export const DERIVED_INPUT_PROVENANCE: ProvenanceDescriptor = DERIVED_ENGINE_PROVENANCE;

/** Proposed by the model and not yet confirmed. Never authoritative. */
export const DRAFTED_INPUT_PROVENANCE: ProvenanceDescriptor = GENAI_DRAFT_PROVENANCE;

// ── Capability readiness (COGNIX_SCENARIO_INTELLIGENCE.md §6.1) ────────────────

/**
 * The governed vocabulary, unchanged. Reader-facing words, not engineering ones.
 *
 * `Ready`       observed or attested evidence present for every input the capability requires
 * `Limited`     partial evidence; the capability runs and its result is bounded, and says so
 * `Modelled`    a declared assumption stands in for absent evidence — `origin: modelled`
 * `Unavailable` the capability cannot run. It says so and publishes nothing
 */
export type CapabilityReadinessState = 'Ready' | 'Limited' | 'Modelled' | 'Unavailable';

export const CAPABILITY_READINESS_STATES: readonly CapabilityReadinessState[] =
  ['Ready', 'Limited', 'Modelled', 'Unavailable'];

/**
 * Severity order, worst first, declared once so two surfaces cannot rank them differently.
 *
 * `Modelled` is weaker than `Limited` deliberately: `Limited` has partial evidence for the
 * input, `Modelled` has none and substitutes an assumption. Reading them the other way round
 * would let a scenario with no evidence at all outrank one with some.
 */
const READINESS_SEVERITY: Readonly<Record<CapabilityReadinessState, number>> = {
  Unavailable: 3,
  Modelled: 2,
  Limited: 1,
  Ready: 0
};

/** The weakest of a set — how a capability's overall state is earned from its inputs. */
export function weakestReadiness(
  states: readonly CapabilityReadinessState[]
): CapabilityReadinessState {
  return states.reduce<CapabilityReadinessState>(
    (worst, s) => (READINESS_SEVERITY[s] > READINESS_SEVERITY[worst] ? s : worst),
    'Ready'
  );
}

export function readinessSeverity(state: CapabilityReadinessState): number {
  return READINESS_SEVERITY[state];
}

/** The business capabilities readiness is reported for. Surfaces, not modules. */
export type ScenarioCapabilityId =
  | 'DEMAND_OUTLOOK'
  | 'PROMOTION_ECONOMICS'
  | 'SUPPLY_CONSEQUENCE'
  | 'INVENTORY_POSITION'
  | 'SIGNAL_EVIDENCE'
  | 'CAMPAIGN_DECISION';

export interface ScenarioCapabilitySpec {
  id: ScenarioCapabilityId;
  label: string;
  /** What the capability answers, in the words a business reader would use. */
  question: string;
  /** The draft fields it needs before it can answer. */
  required_fields: readonly ScenarioDraftFieldId[];
}

/**
 * Whether an input is by nature a MEASUREMENT or a DECLARATION, which is what decides
 * whether a person stating it counts as evidence.
 *
 * A promotion depth is a DECISION: the person stating "we committed to 20%" IS the evidence,
 * and calling that `Limited` would be pedantry that teaches a reader to ignore the badge.
 * A weekly demand of 350,000 units is a MEASUREMENT: a person stating it is an estimate
 * standing in for a reading, and the honest word for that is `Limited` until a file or an
 * attested source supplies it (`SCI-10`).
 */
export type DraftEvidenceKind = 'MEASUREMENT' | 'DECLARATION';

export const DRAFT_FIELD_EVIDENCE_KIND: Readonly<Partial<Record<ScenarioDraftFieldId, DraftEvidenceKind>>> = {
  base_demand_units_per_week: 'MEASUREMENT',
  total_demand_movement_pct: 'MEASUREMENT',
  demand_movement_drivers: 'MEASUREMENT',
  online_demand_share_pct: 'MEASUREMENT',
  national_store_count: 'MEASUREMENT',
  gross_margin_rate_pct: 'MEASUREMENT',
  promotional_response_pp_per_depth_point: 'MEASUREMENT',
  waste_units_per_week: 'MEASUREMENT',
  cannibalisation_rate_pct: 'MEASUREMENT',
  substitution_recovery_pct: 'MEASUREMENT',
  supplier_capacity_index: 'MEASUREMENT',
  store_cover_days: 'MEASUREMENT',
  distribution_centre_cover_days: 'MEASUREMENT',
  on_order_cover_days: 'MEASUREMENT',
  supplier_lead_time_days: 'MEASUREMENT',
  // Declarations: a person saying so is the source of truth, not a proxy for a reading.
  promotion_depth_pct: 'DECLARATION',
  promotion_participation_pct: 'DECLARATION',
  promotion_intent: 'DECLARATION',
  supplier_promotional_funding_pct: 'DECLARATION',
  supplier_flex_rate_pct: 'DECLARATION',
  flex_premium_rate_pct: 'DECLARATION',
  forecast_horizon_days: 'DECLARATION',
  promotion_duration_days: 'DECLARATION',
  observed_history_end_date: 'DECLARATION',
  situation: 'DECLARATION',
  sku_id: 'DECLARATION',
  market_scope: 'DECLARATION',
  focus_region: 'DECLARATION',
  channels: 'DECLARATION'
};

export function draftFieldEvidenceKind(field: ScenarioDraftFieldId): DraftEvidenceKind {
  return DRAFT_FIELD_EVIDENCE_KIND[field] ?? 'DECLARATION';
}

export const SCENARIO_CAPABILITIES: readonly ScenarioCapabilitySpec[] = [
  {
    id: 'DEMAND_OUTLOOK',
    label: 'Demand outlook',
    question: 'How much demand is coming, and how far is it from the plan?',
    required_fields: ['base_demand_units_per_week', 'total_demand_movement_pct', 'forecast_horizon_days']
  },
  {
    id: 'PROMOTION_ECONOMICS',
    label: 'Promotion economics',
    question: 'Does this price investment add contribution, and at what depth?',
    required_fields: [
      'promotion_depth_pct',
      'promotion_participation_pct',
      'gross_margin_rate_pct',
      'supplier_promotional_funding_pct',
      'promotional_response_pp_per_depth_point'
    ]
  },
  {
    id: 'SUPPLY_CONSEQUENCE',
    label: 'Supply consequence',
    question: 'Can the operation serve what the decision creates?',
    required_fields: ['supplier_capacity_index', 'supplier_flex_rate_pct', 'supplier_lead_time_days']
  },
  {
    id: 'INVENTORY_POSITION',
    label: 'Inventory position',
    question: 'How much cover is there, and where is it?',
    required_fields: ['store_cover_days', 'distribution_centre_cover_days', 'on_order_cover_days']
  },
  {
    id: 'SIGNAL_EVIDENCE',
    label: 'Evidence and signals',
    question: 'What is the evidence, where did it come from and how fresh is it?',
    required_fields: ['situation', 'observed_history_end_date']
  },
  {
    id: 'CAMPAIGN_DECISION',
    label: 'Campaign decision',
    question: 'What should we do, and what happens if we do nothing?',
    required_fields: ['sku_id', 'situation', 'market_scope', 'promotion_depth_pct', 'forecast_horizon_days']
  }
];

export interface ScenarioCapabilityReadiness {
  capability: ScenarioCapabilityId;
  label: string;
  question: string;
  state: CapabilityReadinessState;
  /** Why it is in that state, in business language. Never an empty string. */
  reason: string;
  /** Inputs standing on a declared assumption rather than on anything the person supplied. */
  modelled_inputs: ScenarioDraftFieldId[];
  /** Inputs the person stated where a measurement is what the capability really wants. */
  stated_in_place_of_measured: ScenarioDraftFieldId[];
  /** Inputs with no value at all and no declared default. */
  missing_inputs: ScenarioDraftFieldId[];
}

// ── Validation ────────────────────────────────────────────────────────────────

export type ScenarioDraftIssueSeverity = 'ERROR' | 'WARNING';

export interface ScenarioDraftIssue {
  field: string;
  severity: ScenarioDraftIssueSeverity;
  message: string;
}

export interface ScenarioDraftValidation {
  valid: boolean;
  issues: ScenarioDraftIssue[];
}

const NUMERIC_FIELD_BOUNDS: Readonly<Partial<Record<ScenarioDraftFieldId, { min: number; max: number }>>> = {
  national_store_count: { min: 1, max: 20_000 },
  online_demand_share_pct: { min: 0, max: 100 },
  forecast_horizon_days: { min: 1, max: 90 },
  promotion_duration_days: { min: 0, max: 90 },
  supplier_lead_time_days: { min: 0, max: 60 },
  base_demand_units_per_week: { min: 1, max: 50_000_000 },
  total_demand_movement_pct: { min: -90, max: 300 },
  promotion_depth_pct: { min: 0, max: 60 },
  promotion_participation_pct: { min: 1, max: 100 },
  supplier_capacity_index: { min: 0.5, max: 3 },
  supplier_flex_rate_pct: { min: 0, max: 100 },
  flex_premium_rate_pct: { min: 0, max: 100 },
  store_cover_days: { min: 0, max: 120 },
  distribution_centre_cover_days: { min: 0, max: 180 },
  on_order_cover_days: { min: 0, max: 180 },
  gross_margin_rate_pct: { min: 1, max: 90 },
  supplier_promotional_funding_pct: { min: 0, max: 99 },
  promotional_response_pp_per_depth_point: { min: 0, max: 10 },
  waste_units_per_week: { min: 0, max: 50_000_000 },
  cannibalisation_rate_pct: { min: 0, max: 100 },
  substitution_recovery_pct: { min: 0, max: 100 }
};

export function numericFieldBounds(field: ScenarioDraftFieldId): { min: number; max: number } | undefined {
  return NUMERIC_FIELD_BOUNDS[field];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Structural validation of authoring inputs.
 *
 * It answers *"is this a well-formed draft?"*, not *"will this scenario certify?"* — the
 * second question belongs to the certification gate and is deliberately not anticipated
 * here. A validator that tried to predict certification would become a second, weaker copy
 * of it, and the two would disagree.
 */
export function validateScenarioDraftInputs(inputs: unknown): ScenarioDraftValidation {
  const issues: ScenarioDraftIssue[] = [];
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) {
    return { valid: false, issues: [{ field: '*', severity: 'ERROR', message: 'A draft must be an object of authoring inputs.' }] };
  }

  const record = inputs as Record<string, unknown>;

  for (const [key, value] of Object.entries(record)) {
    const spec = FIELD_INDEX.get(key);
    if (!spec) {
      // Refused, never ignored: a dropped field makes an import mean something else.
      issues.push({ field: key, severity: 'ERROR', message: `"${key}" is not an authorable scenario field.` });
      continue;
    }
    if (value === undefined || value === null) continue;

    const bounds = NUMERIC_FIELD_BOUNDS[spec.id];
    if (bounds) {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        issues.push({ field: key, severity: 'ERROR', message: `${spec.label} must be a number.` });
      } else if (value < bounds.min || value > bounds.max) {
        issues.push({
          field: key,
          severity: 'ERROR',
          message: `${spec.label} must be between ${bounds.min} and ${bounds.max}${spec.unit ? ` ${spec.unit}` : ''}.`
        });
      }
      continue;
    }

    if (spec.id === 'observed_history_end_date') {
      if (typeof value !== 'string' || !ISO_DATE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))) {
        issues.push({ field: key, severity: 'ERROR', message: 'The scenario\'s Today must be a calendar date, as YYYY-MM-DD.' });
      }
      continue;
    }

    if (spec.id === 'channels') {
      if (!Array.isArray(value) || value.length === 0) {
        issues.push({ field: key, severity: 'ERROR', message: 'At least one route to customer is required.' });
      } else {
        const unknownChannels = value.filter(v => typeof v !== 'string' || !AUTHORABLE_CHANNELS.includes(v));
        if (unknownChannels.length > 0) {
          issues.push({ field: key, severity: 'ERROR', message: `Unknown route to customer: ${unknownChannels.join(', ')}.` });
        }
      }
      continue;
    }

    if (spec.id === 'qualitative_assumptions') {
      if (!Array.isArray(value) || value.some(v => typeof v !== 'string')) {
        issues.push({ field: key, severity: 'ERROR', message: 'Assumptions must be a list of statements.' });
      }
      continue;
    }

    if (spec.id === 'demand_movement_drivers') {
      const drivers = value as ScenarioDraftMovementDriver[];
      if (!Array.isArray(drivers) || drivers.length === 0) {
        issues.push({ field: key, severity: 'ERROR', message: 'Movement drivers must be a non-empty list.' });
      } else {
        for (const d of drivers) {
          if (!d || typeof d.driver !== 'string' || !d.driver.trim()) {
            issues.push({ field: key, severity: 'ERROR', message: 'Every movement driver needs a name.' });
          }
          if (typeof d?.contribution_pp !== 'number' || !Number.isFinite(d.contribution_pp)) {
            issues.push({ field: key, severity: 'ERROR', message: 'Every movement driver needs a contribution in percentage points.' });
          }
          if (!['COMMERCIAL_INTENT', 'OBSERVED_BEHAVIOUR', 'UNDERLYING_TREND'].includes(d?.driver_class)) {
            issues.push({ field: key, severity: 'ERROR', message: 'Every movement driver needs a declared class.' });
          }
        }
      }
      continue;
    }

    if (spec.allowed_values) {
      if (typeof value !== 'string' || !spec.allowed_values.includes(value)) {
        issues.push({
          field: key,
          severity: 'ERROR',
          message: `${spec.label} must be one of: ${spec.allowed_values.join(', ')}.`
        });
      }
      continue;
    }

    if (typeof value !== 'string') {
      issues.push({ field: key, severity: 'ERROR', message: `${spec.label} must be text.` });
    } else if (value.length > 600) {
      issues.push({ field: key, severity: 'ERROR', message: `${spec.label} is longer than 600 characters.` });
    }
  }

  // Cross-field rules that are genuinely structural rather than economic.
  const depth = record.promotion_depth_pct;
  const duration = record.promotion_duration_days;
  if (typeof depth === 'number' && depth > 0 && typeof duration === 'number' && duration === 0) {
    issues.push({
      field: 'promotion_duration_days',
      severity: 'ERROR',
      message: 'A promotion with a depth must also run for at least one day.'
    });
  }
  if (record.situation !== undefined && !SCENARIO_SITUATION_IDS.includes(record.situation as ScenarioSituationId)) {
    issues.push({
      field: 'situation',
      severity: 'ERROR',
      message: `CogniX can model these situations today: ${SCENARIO_SITUATION_IDS.join(', ')}.`
    });
  }

  return { valid: issues.every(i => i.severity !== 'ERROR'), issues };
}

// ── The GenAI draft envelope (ADR-044, extended by ADR-083) ────────────────────

export const SCENARIO_DRAFT_DISCLOSURE =
  'Drafted by AI from your description. Nothing here is calculated, measured or confirmed — review '
  + 'every proposal, then confirm the scenario so CogniX can compute it.';

/** Why a proposal did not survive validation. Reported, never silently dropped. */
export type ScenarioDraftRejectionReason =
  | 'UNKNOWN_FIELD'
  | 'FIELD_NOT_AUTHORABLE_BY_GENAI'
  | 'VALUE_NOT_IN_ALLOWLIST'
  | 'QUANTITATIVE_CLAIM'
  | 'CREDENTIAL_SHAPED_VALUE'
  | 'EMPTY_VALUE'
  | 'TOO_LONG'
  | 'PROMPT_SCAFFOLDING_ECHO'
  | 'DUPLICATE_FIELD';

export interface ScenarioDraftProposal {
  field: ScenarioDraftFieldId;
  /** Always a token or a short line of text. A proposal never carries a number. */
  value: string;
  /** Why the model proposed it. Validated on the same rules as the value. */
  rationale: string;
}

export interface ScenarioDraftRejection {
  field: string;
  value: string;
  reason: ScenarioDraftRejectionReason;
  detail: string;
}

/**
 * What a drafting call returns.
 *
 * `source` and `authority` are the ADR-044 stamp, carried over unchanged by ADR-044
 * Amendment B. An envelope arriving without them is treated as a failure, because a draft
 * that cannot be identified as a draft is indistinguishable from an authored input once it
 * is in the record.
 */
export interface ScenarioDraftEnvelope {
  source: 'GENAI_DRAFT';
  authority: 'NON_AUTHORITATIVE_DRAFT';
  provider: 'google_generative_ai';
  model_family: 'gemini';
  model: string;
  generated_at: string;
  proposals: ScenarioDraftProposal[];
  /** Every proposal that did not survive, with the rule it broke. */
  rejected: ScenarioDraftRejection[];
  /** What the model says it could not determine. Text, never a quantity. */
  missing_information: string[];
  /** The model's reading of what is still needed before the scenario is decision-grade. */
  readiness_explanation: string;
  disclosure: string;
  provenance: ProvenanceDescriptor;
}

export const GENAI_DRAFT_SOURCE = 'GENAI_DRAFT' as const;
export const GENAI_DRAFT_AUTHORITY = 'NON_AUTHORITATIVE_DRAFT' as const;

/**
 * Whether an envelope is admissible at all.
 *
 * The stamp, the provenance and the structural allowlist are re-checked here rather than
 * trusted from the producer, because this is the function a consumer calls and a consumer
 * should not have to trust the route that built the envelope.
 */
export function validateScenarioDraftEnvelope(
  envelope: ScenarioDraftEnvelope | null | undefined
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!envelope || typeof envelope !== 'object') {
    return { valid: false, errors: ['no draft envelope was returned'] };
  }
  if (envelope.source !== GENAI_DRAFT_SOURCE) {
    errors.push(`a draft envelope must be stamped source: ${GENAI_DRAFT_SOURCE}`);
  }
  if (envelope.authority !== GENAI_DRAFT_AUTHORITY) {
    errors.push(`a draft envelope must be stamped authority: ${GENAI_DRAFT_AUTHORITY}`);
  }
  const provenance = validateProvenanceDescriptor(envelope.provenance);
  if (!provenance.valid) errors.push(...provenance.errors);
  if (envelope.provenance?.origin !== 'drafted' || envelope.provenance?.method !== 'llm') {
    errors.push('a draft envelope must carry origin: drafted, method: llm');
  }
  for (const proposal of envelope.proposals ?? []) {
    if (!isGenAiAuthorableField(proposal.field as string)) {
      errors.push(`proposal names ${proposal.field}, which GenAI may not author`);
    }
  }
  return { valid: errors.length === 0, errors };
}

// ── The draft record ──────────────────────────────────────────────────────────

/**
 * A certification verdict carried on the draft after a confirmation attempt.
 *
 * Deliberately a summary rather than the full result: the draft is an authoring record, and
 * the authoritative certification result belongs to the gate. Carrying a copy that could go
 * stale is exactly the second-source problem this programme exists to close.
 */
export interface ScenarioDraftCertificationSummary {
  state: 'CERTIFIED' | 'FAILED' | 'UNCERTIFIED';
  summary: string;
  failed_dimensions: string[];
  assertion_count: number;
  evaluated_at_scenario_clock: string;
}

export interface ScenarioDraft {
  draft_id: string;
  /** The identity the scenario will take. Declared at creation so nothing renames it later. */
  scenario_id: string;
  tenant_id: string;
  state: ScenarioDraftState;
  inputs: ScenarioDraftInputs;
  /** One entry per field that holds a value. Derived, never authored. */
  field_provenance: ScenarioDraftFieldProvenance[];
  /** Every drafting call made against this draft, in order. The audit of what AI proposed. */
  genai_envelopes: ScenarioDraftEnvelope[];
  /**
   * Platform receipt times, not scenario time. A draft is an artefact of the running
   * platform rather than of the modelled world, so ADR-078 leaves it on civil time — the
   * same distinction `platformReceiptNowIso` already draws elsewhere.
   */
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  /** Who confirmed. A draft cannot confirm itself and a model cannot confirm it. */
  confirmed_by: string | null;
  last_certification: ScenarioDraftCertificationSummary | null;
  /** Stable over the authoring inputs. What an export carries and an import checks. */
  content_hash: string;
}

/**
 * The exportable form.
 *
 * Only the inputs and the hash travel. Provenance, envelopes and certification are all
 * DERIVED from the inputs by this estate, so exporting them would create a second copy that
 * a hand-edited file could contradict — and an import that trusted it would admit a
 * provenance claim nobody earned.
 */
export interface ScenarioDraftExport {
  format: 'cognix.scenario-draft.v1';
  scenario_id: string;
  inputs: ScenarioDraftInputs;
  content_hash: string;
  exported_at: string;
  disclosure: string;
}

export const SCENARIO_DRAFT_EXPORT_FORMAT = 'cognix.scenario-draft.v1' as const;

export const SCENARIO_DRAFT_EXPORT_DISCLOSURE =
  'Scenario authoring inputs only. Every quantity CogniX publishes for this scenario is recomputed '
  + 'from these inputs by its engines; none of it travels in this file.';

/**
 * Canonical JSON over the inputs: keys in register order, `undefined` dropped.
 *
 * Register order rather than alphabetical, because the register is the thing that would have
 * to change for the hash to move, and that is the change a reader should be told about.
 */
export function canonicaliseScenarioDraftInputs(inputs: ScenarioDraftInputs): string {
  const out: Record<string, unknown> = {};
  for (const field of SCENARIO_DRAFT_FIELDS) {
    const value = (inputs as Record<string, unknown>)[field.id as string];
    if (value === undefined || value === null) continue;
    out[field.id as string] = value;
  }
  return JSON.stringify(out);
}
