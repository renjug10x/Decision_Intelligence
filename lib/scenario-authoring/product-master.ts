/**
 * The governed product and supplier masters, as scenario authoring sees them (`SCI-07`)
 * ───────────────────────────────────────────────────────────────────────────────
 * Authoring does not let a person type a product. It lets them CHOOSE one, from the masters
 * the certification gate already reconciles a scenario against — `C-1.6` (the SKU exists
 * under the name the scenario gives it), `C-1.7` (so does the supplier), `C-1.8` (the
 * supplier is the SKU's own) and `C-2.10` (the list price is the master's, not a second
 * price).
 *
 * A free-text product field would author a scenario that certification then refuses, which is
 * a worse experience than a closed catalogue and a weaker guarantee besides: the closed set
 * is what makes the allowlist in ADR-083 part 4 real for the product dimension.
 *
 * Nothing here is a second product model. It is a projection of `data/products.json` and
 * `data/suppliers.json` into the fields authoring needs, exactly as `ScenarioRegistryEntry`
 * is a projection of `CanonicalScenario`.
 */

import productsData from '@/data/products.json';
import suppliersData from '@/data/suppliers.json';

interface ProductMasterRow {
  sku_id: string;
  name: string;
  category: string;
  subcategory: string;
  supplier_id: string;
  cost_price: number;
  rrp: number;
}

interface SupplierMasterRow {
  supplier_id: string;
  name: string;
  category: string;
  country: string;
  on_time_rate: number;
  avg_delay_days: number;
}

export interface AuthorableProduct {
  sku_id: string;
  sku_name: string;
  category: string;
  subcategory: string;
  supplier_id: string;
  supplier_name: string;
  supplier_country: string;
  /** The master's on-time rate, published so an author can see why a lead-time posture matters. */
  supplier_on_time_rate: number;
  /** The master price. Not authorable — `C-2.10` reconciles a scenario against it. */
  list_price_gbp: number;
  /** The master cost. Not authorable; it is what the margin rate is derived from. */
  unit_cost_gbp: number;
}

const PRODUCTS = productsData as ProductMasterRow[];
const SUPPLIERS = suppliersData as SupplierMasterRow[];

const SUPPLIER_INDEX = new Map(SUPPLIERS.map(s => [s.supplier_id, s]));

function project(row: ProductMasterRow): AuthorableProduct | null {
  const supplier = SUPPLIER_INDEX.get(row.supplier_id);
  /*
   * A product whose supplier is missing from the supplier master is not offered at all.
   * `C-1.7` would refuse any scenario built on it, and offering a choice that cannot certify
   * is the behaviour this module exists to remove.
   */
  if (!supplier) return null;
  return {
    sku_id: row.sku_id,
    sku_name: row.name,
    category: row.category,
    subcategory: row.subcategory,
    supplier_id: row.supplier_id,
    supplier_name: supplier.name,
    supplier_country: supplier.country,
    supplier_on_time_rate: supplier.on_time_rate,
    list_price_gbp: row.rrp,
    unit_cost_gbp: row.cost_price
  };
}

const AUTHORABLE: readonly AuthorableProduct[] = PRODUCTS
  .map(project)
  .filter((p): p is AuthorableProduct => p !== null);

/** Every product a scenario may be authored about, in master order. */
export function listAuthorableProducts(): readonly AuthorableProduct[] {
  return AUTHORABLE;
}

export function authorableProduct(skuId: string | undefined | null): AuthorableProduct | undefined {
  if (!skuId) return undefined;
  return AUTHORABLE.find(p => p.sku_id === skuId);
}

/** The categories represented, so a chooser can group by something a reader recognises. */
export function authorableCategories(): string[] {
  return [...new Set(AUTHORABLE.map(p => p.category))].sort();
}
