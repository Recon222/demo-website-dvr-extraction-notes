# Parity P2 — Aggregated review, FIX-DELTA round (PR #31)

| | |
|---|---|
| **Phase** | demo↔phone parity **P2** — wizard depth |
| **Branch / ref** | `feat/parity-p2` @ `572022a` · fix commits = everything after `e770d45` |
| **Mode** | **FIX-DELTA** (round 2). Round-1 vetted doc: `docs/code-reviews/parity/p2/p2-review.md` (verdict approve-with-fixes, 0 B / 9 M / 22 m) |
| **Aggregator** | Fable — five resumed Opus lane reports deduped and conflict-settled; the two disputed new MAJORs and the refuted guard independently re-verified/measured by the aggregator (Appendix A) |
| **Inputs** | The five overwritten lane files (inventory in Appendix D) |
| **Gates at head** | `tsc --noEmit` exit 0 (3 lanes). Full suite **159 files / 1477 tests green** — tests lane ×2 sequential, type-design ×1, **aggregator ×1 on a quiet box (58.3 s)**. Coverage gate met with margin: 97.8 / 91.22 / 99.74 / 99.02 (functions coverage improved vs round 1) |

## Verdict: **APPROVE-WITH-FIXES** (narrow)

| | Count |
|---|---|
| Round-1 findings | **31 / 31 FIXED** (0 partial, 0 unfixed — the one lane-reported PARTIAL is a residual carried as new finding R-37) |
| New BLOCKER | **0** |
| New MAJOR | **1** — R-32 (merge-gating) |
| New MINOR | **7** — R-33..R-39 (non-gating) |

The fix round is high quality: every round-1 finding is resolved, eight of them mutation- or measurement-verified by a lane other than the one that filed them, and three fixes took a stronger shape than the review proposed (R-5 deleted the duplicate primitive; R-7 took the `aria-disabled` option; R-9 completed the clock seam instead of pinning a zone). **One new MAJOR gates:** the R-1 fix's own component has a second, still-unguarded post-await store write (the address-pick path), verified at source by the aggregator — same silent cross-location contamination class, now contradicting the component's own new header contract. The silent-failures lane's other new MAJOR (**NEW-1**, "the progress-saved suite is always red") was **adjudicated empirically and refuted** — on a genuinely quiet box the suite passes 4/4 in 1.6 s (slowest test 258 ms vs the 5000 ms budget, stable over four runs; full suite green in the same session). Its surviving kernel — zero headroom between `asyncUtilTimeout` and the default `testTimeout` — is real and is merged with the tests and web lanes' identical observations into R-33 (MINOR). Merge after R-32 (a two-line guard + one test) and a targeted round-3 delta on it; the seven minors can ride that round or the next touch.

---

## Part 1 — Final status of the 31 round-1 findings

Verification column names the lane(s) that confirmed the fix at `572022a` beyond the authoring commit; **(M)** = mutation-verified in a throwaway worktree; **(A)** = additionally re-verified at source by the aggregator this round.

| ID | Sev | Finding (short) | Status | Verified by | Evidence anchor |
|---|---|---|---|---|---|
| R-1 | MAJOR | Unguarded post-await geocode write → cross-location contamination | **FIXED** — but see **R-32** for the sibling path | typescript, silent-failures **(A)** | `LocationFields.tsx:99-136` `writeGen` ref, bumped on `locationId` change + unmount; both post-await arms re-check; capture half covered via `key={locationId}` remount of `GpsCaptureControl`; both race arms test-pinned |
| R-2 | MAJOR | "Progress Saved" promised persistence unconditionally | **FIXED** | silent-failures, type-design, tests **(A: suite runs green)** | `PersistenceHandle.isLive()` tracks reality (not a latch); `NOOP_HANDLE` → `false`; read at **alert time** with `?? false`; demoted copy states the loss; pinned by `persistence.test.ts` (5 semantics tests) + `DemoExperience.progress-saved.test.tsx` (4 tests, incl. read-at-alert-time) |
| R-3 | MAJOR | `extractedScopesPartial` had no consumer; PDF under-reported unmarked | **FIXED** | silent-failures (four-step trace re-walked), tests **(A)** | `selectors.ts:278` threads the flag; `case-notes.ts:236` renders the red note — **even when the notes body is empty** (`:236-245` gate); flag survives snapshot; `engine-flow.test.ts:79-102` reproduces the review trace verbatim |
| R-4 | MAJOR | OCR commit silently regenerated edited scopes (phone prompts) | **FIXED** | silent-failures, web, tests | Phone's three-arm confirm shipped (Cancel / Keep My Edits / Regenerate); `calcOffset(regenerate = true)` splits regeneration; Escape ≠ Cancel deliberately (§44a — a stray keypress must not discard a read; judged sound by web + SF); all three arms + no-prompt-when-nothing-to-lose + Escape semantics test-pinned |
| R-5 | MAJOR | `ConfirmDialog` — weaker duplicate dialog primitive | **FIXED** (residual → R-37) | web, typescript, type-design | `ConfirmDialog` **deleted** (−67 lines); all six confirms on `AlertDialog` (full a11y contract inherited); `AlertDialog` gained a column layout at 3+ actions; Escape-listener churn fixed (`closeDialog = useCallback`); `DialogAction` type gone |
| R-6 | MAJOR | CoordinateDisplay status/metadata AT-unreachable | **FIXED** | web, tests | `role="status"` now a sibling of the button; accuracy/rating/source folded into the accessible name (`nameParts`, correctly omitting unmeasured accuracy); 3 tests |
| R-7 | MAJOR | Capture button stranded keyboard focus for 30–120 s | **FIXED** | web (judged the divergence), silent-failures, tests | `aria-disabled` + guarded handler — the stronger of the two proposed options (§45a); `runningRef` mutex confirmed to keep the double-capture window closed; pinned incl. focus retention and one-write-per-click |
| R-8 | MAJOR | Flow F (never-opened-Notes PDF path) unpinned | **FIXED (M)** | tests | Draft taken verbatim (`engine-flow.test.ts:64-78`); mutation of the selector fails exactly and only the new test; the "writes nothing back" promise also pinned |
| R-9 | MAJOR | DST advisory pin vacuous on UTC; no `isDst` seam | **FIXED (M)** | tests **(A)** | `clock.isDst` added beside `clock.now` (`clock.ts:24`); bridge threads it (`DemoExperience.tsx:393`); assertion now unconditional + a negative control; mutation under `TZ=UTC` fails 2 tests |
| R-10 | MINOR | Hardcoded `?? 10` ceiling + re-typed `PRECISE_GPS_CONFIG` | **FIXED** | typescript, web, tests (refuted-then-cleared the test shape) | `resolvedConfig` computed once, same object to hook and readout; `PRECISE_GPS_CONFIG` composed from `GPS_CONFIG_STATIC` |
| R-11 | MINOR | deferred §38 stale-on-arrival | **FIXED** | typescript | `toFinalSubmissionInput` → `formatAddress` (no-`locationName`-fallback exception preserved); §38 retitled RESOLVED |
| R-12 | MINOR | `copyAll` timer untracked | **FIXED** | typescript, web, tests | `copiedTimerRef` cleared on re-arm + unmount; re-arm test advances past the first deadline (the discriminating assertion) |
| R-13 | MINOR | No terminal `.catch`; `timestampMs` unvalidated | **FIXED** | typescript, silent-failures | Typed `INVALID_COORDINATES` failure for non-finite timestamp; terminal `.catch` breadcrumb; dead-button shape unreachable from the named input |
| R-14 | MINOR | Inert `SectionBlock` memo; unmemoised derivations (+DST site) | **FIXED** (guard gap → R-36) | web, typescript; tests (P2.5 site memo test) | `useCallback`/`useMemo` throughout; `computeDstAdvisory` memoised on exactly its inputs; the DST half has a behavioral memo test, the notes half does not (R-36) |
| R-15 | MINOR | OCR blocked-reasons unassociated/silent | **FIXED** | web | Always-mounted `role="status"` container + `aria-describedby` + `aria-disabled` CTA; describedby verified never-dangling (two mutually-exclusive messages ↔ exactly two blocked states) |
| R-16 | MINOR | Fabricated confidence chip unlabelled | **FIXED** | silent-failures | Chip badged `Sample` with scope-limiting copy ("rates how legibly the characters read, never which date they mean"); suppression considered and rejected for stated reasons; seed comment binds future maintainers |
| R-17 | MINOR | Partial geocode blanked typed fields | **FIXED** | silent-failures **(A)** | Component-wise patch (`LocationFields.tsx:130-134`); `LookupNotice` three-state union replaces two booleans; `REVERSE_GEOCODE_PARTIAL` names what stands |
| R-18 | MINOR | `accuracy ?? 0` fabricated "±0m · Excellent" | **FIXED** | silent-failures, tests, typescript (ripple traced) | `Number.isFinite ? … : undefined`; `meetsTargetAccuracy` refuses unmeasured; `selectBestSample` prefers measured in both orders; readout drops the clause; pinned in every direction |
| R-19 | MINOR | Spy restored as last statement | **FIXED** | tests | `afterEach(restoreAllMocks)` on the owning describe; higher stakes post-R-9 (two spies) handled in the same round |
| R-20 | MINOR | Selector projections unexercised | **FIXED** | tests | Field-by-field assertions with deliberately distinct values (the property that catches a type-correct swap); coverage no longer names `selectors.ts:271,275` |
| R-21 | MINOR | Mid-loop abort checkpoint unpinned | **FIXED** | tests | 90 m first reading vs 10 m target, abort from `onProgress`, exactly-once `getCurrentPosition`; commit reports red-verified against the checkpoint removed |
| R-22 | MINOR | Inline `ScrapAllMode`/`RestoreAllMode` re-declarations | **FIXED** | type-design (incl. an unprompted store-bridge boundary check: type-only import, ten precedents, no violation) | Props consume the barrel types; narrow→wide drift path closed |
| R-23 | MINOR | `DvrTimestampReading` flat nullable pair | **FIXED** | type-design, tests (corpus test pins the producer total) | Three-arm `DvrDateResolution` union, propagated unflattened through screen and bridge; contradictory double-warning now unrepresentable (stale doc comment → R-38) |
| R-24 | MINOR | Seven unlinked `GpsCoordinates` copies | **FIXED** | type-design **(A)** | All seven sites now derived (table in lane file); drift-by-inaction eliminated by construction. The **added guard file's promise is false** → R-34 (the fix stands; the guard doesn't do what it says) |
| R-25 | MINOR | `gpsSourceLabel` bare default + hand-typed union ×5 | **FIXED** | type-design, typescript | `GpsSource` exported and adopted at **5/5** sites incl. the pre-existing `mapData.ts`; `case undefined` + `never` exhaustiveness |
| R-26 | MINOR | Mutable exported `OCR_SAMPLE_FRAMES` | **FIXED** | type-design | `Object.freeze` + `Readonly` + `as const satisfies` |
| R-27 | MINOR | `ArrivalDeparture` name-shadow | **FIXED** | type-design | Shadow deleted; `NotesVisit` derived alias; canonical is the only remaining declaration |
| R-28 | MINOR | `NoteSection` invariant unexpressed | **FIXED as dispositioned** (record, don't fix) | type-design | `deferred.md` §43: invariant + declined-hardening rationale + revisit trigger; reconciler deliberately unchanged |
| R-29 | MINOR | Clipboard stub no teardown | **FIXED** | tests | Descriptor captured and restored, correctly handling jsdom's no-own-property case (better than the suggested `stubGlobal`) |
| R-30 | MINOR | Conflict marker in `deferred.md` | **FIXED** | tests **(A: grep clean at round 1 close)** | Marker removed; grep returns nothing |
| R-31 | MINOR | `CoordinateDisplay.copied` never reset | **FIXED** | typescript, web, tests | `COPY_RESET_MS` + tracked `resetTimer`, cleared on re-arm + unmount (the R-12 idiom); unmount-cleanup assertion mutation-checked by the tests lane and confirmed load-bearing |

---

## Part 2 — New findings this round

| ID | Sev | Where | One-line claim | Owner |
|---|---|---|---|---|
| **R-32** | **MAJOR** | `features/demo/ui/inputs/LocationFields.tsx:162-171` (+ `AddressAutocomplete.tsx:155-167`) | R-1's guard covers only one of the component's two post-await store writes — the address-**pick** path still contaminates a switched location, and writes coordinates + `'geocoded'` provenance on top of the address | P2.3 |
| R-33 | MINOR | `vitest.config.mts` (+ `vitest.setup.ts:24`) | No `testTimeout` override, so the default (5000 ms) **equals** `asyncUtilTimeout` (5000 ms): zero headroom fleet-wide, degraded failure diagnostics in 10 waiting files, and heavy contention-exposure (the round's lane-parallel runs produced 29–40 spurious timeouts each) | P2 rider (test infra; tests lane owns the shape) |
| R-34 | MINOR | `features/demo/ui/inputs/__tests__/coordinate-shapes.test.ts:22-31` | The R-24 linkage guard is directionally inverted — `GpsCoordinates extends T` never fires when a copy **loses** a field, which is the exact historical drift its comment claims it catches | P2.3 |
| R-35 | MINOR | `features/demo/ui/screens/OcrCaptureScreen.tsx:131-136` | The assumed-date confirm button still uses native `disabled` — reproducing the focus-drop the same round's own §44b comment argues against, twenty lines above the fix | P2.2 |
| R-36 | MINOR | commit `a4da751` (NotesScreen/DemoExperience) | R-14's notes-half memoisation shipped with no behavioral guard; its P2.5 sibling got one in the same round — the memo can silently go inert again | P2.1 |
| R-37 | MINOR (nit-grade) | `features/demo/ui/DemoExperience.tsx:133-137` | `AlertState` still hand-declares `Omit<AlertDialogProps, 'onDismiss'>` — the one unaddressed facet of TYPE-DESIGN-8 now that `AlertDialog` is the single primitive | P2.4 |
| R-38 | MINOR (nit-grade) | `features/demo/ui/screens/OcrCaptureScreen.tsx:29` | Doc comment references `assumedDate`, a field the R-23 union removed | P2.2 |
| R-39 | MINOR (nit-grade) | `features/demo/ui/inputs/LocationFields.tsx:89,193` | `LookupNotice` consumed by a binary ternary — a fourth member would silently render the partial-address copy | P2.3 |

### R-32 [MAJOR] — The address-pick path is R-1's unguarded twin
**Lenses:** TYPESCRIPT-D1. **Verified at source by the aggregator — holds and gates.** **Owner:** P2.3.

**Claim.** The R-1 fix installed `writeGen` and gates the reverse-geocode write on both arms — correctly. The same component's **address-pick** write (`onPick`, nine lines below) goes through the identical `onChange` → `SubmissionScreen.handleLocationChange` → bridge `updateField` chain, whose target resolves at **call time** (`get().currentLocationId`) — and it carries no generation check anywhere. It writes *more* than the geocode path: `streetAddress`, `city`, **and** `{ lat, lng, accuracyM, coordinateSource: 'geocoded' }`. A suggestion chosen on location A whose Mapbox `retrieve` resolves after a location switch writes A's address *and A's coordinates, stamped `'geocoded'`,* onto location B.

**Evidence (aggregator-verified at `572022a`).**
- Producer: `AddressAutocomplete.tsx:155-167` — `session.retrieve(s.raw).then((res) => onPick(pickFromFeature(...)))` with no token; the component's `seq` ref guards only the **suggest** response (`:126,133`), never `retrieve`.
- Consumer: `LocationFields.tsx:162-171` — the `onPick` body writes straight through `onChange` with no `writeGen` capture/re-check (read in full; the geocode path at `:115-136` has the guard, this path has none).
- `AddressAutocomplete` is **not** re-keyed on `locationId` (only `GpsCaptureControl` is, `:182`), so it survives a switch fully mounted with its promise in flight.
- The component's new header (`:29-37`) now documents the contract this path breaks: *"the post-await write is abandoned if the generation moved."* The named P3.4/P3.7 reuse consumers will reasonably believe it.

**Severity.** Not "pre-existing, out of scope": the fix round introduced the token, the `locationId` prop, and the written rule, and applied them to one of the component's two paths that need them — the doc now over-promises. Consequence parity with R-1 (silent forensic mis-attribution) plus a wrong provenance stamp; the race window is narrower (a 200–800 ms `retrieve` vs R-1's 30–120 s), which does not change the class. Two-line fix.

**Suggested fix.** In the `onPick` body, capture `const gen = writeGen.current` when the pick is issued and bail before the write if it moved — the exact bail the geocode path uses. (The alternative — threading a token into `AddressAutocomplete.choose`'s `.then`, mirroring its `seq` idiom — is more general but touches a second component; the local wrap is sufficient and co-located.) Add the sibling race test to `submission-gps.test.tsx` next to the R-1 pair (both arms: dropped when switched, written when not).

### R-33 [MINOR] — `testTimeout` (default 5000) == `asyncUtilTimeout` (5000): zero headroom
**Lenses:** NEW-TESTS-8 + NEW-WEB-2 + the **demoted** SF NEW-1 (adjudication in Appendix B) + typescript's ExploreChecklist flake observation — one seam, one finding. **Owner:** P2 rider (test infra); the tests lane owns the remedy shape. **Explicitly NOT a re-flag** of the deliberate `asyncUtilTimeout: 5000` choice — the value and its ceiling pin stand; this is about the budget that caps it.

**Claim.** `vitest.config.mts` sets no `testTimeout`, so vitest's 5000 ms default applies everywhere that hasn't opted into `{ timeout: 20000 }` (10 files have). The flake-fix's own rationale ("deliberately well under that 20 000 ms per-test timeout, so a genuine hang still fails as a hang with budget left to report") assumes a margin that exists only in those 10 files. Consequences, all observed live this round: (a) in the 10 `findBy*`/`waitFor` files without the opt-in, a genuinely slow wait dies as a generic `Test timed out in 5000ms` instead of RTL's element-name + DOM dump — the diagnostic the phase's evidence doc was written to preserve; (b) under machine contention the whole suite is heavily exposed — the five concurrent lane runs produced 29 (web), 40 (tests), and 10/5 (type-design) spurious timeout failures, including on fully synchronous tests, all of which pass serialized/quiet.

**Evidence.** `grep testTimeout vitest.config.mts` → no match; `vitest.setup.ts:24` `configure({ asyncUtilTimeout: 5000 })`; the 10-file waiting-without-opt-in list is in `lane-tests.md` (NEW-TESTS-8). Aggregator's quiet-box full run: 159/1477 green in 58.3 s — the suite itself is sound; the geometry is the exposure.

**Suggested fix.** One line: `testTimeout: 20000` (or 15000) in `vitest.config.mts`, restoring the margin the evidence doc's §4 assumes; the 10 per-file annotations become redundant tidy-up. Belt-and-suspenders per the orchestrator: adding `{ timeout: 20000 }` to the `progress-saved` describe is cheap and harmless either way. Do **not** lower `asyncUtilTimeout` — that would re-open the measured flake the raise fixed.

### R-34 [MINOR] — The R-24 guard asserts the wrong direction; its compile-time promise is false
**Lenses:** TYPE-DESIGN-9. **Aggregator-verified by standalone probe; the tests lane's contrary note is refuted (Appendix B).** **Owner:** P2.3. The R-24 **fix itself stands** — all seven copies are genuinely derived, and that derivation (not the guard) is what provides the safety.

**Claim.** `coordinate-shapes.test.ts` asserts `GpsCoordinates extends T` for each carrier, under a header claiming this "FAILS TO COMPILE if someone re-flattens one." Assignability *to* a looser type is unaffected by missing optional/extra members, so the guard stays green precisely when a copy **loses** a field — the historical `NotesCamera` drift it was written against. It fires only when a copy gains a required member or narrows a type.

**Evidence.** Aggregator probe (scratchpad, `tsc --strict`): a copy missing `accuracyM` compiles **clean** through `AcceptsCoordinates`; the positive control (`{ zzz: number }`) errors TS2322 — mechanism fires, direction wrong. Type-design's in-repo probes agree, including re-flattening all seven sites at once: the only diagnostics in the whole program came from `persistence.ts`'s `FullShape` device, never the guard file.

**Suggested fix.** Assert key-exhaustiveness in the direction that matters — `type CarriesEveryCoordinateKey<T> = Exclude<keyof GpsCoordinates, keyof T> extends never ? true : never` (the `FullShape` property) — or delete the guard file and rest on the derivations, which already provide the protection. Either way the comment must stop claiming re-flattening is caught. Same treatment for `CoordinateProjection`'s comment in `LocationFields.tsx` (type-design notes it makes the same inaccurate claim; the type itself is a homomorphic mapped type and is correct).

### R-35 [MINOR] — Native `disabled` on the assumed-date confirm button
**Lenses:** NEW-WEB-1 (aggregator-verified at source). **Owner:** P2.2.

`OcrCaptureScreen.tsx:131-136`: `<button … onClick={onConfirmDate} disabled={dateConfirmed}>`. Pressing "The date is correct" flips `dateConfirmed` → the just-activated button disables → browsers blur it → focus falls to `<body>`, at the exact moment the `role="status"` blocked-reason updates and the operator wants the newly-unblocked CTA. This is the precise failure shape §44b documents for the CTA twenty lines below, fixed in this same round. MINOR (single forward step, small overlay, intended state change). **Fix:** `aria-disabled={dateConfirmed}` + `if (dateConfirmed) return` — or drop the disabling; re-confirming is idempotent.

### R-36 [MINOR] — R-14's notes-half memo has no behavioral guard
**Lenses:** NEW-TESTS-7. **Owner:** P2.1.

Commit `a4da751` touches two production files and zero test files; its sibling half (`645ac1c`, the DST memo) shipped a discriminating memo test in the same round (`time-offset-advisories.test.tsx:192-205`). An inline arrow prop, a seventh un-`useCallback`'d callback, or a dropped `useMemo` dep silently returns `SectionBlock` to the pre-R-14 inert state with the suite green. Perf contract, hence MINOR. **Fix:** mirror the P2.5 pattern — spy a formatter (or count `SectionBlock` renders), type into the free-text tail, assert no re-derivation; change a wizard field, assert re-derivation.

### R-37 / R-38 / R-39 [MINOR, nit-grade] — carried residuals, one-liners
- **R-37** (`DemoExperience.tsx:133-137`, owner P2.4): `type AlertState = Omit<AlertDialogProps, 'onDismiss'>` — now that `AlertDialog` is the single primitive, a prop added to it is silently unrepresentable in bridge state. One line.
- **R-38** (`OcrCaptureScreen.tsx:29`, owner P2.2): stale doc comment — "`only meaningful when `assumedDate` is set" → "when `resolution.kind === 'assumed-date'`".
- **R-39** (`LocationFields.tsx:89,193`, owner P2.3): `LookupNotice`'s ternary treats "not `failed`" as `partial`; a future `'rate-limited'`/`'no-token'` member would show the wrong copy. A `Record<Exclude<LookupNotice,'none'>, string>` copy map fits the file's idiom.

---

## Appendix A — Aggregator verification performed this round

| Item | Method | Result |
|---|---|---|
| **SF NEW-1 adjudication** (orchestrator duty 1) | Ran `DemoExperience.progress-saved.test.tsx` solo on the now-quiet box, default budget, `--reporter=verbose`, ×4 | **4/4 pass every run**; file duration 1.55–1.74 s; per-test 25/99/166/258 ms — the slowest test is **~19× under** the 5000 ms budget. Full suite immediately after: **159 files / 1477 tests green in 58.3 s**. NEW-1's "always red on a quiet machine, ~10 s/test (~42 s total)" is **refuted**; disposition in Appendix B |
| **TYPESCRIPT-D1 / R-32** (duty 2) | Full read of `LocationFields.tsx` at head (header `:25-37`, guard `:99-136`, `onPick` `:162-171`, un-keyed `AddressAutocomplete` `:157`); read `AddressAutocomplete.tsx:108-167` (`seq` guards suggest only; `retrieve` continuation unguarded) | **Holds — gates.** Chain, missing token, and the header's over-promise all confirmed |
| **TD-9 / R-34** (duty 3) | Standalone `tsc --strict` probe in the scratchpad replicating the guard against a missing-field copy, with a positive control; read the guard file in-repo | Missing-field copy **compiles clean** through `AcceptsCoordinates`; control errors TS2322. Inversion **confirmed**; probe removed afterwards; worktree untouched |
| NEW-WEB-1 / R-35 | Read `OcrCaptureScreen.tsx:125-140` | Native `disabled={dateConfirmed}` confirmed |
| R-1 / R-17 fix code | Direct read during the D1 verification (same file) | `writeGen` + both post-await bails + component-wise partial patch confirmed as the lanes describe |
| R-3 / R-9 fix sites | Grep at head | `selectors.ts:278` + `case-notes.ts:94,236` (flag consumed); `clock.ts:24` + `DemoExperience.tsx:393` (`isDst` seam threaded) |
| Suite/gates at head | Full `pnpm vitest run --silent` on the quiet box | 159 / 1477 green, 58.3 s — corroborating the tests lane's two sequential green runs and the coverage-gated run |

## Appendix B — Adjudications, demotions, and conflict settlements

**SF NEW-1 (MAJOR) → demoted and folded into R-33 (MINOR).** The lane's claim had two parts. Part 1 — *"the suite is always red on a quiet machine; the R-2 fix ships unverified"* — is **empirically false**: four solo runs on a genuinely quiet box pass 4/4 with ~19× headroom, and the full suite is green in the same session (Appendix A). The lane's measurements (4/4 timeouts, ~10 s/test) were taken during the window in which **all five lanes ran their own vitest suites concurrently on this box** (lane files written 04:32–04:49); every other lane independently documented the same contention artifact class in that window — tests: 40 spurious timeouts at ~13× contention, green ×2 sequential; type-design: 10-then-5, green serialized, with an explicit method note; web: 29, including on a *synchronous* test, 75/75 serialized. The SF lane's "quiet box" was not quiet. Part 2 — the missing per-file timeout headroom that made the file *contention-exposed* — is real, is exactly the tests/web lanes' NEW-TESTS-8/NEW-WEB-2 observation, and survives as R-33 with the cheap `{ timeout: 20000 }` describe option recommended inside it. Net: the R-2 fix is verified (its pins run green); no gating finding.

**Tests lane vs type-design on the R-24 guard → settled for type-design (R-34).** The tests lane's fix-round assessment said the `GpsCoordinates extends T` direction "catches re-flattening (the drift that actually happened) though not widening-by-addition — the right trade" and declined to file. Type-design's empirical probes, and the aggregator's independent standalone probe with a positive control, show the opposite: the guard is **silent** for a copy missing a field (re-flattening followed by any canonical widening — the actual historical sequence) and fires only for narrowing/required-extras. Empirics beat the reasoned read; the tests lane's no-finding disposition on that file is overridden. (Its other verification on the same file — that `tsc` genuinely covers it — stands and is what makes R-34's fix worth doing.)

**TYPE-DESIGN-8 PARTIAL → R-5 recorded FIXED; residual re-filed as R-37.** The gating substance of R-5 (the a11y-deficient duplicate primitive) is fully resolved by deletion; the surviving item (`AlertState` hand-declaration) is an independent one-line type-hygiene nit that predates the consolidation and doesn't reduce R-5's fix. Carrying it as its own minor keeps the per-finding ledger honest without marking a fixed MAJOR partial for a nit.

**Severity normalization.** Lane vocabularies mapped as in round 1 (MEDIUM/LOW/NIT → MINOR, nit-grade noted): TD-10/TD-11 (NIT) → R-38/R-39; TD-9 (MINOR) → R-34 unchanged; NEW-WEB-1 → R-35 unchanged; NEW-TESTS-7/-8 → R-36/R-33 unchanged; SF NEW-1 (MAJOR) → merged into R-33 per the adjudication above; TYPESCRIPT-D1 (MAJOR) → R-32 unchanged (independently verified).

**Accepted judgement calls (reviewed by lanes, endorsed, not re-flagged):** §44a Escape ≠ Cancel on the OCR recalculate prompt (least-destructive dismissal; phone's Cancel discards the read); §44c / `calcOffset(regenerate = true)` default (zero-arg call sites verified, no event-object leak); §45a `aria-disabled` over focus-repair (APG-aligned; `runningRef` keeps the double-fire window closed — the `if (busy || disabled) return` guard is now load-bearing and is on every lane's regression watch); §45d silent drop of an abandoned lookup (nothing lost, a notice would mis-attribute); §43 NoteSection invariant recorded-not-hardened; R-16's label-don't-suppress choice.

**Observations recorded, not counted (lane-declined or unresolvable here):** Cancel-placement divergence between the two 3-action dialogs (NotesScreen declares Cancel last, OCR prompt first; iOS may reorder `style:'cancel'` to bottom — needs one phone-side screenshot; if confirmed, sort `style:'cancel'` last in `AlertDialog` so every caller is correct by construction). Shared `blockedId` on two mutually-exclusive divs in `OcrCaptureScreen` (safe only by exclusivity). `LocationFields` not remounted on switch → a busy "Looking up address…" state can be briefly mis-attributed to the new location (pre-existing, bounded, §45-triggered for P3.4/P3.7 — adjacent to R-32's fix site, worth handling in the same commit if convenient). Typescript lane's one-in-three `ExploreChecklist` flake (untouched file, synchronous assertion, worker contention profile — folded into R-33's evidence). SF's recorded residuals on R-2 (promise-then-fail window with no retraction surface) and R-3 (deleted-scope over-warn — safe direction).

**Dropped entirely: nothing.** Every lane-filed item this round appears above as a finding, a fold, or a recorded observation.

## Appendix C — What gates round 3

A targeted fix-delta (resume the typescript lane at minimum) after:
1. **R-32** — the `onPick` generation bail + the sibling race test (P2.3, two lines + one test).
Recommended to ride along (cheap, non-gating): R-33's one-line `testTimeout`, R-34's guard direction (or deletion), R-35's three-line `aria-disabled` swap, R-38's one-line comment.

## Appendix D — Raw lane-file inventory (fix-delta versions)

| File | Lane | Prior findings | New this round (as filed) | Lane verdict |
|---|---|---|---|---|
| `docs/code-reviews/parity/p2/lane-typescript.md` | typescript-reviewer | 6/6 FIXED (+2 routing notes FIXED) | 1 MAJOR (TYPESCRIPT-D1 → R-32) | REVISE |
| `docs/code-reviews/parity/p2/lane-web.md` | web-reviewer | 8/8 FIXED | 2 MINOR (NEW-WEB-1 → R-35; NEW-WEB-2 → R-33) | (approve implied; no verdict line) |
| `docs/code-reviews/parity/p2/lane-tests.md` | test-analyzer | 6/6 FIXED (+R-30), both MAJORs mutation-verified | 2 MINOR (NEW-TESTS-7 → R-36; NEW-TESTS-8 → R-33) | APPROVE |
| `docs/code-reviews/parity/p2/lane-silent-failures.md` | silent-failure-hunter | 6/6 FIXED | 1 MAJOR (NEW-1 → **demoted**, folded into R-33) | APPROVE on substance |
| `docs/code-reviews/parity/p2/lane-type-design.md` | type-design-analyzer | 7 FIXED + 1 PARTIAL (→ R-37) | 1 MINOR (TD-9 → R-34) + 2 NIT (TD-10/11 → R-38/39) | APPROVE |

Lane files remain the per-lane resumable state for round 3. This document is the orchestrator-facing source of truth for the fix-delta round; where a lane file and this document disagree (NEW-1's severity, the tests lane's R-24-guard disposition), **this document governs**, with the adjudications recorded in Appendix B.
