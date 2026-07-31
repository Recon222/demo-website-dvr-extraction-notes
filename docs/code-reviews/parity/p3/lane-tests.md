# Parity P3 — TESTS lane

**PR:** #32 — *Parity P3 — case & location management (CRUD, actions sheet, edit mode, GPS everywhere)*
**Head reviewed:** `4e60680` (`feat/parity-p3`), diff `git diff master...feat/parity-p3`
**Lane:** `.claude/agents/test-analyzer.md` · **Mode:** initial (resumable — I verify my own findings at the fix-delta)
**Refs read in full:** `features/demo/CLAUDE.md`, `docs/code-reviews/deferred.md` §45i, §48–§56, PR #32 body,
prior lane files `parity/p0/lane-tests.md`, `parity/p1/lane-tests.md`, `parity/p2/lane-tests.md`.

## Pre-flight

| Gate | Result |
|---|---|
| `pnpm test` (full, `--silent`) | **189 files / 1891 tests passed**, 0 failed, 85 s wall |
| Suite additions vs master | 50 test files touched, **+6 207 / −51 lines**; ~204 net new tests |
| `.only` / `.skip` / `.todo` / `toMatchSnapshot` | none anywhere in the repo |
| Real-clock / entropy in new tests | one `new Date().toISOString()` (`gps.test.ts:230`), used only as a loose upper bound against a pinned 2001 timestamp — deliberate and safe |
| Known load-flake class / R-33 `testTimeout` geometry | not re-flagged (phase context) |

**Method note.** Nine mutation probes were run against production code in the worktree, each reverted
immediately (`git status` verified clean after every one). Where a finding says *probe-verified*, the
mutation and the exact surviving test counts are quoted. Where it says *reasoned*, I say so.

---

## What is genuinely strong (so the findings below are read in proportion)

This is the best-pinned phase package so far. Verified, not asserted:

- **Selection repair pins the R-19 law arm-by-arm.** `crud-actions.test.ts:151-260` enumerates every way
  `deleteCase`/`deleteLocation` can strand the pair — open location under the doomed case, open location
  under a *sibling* case, case-only selection deleted, unrelated case-only selection, unknown id — plus
  the §48j capture-blank. Probe: removing `capture: blankCapture()` from `deleteLocation`
  (`create-store.ts:567-569`) turns **2 tests red**; removing `setCaseForm(blankCaseForm)` from
  `closeCaseModal` (`DemoExperience.tsx:641`) turns **1 red**. Both are real pins, not decoration.
- **The §50e end-to-end edit arm is the real thing.** `DemoExperience.case-actions.test.tsx:134-166`
  drives the composition through the live bridge and the real store: long-press → sheet → *Edit Case* →
  seeded form read off the DOM (`Case Number` value + `readonly`, `Display Name`, `OIC Name`) → change a
  field → *Save Changes* → assert the patch, `caseNumber` unchanged, `oicName` survived the **total**
  payload, `status` unmoved, `cases.length === 1` (the "edit must not fall through to create" arm), modal
  closed. It is followed by the two arms §50e/§56j actually owed — re-targeting (`:168`) and create-mode
  restoration after Cancel (`:184`). Nothing here is mocked over. **Judgement: this test earns its claim.**
  Its one soft spot is that the field it mutates (`displayName`) is also the field the mapper test already
  covers; the interesting total-payload risk is a field the form renders but the *mapper* could drop
  (`incidentCoordinates`), and that is covered only at the pure level (`caseFormData.test.ts:76-92`).
  Not a finding — the mapper round-trip is genuinely exhaustive (`toEqual` on the whole payload) — but
  worth one line in a future arm.
- **§56k's dropped-not-ported dedupe is complete.** I recovered P3.5's four `NewLocationModal` gate arms
  from `ebe42cc^2` and diffed them against the surviving suite. All four behaviours — blank-name block,
  case-insensitive/trimmed duplicate block, `requireAddress` gate + subtitle, plain-caller-ungated — are
  covered by `new-location-validation.test.tsx` (17 arms) at equal or greater strength, and P3.5's
  `isLocationNameTaken` describe is a strict subset of `location-name.test.ts:21-62`. The only assertion
  that did *not* carry over is `toBeDisabled()` on the submit, which is the §56d reconciliation
  (`aria-disabled`, click reaches the caller) — a deliberate semantic change, not a lost pin.
  **Nothing behaviourally unique was lost.**
- **The two branches' R-21 disambiguations were genuinely the same fix.** `76dd173` (P3.1) and `fa2f289`
  (P3.5) both anchored `getByRole('button', { name: /^Test Location/ })`; only the comment needed merging.
  §56k is accurate.
- **Mutation-verified spot-checks the brief asked for** — see M1 (camgps row-resurrection: **claim does
  not hold**) and the locgps abandoned-draft pair (**both hold**, probe-verified red at
  `new-location-gps.test.tsx:269` for the draft-identity half and at
  `DemoExperience.coordinates.test.tsx` "a capture abandoned by closing the modal…" for the abort half).
- **Async hygiene is house-standard throughout**: newest-wins (`EditIncidentLocationModal.test.tsx:186`,
  `IncidentLocationFields.test.tsx` "supersedes a reverse-geocode still in flight"), unmount-mid-flight
  (four suites), re-entry mutex (`cameras-gps.test.tsx:270`), and a genuine negative control on the
  R-36 memo probe (`NotesScreen.memo.test.tsx:109`).
- **Mocks sit on the true IO edge only** — `mapbox-gl` (constructable, non-arrow), `@mapbox/search-js-core`,
  `AddressAutocomplete`, `section-meta` (pass-through instrumentation, not a stub). The store is never
  mocked; `createDemoStore` is injected everywhere. `navigator.geolocation` is installed per-test and
  `Reflect.deleteProperty`-ed in `afterEach`, which respects the `vitest.setup.ts` contract rather than
  fighting it. No setup-shim traps found.

---

# Findings

## [HIGH] TESTS-P3-1 — the copy-to-a-new-address card's captured coordinates never reach the store, and nothing notices

**Production code:** `features/demo/ui/DemoExperience.tsx:774` — `submitNewAddressLocation`, the
`gps: locForm.coordinates` pass-through into `duplicateToNewAddress`.
**Tests covering it:** **none**.

**Probe (full suite):** replace `gps: locForm.coordinates` with `gps: undefined` →
`pnpm test` reports **189 files / 1891 tests passed**. Every coordinate a visitor captures or picks on
the New-Location-w/-Sub-Info card can be silently dropped on the floor and the suite stays green.

**Uncovered case.** Open a location's ⋯ tray → *Duplicate…* → *New Location w/ Sub Info* → press
**Use Current Location** (a real multi-sample capture — the card mounts the same `NewLocationModal`,
`DemoExperience.tsx:1650-1665`, with no `onCaptureGps` override) → enter a street → **Create Location**.
Expected: the new location carries `{lat, lng, accuracyM, source: 'gps'}`. A one-token regression here
yields a location with no coordinates, no error, and a "Location Created" success notice. The same hole
swallows an **address-pick** fix (`source: 'geocoded'`) on that card.

**Why it matters.** This is the exact seam §52.4 flagged and §56h fixed *two* type-level bugs in — a
hard-coded `source: 'geocoded'` stamp and a `gps`-excluding override type — both of which had been
invisible precisely because the no-op made the path unreachable. §56h closes the entry with "the only
unpinned link left is the bridge's one-line `gps: locForm.coordinates` pass-through, which is the same
expression `submitLocation` uses and which IS pinned there." That is an argument from *similarity to a
different call site*, and it is the same shape of reasoning that let the two bugs live. The three arms
§56h added pin the modal's **emission** (`new-location-gps.test.tsx:332`) and the store's **storage**
(`duplicate-location.test.ts:186`); the wire between them — the only place a real fix can now be lost —
is the one link with no arm. The payload is a forensic coordinate on a court-facing record.

**Fix.** One arm in `DemoExperience.duplicate.test.tsx`'s "New Location w/ Sub Info" describe, modelled on
the existing `DemoExperience.coordinates.test.tsx` "creates the location with the captured fix stamped
`gps`" (it already has `withGeolocation` + `fixAt` helpers to copy): open the chooser → *New Location w/
Sub Info* → capture → fill the street → Create → assert
`store.getState().locations[1].gps` equals `{ lat, lng, accuracyM, source: 'gps' }`. That single arm
closes §56h's self-declared residual and turns the probe above red.

---

## [HIGH] TESTS-P3-2 — §56f's "ONE `useLongPress`" is untested at the one place two implementations disagree, and a third copy still exists

**Production code:**
- `features/demo/ui/primitives/useLongPress.ts:114-120` — merged hook's `onContextMenu`: `preventDefault`,
  `clear()`, then **unconditionally** `cb.current()`.
- `features/demo/ui/screens/DashboardScreen.tsx:44-83` — a **third, file-private `useLongPress`** that
  §56f's reconciliation did not touch (§56f names only P3.1's and P3.5's). It carries a `firedRef` latch
  (`:48`, `:63`, `:66`, `:76-79`) whose own comment states the reason: *"A touch hold fires our timer at
  500ms AND raises the OS `contextmenu` a moment later. Without this latch that one gesture would open the
  sheet twice."*

**Tests covering it:**
- `DashboardScreen.test.tsx:147` — *"a touch hold that also raises contextmenu opens the sheet ONCE"* pins
  the latch, **and** that a later genuine right-click still works.
- `useLongPress.test.tsx:138` — *"opens on the context menu instead of showing the browser one"* fires
  `contextMenu` with **no prior hold**, so the sequence is never exercised.

**Probe (full suite):** add the dashboard's latch to the shared hook (`if (swallowNextClick.current)
{ swallowNextClick.current = false; return }` before `cb.current()` in `onContextMenu`) →
**189 files / 1891 tests passed**. The sequence is unpinned in *both* directions: no test asserts the
double-fire and no test asserts its suppression.

**Uncovered case + the bug that slips through.** On a touch device, a 500 ms hold on a Cases **location
row** fires the timer (tray toggles **open**) and the platform then raises `contextmenu` on the same
element, which the shared hook forwards as a second `cb.current()` — and the row callback is
`toggleTray(rowKey)`, a **toggle** (pinned as such by `CasesScreen.row-actions.test.tsx:177`, "a second
hold on the same row closes it again"). Net effect on touch: the hold appears to do nothing. That is the
phone's primary ported gesture (§48a, §52.1) on the surface that carries **Delete** and **Duplicate…**.

**Why it matters to this lane specifically.** The suite currently pins **two different contracts for one
gesture** — suppressed on the dashboard card, unsuppressed on every consumer of the shared primitive —
and the ~204 new tests cannot tell you which is intended, because neither side has an arm on the other's
behaviour. `useLongPress.test.tsx`'s header claims the merged hook covers "what matters behaviourally";
this is the one platform sequence it does not reach.

**Fix.** Two arms in `useLongPress.test.tsx`, whichever way the web/TS lanes adjudicate the production
question (the divergence itself is theirs to resolve — I am reporting that the test surface hides it):
1. `hold → advanceTimersByTime(LONG_PRESS_MS) → fireEvent.contextMenu(row)` and assert the intended call
   count (`1` if the latch is ported, `2` if the current shared behaviour is deliberate).
2. a follow-up `fireEvent.contextMenu(row)` asserting a genuine right-click is still honoured — the
   dashboard's second assertion, which is what stops a latch from over-swallowing.
   Plus one arm at the real call site in `CasesScreen.row-actions.test.tsx` asserting the tray is **open**
   (not toggled shut) after `pointerDown → 500 ms → contextMenu`.

---

## [MEDIUM] TESTS-P3-3 — `setCameraGps`'s row-existence / cross-location guard has no behavioural pin at any level

**Production code:** `features/demo/engine/store/create-store.ts:691` —
`if (!loc || !loc.form.cameras.some((c) => c.id === cameraId)) return`.
**Tests naming it:** `camera-gps.test.ts:71` *"drops the write when the camera was removed mid-capture —
and does NOT resurrect it"* and `:83` *"does not write a fix into ANOTHER location that happens to be
open"*.

**Probe:** delete the second clause (leave `if (!loc) return`) → `pnpm test camera-gps cameras-gps` reports
**3 files / 31 tests passed**, i.e. `camera-gps.test.ts`, `cameras-gps.test.tsx` **and**
`DemoExperience.camera-gps.test.tsx` all stay green.

**Why both named tests pass either way.** The write is a `.map` over the open location's cameras, not an
upsert: with the guard gone, a `cameraId` that is absent simply matches nothing, so `cameras.map(id)` is
unchanged and `cameras[0].gps` stays `undefined`. Both assertions are satisfied by the shape of the
writer, not by the guard. The cross-location arm is the same story — `c1` is not in location B's list,
so the `.map` is a no-match regardless.

**What the guard actually buys, and why it is worth pinning.** Its only observable effect is the **no-op /
state-identity discipline** — without it, `set` runs, `cases`… sorry, `locations` is reallocated, zustand
produces a fresh state object, every selector re-runs and the persistence subscriber writes a snapshot,
for a capture that landed nowhere. That is *precisely* the defect §56b found and fixed in `setCaseStatus`
("returning `{}` from the updater is not a no-op to zustand… P3.2's test only pinned `cases` by reference,
so it passed either way"), and the house answer to it — a whole-state `expect(store.getState()).toBe(before)`
— now appears five times in `crud-actions.test.ts` (`:77`, `:131`, `:135`, `:206`, `:258`) and once in
`store.test.ts:306`. `camera-gps.test.ts` is the **one** new store suite with no identity arm at all.

**Secondary observation (reasoned, from the abort probe).** The UI abort and this store guard are
*mutually redundant*: with `isAborted: () => false` forced in `useGpsCapture.ts:93`,
`DemoExperience.camera-gps.test.tsx`'s *"writes nothing when the CAPTURING row is removed mid-capture"*
still passes — the store guard catches it. With the store guard removed, the abort catches it. Neither
defence is independently pinned; the test passes as long as **at least one** survives.

**Fix.** Add to `camera-gps.test.ts`'s `setCameraGps` describe:
```
it('a write addressed to a removed camera performs no write at all', () => {
  … remove c2 …
  const before = store.getState()
  store.getState().setCameraGps('c2', fix())
  expect(store.getState()).toBe(before)     // §56b's discipline, at P3.7's call site
})
```
and the same shape for the cross-location arm (`setCameraGps('c1', …)` while B is open). Both turn the
probe above red and pin the two guards independently of the UI abort.

---

## [MEDIUM] TESTS-P3-4 — `updateIncidentLocation` has no unknown-id guard, and the test titled "no-ops" does not test that

**Production code:** `features/demo/engine/store/create-store.ts:506-509` —
```ts
updateIncidentLocation: (caseId, patch) =>
  set((s) => ({ cases: s.cases.map((c) => (c.id === caseId ? { ...c, ...patch } : c)) })),
```
No `get()`-first early return. For an unknown `caseId` this still allocates a new `cases` array and a
fresh state object → every selector re-runs and the persistence subscriber writes a snapshot.

**Test:** `features/demo/engine/logic/__tests__/incident-location.test.ts:144` — *"touches only the named
case, **and no-ops on an unknown id**"*. Its only relevant assertion is
`expect(store.getState().cases.some((x) => x.incidentBusinessName === 'ghost')).toBe(false)` — a
*value*-level claim that the `.map` satisfies unconditionally. Nothing in the file asserts state or
`cases` identity for the unknown-id path, so the title states a contract the code does not have.

**Why it matters.** Every sibling action P3 added carries both halves — `updateCase`
(`create-store.ts:456` + `crud-actions.test.ts:73`), `setCaseStatus` (`:502-503` + `store.test.ts:299-306`,
the arm §56b added *because* the weaker assertion had hidden the bug), `deleteCase` (`:530` +
`crud-actions.test.ts:202`), `deleteLocation` (`:558-559` + `:254`). `updateIncidentLocation` is the one
that missed the pattern, and the test that would have caught it reads as though it covers it.
Real-world reachability is low (the caller, `DemoExperience.tsx:825`, guards on `incidentCaseId`, and no
delete affordance is reachable from the Map screen while the editor is open) — hence MEDIUM, not higher.

**Fix.** Give the action P3.1's `if (!get().cases.some(c => c.id === caseId)) return`, and strengthen
`incident-location.test.ts:144` to `const before = store.getState(); … expect(store.getState()).toBe(before)`.
If the owner prefers to leave the action as-is, rename the test — a title that claims a no-op the code
does not perform is worse than no title.

---

## [MEDIUM] TESTS-P3-5 — the `hasCapturedCoordinates` policy is pinned on two of its three consumers; the map projection has no arm in either direction

**Production code:** `features/demo/ui/screens/map/mapData.ts:78-81` and `:113-115` — `toMapData` gates the
incident pin on plain truthiness (`const incident = ic ? {…} : null`) and the location pins on
`locations.filter((l) => l.gps)`. Neither calls `hasCapturedCoordinates`.
**Where the policy IS enforced and pinned:** `screenData.ts:181` (Case Actions Sheet) —
`CaseActionsSheet.test.tsx` *"never renders a (0,0) incident position as a captured coordinate (BUG-008
parity)"* and `screenData.test.ts` *"marks the coordinate row monospace and gates it on a captured
position"*; and `pdf/case-notes.ts:215` — `case-notes.test.ts` *"refuses the null-island (0,0) pair"*.
**Tests covering the map arm:** none — `grep` for `lat: 0` / `0, 0` across
`features/demo/ui/screens/map/__tests__/` returns nothing.

**Uncovered case.** Map → select a case → incident card → **Edit Incident Location** (the editor **P3.6
added**) → type `0` / `0` → Save. `parseCoordinate` accepts `(0,0)` (a valid pair, correctly — that is
the documented split at `coordinates.ts:41-46`), so the case stores it, the **map plots a pin in the Gulf
of Guinea**, and the very same case's Actions Sheet and Case Notes PDF both suppress it. One artefact,
three consumers, two behaviours, zero tests on the divergent one.

**Why this is filed rather than deferred to §49g.** §49g logged the audit with an explicit trigger —
*"P3.7 (per-camera GPS) or P6.1 (map depth), whichever touches plotting first"*. **P3.7 fired it**: §54d
records the deliberate scope extension that moved the policy into `engine/logic/coordinates.ts` and wired
it into a second plotting consumer (the PDF camera table), and P3.6 added a second hand-entry path to
incident coordinates. The phase both fired the trigger and widened the input surface without adding the
arm. §49g's own risk argument ("demo coordinates only ever arrive via `parseCoordinate`, a geocode, or a
real GPS fix, so the phone's zero-init artifact has no source") no longer holds for the hand-entry path —
`parseCoordinate` is exactly what lets `(0,0)` in.

**Fix.** One arm in `features/demo/ui/screens/map/__tests__/` (or in `mapData`'s own suite): a case with
`incidentCoordinates: { lat: 0, lng: 0, source: 'manual' }` produces `incident === null` and no
incident `SheetItem` — matching the sheet and the PDF. Same shape for a location `gps` of `(0,0)`.
If the owner decides the map should plot it deliberately, the arm should say **that**, so the three
consumers stop silently disagreeing.

---

## [MEDIUM] TESTS-P3-6 — seven suites now hand-roll a full `DemoCase`; no canonical entity factory exists

**Fixture sites** (five added or edited by this diff):
`ui/screens/__tests__/caseFormData.test.ts:17`, `engine/logic/__tests__/incident-location.test.ts:10`,
`ui/screens/__tests__/CaseActionsSheet.test.tsx:8`, `ui/screens/__tests__/EditIncidentLocationModal.test.tsx:15`,
`ui/screens/__tests__/NewCaseModal.gate.test.tsx:223`, `ui/screens/__tests__/screenData.test.ts:7`,
`engine/logic/__tests__/final-submission.test.ts:29`.
**Factories that exist:** `engine/store/__tests__/test-utils.ts` — `freshStore`, `storeWithLocation`,
`newCaseInput`, `newLocationInput`. All four are **input** shapes; there is no `DemoCase` / `DemoLocation`
**entity** factory anywhere in the repo (`ui/__tests__/test-utils.tsx` covers narration/rail only).

**Why it matters now rather than earlier.** P3 is the phase that made `DemoCase` a widely-fixtured entity:
before it, two suites built one; now seven do, each repeating all fifteen fields. `DemoCase.incidentCoordinates`
is **optional** (`engine/types/index.ts:323`), and the entity's growth direction is optional fields — which
means `tsc --noEmit`, the safety net the ledger leans on, will **not** flag a stale fixture. The next
optional field is a silent seven-file edit, and a suite that keeps the old shape keeps passing while
testing a case shape the app no longer produces. This is the phone repo's documented `createMockCase`
drift (root `CLAUDE.md`, "Adding a Field to the Case Entity", step 4 / BUG-007) arriving here.

**Fix.** Add `demoCase(over?: Partial<DemoCase>): DemoCase` and `demoLocation(over?)` to
`engine/store/__tests__/test-utils.ts` (or a new `engine/__tests__/entities.ts` importable from `ui/`
suites), then fold the seven sites into it as each is next touched. Not urgent enough to gate the merge —
but it should be logged so the next field-add is a one-file change.

---

## [LOW] TESTS-P3-7 — `deleteCase`'s R-19 *derivation* is not distinguished from its fallback

**Production code:** `create-store.ts:538-542` —
`currentCaseId: openLocation ? openLocation.caseId : s.currentCaseId === caseId ? null : s.currentCaseId`.
**Test:** `crud-actions.test.ts:172-181`, *"leaves an open location in ANOTHER case alone, and **re-derives
its case**"*, `expect(s.currentCaseId).toBe(b) // R-19: derived from the surviving open location`.

**Probe:** neutralise the derivation branch (`openLocation ? …` → `false ? …`) →
`pnpm test crud-actions DemoExperience.crud store.test persistence` reports **5 files / 116 tests passed**.
The arm cannot distinguish "derived from the open location" from "kept the previous value", because in
every reachable setup those are the same value.

**Why LOW and not higher.** The distinguishing state — an open location whose `caseId` differs from
`currentCaseId` — is genuinely unconstructible today: no action writes a crossing pair (the R-19 comment
at `:446-448` is accurate and I re-grepped every write), and `loadSnapshot` now derives the case from the
open location too (`persistence.ts:457-466`, closing the old TYPE-DESIGN-F gap). So the derivation is
defence-in-depth against a *future* writer, and defence-in-depth is legitimately hard to pin. The finding
is the comment: it asserts a mechanism the assertion does not reach. Either drop the "R-19: derived from"
claim to "unchanged — its location lives", or construct the crossing pair directly via
`createDemoStore({ …, currentCaseId: a, currentLocationId: b1 })` and assert the repair.

---

## [LOW] TESTS-P3-8 — two assertions that cannot fail, and one unreset module-level harness

1. **`new-location-gps.test.tsx:292`** — `expect(screen.queryByTestId('reverse-geocode-notice')).not.toBeInTheDocument()`
   ("nor a stale notice attributed to the draft now on screen"). `LocationFields`' own
   `useEffect(… , [locationId])` (`LocationFields.tsx:148-151`) resets `lookupNotice` to `'none'` on every
   draft change, so this assertion holds whatever `canWriteFor` does. The load-bearing assertion in the
   same test (`:290`, `expect(onChange).not.toHaveBeenCalled()`) **is** probe-verified red — weakening
   `canWriteFor` to `mounted.current` alone turns exactly that one test red (1 failed / 22 passed). Only
   the trailing line is decorative.
2. **`case-notes.test.ts:696`** — `expect(html).not.toContain('±')` over the whole document. It is a
   negative assertion so it cannot *false-pass*, but it will false-*fail* the moment any other section
   prints a `±`. Scope it to the camera row.
3. **`new-location-gps.test.tsx:8`** — `pickHarness` is module-level mutable state with no `beforeEach`
   reset. Both current consumers null it by hand (`:257`, `:300`); a third that forgets inherits the
   previous test's `onPick` closure and becomes order-dependent. One `beforeEach(() => { pickHarness.release = null })`
   removes the trap.

---

## Explicitly checked and NOT filed

- **Dropped-not-ported dedupe (§56k)** — verified complete against `ebe42cc^2`, nothing unique lost. Not re-litigated.
- **The R-21 disambiguation** — both branches shipped `/^Test Location/`; §56k accurate.
- **`updateCase` covered by two suites** (`crud-actions.test.ts` + `update-case.test.ts`) — redundancy from
  the §56c reconciliation, not drift; the two pin different properties (payload totality vs. selection/sibling isolation).
- **`@ts-expect-error` type probes** (`crud-actions.test.ts:80-97`) — a compile-time pin read by `tsc`,
  correctly commented as such, with a valid-base spread so only the extra key can be objected to. Sound.
- **`aria-disabled` vs `disabled` divergence** between `DuplicateLocationModal` (hard `disabled`,
  `DemoExperience.duplicate.test.tsx:159`) and `NewLocationModal` (`aria-disabled`, `:229`) — both pin
  real behaviour; the production consistency question belongs to the web/type-design lanes.
- **§49d's `caseStatusTheme('draft') === 'Draft'` vs the sheet's `'Active'`** — deferred with an explicit
  trigger; the sheet label is pinned (`screenData.test.ts`, `case-actions.test.ts`), the card label is
  deliberate. Not re-flagged.
- **Structural source-reading guards, coverage percentages for `ui/**`, missing E2E, `data-testid` style,
  the load-flake class, the R-33 `testTimeout` geometry** — out of scope per the lane brief / phase context.

---

## Test Analyzer Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 2 |
| MEDIUM | 4 |
| LOW | 2 |

Behaviorally meaningful coverage: **strong** (the ~204 new tests are overwhelmingly real pins; the gaps
are two specific wires and one guard, not a thin surface)
Engine coverage gate (80% on `lib/**` + `engine/**`): **met** — every new engine module
(`case-actions`, `case-number`, `location-name`, `new-location-gate`, `incident-location`, `coordinates`,
`assert-never`) ships its own suite; no engine-shaped logic was parked in `ui/` to dodge the gate
(`caseFormData.ts` and `screenData.ts` are genuine view-model mappers and are directly unit-tested anyway)
Mock strategy: **at the IO edge** — store never mocked, engine never mocked, `navigator.geolocation`
installed/removed per test in line with the `vitest.setup.ts` contract
Factory usage: **mixed** — canonical for store inputs, inline for the `DemoCase` entity across seven suites (TESTS-P3-6)
Setup-shim traps: **none** — no test claims a live browser path it does not install
Determinism (clock/entropy injected): **yes** — fake timers scoped and restored, GPS timestamps injected,
no `Math.random`, the one real-clock read is a safe upper bound

**Verdict: REVISE**

Two HIGH findings, both closable with small, well-shaped additions: one arm for the new-address GPS wire
(TESTS-P3-1) and two-to-three arms for the long-press context-menu sequence (TESTS-P3-2, whose production
half the web/TS lanes should adjudicate first). The four MEDIUMs are one-arm or one-guard fixes;
TESTS-P3-6 is a legitimate `deferred.md` entry rather than a merge gate.

### Fix-delta verification plan (this lane resumes)

| Finding | How I will verify |
|---|---|
| TESTS-P3-1 | re-run the `gps: undefined` mutation on the full suite; the new arm must go red |
| TESTS-P3-2 | re-run the latch mutation; whichever contract is chosen, the new arms must go red against the opposite behaviour, and the `CasesScreen` call-site arm must go red against the toggle |
| TESTS-P3-3 | re-run `if (!loc) return`; `camera-gps.test.ts` must go red |
| TESTS-P3-4 | assert the early return exists **and** the strengthened test goes red without it |
| TESTS-P3-5 | `(0,0)` incident through `toMapData`; the new arm must go red against the current truthiness gate |
| TESTS-P3-6 | confirm the factory exists and count remaining inline `DemoCase` literals |
| TESTS-P3-7 / -8 | read-only re-check of the comments/assertions |
