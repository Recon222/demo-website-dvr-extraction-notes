# Lane: TypeScript — parity P0 (PR #29) · FIX-DELTA ROUND 2

- **Lane:** `typescript` (TS 5.7 strict · Next 15 App Router · React 19 · demo architecture contract)
- **Mode:** FIX-DELTA round 2 (re-review of the round-2 fix commits only; this file overwrites the round-1 fix-delta content)
- **Diff under review:** `git diff master...feat/parity-p0` — 83 files, +5868 / −227. **Round-2 fix set = everything after merge `f69aa92`**: 23 files, +438 / −56 (branches `parity/p0-fix2-store`, `parity/p0-fix2-boundary`, `parity/p0-fix2-options`).
- **Refs read:**
  - `.claude/agents/typescript-reviewer.md` (lane definition — authoritative)
  - `features/demo/CLAUDE.md` (binding contract, incl. its round-2 barrel amendment) + root `CLAUDE.md`
  - `docs/code-reviews/parity/p0/p0-review-fixdelta.md` (vetted aggregate — R-19 … R-30)
  - prior `docs/code-reviews/parity/p0/lane-typescript.md` (round-1 fix-delta: TYPESCRIPT-N1 = R-19, TYPESCRIPT-N2 = R-20 — now superseded)
  - every round-2 file read in full (all 23): `engine/store/create-store.ts`, `engine/store/persistence.ts`, `engine/store/selectors.ts`, `engine/index.ts`, `engine/content/form-options.ts`, `ui/DemoExperience.tsx`, `ui/clear-demo-snapshot.ts`, `ui/glass-tokens.ts`, `features/demo/index.ts`, `app/demo/error.tsx`, `app/css/style.css`, the five touched test files, and the five docs. Plus the consumers that close each loop: `ui/screens/CompletionScreen.tsx`, `ui/screens/CasesScreen.tsx`, `engine/content/explore.ts`, `engine/logic/import.ts`, `components/marketing/__tests__/phone-frame.test.tsx`.
- **Out of scope per orchestrator:** R-1…R-18 (CLOSED). Deliberate choices standing from both prior rounds (deferred §29–§32, class boundary, sessionStorage per D2, phone-verified asymmetries, "Location Complete" copy, the deliberately-not-adopted `completeCase(locationId)` reshape logged as a §29 addendum trigger).

## Gates re-run on the round-2 head (`51a3da7`)

| Gate | Result |
|---|---|
| `pnpm exec tsc --noEmit` | **clean**, zero diagnostics |
| `pnpm build` (`next build`) | **clean**; `/demo` First Load JS still **107 kB** — the barrel widening + dynamic import did not move it |
| `pnpm exec vitest run` | **904/904 pass, 120/120 files**, 48.6 s (was 890/119; +14 tests, +1 file — all round-2 additions) |
| Store-bridge sweep (`grep -rn "useStore" features/demo/ui`) | **preserved** — zero hits outside `DemoExperience.tsx` |
| Engine purity | **preserved** — the new `selectors.ts` warn and `persistence.ts` `clearSnapshot` use only `console` + `process.env.NODE_ENV` (the established `generateExtractedScopes` precedent); no React import, no `'use client'`, no module-scope `window`/`document` under `engine/`. `ui/clear-demo-snapshot.ts` reads `window.sessionStorage` — it is UI-layer and `'use client'`, and the access is `try`-wrapped |
| Single barrel | **widened deliberately and documented** — `features/demo/index.ts:6` adds `clearDemoSnapshot`; `features/demo/CLAUDE.md:37-48` states the reason and the consumer. `app/demo/error.tsx:58` imports the **barrel**, not a deep path. No new `@/features/demo/ui/...` or `.../engine/...` import from `app/`/`components/`/`lib/` (the pre-existing `app/api/extract/route.ts:20` is untouched) |
| Marketing↔demo isolation | **preserved** — the guard (`components/marketing/__tests__/phone-frame.test.tsx:57`) targets `components/marketing/phone-frame.tsx`; `app/demo/**` is not marketing and does not ship into marketing routes (build table above confirms `/` still 121 kB, `/beta` 111 kB) |
| Determinism seam | **preserved** — grep over the round-2 `^+` lines: zero `Date.now()`, `Math.random()`, `console.log`, `any`, `as any`, non-null assertions |
| `isolatedModules` | correct — `create-store.ts:3` imports `COORD_SOURCES`/`GPS_SOURCES` as values but uses them only in `typeof` positions, which elides cleanly; `engine/types/index.ts` has no imports at all, so no value cycle is created |
| Dev-only breadcrumbs stripped from prod | verified — `grep -rl "non-canonical scope" .next/static/chunks/` and the same for `snapshot write failed` both return nothing |

---

# Fix-delta — prior findings (R-19 … R-30)

| Prior | Lane origin | Verdict | Fix commit |
|---|---|---|---|
| **R-19** (MAJOR) | **this lane** (TYPESCRIPT-N1) + silent-failures + type-design | **FIXED** | `b86cd46` |
| **R-20** (MINOR) | **this lane** (TYPESCRIPT-N2) + type-design | **FIXED** | `e182186` |
| R-21 (MINOR) | tests | **FIXED** | `e8621bd` |
| R-22 (MINOR) | tests | **FIXED** | `4abad16` |
| R-23 (MINOR) | web | **FIXED** | `c4cf8b4` |
| R-24 (MINOR) | web + silent-failures | **FIXED** | `480321a` |
| R-25 (MINOR) | web | **FIXED** | `207963f` |
| R-26 (MINOR) | silent-failures | **FIXED** | `8a4dd55` |
| R-27 (MINOR) | silent-failures | **FIXED** (option (a) + ledger re-scope) | `c41c5ae` |
| R-28 (MINOR) | type-design (+ this lane, noted-not-filed) | **FIXED** | `6566531` |
| R-29 (MINOR) | type-design | **FIXED** | `ac4cb5e` |
| R-30 (MINOR) | type-design | **FIXED** | `7ef5608` |

**12/12 FIXED. No PARTIAL, no UNFIXED.** Details below; the two this lane owns are verified end-to-end, the rest are spot-checks weighted to TS-relevance.

## R-19 (was TYPESCRIPT-N1) — [FIXED] completion gate keys on the open location

`b86cd46` landed **all three** converged remedies, not just the mandated bridge fix:

1. **Bridge (the mandated ~5 lines).** `DemoExperience.tsx:735` — `canComplete={!!currentLocation}`; `:741-746` — `onComplete` resolves `loc = st.locations.find(l => l.id === st.currentLocationId)` and calls `st.completeCase(loc.caseId)`. `currentCaseId` no longer participates in the gate **or** the action. I re-traced the store side: `completeCase`'s guard (`create-store.ts:229`, `l.id === s.currentLocationId && l.caseId === caseId`) is now satisfied *by construction* on every call from the bridge — `loc.id === currentLocationId` by the lookup and `loc.caseId === caseId` by derivation — so the stamp can never miss while the case greens. The dead-button arm and the wrong-case-green arm are both closed at the source.
2. **Store invariant restored at the source (the optional half).** `create-store.ts:219` — `createCase` now also writes `currentLocationId: null`; `:259-260` — `addLocation` writes **both** halves (`currentLocationId: id, currentCaseId: caseId`). With `switchLocation` (`:268`) that makes all three selection writers coherent. I checked every writer: `create-store.ts` lines 156-157 (initial), 219, 259-260, 268 are the complete set (grep on `currentCaseId|currentLocationId`), and `reset()` returns to `initialState()` (both null).
3. **The secondary I filed is resolved by removal.** The wrong disabled hint (`CompletionScreen.tsx:100`, `title="Open a location first"`) is now exactly true: the case is no longer a disabling condition, so "no location open" is the only reachable disabled cause.

**Regression tests present and meaningful:** `store.test.ts:251-268` (both new invariants, incl. "adding to a non-current case moves the case selection with it"); `DemoExperience.sandbox.test.tsx` adds the mandated rail-jump case (button **disabled**, neither case greens, location not stamped) *and* a defense-in-depth case that forces the incoherent pair via `store.setState` and asserts the location's own case greens, the other stays `'draft'`, and the confirmation renders. The second test is the one that would fail if only the store were fixed and the bridge reverted — it pins the derivation, which is what TESTS-7 asked for.

**Reachability re-swept after the fix.** The R-19 repro (create A + L1 → create B → rail-jump to Completion) now terminates in a disabled button with a truthful hint. I re-walked the rail path (`explore.ts:42` `jumpTo: d.id` → `ExploreChecklist.tsx:73` → `DemoExperience.tsx` `onJump` → `setView`) and the Cases path (`CasesScreen.tsx:70` "Add Location" on any expanded case → `addLocation` → both halves) — neither can now reach a cross-case pair.

**Deviation from the aggregate's literal test mandate, judged correct.** The doc asked the regression test to assert "the confirmation appears / L1 is stamped / A is complete". Because remedy (2) also landed, `createCase(B)` clears the location, so the honest outcome at that point is a *disabled* button — the test asserts that instead, and the confirmation/stamp assertions live in the forced-pair test. Both halves of the mandate are covered; nothing was quietly dropped.

## R-20 (was TYPESCRIPT-N2) — [FIXED] dead `optionValues` export removed

`e182186` deleted the helper outright (`engine/content/form-options.ts` — the 5-line function is gone) and its barrel line (`engine/index.ts:35`). Verified by grep over `features app lib components docs`: the only surviving mentions are two comments and the pin. `barrel.test.ts:14` now asserts `'FORM_OPTIONS'` and `'optionValues'` are absent from the runtime surface; `form-options.test.ts:17` replaced the helper with a test-local `valuesOf`. The R-17 mutable-`string[]`-return half is resolved by removal, as the orchestrator noted. `engine/logic/import.ts:199-202`'s tombstone points at `engine/content/form-options` (the module), not at the deleted helper — so no stale pointer was left behind.

## Cross-lane spot-checks (verified here because each is pure TS/TSX)

- **R-21 FIXED** (`e8621bd`) — `reviewAgain: boolean` → `reviewAgainFor: string | null` (`DemoExperience.tsx:212`), gate `:728` `reviewAgainFor !== currentLocation?.id`, setter `:747` `setReviewAgainFor(store.getState().currentLocationId)`. Null-safety re-derived by hand: with `currentLocation === null` the comparison is `null !== undefined` → `true`, and the left operand is `false`, so `isComplete` is `false` — no crash, no false confirmation. Id reuse (which would make a stale key collide) is impossible: `seq` is a `createDemoStore` closure that `reset()` does not touch (`create-store.ts:186-187, 194`) and is seeded past every rehydrated id via `maxIdSeq`. Two new sandbox tests pin both directions.
- **R-22 FIXED** (`4abad16`) — `sandbox.test.tsx:98` back to strict `getByText('Complete')` plus the expanded-card `toHaveLength(2)` that pins both payoff halves.
- **R-23 FIXED** (`c4cf8b4`) — `demo-inventory.md:26` rewritten to what shipped; `.claude/agents/web-reviewer.md:70` moves `sessionStorage` into the guarded-APIs table and keeps `localStorage` on the not-in-use list with the D2 rejection stated.
- **R-24 FIXED** (`480321a`) — `clearSnapshot(storage)` added in the engine (`persistence.ts:441-450`, injected storage, dev breadcrumb, never throws), wrapped by `ui/clear-demo-snapshot.ts` (property-access `try` for Safari private mode), exported from the barrel, consumed by `app/demo/error.tsx:56-64` via `await import('@/features/demo')` inside the handler with a `catch` that degrades to a plain `reset()`. I verified the escape actually escapes: `dispose()` unsubscribes **then** flushes (`persistence.ts:515-518`), so once the boundary has unmounted the subtree no further write can race the clear, and the remount's `loadSnapshot` (`DemoExperience.tsx:162`) finds nothing. Barrel widening is documented in `features/demo/CLAUDE.md`; First Load JS unmoved.
- **R-25 FIXED** (`207963f`) — three `@theme` mirrors in `app/css/style.css:46-48` with a two-way cross-reference (`glass-tokens.ts:17-20`). I confirmed the utilities actually compile rather than trusting the class names: `.bg-demo-error\/6`, `.border-demo-error\/30` and `.from-demo-accent-from` are all present in `.next/static/css/4c3b72a8e8394b0c.css`, and `border-input` resolves to the existing `--color-input`.
- **R-26 FIXED** (`8a4dd55`) — `persistence.ts:486` `catch (e)` with `e` bound into the warn at `:494`; the test asserts `expect.objectContaining({ message: 'QuotaExceededError' })`.
- **R-27 FIXED, option (a)** (`c41c5ae`) — `selectors.ts:69-95` counts drops and dev-warns; `deferred.md` §15 struck the `selectors.ts` half and re-scoped the trigger to `time.ts` only. See **TYPESCRIPT-1** for a residual on *where* the new warn is emitted.
- **R-28 FIXED** (`6566531`) — `FullShapeIn<T>` at `persistence.ts:105-107` applied to the last literal (`:319`). I re-derived the variance by hand rather than trusting the probe: `Input` occurs in `ZodType` only in covariant position (`_input`), so widening it to `unknown` disables input checking while `Output` still must satisfy `Required<T>[K] | undefined` and `-?` still forces every key — including a future *optional* `PersistedState` key — to appear. `PersistedState` is a 9-key `Pick` (`create-store.ts:133-144`) and the schema has exactly those 9.
- **R-29 FIXED** (`ac4cb5e`) — `create-store.ts:42` `(typeof COORD_SOURCES)[number]`, `:59` `Exclude<(typeof GPS_SOURCES)[number], 'gps'>`. No import cycle introduced (`engine/types/index.ts` imports nothing).
- **R-30 FIXED** (`7ef5608`) — `persistence.ts:91-103` names the widening direction, its runtime consequence (the wipe path), and the load-bearing "new closed unions MUST be `as const` tuples … consumed via `z.enum(TUPLE)`" rule.

---

# New findings (fix-introduced, inside the round-2 blast radius)

## TYPESCRIPT-1 [MINOR] features/demo/engine/store/selectors.ts:93

**Claim.** R-27's fix put its dev breadcrumb inside `selectAdjustedScopes`, which is a **render-scope** function — `DemoExperience.tsx:642` calls it as a prop value inside `activeScreen()`, and `activeScreen()` is invoked directly in JSX (`:839`, no memo). So the warn does not fire once per drop event the way its cited model does; it fires **once per render** of the Time Offset screen, with an identical fixed line. Typing a 19-character timestamp into the DVR field re-renders on every keystroke (`capture` is a subscribed slice, `:178`), producing ~19 identical `[demo] selectAdjustedScopes left 1 non-canonical scope(s) blank` lines that a reader cannot distinguish from 19 separate drops. That is the same "re-warn loop is only diagnosable when the line says why" problem `8a4dd55` (R-26) fixed one commit earlier in this round — and here the `catch` binds no error and the message names no scope id, so there is nothing to disambiguate the repeats by.

**Evidence.**
- `features/demo/engine/store/selectors.ts:66-96` — `dropped` is counted inside the `.map()` and warned at `:93-95`, i.e. on every invocation of the selector.
- `features/demo/ui/DemoExperience.tsx:642` — `correctedScopes={selectAdjustedScopes(store.getState())}` inside `case 'timeOffset':`; `:839` — `{activeScreen()}` rendered inline; `:178` — `const capture = useStore(store, (s) => s.capture)`, and `TimeOffsetScreen`'s `onChangeDvr` writes `capture.dvrDateTime` per keystroke (`:631`).
- The cited precedent is call-shape-different: `create-store.ts:354`'s identical-content warn lives in `generateExtractedScopes`, an **action** — one invocation, one line.
- `features/demo/engine/store/selectors.ts:79` — `} catch {` binds nothing, so the parse error that R-26 argued must be surfaced is discarded here in brand-new code.

**Blast radius / why MINOR.** Dev-only and confirmed dead-code-eliminated in production (`grep -rl "non-canonical scope" .next/static/chunks/` → no match), and the visitor is not lied to (`adjustedScopesPartial` still surfaces the drop in the document). This is operator-ergonomics, not correctness.

**Suggested fix.** Any one of: (a) emit from `calculateOffset` (action scope, matching `generateExtractedScopes`) and leave the selector silent; (b) keep it here but make the repeats self-identifying — bind the error and name the ids, e.g. `catch (e) { dropped.push(sc.id) }` then `console.warn('[demo] selectAdjustedScopes left scope(s) blank:', dropped.join(', '), lastErr)`; or (c) if per-render repetition is accepted, say so in the comment at `:77-80` so the next reader doesn't file it as a loop bug.

**Confidence.** High — the render-scope call site is unambiguous (`:642` is a prop value, not a callback), and the per-keystroke re-render path is traced through a subscribed slice.

---

## TYPESCRIPT-2 [MINOR] features/demo/ui/DemoExperience.tsx:730

**Claim.** The R-19 fix's own rationale comment states an invariant the **same commit** invalidated: "currentCaseId can lag the location (**only switchLocation writes both**)". As of `b86cd46`, `addLocation` writes both (`create-store.ts:259-260`) and `createCase` clears the location half (`:219`) — and the store-side comment three lines above those writes asserts the opposite of the bridge comment: "No action leaves the pair pointing across cases" (`:216-218`). Two load-bearing invariant comments introduced in one commit now contradict each other. A maintainer trusting `:730` would conclude the store still emits incoherent pairs; one trusting `create-store.ts:218` would conclude the bridge's defensive derivation is dead weight and could "simplify" it back to `currentCaseId` — re-introducing R-19 exactly.

**Evidence.**
- `features/demo/ui/DemoExperience.tsx:729-734` — the comment block, present tense parenthetical at `:730`.
- `features/demo/engine/store/create-store.ts:216-219` and `:257-260` — the two writes that falsify it, added by the same commit.

**Suggested fix.** One line: reword `:730` to past tense and name the current state, e.g. *"before `b86cd46` only `switchLocation` wrote both halves, so trusting `currentCaseId` greened an unrelated case; all three writers are coherent now and this derivation is defense-in-depth for the one construction path that is not an action — rehydration (see TYPESCRIPT-3)."* Keep the defensive code either way.

**Confidence.** High — both comments read in full, both claims checked against the complete list of selection writers (grep on `currentCaseId|currentLocationId` in `create-store.ts`).

---

## TYPESCRIPT-3 [MINOR] features/demo/engine/store/persistence.ts:409

**Claim.** `b86cd46` establishes a new store invariant ("No action leaves the pair pointing across cases", `create-store.ts:218`) and enforces it in all three actions — but **rehydration is a construction path that is not an action**, and `loadSnapshot` still validates the two selection ids **independently, by existence only**. A snapshot whose `currentLocationId` resolves to a location of case A while `currentCaseId` resolves to a *different* existing case B passes both checks unchanged, so the exact pair R-19 was raised about is still constructible on boot. The completion flow itself is safe (the bridge now derives the case from the location), but the other `currentCaseId` readers are not: `DemoExperience.tsx:713` renders `occNumber: currentCase?.caseNumber` in the Completion summary, so the screen would show case **B**'s occurrence number in the header while "Complete & Save" correctly greens case **A** — a quiet contradiction on the one screen the court PDF is generated from. This is the natural completion of the R-15 repair pass, which already treats the loader as the place where selection integrity is restored.

**Evidence.**
- `features/demo/engine/store/persistence.ts:407-411` — `caseIds.has(...)` / `locationIds.has(...)`; no `loc.caseId` comparison anywhere in the repair block (`:404-418` handles only dangling ids and the wizard-view rewrite).
- `features/demo/engine/store/create-store.ts:216-218` — the invariant claim scoped to "actions".
- `features/demo/ui/DemoExperience.tsx:713` — the surviving `currentCaseId` reader on the Completion screen; `:357`, `:450`, `:472` (`targetCaseId ?? currentCaseId`) are additional readers, currently shielded because every modal entry point sets `targetCaseId`.
- The loader's own docstring (`:353-356`) states the principle this misses: "a `currentCaseId`/`currentLocationId` that resolves to no entity is dropped" — resolution, not coherence.

**Reachability, stated honestly.** Not reachable through the UI today: `snapshotOf` writes whatever the store holds, and the store now holds only coherent pairs. It needs a hand-edited `sessionStorage` value (devtools) or a future build that writes the pair from a new path. That is why this is MINOR and not MAJOR — but it is cheap insurance on an invariant this round just paid to establish, and the loader is the only construction path left uncovered.

**Suggested fix.** Two lines in the repair block, after `:411`:
```ts
const openLoc = currentLocationId === null ? null : d.locations.find((l) => l.id === currentLocationId) ?? null
const coherentCaseId = openLoc ? openLoc.caseId : currentCaseId
```
and return `coherentCaseId`. Deriving the case from the open location mirrors the bridge's R-19 fix exactly, so both construction paths obey one rule. Add a line to the loader docstring's "three deliberate load-time adjustments" list.

**Confidence.** High on the code facts (the repair block contains no coherence check); medium on whether the team wants it now, given adversarial-only reachability — an explicit "rehydration is exempt, the bridge defends" note in `create-store.ts:216-218` would be an acceptable alternative resolution.

---

## Things checked and deliberately NOT filed

- **`createCase` clearing `currentLocationId` opens a new route into a "wizard screen with no location" state**, where `updateField` silently no-ops (`create-store.ts:277-278`) — the exact hazard `loadSnapshot` repairs on boot (`persistence.ts:353-356, 415-418`). Not filed: the New Case modal is reachable **only** from the Cases screen (`CasesScreen.tsx:22` → `DemoExperience.tsx:573`), so after creation `view === 'cases'` and `currentChapter === 'cases'` — the same shape the loader considers valid. The dead-form state is reachable identically from the empty boot (rail-jump to any wizard step with zero locations), so it is pre-existing, not fix-introduced, and belongs to `silent-failure-hunter` if anyone wants it.
- **`addLocation` now moving `currentCaseId`** changes behaviour for "Add Location"/"Import" on a non-current expanded case, and for the import pipeline (`applySuccess`, `DemoExperience.tsx:399`). Traced all callers — every one passes the case it is targeting, so the move is always toward coherence. Correct, not a regression.
- **`app/demo/error.tsx:56-64`'s `async` onClick calls `reset()` outside the `try`.** A throw from `reset()` would surface as an unhandled rejection rather than a catchable error (the "Try again" button's `onClick={reset}` does not have this shape). `reset` is React's own segment-reset setter; a throw is not a realistic input. Noted, not filed.
- **`ui/clear-demo-snapshot.ts:15-20` re-implements `sessionStorageOrNull`** (`DemoExperience.tsx:108`, module-local and unexported). Five duplicated lines, deliberate per the file's comment, and hoisting it would couple the tiny module to the 900-line bridge. Not worth a finding.
- **`Exclude<(typeof GPS_SOURCES)[number], 'gps'>` silently widens if `'gps'` is ever removed from the tuple** (`Exclude` of an absent member is a no-op). Theoretical, and the narrowing is documented at `create-store.ts:57-58`. `type-design-analyzer`'s call if anyone wants a `satisfies`-backed form.
- **`FullShapeIn` is strictly weaker than `FullShape`** (input checking disabled) and could be mis-applied to a non-refined shape, losing a check. The docstring (`persistence.ts:100-103`) scopes it to the refine case explicitly. Adequate.
- **Barrel widening itself.** `features/demo/index.ts` gaining a second export is exactly the "new export bolted onto the barrel" the lane brief flags — but it carries a stated reason, is documented in the binding `features/demo/CLAUDE.md`, has a single named consumer, and was the aggregate's own suggested fix for R-24. Compliant.
- **Out of lane:** the `color-mix(in oklab, …)` vs `rgba()` rendering equivalence and the error page's focus order (`web-reviewer`); the disabled-button `title` as the only disabled affordance (`web-reviewer`); whether the R-19 regression test should *also* assert the confirmation on the non-disabled path (`test-analyzer` — the forced-pair test covers it); `optionValues`' deletion as a type-design decision (`type-design-analyzer`, resolved by removal).

## Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 0 |
| MINOR | 3 |

Prior findings owned by this lane: **R-19 FIXED, R-20 FIXED** (2/2).
Cross-lane spot-checks in this lane's blast radius: **R-21 … R-30 all FIXED** (10/10). No PARTIAL, no UNFIXED across R-19…R-30.

Store-bridge integrity: **preserved**
Engine purity: **preserved**
Barrel + marketing/demo isolation: **preserved** (barrel widened deliberately, documented, single consumer)
Determinism seam: **preserved**

**Verdict:** APPROVE with comments — the round-2 fix set closes every prior finding, several beyond what was asked (R-19 took all three converged remedies; R-20 by deletion), and the gates are green on the fix head (`tsc` clean, `next build` clean, 904/904 tests, `/demo` 107 kB). The three new MINORs are residuals of the fixes themselves — a breadcrumb emitted from render scope, one stale invariant parenthetical, and the one construction path the new selection invariant does not yet cover. None gates the merge.
