<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project governance

Two workstreams run in parallel. Identify which one your task belongs to before changing anything.

| Workstream | Identifiers | Governing document |
|------------|-------------|--------------------|
| Decision Intelligence delivery roadmap | `Phase 1` … `Phase 15` | [`PLAN.md`](PLAN.md) |
| CogniX Capability Atlas | `CAT-01` … `CAT-07` | [`COGNIX_CAPABILITY_ATLAS.md`](COGNIX_CAPABILITY_ATLAS.md) |

Rules that apply to both:

- **Never renumber, reorder, close or reinterpret work packages in the other workstream** as a side
  effect of your task. Neither supersedes the other (`PLAN.md` §11.1).
- Do not mark work complete without the completion evidence its work package requires.
- Architecture decisions are appended to [`ARCHITECTURE_DECISIONS.md`](ARCHITECTURE_DECISIONS.md);
  historical ADRs are never rewritten, only superseded.

**For Capability Atlas work:** read `COGNIX_CAPABILITY_ATLAS.md` §0 (status board) and §14
(*How to Resume Capability Atlas Work*) first. Execute only the requested `CAT` work package, respect
its *Implementation allowed* field, and update the status board with factual results.
