/**
 * CogniX Enterprise World Seed & Deterministic Scenario Generator
 * Single canonical scenario generation engine shared between cognix-world service and local fallback adapter.
 */
import { EnterpriseWorldScenario, ScenarioFamilyId } from './enterprise-world-model';
export declare const CANONICAL_SCENARIO_VERSION = "1.0.0";
export declare const CANONICAL_GENERATOR_VERSION = "gen_v1.0.0";
export declare const ENTERPRISE_WORLD_SCENARIOS: EnterpriseWorldScenario[];
export declare function generateCanonicalScenario(familyId?: ScenarioFamilyId, tenantId?: string): EnterpriseWorldScenario[];
