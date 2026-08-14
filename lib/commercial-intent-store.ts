/**
 * CogniX Commercial Intent Domain Store
 * In-memory tenant and session-aware store for registered Commercial Intent objects.
 */

import { CommercialIntent, validateCommercialIntent } from '../packages/contracts/src/index';

const store: Map<string, CommercialIntent> = new Map();

function buildStoreKey(tenantId: string, sessionId: string): string {
  return `${tenantId}::${sessionId}`;
}

export function registerCommercialIntent(intent: CommercialIntent): CommercialIntent {
  const valResult = validateCommercialIntent(intent);
  if (!valResult.valid) {
    throw new Error(`Invalid CommercialIntent payload: ${valResult.errors.join(', ')}`);
  }

  const key = buildStoreKey(intent.tenant_id, intent.session_id);
  store.set(key, { ...intent });
  store.set(intent.commercial_intent_id, { ...intent });

  return { ...intent };
}

export function getCommercialIntentById(intentId: string): CommercialIntent | null {
  const found = store.get(intentId);
  return found ? { ...found } : null;
}

export function getCurrentCommercialIntent(tenantId: string, sessionId: string): CommercialIntent {
  const key = buildStoreKey(tenantId, sessionId);
  const found = store.get(key);

  if (found) {
    return { ...found };
  }

  // Default synthetic demo seed if no intent has been explicitly registered for this session
  const defaultDemoIntent: CommercialIntent = {
    commercial_intent_id: 'intent_demo_01',
    tenant_id: tenantId,
    session_id: sessionId,
    campaign_id: 'CMP-DAIRY-Q3',
    category: 'Fresh Dairy',
    sku_scope: ['P004 Cheddar Mature 400g'],
    region: 'North West',
    customer_segment: 'Family Shoppers',
    channel: 'Omnichannel',
    promotion_type: '20_percent_off',
    discount_depth: 20,
    planned_start: new Date(Date.now() + 7 * 86400000).toISOString(),
    planned_end: new Date(Date.now() + 21 * 86400000).toISOString(),
    expected_uplift: 25,
    campaign_objective: 'Volume Surge & Market Share Growth',
    media_support: 'Digital Banner + In-App Push Notification',
    inventory_assumption: 'Trafford RDC safety stock buffer 3 days',
    supplier_assumption: 'FreshDirect UK capped at 48,000 units/week',
    source_system: 'cognix_promotion_planner',
    source_type: 'PROMOTION_PLANNER',
    created_at: new Date().toISOString(),
    provenance: {
      generator: 'cognix_demo_intent_seed',
      rule: 'default_promotional_intent_seed'
    },
    synthetic_demo: true,
    schema_version: '1.0'
  };

  return defaultDemoIntent;
}

export function clearCommercialIntents(tenantId?: string, sessionId?: string): void {
  if (tenantId && sessionId) {
    const key = buildStoreKey(tenantId, sessionId);
    const intent = store.get(key);
    if (intent) {
      store.delete(intent.commercial_intent_id);
      store.delete(key);
    }
  } else {
    store.clear();
  }
}
