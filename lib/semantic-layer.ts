// Lidl Decision Intelligence — Semantic Layer (Looker Simulation)
// This file mirrors what LookML defines in a real Looker instance.
// When a Looker API token is available, swap queryData() below for real Looker API calls.

export type Role = 'exec' | 'category_manager' | 'store_manager';

export interface Metric {
  key: string;
  label: string;
  format: 'currency' | 'number' | 'percent' | 'integer';
  description: string;
}

export interface Dimension {
  key: string;
  label: string;
  field: string;
}

// ── Metrics (mirrors LookML measure definitions) ────────────────────────────
export const METRICS: Metric[] = [
  { key: 'total_revenue',    label: 'Total Revenue',       format: 'currency', description: 'Sum of all sales revenue' },
  { key: 'total_units',      label: 'Units Sold',          format: 'integer',  description: 'Total units sold' },
  { key: 'avg_margin_pct',   label: 'Margin %',            format: 'percent',  description: 'Average gross margin percentage' },
  { key: 'total_waste',      label: 'Waste Units',         format: 'integer',  description: 'Total units wasted' },
  { key: 'waste_value',      label: 'Waste Value £',       format: 'currency', description: 'Estimated waste cost in GBP' },
  { key: 'revenue_wow',      label: 'Revenue WoW %',       format: 'percent',  description: 'Week-over-week revenue change' },
  { key: 'units_wow',        label: 'Units WoW %',         format: 'percent',  description: 'Week-over-week unit change' },
  { key: 'delivery_on_time', label: 'On-Time Delivery %',  format: 'percent',  description: 'Percentage of deliveries on time' },
  { key: 'delay_count',      label: 'Delayed Deliveries',  format: 'integer',  description: 'Number of delayed deliveries' },
  { key: 'avg_delay_days',   label: 'Avg Delay (Days)',    format: 'number',   description: 'Average delay duration in days' },
];

// ── Dimensions (mirrors LookML dimension definitions) ───────────────────────
export const DIMENSIONS: Dimension[] = [
  { key: 'store',    label: 'Store',    field: 'store_id'   },
  { key: 'region',   label: 'Region',   field: 'region'     },
  { key: 'category', label: 'Category', field: 'category'   },
  { key: 'sku',      label: 'SKU',      field: 'sku_id'     },
  { key: 'date',     label: 'Date',     field: 'date'       },
  { key: 'week',     label: 'Week',     field: 'week'       },
  { key: 'supplier', label: 'Supplier', field: 'supplier_id'},
];

// ── Role-based access (mirrors Looker IAM / access_filter) ──────────────────
export const ACCESS_POLICY: Record<Role, { dimensions: string[]; restricted_field?: string }> = {
  exec: {
    dimensions: ['store', 'region', 'category', 'sku', 'date', 'week', 'supplier'],
  },
  category_manager: {
    dimensions: ['store', 'region', 'category', 'sku', 'date', 'week'],
  },
  store_manager: {
    dimensions: ['category', 'sku', 'date', 'week'],
    restricted_field: 'store',
  },
};

// ── Guided prompts per role (replaces free-text cold start) ─────────────────
export const GUIDED_PROMPTS: Record<Role, string[]> = {
  exec: [
    'Give me this week\'s business summary',
    'Which regions are underperforming vs forecast?',
    'What are our top 3 supply chain risks right now?',
    'Compare margin vs forecast for Q2',
    'Which categories have the highest waste this month?',
  ],
  category_manager: [
    'Show underperforming SKUs in chilled foods',
    'Which promotions drove the most uplift last month?',
    'Compare dairy margin vs forecast this quarter',
    'What is driving waste in produce?',
    'Show me top 10 SKUs by revenue this week',
  ],
  store_manager: [
    'Why is my store underperforming this week?',
    'What is my waste trend for the last 14 days?',
    'Which products have the lowest availability today?',
    'How did my store perform vs last week?',
    'Show me my top selling categories today',
  ],
};

// ── Looker API hook (swap mock → real when instance is available) ─────────────
export const LOOKER_CONFIG = {
  // Set these when you have a real Looker instance:
  base_url: process.env.LOOKER_BASE_URL || null,
  client_id: process.env.LOOKER_CLIENT_ID || null,
  client_secret: process.env.LOOKER_CLIENT_SECRET || null,
  model: 'lidl_retail',
  // When base_url is set, queryData() will route to Looker API instead of mock
  is_connected: !!(process.env.LOOKER_BASE_URL),
};
