# PR 24 — Aggregate Code Review

**PR:** [#24](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/24) — Demo Explorer M1 — delete the guided tour: sandbox-only, hands-on demo
**Branch:** `feat/demo-explorer` → `master`
**Cut:** M1 of 4 (M2 exploration manifest · M3 back-to-site dialog · M4 Case-File backdrop)
**Reviewers (fresh fan-out):** `typescript-reviewer`, `pr-test-analyzer`, `silent-failure-hunter`, `type-design-analyzer` (errored — see Pipeline notes)
**Date:** 2026-07-10

## Verdict

**REVISE.**

One HIGH survives verification: import cancellation is guarded by a single shared boolean rather than a per-run token, so a stale in-flight import can resume after cancel and silently mutate the store. The mechanism is **pre-existing** — byte-identical on `master` — but this PR's move to `live: true` promotes it from an opt-in path (only visitors who toggled "Free explore") to **100% of demo traffic**, against a live model with a 30s timeout. That is a real 30-second race window on every import a visitor runs.

Everything else is clean. The deletion work itself — director, mode split, tour chrome, seed data — is genuinely well executed: no dangling imports, no orphaned props, no dead call sites, compiler-enforced invariants intact, and the absence tests are real regression guards rather than tautologies. The headline credibility risk (silently swapping a visitor's PDF for the fictional sample case) was traced end-to-end by two lanes and **is correctly surfaced** to the user.

## Scope correction (read this first)

`gh pr diff 24` reports **116 files**. That is wrong. `origin/master` is stale — the Case-File redesign merge (`997845a`, PR #23) landed locally and was never pushed — so the GitHub-computed diff replays ~73 files of already-reviewed work.

The true scope is 3 commits, **43 files, +733/−1380**:

```bash
git diff master...feat/demo-explorer
```

All four lanes were briefed with that command. Without it, the fan-out would have re-reviewed the merged Case-File redesign.

## Pre-flight gates

| Gate | Result |
|---|---|
| `pnpm exec tsc --noEmit -p tsconfig.json` | **0 errors** (whole project) |
| `pnpm exec vitest run` | **106 files / 715 tests, all passing** |
| `pnpm test:coverage` (engine) | **96.58% stmts · 87.83% branch · 98.61% funcs · 98.13% lines** — above the 80% gate |
| `pnpm lint` | **Not runnable.** Repo has no ESLint config; `next lint` drops into an interactive setup prompt and exits 1. Pre-existing debt, unrelated to this PR. |
| `pnpm build` | Not re-run (PR reports passing) |

Only stderr noise: React `act()` warnings from `DemoExperience.map.test.tsx` — pre-existing, unrelated.

## Reviewer verdicts at a glance

| Agent | C | H | M | L | Verdict |
|---|---|---|---|---|---|
| `typescript-reviewer` | 0 | 0 | 0 | 2 | APPROVE |
| `pr-test-analyzer` | 0 | 1→0 | 0→1 | 0 | REVISE → (re-ranked, see below) |
| `silent-failure-hunter` | 0 | 1 | 2 | 2 | REVISE |
| `type-design-analyzer` | — | — | — | — | **ERRORED** — lane carried by orchestrator |
| **Aggregate (deduped)** | **0** | **1** | **4** | **4** | **REVISE** |

## Findings (deduped, ranked by severity)

### CRITICAL
None.

### HIGH

**H1 — Cancelling an import doesn't stop it: a stale in-flight run can mutate the store after cancel.**
`features/demo/ui/DemoExperience.tsx:177, 351, 355, 358, 376, 379, 673, 681`

One shared boolean ref (`importCancelled`) means "is *an* import cancelled" — not *which* one. Both `processPdfFiles` (`:351`) and `runPasteImport` (`:376`) unconditionally clear it at their own start, and there is no `AbortController` anywhere in `features/demo/ui/import/` (verified: zero matches).

Reachable sequence, ~30s window (`app/api/extract/route.ts` timeout):

1. Visitor picks 2 PDFs → `processPdfFiles` starts, file 1's `runPdfImport` is mid-fetch.
2. Visitor cancels → `importCancelled.current = true`, modal closes. **The fetch is never aborted.**
3. Visitor reopens Import, starts a new import → `processPdfFiles` runs `importCancelled.current = false`.
4. The stale file-1 request resolves. Its `if (importCancelled.current) return` checkpoint now reads `false` — cleared by an unrelated newer run — and does not short-circuit.
5. The stale run calls `recordSuccess` → `applySuccess` → `store.addLocation(...)` + `store.applyImport(...)`. A phantom location is permanently added to the visitor's case. Its `finishImport` then races the live run's, and whichever lands last silently overwrites the result screen. No error, no toast, no log.

If the stale run had itself fallen back, the phantom location carries the fictional sample's fields — including plausible DVR credentials (`SAMPLE_EXTRACTION`, `engine/logic/import.ts`).

**Provenance:** the machinery is identical on `master` (lines 232/442/447/450/468/471/766/774). This PR did not author the race. It changed reachability:

| | pre-PR | post-PR |
|---|---|---|
| `live` flag | `currentMode === 'sandbox'` | `true`, unconditional |
| default visitor | `guided` → no network → window ≈ 0 | always live → full 30s window |
| who can hit it | only "Free explore" togglers | **everyone** |

**Fix.** Replace the boolean with a per-run generation counter. It must replace the ref at **all four write sites**, not just the two checkpoints:

```js
const importGen = useRef(0)
// processPdfFiles / runPasteImport:  const myGen = ++importGen.current
// both checkpoints:                  if (importGen.current !== myGen) return
// onCancel (:681):                   importGen.current++
// onRetry  (:673):                   delete the line entirely — a retry bumps by starting a new run
```

`onRetry`'s clear (`:673`) is not independently exploitable — reaching `stage: 'result'` means `finishImport` already ran — but leaving it as an untokened clear reintroduces the same class. A generation counter makes a stale run's check fail *even after* a newer run resets things, because the newer run bumps the same counter it is compared against.

### MEDIUM

**M1 — Batch fallback notice doesn't say *which* location is fabricated.**
`DemoExperience.tsx:313` (`recordSuccess`) · `ui/screens/importResultData.ts` (`buildImportedLocationView`) · `ui/screens/ImportModal.tsx:181`

`tally.notice = tally.notice ?? fallbackNotice(res.fallbackMode)` is a correct sticky-first-truthy latch — once any file falls back, the aggregate notice stays set. But `buildImportedLocationView` never receives `fallbackMode`. In a 3-file batch where only file 2 fell back, one generic sentence ("imported the sample request instead", singular) sits above three accordions, and file 2's card renders the fictional business name, address, and DVR credentials **indistinguishable in place** from the two real ones. Honest in aggregate, unattributable per-card.
*Fix:* thread `fallbackMode` into `ImportedLocationView`; badge the specific card.
*Identified independently by `silent-failure-hunter` and the orchestrator.*

**M2 — `fallbackNotice` is a non-exhaustive fall-through; the variant meaning "fabricated data" renders no warning.**
`DemoExperience.tsx:284-288` · `ui/import/run-import.ts:26`

```js
const fallbackNotice = (mode: FallbackMode): string | undefined => {
  if (mode === 'unavailable') return '…'
  if (mode === 'error')       return '…'
  return undefined            // ← catches BOTH 'none' and 'guided'
}
```
For `'none'` (live succeeded) `undefined` is right. For `'guided'` — which means *the SAMPLE was substituted* — it renders nothing. `'guided'` is currently uninhabitable from production (its only producer in the entire repo is `run-import.test.ts:25`), so this is latent. But it is a landmine: the moment anyone re-adds a `live: false` path — an offline mode, a "try with sample data" button — a visitor is silently shown another case's data. The union does not force the notice decision, and the fall-through swallows any new variant.
*Fix:* make `fallbackNotice` exhaustive (`switch` with a `never` default). Separately, `'guided'` is now a test-only variant of a production union named for a deleted feature — rename to `'sample'` or delete the `live: false` branch.

**M3 — `extract-client.ts` collapses distinct failure classes into one boolean, with zero client-side logging.**
`ui/import/extract-client.ts:11-27`

Offline, blocked-by-extension, DNS failure, and a genuine 5xx from the route are all indistinguishable (`catch { return { ok: false, notConfigured: false } }`), and none is logged client-side — the route's own `console.error` only fires for requests that reach the server. Not user-facing-silent (the honest fallback notice still renders), but an operator debugging "why does every demo import show the fallback notice" cannot distinguish "no API key configured" from "every visitor's browser cannot reach our own route."
*Fix:* one `console.warn` in the catch and the non-503 else branch.

**M4 — The `reset()` contract test verifies 7 of 10 state keys; `capture` and `modal` are never dirtied or asserted.**
`engine/store/__tests__/store.test.ts:29-43` (test) · `engine/store/create-store.ts:146` (subject)

The test named "returns a dirtied store to the same empty boot state" dirties `cases`/`locations`/`view`/`drawerOpen` only. It never calls `openModal` or writes into `capture`, and never asserts either post-reset — so those assertions would pass trivially even against a `reset()` that ignored them. It is the **only** test exercising `reset()` anywhere in the repo.

Why it bites: `capture` holds in-progress DVR/OCR time-sync data. M3 wires `reset()` to a "start over" UI action. A refactor like `set((s) => ({ ...initialState(), capture: s.capture }))` would leak session state across a reset and **no test in the 715-test suite would fail** — resurrecting exactly the canned-data-persistence bug the deleted `isSeed` machinery existed to fix, in a demo whose entire premise is *"it never fills itself."*

*Fix (≈4 lines):* add `openModal('newCase')` and `updateField('capture.dvrDateTime', …)` to the dirtying block; assert `modal` is null and `capture` equals `blankCapture()` after. (`profile` correctly needs no coverage — it has no setter.)

> **Severity adjudication.** `pr-test-analyzer` filed this HIGH. Downgraded to MEDIUM by the orchestrator: `reset()` is provably correct today (`DemoState`'s 10 keys were walked key-by-key against `initialState()`'s return by two independent reviewers), it has zero callers outside this test, and the failure scenario is conditional on a future refactor. The persona's HIGH bar requires a proven concrete failure mode, not a hypothetical one. **This must be closed before M3 wires `reset()` to a button** — at which point it becomes HIGH.

### LOW

**L1 — Stale comments referencing the deleted guided tour / director.** *(4 sites)*
- `ui/demo.css:2` — "except `demoPulse`, which is new for the M3 TouchIndicator" (keyframes and component both deleted)
- `ui/primitives/useTypewriter.ts:7` — "in guided mode the director fills the store value char-by-char"
- `engine/content/seed.ts:28` — "the guided tour types into it live"
- `ui/import/run-import.ts:7-8, 22` — "guided mode", "the guided tour and tests never hit the model"

None would mislead a maintainer into a bug (all are past-tense rationale), but `run-import.ts`'s comments now actively misdescribe a live code path.

**L2 — `forwardGeocode` swallows every error class with no telemetry, and is now on 100% of traffic.**
`ui/import/geocode.ts:39-41`. The `catch { return null }` is deliberate and documented ("the location is still created, just without a pin") — a legitimate intentional-skip. Flagged only because an expired/rate-limited Mapbox token would fail identically to "no match," forever, with no signal. Pre-existing; exposure widened by this PR.

**L3 — `SplashScreen`'s `AuthState` is three-state with two dead branches, behind an unreachable screen.**
`ui/screens/SplashScreen.tsx:8, 50, 55, 56, 64` · call site `DemoExperience.tsx:457`. `AuthState = 'idle' | 'scanning' | 'authorized'` with live branches on all three; the sole call site now hardcodes `authState="idle"`, and `splash` is itself unreachable (boot moved to `cases`). Unreachability is **intentional and documented** (`02-demo-explorer-implementation-plan.md:130` — "`splash` excluded (unreachable until the deferred video entry)"). The residual dead prop states are cleanup, not defect.

**L4 — Test name still references the renamed registry.**
`ui/__tests__/motion.test.ts:29` — "…in neither TOUR_CHAPTERS nor LAUNCHABLE…". The assertion is correct; the name is stale.

## Architecture invariants checked & confirmed

- **The deletion is complete and clean.** No dangling imports of `director/`, `TouchIndicator`, or `RailNav`. `PhoneFrame.interactive` removed with zero remaining callers. `StoryRail`'s 11→1 prop reduction fully consumed. The `TOUR_CHAPTERS`→`CHAPTERS` rename is total (incl. `motion.ts`).
- **`reset: () => set(initialState())` is behaviorally correct.** `DemoState`'s 10 fields exactly match `initialState()`'s return shape; Zustand's shallow merge overwrites every one. Verified independently by `typescript-reviewer` and the orchestrator.
- **`currentChapter`'s invariant is compiler-enforced, not convention.** Written in exactly two places — `initialState()` (`:128`) and `setView` (`:216`). `launch`/`closeLaunch` (`:221-222`) touch only `view`. `set({ currentChapter: view })` would not typecheck without `isChapterId` narrowing `AppView` → `ChapterId`; the guard is load-bearing.
- **Dropping `<Suspense>` from `app/demo/page.tsx` is safe.** `useSearchParams` left with the tour; a repo-wide sweep of `features/demo/**` finds no remaining suspending hook (`useSearchParams`, `React.lazy`, `use()`). `ssr: false` means no prerender bailout either.
- **The absence tests are genuine guards, not tautologies.** `mode`, `auth`, `seedGuided`, `setMode`, `isSeed`, `SEED_CASE`/`SEED_LOCATION` were *deleted*, not made optional — the `in` checks against `getState()` and the barrel namespace would genuinely fail on reintroduction.
- **No coverage was orphaned by the deleted `DemoExperience.integration.test.tsx`.** All three tests targeted `runBeat`/`BEATS`/pulse timers exclusively. The one surviving behavior they touched — `launch('ocr')` → `closeLaunch()` returning to `currentChapter` — remains pinned at `store.test.ts:249-276`.
- **The import fallback is honest at the aggregate level.** `fallbackNotice` → `tally.notice` → `ImportResult.notice` → rendered at `ImportModal.tsx:165` (single) and `:181` (batch). The visitor's PDF is never silently swapped without *some* notice. (Per-card attribution is M1.)
- **The `fieldCount === 0` empty-reply guard correctly gates only `fallbackMode === 'none'`;** the SAMPLE fixture always has nonzero fields, so the fallback path cannot create a silently-blank location.
- **Per-file batch failures accumulate into `tally.failures` and always render** via `FailuresCard`.
- **The marketing ↔ demo import boundary holds** — no marketing file imports `@/features/demo`.
- **The test spec was followed.** Every Phase 1/2 item in `03-demo-explorer-test-spec.md` has a landed test (incl. the `closeLaunch` return-anchor pin and the `pointer-events` guard). Phases 4-7 correctly absent — out of scope for M1.

## Recommended next steps

1. **H1 — one commit.** Swap `importCancelled` for `importGen` at all four sites. Add a test: start a run, cancel, start a second run, resolve the first, assert no phantom location. This is the merge blocker.
2. **M4 — four lines.** Tighten the `reset()` test. Cheapest item on the list; hard-gate it before M3.
3. **M2 — exhaustive `fallbackNotice`.** `switch` + `never` default. Rename or delete the `'guided'` variant while you're there.
4. **M1 / M3 — fold into the M2 commit** if the import surface is already open; otherwise defer to a tracked follow-up with a concrete un-defer trigger.
5. **L1-L4 — opportunistic.** One comment-sweep commit. Prioritize `run-import.ts:7-8,22`, which misdescribes live behavior.

Items 1-2 are cheap and mechanical. Nothing here challenges the architecture of the cut — the M1 teardown is sound, and the sandbox-only model is cleanly realized.

## Agent IDs
<!-- Used by /code-review --fix-delta to resume reviewers via SendMessage. -->
- typescript-reviewer: `ts-lane@session-af1278c8`
- pr-test-analyzer: `test-lane@session-af1278c8`
- silent-failure-hunter: `silent-lane@session-af1278c8`
- type-design-analyzer: `typedesign-lane@session-af1278c8` (errored — no report delivered)

## Reviewer pipeline notes

- **The stale-base trap nearly cost the whole review.** `gh pr diff 24` returns 116 files because `origin/master` predates the local PR-#23 merge. Every lane had to be briefed with `git diff master...feat/demo-explorer` explicitly. An unbriefed fan-out would have spent four agents re-reviewing the already-approved Case-File redesign. **Always reconcile `origin/<base>` against local `<base>` before triage.**
- **Cross-lane independent identification (M1).** `silent-failure-hunter` and the orchestrator found the missing per-location fallback attribution separately. `typescript-reviewer` examined the same code and cleared it — correctly, for the question it asked (does the aggregate notice render? yes, `ImportModal.tsx:165,181`). The difference is granularity, not disagreement. Not a conflict; no Disputed section required.
- **The orchestrator caught a defect the reporting lane's own fix would have missed.** `silent-failure-hunter`'s H1 fix addressed two checkpoints; a third untokened `importCancelled.current = false` sits in `onRetry` (`:673`). Not independently exploitable, but a fix that left it in place would reintroduce the same class. *Reviewers verify findings; orchestrators should verify fixes.*
- **`type-design-analyzer` errored.** It emitted two `idle_notification`s and never delivered a report, across two explicit `SendMessage` retrievals (one full brief, one terse four-question fallback). Per the command's edge-case rule, the review continued. The lane was **carried by the orchestrator with direct verification**, and all four of its assigned questions were answered: (1) `'guided'` → **M2**; (2) `live: boolean` → a test seam, subsumed by M2, no separate finding; (3) `authState` → **L3**, and the brief's own "two-state" premise was wrong — it is three-state with two dead branches; (4) `currentChapter` → **no finding**, the invariant is compiler-enforced. A carried lane is weaker than an independent one; treat M2/L3 as single-sourced.
- **Severity adjudication was necessary once and is documented in-line.** `pr-test-analyzer`'s HIGH → MEDIUM (M4). The finding is real and well-argued; the severity presumed a future refactor rather than a present defect. Re-ranking a lane's severity should always be surfaced, never silent — the downgrade is stated with its reasoning so the owner can overrule it.
- **`silent-failure-hunter` earned its keep again.** The single HIGH in this PR is a cross-file, cross-await race that needs the call site, the cancel handler, and the fetch boundary in view simultaneously. No other lane was positioned to see it, and neither `tsc` nor 715 passing tests detect it. Do not skip this lane on "it's just a deletion PR."
- **A deletion PR is where pre-existing bugs get promoted.** Both H1 and L2 are unchanged code whose *reachability* this PR multiplied. Diff-scoped review would have missed both. When a PR removes a mode, ask what the surviving mode now carries 100% of.
