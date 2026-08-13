export interface PersonaItem {
  id: string;
  name: string;
  description: string;
  category: string;
  decisionLens: string;
  status: 'active' | 'coming_soon';
}

export interface PersonaCategory {
  category: string;
  items: PersonaItem[];
}

export const DEFAULT_PERSONA_ID = 'exec';

export const PERSONA_CATALOGUE: PersonaCategory[] = [
  {
    category: 'Executive',
    items: [
      {
        id: 'exec',
        name: 'Innovation Executive',
        description: 'Strategic opportunity, portfolio innovation & IP governance lens.',
        category: 'Executive',
        decisionLens: 'Portfolio ROI, strategic risk & enterprise innovation velocity.',
        status: 'active'
      },
      {
        id: 'coo',
        name: 'Chief Operating Officer',
        description: 'Operational continuity, capacity headroom & supply chain risk lens.',
        category: 'Executive',
        decisionLens: 'End-to-end capacity headroom, labor overtime & operational continuity.',
        status: 'active'
      },
      {
        id: 'cco',
        name: 'Chief Commercial Officer',
        description: 'Commercial growth, margin acceleration & promotional return lens.',
        category: 'Executive',
        decisionLens: 'Gross margin impact, commercial growth & promo ROI.',
        status: 'coming_soon'
      },
      {
        id: 'cdao',
        name: 'Chief Data / Analytics Officer',
        description: 'Data governance, empirical evidence & model accuracy lens.',
        category: 'Executive',
        decisionLens: 'Model confidence, empirical signal provenance & analytics governance.',
        status: 'coming_soon'
      }
    ]
  },
  {
    category: 'Commercial & Planning',
    items: [
      {
        id: 'category_manager',
        name: 'Category Lead',
        description: 'Category margin, assortment yield & vendor headroom lens.',
        category: 'Commercial & Planning',
        decisionLens: 'Category profitability, vendor capacity allocation & stockout risk.',
        status: 'active'
      },
      {
        id: 'demand_planner',
        name: 'Demand Planner',
        description: 'Forecast precision, promotional surge & stockout prevention lens.',
        category: 'Commercial & Planning',
        decisionLens: 'Demand acceleration, promotional uplift variance & buffer inventory.',
        status: 'coming_soon'
      },
      {
        id: 'supply_chain_planner',
        name: 'Supply Chain Planner',
        description: 'Supplier allocation, lead-time variance & DC capacity lens.',
        category: 'Commercial & Planning',
        decisionLens: 'Supplier headroom caps, inbound lead times & DC throughput.',
        status: 'coming_soon'
      },
      {
        id: 'marketing_strategist',
        name: 'Marketing Strategist',
        description: 'Campaign velocity, customer acquisition & promotion ROI lens.',
        category: 'Commercial & Planning',
        decisionLens: 'Campaign conversion, discount depth vs supply availability.',
        status: 'coming_soon'
      }
    ]
  },
  {
    category: 'Data & Intelligence',
    items: [
      {
        id: 'data_analyst',
        name: 'Data Analyst',
        description: 'Empirical evidence, signal anomaly & causal root-cause lens.',
        category: 'Data & Intelligence',
        decisionLens: 'Root-cause attribution, anomaly signals & data freshness.',
        status: 'coming_soon'
      },
      {
        id: 'bi_analyst',
        name: 'Business Intelligence Analyst',
        description: 'Cross-functional reporting, KPI drift & historical baseline lens.',
        category: 'Data & Intelligence',
        decisionLens: 'Historical baseline trends, metric variance & reporting integrity.',
        status: 'coming_soon'
      },
      {
        id: 'data_scientist',
        name: 'Data Scientist',
        description: 'Predictive model validation, feature importance & decay metric lens.',
        category: 'Data & Intelligence',
        decisionLens: 'Feature weightings, predictive accuracy & confidence interval bounds.',
        status: 'coming_soon'
      },
      {
        id: 'decision_scientist',
        name: 'Decision Scientist',
        description: 'Counterfactual scenario rehearsal & trade-off optimization lens.',
        category: 'Data & Intelligence',
        decisionLens: 'Counterfactual trade-offs, ripple cost minimization & pattern confidence.',
        status: 'coming_soon'
      }
    ]
  },
  {
    category: 'Operations',
    items: [
      {
        id: 'store_manager',
        name: 'Operations Lead',
        description: 'Execution compliance, store availability & labor overtime lens.',
        category: 'Operations',
        decisionLens: 'Store-level availability, execution compliance & shelf replenishment.',
        status: 'active'
      },
      {
        id: 'supply_chain_manager',
        name: 'Supply Chain Manager',
        description: 'Logistics flow, carrier throughput & bottleneck mitigation lens.',
        category: 'Operations',
        decisionLens: 'Freight transport delays, cross-dock bottlenecks & fleet utilization.',
        status: 'coming_soon'
      },
      {
        id: 'fulfillment_manager',
        name: 'Fulfillment Manager',
        description: 'Order pick velocity, warehouse capacity & OTIF delivery lens.',
        category: 'Operations',
        decisionLens: 'Warehouse picking capacity, overtime costs & OTIF delivery rates.',
        status: 'coming_soon'
      },
      {
        id: 'cx_lead',
        name: 'Customer Experience Lead',
        description: 'On-time fulfillment, service level guarantees & churn prevention lens.',
        category: 'Operations',
        decisionLens: 'Service level agreement compliance, customer friction & issue resolution.',
        status: 'coming_soon'
      }
    ]
  },
  {
    category: 'Technology',
    items: [
      {
        id: 'cio',
        name: 'CIO / Technology Executive',
        description: 'Multi-service architecture, enterprise integration & cloud stability lens.',
        category: 'Technology',
        decisionLens: 'System reliability, multi-service architecture & API integration health.',
        status: 'coming_soon'
      },
      {
        id: 'enterprise_architect',
        name: 'Enterprise Architect',
        description: 'Domain model governance, contract verification & API topology lens.',
        category: 'Technology',
        decisionLens: 'Bounded context isolation, API contract verification & domain cleanliness.',
        status: 'coming_soon'
      },
      {
        id: 'it_service_leader',
        name: 'IT Service Leader',
        description: 'System uptime, API latency & platform reliability lens.',
        category: 'Technology',
        decisionLens: 'Uptime SLAs, latency metrics & service dependency resiliency.',
        status: 'coming_soon'
      }
    ]
  }
];

export function getPersonaById(id: string): PersonaItem | undefined {
  for (const cat of PERSONA_CATALOGUE) {
    const item = cat.items.find(i => i.id === id);
    if (item) return item;
  }
  return undefined;
}
