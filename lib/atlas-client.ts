/**
 * CogniX Capability Atlas Client Adapter
 *
 * The Atlas UI consumes the ATL backend and holds no capability content of its own (ADR-046).
 * Browser JavaScript always fetches same-origin relative endpoints under /api/v1/atlas/*.
 * Every string a user reads about a capability arrives through one of these calls.
 */

import type {
  QueryExpansion,
  CapabilityIdentity,
  ResolvedCapability,
  DemoMaturity,
  SearchResponse,
  AudienceLens,
  ImplementationStatus,
  LifecycleState,
  CapabilityAreaAspect,
  BusinessProblem,
  PlatformMetadata,
  ExplorationContext,
  ClarificationChoice,
  ClarificationResponse
} from '@/packages/contracts/src/capability-atlas-model';
import type { QueryHint } from '@/lib/atlas/query-understanding';
import type { CuriosityQuestion } from '@/packages/contracts/src/capability-atlas-model';
import type { ClientContext, PreparationPack } from '@/packages/contracts/src/atlas-preparation-model';

export type CapabilityListItem = CapabilityIdentity & {
  demo_maturity: DemoMaturity | null;
  /** Present only when a lens was requested. Why this capability sits where it sits, in words. */
  lens_signals?: { id: string; rationale: string }[];
};
export type AtlasSearchResponse = SearchResponse & { hints: QueryHint[]; expansions?: QueryExpansion[] };

export interface AtlasDomain {
  category: string;
  items: { id: string; name: string; status: string; capability_count: number }[];
}

export interface AtlasRelationshipEdge {
  capability_id: string;
  name: string;
  solutions: { id: string; name: string; demo_maturity: DemoMaturity }[];
  experiments: { id: string; name: string; maturity: string }[];
  patterns: { id: string; title: string }[];
  work_packages: string[];
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Atlas request failed: ${res.status}`);
  }
  const payload = await res.json();
  return payload.data as T;
}

export function buildFilterQuery(filter: Record<string, string[] | boolean | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined) continue;
    if (typeof value === 'boolean') params.set(key, String(value));
    else if (value.length > 0) params.set(key, value.join(','));
  }
  return params.toString();
}

export function fetchCapabilities(query = ''): Promise<CapabilityListItem[]> {
  return get(`/api/v1/atlas/capabilities${query ? `?${query}` : ''}`);
}

export function fetchCapability(id: string, lens?: AudienceLens): Promise<ResolvedCapability> {
  return get(`/api/v1/atlas/capabilities/${encodeURIComponent(id)}${lens ? `?lens=${lens}` : ''}`);
}

export function fetchDomains(): Promise<AtlasDomain[]> {
  return get('/api/v1/atlas/domains');
}

export function fetchTags(): Promise<{ tag: string; count: number }[]> {
  return get('/api/v1/atlas/tags');
}

export function fetchRelationships(): Promise<{ edges: AtlasRelationshipEdge[]; delivered_by: { work_package: string; capability_ids: string[] }[] }> {
  return get('/api/v1/atlas/relationships');
}

export function searchAtlas(q: string, query = ''): Promise<AtlasSearchResponse> {
  const params = new URLSearchParams(query);
  params.set('q', q);
  return get(`/api/v1/atlas/search?${params.toString()}`);
}

export function fetchQuestions(capabilityId?: string): Promise<CuriosityQuestion[]> {
  return get(`/api/v1/atlas/questions${capabilityId ? `?capability_id=${encodeURIComponent(capabilityId)}` : ''}`);
}

// ── ATL-04R: landscape, clarification and platform identity ──────────────────

export interface AtlasAreaMember {
  capability_id: string;
  name: string;
  summary: string;
  implementation_status: ImplementationStatus;
  lifecycle_state: LifecycleState | null;
  demo_maturity: DemoMaturity | null;
  platform_reusable: boolean;
  domains: string[];
  business_problems: string[];
}

export interface AtlasArea {
  area_id: string;
  name: string;
  problem_space: string;
  what_cognix_does: string;
  invitation: string;
  rationale: string;
  aspects: CapabilityAreaAspect[];
  capability_count: number;
  reusable_count: number;
  implemented_count: number;
  members: AtlasAreaMember[];
}

export interface AtlasLandscape {
  areas: AtlasArea[];
  business_problems: BusinessProblem[];
  validation: { valid: boolean; checked: number; errors: { rule: string; message: string }[] };
}

export function fetchLandscape(): Promise<AtlasLandscape> {
  return get('/api/v1/atlas/areas');
}

export function fetchPlatformMetadata(): Promise<PlatformMetadata> {
  return get('/api/v1/platform');
}

/**
 * One clarification step. POST because the accumulated context is a structure; deterministic, so
 * this call never depends on a provider or a credential.
 */
export async function clarifyQuery(
  query: string,
  context?: ExplorationContext,
  step = 0,
  answer?: { choices?: ClarificationChoice[]; refinement?: string }
): Promise<ClarificationResponse> {
  const res = await fetch('/api/v1/atlas/clarify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, context, step, ...answer })
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Atlas request failed: ${res.status}`);
  }
  const payload = await res.json();
  return payload.data as ClarificationResponse;
}

/**
 * Prepare me for a client conversation (ATL-06D).
 *
 * `research` defaults to `false` here as it does on the route: the caller must set it deliberately,
 * so a preparation pack never reaches outward because a component forgot to pass a flag (ADR-056).
 * `context` carries the accumulated client context between turns, which is what makes a refinement
 * refine rather than restart (§31).
 */
export async function preparePack(request: {
  brief?: string;
  refinement?: string;
  choices?: string[];
  lens?: AudienceLens | null;
  context?: Partial<ClientContext>;
  research?: boolean;
}): Promise<PreparationPack> {
  const res = await fetch('/api/v1/atlas/prepare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      brief: request.brief ?? '',
      refinement: request.refinement,
      choices: request.choices,
      lens: request.lens ?? undefined,
      context: request.context,
      research: request.research === true
    })
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Preparation request failed: ${res.status}`);
  }
  const payload = await res.json();
  return payload.data as PreparationPack;
}
