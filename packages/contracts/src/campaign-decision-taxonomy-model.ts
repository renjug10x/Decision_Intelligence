/**
 * CogniX Campaign Decision Intelligence — Decision Dimension Taxonomies
 *
 * Category, Customer Segment, Sales Channel and Activation Channel are decision
 * dimensions, not labels. Each entry below carries the planning properties that let a
 * downstream engine reason about it, so that changing a dimension changes the decision
 * rather than only the caption.
 *
 * Evidence honesty
 * ----------------
 * Three different kinds of statement live in this file and they are not interchangeable:
 *
 *  - CATALOGUE_BACKED — the value exists in the enterprise catalogue (data/products.json,
 *    data/suppliers.json). Category is the only dimension with this backing today; its SKU
 *    counts, supplier concentration and subcategory spread are read from that catalogue.
 *  - DOMAIN_CONSTANT — a stable retail-domain property (produce is short shelf life; an
 *    email send needs less lead time than in-store point-of-sale). Not measured here, but
 *    not in dispute either.
 *  - DEMO_ASSUMPTION — a deterministic planning assumption used so the demonstration can
 *    reason at all. There is no customer-segment or channel data in this estate, so every
 *    reach and responsiveness figure on those dimensions is of this kind.
 *
 * `evidence_basis` states which kind each figure is, and readiness surfaces that verbatim.
 * A DEMO_ASSUMPTION is never presented as measurement.
 *
 * Modelling boundary
 * ------------------
 * "Channel" in retail planning conflates three different questions. This model separates
 * the two that a campaign decision actually turns on:
 *
 *   SALES CHANNEL      where the customer transacts (store, online grocery, app, collect)
 *   ACTIVATION CHANNEL how the campaign reaches them (in-store media, CRM, paid, social)
 *
 * They are separate because they fail separately: an online-only mechanic reaches nobody
 * through in-store point-of-sale, and a store price cut cannot be personalised through
 * CRM. Collapsing them into one dropdown hides that. Store format (Metro / Standard /
 * Superstore) is deliberately NOT a channel — it is estate segmentation and belongs to
 * CDI-03 micro-markets.
 */

/* ────────────────────────────────────────────────────────────────────────────
   Shared vocabulary
   ──────────────────────────────────────────────────────────────────────────── */

export type DimensionEvidenceBasis = 'CATALOGUE_BACKED' | 'DOMAIN_CONSTANT' | 'DEMO_ASSUMPTION';

export type ResponsivenessClass = 'LOW' | 'MODERATE' | 'HIGH';

export type MarginPosture = 'DILUTIVE' | 'NEUTRAL' | 'ACCRETIVE';

export type ShelfLifeClass = 'SHORT' | 'MEDIUM' | 'LONG';

export type OperationalRiskClass = 'LOW' | 'MODERATE' | 'ELEVATED';

/* ────────────────────────────────────────────────────────────────────────────
   Category — catalogue-backed
   ──────────────────────────────────────────────────────────────────────────── */

export type CampaignCategoryId =
  | 'PRODUCE'
  | 'DAIRY'
  | 'BAKERY'
  | 'CHILLED'
  | 'FROZEN'
  | 'AMBIENT'
  | 'BWS'
  | 'NON_FOOD';

export interface CampaignCategoryDefinition {
  id: CampaignCategoryId;
  /** Label shown to a planner. */
  display_label: string;
  /** The catalogue key in data/products.json — the join back to real SKUs. */
  catalogue_key: string;
  /** What deciding on this category actually means for a campaign. One line. */
  planning_note: string;
  shelf_life_class: ShelfLifeClass;
  /**
   * Promotional price elasticity band. Sourced from the demonstration world model's
   * documented category elasticities (Dairy staple ε≈2.4, premium Bakery ε≈0.8) and held
   * to those bands rather than invented per-category.
   */
  promotional_elasticity: number;
  /** Waste exposure when demand is over-stimulated — drives clearance-objective fit. */
  waste_sensitivity: ResponsivenessClass;
  /**
   * Distinct suppliers actually serving this category, counted through the SKU -> supplier_id
   * join rather than by matching the supplier's own category label. The labels do not share a
   * vocabulary with product categories ('Meat', 'Fish' and 'Pork' all supply Chilled), so a
   * name match undercounts and makes readiness assert single-supplier exposure that the
   * catalogue contradicts. Fewer suppliers = more concentrated risk.
   */
  supplier_count: number;
  /** SKU lines in the catalogue for this category. */
  sku_count: number;
  /** Subcategories present in the catalogue, for scope framing. */
  subcategories: string[];
  /** The constraint most likely to bind a campaign in this category. */
  binding_constraint: string;
  evidence_basis: DimensionEvidenceBasis;
}

/**
 * Counts, subcategories and supplier concentration below are read from the enterprise
 * catalogue (50 SKUs / 20 suppliers). They are asserted against that catalogue by test, so
 * a catalogue change that invalidates this table fails the build rather than drifting.
 */
export const CAMPAIGN_CATEGORIES: CampaignCategoryDefinition[] = [
  {
    id: 'PRODUCE',
    display_label: 'Fresh Produce',
    catalogue_key: 'Produce',
    planning_note: 'Short shelf life makes timing, not depth, the decisive lever.',
    shelf_life_class: 'SHORT',
    promotional_elasticity: 2.2,
    waste_sensitivity: 'HIGH',
    supplier_count: 2,
    sku_count: 8,
    subcategories: ['Berries', 'Fruit', 'Salad', 'Vegetables'],
    binding_constraint: 'Spoilage horizon — surplus demand converts to waste within days.',
    evidence_basis: 'CATALOGUE_BACKED'
  },
  {
    id: 'DAIRY',
    display_label: 'Dairy',
    catalogue_key: 'Dairy',
    planning_note: 'High-frequency staple with competitive price visibility; margin erodes quickly under discount.',
    shelf_life_class: 'MEDIUM',
    promotional_elasticity: 2.4,
    waste_sensitivity: 'MODERATE',
    supplier_count: 3,
    sku_count: 9,
    subcategories: ['Butter', 'Cheese', 'Cream', 'Milk', 'Yoghurt'],
    binding_constraint: 'Unit contribution floor — staple price cuts are matched and rarely recovered.',
    evidence_basis: 'CATALOGUE_BACKED'
  },
  {
    id: 'BAKERY',
    display_label: 'Bakery',
    catalogue_key: 'Bakery',
    planning_note: 'Inelastic and basket-driving; value comes from attachment, not from price depth.',
    shelf_life_class: 'SHORT',
    promotional_elasticity: 0.8,
    waste_sensitivity: 'HIGH',
    supplier_count: 1,
    sku_count: 4,
    subcategories: ['Bread', 'Pastries'],
    binding_constraint: 'Same-day bake economics — discounting dilutes margin without moving volume.',
    evidence_basis: 'CATALOGUE_BACKED'
  },
  {
    id: 'CHILLED',
    display_label: 'Chilled & Ready Meals',
    catalogue_key: 'Chilled',
    planning_note: 'Largest fresh block; availability failures show up as lost trade the same evening.',
    shelf_life_class: 'MEDIUM',
    promotional_elasticity: 1.7,
    waste_sensitivity: 'MODERATE',
    supplier_count: 5,
    sku_count: 10,
    subcategories: ['Beef', 'Fish', 'Pork', 'Poultry', 'Ready Meals', 'Soup'],
    binding_constraint: 'Chilled delivery windows — late arrival removes peak-hour availability.',
    evidence_basis: 'CATALOGUE_BACKED'
  },
  {
    id: 'FROZEN',
    display_label: 'Frozen',
    catalogue_key: 'Frozen',
    planning_note: 'Storable demand — uplift can be pulled forward without waste, but so can cannibalisation.',
    shelf_life_class: 'LONG',
    promotional_elasticity: 1.5,
    waste_sensitivity: 'LOW',
    supplier_count: 1,
    sku_count: 4,
    subcategories: ['Fish', 'Potatoes', 'Poultry', 'Vegetables'],
    binding_constraint: 'Freezer capacity and pantry-loading — volume may be borrowed from later weeks.',
    evidence_basis: 'CATALOGUE_BACKED'
  },
  {
    id: 'AMBIENT',
    display_label: 'Grocery (Ambient)',
    catalogue_key: 'Ambient',
    planning_note: 'Long shelf life and low waste risk; the trade-off is stock-holding, not spoilage.',
    shelf_life_class: 'LONG',
    promotional_elasticity: 1.3,
    waste_sensitivity: 'LOW',
    supplier_count: 3,
    sku_count: 6,
    subcategories: ['Oils', 'Pasta', 'Rice', 'Snacks', 'Tinned'],
    binding_constraint: 'Forward-buying — deep offers shift volume between periods rather than creating it.',
    evidence_basis: 'CATALOGUE_BACKED'
  },
  {
    id: 'BWS',
    display_label: 'Beverages, Beers & Wines',
    catalogue_key: 'BWS',
    planning_note: 'Occasion-led with event peaks; alcohol lines carry promotion restrictions worth checking.',
    shelf_life_class: 'LONG',
    promotional_elasticity: 1.9,
    waste_sensitivity: 'LOW',
    supplier_count: 2,
    sku_count: 5,
    subcategories: ['Beer', 'Juice', 'Soft Drinks', 'Water', 'Wine'],
    binding_constraint: 'Occasion timing and alcohol promotion rules — the window matters more than the depth.',
    evidence_basis: 'CATALOGUE_BACKED'
  },
  {
    id: 'NON_FOOD',
    display_label: 'Household & Non-Food',
    catalogue_key: 'Non-food',
    planning_note: 'Infrequent purchase cycle and long shelf life; stock-holding cost, not spoilage, is the exposure.',
    shelf_life_class: 'LONG',
    promotional_elasticity: 1.1,
    waste_sensitivity: 'LOW',
    supplier_count: 3,
    sku_count: 4,
    subcategories: ['Cleaning', 'Health & Beauty', 'Laundry', 'Paper'],
    binding_constraint: 'Long replenishment cycles — a stock position taken now is held for weeks.',
    evidence_basis: 'CATALOGUE_BACKED'
  }
];

/* ────────────────────────────────────────────────────────────────────────────
   Customer segment — declared planning dimension
   ──────────────────────────────────────────────────────────────────────────── */

export type CampaignSegmentId =
  | 'ALL_CUSTOMERS'
  | 'LOYAL_HIGH_FREQUENCY'
  | 'HIGH_VALUE'
  | 'PRICE_SENSITIVE'
  | 'PROMOTION_RESPONSIVE'
  | 'LAPSED_AT_RISK'
  | 'NEW_CUSTOMERS'
  | 'FAMILIES'
  | 'CONVENIENCE_LED'
  | 'PREMIUM_QUALITY_LED'
  | 'HEALTH_CONSCIOUS';

export interface CampaignSegmentDefinition {
  id: CampaignSegmentId;
  display_label: string;
  /** What targeting this segment commits the campaign to. One line. */
  planning_note: string;
  /** Share of the customer base this segment addresses, 0–1. Deterministic planning assumption. */
  reach_share: number;
  /** How strongly this segment responds to a promotional mechanic. */
  promotional_responsiveness: ResponsivenessClass;
  /** Whether serving this segment tends to add or dilute contribution. */
  margin_posture: MarginPosture;
  /** What must be shown before this segment may be treated as evidence rather than intent. */
  evidence_requirement: string;
  evidence_basis: DimensionEvidenceBasis;
}

/**
 * There is no customer segmentation in this estate's data. Every figure here is a stated
 * planning assumption, and readiness reports it as one — a segment choice is an intent to
 * target, never a measured audience.
 *
 * Digital-first / online-led is intentionally absent: that is a channel, and modelling it
 * as a segment is what makes audience and route-to-customer impossible to reason about
 * separately. Choose Online Grocery or Mobile App on the channel dimension instead.
 */
export const CAMPAIGN_SEGMENTS: CampaignSegmentDefinition[] = [
  {
    id: 'ALL_CUSTOMERS',
    display_label: 'All Customers',
    planning_note: 'No targeting applied — full base reach, no segment-level claim to defend.',
    reach_share: 1.0,
    promotional_responsiveness: 'MODERATE',
    margin_posture: 'NEUTRAL',
    evidence_requirement: 'None — an untargeted campaign makes no audience claim.',
    evidence_basis: 'DOMAIN_CONSTANT'
  },
  {
    id: 'LOYAL_HIGH_FREQUENCY',
    display_label: 'Loyal / High Frequency',
    planning_note: 'Already buying — discount here risks subsidising volume that would arrive anyway.',
    reach_share: 0.22,
    promotional_responsiveness: 'LOW',
    margin_posture: 'DILUTIVE',
    evidence_requirement: 'Purchase-frequency distribution and an incrementality read separating subsidised from incremental volume.',
    evidence_basis: 'DEMO_ASSUMPTION'
  },
  {
    id: 'HIGH_VALUE',
    display_label: 'High Value',
    planning_note: 'Large baskets and low price sensitivity — protect margin rather than buy volume.',
    reach_share: 0.15,
    promotional_responsiveness: 'LOW',
    margin_posture: 'ACCRETIVE',
    evidence_requirement: 'Basket-value distribution and evidence that the cohort is stable rather than seasonal.',
    evidence_basis: 'DEMO_ASSUMPTION'
  },
  {
    id: 'PRICE_SENSITIVE',
    display_label: 'Price Sensitive',
    planning_note: 'Responds to shelf price, not to offers — deep cuts convert but contribution falls with them.',
    reach_share: 0.28,
    promotional_responsiveness: 'HIGH',
    margin_posture: 'DILUTIVE',
    evidence_requirement: 'Price-tier switching behaviour and own-label mix; distinguish from promotion-seeking behaviour.',
    evidence_basis: 'DEMO_ASSUMPTION'
  },
  {
    id: 'PROMOTION_RESPONSIVE',
    display_label: 'Promotion Responsive',
    planning_note: 'Buys the offer rather than the brand — strong uplift, weak retention after the window closes.',
    reach_share: 0.24,
    promotional_responsiveness: 'HIGH',
    margin_posture: 'DILUTIVE',
    evidence_requirement: 'Promotion-participation rate and post-window repeat rate; without the second figure the uplift is unqualified.',
    evidence_basis: 'DEMO_ASSUMPTION'
  },
  {
    id: 'LAPSED_AT_RISK',
    display_label: 'Lapsed / At Risk',
    planning_note: 'Reactivation play — reach is limited and response is slow, so judge it on returning customers, not week-one volume.',
    reach_share: 0.11,
    promotional_responsiveness: 'MODERATE',
    margin_posture: 'DILUTIVE',
    evidence_requirement: 'Lapse definition, contactability of the cohort, and a reactivation baseline to measure against.',
    evidence_basis: 'DEMO_ASSUMPTION'
  },
  {
    id: 'NEW_CUSTOMERS',
    display_label: 'New Customers',
    planning_note: 'Acquisition play — accept first-basket dilution only if repeat behaviour is measured afterwards.',
    reach_share: 0.09,
    promotional_responsiveness: 'MODERATE',
    margin_posture: 'DILUTIVE',
    evidence_requirement: 'First-purchase identification and a second-purchase conversion read.',
    evidence_basis: 'DEMO_ASSUMPTION'
  },
  {
    id: 'FAMILIES',
    display_label: 'Families',
    planning_note: 'Multi-pack and volume-led demand — favours pack size and bundles over headline price cuts.',
    reach_share: 0.31,
    promotional_responsiveness: 'MODERATE',
    margin_posture: 'NEUTRAL',
    evidence_requirement: 'Household composition or a defensible basket-composition proxy.',
    evidence_basis: 'DEMO_ASSUMPTION'
  },
  {
    id: 'CONVENIENCE_LED',
    display_label: 'Convenience-Led',
    planning_note: 'Buys on proximity and speed — availability beats price, so stock position is the campaign.',
    reach_share: 0.18,
    promotional_responsiveness: 'LOW',
    margin_posture: 'ACCRETIVE',
    evidence_requirement: 'Mission or trip-type classification; store format alone is not a customer segment.',
    evidence_basis: 'DEMO_ASSUMPTION'
  },
  {
    id: 'PREMIUM_QUALITY_LED',
    display_label: 'Premium / Quality-Led',
    planning_note: 'Trades up on provenance and quality — discounting signals the opposite of what they buy for.',
    reach_share: 0.13,
    promotional_responsiveness: 'LOW',
    margin_posture: 'ACCRETIVE',
    evidence_requirement: 'Premium-tier mix and evidence the cohort is not simply the high-value cohort renamed.',
    evidence_basis: 'DEMO_ASSUMPTION'
  },
  {
    id: 'HEALTH_CONSCIOUS',
    display_label: 'Health-Conscious',
    planning_note: 'Attribute-led demand — the claim on pack does more work than the price on shelf.',
    reach_share: 0.16,
    promotional_responsiveness: 'MODERATE',
    margin_posture: 'NEUTRAL',
    evidence_requirement: 'Product-attribute purchase affinity; an inferred health intent is an assumption, not a segment.',
    evidence_basis: 'DEMO_ASSUMPTION'
  }
];

/* ────────────────────────────────────────────────────────────────────────────
   Sales channel — where the customer transacts
   ──────────────────────────────────────────────────────────────────────────── */

export type CampaignChannelId =
  | 'ALL_CHANNELS'
  | 'STORE'
  | 'ONLINE_GROCERY'
  | 'CLICK_AND_COLLECT'
  | 'MOBILE_APP';

export interface CampaignChannelDefinition {
  id: CampaignChannelId;
  display_label: string;
  /** What routing the campaign through this channel commits to operationally. One line. */
  planning_note: string;
  /** Share of trade reachable through this channel, 0–1. Deterministic planning assumption. */
  reach_share: number;
  /** Working days needed to put a change live in this channel. */
  execution_lead_time_days: number;
  operational_risk_class: OperationalRiskClass;
  /** Whether the channel can carry a personalised, customer-level price or offer. */
  supports_personalisation: boolean;
  /** The failure mode this channel is most exposed to. */
  primary_execution_risk: string;
  /** Activation channels that actually reach a customer transacting here. */
  compatible_activations: CampaignActivationChannelId[];
  evidence_basis: DimensionEvidenceBasis;
}

/* ────────────────────────────────────────────────────────────────────────────
   Activation channel — how the campaign reaches the customer
   ──────────────────────────────────────────────────────────────────────────── */

export type CampaignActivationChannelId =
  | 'IN_STORE_MEDIA'
  | 'EMAIL_CRM'
  | 'LOYALTY_PERSONALISED'
  | 'PAID_DIGITAL'
  | 'SOCIAL'
  | 'RETAIL_MEDIA';

export interface CampaignActivationDefinition {
  id: CampaignActivationChannelId;
  display_label: string;
  planning_note: string;
  execution_lead_time_days: number;
  /** Whether the activation can address a named customer rather than a broad audience. */
  addressable: boolean;
  evidence_basis: DimensionEvidenceBasis;
}

export const CAMPAIGN_ACTIVATIONS: CampaignActivationDefinition[] = [
  {
    id: 'IN_STORE_MEDIA',
    display_label: 'In-Store Media',
    planning_note: 'Point-of-sale and shelf edge — reaches the shopper already in the aisle, nobody else.',
    execution_lead_time_days: 10,
    addressable: false,
    evidence_basis: 'DOMAIN_CONSTANT'
  },
  {
    id: 'EMAIL_CRM',
    display_label: 'Email / CRM',
    planning_note: 'Known customers only — reach is capped by contactable base, not by budget.',
    execution_lead_time_days: 3,
    addressable: true,
    evidence_basis: 'DOMAIN_CONSTANT'
  },
  {
    id: 'LOYALTY_PERSONALISED',
    display_label: 'Loyalty / Personalised Offers',
    planning_note: 'Offer targeted to the individual — the only route that limits a discount to the intended segment.',
    execution_lead_time_days: 4,
    addressable: true,
    evidence_basis: 'DOMAIN_CONSTANT'
  },
  {
    id: 'PAID_DIGITAL',
    display_label: 'Paid Digital',
    planning_note: 'Buys reach beyond the existing base; attribution back to store trade stays weak.',
    execution_lead_time_days: 5,
    addressable: false,
    evidence_basis: 'DOMAIN_CONSTANT'
  },
  {
    id: 'SOCIAL',
    display_label: 'Social',
    planning_note: 'Broad awareness with low control over who converts — treat uplift claims cautiously.',
    execution_lead_time_days: 4,
    addressable: false,
    evidence_basis: 'DOMAIN_CONSTANT'
  },
  {
    id: 'RETAIL_MEDIA',
    display_label: 'Retail Media / Sponsored Placement',
    planning_note: 'On-site sponsored placement — supplier-funded, so it changes who bears the promotional cost.',
    execution_lead_time_days: 6,
    addressable: false,
    evidence_basis: 'DOMAIN_CONSTANT'
  }
];

export const CAMPAIGN_CHANNELS: CampaignChannelDefinition[] = [
  {
    id: 'ALL_CHANNELS',
    display_label: 'All Channels',
    planning_note: 'No channel constraint — widest reach, and every channel-specific risk applies at once.',
    reach_share: 1.0,
    execution_lead_time_days: 10,
    operational_risk_class: 'MODERATE',
    supports_personalisation: false,
    primary_execution_risk: 'Every channel must be ready simultaneously; the slowest one sets the launch date.',
    compatible_activations: [
      'IN_STORE_MEDIA',
      'EMAIL_CRM',
      'LOYALTY_PERSONALISED',
      'PAID_DIGITAL',
      'SOCIAL',
      'RETAIL_MEDIA'
    ],
    evidence_basis: 'DOMAIN_CONSTANT'
  },
  {
    id: 'STORE',
    display_label: 'Store',
    planning_note: 'Majority of trade, longest lead time — shelf-edge price changes cannot be targeted or withdrawn quickly.',
    reach_share: 0.72,
    execution_lead_time_days: 10,
    operational_risk_class: 'ELEVATED',
    supports_personalisation: false,
    primary_execution_risk: 'Point-of-sale and shelf-edge repricing across the estate; a mistake is visible to every shopper.',
    compatible_activations: ['IN_STORE_MEDIA', 'EMAIL_CRM', 'LOYALTY_PERSONALISED', 'PAID_DIGITAL', 'SOCIAL'],
    evidence_basis: 'DEMO_ASSUMPTION'
  },
  {
    id: 'ONLINE_GROCERY',
    display_label: 'Online Grocery',
    planning_note: 'Fast to change and fully measurable, but reach is a fraction of store and picking capacity binds.',
    reach_share: 0.16,
    execution_lead_time_days: 3,
    operational_risk_class: 'MODERATE',
    supports_personalisation: true,
    primary_execution_risk: 'Pick-and-deliver slot capacity — demand uplift converts to unfulfilled orders, not sales.',
    compatible_activations: ['EMAIL_CRM', 'LOYALTY_PERSONALISED', 'PAID_DIGITAL', 'SOCIAL', 'RETAIL_MEDIA'],
    evidence_basis: 'DEMO_ASSUMPTION'
  },
  {
    id: 'CLICK_AND_COLLECT',
    display_label: 'Click & Collect',
    planning_note: 'Online basket fulfilled from store stock — inherits store availability risk without store lead time.',
    reach_share: 0.07,
    execution_lead_time_days: 4,
    operational_risk_class: 'MODERATE',
    supports_personalisation: true,
    primary_execution_risk: 'Collection slot and in-store pick capacity compete with shop-floor availability.',
    compatible_activations: ['EMAIL_CRM', 'LOYALTY_PERSONALISED', 'PAID_DIGITAL', 'RETAIL_MEDIA'],
    evidence_basis: 'DEMO_ASSUMPTION'
  },
  {
    id: 'MOBILE_APP',
    display_label: 'Mobile App',
    planning_note: 'Smallest reach, fastest to change, and the only route that can withdraw an offer the same day.',
    reach_share: 0.09,
    execution_lead_time_days: 2,
    operational_risk_class: 'LOW',
    supports_personalisation: true,
    primary_execution_risk: 'Reach is capped by app-active customers; an uplift claim here does not generalise to the estate.',
    compatible_activations: ['EMAIL_CRM', 'LOYALTY_PERSONALISED', 'PAID_DIGITAL', 'SOCIAL'],
    evidence_basis: 'DEMO_ASSUMPTION'
  }
];

/* ────────────────────────────────────────────────────────────────────────────
   Lookup helpers
   ──────────────────────────────────────────────────────────────────────────── */

const CATEGORY_BY_ID = new Map(CAMPAIGN_CATEGORIES.map(c => [c.id, c]));
const SEGMENT_BY_ID = new Map(CAMPAIGN_SEGMENTS.map(s => [s.id, s]));
const CHANNEL_BY_ID = new Map(CAMPAIGN_CHANNELS.map(c => [c.id, c]));
const ACTIVATION_BY_ID = new Map(CAMPAIGN_ACTIVATIONS.map(a => [a.id, a]));

function normaliseToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/**
 * Resolve a stored value to its definition.
 *
 * Intents persisted before this taxonomy existed hold prose ("Fresh Dairy", "Omnichannel"),
 * and a planner may still type one. Matching on the id, the display label and the catalogue
 * key means an older record keeps resolving to the dimension it meant instead of silently
 * losing its binding — but nothing is guessed: an unrecognised value returns null and is
 * treated as an unclassified free-text declaration, never as a taxonomy member.
 */
export function resolveCategory(value?: string | null): CampaignCategoryDefinition | null {
  if (!value) return null;
  const direct = CATEGORY_BY_ID.get(value as CampaignCategoryId);
  if (direct) return direct;
  const token = normaliseToken(value);
  return (
    CAMPAIGN_CATEGORIES.find(
      c =>
        normaliseToken(c.id) === token ||
        normaliseToken(c.display_label) === token ||
        normaliseToken(c.catalogue_key) === token
    ) || null
  );
}

export function resolveSegment(value?: string | null): CampaignSegmentDefinition | null {
  if (!value) return null;
  const direct = SEGMENT_BY_ID.get(value as CampaignSegmentId);
  if (direct) return direct;
  const token = normaliseToken(value);
  return (
    CAMPAIGN_SEGMENTS.find(
      s => normaliseToken(s.id) === token || normaliseToken(s.display_label) === token
    ) || null
  );
}

export function resolveChannel(value?: string | null): CampaignChannelDefinition | null {
  if (!value) return null;
  const direct = CHANNEL_BY_ID.get(value as CampaignChannelId);
  if (direct) return direct;
  const token = normaliseToken(value);
  return (
    CAMPAIGN_CHANNELS.find(
      c => normaliseToken(c.id) === token || normaliseToken(c.display_label) === token
    ) || null
  );
}

export function resolveActivation(value?: string | null): CampaignActivationDefinition | null {
  if (!value) return null;
  const direct = ACTIVATION_BY_ID.get(value as CampaignActivationChannelId);
  if (direct) return direct;
  const token = normaliseToken(value);
  return (
    CAMPAIGN_ACTIVATIONS.find(
      a => normaliseToken(a.id) === token || normaliseToken(a.display_label) === token
    ) || null
  );
}

/** Display label for any stored value, falling back to the raw text for free-text declarations. */
export function categoryLabel(value?: string | null): string {
  return resolveCategory(value)?.display_label || value || '—';
}

/**
 * An absent audience means the same thing as an explicit "All Customers", so both must
 * render as the same string. Falling back to differently-cased prose made the comparison
 * surface report a focal difference between two decisions that targeted identically.
 */
export function segmentLabel(value?: string | null): string {
  return (
    resolveSegment(value)?.display_label ||
    value ||
    resolveSegment('ALL_CUSTOMERS')!.display_label
  );
}

/** An absent sales channel means the same thing as an explicit "All Channels". */
export function channelLabel(value?: string | null): string {
  return (
    resolveChannel(value)?.display_label ||
    value ||
    resolveChannel('ALL_CHANNELS')!.display_label
  );
}

export function activationLabel(value?: string | null): string {
  return resolveActivation(value)?.display_label || value || '—';
}

/* ────────────────────────────────────────────────────────────────────────────
   Derived planning quantities
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Addressable reach as a share of total trade, 0–1.
 *
 * Segment share and channel share are treated as independent, which is a simplification a
 * real estate would replace with an observed cross-tabulation. Stated here so nobody reads
 * the product as a measurement.
 */
export function addressableReachShare(segment?: string | null, channel?: string | null): number {
  const s = resolveSegment(segment)?.reach_share ?? 1.0;
  const c = resolveChannel(channel)?.reach_share ?? 1.0;
  return Number((s * c).toFixed(4));
}

/**
 * Whether an activation can actually reach a customer transacting in the chosen channel.
 * Used to surface incoherent combinations rather than silently costing them.
 */
export function isActivationCompatible(
  channel: string | null | undefined,
  activation: string | null | undefined
): boolean {
  const ch = resolveChannel(channel);
  const act = resolveActivation(activation);
  if (!ch || !act) return true; // unclassified values make no compatibility claim
  return ch.compatible_activations.includes(act.id);
}

/** Working days before the slowest selected route can go live. */
export function executionLeadTimeDays(channel?: string | null, activations?: string[] | null): number {
  const channelDays = resolveChannel(channel)?.execution_lead_time_days ?? 10;
  const activationDays = (activations || [])
    .map(a => resolveActivation(a)?.execution_lead_time_days)
    .filter((d): d is number => typeof d === 'number');
  return Math.max(channelDays, ...(activationDays.length > 0 ? activationDays : [0]));
}

/**
 * Whether a discount routed through this combination can be confined to the targeted segment.
 *
 * A targeted segment on a channel that cannot personalise means the discount is available to
 * everyone — the classic subsidy leak. Naming it is the point.
 */
export interface SubsidyConfinement {
  /** True when the planner has claimed a cohort narrower than the whole base. */
  targeting_claimed: boolean;
  /** True when that claim can actually be held — the offer reaches the cohort and nobody else. */
  confinable: boolean;
  /**
   * Share of volume the discount is paid on, 0–1. A claim that cannot be confined is paid
   * across the whole base, so this is 1 whenever `targeting_claimed && !confinable`.
   */
  reached_share: number;
  /** Plain-language reason, suitable for a readiness finding or a canvas note. */
  reason: string;
}

/**
 * Whether a promotional discount can be held to the cohort it is aimed at — and what share
 * of volume it is therefore paid on.
 *
 * This is the single predicate behind three surfaces that must never disagree: the causal
 * economics (how much margin the depth actually costs), the readiness subsidy-leak
 * constraint, and the canvas remediation note. When they were computed separately, adding a
 * personalised activation cleared the constraint and removed the warning while the engine
 * still charged full-base erosion — the system told the planner a leak was closed while
 * continuing to price it as open.
 *
 * A cohort stated as free text is treated as claimed but not confinable: the estate cannot
 * resolve who is in it, so it cannot keep anyone else out of the offer.
 */
export function evaluateSubsidyConfinement(
  segment?: string | null,
  channel?: string | null,
  activations?: string[] | null
): SubsidyConfinement {
  const seg = resolveSegment(segment);
  const statedButUnresolved = !seg && !!(segment && segment.trim());

  if (!seg && !statedButUnresolved) {
    return {
      targeting_claimed: false,
      confinable: true,
      reached_share: 1,
      reason: 'No cohort targeting stated, so the offer is intended for the whole base.'
    };
  }
  if (seg && seg.id === 'ALL_CUSTOMERS') {
    return {
      targeting_claimed: false,
      confinable: true,
      reached_share: 1,
      reason: 'Targeted at all customers, so there is no narrower cohort to confine the offer to.'
    };
  }
  if (statedButUnresolved) {
    return {
      targeting_claimed: true,
      confinable: false,
      reached_share: 1,
      reason:
        'The audience is stated as free text, so the estate cannot resolve who is in it and cannot keep the offer from anyone else. The discount is paid across the whole base.'
    };
  }

  const ch = resolveChannel(channel);
  const addressableActivation = (activations || []).find(
    a => resolveActivation(a)?.addressable === true
  );
  const addressableActivationLabel = addressableActivation
    ? resolveActivation(addressableActivation)!.display_label
    : null;

  if (ch?.supports_personalisation) {
    return {
      targeting_claimed: true,
      confinable: true,
      reached_share: seg!.reach_share,
      reason: `${ch.display_label} can address an individual customer, so the offer reaches ${seg!.display_label} and the discount is paid on their share of volume only.`
    };
  }
  if (addressableActivationLabel) {
    return {
      targeting_claimed: true,
      confinable: true,
      reached_share: seg!.reach_share,
      reason: `${addressableActivationLabel} addresses a named customer, so the offer reaches ${seg!.display_label} even though ${ch?.display_label || 'the sales channel'} cannot target on its own.`
    };
  }
  return {
    targeting_claimed: true,
    confinable: false,
    reached_share: 1,
    reason: `${seg!.display_label} is targeted, but ${ch?.display_label || 'the stated channel'} cannot address an individual and no addressable activation is selected, so the discount is paid across the whole base.`
  };
}

/**
 * Convenience over `evaluateSubsidyConfinement` for callers that only need the boolean.
 * An untargeted campaign has nothing to confine and is therefore not a leak.
 */
export function discountIsConfinableToSegment(
  segment?: string | null,
  channel?: string | null,
  activations?: string[] | null
): boolean {
  const c = evaluateSubsidyConfinement(segment, channel, activations);
  return !c.targeting_claimed || c.confinable;
}

/**
 * The evidence strength a readiness finding may claim for a figure of this basis.
 *
 * Readiness cited every taxonomy-derived figure as `DECLARED_INPUT` because the planner had
 * declared the dimension. What the planner declared is the channel; the lead time attached to
 * it is a demonstration assumption, and reporting the two at the same strength presented a
 * planning assumption as a stated fact. Each finding can now cite the dimension the planner
 * chose and the figure it rests on at their own strengths.
 */
export function evidenceStrengthForBasis(
  basis: DimensionEvidenceBasis
): 'DERIVED' | 'SEEDED_ASSUMPTION' {
  return basis === 'DEMO_ASSUMPTION' ? 'SEEDED_ASSUMPTION' : 'DERIVED';
}

export const CAMPAIGN_CATEGORY_IDS: CampaignCategoryId[] = CAMPAIGN_CATEGORIES.map(c => c.id);
export const CAMPAIGN_SEGMENT_IDS: CampaignSegmentId[] = CAMPAIGN_SEGMENTS.map(s => s.id);
export const CAMPAIGN_CHANNEL_IDS: CampaignChannelId[] = CAMPAIGN_CHANNELS.map(c => c.id);
export const CAMPAIGN_ACTIVATION_IDS: CampaignActivationChannelId[] = CAMPAIGN_ACTIVATIONS.map(a => a.id);
