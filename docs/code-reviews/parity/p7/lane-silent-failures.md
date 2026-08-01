# P7 review — lane: SILENT FAILURES

**PR:** #36 · `master..feat/parity-p7` @ `1505c00`
**Lane:** silent-failure-hunter (xhigh)
**Method:** read-only over the full diff (97 files), plus one executable probe in an isolated
worktree (`.../scratchpad/worktrees/p7-silentfail`, detached @ `1505c00`, `node_modules`
symlinked from the shared worktree — **register for cleanup**). The probe file was deleted after
running; the worktree is otherwise clean.

**Context read first:** PR #36 body (DO-NOT-RE-FLAG list), `docs/code-reviews/deferred.md`
§§80–83, `features/demo/CLAUDE.md`, `.claude/agents/silent-failure-hunter.md`.

---

## Verdict

**REVISE** — 0 CRITICAL, 0 HIGH, 3 MEDIUM, 5 LOW.

No fabricated capability reaches a visitor, no fallback is presented as a real result, and no
exception is swallowed without a breadcrumb. Every finding below is one of two shapes: **a write
that outlives the visibility decision that was supposed to govern it** (M-1, M-3), or **a claim
made on a surface that never consults the fact behind it** (M-2, L-2, L-3, L-4).

---

## What I verified as SOUND (stated so the fix round doesn't re-audit it)

These were the brief's explicit probes. All hold.

**The `ALWAYS_ON_FIELDS` derivation genuinely forecloses "required but hidden."**
`content/form-customization.ts:224-247`. The gate (`logic/final-submission.ts:33-46`) can reject
on exactly three rules; all nine ids that clear them are in the always-on set, `isStepMustStay`
is *computed* from that set, and `resolveFieldVisible` checks always-on **before** the host-step
check (`logic/form-visibility.ts:65-76`) so an always-on field cannot be suppressed by a hidden
screen. The pin is not a tautology: `form-customization.test.ts:136` types the coverage map as
`Record<keyof typeof FINAL_SUBMISSION_MESSAGES, readonly FormFieldId[]>`, so a **fourth** gate
rule is a compile error, and the same test asserts an empty location really does fire all three
messages so the map cannot go stale against a rule that was quietly dropped. This is the
strongest device in the package.

**The snapshot's quota/write-failure path is honest at the engine layer.**
`persistence.ts:663-689` — a failed `setItem` sets `state = { kind: 'failed' }`, **clears** the
stale snapshot so a later refresh boots empty rather than silently restoring pre-failure work,
and leaves a dev-gated `console.warn` carrying the cause. `SaveState` keeps the three falses
distinct (`unavailable` / `pending` / `failed`) instead of collapsing to one boolean. Correct.
The gap is only that P7.2's new surface doesn't *read* it — M-2.

**The load-side override filter is honest by design, not a swallow.**
`persistence.ts:518-525`. Dropping override keys this build doesn't know is a genuine no-op — an
unknown id names no field, so nothing the visitor can perceive changes — and the alternative
(failing the shape guard) would wipe their cases over a settings preference. It follows the
`visited` precedent exactly, including the own-property discipline (R-7). Not a finding. A
contradicting-but-known override (e.g. a hand-edited `submission.city: false`) survives the
filter but is overruled at READ by the always-on branch, so it resolves nothing — defence in
depth, working.

**Locked toggles are true no-ops on both layers.** `create-store.ts` `setFormStepVisible` /
`setFormFieldVisible` early-return for must-stay/always-on ids, and the pane renders those
switches `disabled` so `onToggle` never fires (`FormFieldsPane.tsx:153-155, 269-275, 294-300`).
No dead button, and no override written that the resolver would then ignore.

**The auto-hide cascade is not silent.** Turning off a removable screen's last visible field
hides the screen, and the pane's own screen switch flips with it and swaps the field list for
`COPY.screenHidden`. The one-way-ness is visible rather than inferred.

**Stub-pane honesty holds across all nine `PaneStubNote` sites** (8 stub panes +
`UserProfilePane`). Every pane that moves cosmetic state names *which* thing its controls don't
do, and the two controls that must not appear to take (`darkMode`, `cloudSyncEnabled`) are
`aria-disabled` with inert handlers rather than sliding over nothing. `FormFieldsPane` carries no
stub note and correctly shouldn't — nothing on it is stubbed; its footnote states the output
policy instead.

**D-B6 (every close path clears state) is satisfied for the Settings surface.** `activeId`, the
`returnToRow` ref, each `ScreenRow`'s `expanded`, `UserProfilePane`'s `editing` and
`UserProfileModal`'s `draft` all die with the unmount. The editor's scrim sits at
`zIndex 25/26` (`_shared.tsx` `elevation={4}`) above the Settings sheet's `21/22`, so the
settings scrim is not click-reachable while the editor is open — the draft cannot be discarded
by a click aimed at the sheet behind it. The persisting `settings` record is bridge state by
decision (§80c) and correctly survives close/reopen.

**§81d (one Escape pops two overlays) is deferred and I am not re-filing it.** Confirmed it also
covers Escape over the "Apply profile?" confirm.

---

## Findings

### [MEDIUM] M-1 — the Completed-By autofill writes into a field the visitor switched OFF, and the value reaches the Case Notes document with no on-screen representation

**File:** `features/demo/ui/DemoExperience.tsx:1016-1024`

```ts
if (view !== 'completion') return
const s = store.getState()
const location = s.locations.find((l) => l.id === s.currentLocationId)
if (!location || location.form.completedBy) return
const name = s.userProfile.name.trim()
if (!name) return
s.updateField('form.completedBy', name)          // ← never consults isFormFieldVisible
```

**Adversarial sequence:** Settings → Form Fields → Completion → expand → toggle **Completed By**
off (it is not always-on; `completion` is must-stay but field-capable, so the switch is live).
Settings → User Profile → Set Up Profile → name `Det. J. Smith` → Save. Wizard → Completion.

**Observable wrong behaviour** (probe-verified end to end, all six assertions passed):

1. `resolveFieldVisible('completion.completedBy', state) === false` — the input is not rendered
   (`CompletionScreen.tsx:112-119`), and with `dateTimeCompleted` also off the whole "Completion
   Details" card is gone (`:107`).
2. The effect fires anyway and writes `form.completedBy = 'Det. J. Smith'`.
3. `selectCaseNotesData` carries it (`selectors.ts:373-376`) and `generateCaseNotesDoc` emits a
   **Completion Information** section containing the name (`pdf/case-notes.ts:287-297`).
4. The drawer dot for Completion reads `'complete'` — `counted([])` returns `'complete'` when
   every counted field is hidden (`selectors.ts:229-233`) — so nothing anywhere on screen hints
   that a value exists.

Net: the visitor's explicit "off" is overridden by a write they cannot see, cannot edit and
cannot clear, and it prints in the forensic document. The Form Fields footnote covers the
opposite direction only — *"any data **already entered** is still saved and still appears in the
generated report"* (`FormFieldsPane.tsx:77-78`) — which is a statement about pre-existing data,
not about data the app creates *after* the field was hidden.

**Parity note (checked at source, phone repo read-only):** the phone's autofill is likewise
ungated — `app/(form)/completion.tsx:127-133` reads `[hydrated]` only, while `:58-59` compute
`showDateTimeCompleted` / `showCompletedBy` and use them for rendering alone. So the phone has
the same hole. This is not a port defect; it is a hole the demo **inherited and then made
reachable in a surface it built itself**. I am not asking for the deps to change (PR body's
DO-NOT-RE-FLAG stands — the dependency list is untouched by either fix below).

**Fix (pick one):**
- *Gate the write*, one line: `if (!resolveFieldVisible('completion.completedBy', s)) return`
  before the `updateField`. The resolver is already imported in this file. Then file the phone
  side as a bug-ledger item, the §82b pattern.
- *Or record it* as a deliberate output-policy consequence in §84+, and widen the footnote so it
  covers auto-populated values, not just "already entered" ones.

---

### [MEDIUM] M-2 — the User Profile pane promises refresh survival without consulting the persistence handle, against this module's own documented rule

**File:** `features/demo/ui/screens/settings/panes/UserProfilePane.tsx:79-84`

```tsx
<PaneStubNote>
  This one is real: what you enter is kept for this browser tab, …
```

`UserProfilePaneProps` is `{ profile, onSave }` — the pane has no access to `saveState()` /
`isLive()`, and the bridge passes none (`DemoExperience.tsx:2745`).

**The rule this breaks is stated in the code it depends on**, `persistence.ts:610-614`:

> *"write failures are deliberately invisible to the visitor … which is correct right up until
> the UI makes a persistence PROMISE. **Any surface that tells the visitor their work will
> survive a refresh must gate that sentence on this** (parity plan §4 honesty rule; review R-2)."*

It is applied at both existing promise sites — `DemoExperience.tsx:1986` (`saveProgress`'s
alert body) and `:603-611` (the drawer's save-status line).

**Adversarial sequence:** Safari Private Browsing, or a tab whose `sessionStorage` has hit the
~5 MB cap (the snapshot carries `OcrProof.imageDataUrl` data-URLs from P4.7's real webcam OCR —
by far the largest persisted payload, and a handful of captures is enough). Visitor opens
Settings → User Profile on a fresh boot (the gear is on the Home **and** Cases headers, so this
is reachable without ever creating a case or opening the wizard), reads the note, types name /
badge / agency, Saves. `updateUserProfile` → store change → debounced write → `setItem` throws →
`state = { kind: 'failed' }`, snapshot **removed**, `console.warn` (stripped in production).

**Observable wrong behaviour:** the pane still says the profile is kept for this tab. A refresh
loses the profile *and* every case. The only honest surface — the drawer's save-status line —
lives inside the wizard drawer, which this visitor never opened. `saveState()` knew the whole
time.

**Fix:** thread the fact the two existing sites already read. Either pass
`saveState().kind` (or a `persisted: boolean`) into `UserProfilePane` and swap the clause when it
is not `'saved'`, or hoist the sentence into a shared note component that reads it. The wording
already exists in `describeSaveStatus` — `'Not saved · the last save to this tab failed'` /
`"Not saved · this browser isn't storing the session"`.

---

### [MEDIUM] M-3 — the submission coordinate group is hidden at render but still WRITTEN by the always-on address picker

**File:** `features/demo/ui/inputs/LocationFields.tsx:212-233` (the `onPick` write) vs. `:241`
(where `showGps` starts gating)

```tsx
onPick={(p) => {
  if (!canWriteFor(locationId)) return
  onChange({
    streetAddress: p.streetAddress,
    city: p.city,
    ...(p.coordinates ? { lat, lng, accuracyM, coordinateSource: 'geocoded' } : {}),
  })                                     // ← outside the showGps gate
}}
…
{showGps && (   // ← capture control + lookup notice + coordinate card only
```

**Adversarial sequence:** Settings → Form Fields → Submission → expand → toggle **GPS Latitude**
off (the four `submission.*` coordinate ids move as one group,
`create-store.ts` `setFormFieldVisible` → `getFieldGroupMembers`). Wizard → Submission → type a
street address → pick a Mapbox suggestion.

**Observable wrong behaviour:** `lat` / `lng` / `accuracyM` / `coordinateSource='geocoded'` are
stamped onto the location. `SubmissionScreen` renders no GPS control, no lookup notice and no
`CoordinateDisplay` (`SubmissionScreen.tsx:159`), so there is nowhere on the screen the visitor
can see, verify or clear the coordinate. It then places the location's pin on the Map screen and
travels into the exported case map / GeoJSON.

This gate is **demo-invented** — §82b records that the phone's four coordinate ids gate nothing
(`submission.tsx:54-60`), so the demo took the honesty position that a switch should move
something. Having taken it, the switch currently governs display only, in one direction.

**Fix:** either drop the coordinate half of the `onPick` patch when the group is hidden (pass
`showGps` down and branch the spread), or state in §84+ that the group gates *display* only and
say so in the pane's footnote. The first is ~3 lines and matches what the switch's label implies.

---

### [LOW] L-1 — the DVR Retention card tells the visitor to use a control the form no longer renders

**File:** `features/demo/ui/screens/DvrInfoScreen.tsx:165-212`, placeholder at `:206-210`

`showRetention = show.firstRecordedDate || show.totalDvrRetention || show.daysUntilOverwritten`
(`:98`). The `retention.totalRetention == null` else-arm is **not** gated on
`show.firstRecordedDate`.

**Adversarial sequence:** Settings → Form Fields → DVR Information → expand → toggle **First
Recorded Date** off, leave **Total DVR Retention (computed)** on. One click; no group binds them.
Wizard → DVR Information, with no first-recorded date stored.

**Observable wrong behaviour:** the Retention card renders exactly one line —
*"Pick the first recorded date to calculate total retention and per-scope overwrite
countdowns."* — with no date picker anywhere on the screen. A dead-end instruction.

**Fix:** gate the placeholder on `show.firstRecordedDate`, or swap its copy when the date input
is hidden ("Turn on First Recorded Date to calculate…").

---

### [LOW] L-2 — the derived reduction line asserts "every screen and field is on" while the visitor's own overrides have things off

**File:** `features/demo/ui/screens/settings/panes/FormFieldsPane.tsx:225-229`; source
`engine/content/profiles.ts:109-114`

`describeProfile(profile)` counts `PROFILE_DEFAULTS` only — it never reads `formOverrides`. Under
`forensic` (which hides nothing by default) the line renders the literal
**"Hides nothing — every screen and field is on."** even after the visitor has switched a dozen
fields off in the grid directly beneath it.

This line exists specifically to be the trustworthy counterweight to the `limited` blurb's
overpromise (§82d) — *"a number computed from the same map the resolver reads cannot make that
mistake"* — so a present-tense claim it can't back is worth closing.

**Fix:** count through the resolver instead of the raw defaults (it already takes a
`FormVisibility`), or re-word to the profile's own scope: "This profile hides nothing by
default."

---

### [LOW] L-3 — `Contact Support` is asserted to work and silently does nothing without a mail handler

**File:** `features/demo/ui/screens/settings/panes/AboutPane.tsx:38-42` (the claim), `:77-102`
(the link)

The stub note states *"Contact Support is real — it opens your mail client."* A desktop browser
with no `mailto:` handler registered — common — swallows the navigation entirely: no window, no
error, no feedback. There is no reliable way to detect the missing handler, which is precisely
why the claim shouldn't be unconditional and the address shouldn't be link-only.

**Fix:** render `SUPPORT_EMAIL` as visible, selectable text beside or beneath the button, and
soften the note ("…opens your mail client if you have one — the address is below"). Cheap, and
it removes the only unrecoverable dead end in the pane.

---

### [LOW] L-4 — the Export Security master row reads "On" for a protection the demo never applies, where the sibling Cloud Sync pane refused exactly that

**File:** `features/demo/engine/content/settings-values.ts:277-278`

```ts
case 'export-security':
  return s.zipEncryptionEnabled || s.singleFileEncryptionEnabled ? 'On' : 'Off'
```

Flipping either switch makes the Settings master list read **"Export Security · On"**. Nothing
the demo produces is encrypted, and the two documents that *are* real downloads (Case Notes,
Time-Offset Calibration) go through the browser print path unprotected.

`CloudSyncPane.tsx:28-31` states the governing argument for the sibling case: *"a cloud-sync
switch that flips to 'on' in a browser tab would be read as 'my case data just went somewhere',
which is the one wrong impression this app must never give."* "Export Security: On" is the same
shape of impression about a *safety* property, and unlike cloud sync it has real artifacts behind
it. The pane's own `PaneStubNote` is honest and thorough — but the master row is the surface a
visitor sees *without* opening the pane.

**Fix (smallest honest option):** leave the switches live (D6 permits cosmetic state) and make
the row not assert protection — e.g. return `'Demo · off'`, or `null` (the preview contract
already supports a row with no preview, `settings-values.ts:253-255`). Disabling both switches
the way Cloud Sync does is the heavier alternative.

---

### [LOW] L-5 — a deliberately cleared `Completed By` is silently re-filled on the next entry to the screen

**File:** `features/demo/ui/DemoExperience.tsx:1016-1024`

The effect re-runs on every `view` change back to `'completion'`. Clearing the field, stepping
back one screen (or opening a drawer capture tool, which routes through `view` and returns via
`closeLaunch`), then returning re-writes the profile name into the emptied field.

The stated contract is *"fills once, only into an empty field, typing survives"* (PR body) and
*"typing over the autofilled name — or clearing it — survives for as long as the screen stays
open"* (the effect's own doc, `:1000-1002`). The doc is accurate; the PR-body summary isn't, and
"clearing" is the case where the round trip matters — a visitor clears it precisely because
someone else completed the location, and gets their own name back without a word.

Phone-equivalent (its screen unmounts/remounts with `[hydrated]` already true), so this is
parity. **Not a request to change the deps.** Recording it so §84+ carries the caveat the summary
currently omits.

---

## Silent Failure Hunter Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 3 |
| LOW | 5 |

Fallback honesty (every substitution announced): **yes**
Failure-cause distinctions preserved: **yes** (`SaveState`'s three falses; the 503-style split is untouched)
Partial results flagged (not silently short): **yes**
Async cancellation / stale-write safety: **yes** (`canWriteFor` guards intact; no new post-`await` store write)
Operator breadcrumbs intact: **yes** (no `console.warn`/`console.error` removed by this diff)

**Verdict: REVISE** (3 MEDIUM, no HIGH/CRITICAL — M-1 and M-3 are the two that write past a
visibility decision; M-2 is a promise that never reads the fact it depends on.)

---

## Worktree registered for cleanup

`/private/tmp/claude-501/-Users-fvadev-Developer-extraction-notes-DVR-Extraction-Notes-ReactNative/7423d8f5-e7f4-4135-a726-296308b62d4d/scratchpad/worktrees/p7-silentfail`
(detached @ `1505c00`; `node_modules` is a symlink into the shared `parity-p7` worktree — remove
the symlink, not its target). No commits, no branch.

---

# Fix-delta r1

**Head:** `feat/parity-p7` @ `2f57ba1` (260 files / 3402 tests) · **Base of delta:** `1505c00`
**Method:** read every cited fix commit, then re-ran my own probes against `2f57ba1` in the
isolated worktree (`.../worktrees/p7-silentfail`, moved to `2f57ba1`; probe files deleted after
running). Targeted suites re-run solo: **7 files / 168 tests green**
(`DemoExperience.user-profile`, `UserProfilePane`, `field-visibility`, `location-coordinates`,
`panes`, `FormFieldsPane`, `settings-values`). Phone repo read-only.

**Result: 8/8 of my findings FIXED. 1 new LOW. 0 not-fixed, 0 regressions.**

| Mine | Fix | Commit | Disposition |
|---|---|---|---|
| M-1 | R-1b | `88ff851` | **FIXED** — probe-verified, all arms |
| — | R-1c/A1 phone bug 20 | `914c166` | **ACCURATE** — all five file:line claims exact |
| M-2 | R-3 | `74d2c32` | **FIXED** — plus new **D-1 (LOW)** |
| M-3 | R-2 | `40d9ef0` | **FIXED** — §86a boundary verified |
| L-1 | R-8 | `db7a4ef` | **FIXED** |
| L-2 | R-17 | `ca0169c` | **FIXED** |
| L-3 | R-18 | `6937a15` | **FIXED** — better than proposed |
| L-4 | R-19 | `73daa90` | **FIXED** |
| L-5 | A1 | `914c166` + PR body | **FIXED** — corrected sentence matches observed behaviour |

---

## M-1 → R-1b — FIXED

`DemoExperience.tsx:1051` adds `if (!resolveFieldVisible('completion.completedBy', s)) return`
between the empty-check and the name read. Probe (4 cases, all pass at `2f57ba1`):

- **hidden** ⇒ `form.completedBy === ''`; `generateCaseNotesDoc` contains neither the name **nor
  the `Completion Information` heading**; and the drawer dot reads `'empty'`, not the false
  `'complete'` I reported — the `counted([])` green was a *consequence* of the write, and it went
  with it.
- **re-enabled** ⇒ fills on the next arrival. Hiding suppresses; it does not disable.
- **cleared then re-entered** ⇒ refills, exactly as the A1 sentence now says.
- **`[store, view, currentLocationId]` is byte-identical** — verified mechanically:
  `git diff 1505c00..2f57ba1 -- DemoExperience.tsx | grep 'store, view, currentLocationId'`
  returns nothing, so the dependency contract the PR body protects was not touched.

**Phone bug 20 (`914c166`) — filing is accurate.** Checked every claim at source:
`completion.tsx:59` resolves `showCompletedBy` ✓; its *only* consumer is the render gate at
`:492` ✓; the effect at `:127-133` writes without reading it ✓;
`case-notes-template.ts:341-345` is exactly the `${hasValue(formData.completedBy) ? …}` block, so
the gate is value-based, not visibility-based ✓; `case-notes-validator.ts:53` is the
`!formData.completedBy || …trim() === ''` check ✓. The entry also lands **a consequence I
missed**: the validator's non-empty requirement is *silently satisfied* by the invisible autofill,
so the phone's PDF gate stops asking for a value the operator never supplied. Correctly framed as
the inverse of item 19 (19 = a toggle that changes nothing; 20 = a toggle the app overrides).

---

## M-2 → R-3 — FIXED, with one new LOW

`UserProfilePane` takes `persisted: boolean` and swaps its opening clause; the bridge samples
`saveState().kind === 'saved'` in a `[modal]` effect, `flush()`-first
(`DemoExperience.tsx:666-682`). The rule cited in `persistence.ts:610-614` is now honoured at all
three promise sites.

**The flush timing question — checked, and the flush is load-bearing.** Probe with fake timers:
a fresh handle reads `pending`; `openModal('settings')` (the store change opening the sheet makes)
schedules the debounced write and the handle still reads `pending`; `flush()` lands it and the
handle reads `saved`. So on a healthy tab the sample never catches the `pending` state — **which
matters, because `pending` renders the withdrawn arm**. Without the flush, every first visit to
the pane on a healthy tab would have told the visitor their browser isn't storing the session.
The ordering holds structurally too: the store subscription sets the timer synchronously inside
`set()`, before React re-renders, so the timer is always armed by the time the `[modal]` effect
runs.

### [LOW] D-1 (new, fix-introduced) — the withdrawn arm reports `unavailable`'s cause for a `failed` tab

**File:** `features/demo/ui/screens/settings/panes/UserProfilePane.tsx:99-106`

```tsx
This one is real, but this browser isn&rsquo;t storing the session — what you enter
lasts until you leave or reload this page.
```

`persisted: boolean` collapses `pending`, `unavailable` and `failed` into one arm, and that arm
borrows the **`unavailable`** wording. For the quota case this lane's M-2 was written about — the
tab that *was* storing until `setItem` threw and the snapshot was cleared — "this browser isn't
storing the session" is the wrong diagnosis. Probe-verified that the two are genuinely distinct at
the handle: an injected throwing backend yields `{ kind: 'failed' }` while a null backend yields
`{ kind: 'unavailable' }`, and `describeSaveStatus` already carries the right sentence for each
(`'Not saved · the last save to this tab failed'`).

Kept at LOW because the **actionable** half is true in every arm ("what you enter lasts until you
leave or reload this page"), so the visitor is not misled about what to do — only about why. This
is the fallback-cause-collapse pattern at its lowest stakes, and the repo already owns the
vocabulary to close it.

**Fix:** take `SaveStateKind` instead of `boolean` (the pane is already the third consumer of this
fact), or keep the boolean and use a cause-neutral clause — "this page isn't holding on to the
session right now" — that is true for all three.

**Recorded, not a finding:** `profilePersisted` is sampled at sheet-open only, so a write failure
occurring *while* the pane is open leaves the promise arm standing for the rest of that visit.
§85b states this deliberately ("re-read on every open, so a mid-session failure demotes the very
next visit") and the alternative puts a persistence read in the render path of a usually-shut
pane. Bounded and disclosed — no action.

---

## M-3 → R-2 — FIXED

`LocationFields.tsx:238` — `...(showGps && p.coordinates ? {…} : {})`. Street and city still
write (always-on); the coordinate keys are simply absent from the patch, so **an existing
coordinate is not nulled either** — the §86a boundary ("only NEW stamping is suppressed") holds
structurally, not just by convention. `handleCapture`, the other writer, is unreachable while the
control is hidden.

The two shipped tests pin exactly the right things and are the ones I would have asked for:
`location-coordinates.test.tsx` asserts `onCoordinates` is never called on a pick with the group
off *while* street and city still write; `field-visibility.test.tsx` renders a **coordinates-
bearing** fixture to catch the card — the reviewer's note that the registry-driven loop could not
see it (absent from both arms of a no-coordinate fixture) is correct and was worth the extra test.

**The brief's honesty question — "does the visitor learn the pick was address-only?"** No, and
that is right: with the group off there is no coordinate control, no lookup notice and no
coordinate card anywhere on the screen, so nothing the visitor asked for failed to happen. There
is no dangling state either — `setLookupNotice('none')` still runs but the notice only renders
inside the gate. Silence is the correct treatment here; an explanation would be describing a
feature the visitor switched off.

**Recorded, not a finding:** §85a does not state for R-1b the boundary §86a states for its twin.
Probe-verified that the behaviour is the same and correct — a name autofilled *before* the field
was hidden stays put and still prints, the pane footnote's "already entered" case. Worth one
sentence in §85a so the two fixes read as one rule rather than two decisions.

---

## The LOWs

- **L-1 → R-8 `db7a4ef` — FIXED.** The placeholder now branches: it asks for the date while the
  picker is on screen and reads *"Turn First Recorded Date back on in Settings → Form Fields to
  calculate retention"* when it is not. Both arms pinned, and the test also asserts the picker
  label really is absent — so it cannot pass on a mis-wired fixture.
- **L-2 → R-17 `ca0169c` — FIXED.** *"This profile hides nothing **by default**."* /
  *"Hides 1 screen · 12 fields **by default**."* Scoped to what `describeProfile` actually counts.
  The added test puts the visitor on `forensic` with Cameras switched off and asserts both the
  line and the off switch — i.e. it pins the exact falsification I reported.
- **L-3 → R-18 `6937a15` — FIXED, and better than what I proposed.** The promise is gone and the
  copy now *names the failure mode* ("if nothing happens, this machine has no mail app
  registered"), with `SUPPORT_EMAIL` printed below as selectable text. The commit's reasoning —
  degrade to something usable rather than to silence — is the right generalisation.
- **L-4 → R-19 `73daa90` — FIXED.** `settingsPreview('export-security')` returns `'Not applied'`
  unconditionally; the test asserts it across all four flag combinations, so the row cannot drift
  back to a claim. The switches stay live (D6's cosmetic arm) and the pane's reveal logic is
  untouched, so the control still visibly does something in-pane — no dead-control impression.
  §84c records the ruling.
- **L-5 → A1 — FIXED as documentation.** The PR body's bullet, the effect's own doc comment
  (`DemoExperience.tsx:1023-1026`) and §85a now all carry the corrected sentence, and my probe
  confirms observed behaviour matches it clause for clause — including "a field left empty,
  *including one the visitor cleared*, is filled again on the next arrival."

---

## Fix-introduced swallow hunt — clean

- **"Profile hides the field WHILE Completion is open"** — still unreachable. `openSettings` has
  exactly two callers (`DashboardScreen`, `CasesScreen` headers) and no gear was added to the
  wizard drawer, so §82h's condition holds unchanged. The only orderings that exist are
  hide-then-arrive (suppressed) and fill-then-hide (kept, "already entered").
- **R-4 `111b4d8`** (adjacent to my surfaces) is a genuine stale-derivation fix, not a new
  swallow: `profile`/`formOverrides` joined the explore memo's deps, closing a case where toggling
  Cameras off with the sheet open left a stale row and an inflated denominator on the rail. All
  visibility-reading derivations now have complete deps (`:632`, `:695`, `:700`); `drawerStatus`
  and `mediaTools` are computed inline per render.
- **R-23** made `selectDrawerStatus`'s second argument a **required** `DrawerStatusMode`
  (`FormVisibility | 'count-all'`). This is a strengthening in my lane's direction: "forgot to
  pass visibility" was previously a silent count-everything and is now a compile error, and the
  map-pin caller states its intent explicitly (`selectors.ts:323`, `COUNT_ALL_FIELDS`), preserving
  the §82f asymmetry.

---

## Fix-delta summary

| Severity | Opened | Fixed | Remaining |
|---|---|---|---|
| CRITICAL | 0 | — | 0 |
| HIGH | 0 | — | 0 |
| MEDIUM | 3 | 3 | 0 |
| LOW | 5 | 5 | **1 new (D-1)** |

Fallback honesty: **yes** · Failure-cause distinctions preserved: **one collapse introduced (D-1)**
Partial results flagged: **yes** · Stale-write safety: **yes** · Breadcrumbs intact: **yes**

**Verdict: APPROVE** — every finding in this lane is closed. D-1 is a LOW that does not gate the
merge; it is a two-word copy change or a `boolean` → `SaveStateKind` widening whenever the fix
round next opens that pane.

**Worktree for cleanup:** `.../scratchpad/worktrees/p7-silentfail` (detached @ `2f57ba1`;
`node_modules` is a symlink into the shared `parity-p7` worktree — remove the symlink, not its
target). No commits, no branch, probes deleted, `git status` clean.
