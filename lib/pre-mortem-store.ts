/**
 * CogniX CDI-07B — Immutable Campaign Pre-Mortem Store
 * create / markSuperseded / tenant-scoped reads ONLY.
 */

import { CampaignPreMortem } from '../packages/contracts/src/campaign-learning-loop-model';

export interface IPreMortemStore {
  create(preMortem: CampaignPreMortem): CampaignPreMortem;
  getById(
    preMortemId: string,
    tenantId: string,
    sessionId: string
  ): CampaignPreMortem | null;
  getActiveForContract(
    contractId: string,
    tenantId: string,
    sessionId: string
  ): CampaignPreMortem | null;
  listForSession(tenantId: string, sessionId: string): CampaignPreMortem[];
  markSuperseded(
    preMortemId: string,
    tenantId: string,
    sessionId: string
  ): CampaignPreMortem | null;
  clear(tenantId?: string, sessionId?: string): void;
}

function sessionKey(tenantId: string, sessionId: string): string {
  return `${tenantId}::${sessionId}`;
}

function contractKey(tenantId: string, sessionId: string, contractId: string): string {
  return `${sessionKey(tenantId, sessionId)}::${contractId}`;
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

class InMemoryPreMortemStore implements IPreMortemStore {
  private byId = new Map<string, CampaignPreMortem>();
  private activeByContract = new Map<string, string>();

  create(preMortem: CampaignPreMortem): CampaignPreMortem {
    if (this.byId.has(preMortem.pre_mortem_id)) {
      throw Object.assign(new Error('Pre-mortem already exists; mutation forbidden'), {
        rejection_id: 'RJ-P5'
      });
    }
    const frozen = frozenCopy(preMortem);
    this.byId.set(frozen.pre_mortem_id, frozen);
    if (frozen.status === 'ACTIVE') {
      const ck = contractKey(frozen.tenant_id, frozen.session_id, frozen.contract_id);
      const priorId = this.activeByContract.get(ck);
      if (priorId && priorId !== frozen.pre_mortem_id) {
        this.markSuperseded(priorId, frozen.tenant_id, frozen.session_id);
      }
      this.activeByContract.set(ck, frozen.pre_mortem_id);
    }
    return frozen;
  }

  getById(preMortemId: string, tenantId: string, sessionId: string): CampaignPreMortem | null {
    const row = this.byId.get(preMortemId);
    if (!row) return null;
    if (row.tenant_id !== tenantId || row.session_id !== sessionId) return null;
    return row;
  }

  getActiveForContract(
    contractId: string,
    tenantId: string,
    sessionId: string
  ): CampaignPreMortem | null {
    const id = this.activeByContract.get(contractKey(tenantId, sessionId, contractId));
    if (!id) return null;
    return this.getById(id, tenantId, sessionId);
  }

  listForSession(tenantId: string, sessionId: string): CampaignPreMortem[] {
    return [...this.byId.values()].filter(
      p => p.tenant_id === tenantId && p.session_id === sessionId
    );
  }

  markSuperseded(
    preMortemId: string,
    tenantId: string,
    sessionId: string
  ): CampaignPreMortem | null {
    const prior = this.getById(preMortemId, tenantId, sessionId);
    if (!prior || prior.status !== 'ACTIVE') return null;
    const next = frozenCopy({
      ...JSON.parse(JSON.stringify(prior)),
      status: 'SUPERSEDED' as const
    });
    this.byId.set(preMortemId, next);
    const ck = contractKey(tenantId, sessionId, prior.contract_id);
    if (this.activeByContract.get(ck) === preMortemId) {
      this.activeByContract.delete(ck);
    }
    return next;
  }

  clear(tenantId?: string, sessionId?: string): void {
    if (!tenantId) {
      this.byId.clear();
      this.activeByContract.clear();
      return;
    }
    for (const [id, row] of [...this.byId.entries()]) {
      if (row.tenant_id !== tenantId) continue;
      if (sessionId && row.session_id !== sessionId) continue;
      this.byId.delete(id);
    }
    for (const [key] of [...this.activeByContract.entries()]) {
      if (!key.startsWith(`${tenantId}::`)) continue;
      if (sessionId && !key.startsWith(sessionKey(tenantId, sessionId))) continue;
      this.activeByContract.delete(key);
    }
  }
}

export const preMortemStore: IPreMortemStore = new InMemoryPreMortemStore();
