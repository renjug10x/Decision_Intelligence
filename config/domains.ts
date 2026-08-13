export interface DomainItem {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'active' | 'coming_soon';
  teaser?: string;
  iconName?: string;
}

export interface DomainCategory {
  category: string;
  items: DomainItem[];
}

export const DEFAULT_DOMAIN_ID = 'retail_grocery';

export const DOMAIN_CATALOGUE: DomainCategory[] = [
  {
    category: 'Commerce & Consumer',
    items: [
      {
        id: 'retail_grocery',
        name: 'Retail & Grocery',
        description: 'Connected promotion, forecasting, inventory, category, commitment, ripple, and memory intelligence.',
        category: 'Commerce & Consumer',
        status: 'active',
        teaser: 'Fully active demonstration domain with live simulation and learning pattern intelligence.'
      },
      {
        id: 'digital_commerce',
        name: 'E-commerce & Digital Commerce',
        description: 'Fulfillment speed, digital campaign acceleration, and customer lifetime value optimization.',
        category: 'Commerce & Consumer',
        status: 'coming_soon',
        teaser: 'What happens to fulfillment speed and customer lifetime value when flash sales trigger unhedged supplier commitments?'
      },
      {
        id: 'cpg',
        name: 'Consumer Products / CPG',
        description: 'Trade promotion spend, distributor inventory drift, and brand headroom alignment.',
        category: 'Commerce & Consumer',
        status: 'coming_soon',
        teaser: 'Can trade promotion spend and distributor inventory drift be rehearsed as one connected decision?'
      },
      {
        id: 'fashion_apparel',
        name: 'Fashion & Apparel',
        description: 'Seasonal markdown timing, channel inventory clearance, and trend acceleration.',
        category: 'Commerce & Consumer',
        status: 'coming_soon',
        teaser: 'How does seasonal markdown timing impact brand equity vs inventory clearance across channels?'
      }
    ]
  },
  {
    category: 'Hospitality & Experience',
    items: [
      {
        id: 'hospitality_hotels',
        name: 'Hospitality & Hotels',
        description: 'Occupancy yield, staffing allocation, and guest experience alignment.',
        category: 'Hospitality & Experience',
        status: 'coming_soon',
        teaser: 'Could room rate yield, staffing allocation, and guest experience be rehearsed as one connected decision?'
      },
      {
        id: 'restaurants_food',
        name: 'Restaurants & Food Service',
        description: 'Perishable waste reduction, menu yield, and kitchen capacity planning.',
        category: 'Hospitality & Experience',
        status: 'coming_soon',
        teaser: 'What operational commitments drive food waste before menu pricing adjustments reach the customer?'
      },
      {
        id: 'travel_tourism',
        name: 'Travel & Tourism',
        description: 'Booking surges, partner capacity caps, and service level guarantee tracking.',
        category: 'Hospitality & Experience',
        status: 'coming_soon',
        teaser: 'How do dynamic booking surges ripple into partner capacity caps and service level penalties?'
      },
      {
        id: 'entertainment_venues',
        name: 'Entertainment & Venues',
        description: 'Ticketing yield, concessions throughput, and crowd flow optimization.',
        category: 'Hospitality & Experience',
        status: 'coming_soon',
        teaser: 'Which venue ticketing strategy optimizes concessions throughput without creating gate bottlenecks?'
      }
    ]
  },
  {
    category: 'Transport & Infrastructure',
    items: [
      {
        id: 'aviation_airports',
        name: 'Aviation & Airports',
        description: 'Passenger experience, ground operations, and turnaround performance synchronization.',
        category: 'Transport & Infrastructure',
        status: 'coming_soon',
        teaser: 'What happens across passenger experience, ground operations and turnaround performance when one operational commitment changes?'
      },
      {
        id: 'aerospace',
        name: 'Aerospace',
        description: 'Component supply delay tracking, defense contract milestones, and maintenance SLAs.',
        category: 'Transport & Infrastructure',
        status: 'coming_soon',
        teaser: 'How do component supply delays ripple across defense contract milestones and maintenance SLAs?'
      },
      {
        id: 'logistics_distribution',
        name: 'Logistics & Distribution',
        description: 'Fleet allocation, driver overtime management, and same-day delivery SLA optimization.',
        category: 'Transport & Infrastructure',
        status: 'coming_soon',
        teaser: 'Which fleet allocation strategy balances driver overtime against same-day delivery SLAs?'
      },
      {
        id: 'transportation_mobility',
        name: 'Transportation & Mobility',
        description: 'Route congestion intelligence, fleet dispatching, and urban mobility optimization.',
        category: 'Transport & Infrastructure',
        status: 'coming_soon',
        teaser: 'How does route congestion data alter vehicle dispatch decisions in real-time?'
      }
    ]
  },
  {
    category: 'Technology & Services',
    items: [
      {
        id: 'it_services',
        name: 'IT & Technology Services',
        description: 'SLA failure prediction, service delivery patterns, and client outcome governance.',
        category: 'Technology & Services',
        status: 'coming_soon',
        teaser: 'What organisational patterns predict SLA failure before the customer experiences it?'
      },
      {
        id: 'professional_services',
        name: 'Professional Services',
        description: 'Project staffing commitments, utilization burnout prevention, and margin acceleration.',
        category: 'Technology & Services',
        status: 'coming_soon',
        teaser: 'Which project staffing commitments create utilization burnout vs margin acceleration?'
      },
      {
        id: 'telecom',
        name: 'Telecom',
        description: 'Network capacity congestion, customer churn prediction, and field dispatching.',
        category: 'Technology & Services',
        status: 'coming_soon',
        teaser: 'How does network capacity congestion ripple into customer churn and field technician dispatch?'
      }
    ]
  },
  {
    category: 'Industrial',
    items: [
      {
        id: 'manufacturing',
        name: 'Manufacturing',
        description: 'Raw material lead-time tracking, plant production scheduling, and delivery promises.',
        category: 'Industrial',
        status: 'coming_soon',
        teaser: 'How do raw material lead-time spikes impact plant production schedules and customer delivery promises?'
      },
      {
        id: 'automotive',
        name: 'Automotive',
        description: 'Assembly line allocation, EV battery supply constraints, and dealership order fulfillment.',
        category: 'Industrial',
        status: 'coming_soon',
        teaser: 'Which assembly line allocation balances EV battery supply constraints against dealership orders?'
      },
      {
        id: 'energy_utilities',
        name: 'Energy & Utilities',
        description: 'Peak grid load forecasting, renewable supply commitments, and risk hedging.',
        category: 'Industrial',
        status: 'coming_soon',
        teaser: 'How does peak grid load forecasting align with renewable supply commitment hedging?'
      },
      {
        id: 'construction_engineering',
        name: 'Construction & Engineering',
        description: 'Subcontractor delay tracking, multi-stage project milestones, and penalty prevention.',
        category: 'Industrial',
        status: 'coming_soon',
        teaser: 'Which subcontractor delay risks project completion penalties across multi-stage builds?'
      }
    ]
  },
  {
    category: 'Financial & Regulated',
    items: [
      {
        id: 'banking_finance',
        name: 'Banking & Financial Services',
        description: 'Liquidity reserve commitments, loan origination velocity, and risk exposure balancing.',
        category: 'Financial & Regulated',
        status: 'coming_soon',
        teaser: 'How do liquidity reserve commitments ripple into loan origination velocity and risk exposure?'
      },
      {
        id: 'insurance',
        name: 'Insurance',
        description: 'Catastrophe claims surge patterns, reinsurance capacity, and risk portfolio hedging.',
        category: 'Financial & Regulated',
        status: 'coming_soon',
        teaser: 'Which catastrophe claims surge pattern predicts reinsurance capacity headroom exhaustion?'
      },
      {
        id: 'healthcare_lifesciences',
        name: 'Healthcare & Life Sciences',
        description: 'Clinical trial supply constraints, therapy launch timelines, and patient availability.',
        category: 'Financial & Regulated',
        status: 'coming_soon',
        teaser: 'How do clinical trial supply constraints impact therapy launch timelines and patient availability?'
      },
      {
        id: 'public_sector',
        name: 'Public Sector',
        description: 'Municipal service allocation, public outcome tracking, and budget constraint governance.',
        category: 'Financial & Regulated',
        status: 'coming_soon',
        teaser: 'Which municipal service allocation strategy optimizes citizen outcomes under budget constraints?'
      }
    ]
  }
];

export function getDomainById(id: string): DomainItem | undefined {
  for (const cat of DOMAIN_CATALOGUE) {
    const item = cat.items.find(i => i.id === id);
    if (item) return item;
  }
  return undefined;
}
