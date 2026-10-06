/**
 * Authored scenario ownership (`SCI-07R`, ADR-085 part 4)
 * ───────────────────────────────────────────────────────────────────────────────
 * Which tenant confirmed which authored scenario. Nothing else.
 *
 * Why this lives in the authoring domain and not in the registry
 * -------------------------------------------------------------
 * Drafts are tenant-scoped; the `SCI-01` registry is not, and it is a frozen contract. Once a draft
 * was confirmed its scenario entered a process-global catalogue that every tenant read — measured in
 * `local` mode before this packet, where a second tenant's catalogue listed the first tenant's
 * scenario. The tenant is a property of the AUTHORING act, so the authoring domain records it, beside
 * the drafts it already scopes, and the scenario runtime filters by it. The registry does not learn
 * about tenants.
 *
 * Same lifetime as the registry
 * -----------------------------
 * In-process, like the registry entry it describes: the two are created together at confirmation
 * and lost together on restart, so an ownership record can never outlive, or be outlived by, the
 * scenario it names (`R-SCI07R-1`). It is NOT bounded separately — evicting an owner while the
 * registry kept the scenario would make a confirmed scenario invisible to the person who made it.
 *
 * `tenant_id` is self-declared everywhere in the demonstration. This is scoping, not authentication
 * (`R-SCI07R-2`).
 */

const ownerByScenarioId = new Map<string, string>();
const supersededByScenarioId = new Map<string, string>();

/** Raised when an authored scenario id is already owned by a different tenant. */
export class AuthoredScenarioOwnershipError extends Error {
  readonly scenarioId: string;
  constructor(scenarioId: string) {
    super(`Scenario "${scenarioId}" already belongs to another workspace and cannot be confirmed here.`);
    this.name = 'AuthoredScenarioOwnershipError';
    this.scenarioId = scenarioId;
  }
}

/**
 * Refuse, BEFORE anything is registered, an id another tenant already owns. Ids carry 40 random bits,
 * so this is a guard rather than an expected path — but a collision must never let one tenant replace
 * another's certified record.
 */
export function assertAuthoredScenarioAssignable(scenarioId: string, tenantId: string): void {
  const owner = ownerByScenarioId.get(scenarioId);
  if (owner !== undefined && owner !== tenantId) {
    throw new AuthoredScenarioOwnershipError(scenarioId);
  }
}

/** Record the tenant that confirmed an authored scenario. Called once, after it certified. */
export function recordAuthoredScenarioOwner(scenarioId: string, tenantId: string): void {
  assertAuthoredScenarioAssignable(scenarioId, tenantId);
  ownerByScenarioId.set(scenarioId, tenantId);
  supersededByScenarioId.delete(scenarioId);
}

/** The tenant that confirmed this scenario, or `undefined` if it was not authored here. */
export function authoredScenarioOwner(scenarioId: string): string | undefined {
  return ownerByScenarioId.get(scenarioId);
}

/**
 * Mark an authored scenario as superseded by a newly confirmed revision for the same tenant.
 * Superseded entries are omitted from the tenant's catalogue while remaining resolvable for any
 * active session until the revision is run or the scenario is deleted.
 */
export function markAuthoredScenarioSuperseded(
  priorScenarioId: string,
  tenantId: string,
  replacementScenarioId: string
): boolean {
  const owner = ownerByScenarioId.get(priorScenarioId);
  if (owner === undefined || owner !== tenantId || priorScenarioId === replacementScenarioId) {
    return false;
  }
  supersededByScenarioId.set(priorScenarioId, replacementScenarioId);
  return true;
}

/** Whether an authored scenario has been superseded by a newer confirmed revision. */
export function isAuthoredScenarioSuperseded(scenarioId: string): boolean {
  return supersededByScenarioId.has(scenarioId);
}

/** Follow the superseding chain to the current scenario id, if this scenario was revised. */
export function authoredScenarioCurrentRevision(scenarioId: string): string {
  let current = scenarioId;
  const visited = new Set<string>();
  while (supersededByScenarioId.has(current) && !visited.has(current)) {
    visited.add(current);
    current = supersededByScenarioId.get(current)!;
  }
  return current;
}

/**
 * Remove the tenant ownership record for an authored scenario (and any prior revisions in its
 * lineage) when that tenant deletes it. Returns all removed scenario ids, or an empty array if
 * the scenario was not owned by `tenantId`.
 */
export function removeAuthoredScenarioOwner(scenarioId: string, tenantId: string): string[] {
  const owner = ownerByScenarioId.get(scenarioId);
  if (owner === undefined || owner !== tenantId) {
    return [];
  }
  const targetRevision = authoredScenarioCurrentRevision(scenarioId);
  const removed: string[] = [];
  for (const [id, idOwner] of [...ownerByScenarioId.entries()]) {
    if (idOwner !== tenantId) continue;
    if (id === scenarioId || id === targetRevision || authoredScenarioCurrentRevision(id) === targetRevision) {
      ownerByScenarioId.delete(id);
      supersededByScenarioId.delete(id);
      removed.push(id);
    }
  }
  return removed;
}

/** Test support only — the registry has its own reset, and this one mirrors it. */
export function resetAuthoredScenarioOwnership(): void {
  ownerByScenarioId.clear();
  supersededByScenarioId.clear();
}

