/**
 * CogniX ESF-6 / Y3a — Attested Observation Admission Adversarial Test Suite
 *
 * Implements attacks E-01 through E-36 per
 * docs/reports/COGNIX_ESF_6_ATTESTED_OBSERVATION_ADMISSION_DESIGN_GATE.md §9.
 */

import {
  attestedObservationStore,
  RegisterAttestedSourceRequest,
  ObservationAdmissionRequest,
  AttestedObservationSource,
  ServerReceipt
} from '../../lib/attested-observation-store';
import {
  computeContractDigest,
  validateDecisionContract,
  DeclaredPredictionEnvelope,
  ComparisonSetInvariants,
  DecisionContract,
  OutcomeObservation,
  determineObservationAuthority,
  checkNoReservedServerFields,
  validateSourceAttestation,
  validateAttestedObservationSource,
  validateServerReceipt,
  assertGrainResolves,
  SYNTHETIC_OBSERVATION_DISCLOSURE
} from '../../packages/contracts/src/index';
import { createDecisionContract } from '../../lib/campaign-decision-contract-engine';
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
import * as fs from 'fs';
import * as path from 'path';

const TENANT_A = 'tenant_uk_retail_01';
const TENANT_B = 'tenant_uk_retail_02';
const SESS_X = 'sess_esf6_x';
const SESS_Y = 'sess_esf6_y';
const TS = '2026-08-20T12:00:00.000Z';
const START_DATE = '2026-08-22T00:00:00.000Z';
const END_DATE = '2026-09-05T00:00:00.000Z';
const GROSS_FIELD = 'play.decomposition.reconciliation.reconciled_sum_pp';

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

function clearAll() {
  decisionContractStore.clear();
  preMortemStore.clear();
  learningCandidateStore.clear();
  clearCampaignIntents();
  attestedObservationStore.clear();
}

function registerSourceOk(req: RegisterAttestedSourceRequest): { source: AttestedObservationSource; receipt: ServerReceipt } {
  const res = attestedObservationStore.registerSource(req);
  if (!res.ok) {
    throw new Error(`Expected registerSource to succeed, got errors: ${JSON.stringify(res.errors)}`);
  }
  return res;
}

function admitObservationOk(req: ObservationAdmissionRequest): { observation: OutcomeObservation; receipt: ServerReceipt } {
  const res = attestedObservationStore.admitObservation(req);
  if (!res.ok) {
    throw new Error(`Expected admitObservation to succeed, got rejection: ${res.rejection} (${res.error_details})`);
  }
  return { observation: res.observation!, receipt: res.receipt! };
}

function registerContractOk(contract: DecisionContract): { receipt: ServerReceipt } {
  const res = attestedObservationStore.registerContract(contract);
  if (!res.ok) {
    throw new Error(`Expected registerContract to succeed, got errors: ${JSON.stringify(res.errors)}`);
  }
  return res;
}

function makeContract(
  session = SESS_X,
  tenant = TENANT_A,
  envelopes: DeclaredPredictionEnvelope[] = []
): DecisionContract {
  decisionContractStore.clear();
  preMortemStore.clear();
  learningCandidateStore.clear();
  clearCampaignIntents();

  const draft = createDefaultCampaignIntentDraft(tenant, session);
  draft.campaign_intent.framing_question = 'ESF-6 attested observation test';
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
      resolved_by: 'esf6.lead@retail',
      resolution_statement: 'ESF-6 test resolution'
    },
    created_as_of: TS,
    prediction_envelopes: envelopes
  });

  return contract;
}

/** The §11 reference envelope on the GROSS snapshot path. */
function demoEnvelope(): DeclaredPredictionEnvelope {
  return {
    envelope_id: 'env_demo',
    applies_to_field_path: GROSS_FIELD,
    basis: 'GROSS',
    lower: -5,
    upper: 15,
    unit: 'pp',
    tolerance_kind: 'DECLARED_ACCEPTANCE_TOLERANCE',
    derivation: 'HUMAN_DECLARED',
    declared_by: 'esf6.lead@retail',
    declaration_statement: 'Demo envelope',
    pre_declaration_witness: 'NONE'
  } as DeclaredPredictionEnvelope;
}

/** The §11 reference admission: composite grain, window token-exact to the contract. */
function standardAdmission(sourceId: string): ObservationAdmissionRequest {
  return {
    tenant_id: TENANT_A,
    session_id: SESS_X,
    source_id: sourceId,
    observation_category: 'REALISED_COMMERCIAL_ACTUAL',
    signal_type: 'ORDER_VELOCITY_ACCELERATION',
    grain_key: {
      category: 'Fresh Dairy',
      region: 'North West',
      sku: 'P004|P007',
      customer_segment: 'Family Shoppers'
    },
    measurement_window: { start: START_DATE, end: END_DATE },
    measurement_design: 'DIRECT_MEASUREMENT',
    observed_quantity: 10,
    unit: 'pp'
  } as ObservationAdmissionRequest;
}

function standardSourceReq(tenant = TENANT_A): RegisterAttestedSourceRequest {
  return {
    tenant_id: tenant,
    display_name: 'Reference Attested POS Actuals',
    category: 'COMMERCE',
    observation_categories: ['REALISED_COMMERCIAL_ACTUAL'],
    supported_signal_types: ['ORDER_VELOCITY_ACCELERATION', 'CATEGORY_DEMAND_ACCELERATION'],
    supported_grain_capabilities: [
      { dimensions: ['category'] },
      { dimensions: ['region'] },
      { dimensions: ['category', 'region'] },
      { dimensions: ['category', 'region', 'sku', 'customer_segment'] }
    ],
    supported_measurement_bases: ['DIRECT_MEASUREMENT', 'MODELLED'],
    attestation: {
      attested_by: 'Jane Doe, Head of Commercial Ops',
      attestation_statement: 'First-party EPOS transaction data feeds attested from retail estate',
      attestation_kind: 'FIRST_PARTY_OPERATOR_ATTESTATION'
    }
  };
}

async function runTests() {
  console.log('====================================================');
  console.log('COGNIX ESF-6 / Y3a ATTESTED OBSERVATION ADMISSION SUITE');
  console.log('====================================================\n');

  // E-01: Request body sets synthetic_demo: false with no source_id -> Rejected
  {
    clearAll();
    const admitRes = attestedObservationStore.admitObservation({
      tenant_id: TENANT_A,
      source_id: '',
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 110,
      unit: 'pp',
      synthetic_demo: false
    });
    assert(!admitRes.ok && admitRes.rejection === 'UNKNOWN_SOURCE', 'E-01: synthetic_demo: false with no source_id is rejected as UNKNOWN_SOURCE');
  }

  // E-02: Request body sets synthetic_demo: false naming synthetic ESF-3 connector -> UNKNOWN_SOURCE
  {
    clearAll();
    const admitRes = attestedObservationStore.admitObservation({
      tenant_id: TENANT_A,
      source_id: 'conn_planning_ref_01', // ESF-3 connector, not an attested source
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 110,
      unit: 'pp',
      synthetic_demo: false
    });
    assert(!admitRes.ok && admitRes.rejection === 'UNKNOWN_SOURCE', 'E-02: Naming synthetic ESF-3 connector in admission path yields UNKNOWN_SOURCE');
  }

  // E-03: Body carries server-issued field names (sequence, attestation_id, etc.) -> SERVER_FIELD_ASSERTED
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());
    assert(!!sRes.source, 'Source registered for E-03');

    const badReq: any = {
      tenant_id: TENANT_A,
      source_id: sRes.source.source_id,
      sequence: 42, // server field
      attestation_id: 'att_fake',
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 110,
      unit: 'pp'
    };
    const admitRes = attestedObservationStore.admitObservation(badReq);
    assert(!admitRes.ok && admitRes.rejection === 'SERVER_FIELD_ASSERTED', 'E-03: Body asserting server fields yields SERVER_FIELD_ASSERTED');
  }

  // E-04: Body carries value matching reserved prefix in any field -> SERVER_FIELD_ASSERTED
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());
    const badReq: any = {
      tenant_id: TENANT_A,
      source_id: sRes.source.source_id,
      entity_id: 'asrc_injected_entity', // reserved prefix
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 110,
      unit: 'pp'
    };
    const admitRes = attestedObservationStore.admitObservation(badReq);
    assert(!admitRes.ok && admitRes.rejection === 'SERVER_FIELD_ASSERTED', 'E-04: Field value with reserved prefix yields SERVER_FIELD_ASSERTED');
  }

  // E-05: Tenant B submits against Tenant A's registered source -> SOURCE_TENANT_MISMATCH
  {
    clearAll();
    const sResA = registerSourceOk(standardSourceReq(TENANT_A));
    const admitRes = attestedObservationStore.admitObservation({
      tenant_id: TENANT_B,
      source_id: sResA.source.source_id,
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 110,
      unit: 'pp'
    });
    assert(!admitRes.ok && (admitRes.rejection === 'UNKNOWN_SOURCE' || admitRes.rejection === 'SOURCE_TENANT_MISMATCH'), 'E-05: Tenant B cannot admit against Tenant A source');
  }

  // E-06: Foreign session against an otherwise valid source and tenant -> Refused at CDI-08 C0
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());
    const admitRes = admitObservationOk({
      tenant_id: TENANT_A,
      session_id: SESS_Y,
      source_id: sRes.source.source_id,
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 110,
      unit: 'pp'
    });
    assert(!!admitRes.observation, 'Observation admitted under SESS_Y');

    const contract = makeContract(SESS_X, TENANT_A);
    const compVerdict = evaluateComparability(
      'pp',
      'GROSS',
      admitRes.observation,
      {
        connector_synthetic_demo: false,
        connector_status: 'AVAILABLE',
        connector_resolves: true,
        scenario_derived_lineage: false,
        planned_start: START_DATE,
        comparison_invariants: contract.basis.comparison_invariants,
        admission_receipt_resolves: true,
        resolved_source_type: 'COMMERCE_TELEMETRY'
      },
      contract.basis.comparison_invariants,
      { tenant_id: contract.tenant_id, session_id: contract.session_id }
    );
    assert(compVerdict === 'TENANT_SESSION_MISMATCH', 'E-06: Foreign session observation yields TENANT_SESSION_MISMATCH at C0');
  }

  // E-07: source_id that does not resolve -> UNKNOWN_SOURCE
  {
    clearAll();
    const admitRes = attestedObservationStore.admitObservation({
      tenant_id: TENANT_A,
      source_id: 'asrc_nonexistent_9999',
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 110,
      unit: 'pp'
    });
    assert(!admitRes.ok && admitRes.rejection === 'UNKNOWN_SOURCE', 'E-07: Nonexistent source_id yields UNKNOWN_SOURCE');
  }

  // E-08: Source status DISABLED or REVOKED -> SOURCE_DISABLED / SOURCE_REVOKED
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());
    attestedObservationStore.disableSource(sRes.source.source_id, TENANT_A);

    const admitDis = attestedObservationStore.admitObservation({
      tenant_id: TENANT_A,
      source_id: sRes.source.source_id,
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 110,
      unit: 'pp'
    });
    assert(!admitDis.ok && admitDis.rejection === 'SOURCE_DISABLED', 'E-08a: Disabled source yields SOURCE_DISABLED');

    attestedObservationStore.revokeSource(sRes.source.source_id, TENANT_A);
    const admitRev = attestedObservationStore.admitObservation({
      tenant_id: TENANT_A,
      source_id: sRes.source.source_id,
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 110,
      unit: 'pp'
    });
    assert(!admitRev.ok && admitRev.rejection === 'SOURCE_REVOKED', 'E-08b: Revoked source yields SOURCE_REVOKED');
  }

  // E-09: Observation category not in source.observation_categories -> OBSERVATION_CATEGORY_NOT_PERMITTED
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());
    const admitRes = attestedObservationStore.admitObservation({
      tenant_id: TENANT_A,
      source_id: sRes.source.source_id,
      observation_category: 'REALISED_OPERATIONAL_ACTUAL', // source declared only COMMERCIAL
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 110,
      unit: 'pp'
    });
    assert(!admitRes.ok && admitRes.rejection === 'OBSERVATION_CATEGORY_NOT_PERMITTED', 'E-09: Unpermitted observation category yields OBSERVATION_CATEGORY_NOT_PERMITTED');
  }

  // E-10: signal_type outside source.supported_signal_types -> SIGNAL_TYPE_NOT_PERMITTED
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());
    const admitRes = attestedObservationStore.admitObservation({
      tenant_id: TENANT_A,
      source_id: sRes.source.source_id,
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'WEATHER_TEMPERATURE_ANOMALY' as any, // not in supported_signal_types
      grain_key: { category: 'Fresh Dairy', region: 'North West' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 110,
      unit: 'pp'
    });
    assert(!admitRes.ok && admitRes.rejection === 'SIGNAL_TYPE_NOT_PERMITTED', 'E-10: Unpermitted signal type yields SIGNAL_TYPE_NOT_PERMITTED');
  }

  // E-11: grain_key {category, region} against source declaring only {category} -> GRAIN_NOT_PERMITTED
  {
    clearAll();
    const req = standardSourceReq();
    req.supported_grain_capabilities = [{ dimensions: ['category'] }];
    const sRes = registerSourceOk(req);

    const admitRes = attestedObservationStore.admitObservation({
      tenant_id: TENANT_A,
      source_id: sRes.source.source_id,
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 110,
      unit: 'pp'
    });
    assert(!admitRes.ok && admitRes.rejection === 'GRAIN_NOT_PERMITTED', 'E-11: Grain mismatch yields GRAIN_NOT_PERMITTED');
  }

  // E-12: Source declares {category, region}; observation supplies extra {category, region, sku} -> GRAIN_NOT_PERMITTED (set equality)
  {
    clearAll();
    const req = standardSourceReq();
    req.supported_grain_capabilities = [{ dimensions: ['category', 'region'] }];
    const sRes = registerSourceOk(req);

    const admitRes = attestedObservationStore.admitObservation({
      tenant_id: TENANT_A,
      source_id: sRes.source.source_id,
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West', sku: 'P004' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 110,
      unit: 'pp'
    });
    assert(!admitRes.ok && admitRes.rejection === 'GRAIN_NOT_PERMITTED', 'E-12: Extra dimension fails set equality with GRAIN_NOT_PERMITTED');
  }

  // E-13: measurement_design: CONTROLLED_DIFFERENCE -> rejected at registration and admission
  {
    clearAll();
    const req = standardSourceReq();
    req.supported_measurement_bases = ['CONTROLLED_DIFFERENCE' as any];
    const sRes = attestedObservationStore.registerSource(req);
    assert(!sRes.ok, 'E-13a: CONTROLLED_DIFFERENCE cannot be declared at source registration');

    const validSrc = registerSourceOk(standardSourceReq());
    const admitRes = attestedObservationStore.admitObservation({
      tenant_id: TENANT_A,
      source_id: validSrc.source.source_id,
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'CONTROLLED_DIFFERENCE' as any,
      observed_quantity: 110,
      unit: 'pp'
    });
    assert(!admitRes.ok && admitRes.rejection === 'MEASUREMENT_BASIS_NOT_PERMITTED', 'E-13b: CONTROLLED_DIFFERENCE is rejected at admission');
  }

  // E-14: Source with empty capability arrays refuses every observation
  {
    clearAll();
    const req = standardSourceReq();
    req.supported_grain_capabilities = [];
    const sRes = attestedObservationStore.registerSource(req);
    assert(!sRes.ok, 'E-14: Source with empty capability arrays cannot register');
  }

  // E-15: Malformed measurement window (absent, unparseable, start > end) -> MALFORMED_PROVENANCE
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());
    const admitRes = attestedObservationStore.admitObservation({
      tenant_id: TENANT_A,
      source_id: sRes.source.source_id,
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West' },
      measurement_window: { start: '2026-09-01T00:00:00.000Z', end: '2026-08-01T00:00:00.000Z' }, // start > end
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 110,
      unit: 'pp'
    });
    assert(!admitRes.ok && admitRes.rejection === 'MALFORMED_PROVENANCE', 'E-15: start > end yields MALFORMED_PROVENANCE');
  }

  // E-16: Source with missing/tampered attestation_id -> ATTESTATION_UNRESOLVED
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());
    sRes.source.attestation_id = 'att_unresolved_receipt';

    const admitRes = attestedObservationStore.admitObservation({
      tenant_id: TENANT_A,
      source_id: sRes.source.source_id,
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 110,
      unit: 'pp'
    });
    assert(!admitRes.ok && admitRes.rejection === 'ATTESTATION_UNRESOLVED', 'E-16: Unresolved attestation receipt yields ATTESTATION_UNRESOLVED');
  }

  // E-17: Source registered with empty attested_by or attestation_statement -> Registration rejected
  {
    clearAll();
    const req = standardSourceReq();
    req.attestation.attested_by = '   ';
    const sRes = attestedObservationStore.registerSource(req);
    assert(!sRes.ok, 'E-17: Empty attested_by rejected at source registration');
  }

  // E-18: confidence: 100, quality: 100 on otherwise inadmissible observation -> Still refused
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());
    const admitRes = attestedObservationStore.admitObservation({
      tenant_id: TENANT_A,
      source_id: sRes.source.source_id,
      observation_category: 'REALISED_OPERATIONAL_ACTUAL', // unpermitted
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 110,
      unit: 'pp',
      confidence: 100,
      quality: 100
    });
    assert(!admitRes.ok && admitRes.rejection === 'OBSERVATION_CATEGORY_NOT_PERMITTED', 'E-18: High confidence/quality cannot make inadmissible observation admissible');
  }

  // E-19: Admitted observation carries R5 provenance classification
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());
    const admitRes = admitObservationOk({
      tenant_id: TENANT_A,
      source_id: sRes.source.source_id,
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 110,
      unit: 'pp',
      confidence: 90
    });
    assert(!!admitRes.observation, 'E-19a: Observation admitted');
    assert(admitRes.observation.provenance.confidence_provenance === 'SUPPLIED', 'E-19b: confidence_provenance is SUPPLIED');
    assert(admitRes.observation.provenance.quality_provenance === 'ADAPTER_DEFAULT', 'E-19c: quality_provenance is ADAPTER_DEFAULT');
  }

  // E-20: Contract created with pre_declaration_witness: 'SERVER_REGISTRATION_RECEIPT' -> REJECTED (C-INV-ENV-6)
  {
    clearAll();
    let caught = false;
    try {
      makeContract(SESS_X, TENANT_A, [
        {
          envelope_id: 'env_e20',
          applies_to_field_path: GROSS_FIELD,
          basis: 'GROSS',
          lower: -5,
          upper: 5,
          unit: 'pp',
          tolerance_kind: 'DECLARED_ACCEPTANCE_TOLERANCE',
          derivation: 'HUMAN_DECLARED',
          declared_by: 'lead@retail',
          declaration_statement: 'Attempting caller witness',
          pre_declaration_witness: 'SERVER_REGISTRATION_RECEIPT' as any
        }
      ]);
    } catch (e: any) {
      caught = true;
      assert(e.rejection_id === 'RJ-C1' || e.message?.includes('C-INV-ENV-6'), 'E-20: Contract with caller-declared SERVER_REGISTRATION_RECEIPT rejected by C-INV-ENV-6');
    }
    assert(caught, 'E-20b: Contract creation failed');
  }

  // E-21: Contract with witness NONE, no CONTRACT_REGISTRATION receipt -> Witness NONE, withheld reason names W1
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());
    const contract = makeContract(SESS_X, TENANT_A, [
      {
        envelope_id: 'env_e21',
        applies_to_field_path: GROSS_FIELD,
        basis: 'GROSS',
        lower: -5,
        upper: 15,
        unit: 'pp',
        tolerance_kind: 'DECLARED_ACCEPTANCE_TOLERANCE',
        derivation: 'HUMAN_DECLARED',
        declared_by: 'lead@retail',
        declaration_statement: 'Legitimate envelope',
        pre_declaration_witness: 'NONE'
      }
    ]);
    // Note: contract is NOT registered in attestedObservationStore (no CONTRACT_REGISTRATION receipt)

    const admitRes = admitObservationOk({
      tenant_id: TENANT_A,
      session_id: SESS_X,
      source_id: sRes.source.source_id,
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West', sku: 'P004|P007', customer_segment: 'Family Shoppers' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 10,
      unit: 'pp'
    });

    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [admitRes.observation]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(grossRow?.error?.declared_envelope?.pre_declaration_witness === 'NONE', 'E-21a: Derived witness is NONE without registration receipt');
    assert(grossRow?.error?.within_declared_envelope === undefined, 'E-21b: within_declared_envelope is unset');
    assert(Boolean(grossRow?.error?.within_withheld_reason?.includes('W1')), 'E-21c: within_withheld_reason names W1');
    assert(cmp.verdict === 'INDETERMINATE', 'E-21d: Verdict is INDETERMINATE');
  }

  // E-22: Contract registered, then envelope edited post-registration -> W2 fails on digest mismatch
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());
    const contract = makeContract(SESS_X, TENANT_A, [
      {
        envelope_id: 'env_e22',
        applies_to_field_path: GROSS_FIELD,
        basis: 'GROSS',
        lower: -5,
        upper: 15,
        unit: 'pp',
        tolerance_kind: 'DECLARED_ACCEPTANCE_TOLERANCE',
        derivation: 'HUMAN_DECLARED',
        declared_by: 'lead@retail',
        declaration_statement: 'Original envelope',
        pre_declaration_witness: 'NONE'
      }
    ]);
    // Register contract
    attestedObservationStore.registerContract(contract);

    // Tamper with envelope post-registration
    const tamperedContract: DecisionContract = {
      ...contract,
      prediction_envelopes: [
        {
          ...contract.prediction_envelopes[0],
          upper: 50 // altered upper bound
        }
      ]
    };

    const admitRes = admitObservationOk({
      tenant_id: TENANT_A,
      session_id: SESS_X,
      source_id: sRes.source.source_id,
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West', sku: 'P004|P007', customer_segment: 'Family Shoppers' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 10,
      unit: 'pp'
    });

    const cmp = comparePredictionToReality({
      contract: tamperedContract,
      as_of: TS,
      observations: [admitRes.observation]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(grossRow?.error?.declared_envelope?.pre_declaration_witness === 'NONE', 'E-22a: Digest mismatch yields witness NONE');
    assert(Boolean(grossRow?.error?.within_withheld_reason?.includes('W2')), 'E-22b: within_withheld_reason names W2');
  }

  // E-23: Observation admitted BEFORE contract was registered (m < n) -> W4 fails
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());

    // 1. Admit observation first (seq = 2)
    const admitRes = admitObservationOk({
      tenant_id: TENANT_A,
      session_id: SESS_X,
      source_id: sRes.source.source_id,
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West', sku: 'P004|P007', customer_segment: 'Family Shoppers' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 10,
      unit: 'pp'
    });

    // 2. Register contract AFTER (seq = 3)
    const contract = makeContract(SESS_X, TENANT_A, [
      {
        envelope_id: 'env_e23',
        applies_to_field_path: GROSS_FIELD,
        basis: 'GROSS',
        lower: -5,
        upper: 15,
        unit: 'pp',
        tolerance_kind: 'DECLARED_ACCEPTANCE_TOLERANCE',
        derivation: 'HUMAN_DECLARED',
        declared_by: 'lead@retail',
        declaration_statement: 'Retroactive envelope',
        pre_declaration_witness: 'NONE'
      }
    ]);
    attestedObservationStore.registerContract(contract);

    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [admitRes.observation]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(grossRow?.error?.declared_envelope?.pre_declaration_witness === 'NONE', 'E-23a: Retroactive envelope yields witness NONE');
    assert(Boolean(grossRow?.error?.within_withheld_reason?.includes('W4')), 'E-23b: within_withheld_reason names W4 precedence failure');
  }

  // E-24: Observation admitted at same sequence as contract -> W4 strict < fails
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());
    const contract = makeContract(SESS_X, TENANT_A, [
      {
        envelope_id: 'env_e24',
        applies_to_field_path: GROSS_FIELD,
        basis: 'GROSS',
        lower: -5,
        upper: 15,
        unit: 'pp',
        tolerance_kind: 'DECLARED_ACCEPTANCE_TOLERANCE',
        derivation: 'HUMAN_DECLARED',
        declared_by: 'lead@retail',
        declaration_statement: 'Envelope',
        pre_declaration_witness: 'NONE'
      }
    ]);
    const cRcpt = registerContractOk(contract);

    const admitRes = admitObservationOk({
      tenant_id: TENANT_A,
      session_id: SESS_X,
      source_id: sRes.source.source_id,
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West', sku: 'P004|P007', customer_segment: 'Family Shoppers' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 10,
      unit: 'pp'
    });

    // Artificially simulate equal sequence
    (admitRes.receipt as any).sequence = cRcpt.receipt.sequence;

    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [admitRes.observation]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(grossRow?.error?.declared_envelope?.pre_declaration_witness === 'NONE', 'E-24: Equal sequence fails strict W4 precedence');
  }

  // E-25: Contract registered, observation admitted after, error inside envelope -> WITHIN_DECLARED_ENVELOPE (THE UNLOCK)
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());
    const contract = makeContract(SESS_X, TENANT_A, [
      {
        envelope_id: 'env_e25',
        applies_to_field_path: GROSS_FIELD,
        basis: 'GROSS',
        lower: -5,
        upper: 15,
        unit: 'pp',
        tolerance_kind: 'DECLARED_ACCEPTANCE_TOLERANCE',
        derivation: 'HUMAN_DECLARED',
        declared_by: 'lead@retail',
        declaration_statement: 'Pre-registered envelope',
        pre_declaration_witness: 'NONE'
      }
    ]);
    const cRcpt = registerContractOk(contract);
    assert(!!cRcpt.receipt, 'Contract registered (seq = n)');

    const admitRes = admitObservationOk({
      tenant_id: TENANT_A,
      session_id: SESS_X,
      source_id: sRes.source.source_id,
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West', sku: 'P004|P007', customer_segment: 'Family Shoppers' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 10,
      unit: 'pp'
    });
    assert(!!admitRes.observation, 'Observation admitted after contract (seq = m > n)');

    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [admitRes.observation]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(grossRow?.comparability === 'LIKE_FOR_LIKE', 'E-25a: Row is LIKE_FOR_LIKE');
    assert(grossRow?.error?.declared_envelope?.pre_declaration_witness === 'SERVER_REGISTRATION_RECEIPT', 'E-25b: Derived witness is SERVER_REGISTRATION_RECEIPT');
    assert(grossRow?.error?.within_declared_envelope === true, 'E-25c: within_declared_envelope is true');
    assert(cmp.verdict === 'WITHIN_DECLARED_ENVELOPE', 'E-25d: Verdict is WITHIN_DECLARED_ENVELOPE (THE ESF-6 UNLOCK)');
  }

  // E-26: Same as E-25 but signed error falls OUTSIDE envelope -> OUTSIDE_DECLARED_ENVELOPE
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());
    const contract = makeContract(SESS_X, TENANT_A, [
      {
        envelope_id: 'env_e26',
        applies_to_field_path: GROSS_FIELD,
        basis: 'GROSS',
        lower: -5,
        upper: 5,
        unit: 'pp',
        tolerance_kind: 'DECLARED_ACCEPTANCE_TOLERANCE',
        derivation: 'HUMAN_DECLARED',
        declared_by: 'lead@retail',
        declaration_statement: 'Tight envelope',
        pre_declaration_witness: 'NONE'
      }
    ]);
    attestedObservationStore.registerContract(contract);

    const admitRes = admitObservationOk({
      tenant_id: TENANT_A,
      session_id: SESS_X,
      source_id: sRes.source.source_id,
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West', sku: 'P004|P007', customer_segment: 'Family Shoppers' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 25, // delta = 25 - ~9.5 = ~15.5 > upper bound 5
      unit: 'pp'
    });

    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [admitRes.observation]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(grossRow?.error?.within_declared_envelope === false, 'E-26a: within_declared_envelope is false');
    assert(cmp.verdict === 'OUTSIDE_DECLARED_ENVELOPE', 'E-26b: Verdict is OUTSIDE_DECLARED_ENVELOPE');
  }

  // E-27: Adverse error with receipts cleared and source revoked still yields OUTSIDE_DECLARED_ENVELOPE (Z2 asymmetry)
  {
    clearAll();
    const contract = makeContract(SESS_X, TENANT_A, [
      {
        envelope_id: 'env_e27',
        applies_to_field_path: GROSS_FIELD,
        basis: 'GROSS',
        lower: -5,
        upper: 5,
        unit: 'pp',
        tolerance_kind: 'DECLARED_ACCEPTANCE_TOLERANCE',
        derivation: 'HUMAN_DECLARED',
        declared_by: 'lead@retail',
        declaration_statement: 'Envelope',
        pre_declaration_witness: 'NONE'
      }
    ]);

    // 1. Register source and admit observation
    const sRes = registerSourceOk(standardSourceReq());
    assert(!!sRes.source, 'E-27: Source registered');

    const admitRes = admitObservationOk({
      tenant_id: TENANT_A,
      session_id: SESS_X,
      source_id: sRes.source.source_id,
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West', sku: 'P004|P007', customer_segment: 'Family Shoppers' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 30, // 30 pp delta > upper bound 5 pp
      unit: 'pp'
    });
    assert(!!admitRes.observation, 'E-27: Observation admitted');

    // 2. Revoke source
    attestedObservationStore.revokeSource(sRes.source.source_id, TENANT_A);

    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [admitRes.observation]
    });
    assert(cmp.verdict === 'OUTSIDE_DECLARED_ENVELOPE', 'E-27: Adverse error with revoked source still yields OUTSIDE_DECLARED_ENVELOPE (Z2 asymmetry)');
  }

  // E-28: No API path exists to re-flag an existing synthetic observation
  {
    assert(typeof (attestedObservationStore as any).reclassifyObservation === 'undefined', 'E-28: No reclassification API exists on store');
  }

  // E-29: Attested observation with mismatched signal_type against VOLUME metric -> METRIC_MISMATCH
  {
    clearAll();
    const sRes = registerSourceOk({
      ...standardSourceReq(),
      supported_signal_types: ['ORDER_VELOCITY_ACCELERATION', 'WEATHER_TEMPERATURE_ANOMALY' as any]
    });
    const contract = makeContract(SESS_X, TENANT_A);
    const admitRes = admitObservationOk({
      tenant_id: TENANT_A,
      session_id: SESS_X,
      source_id: sRes.source.source_id,
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'WEATHER_TEMPERATURE_ANOMALY' as any,
      grain_key: { category: 'Fresh Dairy', region: 'North West', sku: 'P004|P007', customer_segment: 'Family Shoppers' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 10,
      unit: 'pp'
    });
    assert(!!admitRes.observation, 'Admitted by source');

    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [admitRes.observation]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(grossRow?.comparability === 'METRIC_MISMATCH', 'E-29: Attested weather signal against VOLUME primary_metric yields METRIC_MISMATCH (E6)');
  }

  // E-30: Attested observation against contract with blank comparison_invariants -> GRAIN_UNDECLARED
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());
    const contract = makeContract(SESS_X, TENANT_A);
    const blankContract: DecisionContract = {
      ...contract,
      basis: {
        ...contract.basis,
        comparison_invariants: {
          ...contract.basis.comparison_invariants,
          category: '',
          region: '',
          sku_scope: [],
          customer_segment: ''
        }
      }
    };

    const admitRes = admitObservationOk({
      tenant_id: TENANT_A,
      session_id: SESS_X,
      source_id: sRes.source.source_id,
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 10,
      unit: 'pp'
    });

    const cmp = comparePredictionToReality({
      contract: blankContract,
      as_of: TS,
      observations: [admitRes.observation]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(grossRow?.comparability === 'GRAIN_UNDECLARED', 'E-30: Blank invariants yield GRAIN_UNDECLARED with attested observation');
  }

  // E-31: Two marginal attested observations (CATEGORY, REGION) cannot combine (Z4)
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());
    const contract = makeContract(SESS_X, TENANT_A);

    const obsCat = admitObservationOk({
      tenant_id: TENANT_A,
      session_id: SESS_X,
      source_id: sRes.source.source_id,
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 10,
      unit: 'pp'
    });
    const obsReg = admitObservationOk({
      tenant_id: TENANT_A,
      session_id: SESS_X,
      source_id: sRes.source.source_id,
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { region: 'North West' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 10,
      unit: 'pp'
    });

    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [obsCat.observation, obsReg.observation]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(grossRow?.comparability === 'GRAIN_MISMATCH', 'E-31: Marginal observations cannot combine to satisfy composite grain (Z4)');
  }

  // E-32: Attested observation with partial 3-day window inside 14-day contracted window -> WINDOW_MISMATCH
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());
    const contract = makeContract(SESS_X, TENANT_A);

    const admitRes = admitObservationOk({
      tenant_id: TENANT_A,
      session_id: SESS_X,
      source_id: sRes.source.source_id,
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West', sku: 'P004|P007', customer_segment: 'Family Shoppers' },
      measurement_window: { start: '2026-08-22T00:00:00.000Z', end: '2026-08-25T00:00:00.000Z' }, // 3 days
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 10,
      unit: 'pp'
    });

    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [admitRes.observation]
    });
    const grossRow = cmp.comparisons.find(c => c.predicted_basis === 'GROSS');
    assert(grossRow?.comparability === 'WINDOW_MISMATCH', 'E-32: Partial window coverage yields WINDOW_MISMATCH');
  }

  // E-33: Mixed attested and synthetic observations -> ATTRIBUTION_UNAVAILABLE (X1)
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());
    const contract = makeContract(SESS_X, TENANT_A);

    const admitReal = admitObservationOk({
      tenant_id: TENANT_A,
      session_id: SESS_X,
      source_id: sRes.source.source_id,
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West', sku: 'P004|P007', customer_segment: 'Family Shoppers' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 10,
      unit: 'pp'
    });

    const synthObs: OutcomeObservation = {
      ...admitReal.observation,
      observation_id: 'obs_synth_mixed',
      authority: 'SYNTHETIC_DEMONSTRATION',
      synthetic_demo: true,
      provenance: {
        ...admitReal.observation.provenance,
        synthetic_demo: true,
        synthetic_disclosure: SYNTHETIC_OBSERVATION_DISCLOSURE
      }
    };

    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [admitReal.observation, synthObs]
    });
    assert(cmp.attribution.attribution === 'ATTRIBUTION_UNAVAILABLE', 'E-33: Synthetic observation in set collapses attribution to ATTRIBUTION_UNAVAILABLE (X1)');
  }

  // E-34: Full Reference Demo Flow (§11)
  {
    clearAll();
    // 1. Register attested source
    const sRes = registerSourceOk(standardSourceReq());
    assert(!!sRes.source, 'E-34.1: Source registered');

    // 2. Register DecisionContract with envelope
    const contract = makeContract(SESS_X, TENANT_A, [
      {
        envelope_id: 'env_demo',
        applies_to_field_path: GROSS_FIELD,
        basis: 'GROSS',
        lower: -5,
        upper: 15,
        unit: 'pp',
        tolerance_kind: 'DECLARED_ACCEPTANCE_TOLERANCE',
        derivation: 'HUMAN_DECLARED',
        declared_by: 'esf6.lead@retail',
        declaration_statement: 'Demo envelope',
        pre_declaration_witness: 'NONE'
      }
    ]);
    const cRcpt = registerContractOk(contract);
    assert(!!cRcpt.receipt, 'E-34.2: Contract registered with sequence n');

    // 3. Submit realised campaign observation
    const admitRes = admitObservationOk({
      tenant_id: TENANT_A,
      session_id: SESS_X,
      source_id: sRes.source.source_id,
      observation_category: 'REALISED_COMMERCIAL_ACTUAL',
      signal_type: 'ORDER_VELOCITY_ACCELERATION',
      grain_key: { category: 'Fresh Dairy', region: 'North West', sku: 'P004|P007', customer_segment: 'Family Shoppers' },
      measurement_window: { start: START_DATE, end: END_DATE },
      measurement_design: 'DIRECT_MEASUREMENT',
      observed_quantity: 10,
      unit: 'pp'
    });
    assert(!!admitRes.observation, 'E-34.3: Observation admitted with sequence m > n');

    // 4. Compare
    const cmp = comparePredictionToReality({
      contract,
      as_of: TS,
      observations: [admitRes.observation]
    });
    assert(cmp.verdict === 'WITHIN_DECLARED_ENVELOPE', 'E-34.4: Comparison published as WITHIN_DECLARED_ENVELOPE');

    // 5. Evaluate Learning Eligibility
    const eligibility = evaluateLearningEligibility(contract, cmp);
    assert(eligibility.conditions.length === 8, 'E-34.5: All 8 LE conditions evaluated honestly');
  }

  // E-35: Static analysis: Date.now() never appears as a decision or ordering input
  {
    const storeCode = fs.readFileSync(path.join(process.cwd(), 'lib/attested-observation-store.ts'), 'utf-8');
    const engineCode = fs.readFileSync(path.join(process.cwd(), 'lib/campaign-learning-loop-engine.ts'), 'utf-8');

    // The ONLY permitted wall-clock use in the store is stamping `issued_at_display`, which E4
    // allows for audit and display. Assert every wall-clock reading in the store is on that line
    // and nowhere else — a bare `Date.now()` or a `new Date()` feeding anything else is a defect.
    const wallClockLines = storeCode
      .split('\n')
      .filter(l => /Date\.now\(\)|new Date\(/.test(l))
      .map(l => l.trim());
    assert(
      wallClockLines.length > 0 && wallClockLines.every(l => l.startsWith('issued_at_display:')),
      'E-35a: The only wall-clock reading in the admission store stamps issued_at_display (E4)',
      `offending lines: ${wallClockLines.filter(l => !l.startsWith('issued_at_display:')).join(' | ')}`
    );

    // The witness predicate (W1–W5) must order by `sequence` and never by a timestamp field.
    const witnessBlock = engineCode.slice(
      engineCode.indexOf('// W1-W5 Witness Evaluation'),
      engineCode.indexOf('const isOutside =')
    );
    assert(witnessBlock.length > 0, 'E-35b: Witness evaluation block located for static inspection');
    assert(
      !/issued_at_display|Date\.now\(\)|new Date\(/.test(witnessBlock),
      'E-35c: Witness evaluation reads no timestamp — precedence is the integer sequence alone (E4/W4)'
    );
  }

  // E-36: Model validators reject invalid types cleanly
  {
    assert(!validateSourceAttestation(null).valid, 'E-36a: validateSourceAttestation rejects null');
    assert(!validateAttestedObservationSource(null).valid, 'E-36b: validateAttestedObservationSource rejects null');
    assert(!validateServerReceipt(null).valid, 'E-36c: validateServerReceipt rejects null');
  }

  // ---------------------------------------------------------------------------
  // R-37..R-42 — regression guards added by independent adversarial reconciliation.
  // Each corresponds to a defect that the delivered 63-assertion suite did not catch.
  // ---------------------------------------------------------------------------

  // R-37: An admission receipt witnesses ONE observation. A receipt of the wrong KIND
  // (SOURCE_REGISTRATION / CONTRACT_REGISTRATION) must never stand in for an admission.
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());                        // seq 1
    const contract = makeContract(SESS_X, TENANT_A, [demoEnvelope()]);
    const cRcpt = registerContractOk(contract);                                // seq 2
    const admitRes = admitObservationOk(standardAdmission(sRes.source.source_id)); // seq 3
    // A decoy source registered AFTER the contract yields a receipt with a HIGHER sequence,
    // so W4 (strict sequence precedence) alone cannot refuse it.
    const decoy = registerSourceOk({ ...standardSourceReq(), display_name: 'Decoy Source' }); // seq 4
    assert(decoy.receipt.sequence > cRcpt.receipt.sequence, 'R-37a: Decoy receipt sequence exceeds contract sequence');

    const forged: OutcomeObservation = JSON.parse(JSON.stringify(admitRes.observation));
    forged.observation_id = 'obs_never_admitted';
    forged.observed_value = 999999;
    forged.admission_receipt_id = decoy.receipt.receipt_id;
    forged.provenance.admission_receipt_id = decoy.receipt.receipt_id;

    const cmp = comparePredictionToReality({ contract, as_of: TS, observations: [forged] });
    assert(
      cmp.verdict !== 'WITHIN_DECLARED_ENVELOPE',
      'R-37: A SOURCE_REGISTRATION receipt cannot stand in for an admission receipt (manufactured authority refused)'
    );
  }

  // R-38: A genuine OBSERVATION_ADMISSION receipt issued for a DIFFERENT observation
  // must not witness this one — subject binding, not mere resolution.
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());
    const contract = makeContract(SESS_X, TENANT_A, [demoEnvelope()]);
    registerContractOk(contract);
    const first = admitObservationOk(standardAdmission(sRes.source.source_id));
    const second = admitObservationOk(standardAdmission(sRes.source.source_id));

    const swapped: OutcomeObservation = JSON.parse(JSON.stringify(first.observation));
    swapped.observation_id = 'obs_borrowing_another_receipt';
    swapped.admission_receipt_id = second.receipt.receipt_id;
    swapped.provenance.admission_receipt_id = second.receipt.receipt_id;

    const cmp = comparePredictionToReality({ contract, as_of: TS, observations: [swapped] });
    assert(
      cmp.verdict !== 'WITHIN_DECLARED_ENVELOPE',
      "R-38: An admission receipt issued for another observation does not witness this one (subject binding)"
    );
  }

  // R-39: ESF-6 origin claimed with an UNRESOLVABLE source must fail closed toward synthetic,
  // exactly as the ESF-3 branch does. An unresolvable source is not evidence of measurement.
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());
    const contract = makeContract(SESS_X, TENANT_A, [demoEnvelope()]);
    registerContractOk(contract);
    const admitRes = admitObservationOk(standardAdmission(sRes.source.source_id));

    const orphan: OutcomeObservation = JSON.parse(JSON.stringify(admitRes.observation));
    orphan.source_id = 'asrc_does_not_exist';
    orphan.connector_id = 'asrc_does_not_exist';

    // Two independent guards must hold: RJ-R2 refuses ESF-6 lineage that does not resolve, and
    // if it were ever reached, the synthetic disjunction fails closed. Either outcome is a refusal;
    // reaching WITHIN is not.
    let refused = false;
    let verdict: string | undefined;
    try {
      verdict = comparePredictionToReality({ contract, as_of: TS, observations: [orphan] }).verdict;
    } catch (err) {
      refused = /RJ-R2/.test(String(err));
    }
    assert(
      refused || verdict !== 'WITHIN_DECLARED_ENVELOPE',
      'R-39: ESF-6 origin with an unresolvable source fails closed (no authority from a phantom source)'
    );
  }

  // R-40: Wall clock never participates in authority, ordering or the witness (E4 / E-35).
  // Mutating issued_at_display on every receipt must change no verdict; only `sequence` orders.
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());
    const contract = makeContract(SESS_X, TENANT_A, [demoEnvelope()]);
    registerContractOk(contract);
    const admitRes = admitObservationOk(standardAdmission(sRes.source.source_id));

    const before = comparePredictionToReality({ contract, as_of: TS, observations: [admitRes.observation] });
    for (const r of attestedObservationStore.listReceiptsForTenant(TENANT_A)) {
      (r as ServerReceipt).issued_at_display = '1970-01-01T00:00:00.000Z';
    }
    const after = comparePredictionToReality({ contract, as_of: TS, observations: [admitRes.observation] });
    assert(
      before.verdict === after.verdict && after.verdict === 'WITHIN_DECLARED_ENVELOPE',
      'R-40: issued_at_display is display-only — rewriting it to the epoch changes no verdict (E4)'
    );
  }

  // R-41: Sequence ordering is what refuses a late-registered contract (W4), independent of
  // any timestamp. Admit BEFORE registering the contract => witness must fail.
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());                          // seq 1
    const contract = makeContract(SESS_X, TENANT_A, [demoEnvelope()]);
    const admitRes = admitObservationOk(standardAdmission(sRes.source.source_id)); // seq 2
    const cRcpt = registerContractOk(contract);                                   // seq 3
    assert(cRcpt.receipt.sequence > admitRes.receipt.sequence, 'R-41a: Contract registered after admission');
    const cmp = comparePredictionToReality({ contract, as_of: TS, observations: [admitRes.observation] });
    assert(
      cmp.verdict !== 'WITHIN_DECLARED_ENVELOPE',
      'R-41: Observation admitted before contract registration never reaches WITHIN (W4 strict precedence)'
    );
  }

  // R-42: LE-1..LE-8 reported honestly and individually on the reference fixture — the
  // delivered suite only counted eight conditions, which cannot detect a wrong verdict.
  {
    clearAll();
    const sRes = registerSourceOk(standardSourceReq());
    const contract = makeContract(SESS_X, TENANT_A, [demoEnvelope()]);
    registerContractOk(contract);
    const admitRes = admitObservationOk(standardAdmission(sRes.source.source_id));
    const cmp = comparePredictionToReality({ contract, as_of: TS, observations: [admitRes.observation] });
    const el = evaluateLearningEligibility(contract, cmp);
    const by = (id: string) => el.conditions.find(c => c.condition_id === id);

    for (const id of ['LE-1', 'LE-2', 'LE-3', 'LE-4', 'LE-5', 'LE-7', 'LE-8']) {
      assert(by(id)?.met === true, `R-42 ${id}: met on the reference attested fixture`);
    }
    // LE-6 is contract-declared and the reference estate's play carries
    // evidence_strength_floor = PLACEHOLDER_EXCLUDED. It must be reported UNMET, not assumed.
    assert(
      by('LE-6')?.met === false,
      'R-42 LE-6: reported UNMET on the reference estate (evidence_strength_floor is PLACEHOLDER_EXCLUDED)'
    );
    // Therefore no eligible LearningCase is produced. Asserted so that any future change which
    // starts manufacturing one is caught here rather than believed.
    assert(
      el.eligible === false,
      'R-42: No eligible LearningCase is produced on the reference fixture while LE-6 is unmet'
    );
  }

  console.log(`\n====================================================`);
  console.log(`ESF-6 RESULTS: ${passCount} passed, ${failCount} failed (target 36+)`);
  console.log(`====================================================\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
