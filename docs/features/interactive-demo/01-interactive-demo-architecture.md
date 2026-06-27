# Interactive Demo — Architecture & Design

**Feature:** In-browser, interactive walkthrough of the DVR Extraction Notes app, embedded
as the marketing site's centerpiece.
**Siblings:** `02-interactive-demo-implementation-plan.md` (the how) ·
`03-interactive-demo-test-spec.md` (the proof). Background: `../../proposals/interactive-demo-integration.md`.
**Status:** Draft v1.0 · forensic profile only (canvas profile is explicitly future).

---

## 1. Purpose

Let a domain visitor (DVR technician / analyst / investigator) experience the real app in
their browser — running the app's **actual** algorithms (time-offset math, OCR, PDF
generation), not fakes. It ships in two modes over one engine: a **Guided Tour** that
auto-plays the whole job, and a **Free Sandbox** where the visitor creates as many cases and
locations as they want and drives it themselves.

---

## 2. System Architecture

```
                       app/demo/page.tsx        (route · lazy-loaded · reads ?mode, ?step)
                              │
                              ▼
                  components/demo/DemoExperience.tsx        (the only stateful client island)
            ┌─────────────────┴──────────────────────────┐
            ▼                                              ▼
   components/demo/StoryRail.tsx              components/demo/PhoneFrame.tsx
   (narration + Rail Next/Prev in            └─ screens/<Screen>.tsx   (presentational,
    guided; contextual in sandbox)              props in / callbacks out — NO store import)
            │                                              ▲
            │ guided: Next → next chapter                  │ data + callbacks via props
            ▼                                              │
   ┌────────────────────────────────────────────────────────────────────────┐
   │                       lib/demo   (the engine — pure, framework-agnostic) │
   │                                                                          │
   │   store/ (Zustand vanilla)  ◀── director/runner ──▶  content/ registry  │
   │     cases · locations · form · view · media          screens · narration │
   │                                                       seed · profiles     │
   │   logic/  time · ocr · import · pdf            types/                      │
   └────────────────────────────────────────────────────────────────────────┘

   Guided mode:  entering a chapter runs its DIRECTOR BEAT against the store
                 (auto-type fields → tap buttons w/ touch pulses → set results → wait).
   Sandbox mode: the director is OFF; user events call store actions directly.

   No backend. No network (Mapbox optional, future). All state is in-memory & per-session.
```

The demo is a single client island mounted on its own route. Everything below
`DemoExperience` is either a **pure `lib/demo` module** (store, logic, director, content) or a
**presentational `components/demo` screen** that receives props and emits callbacks. There is
no server, no API, no persistence beyond the browser tab.

---

## 3. Design Decisions

| Decision | Choice | Rationale (and rejected alternative) |
|----------|--------|--------------------------------------|
| Integration model | **Native React 19 port** | Maintainable (many small files), on-brand, fixes both prototype bugs, no runtime unpkg/Babel. *Rejected:* iframe-embed the `.dc.html` — throwaway, design seams, ships the bugs. |
| Reuse of app algorithms | **Port `app-logic.js` → `lib/demo/logic/*` as typed pure modules** | It's the real, trusted logic (time math, OCR, timestamp parser, PDF builders); framework-agnostic; highest test ROI. *Rejected:* re-derive from the RN source — wasteful and risky. |
| State management | **Zustand vanilla store, scoped to the demo** | Mirrors the real app's store; selective subscriptions keep 15+ screens cheap; the director drives it imperatively; testable as pure logic. *Rejected:* Context+useReducer (awkward to drive from the director), prop-drilling (15 screens). **New dependency — see §8.** |
| Guided auto-play | **Data-driven "director": per-screen *beats* + a runner with an injectable clock** | Choreography is data → trivial to add screens; preserves your existing narration copy; pure JS, no video. *Rejected:* Remotion (built to render *video*; overkill), bespoke per-screen animation code (not extensible). |
| Animation | **CSS transitions/keyframes + the director's JS timing** (typewriter, touch pulse, screen slide) | Zero new deps; matches how the prototype already animates. *Rejected:* Framer Motion — unnecessary dependency for this set of effects. |
| Screen model | **Two ordered registries (`TOUR_CHAPTERS`, `WIZARD_SCREENS`) + a `LAUNCHABLE` set; step numbers derived from array index** | Fixes the nav-numbering bug (no hand-typed duplicate numbers); OCR/media are launch-only, not in Next/Back; adding a screen = one registry entry (extensibility requirement). |
| Profiles | **Config-driven screen/field visibility; `forensic` now** | The canvas profile becomes a config object later, not a fork — mirrors the app's form-customization. |
| Phone styling | **Lift the prototype's phone styles verbatim into a co-located CSS module; Tailwind only for page chrome** | Preserve the exact phone-app look (explicit requirement). *Rejected:* convert phone screens to Tailwind — needless pixel-drift risk. |
| Persistence | **In-memory, ephemeral, per session; seed-vs-user separation + `reset()`** | It's a demo with no backend; cleanly fixes the canned-data-persistence bug. |
| Route & chrome | **Dedicated `/demo` with an immersive layout; relocate marketing Header/FeatureNav out of the root layout into `app/(default)/layout.tsx`** | Full-bleed experience without marketing chrome; also resolves the deferred "FeatureNav mounted site-wide" item. |
| Hardware features | **Real-with-sample-fallback (camera/mic); simulated (GPS, biometrics, encryption)** | Browser can't do native; never dead-end a visitor whose camera is blocked. |

---

## 4. Domain Model (the in-memory "data contract")

No API — these are the TypeScript types the store holds. Simplified from the app's SQLite
schema (see proposal Appendix B), keeping only what the demo renders.

```typescript
export type Profile = 'forensic' | 'canvas'
export type DemoMode = 'guided' | 'sandbox'

// Flow screens (appear in Next/Back + the wizard drawer):
export type WizardScreenId =
  | 'submission' | 'requestedScope' | 'arrivalDeparture' | 'timeOffset'
  | 'extractedScope' | 'dvrInfo' | 'cameras' | 'exportInfo' | 'notes' | 'completion'
// App chapters shown before the wizard:
export type ChapterId = 'splash' | 'dashboard' | 'cases' | WizardScreenId
// Launch-only (NEVER in Next/Back): opened by an action button:
export type LaunchableId = 'ocr' | 'mediaCapture' | 'audioRecording'
export type ModalId = 'newCase' | 'newLocation' | 'import' | 'mediaLibrary'

export interface DemoCase {
  id: string; caseNumber: string; displayName: string; unit: string
  oicName: string; oicBadge: string; vcName: string; vcBadge: string
  status: 'draft' | 'complete' | 'archived'; createdLabel: string
  isSeed: boolean                 // demo seed vs visitor-created (fixes canned-data bug)
  locationIds: string[]
}

export interface DemoLocation {
  id: string; caseId: string; locationName: string
  businessName: string; streetAddress: string; city: string
  requesterName: string; requesterBadge: string; requesterPhone: string; requesterEmail: string
  locationContact: string; locationPhone: string
  gps?: { lat: number; lng: number; accuracyM: number; source: 'gps' | 'geocoded' | 'manual' }
  isSeed: boolean
  form: LocationForm
}

export interface LocationForm {
  scopes: ScopeEntry[]
  extractedScopes: ScopeEntry[]            // always DVR-time; auto-generated from the offset
  arrivalDepartures: { id: string; arrival: string; departure: string }[]
  timeOffset: TimeOffsetData | null
  dvr: DvrInformation
  cameras: CameraEntry[]
  export: ExportInformation
  notesText: string; notesEdited: boolean
  media: { photos: MediaItem[]; videos: MediaItem[]; audios: MediaItem[] }
}

export interface ScopeEntry {
  id: string; startDateTime: string; endDateTime: string
  isActualTime: boolean; cameras: string
}
export interface TimeOffsetData {
  dvrDateTime: string; actualDateTime: string
  differenceMs: number; formattedDifference: string
  direction: 'AHEAD OF' | 'BEHIND'; isDvrAhead: boolean; isCorrect: boolean
  dvrAppliesDST: boolean
  sync: SyncResult | null                  // NTP calibration metadata (simulated)
  captureMethod: 'manual' | 'ocr'
  ocr?: { rawText: string; cleanedText: string; parsedDateTime: string; confidence: number; imageDataUrl?: string }
}
// CameraEntry, DvrInformation, ExportInformation, MediaItem, SyncResult: see types/index.ts
```

The **director beat** (the guided choreography) is also a data contract:

```typescript
export type BeatStep =
  | { kind: 'type'; field: string; value: string; perCharMs?: number }   // typewriter into a field
  | { kind: 'tap'; target: string }                                       // touch pulse + fire the UI action
  | { kind: 'call'; action: string; args?: unknown[] }                    // invoke a store action (e.g. calculateOffset)
  | { kind: 'launch'; screen: LaunchableId }                              // open a launch-only sub-screen (e.g. ocr)
  | { kind: 'set'; patch: Record<string, unknown> }                       // set a result directly
  | { kind: 'wait'; ms: number }
export interface Beat { chapter: ChapterId; steps: BeatStep[] }
```

---

## 5. Data Flow

**Guided Tour (default on open):**
1. `/demo` mounts `DemoExperience` in `guided` mode; the store is seeded blank for the
   scripted case; phone shows `splash`.
2. Visitor presses **Rail Next**. `DemoExperience` advances `currentChapter` and the
   **director runner** executes that chapter's **beat** against the store: fields auto-type,
   buttons emit a **touch pulse** then fire, results are computed by the **real `lib/demo/logic`
   functions**, sub-screens (OCR) launch and return.
4. The phone is **non-interactive** in guided mode (`pointer-events` gated) — only Rail Next
   advances. The beat fully plays, then waits.
5. At `completion`, the **real PDF generator** renders the court document into a preview.

**Free Sandbox:**
1. Visitor toggles to `sandbox` (or the tour hands off at the end). The director is **off**;
   `reset()` clears scripted data → blank slate.
2. Visitor creates a case (`createCase`), adds N locations (`addLocation`), navigates via the
   **phone's own** Next button + wizard drawer, edits any field — all calling store actions
   directly. Same screens, same narration copy (rail follows the current screen), full
   interactivity.

**Shared:** every computed value (offset, corrected scopes, OCR parse, notes, PDF) flows
through the **same pure `lib/demo/logic`** in both modes — the demo is "real" because the math
is real.

---

## 6. Error Handling Strategy

- **No camera / mic / permission denied:** screens fall back to the sample path (sample DVR
  clock, sample photo, simulated waveform). A blocked permission must **never** dead-end the
  flow. The OCR/media screens treat `getUserMedia` rejection as "show sample affordance."
- **Logic input errors** (unparseable date, empty OCR): the pure functions return typed
  null/`{ ok:false }` results; screens render a low-confidence/"enter manually" state
  (the prototype's `getConfidenceLevel` tiers are preserved).
- **Director step failure** (a beat references a missing field/target): the runner logs and
  **skips the step**, never throwing into React; a guided tour with one bad step degrades, it
  doesn't crash.
- **Render failures:** `DemoExperience` is wrapped in an error boundary that shows a "Reset
  demo" affordance rather than a blank page.
- **Sandbox guardrails:** required-field/empty states are surfaced inline; nothing blocks the
  visitor from exploring (this is a demo, not a validation gauntlet).

---

## 7. Migration / Rollout Plan

1. **Additive build.** All new code lives under `lib/demo/`, `components/demo/`, `app/demo/`.
   Nothing in the existing marketing pages changes behavior until we wire CTAs.
2. **One existing-layout change (flagged high-risk):** move `<Header/>` + `<FeatureNav/>` from
   `app/layout.tsx` into `app/(default)/layout.tsx` so `/demo` can render chrome-free. This is
   the same change the deferred backlog already anticipated; existing feature tests must stay
   green.
3. **Lazy-load.** The demo island is `dynamic()`-imported and code-split so it never enters the
   marketing pages' load budget.
4. **Wire CTAs last (fast-follow):** homepage hero "Launch the demo", per-`/features/<slug>`
   "Try this step" deep links (`/demo?step=…`), and a FeatureNav "Live Demo" entry.
5. **Rollback:** the feature is one route + three new directories + one layout move. Reverting
   is removing the route and restoring the layout.

---

## 8. Dependencies

| Package | Purpose | Notes |
|---------|---------|-------|
| `zustand` (~1.2 KB) | The demo's scoped state store | **The only new runtime dependency.** Loads only on the lazy `/demo` route. Mirrors the real app's store choice. *If we want zero new deps,* swap for a hand-rolled `useSyncExternalStore` store — localized to `lib/demo/store`, no other change (see Open Questions). |

Everything else uses what's installed: React 19, Tailwind v4 (page chrome only), Vitest +
Testing Library (tests). No Mapbox, no Babel, no Remotion, no Framer Motion.

---

## 9. Feature Module Location (adapted to this repo)

This repo is **Next.js App Router** with root-level `components/` and `lib/` (no `src/`, no
React Router). The architecture skill's `src/features/` maps here as:

```
lib/demo/                         # the engine (pure, under the 80% coverage gate)
├── types/index.ts
├── content/  screens.ts · narration.ts · seed.ts · profiles.ts
├── logic/    time.ts · ocr.ts · import.ts · pdf/{case-notes,time-offset}.ts
├── store/    create-store.ts · actions.ts · selectors.ts
├── director/ types.ts · beats.ts · runner.ts
├── __tests__/                    # engine integration tests
└── index.ts                      # barrel (public surface)

components/demo/                  # the UI (presentational client components)
├── DemoExperience.tsx            # the bridge: subscribes to store, runs director, passes props
├── PhoneFrame.tsx · StoryRail.tsx · TouchIndicator.tsx
├── primitives/  (TypewriterText, etc.)
├── controls/    (WizardDrawer, TabBar, RailNav)
├── screens/     (one component per screen — props only, no store import)
├── chrome/      (PdfPreview)
├── demo.module.css               # the lifted phone styles (exact look)
├── __tests__/
└── index.ts

app/demo/  layout.tsx (immersive) · page.tsx (mounts the island, reads ?mode/?step)
```

**Callback isolation:** screen components never import the store. `DemoExperience` is the
single bridge — it subscribes selectively and passes data + callbacks down, exactly as the
architecture skill prescribes for the page/feature boundary. This is what keeps every screen
testable with plain props.

---

## 10. Scope Boundaries

- **In scope (this plan):** the **forensic** profile, both modes (guided + sandbox), all 10
  wizard screens + the 3 app chapters + OCR/media/audio/library launch-screens, the real
  time/OCR/import/PDF logic, the director, the `/demo` route.
- **Out of scope (future):** the **canvas** profile (a later config + its own marketing page),
  the case **Map** chapter (Mapbox), homepage-hero/feature-page CTA wiring (fast-follow after
  the demo works), real encryption, cloud sync. The architecture is built so each is additive
  (a profile config, a registry entry, a route).

---

## 11. Open Questions (resolved in the Implementation Plan)

1. **Zustand vs hand-rolled store** — recommend Zustand; confirm the one new dependency is OK
   (else the impl plan uses a `useSyncExternalStore` store with the same action surface).
2. **Map chapter** — confirmed out of scope for v1 (simulate or omit); resolved as "omit from
   the forensic v1 flow; add later."
3. **Exact wizard subset** — build all 10 wizard screens, or trim the low-wow tail (DVR info,
   export info, arrival/departure)? Recommend **all 10** for fidelity; the registry makes
   trimming a config change if you'd rather.

---

## 12. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-26 | Initial architecture — forensic profile, guided + sandbox, native port. |
