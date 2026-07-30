# Lane: silent-failures — parity P0 (PR #29)

- **Lane:** silent-failures (`.claude/agents/silent-failure-hunter.md`)
- **Mode:** INITIAL (full review of the diff)
- **Diff under review:** `git diff master...feat/parity-p0` — 57 files, +2482/-169
- **Refs read:** `.claude/agents/silent-failure-hunter.md`, `features/demo/CLAUDE.md`,
  `docs/code-reviews/deferred.md` (incl. new §29/§30/§31),
  `docs/planning/demo-phone-parity/00-surface-parity-matrix.md` (rows 6/10/40/44/46/70, G1–G6).
- **Files read in full behind the hunks:** `engine/store/persistence.ts`,
  `engine/store/create-store.ts`, `engine/store/helpers.ts`, `engine/store/selectors.ts`,
  `engine/content/form-options.ts`, `engine/logic/import.ts`, `ui/DemoExperience.tsx`,
  `ui/chrome/DemoErrorBoundary.tsx`, `ui/screens/CompletionScreen.tsx`,
  `ui/screens/CamerasScreen.tsx`, `ui/screens/DvrInfoScreen.tsx`, `ui/screens/ExportInfoScreen.tsx`,
  `ui/screens/screenData.ts`, `ui/inputs/Dropdown.tsx`, `ui/glass-tokens.ts`, `app/demo/page.tsx`,
  plus every new test file.

**Deliberate choices honoured (not re-flagged):** deferred §29–§31 (map viewer-case /
modal / drawer excluded from the snapshot; the 250 ms pagehide loss window; placeholder copy;
near-miss style literals), the class-component error boundary, the no-free-text Export selects,
the DVR-keeps vs Cameras-clears asymmetry, the dropped demo-only option values, and
sessionStorage-over-localStorage (D2).

---

## SILENT-FAILURES-1 [BLOCKER] features/demo/ui/DemoExperience.tsx:719

**Claim.** G4 replaced the bridge-local `caseCompleted` boolean with a **case-scoped** store
status, but `CompletionScreen`'s `isComplete` gate is **location-scoped** in meaning. The result
is a one-way door: the first "Complete & Save" in a case permanently swaps the Completion &
Review branch for the "Case Complete" confirmation for *every* location in that case, forever
(and now across refreshes, because P0.4 persists `cases[].status`). Two silent-failure
consequences: (a) the demo's marquee artefact — the generated court PDF — becomes unreachable,
and (b) untouched sibling locations are told, falsely, that they are saved, complete and locked.

**Evidence.**

- `features/demo/ui/DemoExperience.tsx:719` — `isComplete={currentCase?.status === 'complete'}`
  (case-level), feeding a screen that renders one *location's* review.
- `features/demo/ui/DemoExperience.tsx:725-728` — `onComplete` calls
  `completeCase(store.getState().currentCaseId)`; `create-store.ts:216-219` sets
  `status: 'complete'` on the **case**.
- `features/demo/ui/screens/CompletionScreen.tsx:42-57` — `if (p.isComplete)` returns early with
  the confirmation branch. That branch has **no** "Preview / Export PDF" button, no
  "Preview Time-Offset Calibration", and no Completion Details fields.
- `features/demo/ui/DemoExperience.tsx:531` + grep — `previewCaseNotes` is wired **only** to
  `CompletionScreen.onPreviewPdf` (line 723). There is no other entry point to
  `generateCaseNotesDoc` anywhere in the UI.
- No un-complete path exists: the only writes to `DemoCase.status` are `'draft'` at creation
  (`create-store.ts:208`) and `completeCase`; `reset()` is not reachable from any UI control
  (grepped `features/demo/ui/`, `app/`).
- Regression vs master: `git show master:features/demo/ui/DemoExperience.tsx` line 186 —
  `caseCompleted` was `useState(false)` and was reset by both `onBackToDashboard` and
  `onBackToCases`, so the review screen (and the PDF button) always came back. The new
  handlers (`DemoExperience.tsx:729-730`) reset nothing.
- Secondary contradiction on the same screen pair: `completeCase` does not touch
  `form.dateTimeCompleted` / `form.completedBy`, and nothing validates them
  (deferred: "required-field enforcement — demo enforces nothing"). So
  `selectDrawerStatus(loc).completion` stays `'empty'`, `selectLocationMapStatus` stays
  `'working'`, and the G3 row added at `ui/screens/screenData.ts:80` renders the location as
  **Working (orange)** on the very Cases card whose header the same commit turned
  **Complete (green)**. G3 and G4 disagree about the same location.

**Adversarial sequence (both are ordinary demo flows).**

1. *Single location:* create case → add location → fill the wizard → Completion → **Complete &
   Save** → confirmation → "Return to Cases" → re-open the same location → drawer → Completion.
   The visitor now sees the confirmation again and can never re-open the PDF preview, which is
   the demo's headline payoff and an explore-manifest row.
2. *Multiple locations* (trivially reached — "Add Location" per case, and a **batch PDF import
   creates one location per file**, `DemoExperience.tsx:442-462`): complete location 1, open
   location 2, navigate to Completion. Location 2 has zero data, yet the screen says
   *"Case Complete — Saved and marked complete. The location is locked, with its PDFs and media
   archived."* Nothing about location 2 was saved, completed, locked or archived.

**Suggested fix.** Keep the case-level status write (that *is* G4's payoff — the Cases/Dashboard
cards turning green) but stop using it as the per-location confirmation gate. Minimal option:
have `completeCase` (or a new `completeLocation`) also stamp the current location — e.g. write
`form.dateTimeCompleted`/`form.completedBy` if blank, or add an explicit
`LocationForm.completed: boolean` — and drive `isComplete` off *that* location flag, so
(i) only the completed location shows the confirmation, (ii) sibling locations keep their review
form, and (iii) `selectDrawerStatus(...).completion` agrees with the case card. Also give the
confirmation branch a way back to the review form (a "Review / Export again" button wired to
`onPreviewPdf`), so the PDF is never a one-shot. Add a regression test: complete case A from
location 1, then assert location 2's Completion screen still renders the review branch.

**Confidence.** High — every step verified against file:line; the PDF-unreachability and the
master-vs-branch regression are both directly grepped.

---

## SILENT-FAILURES-2 [MINOR] features/demo/engine/store/persistence.ts:380

**Claim.** The snapshot write's `catch {}` is completely silent — no dev breadcrumb — and it
leaves the **previous** snapshot in storage. If a write ever fails and the visitor then
refreshes, `loadSnapshot` happily rehydrates the older snapshot and the demo presents stale work
as the visitor's current state, with nothing in the console to explain it. This is the one place
in the new code that departs from the repo's established best-effort convention
(`generateExtractedScopes`: count it, flag it, dev-warn; `ui/import/geocode.ts`'s catch carries a
`console.warn` added by review L2 for exactly this "fails identically forever, with no signal"
reason).

**Evidence.**

- `features/demo/engine/store/persistence.ts:375-382` —
  `try { storage.setItem(...) } catch { /* best-effort: a full/blocked storage must never break
  the demo */ }`. No `console.warn`, no state flag, no `removeItem`.
- `features/demo/engine/store/persistence.ts:298-343` — `loadSnapshot` discards only on
  *unreadable/invalid* snapshots; a valid-but-stale one is returned as-is.
- `features/demo/engine/store/__tests__/persistence.test.ts:271-289` — the quota test asserts
  only that the throw is swallowed and later writes retry; it starts from an **empty** storage
  (`expect(storage.map.has(SNAPSHOT_KEY)).toBe(false)`), so the stale-snapshot case is untested
  and unhandled.
- Reachability is genuinely low today (nothing in `PersistedState` grows large —
  `OcrProof.imageDataUrl` is declared but never populated; `MediaItem` has no producer;
  the pasted import text lives in component state, not the store), which is why this is MINOR
  rather than MAJOR. It stops being low the moment P4.1 media capture or an OCR image data-URL
  lands in the snapshot.

**Suggested fix.** In the `catch`, (1) emit a dev-gated breadcrumb —
`if (process.env.NODE_ENV !== 'production') console.warn('[demo] snapshot write failed; this
tab\'s work will not survive a refresh', e)` — matching `generateExtractedScopes`/`slideDirection`;
and (2) `try { storage.removeItem(SNAPSHOT_KEY) } catch {}` so a refresh boots **empty**
(honest) instead of restoring silently-stale work. Add the missing test case: seed a valid
snapshot, make a later `setItem` throw, assert the stale snapshot is not what a subsequent
`loadSnapshot` returns.

**Confidence.** High on the gap and the convention mismatch; medium on today's reachability
(hence MINOR).

---

## SILENT-FAILURES-3 [MINOR] features/demo/ui/screens/CamerasScreen.tsx:24

**Claim.** The per-camera custom-mode maps are keyed by **row index**, but `onRemove(i)`
re-indexes the camera list underneath them. After any removal the flags point at the wrong
cameras: one row silently shows "Other (Custom)" selected while its stored value is `''`, and
another row's genuine custom value drops out of custom mode — and re-entering custom mode on
that row **clears the stored value** (the Cameras-specific behaviour), so the visitor's typed
resolution/FPS disappears with no warning.

**Evidence.**

- `features/demo/ui/screens/CamerasScreen.tsx:24-25` —
  `useState<Record<number, boolean>>({})` for both `customResolutions` and `customFps`.
- `features/demo/ui/screens/CamerasScreen.tsx:56` — `onClick={() => onRemove(i)}`;
  `features/demo/ui/DemoExperience.tsx:120-125` `listEditHandlers.remove` →
  `list.filter((_, idx) => idx !== i)`, which shifts every later camera down one index. The
  index-keyed maps are not touched.
- `features/demo/ui/screens/CamerasScreen.tsx:61,64,67,70` — every read is `customResolutions[i]`
  / `customFps[i]` against the **new** index.
- Concrete: cameras `[A "1920x1080", B custom "1440x900", C ""]`, so
  `customResolutions = {1: true}`. Remove A. Now B is index 0 → flag undefined → B renders the
  dropdown; `Dropdown` (`ui/inputs/Dropdown.tsx:38`) falls back to the raw value, so it displays
  `1440x900` but with **no** Custom Resolution field. C is index 1 → flag true → C's dropdown
  reads `CUSTOM_VALUE` and displays **"Other (Custom)"** while `c.resolution === ''`. If the
  visitor then re-picks "Other (Custom)" on B to edit it, `handleResolutionSelect`
  (`CamerasScreen.tsx:27-35`) writes `onChange(index, { resolution: '' })` and `1440x900` is gone.
- Scope note: the ruled-on deliberate choice covers the *clear-on-select* asymmetry
  (ui-mapping 07 fact-check), not the index-keying. The comment's cited phone source
  (`cameras.tsx:36-61`) uses the same index-keyed shape, so the phone likely shares the latent
  bug — but the demo has `CameraEntry.id` available and does not need to inherit it.

**Suggested fix.** Key both maps by `CameraEntry.id` (`Record<string, boolean>`) and read
`customResolutions[c.id]`; ids are already stable and collision-free post-rehydration
(`helpers.ts maxIdSeq` + `uiSeq` reseed). Alternatively, reindex both maps inside a local remove
handler before delegating to `onRemove`. Add a test: two cameras, second in custom mode, remove
the first, assert the surviving custom row still renders its Custom Resolution field with its
value.

**Confidence.** High — mechanism verified line by line; severity kept at MINOR because the
data loss needs a second visitor action after the desync.

---

## SILENT-FAILURES-4 [MINOR] features/demo/ui/DemoExperience.tsx:810

**Claim.** The new boundary's comment claims it "catches **any** render throw in the screen
subtree", but its placement covers only the *child components'* renders. Everything the bridge
evaluates to build those children — `activeScreen()`, `activeModal()`,
`selectDrawerItems(...)`, `caseCards.map(...)`, `selectDrawerStatus(...)`, `toCaseCards`,
`toMapData`, `selectExploreStatus` — runs inside `DemoExperience`'s own render, i.e. **above**
the boundary, as does the retention `useEffect`. There is no boundary above `DemoExperience`
either (no `app/demo/error.tsx`, no `app/error.tsx`, no `global-error.tsx`), so such a throw
still white-screens the whole page — frame, rail and all. Parity matrix row 6 asks for an
"App-wide Error Boundary Fallback"; what landed is a screen-subtree boundary.

**Evidence.**

- `features/demo/ui/DemoExperience.tsx:810-814` — the comment, then
  `<DemoErrorBoundary view={view} onReturnToCases={returnToCases}>`.
- `features/demo/ui/DemoExperience.tsx:816` `{activeScreen()}`, `:818` `{activeModal()}`,
  `:824` `caseCards.map(...)`, `:843` `selectDrawerItems(store.getState()).map(...)` — all are
  expressions in `DemoExperience`'s JSX, evaluated during **its** render pass, before
  `DemoErrorBoundary` renders. A throw in any of them unwinds past the boundary.
- `features/demo/ui/DemoExperience.tsx:264` `selectDrawerStatus(currentLocation)` and
  `:273-288` the retention effect — same, outside the boundary.
- `find app -name "error.tsx" -o -name "global-error.tsx"` → no results;
  `app/demo/page.tsx` renders `<DemoExperience />` bare under `dynamic({ ssr: false })`.
- `docs/planning/demo-phone-parity/00-surface-parity-matrix.md:67` (row 6) — "App-wide Error
  Boundary Fallback … Any render throw white-screens the whole phone frame."
- I could not ground a *reachable* throw in that region today (`selectAdjustedScopes` swallows
  via its tracked §15 empty catch; `slideDirection` warns rather than throws; the mappers are
  plain), which is why this is MINOR and not MAJOR.

**Suggested fix.** Either (a) add `app/demo/error.tsx` (a Next.js route-level boundary) so a
bridge-render throw degrades to a demo-voiced page instead of Next's generic client-exception
screen, or (b) extract the screen/modal switch into a small child component so its body renders
*inside* `DemoErrorBoundary`. If neither is wanted in P0, tighten the comment at
`DemoExperience.tsx:810` to say what is actually covered (child component renders — not the
bridge's own render or effects) and log the residual under deferred §29.

**Confidence.** High on the coverage gap and the missing route boundary; low on any concrete
throw reaching it today.

---

## SILENT-FAILURES-5 [MINOR] features/demo/engine/store/persistence.ts:333

**Claim.** `loadSnapshot` already performs one deliberate load-time coherence adjustment
(a launch-only `view` restores to `currentChapter`, lines 339) but performs **no referential
integrity check** on the restored selection. A snapshot whose `currentLocationId` does not
resolve in `locations` passes the shape guard and rehydrates a wizard view with a dangling
selection — and in that state `updateField` is a **silent no-op**: the visitor types into the
form and nothing is stored, nothing warns, nothing surfaces.

**Evidence.**

- `features/demo/engine/store/persistence.ts:333-343` — the returned literal passes
  `currentCaseId` / `currentLocationId` straight through; only `view` is adjusted.
- `features/demo/engine/store/create-store.ts:254-263` — `updateField` does
  `const id = get().currentLocationId; if (!id) return` and then
  `s.locations.map(l => l.id === id ? setPath(...) : l)` — a non-null id that matches nothing
  writes nothing and returns no error.
- The related in-session path already exists on master: `StoryRail`'s `onJump`
  (`DemoExperience.tsx:861`) → `setView(v)` for any of the 10 wizard ids
  (`engine/content/explore.ts:42` maps every `DRAWER_DEFS` entry to `jumpTo: d.id`), so a visitor
  can land on `dvrInfo` with `currentLocationId === null` and type into a dead form. P0.4 is what
  makes that dead state **survive a refresh** — before this PR a reload cleared it.
- I could find no path by which the demo's own `snapshotOf` writes an inconsistent pair (it
  snapshots one atomic store state), so the dangling-id case needs a hand-edited or
  partially-written `sessionStorage` value. Hence MINOR.

**Suggested fix.** Extend the existing load-time adjustment block
(`persistence.ts:325-343`) with a coherence pass, in the same documented spirit: drop
`currentLocationId` when it does not resolve in `locations` (and `currentCaseId` likewise), and
when the restored `view` is a wizard chapter with no resolvable location, restore `view` /
`currentChapter` to `'cases'` instead — one more line in the same `return`, pinned by a test
alongside the existing "launch-only view restores to currentChapter" case. Separately (or as a
§29 follow-up), consider making the wizard screens surface "open a location first" rather than
letting `updateField` swallow edits — that closes the pre-existing rail-jump hole too.

**Confidence.** Medium-high — the no-op mechanism and the rail-jump entry are both verified;
the dangling-snapshot trigger is adversarial rather than self-generated.

---

## Verified-and-cleared (checked, not findings)

- **`FallbackMode` honesty machinery** — untouched by this diff; the `never`-guarded
  `fallbackNotice` switch (`DemoExperience.tsx:362-377`), the per-card `fallbackMode`
  attribution (`:420`), the `fieldCount === 0` blank-record rejection, and every
  `console.warn`/`console.error` breadcrumb in `extract-client.ts` / `geocode.ts` /
  `app/api/extract/route.ts` are intact. No breadcrumb was removed anywhere in the diff.
- **Import generation tokens (H1/H2)** — all five checkpoints survive
  (`DemoExperience.tsx:391, 453, 456, 460, 478, 482`); no new store write after an `await`
  was introduced.
- **`import.ts` FORM_OPTIONS re-pointing** — values are byte-identical where they overlap and
  no import writer consumes `FORM_OPTIONS` today
  (`import-displayable.test.ts:81-94` pins that the patch shape contains no dropdown-enum
  field), so the `'custom'` sentinel cannot reach a form or a PDF.
- **`Dropdown` unknown-value handling** (`ui/inputs/Dropdown.tsx:38`) — degrades to showing the
  raw value rather than rendering as "nothing selected". Honest; correct.
- **`loadSnapshot` failure policy** — every read/parse/version/shape failure discards *and*
  removes, both `getItem` and `removeItem` throws are contained, and the tests cover each arm
  (`persistence.test.ts:124-209`). Boot cannot crash on a hostile snapshot.
- **`maxIdSeq` / `uiSeq` reseed** — every store id is `${prefix}${n}` (`create-store.ts:183,
  193, 222, 323, 410`) and the UI ids are `ui-{s,v,c}${n}`; the shared global max seeds both
  counters above every rehydrated id, so no post-refresh collision is possible.
- **`DemoErrorBoundary` breadcrumb** — no `componentDidCatch` is needed: React 19's default
  `onCaughtError` logs every caught render error to `console.error` (the branch's own
  `DemoExperience.boundary.test.tsx:14-18` has to mock it out). Not a finding.
- **`getDerivedStateFromProps` reset** — traced the throw → `getDerivedStateFromError` →
  re-render → `getDerivedStateFromProps` ordering; `lastView` is already updated by then, so the
  error is not cleared under itself and there is no re-throw loop. The explicit
  `setState({ error: null })` in `handleReturn` (`DemoErrorBoundary.tsx:97-101`) correctly covers
  the already-on-`cases` case, and `returnToCases` (`DemoExperience.tsx:295-303`) clears every
  transient overlay (pdf / ocr / map picker / drawer / modal) so the recovered subtree cannot
  immediately re-throw. No boot-loop: a throwing restored view is escapable and the recovery
  immediately persists `view: 'cases'`.
- **P0.5 glass-token extraction** — diffed every touched style line; all substitutions are
  value-identical, no behavioural code changed.
- **Tracked items §15 / §18 / §28** — un-defer triggers did **not** fire:
  `engine/store/selectors.ts` and `engine/logic/time.ts` are not in the diff, and
  `onFilesPicked` / `runPasteImport` were not modified.

---

## Silent Failure Hunter Summary

| Severity | Count |
|---|---|
| BLOCKER (CRITICAL) | 1 |
| MAJOR (HIGH) | 0 |
| MINOR (MEDIUM/LOW) | 4 |

- Fallback honesty (every substitution announced): **yes** for the import/model/map surfaces;
  **no** for the completion state — SILENT-FAILURES-1 asserts "saved, complete and locked"
  about locations that are none of those.
- Failure-cause distinctions preserved: **yes**.
- Partial results flagged (not silently short): **yes** (`extractedScopesPartial` untouched).
- Async cancellation / stale-write safety: **yes** (generation tokens intact; the new
  persistence subscription is synchronous and reads `getState()` at write time).
- Operator breadcrumbs intact: **yes, none removed** — but one new swallow was added without
  one (SILENT-FAILURES-2).

**Verdict: BLOCK** — on SILENT-FAILURES-1 alone. The four MINORs are fix-opportunistically.
