# Proposal — The Interactive Demo as the Site's Showpiece

**Status:** Draft for review · **Author:** Claude (frontend) · **Scope:** No-code proposal. Nothing here is built yet.

> **One-line pitch:** Turn the standalone "DVR Extraction Notes Tour" prototype into the
> centerpiece of the marketing site — a real, in-browser walkthrough of the app where a
> visitor creates a case, adds as many locations as they want, and runs the actual
> recovery flow end-to-end (import → calibrate → capture → notes → court PDF) powered by
> the app's **real** algorithms, not fakes.

---

## TL;DR & recommendation

We already have something rare: a working prototype that runs the **real ported app logic**
(time-offset math, OCR cleaning, timestamp parsing, court-PDF generation) inside the browser,
wrapped in a split-screen guided tour. It's the strongest asset we have for selling this app.

**Recommended path — phased:**

1. **Phase 0 (days):** Embed the existing prototype as-is via an isolated iframe on a `/demo`
   route, plus a homepage CTA. Gets a *live, clickable* demo in front of people immediately and
   lets us user-test the flow before investing in a rebuild.
2. **Phase 1+ (the real work):** Port the demo to native Next.js / React 19 components on the
   site's design system — reusing the prototype's logic core verbatim, throwing away its
   scaffolding — fixing the two known bugs (nav numbering, canned-data persistence) and wiring
   every `/features/<slug>` page to "Try this step" deep-links into the demo.

This matches the "keep what we have clean, then pivot deliberately" posture: Phase 0 ships value
now; Phase 1 is the showpiece.

---

## 1. What we have today

Three assets, in three different places:

### A. The prototype — `09-App showcase website structure/`
A self-contained interactive tour. Technically it is a **DesignCap-style "Design Component"**:

| File | What it is | Reuse value |
|---|---|---|
| `DVR Extraction Notes Tour.dc.html` (2,742 ln) | The tour UI: a `<x-dc>` template + an embedded state-machine logic class | **Scaffolding** — re-author on the site's design system |
| `app-logic.js` (707 ln) | **The real app logic, ported verbatim** from the React Native codebase | **Crown jewel — reuse as-is** |
| `support.js` (1,595 ln) | "dc-runtime" — a bespoke mini-React template engine that loads React 18 UMD from unpkg | **Disposable** — replaced by Next.js/React 19 |

**Shape of the prototype:** a **split screen**. Left = a "story rail" that narrates each step
(eyebrow · title · paragraphs · bullets · tip). Right = a **phone-frame mock** running the actual
app screens. It has a **Guided** mode (linear tour) and a **Free-explore** mode. It does real
things: real webcam capture + real in-browser OCR (with a "use sample DVR clock" fallback when
there's no camera), real photo/video/audio capture, real bidirectional time math, and it
generates the **real, print-ready court PDFs** (Case Notes + Time-Offset Report).

**What's in `app-logic.js` (the part worth keeping):**
- The on-device AI **field-extraction prompt** + the sample detective email + the AI→form mapper.
- **Bidirectional DVR↔actual time math** (DST-aware, wall-clock, to the second).
- **OCR text-cleaning pipeline** (O→0, l→1, missing-colon repair) + a **6-format timestamp parser**.
- Two **print-ready PDF generators** (Case Notes, Time-Offset Report) as standalone HTML.

This module is framework-agnostic plain ES — it ports into the Next.js site untouched.

### B. The real app's docs — `extraction_case_notes_react_native_expo/docs/readme/`
37 README files (~800 KB) documenting the shipping app. The structure the demo must mirror:

- **Hierarchy:** `Case → Location(s) → form_data` (+ media). One occurrence number, many sites.
- **Active-location model:** a "current case / current location" pointer; switching a location
  resets and reloads its form data.
- **13-screen recovery wizard** per location: submission · requested scope · arrival/departure ·
  time offset · extracted scope · DVR info · cameras · export info · notes · completion (+ OCR,
  media, audio sub-screens).
- **Marquee features** map almost 1:1 to the site's existing feature catalog (see §6).

### C. The marketing site — this repo
Next.js 15 App Router · React 19 · Tailwind v4 · Vitest. Already has a **10-feature catalog**
(`lib/content/features.ts`) and per-feature pages at `/features/<slug>`, plus the new
**FeatureNav** strip. The demo should plug into this, not sit beside it.

---

## 2. The product vision — what "showpiece" means

Most landing pages *describe* features. We can let visitors **run the app in their browser**:

> **Two modes over one engine:**
>
> - **Guided Tour** — the cinematic first-run: the story rail walks a newcomer through the whole
>   job (biometric unlock → dashboard → create case → AI import → time calibration → OCR the DVR
>   clock → capture media → auto-notes → export the court PDF). This is the "wow."
> - **Free Sandbox** — the leave-them-playing mode: the visitor creates **as many cases and
>   locations as they want** and drives the real flow themselves. This is the requirement you
>   called out, and it's what makes the demo sticky.

The demo's credibility comes from the fact that it isn't a video and isn't faked — the offset is
really computed, the DVR clock is really OCR'd, the PDF that pops out is the **actual** court
document the app produces. That's the differentiator no competitor's marketing has.

---

## 3. Reuse vs rebuild — the key insight

The hard, valuable part (the algorithms) is **done and portable**. The disposable part (the
runtime + template engine) is what we'd shed:

- **Keep:** `app-logic.js` → moves into the site as the demo's computational core (e.g. a
  `lib/demo/` module). Pure functions, no UI, no React dependency.
- **Reframe:** the prototype's state machine (cases, locations, the 13-step tour, the screen
  definitions, the story-rail copy) is an excellent **spec** for the rebuild — we re-author its
  screens as React components rather than template strings.
- **Drop:** `support.js` (dc-runtime), the unpkg React 18 UMD load, the Babel-standalone runtime
  transform, and the `.dc.html` template format. The site already *is* React.

So the native port is mostly **UI re-authoring on top of logic we already trust** — not a
from-scratch rebuild of the smarts.

---

## 4. Integration options

| Option | What it is | Pros | Cons |
|---|---|---|---|
| **A. Iframe embed** | Serve the 3 prototype files from `/public`, drop the `.dc.html` in an `<iframe>` | Near-zero effort; isolated (its React 18 can't collide with the site's React 19); demo works today | Design seams (its own fonts/theme, can't reuse site components); fiddly responsive sizing; loads React+Babel from unpkg at runtime (CSP/SRI/offline concerns); **ships the known bugs**; deep-linking needs `postMessage` plumbing; "embedded," not "integrated" |
| **B. Native port** | Rebuild the tour as React 19 client components on Tailwind v4; reuse `app-logic.js` | True integration; on-brand; responsive; **fixes the bugs**; real per-chapter routes & deep links; no unpkg/Babel at runtime; code-split & lazy-loaded; testable with the site's Vitest | Real build effort: re-author ~10 wizard screens + dashboard/cases/OCR/media/completion + phone frame & story rail (logic already done) |
| **C. Phased (recommended)** | A now, B next — migrate chapter by chapter, highest-wow first | Immediate live demo + a clean migration path; de-risks the rebuild with real user feedback | Two passes; brief period where `/demo` is the iframe before the native version lands |

**Recommendation: C.** Ship the iframe to get a working demo live and learnable, then port to
native — leading with the highest-wow chapters (Time Offset + OCR, AI Import, Notes→PDF).

---

## 5. Proposed architecture (native port, no code)

- **Placement:** a dedicated `/demo` route (its own immersive, full-bleed layout — likely opt out
  of the marketing header/footer chrome, or a slim variant). The demo is heavy and interactive, so
  it should be **lazy-loaded / code-split** and never block the marketing pages' load budget.
- **Logic core:** `app-logic.js` lands in `lib/demo/` as the single source of truth for all
  computation (time math, OCR cleaning, timestamp parsing, PDF generation). UI never re-implements
  these — it calls them. This is what keeps the demo *real*.
- **Mock data store:** a small typed in-memory store that mirrors the app's `Case → Location →
  form_data` model (scopes, extracted scopes, time offset, DVR info, cameras, export info, notes,
  media). It is **per-session** (resets on reload), with a **clean separation between seeded demo
  content and visitor-created content** (this is the fix for bug #2 — see §7). Likely Zustand or
  Context; this is the "mock SQLite."
- **Design system:** re-express the prototype's dark, surveillance aesthetic in Tailwind v4 tokens
  so the demo *is* the brand, not a foreign island. Reuse the site's `cn()` / button / card
  primitives where they fit.
- **Phone frame + story rail:** a reusable "device frame" shell (the on-screen phone) and a
  narration panel, both responsive — phone-beside-rail on desktop, stacked/tabbed on mobile.
- **Hardware bridges:** thin adapters for camera/mic (real `getUserMedia` where available, sample
  fallback otherwise), map (Mapbox GL JS), and "simulated" beats (biometrics HUD, encryption
  animation) — see §8.
- **Deep-linkable chapters:** each tour step addressable (e.g. `/demo?step=time-offset`) so feature
  pages can jump straight into the relevant moment.

---

## 6. How it becomes the showpiece (ties into the existing site)

The demo's tour chapters already line up with the site's 10-feature catalog. That alignment is the
integration plan:

| Site feature (`/features/<slug>`) | Demo chapter it deep-links into |
|---|---|
| `cases-locations` | Cases & Locations (create case, add N locations) |
| `import` | AI Import (paste/drop a request → pre-filled location) |
| `time-calibration` | Time Offset (NTP sync + bidirectional math) |
| *(within time-calibration)* | OCR the DVR clock |
| `location` | Submission / GPS + address |
| `map` | Case map (sandbox/Phase 2) |
| `evidence-capture` (Media Capture) | Photo / video / audio capture |
| `notes` | Auto-generated case notes |
| `reports` | Completion → court PDF preview/export |
| `secure-export` | Biometric-gated encrypted export |
| `on-device` | The "nothing leaves the device" framing throughout |

**Concrete showpiece moves:**
- **Homepage hero:** swap the template hero for a live phone-frame teaser (a short looping scripted
  beat) with a **"Launch the interactive demo"** CTA → `/demo`.
- **Per-feature "Try it":** every feature page gets a **"Try this step"** button that deep-links
  into the matching demo chapter — turning passive feature copy into hands-on proof.
- **FeatureNav:** consider adding a **"Live Demo"** entry to the strip we just built.
- **Notes feature:** the demo's auto-notes → PDF chapter is the perfect concrete payoff for the
  currently-placeholder `notes` page once Kris's copy lands.

---

## 7. Known issues — and how the port fixes them

You flagged two; both are real and I traced them in the prototype:

### Issue 1 — Nav numbering is inconsistent
The story-rail step labels are **hardcoded per screen** ("01 · …" through "13 · …") and collide:
two `03`s (cases / new-case / new-location), two `05`s (submission / requested-scope), two `06`s
(arrival-departure / time-offset). On top of that, **three different orderings disagree**: the
linear guided tour sequence, the in-phone wizard's own screen list, and those hand-typed eyebrow
numbers. So the numbers don't track where you actually are.

**Fix in the port:** one source of truth for ordering. Step numbers are **derived from position**,
not typed by hand — and we deliberately separate "tour chapter numbering" (the narrative) from
"wizard screen numbering" (the app's own 13 screens) so they never fight.

### Issue 2 — Canned data persists when the visitor adds their own
The prototype seeds two demo cases and the guided flow **auto-injects a scripted "Kim's
Convenience" case/location** on demand. There's no separation between *demo seed* and
*user-created* content and no reset — so when a visitor creates their own case/location, the canned
data lingers alongside it (and the scripted path can re-inject more).

**Fix in the port:** the mock store treats **seeded demo content** and **visitor-created content**
as distinct, with an explicit **"Reset demo"** control and a clean per-session lifecycle. In Free
Sandbox mode, the visitor's cases/locations are first-class; the canned seed is clearly labeled
demo data (or absent). This is also exactly what's required to deliver your **"add as many cases
and locations as they want"** goal — the sandbox can't have phantom canned records polluting it.

### Requirement — true multi-case / multi-location sandbox
The current prototype is mostly a *guided linear tour* with scripted `ensure-case` / `ensure-location`
shortcuts. The showpiece needs the **Free Sandbox** to be a genuine workspace: create/duplicate/
delete cases and locations freely, each running the full flow. The guided tour becomes an optional
overlay on top of that real workspace, not the only path.

---

## 8. Hardware-dependent features → simulation strategy

Some app features lean on native hardware. The prototype already handles this gracefully (real
where possible, sample fallback otherwise); the port keeps that contract:

| Feature | In browser | Strategy |
|---|---|---|
| OCR the DVR clock | Real `getUserMedia` + canvas + real OCR; **sample DVR clock** fallback | Keep both — the sample path is the "no camera" safety net and runs the same pipeline |
| Photo / video capture | Real webcam; static placeholder fallback | Real where granted, sample otherwise |
| Audio + waveform | Real mic; animated mock waveform fallback | Real where granted; simulate the spectrum otherwise |
| GPS + accuracy lock | No real GPS | Simulate the "15m → 8m → LOCKED" accuracy convergence |
| Map | n/a | Mapbox GL JS (web-native) with pins / proximity ring |
| Biometric unlock | No WebAuthn parity | Simulated scanner HUD → "AUTHORIZED" (pure UI) |
| Encrypted export | No native crypto | Simulated cipher animation (optionally a real JS zip) — labeled as a demo |

Honesty note: anything simulated should read as a faithful *demonstration* of the real behavior,
not a claim that the browser is doing the native thing.

---

## 9. Phased delivery plan

- **Phase 0 — Embed (fast win).** Serve the prototype from `/public`; `/demo` route hosts it in an
  isolated iframe; homepage CTA. Optionally self-host React 18 UMD instead of unpkg to dodge
  CSP/offline issues. *Outcome: a live, clickable demo today.*
- **Phase 1 — Native core + highest-wow chapters.** Port `app-logic.js` into `lib/demo/`; build the
  phone-frame + story-rail shell and the mock store (with seed/user separation). Re-author the
  marquee chapters first: **Time Offset + OCR**, **AI Import**, **Notes → PDF**. Fix nav numbering.
  *Outcome: the brand-native demo exists for the chapters that sell hardest.*
- **Phase 2 — Full wizard + Free Sandbox.** Port the remaining wizard screens, dashboard, cases,
  media capture/library, completion/export; ship true multi-case/multi-location Free Sandbox + the
  "Reset demo" control; add the case map. *Outcome: the full app, mocked, drivable.*
- **Phase 3 — Showpiece polish & wiring.** Homepage hero teaser; per-feature "Try this step"
  deep-links; FeatureNav "Live Demo" entry; responsive/mobile pass; analytics on demo engagement.
  *Outcome: the demo is the spine of the site, not a side page.*

---

## 10. Decisions I need from you

1. **Phase 0 iframe — yes or skip?** Ship the quick embed first for a live demo + user feedback, or
   go straight to the native port?
2. **Demo home:** a dedicated immersive `/demo` route (my lean), an inline homepage hero, or both?
3. **Guided vs Sandbox priority:** which mode is the hero for launch — the cinematic guided tour, or
   the free "make your own cases" sandbox? (Affects what Phase 1 leads with.)
4. **Scope of "the full app":** mirror all 13 wizard screens, or a curated subset that tells the
   story without the long tail (DVR info, export info, arrival/departure are lower-wow)?
5. **Mapbox:** are we comfortable using a (URL-restricted) Mapbox token for the map chapter, or
   simulate the map too for Phase 1?
6. **Brand source of truth:** keep the prototype's dark surveillance aesthetic as the demo's look,
   or re-skin entirely to the current marketing-site styling?

---

## 11. Risks & mitigations

- **React 18 (prototype) vs React 19 (site).** Only a problem if we embed *without* an iframe.
  Iframe isolates it (Phase 0); the native port drops React 18 entirely (Phase 1+).
- **Runtime unpkg/Babel load (prototype).** CSP, SRI, and offline concerns. Mitigate in Phase 0 by
  self-hosting the React UMD; eliminated entirely by the native port.
- **Scope creep on the rebuild.** The wizard is 13 screens. Mitigate by leading with the high-wow
  subset and treating the long tail as Phase 2 / optional.
- **Hardware variance (camera/mic permissions).** Always provide the sample fallback path so the
  demo never dead-ends on a blocked permission.
- **Performance budget.** The demo is heavy; keep it off the marketing pages' critical path via
  lazy-loading and a separate route.
- **"Simulated vs real" honesty.** Label simulated beats clearly so the demo stays credible to a
  forensic audience.

---

## Appendix A — Prototype tour chapters (the rebuild spec)

`splash (biometric)` → `dashboard` → `cases` → `new case` → `import (AI)` → `submission` →
`requested scope` → `arrival/departure` → `time offset` → `OCR capture` → `extracted scope` →
`DVR info` → `cameras` → `export info` → `notes` → `completion (PDF + export)`.
(Media capture / audio / media library are reachable sub-flows off the wizard screens.)

## Appendix B — Data model the mock store must mirror

`Case { caseNumber, displayName, unit, OIC, video-coordinator, incident address/GPS, status,
locations[] }` → `Location { name, business, address, contact, requester(×5), GPS,
form_data{...} }` → `form_data { scopes[], extractedScopes[], arrivalDepartures[], timeOffset{OCR
proof + sync}, dvrInformation{}, cameras[ (+ per-camera GPS) ], exportInformation{}, notes },
media{ photos[], videos[], audios[] }`. Per-location form data; per-case metadata + incident
location; global settings. (Mirrors the app's SQLite schema per the app docs.)
