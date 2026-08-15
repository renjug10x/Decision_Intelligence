// CogniX Innovation Lab — Canonical Experiment Registry

export type ExperimentMaturity = 
  | 'Concept' 
  | 'Research' 
  | 'Prototype' 
  | 'Pilot Ready' 
  | 'Accelerator' 
  | 'Industry Pattern' 
  | 'Retired';

export type IpClassification = 
  | 'Open Innovation' 
  | 'G10X Proprietary' 
  | 'Client Confidential' 
  | 'Joint Innovation' 
  | 'Client Exclusive';

export interface CognixExperiment {
  id: string;
  name: string;
  provocativeQuestion: string;
  problemStatement: string;
  industryToday: string;
  cognixInnovation: string;
  demonstrationRoute: string;
  maturity: ExperimentMaturity;
  ipClassification: IpClassification;
  originDate: string;
  originator: string;
  version: string;
  commercialStatus: string;
  businessValue: {
    financialUpside: string;
    operationalMetric: string;
    strategicAdvantage: string;
  };
  confidenceScore: number;
  intelligenceUsed: string[];
  evidenceSources: string[];
  applicableIndustries: string[];
  businessDomains: string[];
  learnings: {
    date: string;
    clientFeedbackSummary: string;
    keyInsights: string[];
  }[];
}

export const EXPERIMENT_REGISTRY: CognixExperiment[] = [
  {
    id: 'EXP-COMMITMENT-01',
    name: 'Commitment Intelligence',
    provocativeQuestion: 'What if the enterprise could detect a broken promise before the customer experiences it?',
    problemStatement: 'Siloed departmental planning creates hidden conflicts where demand forecasts are accurate, but upstream supplier capacities and downstream fulfillment commitments contradict each other.',
    industryToday: 'Traditional BI platforms report store out-of-stock events days after they happen, while ERP systems evaluate inventory levels independently of marketing promotion campaigns.',
    cognixInnovation: 'Continuous causal tracking of interconnected commitment chains (Marketing → Demand → Supplier → Inventory → Fulfillment → Delivery → Customer) with real-time drift detection.',
    demonstrationRoute: 'commitment-intelligence',
    maturity: 'Prototype',
    ipClassification: 'G10X Proprietary',
    originDate: '2026-08-01',
    originator: 'G10X Enterprise Innovation Lab',
    version: '1.2.0',
    commercialStatus: 'Active Executive Demonstration',
    businessValue: {
      financialUpside: '£1.4M / year protected revenue',
      operationalMetric: '35% reduction in delivery promise failures',
      strategicAdvantage: 'Proactive intervention 14 days before customer impact'
    },
    confidenceScore: 94,
    intelligenceUsed: ['Google Gemini 2.0 Flash', 'Looker Semantic Layer', 'Causal Graph Engine'],
    evidenceSources: ['Supplier Contract SLA Data', 'Promotional Schedule Feed', 'WMS Capacity Telemetry'],
    applicableIndustries: ['Retail & Grocery', 'Consumer Packaged Goods', 'Logistics'],
    businessDomains: ['Supply Chain', 'Commercial Strategy', 'Customer Experience'],
    learnings: [
      {
        date: '2026-08-05',
        clientFeedbackSummary: 'Executive interest focused heavily on supplier lead-time drift detection during promotional spikes.',
        keyInsights: ['C-suite values commitment breakdown visibility over generic demand forecast accuracy metrics.']
      }
    ]
  },
  {
    id: 'EXP-RIPPLE-02',
    name: 'Decision Ripple Intelligence',
    provocativeQuestion: 'What happens everywhere else when we make this decision?',
    problemStatement: 'Commercial decisions (such as increasing promotional spend by 15%) are made within marketing silos without modeling 2nd-order labor spikes in DCs or 3rd-order margin erosion.',
    industryToday: 'Scenario tools model single-domain outcomes (e.g. sales uplift), ignoring multi-order operational side effects across logistics, labor, and supplier penalties.',
    cognixInnovation: 'Multi-order cross-functional impact propagation modeling 1st-order revenue, 2nd-order operational bottlenecks, and 3rd-order net margin compression in real time.',
    demonstrationRoute: 'decision-ripple',
    maturity: 'Prototype',
    ipClassification: 'G10X Proprietary',
    originDate: '2026-08-03',
    originator: 'G10X Architecture Practice',
    version: '1.1.0',
    commercialStatus: 'Active Executive Demonstration',
    businessValue: {
      financialUpside: '£850K margin erosion prevented',
      operationalMetric: '22% overtime cost reduction',
      strategicAdvantage: 'Cross-functional decision rehearsal before budget commitment'
    },
    confidenceScore: 89,
    intelligenceUsed: ['Multi-Order Propagation Graph', 'Gemini Narrative Synthesis', 'Looker Metric Engine'],
    evidenceSources: ['DC Labor Capacity Logs', 'Freight Carrier Tariff Tables', 'Store Staffing Telemetry'],
    applicableIndustries: ['Retail', 'Omnichannel Commerce', 'Manufacturing'],
    businessDomains: ['Marketing', 'Fulfillment', 'Financial Planning'],
    learnings: [
      {
        date: '2026-08-08',
        clientFeedbackSummary: 'COOs requested ability to compare 3 alternate promo scenarios side by side.',
        keyInsights: ['Demonstrating 3rd-order margin compression transforms marketing budget discussions.']
      }
    ]
  },
  {
    id: 'EXP-MEMORY-03',
    name: 'Enterprise Memory Foundation',
    provocativeQuestion: 'What have we seen before that could help us right now?',
    problemStatement: 'Enterprise knowledge is volatile; when operational anomalies occur, teams repeat past mistakes because historical incident contexts and resolution outcomes are lost in email threads.',
    industryToday: 'Post-mortem reports sit in isolated documents, unlinked to real-time decision-making cockpits.',
    cognixInnovation: 'Structured organizational memory indexing past situations, decisions, expected outcomes, actual results, and verified intervention patterns for instant retrieval.',
    demonstrationRoute: 'enterprise-memory',
    maturity: 'Concept',
    ipClassification: 'G10X Proprietary',
    originDate: '2026-08-10',
    originator: 'G10X AI Lab',
    version: '0.8.0',
    commercialStatus: 'In Concept Exploration',
    businessValue: {
      financialUpside: '£420K recurring operational savings',
      operationalMetric: '60% faster incident resolution',
      strategicAdvantage: 'Institutional knowledge retention across leadership transitions'
    },
    confidenceScore: 78,
    intelligenceUsed: ['Gemini Semantic Embeddings', 'Vector Context Matcher', 'Historical Pattern Engine'],
    evidenceSources: ['Historical Incident Log (2023-2026)', 'Audit Trail Archive', 'Intervention Ledger'],
    applicableIndustries: ['All Enterprise Sectors'],
    businessDomains: ['Operations', 'Risk & Compliance', 'Executive Leadership'],
    learnings: []
  },
  {
    id: 'EXP-OPPORTUNITY-04',
    name: 'Opportunity Intelligence',
    provocativeQuestion: 'Where is the hidden profit opportunity that conventional reporting misses?',
    problemStatement: 'Legacy enterprise monitoring focuses exclusively on risk alerts and negative variance, ignoring hidden upside opportunities created by favorable supplier capacity and demand shifts.',
    industryToday: 'BI dashboards highlight red metrics (underperformance) but never proactively suggest profitable commercial interventions.',
    cognixInnovation: 'Proactive upside discovery engine calculating real-time margin opportunities with automated intervention recommendations.',
    demonstrationRoute: 'opportunity-intelligence',
    maturity: 'Concept',
    ipClassification: 'G10X Proprietary',
    originDate: '2026-08-11',
    originator: 'G10X Commercial Advisory',
    version: '0.5.0',
    commercialStatus: 'Roadmap Prototype',
    businessValue: {
      financialUpside: '£210K regional upside per campaign',
      operationalMetric: '15% asset utilization gain',
      strategicAdvantage: 'Value creation focus over cost cutting'
    },
    confidenceScore: 82,
    intelligenceUsed: ['Opportunity Pattern Solver', 'Gemini Proactive Synthesis'],
    evidenceSources: ['Supplier Excess Capacity Feed', 'Regional Demand Forecasts'],
    applicableIndustries: ['Retail', 'Consumer Packaged Goods'],
    businessDomains: ['Commercial Strategy', 'Merchandising'],
    learnings: []
  },
  {
    id: 'EXP-CDI-01',
    name: 'Campaign Decision Intelligence',
    provocativeQuestion: 'What if promotional decisions discovered whether, where, when, and how to intervene while accounting for counterfactuals, cross-functional consequences, and closed-loop learning?',
    problemStatement: 'Retail promotion tools collapse decision-making into discount calculators, skipping whether intervention is needed, where and when it should happen, and what reality later taught the enterprise.',
    industryToday: 'Promotion planners optimise mechanic depth inside a silo without an explicit counterfactual baseline, readiness gate, or closed learning loop.',
    cognixInnovation: 'Progressive Campaign Decision Canvas establishing authoritative campaign intent, then unlocking counterfactual, causal, readiness, frontier, and learning capabilities across CDI packages.',
    demonstrationRoute: 'campaign-decision',
    maturity: 'Prototype',
    ipClassification: 'G10X Proprietary',
    originDate: '2026-08-14',
    originator: 'G10X Enterprise Innovation Lab',
    version: '0.1.0',
    commercialStatus: 'Active CDI Foundation (CDI-01)',
    businessValue: {
      financialUpside: '£4.6K net profit recovery pathway (demo)',
      operationalMetric: '35% OOS risk reduction pathway (demo)',
      strategicAdvantage: 'Promotion treated as one intervention option — not the default answer'
    },
    confidenceScore: 86,
    intelligenceUsed: ['Campaign Intent Contract', 'Shared Decision State', 'Commercial Intent Projection'],
    evidenceSources: ['CDI-01 Canvas Registration', 'IFI-01 Commercial Intent Store', 'WP10-C Decision State'],
    applicableIndustries: ['Retail & Grocery', 'Consumer Packaged Goods'],
    businessDomains: ['Commercial Strategy', 'Merchandising', 'Demand Planning'],
    learnings: []
  }
];
