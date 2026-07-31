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

**What:** ~~Two~~ One latent silent-failure path in existing demo code (not introduced by PR #16):
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
- `roundTo5Min` (`engine/logic/time.ts`) silently returns unparseable input unchanged, against
  `time.ts`'s own "fail loud" convention. **Still open.**

**Why deferred (remaining half):** Latent — current callers guard upstream (canonical dates reach
`roundTo5Min` after Slice A), so it doesn't fire today.

**Trigger (remaining half):** Next time `time.ts` is touched — make `roundTo5Min` fail loud (or
document why it tolerates bad input).

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

---

## 37. P2.5 (parity/p2-advisories) — Time-Offset advisories: deliberate non-ports & residuals

**Source:** P2.5 implementation (matrix row 34 residual — the phone's four DST advisory
branches plus its Toast/Alert guards).

### 37.1 The recalculate confirmation is a screen-local dialog, not the shared primitive

**What:** the phone's `Recalculate Time Offset?` Alert is ported as `RecalculateDialog`,
declared inside `features/demo/ui/screens/TimeOffsetScreen.tsx` and rendered as an absolute
overlay within the phone screen.

**Why deferred:** the demo still has **no shared blocking-dialog primitive** (matrix row 28:
"only the auto-dismissing `DemoNotification`"), and building one is scheduled work owned by
other packages — plan §5 flags it as "wanted by P3.1/P4.5/P5.3". Inventing the shared
primitive from an S-sized advisory package would pre-empt that design and create a merge
hotspot mid-wave. The local dialog is ~45 lines, carries the phone's verbatim copy, and
follows `ExitDialog`'s conventions (`role="dialog"`, `aria-modal`, Escape + backdrop cancel,
autofocus on the safe default).

**Trigger to revisit:** the moment P3.1 / P4.5 / P5.3 lands a shared dialog primitive — move
`RecalculateDialog` onto it and delete the local copy. Second trigger: a third screen needing
a blocking confirm before that lands (two bespoke dialogs is the tell).

### 37.2 Three of the phone's five Time-Offset toasts are deliberately NOT ported

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

### 37.3 `calculateOffset` has no error path — the phone's `Calculation Error` toast is unreachable

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

### 37.4 Phone-repo follow-up: `getDSTTransitionDates` misses month-boundary transitions

**Not a demo deferral — a phone bug for the §8 follow-up ledger.** The phone's scan is
`for (day = 1; day < daysInMonth; day++)` comparing `day` with `day + 1`
(`src/lib/utils/bidirectional-time.ts:330-344`), so it never compares the last day of a month
with the first of the next. A DST transition landing on the 1st is invisible and the advisory
degrades to the literal word `spring`/`fall`. Reachable in North America whenever the November
fall-back Sunday is the 1st — e.g. **2026-11-01**. The demo's port brackets on month starts and
binary-searches inside, so it resolves the boundary case (pinned in
`engine/logic/__tests__/dst-advisory.test.ts`). File as a `BUG-NNN` when the owner returns.
