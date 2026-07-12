# PR 23 — Case-File Redesign, Milestone A (Slices 1+2) — Aggregate Code Review

**PR:** [#23](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/23) — Case-File marketing redesign, Milestone A (design foundation)
**Range reviewed (pushed):** `d1e967c` (master) → `2ad869b` — 4 commits (2 docs = reviewer context, 2 `feat` = code under review)
**Source of truth:** the working tree was **dirty/ahead** (Slice 3, `e56053b`, further touches `app/layout.tsx`). All review was done against the **pushed blobs** via `git show 2ad869b:<path>` / `git diff d1e967c 2ad869b` — never the working tree.
**Reviewers:** `typescript-reviewer`, `type-design-analyzer`, `pr-test-analyzer` (parallel fan-out) + orchestrator lane (copy fidelity, tokens, fonts/metadata, docs accuracy, architectural invariants).
**Out of scope (by design):** `/demo`, `features/demo/**` (untouched), and the 3 planning docs under `docs/features/case-file-redesign/`.
**Date:** 2026-07-07

---

## Verdict

**APPROVE — clean, milestone approved.**

0 CRITICAL, 0 HIGH across all lanes. The 2 MEDIUM + 3 LOW findings are either forward-looking design gaps that first bite in the *next* (renderer) slice — this milestone is content/design-foundation only, no renderer consumes the new fields yet — or a trivial 2-line docs correction. None blocks Milestone A. Copy fidelity against the design canvas is effectively verbatim, design tokens match the canvas exactly, font/metadata wiring is correct, and the marketing↔demo bundle boundary holds.

---

## Reviewer verdicts at a glance

| Lane | CRITICAL | HIGH | MEDIUM | LOW | Verdict |
|---|---|---|---|---|---|
| typescript-reviewer | 0 | 0 | 0 | 0 | APPROVE |
| pr-test-analyzer | 0 | 0 | 0 | 0 | APPROVE |
| type-design-analyzer | 0 | 0 | 2 | 2 | APPROVE w/ comments |
| orchestrator (copy/token/font/docs/invariants) | 0 | 0 | 0 | 1 | APPROVE w/ comments |
| **Total (deduped)** | **0** | **0** | **2** | **3** | **clean — milestone approved** |

---

## Pre-flight (re-verified, not trusted)

| Gate | Result |
|---|---|
| `pnpm exec tsc --noEmit` | Clean — re-run by typescript-reviewer in an isolated detached worktree at `2ad869b` (not the dirty tree) |
| `pnpm exec vitest run` | **660/660** — re-run independently at the reviewed SHA; includes the 5 token + 9 content guards |
| `next lint` | No ESLint config committed at this SHA (pre-existing project state) — skipped, not introduced by this PR |
| `pnpm build` | Not re-run; project-wide tsc-clean across every `Feature` consumer is sufficient signal for a content/type-only diff |

---

## Findings (deduped, ranked by severity)

### CRITICAL
None.

### HIGH
None.

### MEDIUM

**M1 — `layout: 'trust-cards'` ↔ row `accent` coupling is not type-enforced, and the test only half-covers it.** *(type-design; orchestrator-CONFIRMED; forward-looking)*
`accent` lives on the shared `FeatureRow` (`lib/content/types.ts:36`) and `layout` on `Feature` (`:82`) — nothing ties them together, so a non-`trust-cards` feature could carry a stray `row.accent` and compile clean. The one guard, `lib/content/__tests__/features.test.ts:165-174`, asserts `f.layout` is `undefined` for non-`on-device` features (`:171`) but **never asserts those rows lack `accent`** — I confirmed this reading the test directly. No live bug (no renderer reads `layout`/`accent` yet), but once the renderer branches on `feature.layout` while independently reading `row.accent`, a stray accent would mis-style or be silently dropped, and neither tsc nor CI would catch it.
*Fix (cheap):* extend the `else` branch to also assert `f.rows.every(r => r.accent === undefined)`; or discriminate `accent` under `layout`.

**M2 — `**bold**` is untyped inline markup with no shared parser, already present in shipped (non-draft) copy.** *(type-design; forward-looking)*
`intro` and `tip.body` are plain `string`; the `**bold**` convention is documented (`types.ts:14`, `:70-71`) but there is no parser/renderer anywhere in `lib/`/`components/`. Real non-draft copy already uses it (e.g. `features.ts:32`, `:36`). The existing renderer (`components/feature-page.tsx`) renders sibling string fields naively (`{feature.painLine}`), so the moment `intro`/`tip.body` are wired in the same way, literal `**…**` asterisks ship to users, with no compile-time signal.
*Fix:* ship one small shared bold-span parser alongside the first component that consumes `intro`/`tip.body` — not a markdown library.

### LOW

**L1 — `classLabel?` is optional but de-facto mandatory.** *(type-design)* All 9 catalog entries set it and `features.test.ts:118-122` fails if any omits it. The `?` forces future consumers to handle a "no class" state that can't occur. *Fix:* drop the `?` (`classLabel: FeatureClass`) — all current literals already satisfy it.

**L2 — `headline` fallback (`${title}.`) is a comment-only contract with zero consumers today.** *(type-design)* No helper computes it; `feature-page.tsx:33` still hardcodes `feature.title`. When the renderer picks it up (likely page H1 **and** `generateMetadata`), each call site would hand-roll `feature.headline ?? \`${feature.title}.\``, inviting drift. *Fix:* add one exported `featureHeadline(f)` helper colocated with the data when the renderer lands.

**L3 — the `CLAUDE.md` rewrite carries 2 stale template claims.** *(orchestrator/docs; in this PR)* Verified against the tree at `2ad869b`:
- `CLAUDE.md:37` describes an `app/(auth)/` route group (sign in / up / reset) — **`app/(auth)` does not exist** (`app/` children: `(default)`, `api`, `css`, `demo`, `layout.tsx`).
- `CLAUDE.md:55` says custom hooks live in `utils/` (`useMasonry`, `useMousePosition`) — **there is no `utils/` directory** and neither hook exists anywhere in the tree.
Both are carryovers from the original Cruip template. Since CLAUDE.md is now the source of truth the review agents themselves load, these actively mislead. *Fix:* correct or remove both lines — trivial, no code risk, and it lives in this PR.

---

## Verified clean (positive confirmations)

- **Copy fidelity (focus #1):** spot-checked 15 distinctive strings spanning every category the request named — `painLine`, `headline`, `tip.body`, `kicker`, `chips`, `recLabel`, `betaStripLine`, trust-card headings — against the design canvas (`Homepage and feature redesign/design_handoff_case_file_site/DVR Site Directions.dc.html`). **All 15 verbatim.** The lone apparent miss, the `secure-export` headline `The whole case, sealed for handoff.`, is the canvas H1 rendered as `The whole case,<br>sealed for handoff.` — a correct transcription (the visual `<br>` is not baked into content data).
- **Draft/provisional handling:** `notes` (03) is `draft: true` with scaffolding copy (exempt from the placeholder guard); `reports` (08) is provisional but not draft, and the canvas's `COPY PROVISIONAL` review annotation correctly does **not** appear in the data. Correct.
- **Design tokens (focus #3):** all 8 sampled hex values (`#4ecdc4`, `#ffd93d`, `#2b8cc1`, `#99badd`, `#03060b`, `#f0f4f8`, `#7a9fc4`, `#1a2d44`) match the canvas exactly; the color namespace, 4 new keyframes, and the reduced-motion block are all present and pinned by `tokens.test.ts`.
- **Reduced-motion (focus #3):** the `@media (prefers-reduced-motion: reduce)` block matches class attributes only (`[class*='scanSweep']` + `.animate-scan-sweep`, …), so the demo's inline-styled, self-gated animations are unaffected — the stated reasoning holds, and even the worst case (matching a demo class) is benign under reduced motion.
- **Fonts/metadata (focus #4):** `Share_Tech_Mono` correctly pinned to `weight:"400"` (its only static weight); `JetBrains_Mono` variable font omits `weight`; all four font vars land on `<body>`; `metadata` swapped off the `"Create Next App"` template default to `siteConfig` — this also resolves a focus-#5 regression.
- **Architectural invariant:** no marketing code imports `@/features/demo` (`git grep` over `app`/`components`/`lib`, excluding `app/demo` → none). The CLAUDE.md bundle-boundary rule holds.
- **`FeatureNav` on every route is PRE-EXISTING** (present and rendered in the root layout at `d1e967c`; the import line is unchanged context in the diff) — **not introduced by this PR**, so not flagged here. The dirty working tree shows chrome-scoping is already being addressed in Slice 3 (`app/(default)/__tests__/chrome-scope.test.tsx`).
- **Query helpers** (`getAllFeatures`/`getFeatureBySlug`/`getAdjacentFeatures`): pure, correct — `null` for unknown slug distinct from `undefined` at edges, no wraparound.

---

## Notes for the next (renderer) slice

- Close **M1** with the one-line test assertion (or discriminate `accent` under `layout`).
- Land **M2**'s shared `**bold**` parser and **L2**'s `featureHeadline()` helper alongside the first component that reads `intro`/`tip`/`headline`, so the conventions aren't re-implemented per call site with room to diverge.

---

## Pipeline notes

- **Cross-lane nuance on M1 (not a conflict):** `type-design-analyzer` flagged the `layout`/`accent` invariant as half-closed (MEDIUM); `pr-test-analyzer`, tracing the same test, judged it "exercises what it claims" (no finding). Different lenses — *invariant completeness* vs *test-claims-match-behavior* — both defensible. The orchestrator read the test directly and confirmed the coverage gap is real, so M1 stands as CONFIRMED.
- **Both code lanes re-verified rather than trusted:** `typescript-reviewer` re-ran `tsc` + `vitest` (660/660) in an isolated detached worktree at `2ad869b`; `pr-test-analyzer` traced every guard against `git show` blobs. Neither trusted the dirty working tree — correct discipline, since HEAD had already advanced to Slice 3.
- **Fix-delta:** if the author lands any fixes, re-review will scope to the single fix SHA (`git show <sha>`), not a range.
