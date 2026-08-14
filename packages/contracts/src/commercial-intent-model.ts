/**
 * CogniX Commercial Intent Domain Model
 * Transport-neutral contracts, taxonomy, and validation helpers for planned business actions.
 */

export interface CommercialIntent {
  commercial_intent_id: string;      // intent_<uuid>
  tenant_id: string;                 // e.g. tenant_uk_retail_01
  session_id: string;                // e.g. sess_001
  campaign_id?: string;              // e.g. CMP-DAIRY-Q3
  category: string;                  // e.g. Fresh Dairy
  sku_scope: string[];               // e.g. ['P004', 'P005']
  region: string;                    // e.g. North West
  customer_segment?: string;         // e.g. Family Shoppers
  channel?: string;                  // e.g. Omnichannel / E-Commerce
  promotion_type: string;            // e.g. 20_percent_off, BOGOF, Feature_Display
  discount_depth: number;            // e.g. 20
  planned_start: string;             // ISO 8601 UTC date
  planned_end: string;               // ISO 8601 UTC date
  expected_uplift: number;           // percentage e.g. 25
  campaign_objective?: string;       // e.g. Volume Surge / Market Share
  media_support?: string;            // e.g. Digital Banner + In-App Push
  inventory_assumption?: string;     // e.g. Safety stock buffer 3 days
  supplier_assumption?: string;      // e.g. FreshDirect UK 48k cap
  source_system: string;             // e.g. cognix_promotion_planner, blue_yonder_trade
  source_type: 'PROMOTION_PLANNER' | 'TRADE_PROMOTION_SYSTEM' | 'COMMERCIAL_ERP' | 'MANUAL_PLANNER_INPUT';
  created_at: string;                // ISO 8601 UTC
  provenance: Record<string, string>;
  synthetic_demo: boolean;           // true
  schema_version: string;            // "1.0"
}

export function validateCommercialIntent(intent: Partial<CommercialIntent>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!intent.commercial_intent_id) errors.push('Missing required field: commercial_intent_id');
  if (!intent.tenant_id) errors.push('Missing required field: tenant_id');
  if (!intent.session_id) errors.push('Missing required field: session_id');
  if (!intent.category) errors.push('Missing required field: category');
  if (!intent.region) errors.push('Missing required field: region');
  if (!intent.promotion_type) errors.push('Missing required field: promotion_type');
  if (typeof intent.discount_depth !== 'number' || intent.discount_depth < 0) {
    errors.push('discount_depth must be a non-negative number');
  }
  if (!intent.planned_start) errors.push('Missing required field: planned_start');
  if (!intent.planned_end) errors.push('Missing required field: planned_end');

  if (intent.planned_start && intent.planned_end && new Date(intent.planned_start) > new Date(intent.planned_end)) {
    errors.push('planned_start must precede or equal planned_end');
  }

  // Security Guardrail: credential leakage prevention
  const str = JSON.stringify(intent);
  if (/AIzaSy[A-Za-z0-9_-]{33}/.test(str) || /"password"\s*:\s*"[^"]+"/.test(str)) {
    errors.push('Security violation: CommercialIntent payload contains sensitive credentials');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
