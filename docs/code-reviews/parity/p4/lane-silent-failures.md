# P4 review — SILENT-FAILURES lane

**PR:** #33 `master..feat/parity-p4` — media capture, audio, OCR camera (P4.1–P4.7 + explore rider)
**Lane:** silent-failure-hunter (`.claude/agents/silent-failure-hunter.md`)
**Scope read:** every non-test `.ts`/`.tsx` in the diff (33 files), plus the store actions and
registries they call into. Phone repo consulted read-only for two parity facts.
**Context honoured:** PR body's "deliberate choices — DO NOT RE-FLAG" list, `deferred.md` §§58–64,
`features/demo/CLAUDE.md`.

Severities use the orchestrator's `blocker / major / minor` vocabulary, with the lane rubric's
label in parentheses.

| Severity | Count |
|---|---|
| blocker (CRITICAL) | 0 |
| major (HIGH) | 2 |
| minor (MEDIUM) | 2 |
| minor (LOW) | 2 |

**Verdict: REVISE** (two majors, no blockers).

---

## S-1 — [major (HIGH)] Saving an audio note with no location open discards the recording, and says nothing

**File:** `features/demo/ui/DemoExperience.tsx:698-704` (the missing guard is at :699–702)
**Also:** `features/demo/ui/screens/AudioRecordingFlow.tsx:174-185` (`handleSave`),
`features/demo/engine/store/create-store.ts:1067-1069` (`addMedia`'s early return)

```ts
const saveAudioNote = (captured: CapturedMedia, meta: MetadataFormValue) => {
  const st = store.getState()
  st.addMedia('audio', buildMediaItem({ id: `ui-m${uiSeq++}`, captured, filename: meta.filename, caption: meta.caption }))
  st.closeLaunch()
}
```

**Adversarial sequence (one click from boot, no dev tools, no exotic browser):**

1. Boot `/demo`. `initialState()` is `currentLocationId: null`, `view: 'cases'`
   (`create-store.ts:341-354`).
2. Rail checklist → **Record Audio**. `StoryRail`'s `onJump` is
   `store.getState().setView(v)` (`DemoExperience.tsx:2080`) and `ExploreChecklist`'s rows are
   plain ungated buttons (`ExploreChecklist.tsx:70-92`); the rider added
   `{ id: 'audioRecording', …, jumpTo: 'audioRecording' }` to `EXPLORE_ITEMS`
   (`explore.ts:57`). No location is required, and none is created.
   *(Second path: rail → any wizard step → menu → Media accordion → Record Audio. §59f
   deliberately leaves both capture rows ungated, so this is by design.)*
3. `AudioRecordingFlow` mounts, opens the microphone, the visitor records a take, stops, names
   it, presses **Save Audio**.
4. `handleSave` → `onSave(captured, meta)` → `saveAudioNote` → `addMedia` hits
   `const id = get().currentLocationId; if (!id) return` and **does nothing**.
5. `st.closeLaunch()` runs anyway → the screen closes to `currentChapter` (`cases` at boot).
6. Back in the flow, `capture.handOff()` runs unconditionally
   (`AudioRecordingFlow.tsx:182`) — the registry **forgets** the `blob:` URL without revoking
   it, so the take's bytes are also pinned for the life of the tab.

**Observable wrong behaviour:** the visitor's recording is destroyed. Nothing is shown — no
banner, no toast, no notice. And because `saveAudioNote` also emits **no success confirmation**,
the failed save and a successful save are byte-identical from the visitor's seat: the screen
closes, and that is all that ever happens. They cannot tell which one they got.

**This is not a demo-vs-phone divergence — it is a dropped port.** The phone guards exactly this
at `app/(form)/audio-recording.tsx:106-120`:

```
text1: 'Cannot Save Audio',
text2: 'No location selected. Please navigate from a case first.',
```

and confirms the good path at `:184-189` (`'Audio Saved'` / `` `${result.userFilename} saved to case` ``).
Neither string exists anywhere in `features/demo/` (`grep -rn "Cannot Save Audio\|Audio Saved"`
→ nothing). The photo/video sibling **did** port both — `CANNOT_SAVE_MEDIA_NOTICE`
(`DemoExperience.tsx:239`) and `mediaSavedNotice` (`:243`) — and `saveCapturedMedia`
(`:658-672`) carries the guard with a comment naming this precise hazard: *"`addMedia`
early-returns with no `currentLocationId`; without this the capture would vanish into a no-op
save and the visitor would be told nothing."* P4.3 wrote that sentence; P4.6 landed on a
parallel branch and the assembly did not reconcile the two save arms.

**Fix shape:** give `saveAudioNote` the same three lines `saveCapturedMedia` has, and the same
boolean contract (§60c) so `handOff()` stops being unconditional:

```ts
const saveAudioNote = (captured: CapturedMedia, meta: MetadataFormValue): boolean => {
  const st = store.getState()
  if (!st.currentLocationId) { setNotice(CANNOT_SAVE_AUDIO_NOTICE); st.closeLaunch(); return false }
  st.addMedia('audio', buildMediaItem({ … }))
  setNotice(audioSavedNotice(meta.filename))   // phone: 'Audio Saved — <name> saved to case'
  st.closeLaunch()
  return true
}
```

and in `AudioRecordingFlow.handleSave`, `if (onSave(captured, meta)) capture.handOff()` — which
also closes the URL leak (a refused save then falls to the unmount sweep, exactly as
`MediaCaptureScreen.onAccept:293-302` already does). Copy sites belong beside the existing two
constants, joined `text1 — text2` like every other ported notice.

**Related, PRE-EXISTING and out of this diff (do not fix here, worth a ledger line):**
`confirmOcr` (`DemoExperience.tsx:1433-1449`) → `calcOffset` → `calculateOffset`
(`create-store.ts:721-724`, guard at `:724`) has the identical shape — reach Time Offset from the rail with no
location, run an OCR read, press "Use this & calculate", and the launch screen closes having
computed nothing, silently. Unchanged by P4, so not filed as a P4 finding, but the guard added
for S-1 should be the pattern applied there too.

---

## S-2 — [major (HIGH)] A live OCR recognition landing after the visitor picked a sample frame silently replaces their result — and its failure notice lands where nothing renders it

**File:** `features/demo/ui/screens/OcrCaptureScreen.tsx:226-261` (`runLiveCapture`), with
`:283` (confirm-stage early return), `:526-545` (the notice block — aim stage only),
`:548-553` (the three sample buttons, **not** gated on `reading`)

```ts
const outcome = await recognize(grab.blob)
if (!aliveRef.current) return
if (!outcome.ok) { setNotice(outcome.message); return }
onLiveRead({ rawText: outcome.text, confidence: outcome.confidence, imageDataUrl: grab.dataUrl })
```

`aliveRef` is the only post-await re-check, and it only answers *"is this component mounted"* —
never *"is this read still the one the screen is showing"*. There is no generation token, which
is the device `DemoExperience`'s import path uses for exactly this class of race
(`importGen`, review H2 / commit `0945fd8`, whose comment records that a coarser guard is not
enough).

**Adversarial sequence:**

1. Aim stage, live camera. Press the shutter. `runLiveCapture` sets `reading = true` and awaits
   `recognizeDvrStrip`. **The first live recognition is slow by construction** — a lazy
   `import('tesseract.js')` plus ~6.8 MB of self-hosted worker/core/traineddata fetched from
   `/ocr` and a wasm compile (§64b). Seconds, on a cold cache.
2. The visitor gets impatient and presses **"Use sample DVR clock"** (or *Ambiguous date* /
   *Time only*). Only the shutter carries `disabled={reading}` (`:563`); these three do not.
3. `onUseSample` → `runOcrSample` → `runOcrRead` → `setOcrResult(…)` → the screen re-renders
   into the **confirm stage** (`:283`). The visitor reads the parsed sample time, the `Sample`
   confidence badge and its disclaimer, and starts correcting the value in the
   `DateTimeField` (`:378`).
4. The live recognition resolves. `aliveRef.current` is still `true` — same component, different
   branch. Two outcomes, both wrong:
   - **succeeded** → `onLiveRead` → `runOcrLive` → `runOcrRead` overwrites `ocrResult`,
     **resets `ocrDraft` to the live parse** (`DemoExperience.tsx:1399`, discarding the
     visitor's typed correction), swaps `ocrProof.current` and flips the badge from `Sample` to
     a measured score. Nothing announces the substitution.
   - **failed** → `setNotice(outcome.message)`. The notice element lives only in the aim stage
     (`:526-545`); the confirm stage's early return never renders it. The message is invisible
     now, and then materialises out of nowhere the next time the visitor presses **Retake**,
     attached to a capture they have long since moved past.

**Observable wrong behaviour:** the DVR timestamp — the value that becomes the calibration
offset and every downstream scope boundary — changes underneath the operator with no
notification, and their manual edit to it is discarded. The confidence badge silently changes
what it is claiming about the number on screen. In the failure branch, a recognition failure is
swallowed entirely and then resurfaces detached from its cause.

**Fix shape:** a generation token in the screen, the `importGen` pattern:
`const readGen = useRef(0)`; increment it in `runLiveCapture` (capture `const gen = ++readGen.current`)
**and** in `onUseSample`/`onCapture` before delegating; after each await, bail unless
`readGen.current === gen`. Alternatively disable the three sample buttons while `reading` **and**
keep the token (disabling alone does not cover a read that is still in flight when the bridge
sets a result from elsewhere). Either way the notice should also be rendered on the confirm
stage, or cleared when a result arrives, so it can never surface out of context.

---

## S-3 — [minor (MEDIUM)] "This browser doesn't expose a camera to this page" is printed over a live viewfinder when the only missing capability is `MediaRecorder`

**Files:** `features/demo/ui/screens/MediaCaptureScreen.tsx:263-266` (video start, no
`capability.record` check) → `features/demo/ui/inputs/useMediaCapture.ts:294-298` →
`features/demo/ui/inputs/capture-media.ts:355` (`captureFailure('UNSUPPORTED', facility)`) →
`features/demo/engine/logic/media/permissions.ts:102-103` (the sentence)

`capability.sampleOnly` is `!stream || !objectUrls` (`useMediaCapture.ts:237`) — it does **not**
include `record`. So on a browser with `getUserMedia` but no `MediaRecorder` (Safari ≤ 14.0 and
some embedded webviews), `permission` is `granted`, the viewfinder is live, and:

- the shutter is labelled **"Start recording"**, not the sample label (`:516-524`);
- pressing it → `startRecording()` → `startStreamRecording` → `!recorder` →
  `UNSUPPORTED` → the notice line renders
  *"This browser doesn't expose a camera to this page — nothing was captured."*

That sentence is **affirmatively false**: the camera is exposed and is rendering directly behind
the words. The honest string already exists, in the engine, keyed by facility, added by P4.6 for
precisely this reuse — `NO_RECORDER_NOTICE.camera` (`samples.ts:89-94`, *"This browser can open a
camera but cannot record video to a file…"*), which §61f explicitly notes was written
*"keyed by facility so P4.3 can reuse it."* It has exactly one caller
(`AudioRecordingFlow.tsx:223`) and `capability.record` likewise has no reader outside the audio
flow. Video mode also offers no sample fallback in this state, where the audio flow does.

**Same family, same file:** when `objectUrls` is absent but the camera is live,
`capability.sampleOnly` is `true`, so the review stage renders
`SAMPLE_MEDIA_NOTICE.camera` — *"This browser exposes no camera to the page…"* (`:769`) —
which is the very sentence the code one screen up deliberately refuses to print in the
unavailable panel for being *"simply false"* in this state (`:345-347`). The panel's reasoning
is right; the review stage's notice contradicts it.

**Reachability is narrow** (both require a browser with `getUserMedia` and without one of
`MediaRecorder` / `URL.createObjectURL`) — hence minor, not major. It is filed because the
statement is false rather than merely imprecise, the honest copy is already written and
unused, and the fix is small.

**Fix shape:** branch video mode's shutter and notice on `capability.record`
(sample label + `NO_RECORDER_NOTICE.camera`, mirroring `AudioRecordingFlow`'s
`sampleNotice={canStream ? NO_RECORDER_NOTICE[f] : SAMPLE_MEDIA_NOTICE[f]}`), and pick the
review-stage sample notice by the same `canStream` test rather than by `sampleOnly` alone.

---

## S-4 — [minor (MEDIUM)] A take the browser ends by itself is never observed: the timer keeps counting and `durationSec` overstates the clip

**Files:** `features/demo/ui/inputs/capture-media.ts:413-415` (`onstop` settles into nobody),
`features/demo/ui/inputs/useMediaCapture.ts:322-357` (`durationSec` at `:351`),
`features/demo/ui/screens/MediaCaptureScreen.tsx:376-407` (the badge)

```ts
instance.onstop = () => { settle(assemble()) }
```

`settle` resolves `resolvePending`, which is `null` unless a `stop()` is already awaiting. A
recorder that stops on its own — the camera unplugged, another app seizing the device, the track
ending, an OS interruption — therefore assembles its bytes into a promise nobody is holding, and
**nothing informs the hook or the screen**. Corroborating: no `track.onended`, `oninactive` or
`readyState` check exists anywhere in the diff (`grep` over all 33 changed source files returns
only the three unrelated `addEventListener` calls in `DemoExperience`, `WizardDrawer` and
`_shared`).

**Observable wrong behaviour:** the red `Recording MM:SS` badge (and the audio recorder's timer)
keeps climbing over a recorder that has already stopped, so the visitor keeps "recording" into
nothing. When they eventually press Stop, `handle.stop()` takes the `settled` branch
(`capture-media.ts:443`) and hands back the real (shorter) blob — but `durationSec` is computed
from the **wall clock** (`recordedMs(next, atMs)`, `useMediaCapture.ts:351`), so a 10-second clip
is saved claiming 30 seconds. That figure is then rendered as fact in the review stage
("Duration: MM:SS"), in every media-library row and in the item-info panel — a number on a
saved evidence record that nothing measured.

**Fix shape:** surface the self-stop rather than waiting for the visitor. Either give
`StreamRecorderHandle` an `onEnded` callback fired from `instance.onstop` when no `stop()` is
pending (the hook then transitions the phase and shows the take), or listen for
`track.onended` in `useCaptureStream` and stop the recording from there. Independently,
`durationSec` should prefer the recorded length when the two disagree — or be omitted rather
than asserted, which is the treatment §58f already gives an unmeasured `sizeBytes`.

---

## S-5 — [minor (LOW)] The 1-hour auto-stop leaves the microphone open through the review screen, against §61g's own stated invariant

**Files:** `features/demo/ui/inputs/useMediaCapture.ts:218-232` (the tick effect),
`features/demo/ui/screens/AudioRecordingFlow.tsx:161-166` (`handleStop` — the only `close()`)

```ts
if (hasReachedMaxDuration(recordingRef.current, atMs)) {
  optionsRef.current.onMaxDuration?.()
  void stopRecordingRef.current()
  return
}
```

The auto-stop bypasses `handleStop`, which is the one place that calls `capture.close()` after a
take is assembled. §61g is explicit about why that call exists: *"A browser shows a live
recording indicator for as long as a track is open. Leaving the stream up through the review
screen would say the microphone is still listening when it is not."* On the auto-stop path the
stream stays open until Save or Cancel unmounts the flow, so the browser's own recording
indicator keeps asserting a live microphone over a screen that is no longer recording — the
exact false statement the decision was written to prevent, on the one path that does not go
through it.

Trigger is a full hour of recording, hence LOW.

**Fix shape:** route the auto-stop through the flow's `handleStop` (pass it as the
`onMaxDuration` effect, or have the flow react to `phase === 'stopped' && captured !== null` by
closing), so exactly one path assembles-then-releases.

---

## S-6 — [minor (LOW)] `grabVideoFrame` can throw, and neither call site has a `catch` — the shutter goes dead with no notice

**Files:** `features/demo/ui/inputs/capture-media.ts:282` (`context.drawImage`), `:295`
(`canvas.toDataURL`); call sites `features/demo/ui/screens/OcrCaptureScreen.tsx:230-258`
(`try` / `finally`, **no** `catch`) and `features/demo/ui/inputs/useMediaCapture.ts:253-282`
(no `try` at all) → `MediaCaptureScreen.tsx:240-249` (`runBusy`: `try` / `finally`, no `catch`)
→ `void runBusy(…)` at `:260`.

The function's docblock enumerates *"four separate ways this can honestly fail, each returning
`FRAME_GRAB_FAILED`"* — zero dimensions, no 2d context, null blob, empty blob — and all four are
handled well. But the two DOM calls that sit outside those checks can raise
(`drawImage` `InvalidStateError` on a broken media element; `toDataURL` `SecurityError` /
allocation failure). Both call sites use `try`/`finally` without a `catch`, so a throw escapes
into a floating promise: `reading`/`busy` resets correctly, no notice is ever set, and the visitor
gets a shutter press that does **nothing at all** plus an unhandled rejection (invisible in
production).

Reachability is low — a `getUserMedia` stream does not taint the canvas and the strip is bounded
to 1280 px — hence LOW. It is filed because closing it is two lines and the function otherwise
holds an unusually clean "no failure escapes untyped" contract.

**Fix shape:** wrap the draw/encode in the existing typed-failure shape:
`try { context.drawImage(…) } catch { return { ok: false, failure: captureFailure('FRAME_GRAB_FAILED', facility) } }`,
same for the `toDataURL` spread. Then `grabVideoFrame`'s outcome union really is total, and both
call sites' existing `!grab.ok` branches carry it.

---

## Checked and clean — surfaces the brief named, no finding

- **`classifyCaptureError` taxonomy** (`permissions.ts:187-203`). Every W3C media-capture
  `DOMException` name is mapped; the `default` arm returns `UNKNOWN`, which has its own honest
  sentence, a real producer, and a pinning test. `errorName` narrows structurally, so a stub
  rejecting with a non-object cannot crash the classifier. Nothing falls through unlabelled.
  `permissionAfterFailure` is `assertNever`-exhaustive.
- **Object-URL ledger — every mint traced to a revoke.** Mints: `capturePhoto:271`,
  `stopRecording:348` (registry-owned); samples are static `/demo-media` paths and are
  deliberately untracked. Revokes: `replaceCaptured:243-251` (retake/discard displaces),
  unmount sweep `useMediaCapture.ts:204-214` (aborts the take first, then `revokeAll` — the
  ordering is correct), `handOff:386-394` (release-without-revoke on a real save), and
  `deleteMediaItem` (`DemoExperience.tsx`, revoking **before** the store drops the row — §58g's
  trigger discharged). The registry's scoped `delete`-returns-false guard makes a sample path
  unrevokable by accident. The only leak found in the whole graph is the unconditional
  `handOff()` on the audio refused-save path, folded into **S-1**.
- **`MediaRecorder` lifecycle** (`capture-media.ts:410-482`): zero-byte takes are
  `RECORDING_FAILED`, never an empty blob dressed as a success; `onerror` resolves a waiting
  `stop()` so the UI cannot hang; `abort()` settles when `stop()` was refused; `pause`/`resume`
  mirror the engine phase so a double tap is a no-op rather than an `InvalidStateError`. The
  only gap is the no-listener-attached self-stop, filed as **S-4**.
- **AudioContext suspend/resume** (`audio-analyser.ts:69-122`, `useAudioAnalyser.ts:87-125`).
  `running()` is re-checked every tick, and every un-live path returns the single frozen
  `RESTING_METER` with `available: false` — flat bars are never presented as heard silence, and
  the dB cell is withheld rather than printing `-inf`. The `resume()` swallow is correct: its
  outcome is reported by `running()`, not by the promise. Context and graph are closed on
  cleanup.
- **Canvas `getContext` null** (`capture-media.ts:277-278`) → typed `FRAME_GRAB_FAILED`, which
  is the suite's default world. Correct.
- **Tesseract worker ladder** (`ocr-recognize.ts`). A failed boot nulls the singleton so it is
  retryable (§64e); an empty recognition is a failure, never an empty success; `dispose` awaits
  a still-booting worker before terminating and swallows only genuinely non-actionable teardown.
  One theoretical wrinkle, **not filed** (requires a boot that rejects *slowly*, an unmount
  during it, a remount, and a successful second boot): the stale `workerPromise.catch` from the
  first boot can null a reference belonging to the second, orphaning one worker. Contrived
  enough that a fix would cost more clarity than it buys; recorded here so a future reader does
  not have to re-derive it.
- **Asset-fetch failure for the vendored wasm/traineddata**: any of the three `/ocr` fetches
  failing rejects `createDvrWorker`, which lands in `recognizeDvrStrip`'s `catch` →
  `OCR_RECOGNITION_FAILED_MESSAGE` → the screen's dismissible notice, which names the retake and
  the sample path. Honest, and the non-SIMD residual is already §64b.
- **sessionStorage quota with `OcrProof.imageDataUrl`** — nothing new hides behind the sanctioned
  silent zone. The write-failure policy is unchanged (`persistence.ts:592-618`: `state = 'failed'`,
  stale snapshot cleared so a refresh boots honestly empty, dev breadcrumb with the cause). P4
  makes that state *more* observable, not less: `saveState()` now carries the reason and the
  drawer footer renders it as *"Not saved · the last save to this tab failed"*
  (`save-status.ts:69-70`), and `saveProgress`'s promise still gates on `isLive()`. The payload
  growth is bounded at construction (`targetWidth: 1280`) and §64a's per-proof budget was
  verified against the code. The `SNAPSHOT_VERSION` 5→6 bump correctly covers the
  `MediaItem.url` widening, so a v5 snapshot is discarded version-attributably rather than
  wiping mysteriously.
- **Fallback honesty across the three new capture surfaces.** Every sample path is a deliberate
  press, labelled at the control (`Attach sample photo` / `Capture sample frame`), badged in
  review, badged again in the library's category slot (§63b), and carried onto `MediaItem.sample`
  — no substitution happens automatically, and a *denied* facility never yields a sample. The
  OCR confidence badge is conditional on `measured` (§64g) so a live score carries no sample
  disclaimer and vice versa. The expired-media path states its mechanism and withholds the
  fullscreen control rather than opening onto a notice.
- **Distinct-cause preservation**: `deviceFailure` is kept apart from `failure` and rendered on
  its own line in both camera screens ("the list could not be read" ≠ "there are none");
  `audioDegraded` surfaces the silent-video case instead of swallowing it; `permissionAfterFailure`
  keeps `denied` / `unavailable` / retryable apart.
- **Deliberate choices honoured, not re-flagged:** §58b/c/d/e, §59a/c/d/e/f, §60c/d/f/g/i/k,
  §61a/b/g/h/l, §62c/d/e, §63b/c/d/e, §64a/b/c/d/e/g/h.

---

## Silent Failure Hunter Summary

| Severity (lane rubric) | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 2 |
| MEDIUM | 2 |
| LOW | 2 |

Fallback honesty (every substitution announced): **yes**, with one false-cause sentence (S-3)
Failure-cause distinctions preserved: **yes**, except S-3
Partial results flagged (not silently short): **n/a** — no new partial-result path
Async cancellation / stale-write safety: **gap found** — S-2 (no generation token on the live OCR read)
Operator breadcrumbs intact: **yes** — no prior review's `console.warn`/`console.error` removed

**Verdict: REVISE**
