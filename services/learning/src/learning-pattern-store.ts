/**
 * CogniX Enterprise Learning Pattern Store Implementation
 * Server-side tenant-isolated in-memory repository for generalized organizational patterns.
 */

import {
  EnterpriseLearningPattern,
  PatternMatchRequest,
  EnterpriseMemoryCase
} from '../../../packages/contracts/src/index';
import { ILearningPatternRepository } from './repository';
import { memoryRepository } from './memory-store';

export const CANONICAL_LEARNING_PATTERNS: EnterpriseLearningPattern[] = [
  {
    pattern_id: 'PAT-COMM-01',
    pattern_name: 'Supplier Lead-Time Breach Cascade',
    pattern_type: 'commitment',
    pattern_scope: 'global',
    description: 'Demand acceleration exceeding primary supplier delivery capability by >8% results in customer promise failure in 73% of untreated cases.',
    situation_signature: 'Demand surge + primary supplier on-time rate < 85% + regional stock buffer < 3 days',
    observed_signals: [
      'Demand acceleration +22%',
      'Supplier delay rate 42% (FreshDirect UK)',
      'DC safety stock depletion -34%'
    ],
    business_context: 'High-velocity fresh & chilled category promotional events with fixed delivery windows.',
    applicable_domains: ['Supply Chain', 'Commercial', 'Store Operations'],
    applicable_regions: ['North West', 'London', 'Midlands'],

    historical_occurrences: 11,
    situation_similarity: 94,
    pattern_confidence: 89,
    intervention_success_rate: 73,

    observed_decisions: [
      'Do nothing & await primary supplier recovery (Resulted in 4.5h OOS window in synthetic demo)',
      'Activate pre-approved Backup Supplier Total Produce Ltd (Resulted in 100% stock recovery in synthetic demo)'
    ],
    observed_interventions: [
      'Activate designated backup contract clause 7.3 (CTR-TP-2023-008) for 35% regional volume reroute.'
    ],
    positive_outcomes: [
      'Mitigated £14,200 weekly lost sales exposure in synthetic demo simulation',
      'Restored store availability to 98.4% within 18 hours in synthetic demo simulation'
    ],
    negative_outcomes: [
      'Untreated demonstration occurrences caused 4.5h evening stockout across 5 Manchester stores'
    ],

    recommended_action: 'Execute Backup Contract Activation clause 7.3 under contract CTR-TP-2023-008 to reroute 35% volume to Total Produce Ltd.',
    expected_outcome: 'Restores shelf availability to >98% and prevents £14.2K weekly revenue loss.',
    applicability_constraints: [
      'Primary supplier on-time delivery rate must be < 95% over rolling 14 days',
      'Backup supplier pricing must not exceed primary contract rate by > 5%'
    ],

    supporting_memory_ids: ['MEM-2025-Q2-018'],
    first_observed: '2025-04-12',
    last_observed: '2026-06-04',
    source_classification: 'G10X Synthetic Demonstration Precedent',
    synthetic_demo: true,
    schema_version: '1.0'
  },
  {
    pattern_id: 'PAT-OPP-02',
    pattern_name: 'Regional Demand Surge & Supplier Headroom',
    pattern_type: 'opportunity',
    pattern_scope: 'global',
    description: 'Concurrent local demand acceleration with available supplier capacity headroom and excess regional DC inventory produces high-margin revenue lift.',
    situation_signature: 'Category demand +15% + supplier capacity headroom >20% + local stock > 14 days',
    observed_signals: [
      'Dairy category demand trend +18%',
      'Muller Dairy supply headroom +25%',
      'Trafford DC inventory surplus 1,400 units'
    ],
    business_context: 'High-margin fresh dairy & chilled dessert lines during favorable local weather or regional events.',
    applicable_domains: ['Commercial', 'Merchandising', 'Demand Planning'],
    applicable_regions: ['North West', 'Midlands'],

    historical_occurrences: 7,
    situation_similarity: 89,
    pattern_confidence: 84,
    intervention_success_rate: 86,

    observed_decisions: [
      'Maintain baseline promotional calendar (Missed £18K incremental margin in synthetic demo)',
      'Launch targeted 15% promotional feature across North West region (Achieved +6.8% margin lift in synthetic demo)'
    ],
    observed_interventions: [
      'Deploy 7-day regional price feature with co-funded supplier rebate.'
    ],
    positive_outcomes: [
      'Average margin contribution +6.8% across 7 synthetic demo events',
      'Cleared excess Trafford DC stock prior to shelf-life threshold in synthetic demo'
    ],
    negative_outcomes: [
      'None observed in synthetic demo when supplier headroom exceeds 20%'
    ],

    recommended_action: 'Deploy 15% regional promotional feature across 12 North West stores supported by Muller Dairy headroom.',
    expected_outcome: '+£24,500 incremental revenue with +6.8% margin contribution.',
    applicability_constraints: [
      'Supplier headroom must be confirmed via live capacity feed',
      'DC shelf-life remaining must exceed 10 days'
    ],

    supporting_memory_ids: ['MEM-2025-Q2-018'],
    first_observed: '2025-08-19',
    last_observed: '2026-05-18',
    source_classification: 'G10X Synthetic Demonstration Precedent',
    synthetic_demo: true,
    schema_version: '1.0'
  },
  {
    pattern_id: 'PAT-RISK-03',
    pattern_name: 'Promotional Capacity Mismatch',
    pattern_type: 'risk',
    pattern_scope: 'global',
    description: 'Deploying high-discount promotions (>15%) when supplier lead-time variance exceeds 12% results in margin erosion due to emergency freight costs.',
    situation_signature: 'Promo discount >15% + supplier lead-time variance >12% + DC buffer < 5 days',
    observed_signals: [
      'Proposed 20% discount on Chilled Ready Meals',
      'Greencore supplier lead-time variance 14.2%',
      'Trafford DC buffer 3.2 days'
    ],
    business_context: 'Chilled ready meal promotional campaigns dependent on daily DC-to-store replenishment.',
    applicable_domains: ['Commercial', 'Logistics', 'Supply Chain'],
    applicable_regions: ['All', 'North West'],

    historical_occurrences: 6,
    situation_similarity: 91,
    pattern_confidence: 84,
    intervention_success_rate: 67,

    observed_decisions: [
      'Execute unadjusted 20% promotion (Caused £8.4K emergency transport penalty in synthetic demo)',
      'Adjust promo depth to 12% with pre-built 48h DC safety buffer (Preserved net margin in synthetic demo)'
    ],
    observed_interventions: [
      'Adjust promotional discount depth to 12% and establish 48-hour pre-event DC buffer.'
    ],
    positive_outcomes: [
      'Eliminated emergency expedited courier fees in synthetic demo',
      'Maintained 99.1% store availability during promotional week in synthetic demo'
    ],
    negative_outcomes: [
      'Emergency freight costs eroded 42% of promotional gross margin in 4 of 6 synthetic demo events'
    ],

    recommended_action: 'Cap promotional discount at 12% or require Greencore to pre-deliver 48h safety buffer to Trafford DC.',
    expected_outcome: 'Protects £8.4K net margin and avoids emergency logistics penalties.',
    applicability_constraints: [
      'Applies to chilled categories with < 12 day total shelf life'
    ],

    supporting_memory_ids: ['MEM-2025-Q4-042'],
    first_observed: '2025-11-03',
    last_observed: '2026-02-14',
    source_classification: 'G10X Synthetic Demonstration Precedent',
    synthetic_demo: true,
    schema_version: '1.0'
  },
  {
    pattern_id: 'PAT-RIPPLE-04',
    pattern_name: 'Distribution Center Overtime Propagation',
    pattern_type: 'ripple',
    pattern_scope: 'global',
    description: 'Unplanned promotional volume surges exceeding 25% daily DC throughput trigger 2nd-order warehouse overtime costs and 3rd-order store delivery delays.',
    situation_signature: 'Volume surge > 25% + DC shift capacity at 92% + no pre-arranged labor flex',
    observed_signals: [
      '1st Order: Promotional volume surge +28%',
      '2nd Order: Trafford DC weekend overtime +18h',
      '3rd Order: Monday morning store delivery delay 1.8h'
    ],
    business_context: 'Regional promotional launches coinciding with peak weekend distribution cycles.',
    applicable_domains: ['Logistics', 'Store Operations', 'Finance'],
    applicable_regions: ['All'],

    historical_occurrences: 8,
    situation_similarity: 88,
    pattern_confidence: 81,
    intervention_success_rate: 82,

    observed_decisions: [
      'Allow unplanned volume to hit DC (Triggered £4.2K overtime and late morning store deliveries in synthetic demo)',
      'Pre-cap daily store order allocations and stagger promo delivery window over 3 days (Zero overtime in synthetic demo)'
    ],
    observed_interventions: [
      'Stagger store delivery schedule across a 72-hour window prior to promo launch.'
    ],
    positive_outcomes: [
      'Saved £4,200 in emergency weekend DC overtime in synthetic demo',
      'Prevented 1.8h store opening delivery delays in synthetic demo'
    ],
    negative_outcomes: [
      'Uncontrolled surges created 14% higher store labor cost during morning restocking in synthetic demo'
    ],

    recommended_action: 'Implement 72-hour staggered DC order release for promotional SKUs.',
    expected_outcome: 'Eliminates £4.2K warehouse overtime penalty and guarantees 08:00 store availability.',
    applicability_constraints: [
      'Requires store manager notification 48h prior to staggered release'
    ],

    supporting_memory_ids: ['MEM-2025-Q4-042'],
    first_observed: '2025-09-14',
    last_observed: '2026-04-10',
    source_classification: 'G10X Synthetic Demonstration Precedent',
    synthetic_demo: true,
    schema_version: '1.0'
  },
  {
    pattern_id: 'PAT-BEH-05',
    pattern_name: 'Promotion-Driven Category Cannibalisation',
    pattern_type: 'behaviour',
    pattern_scope: 'global',
    description: 'Promoting premium brand lines without adjusting adjacent standard line price points causes -24% volume drop in standard lines, reducing net category margin.',
    situation_signature: 'Premium SKU promo discount >20% + standard SKU price gap < £0.30 + high cross-elasticity',
    observed_signals: [
      'Premium Organic Milk promo discount 25%',
      'Standard Whole Milk sales volume -24%',
      'Total Dairy category net margin -3.8%'
    ],
    business_context: 'Core staple grocery categories with high consumer brand substitution.',
    applicable_domains: ['Category Management', 'Commercial Pricing'],
    applicable_regions: ['All'],

    historical_occurrences: 5,
    situation_similarity: 87,
    pattern_confidence: 83,
    intervention_success_rate: 80,

    observed_decisions: [
      'Promote premium line in isolation (Net category profit declined £6.1K in synthetic demo)',
      'Implement bundle promotion pairing Premium & Standard lines (Category margin increased +4.2% in synthetic demo)'
    ],
    observed_interventions: [
      'Restructure promotion as a cross-category meal-deal or bundle promotion.'
    ],
    positive_outcomes: [
      'Protected standard line volume baseline in synthetic demo',
      'Increased total category profit contribution by +4.2% in synthetic demo'
    ],
    negative_outcomes: [
      'Standalone premium discounts cannibalised 24% of standard volume in 4 past synthetic demo events'
    ],

    recommended_action: 'Convert standalone premium discount into a category multi-buy bundle.',
    expected_outcome: 'Prevents £6.1K cannibalisation loss and optimizes overall category profit.',
    applicability_constraints: [
      'Category cross-elasticity coefficient must exceed 0.65'
    ],

    supporting_memory_ids: ['MEM-2025-Q2-018'],
    first_observed: '2025-07-22',
    last_observed: '2026-03-29',
    source_classification: 'G10X Synthetic Demonstration Precedent',
    synthetic_demo: true,
    schema_version: '1.0'
  },
  {
    pattern_id: 'PAT-INT-05',
    pattern_name: 'Emergency DC Rebalancing & Backup SLA Activation',
    pattern_type: 'intervention',
    pattern_scope: 'global',
    description: 'When primary supplier weekend delay rate exceeds 40% across chilled SKUs, executing emergency Trafford DC stock rebalancing restores store availability within 4 hours.',
    situation_signature: 'Supplier weekend delay > 40% + Trafford DC reserve stock > 500 units + store OOS window > 3h',
    observed_signals: [
      'Greencore delivery delay rate 45% on Friday/Saturday',
      'Manchester store OOS exposure 4.5 hours',
      'Trafford DC emergency buffer stock 850 cases'
    ],
    business_context: 'Weekend fresh & chilled ready meals availability protection across metropolitan store clusters.',
    applicable_domains: ['Store Operations', 'Supply Chain', 'Inventory Management'],
    applicable_regions: ['North West', 'All'],

    historical_occurrences: 9,
    situation_similarity: 92,
    pattern_confidence: 88,
    intervention_success_rate: 78,

    observed_decisions: [
      'Await Monday supplier redelivery (Caused £12.4K lost evening sales across 5 stores in synthetic demo)',
      'Execute emergency DC transfer from Trafford DC and extend weekend lead-time buffer to 48h (Achieved 99.2% stock recovery in synthetic demo)'
    ],
    observed_interventions: [
      'Execute emergency stock transfer from Trafford DC and extend order lead-time buffer to 48h for weekend deliveries.'
    ],
    positive_outcomes: [
      'Restored store availability across 5 Manchester stores to >99%',
      'Recovered £12,400 evening sales window in synthetic demo simulation'
    ],
    negative_outcomes: [
      'Reactive transfers incurred £350 local courier transport fee'
    ],

    recommended_action: 'Execute emergency stock transfer from Trafford DC and extend order lead-time buffer to 48h for weekend deliveries.',
    expected_outcome: 'Restores shelf availability across 5 stores and recovers £12,400 evening sales.',
    applicability_constraints: [
      'Trafford DC reserve stock must be confirmed prior to dispatch',
      'Requires store manager notification 2h prior to arrival'
    ],

    supporting_memory_ids: ['MEM-2025-Q3-029'],
    first_observed: '2025-08-14',
    last_observed: '2026-05-30',
    source_classification: 'G10X Synthetic Demonstration Precedent',
    synthetic_demo: true,
    schema_version: '1.0'
  }
];

export class InMemoryLearningPatternRepository implements ILearningPatternRepository {
  private patterns: Map<string, EnterpriseLearningPattern> = new Map();

  constructor() {
    this.seed();
  }

  private seed() {
    CANONICAL_LEARNING_PATTERNS.forEach(p => {
      this.patterns.set(p.pattern_id, { ...p });
    });
  }

  public getLearningPatternById(id: string): EnterpriseLearningPattern | null {
    const found = this.patterns.get(id);
    return found ? { ...found } : null;
  }

  public queryLearningPatterns(filter: { tenant_id?: string; type?: string; category?: string; limit?: number }): EnterpriseLearningPattern[] {
    let results = Array.from(this.patterns.values());

    // Explicit Tenant Scope Filtering
    if (filter.tenant_id) {
      results = results.filter(p => p.pattern_scope === 'global' || (p.pattern_scope === 'tenant' && p.tenant_id === filter.tenant_id));
    } else {
      results = results.filter(p => p.pattern_scope === 'global');
    }

    if (filter.type) {
      results = results.filter(p => p.pattern_type === filter.type);
    }
    if (filter.category) {
      results = results.filter(p => p.applicable_domains.some(d => d.toLowerCase() === filter.category!.toLowerCase()));
    }

    const limit = filter.limit || 50;
    return results.slice(0, limit);
  }

  public matchLearningPatterns(request: PatternMatchRequest): EnterpriseLearningPattern[] {
    let results = Array.from(this.patterns.values());

    // Explicit Tenant Scope Filtering
    if (request.tenant_id) {
      results = results.filter(p => p.pattern_scope === 'global' || (p.pattern_scope === 'tenant' && p.tenant_id === request.tenant_id));
    } else {
      results = results.filter(p => p.pattern_scope === 'global');
    }

    if (request.category) {
      const cat = request.category.toLowerCase();
      results = results.filter(p =>
        p.applicable_domains.some(d => d.toLowerCase() === cat) ||
        p.business_context.toLowerCase().includes(cat)
      );
    }

    if (request.region && request.region !== 'All') {
      results = results.filter(p =>
        !p.applicable_regions || p.applicable_regions.includes('All') || p.applicable_regions.includes(request.region!)
      );
    }

    // Sort by pattern_confidence & situation_similarity descending
    results.sort((a, b) => (b.pattern_confidence + b.situation_similarity) - (a.pattern_confidence + a.situation_similarity));

    const limit = request.limit || 10;
    return results.slice(0, limit);
  }

  public getSupportingMemories(patternId: string, tenantId?: string): EnterpriseMemoryCase[] {
    const pattern = this.getLearningPatternById(patternId);
    if (!pattern || !pattern.supporting_memory_ids) return [];

    const memories = pattern.supporting_memory_ids
      .map(id => memoryRepository.getMemoryCaseById(id))
      .filter((m): m is EnterpriseMemoryCase => m !== null);

    // Apply strict tenant safety on supporting memories
    if (tenantId) {
      return memories.filter(m => m.tenant_id === tenantId);
    }
    return memories;
  }

  public clear(): void {
    this.patterns.clear();
  }
}

export const learningPatternRepository = new InMemoryLearningPatternRepository();
