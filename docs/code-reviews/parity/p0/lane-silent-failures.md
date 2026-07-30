# Lane: silent-failures — parity P0 (PR #29), FIX-DELTA

- **Lane:** silent-failures (`.claude/agents/silent-failure-hunter.md`)
- **Mode:** FIX-DELTA — re-review of the fix round on `feat/parity-p0`
- **Fix round under review:** everything after `165de2b` (`docs(review): P0 phase review`) —
  three fix branches merged in: `parity/p0-fix-boundary` (`e950de6`…`0501023`),
  `parity/p0-fix-options` (`a0ec7f6`, `5c319e4`, `c78ee30`), `parity/p0-fix-store`
  (`cf96bb5`…`a25396b`). 32 files, +851/−187.
- **Refs read:** prior vetted review `docs/code-reviews/parity/p0/p0-review.md` (R-1…R-18),
  prior lane file (this file's previous revision, SILENT-FAILURES-1…5),
  `.claude/agents/silent-failure-hunter.md`, `features/demo/CLAUDE.md`,
  `docs/code-reviews/deferred.md` (§15, §18, §28, new §32).
- **Files read in full behind the fix hunks:** `engine/store/persistence.ts`,
  `engine/store/create-store.ts`, `engine/store/selectors.ts`, `engine/types/index.ts`,
  `engine/content/form-options.ts`, `engine/content/explore.ts`, `engine/logic/import.ts`,
  `ui/DemoExperience.tsx`, `ui/screens/CompletionScreen.tsx`, `ui/screens/CamerasScreen.tsx`,
  `ui/screens/screenData.ts`, `ui/inputs/Dropdown.tsx`, `ui/chrome/DemoErrorBoundary.tsx`,
  `ui/import/geocode.ts`, `app/demo/error.tsx`, plus every changed test file.

**Deliberate choices honoured (not re-flagged):** the `Case Complete` → `Location Complete`
copy change (orchestrator-ruled, tied to the honesty rationale); the CamerasScreen seeding
divergence from the phone (review-authorized); deleting `FORM_OPTIONS` outright (R-11+R-17);
deferred §29–§32; the class-based boundary; sessionStorage-over-localStorage (D2); the
phone-verified DVR-vs-Cameras clear-on-select asymmetry.

---

# Part 1 — Fix-delta verification

| Prior lane finding | Review id | Verdict | Fix commit |
|---|---|---|---|
| SILENT-FAILURES-1 (case-scoped completion gate) | R-1 | **FIXED** (one residual → SF-6) | `5c319e4` |
| SILENT-FAILURES-2 (silent snapshot-write swallow) | R-14 | **FIXED** (one residual → SF-8) | `cd6b539` |
| SILENT-FAILURES-3 (index-keyed camera custom flags) | R-2 | **FIXED** | `c78ee30` |
| SILENT-FAILURES-4 (boundary coverage overstated) | R-5 | **FIXED** (one residual → SF-7) | `02b6a6c` |
| SILENT-FAILURES-5 (no referential-integrity pass) | R-15 | **FIXED** | `c03b92b` |

## SILENT-FAILURES-1 / R-1 — FIXED

The gate is now location-scoped and the PDF is no longer a one-shot. Verified end to end:

- `engine/types/index.ts:172-174` adds `LocationForm.completed: boolean`;
  `engine/content/seed.ts:63` initialises it to `false` in `blankLocationForm()`.
- `engine/store/create-store.ts:219-229` — `completeCase` keeps the case-level `status:
  'complete'` write (G4's payoff) **and** stamps only `l.id === s.currentLocationId`.
- `ui/DemoExperience.tsx:726` — `isComplete={(currentLocation?.form.completed ?? false) &&
  !reviewAgain}`. Sibling locations of a completed case keep the review branch; pinned by
  `ui/__tests__/DemoExperience.sandbox.test.tsx` ("completing location 1 leaves a sibling
  location on the REVIEW form") and `engine/store/__tests__/store.test.ts` ("stamps
  form.completed on the CURRENT location only").
- PDF reachability restored: `CompletionScreen.tsx:60` adds "Review / Export again" →
  `DemoExperience.tsx:738` `setReviewAgain(true)` → the review branch with
  `Preview / Export PDF` (`CompletionScreen.tsx:89-92`). Pinned by the sandbox test "the court
  PDF is never a one-shot".
- The G3/G4 contradiction I raised is closed: `engine/store/selectors.ts:195-200` short-circuits
  `selectLocationMapStatus` on `form.completed`, so the Cases row and the case card agree
  (`selectors.test.ts:96-102`).
- `reviewAgain` cannot leak across locations: the only `switchLocation` call site in the UI is
  `openLocation` (`DemoExperience.tsx:322-326`), which resets it first; `onComplete` resets it
  too (`:736`).
- Snapshot compatibility handled: `SNAPSHOT_VERSION`/`SNAPSHOT_KEY` bumped to `2` /
  `dvr-demo-state-v2` (`persistence.ts:62-63`) and `completed: z.boolean()` is in
  `locationFormSchema` (`:205`) — so the new flag cannot be silently stripped on rehydrate.

Residual (new, filed below): the `onComplete`/`canComplete` pair still trusts
`currentCaseId` rather than the current location's own `caseId` → **SF-6**.

## SILENT-FAILURES-2 / R-14 — FIXED

`engine/store/persistence.ts:449-462` now carries both halves of the suggested fix: a dev-gated
`console.warn` and a best-effort `storage.removeItem(SNAPSHOT_KEY)` (itself wrapped) so a later
refresh boots honestly empty instead of restoring stale work. `persistence.test.ts` gained the
missing case (seed a valid snapshot → make `setItem` throw → assert the stale snapshot is gone).

Residual (new, filed below): the breadcrumb drops the caught error, so quota-vs-blocked cannot be
told apart — **SF-8**.

## SILENT-FAILURES-3 / R-2 — FIXED

`ui/screens/CamerasScreen.tsx:28-34` re-keys both maps to `Record<string, boolean>` keyed by
`CameraEntry.id`, reads `customResolutions[c.id]` / `customFps[c.id]` (`:70,73,76,79`), and uses
functional updaters (`setX((prev) => …)`, `:39,42,50,53`) so two same-tick changes can't clobber.
Seeding from `isCustomResolution` / `isCustomFps` is correct against the PF-14 empty-string guard
(`engine/content/form-options.ts:96-105`: `''` → `false`, so a blank camera still renders the
picker placeholder, not a spurious custom field). Both removal directions and the seeding are
pinned by three new tests in `option-parity.test.tsx:150-201`.

## SILENT-FAILURES-4 / R-5 — FIXED

`app/demo/error.tsx` is the route-segment outer net, and the overstated comment at
`DemoExperience.tsx:820-827` was narrowed to exactly what the in-frame boundary covers, naming
the route-level net for the bridge's own frame. `app/demo/__tests__/error.test.tsx` pins the
render and the `reset()` wiring. Tailwind tokens used by the fallback all exist
(`app/css/style.css:14-15,29-34`), so the page is not invisible text.

Residual (new, filed below): "Try again" cannot escape a state-driven throw because the
unmount flush cements the throwing state into the snapshot — **SF-7**.

## SILENT-FAILURES-5 / R-15 — FIXED

`engine/store/persistence.ts:386-400` adds the coherence pass in the same documented spirit as
the existing launch-view adjustment: dangling `currentCaseId`/`currentLocationId` are dropped,
and a wizard `view`/`currentChapter` left without a resolvable location restores to `'cases'`.
I traced the four orderings (launch-view + wizard chapter + null location; wizard view with
non-wizard chapter; `'map'`; both null) — `restoredChapter` is reassigned before the
`restoredView` check, so no arm can leave a wizard view with a null location. The docstring at
`:330-338` was updated to describe three adjustments, not two.

---

# Part 2 — New findings introduced by the fixes

## SILENT-FAILURES-6 [MAJOR] features/demo/ui/DemoExperience.tsx:727

**Claim.** The R-1 fix made the completion gate location-scoped and added a `canComplete` guard
so "Complete & Save" can no longer silently no-op — but the guard only checks that both ids are
**non-null**, not that they are **coherent**. `onComplete` still passes `currentCaseId` to
`completeCase`, while `completeCase` will only stamp a location whose `caseId` matches. When the
selection is incoherent (`currentCaseId !== currentLocation.caseId` — reachable in ordinary
navigation, see below), pressing the demo's marquee CTA does one of two dishonest things:

- *location not yet completed*: an **unrelated, usually empty case turns green** on the Cases /
  Dashboard cards, the location is not stamped, `isComplete` stays `false`, so the confirmation
  never appears — the primary button looks dead and the visitor taps it again and again;
- *location already completed earlier*: the confirmation **does** appear (it keys off the old
  flag), so the visitor gets a convincing success card while, again, a different case was
  silently marked complete. That is a fake success — the failure mode the honesty rule exists
  to prevent.

**Evidence.**

- `features/demo/ui/DemoExperience.tsx:727` — `canComplete={!!currentLocation && !!currentCase}`.
  No coherence check.
- `features/demo/ui/DemoExperience.tsx:733-737` — `const id = store.getState().currentCaseId; if
  (id) store.getState().completeCase(id)`.
- `features/demo/engine/store/create-store.ts:224-228` — the stamp requires
  `l.id === s.currentLocationId && l.caseId === caseId`; the `caseId` mismatch makes it a no-op
  with no return value, no flag and no log. The fix round's own
  `engine/store/__tests__/store.test.ts` ("never stamps a location belonging to a different
  case") **pins this store behaviour as correct** — the store is right; the bridge is what
  passes the wrong case id.
- Incoherence is created by an ordinary action: `create-store.ts:215` — `createCase` sets
  `currentCaseId` and leaves `currentLocationId` pointing at the previous case's location.
  (`addLocation`, `:250-254`, is the mirror image: it sets `currentLocationId` without
  `currentCaseId`.)
- The wizard is reachable in that state without going through `openLocation` (which would
  re-sync both ids): every rail checklist row is a jump button —
  `ui/controls/ExploreChecklist.tsx:70-73` → `DemoExperience.tsx:875`
  `onJump={(v) => store.getState().setView(v)}`, and `engine/content/explore.ts:42` gives every
  drawer screen, including `completion`, its own row.
- `loadSnapshot`'s new integrity pass (`persistence.ts:389-393`) validates each id independently
  and does not check that `currentLocation.caseId === currentCaseId`, so the incoherent pair
  also survives a refresh.

**Adversarial sequence (5 taps, all first-class controls).** Cases → **New Case** (case A) →
expand A → **Add Location** (L1) → Cases → **New Case** (case B). Now `currentCaseId = B`,
`currentLocationId = L1` (caseId A). Rail → **Completion** row → **Complete & Save**. Observed:
empty case B flips to "Complete" (green) on the Cases list; L1 is untouched; the screen does not
change. Console: nothing. Repeat taps: nothing.

**Suggested fix.** Derive the case from the location that is actually being completed, and make
the guard demand coherence — two lines in the bridge:

```ts
canComplete={!!currentLocation && currentLocation.caseId === currentCase?.id}
onComplete={() => {
  const st = store.getState()
  const loc = st.locations.find((l) => l.id === st.currentLocationId)
  if (loc) st.completeCase(loc.caseId)   // the case that owns the location — always stamps
  setReviewAgain(false)
}}
```

Then the store stamp can never miss, and the green card can never land on a case the visitor
wasn't looking at. Add the regression test beside the existing store case: create A + L1, create
B, `setView('completion')`, click Complete & Save → assert L1 is stamped, A is complete and B is
still `'draft'`. (Cheap secondary while in there: `CompletionScreen.tsx:100`'s disabled tooltip
says "Open a location first", which is wrong when the *case* is the missing half — make it
"Open a case and location first" or derive the copy.)

**Confidence.** High. Every link verified at file:line; the store's mismatch behaviour is pinned
by the fix round's own test, and the rail-jump entry is a rendered button, not a hypothetical.

---

## SILENT-FAILURES-7 [MINOR] app/demo/error.tsx:8

**Claim.** The new route-segment net's own comment promises "reset() remounts the segment, and
the P0.4 rehydration path (loadSnapshot) re-runs on mount, so the visitor's session survives
recovery unless the snapshot itself is what throws." For any throw driven by restored store
state, that caveat is not an edge case — it is the guaranteed outcome, because the boundary's
activation is exactly what **writes the throwing state to storage**. "Try again" then re-reads
it, re-throws, and re-renders the same page: a recovery control that can never recover, with no
signal saying so.

**Evidence.**

- `app/demo/error.tsx:37-44` — the only control is `onClick={reset}`. There is no path to clear
  the tab's snapshot from this page (it deliberately imports nothing from `@/features/demo`, so
  it has no access to `SNAPSHOT_KEY`).
- `features/demo/ui/DemoExperience.tsx:223-232` — the persistence effect's cleanup calls
  `handle.dispose()`; `engine/store/persistence.ts:475-480` — `dispose()` unsubscribes **and
  flushes** the pending debounced write. When the segment boundary catches, React unmounts the
  throwing subtree and runs that cleanup, so the state that threw is written to
  `dvr-demo-state-v2` as the newest snapshot.
- `features/demo/ui/DemoExperience.tsx:162-164` — the remount after `reset()` calls
  `loadSnapshot(...)` synchronously and rebuilds the store from it. Same state → same throw.
- Reachability is genuinely low today, which is why this is MINOR: I could not ground a
  render-time throw in the bridge frame driven by restored data. `z.number()` rejects `NaN`
  (and `JSON.stringify(NaN)` is `null`, which the schema also rejects), the view-model mappers
  (`toCaseCards`, `screenData.ts:73-98`) are total, and `selectAdjustedScopes` swallows rather
  than throws. The trigger is a hand-edited `sessionStorage` value today, or any future
  P-phase mapper that can throw on restored data.

**Suggested fix.** Give the fallback a second, honest control — "Start fresh (clears this tab's
demo session)" — that clears the snapshot before calling `reset()`. Cleanest shape that respects
the barrel rule: export a tiny `clearDemoSnapshot()` from `features/demo/index.ts` (it already
exports `DemoExperience`, and `app/demo/page.tsx` imports the barrel), rather than hardcoding the
key string in `app/`. Failing that, at minimum say it in the copy at `:28-31`: today the page
tells the visitor their session "is restored if it's intact" but never tells them what to do when
it isn't.

**Confidence.** High on the mechanism (unmount flush → re-read → same throw, all at file:line);
low on a reachable trigger in P0 — hence MINOR.

---

## SILENT-FAILURES-8 [MINOR] features/demo/engine/store/persistence.ts:454

**Claim.** The R-14 breadcrumb landed, but `catch {` binds no error and the warn logs a fixed
string. Two distinct causes therefore collapse to one indistinguishable log line: a
`QuotaExceededError` (the payload outgrew the ~5 MB budget — precisely the P4 media / OCR
data-URL trigger R-14 was raised about) and a `SecurityError` (storage blocked / partitioned)
read identically, and both now also *delete* the snapshot. That is the exact
"fallback-cause collapse" the lane's reference breadcrumb was written to avoid, and it diverges
from the in-repo convention set by the very warn R-14 cited.

**Evidence.**

- `features/demo/engine/store/persistence.ts:449` — `} catch {` (no binding);
  `:454-456` — `console.warn('[demo] snapshot write failed — clearing the stale snapshot; this
  tab will boot empty on refresh')`, no error argument.
- The convention it cites: `features/demo/ui/import/geocode.ts:43` —
  `console.warn('[demo/geocode] forward geocode failed — location will have no map pin:', e)`,
  added by review L2 with the reasoning that an expired token must not "fail identically to
  'no match', forever, with no signal". Same reasoning applies here.
- Secondary (same lines, no separate finding): because the subscription re-arms on every store
  change, a persistent failure re-warns and re-`removeItem`s on every keystroke. Logging the
  cause at least makes that loop diagnosable in one glance.

**Suggested fix.** `} catch (e) {` and pass `e` as the warn's last argument, matching
`geocode.ts:43`. One-token change; no behavioural change.

**Confidence.** High — both lines read directly; purely an observability gap, hence MINOR.

---

## SILENT-FAILURES-9 [MINOR] features/demo/engine/store/selectors.ts:77

**Claim.** Not a new defect — a tracked item whose un-defer trigger the fix round fired.
`docs/code-reviews/deferred.md` §15 defers two latent silent failures with the trigger *"Next
time `selectors.ts` / `time.ts` are touched"*. The original P0 diff did not touch either file
(I verified that in the initial pass and recorded it). The fix round does: `5c319e4` edits
`engine/store/selectors.ts`. Per the lane's standing instruction to surface a fired trigger, the
§15 work is now in scope for this branch or must have its trigger explicitly re-scoped.

**Evidence.**

- `git diff --stat master...165de2b -- features/demo/engine/store/selectors.ts` → empty (the
  pre-fix P0 diff did not touch it); `git log --oneline 165de2b..feat/parity-p0 --
  features/demo/engine/store/selectors.ts` → `5c319e4 fix(demo): location-scoped completion
  gate … (R-1)`.
- The deferred body, still true: `features/demo/engine/store/selectors.ts:77-79` —
  `} catch { // non-canonical requested time — adjusted stays blank … }` with no dev-warn,
  where its sibling `create-store.ts:339-348` counts (`dropped`), flags
  (`extractedScopesPartial`) and dev-warns for the identical parse failure.
  `engine/logic/time.ts` `roundTo5Min` is untouched, so only the `selectors.ts` half fired.
- Live consequence today is contained but real: `selectCaseNotesData` (`selectors.ts:211,
  228-229`) already surfaces the drop honestly in the document via `adjustedScopesPartial`, so
  the visitor is not lied to — what is missing is only the operator breadcrumb. Hence MINOR,
  not MAJOR.

**Suggested fix.** Either (a) add the three-line dev-warn to the `selectAdjustedScopes` catch
now — `if (process.env.NODE_ENV !== 'production') console.warn('[demo] selectAdjustedScopes
skipped a non-canonical scope', sc.id)`, mirroring `generateExtractedScopes` — and strike the
`selectors.ts` half of §15; or (b) record in §15 that the trigger fired during the P0 fix round
and was deliberately deferred again to P2.4 (G8), so the next toucher isn't misled by a trigger
that has already been passed over once.

**Confidence.** High — the trigger text, the two `git` facts and the unchanged catch arm are all
verified.

---

## Verified-and-cleared (checked this round, not findings)

- **`FallbackMode` honesty machinery** — untouched by the fix round. The `never`-guarded
  `fallbackNotice` switch (`DemoExperience.tsx:367-382`), the per-card `fallbackMode`
  attribution (`:425`), the `fieldCount === 0` blank-record rejection and every
  `console.warn`/`console.error` breadcrumb in `extract-client.ts` / `geocode.ts` /
  `app/api/extract/route.ts` are intact. **No breadcrumb was removed anywhere in the fix round;
  one was added** (`persistence.ts:455`).
- **Import generation tokens (H1/H2)** — all six checkpoints survive untouched
  (`DemoExperience.tsx:396, 413, 458, 461, 465, 483, 487`). The fix round added no store write
  after an `await`.
- **`completeCase` writing `locations` as well as `cases`** — no stale-write hazard: it is a
  single synchronous `set` computed from `s`, not from a captured render closure.
- **`FORM_OPTIONS` deletion (R-11/R-17)** — grepped the whole tree: zero remaining references in
  `features/`/`app/` (docs only). `optionValues` survives with a real consumer
  (`engine/content/__tests__/form-options.test.ts`) and is still exported from the engine barrel,
  so nothing was orphaned into a dangling import.
- **`Dropdown` `aria-labelledby` (R-10)** — the unknown-value degrade at `Dropdown.tsx:38-39`
  (show the raw value rather than render as "nothing selected") is untouched and still honest.
- **`DemoErrorBoundary` `view: AppView` (R-16)** — type-only import; the `?? GENERIC_COPY`
  runtime default is retained, so a view with no entry still gets copy rather than `undefined`.
- **Snapshot v1→v2 key change** — old `dvr-demo-state-v1` values are simply never read (the key
  itself changed, not just the version field), so a pre-fix tab cannot rehydrate a `completed`-less
  form. Orphaned v1 keys die with the tab; not worth a finding.
- **`selectLocationMapStatus` short-circuit** — a location the visitor explicitly completed with
  empty fields now reads "Complete" on the Cases row. That is the visitor's own declaration, and
  the demo enforces no required fields by documented decision; not a fallback presented as a real
  result. The drawer's per-screen `completion` dot (`selectors.ts:179`) correctly still reads
  `'empty'` — that dot answers "what's not filled in", a different question.
- **Confirmation copy "This location is locked, with its PDFs and media archived"**
  (`CompletionScreen.tsx:57`) — considered and dropped. The claim is app-narrative that predates
  the fix (nothing was ever locked), the `Case`→`Location` rename is orchestrator-ruled
  deliberate, and the only newly-contradicting element is the "Review / Export again" button that
  R-1 asked for. Worth a copy pass sometime; not a silent failure.
- **Tracked items §18 / §28** — triggers did **not** fire: `onFilesPicked` / `runPasteImport`
  (`DemoExperience.tsx:441-489`) were not modified and no awaited call gained the ability to
  throw; the rail-narration manifest is unchanged.

---

## Silent Failure Hunter Summary — fix-delta

| Severity | Count |
|---|---|
| BLOCKER (CRITICAL) | 0 |
| MAJOR (HIGH) | 1 |
| MINOR (MEDIUM/LOW) | 3 |

Prior lane findings: **5/5 fixed** (1 BLOCKER + 4 MINOR), three of them leaving a narrower
residual filed above.

- Fallback honesty (every substitution announced): **yes** for import/model/map; the completion
  surface is now truthful per-location — except the incoherent-selection path in SF-6, where a
  success card can appear for a case the visitor never opened.
- Failure-cause distinctions preserved: **yes**, with one collapse added (SF-8).
- Partial results flagged (not silently short): **yes** (`extractedScopesPartial` /
  `adjustedScopesPartial` untouched).
- Async cancellation / stale-write safety: **yes** — generation tokens intact, no new post-await
  store write.
- Operator breadcrumbs intact: **yes, none removed; one added** (`persistence.ts:455`).

**Verdict: REVISE** — on SILENT-FAILURES-6 alone (two lines in the bridge). The three MINORs are
fix-opportunistically; SF-9 needs a decision (fix now or re-scope the trigger), not necessarily
code.
