# P4 phase-boundary side-by-side — demo (master @ 2868fff) vs phone simulator

Run 2026-07-31. Shape-only comparison, per the standing rule: keyless sample mode substitutes
fixed content, so field VALUES are never compared — only the shape/posture of each surface.

Baselines (scratchpad):

| Set | Count | Path |
|---|---|---|
| phone P4 | 8 | `baselines/phone/p4/` |
| demo P4 | 18 | `baselines/demo/p4/` |
| demo P4 live-camera | 7 | `baselines/demo/p4-live/` |

Environments: demo = `pnpm dev --port 3001` from the repo on master (a `pnpm install` was
REQUIRED — P4 added `tesseract.js` and stale node_modules 500s the `/demo` route). Phone =
iPhone 17 Pro / iOS 26.5 sim, dev build `com.kris.dvrextractionnotes`, Metro on :8081.

---

## Verdicts

| # | Surface | Verdict | One line |
|---|---|---|---|
| 1 | Drawer Media accordion | **MATCH** | Both collapse/expand to exactly Capture Media · Record Audio · Media Library, below Completion, above the version footer. |
| 2 | Photo/video capture | **DELTA (environmental)** | Demo: permission gate → live viewfinder → Photo/Video mode pills → Review Image → Save. Phone in the sim can only reach "No camera device available / Go Back" — the review/mode-pill chrome is unreachable, so the comparison is partial by environment, not by implementation. |
| 3 | Audio recorder | **MATCH** | Identical CRT posture: header lamp + AUDIO CAPTURE, mm:ss timer, status badge, format line, wall clock, WAVEFORM MONITOR with second ticks. |
| 4 | Media library | **MATCH** | Same sheet shape: title, item count, Photos/Video/Audio tabs, empty state. Row/preview-info/delete-confirm verified on the demo only (the sim has 0 items). |
| 5 | OCR capture posture | **MATCH (by directive)** | Phone rotates the whole UI 90° (portrait device, landscape content); the demo lays the strip across the long axis without rotating. Different mechanism, same posture — exactly the owner ruling. Copy is verbatim-shared. |
| 6 | Time-Offset PDF OCR image block | **DELTA (vs the brief)** | The block fills only after a **LIVE** camera read; the **SAMPLE** path renders no image block at all. The brief's route ("capture via the sample path then preview the PDF") does not fill it. |

---

## Surface detail

### 1 — Drawer Media accordion — MATCH

Phone (`01/02-drawer-media-*.png`): the accordion sits after Completion, collapsed by default
with a chevron; expanded it lists **Capture Media / Record Audio / Media Library**.

Demo (`01/02-s1-drawer-media-*.png`): same three rows, same order, same position, via
`aria-label="Media section"` with rows `Open camera to capture media` / `Record audio note` /
`Open media library`.

The demo's footer save-status line is a demo original and is correctly absent on the phone —
expected, not a delta. The **no-location guard toast was not exercised**: the drawer is only
reachable from inside an open location, so the guard state needs a deliberate no-location
construction. Left uncaptured — see Gaps.

### 2 — Photo/video capture — DELTA (environmental)

Demo, live path (`03-07-s2-*.png`): "Camera Access Required" gate with a **Grant** button →
live viewfinder → **Photo mode / Video mode** pills → `Take photo` → **Review Image** screen
(Filename, "Saving as", Notes, Retake, Save Image) → save.

Phone (`07-s2-capture-media-attempt.png`): the iOS Simulator exposes no camera device, so the
screen renders an honest terminal state — **"No camera device available" / "Go Back"**. It does
not crash and does not offer a sample path.

Shape difference worth recording: the demo's no-camera world is a **recoverable permission
card** (Grant → retry), the phone's is a **terminal no-device message**. Both are honest; they
are not the same state, and a real device would show neither. Full comparison of the mode pill
and review screen needs a physical device.

### 3 — Audio recorder — MATCH

| | Phone | Demo |
|---|---|---|
| Header | ● AUDIO CAPTURE | ● AUDIO CAPTURE |
| Timer | `00:00` | `00:02` (running) |
| Status | `READY` | `REC` |
| Format | `44.1kHz | AAC`, `MONO / 128k` | `48.0kHz / STEREO`, `MP4` |
| Clock | `18:58:24` | `17:53:54` |
| Monitor | WAVEFORM MONITOR, ticks 5/10/15/20 s | WAVEFORM MONITOR, ticks 5/10/15 s |

Same CRT posture and same information architecture. Format values differ (platform codec
capability, not a shape delta). The phone recorder **cannot actually record in the sim** — the
transport stays `READY`, the timer never leaves `00:00`, and the header wall clock freezes, so
the live/preview states were captured on the demo only.

### 4 — Media library — MATCH

Phone (`06-s4-media-library.png`): "Media Library", `0 items`, tabs **Photos / Video / Audio**,
empty state "No photos — Use Capture Media to take photos".

Demo (`12-14-s4-*.png`): same sheet with `2 items`, tabs with counts, a filename+date row, the
preview/info block, and a delete confirmation reading "Delete Media — Are you sure you want to
delete "…"? This action cannot be undone."

Tabs, counts and empty state match. Rows/info/delete-confirm could only be exercised on the
demo because nothing can be captured in the sim.

### 5 — OCR capture posture — MATCH (by directive)

Demo (`16-s5-ocr-viewfinder-landscape.png`, `02-s5-ocr-viewfinder-LIVE-landscape.png`): the
viewfinder renders across the long axis without rotating the page. Copy: "AIM AT THE DVR
CLOCK", "Align DVR timestamp to fill the bounding box", plus the awkward-frame affordances
(Ambiguous date / Time only) and "Use sample DVR clock".

Phone (`08-s5-ocr-capture-screen.png`): the **whole UI is rotated 90°**. Evidence is
geometric, not visual: OCR reports "Align DVR timestamp to fill the bounding box" and "Tip:
Get as close as possible without cutting off text" at the *same* y (43.7 %) but different x
(7.7 % / 13.1 %) — i.e. the lines run vertically down a portrait frame. The status-bar clock
is likewise unreadable ("£L:L"), the signature of rotated rendering.

So: phone rotates the device; demo lays the strip along the long axis. Per the owner directive
that is the intended demo treatment — posture matches, mechanism deliberately differs. Shared
copy is verbatim.

### 6 — Time-Offset PDF OCR image block — DELTA (vs the brief)

Measured directly out of the rendered PDF preview iframe:

| Route | `<img src="data:image…">` in the PDF | "Captured DVR Display" block |
|---|---|---|
| LIVE camera OCR read | **2** | **present** |
| SAMPLE ("Use sample DVR clock") | **0** | **absent** |

So the block **does** now fill — but only for a live read. The brief's suggested route
("capture via the sample path then preview the PDF") produces no image block at all.

This is not a defect: `DemoExperience.previewTimeOffset` documents it as intended — *"the strip
image exists only for a live camera read — the template renders no image block without it,
which is the honest shape for a sample commit."* Flagging it because the phase expectation and
the implementation disagree about the sample route, and a future verifier following the brief
would wrongly conclude the block is broken.

Live-read proof: with a synthesized DVR clock fed to the browser's fake camera, tesseract.js
genuinely read the frame — parsed `0026-07-31 14:23:00` from a rendered `2026-07-31 14:23:45`
(leading-digit + seconds misread, flagged "Low confidence — manual correction likely needed").
The OCR pipeline, its confidence reporting, and the PDF evidence block are all really working.

---

## Gaps / not captured

* **No-location guard toast** (surface 1) — needs a deliberate no-location wizard construction;
  the drawer is otherwise only reachable with a location open.
* **Phone capture review screen + mode pill** (surface 2) — blocked by the simulator having no
  camera. Needs a physical device.
* **Phone audio recording/preview states** (surface 3) — blocked by the simulator having no
  microphone; the recorder never leaves `READY`.
* **Phone media-library rows / delete confirm** (surface 4) — blocked downstream of the above
  (nothing can be captured, so the library stays empty).
* **Phone Time-Offset PDF** (surface 6) — not driven; the demo-side answer was decisive and the
  phone route is expensive in sim time.

None of these are demo defects; all are iOS-Simulator capability limits.
