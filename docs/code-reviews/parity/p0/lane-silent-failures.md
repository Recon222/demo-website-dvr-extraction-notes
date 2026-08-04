# Lane: silent-failures — parity P0 (PR #29), FIX-DELTA **round 2**

- **Lane:** silent-failures (`.claude/agents/silent-failure-hunter.md`)
- **Mode:** FIX-DELTA round 2 — re-review of the round-2 fix commits only
- **Fix round under review:** everything after the round-1 review merge `f69aa92`
  (`docs(review): P0 fix-delta`) — three branches merged in:
  `parity/p0-fix2-options` (`e182186` R-20), `parity/p0-fix2-boundary`
  (`480321a` R-24, `e8621bd` R-21, `4abad16` R-22, `207963f` R-25, `8a4dd55` R-26),
  `parity/p0-fix2-store` (`b86cd46` R-19, `c41c5ae` R-27, `6566531` R-28, `ac4cb5e` R-29,
  `7ef5608` R-30, `c4cf8b4` R-23). 23 files, +438/−56.
- **Refs read:** prior vetted review `docs/code-reviews/parity/p0/p0-review-fixdelta.md`
  (R-19…R-30), my own prior lane file (this file's previous revision, SILENT-FAILURES-6…9),
  `.claude/agents/silent-failure-hunter.md`, `features/demo/CLAUDE.md`,
  `docs/code-reviews/deferred.md` (§15 as re-scoped, §18, §28, §29 addendum, §32).
- **Files read in full behind the round-2 hunks:** `engine/store/create-store.ts`,
  `engine/store/persistence.ts`, `engine/store/selectors.ts`, `engine/types/index.ts`,
  `engine/content/form-options.ts`, `engine/content/explore.ts`, `ui/DemoExperience.tsx`,
  `ui/clear-demo-snapshot.ts`, `ui/screens/CompletionScreen.tsx`, `ui/screens/SubmissionScreen.tsx`,
  `ui/controls/ExploreChecklist.tsx`, `ui/import/geocode.ts`, `features/demo/index.ts`,
  `app/demo/error.tsx`, plus every changed test file and the three changed docs.
- **Empirical check (read-only):** `npx vitest run store.test.ts select-adjusted-scopes.test.ts
  clear-demo-snapshot.test.ts app/demo/__tests__/error.test.tsx` → **4 files / 50 tests green**.

**Deliberate choices honoured (not re-flagged):** R-1…R-18 are CLOSED and were not re-litigated;
the `completeCase(locationId)` reshape deliberately **not** adopted (reason in `b86cd46`'s body,
logged as a triggered follow-up in deferred §29 addendum); §15's `roundTo5Min` half deliberately
left open with a re-scoped trigger; the class-based boundary; sessionStorage-over-localStorage (D2);
`Location Complete` copy; the phone-verified DVR-vs-Cameras asymmetry; deferred §29–§32.

---

# Part 1 — Fix-delta verification (round-2 findings attributed to this lane)

| Prior finding | Lane origin | Verdict | Fix commit |
|---|---|---|---|
| R-19 (completion gate trusts an incoherent selection pair) | silent-failures SF-6 (+ typescript, type-design) | **FIXED** (two narrower residuals → SF-2, SF-3 below) | `b86cd46` |
| R-24 (outer net can't escape a state-driven throw) | silent-failures SF-7 (+ web WEB-8) | **FIXED** (one residual → SF-1 below) | `480321a` |
| R-26 (R-14's breadcrumb binds no error) | silent-failures SF-8 | **FIXED** | `8a4dd55` |
| R-27 (deferred §15 trigger fired) | silent-failures SF-9 | **FIXED** — option (a), code + ledger | `c41c5ae` |
| R-20 (orphaned `optionValues`) | typescript/type-design (my cleared-list was over-ruled) | **FIXED** by deletion; my prior "a real consumer survives" note is now moot | `e182186` |

## R-19 — FIXED

The bridge no longer trusts the selection pair, **and** the pair can no longer go incoherent:

- `ui/DemoExperience.tsx:735` — `canComplete={!!currentLocation}` (was `!!currentLocation &&
  !!currentCase`).
- `ui/DemoExperience.tsx:741-746` — `onComplete` finds the open location and calls
  `st.completeCase(loc.caseId)`. `completeCase`'s cross-case guard (`create-store.ts:229`) is
  therefore always satisfied: the stamp can no longer miss and the green can no longer land on a
  case the visitor never opened.
- Source-side invariant (the optional item (2) of the review's fix list, taken): `create-store.ts:219`
  — `createCase` now clears `currentLocationId`; `:259-260` — `addLocation` sets **both** halves.
  I enumerated every writer of the pair in the engine — `initialState()` (`:156-157`), `createCase`,
  `addLocation`, `switchLocation` (`:268`) — that is the complete set, and all four now write a
  coherent pair.
- Item (3) of the fix list (the disabled-hint copy, `CompletionScreen.tsx:100` "Open a location
  first") is resolved **by construction**: with the case half removed from the predicate, "no
  location open" is the only disabling condition, so the hint is now true. No copy change needed.
- Regression tests landed and are strict about the honesty half:
  `ui/__tests__/DemoExperience.sandbox.test.tsx` "R-19 (mandated regression)" asserts B stays
  `'draft'`, A stays `'draft'`, the location stays un-completed **and** the button is `toBeDisabled()`;
  the sibling "R-19: onComplete derives the case from the OPEN LOCATION" forces the incoherent pair
  via `store.setState` and asserts A greens, B doesn't, L1 stamps, confirmation appears.
  `engine/store/__tests__/store.test.ts:251-268` pins both new store-action invariants.
  TESTS-7's gap (hardcoding `canComplete` leaves the suite green) is closed by the disabled assertion.

Residuals filed below: the invariant is not re-asserted at the one boundary that ingests state the
engine didn't produce (**SF-2**), and the `createCase` clear widens the in-session reach of the
"dead form" state `loadSnapshot` explicitly repairs at boot (**SF-3**).

## R-24 — FIXED

The escape hatch exists and does the one thing that makes it an escape:

- `app/demo/error.tsx:54-68` — a second control, "Start fresh (clears this tab's demo session)",
  clears **before** `reset()` (`:57-63`). Ordering is pinned by
  `app/demo/__tests__/error.test.tsx` via `invocationCallOrder`, and "Try again" is pinned to
  **not** clear (so the transient case still preserves the session).
- Barrel rule respected: `features/demo/index.ts:5` exports `clearDemoSnapshot` from
  `ui/clear-demo-snapshot.ts`; `app/` never deep-imports engine paths nor hardcodes `SNAPSHOT_KEY`.
  `features/demo/CLAUDE.md:37-40` was updated to describe the widened public surface (the contract
  file and the code agree).
- The `window.sessionStorage` **property access** is wrapped (`ui/clear-demo-snapshot.ts:25-30`),
  matching `sessionStorageOrNull` (`DemoExperience.tsx:108-114`) — Safari private mode can't turn the
  recovery control into a second throw. `engine/store/persistence.ts:441-450` (`clearSnapshot`) keeps
  the injected-storage shape and dev-warns a throwing `removeItem`.
- Mechanism re-verified end to end: the boundary's activation unmounts the subtree →
  `DemoExperience.tsx:230-233` cleanup → `dispose()` → `flush()` (`persistence.ts:515-518`) writes the
  throwing state; "Start fresh" then removes that key **after** the flush and before the remount's
  `loadSnapshot` (`DemoExperience.tsx:162`), so the rebuild is genuinely empty.

Residual filed below: the hatch's own failure path is swallowed with no signal (**SF-1**).

## R-26 — FIXED

`engine/store/persistence.ts:486` now binds the error (`} catch (e) {`) and `:494` passes it as the
warn's final argument, matching the `geocode.ts:43` convention the finding cited. Quota-exceeded vs
storage-blocked are now distinguishable, and the per-keystroke re-warn loop is diagnosable at a
glance. `persistence.test.ts:431-434` pins the cause (`expect.objectContaining({ message:
'QuotaExceededError' })`), so a future revert to a bare string fails the suite.

## R-27 — FIXED (option (a): code **and** ledger)

- `engine/store/selectors.ts:70` counts (`let dropped = 0`), `:81` increments in the catch, `:93-95`
  dev-warns after the map — exactly the `generateExtractedScopes` treatment (count → warn), and the
  rows already computed are never discarded.
- `select-adjusted-scopes.test.ts` gained both directions: warns once with the count when one scope
  is non-canonical (asserting the canonical sibling still computes), and does **not** warn when all
  are canonical.
- Ledger: `docs/code-reviews/deferred.md` §15 strikes the `selectAdjustedScopes` half, records
  "RESOLVED (P0 fix round 2, R-27)", and re-scopes the remaining trigger to "next time `time.ts` is
  touched" for `roundTo5Min`. The fired trigger is acted on, not silently passed over.
- Honesty unchanged and still correct: `adjustedScopesPartial` (`selectors.ts:235`) continues to
  surface the drop in the document, so the operator gained a breadcrumb without the visitor losing one.

---

# Part 2 — New findings introduced by the round-2 fixes

## SILENT-FAILURES-1 [MINOR] app/demo/error.tsx:60

**Claim.** The R-24 escape hatch swallows its own failure with **no breadcrumb and no visitor
signal**: if the dynamic barrel import fails, the handler falls through to a plain `reset()` and the
button reports success by behaving exactly like "Try again" — while its label asserts "clears this
tab's demo session". The visitor concludes that clearing the session didn't help; in fact the session
was never cleared. This is the same unbound-`catch`-with-no-cause defect R-26 fixed one file over in
the same round, in its stronger form (there the warn existed and only lacked the cause; here there is
no log at all).

**Evidence.**

- `app/demo/error.tsx:56-64`:
  ```tsx
  const { clearDemoSnapshot } = await import('@/features/demo')
  clearDemoSnapshot()
  } catch {
    // chunk load failed — degrade to the Try-again behavior
  }
  reset()
  ```
  No binding, no `console.warn`, no state — nothing distinguishes "cleared" from "couldn't clear".
- The adversarial input is the **most common cause of this boundary firing at all**: a Next.js
  `ChunkLoadError` after a redeploy (stale chunk URLs). `features/demo/index.ts:5-6` exports
  `clearDemoSnapshot` from the same barrel as `DemoExperience`, so `import('@/features/demo')` pulls
  the whole demo module graph — i.e. the recovery control depends on loading precisely the chunk that
  just failed to load. Chunk unavailable → catch → `reset()` → the segment re-renders `/demo` →
  the same chunk fails → error page again. Loop, silent, in production and dev alike.
- Convention it diverges from: `ui/import/geocode.ts:43` — an **ungated** `console.warn(…, e)` added
  by review L2 for exactly this reason ("would otherwise fail identically … forever, with no
  signal"); `engine/store/persistence.ts:447` and `:494` do the same (dev-gated) for the storage paths.
  Round 2 added breadcrumbs to both storage paths and none to this one.
- Not covered by the new tests: `app/demo/__tests__/error.test.tsx` mocks the barrel, so the
  import-failure arm is never exercised.

**Suggested fix.** One line, matching `geocode.ts:43`:

```tsx
} catch (e) {
  console.warn('[demo] "Start fresh" could not load the session-clear module — the snapshot was NOT cleared; falling back to a plain reset', e)
}
```

Optional second half (cheap, and the honest one): set a local `useState` flag in the catch and render
a one-line note under the button ("Couldn't clear the session — close this tab to start fresh"), so
the visitor isn't told a wipe happened that didn't.

**Confidence.** High on the mechanism and the missing breadcrumb (both read at file:line); the
chunk-load trigger is a well-known Next.js failure mode rather than one I reproduced here — hence
MINOR, not MAJOR.

---

## SILENT-FAILURES-2 [MINOR] features/demo/engine/store/persistence.ts:409

**Claim.** R-19's fix enforces the selection-pair invariant in the three store **actions** and
asserts it in a comment — "No action leaves the pair pointing across cases" (`create-store.ts:216-218`)
— but the load path is not an action, and it is the one place the demo ingests state it did not
produce. `loadSnapshot` still validates `currentCaseId` and `currentLocationId` **independently**, so
an incoherent pair in storage survives rehydration intact. The completion CTA is now immune (it
derives from the location), but the **case-notes PDF is not**: it still takes the OCC number and unit
from `currentCase` while every other field comes from the current location. A restored incoherent pair
therefore produces a forensic-style document that attributes one case's number/unit to another case's
location — with no notice, no flag, and no log.

**Evidence.**

- `engine/store/persistence.ts:409-411` — the two ids are each checked only for membership in their
  own id set; nothing compares `locations.find(l => l.id === currentLocationId).caseId` to
  `currentCaseId`. The block's own header (`:404-406`) states its purpose as repairing state that
  "rehydrate[s] a wizard where updateField silently no-ops" — the same class, one field wider.
- `engine/store/selectors.ts:211-224` — `selectCaseNotesData` reads `occNumber: caseObj?.caseNumber`
  (`:220`) and `requesterUnit: caseObj?.unit` (`:224`) from `selectCurrentCase`, and everything else
  (`address`, requester contact, scopes, DVR, cameras, export, notes) from `selectCurrentLocation`.
  `DemoExperience.tsx:713` does the same for the Completion summary header.
- Reachability (why MINOR, not MAJOR): the live store can no longer produce the pair — I enumerated
  the writers (`create-store.ts:156-157, 219, 259-260, 268`). It takes untrusted input: a hand-edited
  `sessionStorage` value, or a snapshot written under the **unchanged** key `dvr-demo-state-v2` by the
  round-1 head (round 2 fixed the actions without bumping `SNAPSHOT_VERSION`, correctly — the shape
  didn't change). The repo already treats this boundary as adversarial: the whole R-15 pass, and its
  throwing-storage / dangling-id tests, exist for exactly that reason.

**Suggested fix.** Two lines in the same block, so the invariant is re-asserted where untrusted state
enters — the location wins, mirroring the bridge's own new rule:

```ts
const openLoc = currentLocationId !== null ? d.locations.find((l) => l.id === currentLocationId) : undefined
const coherentCaseId = openLoc ? openLoc.caseId : currentCaseId
```

…and return `coherentCaseId`. Pin it with one `persistence.test.ts` case (snapshot with
`currentCaseId: B` + `currentLocationId: L1@A` → loads as `A`/`L1`).

**Confidence.** High on the mechanism and the PDF misattribution (all at file:line); the trigger is
untrusted/stale storage rather than an ordinary interaction — hence MINOR.

---

## SILENT-FAILURES-3 [MINOR] features/demo/engine/store/create-store.ts:219

**Claim.** `createCase`'s new `currentLocationId: null` widens the in-session reach of the state the
codebase itself calls "a dead form": with no location open, 10 of the 11 wizard screens still render a
fully-interactive form whose every keystroke is silently discarded (`updateField` returns early), and
the marquee "Calculate Offset" no-ops the same way. Only the Completion screen announces the
precondition (a disabled button with the "Open a location first" hint). `loadSnapshot` repairs exactly
this state at boot — routing a wizard view with no location to `'cases'` "instead of a dead form"
(`persistence.ts:404-406`) — but nothing performs the equivalent repair in-session, so the fix creates
at runtime the state the sibling fix removes at load.

**Honest framing:** the dead-form state is **pre-existing** (a fresh boot has no location and every
rail row is an unconditional jump button), so this is a widening, not a new defect class — which is
why I file it MINOR and did not elevate it. What the fix changes is that the state is now entered from
*inside* a working session.

**Evidence.**

- `engine/store/create-store.ts:219` — `createCase` clears the location half; `:277-279` —
  `updateField` returns early when `currentLocationId` is null (same guard at `:298`, `:323`, `:400`,
  `:441`, `:454` for `calculateOffset`, `generateExtractedScopes`, `generateNotes`, …).
- `ui/DemoExperience.tsx:579-594` (Submission) and every sibling wizard case in `activeScreen()`
  fall back to `currentLocation?.… ?? ''` and wire `onChange` straight to `updateField` — controlled
  inputs whose value never changes, so a typed character never appears. There is no
  `currentLocation === null` arm anywhere in the switch.
- Entry path (3 taps from a working wizard): Rail → "Cases" → **New Case** (`ui/controls/
  ExploreChecklist.tsx:71` `onClick={() => onJump(it.jumpTo)}`, `engine/content/explore.ts:42`
  gives every wizard screen its own unconditional row, `DemoExperience.tsx:875` `setView`) → Rail →
  "Time Offset". Result: blank screen, DVR/actual fields accept text (they write to `capture`, which
  is not location-scoped), "Calculate Offset" does nothing, console silent.
- Pre-fix the same sequence kept the previous location live (wrong case number in the header, but the
  form worked). The trade is deliberate and correct — the residual is that the new state is
  unannounced on 10 of 11 screens.

**Suggested fix.** Cheapest that matches the existing decision: in `activeScreen()`, when `view` is a
wizard screen and `currentLocation === null`, render the existing `placeholder(view)` shape with
"No location open — open one from Cases" (or make the rail's wizard rows jump to `'cases'` in that
state). Either reuses the judgement `loadSnapshot` already encodes; no new machinery.

**Confidence.** High on the mechanism (guards, controlled inputs, unconditional rail rows all read at
file:line). Severity deliberately held at MINOR because the state predates the fix.

---

## SILENT-FAILURES-4 [MINOR] features/demo/engine/store/persistence.ts:466

**Claim.** `persistDemoStore`'s docstring still tells the next maintainer that write failures are
**swallowed** — the exact statement R-14 (round 1) and R-26 (round 2) falsified, twenty lines below
it, in code both rounds edited. A maintainer reading the contract would conclude there is no
diagnostic to look for, and would see nothing wrong in deleting the warn as noise (the lane's
"breadcrumb removal" pattern, enabled by its own docs).

**Evidence.**

- `engine/store/persistence.ts:466-467` — "Write failures (quota, security) are swallowed —
  persistence must never surface in the demo."
- `:486-500` — the failure arm now dev-warns **with the cause** and clears the stale snapshot, i.e.
  neither silent nor inert.
- Both fix rounds updated the inline comment inside `save()` and left the function docstring untouched.

**Suggested fix.** One sentence: "Write failures (quota, security) never surface to the visitor, but
they are not silent: a dev-gated `console.warn` carries the cause and the stale snapshot is cleared so
a refresh boots honestly empty (R-14/R-26)."

**Confidence.** High — read directly; documentation-only, hence the lowest-value item here.

---

## Verified-and-cleared (checked this round, not findings)

- **No breadcrumb was removed anywhere in round 2; three were added or enriched** —
  `selectors.ts:94` (new), `persistence.ts:447` (new, `clearSnapshot`), `persistence.ts:494`
  (enriched with the cause).
- **The classic failure surfaces are untouched by round 2** — the diff never reaches
  `ui/import/*` (pdf.js, `extract-client`, `run-import`, `geocode`), `app/api/extract/route.ts`,
  `MapCanvas`/`AddressAutocomplete`, or `OcrCaptureScreen`. `FallbackMode`, the `never`-guarded
  `fallbackNotice` switch (`DemoExperience.tsx:369-384`), the per-card `fallbackMode` attribution
  (`:427`) and the `fieldCount === 0` blank-record rejection are byte-identical.
- **Import generation tokens (H1/H2)** — all six checkpoints intact (`DemoExperience.tsx:398, 415,
  460, 463, 467, 485, 489`). Round 2 added no store write after an `await`; the one new `await` (the
  error page's dynamic import) writes no store state.
- **`addLocation` now also setting `currentCaseId`** — checked the import pipeline for a stale-write
  hazard: `processPdfFiles`/`runPasteImport` capture `caseId` and `caseNumber` **once** before the
  loop (`:450, 455` / `:472, 481`), so a mid-batch selection move can't retarget later files. The
  change strictly improves the import path (previously importing into a non-current case left the
  pair incoherent).
- **`reviewAgainFor` (R-21)** — keyed by location id; `isComplete` (`:728`) uses
  `reviewAgainFor !== currentLocation?.id`, which is `false`-safe when no location is open
  (the `completed ?? false` half already gates it). `onReviewAgain` (`:747`) can only fire from the
  confirmation, which requires a location. No stale-suppression path remains; both directions are
  pinned by new sandbox tests.
- **`selectAdjustedScopes`' new warn fires during render** (`DemoExperience.tsx:642` calls it inside
  `activeScreen()`), so a non-canonical scope logs once per render in dev. Considered and dropped:
  it is `NODE_ENV`-gated, it is precisely the treatment the review mandated, and log volume is not a
  silent failure. Worth knowing if the Time-Offset screen ever gets a render-loop diagnosis.
- **`clearSnapshot` ignoring `PERSISTENCE_ENABLED`** — deliberate and correct: clearing when
  persistence is kill-switched is harmless, and gating it would make the escape hatch a no-op in
  precisely the configuration where a stale key is most confusing.
- **`create-store.ts:3`'s new value import of `COORD_SOURCES`/`GPS_SOURCES` (R-29)** — checked for a
  runtime import cycle now that the import is no longer type-only: `engine/types/index.ts` has **zero**
  imports (pure declarations), so no cycle and no TDZ hazard.
- **`optionValues` deletion (R-20)** — grepped the tree: no production or test reference survives
  (`form-options.test.ts:17` inlines a local `valuesOf`), and `barrel.test.ts:14` now pins both
  `FORM_OPTIONS` and `optionValues` as absent from the engine barrel. Nothing was orphaned into a
  dangling import.
- **`FullShapeIn` (R-28)** — type-level only; `persistedStateSchema`'s runtime shape is unchanged, so
  no validation was loosened. (Type-design's lane owns the guarantee itself.)
- **Snapshot version not bumped in round 2** — correct: no `PersistedState` shape change. The one
  consequence (a round-1-written incoherent pair rehydrating under the same key) is folded into SF-2
  rather than filed separately.
- **Tracked items §18 / §28** — triggers still **not** fired: `onFilesPicked` / `runPasteImport`
  (`DemoExperience.tsx:443-491`) were not modified and no awaited call gained the ability to throw;
  the rail-narration manifest is unchanged. (`app/demo/error.tsx:56`'s new async handler is a §18-shaped
  pattern, but its only un-`try`'d call is `reset()`; the substantive gap there is SF-1.)
- **§15's remaining half (`roundTo5Min`)** — trigger correctly re-scoped to `time.ts`, which round 2
  did not touch. Nothing to act on now.

---

## Silent Failure Hunter Summary — fix-delta round 2

| Severity | Count |
|---|---|
| BLOCKER (CRITICAL) | 0 |
| MAJOR (HIGH) | 0 |
| MINOR (MEDIUM/LOW) | 4 |

Prior lane-attributed findings: **4/4 FIXED** (R-19 MAJOR + R-24, R-26, R-27 MINOR) — no PARTIAL, no
UNFIXED. R-20 (over-ruled against my prior cleared-list) is also fixed, by deletion.

- Fallback honesty (every substitution announced): **yes** — the completion surface is now truthful
  per-location *and* per-case; no fallback path was touched.
- Failure-cause distinctions preserved: **yes** — R-26 closed the storage-write collapse; one new
  swallow added with no cause at all (SF-1).
- Partial results flagged (not silently short): **yes** — `adjustedScopesPartial` intact, and
  `selectAdjustedScopes` now counts + dev-warns like its sibling (R-27).
- Async cancellation / stale-write safety: **yes** — generation tokens intact, no new post-`await`
  store write.
- Operator breadcrumbs intact: **yes — none removed, three added/enriched**; one new path (SF-1) ships
  without one.

**Verdict: APPROVE with comments.** Nothing in round 2 gates the merge from this lane. SF-1 is the
one I'd take before merge (a one-line `console.warn` on the escape hatch's own failure); SF-2 and SF-3
are cheap hardening of R-19's new invariant at the two places it isn't asserted; SF-4 is a docstring.
