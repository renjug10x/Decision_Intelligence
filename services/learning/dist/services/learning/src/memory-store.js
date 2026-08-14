"use strict";
/**
 * CogniX Enterprise Memory Store Implementation
 * Server-side tenant-isolated in-memory repository for specific organizational precedents.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryRepository = exports.InMemoryMemoryRepository = exports.CANONICAL_MEMORY_CASES = void 0;
const index_1 = require("../../../packages/contracts/src/index");
exports.CANONICAL_MEMORY_CASES = [
    {
        memory_id: 'MEM-2025-Q2-018',
        tenant_id: 'tenant_uk_retail_01',
        title: 'Q2 Promo Demand Surge & Secondary SLA Flex',
        category: 'Fresh Dairy',
        situation_summary: 'In synthetic demonstration precedent Q2 2025 (Campaign 18), marketing demand (+22%) outpaced primary supplier capacity (+10%), creating a 1,400-case availability gap.',
        decision_taken: 'Activated Secondary Supplier SLA Flex Rule #4 to divert 1,200 cases from regional reserve.',
        selected_interventions: ['SLA_FLEX_RULE_4'],
        expected_outcome: 'Protect 98%+ store availability without exceeding 5% waste variance.',
        actual_outcome: 'Store availability maintained at 98.4%. Waste contained to 4.8%. Delivery SLA penalties averted.',
        business_result: 'Saved £168,000 in lost sales and delivery breach penalties in demonstration simulation.',
        lessons_learned: 'Triggering SLA Flex 7 days prior to promotion launch prevents RDC congestion better than reactive transfers.',
        confidence: 94,
        pattern_id: 'PAT-COMM-01',
        commercial_intent_ref: 'intent_demo_01',
        decision_state_ref: { decision_state_id: 'ds_demo_01', decision_state_version: 2 },
        signal_refs: ['sig_ps_001', 'sig_ps_002'],
        simulation_ref: 'sig_sim_demo_01',
        provenance: {
            source: 'G10X Synthetic Demonstration Precedent',
            period: 'Q2 2025 (Campaign 18)',
            data_classification: 'G10X Accelerator Synthetic Precedent',
            is_synthetic_demo: true,
            generator: 'cognix_seed'
        },
        synthetic_demo: true,
        created_at: '2025-06-15T10:00:00Z',
        schema_version: '1.0'
    },
    {
        memory_id: 'MEM-2025-Q4-042',
        tenant_id: 'tenant_uk_retail_01',
        title: 'Chilled Category Overtime & Campaign Window Stagger',
        category: 'Chilled',
        situation_summary: 'In synthetic demonstration precedent Q4 2025 (Campaign 42), chilled promo volume surge (+28%) caused 35% warehouse overtime and emergency air freight margin erosion.',
        decision_taken: 'Rebalanced cross-category promotion timing, staggering Chilled and Produce promo start dates by 5 days.',
        selected_interventions: ['STAGGERED_CAMPAIGN_WINDOW'],
        expected_outcome: 'Flatten warehouse throughput spikes while preserving overall campaign gross revenue.',
        actual_outcome: 'DC overtime reduced by 82%. Emergency freight fees eliminated. Margin compression averted.',
        business_result: 'Saved £42,000 in DC overtime and freight surcharges in demonstration simulation.',
        lessons_learned: 'Staggering fresh categories by 48-72 hours prevents peak labor collisions at regional hubs.',
        confidence: 91,
        pattern_id: 'PAT-RIPPLE-04',
        commercial_intent_ref: 'intent_demo_02',
        decision_state_ref: { decision_state_id: 'ds_demo_02', decision_state_version: 3 },
        signal_refs: ['sig_ps_003', 'sig_ps_004'],
        simulation_ref: 'sig_sim_demo_02',
        provenance: {
            source: 'G10X Synthetic Demonstration Precedent',
            period: 'Q4 2025 (Campaign 42)',
            data_classification: 'G10X Accelerator Synthetic Precedent',
            is_synthetic_demo: true,
            generator: 'cognix_seed'
        },
        synthetic_demo: true,
        created_at: '2025-11-20T14:30:00Z',
        schema_version: '1.0'
    },
    {
        memory_id: 'MEM-2025-Q3-029',
        tenant_id: 'tenant_uk_retail_01',
        title: 'Emergency DC Stock Transfer & Weekend Availability Protection',
        category: 'Chilled Ready Meals',
        situation_summary: 'In synthetic demonstration precedent Q3 2025, primary supplier delay rate reached 45% on weekend shipments across Manchester regional stores.',
        decision_taken: 'Executed emergency stock transfer from Trafford DC and extended order lead-time buffer to 48h.',
        selected_interventions: ['EMERGENCY_DC_REBALANCE', 'SLA_FLEX_RULE_4'],
        expected_outcome: 'Recover £12,400 evening sales window across 5 affected stores.',
        actual_outcome: 'Shelf availability restored to 99.2% with zero evening stockout window.',
        business_result: 'Recovered £12,400 in evening sales and prevented customer churn in demonstration simulation.',
        lessons_learned: 'Rebalancing DC reserve stock within 4 hours of delay signal detection preserves store availability.',
        confidence: 92,
        pattern_id: 'PAT-INT-05',
        commercial_intent_ref: 'intent_demo_03',
        decision_state_ref: { decision_state_id: 'ds_demo_03', decision_state_version: 1 },
        signal_refs: ['sig_ps_005'],
        simulation_ref: 'sig_sim_demo_03',
        provenance: {
            source: 'G10X Synthetic Demonstration Precedent',
            period: 'Q3 2025 (Campaign 29)',
            data_classification: 'G10X Accelerator Synthetic Precedent',
            is_synthetic_demo: true,
            generator: 'cognix_seed'
        },
        synthetic_demo: true,
        created_at: '2025-08-14T11:00:00Z',
        schema_version: '1.0'
    }
];
class InMemoryMemoryRepository {
    cases = new Map();
    constructor() {
        this.seed();
    }
    seed() {
        exports.CANONICAL_MEMORY_CASES.forEach(c => {
            this.cases.set(c.memory_id, { ...c });
        });
    }
    registerMemoryCase(caseObj) {
        const val = (0, index_1.validateEnterpriseMemoryCase)(caseObj);
        if (!val.valid) {
            throw new Error(`Invalid EnterpriseMemoryCase: ${val.errors.join(', ')}`);
        }
        this.cases.set(caseObj.memory_id, { ...caseObj });
        return { ...caseObj };
    }
    getMemoryCaseById(id) {
        const found = this.cases.get(id);
        return found ? { ...found } : null;
    }
    queryMemoryCases(filter) {
        let results = Array.from(this.cases.values());
        if (filter.tenant_id) {
            results = results.filter(c => c.tenant_id === filter.tenant_id);
        }
        if (filter.category) {
            results = results.filter(c => c.category.toLowerCase() === filter.category.toLowerCase());
        }
        if (filter.pattern_id) {
            results = results.filter(c => c.pattern_id === filter.pattern_id);
        }
        const limit = filter.limit || 50;
        return results.slice(0, limit);
    }
    searchMemoryPrecedents(request) {
        let results = Array.from(this.cases.values());
        if (request.tenant_id) {
            results = results.filter(c => c.tenant_id === request.tenant_id);
        }
        if (request.category) {
            results = results.filter(c => c.category.toLowerCase() === request.category.toLowerCase());
        }
        if (request.pattern_id) {
            results = results.filter(c => c.pattern_id === request.pattern_id);
        }
        if (request.query) {
            const q = request.query.toLowerCase();
            results = results.filter(c => c.situation_summary.toLowerCase().includes(q) ||
                c.memory_id.toLowerCase().includes(q) ||
                c.lessons_learned.toLowerCase().includes(q) ||
                c.decision_taken.toLowerCase().includes(q));
        }
        const limit = request.limit || 20;
        return results.slice(0, limit);
    }
    clear() {
        this.cases.clear();
    }
}
exports.InMemoryMemoryRepository = InMemoryMemoryRepository;
exports.memoryRepository = new InMemoryMemoryRepository();
