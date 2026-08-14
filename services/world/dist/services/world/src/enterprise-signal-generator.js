"use strict";
/**
 * CogniX Enterprise World Domain - Synthetic Signal Generator
 * Generates canonical, deterministic synthetic signal snapshots derived from Enterprise World scenarios.
 *
 * Domain Ownership: Enterprise World Domain (services/world)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSyntheticSignalSnapshot = generateSyntheticSignalSnapshot;
const index_1 = require("../../../packages/contracts/src/index");
function generateSyntheticSignalSnapshot(scenarioFamily = 'promotion_surge', tenantId = 'tenant_uk_retail_01', scenarioId = 'SCN-PROMO-01') {
    const now = new Date().toISOString();
    const effectiveIn3Days = new Date(Date.now() + 3 * 86400 * 1000).toISOString();
    let signals = [];
    if (scenarioFamily === 'promotion_surge' || scenarioId === 'SCN-PROMO-01') {
        signals = [
            {
                signal_id: 'sig_ps_001',
                signal_type: 'SEARCH_VELOCITY_ACCELERATION',
                category: 'CUSTOMER',
                tenant_id: tenantId,
                domain_id: 'retail_grocery',
                scenario_id: scenarioId,
                entity_type: 'CATEGORY',
                entity_id: 'Fresh Dairy',
                observed_at: now,
                effective_at: effectiveIn3Days,
                baseline_value: 100,
                observed_value: 118,
                delta: 18,
                delta_pct: 18,
                unit: 'percent_baseline',
                source_type: 'SYNTHETIC_WORLD',
                source_system: 'cognix_world_generator',
                confidence: 92,
                quality: 95,
                provenance: {
                    generator: 'cognix_world_generator',
                    scenario_family: 'promotion_surge',
                    rule: 'pre_campaign_search_acceleration'
                },
                synthetic_demo: true,
                schema_version: '1.0'
            },
            {
                signal_id: 'sig_ps_002',
                signal_type: 'BASKET_ADD_ACCELERATION',
                category: 'CUSTOMER',
                tenant_id: tenantId,
                domain_id: 'retail_grocery',
                scenario_id: scenarioId,
                entity_type: 'SKU',
                entity_id: 'P004 Cheddar Mature 400g',
                observed_at: now,
                effective_at: effectiveIn3Days,
                baseline_value: 100,
                observed_value: 124,
                delta: 24,
                delta_pct: 24,
                unit: 'percent_baseline',
                source_type: 'SYNTHETIC_WORLD',
                source_system: 'cognix_world_generator',
                confidence: 90,
                quality: 94,
                provenance: {
                    generator: 'cognix_world_generator',
                    scenario_family: 'promotion_surge',
                    rule: 'basket_add_intent_surge'
                },
                synthetic_demo: true,
                schema_version: '1.0'
            },
            {
                signal_id: 'sig_ps_003',
                signal_type: 'SLOT_BOOKING_PRESSURE',
                category: 'CUSTOMER',
                tenant_id: tenantId,
                domain_id: 'retail_grocery',
                scenario_id: scenarioId,
                entity_type: 'REGION',
                entity_id: 'North West',
                observed_at: now,
                effective_at: effectiveIn3Days,
                baseline_value: 72,
                observed_value: 86,
                delta: 14,
                delta_pct: 19.4,
                unit: 'percent_capacity',
                source_type: 'SYNTHETIC_WORLD',
                source_system: 'cognix_world_generator',
                confidence: 88,
                quality: 92,
                provenance: {
                    generator: 'cognix_world_generator',
                    scenario_family: 'promotion_surge',
                    rule: 'delivery_slot_saturation_warning'
                },
                synthetic_demo: true,
                schema_version: '1.0'
            },
            {
                signal_id: 'sig_ps_004',
                signal_type: 'SUPPLIER_CAPACITY_PRESSURE',
                category: 'SUPPLY',
                tenant_id: tenantId,
                domain_id: 'retail_grocery',
                scenario_id: scenarioId,
                entity_type: 'SUPPLIER',
                entity_id: 'FreshDirect UK',
                observed_at: now,
                effective_at: effectiveIn3Days,
                baseline_value: 48000,
                observed_value: 55000,
                delta: 7000,
                delta_pct: 14.6,
                unit: 'units_per_week',
                source_type: 'SYNTHETIC_WORLD',
                source_system: 'cognix_world_generator',
                confidence: 95,
                quality: 96,
                provenance: {
                    generator: 'cognix_world_generator',
                    scenario_family: 'promotion_surge',
                    rule: 'supplier_capacity_allocation_cap'
                },
                synthetic_demo: true,
                schema_version: '1.0'
            },
            {
                signal_id: 'sig_ps_005',
                signal_type: 'STOCK_COVER_DECLINE',
                category: 'INVENTORY',
                tenant_id: tenantId,
                domain_id: 'retail_grocery',
                scenario_id: scenarioId,
                entity_type: 'DC',
                entity_id: 'Trafford RDC',
                observed_at: now,
                effective_at: effectiveIn3Days,
                baseline_value: 7.0,
                observed_value: 3.2,
                delta: -3.8,
                delta_pct: -54.3,
                unit: 'days_of_cover',
                source_type: 'SYNTHETIC_WORLD',
                source_system: 'cognix_world_generator',
                confidence: 91,
                quality: 93,
                provenance: {
                    generator: 'cognix_world_generator',
                    scenario_family: 'promotion_surge',
                    rule: 'rdc_safety_stock_depletion'
                },
                synthetic_demo: true,
                schema_version: '1.0'
            }
        ];
    }
    else if (scenarioFamily === 'supplier_breach' || scenarioId === 'SCN-BREACH-02') {
        signals = [
            {
                signal_id: 'sig_sb_001',
                signal_type: 'SUPPLIER_LEAD_TIME_DRIFT',
                category: 'SUPPLY',
                tenant_id: tenantId,
                domain_id: 'retail_grocery',
                scenario_id: scenarioId || 'SCN-BREACH-02',
                entity_type: 'SUPPLIER',
                entity_id: 'Greencore Ready Meals',
                observed_at: now,
                effective_at: effectiveIn3Days,
                baseline_value: 24,
                observed_value: 48,
                delta: 24,
                delta_pct: 100,
                unit: 'hours',
                source_type: 'SYNTHETIC_WORLD',
                source_system: 'cognix_world_generator',
                confidence: 96,
                quality: 98,
                provenance: {
                    generator: 'cognix_world_generator',
                    scenario_family: 'supplier_breach',
                    rule: 'supplier_lead_time_delay'
                },
                synthetic_demo: true,
                schema_version: '1.0'
            },
            {
                signal_id: 'sig_sb_002',
                signal_type: 'REPLENISHMENT_DELAY',
                category: 'SUPPLY',
                tenant_id: tenantId,
                domain_id: 'retail_grocery',
                scenario_id: scenarioId || 'SCN-BREACH-02',
                entity_type: 'DC',
                entity_id: 'Southern DC',
                observed_at: now,
                effective_at: effectiveIn3Days,
                baseline_value: 0.5,
                observed_value: 4.5,
                delta: 4.0,
                delta_pct: 800,
                unit: 'hours_delay',
                source_type: 'SYNTHETIC_WORLD',
                source_system: 'cognix_world_generator',
                confidence: 94,
                quality: 95,
                provenance: {
                    generator: 'cognix_world_generator',
                    scenario_family: 'supplier_breach',
                    rule: 'dc_replenishment_queue_delay'
                },
                synthetic_demo: true,
                schema_version: '1.0'
            },
            {
                signal_id: 'sig_sb_003',
                signal_type: 'PROJECTED_STOCKOUT_RISK',
                category: 'INVENTORY',
                tenant_id: tenantId,
                domain_id: 'retail_grocery',
                scenario_id: scenarioId || 'SCN-BREACH-02',
                entity_type: 'SKU',
                entity_id: 'P012 Chilled Ready Meal',
                observed_at: now,
                effective_at: effectiveIn3Days,
                baseline_value: 5,
                observed_value: 68,
                delta: 63,
                delta_pct: 1260,
                unit: 'percent_probability',
                source_type: 'SYNTHETIC_WORLD',
                source_system: 'cognix_world_generator',
                confidence: 93,
                quality: 94,
                provenance: {
                    generator: 'cognix_world_generator',
                    scenario_family: 'supplier_breach',
                    rule: 'stockout_probability_acceleration'
                },
                synthetic_demo: true,
                schema_version: '1.0'
            }
        ];
    }
    else {
        // General default scenario snapshot
        signals = [
            {
                signal_id: 'sig_gen_001',
                signal_type: 'REGIONAL_DEMAND_SHIFT',
                category: 'DEMAND',
                tenant_id: tenantId,
                domain_id: 'retail_grocery',
                scenario_id: scenarioId || 'SCN-GEN-01',
                entity_type: 'REGION',
                entity_id: 'North West',
                observed_at: now,
                effective_at: effectiveIn3Days,
                baseline_value: 100,
                observed_value: 114,
                delta: 14,
                delta_pct: 14,
                unit: 'percent_baseline',
                source_type: 'SYNTHETIC_WORLD',
                source_system: 'cognix_world_generator',
                confidence: 89,
                quality: 91,
                provenance: {
                    generator: 'cognix_world_generator',
                    scenario_family: scenarioFamily,
                    rule: 'regional_demand_rebalance'
                },
                synthetic_demo: true,
                schema_version: '1.0'
            },
            {
                signal_id: 'sig_gen_002',
                signal_type: 'REGIONAL_INVENTORY_SURPLUS',
                category: 'INVENTORY',
                tenant_id: tenantId,
                domain_id: 'retail_grocery',
                scenario_id: scenarioId || 'SCN-GEN-01',
                entity_type: 'DC',
                entity_id: 'Trafford RDC',
                observed_at: now,
                effective_at: effectiveIn3Days,
                baseline_value: 500,
                observed_value: 1200,
                delta: 700,
                delta_pct: 140,
                unit: 'excess_units',
                source_type: 'SYNTHETIC_WORLD',
                source_system: 'cognix_world_generator',
                confidence: 90,
                quality: 92,
                provenance: {
                    generator: 'cognix_world_generator',
                    scenario_family: scenarioFamily,
                    rule: 'rdc_excess_buffer_holding'
                },
                synthetic_demo: true,
                schema_version: '1.0'
            }
        ];
    }
    // Validate all generated signals before returning
    return signals.filter(s => (0, index_1.validateEnterpriseSignal)(s).valid);
}
