/**
 * CogniX CDI-07B — Immutable Learning Candidate Store
 * create / tenant-scoped reads ONLY. No update method.
 */

import { LearningCandidate } from '../packages/contracts/src/campaign-learning-loop-model';

export interface ILearningCandidateStore {
  create(candidate: LearningCandidate): LearningCandidate;
  getById(candidateId: string, tenantId: string, sessionId: string): LearningCandidate | null;
  listForSession(tenantId: string, sessionId: string): LearningCandidate[];
  listForContract(contractId: string, tenantId: string, sessionId: string): LearningCandidate[];
  clear(tenantId?: string, sessionId?: string): void;
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  for (const key of Object.getOwnPropertyNames(value)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return Object.freeze(value);
}

function frozenCopy<T>(value: T): T {
  return deepFreeze(JSON.parse(JSON.stringify(value))) as T;
}

class InMemoryLearningCandidateStore implements ILearningCandidateStore {
  private byId = new Map<string, LearningCandidate>();

  create(candidate: LearningCandidate): LearningCandidate {
    if (this.byId.has(candidate.candidate_id)) {
      throw Object.assign(new Error('Learning candidate already exists; mutation forbidden'), {
        rejection_id: 'RJ-L1'
      });
    }
    const frozen = frozenCopy(candidate);
    this.byId.set(frozen.candidate_id, frozen);
    return frozen;
  }

  getById(candidateId: string, tenantId: string, sessionId: string): LearningCandidate | null {
    const row = this.byId.get(candidateId);
    if (!row) return null;
    if (row.tenant_id !== tenantId || row.session_id !== sessionId) return null;
    return row;
  }

  listForSession(tenantId: string, sessionId: string): LearningCandidate[] {
    return [...this.byId.values()].filter(
      c => c.tenant_id === tenantId && c.session_id === sessionId
    );
  }

  listForContract(contractId: string, tenantId: string, sessionId: string): LearningCandidate[] {
    return this.listForSession(tenantId, sessionId).filter(c => c.contract_id === contractId);
  }

  clear(tenantId?: string, sessionId?: string): void {
    if (!tenantId) {
      this.byId.clear();
      return;
    }
    for (const [id, row] of [...this.byId.entries()]) {
      if (row.tenant_id !== tenantId) continue;
      if (sessionId && row.session_id !== sessionId) continue;
      this.byId.delete(id);
    }
  }
}

export const learningCandidateStore: ILearningCandidateStore = new InMemoryLearningCandidateStore();
