# Parity P2 — Aggregated review (PR #31)

| | |
|---|---|
| **Phase** | demo↔phone parity **P2** — wizard depth (notes engine, OCR corrections, GPS, final gate, DST advisories) |
| **Branch / ref** | `feat/parity-p2` @ `9f5c01a` · diff `git diff master...feat/parity-p2` (98 files, +9498/−274) |
| **Mode** | **INITIAL** (this document is the fix-delta baseline; lane files are resumable per-lane state) |
| **Aggregator** | Fable — five Opus lane reports deduped, conflict-settled, and every MAJOR independently re-verified against source (Appendix A) |
| **Inputs** | `lane-typescript.md` · `lane-web.md` · `lane-tests.md` · `lane-silent-failures.md` · `lane-type-design.md` (inventory in Appendix D) |
| **Gates (as run by lanes)** | `tsc --noEmit` exit 0 · `pnpm vitest run` 156 files / 1416 tests green (×2 incl. coverage run) · coverage gate met with margin (97.78/91.19/99.23/99.01 vs 80%) |
| **Binding contracts applied** | `features/demo/CLAUDE.md` (store bridge, engine purity, honesty rule) · parity plan §4 (`docs/planning/demo-phone-parity/01-master-parity-plan.md`) · `docs/code-reviews/deferred.md` §29–§42 · PR #31 deliberate-choices list (don't-re-flag baseline) |

## Verdict: **APPROVE-WITH-FIXES**

| Severity | Count |
|---|---|
| BLOCKER | **0** |
| MAJOR | **9** (R-1..R-9) — merge-gating |
| MINOR | **22** (R-10..R-31) |

No lane found an architectural problem: the store-bridge rule, engine purity, marketing isolation, determinism seam, XSS escaping, and the snapshot-guard devices all verified clean across five lenses, and the headline type surfaces are sound. Every MAJOR is a localized fix (a guard ref, an alert branch, a PDF note, a confirmation route, three ports of a11y idioms this PR itself established, two tests, one injection seam) — no rework of the approach. All nine MAJORs held under independent spot-check; one lane MINOR (WEB-8) was **promoted** to MAJOR after verification against phone source the lane did not have access to. Merge after the nine MAJORs are fixed and the fix-delta re-review is clean (the PR body already commits to this gate). No lane re-flagged an item on the PR's deliberate-choices baseline.

---

## Findings table

| ID | Sev | Where | One-line claim | Owner |
|---|---|---|---|---|
| R-1 | MAJOR | `features/demo/ui/inputs/LocationFields.tsx:71-91` | Un-guarded post-`await` store write: an in-flight reverse-geocode resolving after a location switch writes location A's address onto location B | P2.3 |
| R-2 | MAJOR | `features/demo/ui/DemoExperience.tsx:144-147,848-861` | "Progress Saved … survives a refresh" alert is unconditional; with storage unavailable persistence is a silent NOOP and the promise is false | P2.4 |
| R-3 | MAJOR | `features/demo/engine/store/create-store.ts:446` · `engine/logic/pdf/case-notes.ts` | `extractedScopesPartial` is written but consumed by nothing — a reachable state ships a silently-short recovered-footage line in the court PDF with no warning anywhere | P2.1 |
| R-4 | MAJOR | `features/demo/ui/DemoExperience.tsx:810-827` | OCR commit regenerates extracted scopes wholesale with **no** confirmation; the phone prompts (Keep My Edits / Regenerate) — silent destruction of operator edits, unlogged divergence | P2.2 |
| R-5 | MAJOR | `features/demo/ui/screens/NotesScreen.tsx:90-156` | Second, weaker blocking-dialog primitive in the same PR that shipped `AlertDialog`: no focus entry/return, body copy not exposed to AT, contradictory scrim semantics, divergent action types | P2.1 |
| R-6 | MAJOR | `features/demo/ui/inputs/CoordinateDisplay.tsx:84-134` | Copy-failure live region and accuracy/source/rating metadata rendered *inside* an `aria-label`ed `<button>` — invisible to assistive tech | P2.3 |
| R-7 | MAJOR | `features/demo/ui/inputs/GpsCaptureControl.tsx:131-141` | Capture button `disabled` during capture drops keyboard focus to `<body>` for 30–120 s; failure alert announces with focus stranded | P2.3 |
| R-8 | MAJOR | `features/demo/engine/__tests__/engine-flow.test.ts:23,53` | Flow F (read-only reconcile in `selectCaseNotesData` — the only path putting notes into the PDF when Notes was never opened) is pinned by no test | P2.1 |
| R-9 | MAJOR | `features/demo/ui/screens/__tests__/time-offset-advisories.test.tsx:176-181` | The sole end-to-end DST-advisory pin is conditional on the runner's timezone and vacuous on UTC CI; the bridge has no `isDst` seam | P2.5 |
| R-10 | MINOR | `features/demo/ui/inputs/GpsCaptureControl.tsx:165` · `engine/logic/gps.ts:142-147` | Sample-counter denominator hand-types `10`; `PRECISE_GPS_CONFIG` re-types the same constants — silent drift surface | P2.3 |
| R-11 | MINOR | `features/demo/engine/logic/final-submission.ts:85-90` · `deferred.md` §38 | §38's own strike-trigger fired this branch; three of four sites converted to `formatAddress`, `toFinalSubmissionInput` was not and the ledger was not amended — stale-on-arrival | P2.4 |
| R-12 | MINOR | `features/demo/ui/screens/NotesScreen.tsx:343-351` | `copyAll` reset timer untracked/uncleared: overlapping clicks wipe a later confirmation; timer outlives unmount | P2.1 |
| R-13 | MINOR | `features/demo/ui/inputs/GpsCaptureControl.tsx:122-126` · `engine/logic/gps.ts:195-206` | Capture chain has no terminal `.catch`, and `toGpsFix` doesn't validate `timestampMs` — a malformed position yields a dead button with no failure message | P2.3 |
| R-14 | MINOR | `features/demo/ui/screens/NotesScreen.tsx:421-431` · `DemoExperience.tsx:1113-1130` | `SectionBlock` memo defeated by fresh callback identities; notes view-model and `computeDstAdvisory` rebuilt un-memoised every bridge render | P2.1 |
| R-15 | MINOR | `features/demo/ui/screens/OcrCaptureScreen.tsx:122-130` | The two commit-blocked reasons are unassociated, non-live text next to a `disabled` (unfocusable) button — undiscoverable and unannounced | P2.2 |
| R-16 | MINOR | `features/demo/engine/content/seed.ts:41` · `OcrCaptureScreen.tsx:75-78` | Constant fabricated "High confidence" chip renders green above red assumed-date / ambiguity warnings — the one fabricated number on screen is the one not labelled | P2.2 |
| R-17 | MINOR | `features/demo/ui/inputs/reverse-geocode.ts:26-30` · `LocationFields.tsx:79-81` | Partial reverse-geocode (`&&` guard catches only both-empty) blanks an operator-typed field with a success-shaped outcome and no notice | P2.3 |
| R-18 | MINOR | `features/demo/ui/inputs/capture-gps.ts:168` | `accuracyM: position.coords.accuracy ?? 0` fabricates "±0m · Excellent" for a provider that omits accuracy — the honest `undefined` is representable and unused | P2.3 |
| R-19 | MINOR | `time-offset-advisories.test.tsx:167,182` | Clock spy restored as the test body's last statement — an earlier assertion failure leaks a mid-January clock into subsequent tests | P2.5 |
| R-20 | MINOR | `features/demo/engine/store/selectors.ts:271,275` | `selectCaseNotesData`'s cameras/arrivalDepartures projections never exercised — a type-correct field swap (fps↔resolution) ships green | P2.1 |
| R-21 | MINOR | `features/demo/ui/inputs/__tests__/capture-gps.test.ts:195-204` | The mid-loop abort checkpoint (`capture-gps.ts:125`) is uncovered — only abort-before-first-reading is pinned | P2.3 |
| R-22 | MINOR | `features/demo/ui/screens/NotesScreen.tsx:36-37` | `ScrapAllMode`/`RestoreAllMode` re-declared as inline literals; narrow→wide flow means a widened store union silently never reaches the UI | P2.1 |
| R-23 | MINOR | `features/demo/engine/logic/ocr.ts:166-183` | `DvrTimestampReading` models mutually-exclusive outcomes as two independent nullables; both-set would render contradictory blocking warnings | P2.2 |
| R-24 | MINOR | `features/demo/engine/types/index.ts:110-114` | `GpsCoordinates` has seven unlinked structural copies — the `accuracyM?` widening already required a merge-time repair (NotesCamera) this PR's body records | P2.3 |
| R-25 | MINOR | `features/demo/engine/logic/gps.ts:242-253` | `gpsSourceLabel` hand-retypes `GPS_SOURCES` with a bare `default:` — a fourth source silently drops the provenance chip; 4 more hand-copies of the union | P2.3 |
| R-26 | MINOR | `features/demo/engine/content/seed.ts:31-35` | `OCR_SAMPLE_FRAMES` is an exported mutable `Record` — against precedent 7 and every sibling registry in this same diff | P2.2 |
| R-27 | MINOR | `features/demo/engine/logic/notes/time-on-scene-formatter.ts:14-17` | Module-private `interface ArrivalDeparture` shadows the canonical entity's name with a disjoint shape; annotations redundant | P2.1 |
| R-28 | MINOR | `features/demo/engine/types/index.ts:184-201` | `NoteSection`'s documented content/generatedContent invariant is unexpressed and unhealed — record-don't-fix (phone-verbatim persisted shape) | P2.1 |
| R-29 | MINOR | `features/demo/ui/screens/__tests__/NotesScreen.test.tsx:188` | Clipboard stub installed via `Object.defineProperty` with no teardown (nit-grade; file-local) | P2.1 |
| R-30 | MINOR | `docs/code-reviews/deferred.md:1014` | Stray `=======` git conflict marker in the committed ledger, between §39.5 and §40 (verified present) | orchestrator |
| R-31 | MINOR | `features/demo/ui/inputs/CoordinateDisplay.tsx:65-79` | `copied` status never returns to idle — "Coordinates Copied" persists until unmount, inconsistent with `copyAll`'s 1.6 s reset in the same PR | P2.3 |

---

## MAJOR findings

### R-1 [MAJOR] — Cross-location address contamination via un-guarded post-await store write
**Where:** `features/demo/ui/inputs/LocationFields.tsx:71-91` (write at :80)
**Lenses:** TYPESCRIPT-1. **Owner:** P2.3 (submission/GPS).

**Claim.** `handleCapture` awaits `reverseGeocode(...)` and then calls `onChange({ streetAddress, city })` with no abort flag, mounted flag, or generation token. The callback chain (`SubmissionScreen.handleLocationChange:109-121` → bridge `DemoExperience.tsx:974` `onChange={(f, v) => store.getState().updateField(f, v)}`) ends in `updateField`, which resolves its target **at call time**: `const id = get().currentLocationId` (`create-store.ts:332-334`). If the visitor switches locations while the lookup is in flight (navigate to Cases, open location B — unmounting does not cancel the promise, and the store outlives the tree), location A's geocoded address silently overwrites location B's — the exact string the completion gate validates and the Case Notes PDF header prints.

**Evidence (verified end-to-end by aggregator).** No `useRef`/`useEffect`/abort token anywhere in `LocationFields.tsx` (grep: zero hits). The required pattern exists in three neighbours, two added by this PR: `useGpsCapture.ts:54-107` (`abortedRef` gates every post-await write for the *capture* half of this same flow), `DemoExperience.tsx:538` (`importGen` generation token), `AddressAutocomplete.tsx:118,131` (`seq` token). `reverseGeocode` has no client-side timeout, so the race window is a slow Mapbox response. Blast radius grows: `LocationFields` is explicitly built for reuse by P3.4/P3.7, where a cancelled New-Location modal is a cheaper route to the same cross-write.

**Suggested fix.** Give the geocode half the same guard the capture half has: an abort ref set in a mount-effect cleanup, re-checked after the `await` before `onChange`/`setLookupFailed`/`setReverseGeocoding`. Because the component can survive a location switch without unmounting, prefer a generation/identity token (thread the location id in, or capture `values` identity) — the rule to satisfy: **no post-await store write without a token check**. No test pins this path (`submission-gps.test.tsx` covers happy/toggle-off/null-result only); add one.

---

### R-2 [MAJOR] — "Progress Saved" promises persistence that may not exist
**Where:** `features/demo/ui/DemoExperience.tsx:144-147` (copy), `:848-861` (`saveProgress`), `:295-304` (wiring); `engine/store/persistence.ts:498-535`
**Lenses:** SF-1. **Owner:** P2.4 (gate — the alert is the blocked alert's second arm).

**Claim.** New in this diff, the demo makes its first visitor-facing persistence claim: *"Your work stays in this browser tab — it survives a refresh…"*, rendered unconditionally. Persistence is wired as `persistDemoStore(store, sessionStorageOrNull())`; `sessionStorageOrNull()` returns `null` on any throw (`:157-164`) and `persistDemoStore` answers `null` storage with `NOOP_HANDLE` — a total, breadcrumb-free no-op. Second path: the save catch (`persistence.ts:520-535`) deliberately **clears** the previous snapshot on a quota/security failure, so the refresh the visitor was just told is safe boots empty. Both violate the parity plan §4 honesty rule ("anything the browser can't truly do gets an explicit honest treatment — never a fake success"), the demo's binding brand rule.

**Evidence (verified).** `PROGRESS_SAVED_BODY` constant and the single-OK `saveProgress` confirmed; `NOOP_HANDLE` at `persistence.ts:499`; the module header's "write failures never surface to the VISITOR" policy predates the demo making any visitor-facing claim — the new alert is what turns that policy into a lie in the storage-blocked case (enterprise policy, privacy extension, sandboxed embed).

**Suggested fix.** One boolean, one ternary: have `persistDemoStore` expose `live: boolean` on the handle (or capture `sessionStorageOrNull() !== null` alongside it), and branch the alert body — live → current copy; not live → *"This browser isn't storing the session — your work will be lost if you refresh or close the tab."* Flip the same boolean from the save catch so a post-failure alert also demotes the promise. Pin with a test rendering the alert with storage unavailable.

---

### R-3 [MAJOR] — `extractedScopesPartial` has no consumer; court PDF can under-report recovery unmarked
**Where:** write `features/demo/engine/store/create-store.ts:446`; missing read in `engine/store/selectors.ts` (`selectCaseNotesData`) + `engine/logic/pdf/case-notes.ts`
**Lenses:** SF-2 (no TESTS overlap — TESTS-4 is a different selectors path; see Appendix B). **Owner:** P2.1 (the PDF/notes consumer is the fix site; the flag itself is P1-era, its stakes raised by this diff).

**Claim.** P2.1 re-pointed the court document's recovered-footage line at `form.extractedScopes` (Path A wins in `scopes-formatter.ts`). `generateExtractedScopes` drops non-canonical scopes per-entry and records it as `extractedScopesPartial: true` — but the flag is read by **nothing** (grep verified: declaration, seed, write, zod schema; zero UI/PDF reads). This diff's own comment (`time.ts:143`) claims the `roundTo5Min` throw "is surfaced, never swallowed" via the flag — the state half of that surfacing does not exist. Contrast `adjustedScopesPartial`, which *is* consumed and renders the red `&#9888;` note (`case-notes.ts:146-158`).

**Evidence (verified).** Grep for `extractedScopesPartial` outside tests: `types/index.ts:225`, `seed.ts:65`, `create-store.ts:446`, `persistence.ts:230` — no consumer. The nothing-warns trace holds: (1) Calculate with one non-canonical scope → `extractedScopes=[A]`, flag true, `adjustedScopesPartial` also true (PDF note *would* show); (2) visitor fixes scope B's times, does **not** re-Calculate (nothing prompts); (3) `selectAdjustedScopes` recomputes **live from `form.scopes`** (verified, `selectors.ts:79-97`) → both rows convert → `adjustedScopesPartial` false, red note gone — while `form.extractedScopes` is still the stale one-entry list; (4) Preview PDF: Adjusted table shows two ranges, Case Notes body recovers one, no warning anywhere.

**Suggested fix.** Consume the flag mirroring `adjPartialNote`: thread `extractedScopesPartial` into `CaseNotesData` in `selectCaseNotesData` and render the same `&#9888;` note beside the Case Notes block when set (idiom already at `case-notes.ts:146-158`); optionally annotate the Extracted Scope screen. Do **not** change `formatScopes` — the filter is a verbatim phone port and correct for a *flagged* partial.

---

### R-4 [MAJOR, promoted] — OCR commit destroys edited extracted scopes with no confirmation (phone prompts)
**Where:** `features/demo/ui/DemoExperience.tsx:810-827` (`confirmOcr` → `calcOffset` at :762-765); guard exists only at `ui/screens/TimeOffsetScreen.tsx:52-62`
**Lenses:** WEB-8 (filed as a cross-lane routing note, MINOR, phone-side unverified). **Owner:** P2.2 (OCR confirm path), consulting P2.5 (owner of the recalculate guard).

**Claim.** P2.5 gates the **Calculate** button behind a confirmation when `hasExtractedScopes` — the screen's own comment calls the guard "load-bearing here, not ceremony," because `generateExtractedScopes` replaces the editable list wholesale. The OCR commit path (`confirmOcr` → `calcOffset()` → `calculateOffset(); generateExtractedScopes()`) reaches the same destructive regeneration with **no prompt**. Reachable flow: generate scopes → edit them on the Extracted Scope screen → re-capture OCR → "Use this & calculate" → edits gone, silently.

**Evidence — promotion justified by phone source (verified by aggregator; the lane could not).** The phone's OCR completion handler *does* guard exactly this: `app/(form)/ocr-capture.tsx:288-317` (phone repo) — when `extractedScopes.length > 0`, `Alert.alert('Recalculate Time Offset', …)` with three buttons: **Cancel**, **Keep My Edits** (`performOcrCalculation(result, false)` — calculates without regenerating), **Regenerate Scopes** (destructive style). So this is not merely a demo-internal inconsistency: it is silent destruction of operator work on a path the phone protects, and the divergence is logged nowhere (§40 does not carry it). That combination — data loss + silent + unlogged parity gap — is MAJOR.

**Suggested fix.** Route `confirmOcr` through the same `AlertDialog` confirmation when extracted scopes exist, ideally with the phone's three-arm shape (Cancel / Keep My Edits / Regenerate — `calcOffset` needs a `regenerate: boolean` split mirroring `performOcrCalculation`). At minimum, reuse the two-arm recalculate confirm. If a lesser shape is chosen, log the divergence in `deferred.md` §40 with a trigger.

---

### R-5 [MAJOR] — `ConfirmDialog`: a second, weaker blocking-dialog primitive in the PR that shipped the strong one
**Where:** `features/demo/ui/screens/NotesScreen.tsx:90-156` (vs `ui/controls/AlertDialog.tsx`)
**Lenses:** WEB-1 (a11y, MAJOR) + TYPESCRIPT-4 (scrim-semantics contradiction, MINOR) + TYPE-DESIGN-8 (divergent action/type shapes, LOW) — one component, one consolidated finding. **Owner:** P2.1 (NotesScreen).

**Claim.** All six Notes confirmations (reset/restore section, restore-all ×2, scrap-all — several destructive, e.g. "Start blank" wipes all seven sections) route through a screen-local `ConfirmDialog` that ships alongside, and beneath, the `AlertDialog` primitive this same PR introduced and tested:

- **A11y (the gating half, verified):** `aria-label={title}` only — the body copy stating the destructive consequence (*"Auto-generation stops for every section"*, *"sections you rewrote will be replaced"*) is never associated (`aria-describedby` absent); no `tabIndex={-1}`, no focus-move on mount, no focus-return on close (the only effect is the Escape listener). With `aria-modal="true"` marking everything outside inert to AT, a screen-reader user is left focused on an element the AT is told to ignore, with no announcement a dialog opened. `AlertDialog.tsx:41-61` carries the full contract (labelledby + describedby + focus in/out), four tests pin it, and `deferred.md` §39.1's resolution records it as the consolidation target. This is **not** the §focus-trap deferral (`deferred.md:164-167`) and not the PR-body's "aria-modal without focus trap" deliberate choice — missing focus *entry* and describedby on a new destructive dialog is a different, larger gap.
- **Secondary (same fix):** the Escape effect keys on `onCancel`, and every call site passes a fresh inline `() => setDialog(null)` — listener teardown/re-add every render, the exact anti-pattern this PR itself comments and fixes twice (`DemoExperience.tsx:356-358`, `TimeOffsetScreen.tsx:64-66`).
- **Design divergences riding along:** ConfirmDialog's scrim **dismisses** (`onClick={onCancel}`) while `AlertDialog` documents an inert scrim as the demo's blocking-dialog semantics — two contradictory answers to "does a scrim click dismiss?", undocumented in-file and unlogged in §39/§42. Its `DialogAction` (`destructive?: boolean`, `onPress?`) diverges from `AlertAction` (`style` union, required `onPress`), and the bridge's `AlertState` hand-re-derives `Omit<AlertDialogProps,'onDismiss'>`.

**Suggested fix.** Preferred: extend `AlertDialog` with a stacked-actions variant (+ implicit Cancel row) and delete `ConfirmDialog` — the §39.1 treatment. If the stacked layout must stay screen-local: port the six lines (`useId` + `aria-labelledby`/`aria-describedby`, `tabIndex={-1}` + focus-in/restore effect), wrap `onCancel` closures in `useCallback`, change `destructive?: boolean` → `destructive?: true`, and record the deliberate scrim divergence in `deferred.md` §42 with a trigger.

---

### R-6 [MAJOR] — CoordinateDisplay: copy-failure signal and forensic metadata unreachable by AT
**Where:** `features/demo/ui/inputs/CoordinateDisplay.tsx:84-134`
**Lenses:** WEB-2. **Owner:** P2.3.

**Claim.** The whole coordinate card is one `<button aria-label="GPS coordinates: …. Copy to clipboard.">`, with the `±8m · GPS · Good` metadata spans **and** the `role="status"` copy-confirmation/failure region rendered as descendants. Per ARIA, `button` has children-presentational descendants and the `aria-label` overrides the name computation — so an AT user hears neither the measured accuracy/rating/source nor "Unable to copy coordinates to clipboard" when the clipboard is denied (the component's own comment says a blocked clipboard "must not look like a successful copy"; for AT it looks like nothing at all). The correct in-repo pattern is 40 lines away in this same PR: `GpsCaptureControl.tsx:162-176` puts `role="status"`/`role="alert"` as siblings **outside** the button.

**Evidence (verified).** Structure confirmed exactly as claimed — metadata spans and the conditional `role="status"` div all inside the `<button>`; `aria-label` carries coordinates + copy hint only.

**Suggested fix.** Move the `role="status"` block out to a DOM sibling of the button (the GpsCaptureControl shape) and fold accuracy/rating/source into the accessible name (`aria-label` extended with `accuracy ±8m, Good, source GPS`).

---

### R-7 [MAJOR] — Capture button disables mid-capture, stranding keyboard focus on `<body>`
**Where:** `features/demo/ui/inputs/GpsCaptureControl.tsx:131-141`
**Lenses:** WEB-3. **Owner:** P2.3.

**Claim.** `disabled={busy || disabled}` for the whole capture (30 s default budget; 120 s under `PRECISE_GPS_CONFIG`, which the docblock says P3.7 will mount). Browsers blur a disabled element → focus falls to `<body>`; a keyboard user loses their place in a ~12-field form, and on the common failure (permission denied) the `role="alert"` fires while focus is nowhere — no route back to the control. `aria-busy` annotates a node the user is no longer on. The repo's own commented, tested idiom for exactly this is `PickerStage.tsx:171-192` (R-17: disabled clipboard card re-focused on failure) and it is not applied here. No test pins the current focus behaviour as deliberate.

**Evidence (verified).** `disabled={busy || disabled}` confirmed; no ref, no focus effect anywhere in the component.

**Suggested fix.** Ref the button and re-focus it when `isCapturing` flips false with a `failure` present (the PickerStage effect, verbatim). Stronger option: `aria-disabled` + early-return in `onClick` so focus is never dropped at all.

---

### R-8 [MAJOR] — Flow F (the court PDF's never-opened-Notes path) is pinned by no test
**Where:** `features/demo/engine/store/selectors.ts:241-246` (production); `engine/__tests__/engine-flow.test.ts:23,53` (the near-misses)
**Lenses:** TESTS-1. **Owner:** P2.1.

**Claim.** The read-only reconcile inside `selectCaseNotesData` is the only thing that puts notes into the court PDF for a visitor who never opens the Notes screen — the single most likely path (Notes is step 12 of 13; Completion's CTA reaches the document directly, `DemoExperience.tsx:881`). The only store-side reconcile trigger is view-gated (`if (view === 'notes')`, `DemoExperience.tsx:405-408`). Both engine-flow tests call `store.getState().reconcileNotes()` immediately before generating the document, so replacing the Flow F expression with plain `loc.form.notesSections` leaves the entire suite green — and without Flow F, the never-opened path assembles `''` and `case-notes.ts:220-224` drops the whole Case Notes block. The comment's second promise ("Nothing is written back to the store") is likewise unpinned.

**Evidence (verified).** Selector, view-gated effect, PDF call site, and both tests' `reconcileNotes()` preambles all confirmed; the other `selectCaseNotesData` tests run on an empty store or assert only `adjustedScopes`; the completion-gate test asserts only the iframe's existence.

**Suggested fix.** One test, deliberately **not** calling `reconcileNotes()`: build a location, set a field a formatter consumes, generate the document straight off the selector, assert the notes content is present **and** `form.notesSections` in the store is still `[]` (the read-only promise). The tests lane's draft in `lane-tests.md` (TESTS-1) is ready to lift.

---

### R-9 [MAJOR] — DST advisory's only end-to-end pin is vacuous on UTC CI; the zone is not injectable at the bridge
**Where:** `features/demo/ui/screens/__tests__/time-offset-advisories.test.tsx:176-181`; seam gap at `DemoExperience.tsx:1017-1024`
**Lenses:** TESTS-2 (+ TESTS-3 = R-19 is the same file's spy-hygiene issue, kept separate). **Owner:** P2.5.

**Claim.** The test branches on `zoneHasDst`; in the non-DST arm the assertion is `expect(advisory).toBeNull()` — satisfied equally by a fully disconnected wiring. On a UTC runner (the documented CI default; empirically confirmed by the lane, 13/13 green under `TZ=UTC`), dropping the `dstAdvisory` prop or short-circuiting `computeDstAdvisory` to `null` ships a Time-Offset screen that never warns about a DST straddle — a forensic advisory — with CI green. Root cause: the bridge passes `now: clock.now` but omits `isDst`, so `computeDstAdvisory` falls back to host-zone `isInDST` (`dst-advisory.ts:144`, verified — `isDst = isInDST` default with no bridge override). The wall clock is injectable; the zone is not. Not a re-file of deferred §4 (engine-side; already solved by injection in `dst-advisory.test.ts`).

**Suggested fix.** Give the bridge an injectable `IsDstFn` seam (optional prop, mirroring the `clock` seam), stub it with the suite's `usIsDst` fake, and assert the advisory **unconditionally**. Fallback: pin the zone for this file (beforeAll/afterAll, per the root CLAUDE.md's zone-pinning rule — never a global `TZ`) and delete the conditional.

---

## MINOR findings

### R-10 [MINOR] — Hardcoded GPS ceiling copies
**Where:** `GpsCaptureControl.tsx:165` (`config?.maxAttempts ?? 10`), `engine/logic/gps.ts:142-147` (`PRECISE_GPS_CONFIG` re-typing `10`/`500`). **Lenses:** TYPESCRIPT-2 + WEB-6 (same defect, merged). **Owner:** P2.3.
Second independent defaults for numbers `GPS_CONFIG_STATIC` owns, in a component whose docblock promises "every number on that line is measured." Change `maxAttempts` to 8 and the loop takes 8 samples while the readout says "of 10"; no test catches it. **Fix:** `config?.maxAttempts ?? GPS_CONFIG_STATIC.maxAttempts` (or have `useGpsCapture` return the resolved config); build `PRECISE_GPS_CONFIG` from `...GPS_CONFIG_STATIC`.

### R-11 [MINOR] — deferred §38 ships stale-on-arrival
**Where:** `engine/logic/final-submission.ts:85-90`; `deferred.md` §38. **Lenses:** TYPESCRIPT-3; independently verified by TYPE-DESIGN (its §38 trigger-audit reached the same fact). **Owner:** P2.4.
§38's strike-trigger ("when P2.3's `formatAddress` lands, make it the single producer … and this entry is struck") fired on this branch; `selectCaseNotesData`, the notes formatter, and the bridge joins converted — `toFinalSubmissionInput` did not (verified: still `.map(trim).filter(Boolean).join(', ')`), and §38 was not amended. Behaviourally inert (the gate only checks non-emptiness; `formatAddress` trims/drops identically), but the ledger describes a state that no longer holds and §38↔§42 cross-references now dangle. **Fix:** convert the site via `formatAddress` (keeping the documented no-`locationName`-fallback rule) and strike §38 — or amend §38 to a one-site entry. Do not merge as-is.

### R-12 [MINOR] — `copyAll` reset timer untracked
**Where:** `NotesScreen.tsx:343-351`. **Lenses:** TYPESCRIPT-5 + WEB-5 (same defect, merged; WEB filed MEDIUM → normalized MINOR: cosmetic flicker + an untracked timer, no incorrect state). **Owner:** P2.1.
`setTimeout(() => setCopied('idle'), 1600)` never stored/cleared: overlapping clicks let the first timer wipe the second confirmation mid-display; leaving Notes inside the window leaves the timer pending (no-op write, but every sibling — `syncTimer`, PdfPreview's R-47 verdict timer — tracks theirs). **Fix:** ref the handle, `clearTimeout` on re-arm and in an unmount effect.

### R-13 [MINOR] — GPS capture chain: no terminal `.catch`, unvalidated `timestampMs`
**Where:** `GpsCaptureControl.tsx:122-126`; `engine/logic/gps.ts:195-206`; `useGpsCapture.ts:85-108` (try/finally, no catch). **Lenses:** TYPESCRIPT-6 + SF-5 (same failure surface, merged). **Owner:** P2.3.
`toGpsFix` validates lat/lng but not `timestampMs`; `new Date(NaN).toISOString()` throws, nothing on the chain catches, `finally` resets the spinner — the button returns to idle with **no fix, no failure line** (the dead-button shape), and the only signal is an unhandled rejection. Trigger requires a non-conformant provider (spoofing extension, old WebView, manual stub of the injectable seam) — hence MINOR. **Fix (either/both):** guard `Number.isFinite(best.timestampMs)` in `toGpsFix` returning a typed failure; give `onClick`'s `.then` a `.catch` with the established `console.warn` breadcrumb.

### R-14 [MINOR] — Inert `SectionBlock` memo; un-memoised bridge derivations
**Where:** `NotesScreen.tsx:421-431` (fresh `onRequestReset` arrow per render), `DemoExperience.tsx:1113-1130` (inline `onCommitSection`/`onCommitAddendum`; `buildNotesSectionMeta` + `assembleNotesString` in render body). **Lenses:** WEB-4 (MEDIUM → MINOR: wasted reconciliation, no measured jank; the memo's own comment documents an intent the code doesn't deliver). Folded in per TYPESCRIPT's routing note: `computeDstAdvisory` at `DemoExperience.tsx:1017-1024` runs ~23 `isInDST` probes per render of the Time-Offset result block, also un-memoised (that site is P2.5's). **Owner:** P2.1 (+P2.5 for the DST site).
**Fix:** `useCallback` the `onRequestReset` arrow, hoist the bridge callbacks to stable identities, `useMemo` the two notes derivations on `currentLocation` (and optionally the DST advisory on its inputs).

### R-15 [MINOR] — OCR commit-blocked reasons unannounced and unassociated
**Where:** `OcrCaptureScreen.tsx:122-130`. **Lenses:** WEB-7. **Owner:** P2.2.
"DVR Time Required…" / "Confirm or correct the assumed date…" are plain text next to a `disabled` (unfocusable) button — undiscoverable by keyboard, unannounced on appearance. The in-PR idiom is `role="alert"` (`CompletionScreen.tsx:77`, `OcrCaptureScreen.tsx:89`). Only the empty-draft branch is fully silent (the assumed-date panel above is an alert), hence MINOR. **Fix:** `role="status"` on the hint lines + `aria-describedby` from the CTA, or `aria-disabled` + no-op handler.

### R-16 [MINOR] — Fabricated "High confidence" chip contradicts the warnings below it
**Where:** `seed.ts:41` (`OCR_SAMPLE_CONFIDENCE = 0.93`), `OcrCaptureScreen.tsx:75-78`, `DemoExperience.tsx:790`. **Lenses:** SF-3. **Owner:** P2.2.
Every sample frame renders green "High confidence — result looks good" from a constant — directly above the red "date below is **assumed**" alert (timeOnly frame) or the yellow ambiguity warning that exists *because* the resolver returned `confidence: 'low'`. The demo's one fabricated on-screen number is the one not labelled as fabricated — an honesty-rule tension. Pre-existing in value, but this diff re-homed the constant and grew the frames from one to three, creating the visible contradiction. §40 covers the *rail narration* overclaim, not this chip. **Fix:** label the chip (`OCR confidence (sample frame)`), or suppress it for `ambiguous`/`timeOnly` — **or** log it as an explicit §40 addendum. A decision, not an omission.

### R-17 [MINOR] — Partial reverse-geocode blanks a typed field with a success-shaped outcome
**Where:** `reverse-geocode.ts:26-30` (`if (!streetAddress && !city) return null` — catches only both-empty), `LocationFields.tsx:79-81` (writes both fields through unconditionally). **Lenses:** SF-4. **Owner:** P2.3.
Mapbox returning `context.address` without `context.place` (routine for rural addresses / reduced-context tokens) yields `{ streetAddress: '…', city: '' }` → truthy → the operator's typed City is blanked, `lookupFailed` stays false, no notice — and `formatAddress` drops the empty component so the loss propagates to the PDF header, notes, Cases row, and map sheet. The comment two lines above states the intent the `&&` doesn't deliver. Phone parity: the overwrite is verbatim, but the phone's `reverseGeocode` rejects rather than returning half-empty, so the phone never reaches this shape. **Fix:** write only the non-empty components and set `lookupFailed` (or a distinct partial notice) when either is missing.

### R-18 [MINOR] — `accuracyM ?? 0` fabricates "±0m · Excellent"
**Where:** `capture-gps.ts:168`. **Lenses:** SF-6. **Owner:** P2.3.
This phase made `GpsCoordinates.accuracyM` optional *specifically* so an unmeasured coordinate never renders fabricated precision (the type comment says so) — yet the capture path defaults a missing accuracy to `0`, the one value that renders green "±0m · Excellent" and instantly satisfies `meetsTargetAccuracy`, collapsing the multi-sample procedure to one sample. `CoordinateDisplay` already handles `undefined` correctly; the honest value is representable and unproduced. Same narrow trigger class as R-13. **Fix:** produce `undefined` via `Number.isFinite` (small ripple into `GpsSample`/`GpsFix`/`selectBestSample`: no-accuracy samples never win, never satisfy the target) — or keep the `0` with a comment stating the default is dead for conformant providers.

### R-19 [MINOR] — Clock spy restored as the test body's last statement
**Where:** `time-offset-advisories.test.tsx:167,182`. **Lenses:** TESTS-3. **Owner:** P2.5.
`vi.restoreAllMocks()` is unreachable when the assertion above it throws, leaking a mid-January `clock.now` into the rest of the file — order-dependence that manifests exactly when the run is already red. **Fix:** `afterEach(() => vi.restoreAllMocks())`, delete the inline call.

### R-20 [MINOR] — Selector camera/visit projections never exercised
**Where:** `selectors.ts:271,275`. **Lenses:** TESTS-4 (coverage run names these as the only uncovered lines in the file). **Owner:** P2.1.
No test invokes the `cameras`/`arrivalDepartures` mappers with data: the selector tests use an empty store or scope-only locations; the PDF test feeds hand-written literals. A type-correct value swap (`resolution: c.recordingFps`) ships green and the court document reports FPS as resolution. **Fix:** extend the `selectCaseNotesData` describe with a populated location (distinct resolution/fps and arrival/departure strings) asserting the projected objects field by field.

### R-21 [MINOR] — Mid-loop abort checkpoint uncovered
**Where:** `capture-gps.test.ts:195-204` vs `capture-gps.ts:125`. **Lenses:** TESTS-5. **Owner:** P2.3.
The single abort test aborts before the first reading; the loop-head checkpoint on iteration ≥2 is unpinned. Dropping it leaves an unmounted component polling geolocation up to 10×500 ms (state integrity still guarded by the post-loop check at `:179`, which *is* covered — hence MINOR). **Fix:** the lane's ready-to-lift test — first reading misses the target, `onProgress` flips `isAborted`, assert `getCurrentPosition` called exactly once and outcome `null`.

### R-22 [MINOR] — `ScrapAllMode`/`RestoreAllMode` re-declared inline at the consumer
**Where:** `NotesScreen.tsx:36-37` vs `create-store.ts:160-162` (exported through the barrel by this diff, zero consumers). **Lenses:** TYPE-DESIGN-1 (MEDIUM → MINOR per vocabulary rule; drift surface, no reachable invalid state). **Owner:** P2.1.
The callback flows narrow → wide, so widening the store union compiles clean while the only UI able to invoke the action can never emit the new member. The barrel export was added for exactly this call site and then not used. **Fix:** import the two types and annotate the props — one line.

### R-23 [MINOR] — `DvrTimestampReading` flattens mutually-exclusive outcomes into two nullables
**Where:** `engine/logic/ocr.ts:166-183`; flat copy in `OcrCaptureScreen`'s ok-arm. **Lenses:** TYPE-DESIGN-2 (MEDIUM → MINOR: unreachable today — the sole producer is total; defense-in-depth). **Owner:** P2.2.
`{ assumedDate, ambiguity }` both-set is representable-but-invalid; the screen branches on the two fields independently and would render contradictory blocking warnings. The same file's `TimestampParse` shows the correct discriminated shape. **Fix:** a `resolution` union (`exact` / `assumed-date` / `ambiguous`) consumed by both `isDvrDraftCommittable` and the screen — or at minimum document the exclusivity invariant and defer. No gate-behaviour change (that's on the do-not-re-flag list).

### R-24 [MINOR] — `GpsCoordinates` has seven unlinked structural copies; the drift already happened once
**Where:** `engine/types/index.ts:110-114` + the seven sites tabled in `lane-type-design.md` TYPE-DESIGN-3. **Lenses:** TYPE-DESIGN-3 (MEDIUM → MINOR: process/drift cost, no live defect — but note the PR body itself records the NotesCamera copy being missed and repaired at merge time, so the cost is demonstrated, not hypothetical). **Owner:** P2.3.
**Fix:** derive the three pure duplicates (`NewLocationModal` ×2, `SubmissionCoordinates = NonNullable<DemoLocation['gps']> & …`); bind the intentional projections (`NewLocationInput.gps`, `NotesCamera.gps`, `LocationFieldValues`) with `Pick`/`satisfies` the way `persistence.ts`'s `FullShape` device already does — the one mirrored layer that did *not* drift.

### R-25 [MINOR] — `gpsSourceLabel`: hand-typed union + bare `default:`
**Where:** `engine/logic/gps.ts:242-253`; the union hand-typed at 5 sites (4 new). **Lenses:** TYPE-DESIGN-4 (MEDIUM → MINOR). **Owner:** P2.3.
`default: return ''` is load-bearing for `undefined`, which disguises the exhaustiveness gap: a fourth `GPS_SOURCES` member (P4 import-provided coordinates is the named candidate) silently renders **no provenance chip** on a card whose job is provenance. The in-diff correct pattern is `FallbackMode`'s `const exhaustive: never`. **Fix:** export `type GpsSource = (typeof GPS_SOURCES)[number]`, annotate the five sites, replace the bare default with `case undefined` + a `never` check.

### R-26 [MINOR] — `OCR_SAMPLE_FRAMES` exported as a mutable `Record`
**Where:** `seed.ts:31-35`. **Lenses:** TYPE-DESIGN-5 (filed LOW with the lane's own reasoned demotion from the rubric's MEDIUM — accepted; consequence is cosmetic). **Owner:** P2.2.
Every sibling registry in this diff is frozen or `as const`. **Fix:** `as const satisfies Record<OcrSampleFrame, string>`; optionally sweep `SECTION_ORDER`/`TONE_COLOR`/`MONTH_NAMES`.

### R-27 [MINOR] — Local `interface ArrivalDeparture` shadows the canonical entity's name
**Where:** `notes/time-on-scene-formatter.ts:14-17` (fields `arrivalDateTime`/`departureDateTime`) vs `engine/types/index.ts:51-55` (`id`/`arrival`/`departure`). **Lenses:** TYPE-DESIGN-6. **Owner:** P2.1.
Zero overlapping keys under a canonical name; a future "fix the missing import" swap silently binds the wrong shape. The annotations are redundant (element type fully inferred from `NotesRelevantFormData`). **Fix:** delete the local interface (or `type NotesVisit = NotesRelevantFormData['arrivalDepartures'][number]`).

### R-28 [MINOR] — `NoteSection`'s documented invariant unexpressed (record, don't fix)
**Where:** `engine/types/index.ts:184-201`; reconciler at `section-reconciler.ts:109-115`. **Lenses:** TYPE-DESIGN-7 (LOW; the lane itself recommends recording over fixing — a union would fork the demo's persisted shape from the phone's for an unreachable state, against the phase's premise). **Owner:** P2.1.
Violation requires hand-editing sessionStorage (the snapshot guard discards malformed shapes — verified by the lane); worst case is a stale staleness-baseline that self-heals. **Disposition:** record in the ledger; optionally make the reconciler's un-edited arm also compare `generatedContent` (self-healing at one comparison's cost).

### R-29 [MINOR, nit-grade] — Clipboard stub with no teardown
**Where:** `NotesScreen.test.tsx:188`. **Lenses:** TESTS-6 (NIT → counted MINOR; file-local, no cross-file leak, no later reader in-file). **Owner:** P2.1.
**Fix:** restore the captured descriptor in `afterEach`, or `vi.stubGlobal` + `unstubAllGlobals`.

### R-30 [MINOR] — Stray merge-conflict marker in the committed ledger
**Where:** `docs/code-reviews/deferred.md:1014` — a bare `=======` between the end of §39.5 and §40, rendering as a horizontal rule. **Lenses:** tests lane out-of-lane observation; **verified present by aggregator.** Almost certainly from the `parity/p2-*` merges into `feat/parity-p2`. Review ledgers are committed artifacts of this phase — must not merge with a conflict scar. **Owner:** orchestrator (merge-integration). **Fix:** delete the line; scan the file for siblings (`grep -n '^=======$\|^<<<<<<<\|^>>>>>>>' docs/code-reviews/deferred.md`).

### R-31 [MINOR] — `CoordinateDisplay.copied` never returns to idle
**Where:** `CoordinateDisplay.tsx:65-79` (verified: `copy` sets `'ok'`/`'failed'`; no reset path exists). **Lenses:** named in lane-typescript's cross-lane routing note ("all web-reviewer"), not filed by the web lane — recovered and verified by the aggregator so it isn't lost between lanes. **Owner:** P2.3.
"Coordinates Copied" (or the failure line) persists until unmount or the next copy — inconsistent with this same PR's `copyAll` 1.6 s reset (R-12) and with the phone's auto-dismissing toast. Low stakes; pairs naturally with the R-6 restructure and the R-12 timer idiom (one shared shape fixes both screens).

---

## Appendix A — Independent spot-checks of every MAJOR (aggregator, against source at `9f5c01a`)

| Finding | Checked | Result |
|---|---|---|
| R-1 | `LocationFields.tsx` full read; `SubmissionScreen.tsx:100-121`; `DemoExperience.tsx:974`; `create-store.ts:326-335`; grep for any ref/effect/token in `LocationFields` (zero); `useGpsCapture`'s `abortedRef` contrast | **Held.** Chain verified end-to-end; call-time `currentLocationId` read confirmed; no guard on the geocode half |
| R-2 | `PROGRESS_SAVED_BODY` + `saveProgress`; `sessionStorageOrNull`; `persistDemoStore` → `NOOP_HANDLE` (`persistence.ts:499,513`); save-catch snapshot-clear | **Held.** No liveness signal reaches the alert; both adversarial paths real |
| R-3 | Repo-wide grep for `extractedScopesPartial` (4 non-test hits, no consumer); `case-notes.ts:146-158` contrast; `selectAdjustedScopes` live recompute (`selectors.ts:79-97`); flag origin (`git show master:…` — pre-existing, P1-era) | **Held.** The nothing-warns trace is reachable; the diff's `time.ts:143` comment claims a surfacing that doesn't exist |
| R-4 | Demo: `confirmOcr`/`calcOffset` (`DemoExperience.tsx:762-765,810-827`), `TimeOffsetScreen.tsx:52-62` guard. **Phone source:** `app/(form)/ocr-capture.tsx:282-320` | **Held and PROMOTED** (lane filed MINOR, phone-side unverified). Phone shows a three-button confirm (Cancel / Keep My Edits / Regenerate Scopes) on exactly this path; demo silently regenerates |
| R-5 | `NotesScreen.tsx:90-156` full read; `AlertDialog.tsx:1-70` full read | **Held.** `aria-label` only, no focus mgmt, dismissing scrim, `onCancel`-keyed Escape effect — all confirmed |
| R-6 | `CoordinateDisplay.tsx:30-134` full read | **Held.** Status region and metadata inside the labelled button, exactly as claimed |
| R-7 | `GpsCaptureControl.tsx:100-180` full read | **Held.** `disabled={busy || disabled}`, no ref/focus restoration anywhere |
| R-8 | `selectors.ts:241-246`; `engine-flow.test.ts:15-60`; `DemoExperience.tsx:405-408,881` | **Held.** Both tests reconcile into the store first; the view-gated effect is the only store-side trigger |
| R-9 | `time-offset-advisories.test.tsx:150-183`; `DemoExperience.tsx:1017-1024`; `dst-advisory.ts:144` | **Held.** `isDst` seam exists in the engine and is not threaded through the bridge; conditional assertion confirmed |

Nothing was refuted; no MAJOR was demoted.

## Appendix B — Dedupes, conflicts, and severity normalization

**Cross-lane dedupes (one defect, one finding):**
- R-5 ← WEB-1 (MAJOR, a11y) + TYPESCRIPT-4 (MINOR, scrim/consolidation) + TYPE-DESIGN-8 (LOW, type shapes). Merged at MAJOR — the a11y gap gates; the design/type facets are riders with the same fix locus.
- R-10 ← TYPESCRIPT-2 + WEB-6 (identical `?? 10`).
- R-12 ← TYPESCRIPT-5 + WEB-5 (identical timer).
- R-13 ← TYPESCRIPT-6 + SF-5 (same chain: missing `.catch` + unvalidated timestamp).
- R-11 ← TYPESCRIPT-3, corroborated by TYPE-DESIGN's independent §38 trigger-audit (which explicitly routed it to the TS lane).
- R-14 ← WEB-4, with the `computeDstAdvisory` render-scope cost folded in from TYPESCRIPT's routing note (web lane did not file that site).
- **Watched, no dedupe needed:** SF-2 (R-3) vs the TESTS lane — TESTS-4 (R-20) touches `selectors.ts` but a different projection path (cameras/visits, not scopes); both stand. The a11y cluster vs TESTS/TYPE-DESIGN filings on the same components (TESTS-6, TYPE-DESIGN-1) are distinct defects; kept separate.

**Promotions (justified):**
- R-4: WEB-8 was filed as a MINOR cross-lane routing note with the phone side explicitly unverified. Aggregator verified the phone source: it confirms silent destruction of operator work on a path the phone guards with a three-option prompt, unlogged in §40 → MAJOR.

**Demotions / vocabulary normalization (MEDIUM/LOW/NIT → MINOR unless substance argued otherwise):**
- WEB-4, WEB-5 (MEDIUM) → MINOR: wasted reconciliation / cosmetic flicker; no incorrect state, no measured jank.
- TYPE-DESIGN-1/-2/-3/-4 (MEDIUM) → MINOR: all four are drift-surface or invariant-expression findings with **no reachable invalid state today** (the lane's own framing); none individually gates merge. R-24's demonstrated merge-time cost and R-22's one-line fix make them the two highest-payoff minors.
- TYPE-DESIGN-5/-6/-7/-8 (LOW) → MINOR (TD-8 folded into R-5); TD-5 retains the lane's reasoned demotion from its rubric's MEDIUM.
- TESTS-6 (NIT) → counted as MINOR (nit-grade noted in R-29).
- TESTS MAJOR = the lane's rubric HIGH; SF MAJOR = charter HIGH — both map to MAJOR unchanged.

**Conflicts settled:**
- ConfirmDialog vs AlertDialog scrim semantics: `AlertDialog`'s non-dismissing scrim is on the PR's deliberate-choices baseline and was **not** re-flagged; the flagged defect is the *second* primitive contradicting it undocumented (R-5). Binding contract (parity plan §4 / §39.1 consolidation) favors folding into `AlertDialog`.
- SF-3's disposition question (fix vs §40 deferral) is presented as an explicit decision in R-16 rather than resolved unilaterally — either closes it; silence does not.
- No lane re-flagged any PR-body deliberate choice (D10, §M13 2σ refutation, asyncUtilTimeout 5000 — assessed and *accepted* with evidence by the tests lane, AlertDialog semantics, uncopied phone bugs, snapshot v4, orchestrator merge commits, today-guess gate). Nothing dropped on that ground.

**Dropped:** none. Every lane finding survives, merged or standalone. Aggregator-recovered items: R-30 (tests lane's out-of-lane observation, verified), R-31 (TS-lane routing note the web lane dropped, verified).

## Appendix C — Raw lane-file inventory

| File | Lane | Self-reported counts | Lane verdict |
|---|---|---|---|
| `docs/code-reviews/parity/p2/lane-typescript.md` | typescript-reviewer | 0 B / 1 M / 5 m | REVISE |
| `docs/code-reviews/parity/p2/lane-web.md` | web-reviewer | 0 B / 3 M / 2 MEDIUM / 3 m | REVISE (implicit) |
| `docs/code-reviews/parity/p2/lane-tests.md` | test-analyzer | 0 B / 2 M / 3 m / 1 NIT | REVISE |
| `docs/code-reviews/parity/p2/lane-silent-failures.md` | silent-failure-hunter | 0 B / 2 M / 4 m | REVISE |
| `docs/code-reviews/parity/p2/lane-type-design.md` | type-design-analyzer | 0 CRITICAL / 0 HIGH / 4 MEDIUM / 4 LOW | APPROVE with comments |

Supporting evidence doc (not a lane): `docs/code-reviews/parity/p2/gate-import-flake.md` — the measured asyncUtilTimeout diagnosis, assessed sound by the tests lane.

Lane files are the per-lane resumable state for the fix-delta pass; each carries its own "checked and clean" inventory and re-check instructions. This document is the orchestrator-facing source of truth for findings and severities; where a lane file and this document disagree, this document governs.
