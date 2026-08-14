/**
 * CogniX Enterprise Memory & Learning Pattern Repository Abstractions
 * Defines domain boundaries enabling data persistence layers to evolve independently.
 */

import {
  EnterpriseMemoryCase,
  MemorySearchRequest,
  EnterpriseLearningPattern,
  PatternMatchRequest
} from '../../../packages/contracts/src/index';

export interface IMemoryRepository {
  registerMemoryCase(caseObj: EnterpriseMemoryCase): EnterpriseMemoryCase;
  getMemoryCaseById(id: string): EnterpriseMemoryCase | null;
  queryMemoryCases(filter: { tenant_id?: string; category?: string; pattern_id?: string; limit?: number }): EnterpriseMemoryCase[];
  searchMemoryPrecedents(request: MemorySearchRequest): EnterpriseMemoryCase[];
  clear(): void;
}

export interface ILearningPatternRepository {
  getLearningPatternById(id: string): EnterpriseLearningPattern | null;
  queryLearningPatterns(filter: { tenant_id?: string; type?: string; category?: string; limit?: number }): EnterpriseLearningPattern[];
  matchLearningPatterns(request: PatternMatchRequest): EnterpriseLearningPattern[];
  getSupportingMemories(patternId: string, tenantId?: string): EnterpriseMemoryCase[];
  clear(): void;
}
