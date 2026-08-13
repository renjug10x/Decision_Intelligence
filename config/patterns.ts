export type PatternType = 
  | 'risk'
  | 'opportunity'
  | 'intervention'
  | 'behaviour'
  | 'commitment'
  | 'ripple';

export interface EnterpriseLearningPattern {
  id: string;
  name: string;
  type: PatternType;
  description: string;
  
  // Situation & Context
  situationSignature: string;
  observedSignals: string[];
  businessContext: string;
  applicableDomains: string[];
  
  // Telemetry Metrics (Distinct, never collapsed)
  historicalOccurrences: number;
  situationSimilarity: number; // 0..100 (%)
  patternConfidence: number;   // 0..100 (%)
  interventionSuccessRate: number; // 0..100 (%)
  
  // Outcomes & Interventions
  observedDecisions: string[];
  observedInterventions: string[];
  positiveOutcomes: string[];
  negativeOutcomes: string[];
  
  recommendedIntervention: string;
  expectedOutcome: string;
  applicabilityConstraints: string[];
  
  // Provenance & Memory Links
  supportingMemoryIds: string[];
  firstObserved: string;
  lastObserved: string;
  sourceClassification: 'G10X Empirical Precedent' | 'Synthetic Learning Baseline';
  isSynthetic: boolean;
}

export const ENTERPRISE_LEARNING_PATTERNS: EnterpriseLearningPattern[] = [
  {
    id: 'PAT-COMM-01',
    name: 'Supplier Lead-Time Breach Cascade',
    type: 'commitment',
    description: 'Demand acceleration exceeding primary supplier delivery capability by >8% results in customer promise failure in 73% of untreated cases.',
    situationSignature: 'Demand surge + primary supplier on-time rate < 85% + regional stock buffer < 3 days',
    observedSignals: [
      'Demand acceleration +22%',
      'Supplier delay rate 42% (FreshDirect UK)',
      'DC safety stock depletion -34%'
    ],
    businessContext: 'High-velocity fresh & chilled category promotional events with fixed delivery windows.',
    applicableDomains: ['Supply Chain', 'Commercial', 'Store Operations'],
    
    historicalOccurrences: 11,
    situationSimilarity: 94,
    patternConfidence: 89,
    interventionSuccessRate: 73,
    
    observedDecisions: [
      'Do nothing & await primary supplier recovery (Resulted in 4.5h OOS window)',
      'Activate pre-approved Backup Supplier Total Produce Ltd (Resulted in 100% stock recovery)'
    ],
    observedInterventions: [
      'Activate designated backup contract clause 7.3 (CTR-TP-2023-008) for 35% regional volume reroute.'
    ],
    positiveOutcomes: [
      'Mitigated £14,200 weekly lost sales exposure',
      'Restored store availability to 98.4% within 18 hours'
    ],
    negativeOutcomes: [
      'Untreated occurrences caused 4.5h evening stockout across 5 Manchester stores'
    ],
    
    recommendedIntervention: 'Execute Backup Contract Activation clause 7.3 under contract CTR-TP-2023-008 to reroute 35% volume to Total Produce Ltd.',
    expectedOutcome: 'Restores shelf availability to >98% and prevents £14.2K weekly revenue loss.',
    applicabilityConstraints: [
      'Primary supplier on-time delivery rate must be < 95% over rolling 14 days',
      'Backup supplier pricing must not exceed primary contract rate by > 5%'
    ],
    
    supportingMemoryIds: ['MEM-2026-001', 'MEM-2025-008'],
    firstObserved: '2025-04-12',
    lastObserved: '2026-06-04',
    sourceClassification: 'G10X Empirical Precedent',
    isSynthetic: false,
  },
  {
    id: 'PAT-OPP-02',
    name: 'Regional Demand Surge & Supplier Headroom',
    type: 'opportunity',
    description: 'Concurrent local demand acceleration with available supplier capacity headroom and excess regional DC inventory produces high-margin revenue lift.',
    situationSignature: 'Category demand +15% + supplier capacity headroom >20% + local stock > 14 days',
    observedSignals: [
      'Dairy category demand trend +18%',
      'Muller Dairy supply headroom +25%',
      'Trafford DC inventory surplus 1,400 units'
    ],
    businessContext: 'High-margin fresh dairy & chilled dessert lines during favorable local weather or regional events.',
    applicableDomains: ['Commercial', 'Merchandising', 'Demand Planning'],
    
    historicalOccurrences: 7,
    situationSimilarity: 89,
    patternConfidence: 84,
    interventionSuccessRate: 86,
    
    observedDecisions: [
      'Maintain baseline promotional calendar (Missed £18K incremental margin)',
      'Launch targeted 15% promotional feature across North West region (Achieved +6.8% margin lift)'
    ],
    observedInterventions: [
      'Deploy 7-day regional price feature with co-funded supplier rebate.'
    ],
    positiveOutcomes: [
      'Average margin contribution +6.8% across 7 historical events',
      'Cleared excess Trafford DC stock prior to shelf-life threshold'
    ],
    negativeOutcomes: [
      'None observed when supplier headroom exceeds 20%'
    ],
    
    recommendedIntervention: 'Deploy 15% regional promotional feature across 12 North West stores supported by Muller Dairy headroom.',
    expectedOutcome: '+£24,500 incremental revenue with +6.8% margin contribution.',
    applicabilityConstraints: [
      'Supplier headroom must be confirmed via live capacity feed',
      'DC shelf-life remaining must exceed 10 days'
    ],
    
    supportingMemoryIds: ['MEM-2026-004', 'MEM-2025-012'],
    firstObserved: '2025-08-19',
    lastObserved: '2026-05-18',
    sourceClassification: 'G10X Empirical Precedent',
    isSynthetic: false,
  },
  {
    id: 'PAT-RISK-03',
    name: 'Promotional Capacity Mismatch',
    type: 'risk',
    description: 'Deploying high-discount promotions (>15%) when supplier lead-time variance exceeds 12% results in margin erosion due to emergency freight costs.',
    situationSignature: 'Promo discount >15% + supplier lead-time variance >12% + DC buffer < 5 days',
    observedSignals: [
      'Proposed 20% discount on Chilled Ready Meals',
      'Greencore supplier lead-time variance 14.2%',
      'Trafford DC buffer 3.2 days'
    ],
    businessContext: 'Chilled ready meal promotional campaigns dependent on daily DC-to-store replenishment.',
    applicableDomains: ['Commercial', 'Logistics', 'Supply Chain'],
    
    historicalOccurrences: 6,
    situationSimilarity: 91,
    patternConfidence: 84,
    interventionSuccessRate: 67,
    
    observedDecisions: [
      'Execute unadjusted 20% promotion (Caused £8.4K emergency transport penalty)',
      'Adjust promo depth to 12% with pre-built 48h DC safety buffer (Preserved net margin)'
    ],
    observedInterventions: [
      'Adjust promotional discount depth to 12% and establish 48-hour pre-event DC buffer.'
    ],
    positiveOutcomes: [
      'Eliminated emergency expedited courier fees',
      'Maintained 99.1% store availability during promotional week'
    ],
    negativeOutcomes: [
      'Emergency freight costs eroded 42% of promotional gross margin in 4 of 6 historical events'
    ],
    
    recommendedIntervention: 'Cap promotional discount at 12% or require Greencore to pre-deliver 48h safety buffer to Trafford DC.',
    expectedOutcome: 'Protects £8.4K net margin and avoids emergency logistics penalties.',
    applicabilityConstraints: [
      'Applies to chilled categories with < 12 day total shelf life'
    ],
    
    supportingMemoryIds: ['MEM-2025-019'],
    firstObserved: '2025-11-03',
    lastObserved: '2026-02-14',
    sourceClassification: 'G10X Empirical Precedent',
    isSynthetic: false,
  },
  {
    id: 'PAT-RIPPLE-04',
    name: 'Distribution Center Overtime Propagation',
    type: 'ripple',
    description: 'Unplanned promotional volume surges exceeding 25% daily DC throughput trigger 2nd-order warehouse overtime costs and 3rd-order store delivery delays.',
    situationSignature: 'Volume surge > 25% + DC shift capacity at 92% + no pre-arranged labor flex',
    observedSignals: [
      '1st Order: Promotional volume surge +28%',
      '2nd Order: Trafford DC weekend overtime +18h',
      '3rd Order: Monday morning store delivery delay 1.8h'
    ],
    businessContext: 'Regional promotional launches coinciding with peak weekend distribution cycles.',
    applicableDomains: ['Logistics', 'Store Operations', 'Finance'],
    
    historicalOccurrences: 8,
    situationSimilarity: 88,
    patternConfidence: 81,
    interventionSuccessRate: 82,
    
    observedDecisions: [
      'Allow unplanned volume to hit DC (Triggered £4.2K overtime and late morning store deliveries)',
      'Pre-cap daily store order allocations and stagger promo delivery window over 3 days (Zero overtime)'
    ],
    observedInterventions: [
      'Stagger store delivery schedule across a 72-hour window prior to promo launch.'
    ],
    positiveOutcomes: [
      'Saved £4,200 in emergency weekend DC overtime',
      'Prevented 1.8h store opening delivery delays'
    ],
    negativeOutcomes: [
      'Uncontrolled surges created 14% higher store labor cost during morning restocking'
    ],
    
    recommendedIntervention: 'Implement 72-hour staggered DC order release for promotional SKUs.',
    expectedOutcome: 'Eliminates £4.2K warehouse overtime penalty and guarantees 08:00 store availability.',
    applicabilityConstraints: [
      'Requires store manager notification 48h prior to staggered release'
    ],
    
    supportingMemoryIds: ['MEM-2026-002'],
    firstObserved: '2025-09-14',
    lastObserved: '2026-04-10',
    sourceClassification: 'G10X Empirical Precedent',
    isSynthetic: false,
  },
  {
    id: 'PAT-BEH-05',
    name: 'Promotion-Driven Category Cannibalisation',
    type: 'behaviour',
    description: 'Promoting premium brand lines without adjusting adjacent standard line price points causes -24% volume drop in standard lines, reducing net category margin.',
    situationSignature: 'Premium SKU promo discount >20% + standard SKU price gap < £0.30 + high cross-elasticity',
    observedSignals: [
      'Premium Organic Milk promo discount 25%',
      'Standard Whole Milk sales volume -24%',
      'Total Dairy category net margin -3.8%'
    ],
    businessContext: 'Core staple grocery categories with high consumer brand substitution.',
    applicableDomains: ['Category Management', 'Commercial Pricing'],
    
    historicalOccurrences: 5,
    situationSimilarity: 87,
    patternConfidence: 83,
    interventionSuccessRate: 80,
    
    observedDecisions: [
      'Promote premium line in isolation (Net category profit declined £6.1K)',
      'Implement bundle promotion pairing Premium & Standard lines (Category margin increased +4.2%)'
    ],
    observedInterventions: [
      'Restructure promotion as a cross-category meal-deal or bundle promotion.'
    ],
    positiveOutcomes: [
      'Protected standard line volume baseline',
      'Increased total category profit contribution by +4.2%'
    ],
    negativeOutcomes: [
      'Standalone premium discounts cannibalised 24% of standard volume in 4 past events'
    ],
    
    recommendedIntervention: 'Convert standalone premium discount into a category multi-buy bundle.',
    expectedOutcome: 'Prevents £6.1K cannibalisation loss and optimizes overall category profit.',
    applicabilityConstraints: [
      'Category cross-elasticity coefficient must exceed 0.65'
    ],
    
    supportingMemoryIds: ['MEM-2025-015'],
    firstObserved: '2025-07-22',
    lastObserved: '2026-03-29',
    sourceClassification: 'G10X Empirical Precedent',
    isSynthetic: false,
  }
];

export function getPatternById(id: string): EnterpriseLearningPattern | undefined {
  return ENTERPRISE_LEARNING_PATTERNS.find(p => p.id === id);
}

export function getPatternsByDomain(domain: string): EnterpriseLearningPattern[] {
  return ENTERPRISE_LEARNING_PATTERNS.filter(p => 
    p.applicableDomains.some(d => d.toLowerCase() === domain.toLowerCase())
  );
}

export function getPatternsByType(type: PatternType): EnterpriseLearningPattern[] {
  return ENTERPRISE_LEARNING_PATTERNS.filter(p => p.type === type);
}
