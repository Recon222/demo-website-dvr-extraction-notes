# P2 review — lane: SILENT FAILURES

**Branch:** `feat/parity-p2` @ `9f5c01a` · **Diff:** `git diff master...feat/parity-p2`
**Lane charter:** `.claude/agents/silent-failure-hunter.md` — *"where does a real failure become
invisible to the visitor, the operator, or the next maintainer?"*, plus this repo's defining rule:
**a fallback must announce itself; substituted data presented as the visitor's real result is the
worst failure this codebase can have.**

**Severity vocabulary:** BLOCKER (charter CRITICAL) / MAJOR (charter HIGH) / MINOR (charter
MEDIUM–LOW). Read-only lane; no files outside this one were touched.

**Phase deliberate-choices honoured (not re-flagged):** D10 divergence §39.5 · §M13 refutation
(no 2σ filter) · `asyncUtilTimeout` 5000 · AlertDialog scrim/focus semantics · phone bugs
deliberately not copied · snapshot v4 union · orchestrator merge commits · the today-guess
(`assumedDate`) gate · ledger §29–§42.

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 2 |
| MINOR | 4 |

**Verdict: REVISE.**

Fallback honesty (every substitution announced): **no** — SF-1, SF-3.
Failure-cause distinctions preserved: **collapsed** in two places — SF-4, SF-5.
Partial results flagged (not silently short): **no** — SF-2.
Async cancellation / stale-write safety: **yes** (see Verified-clean §A).
Operator breadcrumbs intact: **yes** — no prior-review `console.warn`/`console.error` was removed;
two were added (`reconcileSections`, `reverse-geocode`).

---

## SF-1 [MAJOR] features/demo/ui/DemoExperience.tsx:144-147, 848-861

**Claim.** The new "Progress Saved" alert makes an unconditional visitor-facing promise that the
work is persisted. Nothing on that path checks whether persistence is actually running. When it
is not — and there are two realistic ways it is not — the demo reports a save that never
happened. This is the one failure mode the repo's honesty bar names explicitly, and it is **new
in this diff**: before P2 the demo never told the visitor anything about persistence.

**Evidence.**

```
DemoExperience.tsx:144-147
const PROGRESS_SAVED_TITLE = 'Progress Saved'
const PROGRESS_SAVED_BODY =
  'You can continue this location later from the Cases screen.\n\n' +
  'Your work stays in this browser tab — it survives a refresh, but closing the tab starts fresh.'
```

`saveProgress` (`:848-861`) renders that copy with a single OK arm and no precondition. The
persistence it asserts is wired at `:295-304`:

```
const handle = persistDemoStore(store, sessionStorageOrNull())
```

and `sessionStorageOrNull()` (`:157-164`) returns `null` on any throw, while
`persistDemoStore` (`engine/store/persistence.ts:513`) answers a `null` storage with
`NOOP_HANDLE` (`:498`) — a silent, total no-op. The module's own header states the policy:
*"any write problem (quota, security) is swallowed"* and *"Write failures never surface to the
VISITOR"* (`:501-505`). That policy was defensible while the demo made no claims. The alert
now makes one.

**Adversarial sequences (two).**

1. *Storage unavailable.* Open `/demo` in a browser where `window.sessionStorage` access throws
   or is a no-op — enterprise storage policy, a privacy extension, an embed whose `sandbox`
   lacks `allow-same-origin`. Boot succeeds (`loadSnapshot` returns `null`, "boot empty" is a
   legitimate first-visit state, indistinguishable). Build a case, open Completion with a
   required field blank, press **Complete & Save** → *Missing Required Fields* → **Save
   Progress** → the alert says the work survives a refresh. Refresh: everything is gone.
2. *Write failure after the promise.* `persistDemoStore`'s save catch
   (`persistence.ts:530-533`) deliberately **clears the stale snapshot** on a quota/security
   throw so the tab "boots empty on refresh". The visitor was told, seconds earlier, that a
   refresh is safe. The `console.warn` there is the operator's breadcrumb — the visitor gets
   nothing.

**Observable wrong behaviour.** Visitor sees: *"Progress Saved … it survives a refresh."*
Log shows: nothing at all in case 1 (the no-op path has no breadcrumb), one dev-gated warn in
case 2. Reality: zero bytes written, and in case 2 the previously-good snapshot deleted.

**Suggested fix (small, same primitive).** Make the claim conditional on the fact.
`persistDemoStore` already knows — have it return `live: boolean` on `PersistenceHandle` (or
simply hold `sessionStorageOrNull() !== null` in the ref alongside `handle`), and branch the
alert body:

- live → today's copy, unchanged;
- not live → drop the second paragraph and say it plainly, e.g. *"This browser isn't storing the
  session — your work will be lost if you refresh or close the tab."*

That is one boolean and one ternary, and it keeps the phone-verbatim first line intact. (Case 2
additionally deserves a one-line demotion of the promise once a write has failed — the same
boolean flipped by the save catch covers it.)

**Confidence: high.** The copy, the no-op handle, and the missing precondition are all in the
diff or directly reachable from it; the only judgement call is how common a storage-blocked
browser is, which affects severity, not correctness.

---

## SF-2 [MAJOR] features/demo/engine/store/create-store.ts:433-449 · features/demo/engine/logic/notes/scopes-formatter.ts:65-81

**Claim.** P2.1 re-pointed the court document's recovered-footage line at
`form.extractedScopes` (Path A wins over requested scopes). `generateExtractedScopes` drops
non-canonical scopes per-entry and records that as `extractedScopesPartial: true` — but
**`extractedScopesPartial` has no consumer anywhere in the repo**. It is written, persisted, and
read by nothing. So a short recovered-footage bullet in the Case Notes PDF carries no marker of
its own, and there is a reachable state in which nothing else in the document warns either.

**Evidence.**

```
create-store.ts:443-449
? { ...l, form: { ...l.form, extractedScopes: extracted, extractedScopesPartial: dropped > 0 } }
```

```
$ grep -rn "extractedScopesPartial" features lib app --include="*.ts" --include="*.tsx" | grep -v __tests__
features/demo/engine/types/index.ts:225        # declaration
features/demo/engine/content/seed.ts:65        # blank form
features/demo/engine/store/create-store.ts:446 # the write
features/demo/engine/store/persistence.ts:230  # schema
# …no UI read, no PDF read.
```

Contrast `adjustedScopesPartial`, which *is* consumed and *does* annotate
(`engine/logic/pdf/case-notes.ts:146-158`, the red `&#9888;` note). The charter's own
description of `generateExtractedScopes` as the model citizen says the flag exists "so the
document can annotate rather than silently omit" — the document does not.

`formatScopes` then filters silently:

```
scopes-formatter.ts:32-34 / :77-79
const validScopes = extractedScopes.filter(scope => scope.startDateTime && scope.endDateTime)
```

**Adversarial sequence (the case where NOTHING warns).** Two requested real-time scopes, one
with a non-canonical time (free-text import path — the exact case
`generateExtractedScopes`'s per-entry isolation exists for):

1. **Calculate** → scope A → extracted; scope B throws → `dropped = 1`,
   `extractedScopes = [A]`, `extractedScopesPartial = true`, dev-warn emitted.
   At this instant `selectAdjustedScopes` also blanks B, so `adjustedScopesPartial` is true and
   the PDF *would* carry its red note. Mitigation holds — so far.
2. The visitor goes back to **Requested Scope** and fixes B's times (a typo'd hour, say) and
   does **not** press Calculate again. There is no prompt to.
3. `selectAdjustedScopes` recomputes from live state → both rows convert →
   **`adjustedScopesPartial` is now `false`** → the PDF's red note disappears.
   `form.extractedScopes` is still the stale one-entry list from step 1.
4. **Preview PDF.** Flow F reconciles read-only from `extractNotesRelevantData(loc)`, which
   reads `form.extractedScopes` → `formatScopes` Path A → one window.

**Observable wrong behaviour.** The Adjusted Scope table lists **two** converted ranges; the
Case Notes body says *"• Recovered <cameras A> from … to … (DVR time)"* — **one**. No warning
anywhere in the document, no dev-warn (the one that fired was in step 1 and is long gone from
the console context), and `extractedScopesPartial` — the flag that still says `true` — is read
by nothing. A forensic-style document reports a narrower recovery than the record supports.

**Suggested fix.** Consume the flag the store already sets, mirroring `adjPartialNote`:

- thread `extractedScopesPartial` into `CaseNotesData` in `selectCaseNotesData`, and render the
  same `&#9888;` note adjacent to the Case Notes block when it is set
  (`case-notes.ts` already has the exact idiom at `:146-158`);
- optionally annotate the Extracted Scope screen too (it already has a copy block at the top).

Either alone closes the silent-omission half. Do **not** change `formatScopes` — it is a
verbatim phone port and its filter is correct behaviour for a *flagged* partial.

**Note on the tracked ledger.** deferred §15's un-defer trigger ("next time `selectors.ts` /
`time.ts` are touched") has fired and this branch resolves the two items it named
(`roundTo5Min` now throws; `selectAdjustedScopes`'s silent catch is documented under R-33). The
unconsumed flag is the residue of the same family and is in scope on that trigger.

**Confidence: high** for the unconsumed flag and the notes re-pointing (both mechanical);
**medium** for step 2/3 of the trace — it depends on the visitor not re-pressing Calculate,
which nothing forces them to do but which a careful user would.

---

## SF-3 [MINOR] features/demo/engine/content/seed.ts:41 · features/demo/ui/screens/OcrCaptureScreen.tsx:75-78

**Claim.** The confirm card shows *"OCR confidence — High confidence — result looks good"* in
green for **every** sample frame. There is no recogniser in this demo; `0.93` is a constant. The
frame is honestly declared as a sample on the aim screen, but the confidence is presented as a
measurement of the read with no marker — and the diff now shows the identical green chip above
two frames whose own machinery reports the opposite.

**Evidence.**

```
seed.ts:41
/** Fixed OCR score for the sample frames — there is no recogniser here to score against. */
export const OCR_SAMPLE_CONFIDENCE = 0.93
```
```
DemoExperience.tsx:790     const conf = getConfidenceLevel(OCR_SAMPLE_CONFIDENCE)
OcrCaptureScreen.tsx:76-77 <span style={label12}>OCR confidence</span>
                           <span style={{…color: result.confidence.color}}>{result.confidence.label}</span>
```

The code comment is honest to the *maintainer*. Nothing on screen is.

**Adversarial sequence.** Time Offset → capture icon → **"Time only"** (a new frame this diff
adds). The card renders, top to bottom:

- *"OCR confidence — High confidence — result looks good"* (green, `#10d177`), then
- a red `role="alert"`: *"No date on the DVR display … The date below is **assumed**"*.

Same for **"Ambiguous date"**: the green High-confidence chip sits directly above a yellow
`DateDisambiguationWarning` that renders *only because* the resolver returned
`confidence: 'low'` (`DateDisambiguationWarning.tsx:31` early-returns on `'high'`).

**Observable wrong behaviour.** A visitor evaluating a forensic tool reads a green
"result looks good" over a red "this date is assumed". The demo's one fabricated number is the
one number it does not label as fabricated.

**Suggested fix.** Cheapest honest option: label the chip's provenance —
`OCR confidence (sample frame)` — or suppress the chip entirely for the `ambiguous` /
`timeOnly` frames, which is the truthful reading (no recogniser scored them).

**Scope note.** Pre-existing in *value* (master had `getConfidenceLevel(0.93)` inline at the same
call site) but the diff re-homes the constant into `seed.ts` and multiplies the frames it covers
from one to three, which is what makes the contradiction visible. Ledger **§40/37f is adjacent
but different** — it covers the *rail narration* overclaiming ("real in-browser OCR", "Live
webcam capture") and defers that copy to P4; it does not cover this on-screen chip. If the
orchestrator prefers, folding this into §40 as a fourth deferral is a reasonable disposition —
but it should be a decision, not an omission.

**Confidence: high** on the facts; **medium** on whether this belongs in P2 or folds into §40.

---

## SF-4 [MINOR] features/demo/ui/inputs/reverse-geocode.ts:22-31 · features/demo/ui/inputs/LocationFields.tsx:78-91

**Claim.** A *partially* successful reverse geocode is indistinguishable from a fully successful
one, and it overwrites operator-typed data with empty strings. The "coordinates were kept"
notice — the module's whole honesty affordance — does not fire.

**Evidence.**

```
reverse-geocode.ts:26-30
const streetAddress = context.address?.name ?? ''
const city = context.place?.name ?? ''
// Nothing usable — treat as no match rather than blanking the operator's typed address.
if (!streetAddress && !city) return null
return { streetAddress, city }
```

The guard is `&&` — it only catches the *both*-empty case. One-empty returns a truthy result:

```
LocationFields.tsx:79-81
const address = await reverseGeocode(fix.lat, fix.lng)
if (address) onChange({ streetAddress: address.streetAddress, city: address.city })
else setLookupFailed(true)
```

`onChange` flows to `SubmissionScreen.handleLocationChange:112` —
`if (updates.city !== undefined) onChange('city', updates.city)` — so `''` is written through.

**Adversarial sequence.** Operator types City ("Caledon"), taps **Use Current Location** with
Geocode ON. Mapbox returns a feature with `context.address` but no `context.place` — routine for
rural/unincorporated addresses, and also what a token with reduced context permissions returns.
`pickFromReverseFeature` yields `{ streetAddress: '…', city: '' }` → truthy → the City field is
blanked, `lookupFailed` stays `false`, no notice renders.

**Observable wrong behaviour.** The typed City vanishes with a *success*-shaped outcome. Because
`formatAddress` drops empty components, the loss propagates into the PDF header, the notes
attendance line, the Cases row and the map sheet — all of which now compose an address the
operator did not enter and was never told was changed. The comment two lines above the guard
states the intent ("rather than blanking the operator's typed address") — the `&&` doesn't
deliver it.

**Phone parity note.** The phone's `LocationForm.handleGpsCapture` writes both fields the same
way (`src/features/location/components/LocationForm.tsx:137-141`), so the *overwrite* is
verbatim. The demo's divergence is upstream: the phone's `reverseGeocode` rejects rather than
returning a half-empty result, so the phone never reaches this shape.

**Suggested fix.** Write only what came back, and tell the truth about the rest:

```ts
if (address) {
  onChange({
    ...(address.streetAddress ? { streetAddress: address.streetAddress } : {}),
    ...(address.city ? { city: address.city } : {}),
  })
  if (!address.streetAddress || !address.city) setLookupFailed(true)   // partial → say so
} else setLookupFailed(true)
```

(or return a discriminated partial from `pickFromReverseFeature` and let the notice copy
distinguish "no address found" from "only part of the address came back".)

**Confidence: high.** The `&&` vs the stated intent is unambiguous; the Mapbox response shape is
the one judgement call, and it is a documented context field that is genuinely optional.

---

## SF-5 [MINOR] features/demo/engine/logic/gps.ts:190-208 · features/demo/ui/inputs/GpsCaptureControl.tsx:122-126

**Claim.** `toGpsFix` range-validates the coordinates but not the timestamp it converts, and the
one consumer chain has a `.then` with no `.catch`. A malformed `GeolocationPosition` therefore
produces a rejected promise nobody handles and a button that resets to idle with **no fix and no
failure message** — the dead-button shape the charter calls out.

**Evidence.**

```
gps.ts:195-206
const invalid = validateCoordinates(best.lat, best.lng)   // lat/lng only
if (invalid) return { ok: false, failure: invalid }
return { ok: true, fix: { …, capturedAtIso: new Date(best.timestampMs).toISOString(), … } }
```

`new Date(NaN).toISOString()` throws `RangeError: Invalid time value`. `captureGps` does not
catch it; `useGpsCapture.capture` has `try { … } finally { … }` with **no** catch
(`useGpsCapture.ts:85-108`), so the rejection propagates; and:

```
GpsCaptureControl.tsx:123-125
void capture().then((fix) => {
  if (fix) onCapture(fix)
})
```

**Adversarial sequence.** A geolocation implementation that supplies `coords` but not a numeric
`timestamp` — a location-spoofing extension, an older embedded WebView, or any test/manual stub
of the injectable `GeolocationLike` seam. Tap **Use Current Location**.

**Observable wrong behaviour.** Spinner runs, `finally` clears `isCapturing`, the button returns
to "Use Current Location". No `failure` is set, so the `role="alert"` line
(`GpsCaptureControl.tsx:169-173`) never renders; no coordinate card appears. Visitor: the button
does nothing, forever, with no reason given. Operator: an unhandled promise rejection in the
console — real, but it is not a breadcrumb the code chose, and it is the only signal.

The neighbouring failure arms are exemplary by contrast (`PERMISSION_DENIED`, `TIMEOUT`,
`UNSUPPORTED`, `LOCATION_UNAVAILABLE` all carry distinct typed copy). This one input class
collapses to "nothing happened".

**Suggested fix.** Two lines, either sufficient, both cheap:

1. In `toGpsFix`, guard the timestamp alongside the coordinates —
   `if (!Number.isFinite(best.timestampMs)) return { ok: false, failure: { code: 'LOCATION_UNAVAILABLE', … } }`
   (or a dedicated code, since `GPS_ERROR_CODES` is already the extension point).
2. In `GpsCaptureControl.onClick`, give the `.then` a `.catch` so any future throw in the chain
   still reaches the visitor as a failure line rather than an unhandled rejection.

**Confidence: medium.** The code path is certain; the trigger requires a non-spec-conformant
geolocation provider, which is why this is MINOR rather than MAJOR. `capturedAtIso` is currently
consumed by no one, so the guard costs nothing behaviourally.

---

## SF-6 [MINOR] features/demo/ui/inputs/capture-gps.ts:168

**Claim.** This phase made `GpsCoordinates.accuracyM` optional *specifically* to stop a
coordinate nobody measured from rendering fabricated precision. The capture path still defaults a
missing accuracy to `0` — the single value that renders as **"±0m · Excellent"** in green.

**Evidence.** The type change and its stated reason (`engine/types/index.ts:99-112`, snapshot v3
in `persistence.ts:63-65`):

> *"Filling a placeholder `0` here would render as "±0m · Excellent" — fabricated precision on a
> coordinate nobody measured."*

The capture path, unchanged:

```
capture-gps.ts:166-168
// `accuracy` is required by the spec but defensively defaulted (the phone defaults the
// nullable native value to 0 the same way, gps-service.ts:206).
accuracyM: position.coords.accuracy ?? 0,
```

**Adversarial sequence / observable behaviour.** Any provider that omits `accuracy` (the same
class of stub as SF-5). `0` then:

- satisfies `meetsTargetAccuracy(sample, 50)` on the **first** reading, so the multi-sample loop
  exits immediately — the demo's headline "this is a forensic multi-sample procedure" progress
  line reports `Sample 1 of 10`;
- flows to `getAccuracyRating(0)` → `{ label: 'Excellent', tone: 'success' }` and
  `formatAccuracy(0)` → `±0m`, both rendered in `#10d177` green
  (`CoordinateDisplay.tsx:105-123`).

An unmeasured fix is presented as the most precise one the tool can produce. `CoordinateDisplay`
already handles `accuracyM === undefined` correctly (chips omitted) — the honest value is
representable and simply isn't produced.

**Suggested fix.** Produce `undefined` instead of `0`:

```ts
accuracyM: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : undefined,
```

This ripples into `GpsSample.accuracyM` / `GpsFix.accuracyM` (currently required `number`) and
`selectBestSample`'s comparison — a small, contained type change; treat a sample with no accuracy
as never winning the "most accurate" comparison and as never satisfying `meetsTargetAccuracy`.
If that ripple is judged not worth it this phase, the alternative is to keep the `0` but state
plainly in the comment that it is unreachable for spec-conformant providers and *therefore* the
`?? 0` is dead — a defaulted value that can only ever fire in the one case where it lies is worse
than no default.

**Confidence: medium.** Mechanically certain; narrow trigger (same provider class as SF-5), and
it is phone-verbatim — but the phone has not yet made accuracy optional, and this branch has.

---

## Verified clean (checked, no finding — recorded for the fix-delta)

**A. Async cancellation / stale writes.**
- `useGpsCapture` — `runningRef` mutex (re-entry), `abortedRef` set in the unmount cleanup and
  re-checked *after* the await before every `setState`; `captureGps` re-checks `isAborted()`
  between attempts and once more before `toGpsFix`, returning `null` (neither fix nor failure) for
  an abandoned capture. Correct, and the `null`-vs-outcome tri-state is the right shape.
- `optionsRef` synced in an effect rather than during render, with the reason written down.
- Import generation-token discipline (H1/H2) survives intact and is *extended* correctly: R-45
  clears `lastRealStageRef` at both token bumps and on cancel — closing a real stale-read hole
  where a throw in a new run's pre-seed window published the *previous* run's stage.
- R-46's `tally.unaccounted` makes the aborted-batch denominator sound: every selected file now
  lands in `locations` or `failures`, so `deriveTerminalOutcome`'s sum is complete by
  construction, and the unattempted rows carry their own honest string
  (`UNEXPECTED_ERROR` is deliberately unmapped in `ERROR_MESSAGES`).
- Notes commit flows read `getState()` fresh and every one early-returns on no-change, so blur +
  unmount double-fire is a genuine no-op rather than a spurious `manuallyEdited` flip.

**B. The notes reconciler (court-document path).**
- `reconcileSections` preserves references for unchanged sections, so `changed` — which gates the
  store write — is exact rather than heuristic; edited sections are never clobbered;
  unknown stored ids are dropped **and counted as a change** (without which the healed array is
  never persisted), with a dev-gated `console.warn`.
- Flow F (`selectCaseNotesData`) reconciles **read-only** before assembling, so the PDF cannot
  embed stale un-edited notes even if the Notes screen was never opened, and writes nothing back.
- `isSectionStale`'s empty-fresh exemption is correct: offering "reset" when the refresh is
  nothing would be a nudge to erase authored text.
- `formatTimestamp`'s two failure modes are deliberate and *better* than the alternative —
  blank → `''` (absent), unparseable → the raw string (visible in the document). Returning `''`
  for both is what silently dropped sections; this port does not.
- `formatTimeOnScene` propagates NaN to an explicit *"unable to calculate (invalid timestamp)"*
  rather than a confidently-wrong "0 minutes". Exactly right for a court document.
- `assembleNotesString` sorts unknown ids last rather than dropping them.
- `scrapAllNotes` keeps `generatedContent` as the frozen baseline (so deleted+stale restore rows
  still work) in one atomic write; `resetNoteSection` is the only path that clears
  `manuallyEdited`; addenda survive reset/restore and never flip `manuallyEdited`.
- The `restoreAll` dialog's duplicate-content risk is stated in its own body copy
  ("keeping Additional Notes may repeat the restored sections") — declared, not hidden.

**C. GPS failure arms — no fabricated coordinate anywhere.**
Every arm is typed and surfaced: `PERMISSION_DENIED` (terminal, not retried — correct: retrying
a denial burns budget and re-prompts), `TIMEOUT` (commits real samples in hand rather than
discarding them on a stopwatch — good), `LOCATION_UNAVAILABLE` (attempts exhausted),
`UNSUPPORTED` (the browser-only arm, with copy that says plainly nothing was captured),
`INVALID_COORDINATES`. There is no sample/placeholder coordinate fallback in the capability —
verified by reading every branch of `capture-gps.ts` and `gps.ts`. `maximumAge: 0` correctly
refuses a cached fix. The two residual gaps are SF-5/SF-6 and neither is a substitution.

**D. Reverse geocode.** Soft-fail contract preserved *and* the `console.warn` breadcrumb is
present with the L2 reasoning restated (expired/rate-limited token vs "no address here"). The
demo additionally surfaces failure to the visitor where the phone is silent (§41/37e) — a
deliberate improvement. The residual is SF-4's partial case only.

**E. Completion gate.** `runGate()` re-runs against **live** store state in the handler rather
than trusting the render-scope `gateOutcome` — correct, and the reason is written down. The
gate is evaluated against the location's **owning** case (`loc.caseId`), not the selection pair
(R-19). Both blocked arms surface: `previewCaseNotes` alerts with *this run's* errors (a
deliberate, documented improvement over the phone's first-tap-empty-alert bug) and
`completeLocation` uses the phone's verbatim two-button alert. Errors auto-clear when the data
becomes valid and are dropped on location switch. The alert is force-closed on leaving Completion
because the demo's rail can navigate under it — a real difference from an OS-modal alert,
correctly handled.

**F. `roundTo5Min`'s new throw + per-entry isolation.** The empty-input passthrough is right
(`''` is *absence*, which the model represents explicitly, not a broken value); everything else
throwing matches `applyTimeOffset`. Sole caller confirmed by grep
(`create-store.ts:420-421`); it is exported from the engine barrel but has no other consumer.
`requireCanonicalTime` gives the D10 passthrough the identical guard, so the passthrough is not
the one path that carries "not-a-date" onto the extracted-scope screen. The per-entry `try` still
counts (`dropped++`), still dev-warns, still never abandons scopes already computed. The
throw is genuinely surfaced-not-swallowed — with the one caveat that the *state* half of that
surfacing has no consumer (SF-2).

**G. `PdfPreview` print verdict (R-47).** A strict improvement: the `beforeprint` listener now
stays armed past the interim verdict so a late signal *retracts* a wrong "blocked" notice, the
attempt is torn down at the next attempt and on unmount (no orphaned timer re-asserting an old
verdict), and the throw path is a definitive verdict. No leak, no false negative that sticks.

**H. Snapshot v4.** `noteSectionSchema` uses `z.enum(NOTE_SECTION_IDS)` — the domain's own tuple
(device 3), so the union and the schema cannot drift. `accuracyM` optional in both
`cameraEntrySchema` and `demoLocationSchema`, matching the widened domain type. Version + key
bumped together; the union-of-v3-and-v4 rationale is recorded. An older snapshot is discarded and
removed, which is the documented (and correct) pre-release behaviour.

**I. Breadcrumb audit.** No `console.warn` / `console.error` present on `master` was removed by
this diff — `git diff master...feat/parity-p2 -- features lib app | grep -E '^-.*console\.'`
returns nothing. Two were **added**: `reconcileSections`' unknown-id drop warn
(`section-reconciler.ts:83-85`, dev-gated) and the reverse-geocode soft-fail warn
(`reverse-geocode.ts:45`, restating the L2 reasoning). `applyImport`'s non-canonical-time warn
and `generateExtractedScopes`' dropped-scope warn are pre-existing and survive unchanged.

---

## Resume notes (for the fix-delta pass)

When resumed, verify in this order — each item names the exact thing to re-check:

1. **SF-1** — does `saveProgress`'s alert body now branch on whether persistence is live?
   Grep `PROGRESS_SAVED_BODY` and confirm a second, honest string exists and that something
   actually feeds it the boolean (`persistDemoStore` return value, or a
   `sessionStorageOrNull() !== null` capture). A test that renders the alert with storage
   unavailable is the pin.
2. **SF-2** — grep `extractedScopesPartial` again: it must have at least one consumer outside
   `engine/`. Confirm the Case Notes PDF renders a warning when it is set, and that the
   "fixed the scope but didn't re-Calculate" trace now produces a marked document.
3. **SF-3** — check `OcrCaptureScreen.tsx:75-78`: the chip is either labelled as sample-derived
   or suppressed for the `ambiguous`/`timeOnly` frames — *or* a §40 deferral entry exists
   naming it explicitly (a decision, not silence).
4. **SF-4** — `LocationFields.tsx` must not write an empty `city`/`streetAddress` over a
   non-empty one, and a partial match must set `lookupFailed` (or an equivalent notice).
5. **SF-5** — `toGpsFix` guards `best.timestampMs`, and/or `GpsCaptureControl.onClick` has a
   `.catch`.
6. **SF-6** — `capture-gps.ts:168` no longer defaults to `0`, or the comment states the default
   is dead for conformant providers and explains why it is kept.

Regression watch for the fix round (things that were **clean** and must stay clean): the
reference-preservation in `reconcileSections` (a "fix" that rebuilds sections unconditionally
turns every Notes focus into a store write and breaks the zero-write clean pass); the
`isAborted()` re-check *after* the await in `captureGps`; the `console.warn` set listed in §I.
