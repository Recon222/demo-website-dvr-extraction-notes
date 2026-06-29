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

**What:** Two latent silent-failure paths in existing demo code (not introduced by PR #16):
- `selectAdjustedScopes` (`engine/store/selectors.ts`) has an empty `catch` that lacks the dev-warn its
  sibling `generateExtractedScopes` emits — a parse failure is swallowed silently.
- `roundTo5Min` (`engine/logic/time.ts`) silently returns unparseable input unchanged, against
  `time.ts`'s own "fail loud" convention.

**Why deferred:** Both are latent — current callers guard upstream (canonical dates now reach them after
Slice A), so neither fires today. Out of scope for the date-normalization PR.

**Trigger:** Next time `selectors.ts` / `time.ts` are touched — add the dev-warn to the `selectAdjustedScopes`
catch and make `roundTo5Min` fail loud (or document why it tolerates bad input).

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

## 21. PdfPreview has no Escape / backdrop dismiss (buttons only)

**Source:** PR #18 review (silent-failure, informational).

**What:** `PdfPreview` dismisses only via its Close/Save buttons — no Escape key or backdrop-click close,
unlike the other overlays (ModalShell scrim/Escape, WizardDrawer backdrop/Escape, PickerSheet scrim/Escape).

**Why deferred:** Pre-existing UX inconsistency, not introduced by the portal sweep; the buttons work
correctly post-portal. Low value to change in isolation.

**Trigger:** Next time overlay dismissal is standardized (or PdfPreview is touched) — add an Escape
listener + a backdrop-click close for parity.
