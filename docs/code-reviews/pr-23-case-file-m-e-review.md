# PR 23 — Case-File Redesign, Milestone E (Slice 10, feature-page template) — Aggregate Code Review

**PR:** [#23](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/23) — Case-File redesign, Milestone E (feature-page template + variants)
**Commit reviewed (pushed):** `e239a5a` — `components/feature/*` (bold-text, tip-card, feature-row, prev-next, beta-strip), `components/feature-page.tsx` (273-line rewrite), route pages, `featureHeadline`, deletes `feature-grid`.
**Source of truth:** pushed blobs via `git show e239a5a:<path>` — **critical here**: the working tree carries uncommitted fixes, so by-SHA review is what surfaced the blocker.
**Reviewers:** `typescript-reviewer`, `pr-test-analyzer`, `type-design-analyzer` (parallel) + orchestrator (copy fidelity, BoldText edges, fs check, index reuse).
**Date:** 2026-07-07

---

## Verdict

**REVISE (block-level).**

The **production logic is sound** — all three lanes independently confirmed the variant dispatch (traced over all 10 features), `BoldText` parser, build-time `existsSync`, `featureHeadline`, and prev/next numbering; copy fidelity is verbatim. But the reviewed commit is **objectively broken as committed**: it fails `tsc --noEmit`, would fail `next build`, and fails 3 of its 8 `feature-page` vitest tests — because the test rewrite for the 273-line component rewrite was **left uncommitted in the working tree**. The reported "708/708 · tsc · build" pre-flight reflects the *dirty tree*, not `e239a5a`. This is a trivially-fixable commit-hygiene gap (`git add` the already-written test) but it blocks the milestone, and it points at a process fix (run gates on the committed SHA, not the working tree).

---

## Reviewer verdicts at a glance

| Lane | CRITICAL | HIGH | MEDIUM | LOW | Verdict |
|---|---|---|---|---|---|
| pr-test-analyzer | 1 | 0 | 0 | 1 | BLOCK |
| typescript-reviewer | 0 | 1 | 1 | 0 | REVISE |
| type-design-analyzer | 0 | 1 | 1 | 1 | REVISE |
| orchestrator (fidelity/parser/fs/index) | 0 | 0 | 0 | 1 | — (corroborated C1) |
| **Total (adjudicated, deduped)** | **1** | **0** | **3** | **3** | **REVISE** |

> **Adjudication:** pr-test's CRITICAL (fails vitest) and typescript's HIGH (fails tsc/build) are the **same broken-commit finding** from two faces → merged into one **CRITICAL (C1)**. type-design's HIGH (draft×media-less) I **downgrade to MEDIUM** (forward-looking — no current feature constructs it; typescript traced current data clean) while flagging its content-integrity angle.

---

## Pre-flight (independently re-verified at `e239a5a` — the stated gates do NOT hold)

| Gate | Author claim | Verified at `e239a5a` |
|---|---|---|
| `tsc --noEmit` | clean | **FAILS** — 8× `TS2741` (`components/__tests__/feature-page.test.tsx` missing required `index`); `tsconfig` `include` doesn't exclude tests, `next.config.js` has no `ignoreBuildErrors` → `next build` fails too |
| `pnpm test` | 708/708 | **feature-page suite: 3/8 fail** in isolation (see C1); 708 is real only with the *uncommitted* test applied |
| Root cause | — | Gates were run on the **dirty working tree** (which contains the uncommitted `feature-page.test.tsx` rewrite, `+101/-52`), not the committed SHA |

---

## Findings (deduped, ranked)

### CRITICAL

**C1 — `e239a5a` ships a broken commit: the rewritten component's test is uncommitted, so the commit fails tsc, build, and 3 vitest tests.** *(pr-test-analyzer CRITICAL + typescript-reviewer HIGH, merged; orchestrator-CONFIRMED)*
The commit rewrites `feature-page.tsx` (273 lines: breadcrumb, `featureHeadline` H1, trust-cards, draft banner, under-the-hood, prev/next) and makes `FeaturePageProps.index` **required**, but `components/__tests__/feature-page.test.tsx` is **unchanged in the commit** — it's the pre-rewrite fixture. Three independent confirmations:
- **Compile (typescript):** `tsc --noEmit` → 8× `TS2741` (`<FeaturePage feature={…} />` missing `index`); `next build`'s type-check fails identically.
- **Runtime (pr-test):** ran the committed test against the committed component in an isolated worktree → **3/8 fail** — H1 asserts bare `feature.title` but the component renders `featureHeadline()` = `"…defend."` (trailing period); `row.heading` used as both phone-frame `label` and `<h2>` → `getByText` "found multiple elements"; DRAFT-badge fixture omits `draftNote`, which the new banner requires.
- **Source (orchestrator):** `git show e239a5a:components/__tests__/feature-page.test.tsx` → line 36 asserts `name: feature.title`, line 76 spreads `draft:true` with no `draftNote`, no `index` prop. `git status` → ` M components/__tests__/feature-page.test.tsx` (+101/-52) sits **uncommitted**.
The corrected test already exists in the working tree and is well-targeted (covers breadcrumb/chip, `featureHeadline` H1, BoldText intro, tip card, phone rows, media-less callout, trust-cards, under-the-hood + map omission, draft state, prev/next edges + DRAFT chip, beta strip) — it passes at HEAD. **Nothing needs to be written; it needs to be committed into history.**
*Fix:* `git add components/__tests__/feature-page.test.tsx` into `e239a5a` (or a fix commit). **Process fix (root cause):** run pre-flight gates on a clean checkout/worktree of the committed SHA, not the dirty working tree — otherwise local gates stay green while pushed commits are red. (This is exactly why three reviewers, all reviewing the pushed SHA, caught it.)

### MEDIUM

**M1 — draft × media-less row silently skips the hatch treatment.** *(type-design HIGH → MEDIUM; orchestrator-CONFIRMED)* `FeatureRowView` (`feature-row.tsx:44-66`) renders the media-less callout branch **without** checking the `draft` prop — the `draft ?` hatch is only in the media branch (`:83`). `Feature.draft` is documented to render bodies as hatched scaffolding *and* is exempt from the "no placeholder copy" content guard **because** the hatch flags scaffolding — so a media-less row on the (actively-being-written) `notes` draft would ship `"HEADING + STORY LAND HERE"` as polished, unflagged copy no guard catches. Forward-looking (notes rows all carry media today), but a realistic near-term content edit. *Fix:* `if (!row.media) return draft ? <hatched callout> : <callout>`, or fold `draft` into the row dispatch.

**M2 — `layout:'trust-cards'` + `tip` is constructible and not mutually exclusive.** *(type-design MEDIUM; orchestrator-CONFIRMED)* `feature-page.tsx:191` renders `{feature.tip ? <TipCard> : null}` **unconditionally** — never gated on `!centered`. A future trust-cards feature with a `tip` would stack a broken tip card under the centered header. The data-layer test hardcodes `on-device.tip === undefined` (specific slug), not the general `layout==='trust-cards'` condition. *Fix:* `{!centered && feature.tip ? … }`, or model `tip`/`layout` mutually exclusive.

**M3 — `betaStripLine`-on-draft is enforced only by catalog convention + test, not by type or component.** *(typescript-reviewer MEDIUM; orchestrator-CONFIRMED)* `feature-page.tsx:218` gates `BetaStrip` on `feature.betaStripLine` truthiness, not `!feature.draft`. A future draft with a `betaStripLine` set would render the gold "Join the TestFlight beta" CTA directly under hatched placeholder copy. Caught by the `lib/content` invariant test today. *Fix:* `!feature.draft && feature.betaStripLine`, or a discriminated `Feature` on `draft`.

*(M1–M3 are one theme: `FeatureRow`/`Feature` are flat optional-field shapes dispatched by truthiness chains, so orthogonal axes — draft × media, layout × tip, draft × betaStripLine — can reach type-permitted-but-unhandled combinations. All are data-layer-test-guarded today; none is a live bug.)*

### LOW

- **L1** — `BoldText` has no test for malformed markers (unmatched `**`, empty `****`). Parser degrades to literal text safely (verified), so low risk; optional pin. *(pr-test)*
- **L2** — `accent` / `recLabel` on the shared `FeatureRow` shape are variant-specific but unconstrained; content-test-guarded. *(type-design)*
- **L3** — `prev-next.tsx:56` hardcodes "That's all ten" while the manifest header uses dynamic `features.length`; stale if the catalog grows. *(orchestrator)*

---

## Verified clean (positive confirmations)

- **Variant dispatch — sound (all lanes, all 10 features traced).** Phone rows / `cases-locations` row-3 wide callout / `on-device` trust-cards / `notes` draft hatch / `map` absent-diagram — every combination guarded (`feature.diagram ?`, `layout==='trust-cards'`, `row.media`, `feature.tip ?`); no silent fallthrough on current data. `CLASS_CHIP: Record<FeatureClass,…>` compiler-exhaustive.
- **BoldText** — `split(/\*\*([^*]+)\*\*/g)`, odd-index `<strong>`; unmatched/empty/adjacent markers degrade to literal text (no crash, no empty strong). The shared parser honors the M-A/M2 deferral; used by both intro and tip.
- **fs `existsSync` in `UnderTheHood`** — sound: `diagram.src` is trusted catalog data, `generateStaticParams` covers every slug, no `ignoreBuildErrors` → build-time/SSG only, no traversal, no per-request cost. Pending state has `role="img"` + aria-label.
- **`featureHeadline()`** — total function, `headline ?? \`${title}.\``, honors the M-A/L2 deferral; tests pin both branches.
- **prev/next numbering** — `index` (prev) / `index+2` (next) off-by-one-correct at both edges; DraftChip on draft neighbors; `<nav aria-label>`.
- **Copy fidelity** — page-chrome labels (UNDER THE HOOD, MANIFEST, START/END OF MANIFEST, FIG.) match the canvas; feature content copy re-confirmed through the new rendering.
- **`/features` index reuse** — reuses `EvidenceManifest` with an `sr-only` H1; `#features` on both `/` and `/features` is fine (per-document ids).
- **`feature-grid` deletion** — component + last consumer gone; deleting its test alongside is correct.

---

## Security note (resolved — false alarm)

Two reviewer agents (M-C typescript, M-E pr-test) reported an "MCP Server Instructions" block appearing after `git show`/`git log` output. **Resolved as a harness context artifact, not a repo payload:** commit messages in range have 0 such hits; the main-loop orchestrator has run `git show`/`git log` all session and never seen it; the author's `git grep` and my bounded repo search (incl. `.claude/`, `docs/`) both returned zero. It's the harness's own MCP-instructions context surfacing in *subagent* transcripts; both agents correctly ignored it (prompt-defense working). No scrub needed.

---

## Recommended fix (single commit)

1. **C1 (blocker)** — commit the working-tree `components/__tests__/feature-page.test.tsx` into history; re-run `tsc`/`vitest`/`build` on a **clean checkout of the resulting SHA** to confirm green.
2. **M1–M3 (optional, fold in)** — add the `draft`/`!centered`/`!draft` render guards (or discriminate the types) to make the three invariants structural rather than convention-only.

Then push and send `type: fixes-done` with the single fix SHA.

---

## Pipeline notes

- **Three lanes converged on the same broken-commit issue from three angles** — runtime (vitest), compile (tsc), and source (blob diff). The commit-hygiene gap (uncommitted test) is the highest-impact finding of the review, and it was only visible because every lane reviews the **pushed SHA**, not the dirty tree.
- **Process root cause worth fixing once:** the author's pre-flight gates are being run on the dirty working tree, so "green locally" ≠ "green at the committed SHA." A clean-checkout gate run before each `fixes-done`/`review-request` would prevent this recurring.
- **The type-family MEDIUMs (M1–M3)** are the same flat-optional-fields theme first seen at M-A (layout/accent). Worth a small structural pass (discriminate `Feature` on `draft`/`layout`) if the team wants these invariants type-enforced instead of test-enforced.
