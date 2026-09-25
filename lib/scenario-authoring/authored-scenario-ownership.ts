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
}

/** The tenant that confirmed this scenario, or `undefined` if it was not authored here. */
export function authoredScenarioOwner(scenarioId: string): string | undefined {
  return ownerByScenarioId.get(scenarioId);
}

/** Test support only — the registry has its own reset, and this one mirrors it. */
export function resetAuthoredScenarioOwnership(): void {
  ownerByScenarioId.clear();
}
