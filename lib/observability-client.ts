/**
 * CogniX Observability Client (SCI-06)
 * ───────────────────────────────────────────────────────────────────────────────
 * Client-side interface to Living Evidence, Refresh Operation, and Models & Methods.
 * Consumes the frozen Gate-A contracts from `packages/contracts/src/living-evidence-contracts.ts`.
 *
 * Concurrency Boundary:
 * Under ADR-084, SCI-05 owns domain derivation engines. This module consumes the contract
 * shape, querying the living evidence endpoints or falling back to contract-valid fixtures
 * during isolated Wave-2 development prior to Gate-C integration.
 */

import {
  RefreshDelta,
  MethodsRegister
} from '@/packages/contracts/src/living-evidence-contracts';
import {
  getLivingEvidenceFixtureForScenario,
  LivingEvidenceScenarioData
} from './fixtures/living-evidence-fixtures';

export type RefreshLifecycleState = 'idle' | 'refreshing' | 'refreshed' | 'unchanged' | 'failed';

export interface RefreshOperationResult {
  status: 'success' | 'failed';
  state: RefreshLifecycleState;
  delta: RefreshDelta | null;
  error?: string;
  hasChanged: boolean;
}

/**
 * Retrieves living evidence signals for the active scenario.
 * Strictly binds to the active scenario clock (never wall-clock).
 */
export async function getLivingEvidence(scenarioId: string): Promise<LivingEvidenceScenarioData> {
  // During isolated Wave-2 execution before Gate C, consume contract-valid fixtures
  // ensuring complete type safety and zero domain derivation on client.
  return getLivingEvidenceFixtureForScenario(scenarioId);
}

/**
 * Executes the governed Refresh Operation for the active scenario.
 * Communicates the full lifecycle: refreshing -> refreshed (changed / unchanged) or failed.
 */
export async function triggerScenarioRefresh(
  scenarioId: string,
  mode: 'toggle' | 'force_changed' | 'force_unchanged' | 'force_fail' = 'toggle',
  previousChangedState?: boolean
): Promise<RefreshOperationResult> {
  // Simulate network dispatch with guaranteed determinism
  await new Promise(r => setTimeout(r, 450));

  if (mode === 'force_fail') {
    return {
      status: 'failed',
      state: 'failed',
      delta: null,
      error: 'Refresh operation failed: scenario evidence connector timed out',
      hasChanged: false
    };
  }

  const fixture = getLivingEvidenceFixtureForScenario(scenarioId);

  let shouldChange = true;
  if (mode === 'force_changed') shouldChange = true;
  else if (mode === 'force_unchanged') shouldChange = false;
  else if (mode === 'toggle') shouldChange = !previousChangedState;

  const delta = shouldChange ? fixture.refresh_changed : fixture.refresh_unchanged;
  const isChanged = delta.material_movements.length > 0 || delta.decision_changes.length > 0;

  return {
    status: 'success',
    state: isChanged ? 'refreshed' : 'unchanged',
    delta,
    hasChanged: isChanged
  };
}

/**
 * Retrieves the Models & Methods register for the active scenario.
 */
export async function getMethodsRegister(scenarioId: string): Promise<MethodsRegister> {
  const fixture = getLivingEvidenceFixtureForScenario(scenarioId);
  return fixture.methods_register;
}
