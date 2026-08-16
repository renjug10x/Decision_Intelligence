"use strict";
/**
 * CogniX Shared Decision State Domain Model
 * Transport-neutral types, command registry, deterministic calculations, and schema definitions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDerivedImpacts = calculateDerivedImpacts;
exports.validateDecisionStateCommand = validateDecisionStateCommand;
/**
 * Deterministic Derived Impact Engine
 * Pure function: Calculates exact cross-functional business consequences from parameters & interventions.
 */
function calculateDerivedImpacts(params, interventions) {
    const BASE_DEMAND = 10000;
    const BASE_SUPPLIER_CAPACITY = 10000;
    // 1. Demand Lift
    const weekly_demand_units = Math.round(BASE_DEMAND * (1 + params.promotion_lift / 100));
    // 2. Base Capacity & Interventions (e.g. SLA flex adds 1,200 units)
    const flexUnits = interventions.includes('SLA_FLEX_RULE_4') ? 1200 : 0;
    const bufferUnits = interventions.includes('BUFFER_OPTIMISATION_R002') ? 500 : 0;
    const supplier_capacity_units = Math.round(BASE_SUPPLIER_CAPACITY * (1 + params.supplier_capacity_cap / 100)) + flexUnits + bufferUnits;
    // 3. Commitment Gap
    const commitment_gap_units = Math.max(0, weekly_demand_units - supplier_capacity_units);
    // 4. Delivery Risk (% breach risk)
    const baseRisk = Math.min(95, Math.round((commitment_gap_units / Math.max(1, weekly_demand_units)) * 100 * 2.5));
    const delivery_risk_pct = interventions.includes('SLA_FLEX_RULE_4') ? Math.max(5, baseRisk - 30) : baseRisk;
    // 5. Financial Exposure (£120 per OOS unit)
    const financial_exposure_gbp = commitment_gap_units * 120;
    // 6. DC Overtime (Ripple 2nd order)
    const scopeMultiplier = params.campaign_scope === 'national' ? 1.0 : params.campaign_scope === 'regional' ? 0.6 : 0.75;
    const dc_overtime_hours = Math.round(12 + (params.promotion_lift * 0.4) * scopeMultiplier);
    // 7. Margin Erosion (% 3rd order)
    const baseErosion = 1.2 + (params.promotion_lift / 15) * 1.0 * scopeMultiplier + (params.cannibalisation_factor * 0.1);
    const margin_erosion_pct = Number(baseErosion.toFixed(1));
    // 8. Stockout Probability
    const stockout_probability_pct = commitment_gap_units > 0 ? Math.min(92, Math.round(40 + (commitment_gap_units / 100))) : 5;
    return {
        weekly_demand_units,
        supplier_capacity_units,
        commitment_gap_units,
        delivery_risk_pct,
        financial_exposure_gbp,
        dc_overtime_hours,
        margin_erosion_pct,
        stockout_probability_pct
    };
}
function validateDecisionStateCommand(cmd) {
    const errors = [];
    if (!cmd.command_type)
        errors.push('Missing required field: command_type');
    if (typeof cmd.expected_version !== 'number')
        errors.push('Missing or invalid expected_version');
    if (cmd.command_type === 'SET_PROMOTION_LIFT') {
        const val = cmd.payload?.promotion_lift;
        if (typeof val !== 'number' || val < 0 || val > 100) {
            errors.push('promotion_lift must be a number between 0 and 100');
        }
    }
    if (cmd.command_type === 'SET_SUPPLIER_CAPACITY_CAP') {
        const val = cmd.payload?.supplier_capacity_cap;
        if (typeof val !== 'number' || val < 0 || val > 100) {
            errors.push('supplier_capacity_cap must be a number between 0 and 100');
        }
    }
    if (cmd.command_type === 'REGISTER_DECISION_CONTRACT') {
        if (typeof cmd.payload?.decision_contract_ref !== 'string' || !cmd.payload.decision_contract_ref) {
            errors.push('decision_contract_ref must be a non-empty string');
        }
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
