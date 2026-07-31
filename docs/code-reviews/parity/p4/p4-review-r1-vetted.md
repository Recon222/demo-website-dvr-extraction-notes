# P4 review — round 1, VETTED (aggregated across five lanes)

**PR:** #33 `master..feat/parity-p4`, aggregated at `b70b188` (lanes reviewed at `df87a18`; the
delta is the lane files themselves).
**Inputs:** `lane-typescript.md`, `lane-web.md`, `lane-tests.md`, `lane-silent-failures.md`,
`lane-type-design.md` · PR #33 body (deliberate-choices list) · `deferred.md` §§58–64.
**Raw totals:** 2 blockers / 13 majors / 21 minors + 1 nit across five lanes (web BLOCK, four REVISE).

## Verdict: **BLOCK**

One blocker survives aggregation — the silent destruction of a visitor's audio recording (R-1).
The web lane's blocker (delete-cascade blob leak) is re-ruled a top-priority major on the merits
(R-2, rationale inline). Everything else is REVISE-grade: every major has a small fix with an
in-repo reference pattern, most established by this same PR.

## Counts after dedupe

| Severity | Count |
|---|---|
| BLOCKER | 1 |
| MAJOR | 11 |
| MINOR | 20 |
| NIT | 1 |

Two multi-lane convergences were merged: the audio no-location save (T-1 + S-1 + TS-1 → R-1) and
the camera-but-no-`MediaRecorder` capability gap, which turned out to be a **three**-lane
convergence, not two — TYPE-DESIGN-1 + TS-2 + silent-failures' S-3 are the same defect through
three lenses (→ R-3). No finding was struck; see *Struck & re-ruled* below.

## Aggregator's own verification (all probes reverted; `git status` clean)

- **T-2 re-run (R-5):** gutted `runOcrLive` (`measured: false`, dropped `imageDataUrl`,
  `fallbackActual: SAMPLE_ACTUAL_TIME`) → `tsc --noEmit` clean, full suite **218 files / 2479
  tests green**. The tests lane's headline claim is reproduced, not taken on faith.
- **T-4 re-run (R-10):** deleted `targetWidth: OCR_STRIP_MAX_WIDTH` + `quality:
  OCR_CAPTURE_QUALITY` from `OcrCaptureScreen`'s `grabVideoFrame` call → all five OCR-touching
  suites (70 tests) green. Reproduced.
- **W-1 trace (R-2):** confirmed at source — `confirmDelete` (`DemoExperience.tsx:1054-1067`)
  calls `deleteCase`/`deleteLocation` and repairs bridge shadows only; `revokeCapturedUrls` is
  imported and used at `deleteMediaItem` (`:716-723`) but never on the cascade path.
- **S-2 verify (R-4):** confirmed at source — `runLiveCapture` (`OcrCaptureScreen.tsx:226-261`)
  has `aliveRef` as its only post-await guard (no generation token); the three sample buttons
  (`:549-556`) carry no `disabled={reading}` (only the shutter does, `:563`); the notice block
  renders only in the aim stage — the confirm stage's `if (result)` early-return (`:283`)
  precedes it.
- **R-3 / W-4 source checks:** `MediaCaptureScreen` destructures 22 hook members, `close` and
  `capability.record` not among them; the video shutter is native
  `disabled={busy || (mode === 'video' && isRecording && !canStop)}` at `:466`.

---

## Findings

### R-1 — [BLOCKER] Saving an audio note with no location open silently destroys the take and leaks its object URL

**Lanes:** tests T-1 (blocker) · silent-failures S-1 (major) · typescript TS-1 (major)
**Files:** `features/demo/ui/DemoExperience.tsx:698-704` (`saveAudioNote` — no guard, returns
`void`) · `features/demo/ui/screens/AudioRecordingFlow.tsx:74` (`onSave: void`) + `:174-185`
(`handleSave` — unconditional `capture.handOff()`) ·
`features/demo/engine/store/create-store.ts:1067-1069` (`addMedia` early-returns without
`currentLocationId`)
**Correct pattern, same PR:** `saveCapturedMedia` (`DemoExperience.tsx:658-672`, guarded,
returns `boolean`) + `MediaCaptureScreen.onAccept` (`:293-302`, gates `handOff()` on the answer)
**Phone parity:** `app/(form)/audio-recording.tsx:106-120` guards this exact case
(`'Cannot Save Audio' / 'No location selected. Please navigate from a case first.'`)

**Severity ruling (T-1 blocker vs S-1/TS-1 major → BLOCKER).** This is silent destruction of
visitor-created data presented as success, one ungated click from boot (rail → `Record Audio`,
`explore.ts:57`; §59f deliberately leaves the row ungated — the missing control is the
*save-time* guard, a different thing). A real microphone take is discarded by `addMedia`'s
silent no-op, `closeLaunch()` returns the visitor to the anchor exactly as a successful save
would, and no notice of either kind exists (`grep "Cannot Save Audio\|Audio Saved"` over
`features/demo/` → nothing). The failed save and the real save are byte-identical from the
visitor's seat. The demo's honesty rule is a binding contract and this is its worst failure
class; the photo sibling in the same PR guards it and documents why in as many words. The tests
lane also *ran* the path (probe: `locations = 0`, no notice). Additionally the unconditional
`handOff()` releases-without-revoking the refused take's `blob:` URL — bytes pinned for the tab's
life, unreachable by any sweep.

**Fix shape** (all three lanes agree):
1. `saveAudioNote` mirrors `saveCapturedMedia`: guard on `st.currentLocationId`, set a
   `CANNOT_SAVE_AUDIO_NOTICE` (phone verbatim, joined `text1 — text2`, hoisted beside
   `CANNOT_SAVE_MEDIA_NOTICE` at `DemoExperience.tsx:~230`), `closeLaunch()`, `return false`;
   on success, a `audioSavedNotice(meta.filename)` sibling of `mediaSavedNotice`, `return true`.
2. `AudioRecordingFlowProps.onSave` becomes `(captured, meta) => boolean`;
   `handleSave` does `if (onSave(captured, meta)) capture.handOff()` — the §60c contract applied
   to the third capture surface.
3. Pin both: the audio twin of `DemoExperience.media-capture.test.tsx:154-171`
   (`seed(false)` → Save Audio → `locations` identity unchanged + notice on screen), and a
   flow-level probe that deleting the `if (accepted)` guard reddens.

**Suggested owner:** **P4.6** (the bridge arm and flow are its), with the §60c contract note
cross-referenced to P4.4's Save gate.

---

### R-2 — [MAJOR, top priority] Deleting a location or case orphans every captured `blob:` URL it held

**Lane:** web W-1 (filed as blocker — re-ruled, see below)
**Files:** `features/demo/ui/DemoExperience.tsx:1054-1067` (`confirmDelete`) ·
`features/demo/engine/store/create-store.ts:536-546` (`deleteCase`), `:564-572` (`deleteLocation`)
**Correct pattern, same file:** `deleteMediaItem` (`DemoExperience.tsx:716-723`)

Once a capture is saved, the surface has `release`d the URL and the store is sole owner — §58g's
carry-rule states *"once the store owns a capture's URL, `deleteMedia` is the only thing that can
revoke it."* P4.3/P4.6 gave the store a media population; `deleteCase`/`deleteLocation` now drop
those rows with nothing left in the page holding a reference to revoke. Verified at source
(trace above). Neither §58g nor §63h covers the cascade path. The natural demo loop
(create → capture → delete → repeat) pins ~10–20 MB per cycle without bound.

**Severity ruling (lane BLOCKER → MAJOR).** On the merits: the leak is memory-only, tab-lifetime,
invisible to the visitor, loses no data, misleads nobody, and self-heals on tab close. It violates
a filed carry-rule and must be fixed this round — but it does not destroy visitor work or state a
falsehood, which is what separates R-1's blocker from this. Top-priority major.

**Fix shape:** in `confirmDelete`, before the store write, collect the doomed locations' media
(`photos`/`videos`/`audios`, `url` + `poster`) and sweep through the already-imported
`revokeCapturedUrls` (it no-ops on `/demo-media/…` sample paths, `object-urls.ts:106-110`). The
lane's snippet in `lane-web.md` § W-1 is correct as written. Pin with a cascade twin of the
`deleteMediaItem` revocation test.

**Suggested owner:** **P4.1** (`confirmDelete` predates P4; the fix consumes P4.1's
`revokeCapturedUrls` — per the orchestrator's routing note).

---

### R-3 — [MAJOR] Camera-but-no-`MediaRecorder`: video mode states a falsehood over a live viewfinder, because `CaptureCapability` answers a per-operation question operation-blind

**Lanes:** type-design TYPE-DESIGN-1 (major) · typescript TS-2 (major) · silent-failures S-3
(minor) — three lenses, one defect
**Files:** `features/demo/ui/inputs/useMediaCapture.ts:234-238` (`sampleOnly = !stream ||
!objectUrls` — omits `record`; `capability.record` has exactly one consumer, the audio flow) ·
`features/demo/ui/screens/MediaCaptureScreen.tsx:253` (branches on `sampleOnly` only), `:263-267`
(video branch calls `startRecording()` unchecked) → `capture-media.ts:355` (`UNSUPPORTED`) →
`permissions.ts:102-103` (*"This browser doesn't expose a camera to this page — nothing was
captured."*) · `engine/logic/media/samples.ts:89-94` (`NO_RECORDER_NOTICE.camera` — the honest
sentence, zero readers)
**Correct pattern, same PR:** `AudioRecordingFlow.tsx:146-154` + `:223` reads `capability.record`,
degrades to sample mode, picks `NO_RECORDER_NOTICE.microphone`.

On a browser with `getUserMedia` but no `MediaRecorder` (Safari ≤ 14.0, hardened/embedded
WebViews — narrow population, stated honestly), the viewfinder is live, the shutter says
"Start recording", and every press prints a sentence that is affirmatively false while the camera
renders behind it. Video mode is a dead end with no sample fallback (audio offers one). §61f
records that `NO_RECORDER_NOTICE` was keyed by facility *"so P4.3 can reuse it"* — P4.3 did not.
The type-design lens explains the mechanism: `sampleOnly` is the answer for a *photo*, consumed
as the answer for everything; the audio flow re-derives the truth by hand, so two consumers hold
two meanings. S-3's rider (fold in): the review-stage sample notice is also picked by
`sampleOnly` alone, so a live-camera/no-`objectUrls` browser renders "This browser exposes no
camera to the page" — the very sentence the unavailable panel refuses as "simply false"
(`MediaCaptureScreen.tsx:345-347`).

**Fix shape** (two halves, land together):
1. **Screen (copy + behaviour):** consume `capability.record` in `MediaCaptureScreen` the way the
   audio flow does — `stream && !record` in video mode → sample-attaching shutter
   (`captureSample('video')`, label `Attach sample clip`) + `NO_RECORDER_NOTICE.camera`; pick the
   review-stage notice by the same `canStream` test. Pin with `deps={{ recorder: null,
   mediaDevices: <working stub> }}` asserting the UNSUPPORTED sentence is absent.
2. **Type (the drift-killer):** replace the stored `sampleOnly` derivation with a per-operation
   answer — TYPE-DESIGN-1's `modeFor(kind): 'live' | 'sample'` (or a per-facility discriminated
   union). This collapses the audio flow's hand-rolled `!canStream || !canRecord` onto the same
   rule and deletes the `objectUrls`-only-feeds-`sampleOnly` dead weight.

**Suggested owner:** **P4.1** (capability type) + **P4.3** (screen consumption); P4.6 picks up
the `modeFor` collapse in its flow.

---

### R-4 — [MAJOR] A live OCR recognition landing after the visitor picked a sample frame silently replaces their result; the failure branch's notice lands where nothing renders it

**Lane:** silent-failures S-2
**Files:** `features/demo/ui/screens/OcrCaptureScreen.tsx:226-261` (`runLiveCapture` — `aliveRef`
is the only post-await guard; verified, no generation token), `:283` (confirm-stage early
return), `:526-545` (notice block, aim stage only), `:549-556` (sample buttons — verified
ungated during `reading`)

First live recognition is slow by construction (lazy `import('tesseract.js')` + ~6.8 MB of
self-hosted assets + wasm compile). An impatient visitor presses "Use sample DVR clock", lands in
the confirm stage, starts correcting the value — then the live read resolves. Success: it
overwrites `ocrResult`, resets `ocrDraft` (discarding the visitor's typed correction), swaps
`ocrProof`, flips the badge from `Sample` to a measured score — no announcement. Failure:
`setNotice` writes into a stage that never renders it, and the message materialises out of
context on the next Retake. The DVR timestamp is the value that becomes the calibration offset —
it must not change underneath the operator. The repo already owns the right pattern for exactly
this race: `importGen` (p1-review H2, commit `0945fd8`).

**Fix shape:** a generation token (`readGen` ref): capture `const gen = ++readGen.current` in
`runLiveCapture` and bump it in `onUseSample`/shutter before delegating; bail after each await
unless current. Additionally disable the three sample buttons while `reading` (belt), and render
or clear the notice on stage transitions so it can never surface detached from its cause.

**Suggested owner:** **P4.7**.

---

### R-5 — [MAJOR] P4.7's live-OCR bridge arm (`runOcrLive`) can be gutted with the full suite and tsc green — the three regressions it permits are the PR's own headline claims

**Lane:** tests T-2 — **reproduced by the aggregator** (full suite 2479 green + tsc clean with
`measured: false`, `imageDataUrl` dropped, `fallbackActual: SAMPLE_ACTUAL_TIME`)
**Files:** `features/demo/ui/DemoExperience.tsx:1421-1428` (`runOcrLive`); coverage ends at
`OcrCaptureScreen.live.test.tsx:161-163` (what the screen hands up) and
`DemoExperience.ocr.test.tsx:203-220` (a hand-injected proof surviving the snapshot) — the
mapping between them is unexecuted.

What slips through, silently: (1) a live read rendering the R-16 "Sample" badge over the
recogniser's own measured score — §64g's "inverse dishonesty"; (2) `OcrProof.imageDataUrl` never
written — the always-empty evidence block that commit `df1eda8` exists to fix; (3) a live read
computing its offset against the hard-coded sample instant — a wrong forensic number presented as
calculated.

**Fix shape:** one bridge test in `DemoExperience.ocr.test.tsx`, T-2's preferred shape: stub
`OcrCaptureScreen` at the module boundary (its own behaviour is fully pinned in two suites) with
a button invoking `props.onLiveRead({...})`; assert no Sample badge, the proof's `imageDataUrl`
in the store, and `capture.actualDateTime` from the stubbed clock, not `SAMPLE_ACTUAL_TIME`.

**Suggested owner:** **P4.7** (its bridge arm).

---

### R-6 — [MAJOR] The canonical `OcrProof` is re-declared inline at the one write site the snapshot guard cannot see — a future required field is a silent whole-tab wipe

**Lane:** type-design TYPE-DESIGN-2
**Files:** `features/demo/ui/DemoExperience.tsx:413` (anonymous 4-field ref), `:1444` (write via
`updateField('capture.ocr', …)` — `unknown`-valued, nothing type-checks the payload) · canonical
`OcrProof` at `engine/types/index.ts:92-98`

Probed destructively by the lane (required field added to `OcrProof` → two `tsc` errors, both in
`persistence.ts`, **zero** at this writer): the schema author is forced to update, the writer
keeps emitting short proofs, `safeParse` fails at next boot, and `loadSnapshot.discard()` drops
the visitor's entire session — with `SNAPSHOT_VERSION` unchanged, so not even
version-attributable. This PR itself performed exactly that three-file lockstep edit by hand
(`imageDataUrl`); it held only because one author did all three.

**Fix shape:** two lines, no runtime change — `useRef<Omit<OcrProof, 'parsedDateTime'> | null>`
and an annotated `const proof: OcrProof = { ...ocrProof.current, parsedDateTime: … }` before the
`updateField`. Compatible with (not pre-empting) deferred §5's typed-`updateField`.

**Suggested owner:** **P4.7** (the OCR bridge write site).

---

### R-7 — [MAJOR] The camera (and its microphone track) stays open through the entire photo/video review stage

**Lane:** web W-2
**Files:** `features/demo/ui/screens/MediaCaptureScreen.tsx` — `close` never destructured from
the hook (verified), `:313-323` review early-return, `:231-238` `srcObject` effect keyed on
`[stream]` · `withAudio` unconditional (`:201`, §58e/§60d) so the mic is held too
**Correct pattern, same PR:** `OcrCaptureScreen.tsx:209-224` (close on capture, `reopenOnAimRef`
latch for Retake) and `AudioRecordingFlow.tsx:161-166` (§61g — the reason recorded in words).

Camera LED and tab indicator stay lit for the whole review window (filename, caption, decide),
with nothing rendering the stream — the exact state `useCaptureStream.ts:152-156` names as the
thing to avoid. Both sibling surfaces in this same PR release and record why; the argument is not
audio-specific and nothing in §§58–60 files this.

**Fix shape:** port `OcrCaptureScreen`'s effect: close when `captured` becomes non-null, reopen
on Retake through a `reopenOnAimRef`-style latch (no surprise prompt for sample-path visitors).
`stopRecording` produces the capture before the close fires — no ordering hazard.

**Suggested owner:** **P4.3**.

---

### R-8 — [MAJOR] `MediaFullscreen` is an `aria-modal` dialog with no focus management

**Lane:** web W-3
**Files:** `features/demo/ui/screens/MediaLibrarySheet.tsx:312-370`; reference pattern
`AlertDialog.tsx:56-62`

Photo branch: focus stays on the "View fullscreen" button that `aria-modal="true"` just pruned
from the a11y tree; Tab then walks every hidden control behind the layer before reaching "Close
fullscreen". Video branch: `autoFocus` on the `<video>` gets in, but close drops focus to
`<body>`. Aggravating: two simultaneous `aria-modal` dialogs in the DOM (`ModalShell` + this).
§63e files Escape behaviour only; focus appears nowhere in §§58–64.

**Fix shape:** copy `AlertDialog`'s two effects onto the fullscreen container (`tabIndex={-1}` +
focus on mount; restore `document.activeElement` guarded by `isConnected` on unmount); drop the
`<video>` `autoFocus` so both branches take one path.

**Suggested owner:** **P4.5**.

---

### R-9 — [MAJOR] The video Stop gate is a native `disabled` that drops keyboard focus and refuses silently — the same 500 ms gate the same PR ships with the honest idiom on the audio surface

**Lane:** web W-4
**Files:** `features/demo/ui/screens/MediaCaptureScreen.tsx:466` (verified:
`disabled={busy || (mode === 'video' && isRecording && !canStop)}`)
**Contrast, same PR, same gate:** `AudioRecorderScreen.tsx:104/107/266-292` — `aria-disabled` +
guarded handler + `role="status"` reason on both stop affordances.

**Adjudication against the ledger.** §60f files the *decision* to gate video Stop — that stands,
and is not re-flagged. §60f's sentence "the shutter renders disabled for that sub-second window"
describes the implementation but defends only the gate, never the native-`disabled` mechanism;
§61b meanwhile asserts the demo gates "using the established `aria-disabled` + guarded-handler +
`role="status"` reason idiom (§44b / R-15)" — true of the audio surface, false of the video
shutter. W-4 brings new evidence (the focus-drop failure shape this repo itself documents at
`OcrCaptureScreen.tsx:348-354` as R-7/R-35): the moment recording starts, the just-pressed
shutter becomes `disabled`, the browser blurs to `<body>`, and 500 ms later the control
re-enables with focus lost; a screen-reader user meets a dead control with no stated reason.
Finding stands; the fix should also touch §60f's wording so the ledger matches the mechanism.

**Fold into the same fix pass** (longer windows, same shape): `OcrCaptureScreen.tsx:561`
(`disabled={reading}` spans the tesseract cold boot), and the `disabled={isOpening}` sites
(`OcrCaptureScreen.tsx:502/510/518`, `MediaCaptureScreen.tsx:620`) spanning the browser
permission prompt.

**Fix shape:** the `AudioRecorderScreen` idiom — keep enabled, `aria-disabled`, guard inside
`onShutter` (already early-returns on `!canStop` at `:272`), reason line in the existing notice
block with `role="status"` + `aria-describedby`.

**Suggested owner:** **P4.3** (shutter + its `isOpening` site); **P4.7** for its two fold-in
sites in the same round.

---

### R-10 — [MAJOR] The OCR strip's 1280 px size bound is unexercised at the screen — and §64a's decision to persist the proof rests on that bound

**Lane:** tests T-4 — **reproduced by the aggregator** (deleted `targetWidth` + `quality` from
the screen's `grabVideoFrame` call; all five OCR-touching suites, 70 tests, green)
**Files:** `features/demo/ui/screens/OcrCaptureScreen.tsx:231-239`; the option is pinned only at
unit level (`capture-media.test.ts:292-304`). Both live screen tests use resolutions whose
cropped strip is already under the bound, so removing the cap changes nothing they assert.

Without the cap, a 4K webcam yields a 3456×367 strip (~an order of magnitude more base64);
`persistDemoStore`'s write throws and the failure policy **deliberately clears the snapshot** —
the visitor's whole session drops at next refresh, surfaced only by the drawer status line.

**Fix shape:** T-4's third case in `OcrCaptureScreen.live.test.tsx`: `sizeVideo(3840, 2160)`,
assert `h.canvas.drawCalls[0].slice(1)` equals `[192, 896, 3456, 367, 0, 0, 1280, 136]` (the
numbers `capture-media.test.ts:303` already derives) + `h.canvas.width === 1280` — pins crop,
cap, and aspect-preserving scale in one case. (The *encoding quality* half of this byte budget is
R-15, a separate production question.)

**Suggested owner:** **P4.7**.

---

### R-11 — [MAJOR] `recording.test.ts` locks `.mp4` onto a Matroska container under a comment describing a recognition branch that does not exist

**Lane:** tests T-5 (lane-probed: adding an honest `matroska → 'mkv'` branch fails exactly this
one assertion across 87 files)
**Files:** `features/demo/engine/logic/media/__tests__/recording.test.ts:221` · production
`recording.ts:236-247` (`video/x-matroska;codecs=avc1` matches no branch; the `.mp4` comes from
the `PHONE_MEDIA_EXTENSIONS` fallback the docblock reserves for MIME types carrying *no*
container information — Matroska *is* the container)

Not covered by the DO-NOT-RE-FLAG list (which names `.mp4`/`.m4a`-on-**WebM** only), and §58c
itself names `video/x-matroska` as the motivating Chrome case for honest extensions. The path is
live (`capture-media.test.ts:473-480` exercises a recorder reporting exactly this string →
`CapturedMedia.mimeType` → `mediaFilename`). As it stands, the test is the one thing that would
*block* the honest fix, under a comment that misdescribes the mechanism.

**Fix shape:** T-5's fork, decided by the owner: (a) add the `matroska → 'mkv'` branch and flip
the row, or (b) file the `.mp4` choice as a §58c sub-item with an argued rationale and rewrite
the comment to name the fallback path. Either way the comment stops describing a branch that
isn't there.

**Suggested owner:** **P4.1** (`engine/logic/media/recording.ts` is its).

---

### R-12 — [MAJOR] §61g's "a failed stop keeps the microphone" arm is unpinned — and the ledger asserts both directions are pinned

**Lane:** tests T-3 (lane-probed: making `handleStop` close unconditionally leaves 23/23 green)
**Files:** `AudioRecordingFlow.tsx:161-166` (`if (result !== null) capture.close()`) ·
`AudioRecordingFlow.test.tsx:277-293` (asserts alert text + absence of Review, both of which
survive the regression) · `deferred.md` §61g ("Both directions are pinned" — currently false)

The unpinned regression: after a zero-byte take the mic is released, `mode` computes `'offer'`,
and the visitor lands on "Enable microphone" instead of the recorder with a live Start button —
losing the retry affordance the decision exists to preserve.

**Fix shape:** two assertions in the existing test (`track.stop` not called; Start-recording
button present), plus correct §61g's sentence once true.

**Suggested owner:** **P4.6**.

---

## Minors (all deduped, each with suggested owner)

### R-13 — [MINOR] A recorder the browser stops by itself is never observed; `durationSec` then overstates the clip
**Lane:** silent-failures S-4. `capture-media.ts:413-415` (`onstop` settles into nobody when no
`stop()` is pending — no `track.onended`/`oninactive` anywhere in the diff);
`useMediaCapture.ts:351` computes `durationSec` from wall clock, so a self-ended 10 s take saved
after 30 s claims 30 s — an unmeasured number rendered as fact in review, rows, and info panel.
Fix: an `onEnded` callback from `instance.onstop` (or `track.onended` in `useCaptureStream`) +
prefer recorded length when the two disagree, per §58f's treatment of `sizeBytes`.
**Owner: P4.1.**

### R-14 — [MINOR] A stale grab/recording failure masks a newer acquisition failure
**Lane:** typescript TS-3. `useMediaCapture.ts:415` (`ownFailure ?? streamState.failure`):
`open()` clears only the stream-side failure, so after a grab failure a failed device switch
shows the old sentence over the new state. Fix: wrap `open`/`selectDevice` to
`setOwnFailure(null)` before delegating; mutation-probe the wrap.
**Owner: P4.1.**

### R-15 — [MINOR] The persisted OCR strip is JPEG q=1.0 — ~2–3× the byte budget §64a states, on the sessionStorage-quota path
**Lane:** web W-8 (with lane-run measurements: q100 ≈ 163 KB base64 vs §64a's stated 35–80 KB).
`OcrCaptureScreen.tsx:92` drives both the recognition blob (max quality justified) and the
persisted data URL (not) through one `quality`. Quota overflow **clears the snapshot**
(`persistence.ts:599-604`). Distinct from R-10 (the pixel bound); this is the *encoding* half.
Fix: decouple (separate `dataUrlQuality` ≈ 0.85) or drop `OCR_CAPTURE_QUALITY` to ~0.9 — §64f's
node lab can confirm recognition is unaffected.
**Owner: P4.7.**

### R-16 — [MINOR] The recording badge announces elapsed time once a second, for up to an hour
**Lane:** web W-5. `MediaCaptureScreen.tsx:376-407` — `role="timer"` with explicit
`aria-live="polite"` overriding the role's deliberate default of `off`; genuine status changes
queue behind up to 3600 announcements. The same PR ships the identical widget silent
(`AudioRecorderScreen.tsx:154-159`). Fix: drop `aria-live`, keep `role="timer"` + `aria-label`.
**Owner: P4.3.**

### R-17 — [MINOR] New infinite blink animations on the audio recorder are not reduced-motion gated
**Lane:** web W-6. `AudioRecorderScreen.tsx:170-177`, `:200` — ungated `blinkDot` loops;
`demo.css:120-122` records the call-site-gating convention and `MediaCaptureScreen.tsx:399`
gates the identical keyframe in this same PR. Fix: thread `deps.reducedMotion` (already plumbed
to the analyser) into the presentation; same pass covers the `Bar`/level/record-button
transitions (see R-20).
**Owner: P4.6.**

### R-18 — [MINOR] `role="tablist"` without the tablist keyboard model or a tabpanel
**Lane:** web W-7. `MediaLibrarySheet.tsx:186-239` — three tabs, no roving tabindex, no arrow
keys, no `aria-controls`/`tabpanel`; announces a keyboard model it doesn't implement. Sibling in
this PR uses `role="group"` + `aria-pressed` (`MediaCaptureScreen.tsx:440-456`). Fix: drop to the
sibling's shape (smaller), or complete the APG contract.
**Owner: P4.5.**

### R-19 — [MINOR] Right-click on a media row opens the destructive delete confirmation
**Lane:** web W-9. `MediaLibrarySheet.tsx:509` — `useLongPress(onRequestDelete)`'s context-menu
path suppresses the browser menu and fires the callback; the only call site of three where that
lands on a destructive path. Fix: `{ contextMenu: false }` opt-out on the primitive for
destructive callbacks, or hand it a non-destructive callback (select).
**Owner: P4.5.**

### R-20 — [MINOR] The 40-bar waveform animates `height` on 80 nodes at ~16 Hz for the whole take
**Lane:** web W-10. `AudioRecorderScreen.tsx:207-212`/`:344-362` — percentage-height transitions
restarted every 60 ms tick force style/layout/paint continuously beside a live recorder +
`AudioContext`; also `readAudioTrackFormat(stream)` runs at render scope
(`AudioRecordingFlow.tsx:206`). Fix: `transform: scaleY()` (composited) or drop the transition;
memoize the format read on `[stream]`.
**Owner: P4.6.**

### R-21 — [MINOR] The 1-hour auto-stop leaves the microphone open through the review screen
**Lane:** silent-failures S-5. `useMediaCapture.ts:218-232` auto-stop bypasses `handleStop` — the
only `close()` site — so the browser's mic indicator asserts a live microphone over a finished
take, the exact false statement §61g exists to prevent, on the one path that skips it. R-7's
sibling on the audio surface. Fix: route auto-stop through the flow (via `onMaxDuration` or a
`phase === 'stopped' && captured` reaction) so exactly one path assembles-then-releases.
**Owner: P4.6.**

### R-22 — [MINOR] `grabVideoFrame`'s two DOM calls can throw and neither call site catches — dead shutter, no notice
**Lane:** silent-failures S-6. `capture-media.ts:282` (`drawImage`), `:295` (`toDataURL`) sit
outside the four typed `FRAME_GRAB_FAILED` checks; both call sites are `try/finally` with no
`catch`, so a throw is a floating rejection and a shutter press that does nothing. Fix: wrap both
in the existing typed-failure shape so the outcome union is total.
**Owner: P4.1.**

### R-23 — [MINOR] `addMedia(kind, item)` / `deleteMedia(kind, id)` — a correlated parameter pair, given its first production callers by this PR
**Lane:** type-design TYPE-DESIGN-3 (un-defer trigger fired). `create-store.ts:304-305`;
`kind !== item.kind` compiles, and the mismatch's end state is an *undeletable* library row.
`saveAudioNote` hard-codes `'audio'` beside a full-union `captured.kind` — correct today via two
facts three files apart (cross-ref R-1's fix, which touches the same lines). Fix: drop the
parameter — `addMedia(item)` / `deleteMedia(Pick<MediaItem, 'kind' | 'id'>)` deriving the bucket
via `mediaBucket`.
**Owner: P4.1** (store seam; orchestrator routes final).

### R-24 — [MINOR] `isMediaAvailable` returns bare `boolean` — the v6 url-present invariant doesn't narrow, and one site re-derives it by hand
**Lane:** type-design TYPE-DESIGN-4. `captured.ts:152-154`; `MediaThumbnail`
(`MediaLibrarySheet.tsx:599`) is the third hand-written copy of the rule. Fix: one word —
`item is AvailableMedia` (`MediaItem & { url: string }`); `MediaContent`/`MediaFullscreen` take
`AvailableMedia`.
**Owner: P4.5** (consumers; predicate lives in P4.1's module — coordinate).

### R-25 — [MINOR] `FrameGrabOptions.crop` re-declares `NormalizedCrop` structurally — the unit lives in prose
**Lane:** type-design TYPE-DESIGN-5. `capture-media.ts:209` vs canonical `ocr-crop.ts:30-35`; a
pixel-space rect compiles and produces a blank strip reported as a recognition failure. Fix:
`import type { NormalizedCrop }` and declare `crop?: NormalizedCrop` (type-only, no cycle).
**Owner: P4.1.**

### R-26 — [MINOR] `MediaLibraryTab` pairs `kind` and `bucket` with no type link — deferred §4's trigger has fired
**Lane:** type-design TYPE-DESIGN-6. `library.ts:23-33`; `kind: 'audio', bucket: 'videos'`
compiles; same undeletable-row end state as R-23 from the other side. Fix: drop `bucket`, derive
via one `Record<MediaKind, keyof MediaBuckets>` that `store/helpers.mediaBucket` also consumes.
**Owner: P4.5.**

### R-27 — [MINOR] The new `RecordingPhase` consumers use `default:` where three sibling files in this same diff use `assertNever`
**Lane:** type-design TYPE-DESIGN-7. `audio-levels.ts:120-129`, `:133-142` — a future phase
silently renders READY over a live recorder. Fix: name the two absorbed cases, close with
`assertNever`. (Same class, recorded: `AudioRecorderScreen`'s `RecorderMode` else-chain.)
**Owner: P4.6.**

### R-28 — [MINOR] Two engine exports with no production consumer, against the barrel's own stated rule
**Lane:** typescript TS-4. `samples.ts:97` (`facilityForKind`), `recording.ts:123`
(`canStopRecording`) — test-only consumers; the barrel header names this exact drift. The third
item TS-4 listed (`NO_RECORDER_NOTICE.camera`'s zero readers) resolves via R-3 and is folded
there. Fix: delete or document intended callers.
**Owner: P4.1.**

### R-29 — [MINOR] `deviceFailure`'s on-screen line is unpinned in both capture screens
**Lane:** tests T-6 (lane-probed: deleting both render lines leaves 907 tests green). §60e calls
the line load-bearing. Fix: one `harness({ live: true })` case with `enumerateDevices` rejecting,
asserting the message renders and no Switch-camera control appears; twin for the OCR screen.
**Owner: P4.3** (+ P4.7 twin).

### R-30 — [MINOR] `deleteMediaItem`'s poster revocation is unexercised (latent — no `blob:` poster producer exists yet)
**Lane:** tests T-7 (lane-probed). `DemoExperience.tsx:720`; no fixture sets `poster`. Fix: add
`poster: 'blob:two'` to the deleted fixture and assert both revocations — or land it with the
first poster producer. Same note for `useMediaCapture.ts:247`/`:390`.
**Owner: P4.5.**

### R-31 — [MINOR] A capability assertion that asserts nothing
**Lane:** tests T-8. `useMediaCapture.test.ts:67-72` — `objectUrls: expect.any(Boolean)`; §58a
establishes the value is deterministically `true` under Vitest. Fix: pin `true` with the §58a
one-liner as comment.
**Owner: P4.1.**

### R-32 — [MINOR] `disposeDvrRecognizer` during a still-booting worker is uncovered, against the docblock's explicit claim
**Lane:** tests T-9 (by inspection). `ocr-recognize.ts:91-104`; real path is Cancel during the
first shutter's ~6.8 MB asset fetch. Fix: deferred-`createWorker` case — dispose mid-boot,
resolve, assert `terminate`.
**Owner: P4.7.**

### R-33 — [NIT] `mediaLibraryTab()` widens the literal registry entry back to `MediaLibraryTab`
**Lane:** type-design TYPE-DESIGN-N1. `library.ts:72-78`. Fix only in the same edit as R-26
(`: (typeof MEDIA_LIBRARY_TABS)[number]`).
**Owner: P4.5.**

---

## Struck & re-ruled

**Struck: none.** Every lane finding survived verification — each was checked against the
deliberate-choices list, §§58–64, and the source; none re-litigates a filed decision without new
evidence. Three rulings of note:

1. **W-1 demoted BLOCKER → MAJOR (R-2).** Memory-only, tab-lifetime, invisible, no data or
   honesty failure — does not meet the bar R-1 sets. It remains first among majors because it
   violates §58g's stated carry-rule and the fix is trivially available.
2. **T-1 upheld at BLOCKER over the two majors filed on the same defect (R-1).** Silent
   destruction of visitor-created work presented as success, one ungated click from boot, is the
   demo honesty rule's worst failure class; the phone and the same-PR photo sibling both guard it.
3. **W-4 upheld against a §60f/§61b re-flag challenge (R-9).** §60f defends the *gate*, not the
   native-`disabled` mechanism; §61b's claimed idiom ("both controls… `aria-disabled` +
   guarded-handler") is asserted for this gate and holds only on the audio surface. New evidence
   (the R-7/R-35 focus-drop shape, documented in-repo) carries it. The fix must also amend §60f's
   "renders disabled" wording so ledger and mechanism agree.

Additionally: silent-failures' S-3 was **merged** (not struck) into R-3 as the third lens on the
capability gap, and TS-4's dead-copy-key item was folded into R-3's fix. S-1's pre-existing
`confirmOcr`/`calculateOffset` sibling (silent no-op with no location, unchanged by P4) is out of
this PR's scope — the orchestrator should ledger it as a §65 line or a follow-up finding so R-1's
guard pattern gets applied there next time that code is open.

---

## Owner-routing table (suggested — orchestrator routes final)

| R-ID | Severity | Suggested owner |
|---|---|---|
| R-1 | BLOCKER | P4.6 |
| R-2 | MAJOR | P4.1 |
| R-3 | MAJOR | P4.1 (type) + P4.3 (screen) |
| R-4 | MAJOR | P4.7 |
| R-5 | MAJOR | P4.7 |
| R-6 | MAJOR | P4.7 |
| R-7 | MAJOR | P4.3 |
| R-8 | MAJOR | P4.5 |
| R-9 | MAJOR | P4.3 (+ P4.7 fold-ins) |
| R-10 | MAJOR | P4.7 |
| R-11 | MAJOR | P4.1 |
| R-12 | MAJOR | P4.6 |
| R-13 | MINOR | P4.1 |
| R-14 | MINOR | P4.1 |
| R-15 | MINOR | P4.7 |
| R-16 | MINOR | P4.3 |
| R-17 | MINOR | P4.6 |
| R-18 | MINOR | P4.5 |
| R-19 | MINOR | P4.5 |
| R-20 | MINOR | P4.6 |
| R-21 | MINOR | P4.6 |
| R-22 | MINOR | P4.1 |
| R-23 | MINOR | P4.1 |
| R-24 | MINOR | P4.5 (predicate in P4.1's module) |
| R-25 | MINOR | P4.1 |
| R-26 | MINOR | P4.5 |
| R-27 | MINOR | P4.6 |
| R-28 | MINOR | P4.1 |
| R-29 | MINOR | P4.3 (+ P4.7 twin) |
| R-30 | MINOR | P4.5 |
| R-31 | MINOR | P4.1 |
| R-32 | MINOR | P4.7 |
| R-33 | NIT | P4.5 |

Package load: P4.1 ×10 · P4.3 ×5 · P4.5 ×7 · P4.6 ×6 · P4.7 ×8 (shared findings counted at each
named owner). P4.2, P4.4 and the rider drew no findings.
