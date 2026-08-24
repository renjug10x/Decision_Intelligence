/**
 * The Gemini `generateContent` grounding response, transcribed from the current official contract
 * (ATL-06B).
 *
 * These types are written by hand rather than imported, and that is a deliberate finding rather than
 * a preference. The estate has `@google/generative-ai@0.24.1` installed, and **its published types
 * are wrong for grounding**:
 *
 *   - `GroundingSupport.segment` is declared `string`; it is an object carrying byte offsets.
 *   - the chunk-index field is spelled `groundingChunckIndices`; the wire field is
 *     `groundingChunkIndices`.
 *   - `GroundingChunkWeb` has no `domain`.
 *   - the tool is `googleSearchRetrieval`, the legacy Gemini 1.5 form; current models take
 *     `googleSearch`.
 *
 * Extracting evidence through those types would silently drop every grounding support, which is the
 * one thing this phase exists to read. ATL-06B therefore calls the REST API directly — no new
 * dependency, and the wire contract is stated here where it can be reviewed against the source.
 *
 * Two properties of the real contract drive the whole extraction design:
 *
 *   1. `Segment.startIndex` / `endIndex` are **byte** offsets, not character offsets. Slicing the
 *      response text as a JavaScript string corrupts every segment containing a non-ASCII character
 *      — a curly apostrophe is enough — so extraction slices a byte buffer.
 *   2. `GroundingChunkWeb.domain` is **not populated by the Gemini Developer API** (it is a Vertex
 *      AI field). The publisher host therefore cannot be read from the payload and must be resolved
 *      from the redirect `uri`, which is what `source-resolution.ts` does.
 */

/**
 * A span of the response passage, measured in BYTES.
 *
 * `startIndex` is **optional and is omitted when it is zero** — observed live on Gemini 3.6, where the
 * first support of a twenty-support response carried `{ endIndex, text }` and every subsequent one
 * carried both indices. This is not a defect in the response and not a special case to tolerate: it
 * is protobuf default-value elision, so a zero start is simply absent from the JSON. Treating an
 * absent `startIndex` as anything other than `0` discards the opening segment of every grounded
 * answer — which is usually the strongest claim in it.
 *
 * `endIndex` is **required**. A span with no end is not a span, and a support carrying one is
 * malformed rather than partial; extraction drops it rather than guessing where it stops.
 */
export interface GeminiSegment {
  /** Byte offset, inclusive. Absent means 0 — the field is elided at its default value. */
  startIndex?: number;
  /** Byte offset, exclusive. Required: a segment without it cannot be reconstructed. */
  endIndex: number;
  partIndex?: number;
  /** The segment text, where the API echoes it. Reconstruction is checked against this. */
  text?: string;
}

export interface GeminiGroundingSupport {
  segment?: GeminiSegment;
  /** Indices into `groundingChunks`. A support with none of these grounds nothing. */
  groundingChunkIndices?: number[];
  confidenceScores?: number[];
}

export interface GeminiGroundingChunkWeb {
  /** A `vertexaisearch.cloud.google.com/grounding-api-redirect/...` URL, not the publisher's. */
  uri?: string;
  title?: string;
  /** Vertex AI only. Absent on the Gemini Developer API. */
  domain?: string;
}

export interface GeminiGroundingChunk {
  web?: GeminiGroundingChunkWeb;
}

export interface GeminiSearchEntryPoint {
  /** Google Search Suggestions markup. Displaying it is a condition of use (ADR-055). */
  renderedContent?: string;
  sdkBlob?: string;
}

export interface GeminiGroundingMetadata {
  groundingChunks?: GeminiGroundingChunk[];
  groundingSupports?: GeminiGroundingSupport[];
  webSearchQueries?: string[];
  searchEntryPoint?: GeminiSearchEntryPoint;
}

export interface GeminiPart { text?: string }

export interface GeminiCandidate {
  content?: { parts?: GeminiPart[]; role?: string };
  groundingMetadata?: GeminiGroundingMetadata;
  finishReason?: string;
}

export interface GeminiGenerateContentResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; message?: string; status?: string };
}

/** Request shape. `tools: [{ googleSearch: {} }]` is the current form for Gemini 2.x models. */
export interface GeminiGenerateContentRequest {
  contents: { role: 'user'; parts: { text: string }[] }[];
  tools: { googleSearch: Record<string, never> }[];
  generationConfig?: { temperature?: number; maxOutputTokens?: number };
}
