/**
 * CTW-02 — planned interventions, scoped to one tenant and session.
 *
 * Replaceable in exactly the way the estate's other stores are: an interface, an in-memory
 * implementation, and no persistence assumption leaking into callers.
 *
 * Nothing here is ever mutated in place beyond appending. A reassessment is added, never replaced;
 * a status change carries the reassessment that caused it. The record's value is the trail.
 */

import {
  PlannedIntervention,
  PlannedInterventionReassessment,
  PlannedInterventionStatus,
  InterventionConfirmation
} from '../packages/contracts/src/campaign-intervention-model';

export interface IPlannedInterventionStore {
  create(plan: PlannedIntervention): PlannedIntervention;
  getById(id: string, tenantId: string, sessionId: string): PlannedIntervention | null;
  listForSession(tenantId: string, sessionId: string): PlannedIntervention[];
  addReassessment(id: string, tenantId: string, sessionId: string, r: PlannedInterventionReassessment, status?: PlannedInterventionStatus): PlannedIntervention | null;
  reschedule(id: string, tenantId: string, sessionId: string, targetedFlightDay: number): PlannedIntervention | null;
  confirm(id: string, tenantId: string, sessionId: string, c: InterventionConfirmation): PlannedIntervention | null;
  setStatus(id: string, tenantId: string, sessionId: string, status: PlannedInterventionStatus): PlannedIntervention | null;
  clear(tenantId?: string, sessionId?: string): void;
}

function key(tenantId: string, sessionId: string): string {
  return `${tenantId}::${sessionId}`;
}

class InMemoryPlannedInterventionStore implements IPlannedInterventionStore {
  private bySession = new Map<string, PlannedIntervention[]>();

  create(plan: PlannedIntervention): PlannedIntervention {
    const k = key(plan.tenant_id, plan.session_id);
    const list = this.bySession.get(k) || [];
    list.push(plan);
    this.bySession.set(k, list);
    return plan;
  }

  getById(id: string, tenantId: string, sessionId: string): PlannedIntervention | null {
    return (this.bySession.get(key(tenantId, sessionId)) || []).find(p => p.intervention_id === id) || null;
  }

  listForSession(tenantId: string, sessionId: string): PlannedIntervention[] {
    return [...(this.bySession.get(key(tenantId, sessionId)) || [])];
  }

  addReassessment(
    id: string,
    tenantId: string,
    sessionId: string,
    r: PlannedInterventionReassessment,
    status?: PlannedInterventionStatus
  ): PlannedIntervention | null {
    const p = this.getById(id, tenantId, sessionId);
    if (!p) return null;
    p.reassessments.push(r);
    if (status) p.status = status;
    return p;
  }

  reschedule(id: string, tenantId: string, sessionId: string, targetedFlightDay: number): PlannedIntervention | null {
    const p = this.getById(id, tenantId, sessionId);
    if (!p) return null;
    p.targeted_flight_day = targetedFlightDay;
    return p;
  }

  confirm(id: string, tenantId: string, sessionId: string, c: InterventionConfirmation): PlannedIntervention | null {
    const p = this.getById(id, tenantId, sessionId);
    if (!p) return null;
    p.confirmation = c;
    p.status = 'CONFIRMED';
    return p;
  }

  setStatus(id: string, tenantId: string, sessionId: string, status: PlannedInterventionStatus): PlannedIntervention | null {
    const p = this.getById(id, tenantId, sessionId);
    if (!p) return null;
    p.status = status;
    return p;
  }

  clear(tenantId?: string, sessionId?: string): void {
    if (tenantId && sessionId) this.bySession.delete(key(tenantId, sessionId));
    else this.bySession.clear();
  }
}

export const plannedInterventionStore: IPlannedInterventionStore = new InMemoryPlannedInterventionStore();
