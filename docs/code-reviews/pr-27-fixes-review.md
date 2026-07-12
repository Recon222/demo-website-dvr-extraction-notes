# PR 27 — Fix Delta Review

**PR:** [#27](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/27) — Combined — Demo Explorer M3–M4, the contextual rail manifest, and the marketing scan chrome
**Scope:** Fix delta only — re-review of the 3 commits landed in response to the initial review (`pr-27-review.md`).
**Reviewers (resumed via SendMessage, full transcript context):** typescript-reviewer, pr-test-analyzer, silent-failure-hunter, type-design-analyzer
**Date:** 2026-07-11

> **For the implementing instance:** This document is self-contained. You do not need to reread `pr-27-review.md`.

## Verdict
**APPROVE.**

All three HIGH merge-blockers are closed and — unusually — each was verified by **mutation testing**, not just inspection: every reviewer reverted the fix (or injected the regression it guards against) and confirmed exactly the right test fails, then restored a clean tree. H1 (the live stale-memo regression) is fixed at the root with a render-level test that provably fails pre-fix. H2 and H3 (the two false-coverage traps) now have tests with proven teeth. Two non-blocking items remain from the initial review: **M1** (MEDIUM) is still technically open — the implementer chose the "keep the disjointness test as enforcement" option but added neither a concrete un-defer trigger nor a `deferred.md` entry, so it doesn't meet the project's own bar for a tracked deferral; **L1** (LOW) is unchanged/latent and similarly untracked. Neither blocks merge; both want a ~4-line `deferred.md` entry (or, for M1, the one-line dev assertion). Recommend landing that tidy-up in the same housekeeping commit.

## Pre-flight gates (re-verified after fixes)
| Gate | Result |
|---|---|
| `vitest run` (fix-touched paths) | ✅ 44/44 — ExploreChecklist 8 (+1 StrictMode), sandbox 33 (+1 modal-close), chrome-scope 3 |
| `tsc --noEmit` (changed surface) | ✅ clean |
| Reviewer mutation checks | ✅ all restored to clean tree (`git status` clean confirmed by each lane) |
| `pnpm build` | ⚠️ still not re-run this session — recommend a fresh build before merge |

## Fix commit → original finding mapping
| Commit | Original finding | Type of fix | Verdict |
|---|---|---|---|
| `0fe7e20` | H1 — manifest active row goes stale after modal close | code (add `modal` dep) + render-level test | **Closed** (mutation-verified) |
| `719f057` | H2 — "StrictMode-safe" scroll effect unverified | test (StrictMode double-invoke pin) | **Closed** (mutation-verified) |
| `0a10115` | H3 — no-scan-on-/demo pin checked wrong files | test (root `app/layout.tsx` no-`case-scan` pin) | **Closed** (mutation-verified) |
| — | M1 — "exactly one active row" test-only invariant | none (kept test-only, no trigger logged) | **Still open** (MEDIUM, non-blocking) |
| — | L1 — narration-pane coupling to empty active set | none | **Unchanged** (LOW, latent, untracked) |

## Reviewer verdicts at a glance (fix delta)
| Agent | Original | Fix-delta verdict | Closed | Open/Carried |
|---|---|---|---|---|
| typescript-reviewer | REVISE (1 H) | **APPROVE** | H1 | — |
| pr-test-analyzer | REVISE (2 H) | **APPROVE** | H2, H3 | — |
| silent-failure-hunter | APPROVE (1 L) | **APPROVE** | — | L1 (latent) |
| type-design-analyzer | APPROVE w/ comments (1 M) | **APPROVE w/ comments** | — | M1 (open, untracked) |
| **Aggregate** | REVISE | **APPROVE** | 3 HIGH | M1 (M), L1 (L) |

## Closed findings — verification detail

**H1 — stale manifest row after modal close → CLOSED (typescript-reviewer, mutation-verified)**
The `explore` `useMemo` dep array in `features/demo/ui/DemoExperience.tsx` changed from `[store, visited, view]` to `[store, visited, view, modal]`, with the stale comment and `exhaustive-deps` disable both updated to name `modal` as a genuine selector input. The reviewer ran the new render-level test (`DemoExperience.sandbox.test.tsx` — "reverts the active manifest row when a modal closes") against fixed code (pass), then **reverted only the dep array and reran** — the test failed with exactly the originally-reproduced symptom (`data-explore-active=""` still on the Import Location row, absent from Cases), proving it exercises the real path and isn't a look-alike. Restored, confirmed clean tree, and ran the 65-test adjacent suite green. Regression check: `modal` changes only on explicit open/close (user action, not a hot path); boot state (`view: 'cases'`, `modal: null`) still resolves to exactly one active row. silent-failure-hunter independently traced open→close and reopen-already-visited and confirmed the added dep never drives `explore` to an empty/all-inactive array. type-design-analyzer confirmed the fix is type-sound (`modal: ModalId | null` as a memo dep, not a type parameter — selector signature and return type unchanged).

**H2 — StrictMode-safe scroll effect → CLOSED (pr-test-analyzer, mutation-verified)**
New test in `ExploreChecklist.test.tsx` renders `<StrictMode><ExploreChecklist /></StrictMode>` with a stubbed `scrollIntoView` and asserts it isn't called on the initial double-mount. The reviewer **patched the production guard from the `prevActiveId` ref-comparison to the naive `useRef(false)` mounted-flag pattern the finding described** and reran: exactly 1 of 8 tests failed — the new StrictMode test — with a real captured `scrollIntoView({ block: 'start', behavior: 'smooth' })` call. This proves both that React 19 + this jsdom/RTL setup genuinely double-invokes mount effects under StrictMode (`NODE_ENV` ≠ `production`, so dev semantics are live — not a vacuous pass) and that none of the other 7 tests would have caught the regression. Restored, suite green (8/8).

**H3 — no-scan-on-/demo pin → CLOSED (pr-test-analyzer, mutation-verified)**
`chrome-scope.test.tsx` now asserts `expect(rootLayout).not.toMatch(/case-scan/)` against the file it already reads via `readFileSync(join(root, 'app', 'layout.tsx'))` — the actual and only layout ancestor of `/demo` (re-confirmed: no `app/demo/layout.tsx`). The reviewer **injected `<div aria-hidden className="case-scan">` into the real `app/layout.tsx`** (the exact "hoist the scan to the shared layout" regression the finding named) and reran — only the new assertion failed (other 2/3 tests still passed). Restored, green (3/3).

## Deferral justifications — verification detail

**M1 — "exactly one active row" invariant (MEDIUM) — assessed against the `deferred.md` rubric → STILL OPEN**
type-design-analyzer applied the three-part rubric:
1. **Enforcement mechanism cited/sufficient?** Yes — `explore.test.ts:29-34` computes `new Set(all).size === all.length` over the full flattened `covers` list, catching any duplicate; present and unmodified.
2. **Specific rationale?** Partially — the M1/L3 test-over-type precedent is real and specific, not boilerplate.
3. **Concrete un-defer trigger?** **No.** `docs/code-reviews/deferred.md` explicitly requires reason **and** a concrete trigger (header line 4: "not a general TODO dump"; all 26 precedent entries follow that shape). M1 has neither a trigger nor an entry in the file. Failing leg 3, it doesn't meet the project's own bar for a tracked deferral, so it stays **open, MEDIUM** — the original finding, unresolved (not a new finding).
**Minimal close-out (either, not both):** add a 4-line `deferred.md` entry with a real trigger (e.g., "revisit if `covers` construction moves off a single static literal, or the registry becomes generated/multi-author"), **or** land the one-line dev-time assertion offered as option (b) in the initial review.

**L1 — narration-pane coupling (LOW) — unchanged, untracked → recommend a deferred.md line**
silent-failure-hunter re-confirmed `ExploreChecklist.tsx:92` and `selectors.ts:34-39` are byte-identical to the original review and untouched by any fix commit; the splash-unreachable invariant that makes it latent still holds (disjoint covers + no `setView('splash')` caller + no `onBack` wiring on dashboard/cases). Recommendation (not a re-raised finding): a one-line `deferred.md` entry, because "none required now" was conditioned on the splash-unreachable invariant, which lives in test coverage the next person touching `ChapterId`/navigation won't necessarily connect to this rendering coupling.

## New findings introduced by the fixes
None. All three fixes are minimal and localized; no lane found a regression. typescript-reviewer confirmed no over-recompute from the added dep; silent-failure-hunter confirmed no new swallow/bad-fallback; type-design confirmed no new type surface.

## Architecture invariants — re-verified clean
- **Anchor ↔ narration parity now holds through modal close** — the exact invariant H1 broke is restored and pinned by a render-level regression test (open→close→assert revert).
- **StrictMode first-paint safety is now enforced**, not merely claimed — a mounted-flag regression fails a dedicated test.
- **`/demo` chrome-free guarantee is now pinned at the real risk surface** (root `app/layout.tsx`), closing the gap where the demo's own no-scan pin couldn't see a hoist-to-shared-layout regression.
- **Feature boundary, registry disjointness, UtilityStrip removal, selector anchor logic** — all unchanged by the fix commits; still clean per the initial review.

## Recommended next steps
1. **Ready for merge** on the correctness axis — all HIGH blockers closed and mutation-verified.
2. **One optional housekeeping commit** before or just after merge: close out M1 and L1 with `deferred.md` entries (each with a concrete un-defer trigger), or land the one-line covers-overlap dev assertion for M1. This satisfies the project's own deferral-tracking bar and is the only outstanding item.
3. Run a fresh `pnpm build` (still not re-run this session).

## Reviewer pipeline notes
- **Every lane verified by mutation, not inspection.** typescript-reviewer reverted the dep array; pr-test-analyzer swapped the guard to a mounted flag AND injected a `case-scan` div into the root layout; each isolated *exactly one* failing test/assertion and restored a clean tree. This is the strongest form of fix-delta verification — it proves both that the fix works and that the accompanying test has teeth (would fail without the fix). The "verified teeth" claims in the commit messages were independently reproduced, not taken on faith.
- **Resume preserved context perfectly.** Each agent referenced its own original finding wording verbatim and knew precisely which files/lines it had flagged — no re-derivation, and the fix-delta pass ran far faster than the initial fan-out (~55–125s per lane vs. 235–650s initial).
- **The deferral rubric earned its place.** type-design-analyzer did not rubber-stamp M1 as "deferred" just because the implementer picked one of its offered options — it held the choice to the project's documented reason-**and**-trigger standard and correctly kept M1 open. This is the difference between a vague deferral and a justified one.
- **Cross-lane convergence on tracking hygiene.** Both silent-failure-hunter (L1) and type-design-analyzer (M1) independently arrived at "this needs a `deferred.md` line" without coordination — a consistent signal that the remaining gap is process/tracking, not code.
