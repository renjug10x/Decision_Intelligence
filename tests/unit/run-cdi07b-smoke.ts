/**
 * CDI-07B smoke — contract → pre-mortem → synthetic comparison → learning candidate (expect LE-4).
 * Run via: node --import tsx tests/unit/run-cdi07b-smoke.ts
 */

import { createDefaultCampaignIntentDraft } from '../../packages/contracts/src/index';
import type { CampaignIntent, OutcomeFrontier, StrategyPlay } from '../../packages/contracts/src/index';
import { SYNTHETIC_OBSERVATION_DISCLOSURE } from '../../packages/contracts/src/campaign-learning-loop-model';
import { clearCampaignIntents, registerCampaignIntent } from '../../lib/campaign-intent-store';
import { evaluateOutcomeFrontier } from '../../lib/campaign-frontier-engine';
import { createDecisionContract } from '../../lib/campaign-decision-contract-engine';
import { decisionContractStore } from '../../lib/decision-contract-store';
import { preMortemStore } from '../../lib/pre-mortem-store';
import { learningCandidateStore } from '../../lib/learning-candidate-store';
import {
  createPreMortem,
  comparePredictionToReality,
  buildLearningCandidate,
  adaptEnterpriseSignalToOutcomeObservation
} from '../../lib/campaign-learning-loop-engine';
import type { OutcomeObservation } from '../../packages/contracts/src/campaign-learning-loop-model';
import { mapCategoryToSourceType } from '../../packages/contracts/src/external-signal-connector-model';

const TS = '2026-08-15T12:00:00.000Z';
const TENANT = 'tenant_uk_retail_01';
const SESSION = 'sess_cdi07b_smoke';

function registerAnchor(): CampaignIntent {
  clearCampaignIntents();
  const d = createDefaultCampaignIntentDraft(TENANT, SESSION);
  d.audience_market.timing_mode = 'KNOWN_DATES';
  d.audience_market.planned_start = '2026-08-20T00:00:00.000Z';
  d.audience_market.planned_end = '2026-08-27T00:00:00.000Z';
  return registerCampaignIntent(d);
}

function emitFrontier(camp: CampaignIntent): OutcomeFrontier {
  return evaluateOutcomeFrontier({
    tenant_id: camp.tenant_id,
    session_id: camp.session_id,
    campaign_intent_id: camp.campaign_intent_id,
    evaluation_timestamp: TS
  } as any).frontier;
}

function pickPlay(frontier: OutcomeFrontier): StrategyPlay {
  const play =
    frontier.plays.find(
      p => frontier.frontier_play_ids.includes(p.play_id) && p.admissibility === 'ADMISSIBLE'
    ) || frontier.plays.find(p => p.admissibility === 'ADMISSIBLE');
  if (!play) throw new Error('No admissible play for smoke fixture');
  return play;
}

function syntheticObservation(camp: CampaignIntent): OutcomeObservation {
  const category = camp.campaign_intent.category;
  const adapted = adaptEnterpriseSignalToOutcomeObservation({
    signal: {
      signal_id: 'sig_smoke_cdi07b_001',
      signal_type: 'CATEGORY_DEMAND_ACCELERATION',
      category: 'DEMAND',
      tenant_id: TENANT,
      entity_type: 'CATEGORY',
      entity_id: category,
      observed_at: '2026-08-22T10:00:00.000Z',
      effective_at: '2026-08-22T10:00:00.000Z',
      baseline_value: 100,
      observed_value: 112,
      delta: 12,
      delta_pct: 12,
      unit: 'pp',
      source_type: mapCategoryToSourceType('PLANNING'),
      source_system: 'reference_planning',
      confidence: 80,
      quality: 85,
      provenance: { connector: 'conn_planning_ref_01' },
      synthetic_demo: true,
      schema_version: '1.0'
    },
    tenant_id: TENANT,
    session_id: SESSION,
    connector_id: 'conn_planning_ref_01',
    external_category: 'PLANNING',
    envelope_id: 'env_smoke_001',
    metrics_supplied: true
  });

  return {
    ...adapted,
    authority: 'SYNTHETIC_DEMONSTRATION',
    provenance: {
      ...adapted.provenance,
      synthetic_demo: true,
      synthetic_disclosure: SYNTHETIC_OBSERVATION_DISCLOSURE
    },
    synthetic_demo: true
  };
}

function runSmoke() {
  console.log('CDI-07B SMOKE — contract → pre-mortem → comparison → learning candidate\n');

  decisionContractStore.clear();
  preMortemStore.clear();
  learningCandidateStore.clear();

  const camp = registerAnchor();
  const frontier = emitFrontier(camp);
  const play = pickPlay(frontier);

  const contract = createDecisionContract({
    tenant_id: TENANT,
    session_id: SESSION,
    frontier,
    campaign_intent: camp,
    resolution: {
      route: 'HUMAN_RESOLVED',
      selected_play_id: play.play_id,
      resolved_by: 'smoke.owner@retail',
      resolution_statement: 'CDI-07B smoke resolution'
    },
    created_as_of: TS
  });

  console.log(`[ok] contract ${contract.contract_id.slice(0, 16)}…`);

  const preMortem = createPreMortem({ contract, as_of: TS });
  console.log(`[ok] pre-mortem ${preMortem.failure_modes.length} failure modes`);

  const observation = syntheticObservation(camp);
  const comparison = comparePredictionToReality({
    contract,
    as_of: TS,
    observations: [observation]
  });
  console.log(`[ok] comparison verdict=${comparison.verdict} attribution=${comparison.attribution.attribution}`);

  const candidate = buildLearningCandidate({ contract, comparison, as_of: TS });
  const le4 = candidate.eligibility.conditions.find(c => c.condition_id === 'LE-4');

  if (candidate.eligibility.eligible) {
    console.error('[FAIL] expected ineligible candidate');
    process.exit(1);
  }
  if (!candidate.blocked_by.includes('LE-4')) {
    console.error(`[FAIL] expected LE-4 in blocked_by, got ${candidate.blocked_by.join(', ')}`);
    process.exit(1);
  }
  if (le4?.met) {
    console.error('[FAIL] expected LE-4 unmet');
    process.exit(1);
  }
  if (candidate.learning_case) {
    console.error('[FAIL] ineligible candidate must not carry learning_case');
    process.exit(1);
  }

  console.log(`[ok] candidate blocked_by=[${candidate.blocked_by.join(', ')}] LE-4 met=${le4?.met}`);
  console.log('\nCDI-07B smoke PASSED');
}

runSmoke();
