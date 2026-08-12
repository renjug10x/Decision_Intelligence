/**
 * CogniX Enterprise Innovation Lab — Demonstration Solutions Registry
 * Canonical registry for Asset Type B (Working Business Capabilities).
 */

export interface CognixSolution {
  id: string;
  name: string;
  fiveSecondProposition: string;
  businessQuestion: string;
  businessDomain: string;
  applicableIndustries: string[];
  inputs: string[];
  intelligenceUsed: string[];
  interactiveCapabilities: string[];
  businessOutcomes: string[];
  relatedExperiments: string[];
  dataClassification: 'Open Innovation' | 'G10X Accelerator' | 'Client Confidential';
  demoMaturity: 'Production Ready' | 'Interactive Prototype' | 'Reference Pattern';
}

export const DEMONSTRATION_SOLUTIONS: CognixSolution[] = [
  {
    id: 'SOL-PROMO-01',
    name: 'Promotion Intelligence',
    fiveSecondProposition: 'Demand +22% vs Supply +10%. £1.2M commercial opportunity at risk of fulfilment bottleneck.',
    businessQuestion: 'Are our promotional uplift projections compatible with end-to-end supply chain capacity?',
    businessDomain: 'Commercial & Merchandising',
    applicableIndustries: ['retail_grocery', 'cpg_manufacturing', 'generic_enterprise'],
    inputs: ['Historical Uplift Rates', 'Supplier Headroom', 'Promotional Mechanics'],
    intelligenceUsed: ['Elasticity Modelling', 'Constraint Checking', 'Gemini Impact Summary'],
    interactiveCapabilities: ['Discount Slider', 'Supplier Flex Toggle', 'Commitment Chain Handoff'],
    businessOutcomes: ['Prevented Stock-Outs', 'Optimized Promo Margin', 'Protected Brand Promise'],
    relatedExperiments: ['EXP-COMMITMENT-01', 'EXP-RIPPLE-02'],
    dataClassification: 'G10X Accelerator',
    demoMaturity: 'Production Ready',
  },
  {
    id: 'SOL-DEMAND-02',
    name: 'Demand & Forecast Intelligence',
    fiveSecondProposition: 'Fresh demand accelerating 13% faster than seasonal baseline. Forecast confidence at 91%.',
    businessQuestion: 'How can multi-horizon demand forecasting anticipate micro-regional demand shifts early?',
    businessDomain: 'Demand Planning',
    applicableIndustries: ['retail_grocery', 'cpg_manufacturing', 'generic_enterprise'],
    inputs: ['POS Transaction Stream', 'Weather & Local Events', 'Historical Seasonality'],
    intelligenceUsed: ['Multi-Horizon Time Series', 'Anomaly Detection', 'Confidence Scoring'],
    interactiveCapabilities: ['Horizon Selector', 'Store Filter', 'Scenario Override'],
    businessOutcomes: ['Forecast Error Reduced 18%', 'Inventory Buffer Minimized', 'Waste Reduced'],
    relatedExperiments: ['EXP-COMMITMENT-01', 'EXP-OPPORTUNITY-04'],
    dataClassification: 'G10X Accelerator',
    demoMaturity: 'Production Ready',
  },
  {
    id: 'SOL-INV-03',
    name: 'Predictive Inventory Intelligence',
    fiveSecondProposition: '17 products at critical availability risk. £420K potential revenue exposure over 7 days.',
    businessQuestion: 'Where will inventory buffers fail first under current lead times and demand velocity?',
    businessDomain: 'Supply Chain & Logistics',
    applicableIndustries: ['retail_grocery', 'cpg_manufacturing', 'generic_enterprise'],
    inputs: ['DC Stock Levels', 'Transit Telemetry', 'Safety Stock Parameters'],
    intelligenceUsed: ['Lead Time Variance Modeling', 'Risk Heatmapping', 'Reorder Optimization'],
    interactiveCapabilities: ['DC Scope Switcher', 'Safety Stock Adjustment', 'Trigger Emergency PO'],
    businessOutcomes: ['On-Shelf Availability 98.4%', 'Working Capital Optimized'],
    relatedExperiments: ['EXP-COMMITMENT-01', 'EXP-MEMORY-03'],
    dataClassification: 'G10X Accelerator',
    demoMaturity: 'Production Ready',
  },
  {
    id: 'SOL-CAT-04',
    name: 'Category Intelligence',
    fiveSecondProposition: 'Dairy category margin expanding +3.2%, but premium SKU shrinkage rising +1.8%.',
    businessQuestion: 'Which category sub-segments drive net profit vs volume growth across regions?',
    businessDomain: 'Category Management',
    applicableIndustries: ['retail_grocery', 'cpg_manufacturing'],
    inputs: ['Category Mix Sales', 'Cost of Goods Sold', 'Waste & Shrinkage Logs'],
    intelligenceUsed: ['Assortment Mix Optimization', 'Margin Contribution Tree'],
    interactiveCapabilities: ['Category Drilldown', 'Sub-Segment Filter', 'Export Strategy Sheet'],
    businessOutcomes: ['Category Profitability +2.4%', 'Assortment Rationalized'],
    relatedExperiments: ['EXP-OPPORTUNITY-04'],
    dataClassification: 'G10X Accelerator',
    demoMaturity: 'Production Ready',
  },
];
