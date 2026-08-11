// Gemini narrative for contract approval — uses cached clause chunks only (no PDF re-parse)
// Falls back to deterministic text if API unavailable (demo-safe)

import { generateGeminiContent, sanitize } from '@/lib/gemini';
import type { ContractMatchResult, SearchTraceItem } from '@/lib/contract-library';

export interface NarrativeInput {
  decisionTitle: string;
  decisionDetail: string;
  decisionImpact: string;
  actionType: string;
  match: ContractMatchResult;
  searchTrace: SearchTraceItem[];
  clauseChunks: Array<{ contract_id: string; clause_ref: string; text: string }>;
  apiKey?: string;
}

export interface NarrativeResult {
  narrative: string;
  activation_message: string;
  confidence: number;
  used_gemini: boolean;
}

function buildFallbackNarrative(input: NarrativeInput): NarrativeResult {
  const m = input.match;
  const excluded = input.searchTrace.filter(t => t.result === 'excluded').length;
  const searched = input.searchTrace.length;

  const narrative = `Searched ${searched} supplier agreements in the contract library. ${excluded} excluded (category/region mismatch). `
    + `Primary agreement ${m.primary_contract_id} (${m.primary_supplier_name}) confirms SLA breach: ${m.breach_delay_rate_pct}% delay rate exceeds ${m.breach_threshold_pct}% threshold. `
    + `Clause ${m.matched_clause_ref} authorizes activation of ${m.backup_supplier_name} at ${m.volume_pct}% of ${m.region} produce volume across ${m.affected_store_count} stores. `
    + `Backup framework ${m.activated_contract_id} matched and activated.`;

  let activation_message: string;
  if (input.actionType === 'enforce_penalty') {
    activation_message = `Penalty clause ${m.matched_clause_ref} enforced on ${m.primary_supplier_name}. Recovery invoice issued. ${input.decisionImpact}.`;
  } else {
    activation_message = `Backup contract ${m.activated_contract_id} activated via Clause ${m.matched_clause_ref}. ${m.volume_pct}% of ${m.region} produce volume rerouted from ${m.primary_supplier_name} to ${m.backup_supplier_name}. ${input.decisionImpact}.`;
  }

  return { narrative, activation_message, confidence: 92, used_gemini: false };
}

export async function generateApprovalNarrative(input: NarrativeInput): Promise<NarrativeResult> {
  const fallback = buildFallbackNarrative(input);
  const key = input.apiKey || process.env.GEMINI_API_KEY || '';
  if (!key) return fallback;

  try {
    const clauseText = input.clauseChunks
      .map(c => `[${c.contract_id} Clause ${c.clause_ref}]: ${c.text}`)
      .join('\n\n');

    const traceText = input.searchTrace
      .map(t => `${t.contract_id} (${t.supplier_name}): ${t.result} — ${t.reason}`)
      .join('\n');

    const prompt = sanitize(`
You are a Lidl UK supply chain decision intelligence assistant. An executive approved this decision.

DECISION: ${input.decisionTitle}
DETAIL: ${input.decisionDetail}
IMPACT: ${input.decisionImpact}

LIVE BREACH DATA:
- Delay rate: ${input.match.breach_delay_rate_pct}%
- Breach threshold: ${input.match.breach_threshold_pct}%
- Region: ${input.match.region}
- Stores affected: ${input.match.affected_store_count}

CONTRACT SEARCH TRACE:
${traceText}

MATCHED CLAUSE TEXT (from pre-extracted contract documents — quote these exactly, do not invent terms):
${clauseText}

Write two paragraphs as JSON only (no markdown):
{
  "narrative": "2-3 sentences explaining WHY this contract matched, referencing exact clause numbers and thresholds from the text above",
  "activation_message": "1-2 sentences confirming what was activated, with exact volume % and supplier names from the clauses",
  "confidence": 85-98 integer based on how clearly clauses support the action
}

Rules: Quote clause refs. Use exact numbers from clauses (35%, 30%, etc). Do not invent contract terms. Do not use the phrase "pre-approved" — say "backup supplier" or "matched backup contract".
`);

    const text = await generateGeminiContent(input.apiKey, prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      narrative: parsed.narrative || fallback.narrative,
      activation_message: parsed.activation_message || fallback.activation_message,
      confidence: Number(parsed.confidence) || fallback.confidence,
      used_gemini: true,
    };
  } catch {
    return fallback;
  }
}
