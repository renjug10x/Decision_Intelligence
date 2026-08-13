/**
 * CogniX Shared Decision State Client
 * 
 * Reusable client abstraction for fetching, mutating, and resetting enterprise decision state.
 */

import {
  DecisionState,
  DecisionCommandType,
  DecisionStateTransitionResult
} from '@/packages/contracts/src/index';
import { getOrCreateSessionId } from '@/lib/journey-client';

const DEFAULT_TENANT = 'tenant_uk_retail_01';

export async function fetchCurrentDecisionState(sessionId?: string, tenantId: string = DEFAULT_TENANT): Promise<DecisionState | null> {
  const activeSessionId = sessionId || getOrCreateSessionId();
  try {
    const res = await fetch(`/api/v1/decision-state/current?session_id=${encodeURIComponent(activeSessionId)}&tenant_id=${encodeURIComponent(tenantId)}`, {
      cache: 'no-store'
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err: any) {
    console.warn(`[DecisionStateClient] Failed to fetch current decision state: ${err.message}`);
    return null;
  }
}

export async function executeDecisionCommand(
  stateId: string,
  commandType: DecisionCommandType,
  expectedVersion: number,
  payload: Record<string, any> = {},
  sourceComponent?: string
): Promise<DecisionStateTransitionResult> {
  try {
    const res = await fetch(`/api/v1/decision-state/${encodeURIComponent(stateId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        command_type: commandType,
        expected_version: expectedVersion,
        payload,
        source_component: sourceComponent
      })
    });

    const json = await res.json();

    if (res.status === 409) {
      console.warn(`[DecisionStateClient] Version conflict: Expected v${expectedVersion}, current is v${json.current_version}`);
    }

    return json;
  } catch (err: any) {
    console.error(`[DecisionStateClient] Command execution failed: ${err.message}`);
    return {
      status: 'error',
      decision_state_id: stateId,
      previous_version: expectedVersion,
      new_version: expectedVersion,
      command_type: commandType,
      changed_fields: [],
      derived_impacts: null as any,
      state: null as any,
      error: err.message
    };
  }
}

export async function resetDecisionState(stateId: string): Promise<DecisionState | null> {
  try {
    const res = await fetch(`/api/v1/decision-state/${encodeURIComponent(stateId)}/reset`, {
      method: 'POST'
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err: any) {
    console.error(`[DecisionStateClient] Reset failed: ${err.message}`);
    return null;
  }
}
