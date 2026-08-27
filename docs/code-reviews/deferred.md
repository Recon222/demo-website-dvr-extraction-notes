# Deferred code-review items

The running backup log of deferred review items, so nothing consciously parked is lost.
Each entry needs a real reason to wait **and** a concrete un-defer trigger — this is not a
general TODO dump. Add to it whenever a review finding is deliberately deferred.

---

## 1. `FeatureNav` strip is mounted site-wide (decide placement later)

**Source:** PR #8 review (`feat/feature-nav-strip`).

**What:** `FeatureNav` is mounted in the root layout (`app/layout.tsx`), so the second-row
feature strip renders on **every** route — `/`, `/beta`, `/privacy`, `/features`, and
`/features/[slug]`. On the homepage this duplicates the `FeatureGrid` (the same features
appear once as the strip and once as the grid lower down); on `/beta` and `/privacy` it is
arguably just noise.

**Why deferred:** The overall navigation approach is being reconsidered. No point moving
the strip until that direction is settled. It is not a bug — it works as written and the
placement is intentional for now.

**Options when revisited:**
- Keep it in the root layout → strip stays global.
- Move it to a nested `app/(default)/features/layout.tsx` → strip only on `/features` and
  `/features/[slug]`, and the homepage stops listing features twice.

**Trigger:** When the navigation/IA approach is finalized.

---

## 2. Transient coordination comments in `lib/content/features.ts`

**Source:** PR #8 review (comment-rot risk).

**What:** The catalog file carries in-flight working notes: `navLabel` "(provided by Kris)",
the `STATUS NOTES (per Kris)` block, and the `PLACEHOLDER` / `PROVISIONAL` markers on the
`notes` and `reports` entries.

**Why deferred:** These are live coordination notes for copy that is actively being written.
They are useful right now. Removing them prematurely would strip in-flight context.

**Trigger:** Remove each marker in the same edit that finalizes the copy it refers to (i.e.
when the `notes` `draft` flag is dropped and when `reports` copy is signed off). The `draft`
flag on the type now tracks the unfinished state in code, so these comments are belt-and-
suspenders until then.

---

## 3. `parseAiJson` / `mapAiToForm` give no blank-vs-garbage signal

**Source:** PR #9 fixes-review (M-1, silent-failure lane).

**What:** The AI-import types are now honest (`parseAiJson` returns `Partial`), but at
runtime a malformed payload maps to an all-blank `MappedImport` indistinguishable from a
legitimate "no fields found" result — no recognized-field count, validated flag, or
throw-on-zero-known-fields. Noted inline on `mapAiToForm` (`lib/demo/logic/import.ts`).

**Why deferred:** Latent. The demo never calls a live model — the import chapter resolves
to `SAMPLE_EXTRACTION` — so a garbage payload cannot occur today. Adding a signal now is
speculative API for a path with no caller (YAGNI).

**Trigger:** When a real on-device model is wired into the import chapter (Milestone 2+),
add a recognized-field signal (count / validated flag / throw on zero known fields).

**✅ RESOLVED — PR #15 (live PDF import).** `parseNormalizeMap` now returns a `fieldCount`,
and `run-import.ts` rejects a live reply that parses to zero fields (`fieldCount === 0 &&
timeFrameCount === 0`) with a "No recognizable fields found" error instead of creating a blank
location. The sample fallback (guided/keyless) is unaffected (it always has fields).

---

## 4. Milestone-2 engine refinements (parked during M1)

**Source:** PR #9 review + fixes-review (type-design · simplification · test lanes).
Justified deferrals — behaviour-preserving hardening with no active defect, best done when
M2 gives these paths live callers.

- **Registry exhaustiveness** — replace the `0`/`null` sentinels in `content/screens.ts`
  with a `Record<ChapterId, number> satisfies …` so a screen added without registering is a
  compile error (today it silently returns `0`/`null`).
- **`LocationForm.media` ↔ `MediaKind`** — link via a mapped type so a new media kind can't
  be silently omitted.
- **Math simplification helpers** — extract `parseAsUtc` / `formatUtc` (shared by
  `applyTimeOffset` + `roundTo5Min`) and `resolveDashParts` (the duplicated DD-MM block);
  reconcile `nowStamp` vs `getCurrentFormattedTime`. Deferred so the safety-critical ported
  math isn't refactored until it has live callers exercising the strengthened quadrant tests.
- **Seed-entity field immutability** — `isSeed` is `readonly`; the rest of the seed entity
  fields remain mutable (Advisory).
- **TZ-pinned DST test** — the signed-shift test proves the direction is *consistently
  applied*, not *correct* for a DST zone. Add a `TZ=America/Toronto` CI step or a fixed-offset
  fixture to cover the DST-true branch.
- **OCR assumptions surfaced in M2 UI** — the dash parser's MM-DD default (H-4) and the
  time-only → today default (M-3) are inline-noted in `lib/demo/logic/ocr.ts`; the M2 OCR
  chapter must let a reviewer confirm/correct both.

**Trigger:** Milestone 3 (rolled forward from M2 — these land when the UI consumes the surfaces).

---

## 5. Milestone-2 review deferrals — type-safety & simplification (→ M3)

**Source:** PR #10 review + fixes-delta (type-design · simplification · silent-failure lanes).
Behaviour-preserving; fold in as M3 builds UI on these surfaces.

- **Typed `updateField` path** — `updateField(path: string)` has no structural link to
  `DemoLocation`/`CaptureState`, so a beat-path typo only surfaces via the dev-warn at runtime.
  A `FieldUpdate` discriminated union (path → value type) makes typos a compile error;
  `setPath` stays string-based behind one marked cast. (The compile-time structural fix for the
  same beat-path typo footgun that finding #3's `setPath` dev-warn only guards at runtime.)
- **Arg-checked beat actions** — `call`/`tap` `args` cast to `unknown[]`, so a wrong arg
  type-checks. Distribute over `DemoActions` with `Parameters<DemoActions[K]>`. Contained today
  (only zero-arg actions are invoked).
- **`NavState` model** — `view`/`launchReturnView` are an unmodeled correlated invariant
  (`{ view:'ocr', launchReturnView:null }` is representable; the `?? 'submission'` fallback masks it).
- **`TimeOffsetInput` model** — `CaptureState` duplicates the input fields of `TimeOffsetData`
  (`calculateOffset` copies field-by-field, with a `method`/`captureMethod` rename trap).
- **Simplifications** — `patchCurrentLocation(updater)` (the repeated `get id → if(!id) → set(map)`
  across ~6 actions); `formatAddress(loc)` (duplicated in `generateNotes` + `selectCaseNotesData`);
  merge the runner's `waiters`/`cancels` Sets.
- **`calculateOffset` empty-input no-op** (silent-failure) — when the capture datetimes are blank,
  `calculateOffset` returns silently. This is a precondition, not a failure (the malformed-string
  path already signals via the director's `degraded` flag once a beat invokes it). The right
  feedback home is the M3 time-offset screen: disable "Calculate" until both datetimes are present,
  rather than warning on every speculative call.

**Trigger:** Milestone 3.

---

## 6. Phone-app parity checklist (verify against the real app before beta)

**Source:** ongoing — places where the demo may diverge from the React Native app. Sweep these
once the UI is built (M3+) to confirm 1:1 parity with the phone app. Add entries as they surface.

- **Requested scopes are picker-only — the "non-canonical scope" path is unreachable in the real
  flow.** In the app, requested-scope times come from date/time **pickers**, so `form.scopes` is
  *always* a proper datetime. The `extractedScopesPartial` safety net + PDF "could not be converted"
  annotation (fixes-delta #1) therefore guards a case the pickers make impossible. It only exists
  because M2 is headless: there's no picker screen yet, and the interim `applyImport` writes the AI's
  raw extracted text **straight into `form.scopes`**. **M3 fix:** import pre-fills the picker-backed
  fields (normalised/confirmed by the user), *not* the canonical scope list — then nothing ever
  drops. Once that lands, reassess whether the partial-drop net + annotation can be trimmed.
- **Offset requires a requested scope (UX ordering).** No time-offset step is reachable without a
  requested scope first, so an adjusted scope always exists in proper format. The M3 wizard must
  enforce this ordering; the headless engine does not.
- **Bidirectional DVR↔real conversion — verify presentation.** The converter flips direction via
  `isActualTime` (ported + tested both ways: a DVR-time request and a real-time request). Confirm the
  exact **DVR-in → real-out** wording/format in the notes + report matches the app (the math is
  ported; the *presentation* nuance is the parity risk).

**Trigger:** parity sweep after the UI lands (M3+), before beta.

---

## 7. Milestone-3 review deferrals — type-tightening & drawer a11y

**Source:** PR #11 review (type-design + code-reviewer Advisory).

- **`RailDot.active` → `activeDot` invariant.** ✅ **Done (PR #12 fixes).** StoryRail now takes
  `dots: { id; label }[]` + a single `activeDot: ChapterId`, so "exactly one active" is structural
  rather than a per-dot bool that could represent zero/many active.
- **`WizardDrawer` / `ModalShell` dialog a11y.** ✅ **Partially done (PR #12 fixes):** both now carry
  `aria-modal="true"` + Escape-to-close. **Still deferred:** a full focus trap + focus return
  (Tab-cycling confined to the open dialog, focus restored to the trigger on close).

**Trigger (remaining focus-trap):** a broader keyboard-nav/a11y pass, or before beta.

---

## 8. Milestone-4 deferrals — media-capture screens (fast-follow)

**Source:** M4 build scoping. The full wizard + completion flow (splash → … → completion → real
court PDF) is complete and plays end-to-end; the camera/mic media screens are a self-contained
fast-follow that hangs off the drawer's media accordion (the M3-deferred drawer infra).

- **MediaCaptureScreen** (real webcam photo/video + sample fallback), **AudioRecordingScreen**
  (real mic + simulated waveform fallback), **MediaLibraryModal** (captured-media gallery). Real
  getUserMedia/MediaRecorder with sample fallbacks per the architecture; tested via the
  sample-fallback path (mediaDevices undefined in jsdom).
- **Drawer "Media" accordion** that opens the three screens (+ the M3-deferred Escape/focus-trap).
- **CamerasScreen per-camera GPS lock** (simulated `onCaptureGps`).
- **`app/demo/page.tsx`** is a minimal route brought forward from M5 so the demo is viewable
  in-browser during dev. The full M5 (immersive chrome-free layout, Header/FeatureNav relocation,
  homepage/feature CTAs) is still its own milestone.

**Trigger:** fast-follow after M4 merges (before M5 wires the CTAs).

---

## 9. Milestone-4 fixes-delta residuals (Advisory)

**Source:** PR #12 fixes-delta review (APPROVE). Two Advisory items deliberately parked.

- **`ImportState` discriminated union.** `ImportState` is flat (`{ stage; text; result: ImportResult |
  null; lastLocId }`), so `{ stage: 'result', result: null }` is representable and the modal consumer
  keeps a `stage === 'result' && result` double-guard. Discriminating it over `stage` would ripple
  through five spread-based `setImp({ ...s, … })` updates — and the import flow itself is being
  reworked for the §6 import→picker parity (which restructures `ImportState` anyway). Deferring avoids
  churn the rework would undo. **Trigger:** the §6 import→staging rework.
- **No single end-to-end "guided tour → PDF" test.** The marquee / import / PDF paths are covered by
  the sandbox bridge tests + the un-mocked director integration test (adequate regression protection
  per the review), but no one test walks all 13 chapters through to the exported PDF. **Trigger:** when
  the guided beats are enriched (the user-testing #5 rework), add the full-tour e2e against the new script.

---

## 10. Name `YMD` / `Hms` part-shape types in the pickers (type-design)

**Source:** PR #14 review (type-design lane, Advisory).

**What:** The `{ y, mo, d }` and `{ h, mi, s }` shapes are written inline ~4× and ~3× across the
engine/UI boundary — `CalendarProps` (`selected`/`today`), `DateField`'s view `useState`,
`TimeWheelProps` (`value`/`onChange`), `mergeDate`/`mergeTime` signatures, and a local (unexported)
`Hms` in `TimeField`. They line up only by structural accident, so a field rename wouldn't surface as
a type error at every call site.

**Why deferred:** Pure behavior-neutral refactor touching ~6 files (`datetime-parts`, `Calendar`,
`DateField`, `TimeWheel`, `TimeField`, and the retention scope shapes). PR #14 is already very large
(pickers + retention + several iterations); folding a cross-file type churn in now adds review noise
for no behavior change. Not a bug.

**Trigger:** Next time any of these picker files is opened for real work — export `YMD`/`Hms` from
`engine/logic/datetime-parts.ts` and thread them through, in its own small PR.

---

## 11. Inline "date is in the future" signal (and other invalid-input hints)

**Source:** PR #14 fixes-review (silent-failure F2, Advisory).

**What:** `calculateTotalRetention` returns `null` for **both** an empty first-recorded-date and a
**future** one, so a user who fat-fingers a future date sees the same blank retention panel as
"not entered yet" — no "that date is in the future" hint. The same blank-vs-invalid ambiguity
exists in a few other inputs.

**Why deferred:** This wants to be done **once, deliberately**, across every place that needs it —
and the same treatment is being added to the real phone app, which the demo mirrors. Piecemealing a
discriminated `empty | future | ok` result into just the retention path now (when we're not focused
on input-validation UX) risks an inconsistent half-measure. Not a bug — the value is simply blank,
which is safe.

**Trigger:** When input-validation messaging is designed for the app (and mirrored to the demo) —
return a discriminated result from the relevant pure helpers and surface inline hints uniformly.

---

## 12. Guided-tour flow is piecemeal — needs a realistic start-to-finish overhaul

**Source:** PR #14 fixes-review (#1) + author direction.

**What:** The guided tour's beats were authored chapter-by-chapter and don't reflect how an officer
would actually move through the app end-to-end. The DVR-retention showcase exposed this: it now
relies on a fixed scenario "today" (`GUIDED_NOW` in `DemoExperience`) + a seeded `firstRecordedDate`
beat so the numbers look sensible against the demo's dated seed data — a deliberate stopgap, not a
real flow.

**Why deferred:** The current focus is **parity with the phone app (UI, flow, logic)**, which is most
evident in the free **sandbox**. Reworking the guided flow before sandbox parity is reached would
mean re-doing it; piecemeal beat tweaks now are counter-productive.

**Trigger:** Once the demo is at parity in sandbox — design the guided flow as a single, realistic
start-to-finish walkthrough (and revisit the `GUIDED_NOW` stopgap + seed dates as part of it).

---

## 13. Date-module type-honesty (verbatim-port footguns)

**Source:** PR #16 review (type-design L2/L3).

**What:** Two representable-but-unused states in the ported date modules:
- `DateTimeNormalizationResult.normalized` carries three meanings behind an untagged `string`
  (canonical / original-passthrough / `''`-blanked); the `''` case is undocumented.
- `YearDisambiguationResult.chosenYear` uses `0` as a magic sentinel for `unparseable_passthrough`
  (`new Date(0, …)` hazard if a future caller reads it).

**Why deferred:** These are faithful ports of the phone's forensic source. Neither state is consumed
today (the consumers read `warning`/`reason`, not these fields), so widening to `status:'ok'|'passthrough'
|'blanked'` / `chosenYear: number|null` is additive churn that drifts from the source and aids no
caller (YAGNI). Latent footguns, not bugs.

**Trigger:** When a consumer actually needs to distinguish the states (e.g. a richer completion UI in
Slice B), add the discriminant/`null` at that point — and mirror it to the phone source.

---

## 14. DST edge in `inferYearByProximity`

**Source:** PR #16 review (typescript L6).

**What:** `year-disambiguation.ts inferYearByProximity` uses a raw-millisecond future-day diff rather
than the UTC-midnight day math used elsewhere in the module. A date exactly 24–25h in the future during
a 1-hour DST transition could pick the wrong year via the `FUTURE_GRACE_DAYS` (1) check.

**Why deferred:** Extremely narrow (a ~1h window, twice a year, only for a date landing exactly on the
grace boundary), and it's a verbatim port — "fixing" it diverges from the phone source.

**Trigger:** If a real mis-inference is ever observed, align `inferYearByProximity` to the UTC-midnight
pattern (`daysBetweenAbs`) — in both the demo and the phone source.

---

## 15. Pre-existing silent-failure backlog (surfaced by the PR #16 review, outside its diff)

**Source:** PR #16 review (silent-failure, out-of-scope).

**What:** ~~Two~~ ~~One~~ **Zero** remaining latent silent-failure paths — both halves are now
RESOLVED (the second closed by P2.4). The entry stays for the residual noted under the first half:
- ~~`selectAdjustedScopes` (`engine/store/selectors.ts`) has an empty `catch` that lacks the dev-warn its
  sibling `generateExtractedScopes` emits — a parse failure is swallowed silently.~~
  **RESOLVED (P0 fix round 2, R-27; placement corrected by R-33 in the P1 rider):** the
  trigger fired when `5c319e4` touched `selectors.ts`. The breadcrumb is EVENT-scoped, not
  render-scoped: `generateExtractedScopes` (Calculate) and `applyImport` (post-offset import)
  each dev-warn once per event with the drop count, while the render-body selector stays
  deliberately silent (documented in its catch). Pinned by tests in
  `select-adjusted-scopes.test.ts` + `store-actions.test.ts`. This half is done — P2.4's G8
  scope shrinks accordingly.
  **Known residual (P1 review R-26, deliberate):** the THIRD creating boundary — editing or
  adding a requested-scope row after an offset exists — warns nowhere. Scope rows write
  through `updateField` once per keystroke (`listEditHandlers.change` rewrites the list per
  field change), so an "event" warn at that boundary degenerates into exactly the
  per-keystroke spam R-33 removed; a debounced/dedup'd variant is more machinery than the
  operator-only gap warrants (the visitor surface stays annotated via
  `adjustedScopesPartial` regardless). **Trigger:** P2.4 (G8) requested-scope
  normalization — when scope writes gain a real commit boundary (blur/row-level), emit the
  same dev-warn there and strike this residual.
- ~~`roundTo5Min` (`engine/logic/time.ts`) silently returns unparseable input unchanged, against
  `time.ts`'s own "fail loud" convention.~~
  **RESOLVED (P2.4, G8 remainder):** the trigger fired — P2.4 touched `time.ts`. `roundTo5Min`
  now THROWS `'Unable to parse date value'` on a non-empty unparseable string, the same message
  and rationale as its sibling `applyTimeOffset`. Empty input still passes through, now
  documented as the deliberate distinction: `''` is an unset scope bound (absence, explicitly
  representable), not a corrupt value. The throw lands inside the only caller's existing
  per-entry isolation in `generateExtractedScopes`, so a bad scope is counted, flagged via
  `extractedScopesPartial` and dev-warned — the established counted/flagged/dev-warned
  convention absorbs it with no new machinery. Pinned by `time.test.ts`
  (`describe('roundTo5Min')`).

**Status:** both halves resolved. The entry remains open ONLY for the R-26 residual recorded
above (the third creating boundary), which keeps its own trigger.

**Trigger (residual only):** as stated under the first half — when requested-scope writes gain a
real commit boundary (blur/row-level). P2.4 did NOT introduce one (it ported the Completion
gate, not scope normalization), so the residual carries forward unchanged.

---

## 16. `ImportedLocationView.locId: string | null` narrowing

**Source:** PR #17 review (type-design L4).

**What:** `locId` is typed `string | null`, but in the production path `addLocation` always returns an id,
so it's never null today; the null arm + the `if (locId)` guard in `onOpenLocation` are dead.

**Why deferred:** Kept deliberately — the reviewer endorsed retaining it for the documented future
"preview before persist" path (build a view before a location row exists). Narrowing to `string` now is
speculative churn that we'd revert when that path lands.

**Trigger:** If the "preview before persist" path is dropped from the roadmap, narrow `locId` to `string`
and remove the `if (locId)` guard.

---

## 17. `MONO_LABELS` string-coupling between ImportResultBody and the builder

**Source:** PR #17 review (simplifier L5).

**What:** `ImportResultBody` decides monospace rendering by matching row labels against a hardcoded
`MONO_LABELS` set — a brittle string-coupling to the exact label text the builder emits. A label rename
in `importResultData.ts` silently breaks the mono styling.

**Why deferred:** Cosmetic-only (monospace vs not); judgment call. The clean fix is to move an
`isMono?: boolean` onto `DetailRow` so the builder is the single source of truth — a small ripple
(type + builder + component) not worth bundling into the fix pass.

**Trigger:** Next time the section/row labels change, or `ImportResultBody` is otherwise touched — move
`isMono` onto `DetailRow` and drop `MONO_LABELS`.

---

## 18. Async import handlers carry no top-level `.catch()`

**Source:** PR #17 review (typescript L6).

**What:** `onFilesPicked` / `runPasteImport` in `DemoExperience.tsx` are async event handlers with no
top-level catch; an unexpected throw would surface as an unhandled rejection rather than the error result.

**Why deferred:** Latent only — the orchestrator calls (`requestExtraction` / `runPdfImport` / store `set`)
are fully guarded and can't throw today, so there's no live path to the rejection.

**Trigger:** When live-model usage widens or any awaited call in those handlers becomes capable of throwing
— wrap the body in try/catch and route failures to the `{ ok:false, error }` result.

---

## 19. Double-Escape closes both a ModalShell modal and a picker opened inside it

**Source:** PR #18 review (react, downgraded MEDIUM → LOW on orchestrator verification).

**What:** `ModalShell` and `PickerSheet` each register a `document` keydown→Escape listener. If a
ModalShell-based modal ever hosts a `DateTimeField`/`SelectField` (→ `PickerSheet`), one Escape would
close both (both listeners fire).

**Why deferred:** Not reachable today — `grep` confirms none of the ModalShell modals (`NewCase`/
`NewLocation`/`Import`) render a date/select field; the pickers live in the wizard screens, which aren't
inside `ModalShell`. Adding a guard now is speculative.

**Trigger:** If a ModalShell modal gains a date/select field, add `e.stopImmediatePropagation()` to the
picker's Escape handler so only the top-most dialog closes (ARIA APG §6.6).

---

## 20. z-index inversion if a PickerSheet and the WizardDrawer are open together

**Source:** PR #18 review (react LOW).

**What:** `WizardDrawer` backdrop is z41; a `PickerSheet` panel is z32. If both were open, the drawer
backdrop would obscure the picker.

**Why deferred:** Not reachable — the drawer hosts only navigation buttons, no form control that opens a
picker, so the two never co-occur.

**Trigger:** If the drawer ever gains a search/select field, re-base the drawer's z-index below the
picker's (or portal ordering) so an open picker stays on top.

---

## 21. PdfPreview has no Escape / backdrop dismiss (buttons only) — ✅ RESOLVED

**RESOLVED** (`parity/p1-pdfsave`, P1.6): Escape listener added (same document-level pattern as
ModalShell/WizardDrawer), the grey document surround now closes on click (the panel is full-screen,
so the surround is the closest analog to a scrim — clicks on the document iframe itself do not
close), and focus is handed back to the opener element on unmount. Covered by component tests in
`features/demo/ui/chrome/__tests__/PdfPreview.test.tsx` plus a store-driven integration test in
`DemoExperience.sandbox.test.tsx`.

**Source:** PR #18 review (silent-failure, informational).

**What:** `PdfPreview` dismisses only via its Close/Save buttons — no Escape key or backdrop-click close,
unlike the other overlays (ModalShell scrim/Escape, WizardDrawer backdrop/Escape, PickerSheet scrim/Escape).

**Why deferred:** Pre-existing UX inconsistency, not introduced by the portal sweep; the buttons work
correctly post-portal. Low value to change in isolation.

**Trigger:** Next time overlay dismissal is standardized (or PdfPreview is touched) — add an Escape
listener + a backdrop-click close for parity.

---

## 22. WizardDrawer per-screen completion status dots (phone parity) — ✅ RESOLVED

**RESOLVED** (`feat/demo-drawer-status-dots`): `selectDrawerStatus` selector added + `DrawerItem.status`
and the dot render restored + wired from `DemoExperience`. Mirrors the phone's `checkFields`/`checkArray`
with the `serialModelNumber` / `mediaPlayerIncluded` opt-outs. See `docs/planning/demo-drawer-status-dots`.

**Source:** PR #19 review (simplifier L5) — removed the dead code, tracking the feature.

**What:** the phone's nav drawer shows a status dot per screen (green = complete, amber = partial).
The demo's `WizardDrawer` had a `DrawerItem.status` field + render branches for this, but nothing ever
supplied it (`selectDrawerItems`/the call site never compute per-screen completion), so the branches
were dead. Removed in `2da3e3d` to keep the component honest.

**Why deferred:** it's a real future parity feature, not a quick fix — it needs a selector that derives
each wizard screen's completion (complete / partial / empty) from the current location's form state.

**Trigger:** when we wire drawer completion status — add a `selectDrawerStatus`-style selector, restore
`DrawerItem.status` + the dot render, and pass it from the `selectDrawerItems` map in DemoExperience.

---

## Accepted as-is (PR #19, not deferred — recorded for the fix-delta)

- **L1 — `ScreenStage.view: string`** (not the `ChapterId | LaunchableId` union). Kept per type-design:
  the stage is a domain-agnostic animation shell that uses `view` only as a React `key`; importing the
  domain union would couple it needlessly. (typescript lane preferred the union — landed LOW/disputed.)
- **L3 — `SlideDirection` `'none'`** overloads "unchanged" and "launchable fade". Kept: `'none'` reads
  accurately as "no directional slide"; renaming to `'fade'` would churn the variants + tests for a
  cosmetic gain. The `prev===next` arm is a cheap guard, not dead weight.

---

## 23. Drawer completion dots distinguish complete/partial by colour only (visual)

**Source:** PR #20 review (react M1) — partially addressed; visual half is a deliberate design choice.

**What:** the SR half of M1 is done (status is in the item button's `aria-label`; dots are
`aria-hidden`). The **visual** complete-vs-partial distinction is **colour only** (filled green vs
filled amber) — a non-colour distinction (a ring) was implemented and then reverted at the owner's
request (preferred the filled-dot look). So a colourblind *sighted* user can't distinguish the two
by sight (WCAG 1.4.1).

**Why deferred:** deliberate aesthetic choice on a non-production showcase; the SR path already
conveys status, so the practical impact is limited.

**Trigger:** if a strict-a11y bar applies or before any production use — reintroduce a non-colour
distinction that keeps the filled look (e.g. a small check glyph inside the complete dot, or a size
difference) rather than the ring.

---

## 24. GPS capture (incident coords, per-camera GPS, no-op Location button)

**Source:** field-parity work (`docs/planning/demo-field-parity`) — owner deferred GPS this pass.

**What:** the phone captures coordinates (incident location, per-camera GPS, recovery-location GPS).
The demo has no GPS: incident lat/long aren't collected, Cameras has no GPS, and New Location's
"Capture GPS coordinates" button is a no-op. The text address fields were added; coords were not.

**Why deferred:** explicit owner call — fields prioritised over the GPS feature this round.

**Trigger:** when GPS is scoped — owner chose **real browser geolocation** (`navigator.geolocation`)
as the approach; add a capture control to incident/location/camera and store lat/long (+ a manual
fallback). Mind the demo's no-real-device-API convention (it's a deliberate exception here).

---

## 25. Mapbox address autocomplete on the street fields — RESOLVED

**RESOLVED** (feat/demo-field-parity): AddressAutocomplete (Mapbox SearchSession, @mapbox/search-js-core) on the New Case incident / New Location / Submission street fields; a pick fills street + city. Public pk token via NEXT_PUBLIC_MAPBOX_TOKEN; degrades to plain input without it.

**Source:** field-parity work — owner will provide a Mapbox token.

**What:** the phone's incident/location street fields use Mapbox forward-geocode autocomplete. The
demo's `incidentStreetAddress` / `streetAddress` are plain text inputs for now.

**Why deferred:** waiting on the Mapbox token.

**Trigger:** when the token lands — wrap the street `Field`s with a Mapbox Search/autocomplete input
(token via env, server-proxied like the Ollama key), filling street + city (and coords once GPS lands).

---

## 26. Field-parity DIFFERS reconciliation + not-yet-built screens

**Source:** `docs/planning/field-parity/field-parity-gaps.md`.

**What:** remaining non-additive parity items — ~~Resolution/FPS/Export **option-set** divergence + a
custom/"Other" free-text path (DVR + Cameras + Export)~~; OCR confirm is read-only (phone allows manual
DVR-time correction); Notes is a flat string vs the phone's structured per-section storage;
required-field enforcement (demo enforces nothing). Plus the **not-yet-built screens**: User Profile
(settings UI), Media/Audio Capture (placeholders), Duplicate Location, Edit Incident Location.

**Resolved 2026-07-30 (parity P0.3, branch `parity/p0-options`):** the option-set divergence and the
custom/"Other" free-text path are done — one canonical source (`engine/content/form-options.ts`,
lifted verbatim from phone `src/constants/FormOptions.ts:16-93`), screens + `FORM_OPTIONS` both
consume it, custom free-text on Resolution/FPS (DVR + Cameras) with the phone's exact semantics.
Note: this entry's "(+ Export)" was **wrong** — the phone's Export Info selects have NO free-text
path ("Other" is a stored literal; verified `app/(form)/export-information.tsx:52-103`, ui-mapping
08:33-37). The demo now matches the phone: no Export free-text input. The other items above
(OCR confirm, Notes structure, required fields — P2.x) and the missing screens remain deferred.

**Why deferred:** option/behaviour reconciliation is lower-value than the missing fields; the screens
are larger features the owner hasn't reached.

**Trigger:** revisit per the gaps doc once the field additions land and the settings/media UIs are built.

---

## 27. "Exactly one active manifest row" rests on a disjointness test, not the type or a runtime guard

**Source:** PR #27 review (M1, type-design) + fixes-delta.

**What:** `selectExploreStatus` guarantees at most one active manifest row only because
`EXPLORE_ITEMS[].covers` are pairwise disjoint. That disjointness is checked solely by
`explore.test.ts` (`new Set(all).size === all.length` over the flattened covers), not by the
type (`covers: (AppView | ModalId)[]` permits overlap) nor a runtime guard. This PR tripled the
modal-covered surface (`newCase` / `newLocation` / `import`), so a copy-paste typo like
`{ id: 'newLocation', covers: ['newCase'] }` type-checks cleanly and only fails at `pnpm test` —
two rows would then both render active and render `activeDetail` twice.

**Why deferred:** The existing test is the codebase's accepted enforcement (the M1/L3
test-over-type precedent). A dev-time runtime assertion is redundant with it, and a type-level
fix (branded disjoint union) is disproportionate churn for a static, single-author literal. Not a
bug — covers are disjoint today, test-verified.

**Trigger:** If `covers` construction moves off the single static literal in `explore.ts` — the
registry becomes generated, multi-author, or assembled at runtime — add the one-line dev-only
overlap assertion at module load (`if (new Set(all).size !== all.length) throw`), or brand the type.

---

## 28. Rail narration renders only when some manifest row is active (empty-active coupling)

**Source:** PR #27 review (L1, silent-failure) + fixes-delta.

**What:** `ExploreChecklist` renders the per-screen narration via `{it.active ? activeDetail : null}`
inside the row map, so the copy appears only if some row is active. `selectExploreStatus`'s anchor
falls through to `state.currentChapter` with no "is this covered by a registry row?" check. If an
anchor is ever uncovered, no row is active and the rail narration renders nowhere — with no console
signal.

**Why deferred:** Latent/unreachable today. The only uncovered `ChapterId` is `splash`, excluded
from `EXPLORE_ITEMS` by design and with no navigable entry (no `setView('splash')` caller, no
back-wiring on dashboard/cases; guarded by `explore.test.ts`). No live path reaches an empty active
set, so a fallback now is speculative.

**Trigger:** If `splash` navigation is reintroduced, or any new `ChapterId`/view becomes reachable
without a covering `EXPLORE_ITEMS` row — either add a covering row, or lift `activeDetail` to the
list level with a documented `?? NARRATION[currentChapter]` fallback so the rail copy can't vanish.

---

## 29. P0.2/P0.4 (parity/p0-store) — deliberate non-changes

**Source:** demo↔phone parity plan P0.2 (truthful statuses) + P0.4 (sessionStorage persistence, D2).

**What was deliberately NOT done, and why:**

- **Map tab's viewer case is not persisted.** `mapViewerCaseId`/`mapPickerOpen` are
  DemoExperience-local UI state, not store state. A refresh on the Map tab restores
  `view: 'map'` but re-shows the mandatory case picker — a coherent, honest empty state,
  and cheaper than promoting tab-local state into the store. Promote it only if the owner
  flags the picker reappearing as friction.
- **Open modal + drawer are not persisted.** A rehydrated modal would reopen with blank
  local fields (`caseForm`/`locForm`/`imp` live in component state) — worse than closed.
  Documented on `PersistedState` in `engine/store/create-store.ts`.
- **The `uiSeq` reseed has no behavioral UI test.** Module state survives remounts inside a
  test file — it only resets on a REAL page load — so the collision the reseed prevents
  cannot be reproduced under vitest. The store-side equivalent (`seq` reseed via
  `maxIdSeq`) is pinned in `engine/store/__tests__/persistence.test.ts`; `maxIdSeq` itself
  in `helpers.test.ts`. Playwright E2E (a real reload) is the natural home for a true
  refresh-loop test when E2E lands.
- **Pending debounce writes are flushed on `pagehide`, not written synchronously per
  change.** Per-change writes would serialize the whole state on every keystroke;
  `pagehide` covers refresh/close, and `dispose` covers SPA unmount. A hard crash inside
  the 250ms window can lose that window's keystrokes — accepted for a demo.

**Trigger:** owner feedback on the Map-picker refresh UX; Playwright E2E introduction
(add the real-reload round-trip + duplicate-key regression test there).

**Addendum (fix round 2, R-19):** the type-design reshape of the completion action —
`completeLocation(locationId)` deriving + greening the owning case inside the store, making the
correlated selection pair unrepresentable in the signature — is endorsed by the fix-delta
review as the better long-term shape but deliberately not taken in-round: an in-place
`completeCase(caseId → locationId)` swap keeps the same `string` parameter type, so stale
caseId call sites would still compile while silently changing meaning; the safe form is a
rename, which touches the plan-ratified G4 action name. **Trigger:** the next time
`completeCase` grows a caller or the completion flow is reworked (P2+), do the rename then.
## 30. Select placeholder copy diverges from the phone

**Source:** parity P0.3 (option-set consolidation, branch `parity/p0-options`), 2026-07-30.

**What:** the demo's `SelectField` hardcodes the placeholder `Select…` for every dropdown; the
phone's `Picker` defaults to `Select an option` and the Export Info screen overrides per field
(`Select export media type` / `Select file type` / `Select delivery method`,
`app/(form)/export-information.tsx:58,69,100`). Copy-only divergence — the option lists themselves
are now canonical and phone-exact.

**Why deferred:** P0.3's scope was the enum drift + custom path; the placeholder is lifted
prototype copy ("do not restyle the lifted rules"), and changing the global default touches every
dropdown at once. Worth doing deliberately, not as a rider.

**Trigger:** any pixel/copy-parity pass over the wizard screens (P2 wizard depth, or the
side-by-side verification lane flagging it) — add a `placeholder` pass-through on `SelectField`
and set the phone's per-field strings.

## 31. P0.5 (parity/p0-tokens) — glass-token extraction: deliberate residuals

**Source:** parity P0.5 (glass-token extraction, branch `parity/p0-tokens`), 2026-07-30.

**What:** the G6 dedupe moved the repeated gradient/border clusters into
`features/demo/ui/glass-tokens.ts` (guard test pins the values and bans re-inlining), but a few
call sites deliberately keep raw literals:

- `SyncStatusCard.tsx` — ``border: `1px solid ${ok ? 'rgba(16,209,119,0.3)' : '#2a4a6f'}` ``
  keeps the bare `#2a4a6f` colour inside a template conditional; swapping it for a token means
  restructuring the expression (two full-shorthand branches), which P0.5's "value substitution
  only" rule forbids.
- `CaseMapPicker.tsx:131` — `borderColor: selected ? accent : '#1e3a5f'` keeps the bare colour for
  the same reason (the shorthand token can't slot into a `borderColor` value).
- `1px solid rgba(43,140,193,0.25)` (ImportModal picker card + ExtractedScope info banner, 2×) and
  every one-off gradient (WizardHeader/TabBar bars, PhoneFrame titanium + scan sweep, Splash HUD,
  map canvas, OCR scrim, drawer fades, ImportResultBody 0.6/0.7 card, Completion 0.9/0.96 summary
  panel) stay literal — a token used once or twice is noise, not dedupe.

**Why deferred:** P0.5 is a mechanical, pixel-identical dedupe; these need either a structural
rewrite of conditional styles or a judgment call about near-miss gradient variants (0.88/0.95 vs
0.9/0.96 etc.), which is restyling territory.

**Trigger:** any actual demo restyle (the tokens' whole purpose) — normalize the near-miss
variants into the token set then, with a side-by-side check; or a review pass that decides the
two bare-colour conditionals deserve dedicated colour tokens.

**✅ PARTIALLY RESOLVED — PR #39 (W0 / U0.1, aggregator r1):** the two bare-colour conditionals are
gone — `SyncStatusCard.tsx:49` now reads `colors.borderLight`, `CaseMapPicker.tsx:133` reads
`colors.border`. The near-miss-gradient bullet is NOT resolved: its normalisation is exactly the
port's **U1.1** (`GLASS_TIER`) / **U1.2** (card recipe) rows, so the trigger above is re-pointed
there — un-defer at U1.1's closing act; a U1 review that finds a near-miss variant surviving files
it against that package.

---

## 32. First client-shipped zod — the persistence shape guard's bundle trade (R-9)

**Source:** P0 phase review R-9 (web + type-design, documentation-only).

**What:** `engine/store/persistence.ts` is the first demo/client code to ship zod (~13 kB gz,
eager on demo mount — `loadSnapshot` runs synchronously at store creation, so it cannot be
lazy). Measured impact: `/demo` First Load JS unchanged at 107 kB (the review's own gate).

**Why accepted:** the schema doubles as the compile-time drift guard (R-4): every shape is
`z.ZodType<DomainType>`-annotated + `FullShape`-checked against the domain types, and the
closed unions are the domain's own `as const` tuples — hand-rolling the runtime predicate
would forfeit exactly the guarantees R-4 was raised about. Type-design lane endorsed the
direction as correct boundary hygiene.

**If it ever needs to go:** the replacement is a hand-rolled structural predicate over
`PersistedState` (the snapshot is trusted-origin, same-tab data) — NOT a lazy zod import
(boot-blocking) and NOT dropping the guard.

**Trigger to revisit:** bundle budget pressure on `/demo`, or zod usage spreading beyond the
two existing sites (beta form, snapshot guard) without a deliberate decision.

---

## 33. P1.2 (parity/p1-picker) — import picker/paste parity: deliberate adaptations & residuals

**Source:** parity P1.2 (picker + paste stage upgrade, branch `parity/p1-picker`), 2026-07-30.
Matrix rows 71/72; phone spec `phone-inventory.md` §5.2/§5.3, phone
`src/features/import/json-import/components/ImportPickerModal.tsx`.

**What (deliberate, don't re-flag):**

- **Paste-stage error banner omitted.** The phone renders its shared error banner on the paste
  step for the submit-throw backstop (`Failed to start text import…`, ImportPickerModal.tsx:695-702).
  The demo's paste-submit failures already surface on the *result* stage's failure card — P1.5
  owns that error surface (row 79); adding a second, picker-local error path for an unreachable
  backstop would duplicate it.
- **No `field-sizing: content` grow (240→320).** The phone's multiline input grows with content
  from minHeight 240 to the 320 cap, then scrolls internally. csstype 3.1.3 (via @types/react 19)
  doesn't type `fieldSizing`, so the demo textarea is a bounded 240px box with the same 320 cap
  and internal scroll — the load-bearing contract (submit never pushed off-screen) holds; the
  growth animation is cosmetic. Revisit when csstype learns the property.
- **Paste-submit loading state not surfaced.** The phone's `isSubmittingText` spinner covers the
  async window before the flow modal takes over; the demo flips to the progress stage
  synchronously on run, so there is no visible window. Disabled-on-blank is the meaningful parity
  and is implemented + pinned.
- **Phone `accessibilityLabel`s not mirrored as `aria-label`s** on the cards/submit. On the web an
  aria-label *overrides* the visible text as the accessible name; the phone's labels ("Select JSON
  file from device" — itself stale on the phone) don't start with the visible text, which is the
  WCAG label-in-name anti-pattern. The cards' visible copy is the accessible name; the textarea
  (no visible label) keeps the phone's "Pasted request text".
- **Mixed-selection error collapsed into unsupported-type.** With PDF the only valid file type
  (D5: no JSON import), the phone's "Please select only one file type (all JSON or all PDF)."
  branch has no demo meaning; any selection containing a non-PDF gets the D5-adapted
  "Unsupported file type. Please select PDF files." A JSON-only revisit would restore the split.
- **No-PDF-handler branch not ported** ("PDF import not available. Please select a JSON file.",
  :268/:295) — the demo's PDF handler is unconditionally wired; the branch is unreachable.

**Trigger:** P1.4/P1.5 (progress/result restructure) for the error-surface item; a D5 reversal
(JSON import lands) for the mixed-selection and clipboard-JSON semantics; csstype support for the
field-sizing item.
## 34. One-click PDF download (html2pdf.js) — spiked, NOT shipped (P1.6/D4 spike verdict)

**Source:** P1.6 (`parity/p1-pdfsave`) — the D4-mandated bounded spike on an html2canvas + jsPDF
one-click `.pdf` download alongside the shipped `window.print()` save path.

**What was evaluated:** html2pdf.js 0.14.0 (`pagebreak: { mode: ['css', 'legacy'] }`, scale-2
html2canvas, letter/0.75in jsPDF) against headless-Chromium native print-to-PDF (`page.pdf` —
byte-for-byte what the shipped Save-as-PDF path produces) on rich multi-page fixtures of BOTH
court documents (all sections: scope tables, adjusted-scope callout + partial warning, DST
advisory box, OCR tech-specs, NTP calibration + accuracy table + traceability chain).

**Result — layout survived, the artifact degraded.** Pagination, headers, tables, and the DST
advisory box all rendered faithfully (no sliced lines with the css+legacy pagebreak mode). But
the produced PDF is a stack of JPEG page images:

| Metric | Native print (shipped) | html2pdf.js |
|---|---|---|
| Case Notes size | 195 KB | 1,725 KB (8.8x) |
| Time Offset size | 146 KB | 815 KB (5.6x) |
| Extractable text, Case Notes (pdfjs) | 5,076 chars | **0** |
| Extractable text, Time Offset (pdfjs) | 2,043 chars | **0** |
| Text | vector (searchable/selectable/AT-accessible) | ~192 dpi effective raster |
| Click cost | none | ~946 KB bundle (dynamic import) + rasterization |

**Why not shipped:** a court document with zero text layer — unsearchable, unselectable,
screen-reader-inaccessible, soft in print — is a materially degraded artifact, and it would
misrepresent the phone app's real (vector, expo-print) export quality, contra the demo's
honesty rule. D4's own criterion ("if it degrades the document, DON'T ship it") controls.
No pdfmake either, per D4 — it would fork the document source of truth from the phone's HTML
templates. Print-dialog Save-as-PDF remains the only save path.

**Method (reproducible):** tsc-compile `engine/logic/pdf/*` to CJS, build maxed-out fixture
data for both generators, render in headless Chromium (Playwright): `page.pdf()` for the
native baseline vs `html2pdf().outputPdf('arraybuffer')` in-page; compare visually + via
pdfjs `getTextContent` char counts + file sizes.

**Trigger to revisit:** (a) real visitor/owner feedback that the print dialog loses users
(one-click demand), AND (b) a client-side renderer that emits a REAL text layer from the same
generator HTML (not rasterized pages) — re-run the method above and re-compare. Also revisit
if the browsers ship a programmatic dialog-less print-to-PDF API.

## 35. P1.5 (parity/p1-flowmodes) — dwell + failure-card enrichment: deliberate non-ports

**Context:** P1.5 ported the phone's `computeImportFlowMode` dwell (matrix row 73) and the
failure-card enrichment (row 79). Two phone behaviors were deliberately NOT ported, and one
demo behavior was deliberately changed — none are gaps to re-flag:

1. **No dry-run / validation-only view.** The phone's `ErrorOrDryRunContent` renders a
   "Validation Successful / Dry run completed successfully" card for JSON-import dry runs.
   The demo has no JSON import (owner decision D5) and no validate-only mode, so there is
   nothing to dry-run. Noted in-source at the ImportModal failure branch. Trigger to
   revisit: a JSON-import or validate-only path ever lands in the demo.

2. **ERROR_MESSAGES deliberately does NOT cover PDF_SCANNED / NO_FIELDS_FOUND.** Their
   pipeline messages are already the user-facing copy; the phone's own precedent
   (§5.7.8: PDF codes stay out of its map so "the pipeline's own honest string always
   renders"). Tests pin the absences so a future "helpful" mapping is a deliberate act.

3. **Single-run failures no longer render the per-file FailuresCard.** Pre-P1.5 a lone
   failed run showed the aggregate "1 import failed." plus a one-row file card; it now
   surfaces the run's own error directly with code/details/partialData enrichment
   (phone single-failure anatomy). Multi-file all-failed runs keep aggregate + rows.

4. **(p1-review R-30 addendum)** `ImportPartialData` carries only `caseNumber` — the
   phone's second key, `businessName`, is structurally unreachable in the demo: the
   sole `partialData` producer sits inside run-import's `fieldCount === 0` gate and
   `fieldCount` counts `businessName`, so it is provably empty on that path. The field
   and its `Business:` render row were dropped rather than shipped dead; re-add both
   only if a producer outside that gate ever surfaces a business name on failure.

## 36. ImportState stays a flat record — runtime-enforced coherence, accepted (p1-review R-33)

**Context:** P1.5 added `acknowledged` (and the R-11 fix added `lastRealStage`) to the
bridge's flat `ImportState`. `acknowledged` is only meaningful while
`stage === 'progress' && result !== null`; a shape like `{ stage: 'result', result: null }`
type-checks but renders a blank modal body. The review lane traced every `setImp` writer
and confirmed **no invalid state is reachable today** — coherence is enforced by
discipline across the run/cancel/retry call sites plus the pure `computeImportStage`
derivation, not by the type.

**Writer inventory update (fix-delta R-39):** the round-2 backstop rework made
`guardImportRun`'s catch report through `finishImport`, and `finishImport` now pins
`stage: 'progress'` in its own updater — so EVERY result write (normal completion and
backstop alike) lands in a pairing `computeImportStage` renders, restoring the "every
setImp writer traced" claim this acceptance rests on.

**Accepted (for now), not fixed:** remodelling the run half as a discriminated union
(`picker/paste` | progress payload | result payload — the `RetentionView` house shape)
would ripple through every `setImp` spread in the bridge mid-fix-round for a defect that
is currently unreachable. Runtime enforcement is the same trade §27 records for the
manifest's "exactly one active row" invariant.

**Trigger to revisit:** the next field whose validity depends on `stage`/`result`
pairings (a third correlated field is the tell), or any bug traced to an incoherent
`ImportState` pairing — model the union then, in a dedicated change.

## 37. P1 residual-minor rider (R-45/R-46/R-49/R-50/R-51) — deliberate residuals

**Context:** the five P1.4-owned minors from `docs/code-reviews/parity/p1/p1-r2-review-fixdelta.md`
were all FIXED on `parity/p2-rider-import` (nothing from that set is deferred). Three
choices inside those fixes are deliberate and should not be re-flagged:

1. **R-46 took option (b), not option (a).** The review offered carrying `totalFiles` on
   the `ImportResult` arms (structural) or padding the tally (catch-local). Padding was
   taken because it closes BOTH halves of the finding — the shrunken denominator *and*
   the row that could not name the file that threw — where (a) closes only the first and
   would leave the printed total disagreeing with the number of failure rows beside it.
   `deriveTerminalOutcome` keeps summing `locations.length + failures.length`; the
   premise it now rests on (every writer accounts for every file) is stated in its
   docstring and in `ImportTally.unaccounted`. **Trigger to revisit:** a second partial
   reporter that cannot enumerate its own files — carry the total then, for all writers
   at once.

2. **`filename: 'import'` survives on the paste path** (the type-design lane's folded
   `filename: string | null` secondary). The PDF backstop now names real files, but the
   paste path has no filename to name, so its synthetic row keeps the sentinel.
   Modelling "not a file" as `null` would ripple through `ImportFailure`, `FailuresCard`,
   and the phone-parity row copy for one sentinel on one path. **Trigger to revisit:** a
   second non-file import source (a URL/QR path would be the tell).

3. **The unattempted rows reuse `UNEXPECTED_ERROR`.** "Not attempted — the import stopped
   after an unexpected failure." is not really an *error* code, but the code union is
   closed and `UNEXPECTED_ERROR` is the bridge-only member that is deliberately unmapped
   in `ERROR_MESSAGES` — so each row's own honest string renders verbatim, which is the
   behaviour wanted. Adding a `NOT_ATTEMPTED` member would ripple into the map, the
   phone-parity §5.7.8 precedent, and every exhaustiveness site for a code no consumer
   branches on. **Trigger to revisit:** any consumer that needs to branch on "skipped"
   vs "failed" (a retry-only-the-skipped affordance would be the tell).

**Recorded, not filed (verified during this rider):** the p1-r2 doc's R-49 note assumed
the R-43 text-path test covered the `?? 'extracting_text'` default — it does not.
`runTextImportFlow` seeds the stage mirror to `'reading_model'` before calling
`runImport`, so that test pins the SEED write (now asserted); the null-ref default is
covered by the new pre-seed R-45 test. Same doc's suggested R-45 shortcut ("reject
`runText` immediately after a completed PDF run") cannot reach the defect for the same
reason — the seed overwrites the stale ref before the rejection lands. A pre-seed throw
is the only reachable window, and the emitter's `INIT` log is the only throwable in it.
---

## 38. Four hand-rolled address joins — RESOLVED (`formatAddress` is the single producer)

**Source:** P2.4 (parity/p2-gate), self-logged while porting `finalSubmissionSchema`.

**What:** the demo builds a location's display address by joining
`businessName`/`streetAddress`/`city` in four places, from three slightly different
expressions:

| Site | Expression |
|---|---|
| `engine/store/selectors.ts:223` (`selectCaseNotesData`) | `filter(Boolean).join(', ')` |
| `engine/store/create-store.ts:377` (`generateNotes`) | `filter(Boolean).join(', ')` |
| `ui/DemoExperience.tsx` (Completion summary + time-offset doc) | `filter(Boolean).join(', ')`, with a `\|\| locationName` fallback on the summary only |
| `engine/logic/final-submission.ts` (`toFinalSubmissionInput`, new) | `.map(trim).filter(Boolean).join(', ')` — **trims**, and deliberately has no name fallback |

The gate's version trims because the phone's `address` is only ever written by
`formatAddress` (`src/lib/utils/address-formatting.ts:102-119`), which trims each component
and drops the blanks — without it a three-space address clears a gate the phone blocks. So
the gate is correct and the other three are merely untrimmed, which is invisible today
(nothing writes whitespace-only components) but is a second definition of "the address".

**Why deferred (historical):** P2.3 (submission depth, matrix row 29) was concurrently
porting `formatAddress` — including the street-type abbreviation the demo had no equivalent
of. Introducing a fifth, competing helper while that landed would have been the exact drift
this entry is about.

**RESOLVED — trigger fired and fully discharged in P2.** P2.3 landed
`engine/logic/address-format.ts`; `selectCaseNotesData`, the notes address formatter and both
bridge joins converted with it, and P2.4's `toFinalSubmissionInput` converted in the P2 fix
round (review **R-11**, which caught that this entry shipped stale-on-arrival — four of four
sites now call `formatAddress`, and the ledger says so).

The conversion was behaviourally inert for the gate by construction: `formatAddress` trims
each component and drops the blanks, the same emptiness semantics the private join had, so a
whitespace-only address still fails `min(1)`. It is not cosmetic, though — the gate now
validates the *same string* the PDF header, notes body and Cases row display, street-type
abbreviation included. Pinned by
`engine/logic/__tests__/final-submission.test.ts` ("composes the address through the shared
formatAddress"), which fails if the private join ever returns.

Both deliberate call-site differences survive the conversion and stay explicit in the source:
the gate must NOT take the `locationName` fallback (a location with no address must not pass),
and the Completion summary card must keep it (display, not validation).

---

## 39. P2.5 (parity/p2-advisories) — Time-Offset advisories: deliberate non-ports & residuals

**Source:** P2.5 implementation (matrix row 34 residual — the phone's four DST advisory
branches plus its Toast/Alert guards).

### 39.1 The recalculate confirmation is a screen-local dialog, not the shared primitive — **RESOLVED**

**What (original):** the phone's `Recalculate Time Offset?` Alert was ported as
`RecalculateDialog`, declared inside `features/demo/ui/screens/TimeOffsetScreen.tsx` and
rendered as an absolute overlay within the phone screen.

**Why it was deferred:** the demo had **no shared blocking-dialog primitive** (matrix row 28:
"only the auto-dismissing `DemoNotification`"), and building one was scheduled work owned by
other packages — plan §5 flags it as "wanted by P3.1/P4.5/P5.3". Inventing the shared
primitive from an S-sized advisory package would have pre-empted that design and created a
merge hotspot mid-wave.

**RESOLVED (P2.6 branch, `parity/p2-scope-passthrough`).** P2.4 landed
`features/demo/ui/controls/AlertDialog.tsx` — RN `Alert.alert`-shaped, presentational,
portalling into the phone screen. The recalculate confirm now renders through it and
`RecalculateDialog` is **deleted**; the trigger above fired exactly as written. Copy is
unchanged and still verbatim. Two behaviours changed, both inherited deliberately from the
primitive and pinned by tests: the scrim no longer dismisses (a native alert is answered by
choosing a button), and focus lands on the dialog container rather than the Cancel button
(so a screen reader hears title AND body), returning to the opener on unmount. The screen
keeps only its own `confirmRecalc` state — the bridge's `alert` state is Completion-scoped
(cleared on `view !== 'completion'`) and was deliberately not widened.

### 39.2 Three of the phone's five Time-Offset toasts are deliberately NOT ported

The package brief asked for the toast/alert guards "where they map to the demo's flow", and
to refute rather than ship dead UX. Evidence per toast:

- **`Missing Information` / "Please enter both DVR and actual times"** (`time-offset.tsx:362-367`)
  — unreachable in the demo: `Calculate` is `disabled` whenever either field is empty
  (`TimeOffsetScreen.tsx` `canCalc`, pinned by `marquee.test.tsx` "disables Calculate until both
  datetimes are present"). The demo prevents the state the phone warns about.
- **`Using Calibrated Time` / `Using Device Time`** (`time-offset.tsx:242-254`) — the demo's
  sync is `simulateNtpSync()` (`engine/logic/time-sync.ts:17-34`), which has **no failure
  path**, so the "NTP unavailable — verify device clock accuracy" branch can never fire; the
  success branch would only restate what `SyncStatusCard` already renders in place. These are
  outcome notifications, not guards.
- **`Calculation Complete`** (`time-offset.tsx:333-340`) — the demo renders the same sentence
  as the 34px result card the moment the calculation commits.

**Trigger to revisit:** if the demo ever gains a simulated sync-failure mode (making the
uncalibrated branch reachable) or a general in-phone toast surface for the wizard, port the
matching copy verbatim then.

### 39.3 `calculateOffset` has no error path — the phone's `Calculation Error` toast is unreachable

**What:** the phone wraps `performCalculation` in try/catch and shows a `Calculation Error`
toast (`time-offset.tsx:341-353`). The demo's `calculateOffset` action does not catch, so a
throw from `calculateTimeDifference` ("Unable to parse date values",
`engine/logic/time.ts:35`) would escape the click handler into `DemoErrorBoundary`.

**Why deferred:** every writer of `capture.dvrDateTime` / `capture.actualDateTime` produces a
canonical `'YYYY-MM-DD HH:MM:SS'` string — the `DateTimeField` pickers (via `formatStored`),
`getCurrentFormattedTime` on the sync path, the OCR parser, and the zod-guarded snapshot.
There is no reachable input that throws, so a friendly error surface here would be UX for a
state the demo cannot enter. (This is unlike `generateExtractedScopes`, which legitimately
catches per entry because free-text import CAN write non-canonical scope times.)

**Trigger to revisit:** any path that writes a non-canonical capture time — an import that
populates `capture.*`, or free-text entry replacing the pickers. Add the catch + copy then.

### 39.4 Phone-repo follow-up: `getDSTTransitionDates` misses month-boundary transitions

**Not a demo deferral — a phone bug for the §8 follow-up ledger.** The phone's scan is
`for (day = 1; day < daysInMonth; day++)` comparing `day` with `day + 1`
(`src/lib/utils/bidirectional-time.ts:330-344`), so it never compares the last day of a month
with the first of the next. A DST transition landing on the 1st is invisible and the advisory
degrades to the literal word `spring`/`fall`. Reachable in North America whenever the November
fall-back Sunday is the 1st — e.g. **2026-11-01**. The demo's port brackets on month starts and
binary-searches inside, so it resolves the boundary case (pinned in
`engine/logic/__tests__/dst-advisory.test.ts`). File as a `BUG-NNN` when the owner returns.

### 39.5 D10 — DVR-time extracted scopes diverge from the phone ON PURPOSE (owner ruling)

**Reviewers: do not re-flag as a parity gap.** `generateExtractedScopes` now passes DVR-time
requests (`isActualTime === false`) through untouched — no offset, no rounding — per the
owner's D10 ruling. The phone agrees on the offset half and **differs on the rounding half**:
`src/lib/utils/extracted-scope-generator.ts` `getEffectiveStartDateTime` /
`getEffectiveEndDateTime` already return the ORIGINAL `startDateTime` / `endDateTime` for a
DVR-time scope (skipping corrected/DST times), but the caller still runs every row through
`roundDown5Minutes` / `roundUp5Minutes`.

**Rationale (owner, recorded in the code comment at the branch):** a DVR-time requester stood
at the device, read its clock, and asked for exactly those times — widening that window to
5-minute marks invents scope nobody asked for. The outward padding exists for REAL-time
requests, where a real-world window is mapped onto the DVR timeline and deliberately given
slack so the export cannot clip the moment of interest.

**Trigger to revisit:** the phone adopting the same passthrough (then this is parity, not a
divergence) — or the owner reversing D10. The phone-side rounding of DVR-time scopes is a
candidate for the phone-repo follow-up ledger alongside §39.4.
---

## 40. P2.2 (parity/p2-ocr) — OCR confirm depth: deliberate divergences & residuals

Recorded by the P2.2 package (matrix rows 38/39 + the `TODO(M2)` at `engine/logic/ocr.ts:135`).
Everything below is a *considered* choice or a *found-not-fixed* item, not drift.

### 37a. One `date-disambiguation` module serves both the import and OCR paths (DIVERGENCE — accepted)

The phone keeps **two** copies of the resolver under an explicit autonomy contract: the OCR
copy (`src/features/ocr-time-capture/utils/date-disambiguation.ts`) is proximity-only, and the
import copy (`src/features/import/pdf-import/normalization/date-disambiguation.ts`, lines 7-44)
adds two domain rules — no-future and a recency window. The demo ported the **import** copy, and
`readDvrTimestamp` now consumes it on the OCR path too.

**Why that's acceptable here:** for a live DVR clock, a month/day swap that lands in the future
is not a reading an operator should accept silently, and a years-stale reading is exactly the
case where "closer to today" carries no signal. Both extra rules resolve to `confidence: 'low'`,
i.e. the operator gets warned rather than quietly overridden — strictly the safer failure.

**Consequence to know:** the demo's OCR path can return `year_outside_proximity_window` /
`both_interpretations_future`, reason codes the phone's OCR path cannot. Anyone comparing reason
codes side-by-side with the phone will see the difference; the *choice* still matches for every
case where the phone's copy has an opinion.

**Trigger to revisit:** if the demo ever needs to reproduce a phone OCR reason code exactly (a
support/repro scenario), split the module the way the phone does — and copy the phone's autonomy
comment with it.

### 37b. The assumed-date gate is AHEAD of the phone, deliberately

The phone's parser stamps `new Date()` over a dateless frame
(`timestamp-parser.ts:260-266`) and its `ConfirmationScreen` pre-fills the picker with the
result — so a guessed date can be committed without anyone being told it was guessed. The
`TODO(M2)` this package closes called that a BLOCK, and the demo now refuses it: the assumed
date is labelled, and the commit is held until the operator confirms or corrects it.

This is a place where the demo is **better than the phone**, not a copy-parity miss. It is worth
raising as a phone-side follow-up (plan §8 territory — file separately; the phone repo is
read-only to this effort).

### 37c. The ambiguous sample frame's warning depends on the visitor's clock

`OCR_SAMPLE_FRAMES.ambiguous` is `06/07/2024 23:45:30`. It renders
`DateDisambiguationWarning` because 2024 falls outside the resolver's proximity window
(`year < currentYear - 1`) — true for every visitor from 2026 onward, and *more* true as time
passes. A visitor whose device clock is set to 2025 or earlier would get a high-confidence
resolution and see no warning (the resolution itself is still correct and still applied).

Not worth engineering around: the engine tests inject a fixed clock, so the *behaviour* is
pinned deterministically in both directions; only the live sample's flavour depends on the
visitor's clock.

### 37d. `capture.ocr` is populated but the Time-Offset PDF still ignores it

`confirmOcr` now writes a real `OcrProof` (`rawText` / `cleanedText` / `parsedDateTime` /
`confidence`), which `calculateOffset` threads into `timeOffset.ocr`. The PDF generator already
has a full OCR tech-specs block (`engine/logic/pdf/time-offset.ts:119-133`) gated on
`ocrRawText`, but `previewTimeOffset` in `DemoExperience` never maps those three fields into
`generateTimeOffsetDoc`, so the block stays dead. The fix is three lines
(`ocrRawText`/`ocrCleanedText`/`ocrParsedDateTime` from `off.ocr`).

**Why deferred:** matrix row 37 already owns the OCR→PDF evidence path for **P4** (the image
half of that block needs the real camera anyway). Doing the text half here would have put a
P2 package into a P4 surface for a partial win.

### 37e. The confirm stage has no direct Cancel

The phone's confirmation is wrapped in a `FormLayout` whose back button cancels the flow; the
demo's confirm stage offers only `Retake` and `Use this & calculate`. Exiting from confirm is
therefore two taps (Retake → Cancel), not one. Left alone because the button row is lifted,
reviewed chrome and the exit is reachable — but it is a real one-tap parity gap on row 38's
surface.

### 37f. The OCR rail narration still overclaims (pre-existing, row 37 / P4)

`engine/content/narration.ts` tells the visitor "This runs real in-browser OCR" and lists "Live
webcam capture" as a bullet. Neither is true today — there is no recogniser and no camera; the
*cleaning and parsing* pipeline is real, running over a hardcoded frame (matrix row 37, STUB).
The screen itself is honest ("No camera available here"); only the narration overclaims.

This package updated the two narration lines its own change made stale (confirm → correct, and
the new sample frames) and deliberately left the recognition/camera claims for **P4**, which
owns row 37 and will rewrite that copy when a real capture surface lands. Flagged here so the
honesty gap is not mistaken for an oversight.
## 41. P2.3 (parity/p2-submission) — GPS capability: refutations & deliberate residuals

**Source:** P2.3 Submission depth (matrix row 29) — the shared geolocation capability,
`formatAddress` port, and the Submission location section.

### 37a. The phone has NO >2σ GPS outlier filter — the parity brief and §M13 are wrong

The package brief and `docs/planning/demo-phone-parity/phone-inventory.md:5604` (§M13) both
specify "multi-sample + >2σ outlier filter" for `GpsCaptureControl`. **The phone does not do
this.** `src/features/location/services/gps-service.ts` samples up to `maxAttempts` times,
exits early once a reading meets `targetAccuracy`, and returns **the single most accurate
sample** (`:276-282`) — it never computes a mean or a standard deviation. A repo-wide grep for
`outlier|stdDev|standardDeviation|sigma|variance` finds outlier filtering only in
`precision-time-sync/utils/offset-calculator.ts` (RTT-based, a different feature).

The ">2σ from mean" claim traces to two phone DOC files that describe an algorithm the code
never implemented: `src/features/README.md:768` and `src/features/DOCUMENTATION-PLAN.md:2520`.
The phone's own accurate description is `src/features/location/README.md:276` ("returns the most
accurate sample").

**Decision:** the demo implements the phone's REAL behaviour (`engine/logic/gps.ts`
`selectBestSample` + `toGpsFix`). Shipping a 2σ filter would make the demo commit a different
coordinate than the phone for identical samples — a parity regression dressed as a feature. The
refutation is documented at the top of `engine/logic/gps.ts` so the next reader who checks §M13
finds the evidence immediately.

**Phone-repo follow-up (for the BUG-NNN ledger when the owner returns):** `src/features/README.md:768`
and `DOCUMENTATION-PLAN.md:2520,2534` describe GPS outlier filtering that does not exist —
doc-vs-code drift that already propagated into this effort's own inventory. Doc fix, not a code fix.

### 37b. Matrix row 29's "missing `locationContact`/`locationContactPhone`" is stale

Row 29's Delta lists the contact fields as missing from the demo. They were already present
(`SubmissionScreen`, and `DemoLocation.locationContact` / `.locationPhone` in the store) — note
the phone's second field is `locationPhone`, **not** `locationContactPhone`. The genuine finding
was PLACEMENT: the phone renders them inside the Location Information section but *after*
`<LocationForm/>`, i.e. below the GPS control and coordinate card (`app/(form)/submission.tsx:189-207`,
ui-mapping 05:41-42), with placeholder `Optional` on both. P2.3 fixed the placement and the copy.
No deferral — recorded so the matrix row can be corrected at merge.

### 37c. `formatLocationLabel` not ported

The phone's export-filename builder (`src/lib/utils/address-formatting.ts:155-188`) is the third
function in the module P2.3 ported. It is deliberately **not** ported: the demo has no export
filenames until P5, and shipping it now would mean an untested dead export.
**Trigger:** P5.1/P5.3, when export filenames land — port it there with its own tests (mind the
business-name de-duplication logic at `:179-187`, which exists to fix a real double-prepend bug).

### 37d. The reverse-geocode preference is component-local, not a setting

The phone's "Geocode" toggle reads/writes a per-context preference in the settings store
(`useReverseGeocodePreference('location')`, default on). The demo has no settings surface until
P7, so `LocationFields` holds it in `useState` — same default, same semantics, no persistence
across a screen unmount.
**Trigger:** P7.1 (Settings shell) — move it into the settings slice alongside the other Location
settings, and give the GPS accuracy mode the same treatment (P2.3 pins the phone's
`balanced` / 30 s defaults in `buildGpsConfig`, since there is no pane to change them yet).

### 37e. Reverse-geocode failure is surfaced; the phone's is silent

Submission passes no `onReverseGeocodeError` on the phone, so a failed lookup is logged and
**never shown** (ui-mapping 05:35). The demo shows an inline
"Address lookup unavailable — the captured coordinates were kept." instead: a silent no-op after
an explicit user action reads as a broken button, and the demo's honesty rule prefers saying what
happened. Deliberate deviation, not a port gap.

### 37f. GPS timeout is a deadline, not a raced timer

The phone races its whole sample loop against a `setTimeout` (`gps-service.ts:313-337`). The demo
enforces the same budget as a deadline: each `getCurrentPosition` receives the remaining budget as
its own `timeout` option and the deadline is re-checked between attempts. Same guarantee, no
dangling timer, and the loop stays testable without fake timers. Documented in
`ui/inputs/capture-gps.ts`. Revisit only if a capture is ever observed outliving its budget by
more than the tail of one already-abandoned reading.
## 42. P2.1 (parity/p2-notes) — notes-generator port: shared-address-formatting placement + header/notes abbreviation seam

**Status: BOTH ITEMS RESOLVED on `parity/p2-address-dedupe` (the P2.1 follow-up round).**

**Context:** P2.1 ported the phone's seven-section notes generator. The address section
formatter needs the phone's `formatAddress`/`abbreviateStreetTypes`
(`src/lib/utils/address-formatting.ts`), which the demo did not have — it was ported
**inside the notes module** (`engine/logic/notes/address-formatting.ts`) to keep P2.1's
footprint out of P2.3's concurrent territory. P2.3 landed its own shared port in
parallel; per this entry's original owner rule ("whoever merges second dedupes"),
the P2.1 follow-up executed both resolutions:

1. ~~Lift `address-formatting.ts` to a shared engine/logic location~~ — **RESOLVED**
   (commit `2b51591`): the notes address-formatter now consumes P2.3's canonical
   `engine/logic/address-format.ts`; the notes-local copy and its test suite are
   deleted (the shared suite is a strict superset of its pins). Byte-identity
   verified statically (line-identical function bodies, same 13-entry table/regex/
   join) and dynamically (all notes template-pinning + phone-parity tests pass
   unchanged against the shared module).

2. ~~PDF header un-abbreviated while the notes body abbreviates~~ — **RESOLVED,
   premise verified against the phone**: the phone's PDF header composes
   `resolvedAddress` via `formatAddress` (`case-notes-template.ts:51-54`, rendered
   `:86`) and its notes body composes its location string via the SAME
   `formatAddress` (`notes/formatters/address-formatter.ts:37`) — header and body
   agree on the phone, both abbreviated. The demo now matches exactly:
   `selectCaseNotesData.address` runs `formatAddress` (P2.3's selectors wiring) and
   the notes body runs the same shared module (item 1). Pinned end-to-end by the
   "§42.2 pin" test in `engine/__tests__/engine-flow.test.ts` (header row and
   attendance line carry the identical abbreviated string; the full street word
   never reaches the document). Remaining hand-join sites OUTSIDE the PDF path
   (Completion summary, screenData rows) are P2.4's §37 table — not re-tracked here.

## 43. `NoteSection`'s content/generatedContent invariant — recorded, deliberately unexpressed (P2 review R-28)

**Source:** P2 review R-28 (type-design lane TD-7, LOW; the lane itself recommended
recording over fixing). Owner P2.1, disposition executed on `parity/p2-fix-notes`.

**The invariant:** for an un-edited section (`manuallyEdited: false`),
`generatedContent === content` always holds — the reconciler's un-edited arm writes both
from the same fresh output, and every other writer either freezes the pair
(`manuallyEdited: true` paths) or rebuilds both (`resetNoteSection`,
`restoreAllNotes`). The type (`engine/types/index.ts` `NoteSection`) documents this in
prose but cannot express it structurally.

**Why record, not fix:** a discriminated union (`auto` arm carrying one string / `edited`
arm carrying both) would fork the demo's PERSISTED shape from the phone's
(`src/features/documentation/notes/types.ts` — the same flat shape, same prose
invariant), against the phase's port-verbatim premise; the snapshot guard would need a
custom refinement; and the sole route to a violating value is hand-editing
sessionStorage, where the zod shape guard already discards malformed snapshots — the
worst reachable case is a stale staleness-baseline that self-heals on the next
formatter-output change.

**Optional hardening, considered and NOT taken:** making the reconciler's un-edited arm
also compare `generatedContent` (self-healing at one extra comparison) would diverge the
reconciler from the phone's verbatim `fresh === stored.content` arm
(`section-reconciler.ts`) for a state unreachable through the demo's own writers.

**Trigger to revisit:** any new writer that sets `content` without `generatedContent`
(or vice versa) on an un-edited section, or a phone-side reshape of `NoteSection` —
adopt whatever shape the phone lands.
---

## 44. P2.2 fix round (parity/p2-fix-ocr) — OCR confirm: decisions taken while closing R-4/R-15/R-16/R-23/R-26

All five P2.2 findings from `docs/code-reviews/parity/p2/p2-review.md` were **fixed**, not
deferred. This section records the choices inside those fixes that a future reader would
otherwise have to reverse-engineer, plus the one §40 entry they partially overtake.

### 44a. Escape on the OCR recalculate prompt is deliberately NOT the Cancel arm

`AlertDialog`'s docblock says the caller should "wire `onDismiss` to whatever cancel means for
that alert." The OCR recalculate prompt breaks that rule on purpose.

The phone's `Cancel` on this alert is not a "close the dialog" — it is
`router.push(ROUTES.FORM.TIME_OFFSET)`, which **leaves the OCR flow and discards the capture**
(phone `app/(form)/ocr-capture.tsx:293-296`; ui-mapping 06:152). Wiring Escape to that would
mean a stray keypress throws away a read the operator just took. Escape instead closes the
prompt back to the confirmation step with the read, the draft, and the date-confirmation state
all intact — the least-destructive route, and the one every other Escape in this feature takes.

The sibling guard on `TimeOffsetScreen` does not face this: its `Cancel` genuinely is "close and
stay", so there Escape and Cancel coincide.

**Trigger to revisit:** if `AlertDialog` ever grows a documented "dismiss ≠ cancel" affordance
(a distinct `onEscape`, say), fold this in rather than keeping the local reasoning.

### 44b. The commit CTA is `aria-disabled`, not `disabled`

Closing R-15 swapped the confirmation step's primary CTA from `disabled` to `aria-disabled` with
a guarded click handler. Two reasons, only the first of which R-15 names: a `disabled` button
takes no focus, so nothing leads a keyboard user to the reason it is blocked; and this
particular button's state flips *while the operator is working on the screen* (confirming or
correcting the assumed date re-enables it), so `disabled` would drop focus to `<body>` at the
exact moment the operator wants to press it — the failure shape R-7 documents on the GPS
capture button.

The commit is now refused at three layers: the guarded click, the screen's `canCommit`, and
`isDvrDraftCommittable` inside `confirmOcr` on the bridge. That last one is the real gate; the
other two are UI.

### 44c. `calcOffset` gained a defaulted `regenerate` parameter (shared bridge helper)

R-4's fix split `generateExtractedScopes` off the offset calculation via
`calcOffset(regenerate = true)`, mirroring the phone's `performOcrCalculation(result, boolean)`.
The default is `true` **specifically** so the Time Offset screen's Calculate path — which has
its own confirmation, owned by P2.5 — keeps its exact previous behaviour. `TimeOffsetScreen.tsx`
was not touched. Anyone adding a third caller must decide the regenerate answer explicitly
rather than leaning on the default.

### 44d. Refines §40e — the confirm stage now has a Cancel, but only inside the prompt

§40e recorded that the confirmation stage offers no one-tap exit (only `Retake` → `Cancel`).
Still true in the general case. The R-4 prompt adds a `Cancel` that *does* leave the flow in one
tap, but only on the path where extracted scopes exist and the operator has already pressed
"Use this & calculate". §40e stands for every other path.

### 44e. R-16 was closed by labelling, not by suppressing or deferring

The finding offered three dispositions for the fabricated confidence chip. Chose labelling (the
`Sample` pill + a note stating the score is fixed and rates character legibility, not date
interpretation) over suppressing it on the ambiguous/time-only frames, because suppression hides
a value instead of telling the truth about it — the inverse of how this demo handles everything
else it cannot really do — and would make the confidence tiers unreachable on two of three
frames. If a real recogniser ever lands (P4), the badge and its note must be removed with the
constant; `OCR_SAMPLE_CONFIDENCE`'s docblock carries that instruction.
## 45. P2.3 fix round (p2-review R-1/R-6/R-7/R-10/R-13/R-17/R-18/R-21/R-24/R-25/R-31) — choices made

**Source:** the P2 aggregated review, `docs/code-reviews/parity/p2/p2-review.md`. All eleven
P2.3-owned findings are FIXED on `parity/p2-fix-submission`; nothing was deferred or refuted.
This entry records the judgement calls inside those fixes, so the fix-delta pass does not have
to re-derive them. (§41 remains the package's own refutation/residual ledger — it was §37 on the
authoring branch and renumbered during merge integration.)

**45a. R-7 took the stronger option, not the in-repo idiom.** The review offered PickerStage's
re-focus-on-failure effect (`:171-192`) or `aria-disabled` + an early return. Chose the latter:
PickerStage *repairs* focus after losing it, which fits a sub-second clipboard read, whereas the
GPS stranding window is the whole 30–120 s capture and covers the SUCCESS path too. `aria-disabled`
never drops focus at all. Consequence to know: the button stays tabbable and clickable while busy,
so the `if (busy || disabled) return` guard in `onClick` is load-bearing — deleting it re-enables
double-capture. Pinned by a test that clicks during the capture and asserts one write.

**45b. R-13 classified a bad timestamp as `INVALID_COORDINATES`.** A separate code would have been
more literal, but the union is deliberately the phone's minus the unreachable `UNKNOWN` (§41), and
`INVALID_COORDINATES` already means "this reading cannot be trusted". The message names the actual
defect. Revisit only if a caller ever needs to branch on timestamp-vs-coordinate invalidity.

**45c. R-18's unmeasured-sample ordering is a decision, not a fallout.** With `accuracyM` optional,
`selectBestSample` prefers any MEASURED reading over an unmeasured one in either order, and returns
an unmeasured one only when nothing in the set carries an accuracy. The alternative — never
returning an unmeasured sample — would turn "coordinates captured, accuracy unknown" into
`LOCATION_UNAVAILABLE`, which is dishonest in the other direction: the fix is real, only the
accuracy figure is missing. Both arms are pinned.

**45d. R-1 abandons a superseded lookup silently.** When the write guard fires, no notice is shown.
A notice would be attributed to the location now on screen, which never had a lookup in flight —
noise about someone else's operation. The dropped result is not evidence: the coordinates it would
have annotated were already written, stamped, and visible before the lookup started.

**45e. R-24 left one deliberate divergence.** `LocationFieldValues` is a flattened, all-optional
projection (`CoordinateProjection`) rather than `GpsCoordinates` proper, because a half-filled form
IS a real state there — unlike a stored fix, where lat/lng are required together. It is expressed
as a mapped type over `GpsCoordinates` so a field added to the canonical shape still has to be
projected explicitly. The other six carriers are straight derivations.

**Trigger for all five:** P3.4/P3.7 mount `GpsCaptureControl`/`LocationFields` for New Location and
per-camera capture. Re-read 45a (the `onClick` guard) and 45d (the guard token — those callers must
pass their own identity, not the recovery location's) before wiring them.

### Round 3 (fix-delta R-32/R-33/R-34) — additions and one superseded entry

**45f. The write guard is an identity check, not a generation counter — 45d is superseded.**
R-32 found the address-PICK path unguarded (R-1 had covered only the reverse-geocode write). Fixing
it exposed a defect in the round-1 shape: the fix-delta's suggested "capture `writeGen.current` in
the `onPick` body" reads the token at CONTINUATION time, after the switch, so it can never fire;
and capturing at handler-creation time instead hits an ordering hazard — the effect cleanup that
bumps the counter runs AFTER the re-render following a `locationId` change, so a handler created by
that render holds the pre-bump value and refuses its own first write. Both paths now share
`canWriteFor(issuedFor)` = mounted AND `issuedFor === openLocation.current`. The `mounted` half is
load-bearing and must not be dropped as redundant: it covers "left the wizard entirely", where the
id still matches while the store's target has moved on. A mutation test (`accepts a pick issued
AFTER the switch`) pins the deviation — it is red under the counter shape.
**Trigger for P3.4/P3.7:** these callers must pass their OWN identity as `locationId`; a per-camera
control passing the recovery location's id would guard the wrong thing.

**45g. R-33's guard reads the config source, not the config module.** Importing `vitest.config.mts`
into the test breaks `tsc --noEmit` (the `.mts` sits outside this tsconfig's module resolution, and
the extension-ful import is rejected). Reading the declaration out of the file text is the
type-check-safe way to assert the `testTimeout > asyncUtilTimeout` relationship. If the config ever
moves to `.ts` under the app's resolution, swap the regex for a real import.

**45h. R-34: the derivations are the protection; the guard file is the statement.** The round-1
guard asserted the wrong direction (`GpsCoordinates extends T` is silent precisely when a copy
LOSES a field). Corrected to key-exhaustiveness, matching `persistence.ts`'s `FullShape`. Worth
keeping in mind for future type guards in this repo: assignability-to-a-looser-type never catches
missing members, which is the direction real drift runs.

**45i. Still open, P2.3-owned, deliberately out of round-3 scope:** R-39 (`LookupNotice` consumed
by a binary ternary in `LocationFields`, so a fourth member would silently render the
partial-address copy — nit-grade). The round was scoped to R-32/R-33/R-34; R-39 needs the same
`never`-check treatment R-25 gave `gpsSourceLabel`. Cheap; fold into the next touch of this file.

---

## 48. P3.1 (parity/p3-crud) — cases CRUD + delete: adaptations, refutations & residuals

**Source:** P3.1 (matrix rows 10 CRUD, 15; plan §5). Spec: phone `docs/ui-mapping/02-tab-cases.md`
+ `11-case-modals.md`, phone `src/features/case-management/components/` (`CaseList`,
`SwipeableCaseCard`, `SwipeDeleteAction`, `LocationItem`, `DeleteConfirmationModal`) and
`services/case-service.ts`. Nothing here is unfinished work the package owes; each item is a
decision a reviewer would otherwise have to re-derive.

**48a. The swipe reveal became a hold + a visible trigger — and gained an a11y path the phone
lacks.** The brief called for "pointer long-press + row action buttons — match intent, not
gesture". A horizontal swipe on a pointer device is a scroll, so the reveal is a 500 ms hold
(React Native's own `onLongPress` default, the beat `LocationItem.tsx:34-38` uses) OR an
always-visible, keyboard-focusable ⋯ trigger. The phone carries a screen-reader-only
`accessibilityActions` delete entry (`SwipeableCaseCard.tsx:147`) precisely BECAUSE its gesture
is invisible to assistive tech; replicating an invisible gesture plus a parallel a11y-only path
would have been copy-parity over intent. What IS ported: single-open across the list (keyed
`case-${id}`/`location-${id}`, `CaseList.tsx:101-104`), the expanded gate on case rows only
(`SwipeableCaseCard.tsx:99-100,162`), tray-closes-on-expand (`:67-73`), and tray-closes-on-handoff
(`:75-78`).

**48b. "Scrolling the list closes the open swipeable" (`CaseList.tsx:86-93`) deliberately NOT
ported.** That rule protects against a stranded OVERLAY drawer. The web tray renders in flow,
takes its own row's height, and hides nothing — there is nothing to strand, and closing it on
scroll would make it feel like it had been dismissed by accident. Revisit only if the tray ever
becomes an overlay.

**48c. The delete confirmation is a port, not an `AlertDialog` consumer.** Plan §6 notes the
blocking-dialog primitive is wanted by P3.1/P4.5/P5.3, so `AlertDialog` (P2.4) was tried first
and judged against ui-mapping 11. It does not fit: (1) its body is one string, while this dialog's
content is structured and the case arm needs a `maxHeight: 150` SCROLLING location list — a cap
that is load-bearing, since a twenty-location case flattened into a `\n`-joined message pushes its
own buttons off the 786px phone screen; (2) the scrims disagree by design — `AlertDialog` mirrors
an OS alert whose scrim is deliberately inert, while this modal's scrim DOES dismiss (the phone's
`handleOverlayPress`). The overlay MECHANICS are shared (phone-screen portal, Escape, focus onto
the dialog and back to the opener). P5.3 should treat this as a second consumer-shaped datapoint:
the "primitive" the three surfaces want is the mechanics, not one component.

**48d. Refutation — the "shared destructive-warning line" is two different strings.** The brief
(and ui-mapping 11's phrasing) reads as one shared line. It is not: the location arm says
`All form data, photos, and PDFs for this location will be permanently deleted.`
(`DeleteConfirmationModal.tsx:164`), the case arm drops the qualifier —
`All form data, photos, and PDFs will be permanently deleted.` (`:226`). What is shared is the
styled slot (italic, `colors.error`, same position). Both lifted verbatim; both pinned by test,
including a negative assertion that the case arm does not carry the location wording.

**48e. `isDeleting` not ported.** On the phone, delete is async SQLite + filesystem, so the
component carries a pending flag (disabled buttons, spinner, backdrop no-op) and `cases.tsx` adds
a synchronous double-submit ref guard (`isDeletePending`). The demo's delete is one synchronous
store write; the dialog unmounts in the same tick. A permanently-false prop would be dead weight
pretending at an in-flight window that does not exist. **Trigger:** if a future package makes the
demo's delete asynchronous (an export/cleanup step, say), restore the prop and the guard together.

**48f. The verbatim warning copy names PDFs the demo never stored.** "All form data, photos, and
PDFs … will be permanently deleted" is lifted whole. Form data and captured media entries really
are destroyed; the demo generates PDFs on demand and stores none, so that clause has nothing to
over-promise — it is not a claim about a capability, and the deletion it warns about is entirely
real. Recorded because the honesty rule makes verbatim copy worth a second look, not because the
line needs softening.

**48g. Row 10's remaining CRUD verbs are deliberately NOT on this screen.** Row 10 lists
"edit / delete / duplicate / archive" as missing, but on the phone only DELETE is reachable from
the Cases tab; Edit and complete/archive/reopen live on the dashboard's `CaseActionsSheet`
(row 9 / P3.2) and duplicate lives in `DuplicateLocationModal` (row 14 / P3.5). Adding them to
this screen's tray would have invented a surface the phone does not have. The store actions they
need (`updateCase`, `archiveCase`, `reopenCase`) ARE built and tested here and are THE canonical
ones — P3.2/P3.3 consume them rather than minting their own. ~~**Trigger:** P3.5 appends its `Duplicate…` action to the same location tray…~~ **DISCHARGED
at the P3 assembly — see §56g.** Note also that `archiveCase`/`reopenCase` did NOT survive as the
canonical status actions: they were reconciled onto P3.2's `setCaseStatus` (§56b).

**48h. Status gating lives in the caller, not the store.** (Both actions were folded into
`setCaseStatus` at the P3 assembly, §56b; the rule below is unchanged and now applies to it.)
`archiveCase`/`reopenCase` will move
any case to any of their statuses; the phone's services are equally unguarded
(`case-service.ts:571-583`) and its `actionsForStatus` matrix gates the BUTTONS. P3.2 owns that
matrix (with the `assertNever` the row-9 spec calls for). Do not push it down into the store —
the sheet needs the matrix as data for rendering anyway.

**48i. The tray's open key is screen-local state.** Unlike `expandedCaseId` (bridge state, because
`submitCase` auto-expands the case it just created — the phone's `newlyCreatedCaseId`), nothing
outside `CasesScreen` drives which row is showing a button. Kept local so the bridge does not grow
a field for chrome. Consequence: it resets if the screen ever unmounts — which is what closing a
swipeable on unmount does on the phone anyway.

**48j. `capture` is blanked when the OPEN location is deleted.** Not cosmetic: `switchLocation`
blanks the in-progress calibration on every switch but `addLocation` does not, so deleting the open
location and then creating a new one would have opened Time Offset pre-filled with the deleted
DVR's clock reading. Pinned by a regression test. If `addLocation` ever gains its own reset, this
one stays — they cover different paths.

---

## 49. P3.2 (parity/p3-dashboard) — dashboard actions: seams, deliberate deviations, residuals

**Source:** P3.2 Dashboard actions (matrix rows 8 + 9) — `CaseActionsSheet`, `actionsForStatus` +
`assertNever`, the read-only case report with its measured-overflow scroll gate, complete /
archive / reopen wiring, the 5-recent cap and `MoreLocationsPill` overflow.

### 49a. `Edit Case` is wired as an OPTIONAL prop and currently absent (P3.3 seam)

The phone's sheet renders `Edit Case` first, unconditionally, and it opens `NewCaseModal` in
**edit mode** — which is package P3.3's deliverable, in a parallel worktree. `CaseActionsSheetProps.onEdit`
is therefore optional and the button renders only when supplied; the bridge passes nothing, with a
`P3.3 SEAM` comment at the JSX call site (`DemoExperience.tsx`, the `actionSheetCase &&` block).
A button that cannot do what it says would break the demo's honesty rule, and a "coming soon"
alert is the fake-success shape the rule exists to prevent.
~~**Trigger (one line, do it at the P3 assembly merge):**~~ **DONE — see §56j.** Once
`NewCaseModal` accepts `mode`/`initialCase`, add `onEdit={…}` to the `<CaseActionsSheet/>` props — closing the sheet
first, then opening the editor (the phone additionally waits 350 ms for its pageSheet dismissal
animation, `home.tsx:41,168-173`; the demo's overlays unmount synchronously, so no delay is
needed). The component test `renders Edit Case FIRST when the bridge supplies onEdit` already
pins the wired arm.

### 49b. `setCaseStatus` may collapse into P3.1's `updateCase`

P3.1 owns cases CRUD. P3.2 needed a status writer before that landed, so it added the minimal
`setCaseStatus(caseId, status)` — deliberately NOT reusing the existing `completeCase`, which is
the Completion screen's action and additionally stamps the open location's `form.completed` under
the R-32 "the caseId must own the current location" precondition. The dashboard has no location
context and must not invent one.
~~**Trigger:** if P3.1 lands a general `updateCase(caseId, patch)`, fold `setCaseStatus` into it…~~
**REFUTED and resolved the other way at the P3 assembly — see §56b.** P3.1's `updateCase` payload
deliberately OMITS `status` (a `@ts-expect-error` probe pins the omission), so folding the status
in would have deleted the invariant. `setCaseStatus` is instead THE single status writer and
absorbed P3.1's `archiveCase`/`reopenCase`. The no-write-on-no-change behaviour named here turned
out to be broken — it allocated a fresh state object — and is now pinned at whole-state
granularity in both suites.

### 49c. The sheet's `Status:` line copies a phone inconsistency verbatim

`caseStatusSheetLabel` renders `Active` for a draft and the **raw lowercase enum value**
(`complete` / `archived`) otherwise — the phone's `CaseActionsSheet.tsx:133`, which its own
ui-mapping doc flags as inconsistent with the title-cased `CaseStatusBadge` labels. Lifted as-is:
copy parity is the contract, and quietly "fixing" the demo would put the two apps' court-facing
wording out of step over a cosmetic call that is the phone's to make.
**Phone-repo follow-up (BUG-NNN ledger when the owner returns):** the status subtitle should
almost certainly read `Complete` / `Archived`. Cosmetic, one line.

### 49d. The dashboard card still labels a draft `DRAFT`, where the phone's says `ACTIVE`

`getStatusDisplay` (phone `DashboardCaseCard.tsx:32-42`) maps DRAFT → the literal `ACTIVE`; the
demo's `caseStatusTheme` (`ui/screens/screenData.ts`) maps `'draft'` → `Draft`. A genuine copy gap
— but `caseStatusTheme` is shared by the Cases list (row 10, **P3.1's**) and the map case picker,
so changing it inside P3.2 would silently restyle two surfaces another package owns and is
concurrently editing. Not in row 8's Delta either.
**Trigger:** P3.1, or whoever next touches `caseStatusTheme` — change the one label and re-run
`screenData.test.ts` + `appChapters.test.tsx` + the map picker suite together.

### 49e. No toast on a case action (deliberate; do not re-flag)

The phone toasts `Case Updated · {caseNumber} completed|reopened|archived` on success and
`Action Failed` on error (`home.tsx:100-126`) because its write is an async SQLite round-trip
followed by a refetch — the toast is the only confirmation the row will change. The demo's write
is synchronous: the card behind the sheet re-renders green/grey on the same tick, so a toast would
announce something the visitor is already looking at, and there is no failure arm to report (an
in-memory status write cannot fail). The demo has no toast primitive at all today.
**Trigger:** if a later package introduces a toast/snackbar primitive AND a case action ever gains
a failure mode (e.g. a persisted backend), revisit both halves together.

### 49f. Phone behaviours the demo cannot have, and does not fake

- **Focus refresh** (`useFocusEffect` → `refresh()`, `home.tsx:65-69`): exists because the phone's
  tabs are `lazy:false` and its list is a snapshot of a database query. The demo's dashboard reads
  the store through the bridge's subscription, so it is never stale — nothing to port.
- **The phone's sheet never unmounts** (it sits mounted with `caseData=null`), which is why it
  carries a measured-height reset keyed on `caseData.id` (`CaseActionsSheet.tsx:121-125`). The
  demo mounts the sheet only while a case is open, so each open measures from scratch and the
  guard has no equivalent. If the sheet is ever hoisted to an always-mounted slot, that guard must
  come with it.
- **Sheet dismissal animation delay** (`SHEET_DISMISS_ANIMATION_MS = 350`): an iOS pageSheet
  constraint. See 49a.

### 49g. Residuals worth a later pass

- **Per-card expansion state resets when the dashboard unmounts.** The phone's tabs stay mounted,
  so a card left expanded is still expanded on return; the demo's `ScreenStage` swaps screens, so
  expansion is per-visit. Lifting it to the bridge (next to `expandedCaseId`, which the Cases tab
  uses) would fix it. Cosmetic; deferred rather than adding bridge state for a nicety.
- **`hasCapturedCoordinates` is consumed only by the sheet.** The port lives in
  `engine/logic/coordinates.ts` and every demo surface that displays or plots a coordinate should
  gate on it (the phone's rule). The map's `toMapData` and `CoordinateDisplay` were NOT audited in
  this package. Low risk here — demo coordinates only ever arrive via `parseCoordinate`, a
  geocode, or a real GPS fix, so the phone's zero-init artifact has no source — but the audit is
  owed. **Trigger:** P3.7 (per-camera GPS) or P6.1 (map depth), whichever touches plotting first.
- **The 5-recent cap is silent**, exactly as on the phone: a sixth case simply is not on the
  dashboard, under a heading that says "Recent Activity", and every case remains on the Cases tab.
  No "and N more" affordance was invented. **Trigger:** only an owner call that the demo should
  lead the phone here.

---

## 50. P3.3 (parity/p3-newcase) — New Case create/edit completion: adaptations & residuals

**Source:** P3.3 NewCaseModal completion (matrix rows 11 + 12) — required-field gate,
duplicate-case-number detection, edit mode, confirm-on-create. Everything below is a decision
taken inside the package, not work left undone; the two genuinely open items are 50f and 50g.

### 50a. The primary action is `aria-disabled`, not `disabled` — on purpose

The phone hard-disables Create Case while Case Number or Unit is blank
(`NewCaseModal.tsx:445`). Its `validateForm` (`:135-150`) owns the messages "Case number is
required" / "Unit is required" — and because the disabled predicate is the SAME expression,
those messages are unreachable on the phone: `handleSubmit` cannot run while either field is
blank. Shipping them as-is would have been shipping dead copy.

The demo dims the button and marks it `aria-disabled`, lets the click reach `handleSubmit`,
and validates there. Enforcement is identical (validate-and-return); what changes is that a
visitor now learns *which* field is missing instead of only that the button is unavailable.
Follows §45a's `aria-disabled`-over-`disabled` precedent. **Consequence to know:**
`ModalActions.submitBlocked` does NOT swallow the click — the guard is the caller's, and
deleting a caller's validate-and-return re-opens the submit. Its doc comment says so; P3.4's
New Location gate must not assume the prop blocks. **This is the semantic that survived the P3
assembly's three-way prop reconciliation (§56d); P3.4's New Location gate was given the
caller-side guard it had been getting from the swallow.**

### 50b. Duplicate detection lives at the store's write boundary, and its scope is honest

The phone's uniqueness is a SQLite `UNIQUE` column; the narrowing to
`DuplicateCaseNumberError` happens in the service catch. The demo has no database, so
`createCase` calls `assertCaseNumberFree` before minting an id. Two truthful differences,
both documented in `engine/logic/case-number.ts`: the demo's uniqueness is **session-scoped**
(the phone's spans every case on the device), and the check is **proactive** rather than a
caught constraint failure. No copy claims otherwise.

Comparison is trimmed and **case-SENSITIVE** — SQLite's default collation is BINARY and the
phone declares no `COLLATE NOCASE`, so `PR25-1` and `pr25-1` are two cases there too.
**Do not harmonize this with `isLocationNameTaken`** (P3.4/P3.5), which is deliberately
case-INsensitive because it is a proactive service check with no index behind it
(`utils/errors.ts:204-213`). The two rules differ on the phone; they must differ here.

### 50c. `createCase` now throws — a contract change for every caller

Any code path that creates a case must either guarantee a free number or catch. Today the only
caller is the bridge's `submitCase`, which deliberately does NOT catch: the modal's own
try/catch renders the banner, and swallowing it in the bridge would lose the case silently.
**Trigger:** P3.5's duplicate-location flows and any future seeded/imported case creation must
decide their own answer (a generated name, or the banner) rather than inheriting an
uncaught throw.

### 50d. One modal id for two modes — the exploration manifest cannot tell them apart

Edit mode reuses `ModalId 'newCase'` (the phone treats this component as one multi-caller
surface, and matrix row 12 calls edit "a multi-caller config of #11"). Because `openModal`
records the id in `visited`, opening the sheet to EDIT a case lights the rail's "Create a Case"
row. Accepted: the alternative is a second `ModalId`, which widens the persisted `visited` key
space and therefore drags in a `SNAPSHOT_VERSION` bump plus the union-tuple guards — a
disproportionate cost for a checklist nuance, paid in the store/persistence hotspot several
packages share. (**The bump half of that reasoning is wrong** — widening the `visited` allow-list
needs no version move; see §56l. The rest of the trade-off stands.) **Trigger:** revisit if the manifest ever reports completion rather than mere
exposure.

### 50e. The edit seam is deliberately unwired in this package

`DemoExperience.editCase(caseId)` seeds the form and opens the sheet in edit mode; nothing
calls it yet. Its two callers belong to sibling packages — P3.2's dashboard `CaseActionsSheet`
("Edit Case") and P3.1's Cases-row actions — and both pass it straight through as their edit
callback. It lands here because the modal, the mapper (`caseFormData.ts`), the `updateCase`
action and the immutability rule all land here; a second inlined copy is exactly the seed
drift the mapper exists to prevent. ~~**Trigger:** P3.1/P3.2 wire it… **The first package to wire an entry owns adding that
end-to-end test.**~~ **DONE at the P3 assembly — see §56j.** The dashboard sheet's `onEdit` is
wired and the end-to-end arm lives in `DemoExperience.case-actions.test.tsx`.

### 50f. Reverse-geocode errors have no banner path here yet

The phone routes `IncidentLocationForm`'s `onReverseGeocodeError` into this modal's
`submitError` banner (ui-mapping 11 § Conditional Behavior). The demo's incident block has no
GPS capture and no reverse-geocode toggle yet (matrix row 11 delta; deferred §24), so there is
no error to route. The banner state and its render are already in place. **Trigger:** whoever
adds incident GPS capture (P3.6/P3.7 territory) wires the failure into `setSubmitError` rather
than inventing a second error surface.

### 50g. Edit mode does not re-seed if the underlying case changes while open

The form is seeded once, when `editCase` opens the sheet — matching the phone, which mounts a
fresh modal per edit precisely so its lazy initializers capture the right case
(`app/(tabs)/home.tsx:371-374`). If a case were mutated by something else while its edit sheet
was open, the sheet would keep the stale seed and overwrite on save. Nothing in the demo can do
that today (there is no background writer). The bridge does handle the one reachable
disappearance: a case deleted out from under an open edit sheet falls back to create mode
rather than rendering an edit sheet with no case behind it. **Trigger:** P3.1's delete, or any
future concurrent writer, should re-check this.

---

## 51. P3.4 (parity/p3-locgps) — New Location GPS + duplicate-name: deliberate choices & residuals

**Source:** parity plan §5 P3.4, matrix row 13, phone `docs/ui-mapping/11-case-modals.md:64-112`.
The package closes deferred **§24's location-modal half** (the no-op "Capture GPS coordinates"
button) by mounting P2.3's `LocationFields` whole. This entry records the judgement calls so a
review round does not have to re-derive them.

**51a. The write-guard token is a per-open DRAFT id, not a location id.** §45f requires every
`LocationFields` caller to pass its OWN identity; here the location does not exist yet, so the
thing an in-flight lookup belongs to is the draft. `addLocation` mints `draft-l<n>` from the
existing `uiSeq` counter on every open. Strictly, `mounted` alone would cover today's code — the
modal is conditionally mounted and really unmounts on close — but the token is what (i) makes
the guarantee expressible as a test at the component level, (ii) re-keys `GpsCaptureControl` per
open (that `key` IS the capture half's abort), and (iii) survives the "always mounted, toggle
`visible`" refactor the phone's own JSDoc warns about (`NewLocationModal.tsx:49-52`).
**Trigger:** none — but a future refactor that drops `draftId` must first prove the modal is
still remounted per open.

**51b. `LocationFields` was NOT given the phone's `errors` prop.** The phone's `LocationForm`
takes `errors?: { businessName?, streetAddress?, city? }` and `NewLocationModal` wires all three
(`NewLocationModal.tsx:258-262`), but only one is ever produced there — `streetAddress` in the
`requireAddress` flow. The demo states that message in the modal's blocked-reason region instead,
which it needs regardless because its submit is `aria-disabled` + `aria-describedby` (the R-7/R-15
house shape) rather than `disabled`. Adding a three-key prop with one live producer and two
permanently-undefined keys would ship dead surface.
**Trigger:** the first caller that genuinely needs a business-name or city error under its field
(P3.6's `EditIncidentLocationModal` is the candidate) — port `LocationForm`'s `errors` shape onto
`LocationFields` then, and move the address message under the field with it.

**51c. The phone's silent reverse-geocode failure in THIS modal is deliberately not reproduced.**
ui-mapping 11:386 records the fact-check finding that `NewLocationModal` passes no
`onReverseGeocodeError`, so a failed lookup here reaches Sentry and nothing else — no banner, no
inline message, coordinates saved. The demo's `LocationFields` always renders
`REVERSE_GEOCODE_UNAVAILABLE` / `REVERSE_GEOCODE_PARTIAL` (P2.3's treatment). Copying a silent
failure would break the honesty rule to gain nothing. **Trigger:** file it on the phone-repo
follow-up ledger (HANDOFF §8.4) as a BUG-NNN when the owner returns.

**51d. The duplicate message renders in two places when it blocks.** Inline under Location Name
(phone parity — the phone's live check IS the field's `error`) and in the reason region the
disabled submit describes. In a scrolling sheet the field error can be off-screen when the visitor
reaches the button, and the region is what makes an `aria-disabled` control explain itself.
**Trigger:** if a review prefers one site, give `Field` an `errorId` escape hatch and point
`submitDescribedBy` at the field's error for the `duplicateName` arm only.

**51e. `isSubmitting` is not part of the gate.** The phone's `disabled` condition has four terms;
the demo's has three. `onSubmit` here is a synchronous in-memory store write, so there is no
in-flight window — a fabricated spinner would be theatre. Recorded because a reviewer diffing the
two conditions will notice the missing term.

**51f. Only `isLocationNameTaken` was ported from the phone's `location-name.ts`.**
`generateCopyName` and `ensureUniqueLocationName` are P3.5's per plan §5, and they belong in the
same `engine/logic/location-name.ts`: both build on its `normalizeLocationName` and both need the
phone's `LIMITS.MAX_LOCATION_NAME_LENGTH` (100, phone `case-management/constants/index.ts:64`),
which this package had no use for and therefore did not port.

**51g. §24 is only partly closed.** Its three halves are the incident coordinates (P3.6), the
per-camera GPS (P3.7) and the New Location button (this package). Strike §24 when the last of the
three lands — it was left untouched here deliberately, so three concurrent lanes do not each
rewrite the same entry.

**51h. R-39 (§45i) did NOT fire.** Its trigger is "the next touch of `LocationFields.tsx`", and
this package deliberately touched nothing in that file — mounting the P2.3 capability unchanged
was the point. It remains open and still cheap.

**51i. Shared chrome grew three additive props, in `_shared.tsx`.** `Field.error` (phone
`TextInput`'s), `ModalActions.submitDisabled` + `submitDescribedBy`, and `ModalShell.subtitle`
(phone `NewLocationModal.tsx:212-219`, for P3.5's caller). P3.3 (NewCaseModal's required-field
gate + duplicate-case-number banner) needs the first two for the same reasons; if both lanes add
them, the merge should keep one copy rather than two spellings of the same prop.

---

## 52. P3.5 (parity/p3-duplicate) — the location action chooser: web adaptations, cross-package seams, residuals

**Source:** P3.5 implementation (matrix row 14 — `DuplicateLocationModal`, the six-action
chooser; phone `src/features/case-management/components/DuplicateLocationModal.tsx` +
`services/duplicate-location-service.ts` + `utils/location-name.ts`).

### 52.1 The long press is an accelerator; the "⋯" button is the affordance

**What:** the phone opens this chooser with a long press on a location row and nothing else.
The demo ships both: `useLongPress` (500ms hold — React Native's own `delayLongPress` — plus a
context-menu gesture) AND a visible per-row "⋯" button.

**Why not gesture-only:** a hold is undiscoverable on a web page, unreachable from a keyboard,
and unannounced to a screen reader; the plan's own instruction for this class of surface is
"match intent, not gesture" (§5, P3.1). Shipping only the button would have lost the phone's
muscle memory for anyone driving the demo after using the app, so both are wired to one
handler.

**Trigger / harmonization:** ~~**P3.1 owns the row-affordance conventions**~~ **DONE at the P3
assembly — see §56f (one hook) and §56g (one row).** P3.1 owns the row-affordance conventions
(delete + swipe equivalents) and was unmerged when this landed — its branch had no commits past `ac1a0a9`.
When P3.1 lands, reconcile in one pass: `features/demo/ui/useLongPress.ts` is reusable as-is
(it is generic, per-element, and unit-tested), and the location row is now its own
`LocationItem` component inside `CasesScreen.tsx` — the natural home for a delete affordance.
If P3.1 introduced a different row shape (e.g. a swipe-reveal), keep ONE and re-point the
chooser at it.

### 52.2 The two export actions render live and answer with an honest notice

**What:** "Export ZIP" and "Export GeoJSON" render exactly as the phone's do (same section
caption, same labels, never name-gated) and, when pressed, close the chooser and raise the
banner "Export ZIP isn't available yet — it lands with the Export tab." (likewise GeoJSON).

**Why render rather than hide** (the plan left this to the agent's judgment, P3.5 row): the
chooser IS the phone's location-level export entry point — hiding the section would
misrepresent the surface as a four-action chooser, and the matrix counts the export actions as
part of row 14. The DemoNotification idiom (the map's "Calling isn't available in the demo.")
tells the truth on press instead of faking a download, per the honesty rule.

**Trigger:** P5.2/P5.3. When the Export tab and `ExportModal` exist, re-point these two
buttons at the real flows — ZIP still terminating in its own honest download notice per D4,
GeoJSON at whatever P5 lands — and delete the two notice constants in `DemoExperience.tsx`.

### 52.3 `duplicated_from` is not modelled

**What:** the phone stamps `duplicated_from` on a duplicate (`duplicate-location-service.ts`
step 5) and deliberately does NOT stamp it on a new-address copy — that one is an independent
location. The demo carries the same behavioural distinction (address/requester sourcing,
scopes) but stores no provenance column.

**Why deferred:** nothing in the demo reads it. The phone uses it for sibling grouping; the
demo's Cases list, map and PDFs all order by creation. Adding an unread field to `DemoLocation`
would also widen the persisted snapshot shape for no rendered difference.

**Trigger:** the first demo surface that groups or sorts duplicates as siblings (a case-map
export cluster, a "duplicates of" affordance) — add `duplicatedFrom?: string`, the matching
optional in the `demoLocationSchema` shape (device 2 makes that a compile error, not a silent
drop), and set it in `duplicateLocation` only.

### 52.4 Shared-chrome and `NewLocationModal` props added from this package — P3.4 must reconcile

**What:** this package added, in files P3.4 owns or shares: `Field`'s optional `error`
(hairline + message + `aria-invalid`), `ModalActions`' `submitDisabled`, and three optional
`NewLocationModal` props — `subtitle`, `requireAddress`, `existingNames` — plus the live
duplicate-name check and a blank-name gate on Create that now applies to the **plain Add
Location caller too** (phone parity: ui-mapping 02:260 disables Create on a blank or duplicate
name for both callers).

**Why here:** P3.5's new-address flow needs the require-address variant to exist, and P3.4
(row 13: "live duplicate-name check … `requireAddress` variant for the copy flow") was
unmerged with no commits when this landed. The brief's instruction was to wire against its
prop signature and flag.

~~**Trigger:** at P3.4 merge…~~ **DONE at the P3 assembly — see §56h**, which also records the
two type-level bugs the no-op had been masking (a hard-coded `'geocoded'` provenance stamp and a
`gps`-excluding override type), and the one residual: the new-address card's GPS path has no test
arm of its own.

### 52.5 The two new modal ids are not in the rail's exploration manifest

**What:** `duplicateLocation` and `newAddressLocation` are real `ModalId`s (narration written,
`visited` recorded, persistence's `MODAL_IDS` updated) but no `EXPLORE_ITEMS` row covers them,
so the rail keeps "Cases" active while the chooser is open — the same anchor fallback the OCR
launch screen uses.

**Why deferred:** the manifest is a curated 15-row checklist gating the before-you-go dialog;
several P3 packages add modals, and growing it one row per package per branch would both churn
the checklist and conflict across branches. `selectExploreStatus` handles unlisted ids by
design ("the registry may lead or lag").

**Trigger:** an owner call on whether case/location management deserves its own manifest row
after P3 merges — one entry in `engine/content/explore.ts` if so.

### 52.6 The phone's Toasts become one-line banners

**What:** each phone Toast in this flow (`Location Duplicated` / `{name} created with
scopes.`, `Location Created` / `{name} created with copied submission info…`, `Error` /
`Location not found.`) is rendered as `title — body` in a single `DemoNotification`, portalled
into the phone overlay root so it is visible over an open modal (the new-address card
deliberately stays up after a failed create, phone parity — a notice hidden behind it would be
a silent failure).

**Why deferred:** the demo has no two-line toast surface, and inventing one for three strings
would pre-empt whatever P4/P5 need. The strings themselves are verbatim.

**Trigger:** if a package builds a real toast component (title + body + type colour), migrate
these three call sites and drop the em-dash joining.

---

## 53. P3.6 (parity/p3-incident) — incident editing: deliberate non-ports & one un-forked duplicate

**Source:** parity package P3.6 (matrix rows 22, 23; plan §5 P3.6). Phone spec:
`docs/ui-mapping/03-tab-map.md:244-300`, `11-case-modals.md:165-207`,
`src/features/case-management/components/EditIncidentLocationModal.tsx`,
`src/features/location/components/IncidentLocationForm.tsx`,
`src/features/case-management/utils/incident-location-mapping.ts`, `app/(tabs)/map.tsx:98-176`.

**53a. No GPS capture control on the incident form — the one field the phone has and this does
not.** Phone `IncidentLocationForm.tsx:312-320` mounts `GpsCaptureControl` with
`INCIDENT_ACCURACY_OVERRIDE = 'precise'`, which is also where its reverse-geocode toggle lives.

*Why deferred:* `DemoCase.incidentCoordinates.source` is typed to `COORD_SOURCES`
(`'geocoded' | 'manual'`) with an explicit invariant — "Incident coordinates come from the address
pick or hand entry — never a live GPS fix" (`engine/types/index.ts`) — and plan §5 P3.6 scopes this
package to "manual/geocoded source stamping". Adding capture is not a UI change: it widens that
union through `NewCaseInput`, `createCase`, the persistence schema and the provenance chip, all of
which are P3.3/P3.4 territory this wave. The matrix row 23 Delta column describes the PHONE
("GPS + reverse geocode"); the plan describes what P3.6 builds. Followed the plan.

*Consequence, recorded so it is not re-derived:* of the phone's two reverse-geocode entry points
(post-capture, `:206`; manual-coordinate blur, `:215-223`), only the blur one exists here. The
banner — the behaviour this package is actually about — is reachable through it, so nothing is
untested; there is simply one fewer way in.

*Trigger:* whoever widens incident provenance to include `'gps'`. `GpsCaptureControl` is already
parameterised (`label`, `config`, `geocodeEnabled`/`onToggleGeocode`) — drop it in above the
lat/lng row in `IncidentLocationFields`, move `geocodeEnabled` from "implicitly on" to the
control's toggle, and re-read §45a (the `onClick` busy guard) and §45f (the write-guard token).

**53b. The banner has one arm, not the phone's two.** Phone
`EditIncidentLocationModal.tsx:78-93` shows either a reverse-geocode failure or a SAVE failure
(`error.message`, falling back to `Failed to save incident location`). The demo's save is a
synchronous in-memory store write with no failure mode. A save-error arm would be an invented
error path — the honesty rule cuts against it as hard as it cuts against fake successes. Not a gap
to close; re-open only if the demo ever gains a save that can fail (it would not be this store).

**53c. `onReverseGeocodeError` accepts `null` to clear — a deliberate one-word deviation.** The
phone's callback is set-only, so a lookup failure keeps accusing the user until they press Save,
even after a later lookup succeeds. Clearing on a new attempt is `LocationFields`' own reviewed
behaviour (`setLookupNotice('none')` at the top of each capture). Pinned by a test.

**53d. `NewCaseModal` still carries its own inline copy of the incident block — NOT forked, not
yet folded.** `IncidentLocationFields` is built as the shared field set the matrix asks for ("build
as a second mode of the same form"), but `NewCaseModal.tsx` is owned by P3.3 in this same wave, so
this package did not edit it. The duplication is therefore real and temporary:
`NewCaseModal`'s private `CoordinateField`, its inline coordinate chip, and its
`incidentLatitude`/`incidentLongitude`/`incidentCoordinateSource` flat fields duplicate what
`IncidentLocationFields` + `IncidentLocationValues` now express once.

Two copy divergences it leaves standing, both resolved in favour of the phone in the new component:
`Business / Scene Name` placeholder is `Optional` (phone `IncidentLocationForm.tsx:280`) vs
NewCaseModal's `Where the occurrence happened`; street placeholder is `Start typing an address...`
(phone `:290`, and what `LOCATION_FIELD_LABELS` already uses) vs NewCaseModal's ellipsis-character
variant.

*Trigger:* the next agent to touch `NewCaseModal`'s incident section — most likely P3.3's edit-mode
work, since edit mode needs exactly the seed/submit pair `caseToIncidentValues` /
`incidentValuesToPatch` already provides. Replace the inline block with
`<IncidentLocationFields values={…} onChange={…} />`, back the three flat coordinate fields with
`IncidentLocationValues`, and delete the private `CoordinateField`. The phone keeps ONE mapper for
both surfaces for precisely this reason (phone `incident-location-mapping.ts:1-10`); until the fold
happens, the demo has one mapper and one-and-a-half forms.

**53e. No `incidentAddress` field.** The phone stores a pre-formatted "street, city" string on the
case and `incidentValuesToFields` derives it on save. `DemoCase` has no such field — the demo
derives the string at display time (`mapData.ts` `joinAddress`, and §38's `formatAddress`
single-producer rule). Emitting one would create a second source of truth for the same string.
Deliberate; no trigger.

---

## 54. P3.7 (parity/p3-camgps) — per-camera GPS: refutations & deliberate non-ports

**Source:** P3.7 per-camera GPS (matrix row 42; ui-mapping 07:112-176; phone-inventory §M15) —
`CameraGpsCapture`, the five camera keys, the max-50 row gate.

### 54a. `capturedAt` comes from the READING, not the clock seam — the brief was too weak

The package brief specified "`coordinateCapturedAt` via the clock seam, never `Date.now`". The
clock seam would have been wrong in the same direction, just less so. The phone stamps
`new Date(bestSample.timestamp).toISOString()` (`gps-service.ts:301`) — the winning satellite
reading's OWN platform timestamp — and `GpsFix.capturedAtIso` already carried exactly that from
P2.3. `toCameraGpsFix` passes it through untouched; no clock is read anywhere on the camera GPS
path. A forensic capture time must be when the fix was taken, not when the app got round to
storing it (which, under `PRECISE_GPS_CONFIG`'s 2-minute budget, can be two minutes later).
Pinned by `gps.test.ts` ("takes `capturedAt` from the fix, never from an ambient clock").

### 54b. The phone's `minItems={1}` is deliberately NOT ported alongside `maxItems={50}`

`ArrayFieldManager` gates both ends: the phone hides Remove at one camera and Add at fifty. Only
the cap is ported. `minItems` exists on the phone to protect a SEEDED first row; the demo boots
empty by owner decision (D2/empty-boot) and has its own "No cameras yet — add the ones in the
recovery." state, so a floor of 1 would mean either seeding a camera nobody asked for or
forbidding the removal of the last one on a screen that legitimately starts at zero.
**Trigger:** only if the demo ever seeds a camera row. Nothing in the plan does.

### 54c. Other `ArrayFieldManager` caps are still unported

The phone also caps Extracted Video Scope at 10 (`maxItems={10}`, ui-mapping 07:204). P3.7's
scope was row 42, so only the Cameras cap landed. `MAX_CAMERAS` + `maxCamerasMessage` in
`CamerasScreen.tsx` are the pattern to copy — the message template is the shared phone string.
**Trigger:** the next package that touches `ExtractedScopeScreen`.

### 54d. Scope extension taken deliberately: the PDF camera-GPS row

Row 42 names the Cameras screen only, but the five keys would otherwise have reached NO output:
the `cameras` NOTES section is `''` on both sides (PR-86 — the PDF camera table is the canonical
camera surface), and the demo's table had three columns and no GPS row while the phone emits one
(`cameras-table.ts:44-70`). Shipping the capture without the consumer would have "closed" five
field-parity keys into a dead end, so the row was ported with the phone's
`hasCapturedCoordinates` gate. That policy moved from `notes/camera-formatter.ts` into
`engine/logic/coordinates.ts` and is now shared by both consumers — the arrangement the phone
already has. Recorded because it is outside the row's literal wording.

### 54e. `source` is the literal `'gps'`, deliberately narrower than `GpsSource`

A recovery location's fix can be geocoded from its address or typed by hand; a camera has exactly
one coordinate path — the crosshair button — so `CameraGpsFix.source` is
`Extract<GpsSource, 'gps'>`, matching the phone's `coordinateSource: 'gps'`
(`camera-gps/types.ts:17,36`). Written as `Extract<...>` rather than a bare literal so it stays
linked to the canonical union. **If P4's import ever supplies camera coordinates, this is the
line that must widen first** — and `persistence.ts`'s `z.literal('gps')` will stop compiling
until it does, which is the intended alarm.

### 54f. §45f's trigger, discharged

§45f warned: "a per-camera control passing the recovery location's id would guard the wrong
thing." It doesn't. The camera control's write token is the CAMERA id, and `setCameraGps`
re-resolves that id against current state — which, because camera ids are globally unique, also
subsumes the cross-location guard (a fix captured on location A cannot be found in location B).
`LocationFields`' `canWriteFor` shape is not reused here because the identity being guarded is
different, not because the discipline is.

### 54g. Demo-only additions over the phone's control, both truthful

The live sample readout (`Sample n of 10 · best ±Xm`) and the `UNSUPPORTED` failure line are
carried over from `GpsCaptureControl` for the same reasons recorded in §41: the phone's
multi-sample loop is invisible behind a spinner and the demo exists to show it, and a browser can
lack geolocation entirely where a phone cannot. Under `PRECISE_GPS_CONFIG` the readout matters
more, not less — the budget is 120 s, not 30 s. Every number on the line is measured; the
accuracy clause is omitted entirely when nothing measured one. `formatSampleProgress` is shared
by both surfaces so they cannot drift into two sentences for one state.

### 54h. `sampleCount` is not stored on a camera

`GpsFix.sampleCount` is dropped by `toCameraGpsFix`. The phone's `GpsLocation.sampleCount`
doesn't reach its camera entry either, nothing renders it, and a stored reading count would be
dead weight in every snapshot. **Trigger:** a surface that wants to show how many readings a
stored fix took — it would need the same addition on `DemoLocation.gps` to be worth anything.
**45i. ~~Still open, P2.3-owned, deliberately out of round-3 scope:~~ RESOLVED — see §55c.**
R-39 (`LookupNotice` consumed by a binary ternary in `LocationFields`, so a fourth member would
silently render the partial-address copy — nit-grade). The round was scoped to R-32/R-33/R-34;
R-39 needs the same `never`-check treatment R-25 gave `gpsSourceLabel`. Cheap; fold into the next
touch of this file. **Closed on `parity/p3-riders` with a total copy map rather than the `never`
arm — same guarantee, no unreachable default; rationale in §55c.**

---

## 55. P2 residual-minor rider (R-35/R-36/R-37/R-38/R-39) — choices made, nothing deferred

**Source:** `docs/code-reviews/parity/p2/p2-review-fixdelta.md` §R-35…R-39 — the five
non-gating minors the P2 fix-delta left open when round 3 was scoped to R-32/R-33/R-34.
All five verified live at `ac1a0a9` before work (none was incidentally fixed in round 3)
and **all five are now closed on `parity/p3-riders`**; nothing here is deferred. This entry
records the judgement calls so a fix-delta pass does not have to re-derive them, and
**closes §45i**, which parked R-39 for "the next touch of this file".

**55a. R-35 took the guard, not the deletion.** The review offered `aria-disabled` + an early
return **or** dropping the disabling entirely ("re-confirming is idempotent"). Chose the
guarded `aria-disabled` so the confirm button and the commit CTA twenty lines below it read
the same way — one idiom on one screen, both explained by §44b — and so the button still
*says* it has been answered. Consequence to know: unlike the CTA's, this guard is **not**
load-bearing (a repeat `onConfirmDate()` is a no-op in the bridge); it is there to keep the
two buttons symmetrical. Deleting it is safe; deleting the `aria-disabled` is not.

**55b. R-37 also changed the render site.** `AlertState = Omit<AlertDialogProps,'onDismiss'>`
would still have compiled with the hand-listed `title/message/actions` at the `<AlertDialog>`
call, but a prop added to the primitive would then have needed two edits instead of none. The
render spreads (`{...alert}`) so the derivation is actually load-bearing end to end.
Mutation-verified: a required prop added to `AlertDialogProps` errors at all three `setAlert`
call sites. The one thing this does NOT catch is a prop added with a default — same limitation
every `Omit`-derived state has.

**55c. R-39 used the copy map, not the `never` arm.** §45i asked for "the same `never`-check
treatment R-25 gave `gpsSourceLabel`"; the fix-delta's own suggestion was a
`Record<Exclude<LookupNotice,'none'>, string>`. Took the Record: identical compile-time
guarantee (adding a member is TS2741 at the literal — verified), no unreachable `default` arm
to carry, and it keeps the "which copy" decision in one place next to the two exported strings.
`'none'` stays excluded because it has no copy — the notice element is not rendered in that
state, and the existing `lookupNotice !== 'none'` guard is what narrows the index.

**55d. R-36's probe instruments a prop, because `SectionBlock` is not a module.** The repo's
established render-counter (`ImportTerminalProgress.memo.test.tsx`) swaps a child MODULE for a
memo-wrapped counting delegate. `SectionBlock` lives inside `NotesScreen.tsx`, so that trick
needs a production extraction — reshaping a court-document screen for a test. Instead
`meta.label` is a counting getter: `NotesScreen` never reads it (it reads `manuallyEdited` for
the banner and nothing else), `SectionBlock` reads it every render for two `aria-label`s. If a
future change makes the PARENT read `label`, this probe silently over-counts and the test
starts failing honestly-but-confusingly — re-point it at another SectionBlock-only field
(`content`, `freshContent`) rather than loosening the assertion.

**55e. What the R-36 guard does and does not cover.** It pins the memo through the props that
exist today. A **seventh** prop added to `SectionBlock` from the bridge without a `useCallback`
is caught (the bridge half asserts zero block re-renders on an unrelated store write). A prop
added with a stable identity but a changing VALUE is not, and nor is `copyAllText` — the second
memoised derivation — which no block consumes; it is covered only by `assembleNotesString`'s own
suite. Its `useMemo` shares `[currentLocation]` with `notesMeta`, so the bridge-half assertion
does move together with it in practice.

---

## 56. P3 assembly integration — where six packages disagreed, and how each was resolved

**Source:** the P3 assembly merge of `parity/p3-crud` (P3.1), `parity/p3-newcase` (P3.3) and
`parity/p3-duplicate` (P3.5) into `feat/parity-p3` (P3.2/P3.4/P3.6/P3.7 were already in).
Everything below is a decision taken at the merge, not work left undone; nothing here is
outstanding.

### 56a. `parity/p3-crud` was NOT merged when the assembly brief said it was

The brief listed P3.1 among the packages already on the phase branch.
`git merge-base --is-ancestor 8816bb8 HEAD` said NO and `CasesScreen.tsx` carried no tray, so it
was merged here as one of three, first — P3.5's `Duplicate…` entry folds into the tray it
introduces, so its order was forced. Recorded because the same claim will be in the phase-review
brief unless the reviewer re-derives it.

### 56b. ONE case-status writer: `setCaseStatus`. §48g ∧ §49b, both discharged

P3.1 shipped `archiveCase`/`reopenCase` (named one-liners over the phone's three services,
`case-service.ts:571-583`); P3.2 shipped `setCaseStatus(caseId, status)` and wired it to the
Case Actions Sheet. **§49b's own trigger — "fold `setCaseStatus` into P3.1's `updateCase`" — is
refuted:** the edit payload deliberately omits `status`, and a `@ts-expect-error` probe pins the
omission, so folding it in would delete the invariant. The named wrappers lost instead: zero call
sites outside their own unit test, `complete` would have needed a fourth (that name belongs to the
Completion screen's location-stamping `completeCase`), and one writer typed on `CaseStatus` cannot
silently miss a status the enum later gains. §48g's "archiveCase/reopenCase … are THE canonical
ones" is superseded; P3.1's semantics were carried onto the survivor arm-for-arm.

**A defect fell out of the reconciliation.** `setCaseStatus`'s no-op returned `{}` from INSIDE
`set`, which zustand `Object.assign`s onto a FRESH state object — every selector re-runs and the
persistence subscriber writes a snapshot, for a repeat tap that changed nothing. P3.2's test
pinned `cases` by reference only and passed either way; P3.1's whole-state assertion is what
failed at the merge. Fixed with P3.1's `get()`-first early return, and `store.test.ts` gained the
stronger whole-state pin at P3.2's own call site.

### 56c. ONE `updateCase` payload: P3.3's `CaseEdits`, with P3.1's guard

P3.1 minted `updateCase(caseId, Partial<Omit<DemoCase, …>>)`; P3.3 minted
`updateCase(caseId, Omit<NewCaseInput, 'caseNumber'>)`. P3.3's survives: it is a structural port
of the phone's own edit CALL SITE (`const { caseNumber: _caseNumber, ...updates } = input`,
`app/(tabs)/home.tsx:184-188`), so the payload is TOTAL and clearing a field works. P3.1's partial
shape ports the phone's SERVICE signature (`types/index.ts:239-251`), where partiality is
meaningful because a SQL writer builds its SET list from the present keys — meaningless here,
where the writer spreads onto the record either way, and actively misleading: a caller sending
`{ displayName }` would expect the rest preserved and get them blanked. P3.1's two contributions
were kept: the unknown-id early return, and the compile-time probe (re-pointed at `CaseEdits`,
still rejecting `id` / `caseNumber` / `status` / `locationIds`).

### 56d. ONE submit gate: `ModalActions.submitBlocked` + optional `submitDescribedBy`

Three spellings landed in parallel — P3.4's `submitDisabled` (`aria-disabled` + a refusal inside
the button's own onClick), P3.3's `submitBlocked` (`aria-disabled`, click deliberately reaching
the caller — §50a), P3.5's `submitDisabled` (the hard `disabled` attribute). The union keeps
BOTH live semantics: the button dims and reads `aria-disabled`, the click **always** reaches
`onSubmit`, and enforcement is **always** the caller's guard — stated on the prop, because
deleting a caller's validate-and-return silently re-opens the submit. `submitDescribedBy` stays
for callers whose reason is already on screen in a live region.

Why the click is not swallowed, in one line: the phone's disabled predicate is the same
expression as its `validateForm`, which makes that function's messages ("Case number is
required" / "Unit is required") unreachable copy; letting the click through ships them live.
`NewLocationModal` gained the guard it had been getting from the swallow — its reason region
already renders, so a blocked click is refused exactly as before, with the enforcement now
readable at the call site rather than hidden in shared chrome.

`aria-disabled` is rendered on both arms (present-with-`"false"`), the house convention every
other assertion in the suite reads; P3.3's one `not.toHaveAttribute` assertion was updated.

### 56e. ONE `Field.error` — a superset, not an average — plus `Field.readOnly`

Also three spellings. The merged treatment reddens the border, sets `aria-invalid`, and renders
the message with BOTH `role="alert"` and an id the input's `aria-describedby` points at:

- `role="alert"` is what a SUBMIT-TIME message needs (P3.3's required-field errors). Focus is on
  the button at that moment, so `aria-describedby` on the input announces nothing — a silently
  refused submit, which is precisely the failure mode the house rules exist to prevent.
- `aria-describedby` is what a field-focused visitor needs, and it re-reads on every return.

**P3.4's stated reason for dropping `role="alert"` does not hold at its own call site.** It reads
"a live check fires on every keystroke and would otherwise interrupt continuously"; the live
callers pass a CONSTANT string (`NEW_LOCATION_BLOCK_MESSAGES.duplicateName`) from a conditionally
mounted node, so the region announces when the collision appears and stays silent while the
visitor keeps typing into it.

Error now REPLACES hint, which is the phone's rule and was P3.4's one genuine divergence:
`src/components/common/TextInput.tsx:113-125` renders `{error && …}` then
`{!error && helperText && …}`.

### 56f. ONE `useLongPress` — the duplicate that did not conflict

P3.1 shipped `ui/primitives/useLongPress.ts`; P3.5 shipped `ui/useLongPress.ts`. **Different
paths, so git merged both in silently** — no conflict, no signal, two hooks. Merged at P3.1's
path (`primitives/` is the documented home for UI primitives) as a genuine union: P3.1's
`enabled` gate and capture-phase swallow, P3.5's context-menu gesture, movement tolerance and
keyboard-safe `detail === 0` exemption.

The swallow is P3.1's `onClickCapture`, not P3.5's `guardClick(run)` wrapper: these rows hold
more than one interactive child (the row button AND the ⋯ trigger), and a wrapper only guards
the one callback it is threaded through, while capture-phase `stopPropagation` reaches the whole
subtree. P3.5's hook suite carried over, its probe reshaped to the real call site, plus a new
`enabled: false` arm. P3.1's swallow test gained an explicit `detail: 1`: `fireEvent.click`
defaults to `0`, which is now the keyboard exemption, so the unqualified click was passing for
the wrong reason. **Guard rail for future packages: a shared primitive added at a new path will
not conflict with the same primitive at an old one.**

### 56g. ONE location row: P3.1's tray carries both of the phone's gestures (§48g, §52.1)

P3.5 built its own `LocationItem` + ⋯ button; P3.1 built `RowActionsTrigger`/`RowActionsTray`
with single-open, expand-gating and tray-closes-on-handoff. P3.1's structure survives, and the
tray now holds `Duplicate…` (the phone's long-press → chooser) above `Delete` (the phone's
swipe) — two separate gestures there, one affordance here, which is what §48g's marked seam and
§52.1's "keep ONE and re-point the chooser at it" both asked for. Both entry points (the hold and
the ⋯ trigger) open the TRAY; the chooser is one step in. Tests in three suites moved with it.

### 56h. `NewLocationModal`: P3.4 wins, and the seam hid two type-level bugs (§52.4)

P3.5's copy is the pre-P3.4 shape (`onCaptureGps`/`onPickCoords`, hard-`disabled` submit,
"Contact Person"/"Contact Phone" labels); P3.4's mounts `LocationFields` whole. P3.4's survives
and the new-address card mounts it with no `onCaptureGps` override, which discharges §52.4's
"the new-address card must use P3.4's REAL GPS capture, not the inherited no-op". It mints its
own `draftId` (§45f) because it shares `locForm` with the plain Add-Location caller.

Two things the no-op had been masking, both fixed here:

1. `submitNewAddressLocation` stamped `source: 'geocoded'` on every fix. Harmless while an
   address pick was the only way a coordinate could arrive; with a real capture behind the button
   it would have relabelled every GPS fix as a geocode in the stored record and the PDF.
2. `NewAddressOverrides.gps` was typed `Exclude<GpsSource, 'gps'>` — a type that was true only
   because of the no-op. Widened to `GpsSource`; narrowing it again would drop real fixes.

**Closed rather than deferred:** "the same component" is a claim about construction, so three
arms now put it under test — `new-location-gps.test.tsx` drives a real capture through the card
in its `requireAddress` variant and asserts the fix arrives stamped `'gps'`, and
`duplicate-location.test.ts` asserts the store keeps that provenance. The only unpinned link left
is the bridge's one-line `gps: locForm.coordinates` pass-through, which is the same expression
`submitLocation` uses and which IS pinned there.

### 56i. §50c's case-sensitivity split verified, and its `createCase` flag cleared

The two rules are still deliberately different and now cross-reference each other in BOTH
directions: `case-number.ts` is trimmed + case-SENSITIVE (SQLite BINARY, no `COLLATE NOCASE`),
`location-name.ts` is trimmed + case-INSENSITIVE (a proactive service check with no index behind
it). Do not harmonize them; they differ on the phone.

§50c also flagged that P3.5's creation paths might hit `createCase`'s new
`DuplicateCaseNumberError` throw. They cannot: `createCase` has exactly one call site in the
whole app (`DemoExperience.tsx`'s `submitCase`, inside the modal's try/catch), and
`duplicateLocation`/`duplicateToNewAddress` mint LOCATIONS via `nextId('l')` without touching it.
The trigger stands for future seeded/imported CASE creation, which is what it was really about.

### 56j. Two seams wired, and the tests they owed (§49a, §50e)

`CaseActionsSheet.onEdit` → `DemoExperience.editCase`, one line at the JSX call site plus
`editCaseFromSheet` (close the sheet, then open the editor; the phone's 350 ms pageSheet delay
has no demo equivalent). The honest-rule consequence is the point: **Edit Case renders now**,
because it can finally do what it says. P3.2's negative pin ("carries no Edit Case button until
P3.3 wires…") was replaced by §50e's owed END-TO-END arm — open sheet → Edit Case → seeded form →
change a field → Save Changes → the `updateCase` patch asserted, case number immutable, no second
case created — plus arms for re-targeting and for create-mode restoration after Cancel.

`closeCaseModal` now also blanks `caseForm`, not just `caseEditId`. Clearing the id alone left
the previous case's VALUES in the form; every UI entry blanks them on open so nothing was
reachable, but the guarantee belongs at the close rather than resting on every future opener
remembering to.

### 56k. Redundant tests dropped, not rewritten

P3.5's four `NewLocationModal` gate arms in `modals.test.tsx` were written against the pre-P3.4
prop shape, and every assertion in them is already made against the live modal by P3.4's
`new-location-validation.test.tsx` (17 arms). Likewise P3.5's `isLocationNameTaken` describe,
whose cases are a subset of P3.4's. Both dropped with a comment pointing at the surviving suite,
rather than ported into a second copy that would drift.

The R-21 sandbox disambiguation was the SAME fix in both packages (`/^Test Location/`), so only
the comment needed reconciling. P3.5's registry-derived `isViewCover` replaced the hand-listed
`Exclude<>` of modal ids, which had already rotted twice (P3.6's `editIncident`, then P3.5's two).

### 56l. `ModalId` reached seven members with no `SNAPSHOT_VERSION` bump — deliberate

`duplicateLocation` and `newAddressLocation` join `editIncident` in `MODAL_IDS`, which is the
allow-list `loadSnapshot` filters `visited` keys through. Widening it only ACCEPTS more keys, and
every stored snapshot's keys are a subset of the new set, so no migration is owed — the same
reasoning P3.6 used. The version bumps when a persisted VALUE shape moves (P3.7's camera GPS keys
took it to 5), not when a key space widens. §50d's "a second ModalId drags in a bump" was the
cautious reading; this is the verified one.

---

## 57. P3 review fix round (R-1…R-17) — decisions, refutations, and what stays deferred

**Source:** the P3 vetted review (`docs/code-reviews/parity/p3/p3-review.md`, approve-with-fixes,
0 BLOCKER / 3 MAJOR / 14 MINOR), fixed on `parity/p3-fixes`. Every finding was addressed; the
entries below are the judgement calls a fix-delta reviewer would otherwise have to re-derive.
Nothing here is outstanding except where explicitly marked.

### 57a. R-1's fix shape was followed except for one instruction, which is refuted

The review asked to "lift the nested-control bail (`e.target.closest('button')`) into the shared
hook — the Cases rows need it too". Lifting it verbatim would have **killed the Cases gesture
outright**: the handlers rode a wrapper `<div>` whose every descendant is a `<button>`, so every
hold would have bailed on its own row.

What makes one rule serve both layouts is comparing against the surface —
`closest(control) !== e.currentTarget` — together with each caller attaching the hook to the
element that IS the gesture surface. So the Cases handlers moved from the wrapper strip onto the
row/header BUTTON. Two things fall out: a press anywhere inside resolves to that button and arms,
and the ⋯ trigger beside it leaves the gesture entirely (holding it no longer double-toggles its
own tray — pinned).

**The `userSelect` rider** is a style token (`LONG_PRESS_SURFACE_STYLE`) rather than a key in the
returned handler object, because callers spread that object alongside their own `style` prop and
a `style` key inside it would win or lose by attribute order at each call site.

### 57b. The third long-press hook is the guard rail's third strike — state it as a rule

§56f recorded "a shared primitive added at a NEW PATH will not conflict with the copy it
duplicates". P3.2's copy was not at a new path; it was **not a module at all** — a private
`useLongPress` inside `DashboardScreen.tsx`. The consolidation never saw it, and its private
`LONG_PRESS_MS = 500` could have drifted from the shared beat with every test green.

**The rule, generalised:** before writing a gesture/primitive helper inside a screen, grep
`ui/primitives/` for it. A reviewer's counterpart: a `useX` defined in a screen file is a
consolidation candidate by default. Both surviving copies encoded complementary halves of one
platform fact (touch raises `contextmenu`, mouse does not), each correct where the other was
broken — which is what duplication costs when neither copy can see the other's bug.

### 57c. R-3 went further than the review asked — the gate is no longer re-derived

The review asked for `aria-disabled` + a guarded click + a reason node on
`DuplicateLocationModal`. It also had a private re-derivation of the two name rules
`new-location-gate.ts` already owns, so the fix routes through `newLocationBlock({ …,
requireAddress: false })` instead: the module's evaluation ORDER comes with it (a blank name
reports "required", never "duplicate", even when a blank-named sibling exists), and
`NAME_TAKEN_ERROR` becomes a re-export of the module's own string so the two surfaces cannot
drift on copy. Same reasoning §56 applied to `location-name.ts`.

Consequence worth knowing: the "emits nothing while gated" arm now pins the MECHANISM, not just
the outcome. Under the old `disabled` attribute the click never reached the handler, so the
commit-path guard was never actually exercised by that test.

### 57d. R-2 conceded — an argument from similarity is not a pin

§56h closed its own residual by arguing the new-address GPS wire "is the same expression
`submitLocation` uses and which IS pinned there". The review re-ran the probe: severing it left
all 1891 tests green. **Recorded as a reusable lesson, not just a fixed test:** §56h's own two
bugs (a hard-coded `'geocoded'` stamp, a `gps`-excluding override type) survived by exactly that
reasoning shape — a claim about construction standing in for a claim about behaviour. When a
seam has already produced one class of bug, similarity to a sibling call site is not evidence.

### 57e. R-7 closed rather than re-deferred, and §49g's trigger is discharged

The review offered gating `toMapData` on `hasCapturedCoordinates` **or** re-deferring in §54 with
a fresh trigger. Gated. §49g's trigger ("P3.7 or P6.1, whichever touches plotting first") fired
at P3.7 and has been pointing at a shipped package since; re-deferring would leave three
consumers of one record disagreeing for another phase over an import and two call sites.

Honest about what it is: the demo has no zero-init artifact — coordinates arrive only via a
capture, a geocode, or `parseCoordinate`, which correctly ACCEPTS a typed 0/0 — so the only
source is a visitor deliberately typing zeros. This is consistency between consumers, not a
fabricated position.

### 57f. R-10's fix is neither shape the review proposed

Both proposals had costs: keeping the tray mounted while `pendingDelete` is armed drops §48a's
ported tray-closes-on-handoff behaviour (`SwipeableCaseCard.tsx:75-78`), and threading a
`returnFocusTo` ref from the row up to the bridge crosses the callback-isolation boundary for
chrome state. Instead the row moves focus to its own ⋯ trigger BEFORE handing off, so the
dialog's existing capture finds a live element. The trigger is the right anchor on its merits: it
is the affordance that led there, and unlike the tray's buttons it survives the tray closing.

### 57g. R-13 needed the SETTER, not just the field

Narrowing `NewCaseFields.incidentCoordinateSource` to `IncidentCoordSource | ''` alone would not
have caught anything: `onChange(field: keyof NewCaseFields, value: string)` accepts any string
for any key, so both write sites would have kept compiling. The setter is now generic per key
(`onChange<K extends keyof NewCaseFields>(field: K, value: NewCaseFields[K])`), verified by probe
— `onChange('incidentCoordinateSource', 'manaul')` is now a compile error. **Generalisable:** a
keyed setter typed on the union of keys but a single value type erases every field's type; if a
form field's type is load-bearing, the setter has to be generic.

### 57h. Still deferred, with triggers

- **§53d's FULL fold** (mount `IncidentLocationFields` in `NewCaseModal`, delete its private
  `CoordinateField` + chip). R-13 took the type half only. `NewCaseModal`'s private
  `CoordinateField` therefore still has R-16's a11y gap — fixed in `IncidentLocationFields`,
  not in the private twin, because the twin is slated for deletion and fixing it twice would
  make the duplication harder to see, not easier. **Trigger:** the next package to touch
  `NewCaseModal`'s incident section — and this time the fold, not another type patch.
- ~~**The remaining `DemoCase` fixture sites.**~~ **CLOSED — see §57j.** The sentence that stood
  here was wrong in both halves, as the fix-delta established (R-21): it claimed the four folded
  suites were all the hand-rolled ones and that the survivors "build cases through the store and
  are already drift-proof". Three survivors were full hand-rolled literals and none went through
  the store. The trigger it offered was self-defeating too — the entity grows by OPTIONAL fields,
  which never make a stale literal *fail*, so "fold whatever still fails" named the empty set.
  All three are folded; no hand-rolled `DemoCase` literal remains.
- **Type-design's four carried NITs** (the duplicate actions' three-refusals-one-`null`;
  `IncidentSheetItem.id`; `CaseNotesCamera.gps` widening `CameraGpsFix`; `activeModal()`'s
  `default` over a 7-member `ModalId`). Untouched, per the review's disposition. One of them now
  has a live consequence recorded at the call site: `NEW_ADDRESS_FAILED_NOTICE`'s copy had to name
  a single cause because the store collapses three, so surfacing a discriminated result would
  split it back into three sentences.
- **TESTS-P3-7** (the `deleteCase` derivation arm cannot distinguish derive-from-location from
  keep-previous). Carried as a NIT; the distinguishing state is unconstructible through any
  writer today.

### 57i. WEB-7's omission is now recorded at the call site, deliberately

`NewCaseModal` passes `submitBlocked` with no `submitDescribedBy`, and that is the design, not an
oversight: §50a/§56d's whole point is that the click REACHES `handleSubmit`, which writes the
phone's verbatim per-field messages into the fields' own `role="alert"` nodes. The reason is
reachable by activation rather than pre-stated, which is what keeps that copy live instead of
dead. A comment at the call site says so, so a later a11y sweep does not "fix" it into a swallow.
The New Location card is the other shape — its reason is on screen before the press — and the two
are meant to differ.

### 57j. The micro-round (R-18…R-21 + two NITs) — and what it says about test evidence

Four integrator-owned minors from the fix-delta, all landed. Three of them are one finding wearing
three faces: **the long-press click/contextmenu rules were correct in production and unpinned,
mis-pinned, or half-covered in the suite.**

- **R-18** — R-1's rewrite REPLACED the keyboard-exemption arm rather than adding beside it, and a
  repo-wide grep for `detail: 0` then returned nothing while the file header still promised the
  guarantee. §56f had recorded that exemption as a known wrong-reason trap, which makes deleting
  its only pin the worse half. Restored, and stronger: the arm now abandons a hold off the row
  first, so the flag is genuinely armed when the keyboard activation arrives.
- **R-19** — the off-row-hold arm ended in a bare `fireEvent.click(row)` (jsdom `detail: 0`), so it
  rode the very exemption R-18 is about and passed with or without the reset it existed to pin.
  Not introduced by the fix round: `2b18a0a`'s probe was genuinely red on P3.1's branch, and the
  §56f ASSEMBLY silently made it vacuous by merging the `detail` check in. **The general hazard:
  merging two correct mechanisms can make a third party's correct test vacuous, and nothing in the
  merge is red to say so.**
- **R-20** — `fired` was armed for every hold, but only touch raises a trailing `contextmenu` to
  consume it, and the keyboard menu key (Shift+F10) raises one with NO pointer event, which R-1's
  reset-on-pointerdown rule cannot reach. R-1's own improvement made it reachable by turning the
  Cases surface into a focusable `<button>`. Fixed by arming the latch only for touch — removing
  the class rather than adding a second clearing path.

  **R-20 paid for itself immediately:** it turned three EXISTING arms red — the hook suite's,
  `CasesScreen`'s and `DashboardScreen`'s "touch hold" arms were all simulating a MOUSE hold and
  passing for the wrong reason. `pointerType` is now explicit at every long-press pointerdown and
  the hook suite's `down()` helper defaults to `'mouse'`, so an arm about touch has to say so.

- **R-21** — the three surviving hand-rolled `DemoCase` literals folded onto the factory
  (`caseFormData.test.ts`, `incident-location.test.ts`, `final-submission.test.ts`; the last also
  carried a hand-rolled `DemoLocation`, and was the live demonstration of the drift — it omitted
  the optional `incidentCoordinates` and type-checked). §57h's false sentence corrected above. The
  `CaseCard` fixtures in three screen suites are deliberately NOT folded: that is the view-model
  `toCaseCards` produces, not the stored entity, and it has its own shape.

**Both NITs taken** (each genuinely one line, per the fix-delta's own framing):

- **TD-N1** — `NewCaseModal`'s `change` wrapper and the bridge's `onChange` were
  `(field, value: string)`, which is assignable to R-13's generic prop by constraint
  instantiation and silently erased the per-key typing. Both are generic now; probe-verified that
  `change('incidentCoordinateSource', 'manaul')` is a compile error. **Generalise:** hardening a
  prop's type does nothing if a wrapper on the way to it is still typed loosely — check the
  forwarders, not just the declaration.
- **TD-N2** — `LONG_PRESS_SURFACE_STYLE` is now `as const satisfies CSSProperties`, matching every
  other exported style token; it was mutable shared data spread into three call sites.

**Deliberately still not filed:** the silent-failures lane's `onContextMenu`-does-not-arm-
`swallowNextClick` observation. No constructible browser sequence reaches it (a `contextmenu`
before the timer, still followed by a click), both original hooks carried the same written-down
assumption, and R-20 narrowed the latch rather than widening it — adding an unreachable
belt-and-braces here would be one more unpinned line in the file this round exists to make
honest.

## 58. P4.1 (parity/p4-capability) — the web capture capability: adaptations, refutations & residuals

**Source:** P4.1 Capture capability layer (plan §5 P4.1, matrix §1.11 preamble) — the
`getUserMedia`/`MediaRecorder`/canvas capability every P4 media package consumes. Engine core in
`features/demo/engine/logic/media/`, browser I/O in `features/demo/ui/inputs/capture-media.ts` +
`object-urls.ts`, hooks in `useCaptureStream.ts` + `useMediaCapture.ts`.

### 58a. REFUTATION — object URLs are NOT what puts the test suite on the sample path

The brief (and the natural assumption) is that jsdom's missing media APIs route the suite to the
sample fallback wholesale. Verified in-environment, that is only two-thirds true. `navigator.
mediaDevices` and `MediaRecorder` really are undefined. **`URL.createObjectURL` is not:** jsdom's
own `window.URL` lacks it, but under Vitest the global `URL` is **Node's**, which implements it and
mints `blob:nodedata:<uuid>`.

Consequence, recorded so nobody "fixes" it later: `readBrowserObjectUrls()` returns a working io in
tests, and the object-URL suites exercise real minting and revocation rather than a stub. The
capability's `unavailable` state is gated on `mediaDevices`/`MediaRecorder` only. `isDurableMediaUrl`
still classifies `blob:nodedata:…` correctly (it is a `blob:` URL), so the persistence contract is
unaffected. No deferral — a correction to a premise.

### 58b. The phone's permission REMEDY copy is deliberately not lifted

Headlines are verbatim ("Camera Access Required", "Microphone Access Required", "No camera device
available"). The remedy sentences are not: the phone says "enable microphone access in your
**device settings**", which in a browser points the visitor at a control that cannot fix a site
permission. `captureFailureMessage` says "your browser's site settings" instead, pinned by a test
asserting the phone phrase never appears. Copy parity loses to being correct.

### 58c. Filename extensions name the real container, not the phone's

The phone appends `.jpg` / `.mp4` / `.m4a` (ui-mapping 09:592). A browser's `MediaRecorder`
usually produces WebM, and Chrome sometimes reports `video/x-matroska`. `extensionForMimeType`
therefore derives the extension from what was ACTUALLY produced, falling back to the phone
extension only when the MIME type carries no container information. Stamping `.mp4` on a WebM blob
would put a false claim in an evidence filename. **P4.4 must use `mediaFilename(base, captured)`**
rather than appending an extension itself.

### 58d. Permissions API not queried — a denial costs one extra click after a reload

`navigator.permissions.query({ name: 'camera' })` would let a surface render the denied view
immediately on mount instead of after the visitor presses the control and is instantly refused. It
is not implemented: the `camera`/`microphone` descriptors are Chromium-only, so the demo would
carry a second permission-source seam that answers on one browser family and stays silent on the
others. Current behaviour is honest, just one click slower after a reload.
**Trigger:** if P4.3/P4.6 device testing shows the extra click reads as a broken button — add it
as an OPTIONAL enrichment behind its own seam, never as the source of truth for `CapturePermission`.

### 58e. Audio-degradation ladder: one extra `getUserMedia` on a mic-less machine

A camera request that also wants audio is retried video-only when the combined request fails on
`NO_DEVICE`/`PERMISSION_DENIED`, so a machine with no microphone still gets a (silent) video take
and the surface can say so via `audioDegraded`. Cost: a second prompt-free `getUserMedia` on those
machines. Accepted — the alternative is reporting "No camera device available" to someone whose
camera is fine, which is simply false. `DEVICE_BUSY` deliberately does NOT retry.

### 58f. `sizeBytes` is absent on sample captures, and duration is the recorded figure

`toSampleCapture` reports no `sizeBytes`: nothing measured the bundled files at runtime, and a
hard-coded byte count in P4.5's media-item info panel would be a number nobody verified. Its
`durationSec` (4s) is a property of the committed asset, regenerable from
`tools/sample-media/README.md`. A live recording's `durationSec` is the RECORDED duration (paused
time excluded), not the wall time of the take.

### 58g. Media library / delete revocation is P4.5's to wire

`revokeCapturedUrls(io, urls)` exists in `object-urls.ts` with tests and **zero callers** — it is
the counterpart of `handOff()`: once the store owns a capture's URL, `deleteMedia` is the only
thing that can revoke it. Left unwired rather than speculatively hooked into the store, since P4.5
owns the delete flow.
**Trigger:** P4.5, when `deleteMedia` gets its UI — call it from the bridge's delete handler. If
P4.5 ships without it, a deleted photo's bytes stay pinned for the life of the tab.

### 58h. No settings surface for capture quality

The phone's `useMediaCaptureSettings` drives video resolution, codec, shutter sound, max duration
and GPS-in-media (ui-mapping 09). The demo pins the browser defaults and the phone's 1-hour ceiling
instead — same posture P2.3 took with `buildGpsConfig`'s `balanced`/30s.
**Trigger:** P7.1 (Settings shell) — add a Media pane alongside Location and thread the values
through `UseMediaCaptureOptions`.

### 58i. `MediaItem.url` is optional and `snapshotOf` strips `blob:` URLs — SNAPSHOT_VERSION 6

Recorded here because it is the one P4.1 change outside the media module. Media bytes are never
persisted (plan §5 P4.1 / D2), so the write side drops object URLs and a restored capture renders
`MEDIA_EXPIRED_NOTICE`. Making `url` optional is a field WIDENING — the drift direction the
snapshot guard's compile-time devices explicitly do not catch (the file's own R-30 note) — so the
version and key suffix moved together, and the maximal round-trip fixture switched its media URLs
to bundled sample paths so `url`/`poster` remain part of its "no optional silently dropped" pin.
Any further `MediaItem` shape change must bump again.

## 59. P4.2 (parity/p4-drawer) — the drawer Media accordion + save-status chrome: refutations, deviations, residuals

**Source:** P4.2 drawer media accordion (matrix row 80; ui-mapping 14 § CustomDrawerContent;
phone `src/components/layout/CustomDrawerContent.tsx:265-400`) — the Media accordion, the
save-status indicator slot, and the app-version chrome line.

### 59a. REFUTATION — the phone has no save-status indicator, in the drawer or anywhere else

Row 80 lists "the **save-status indicator** (`isDirty`/`saveStatus`)" among the drawer's missing
pieces, which reads as a phone surface waiting to be ported. It is not one. ui-mapping 14's
render order for `CustomDrawerContent` is header → Back to Cases → item list → Media accordion →
footer, and the source confirms it: `CustomDrawerContent.tsx` imports `useSectionCompletion` but
never `useSaveStatus`. Across the whole phone app, `useSaveStatus()` — the READER — has **zero**
production callers; only the `setSaveStatus` writer is wired (`useAutoSave.ts:24`,
`useScreenSave.ts:4`, `AppStateHandler.tsx:29`, `app/(form)/_layout.tsx:15`,
`completion.tsx:8`). The phone computes save status and shows it to nobody.

So there was no copy, placement, or colour to lift, and the demo's line is an **original** held
to the honesty rule rather than to parity: it reports the per-tab sessionStorage snapshot and
never implies the phone's device persistence. Anyone re-reading row 80 later should not go
looking for the phone widget it seems to promise.

### 59b. REFUTATION — the app-version chrome was already there; what was missing was honesty

Row 80 also lists "app-version chrome" as missing. The drawer footer has rendered
`DVR Extraction Notes` + `v1.0.0` since the original prototype port (visible in `2da3e3d`,
pre-P0). The real defect was subtler and is what P4.2 fixed: a bare `v1.0.0` inside a browser
demo reads as a build of the app. It now reads `Interactive demo · v1.0.0`, with the version
still the app's own (phone `app.config.js:11` — the same value the phone footer renders through
`Constants.expoConfig?.version`), as a literal because the demo is a separate deployable with no
Expo config to ask.

### 59c. Collapsed sub-rows are UNMOUNTED, not clipped — deliberate divergence

The phone animates a container height and keeps the three rows mounted behind it, which forces
three extra props to stop a hidden row being focusable or announced: `pointerEvents={'none'}`,
`accessibilityElementsHidden`, `importantForAccessibility={'no-hide-descendants'}`
(`CustomDrawerContent.tsx:304-309`). The demo renders them only while expanded, which achieves
all three by construction — and on the web the phone's arrangement would be an a11y **defect**
(`aria-hidden` over focusable buttons), not a fix. Consequence: the expand animates and the
collapse is immediate, matching the demo's dominant one-way idiom (`ModalShell`'s `screenIn`),
and keeping the component tests synchronous — no `waitFor` on an exit animation.
**Trigger:** if a reviewer wants a symmetric collapse, it is an `AnimatePresence` wrap plus
`waitFor` in two arms — and it should be weighed against the contention-flake budget the
5000ms `asyncUtilTimeout` in `vitest.setup.ts` exists to absorb.

### 59d. The status line is sampled per drawer-open, not ticked

`saveStatus` is computed when `drawerOpen` flips true (after a `flush()`, so a write inside its
250 ms debounce lands first) and cleared on close. It does not tick while the drawer sits open,
so a menu left open for two minutes still reads "just now". Judged not worth an interval: the
drawer is a transient overlay, the reading is correct at the moment it is asked for, and every
alternative (interval, or reading at render) either adds a timer to a component test suite or
breaks the "no clock at render scope" rule.
**Trigger:** if the drawer ever becomes a persistent surface (a pinned sidebar at desktop
widths), the line needs a tick or it becomes a stale claim.

### 59e. No `MODAL_NARRATION` entry for `mediaLibrary`

Every other modal id has rail narration; the media library deliberately does not, so the rail
keeps showing the chapter the visitor is on. `narration`'s `?? ` fallback is documented for
exactly this case ("guards a modal with no narration entry — falls back to the chapter rather
than blanking"). Writing narration for a sheet whose body is an honest placeholder would be
narrating a fast-follow.
**Trigger:** P4.5, in the same commit that replaces the sheet's body.

### 59f. The two capture rows are ungated, matching the phone's failure mode

The phone hides `Capture Media`/`Record Audio` behind `useStepVisible('media-capture')` /
`useStepVisible('audio-recording')` — form-customization step visibility. The demo has no
analog to gate on: both targets are `LaunchableId`s, not wizard screens, so they never appear in
a profile's step list (`selectDrawerItems` filters wizard screens only). Both rows therefore
always render. Note also that neither is gated on an open location, on the phone or here — only
`Media Library` is (and that gate IS ported, toast copy and drawer-stays-open behaviour included).
**Trigger:** if form-customization profiles ever gain launchable visibility, this is where it
lands.

### 59g. `DrawerItem.icon` is still dead

`DrawerItem` has carried an unused `icon?: ReactNode` since the port — the step rows render the
active bar, the label and the dot, never an icon. P4.2 did not use it (the accordion's icons are
internal to the accordion, not per-item data) and did not remove it, to keep this package's diff
off the settled dots/items code.
**Trigger:** the next package that touches `DrawerItem`'s shape — delete it there, or wire the
step rows to it if the phone's per-item Ionicons are ever wanted.

### 59h. The bridge's absent-handle fallback is unpinned, deliberately

`describeSaveStatus(handle?.saveState() ?? { kind: 'unavailable' }, …)` mirrors `saveProgress`'s
`persistenceRef.current?.isLive() ?? false` (R-2's never-assume rule). It has no test:
`persistDemoStore` returns a non-nullable handle and the effect that sets the ref commits before
any interaction, so the only way to exercise the branch is to make the module mock return
something the real module's type forbids — a test of the mock. Recorded rather than faked.

## 60. P4.3 (parity/p4-photovideo) — the photo/video capture screen: adaptations, refutations & residuals

**Source:** P4.3 photo/video capture (plan §5 P4.3, matrix rows 49–55; ui-mapping 09; phone
`src/features/media/video-image-capture/`). Screen in
`features/demo/ui/screens/MediaCaptureScreen.tsx`, bridge arm + `saveCapturedMedia` in
`ui/DemoExperience.tsx`, two engine additions in `engine/logic/media/`.

### 60a. The `unavailable` copy lives in `CAPTURE_PERMISSION_COPY`, not `captureFailureMessage`

The brief named `captureFailureMessage` as "the single copy site — extend there, not inline".
It was not extended, and this is why: that function is `(code: CaptureErrorCode, facility) =>
string`, a taxonomy of **attempts that went wrong**, and every one of its sentences ends in the
past tense ("nothing was captured"). `unavailable` is not an attempt — it is the standing state
a visitor meets before pressing anything, and the screen renders it as a headline + body pair,
which is the shape `CAPTURE_PERMISSION_COPY` already holds for `prompt` and `denied`. Adding a
fourth arm to the error function would have meant inventing an error code with no producer.

So: `unavailableBody` joined `body`/`deniedBody` in the same frozen record, one file away, and
the headline over it IS `captureFailureMessage('NO_DEVICE', 'camera')` — the phone's verbatim
"No camera device available". Both copy sites stayed single; neither string is inline in the
screen. Pinned by `permissions.test.ts` (never the denied sentence, never "site settings",
always names the bundled sample; and no body anywhere mentions device settings — §58b).

**Note for the orchestrator:** `unavailableBody` was added for BOTH facilities, so P4.6 can
consume the microphone one without touching `permissions.ts`. If P4.6 added its own, that file
is a textual conflict at merge — take one copy of the key, not two.

### 60b. INTERIM — the accept path saves a default filename and an empty caption (P4.4's seam)

P4.4 owns `MetadataForm`. Until it lands, `onAccept` calls the new pure
`defaultCaptureBasename(captured)` (derived from the capture's own `capturedAt`, so the demo's
no-`Date.now()` rule holds) and passes `caption: ''`. The insertion point is marked in source
with a grep-able `// SEAM(P4.4): MetadataForm inserts between review-accept and addMedia` in
`MediaCaptureScreen.onAccept`; the review stage already shows the visitor the resolved
"Saving as `<name>.<ext>`" line, which is the slot the form replaces.

Two consequences P4.4 inherits: `SAMPLE_MEDIA[kind].suggestedFilename` still has zero callers
(it is the sample's pre-fill, and there is nothing to pre-fill yet), and two captures inside the
same second produce the same base — deliberate, since the phone enforces no filename uniqueness
either and `MediaItem.id` is what identifies a row.
**Trigger:** P4.4 — replace the filename line with the form, keep `mediaFilename` as the only
extension author (§58c), and leave the boolean contract of `onSave` alone (see 60c).

### 60c. `onSave` returns a boolean because the object-URL hand-off depends on the answer

`MediaCaptureScreen.onAccept` calls `handOff()` **only** when the bridge reports the store took
the item. This is not defensive style — it is the §58 carry-rule made conditional: a refused
save must leave the `blob:` URL owned by the capture hook so the unmount sweep frees it, and an
accepted one must release it or the saved photo blanks. Both directions are pinned with mutation
probes in `MediaCaptureScreen.test.tsx` ("hands the URL off…" fails if the call is deleted;
"KEEPS the capture when the bridge refuses it" and "still revokes…" fail if it is made
unconditional). A future refactor that makes `onSave` `void` silently reintroduces one of the
two bugs.

### 60d. The phone's two-row permission grant became ONE control — deliberate

`PermissionsView` lists Camera and Microphone with independent status icons and independent
`Grant` buttons, because they are two OS permissions. A browser answers for both in a single
`getUserMedia` prompt; rendering two buttons where only one request exists would be a control
the page cannot honour, and a "Microphone: ✕" row on a machine that simply has no mic would be
reporting a refusal that never happened. One row, one prompt — and the microphone half is
reported **after** the fact by `audioDegraded`, which video mode surfaces as "the take will be
silent" (§58e). Headline and description are still the phone's verbatim.

### 60e. Flip camera → a device cycle button, hidden when there is nothing to cycle to

The phone flips a fixed `back`/`front` pair; a browser has an open-ended `enumerateDevices()`
list, which is why P4.1's `devices.ts` calls the analog a picker. The screen renders a single
`Switch camera` control in the phone's flip slot that advances to the next device and captions
the live one — the phone's affordance, over the browser's data model. It is **absent** when
`devices.length < 2`, following `toCaptureDevices`' own reasoning: a control that provably
cannot change anything is the UI version of a fake success. Disabled while recording, as the
phone's flip is.

`deviceFailure` is rendered as its own line, distinct from `failure` — P4.1 kept "the list could
not be read" apart from "there are none" precisely so the absence of a picker could be
explained rather than just happen.

### 60f. Stop is gated on the shared 500 ms `canStop`, which the phone's VIDEO path does not have

`canStopAtElapsed` is documented as the phone's AUDIO recorder gate (ui-mapping 10);
`VisionCameraScreen`'s video Stop is always live. The demo applies it to video anyway. Reason: a
browser `MediaRecorder` stopped before its first `dataavailable` assembles **zero bytes**, which
P4.1 correctly reports as `RECORDING_FAILED` — so the ungated button's only effect in that window
is to hand the visitor an error they could not have avoided. Mutation-probed ("refuses Stop until
the take can produce bytes").

**AMENDED (review R-9, P4 round 1).** This entry originally read "the shutter renders disabled
for that sub-second window", which described the first implementation: a native `disabled`
attribute. That was wrong on its own terms — a `disabled` applied to the control the visitor JUST
pressed drops focus to `<body>` and re-enables 500 ms later with focus lost, so the gate refused
silently and unfocusably. The shutter now uses the house idiom (`aria-disabled` + guarded handler
in `onShutter` + a `role="status"` reason line, `aria-describedby`-linked), matching
`AudioRecorderScreen`'s two stop affordances. The DECISION recorded above (gate video Stop at
500 ms) is unchanged; only the mechanism was wrong. §61b's claim that the demo gates "using the
established `aria-disabled` + guarded-handler + `role='status'` reason idiom" was accurate for the
audio surface and is now accurate for this one too — no amendment needed there.
The same pass converted this file's other native-`disabled` site, the permission stage's Grant
button (`disabled={isOpening}`, which spanned the whole browser permission prompt).
**Trigger:** if a reviewer wants phone-exact behaviour, the honest alternative is a `timeslice`
argument to `MediaRecorder.start()` small enough to guarantee a chunk — that changes P4.1's
`startStreamRecording`, not this screen.

### 60g. The shutter's accessible name changes on the sample path — deliberately not "Take photo"

On `unavailable` the button attaches a bundled file. It is labelled `Attach sample photo` /
`Attach sample clip`, not the phone's `Take photo` / `Start recording`, and a test asserts the
phone strings are absent in that state. A control named for a capability the page does not have
is precisely the fake success the honesty rule forbids — the same judgment the OCR screen made
with "Use sample DVR clock". The phone's names are used verbatim wherever the capture is real.

### 60h. No torch/flash control — deliberate non-port

The phone's top row carries a torch toggle (`torch-toggle`, `Turn flash on`/`off`). The web
equivalent is `MediaStreamTrack.applyConstraints({ advanced: [{ torch: true }] })`, which exists
on Chrome for Android and essentially nowhere else — and it is not in P4.1's capability layer.
A permanently-inert flash button would be a claim the demo cannot back. Omitted rather than
faked; the top row carries only Close.
**Trigger:** if the demo ever targets mobile Chrome as a first-class surface, add it behind a
capability probe in `useCaptureStream` (torch is a track *capability*, so it belongs beside
`hasAudio`), never as an unconditional button.

### 60i. No `isSaving` state, and no focus-reset effect — both are structurally absent, not skipped

The phone threads `isSaving` from the route wrapper to disable both preview buttons and spin the
primary one, because its save is an async SQLite write. The demo's save is a synchronous store
write inside the click handler; there is no in-flight window to render, and a spinner over a
zero-duration operation would be theatre. Likewise `MediaCaptureFlow`'s `useIsFocused` effect
(reset `flowState` to `'camera'` on blur) has no counterpart: `closeLaunch` unmounts this screen,
so its state resets by construction and the pending capture's URL is revoked on the way out.
**Trigger:** P5/P6 if media ever gains an async persistence path (an upload, an IndexedDB write)
— then `onSave` becomes a promise and both of these come back.

### 60j. Recording badge reuses the existing `blinkDot` keyframe instead of a phone-exact pulse

The phone's dot animates opacity 1 ⇄ 0.3 on a 500 ms/500 ms loop. `demo.css`'s existing
`blinkDot` runs 0.15 ⇄ 1; the badge uses it at `1s ease-in-out infinite`, gated by
`useReducedMotion`. A new keyframe would have been three lines, but `demo.css` is a single
shared file and **P4.6 (audio recorder) is landing in parallel** — a keyframe added on both
branches is a merge conflict in the one file the repo's conventions say not to churn. The
difference is a slightly darker trough on a 12 px dot.
**Trigger:** the package that next has `demo.css` to itself — add `recordPulse` (1 ⇄ 0.3) and
point both recording indicators at it.

### 60k. REFUTATION — `MODAL_NARRATION.ocr` is unreachable, and a test pins it anyway

Found while deciding whether `mediaCapture` needed rail narration (it does not — §59e's
precedent: the rail stays on the anchor chapter). `MODAL_NARRATION` is typed
`Partial<Record<ModalId | LaunchableId, ChapterNarration>>` and carries a full `ocr` entry, but
the only read is `(modal && MODAL_NARRATION[modal])` in `DemoExperience.tsx` — keyed by `modal`,
which is `ModalId | null`. `'ocr'` is a `LaunchableId`, never a `ModalId`, so the entry can
never be selected: while the OCR screen is open the rail shows `NARRATION[currentChapter]`
(Time Offset). `content.test.ts`'s "has modal/launch-screen copy for every modal the bridge can
open, plus ocr" therefore asserts the existence of copy no visitor can reach.

Not fixed here: it is OCR/rail territory (P2.2/P4.7), the fix is a one-line anchor change
(`(modal && MODAL_NARRATION[modal]) ?? MODAL_NARRATION[view] ?? …`) with a narration decision
attached, and doing it from a media package would put an untested rail change in a diff nobody
would look for it in.
**Trigger:** P4.7, which owns the OCR camera step — either wire the anchor to `view` for
launchables (and then decide whether the two media screens want entries), or delete the `ocr`
entry and its test clause.

**✅ RESOLVED (P4.7):** the anchor is now modal → launchable view → map → chapter
(`DemoExperience.tsx`, via the new `isLaunchableId` guard in `content/screens.ts`), matching
the manifest anchor in `selectExploreStatus`. The `ocr` entry renders while the OCR screen is
open; the two media launchables deliberately keep NO entries (§59e — their rail stays on the
anchor chapter), pinned by the §59e fallthrough test in `DemoExperience.ocr.test.tsx`.

### 60l. `MediaItem` and the snapshot version are untouched

Recorded because §58i asks for it explicitly. P4.3 adds no field to `MediaItem`, `DemoLocation`
or any persisted shape — `buildMediaItem` was already the construction site and the bridge just
calls it — so `SNAPSHOT_VERSION` stays at 6 and the three compile-time guard devices did not
move. A saved capture round-trips through `snapshotOf` exactly as §58i describes: the `blob:`
URL is stripped and the restored row renders `MEDIA_EXPIRED_NOTICE`. Sample captures keep their
`/demo-media` URLs and survive a refresh intact.

## 61. P4.6 (parity/p4-audio) — the audio recorder: decisions, deviations, refutations & residuals

**Source:** P4.6 audio recording (plan §5 P4.6; matrix rows 67-69; ui-mapping `10-audio.md`;
phone `src/features/media/audio-recording/`). Engine metering in
`features/demo/engine/logic/media/audio-levels.ts`, Web Audio I/O in
`features/demo/ui/inputs/audio-analyser.ts` + `useAudioAnalyser.ts`, screens in
`features/demo/ui/screens/Audio{RecorderScreen,PreviewScreen,RecordingFlow}.tsx`, bridge arm in
`DemoExperience.tsx`.

### 61a. DECISION — the `<audio>` preview does NOT auto-reset on finish

The plan asked P4.6 to decide this deliberately rather than inherit it. Decision: **no
auto-reset, and the phone's replay guard ported verbatim.** Three reasons, in order of weight:

1. **A finished take should still read as finished.** The bar sitting full is information — "you
   have heard all of this". Snapping it to zero makes a played clip look untouched, which is a
   worse lie than the one the reset would be fixing.
2. **`HTMLMediaElement` already behaves this way.** `ended` leaves `currentTime` at the duration,
   so auto-resetting would be the DEVIATION here, not the parity. The phone's non-reset being an
   `expo-audio` quirk does not make the same behaviour a quirk in a browser — it is the platform
   default on both, arrived at independently.
3. **The part that actually matters is ported.** `AudioPreview.tsx:106-109` seeks to 0 when the
   head is within 0.1s of the end, so pressing Play at the end replays instead of doing nothing.
   That is a behaviour, not a quirk, and it is what keeps the control from ever being dead.

Four tests pin it (`AudioPreviewScreen.test.tsx` § the auto-reset decision): no rewind on
`ended`, rewind on the next press, the 0.1s tolerance honoured, and no rewind from mid-take.
**Trigger:** none — this is a settled decision, not a deferral. Re-open only if the phone
changes deliberately (not if it changes libraries).

### 61b. DEVIATION — the 500ms Stop gate binds BOTH stop controls

The phone gates only the Stop pill (`RecorderScreen.tsx:314`) and never passes `disabled` to the
big record/stop button; its own ui-mapping records the guard as "currently inert" for that
control (`10-audio.md:62`, `:70`). A sub-500ms take can therefore leave by the other door, where
`stopRecording()` returns nothing and the visitor gets a "Failed to save recording" toast.

The demo gates both, using the established `aria-disabled` + guarded-handler + `role="status"`
reason idiom (§44b / R-15) so the refused control stays focusable and announces why. Not
replicating a bug is the same call P4.5 was given for the phone's missing-`onDismiss` (D-B6).
**Phone-side follow-up (NOT actioned — this repo is read-only for the parity effort):** worth a
`BUG-NNN` on the phone, severity low: the guard exists and one path ignores it.

### 61c. DEVIATION — the format row prints what is true, and the bitrate cell is gone

The phone's `TimerCard` bottom row reads `44.1kHz / AAC`, a wall clock, and `MONO / 128k`, all
derived from `AUDIO_CAPTURE_SETTINGS` — figures the phone CHOSE, so printing them is truthful
there. The demo chooses none of them: the browser picks the container, and the rate and channel
count come off the opened track. So the row reads `{sampleRate} / {channels}` · clock ·
`{codec}`, each `null` rendering as an em dash, and the **bitrate cell has no honest
counterpart at all** — `MediaRecorder` does not report the bitrate it settled on, and P4.1's
`startStreamRecording` does not set one. The codec occupies that cell instead.

`readAudioTrackFormat` deliberately returns `null` for whatever a browser omits (Firefox states
`channelCount` but not `sampleRate`) rather than defaulting: 44.1kHz printed beside a recording
this browser made would be one device's constant presented as another's fact.
**Trigger:** if P7.1's Settings shell ever grows a Media pane (§58h), an explicitly-set
`audioBitsPerSecond` would make a real bitrate available — add the cell back then, not before.

### 61d. DEVIATION — the glass pills are named by their visible text

The phone gives the Stop pill `accessibilityLabel="Stop recording"` — byte-identical to the big
button's — leaving two controls on one screen indistinguishable to a screen reader. The demo's
pills are named `Pause` / `Resume` / `Stop` (their visible text, which is also the stronger web
convention, WCAG 2.5.3); the big button keeps the phone's `Start recording` / `Stop recording`
verbatim.

### 61e. DEVIATION — a denied microphone offers a retry; the phone's view has none

`RecorderScreen.tsx:214-236` offers only Cancel, correctly: once iOS has recorded a refusal it
will not prompt again, so a retry button could not work. In a browser the site permission is one
click away in the address bar, so `Try again` (calling `open()` again) is a real affordance
rather than a dead control. The headline is the phone's verbatim; the body is §58b's
browser-corrected remedy.

### 61f. REFUTATION — `captureFailureMessage` did not need extending for the denied view

The brief instructed P4.6 to "extend `captureFailureMessage` — the single copy site — not inline
strings" for the permission-denied view. `captureFailureMessage` is the FAILURE-notice site, and
it already covers `PERMISSION_DENIED`. The permission SCREEN's copy has its own single site,
which P4.1 also built: `CAPTURE_PERMISSION_COPY.microphone` (`permissions.ts:130-144`), carrying
`title` / `body` / `deniedBody`. The screen consumes those as props from the flow, so no copy is
inlined and nothing needed extending. One string WAS added, and to the same layer rather than to
a component: `NO_RECORDER_NOTICE` in `samples.ts`, keyed by facility so P4.3 can reuse it.

### 61g. The microphone is released at stop, not held through review

A browser shows a live recording indicator for as long as a track is open. Leaving the stream up
through the review screen would say the microphone is still listening when it is not, so the
flow calls `close()` once a take is assembled and `open()` again on Record Again (no second
prompt — the page already holds the grant). A FAILED stop deliberately keeps the stream: the
visitor is still on the recorder and that is exactly what they need to retry.

**Correction (review R-12).** This paragraph originally ended "Both directions are pinned in
`AudioRecordingFlow.test.tsx`" — which was **false when written**. Only the release-on-success
direction had a test; the zero-byte arm asserted the failure alert and the absence of the review
screen, both of which survive a `close()` made unconditional. The tests lane proved it (23/23
green under that mutation). The arm now carries the two assertions that actually pin it —
`track.stop` not called, and the live `Start recording` button still present, since an
unconditional close drops `mode` to `'offer'` and replaces the recorder with "Enable
microphone", taking the retry affordance away at the moment it is needed. **Reusable lesson,
which is why this stays as a correction rather than a silent edit:** "both directions are
pinned" is a claim about tests, and the only way to earn it is to run the mutation, not to read
the arm and see the words in it.

Consequence worth knowing: entering the recorder opens the microphone immediately (phone parity,
`RecorderScreen.tsx:112-116`), so a visitor who never presses Record still sees their browser's
mic indicator. Judged correct — they pressed "Record Audio" to get here, and it is what makes
the idle waveform real rather than decorative.

### 61h. A suspended `AudioContext` degrades to "NO LIVE INPUT", never to flat bars

An `AudioContext` constructed outside a user gesture starts suspended and fills its analysis
buffers with zeros. Flat bars over a live recording would read as "the microphone heard
silence" — a false statement about the take. `AnalyserHandle.running()` reports whether the
graph is processing, `useAudioAnalyser` re-checks it every tick (a backgrounded tab can suspend
one after the fact), and any un-live path returns the single frozen `RESTING_METER`, which the
panel labels. The dB cell is withheld rather than showing `-inf dB`, which would be a
measurement.
**Trigger:** if device testing shows the resume-on-sticky-activation attempt failing in a real
browser family, the fix is a gesture-scoped `resume()` on the first Record press — not removing
the `running()` check.

### 61i. RESIDUAL — the accept path has no MetadataForm (P4.4 owns it)

INTERIM, disclosed: Save writes `{ filename: <default base>, caption: '' }` with no form. Three
grep-able `SEAM(P4.4)` markers bracket the insertion point — `AudioPreviewScreen.tsx` (between
the player card and the action row, the phone's content order), `AudioRecordingFlow.tsx`
(`handleSave`, where the form's value replaces the synthesized object), and `DemoExperience.tsx`
(`saveAudioNote`'s `meta` parameter and the `defaultFilenameBase` prop). The base name is
`audio-note-{n}` off the location's existing audio count, and a SAMPLE take is renamed to the
bundled asset's own `sample-note` so a library row cannot read like something the visitor
recorded. `Save Audio` is currently **ungated**; P4.4 restores the phone's
filename-validity gate along with the form.
**Trigger:** P4.4, in the commit that mounts the form.

### 61j. RESIDUAL — the spectrum's displayed band is a constant, not a setting

`SPECTRUM_BIN_FRACTION = 0.25` shows the bottom quarter of the analyser's range (~6kHz at 48k)
because a voice note puts effectively all of its energy there and the full range would leave
three quarters of the bars flat at all times. This is a choice of WHICH real bins to display,
never a rescaling of what they say — but it is a constant nobody can see or change.
**Trigger:** only if a reviewer looking at a real recording finds the band wrong for the
content; it is a one-line change with its own test.

### 61k. RESIDUAL — the wall-clock cell is blank for one frame

The clock seam may not be read at render scope (features/demo/CLAUDE.md), so `timeOfDay` is
filled by an effect and the cell is empty on the very first paint. A lazy `useState` initialiser
would fix it and would also be a render-scope clock read. Left as is.

### 61l. The 1-hour auto-stop explains itself in-screen rather than as a toast

The phone fires an info toast (`RecorderScreen.tsx:186-190`). The demo shows the same words as a
`role="status"` line, carried onto whichever screen the visitor ends up on — because the
auto-stop also MOVES them to review, and a screen that changes by itself with no explanation is
a silent event. Both screens therefore take a `notice` prop; it is neutral-styled, never the red
failure treatment.

## 62. P4.4 (parity/p4-metadata) — the shared MetadataForm: refutations, deviations & residuals

**Source:** P4.4 MetadataForm + wiring (plan §5 P4.4; matrix row 56; ui-mapping `09-media.md`
§ MetadataForm and `10-audio.md:139`; phone `src/features/media/shared/components/MetadataForm.tsx`
and its two call sites). Component in `features/demo/ui/inputs/MetadataForm.tsx`, the pre-fill
rule in `engine/logic/media/samples.ts`, the two callers in `ui/screens/MediaCaptureScreen.tsx`
(`ReviewStage`) and `ui/screens/AudioPreviewScreen.tsx`.

### 62a. REFUTATION — the plan's `{user}.jpg/.mp4/.m4a` means user-TYPED, not the analyst profile

The plan row and the brief both raised the possibility that the phone's filename convention is
derived from the User Profile, which would have made P4.4 depend on P7.2. It does not. The phone's
form opens **empty** — `useState<MetadataFormValue>({ filename: '', caption: '' })` at
`PhotoPreview.tsx:57-60` and `AudioPreview.tsx:92-95` — and the extension is appended by the route
wrapper from the visitor's own text: `` const filename = `${result.userFilename}.${extension}` ``
(`app/(form)/media-capture.tsx:133-134`) and `` `${result.userFilename}.m4a` ``
(`app/(form)/audio-recording.tsx:128`). `userFilename` is `metadata.filename` straight off the form
(`MediaCaptureFlow.tsx:160`, `AudioRecordingFlow.tsx:114`); no profile field is read anywhere on
the path. `{user}` is the user's typing.

**Consequence:** there is NO P7 hook to file here and nothing to un-defer. The demo's defaults are
not standing in for an identity the demo lacks — they are a convenience the phone does not offer
(see 62c).

### 62b. REFUTATION — `SAMPLE_MEDIA[kind].suggestedFilename` was not uncalled

The brief described it as "currently uncalled and intended as the sample's pre-fill". Half right:
it was already called, at `AudioRecordingFlow.tsx:245` (pre-P4.4), through a flow-local
`sampleAwareBase` that P4.6 added for audio only. P4.4 lifted that function into the engine as
`suggestedFilenameBase` and generalised it over all three kinds, so the flow's copy is gone and
photo/video now get the treatment audio already had.

### 62c. DEVIATION — the filename field is PRE-FILLED; the phone's opens empty

The phone requires the analyst to type a name from nothing, with Save grey until they do. The demo
opens the field with a real value and lets them change it:

- a live camera capture → `defaultCaptureBasename` (its OWN timestamp, e.g. `photo-20260730-140506`);
- a live audio take → the bridge's location-scoped `audio-note-{n}`;
- ANY sample take → the bundled asset's own name (`sample-photo` / `sample-clip` / `sample-note`).

Reasoning: the phone's user is a trained analyst working a scene inside a workflow that expects
them to name evidence; the demo's is a stranger evaluating a product, and a grey button over an
empty required field with no starting point reads as a broken demo rather than as discipline.
Every value offered is honest — a real timestamp or the real name of a real bundled file — so the
pre-fill states a fact rather than inventing one.

The gate itself is **ported, not softened**: clearing the field disables Save exactly as the phone
does, and both capture suites pin that path.

### 62d. DEVIATION — `onValidChange` is not ported; validity is derived at the point of use

The phone pushes validity out of the form through a mount effect
(`MetadataForm.tsx:64-68`) because the rule lives inside the component. In the demo the rule is
already a pure engine predicate — `isValidFilename` (`captured.ts:63`) — which P4.1 wrote and which
`mediaFilename` also depends on. So a parent gates its own Save button by CALLING it, and the form
exposes no validity channel at all.

One fact derived where it is needed beats a second copy kept in sync by an effect, and it removes
the phone's own hazard, which its README records as pitfall #2: a consumer that forgets to wire
`onValidChange` never learns the filename is empty. A caller here cannot forget, because there is
nothing to wire — it either calls the predicate or it does not gate.
**Trigger:** none. Re-open only if a third caller genuinely cannot reach the predicate.

### 62e. DEVIATION — an unsaveable filename says why; the phone's is silent

`MetadataForm` never passes its `TextInput`'s `error` prop, so on the phone an empty filename
renders no message whatsoever and the Save button is simply grey — ui-mapping 09:268 calls this out
explicitly as a deliberate observation, not an oversight in the mapping. The demo uses that same
mechanism the phone has and declines to use: the field reddens, `aria-invalid` is set, and the
helper line is replaced by a `role="alert"` reason (`FILENAME_REQUIRED_MESSAGE`).

The Save control itself uses the house `aria-disabled` + guarded-handler shape (§44b / R-15 /
§61b) rather than a truly `disabled` button, so it stays focusable and reachable; the reason is on
screen immediately above it, which is why no separate `role="status"` line was added.

### 62f. The "Saving as" line moved INTO the form

P4.3 and P4.6 each rendered the resolved filename their own way — a bordered card reading "Saving
as" over a mono line (`MediaCaptureScreen`) and an inline "Saves as `<name>`" (`AudioPreviewScreen`).
Both are now the form's optional `savingAs` prop, one spelling, updating live as the visitor types.
It **hides while the name is invalid** rather than rendering a bare `.jpg` as though that were a
file the visitor would get (mutation-probed).

The caller resolves the string (`mediaFilename(value.filename, captured)`) instead of the form
taking a `CapturedMedia`, deliberately: P4.5's library caller will be editing an item that was
saved a while ago and has no capture object to hand.

### 62g. `Field` gained `maxLength` and `autoCorrect`

Two additive optional props on the shared chrome (`ui/screens/_shared.tsx`), because the phone's
`TextInput` has both behaviours and re-rolling an input would have violated the "reuse `_shared`"
rule:

- `maxLength` — the phone's own prop (100 / 500 here). A refused keystroke, not a validation state.
- `autoCorrect={false}` — turns `autocorrect`, `autocapitalize` and `spellcheck` off TOGETHER,
  because they are one decision (does this field hold prose, or a machine-facing value?) and
  leaving any of the three on re-introduces the same class of problem. The phone spells it
  `autoCapitalize="none"` + `autoCorrect={false}` (`MetadataForm.tsx:99-100`); the demo's import
  paste step already spelled it with all three (`import/PasteStage.tsx:71-73`).

### 62h. RESIDUAL — no filename-uniqueness check, on purpose

Two captures can be saved under the same name, and two captures inside the same second even
pre-fill with the same one. The phone enforces no uniqueness either — an analyst is free to save
two `front door` photos — and `MediaItem.id`, not the filename, is what identifies a row
(`captured.ts:90-93` already recorded this for the default).
**Trigger:** only if P4.5's library list shows the ambiguity is genuinely confusing in a column of
identical names; the fix would be a suffix on the PRE-FILL, never a refusal to save.

### 62i. RESIDUAL — both caps refuse silently at the boundary

Typing past 100 filename characters or 500 caption characters does nothing at all — no counter, no
message. That is the phone's behaviour (`maxLength` on both fields, no character count anywhere)
and it is why the form has exactly one error message: an over-length name is impossible rather
than invalid, so there is no second state to describe.
**Trigger:** if a reviewer wants a character counter it belongs on `Field` (shared chrome) and
should land with the caption cap's first real user, not here.

### 62j. NOTE for P4.5 — the form's contract, so the third caller does not re-derive it

```ts
interface MetadataFormValue { filename: string; caption: string }   // filename = BASE, no extension
interface MetadataFormProps {
  value: MetadataFormValue
  onChange(value: MetadataFormValue): void
  mediaType: MediaKind          // drives placeholder + helper copy ONLY
  savingAs?: string             // resolved filename to display; omit and the line is not rendered
}
```

- Controlled — the caller owns the state, and should own it in a component that **remounts per
  item**, which is how both current callers guarantee a discarded take's name cannot leak onto the
  next one.
- Validity: call `isValidFilename(value.filename)` from `@/features/demo/engine/logic/media`
  (trimmed 1–100). The form reports nothing; it only renders the reason.
- Sanitization is the form's, on every keystroke — the illegal set never reaches `value`.
- Never append an extension. `mediaFilename` / `buildMediaItem` are the only extension authors
  (§58c).

---

## 63. P4.5 (parity/p4-library) — the media library: refutations, deviations & residuals

**Source:** P4.5 media library (plan §5 P4.5; matrix rows 57–66; ui-mapping `09-media.md`
§§ Media Library Sheet → Delete Media; phone `src/features/media/media-library/`). Engine core in
`features/demo/engine/logic/media/library.ts`, the sheet in
`features/demo/ui/screens/MediaLibrarySheet.tsx`, the delete bridge in `ui/DemoExperience.tsx`
(`deleteMediaItem`).

### 63a. REFUTATION — the phone's library does NOT edit metadata, so P4.4's form has no third caller

The brief asked P4.5 to verify whether the library edits metadata, since it would then be
`MetadataForm`'s third caller. It does not, and the phone is unambiguous about it in three
independent places:

- `MediaItemInfo` is display-only — every field is a bare `<Text>`, there is no input, no
  `onChange`, no save (`MediaItemInfo.tsx:88-147`). Its ui-mapping surface entry says so in as
  many words: "**Inputs / Buttons** — None — display-only panel" (`09-media.md:513`).
- `MediaPreview`'s whole prop surface is `{ media, onFullscreen, onClose }`
  (`MediaPreview.tsx:239`) — no change callback exists to thread edits back through.
- `grep -rn "MetadataForm\|updateMedia\|editMetadata" src/features/media/media-library/` returns
  **nothing**. The form's only callers are the two capture-side previews (`PhotoPreview`,
  `VideoPreview`) plus the audio preview, all outside `media-library/`.

**Consequence:** the demo's library likewise displays and never edits, and a test pins the absence
(`queryByRole('textbox')` inside the info panel). §62j's contract note stands unused by this
package — correctly.
**Trigger:** if the owner ever wants rename-in-library as a demo-better divergence, `MetadataForm`
is ready for it (controlled, remount-per-item) and the store needs one new `updateMedia` writer.

### 63b. DEVIATION — the phone's category badge slot carries `Sample` here

The phone's row and info-panel badge is an `ImageCategory` (`DVR` / `Crop` / `Camera`, from
`CATEGORY_BADGES`, `constants.ts:63-69`). `MediaItem` in the demo has no `category` — nothing in
the demo's capture flows ever assigns one, and the type is off-limits to this package — so there is
no value to port. The slot instead carries `Sample`, which is the fact a visitor here actually
needs: whether the bytes came from hardware or from a bundled asset. It is the same badge the two
capture screens already show, so a sample is labelled everywhere it appears rather than only where
it was made.
**Trigger:** if a future package adds `category` to `MediaItem` (it would need a capture-side
picker to set it), port `CATEGORY_BADGES` into `library.ts` and render both badges.

### 63c. DEVIATION — the row meta line is `duration · date`, not the phone's `size · date`

`MediaItem` carries no `sizeBytes`. `CapturedMedia` has one, but `buildMediaItem` deliberately
does not copy it (`captured.ts:116-135`), and the sample assets never had one to begin with
(`samples.ts:127` — "the demo has not measured these files at runtime"). Constraint: `MediaItem`
and `SNAPSHOT_VERSION` are off-limits to this package. So the row shows what it can stand behind:
duration for the timed kinds, the capture date for all three. Inventing or estimating a byte count
is exactly the class of lie this app exists to prevent.
**Trigger:** if a package that may touch `MediaItem` adds `sizeBytes` (bumping `SNAPSHOT_VERSION`),
add `formatFileSize(item.sizeBytes)` to the row's meta line and to `MediaItemInfo`'s, restoring the
phone's `size · date` exactly — the formatter is already in `engine/logic/media/recording.ts`.

### 63d. DECISION — zone-1 playback uses the browser's native `<video>` / `<audio>` controls

The phone's inline preview hand-rolls a play/pause button, a seekable bar and elapsed/total times
for audio (`MediaPreview.tsx:121-235`) and uses `VideoView`'s `nativeControls` for video. On the
web a native `controls` attribute IS that transport — play/pause, scrub, times, keyboard operation
and screen-reader announcement, none of it re-implemented. It is also already this codebase's
treatment for video playback (`MediaCaptureScreen`'s `ReviewStage`, `<video ... controls />`).

The alternative was a second copy of P4.6's `AudioPreviewScreen` player (72px button + range input
+ time row). That is the shape of mistake §57a exists to remember: `useLongPress` shipped three
times at three paths before anyone noticed. A second bespoke transport, entangled with a different
item type, would be the same trap in miniature.
**Trigger:** if a package extracts P4.6's player into a shared `ui/primitives` scrubber, this panel
is its natural second caller — swap it in then, not before.

### 63e. RESIDUAL — Escape inside the sheet closes the SHEET, not just the overlay above it

`ModalShell` registers a document-level Escape listener on mount (`_shared.tsx:61-67`). While the
delete confirmation or the fullscreen layer is up, Escape therefore dismisses that overlay *and*
closes the whole sheet. This is pre-existing shared-chrome behaviour and it is not fixable from a
call site: `AlertDialog`'s own listener is registered later, and a later document-level listener
cannot suppress an earlier one. `NewCaseModal` has exactly the same shape (an `AlertDialog` inside
a `ModalShell`, `NewCaseModal.tsx:301`) and behaves the same way — there, with a filled-in form
behind it, the cost is higher than it is here, where the worst outcome is a cancelled delete and a
closed library.
**Trigger:** fix in `ModalShell` when the alert-inside-shell pattern gets a third caller — an
opt-out prop (`escapeEnabled`) or a shared "topmost overlay owns Escape" register, applied to
`NewCaseModal` and this sheet together.

### 63f. RESIDUAL — "1 items" in the header, because it is the phone's string

The subtitle is `` `${total} items` `` verbatim (`MediaLibrarySheet.tsx:251-258`), which reads
wrong at one. The plan's binding convention is to lift quoted phone copy verbatim (§4, "Copy &
pixel fidelity"), and a grammar divergence is a copy divergence a reviewer would have to re-derive.
A test pins `1 items` explicitly so the choice is visible rather than looking like an oversight.
**Trigger:** if the owner wants demo-grade polish over phone-copy fidelity here, singularize in
`mediaLibrarySubtitle` — one function, one test line — and note it as a DEMO-BETTER row.

### 63g. RESIDUAL — the library is not in `EXPLORE_ITEMS` — ✅ RESOLVED

The rail's exploration checklist still has no entry for the media surfaces; `explore.ts:16` records
that as pending ("the media screens join when built"), and P4.3 and P4.6 both shipped their screens
without adding one. Adding only the library would leave the accordion's other two rows
unrepresented, which is worse than the current uniform gap.
**Trigger:** one commit at the end of P4 adding all three media entries (`mediaCapture`,
`audioRecording`, `mediaLibrary`) together, after P4.7 — the checklist's ordering is registry-derived,
so they must land as a group to read sensibly.

**✅ RESOLVED (P4 explore rider, `parity/p4-explore-rider`):** all three landed in one commit,
placed after the wizard steps and before the map — mirroring the drawer, which appends its Media
accordion after the step list. The two capture screens jump to themselves (for a non-chapter view
`setView` and `launch` are the same write, `create-store.ts:708-718`, so `currentChapter` is
untouched and closing returns the visitor to the step they came from); the library is a modal with
no view to jump to, so it routes to `submission` — the same "go where the opener lives" treatment
the three case-management rows get — which also keeps its no-location gate on the only path that
can reach it.

Two consequences worth knowing, both pinned:
- the manifest anchor and the rail narration now DISAGREE for the two capture launchables: the
  checklist lights `Capture Media` / `Record Audio` while the rail copy falls through to the
  chapter. Same "most-specific first" rule in both, run against different registries — §59e
  deliberately gives those launchables no `MODAL_NARRATION` entry (pinned in
  `DemoExperience.ocr.test.tsx`), while §63g deliberately gives them manifest entries. Not drift;
  each half is a recorded decision.
- `ocr` still has NO entry, deliberately: it is a step inside Time Offset rather than a destination,
  and `selectors.test.ts` pins that the Time Offset row keeps the marker while it is open.

Rider extra: the registry test's `KNOWN_COVER_IDS` was a hand-written `'import', 'newCase',
'newLocation'` that had already rotted — `editIncident`, `duplicateLocation`, `newAddressLocation`
and `mediaLibrary` were all missing, so any of them in `covers` would have failed the check for the
wrong reason. It is now derived from a `Record<ModalId, true>` declared in the test, exhaustive by
construction like `MODAL_IDS` in `store/persistence.ts`: a new `ModalId` is a compile error there,
which forces whoever adds one to decide whether the manifest should list it.

### 63h. RESIDUAL — `deleteMedia` rebuilds `locations` even for an id that is not there

`create-store.ts:1080-1095` maps over `locations` unconditionally, so calling it with an unknown
media id produces a fresh `locations` array with identical contents. It is unreachable from this
package — the confirmation is armed on a derived, currently-visible item — and the store action
predates P4.5, so it is left alone rather than changed under a UI package.
**Trigger:** if a later package gains a delete path that can fire on a stale id (an undo, a sync
reconciliation), add the `find`-first guard and pin it with the house
`expect(store.getState()).toBe(before)` idiom.

### 63i. NOTE — the auto-select machinery is deliberately three lines, not three effects

The phone arms a ref and runs three `useEffect`s to re-select the first item
(`MediaLibrarySheet.tsx:79-104`). Both of the conditions that machinery exists for are absent here:
there is no async fetch (the media are already in the store) and no `visible` prop that toggles
without unmounting (closing the sheet unmounts it, so a reopen re-runs the state initialiser).
Selection, fullscreen and the pending delete are all held as IDs and RESOLVED against the visible
list each render, which is what gives the phone's `onDeleted → closePreview` behaviour for free.
**Trigger:** none — this is a note for whoever next reads the two files side by side and wonders
where the effects went.

## 64. P4.7 (parity/p4-ocr) — the OCR real camera: decisions, refutations & residuals

**Source:** P4.7 OCR real camera (plan §5 P4.7; matrix row 37; owner decision D8; ui-mapping
`06-wizard-b-time.md`; phone `src/features/ocr-time-capture/`). Crop geometry in
`features/demo/engine/logic/ocr-crop.ts`, recognition I/O in
`features/demo/ui/inputs/ocr-recognize.ts`, the live viewfinder in
`features/demo/ui/screens/OcrCaptureScreen.tsx`, the shared read-presentation path
(`runOcrRead`) and the Time-Offset PDF proof mapping in `ui/DemoExperience.tsx`, vendored
runtime assets in `public/ocr/` (see `SOURCES.md` there).

### 64a. DECISION — `OcrProof.imageDataUrl` persists under SNAPSHOT_VERSION 6, size-bounded at capture

The brief flagged this as potentially version-shaped. It is not: `imageDataUrl` has been an
optional member of `OcrProof` and of `ocrProofSchema` (`z.string().optional()`,
`engine/store/persistence.ts:166`) since the field was typed — this package is the first
WRITER, not a schema change, so v5→v6-style discard analysis does not arise and
`SNAPSHOT_VERSION` stays 6. The persistence choice among the three options:

- **Ephemeral** would break the feature's own point — the strip is the evidence image the
  Time-Offset report embeds, and a refresh that silently dropped it would reproduce the
  demo's "always-empty OCR image block" bug in a new form.
- **Strip-on-persist** (the `MediaItem.url` precedent) is for `blob:` URLs, which die with
  the document. A data URL is self-contained and survives; stripping it would discard data
  that rehydrates fine.
- **Persist with a size bound** wins, with the bound enforced at CONSTRUCTION:
  `grabVideoFrame`'s new `targetWidth` caps the strip at 1280 px wide (aspect preserved,
  never upscaled), so the recogniser and the stored proof read the same bounded pixels.
  Measured: a 720p frame yields a 1152×122 strip ≈ 25–60 KB JPEG ≈ 35–80 KB base64; the
  4K worst case downscales to 1280×136 ≈ ≤120 KB base64. One proof per location (plus the
  staging copy in `capture.ocr`) against the ~5 MB sessionStorage quota. Round-trip pinned in
  `DemoExperience.ocr.test.tsx`.

**Trigger:** none — revisit the 1280 px bound only if the report's print fidelity is ever
found wanting.

### 64b. DECISION — self-hosted recogniser assets; the SIMD+LSTM core is pinned as ONE file

tesseract.js's browser defaults are all jsdelivr CDN URLs (worker, core, langdata —
`src/worker/browser/defaultOptions.js`, `src/worker-script/browser/index.js`,
`worker-script/index.js:130`). The demo must not depend on a third-party CDN at runtime, so
`public/ocr/` vendors: `worker.min.js` (109 KB), `tesseract-core-simd-lstm.wasm.js` (3.7 MB,
single-file build — verified it references no sibling `.wasm` to fetch), and
`eng.traineddata.gz` (2.8 MB, `4.0.0_best_int` LSTM-only model). ~6.8 MB in-repo, fetched
lazily only when a live capture runs recognition.

Pinning `corePath` to a specific `.js` file skips tesseract's runtime SIMD feature detection
(a directory `corePath` would make the worker pick among relaxedsimd/simd/plain variants —
hosting all three LSTM variants costs ~11.7 MB for a marginal relaxed-SIMD win). **Residual:**
a browser without wasm SIMD (pre-16.4 Safari era) fails recognition honestly — the notice
names the failure and the sample path stays available. **Trigger:** a real-world report of
that failure → vendor `tesseract-core-lstm.wasm.js` too and pass the directory instead.

### 64c. DECISION — the crop is taken from the VISIBLE (cover-fitted) band, not the raw frame

The phone crops the raw photo (centered 90% × 17%) because its full frame IS what the
operator saw. The demo's landscape viewfinder renders the stream `object-fit: cover`, so a
camera whose aspect differs from 16:9 has pixels OFF-screen — and a raw-frame crop would
include regions the operator never aimed at (with no height buffer to forgive it, a 4:3
camera's raw-frame strip would read ~25% off-target vertically). `ocrCropRegion` therefore
scales the strip into the visible band, reducing EXACTLY to the phone's
`{0.05, 0.415, 0.90, 0.17}` when aspects match. Pinned to source-rect pixels in
`OcrCaptureScreen.live.test.tsx` (both the matched and the 4:3-in-16:9 case).

### 64d. REFUTATION (plan wording) — the 5% buffer is WIDTH-ONLY, and the guide excludes it

The plan/brief say "80% × 17% with a 5% crop buffer", which under-specifies two things the
phone source pins: the buffer applies per side to the WIDTH ONLY
(`ocr-capture-service.ts:65-70` — `boxWidth = photo.width * (widthPercent + CROP_BUFFER_PERCENT * 2)`;
`boxHeight = photo.height * heightPercent`, no buffer), and the on-screen guide shows the
UNBUFFERED 80% × 17% — the buffer lands outside the guide, forgiving hands without inviting
the operator to fill it. Both carried over verbatim; the constants are re-pinned by test with
the phone citations (`engine/logic/__tests__/ocr-crop.test.ts`).

### 64e. DECISION — recogniser configuration and lifecycle

- **PSM `SINGLE_BLOCK`** (6): the strip is a cropped band carrying one or two short lines;
  full-page auto-segmentation hunts for layout that does not exist. Not `SINGLE_LINE` (7) —
  some DVRs stack date over time, and the strip can legitimately carry both.
- **No `tessedit_char_whitelist`.** A digits-and-separators whitelist would forbid exactly
  the tokens the ported cleaning pipeline protects and repairs (day/month names, AM/PM,
  O→0/l→1 slips — `cleanOcrText`'s whole reason to exist). The recogniser stays naive; the
  cleaning pipeline stays the work of art.
- **Worker lifecycle:** module singleton, created on first shutter, reused across retakes,
  disposed on screen unmount (tens of MB of wasm heap must not outlive the screen). A FAILED
  boot is not cached — a transient asset-fetch failure is retryable. All pinned in
  `ocr-recognize.test.ts` / `OcrCaptureScreen.dispose.test.tsx`.

### 64f. EVIDENCE — recognition quality on DVR-style strips (node-side lab, vendored model)

Ten synthetic DVR-style strips (1152×122, the demo's real capture size) run through the SAME
tesseract.js 7.0.0 + vendored `eng.traineddata.gz`: clean ISO / slash / dash / time-only /
AM-PM formats, a sans OSD font, small far-DVR text, low contrast, text over live-video grey,
and a noisy frame — **10/10 exact reads, confidence 94–96**. Real webcam captures of real DVR
monitors will land lower (glare, moiré, seven-segment-style fonts), which the measured
confidence tiers and the failed-parse/failed-recognition notices absorb honestly. The `.gz`
langdata serves as `application/gzip` (no transparent decoding) and tesseract inflates it
itself — verified in the lab run through the same `langPath` file.

### 64g. NOTE — R-16's "Sample" badge is now conditional, and its copy changed

`OcrResult.confidence` gained `measured: boolean`. The badge + disclaimer render only for the
fixed sample score; a live read's confidence is the recogniser's own number and carries
neither. The old disclaimer sentence "a browser has no recogniser to score" became FALSE the
moment this package landed and now reads "no live frame was scored here". The sample score
itself remains the demo's one fabricated on-screen number, exactly as R-16 recorded.

### 64h. RESIDUAL — the granted-but-closed viewfinder state

The camera is released while the confirm stage is up (phone parity: its camera unmounts under
the confirmation screen) and reopened automatically ONLY for a stream the screen itself
closed. If that reopen fails — device unplugged mid-confirm — the viewfinder shows a
"Restart camera" control rather than retrying in a loop. Deliberate: an auto-retry against a
`NO_DEVICE` failure whose permission state stays `granted` would spin.
**Trigger:** none — behaviour note.

## 65. P4.1 fix round (parity/p4-fix-capability) — R-2/R-3/R-11/R-13/R-14/R-22/R-23/R-25/R-28/R-31

**Source:** the P4 round-1 vetted review (`docs/code-reviews/parity/p4/p4-review-r1-vetted.md`),
capability-territory findings. All ten FIXED — nothing refuted this round. Recorded below: the
choices taken where a finding offered a fork, the scope crossings, and what is deliberately
left for a named successor.

### 65a. R-11's fork resolved toward the honest branch, not an argued `.mp4`

T-5 offered two ways out: add a `matroska → 'mkv'` branch, or file the `.mp4` answer with a
rationale. Took the branch. There is no rationale to write — `.mp4` on a Matroska file is
exactly the false claim in an evidence filename that §58c exists to prevent, and §58c already
names `video/x-matroska;codecs=avc1` as its motivating Chrome case, so the code was
contradicting the rule it was written to enforce. Audio-only Matroska now resolves to `.mka` by
the same rule. **Amends §58c**: its extension table gains Matroska; the phone-extension fallback
remains reserved for MIME types carrying no container information at all.

### 65b. R-3 added a THIRD fallback sentence the review did not ask for

The vetted fix shape said to pick the review-stage notice "by the same `canStream` test", which
would route a live-camera/no-`objectUrls` browser to `NO_RECORDER_NOTICE` ("can open a camera
but cannot record video to a file"). That is better than the falsehood it replaces but still
wrong: the recorder is fine there, the object-URL API is not. `NO_CAPTURE_STORAGE_NOTICE` is
new, names no device on purpose (both existing sentences would be false), and
`sampleFallbackNotice` picks by reason priority — no-device → no-storage → no-recorder — so the
visitor is told the first thing that would have to be fixed. This is what makes the folded S-3
rider genuinely closed rather than relabelled.

**Fix-delta FD-6 (NIT) — ✅ RESOLVED in `parity/p4-fix2-capability`.** Deleting `sampleOnly` left
`useMediaCapture`'s own docblock still naming it, twenty lines above the interface that explains
it is gone. Now reads `capability.modeFor(kind)`. Rode FD-1's commit (same file, one sentence).

### 65c. R-3's screen half is a disclosed territory crossing into P4.3's file

`MediaCaptureScreen.tsx` is P4.3's, and P4.3 was fixing other findings in it in a parallel
worktree. The edit here is deliberately minimal: three `capability.sampleOnly` reads become
`capability.modeFor(mode)`, and `ReviewStage` takes `sampleNotice` as a prop instead of
hard-coding `SAMPLE_MEDIA_NOTICE.camera`. Expect a merge reconcile.
**Not done here, per the vetted routing:** the `modeFor` collapse of `AudioRecordingFlow`'s
hand-rolled `canStream`/`canRecord` pair. `CaptureCapability` deliberately keeps the three
booleans so that flow compiles untouched. **Trigger:** P4.6's own fix round.

### 65d. R-23 collides with R-1 on `saveAudioNote`

R-23's arity change (`st.addMedia(buildMediaItem(…))`) touches the same lines R-1 rewrites in
P4.6's worktree to add the no-location guard. Both want the same final shape — the one-argument
`addMedia` call inside a guarded branch. Flagged in the commit body; the orchestrator reconciles.

### 65e. R-13's fix required splitting the assemble tail, not just adding a callback

S-4's shape was "an `onEnded` callback + prefer recorded length when the two disagree". Adding
only the callback would have made a self-ended take *silently vanish*: the later user Stop finds
the state already stopped and returns early, so nothing would ever assemble the bytes. The tail
of `stopRecording` is now a shared `finishTake(stopped, atMs)` that both paths call. With the
state banked at the real end, the two figures no longer disagree at all — so the "prefer recorded
length" half of the suggested fix is unnecessary rather than skipped.

**Fix-delta FD-1 (MINOR, fix-introduced) — ✅ RESOLVED in `parity/p4-fix2-capability`.** The
split carried a cost this entry did not notice: it moved `handleRef.current = null` ahead of
`await handle.stop()`, and `abortRecording`'s only route to the recorder is
`handleRef.current?.abort()`. A Cancel landing between Stop and the recorder's `stop` event hit
nothing, and the cancelled take assembled, minted a URL and published itself to review — the
hook's stated contract false in exactly the window it exists for. Latent (the sole caller pairs
abort with unmount, so `abortedRef` intercepted) but `MediaCaptureScreen` already holds an
`abortRecording` it does not yet call.

The handle now stays in the ref across the await, and afterwards whoever cleared or replaced it
owns the take — `abortRecording` nulls it, a fresh `startRecording` reassigns it — so both bail
without publishing, and the ref is un-set only while it still points at this take. That also
closes a race the fix shape did not name: an abort arriving after `onstop` has already settled is
a no-op inside the handle, but the identity re-check still refuses to publish. **Generalise:**
moving a ref clear across an `await` moves it out of reach of every handler that reads that ref
— the window is not the await, it is everything the ref gates.

### 65f. `useCaptureStream` is deliberately NOT given the same self-end signal

R-13 offered `track.onended` in `useCaptureStream` as an alternative site. Not taken: the
recorder's own `onstop` is the event that decides whether bytes exist, and putting the signal
there keeps one owner for the take's outcome. A track that ends without the recorder stopping
(a second camera track on a multi-track stream) is not an ended recording and must not be
reported as one. **Trigger:** if a surface ever needs to know the PREVIEW died while no
recording was running — the viewfinder freezing on an unplugged camera is the case — add
`track.onended` to `useCaptureStream` for that, not for the take.

### 65g. R-22 also guarded `toBlob`, which the finding did not name

S-6 named `drawImage` and `toDataURL`. `canvas.toBlob` has the same defect one layer down: a
synchronous throw inside the Promise executor rejects the promise both call sites `await`
without a catch. Resolving `null` routes it into the existing zero-blob check. A `toDataURL`
throw fails the whole grab rather than returning a capture without the data URL — a caller that
asked for one (P4.7's OCR proof) must not silently receive a half-answer.

### 65h. Carried forward from the vetted doc: the pre-existing `confirmOcr` sibling

The aggregator's note under *Struck & re-ruled*: `confirmOcr` / `calculateOffset`
(`DemoExperience.tsx:1441`) have the same silent-no-op-with-no-location shape R-1 fixes for
audio — a store write that early-returns when `currentLocationId` is null, with no notice. It
predates P4 and is unchanged by it, so it was correctly out of the PR's scope.
**Trigger:** the next time that code is open — apply `saveCapturedMedia`'s guard shape
(notice + `closeLaunch()` + a boolean answer the caller gates on).

### 65i. §58g's carry-rule now has its cascade half

§58g said "once the store owns a capture's URL, `deleteMedia` is the only thing that can revoke
it" and named `revokeCapturedUrls`'s single caller as the whole story. R-2 showed that was
incomplete: `deleteCase`/`deleteLocation` drop media rows too. `collectMediaUrls` + the sweep in
`confirmDelete` close it. **Any future store path that removes locations owes the same sweep** —
there is no other holder of those URLs.

## 66. P4.3 review round 1 (R-7 · R-9 · R-16 · R-29) — what was fixed, what was deliberately left, one new finding

**Source:** `docs/code-reviews/parity/p4/p4-review-r1-vetted.md`, findings routed to P4.3.
Branch `parity/p4-fix-photovideo`. All four are FIXED; no finding routed here was refuted.

### 66a. R-7 (camera held through review) — fixed; one transient inherited from the pattern

Closed by porting `OcrCaptureScreen.tsx:209-224`'s effect: close on `captured`, reopen through a
latch so only the stream WE closed comes back. The latch is what stops a sample-path visitor
meeting a permission prompt on Retake, and it has its own test.

Known transient, identical to the OCR screen's and accepted for the same reason: `open()` is
async, so between Retake and the new stream arriving `permission` is still `granted` while
`stream` is `null`. A shutter press inside that window grabs a frame from a zero-dimension
`<video>` and lands on `FRAME_GRAB_FAILED` — an honest notice, not a lie, and the window is one
acquisition long.
~~**Trigger:** if device testing shows the window is long enough to be pressed in practice, the
fix is to fold `isOpening` into the shutter's `blocked` derivation (now a one-line change, since
R-9 gave that derivation a home) rather than to suppress the notice.~~

**RESOLVED — FD-4 (fix-delta round), fixed exactly as the trigger described.** The silent-failures
lane found the window was worse than this entry claimed: photo mode's frame-grab sentence is
merely the *wrong cause*, but VIDEO mode reaches `startRecording` with no stream and prints
"This browser doesn't expose a camera to this page" — R-3's exact sentence, re-entering through
a door R-7 opened. `reopening = isOpening && !modeIsSample` now heads R-9's blocked-reason ladder
("Reopening the camera…") with the matching guard in `onShutter`.

The `!modeIsSample` half is deliberate: a bundled-sample attach needs no stream, so refusing it
in the window would be a refusal with no cause behind it. Pinned both ways — a live press mid-
reopen states its reason and produces no failure copy; a sample clip attaches normally on a
no-`MediaRecorder` browser during the same window.

**RESOLVED — FD-3 (same round): the reopen was unpinned.** `close()` preserves `selectedDeviceId`,
so the bare `open()` re-acquired the browser DEFAULT: Switch camera → capture → Retake came back
on the built-in lens with the caption silently following. Both reopen sites now pass
`selectedDeviceId ?? undefined`. Trade-off taken knowingly: `captureConstraints` pins with
`exact`, so a camera unplugged during review fails loudly as `NO_DEVICE` into the honest
unavailable panel instead of quietly opening a different lens.

CROSSING, disclosed: the twin site is `OcrCaptureScreen.tsx:246` — P4.7's file. The same one line
plus its comment and dep-array entry was changed there and nothing else, on the orchestrator's
instruction, because splitting one mechanical fix across two agents is how the two halves drift.
The device-identity pin lives on the capture screen only; the OCR screen's reopen arm remains
unpinned for device identity.
**Trigger:** P4.7's next pass — add the twin pin, or fold both screens' reopen effects onto a
shared hook (they are now byte-identical apart from their latch names).

### 66b. R-9 (native `disabled`) — fixed at both named sites; the two unnamed ones deliberately keep `disabled`

The shutter and the permission stage's Grant button now take the house idiom. §60f was amended in
the same commit: it had described the mechanism as "renders disabled", which was the defect, while
the DECISION it records (gate video Stop at 500 ms) stands. §61b needed no edit — its claim about
the idiom was true of the audio surface and is now true of this one.

**Deliberately not converted, same file:** the mode pill (`disabled={isRecording}`) and the
Switch-camera button (`disabled={isRecording}`). R-9's failure shape is specific and does not
reach them: it is the control the visitor JUST PRESSED becoming `disabled` under their focus.
Pressing the shutter to start a recording leaves focus on the shutter — the pill and the switch
are controls the visitor is *not* on, and for a control that becomes unavailable while focus is
elsewhere, the `disabled` attribute is the correct HTML (it is announced as unavailable and
correctly leaves the tab order). Converting them would add two `aria-disabled` states with no
refusal to explain.
**Trigger:** if a reviewer wants the whole file on one idiom regardless, it is mechanical — but
it should come with a reason line each, or it is `aria-disabled` with nothing to describe.

### 66c. R-16 (badge announced once a second) — fixed, and it is a deliberate divergence from the phone

`aria-live="polite"` dropped; `role="timer"` + a live `aria-label` kept. The phone's
`RecordingIndicator` DOES set `accessibilityLiveRegion="polite"` (ui-mapping 09), so this is a
place where copy/behaviour parity was deliberately not taken: the web role already defaults to
`off` on purpose, and overriding it queues up to 3600 readings in front of every genuine status
change — including R-9's new stop-gate reason, which is itself a `role="status"`. Recorded here so
a future parity sweep does not "restore" it.

### 66d. The device-list failure borrowed a sentence about opening a camera — ✅ RESOLVED

Surfaced while writing R-29's pin. When `enumerateDevices` rejects, `listCaptureDevices` builds
its failure through `captureFailure(classifyCaptureError(error), 'camera')`; a generic rejection
classifies as `UNKNOWN`, whose copy is *"The camera could not be opened — nothing was captured."*
That sentence is rendered **underneath a live viewfinder**, describing a failure of the device
LIST. It is not false about anything the visitor did, but it names the wrong subject, and §60e's
whole point is that this line exists to explain the picker's absence specifically.

Not fixed here: the copy lives in P4.1's `captureFailureMessage`, keyed by `CaptureErrorCode`,
and the honest fix is a code (or a facility-plus-subject key) for "the device list could not be
read" — a taxonomy change in a file two other packages are consuming this round. The test pins
the message through `captureFailureMessage` rather than as a literal, so it follows the copy
wherever it lands.
**Trigger:** P4.1's next pass, or P7 — add the code, and this screen's line changes only in what
it reads.

**✅ RESOLVED (P4.1 rider, `parity/p4-fix-66d`):** a new `CaptureErrorCode`, not a subject-keyed
message. `DEVICE_LIST_UNAVAILABLE` — *"This browser wouldn't list the available cameras, so
there's nothing to switch between."*

Chose the code over threading a subject argument through `captureFailureMessage` because the
subject is not a second axis on the existing failures: `listCaptureDevices` reports one fact
with one consequence, and every other code in the union describes opening or using hardware.
A `(code, facility, subject)` signature would have made every call site declare a subject that
only one of them can vary.

**BOTH** of `listCaptureDevices`' branches now report it — the rejection AND the
missing-`enumerateDevices` case, which was returning `UNSUPPORTED` ("doesn't expose a camera to
this page") and had the same wrong-subject defect one line up. The cause distinction
`classifyCaptureError` drew is deliberately discarded: a denied, absent or broken enumeration
leave the visitor with the same fact and the same non-options, and the DOMException vocabulary
is about opening hardware. This is the same correction the recorder paths already carry (§65g's
neighbourhood) — classify only where the decoded names mean something the caller can act on.

Copy stayed single-sited per §58's rule: one `case` in `captureFailureMessage`, and both screens
render `deviceFailure.message` unchanged. Neither `MediaCaptureScreen.tsx` nor
`OcrCaptureScreen.tsx` was touched; only their R-29 pins, which named the old code, moved to the
new one (a mechanical key change in test files — the OCR twin needed nothing more, so P4.7's
file stayed shut). `permissionAfterFailure` names the new code explicitly rather than absorbing
it into a `default`, keeping the switch total even though the path is unreachable for it — a
device-list failure never runs through the permission derivation, because the stream is fine.

Pinned: four rejection names all resolving to the one code, both no-API branches, a sentence
assertion that the message names the list and never says the capture failed, and a screen-level
arm that no "nothing was captured / could not be opened" text renders under a live viewfinder.
Mutation-probed — restoring `classifyCaptureError` on the rejection reddens nine arms across
four files.

**Fix-delta FD-5 (LOW) — ✅ RESOLVED in `parity/p4-fix2-capability`.** The collapse was endorsed
on a condition this entry did not carry through: that the cause survives SOMEWHERE. The rejection
branch's `catch` was unbound, so after the collapse denied / absent / broken enumeration were
indistinguishable from every seat including the console. One `console.warn` carrying the original
error, matching `reverse-geocode.ts` and `import/geocode.ts` (P1 review L2). Pinned with a spy
asserting the error OBJECT reaches it, not just a message — collapsing a visitor-facing
distinction is only acceptable while the operator-facing one survives.

### 66e. R-3 is P4.1's, and is NOT in this branch

Disclosed so a fix-delta reviewer does not read its absence as an oversight: R-3 (video mode
asserting "no camera" over a live viewfinder when `MediaRecorder` is missing) is owned by P4.1,
whose fix lands a `modeFor(kind)` capability API plus the minimal consumption change in
`MediaCaptureScreen.tsx`. That agent is working in a parallel worktree; this branch deliberately
left `capability.sampleOnly`'s two consumption sites (`onShutter`, and the review stage's sample
notice via `ReviewStage`) untouched so the two changesets merge without contention.

---

## 67. P4.5 fix round (parity/p4-fix-library) — R-8, R-18, R-19, R-24, R-26, R-30, R-33

**Source:** `docs/code-reviews/parity/p4/p4-review-r1-vetted.md`, the seven findings routed to
P4.5. All seven FIXED; none refuted. One commit each, except R-26+R-33 which the review itself
directs to land together.

### 67a. R-19's opt-out changed a SHARED primitive — what the next caller needs to know

`useLongPress` gained `contextMenu?: boolean` (default `true`). The default is not laziness: for
the two tray call sites, right-click-to-open-the-actions-menu is what a desktop context menu is
FOR, and the tray it opens is exactly what the browser's own menu would have covered. Only a
DESTRUCTIVE callback wants `false`.

The branch now has three rules where it had two, and the house pin for this primitive (§57a — one
test arm per rule, verified by mutation) holds: dropping the opt-out reddens the doesn't-fire arms
(3); making the opt-out `preventDefault` reddens only the menu-preservation arms (2); dropping
`preventDefault` from the touch-hold arm reddens only the touch arm (1).

Worth knowing: the touch-hold trailing menu's SUPPRESSION had no arm before this round. The
existing touch test asserts call counts only, and the dashboard's suppression test exercises the
no-prior-hold path, so that rule was load-bearing and unpinned. It has an arm now.
**Trigger:** a fourth call site with a destructive callback passes `contextMenu: false`; anything
else leaves the default alone.

### 67b. R-24 crossed into P4.1's module — the exact extent

`isMediaAvailable` is P4.1's. This round changed its signature line to `item is AvailableMedia`,
added that type + docblock, and added one barrel export. No behaviour, no other symbol in
`captured.ts`. Recorded because the routing table flagged the file as shared.
**Trigger:** none — noted for whoever reconciles P4.1's own fix branch.

### 67c. R-18 traded ARIA roles for the sibling's shape — a real choice, not a downgrade

The review offered two fixes: complete the APG tablist contract, or drop to the sibling segmented
control's `role="group"` + `aria-pressed` (`MediaCaptureScreen.tsx:440-456`). The second was taken.
What a screen reader SAYS is unchanged — the phone's dynamic `${label} tab, ${count} items` name is
kept — and the two media surfaces now answer the keyboard identically. What changed is that the
markup stopped promising arrow-key navigation it did not implement.
**Trigger:** if the library ever gains a real tabpanel region and roving tabindex, the roles can
come back — together, not one at a time. A new arm asserts their absence, so a half-return reddens.

### 67d. RESIDUAL — the `MEDIA_BUCKET` map is exhaustive, the TAB registry is not

R-26 made the kind→bucket mapping a `Record<MediaKind, …>`, so a fourth media kind is a compile
error there. `MEDIA_LIBRARY_TABS` has no equivalent guard: a fourth kind would add a bucket and a
map entry with no tab, and the library would simply never show it. Deliberate for now — the
registry is ORDERED display content, and forcing exhaustiveness on it would make "built but not
yet surfaced" impossible to express, which is the state the media screens themselves were in for
three packages.
**Trigger:** add `MediaKind` exhaustiveness over `MEDIA_LIBRARY_TABS` if a kind ever ships without
a tab by accident rather than by decision.

### 67e. RESIDUAL — §63e (Escape closes the sheet from inside an overlay) is untouched and still open

R-8 fixed focus, not Escape. Pressing Escape inside the fullscreen layer or the delete confirmation
still closes the whole sheet, because `ModalShell` owns a document-level listener registered before
either overlay's and a later document listener cannot suppress an earlier one. Unchanged from
§63e, restated here so the fix round is not read as having closed it.
**Trigger:** unchanged — fix in `ModalShell` when the alert-inside-shell pattern gets a third
caller (`NewCaseModal` is the second).


## 68. P4.6 review-r1 fix round — the audio recorder: dispositions, a grouped commit, and what stayed

**Source:** `docs/code-reviews/parity/p4/p4-review-r1-vetted.md`, findings owned by P4.6 —
R-1 (BLOCKER), R-12, R-17, R-20, R-21, R-27. All six FIXED; nothing deferred out of the round.
This section records the calls that are not obvious from the diff.

### 68a. R-1 — the guard, and why the return type had to change with it

The blocker was not "a missing `if`". `addMedia`'s silent early-return is the mechanism, but the
damage came from three things agreeing to look like a success: the store dropped the note,
`closeLaunch()` returned the visitor to the anchor exactly as a real save does, and `handOff()`
released the object URL so the bytes were pinned with nothing left holding a reference to
revoke them. Any two of those fixed alone still leaves a lie or a leak — which is why the fix is
P4.3's whole `boolean` contract (§60c) rather than a guard: `saveAudioNote` reports whether the
store TOOK the note, and `handleSave` gates the hand-off on the answer.

Both notices are phone verbatim. The success one had no pin at all before this round, so the
round added one: `Audio Saved — {base} saved to case`, where `base` is the filename WITHOUT the
extension, because the phone builds its toast from `result.userFilename` and appends `.m4a`
separately (`audio-recording.tsx:127` vs `:184-189`) — the same asymmetry `mediaSavedNotice`
already carried a note about.

### 68b. R-21 — fixed in the flow, deliberately NOT in `useMediaCapture`

The finding's own fix shape offers both; the flow is the right one here. `useMediaCapture` is
P4.1's shared hook and P4.3's capture screen mounts it too, so a release added inside it would
change the video surface's hardware lifetime as a side effect of an audio fix — and R-7 is that
surface's own sibling finding, owned elsewhere. A cross-surface behaviour change smuggled in
under a different finding's number is the kind of thing a fix-delta review cannot see.

What went in instead is stronger than the finding asked for: the release is no longer an action
on the Stop handler at all but a REACTION to a take existing (`[captured, stream]`). "A take
exists ⇒ the microphone is no longer needed" is true however the recorder got there, so the
1-hour auto-stop — which fires inside the hook's tick and never passes through `handleStop` — is
correct by construction rather than by a second copy of the release. Probe: gutting the effect
reddens both arms.

### 68c. R-17 — threaded as a prop, not `useReducedMotion()` inside the screen

`MediaCaptureScreen.tsx:183` calls the hook in the component; `AudioRecorderScreen` takes a
`reduceMotion` prop instead. Deliberate, two reasons: the screen is prop-driven end to end (that
is what lets every one of its states — denied, no-analyser, sub-500ms, and now reduced-motion —
be rendered in a test without stubbing a media query), and the flow already has to resolve the
same preference for the meter's tick rate. `prefersReducedMotion` therefore moved out of
`useAudioAnalyser` into `audio-analyser.ts` beside the other browser reads, so there is exactly
one reading of the query. Two readers of one preference that could disagree is a bug waiting for
a slow tick.

### 68d. R-20 — the bar geometry is unchanged, and that is checked

`scaleY` replaces the animated `height`, and the scale factors are the previous percentages over
the same half-box (0.46 / 0.18). This is a rendering change, not a restyle — the demo's "do not
restyle lifted rules" line applies, so the exact factor is pinned (`scaleY(0.46)` at full level)
rather than left to look right.

### 68e. R-27 — the `RecorderMode` else-chain is left as an else-chain

The finding names it as "same class, recorded". It stays. `assertNever` earns its keep in a
value switch whose result is a claim about the hardware (`recorderStatusLabel` renders READY
beside a live microphone — that one is now exhaustive and has a runtime arm). The `RecorderMode`
chain is a JSX branch over a union computed three lines above it by the flow, in a component
that renders nothing at all if the union widens without it. Converting it would mean an
`assertNever` in render position for a union that is already closed at its only producer.
**Trigger:** if `RecorderMode` ever gains a member set by something other than the flow's own
ternary, close it then.

### 68f. §61g was corrected in place, not silently edited

See §61g. Its "both directions are pinned" sentence was false when written, and the correction
stays visible with the lesson attached: that is a claim about TESTS, and the only way to earn it
is to run the mutation. The arm now carries the two assertions that survive nothing.

### 68g. FD-2 — the flow's hand-rolled capability rules are gone (fix round 2)

**Added in the second fix round (`parity/p4-fix2-audio`), discharging §65c's trigger.** §65c
deferred the `modeFor` collapse of this flow's `canStream`/`canRecord` pair to "P4.6's own fix
round" — and that round (§68a–f) came and went inside the same merge without touching it. The
trigger lapsed, which is why this could not be deferred a second time; recorded plainly because
a named trigger that expires unnoticed is worth more as a lesson than as a footnote.

**What was wrong.** Two hand-rolled derivations, both missing the `objectUrls` term:
`mode`'s sample arm (`!capability.stream || !capability.record`) and the `sampleNotice` ternary
(`canStream ? NO_RECORDER_NOTICE : SAMPLE_MEDIA_NOTICE`). On a `{ stream: true, record: true,
objectUrls: false }` browser — a hardened or embedded WebView — the engine answers `'sample'`
and the flow rendered the **full live recorder**: microphone open, meter responding to the
visitor's voice. They recorded a take, pressed Stop, and the registry check answered
`captureFailure('UNSUPPORTED', 'microphone')` — *"This browser doesn't expose a microphone to
this page"* — over a completed recording. The ternary was also structurally incapable of
producing `NO_CAPTURE_STORAGE_NOTICE`, the sentence §65b added for precisely this state.

**Fix:** three reads, all now the engine's. `capability.modeFor('audio') === 'live'` is the one
derivation (closed with `assertNever` over `MediaKind`, so a fourth kind cannot inherit the
photo rule), it gates the mount-time `open()` as well as `mode`, and `capability.sampleNotice`
supplies the sentence by binding-reason priority. Both notice imports are gone from the flow,
so the surface has nothing left to re-derive with.

**Pin:** a `deps.objectUrls: null` arm asserting sample mode, that `getUserMedia` is never
called, and that the storage sentence — not either device sentence — is what prints. Probed by
restoring the exact pre-fix expressions: it reddens.

**Not done here, deliberately:** FD-2's optional coda (dropping `CaptureSupport` from the public
`CaptureCapability`, which would make this finding structurally unrepeatable) and FD-6 both land
in `useMediaCapture.ts`, which P4.1 is editing on a parallel micro-branch for FD-1/FD-5. Two
agents in one file is how §65c's reconcile happened. The audio flow now reads none of the three
raw booleans, so nothing here blocks that coda.

## 69. P4.7 fix round 1 (parity/p4-fix-ocr) — R-4/R-5/R-6/R-10/R-15/R-29(twin)/R-32 dispositions

**Source:** `docs/code-reviews/parity/p4/p4-review-r1-vetted.md`, the P4.7-routed findings.
All FIXED, none refuted. Mutation evidence re-run for the two the aggregator reproduced.

### 69a. R-4 — generation token for live reads (FIXED)

`readGen` (the `importGen` pattern) in `OcrCaptureScreen`: bumped by a newer capture, a
sample pick, the sample shutter, and — the load-bearing one — the result-arrival effect, so a
read landing after ANY result is stale and writes nothing. The supersession point releases
`reading` and clears the notice, because a stale read's `finally` deliberately won't touch
flags it no longer owns (without this, a superseded read left the shutter held and "Reading
timestamp…" up forever on Retake — found by the new failure-arm test, worse than the reviewed
symptom). Belt: the three sample buttons are `disabled` while a read is in flight. Five pins;
dropping the token guard fails the two supersession tests.

### 69b. R-5 — the bridge arm executed (FIXED)

`DemoExperience.ocr-live.test.tsx`: `OcrCaptureScreen` stubbed at the module boundary, the
bridge's `runOcrLive` driven through props. The aggregator's exact gut (`measured: false`,
no `imageDataUrl`, `fallbackActual: SAMPLE_ACTUAL_TIME`) now fails 2 of 3 tests. Also pins
that a previously-calibrated `capture.actualDateTime` survives a live read.

### 69c. R-6 — the proof writer compile-linked to the canonical type (FIXED)

`ocrProof` ref is `Omit<OcrProof, 'parsedDateTime'>`; `confirmOcr` writes an annotated
`OcrProof`. Probe re-run: a required field added to `OcrProof` now errors at this writer
(previously only the two `persistence.ts` sites fired). No runtime change.

### 69d. R-10 — the 1280 px bound pinned at the screen (FIXED)

The 4K case (`sizeVideo(3840, 2160)` → drawCall `[192, 896, 3456, 367, 0, 0, 1280, 136]`)
lands in `OcrCaptureScreen.live.test.tsx`; deleting `targetWidth` from the screen's grab call
now fails it.

### 69e. R-15 — persisted strip decoupled to q=0.85 (FIXED, §64a byte budget restored)

`grabVideoFrame` gains `dataUrlQuality` (defaults to `quality` — no other caller moves). The
recognition blob keeps the phone's `CAPTURE_QUALITY` 1.0; the sessionStorage-bound data URL
encodes at 0.85, which is what §64a's stated 35–80 KB budget assumed (the lane measured
~163 KB at q=1.0). Read §64a's size figures as q=0.85 figures from here on. Pinned at unit
level (both encoders' arguments recorded by the shared fake canvas) and at the screen.

### 69f. R-29 twin — the OCR screen's unreadable-device-list line pinned (FIXED)

`enumerateDevices` rejecting → the explanation renders over the live viewfinder, no
Switch-camera control. (`MediaCaptureScreen`'s twin belongs to P4.3's round.)

### 69g. R-32 — dispose during a still-booting worker pinned (FIXED)

Deferred-`createWorker` case: dispose stalls until the boot resolves, terminates exactly
once, the abandoned read settles, and the next read boots fresh.

### 69h. LEDGERED SIBLING (out of this round's scope) — `confirmOcr`/`calculateOffset` are silent no-ops with no location open

Flagged by the vetted doc's struck-items notes as pre-existing and unchanged by P4: with no
`currentLocationId`, `calculateOffset` early-returns and `confirmOcr` still writes
`capture.*`, closes the launch screen and resets — the operator sees a normal commit while no
offset landed anywhere. ~~Unlike R-1's media path nothing is destroyed (the capture fields
persist), but the silence is the same shape. The OCR entry point is location-gated in
practice (the Time Offset screen requires an open location), which is why it has never fired.~~

**CORRECTED (FD-7 — the original premise and consequence above were wrong; fact-checked by
the silent-failures lane's fix-delta, verified against source):**

- **The path is fully reachable, not gated.** `onCaptureOcr`
  (`DemoExperience.tsx:1706-1708`) launches the OCR screen with no location check,
  `TimeOffsetScreen` renders against `EMPTY_FORM` when nothing is open, and the rail's Time
  Offset row is one ungated `setView` from boot — R-1's exact reachability shape. "Has never
  fired" was an inference from a gate that does not exist.
- **The staged read IS destroyed, not preserved.** It survives on `capture.*` only until a
  location is opened: `switchLocation` (`create-store.ts:679`) — and the null arms at
  `:554`/`:579` — reset `capture` via `blankCapture()`. The read is wiped at the exact moment
  the visitor does the one thing that would have made it usable, which is R-1's
  data-destruction shape, not a milder one.

The deferral itself stands — the no-op predates P4 and was outside the round's diff scope.
**Trigger (strengthened per FD-7):** the NEXT P4.7-territory round, not merely "next time the
code is open" — R-1's guard pattern (refuse + notice) now sits one file away in the audio
save path, and this sibling should adopt it then.

---

## 70. P5.1 (parity/p5-engine) — the export engine port: non-ports, adaptations, and the contract P5.2/P5.3 inherit

**Source:** parity plan §5 P5.1; phone `src/hooks/useExportFlow.ts`,
`src/features/case-management/export-hub/types.ts`, `app/(tabs)/export.tsx`,
`src/features/case-management/services/pdf-export-service.ts`, `src/components/export/*`.
Shipped as `features/demo/engine/logic/export/{selection,validation,stage,flow}.ts`. Nothing
below is a bug; each is a deliberate boundary of the port.

### 70a. The persistence verdict — export state is EPHEMERAL (settled, not deferred)

The phone's own comment is decisive: "Tab-local selection (never persisted; the Map tab's
`mapViewerCaseId` precedent)" (`app/(tabs)/export.tsx:37-38`), and the prune-on-refresh effect
(`:51-69`) exists precisely because the selection is only meaningful against live data. The
demo already mirrors that precedent literally — its own `mapViewerCaseId` is
`useState` in `ui/DemoExperience.tsx:377`, outside `PersistedState`. So the export selection
and the flow state are DemoExperience-local `useState` driven by these pure transitions;
`engine/store/persistence.ts` and `SNAPSHOT_VERSION` (6) were not touched, and the barrel test
pins their absence from the store. **No trigger — this is a decision, recorded so a later
"shouldn't the selection survive a refresh?" is answered without re-deriving it.**

### 70b. NOT PORTED — the biometric gate (`useProtectedExport`)

Every phone dispatch runs inside `executeProtectedExport(..., 'export_zip')`. A browser tab has
no Face ID, and the demo's biometric surface is the P8 splash animation, which is theatre by
agreement. **Why deferred:** a fabricated gate is a fake security claim on an evidence app.
**Trigger:** none foreseen — reopen only if the demo ever gains a real WebAuthn step.

### 70c. NOT PORTED — the password round-trip and `resolvePasswordPolicy`

Decision D4 skips PasswordModal (matrix row 26), so `ExportFlowState` has no
`pendingExportType` / `showPasswordModal` / `defaultPasswordForModal`, and the flow's entry
guard is `stage !== 'idle'` alone rather than the phone's `isExporting || pendingExportType`.
`resolvePasswordPolicy` (off / auto-with-saved / prompt) and the `encryptionNote` suffix that
threads through every phone alert are absent with it. **Trigger:** if real client-side
encryption ever ships (D4 explicitly leaves the door shut for now), the policy function is a
20-line port and the guard grows a second term.

### 70d. NOT PORTED — the post-export result-alert taxonomy

`useExportFlow`'s success alerts (`:229-576`) branch on `shareWarning`, `pdfResults.failureCount`,
`geojsonFailures` and `caseMapFailed`. None of those states is producible here: there is no
share sheet, no filesystem, and no PDF pipeline that can partially fail. Porting the branches
would mean inventing failure modes; the honest terminal treatment (D4's "download isn't
available in the demo") belongs to P5.3 and P5.4 instead. The BLOCKING half of the taxonomy —
which is reachable — IS ported verbatim as `EXPORT_ALERTS`. **Trigger:** P5.4's real case-map
download may want the phone's "Export Complete (Not Shared)" shape if a browser download can
genuinely fail silently; evaluate then, against a real failure, not a hypothetical one.

### 70e. NOT PORTED — `validateLocationForPdf`'s corrupted-`formData` guard

Phone `pdf-export-service.ts:113-122` returns the single error "Location data is corrupted or
missing" when `location.formData` is not an object. It guards a nullable SQLite JSON blob. The
demo's `LocationForm` is total by type and the sessionStorage snapshot is Zod-guarded before it
reaches the store, so no path can produce the state it catches. **Why deferred:** an
unreachable branch ships with a test that pins nothing. **Trigger:** if the demo ever accepts
an externally-authored location payload (an import format that carries a whole `form`), add the
guard with that entry point.

### 70f. Deviations from the phone's validator shape (accepted)

- **Synchronous, not `async`.** The phone's `validateLocationsForPdf` /
  `validateLocationSubsetForPdf` are async only because they `await getCaseWithLocations`. The
  demo holds the rows in the session store; a fabricated Promise would add a render gap the
  demo does not have, and `applyValidation` is written against the sync shape.
- **No `directoryName`** on `LocationPdfValidation`. It names the location's folder inside the
  ZIP; there is no filesystem, and `ExportModal.tsx:204-216` never reads it.

### 70g. Copy adaptations (2) — everything else is verbatim

- `EXPORT_ALERTS.noCaseSelected` takes the SUBSET handler's generic wording ("Please select a
  case before exporting.", `useExportFlow.ts:820-821`) rather than `handleExportZip`'s "Please
  create a case from the Home screen before exporting." (`:655-656`) — the latter instructs a
  screen the demo does not have.
- `EXPORT_ALERTS.caseUnavailable` drops "Refresh the list and" from
  `export.tsx:148-149` — the demo's list IS the live store; there is nothing to refresh.

### 70h. One deliberate strengthening over the phone

`proceedWithExport` returns SILENTLY when `caseId` is null (`useExportFlow.ts:725-728`),
leaving the validation modal latched with a live Continue — the exact shape PR-89 fixed
everywhere else in that file. The arm is unreachable on the phone, which is why it survived.
`continueValidatedExport` here consumes the modal and raises `caseUnavailable` instead, the
treatment the phone's own Export tab gives that condition (`export.tsx:142-152`). Recorded so a
reviewer diffing against the phone sees a decision, not a drift.

### 70i. RESIDUAL — the entry guard does not cover an open validation prompt

Ported verbatim: `isExporting` is `stage !== 'idle'`, and opening the prompt resets the stage
(the phone calls `resetExportState()` first, `:673-679`). So while the prompt is up, a second
CTA press would pass the guard. On both platforms the modal physically covers the CTA, which is
why the phone never hardened it. **Trigger:** if P5.2 ever renders the Export tab's footer
CTA outside the modal's scrim (or adds a keyboard shortcut for it), add `|| showValidationModal`
to `isExporting` and pin it — do NOT let a bare re-press reach `requestExport`.

### 70j. CONTRACT for P5.2/P5.3 — the shell must advance the stage in the same handler

`requestExport` returns `{ kind: 'run', state }` with the state UNTOUCHED for the three
single-artifact pipelines (`location`, `location-geojson`, `case-map`), because on the phone
their stages come from the service's `onStageChange` callback rather than the handler. The
consequence is that `isExporting` stays false until the shell calls `advanceStage`, so the
shell must do so in the same event handler it starts the run. Faithful to the phone, and safe
in React (one handler per event), but it is a contract rather than a structural guarantee.
**Trigger:** if P5.3's pipeline ever starts a run across an `await` boundary before its first
`advanceStage`, move the stage flip into `requestExport`'s run arm.

### 70k. FLAG for P5.2/P5.3 — two ported strings are forward-looking claims

`resolveExportPlan`'s artifact line ("CASE ZIP · CANONICAL · INCLUDES CASE MAP", …) and
`describeValidationPrompt`'s summary ("The ZIP will be created without any PDF notes.") describe
the artifact the flow is ABOUT. They are lifted verbatim because the matrix quotes them as
contract strings and softening them would leave the visitor unable to tell what they just
agreed to. The honesty rule is satisfied at the TERMINAL step, which is D4's own placement and
P5.3's territory. **Trigger:** P5.3 must land the honest "downloads aren't available here"
notice at the end of every ZIP pipeline; if it doesn't, these two strings become the demo's
only statement about the artifact and the pair reads as a fake success.

### 70l. `DEMO_EXPORT_STAGES` — a new guard rail, not a port

`STAGE_MESSAGES` is ported whole (contract, row 25), but `'sharing'` ("Opening share dialog...")
precedes a real OS share sheet the browser has no equivalent of. `DEMO_EXPORT_STAGES`
(`validating` / `generating` / `zipping`) is the subset the simulated pipeline may enter, so
P5.3 has something to assert against rather than a comment. **Trigger:** none — delete it only
if a browser share target ever makes `'sharing'` truthful.

## 71. P5.4 (parity/p5-casemap) — the real Case Map download: deltas, refutations & residuals

**Source:** plan §5 P5.4 / decision D4. Phone spec: `src/features/case-management/case-map-export/`
(README, `services/case-map-export-service.ts`, `template/`, `scripts/build-template.mjs`),
`services/geojson-service.ts`, ui-mapping `03-tab-map.md`, phone-inventory §"Case Map export
sub-feature". Nothing here blocks the package; everything is recorded so it does not evaporate.

### 71a. Media in the exported map: nothing is embedded, and nothing should be

The brief asked how the exported map handles captured photos — `blob:` URLs die with the tab,
and a rehydrated capture has no URL at all (`MediaItem.url` is optional by P4.1/D2 design,
`engine/types/index.ts:252-274`). **The question does not arise: the Case Map embeds no media
at all, on either side.**

Evidence, phone-side and conclusive:
- The map's ONLY data source is `generateCaseGeoJSON(caseId)` (`case-map-export-service.ts:167`).
  That builder emits three feature kinds and not one media property —
  `geojson-service.ts:47-160` (location), `:189-241` (incident), `:281-306` (camera). No
  `photos`, `videos`, `audios`, `mediaCount`, no URI of any kind. The one adjacent thing it
  deliberately drops is the OCR image URIs, "device-local paths are not portable in an exported
  file" (`geojson-service.ts:124-127`).
- The template reads nothing of the sort: every property the map's JS touches is enumerable
  (`p.<name>` across `prototype/assets/case-map.app.js`) and the set is the GeoJSON's. The only
  `media` tokens in the whole 1546-line template are two `@media` CSS queries
  (`template/case-map.template.html:576,582`). The only `background-image` is a basemap-style
  thumbnail (`case-map.app.js:677`).

So the demo's port embeds no media either, and no data-URL inlining or omission notice was
needed. This is the phone's design, not a demo shortfall: the map is a geospatial console over
the case's *geometry and paperwork*; media rides in the ZIP's per-location folders, which is a
different (honestly-stubbed) export. **Trigger:** if a future phone change puts a media
property into `generateCaseGeoJSON`, this decision reopens — and the demo's answer will have to
be data URLs for live captures plus an honest per-item notice for rehydrated ones, because a
`blob:` URL written into a downloaded file is a dead link the moment the tab closes.

### 71b. TWO PHONE DEFECTS found while porting the template (back-port candidates)

Both are in the phone repo, which is read-only for this effort; neither has a demo consequence
(the port fixes both, see 71c). Recorded here so the orchestrator can file them.

1. **The dev-only sample-data `<script>` ships in every exported Case Map.**
   `scripts/build-template.mjs:73` intends to strip it:
   `html.split('  <script src="assets/case-map.data.js"></script>\n').join('')`. The key ends
   in a bare `\n`; the prototype was authored with CRLF, so the split matches nothing and the
   tag survives. Verified in the artifact the app actually imports: decoding
   `template/case-map.template.ts` (CRLF throughout, 1542 CRLF pairs) shows
   `<script src="assets/case-map.data.js"></script>` intact before the inlined app JS. Every
   exported `Case Map.html` therefore requests an `assets/` directory that is not in the ZIP —
   a 404 on a court-facing artifact. Functionally benign (`window.SAMPLE_CASE` stays undefined,
   so `case-map.app.js:111` cannot fall back to sample data), but it is a broken reference in
   an evidence export, and `build-template.mjs`'s post-build guards (`:79-83`) check only the
   three tokens and a leaked `pk.` — nothing asserts the strip happened.
   *Fix shape:* CRLF-tolerant strip (`/[ \t]*<script src="assets\/case-map\.data\.js"><\/script>\r?\n/`)
   plus a post-build assertion that no non-`https://` `<script src>` survives.
2. **Every exported Case Map is titled with a SAMPLE case number.**
   `template/case-map.template.html:6` is `<title>Case Map — OCC-2026-00417</title>`, inherited
   verbatim from the prototype, and nothing in `case-map.app.js` sets `document.title` (grep:
   the only `.title` write is a control's tooltip at `:796`). So the browser tab, and any
   PDF-printed header, of every exported map for every case reads someone else's OCC.
   *Fix shape:* tokenize the title in `build-template.mjs` and inject from `meta` in
   `buildCaseMapHtml` — which is exactly what 71c did on the demo side.

### 71c. Three deliberate deltas from a verbatim port

The template is copied byte-for-byte by `tools/port-case-map-template.mjs` (which is the
re-port path — the phone stays the source of truth for the map's HTML/CSS/JS; the demo never
edits it). Three things do NOT cross verbatim:

1. **The 71b.1 sample-data tag is dropped.** Restores the phone's own stated intent. A 404 in
   a file we hand a visitor is not something to reproduce for fidelity's sake.
2. **`<title>` is tokenized to `__CASE_TITLE__`** and injected as `Case Map — <case number>`
   (HTML-escaped; the case number is visitor-typed). Fixes 71b.2 for the demo. This is the only
   token the phone does not have; `buildCaseMapHtml`'s SIGNATURE is unchanged (the title derives
   from `meta`), so a back-port is additive.
3. **`encodeJsonForScriptTag` escapes `<` to the JSON escape `\u003c`** on the way into the two `application/json` tags —
   the phone passes raw `JSON.stringify` (`case-map-export-service.ts:143-144`), which does not
   escape `<`, so a location name containing `</script>` closes the data tag early. The map's
   reader swallows the resulting parse failure in a bare `catch {}` (`case-map.app.js:109`) and
   renders an EMPTY map with no error anywhere. Lossless (`\u003c` is valid JSON and parses back
   to `<`). **Trigger for all three:** the next time anyone touches the phone's
   `case-map-export` sub-feature — the fixes are ~3 lines each and the demo carries a working
   reference implementation.

### 71d. `buildCaseMapMeta` takes `generatedAt`; the phone reads the clock inline

Phone: `generatedAt: new Date().toISOString()` inside the builder
(`case-map-export-service.ts:112`). Demo: a required parameter, supplied by the bridge from the
`clock.now()` seam. The engine holds no ambient time reads (feature CLAUDE.md), and it makes the
injected JSON assertable byte-for-byte. Not a deferral — recorded because it is a signature
divergence a re-porter will notice.

### 71e. `classification` / `incidentDateTime` stay unset on both sides

`CaseMapMeta` carries them (and the map lights up a classification chip + a red incident line on
the scope timeline when they are present), but neither `Case` (phone, per its own comment at
`case-map-export-service.ts:122-124`) nor `DemoCase` (`engine/types/index.ts:318-340`) has such
a field. Both sides export without them. **Trigger:** whichever schema gains an incident
date/time first — the map needs no template change, only the two lines in `buildCaseMapMeta`.

### 71f. The exported map still needs the network for its basemap — by construction

The case DATA is fully embedded and renders offline; Mapbox GL JS/CSS, the tiles and Google
Fonts load from CDN (`template/case-map.template.html:9-15`). This is inherent to any web map
and is the phone's behaviour too. With no `NEXT_PUBLIC_MAPBOX_TOKEN` the demo still exports —
the phone does the same (`resolveMapboxToken`, `:56-67`) — and, unlike the phone (whose
`logError` the operator never sees), says so on the banner. Not fixable, only disclosed.

### 71g. Residual — the case-map export exists, the Export tab does not yet

`hasPlottableFeatures` is ported from the phone's non-camera guard
(`geojson-service.ts:553-562`) and is currently used only to decide whether the success banner
warns that the file opens empty. The phone additionally uses it to REFUSE a whole-case GeoJSON
export outright. The demo's GeoJSON/ZIP exports are honest stubs (`EXPORT_GEOJSON_NOTICE` /
`EXPORT_ZIP_NOTICE` in `DemoExperience`). **Trigger:** P5.2's Export tab — when a real
selection/validation surface lands, re-point those two notices and reuse this predicate for the
"nothing to export" arm rather than growing a second copy.

### 71h. Residual — `MapScreen`/`MapBottomSheet`/`LocationList` were touched from outside P6.1

P6.1 owns the map screens. P5.4's footprint on them is three forwarded `onExportMap?` props and
one footer button, all marked `SEAM(P6.1)` in source and none of it touching the canvas, the
markers or the sheet's drag/detent machinery (P6.1's stated scope: clustering, filters, Turf
proximity, camera markers, overlay states — plan §5 P6.1). Placed there rather than behind a
P5.2 seam because the phone's export entry point IS the map sheet's list footer, not the Export
tab (ui-mapping 03:167,182; `04-tab-export.md:359` confirms `handleExportCaseMap` "is never
called by `export.tsx` at all"). **Trigger:** P6.1's rebase — expect the three props, keep them.

### 71i. Refutation — matrix row 20's "(#36)" cross-reference is stale

Row 20's Delta says the phone's list-mode footer "additionally holds **Export Map** (#36)", and
row 17's says the `useExportFlow` hook-in is "the only unmirrored piece (see #36)". Row 36 in
the current matrix is *OCR Capture Route Wrapper*. There is no Export Map row; the pointer is
left over from an earlier numbering. Recorded rather than fixed — agents do not edit the matrix.

### 71j. Test-infra note — `vi.doMock` on a DYNAMICALLY-imported id contaminates the rest of the file

Measured while pinning the failed-chunk arm. `vi.doMock('@/features/demo/engine/logic/case-map',
() => { throw … })` inside one `it` correctly makes that test's `await import()` reject — and then
every LATER test in the same file rejects too, even after `vi.doUnmock(...)` **and**
`vi.resetModules()` in a `finally`. The throwing factory stays cached against the module id;
`doUnmock` only stops future resolutions consulting the registry. Symptom is confusing: the
sibling tests fail on a `findByTestId` timeout for a completely unrelated notice.

The working shape is a SEPARATE suite file with a top-level `vi.mock`, since vitest's module
isolation is per file — `DemoExperience.case-map-chunk.test.tsx`. Worth knowing before the next
agent tries to pin a lazy-import failure inline. **Trigger:** none — this is a note, not a debt.

## 72. P6.1 map feature depth — deliberate choices and residuals

**Source:** package P6.1 (plan §5, matrix row 19), branch `parity/p6-map`. Everything the brief
asked for shipped; this section records the calls a reviewer would otherwise re-derive, and the
three things left open.

### 72a. DELIBERATE — the `supercluster` package, not mapbox-gl's built-in `cluster: true`

Both run the same library. The phone's clustering is `@rnmapbox/maps`' ShapeSource, which its own
comment describes as "supercluster under the hood" (`cluster-press-service.ts:5-9`); mapbox-gl's
GeoJSON source runs supercluster in a Web Worker. Running it in-process buys three things the
worker path cannot:

- `getClusterExpansionZoom` is **synchronous and observable**. Behind the worker it is a promise
  resolved by native code that jsdom cannot drive, so the phone's expansion maths
  (`computeClusterExpansionCamera` — the 0.5 nudge, the zoom-20 clamp) would have been untestable
  at unit level, which is precisely why the phone factored it into a pure service in the first
  place.
- the cluster **count label stays local**. Under mapbox-gl the count is a SymbolLayer, i.e. a
  network glyph fetch — the failure mode `ClusterBadge.tsx:38-45` documents at length, where a
  missing glyph renders no text and no error.
- the existing **DOM-marker seam survives**. Location pins, the incident teardrop, cluster bubbles
  and cameras are all `mapboxgl.Marker` elements carrying `data-marker-id` / `data-marker-kind`,
  so the suite's marker assertions kept working and the marker chrome became testable without
  WebGL (`markerElements.ts`).

Cost: pins are re-plotted on every `moveend` rather than being GPU layers. At demo scale (a case's
locations) that is dozens of DOM nodes. **Trigger to revisit:** an aggregate All-Cases map, or any
projection that can exceed a few hundred pins.

### 72b. DELIBERATE — three copy/behaviour adaptations, each because the phone's version asserts
something untrue of the demo

- **Error overlay copy.** Phone: the caught SQLite error's `.message`, fallback
  `Failed to load map data` (ui-mapping 03:96). Demo: `Failed to load the map.` — there is no data
  fetch; the only thing that can fail is the Mapbox style/tile load. `Retry` is verbatim.
- **Proximity toggle fallback chain.** Phone tries previous centre → first plottable feature → a
  GPS read → a static North-America centroid (MapHost.tsx:370-431). The demo keeps steps 1 and 2,
  drops the GPS read, and uses the map's own centre instead of a static coordinate. A browser
  geolocation prompt fired by a map-filter toggle asks for more than the feature needs, and the
  live camera centre is strictly better information than a hard-coded continent centre.
- **Controls placement.** `MapControls` stacks BELOW the "Change Case" pill rather than sharing its
  band. On a 390-430 pt phone the two coexist; the demo's screen slot is 378 px wide, where three
  status pills plus the pill collide. Control set, copy, and row order are otherwise the phone's.

### 72c. RESIDUAL — no scale bar

The phone's map carries `MapScaleBar` (ui-mapping 03:108): a fixed 80 pt bar whose label is
recomputed from zoom + latitude and snapped to round steps, replacing the native ornament. The
demo has neither — mapbox-gl's own `ScaleControl` is available and would be a two-line add, but it
has the same defects the phone rejected the native ornament for (variable width, jumpy steps), and
porting `compute-span-label.ts` is a package of its own. Not in P6.1's brief.
**Trigger:** the next P6-territory round, or any review that treats ui-mapping 03's marker/overlay
table as a completeness checklist.

### 72d. RESIDUAL — clusters do not expose their members to the sheet

Tapping a cluster expands the camera (phone parity). Neither app offers "list the N locations in
this cluster" in the bottom sheet. Recorded so a future reviewer reads the omission as parity
rather than a gap. **Trigger:** only if the phone grows the affordance first.

### 72e. RESIDUAL — the long-press seam is a container-level pointer timer, not a mapbox event

mapbox-gl has no `longpress`, so `MapCanvas` runs its own 500 ms timer (RN's `delayLongPress`,
what the phone's `onLongPress` fires on) on the canvas container, with a 10 px slop that
reclassifies a travelling hold as a map drag, then `map.unproject`. ~~Two known edges, both
acceptable for a demo and neither observed: a two-finger pinch whose first contact never moves
more than 10 px can still fire (mapbox handles the gesture itself, so the ring simply re-centres
under the pinch), and a hold that starts on a marker element bubbles to the container, so a long
hold on a pin both selects it and moves the ring.~~ **Trigger:** a review finding either behaviour
on a touch device, or the arrival of a pointer-gesture helper in `ui/primitives/`.

**AMENDED (P6 review R-5 — both filed edges were mis-stated; the seam itself stands, the two
disclosures do not):**

- **The marker edge was understated on three counts, and it is FIXED, not deferred.**
  (1) *Consequence.* "Both selects it and moves the ring" is true only when proximity is already
  on. From the default OFF state `handleLongPress` unconditionally activates it, so a hold on a
  pin drops every other location and the incident off the map **and** out of the sheet at the
  1 km default, centred on a point nobody chose — recoverable only by noticing the Proximity ON
  pill, and landing in R-6's false empty-state copy when nothing survives.
  (2) *Reach.* Not touch-only. Pointer events fire for mouse, so a press-and-hold left button
  while reading a pin triggers it on the desktop path the demo is primarily viewed on — the
  filed trigger ("a review finding either behaviour on a touch device") was met and exceeded.
  (3) *Surface.* `Marker.addTo` appends into `map.getCanvasContainer()` and mapbox's attribution
  control is a descendant of the same container, so a hold on "Improve this map" activated
  proximity too — a surface the original disclosure never named.
  Fixed in the P6 fix round: `onPointerDown` now refuses non-primary pointers and any target
  under `[data-marker-id], .mapboxgl-ctrl`.

- **The pinch edge is STRUCK as never-real.** `pressOrigin` is a single shared ref and every
  `pointerdown` cancels-then-re-arms from the newest contact, so in a two-finger gesture
  finger 1's first `pointermove` is measured against finger 2's origin — two contacts on a
  378 px surface are essentially never within the 10 px slop, so the timer cancels immediately.
  The cross-pointer comparison that reads like a bug is exactly what made the pinch safe. The
  `isPrimary` guard added above now closes it by construction as well; recorded here so the
  analysis is not re-derived a third time.

What genuinely remains of 72e is only the shape: this is a hand-rolled pointer timer rather
than a gesture primitive. ~~**Trigger (unchanged):** the arrival of a pointer-gesture helper in
`ui/primitives/`.~~

**TRIGGER CORRECTED (fix-delta, web NEW-2):** that sentence deferred to an arrival that had
already happened. `ui/primitives/useLongPress.ts` predates P6 and has FOUR callers
(`CasesScreen`, `RowActions`, `MediaLibrarySheet`, `DashboardScreen`); the map is its fifth
hand-rolled sibling, not a pioneer waiting for a primitive. The micro-round took the cheap half —
the map now imports `LONG_PRESS_MS` and `LONG_PRESS_MOVE_TOLERANCE_PX` from the primitive, and
carries its `e.button !== 0` guard — so the FEEL and the button rules are shared even though the
mechanism is not. **Real trigger:** the convergence work in §79i, i.e. the next touch to this
seam.

---


## 73. P5.2 (parity/p5-tab) — the Export tab: screen states not ported, decisions, and the seam P5.3 closes

**Source:** parity plan §5 P5.2; matrix rows 7, 24, G7; phone `app/(tabs)/export.tsx`,
`app/(tabs)/_layout.tsx`, `src/features/case-management/export-hub/components/*`, ui-mapping 04.
Shipped as `features/demo/ui/screens/export/{ExportHub,ExportCaseCard,ExportLocationRow}.tsx`,
the `TAB_VIEWS`/`TAB_LABELS` registry, and the bridge's selection state. Nothing below is a bug.

### 73a. NOT PORTED — three of the hub's five screen states (loading / error / retry) and pagination

The phone's `ExportHub` renders five states because `useCases` reads SQLite: a spinner until
`hasLoaded`, an error state AHEAD of empty, a stale-data banner with Retry (BUG-037), and a
`FlatList` with pull-to-refresh + `onEndReached` pagination. The demo's cases are already in
memory in the session store and arrive as this render's own input — there is no read that can
fail, no truncation to page past, and no second writer to refresh from. Faking any of them
(least of all a "Couldn't load cases" banner over data that loaded fine) is the theatre the
honesty rule exists to prevent. Empty and list are the two real states. **Trigger:** if the
demo ever loads cases across an async boundary (a shareable session link, a server-backed
sample dataset), port the error-ahead-of-empty precedence FIRST — it is the state whose absence
would be a lie rather than a simplification.

### 73b. NOT PORTED — the row-toggle haptic

`ExportLocationRow.tsx:41` fires `Haptics.impactAsync(Light)` on every toggle, and the phone's
a11y structure exists partly to guarantee exactly one haptic per press. The web has no
equivalent that isn't a claim about a device the visitor may not be holding. **Trigger:** none.

### 73c. Headerless by parity (decision, not an omission)

The Export tab is the only tab screen with no title: `export.tsx` renders straight into
`Screen` with no header, and ui-mapping 04 § Header records it. The demo's other tab screens
(Cases, Dashboard) have big titles because the phone's do. Recorded so "the Export screen is
missing its heading" isn't re-raised as a gap.

### 73d. Prune on READ rather than in an effect (decision)

Phone `export.tsx:51-69` re-validates the selection in a `useEffect` keyed on `cases`, because
its list arrives asynchronously. The bridge instead calls `pruneSelection` in the render body
(the same rule, one commit earlier), and every write starts from the pruned value rather than
the raw state — so the state converges without a second render pass and there is never a frame
in which a deleted location is still tickable. The raw `useState` may briefly hold a superset;
it is unobservable, and writing it back would be the effect this deliberately avoids.
**Trigger:** none, unless the demo's case list ever stops being synchronous (see 73a).

### 73e. "This case's locations" is the RENDERED rows, not `DemoCase.locationIds` (decision)

P5.1's brief offered `DemoCase` as a structural `ExportSelectableCase`. The bridge instead
derives `{ id, locationIds }` from `caseCards` — the same view models the hub renders — and
passes those to every engine call, while the card computes its tri-state from the rows it is
drawing. The two are the same data today; deriving from the cards makes it impossible for the
visible list, the checkbox state and the footer's N to disagree. A selection surface must only
be able to select what it shows.

### 73f. SEAM(P5.3) — what the modals package replaces, and with what

Two grep-able markers in `ui/DemoExperience.tsx` (`// SEAM(P5.3): export flow dispatch`):

1. `onExportPress` currently raises `EXPORT_RUN_NOTICE` ("Running an export isn't available yet
   — it lands with the export modals."). P5.3's own seam note names the replacement exactly —
   `requestExportFlow({ type, … })` keyed on `ExportSelectionPlan.dispatch`
   (`'case' | 'location' | 'case-subset'`), ids travelling on the request. The join is
   mechanical: the plan is already resolved once and already names the pipeline; the CTA must
   NOT re-derive the branch (the export engine's invariant).
2. `isExporting={false}` on the hub. P5.3 owns the flow state, so nothing can be running yet;
   the literal becomes `isExporting(flow)` and the hub's already-built disabled treatment (case
   checkbox, location rows, CTA — deliberately NOT Clear, matching the phone) goes live.

Also for the reconciler: P5.2 retuned `EXPORT_ZIP_NOTICE` / `EXPORT_GEOJSON_NOTICE` from
"it lands with the Export tab" (now false — the tab is here) to "it lands with the export
flow". P5.3's `parity/p5-modals` routes those two call sites through the real flow instead;
**P5.3's version supersedes this one** wherever the two branches touch.

### 73g. RESIDUAL — Clear is not gated on a running export

Ported as observed: the phone leaves the footer's Clear button enabled while every checkbox and
the CTA lock during a run (`ExportHub.tsx:245-253` has no `disabled`), and ui-mapping 04 records
it as observed-not-asserted. Kept identical rather than "fixed", so the demo doesn't silently
diverge on a phone behaviour someone may have chosen. **Trigger:** if the phone ever gates it,
gate it here in the same change.

### 73h. RESIDUAL — the case status pill reads "Draft" where the phone's badge reads "Active"

`CaseStatusBadge`'s `getStatusConfig` displays `CaseStatus.DRAFT` as **Active** (its own comment
calls the enum rename a deferred follow-up); the demo's `caseStatusTheme` labels it **Draft**.
Pre-existing and demo-wide — the Cases list and dashboard cards already read "Draft" — so the
Export card reuses the same mapper rather than introducing a second vocabulary on one screen.
**Trigger:** a single change to `screenData.caseStatusTheme` fixes every surface at once; do it
there, never per-screen.

### 73i. SETTLED — `isChapterId` now asks the registry (fixed here, recorded so it isn't re-derived)

The store's guard was `v !== 'map' && !LAUNCHABLE.includes(v)`: a negative check that classified
every FUTURE non-chapter view as a chapter. Adding the Export tab made `setView('export')` set
`currentChapter: 'export'` — the value `closeLaunch()` returns to and the key
`NARRATION[currentChapter]` is read with. It is now the positive `CHAPTERS.includes(v)`,
matching `persistence.ts`'s own guard, and pinned by a test that loops the tab-only views rather
than naming `map`. **No trigger — a decision, recorded because the same shape (a negative
membership test standing in for a registry lookup) is what rotted.**

### 73j. `TAB_LABELS` (engine) and `TAB_ICONS` (UI) are a pinned pair

Tab order and labels live in `engine/content/screens.ts`; the SVG glyphs cannot (they are JSX —
the `content/explore.ts` reason), so they live in `TabBar` as a total `Record<TabView, …>`. A tab
added to the tuple therefore fails to compile until it has both. A test additionally pins that
the rendered aria-labels equal the registry's, in registry order. **Trigger:** none; if the icon
set ever moves to name-strings the way `DRAWER_DEFS.icon` does, fold both into one def list.

### 73k. Refutation — ui-mapping 04's error-state copy is stale (the phone won)

Doc line 20 quotes the hub's error state as `Couldn't load cases. Leave and reopen this tab to
retry.`; the source renders `Couldn't load cases. {error}` plus a Retry button
(`ExportHub.tsx:174-180`), and the doc's `ExportHub` line citations for the echo row/footer are
~17 lines short because BUG-037's stale-data banner landed after the mapping. Immaterial to this
package (73a ports neither state), but recorded so the next reader of that doc doesn't lift the
dead sentence.

## 74. P5.3 (parity/p5-modals) — export modals + the flow shell: boundaries, strengthenings, and the seams left open

**Source:** parity plan §5 P5.3; matrix rows 25/27/28; decision D4; the P5.1 contracts in §70.
Phone `src/components/export/{ExportModal,ExportActionSheet}.tsx`, `src/hooks/useExportFlow.ts`,
`app/(form)/completion.tsx`, `app/(tabs)/cases.tsx`, ui-mapping `04-tab-export.md` +
`08-wizard-d-completion.md`. Shipped as `ui/screens/{ExportModal,ExportActionSheet,exportNotices}`
plus the flow shell in `ui/DemoExperience.tsx`. Nothing below is a bug.

### 74a. §70k discharged — where the honest terminal lives, and what it says

Every ZIP pipeline (`case` / `case-subset` / `location`) and both single-file pipelines end in a
BLOCKING `AlertDialog` built by `describeExportTerminal` (`ui/screens/exportNotices.ts`), titled
`Downloads Aren't Available in the Demo` — D4's own wording, so the shipped string matches the
ruling. The body names what the real app would have written (so
`CASE ZIP · CANONICAL · INCLUDES CASE MAP` and `The ZIP will be created without any PDF notes.`
are ANSWERED rather than softened), says plainly why there is no file, and points at the Case
Notes / Time-Offset PDFs, which print for real. A blocking dialog and not the auto-dismissing
`DemoNotification`: the one honest sentence in the flow must not be able to time out unread.
**No trigger — this is the decision, recorded so it is not re-litigated.**

### 74b. STRENGTHENING over the phone — §70i's residual is closed in the shell, not the engine

`requestExportFlow` returns early while `showValidationModal` is true. The engine is frozen
(P5.1's), so the guard lives at the shell rather than inside `isExporting`. Rationale beyond the
phone's: the phone relies on the modal physically covering the CTA, but the demo's narration rail
sits OUTSIDE the phone frame and can move the visitor while the prompt is up. Pinned in
`DemoExperience.export.test.tsx` ("§70i: with the validation prompt up, a second dispatch is
inert"). **Trigger:** if the engine is ever unfrozen, fold `|| showValidationModal` into
`isExporting` and delete the shell guard — one guard, not two.

### 74c. §70j satisfied two different ways, on purpose

`case` / `case-subset` / `location` flip to `validating` inside `startExportRun`, synchronously,
before any timer — the contract as written. `location-geojson` and `case-map` never flip at all:
they terminate inside the same handler, so there is no window a second press could enter. That
is deliberate rather than an oversight — the phone gives neither pipeline an `onStageChange` and
calls them sub-second (`useExportFlow.ts:906-911`), so printing "Validating locations..." over
them would be inventing work. **Trigger:** if either ever gains real asynchronous work (P5.4's
case-map download is the obvious candidate), it needs a stage flip in the starting handler before
the first `await`.

### 74d. The PDF pass is re-derived, never read off `validationResult`

`pdfPassFor(run)` re-runs `validateLocationForPdf` against the store. The two routes into a run
disagree about `validationResult`: a straight-through dispatch carries the verdict, while
Continue-anyway CONSUMES it (`continueValidatedExport` nulls it in the same write that closes the
modal), so a shell that read the field would generate zero PDFs after every "Continue". The phone
has the same shape for the same reason — `executeExport` re-validates internally
(`pdf-export-service.ts:971-993`) and never trusts the modal's earlier answer.

### 74e. NOT BUILT — PasswordModal (matrix row 26), per D4

No password round-trip, no `resolvePasswordPolicy`, no `encryptionNote` suffix (§70c). The
terminal notice therefore never claims the archive would be encrypted, even though the phone's
would be: an encryption promise with no encryption behind it is exactly the fake-security claim
the honesty rule exists to prevent. **Trigger:** real client-side encryption (D4 leaves that door
shut for now).

### 74f. The `case-map` arm has no caller yet — SEAM(P5.4)

`ExportRun` is a closed union and `describeExportTerminal` is exhaustive over it, so the
`case-map` branch exists because the type demands it, not because a button reaches it. Neither
Completion's scope sheet (`location` / `case` / `cancel`) nor the location chooser
(`location` / `location-geojson`) dispatches it; the map tab's "Export Map" is a different
surface. The dispatch point is marked `// SEAM(P5.4): real case-map download lands here` in
`startExportRun`, and its interim copy says the map was NOT generated rather than blaming the
platform — it is the one artifact D4 says a browser genuinely can produce. **Trigger:** P5.4's
merge replaces that arm; P6 (or the map sheet) supplies the caller.

### 74g. SEAM(P5.2) — the exact handler the Export tab's CTA calls

`requestExportFlow(request: ExportRequest): void`, declared in `ui/DemoExperience.tsx`. The tab
builds its request from `ExportSelectionPlan.dispatch`:
`'case' → { type: 'case', caseId }`, `'location' → { type: 'location', locationId }`,
`'case-subset' → { type: 'case-subset', caseId, locationIds }`. There is deliberately NO
store-reading overload and no plan-shaped convenience wrapper: ids travel on the request and come
back resolved on the returned `ExportRun`, which is the structural form of PR-87 HIGH-1 and the
reason the demo needs neither the phone's `exportTarget` state nor its post-render dispatch
effect (`cases.tsx:539-575`).

### 74h. `exportScope` is not in `EXPLORE_ITEMS`

The rail checklist lists destinations. The scope chooser is a step INSIDE Completion — the same
relationship `ocr` has to Time Offset, which `explore.ts`'s own module note already uses to
explain why that shape gets no row. Recorded in `explore.test.ts` next to the compile-time
`Record<ModalId, true>` guard so the next person to add a modal id sees the decision. The Export
TAB is a destination and brings its own row (P5.2).

### 74i. §52.2 discharged — the chooser's two export buttons are live

Both placeholder banners are deleted and the buttons run the real flow, dispatching against the
PRESSED row (the phone's `source.id`, `cases.tsx:577-592`) rather than the open location. §52.2's
trigger named P5.2/P5.3 and asked for exactly this; consider it closed.

### 74j. RESIDUAL — a running pipeline follows the visitor across screens

The progress overlay is portaled into the phone frame and is not view-scoped, so a rail jump
mid-export leaves "Creating ZIP archive..." over the Cases screen for the remaining ~1s, and the
terminal notice lands wherever the visitor now is. This is arguably MORE truthful than hiding it
(the run really is still going, and the phone's own export is app-modal), and the standing
"leaving Completion closes a standing alert" effect still clears the notice on the next
navigation. Not fixed because every alternative — cancelling the run, or scoping the overlay to
`view === 'completion'` — would either lie about what stopped or hide a live operation.
**Trigger:** if a future pipeline runs long enough that stranding it reads as a stuck screen, add
a run-generation token (the `importGen` idiom) and cancel on view change, saying so in the notice.

### 74k. Stage cadence is a demo constant, not a ported value

`EXPORT_STEP_MS = 550` in `ui/DemoExperience.tsx` (exported so the flow tests step by the real
cadence). The phone's stages are however long the filesystem takes; there is no number to port.
It is the only fabricated quantity in the flow — the stage ORDER, the k-of-n counter, the
location names and every string are real. **No trigger.**

### 74l. The prompt's THIRD arm lives in the shell (`pendingExportCaseId`)

`ExportFlowState` arms the pipeline TYPE and the subset ids, but not the case — the engine takes
the case id as an ARGUMENT to `continueValidatedExport`, by design (ids never re-read from
state). So the shell holds `pendingExportCaseId`, written when `applyValidation` returns
`prompt` and cleared on Cancel and on every non-ignored Continue, mirroring the machine's own
"Continue consumes the modal on every path".

Not cosmetic: the first draft re-derived the case at Continue time from the OPEN LOCATION, which
is correct only while every validated dispatch comes from Completion (where the two always
agree). P5.2's Export tab can arm a case that is not the open location's, at which point a
prompt raised on case A would have resumed against case B — the scope escalation the arming
rules exist to prevent. Pinned in `DemoExperience.export.test.tsx` ("Continue resumes the case
the prompt was ARMED for"), which moves the open location out from under an open prompt.
**Trigger for P5.2:** nothing to do — dispatch through `requestExportFlow` and the arm is taken
from the request. Do NOT add a second Continue path that supplies its own case id.

---

## 75. P5.1 fix round (parity/p5-fix-engine) — R-12/R-15/R-16/R-25/R-26 dispositions

**Source:** `docs/code-reviews/parity/p5/p5-review-r1-vetted.md`, the P5.1-routed minors.
Four FIXED, one DEFERRED with the reviewer's own sanction. None refuted. Territory this round
was `engine/logic/export/` only — three sibling agents were editing the UI/flow/case-map layers
in parallel.

### 75a. R-16 — `DEMO_EXPORT_STAGES` is now `advanceStage`'s parameter type (FIXED, `64a22e0`)

§70l promised the constant would be "something to assert against rather than a comment" and
then asserted nothing — `DemoExportStage` had zero uses, so `advanceStage(state, 'sharing')`
compiled and would have printed "Opening share dialog..." in a browser with no share sheet.
The signature now takes `DemoExportStage`; all seven call sites already conformed.

A second exclusion the review did not name is now load-bearing too: `'idle'` is out because the
return to rest belongs to `resetExportFlow`, which ALSO clears the counter and the location
name — an `advanceStage(state, 'idle')` would have left both behind for the next run to
inherit. Two `@ts-expect-error` probes pin both exclusions (tsc's unused-directive check is
what keeps a probe honest), plus a loop over every member that must still pass.

### 75b. R-26 — the dead guard deleted, the real invariant pinned (FIXED, `0b167f1`)

`caseCheckboxState`'s `locationIds.length === 0` early return was unreachable-equivalent: the
later `selectedCount === 0` check answers the empty case identically on every input. Deleted,
along with the test's false claim to pin it.

What actually keeps the phone's bug closed is now named in both the doc comment and the test:
the phone needs an explicit `hasLocations` gate because its `allSelected` compares counts
directly and `0 === 0` is true (`ExportCaseCard.tsx:82`); here the zero check is ORDERED AHEAD
of the length comparison. **Mutation-verified** — swapping the two returns makes the empty case
read `'all'` and the retitled test goes red (1 failed / 40 passed). A second assertion covers
the armed-on-this-card path, where the ordering does the work.

### 75c. R-25 — the misnamed prune test (FIXED, `0b167f1`, grouped with R-26)

`selection.test.ts:155` was named "DISARMS the full-case intent when a location is dropped"
while correctly asserting the intent is KEPT. Renamed to "KEEPS the intent when the dropped ids
were never the case's", with the distinction from the genuine disarm (set intact, case grew
underneath) spelled out and the covering test named. Grouped with 75b: same defect class — a
test describing something other than what it defends — in one file.

### 75d. R-12 — the contract strings pinned against the phone (FIXED, `c89c9ca`)

Every existing assertion read `EXPORT_ALERTS` back THROUGH the machine, pinning the routing
while staying green under any copy mutation (the tests lane proved it with `MUTANT-COPY-*`).
One literal `toEqual` block now mirrors the `STAGE_MESSAGES` shape, with all six strings
re-verified against phone source before writing. The two §70g adaptations are annotated INSIDE
the expectation, so the block documents them rather than quietly baking them in.
**Mutation-verified** (`'Please create a location first.'` → `MUTANT-COPY`: 1 failed / 45
passed). Riders: no alert may ship blank, and the record stays frozen.

**Half NOT fixed here:** `noSelection` still has no production caller. That is R-13, routed to
ORCHESTRATOR-SEAM — the fix is in `DemoExperience.tsx`'s `onExportPress`, outside this round's
territory.

### 75e. R-15 — the three-part validation arm: DEFERRED (the reviewer's sanctioned outcome)

**What:** the prompt's arm is decomposed into two engine fields (`pendingValidatedExport` +
`pendingSubsetLocationIds`, `flow.ts:162,164`) plus a shell `useRef`
(`pendingExportCaseId`, `DemoExperience.tsx:764`), hand-reassembled at Continue.
`ValidatedExportRun` already pairs all three, so `pendingValidatedRun: ValidatedExportRun | null`
would delete the second field, the reassembly, the bridge ref and both its assignments.

**Why deferred:** the fix has no coherent engine-only half. Changing `ExportFlowState`'s shape
changes `continueValidatedExport`'s signature (the case id stops being a parameter), which is a
`DemoExperience.tsx` edit — a file this round was explicitly barred from and which a sibling
agent was concurrently rewriting for R-5/R-6/R-7/R-14/R-17/R-18/R-22. Landing the engine half
alone would not compile; landing both would collide on the exact lines the sibling was editing.
Blast radius measured, not estimated: 8 files reference the three fields, 3 of them outside
this round's territory (`ui/DemoExperience.tsx`, `ui/screens/ExportModal.tsx`,
`ui/__tests__/DemoExperience.export.test.tsx`). The review anticipated this — "**a recorded
deferral with trigger is an acceptable outcome** — but it must be recorded in the ledger, not
left silent."

**The risk it leaves standing is real, not theoretical.** §74l records that P5.3's first draft
re-derived the case at Continue from the open location, which is correct only while every
validated dispatch comes from Completion; the Export tab breaks that assumption and the bug
was a scope escalation. That near-miss IS the evidence an incomplete arm invites caller
mistakes. What holds the line today is `caaaea2`'s test ("Continue resumes the case the prompt
was ARMED for") plus §74l's standing instruction not to add a second Continue path.

**Trigger:** the NEXT round that opens `engine/logic/export/flow.ts` and `DemoExperience.tsx`
together — one agent, one commit, no concurrent editor on the bridge. Collapse to
`pendingValidatedRun: ValidatedExportRun | null`, drop the `caseId` parameter from
`continueValidatedExport`, and delete the ref. Keep the `missingSubsetPayload` alert at the
REQUEST boundary (`requestExport`'s empty-`locationIds` arm): that one guards a caller mistake
the type cannot express, unlike the post-arm backstop the collapse makes unrepresentable.

## 76. P5.2 fix round (parity/p5-fix-tab) — R-3 (+sibling), R-4, R-13, R-19, R-20, R-23, R-27

**Source:** `docs/code-reviews/parity/p5/p5-review-r1-vetted.md`. Seven findings, seven commits,
one-to-one. Two of them (R-3 primary, R-4) are the ORCHESTRATOR-SEAM items — the CTA→flow join
written at P5.2's `SEAM(P5.3)` marker — which land here because the code lives in this territory.
Everything below is FIXED; the residuals are named at the end.

### 76a. R-3 [MAJOR] — FIXED, and the hole re-probed in both directions

The join consumed `ExportSelectionPlan.dispatch` with a trailing `else`, at the one site the
engine's invariant is about. Now a `switch` closed with `assertNever`, and `dispatch` is typed
`Extract<ExportType, 'case' | 'location' | 'case-subset'>` (the `ValidatedExportType` discipline
from `flow.ts:65`) instead of a hand-written triple. Probe: widening the union previously
compiled clean and fell into the subset arm; it now fails at the switch —
`Argument of type '"case-map"' is not assignable to parameter of type 'never'`. No import cycle:
`flow.ts` imports `stage`/`validation`, never `selection`.

**Sibling, same commit family:** `ariaChecked` in `ExportCaseCard` was a ternary chain whose
fall-through told a screen reader `aria-checked="false"` — "nothing is selected" — for any 4th
`CaseCheckboxState`. Also a closed switch now. (The other two siblings, `pdfPassFor` and
`OptionIcon`, are P5.3's.)

### 76b. R-4 [MAJOR] — FIXED; the three mutations are now each killed by exactly one test

The seam block had one test, on the `case` arm, that could not distinguish a correctly-keyed
dispatch from a hardcoded `'case'`. Three end-to-end tests added, written against the lane's
surviving mutations and re-verified here — each mutation reddens exactly one test and nothing
else: **subset** (2 of 3 ticked → `Location 1 of 2`, both ticked names, never the third, terminal
"a ZIP of the 2 selected locations") kills the §74l scope escalation; **single** (terminal "a ZIP
of this location", never "whole case") kills a nulled/dead location arm; **in-flight** (case
checkbox + rows + CTA disabled, Clear not, lock lifts at the terminal) kills a reverted
`isExporting={false}`. `seedExportable` + the P5.3 suite's `step`/`runToEnd` pair were lifted in;
fake timers are scoped to that describe block only.

### 76c. R-13 — FIXED (loud), with the reachability recorded

`if (!exportFooter || !exportView) return` became two `raiseExportAlert` arms —
`EXPORT_ALERTS.noSelection` (which had no caller until now) and `caseUnavailable`. Still
unreachable: the footer that owns the CTA renders only when both resolve, so there is no UI path
and **no test pins these arms** — the same call §70e makes about an unreachable guard. The value
is the shape: the refactor that makes one reachable cannot present as a completed export.
**Trigger:** if the footer ever renders on a nullable pair (a persisted selection, an async list),
pin both arms in the same change.

### 76d. R-19 — FIXED with `aria-current`, and that is the answer to "pick one"

The bar signalled the active destination by hue alone across four tabs. Each button now carries
`aria-current={active ? 'page' : undefined}`, pinned by a test that exactly one tab is current
and that it moves. **The convention this settles:** `aria-current` for surfaces that NAVIGATE
between destinations (this bar; `MediaLibrarySheet.tsx:558`'s selected row), `aria-pressed` for
TOGGLE groups that change what one surface shows (§67c's media filter strip,
`MediaCaptureScreen`'s mode pill). §67c is not being revisited — the two surfaces are different
kinds of control, which is why they answer differently.

### 76e. R-20 — FIXED — dead `showTabs` deleted

A merge artifact: the pre-P5 three-tab rule surviving one line above its registry-derived
replacement, with no reader and nothing in the toolchain (no `noUnusedLocals`, no ESLint) that
would ever have said so. Recorded because the *class* recurs: this repo's only defence against a
stale survivor is review, so a fix round that touches a merged bridge should grep its own
predecessors.

### 76f. R-23 — FIXED — both motion branches now execute

ExportHub's reduced-motion arm had never run: the setup file's matchMedia stub pins
`matches: false` and `useReducedMotion` latches a module-global on first use. Adopts the
`ImportTerminalProgress` seam (hoisted `vi.mock` of `motion/react`), which additionally pins WHICH
hook the footer consumes; mutation-verified. `slideDirection`'s widened dev guard gains its
`'export'` case, asserting both the fade AND the silence under `NODE_ENV=development`.

### 76g. R-27 — FIXED by construction; the test lost two arms because they stopped compiling

`TAB_NARRATION` is now `Record<TabOnlyView, ChapterNarration>`, with
`TabOnlyView = Exclude<TabView, ChapterId>` derived in the screens registry (not a third
hand-written list) — the same id space `persistence.ts`'s `EXTRA_VIEWS` is exhaustive over. A
missing tab-only entry and a chapter-key entry — which the bridge would let shadow that chapter's
own copy, since it consults this record first — are both type errors now. The content test keeps
only the runtime question (the copy is real); its two key-space arms were deleted because they no
longer typecheck, which is the finding's own success condition. `content/narration.ts` also stops
importing from `engine/store/` entirely.

### 76h. RESIDUAL — the seam's fourth moving part is pinned behaviourally, not structurally

R-4's in-flight test pins that `isExporting` is wired to the flow, but nothing prevents a future
edit from passing a *different* boolean. The engine-level guarantee would be to hand the hub the
flow state rather than a derived boolean; that is a prop-shape change across P5.2/P5.3 territory
and was not in scope for a fix round. **Trigger:** if a second "is something running" source ever
appears in the bridge (a download in flight, a sync), make the hub take the state and derive.

### 76i. RESIDUAL — `EXPORT_ALERTS.noSelection` is called but still unproducible

76c gives it a caller; it remains unreachable in practice (see the trigger there). It is now
consistent with `caseUnavailable`, which has the same status at the two `pdfPassFor` sites.

## 77. P5.3 fix round 1 (parity/p5-fix-modals) — R-5/R-6/R-7/R-3/R-17/R-18/R-22 dispositions, and the R-14 split flagged

**Source:** `docs/code-reviews/parity/p5/p5-review-r1-vetted.md`. Every finding routed to P5.3 in
that doc's owner table, plus the one it could not route cleanly.

### 77a. R-5 — the §70i guard is now pinned by a dispatch it refuses (FIXED)

The old test's second dispatch re-entered the *validated* pipeline, whose unguarded behaviour is
byte-identical to the guarded one, so the guard could be deleted with the suite green. It is now
`chooseScope('location')` — a `run`-arm dispatch, which unguarded runs to a terminal notice behind
an unanswered prompt. **Probe, both directions:** guard deleted → exactly 1 failure (this test);
restored → green. A closing assertion also pins that the refusal leaves the arm answerable, since
a guard that ate the prompt would be its own bug.

### 77b. R-6 — the progress overlay speaks now (FIXED)

`role="progressbar"` has presentational children, so every visible line was pruned from the
accessibility tree; and the `aria-live` sat on a node that mounted with its text in place. Both
halves are gone: a sibling sr-only `role="status"` region written on the next tick (the idiom
`ValidationContent` in the same file already documents), fed by the composed
`stage — counter — "location"` string so stage changes AND location ticks are both announced, plus
`aria-valuetext` on the bar. **Deliberate non-change:** the bar stays indeterminate — no
`aria-valuenow`. The zipping step has no share of the PDF pass, so any percentage would be an
invented number, which is the one thing this feature's honesty rule forbids. **Probe:** live region
deleted → 3 failures.

### 77c. R-7 — the action sheet takes focus, and its arrow keys are reachable (FIXED)

Two-effect focus in/restore + `tabIndex={-1}`, `isConnected`-guarded. The second half matters more
than the first: `keydown` dispatches at `document.activeElement`, which was outside the portal, so
the container handler never fired on the only path that opens this sheet — `role="menu"`'s promise
was unkeepable. Tests now fire from real focus rather than at the container. **Probe:** focus effect
deleted → 4 failures.

### 77d. R-3 siblings — both P5.3 sites closed (FIXED)

`OptionIcon` and `pdfPassFor` both close with `assertNever`. `pdfPassFor` gained a narrowed
parameter (`ZipExportRun = Extract<ExportRun, …>`) rather than a `default: return []`, because the
honest statement is that the two single-file pipelines have already returned by then. The primary
site (`onExportPress`) and the `ariaChecked` sibling are not ours.

### 77e. R-17 — the prompt-visibility pair is discriminated at the props layer (FIXED, half)

`ExportModalProps` is a union on `mode`; `{ mode: 'validation', validationResult: null }` is
unconstructible and the component's runtime guard plus its apologetic comment are gone. The test
that used to render that state is now a `@ts-expect-error` compile assertion, so loosening the
pairing fails the build. **The `ExportFlowState` half is NOT changed** — it is the phone's ported
shape and belongs to P5.1's frozen engine. **Trigger:** if the engine is ever reshaped (R-15 is the
natural pairing), collapse `showValidationModal` + `validationResult` there too and the bridge's
`&&` at the mount disappears with it.

### 77f. R-18 — spinner gated on `prefers-reduced-motion` (FIXED)

Reduced motion keeps the ring and drops the rotation — the ring is the only static signal that work
is in flight, and the overlay is not dismissible, so removing it entirely would leave a blank scrim.
In its own test file: the shared setup stub pins `matches: false` and overriding `matchMedia` inside
the main suite leaks the preference into neighbouring renders.

### 77g. R-22 — breadcrumb + no more `[object Object]` (FIXED, untested arm)

`console.warn` before the dialog, and a non-`Error` throw now gets a plain sentence instead of
`String(e)`. Deliberately NOT one of the ported `EXPORT_ALERTS` bodies — those name a specific
cause, and naming the wrong one is worse than naming none.

**RE-DISPOSITIONED, fix-delta D-9 — the carried test is not merely unwritten, it is
unreachable-by-construction; do NOT write it.** The trigger this entry originally handed to
P5.2's suite ("dispatch a subset whose ids the case does not own") cannot occur: the tab's
selected ids and the validator's rows derive from the identical predicate over the same store
snapshot in the same render, so a foreign id has no way in. The catch stays as a LOUD backstop
under the §70e precedent — an unreachable guard kept because its silent alternative is what the
feature's worst failure mode looks like — and the throw itself is already pinned at the engine
level (`validation.test.ts:209-231`). **No trigger.** Reopen only if a caller ever hands the
bridge ids from outside the store snapshot that produced them.

### 77h. R-14 — NOT ACTIONED by P5.3, and why (FLAG for the orchestrator)

Owner ruling is WIRE (option 1: route `exportCaseMap` through
`requestExportFlow({ type: 'case-map', caseId })`). The finding spans two agents' files and **cannot
be split without one of them shipping a lie**:

- `exportNotices.ts`'s `case-map` branch (ours) says the map "is being built; it just is not wired
  to this button yet". True only while the arm is unreachable — verified still true at
  `3aab581`: `exportCaseMap` (`DemoExperience.tsx:1260`) bypasses the flow entirely and no caller
  passes `{ type: 'case-map' }` to `requestExportFlow`.
- `startExportRun`'s arm (P5.4's) currently shares one branch with `location-geojson` and routes
  both to that same notice.

Wiring the handler without replacing the copy makes the demo announce "not wired to this button
yet" immediately after a real download. Replacing the copy without wiring makes it claim a download
that did not happen. So the two edits belong in ONE commit, and that commit is the one that splits
the arm — P5.4's, by the concurrency assignment we were given (they own the case-map arm; we were
told not to touch it). We therefore changed nothing here rather than half-fix it or collide.

**What P5.4 needs from our file, so their commit is mechanical:** delete the `if (run.type ===
'case-map')` early return in `describeExportTerminal` and the `'case-map'` arm of `artifactOf`,
narrow the parameter to `Exclude<ExportRun, { type: 'case-map' }>` (which makes the split at
`startExportRun` a compile requirement rather than a convention), and delete the
`the case-map interim says the map was NOT generated` test in `exportNotices.test.ts`. Their success
terminal is theirs to word — it is a statement about a download we do not own. §74f gets its closing
note in the same commit.

**Trigger:** if the orchestrator would rather P5.3 own the copy, say so and we will take it on a
follow-up round *after* P5.4's arm split lands — never before.

## 78. P5.4 fix round (parity/p5-fix-casemap) — R-1/R-2/R-8 + R-9/R-10/R-11/R-21/R-24/R-28 dispositions

**Source:** `docs/code-reviews/parity/p5/p5-review-r1-vetted.md`, the P5.4-routed findings.
All nine FIXED, none refuted; two carried an owner ruling (R-14 → wire) that changed the shape
of two others. Recorded here are the decisions a re-reader would otherwise have to reconstruct.

### 78a. R-1 — the coverage predicate is now two predicates, deliberately

`hasPlottableFeatures` (any non-camera feature) answered two different questions and got one of
them wrong: it is the right guard for "is there anything at all worth exporting" (§71g's
whole-case-GeoJSON refusal, which P5.2 will need) and the WRONG one for "does this map have any
sites on it", because it counts the incident pin. Both are kept, each documented against the
other, and `CaseMapCoverage.hasPlottedLocations` is the one the copy uses. Deleting either is a
regression; a future reader who sees two similar predicates should read their doc comments
before "simplifying".

`summariseCaseMapCoverage` deliberately re-walks the locations rather than having
`buildCaseMapGeoJson` return a pair: the builder's return type is the GeoJSON contract the
template reads, and widening it to a tuple would put a UI concern in the artifact's shape. The
cost is one extra pass over a list of tens.

**CORRECTED (delta D-5).** The sentence "the pin that they cannot disagree is a test, not a
type" described a real weakness and understated it: the walk re-IMPLEMENTED
`locationToFeature`'s gate rather than consulting it, so one added term in the builder would
have re-created r0 R-1's shape structurally — a banner over-reporting coverage against a file
that dropped more than it admitted. The summariser now tests `locationToFeature(location) !==
null`, which makes divergence impossible instead of merely unlikely, at the cost of building
each feature twice per export. **Trigger (revised):** if that double build ever matters —
it will not at demo scale — promote to a single `{ collection, coverage }` builder; do NOT go
back to a second copy of the predicate.

### 78b. R-2 — `requested`, and why no amount of code makes it `ok`

`SaveFileOutcome.ok` → `requested`. Worth stating plainly for the next person tempted to
"finish" this: there is no browser API that reports whether a `download` anchor produced a
file. `HTMLAnchorElement.click()` returns void, synchronously, whether the download starts,
is blocked by policy, is dropped by an extension, or fails silently in a hardened profile.
The File System Access API (`showSaveFilePicker`) *would* confirm — at the price of a second
user gesture, Safari/Firefox absence, and a permission prompt in a marketing demo. Not worth
it. **Trigger:** none; this is a recorded non-fix. If it is ever revisited, the decision is
about the picker, not about detection.

### 78c. R-8 — retired by prefetching, not by a guard

The owner ruling routed the export through `requestExportFlow`, and the review expected that
to bring the entry guard with it. It does — but only for CONCURRENT presses, and the honest
reading is that the guard is not what fixes this: the case-map run resets the stage to idle
inside its own handler, so a second press after it completes is simply a second, complete
export (which is what any download button does).

What actually removes the defect is that the ~22 kB chunk is now fetched when the MAP OPENS.
The press-to-outcome path holds no `await`, so the window the finding is about — "nothing
visible while the network works, so press again" — does not exist. Belt: the footer disables
while the chunk is in flight and while the terminal dialog is up.

Recorded because the test that would "prove" the guard in jsdom would be lying: jsdom does no
hit-testing, so three `fireEvent.click`s through a modal scrim produce three exports there and
zero in a browser. The suite pins the two things that are true instead — the run is synchronous
(no `waitFor` needed to see the file), and the button is `disabled` while the dialog is up.
**Trigger:** if the case-map run ever regains an `await` (a bigger template, an async
compression step), it needs a real in-flight stage and this note is the reason why.

### 78d. R-9/R-14 — the terminal split is enforced by the type, not by discipline

`describeExportTerminal` takes `SimulatedExportRun`, an `Exclude` of the real one. The interim
"not wired to this button yet" sentence could not simply be deleted — it would have grown back
the first time someone added a `case-map` arm "for completeness". Now the function cannot be
called with that member at all, and `runZipPipeline` is narrowed for the same reason.

Secondary drift closed: `EXPORT_ALERTS.noCaseSelectedForMap` (ported, unreachable) and the
bridge's `NO_CASE_SELECTED_NOTICE` (live) were two hand-maintained copies of one phone string.
The bridge copy is gone; the ported one is live. It remains unreachable FROM THE UI — the
footer only renders inside a picked viewer case — and is pinned at the engine
(`flow.test.ts:85`) rather than through a UI path that would have to be faked.

### 78e. R-10/R-11/R-21/R-24/R-28 — small fixes, one shared observation

Each landed as its own commit. The one thing worth carrying forward: **R-10 and R-11 are the
same failure shape at two scales.** The token chain re-read its own output; the token tests
validated ~80 bytes of an 85 kB artifact. Both were "the guard checks the thing it just did"
rather than the thing that has to be true. The port tool (`tools/port-case-map-template.mjs`)
still has R-11's blind spot in its own guards — it asserts the four tokens and a leaked `pk.`,
nothing structural. **Trigger:** next edit to that script, give it the same structural
assertions the test now makes (`endsWith('</html>')`, the CDN ref, `loadCase`, a length floor).

R-21's 40 s revoke window is a bet, documented as one. If a future artifact is large enough
that pinning it for 40 s matters, the answer is `pagehide` plus a shorter window, not a
same-tick revoke.

### 78f. Refutation — R-11's "correct the UI test's comment" half

The vetted doc asks to "correct the UI test's 'app JS is inlined' comment (its assertion only
proves no relative asset)". Verified against the file: the comment at
`DemoExperience.case-map-export.test.tsx` reads "Self-contained: the CSS and the app JS are
inlined, no relative asset is requested", and it is now accurate rather than aspirational —
`build.test.ts` proves the inlining directly (`<style>` present, `function loadCase()` present,
length floor), and the UI test's own assertion proves the consequence the comment's second
clause names. Left as written; the finding's substance (nothing pinned the inlining) is fixed
where it belongs, in the artifact's own suite.

### 78h. Fix-delta micro-round (parity/p5-fix2-casemap) — D-1/D-3/D-4/D-5/D-6/D-10/D-12

All seven FIXED, none refuted. Three carry a decision worth keeping:

- **D-1** is the correction to 78a's own framing. §78a said `hasPlottableFeatures` and
  `hasPlottedLocations` answered two different questions; there were in fact THREE, and the
  terminal was reading the wrong one for the third. "Has site framing" (§71g's refusal), "has
  any sites" (`plottedLocations > 0`) and "is empty" (`features.length === 0`) diverge on a
  camera-only collection — reachable through P3.7's crosshair on a typed-not-picked location —
  where the file renders camera pins and the sentence said it was blank. All three are now
  enumerated in `hasPlottableFeatures`'s doc, which also records that it has **no production
  reader today, deliberately**, so a dead-export sweep does not take the §71g predicate with it.

- **D-10**: the pending state moved to the accessible NAME rather than gaining an sr-only
  `role="status"` region. `pending` is normally false — the chunk lands while the map is still
  drawing — and a live region that fires for a few hundred milliseconds on arrival at a screen
  is noise. A disabled control is still read by a browse cursor, so the name reaches the same
  person without the interruption. **Trigger:** if the chunk ever becomes slow enough that
  `pending` is routinely observable (a much larger template, a compression step), revisit — a
  live region earns its keep at that point.

- **D-12** removed `hasPlottedLocations`; **D-5** removed the second copy of the plotted gate.
  Both were the same species — a value derived from something that already existed, kept in
  sync by hand — and both had already produced the thing the species produces: fixture pairs
  that could contradict each other, and a count that could disagree with the file. §78a's
  trigger is corrected in place rather than left to be read alongside its own correction.

**Costs accepted, on the record:** `summariseCaseMapCoverage` now builds each location's feature
twice per export (once to count, once to collect). At demo scale that is tens of objects on a
button press. It buys structural agreement between the sentence and the artifact, which is the
one thing this whole finding family has been about.

### 78g. Residual — the thin `mapbox-gl` mock in the sibling map suites

`MapCanvas` does `new Marker(...).setLngLat(...).addTo(map)` (`MapCanvas.tsx:160-162`), which
throws on the `Marker: vi.fn()` mock that `DemoExperience.map.test.tsx` and
`DemoExperience.incident-edit.test.tsx` still use. They are green only because they assert
synchronously and the marker pass runs after the map's async `load` — the throw lands in the
error boundary after the assertions have gone home. Both case-map suites now use a chainable
`Marker` because they wait long enough to see it.

Not fixed here: those files are P6.1's territory and the change is a mock swap that would
conflict with an in-flight map package. **Trigger:** P6.1's first round — lift the chainable
mock into a shared local (or a `__mocks__/mapbox-gl.ts`) so a map render failure cannot hide
behind test timing again.

### 77i. Fix-delta micro-round (parity/p5-fix2-modals) — D-2, D-7, D-11

**D-2 (MAJOR, fix-introduced) — FIXED at the primitive.** `AlertDialog` no longer reads
`document.activeElement` in its mount effect. A module-scope `pointerdown`/`keydown` CAPTURE
listener records the activation origin, and the mount effect reads that. Capture-phase runs
before the click handler, before a self-disabling control disables itself, and before HTML's
focus fixup moves focus to `<body>` — the three-step sequence that made the old read capture the
viewport and land a dismissing keyboard visitor at document start.

Two properties worth keeping in mind before anyone "simplifies" this:

- **The tracker is installed at MODULE scope, not on mount.** A listener armed when the dialog
  mounts has already missed the gesture that opened it. This is the reason it is not a hook.
- **The two validity checks are ASYMMETRIC on purpose.** At capture the origin is checked only
  for `isConnected`; at restore it is also checked for `disabled`. Adding the disabled check to
  the capture side re-breaks D-2 exactly — at mount the opener is very often disabled, because
  disabling it is what raised the dialog. (This was caught by the new test during the fix round,
  not by review.)

Scope note: this retires the pre-existing `ExportHub.tsx:234` sibling too — every self-disabling
opener in the demo now restores correctly, without touching either call site.

**D-7 — FIXED.** The reduced-motion pin was a negative (`not.toHaveStyle(<exact string>)`), which
a `spin 3s` mutation satisfied while still rotating. Now the positive
`style.animation === ''`, the idiom `ExportHub.test.tsx:237` already uses. Probe: the slow-spin
mutation reddens it.

**D-11 — FIXED.** `runZipPipeline` takes `ZipExportRun` rather than `SimulatedExportRun`, which
excluded only `case-map` and so nominally accepted a `location-geojson` run that returns from
`startExportRun` before the pipeline is reached.

**Not ours this round, noted for the record:** D-8's ruling (trim the vacuous runtime `expect`
wrappers around load-bearing `@ts-expect-error` directives to bare directives when these files
are next touched) applies to `exportNotices.test.ts` and `ExportModal.test.tsx`. Left alone
deliberately — the ruling says "when next touched", and touching them for decoration alone in a
micro-round is churn against a review-frozen tree.

**Cross-bucket interaction (P5.4's D-10):** their sr-only/`aria-busy` decision on the Export Map
button is now the ONLY remaining focus concern at that site — the restore half is handled here,
in the primitive, for every caller.

## 79. P6 review round 1 — fix-round dispositions and what was deliberately left

**Source:** `docs/code-reviews/parity/p6/p6-review-r1-vetted.md` (R-1…R-27), one code owner.
25 of 27 findings FIXED; the two entries below are the deliberate partial-fixes, plus one new
production defect the round surfaced and one item ruled against the ledger.

### 79a. NEW (found while fixing R-10) — the long-press point ignored the phone-frame CSS scale

Not a review finding; surfaced by writing the test R-10 asked for, exactly as the finding's
carry-through note predicted it might. `onPointerDown` converted client coordinates to container
pixels with a plain `clientX - rect.left`, but `getBoundingClientRect()` reports the CSS-
TRANSFORMED box while `map.unproject` expects untransformed container pixels — and
`PhoneFrame.tsx:42` wraps this whole screen in `transform: scale(usePhoneScale())`, which is
below 1 on any viewport that cannot fit the 404x812 device at 1:1. A long press therefore landed
progressively further from the finger the further it was from the container's top-left; at
scale 0.5, 100 px in resolved 100 px short.

FIXED in the R-10 commit with mapbox-gl's own formula (`getScaledPoint`,
mapbox-gl-dev.js:57053-57059, `offsetWidth / rect.width`), so a long-press ring and a mapbox
click now resolve to the same coordinate. Recorded here, not silently folded in, because it is
new production behaviour rather than the test-strength item R-10 asked for — the fix-delta lane
should treat it as unreviewed code.

### 79b. DEFERRED (R-15, larger half) — `MapData` still carries `pins` and `incident`

The duplication the finding named is gone: `narrowProjection` is now the single derivation both
narrowing stages call, so `pins`/`incident`/`statusCounts` cannot disagree with `items`. What is
NOT done is the shape change — shrinking `MapData` to `items` alone and deriving at the render
boundary (`buildMarkers(items)`), per the `ScopeRetention` omit-so-it-can't-drift precedent.

**Why deferred:** it changes the type every map surface reads, and P5.4's case-map export builder
is the second consumer arriving imminently. Doing it once, with both consumers visible, is
cheaper and safer than doing it now and again. **Trigger:** the P5.4 export-map reconciliation,
or any third `MapData` consumer — whichever comes first.

**Caveat (fix-delta):** `narrowProjection` covers the two NARROWING sites, not all three
construction sites. `toMapData` still builds `pins`/`incident`/`items` independently from the
location list — correctly, since it is the origin rather than a narrowing of something — so the
invariant is enforced at 2 of 3. A change to the pin shape still has to be made twice. That is
the residue the shape change above removes for good; until then, treat `toMapData` as the site
this ledger entry is really about.

### 79c. DEFERRED (R-16, larger half) — `LocationDetailCardProps` is still flat over a union `item`

The invalid state the finding named is gone: `camerasShown`/`onToggleCameras` are one optional
`cameras: { shown, onToggle }`, so "shown with no way to hide" is unrepresentable. What is NOT
done is discriminating the whole props type on `item.kind` (the `RetentionView` precedent), which
would also stop an incident item being handed location-only props.

**Why deferred:** same reason as 79b — one caller today, P5.4 adds the second, and the union
churn is worth doing once against both. **Trigger:** P5.4's detail-card caller landing.

### 79d. DEFERRED (R-14, larger half) — four pipeline stages still share one nominal `MapData`

`locationCountLabel` now takes `{ filteredCount, locationCount }` (the finding's stated minimum),
so the two swappable positional numbers are gone. The `MapProjection` single-result shape that
would make the stages distinct types is the owner-judgement half the finding itself routed to the
P5.4 seam. ~~**Trigger:** as 79b.~~

**TRIGGER AMENDED (fix-delta):** "as 79b" under-fired. The pressure this entry describes — more
readers of more same-typed stages, each correct only by identifier choice — grows whenever
`MapScreen`'s projection block gains a stage-derived count or reader, which happened TWICE in the
fix round alone (`totalCount` off `mapData`, `emptyReason` off `display`/`filtered`), and MR-3
then had to reach across two of them to get one clause right. **Trigger:** the P5.4
reconciliation OR any new stage-derived count/reader added to that block — whichever comes first.

### 79e. DEFERRED (R-7b remainder) — map pins have no accessible name to plumb

Cluster bubbles are now focusable and Enter/Space-operable. Location and incident pins took the
other branch the finding offered — `aria-hidden="true"`, with the sheet's real `LocationRow`
buttons as the declared keyboard path — because `MarkerDescriptor` carries no label field and
inventing one at the marker layer would duplicate naming logic the sheet already owns.

**Trigger:** if `MarkerDescriptor` ever gains a display name for another reason, give the pins
`tabIndex`/`aria-label` and drop the `aria-hidden` in the same commit.

### 79f. RECORDED — the dynamic-import discipline is still grep-enforced

Carried from the review's own "recorded, no action" list so it does not evaporate. Nothing
prevents a future edit from statically importing `mapCluster` or `mapProximity` and pulling
`supercluster`/`@turf/*` into the demo's own chunk; the fix round kept the boundary honest by
hand (and by re-measuring the built chunks), not by a rule. An ESLint `no-restricted-imports`
scoped to the eager map modules, or a chunk-content assertion in CI, is the durable enforcement.
**Trigger:** the next time a lazy-chunk regression is found by measurement rather than prevented.

### 79g. RECORDED — the two review items closed with no code change

`W-8` (the 600 ms cover cross-fade has no reduced-motion gate — opacity-only, category guidance
exempts it, and mapbox's own animations are already gated) and `W-9` (glass-pill contrast over
bright satellite tiles — phone-verbatim tokens, pre-existing on the phone and the sheet, a design
decision rather than a review call). Both stand as recorded; neither is a residual this feature
owes work on.


### 79h. LEDGERED (from MR-4) — no `webglcontextlost` subscription, and a third failure discriminant

MR-4 deleted a dead `context lost` alternation from `isTerminalMapError`: verified in the
installed mapbox-gl 3.25, context loss is raised as its own event
(`this.fire(new Event('webglcontextlost'))`) and never travels through `'error'`, so the arm
could not fire for its stated cause while the comment promised it would.

What is NOT built: the real handling. `map.on('webglcontextlost')` → `console.error` + the
overlay; `map.on('webglcontextrestored')` → clear it. It needs a THIRD failure value beside
`'engine' | 'style'`, because a post-load death currently renders "Failed to load the map." for a
map that demonstrably did load — the copy would be a second small lie.

Not built now because it is a new failure path with new copy and new state, which is a fix round's
worst shape. **Trigger:** the next touch to `MapCanvas`'s failure handling, or any report of a
blank map that Retry does not fix.

### 79i. LEDGERED (from MR-1) — the long-press convergence, and the durable §79a retirement

Two entries that resolve together, both about the same seam.

1. **Converge on `useLongPress`.** The map is its fifth hand-rolled long press. The primitive
   needs two additions to absorb this caller — an extra bail selector (the map bails on
   `[data-marker-id], .mapboxgl-ctrl`, the primitive bails on `NESTED_CONTROL_SELECTOR`) and an
   originating-coordinates callback (the map needs the press point; the tray callers do not).
   MR-1 shared the constants and the button rule; the mechanism is still duplicated. Retires
   §72e's shape residual for real.
2. **Retire `toContainerPoint` entirely.** Build the hold on `map.on('mousedown' / 'touchstart')`
   instead of container pointer events: mapbox's own event objects carry `e.point` (already
   scale-corrected by the very `getScaledPoint` §79a mirrors) and `e.lngLat` (already
   unprojected). That deletes the conversion, its version-coupled citation, and its
   padding/border-free precondition in one move.

**Trigger:** either any mapbox minor/major bump (which is when the mirrored formula is most
likely to drift), or the next feature touch to the long-press seam — whichever comes first.

### 79j. LEDGERED (from the fix-delta) — map type-polish batch

Explicitly routed here so it stops falling between commits and ledger entries:
R-27d's `export type MarkerKind` (`data-marker-kind` is still written three ways — `d.kind`, the
literal `'cluster'`, the literal `'camera'` — and both test helpers still take `kind: string`);
the ~7 remaining positional `[number, number]` sites that should be `LngLat` (probe-verified zero
caller breakage); a `ScreenPoint` labelled tuple for the container-pixel pair; and the three
`Object.freeze(...) as X` assertions that a `satisfies` or a typed helper would avoid.

**Trigger:** the next refactor commit in `features/demo/ui/screens/map/` — it is a single sweep,
not a reason to open the territory on its own.

### 79k. RECORDED (fix-delta) — commit `213d5dd`'s stated mutation no longer reproduces

The R-9 commit body says reverting the stable-empty defaults reddens its settled-total pin. At the
merged head it no longer does — and that is NOT a weak pin. R-4's structural split (which landed
after R-9) removed the pin/camera coupling the mutation needed; the pin still reddens when that
coupling is restored. Recorded so nobody re-derives it from the commit message and concludes the
test is hollow.

---

## 80. P7.1 — Settings shell + stub panes: rulings, residuals, and one stale spec

**Source:** parity package P7.1 (`parity/p7-shell`) — master plan §5 P7.1, matrix rows 81–84 +
87–93 + A1, owner decision D6 ("full Settings replica; every pane built visually, honest stub
behavior everywhere except User Profile and Form Customization").

### 80a. RECORDED — the Developer pane (row 94) is absent, and there is no `devOnly` member

**What:** the phone's eleventh category, `Developer` (`settings-catalog.tsx:260-268`), is not in
the demo catalog. Nor is the mechanism that hides it: `SettingsCategory` has no `devOnly` and no
`badge` field, and `getVisibleCategories()`'s `__DEV__` filter has no port.

**Why:** the row is `devOnly: true` on the phone, so it exists in no build a user can install —
the demo would be replicating a surface its source of truth never ships. The owner ruled it
permanently out (matrix §7 D6: "Row 94 (Developer, `__DEV__`-only) stays out"), and plan §5 P7.1
asks for the omission to be documented, which this is. Modelling the field anyway would leave a
type member with exactly one possible value, one filter with nothing to filter, and a badge slot
in the nav bar with no producer — three dead things guarding an absence.

**Trigger:** none. This is a closed decision, recorded so a future reader does not "fix" the
missing row or re-add `devOnly` to make the catalog "match".

### 80b. LEDGERED — the Location pane does not drive the real GPS capture

**What:** `gpsAccuracyMode` / `gpsTimeout` / `showAccuracyWarning` render, change, and are read
by nothing. The demo's GPS capture is genuinely real (P2.3/P3.4/P3.7) and runs at
`buildGpsConfig()`'s own defaults — `balanced` / 30 s — which are exactly the values the pane
opens on, so the pane is *correct on arrival* and inert thereafter. The incident-pin and
per-camera captures force `PRECISE_GPS_CONFIG` and are meant to ignore the setting on both
sides.

**Why deferred:** it is the one stub in this package that could plausibly be made real, and D6
did not ask for it. Wiring crosses two other packages' screens (`SubmissionScreen`,
`NewLocationModal`), and the third value (`showAccuracyWarning`) has no consumer at all — the
accuracy chip renders unconditionally — so "wire the pane" is really three changes of different
sizes wearing one name.

**The recipe, so the next agent does not re-derive it:** `GpsCaptureControl` already takes an
optional `config: GpsConfig`. Thread `buildGpsConfig(settings.gpsAccuracyMode,
settings.gpsTimeout * 1000)` from the bridge → `SubmissionScreen` → its `GpsCaptureControl`, and
the same through `NewLocationModal`. Leave `CameraGpsCapture` and the incident form alone: their
`PRECISE_GPS_CONFIG` is phone-parity, not an oversight. `showAccuracyWarning` needs a consumer
built first.

**Trigger:** the next feature touch to the GPS capability, or any review finding that the
Location pane's honesty note is carrying weight the code should carry. `buildGpsConfig`'s own doc
comment points here.

### 80c. RECORDED — Settings persist NOTHING this round, and P7.2/P7.3 own their own calls

**What:** the whole `DemoSettings` record lives in `DemoExperience`'s `useState` and dies with
the tab. It is not in the store, not in `snapshotOf`, and `SNAPSHOT_VERSION` stays at 6.

**Why:** every value is cosmetic by D6's ruling — real and typed, but read by nothing — and a
persisted value implies a value that matters. The snapshot guard is three compile-time devices
that move TOGETHER (`as const` union tuples consumed by `z.enum`, `satisfies FullShape`/
`FullShapeIn` on every shape literal, and `SNAPSHOT_VERSION` + key suffix bumped in the same
edit); spending that ceremony on a stub would blunt it for the change that needs it.

**For P7.2 / P7.3 specifically:** a profile and a 57-toggle override set are exactly the kind of
state a visitor expects to survive a refresh, so each package makes its OWN persistence call —
and if it says yes, moves all three devices in one commit. Settings values must not be swept in
alongside: they are a different decision with a different answer.

**Trigger:** none for the settings record. If a future package needs one of these values to
survive a refresh, that value has stopped being cosmetic and the pane owning it stops being a
stub — re-open the whole pane, not just the field.

### 80d. LEDGERED — `showImportProcessDetails` has no consumer

**What:** the Appearance pane's second switch toggles a real value that nothing reads. On the
phone it opens and closes the on-device model's inputs and outputs in the live import terminal
(`GeneralSettingsSection.tsx:29-35`); the demo's terminal always prints its full log.

**Why deferred:** the import terminal is P1.3/P1.4 territory with its own documented trust
scoping, and adding a verbosity gate means deciding WHICH lines are "process details" — a log
taxonomy question, not a settings one. The pane names the gap explicitly rather than leaving a
visitor to discover it mid-import.

**Trigger:** the next feature touch to `ImportTerminalProgress` or the log bus's level set.

### 80e. RECORDED — ui-mapping 12's Cloud Sync spec is stale; the phone has moved

**What:** `docs/ui-mapping/12-settings.md` (fact-checked 2026-07-16) documents the Cloud Sync
pane as a locked toggle plus an info box reading "Cloud sync is not available in this build."
That build is gone. The live component is the BYO-Supabase agency-cloud status home —
provisioning wizard, enrollment QR, user management, paused-project recovery banner, disconnect
(`CloudSyncSettingsSection.tsx:129-277`) — and its master-row preview now answers
`Paused`/`Connected` before falling back to On/Off (`settings-catalog.tsx:146-152`), where the
doc records only On/Off. `useCloudSyncSettings.isLocked` is likewise no longer `!__DEV__`; it is
`!configured && !__DEV__` (`useCloudSyncSettings.ts:27`).

**What P7.1 built instead:** the shape the demo can honestly hold — the description lifted
verbatim from the LIVE component (it describes what the app genuinely does), one disabled
toggle, and an honest note naming the real feature. Plan §2 puts "cloud sync / agency-cloud /
Supabase / canvas-hub anything" out of scope wholesale, and D6 widens the SETTINGS surface, not
that exclusion.

**Trigger:** none for the demo. Recorded because the next agent to read ui-mapping 12 for this
pane will otherwise build the wrong thing — and because a future ui-mapping refresh should pick
this up.

### 80f. RECORDED — the deliberate non-ports, in one place

Four phone behaviours are absent by decision, each with its reason at the site:

1. **Media Capture's three GPS-permission notes.** Driven by a real
   `Location.getForegroundPermissionsAsync()` read, and the granted arm asserts "GPS coordinates
   will be embedded in captured media" — false here, because the demo writes no EXIF. Reading
   the browser's geolocation permission purely to print that would be the fabricated-capability
   trap D6 forbids.
2. **Media Capture's non-iOS codec branch** (`disabled` picker + "Android devices use their
   default codec"). The demo's frame is an iPhone and a browser is not Android; printing that
   note would tell a third platform's story.
3. **Export Security's inline password form.** D4 already skipped `PasswordModal`, and nothing
   the demo produces is encrypted. A password field in a surface that stores nothing invites a
   real secret into a demo — worse than an absent control. The status line and the Set-password
   affordance still render, inert.
4. **Security's `!isAvailable` branch.** Its button calls `Linking.openSettings()` (no web
   equivalent) and its copy tells the reader to go enrol a fingerprint — advice that is nonsense
   in a browser tab.

**Trigger:** none. Re-flagging any of these as a parity gap should be answered with this entry.

### 80g. LEDGERED — the Settings sheet has no focus trap (inherits §7)

**What:** `SettingsModal` carries `role="dialog"` + `aria-modal="true"` + Escape (popping the
detail before closing, phone parity), and it moves focus into the detail pane on open and back to
the opening ROW on close. What it does not do is confine Tab to the sheet — the same residual
`WizardDrawer` and `ModalShell` carry under §7.

**Why deferred:** it is one behaviour shared by every overlay in this feature, and solving it per
surface is how three subtly different traps end up in the codebase. §7's trigger already names
the pass that should own it.

**Trigger:** §7's — a broader keyboard-nav/a11y pass, or before beta. Add this surface to that
pass's inventory.

**AMENDED (P7 review r1, obligation A4 riding R-32) — the inventory, itemised.** The summary
above ("moves focus into the detail pane on open and back to the opening ROW on close") reads as
"focus handling here is complete". It is complete INSIDE the sheet and absent at its boundary,
and the overlay-stack pass owns three items this entry did not name:

1. **Nested `aria-modal` with no background suppression (web W-6).** The profile editor
   (`ModalShell` `elevation={4}`) opens from inside `SettingsModal`; both assert
   `aria-modal="true"` as DOM siblings in the same portal root and neither marks the other
   `inert`. A virtual-cursor user can browse straight out of the editor into the Settings content
   underneath and back, with no boundary — the failure mode the APG warns about for stacked
   dialogs. The z-index mechanics themselves were walked and verified sound (21/22 · 25/26 ·
   31/32 · 60/61); this is purely the AT boundary. NEW with P7 — §7/§80g/§81d did not cover it.
2. **A second Escape-collision instance (web W-9).** `AlertDialog` and `SettingsModal` both
   register document-level `keydown`, so one Escape on the "Apply profile?" confirm dismisses the
   alert AND pops the Settings detail. Identical mechanism to §81d, which names only the profile
   editor; the pass's inventory should carry both, plus `PickerSheet`-inside-`ModalShell`.
3. **Focus is never returned to the gear (web W-10).** Closing the sheet — ×, scrim, or Escape
   from the master list — unmounts everything and drops focus to `<body>`;
   `SettingsGearButton` is not re-focused. Covered by §7's "focus restored to the trigger on
   close", but not visible from this entry's summary.

**Trigger:** unchanged (§7's). The obligation discharged here is that the pass's inventory names
all three.

---

## 81. P7.2 — User Profile: rulings, the v7 bump, and one overlay residual

**Source:** parity package P7.2 (`parity/p7-profile`) — master plan §5 P7.2, matrix rows 85/86,
ui-mapping 12 § User Profile. The pane and its editor are REAL (decision D6 exempts this surface
and Form Customization from the honest-stub treatment).

**Amended by the P7 fix round — see §85.** Three statements in this section were completed there:
the autofill now consults field visibility before writing (§85a, review R-1b), the pane's
"kept for this browser tab" promise is conditional on the persistence handle (§85b, R-3), and
§85a carries the corrected description of the autofill's re-entry behaviour (A1).

### 81a. RECORDED — no `resetProfile()`, and `agencyLogoUri` is absent from the TYPE, not just the UI

**What:** the editor offers no reset/clear action and no agency-logo control, and the demo's
`UserProfile` has seven members where the phone's has eight.

**Why:** both are matrix row 86's explicit instructions, and both hold up at source.
`resetProfile()` is documented on the phone (`user-profile/README.md` Public API) and does not
exist — its store declares exactly `updateProfile` and `isProfileComplete`
(`store/user-profile-store.ts:19-22`). Building a demo control for it would be implementing the
phone's documentation instead of the phone.

`agencyLogoUri` is real on the phone's type (`types.ts:26-27`) but marked `[Future]`, has no UI by
the modal's own inline comment (`UserProfileModal.tsx:46`), and is never written or read anywhere.
Carrying it here would mean a key in `DEFAULT_USER_PROFILE`, a key in the snapshot shape guard
(`FullShape` makes that mandatory, not optional) and a branch in `trimProfile` — three live things
guarding an absence, which is the same argument that kept `devOnly` off `SettingsCategory` (§80a).

**Trigger:** none for the reset. For the logo: whenever the will-say document actually renders one.
It is then a `SNAPSHOT_VERSION` bump plus three lines, all in one commit.

### 81b. RECORDED — the profile persists (P7.2's answer to §80c), the Settings values still do not

**What:** `SNAPSHOT_VERSION` 6 → 7, key `dvr-demo-state-v7`, `PersistedState` gains `userProfile`,
and `userProfileSchema` carries `satisfies FullShape<UserProfile>`. `DemoSettings` is untouched and
stays in `DemoExperience`'s `useState`.

**Why:** §80c asked each of P7.2/P7.3 to make its own persistence call. A profile is not cosmetic —
it is data the visitor typed, and its name reaches the Case Notes document through Completion's
`completedBy` — so it earns the snapshot and the three compile-time devices moving together. The
Settings record has neither property and was correctly left out.

**For the P7.3 merge:** P7.3 takes its own 6 → 7 on its branch; the orchestrator unifies both
shapes under one v7 and re-runs both round-trip suites (the P3-era precedent). P7.2's fixture
additions are marked `[P7.2 fixture]` / `[P7.2 fixture addition]` so the reconcile is mechanical.

**Trigger:** none.

### 81c. RECORDED — `reset()` carries the profile across

**What:** `reset()` is no longer literally `initialState()`; it preserves `userProfile`.

**Why:** the phone cannot reset identity at all — it lives in its own AsyncStorage store precisely
because it is app-level config and not case data (`user-profile/README.md`), and there is no
`resetProfile()` (see §81a). "Start over" means the visitor's CASES go. The tab still forgets the
profile, because the snapshot is per-tab and dies with it. Pinned both ways in
`engine/store/__tests__/user-profile-state.test.ts`.

**Trigger:** if a visible "Start over" control ever ships and the owner wants it to wipe identity
too, this is one line and one test.

### 81d. LEDGERED — one Escape over the profile editor also pops the Settings detail

**What:** with the editor open over the Settings sheet, a single Escape closes the editor AND
returns the sheet to its master list (probe-verified: `editorOpen=false detailOpen=false
sheetOpen=true`). Expected: the editor closes and the User Profile pane stays.

**Why it happens:** every overlay in this feature registers its OWN document-level `keydown`
listener — `ModalShell`, `PickerSheet`, `SettingsModal` — so an Escape runs all of them.
`SettingsModal` mounted first, so its listener is first in the list; `stopImmediatePropagation`
from the editor cannot un-run it. It is not new behaviour either: a `PickerSheet` opened inside a
`ModalShell` closes both the same way, and has since P1.

**Why deferred:** the fix is an overlay STACK (only the topmost surface answers Escape), which is
shared infrastructure for five surfaces. The obvious local shortcut is actively wrong: moving
`ModalShell` to a capture-phase listener would make it fire BEFORE its own nested `PickerSheet`,
so Escape in an open date picker would close the modal underneath it — capture order inverts the
nesting order, which is exactly the order that must win. Solving this per surface is how three
subtly different rules end up in the codebase — the same reasoning §80g and §7 already carry.

**Deliberately not pinned:** a test asserting today's behaviour would read as a specification for
it. The behaviour is recorded here instead.

**Trigger:** §7's / §80g's — the broader keyboard-nav/a11y pass. Add "one Escape per overlay,
topmost first" to that pass's inventory.

### 81e. RECORDED — the demo's Case Notes document was missing the phone's Completion Information section

**What:** P7.2 added `dateTimeCompleted` + `completedBy` to `CaseNotesData`, the selector and the
generated document (phone `case-notes-template.ts:331-348`, same position and the same
`hasCompletionInfo` gate).

**Why it is in this package:** the gap predates it — neither completion field reached the report —
but the profile pane's honest note says the name is "what carries it into the Case Notes report",
and the matrix row says the same. Shipping the autofill without the section would have made a
claim about the demo that the demo did not honour, which is the one failure mode this surface is
not allowed to have.

**Trigger:** none. Recorded so the next reader of `pdf/case-notes.ts` knows the section arrived
with the profile and not with P2's document work.

---

## 82. P7.3 — Form Customization (D9): the grid's fidelity, three demo-better calls, and the v7 shape

**Source:** parity package P7.3 (`parity/p7-formcustom`) — master plan §5 P7.3, matrix row A2,
owner decision D9 ("Form Customization in FULL — profile chips AND the toggle grid, wired to the
live visibility selectors"). Spec: phone `src/features/form-customization/` (README + source).

### 82a. RECORDED — the grid is 12 rows × **50** field toggles, not 57

**What:** the matrix (row A2) and the plan both say "57 field toggles". The phone's registry
holds **58** `FieldId`s (`config/field-registry.ts:19-97`; counted: submission 16, scope 4,
arrival 2, timeoffset 3, extracted 3, dvr 13, camera 8, export 5, notes 2, completion 2), and
**50** of them are rendered as switches — the other 8 live on the three `screen-only` steps
(Time Offset, Extracted Video Scope, Notes), whose rows expand into an explanatory line on the
phone too (`FormCustomizationSection.tsx:128-131`). Of the 50, seven render LOCKED (the
always-on set), so 43 actually move.

**Why:** recorded rather than "fixed" because nothing is wrong — the demo ports all 58 ids and
renders exactly the 50 the phone renders. The number in the matrix was an estimate made before
the registry was read.

**Trigger:** none. A reviewer counting switches and finding 50 should be answered with this
entry; the count itself is pinned by test (`FormFieldsPane.test.tsx`, "reaches all 58 registry
fields…" asserts 50 rendered against the registry).

### 82b. DEMO-BETTER — the submission coordinate group gates here; on the phone it gates nothing

**What:** `submission.latitude` / `.longitude` / `.coordinateAccuracy` / `.coordinateSource` are
in the phone's settings grid as a toggleable group, and **no screen reads them**: the phone's 35
`useFieldVisible` call sites (`app/(form)/*.tsx`) cover every other switchable field and skip
these four. `submission.tsx:54-60` gates the five requester fields and the two contact fields
and nothing else, so the GPS block renders unconditionally. The demo gates it —
`LocationFields` takes `showGps`, and the capture control + lookup notice + coordinate card go
with it.

**Why not left at parity:** the honesty rule cuts against shipping a switch that moves nothing,
and the group is already in the registry with a lock-free default, so the phone's own intent is
legible. Filed for the phone as ledger item 19.

**Completed by the P7 review's A2 ruling — see §86a.** The gate described here is the DISPLAY
half; hiding the group also suppresses NEW coordinate stamping in `onPick`. Read the two
together: this entry says why the gate exists, §86a says how far it reaches.

**Trigger:** none here. If the phone wires its four ids, the two apps converge with no demo
change.

### 82c. RECORDED — there is no Reset control, on either side

**What:** the phone's store has `resetToProfileDefaults` (`form-customization-store.ts:156`) and
**nothing calls it** — `FormCustomizationSection.tsx` renders the picker and the rows and no
reset affordance. The demo therefore ships no Reset button either, and the equivalent store
action was removed rather than left caller-less.

**Why:** re-stamping a profile clears every override (`applyFormProfile`), so the capability is
reachable on both sides by picking another chip and picking back — pinned by test
(`form-customization-actions.test.ts`, "is the reset path"). Adding a control the source of
truth does not have is a parity delta a reviewer would have to re-adjudicate.

**Trigger:** the phone growing a Reset affordance, or an owner call that the demo wants one. The
store action is a four-line re-add (`set({ formOverrides: blankFormOverrides() })`).

### 82d. RECORDED — the `limited` blurb promises a reduction its defaults do not deliver

**What:** `ProfilePicker.tsx:25` reads "Comprehensive, lightly reduced (SPC/SOCO)" while
`config/profiles.ts:13` states, and its off-lists confirm, "limited: comprehensive — nothing
off". Both apps ship a profile whose copy describes a trim that does not exist.

**Why carried:** the copy is lifted verbatim per the plan's fidelity rule. What the demo adds is
a DERIVED line beneath it (`describeProfile` → "Hides nothing — every screen and field is on." /
"Hides 1 screen · 12 fields."), counted from the same map the resolver reads, so the visitor
gets the truth from a number that cannot drift. Filed for the phone as ledger item 18.

**Trigger:** the phone deciding what `limited` should actually reduce. The off-list is a
one-array edit in `content/profiles.ts` on this side.

### 82e. RECORDED — section cards collapse when their last field goes, which the phone does not do

**What:** hiding every requester field drops the whole "Requester Information" card; the same for
the three DVR cards and Completion Details. The phone gates each field individually and leaves
the `SectionCard` standing, so a fully-trimmed section renders as a title over nothing.

**Why:** a titled card with an empty body reads as a rendering bug, and the store's cascade
already guarantees a fully-emptied SCREEN never renders at all (it hides itself), so this only
ever affects a partially-trimmed screen. Deliberate, pinned by test
(`field-visibility.test.tsx`, "a section card goes when its last field does"). Not filed as a
phone bug — it is a presentation choice, not a defect.

**Trigger:** none. Re-flagging it as a parity gap should be answered with this entry.

### 82f. RECORDED — three surfaces beyond the wizard follow visibility, and one deliberately does not

**What:** switching a screen off removes it from the drawer list (`selectDrawerItems`), from the
Next/Back spine (`nextVisibleChapter`/`prevVisibleChapter`), and from the rail's exploration
checklist (`selectExploreStatus`) — the last because an unlit row for an unreachable screen is
what the exit dialog lists as something the visitor missed. The two capture TOOLS likewise drop
out of the drawer's Media accordion (phone parity, `CustomDrawerContent.tsx:61-62`), while the
Media Library row stays on both sides.

The one that does not follow: the map pin / Cases row / exported case-map status
(`selectLocationMapStatus`) counts every field regardless. It answers "how far along is this
LOCATION", which must not change because the reader's device runs a different profile — see the
note on `selectDrawerStatus`, whose `visibility` parameter is optional for exactly this split.

**Also deleted this round:** `nextChapter`/`prevChapter` in `content/screens.ts`. A second pair
of walkers that ignores visibility is how a screen ends up hidden from the drawer and still
reachable by Continue.

**Trigger:** none — recorded so the asymmetry between the drawer dot and the map pin is not
"fixed" into agreement.

### 82g. RECORDED — no hydration gate, and none is needed

**What:** the phone's feature ships `useFormCustomizationHydration` plus a 3-second fail-open
deadline, because AsyncStorage rehydrates ASYNCHRONOUSLY and the wizard would otherwise paint
the forensic default and flip. The demo has no equivalent and needs none: `loadSnapshot` runs
SYNCHRONOUSLY inside `createDemoStore`, so the first frame already has the persisted profile.

**Why recorded:** so nobody ports the gate (or its `HYDRATION_FALLBACK_MS`) looking for parity —
it would be a spinner guarding a value that is already there.

**Trigger:** the demo ever moving persistence off `sessionStorage` onto an async backend. At
that point the gate becomes necessary, and the phone's fail-open deadline is the pattern.

### 82h. RECORDED — the resolver's hidden-current fallback has no reachable trigger today

**What:** `nextVisibleChapter`/`prevVisibleChapter` fall back to the neighbours by registry
position when the CURRENT chapter is itself hidden (the phone's `getNextStep` does the same,
`visibility-resolver.ts:65-73`). In the demo that state is currently unreachable: Settings opens
only from the Home and Cases headers (P7.1), so a visitor cannot switch off the screen they are
standing on, and a v7 snapshot pairs the view with the overrides that produced it.

**Why kept:** it is four lines, it is the phone's behaviour, and the alternative (returning
`null`) strands a visitor on a dead screen the moment any new Settings entry point appears —
including the obvious one, a gear inside the wizard drawer.

**Trigger:** adding a Settings entry point reachable from a wizard screen. At that point also
decide whether the bridge should NAVIGATE off a screen that has just been hidden, which this
package deliberately did not build.

### 82i. RECORDED — the v7 persisted shape, for the P7.2 merge reconcile

**What:** `SNAPSHOT_VERSION` 6 → 7 (`SNAPSHOT_KEY` `dvr-demo-state-v7`), carrying TWO changes
from this branch:

1. `PROFILES` widened `'forensic' | 'canvas'` → `+ 'limited'` (a tuple-backed union widening,
   consumed by `z.enum(PROFILES)`);
2. `PersistedState` gained `formOverrides: { steps: Partial<Record<FormStepId, boolean>>;
   fields: Partial<Record<FormFieldId, boolean>> }`, schema'd as
   `z.record(z.string(), z.boolean())` on both halves and FILTERED on load to known ids (the
   `visited` rule — a settings preference from another build is never worth wiping a case).

P7.2 takes its own 6→7 bump on its branch; the collision is expected and the orchestrator
unifies both shapes under ONE v7. Nothing else in `snapshotOf` changed.

**Trigger:** the merge. Both round-trip suites must be re-run on the merged head — this branch's
additions are named `v7 (P7.3)` in `persistence.test.ts`'s maximal fixture and in the
`form-customization overrides (v7 — P7.3)` describe block.


---

## 83. P7 wave-B merge — how P7.2 and P7.3 were unified (the reconcile both branches asked for)

**Source:** the merge of `parity/p7-formcustom` (P7.3) into `feat/parity-p7`, which already held
`parity/p7-profile` (P7.2). Eight conflicted files. §81b and §82i each predicted the collision and
handed the reconcile to the integrator; this is what it decided, so the P7 review does not
re-litigate it.

### 83a. RECORDED — ONE v7, carrying both packages' shape changes

**What:** `SNAPSHOT_VERSION = 7` and `SNAPSHOT_KEY = 'dvr-demo-state-v7'` are shared. The single v7
entry in `persistence.ts`'s version-history comment lists all three changes and credits both
packages: (a) `userProfile` (P7.2), (b) `formOverrides` (P7.3), (c) `PROFILES` widened to include
`'limited'` (P7.3). `PersistedState` carries both new keys; `persistedStateSchema`,`snapshotOf` and
`loadSnapshot`'s return each name both.

**Why one:** neither branch shipped, so no snapshot ever existed at "P7.2's v7" or "P7.3's v7"
separately — bumping to 8 for the second would only invent a version nothing ever wrote. All three
compile-time devices survive the union intact: `z.enum(PROFILES)` still consumes the domain's own
`as const` tuple (device 3, the only one that closes a union WIDENING), every shape literal still
carries `satisfies FullShape`/`FullShapeIn` (device 2), and the version and the key still move
together in one edit.

**Trigger:** none. A future shape change bumps to 8 normally.

### 83b. RECORDED — `BRIDGE_PANE_IDS` won the pane-partition device; `STORE_CONNECTED_PANE_IDS` was dropped

**What:** both packages independently split `SettingsCategoryId` into "the bridge resolves it" and
"this registry resolves it", and named the split differently — P7.2's
`STORE_CONNECTED_PANE_IDS` / `StorePaneId` vs P7.3's `BRIDGE_PANE_IDS` / `BridgePaneId` (+
`isBridgePaneId`). One survives: `BRIDGE_PANE_IDS = ['user-profile', 'form-customization']`, with
`StubPaneId = Exclude<SettingsCategoryId, BridgePaneId>` narrowing `renderSettingsPane`'s parameter
exactly as both authors intended.

**Why that one:** it is the strictly richer device and the smaller total diff. It carries
`as const satisfies readonly SettingsCategoryId[]` (a typo'd id in the tuple is a compile error, not
a silently-never-matching branch), and it ships the `isBridgePaneId` guard that lets
`panes.test.tsx` derive `STUB_PANE_IDS` from the CATALOG rather than from
`Object.keys(SETTINGS_PANES)` — which turns the registry-completeness assertion from a tautology
into a real partition check. P7.3 also wrote it anticipating P7.2's id joining the tuple, so
absorbing `'user-profile'` was the one-line edit its own seam note promised. Both names appear
nowhere outside `panes/index.tsx` and `panes.test.tsx`, so the rename cost nothing at the call sites.

**What the merged partition test pins** (the union of both suites' assertions, one test):
`Object.keys(SETTINGS_PANES)` equals the catalog minus the bridge ids; the two sets together are
the whole catalog; and no bridge id also sits in the map (P7.2's "resolved twice" guard).

**Trigger:** none. A third store-connected pane is one tuple entry, one `renderPane` branch, one
deletion from `SETTINGS_PANES`.

### 83c. RECORDED — the bridge holds both branches, and P7.2's autofill was untouched

**What:** `DemoExperience`'s `renderPane` now branches `'user-profile'` → `UserProfilePane`, then
`'form-customization'` → `FormFieldsPane`, then falls through to `renderSettingsPane`. Both preview
wirings coexist in `settingsSections` (`profileName: userProfile.name` from P7.2,
the form profile from P7.1/P7.3 — see 83d for the shape that line settled on). P7.2's Completion `completedBy` autofill effect and P7.3's
visibility closures were not modified by the merge.

**Verified at the merge:** P7.3's claim that it left the `settingsSections` memo byte-unchanged
holds — its branch still carried the P7.1 placeholder `profileName: ''` and deps `[settings,
profile]`, so the block auto-merged to P7.2's live-name version with no hand edit. Two stale SEAM
comments (`SEAM(P7.3)` on the `profile` subscription and on `formProfileLabel`) were retired in the
same pass, since the seam they pointed at is now closed.

**Trigger:** none.

### 83d. FIXED (R-21) — the preview context takes the PROFILE, not a label, and the dead `??` is gone

**What R-21 caught:** 83c retired the two `SEAM(P7.3)` comments but left the seam's *shape*.
`SettingsPreviewContext.formProfileLabel` was a bare `string` — P7.1's honest choice while no
profile store existed — even though the closed `Profile` union and its total label map
(`FORM_PROFILE_SHORT`, itself an alias of `PROFILE_LABELS`) both live in that same file, and the
bridge's `FORM_PROFILE_SHORT[profile] ?? profile` fallback was unreachable by the type.

**Fixed, per the review's fix shape:** the member is `formProfile: Profile`; `settingsPreview`'s
`'form-customization'` arm does the `FORM_PROFILE_SHORT[…]` mapping itself, which is where the
phone does it (`useFormCustomizationPreview`, settings-catalog.tsx:158-167); the bridge passes
`formProfile: profile` and the `??` is deleted with its now-unused import. A fourth profile is now
a compile error in the label map rather than a raw id rendered on the master row. The suite's
seam-era test ("shows whatever label the caller supplies") became a totality assertion over
`PROFILES`.

`profileName` stays a bare `string` deliberately — it is free text the visitor typed, and the
blank case IS the domain (the phone's `Not set` literal). Only the closed one was narrowed.

**Trigger:** none. Recorded here because the widened parameter was merge residue, not a P7.1
oversight — the shape was correct for the package that wrote it and outlived its seam.

---

## 84. P7 review r1 — P7.1's fix round (shell + chrome): dispositions and the two ledgered items

**Source:** `docs/code-reviews/parity/p7/p7-review-r1-vetted.md` — P7.1's routed findings
(majors R-5, R-6 lead, R-7; minors R-9, R-10, R-11, R-14, R-18, R-19, R-25 lead, R-30, R-32,
R-34), fixed on `parity/p7-fix-shell`. Obligation **A4** is discharged in §80g above.

### 84a. RECORDED — the recurring shape this round fixed, so it is not re-introduced

Nine of the twelve were the same defect wearing different clothes: **a doc comment naming the
right idiom while the code shipped half of it.** `aria-disabled` citing `ModalActions` without
its `aria-describedby` (R-6); the `AlertDialog` "role + labelledby" idiom ported without the role
(R-10); a slider bound to a scalar under a percentage readout (R-7); seven `as const` tuples
written to close a hole and eight casts left open beside them (R-11); a count typed into prose
next to the registry that disproved it (R-5); a test asserting a box exists to prove its text
does (R-14).

The lesson for future rounds in this territory: when a comment names a precedent, **open the
precedent**. Every one of these was one to four lines away from being right, and every one
passed review-by-reading because the comment described the correct behaviour.

### 84b. LEDGERED (R-33, fix-or-ledger → ledgered) — the settings record still lives in the bridge

**What:** `DemoSettings` (22 fields) is `useState` in `DemoExperience` with one consumer, so
every slider step re-renders the whole phone subtree — `activeScreen()`, `activeModal()`, the
drawer, the rail. §80c settled *store vs bridge*; it never addressed *bridge vs sheet*.

**Why deferred, not fixed:** the fix is to move the state into `SettingsModal` and invert the
pane resolution so `renderPane` narrows to bridge ids only. That is a structural change to
`DemoExperience`'s render body — the ONE file all three P7 fix branches were editing
concurrently this round (P7.2 on the autofill effect, P7.3 on the explore memo). Restructuring
the bridge mid-round would have manufactured exactly the merge conflict the split was designed
to avoid, for a bounded perf cost the lane itself rated MEDIUM and blessed deferring.

**The design is already settled**, which is why this is cheap later: the `BRIDGE_PANE_IDS` /
`StubPaneId` partition (§83b) expresses precisely the split the fix needs — `SettingsModal`
calls `renderSettingsPane` itself for stub panes, and `renderPane` becomes
`(id: BridgePaneId) => ReactNode`. `settingsSections` either moves with it or keeps being passed
down as today.

**Trigger:** the next structural touch to `DemoExperience`'s modal region, or any profiling that
shows the drag cost mattering. Not before P7 merges — the whole point of deferring it was to
keep three branches off one file.

### 84c. RECORDED — R-19's ruling: the Export Security row withdrew its claim, the switches stayed live

The row previewed `On`/`Off` from the two encryption flags, phone-verbatim. "On" means "the next
export is encrypted" on the phone and means nothing here: no pipeline encrypts, the ZIP paths end
in the D4 notice, and the two exports that ARE real (case-map HTML, printed PDFs) go out
unprotected.

Ruled **fix, not ledger**, and specifically: withdraw the row's claim (`'Not applied'`, true in
every switch state) while leaving the switches live. D6's cosmetic arm is about controls that
*render state*; it was never a licence for a derived READOUT to assert a capability. The sibling
Cloud Sync pane had already drawn this line by holding its toggle inert — this is the same line
drawn one level up, at the preview instead of the control.

### 84d. RECORDED — R-25's second half rides this branch by the aggregator's instruction

`DEFAULT_USER_PROFILE` (`engine/logic/user-profile.ts`, P7.2's file) took the same one-line
`Readonly<…>` annotation as `DEFAULT_SETTINGS`. The vetted doc's R-25 body says "P7.2's file
rides the same commit" while its owner-routing table lists the half under P7.2 — read both ways,
a finding drops. It is a pure annotation with no behavioural surface, so it was done here and
flagged to the integrator: if P7.2's branch carries the same line, either copy can go.

### 84e. AVAILABLE — one duplicate derivation left for the integrator

R-5 exported `SWITCHABLE_FORM_FIELDS` from `form-customization.ts` (the field-capable filter).
`FormFieldsPane.test.tsx` still re-derives the same filter inline to reach its `toHaveLength(50)`
assertion. Consuming the export there is a two-line dedup and would make the 50 a single source
across copy, registry and test — deliberately not done from this branch, because that file is
P7.3's and was being edited concurrently.

**Trigger:** the P7 fix-round integration, or P7.3's next touch to that suite.

### 84f. RECORDED (fix-delta micro-round) — the two correlated-optional traps this round created

Both riders were shapes the r1 fix round introduced while fixing something else, and both were
correct at every call site — traps, not bugs. Recorded because the round's own lesson (84a: "when
a comment names a precedent, open the precedent") has a twin: **when a fix adds two props that
are only meaningful together, it has added a third state nobody wants.**

- **FD-3 — `role="region"` (from R-34).** It made the demo the owner of exactly one landmark, in
  the same round whose R-10 commit argues a landmark inside a dialog is noise. The whole settings
  surface is inside a `role="dialog"`; a landmark there adds a document-level navigation stop for
  a block already reachable from the switch that reveals it. Now a named `group`, which gives
  `aria-controls` its target with none of the landmark semantics.
- **FD-4 — two correlated-optional pairs in `_shared.tsx`.** `Toggle`'s `controls?`/`expanded?`
  (from R-34) permitted a switch advertising a disclosure relationship while withholding its
  state — the shape that loses axe's disclosure carve-out. `SelectField`'s `label?`/`a11yLabel?`
  (from R-9) permitted a picker with NEITHER, whose trigger, sheet title and menu all announce
  the bare placeholder. Both are now closed by type: one `disclosure` member, and a
  `SelectFieldName` union on the `RetentionView` precedent. Compile-probed — all three impossible
  states are diagnostics (TS2741 on the split disclosure, TS2322 on both nameless/double-named
  pickers); reverted.

**Trigger:** none — closed. Kept as the pattern note for the next a11y fix in this chrome.

---

## 85. P7 review round 1 — P7.2's fix dispositions (R-1, R-3, R-29, R-25 half)

**Source:** `docs/code-reviews/parity/p7/p7-review-r1-vetted.md` — the P7.2-owned findings, fixed
on `parity/p7-fix-profile`. One commit per finding.

### 85a. FIXED (R-1b) + A1 — the autofill's two corrections, and the corrected sentence

**The write (R-1b).** The Completed-By autofill now returns early when
`resolveFieldVisible('completion.completedBy', s)` is false. It previously wrote past the
visitor's own OFF: the input is not rendered, so the value could not be seen, edited or cleared,
yet it printed in the Case Notes document's Completion Information section (§81e) and greened the
drawer dot (`counted([])` ⇒ `'complete'`). The pane's footnote covers data "already entered"; this
was data the app CREATED after being told not to — the same shape as R-2's coordinate stamping.
The dependency list is byte-identical: the guard reads the resolver at fill time and changes
nothing about when the effect runs.

**The boundary, in the same words as its twin (FD-8, §86a):** only NEW writing is suppressed. A
name autofilled — or typed — BEFORE the field was switched off stays exactly where it is; hiding a
field is not a request to delete what it already holds, and a settings toggle that erased entered
data would be the opposite failure. R-1b and R-2b are one rule read at two sites: *a hidden field
accepts no new writes, and loses none of its old ones.*

**The contract (R-1a).** That dependency list is now pinned by two tests, one per plausible
"fix", each verified red under its mutation. The suite was mutation-blind because every shipped
test either arrived with a name already present or changed the profile from another view.

**A1 — the amendment.** The PR body's *"fills once, only into an empty field, typing survives"*
overclaims by omission. The accurate sentence, for the body and for anyone describing this effect:

> **Completed-By autofill:** fills once **per arrival** at Completion, only into a field that is
> both **empty and visible**; typing over it — or clearing it — survives **while the screen stays
> open**, and a later profile edit never rewrites a location that already carries a name. A field
> left empty, *including one the visitor cleared*, is filled again on the **next arrival** — phone
> parity, since the phone's effect re-runs on every screen mount. The dependency list
> `[store, view, currentLocationId]` is what makes all of that true; don't "fix" it.

The re-entry refill is behaviour, not a defect: it is what the phone does, and §81's own effect
comment was accurate about the open-screen case — it simply never said what happens on the next
arrival. The comment now says both.

**Phone twin filed:** PHONE-BUG-LEDGER item 20 — `completion.tsx:127-133` never reads the
`showCompletedBy` it resolves at `:59`, with the same two downstream consequences (the court PDF
prints it; the PDF validator's non-empty gate is silently satisfied).

**Trigger:** none — closed. Re-flagging the re-entry refill should be answered with this entry.

### 85b. FIXED (R-3) — the pane's storage promise is gated on the persistence handle

**What:** `UserProfilePane` takes `persisted: boolean` and swaps its opening clause; the bridge
samples `saveState().kind === 'saved'` when the Settings sheet OPENS, `flush()`-first, exactly
like the drawer's save-status line.

**Why it was a major:** `persistence.ts`'s `isLive()` doc states the rule in bold — any surface
promising refresh survival must gate that sentence on the handle — and both other promise sites
already did. A private-browsing or quota-exhausted tab (OCR data-URLs are the big payload) reaches
`{ kind: 'failed' }`, the snapshot is CLEARED, and an unconditional "kept for this browser tab"
kept promising storage that no longer existed.

**Sampling, not subscribing — deliberate:** the fact is read when the surface is about to make the
claim (R-2's rule), and re-read on every open, so a mid-session failure demotes the next visit. A
live subscription would put a persistence read in the render path of a pane that is usually shut.

**Trigger:** none. A third promise site should copy this shape rather than invent a fourth.

### 85c. FIXED (R-29) — `ModalShell.elevation` is a named two-member union

`MODAL_LAYER = { base: 0, overSheet: 4 } as const` + `ModalLayer`. The invariant is a RANGE —
above the overlays sharing the phone-overlay root, strictly below `PickerSheet`'s 31/32 so the
pickers a sheet CONTAINS still land on top — and a bare `number` let a caller break either end
while reading as valid. Pinned against both neighbours plus the rendered `z-index`.

**Trigger:** a third layer is a member here, next to the values it must sit between — never a
number at a call site.

### 85d. FIXED (R-25, P7.2 half) — `DEFAULT_USER_PROFILE` keeps `Object.freeze`'s `Readonly<T>`

The `: UserProfile` annotation widened it straight back, so a write compiled and threw at runtime
instead of being refused. Pinned by a declared-but-never-called `@ts-expect-error` probe —
executing it would prove the runtime half, not the type half. R-25's `settings-values.ts` half is
P7.1's and is deliberately untouched here.

**Trigger:** none.

### 85f. FIXED (FD-2 / FD-7) — the fix-delta micro-round

**FD-2 (gate).** R-29's layer test re-typed both neighbours' z-indexes, so the two-sided invariant
it was named for pinned neither side (the lane moved the Settings sheet 22→40 and the picker
31/32→20/21 with the suite green both times). Both ends are now exported by the surfaces that own
them — `SETTINGS_SHEET_Z` (`SettingsModal.tsx`, bound to `_shared`'s new `MODAL_SHEET_Z` because
that sheet paints on the shared shell layer by value) and `PICKER_SHEET_Z` (`PickerSheet.tsx`, its
SCRIM: the lowest layer it paints on, which is the one an opener must be under) — and the assertion
is relational. `_shared.tsx`'s own `21 +`/`22 +` literals are retired with them. Per the ownership
ruling the two `export const`s landed inside this package's commit rather than waking P7.1.

**FD-7.** `persisted: boolean` became `saveState: SaveStateKind`. Three states are "not saved" and
they are not the same news; the quota case (`failed`) — the one R-3 was filed about — was being
told the browser stores nothing. Four clauses, exhaustive via `assertNever`.

**Trigger:** none for either. The z-ordering has one home per end now; a third overlay layer joins
`MODAL_LAYER` and is bounded by the same two exports.

### 85e. RECORDED — the rider (lane-typescript Obs-2) landed with R-1a's tests

`user-profile-state.test.ts` now covers the symmetric v7 discard — the whole `userProfile` member
deleted — beside P7.3's `delete parsed.state.formOverrides` equivalent. Both v7 members are
required; a payload missing either is discarded, never defaulted.

**Trigger:** none.

## 86. P7 review round 1 — P7.3's fix dispositions, the A2 write-side ruling, and the A3 reset decision

**Source:** `docs/code-reviews/parity/p7/p7-review-r1-vetted.md` (REVISE — 0B/7M/27m), the
P7.3-owned rows of its routing table: majors R-2, R-4, R-6 (RowSwitch half); minors R-8, R-12,
R-13, R-15, R-16, R-17, R-20, R-22, R-23, R-24, R-26, R-27, R-28, R-31. All seventeen are FIXED;
nothing in this package was deferred. The entries below record the two rulings the doc attached
to this owner (A2, A3) and the four decisions a later reader could otherwise mistake for drift.

### 86a. RULED (A2, rides R-2) — the coordinate gate governs WRITES, not just pixels

**What §82b said:** the demo invented a gate the phone does not have, because the phone's four
`submission.*` coordinate ids are in its settings grid with no `useFieldVisible` reader — a
switch that moves nothing. §82b described the demo's version as "the capture control + lookup
notice + coordinate card go with it", i.e. display.

**What it now means:** display **and** stamping. With the group hidden, `LocationFields`'
`onPick` no longer writes `lat`/`lng`/`accuracyM`/`coordinateSource`; street and city are
always-on and still write. The aggregator's ruling, and it is right on this project's own terms —
a switch that governs what the visitor SEES while the app keeps writing what they cannot see,
verify or clear re-creates the dishonesty the gate was invented to remove, one level down, and
those coordinates reach the Map pin and the exported case map.

**The boundary, stated once:** only NEW stamping is suppressed. A coordinate captured before the
switch was flipped stays exactly where it is — that is the pane footnote's "already entered"
case, and removing it would be the opposite failure (a settings toggle deleting evidence).

**§82b stands as written**; this entry completes it rather than replacing it. The phone-side
half is unchanged: ledger item 19 still asks the phone to gate its four ids at all.

### 86b. RULED (A3, rides R-13) — `reset()` preserves the whole settings family

**What was decided:** `reset()` now carries `userProfile`, `profile` AND `formOverrides` across.
Previously it preserved the first (P7.2's branch, §81c) and wiped the other two (P7.3's) — two
answers to one question, reached independently, reconciled nowhere, and asserted nowhere in
either direction (the reviewer's probe flipped the behaviour and 280 tests stayed green).

**Why preserve, not wipe:** all three are device-level configuration that the phone cannot reset
at all, and both feature READMEs say so in the same words — `user-profile`'s "kept separate from
the SQLite-backed case data", `form-customization/README.md:12-13`'s "device-level config —
never case data". `reset()`'s own doc already scopes "start over" to the visitor's CASES. Which
form a deployment runs is a configuration OF the wizard, not a thing the wizard holds.

**What still forgets it:** the tab. The snapshot is per-tab and dies with it, and the one caller
that exists — the route error net's "Start fresh" — clears the snapshot BEFORE it resets, so a
genuinely poisoned session still boots clean.

**Trigger:** an owner ruling the other way. If it comes, change all three together — the point
of this entry is that the family has one rule, not that the rule is preserve.

### 86c. RECORDED — three shapes hardened from "pinned by test" to "pinned by type"

Each was a real gap the review found, and in each case the fix moved the guarantee down a level
rather than adding another assertion:

- **R-22** — `selectVisibleWizardScreens` cast `FormStepId` → `WizardScreenId` and explained that
  a test would catch a leak. `LinearFormStepDef` (`id: WizardScreenId`, `additive?: false`) now
  carries the narrowing from `DRAWER_DEFS` to the router, so an additive tool in the linear list
  is a compile failure. The registry test's `additive !== true` assertion stopped typechecking as
  a meaningful comparison — which is the finding restated.
- **R-20** — the drawer's tool set was `{ capture, audio }`, ad-hoc names re-declared at the
  consumer, so a third additive tool would have compiled everywhere and silently never reached
  the accordion. The prop is now `Readonly<Record<AdditiveFormStepId, boolean>>`, imported rather
  than re-declared, which closes the drift between selector and consumer.
  **AMENDED (fix-delta FD-1) — the first attempt did NOT close the gap this bullet claimed, and
  the claim is the §84a shape re-introduced by a fix commit.** `Readonly<Record<…>>` on the
  signature is not a compile gate when the value is produced by
  `Object.fromEntries(…) as Record<…>` (the cast absorbs a widened tuple) and consumed by two
  hand-written `...(mediaTools.x ? [row] : [])` spreads (TypeScript has no unread-key check).
  The reviewer's third-tool probe errored **zero** times in the two files this entry named. It is
  true now, and by the device the rest of the feature uses: a total object LITERAL in
  `selectMediaToolsVisible`, and a total `TOOL_ROWS: Record<AdditiveFormStepId, …>` at the drawer
  with the rows derived from `ADDITIVE_FORM_STEP_IDS` and the ungated library row appended.
  Re-probe: `selectors.ts` ×1 and `WizardDrawer.tsx` ×1, both required before a third tool
  compiles. See §86g.
- **R-24** — `ProfileDefaults` was typed total, documented total, built with `{} as Record<…>`
  and read back with `?? false`. Built by mapping the registries in one expression; both
  fallbacks deleted. **Scope, stated precisely (fix-delta typescript obs 1):** `buildDefaults`
  still ends in `Object.fromEntries(…) as Record<…>` — the same assert-don't-prove shape as
  R-20's, and it is NOT a compile gate. It cannot be one: the key spaces are 12 and 58 ids read
  off the registries at runtime, so a literal would be the registries written twice. The proof
  is `content.test.ts`'s per-key totality pin, named in the code, and that is what this bullet
  claims — nothing more.

### 86d. RECORDED — `selectDrawerStatus`'s second argument is a required MODE (R-23)

The drawer-dot vs map-pin split (§82f) was expressed by argument ABSENCE, so a caller who simply
forgot got the map-pin semantics silently. The parameter is now required and its type names both
readings: `FormVisibility | 'count-all'` (`COUNT_ALL_FIELDS`). §82f's reasoning is unchanged —
the drawer asks "what is left for ME to fill" and the map asks "how far along is this LOCATION" —
only the way a caller states which one is.

### 86e. RECORDED — what the a11y half of this round did and did not cover

R-6's RowSwitch half and R-31 are fixed here: locked grid switches point `aria-describedby` at
their own "Always on" pill (so the reason is the pill's existing words, not new copy), and the
row expander stopped baking `expanded`/`collapsed` into its accessible name.

**Not covered here, by routing:** the shared `Toggle` + stub-pane half of R-6, and R-9/R-10/R-32/
R-34 — all P7.1's. A reader auditing accessibility across the Settings surface should read this
entry together with P7.1's, not conclude from the grid's fix that the surface is done.

### 86f. RECORDED — the two dead-code deletions, so neither reads as an accident

`checkArray` (R-16) lost its last caller when the dots became visibility-aware and was deleted
rather than kept as an untested near-twin of `countedArray`. Nothing else in P7.3 was removed
this round. The earlier `nextChapter`/`prevChapter` and `FORENSIC`/`getProfile` deletions are
§82f's and §82's, not this round's.

### 86g. RECORDED (fix-delta FD-1, gate) — R-20's totality is now proven at both ends

**What the delta found:** three texts — commit `e7eb681`, `selectors.ts`'s doc comment and §86c —
all stated that a third `AdditiveFormStepId` "breaks here and at the drawer until both are wired".
The aggregator's probe (append `'ocr'` to the tuple, satisfy the two pre-existing registries)
produced errors in `content/form-customization.ts` ×2 — both registries that were already total
BEFORE R-20 — and **zero** in `selectors.ts` and `WizardDrawer.tsx`, the two files the claim
named. The new tool would have appeared as a switchable row in the Form Fields grid with no
accordion row behind it: §82b's exact phone defect, a switch that moves nothing, re-introduced by
the commit that claimed to prevent it.

**Why neither end forced:**

- `Object.fromEntries(…) as Record<AdditiveFormStepId, boolean>` — `fromEntries` returns
  `{[k: string]: boolean}`, so the assertion CLAIMS totality; a widened tuple is absorbed by the
  cast and can never break the function.
- the drawer's `rows` was two independent `...(mediaTools.x ? [row] : [])` spreads. Reading two of
  three keys off a total `Record` is not an error — TypeScript has no unread-key check — so that
  end had no gate at all.

**Fixed by the device the rest of the feature already uses** (`MODAL_IDS`, `STEP_CLASSIFICATION`,
`ADDITIVE_STEP_LABELS` — which is why the probe's pass 1 caught two of them): a total object
LITERAL in `selectMediaToolsVisible`, and a total `TOOL_ROWS: Record<AdditiveFormStepId,
(h: MediaHandlers) => MediaRow>` at the drawer, with the accordion's rows derived from
`ADDITIVE_FORM_STEP_IDS` (registry order, never hand-listed) and the ungated library row appended.
The row builders stay in `WizardDrawer.tsx` because they carry JSX — the reason
`ADDITIVE_STEP_LABELS`' own comment gives for keeping labels out of the engine.

**Re-probe after the fix:** `selectors.ts` ×1 (`TS2741: Property 'ocr' is missing`) and
`WizardDrawer.tsx` ×1. Both must be satisfied before a third tool compiles, which is what the
three texts said all along. §86c's R-20 bullet is amended in place rather than deleted, so the
overclaim and its correction stay legible together.

**The incidental gate R-20 did leave** — three test files' `mediaTools` prop literals — is no
longer load-bearing. It was the only thing standing between a third tool and a silent miss, and
an ordinary shared-factory refactor of those fixtures would have removed it without a word.

### 86h. RECORDED (fix-delta FD-5) — R-28's second direction was vacuous, and is now one honest pin

**What:** the "lets no OTHER row collide with a form-step id" test filtered `others` by
`!WIZARD_SCREENS.includes(i.id)` — which removes precisely the ids that could trip it — and then
allowlisted the only two survivors that could be form steps. The assertion could not fail; the
lane's probe (re-pointing the non-step `settings` row at `audioRecording`, the exact collision the
test describes) passed.

**Re-aimed rather than deleted.** The guarantee worth having spans the whole `FORM_STEPS` id
space, both directions at once: **every one of the 12 step ids is carried by exactly one explore
row.** A drifted slug drops that count to 0; a colliding non-step row raises it to 2. That single
assertion covers what direction 1 covered for the ten linear screens AND the two additive tools
direction 1 never reached, and it is the pin that actually reddens under the lane's probe.
Direction 1 keeps the routing half it alone asserts (each wizard-screen row jumps to its own
screen).

## 87. P8.1 — splash + biometric boot: the deliberate omissions and the two open ends

**Source:** implementation of P8.1 (plan §5 P8, matrix rows 1–2, owner decision D7). Nothing here
came from a review; these are the calls the package made, written down so a later reader does not
mistake any of them for an oversight. Rows 1 and 2 are CLOSED by this package; row 3 is not, by
instruction.

### 87a. NOT BUILT (by instruction) — the Lock Screen, matrix row 3

**What:** the phone's foreground re-auth overlay — `LockScreen` + `GridBackground`, the
module-level `globalAuthLock`, `MIN_AUTH_INTERVAL_MS` 1000, the provider's 2 s cooldown and its
`background → active` AppState filter (`src/features/biometrics/components/LockScreen.tsx`,
`AuthenticationProvider.tsx:110-161`, ui-mapping 14 § LockScreen).

**Why deferred:** D7 ratified rows 1–2 and explicitly left row 3 unbuilt; the matrix's own
recommendation says why — "a demo has no background/foreground cycle to justify it"
(`00-surface-parity-matrix.md:285`). A browser tab has no analog of the phone's re-lock trigger:
the closest events (`visibilitychange`, `blur`) fire on a tab switch, which is not the same act
and would re-gate a visitor who never left. Every safety device in the phone's version exists to
stop an auth prompt loop, and there is no prompt here to loop.

**Trigger:** an owner ruling that the demo should re-gate on tab return. If it comes, it is a
second `BootSequence` mount with `videoSrc: null`, not a new component — but it needs a decided
answer to "what event means the visitor left" first, and that answer is the actual work.

### 87b. RULED — the boot HUD is NOT wired to Settings' `appLockEnabled`

**What:** the phone skips its HUD entirely when app lock is off and goes straight to the video
(`AuthenticatedSplashScreen.tsx:126-130`), and the demo has a live, persisted `appLockEnabled`
switch in the Security pane. They are deliberately not connected: boot always shows the scan.

**Why:** binding them would give a *security* toggle authority over a *decorative* animation.
The switch would appear to do something while protecting nothing, which is a larger dishonesty
than the animation is — and it would directly contradict `SecurityPane`'s own standing note that
none of those switches can do anything in a browser. The demo's boot HUD earns its place by
gating nothing at all; the moment a security control drives it, it starts implying it does.

Two consequences a reviewer will notice and should not re-flag: the demo shows the HUD where a
default-configured phone (`appLockEnabled: false`, `DEFAULT_BIOMETRIC_SETTINGS`) would show only
the video — D7 commissioned the scan, so that is the point of the package, not a drift; and the
phone's `BiometricsUnavailableScreen` branch (matrix row 4, OUT-OF-SCOPE) has no counterpart here
for the same reason it has none in the Security pane.

**Trigger:** the demo gaining any real gate — a password-protected export, a shareable session
link. At that point a security switch has something true to control and the question reopens.

### 87c. RECORDED — the deviations from the phone, and why each one is not a gap

- **SKIP and Escape.** The phone's splash cannot be skipped. This one can, from every phase. The
  phone's dwell is an OS biometric prompt the user is actively answering; this one is 1.2 s of
  decoration in front of the content, and later an intro video of unknown length. Unskippable,
  it would hold a keyboard or AT visitor in front of a decoration with no exit — the §84a family
  of "the idiom was named and half-shipped", one level up. The control is focusable in every
  phase and Escape does the same thing.
- **No `failed` state.** `ScannerState` has four members; `BootHudState` has three. There is no
  authentication to fail, so a failure branch — and the phone's `TAP TO RETRY` hint with it —
  would be theatre about an event that never happened.
- **`TAP TO SCAN` where the phone says `INITIALIZING`.** The phone auto-triggers its prompt
  after 500 ms; a browser has nothing to trigger, and a gesture is the honest substitute. The
  string is the prototype's, kept.
- **Reduced motion skips the intro video entirely.** Not "plays it without the fade" — skips it.
  A visitor who has asked for less motion has not asked for a shorter animation, and the house
  idiom is instant-complete (`ScreenStage.tsx:39-49`, `ExportModal.tsx:158`'s R-18 note).
- **A rail checklist jump lifts the gate.** The rail is a demo-only surface outside the phone, so
  it stays clickable while boot is up. Left alone, a jump would move the phone behind the curtain
  and read as a dead control; it now ends the boot as well as setting the view, so naming a
  destination takes you there.

### 87d. AVAILABLE — the intro video ships as a slot, not as a file

**What:** `BOOT_VIDEO` is `null`. Every phase behind it — `video`, `holding` (the phone's 500 ms
`HOLD_DURATION_MS`), `fading` — is implemented and tested against a fake source, including the
`ended` advance, the error path, and the preload-behind-the-HUD mount the phone uses
(`AuthenticatedSplashScreen.tsx:249-269`).

**The drop-in is one constant.** The full procedure is written on `BOOT_VIDEO` in
`features/demo/engine/logic/boot.ts`: file into `public/demo-media/`, fill in the constant. The
engine suite asserts it is still null, so the change announces itself.

**AMENDED after the P8 review (round 1) — this entry twice claimed more than the code delivered,
and both claims were on the no-re-review path this entry exists to promise:**

- *"two constants"* (R-1d / R-17, obligation A2) was two constants **plus three bridge-test
  edits**: `videoSrc` and `videoPoster` were independent optionals that could be half-flipped
  without a type error, and `DemoExperience.boot.test.tsx`'s `runSequence` hard-coded the
  null-source phase path, stalling in `video`. Both are closed: the pair is now one
  `BootVideo | null`, so a half-flip is `TS2741` at the constant and the prop, and `runSequence`
  fires `ended` when a video element is present. Re-probed after the fix — constant flipped, the
  bridge suite is green and only the engine guard reds, which is the intended announcement.
- *"the load/decode/**autoplay-rejection** error path"* (R-5, obligation A1) overclaimed the
  third arm: jsdom's `play()` returns `undefined`, so `started instanceof Promise` was false in
  every committed test and the `.catch` was never attached. The code was right; the coverage claim
  was not. A rejecting-`play()` test was added in the fix round, so the sentence above is now
  true — and the arm it covers is the likeliest field failure of the three (iOS Low Power Mode
  blocks muted autoplay outright).

**ONE THING TO DO ON DROP-IN DAY (§88f, ledgered from the campaign-final fix-delta, S5).** The
stall watchdog budgets TOTAL wall clock from phase entry, not time-since-progress: an intro that
rebuffers for more than `VIDEO_OVERRUN_MS` in aggregate is faded out as stalled even though it was
making progress. Sound and graceful today — every path ends in a breadcrumbed fade — and with no
real file there is nothing to measure it against, which is why it was not reworked. With the file
in hand, watch one playback on a throttled connection; if it cuts, move the watchdog to a
progress basis (`onTimeUpdate` writing a ref, watchdog re-armed from last progress). This line
lives here rather than in a review doc so it cannot be missed on the day it matters.

**Trigger:** the owner supplying the bunker-doors file.

### 87e. RECORDED — where boot sits relative to persistence, and what that cost

The sequence runs on **every mount**, including a refresh that rehydrates a live snapshot. A
browser refresh is the demo's cold start, and the phone re-runs its splash on every cold start
while `isAuthenticated` resets to false (`biometrics/README.md` § Common Pitfalls 1) — so a
returning visitor sees it again, exactly as a returning phone user does.

What that forced: boot had to be a **gate**, not a `view`. `view` is in the snapshot
(`persistence.ts`), so a `view: 'splash'` boot would have thrown away the restored position on
every refresh and undone half of what P0.4 exists to do. Instead `booting` is mount-scoped bridge
state (the phone's `showSplash`), it renders instead of the screen tree, and it touches no
navigation — the restored view is still underneath when it lifts. `persistence.ts` and
`SNAPSHOT_VERSION` were not touched.

The residual: `booting` is bridge state, so it is invisible to the store's tests and to anything
that reasons about the demo from `DemoState` alone. That is the same trade §80c/§84b already made
for `DemoSettings`, and for the same reason — it is ephemeral, it has one consumer, and putting
it in the snapshot would mean deciding whether a refresh mid-scan resumes the scan.

**Trigger:** a second consumer needing to know the gate is up (an analytics hook, a deep link
that should bypass boot). Then it moves — and the bypass question gets answered on the way.

## 88. P8 review round 1 — the fix round's dispositions (19/19 fixed, 0 deferred)

**Source:** `docs/code-reviews/parity/p8/p8-review-r1-vetted.md` (REVISE — 0B/6M/13m, R-1..R-19),
executed against its own 17-row dependency-ordered grouping. Every finding is FIXED; nothing was
deferred and nothing was refuted. Both amendment obligations (A1, A2) landed in §87d. The entries
below record only the four decisions a later reader could otherwise mistake for drift.

### 88a. RECORDED — what the R-1 family cost, and why the severity ruling was right

Four sub-defects on one seam, all invisible at `BOOT_VIDEO === null`, all arming together on
drop-in day. The fix round confirmed the aggregator's central reasoning by accident: the R-17
probe (flip the constant, run the bridge suite) reds nothing now, and before the round it red
three tests — so the "no re-review needed" promise in §87d had been false in a way only the flip
itself would reveal, which is exactly the day nobody re-opens the files.

**The two shapes worth carrying forward.** First, a handler wired to a phase-less callback
(`onError={skip}`) on an element that exists in EVERY phase: the mount was deliberately early (the
phone's preload trick, correctly ported) and the handler was written for the late phase only.
Where an element's lifetime is wider than its handler's intent, the handler must read the phase.
Second, an unbounded wait whose exit belongs to something outside the app — `ended` — with no
ceiling. `PHASE_MS.video = null` was and remains the right statement about the MACHINE; what was
missing was the component's own timeout. Both are worth a look at any future "wait for an external
event" phase.

### 88b. RULED — `bootSurface` is the last hand partition over `BootPhase`, and it is a record

R-11a's deny-list is gone, and the growth probe now yields four compile errors for a new phase
(`PHASE_MS`, `SURFACE`, `HUD_STATE`, `nextBootPhase`'s switch) where it used to yield three, none
of which was the surface. The opacity check at the container is DELIBERATELY still an inline
partition: the review struck the lane item that wanted it converted, because it is an allow-list
whose default (fully visible) is the safe side for every realistic insertion. Don't "finish the
job" by converting it — that reverses a ruling.

**CORRECTED (campaign-final fix-delta, S2): "the last hand partition" is off by two.** Three
inline `BootPhase` partitions remain in `BootSequence.tsx`, and an auditor stopping at this
entry's original wording would walk past two of them. All three are safe-by-default, which is why
none was converted:

| Site | Partition | A new phase defaults to |
|---|---|---|
| `:126` | `phase !== 'idle' && phase !== 'done'` (R-14 reduced-motion collapse) | collapsing — the visitor's stated preference wins |
| `:171`/`:173` | `phase === 'video' \|\| phase === 'holding'` (R-1a error scope) | the degrade-and-continue arm, not the fade-out arm |
| `:264` | `phase === 'fading' \|\| phase === 'done'` (container opacity) | fully visible — the review STRUCK the lane item that wanted this one converted |

`bootSurface` is the only partition that pointed the unsafe way, and it is the one that became a
record. Don't "finish the job" on `:264` — that reverses a ruling.

**`BootHudState` is now DEFINED by `BOOT_HUD_STATES`**, and `BootPhase` is not (it stays a written
union, with `BOOT_PHASES` read off `PHASE_MS`). Two mechanisms, one guarantee, chosen per union:
the small closed one is cheapest as a tuple; the seven-member one reads better as a union and
already had a total record to derive from.

### 88c. RECORDED — the R-9 comment was wrong in the way R-9 is about

While fixing R-9 the probe showed the replacement comment had inherited the original's error:
it claimed `HUD_STATE` helps close the branch set. It does not — `HUD_STATE` is keyed by
`BootPhase`, so growing `BootHudState` leaves it green. Adding a member yields exactly ONE
`TS2741`, in `SplashScreen`'s `statusBody`. §84a's lesson, encountered inside the fix for a
§84a-shaped finding: when a comment names a guarantee, run it.

**AMENDED (campaign-final fix-delta, S1).** "Both comments now say that" was true of `boot.ts`
only — `SplashScreen` shipped R-9 still crediting `HUD_STATE`, and still carrying the retired
"cannot drift" line on the `AuthState` alias. The campaign-final aggregation ruled the cause
immaterial and very likely a destroyed concurrent edit; the tree says otherwise and the tree is
checkable: commit `9602d29` ADDED the uncorrected text, and the follow-up correction was a
`python3 -c` `.replace()` whose pattern never matched (backticks inside a double-quoted shell
string) and which — unlike every other edit in that round — carried no `assert`. A silently
no-op'd replace, reported as done. Both comments say it now, in the same commit as this sentence.
The transferable rule is the one the round already used everywhere else and broke here once:
**a scripted edit asserts its own pattern, or it did not happen.**

### 88d. RECORDED — R-19 was pinned, not left as the recorded choice the review offered

The review allowed leaving the gate's window-keydown cleanup unpinned. R-7's fix changed the
calculus: `ExitDialog`'s `stopPropagation` makes the ORDERING of that listener load-bearing, so a
leaked handler is no longer merely a no-op `setPhase` on a dead tree — it would keep answering
Escape underneath a live dialog. Pinned by identity (the handler added is the handler removed).

### 88e. RECORDED — R-12's seam, and the four assertions it moved

`visited` seeds `{}` now; the landing view is marked by the bridge replaying `setView` on the
current view once nothing covers it. The alternative — marking from `endBoot` alone — would have
left the ~30 `boot=false` suites unlit, and fabricating the row's state in the rail would have
been a worse lie than the one being fixed. Four engine assertions moved, each of which had
encoded the claim that P8.1 falsified (`boot marks the cases view visited`, the `setView`
idempotence expectation, `reset()`'s boot record, and the selectors' "boot view" line).

**Not a trigger, a note:** `visit()` stays idempotent and the mark is replayed on every non-boot
mount, so a restored snapshot's record is never rewritten. If a future surface needs "seen this
session" as distinct from "seen ever", that distinction does not exist here and adding it is a
new decision, not a bug fix.

### 88f. LEDGERED (campaign-final fix-delta, S5) — the watchdog's basis is wall clock, not progress

**What:** `VIDEO_CEILING_MS` / `VIDEO_OVERRUN_MS` bound the `video` phase from the moment it is
entered. A long intro that rebuffers repeatedly can exhaust that budget while genuinely playing,
and be faded out as a stall — which the constant's own comment used to deny in absolute terms.
The comment now says what the mechanism does.

**Why deferred, not fixed:** three lanes converged on the shape being sound — every terminal state
is a graceful, breadcrumbed fade, and under R-1's own use-day rule this rates LOW *at the drop-in
too*, so it does not inherit R-1's must-fix. The rework (an `onTimeUpdate` ref plus a re-armed
watchdog) is the code-heaviest survivor of the round, and with `BOOT_VIDEO === null` there is no
file to tune it against: the numbers would be guesses twice over.

**Trigger:** the owner's D7 drop-in. The instruction is written beside the drop-in procedure in
§87d, not only here, so the fixer on that day meets it without reading this ledger.

---

## 89. W0 (PR #39) — `#2B8CC1` as TEXT on `colors.background` crossed the AA line when the ground lightened (4.66 → 3.94), 14 sites

**Source:** PR #39 review r1, web lane MEDIUM; aggregator ruling in `docs/code-reviews/ui-parity/w0/VETTED-r1.md`.

**What:** fourteen sites spend `#2B8CC1` (`colors.primary`, a FILL token under DEF-UI-018) as text
directly on the app background — worst-lit: `SplashScreen.tsx:61,63,96` ("TAP TO SCAN"),
`settings/SettingsNavBar.tsx:93` (16px/500 nav label), `settings/SettingsCategoryList.tsx:112`,
`StoryRail.tsx:75`; plus `AboutPane.tsx:88`, `_pane-chrome.tsx:56`, `FormFieldsPane.tsx:228`,
`ExportCaseCard.tsx:161`, `ExportLocationRow.tsx:74`. U0.1's re-base of `background`
(`#0d1b2a → #002853`) took the measured ratio from **4.66 to 3.94** (AA text floor 4.5) —
independently reproduced by the aggregator. On the glass stops it was already a documented ceiling
(4.35 → 4.25; DEF-UI-018 / D5).

**Why deferred:** D3 confines W0 to seams plus values that CHANGED; `#2B8CC1` did not change. Matrix
A27 and A66 assign the accent-as-text adoption (`colors.link`, 9.60 on `background`) to **U2** (A66,
outline/ghost buttons) and **U6**. Sweeping fourteen literals from W0 would be doing those rows early
into files those packages open. The number is recorded here so the later package inherits it instead
of re-deriving it.

**Trigger:** the package that lands matrix row **A66 (U2)** and the **U6** adoption re-measure these
fourteen sites as their closing act. Any site still measuring < 4.5 after U6 merges reopens this at
HIGH — observable as `grep -rn "#2B8CC1" features/demo/ui --include=*.tsx` returning a `color:` site
outside the token modules.

**TRIGGER LAPSED (W3 r1) → finding F52** (`w3/VETTED-r1.md`): the U6 clause closed with four `color:` sites still under 4.5 and no re-measure in any U6 report. Disposition: the three W3-owned sites fix in W3's round (LocationDetailCard, CaseMapPicker, `_pane-chrome:117`); **SplashScreen ×3 re-cut to U8.1's re-base**; **StoryRail:75 RULED D12-frozen** (the ratified freeze governs the surface — its 3.94 is recorded here as the freeze's documented ceiling, not re-pointed). Row closes when F52 lands and U8.1 takes the splash sites.

**Annotation (PR #42, W2 r1):** the U2/A66 button half is CLOSED — U2.2 re-pointed the four true outline sites, the three tinted-fill sites and the three `CaseActionsSheet` sites at `colors.link` (measured 7.65 on card). The **U6 adoption clause stays open**; the 14-site list above is unchanged for the non-button sites.

---

## 90. ~~W0 (PR #39) — the demo's CTA accent pair is DARK-ONLY; `PrimaryButtonGradient.light` has no owning package~~ — ✅ RESOLVED — PR #42

**RESOLVED (U2.2, W2):** all three trigger clauses landed — `PrimaryButtonGradient` ships both halves in `controls/button-recipe.ts:69-72` (`b6fe7ee`), contrast rows 12L/13L are live, and the two light gradient anchors are in `check-rn-parity.mjs` (`4b1ffb7`; the ts lane's `gradientTop.light` mutation probe KILLED at W2 r1). Original entry below for history.

**Source:** U0.4 report §7 P-2; U0.5 report §7 P-1; PR #39 type-design lane (disclosed, not
re-filed); aggregator ruling W0 r1.

**What:** `features/demo/ui/glass-tokens.ts:34-35` hold the phone's `PrimaryButtonGradient.dark`
(`[Colors.dark.primaryDark, '#17527A']`) as two module consts. The phone's light pair
(`['#2563eb','#1d3584']`) has no web token; contrast rows 12L/13L in `palette-contrast.test.ts` are
`it.todo` titled UNOWNED; the drift guard's `gradientTop`/`gradientBot` rows are dark-only where every
palette key is pinned in both halves. D2-amended reads: *"Nothing hard-codes a dark value that has a
light sibling."* This is the one place the "flipping the consumed scheme is a one-site change" claim
is structurally false.

**Why deferred:** no light surface renders; the two consts must stay `readConst`-readable literals
because the guard reads them by name; giving them a `{ light, dark }` shape reddens
`glass-tokens.test.ts`'s shape pin and `app/demo/__tests__/error.test.tsx:75`'s ban list — a
token-shape change, not a one-liner, and W0 r1 F7 (`satisfies typeof colors.primaryDark`) closes the
dark half's drift hole now.

**Trigger:** **U2.2** — it ports the phone's other two per-scheme recipes that live outside `Colors`
(`ElevatedEdges`, `DangerFill`); its closing act adds the light pair, the two light gradient anchors
to `check-rn-parity.mjs`, and un-todos rows 12L/13L. Earlier if U1.1 reshapes `glass-tokens.ts` to
`{ light, dark }` anyway. Hard stop: plan §9 clause 12's light-mode flip at U8 exit cannot be
one-site while these are dark-only. Orchestrator: add to U2.2's row.

---

## 91. W0 (PR #39) — the drift gate is `it.skipIf(!rnAvailable())`: without the sibling phone repo the suite is green regardless of drift, and nothing enforces that the gate RAN

**Source:** U0.4 report §7 P-4; PR #39 body; matrix A96 ("record that ..."); silent-failures lane
out-of-lane; aggregator ruling W0 r1.

**What:** every parity case in `features/demo/ui/inputs/__tests__/rn-token-parity.test.ts` skips when
`../../extraction_case_notes_react_native_expo/src/constants/Colors.ts` is absent; Vitest reports a
skipped case inside a green run at exit 0. The standalone `node .design-sync/check-rn-parity.mjs`
prints `skip:` and exits 0 too. The test header documents it; no `package.json` script or CI invokes
the standalone. As of U0.4 that is 33 anchor rows (67 once W0 r1 F2 lands) resting on a skip.

**Why deferred:** this repo has **no `.github/` directory and no CI** (verified at `7099e54`). A hard
throw when the repo is absent breaks every contributor without the phone checkout — which is why the
skip exists. Enforcement needs somewhere to attach (an env flag or a workflow).

**Trigger:** **the first CI workflow that runs `pnpm test`** — `.github/workflows/*.yml` appearing in
the tree. That workflow must either check out the sibling repo or set `REQUIRE_RN_PARITY=1`, and the
guard must fail hard under that flag. Until then every wave's verification seat states in its report
that the guard RAN (the resolved RN root printed in the test title), as W0's did.

---

## 92. W0 (PR #39) — the exported Case Map HTML (`engine/logic/case-map/template.ts`) keeps the pre-port palette

**Source:** W0 verification seat `_captures/w0/DIFF.md` §4.3; U0 foundation report §7 P-4; plan §2
(v1 §6.4 exclusion); aggregator ruling W0 r1.

**What:** `features/demo/engine/logic/case-map/template.ts` hard-codes `--navy-800: #0d1b2a`,
`--navy-700: #132236`, `--border: #1e3a5f` in the exported document's own CSS, with comments naming
them as `Colors.dark.background` / `backgroundSecondary`. The app renders `#002853`; the artefact it
exports renders the retired navy (the two downloaded artefacts before/after W0 are byte-identical
except `generatedAt`). No matrix row names the file; `palette.test.ts`'s `RETIRED` sweep is rooted at
`features/demo/ui` and does not see it.

**Why deferred:** plan §2 excludes *"the case-map HTML export's own design system"* by name — a scope
boundary, not an oversight. It is a standalone generated document, not an app surface, and re-basing
it needs the tier/status vocabulary that only exists after U1–U3.

**Trigger:** **U8.4 (design-sync)** — its closing census must either re-base the template or record
an owner ruling that the export deliberately keeps its own palette. Earlier if any package's diff
touches `template.ts` for another reason, or the owner rules the artefact must track the app.
Orchestrator: add to U8.4's row.

---

## 93. W0 (PR #39) — the eight UNCHANGED high-frequency hexes are neither banned nor swept; a ban lands in the commit that changes the value

**Source:** U0 foundation report §7 P-1 / P-2; U0.5 report §7 P-3 (the explicit exclusion answering
P-1's trigger); D3; aggregator ruling W0 r1.

**What:** `#4BA3D4` (`primaryLight` — 41 bare sites across 19 files, 4 lowercase, plus a second keyed
definition at `screens/map/mapTokens.ts:58`), `#2B8CC1` (26 files), `#f0f4f8` (50), `#7a9fc4` (44),
`#99badd` (25), `#ff4757` (16), `#10d177` (15), `#ffd93d` (15) are all defined in
`ui/tokens/palette.ts` AND still spelled bare across `ui/`. `glass-tokens.test.ts`'s `BANNED` carries
only the fifteen values U0.1/U0.3 CREATED. Consequence recorded in W0 r1 F5: the `T`-alias test cannot
catch a de-alias on the five of these that `T` re-exports.

**Why deferred:** their values did not move, so a bare copy is de-duplication debt, not drift; banning
them forces the 1,144-literal sweep D3 ruled against, from a test package into files U2/U5/U6/U8 own.

**Trigger:** **the commit that CHANGES any of these values bans it in the same commit and sweeps its
sites** (the standing rule: a token's ban lands with its value change). Named fallbacks: **U5.1**
re-points `mapTokens.ts:58` to `colors.primaryLight` and owns the `#4BA3D4` sweep if nothing changes
the value first; **U3.2** for the status quartet. Observable violation: a diff to one of these lines in
`palette.ts` without a matching `BANNED` entry.

---

## 94. ~~W1 (PR #40) — `colors.modal` (`#17416e`) has no consumer and no adopting row~~ — ✅ RESOLVED — PR #42 (trigger satisfied; refuted at phone source)

**RESOLVED (U4.2 R-2, W2):** the trigger's "or records why the demo's modal stays at ground" arm was satisfied — at phone `dd5551ec`, **ten of ten** page sheets paint `colors.background` behind `GridBackground`, and `Colors.dark.modal` has **zero consumers in the phone repo** (`grep colors\.modal src/` → one `zIndex.modal` hit). The demo's flat modal ground IS parity; the ground now carries a pin (`dbe422b`) and the ruling is written at `_shared.tsx:81-88`. Corroborated on-screen by `_captures/w2/DIFF.md` §5.2. Matrix A5's Delta owes the correction (orchestrator). Original entry below for history.

**Source:** W1 verification seat `_captures/w1/DIFF.md` §4.2; matrix A5 ("add the token, use it nowhere yet"); aggregator W1 r1.

**What:** `_shared.tsx:127,192` paint `background: colors.background` flat, so the New Case modal and the profile editor are byte-identical between W0 and W1 while the phone's modal surface sits ABOVE its ground on `Colors.dark.modal`. `grep colors.modal` under `features/demo` (non-test) returns zero hits at `28e7993`, and no plan row after A5 adopts the token. Same shape as §92: a token with no scheduled consumer.

**Why deferred:** the modal shell is `_shared.tsx`, a §6.1 hotspot U4 owns (sheets / dialogs / scrims); adopting the token in W1 would collide with U4.2 / U4.3 in the file they open.

**Trigger:** **U4.2** (queued in W2), whose row already opens `_shared.tsx`'s dialog shell — it adopts `colors.modal` there as part of that work, or records why the demo's modal stays at ground. Orchestrator: add to U4.2's row.

---

## 95. ~~W1 (PR #40) — the hand-ported SHADOW values have no drift anchor on either side~~ — ✅ RESOLVED — PR #42 fix round (F42)

**RESOLVED (W2 F42, `dd680f6`):** the trigger's second option taken — the guard's shadow exclusion now names all three tiers (`card`/`sheet`/`dialog`) with the full reasoning (a composing reader would be "equal by transcription"), names the literal shape pin covering each, and states what would reopen it: a phone-side `Layout.shadow.*` change, or a fourth tier. Original entry below for history.

**Source:** U1.1 report §7 D-3 (`innerShadow`); U1.2/U1.3 report §7 D-3 (`Layout.shadow.card`); `check-rn-parity.mjs:336-344` (the documented exclusion); W1 review r1 F19 (the D2 half is fixed in code; this row is the anchor half).

**What:** two classes. (1) The six tiers' `innerShadow` (12 values, both halves) are deliberately not in `TIER_PARTS`: the phone hands the value to a native shadow prop and the web composes it into `box-shadow: inset 0 1px 0 <innerShadow>`, so an anchor would compare two transcriptions rather than a contract. Their only gate is `ui/tokens/__tests__/glass-tiers.test.ts`'s whole-object `toEqual` — a literal pinned to itself, structurally blind to phone-side drift (typescript probe 4 confirms it is the only gate for `elevated`/`sheet`/`recessed`; `card`/`nestedCard` are covered twice via the composed fragments). (2) `GLASS.shadowCard` (`Layout.shadow.card`, phone `Layout.ts:122-136`) — the phone's design-sync generator does not emit `Layout.shadow` (phone §1.Y.3, "hand-ports for the web") and RN spells it as five props no CSS-shaped reader can take; it is held only by `glass-tokens.test.ts`'s literal and is now on every card in the demo.

**Why deferred:** the guard's `PARSE-FAILED` degrade exists precisely to avoid anchors that pass by transcription; a real anchor needs either a composed value on the phone side or a small `shadowFor(tier)` reader that composes the five RN props into one CSS string (a real contract). One hand-ported shadow is a different risk from three.

**Trigger:** **U4 landing the second and third shadow tiers** (A45 `shadow.dialog`, A46 `shadow.sheet`) — that package adds the composing reader to the guard or records the gap once for all three. Fires earlier if the phone publishes a `boxShadow` string for any of these in `conventions.md`, or on the first observed `innerShadow` / shadow drift between the repos.

**TRIGGER LAPSED (PR #42, W2 r1) → finding F42** (`docs/code-reviews/ui-parity/w2/VETTED-r1.md`): U4 landed `SHEET_SHADOW` and `DIALOG_SHADOW` with neither the composing anchor nor the recorded ruling. This row closes when F42's fix lands (either the composed per-scheme anchors or the guard's documented three-tier exclusion).

---

## 96. W1 (PR #40) — the DIAGONAL card variant (D11) did not get the four-part composition; eight surfaces, including the Cases list and the Dashboard, still render a two-part card

**Source:** U1.2/U1.3 report §7 D-1; typescript lane out-of-lane observation; aggregator W1 r1.

**What:** U1.2 gave `glassCard` the lit top edge, the inset and `shadow.card`. `GLASS.gradientCardDiag` is the same `card` tier at 135° but is a bare string, not a fragment, so its eight consumers compose gradient + border only: `chrome/DemoErrorBoundary.tsx:35`, `inputs/CameraGpsCapture.tsx:62`, `inputs/GpsCaptureControl.tsx:45`, `screens/CasesScreen.tsx:143,240`, `screens/DashboardScreen.tsx:122,201`, `screens/export/ExportCaseCard.tsx:127`. The two entry screens are among them. A43's radius change landed at three of the eight; the composition did not.

**Why deferred:** building `glassCardDiag` is four lines; adopting it is not — three of the eight are nested ROWS at `radius.md` that a blind spread would flatten against A43, and four of the files are held open by U3.4 (`CasesScreen`, `DashboardScreen`), U5.4 (`GpsCaptureControl`) and U3.3 (`DemoErrorBoundary`, whose row already says "card re-base"). Doing it from a wave-1 package opens five files three later packages own.

**Trigger (AMENDED, PR #42, W2 r1):** the original trigger named U3.3, whose plan row was refuted at source (u3.3 R-3/R-6: the phone's `RouteErrorFallback` has no Banner and the card half is glass-tier work in `ui/glass-tokens.ts`, another package's file). New trigger: **the next package that opens `ui/glass-tokens.ts` or `chrome/DemoErrorBoundary.tsx` — U8.1 is the first scheduled** — builds `glassCardDiag` and takes the four true top-level cards (`DemoErrorBoundary`, `CasesScreen:143`, `DashboardScreen:120`, `CameraGpsCapture`), leaving the three nested rows explicitly named as rows. Backstop unchanged: **the owner's D1 device-pass checkpoint 1** (`w1/after/01-wizard/06-case-card-expanded.png`) — "cards on the entry screens read flat" is what that pass exists to catch. Orchestrator: add to U3.3's row.

---

## 97. W1 (PR #40) — `nestedCard.border`'s composed form cannot be banned while `BootSequence.tsx:36` spells it

**Source:** U1.2/U1.3 report §7 D-2 (R-6); aggregator W1 r1 (confirmed at `28e7993`: `screens/BootSequence.tsx:36` is `border: '1px solid rgba(43,140,193,0.45)'`).

**What:** U1.2/U1.3 banned five tier values as their closing act. `nestedCard.border` (`rgba(43,140,193,0.45)`) is the exception: bare it is live at three non-tier sites, and composed as `1px solid rgba(43,140,193,0.45)` at exactly one — the boot sequence's pill, which is not a nested card. The most re-drift-prone value in the nested recipe therefore has no `BANNED` entry.

**Why deferred:** the single blocking occurrence is in U8.1's file, and U8.1's row re-bases the splash and boot chrome; sweeping it from a wave-1 package means editing a phase-8 surface with no ruling on what that border should become.

**Trigger:** **U8.1 re-basing `BootSequence.tsx:36`.** The moment that line stops spelling the composed literal, U8.1 appends `['nested card border', '1px solid rgba(43,140,193,0.45)']` to `BANNED` as its closing act — the same discipline U1.1–U1.4 followed.

---

## 98. W1 (PR #40) — `flattenOver` rounds each channel per fold; the phone's compositing keeps floats — up to 0.32 ΔE apart on the tightest rows

**Source:** U1.1 report §5 / §7 D-1; `features/demo/ui/tokens/scale.ts` `flattenOver` vs phone `src/constants/__tests__/palette-contrast.test.ts:57-65`; silent-failures W1 r1 (judged bounded, not re-filed).

**What:** measured on the now-live rows: row 33's dark lower stop reads 3.6920 here against the phone's 4.0124 (−8%); dark `textTertiary` reads 3.8143 against 3.7921 (our pin is looser by 0.022). The U0.5 docblock's tolerance ("< 0.01 on a ratio") is right for ratios and an order of magnitude off for ΔE.

**Why deferred:** the seam is a deliberate U0.2/U0.5 decision — the contrast contract composites through the PRODUCTION helper so the helper every recipe uses is exercised by a gate; a private float copy would un-exercise it. Every affected row passes with real margin today.

**Trigger:** **any `palette-contrast.test.ts` row that fails, or lands within 0.35 ΔE / 0.03 ratio of its bound, where the float computation would pass** — or **U2.4** landing the recessed well on the picker surfaces (its row carries the per-stop `recessed`-vs-`sheet` ΔE assertion, the tightest bound in the file). Then either give `flattenOver` an opt-in unrounded mode or restate the bound with the seam's error budget written into it.

**Annotation (PR #42, W2 r1):** the U2.4 arm fired — the recessed rows landed and sit mid-band (3–12 ΔE, real margin; the helper's NaN hardening is W2 finding F40). No bound needed restating. The numeric arm (any row within 0.35 ΔE / 0.03 ratio of its bound) remains the live trigger.

---

## 99. W2 (PR #42) — behavioural pins cannot see scheme-half hard-coding while `scheme === 'dark'`; every seam module built on the two-scheme records shares the hole

**Source:** U1.4 probe P10; U4.1 probe P2; U4.2 probe P2; U4.3 probe P13 (all SURVIVED); u3.3 D-3 (Banner's light render); tests lane W2 r1 (`buttonStyle` reads the module-level `scheme` and takes no parameter, so its light branches are unreachable from any test); aggregator consolidation of five identical proposals, W2 r1.

**What:** while the demo renders `dark`, `GLASS_TIER.dark` / `palette.dark` and their `[scheme]` forms are the same object, so no behavioural pin can distinguish them. The clause-12 source scan is the only mechanism (W1 F18/F23/F24; its current gap is W2 F33). Files on the hole: `glass-tokens.ts`, `header-chrome.ts`, `sheet-chrome.ts`, `_shared.tsx` (`modalHeaderBar`), `CentredDialog.tsx`, `Banner`'s light render, `button-recipe.ts`'s per-scheme branches. The per-scheme CONSTANTS are pinned in both halves throughout; what cannot be observed is the *consumption*.

**Why deferred:** the only honest kill is rendering a light surface, which plan §9 clause 12 already schedules; a source-text assertion beyond the existing scan would be the string-presence anti-pattern.

**Trigger:** **§9 clause 12's scratch-worktree scheme flip at U8 exit** — if any surface does not turn light with the rest, this row is why. Earlier if any package ships a light surface. One row for the class; do not re-propose per file.

---

## 100. ~~W2 — `DvrInfoScreen`'s checkbox pill hand-rolled, exempted by name~~ — ✅ RESOLVED — W3 (U6.4b)

**RESOLVED:** U6.4b adopted `CheckboxBox` (×2 at head) and hand-deleted the `EXEMPT` entry; the tombstone comment at `choice-controls.test.tsx:204` records it, and the (F32-repaired) dead-exemption test now enforces the state. Original entry below.

**Source:** u2.4 report §9 D-1; matrix A75 / B.5 row 41; phone `app/(form)/dvr-information.tsx:318-329`.

**What:** a 16×16 box inside a 2-up pill where the phone renders two stacked full-width `Checkbox` rows with labels. A LAYOUT port, not a recipe adoption; `choice-controls.test.tsx` `EXEMPT` names it with U6.4b as owner.

**Why deferred:** the file is not in U2.4's Files column; B.5 row 41 assigns it to U6.4b; U3.2 edited the same file this wave.

**Trigger:** **U6.4b.** Close condition (corrected from the proposal): U6.4b adopts the layout **and hand-deletes the `EXEMPT` entry** — the "carries no dead exemptions" test enforces this only once W2 finding F32's fix lands (the proposal's original sentence claimed an enforcement that did not exist).

---

## 101. W2 (PR #42) — the button recipe's ~45 adoptions have no general scan; the residual guard is per-screen render pins

**Source:** integration I-4 (probe U2.2-out SURVIVED, later withdrawn); u2.4 report §4 + §9 D-2 (measured: 179 `<button>` sites vs 61 `buttonStyle(` calls; the only selecting predicate needs a ~118-entry allowlist — a change-detector, not a pin).

**What:** a consumer that reverts to the PRE-port literals (`#2B8CC1` + `#4BA3D4`, both BANNED-exempt as too common) at a screen with no render test is invisible. `TimeOffsetScreen` — the one measured site — now has a render pin.

**Why deferred:** the general scan shape is a change-detector; the real fix is per-screen render pins, owned by the packages that open those screens.

**Trigger:** **U6.4a/U6.4b** (the bulk wizard-screen packages) add a `buttonStyle`-composed render pin per screen they open — or, sooner, the first review finding reporting a button off the recipe.

---

## 102. ~~W2 — the `T.textDim` form-label family~~ — ✅ RESOLVED — W3 (U6.4a)

**RESOLVED, better than the row asked:** `T.textDim` is DELETED (`field-input.ts:69-73` — it had no palette sibling); the label family resolves through the new `fieldLabelStyle`/`fieldErrorStyle` seam (12 importers). Residual mentions are comments. Original entry below.

**Source:** u2.4 report §9 D-3; phone `Picker.tsx:314-317`, `:102`.

**What:** every demo form label shares one demo-only recipe across `Dropdown`, `DateTimeField`, `RequestedScopeScreen`, `DvrInfoScreen`; `#cdd9e6` is not a palette token. Changing one file's label forks it from its neighbours in the same form.

**Why deferred:** a four-package sweep A73's Delta does not name.

**Trigger:** **U6.4a**, which adopts the field recipe across the wizard screens and opens every one of these files.

---

## 103. W2 (PR #42) — the focus-restore family: five mount-time `document.activeElement` blocks remain, and both shells promise `aria-modal` with no focus handling

**Source:** u4.3 report §10 deferrals 1–4 (consolidated); u4.1 §9 item 4; partner legwork C6; `CentredDialog.tsx:239-262` (the one correct mechanism, private).

**What:** `MediaLibrarySheet.tsx:346-352` (fullscreen), `ExportActionSheet.tsx:124-130`, `PdfPreview.tsx:129` still restore focus with the mount-time read U4.3 removed from the dialogs (the `<body>` regression class — the latter two are opened by self-disabling controls, the likeliest reproducers); `GlassBottomSheet` and `ModalShell` claim `aria-modal="true"` and neither traps nor restores. Two stale citations name `AlertDialog.tsx:55-61` as their source — lines that no longer hold the mechanism.

**Why deferred:** the fix is one hook (`useOpenerFocusReturn(ref)`) extracted from `CentredDialog` — extracting it with zero callers is speculative; the file owners (U4.4-region, U7.2) were live when U4.3 closed. Note u4.3-d2's original "U4.4 opening either file" trigger technically fired in-wave, but the prescribed action depended on the not-yet-existing hook — re-cut, not evaded.

**Trigger:** **the first of:** U5.3 mounting `GlassBottomSheet` for `MapFiltersSheet`, or U7.2 opening `MediaLibrarySheet`. The mover extracts the hook from `CentredDialog.tsx` (tracker + `canTakeFocus` + the mount effect minus the `openDialogs` push/pop), adopts it at its own surface, fixes the stale citations, and the remaining sites follow one line each.

**TRIGGER LAPSED (W3 r1) → finding F64** (`w3/VETTED-r1.md`): U7.2 rewrote `MediaLibrarySheet` without the extraction; five `activeElement` blocks and both `aria-modal` shells unchanged at `13827de`. Row closes when F64 lands (or its fix report re-defers the ExportActionSheet/PdfPreview tail with a re-cut).

---

## 104. W2 (PR #42) — `ExportActionSheet` still has its own sheet implementation; U4.2 declined the fold, so it needs an explicit package

**Source:** u4.1 §9 proposal 3; u4.2 §9 proposal 4 (the recorded decline); matrix B.4 row 27.

**What:** a bespoke inset sheet (`left/right/bottom: 12`, radius 16, `GLASS.gradientPanel`) with `role="menu"` roving focus, not a `GlassBottomSheet` consumer. The phone deleted its equivalent and rebuilt on the shell (+133/−234). Row 27 also carries U2-family geometry (`minHeight 60 → touchTarget.large`, press alpha).

**Why deferred:** not in any remaining package's row; the fold changes geometry and the keyboard model together.

**Trigger:** **an explicit U4.5, cut by the orchestrator before U8 exit.** §9 clause 7's census ("one sheet ground") is the acceptance criterion; it must not reach U8 exit unfolded.

---

## 105. W2 (PR #42) — `ModalShell` has no leading-icon slot; A60's icon clause is unclosed for the one honest caller

**Source:** u4.2 report §9 proposal 2 / R-4; matrix A60; phone `ModalHeader.tsx:29,62`.

**What:** the profile editor's phone header shows `person-circle-outline` + title; the demo's shows the title. The other seven `ModalShell` callers port page sheets with no glyph and are already correct. A required prop with one liftable value and seven invented ones was rightly not built.

**Why deferred:** one honest caller; `ModalHeader`'s other phone consumers are agency-cloud (out of scope, plan §2).

**Trigger:** **U6.1 or U6.2 opening `settings/UserProfileModal.tsx`** — an optional `icon?: ReactNode` before the title stack plus one SVG. **Hard stop: U8 exit** — A60 is Tier-A and must be COMPLETE or carry a ratified divergence (§9 clause 3).

**Annotation (W3 r1):** U6 DECLINED the slot with an in-code ruling (`_shared.tsx:166` "## No leading icon prop"). The soft trigger is spent; only the U8-exit hard stop stands — the owner ratifies the in-code ruling as A60's divergence, or the slot is built then.

---

## 106. W2 (PR #42) — `useReducedMotion` returns `false` for the first paint, so every gated animation plays one frame under `prefers-reduced-motion: reduce`

**Source:** u4.2 report §9 proposal 3; `lib/hooks/use-reduced-motion.ts:13-23`.

**What:** the hook corrects from an effect, so all nine page sheets, the three bottom sheets, `ExportModal`'s spinner, `WizardDrawer` and `BootSequence` apply their entrance for one paint. The hook's shape, not any consumer's.

**Why deferred:** the fix (`useSyncExternalStore` with a `getServerSnapshot` of `false`, ~10 lines) touches a `lib/hooks` module shared beyond the demo — outside a UI-parity package's blast radius and not a phone-parity question.

**Trigger:** **any package that opens `lib/hooks/use-reduced-motion.ts`, or U8's closing motion pass.** The four existing reduced-motion test files are the regression net.

---

## 107. W2 (PR #42) — the pickers get the sheet's enter but not its exit; and shell adoption added swipe-dismiss + a 92%→90% cap the pickers' rows never named

**Source:** u4.1 §9 proposal 2 (re-cut); `inputs/PickerSheet.tsx:69-74`; typescript lane W2 r1 out-of-lane (the behaviour deltas).

**What:** `DateField.tsx`, `TimeField.tsx`, `Dropdown.tsx` render `{open && <PickerSheet …>}`, so the 200ms exit never plays (matches master; the phone animates out). Shell adoption also gave the pickers swipe-to-dismiss (default on) and moved the height cap 92%→90% — phone-shell behaviour, disclosed here so it has a written home.

**Why deferred:** the original trigger named U2.4, which opened the files but held no behaviour authority over sheet dismissal (D20) — the trigger named the wrong actor and is re-cut, not evaded. The change is `visible={open}` plus lifting three guards.

**Trigger:** **the next package with behaviour authority over these files** — U6.4a's field-adoption pass or the first U7.x package that opens them; U5.3 is the model consumer (mounts the shell with real `visible` state).

**Annotation (W3 r1) — trigger RE-CUT a second time:** U6.4a opened the three files but holds no D20 behaviour authority (this aggregator's own mis-cut; the same actor-without-authority shape that misfired the first version). New trigger: **U8's closing motion pass**, which owns motion-value parity, threads `visible={open}` and lifts the three guards.

---

## 108. ~~W2 — three em-dashed empty-state strings~~ — ✅ RESOLVED — W3 (U7.3, A93 sweep)

**RESOLVED:** the A93 sweep landed with a live guard (`copy-rules.test.ts` — the tests lane probed a planted em dash KILLED and the comment exemption behaving as documented). The guard's own two scope bugs are W3 findings F56/F57. Original entry below.

**Source:** u3.1-u3.4 report §5 D-1; plan §4.3 (no em dashes in user-facing strings).

**What:** `CasesScreen` ("No cases yet — …"), `CamerasScreen`, `ArrivalDepartureScreen`. U3.4 fixed only `ExportCaseCard`'s (it was rewriting that string anyway).

**Why deferred:** §6.1 assigns the user-facing string sweep to U7.3/A93, bounded per file.

**Trigger:** **U7.3's A93 sweep**; if descoped, the next package that opens any of the three files takes its own string.

---

## 109. W2 (PR #42) — the Cases/Dashboard header icon controls are ~24×24 against A49's 44 floor the header's own 44pt row assumes

**Source:** u3.1-u3.4 report §5 D-2; phone `MainHeader.tsx:150-164` (PR #125 gave both controls real 44×44 boxes).

**What:** the demo's New-Case button is a bare 24px SVG with `padding: 0`; `SettingsGearButton` comparable. The demo carries the phone's row floor without the targets it assumes.

**Why deferred:** A49 owns touch targets across the demo and has no single implementing package; growing the boxes changes header balance.

**Trigger:** **A49's implementing package, or any package that changes either control** — cite this row's measurement rather than re-deriving.

---

## 110. ~~W2 — `ImportModal`'s three notice blocks off-tier~~ — ✅ RESOLVED — W3 (U7.3)

**RESOLVED:** both ambers stay verbatim per D12 (verified by the sfh lane at head); `import-data-found` sits on `glassCardNested` with the lifted-radius ruling in code (`ImportModal.tsx:188-190`, demo §0.4); the failure LIST keeps its translucent red per this row's own Banner-refusal. The D12 guard's falsifiability is W3 finding F51. Original entry below.

**Source:** u3.3 report §8 D-1; D12; matrix line 364.

**What:** `FailuresCard` (a per-file failure LIST — `Banner.message: string` cannot carry it) keeps `borderRadius: 10` + translucent red; the two `result.notice` blocks (`:269`, `:285`) keep the D12-defended FallbackMode amber and must never become Banners. One file, three notice recipes the port does not unify.

**Why deferred:** the amber's guard is explicitly U7.3's ("a test must prove it stays visually distinct from the ported warning family"); `FailuresCard`'s residual belongs to U7.3's ImportModal glass-tier pass.

**Trigger:** **U7.3** (its row opens the file for both jobs). Whatever cites `:266`/`:269` must add the `:285` sibling.

---

## 111. W2 (PR #42) — the `rgba(4,8,14,*)` scrim-family ban cannot land until U8.1; the exemption list is now ruled

**Source:** u4.4 report §9 deferral 2 (re-cut); W2 finding F43's ruling.

**What:** the RETIRED-style ban on `rgba(4,8,14,*)` under `ui/`. Post-F43 the surviving spellings are: `_shared.modalScrim` 0.55 (RULED a demo-only stand-in — phone page sheets are native `pageSheet` presentations with an OS dim, no phone token exists), `ExitDialog` 0.72 (D12-frozen, permanent), `BootSequence.tsx` 0.55 (the SKIP pill's fill, U8.1's file).

**Why deferred:** the ban reddens U8.1's file until that re-base lands, and it needs the final exemption list to be stable.

**Trigger:** **U8.1's `BootSequence` re-base** — the ban ships in the same PR naming exactly two permanent exemptions (`modalScrim`, `ExitDialog`); same discipline as §97.

---

## 112. W2 (PR #42) — the engine's OCR confidence tiers still return hex colours, including `#ff7a45`, a fifth accent hue named nowhere

**Source:** u3.2 report §7 D-1 + D-2 (one row for the pair); `engine/logic/ocr.ts:275-280`.

**What:** `getConfidenceLevel` returns `color: string` on a public engine type with pinned shape; `#ff7a45` belongs to no palette token and no matrix row. The engine purity gain of U3.2 (bands/tones in the engine, paint in the UI) stops at this file.

**Why deferred:** the only consumer is `OcrCaptureScreen` (U7.3's whole file), and `ConfidenceTier` is a §2-protected engine signature.

**Trigger:** **U7.3 opening `OcrCaptureScreen.tsx`** — return an enum, map in the UI, and RULE on the fifth hue (name it or collapse to four bands) rather than leave it unnamed. If U7.3 is descoped, the next package that moves any OCR confidence colour.

**TRIGGER LAPSED (W3 r1) → finding F65** (`w3/VETTED-r1.md`): U7.3 opened the consumer without the ruling. Condition attached at the desk: the fix changes a §2-protected engine signature, which no U7 row authorizes — the orchestrator grants a D20-style authorization in the fix brief (U3.2's mid-task ruling is precedent) or this row re-cuts to U8 exit with that reason.

---

## 113. W2 (PR #42) — the red-as-text family (~20 sites, six distinct reds) has no owning package; C.3 rule 1 is the campaign's most portable recipe and nothing schedules it

**Source:** u3.2 report §7 D-3; u2.2 §7 D2 residual (`AlertDialog`'s `destructiveTint` label `#ff6b7a` — kept through the U4.3 rewrite with its relational pin); `CoordinateDisplay.tsx:196` (demo-originated; the phone uses a toast); matrix C.3 rule 1 (4.40 dark).

**What:** error text painted in saturated reds across ~20 sites. Fixing piecemeal from whichever package opens a file is how a value ends up half-swept.

**Why deferred:** no row assigns the sweep; several sites need rulings (demo-originated surfaces), not lifts.

**Trigger:** **the package that takes the C.3 rule-1 sweep, or the U8 exit review ruling it out.** U7.3's A93 pass is the last package that opens most of the files.

---

## 114. ~~W2 — `MediaLibrarySheet` hand-rolls `ElevatedEdges`~~ — ✅ RESOLVED — W3 (U7.2)

**RESOLVED:** imported at `MediaLibrarySheet.tsx:27`, spelled once (`:868` docblock records A51). Original entry below.

**Source:** u2.2 report §7 D3; matrix A51.

**What:** `previewActionButton` spells the two edge values inline; the seam exists with consumers.

**Why deferred:** re-pointing buys zero visual change and the file is serialised U4.4 → U7.2 (§6.1).

**Trigger:** **U7.2**, which rewrites `MediaLibrarySheet.tsx` whole — import `ElevatedEdges` there.

---

## 115. W2 (PR #42) — `ModalActions.submitBlocked` has no test; the paint was silently dropped once already and restored by audit, not by a red

**Source:** u2.2 report §7 D4.

**What:** the blocked-submit paint in `_shared.tsx` is uncovered; the mechanical adoption pass dropped it and an audit caught it.

**Why deferred:** `ModalActions` is `_shared.tsx` territory that four packages open; the test belongs with the export's owner.

**Trigger:** **U6.1** (which takes the neighbouring `_shared.tsx` exports) — or the next review round that touches `ModalActions`.

---

## 116. W2 (PR #42) — text-input placeholders still render the browser default; `::placeholder` cannot be an inline style and jsdom cannot observe it

**Source:** u2.1 report §8 D-1; phone `TextInput.tsx:121` (`placeholderTextColor={colors.textTertiary}`).

**What:** no placeholder rule exists anywhere in the demo; the phone paints `textTertiary`.

**Why deferred:** the only stylesheet is `demo.css`, assigned to U8.2 alone (§6.1); the value is unpinnable from vitest.

**Trigger:** **U8.2, at the moment it opens `ui/demo.css`** — add the scoped `::placeholder` rule and assert it from the Playwright harness (§6.6), not vitest. The token carries the inherited M2b ceiling; inherit, do not fix.

---

## 117. ~~W2 — `Field`'s textarea 76 vs the phone's 100~~ — ✅ RESOLVED — W3 (U6.4a)

**RESOLVED:** `minHeight: 100` with the phone cite in-code (`_shared.tsx:520-526`). Original entry below.

**Source:** u2.1 report §8 D-2; phone `TextInput.tsx:176-180`.

**What:** 24px shorter than the phone's, named by neither the U2.1 row nor A72's Delta.

**Why deferred:** `Field`'s block (`_shared.tsx:198-310`) is U6.1's; two packages on the same lines of the port's hottest file is what §6.1 exists to prevent.

**Trigger:** **U6.1** — take `minHeight: 100` + `paddingTop: 16` with the rest of `Field`'s geometry, or record a measured divergence (`rows={3}` in a 378px frame).

---

## 118. W2 (PR #42) — the input-boundary contrast family: focus ring 2.87 and resting border 1.26/1.44 against the card tier, both phone-verbatim (C.3 rule 4's named case)

**Source:** u2.1 report §8 D-3 + D-4 (one row for the family); matrix C.3 rule 4 (verbatim: "a sole-boundary input border at 1.26 is not [correct]"); W2 finding **F27** adjudicates the sibling case (the selection mark) and cross-references here.

**What:** the focus border (`colors.primary`, phone `TextInput.tsx:73`) measures 3.94 on its own fill and 2.87 against the card's lower stop; the resting border (`colors.border`) 1.44/1.26 against the card stops, with the fill separated from its ground by only ~1.2 (DEF-UI-011). Every value is the phone's, ported under D2/D3; the phone campaign adjudicated its own copies.

**Why deferred:** raising either token forks the palette the whole port is built on and breaks the drift guard's anchors — a palette/owner decision, not an implementer's. Strictly better than master (which had NO focus indicator, an outright 2.4.7 failure).

**Trigger:** **the D1 owner checkpoint where demo and phone are read side by side** (checkpoint-2 list item 4 shows the focus ring), or U0.5's contrast contract gaining a 1.4.11 row for input boundaries — whichever first. If the owner accepts, these become documented D5-family ceilings with a re-measure note; if not, the fix is palette work with this row's measurements attached.

---

## 119. W2 (PR #42 fix round) — enable `noUnusedLocals` once the remaining TS6133s clear (F36's root cause)

**Source:** W2 review r1 F36; integration report I-5 + § fix round 1 (proposal); measured: 15 `TS6133` across 13 files at `addd03f`, 5 fixed by F36, **11 remaining at `250e12f`** (re-measured by the typescript lane, none in F36's five files).

**What:** the repo has no gate for an unused binding — no `noUnusedLocals`, no ESLint in the gate set. The merge-orphaned-import class has now cost a finding twice (I-5, F36), and grep censuses cannot see a binding whose only "reference" is a comment.

**Why deferred:** the flag is repo-wide and one line, but flipping it reds files owned by other seats; the proposal's own "flip at the W2 fix-merge if clean" trigger fired and the answer was NOT clean (11 remain).

**Trigger (re-cut by the aggregator):** each W3+ package clears the `TS6133`s in files it opens (its report says so); **the flag flips at the first wave boundary where `rm -f tsconfig.tsbuildinfo && pnpm exec tsc --noEmit --incremental false --noUnusedLocals` exits 0** — hard stop **U8.4** (the design-sync closing census runs the command and flips it or records why not).

---

## 120. W3 (`feat/uiparity-w3`) — the RETIRED sweep matches hex SPELLINGS only; a retired colour re-spelled as `rgb()`/`rgba()` passes it

**Source:** W3 r1 aggregator, from two independent witnesses in one wave: U5.1 shipped a local `mapTokens.test.ts` rgb-form ban as compensation, and U7.3's R-9 discloses `OcrCaptureScreen`'s viewfinder spelling the retired `#1e3a5f` as an `rgba()` today (its D-3).

**What:** `tokens/__tests__/palette.test.ts`'s RETIRED needles are hex strings (case/whitespace-normalised since W0/F3, but hex-form only). `rgb(30, 58, 95)` is the same retired colour and is invisible to the sweep — the exact class the sweep exists for, one notation over.

**Why deferred:** the honest fix is a hex→rgb normalizer on the needle side (every needle gains its rgb twin mechanically); doing it mid-wave reopens a W0-owned test file no W3 package holds, and the one live instance (the viewfinder) is disclosed with its own U7.3 D-3 reasoning.

**Trigger:** **the next commit that retires a palette value adds the rgb-form needle in the same commit** (the standing ban-lands-with-the-change rule), or **U8.2's sweep** adds the normalizer to the sweep itself — whichever first. The viewfinder instance closes with either.

---

## 121. W3 (`feat/uiparity-w3`) — one em-dashed message lives in `engine/` copy, outside A93's `ui/` sweep scope

**Source:** U7.3's disclosed D-2; the tests lane verified the only remaining asserted em dash in a rendered string is an `engine/` message (`MediaCaptureScreen.test.tsx:390`).

**What:** the A93 guard (`copy-rules.test.ts`) walks `ui/` only; an engine-authored string that renders in the UI carries the campaign's banned punctuation.

**Why deferred:** one string; editing `engine/logic/media` copy from a styling wave is a §2 scope question, and the guard's scope extension is a design choice (engine strings include non-rendered log text the rule does not govern).

**Trigger:** **the next package that opens `engine/logic/media`'s strings, or U8's exit copy pass** — fix the string and either extend the walker to the engine's rendered-string modules or record here why not.
