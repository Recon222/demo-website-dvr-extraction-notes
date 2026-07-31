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
`VisionCameraScreen`'s video Stop is always live. The demo applies it to video anyway, and the
shutter renders disabled for that sub-second window. Reason: a browser `MediaRecorder` stopped
before its first `dataavailable` assembles **zero bytes**, which P4.1 correctly reports as
`RECORDING_FAILED` — so the ungated button's only effect in that window is to hand the visitor
an error they could not have avoided. Mutation-probed ("refuses Stop until the take can produce
bytes").
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
