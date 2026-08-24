/**
 * Shared request parsing for Atlas routes.
 * Filter values are validated against the taxonomy: an unknown value returns a typed 400
 * naming the field, never a silent empty result (CAPABILITY_ATLAS_ARCHITECTURE.md §4.1).
 */
import { NextResponse } from 'next/server';
import { DOMAIN_CATALOGUE } from '@/config/domains';
import { PERSONA_CATALOGUE } from '@/config/personas';
import {
  IMPLEMENTATION_STATUSES,
  type CapabilityFilter,
  type ImplementationStatus,
  type LifecycleState,
  type DemoMaturity,
  type CapabilityType
} from '@/packages/contracts/src/capability-atlas-model';

const DOMAIN_IDS = new Set(DOMAIN_CATALOGUE.flatMap(c => c.items.map(i => i.id)));
const PERSONA_IDS = new Set(PERSONA_CATALOGUE.flatMap(c => c.items.map(i => i.id)));
const LIFECYCLE_STATES: LifecycleState[] = ['Concept', 'Research', 'Prototype', 'Pilot Ready', 'Accelerator', 'Industry Pattern', 'Retired'];
const DEMO_MATURITIES: DemoMaturity[] = ['Production Ready', 'Interactive Prototype', 'Reference Pattern'];
const CAPABILITY_TYPES: CapabilityType[] = ['domain-capability', 'platform-capability', 'enabling-service', 'governance-control', 'experience'];

export class FilterError extends Error {
  constructor(public field: string, public value: string, public allowed: string[]) {
    super(`Unknown value '${value}' for filter '${field}'.`);
  }
}

function multi(params: URLSearchParams, key: string): string[] | undefined {
  const raw = params.getAll(key).flatMap(v => v.split(',')).map(v => v.trim()).filter(Boolean);
  return raw.length > 0 ? raw : undefined;
}

function checked<T extends string>(values: string[] | undefined, field: string, allowed: Set<string> | T[]): T[] | undefined {
  if (!values) return undefined;
  const allowedSet = allowed instanceof Set ? allowed : new Set<string>(allowed);
  for (const v of values) {
    if (!allowedSet.has(v)) throw new FilterError(field, v, [...allowedSet]);
  }
  return values as T[];
}

export function parseFilter(params: URLSearchParams): CapabilityFilter {
  const platformReusableRaw = params.get('platform_reusable');
  return {
    domain: checked(multi(params, 'domain'), 'domain', DOMAIN_IDS),
    persona: checked(multi(params, 'persona'), 'persona', PERSONA_IDS),
    business_problem: multi(params, 'business_problem'),
    tags: multi(params, 'tags'),
    delivered_by: multi(params, 'delivered_by'),
    demonstrated_by: multi(params, 'demonstrated_by'),
    cross_domain_applicability: checked(multi(params, 'cross_domain_applicability'), 'cross_domain_applicability', DOMAIN_IDS),
    lifecycle_state: checked<LifecycleState>(multi(params, 'lifecycle_state'), 'lifecycle_state', LIFECYCLE_STATES),
    demo_maturity: checked<DemoMaturity>(multi(params, 'demo_maturity'), 'demo_maturity', DEMO_MATURITIES),
    implementation_status: checked<ImplementationStatus>(multi(params, 'implementation_status'), 'implementation_status', IMPLEMENTATION_STATUSES),
    capability_type: checked<CapabilityType>(multi(params, 'capability_type'), 'capability_type', CAPABILITY_TYPES),
    platform_reusable: platformReusableRaw === null ? undefined : platformReusableRaw === 'true'
  };
}

export function ok(domain: string, data: unknown, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ status: 'success', service: 'cognix-web-bff', domain, ...extra, data });
}

export function filterError(e: FilterError) {
  return NextResponse.json({
    status: 'error',
    error: 'BadRequest',
    field: e.field,
    message: e.message,
    allowed: e.allowed,
    timestamp: new Date().toISOString()
  }, { status: 400 });
}

export function notFound(message: string) {
  return NextResponse.json({
    status: 'error', error: 'NotFound', message, timestamp: new Date().toISOString()
  }, { status: 404 });
}
