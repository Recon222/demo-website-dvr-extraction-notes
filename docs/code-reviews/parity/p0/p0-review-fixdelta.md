# Parity phase P0 — aggregated review (vetted) — FIX-DELTA

- **Phase:** p0 (`feat/parity-p0`, PR #29)
- **Mode:** FIX-DELTA (re-review of the fix round on top of the vetted initial review)
- **Date:** p0 (phase id — no timestamp)
- **Diff:** `git diff master...feat/parity-p0` — 74 files, +4915 / −206; fix round = everything after review merge `165de2b`: 32 files, +851 / −187 (branches `parity/p0-fix-boundary`, `parity/p0-fix-options`, `parity/p0-fix-store`)
- **Prior vetted review:** `docs/code-reviews/parity/p0/p0-review.md` (R-1 … R-18)
- **Lanes aggregated:** typescript, web, tests, silent-failures, type-design (all five fix-delta lane files read in full; inventory at the end)
- **Binding contracts applied:** `features/demo/CLAUDE.md`, `docs/planning/demo-phone-parity/01-master-parity-plan.md` §4 (incl. the honesty rule), `docs/code-reviews/deferred.md` §29–§32
- **Aggregator spot-checks:** the single MAJOR (R-19) was independently re-verified end-to-end against the worktree — `canComplete`/`onComplete` wiring (`DemoExperience.tsx:727-737`), `completeCase`'s two-write shape and `createCase`/`addLocation` leaving the selection pair incoherent (`create-store.ts:215, 224-228, 250-254, 258-262`), and the rail-jump reachability (`explore.ts:42` spreading `DRAWER_DEFS` with `jumpTo: d.id` → `ExploreChecklist.tsx:73` → `DemoExperience.tsx:875` `setView`). MINORs were sampled and all held: the un-bound `catch {}` + fixed-string warn (`persistence.ts:449-456`), `optionValues`' zero production consumers (grep: declaration + barrel line only), the hardcoded colour literals in `app/demo/error.tsx:25,33,41`, the contradictory `demo-inventory.md:26` row, and the loosened `getAllByText('Complete')` assertion (`sandbox.test.tsx:98`).

## Verdict

**APPROVE-WITH-FIXES** — 0 BLOCKER · 1 MAJOR · 11 MINOR.

All 18 prior findings are **FIXED** — no PARTIAL, no UNFIXED — and every lane's probe/gate evidence supports that (several fixes were probe-verified red against the pre-fix code by the tests lane). The gates are healthy on the fix head: `tsc --noEmit` clean, `next build` clean, full vitest suite **890/890 green** (the R-6 timeout flake did not reproduce, including under `--coverage`), `/demo` First Load JS unchanged at 107 kB, and the store-bridge / engine-purity / barrel-isolation / determinism sweeps all preserved.

One thing gates the merge: **R-19**, a selection-coherence defect introduced by the R-1 fix itself, independently discovered by three lanes (typescript, silent-failures, type-design). It re-opens the exact silent-no-op / fake-success class R-1 was raised to close, but the fix is ~5 lines in the bridge plus one regression test — no re-architecture. The 11 MINORs are residuals and opportunistic hardening; none gates individually.

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 1 |
| MINOR | 11 |

## Prior findings — final status

| Prior | Sev (initial) | Status | Evidence / residual |
|---|---|---|---|
| R-1 | BLOCKER | **FIXED** | `5c319e4` — location-scoped gate (`LocationForm.completed`), PDF one-shot closed via "Review / Export again", G3/G4 contradiction resolved (`selectors.ts:196`), snapshot v1→v2. Verified by typescript + silent-failures, pinned by store + sandbox tests. **Fix introduced R-19**; two test-gap residuals → R-21, R-22 |
| R-2 | MAJOR | **FIXED** | `c78ee30` — id-keyed `Record<string, boolean>`, functional updaters, review-authorized seeding. Probe-verified red by tests lane (all 3 new tests fail on the reverted code). Verified by all five lanes |
| R-3 | MAJOR | **FIXED** | `e950de6` — storage clears in both hooks + boot-premise assertions; probe-verified red (2/3 tests fail with the clears removed) |
| R-4 | MAJOR | **FIXED** | `cf96bb5` — all 8 unions single-sourced as `as const` tuples, `FullShape<T>` `satisfies` on every nested shape (probe-verified: all three drift directions now compile errors), `EXTRA_VIEWS` exhaustive record, header softened, maximal round-trip runtime pin. Residuals → R-28, R-30 |
| R-5 | MINOR | **FIXED** | `02b6a6c` — `app/demo/error.tsx` outer net (correct Next 15 signature, isolation intact) + narrowed in-frame comment. Residual → R-24 |
| R-6 | MINOR | **FIXED** | `bb0f4a4` + `c78ee30` — `{ timeout: 20000 }` on all six heavy suites + `vi.setConfig` in `option-parity`; coverage run now 0 timeouts (was 3) |
| R-7 | MINOR | **FIXED** | `2f08830` — `Object.prototype.hasOwnProperty.call(MODAL_IDS, v)`; probe-verified red |
| R-8 | MINOR | **FIXED** | `c0b3607` — `autoFocus` on "Return to Cases", pinned by `toHaveFocus()` test |
| R-9 | MINOR | **FIXED** | `3967198` — deferred §32 records the zod trade in full; inventory Validation row corrected. Residual (adjacent row + lane brief) → R-23 |
| R-10 | MINOR | **FIXED** | `5ee1672` — `aria-labelledby` label+value ids via `useId()`; selection now in the accessible name; 3 new pinning tests; ~15 queries migrated safely (cross-match checked per screen) |
| R-11 | MINOR | **FIXED** | `a0ec7f6` — option (a): `FORM_OPTIONS` + self-comparison describe deleted, docstring corrected. Residual (orphaned `optionValues`) → R-20 |
| R-12 | MINOR | **FIXED** | `a07470e` — both injected-store guards pinned; persist guard probe-verified red |
| R-13 | MINOR | **FIXED** | `a07470e` — throwing-accessor descriptor test, `finally`-restored; probe-verified red |
| R-14 | MINOR | **FIXED** | `cd6b539` — dev-gated warn + best-effort `removeItem` (nested try); stale-snapshot-clear test probe-verified red. Residual → R-26 |
| R-15 | MINOR | **FIXED** | `c03b92b` — selection-integrity pass; branch orderings re-derived independently by two lanes (repair-before-read is correct, `'cases'` fallback cannot re-trigger); 3 pinning tests probe-verified red |
| R-16 | MINOR | **FIXED** | `4b4f06c` — `Partial<Record<AppView, string>>`, type-only import, `?? GENERIC_COPY` retained |
| R-17 | MINOR | **FIXED** | `a0ec7f6` — fixed by deletion (mooted with R-11). Residual (mutable return on the surviving helper) folded into R-20 |
| R-18 | MINOR | **FIXED** | `65faab0` — casts replaced by explicitly-typed locals (stronger than asked) |

## New findings table

IDs continue from the prior vetted doc (R-1…R-18) so references stay unambiguous.

| ID | Sev | Where | Claim | Lenses |
|---|---|---|---|---|
| R-19 | MAJOR | `features/demo/ui/DemoExperience.tsx:727` | R-1's fix gates "Complete & Save" on a null-only predicate while the store can hold an incoherent `currentCaseId`/`currentLocationId` pair (created by ordinary `createCase`/`addLocation`); reachable via rail-jump — the tap greens an unrelated case, stamps no location, shows nothing | typescript, silent-failures, type-design (tests' untested-guard MINOR folded in) |
| R-20 | MINOR | `features/demo/engine/index.ts:35` | `FORM_OPTIONS` deletion orphaned `optionValues` — a dead export on the public engine barrel, still returning mutable `string[]` (the surviving half of R-17) | typescript, type-design |
| R-21 | MINOR | `features/demo/ui/DemoExperience.tsx:323` | The `reviewAgain` reset in `openLocation` — the only thing location-scoping the flag — has no test; deleting it leaves the entire demo suite green | tests |
| R-22 | MINOR | `features/demo/ui/__tests__/DemoExperience.sandbox.test.tsx:98` | The R-1 commit loosened the G4 arc assertion to `getAllByText('Complete').length > 0` unnecessarily (strict form still passes) — weak enough to survive the G3/G4 contradiction the same commit fixed | tests |
| R-23 | MINOR | `docs/planning/demo-phone-parity/demo-inventory.md:26` | The State-row still claims "no persistence at all" one line above the R-9-corrected Validation row; `web-reviewer.md:71` still lists storage as "not in use yet" (the lane-brief half of R-9's fix did not land) | web |
| R-24 | MINOR | `app/demo/error.tsx:40` | The outer net's only recovery is `reset()`, which re-runs `loadSnapshot` on the same snapshot — and the boundary's own activation flushes the throwing state to storage first, so a state-driven throw can never be escaped in-page | web, silent-failures |
| R-25 | MINOR | `app/demo/error.tsx:25,33,41` | Re-hardcodes four P0.5 glass-token colour literals one directory outside the token guard test's scan root, in Tailwind arbitrary-value syntax the guard can't see | web |
| R-26 | MINOR | `features/demo/engine/store/persistence.ts:449` | R-14's breadcrumb binds no error (`catch {`) — quota-exceeded vs storage-blocked collapse into one fixed log line, diverging from the `geocode.ts:43` convention R-14 itself cited | silent-failures |
| R-27 | MINOR | `features/demo/engine/store/selectors.ts:77` | Deferred §15's un-defer trigger ("next time `selectors.ts` is touched") fired — `5c319e4` edits the file; the silent `catch` breadcrumb gap must be fixed now or §15's trigger explicitly re-scoped | silent-failures |
| R-28 | MINOR | `features/demo/engine/store/persistence.ts:291` | `persistedStateSchema` is the one shape literal with neither `z.ZodType<T>` annotation nor `satisfies FullShape<T>` — an optional `PersistedState` addition is silent in all three guard spots (needs the probe-verified `FullShapeIn` variant to compile past the `refine()`'d fields) | type-design, typescript |
| R-29 | MINOR | `features/demo/engine/store/create-store.ts:41` | The R-4a single-sourcing skipped the two coordinate-`source` unions in the same file — hand-typed copies of `COORD_SOURCES`/`GPS_SOURCES` (the deliberate `gps` narrowing should be `Exclude<…, 'gps'>` so the compiler sees the relationship) | type-design |
| R-30 | MINOR | `features/demo/engine/store/persistence.ts:91` | The rewritten guard header's "NOT enforced" list omits field *widening* (probe-verified silent: `\| null`, non-tuple union growth) — and the "new unions MUST be `as const` tuples" rule is written nowhere | type-design |

---

## R-19 [MAJOR] Completion gate trusts an incoherent `currentCaseId`/`currentLocationId` pair — dead button plus wrong-case green, introduced by the R-1 fix

**Where:** `features/demo/ui/DemoExperience.tsx:727` (`canComplete`), `:733-737` (`onComplete`); `features/demo/engine/store/create-store.ts:215` (`createCase`), `:224-228` (`completeCase`), `:250-254` (`addLocation`); reachability via `engine/content/explore.ts:42` → `ui/controls/ExploreChecklist.tsx:73` → `DemoExperience.tsx:875`.

**Lenses:** typescript (TYPESCRIPT-N1, MAJOR), silent-failures (SF-6, MAJOR), type-design (TYPE-DESIGN-A, MAJOR) — three independent discoveries of the same defect, unified here; the tests lane's TESTS-7 (the `canComplete` bridge computation is untested — hardcoding it `true` leaves 769 tests green) is folded in as this finding's test requirement, mirroring how TESTS-5 was folded into R-2. All four writeups agree at every file:line; the aggregator re-verified each link directly (see spot-checks above).

**Claim.** The R-1 fix added a cross-case guard inside `completeCase` (`l.id === s.currentLocationId && l.caseId === caseId`) and gated the button with `canComplete={!!currentLocation && !!currentCase}` — existence only, never coherence. The store itself produces the incoherent pair through ordinary actions: `createCase` sets `currentCaseId` and leaves `currentLocationId` pointing at the previous case's location; `addLocation` is the mirror image (sets `currentLocationId`, never `currentCaseId`; the Cases screen offers "Add Location" on *any* expanded case via `targetCaseId`). Only `switchLocation` writes both. The Completion screen is reachable without `switchLocation` — every rail checklist row jump-wires straight to `setView`, which touches no selection id. In the incoherent state, "Complete & Save" is enabled and the tap: (a) flips an **unrelated case** (usually empty, "0 locations") to green "Complete" on the Cases/Dashboard cards; (b) stamps **no** location, so `isComplete` stays false and the screen doesn't change — a dead primary CTA; or, if the open location was completed earlier, (c) shows a convincing success card while a different case is silently greened — a fake success. That is precisely the honesty-rule failure (plan §4) the aggregator used to justify R-1's BLOCKER, re-opened by R-1's own fix.

**Repro (5 ordinary interactions, verified against the code).** Cases → New Case (A) → expand A → Add Location (L1) → New Case (B). Now `currentCaseId = B`, `currentLocationId = L1` (`caseId` A). Rail → "Completion" row → "Complete & Save". Observed: empty case B renders the green "Complete" chip beside "0 locations"; L1 untouched; screen unchanged; console silent; repeat taps do nothing.

**Why MAJOR, not BLOCKER (severity settled — all three lanes agreed).** Recoverable in-session (returning through Cases → any location row repairs the pair via `switchLocation`), no data is lost, and the coherent-pair flow — the path every scripted demo walk takes — is fully correct. But it is a regression in kind: before `5c319e4` the same state produced visible (if wrong) feedback; now it produces nothing. The fix round's own `store.test.ts` ("never stamps a location belonging to a different case") pins the *store* half as correct — the bridge is what passes the wrong case id.

**Why the fix-round tests missed it.** All R-1 tests drive the pair through `switchLocation`, which keeps it coherent; and `onComplete` still guards with `if (id)`, so the wrong `canComplete` degrades to the original silent no-op rather than a crash (TESTS-7's probe: hardcoding `canComplete` to `true` leaves the full suite green).

**Suggested fix (converged from all three lanes, ~5 lines in the bridge).** Derive the case from the open location instead of trusting `currentCaseId`:

```ts
canComplete={!!currentLocation}
onComplete={() => {
  const st = store.getState()
  const loc = st.locations.find((l) => l.id === st.currentLocationId)
  if (loc) st.completeCase(loc.caseId)   // the case that owns the location — always stamps
  setReviewAgain(false)
}}
```

This fixes the dead button *and* stops the wrong case going green, and keeps `completeCase`'s cross-case guard meaningful. Type-design's stronger variant — change the action signature to `completeCase(locationId)` so the correlated pair is unrepresentable — is the better long-term shape; acceptable as a follow-up if the bridge fix lands now. Either way: (1) add the regression test (create A + L1, create B, rail-jump to Completion, tap Complete & Save → assert the confirmation appears / L1 is stamped / A is complete and **B stays `'draft'`**), which also closes TESTS-7's gap; (2) optionally restore the pair invariant at the source (`addLocation` sets `currentCaseId: caseId`; `createCase` clears `currentLocationId`); (3) fix the disabled-hint copy at `CompletionScreen.tsx:100` ("Open a location first" is wrong when the case is the missing half — reachable after a rehydrate that drops a dangling `currentCaseId` independently, `persistence.ts:391-393`).

**Suggested owner:** P0.2 (truthful statuses) authoring agent — owner of the R-1 fix (`5c319e4`).

---

## R-20 [MINOR] `optionValues` is now a dead export on the public engine barrel, still returning mutable `string[]`

**Where:** `features/demo/engine/index.ts:35` (barrel re-export), `features/demo/engine/content/form-options.ts:83` (declaration).

**Lenses:** typescript (TYPESCRIPT-N2), type-design (TYPE-DESIGN-E) — merged. **Conflict settled:** silent-failures' cleared-list called `optionValues` fine because "a real consumer" survives — but that consumer is the helper's own unit test. A test-only consumer does not justify a spot on the engine's declared public API (the barrel's own "intentionally tiny public surface" note), and the mutable `string[]` return is the surviving half of R-17's claim. The two lanes that filed it win; aggregator re-verified by grep (declaration + barrel line are the only production references; `import.ts:199-202` is a tombstone comment where the consumer used to be).

**Claim.** The R-11/R-17 fix (`a0ec7f6`) deleted `FORM_OPTIONS`, which was `optionValues`' only production consumer — creating exactly the "dead export with no consumer" shape, plus the un-`readonly` return R-17 flagged, on the public barrel.

**Suggested fix.** Either drop `optionValues` from `engine/index.ts:35` and inline `OPTIONS.map(o => o.value)` in its test (smallest surface; the R-11 deletion rationale applies verbatim), or — if it is deliberately kept as P1's import helper per the tombstone — say so in the barrel/docstring and tighten the return to `readonly string[]` so the R-17 precedent lands with it. One decision, one line either way.

**Suggested owner:** P0.3 (option-set consolidation) authoring agent — owner of the R-11/R-17 fix.

---

## R-21 [MINOR] The `reviewAgain` location-scoping reset is untested

**Where:** `features/demo/ui/DemoExperience.tsx:323` (the reset, inside `openLocation`); flag at `:210`, gate at `:726`.

**Lens:** tests (TESTS-6, probe-verified: with the reset deleted, 90 files / 705 tests all green).

**Claim.** `reviewAgain` is a bridge-local flag not keyed by location id; the single reset in `openLocation` is all that stops a "Review / Export again" click on location A from suppressing location B's confirmation after a switch. Nothing pins it — the same "per-location truth in un-keyed bridge state" class R-1 exists to close, in its mild (under-reporting) direction.

**Suggested fix.** One sandbox test beside the two existing R-1 cases: complete two locations, click "Review / Export again" on the first, open the second through the UI (Cases row click — the store action bypasses the reset), assert it still shows "Location Complete". Or make the state structural (`reviewAgainFor: string | null`), which deletes the reset and the gap together. Coordinate with R-19's fix — if the bridge rewiring lands, the same test file is being touched anyway.

**Suggested owner:** P0.2 authoring agent.

---

## R-22 [MINOR] G4 arc assertion loosened without need

**Where:** `features/demo/ui/__tests__/DemoExperience.sandbox.test.tsx:98`.

**Lens:** tests (TESTS-8; the "strict form still passes" claim probe-verified, not reasoned). Aggregator confirmed the loose form on the line.

**Claim.** The R-1 commit changed `getByText('Complete')` to `getAllByText('Complete').length > 0` in the test named "…the arc pays off green". The strict form passes on the current code (exactly one exact-match "Complete" renders in that setup), and the loose form cannot distinguish the case badge from the location row — it would survive the exact G3/G4 row-regression the same commit fixed.

**Suggested fix.** Restore `getByText('Complete')`, or better: expand the card first and assert `toHaveLength(2)` (case badge + location row), pinning both halves of the payoff.

**Suggested owner:** P0.2 authoring agent.

---

## R-23 [MINOR] Inventory row contradicts the R-9 correction one line away; lane-brief half of R-9's fix did not land

**Where:** `docs/planning/demo-phone-parity/demo-inventory.md:26`; `.claude/agents/web-reviewer.md:71`.

**Lens:** web (WEB-7). Aggregator read both lines — the contradiction is verbatim: line 26 asserts "**no persistence at all** (no localStorage/sessionStorage/`persist` middleware — verified by grep)" directly above line 27's "…since P0.4, the **demo's snapshot shape guard**…" added by `3967198`.

**Claim.** The State-row's claim is the exact one P0.4 falsifies, in the inventory future parity phases are briefed from. Same-class residual: `web-reviewer.md:71` still lists `sessionStorage`/`localStorage` under "Not in use yet — do not review against them", though R-9's fix list explicitly included the lane-brief update — the next phase's web reviewer would treat storage findings as out of scope.

**Suggested fix.** Rewrite `demo-inventory.md:26` to what shipped (per-mount store hydrated from a versioned per-tab `sessionStorage` snapshot, debounced 250 ms, `pagehide` flush, injected stores not persisted; cross-ref §32). Strike storage from `web-reviewer.md:71`'s not-in-use list and move it to the guarded-APIs table (guards: `sessionStorageOrNull()`, `loadSnapshot`'s `discard()`).

**Suggested owner:** P0.4 (persistence) authoring agent — documentation only, same owner as R-9.

---

## R-24 [MINOR] The outer net cannot escape a state-driven throw — `reset()` re-reads the snapshot the boundary itself just flushed

**Where:** `app/demo/error.tsx:37-44` (sole control); mechanism at `features/demo/ui/DemoExperience.tsx:223-232` (cleanup → `dispose()`) + `engine/store/persistence.ts:475-480` (`dispose()` flushes the pending write) + `DemoExperience.tsx:162` (`loadSnapshot` on remount).

**Lenses:** web (WEB-8), silent-failures (SF-7) — merged; SF-7's mechanism is the stronger half and is kept: when the segment boundary catches, React unmounts the throwing subtree, the persistence cleanup **flushes the throwing state to storage as the newest snapshot**, and `reset()` then rebuilds the identical state — same throw, forever, for the life of the tab. The file's own comment acknowledges the hole ("unless the snapshot itself is what throws") but ships no escape hatch; the snapshot is only ever cleared on parse/version failure or write failure, never on a render throw. MINOR because no reachable throwing derivation over restored data exists in this build (both lanes verified independently: schema rejects `NaN`, mappers are total, `selectAdjustedScopes` swallows) — it stops being low-risk the moment any P1–P4 derivation can throw on restored data, which is the scenario the net was added for.

**Suggested fix.** Add a secondary "Start fresh (clears this tab's demo session)" control that clears the snapshot then calls `reset()`. Respect the barrel rule: export a tiny `clearDemoSnapshot()` (or `SNAPSHOT_KEY`) from `features/demo/index.ts` rather than deep-importing or hardcoding the key in `app/`; wrap the storage access in `try` (Safari private mode throws on property access — same reason `sessionStorageOrNull()` exists). Keep "Try again" primary so the transient case still preserves the session.

**Suggested owner:** P0.1 (error boundary) authoring agent.

---

## R-25 [MINOR] Route fallback re-hardcodes glass-token colours outside the token guard's scan root

**Where:** `app/demo/error.tsx:25, 33, 41`.

**Lens:** web (WEB-9). Aggregator confirmed all three literal groups on the lines: `border-[rgba(255,71,87,0.3)]` (= `GLASS.borderError`, `glass-tokens.ts:39`), `bg-[rgba(255,71,87,0.06)]` (the in-frame detail-box literal), `from-[#35A0D6] to-[#2580AD]` (= `ACCENT_FROM`/`ACCENT_TO`, `glass-tokens.ts:19-20`).

**Claim.** The P0.5 token extraction landed in this same PR with a source-scanning guard test — whose scan root is `features/demo/ui/**`. The new file sits one directory outside it *and* expresses the colours in Tailwind arbitrary-value syntax the guard's `BANNED` strings can't match, so a future `GLASS` accent/error edit silently strands the `/demo` error page on the old palette, visibly diverging from the in-frame fallback it twins. No marketing token covers these values (`--color-blue: #2b8cc1` is a different blue; no error red exists).

**Suggested fix.** Cheapest defensible: add the three values to the `@theme` block in `app/css/style.css` (`--color-demo-accent-from/-to`, `--color-demo-error`) and use them in `error.tsx`, noting the mirror in `glass-tokens.ts`. Minimum: a "keep in sync with `glass-tokens.ts` ACCENT_FROM/ACCENT_TO + GLASS.borderError" comment at `error.tsx:25` so the drift is discoverable from the file that will drift.

**Suggested owner:** P0.1 authoring agent (file owner), coordinating with P0.5 (glass tokens) on the token option.

---

## R-26 [MINOR] R-14's breadcrumb binds no error — failure causes collapse

**Where:** `features/demo/engine/store/persistence.ts:449` (`} catch {`), `:454-456` (fixed-string warn).

**Lens:** silent-failures (SF-8). Aggregator read the lines — confirmed: no binding, no error argument.

**Claim.** A `QuotaExceededError` (the P4 media/OCR data-URL trigger R-14 was raised about) and a `SecurityError` (storage blocked/partitioned) log identically and both delete the snapshot — the exact "fallback-cause collapse" the repo's own convention (`geocode.ts:43`, which logs the caught error) exists to avoid. Secondary: the subscription re-arms per store change, so a persistent failure re-warns/re-removes on every keystroke; logging the cause makes the loop diagnosable at a glance.

**Suggested fix.** `} catch (e) {` and pass `e` as the warn's final argument. One-token change, no behaviour change.

**Suggested owner:** P0.4 authoring agent.

---

## R-27 [MINOR] Deferred §15's un-defer trigger fired — decision required, not necessarily code

**Where:** `features/demo/engine/store/selectors.ts:77-79` (the silent `catch`); trigger fact: `git log 165de2b..feat/parity-p0 -- …selectors.ts` → `5c319e4`.

**Lens:** silent-failures (SF-9). The git facts and the unchanged catch arm are lane-verified; the deferred entry's trigger reads "Next time `selectors.ts` / `time.ts` are touched", and the pre-fix P0 diff verifiably did not touch either file — the fix round does.

**Claim.** `selectAdjustedScopes`' catch swallows a non-canonical requested time with no dev-warn, while its sibling `generateExtractedScopes` counts, flags, and dev-warns for the identical parse failure. The visitor is not lied to (`adjustedScopesPartial` surfaces the drop in the document), so this is an operator-breadcrumb gap only — but the ledger's own rule says a fired trigger must be acted on or explicitly re-scoped, or the ledger stops meaning anything.

**Suggested fix.** Either (a) add the three-line dev-warn now, mirroring `generateExtractedScopes`, and strike the `selectors.ts` half of §15; or (b) record in §15 that the trigger fired during the P0 fix round and was deliberately re-deferred to P2.4 (G8). Option (b) is a ledger edit only.

**Suggested owner:** P0.2 authoring agent (whose fix commit fired the trigger); the (a)-vs-(b) call may go to the orchestrator.

---

## R-28 [MINOR] `persistedStateSchema` is the one shape without the R-4b device — needs the `FullShapeIn` variant

**Where:** `features/demo/engine/store/persistence.ts:291-301`.

**Lenses:** type-design (TYPE-DESIGN-B, probe-verified); typescript independently noticed the same gap and deliberately left it to this lane.

**Claim.** All 17 nested shape literals carry `satisfies FullShape<T>` + `z.ZodType<T>`; the top-level literal carries neither. Today a new *required* `PersistedState` field is still caught indirectly (`snapshotOf`/`loadSnapshot` return-typed literals), but an *optional* addition is silent in all three places at once and simply never persists. Low-reachability (no optional exists on `DemoState` today) — but the naive fix does not compile: `view`/`currentChapter` use `z.string().refine(…)`, whose `_input` is `string`, so `FullShape` rejects the shape (probe CASE 8). The Input-agnostic `FullShapeIn<T> = { [K in keyof Required<T>]-?: z.ZodType<Required<T>[K] | undefined, z.ZodTypeDef, unknown> }` compiles and still catches an omitted key (probe CASES 9–10).

**Suggested fix.** Add `FullShapeIn` beside `FullShape` with a one-line docstring and apply it to the one remaining literal; the device-2 header claim then holds for every shape in the file without exception.

**Suggested owner:** P0.4 authoring agent.

---

## R-29 [MINOR] The R-4a single-sourcing skipped two unions in its own file

**Where:** `features/demo/engine/store/create-store.ts:41` (`incidentCoordinates.source: 'geocoded' | 'manual'`), `:58` (`gps.source`, same hand-typed pair).

**Lens:** type-design (TYPE-DESIGN-C). Same commit (`cf96bb5`), same file, applied the correct treatment one field over (`method: CaptureMethod`, `:68`).

**Claim.** Both are hand-written copies of `COORD_SOURCES` / a subset of `GPS_SOURCES` — the exact drift class R-4a eliminated. One-directional hole: a variant added to `COORD_SOURCES` propagates to the domain type, PDF, and snapshot guard automatically, but `NewCaseInput` silently cannot carry it, so the only construction path can never produce it, with no compile signal. The `:58` narrowing is deliberate and documented ("recovery locations are geocode-only") but expressed as a re-typed union invisible to the compiler.

**Suggested fix.** `source: (typeof COORD_SOURCES)[number]` at `:41`; `source: Exclude<(typeof GPS_SOURCES)[number], 'gps'>` at `:58` — turning the documented narrowing into a compiler-checked fact.

**Suggested owner:** P0.4 authoring agent.

---

## R-30 [MINOR] Guard header's "NOT enforced" list omits the widening direction; the tuple rule is written nowhere

**Where:** `features/demo/engine/store/persistence.ts:91-93`.

**Lens:** type-design (TYPE-DESIGN-D, probe-verified: `| null`, non-tuple union growth, and `string | number` widenings all compile against both devices — `z.ZodType` output is covariant, so a narrower schema always assigns; only device 3's shared tuples close it, and only for tuple-backed unions).

**Claim.** The rewritten header honestly lists cross-field invariants and referential integrity as unenforced, but omits widening — a maintainer reading `:79-93` would conclude it is covered. Runtime consequence is the R-4 wipe path (build writes the widened value; its own schema rejects it next boot; `discard()`). No widening exists or is scheduled today, and the maximal round-trip test would catch a populated one — documentation gap, not machinery (repo §27 test-over-type bar).

**Suggested fix.** Extend the NOT-enforced list with the widening direction and add the load-bearing sentence: "New closed unions MUST be declared as `as const` tuples in `engine/types` (device 3) for that reason."

**Suggested owner:** P0.4 authoring agent.

---

## Dropped / demoted appendix

Nothing was dropped as unverifiable — every lane finding survived spot-checking. Aggregation decisions:

1. **TYPESCRIPT-N1 + SILENT-FAILURES-6 + TYPE-DESIGN-A merged into R-19 at MAJOR.** Same defect independently found through three lenses; no severity conflict (all three filed MAJOR and each independently justified MAJOR-over-BLOCKER on recoverability). The silent-failures writeup contributed the fake-success arm (already-completed location) and the 5-tap sequence; type-design contributed the make-it-unrepresentable action-signature option; typescript contributed the disabled-hint-copy secondary and the "regression vs pre-fix feedback" framing. All retained in the merged writeup.
2. **TESTS-7 folded into R-19** as its regression-test requirement rather than counted separately — the suggested R-19 fix replaces the very predicate TESTS-7 wanted tested, and the mandated regression test covers TESTS-7's scenario (same pattern as TESTS-5 → R-2 in the initial review). Not a drop; the substance survives as a merge-gating requirement.
3. **TYPESCRIPT-N2 + TYPE-DESIGN-E merged into R-20.** Identical facts; type-design's version adds the mutable-return half, kept. **Conflict settled against silent-failures' cleared-list** (which counted the helper's own unit test as "a real consumer"): a test-only consumer does not keep an export on the public barrel; the barrel's own tiny-surface note is the binding intent.
4. **WEB-8 + SILENT-FAILURES-7 merged into R-24.** Same hole; SF-7's flush-on-unmount mechanism (the boundary cements the throwing state into storage before `reset()` re-reads it) is the stronger, kept version. Both lanes independently arrived at MINOR for the same reason (no reachable trigger in this build).
5. **No demotions, no severity overrides.** R-19 was checked for BLOCKER promotion (it re-opens R-1's honesty-rule class) and kept at MAJOR: recoverable in one ordinary interaction, no data loss, the entire scripted demo path unaffected, and the fix is a contained bridge change.
6. **Lane notes not elevated to findings** (recorded by lanes as checked-and-cleared; aggregator concurs): the `selectLocationMapStatus` complete-with-empty-fields split (documented row-vs-dot semantics), single-location-green case cards (explicitly retained per R-1's fix instruction), `reviewAgain` surviving in-location chapter changes (intended escape hatch), `CHAPTERS`/`LAUNCHABLE` non-exhaustiveness (deferred §4, trigger not fired — though §4 now carries wipe-severity consequence worth noting at next triage), the `autoFocus`-inside-`role="alert"` SR nuance (speculative; the alternative is the R-8 defect), and the focus-not-managed-on-branch-swap navigation model (repo-wide proposal, not a fix-round regression).

## Raw lane-file inventory

| Lane file | Self-reported counts (new) | Prior-finding verdicts | Lane verdict |
|---|---|---|---|
| `docs/code-reviews/parity/p0/lane-typescript.md` | 0 B / 1 M / 1 m | 4/4 FIXED (+R-6 obs.) | REVISE |
| `docs/code-reviews/parity/p0/lane-web.md` | 0 B / 0 M / 3 m | 6/6 FIXED | APPROVE w/ comments |
| `docs/code-reviews/parity/p0/lane-tests.md` | 0 B / 0 M / 3 m | 5/5 FIXED (+R-6) | APPROVE |
| `docs/code-reviews/parity/p0/lane-silent-failures.md` | 0 B / 1 M / 3 m | 5/5 FIXED | REVISE |
| `docs/code-reviews/parity/p0/lane-type-design.md` | 0 B / 1 M / 4 m | 5/5 FIXED (+R-9) | REVISE |

Raw totals 0 B / 3 M / 14 m across lanes → after dedupe and folds: **0 BLOCKER / 1 MAJOR / 11 MINOR** (3 majors → 1 via the R-19 triple merge; 14 minors → 11 via the R-20 and R-24 merges plus the TESTS-7 fold into R-19).
