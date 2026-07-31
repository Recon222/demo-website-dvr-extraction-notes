# P4 review — TYPESCRIPT lane (type safety / async / error paths / demo architecture)

**PR:** #33 · `master..feat/parity-p4` · reviewed at `df87a18`
**Worktree:** `scratchpad/worktrees/parity-p4` (deps installed; `pnpm exec tsc --noEmit` and targeted `vitest` runs executed here)
**Lane contract:** `.claude/agents/typescript-reviewer.md` — TS correctness, async correctness, error handling, RSC boundaries, demo-architecture compliance. Browser/perf/a11y/CSS is `web-reviewer`'s; missing tests are `test-analyzer`'s; swallowed-error hunting is `silent-failure-hunter`'s (one finding below overlaps that lane by necessity because the *type* of the callback is the fix).

Context read before flagging: PR #33 body ("deliberate choices — DO NOT RE-FLAG"), `docs/code-reviews/deferred.md` §§58–64, `features/demo/CLAUDE.md`, root `CLAUDE.md`, and the phone sources cited below (read-only reference).

Severity vocabulary is the orchestrator's (**blocker / major / minor**); the lane rubric's own CRITICAL/HIGH/MEDIUM is given alongside so the mapping is auditable.

**Gates.** `pnpm exec tsc --noEmit` → clean (zero output). Targeted vitest over the whole P4 surface (`features/demo/ui/inputs`, `features/demo/engine/logic/media`, `features/demo/ui/screens/__tests__`, `features/demo/ui/__tests__`) → **100 files / 1247 tests pass**. One run of that selection reported a single failure in `engine/logic/media/__tests__/recording.test.ts` (a pure table assertion on `extensionForMimeType`); re-run solo → 58/58 pass, and a second full re-run of the same selection → 1247/1247 pass. Treated as fleet-load noise, **not** filed.

---

## Findings

### [MAJOR · lane-HIGH] TS-1 — Saving an audio note with no location open discards the take silently *and* leaks its object URL

**Files:**
`features/demo/ui/DemoExperience.tsx:698-704` (`saveAudioNote`)
`features/demo/ui/screens/AudioRecordingFlow.tsx:74` (`onSave(...): void`) and `:174-185` (`handleSave` — unconditional `capture.handOff()`)
`features/demo/engine/store/create-store.ts:1067-1069` (`addMedia` early-returns without `currentLocationId`)
**Correct pattern, same PR, same bridge:** `features/demo/ui/DemoExperience.tsx:658-672` (`saveCapturedMedia`) + `features/demo/ui/screens/MediaCaptureScreen.tsx:293-302` (`onAccept` gates `handOff()` on the returned boolean)
**Phone parity:** `app/(form)/audio-recording.tsx:106-116` — the phone's route wrapper *does* guard this exact case (`text1: 'Cannot Save Audio'`, `text2: 'No location selected. Please navigate from a case first.'`)

**Issue.** The photo/video accept path was built with two protections that the audio accept path does not have:

```ts
// DemoExperience.tsx:658 — media capture: guarded, returns whether the store TOOK it
const saveCapturedMedia = ({ captured, filename, caption }: SaveMediaRequest): boolean => {
  const st = store.getState()
  if (!st.currentLocationId) { setNotice(CANNOT_SAVE_MEDIA_NOTICE); st.closeLaunch(); return false }
  ...
}

// DemoExperience.tsx:698 — audio: no guard, no answer
const saveAudioNote = (captured: CapturedMedia, meta: MetadataFormValue) => {
  const st = store.getState()
  st.addMedia('audio', buildMediaItem({ id: `ui-m${uiSeq++}`, captured, filename: meta.filename, caption: meta.caption }))
  st.closeLaunch()
}
```

`addMedia` (`create-store.ts:1068`) is `const id = get().currentLocationId; if (!id) return`. So with no location open the write is a no-op, `closeLaunch()` bounces the visitor to the anchor chapter, and **nothing is said**. `AudioRecordingFlow.handleSave` then calls `capture.handOff()` unconditionally (`:182`), because `onSave` is typed `void` — so the registry `release`s (forgets *without* revoking) a `blob:` URL that the store never took. Nothing in the page can revoke it afterwards; a live take's bytes stay pinned for the life of the tab. That is exactly the failure mode §58 rule 1 and §60c exist to prevent, and §60c's own words — "a refused save must leave the `blob:` URL owned by the capture hook so the unmount sweep frees it" — are unimplementable here because the flow cannot learn the answer.

**Concrete failure.** Fresh `/demo` (boots empty — no case, no location). The P4 explore rider put `Record Audio` on the rail: `engine/content/explore.ts:57` (`jumpTo: 'audioRecording'`), and the rail's jump is ungated — `DemoExperience.tsx:2080`, `onJump={(v) => store.getState().setView(v)}`. Click it → the recorder opens → `Attach a sample audio note` (or, with a mic, record ≥ 0.5 s and Stop) → type a filename → **Save Audio**. Result: no note anywhere, no notice, view snaps to the anchor chapter. The visitor's reasonable reading is "saved". For the live-take variant the take's bytes are additionally orphaned.

This is not §59f (which is about the drawer rows being ungated, and is correct); the guard being asked for is the phone's own *save-time* guard, which P4.3 ported and P4.6/P4.4 did not. Reachability is not theoretical — `DemoExperience.media-capture.test.tsx:154-171` builds precisely this state (`seed(false)`: a case, no location) and pins the photo path's notice; the audio bridge suite (`DemoExperience.audio.test.tsx:17-26`) only ever seeds *with* a location, which is why the gap is invisible today.

**Fix shape.**
1. `saveAudioNote` returns `boolean`, mirroring `saveCapturedMedia`: guard on `st.currentLocationId`, `setNotice('Cannot Save Audio — No location selected. Please navigate from a case first.')` (phone verbatim, joined `text1 — text2` like its sibling), `st.closeLaunch()`, `return false`. Hoist the sentence to a named const beside `CANNOT_SAVE_MEDIA_NOTICE` (`DemoExperience.tsx:~230`).
2. `AudioRecordingFlowProps.onSave` becomes `(captured, meta) => boolean`, and `handleSave` does `if (onSave(captured, meta)) capture.handOff()` — the §60c contract, applied to the third capture surface.
3. Pin with the audio twin of the media-capture test (`seed` without a location → Save Audio → `locations` identity unchanged + the notice present), and a flow-level probe that deleting the `if (accepted)` guard reddens (i.e. that the URL is still registry-owned after a refused save).

---

### [MAJOR · lane-HIGH] TS-2 — Video mode on a camera-but-no-`MediaRecorder` browser states a falsehood; the honest copy exists and has zero readers

**Files:**
`features/demo/ui/screens/MediaCaptureScreen.tsx:263-267` (video branch calls `startRecording()` with no capability check) — and note `capability.record` is destructured nowhere in this screen
`features/demo/ui/inputs/useMediaCapture.ts:237` (`record: stream && recorderIo !== null`) and `:290` (`setOwnFailure(captureFailure('UNSUPPORTED', facility))`)
`features/demo/ui/inputs/capture-media.ts:355` (`if (!recorder) return { ok: false, failure: captureFailure('UNSUPPORTED', facility) }`)
`features/demo/engine/logic/media/permissions.ts:102-103` (`UNSUPPORTED` → "This browser doesn't expose a **camera** to this page — nothing was captured.")
`features/demo/engine/logic/media/samples.ts:89-94` (`NO_RECORDER_NOTICE` — the correct sentence, **`.camera` has no reader**)
**Correct pattern, same PR:** `features/demo/ui/screens/AudioRecordingFlow.tsx:106` + `:146-154` + `:223` — the audio flow reads `capability.record`, degrades to the `sample` mode, and picks `NO_RECORDER_NOTICE.microphone` when the stream is real but the recorder is not.

**Issue.** `capability.record` is computed by the hook and consumed by exactly one of the two recording surfaces. `MediaCaptureScreen` branches only on `capability.sampleOnly` (`= !stream || !objectUrls`), which is **false** when `getUserMedia` and `URL.createObjectURL` both work and only `MediaRecorder` is missing. Pressing the shutter in video mode then walks `startRecording() → startStreamRecording(stream, 'video', { recorder: null }) → captureFailure('UNSUPPORTED', 'camera')`, and the screen renders that message (`MediaCaptureScreen.tsx:417-428`) directly beneath a **live viewfinder**.

§61f records that `NO_RECORDER_NOTICE` was deliberately "keyed by facility so P4.3 can reuse it". P4.3 did not, and `NO_RECORDER_NOTICE.camera` is currently dead.

**Concrete failure.** A browser with `navigator.mediaDevices` but no `MediaRecorder` (Safari ≤ 14.0; a Firefox with `media.mediarecorder` off; a hardened/embedded WebView). Grant the camera → the viewfinder plays → tap **Video** → tap **Start recording**. The red line reads *"This browser doesn't expose a camera to this page — nothing was captured"* while the camera is visibly running, and there is no way forward: `sampleOnly` is false, so the shutter is still labelled `Start recording` rather than `Attach sample clip`, and every press produces the same false sentence. Photo mode still works, which makes the claim self-evidently wrong on the same screen. (Population is narrow — noted honestly so triage can weigh it — but the sentence is false, the mode is a dead end, and the correct string is one import away.)

**Fix shape.** Read `capability.record` in `MediaCaptureScreen` and take the shape `AudioRecordingFlow` already uses: when `capability.stream && !capability.record`, treat video mode as sample-attaching (shutter → `captureSample('video')`, label `Attach sample clip`, notice `NO_RECORDER_NOTICE.camera`); at minimum, surface `NO_RECORDER_NOTICE.camera` instead of the `UNSUPPORTED` sentence. Pin with a screen test passing `deps={{ recorder: null, mediaDevices: <a working stub> }}` and asserting the phone/`UNSUPPORTED` "doesn't expose a camera" sentence is **absent**.

---

### [MINOR · lane-MEDIUM] TS-3 — A stale grab/recording failure masks a newer acquisition failure

**Files:** `features/demo/ui/inputs/useMediaCapture.ts:415` (`failure: ownFailure ?? streamState.failure`); `features/demo/ui/inputs/useCaptureStream.ts:139-144` (`open()` clears `setFailure(null)` — the *stream's* failure only); `ownFailure` is cleared only on a later success (`useMediaCapture.ts:277`, `:300`, `:355`) or by `clearFailure()` (`:396`), which is wired solely to the Dismiss buttons (`MediaCaptureScreen.tsx:420-426`, `AudioRecorderScreen.tsx:249`).

**Issue.** The precedence comment says "a failure raised HERE … is the more recent event whenever both exist". That holds only until a *new acquisition* fails: `open()` resets the stream-side failure but nothing resets `ownFailure`, so the older event keeps winning and the newer, more relevant one is never rendered.

**Concrete failure.** `MediaCaptureScreen`, live camera, two cameras listed. Photo shutter → the grab fails (`FRAME_GRAB_FAILED`; e.g. a blocked canvas or a frame not yet delivered) → the red line shows "This browser could not turn the camera frame into an image". Without pressing Dismiss, tap **Switch camera**; the second device has been unplugged → `OverconstrainedError` → `NO_DEVICE` → `permissionAfterFailure` flips permission to `unavailable`, and the screen swaps the viewfinder for the no-camera panel. The red line still reads *"could not turn the camera frame into an image"*, never "No camera device available" — the visitor is given the wrong explanation for the state they are now in.

**Fix shape.** Clear the own-failure when an acquisition starts: wrap `open`/`selectDevice` in `useMediaCapture` (`setOwnFailure(null)` then delegate to `streamState.open`, preserving the returned promise) rather than re-exporting them untouched at `:409-410`. A mutation probe — delete the new `setOwnFailure(null)` and the assertion "after a failed device switch the notice names the device failure" should redden.

---

### [MINOR · lane-MEDIUM] TS-4 — Two engine exports (plus one copy key) with no production consumer

**Files:** `features/demo/engine/logic/media/samples.ts:97` (`facilityForKind`) and `features/demo/engine/logic/media/recording.ts:123` (`canStopRecording`), both re-exported from the internal barrel `features/demo/engine/logic/media/index.ts:109` and `:51`. Their only callers are their own unit tests. `NO_RECORDER_NOTICE.camera` (`samples.ts:90-92`) is the third — folded here because TS-2's fix makes it live.

**Issue.** The barrel's own header is explicit that it exists for *source* consumers and that "advertising a second surface with no callers is exactly the orphaned-barrel drift that convention exists to prevent" (`index.ts:12-15`). Two of its exports are already in that state at landing. Low blast radius; flagged because the convention is the file's own stated rule and the drift is cheapest to correct now.

**Fix shape.** Either delete them (both are one-liners a future consumer can re-derive) or, for `canStopRecording`, note the intended caller in a doc line so a reader is not left assuming a surface uses it. `facilityForKind` in particular reads as a seam that a capture screen was expected to call and none does.

---

## Verified and NOT flagged

Recorded so the fix-delta round does not re-derive them.

- **Architecture sweeps all clean.** `grep -rn "useStore" features/demo/ui` → zero hits outside `DemoExperience.tsx` (store bridge intact — every new screen, the flow, the sheet and the form are prop/callback-only). No React import, `'use client'`, or module-scope `window`/`document` under `features/demo/engine/**` (the three new engine modules `logic/media/*`, `logic/ocr-crop.ts`, `logic/save-status.ts` are pure). `features/demo/index.ts` unchanged (still `DemoExperience` + `clearDemoSnapshot`). No `@/features/demo/ui|engine` import from `components/`, `app/(default)/`, `lib/` — the only `app/` hit is the pre-existing `app/api/extract/route.ts` → `engine/logic/import`.
- **Determinism seam intact.** Ids are `uiSeq`/`nextId` strings (`ui-m…`, matched by `maxIdSeq`'s re-seed). `defaultCaptureBasename` derives from the capture's own `capturedAt` rather than a clock. `useMediaCapture.now/capturedAt` are injectable callbacks read in handlers/effects; `persistDemoStore(..., { now })` is a default-parameter seam; `DemoExperience`'s save-status effect and `AudioRecordingFlow.readClock` both read `clock.now()` inside effects, never at render scope. `key={index}` at `AudioRecorderScreen.tsx:210` is a fixed-length positional array of magnitudes, not a dynamic entity list.
- **No `any`, no `as any`, no non-null assertions, no `@ts-ignore/@ts-expect-error`** anywhere in the changed production files. The two casts present are confined and documented (`capture-media.ts:282` `video as unknown as CanvasImageSource`; `screens.ts:33` `(LAUNCHABLE as readonly string[]).includes`). Barrel re-exports use `type` markers throughout — no `isolatedModules` violation.
- **XSS in the generated Time-Offset document.** The four new interpolations (`ocrImageDataUrl`, `ocrRawText`, `ocrCleanedText`, `ocrParsedDateTime`) all pass through `e`/`escapeHtml` (`pdf/time-offset.ts:114-137`); the data URL lands in a double-quoted `src` and `"` is escaped, so no attribute breakout even for a camera pointed at hostile text. `pdf/` is otherwise untouched by this PR.
- **Self-hosted OCR assets.** `worker.min.js` still carries tesseract's jsdelivr *defaults*, but all three are overridden explicitly (`ocr-recognize.ts:53-60` passes `workerPath`/`corePath`/`langPath`), so nothing resolves to a CDN at runtime. §64b's claim that the single-file core fetches no sibling `.wasm` holds — the only `.wasm` token in the 3.9 MB core is the `e.wasmBinary` property. No CSP config exists in the repo that would block a blob worker or wasm.
- **Snapshot v6 widening is contained.** `MediaItem.url?: string` has exactly one rendering consumer (`MediaLibrarySheet`), and every render path is gated on `isMediaAvailable`/`canFullscreen`; `withoutEphemeralMedia` is identity-preserving and applied at the single write funnel; the Zod member moved to `.optional()` alongside the version + key-suffix bump. No PDF/notes/case-map consumer reads `MediaItem`.
- **Async ordering in both accept paths.** `onSave` → `closeLaunch()` → `handOff()` is safe: the store write and the unmount are React-batched to the end of the click handler, so the hand-off runs before the sweep. Both `capturePhoto` and `stopRecording` check `abortedRef` *before* minting a URL, so no post-sweep mint is possible. The OCR reopen effect (`OcrCaptureScreen.tsx:213-224`) lists `stream` in its deps, which is what makes a `getUserMedia` that resolves *after* a sample read still get closed rather than leaving the camera lit behind the confirm form.
- **Crop geometry.** `ocrCropRegion` verified by hand for the matched-aspect case (reduces to the phone's `{0.05, 0.415, 0.90, 0.17}`), the 4:3-in-16:9 case (`visibleHeight = 0.75`, matching `object-fit: cover`), and the 21:9 case. §64d's width-only buffer matches the phone source.
- **Deliberate choices honoured.** Nothing above re-litigates §§58–64: §59a (save status is an original), §59c (unmounted sub-rows), §59f (ungated drawer rows — TS-1 is about the *save-time* guard, a different control), §61a (no auto-reset), §61b (500 ms gate on both controls), §62c–e (pre-fill, no `onValidChange`, reason on refusal), §63b–d (Sample badge, `duration · date`, native transports), §64a/c (persisted proof, visible-band crop).

---

## TypeScript Lane Summary

| Severity | Count |
|---|---|
| blocker (lane-CRITICAL) | 0 |
| major (lane-HIGH) | 2 |
| minor (lane-MEDIUM) | 2 |

Store-bridge integrity: **preserved**
Engine purity: **preserved**
Barrel + marketing/demo isolation: **preserved**
Determinism seam: **preserved**
`tsc --noEmit`: **clean** · targeted vitest (100 files / 1247 tests): **green**

**Verdict: REVISE** — two majors, both in the same seam: the audio accept path is missing the boolean-answer contract P4.3 established (TS-1, silent loss + orphaned blob), and the video capture surface ignores the `capability.record` fact P4.6's sibling flow consumes (TS-2, a false sentence over a live viewfinder). Both fixes are small and both have an in-repo correct pattern to copy.

---

# Fix-delta r1 — TYPESCRIPT lane

**Fix diff:** `d09a291..cd819ee` on `feat/parity-p4` (five package merges + the §66d rider), reviewed at `cd819ee`.
**Map used:** `p4-review-r1-vetted.md` (R-1 = TS-1+T-1+S-1, R-3 = TS-2+TYPE-DESIGN-1+S-3, R-14 = TS-3, R-28 = TS-4), PR #33's fix-round comment, ledger §§65–69.
**Method:** read every fix at source in the committed tree (`git show cd819ee:…`, never the working tree — other lanes were probing in this shared worktree during the session), then **mutation-probed each fix**: re-introduce the original defect, confirm a named test reddens, revert. Every probe below was reverted; the tree carries no source edits from this lane.

**Gates:** `tsc --noEmit` clean. The six suites covering my findings — `DemoExperience.audio`, `AudioRecordingFlow`, `MediaCaptureScreen`, `useMediaCapture`, `capability`, `store-actions` — **130/130 green**. (One run of that batch reported a single failure in `MediaCaptureScreen > says so when the device list could not be READ`; solo re-run and two batch re-runs all green. Second occurrence of load-noise in this worktree this session — same signature as the r0 `extensionForMimeType` flake: a test that cannot fail non-deterministically on its own logic. Operational note, not a finding.)

## Verification of my findings

| Mine | Vetted | Commit | Verdict |
|---|---|---|---|
| TS-1 | R-1 (BLOCKER) | `a68e0d9` + merge union | **FIXED** |
| TS-2 | R-3 (MAJOR) | `5145661` | **PARTIAL** |
| TS-3 | R-14 (MINOR) | `984b343` | **FIXED** |
| TS-4 | R-28 (MINOR) | `8c84973` | **FIXED** |

### TS-1 → R-1 — FIXED (both halves, both probed)

`DemoExperience.tsx:255-259` hoists `CANNOT_SAVE_AUDIO_NOTICE` (phone verbatim, joined) and an
`audioSavedNotice` sibling; `saveAudioNote` (`:721-739`) is now `(captured, meta) => boolean`,
guards on `st.currentLocationId`, notices, `closeLaunch()`, `return false` — and notices the
*success* case too, which my finding did not ask for and the vetted shape did.
`AudioRecordingFlowProps.onSave` is `=> boolean` and `handleSave` gates `if (accepted)
capture.handOff()`, so §60c's contract now holds on all three capture surfaces.

Probes (both reverted):
- Delete the guard block → `DemoExperience.audio.test.tsx > with no location open: tells the visitor, saves nothing, and closes the recorder (R-1)` **fails**.
- Make `handOff()` unconditional → `AudioRecordingFlow.test.tsx > does NOT hand off a REFUSED save — the hook keeps the URL so its sweep can free it` **fails** (it asserts the refused URL *is* in `revoked` after unmount — i.e. the registry still owned it).

Both halves of the defect I filed (silent loss, orphaned blob) are closed and cannot regress silently.

### TS-2 → R-3 — PARTIAL (the reported falsehood is closed; one clause of the vetted fix shape is not)

**Fixed, and better than I specified.** The stored `sampleOnly` boolean is gone. A new pure
engine module `engine/logic/media/capability.ts` answers per operation — `captureAvailability`
(`:47`, a `MediaKind` switch closed with `assertNever`) and `sampleFallbackNotice` (`:70`, a
reason-priority ladder). `MediaCaptureScreen.tsx:286` consumes `capability.modeFor(mode)` and
`:372` passes `capability.sampleNotice` into `ReviewStage` instead of hard-coding
`SAMPLE_MEDIA_NOTICE.camera`. On the `{stream, !record}` browser my finding described, video mode
now attaches the bundled clip, labels the shutter `Attach sample clip`, and shows
`NO_RECORDER_NOTICE.camera` — the UNSUPPORTED sentence is unreachable there.

Probes (both reverted):
- `modeFor(mode)` → `modeFor('photo')` (the pre-R-3 answer) → 3 tests fail, including `never prints "doesn't expose a camera" while the viewfinder is live`.
- Collapse `sampleFallbackNotice` to a single sentence → 4 fail (3 engine + the screen's).

**Outstanding.** The vetted fix shape's half 2 ends: *"This collapses the audio flow's hand-rolled
`!canStream || !canRecord` onto the same rule."* It does not.
`AudioRecordingFlow.tsx:179` still derives `mode` from `!canStream || !canRecord`, and `:255`
still hand-picks `canStream ? NO_RECORDER_NOTICE.microphone : SAMPLE_MEDIA_NOTICE.microphone`.
So the two consumers still hold two spellings of one rule — the drift the type half exists to
kill — and they *disagree* on one input: the flow's version ignores `objectUrls`, so on a
`{stream: true, record: true, objectUrls: false}` browser it reports `mode: 'live'` where
`captureAvailability(support, 'audio')` returns `'sample'`. The visitor then records a real take
and `finishTake`'s registry check (`useMediaCapture.ts:382`) answers with
`captureFailure('UNSUPPORTED', 'microphone')` — *"This browser doesn't expose a microphone to
this page"* — with the meter visibly moving. That is TS-2's falsehood class, surviving on the
third surface.

Severity of the residual is **minor**, and stated honestly: it needs a browser with
`getUserMedia` + `MediaRecorder` but no `URL.createObjectURL`, which is rarer than TS-2's own
Safari ≤ 14.0 population. The real cost is the design drift, not the sentence.

**Disclosure trail** (judged, not just noted): §65c discloses the deferral correctly and names
its trigger — *"Not done here, per the vetted routing… **Trigger:** P4.6's own fix round."*
That trigger fired: §68 **is** P4.6's fix round, and it is silent on the collapse. So this is a
disclosed deferral that lapsed at its own named trigger without a ledger line. Fix is three
lines in one file (`mode` from `capture.capability.modeFor('audio')`, `sampleNotice` from
`capture.capability.sampleNotice`) plus the two booleans' remaining reader at `:153`.

### TS-3 → R-14 — FIXED

`useMediaCapture.ts:466-481`: `open` and `selectDevice` are wrapped to `setOwnFailure(null)`
before delegating — exactly the fix shape I gave, applied to both entry points rather than one.
Probe (reverted): drop the clear from `open` → `useMediaCapture.test.ts > a stale failure never
outlives its cause (R-14) > clears a frame-grab failure when a new acquisition starts` **fails**
(`expected { code: 'FRAME_GRAB_FAILED' } to be null`). Two sibling arms pin the device-switch
path and the "shows the NEW acquisition failure" outcome.

### TS-4 → R-28 — FIXED

`facilityForKind` and `canStopRecording` deleted from `samples.ts` / `recording.ts` and from the
media barrel. `canStopAtElapsed`'s four arms survive — the suite composes `recordedMs` + the rule
through a local helper rather than dropping the coverage with the wrapper, so "a paused recorder
does not let the clock unlock Stop" is still pinned. The third item I folded in
(`NO_RECORDER_NOTICE.camera`'s zero readers) now has a real production reader via
`sampleFallbackNotice` — verified by the screen test asserting the sentence renders.

## Disclosed deviations, judged on the merits

1. **`NO_CAPTURE_STORAGE_NOTICE` — a third notice beyond the vetted two-way shape: ACCEPT.**
   The vetted text said to pick the review notice "by the same `canStream` test", which routes a
   `{stream: true, objectUrls: false}` browser to `NO_RECORDER_NOTICE` — *"can open a camera but
   cannot record video to a file"* — which is **false** there: the recorder is fine, the
   object-URL API is not. The new sentence names no device (both existing ones would lie) and
   `sampleFallbackNotice`'s priority ladder (no-device → no-storage → no-recorder) reports the
   first thing that would have to be fixed. This is the vetted shape being *corrected*, not
   exceeded, and §65b argues it in the same terms. Pinned by three engine tests that redden when
   the ladder is collapsed. It also closes the folded S-3 rider properly rather than relabelling
   it.
2. **The R-23 × R-1 merge union in `saveAudioNote`: ACCEPT.** The one-argument
   `st.addMedia(buildMediaItem(…))` lands *inside* the guarded branch, after the early
   `return false`, so neither intent is diluted; the guard is what the probe reddens. The arity
   change is complete — three production call sites (`DemoExperience.tsx:687`, `:735`, `:756`),
   `tsc` clean, `store-actions` green. R-23 additionally deletes a defect class adjacent to mine:
   `addMedia(kind, item)` allowed `kind !== item.kind` to compile, whose end state is a row filed
   under one tab and deleted from another — an undeletable capture.
3. **`dataUrlQuality` threaded through the frame grab (R-15 × R-22 reconcile): correct.**
   `grabVideoFrame` encodes the blob at `options.quality` (q=1.0, the recogniser's copy, phone
   parity) and the data URL at `options.dataUrlQuality ?? options.quality` (0.85, the persisted
   copy) — two distinct reads of two distinct options, with R-22's `try/catch` around
   `toDataURL` returning the same typed `FRAME_GRAB_FAILED` as the other four failure modes
   rather than escaping as a floating rejection. No path can now encode the persisted copy at the
   recogniser's quality or vice versa.

## New finding — fix-introduced regression

### [MINOR] FD-1 — `abortRecording()` can no longer abandon a take whose `stop()` is in flight; the assembled capture is published anyway

**File:** `features/demo/ui/inputs/useMediaCapture.ts:351-357` (`finishTake` — `handleRef.current = null` moved to *before* `await handle.stop()`), against `:424-428` (`abortRecording`, whose only route to the recorder is `handleRef.current?.abort()`) and the contract at `:139` (*"Abandon the take and discard its bytes"*).
**Introduced by:** R-13's split of `stopRecording`'s tail into `finishTake` (`5b336d4`). Pre-fix, `handleRef.current` was cleared *after* the await (`d09a291:useMediaCapture.ts`), so an abort during the window reached the handle, `assemble()` saw `aborted` and resolved `null`.

**Issue.** During the await, `handleRef.current` is `null`, so `abortRecording()` no-ops on the
recorder and only resets the phase. The pending `stop()` then resolves with real bytes;
`finishTake`'s remaining guard is `abortedRef` — which is the **unmount** flag, not an
abort-recording flag — so it proceeds to mint an object URL and `replaceCaptured(media)`. The
visitor who cancelled gets a review screen for the take they discarded, and its URL is now owned
by a registry whose surface has already been told to forget the take.

**Proven, not reasoned** (probe appended to `AudioRecordingFlow.test.tsx`, run, file restored —
Start recording → roll 3 s → Stop → **Cancel before `emitStop`** → then `emitData`/`emitStop`;
assert `Review Audio` is absent):
- against `cd819ee` → **FAILS** (the review screen renders for the cancelled take);
- the identical probe with only `useMediaCapture.ts` restored to `d09a291` → **PASSES**.
So the behaviour changed in this round, in this file.

**Blast radius today: none user-visible.** The single production caller
(`AudioRecordingFlow.tsx:221`, `handleCancel`) pairs `abortRecording()` with `onClose()` →
`closeLaunch()` → unmount, and the unmount sets `abortedRef` before the stop resolves, so
`finishTake` returns `null` ahead of the mint. The probe only shows it because the flow test's
`onClose` is a `vi.fn` that does not unmount. This is filed as **minor** on that basis — but the
hook's stated contract is now false precisely in the window it exists for, `MediaCaptureScreen`
already holds an `abortRecording` it does not yet call, and §58/§60c's carry-rules are written
against that contract.

**Fix shape.** Keep the abort path able to reach the take: either leave `handleRef.current` set
until after the await and re-check `handleRef.current === handle` before publishing, or give
`abortRecording` a generation/abort flag that `finishTake` re-checks after its await — the
`importGen` shape R-4 has just adopted two files away. Pin with the probe above (it is four lines
on the existing harness, which already exposes manual `emitStop`).

## Fix-delta summary

| | Count |
|---|---|
| Verified FIXED | 3 (TS-1, TS-3, TS-4) |
| PARTIAL | 1 (TS-2 / R-3 — reported defect closed, one vetted clause outstanding) |
| UNFIXED | 0 |
| New regressions (this lane) | 1 minor (FD-1) |

Store bridge, engine purity, barrel + marketing/demo isolation, determinism seam: **all still preserved** after the round (re-swept; the new `capability.ts` is pure, `MEDIA_BUCKET` moves engine→engine, no new `useStore`, no new `any`/`as any`/non-null assertion in the fix diff).

**Verdict: APPROVE with one minor follow-up.** The blocker and both minors are genuinely closed and mutation-probed. R-3's residual and FD-1 are both minor and both one-file fixes; neither needs to hold the merge, but both should land as ledger lines if they are not fixed now — R-3's residual especially, since its first deferral already lapsed silently at its own named trigger.
