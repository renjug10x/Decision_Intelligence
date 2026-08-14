/**
 * CogniX Learning Pattern API Client
 * Typed client for querying and matching Enterprise Learning Patterns via same-origin BFF.
 */

import { EnterpriseLearningPattern, PatternMatchRequest, EnterpriseMemoryCase } from '../packages/contracts/src/index';

export async function fetchLearningPatterns(filter: { tenant_id?: string; type?: string; category?: string; limit?: number } = {}): Promise<EnterpriseLearningPattern[]> {
  const tenantId = filter.tenant_id || 'tenant_uk_retail_01';
  const query = new URLSearchParams();
  query.set('tenant_id', tenantId);
  if (filter.type) query.set('type', filter.type);
  if (filter.category) query.set('category', filter.category);
  if (filter.limit) query.set('limit', String(filter.limit));

  try {
    const res = await fetch(`/api/v1/learning-patterns?${query.toString()}`);
    if (res.ok) {
      const body = await res.json();
      return body.data || [];
    }
  } catch (e) {
    console.error('[LearningPatternClient] Failed to fetch learning patterns:', e);
  }
  return [];
}

export async function matchLearningPatterns(req: PatternMatchRequest): Promise<EnterpriseLearningPattern[]> {
  try {
    const res = await fetch('/api/v1/learning-patterns/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    if (res.ok) {
      const body = await res.json();
      return body.data || [];
    }
  } catch (e) {
    console.error('[LearningPatternClient] Failed to match learning patterns:', e);
  }
  return [];
}

export async function fetchLearningPatternById(id: string): Promise<EnterpriseLearningPattern | null> {
  try {
    const res = await fetch(`/api/v1/learning-patterns/${id}`);
    if (res.ok) {
      const body = await res.json();
      return body.data || null;
    }
  } catch (e) {
    console.error(`[LearningPatternClient] Failed to fetch pattern ${id}:`, e);
  }
  return null;
}

export async function fetchSupportingMemoriesForPattern(patternId: string, tenantId: string = 'tenant_uk_retail_01'): Promise<EnterpriseMemoryCase[]> {
  try {
    const res = await fetch(`/api/v1/learning-patterns/${patternId}/memories?tenant_id=${encodeURIComponent(tenantId)}`);
    if (res.ok) {
      const body = await res.json();
      return body.data || [];
    }
  } catch (e) {
    console.error(`[LearningPatternClient] Failed to fetch supporting memories for ${patternId}:`, e);
  }
  return [];
}
