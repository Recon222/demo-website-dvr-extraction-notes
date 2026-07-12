# PR 27 — Aggregate Code Review

**PR:** [#27](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/27) — Combined — Demo Explorer M3–M4, the contextual rail manifest, and the marketing scan chrome
**Branch:** `feat/demo-explorer-m4` → `master`
**Cut:** Combined fan-out — four mostly file-disjoint areas (M3 exit flow, M4 backdrop, contextual rail manifest, marketing scan chrome)
**Reviewers (fresh fan-out):** typescript-reviewer, pr-test-analyzer, silent-failure-hunter, type-design-analyzer
**Date:** 2026-07-11

## Verdict
**REVISE.**

Three HIGH findings, no CRITICAL. The load-bearing one is a **live regression**: `DemoExperience.tsx`'s `explore` memo omits `modal` from its dependency array, so the manifest active row goes stale on every modal close — breaking the exact anchor↔narration parity invariant this PR set out to establish. It was caught independently by two lanes (typescript-reviewer reproduced it against the branch; type-design-analyzer hit it while tracing consumers). The other two HIGH findings are false-coverage traps from the test lane — the "StrictMode-safe" and "no-scan-on-/demo" claims are pinned by tests that don't actually exercise the risk surface. All three are cheap, mechanical fixes. The rest of the combined PR (exit dialog, backdrop-in-CSS, registry split, feature-boundary sealing, UtilityStrip removal) is sound.

## Pre-flight gates
| Gate | Result |
|---|---|
| `vitest run` (10 changed test paths) | ✅ 98/98 passed — 0 in-scope failures, no pre-existing drift in scope |
| `tsc --noEmit` (changed surface) | ✅ clean |
| `next lint` (changed surface) | ✅ no new warnings |
| `pnpm build` | ⚠️ not re-run this session (dev servers were up) — recommend a fresh build before merge |

## Reviewer verdicts at a glance
| Agent | C | H | M | L | Verdict |
|---|---|---|---|---|---|
| typescript-reviewer | 0 | 1 | 0 | 0 | REVISE |
| pr-test-analyzer | 0 | 2 | 0 | 0 | REVISE |
| type-design-analyzer | 0 | 0 | 1 | 0 | APPROVE w/ comments |
| silent-failure-hunter | 0 | 0 | 0 | 1 | APPROVE |
| **Aggregate (deduped)** | **0** | **3** | **1** | **1** | **REVISE** |

## Findings (deduped, ranked by severity)

### CRITICAL
None.

### HIGH

**H1 — Manifest active row goes stale after any modal closes (live regression)**
`features/demo/ui/DemoExperience.tsx:203-207`
*Lanes: typescript-reviewer (reproduced) + type-design-analyzer (independent) — cross-lane dedupe.*

This PR (`e078d95`) changed `selectExploreStatus` to read `state.modal` as its most-specific anchor (modal → view → chapter), but the `explore` `useMemo` that feeds the manifest was not updated:

```tsx
const explore = useMemo(
  () => selectExploreStatus(store.getState()),
  // eslint-disable-next-line react-hooks/exhaustive-deps -- visited/view ARE the selector's inputs, read through getState
  [store, visited, view],
)
```

`closeModal()` (and `submitCase`/`submitLocation`, which call it) only sets `modal: null` — never `visited` or `view`. So on modal close the component re-renders (the `modal` subscription fires) but the memo deps are all reference-unchanged → React returns the **stale cached array** computed while the modal was open. The checklist keeps the just-closed modal's row highlighted and renders `activeDetail`/narration under that wrong row, while the (uncached, always-fresh) `narration` on line 200-201 has already reverted to the Cases copy. Anchor and narration diverge on every modal close — the precise invariant this PR exists to hold. Re-opening an already-*visited* modal a second time recomputes nothing at all (`visited` also unchanged), so that row never re-lights.

Reproduced by typescript-reviewer against this branch (throwaway RTL test, since deleted): after `openModal('import')` → `closeModal()`, `modal` is `null` and `view` is `'cases'`, yet the "Import Location" row still carries `data-explore-active` and "Cases" does not.

**Fix:** add `modal` to the `explore` memo's dependency array; update the now-inaccurate comment and the `exhaustive-deps` disable (`modal` genuinely is one of the selector's inputs via `store.getState()`).

---

**H2 — "StrictMode-safe" scroll effect is unverified (false-coverage trap)**
`features/demo/ui/controls/ExploreChecklist.tsx:43-55` (effect) · `features/demo/ui/controls/__tests__/ExploreChecklist.test.tsx:62-79` (test)
*Lane: pr-test-analyzer.*

Commit `6c37e21` and the in-code comment both claim the scroll-on-active-change effect is "StrictMode-safe (prev-id guard, not a mounted flag)". The guard *is* correctly idempotent by construction (a `prevActiveId` ref compared against the actual previous value), so it survives React's dev double-invoke — but **no test verifies this**. No test in the repo renders under `<React.StrictMode>` (grepped: zero hits). A plausible regression — swapping the ref guard for the "obvious" `useRef(false)` mounted-flag pattern — passes both existing (non-strict) assertions identically, then fires a spurious scroll (visible first-paint page-jerk) under StrictMode's double-invoke. `next.config.js` leaves `reactStrictMode` at its default `true`, so `/demo` genuinely runs under StrictMode in dev: the regression class this mechanism exists to prevent would ship green.

**Fix:** add one test rendering `<ExploreChecklist />` inside `<React.StrictMode>` (or two `act()` passes simulating the dev remount) asserting `scrollIntoView` is still not called on the initial double-mount.

---

**H3 — "No scan on /demo" absence pin checks the wrong files (false-coverage trap)**
`features/demo/ui/__tests__/backdrop.test.ts:58-61` (test) · the untested risk surface is `app/layout.tsx` (root layout)
*Lane: pr-test-analyzer.*

The M4 design decision is "deliberately NO scan on the demo." The backdrop absence test pins this by asserting `features/demo/ui/DemoExperience.tsx` and `features/demo/ui/demo.css` carry no scan markup — but those files were never at risk (nobody pastes marketing CSS class selectors into the demo's own files). The real shared ancestor of `/demo` is the **root** `app/layout.tsx` (`app/demo/page.tsx` has no co-located layout). No test anywhere reads `app/layout.tsx` and asserts it lacks `case-scan`. Today's code is correct, but a plausible "make it apply everywhere" refactor that hoists the scan div from `app/(default)/layout.tsx` up into the shared root layout would make `/demo` inherit the marketing scan — the exact regression the pin is named for, slipping through silently green. `chrome-scope.test.tsx` checks the root layout for `Header`/`Footer`/`ManifestTabStrip` but never for `case-scan`.

**Fix:** add an assertion (in `chrome-scope.test.tsx` or `background-scan.test.ts`) reading `app/layout.tsx` and asserting `expect(rootLayout).not.toMatch(/case-scan/)`.

### MEDIUM

**M1 — "Exactly one active row" is a test-time invariant, not type- or runtime-enforced**
`features/demo/engine/content/explore.ts:26` (`ExploreItem.covers`) · consumed by `features/demo/engine/store/selectors.ts:28-48`
*Lane: type-design-analyzer.*

Correctness of "exactly one row active" rests on `covers` arrays being pairwise disjoint, verified only by a Vitest assertion (`explore.test.ts:29-34`), not by the type or a guard in `selectExploreStatus`. This PR tripled the modal-covered surface (`newCase`/`newLocation`/`import`). A future copy-paste typo — e.g. `{ id: 'newLocation', covers: ['newCase'], … }` — type-checks cleanly (`'newCase'` is a valid `ModalId`) and only fails at `pnpm test`, not `tsc`/`build`. Downstream (`ExploreChecklist.tsx:67-94`), two rows sharing a covered id both render active and render `activeDetail` twice — a visibly broken manifest that ships if the suite isn't run pre-merge.

**Fix (optional, defensible to defer):** the existing test is an acceptable enforcement mechanism per the codebase's established tradeoff. If cheapening the blast radius is wanted, add a dev-only module-load assertion in `explore.ts`:
```ts
if (process.env.NODE_ENV !== 'production') {
  const all = EXPLORE_ITEMS.flatMap(i => i.covers)
  if (new Set(all).size !== all.length) throw new Error('EXPLORE_ITEMS covers overlap')
}
```

### LOW

**L1 — Narration pane visibility coupled to a possibly-empty `active` set (latent, unreachable today)**
`features/demo/ui/controls/ExploreChecklist.tsx:92` · `features/demo/engine/store/selectors.ts:34-39`
*Lane: silent-failure-hunter.*

`{it.active ? activeDetail : null}` inside a `.map` means the narration pane only renders if some row is active. The anchor falls through to `state.currentChapter` unconditionally with no covered-by-registry check. No path reaches an uncovered anchor today (`splash` is excluded by design and has no navigable entry point; guarded by `explore.test.ts`), so this is not a live bug. If `splash` navigation is ever reintroduced (or a new `ChapterId`/view added without a matching `EXPLORE_ITEMS` row), the rail narration would render nowhere with no console signal.

**Fix:** none required now. If/when `splash` returns, either add a covering `EXPLORE_ITEMS` row or render `activeDetail` at the list level with a documented `?? NARRATION[currentChapter]` fallback.

## Architecture invariants checked & confirmed
- **Feature boundary sealed both ways.** The demo backdrop duplicates marketing's grid (`153,186,221`) and glow (`43,140,193`) as plain string values in `demo.css`, not imports — nothing crosses `@/features/demo` ↔ marketing. (typescript-reviewer, type-design-analyzer)
- **`/demo` stays chrome-free at runtime.** The `case-scan` markup is confirmed absent from the root `app/layout.tsx` and `app/demo/page.tsx`; the marketing ambient background lives only in the `(default)` group layout. (Correct today — H3 is that this isn't *pinned*, not that it's broken.)
- **UtilityStrip removal is clean.** Import and JSX usage removed together; no dangling production references (only historical test/doc mentions remain). (typescript-reviewer, silent-failure-hunter)
- **Registry split is disjoint.** `newCase`/`newLocation`/`import` have singleton, disjoint `covers`; at most one row matches a given anchor from the registry side. (all four lanes)
- **Selector anchor logic itself is correct and type-safe.** `ModalId | null` narrows correctly in the ternary; boot state (`view: 'cases'`, `modal: null`) resolves to exactly one active row. The bug (H1) is entirely in the consuming memo, not the selector. (typescript-reviewer)
- **ExitDialog is honestly presentational.** Escape/backdrop → `onStay`, back-link → navigate; inner dialog stops propagation; `unseen` projected to `{number,label}` only — no store types leak in. (silent-failure-hunter, type-design-analyzer)
- **`MODAL_NARRATION` partial-record fallthrough is deliberate.** The one unmapped `ModalId` (`mediaLibrary`) is never opened; the `??` fallback to chapter narration is explicit and commented. (silent-failure-hunter, type-design-analyzer)
- **`fallbackNotice` exhaustive switch** uses `const exhaustive: never = mode` — a new `FallbackMode` variant is a compile error. (type-design-analyzer)
- **Registry/selector tests genuinely discriminate branches.** Modal/view/chapter-fallback precedence each has a test that fails if precedence order were swapped; `activeDetail` adjacency confirmed via `previousElementSibling`, not a look-alike assertion. (pr-test-analyzer)

## Recommended next steps
Single mechanical commit closes the merge-blockers:
1. **H1 (required):** add `modal` to the `explore` `useMemo` deps in `DemoExperience.tsx:203-207`; fix the stale comment + eslint-disable. Add a `DemoExperience`-level test that opens then closes a modal and asserts the active row reverts (this is the coverage gap that let H1 ship green — see pipeline notes).
2. **H2 (required):** add a StrictMode / double-invoke test for the scroll effect.
3. **H3 (required):** add the `app/layout.tsx` no-`case-scan` assertion.
4. **M1 / L1 (optional):** defensible to defer; address if touching the registry or reintroducing `splash`.
5. Run a fresh `pnpm build` before merge (not re-run this session).

## Agent IDs
<!-- Used by /code-review --fix-delta to resume reviewers via SendMessage. -->
- typescript-reviewer: ae9c9ae7cfe44c173
- pr-test-analyzer: a6668804ceb663d95
- silent-failure-hunter: a5d04dbf6eb5a9a52
- type-design-analyzer: a3942a0e386ca1c15

## Reviewer pipeline notes
- **Cross-lane independent identification of H1.** typescript-reviewer (reproduced it with a throwaway RTL test) and type-design-analyzer (hit it while tracing consumers of the changed selector) landed on the same missing-`modal`-dep root cause from different angles. Deduped into one finding, credited both. This is the strongest possible signal for a real bug.
- **The test suite is green (98/98) while H1 is a live bug.** The gap: `selectors.test.ts` tests the selector directly (correct, and it passes), but no `DemoExperience`-level test closes a modal and asserts the row reverts. This is the same *class* pr-test-analyzer flagged in H2/H3 — a contract "covered" by a test that doesn't exercise the actual risk path. The fix for H1 should include the missing render-level test, not just the dep-array change.
- **silent-failure-hunter and type-design-analyzer both independently cleared** the `MODAL_NARRATION` partial-record fallthrough and the `splash`-unreachable edge — convergent confirmation that L1 is genuinely latent, not live.
- **Four lanes, four distinct value-adds, minimal overlap** beyond the H1 dedupe: correctness (H1), test-honesty (H2/H3), type-enforcement (M1), silent-failure latent-coupling (L1). No disputed/conflicting positions.
