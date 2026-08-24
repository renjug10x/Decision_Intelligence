/**
 * Contradiction precedence (ATL-06A, ADR-053).
 *
 * The hardest case for a grounded Atlas is not a question it cannot answer. It is a question where
 * the governed record and a credible external source disagree, because the tempting output — one
 * fluent paragraph that reconciles them — is the single most dangerous thing this layer could
 * produce. It reads as authoritative, it is unattributable, and it silently promotes a market
 * expectation into a CogniX capability.
 *
 * So a contradiction is SEPARATED, never resolved. The governed CogniX fact is authoritative and is
 * stated first. The external claim is quoted unaltered with its source, second. An interpretation
 * may then observe what the gap between them suggests, third, and only ever by resting on the
 * governed statement it cites. The worked example the owner set is exactly this shape:
 *
 *   From CogniX        — Promotion Intelligence draws supplier capacity from the synthetic
 *                        enterprise world, not a client planning system.
 *   Market Context     — Real-time promotion monitoring against live supplier feeds is expected of
 *                        certain production platforms. [source, publisher, dates]
 *   AI Interpretation  — This suggests a possible productisation direction, not a current capability.
 *
 * Detection is deterministic and declared. A governed record yields CONSTRAINTS — statements it
 * already makes about what is synthetic, unbuilt, demo-only or early in lifecycle. An external claim
 * yields ASSERTIONS — declared phrases by which a claim attributes liveness, production use, scale or
 * maturity. A constraint and an assertion on the same dimension, about the same capability, is a
 * contradiction. Nothing is inferred from tone, and no model is consulted.
 */

import {
  type ContradictionDimension, type ContradictionRecord, type ExternalClaim
} from '../../../packages/contracts/src/atlas-grounding-model';
import {
  NON_REAL_STATUSES, type ResolvedCapability
} from '../../../packages/contracts/src/capability-atlas-model';

export interface GovernedConstraint {
  dimension: ContradictionDimension;
  /** Quoted or assembled from the governed record. Never paraphrased into something softer. */
  statement: string;
}

/**
 * Limitation wording by which a governed record already declares that its inputs are not real.
 * These are the estate's own words — `ATL-03` populated limitations such as *"come from the
 * synthetic enterprise world, not a client planning system"* — so matching them reads the record
 * rather than second-guessing it.
 */
export const SYNTHETIC_DATA_MARKERS: readonly string[] = [
  'synthetic', 'simulated', 'simulation', 'illustrative', 'demonstration value', 'demonstration values',
  'not a client', 'not client', 'mock', 'seeded', 'sample data', 'deterministic scenario', 'fixture'
] as const;

/**
 * Declared phrases by which an external claim attributes a property this estate may not have.
 * Grouped by the governed dimension each collides with.
 */
export const CLAIM_ASSERTION_MARKERS: { dimension: ContradictionDimension; phrases: string[] }[] = [
  {
    dimension: 'data-provenance',
    phrases: [
      'real-time', 'real time', 'live data', 'live feed', 'live feeds', 'live supplier',
      'streaming', 'continuous monitoring', 'always-on', 'actual telemetry',
      'production data', 'client systems', 'operational data'
    ]
  },
  {
    dimension: 'implementation',
    phrases: [
      'in production', 'production-grade', 'production grade', 'generally available',
      'deployed across', 'deployed at', 'fully implemented', 'shipped', 'out of the box'
    ]
  },
  {
    dimension: 'demonstration',
    phrases: ['at enterprise scale', 'at scale', 'rolled out', 'enterprise rollout', 'live pilot']
  },
  {
    dimension: 'lifecycle',
    phrases: ['industry standard', 'standard practice', 'mature market', 'commodity capability']
  }
];

/**
 * What a governed record already says it is NOT. Only genuine constraints are emitted: a fully
 * implemented, production-ready capability with no synthetic-input limitation yields none, and can
 * therefore never manufacture a contradiction out of a harmless market claim.
 */
export function extractConstraints(c: ResolvedCapability): GovernedConstraint[] {
  const out: GovernedConstraint[] = [];
  const name = c.identity.name;

  if (NON_REAL_STATUSES.includes(c.identity.implementation_status)) {
    out.push({
      dimension: 'implementation',
      statement: `${name} is recorded at implementation status '${c.identity.implementation_status}' in the governed capability registry.`
    });
  }

  for (const lim of c.knowledge?.known_limitations ?? []) {
    const lower = lim.limitation.toLowerCase();
    if (SYNTHETIC_DATA_MARKERS.some(m => lower.includes(m))) {
      out.push({
        dimension: 'data-provenance',
        statement: `${name} records the limitation: ${lim.limitation}`
      });
    }
  }

  if (c.demo_maturity && c.demo_maturity !== 'Production Ready') {
    out.push({
      dimension: 'demonstration',
      statement: `${name} is demonstrated at '${c.demo_maturity}' maturity, which is a demonstration standard rather than a production deployment standard.`
    });
  }

  if (c.identity.lifecycle_state && ['Concept', 'Research', 'Prototype'].includes(c.identity.lifecycle_state)) {
    out.push({
      dimension: 'lifecycle',
      statement: `${name} sits at innovation lifecycle state '${c.identity.lifecycle_state}'.`
    });
  }

  return out;
}

export function assertedDimensions(claim: string): ContradictionDimension[] {
  const lower = claim.toLowerCase();
  return CLAIM_ASSERTION_MARKERS
    .filter(m => m.phrases.some(p => lower.includes(p)))
    .map(m => m.dimension);
}

const INTERPRETATION_BY_DIMENSION: Record<ContradictionDimension, string> = {
  'data-provenance':
    'The market expectation described here rests on live operational inputs. The governed record above states which inputs are actually in play, so the gap between them reads as a possible productisation direction rather than a current capability.',
  'implementation':
    'The market expectation described here assumes a built and deployed capability. The governed record above states the implementation status that actually applies, so this reads as a direction of travel rather than something available today.',
  'demonstration':
    'The market expectation described here assumes deployed operation. The governed record above states the demonstration standard that actually applies, so this reads as what a production version would need to reach, not what a demonstration currently shows.',
  'lifecycle':
    'The market expectation described here treats the technique as settled. The governed record above states the innovation lifecycle state that actually applies, so this reads as market context for the direction rather than a claim about present maturity.'
};

/**
 * Find every disagreement between the governed records and the ADMITTED external claims.
 *
 * Only admitted claims are passed in: a rejected claim has already been dropped by
 * `provenance.admitClaim`, and a dropped claim must not reappear inside a contradiction, which
 * would be provenance-free evidence entering by the back door.
 */
export function detectContradictions(
  resolved: ResolvedCapability[],
  admitted: ExternalClaim[]
): ContradictionRecord[] {
  const byId = new Map(resolved.map(r => [r.identity.capability_id, r]));
  const records: ContradictionRecord[] = [];
  // One record per capability, dimension and claim. A record that already states its synthetic
  // inputs twice has one data-provenance disagreement with a claim, not two.
  const seen = new Set<string>();

  for (const claim of admitted) {
    const dims = assertedDimensions(claim.claim);
    if (dims.length === 0) continue;

    // A claim that names no capability is general market context. It is shown in the Market Context
    // class and cannot contradict a record it does not address.
    for (const capId of claim.about_capabilities) {
      const cap = byId.get(capId);
      if (!cap) continue;
      for (const constraint of extractConstraints(cap)) {
        if (!dims.includes(constraint.dimension)) continue;
        const key = `${capId}|${constraint.dimension}|${claim.claim_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        records.push({
          capability_id: cap.identity.capability_id,
          capability_name: cap.identity.name,
          dimension: constraint.dimension,
          from_cognix: constraint.statement,
          cognix_citation: cap.identity.capability_id,
          market_context: claim.claim,
          market_source: claim.source,
          resolution: 'cognix-authoritative',
          ai_interpretation: INTERPRETATION_BY_DIMENSION[constraint.dimension]
        });
      }
    }
  }

  return records;
}
