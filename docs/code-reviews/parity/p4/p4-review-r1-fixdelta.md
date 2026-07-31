# P4 review — fix-delta r1, VETTED (aggregated across five lanes)

**Fix diff:** `d09a291..cd819ee` on `feat/parity-p4` (five fix-package merges + the §66d rider),
aggregated at `cd819ee`. Gates at head: **220 files / 2561 tests green** (re-run twice by the
tests lane), `tsc --noEmit` clean, `/demo` First Load JS 107 kB unmoved.
**Inputs:** the five `## Fix-delta r1` lane sections · `p4-review-r1-vetted.md` (the R-map) ·
ledger §§65–69 · PR #33's commit→finding comment.
**Tree verified by the aggregator:** clean apart from the five lane docs; every lane's probes
reverted. Spot-checked at source before ruling: FD-2's three residual lines, FD-1's
`handleRef` ordering, FD-3's two bare `open()` sites, FD-5's bare `catch`.

## Verdict: **ONE TARGETED ROUND** (micro-scope, then merge)

All five lanes verify the round as APPROVE-grade: **32 of 33 vetted findings FIXED, 1 PARTIAL
(R-3's audio clause), 0 UNFIXED**, the §66d rider fixed and endorsed, zero fix-introduced test
rot (every coverage-removing deletion traced to an equal-or-stronger replacement, by probe), and
every disclosed deviation accepted on the merits — several fixes landed stronger than the vetted
shape asked (R-2's engine helper, R-4's supersession release, R-11 taking the honest fork plus
`.mka`, R-19's menu preservation, R-24/R-26 conversions).

The verdict is a targeted round rather than plain APPROVE for one reason of substance and one of
discipline. Substance: FD-2 is R-3's falsehood class alive on the third capture surface, and
FD-4 transiently resurfaces the exact sentence this round spent two fixes removing. Discipline:
FD-2 is a **disclosed deferral (§65c) whose own named trigger — "P4.6's fix round" — fired
inside this very merge and lapsed silently** (§68 is that round and is silent on it). Deferring
it a second time would repeat the documented process failure while the fleet is warm and the
total surviving work is ~30 lines across four files. No re-review fan-out is needed: the
originating lanes spot-verify their items (typescript + type-design on FD-2; web +
silent-failures on FD-3/FD-4) and the rest is pin-backed.

## Delta counts after aggregation

| | Count |
|---|---|
| Vetted findings FIXED | 32 (+ §66d rider) |
| Vetted findings PARTIAL | 1 (R-3, audio clause — FD-2) |
| Vetted findings UNFIXED | 0 |
| New actionable (this round) | 5 (FD-1, FD-3, FD-4, FD-5 code · FD-7 doc) + 1 riding nit (FD-6) |
| New recorded, no action | 3 (T-10, D1, D3) |

Raw new finds across lanes: 8 + 2 PARTIALs. The two PARTIALs (typescript TS-2, type-design
TYPE-DESIGN-1) are the **same residual** and merge to FD-2. N-2 and W-11 are distinct defects
sharing R-7's reopen-window code region — kept separate (FD-4, FD-3), flagged for one fixer.

---

## Surviving work

### FD-2 — [MINOR · top priority] `AudioRecordingFlow` still hand-rolls both capability derivations, omitting `objectUrls` — R-3's falsehood class on the third surface, past its lapsed trigger

**Lanes:** typescript (TS-2 PARTIAL) + type-design (TYPE-DESIGN-1 PARTIAL) — merged
**Files:** `features/demo/ui/screens/AudioRecordingFlow.tsx:113-114` (raw boolean reads), `:179`
(`mode` from `!canStream || !canRecord`), `:255` (`sampleNotice = canStream ?
NO_RECORDER_NOTICE.microphone : SAMPLE_MEDIA_NOTICE.microphone`) — all verified still present at
`cd819ee`, while `capability.modeFor('audio')` and `capability.sampleNotice` sit computed and
unconsumed one layer down (`useMediaCapture.ts:255-256`).

Both hand-rolled copies miss the `objectUrls` term. On a `{stream: true, record: true,
objectUrls: false}` browser the engine answers `'sample'`; the flow renders the **full live
recorder**, mic open, meter moving. The visitor records a take, presses Stop, and
`finishTake`'s registry check answers `captureFailure('UNSUPPORTED', 'microphone')` — *"This
browser doesn't expose a microphone to this page"* — after a completed recording beneath a meter
that visibly responded to their voice. The `:255` ternary is also structurally unable to produce
`NO_CAPTURE_STORAGE_NOTICE`, the sentence §65b added for exactly this state. Population is rarer
than R-3's original (hence MINOR, per both filing lanes); the real cost is the design drift the
type half of R-3 exists to kill, plus the lapsed §65c trigger.

**Fix shape (~3 lines + pin):** derive `mode`'s sample arm from
`capture.capability.modeFor('audio') === 'sample'`, pass
`sampleNotice={capture.capability.sampleNotice}`, delete the flow's two notice imports; convert
the remaining raw-boolean reader (the `:153` openStream gate). Pin with a
`deps.objectUrls: null` flow test asserting sample mode + the storage notice.
**Optional coda (orchestrator's call, crosses into P4.1's file):** once no external reader of
the raw booleans remains, drop `CaptureSupport` from the public `CaptureCapability` — the state
type-design names as making the finding structurally unrepeatable. FD-6 rides whichever commit
touches that file.
**Owner: P4.6** (flow) — coda + FD-6 land with **P4.1**.

### FD-1 — [MINOR] `abortRecording()` can no longer reach a take whose `stop()` is in flight; the assembled capture is published for a cancelled take

**Lane:** typescript (new, fix-introduced by R-13's `finishTake` split)
**File:** `features/demo/ui/inputs/useMediaCapture.ts:351-357` — `handleRef.current = null`
moved **before** `await handle.stop()` (verified at source); `abortRecording`'s only route to
the recorder is `handleRef.current?.abort()`, and the post-await guard is `abortedRef` — the
**unmount** flag, not an abort flag.

Lane-proven both directions: a flow-level probe (Cancel between Stop and `emitStop`) fails at
`cd819ee` (review screen renders for the cancelled take) and passes with `useMediaCapture.ts`
restored to `d09a291`. **Latent today** — the single production caller pairs `abortRecording()`
with unmount, so `abortedRef` intercepts — but the hook's stated contract ("abandon the take and
discard its bytes") is now false precisely in the window it exists for, and `MediaCaptureScreen`
already holds an `abortRecording` it does not yet call.

**Fix shape:** keep the abort path able to reach the take — leave `handleRef.current` set until
after the await and re-check `handleRef.current === handle` before publishing, or an
abort-generation flag re-checked after the await (the `readGen` shape R-4 just adopted two files
away). Pin with the lane's four-line probe (harness already exposes manual `emitStop`).
**Owner: P4.1.**

### FD-3 — [MINOR] The review-stage reopen discards the camera the visitor chose

**Lane:** web (W-11, fix-introduced by R-7; pre-existing twin on the OCR screen)
**Files:** `features/demo/ui/screens/MediaCaptureScreen.tsx:266` and
`features/demo/ui/screens/OcrCaptureScreen.tsx:246` — both `void open()` with no device
argument (verified at source), while `close()` deliberately preserves `selectedDeviceId`.

Two-camera machine: Switch camera to the external one → capture → Retake → the viewfinder comes
back on the **default** camera, caption silently follows. Unreachable on `MediaCaptureScreen`
before R-7 closed the stream mid-screen; the OCR twin has existed since P4.7. Not pinned —
nothing asserts device identity across the round trip.

**Fix shape:** `void open(selectedDeviceId ?? undefined)` at both sites + a device-identity pin.
Trade-off to state in the commit: the exact-pin fails loudly as `NO_DEVICE` if that camera was
unplugged during review, routing to the honest unavailable/prompt panels — the better outcome;
the alternative (keep the default fallback but say so) is a notice line, not a silent swap.
**Owner: P4.3** (both sites — same fix, same commit).

### FD-4 — [MINOR] R-7's reopen window re-surfaces R-3's exact sentence on a new path

**Lane:** silent-failures (N-2, fix-adjacent)
**Files:** `features/demo/ui/screens/MediaCaptureScreen.tsx:241-268` (latch), `:288-315`
(`onShutter` — not gated on `isOpening`), `:350-358` (blocked-reason machinery — no `isOpening`
arm)

During the Retake reopen (`permission === 'granted'`, `stream === null`, shutter live): photo
mode grabs from a `<video>` with `srcObject === null` → the frame-grab failure sentence; video
mode → `startRecording` with no stream → **"This browser doesn't expose a camera to this page —
nothing was captured"** — the sentence R-3 removed, reachable through a window R-7 introduced.
Transient, self-correcting, no data loss — but it is the wrong-cause-copy class this round spent
two fixes eliminating, and the machinery to close it shipped in the same round. (The lane
verified the failed-reopen ladder is honest in all arms; only the in-flight window is exposed.)

**Fix shape:** `if (isOpening) return` alongside the `busy` guard in `onShutter`, plus an
`isOpening ? 'Reopening the camera…'` arm at the head of R-9's `shutterBlockedReason` ladder.
**Owner: P4.3.** Shared code region with FD-3 — one fixer, adjacent commits (group only if
genuinely entangled, per house rule).

### FD-5 — [LOW] §66d's bare `catch` drops the enumeration error with no operator breadcrumb

**Lane:** silent-failures (N-1)
**File:** `features/demo/ui/inputs/capture-media.ts:188-191` (verified: unbound `catch`, no log)

The visitor-facing collapse to one sentence is endorsed; the condition it was accepted under —
an operator breadcrumb survives — is newly unmet. Denied, absent, and broken enumeration are now
indistinguishable from every seat including the console. Same reasoning as `geocode.ts`'s
review-L2 `console.warn`.

**Fix shape:** one line — `catch (e) { console.warn('[demo] enumerateDevices failed — the
device picker will be absent', e); … }` (or `NODE_ENV`-gated, matching `generateExtractedScopes`).
**Owner: P4.1.**

### FD-6 — [NIT] Stale docblock names the deleted `sampleOnly`

**Lane:** type-design (D2). `useMediaCapture.ts:57` still reads *"`capability.sampleOnly` tells
it when that is the only path available"* — twenty lines above the interface that explains the
field no longer exists. One sentence; rides FD-1's commit (same file) or FD-2's coda.
**Owner: P4.1.**

### FD-7 — [DOC] §69h's justification is factually wrong; correct it and strengthen the trigger

**Lane:** silent-failures (ledger check). §69h's premise — *"the OCR entry point is
location-gated in practice"* — is false: `onCaptureOcr` (`DemoExperience.tsx:1706-1708`) is
ungated, `TimeOffsetScreen` renders against `EMPTY_FORM`, and the rail's Time Offset row is one
ungated `setView` from boot — R-1's exact reachability. Its consequence is also understated: the
staged read is destroyed by `openLocation`'s `blankCapture()` — the moment the visitor does the
one thing that would make it usable. The *deferral itself* stands (pre-existing, out of P4's
diff scope); the ledger paragraph should state true premises, and the trigger should strengthen
from "next time it is open" to the next round, since R-1's guard pattern now sits one file away.
**Owner: P4.7** (§69h's author). Doc-only.

---

## Recorded — no action required

- **T-10 [LOW]** (tests) — R-33's return-type pin is enforced by `tsc`, not by the runner it
  lives in; esbuild strips the annotations. Fine as things stand (tsc is a declared gate);
  recorded so a green `pnpm test` alone is not read as evidence the R-33 type held. Lane filed
  it no-fix-required; upheld.
- **D1 [NIT]** (type-design) — `dataUrlQuality` is silently inert without `includeDataUrl`
  (correlated-optional pair; the one caller sets both). Ledger line with the second-caller
  trigger: reshape as `includeDataUrl?: { quality?: number }`.
- **D3 [NIT]** (type-design) — the stream/list failure-channel split is convention, not type;
  consequence if violated is nil (the `permissionAfterFailure` arm returns `'prompt'`).
  Recorded for completeness; heavier machinery not warranted.

**Operational note for the orchestrator** (not a finding): two lanes independently hit
transient failures traced to *other lanes' live mutation probes in the shared worktree*
(web's 6-fail run during a `captured.ts` probe; typescript's two single-test load flickers).
All resolved on clean-tree re-runs. If future phases fan out probe-running lanes concurrently,
give them per-lane worktrees or serialize the probe windows.

---

## Round summary (PR-comment ready)

Fix round 1 closed the entire vetted surface but one clause: 32 of 33 findings verified FIXED
across five re-review lanes (plus the §66d rider), with every fix mutation-probed at source, no
fix-introduced test rot, and all disclosed deviations accepted — several landing stronger than
the review asked (per-operation capability engine, supersession-released OCR shutter, honest
Matroska extensions, menu-preserving long-press opt-out). The one PARTIAL is R-3's audio
clause: `AudioRecordingFlow` still hand-rolls the capability derivation the round built an
engine module to own — a disclosed deferral (§65c) whose named trigger lapsed inside this same
merge. That residual (3 lines), one latent fix-introduced contract break in
`finishTake`/`abortRecording`, two small defects in R-7's new reopen window (device identity;
an `isOpening` shutter gate), one missing operator breadcrumb, and two doc lines make up a
targeted micro-round — P4.6 ×1, P4.1 ×3, P4.3 ×2, P4.7 ×1 doc — after which this PR merges
without a further fan-out.

## Owner-routing table

| ID | Severity | Owner | Size |
|---|---|---|---|
| FD-2 | MINOR (top) | P4.6 (+P4.1 coda/FD-6) | ~3 lines + pin |
| FD-1 | MINOR | P4.1 | guard + 4-line pin |
| FD-3 | MINOR | P4.3 | one token ×2 + pin |
| FD-4 | MINOR | P4.3 | guard + reason arm |
| FD-5 | LOW | P4.1 | one line |
| FD-6 | NIT | P4.1 | one sentence (rides FD-1) |
| FD-7 | DOC | P4.7 | ledger paragraph |

P4.5 is retired; nothing routes to it. T-10 / D1 / D3 → ledger lines, no code owner.
