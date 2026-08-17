/**
 * CogniX CDI-07A — Immutable Decision Contract Store
 * create / markSuperseded / markWithdrawn / tenant-scoped reads ONLY.
 */

import {
  DecisionContract,
  DecisionContractReference,
  computeContractDigest
} from '../packages/contracts/src/index';

export interface IDecisionContractStore {
  create(contract: DecisionContract): DecisionContract;
  getById(
    contractId: string,
    tenantId: string,
    sessionId: string
  ): DecisionContract | null;
  getActiveForSession(tenantId: string, sessionId: string): DecisionContract | null;
  listForSession(tenantId: string, sessionId: string): DecisionContract[];
  markSuperseded(
    priorId: string,
    tenantId: string,
    sessionId: string,
    by: DecisionContractReference
  ): DecisionContract | null;
  markWithdrawn(
    contractId: string,
    tenantId: string,
    sessionId: string,
    withdrawal: DecisionContract['withdrawal']
  ): DecisionContract | null;
  clear(tenantId?: string, sessionId?: string): void;
}

function sessionKey(tenantId: string, sessionId: string): string {
  return `${tenantId}::${sessionId}`;
}

/**
 * Immutability at the boundary (gate §9.2, C-INV-5). `Object.freeze` is shallow, so a shallow
 * freeze leaves `basis`, `resolution`, `assumptions` and `triggers` writable through the very
 * reference the store hands back. Deep-freeze the detached copy instead.
 */
function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  for (const key of Object.getOwnPropertyNames(value)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return Object.freeze(value);
}

function frozenCopy(contract: DecisionContract): DecisionContract {
  return deepFreeze(JSON.parse(JSON.stringify(contract))) as DecisionContract;
}

class InMemoryDecisionContractStore implements IDecisionContractStore {
  private byId = new Map<string, DecisionContract>();
  private activeBySession = new Map<string, string>();

  create(contract: DecisionContract): DecisionContract {
    if (this.byId.has(contract.contract_id)) {
      throw Object.assign(new Error('RJ-C9: Contract already exists; mutation forbidden'), {
        rejection_id: 'RJ-C9'
      });
    }
    const frozen = frozenCopy(contract);
    this.byId.set(frozen.contract_id, frozen);
    if (frozen.status === 'ACTIVE') {
      this.activeBySession.set(sessionKey(frozen.tenant_id, frozen.session_id), frozen.contract_id);
    }
    return frozen;
  }

  getById(contractId: string, tenantId: string, sessionId: string): DecisionContract | null {
    const c = this.byId.get(contractId);
    if (!c) return null;
    if (c.tenant_id !== tenantId || c.session_id !== sessionId) return null;
    return c;
  }

  getActiveForSession(tenantId: string, sessionId: string): DecisionContract | null {
    const id = this.activeBySession.get(sessionKey(tenantId, sessionId));
    if (!id) return null;
    return this.getById(id, tenantId, sessionId);
  }

  listForSession(tenantId: string, sessionId: string): DecisionContract[] {
    return [...this.byId.values()].filter(
      c => c.tenant_id === tenantId && c.session_id === sessionId
    );
  }

  markSuperseded(
    priorId: string,
    tenantId: string,
    sessionId: string,
    by: DecisionContractReference
  ): DecisionContract | null {
    const prior = this.getById(priorId, tenantId, sessionId);
    if (!prior || prior.status !== 'ACTIVE') return null;
    const next = frozenCopy({
      ...JSON.parse(JSON.stringify(prior)),
      status: 'SUPERSEDED',
      superseded_by: by
    });
    this.byId.set(priorId, next);
    const sk = sessionKey(tenantId, sessionId);
    if (this.activeBySession.get(sk) === priorId) {
      this.activeBySession.delete(sk);
    }
    return next;
  }

  markWithdrawn(
    contractId: string,
    tenantId: string,
    sessionId: string,
    withdrawal: DecisionContract['withdrawal']
  ): DecisionContract | null {
    const prior = this.getById(contractId, tenantId, sessionId);
    if (!prior || prior.status !== 'ACTIVE') return null;
    if (!withdrawal?.withdrawn_by || !withdrawal?.statement || !withdrawal?.withdrawn_as_of) {
      throw Object.assign(new Error('Withdrawal requires withdrawn_by, statement, withdrawn_as_of'), {
        rejection_id: 'RJ-C9'
      });
    }
    const next = frozenCopy({
      ...JSON.parse(JSON.stringify(prior)),
      status: 'WITHDRAWN',
      withdrawal
    });
    this.byId.set(contractId, next);
    const sk = sessionKey(tenantId, sessionId);
    if (this.activeBySession.get(sk) === contractId) {
      this.activeBySession.delete(sk);
    }
    return next;
  }

  clear(tenantId?: string, sessionId?: string): void {
    if (!tenantId) {
      this.byId.clear();
      this.activeBySession.clear();
      return;
    }
    for (const [id, c] of [...this.byId.entries()]) {
      if (c.tenant_id !== tenantId) continue;
      if (sessionId && c.session_id !== sessionId) continue;
      this.byId.delete(id);
    }
    for (const [sk] of [...this.activeBySession.entries()]) {
      if (!sk.startsWith(`${tenantId}::`)) continue;
      if (sessionId && sk !== sessionKey(tenantId, sessionId)) continue;
      this.activeBySession.delete(sk);
    }
  }
}

export const decisionContractStore: IDecisionContractStore = new InMemoryDecisionContractStore();

export function toContractReference(c: DecisionContract): DecisionContractReference {
  return {
    contract_id: c.contract_id,
    contract_version: c.contract_version,
    contract_digest: computeContractDigest(c),
    decision_basis_digest: c.decision_basis_digest,
    tenant_id: c.tenant_id,
    session_id: c.session_id,
    status: c.status
  };
}
