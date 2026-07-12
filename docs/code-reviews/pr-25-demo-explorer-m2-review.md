# PR 25 — Aggregate Code Review

**PR:** [#25](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/25) — Demo Explorer M2 — the exploration manifest: visited tracking + rail checklist
**Branch:** `feat/demo-explorer-m2` → `master`
**Cut:** M2 of 4 (M1 #24 merged · M3 back-to-site dialog · M4 Case-File backdrop)
**Reviewers (fresh synchronous fan-out — no teams):** `typescript-reviewer`, `pr-test-analyzer`, `silent-failure-hunter`, `type-design-analyzer`
**Date:** 2026-07-10

## Verdict

**APPROVE with comments.**

Clean, well-tested feature cut — no CRITICAL, no HIGH. Two MEDIUM findings, both cheap and both worth landing before or shortly after merge: a type-design one (the `visited`/`covers` id space widens to bare `string` when the recordable set is already a known union) and a test-quality one (the `visit()` "render economy" contract is asserted by value-equality under a test named "idempotently," so a refactor dropping the identity guard passes silently). Three LOWs round it out.

One severity adjudication drives the verdict and is documented in full below: `pr-test-analyzer` filed the `visit()` gap as **HIGH**; the orchestrator downgraded it to **MEDIUM** after tracing that the "regression" it guards against is a negligible render micro-optimization with zero correctness or UX impact. If the owner weighs the false-coverage principle above the impact analysis, treat it as REVISE — but the fix is a 4-line test either way, so the practical outcome is identical: **write the identity test and drop the redundant cast, and this merges clean.**

## Base note

M1 (#24) is merged into local `master`, so `git diff master...feat/demo-explorer-m2` is the true, clean scope this time — **14 files, +374/−12**, two commits (`8fb6720` engine Phase 4, `81b9cd6` UI Phase 5). No stale-base trap (unlike #24, where `origin/master` lagged the local merge).

## Pre-flight gates

| Gate | Result |
|---|---|
| `pnpm exec tsc --noEmit -p tsconfig.json` | **0 errors** |
| `pnpm exec vitest run` | **108 files / 740 tests pass** (18 new) |
| `pnpm lint` | Not runnable — repo has no ESLint config; `next lint` prompts interactively. Pre-existing debt. **Relevant only to L1:** the code carries an `eslint-disable` that can never be enforced here. |

## Reviewer verdicts at a glance

| Agent | C | H | M | L | Verdict |
|---|---|---|---|---|---|
| `typescript-reviewer` | 0 | 0 | 0 | 1 | APPROVE |
| `pr-test-analyzer` | 0 | 1→0 | 0→1 | 1 | REVISE → re-ranked (see M2) |
| `silent-failure-hunter` | 0 | 0 | 0 | 0 | APPROVE |
| `type-design-analyzer` | 0 | 0 | 1 | 1 | APPROVE |
| **Aggregate (deduped, re-ranked)** | **0** | **0** | **2** | **3** | **APPROVE w/ comments** |

## Findings (deduped, ranked by severity)

### CRITICAL
None.

### HIGH
None. (See M2 for the re-ranked `pr-test-analyzer` finding and the reasoning.)

### MEDIUM

**M1 — `covers` / `visited` widen to bare `string` when the recordable id space is already a known union.**
`features/demo/engine/content/explore.ts:23` (`covers: readonly string[]`) · `features/demo/engine/store/create-store.ts:93` (`visited: Readonly<Record<string, true>>`), `:140` (`visit()`).

The only three writers of `visited` are already typed: `setView(view: AppView)`, `openModal(modal: ModalId)`, `launch(screen: LaunchableId)`. And `ExploreItem.jumpTo` is `AppView` — proof the author knows how to bound an id field here — while `covers`/`id` were left as `string`. A typo in a hand-typed entry (`covers: ['immport']`) compiles cleanly and yields a permanently-unlit row, **indistinguishable at the type level from an intentionally-not-yet-built screen**, defeating the manifest's whole purpose with no compiler signal.

Why MEDIUM, not HIGH: a real, well-built runtime backstop catches this today — `explore.test.ts:9-21` independently rebuilds the known-id set from `CHAPTERS`/`LAUNCHABLE`/`'map'`/`ModalId` literals and asserts every `covers`/`jumpTo` id is a member. That's the textbook "boundary code enforces what the type doesn't" case. `type-design-analyzer` and `pr-test-analyzer` independently pointed at this same test — one as the reason the finding is MEDIUM not HIGH, the other confirming it's genuinely wired to the real registries (not local literals).

Fix (nearly free, doesn't fight the lead/lag design): `covers: readonly (AppView | ModalId)[]`, `visited: Readonly<Partial<Record<AppView | ModalId, true>>>`, `visit(v, id: AppView | ModalId)`. Lead/lag is about *listing* a built screen or not — `mediaCapture`/`audioRecording` are already real `AppView` members with no screen yet, so the union stays ahead of the UI on its own. `ExploreItem.id` can stay `string` (a display/key slug, not a membership key).

**M2 — `visit()`'s identity-stability ("render economy") contract is claimed but pinned only by value-equality.** *(re-ranked from `pr-test-analyzer` HIGH → MEDIUM — see adjudication)*
`features/demo/engine/store/create-store.ts:139-141` (`visit = (v, id) => v[id] ? v : {...v,[id]:true}`) · test `features/demo/engine/store/__tests__/store.test.ts:67-73`.

The test `it('setView records each view, idempotently', …)` asserts `toEqual` (value equality) after a re-visit; no test anywhere captures the `visited` reference before/after and asserts `toBe`. A future "simplification" of `visit` to `{...v,[id]:true}` unconditionally passes all 740 tests while creating a fresh object on every re-visit — the exact false-coverage trap (test named for a contract it doesn't assert).

> **Severity adjudication (HIGH → MEDIUM).** `pr-test-analyzer` is right that this is genuine false coverage, and the fix should land. But severity follows impact, and the orchestrator traced the impact of the un-guarded refactor: **all three visit-recording actions change another *subscribed* field in the same `set()`** — `setView`→`view`, `openModal`→`modal`, `launch`→`view` (`create-store.ts:226-235`; DemoExperience subscribes to all of `view`/`modal`/`visited` at `:147-156`). Zustand batches one `set()` into one re-render regardless of whether `visited` gets a new reference, so dropping the guard causes **zero extra re-renders**. The sole cost is a `selectExploreStatus` memo recompute (re-mapping 13 items) on re-opens of an already-visited *modal* — negligible, invisible, no correctness or UX effect. A test gap protecting a micro-optimization of that size is MEDIUM, not the "cheap version of a production bug" the HIGH bar is for. (This mirrors the M4 re-rank on PR #24: correct-today code whose contract test was too weak, downgraded because the failure needs a future refactor — here with even lower impact, since M4 could at least surface stale sync data.) The downgrade is surfaced, not silent; the owner may keep it HIGH → REVISE if they prefer, and the fix is identical either way.

Fix: add `it('visit returns the same visited object on a re-visit (render economy)')` — snapshot the reference, re-visit an already-seen id via `setView`/`openModal`/`launch`, assert `toBe`; plus a companion asserting a *new* id changes the reference (proves the guard works both ways).

### LOW

**L1 — Redundant `as AppView` cast.** `features/demo/engine/content/explore.ts:35`. `d.id` is `WizardScreenId ⊆ ChapterId ⊆ AppView`, already assignable. `typescript-reviewer` verified empirically — removed the cast, `tsc` stayed at 0 errors. The cast papers over nothing; drop it (`jumpTo: d.id`).

**L2 — `ExploreChecklist` completion-color branch untested.** `features/demo/ui/controls/ExploreChecklist.tsx:36,43` (`done = seen === items.length`). The component fixture is always 1/3 visited, so the all-visited green-header branch never renders in a test. Purely decorative (color only, no aria/interaction change) — optional fixture, not blocking.

**L3 — `ExploreStatus.active` doesn't structurally guarantee exactly-one-true.** `features/demo/engine/store/selectors.ts:18,38` — `active` is computed per-row (`covers.includes(anchor)`), so two items sharing a covered id would both light, and zero match if `anchor` is uncovered (only reachable via the dead `splash` path). Precedented by `WizardDrawer`'s identical `active` pattern — an accepted convention. Optional: extend `explore.test.ts` with a cross-item `covers`-disjointness assertion alongside the existing id-uniqueness check.

## Architecture invariants checked & confirmed

- **The `explore` memo is provably correct, not a stale-closure bug.** Three lanes converged: `currentChapter` (read by the selector, absent from the memo deps) has exactly two writers — `initialState()` and `setView`, and `setView` always writes `currentChapter` to the same value as `view` in the same `set()`. So it can't change without `view` changing; deps `[store, visited, view]` are sufficient and the `eslint-disable` is justified. Independently traced by `typescript-reviewer` and `silent-failure-hunter`.
- **No tearing** between the subscribed `visited`/`view` snapshots and the `store.getState()` read inside the memo — same synchronous render pass, no interleaved `set()`.
- **The registry↔visited id join is correct today AND typo-guarded.** The import modal records exactly `'import'` (`openModal('import')`), matching `covers: ['import']`; `explore.test.ts` cross-checks against the real registries.
- **Every `jumpTo` navigates.** All `EXPLORE_ITEMS[].jumpTo` values have an explicit case in `activeScreen()`'s switch — none dead-ends on the placeholder. The `import` row correctly jumps to `'cases'` (navigable) while covering the `'import'` modal id (not navigable) — a principled `jumpTo`/`covers` split.
- **`reset()` clears `visited`** back to `{cases:true}` (via `initialState()`), pinned by `store.test.ts` — the M1-class "new field reset() must clear" gap is closed here.
- **No unseen-screen false lights.** Every `setView`/`launch`/`openModal` is wired to an explicit user action; nothing records a visit as a side effect of boot or import processing.
- **Store-bridge rule intact** — `ExploreChecklist` and the new `StoryRail` props are pure props-in/`onJump`-out; no store import. Type-only `AppView` import, no cycle.
- **The narration-anchor subtlety is pinned** — `selectors.test.ts:57-64` drives `launch('ocr')` with `currentChapter='timeOffset'` and asserts the Time Offset row stays `active` (the exact TDD-derived behavior the PR body describes).
- **Zero-case Map guard pinned** — clicking the unlit Map row at zero cases navigates, shows the empty picker, and the tab bar remains an escape hatch; one test covers both row-visit and tab-visit paths (both funnel through `setView`).

## Recommended next steps

1. **M1 (type-design)** — tighten `covers`/`visited`/`visit` to `AppView | ModalId`. ~3 type edits, no logic change, `tsc` will confirm.
2. **M2 (test)** — add the `toBe` identity test for `visit()`. 4 lines.
3. **L1** — drop the redundant cast. One character-range delete.
4. **L2 / L3** — optional test additions; land them if the manifest grows.

All four are mechanical; none touches the feature's behavior. A single small commit closes the lot. The cut itself is sound — visited tracking is correct, session-scoped, reset-clean, and the manifest join is both right today and defended by a real cross-registry test.

## Agent IDs
<!-- Fresh synchronous dispatch; resumable via SendMessage for --fix-delta (a plain Agent call returns a resumable ID — no named/background teams needed). -->
- typescript-reviewer: `ac38bdba94ff05dc4`
- pr-test-analyzer: `a126e3d62bf7d50cd`
- silent-failure-hunter: `a111c13dc16a91c19`
- type-design-analyzer: `aabdeaac0016097f2`

## Reviewer pipeline notes

- **Cross-lane convergence on the memo-deps question (strong signal).** The `useMemo` with the `currentChapter`-omitted dep array and an `eslint-disable` is exactly the shape that usually hides a stale-closure bug. Both `typescript-reviewer` and `silent-failure-hunter` independently traced every writer of `currentChapter` and reached "provably safe." Two lanes clearing the same suspicious construct from different lenses is worth more than either alone — noted here rather than filed as a finding.
- **Cross-lane convergence on the MEDIUM's backstop.** `type-design-analyzer` flagged the `string`-widening as MEDIUM *because* `explore.test.ts` enforces at runtime what the type doesn't; `pr-test-analyzer` independently verified that same test is wired to the real registries (not hand-copied literals). One lane's "why it's only MEDIUM" is the other lane's "this test is solid" — mutually reinforcing.
- **Severity adjudication, documented not silent.** The only HIGH was re-ranked to MEDIUM after an impact trace the reporting lane didn't run (every visit-action already re-renders via another subscribed field, so the guarded optimization is near-zero). This is the second time this lane's "correct-today, weak-contract-test" finding has been down-ranked (M4 on #24); the pattern is legitimate — the test lane is excellent at spotting false coverage but rates by principle, and the orchestrator's job is to weight it by impact. Both times the fix is trivial, so the down-rank changes the label, not the recommended action. If this recurs, consider a persona note: false-coverage of a *micro-optimization* is MEDIUM by default unless the protected behavior is user-visible.
- **`silent-failure-hunter` returned a clean zero** and that is a valid, meaningful result on a feature-add PR with little error handling — the lane's value here was confirming the derived-state logic can't silently show a wrong manifest, which it traced exhaustively rather than waving through.
- **No stale-base trap this time.** Reconciled `master` vs the branch before triage (the #24 lesson); M1 was genuinely merged, so the 14-file scope is real.
