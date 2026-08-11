// Contract Library — deterministic search & match against pre-extracted PDF clause cache
// PDFs are source of truth for display; extracted.json is one-time parse cache (never re-parsed at runtime)

import libraryData from '@/data/contract-library.json';
import extractedData from '@/data/documents/extracted.json';
import suppliers from '@/data/suppliers.json';

let _supplyChain: Array<{ date: string; supplier_id: string; status: string }> | null = null;

async function getSupplyChainRecords() {
  if (!_supplyChain) {
    const data = await import('@/data/supply_chain.json');
    _supplyChain = data.default as Array<{ date: string; supplier_id: string; status: string }>;
  }
  return _supplyChain;
}

function getLast14DaySet(): Set<string> {
  const dates: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date('2026-06-04');
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return new Set(dates);
}

export async function getBreachContext(failingSupplierId: string) {
  const supplier = suppliers.find(s => s.supplier_id === failingSupplierId);
  const sc = await getSupplyChainRecords();
  const last14 = getLast14DaySet();
  const deliveries = sc.filter(d => last14.has(d.date) && d.supplier_id === failingSupplierId);

  let delayRatePct: number;
  if (deliveries.length > 0) {
    const delayed = deliveries.filter(d => d.status !== 'on_time').length;
    delayRatePct = Math.round((delayed / deliveries.length) * 100);
  } else {
    delayRatePct = supplier ? Math.round((1 - supplier.on_time_rate) * 100) : 42;
  }

  return {
    failing_supplier_id: failingSupplierId,
    failing_supplier_name: supplier?.name ?? 'FreshDirect UK',
    delay_rate_pct: delayRatePct,
    category: supplier?.category ?? 'Produce',
  };
}

export type ContractRole = 'primary' | 'backup';

export interface LibraryContract {
  contract_id: string;
  title: string;
  document_ref: string;
  role: ContractRole;
  supplier_id: string;
  supplier_name: string;
  backup_supplier_id: string | null;
  backup_supplier_name: string | null;
  category: string;
  region: string;
  region_store_ids: string[];
  status: string;
  document_html: string;
  document_pdf: string;
  sla: {
    on_time_delivery_pct: number;
    breach_threshold_pct: number;
    measurement_window_days: number;
  };
  backup_activation: {
    status: string;
    activated_at: string | null;
    volume_pct: number;
    weekly_exposure_mitigated_gbp: number;
  };
}

export interface ExtractedClause {
  clause_ref: string;
  type: string;
  title: string;
  text: string;
  anchor: string;
  page: number;
  volume_pct?: number;
  penalty_per_cycle_gbp?: number;
  backup_contract_id?: string;
  backup_supplier_name?: string;
}

export interface SearchTraceItem {
  contract_id: string;
  supplier_name: string;
  title: string;
  result: 'excluded' | 'trigger' | 'matched' | 'activated';
  reason: string;
}

export interface ContractMatchResult {
  primary_contract_id: string;
  activated_contract_id: string;
  primary_supplier_name: string;
  backup_supplier_name: string;
  matched_clause_ref: string;
  matched_clause_title: string;
  matched_clause_excerpt: string;
  matched_clause_anchor: string;
  activated_clause_ref: string;
  activated_clause_anchor: string;
  volume_pct: number;
  region: string;
  affected_store_count: number;
  document_ref: string;
  primary_document_html: string;
  primary_document_pdf: string;
  activated_document_html: string;
  activated_document_pdf: string;
  breach_delay_rate_pct: number;
  breach_threshold_pct: number;
  weekly_exposure_gbp: number;
}

export interface LibrarySearchResult {
  search_trace: SearchTraceItem[];
  match: ContractMatchResult | null;
  clause_chunks: Array<{ contract_id: string; clause_ref: string; text: string }>;
}

const library = libraryData as LibraryContract[];
const extracted = extractedData as Record<string, { clauses: ExtractedClause[] }>;

const contractStates = new Map<string, LibraryContract>(
  library.map(c => [c.contract_id, structuredClone(c)])
);

export function getLibraryContracts(): LibraryContract[] {
  return library.map(c => contractStates.get(c.contract_id)!);
}

function getClause(contractId: string, type: string): ExtractedClause | undefined {
  return extracted[contractId]?.clauses.find(c => c.type === type);
}

function getClauseByRef(contractId: string, ref: string): ExtractedClause | undefined {
  return extracted[contractId]?.clauses.find(c => c.clause_ref === ref);
}

export function getBreachContextSync(failingSupplierId: string) {
  const supplier = suppliers.find(s => s.supplier_id === failingSupplierId);
  const delayRatePct = supplier ? Math.round((1 - supplier.on_time_rate) * 100) : 42;
  return {
    failing_supplier_id: failingSupplierId,
    failing_supplier_name: supplier?.name ?? 'FreshDirect UK',
    delay_rate_pct: delayRatePct,
    category: supplier?.category ?? 'Produce',
  };
}

export interface MatchCriteria {
  category: string;
  region: string;
  failing_supplier_id: string;
  backup_supplier_id: string;
}

export async function searchContractLibrary(criteria: MatchCriteria): Promise<LibrarySearchResult> {
  const breach = await getBreachContext(criteria.failing_supplier_id);
  const trace: SearchTraceItem[] = [];
  const clauseChunks: LibrarySearchResult['clause_chunks'] = [];

  for (const contract of library) {
    if (contract.category !== criteria.category) {
      trace.push({
        contract_id: contract.contract_id,
        supplier_name: contract.supplier_name,
        title: contract.title,
        result: 'excluded',
        reason: `Category mismatch: contract covers ${contract.category}, required ${criteria.category}`,
      });
      continue;
    }

    if (contract.role === 'primary' && contract.supplier_id !== criteria.failing_supplier_id) {
      trace.push({
        contract_id: contract.contract_id,
        supplier_name: contract.supplier_name,
        title: contract.title,
        result: 'excluded',
        reason: `Supplier mismatch: not the failing primary supplier`,
      });
      continue;
    }

    if (contract.role === 'backup' && contract.supplier_id !== criteria.backup_supplier_id) {
      trace.push({
        contract_id: contract.contract_id,
        supplier_name: contract.supplier_name,
        title: contract.title,
        result: 'excluded',
        reason: `Not the designated backup supplier for this scenario`,
      });
      continue;
    }

    if (contract.region !== criteria.region && contract.region !== 'National') {
      trace.push({
        contract_id: contract.contract_id,
        supplier_name: contract.supplier_name,
        title: contract.title,
        result: 'excluded',
        reason: `Region mismatch: contract covers ${contract.region}, required ${criteria.region}`,
      });
      continue;
    }
  }

  const primaryContract = library.find(
    c => c.role === 'primary' && c.supplier_id === criteria.failing_supplier_id && c.category === criteria.category
  );
  const backupContract = library.find(
    c => c.role === 'backup' && c.supplier_id === criteria.backup_supplier_id && c.category === criteria.category
  );

  if (!primaryContract) {
    return { search_trace: trace, match: null, clause_chunks: [] };
  }

  const primaryClause = getClause(primaryContract.contract_id, 'backup_activation');
  const slaClause = getClause(primaryContract.contract_id, 'sla');
  const backupActivationClause = backupContract
    ? getClause(backupContract.contract_id, 'activation') ?? getClause(backupContract.contract_id, 'scope')
    : undefined;

  if (!primaryClause) {
    trace.push({
      contract_id: primaryContract.contract_id,
      supplier_name: primaryContract.supplier_name,
      title: primaryContract.title,
      result: 'excluded',
      reason: 'No backup activation clause found in extracted document',
    });
    return { search_trace: trace, match: null, clause_chunks: [] };
  }

  const threshold = primaryContract.sla.breach_threshold_pct;
  const breachConfirmed = breach.delay_rate_pct > threshold;

  trace.push({
    contract_id: primaryContract.contract_id,
    supplier_name: primaryContract.supplier_name,
    title: primaryContract.title,
    result: breachConfirmed ? 'trigger' : 'excluded',
    reason: breachConfirmed
      ? `SLA breach confirmed: ${breach.delay_rate_pct}% delay rate exceeds ${threshold}% threshold (Clause ${primaryClause.clause_ref})`
      : `Delay rate ${breach.delay_rate_pct}% does not exceed ${threshold}% breach threshold`,
  });

  if (backupContract) {
    trace.push({
      contract_id: backupContract.contract_id,
      supplier_name: backupContract.supplier_name,
      title: backupContract.title,
      result: breachConfirmed ? 'matched' : 'excluded',
      reason: breachConfirmed
        ? `Backup supplier matched for ${criteria.category} in ${criteria.region} region`
        : 'Backup not required — primary SLA not breached',
    });
  }

  if (!breachConfirmed || !backupContract) {
    return { search_trace: trace, match: null, clause_chunks: [] };
  }

  if (slaClause) {
    clauseChunks.push({ contract_id: primaryContract.contract_id, clause_ref: slaClause.clause_ref, text: slaClause.text });
  }
  clauseChunks.push({ contract_id: primaryContract.contract_id, clause_ref: primaryClause.clause_ref, text: primaryClause.text });
  if (backupActivationClause) {
    clauseChunks.push({ contract_id: backupContract.contract_id, clause_ref: backupActivationClause.clause_ref, text: backupActivationClause.text });
  }

  trace.push({
    contract_id: backupContract.contract_id,
    supplier_name: backupContract.supplier_name,
    title: backupContract.title,
    result: 'activated',
    reason: `Backup contract activated at ${primaryClause.volume_pct ?? primaryContract.backup_activation.volume_pct}% volume`,
  });

  const match: ContractMatchResult = {
    primary_contract_id: primaryContract.contract_id,
    activated_contract_id: backupContract.contract_id,
    primary_supplier_name: primaryContract.supplier_name,
    backup_supplier_name: backupContract.supplier_name,
    matched_clause_ref: primaryClause.clause_ref,
    matched_clause_title: primaryClause.title,
    matched_clause_excerpt: primaryClause.text,
    matched_clause_anchor: primaryClause.anchor,
    activated_clause_ref: backupActivationClause?.clause_ref ?? '4.2',
    activated_clause_anchor: backupActivationClause?.anchor ?? 'clause-4-2',
    volume_pct: primaryClause.volume_pct ?? primaryContract.backup_activation.volume_pct,
    region: criteria.region,
    affected_store_count: primaryContract.region_store_ids.length,
    document_ref: primaryContract.document_ref,
    primary_document_html: primaryContract.document_html,
    primary_document_pdf: primaryContract.document_pdf,
    activated_document_html: backupContract.document_html,
    activated_document_pdf: backupContract.document_pdf,
    breach_delay_rate_pct: breach.delay_rate_pct,
    breach_threshold_pct: threshold,
    weekly_exposure_gbp: primaryContract.backup_activation.weekly_exposure_mitigated_gbp,
  };

  return { search_trace: trace, match, clause_chunks: clauseChunks };
}

export function activateBackupContract(primaryContractId: string, approvedBy: string): void {
  const contract = contractStates.get(primaryContractId);
  if (contract) {
    contract.backup_activation.status = 'active';
    contract.backup_activation.activated_at = new Date().toISOString();
  }
  const backup = library.find(c => c.role === 'backup' && c.category === contract?.category);
  if (backup) {
    const state = contractStates.get(backup.contract_id);
    if (state) {
      state.backup_activation.status = 'active';
      state.backup_activation.activated_at = new Date().toISOString();
    }
  }
}

export async function searchPenaltyMatch(failingSupplierId: string, category: string): Promise<{
  trace: SearchTraceItem[];
  match: ContractMatchResult | null;
  clauseChunks: LibrarySearchResult['clause_chunks'];
}> {
  const breach = await getBreachContext(failingSupplierId);
  const trace: SearchTraceItem[] = [];
  const clauseChunks: LibrarySearchResult['clause_chunks'] = [];

  for (const contract of library) {
    if (contract.category !== category) {
      trace.push({
        contract_id: contract.contract_id,
        supplier_name: contract.supplier_name,
        title: contract.title,
        result: 'excluded',
        reason: `Category mismatch (${contract.category})`,
      });
    }
  }

  const primary = library.find(c => c.role === 'primary' && c.supplier_id === failingSupplierId);
  if (!primary) return { trace, match: null, clauseChunks };

  const penaltyClause = getClause(primary.contract_id, 'penalty');
  if (!penaltyClause) return { trace, match: null, clauseChunks };

  trace.push({
    contract_id: primary.contract_id,
    supplier_name: primary.supplier_name,
    title: primary.title,
    result: 'matched',
    reason: `Penalty clause ${penaltyClause.clause_ref} triggered — SLA breach at ${breach.delay_rate_pct}%`,
  });

  clauseChunks.push({ contract_id: primary.contract_id, clause_ref: penaltyClause.clause_ref, text: penaltyClause.text });

  const match: ContractMatchResult = {
    primary_contract_id: primary.contract_id,
    activated_contract_id: primary.contract_id,
    primary_supplier_name: primary.supplier_name,
    backup_supplier_name: primary.backup_supplier_name ?? '',
    matched_clause_ref: penaltyClause.clause_ref,
    matched_clause_title: penaltyClause.title,
    matched_clause_excerpt: penaltyClause.text,
    matched_clause_anchor: penaltyClause.anchor,
    activated_clause_ref: penaltyClause.clause_ref,
    activated_clause_anchor: penaltyClause.anchor,
    volume_pct: 0,
    region: primary.region,
    affected_store_count: primary.region_store_ids.length,
    document_ref: primary.document_ref,
    primary_document_html: primary.document_html,
    primary_document_pdf: primary.document_pdf,
    activated_document_html: primary.document_html,
    activated_document_pdf: primary.document_pdf,
    breach_delay_rate_pct: breach.delay_rate_pct,
    breach_threshold_pct: primary.sla.breach_threshold_pct,
    weekly_exposure_gbp: penaltyClause.penalty_per_cycle_gbp ?? 4200,
  };

  return { trace, match, clauseChunks };
}

export function getExtractedClause(contractId: string, clauseRef: string): ExtractedClause | undefined {
  return getClauseByRef(contractId, clauseRef);
}
