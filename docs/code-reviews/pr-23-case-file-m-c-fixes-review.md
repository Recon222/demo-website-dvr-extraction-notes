# PR 23 — Case-File M-C — Fix-Delta Review (Round 1 fixes)

**Fix commit (single SHA):** `db73b9b` (test + doc comment) — reviewed via `git show db73b9b`.
**Prior review:** `docs/code-reviews/pr-23-case-file-m-c-review.md`
**Date:** 2026-07-07

## Verdict
**clean — milestone approved. M-C is closed.** Both findings verified closed; no new findings.

## Fix → finding
- **HIGH CLOSED** — the bundle-isolation guard regex is now `/(from\s+|import\(\s*|require\(\s*)['"][^'"]*features\/demo/`, covering static `from '…'`, dynamic `import('…')` (the in-repo idiom at `app/demo/page.tsx:7`), and `require('…')`. Author mutation-verified (an appended `import('@/features/demo')` goes RED). The realistic bypass is closed.
- **MEDIUM CLOSED** — the `phone-frame.tsx` docstring is corrected to the ceil'd `316×634` (hero) / `251×504` (rows), no longer the stale round()-era `315×633`; and the sizing test now pins **both** shipped scales. Each `render()` returns its own `container`, so the 0.62 (251×504) and 0.78 (316×634) assertions don't cross-contaminate — correct.

## Gates
Test + doc-comment only; author reports full suite green, tsc clean at `db73b9b`.

## Security follow-up (⚠️ from the M-C review)
My bounded search over the repo (including `.claude/` and `docs/`, excluding `node_modules`/`.git`/`.next`) returned **zero** injection-signature hits — matching the author's own `git grep` over tracked content. No evidence of a planted prompt-injection payload in the repo. Most likely the reviewer agent conservatively flagged a legitimate harness/MCP context block (its prompt-defense is deliberately strict). **No repo scrub appears needed**; recommend the human stay aware but treat as resolved unless it recurs.

## New findings
None.
