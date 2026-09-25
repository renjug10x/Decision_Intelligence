/**
 * Record-carrying signal snapshots (`SCI-07R`, ADR-085 part 2)
 * ───────────────────────────────────────────────────────────────────────────────
 * The one way `cognix-world` is asked for a scenario's signals: the caller sends the scenario RECORD,
 * and this service runs the existing generator over it. It never resolves a scenario identity itself.
 *
 * Why the record travels rather than the id
 * ----------------------------------------
 * This process holds its own copy of the `SCI-01` registry, bootstrapped from compiled data. A
 * scenario authored and certified in the BFF never exists here, so `?scenario_id=` for it was refused
 * — or, on one BFF route, silently regenerated in-process while the estate was configured `service`
 * (`R-SCI07-6`). The BFF's gated scenario runtime is the only scenario authority; this service is a
 * stateless computation over what it resolved. A restart here therefore loses nothing.
 *
 * What this service still cannot do is verify certification: the gate lives with the engines, which
 * this service deliberately does not depend on (`R-28`). The BFF only sends records it resolved from a
 * registry in which every scenario has certified; a direct caller of this internal route is not so
 * constrained (`R-SCI07R-3`).
 */
import type { CanonicalScenario } from '../../../packages/contracts/src/canonical-scenario-model';

export const SIGNAL_SNAPSHOT_PATH = '/api/v1/signals/snapshot';

/** A generous ceiling for one scenario record; a request beyond it is refused unread. */
export const SIGNAL_SNAPSHOT_MAX_BODY_BYTES = 256 * 1024;

export interface ScenarioSignalSnapshotFilters {
  signal_type?: string;
  category?: string;
  entity_type?: string;
  entity_id?: string;
}

export interface ScenarioSignalSnapshotRequest {
  tenant_id?: string;
  scenario: CanonicalScenario;
  filters?: ScenarioSignalSnapshotFilters;
}

const REQUIRED_SECTIONS = ['identity', 'taxonomy', 'demand', 'supply', 'estate', 'inventory', 'calendar'] as const;

/**
 * Structural admission only: the record must have the sections the generator reads. This is not
 * certification and does not pretend to be.
 */
export function validateSignalSnapshotRequest(body: unknown): { ok: true; request: ScenarioSignalSnapshotRequest } | { ok: false; message: string } {
  const candidate = body as Partial<ScenarioSignalSnapshotRequest> | null;
  const scenario = candidate?.scenario as unknown as Record<string, unknown> | undefined;
  if (!scenario || typeof scenario !== 'object') {
    return { ok: false, message: 'A scenario record is required. This service does not resolve scenario identities.' };
  }
  const missing = REQUIRED_SECTIONS.filter(section => !scenario[section] || typeof scenario[section] !== 'object');
  if (missing.length > 0) {
    return { ok: false, message: `The scenario record is missing: ${missing.join(', ')}.` };
  }
  const id = (scenario.identity as Record<string, unknown>).scenario_id;
  if (typeof id !== 'string' || !id.trim()) {
    return { ok: false, message: 'The scenario record carries no scenario_id.' };
  }
  if (candidate?.tenant_id !== undefined && typeof candidate.tenant_id !== 'string') {
    return { ok: false, message: 'tenant_id must be a string.' };
  }
  return { ok: true, request: candidate as ScenarioSignalSnapshotRequest };
}
