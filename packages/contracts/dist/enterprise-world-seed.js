"use strict";
/**
 * CogniX Enterprise World Seed & Deterministic Scenario Generator
 * Single canonical scenario generation engine shared between cognix-world service and local fallback adapter.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENTERPRISE_WORLD_SCENARIOS = exports.CANONICAL_GENERATOR_VERSION = exports.CANONICAL_SCENARIO_VERSION = void 0;
exports.generateCanonicalScenario = generateCanonicalScenario;
exports.CANONICAL_SCENARIO_VERSION = '1.0.0';
exports.CANONICAL_GENERATOR_VERSION = 'gen_v1.0.0';
exports.ENTERPRISE_WORLD_SCENARIOS = [
    {
        scenarioId: 'SCN-PROMO-01',
        familyId: 'promotion_surge',
        title: 'Regional Promotion Surge & Supplier Headroom Mismatch',
        description: 'Demand acceleration of +28% during peak promotional campaign exceeds primary supplier FreshDirect UK allocation by 3,200 units/week.',
        tenantId: 'tenant_uk_retail_01',
        category: 'Produce',
        region: 'Southern',
        scenarioVersion: exports.CANONICAL_SCENARIO_VERSION,
        generatorVersion: exports.CANONICAL_GENERATOR_VERSION,
        provenance: 'G10X Retail Decision Intelligence Empirical Seed',
        temporalData: [
            { period: 'T-90', demandUnits: 42000, capacityUnits: 48000, wastePct: 2.1, serviceLevelPct: 98.4, deliveryDelayHours: 0.5 },
            { period: 'T-30', demandUnits: 44000, capacityUnits: 48000, wastePct: 2.3, serviceLevelPct: 97.8, deliveryDelayHours: 0.8 },
            { period: 'T-7', demandUnits: 48000, capacityUnits: 48000, wastePct: 2.8, serviceLevelPct: 95.1, deliveryDelayHours: 1.4 },
            { period: 'Today', demandUnits: 55000, capacityUnits: 48000, wastePct: 3.4, serviceLevelPct: 89.2, deliveryDelayHours: 2.8 },
            { period: 'T+7', demandUnits: 58000, capacityUnits: 48000, wastePct: 4.1, serviceLevelPct: 84.5, deliveryDelayHours: 4.2 },
            { period: 'T+30', demandUnits: 46000, capacityUnits: 48000, wastePct: 2.9, serviceLevelPct: 96.0, deliveryDelayHours: 1.0 }
        ],
        baselineMetrics: {
            weeklyDemandUnits: 55000,
            supplierCapacityUnits: 48000,
            onTimeDeliveryPct: 89.2,
            wasteRatePct: 3.4,
            financialExposureGbp: 142000
        },
        causalSignals: [
            'Promotional discount increased from 15% to 28%',
            'Primary supplier FreshDirect UK capped at 48,000 units/week',
            'Southern DC out-of-stock risk accelerated to 42%'
        ]
    },
    {
        scenarioId: 'SCN-SUPP-02',
        familyId: 'supplier_breach',
        title: 'Supplier Lead-Time Breach & SLA Failure Cascade',
        description: 'FreshDirect UK 14-day delay rate elevated to 42%, breaching contractual SLA threshold of 30%.',
        tenantId: 'tenant_uk_retail_01',
        category: 'Produce',
        region: 'Southern',
        scenarioVersion: exports.CANONICAL_SCENARIO_VERSION,
        generatorVersion: exports.CANONICAL_GENERATOR_VERSION,
        provenance: 'G10X Retail Decision Intelligence Empirical Seed',
        temporalData: [
            { period: 'T-90', demandUnits: 38000, capacityUnits: 40000, wastePct: 1.9, serviceLevelPct: 97.5, deliveryDelayHours: 0.4 },
            { period: 'T-30', demandUnits: 39000, capacityUnits: 40000, wastePct: 2.0, serviceLevelPct: 96.1, deliveryDelayHours: 1.1 },
            { period: 'T-7', demandUnits: 40000, capacityUnits: 40000, wastePct: 2.4, serviceLevelPct: 91.0, deliveryDelayHours: 2.5 },
            { period: 'Today', demandUnits: 41000, capacityUnits: 40000, wastePct: 3.8, serviceLevelPct: 82.0, deliveryDelayHours: 5.4 },
            { period: 'T+7', demandUnits: 42000, capacityUnits: 40000, wastePct: 4.8, serviceLevelPct: 76.5, deliveryDelayHours: 7.2 },
            { period: 'T+30', demandUnits: 40000, capacityUnits: 40000, wastePct: 2.2, serviceLevelPct: 95.0, deliveryDelayHours: 1.2 }
        ],
        baselineMetrics: {
            weeklyDemandUnits: 41000,
            supplierCapacityUnits: 40000,
            onTimeDeliveryPct: 82.0,
            wasteRatePct: 3.8,
            financialExposureGbp: 84000
        },
        causalSignals: [
            'FreshDirect UK 14-day delivery delay rate at 42%',
            'SLA breach clause 3.1 triggered (threshold 30%)',
            'Backup supplier Total Produce standby activation eligible'
        ]
    },
    {
        scenarioId: 'SCN-WASTE-03',
        familyId: 'fresh_perishable_waste',
        title: 'Perishable Fresh Produce Waste Spike',
        description: 'Post-promo markdown lag causes fresh waste acceleration across 12 store locations.',
        tenantId: 'tenant_uk_retail_01',
        category: 'Fresh',
        region: 'Northern',
        scenarioVersion: exports.CANONICAL_SCENARIO_VERSION,
        generatorVersion: exports.CANONICAL_GENERATOR_VERSION,
        provenance: 'G10X Retail Decision Intelligence Empirical Seed',
        temporalData: [
            { period: 'T-90', demandUnits: 25000, capacityUnits: 30000, wastePct: 1.8, serviceLevelPct: 99.0, deliveryDelayHours: 0.2 },
            { period: 'T-30', demandUnits: 26000, capacityUnits: 30000, wastePct: 2.1, serviceLevelPct: 98.2, deliveryDelayHours: 0.5 },
            { period: 'T-7', demandUnits: 28000, capacityUnits: 30000, wastePct: 3.2, serviceLevelPct: 97.0, deliveryDelayHours: 0.8 },
            { period: 'Today', demandUnits: 24000, capacityUnits: 30000, wastePct: 5.4, serviceLevelPct: 96.5, deliveryDelayHours: 1.0 },
            { period: 'T+7', demandUnits: 22000, capacityUnits: 30000, wastePct: 6.8, serviceLevelPct: 95.8, deliveryDelayHours: 1.2 },
            { period: 'T+30', demandUnits: 25000, capacityUnits: 30000, wastePct: 2.0, serviceLevelPct: 98.5, deliveryDelayHours: 0.4 }
        ],
        baselineMetrics: {
            weeklyDemandUnits: 24000,
            supplierCapacityUnits: 30000,
            onTimeDeliveryPct: 96.5,
            wasteRatePct: 5.4,
            financialExposureGbp: 38000
        },
        causalSignals: [
            'Post-promo demand drop of 14% un-adjusted in reorder rules',
            'Markdown schedule delayed by 18 hours',
            '12 stores accumulating 5.4% fresh waste'
        ]
    },
    {
        scenarioId: 'SCN-WEATHER-04',
        familyId: 'weather_demand',
        title: 'Unseasonal Heatwave Regional Demand Acceleration',
        description: 'Sudden temperature spike triggers +34% demand in BBQ, salads, and chilled beverages across 18 coastal stores.',
        tenantId: 'tenant_uk_retail_01',
        category: 'Chilled & Beverage',
        region: 'South West',
        scenarioVersion: exports.CANONICAL_SCENARIO_VERSION,
        generatorVersion: exports.CANONICAL_GENERATOR_VERSION,
        provenance: 'G10X Retail Decision Intelligence Empirical Seed',
        temporalData: [
            { period: 'T-90', demandUnits: 18000, capacityUnits: 22000, wastePct: 1.5, serviceLevelPct: 98.8, deliveryDelayHours: 0.3 },
            { period: 'T-30', demandUnits: 19000, capacityUnits: 22000, wastePct: 1.6, serviceLevelPct: 98.0, deliveryDelayHours: 0.4 },
            { period: 'T-7', demandUnits: 20000, capacityUnits: 22000, wastePct: 1.8, serviceLevelPct: 97.2, deliveryDelayHours: 0.6 },
            { period: 'Today', demandUnits: 29500, capacityUnits: 22000, wastePct: 2.9, serviceLevelPct: 81.4, deliveryDelayHours: 3.1 },
            { period: 'T+7', demandUnits: 31000, capacityUnits: 22000, wastePct: 3.5, serviceLevelPct: 75.0, deliveryDelayHours: 4.8 },
            { period: 'T+30', demandUnits: 20000, capacityUnits: 22000, wastePct: 1.7, serviceLevelPct: 97.8, deliveryDelayHours: 0.5 }
        ],
        baselineMetrics: {
            weeklyDemandUnits: 29500,
            supplierCapacityUnits: 22000,
            onTimeDeliveryPct: 81.4,
            wasteRatePct: 2.9,
            financialExposureGbp: 64000
        },
        causalSignals: [
            'Unseasonal +8°C temperature anomaly projected over 5 days',
            'Chilled beverage safety stock depleted to 1.2 days',
            'South West regional DC stockout risk at 56%'
        ]
    },
    {
        scenarioId: 'SCN-OVERTIME-05',
        familyId: 'dc_overtime',
        title: 'Distribution Center Labour & Overtime Propagation',
        description: 'Picking bottleneck at Midlands DC propagates 2nd-order overtime costs (£18.4K/week) and 3rd-order store delivery delays.',
        tenantId: 'tenant_uk_retail_01',
        category: 'Logistics',
        region: 'Midlands',
        scenarioVersion: exports.CANONICAL_SCENARIO_VERSION,
        generatorVersion: exports.CANONICAL_GENERATOR_VERSION,
        provenance: 'G10X Retail Decision Intelligence Empirical Seed',
        temporalData: [
            { period: 'T-90', demandUnits: 50000, capacityUnits: 55000, wastePct: 1.2, serviceLevelPct: 98.0, deliveryDelayHours: 0.5 },
            { period: 'T-30', demandUnits: 52000, capacityUnits: 55000, wastePct: 1.4, serviceLevelPct: 97.1, deliveryDelayHours: 0.9 },
            { period: 'T-7', demandUnits: 55000, capacityUnits: 55000, wastePct: 1.9, serviceLevelPct: 94.0, deliveryDelayHours: 1.8 },
            { period: 'Today', demandUnits: 62000, capacityUnits: 55000, wastePct: 2.8, serviceLevelPct: 86.5, deliveryDelayHours: 4.1 },
            { period: 'T+7', demandUnits: 64000, capacityUnits: 55000, wastePct: 3.4, serviceLevelPct: 80.2, deliveryDelayHours: 6.0 },
            { period: 'T+30', demandUnits: 52000, capacityUnits: 55000, wastePct: 1.5, serviceLevelPct: 97.0, deliveryDelayHours: 0.8 }
        ],
        baselineMetrics: {
            weeklyDemandUnits: 62000,
            supplierCapacityUnits: 55000,
            onTimeDeliveryPct: 86.5,
            wasteRatePct: 2.8,
            financialExposureGbp: 92000
        },
        causalSignals: [
            'Midlands DC shift absenteeism at 14%',
            'Unscheduled weekend overtime running 320 hours/week',
            'Store delivery window compliance dropped from 96% to 81%'
        ]
    },
    {
        scenarioId: 'SCN-IMBALANCE-06',
        familyId: 'regional_imbalance',
        title: 'Regional Inventory Imbalance & Rebalancing Opportunity',
        description: 'Surplus inventory of 14,000 units in Northern DC coincides with stockout deficit in Southern DC.',
        tenantId: 'tenant_uk_retail_01',
        category: 'Ambient & Groceries',
        region: 'National',
        scenarioVersion: exports.CANONICAL_SCENARIO_VERSION,
        generatorVersion: exports.CANONICAL_GENERATOR_VERSION,
        provenance: 'G10X Retail Decision Intelligence Empirical Seed',
        temporalData: [
            { period: 'T-90', demandUnits: 60000, capacityUnits: 65000, wastePct: 1.1, serviceLevelPct: 98.5, deliveryDelayHours: 0.4 },
            { period: 'T-30', demandUnits: 61000, capacityUnits: 65000, wastePct: 1.3, serviceLevelPct: 97.8, deliveryDelayHours: 0.6 },
            { period: 'T-7', demandUnits: 63000, capacityUnits: 65000, wastePct: 1.7, serviceLevelPct: 95.5, deliveryDelayHours: 1.1 },
            { period: 'Today', demandUnits: 68000, capacityUnits: 65000, wastePct: 2.4, serviceLevelPct: 90.1, deliveryDelayHours: 2.2 },
            { period: 'T+7', demandUnits: 71000, capacityUnits: 65000, wastePct: 3.0, serviceLevelPct: 85.0, deliveryDelayHours: 3.5 },
            { period: 'T+30', demandUnits: 62000, capacityUnits: 65000, wastePct: 1.4, serviceLevelPct: 97.5, deliveryDelayHours: 0.7 }
        ],
        baselineMetrics: {
            weeklyDemandUnits: 68000,
            supplierCapacityUnits: 65000,
            onTimeDeliveryPct: 90.1,
            wasteRatePct: 2.4,
            financialExposureGbp: 76000
        },
        causalSignals: [
            'Northern DC inventory holding 140% safety stock target',
            'Southern DC experiencing 4.2 days of stockout exposure',
            'Inter-DC rebalancing opportunity worth £48K protected margin'
        ]
    }
];
function generateCanonicalScenario(familyId, tenantId = 'tenant_uk_retail_01') {
    if (familyId) {
        const matched = exports.ENTERPRISE_WORLD_SCENARIOS.find(s => s.familyId === familyId);
        return matched ? [matched] : [exports.ENTERPRISE_WORLD_SCENARIOS[0]];
    }
    return exports.ENTERPRISE_WORLD_SCENARIOS.filter(s => s.tenantId === tenantId);
}
