/**
 * CogniX Campaign Intent Domain Store (CDI-01)
 * In-memory tenant/session-isolated store for Campaign Decision Canvas drafts and registrations.
 */

import {
  CampaignIntent,
  createDefaultCampaignIntentDraft,
  deriveCanvasProgress,
  validateCampaignIntent
} from '../packages/contracts/src/index';

const byKey: Map<string, CampaignIntent> = new Map();
const byId: Map<string, CampaignIntent> = new Map();

function buildStoreKey(tenantId: string, sessionId: string): string {
  return `${tenantId}::${sessionId}`;
}

/**
 * Campaign Intent ids are derived from tenant/session, so an id alone is NOT an
 * authorisation token. Every write asserts that the id still belongs to the
 * tenant/session that owns it, and every id read is tenant-scoped at the caller.
 */
function assertIdOwnership(intent: CampaignIntent): void {
  const existing = byId.get(intent.campaign_intent_id);
  if (
    existing &&
    (existing.tenant_id !== intent.tenant_id || existing.session_id !== intent.session_id)
  ) {
    throw new Error(
      'CampaignIntent id is already owned by a different tenant/session; refusing cross-tenant write'
    );
  }
}

function stampProgress(intent: CampaignIntent): CampaignIntent {
  const progress = deriveCanvasProgress(intent);
  return {
    ...intent,
    canvas_progress: {
      ...progress,
      active_area: intent.canvas_progress?.active_area || progress.active_area
    },
    updated_at: new Date().toISOString()
  };
}

export function getOrCreateCampaignIntentDraft(
  tenantId: string,
  sessionId: string,
  options?: { domain_id?: string; scenario_id?: string }
): CampaignIntent {
  const key = buildStoreKey(tenantId, sessionId);
  const existing = byKey.get(key);
  if (existing) return { ...existing };

  const draft = stampProgress(createDefaultCampaignIntentDraft(tenantId, sessionId, options));
  assertIdOwnership(draft);
  byKey.set(key, draft);
  byId.set(draft.campaign_intent_id, draft);
  return { ...draft };
}

export function saveCampaignIntentDraft(intent: CampaignIntent): CampaignIntent {
  if (intent.status === 'REGISTERED') {
    throw new Error('Cannot overwrite a REGISTERED CampaignIntent via draft save; create a new draft session instead');
  }

  const withProgress = stampProgress({ ...intent, status: 'DRAFT' });
  assertIdOwnership(withProgress);
  const draftValidation = validateCampaignIntent(withProgress);
  // Drafts may be incomplete — allow structural top-level fields only
  const softErrors = draftValidation.errors.filter(e =>
    e.startsWith('Missing required field:') || e.includes('Security violation')
  );
  if (softErrors.length > 0) {
    throw new Error(`Invalid CampaignIntent draft: ${softErrors.join(', ')}`);
  }

  const key = buildStoreKey(withProgress.tenant_id, withProgress.session_id);
  byKey.set(key, withProgress);
  byId.set(withProgress.campaign_intent_id, withProgress);
  return { ...withProgress };
}

export function registerCampaignIntent(intent: CampaignIntent): CampaignIntent {
  const now = new Date().toISOString();
  const withProgress = stampProgress({
    ...intent,
    status: 'REGISTERED',
    registered_at: now,
    updated_at: now
  });

  assertIdOwnership(withProgress);
  const validation = validateCampaignIntent(withProgress, { requireRegistered: true });
  if (!validation.valid) {
    throw new Error(`Invalid CampaignIntent registration: ${validation.errors.join(', ')}`);
  }

  const key = buildStoreKey(withProgress.tenant_id, withProgress.session_id);
  byKey.set(key, withProgress);
  byId.set(withProgress.campaign_intent_id, withProgress);
  return { ...withProgress };
}

/**
 * Tenant-scoped id lookup. Campaign Intent ids are derived from tenant/session and are
 * therefore enumerable, so callers must supply the tenant (and optionally the session)
 * they are acting for. A mismatch is reported as "not found" to avoid an existence oracle.
 */
export function getCampaignIntentById(
  id: string,
  tenantId?: string,
  sessionId?: string
): CampaignIntent | null {
  const found = byId.get(id);
  if (!found) return null;
  if (tenantId && found.tenant_id !== tenantId) return null;
  if (sessionId && found.session_id !== sessionId) return null;
  return { ...found };
}

export function getCurrentCampaignIntent(tenantId: string, sessionId: string): CampaignIntent {
  return getOrCreateCampaignIntentDraft(tenantId, sessionId);
}

/** Persist additive refs (commercial intent / decision state) after registration side-effects. */
export function patchRegisteredCampaignIntent(
  campaignIntentId: string,
  patch: Partial<Pick<CampaignIntent, 'decision_context' | 'provenance'>>
): CampaignIntent | null {
  const existing = byId.get(campaignIntentId);
  if (!existing || existing.status !== 'REGISTERED') return null;

  const next: CampaignIntent = {
    ...existing,
    decision_context: patch.decision_context
      ? { ...existing.decision_context, ...patch.decision_context }
      : existing.decision_context,
    provenance: patch.provenance
      ? { ...existing.provenance, ...patch.provenance }
      : existing.provenance,
    updated_at: new Date().toISOString()
  };

  const key = buildStoreKey(next.tenant_id, next.session_id);
  byKey.set(key, next);
  byId.set(next.campaign_intent_id, next);
  return { ...next };
}

export function clearCampaignIntents(tenantId?: string, sessionId?: string): void {
  if (tenantId && sessionId) {
    const key = buildStoreKey(tenantId, sessionId);
    const intent = byKey.get(key);
    if (intent) {
      byId.delete(intent.campaign_intent_id);
      byKey.delete(key);
    }
  } else {
    byKey.clear();
    byId.clear();
  }
}
