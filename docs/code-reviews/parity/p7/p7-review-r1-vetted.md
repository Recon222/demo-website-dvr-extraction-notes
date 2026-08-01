# P7 review — round 1, VETTED (the one doc the fix rounds execute against)

**PR:** #36 · `master..feat/parity-p7` @ `1505c00` (lane files committed `3dc3acf`)
**Aggregator:** Fable (P7 review aggregator role) · worktree `scratchpad/worktrees/parity-p7`
**Inputs:** the five lane files in this directory · PR #36 body (DO-NOT-RE-FLAG list) · `docs/code-reviews/deferred.md` §§80–83

---

## VERDICT: REVISE

**0 blockers · 7 majors · 27 minors** (34 vetted findings from 46 raw lane items: 7 cross-lane
merges, 3 struck, 2 logistics notes). Nothing here threatens the architecture — the v7 lattice,
the two guard layers, the pane partition and the mutation-resistance of the new test surface all
probe-verified sound by their lanes and spot-re-verified here. The majors cluster on three
shapes: **writes that outlive a visibility decision** (R-1, R-2), **claims the surface can't
back** (R-3, R-5), and **renders/announcements that contradict what the visitor just did or
sees** (R-4, R-6, R-7). All seven majors are small fixes; none is a redesign.

Baseline confirmed in this worktree before adjudication: 259 files / 3365 tests green, cold
`tsc --noEmit` clean. All probes below were reverted; `git status` clean and targeted suites
re-green at the end of the run.

---

## Empirical adjudication (re-run by the aggregator, then reverted)

| # | Probe | Result | Adjudication |
|---|---|---|---|
| 1 | T-1 mutation A: autofill deps → `[store, view, currentLocationId, currentLocation?.form.completedBy]` | `DemoExperience.user-profile.test.tsx` **12/12 green** | CONFIRMED — the "field becomes unclearable" regression passes the suite |
| 2 | T-1 mutation B: deps → `[…, userProfile.name]` | **12/12 green** | CONFIRMED — the "late profile edit fills an open screen" regression passes the suite |
| 3 | T-2 relocation: `CoordinateDisplay` moved outside the `showGps` fragment (`LocationFields.tsx`) | field-visibility + submission-gps + location-coordinates + DemoExperience.form-customization: **4 files / 84 green** | CONFIRMED — the coordinate card can escape the gate unnoticed; only `gps-capture-control` is pinned |
| 4 | SF M-1 end-to-end scratch probe (hidden `completion.completedBy` + profile name + arrive at Completion) | all four assertions passed: field resolved hidden & not rendered · `form.completedBy` written anyway · name present in `generateCaseNotesDoc` output · `selectDrawerStatus(loc, s).completion === 'complete'` | CONFIRMED end to end |
| 5 | Narration counts | `narration.ts:293` says "Eleven categories" / "57 form fields"; `SETTINGS_CATEGORY_IDS` has **10** entries; the registry test pins **58** ids (50 switches) | CONFIRMED — both numbers wrong |
| 6 | Explore memo deps | `DemoExperience.tsx:628-632` deps `[store, visited, view, modal]`; `selectors.ts:46` filters rows via `resolveStepVisible(item.id, state)` — `profile`/`formOverrides` are real inputs, absent from the deps | CONFIRMED statically (runtime reproduction already in lane-typescript) |
| 7 | R-3 premise | `UserProfilePaneProps` is exactly `{ profile, onSave }` — no persistence handle reaches the pane | CONFIRMED |
| 8 | Post-revert baseline | targeted suites 52/52 green; `git status --short` empty | clean |

---

## PR-body / ledger overclaims (findings against the body and ledger, not the reviewers)

Per house discipline these are wording-amendment **obligations**, each attached to the finding
that owns it:

- **A1 (rides R-1):** the PR body's autofill bullet — *"fills once, only into an empty field,
  typing survives"* — overclaims. The truth (per the effect's own accurate doc comment) is:
  fills once **per arrival**; typing/clearing survives **while the screen stays open**; a
  cleared field is **silently refilled on the next arrival**. §84+ entry + a fix-round PR
  comment carrying the corrected phrasing. The dependency list itself stays untouched.
- **A2 (rides R-2):** §82b's "demo-better" claim describes a **display-only** gate; the ruling
  below completes the semantics (hidden group ⇒ no *new* coordinate stamping). §84+ entry
  records the write-side rule; §82b stands as written.
- **A3 (rides R-13):** `reset()`'s treatment of `profile`/`formOverrides` (wiped) vs
  `userProfile` (preserved, §81c) is currently an accident of two branches — the disposition
  becomes an owner decision recorded in §84+, whichever way it goes.
- **A4 (rides R-32):** §80g's inventory must gain the three items W-6/W-9/W-10 surfaced, so its
  "moves focus into the detail pane on open and back to the opening row on close" summary is not
  read as "focus handling here is complete".

---

## MAJOR findings

### R-1 [MAJOR] — the Completed-By autofill family: contract pinned by nothing, writes past the visitor's OFF, and a re-entry refill the PR body's summary omits
**File:** `features/demo/ui/DemoExperience.tsx:1016-1024` · **Lanes:** tests T-1 (HIGH) + silent-failures M-1 (MED) + SF L-5 (LOW), merged · **Owner: P7.2**

One effect, three sub-defects, one owner. The dependency list `[store, view, currentLocationId]`
is the contract the PR body declares binding — and the fix must NOT touch it (all three fixes
below leave the deps byte-identical).

- **(a) The contract is unpinned** (T-1, probes 1–2). Both "fix the deps" mutations — each a
  real behavioural regression (unclearable field; late-set name filling an open screen) — pass
  the 12-test suite. Every shipped test either arrives with a name already present or changes
  the profile from a different view. **Fix:** the two tests sketched in lane-tests (cleared
  stays cleared; a name set while Completion is open does not fill) — both already verified
  green-at-baseline / red-under-mutation by that lane.
- **(b) The write never consults visibility** (SF M-1, probe 4). Toggle Completed By off in the
  Form Fields grid, set a profile name, enter Completion: the input is not rendered, the value
  is written anyway, it prints in the Case Notes document's Completion Information section, and
  the drawer dot reads `complete` (`counted([])` ⇒ `'complete'`) — an explicit "off" overridden
  by a write the visitor cannot see, edit, or clear. The pane's footnote covers only data
  "already entered", not data the app creates after hiding. **Fix:** one line before the
  `updateField` — `if (!resolveFieldVisible('completion.completedBy', s)) return` (resolver
  already imported). Phone-inherited (its `completion.tsx:127-133` has the same hole): file the
  phone bug-ledger item, §82b pattern.
- **(c) The re-entry refill + the overclaim** (SF L-5 → **A1**). Clearing the field and
  re-entering the screen re-fills it — phone parity, not a code change request. The PR body's
  "typing survives" summary omits exactly this case; amend per A1.

*Optional rider on (a)'s test commit:* lane-typescript Obs-2 — `persistence.test.ts` pins the
v6-discard for `formOverrides` but not the symmetric `delete parsed.state.userProfile` case; one
test if P7.2 wants it while in the file.

### R-2 [MAJOR] — the submission GPS gate's reach: the coordinate card is unpinned, and the hidden group is still WRITTEN by the always-on address picker
**Files:** `features/demo/ui/inputs/LocationFields.tsx:212-233` (the `onPick` write) and `:241-268` (the `showGps` fragment); `SubmissionScreen.tsx:160` · **Lanes:** tests T-2 (HIGH) + silent-failures M-3 (MED), merged · **Owner: P7.3**

- **(a) The gate's render half is pinned only at its button** (T-2, probe 3). §82b scopes the
  gate as "capture control + lookup notice + coordinate card"; only `gps-capture-control` is
  asserted, and the fixture carries no coordinates so the card renders in neither arm of the
  diff. Moving the card outside the gate stays green across 84 tests. **Fix:** T-2's sketched
  test (coordinates fixture + `isFieldVisible` off ⇒ neither button nor `43.6087` in the
  document). The lookup-notice half is the same gap; the card is the load-bearing part.
- **(b) The gate is display-only — RULING: hiding the group also suppresses the stamping.**
  `onPick` spreads `lat/lng/accuracyM/coordinateSource:'geocoded'` outside the gate, so with the
  group off, picking a Mapbox suggestion stamps coordinates the visitor cannot see, verify, or
  clear — and they reach the Map pin and the exported case map. The demo *invented* this gate on
  the honesty rule ("a switch must move something", §82b); a switch that governs display while
  writes continue invisibly re-creates the dishonesty one level down, and is the same shape as
  R-1(b): a write outliving the visibility decision. **Fix (~3 lines):** pass `showGps` into the
  `onPick` branch and drop the coordinate half of the patch when the group is hidden (street/
  city always-on halves still write). Coordinates captured *before* hiding stay — that is the
  footnote's "already entered" case and is correct. Record the completed semantics per **A2**.

### R-3 [MAJOR] — the User Profile pane promises refresh survival without consulting the persistence handle, against this module's own documented rule
**File:** `features/demo/ui/screens/settings/panes/UserProfilePane.tsx:79-84` · **Lane:** silent-failures M-2 (MED, upgraded) · **Owner: P7.2**

"This one is real: what you enter is kept for this browser tab" — stated unconditionally by a
pane whose props are `{ profile, onSave }` (probe 7). `persistence.ts:610-614` states the
governing rule in bold: *any surface that makes a persistence promise must gate that sentence on
`saveState()`* — and both existing promise sites do (`DemoExperience.tsx:1986`, `:603-611`).
Private-browsing / quota-exhausted tabs (OCR data-URLs are the big payload) hit
`{ kind: 'failed' }`, the snapshot is cleared, and this pane keeps promising; the only honest
surface lives in a wizard drawer this visitor may never open. Upgraded to major because it is a
direct violation of a stated in-module contract with a realistic trigger, on the demo's central
honesty value. **Fix:** thread the fact — pass `saveState().kind` (or `persisted: boolean`)
into the pane and swap the clause when not `'saved'`; wording already exists in
`describeSaveStatus`.

### R-4 [MAJOR] — the explore memo's dep list no longer covers its inputs: the rail keeps a screen the visitor just switched off
**Files:** `features/demo/ui/DemoExperience.tsx:624-632` · `engine/store/selectors.ts:46` · **Lane:** typescript MED-1 (reproduced at runtime by that lane; re-verified statically, probe 6) · **Owner: P7.3**

P7.3 made `selectExploreStatus` read `profile`/`formOverrides` (via `resolveStepVisible`); the
memo's deps are still `[store, visited, view, modal]` and its comment still claims "all three
are selectExploreStatus inputs". Reproduced: toggling Cameras off with the sheet open leaves a
Cameras row and a `2/21` denominator on the rail beside the pane where the visitor just removed
it; it self-heals only because closing the sheet flips `modal`. A render contradicting the
visitor's action, in the demo's narration surface. **Fix:** add `profile, formOverrides` to the
dep list (both already declared at `:447/:450`), correct the comment, and extend the existing
"drops the hidden screen … from the rail checklist" test to toggle *after* render (today it
seeds before render, which is why it never catches this).

### R-5 [MAJOR] — the Settings rail narration ships two counts this PR's own registries contradict
**File:** `features/demo/engine/content/narration.ts:293` · **Lane:** typescript MED-4 (verified, probe 5) · **Owner: P7.1**

"Eleven categories … 57 form fields" over a surface that renders **ten** categories and a
registry pinned at **58** ids / 50 switches. Permanent, visitor-facing, disproved by the pixels
beside it — the exact drift class D6's honesty ruling exists to prevent (§82a even names 57 as
"an estimate made before the registry was read"). **Fix:** one string — "Ten categories … 50
form fields" (or drop the field count and let the pane's derived line carry it); a narration pin
is optional but cheap.

### R-6 [MAJOR] — `aria-disabled` shipped without its `aria-describedby` half: every inert control announces "dimmed" and never the reason
**Files:** `_shared.tsx:421-467` (`Toggle`) · `FormFieldsPane.tsx:140-183` (`RowSwitch`) + locked rows `:268,:293` · `ExportSecurityPane.tsx:110-136` · consumers `AppearancePane.tsx:36-43`, `CloudSyncPane.tsx:48-55` · **Lane:** web W-1 · **Owner: P7.1 (chrome + stub panes), P7.3 (RowSwitch wiring in FormFieldsPane)**

Both new switch implementations cite the house rule ("stays focusable so a keyboard visitor can
hear WHY") and ship only half of it — the cited precedent (`ModalActions.submitBlocked`) pairs
`aria-disabled` with `aria-describedby`; P7 is the first `aria-disabled` in the repo without a
description. A screen-reader user on a locked grid row, Dark Mode, or Cloud Sync cannot
distinguish "deliberately locked" from "broken" — across the 7 always-on fields, every must-stay
screen row, and two stub panes. **Fix:** per lane-web — `LockPill`/`PaneStubNote` get ids
(`useId`), `RowSwitch`/`Toggle` gain `describedBy?: string`, `Set Default Password` points at
the `PaneNote` already beneath it.

### R-7 [MAJOR] — the Photo Quality slider announces a number the pane never shows
**File:** `_pane-chrome.tsx:236-250` · caller `MediaCapturePane.tsx:61-79` · **Lane:** web W-2 · **Owner: P7.1**

The range input is bound to the raw scalar with no `aria-valuetext`: the screen shows `85%`, AT
announces `0.85` (or percent-of-range ≈ 70% on min≠0 pairs) — a value that contradicts the
on-screen number, on the one control whose whole purpose is that number (WCAG 4.1.2). Kept major
because the announced information is *false*, not merely missing. **Fix:** `valueText` prop →
`aria-valuetext`, pass the percent the pane already computes; drop (or properly wire) the dead
`useId`/`id` pair.

---

## MINOR findings

### R-8 [minor] — the DVR Retention card instructs the visitor to use a control the form no longer renders
**File:** `DvrInfoScreen.tsx:165-212` (empty state `:206-210`) · **Lanes:** typescript MED-2 + silent-failures L-1, merged · **Owner: P7.3**
Hide `dvr.firstRecordedDate`, keep either retention output on, no date stored: the card's whole
body is "Pick the first recorded date to calculate…" with no date picker on the screen — a
dead-end instruction three clicks from the pane. The one instance (typescript lane swept the
other five gated screens clean). **Fix:** gate the empty state on `show.firstRecordedDate`, or
swap its copy to "Turn on First Recorded Date to calculate…".

### R-9 [minor] — six settings pickers open a bottom sheet named "Select an option"
**Files:** `_shared.tsx:409-418` → `Dropdown.tsx:110-112`; six call sites in MediaCapture/Location/TimeSync panes · **Lane:** web W-3 (demoted from lane-major: information absence, not falsehood; browse-mode recoverable) · **Owner: P7.1**
Omitting the visible label (correct phone parity) collapses the dialog's and menu's accessible
names to the placeholder. **Fix:** `a11yLabel?: string` threaded to the sheet title and menu
name from each `PaneGroup`'s label; pixels untouched.

### R-10 [minor] — `aria-labelledby` on a role-less `<div>`: the detail pane's name is prohibited
**File:** `SettingsModal.tsx:164` · **Lane:** web W-4 (demoted from lane-major: the promised announcement is absent, content remains reachable in browse mode) · **Owner: P7.1**
ARIA `generic` prohibits name-from; axe flags it serious; the focus-time announcement the doc
comment promises never fires. **Fix:** one word — `role="group"` on that div.

### R-11 [minor] — eight unchecked `as` casts narrow `string` into closed unions while the seven `as const` tuples that would close the hole sit exported and unconsumed; plus two `Record<string, string>` testid maps
**Files:** MediaCapture/Location/TimeSync/ExportSecurity panes (8 casts) · `settings-values.ts:44-68` (7 dead tuples) · `ExportSecurityPane.tsx:21-29` (testid maps) · **Lanes:** typescript MED-3 + typescript LOW, merged · **Owner: P7.1**
The fix is already written in the file and has zero consumers — the reverse of the PR's own
`persistence.ts:136-140` policy. **Fix:** `TypedOption<T>` lists off the tuples (drop the
casts), and total `Record<Union, string>` on both testid maps. One fix round, one commit.

### R-12 [minor] — the must-stay exemption on the auto-hide cascade is unpinned; the named test passes through the other guard layer
**File:** `create-store.ts:566` · test `form-customization-actions.test.ts:147-157` · **Lane:** tests T-3 · **Owner: P7.3**
Deleting `&& !isStepMustStay(screen)` stays green (73 tests); the named test drives `submission`
(never enters the branch) and asserts through the READ-force layer. `completion` is the only
must-stay screen that reaches the branch; under the mutation a contradicting `steps.completion
= false` lands in state and the v7 snapshot. **Fix:** T-3's sketched extension — drive
`completion`, assert `formOverrides.steps` stays `{}`.

### R-13 [minor] — `reset()`'s treatment of the two new P7.3 members is unasserted in either direction, and the "dirty EVERY mutable key" fixture has drifted
**File:** `create-store.ts:514` · fixture `store.test.ts:30-52` · **Lanes:** tests T-4 + typescript Obs-3, merged · **Owner: P7.3** (+ owner ruling per **A3**)
`reset()` preserves `userProfile` (§81c) but wipes `profile`/`formOverrides` — two settings-family
values with opposite reset semantics, decided on different branches, never reconciled, and pinned
nowhere. No production caller today. **Fix:** dirty both members in the maximal fixture and
assert the ruled-on behaviour; record the ruling in §84+.

### R-14 [minor] — the "every pane opens with an honest note" loop pins the box, not the text
**File:** `panes.test.tsx:47-53` · **Lane:** tests T-5 · **Owner: P7.1**
Appearance, Export Security and About have no content assertion anywhere; `{null}` bodies stay
green. **Fix:** `not.toBeEmptyDOMElement()` in the loop, or one-line content assertions for the
three uncovered panes.

### R-15 [minor] — two defensive-fallback branch gaps in the new engine
**Files:** `profiles.ts:110` (`describeProfile` rogue-profile fallback) · `form-customization.ts:202` (`getFieldGroupMembers` unknown-id guard) · **Lane:** tests T-7 · **Owner: P7.3**
Both mirror a sibling that *is* pinned; one line each.

### R-16 [minor] — `checkArray` is dead and untested
**File:** `selectors.ts:169-176` · **Lane:** tests T-8 (deletion is TS-lane hygiene; merged here so it is one commit) · **Owner: P7.3**
Lost its last caller to `countedArray`. **Fix:** delete it.

### R-17 [minor] — the derived reduction line asserts "every screen and field is on" while the visitor's own overrides have things off
**File:** `FormFieldsPane.tsx:225-229` · source `profiles.ts:109-114` · **Lane:** silent-failures L-2 · **Owner: P7.3**
The line §82d created to be the un-driftable counterweight makes a present-tense claim it cannot
back under overrides. **Fix:** re-word to profile scope ("This profile hides nothing by
default.") or count through the resolver.

### R-18 [minor] — "Contact Support is real — it opens your mail client" silently does nothing without a mailto handler
**File:** `AboutPane.tsx:38-42, 77-102` · **Lane:** silent-failures L-3 · **Owner: P7.1**
**Fix:** render `SUPPORT_EMAIL` as selectable text beside the button and soften the note.

### R-19 [minor] — the Export Security master row reads "On" for a protection the demo never applies
**File:** `settings-values.ts:277-278` · **Lane:** silent-failures L-4 · **Owner: P7.1** · disposition: fix-or-ledger
The sibling Cloud Sync pane refused exactly this impression, and the real downloads are
unencrypted. **Fix (smallest honest):** the row stops asserting protection (`null` preview or
`'Demo · off'`) with switches left live per D6 — or an owner-accepted §84+ recording if parity
of the row preview is ruled to win.

### R-20 [minor] — the additive-tool set is keyed by ad-hoc names (`capture`/`audio`), so a third capture tool silently never reaches the drawer
**Files:** `selectors.ts:149` · `WizardDrawer.tsx:51` · **Lane:** type-design M1 (probe-verified: a third `AdditiveFormStepId` errors in exactly two registries and neither consumer) · **Owner: P7.3**
**Fix:** `Readonly<Record<AdditiveFormStepId, boolean>>` mapped from the tuple, imported (not
re-declared) at the drawer prop.

### R-21 [minor] — `SettingsPreviewContext.formProfileLabel` is a bare `string` over a closed union whose label map sits in the same file
**File:** `settings-values.ts:236` · bridge `DemoExperience.tsx:722` (dead `?? profile` arm) · **Lane:** type-design M2 · **Owner: INTEGRATOR** (§83c's unfinished shape — the seam comments were retired, the widened parameter stayed)
**Fix:** `formProfile: Profile`; `settingsPreview` maps through `FORM_PROFILE_SHORT` itself;
delete the dead `??`.

### R-22 [minor] — `selectVisibleWizardScreens` narrows with an unchecked `as` the compiler could prove
**Files:** `form-customization.ts:68` · `selectors.ts:138` · **Lane:** type-design M3 · **Owner: P7.3**
**Fix:** `LinearFormStepDef extends FormStepDef { id: WizardScreenId }` on `LINEAR_FORM_STEPS`;
drop the cast; the runtime pin becomes a compile failure.

### R-23 [minor] — `selectDrawerStatus`'s optional second argument silently switches which question the function answers
**File:** `selectors.ts:206-209` · **Lane:** type-design M4 · **Owner: P7.3**
Absence is a *mode* (§82f's deliberate drawer-dot vs map-pin split), not "not configured".
**Fix:** make the mode nameable — two entry points, or a required `FormVisibility | 'count-all'`.

### R-24 [minor] — `ProfileDefaults`: typed and documented TOTAL, constructed with `{} as Record`, read with `?? false`
**Files:** `types/index.ts:580-583` · `profiles.ts:27,30` · `form-visibility.ts:58,75` · **Lane:** type-design L1 · **Owner: P7.3**
Three signals, two answers — pick one (drop the `??`s, or type `Partial` and keep them).

### R-25 [minor] — both frozen defaults are annotated mutable, discarding `Object.freeze`'s `Readonly<T>`
**Files:** `settings-values.ts:112` (`DEFAULT_SETTINGS`) · `logic/user-profile.ts:22` (`DEFAULT_USER_PROFILE`) · **Lanes:** type-design L2 + typescript Obs-4, merged · **Owner: P7.1** (P7.2's file rides the same commit)
**Fix:** annotate `Readonly<…>` (or `satisfies` with const inference), one line each.

### R-26 [minor] — the invariant-4 device forces a KEY, not a non-empty coverage list
**File:** `form-customization.test.ts:136` · **Lane:** type-design L3 · **Owner: P7.3**
`probeFourthRule: []` discharges the compile gate and the assertion loop iterates zero times.
**Fix:** `readonly [FormFieldId, ...FormFieldId[]]`.

### R-27 [minor] — `getFormStep`/`getFormField` are typed to forbid the exact call the id guards make through `as`
**Files:** `form-customization.ts:88,195` · `form-visibility.ts:131-138` · **Lane:** type-design L4 · **Owner: P7.3**
**Fix:** honest lookup signatures (`(id: string): … | undefined`) or a separate `find*` for the
guards.

### R-28 [minor] — `ExploreItem.id` is the one bare-string field in its registry and P7.3 made it load-bearing
**Files:** `explore.ts:24` · `selectors.ts:46` · **Lane:** type-design L5 · **Owner: P7.3**
Slug/step-id drift ⇒ permanently unfiltered (or spuriously filtered) rail row. **Fix:** at
minimum re-document the field's job; better, type the step-keyed subset.

### R-29 [minor] — `ModalShell.elevation?: number` carries a layering invariant the type doesn't
**File:** `_shared.tsx:68` (one caller: `UserProfileModal.tsx:100`, which *does* contain the PickerSheets the invariant protects) · **Lane:** type-design L6 · **Owner: P7.2**
**Fix:** named constants or a two-member union carrying what the comment carries alone.

### R-30 [minor] — `getSettingsCategory` is a bare-string lookup with no production caller
**File:** `settings-catalog.ts:137` · **Lane:** type-design L7 · **Owner: P7.1**
**Fix:** give it the caller the port implies, drop it, or document it as a boundary guard.

### R-31 [minor] — the screen-row expander bakes its state into its accessible name
**File:** `FormFieldsPane.tsx:255-256` · **Lane:** web W-5 · **Owner: P7.3**
The repo's own accordion comment states the rule; this is the only one of nine
`aria-expanded` sites that violates it, ×12 rows. **Fix:** `aria-label={step.label}` (or none);
optional `aria-controls`.

### R-32 [minor] — nested `aria-modal` dialogs with no background suppression, plus the two recorded overlay residuals — all routed into §80g's inventory
**Files:** `_shared.tsx:82-94` + `SettingsModal.tsx:154-162` (W-6) · `AlertDialog`+`SettingsModal` Escape pair (W-9) · sheet-close focus boundary (W-10) · **Lanes:** web W-6 + W-9 + W-10, merged · **Owner: P7.1** · disposition: ledger amendment per **A4** (+ optional local `inert` while `editing`)
The elevation mechanics are verified sound; the gap is two peer `aria-modal` surfaces with
neither `inert`. The structural fix belongs to the §7/§80g overlay-stack pass — the obligation
here is that the pass's inventory names all three items, which today it does not.

### R-33 [minor] — the 22-field settings record lives in the bridge with one consumer; every slider step re-renders the whole phone subtree
**File:** `DemoExperience.tsx:655-659` · **Lane:** web W-7 · **Owner: P7.1** · disposition: fix-or-ledger
§80c settled store-vs-bridge, not bridge-vs-sheet. The `BRIDGE_PANE_IDS` partition already
expresses the split the fix needs. Legitimate defer if logged (DEF/§84 entry), per the lane.

### R-34 [minor] — disclosure reveals in the settings panes are silent to AT
**Files:** `ExportSecurityPane.tsx:71-86` · `MediaCapturePane.tsx:110-114,135-137` · **Lane:** web W-8 · **Owner: P7.1**
**Fix:** id + `role="region"`/`aria-controls` (or polite live region) on the revealed container.

---

## Struck findings (and why)

| Item | Lane | Reason struck |
|---|---|---|
| `panes.test.tsx:288` flake (`[...BRIDGE_PANE_IDS]` received a three-element array) | web (recorded) → tests (adjudicated) | **Not producible from source** — no write path into the tuple exists, `'about'` was never a member, per-file isolation holds; 5× solo + cold full-suite green. Root cause: `next build` and vitest sharing one worktree's caches. Re-file against the **runner** only if reproduced from a cold worktree with no concurrent build. Lane-typescript independently recorded the same contention (42 spurious failures from two concurrent vitest runs — re-run serially before filing). |
| T-6 (partition test's second and third assertions are tautologies) | tests | **Informational by its own filing** ("no change required"). Retained caution: the fix-delta must not read three green assertions as three independent guarantees — assertion `:39` is the real one. |
| Obs-1 (untracked `zzprobe.test.tsx` skewing suite counts) | typescript | Resolved during the review round; recorded in the lane file so it does not recur. No action. |

**Noted, unrouted:** typescript Obs-2 (asymmetric v6-discard pin) — optional rider on R-1's test
commit, see R-1.

## Severity normalizations (for auditability)

- SF M-1 / M-3 (lane-MEDIUM) ride **major** families R-1/R-2 — each is a write outliving an
  explicit visibility decision, reaching the document/map.
- SF M-2 (lane-MEDIUM) **upgraded** to major (R-3): violates a bolded in-module contract, on the
  honesty value, with a realistic trigger.
- typescript MED-1 / MED-4 **upgraded** to major (R-4/R-5): a reproduced render contradicting
  the visitor's action, and permanent false visitor-facing copy.
- web W-3 / W-4 (lane-major) **demoted** to minor (R-9/R-10): information absence recoverable in
  browse mode, vs W-1/W-2 (kept major) where the announcement is absent-with-no-alternative or
  actively false.

## Lane hygiene (for the orchestrator, not the fix rounds)

- The SF lane's probe worktree is registered for cleanup:
  `scratchpad/worktrees/p7-silentfail` (detached @ `1505c00`; `node_modules` is a **symlink** into
  `parity-p7` — remove the link, not its target). The type-design lane's `p7-typedesign` worktree
  reported itself clean.
- The type-design lane's early `git checkout --` in the shared worktree may have clobbered
  another lane's in-flight probe on `settings-catalog.ts`; all lanes' final gates were green, so
  no residue — but future rounds should isolate probe worktrees from the start (two lanes lost
  time to shared-worktree contention this round).

---

## Owner-routing table

| Owner | Majors | Minors |
|---|---|---|
| **P7.2** (profile + autofill) | R-1, R-3 | R-29 (+ R-1 rider, + R-25's `user-profile.ts` half) |
| **P7.3** (form customization) | R-2, R-4, R-6 (RowSwitch half) | R-8, R-12, R-13, R-15, R-16, R-17, R-20, R-22, R-23, R-24, R-26, R-27, R-28, R-31 |
| **P7.1** (shell + chrome) | R-5, R-6 (lead), R-7 | R-9, R-10, R-11, R-14, R-18, R-19, R-25 (lead), R-30, R-32, R-33, R-34 |
| **INTEGRATOR** (§83 shapes) | — | R-21 |

Ledger obligations: A1→R-1 (P7.2) · A2→R-2 (P7.3) · A3→R-13 (P7.3 + owner) · A4→R-32 (P7.1).
Phone bug-ledger items to file (phone repo, owner-directed exception): the autofill visibility
hole (R-1b twin, `app/(form)/completion.tsx:127-133`).

## Lane → R-ID map

| Lane finding | Vetted |
|---|---|
| tests T-1 / T-2 / T-3 / T-4 / T-5 / T-6 / T-7 / T-8 | R-1a / R-2a / R-12 / R-13 / R-14 / struck / R-15 / R-16 |
| silent-failures M-1 / M-2 / M-3 / L-1 / L-2 / L-3 / L-4 / L-5 | R-1b / R-3 / R-2b / R-8 / R-17 / R-18 / R-19 / R-1c |
| typescript MED-1 / MED-2 / MED-3 / MED-4 / LOW / Obs-1..4 | R-4 / R-8 / R-11 / R-5 / R-11 / struck·noted·R-13·R-25 |
| web W-1 / W-2 / W-3 / W-4 / W-5 / W-6 / W-7 / W-8 / W-9 / W-10 (+flake) | R-6 / R-7 / R-9 / R-10 / R-31 / R-32 / R-33 / R-34 / R-32 / R-32 (struck) |
| type-design M1 / M2 / M3 / M4 / L1 / L2 / L3 / L4 / L5 / L6 / L7 | R-20 / R-21 / R-22 / R-23 / R-24 / R-25 / R-26 / R-27 / R-28 / R-29 / R-30 |
