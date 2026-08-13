// CogniX Innovation Lab — Industry Demonstration Packs Configuration

export interface IndustryPack {
  id: string;
  name: string;
  description: string;
  terminology: {
    customer: string;
    location: string;
    productUnit: string;
    fulfillmentCenter: string;
    channel: string;
  };
  sampleScenarios: {
    id: string;
    title: string;
    description: string;
  }[];
}

export const INDUSTRY_PACKS: Record<string, IndustryPack> = {
  retail_grocery: {
    id: 'retail_grocery',
    name: 'Retail & Grocery Pack',
    description: 'Omnichannel grocery, fresh produce, and chilled fulfillment scenarios.',
    terminology: {
      customer: 'Shopper',
      location: 'Store / Supermarket',
      productUnit: 'SKU / Case',
      fulfillmentCenter: 'Regional Distribution Center (RDC)',
      channel: 'Store & Online Grocery'
    },
    sampleScenarios: [
      {
        id: 'promo_chilled_surge',
        title: 'Chilled Ready Meal Promo Surge',
        description: 'Marketing campaign increases demand by 22% while supplier capacity is capped at 10%.'
      },
      {
        id: 'produce_waste_spoilage',
        title: 'Fresh Produce Spoilage & Price Markdown',
        description: 'Moisture anomaly in transit accelerates spoilage; automated markdown protects £45K margin.'
      }
    ]
  },
  cpg_manufacturing: {
    id: 'cpg_manufacturing',
    name: 'CPG & Consumer Packaged Goods',
    description: 'Brand manufacturer, distributor, and retail customer supply commitment modeling.',
    terminology: {
      customer: 'Retail Account',
      location: 'Regional Hub',
      productUnit: 'Pallet / Batch',
      fulfillmentCenter: 'Manufacturing Plant DC',
      channel: 'Key Accounts & Wholesale'
    },
    sampleScenarios: [
      {
        id: 'raw_material_delay',
        title: 'Packaging Supply Disruption',
        description: 'Cardboard sleeve supplier delay risks customer delivery promises across 4 major retail accounts.'
      }
    ]
  },
  generic_enterprise: {
    id: 'generic_enterprise',
    name: 'Generic Enterprise Context',
    description: 'Clean, industry-neutral enterprise operational commitment and decision simulation.',
    terminology: {
      customer: 'Enterprise Client',
      location: 'Operational Node',
      productUnit: 'Deliverable / Unit',
      fulfillmentCenter: 'Operations Center',
      channel: 'Enterprise Operations'
    },
    sampleScenarios: [
      {
        id: 'service_level_commitment',
        title: 'SLA Commitment Drift',
        description: 'Operational capacity constraint threatens SLA commitment before customer escalation.'
      }
    ]
  }
};
