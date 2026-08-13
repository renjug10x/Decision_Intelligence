/**
 * Standalone Unit Test Suite for WP10-C Shared Decision State Foundation
 * Tests state initialisation, optimistic concurrency versioning, command transitions,
 * deterministic derived impact recalculations, tenant & session isolation, and reset semantics.
 */

import { decisionStateStore } from '../../lib/decision-state-store';
import { calculateDerivedImpacts } from '../../packages/contracts/src/decision-state-model';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${message}`);
    process.exit(1);
  }
}

function runTests() {
  console.log('=== RUNNING WP10-C SHARED DECISION STATE TESTS ===\n');

  decisionStateStore.clearStore();

  // Test 1: Initialisation from Enterprise World Baseline
  const stateA = decisionStateStore.createOrInitialiseState({
    tenant_id: 'tenant_uk_retail_01',
    session_id: 'ses_test_1001',
    scenario_id: 'SCN-PROMO-01'
  });

  assert(stateA !== null, 'Decision state should be created');
  assert(stateA.state_version === 1, 'Initial state version should be 1');
  assert(stateA.scenario_parameters.promotion_lift === 20, 'Initial promo lift should be 20');
  assert(stateA.derived_impacts.weekly_demand_units === 12000, 'Initial demand units for lift 20% should be 12000');
  console.log('✓ Test 1 Passed: State initialises correctly from baseline');

  // Test 2: Retrieval by ID and Session
  const fetchedById = decisionStateStore.getDecisionStateById(stateA.decision_state_id);
  assert(fetchedById?.decision_state_id === stateA.decision_state_id, 'State should be fetchable by ID');

  const fetchedBySession = decisionStateStore.getCurrentStateBySession('ses_test_1001', 'tenant_uk_retail_01');
  assert(fetchedBySession?.decision_state_id === stateA.decision_state_id, 'State should be fetchable by session_id');
  console.log('✓ Test 2 Passed: Retrieval by ID and Session succeeded');

  // Test 3: Deterministic Command Transition & Versioning
  const transitionRes = decisionStateStore.applyCommandTransition(stateA.decision_state_id, {
    command_type: 'SET_PROMOTION_LIFT',
    expected_version: 1,
    payload: { promotion_lift: 28 },
    source_component: 'UnitTest'
  });

  assert(transitionRes.status === 'success', 'Transition should succeed');
  assert(transitionRes.new_version === 2, 'New version should be 2');
  assert(transitionRes.state.scenario_parameters.promotion_lift === 28, 'Promo lift should update to 28');
  assert(transitionRes.derived_impacts.weekly_demand_units === 12800, 'Derived demand should update to 12800');
  console.log('✓ Test 3 Passed: Valid transition updated state and version to 2');

  // Test 4: Optimistic Concurrency Version Conflict
  const conflictRes = decisionStateStore.applyCommandTransition(stateA.decision_state_id, {
    command_type: 'SET_PROMOTION_LIFT',
    expected_version: 1, // Stale version! Current version is 2
    payload: { promotion_lift: 35 }
  });

  assert(conflictRes.status === 'conflict', 'Stale version update should return conflict status');
  assert(Boolean(conflictRes.error?.includes('Version conflict')), 'Error message should indicate version conflict');
  const checkState = decisionStateStore.getDecisionStateById(stateA.decision_state_id);
  assert(checkState?.state_version === 2, 'State version should remain 2 after conflict');
  assert(checkState?.scenario_parameters.promotion_lift === 28, 'State parameters should remain unchanged at 28');
  console.log('✓ Test 4 Passed: Optimistic concurrency conflict handled correctly');

  // Test 5: Intervention Selection & Derived Capacity Flex
  const interventionRes = decisionStateStore.applyCommandTransition(stateA.decision_state_id, {
    command_type: 'SELECT_INTERVENTION',
    expected_version: 2,
    payload: { intervention_id: 'SLA_FLEX_RULE_4' }
  });

  assert(interventionRes.status === 'success', 'Intervention selection should succeed');
  assert(interventionRes.new_version === 3, 'Version should increment to 3');
  assert(interventionRes.state.selected_interventions.includes('SLA_FLEX_RULE_4'), 'Intervention should be selected');
  assert(interventionRes.derived_impacts.supplier_capacity_units === 12200, 'Flex capacity should add 1200 units (11000 + 1200)');
  console.log('✓ Test 5 Passed: Intervention selection updated capacity flex deterministically');

  // Test 6: Reset to Baseline
  const resetState = decisionStateStore.resetDecisionState(stateA.decision_state_id);
  assert(resetState !== null, 'Reset should succeed');
  assert(resetState?.scenario_parameters.promotion_lift === 20, 'Promo lift restored to baseline 20');
  assert(resetState?.selected_interventions.length === 0, 'Selected interventions cleared');
  assert(resetState?.state_version === 4, 'Reset increments version history to 4');
  console.log('✓ Test 6 Passed: Reset to baseline succeeded');

  // Test 7: Session Isolation (Two concurrent sessions)
  const sessionAState = decisionStateStore.createOrInitialiseState({
    tenant_id: 'tenant_uk_retail_01',
    session_id: 'ses_user_alpha'
  });

  const sessionBState = decisionStateStore.createOrInitialiseState({
    tenant_id: 'tenant_uk_retail_01',
    session_id: 'ses_user_beta'
  });

  assert(sessionAState.decision_state_id !== sessionBState.decision_state_id, 'Sessions must have distinct DecisionState IDs');

  // Mutate Session A
  decisionStateStore.applyCommandTransition(sessionAState.decision_state_id, {
    command_type: 'SET_PROMOTION_LIFT',
    expected_version: 1,
    payload: { promotion_lift: 35 }
  });

  const finalA = decisionStateStore.getDecisionStateById(sessionAState.decision_state_id);
  const finalB = decisionStateStore.getDecisionStateById(sessionBState.decision_state_id);

  assert(finalA?.scenario_parameters.promotion_lift === 35, 'Session A should update to 35');
  assert(finalB?.scenario_parameters.promotion_lift === 20, 'Session B should remain unaffected at 20');
  console.log('✓ Test 7 Passed: Session isolation verified (Session A changes do not mutate Session B)');

  console.log('\n✅ ALL WP10-C SHARED DECISION STATE TESTS PASSED SUCCESSFULLY!\n');
}

runTests();
