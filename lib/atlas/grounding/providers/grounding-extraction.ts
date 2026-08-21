/**
 * Grounded-segment extraction (ATL-06B, ADR-055).
 *
 * This module answers one question: which sentences the model produced are actually *evidence*, and
 * which are recall.
 *
 * A language model grounded with search returns one continuous passage. Some of it is supported by
 * retrieved pages; the rest is the model writing plausible connective prose from training data. Both
 * arrive in the same string, in the same register, and the second kind is the more fluent of the two.
 * Presenting the passage and attaching the source list underneath — which is what most integrations
 * do — publishes model recall as sourced market evidence.
 *
 * So the rule here is absolute: **a segment becomes a claim only if a `groundingSupport` covers it
 * and names at least one grounding chunk.** Everything else is discarded and counted, and the count
 * is shown to the reader. Nothing is downgraded, hedged or kept "for context".
 *
 * Two correctness details that are easy to get wrong and expensive to get wrong:
 *
 *   - `startIndex`/`endIndex` are **byte** offsets. Slicing the response as a JS string misaligns
 *     every segment after the first non-ASCII character, and a single curly apostrophe in a quoted
 *     headline is enough to do it. Extraction slices a `Buffer`.
 *   - A support may name several chunks. The claim is emitted once per DISTINCT source, because a
 *     reader judging currency and publisher needs one row per source, and because ATL-06A admits or
 *     rejects a source, not a sentence.
 */

import type {
  GeminiCandidate, GeminiGroundingMetadata
} from './gemini-grounding-types';

export interface GroundedSegment {
  /** The exact text the support covers. Never the whole passage, never a paraphrase. */
  text: string;
  /** Indices into `groundingChunks`, already filtered to entries that resolve to a web chunk. */
  chunkIndices: number[];
  confidence: number | null;
}

export interface ExtractionResult {
  segments: GroundedSegment[];
  /** Sentences the model produced that no support covered. Discarded, and counted. */
  discardedUngrounded: number;
  /** Present but unusable metadata — no chunks, or supports naming no chunk. */
  notices: string[];
}

/** Splits on sentence boundaries only to COUNT what was discarded; never to emit it. */
function sentenceCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/).filter(s => s.trim().length > 0).length;
}

export function extractGroundedSegments(candidate: GeminiCandidate | undefined): ExtractionResult {
  const notices: string[] = [];
  const parts = candidate?.content?.parts ?? [];
  const passage = parts.map(p => p.text ?? '').join('');
  const meta: GeminiGroundingMetadata | undefined = candidate?.groundingMetadata;

  if (!meta) {
    // The model answered from training data with no search behind it. That is not external
    // evidence, and the correct amount of it to show is none.
    return {
      segments: [],
      discardedUngrounded: sentenceCount(passage),
      notices: passage.trim()
        ? ['The provider returned an answer with no grounding metadata at all. Nothing was retrieved from the web, so nothing is shown as market evidence.']
        : ['The provider returned no content.']
    };
  }

  const chunks = meta.groundingChunks ?? [];
  const supports = meta.groundingSupports ?? [];

  if (chunks.length === 0) {
    return {
      segments: [],
      discardedUngrounded: sentenceCount(passage),
      notices: ['Grounding metadata was returned with no source chunks, so no claim can be traced to a page.']
    };
  }

  const buffer = Buffer.from(passage, 'utf8');
  const segments: GroundedSegment[] = [];
  let coveredBytes = 0;
  let supportsWithoutChunks = 0;

  for (const support of supports) {
    const indices = (support.groundingChunkIndices ?? [])
      .filter(i => Number.isInteger(i) && i >= 0 && i < chunks.length && Boolean(chunks[i]?.web?.uri));
    if (indices.length === 0) {
      supportsWithoutChunks++;
      continue;
    }

    // Prefer the echoed text; fall back to a BYTE slice, never a string slice.
    let text = (support.segment?.text ?? '').trim();
    if (!text) {
      const start = support.segment?.startIndex ?? 0;
      const end = support.segment?.endIndex ?? 0;
      if (end > start && end <= buffer.length) {
        text = buffer.subarray(start, end).toString('utf8').trim();
      }
    }
    if (!text) continue;

    const start = support.segment?.startIndex;
    const end = support.segment?.endIndex;
    if (typeof start === 'number' && typeof end === 'number' && end > start) {
      coveredBytes += end - start;
    } else {
      coveredBytes += Buffer.byteLength(text, 'utf8');
    }

    const scores = support.confidenceScores ?? [];
    segments.push({
      text,
      chunkIndices: indices,
      confidence: scores.length > 0 ? Math.max(...scores) : null
    });
  }

  if (supportsWithoutChunks > 0) {
    notices.push(`${supportsWithoutChunks} grounding support(s) named no usable source and were discarded.`);
  }

  // Estimate what the model wrote that nothing supported, by the share of the passage left uncovered.
  const totalBytes = buffer.length;
  const uncoveredShare = totalBytes > 0 ? Math.max(0, totalBytes - coveredBytes) / totalBytes : 0;
  const discardedUngrounded = Math.round(sentenceCount(passage) * uncoveredShare);
  if (discardedUngrounded > 0) {
    notices.push(`${discardedUngrounded} model sentence(s) carried no grounding support and were discarded rather than shown as evidence.`);
  }

  return { segments, discardedUngrounded, notices };
}
