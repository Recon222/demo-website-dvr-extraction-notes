# 02 · App Feature Inventory → Site Content Backbone

This is the source-of-truth mapping from **app capability → pain point → how it's solved → website
page → media & diagram needs**. Drawn from the app repo's README, feature READMEs, and
`app.config.js`. Copy on the site should be derived from here so it stays accurate.

Per the forensic-restraint rule (doc 01): pain/fix framing is utility-first; the NTP page is the
sanctioned forensic exception.

---

## Proposed page set (priority for the Monday MVP)

| Pri | Page | Maps to app feature(s) | Why it earns a page |
|-----|------|------------------------|---------------------|
| ⭐ P0 | **Time calibration & the NTP receipt** | `precision-time-sync` + `ocr-time-capture` | The marquee. The courtroom-question answer. Best interactive. |
| ⭐ P0 | **Import a request (AI autofill)** | `import` (pdf + json) + Apple Foundation Models | "The case fills itself in." Strong opening wow. |
| ⭐ P0 | **Auto-written notes & the PDF report** | `documentation` (notes + case-notes) | The payoff. What you walk away with. |
| P1 | **Capture evidence, organised by location** | `media` (photo/video/audio) + `case-management` | Tangible, demos beautifully. |
| P1 | **Map your case · contacts one tap away** | `location` + map tab + contact cards | Visually impressive; call/email hook. |
| P1 | **GPS-mark every camera** | `location` (camera GPS) | Distinctive field behaviour ("stand under each camera"). |
| P1 | **Package & share securely** | `case-management` ZIP export + `biometrics` + encryption | The handoff; privacy story. |
| P2 | **On your device, under your control** | privacy posture + `biometrics` + encrypted SQLite | Trust page; doubles as `/privacy` lead-in. |
| P2 | **Case & location management** | `case-management` data model | Useful but less "wow"; may fold into others. |

> P0 = must exist for the walkthrough to make sense Monday. P1 = strong, build if time.
> P2 = nice-to-have / can be a homepage section rather than a full page.
> **DECISION NEEDED (doc 07):** confirm the v1 page set.

---

## Feature detail blocks

Each block: **Pain → Fix → Proof/specifics → Media → Diagram (Gemini).**

### ⭐ Time calibration & the NTP receipt  (`precision-time-sync`, `ocr-time-capture`)

- **Pain:** DVR clocks are almost always wrong. To testify that "the recording was N seconds off
  real time," analysts used external tools (dvrtimecalc.uk) and manual reference-clock checks —
  slow, and the inevitable court question is *"how do you know your own device's time was right?"*
- **Fix:** Point the phone at the DVR's on-screen timestamp → **ML Kit OCR** reads it (6 formats,
  bounding-box guidance, volume-button shutter for hands-free) → at the **moment of capture** the
  app fires a region-specific **NTP** sync to atomic-clock-backed servers and computes the offset,
  with an HTTP time-API fallback when UDP is blocked.
- **Proof / specifics:** ±10–100 ms (NTP) / ±50–500 ms (HTTP); multi-sample with outlier
  filtering; servers NRC Canada / NIST / PTB / METAS / Cloudflare; the **Time Offset Report PDF**
  embeds the cropped timestamp image, full sync metadata (offset, uncertainty, RTT, server,
  method), a "what NTP is" explainer, and the **traceability chain**
  *"NRC stratum-2 → cesium atomic clocks → UTC(NRC) → UTC → SI second."*
- **Media:** screen-capture loop of the OCR scan → sync → offset result card. Plus a still of the
  generated Time Offset Report PDF page.
- **Diagram (Gemini):** the traceability chain as a clean left-to-right flow: *DVR clock → phone
  camera/OCR → NTP server → atomic clock → UTC → your offset, time-stamped.* This is the
  centerpiece interactive candidate (animate the chain; optionally a tiny "wrong clock → corrected"
  toy).

### ⭐ Import a request (AI autofill)  (`import`, Apple Foundation Models)

- **Pain:** A recovery request arrives as a structured form, an agency PDF, or a plain email.
  Re-typing OCC#, address, requester, and requested time windows into the app is tedious and
  error-prone.
- **Fix:** Import the PDF/email and **Apple's on-device AI (Apple Intelligence / Foundation
  Models, iOS 26+)** reads it and pre-fills as much of the submission as it can. Structured agency
  JSON (e.g. Peel Regional Police format) imports deterministically and fast.
- **Proof / specifics:** JSON path is deterministic (<100 ms/file, Zod-validated); PDF/email path
  is **fully on-device** — no document content leaves the phone (privacy win worth stating).
- **Media:** loop of selecting a request → fields populating themselves.
- **Diagram (Gemini):** "request (PDF/email) → on-device AI → structured case fields," with a
  lock/"stays on device" motif.

### ⭐ Auto-written notes & the PDF report  (`documentation`: notes, case-notes)

- **Pain:** After the work, you still have to *write it up* — bullet notes and a formal report.
  Manual, repetitive, and easy to leave inconsistent across a unit.
- **Fix:** The app aggregates everything entered across the wizard into **auto-generated
  bullet-point notes** and a **Case Notes PDF** (7 sections), with hash-based change detection so
  it only regenerates when something actually changed.
- **Proof / specifics:** notes + report are produced from the same data you already entered —
  "you verify, the app types." Optional biometric gate before export.
- **Media:** loop of the Notes screen populating, then the Completion screen generating the PDF.
- **Diagram (Gemini):** "wizard fields → aggregator → bullet notes + PDF report" fan-in.

### Capture evidence, organised by location  (`media`, `case-management`)

- **Pain:** Photos/videos/audio of a scene end up scattered in the phone's camera roll, divorced
  from the case, and have to be sorted and renamed later.
- **Fix:** Capture photo/video (Vision Camera, native resolution, GPS embed), audio (waveform,
  pause/resume) **inside the case** — each file is written into that location's folder
  (`.../locations/<loc>/media/{photos,videos,audio}`) automatically. Metadata form for
  filename/caption; library with Photos/Videos/Audio tabs.
- **Media:** capture → preview → it appears under the right location.
- **Diagram (Gemini):** the on-disk tree: case → locations → media/{photos,videos,audio}.

### Map your case · contacts one tap away  (`location`, map tab, contact cards)

- **Pain:** A multi-location case is hard to hold in your head; and reaching the requesting
  investigator or a site contact means digging for a number.
- **Fix:** All locations on a **Mapbox** map; a bottom sheet per pin with **tap-to-call /
  tap-to-email** for both the requesting investigator and the location contact. (Cameras as a
  togglable map layer — landing imminently per Kris.)
- **Media:** map with pins → tap pin → bottom sheet → call/email affordance.
- **Diagram (Gemini):** optional; the live screen-capture probably carries this page alone.

### GPS-mark every camera  (`location`)

- **Pain:** "Where exactly was each camera, and which way did it point?" is hard to reconstruct
  from memory back at the office.
- **Fix:** Walk the site, **stand under each camera, mark its GPS position** (multi-sample GPS:
  Quick/Balanced/Precise, outlier-filtered). Address geocoding/reverse-geocoding via Mapbox, or
  raw lat/long.
- **Media:** loop of marking a camera position on site.
- **Diagram (Gemini):** site sketch with camera pins + coverage direction (conceptual).

### Package & share securely  (`case-management` export, `biometrics`, encryption)

- **Pain:** Delivering a case means assembling the report + all the media into something portable,
  and doing it securely.
- **Fix:** **Encrypted ZIP export** at **location or whole-case** level — each location's folder
  (docs + media in image/video/audio subdirs) bundled. **User sets their own ZIP password**
  (stored in the device keychain). Optional **Face ID / Touch ID** gate before export/share via the
  iOS share sheet.
- **Media:** export flow → password → share sheet (mock recipients).
- **Diagram (Gemini):** "case → encrypted ZIP (locked) → share sheet," show the internal folder
  structure inside the zip.

### On your device, under your control  (privacy, `biometrics`, encrypted SQLite)

- **Pain:** Evidence-handling software that quietly ships sensitive data to a vendor cloud is a
  non-starter for this audience.
- **Fix:** **All case data stays on the device** by default — encrypted SQLite, on-device AI,
  biometric app lock. The only things that touch the network are time servers (timestamp packets,
  no user data), Mapbox (search queries/coords), and anonymized crash reports. Optional Supabase
  sync is **push-only and user-controlled**.
- **Media:** light; this is a trust/copy page. Could reuse the privacy policy.
- **Diagram (Gemini):** "what stays on device" vs "what leaves (and what it is)" — a reassuring
  two-column data-flow.

### Case & location management  (`case-management`)  — P2 / possibly a homepage section

- **Pain:** One job often spans multiple addresses/buildings; flat note apps don't model that.
- **Fix:** Hierarchical **Cases → Locations → Media**; duplicate a location for repeat visits;
  transaction-safe with 4-layer auto-save so nothing is lost. (Auto-save is a great trust detail,
  not its own page.)

---

## Supporting capabilities (mention, don't headline)

- **Supabase push-only sync** — cloud backup/mirror; local stays source of truth. One line on the
  privacy/trust page; *do not* over-feature it (it sets up the post-beta desktop-monitoring tease).
- **4-layer auto-save** — a reliability footnote ("it saves so you don't lose work"), not a page.
- **Multi-format OCR timestamp parsing (6 formats)** — a supporting bullet on the time page.

## Roadmap teases (one "What's next" beat only — see doc 01)

- Investigator / door-to-door **video-canvassing mode** (persona-gated, one app).
- **Desktop live-sync** monitoring from the office.
- **Will-say** statement generation.

## Accuracy guardrails for copy

- Say **Apple on-device AI**, not "GPT" (the GPT pipeline in the old README is superseded).
- iOS-first beta; needs **iOS 26+** for the AI import feature specifically.
- Don't state exact court/legal outcomes; describe the *report and the traceability*, not the verdict.
- Numbers to reuse safely: 15 years, 1,500+ extractions, ~10 min → <5 min, 6 timestamp formats,
  atomic-clock NTP. Confirm any other figure with Kris before publishing.
