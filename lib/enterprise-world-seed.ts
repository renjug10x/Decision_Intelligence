/**
 * CogniX Enterprise World Seed Engine
 * Provides temporal T-90 to T+30 scenario generation for core scenario families.
 */

import { EnterpriseWorldScenario, ScenarioFamilyId } from './enterprise-world-model';

export const ENTERPRISE_WORLD_SCENARIOS: EnterpriseWorldScenario[] = [
  {
    scenarioId: 'SCN-PROMO-01',
    familyId: 'promotion_surge',
    title: 'Regional Promotion Surge & Supplier Headroom Mismatch',
    description: 'Demand acceleration of +28% during peak promotional campaign exceeds primary supplier FreshDirect UK allocation by 3,200 units/week.',
    tenantId: 'tenant_uk_retail_01',
    category: 'Produce',
    region: 'Southern',
    temporalData: [
      { period: 'T-90', demandUnits: 42000, capacityUnits: 48000, wastePct: 2.1, serviceLevelPct: 98.4, deliveryDelayHours: 0.5 },
      { period: 'T-30', demandUnits: 44000, capacityUnits: 48000, wastePct: 2.3, serviceLevelPct: 97.8, deliveryDelayHours: 0.8 },
      { period: 'T-7',  demandUnits: 48000, capacityUnits: 48000, wastePct: 2.8, serviceLevelPct: 95.1, deliveryDelayHours: 1.4 },
      { period: 'Today', demandUnits: 55000, capacityUnits: 48000, wastePct: 3.4, serviceLevelPct: 89.2, deliveryDelayHours: 2.8 },
      { period: 'T+7',  demandUnits: 58000, capacityUnits: 48000, wastePct: 4.1, serviceLevelPct: 84.5, deliveryDelayHours: 4.2 },
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
    temporalData: [
      { period: 'T-90', demandUnits: 38000, capacityUnits: 40000, wastePct: 1.9, serviceLevelPct: 97.5, deliveryDelayHours: 0.4 },
      { period: 'T-30', demandUnits: 39000, capacityUnits: 40000, wastePct: 2.0, serviceLevelPct: 96.1, deliveryDelayHours: 1.1 },
      { period: 'T-7',  demandUnits: 40000, capacityUnits: 40000, wastePct: 2.4, serviceLevelPct: 91.0, deliveryDelayHours: 2.5 },
      { period: 'Today', demandUnits: 41000, capacityUnits: 40000, wastePct: 3.8, serviceLevelPct: 82.0, deliveryDelayHours: 5.4 },
      { period: 'T+7',  demandUnits: 42000, capacityUnits: 40000, wastePct: 4.8, serviceLevelPct: 76.5, deliveryDelayHours: 7.2 },
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
    temporalData: [
      { period: 'T-90', demandUnits: 25000, capacityUnits: 30000, wastePct: 1.8, serviceLevelPct: 99.0, deliveryDelayHours: 0.2 },
      { period: 'T-30', demandUnits: 26000, capacityUnits: 30000, wastePct: 2.1, serviceLevelPct: 98.2, deliveryDelayHours: 0.5 },
      { period: 'T-7',  demandUnits: 28000, capacityUnits: 30000, wastePct: 3.2, serviceLevelPct: 97.0, deliveryDelayHours: 0.8 },
      { period: 'Today', demandUnits: 24000, capacityUnits: 30000, wastePct: 5.4, serviceLevelPct: 96.5, deliveryDelayHours: 1.0 },
      { period: 'T+7',  demandUnits: 22000, capacityUnits: 30000, wastePct: 6.8, serviceLevelPct: 95.8, deliveryDelayHours: 1.2 },
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
  }
];

export function getScenarioByFamily(familyId: ScenarioFamilyId): EnterpriseWorldScenario {
  const matched = ENTERPRISE_WORLD_SCENARIOS.find(s => s.familyId === familyId);
  return matched || ENTERPRISE_WORLD_SCENARIOS[0];
}

export function getAllScenarios(tenantId: string = 'tenant_uk_retail_01'): EnterpriseWorldScenario[] {
  return ENTERPRISE_WORLD_SCENARIOS.filter(s => s.tenantId === tenantId);
}
