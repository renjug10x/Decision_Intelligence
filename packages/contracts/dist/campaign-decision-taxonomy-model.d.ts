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
export type DimensionEvidenceBasis = 'CATALOGUE_BACKED' | 'DOMAIN_CONSTANT' | 'DEMO_ASSUMPTION';
export type ResponsivenessClass = 'LOW' | 'MODERATE' | 'HIGH';
export type MarginPosture = 'DILUTIVE' | 'NEUTRAL' | 'ACCRETIVE';
export type ShelfLifeClass = 'SHORT' | 'MEDIUM' | 'LONG';
export type OperationalRiskClass = 'LOW' | 'MODERATE' | 'ELEVATED';
export type CampaignCategoryId = 'PRODUCE' | 'DAIRY' | 'BAKERY' | 'CHILLED' | 'FROZEN' | 'AMBIENT' | 'BWS' | 'NON_FOOD';
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
export declare const CAMPAIGN_CATEGORIES: CampaignCategoryDefinition[];
export type CampaignSegmentId = 'ALL_CUSTOMERS' | 'LOYAL_HIGH_FREQUENCY' | 'HIGH_VALUE' | 'PRICE_SENSITIVE' | 'PROMOTION_RESPONSIVE' | 'LAPSED_AT_RISK' | 'NEW_CUSTOMERS' | 'FAMILIES' | 'CONVENIENCE_LED' | 'PREMIUM_QUALITY_LED' | 'HEALTH_CONSCIOUS';
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
export declare const CAMPAIGN_SEGMENTS: CampaignSegmentDefinition[];
export type CampaignChannelId = 'ALL_CHANNELS' | 'STORE' | 'ONLINE_GROCERY' | 'CLICK_AND_COLLECT' | 'MOBILE_APP';
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
export type CampaignActivationChannelId = 'IN_STORE_MEDIA' | 'EMAIL_CRM' | 'LOYALTY_PERSONALISED' | 'PAID_DIGITAL' | 'SOCIAL' | 'RETAIL_MEDIA';
export interface CampaignActivationDefinition {
    id: CampaignActivationChannelId;
    display_label: string;
    planning_note: string;
    execution_lead_time_days: number;
    /** Whether the activation can address a named customer rather than a broad audience. */
    addressable: boolean;
    evidence_basis: DimensionEvidenceBasis;
}
export declare const CAMPAIGN_ACTIVATIONS: CampaignActivationDefinition[];
export declare const CAMPAIGN_CHANNELS: CampaignChannelDefinition[];
/**
 * Resolve a stored value to its definition.
 *
 * Intents persisted before this taxonomy existed hold prose ("Fresh Dairy", "Omnichannel"),
 * and a planner may still type one. Matching on the id, the display label and the catalogue
 * key means an older record keeps resolving to the dimension it meant instead of silently
 * losing its binding — but nothing is guessed: an unrecognised value returns null and is
 * treated as an unclassified free-text declaration, never as a taxonomy member.
 */
export declare function resolveCategory(value?: string | null): CampaignCategoryDefinition | null;
export declare function resolveSegment(value?: string | null): CampaignSegmentDefinition | null;
export declare function resolveChannel(value?: string | null): CampaignChannelDefinition | null;
export declare function resolveActivation(value?: string | null): CampaignActivationDefinition | null;
/** Display label for any stored value, falling back to the raw text for free-text declarations. */
export declare function categoryLabel(value?: string | null): string;
/**
 * An absent audience means the same thing as an explicit "All Customers", so both must
 * render as the same string. Falling back to differently-cased prose made the comparison
 * surface report a focal difference between two decisions that targeted identically.
 */
export declare function segmentLabel(value?: string | null): string;
/** An absent sales channel means the same thing as an explicit "All Channels". */
export declare function channelLabel(value?: string | null): string;
export declare function activationLabel(value?: string | null): string;
/**
 * Addressable reach as a share of total trade, 0–1.
 *
 * Segment share and channel share are treated as independent, which is a simplification a
 * real estate would replace with an observed cross-tabulation. Stated here so nobody reads
 * the product as a measurement.
 */
export declare function addressableReachShare(segment?: string | null, channel?: string | null): number;
/**
 * Whether an activation can actually reach a customer transacting in the chosen channel.
 * Used to surface incoherent combinations rather than silently costing them.
 */
export declare function isActivationCompatible(channel: string | null | undefined, activation: string | null | undefined): boolean;
/** Working days before the slowest selected route can go live. */
export declare function executionLeadTimeDays(channel?: string | null, activations?: string[] | null): number;
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
export declare function evaluateSubsidyConfinement(segment?: string | null, channel?: string | null, activations?: string[] | null): SubsidyConfinement;
/**
 * Convenience over `evaluateSubsidyConfinement` for callers that only need the boolean.
 * An untargeted campaign has nothing to confine and is therefore not a leak.
 */
export declare function discountIsConfinableToSegment(segment?: string | null, channel?: string | null, activations?: string[] | null): boolean;
export declare const CAMPAIGN_CATEGORY_IDS: CampaignCategoryId[];
export declare const CAMPAIGN_SEGMENT_IDS: CampaignSegmentId[];
export declare const CAMPAIGN_CHANNEL_IDS: CampaignChannelId[];
export declare const CAMPAIGN_ACTIVATION_IDS: CampaignActivationChannelId[];
