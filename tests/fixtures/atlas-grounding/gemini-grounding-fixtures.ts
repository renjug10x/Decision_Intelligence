/**
 * Recorded-shape Gemini grounding fixtures — the ATL-06B evaluation set.
 *
 * These are not a market corpus. `ATL-06C` owns market content; this is the smallest set of
 * responses that exercises every path a real provider can put the admission gate down, plus the
 * cases where the gate must NOT fire. Each fixture is shaped exactly like a
 * `models/*:generateContent` response with `tools: [{ googleSearch: {} }]`, including the two details
 * that break naive integrations: the `vertexaisearch.cloud.google.com/grounding-api-redirect/...`
 * URI that hides the real publisher, and byte-measured segment offsets.
 *
 * `PAGES` is what the redirect resolves to. Publisher, title and publication date are read from that
 * HTML and from nowhere else, which is why several pages here deliberately omit a date: an
 * undated page is a real and common case, and the correct handling is refusal.
 */

import type { GeminiGenerateContentResponse } from '../../../lib/atlas/grounding/providers/gemini-grounding-types';
import type { SourceFetchResponse } from '../../../lib/atlas/grounding/providers/source-resolution';

export const NOW = new Date('2026-08-21T00:00:00Z');

export function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * 86_400_000).toISOString().slice(0, 10);
}

const redirect = (id: string) =>
  `https://vertexaisearch.cloud.google.com/grounding-api-redirect/${id}`;

function page(finalUrl: string, opts: { title?: string; site?: string; published?: string | null; status?: number } = {}): SourceFetchResponse {
  const head = [
    opts.site ? `<meta property="og:site_name" content="${opts.site}">` : '',
    opts.title ? `<meta property="og:title" content="${opts.title}">` : '',
    opts.published ? `<meta property="article:published_time" content="${opts.published}T09:00:00Z">` : ''
  ].filter(Boolean).join('\n');
  return {
    finalUrl,
    status: opts.status ?? 200,
    html: `<!doctype html><html><head>${head}<title>${opts.title ?? 'Untitled'}</title></head><body><p>Body copy.</p></body></html>`
  };
}

/** Redirect id → the page it actually resolves to. */
export const PAGES: Record<string, SourceFetchResponse> = {
  'gartner-fresh': page('https://www.gartner.com/en/documents/promotion-monitoring-2026', {
    title: 'Promotion monitoring in tier-one grocery platforms', site: 'Gartner', published: daysAgo(60)
  }),
  'scdive-fresh': page('https://www.supplychaindive.com/news/promotion-capacity-planning/', {
    title: 'Grocers rethink promotional capacity planning', site: 'Supply Chain Dive', published: daysAgo(30)
  }),
  'gartner-stale': page('https://www.gartner.com/en/documents/forecasting-2024', {
    title: 'Forecasting practice in grocery', site: 'Gartner', published: daysAgo(500)
  }),
  'idc-undated': page('https://www.idc.com/getdoc.jsp?containerId=undated', {
    title: 'Decision latency in retail operations', site: 'IDC', published: null
  }),
  'vendor-marketing': page('https://blueyonder.com/solutions/promotion-management', {
    title: 'Promotion management that just works', site: 'Blue Yonder', published: daysAgo(20)
  }),
  'blog-agreeable': page('https://mediumish.example.com/posts/synthetic-data-is-fine', {
    title: 'Why synthetic supply data is fine for prototypes', site: 'Someone’s Blog', published: daysAgo(10)
  }),
  'gartner-dupe': page('https://www.gartner.com/en/documents/promotion-monitoring-2026', {
    title: 'Promotion monitoring in tier-one grocery platforms', site: 'Gartner', published: daysAgo(60)
  }),
  'dead-link': { finalUrl: 'https://www.forrester.com/gone', html: '', status: 404 }
};

export const SOURCE_FETCHER = async (uri: string): Promise<SourceFetchResponse> => {
  const id = uri.split('/').pop() ?? '';
  const found = PAGES[id];
  if (!found) throw new Error(`unresolvable redirect: ${id}`);
  return found;
};

interface SegmentSpec { text: string; chunks: number[]; confidence?: number }

function response(passage: string, chunkIds: string[], segments: SegmentSpec[], opts: {
  queries?: string[]; entryPoint?: string; omitMetadata?: boolean; omitChunks?: boolean;
  useByteOffsets?: boolean;
} = {}): GeminiGenerateContentResponse {
  const candidate: GeminiGenerateContentResponse['candidates'] = [{
    content: { role: 'model', parts: [{ text: passage }] },
    finishReason: 'STOP'
  }];
  if (!opts.omitMetadata) {
    const buffer = Buffer.from(passage, 'utf8');
    candidate[0].groundingMetadata = {
      groundingChunks: opts.omitChunks ? [] : chunkIds.map(id => ({
        web: { uri: redirect(id), title: PAGES[id]?.finalUrl ?? id }
      })),
      groundingSupports: segments.map(s => {
        const start = buffer.indexOf(Buffer.from(s.text, 'utf8'));
        const end = start >= 0 ? start + Buffer.byteLength(s.text, 'utf8') : 0;
        return {
          // `useByteOffsets` omits the echoed text, forcing extraction to slice bytes — which is the
          // path that silently corrupts non-ASCII passages if it is done as a string slice.
          segment: opts.useByteOffsets
            ? { startIndex: start, endIndex: end, partIndex: 0 }
            : { startIndex: start, endIndex: end, partIndex: 0, text: s.text },
          groundingChunkIndices: s.chunks,
          confidenceScores: s.chunks.map(() => s.confidence ?? 0.9)
        };
      }),
      webSearchQueries: opts.queries ?? ['grocery promotion monitoring market'],
      searchEntryPoint: opts.entryPoint ? { renderedContent: opts.entryPoint } : undefined
    };
  }
  return { candidates: candidate };
}

const UNGROUNDED_TAIL =
  ' Overall, most enterprises are moving in this direction and the benefits are widely accepted.';

export const FIXTURES = {
  /** Two admissible sources, plus a fluent ungrounded sentence that must be discarded. */
  admissible: response(
    'Grocery retailers increasingly evaluate promotional plans against fulfilment capacity before launch. Trade coverage reports capacity-aware promotion planning moving from pilot to standard practice in large grocers.' + UNGROUNDED_TAIL,
    ['gartner-fresh', 'scdive-fresh'],
    [
      { text: 'Grocery retailers increasingly evaluate promotional plans against fulfilment capacity before launch.', chunks: [0] },
      { text: 'Trade coverage reports capacity-aware promotion planning moving from pilot to standard practice in large grocers.', chunks: [1] }
    ],
    { queries: ['grocery promotion capacity planning 2026', 'promotion monitoring analyst'], entryPoint: '<style>.gs{color:#000}</style><div class="gs">Search suggestions</div>' }
  ),

  /** Credible, admissible, and it disagrees with a governed record. */
  contradictory: response(
    'Real-time promotion monitoring against live supplier feeds is expected of production-grade retail planning platforms.',
    ['gartner-fresh'],
    [{ text: 'Real-time promotion monitoring against live supplier feeds is expected of production-grade retail planning platforms.', chunks: [0] }]
  ),

  /** Agrees with the CogniX position, and is still inadmissible. Comfort is not provenance. */
  agreeableButInadmissible: response(
    'Synthetic supply data is perfectly adequate for enterprise prototypes and demonstrations.',
    ['blog-agreeable'],
    [{ text: 'Synthetic supply data is perfectly adequate for enterprise prototypes and demonstrations.', chunks: [0] }]
  ),

  stale: response(
    'Forecast accuracy in grocery has historically plateaued below planner expectations.',
    ['gartner-stale'],
    [{ text: 'Forecast accuracy in grocery has historically plateaued below planner expectations.', chunks: [0] }]
  ),

  undated: response(
    'Decision latency remains the dominant constraint in retail operating cadence.',
    ['idc-undated'],
    [{ text: 'Decision latency remains the dominant constraint in retail operating cadence.', chunks: [0] }]
  ),

  vendorMarketing: response(
    'Promotion management platforms deliver measurable uplift out of the box.',
    ['vendor-marketing'],
    [{ text: 'Promotion management platforms deliver measurable uplift out of the box.', chunks: [0] }]
  ),

  /** The provider volunteering a statement about this estate, from an impeccable source. */
  assertsCogniXFact: response(
    'CogniX provides fully implemented real-time promotion monitoring against live client supplier feeds.',
    ['gartner-fresh'],
    [{ text: 'CogniX provides fully implemented real-time promotion monitoring against live client supplier feeds.', chunks: [0] }]
  ),

  /** The same page reached twice, and one sentence citing both copies. */
  duplicateSources: response(
    'Capacity-aware promotion planning is becoming standard practice in large grocers.',
    ['gartner-fresh', 'gartner-dupe'],
    [{ text: 'Capacity-aware promotion planning is becoming standard practice in large grocers.', chunks: [0, 1] }]
  ),

  /** Fluent, confident, entirely from model memory. Nothing may survive this. */
  noGroundingMetadata: response(
    'The market has broadly converged on real-time promotional monitoring. Most tier-one grocers now run continuous capacity checks. This is considered table stakes.',
    [],
    [],
    { omitMetadata: true }
  ),

  /** Metadata present, sources absent. */
  metadataWithoutChunks: response(
    'Grocery promotion planning is changing.',
    [],
    [],
    { omitChunks: true }
  ),

  /** A support that names no chunk grounds nothing, however confident it looks. */
  supportWithoutChunks: response(
    'Retailers are investing in promotional analytics.',
    ['gartner-fresh'],
    [{ text: 'Retailers are investing in promotional analytics.', chunks: [] }]
  ),

  /** Non-ASCII before the segment, and no echoed text — byte offsets or corruption. */
  byteOffsets: response(
    'Analysts — including Gartner’s retail team — report a shift. Capacity-aware promotion planning is now assessed before launch in most tier-one grocers.',
    ['gartner-fresh'],
    [{ text: 'Capacity-aware promotion planning is now assessed before launch in most tier-one grocers.', chunks: [0] }],
    { useByteOffsets: true }
  ),

  /** The redirect resolves to a dead page. */
  deadSource: response(
    'Forrester reports a shift in promotional planning cadence.',
    ['dead-link'],
    [{ text: 'Forrester reports a shift in promotional planning cadence.', chunks: [0] }]
  ),

  /**
   * One realistic response in which most of what came back does not survive: a good source, an
   * expired one, an undated one, a vendor's own page, a statement about this estate, and a fluent
   * unsourced tail. This is what a live search actually looks like.
   */
  mixed: response(
    'Grocery retailers increasingly evaluate promotional plans against fulfilment capacity before launch. Forecast accuracy in grocery has historically plateaued below planner expectations. Decision latency remains the dominant constraint in retail operating cadence. Promotion management platforms deliver measurable uplift out of the box. CogniX provides fully implemented real-time promotion monitoring against live client supplier feeds.' + UNGROUNDED_TAIL,
    ['gartner-fresh', 'gartner-stale', 'idc-undated', 'vendor-marketing', 'scdive-fresh'],
    [
      { text: 'Grocery retailers increasingly evaluate promotional plans against fulfilment capacity before launch.', chunks: [0] },
      { text: 'Forecast accuracy in grocery has historically plateaued below planner expectations.', chunks: [1] },
      { text: 'Decision latency remains the dominant constraint in retail operating cadence.', chunks: [2] },
      { text: 'Promotion management platforms deliver measurable uplift out of the box.', chunks: [3] },
      { text: 'CogniX provides fully implemented real-time promotion monitoring against live client supplier feeds.', chunks: [4] }
    ],
    { queries: ['grocery promotion capacity planning 2026', 'retail decision latency analyst'], entryPoint: '<style>.gsc{font:12px system-ui}</style><div class="gsc">Google Search Suggestions</div>' }
  ),

  /** The redirect cannot be resolved at all. */
  unresolvableSource: response(
    'An unnamed source reports a shift in planning cadence.',
    ['no-such-page'],
    [{ text: 'An unnamed source reports a shift in planning cadence.', chunks: [0] }]
  )
} satisfies Record<string, GeminiGenerateContentResponse>;
