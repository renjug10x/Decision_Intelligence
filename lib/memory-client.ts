/**
 * CogniX Memory API Client
 * Typed client for querying and registering Enterprise Memory cases via same-origin BFF.
 */

import { EnterpriseMemoryCase, MemorySearchRequest } from '../packages/contracts/src/index';

export async function fetchMemoryCases(filter: { tenant_id?: string; category?: string; pattern_id?: string; limit?: number } = {}): Promise<EnterpriseMemoryCase[]> {
  const tenantId = filter.tenant_id || 'tenant_uk_retail_01';
  const query = new URLSearchParams();
  query.set('tenant_id', tenantId);
  if (filter.category) query.set('category', filter.category);
  if (filter.pattern_id) query.set('pattern_id', filter.pattern_id);
  if (filter.limit) query.set('limit', String(filter.limit));

  try {
    const res = await fetch(`/api/v1/memory?${query.toString()}`);
    if (res.ok) {
      const body = await res.json();
      return body.data || [];
    }
  } catch (e) {
    console.error('[MemoryClient] Failed to fetch memory cases:', e);
  }
  return [];
}

export async function searchMemoryPrecedents(req: MemorySearchRequest): Promise<EnterpriseMemoryCase[]> {
  try {
    const res = await fetch('/api/v1/memory/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    if (res.ok) {
      const body = await res.json();
      return body.data || [];
    }
  } catch (e) {
    console.error('[MemoryClient] Failed to search memory precedents:', e);
  }
  return [];
}

export async function fetchMemoryCaseById(id: string): Promise<EnterpriseMemoryCase | null> {
  try {
    const res = await fetch(`/api/v1/memory/${id}`);
    if (res.ok) {
      const body = await res.json();
      return body.data || null;
    }
  } catch (e) {
    console.error(`[MemoryClient] Failed to fetch memory case ${id}:`, e);
  }
  return null;
}
