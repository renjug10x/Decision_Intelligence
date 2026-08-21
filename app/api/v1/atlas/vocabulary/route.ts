import { ok } from '../_shared';
import { SEARCH_VOCABULARY } from '@/content/atlas/vocabulary';
import { validateVocabulary } from '@/lib/atlas/vocabulary-validator';
import { ALIAS_TERM_WEIGHT_FACTOR, FIELD_WEIGHTS } from '@/lib/atlas/capability-search';
import { capabilityRepository } from '@/services/atlas/src/capability-registry';
import { getCapabilityIndex } from '@/lib/atlas/capability-index';

/**
 * The governed search vocabulary (ADR-059).
 *
 * Published for the same reason `FIELD_WEIGHTS` and the grounding policy are: a rule that changes
 * what a searcher finds must be readable by that searcher. Every mapping is here with the phrase
 * that fires it, the governed terms it adds, the capabilities that evidence those terms, the written
 * rationale and the review date — and the validator's verdict, so a vocabulary that has drifted out
 * of agreement with the corpus is visible rather than merely broken.
 */
export async function GET() {
  const identities = capabilityRepository.listIdentities();
  const index = await getCapabilityIndex(identities);
  const report = validateVocabulary(SEARCH_VOCABULARY, { identities, index });

  return ok('capability-atlas-vocabulary', {
    count: SEARCH_VOCABULARY.length,
    aliases: SEARCH_VOCABULARY,
    ranking: {
      alias_term_weight_factor: ALIAS_TERM_WEIGHT_FACTOR,
      rule: 'A term the searcher typed always outranks one the vocabulary supplied, by exactly this factor.',
      field_weights: FIELD_WEIGHTS
    },
    visibility: 'Every expansion is returned with the search response — which alias fired, what it added and why. An alias never rewrites a query silently.',
    validation: {
      valid: report.valid,
      checked: report.checked,
      errors: report.errors,
      rules: {
        W1: 'alias_id matches VOC-NNN and is unique',
        W2: 'phrase is lowercase, at least three characters, and unique',
        W3: 'governed terms are single lowercase tokens',
        W4: 'a written rationale of at least 40 characters',
        W5: 'evidenced_by names registered capabilities',
        W6: 'every governed term appears in the governed text of a named capability — vocabulary is mapped, never invented',
        W7: 'a term already present in the phrase adds nothing and is refused',
        W8: 'owner and ISO review date are present'
      }
    },
    delivered_by: 'ADR-059, authorised from the ATL-06C Level 2 evaluation (ADR-058)'
  });
}
