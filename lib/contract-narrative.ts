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

  if (input.actionType === 'enforce_penalty') {
    return {
      narrative: `${m.primary_supplier_name} breach at ${m.breach_delay_rate_pct}% triggers Clause ${m.matched_clause_ref}.`,
      activation_message: `Penalty enforced — ${input.decisionImpact}.`,
      confidence: 92,
      used_gemini: false,
    };
  }

  return {
    narrative: `${m.primary_supplier_name} breach at ${m.breach_delay_rate_pct}% triggers Clause ${m.matched_clause_ref}.`,
    activation_message: `Activated ${m.activated_contract_id} — ${m.volume_pct}% volume to ${m.backup_supplier_name}. ${input.decisionImpact}.`,
    confidence: 92,
    used_gemini: false,
  };
}

export async function generateApprovalNarrative(input: NarrativeInput): Promise<NarrativeResult> {
  const fallback = buildFallbackNarrative(input);
  const key = input.apiKey || process.env.GEMINI_API_KEY || '';
  if (!key) return fallback;

  try {
    const clauseText = input.clauseChunks
      .map(c => `[${c.contract_id} Clause ${c.clause_ref}]: ${c.text}`)
      .join('\n');

    const prompt = sanitize(`
Executive approved: ${input.decisionTitle}
Impact: ${input.decisionImpact}
Breach: ${input.match.breach_delay_rate_pct}% delay vs ${input.match.breach_threshold_pct}% threshold · ${input.match.region} · ${input.match.affected_store_count} stores
Matched: ${input.match.activated_contract_id} via Clause ${input.match.matched_clause_ref} at ${input.match.volume_pct}%

Clause text (quote numbers exactly):
${clauseText}

Return JSON only:
{
  "narrative": "ONE sentence, max 20 words. Why this contract matched — clause ref and breach % only.",
  "activation_message": "ONE short line: activated contract ID, volume %, supplier. End with impact: ${input.decisionImpact}",
  "confidence": 85-98
}

No "pre-approved". Be concise. No repetition between narrative and activation_message.
`);

    const text = await generateGeminiContent(prompt, input.apiKey);
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
