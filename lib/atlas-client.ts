/**
 * CogniX Capability Atlas Client Adapter
 *
 * The Atlas UI consumes the ATL backend and holds no capability content of its own (ADR-046).
 * Browser JavaScript always fetches same-origin relative endpoints under /api/v1/atlas/*.
 * Every string a user reads about a capability arrives through one of these calls.
 */

import type {
  CapabilityIdentity,
  ResolvedCapability,
  DemoMaturity,
  SearchResponse,
  AudienceLens
} from '@/packages/contracts/src/capability-atlas-model';
import type { QueryHint } from '@/lib/atlas/query-understanding';

export type CapabilityListItem = CapabilityIdentity & { demo_maturity: DemoMaturity | null };
export type AtlasSearchResponse = SearchResponse & { hints: QueryHint[] };

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
