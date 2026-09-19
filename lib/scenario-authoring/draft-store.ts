/**
 * The scenario draft store (`SCI-07`)
 * ───────────────────────────────────────────────────────────────────────────────
 * In-process, tenant-scoped, bounded. **No scenario database** — that is explicit `SCI-07`
 * non-scope, and richer persistence is a later decision the packet record defers on purpose.
 *
 * Why an in-memory store is the right answer here and not a shortcut
 * -----------------------------------------------------------------
 * A draft is the authoring session's own working state; the durable artefact is the confirmed
 * SCENARIO, which enters the registry, and the exportable artefact is the draft's inputs plus
 * their content hash, which a person can take away and bring back. Adding a database would
 * introduce schema, migration and retention questions that `SCI-08` and `SCI-10` should get
 * to answer with the UX in front of them, and would make the authoring path depend on
 * infrastructure the demonstration does not need.
 *
 * It follows the same shape as the stores the estate already runs — `campaign-intent-store`,
 * `decision-contract-store` — so nothing new has to be learned to read it.
 */

import type { ScenarioDraft } from '@/packages/contracts/src/scenario-draft-model';

/** Bounded so a long-running process cannot be made to hold drafts indefinitely. */
const MAX_DRAFTS_PER_TENANT = 50;

/**
 * And bounded in the OTHER dimension too, which is the one that actually matters here.
 *
 * `tenant_id` is self-declared on every authoring route — there is no authenticated identity in
 * the demonstration yet, the same limitation `CDI-01`'s throttle records about itself. A
 * per-tenant cap alone would therefore bound nothing: a caller varying the tenant string could
 * grow the store without limit. Capping the number of tenants is what makes the bound real.
 */
const MAX_TENANTS = 200;

class ScenarioDraftStore {
  private readonly byTenant = new Map<string, Map<string, ScenarioDraft>>();

  private tenant(tenantId: string): Map<string, ScenarioDraft> {
    let drafts = this.byTenant.get(tenantId);
    if (!drafts) {
      drafts = new Map();
      this.byTenant.set(tenantId, drafts);
      // Oldest tenant first, for the same reason drafts evict oldest first.
      while (this.byTenant.size > MAX_TENANTS) {
        const oldest = this.byTenant.keys().next().value as string | undefined;
        if (!oldest || oldest === tenantId) break;
        this.byTenant.delete(oldest);
      }
    }
    return drafts;
  }

  put(draft: ScenarioDraft): ScenarioDraft {
    const drafts = this.tenant(draft.tenant_id);
    drafts.set(draft.draft_id, draft);
    /*
     * Oldest first. A Map iterates in insertion order and a re-put keeps the original slot, so
     * eviction removes the least recently CREATED draft rather than the least recently touched —
     * which is what a person expects when they have one draft open and many abandoned.
     */
    while (drafts.size > MAX_DRAFTS_PER_TENANT) {
      const oldest = drafts.keys().next().value as string | undefined;
      if (!oldest) break;
      drafts.delete(oldest);
    }
    return draft;
  }

  get(tenantId: string, draftId: string): ScenarioDraft | undefined {
    return this.byTenant.get(tenantId)?.get(draftId);
  }

  list(tenantId: string): ScenarioDraft[] {
    return [...(this.byTenant.get(tenantId)?.values() ?? [])];
  }

  /** Test support, and the reset a demonstration uses to return to its opening position. */
  clear(tenantId?: string): void {
    if (tenantId) this.byTenant.delete(tenantId);
    else this.byTenant.clear();
  }
}

export const scenarioDraftStore = new ScenarioDraftStore();
