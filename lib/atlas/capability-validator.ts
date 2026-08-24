/**
 * Capability validator — CAPABILITY_KNOWLEDGE_MODEL.md §9 rules V1 … V14.
 *
 * The validator is the mechanism by which the governance is not merely written down. Each rule
 * below cites the rule id it enforces, and every failure names the offending field so that a
 * rejection can be explained to the author rather than merely reported.
 */

import { DOMAIN_CATALOGUE } from '../../config/domains';
import { PERSONA_CATALOGUE } from '../../config/personas';
import { DEMONSTRATION_SOLUTIONS } from '../../config/solutions';
import { EXPERIMENT_REGISTRY } from '../../config/experiments';
import { CANONICAL_LEARNING_PATTERNS } from '../../services/learning/src/learning-pattern-store';
import { knowledgeRefExists } from '../../services/atlas/src/capability-knowledge-store';
import {
  CAPABILITY_ID_PATTERN,
  SUMMARY_MAX_LENGTH,
  MARKUP_PATTERN,
  NON_REAL_STATUSES,
  SYMMETRIC_RELATIONS,
  type CapabilityIdentity,
  type CapabilityKnowledge,
  type ValidationIssue,
  type ValidationReport
} from '../../packages/contracts/src/capability-atlas-model';

const VALID_DOMAIN_IDS = new Set(DOMAIN_CATALOGUE.flatMap(c => c.items.map(i => i.id)));
const VALID_PERSONA_IDS = new Set(PERSONA_CATALOGUE.flatMap(c => c.items.map(i => i.id)));
const VALID_SOLUTION_IDS = new Set(DEMONSTRATION_SOLUTIONS.map(s => s.id));
const VALID_EXPERIMENT_IDS = new Set(EXPERIMENT_REGISTRY.map(e => e.id));
const VALID_PATTERN_IDS = new Set(CANONICAL_LEARNING_PATTERNS.map(p => p.pattern_id));

function err(rule: string, capability_id: string, field: string, message: string): ValidationIssue {
  return { rule, capability_id, field, message, severity: 'error' };
}
function warn(rule: string, capability_id: string, field: string, message: string): ValidationIssue {
  return { rule, capability_id, field, message, severity: 'warning' };
}

/**
 * Identifiers are compared in FULL, never by numeric suffix.
 * ATL-01 gap G6: `PAT-BEH-05` and `PAT-INT-05` share the suffix `05`, so any matching that
 * keys on the number silently conflates two distinct patterns (AC-ATL-02-10).
 */
function isKnown(set: Set<string>, id: string): boolean {
  return set.has(id);
}

export function validateIdentities(identities: CapabilityIdentity[]): ValidationReport {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const seenIds = new Set<string>();

  for (const c of identities) {
    const id = c.capability_id;

    // V1 — well-formed, unique identity; relationships resolve; evidence-backed admission.
    if (!CAPABILITY_ID_PATTERN.test(id)) {
      errors.push(err('V1', id, 'capability_id', `Malformed capability id '${id}'. Expected CAP-SEGMENT[-SEGMENT].`));
    }
    if (seenIds.has(id)) {
      errors.push(err('V1', id, 'capability_id', `Duplicate capability id '${id}'.`));
    }
    seenIds.add(id);

    for (const sid of c.demonstrated_by) {
      if (!isKnown(VALID_SOLUTION_IDS, sid)) {
        errors.push(err('V1', id, 'demonstrated_by', `Unresolvable solution reference '${sid}'.`));
      }
    }
    for (const eid of c.originated_as) {
      if (!isKnown(VALID_EXPERIMENT_IDS, eid)) {
        errors.push(err('V1', id, 'originated_as', `Unresolvable experiment reference '${eid}'.`));
      }
    }
    for (const pid of c.evidenced_by) {
      if (!isKnown(VALID_PATTERN_IDS, pid)) {
        errors.push(err('V1', id, 'evidenced_by', `Unresolvable pattern reference '${pid}'.`));
      }
    }

    const hasAnyRelationship =
      c.demonstrated_by.length + c.originated_as.length + c.evidenced_by.length + c.delivered_by.length > 0;
    if (!hasAnyRelationship && !c.knowledge_ref) {
      errors.push(err('V1', id, 'delivered_by',
        'A capability with no relationship of any kind must carry knowledge with implementation references. Admission is on evidence (ADR-052).'));
    }

    // V2 — the registry must not become a documentation store.
    if (c.summary.length > SUMMARY_MAX_LENGTH) {
      errors.push(err('V2', id, 'summary', `Summary is ${c.summary.length} chars; the registry bound is ${SUMMARY_MAX_LENGTH}. Long-form content belongs in a knowledge module.`));
    }

    // V3 — closed vocabularies.
    for (const d of c.domains) {
      if (!VALID_DOMAIN_IDS.has(d)) errors.push(err('V3', id, 'domains', `Unknown domain '${d}'. Domains are owned by config/domains.ts.`));
    }
    for (const p of c.personas) {
      if (!VALID_PERSONA_IDS.has(p)) errors.push(err('V3', id, 'personas', `Unknown persona '${p}'. Personas are owned by config/personas.ts.`));
    }

    // V6 — all stored maturity dimensions present (dimension 2 is resolved, never stored).
    if (!c.implementation_status) {
      errors.push(err('V6', id, 'implementation_status', 'Implementation status is required (ADR-047).'));
    }

    // V10 — a platform-reuse claim must be justified by knowledge.
    if (c.platform_reusable && !c.knowledge_ref) {
      warnings.push(warn('V10', id, 'platform_reusable',
        'platform_reusable is asserted but no knowledge module carries the cross-domain applicability that justifies it. ATL-03 must supply it.'));
    }

    // V11 — no presentation markup in governed fields.
    if (MARKUP_PATTERN.test(c.summary) || MARKUP_PATTERN.test(c.name)) {
      errors.push(err('V11', id, 'summary', 'Presentation markup is not permitted in a governed field.'));
    }

    // V13 — coherent stewardship dates.
    if (c.reviewed_at < c.created_at) {
      errors.push(err('V13', id, 'reviewed_at', 'reviewed_at precedes created_at.'));
    }
    if (c.updated_at < c.created_at) {
      errors.push(err('V13', id, 'updated_at', 'updated_at precedes created_at.'));
    }

    // V14 — a named accountable owner.
    if (!c.owner || c.owner.trim().length === 0) {
      errors.push(err('V14', id, 'owner', 'An accountable owner is required.'));
    }

    // Knowledge ref must resolve where declared.
    if (c.knowledge_ref && !knowledgeRefExists(c.knowledge_ref)) {
      errors.push(err('V1', id, 'knowledge_ref', `Declared knowledge_ref '${c.knowledge_ref}' has no module.`));
    }
  }

  return { valid: errors.length === 0, checked: identities.length, errors, warnings };
}

/**
 * Knowledge-level rules. `fileExists` is injected so that V8 can run under a test runner
 * without the validator importing node:fs — which would make it unusable inside a route.
 */
export function validateKnowledge(
  identity: CapabilityIdentity,
  knowledge: CapabilityKnowledge,
  allCapabilityIds: Set<string>,
  fileExists?: (path: string) => boolean
): ValidationReport {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const id = identity.capability_id;

  if (knowledge.capability_id !== id) {
    errors.push(err('V1', id, 'capability_id', `Knowledge module declares '${knowledge.capability_id}' but is referenced by '${id}'.`));
  }

  // V4 — related capabilities resolve.
  for (const rel of knowledge.related_capabilities) {
    if (!allCapabilityIds.has(rel.ref)) {
      errors.push(err('V4', id, 'related_capabilities', `Dangling capability reference '${rel.ref}'.`));
    }
  }

  // V6 — field-level status where a part differs from the whole.
  for (const fs of knowledge.field_status) {
    if (!fs.note || fs.note.trim().length === 0) {
      errors.push(err('V6', id, 'field_status', `field_status for '${fs.field}' carries no explanatory note.`));
    }
  }

  // V7 — a capability that is not fully real must say what is not real.
  if (NON_REAL_STATUSES.includes(identity.implementation_status) && knowledge.known_limitations.length === 0) {
    errors.push(err('V7', id, 'known_limitations',
      `Implementation status '${identity.implementation_status}' requires at least one known limitation explaining what is not real.`));
  }

  // V8 — implementation references must exist in the repository.
  if (fileExists) {
    for (const ref of knowledge.implementation_references) {
      if (!fileExists(ref.path)) {
        errors.push(err('V8', id, 'implementation_references', `Referenced path does not exist: '${ref.path}'.`));
      }
    }
  }

  // V9 — external claims carry full provenance.
  for (const ev of knowledge.external_evidence) {
    const missing = (['source_url', 'publisher', 'published_at', 'retrieved_at'] as const)
      .filter(f => !ev[f] || String(ev[f]).trim().length === 0);
    if (missing.length > 0) {
      errors.push(err('V9', id, 'external_evidence', `External claim lacks provenance: ${missing.join(', ')}.`));
    }
  }

  // V10 — a platform-reuse claim needs at least two assessed domains with rationale.
  if (identity.platform_reusable) {
    const justified = knowledge.cross_domain_applicability.filter(a => a.rationale && a.rationale.trim().length > 0);
    if (justified.length < 2) {
      errors.push(err('V10', id, 'cross_domain_applicability',
        'platform_reusable requires at least two cross-domain applicability entries with rationale.'));
    }
  }

  // V11 — no markup in narrative fields.
  for (const [field, value] of [
    ['description', knowledge.description],
    ['innovation_thesis', knowledge.innovation_thesis],
    ['usage_instructions', knowledge.usage_instructions]
  ] as const) {
    if (MARKUP_PATTERN.test(value)) {
      errors.push(err('V11', id, field, 'Presentation markup is not permitted in a governed field.'));
    }
  }

  // V12 — demo warnings are mandatory where anything is not fully implemented.
  const notFullyReal =
    NON_REAL_STATUSES.includes(identity.implementation_status) ||
    identity.implementation_status === 'partially-implemented' ||
    knowledge.field_status.some(fs => NON_REAL_STATUSES.includes(fs.implementation_status));
  if (notFullyReal) {
    for (const demo of knowledge.demo_scenarios) {
      if (demo.warnings.length === 0) {
        errors.push(err('V12', id, 'demo_scenarios',
          `Demo path '${demo.path_type}' carries no warnings, but the capability is not fully implemented. A demo of a simulated capability that does not warn the presenter is a governance failure.`));
      }
    }
  }

  return { valid: errors.length === 0, checked: 1, errors, warnings };
}

/**
 * V5 — symmetry across the whole record set. Checked globally because symmetry is a property
 * of the graph, not of one record.
 */
export function validateRelationSymmetry(
  entries: { id: string; knowledge: CapabilityKnowledge }[]
): ValidationReport {
  const errors: ValidationIssue[] = [];
  const byId = new Map(entries.map(e => [e.id, e.knowledge]));

  for (const { id, knowledge } of entries) {
    for (const rel of knowledge.related_capabilities) {
      const inverse = SYMMETRIC_RELATIONS[rel.relation];
      if (!inverse) continue;
      const target = byId.get(rel.ref);
      if (!target) continue; // dangling refs are V4's job, not V5's
      const reciprocated = target.related_capabilities.some(r => r.ref === id && r.relation === inverse);
      if (!reciprocated) {
        errors.push(err('V5', id, 'related_capabilities',
          `'${id}' declares ${rel.relation} '${rel.ref}' but '${rel.ref}' does not declare ${inverse} '${id}'.`));
      }
    }
  }
  return { valid: errors.length === 0, checked: entries.length, errors, warnings: [] };
}
