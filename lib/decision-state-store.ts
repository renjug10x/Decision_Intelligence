/**
 * CogniX Shared Decision State Store & Deterministic Transition Engine
 * 
 * Replaceable store abstraction implementing optimistic concurrency, versioning,
 * tenant/session isolation, and cross-functional derived impact calculation for WP10-C.
 */

import {
  DecisionState,
  DecisionScenarioParameters,
  DecisionCommandType,
  TransitionCommandPayload,
  DecisionStateTransitionResult,
  calculateDerivedImpacts,
  validateDecisionStateCommand
} from '@/packages/contracts/src/index';

export interface IDecisionStateStore {
  createOrInitialiseState(params: {
    tenant_id: string;
    session_id: string;
    domain_id?: string;
    persona_id?: string;
    scenario_id?: string;
    scenario_family?: string;
  }): DecisionState;

  getDecisionStateById(id: string): DecisionState | null;

  getCurrentStateBySession(sessionId: string, tenantId?: string): DecisionState | null;

  /**
   * Strictly read-only lookup. Returns null when no state exists for the tenant/session
   * instead of initialising one. Required by read-only consumers (CDI-04) that must never
   * write to Shared Decision State.
   */
  peekCurrentStateBySession(sessionId: string, tenantId?: string): DecisionState | null;

  applyCommandTransition(
    id: string,
    command: TransitionCommandPayload
  ): DecisionStateTransitionResult;

  resetDecisionState(id: string): DecisionState | null;

  getStateHistory(id: string): any[];

  clearStore(): void;
}

const DEFAULT_SCENARIO_PARAMS: DecisionScenarioParameters = {
  promotion_lift: 20,
  supplier_capacity_cap: 10,
  forecast_horizon_days: 14,
  promotion_method: '20_percent_off',
  campaign_scope: 'national',
  cannibalisation_factor: 0,
  event_boost: 'none'
};

class InMemoryDecisionStateStore implements IDecisionStateStore {
  private statesMap: Map<string, DecisionState> = new Map();
  private sessionIndexMap: Map<string, string> = new Map(); // session_id -> decision_state_id

  private getSessionKey(tenantId: string, sessionId: string): string {
    return `${tenantId}::${sessionId}`;
  }

  public createOrInitialiseState(params: {
    tenant_id: string;
    session_id: string;
    domain_id?: string;
    persona_id?: string;
    scenario_id?: string;
    scenario_family?: string;
  }): DecisionState {
    const sessionKey = this.getSessionKey(params.tenant_id, params.session_id);
    const existingId = this.sessionIndexMap.get(sessionKey);

    if (existingId) {
      const existingState = this.statesMap.get(existingId);
      if (existingState) return existingState;
    }

    const stateId = `ds_${Math.random().toString(36).substr(2, 9)}`;
    const initialParams: DecisionScenarioParameters = { ...DEFAULT_SCENARIO_PARAMS };
    const initialInterventions: string[] = [];

    const derived = calculateDerivedImpacts(initialParams, initialInterventions);
    const now = new Date().toISOString();

    const newState: DecisionState = {
      decision_state_id: stateId,
      tenant_id: params.tenant_id,
      session_id: params.session_id,
      domain_id: params.domain_id || 'retail_grocery',
      persona_id: params.persona_id || 'exec',
      scenario_id: params.scenario_id || 'SCN-PROMO-01',
      scenario_family: params.scenario_family || 'promotion_surge',
      state_version: 1,
      created_at: now,
      updated_at: now,
      scenario_parameters: initialParams,
      enterprise_signals: [
        'sig_ps_001',
        'sig_ps_002',
        'sig_ps_003',
        'sig_ps_004',
        'sig_ps_005'
      ],
      constraints: [
        'FreshDirect UK allocation cap: 48,000 units/week',
        'Trafford DC weekend overtime limit: 20 hours',
        'Target category margin loss cap: 3.0%'
      ],
      selected_interventions: initialInterventions,
      derived_impacts: derived,
      history: [
        {
          version: 1,
          timestamp: now,
          command_type: 'RESET_SCENARIO',
          changed_fields: ['initial_baseline'],
          previous_version: 0
        }
      ],
      provenance: {
        promotion_lift: 'enterprise_world_baseline',
        supplier_capacity_cap: 'enterprise_world_baseline',
        derived_impacts: 'deterministic_rule'
      },
      synthetic_demo: true
    };

    this.statesMap.set(stateId, newState);
    this.sessionIndexMap.set(sessionKey, stateId);

    return newState;
  }

  public getDecisionStateById(id: string): DecisionState | null {
    return this.statesMap.get(id) || null;
  }

  public getCurrentStateBySession(sessionId: string, tenantId: string = 'tenant_uk_retail_01'): DecisionState | null {
    const sessionKey = this.getSessionKey(tenantId, sessionId);
    const stateId = this.sessionIndexMap.get(sessionKey);
    if (stateId) {
      return this.statesMap.get(stateId) || null;
    }
    // Auto-create if none exists for active session
    return this.createOrInitialiseState({ tenant_id: tenantId, session_id: sessionId });
  }

  public peekCurrentStateBySession(
    sessionId: string,
    tenantId: string = 'tenant_uk_retail_01'
  ): DecisionState | null {
    const sessionKey = this.getSessionKey(tenantId, sessionId);
    const stateId = this.sessionIndexMap.get(sessionKey);
    if (!stateId) return null;
    return this.statesMap.get(stateId) || null;
  }

  public applyCommandTransition(
    id: string,
    commandPayload: TransitionCommandPayload
  ): DecisionStateTransitionResult {
    const currentState = this.statesMap.get(id);

    if (!currentState) {
      return {
        status: 'error',
        decision_state_id: id,
        previous_version: 0,
        new_version: 0,
        command_type: commandPayload.command_type,
        changed_fields: [],
        derived_impacts: calculateDerivedImpacts(DEFAULT_SCENARIO_PARAMS, []),
        state: null as any,
        error: 'Decision state not found'
      };
    }

    // Validation
    const validation = validateDecisionStateCommand(commandPayload);
    if (!validation.valid) {
      return {
        status: 'error',
        decision_state_id: id,
        previous_version: currentState.state_version,
        new_version: currentState.state_version,
        command_type: commandPayload.command_type,
        changed_fields: [],
        derived_impacts: currentState.derived_impacts,
        state: currentState,
        error: `Validation error: ${validation.errors.join(', ')}`
      };
    }

    // Optimistic Concurrency check
    if (commandPayload.expected_version !== currentState.state_version) {
      return {
        status: 'conflict',
        decision_state_id: id,
        previous_version: currentState.state_version,
        new_version: currentState.state_version,
        command_type: commandPayload.command_type,
        changed_fields: [],
        derived_impacts: currentState.derived_impacts,
        state: currentState,
        error: `Version conflict: Expected v${commandPayload.expected_version}, but current version is v${currentState.state_version}`
      };
    }

    // Deep clone parameters and interventions for immutability
    const updatedParams: DecisionScenarioParameters = { ...currentState.scenario_parameters };
    let updatedInterventions: string[] = [...currentState.selected_interventions];
    const changedFields: string[] = [];
    const updatedProvenance: Record<string, string> = { ...currentState.provenance };

    // Deterministic Command Processor
    switch (commandPayload.command_type) {
      case 'SET_PROMOTION_LIFT':
        if (typeof commandPayload.payload.promotion_lift === 'number') {
          updatedParams.promotion_lift = commandPayload.payload.promotion_lift;
          changedFields.push('promotion_lift');
          updatedProvenance.promotion_lift = 'user_input';
        }
        break;

      case 'SET_SUPPLIER_CAPACITY_CAP':
        if (typeof commandPayload.payload.supplier_capacity_cap === 'number') {
          updatedParams.supplier_capacity_cap = commandPayload.payload.supplier_capacity_cap;
          changedFields.push('supplier_capacity_cap');
          updatedProvenance.supplier_capacity_cap = 'user_input';
        }
        break;

      case 'SET_FORECAST_HORIZON':
        if (typeof commandPayload.payload.forecast_horizon_days === 'number') {
          updatedParams.forecast_horizon_days = commandPayload.payload.forecast_horizon_days;
          changedFields.push('forecast_horizon_days');
          updatedProvenance.forecast_horizon_days = 'user_input';
        }
        break;

      case 'SET_PROMOTION_METHOD':
        if (typeof commandPayload.payload.promotion_method === 'string') {
          updatedParams.promotion_method = commandPayload.payload.promotion_method;
          changedFields.push('promotion_method');
          updatedProvenance.promotion_method = 'user_input';
        }
        break;

      case 'SET_CAMPAIGN_SCOPE':
        if (commandPayload.payload.campaign_scope) {
          updatedParams.campaign_scope = commandPayload.payload.campaign_scope;
          changedFields.push('campaign_scope');
          updatedProvenance.campaign_scope = 'user_input';
        }
        break;

      case 'SET_CANNIBALISATION_FACTOR':
        if (typeof commandPayload.payload.cannibalisation_factor === 'number') {
          updatedParams.cannibalisation_factor = commandPayload.payload.cannibalisation_factor;
          changedFields.push('cannibalisation_factor');
          updatedProvenance.cannibalisation_factor = 'user_input';
        }
        break;

      case 'SET_EVENT_BOOST':
        if (typeof commandPayload.payload.event_boost === 'string') {
          updatedParams.event_boost = commandPayload.payload.event_boost;
          changedFields.push('event_boost');
          updatedProvenance.event_boost = 'user_input';
        }
        break;

      case 'SELECT_INTERVENTION':
        if (commandPayload.payload.intervention_id) {
          const idToSelect = commandPayload.payload.intervention_id;
          if (!updatedInterventions.includes(idToSelect)) {
            updatedInterventions.push(idToSelect);
            changedFields.push('selected_interventions');
            updatedProvenance[`intervention_${idToSelect}`] = 'user_selection';
          }
        }
        break;

      case 'DESELECT_INTERVENTION':
        if (commandPayload.payload.intervention_id) {
          const idToRemove = commandPayload.payload.intervention_id;
          updatedInterventions = updatedInterventions.filter(i => i !== idToRemove);
          changedFields.push('selected_interventions');
        }
        break;

      case 'REGISTER_COMMERCIAL_INTENT':
        if (typeof commandPayload.payload.promotion_lift === 'number') {
          updatedParams.promotion_lift = commandPayload.payload.promotion_lift;
          changedFields.push('promotion_lift');
        }
        if (commandPayload.payload.commercial_intent_ref) {
          changedFields.push('commercial_intent_ref');
        }
        updatedProvenance.commercial_intent = 'registered_intent';
        break;

      case 'REGISTER_CAMPAIGN_INTENT':
        if (commandPayload.payload.campaign_intent_ref) {
          changedFields.push('campaign_intent_ref');
        }
        if (typeof commandPayload.payload.promotion_lift === 'number') {
          updatedParams.promotion_lift = commandPayload.payload.promotion_lift;
          changedFields.push('promotion_lift');
        }
        if (commandPayload.payload.promotion_method) {
          updatedParams.promotion_method = commandPayload.payload.promotion_method;
          changedFields.push('promotion_method');
        }
        if (commandPayload.payload.campaign_scope) {
          updatedParams.campaign_scope = commandPayload.payload.campaign_scope;
          changedFields.push('campaign_scope');
        }
        updatedProvenance.campaign_intent = 'registered_cdi01_intent';
        updatedProvenance.intervention_posture = String(commandPayload.payload.intervention_posture || 'UNDECIDED');
        break;

      case 'RESET_SCENARIO':
        Object.assign(updatedParams, DEFAULT_SCENARIO_PARAMS);
        updatedInterventions = [];
        changedFields.push('reset_to_baseline');
        break;
    }

    // Recalculate deterministic derived impacts
    const newDerivedImpacts = calculateDerivedImpacts(updatedParams, updatedInterventions);
    const newVersion = currentState.state_version + 1;
    const now = new Date().toISOString();

    const versionRecord = {
      version: newVersion,
      timestamp: now,
      command_type: commandPayload.command_type,
      changed_fields: changedFields,
      previous_version: currentState.state_version
    };

    const nextState: DecisionState = {
      ...currentState,
      state_version: newVersion,
      updated_at: now,
      scenario_parameters: updatedParams,
      selected_interventions: updatedInterventions,
      commercial_intent_ref: commandPayload.payload.commercial_intent_ref || currentState.commercial_intent_ref,
      campaign_intent_ref: commandPayload.payload.campaign_intent_ref || currentState.campaign_intent_ref,
      derived_impacts: newDerivedImpacts,
      provenance: updatedProvenance,
      history: [versionRecord, ...currentState.history].slice(0, 50)
    };

    this.statesMap.set(id, nextState);

    return {
      status: 'success',
      decision_state_id: id,
      previous_version: currentState.state_version,
      new_version: newVersion,
      command_type: commandPayload.command_type,
      changed_fields: changedFields,
      derived_impacts: newDerivedImpacts,
      state: nextState
    };
  }

  public resetDecisionState(id: string): DecisionState | null {
    const currentState = this.statesMap.get(id);
    if (!currentState) return null;

    const res = this.applyCommandTransition(id, {
      command_type: 'RESET_SCENARIO',
      expected_version: currentState.state_version,
      payload: {}
    });

    return res.state;
  }

  public getStateHistory(id: string): any[] {
    const state = this.statesMap.get(id);
    return state ? state.history : [];
  }

  public clearStore(): void {
    this.statesMap.clear();
    this.sessionIndexMap.clear();
  }
}

export const decisionStateStore: IDecisionStateStore = new InMemoryDecisionStateStore();

export function getDecisionState(tenantId: string = 'tenant_uk_retail_01', sessionId: string = 'sess_001'): DecisionState {
  return decisionStateStore.getCurrentStateBySession(sessionId, tenantId)!;
}

export function transitionDecisionState(
  tenantId: string,
  sessionId: string,
  commandType: DecisionCommandType,
  payload: any
): DecisionState {
  const current = getDecisionState(tenantId, sessionId);
  const result = decisionStateStore.applyCommandTransition(current.decision_state_id, {
    command_type: commandType,
    expected_version: current.state_version,
    payload
  });
  if (result.status === 'error' || result.status === 'conflict') {
    throw new Error(result.error || 'Transition failed');
  }
  return result.state;
}

export function resetDecisionState(tenantId: string = 'tenant_uk_retail_01', sessionId: string = 'sess_001'): DecisionState {
  const current = getDecisionState(tenantId, sessionId);
  return decisionStateStore.resetDecisionState(current.decision_state_id)!;
}
