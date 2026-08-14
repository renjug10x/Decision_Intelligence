'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { DecisionState, DecisionCommandType } from '@/packages/contracts/src/index';
import { fetchCurrentDecisionState, executeDecisionCommand, resetDecisionState } from '@/lib/decision-state-client';
import { getOrCreateSessionId } from '@/lib/journey-client';

interface DecisionStateContextValue {
  decisionState: DecisionState | null;
  loading: boolean;
  error: string | null;
  executeCommand: (commandType: DecisionCommandType, payload?: Record<string, any>, sourceComponent?: string) => Promise<boolean>;
  toggleIntervention: (interventionId: string) => Promise<boolean>;
  resetScenario: () => Promise<boolean>;
  refreshState: () => Promise<void>;
}

const DecisionStateContext = createContext<DecisionStateContextValue | undefined>(undefined);

export function DecisionStateProvider({ children }: { children: ReactNode }) {
  const [decisionState, setDecisionState] = useState<DecisionState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshState = useCallback(async () => {
    const sessionId = getOrCreateSessionId();
    setLoading(true);
    try {
      const state = await fetchCurrentDecisionState(sessionId);
      if (state) {
        setDecisionState(state);
        setError(null);
      } else {
        setError('Could not retrieve enterprise decision state');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const executeCommand = async (
    commandType: DecisionCommandType,
    payload: Record<string, any> = {},
    sourceComponent?: string
  ): Promise<boolean> => {
    if (!decisionState) return false;

    const result = await executeDecisionCommand(
      decisionState.decision_state_id,
      commandType,
      decisionState.state_version,
      payload,
      sourceComponent
    );

    if (result.status === 'success' && result.state) {
      setDecisionState(result.state);
      setError(null);
      return true;
    } else if (result.status === 'conflict') {
      // Optimistic concurrency conflict: retry by refreshing first
      console.warn('[DecisionStateContext] Version conflict encountered. Refreshing state...');
      await refreshState();
      return false;
    } else {
      setError(result.error || 'Failed to update decision state');
      return false;
    }
  };

  const toggleIntervention = async (interventionId: string): Promise<boolean> => {
    if (!decisionState) return false;
    const isSelected = decisionState.selected_interventions.includes(interventionId);
    const commandType: DecisionCommandType = isSelected ? 'DESELECT_INTERVENTION' : 'SELECT_INTERVENTION';
    return await executeCommand(commandType, { intervention_id: interventionId }, 'toggle_intervention');
  };

  const resetScenario = async (): Promise<boolean> => {
    if (!decisionState) return false;
    const resetRes = await resetDecisionState(decisionState.decision_state_id);
    if (resetRes) {
      setDecisionState(resetRes);
      setError(null);
      return true;
    }
    return false;
  };

  return (
    <DecisionStateContext.Provider
      value={{
        decisionState,
        loading,
        error,
        executeCommand,
        toggleIntervention,
        resetScenario,
        refreshState
      }}
    >
      {children}
    </DecisionStateContext.Provider>
  );
}

export function useDecisionState() {
  const context = useContext(DecisionStateContext);
  if (!context) {
    throw new Error('useDecisionState must be used within a DecisionStateProvider');
  }
  return context;
}
