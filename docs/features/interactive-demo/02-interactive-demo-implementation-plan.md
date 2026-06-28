# Interactive Demo — Implementation Plan

**Prerequisite:** Read `01-interactive-demo-architecture.md` for the domain model, the
director-beat contract, data flow, and design rationale. Test plan: `03-interactive-demo-test-spec.md`.

This plan is **TDD-ordered**: pure logic first (where tests have the highest ROI and the 80%
`lib/**` coverage gate applies), then the store and director, then the UI, then the route and
integration. Each phase is an independently implementable unit — write its red-line tests
(from doc 03), implement, green, review.

### Architecture Decisions (resolved)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Integration | Native React 19 port | Maintainable, on-brand, fixes both bugs; no iframe/unpkg |
| Algorithms | Port `app-logic.js` → `lib/demo/logic/*` (typed) | Real, trusted logic; pure; high coverage |
| State | Zustand vanilla store (`lib/demo/store`) | Mirrors app; director-drivable; testable |
| Guided play | Director beats + runner w/ injectable clock | Choreography-as-data; extensible; no video |
| Animation | CSS + director timing | Zero new deps |
| Screens | `TOUR_CHAPTERS` + `WIZARD_SCREENS` registries; numbers derived from index | Fixes nav numbering; OCR launch-only |
| Profiles | Config-driven (`forensic` now) | Canvas = config later, not a fork |
| Phone styles | Lifted verbatim into `demo.module.css` | Preserve exact look |
| State lifetime | In-memory, per-session; seed-vs-user + `reset()` | Fixes canned-data persistence |
| Route | `/demo` immersive; chrome moved to `(default)` layout | Full-bleed; resolves deferred FeatureNav item |

### Tooling

| Tool | Version |
|------|---------|
| Next.js | 15.1.x (App Router) |
| React | 19.2.x |
| Zustand | ^5 (new) |
| Tailwind | v4 (page chrome only) |
| Vitest + Testing Library | 4.x / RTL 16 |
| TypeScript | 5.7+ (`strict`) |

---

## Milestone 1 — The pure engine logic (`lib/demo/logic`, `types`, `content`)

**Observable result:** every algorithm the demo shows (offset math, OCR parse, AI import map,
court PDFs) is a tested pure function, and the screen/narration/seed/profile registries exist.

### Phase 1 — Types & content registries

**Goal:** Establish the domain types and the data-driven screen/narration/seed/profile registries.

#### 1A: Domain types (`lib/demo/types/index.ts`)
All interfaces from architecture §4 (`DemoCase`, `DemoLocation`, `LocationForm`, `ScopeEntry`,
`TimeOffsetData`, `CameraEntry`, `DvrInformation`, `ExportInformation`, `MediaItem`,
`SyncResult`, `Profile`, `DemoMode`, `ChapterId`, `WizardScreenId`, `LaunchableId`, `ModalId`).

#### 1B: Screen registries (`lib/demo/content/screens.ts`)
```typescript
export const TOUR_CHAPTERS: readonly ChapterId[]      // narrative order incl. splash/dashboard/cases
export const WIZARD_SCREENS: readonly WizardScreenId[] // the 10 in-drawer screens, in order
export const LAUNCHABLE: readonly LaunchableId[]        // ['ocr','mediaCapture','audioRecording']
export const DRAWER_DEFS: { id: WizardScreenId; label: string; icon: string }[]
export function chapterNumber(id: ChapterId): number    // derived from index — no hardcoded dupes
export function wizardNumber(id: WizardScreenId): number
export function nextChapter(id: ChapterId): ChapterId | null
export function prevChapter(id: ChapterId): ChapterId | null
```
> **Fixes the nav-numbering bug:** numbers come from array position, never hand-typed. OCR is
> in `LAUNCHABLE`, absent from `TOUR_CHAPTERS`/`WIZARD_SCREENS` → never in Next/Back.

#### 1C: Narration & seed (`lib/demo/content/narration.ts`, `lib/demo/content/seed.ts`)
- `narration.ts`: `NARRATION: Record<ChapterId, { eyebrow; title; paras: string[]; bullets: string[]; tip?: string }>` — **lifted verbatim from the prototype's `NAV`** (your copy, unchanged).
- `seed.ts`: `SEED_CASE`, `SEED_LOCATION_INPUTS`, and `SAMPLE_REQUEST_DOC` (the detective email) — the canonical guided-tour content, all tagged `isSeed: true`.

#### 1D: Profiles (`lib/demo/content/profiles.ts`)
```typescript
export interface ProfileConfig { id: Profile; wizardScreens: WizardScreenId[]; hiddenFields: string[] }
export const FORENSIC: ProfileConfig   // all 10 screens, no hidden fields
export function getProfile(id: Profile): ProfileConfig   // canvas added later
```

### Phase 2 — Time logic (`lib/demo/logic/time.ts`)

**Goal:** Port the bidirectional DVR↔actual time math verbatim, typed.

Ported 1:1 from `app-logic.js` (`calculateTimeDifference`, `applyTimeOffset`,
`calculateCorrectedTimeRange`, DST helpers, `roundTo5Min`, `getCurrentFormattedTime`):
```typescript
export function calculateTimeDifference(dvr: string, actual: string): TimeDifference
export function calculateCorrectedTimeRange(range: ScopeEntry, diff: TimeDifference, isActualTime: boolean): ScopeEntry
export function roundTo5Min(dt: string, dir: 'up' | 'down'): string
export function isInDST(dt: string): boolean
export function getCurrentFormattedTime(ts?: number): string
```

### Phase 3 — OCR logic (`lib/demo/logic/ocr.ts`)

**Goal:** Port the OCR text-cleaning pipeline + multi-format timestamp parser + confidence tiers.

Ported from `app-logic.js` (`cleanOcrText`, `parseTimestampFromText`, `getConfidenceLevel`):
```typescript
export function cleanOcrText(raw: string): string
export function parseTimestampFromText(text: string): string | null   // 6 formats → 'YYYY-MM-DD HH:MM:SS'
export function getConfidenceLevel(c: number): { level: 'high'|'medium'|'low'|'fail'; message: string; color: string }
```

### Phase 4 — Import logic (`lib/demo/logic/import.ts`)

**Goal:** Port the AI field-extraction prompt, sanitizer, JSON parser, and form mapper.

Ported from `app-logic.js` (`EXTRACT_FIELDS_SYSTEM_PROMPT`, `sanitizeInputText`,
`buildExtractFieldsUserPrompt`, `parseAiJson`, `mapAiToForm`, `FORM_OPTIONS`):
```typescript
export function parseAiJson(text: string): ExtractedFields           // strips fences, slices {..}
export function mapAiToForm(ai: ExtractedFields): Partial<DemoLocation> & { _import: ImportPatch }
export const SAMPLE_EXTRACTION: ExtractedFields   // deterministic result of the sample email (demo doesn't call a real model)
```
> The demo has no model. The Import chapter shows the staged pipeline UI and resolves to
> `SAMPLE_EXTRACTION` (derived from `SAMPLE_REQUEST_DOC`). `mapAiToForm` is the real mapper.

### Phase 5 — PDF generators (`lib/demo/logic/pdf/`)

**Goal:** Port the two print-ready court documents as HTML-string builders.

Ported from `app-logic.js` (`generateCaseNotesDoc`, `generateTimeOffsetDoc`, helpers
`escapeHtml`, `formatDocDate`, styles):
```typescript
// lib/demo/logic/pdf/case-notes.ts
export function generateCaseNotesDoc(d: CaseNotesData): string   // full standalone HTML
// lib/demo/logic/pdf/time-offset.ts
export function generateTimeOffsetDoc(d: TimeOffsetDocData): string
```

**Barrel after Milestone 1** (`lib/demo/index.ts`): export the `logic/*` functions, the
`content` registries, and all `types`.

---

## Milestone 2 — Store & director (`lib/demo/store`, `lib/demo/director`)

**Observable result:** a headless engine — you can script "create case → add location → fill
offset → generate notes" against the store (no UI) and assert the resulting state, and the
director can replay a chapter's beat against the store deterministically under fake timers.

### Phase 6 — Demo store

**Goal:** A Zustand vanilla store holding the full demo state with all mutation actions.

#### 6A: Store factory & state (`lib/demo/store/create-store.ts`)
```typescript
export interface DemoState {
  mode: DemoMode; profile: Profile
  cases: DemoCase[]; locations: DemoLocation[]
  currentCaseId: string | null; currentLocationId: string | null
  view: ChapterId | LaunchableId; modal: ModalId | null; drawerOpen: boolean
  // ...transient UI flags (auth, syncing, ocr*, cam*, aud*) per architecture §4
}
export type DemoStore = ReturnType<typeof createDemoStore>
export function createDemoStore(): StoreApi<DemoState & DemoActions>
```

#### 6B: Actions (`lib/demo/store/actions.ts` — composed into the store)
```typescript
export interface DemoActions {
  seedGuided(): void                 // load SEED_CASE/location, blank fields for auto-typing
  reset(): void                      // sandbox blank slate — drops all isSeed data
  createCase(input: NewCaseInput): string
  addLocation(caseId: string, input: NewLocationInput): string
  switchLocation(locationId: string): void   // mirrors the app's reset+reload
  updateField(path: string, value: unknown): void
  setView(view: ChapterId | LaunchableId): void
  launch(screen: LaunchableId): void; closeLaunch(): void
  calculateOffset(): void            // calls logic/time
  generateExtractedScopes(): void    // calls logic/time.roundTo5Min
  generateNotes(): void              // assembles notes text from form data
  applyImport(patch: ReturnType<typeof mapAiToForm>): void
  addMedia(kind, item): void; deleteMedia(kind, id): void
}
```
> **Fixes canned-data persistence:** `seedGuided()` flags content `isSeed:true`; `reset()`
> removes all `isSeed` records and starts the sandbox empty. Seed and user data never mix.

#### 6C: Selectors (`lib/demo/store/selectors.ts`)
Pure derived reads (`selectCurrentLocation`, `selectVisibleWizardScreens(profile)`,
`selectDrawerItems`, `selectSectionStatus`) — keep components dumb.

### Phase 7 — Director (guided auto-play)

**Goal:** A runner that executes a chapter's beat against the store with controllable timing.

#### 7A: Beat data (`lib/demo/director/beats.ts`)
`export const BEATS: Partial<Record<ChapterId, Beat>>` — the per-chapter choreography
(type these fields, tap Calculate, launch OCR, etc.). Data only; references store actions by name.

#### 7B: Runner (`lib/demo/director/runner.ts`)
```typescript
export interface Clock { now(): number; setTimeout(fn: () => void, ms: number): () => void }
export function runBeat(store: StoreApi<DemoState & DemoActions>, beat: Beat, clock: Clock): { cancel(): void; done: Promise<void> }
```
The runner walks `beat.steps`: `type` → progressively `updateField`; `tap` → emit a touch-pulse
event + invoke the bound action; `call`/`launch`/`set`/`wait` as named. **Clock is injected** so
tests drive it with fake timers and real time uses `setTimeout`.

**Barrel update:** export `createDemoStore`, action/selector types, `runBeat`, `BEATS`.

---

## Milestone 3 — UI shell & primitives (`components/demo`)

**Observable result:** an empty phone frame with the story rail renders on `/demo`, scales
responsively, and the touch-pulse + typewriter primitives work in isolation.

### Phase 8 — Frame, pulse, typewriter
- **8A** `components/demo/PhoneFrame.tsx` — the device frame + responsive scale (port the
  prototype's `applyScale` as a `usePhoneScale` hook). Phone styles come from `demo.module.css`.
- **8B** `components/demo/TouchIndicator.tsx` — the tap-pulse overlay; listens for the runner's
  pulse events (or a `pulses` prop) and renders ripples at targets.
- **8C** `components/demo/primitives/TypewriterText.tsx` + `useTypewriter` — renders progressive
  text (no per-key dot), driven by the store value the director is filling.
- **8D** `components/demo/demo.module.css` — **lifted verbatim** from the prototype (phone shell,
  screens, drawer, atomic classes). *Do not restyle.*

### Phase 9 — Rail, mode controls, container
- **9A** `components/demo/StoryRail.tsx` — narration (eyebrow/title/paras/bullets/tip) from
  `NARRATION[currentChapter]`; **Rail Next/Prev in guided**, contextual (no Next) in sandbox.
- **9B** `components/demo/controls/RailNav.tsx`, `WizardDrawer.tsx`, `TabBar.tsx`.
- **9C** `components/demo/DemoExperience.tsx` — **the bridge.** Creates the store (once), reads
  `mode`/`step` props, subscribes selectively, runs the director on chapter-enter in guided mode,
  gates phone `pointer-events` off in guided / on in sandbox, and renders `StoryRail` +
  `PhoneFrame` with the current screen. *This is the only component that touches the store.*

> **Guided phone lock:** in guided mode `DemoExperience` sets `pointer-events:none` on the phone
> subtree and the only control is `RailNav`. In sandbox it's interactive and `RailNav` is hidden.

---

## Milestone 4 — Screens (`components/demo/screens`)

**Observable result:** each screen renders from props and is individually testable; the guided
beat plays end-to-end; the sandbox lets you click through.

Every screen component is **presentational**: it takes its slice of form data + callback props,
emits events, never imports the store. Grouped into phases for review-sized chunks.

### Phase 10 — App chapters & modals
`SplashScreen` (biometric HUD, simulated), `DashboardScreen`, `CasesScreen`, `NewCaseModal`,
`NewLocationModal`, `ImportModal` (staged pipeline UI → resolves to `SAMPLE_EXTRACTION`).

### Phase 11 — Wizard core
`SubmissionScreen`, `RequestedScopeScreen`, `ArrivalDepartureScreen`.

### Phase 12 — The marquee (time + OCR)
`TimeOffsetScreen` (NTP sync card [simulated], DVR/actual inputs, **capture button that
`launch('ocr')`**, Calculate → `calculateOffset`), `OcrCaptureScreen` (real `getUserMedia` +
canvas frame + real `cleanOcrText`/`parseTimestampFromText`; **"Use sample DVR clock"** fallback;
confidence tiers), `ExtractedScopeScreen` (auto-generated DVR-time scopes).
> **OCR is reached only by the Time Offset capture button** (and by the guided beat's
> `launch:'ocr'` step) — never from Next/Back.

### Phase 13 — Hardware screens
`DvrInfoScreen`, `CamerasScreen` (+ simulated per-camera GPS lock), `ExportInfoScreen`,
`MediaCaptureScreen` (real webcam photo/video + sample fallback), `AudioRecordingScreen`
(real mic + simulated waveform fallback), `MediaLibraryModal`.

### Phase 14 — Notes & completion
`NotesScreen` (auto-generated bullets via `generateNotes`, editable, regenerate),
`CompletionScreen` + `chrome/PdfPreview.tsx` (renders the **real** `generateCaseNotesDoc` /
`generateTimeOffsetDoc` HTML into an iframe/preview; simulated biometric export gate).

**Barrel** (`components/demo/index.ts`): export only `DemoExperience` (the public surface).

---

## Milestone 5 — Route & integration

**Observable result:** `/demo` is live, chrome-free, lazy-loaded; the marketing pages are
unaffected; existing tests stay green.

### Phase 15 — Route & layout move *(modifies existing files — high risk)*
- **15A** `app/(default)/layout.tsx` — **move** `<Header/>` + `<FeatureNav/>` here from the root
  layout (they currently render globally). Keep Footer/AOS as-is.
- **15B** `app/layout.tsx` — remove `<Header/>` + `<FeatureNav/>`; keep `<html>/<body>` + fonts.
  (Resolves the deferred "FeatureNav site-wide" item — update `docs/code-reviews/deferred.md`.)
- **15C** `app/demo/layout.tsx` — immersive, chrome-free shell (dark background, full height).
- **15D** `app/demo/page.tsx` — `dynamic(() => import('@/features/demo'), { ssr: false })`,
  read `?mode`/`?step` from `searchParams`, mount `<DemoExperience/>`.

### Phase 16 — Site wiring *(fast-follow; modifies existing files)*
Homepage hero "Launch the demo" CTA; per-`/features/<slug>` "Try this step" → `/demo?step=<id>`
(map slug→chapter); optional FeatureNav "Live Demo" entry. *Can ship after the demo is solid.*

---

## Integration hooks

- **Layout move (15A/15B):** the only behavioral change to existing code. The existing
  `feature-nav.test.tsx` / `feature-page.test.tsx` / `features.test.ts` must remain green;
  `FeatureNav` rendering moves from "every route" to "the `(default)` group", which is the
  intended fix.
- **Deep links (16):** `app/(default)/features/[slug]/page.tsx` gains a "Try this step" link
  using a `slug → ChapterId` map from `lib/demo/content/screens.ts`.

---

## Appendix A — File Manifest (new files)

| File | Phase | Purpose |
|------|-------|---------|
| `lib/demo/types/index.ts` | 1A | Domain types |
| `lib/demo/content/screens.ts` | 1B | Flow registries + derived numbering |
| `lib/demo/content/narration.ts` | 1C | Story-rail copy (lifted from prototype) |
| `lib/demo/content/seed.ts` | 1C | Canonical demo case + sample request doc |
| `lib/demo/content/profiles.ts` | 1D | Profile config (forensic) |
| `lib/demo/logic/time.ts` | 2 | Bidirectional time math (ported) |
| `lib/demo/logic/ocr.ts` | 3 | OCR cleaning + timestamp parser (ported) |
| `lib/demo/logic/import.ts` | 4 | AI prompt, JSON parse, form mapper (ported) |
| `lib/demo/logic/pdf/case-notes.ts` | 5 | Case Notes PDF (ported) |
| `lib/demo/logic/pdf/time-offset.ts` | 5 | Time-Offset Report PDF (ported) |
| `lib/demo/store/create-store.ts` | 6A | Store factory + state |
| `lib/demo/store/actions.ts` | 6B | Mutation actions |
| `lib/demo/store/selectors.ts` | 6C | Derived selectors |
| `lib/demo/director/types.ts` | 7A | Beat/BeatStep types |
| `lib/demo/director/beats.ts` | 7A | Per-chapter choreography (data) |
| `lib/demo/director/runner.ts` | 7B | Beat runner (injectable clock) |
| `lib/demo/index.ts` | 1–7 | Engine barrel |
| `components/demo/PhoneFrame.tsx` | 8A | Device frame + scale |
| `components/demo/TouchIndicator.tsx` | 8B | Tap-pulse overlay |
| `components/demo/primitives/TypewriterText.tsx` | 8C | Typing animation |
| `components/demo/demo.module.css` | 8D | Lifted phone styles |
| `components/demo/StoryRail.tsx` | 9A | Narration panel |
| `components/demo/controls/*.tsx` | 9B | RailNav, WizardDrawer, TabBar |
| `components/demo/DemoExperience.tsx` | 9C | Store/director bridge (public) |
| `components/demo/screens/*.tsx` | 10–14 | ~19 screen components |
| `components/demo/chrome/PdfPreview.tsx` | 14 | PDF preview |
| `components/demo/index.ts` | 9–14 | UI barrel (exports `DemoExperience`) |
| `app/demo/layout.tsx` | 15C | Immersive layout |
| `app/demo/page.tsx` | 15D | Route (lazy mount) |

## Appendix B — Modified existing files (high-risk change tracker)

| File | Phase | Modification |
|------|-------|-------------|
| `app/layout.tsx` | 15B | Remove `<Header/>` + `<FeatureNav/>` (keep html/body/fonts) |
| `app/(default)/layout.tsx` | 15A | Add `<Header/>` + `<FeatureNav/>` (was root-global) |
| `vitest.setup.ts` | (tests) | Add `ResizeObserver`, `matchMedia`, `requestAnimationFrame`, `navigator.mediaDevices` mocks (see doc 03) |
| `package.json` | 6A | Add `zustand` dependency |
| `docs/code-reviews/deferred.md` | 15B | Mark the "FeatureNav site-wide" item resolved |
| `app/(default)/features/[slug]/page.tsx` | 16 | Add "Try this step" deep link (fast-follow) |
| `app/(default)/page.tsx` | 16 | Add homepage "Launch the demo" CTA (fast-follow) |

## Appendix C — Error handling per module

- `lib/demo/logic/*`: pure; return `null`/typed empty on bad input, never throw for parse misses.
- `lib/demo/store`: actions are total; unknown ids are no-ops (logged in dev).
- `lib/demo/director/runner`: a failing step is caught, logged, skipped — never throws into React.
- `components/demo/*`: camera/mic rejection → sample-fallback affordance; `DemoExperience`
  wraps the tree in an error boundary exposing "Reset demo".
