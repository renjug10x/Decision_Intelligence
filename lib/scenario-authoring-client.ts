/**
 * Scenario authoring — the browser's transport to the `SCI-07` domain (`SCI-08`)
 * ───────────────────────────────────────────────────────────────────────────────
 * Same-origin calls to the governed authoring routes, and nothing else. This module holds no
 * scenario state, resolves nothing, certifies nothing and calculates nothing: readiness, coherence,
 * provenance, certification and every published quantity arrive from the server, which is the single
 * scenario authority (ADR-085). A confirmed scenario is run through the SAME selection path as a
 * curated pack (`activateScenarioOnServer` + the registry projection), not through anything here.
 *
 * No credential is read or sent. GenAI assistance is a server-side call the browser can only ask for.
 */
import type {
  ScenarioDraft,
  ScenarioDraftEnvelope,
  ScenarioDraftFieldProvenance,
  ScenarioDraftInputs,
  ScenarioDraftIssue,
  ScenarioDraftProposal,
  ScenarioCapabilityReadiness
} from '@/packages/contracts/src/scenario-draft-model';
import type { AttestedUpload, AttestedUploadMapping } from '@/packages/contracts/src/attested-upload-model';

export type { AttestedUpload, AttestedUploadMapping };

/** The lab's declared tenant — the same default the selector and activation already use. */
export const AUTHORING_TENANT_ID = 'tenant_uk_retail_01';

export interface AuthoringField {
  id: string;
  dimension: string;
  kind: 'NARRATIVE' | 'STRUCTURE' | 'POSTURE' | 'QUANTITY';
  label: string;
  genai_authorable: boolean;
  allowed_values?: string[];
  unit?: string;
}

export interface AuthoringSituation {
  id: string;
  label: string;
  decision_shape: string;
  evidence_opens_on: string;
  opening_postures: Record<string, unknown>;
}

export interface AuthoringProduct {
  sku_id: string;
  sku_name: string;
  category: string;
  subcategory: string;
  supplier_name: string;
}

export interface AuthoringOptions {
  situations: AuthoringSituation[];
  situations_not_supported: { label: string; reason: string }[];
  products: AuthoringProduct[];
  fields: AuthoringField[];
  genai_drafting_available: boolean;
  manual_authoring_available: boolean;
}

export interface DraftAssessment {
  draft: ScenarioDraft;
  resolves: boolean;
  issues: ScenarioDraftIssue[];
  readiness: ScenarioCapabilityReadiness[];
  field_provenance: ScenarioDraftFieldProvenance[];
  provenance_statement: string;
}

export interface ConfirmedScenario {
  draft: ScenarioDraft;
  scenario: { scenario_id: string; scenario_name: string; sku_name: string; supplier_name: string };
  certified: boolean;
  certification_summary: string;
  provenance_statement: string;
  activation_note: string;
}

export interface AssistResult {
  envelope: ScenarioDraftEnvelope;
  next_step: string;
}

/** A refusal the author can act on: the server's message and the issues it named. */
export class AuthoringRequestError extends Error {
  readonly status: number;
  readonly issues: ScenarioDraftIssue[];
  /** A closed refusal reason, where the server gave one (`SCI-10` uploads). */
  readonly reason?: string;
  /** What the server returned beside the refusal, e.g. the caller's own live duplicate upload. */
  readonly data?: unknown;
  constructor(message: string, status: number, issues: ScenarioDraftIssue[] = [], reason?: string, data?: unknown) {
    super(message);
    this.name = 'AuthoringRequestError';
    this.status = status;
    this.issues = issues;
    this.reason = reason;
    this.data = data;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    // JSON bodies declare themselves; a form upload lets the browser write its own multipart boundary.
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (typeof init?.body === 'string') headers['Content-Type'] = 'application/json';
    response = await fetch(path, {
      ...init,
      headers: { ...headers, ...((init?.headers as Record<string, string> | undefined) ?? {}) },
      cache: 'no-store'
    });
  } catch {
    throw new AuthoringRequestError('CogniX could not be reached. Nothing was changed.', 0);
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.status !== 'success') {
    throw new AuthoringRequestError(
      payload?.message || `The request was refused (HTTP ${response.status}).`,
      response.status,
      Array.isArray(payload?.issues) ? payload.issues : [],
      typeof payload?.reason === 'string' ? payload.reason : undefined,
      payload?.data
    );
  }
  return payload.data as T;
}

const post = <T>(path: string, body: unknown) => call<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const fetchAuthoringOptions = () => call<AuthoringOptions>('/api/v1/scenarios/authoring');

export const createScenarioDraft = (situation: string, inputs: ScenarioDraftInputs) =>
  post<DraftAssessment>('/api/v1/scenarios/drafts', { tenant_id: AUTHORING_TENANT_ID, situation, inputs });

export const importScenarioDraft = (file: unknown) =>
  post<DraftAssessment>('/api/v1/scenarios/drafts', { tenant_id: AUTHORING_TENANT_ID, import: file });

/**
 * `unsetFields` names the fields the author emptied: the server returns them to CogniX's declared
 * assumption (the governed unset, `R-SCI08-2`). Leaving a field out of `inputs` alone would keep it.
 */
export const updateScenarioDraft = (
  draftId: string,
  inputs: ScenarioDraftInputs,
  acceptedProposals: ScenarioDraftProposal[] = [],
  acceptedFromModel?: string,
  unsetFields: string[] = []
) => call<DraftAssessment>(`/api/v1/scenarios/drafts/${encodeURIComponent(draftId)}`, {
  method: 'PATCH',
  body: JSON.stringify({
    tenant_id: AUTHORING_TENANT_ID,
    inputs,
    accepted_proposals: acceptedProposals,
    accepted_from_model: acceptedFromModel,
    unset_fields: unsetFields
  })
});

export const requestDraftAssistance = (draftId: string, businessSituation: string) =>
  post<AssistResult>(`/api/v1/scenarios/drafts/${encodeURIComponent(draftId)}/assist`, {
    tenant_id: AUTHORING_TENANT_ID,
    business_situation: businessSituation
  });

export const confirmScenarioDraft = (draftId: string, confirmedBy: string, expectedContentHash: string) =>
  post<ConfirmedScenario>(`/api/v1/scenarios/drafts/${encodeURIComponent(draftId)}/confirm`, {
    tenant_id: AUTHORING_TENANT_ID,
    confirm: true,
    confirmed_by: confirmedBy,
    expected_content_hash: expectedContentHash
  });

// ── Attested upload (`SCI-10`, ADR-086) ─────────────────────────────────────────
// Transport only. The server fingerprints, validates, profiles, reduces and derives provenance; the
// browser sends the file, the mapping the person chose and their attestation, and renders what returns.

/** The declared contract's closed set — the only figures a file may supply. Vocabulary, not logic. */
export { ATTESTED_UPLOAD_ADMISSIBLE_FIELDS } from '@/packages/contracts/src/attested-upload-model';

const uploadsPath = (draftId: string) => `/api/v1/scenarios/drafts/${encodeURIComponent(draftId)}/uploads`;

export const uploadScenarioExtract = (draftId: string, file: File) => {
  const form = new FormData();
  form.append('tenant_id', AUTHORING_TENANT_ID);
  form.append('file', file);
  return call<{ upload: AttestedUpload }>(uploadsPath(draftId), { method: 'POST', body: form });
};

export const listScenarioExtracts = (draftId: string) =>
  call<{ uploads: AttestedUpload[] }>(`${uploadsPath(draftId)}?tenant_id=${AUTHORING_TENANT_ID}`);

export const admitScenarioExtract = (
  draftId: string,
  upload: Pick<AttestedUpload, 'upload_id' | 'content_sha256'>,
  mapping: AttestedUploadMapping[],
  attestedBy: string,
  statement: string
) => post<{ upload: AttestedUpload; assessment: DraftAssessment }>(
  `${uploadsPath(draftId)}/${encodeURIComponent(upload.upload_id)}/admit`,
  {
    tenant_id: AUTHORING_TENANT_ID,
    upload_id: upload.upload_id,
    expected_content_sha256: upload.content_sha256,
    mapping,
    attestation: {
      attested_by: attestedBy,
      attestation_statement: statement,
      attestation_kind: 'FIRST_PARTY_OPERATOR_ATTESTATION'
    }
  }
);

export const withdrawScenarioExtract = (draftId: string, uploadId: string) =>
  post<{ upload: AttestedUpload; assessment: DraftAssessment }>(
    `${uploadsPath(draftId)}/${encodeURIComponent(uploadId)}/withdraw`,
    { tenant_id: AUTHORING_TENANT_ID }
  );

export const exportScenarioDraft = (draftId: string) =>
  call<unknown>(`/api/v1/scenarios/drafts/${encodeURIComponent(draftId)}?tenant_id=${AUTHORING_TENANT_ID}&format=export`);

/** The decision the authoritative evaluator published for a scenario. Rendered, never recomputed. */
export interface EvaluatedDecision {
  scenarioId: string;
  baseDemand: number;
  expectedDemand: number;
  servableDemand: number;
  exposedGap: number;
  gapPct: string;
  revenueExposureGbp: number;
  marginExposureGbp: number;
  recommendedDepth: number;
  committedDepth: number;
  windowRemainingHours: number;
  windowState: string;
}

export async function fetchEvaluatedDecision(scenarioId: string): Promise<EvaluatedDecision> {
  const query = new URLSearchParams({ scenario_id: scenarioId, tenant_id: AUTHORING_TENANT_ID });
  return call<EvaluatedDecision>(`/api/v1/scenarios/decision?${query.toString()}`);
}
