# Interactive Demo — TDD Test Specification

This document defines every test that must be written **before implementation begins**.

- The **Implementation Plan** (`02-interactive-demo-implementation-plan.md`) is the single
  source of truth for file paths and signatures.
- The **Architecture Document** (`01-interactive-demo-architecture.md`) defines the data
  contracts (domain model, beat contract).

Tests are organized by the implementation phase they validate. Write them all as **red-line
tests** (designed to fail) first; implement each phase until its block is green. Runner: Vitest
4 + Testing Library (jsdom). Co-located `__tests__/` convention; coverage gate is `lib/**` at 80%.

---

## Test File Location Table

| Test File | Phase(s) |
|-----------|----------|
| `lib/demo/content/__tests__/screens.test.ts` | 1B |
| `lib/demo/content/__tests__/content.test.ts` | 1C, 1D |
| `lib/demo/logic/__tests__/time.test.ts` | 2 |
| `lib/demo/logic/__tests__/ocr.test.ts` | 3 |
| `lib/demo/logic/__tests__/import.test.ts` | 4 |
| `lib/demo/logic/pdf/__tests__/case-notes.test.ts` | 5 |
| `lib/demo/logic/pdf/__tests__/time-offset.test.ts` | 5 |
| `lib/demo/store/__tests__/store.test.ts` | 6 |
| `lib/demo/store/__tests__/test-utils.ts` | 6 (factories) |
| `lib/demo/director/__tests__/runner.test.ts` | 7 |
| `lib/demo/__tests__/engine-flow.test.ts` | 6+7 (integration) |
| `components/demo/__tests__/PhoneFrame.test.tsx` | 8A |
| `components/demo/__tests__/TouchIndicator.test.tsx` | 8B |
| `components/demo/primitives/__tests__/TypewriterText.test.tsx` | 8C |
| `components/demo/__tests__/StoryRail.test.tsx` | 9A |
| `components/demo/__tests__/DemoExperience.test.tsx` | 9C |
| `components/demo/screens/__tests__/*.test.tsx` | 10–14 |
| `components/demo/__tests__/test-utils.tsx` | 8–14 (factories) |

---

## Shared Mock Infrastructure

### `vitest.setup.ts` additions (Appendix B in the plan)
The current setup only registers jest-dom + cleanup. Add globally:
- `ResizeObserver`, `IntersectionObserver` stubs (phone-frame scaling, animations).
- `window.matchMedia` stub.
- `requestAnimationFrame`/`cancelAnimationFrame` → synchronous shims (typewriter / scale hooks).
- `HTMLCanvasElement.prototype.getContext` → returns a stub (OCR frame grab).
- **Leave `navigator.mediaDevices` undefined by default** so camera/mic screens take the
  **sample-fallback** path in tests; individual tests opt into a `getUserMedia` mock when
  asserting the live path.

### Engine factories — `lib/demo/store/__tests__/test-utils.ts`
```typescript
export const TEST_IDS = { CASE_1: 'case-1', LOC_1: 'loc-1' } as const
export function createDemoCase(o?: Partial<DemoCase>): DemoCase
export function createDemoLocation(o?: Partial<DemoLocation>): DemoLocation
export function createTimeOffset(o?: Partial<TimeOffsetData>): TimeOffsetData
export function freshStore(): DemoStore                 // createDemoStore() with no seed
export function seededStore(): DemoStore                // store after seedGuided()
export function fakeClock(): Clock & { tick(ms: number): void; flush(): void }   // injectable clock
```

### UI factories — `components/demo/__tests__/test-utils.tsx`
```typescript
export const screenProps = { /* default props per screen with vi.fn() callbacks */ }
export function renderScreen(ui: React.ReactElement): RenderResult   // thin RTL wrapper
```

### Layered mocking (per the architecture skill)
- **Logic tests:** no mocks — pure functions.
- **Store tests:** no mocks — drive actions, assert `store.getState()`.
- **Director tests:** real store + **`fakeClock`** (no real timers); assert state transitions.
- **Screen tests:** **props only** (callback isolation) — no store, no providers.
- **`DemoExperience` tests:** real store seeded via factory; assert it bridges (subscribes,
  runs the director, gates pointer-events). Mock `next/navigation` `useSearchParams` for `?mode/?step`.

---

## Phase Test Blocks

### Phase 1B Tests — Screen registries
**File:** `lib/demo/content/__tests__/screens.test.ts` · **Setup:** import registry helpers.
1. `describe('flow registries')` →
   - `it('numbers chapters sequentially with no duplicates')` — `TOUR_CHAPTERS.map(chapterNumber)` equals `1..n`, all unique. *(guards the nav-numbering bug)*
   - `it('numbers wizard screens 1..10 with no duplicates')`.
   - `it('excludes OCR/media from Next/Back flow')` — `LAUNCHABLE` includes `'ocr'`; `TOUR_CHAPTERS`/`WIZARD_SCREENS` do **not** include `'ocr'`/`'mediaCapture'`/`'audioRecording'`.
   - `it('nextChapter/prevChapter walk the order without wrapping')` — first `.prev`→null, last `.next`→null.
   - `it('every WIZARD_SCREENS id has a DRAWER_DEFS entry')`.

### Phase 1C/1D Tests — Narration, seed, profiles
**File:** `lib/demo/content/__tests__/content.test.ts`
1. `describe('narration')` → `it('has non-empty copy for every TOUR chapter')` — each id has eyebrow+title and ≥1 paragraph.
2. `describe('seed')` → `it('marks seed case and location isSeed:true')`; `it('SAMPLE_REQUEST_DOC contains the occurrence number PR25-0098213')`.
3. `describe('profiles')` → `it('forensic profile exposes all 10 wizard screens')`; `it('getProfile returns forensic by id')`.

### Phase 2 Tests — Time logic
**File:** `lib/demo/logic/__tests__/time.test.ts`
1. `describe('calculateTimeDifference')` →
   - `it('reports DVR ahead with formatted HH:MM:SS')` — DVR later than actual → `direction:'AHEAD OF'`, `isDvrAhead:true`, formatted matches.
   - `it('reports DVR behind')`; `it('reports 00:00:00 when equal')` (`isCorrect`).
   - `it('is DST-agnostic (uses the UTC trick)')` — a range straddling a DST boundary computes the same offset.
   - `it('throws on unparseable input')`.
2. `describe('calculateCorrectedTimeRange')` →
   - `it('converts actual-time scope → DVR time when DVR is ahead')` (subtracts), and the inverse.
   - `it('flips isActualTime on the returned range')`.
3. `describe('roundTo5Min')` → `it('floors start (down) and ceils end (up) to 5-minute boundaries')`; `it('zeros seconds')`; `it('passes through empty input')`.
4. `describe('isInDST')` → `it('returns true for a summer date and false for a winter date')`.

### Phase 3 Tests — OCR logic
**File:** `lib/demo/logic/__tests__/ocr.test.ts`
1. `describe('cleanOcrText')` →
   - `it('substitutes OCR confusables outside protected words')` — `O→0, l→1, S→5` applied, but `Mon`/`AM` preserved.
   - `it('repairs a missing colon in HHMM:SS')` and `it('separates AM/PM from digits')`.
2. `describe('parseTimestampFromText')` →
   - `it('parses ISO `YYYY-MM-DD HH:MM:SS`')`, `it('parses MM/DD/YYYY')`, `it('parses dash DD-MM with AM/PM')`, `it('parses compressed 14-digit')`, `it('parses time-only → today')`.
   - `it('returns null for non-timestamp text')`.
3. `describe('getConfidenceLevel')` → `it('maps ≥0.8 high, ≥0.6 medium, ≥0.4 low, else fail')` with the right color/message tier.

### Phase 4 Tests — Import logic
**File:** `lib/demo/logic/__tests__/import.test.ts`
1. `describe('parseAiJson')` → `it('strips ```json fences and slices the object')`; `it('throws on no-object input')`.
2. `describe('mapAiToForm')` →
   - `it('maps requester/business/address fields onto the location shape')`.
   - `it('does NOT map the occurrence number')` (injected from the case, per the app).
   - `it('maps each extractionTimeFrame to a scope with isActualTime from timePeriodType')` — `'DVR Time'`→false.
3. `describe('SAMPLE_EXTRACTION')` → `it('reflects the sample email (Kim's Convenience, cameras 3,4,7)')`.

### Phase 5 Tests — PDF generators
**Files:** `lib/demo/logic/pdf/__tests__/case-notes.test.ts`, `time-offset.test.ts`
1. `describe('generateCaseNotesDoc')` →
   - `it('returns standalone HTML with the case number in the header')`.
   - `it('renders a scopes table row per entered scope')`.
   - `it('includes the offset section when timeOffset is present and omits it otherwise')`.
   - `it('escapes HTML in user fields')` — a `<script>` in notes is escaped.
2. `describe('generateTimeOffsetDoc')` →
   - `it('shows CORRECT in the hero when isCorrect')` and the formatted difference otherwise.
   - `it('renders the OCR evidence block when captureMethod === "ocr"')` and the manual note otherwise.
   - `it('renders the NTP traceability chain when sync.method === "NTP"')` and the no-sync warning otherwise.

### Phase 6 Tests — Store
**File:** `lib/demo/store/__tests__/store.test.ts` · **Setup:** `freshStore`, factories.
1. `describe('seedGuided / reset')` →
   - `it('seedGuided loads the seed case+location flagged isSeed')`.
   - `it('reset removes all isSeed records and clears current ids')` — *(fixes canned-data persistence)*.
   - `it('after reset, createCase yields a case with isSeed:false')`.
2. `describe('createCase / addLocation')` →
   - `it('createCase appends a case and returns its id')`.
   - `it('addLocation links the location to the case (locationIds + caseId)')`.
   - `it('supports multiple locations on one case')` — *(the "as many as they want" requirement)*.
3. `describe('switchLocation')` → `it('sets currentLocationId and loads that location form')`.
4. `describe('updateField')` → `it('updates a nested form path on the current location')`.
5. `describe('calculateOffset')` → `it('writes timeOffset using the real time logic for the current location')`.
6. `describe('generateExtractedScopes')` → `it('produces DVR-time scopes rounded to 5-min from the offset')`.
7. `describe('generateNotes')` → `it('assembles notes text containing the occurrence number and a scope line')`.
8. `describe('launch/closeLaunch')` → `it('launch("ocr") sets view to ocr and closeLaunch restores the prior wizard screen')`.

### Phase 7 Tests — Director runner
**File:** `lib/demo/director/__tests__/runner.test.ts` · **Setup:** `seededStore`, `fakeClock`.
1. `describe('runBeat — type step')` → `it('progressively fills the target field over time')` — advance `fakeClock`, assert the field grows then equals the full value.
2. `describe('runBeat — tap step')` → `it('emits a touch pulse and invokes the bound action')`.
3. `describe('runBeat — launch step')` → `it('opens the launchable screen then continues after it closes')` (the Time Offset beat launches `ocr`).
4. `describe('runBeat — call step')` → `it('invokes calculateOffset so timeOffset is populated')`.
5. `describe('ordering & cancel')` → `it('runs steps strictly in order')`; `it('cancel() stops remaining steps')`.
6. `describe('resilience')` → `it('skips a step targeting an unknown field without throwing')` — *(error-handling contract)*.

### Phase 6+7 Tests — Engine integration (headless)
**File:** `lib/demo/__tests__/engine-flow.test.ts`
1. `describe('guided happy path (no UI)')` → `it('plays splash→…→completion beats and ends with a populated location + generated notes + a non-empty Case Notes PDF')` — run each chapter's beat via the runner against a seeded store under `fakeClock`, then assert `generateCaseNotesDoc(selectCurrentLocation(...))` contains the case number.
2. `describe('sandbox path (no UI)')` → `it('createCase + 2× addLocation + updateField round-trips without seed data present')`.

### Phase 8 Tests — Primitives
- **PhoneFrame** (`__tests__/PhoneFrame.test.tsx`): `it('renders its children inside the frame')`; `it('applies a scale transform based on container size')` (ResizeObserver stub).
- **TouchIndicator** (`__tests__/TouchIndicator.test.tsx`): `it('renders a pulse for each active pulse prop')`; `it('renders nothing when there are no pulses')`.
- **TypewriterText** (`primitives/__tests__/TypewriterText.test.tsx`): `it('renders the full text when not animating')`; `it('reveals characters progressively under fake timers')`; `it('shows no per-keystroke caret dot')`.

### Phase 9 Tests — Rail, controls, bridge
- **StoryRail** (`__tests__/StoryRail.test.tsx`): `it('renders eyebrow/title/paras/bullets for the current chapter')`; `it('shows Rail Next/Prev in guided mode')`; `it('hides Rail Next in sandbox mode')`; `it('calls onNext when Rail Next clicked')`.
- **DemoExperience** (`__tests__/DemoExperience.test.tsx`): **Setup:** mock `next/navigation` `useSearchParams`; seeded store.
  - `it('starts in guided mode by default')`; `it('honors ?mode=sandbox')`; `it('honors ?step=time-offset (jumps the chapter)')`.
  - `it('disables phone pointer-events in guided mode')` and `it('enables them in sandbox')`.
  - `it('advances the chapter and triggers the director when Rail Next is pressed')` (spy on the runner).

### Phases 10–14 Tests — Screens (callback isolation, props only)
**Files:** `components/demo/screens/__tests__/<Screen>.test.tsx`. One block per screen. Pattern
for each (example, `TimeOffsetScreen`):
1. `describe('TimeOffsetScreen')` →
   - `it('renders the DVR and actual time fields from props')`.
   - `it('calls onCapture (launch OCR) when the capture button is clicked')` — *(OCR is launch-only)*.
   - `it('calls onCalculate when Calculate is clicked')`.
   - `it('renders the offset result and direction when timeOffset prop is present')`.
   - `it('shows the NTP sync card state from props')`.

Representative coverage for the other screens (each: render-from-props + ≥1 interaction + ≥1 edge/empty state):
- **OcrCaptureScreen:** `it('shows the "Use sample DVR clock" affordance when no camera')`; `it('runs the real clean+parse pipeline on the sample and reports a confidence tier')`; `it('calls onConfirm with the parsed datetime')`.
- **CasesScreen:** `it('lists cases with their locations')`; `it('calls onNewCase')`; `it('calls onOpenLocation with the id')`.
- **NewCaseModal / ImportModal:** `it('calls onCreate with form values')`; `it('renders the staged import pipeline and calls onImport with the mapped patch')`.
- **SubmissionScreen / Requested / Arrival / DvrInfo / Cameras / ExportInfo:** field render + `onChange`/`onAdd`/`onRemove` callbacks; array screens add & remove rows.
- **CamerasScreen:** `it('calls onCaptureGps for a camera row (simulated lock)')`.
- **MediaCaptureScreen / AudioRecordingScreen:** `it('falls back to sample/simulated capture with no device')`; `it('calls onSave with the captured item')`.
- **NotesScreen:** `it('renders generated notes')`; `it('calls onRegenerate')`; `it('marks edited on change')`.
- **CompletionScreen / PdfPreview:** `it('requests the biometric gate before export (simulated)')`; `it('renders the generated PDF HTML in the preview')`.
- **SplashScreen / DashboardScreen:** render + the single advance/auth callback.

---

## Coverage Targets

| Layer | Target | Rationale |
|-------|--------|-----------|
| `lib/demo/logic/**` | 95%+ | Ported real algorithms — highest ROI; the credibility of the demo |
| `lib/demo/store/**`, `director/**` | 85%+ | State + choreography engine; drives everything |
| `lib/demo/content/**` | 90%+ | Registries enforce the nav-numbering & OCR-launch invariants |
| `components/demo/**` | Key behaviors | Render-from-props + interactions (not styling); not under the `lib/**` gate |

The repo's coverage gate (`lib/**` ≥ 80%) is comfortably met by the logic/store/director tests.

---

## Quality Checklist

- [ ] Every implementation phase (1–14) has at least one test file above.
- [ ] Mock factories live in `test-utils.ts/.tsx`, never inline.
- [ ] Every ported logic function has a happy path **and** an error/edge path.
- [ ] The two prototype bugs have explicit regression tests: **nav numbering** (Phase 1B
      "no duplicates", "OCR excluded from flow") and **canned-data persistence** (Phase 6
      "reset removes isSeed", "createCase after reset is not seed").
- [ ] The "many cases/locations" requirement is tested (Phase 6 multi-location).
- [ ] Screens are tested with **props only** — no store, no providers (callback isolation holds).
- [ ] The director runner uses the **injected `fakeClock`** — no real timers, deterministic.
- [ ] Camera/mic tests assert the **sample-fallback** path (no `getUserMedia` in jsdom by default).
- [ ] No test depends on another test's execution.
