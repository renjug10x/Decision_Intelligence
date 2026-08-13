/**
 * CogniX Enterprise World Domain Model
 * Authoritative interfaces for temporal scenario data (T-90 to T+30)
 */

export type TemporalPeriod = 'T-90' | 'T-30' | 'T-7' | 'Today' | 'T+7' | 'T+30';

export type ScenarioFamilyId = 
  | 'promotion_surge'
  | 'weather_demand'
  | 'supplier_breach'
  | 'fresh_perishable_waste'
  | 'dc_overtime'
  | 'regional_imbalance';

export interface TemporalDataPoint {
  period: TemporalPeriod;
  demandUnits: number;
  capacityUnits: number;
  wastePct: number;
  serviceLevelPct: number;
  deliveryDelayHours: number;
}

export interface EnterpriseWorldScenario {
  scenarioId: string;
  familyId: ScenarioFamilyId;
  title: string;
  description: string;
  tenantId: string;
  category: string;
  region: string;
  temporalData: TemporalDataPoint[];
  baselineMetrics: {
    weeklyDemandUnits: number;
    supplierCapacityUnits: number;
    onTimeDeliveryPct: number;
    wasteRatePct: number;
    financialExposureGbp: number;
  };
  causalSignals: string[];
}
