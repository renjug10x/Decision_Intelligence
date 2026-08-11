// Decision Engine — approval flow with contract library search + Gemini narrative

import decisionsData from '@/data/decisions.json';
import {
  searchContractLibrary,
  searchPenaltyMatch,
  activateBackupContract,
  resetContractStates,
  type SearchTraceItem,
  type ContractMatchResult,
} from '@/lib/contract-library';
import { generateApprovalNarrative } from '@/lib/contract-narrative';

export type DecisionStatus = 'pending' | 'approved' | 'deferred';
export type ActionType = 'activate_backup' | 'enforce_penalty' | 'deploy_promotion';

export interface Decision {
  id: string;
  title: string;
  detail: string;
  impact: string;
  risk: string;
  department: string;
  contract_id: string | null;
  action_type: ActionType;
  anomaly_id: string | null;
  status: DecisionStatus;
  match_criteria?: {
    category: string;
    region: string;
    failing_supplier_id: string;
    backup_supplier_id: string;
  };
}

export interface ApprovalResult {
  decision_id: string;
  status: 'approved';
  action_type: ActionType;
  search_trace: SearchTraceItem[];
  library_searched_count: number;
  contract_match: ContractMatchResult | null;
  narrative: string;
  activation_message: string;
  confidence: number;
  used_gemini: boolean;
  activated_at: string;
}

const decisionStates = new Map<string, DecisionStatus>(
  (decisionsData as Decision[]).map(d => [d.id, d.status as DecisionStatus])
);

export function getDecisions(): Decision[] {
  return (decisionsData as Decision[]).map(d => ({
    ...d,
    status: decisionStates.get(d.id) ?? d.status,
  }));
}

/** Reset all decisions and contract activations to JSON defaults (demo reset). */
export function resetDecisions(): Decision[] {
  for (const d of decisionsData as Decision[]) {
    decisionStates.set(d.id, d.status as DecisionStatus);
  }
  resetContractStates();
  return getDecisions();
}

export function deferDecision(decisionId: string): Decision | null {
  const decision = (decisionsData as Decision[]).find(d => d.id === decisionId);
  if (!decision) return null;
  decisionStates.set(decisionId, 'deferred');
  return { ...decision, status: 'deferred' };
}

export async function approveDecision(
  decisionId: string,
  approvedBy = 'Executive',
  apiKey?: string
): Promise<ApprovalResult | { error: string }> {
  const decision = (decisionsData as Decision[]).find(d => d.id === decisionId);
  if (!decision) return { error: 'Decision not found' };

  const currentStatus = decisionStates.get(decisionId) ?? decision.status;
  if (currentStatus === 'approved') return { error: 'Decision already approved' };
  if (currentStatus === 'deferred') return { error: 'Decision was deferred' };

  const activatedAt = new Date().toISOString();

  if (decision.action_type === 'deploy_promotion' || !decision.match_criteria) {
    decisionStates.set(decisionId, 'approved');
    return {
      decision_id: decisionId,
      status: 'approved',
      action_type: decision.action_type,
      search_trace: [],
      library_searched_count: 0,
      contract_match: null,
      narrative: `Promotion approved: ${decision.title}.`,
      activation_message: `${decision.title} deployed. ${decision.impact}.`,
      confidence: 88,
      used_gemini: false,
      activated_at: activatedAt,
    };
  }

  let searchTrace: SearchTraceItem[] = [];
  let match: ContractMatchResult | null = null;
  let clauseChunks: Array<{ contract_id: string; clause_ref: string; text: string }> = [];

  if (decision.action_type === 'activate_backup') {
    const criteria = decision.match_criteria;
    const result = await searchContractLibrary(criteria);
    searchTrace = result.search_trace;
    match = result.match;
    clauseChunks = result.clause_chunks;

    if (!match) {
      return {
        error: `SLA breach not confirmed or no backup match. Delay rate from live data did not exceed contract threshold.`,
        search_trace: searchTrace,
        library_searched_count: searchTrace.length,
      };
    }

    activateBackupContract(match.primary_contract_id, approvedBy);
  } else if (decision.action_type === 'enforce_penalty') {
    const criteria = decision.match_criteria;
    const result = await searchPenaltyMatch(criteria.failing_supplier_id, criteria.category);
    searchTrace = result.trace;
    match = result.match;
    clauseChunks = result.clauseChunks;

    if (!match) {
      return {
        error: 'No matching penalty clause found in contract library',
        search_trace: searchTrace,
        library_searched_count: searchTrace.length,
      };
    }
  }

  const narrativeResult = await generateApprovalNarrative({
    decisionTitle: decision.title,
    decisionDetail: decision.detail,
    decisionImpact: decision.impact,
    actionType: decision.action_type,
    match: match!,
    searchTrace,
    clauseChunks,
    apiKey,
  });

  decisionStates.set(decisionId, 'approved');

  return {
    decision_id: decisionId,
    status: 'approved',
    action_type: decision.action_type,
    search_trace: searchTrace,
    library_searched_count: searchTrace.length,
    contract_match: match,
    narrative: narrativeResult.narrative,
    activation_message: narrativeResult.activation_message,
    confidence: narrativeResult.confidence,
    used_gemini: narrativeResult.used_gemini,
    activated_at: activatedAt,
  };
}
