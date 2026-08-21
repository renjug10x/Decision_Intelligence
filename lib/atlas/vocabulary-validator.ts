/**
 * Governed search vocabulary validation (ADR-059).
 *
 * The vocabulary is the one place in the Atlas where a human writes down a mapping that changes what
 * a search finds. That makes it the one place most likely to drift into invention — an alias added
 * because a demo query missed, pointing at a term the corpus does not actually use, quietly widening
 * recall in a way nobody can audit.
 *
 * Rule **W6** is the whole point of this file: every governed term an alias introduces must actually
 * appear in the governed text of at least one capability the alias names. An alias that cannot show
 * its terms in the corpus is inventing vocabulary, which is what `ATL-01` caught in the taxonomy and
 * what rule V3 has forbidden ever since. The remaining rules are hygiene around it.
 */

import type {
  CapabilityIdentity, ValidationIssue, ValidationReport, VocabularyAlias
} from '../../packages/contracts/src/capability-atlas-model';
import { VOCABULARY_ALIAS_ID_PATTERN } from '../../packages/contracts/src/capability-atlas-model';
import type { CapabilityIndex } from './capability-index';

const TOKEN = /^[a-z0-9]+$/;

function issue(rule: string, alias_id: string, field: string, message: string): ValidationIssue {
  return { rule, capability_id: alias_id, field, message, severity: 'error' };
}

export interface VocabularyValidationContext {
  identities: CapabilityIdentity[];
  index: CapabilityIndex;
}

export function validateVocabulary(
  vocabulary: VocabularyAlias[],
  ctx: VocabularyValidationContext
): ValidationReport {
  const errors: ValidationIssue[] = [];
  const seenIds = new Set<string>();
  const seenPhrases = new Set<string>();
  const capabilityIds = new Set(ctx.identities.map(c => c.capability_id));
  const textById = new Map(ctx.index.map(e => [
    e.identity.capability_id,
    Object.values(e.fields).join(' ').toLowerCase()
  ]));

  for (const a of vocabulary) {
    // W1 — identity
    if (!VOCABULARY_ALIAS_ID_PATTERN.test(a.alias_id)) {
      errors.push(issue('W1', a.alias_id, 'alias_id', `'${a.alias_id}' does not match the VOC-NNN namespace.`));
    }
    if (seenIds.has(a.alias_id)) {
      errors.push(issue('W1', a.alias_id, 'alias_id', 'Duplicate alias identifier.'));
    }
    seenIds.add(a.alias_id);

    // W2 — the phrase
    const phrase = a.phrase ?? '';
    if (phrase.trim().length < 3 || phrase !== phrase.toLowerCase()) {
      errors.push(issue('W2', a.alias_id, 'phrase', 'A phrase must be lowercase and at least three characters.'));
    }
    if (seenPhrases.has(phrase)) {
      errors.push(issue('W2', a.alias_id, 'phrase', `Duplicate phrase '${phrase}'.`));
    }
    seenPhrases.add(phrase);

    // W3 — terms are single tokens
    if (!a.governed_terms?.length) {
      errors.push(issue('W3', a.alias_id, 'governed_terms', 'An alias must introduce at least one governed term.'));
    }
    for (const term of a.governed_terms ?? []) {
      if (!TOKEN.test(term)) {
        errors.push(issue('W3', a.alias_id, 'governed_terms',
          `'${term}' is not a single lowercase token. Multi-word concepts are expressed as their component tokens.`));
      }
    }

    // W4 — a rationale a reviewer can disagree with
    if ((a.rationale ?? '').trim().length < 40) {
      errors.push(issue('W4', a.alias_id, 'rationale', 'An alias must carry a written rationale of at least 40 characters.'));
    }

    // W5 — evidence points at real capabilities
    if (!a.evidenced_by?.length) {
      errors.push(issue('W5', a.alias_id, 'evidenced_by', 'An alias must name at least one capability as evidence.'));
    }
    for (const ref of a.evidenced_by ?? []) {
      if (!capabilityIds.has(ref)) {
        errors.push(issue('W5', a.alias_id, 'evidenced_by', `'${ref}' is not a registered capability.`));
      }
    }

    // W6 — THE RULE. Every term must exist in the governed text of a named capability.
    const evidenceText = (a.evidenced_by ?? [])
      .map(ref => textById.get(ref) ?? '')
      .join(' ');
    for (const term of a.governed_terms ?? []) {
      if (!TOKEN.test(term)) continue;
      const present = new RegExp(`(?:^|[^a-z0-9])${term}`, 'i').test(evidenceText);
      if (!present) {
        errors.push(issue('W6', a.alias_id, 'governed_terms',
          `'${term}' appears nowhere in the governed text of ${(a.evidenced_by ?? []).join(', ')}. An alias may map onto vocabulary the corpus uses; it may not introduce vocabulary the corpus does not have.`));
      }
    }

    // W7 — an alias that restates a term it already contains does nothing
    const phraseTokens = new Set(phrase.split(/[^a-z0-9]+/).filter(Boolean));
    for (const term of a.governed_terms ?? []) {
      if (phraseTokens.has(term)) {
        errors.push(issue('W7', a.alias_id, 'governed_terms',
          `'${term}' is already a word in the phrase, so the expansion adds nothing.`));
      }
    }

    // W8 — provenance
    if (!a.owner?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(a.reviewed_at ?? '')) {
      errors.push(issue('W8', a.alias_id, 'reviewed_at', 'An alias must carry an owner and an ISO review date.'));
    }
  }

  return { valid: errors.length === 0, checked: vocabulary.length, errors, warnings: [] };
}
