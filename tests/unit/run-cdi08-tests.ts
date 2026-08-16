/**
 * CogniX CDI-08 — Observation Correspondence & Prediction Envelope Test Suite
 *
 * Adversarial test suite implementing attacks A-01 through A-30 from the frozen gate:
 * docs/reports/COGNIX_CDI_08_OBSERVATION_CORRESPONDENCE_DESIGN_GATE.md §6.
 */

import {
  DecisionContract,
  DeclaredPredictionEnvelope,
  ComparisonSetInvariants,
  computeContractDigest,
  computeDecisionBasisDigest,
  validateDecisionContract,
  assertGrainResolves,
  requiredGrainDimensions,
  normalizeGrainToken,
  entityCoversSingleDimension,
  OutcomeObservation,
  PredictionOutcomeComparison,
  QuantityComparison,
  ComparabilityVerdict,
  ComparisonVerdict,
  PREDICTION_ENVELOPE_REQUIRED_INPUT,
  COMPOSITE_GRAIN_OBSERVATION_REQUIRED_INPUT,
  METRIC_CORRESPONDENT_SIGNAL_TYPES
} from '../../packages/contracts/src/index';

import {
  createDecisionContract
} from '../../lib/campaign-decision-contract-engine';

import {
  comparePredictionToReality,
  evaluateComparability,
  deriveObservedBasis,
  evaluateLearningEligibility
} from '../../lib/campaign-learning-loop-engine';

import {
  clearCampaignIntents,
  registerCampaignIntent
} from '../../lib/campaign-intent-store';
import { createDefaultCampaignIntentDraft } from '../../packages/contracts/src/campaign-intent-model';
import { evaluateOutcomeFrontier } from '../../lib/campaign-frontier-engine';
import { decisionContractStore } from '../../lib/decision-contract-store';
import { preMortemStore } from '../../lib/pre-mortem-store';
import { learningCandidateStore } from '../../lib/learning-candidate-store';
import { registerExternalSignalConnector } from '../../services/world/src/external-signal-connector';

const TENANT_A = 'tenant_uk_retail_01';
const TENANT_B = 'tenant_uk_retail_02';
const SESS_X = 'sess_cdi08_x';
const SESS_Y = 'sess_cdi08_y';
const TS = '2026-08-20T12:00:00.000Z';
const START_DATE = '2026-08-22T00:00:00.000Z';
const END_DATE = '2026-09-05T00:00:00.000Z';
const GROSS_FIELD = 'play.decomposition.reconciliation.reconciled_sum_pp';

// Register authoritative test connector
registerExternalSignalConnector({
  connector_id: 'conn_planning_auth_01',
  category: 'PLANNING',
  display_name: 'Authoritative Planning Feed',
  provider_id: 'planning_prod',
  supported_signal_types: [
    'CATEGORY_DEMAND_ACCELERATION',
    'ORDER_VELOCITY_ACCELERATION',
    'WEATHER_TEMPERATURE_ANOMALY' as any
  ],
  status: 'AVAILABLE',
  synthetic_demo: false,
  adapter_version: 'esf3_adapter_v1.0.0',
  schema_version: '1.0'
}, 'LAB_FIXTURE_NOT_AN_ATTESTATION');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passCount++;
    console.log(`[PASS] ${testName}`);
  } else {
    failCount++;
    console.error(`[FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
  }
}

function clearStores() {
  decisionContractStore.clear();
  preMortemStore.clear();
  learningCandidateStore.clear();
  clearCampaignIntents();
}

function makeContract(
  session = SESS_X,
  tenant = TENANT_A,
  envelopes: DeclaredPredictionEnvelope[] = []
): DecisionContract {
  clearStores();
  const draft = createDefaultCampaignIntentDraft(tenant, session);
  draft.campaign_intent.framing_question = 'CDI-08 observation correspondence test';
  draft.campaign_intent.category = 'Fresh Dairy';
  draft.campaign_intent.sku_scope = ['P004', 'P007'];
  draft.campaign_intent.provisional_mechanic = 'price_cut';
  draft.campaign_intent.provisional_discount_depth = 20;
  draft.baseline_objective.primary_metric = 'VOLUME';
  draft.audience_market.region = 'North West';
  draft.audience_market.customer_segment = 'Family Shoppers';
  draft.audience_market.timing_mode = 'KNOWN_DATES';
  draft.audience_market.planned_start = START_DATE;
  draft.audience_market.planned_end = END_DATE;

  const intent = registerCampaignIntent(draft);

  const frontierRes = evaluateOutcomeFrontier({
    tenant_id: tenant,
    session_id: session,
    campaign_intent_id: intent.campaign_intent_id,
    evaluation_timestamp: TS
  });
  const frontier = frontierRes.frontier;
  const play = frontier.plays.find(p => p.admissibility === 'ADMISSIBLE') || frontier.plays[0];

  const contract = createDecisionContract({
    tenant_id: tenant,
    session_id: session,
    frontier,
    campaign_intent: intent,
    resolution: {
      route: 'HUMAN_RESOLVED',
      selected_play_id: play.play_id,
      resolved_by: 'cdi08.lead@retail',
      resolution_statement: 'CDI-08 test resolution'
    },
    created_as_of: TS,
    prediction_envelopes: envelopes
  });

  return contract;
}

function contractWithInvariants(
  invariants: Partial<ComparisonSetInvariants>,
  envelopes: DeclaredPredictionEnvelope[] = []
): DecisionContract {
  const base = makeContract(SESS_X, TENANT_A, envelopes);
  return {
    ...base,
    basis: {
      ...base.basis,
      comparison_invariants: {
        ...base.basis.comparison_invariants,
        ...invariants
      }
    }
  };
}

function makeObservation(
  contract: DecisionContract,
  overrides: Partial<OutcomeObservation> = {}
): OutcomeObservation {
  return {
    observation_id: `obs_${Math.random().toString(36).substr(2, 9)}`,
    tenant_id: contract.tenant_id,
    session_id: contract.session_id,
    signal_id: 'sig_cdi08_01',
    connector_id: 'conn_planning_auth_01',
    external_category: 'PLANNING',
    signal_type: 'CATEGORY_DEMAND_ACCELERATION',
    source_type: 'PLANNING_SYSTEM',
    entity_type: 'CATEGORY',
    entity_id: contract.basis.comparison_invariants.category || 'Fresh Dairy',
    baseline_value: 100,
    observed_value: 110,
    delta_pct: 10,
    unit: 'pp',
    observed_at: '2026-08-25T10:00:00.000Z',
    effective_at: '2026-08-25T10:00:00.000Z',
    measurement_window_start: contract.basis.comparison_invariants.planned_start || START_DATE,
    measurement_window_end: contract.basis.comparison_invariants.planned_end || END_DATE,
    measurement_design: 'DIRECT_MEASUREMENT',
    authority: 'AUTHORITATIVE_EXTERNAL',
    provenance: {
      origin: 'ESF-3_CONNECTOR',
      connector_id: 'conn_planning_auth_01',
      envelope_id: 'env_cdi08_01',
      metrics_supplied: true,
      synthetic_demo: false
    },
    completeness: {
      covered_quantities: [],
      missing_quantities: [],
      window_start_observed: true,
      window_end_observed: true,
      adapter_capability_gap: false,
      gap_reasons: [],
      complete: true
    },
    synthetic_demo: false,
    schema_version: '1.0',
    ...overrides
  };
}

async function runTests() {
  console.log('====================================================');
  console.log('CDI-08 OBSERVATION CORRESPONDENCE ADVERSARIAL SUITE');
  console.log('====================================================\n');

  // --- A-01: Weather pp delta, primary_metric = VOLUME -> METRIC_MISMATCH ---
  {
    const contract = makeContract();
    const weatherObs = makeObservation(contract, {
      signal_type: 'WEATHER_TEMPERATURE_ANOMALY' as any,
      unit: 'pp',
      grain_key: {
        dimensions: [
          { dimension: 'category', token: 'Fresh Dairy' },
          { dimension: 'region', token: 'North West' },
          { dimension: 'sku', token: 'P004|P007' },
          { dimension: 'customer_segment', token: 'Family Shoppers' }
        ]
      }
    });
    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [weatherObs]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(
      grossRow?.comparability === 'METRIC_MISMATCH',
      'A-01: Weather pp delta against VOLUME primary_metric yields METRIC_MISMATCH',
      `got ${grossRow?.comparability}`
    );
    assert(grossRow?.error === undefined, 'A-01b: METRIC_MISMATCH never produces an error value');
  }

  // --- A-02: Contract with blank comparison_invariants -> GRAIN_UNDECLARED ---
  {
    const contract = contractWithInvariants({
      category: '',
      region: '',
      sku_scope: [],
      customer_segment: ''
    });
    const obs = makeObservation(contract, {
      entity_id: ''
    });
    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [obs]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(
      grossRow?.comparability === 'GRAIN_UNDECLARED',
      'A-02: Blank comparison_invariants yields GRAIN_UNDECLARED',
      `got ${grossRow?.comparability}`
    );
  }

  // --- A-03: Contract with planned_start = null -> WINDOW_UNDECLARED ---
  {
    const contract = contractWithInvariants({
      planned_start: null
    });
    const obs = makeObservation(contract, {
      grain_key: {
        dimensions: [
          { dimension: 'category', token: 'Fresh Dairy' },
          { dimension: 'region', token: 'North West' },
          { dimension: 'sku', token: 'P004|P007' },
          { dimension: 'customer_segment', token: 'Family Shoppers' }
        ]
      }
    });
    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [obs]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(
      grossRow?.comparability === 'WINDOW_UNDECLARED',
      'A-03: planned_start = null yields WINDOW_UNDECLARED',
      `got ${grossRow?.comparability}`
    );
  }

  // --- A-04: Contract with planned_end = null -> WINDOW_UNDECLARED ---
  {
    const contract = contractWithInvariants({
      planned_end: null
    });
    const obs = makeObservation(contract, {
      grain_key: {
        dimensions: [
          { dimension: 'category', token: 'Fresh Dairy' },
          { dimension: 'region', token: 'North West' },
          { dimension: 'sku', token: 'P004|P007' },
          { dimension: 'customer_segment', token: 'Family Shoppers' }
        ]
      }
    });
    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [obs]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(
      grossRow?.comparability === 'WINDOW_UNDECLARED',
      'A-04: planned_end = null yields WINDOW_UNDECLARED',
      `got ${grossRow?.comparability}`
    );
  }

  // --- A-05: Observation from Tenant B, Session Y; contract Tenant A, Session X -> TENANT_SESSION_MISMATCH ---
  {
    const contract = makeContract(SESS_X, TENANT_A);
    const foreignTenantObs = makeObservation(contract, {
      tenant_id: TENANT_B,
      session_id: SESS_Y,
      grain_key: {
        dimensions: [
          { dimension: 'category', token: 'Fresh Dairy' },
          { dimension: 'region', token: 'North West' },
          { dimension: 'sku', token: 'P004|P007' },
          { dimension: 'customer_segment', token: 'Family Shoppers' }
        ]
      }
    });
    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [foreignTenantObs]
    });
    assert(
      cmp.tenant_id === TENANT_A,
      'A-05: comparison.tenant_id is preserved as Tenant A'
    );
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(
      grossRow?.comparability === 'OBSERVATION_ABSENT' || grossRow?.comparability === 'TENANT_SESSION_MISMATCH',
      'A-05b: foreign tenant observation never binds to contract'
    );
    const directVerdict = evaluateComparability(
      'pp',
      'GROSS',
      foreignTenantObs,
      {} as any,
      contract.basis.comparison_invariants,
      { tenant_id: contract.tenant_id, session_id: contract.session_id }
    );
    assert(
      directVerdict === 'TENANT_SESSION_MISMATCH',
      'A-05c: evaluateComparability returns TENANT_SESSION_MISMATCH on foreign tenant'
    );
  }

  // --- A-06: Same tenant, different session -> TENANT_SESSION_MISMATCH ---
  {
    const contract = makeContract(SESS_X, TENANT_A);
    const foreignSessionObs = makeObservation(contract, {
      tenant_id: TENANT_A,
      session_id: SESS_Y
    });
    const directVerdict = evaluateComparability(
      'pp',
      'GROSS',
      foreignSessionObs,
      {} as any,
      contract.basis.comparison_invariants,
      { tenant_id: contract.tenant_id, session_id: contract.session_id }
    );
    assert(
      directVerdict === 'TENANT_SESSION_MISMATCH',
      'A-06: Different session returns TENANT_SESSION_MISMATCH'
    );
  }

  // --- A-07: Grain category x region; two marginal observations (one CATEGORY, one REGION) -> GRAIN_MISMATCH ---
  {
    const contract = contractWithInvariants({
      category: 'Fresh Dairy',
      region: 'North West',
      sku_scope: [],
      customer_segment: ''
    });
    const catObs = makeObservation(contract, {
      entity_type: 'CATEGORY',
      entity_id: 'Fresh Dairy',
      grain_key: undefined
    });
    const regObs = makeObservation(contract, {
      entity_type: 'REGION',
      entity_id: 'North West',
      grain_key: undefined
    });
    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [catObs, regObs]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(
      grossRow?.comparability === 'OBSERVATION_ABSENT' || grossRow?.comparability === 'GRAIN_MISMATCH',
      'A-07: Marginal observations cannot combine to resolve joint grain (Z4)',
      `got ${grossRow?.comparability}`
    );
  }

  // --- A-08: Grain category x region; composite key {category, region} token-exact -> Binds (LE-3 unlock!) ---
  {
    const contract = contractWithInvariants({
      category: 'Fresh Dairy',
      region: 'North West',
      sku_scope: [],
      customer_segment: ''
    });
    const compositeObs = makeObservation(contract, {
      grain_key: {
        dimensions: [
          { dimension: 'category', token: 'Fresh Dairy' },
          { dimension: 'region', token: 'North West' }
        ]
      }
    });
    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [compositeObs]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(
      grossRow?.comparability === 'LIKE_FOR_LIKE',
      'A-08: Composite grain matching exact set and tokens resolves LIKE_FOR_LIKE (Z4 unlock)',
      `got ${grossRow?.comparability}`
    );
    assert(grossRow?.observed_observation_id === compositeObs.observation_id, 'A-08b: composite observation bound');
  }

  // --- A-09: Grain category x region; composite key {category, region, sku} -> GRAIN_MISMATCH (extra dimension) ---
  {
    const contract = contractWithInvariants({
      category: 'Fresh Dairy',
      region: 'North West',
      sku_scope: [],
      customer_segment: ''
    });
    const extraDimObs = makeObservation(contract, {
      grain_key: {
        dimensions: [
          { dimension: 'category', token: 'Fresh Dairy' },
          { dimension: 'region', token: 'North West' },
          { dimension: 'sku', token: 'P004' }
        ]
      }
    });
    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [extraDimObs]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(
      grossRow?.comparability === 'OBSERVATION_ABSENT' || grossRow?.comparability === 'GRAIN_MISMATCH',
      'A-09: Extra grain dimension fails with GRAIN_MISMATCH / OBSERVATION_ABSENT',
      `got ${grossRow?.comparability}`
    );
  }

  // --- A-10: Grain category x region; composite key {category} -> GRAIN_MISMATCH (missing dimension) ---
  {
    const contract = contractWithInvariants({
      category: 'Fresh Dairy',
      region: 'North West',
      sku_scope: [],
      customer_segment: ''
    });
    const missingDimObs = makeObservation(contract, {
      grain_key: {
        dimensions: [
          { dimension: 'category', token: 'Fresh Dairy' }
        ]
      }
    });
    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [missingDimObs]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(
      grossRow?.comparability === 'OBSERVATION_ABSENT' || grossRow?.comparability === 'GRAIN_MISMATCH',
      'A-10: Missing grain dimension fails with GRAIN_MISMATCH / OBSERVATION_ABSENT',
      `got ${grossRow?.comparability}`
    );
  }

  // --- A-11: sku_scope = [P004, P007]; observation SKU key P004 -> GRAIN_MISMATCH ---
  {
    const contract = contractWithInvariants({
      category: '',
      region: '',
      sku_scope: ['P004', 'P007'],
      customer_segment: ''
    });
    const singleSkuObs = makeObservation(contract, {
      grain_key: {
        dimensions: [
          { dimension: 'sku', token: 'P004' }
        ]
      }
    });
    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [singleSkuObs]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(
      grossRow?.comparability === 'OBSERVATION_ABSENT' || grossRow?.comparability === 'GRAIN_MISMATCH',
      'A-11: Single SKU member does not resolve multi-SKU scope',
      `got ${grossRow?.comparability}`
    );
  }

  // --- A-12: Composite key token "Fresh Dairy and Frozen" against contracted "Fresh Dairy" -> GRAIN_MISMATCH ---
  {
    const contract = contractWithInvariants({
      category: 'Fresh Dairy',
      region: '',
      sku_scope: [],
      customer_segment: ''
    });
    const broaderObs = makeObservation(contract, {
      grain_key: {
        dimensions: [
          { dimension: 'category', token: 'Fresh Dairy and Frozen' }
        ]
      }
    });
    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [broaderObs]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(
      grossRow?.comparability === 'OBSERVATION_ABSENT' || grossRow?.comparability === 'GRAIN_MISMATCH',
      'A-12: Broader category token fails token exact identity under composite key (RB-4)',
      `got ${grossRow?.comparability}`
    );
  }

  // --- A-13: 3-day measurement window inside a 14-day contracted window -> WINDOW_MISMATCH ---
  {
    const contract = contractWithInvariants({
      category: 'Fresh Dairy',
      region: '',
      sku_scope: [],
      customer_segment: '',
      planned_start: '2026-08-01T00:00:00.000Z',
      planned_end: '2026-08-15T00:00:00.000Z'
    });
    const shortWindowObs = makeObservation(contract, {
      entity_type: 'CATEGORY',
      entity_id: 'Fresh Dairy',
      grain_key: undefined,
      measurement_window_start: '2026-08-01T00:00:00.000Z',
      measurement_window_end: '2026-08-04T00:00:00.000Z'
    });
    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [shortWindowObs]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(
      grossRow?.comparability === 'WINDOW_MISMATCH',
      'A-13: Partial measurement window fails exact coverage with WINDOW_MISMATCH',
      `got ${grossRow?.comparability}`
    );
  }

  // --- A-14: Measurement window one day wider than contracted -> WINDOW_MISMATCH ---
  {
    const contract = contractWithInvariants({
      category: 'Fresh Dairy',
      region: '',
      sku_scope: [],
      customer_segment: '',
      planned_start: '2026-08-01T00:00:00.000Z',
      planned_end: '2026-08-15T00:00:00.000Z'
    });
    const widerWindowObs = makeObservation(contract, {
      entity_type: 'CATEGORY',
      entity_id: 'Fresh Dairy',
      grain_key: undefined,
      measurement_window_start: '2026-08-01T00:00:00.000Z',
      measurement_window_end: '2026-08-16T00:00:00.000Z'
    });
    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [widerWindowObs]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(
      grossRow?.comparability === 'WINDOW_MISMATCH',
      'A-14: Wider measurement window fails with WINDOW_MISMATCH',
      `got ${grossRow?.comparability}`
    );
  }

  // --- A-15: No measurement window; effective_at inside contracted window -> WINDOW_MISMATCH ---
  {
    const contract = contractWithInvariants({
      category: 'Fresh Dairy',
      region: '',
      sku_scope: [],
      customer_segment: '',
      planned_start: '2026-08-01T00:00:00.000Z',
      planned_end: '2026-08-15T00:00:00.000Z'
    });
    const instantObs = makeObservation(contract, {
      entity_type: 'CATEGORY',
      entity_id: 'Fresh Dairy',
      grain_key: undefined,
      measurement_window_start: undefined,
      measurement_window_end: undefined,
      effective_at: '2026-08-05T00:00:00.000Z'
    });
    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [instantObs]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(
      grossRow?.comparability === 'WINDOW_MISMATCH',
      'A-15: Degenerate instant measurement window fails multi-day campaign with WINDOW_MISMATCH',
      `got ${grossRow?.comparability}`
    );
  }

  // --- A-16: measurement_design absent -> QUANTITY_BASIS_UNDECLARED; observed_basis not written ---
  {
    const contract = contractWithInvariants({
      category: 'Fresh Dairy',
      region: '',
      sku_scope: [],
      customer_segment: ''
    });
    const noDesignObs = makeObservation(contract, {
      entity_type: 'CATEGORY',
      entity_id: 'Fresh Dairy',
      grain_key: undefined,
      measurement_design: undefined
    });
    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [noDesignObs]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(
      grossRow?.comparability === 'QUANTITY_BASIS_UNDECLARED',
      'A-16: Absent measurement_design yields QUANTITY_BASIS_UNDECLARED',
      `got ${grossRow?.comparability}`
    );
    assert(
      grossRow?.observed_basis === undefined,
      'A-16b: observed_basis is NOT written when measurement_design is unstated'
    );
  }

  // --- A-17: measurement_design = 'CONTROLLED_DIFFERENCE' -> Rejected / NO_OBSERVED_COUNTERFACTUAL ---
  {
    const contract = contractWithInvariants({
      category: 'Fresh Dairy',
      region: '',
      sku_scope: [],
      customer_segment: ''
    });
    const ctrlDiffObs = makeObservation(contract, {
      entity_type: 'CATEGORY',
      entity_id: 'Fresh Dairy',
      grain_key: undefined,
      measurement_design: 'CONTROLLED_DIFFERENCE'
    });
    const derived = deriveObservedBasis(ctrlDiffObs);
    assert(
      derived === 'CONTROLLED_DIFFERENCE_REJECTED',
      'A-17: CONTROLLED_DIFFERENCE rejected by deriveObservedBasis'
    );
    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [ctrlDiffObs]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(
      grossRow?.comparability === 'NO_OBSERVED_COUNTERFACTUAL',
      'A-17b: CONTROLLED_DIFFERENCE yields NO_OBSERVED_COUNTERFACTUAL (no attributable comparison manufactured)'
    );
  }

  // --- A-18: predicted_basis = 'ATTRIBUTABLE', GROSS observation -> NO_OBSERVED_COUNTERFACTUAL ---
  {
    const contract = makeContract();
    const obs = makeObservation(contract);
    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [obs]
    });
    const attrRow = cmp.comparisons.find(c => c.predicted_basis === 'ATTRIBUTABLE');
    assert(
      attrRow?.comparability === 'NO_OBSERVED_COUNTERFACTUAL',
      'A-18: ATTRIBUTABLE prediction against GROSS observation yields NO_OBSERVED_COUNTERFACTUAL'
    );
  }

  // --- A-19: Contract with prediction_envelopes: [] -> LE-7 unmet, verdict INDETERMINATE ---
  {
    const contract = contractWithInvariants({
      category: 'Fresh Dairy',
      region: '',
      sku_scope: [],
      customer_segment: ''
    }, []);
    const obs = makeObservation(contract, {
      entity_type: 'CATEGORY',
      entity_id: 'Fresh Dairy',
      grain_key: undefined
    });
    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [obs]
    });
    assert(
      cmp.verdict === 'INDETERMINATE',
      'A-19: Contract with prediction_envelopes: [] leaves verdict as INDETERMINATE'
    );
    const elig = evaluateLearningEligibility(contract, cmp);
    const le7 = elig.conditions.find(c => c.condition_id === 'LE-7');
    assert(
      le7?.met === false,
      'A-19b: LE-7 is unmet when no envelope is declared'
    );
  }

  // --- A-20: Envelope declared; signed error outside it; witness NONE -> OUTSIDE_DECLARED_ENVELOPE ---
  {
    const env: DeclaredPredictionEnvelope = {
      envelope_id: 'env_tol_01',
      applies_to_field_path: GROSS_FIELD,
      lower: -2.0,
      upper: 2.0,
      unit: 'pp',
      basis: 'GROSS',
      declared_by: 'cdi08.owner@retail',
      declaration_statement: 'Executive tolerance ±2pp',
      tolerance_kind: 'DECLARED_ACCEPTANCE_TOLERANCE',
      derivation: 'HUMAN_DECLARED',
      pre_declaration_witness: 'NONE'
    };
    const contract = contractWithInvariants({
      category: 'Fresh Dairy',
      region: '',
      sku_scope: [],
      customer_segment: ''
    }, [env]);

    // Error is +10pp vs ~3.1pp -> delta ~ +6.9pp (outside [-2, +2])
    const obs = makeObservation(contract, {
      entity_type: 'CATEGORY',
      entity_id: 'Fresh Dairy',
      grain_key: undefined,
      delta_pct: 10
    });
    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [obs]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(
      grossRow?.error?.within_declared_envelope === false,
      'A-20: Signed error outside envelope sets within_declared_envelope: false'
    );
    assert(
      cmp.verdict === 'OUTSIDE_DECLARED_ENVELOPE',
      'A-20b: Comparison verdict is OUTSIDE_DECLARED_ENVELOPE (LE-7 unlock)'
    );
  }

  // --- A-21: Envelope declared; signed error inside it; witness NONE -> WITHIN withheld, INDETERMINATE ---
  {
    const env: DeclaredPredictionEnvelope = {
      envelope_id: 'env_tol_02',
      applies_to_field_path: GROSS_FIELD,
      lower: -5.0,
      upper: 5.0,
      unit: 'pp',
      basis: 'GROSS',
      declared_by: 'cdi08.owner@retail',
      declaration_statement: 'Executive tolerance ±5pp',
      tolerance_kind: 'DECLARED_ACCEPTANCE_TOLERANCE',
      derivation: 'HUMAN_DECLARED',
      pre_declaration_witness: 'NONE'
    };
    const contract = contractWithInvariants({
      category: 'Fresh Dairy',
      region: '',
      sku_scope: [],
      customer_segment: ''
    }, [env]);

    // Set observed delta to equal predicted value so signed delta is 0 (inside envelope)
    const snapVal = (contract.basis.decomposition_snapshot.find(s => s.source_field_path === GROSS_FIELD)?.value as number) || 3.1;
    const obs = makeObservation(contract, {
      entity_type: 'CATEGORY',
      entity_id: 'Fresh Dairy',
      grain_key: undefined,
      delta_pct: snapVal
    });
    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [obs]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(
      grossRow?.error?.within_declared_envelope === undefined,
      'A-21: Signed error inside envelope with witness NONE leaves within_declared_envelope unset'
    );
    assert(
      !!grossRow?.error?.within_withheld_reason,
      'A-21b: within_withheld_reason is populated'
    );
    assert(
      cmp.verdict === 'INDETERMINATE',
      'A-21c: Comparison verdict remains INDETERMINATE (WITHIN is structurally unreachable under Z2)'
    );
  }

  // --- A-22: Envelope inserted or edited after creation -> contract_digest mismatch ---
  {
    const contract = makeContract(SESS_X, TENANT_A, []);
    const digestBefore = computeContractDigest(contract);
    // Mutate prediction_envelopes
    const mutated = {
      ...contract,
      prediction_envelopes: [
        {
          envelope_id: 'env_hacked',
          applies_to_field_path: GROSS_FIELD,
          lower: -1,
          upper: 1,
          unit: 'pp',
          basis: 'GROSS' as const,
          declared_by: 'hacker',
          declaration_statement: 'post hoc',
          tolerance_kind: 'DECLARED_ACCEPTANCE_TOLERANCE' as const,
          derivation: 'HUMAN_DECLARED' as const,
          pre_declaration_witness: 'NONE' as const
        }
      ]
    };
    const digestAfter = computeContractDigest(mutated);
    assert(
      digestBefore !== digestAfter,
      'A-22: contract_digest changes when prediction_envelopes is edited post-creation'
    );
  }

  // --- A-23: Envelope added -> decision_basis_digest UNCHANGED, contract_digest CHANGED ---
  {
    const contract = makeContract(SESS_X, TENANT_A, []);
    const basisDigestBefore = computeDecisionBasisDigest(contract.basis);
    const contractDigestBefore = computeContractDigest(contract);

    const withEnv = {
      ...contract,
      prediction_envelopes: [
        {
          envelope_id: 'env_z1',
          applies_to_field_path: GROSS_FIELD,
          lower: -2,
          upper: 2,
          unit: 'pp',
          basis: 'GROSS' as const,
          declared_by: 'lead',
          declaration_statement: 'Z1 boundary test',
          tolerance_kind: 'DECLARED_ACCEPTANCE_TOLERANCE' as const,
          derivation: 'HUMAN_DECLARED' as const,
          pre_declaration_witness: 'NONE' as const
        }
      ]
    };
    const basisDigestAfter = computeDecisionBasisDigest(withEnv.basis);
    const contractDigestAfter = computeContractDigest(withEnv);

    assert(
      basisDigestBefore === basisDigestAfter,
      'A-23: decision_basis_digest is UNTOUCHED by prediction_envelopes (Z1)'
    );
    assert(
      contractDigestBefore !== contractDigestAfter,
      'A-23b: contract_digest COVERS prediction_envelopes automatically'
    );
  }

  // --- A-24: Envelope applies_to_field_path naming unpublished snapshot -> rejected ---
  {
    let rejected = false;
    try {
      const badEnv: DeclaredPredictionEnvelope = {
        envelope_id: 'env_bad_path',
        applies_to_field_path: 'nonexistent.snapshot.path',
        lower: -1,
        upper: 1,
        unit: 'pp',
        basis: 'GROSS',
        declared_by: 'lead',
        declaration_statement: 'Invalid path test',
        tolerance_kind: 'DECLARED_ACCEPTANCE_TOLERANCE',
        derivation: 'HUMAN_DECLARED',
        pre_declaration_witness: 'NONE'
      };
      makeContract(SESS_X, TENANT_A, [badEnv]);
    } catch (e: any) {
      rejected = true;
    }
    assert(
      rejected,
      'A-24: Unpublished snapshot path in envelope rejected at contract creation (C-INV-ENV-1)'
    );
  }

  // --- A-25: Envelope unit or basis differing from snapshot -> rejected ---
  {
    let rejected = false;
    try {
      const badUnitEnv: DeclaredPredictionEnvelope = {
        envelope_id: 'env_bad_unit',
        applies_to_field_path: GROSS_FIELD,
        lower: -1,
        upper: 1,
        unit: 'gbp', // Wrong unit (snapshot is pp)
        basis: 'GROSS',
        declared_by: 'lead',
        declaration_statement: 'Wrong unit test',
        tolerance_kind: 'DECLARED_ACCEPTANCE_TOLERANCE',
        derivation: 'HUMAN_DECLARED',
        pre_declaration_witness: 'NONE'
      };
      makeContract(SESS_X, TENANT_A, [badUnitEnv]);
    } catch (e: any) {
      rejected = true;
    }
    assert(
      rejected,
      'A-25: Mismatched envelope unit/basis rejected at contract creation (C-INV-ENV-2)'
    );
  }

  // --- A-26: Envelope with empty declared_by -> rejected ---
  {
    let rejected = false;
    try {
      const badDeclaredByEnv: DeclaredPredictionEnvelope = {
        envelope_id: 'env_bad_decl',
        applies_to_field_path: GROSS_FIELD,
        lower: -1,
        upper: 1,
        unit: 'pp',
        basis: 'GROSS',
        declared_by: '   ', // Empty
        declaration_statement: 'Empty declared_by test',
        tolerance_kind: 'DECLARED_ACCEPTANCE_TOLERANCE',
        derivation: 'HUMAN_DECLARED',
        pre_declaration_witness: 'NONE'
      };
      makeContract(SESS_X, TENANT_A, [badDeclaredByEnv]);
    } catch (e: any) {
      rejected = true;
    }
    assert(
      rejected,
      'A-26: Empty declared_by rejected at contract creation (C-INV-ENV-4)'
    );
  }

  // --- A-27: Two envelopes on one applies_to_field_path -> rejected ---
  {
    let rejected = false;
    try {
      const env1: DeclaredPredictionEnvelope = {
        envelope_id: 'env_dup_1',
        applies_to_field_path: GROSS_FIELD,
        lower: -1,
        upper: 1,
        unit: 'pp',
        basis: 'GROSS',
        declared_by: 'lead',
        declaration_statement: 'Duplicate 1',
        tolerance_kind: 'DECLARED_ACCEPTANCE_TOLERANCE',
        derivation: 'HUMAN_DECLARED',
        pre_declaration_witness: 'NONE'
      };
      const env2: DeclaredPredictionEnvelope = {
        envelope_id: 'env_dup_2',
        applies_to_field_path: GROSS_FIELD,
        lower: -2,
        upper: 2,
        unit: 'pp',
        basis: 'GROSS',
        declared_by: 'lead',
        declaration_statement: 'Duplicate 2',
        tolerance_kind: 'DECLARED_ACCEPTANCE_TOLERANCE',
        derivation: 'HUMAN_DECLARED',
        pre_declaration_witness: 'NONE'
      };
      makeContract(SESS_X, TENANT_A, [env1, env2]);
    } catch (e: any) {
      rejected = true;
    }
    assert(
      rejected,
      'A-27: Duplicate envelope on same field path rejected at contract creation (C-INV-ENV-5)'
    );
  }

  // --- A-28: Inadmissible substitutes named in PREDICTION_ENVELOPE_REQUIRED_INPUT ---
  {
    assert(
      PREDICTION_ENVELOPE_REQUIRED_INPUT.inadmissible_substitutes.length >= 6,
      'A-28: PREDICTION_ENVELOPE_REQUIRED_INPUT names all inadmissible substitutes'
    );
    assert(
      PREDICTION_ENVELOPE_REQUIRED_INPUT.enables === 'PRE_DECLARATION_WITNESSED_ENVELOPE',
      'A-28b: PREDICTION_ENVELOPE_REQUIRED_INPUT enables PRE_DECLARATION_WITNESSED_ENVELOPE'
    );
  }

  // --- A-29: METRIC_CORRESPONDENT_SIGNAL_TYPES closed mapping check ---
  {
    assert(
      METRIC_CORRESPONDENT_SIGNAL_TYPES.VOLUME.includes('ORDER_VELOCITY_ACCELERATION') &&
        METRIC_CORRESPONDENT_SIGNAL_TYPES.VOLUME.includes('CATEGORY_DEMAND_ACCELERATION'),
      'A-29: METRIC_CORRESPONDENT_SIGNAL_TYPES for VOLUME populated'
    );
    assert(
      METRIC_CORRESPONDENT_SIGNAL_TYPES.REVENUE.length === 0 &&
        METRIC_CORRESPONDENT_SIGNAL_TYPES.CONTRIBUTION.length === 0 &&
        METRIC_CORRESPONDENT_SIGNAL_TYPES.WASTE_REDUCTION.length === 0 &&
        METRIC_CORRESPONDENT_SIGNAL_TYPES.AVAILABILITY.length === 0,
      'A-29b: Other metrics are strictly empty / refused at this baseline'
    );
  }

  // --- A-30: PREDICTION_ENVELOPE_REQUIRED_INPUT & COMPOSITE_GRAIN_OBSERVATION_REQUIRED_INPUT published ---
  {
    const contract = makeContract();
    const obs = makeObservation(contract);
    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [obs]
    });
    const hasEnv = cmp.unavailable_capabilities.some(
      u => u.enables === 'PRE_DECLARATION_WITNESSED_ENVELOPE'
    );
    const hasComposite = cmp.unavailable_capabilities.some(
      u => u.field === 'composite_grain_observation'
    );
    assert(hasEnv, 'A-30: PREDICTION_ENVELOPE_REQUIRED_INPUT published on comparison');
    assert(hasComposite, 'A-30b: COMPOSITE_GRAIN_OBSERVATION_REQUIRED_INPUT published on comparison');
  }

  console.log('\n====================================================');
  console.log(`CDI-08 RESULTS: ${passCount} passed, ${failCount} failed (target 30+)`);
  console.log('====================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
