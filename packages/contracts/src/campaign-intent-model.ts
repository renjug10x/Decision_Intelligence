/**
 * CogniX Campaign Decision Intelligence — Campaign Intent Model (CDI-01)
 * Transport-neutral 4-area progressive input contract consumed by CDI-02–CDI-07B.
 *
 * Areas:
 *  1. Campaign Intent
 *  2. Baseline & Objective
 *  3. Audience & Market
 *  4. Decision Context
 *
 * CDI-01 captures intent and constraints only. It does NOT embed counterfactual,
 * causal, readiness, timeline, frontier, half-life, or closed-loop intelligence.
 */

import { CommercialIntent } from './commercial-intent-model';

export type CampaignObjectiveType =
  | 'INVENTORY_CLEARANCE'
  | 'REVENUE_ACCELERATION'
  | 'MARKET_DEFENSE'
  | 'LAUNCH'
  | 'OTHER';

/**
 * Promotion is one possible intervention — never assumed to be the answer.
 */
export type InterventionPosture =
  | 'UNDECIDED'
  | 'CONSIDER_PROMOTION'
  | 'CONSIDER_NON_PROMOTION'
  | 'CONSIDER_DO_NOTHING';

export type PrimaryObjectiveMetric =
  | 'VOLUME'
  | 'REVENUE'
  | 'CONTRIBUTION'
  | 'WASTE_REDUCTION'
  | 'AVAILABILITY';

export type TimingMode = 'KNOWN_DATES' | 'FIND_BEST_WINDOW';

export type CampaignCanvasArea =
  | 'CAMPAIGN_INTENT'
  | 'BASELINE_OBJECTIVE'
  | 'AUDIENCE_MARKET'
  | 'DECISION_CONTEXT';

export type CampaignIntentStatus = 'DRAFT' | 'REGISTERED';

/** Area 1 — What are we considering? */
export interface CampaignIntentCore {
  objective_type: CampaignObjectiveType;
  intervention_posture: InterventionPosture;
  /** Short framing hypothesis / decision question */
  framing_question: string;
  category: string;
  sku_scope: string[];
  /** Optional provisional mechanic — only meaningful when posture considers promotion */
  provisional_mechanic?: string;
  provisional_discount_depth?: number;
}

/** Area 2 — Baseline & objective constraints (structure only; no counterfactual math). */
export interface BaselineObjective {
  primary_metric: PrimaryObjectiveMetric;
  target_direction: 'INCREASE' | 'DECREASE' | 'PROTECT' | 'CLEAR';
  target_value?: number;
  target_unit?: string;
  /** Soft constraint notes — not scored readiness */
  volume_note?: string;
  revenue_note?: string;
  cost_note?: string;
  capacity_cap_note?: string;
}

/** Area 3 — Audience & market scope (no micro-market scoring). */
export interface AudienceMarket {
  region: string;
  customer_segment?: string;
  channel?: string;
  store_cohort_hint?: string;
  timing_mode: TimingMode;
  planned_start?: string;
  planned_end?: string;
}

/**
 * Area 4 — Decision context structure.
 * Contextual factors are optional notes — not mandatory toggle grids.
 * Material relevance is determined by later CDI intelligence packages.
 */
export interface DecisionContextArea {
  contextual_factor_notes?: string[];
  open_questions?: string[];
  assumptions?: string[];
  commercial_intent_ref?: string;
  decision_state_id?: string;
  scenario_id?: string;
  scenario_family?: string;
}

export interface CampaignCanvasProgress {
  active_area: CampaignCanvasArea;
  completed_areas: CampaignCanvasArea[];
  /** True when all four areas have passed structural validation for registration */
  ready_to_register: boolean;
}

export interface CampaignIntent {
  campaign_intent_id: string;           // cdi_intent_<id>
  tenant_id: string;
  session_id: string;
  domain_id?: string;
  status: CampaignIntentStatus;
  campaign_intent: CampaignIntentCore;
  baseline_objective: BaselineObjective;
  audience_market: AudienceMarket;
  decision_context: DecisionContextArea;
  canvas_progress: CampaignCanvasProgress;
  created_at: string;
  updated_at: string;
  registered_at?: string;
  source_system: string;
  provenance: Record<string, string>;
  synthetic_demo: boolean;
  schema_version: string;               // "1.0"
}

export const CAMPAIGN_CANVAS_AREA_ORDER: CampaignCanvasArea[] = [
  'CAMPAIGN_INTENT',
  'BASELINE_OBJECTIVE',
  'AUDIENCE_MARKET',
  'DECISION_CONTEXT'
];

/**
 * Sanitising tenant/session into an id is lossy: ('acme_eu','north') and ('acme','eu_north')
 * would otherwise produce the same id and collide across tenants. A short deterministic
 * digest of the exact, unsanitised pair keeps the id readable, stable and collision-free.
 */
function campaignIntentKeyDigest(tenantId: string, sessionId: string): string {
  const raw = `${tenantId}::${sessionId}`;
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash * 33) ^ raw.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

export function buildCampaignIntentId(tenantId: string, sessionId: string): string {
  const readable = `cdi_intent_draft_${tenantId}_${sessionId}`.replace(/[^a-zA-Z0-9_]/g, '_');
  return `${readable}_${campaignIntentKeyDigest(tenantId, sessionId)}`;
}

export function createDefaultCampaignIntentDraft(
  tenantId: string,
  sessionId: string,
  options?: { domain_id?: string; scenario_id?: string }
): CampaignIntent {
  const now = new Date().toISOString();
  return {
    campaign_intent_id: buildCampaignIntentId(tenantId, sessionId),
    tenant_id: tenantId,
    session_id: sessionId,
    domain_id: options?.domain_id || 'retail_grocery',
    status: 'DRAFT',
    campaign_intent: {
      objective_type: 'REVENUE_ACCELERATION',
      intervention_posture: 'UNDECIDED',
      framing_question: 'Should we intervene on Fresh Dairy in the North West — and is promotion even the right lever?',
      category: 'Fresh Dairy',
      sku_scope: ['P004'],
      provisional_mechanic: undefined,
      provisional_discount_depth: undefined
    },
    baseline_objective: {
      primary_metric: 'CONTRIBUTION',
      target_direction: 'INCREASE',
      target_value: undefined,
      target_unit: 'gbp',
      volume_note: undefined,
      revenue_note: undefined,
      cost_note: undefined,
      capacity_cap_note: 'Supplier capacity headroom remains a binding constraint to validate later.'
    },
    audience_market: {
      region: 'North West',
      customer_segment: 'Family Shoppers',
      channel: 'Omnichannel',
      store_cohort_hint: undefined,
      timing_mode: 'FIND_BEST_WINDOW',
      planned_start: undefined,
      planned_end: undefined
    },
    decision_context: {
      contextual_factor_notes: [],
      open_questions: [
        'Does intervention create more value than doing nothing?',
        'Is a non-promotion lever (stock reallocation, assortment) preferable?'
      ],
      assumptions: ['Synthetic demo baseline — not a production forecast commitment'],
      commercial_intent_ref: undefined,
      decision_state_id: undefined,
      scenario_id: options?.scenario_id || 'SCN-PROMO-01',
      scenario_family: 'promotion_surge'
    },
    canvas_progress: {
      active_area: 'CAMPAIGN_INTENT',
      completed_areas: [],
      ready_to_register: false
    },
    created_at: now,
    updated_at: now,
    source_system: 'cognix_campaign_decision_canvas',
    provenance: {
      generator: 'cdi01_default_draft',
      package: 'CDI-01'
    },
    synthetic_demo: true,
    schema_version: '1.0'
  };
}

export function validateCampaignIntentCore(core: Partial<CampaignIntentCore>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!core.objective_type) errors.push('campaign_intent.objective_type is required');
  if (!core.intervention_posture) errors.push('campaign_intent.intervention_posture is required');
  if (!core.framing_question) errors.push('campaign_intent.framing_question is required');
  if (!core.category) errors.push('campaign_intent.category is required');
  if (!Array.isArray(core.sku_scope) || core.sku_scope.length === 0) {
    errors.push('campaign_intent.sku_scope must be a non-empty array');
  }
  if (
    core.intervention_posture === 'CONSIDER_PROMOTION' &&
    typeof core.provisional_discount_depth === 'number' &&
    core.provisional_discount_depth < 0
  ) {
    errors.push('campaign_intent.provisional_discount_depth must be non-negative when provided');
  }
  return { valid: errors.length === 0, errors };
}

export function validateBaselineObjective(area: Partial<BaselineObjective>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!area.primary_metric) errors.push('baseline_objective.primary_metric is required');
  if (!area.target_direction) errors.push('baseline_objective.target_direction is required');
  return { valid: errors.length === 0, errors };
}

export function validateAudienceMarket(area: Partial<AudienceMarket>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!area.region) errors.push('audience_market.region is required');
  if (!area.timing_mode) errors.push('audience_market.timing_mode is required');
  if (area.timing_mode === 'KNOWN_DATES') {
    if (!area.planned_start) errors.push('audience_market.planned_start is required when timing_mode is KNOWN_DATES');
    if (!area.planned_end) errors.push('audience_market.planned_end is required when timing_mode is KNOWN_DATES');
    if (area.planned_start && area.planned_end && new Date(area.planned_start) > new Date(area.planned_end)) {
      errors.push('audience_market.planned_start must precede or equal planned_end');
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateDecisionContextArea(area: Partial<DecisionContextArea>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  // Decision context is intentionally sparse — no mandatory contextual toggles
  if (area.contextual_factor_notes && !Array.isArray(area.contextual_factor_notes)) {
    errors.push('decision_context.contextual_factor_notes must be an array when provided');
  }
  return { valid: errors.length === 0, errors };
}

export function evaluateCanvasAreaCompletion(intent: CampaignIntent): CampaignCanvasArea[] {
  const completed: CampaignCanvasArea[] = [];
  if (validateCampaignIntentCore(intent.campaign_intent).valid) completed.push('CAMPAIGN_INTENT');
  if (validateBaselineObjective(intent.baseline_objective).valid) completed.push('BASELINE_OBJECTIVE');
  if (validateAudienceMarket(intent.audience_market).valid) completed.push('AUDIENCE_MARKET');
  if (validateDecisionContextArea(intent.decision_context).valid) completed.push('DECISION_CONTEXT');
  return completed;
}

export function deriveCanvasProgress(intent: CampaignIntent): CampaignCanvasProgress {
  const completed = evaluateCanvasAreaCompletion(intent);
  const ready = CAMPAIGN_CANVAS_AREA_ORDER.every(a => completed.includes(a));
  const firstIncomplete = CAMPAIGN_CANVAS_AREA_ORDER.find(a => !completed.includes(a));
  return {
    active_area: intent.canvas_progress?.active_area || firstIncomplete || 'DECISION_CONTEXT',
    completed_areas: completed,
    ready_to_register: ready
  };
}

export function validateCampaignIntent(
  intent: Partial<CampaignIntent>,
  options?: { requireRegistered?: boolean }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!intent.campaign_intent_id) errors.push('Missing required field: campaign_intent_id');
  if (!intent.tenant_id) errors.push('Missing required field: tenant_id');
  if (!intent.session_id) errors.push('Missing required field: session_id');
  if (!intent.status) errors.push('Missing required field: status');
  if (!intent.schema_version) errors.push('Missing required field: schema_version');
  if (typeof intent.synthetic_demo !== 'boolean') errors.push('Missing required field: synthetic_demo');
  if (!intent.source_system) errors.push('Missing required field: source_system');

  if (intent.campaign_intent) {
    errors.push(...validateCampaignIntentCore(intent.campaign_intent).errors);
  } else {
    errors.push('Missing required field: campaign_intent');
  }

  if (intent.baseline_objective) {
    errors.push(...validateBaselineObjective(intent.baseline_objective).errors);
  } else {
    errors.push('Missing required field: baseline_objective');
  }

  if (intent.audience_market) {
    errors.push(...validateAudienceMarket(intent.audience_market).errors);
  } else {
    errors.push('Missing required field: audience_market');
  }

  if (intent.decision_context) {
    errors.push(...validateDecisionContextArea(intent.decision_context).errors);
  } else {
    errors.push('Missing required field: decision_context');
  }

  if (options?.requireRegistered && intent.status !== 'REGISTERED') {
    errors.push('CampaignIntent must have status REGISTERED');
  }

  if (intent.status === 'REGISTERED') {
    const progress = intent as CampaignIntent;
    const derived = intent.campaign_intent && intent.baseline_objective && intent.audience_market && intent.decision_context
      ? deriveCanvasProgress(progress as CampaignIntent)
      : { ready_to_register: false };
    if (!derived.ready_to_register) {
      errors.push('Cannot register CampaignIntent until all four canvas areas are structurally complete');
    }
  }

  const str = JSON.stringify(intent);
  if (/AIzaSy[A-Za-z0-9_-]{33}/.test(str) || /"password"\s*:\s*"[^"]+"/.test(str)) {
    errors.push('Security violation: CampaignIntent payload contains sensitive credentials');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Additive projection into IFI-01 CommercialIntent when the canvas considers promotion.
 * Non-promotion / do-nothing postures do not force a CommercialIntent registration.
 */
export function projectCampaignIntentToCommercialIntent(
  campaign: CampaignIntent,
  options?: { commercial_intent_id?: string }
): CommercialIntent | null {
  if (campaign.campaign_intent.intervention_posture !== 'CONSIDER_PROMOTION') {
    return null;
  }

  const start =
    campaign.audience_market.planned_start ||
    new Date(Date.now() + 7 * 86400000).toISOString();
  const end =
    campaign.audience_market.planned_end ||
    new Date(Date.now() + 21 * 86400000).toISOString();

  // IFI-01 CommercialIntent requires a mechanic and a depth. When the canvas has not yet
  // stated one, CDI-01 supplies a placeholder so the contract stays valid — but the
  // placeholder is labelled in provenance so downstream CDI packages never mistake an
  // unstated mechanic for a committed commercial decision.
  const mechanicStated = typeof campaign.campaign_intent.provisional_mechanic === 'string';
  const depthStated = typeof campaign.campaign_intent.provisional_discount_depth === 'number';

  return {
    commercial_intent_id: options?.commercial_intent_id || `intent_from_${campaign.campaign_intent_id}`,
    tenant_id: campaign.tenant_id,
    session_id: campaign.session_id,
    campaign_id: campaign.campaign_intent_id,
    category: campaign.campaign_intent.category,
    sku_scope: campaign.campaign_intent.sku_scope,
    region: campaign.audience_market.region,
    customer_segment: campaign.audience_market.customer_segment,
    channel: campaign.audience_market.channel,
    promotion_type: campaign.campaign_intent.provisional_mechanic || '20_percent_off',
    discount_depth:
      typeof campaign.campaign_intent.provisional_discount_depth === 'number'
        ? campaign.campaign_intent.provisional_discount_depth
        : 20,
    planned_start: start,
    planned_end: end,
    expected_uplift: 0,
    campaign_objective: campaign.campaign_intent.objective_type,
    source_system: 'cognix_campaign_decision_canvas',
    source_type: 'PROMOTION_PLANNER',
    created_at: campaign.registered_at || campaign.updated_at,
    provenance: {
      campaign_intent_id: campaign.campaign_intent_id,
      projection: 'cdi01_to_commercial_intent',
      intervention_posture: campaign.campaign_intent.intervention_posture,
      promotion_type_source: mechanicStated ? 'canvas_stated' : 'cdi01_placeholder_default',
      discount_depth_source: depthStated ? 'canvas_stated' : 'cdi01_placeholder_default',
      timing_source: campaign.audience_market.planned_start ? 'canvas_stated' : 'cdi01_placeholder_default'
    },
    synthetic_demo: campaign.synthetic_demo,
    schema_version: '1.0'
  };
}

/** Guard used by tests to assert CDI-01 does not smuggle CDI-02+ calculation fields. */
export const CDI01_FORBIDDEN_CALCULATION_KEYS = [
  'counterfactual_baseline',
  'causal_demand',
  'opportunity_window_score',
  'micro_market_score',
  'decision_readiness',
  'outcome_frontier',
  'decision_half_life',
  'pre_mortem',
  'closed_learning_loop'
] as const;

export function assertNoFutureCdiCalculations(payload: unknown): { ok: boolean; offenders: string[] } {
  const raw = JSON.stringify(payload || {});
  const offenders = CDI01_FORBIDDEN_CALCULATION_KEYS.filter(k => raw.includes(`"${k}"`));
  return { ok: offenders.length === 0, offenders };
}
