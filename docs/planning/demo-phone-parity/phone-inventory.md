# Phone App Surface Inventory — CCTV Recovery Notes (DVR Extraction Notes)

> **CORRECTION (2026-07-31, P2.3 source verification):** §M13's claim that `GpsCaptureControl` applies a **">2σ outlier filter"** is FALSE — phone `gps-service.ts:276-282` simply selects the most accurate sample; no mean/deviation is ever computed. The claim traces to doc-drift inside the phone repo itself (`src/features/README.md:768`, `DOCUMENTATION-PLAN.md:2520`); the phone's accurate line is `location/README.md:276`. Any future GPS work (P3.4, P3.7) must NOT implement a 2σ filter — it would commit different coordinates than the phone. Logged on the phone-repo follow-up ledger as doc-drift.


**Repo:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative`
**Stack:** React Native + Expo SDK 54, Expo Router v6 (file-based), Zustand (12 slices), SQLite (SQLCipher) as source of truth, TypeScript strict.
**Audience:** whoever is building/upgrading the web demo at `/Users/fvadev/Developer/extraction-notes/demo-website-dvr-extraction-notes`. This document is the **phone-app side** of a gap analysis — every user-facing surface, what it renders, what logic sits behind it, and what a browser has to mock.
**Generated:** 2026-07-30. Read-only audit — no repo files were modified.

---

## How to read this document

- Every screen entry lists: **purpose → components rendered (absolute paths) → interactions → store/services/logic → native deps to mock**, and ends with a **"Web-demo notes:"** bullet list.
- Absolute paths are given so you can open the real component next to the demo component you are writing.
- Section 7 (cross-cutting) contains the design tokens, shared component catalog, save architecture, data model, and native-dep→web-substitute table. **Read section 7 first if you are starting the port** — it is the shared foundation every other section assumes.
- The final section is a one-row-per-surface summary table designed to be joined against a demo-site inventory.

## App at a glance

```
App launch
  └─ AuthenticatedSplashScreen (biometric gate + doors-open video)
       └─ (tabs)                                   bottom tab bar, lazy:false
            ├─ home     Dashboard timeline (5 recent cases)
            ├─ cases    Full case/location CRUD, import, export, duplication
            ├─ map      Case map viewer (MapPicker → MapHost/Mapbox)
            └─ export   Export hub (selection → ZIP / GeoJSON / case-map pipelines)
                 │
                 └─ switchToLocation() ──▶ (form)   right-side DRAWER wizard, 13 screens
                        ├─ 10 linear steps:  submission → requested-scope → arrival-departure
                        │                    → time-offset → extracted-video-scope → dvr-information
                        │                    → cameras → export-information → notes → completion
                        └─ 3 additive tools: ocr-capture (from time-offset),
                                             media-capture, audio-recording (from the drawer)
       + Settings modal (master/detail catalog) reachable from the tab headers
       + Import flow (JSON / PDF-with-on-device-AI) reachable from the Cases tab
```

**The five systems that define this app** (get these right and the demo is convincing):
1. DVR Time ↔ Real Time offset math with DST handling (`bidirectional-time.ts`)
2. Auto-derived extracted scopes (`extracted-scope-generator.ts` + the store recalculation subscription)
3. Auto-generated case notes with hash-based staleness detection
4. The 4-layer, mutex-protected auto-save with dirty tracking and tri-state completion dots
5. The glass/blueprint "command center" aesthetic (LinearGradient + navy palette + grid + scan line)

---

## Table of contents

1. Tab Shell & Case Management Surfaces
2. Form Wizard — Drawer Chrome + Screens 1-7
3. Form Wizard — Screens 8-13
4. Settings, Form Customization & Agency Cloud
5. Import Flow (JSON + PDF)
6. Media, OCR & Location Features
7. Cross-Cutting UI/UX, App Entry & Design System
8. Master surface table (join key for the demo-site inventory)
9. The logic systems a web replica must implement (ranked)
10. Highest-leverage wins for the web demo

---

## 1. Tab Shell & Case Management Surfaces

Scope: `app/(tabs)/*` and everything reachable from those routes **except** the Settings modal and the Import flows (owned by other agents). The Map tab is covered at ROUTE level only — `MapHost` / bottom-sheet / Mapbox internals belong to the map-view agent.

Repo root for all paths below: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative`

---

### 1.0 Shared foundations a web rebuild needs first

#### Data model (what every surface renders)

Defined in `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/types/index.ts` and `.../types/enums.ts`.

```ts
type UUID = string & { readonly __brand: 'UUID' }        // branded; runtime = plain uuid v4

interface Case {
  id: UUID
  caseNumber: string            // OCC# — UNIQUE, immutable after create
  directoryName: string         // sanitized caseNumber, immutable, drives filesystem paths
  displayName?: string
  status: CaseStatus            // 'draft' | 'complete' | 'archived'  (draft renders as "Active")
  metadata: CaseMetadata        // { oicName, oicBadgeNumber, videoCoordinatorName, videoCoordinatorBadgeNumber, unit }
  notes?: string
  createdAt: string; updatedAt: string
  locationCount: number
  syncedAt: string | null
  // Incident Location (case-level, schema v10)
  incidentBusinessName?: string
  incidentStreetAddress?: string
  incidentCity?: string
  incidentAddress?: string      // formatted/legacy, derived
  incidentCoordinates?: Coordinates   // { latitude, longitude, accuracy?, altitude?, timestamp?, source? }
}
interface CaseWithLocations extends Case { locations: Location[] }

interface Location {
  id: UUID; caseId: UUID
  locationName: string          // unique per case (trimmed, case-insensitive)
  directoryName: string         // immutable, from businessName+streetAddress+locationName
  status: LocationStatus        // 'started' | 'working' | 'complete'
  address, businessName, streetAddress, city: string
  locationContact, locationPhone: string
  requesterName, requesterBadgeNumber, requesterUnit, requesterPhone, requesterEmail: string
  coordinates?: Coordinates
  duplicatedFrom?: UUID | null
  formData: LocationFormData    // the whole 13-screen wizard blob (JSON)
  createdAt, updatedAt: string; syncedAt: string | null
}
type CoordinateSource = 'gps' | 'manual' | 'geocoded'
```

Enums: `CaseStatus = { DRAFT: 'draft', COMPLETE: 'complete', ARCHIVED: 'archived' }`, `LocationStatus = { STARTED: 'started', WORKING: 'working', COMPLETE: 'complete' }`.

#### `useCases` — the single list hook every tab surface uses

`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/hooks/useCases.ts`

```ts
const { cases, isLoading, isRefreshing, error, hasMore, hasLoaded, refresh, loadMore }
  = useCases({ status?, pageSize = 50, autoLoad = true })
```
- Calls `getCasesWithLocations({ status, limit, offset, sortBy: 'created_at', sortOrder: 'DESC' })` → SQLite.
- Ref-based guards (`offsetRef`, `isLoadingRef`, `hasMoreRef`) assigned **synchronously** in the fetch (BUG-030 fix). `loadMore` is a no-op while loading or when `!hasMore`.
- `loadMore` composition is **idempotent**: dedupes by `id` against the existing array (offset pagination can re-serve rows).
- `hasLoaded` distinguishes "still loading first page" from "genuinely empty" — every consumer renders a spinner until `hasLoaded`, and every consumer renders **error ahead of empty**.
- `error` is nulled at fetch start, so retry banners self-clear.

**Web-demo notes:**
- Replace SQLite with an in-memory/IndexedDB store; keep the same `{cases, hasLoaded, error, refresh, loadMore}` shape — four surfaces (home, cases, map picker, export hub) depend on it identically.
- Simulate latency (~150–400 ms) so the `!hasLoaded` spinner and the pull-to-refresh states are demonstrable.

#### Screen chrome

`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/components/layout/Screen.tsx` — every tab uses `<Screen scrollable={false} padding={false} excludeBottomSafeArea keyboardAware={false} showGrid showScanLine>`. `showGrid` renders `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/components/layout/GridBackground.tsx` (blueprint grid, opacity `subtle|normal|strong`) plus an animated scan-line. Home passes `gridOpacity={colorScheme === 'dark' ? 'normal' : 'subtle'}`.

`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/components/layout/MainHeader.tsx` — the Home/Cases header: big left title (`3xl`, bold), then optional "New Case" icon button (`folder-open-outline`, only when `onNewCasePress` supplied — **Cases only, not Home**) and a settings gear (`settings-outline`). Both tint `colors.primary`.

Glass aesthetic: `LinearGradient` + `GlassColors[scheme].{card|nestedCard|elevated|header}` from `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/constants/Colors.ts` (`gradient: [string,string]`, `border`, `highlightTop`). Spacing/typography from `src/constants/Layout.ts` / `src/constants/Typography.ts`. Mono font is `JetBrainsMono` / `JetBrainsMono-SemiBold`.

**Web-demo notes:**
- The "glass" is *faux* — two-stop linear gradients + 1px border + a 1px top highlight line. Trivially reproducible with CSS `linear-gradient` + `border` + `::before`.
- Grid background + scan-line are pure decoration; a CSS repeating-linear-gradient + a keyframed translateY bar is sufficient.

---

### Tab shell — `app/(tabs)/_layout.tsx`

**File:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/(tabs)/_layout.tsx`

Purpose: bottom tab bar for the four main destinations. Expo Router `<Tabs>`.

`screenOptions`:
- `headerShown: false` (each screen draws its own `MainHeader`).
- `tabBarActiveTintColor: colors.primary`, `tabBarInactiveTintColor: colors.textSecondary`.
- `tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, paddingTop: 6 }`.
- **`lazy: false`** — all four tabs mount at startup and stay mounted for the session. This is *why* every tab has a `useFocusEffect(refresh)`: a change made on one tab would otherwise never appear on another. (The Map tab's expensive part is separately gated: `MapHost` mounts only after a case is picked AND while focused.)

Tabs, in order:

| name | title | Ionicons icon |
|---|---|---|
| `home` | Dashboard | `desktop-outline` |
| `cases` | Cases | `folder` |
| `map` | Map | `map` |
| `export` | Export | `archive-outline` (marked "interim icon" in-source) |

**Web-demo notes:**
- Reproduce as a fixed-bottom 4-item nav bar. Keep all four "screens" mounted (or at least keep their state) to preserve the `lazy:false` behaviour that the focus-refresh logic exists to compensate for.
- No native deps.

---

### Home / Dashboard — `app/(tabs)/home.tsx`

**File:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/(tabs)/home.tsx`

Purpose: "Command Center Timeline" — the 5 most recent cases as a vertical timeline, each with a glowing marker and connector line, expandable to their locations. Tapping a location jumps into the form wizard for that location.

#### Composition (top → bottom)

1. `<Screen>` with grid + scan-line.
2. `<MainHeader title="Dashboard" onSettingsPress={…} testID="dashboard-header" />` — **no New Case button here**.
3. Content, one of three:
   - `isLoading` → centered `<ActivityIndicator testID="loading-indicator" size="large" color={colors.primary} />`
   - `error` → centered error text (`colors.error`) + `<Button testID="retry-button" variant="primary">Retry</Button>` calling `refresh`
   - otherwise → `<FlatList>` of `TimelineItem`s
4. `<SettingsModal>` (other agent), `<CaseActionsSheet>`, and — conditionally mounted — `<NewCaseModal mode="edit">`.

FlatList config: `ListHeaderComponent` = a mono uppercase label **"Recent Activity"** (`JetBrainsMono`, `xs`, `colors.textTertiary`, letterSpacing 1, `marginLeft: 32 + spacing.sm` so it aligns past the timeline track). `ListEmptyComponent` renders `<EmptyState message="No cases yet. Create a new case to get started." />` **only after `hasLoaded`** (prevents an empty-state flash). `refreshControl` = pull-to-refresh tinted `colors.primary`. Perf: `removeClippedSubviews`, `maxToRenderPerBatch/initialNumToRender/windowSize = 5`.

Data: `useCases({ autoLoad: true, pageSize: DASHBOARD_CASE_LIMIT })` where `DASHBOARD_CASE_LIMIT = 5`. No `loadMore` wired — the dashboard is capped at one page of 5.

`useFocusEffect(() => refresh())` on every focus.

#### `TimelineItem`

`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/components/TimelineItem.tsx`

- Row layout: 32px-wide `timelineTrack` column + flexible card column.
- Track: a 2px vertical line segment **above** the marker when `index > 0` (colored `colors.primary`), and **below** the marker when `!isLast` (colored `colors.border`).
- Marker: absolutely positioned at `top: 24`. Two stacked circles — a 16px `markerGlow` (opacity .4, shadowRadius 8, elevation 4) and a 12px `marker` with 2px border. Color = `colors.warning` when `status === DRAFT` (active), else `colors.success`. Active cases render a *hollow* marker (background = page background, border = markerColor); complete/archived render *filled*.
- Entrance animation: Reanimated `FadeInLeft.delay(100 + index * 100).duration(400)` — a staggered cascade.

#### `DashboardCaseCard`

`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/components/DashboardCaseCard.tsx`

Glass card (LinearGradient `GlassColors[scheme].card`, radius 16, 1px border, 1px top highlight line, theme-aware drop shadow — a blue-tinted shadow in light mode, black in dark).

Contents:
- **Header row**: case number (`JetBrainsMono-SemiBold`, `lg`) + a pill status badge. Badge label/color from `getStatusDisplay`: COMPLETE → `colors.success` "COMPLETE"; ARCHIVED → `colors.textSecondary` "ARCHIVED"; DRAFT (default) → `colors.warning` **"ACTIVE"**. Badge bg = `color+'20'`, border = `color+'40'`.
- **Personnel row** (wrap): up to three chips — `OIC <name> #<badge>`, `VC <name> #<badge>`, `Unit <unit>` — each only when the value exists. Badge numbers are mono and tinted (`#4ecdc4` dark / `colors.primary` light).
- **Created date**: `Created: {formatDashboardDate(createdAt)}` (`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/lib/utils/date-formatting.ts`).
- **Location pills row**: shows `VISIBLE_LOCATION_COUNT = 1` `LocationPill`, then a `MoreLocationsPill` reading `+N` if more exist.
- **Expanded location list**: tapping `+N` toggles `isExpanded`, animating a Reanimated `withSpring({damping:15, stiffness:120})` height/opacity interpolation. Height is measured via `onLayout`, with an estimate (`overhead 60 + count * 52`) used on the first expand to avoid jank. Expanded body = header "All Locations:" + one `CompactLocationItem` per location (**all** of them, not just the hidden ones).
- Empty: italic "No locations yet".
- **Long press** (`delayLongPress={500}`) on the whole card → `onLongPress(caseData)` → route opens `CaseActionsSheet`. Route also fires `safeImpactAsync(ImpactFeedbackStyle.Medium)` haptics.
- `React.memo` with a custom comparator keyed on `id/status/updatedAt/locationCount/locations` identity.

#### `LocationPill` / `MoreLocationsPill`

`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/components/LocationPill.tsx`

- Rounded (radius 20) gradient pill, 6px status dot + one line of text (`maxWidth: 140`, single line).
- Dot color: COMPLETE → `colors.success`; WORKING → `colors.primary`; STARTED/default → `colors.warning`.
- Text precedence: `businessName` → `streetAddress` → `locationName` → literal `'Location'`.
- `MoreLocationsPill`: neutral pill with mono `+{count}`.

#### `CompactLocationItem`

`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/components/CompactLocationItem.tsx`

Single-line glass row (`nestedCard` variant), `minHeight = Layout.touchTarget.min` (44). Text precedence: `"{businessName} - {streetAddress}"` → `businessName` → `address` → `locationName`. Trailing `CaseStatusBadge size="small"`.

#### `CaseStatusBadge`

`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/components/CaseStatusBadge.tsx` — one badge component for both case and location statuses. Labels: `draft → "Active"`, `complete → "Complete"`, `archived → "Archived"`, `started → "Started"`, `working → "Working"`, `complete(location) → "Complete"`. Background is always `color + '20'`, text is the color. Sizes small/medium/large change padding + font size only.

#### `CaseActionsSheet` (long-press menu + read-only case detail)

`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/components/CaseActionsSheet.tsx`

A full glass `<Modal presentationStyle="pageSheet" animationType="slide">` (not a native alert — Android's AlertDialog caps at 3 buttons).

Header: case number (2xl bold) → optional display name (only when non-empty **and** different from the case number) → `Status: {label}` where DRAFT prints as **"Active"**.

Body: a single bordered "report" panel (mirrors the Time-Calibration card) containing label/value rows in groups separated by hairline dividers. Groups are only emitted when they have content:
- **Case Personnel** — `Officer in Charge`, `Video Coordinator` (rendered as `"Name · #Badge"` / `"Name"` / `"#Badge"`), `Unit`.
- **Incident Location** — `Business`, `Address` (uses `incidentStreetAddress`, falling back to `incidentAddress`, **never both**), `City`, `Coordinates` (mono, 6-dp `lat, lng`). Coordinates are gated on `hasCapturedCoordinates()` (BUG-008) so a stored `(0,0)` is treated as *not captured* and hidden.
- **Notes** — free text.
- **Details** (always) — `Locations` count, `Created` (locale date, raw string fallback if unparseable).

The panel is a `ScrollView` whose `maxHeight` is computed from the measured detail-area height (`onLayout`) minus padding, and whose `scrollEnabled` flips true **only** when measured content height exceeds that cap — so short content hugs and doesn't bounce. Measured content height resets when the case id changes.

Action grid (flex-wrap, each button `flexBasis: 48%`, `flexGrow: 1`):

| status | buttons (in order) |
|---|---|
| DRAFT | Edit Case (primary), Complete Case (primary), Archive Case (outline), Cancel (outline) |
| COMPLETE | Edit Case, Reopen Case (outline), Archive Case (outline), Cancel |
| ARCHIVED | Edit Case, Reopen Case (outline), Cancel (stretches full width) |

The matrix lives in `actionsForStatus()` with an `assertNever` default.

#### Home route handlers

- `handleLocationPress(locationId, caseId)` → `await switchToLocation(locationId, caseId)` (from `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/lib/services/form-persistence.ts`) → on success `router.navigate('/(form)/submission')`; on false/throw a red Toast. `switchToLocation` = (1) force-save the current location if dirty, (2) load the new location into Zustand under a load/save exclusion guard, (3) set case context, (4) set location context.
- `handleCaseLongPress` → medium haptic → `setActionSheetCase(caseData)`.
- Sheet actions call `completeCase / reopenCase / archiveCase` from `case-service.ts`, then `refresh()` + a success Toast (`"{caseNumber} completed|reopened|archived"`); failures log + error Toast.
- **Edit**: closes the sheet, then `setTimeout(() => setEditingCase(c), 350)` — `SHEET_DISMISS_ANIMATION_MS`. Presenting a second iOS pageSheet while the first is animating out silently drops it.
- `handleEditSubmit(input)` strips `caseNumber` (immutable in edit mode) and calls `updateCase(id, updates)`; errors deliberately **propagate** so `NewCaseModal` shows its own banner and stays open.

**Web-demo notes:**
- Mock: SQLite reads (`useCases`, `getCasesWithLocations`), `switchToLocation`'s save-then-load, `expo-haptics` (`safeImpactAsync` → no-op or `navigator.vibrate`), toasts (`react-native-toast-message`).
- Reanimated `FadeInLeft` stagger and the spring expand → CSS animations / `max-height` transitions.
- The 350 ms sheet-dismiss delay before opening the edit modal is an iOS artifact; on web it can be dropped (or kept for the same visual beat).
- Timeline marker glow = `box-shadow: 0 0 8px <color>` on an absolutely positioned dot.

---

### Cases — `app/(tabs)/cases.tsx`

**File:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/(tabs)/cases.tsx` (~1200 lines; the single richest route in this section)

Purpose: full paginated case list with CRUD — create case, create location, delete case/location, duplicate location (4 ways), export a single location (ZIP or GeoJSON), and import (other agent).

#### Composition

```
<Screen showGrid showScanLine>
  <MainHeader title="Cases" onNewCasePress onSettingsPress testID="cases-header" />
  <ErrorBoundary fallback={<CaseListErrorFallback/>}>       // "Unable to Load Cases / …restart the app."
    <CaseList … />
    {deleteState.type === 'case'     && <DeleteConfirmationModal type="case" …/>}
    {deleteState.type === 'location' && <DeleteConfirmationModal type="location" …/>}
  </ErrorBoundary>
  <NewCaseModal visible={showNewCaseModal} …/>
  <SettingsModal …/>                                        // other agent
  {selectedCaseId   && <NewLocationModal … existingNames …/>}
  {duplicateState   && <DuplicateLocationModal … 6 actions …/>}
  {newAddressState  && <NewLocationModal requireAddress subtitle initialValues …/>}
  {importCaseId     && <ImportPickerModal …/>}               // other agent
  <ImportFlowModal …/>                                       // other agent
  <ExportModal mode={exportModalMode} …/>
  <PasswordModal visible={exportFlow.showPasswordModal} …/>
</Screen>
```

Data: `useCases()` (defaults: all statuses, pageSize 50, autoLoad) + `useFocusEffect(refresh)`. Store reads (selective): `setCurrentCase`, `setCurrentLocation`, `currentLocationId` from `useFormStore`.

#### `CaseList`

`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/components/CaseList.tsx`

`FlatList` of `CaseWithLocations`. Props: `cases, onLocationPress, onCasePress?, onLocationLongPress?, onAddLocationPress?, onImportPress?, onRefresh, isRefreshing, onEndReached, newlyCreatedCaseId, onCaseDeletePress, onLocationDeletePress`.

- Renders `SwipeableCaseCard` **only when both delete handlers are provided**; otherwise a plain `CaseCard` in a margin wrapper (a dev-only `console.warn` fires if exactly one handler is passed).
- Swipe coordination: `openSwipeableIdRef` (a ref, not state — avoids re-rendering the list on every swipe) + `swipeableRefsMap: Map<string, SwipeableRef>` keyed `case-<id>` / `location-<id>`. Opening one closes the previously open one; `onScrollBeginDrag` closes any open one. An effect prunes orphaned refs when items disappear.
- `initialExpanded = item.id === newlyCreatedCaseId` — a freshly created case renders expanded.
- Empty: `<EmptyState message="No cases found" />`.
- `onEndReachedThreshold = 0.5` → `loadMore`.
- Perf constants come from `PERFORMANCE_CONFIG` in `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/constants/index.ts`. `getItemLayout` deliberately omitted (variable card heights).

#### `CaseCard` (collapsed/expanded)

`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/components/CaseCard.tsx`

Glass `Card`. Header press toggles expand (or calls `onCasePress` if supplied).

- **Header**: left = case number (`lg` bold) + optional display name; right = `CaseStatusBadge` + `"{n} location|locations"`.
- **Metadata block** (below a top border): `OIC: name (badge)`, `VC: name (badge)`, `Unit: unit` — each rendered only when present.
- **Expanded**:
  - Location rows (each `LocationItem`, or `renderLocationItem` injected by `SwipeableCaseCard` to render `SwipeableLocationItem`).
  - If no locations: italic "No locations yet".
  - Action button row: `Import` (secondary, small, `testID="import-location-button"`) and `Add Location` (primary, small, `testID="add-location-button"`), each `flex: 1`.
- `React.memo` with an explicit comparator (id, updatedAt, locationCount, all 5 metadata fields, and every callback identity).

#### `LocationItem` / `SwipeableLocationItem` / `SwipeableCaseCard` / `SwipeDeleteAction`

- `LocationItem` (`.../components/LocationItem.tsx`): glass gradient row — name (`base`, semibold) over a 1-line `address`, trailing `CaseStatusBadge size="small"`. `onPress` + optional `onLongPress`. `testID="location-item-<id>"`.
- `SwipeableLocationItem` (`.../components/SwipeableLocationItem.tsx`): wraps it in `ReanimatedSwipeable` with right actions. Always swipeable. Fires `safeImpactAsync()` on `onSwipeableWillOpen`. Exposes an a11y custom action `delete`. Wrapper has `overflow: 'hidden'`, `marginBottom` moved off the child (child margins inside `overflow:hidden` overflowed the delete button), and `elevation: 0` on Android for correct clipping.
- `SwipeableCaseCard` (`.../components/SwipeableCaseCard.tsx`): same wrapper for the whole case card, but **swipe is disabled while the card is expanded** (`enabled={!isExpanded}`, `renderRightActions` returns null when expanded) — prevents deleting a case you're browsing. Expanding auto-closes the swipe.
- `SwipeDeleteAction` (`.../components/SwipeDeleteAction.tsx`): fixed-width (`DELETE_BUTTON_WIDTH` from `constants/swipe.ts`) solid `colors.error` panel with a `trash-outline` icon + "Delete". Opacity driven by a `withTiming(progress > 0.05 ? 1 : 0, {duration:50})` derived value; content scales `0.8 → 0.95 → 1` across progress.
- Swipe tuning: `SWIPE_CONFIG.{rightThreshold, overshootRight, friction}` in `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/constants/swipe.ts`.

#### `DeleteConfirmationModal`

`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/components/DeleteConfirmationModal.tsx`

Transparent fade modal, centered glass `Card` (`maxWidth: 340`). Tapping the overlay cancels **unless** `isDeleting`. Discriminated on `type`:

- **location**: a 48px `trash` icon in `colors.error`, title "Delete Location?", rows `Location:` / `Address:` (address row omitted when blank), and the italic red warning "All form data, photos, and PDFs for this location will be permanently deleted."
- **case**: title "Delete Case?", row `Case: {caseNumber}`, then (when locations exist) an amber "WARNING: This will also delete these locations:" and a `maxHeight: 150` scrollable bulleted list of location names, then "All form data, photos, and PDFs will be permanently deleted."

Footer: `Cancel` (secondary, disabled while deleting) + `Delete` / `Delete Case` (danger, `loading={isDeleting}`).

Route logic (`handleDeleteConfirm`): captures `deleteState` up front, guards re-entry with a **synchronous ref** `isDeletePending`, clears the current case/location from the Zustand store if the deleted entity is the one being edited, calls `deleteCase` / `deleteLocation`, `await refresh()`, and only then shows the success Toast (so a failed refresh doesn't read as success). `finally` always resets the ref, `isDeleting`, and `deleteState`.

#### `DuplicateLocationModal` — the long-press six-action chooser

`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/components/DuplicateLocationModal.tsx`

Opened by long-pressing a location row. Route handler `handleLocationLongPress` first fires `Haptics.impactAsync(Medium)`, fetches the source `Location` via `getLocationById`, fetches all siblings via `getLocationsByCase`, and computes `suggestedName = generateCopyName(source.locationName, existingNames)` → `"X - Copy"`, `"X - Copy (2)"`, …

Glass pageSheet. Header "Duplicate Location" / "Enter a name for the duplicate location." Body:

- **Location Name** text input, seeded with the pre-deduped suggestion. **No autoFocus** (deliberate — the modal is a chooser first; auto-focus raised the keyboard over the buttons). Live validation: `isLocationNameTaken(name, existingNames)` (trimmed, case-insensitive) → inline error "A location with this name already exists in this case".
- Section 1 (the two name-consuming actions, disabled when the name is empty or taken):
  - `Duplicate Location` → `onDuplicate(name, 'submission-only')`
  - `Duplicate Location with Scopes` → `onDuplicate(name, 'with-scopes')`
- Section 2, caption **"Copy info to a new address"** (these **ignore** the name field and are never disabled):
  - `New Location w/ Sub Info` → `onNewAddress('submission-only')`
  - `New Location w/ Sub Info + Scopes` → `onNewAddress('with-scopes')`
- Section 3, caption **"Export this location"** (rendered only when both callbacks are supplied):
  - `Export ZIP` → route's `handleExportZipAction`
  - `Export GeoJSON` → route's `handleExportGeoJSONAction`
- `Cancel` (secondary).

Behaviours behind each:

- **Duplicate** → `duplicateLocation(sourceId, name, mode)` (`.../services/duplicate-location-service.ts`): copies address/contact/coordinates/requester fields; `with-scopes` also clones requested scopes with regenerated UUIDs; sets `duplicated_from = sourceId`. Then `refresh()` + Toast `"{name} created."` / `"created with scopes."`. A `DuplicateLocationNameError` race gets its own friendly Toast.
- **New address** → closes the chooser and opens a **second, pre-populated `NewLocationModal`** with `requireAddress`, `subtitle="Submission info copied — enter the new address."`, and `initialValues` = default name (`ensureUniqueLocationName('New Location', existingNames)`) + the source's `locationContact`, `locationPhone`, and all five requester fields. On submit → `duplicateToNewAddress(sourceId, overrides, mode)`; `duplicated_from` is **not** set (independent scene). Then sync-notify → set case/location context → `loadLocationIntoForm` → close → Toast → `router.navigate('/(form)/submission')`.
- **Export ZIP / GeoJSON** — see the export-flow section; the route sets `pendingExportRef.current = 'zip' | 'geojson'` and `setExportTarget({caseId, locationId})`, closes the chooser, and an effect dispatches `handleExportLocationZip()` / `handleExportLocationGeoJSON()` on the next render (the hook's closures need the new ids first). `exportTarget` is deliberately never auto-cleared.

#### `NewLocationModal`

`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/components/NewLocationModal.tsx`

Glass pageSheet, `KeyboardAwareScrollView`. Header "New Location" + optional `subtitle`.

Fields, in order:
1. **Location Name** — required, controlled `value`. Live duplicate check against `existingNames` → inline error.
2. `<LocationForm>` from `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/location/components/LocationForm.tsx`:
   - **Business/Location Name** (with Mapbox `AddressAutocomplete`)
   - **Street Address**
   - **City**
   - **`GpsCaptureControl` labelled "Use Current Location"** (`.../src/features/location/components/GpsCaptureControl.tsx`) — multi-sample GPS capture + optional reverse-geocode, then `CoordinateDisplay` showing lat/lng, accuracy in metres, and a source chip (`gps|manual|geocoded`).
   - Every change funnels through `handleLocationChange`, which also **auto-derives** `formData.address` via `formatAddress(businessName, streetAddress, city)` (`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/lib/utils/address-formatting.ts`).
3. **Location Contact**
4. **Location Phone** (`keyboardType="phone-pad"`)

Submit is disabled while `isSubmitting`, or the name is blank/taken, or (`requireAddress` mode) the street address is blank. `validateForm()` re-checks all of that. Errors from `onSubmit` are caught into a red error banner at the top of the scroll view; the modal stays open.

Route `handleCreateLocation`: `createLocation(input)` → `onSaveComplete()` (sync fire-and-forget) → `setCurrentCase` / `setCurrentLocation` → `loadLocationIntoForm` → close modal → success Toast → `router.navigate('/(form)/submission')`. A `DuplicateLocationNameError` is **rethrown** so the modal shows its banner rather than a toast.

Sibling names are fetched fresh from SQLite in `handleAddLocation` (`getLocationsByCase`), falling back to the in-memory paginated list on read failure.

#### Cases-route error mapping

`getErrorMessage(error)` maps technical messages to operator-safe copy: sqlite/constraint → "Unable to complete operation due to data dependencies. Please contact support."; enoent/file-not-found → "File not found. The data may have been removed."; network/timeout → "Network error…"; default → "An error occurred. Please try again or contact support." `ValidationError` messages are surfaced verbatim (they're user-actionable).

`newlyCreatedCaseId` is cleared 100 ms after being set, so the auto-expand only applies to the first render after creation.

**Web-demo notes:**
- Mock: SQLite CRUD (`createCase`, `createLocation`, `deleteCase`, `deleteLocation`, `duplicateLocation`, `duplicateToNewAddress`, `getLocationById`, `getLocationsByCase`), the Zustand form store, `onSaveComplete()` (Supabase sync — no-op), `expo-haptics`, toasts.
- Swipe-to-delete: on web, either implement pointer-drag reveal or substitute a hover/right-click "Delete" affordance — but keep the *rule* that an expanded case card can't be swipe-deleted.
- GPS capture inside `NewLocationModal` needs `navigator.geolocation` or canned coordinates; the reverse-geocode step needs a Mapbox token or a stub.
- The import buttons/modals exist here but belong to the import agent — render the `Import` button, delegate its behaviour.

---

### Map tab (route level) — `app/(tabs)/map.tsx`

**File:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/(tabs)/map.tsx`
*(Map internals — `MapHost`, bottom sheet, GeoJSON layers, clustering — are the map-view agent's; only the route shell is documented here.)*

Three **mutually exclusive** render states, deliberately *not* a two-branch ternary:

| state | renders |
|---|---|
| `mapViewerCaseId === null` | `<Screen>` + `<MapPicker>` (in-screen, tab bar reachable) |
| case set **and** `useIsFocused()` | full-bleed `<View>` + `<MapHost key={caseId} …>` (MapHost applies its own safe-area insets, so it must NOT be wrapped in `<Screen safeArea>`) |
| case set **and** blurred | **nothing** (so the picker never mounts on a hidden tab) |

Route-local state:
- `mapViewerCaseId` — tab-local; **never written to the form store** (viewing ≠ editing).
- `lastViewedCaseId` — survives "Change Case" so the picker can highlight the case you just left; with no Cancel button, tapping that highlighted row is how you return.
- `editingCase`, `mapReloadToken`.
- `currentCaseId` is read from the form store **only** as a courtesy pre-selection.

Callbacks from `MapHost`: `onChangeCaseRequest` (clears `mapViewerCaseId`), `onEditCase(caseId)` (fetches the full case via `getCaseById` → opens `EditIncidentLocationModal`; a failed fetch toasts instead of opening an empty modal), `onExportMap` → `exportFlow.handleExportCaseMap`.

#### `MapPicker`

`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/components/MapPicker.tsx`

Owns its own `useCases()` (deliberately NOT lifted to the route — `MapHost` is un-memoized and would re-render on every hook transition) plus `useFocusEffect(refresh)`.

- Gradient header: "Pick a Case" / "Select which case you'd like to view on the map."
- States, in strict order: `!hasLoaded` → spinner + "Loading cases…" (`testID="map-picker-loading"`); `cases.length === 0 && error` → "Couldn't load cases" + the error string + a Retry button (`map-picker-error`); `cases.length === 0` → "No cases yet" / "Create a case from the Cases tab to get started." (`map-picker-empty`); otherwise the list.
- Populated list + `error` → a **stale-data banner** (BUG-037): "Couldn't refresh — showing the last loaded list." + small Retry. The list survives.
- Row (`map-picker-row-<id>`): optional `GlassDot` (variant `complete` for COMPLETE/ARCHIVED; **no dot** for DRAFT), case number, optional display name, `"{n} location|locations"`. The preselected row gets `borderLeftWidth: 4`, `borderColor: colors.primary`, primary-tinted title, and `accessibilityState.selected`.
- Pull-to-refresh + `onEndReached → loadMore` + spinner footer while `isLoading`.

#### `EditIncidentLocationModal`

`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/components/EditIncidentLocationModal.tsx`

Incident-**only** editor (full-record editing lives on the dashboard long-press sheet). Same glass pageSheet chrome as `NewCaseModal`: header "Edit Incident Location", error banner, `<IncidentLocationForm>`, footer `Cancel` / `Save Changes` (`loading` while submitting).

- Seeds once via `caseToIncidentValues(initialCase)` (`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/utils/incident-location-mapping.ts`); the parent conditionally mounts it so the seed-once initializer captures the right case.
- Submits `incidentValuesToFields(values)` — **only** the incident fields — so `updateCase` touches nothing else.
- Reverse-geocode failures surface in the banner via `onReverseGeocodeError`.
- Parent: on success bumps `mapReloadToken` (MapHost re-fetches in place; the key is `caseId`, not the token, so the camera/sheet don't reset) and Toasts `"{caseNumber} updated"`.

`IncidentLocationForm` (`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/location/components/IncidentLocationForm.tsx`) fields: **Business / Scene Name**, **Street Address**, **City**, GPS control labelled **"Use Current Location (Highest Accuracy)"**, plus manual **Latitude** / **Longitude** inputs (these two use `onEndEditing`, not `onChangeText` — controlled number inputs break decimal typing).

#### Standalone Export Map

`useExportFlow(mapViewerCaseId, null)` → `handleExportCaseMap` (Face ID → password policy → `exportAndShareCaseMapHtml`). The route mounts only the `<PasswordModal>` for it (no `ExportModal` — the case-map export is sub-second and has no stages).

**Web-demo notes:**
- The picker is pure list UI — fully reproducible.
- `MapHost` needs Mapbox GL JS on web (or a static map placeholder); the mount/unmount-on-focus dance exists purely to reclaim native GL memory and can be dropped.
- The incident editor needs geolocation + a reverse-geocode stub.
- Keep the three-state render rule: it's the documented BUG-034/§3.4 behaviour.

---

### Export tab — `app/(tabs)/export.tsx`

**File:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/(tabs)/export.tsx`

Purpose: pick a case, tick the locations you want, and export — the route decides *which of three ZIP pipelines* runs from the shape of the selection.

Data: `useCases()` (all statuses — "an archived case is exactly what a records request asks for") + `useFocusEffect(refresh)`.

Selection state (tab-local, never persisted):

```ts
interface ExportSelection {
  caseId: UUID
  locationIds: ReadonlySet<UUID>
  armedFullCase: boolean      // true ONLY when set via the case-level checkbox
}
```

Rules (all in `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/export-hub/types.ts` + the route):
- **One case at a time.** Toggling a location in a different case *replaces* the whole selection.
- Any location-level toggle sets `armedFullCase: false`, even if it happens to complete the set.
- The case checkbox is tri-state: none/some → select-all + `armedFullCase: true`; all → clear (selection becomes `null`).
- An emptied set becomes `null`, never an empty `Set`.
- A `useEffect` **prunes** the selection against refreshed data: dropped location ids leave the set; an emptied set or a vanished case clears it; `armedFullCase` survives only while the set still covers all of the armed case's current locations.

Dispatch (`handleExportPress`), using the shared predicate `isFullCaseSelection(selection, totalLocations)` (`armedFullCase || (size === total && total > 1)`):

| condition | handler | artifact |
|---|---|---|
| full-case selection | `handleExportZip()` | canonical **case ZIP**, manifest v2.1, **includes Case Map** |
| exactly 1 selected (by row gesture) | `handleExportLocationZip()` | flat **location ZIP**, manifest v2.2 (byte-identical to the long-press export) |
| 2 ≤ k < N | `handleExportSubsetZip([...ids])` | **subset ZIP**, manifest v2.3, partial-self-declaring |

Two LOUD backstops before dispatch: no selection, or the armed case missing from the list → `logError` + an `Alert` ("No locations are selected…", "The selected case is no longer available…"). On an evidence app a silently dead CTA reads as success.

The hook is fed `useExportFlow(selection?.caseId ?? null, singleSelectedLocationId)` where `singleSelectedLocationId` is non-null only when exactly one location is selected.

#### `ExportHub`

`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/export-hub/components/ExportHub.tsx`

Five screen states, in this precedence: `!hasLoaded` → spinner; `cases.length===0 && error` → "Couldn't load cases. {error}" + Retry (`export-hub-error`); `cases.length===0` → "No cases to export" (`export-hub-empty`); populated + `error` → stale banner "Couldn't refresh — showing the last loaded list." + Retry (`export-hub-error-banner`); populated → the list.

- **Single-open accordion** coordinated at hub level: exactly one case card may be expanded. Arming a new case auto-expands it (ref-guarded so mounting *with* a selection does not auto-expand). `expandedId` is validated against the current `cases` at render (a stale id would leave every card dimmed with none lit).
- Above the list, when a selection exists: a right-aligned mono **echo** of the armed case number.
- **Pre-flight footer** (`export-footer`), gradient `glass.header`, appears when `selection && armedCase`, entering with a 220 ms `translateY 12 → 0` (transform only — no test-visible state depends on the animation):
  - **Artifact line** (mono, 11px, letterspaced):
    - full case → `CASE ZIP · CANONICAL · INCLUDES CASE MAP` (green)
    - single → `LOCATION ZIP · SINGLE LOCATION` (secondary grey)
    - subset → `SUBSET ZIP · PARTIAL · {k} OF {n}` (amber)
  - Info row: case number, `"{k} of {n} location|locations selected"`, and a ghost **Clear** button (`export-clear`).
  - Full-width CTA (`export-cta`), disabled while exporting, labelled:
    - `Export Full Case ({n} location|locations)`
    - `Export 1 Location`
    - `Export {k} of {n} Locations`

Frozen `TEST_IDS`: `export-hub`, `export-hub-empty`, `export-hub-error`, `export-hub-error-banner`, `export-hub-retry`, `export-case-card-<id>`, `export-case-checkbox-<id>`, `export-location-row-<id>`, `export-location-checkbox-<id>`, `export-footer`, `export-cta`, `export-clear`.

#### `ExportCaseCard`

`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/export-hub/components/ExportCaseCard.tsx`

- Header row = a **tri-state `Checkbox`** (`value=allSelected`, `indeterminate=someSelected`, disabled while exporting or when the case has no locations) as a **sibling** of the expand `Pressable` (so VoiceOver focuses it independently and a disabled checkbox press can't fall through to expand).
- Expand pressable: case number (`lg` bold), optional display name, right column with `CaseStatusBadge` + location count, then a `▾`/`▸` chevron.
- **Emphasis follows the open card**: expanded → `glass.elevated` gradient, `colors.primaryLight` border, primary-tinted glow shadow; all other cards get `opacity: 0.5` while any card is open (still fully interactive). Shadow lives on an opaque wrapper (iOS clips a layer's own shadow under `overflow:hidden`).
- Body: one `ExportLocationRow` per location, entering with a 160 ms `translateY 6 → 0`. Empty case → italic "No locations — nothing exportable".
- Memo comparator includes a **location content key** (`locations.map(l => l.updatedAt).join('|')`) because a location edit bumps only `locations.updated_at`, never the case row.

#### `ExportLocationRow`

`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/export-hub/components/ExportLocationRow.tsx`

Borderless ledger row with a hairline bottom separator, `minHeight = Layout.touchTarget.medium`. Left: a 22px circular indicator — filled `colors.primary` with a white `✓` when selected, otherwise a hollow `colors.textTertiary` ring. The **row** is the single accessible control (`accessibilityRole="checkbox"`, `accessibilityState={{checked, disabled}}`, label `Select {locationName}`); the indicator is `pointerEvents="none"` + hidden from a11y so exactly one haptic (`Haptics.impactAsync(Light)`) fires per toggle. Body: location name + 1-line address. Trailing: `CaseStatusBadge size="small"`.

**Web-demo notes:**
- Mock: `useCases` reads, `expo-haptics`, and the three export services.
- The selection state machine (one-case rule, `armedFullCase`, prune-on-refresh, `isFullCaseSelection`) is pure TypeScript — port it verbatim; it's the most testable and most demo-worthy logic in the tab.
- The footer's artifact-line strings are contract strings — keep byte-exact.

---

### `NewCaseModal` (create **and** edit)

**File:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/components/NewCaseModal.tsx`

Discriminated union props — `{mode?: 'create'; initialCase?: never}` | `{mode: 'edit'; initialCase: Case}`, so `{mode:'edit'}` without a case is a compile error.

Glass pageSheet (`animationType="slide"`), `GridBackground` (no scan-line), gradient header titled **"New Case"** / **"Edit Case"**, `KeyboardAwareScrollView` (`bottomOffset={40}`, `keyboardShouldPersistTaps="handled"`).

Fields in order:

| field | required | notes |
|---|---|---|
| **Case Number** | ✔ | placeholder `OCC2025-001`. **Read-only in edit mode** (`editable={false}`, `opacity 0.6`, helper "Case number cannot be changed") because `directory_name` is derived from it at creation and is immutable |
| **Display Name** | – | "Friendly name for case" |
| **Unit** | ✔ | "Investigation unit (e.g., Homicide, Robbery)" |
| **Officer in Charge** section | – | collapsible, `defaultCollapsed` — **OIC Name**, **OIC Badge** |
| **Video/Canvas Coordinator** section | – | collapsible, `defaultCollapsed` — **Coordinator Name**, **Coordinator Badge** |
| **Incident Location** section | – | collapsible (starts open) — hosts `<IncidentLocationForm>` (business/scene name, street, city, "Use Current Location (Highest Accuracy)" GPS, manual lat/long) |
| **Notes** | – | multiline, 4 rows |

Text-input convention (load-bearing): every field uses `defaultValue` + **`onChangeText`**, never `onEndEditing`. `onEndEditing` fires on blur, and pressing Save while a field is still focused loses that field's value (this bit the VC badge). The exception is the manual lat/long inside `IncidentLocationForm`, which intentionally stays on `onEndEditing`.

Validation (`validateForm`): `caseNumber` non-blank ("Case number is required") and `metadata.unit` non-blank ("Unit is required"). The submit button is *also* live-disabled on those two.

Submit path:
1. Trim every string; merge `incidentValuesToFields(incidentValues)` (derives the formatted `incidentAddress` and coordinates).
2. **Create mode only** — an `Alert.alert('Confirm Case Number', 'The case number "X" can\'t be changed after the case is created. Everything else can be edited later.', [Cancel, Create Case])`. Only on accept does the create run.
3. `performSubmit` → `onSubmit(trimmedData)`; on success resets the form (create only — edit unmounts) and calls `onClose`.
4. On error → red banner. `DuplicateCaseNumberError` gets a friendlier message: `"{error.message}. Open the existing case or enter a different number."`
5. Reverse-geocode failures from `IncidentLocationForm` route into the same banner via `onReverseGeocodeError`.

Footer: `Cancel` (secondary) + `Create Case` / `Save Changes` (primary, `loading={isSubmitting}`).

testIDs: `case-number-input`, `display-name-input`, `unit-input`, `oic-section`, `oic-name-input`, `oic-badge-input`, `vc-section`, `vc-name-input`, `vc-badge-input`, `incident-location-section`, `incident-location-form`, `notes-input`, `new-case-modal-cancel`, `new-case-modal-submit`.

Creation service (`createCase` in `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/services/case-service.ts`): generates a UUID, derives a sanitized immutable `directoryName` from `caseNumber`, creates the on-disk case directory, INSERTs into `cases`. `case_number` is `UNIQUE` — a collision surfaces as `DuplicateCaseNumberError` (narrowed from `ConstraintViolationError` by `(table, column)` in `wrapDatabaseError`).

**Web-demo notes:**
- Mock: `createCase` / `updateCase` (with a uniqueness check on case number so the duplicate banner is demonstrable), filesystem directory creation (no-op), GPS + Mapbox reverse geocode.
- The `Alert.alert` confirm on create is a native alert → a small confirm dialog on web.
- Collapsible `FormSection` = `<details>` or an animated height container.

---

### Export flow engine — `useExportFlow` + `ExportModal` + `PasswordModal`

**Files:**
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/hooks/useExportFlow.ts`
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/components/export/ExportModal.tsx`
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/export-security/components/PasswordModal.tsx`
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/export-security/services/resolve-password.ts`
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/biometrics/hooks/useProtectedExport.ts`

**Operator policy: any data leaving the phone passes Face ID + encryption.** Never call an export service directly from UI — a direct call skips the gate. Three routes consume this hook: `cases.tsx` (location ZIP / GeoJSON), `export.tsx` (case / subset / location ZIP), `map.tsx` (case map), plus the completion screen (another agent).

`const flow = useExportFlow(caseId | null, locationId | null)` returns:

```
exportStage: 'idle'|'validating'|'generating'|'zipping'|'sharing'
validationResult: CasePdfValidationResult | null
showValidationModal, exportProgress {current,total}, currentLocationName, isExporting
handleExportZip / handleExportLocationZip / handleExportSubsetZip(ids)
handleExportLocationGeoJSON / handleExportCaseMap
handleValidationContinue / handleValidationCancel
showPasswordModal, defaultPasswordForModal, handlePasswordSubmit, handlePasswordCancel
```

`ExportType = 'case' | 'location' | 'location-geojson' | 'case-map' | 'case-subset'`.

#### Gate sequence

1. **Entry guard** — `if (isExporting || pendingExportType) return`.
2. **Missing target alerts** — "No Case Selected" / "No Location Selected".
3. **Validation** (case + subset only): `validateLocationsForPdf(caseId)` / `validateLocationSubsetForPdf(caseId, ids)`. If `!allValid`, the validation modal opens and `pendingValidatedExport` is armed to `'case'` or `'case-subset'` — never hardcoded, because a `'case'` hardcode after a subset validation would silently escalate scope. Default is `null` so an unarmed Continue is inert.
4. **Password resolution** — `resolvePassword(exportType)` derives the flag from the type: `case|location|case-subset` → `zipEncryptionEnabled`; `location-geojson|case-map` → `singleFileEncryptionEnabled`. Then `resolvePasswordPolicy(enabled, promptMode)`:
   - `!enabled` → `{type:'none'}`
   - `promptMode === 'auto'` + a saved default → `{type:'password', value}`
   - otherwise → `{type:'prompt'}` → `getDefaultPassword()` seeds the modal, `pendingExportType` is stashed, `showPasswordModal = true`.
5. **`executeExport(type, password, subsetIds?)`** wraps the service in `executeProtectedExport(fn, 'export_zip')` (Face ID / Touch ID when `exportProtectionEnabled` **and** the device has enrolled hardware). Auth cancel → `null` return, silent. Auth failure → `Alert('Authentication Required', …)`.
6. Progress/stage callbacks (`onProgress`, `onStageChange`) drive `exportProgress` / `exportStage`; `AccessibilityInfo.announceForAccessibility` fires on success.
7. `finally { resetExportState() }` always returns to `idle`.

Subset ids **travel as an argument** on the straight-through path; `pendingSubsetLocationIds` state exists only to survive the password/validation modal round-trips (state written this tick is invisible to this render's closures).

#### Result alert taxonomy (never a bare "Success" when the archive is incomplete)

Per export type, composed from independent caveats:

- `shareWarning` present → **"Export Complete (Not Shared)"** — the ZIP was written but never left the phone (BUG-013). Also folds in PDF/geojson/case-map notes.
- PDF failures → **"Export Complete (Partial)"** / **"Export Complete (No PDF)"** with `{success} PDF(s) generated. {failed} PDF(s) could not be generated.`
- `geojsonFailures` → `Map data (.geojson) could not be generated for: {names}.`
- `caseMapFailed` → `The interactive Case Map could not be generated and is missing from the ZIP.` (DEF-015)
- All clean → `Success` / `Case exported successfully with PDF notes{ (encrypted)}.` (subset uses `{included} of {totalInCase} locations`, sourced from the service's own count, never the validator's).
- Any throw → `Alert('Export Error', getUserFriendlyMessage(error))`.

#### `ExportModal` (one modal, three modes)

Unified because two RN modals can't transition simultaneously. Mode is computed identically in all three routes:

```ts
mode = showValidationModal && validationResult && !validationResult.allValid ? 'validation'
     : exportStage !== 'idle'                                                ? 'progress'
     : 'hidden'
```

- **progress**: full-screen dim overlay, large spinner, a stage message from `STAGE_MESSAGES` — `validating → "Validating locations..."`, `generating → "Generating PDFs..."`, `zipping → "Creating ZIP archive..."`, `sharing → "Opening share dialog..."` — plus, during `generating` only, `Location {current} of {total}` and the quoted current location name. Not dismissible (Android back is swallowed).
- **validation**: centered card, `warning` (amber) or `alert-circle` (red) 48px icon. Title "Some Locations Missing PDF Data" or, when *every* location is invalid, "All Locations Missing PDF Data". A scrollable (`maxHeight: 200`) bulleted list of invalid locations, each with `- Missing: {field}` lines. Summary: `"{valid} of {total} locations will include PDF notes."` or "The ZIP will be created without any PDF notes." Buttons `Cancel` / `Continue` (or `Export Anyway` when all invalid). Overlay tap cancels unless exporting. Announces to screen readers on appear.

The missing-field strings come from `validateLocationForPdf`: `'Case number'`, `'At least one extraction scope with start and end times'`, `'Completion date'`, `'Completed by'`, or `'Location data is corrupted or missing'`.

#### `PasswordModal`

Glass centered dialog (85% width, max 380). Title "Encryption Password" + close ✕. Contents:
- Password `TextInput` (`secureTextEntry` unless toggled), placeholder "Minimum 8 characters", with an eye/eye-off toggle. Submit on keyboard "done".
- Validation hint "Minimum 8 characters" appears only when `0 < length < 8`. `MIN_PASSWORD_LENGTH = 8`.
- "Save as default password" checkbox — **checked by default**.
- Amber lock warning: "Password cannot be recovered. If you forget the password, the encrypted file cannot be opened."
- Buttons: `Cancel` (outline) and a gradient `Export` with a shield icon, disabled (opacity .5) until ≥8 chars.
- State resets every time `visible` flips true, seeded from `defaultPassword`.

On submit the hook saves the default if requested (`saveDefaultPassword` → secure store); a failed save produces a **non-blocking** toast ("Couldn't save the default password / The export will continue…") and never blocks the export (BUG-015). Then it resumes the pended export.

`ExportActionSheet` also exists at `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/components/export/ExportActionSheet.tsx` (driven by `showExportSheet`), but **none of the four tab routes mount it** — it belongs to the completion screen.

**Web-demo notes:**
- Mock Face ID entirely — either skip the gate or show a fake "Authenticate to export" dialog with Approve/Cancel; the cancel path (`protectedResult === null`, silent return) is worth demonstrating.
- Password policy (`off` / `auto`+saved / `prompt`) is pure logic — port it. Secure-store → `localStorage` (label it as a demo-only stand-in).
- The stage machine + progress modal is pure UI over callbacks — drive it from a fake async pipeline with timed stage transitions.
- Keep the alert taxonomy; the "Export Complete (Not Shared)" and "(Partial)" branches are the chain-of-custody story.

---

### ZIP export services — end to end

**File:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/services/pdf-export-service.ts` (1703 lines)

Shared helper `createExportZip(sourceDir, baseName, manifest, password?, strength?)`:
1. Local wall-clock timestamp `YYYY-MM-DD HH-MM-SS` (operator local time, space instead of `T`, hyphens instead of colons).
2. `zipFileName = ${sanitizeFilename(baseName)}-${timestamp}.zip`, written under `{DocumentDirectory}/cctv-app/exports/`.
3. Writes the manifest into the source dir (`export-manifest.json`, or `location-manifest.json` for a location export).
4. `zipWithPassword(dir, zipPath, password, toEncryptionMethod(strength))` when a password exists, else plain `zip(dir, zipPath)`.
5. `finally` deletes the manifest; a cleanup failure is non-fatal but **logged** (an orphan manifest would be swept into every future export — BUG-014).

Encryption method resolution (`toEncryptionMethod` in `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/services/encrypted-share.ts`): `ZipEncryptionStrength ∈ {'STANDARD','AES-128','AES-256'}`, **floored to AES-256** for anything missing or unrecognized (the native lib silently downgrades unknown methods to ZipCrypto — the worst failure mode for a forensic export). A compile-time guard ties the union to the library's `EncryptionMethods`.

#### `exportCaseAsZipWithPdfs(caseId, options)` — the canonical case ZIP

Stages: `validating → generating → zipping` (+ `sharing` in the share wrapper).

1. `saveFormToLocation(true)` — flushes current Zustand state to SQLite so the export reads fresh data.
2. `getCaseWithLocations(caseId)`; abort with "Case not found".
3. `validateLocationsForPdfInternal(caseData)` → valid/invalid split.
4. `generateAllLocationPdfsInternal` — **sequential**, never parallel (expo-print concurrency crashes). Each location gets `<name>.pdf` in `documents/`, plus an optional time-offset calibration PDF when `timeDifference` exists. Progress callbacks throttled to 100 ms.
5. **Per-location GeoJSON injection**: `writeLocationGeoJSON(caseData, location)` regenerates `documents/<locationDir>.geojson`. Best-effort per location — a failure pushes the location name into `geojsonFailures` and continues. An unplottable location returns `null` and is skipped silently.
6. **Case Map injection**: `writeCaseMapHtml(caseId, caseDirectoryName)` writes `map/Case Map.html`. Best-effort by contract; failure sets `caseMapFailed` (threaded to the result, not just logged).
7. Manifest `CaseExportManifest` — `exportVersion: '2.1'`, `exportedAt`, the whole `caseData`, the option flags, and `pdfGeneration: {generated, failed}`.
8. ZIP base name = `caseDirectoryName` + `-{truncated displayName (80 chars)}` when a display name exists (guards the 255-byte filename limit).
9. Zips the **case directory wholesale**, so everything written under it is captured.

`exportAndShareCaseWithPdfs` wraps it: `Sharing.isAvailableAsync()` → `Sharing.shareAsync(filePath, {mimeType:'application/zip', dialogTitle:'Export Case'})`; unavailable or throwing → returns `shareWarning` rather than a silent success.

#### `exportLocationAsZipWithPdf(locationId, options)` — flat location ZIP

Same shape but scoped to one location directory. Manifest `LocationExportManifest` — `exportVersion: '2.2'`, `exportType: 'location'`, case number + case directory name, the location's `{id, locationName, directoryName, status, formData, coordinates}`, and a `pdfGeneration` block naming the generated `caseNotesPdf` / `timeOffsetPdf`. Base name = the location's `directoryName`.

#### `exportLocationSubsetAsZipWithPdfs(caseId, locationIds, options)` — subset ZIP (v2.3)

- Copies each selected location directory into an isolated staging folder `{temp}/subset-<8hex>/` and zips **the folder** (a string source — iOS emits real AES only for folder/string sources). Any copy failure **aborts** the export (a subset ZIP missing a selected location is worse than no ZIP).
- Manifest `CaseSubsetExportManifest` — `exportVersion: '2.3'`, `exportType: 'case-subset'`, case number/dir/display name/metadata, `includedLocations[]`, **`totalLocationsInCase`** and **`omittedLocationCount`** (computed from the pre-subset fetch, not the spread), `pdfGeneration`.
- Filename self-declares the partial: `{caseDir}-partial-{k}of{n}[-{displayName}]-{timestamp}.zip`.
- Returns `subsetSummary {included, totalLocationsInCase}` — the *only* source for the operator-facing "K of N" copy.
- `finally` deletes the staging dir (best-effort; the temp sweeper is the backstop).

#### `exportAndShareLocationGeoJSON(locationId, {password?, encryptionStrength?})`

Loads location + its case, writes the canonical `documents/<locationDir>.geojson`. With a password, `stageAndZipSingleFile` stages the one artifact into an isolated temp folder and AES-zips it to `exports/<locationDir>-geojson.zip`, and the **zip** is shared; without one, the raw `.geojson` is shared. Friendly failures: `'Location not found'`, `'No locations with coordinates found'`.

#### On-disk layout the exports mirror

```
{DocumentDirectory}/cctv-app/
├── cases/{caseDirectoryName}/
│   ├── map/Case Map.html
│   └── {locationDirectoryName}/
│       ├── images/{Camera,Offset-OCR}/   video/   audio/
│       └── documents/  (PDFs + <locationDir>.geojson)
├── exports/{base}-{YYYY-MM-DD HH-MM-SS}.zip
├── backups/
└── temp/
```
Subdirectories are created **on demand** — an exported location contains only the folders that actually hold files. `directory_name` is immutable: renaming a case or location never renames its folder.

**Web-demo notes:**
- Mock: `expo-file-system` (a virtual FS object), `react-native-zip-archive` (`zip` / `zipWithPassword` → JSZip in the browser, which supports real ZIPs but **not** AES — say so, or just simulate), `expo-sharing` (→ a blob download or Web Share API), `expo-print` (→ a canned PDF blob or an HTML preview).
- Everything worth demoing is the *staging + naming + manifest* logic, which is pure: timestamped filenames, the three manifest shapes/versions, the partial filename marker, the caveat composition. Port those verbatim.
- Keep the **sequential** PDF loop so the progress modal has something to count.

---

### Case Map export sub-feature

**Files:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/case-map-export/` (`README.md`, `services/case-map-export-service.ts`, `template/case-map.template.ts`, `prototype/`, `scripts/build-template.mjs`)

What the user chooses:
- **Nothing, on the case ZIP path** — `writeCaseMapHtml()` runs automatically inside `exportCaseAsZipWithPdfs`, writing `map/Case Map.html` into the case dir before zipping. Best-effort; a failure surfaces in the result alert as "The interactive Case Map could not be generated and is missing from the ZIP."
- **"Export Map"** on the map tab's bottom-sheet footer → `useExportFlow.handleExportCaseMap` → Face ID → single-file encryption policy → `exportAndShareCaseMapHtml(caseId, {password?, encryptionStrength?})`. With a password the HTML ships inside an AES ZIP; without one the raw `.html` is shared. Sub-second — no progress modal, only the `PasswordModal` and a `Success` / `Export Complete (Not Shared)` alert.

What the artifact is: **one self-contained HTML file**. `generateCaseGeoJSON(caseId)` (the same canonical projection as the GeoJSON export) plus `buildCaseMapMeta(caseData)` are injected into three tokens — `__CASE_GEOJSON__`, `__CASE_META__`, `__MAPBOX_TOKEN__` — using function replacers so `$`/`$&`/`$1` inside JSON can't be misread as replace patterns. The page contains: clustered location pins colored by recovery status (started amber / working cyan / complete green), a pulsing incident teardrop, geolocated camera markers, a searchable/filterable/sortable site sidebar, a DVR-Time-vs-Real-Time scope timeline on a clock axis, per-feature popups exposing the full exportable field set, a 6-style basemap picker (default Satellite Streets), and a declutter "View" panel persisted per case in `localStorage`.

Token: resolved from `options.mapboxToken` → `process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`. No committed literal. If absent, the data still renders and only the basemap is blank; the service logs `context: 'case-map-token-absent'`.

**Web-demo notes:**
- This one is *already a web page* — the closest thing to a free win. `buildCaseMapHtml(geojson, meta, token)` is pure; drop the built template string in and open it in an iframe/new tab.
- Needs network for Mapbox GL JS + tiles + Google Fonts; the case data itself is embedded and offline-complete.
- The only native bits are `expo-file-system` (write) and `expo-sharing` (share) — on web, `Blob` + object URL.

---

### Native-dependency summary for this section

| Native module | Used by | Web substitute |
|---|---|---|
| `expo-sqlite` (+SQLCipher, `expo-secure-store` key) | every list/CRUD surface | IndexedDB / in-memory store; skip encryption-at-rest, note it |
| `expo-file-system` | export staging, media paths, case-map write | virtual FS object |
| `react-native-zip-archive` (`zip`, `zipWithPassword`) | all three ZIP pipelines | JSZip (no AES) — simulate or label |
| `expo-sharing` | every "and share" export | Web Share API / anchor download |
| `expo-print` | PDF generation inside exports | canned PDF blob or HTML preview |
| `expo-local-authentication` (via `useProtectedExport`) | every export gate | fake auth dialog |
| `expo-location` + Mapbox geocoding | `NewLocationModal`, `IncidentLocationForm` | `navigator.geolocation` + stubbed geocode |
| `@rnmapbox/maps` | Map tab `MapHost` only | Mapbox GL JS or static placeholder |
| `expo-haptics` (`safeImpactAsync`) | long-press, swipe-open, export row toggle | no-op / `navigator.vibrate` |
| `react-native-reanimated` + `react-native-gesture-handler` (`ReanimatedSwipeable`) | timeline entrance, card expand, swipe-to-delete, hub/footer rises | CSS transitions + pointer-drag or a hover delete affordance |
| `expo-linear-gradient` | all glass surfaces | CSS `linear-gradient` |
| `react-native-toast-message`, `Alert.alert`, `AccessibilityInfo` | feedback everywhere | toast lib + confirm dialogs + ARIA live regions |


---

## 2. Form Wizard — Drawer Chrome + Screens 1-7

Scope: `app/(form)/_layout.tsx` (drawer chrome + save wrappers) and wizard steps 1-7
(`submission`, `requested-scope`, `arrival-departure`, `time-offset`, `ocr-capture` route layer,
`dvr-information`, `cameras`). All paths absolute.

---

### 2.0 Shared foundations (read this first — every screen depends on it)

#### Store: one Zustand store, 12 slices, SQLite is source of truth

- Store: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/lib/store/index.ts`
- Slice interfaces: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/lib/store/types.ts`
- Initial values: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/lib/store/initial-state.ts`
- Slices dir: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/lib/store/slices/`

Shared actions (all of them call `markDirty()`):

| Action | Signature | Notes |
|---|---|---|
| `updateField` | `(field, value)` | single key `set()`; on throw → `setGlobalError({code:'UPDATE_ERROR'})` |
| `updateFieldSafe` | `(field, value, validator?)` | throws `ValidationError` if validator fails; writes per-field `errors[field]` |
| `batchUpdate` | `(updates: Partial<FormState>)` | **rejects any `undefined` value** (`ValidationError: Cannot set X to undefined`), rolls back to previous state on error and rethrows |
| `updateArrayItem` | `(arrayField, index, updates)` | bounds-checked; shallow-merges into a copied array |
| `resetForm` | `()` | reloads `getInitialState()` (fresh UUIDs), resets `isDirty=false`, `saveStatus='idle'` |

Persistence slice (`/Users/fvadev/.../src/lib/store/slices/persistence.slice.ts`):
`isDirty`, `dirtyGeneration` (monotonic counter bumped on every `markDirty`), `lastSaveTimestamp`,
`saveStatus: 'idle'|'saving'|'success'|'error'`, `saveError`.
`clearDirty()` sets `saveStatus='success'` and auto-reverts to `'idle'` after
`SUCCESS_DISPLAY_DURATION_MS = 2000`. `MIN_SAVE_INTERVAL_MS = 1000` (debounce).

AsyncStorage `partialize` persists ONLY `currentCaseId`, `currentLocationId`, `occNumber`,
`address`, `_version` (key `cctv-recovery-form`). Everything else lives in SQLite.

**Store-level subscription (critical, screen-independent):**
`/Users/fvadev/.../src/lib/store/subscriptions/scope-recalculation.ts` registers a
`store.subscribe` listener at module load. It builds a composite key from
`scopes[].{startDateTime,endDateTime,isActualTime}` + `actualDateTime` + `JSON.stringify(timeOffsetData)` +
`dvrAppliesDST`. When that key changes AND `timeOffsetData && actualDateTime` exist, it defers via
`queueMicrotask` and runs `recalculateCorrectedTimes(state)`
(`/Users/fvadev/.../src/lib/store/actions/recalculate-corrected-times.ts`), applying
`updateArrayItem('scopes', i, updates)` per scope and `setExtractedScopes(...)` **only if
extractedScopes already non-empty**. Output fields are excluded from the key (loop guard) and a
module-level `isRecalculating` flag hard-guards re-entry. Scopes without `correctedStartDateTime`
are skipped (never-calculated scopes are not back-filled). Per-scope try/catch = error isolation.

#### 4-layer auto-save

1. **Screen blur** — `useScreenSave()` (`/Users/fvadev/.../src/hooks/useScreenSave.ts`): `useFocusEffect`
   cleanup; skips if `!hasPendingChanges()`; non-blocking `saveFormToLocation()`; never alerts.
   **Every step screen calls it as its first statement.**
2. **Layout `beforeRemove`** — blocking, in `NavigationSaveWrapper` (see drawer chrome below).
3. **Interval** — `useAutoSave()` (`/Users/fvadev/.../src/hooks/useAutoSave.ts`): `setInterval` every
   `AUTO_SAVE_INTERVAL = 300000` ms (5 min), only when `currentLocationId` set. Skips when: no pending
   changes, `saveStatus === 'saving'`, or `Date.now() - lastSaveTimestamp < MIN_SAVE_INTERVAL = 30000` ms.
   A `result.skipped` sets status `'idle'` (not `'error'`).
4. **Background** — `AppStateHandler` (`/Users/fvadev/.../src/components/AppStateHandler.tsx`), root layout.

`saveFormToLocation(force=false)` (`/Users/fvadev/.../src/lib/services/form-persistence.ts`) returns
`{success, skipped, reason?, error?}`. Skip reasons: `'Location load in progress'`, `'No location context'`,
`'No pending changes'` (unless forced), `'Debounce active'` (<1 s, unless forced), `'Save already in progress'`
(try-lock mutex `/Users/fvadev/.../src/lib/services/save-mutex.ts`).

#### Save-status UI

There is **no visible save-status indicator component** in the wizard chrome. `setSaveStatus()` /
`useSaveStatus()` (`/Users/fvadev/.../src/hooks/useSaveStatus.ts`) only write/read store state;
the only consumers are the save layers themselves and `completion.tsx`. The user-visible save signal in
the drawer is the per-section **completion dot** (below) plus Alerts on blocking-save failure.

#### Form customization (visibility) — affects every screen in this section

Feature root: `/Users/fvadev/.../src/features/form-customization/`
- Steps registry: `config/wizard-steps.ts` — `WIZARD_STEPS` (10 linear + 2 additive), each `{id, route, label, order, classification, arrayStoreKey?, sectionCompletionKey?}`. `ocr-capture` is deliberately NOT a step.
- Field registry: `config/field-registry.ts` — `FIELDS`, ids are `'<screen>.<key>'`, `storeKey` = FormState key (or array-entry key), `group` for atomic GPS groups (`gps:submission`, `gps:camera`).
- Profiles: `config/profiles.ts` — `forensic` (all on, default), `limited` (all on), `canvas` (off: whole `cameras` step; `submission.requester*` (name/badge/unit/phone/email); `dvr.dvrLocation`, `dvr.serialModelNumber`, `dvr.numberOfChannels`, `dvr.activeCameras`, `dvr.recordingSchedule`, `dvr.resolution`, `dvr.recordingFps`; all `camera.*`).
- Invariants: `config/invariants.ts` — `ALWAYS_ON_FIELDS` = `submission.occNumber`, `submission.address`, `submission.businessName`, `submission.streetAddress`, `submission.city`, `scope.startDateTime`, `scope.endDateTime`, `timeoffset.dvrDateTime`, `timeoffset.actualDateTime`. A step is must-stay iff it hosts an always-on field or is `completion` → must-stay = `submission`, `requested-scope`, `time-offset`, `completion`.
- Resolver: `services/visibility-resolver.ts` — precedence **always-on > user override > profile default**; composition: field hidden if its step hidden. `getNextStep`/`getPrevStep` walk the *visible* linear steps and are robust to `currentId` itself being hidden.
- Hooks used by screens: `useFieldVisible(fieldId) → boolean`, `useWizardNav(stepId) → { next: {route, label:"Next: <Step label>"} | null, prevRoute }`, `useVisibleSteps()`, `useStepVisible(id)`.
- Store: `store/form-customization-store.ts`, AsyncStorage key `cctv-app-form-customization`, version 1, separate from the form store, never synced.

#### Shared UI primitives (all absolute paths)

| Component | Path | Contract |
|---|---|---|
| `FormLayout` | `/Users/fvadev/.../src/components/layout/FormLayout.tsx` | `Header` (glass) + `Screen` (scroll, padded, keyboard-aware). Props: `title`, `onBack`, `onExit`, `showExit`, `testID`, `scrollable`, `keyboardAware` |
| `Header` | `/Users/fvadev/.../src/components/layout/Header.tsx` | left: `← Back` text button (`showBack`) OR `exit-outline` icon (`showExit`); center title; right: `menu` icon → `DrawerActions.openDrawer()` |
| `FormSection` | `/Users/fvadev/.../src/components/form/FormSection.tsx` | titled glass card (`LinearGradient` + 1px top highlight). **Returns `null` when `React.Children.toArray(children).length === 0`** — a section whose fields are all gated off disappears |
| `FormActions` | `/Users/fvadev/.../src/components/form/FormActions.tsx` | `marginTop:16, gap:12` wrapper for the Next button |
| `ArrayFieldManager` | `/Users/fvadev/.../src/components/form/ArrayFieldManager.tsx` | maps items → glass `Card`s with `#N` header + `Remove` outline button (shown when `items.length > minItems`); footer `Add …` outline button (hidden at `maxItems`); at max renders `Maximum {maxItems} items allowed`. Key = `item.id` when present |
| `DateTimePickerInput` | `/Users/fvadev/.../src/components/form/DateTimePicker.tsx` | see below |
| `TextInput` | `/Users/fvadev/.../src/components/common/TextInput.tsx` | label / `required *` / error / `helperText`; **uncontrolled** (`defaultValue` + `onEndEditing`) everywhere in the wizard |
| `Picker` | `/Users/fvadev/.../src/components/common/Picker.tsx` | selector row + `GlassBottomSheet` list; tappable id is `${testID}-selector` |
| `RadioGroup` | `/Users/fvadev/.../src/components/common/RadioGroup.tsx` | horizontal pill radios, generic over `string | boolean` |
| `Checkbox` | `/Users/fvadev/.../src/components/common/Checkbox.tsx` | `value`/`onValueChange`, tri-state `indeterminate` |
| `Button` | `/Users/fvadev/.../src/components/common/Button.tsx` | `variant: primary|secondary|outline|ghost|danger`, `size: small|medium|large`, `loading`, `disabled`, `fullWidth` |
| `Card` | `/Users/fvadev/.../src/components/common/Card.tsx` | `glass`, `techGlow` |

`DateTimePickerInput` behaviour (matters for the demo):
- `mode='datetime'` renders **two** side-by-side buttons: `DATE` (`yyyy-MM-dd`, or `No date`) and `TIME` (`HH:mm:ss`, or `No time`).
- Date button → iOS: `GlassBottomSheet` "Select Date" containing `react-native-ui-datepicker` calendar + a `Done` button (each tap commits immediately); Android: inline calendar below the field, second tap closes.
- Time button → custom 3-wheel `TimePicker` (`/Users/fvadev/.../src/components/form/TimeWheelPicker/TimePicker.tsx`) with HH:MM:SS and Confirm/Cancel.
- **Opening either picker with an empty value auto-populates `new Date()` immediately** (i.e. tapping the field alone dirties the form).
- Date selection preserves the existing time-of-day; time selection preserves the date. `setDate(1)` before setting year/month guards month overflow.
- `disabled` dims to opacity 0.5 and blocks the press (`mode='date'|'time'` only; in `datetime` mode `disabled` is accepted but not wired to the two buttons — **note for parity: time-offset passes `disabled` in datetime mode and it does not actually block the buttons**).

Datetime string conventions (`/Users/fvadev/.../src/lib/utils/datetime.ts`):
- Storage format `yyyy-MM-dd'T'HH:mm:ss` (naive wall-clock, **never** UTC-converted). `toStorageFormat(Date)` rejects years outside 2000–2100 → `''`.
- `toJSDate(string)` parses either `T` or space separator via Luxon; invalid → `undefined`.
- Display in time-offset uses `MM/dd/yyyy HH:mm:ss`.

---

### Drawer chrome — `app/(form)/_layout.tsx`

Files:
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/(form)/_layout.tsx`
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/components/layout/CustomDrawerContent.tsx`
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/components/layout/drawer-items.ts`
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/hooks/use-section-completion.ts`
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/components/common/GlassDot.tsx`

**Purpose:** hosts the 13 drawer screens, the hydration gate, the dual-layer save listeners, the 5-min
interval save, and the Media Library sheet.

**Hydration gate (DEF-009).** `const formCustomizationHydrated = useFormCustomizationHydration()`. While
`false`, the whole wizard renders only `<View testID="form-customization-loading"><ActivityIndicator/></View>`.
Fails open after `HYDRATION_FALLBACK_MS = 3000`.

**Drawer navigator config:**
```
screenOptions = { headerShown: false, drawerPosition: 'right', swipeEnabled: true,
                  swipeEdgeWidth: Layout.drawer.swipeEdgeWidth }
```
Screen order + titles (declaration order in the file):
`submission` "Submission Details" · `requested-scope` "Requested Scope" · `arrival-departure`
"Arrival/Departure" · `time-offset` "Time Offset" · `extracted-video-scope" "Extracted Video Scope" ·
`dvr-information` "DVR Information" · `cameras` "Cameras" · `export-information` "Export Information" ·
`notes` "Notes" · `ocr-capture` "OCR Capture" (`freezeOnBlur: true`) · `media-capture` "Media Capture"
(`freezeOnBlur`) · `audio-recording` "Audio Recording" (`freezeOnBlur`) · `completion` "Completion".

**`NavigationSaveWrapper`** wraps the whole `<Drawer>`; calls `useAutoSave()` and registers two
navigation listeners in one `useEffect([navigation])`:

- `'blur'` → if `!hasPendingChanges()` return; else `await saveFormToLocation()`; on success
  `setSaveStatus('success')`; on `skipped` log only; on failure `console.warn` and **no alert**
  (redundant backup to per-screen `useScreenSave`).
- `'beforeRemove'` → if `!hasPendingChanges()` allow. Else `e.preventDefault()`,
  `setSaveStatus('saving')`, `await saveFormToLocation()`:
  - success → `setSaveStatus('success')`, `navigation.dispatch(e.data.action)`.
  - failure → `setSaveStatus('error','Could not save changes')` + `Alert.alert('Save Failed', 'Could not save your changes. What would you like to do?')` with buttons **Retry Save** / **Discard Changes** (destructive) / **Cancel**.
    - Retry runs `saveFormToLocation(true)` (forced). If the retry also fails → `showRetryFailedAlert`:
      `Alert.alert('Save Failed Again', 'Your changes are still unsaved. You can discard them and leave, or stay on this screen and keep editing.', [Discard Changes (destructive) | Stay (cancel)])`.
    - Cancel → `setSaveStatus('idle')` and the user stays.
  - thrown exception → `Alert.alert('Error', 'An unexpected error occurred. Your changes may not have been saved.')` with the same three buttons; a failed-but-not-thrown retry also routes to `showRetryFailedAlert`.

**Media Library sheet.** `showMediaLibrary` state + `drawerNavRef`. Drawer's "Media Library" item calls
`onOpenMediaLibrary`; if `!currentLocationId` it fires `Toast {type:'error', text1:'No Location',
text2:'Select a location first.'}` and returns. Otherwise closes the drawer and mounts
`<MediaLibrarySheet visible locationId={currentLocationId}/>`. On close, a `setTimeout` of
`DRAWER_REOPEN_DELAY = 300` ms reopens the drawer (timeout cleared on unmount).

**Drawer content crash fallback.** `DrawerErrorFallback` inside an `ErrorBoundary`: title "Navigation
Unavailable", body "The navigation menu encountered an error. You can still use the back button to
navigate.", button "Close Menu" (resets boundary + `closeDrawer()`).

**`CustomDrawerContent` layout (top → bottom):**
1. Glass gradient header: title "Navigation" + `close` (Ionicons, 28) → `closeDrawer()`. Announces
   "Navigation menu opened" via `AccessibilityInfo` on mount.
2. "Back to Cases" row (`arrow-back` 22 + text) → `router.dismissTo('/(tabs)/cases')` — **never push/replace
   across the `(tabs)`/`(form)` boundary (BUG-011)**.
3. `DrawerContentScrollView` with `DRAWER_ITEMS.filter(item => visibleStepIds.has(item.name))`:

   | order | name | label | Ionicons |
   |---|---|---|---|
   | 1 | submission | Submission Details | `document-text` |
   | 2 | requested-scope | Requested Scope | `list` |
   | 3 | arrival-departure | Arrival/Departure | `time` |
   | 4 | time-offset | Time Offset | `sync` |
   | 5 | extracted-video-scope | Extracted Video Scope | `film` |
   | 6 | dvr-information | DVR Information | `videocam` |
   | 7 | cameras | Cameras | `camera` |
   | 8 | export-information | Export Information | `download` |
   | 9 | notes | Notes | `pencil` |
   | 10 | completion | Completion | `checkmark-circle` |

   Each item is a glass `LinearGradient` pill (`borderRadius md`, `borderWidth 1`,
   `minHeight Layout.touchTarget.large`). The active route gets `borderLeftWidth: 4` in `colors.primary`
   and primary-tinted icon+label (semibold). Tap → `router.push('/(form)/<name>')` then `closeDrawer()`.
   A `GlassDot` (size 10, variant `complete`|`partial`, `testID="section-dot-<name>"`) renders at the right
   when that section's `useSectionCompletion()` status is `partial` or `complete` (nothing when `empty`).
4. **Media accordion** (always rendered, below the step list): glass header row with `albums-outline` +
   "Media" + a chevron rotating 0→180° (`withSpring damping 18, stiffness 140, mass 0.8`); content is an
   animated-height container (`withTiming 250 ms, Easing.inOut(quad)`, measured on first layout, fallback
   height 164). 280 ms after expanding it `scrollToEnd`. Sub-items (glass pills, 20px icons):
   - "Capture Media" (`camera`) — only if `useStepVisible('media-capture')` — `router.push('/(form)/media-capture?returnTo=<currentRoute>')` + close drawer.
   - "Record Audio" (`mic`) — only if `useStepVisible('audio-recording')` — `router.push('/(form)/audio-recording?returnTo=<currentRoute>')` + close drawer.
   - "Media Library" (`folder-open-outline`) — always — calls `props.onOpenMediaLibrary?.()`.
5. Reversed-gradient footer: "DVR Extraction Notes" + `v{Constants.expoConfig?.version || '1.0.0'}`.

**Section completion dots** — `useSectionCompletion()` returns `Record<SectionKey, 'empty'|'partial'|'complete'>`.
`checkFields(values)`: 0 filled → empty, all filled → complete, else partial (a value is "filled" iff truthy
and not whitespace-only). `checkArray(entries, getFields)`: empty array → empty; all entries fully blank →
empty; all entries fully filled → complete; else partial. **Hidden fields are filtered out via
`visibleValues(visibility, [[fieldId|null, value], …])`** so a permanently hidden empty field can't pin a
section at "partial". Fields counted per section relevant to this half:
- submission: `occNumber, requesterName, requesterBadgeNumber, requesterUnit, address, locationContact, locationPhone`
- requested-scope (per scope): `startDateTime, endDateTime, cameras`
- arrival-departure (per entry): `arrivalDateTime, departureDateTime`
- time-offset: `dvrDateTime, actualDateTime, timeDifference` (last one has no FieldId → always counted)
- dvr-information: `dvrLocation, dvrTypeBrand, numberOfChannels, activeCameras, recordingSchedule, resolution, recordingFps, firstRecordedDate, totalDvrRetention, daysUntilOverwritten` (**`serialModelNumber`, `dvrUsername`, `dvrPassword` deliberately excluded**)
- cameras (per camera): `cameraName, resolution, recordingFps` (GPS excluded)

**Web-demo notes:**
- Mock: nothing native in the chrome except Reanimated (accordion) and `expo-constants` version string — a CSS transition + hardcoded version is fine.
- Reimplement: hydration gate (read a persisted visibility profile before first paint), the visible-step filtering, the completion-dot calculus (incl. the hidden-field filter and the excluded DVR credential fields), and the 5-min interval + `beforeunload`-style blocking save with the exact Retry/Discard/Cancel → "Save Failed Again" (Discard/Stay) alert chain.
- The drawer is right-side, swipe-openable, and the header hamburger opens it.
- "Back to Cases" must fully tear down the wizard (kill intervals/subscriptions) — model it as unmounting the wizard route, not stacking a new one.

---

### Screen 1 — Submission Details (`app/(form)/submission.tsx`)

Route: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/(form)/submission.tsx`
Step id `submission` · order 1 · must-stay · `classification: 'field-capable'`.

**Purpose:** case number (read-only), who requested the video, and the location (business/street/city +
GPS + on-site contact). It is the wizard's entry step — no Back, only an Exit icon.

**Layout:** `FormLayout title="Submission Details" showExit onExit={() => router.dismissTo('/(tabs)/cases')}`
`testID="submission-screen"`.

**FormSection "Case Information" (glass)**

| Field | Component | Input | Store key | Notes |
|---|---|---|---|---|
| Case Number | `TextInput` | text, **`editable={false}`, `containerStyle={{opacity:0.6}}`** | `occNumber` | `defaultValue={occNumber}`, `testID="occ-number-input"`; populated from the Case entity when the location is loaded, never typed here |

**FormSection "Requester Information" (glass)** — every row gated by `useFieldVisible`

| Field | Placeholder | Keyboard/props | Store key | Visibility id | testID |
|---|---|---|---|---|---|
| Requester Name | "Who requested video from this location" | default | `requesterName` | `submission.requesterName` | `requester-name-input` |
| Requester Badge | "Badge number" | `keyboardType="default"` | `requesterBadgeNumber` | `submission.requesterBadgeNumber` | `requester-badge-number-input` |
| Requester Unit | "Unit (defaults to case unit if empty)" | helperText "Leave empty to use case unit, or override for this location" | `requesterUnit` | `submission.requesterUnit` | `requester-unit-input` |
| Requester Phone | "e.g., 905-555-1234" | `phone-pad`, `autoCorrect=false`, `textContentType="telephoneNumber"` | `requesterPhone` | `submission.requesterPhone` | `requester-phone-input` |
| Requester Email | "e.g., cop@dept.ca" | `email-address`, `autoCapitalize="none"`, `autoCorrect=false`, `textContentType="emailAddress"` | `requesterEmail` | `submission.requesterEmail` | `requester-email-input` |

All commit on `onEndEditing` → `updateField(key, e.nativeEvent.text)` (blur-commit, not per-keystroke).

**FormSection "Location Information" (glass)** — renders `LocationForm`
(`/Users/fvadev/.../src/features/location/components/LocationForm.tsx`), then two gated contacts:

`LocationForm` internals (props: `values`, `onChange`, `testID="location-form"`):
1. `TextInput` "Business/Location Name", placeholder "Optional", commit on `onEndEditing` → `businessName`.
2. `AddressAutocomplete` "Street Address", placeholder "Start typing an address...", **`required`**,
   controlled `value`/`onChangeText` → `streetAddress`. Mapbox Search Box `suggest`/`retrieve`;
   config in `/Users/fvadev/.../src/features/location/constants/index.ts`: `debounceMs: 300`,
   `minQueryLength: 3`, `limit: 5`, `types: 'address,place'`, `language: 'en'`, biased by
   `useProximityCoordinate()`. Selecting a suggestion batch-sets
   `{streetAddress, city, latitude, longitude, coordinateAccuracy, coordinateSource:'geocoded'}` (business name preserved).
3. `TextInput` "City", placeholder "City name", **`required`**, commit on `onEndEditing` → `city`.
4. `GpsCaptureControl` (`/Users/fvadev/.../src/features/location/components/GpsCaptureControl.tsx`):
   glass button "Use Current Location" (`locate-outline` 18) with `minHeight 60` + a compact "GEOCODE"
   `Switch` on the right. Busy states render inside the button: "Capturing…" then "Looking up address…".
   On capture success → `onChange({latitude, longitude, coordinateAccuracy, coordinateSource:'gps'})`; then,
   **only if the Geocode switch is on**, `reverseGeocode(lat,lon)` and `onChange({streetAddress, city})`.
   Reverse-geocode failure is logged (`logError`) and surfaced via `onReverseGeocodeError`, coordinates stay.
   The toggle is a persisted per-context preference (`useReverseGeocodePreference('location')`).
5. `CoordinateDisplay` — rendered only when both lat and lon are defined; shows 6-dp coordinates, accuracy, source.

| Field | Placeholder | Keyboard | Store key | Visibility id |
|---|---|---|---|---|
| Contact Person | "Optional" | default | `locationContact` | `submission.locationContact` |
| Contact Phone | "Optional" | `phone-pad` | `locationPhone` | `submission.locationPhone` |

**Derived field — `address`.** `handleLocationChange` filters incoming updates to
`LOCATION_FORM_KEYS = ['businessName','streetAddress','city','latitude','longitude','coordinateAccuracy','coordinateSource']`
and, whenever any of businessName/streetAddress/city is in the update, also computes
`address = formatAddress(businessName, streetAddress, city)`
(`/Users/fvadev/.../src/lib/utils/address-formatting.ts`): trims, drops empties, joins with `", "` in the
order business → street → city, and **abbreviates street types in the street part only**
(boulevard→Blvd, avenue→Ave, drive→Dr, street→St, road→Rd, court→Ct, crescent→Cres, lane→Ln, place→Pl,
highway→Hwy, terrace→Ter, circle→Cir, parkway→Pkwy; idempotent). All keys land in one `batchUpdate(...)`.

**GPS capture math** (`/Users/fvadev/.../src/features/location/services/gps-service.ts` + `hooks/useGpsCapture.ts`):
permission check → request if needed → loop up to `maxAttempts = 10` calls to
`getCurrentPositionAsync({accuracy: BestForNavigation, mayShowUserSettingsDialog:true})`, `retryDelay = 500 ms`
between samples, **stop early once `accuracy <= targetAccuracy`**, then pick the sample with the lowest
`accuracy` value. `targetAccuracy` from settings: quick 100 m / balanced 50 m / precise 10 m; `timeout =
settings.gpsTimeout * 1000`. Errors are `{code: PERMISSION_DENIED|LOCATION_UNAVAILABLE|TIMEOUT|INVALID_COORDINATES|UNKNOWN, message}`.
Coordinates validated to lat ∈ [-90,90], lon ∈ [-180,180].

**Navigation:** `nav = useWizardNav('submission')`; Next button label `nav.next.label`
(`"Next: Requested Scope"` under default profile) → `router.push(nav.next.route)`. **No Back button**
(`showExit` instead); `nav.prevRoute` intentionally unused. Exit → `router.dismissTo('/(tabs)/cases')`.

**Validation:** none on this screen. `submissionSchema`
(`/Users/fvadev/.../src/lib/schemas/form-schema.ts`) is fully relaxed (all optional) and is *not* invoked
during navigation. Only `finalSubmissionSchema` on the Completion screen requires `occNumber.min(1)` and
`address.min(1)`. Coordinate bounds live in `submissionSchema` (lat ±90, lon ±180, accuracy ≥ 0,
`coordinateSource ∈ {'gps','manual','geocoded'}`) but are enforced in the GPS service, not the screen.

**Dirty/auto-save:** `useScreenSave()` first line. Every `updateField`/`batchUpdate` marks dirty.

**Native deps:** `expo-location` (GPS), Mapbox Search Box + Geocoding HTTP APIs (needs
`EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`), `expo-haptics` (light impact on input focus).

**Web-demo notes:**
- Mock `expo-location` with `navigator.geolocation` (or a canned fixture): keep the 10-sample / 500 ms /
  early-exit-on-target-accuracy / best-accuracy-wins behaviour and the busy labels.
- Mapbox autocomplete can be a static suggestion list; keep 300 ms debounce and 3-char minimum.
- Case Number is read-only — seed it from the demo's "case" object.
- Reimplement `formatAddress` exactly (street-type abbreviations included) — the `address` string flows into the PDF, notes, filenames, and is a required final-submission field.
- Inputs commit on blur, not on change — a demo using `onChange` will dirty/save far more often than the app does.

---

### Screen 2 — Requested Scope (`app/(form)/requested-scope.tsx`)

Route: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/(form)/requested-scope.tsx`
Step id `requested-scope` · order 2 · must-stay (hosts always-on `scope.startDateTime`/`endDateTime`) ·
`arrayStoreKey: 'scopes'`.

**Purpose:** the requested video time ranges — what the investigator asked for. This is the input the
whole time-offset/extracted-scope chain hangs off.

**Layout:** `FormLayout title="Requested Scope" onBack={handleBack} testID="requested-scope-screen"` →
`ArrayFieldManager items={scopes} onAdd={addScope} onRemove={removeScope} addButtonText="Add Scope"
minItems={1} maxItems={10} testID="scopes-array"`.

**Per-scope fields** (`ScopeEntry` in `/Users/fvadev/.../src/types/form.types.ts`):

| Field | Component | Store key | Visibility id | testID |
|---|---|---|---|---|
| Start Date/Time | `DateTimePickerInput mode="datetime"` | `startDateTime` | always-on (`scope.startDateTime`) | `scope-<i>-start-datetime` |
| End Date/Time | `DateTimePickerInput mode="datetime"` | `endDateTime` | always-on (`scope.endDateTime`) | `scope-<i>-end-datetime` |
| Time Entry Type | `RadioGroup` options `[{label:'Real Time', value:true}, {label:'DVR Time', value:false}]` | `isActualTime` (default `true`) | `scope.isActualTime` | `scope-<i>-time-entry-type` |
| Cameras | `TextInput` multiline `numberOfLines={3}`, placeholder "List cameras for this scope" | `cameras` | `scope.cameras` | `scope-<i>-cameras` |

Date/time write path: `onChange(date) → handleScopeChange(i, field, toStorageFormat(date))`;
value read path: `toJSDate(scope.startDateTime)`.

**Full `ScopeEntry` shape:** `{id, startDateTime, endDateTime, isActualTime, cameras,
correctedStartDateTime?, correctedEndDateTime?, dstAdjustedStartDateTime?, dstAdjustedEndDateTime?,
dstAdjustmentApplied?}`. New scope factory: `{id: randomUUID(), startDateTime:'', endDateTime:'',
isActualTime: true, cameras:'', correctedStartDateTime:'', correctedEndDateTime:''}`.

**Array limits:** `addScope` throws `ValidationError('Maximum 10 scopes allowed')` at 10 (caught → per-field
error `{code:'SCOPE_LIMIT'}`); `ArrayFieldManager` hides the Add button at 10 and shows
"Maximum 10 items allowed". `removeScope` guarded to `minItems=1` in the UI.

**Interactions — the two confirmation Alerts (only when `extractedScopes.length > 0`):**

1. Changing **Time Entry Type** (`isActualTime`):
   `Alert.alert("Recalculate Time Offset", "Recalculating will update the time offset. What would you like to do with your extracted video scopes?")`
   - **Cancel** — no write at all (the toggle does not move).
   - **Keep My Edits** — `updateArrayItem('scopes', i, {isActualTime})` only.
   - **Regenerate Scopes** (destructive) — updates `isActualTime` **and** immediately recomputes
     `setExtractedScopes(generateExtractedScopes(locallyUpdatedScopes))`.
2. Changing **startDateTime** or **endDateTime**:
   `Alert.alert("Update Requested Time?", "Changing the requested time will recalculate your corrected times and regenerate extracted video scopes. Any manual edits to extracted times will be lost.")`
   - **Cancel** — no write.
   - **Update** (destructive) — writes the field. (Recalculation then happens automatically via the
     store-level scope-recalculation subscription — the screen does not do it.)

All other fields (`cameras`) and *all* fields when `extractedScopes` is empty go straight to
`updateArrayItem('scopes', i, {[field]: value})`.

**Derived:** none locally, but this screen is the trigger source for the store subscription described in
§2.0 (any change to `startDateTime`/`endDateTime`/`isActualTime` recomputes corrected times when a
calibration exists).

**Validation:** `scopeSchema` is relaxed/unused at runtime. `finalSubmissionSchema` requires at least one
scope with **both** `startDateTime` and `endDateTime` non-empty.

**Navigation:** `useWizardNav('requested-scope')` → Back `router.push(nav.prevRoute)`, Next
`router.push(nav.next.route)` (`"Next: Arrival/Departure"` by default).

**Native deps:** none beyond the date/time picker (`react-native-ui-datepicker`, custom wheel picker,
`expo-haptics`).

**Web-demo notes:**
- Pure JS screen — highest-fidelity target. Reimplement the exact three-button Alerts; they are the only
  place a user can protect manual extracted-scope edits.
- Remember `isActualTime` defaults to **true (Real Time)** for new scopes.
- Add/Remove semantics: min 1 (Remove hidden at 1 item), max 10 (Add hidden + warning text at 10).
- `cameras` is free text (multiline), not a picker.

---

### Screen 3 — Arrival & Departure (`app/(form)/arrival-departure.tsx`)

Route: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/(form)/arrival-departure.tsx`
Step id `arrival-departure` · order 3 · removable · `arrayStoreKey: 'arrivalDepartures'`.

**Purpose:** when the analyst was on scene (supports multiple visits).

**Layout:** `FormLayout title="Arrival & Departure" onBack={handleBack} testID="arrival-departure-screen"` →
`ArrayFieldManager items={arrivalDepartures} onAdd={addArrivalDeparture} onRemove={removeArrivalDeparture}
addButtonText="Add Arrival/Departure" minItems={1}` — **no `maxItems` prop is passed**, so the UI never
hides Add; the store enforces the cap.

**Per-entry fields** (`ArrivalDepartureEntry = {id, arrivalDateTime, departureDateTime}`):

| Field | Component | Store key | Visibility id | testID |
|---|---|---|---|---|
| Arrival Date/Time | `DateTimePickerInput mode="datetime"` | `arrivalDateTime` | `arrival.arrivalDateTime` | `arrival-<i>-datetime` |
| Departure Date/Time | `DateTimePickerInput mode="datetime"` | `departureDateTime` | `arrival.departureDateTime` | `departure-<i>-datetime` |

Write: `updateArrayItem('arrivalDepartures', i, {[field]: toStorageFormat(date)})`. No confirmation dialogs,
no derived fields, no cross-screen effects.

**Array limits:** `addArrivalDeparture` throws `ValidationError('Maximum 20 arrival/departure entries allowed')`
at 20 → per-field error `{code:'ARRIVAL_LIMIT'}` (silent in the UI — the button just does nothing).
**Note the documented "1-10" is wrong for this screen: the store cap is 20.**

**Validation:** `arrivalDepartureSchema` relaxed/unused. Not part of `finalSubmissionSchema`.

**Navigation:** `useWizardNav('arrival-departure')`; default Next label `"Next: Time Offset"`.

**Native deps:** date/time pickers only.

**Web-demo notes:**
- Simplest screen; both fields are individually hideable, and if both are hidden the card body is empty
  (the screen itself can also be hidden entirely by profile/override).
- Cap is 20, and hitting it fails silently — reproduce that or improve it deliberately.

---

### Screen 4 — Time Offset Calculation (`app/(form)/time-offset.tsx`) ★ core math

Route: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/(form)/time-offset.tsx`
Step id `time-offset` · order 4 · **must-stay** · `classification: 'screen-only'` (no per-field toggles;
`dvrAppliesDST` has no gating — DEF-011).

**Purpose:** establish the DVR-clock ↔ real-clock offset (the court-admissible calibration), convert every
requested scope into the other time domain, optionally apply a DST correction, and seed the extracted
video scopes.

#### Gate

`const hasValidScope = scopes.some(s => s.startDateTime && s.endDateTime)`.
When false, a bordered `Card` renders at the top:
title **"Extraction Scope Required"**, body "Enter an extraction scope with start and end times before
calculating time offset.", outline button **"Go to Extraction Scope"** (`testID="go-to-scope-button"`) →
`router.push(ROUTES.FORM.REQUESTED_SCOPE)`. While false, the two date/time pickers get `disabled` and the
three buttons (`Use Current Time`, `Calculate`, `Capture from DVR`) are disabled.

#### FormSection "DVR Time vs Actual Time" (glass)

| Element | Component | Store key / action | testID |
|---|---|---|---|
| DVR Date/Time | `DateTimePickerInput mode="datetime"` | `dvrDateTime` via `updateField('dvrDateTime', toStorageFormat(date))` | `dvr-datetime-input` |
| Actual Date/Time | `DateTimePickerInput mode="datetime"` | `actualDateTime` | `actual-datetime-input` |
| **Use Current Time** | `Button variant="outline"`, `loading={isCapturingTime}` | see NTP flow | `get-current-time-button` |
| **Calculate** | `Button` (primary), `loading={isCalculating}` | see calculation | `calculate-button` |
| `SyncStatusCard` | inside `TimeSyncErrorBoundary`; rendered when `displaySyncResult || isSyncing || syncError || isCapturingTime` | — | `sync-status-card` |
| **Capture from DVR** | `Button variant="outline"` with `camera` icon 24 + label | `router.push(ROUTES.FORM.OCR_CAPTURE)` | `ocr-capture-button` |
| Result card | `Card glass` — shown when `timeOffsetData && timeDifference` | — | — |
| Adjusted Time Ranges | per-scope `Card glass` list | — | — |
| **DVR Applies DST** | `Switch` + hint "Enable if the DVR clock adjusts for Daylight Saving Time" | `updateField('dvrAppliesDST', value)` | `dvr-applies-dst-toggle` |
| DST notification | dashed-border `Card` | `getDSTNotification()` | — |

#### Time sync (NTP → HTTP) flow

Hook: `useTimeSync()` from `/Users/fvadev/.../src/features/precision-time-sync/hooks/useTimeSync.ts`.

- **Focus warm-up:** `useFocusEffect(() => { if (!timeOffsetData) syncTime(false) })` — non-forced, uses the
  10-min cache; **does not write to Zustand and does not mark the form dirty**. Persisting the sync result
  is reserved for explicit commit points.
- **`captureSyncRef`:** `useEffect` sets `captureSyncRef.syncTime = syncTime` on mount and `null` on unmount
  (`/Users/fvadev/.../src/features/precision-time-sync/capture-sync-ref.ts`) so the OCR camera can force a
  sync at shutter without owning a hook.
- **`SyncResult`** (`/Users/fvadev/.../src/features/precision-time-sync/types/index.ts`):
  `{success, timestamp, offset /* ms, positive = device SLOW */, uncertainty, server, method:'ntp'|'http'|'device_time', rtt?, ntpServer?, error?, stratum?, rootDispersion?}`.
- **Cascade** (`services/unified-sync.ts`): read `useSettingsStore.getState().timeSync?.ntpRegion ?? 'canada'`
  → `NTP_REGIONAL_SERVERS[region]` (3 servers; canada = `time.nrc.ca`, `time.chu.nrc.ca`, `time.cloudflare.com`;
  usa = `time.nist.gov`, `time-a-wwv.nist.gov`, cloudflare; europe = `ptbtime1.ptb.de`, `ntp.metas.ch`,
  cloudflare; global = cloudflare, nist, nrc) → RFC 5905 UDP query per server, **stop on the first success;
  a timeout aborts the whole NTP phase, a validation/socket error continues to the next server** → on total
  NTP failure fall back to `syncWithHTTPTimeAPI` (ipgeolocation.io, 5 samples at 200 ms spacing, per-sample
  3 attempts with 100/200/400 ms backoff, 5 s per-request timeout) → both fail ⇒
  `{success:false, method:'device_time'}`.
- **Offset math** (`utils/offset-calculator.ts`):
  - NTP per-server: `offset = [(T2 - T1) + (T3 - T4)] / 2`; `rtt = (T4 - T1) - (T3 - T2)`;
    `uncertainty = max(1, rtt/2 + rootDispersionMs)`; reject stratum 0, NaN/zero timestamps, negative RTT, `rtt > 2000 ms`.
  - HTTP per-sample: `offset = serverTime + rtt/2 - deviceTime`; `filterOutliers` drops samples with
    `rtt > medianRtt * 1.5` (keeps the lowest-RTT sample if all are dropped); final offset = mean of survivors;
    `uncertainty = max(1, rtt/2)` of the best sample.
  - Direction labels: `|offset| < 10 ms` → "synchronized", `offset > 0` → device "slow", `< 0` → "fast".
- **Cache:** `SYNC_CACHE_DURATION_MS = 10 * 60 * 1000` with a 1 s buffer; `syncTime(true)` bypasses it. Each
  call creates a fresh `AbortController` that cancels the previous sync; unmount aborts.

**"Use Current Time" handler (`handleGetCurrentTime`) — order is load-bearing:**
```
const deviceTimeAtCapture = Date.now()          // FIRST LINE, before any setState
setIsCapturingTime(true)
if (timeOffsetData) { updateField('timeOffsetData', undefined); updateField('timeDifference', '') }
setIsCardExpanded(true); startCardCollapseTimer()          // 10 s auto-collapse
const result = await syncTime(true)                         // forced sync
const calibrated = result?.success === true
const calibratedTimestamp = calibrated ? deviceTimeAtCapture + result.offset : deviceTimeAtCapture
Toast: calibrated ? {info,'Using Calibrated Time','Time adjusted using atomic clock offset'}
                  : {info,'Using Device Time','NTP unavailable — verify device clock accuracy'}
updateField('actualDateTime', toStorageFormat(new Date(calibratedTimestamp)))
calibrated ? setTimeSyncResult(result) : clearTimeSyncResult()
finally setIsCapturingTime(false)
```
The device clock is frozen *before* any async work / React scheduling, and the NTP offset is applied
retroactively to that frozen instant. `lastSyncTimestamp` stores sync-completion time, not the button press.

**Sync card display selection (memoized):**
`displaySyncResult = timeOffsetData ? timeSyncResult (store, forensic snapshot) : syncResult (hook, live)`;
`displayLastSyncTimestamp = timeOffsetData ? lastSyncTimestamp : (syncResult?.timestamp ?? null)`;
`isForensicMode = !!timeOffsetData`. Collapsed card shows `Offset: X.XXXs (slow|fast) | Used for calculation`
(forensic) or `| Synced: HH:MM:SS`. Expanded card shows Status, Method ("NTP (Atomic Clock)" / "HTTP API"),
Server, Device Offset, Uncertainty `±N ms`, Network Delay `rtt/2 ms`, "Calibrated at:"/"Last Sync:", and the
traceability chain string chosen by responding hostname (`TRACEABILITY_CHAINS` in
`/Users/fvadev/.../src/features/precision-time-sync/constants/index.ts`).
Card auto-collapse timer: `TIMING_CONSTANTS.AUTO_COLLAPSE_DELAY_MS = 10000`.

#### The offset math (`/Users/fvadev/.../src/lib/utils/bidirectional-time.ts`)

**All arithmetic is wall-clock: strings are parsed as `new Date(s.replace(' ','T') + 'Z')` (forced UTC) so no
DST shift ever creeps in, and results are re-serialized with `getUTC*` into `YYYY-MM-DD HH:MM:SS`.**

1. `calculateTimeDifference(dvrDateTime, actualDateTime) → TimeDifference`
   - Zod-validates both strings (`InvalidDateError` if unparseable).
   - `diffMs = dvrTime - actualTime`
   - `isDvrAhead = diffMs > 0`; `direction = isDvrAhead ? 'AHEAD OF' : 'BEHIND'`
   - `formattedDifference = HH:MM:SS` from `Math.floor(|diffMs| / 1000)` (hours are **not** capped at 24 — a
     3-day offset renders as `72:00:00`).
   - Returns `{differenceMs, formattedDifference, direction, isDvrAhead}`.
2. `isDvrTimeCorrect(diff)` ⇔ `diff.formattedDifference === '00:00:00'` — keyed off the **string**, not
   `differenceMs`, because persistence/import can reconstruct `differenceMs` as `0` while the string stays faithful.
3. `calculateCorrectedTimeRange(range, timeDifference, isActualTime)` — the bidirectional rule:
   ```
   shouldAdd = (isActualTime && isDvrAhead) || (!isActualTime && !isDvrAhead)
   corrected = shouldAdd ? t + |differenceMs| : t - |differenceMs|      // applied to BOTH endpoints
   returns { startDateTime, endDateTime, isActualTime: !isActualTime }  // domain flips
   ```
   Read as: real→DVR adds the offset when the DVR runs ahead; DVR→real subtracts it when the DVR runs ahead.
4. `calculateDSTAdjustedTimeRange(correctedRange, collectionDateTime)`:
   ```
   collectionInDST = isInDST(collectionDateTime)        // Luxon, DEVICE timezone
   adjustmentHours = collectionInDST ? -1 : +1          // uniform, both endpoints
   adjusted = applyTimeOffset(t, 3600000, adjustmentHours > 0)
   returns { startDateTime, endDateTime, adjustmentApplied: adjustmentHours }
   ```
   i.e. collection in summer ⇒ shift **-1 h**; collection in winter ⇒ shift **+1 h**. Applied to the already
   corrected times, never to the raw requested times.
5. DST helpers: `isInDST(s)` = `DateTime.fromISO(s.replace(' ','T')).isInDST` (device zone);
   `dstStatusDiffers(a,b)`; `doesRangeStraddleDST(start,end)` = `dstStatusDiffers(start,end)`;
   `doesTodayStraddleDSTWith(s)` compares against `DateTime.local()`;
   `getDSTTransitionDates(year)` brute-force scans every day at 12:00 local and returns
   `{springForward, fallBack}` formatted `"MMMM d, yyyy"`.

**`performCalculation()` (the Calculate button):**
```
result = calculateTimeDifference(dvrDateTime, actualDateTime)
setIsCardExpanded(false); clearCardTimer()                    // switch card to forensic mode
batchUpdate({ timeDifference: result.formattedDifference, timeOffsetData: result, captureMethod: 'manual' })
for each scope with both start and end:
    corrected = calculateCorrectedTimeRange({start,end}, result, scope.isActualTime)
    dstUpdate = { correctedStartDateTime, correctedEndDateTime,
                  dstAdjustedStartDateTime: undefined, dstAdjustedEndDateTime: undefined,
                  dstAdjustmentApplied: undefined }
    if (dvrAppliesDST) dstUpdate ⊕ calculateDSTAdjustedTimeRange(corrected, actualDateTime)
    updateArrayItem('scopes', i, dstUpdate)
setExtractedScopes(generateExtractedScopes(locallyUpdatedScopes))
Toast success: 'Calculation Complete' + (isDvrTimeCorrect ? 'DVR time is CORRECT'
               : `DVR is ${formattedDifference} ${direction} actual time`)
```
Errors → `logError({context:'performCalculation', dvrDateTime})` (**`actualDateTime` deliberately not logged —
PII**) + Toast `{error,'Calculation Error', message}`.

**Guards around Calculate (`handleCalculateTimeDifference`):**
- missing `dvrDateTime` or `actualDateTime` → Toast `{error,'Missing Information','Please enter both DVR and actual times'}`, abort.
- `extractedScopes.length > 0` → `Alert.alert('Recalculate Time Offset?', 'This will reset your extracted video scopes. Any manual edits to the extracted times will be lost.', [Cancel | Continue])`; Continue runs `performCalculation()`.

**Extracted-scope generation** (`/Users/fvadev/.../src/lib/utils/extracted-scope-generator.ts` +
`/Users/fvadev/.../src/lib/utils/time-rounding.ts`):
- Per scope, the *effective* range is: if `isActualTime === false` (already DVR time) → the raw
  `startDateTime`/`endDateTime`; otherwise → `dstAdjusted*` if present, else `corrected*`.
- Scopes without a usable effective range are dropped.
- Start rounded **down** to a 5-minute boundary, end rounded **up** (`23:58 → 00:00` next hour/day). Rounding
  parses in the UTC zone (wall-clock preserved) and re-emits `yyyy-MM-dd'T'HH:mm:ss`.
- Output `ExtractedScope = {id: randomUUID(), startDateTime, endDateTime, cameras, isActualTime: false}` —
  extracted scopes are **always** DVR time.

**Results UI (only when `timeOffsetData && timeDifference`):**
- Result `Card glass`: label "Time Difference:", big value = `CORRECT` when `isDvrTimeCorrect(timeOffsetData)`
  else `timeDifference`; sub-line "DVR time is CORRECT" or `DVR is ${direction} actual time`.
- "Adjusted Time Ranges" list (only if some scope has both corrected times). Per scope card:
  - `Scope {i+1}`
  - `REQUESTED (Real Time|DVR Time):` Start/End = raw values, formatted `MM/dd/yyyy HH:mm:ss`
  - `ADJUSTED (DVR Time|Real Time):` Start/End = corrected values (label is the **inverse** of the scope's domain), primary color
  - if `dvrAppliesDST && scope.dstAdjusted*`: `ADJUSTED (<inverse domain> - DST +1hr|-1hr):` Start/End in warning color (sign from `dstAdjustmentApplied > 0`)
  - `Cameras: <scope.cameras>` in italics when non-empty.
- DST toggle row + hint, then `getDSTNotification()` card (dashed border):
  - Only evaluated when at least one scope has `isActualTime === true` with both times, and `actualDateTime` is set. Four exclusive scenarios, checked in order:
  - **A** `dvrAppliesDST && !scopesCrossDST` → warning: "DST does not affect the dates you selected. For reference, clocks spring forward on {springForward} and fall back on {fallBack} in your timezone. If you did this intentionally, it is advisable to pull an additional hour on either side of the pre-DST adjusted DVR time to ensure complete footage recovery."
  - **B** `!dvrAppliesDST && todayStraddlesWithScope` → warning: "Today's date and the date(s) of interest fall on either side of the DST change. Consider enabling 'DVR Applies DST' if the DVR adjusts for Daylight Saving Time."
  - **C** `!dvrAppliesDST && scopeStraddlesDST` → warning: "Your requested dates fall on either side of a DST change. Consider enabling 'DVR Applies DST' if the DVR adjusts for Daylight Saving Time."
  - **D** `dvrAppliesDST && scopesCrossDST` → warning: "Note: DVR handling of DST is unpredictable. It is advisable to pull an additional hour on either side of the pre-DST adjusted DVR time to ensure complete footage recovery."
  - `scopesCrossDST` = any actual-time scope whose `startDateTime` DST status differs from `actualDateTime`;
    `scopeStraddlesDST` = any actual-time scope whose own start/end straddle a transition;
    `todayStraddlesWithScope` = any actual-time scope start on the other side of DST from *today*.

**DST toggle side-effect:** `handleDSTToggleChange` only does `updateField('dvrAppliesDST', value)`; the
recomputation of `dstAdjusted*` for existing scopes is done by the store subscription (§2.0).

**Store fields touched (TimeOffsetSlice):** `dvrDateTime`, `actualDateTime`, `timeDifference`,
`timeOffsetData?: TimeDifference`, `dvrAppliesDST`, `captureMethod: 'manual'|'ocr'`, `timeSyncResult`,
`lastSyncTimestamp`, plus OCR fields written by screen 5. Actions `setTimeSyncResult`,
`clearTimeSyncResult`, `setExtractedScopes`.

**Validation:** `timeOffsetSchema` is relaxed/unused. The only runtime guards are the two Toasts + Alert above.

**Native deps:** `react-native-udp` (NTP over UDP port 123 — **dev build only**), `fetch` to
ipgeolocation.io (needs `TIME_API_KEY`), settings store for region, `expo-haptics`.

**Web-demo notes:**
- **Reimplement `bidirectional-time.ts` verbatim** — including the "+Z" UTC parse trick, the `shouldAdd`
  boolean, the `Math.abs(offsetMs)` application, and the `'00:00:00'`-string definition of "correct".
- NTP over UDP is impossible in a browser. Replace with either (a) a canned `SyncResult` fixture, or
  (b) an HTTPS time endpoint using the same 5-sample / `median × 1.5` outlier filter / mean-offset /
  `max(1, rtt/2)` uncertainty math. Keep the `{success, offset, uncertainty, server, method, rtt}` shape and
  the "Using Calibrated Time" vs "Using Device Time" toasts.
- Preserve the capture-first ordering: freeze `Date.now()` *before* any await, then add `result.offset`.
- `isInDST` resolves against the **device/browser** timezone — pin a zone (e.g. `America/Toronto`) in the demo
  or the DST scenarios will never fire in a UTC container.
- The auto-collapsing sync card (10 s), the forensic-vs-live card switch, and the disabled state when no
  scope exists are all user-visible behaviours worth replicating.

---

### Screen 5 — OCR Capture, ROUTE layer only (`app/(form)/ocr-capture.tsx`)

Route: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/(form)/ocr-capture.tsx`
**Not a wizard step** (excluded from `WIZARD_STEPS` by decision OD-1) — reachable only from the
"Capture from DVR" button on time-offset. Drawer screen with `freezeOnBlur: true`.

**Structure:** `OcrCaptureRoute` = `ErrorBoundary(fallback=ErrorFallback)` → `OcrCaptureContent` →
`<OcrCaptureFlow onComplete onCancel/>` (full-screen, **no `FormLayout`/header**).
`ErrorFallback`: "Something went wrong" + `error.message || 'An unexpected error occurred during OCR capture'`
+ "Go Back" → `resetError()` then `router.push(ROUTES.FORM.TIME_OFFSET)`.
`handleCancel` → `router.push(ROUTES.FORM.TIME_OFFSET)`.

**Input contract — `OcrCaptureResult`** (`/Users/fvadev/.../src/features/ocr-time-capture/types/index.ts`):
`{dvrTime, actualTime, formattedDifference, timeDifferenceData: TimeDifference, capturedImageUri,
croppedImageUri, confidence, rawText, cleanedText, parsedDateTime: string|null, calibratedTimestamp: number,
syncResult: SyncResult|null}`. The feature computes the TimeDifference itself (shutter-time NTP via
`captureSyncRef.syncTime(true)`); the route only commits it.

**`handleComplete(result)`** — if `extractedScopes.length > 0`, first shows
`Alert.alert('Recalculate Time Offset', 'Recalculating will update the time offset. What would you like to do with your extracted video scopes?', [Cancel → router.push(TIME_OFFSET) | 'Keep My Edits' → performOcrCalculation(result, false) | 'Regenerate Scopes' (destructive) → performOcrCalculation(result, true)])`.
Otherwise `performOcrCalculation(result, true)`.

**`performOcrCalculation(result, regenerateScopes)` — 9 ordered steps:**
1. **Snapshot scopes first** (`const scopesSnapshot = scopes`) before any await — avoids stale reads.
2. **Propagate images to the case hierarchy** — if `currentCaseId && currentLocationId`:
   `saveDvrCaptureImages({caseId, locationId, originalUri, croppedUri, ocrResult:{rawText, confidence, parsedDateTime: dvrTime}, namingData:{businessName, streetAddress}})` (transactional: both or none).
   Success → rewrite `finalCapturedImageUri`/`finalCroppedImageUri` to the returned paths and set
   `propagationSucceeded = true`. Failure → `console.error` + Toast `{info,'Image Storage Notice','OCR images saved temporarily. Re-capture recommended for export.', 4000 ms}` and keep the temp URIs. No case/location context → `console.warn`, images stay in temp.
3. **Two-phase stale clear** — if a prior `timeOffsetData` exists, `updateField('timeOffsetData', undefined)`
   and `updateField('timeDifference','')` **before** writing the new values (so the card unfreezes and no
   orphaned calibration is ever visible next to fresh sync metadata).
4. **Commit** — `actualDateTime = toStorageFormat(new Date(result.calibratedTimestamp))` (single authoritative
   write; the feature's ConfirmationScreen only displayed a local string), then one `batchUpdate({dvrDateTime:
   result.dvrTime, actualDateTime, timeDifference: result.formattedDifference, timeOffsetData:
   result.timeDifferenceData, capturedImageUri, croppedImageUri, ocrConfidence, ocrRawText, ocrCleanedText,
   ocrParsedDateTime: result.parsedDateTime ? result.parsedDateTime : undefined, captureMethod: 'ocr'})`.
5. **Forensic sync snapshot** — `result.syncResult?.success ? setTimeSyncResult(result.syncResult) :
   clearTimeSyncResult()`. **This is the only place (with time-offset's "Use Current Time") that persists a
   sync result — never inside feature components.**
6. **Scope correction** — same math as time-offset, over `scopesSnapshot`:
   `calculateCorrectedTimeRange({start,end}, result.timeDifferenceData, scope.isActualTime)` and, when
   `dvrAppliesDST`, `calculateDSTAdjustedTimeRange(corrected, result.actualTime)` — note the DST collection
   time here is `result.actualTime` (the OCR flow's string), not the store's `actualDateTime`.
   Applied as a single `batchUpdate({scopes: updatedScopes})`.
   6.5 If `regenerateScopes` → `setExtractedScopes(generateExtractedScopes(updatedScopes))`.
7. **Forced persistence** — if `propagationSucceeded`, `await saveFormToLocation(true)` (bypasses dirty check
   and debounce) so the new image URIs hit SQLite immediately (prevents Zustand/SQLite divergence on crash).
   Failure is logged, non-fatal.
8. **Temp cleanup** — only when `propagationSucceeded`: `deleteSpecificTempFiles([capturedImageUri, croppedImageUri])`; failures logged, non-blocking.
9. **Toast + navigate** — `{success,'Time Offset Calculated', isDvrTimeCorrect({formattedDifference}) ? 'DVR time is CORRECT' : `DVR is ${formattedDifference} ${direction} actual time`}`, fire-and-forget `cleanupOldOcrImages()` (7-day-old orphans), then `router.push(ROUTES.FORM.TIME_OFFSET)`.

**Store fields written:** `dvrDateTime`, `actualDateTime`, `timeDifference`, `timeOffsetData`,
`capturedImageUri`, `croppedImageUri`, `ocrConfidence`, `ocrRawText`, `ocrCleanedText`, `ocrParsedDateTime`,
`captureMethod='ocr'`, `timeSyncResult`, `lastSyncTimestamp`, `scopes[]`, `extractedScopes[]`.

**Validation:** none at the route layer.

**Native deps:** `expo-camera` (`CameraView`, gated on `useIsFocused()` inside `CameraScreen`),
`@react-native-ml-kit/text-recognition` (v2), `expo-file-system` (temp files), SQLite (`saveDvrCaptureImages`,
`saveFormToLocation`), `react-native-udp` (shutter-time NTP via `captureSyncRef`).

**Web-demo notes:**
- The camera + ML Kit half is another agent's scope; for the demo, mock the whole feature as a modal that
  yields a synthetic `OcrCaptureResult` (e.g. "read" a fixture image, let the user type/confirm a DVR
  timestamp, compute `timeDifferenceData` with the same `calculateTimeDifference`).
- Reproduce the route logic faithfully: snapshot-before-await, the three-button Alert, the clear-then-write
  ordering, `captureMethod: 'ocr'`, and the forced immediate save.
- Image "propagation to case hierarchy" maps to whatever storage the demo uses (IndexedDB/object URLs);
  keep the fallback Toast when it fails.
- Note the demo must set `actualDateTime` from `calibratedTimestamp` (a number), not from a display string.

---

### Screen 6 — DVR Information (`app/(form)/dvr-information.tsx`)

Route: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/(form)/dvr-information.tsx`
Step id `dvr-information` · order 6 · removable · `field-capable`.

**Purpose:** the recorder's hardware/credentials/recording config, plus the derived retention picture
(how long until the requested footage is overwritten).

**Layout:** `FormLayout title="DVR Information" onBack={handleBack} testID="dvr-information-screen"` with
three glass `FormSection`s.

**FormSection "Basic DVR Details"** (all `TextInput`, blur-commit → `updateField`)

| Label | Placeholder | Props | Store key | Visibility id | testID |
|---|---|---|---|---|---|
| DVR Location | "e.g., Manager's office" | — | `dvrLocation` | `dvr.dvrLocation` | `dvr-location` |
| DVR Type/Brand | "e.g., Hikvision, Dahua, Lorex" | — | `dvrTypeBrand` | `dvr.dvrTypeBrand` | `dvr-type-brand` |
| Serial Number/Model Number | "Enter serial or model number" | — | `serialModelNumber` | `dvr.serialModelNumber` | `serial-model-number` |
| DVR Username | "e.g., admin" | `autoCapitalize="none"`, `autoCorrect=false` | `dvrUsername` | `dvr.dvrUsername` | `dvr-username` |
| DVR Password | "Enter DVR login password" | `autoCapitalize="none"`, `autoCorrect=false`, `spellCheck=false` — **not `secureTextEntry`** (analysts must read it back) | `dvrPassword` | `dvr.dvrPassword` | `dvr-password` |

**FormSection "Recording Configuration"**

| Element | Component | Store key | Visibility id | testID |
|---|---|---|---|---|
| Number of Channels | `TextInput` "e.g., 4, 8, 16", `keyboardType="numeric"` | `numberOfChannels` | `dvr.numberOfChannels` | `number-of-channels` |
| Active Cameras | `TextInput` "e.g., 4", numeric | `activeCameras` | `dvr.activeCameras` | `active-cameras` |
| Recording Schedule | label + two `Checkbox`es "Continuous" / "Motion" | `recordingSchedule` | `dvr.recordingSchedule` | `recording-continuous`, `recording-motion` |
| Resolution | `Picker` (`RESOLUTION_OPTIONS`) + conditional custom `TextInput` | `resolution` | `dvr.resolution` | `resolution-picker`, `custom-resolution` |
| Recording FPS | `Picker` (`FPS_OPTIONS`) + conditional custom `TextInput` numeric | `recordingFps` | `dvr.recordingFps` | `fps-picker`, `custom-fps` |

- Recording schedule is stored as a **joined string**: local state `{continuous, motion}` initialised from
  `recordingSchedule.includes('continuous'|'motion')`; on change → `updateField('recordingSchedule',
  ['continuous','motion'].filter(selected).join(', '))`. Default initial value is `"continuous"`.
- Options (`/Users/fvadev/.../src/constants/FormOptions.ts`):
  `RESOLUTION_OPTIONS` = `352x240 (CIF)`, `704x480 (4CIF)`, `960x480 (960H)`, `1280x720 (720p)`,
  `1920x1080 (1080p)`, `2560x1440 (1440p)`, `3840x2160 (4K)`, `Other (Custom)` → value `custom`.
  `FPS_OPTIONS` = 1, 5, 10, 15, 20, 25, 30, `Other (Custom)`.
- Custom mode: selecting `custom` sets local `isCustomResolution/isCustomFps = true` and **does not write the
  store** (the sentinel is never persisted); the revealed `TextInput` writes the free-text value on blur.
  Initial custom mode is derived from `isCustomResolution(resolution)` / `isCustomFps(recordingFps)`:
  empty string ⇒ *not* custom (placeholder shows); any non-empty non-standard value ⇒ custom.

**FormSection "Retention Details"**

| Element | Component | Store key | Visibility id | testID |
|---|---|---|---|---|
| First Recorded Date Available | `DateTimePickerInput mode="date"`, placeholder "Select earliest date on DVR", **`maximumDate={new Date()}`**, written as `yyyy-MM-dd` (`DateTime.fromJSDate(date).toFormat('yyyy-MM-dd')`) | `firstRecordedDate` | `dvr.firstRecordedDate` | `first-recorded-date` |
| Total DVR Retention card | `Card`: "Total DVR Retention" / `{n} days` / "Days of footage currently available on the DVR" | `totalDvrRetention` (derived) | `dvr.totalDvrRetention` | — |
| Retention Status By Scope | per-scope `Card` with status badge | `daysUntilOverwritten` (derived) | `dvr.daysUntilOverwritten` | — |
| Placeholder card | "Enter the First Recorded Date and define at least one scope to see retention information" — shown when `showFirstRecordedDate && (!firstRecordedDate || no scope has a start)` | — | — | — |

**Derived math — retention** (`/Users/fvadev/.../src/lib/utils/retention-calculation.ts`), recomputed in a
`useEffect` on `[firstRecordedDate, scopes, updateField]`:
```
totalRetention = floor((today@00:00 - firstRecordedDate@00:00) / 86_400_000)      // days
   → throws if firstRecordedDate is in the future or unparseable; on throw the effect
     logs (firstRecordedDate NOT logged — PII) and sets retentionInfo = null
per scope with a startDateTime:
   overwriteDate      = scopeStart@00:00 + totalRetention days
   daysUntilOverwritten = today >= overwriteDate ? 0 : floor((overwriteDate - today@00:00)/86_400_000)
   overwrittenDate    = 'YYYY-MM-DD'
   status = days <= 0 ? 'OVERWRITTEN' : days <= 3 ? 'CRITICAL' : days <= 7 ? 'WARNING' : 'SAFE'
store writes: updateField('totalDvrRetention', String(totalRetention))
              updateField('daysUntilOverwritten', String(minimum daysUntilOverwritten across scopes))
```
Status badge colors: CRITICAL `colors.error`, WARNING `#f59e0b`, SAFE `#10b981`, OVERWRITTEN
`colors.textSecondary` (badge background = `${color}20`). Per-scope card shows `Scope {i+1}`, the badge, the
range via `toLocaleString('en-US', {2-digit date, 2-digit time, hour12:true})` joined with " to ", then
either "Already overwritten" or `{n} days until overwritten` plus `Will be overwritten on: {date}` when n > 0.

**Caution for the demo:** this effect calls `updateField` on every `scopes` change, so simply visiting the
screen with a `firstRecordedDate` set **dirties the form** (auto-save fires on blur).

**Validation:** `dvrSchema` relaxed/unused; nothing blocks navigation. Note `dvrUsername`/`dvrPassword` are
absent from `dvrSchema` entirely.

**Navigation:** `useWizardNav('dvr-information')`; default Next label `"Next: Cameras"` (or `"Next: Export
Information"` under the canvas profile, which hides `cameras`).

**Native deps:** none (date picker only).

**Web-demo notes:**
- Pure JS. Reimplement the retention math exactly (midnight normalisation, `floor`, the 0/3/7-day status
  thresholds, and the min-across-scopes rule for `daysUntilOverwritten`).
- `recordingSchedule` is a comma-joined string, not an array — the PDF/notes read it verbatim.
- The custom resolution/FPS sentinel `custom` is UI-only state; never store it.
- The DVR password is intentionally visible plain text.
- Under the `canvas` profile most of this screen disappears (only brand, credentials, retention remain), and
  `FormSection` self-hides when all its children are gated off.

---

### Screen 7 — Camera Details (`app/(form)/cameras.tsx`)

Route: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/(form)/cameras.tsx`
Step id `cameras` · order 7 · removable (**off by default in the `canvas` profile**) · `arrayStoreKey: 'cameras'`.

**Purpose:** per-camera inventory — name/channel, resolution, FPS, and a precise GPS fix taken standing under
the camera (feeds the case map / GeoJSON export).

**Layout:** `FormLayout title="Camera Details" onBack={handleBack} testID="cameras-screen"` →
`ArrayFieldManager items={cameras} onAdd={addCamera} onRemove={removeCamera} addButtonText="Add Camera"
minItems={1} maxItems={50} testID="cameras-array"`.

**Per-camera fields** (`CameraEntry = {id, cameraName, resolution, recordingFps, latitude?, longitude?,
coordinateAccuracy?, coordinateSource?: 'gps', coordinateCapturedAt?}`):

| Field | Component | Store key | Visibility id | testID |
|---|---|---|---|---|
| Camera Name/Number | `TextInput` placeholder "e.g., CH1 - Front Entrance", blur-commit | `cameraName` | `camera.cameraName` | `camera-<i>-name` |
| Resolution | `Picker` `RESOLUTION_OPTIONS` + conditional "Custom Resolution" `TextInput` ("e.g., 1440x900") | `resolution` | `camera.resolution` | `camera-<i>-resolution`, `camera-<i>-custom-resolution` |
| Recording FPS | `Picker` `FPS_OPTIONS` + conditional "Custom FPS" `TextInput` numeric ("e.g., 12") | `recordingFps` | `camera.recordingFps` | `camera-<i>-fps`, `camera-<i>-custom-fps` |
| GPS group | `CameraGpsCapture` | `latitude`, `longitude`, `coordinateAccuracy`, `coordinateSource`, `coordinateCapturedAt` | `camera.latitude` (whole group toggles atomically via `group: 'gps:camera'`) | `camera-gps-<i>` |

**Custom mode differs from DVR Information:** here `handleResolutionChange(i,'custom')` sets
`customResolutions[i] = true` **and clears the stored value** (`handleCameraChange(i,'resolution','')`); same
for FPS. Custom-mode state is per-index local state (`Record<number, boolean>`) and is **not** derived from
the stored value on mount, so returning to the screen with a custom value shows the picker placeholder until
the user re-selects "Other (Custom)".

**`CameraGpsCapture`** (`/Users/fvadev/.../src/features/location/camera-gps/components/CameraGpsCapture.tsx`):
- 44×44 glass icon button, `locate-outline` when no fix / `locate` when a fix exists; a11y labels
  "Capture camera GPS location" / "Re-capture camera GPS location"; `ActivityIndicator` while capturing;
  error text rendered below.
- Press → `capture('precise')` — `CAMERA_ACCURACY_OVERRIDE = 'precise'` **bypasses the user's GPS settings**:
  `PRECISE_GPS_CONFIG = {targetAccuracy: 10 m, maxAttempts: 10, timeout: 120000 ms, retryDelay: 500 ms}`.
- On success → `mapGpsLocationToCameraData(location)` → route callback
  `updateArrayItem('cameras', i, {latitude, longitude, coordinateAccuracy, coordinateSource:'gps',
  coordinateCapturedAt})`. `coordinateSource` is always `'gps'` (no manual/geocoded path for cameras).
- `CoordinateDisplay` renders inline to the right when coordinates exist (6-dp, accuracy, source).
- No reverse-geocoding here (unlike the submission GPS control) — coordinates only.

**Array limits:** `addCamera` throws `ValidationError('Maximum 50 cameras allowed')` at 50 →
`{code:'CAMERA_LIMIT'}`; the UI hides Add and shows "Maximum 50 items allowed". Remove hidden at 1 item.

**Validation:** `cameraSchema` (relaxed/unused at runtime) bounds lat ±90, lon ±180, accuracy ≥ 0,
`coordinateSource: z.literal('gps')`, `coordinateCapturedAt: string`.

**Navigation:** `useWizardNav('cameras')`; default Next label `"Next: Export Information"`.

**Native deps:** `expo-location` (precise multi-sample GPS), `expo-linear-gradient`, `expo-haptics`.

**Web-demo notes:**
- Mock precise GPS with a fixture or `navigator.geolocation` at high accuracy; keep the 44×44 crosshair button,
  the icon flip after a fix, the inline coordinate readout, and the inline error line.
- Camera GPS ignores the app's GPS-accuracy setting — it is always "precise" (10 m target, 2-minute budget).
- The five GPS keys toggle as ONE visibility group; if hidden, capture UI disappears but stored coordinates
  still flow to outputs (visibility hides inputs only).
- Whole screen is absent under the `canvas` profile — the wizard's Next/Back must skip it automatically.
- Watch the custom-resolution asymmetry vs DVR Information if you want byte-for-byte parity.

---

### Cross-screen quick reference

| Store field | Written by | Read by (this half) |
|---|---|---|
| `occNumber`, `address` | case load / `formatAddress` | submission (read-only) |
| `businessName/streetAddress/city/latitude/longitude/coordinateAccuracy/coordinateSource` | submission `LocationForm` | ocr-capture (image naming) |
| `scopes[]` | requested-scope, time-offset, ocr-capture, store subscription | time-offset, dvr-information (retention), extracted-scope generator |
| `extractedScopes[]` | time-offset, ocr-capture, store subscription | requested-scope + time-offset + ocr-capture (confirmation gating) |
| `dvrDateTime/actualDateTime/timeDifference/timeOffsetData/captureMethod` | time-offset, ocr-capture | time-offset UI, store subscription |
| `dvrAppliesDST` | time-offset toggle | time-offset, ocr-capture, store subscription |
| `timeSyncResult/lastSyncTimestamp` | time-offset "Use Current Time", ocr-capture commit | SyncStatusCard, time-offset report PDF |
| `totalDvrRetention/daysUntilOverwritten` | dvr-information effect (derived) | drawer completion dots, PDF |


---

## 3. Form Wizard — Screens 8-13

Scope of this section: the back half of the `(form)` drawer wizard — `extracted-video-scope`, `export-information`, `media-capture` (route only), `audio-recording` (route only), `notes`, `completion`.

**Note on numbering.** The task numbers these 8–13, but the app's own step registry (`src/features/form-customization/config/wizard-steps.ts`) orders the *linear* wizard as: `submission`(1) → `requested-scope`(2) → `arrival-departure`(3) → `time-offset`(4) → `extracted-video-scope`(5) → `dvr-information`(6) → `cameras`(7) → `export-information`(8) → `notes`(9) → `completion`(10). `media-capture`(101) and `audio-recording`(102) are `additive: true` — drawer-accordion tools, **never** linear next/back targets. `ocr-capture` is deliberately absent from the registry. A web demo should use the registry order, not the 1–13 file listing order.

### Shared wizard chrome (applies to every screen below)

| Concern | Where | Behavior |
|---|---|---|
| Screen shell | `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/components/layout/FormLayout.tsx` | Props: `title`, `onBack`, `onExit`, `showExit`, `glassHeader` (default true), `showScanLine` (default false), `keyboardAware` (default true), `scrollable` (default true), `testID`. Renders glass header + scrollable body. |
| Section card | `src/components/form/FormSection.tsx` | `title`, `glass?`, `glassVariant?` (`'card' \| 'elevated' \| 'nestedCard'`), `collapsible?`, `required?`. Glass = `LinearGradient` + 1px border + 1px top highlight. |
| Button row | `src/components/form/FormActions.tsx` | `marginTop: 16`, `gap: 12`, vertical stack. |
| Repeatable arrays | `src/components/form/ArrayFieldManager.tsx` | Per item: glass `Card` with header `#{index+1}` + `Remove` button (shown only when `items.length > minItems`); footer `Add …` button (hidden when `items.length >= maxItems`) and a `Maximum {maxItems} items allowed` caption at the cap. Item key = `item.id` when present, else a djb2-ish hash of `JSON.stringify(item)` + index. |
| Date/time field | `src/components/form/DateTimePicker.tsx` | `mode="datetime"` renders **two** buttons (date button + time button). Value in/out is a JS `Date`; store round-trip via `toJSDate()` / `toStorageFormat()` from `src/lib/utils/datetime.ts`. |
| Storage datetime format | `src/lib/utils/datetime.ts` | `STORAGE_FORMAT = "yyyy-MM-dd'T'HH:mm:ss"`. `toStorageFormat(date)` returns `''` for invalid dates **and for years outside 2000–2100** (silently rejects with a console warning). `parseDateTime` accepts both `T` and space separators. |
| Text inputs | `src/components/common/TextInput.tsx` | Wizard text fields are **uncontrolled**: `defaultValue={storeValue}` + `onEndEditing={e => update(e.nativeEvent.text)}`. Value commits on **blur/end-editing only**, not per keystroke. A web demo must replicate this (commit-on-blur) or dirty-tracking/auto-save timing will differ. |
| Next/Back | `src/features/form-customization/hooks/useWizardNav.ts` | `const nav = useWizardNav('<stepId>')` → `{ next: { route, label: 'Next: ' + step.label } | null, prevRoute }`. Derived from the *visible* step set, so hidden steps are skipped. `handleNext = () => nav.next && router.push(nav.next.route)`; `handleBack = () => nav.prevRoute && router.push(nav.prevRoute)`. The Next button renders **only when `nav.next` exists** — `completion` has none. |
| Per-field visibility | `src/features/form-customization/config/field-registry.ts` + `useFieldVisible(id)` | Only `field-capable` steps expose per-field toggles. `extracted-video-scope` and `notes` are `screen-only` (no per-field toggles); `export-information` and `completion` are `field-capable`. |
| Auto-save (4 layers) | `src/hooks/useScreenSave.ts`, `app/(form)/_layout.tsx`, `src/hooks/useAutoSave.ts`, `AppStateHandler` | Every screen below calls `useScreenSave()` at the top of its component. On blur it checks `hasPendingChanges()` and, if dirty, fires a non-blocking `saveFormToLocation()`; failures are only `console.warn`'d (data still safe in Zustand). Layer 2 = layout `beforeRemove` blocking save with Retry/Discard/Cancel; layer 3 = 5-minute interval; layer 4 = app-background save. All saves go through `formSaveMutex.acquire()` (try-lock: a save arriving while one is in flight returns `{ executed: false }` and is skipped). |
| Dirty tracking | `src/lib/store/slices/*` | Every `updateField` / `batchUpdate` / `updateArrayItem` / array add/remove sets `isDirty` and bumps `dirtyGeneration`. `clearDirty()` runs only after a committed write **and only if `dirtyGeneration` is unchanged** (mid-save edits keep the form dirty). |

---

### 8. Extracted Video Scope — `app/(form)/extracted-video-scope.tsx`

**Purpose.** Shows the *actual* time ranges pulled off the DVR, derived automatically from the requested scopes + the calculated time offset and expanded outward to 5-minute boundaries. Always DVR time. This screen is a thin editor over a derived array; the derivation itself lives outside the screen.

**Route file:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/(form)/extracted-video-scope.tsx`
**Step id:** `extracted-video-scope`, order 5, `classification: 'screen-only'`, `arrayStoreKey: 'extractedScopes'`.

#### Rendered UI

Two mutually exclusive bodies, keyed off `extractedScopes.length > 0`:

**A. Empty state (no extracted scopes yet)** — `Card` with `borderColor: colors.textSecondary`:
- Title: `Time Offset Required`
- Body: `Please calculate the time offset first to generate extracted video scopes with 5-minute rounded boundaries.`
- Button (`variant="outline"`, testID `go-to-time-offset-button`): `Go to Time Offset` → `router.push(ROUTES.FORM.TIME_OFFSET)`. This is a deliberate cross-link and is **not** derived from `useWizardNav`.

**B. Populated state** — `FormSection title="Extracted Footage Times" glass`:
- Description line: `These are the actual times that were exported from the DVR, rounded to 5-minute boundaries for safety.`
- `ArrayFieldManager` (testID `extracted-scopes-array`, `minItems={0}`, `maxItems={10}`, `addButtonText="Add Extracted Scope"`), one card per scope:
  | Field | Component | testID | Store write |
  |---|---|---|---|
  | Start Date/Time | `DateTimePickerInput mode="datetime"` | `extracted-scope-{i}-start-datetime` | `updateArrayItem('extractedScopes', i, { startDateTime: toStorageFormat(date) })` |
  | End Date/Time | `DateTimePickerInput mode="datetime"` | `extracted-scope-{i}-end-datetime` | `updateArrayItem('extractedScopes', i, { endDateTime: toStorageFormat(date) })` |
  | Cameras | `TextInput multiline numberOfLines={3}` placeholder `List cameras for this scope`, `defaultValue` + `onEndEditing` | `extracted-scope-{i}-cameras` | `updateArrayItem('extractedScopes', i, { cameras: text })` |

  Guard in `handleScopeChange`: for the two date fields, `value instanceof Date ? value : undefined` is passed to `toStorageFormat`, so a stray string write clears the field to `''` rather than corrupting it.

**Footer:** `FormActions` → `Button testID="next-button"` labelled `nav.next.label` (`Next: DVR Information` with default visibility). Rendered only if `nav.next` exists.

#### Store slice + state

`src/lib/store/slices/extracted-scope.slice.ts` (`ExtractedScopeSlice`):

```ts
extractedScopes: ExtractedScope[]        // initial: []
addExtractedScope(): void                // throws ValidationError('Maximum 10 scopes allowed') at 10
removeExtractedScope(index): void        // ValidationError('Invalid extracted scope index') out of range
updateExtractedScope(index, updates)     // (screen uses generic updateArrayItem instead)
setExtractedScopes(scopes): void         // bulk replace — the derivation entry point
```

```ts
interface ExtractedScope {
  id: string           // expo-crypto randomUUID()
  startDateTime: string
  endDateTime: string
  cameras: string
  isActualTime: boolean   // ALWAYS false — extracted scopes are DVR time by definition
}
```

`addExtractedScope()` appends `{ id: randomUUID(), startDateTime: '', endDateTime: '', cameras: '', isActualTime: false }`. Errors route through the error slice: `ValidationError` → `setError('extractedScopes', { message, code, timestamp })`, anything else → `setGlobalError`. Error codes: `EXTRACTED_SCOPE_LIMIT`, `ADD_EXTRACTED_SCOPE_ERROR`, `EXTRACTED_SCOPE_REMOVE_ERROR`, `EXTRACTED_SCOPE_UPDATE_ERROR`, `SET_EXTRACTED_SCOPES_ERROR`.

**Validation:** none. No Zod schema gates this screen; navigation is unvalidated (per `src/lib/schemas/form-schema.ts` the only runtime gate in the whole wizard is `finalSubmissionSchema` on Completion).

**Drawer completion badge** (`src/hooks/use-section-completion.ts:253`): `extractedScopes.length === 0 → 'empty'`; otherwise `checkArray` over the visible subset of `[startDateTime, endDateTime, cameras]` per entry → `'empty' | 'partial' | 'complete'`.

---

#### THE DERIVATION — exact rules

Three files own it:
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/lib/utils/extracted-scope-generator.ts` — `generateExtractedScopes(requestedScopes)`
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/lib/utils/time-rounding.ts` — `roundDown5Minutes`, `roundUp5Minutes`
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/lib/store/actions/recalculate-corrected-times.ts` + `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/lib/store/subscriptions/scope-recalculation.ts` — the automatic regeneration path

##### Step 1 — pick the effective source times per requested scope

For each `ScopeEntry` in `scopes` (the *requested* scopes from screen 2):

```
isValidDateTime(s) := typeof s === 'string' && s.trim() !== ''

getEffectiveStartDateTime(scope):
  if scope.isActualTime === false AND isValidDateTime(scope.startDateTime):
      return scope.startDateTime                    // DVR-time scope: use the raw entry, no correction
  if isValidDateTime(scope.dstAdjustedStartDateTime): return scope.dstAdjustedStartDateTime
  if isValidDateTime(scope.correctedStartDateTime):   return scope.correctedStartDateTime
  return undefined

getEffectiveEndDateTime(scope):  identical with *EndDateTime
```

Precedence, in words:
1. **Scope entered as DVR time** (`isActualTime === false`) with a non-empty raw time → the raw entered time wins outright. No offset is applied — it is already DVR time.
2. Otherwise (**scope entered as Real time**, or DVR-time scope with a blank raw field) → `dstAdjusted*` **beats** `corrected*`. `dstAdjusted*` exists only when the `dvrAppliesDST` toggle was on during calculation.
3. Neither present → `undefined`.

##### Step 2 — filter

A requested scope is included **only if both** effective start and effective end resolve to a defined string. Scopes that fail are silently dropped — the extracted array can be shorter than the requested array, and indices do **not** correspond.

##### Step 3 — round outward to 5-minute boundaries

Both rounders parse "naively": the string is trimmed, its first space is replaced with `T`, and it is parsed with **Luxon `DateTime.fromISO(x, { zone: 'utc' })`** — i.e. wall-clock semantics, no DST/TZ shifting. Invalid or empty input → `''` (which produces an extracted scope with an empty boundary — the generator does not re-filter after rounding).

```
roundDown5Minutes(input):            // START boundary
  dt = parseNaive(input); if !dt return ''
  if (dt.minute % 5 === 0 && dt.second === 0) return dt.toFormat(STORAGE_FORMAT)   // exact boundary: unchanged
  return dt.set({ minute: floor(dt.minute / 5) * 5, second: 0, millisecond: 0 })

roundUp5Minutes(input):              // END boundary
  dt = parseNaive(input); if !dt return ''
  if (dt.minute % 5 === 0 && dt.second === 0) return dt.toFormat(STORAGE_FORMAT)   // exact boundary: unchanged
  m = ceil((dt.minute + (dt.second > 0 ? 1 : 0)) / 5) * 5
  if (m >= 60) return dt.plus({ hours: 1 }).set({ minute: 0, second: 0, millisecond: 0 })
  return dt.set({ minute: m, second: 0, millisecond: 0 })
```

Output format is always `STORAGE_FORMAT` = `yyyy-MM-dd'T'HH:mm:ss` — note this **normalizes** the space-separated `YYYY-MM-DD HH:MM:SS` strings produced by `applyTimeOffset` in `bidirectional-time.ts` back to `T` form.

Worked examples (start / end):
| Input | roundDown5 | roundUp5 |
|---|---|---|
| `13:03:30` | `13:00:00` | `13:05:00` |
| `13:00:00` | `13:00:00` (untouched) | `13:00:00` (untouched) |
| `13:05:01` | `13:05:00` | `13:10:00` — the `+1` when `second > 0` is what pushes an exact-minute-boundary-with-seconds up instead of leaving it |
| `13:59:00` | `13:55:00` | `14:00:00` |
| `2025-06-01 23:58:00` | `23:55:00` | `2025-06-02T00:00:00` — **date rolls over** |
| `` / garbage | `''` | `''` |

Net effect: the extracted window is **never narrower** than the corrected window — start expands backward, end expands forward, up to <5 min on each side. Zero expansion when both endpoints already sit exactly on a 5-minute boundary with zero seconds.

##### Step 4 — emit

```ts
{
  id: randomUUID(),
  startDateTime: roundDown5Minutes(effectiveStart),
  endDateTime:   roundUp5Minutes(effectiveEnd),
  cameras: scope.cameras,        // copied verbatim from the requested scope
  isActualTime: false,           // hardcoded
}
```

**Every regeneration mints new `id`s** — React keys change, and any per-row UI state is lost.

##### Regeneration triggers (the complete set)

| # | Trigger | File | Guard / UX |
|---|---|---|---|
| 1 | **Calculate Time Offset** on the Time Offset screen | `app/(form)/time-offset.tsx:330` (`performCalculation`) | If `extractedScopes.length > 0`, an `Alert` first: title `Recalculate Time Offset?`, body `This will reset your extracted video scopes. Any manual edits to the extracted times will be lost.`, buttons `Cancel` / `Continue`. On Continue: `batchUpdate({ timeDifference, timeOffsetData, captureMethod: 'manual' })`, per-scope `calculateCorrectedTimeRange` (+ `calculateDSTAdjustedTimeRange` when `dvrAppliesDST`), then `setExtractedScopes(generateExtractedScopes(updatedScopes))`. If the list is empty it runs directly. |
| 2 | **OCR timestamp capture completes** | `app/(form)/ocr-capture.tsx:228` | If `extractedScopes.length > 0`, 3-way `Alert` `Recalculate Time Offset` / `Recalculating will update the time offset. What would you like to do with your extracted video scopes?` → `Cancel` (navigates to Time Offset, no calc) / `Keep My Edits` (`performOcrCalculation(result, false)` — corrected times update, extracted array untouched) / `Regenerate Scopes` (destructive, `performOcrCalculation(result, true)` → `setExtractedScopes(generateExtractedScopes(updatedScopes))`). Empty list → regenerate unconditionally. |
| 3 | **Scope time-type toggle** (`isActualTime`) on Requested Scope | `app/(form)/requested-scope.tsx:40-76` | Only when `extractedScopes.length > 0`: 3-way `Alert` `Recalculate Time Offset` → `Cancel` (field NOT written), `Keep My Edits` (writes `isActualTime`, no regeneration), `Regenerate Scopes` (destructive; writes the field **and** immediately `setExtractedScopes(generateExtractedScopes(locallyUpdatedScopes))` using the existing corrected times). |
| 4 | **Requested start/end datetime edit** | `app/(form)/requested-scope.tsx:79-98` | Only when `extractedScopes.length > 0`: 2-way `Alert` `Update Requested Time?` / `Changing the requested time will recalculate your corrected times and regenerate extracted video scopes. Any manual edits to extracted times will be lost.` → `Cancel` / `Update` (destructive). `Update` only writes the field; regeneration then happens via trigger 5. |
| 5 | **Store subscription** (the automatic path) | `src/lib/store/subscriptions/scope-recalculation.ts` | Singleton Zustand `subscribe`. Composite key = `scopes.map(s => `${s.startDateTime}\|${s.endDateTime}\|${s.isActualTime}`).join(',') + '::' + actualDateTime + '::' + JSON.stringify(timeOffsetData) + '::' + String(dvrAppliesDST)`. Corrected/DST **output** fields are deliberately excluded (loop prevention). On key change: bail if `!timeOffsetData \|\| !actualDateTime`; else `queueMicrotask(...)` with a module-level `isRecalculating` re-entry guard → `recalculateCorrectedTimes(store.getState())` → apply each `scopeUpdates` entry via `updateArrayItem('scopes', i, updates)` → `setExtractedScopes(result.newExtractedScopes)` when non-null. |

`recalculateCorrectedTimes` (`src/lib/store/actions/recalculate-corrected-times.ts`) — the pure core of trigger 5:
- **Guards → `{ scopeUpdates: [], newExtractedScopes: null }`**: no `timeOffsetData`, no `actualDateTime`, or `scopes` empty.
- **Per-scope skip** (returned unchanged, still fed to the generator): missing `correctedStartDateTime` (i.e. never calculated), or empty `startDateTime`/`endDateTime`.
- Per surviving scope: `calculateCorrectedTimeRange({start,end}, timeOffsetData, scope.isActualTime)` → sets `correctedStartDateTime`/`correctedEndDateTime` and **clears** `dstAdjusted*` + `dstAdjustmentApplied` to `undefined`; if `dvrAppliesDST`, recomputes them via `calculateDSTAdjustedTimeRange(correctedRange, actualDateTime)`.
- Per-scope error isolation: a throw is swallowed and the original scope is kept.
- **Critical**: `newExtractedScopes` is computed **only if `extractedScopes.length > 0`** — the subscription never *creates* the extracted array, it only refreshes an existing one. First creation must come from triggers 1–3.

Underlying offset math (`src/lib/utils/bidirectional-time.ts`), needed to reproduce the inputs:
- `calculateTimeDifference(dvr, actual)`: both parsed as `new Date(x.replace(' ','T') + 'Z')` (UTC trick = wall-clock, DST-agnostic). `differenceMs = dvr - actual`; `direction = diff > 0 ? 'AHEAD OF' : 'BEHIND'`; `formattedDifference = HH:MM:SS` of `floor(|ms|/1000)` with 2-digit padding (hours are **not** capped at 24).
- `calculateCorrectedTimeRange(range, diff, isActualTime)`: `shouldAdd = (isActualTime && isDvrAhead) || (!isActualTime && !isDvrAhead)`; both endpoints get `±|differenceMs|` in UTC wall-clock arithmetic; output format `YYYY-MM-DD HH:MM:SS` (space separator); returned `isActualTime` is **inverted**.
- `calculateDSTAdjustedTimeRange(range, collectionDateTime)`: `adjustmentHours = isInDST(collectionDateTime) ? -1 : +1`, applied uniformly to both endpoints. `isInDST` resolves against the **device/local zone** via Luxon.

##### Manual override behavior

There is **no** override protection. Manual edits on this screen are plain `updateArrayItem` writes with no `manuallyEdited` flag (contrast: the notes sections). Any of the five triggers above replaces the entire array wholesale. That is exactly why triggers 1–4 gate behind destructive confirm dialogs. `Keep My Edits` in triggers 2 and 3 is the only way to change offset inputs without losing edits — and it leaves the extracted array **stale relative to the new offset**, silently.

##### What happens when the scope type changes

Changing `isActualTime` on a requested scope flips which branch of `getEffectiveStartDateTime` fires:
- `true → false` (Real → DVR): the extracted scope now derives from the **raw entered** `startDateTime`/`endDateTime`, ignoring corrected/DST values entirely.
- `false → true` (DVR → Real): it now derives from `dstAdjusted*` (preferred) or `corrected*`; if neither exists yet the scope is **dropped from the extracted list**.

Trigger 3's `Regenerate Scopes` path regenerates immediately from locally-patched scopes; trigger 5 also fires because `isActualTime` is in the composite key, which recomputes corrected times first and then regenerates. Both converge.

**Web-demo notes:**
- Pure JS. Luxon (or dayjs/date-fns with UTC plugin) reproduces `parseNaiveDateTime` + rounding exactly; the "parse as UTC" trick is the whole DST-agnostic story.
- `expo-crypto randomUUID()` → `crypto.randomUUID()`.
- `isInDST` (used by the DST branch) resolves against the *host* timezone — pin a zone (`America/Toronto`) in the demo or the DST toggle will behave differently for a UTC visitor.
- Replicate the confirm `Alert`s as modals with the exact button sets — they are the only thing protecting manual edits.
- No native modules on this screen beyond SQLite-backed auto-save (mockable with localStorage/IndexedDB).

---

### 9. Export Information — `app/(form)/export-information.tsx`

**Purpose.** Records how the recovered footage was packaged and handed over.

**Route file:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/(form)/export-information.tsx`
**Step id:** `export-information`, order 8, `classification: 'field-capable'`.

**Structure:** `FormLayout title="Export Information"` (testID `export-information-screen`) → single `FormSection title="Export Details" glass` → `FormActions` with the Next button (testID `next-button`).

#### Fields (all five individually toggleable via Form Customization)

| # | Label | Component | Store field | Options / input | testID | Visibility id |
|---|---|---|---|---|---|---|
| 1 | Export Media | `Picker` (`src/components/common/Picker.tsx`), placeholder `Select export media type` | `exportMedia: string` | `EXPORT_MEDIA_OPTIONS` = `USB Drive`, `External Hard Drive`, `DVD`, `Cloud Upload`, `Network Transfer`, `Other` | `export-media-picker` | `export.exportMedia` |
| 2 | File Type | `Picker`, placeholder `Select file type` | `fileType: string` | `FILE_TYPE_OPTIONS` = `MP4`, `AVI`, `MOV`, `MKV`, `Proprietary`, `Other` | `file-type-picker` | `export.fileType` |
| 3 | Size (GB) | `TextInput` `keyboardType="decimal-pad"`, placeholder `e.g., 2.5`, uncontrolled (`defaultValue` + `onEndEditing`) | `sizeGb: string` (stored as a **string**, not a number) | free text | `size-gb` | `export.sizeGb` |
| 4 | Media Player Included | `Switch` (`src/components/common/Switch.tsx`) | `mediaPlayerIncluded: boolean` | — | `media-player-included` | `export.mediaPlayerIncluded` |
| 5 | Media Provided Via | `Picker`, placeholder `Select delivery method` | `mediaProvidedVia: string` | `MEDIA_PROVIDED_OPTIONS` = `Hand Delivered`, `Mailed`, `Left with Contact`, `Electronic Transfer`, `Other` | `media-provided-via-picker` | `export.mediaProvidedVia` |

Option arrays: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/constants/FormOptions.ts`. Registry: `src/features/form-customization/config/field-registry.ts:84-88`.

**Store slice:** `src/lib/store/slices/export.slice.ts` / `ExportSlice` in `src/lib/store/types.ts:206`. Initial state (`src/lib/store/initial-state.ts:145`): all strings `''`, `mediaPlayerIncluded: false`. Every write is the generic `updateField(key, value)`; each sets `isDirty`.

**Validation:** `exportSchema` in `src/lib/schemas/form-schema.ts:101` exists but **is never invoked at runtime** — all fields optional, and the aggregation map that once consumed it (`sectionSchemas`) was deliberately deleted (PF-09 note in that file). No UI validation on this screen.

**Drawer completion badge** (`use-section-completion.ts:283`): `checkFields` over the *visible* subset of `[exportMedia, fileType, sizeGb, mediaProvidedVia]` — `mediaPlayerIncluded` (boolean) is excluded from the calculus.

**Downstream consumers of these fields:**
- Notes `export` section formatter (`formatExport`) — see screen 12.
- PDF section 8 "Export Information" (gated by `hasExportInfo`).
- Completion screen summary line: `Export: {sizeGb}GB via {exportMedia || 'N/A'}`.

**Web-demo notes:**
- Zero native dependencies; pure form. Only the shared auto-save writes to SQLite.
- Reproduce `sizeGb` as a *string* field — `2.5` and `2.50` are different values downstream and the notes template concatenates it raw (`• 2.5GB of video was exported to …`).
- Reproduce the uncontrolled commit-on-blur behavior for `sizeGb`.

---

### 10. Media Capture — `app/(form)/media-capture.tsx` (ROUTE LEVEL ONLY)

**Purpose.** Route wrapper for photo/video capture. Owns Zustand access, the SQLite `saveMedia` write, temp-file cleanup, and navigation; the capture feature itself (`MediaCaptureFlow`) is pure and callback-driven. Covered elsewhere: the feature internals under `src/features/media/video-image-capture/`.

**Route file:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/(form)/media-capture.tsx`
**Step id:** `media-capture`, order 101, `additive: true` (drawer tool, not in linear next/back). Drawer screen option: `freezeOnBlur: true`.

#### Component tree

```
MediaCaptureRoute (default export)
└── ErrorBoundary  (src/components/error/ErrorBoundary.tsx)
    │   fallback → ErrorFallback: "Something went wrong" + error.message
    │              + "Go Back" Button; logs via logError({context:'media-capture-error-boundary'})
    └── MediaCaptureContent
        └── <MediaCaptureFlow onComplete onCancel isSaving />   (@/features/media/video-image-capture)
```

#### Store access (selective subscriptions only)

```ts
useScreenSave()
const currentCaseId     = useFormStore(s => s.currentCaseId)      // case-management slice
const currentLocationId = useFormStore(s => s.currentLocationId)
```
No other store reads. The route never mutates the form store — media lives in SQLite `media_files`, not in the form blob.

#### Local state / refs

| Name | Purpose |
|---|---|
| `isSaving` (state) | Drives the flow's loading UI / disables the save button. |
| `isSavingRef` (ref) | **Authoritative** double-invoke guard. Set synchronously at the top of `handleComplete`; the React batching window between button press and re-render means `isSaving` state can still read `false`. |
| `isMountedRef` (ref) | Guards `setState` after unmount — a save can outlive the component. |
| `drawerTimeoutRef` (ref) | Holds the drawer-reopen `setTimeout` so unmount can `clearTimeout` it. |

#### `handleComplete(result: MediaCaptureResult)` — exact sequence

1. `if (isSavingRef.current) return;` then `isSavingRef.current = true`.
2. **Context validation.** If `!currentCaseId || !currentLocationId`: `logError(new Error('Missing case/location context'), { context: 'media-capture-save', hasCaseId, hasLocationId })`, Toast `{ type:'error', text1:'Cannot Save Media', text2:'No location selected. Please navigate from a case first.', position:'top' }`, reset the ref, `navigateBack()`, return.
3. `setIsSaving(true)`.
4. Derive: `mediaType = result.type === 'photo' ? MediaType.IMAGE : MediaType.VIDEO`; `category = result.type === 'photo' ? ImageCategory.CAMERA_PHOTO : undefined`; `extension = photo ? 'jpg' : 'mp4'`; `filename = `${result.userFilename}.${extension}``.
5. `metadata = { capturedAt: result.capturedAt, caption: result.caption }`, plus `duration` when `result.duration !== undefined`.
6. `await saveMedia({ caseId, locationId, sourceUri: result.uri, type, category, filename, metadata })` — from `@/features/case-management` (copies the file into the case hierarchy on the filesystem and inserts a `media_files` row).
7. `await deleteCaptureTempFiles([result.uri])` — failure is caught and `logError`'d (`context: 'media-capture-temp-cleanup'`), never fatal.
8. **Reset before navigating** (`if (isMountedRef.current) setIsSaving(false)`, `isSavingRef.current = false`) — a documented pitfall: skipping this leaves the flag set on the next visit.
9. Success Toast: `text1` = `Photo Saved` / `Video Saved`, `text2` = `${result.userFilename} saved to case`.
10. `navigateBack()`.
11. On any throw: `logError(..., { context:'media-capture-save', type, caseId, locationId })`, Toast `Save Failed` / `Could not save media. Please try again.`, reset both flags so the user can retry (**no** navigation — the user stays on the preview).

`handleCancel()` → `navigateBack()` directly.

#### `returnTo` allowlist validation

`validateReturnTo` lives in `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/lib/utils/navigation.ts`:

```ts
export const VALID_FORM_ROUTES = ['submission','requested-scope','arrival-departure','time-offset',
  'extracted-video-scope','dvr-information','cameras','export-information','notes',
  'ocr-capture','media-capture','audio-recording','completion'] as const

validateReturnTo(returnTo) => returnTo && VALID_FORM_ROUTES.includes(returnTo) ? returnTo : null
```

Read via `useLocalSearchParams<{ returnTo?: string }>()`. Purpose: block parameter-injection navigation to arbitrary routes.

#### Drawer reopen pattern

```ts
const DRAWER_OPEN_DELAY = 300   // matches the drawer animation duration

navigateBack():
  if (safeReturnTo) {
    router.push(`/(form)/${safeReturnTo}`)
    drawerTimeoutRef.current = setTimeout(
      () => navigation.dispatch(DrawerActions.openDrawer()), DRAWER_OPEN_DELAY)
  } else {
    router.back()        // invalid returnTo is warned about in __DEV__ and falls through here
  }
```
`ErrorFallback` repeats the same push+reopen (without the ref cleanup).

**Native deps at the route level:** `expo-sqlite` (via `saveMedia`), filesystem (media copy + `deleteCaptureTempFiles`), `react-native-toast-message`, drawer navigation. The camera itself (`react-native-vision-camera`) belongs to the feature; the route only passes `isSaving`.

**Web-demo notes:**
- Mock `saveMedia` as an IndexedDB/in-memory insert returning `{ id, path }`; keep the `caseId`/`locationId` precondition and its error toast — it's a visible behavior.
- Mock `deleteCaptureTempFiles` as a no-op resolved promise (and keep the "cleanup failure is non-fatal" branch).
- The double-save ref guard is reproducible verbatim in React; keep it — it is the documented reason two rapid taps don't create two media rows.
- Reproduce the `returnTo` allowlist literally; an invalid value must fall back to history-back, not throw.
- Drawer reopen: in a web demo, the equivalent is re-opening the step navigation panel 300 ms after route change.
- Camera capture itself needs `getUserMedia` or a canned-asset picker.

---

### 11. Audio Recording — `app/(form)/audio-recording.tsx` (ROUTE LEVEL ONLY)

**Purpose.** Route wrapper for audio recording. Structurally a near-clone of media-capture; the differences are the media type, the filename extension, the metadata keys, and the temp-cleanup helper.

**Route file:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/(form)/audio-recording.tsx`
**Step id:** `audio-recording`, order 102, `additive: true`. Drawer option `freezeOnBlur: true`.

```
AudioRecordingRoute
└── ErrorBoundary (fallback: "Something went wrong" + fixed copy
    "An unexpected error occurred during audio recording. Please try again." + Go Back;
     logError context 'audio-recording-error-boundary')
    └── AudioRecordingContent
        └── <AudioRecordingFlow onComplete onCancel isSaving />  (@/features/media/audio-recording)
```

Identical scaffolding to screen 10: `useScreenSave()`, `currentCaseId`/`currentLocationId` selective subscriptions, `isSaving` state, `isSavingRef` / `isMountedRef` / `drawerTimeoutRef`, `validateReturnTo`, `DRAWER_OPEN_DELAY = 300`.

#### Double-save guard

Same mechanism, same rationale comment: `if (isSavingRef.current) return; isSavingRef.current = true;` at the very top of `handleComplete`, **before** any await. `isSaving` state exists only to drive UI. The ref is reset on the missing-context path, the success path (before navigation), and the error path.

#### `handleComplete(result: AudioRecordingResult)` — exact sequence

1. Ref guard.
2. Missing case/location → `logError({ context: 'audio-recording-save', hasCaseId, hasLocationId })`, Toast `{ type:'error', text1:'Cannot Save Audio', text2:'No location selected. Please navigate from a case first.' }`, reset ref, `navigateBack()`, return.
3. `setIsSaving(true)`.
4. `filename = `${result.userFilename}.m4a`` (extension hardcoded).
5. `metadata = { capturedAt, durationMs, caption }` + optional `fileSize` and `mimeType` when defined.
6. `await saveMedia({ caseId, locationId, sourceUri: result.uri, type: MediaType.AUDIO, filename, metadata })` — **no `category`** (unlike photos).
7. **Temp-file cleanup:** `await deleteAudioTempFiles([result.uri])`, `.catch` → `logError({ context: 'audio-recording-temp-cleanup', uri })`. Non-fatal by design; cleanup runs only *after* a successful `saveMedia`, so a failed save never destroys the recording.
8. Reset `isSaving` (mount-guarded) and `isSavingRef` before navigating.
9. Toast `{ type:'success', text1:'Audio Saved', text2: `${result.userFilename} saved to case` }`.
10. `navigateBack()`.
11. Throw path: `logError({ context:'audio-recording-save', caseId, locationId })`, Toast `Save Failed` / `Could not save audio. Please try again.`, reset flags, stay put.

**Native deps at the route level:** SQLite (`saveMedia`), filesystem (`deleteAudioTempFiles`), toast, drawer. The recorder (`@siteed/expo-audio-studio`) and player (`expo-audio`) belong to the feature. Per `app/README.md`, the feature — not the route — tears the native session down on blur (`useAudioCapture`'s `useFocusEffect` cleanup + `AudioRecordingFlow` bumping `recorderKey`); `freezeOnBlur` alone does not release native resources.

**Web-demo notes:**
- `MediaRecorder` + `getUserMedia` for real recording, or a canned waveform + fake blob.
- Mock `saveMedia` and `deleteAudioTempFiles` exactly as for media-capture; keep the ordering (save → cleanup → reset → toast → navigate).
- The `.m4a` extension is hardcoded — if the web demo records `.webm`, either keep the display name `.m4a` for fidelity or note the deviation.
- Everything else (guards, allowlist, drawer reopen) is identical to screen 10 — share one implementation.

---

### 12. Notes — `app/(form)/notes.tsx`

**Purpose.** A terminal-styled, always-dark editor over **seven independently-tracked auto-generated sections** plus a free-text tail. Each section auto-tracks its formatter's output until the user edits it; edits are never clobbered.

**Route file:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/(form)/notes.tsx`
**Feature:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/documentation/notes/` (README at `.../notes/README.md`)
**Step id:** `notes`, order 9, `classification: 'screen-only'`.

#### Component tree + files

```
NotesRoute                                    app/(form)/notes.tsx
└── ErrorBoundary  (fallback: title "Something went wrong", body = error.message
    │               or "An unexpected error occurred on the notes screen", "Go Back")
    └── NotesContent
        └── FormLayout title="Case Notes" scrollable={false} keyboardAware={false} testID="notes-screen"
            ├── View testID="notes-card"  (glass chrome: 1px top highlight + LinearGradient, flex:1)
            │   └── NotesSectionEditor           src/features/documentation/notes/components/NotesSectionEditor.tsx
            │       └── ForceColorScheme("dark")
            │           └── KeyboardAwareScrollView testID="notes-editor-scroll"   ← the page's ONLY scrollable
            │               ├── [banner] "Auto-generation is off — restore anytime" + Restore
            │               │       (rendered only when sections.length>0 && every section manuallyEdited)
            │               ├── SectionBlock × 7 (registry order)   .../components/SectionBlock.tsx
            │               └── TextInput testID="notes-free-text" placeholder "Additional notes"
            ├── NotesEditorFooter testID="notes-editor-footer"      .../components/NotesEditorFooter.tsx
            │       "Copy all"  ·  "Write my own notes…"
            └── FormActions → Button testID="notes-next-button" (label = nav.next.label → "Next: Completion")
```

Layout contract: the **shell is fixed** (`scrollable={false} keyboardAware={false}`) and the editor's inset owns scrolling *and* keyboard handling. Panel background keys off the app scheme (`#0b1420` light / `#060a12` dark) with border `#141c28`; contents are wrapped in `ForceColorScheme('dark')` so every themed child recolors in both app themes. `keyboardEnabled={useIsFocused()}` gates the inset's keyboard listener (all form screens stay mounted under the drawer; ungated listeners would stack).

#### Store slice + state (Completion slice — notes fields live there)

`src/lib/store/types.ts:218` `CompletionSlice`:
```ts
notesSections: NoteSection[]     // initial []
notesFreeText: string            // initial ''
notes?: string                   // DERIVED, only written during persistence
notesManuallyEdited?: boolean    // DERIVED
```

```ts
type NoteSectionId = 'address'|'timeOffset'|'scopes'|'retention'|'cameras'|'export'|'timeOnScene'

interface NoteSection {
  id: NoteSectionId
  content: string            // displayed/exported text: formatter output OR the user's replacement
  generatedContent: string   // what the formatter produced when LAST APPLIED — frozen staleness baseline
  userAddendum?: string      // annotation printed after content, same block; survives regen AND reset
  manuallyEdited: boolean    // true only when the user REPLACED (or deleted) the generated text
}
```

The screen subscribes to `notesSections`, `notesFreeText`, `updateField`, `batchUpdate` only. All six commit callbacks read `useFormStore.getState()` **fresh at call time** so two blocks flushing in one tick compose instead of clobbering.

**Validation:** `notesSchema` (`form-schema.ts:110`) is optional and never invoked. No validation on this screen.

**Drawer completion badge** (`use-section-completion.ts:293`): two-state only — `'complete'` if any section has non-empty `content` or a `userAddendum`, or `notesFreeText` is non-blank; else `'empty'`. Never `'partial'`.

---

#### THE GENERATION — section registry, order, and exact text templates

`SECTION_DEFINITIONS` (`src/features/documentation/notes/services/section-registry.ts`) is the single source of truth for identity, **display order**, and labels. Order is exactly:

| # | id | label (UI/dialog copy) | formatter | file |
|---|---|---|---|---|
| 1 | `address` | `address & visits` | `formatAddressAndVisits` | `formatters/address-formatter.ts` |
| 2 | `timeOffset` | `time offset` | `formatTimeOffset` | `formatters/time-offset-formatter.ts` |
| 3 | `scopes` | `recovered footage` | `formatScopes` | `formatters/scopes-formatter.ts` |
| 4 | `retention` | `dvr retention` | `formatRetention` | `formatters/retention-formatter.ts` |
| 5 | `cameras` | `cameras` | `(): string => ''` — **DISCONNECTED** by product decision (PR-86). `formatCameras` still exists and is tested but is not wired; the PDF's camera table is the canonical camera surface. | `formatters/camera-formatter.ts` |
| 6 | `export` | `export` | `formatExport` | `formatters/export-formatter.ts` |
| 7 | `timeOnScene` | `time on scene` | `formatTimeOnScene` | `formatters/time-on-scene-formatter.ts` |

Formatter input is always `NotesRelevantFormData`, built by the **one** coercion site `extractNotesRelevantData(state)` (`services/notes-relevant-data.ts`):

```ts
{
  address: state.address || '',
  businessName: state.businessName || undefined,
  streetAddress: state.streetAddress || undefined,
  city: state.city || undefined,
  arrivalDepartures: state.arrivalDepartures || [],
  scopes: state.scopes || [],
  extractedScopes: state.extractedScopes || [],
  cameras: state.cameras || [],
  timeOffsetData: state.timeOffsetData,          // { formattedDifference, direction }
  totalDvrRetention: state.totalDvrRetention || '',
  exportMedia: state.exportMedia || '',
  sizeGb: state.sizeGb || '',
  mediaProvidedVia: state.mediaProvidedVia || '',
}
```
Any second call site with different `''`/`[]`/`undefined` coercions flips every output comparison — reproduce this exactly.

##### Leaf: `formatTimestamp(ts)` (`formatters/format-timestamp.ts`)
```
'' or whitespace          → ''
present but unparseable   → the RAW input string (deliberately visible, PR-84 C1)
otherwise                 → `YYYY-MM-DD HH:MM:SS` using LOCAL getters
                             (getFullYear/getMonth+1/getDate/getHours/getMinutes/getSeconds, 2-padded)
```

##### 1. `address` — `formatAddressAndVisits(fd)` — progressive Tier 0–3

`locationString = formatAddress(businessName, streetAddress, city) || address` (`src/lib/utils/address-formatting.ts` — dedupes the business name and abbreviates street types).

- **Tier 0** — no `locationString` → `''`
- `renderedScopes = scopes.filter(s => s.startDateTime && s.endDateTime)`
- **Tier 1** — `renderedScopes.length === 0`:
  ```
  • Attended {locationString} to recover requested video evidence.
  ```
- **Tier 2/3** — header + per-scope blocks:
  ```
  • Attended {locationString} to recover requested video evidence from:
  Scope 1:
  {requestedLabel}: {fmt(startDateTime)} to {fmt(endDateTime)}
  [{correctedLabel}: {fmt(correctedStartDateTime)} to {fmt(correctedEndDateTime)}]   ← Tier 3 only
  Scope 2:
  …
  ```
  - `requestedLabel = scope.isActualTime ? 'Real Time' : 'DVR Time'`; `correctedLabel` is the opposite.
  - The corrected line appends **only** when both `correctedStartDateTime` and `correctedEndDateTime` are present.
  - Exactly one `\n` between scopes (none after the last). Numbering counts **rendered** scopes, so filtered-out scopes do not consume a number.
  - Note the header ends with `from:` in tiers 2/3 vs a full stop in tier 1.

##### 2. `timeOffset` — `formatTimeOffset(fd)`
```
no timeOffsetData                                   → ''
isDvrTimeCorrect(timeOffsetData)                    → '• Time offset: DVR time is CORRECT.'
otherwise → `• Time offset: DVR is {formattedDifference} {direction} real time.`
            e.g. '• Time offset: DVR is 00:04:12 BEHIND real time.'
```
`isDvrTimeCorrect` (`src/lib/utils/bidirectional-time.ts:49`) keys off the **displayed string** `formattedDifference === '00:00:00'`, never `differenceMs` (persistence reconstructs `differenceMs` as `… || 0` and would misreport imported offsets).

##### 3. `scopes` — `formatScopes(fd)` — extracted scopes take priority

Camera-name normalization (shared): `processCameraNames(raw)` → `'requested cameras'` when blank/whitespace; otherwise split on `/[,\n]/`, trim each, drop empties, join with `', '`.

**Path A — `extractedScopes` non-empty** (`formatExtractedScopes`). Valid = both datetimes truthy. If none valid, fall through to Path B.
- Exactly one valid scope (and both timestamps format non-empty):
  ```
  • Recovered {cameras} from {fmt(start)} to {fmt(end)} (DVR time)
  ```
  If either formatted timestamp is `''` → returns `''` (falls through to Path B).
- Multiple valid scopes:
  ```
  • Recovered the following footage:
     1. {cameras} from {fmt(start)} to {fmt(end)} (DVR time)
     2. …
  ```
  Numbered lines are prefixed with **three spaces**, joined by `\n`.

**Path B — fall back to requested `scopes`.** `''` when `scopes` is empty or no scope has both datetimes.
Per scope (`formatRequestedScope`), `timeType = isActualTime ? 'actual' : 'DVR'`:
- Without corrected times: `{cameras} from {fmt(start)} to {fmt(end)} ({timeType} time)`
- With both corrected times (`correctedType = isActualTime ? 'DVR' : 'actual'`):
  `{cameras} from {fmt(start)} to {fmt(end)} ({timeType} time, requested) / {fmt(cStart)} to {fmt(cEnd)} ({correctedType} time, corrected)`
- Single valid scope → `• Recovered {text}`; multiple → `• Recovered the following footage:\n` + `   {n}. {text}` lines joined by `\n`.

##### 4. `retention` — `formatRetention(fd)`
```
!totalDvrRetention → ''
else               → `• DVR retention period: {totalDvrRetention} days`
```

##### 5. `cameras` — currently `''` (registry-disconnected)
Re-enabling is two lines in `section-registry.ts` (`formatter: fd => formatCameras(fd.cameras ?? [])`). `formatCameras` output, for reference:
```
• Camera {index+1}: {cameraName}          ← skipped entirely when cameraName is falsy
  Resolution: {resolution || 'N/A'} | FPS: {recordingFps || 'N/A'}
  GPS Location: {lat.toFixed(6)}, {lng.toFixed(6)}[ (±{round(accuracy)}m)]
```
The GPS line is emitted only when both coords are defined **and** `hasCapturedCoordinates({latitude,longitude})` passes (rejects NaN/Infinity/out-of-range and the exact `(0,0)` pair — BUG-008/BUG-024). Lines joined by `\n`.

##### 6. `export` — `formatExport(fd)`
```
!sizeGb || !exportMedia → ''
base:  `• {sizeGb}GB of video was exported to {exportMedia}`
if mediaProvidedVia:  += `, and provided via {mediaProvidedVia}`
always += '.'
→ '• 2.5GB of video was exported to USB Drive, and provided via Hand Delivered.'
```

##### 7. `timeOnScene` — `formatTimeOnScene(fd)`
- `''` when `arrivalDepartures` empty, or no visit has both timestamps.
- `validVisits = arrivalDepartures.filter(v => v.arrivalDateTime && v.departureDateTime)`.
- `calculateDuration(a, b)` = `Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000))`, but returns **`NaN`** when the subtraction is `NaN` (unparseable) — deliberately propagated so it poisons the total.
- `totalMinutes = sum of durations`; `totalLabel = Number.isNaN(totalMinutes) ? 'unable to calculate (invalid timestamp)' : formatDuration(totalMinutes)`.
- `formatDuration(min)`: `{h} hour[s]` when `h>0`; ` ` + `{m} minute[s]` when `m>0` (space only if hours already present); `'0 minutes'` when both zero. Pluralization is `!== 1`.
- Single visit:
  ```
  • On scene from {fmt(arrival)} to {fmt(departure)}
  • Total time: {totalLabel}
  ```
- Multiple visits:
  ```
  • On scene for multiple visits:
     Visit 1: {fmt(arrival)} to {fmt(departure)}
     Visit 2: …
  • Total time: {totalLabel}
  ```
  Visit lines are prefixed with three spaces and each ends with `\n` (so there is a newline before `• Total time:`).

##### Flat assembly — `assembleNotesString(sections, freeText)` (`services/notes-assembler.ts`)

```
1. sort sections by SECTION_ORDER (= registry order); unknown ids sort last (Infinity)
2. per section, block = [content, userAddendum].filter(non-empty).join('\n')
3. drop blocks whose length is 0
4. parts = []; if blocks.length: parts.push(blocks.join('\n\n')); if freeText.length: parts.push(freeText)
5. return parts.join('\n\n')
```
So: sections separated by a blank line; an addendum sits on its own line **inside** its section block; a deleted section carrying an addendum renders the addendum alone; free text is always last, separated by a blank line.

---

#### RECONCILIATION — change detection is output comparison (no hashing)

`services/section-reconciler.ts`:

```ts
freshSectionContent(id, formData)  // = registry.find(id).formatter(formData); throws on unknown id

isSectionStale(section, formData):
  if (!section.manuallyEdited) return false
  const fresh = freshSectionContent(section.id, formData)
  return fresh !== '' && fresh !== section.generatedContent
        // ^^^^^^^^^^^ load-bearing: an empty refresh must never badge "stale",
        //             or the reset affordance becomes an offer to ERASE authored text

reconcileSections(formData, storedSections) -> { sections, changed }:
  storedById = Map(stored)
  droppedIds = stored ids not in the registry
    → logError naming them; changed starts true when any were dropped
  for each def in SECTION_DEFINITIONS (registry order):
      fresh = def.formatter(formData)
      if !stored:              changed = true; emit { id, content: fresh, generatedContent: fresh, manuallyEdited: false }
      else if stored.manuallyEdited:  emit stored UNCHANGED (same reference; generatedContent stays frozen)
      else if fresh === stored.content: emit stored UNCHANGED (same reference — no churn)
      else:                    changed = true; emit { ...stored, content: fresh, generatedContent: fresh }
  result is ALWAYS one entry per definition, in registry order
```
Reference preservation is load-bearing: `changed` gates the store write, so a clean focus performs **zero** writes and never dirties the form.

#### Section state table (derived, never stored)

| State | Predicate | Reconcile | UI |
|---|---|---|---|
| Auto | `!manuallyEdited` | `content` & `generatedContent` ← fresh when it differs | plain paragraph, no indicators |
| Auto + addendum | `!manuallyEdited && userAddendum` | content auto-tracks; addendum untouched | paragraph + quiet annotation sub-line |
| Edited | `manuallyEdited && (fresh === '' \|\| fresh === generatedContent)` | untouched | 3px left-margin rail, `colors.primary` @ 55% |
| Edited + stale | `manuallyEdited && fresh !== '' && fresh !== generatedContent` | untouched | rail turns `colors.warning` @ 90% + nested glass panel: caption `SOURCE DATA CHANGED — AUTO-GENERATED WOULD NOW READ`, the fresh text, and a `Reset to auto-generated` action |
| Deleted | `manuallyEdited && content === ''` | untouched | body hidden; if stale, a compact restore row: `{label}` · `wizard has new content for this section` · `Restore` |
| Empty (no data) | `!manuallyEdited && content === ''` | appears when the formatter first produces output | hidden |

A hidden section (deleted-not-stale, or empty) still renders **if it carries an addendum**.

#### Generation triggers (Flows A–F)

| Flow | Trigger | Effect |
|---|---|---|
| **A** | `useFocusEffect` on the Notes screen → `checkAndRegenerateNotes()` | `reconcileSections(extractNotesRelevantData(getState()), state.notesSections)`; writes `updateField('notesSections', sections)` **only if** `changed || state.notesSections.length === 0`. Wrapped in try/catch → `logError({ context: 'checkAndRegenerateNotes' })`. |
| **B** | `onCommitSection(id, text)` — a block blurs or unmounts with changed text | No-op if the section is missing or `stored.content === text`. Else `{ ...s, content: text, manuallyEdited: true }`. `generatedContent` untouched (frozen baseline). Empty text = **explicit deletion**. |
| **C** | `onCommitAddendum(id, text)` | No-op if `(stored.userAddendum ?? '') === text`. Else `{ ...s, userAddendum: text || undefined }`. **Never** sets `manuallyEdited`. |
| **D** | `onResetSection(id)` — per-section `Reset`/`Restore` | The **only** path that clears `manuallyEdited`: `{ id, content: fresh, generatedContent: fresh, manuallyEdited: false, userAddendum: s.userAddendum }`. Addendum survives. |
| **E1** | `onScrapAll('current' \| 'blank')` — footer `Write my own notes…` | ONE atomic `batchUpdate`: `notesFreeText` ← `assembleNotesString(sections, freeText)` (`'current'`) or `''` (`'blank'`); every section ← `{ ...s, content: '', manuallyEdited: true, userAddendum: undefined }`. `generatedContent` kept as the frozen baseline so deleted+stale restore rows still work. |
| **E2** | `onRestoreAll('keep' \| 'clear')` — banner `Restore` | Every section rebuilt fresh (`content = generatedContent = freshSectionContent(id, currentFormData)`, `manuallyEdited: false`), addenda preserved. `'clear'` → `batchUpdate({ notesSections: fresh, notesFreeText: '' })`; `'keep'` → `updateField('notesSections', fresh)` only. The union is routed through `switch` + `assertNever`. |
| **F** | **Export freshness** — both court-PDF derivation paths reconcile READ-ONLY before assembling | `useCaseNotesExport.deriveNotesFromStore` and `pdf-export-service.convertLocationToFormState`. No store/SQLite write. A PDF can never embed stale un-edited notes even if the Notes screen was never focused. |
| — | `onCommitFreeText(text)` | No-op if unchanged; else `updateField('notesFreeText', text)`. |

Every callback reads `useFormStore.getState()` fresh; every one no-ops when nothing changed, so clean blurs and unmount flushes never dirty the form.

#### Persistence

`mapZustandToLocationFormData` (`src/lib/services/form-persistence.ts:562`) writes `notesSections`, `notesFreeText`, **and** the derived flat `notes: assembleNotesString(notesSections, notesFreeText)`. On load (`:713`) sections are normalized (`normalizeStoredNoteSection`) and `notesFreeText` falls back to the legacy flat `notes` when there are zero stored sections (legacy rescue).

#### Confirm dialogs (exact copy — a web demo should match)

| Action | Title | Body | Buttons |
|---|---|---|---|
| Per-section reset (stale panel) | `Reset to auto-generated?` | `Your text for "{label}" will be replaced by the current auto-generated version. A note you added is kept.` | `Cancel` / `Reset` (destructive) |
| Per-section restore (deleted+stale row) | `Restore this section?` | `"{label}" will return to auto-generated content.` | `Cancel` / `Restore` |
| Restore all — free text **non-empty** | `Restore auto-generated notes?` | `Every section returns to auto-generated content; sections you rewrote will be replaced. If you started from your current notes, keeping Additional Notes may repeat the restored sections.` | `Restore & keep my notes` → `'keep'` / `Restore & clear additional notes` (destructive) → `'clear'` / `Cancel` |
| Restore all — free text empty | `Restore auto-generated notes?` | `Every section returns to auto-generated content. Sections you rewrote will be replaced.` | `Cancel` / `Restore` → `'keep'` |
| Scrap all (footer) | `Write your own notes?` | `Auto-generation stops for every section. You can restore the auto-generated notes at any time.` | `Start from current notes` → `'current'` / `Start blank` (destructive) → `'blank'` / `Cancel` |

Reset/restore fire `safeImpactAsync()` (haptics) on confirm. `Copy all` calls `Share.share({ message: assembleNotesString(sections, freeText) })`.

#### testIDs (frozen contract — `components/notes-test-ids.ts`)

`notes-editor`, `notes-free-text`, `notes-scrap-all`, `notes-restore-all`, plus per-section `notes-section-{id}`, `-input`, `-addendum`, `-addendum-add`, `-reset`, `-restore`, `-stale`, `-edited`. Two raw literals outside the map: `notes-editor-scroll` and `notes-editor-footer`. `Copy all` has **no** testID and is selected by its accessibility label `Copy all notes`.

#### Editing mechanics inside a block

- The display node **is** the editor: a borderless multiline `TextInput` styled as plain notes text (`fontSize: base`, `lineHeight: 24`, `padding: 0`) — tap-to-edit with zero visual jump, content verbatim (bullets/indentation preserved).
- `draft` local state syncs from `section.content` **only while unfocused** (a focused block is never re-synced; re-syncing on blur would flash pre-commit text).
- Commit on **blur AND unmount** (a `flushRef` mirror keeps the unmount closure fresh). Double-fire is safe because commits no-op against stored content.
- Addendum: hidden behind a `+ add note` affordance until opened or non-empty; auto-focuses when newly opened; blurring with empty text closes it again and commits `undefined`.
- `SectionBlock` is `React.memo`'d (every free-text keystroke re-renders the parent editor).
- `rejectResponderTermination={false}` + `scrollEnabled={false}` on all three input sites (section, addendum, free text) so a drag scrolls instead of focusing; `keyboardDismissMode` = `interactive` on iOS / `on-drag` elsewhere.
- Block `marginBottom: 24` deliberately equals one blank line at `lineHeight: 24` — the on-screen rhythm matches the `\n\n` rhythm of the assembled string.

**Web-demo notes:**
- **Everything in the notes pipeline is pure JS** — formatters, registry, reconciler, assembler have no store, no SQLite, no native modules. Port them verbatim; they are the highest-fidelity part of this half of the wizard.
- `Alert.alert` → modal dialogs with the exact titles/bodies/button orders above (button order carries meaning: destructive variants differ per dialog).
- `Share.share` → `navigator.clipboard.writeText` or the Web Share API for `Copy all`.
- `expo-haptics` → no-op.
- Reanimated `FadeIn.duration(180)` + `useReducedMotion` → CSS transition honoring `prefers-reduced-motion`.
- `ForceColorScheme('dark')` → scope a `.dark` class to the inset only; the footer stays app-themed.
- The commit-on-blur-and-unmount contract is what makes edits survive navigation — reproduce it (React `useEffect` cleanup with a ref mirror) or edits will be lost on step changes.
- `logError` for dropped unknown section ids → `console.error` is fine, but keep the drop-counts-as-`changed` rule or stale ids never heal.

---

### 13. Completion & Review — `app/(form)/completion.tsx`

**Purpose.** Terminal wizard screen: capture completion metadata, show a case summary, run the only real validation gate in the app, preview/export the court PDF and the time-offset calibration PDF, export ZIP archives, and atomically mark the location complete.

**Route file:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/(form)/completion.tsx`
**Step id:** `completion`, order 10, `classification: 'field-capable'`. **No Next button** — `nav.next` is null at the end of the flow; the export/submit actions are the forward path.

#### Store subscriptions

```ts
useScreenSave()
dateTimeCompleted, completedBy, occNumber, address, scopes, timeDifference   // individual selectors
updateField, markDirty
currentCaseId, currentLocationId                                             // case-management slice
formData = useFormStore(useShallow(s => ({ scopes, address, dvrTypeBrand, cameras, sizeGb, exportMedia })))  // summary only
```
Plus `useUserProfileHydration()` and `useUserProfileStore(s => s.name)` from `@/features/settings`.

Local state: `showPreview`, `showTimeOffsetPreview`, `pendingPdfShare: 'case-notes' | 'time-offset' | null`, `validationErrors: string[]`, `isSaving`, and `pendingPdfShareRef`.

#### Rendered surface, top to bottom

**1. Case-context warning card** — rendered when `!currentCaseId || !currentLocationId`. `Card` bordered `colors.error`:
- `No Case Selected`
- `Please create a case and location from the Home screen before completing the form.`

**2. Validation errors card** — rendered when `validationErrors.length > 0`. `Card` bordered `colors.error`:
- Title `Required Fields Missing`
- One `- {message}` line per error.

**3. `FormSection title="Completion Information"`** (not glass):
| Label | Component | Store field | testID | Visibility id |
|---|---|---|---|---|
| Date & Time Completed | `DateTimePickerInput mode="datetime"` — `value={toJSDate(dateTimeCompleted)}`, `onChange={d => updateField('dateTimeCompleted', toStorageFormat(d))}` | `dateTimeCompleted: string` | `date-time-completed` | `completion.dateTimeCompleted` |
| Completed By | `TextInput` placeholder `Officer name`, `defaultValue` + `onEndEditing` | `completedBy: string` | `completed-by` | `completion.completedBy` |

**Autofill:** a `useEffect` keyed on `hydrated` writes `updateField('completedBy', profileName.trim())` when the user-profile store has hydrated, `completedBy` is empty, and the profile name is non-blank. Runs once per hydration, never overwrites an existing value.

**4. `FormSection title="Case Summary"`** → `Card glass glassVariant="elevated" techGlow`:
```
OCC #{occNumber || 'N/A'}                     (title style)
Address: {formData.address || 'N/A'}
DVR: {formData.dvrTypeBrand || 'N/A'}
Scopes: {formData.scopes.length}
Cameras: {formData.cameras.length}
Export: {formData.sizeGb}GB via {formData.exportMedia || 'N/A'}
```
Note `sizeGb` is **not** `|| 'N/A'`-guarded — an empty value renders `Export: GB via N/A`.

**5. `FormActions`** — four buttons, in order:
| Button | testID | Variant | Disabled when | Handler |
|---|---|---|---|---|
| `Preview/Export PDF` / `Generating...` | `preview-pdf` | outline, fullWidth | `isGenerating` | `handlePreviewPdf` |
| `Preview Time Offset Calibration` / `Generating...` — **rendered only when `timeDifference` is truthy** | `preview-time-offset` | outline, fullWidth | `isGeneratingTimeOffset` | `handlePreviewTimeOffset` |
| `Export Zip` / `Exporting...` | `export-button` | outline, fullWidth | `isExporting \|\| !currentLocationId` | opens the action sheet |
| `Complete & Save` / `Saving...` | `submit-button` | primary, fullWidth | `isSaving` | `handleSubmit` |

**6. Modals** (all mounted at the end of the layout):
| Modal | File | Rendered when |
|---|---|---|
| `CaseNotesPreviewModal` | `src/features/documentation/case-notes/components/CaseNotesPreviewModal.tsx` | `htmlContent` truthy; `visible={showPreview}`; props `onClose={handleClosePreview}`, `onShare={handleExportPdf}`, `onDismiss={runPendingCaseNotesShare}`. WebView-based full-screen HTML preview. |
| `TimeOffsetPreviewModal` | `src/features/documentation/time-offset-report/components/` | `timeOffsetHtmlContent` truthy; `visible={showTimeOffsetPreview}`; `onShare={handleShareTimeOffset}`, `onDismiss={runPendingTimeOffsetShare}` |
| `ExportModal` (unified) | `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/components/export/ExportModal.tsx` | always mounted; `mode` computed by `getExportModalMode()` |
| `ExportActionSheet` | `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/components/export/ExportActionSheet.tsx` | `visible={showExportSheet}` |
| `PasswordModal` × **3** | `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/export-security/components/PasswordModal.tsx` | one driven by `useExportFlow` (ZIP), one by `caseNotesPasswordModalProps`, one by `timeOffsetPasswordModalProps` |

`getExportModalMode()` — a single modal container avoids RN's "two modals can't transition simultaneously" bug:
```
showValidationModal && validationResult && !validationResult.allValid  → 'validation'
exportStage !== 'idle'                                                 → 'progress'
otherwise                                                              → 'hidden'
```

#### VALIDATION — `finalSubmissionSchema`

`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/lib/schemas/form-schema.ts:137`:
```ts
export const finalSubmissionSchema = z.object({
  occNumber: z.string().min(1, "OCC number is required"),
  address:   z.string().min(1, "Address is required"),
  scopes: z.array(z.object({ startDateTime: z.string(), endDateTime: z.string() }))
    .refine(scopes => scopes.some(s => s.startDateTime && s.endDateTime),
            { message: "At least one extraction scope with start and end times is required" }),
})
```
This is the **only** runtime validation gate in the entire wizard.

`validateRequiredFields()` runs `finalSubmissionSchema.safeParse({ occNumber, address, scopes })`; on failure it maps `result.error.errors` → `err.message` into `validationErrors` and returns `false`; on success it clears the array and returns `true`.

**Failed-validation UI (two surfaces at once):**
1. The red `Required Fields Missing` card appears inline with a `- {message}` bullet per error.
2. Plus a native `Alert`, whose copy depends on the caller:
   - `handlePreviewPdf` / `handleExportPdf`: `Alert.alert('Missing Required Fields', validationErrors.join('\n'))` — **note the closure bug**: `validationErrors` is the *previous* render's state at this point, so the first failing tap shows an empty/stale alert body while the card is correct.
   - `handleSubmit`: `Alert.alert('Missing Required Fields', 'Please fill in all required fields to complete the case. Save progress instead?', [ Cancel(cancel), 'Save Progress' → handleSaveProgress ])`.

**Auto-clear:** a `useEffect` on `[occNumber, address, scopes, validationErrors.length]` re-runs `safeParse` only when `validationErrors.length > 0` and clears the array once it passes. Errors therefore disappear as soon as the user fixes the data on another screen and returns.

A **separate, stricter** gate runs inside PDF generation — `validatePdfGeneration` (`src/features/documentation/case-notes/services/case-notes-validator.ts`) requires **four** things: OCC#, at least one scope with both datetimes, `dateTimeCompleted`, and `completedBy`. Failures throw `PdfGenerationError` with all messages joined by `\n`, surfaced by the hook as `Alert('Preview Generation Failed', message)`.

#### PDF preview / export flow (case notes)

Hook: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/documentation/case-notes/hooks/useCaseNotesExport.ts`.

`handlePreviewPdf()`: `validateRequiredFields()` → (fail: Alert, return) → `await generatePdfPreview()` → `setShowPreview(true)`.

`generatePdfPreview()`:
1. `formData = deriveNotesFromStore(useFormStore.getState())` — Flow F read-only reconcile:
   ```ts
   const { sections } = reconcileSections(extractNotesRelevantData(formData), formData.notesSections || [])
   return { ...formData, notesSections: sections, notes: assembleNotesString(sections, formData.notesFreeText || '') }
   ```
   Nothing is written back to the store.
2. `validatePdfGeneration(formData)` → throw `PdfGenerationError(errors.join('\n'))` if invalid.
3. `htmlContent = generatePdfHtml(formData)` — **HTML only**, no `expo-print` (fast, full-page accurate).
4. Failure → `Alert('Preview Generation Failed', message)`.

`exportAndSharePdf()` (invoked from inside the preview modal's Share button):
1. `requestEncryption()` (`useEncryptedExportPrompt`) **before** the biometric gate, mirroring the ZIP flow. Policy resolution (`resolvePasswordPolicy(singleFileEncryptionEnabled, promptMode)`) yields `'none'` → `{type:'unencrypted'}`, `'password'` → `{type:'encrypted', password, strength}`, `'prompt'` → show `PasswordModal` (prefilled with the saved default) and await. `'cancelled'` → return early.
2. `executeProtectedExport(fn, 'export_pdf')` — biometric gate (`src/features/biometrics/hooks/useProtectedExport.ts`): auth runs only when `settings.exportProtectionEnabled && capability.hasHardware && capability.isEnrolled`; a non-cancel failure shows `Alert('Authentication Required', …)`; returns `null` on cancel/failure.
3. Inside: re-derive notes, re-validate, `generatePdf(formData, { base64: false })` → `expo-print.printToFileAsync`, `fileName = generateFileName(formData)` (`{OCC#}-{business @ }{street, city}-DVR Extraction Notes.pdf`).
4. Encrypted → `stageAndZipSingleFile({path: uri}, { fileName, zipFileName, password, encryptionStrength })` then `shareDocument(zipPath, { mimeType:'application/zip', uti:'public.zip-archive', dialogTitle: zipFileName })`. Unencrypted → `sharePdf(uri, fileName)` → `shareDocument` (which stages a copy under the clean filename because expo-sharing names from the URI basename).
5. `if (shareResult.shared) Alert('PDF Exported', 'The case report has been exported successfully.')` — user cancel resolves `{ shared:false }` and shows nothing.
6. Errors → `Alert('Export Failed', message)` and re-throw.

**iOS modal-stacking workaround.** iOS can present only one modal at a time, so the password prompt / share sheet silently queue behind the open preview ("nothing happens until I close the preview"). Therefore:
```ts
handleExportPdf(): if (!validateRequiredFields()) { Alert; return }
  Platform.OS === 'ios' ? (setPendingPdfShare('case-notes'), setShowPreview(false))   // resumes from onDismiss
                        : exportAndSharePdf()
handleShareTimeOffset(): same shape with 'time-offset' / setShowTimeOffsetPreview(false)
```
`runPendingCaseNotesShare` / `runPendingTimeOffsetShare` are **separate** callbacks (never a shared discriminator) so a modal's `onDismiss` can only ever fire its own export; each `.catch(logError)`s because the calls are fire-and-forget. A `pendingPdfShareRef` + run-once unmount effect logs `Deferred PDF share ({target}) lost on unmount` when the screen unmounts during the ~300 ms dismiss animation — the loss is made observable rather than silent.

`handleClosePreview()` → `setShowPreview(false)` + `clearPdf()`. `handleCloseTimeOffsetPreview()` → `setShowTimeOffsetPreview(false)` + `clearTimeOffsetDocument()`.

#### PDF section assembly (what the preview/export actually contains)

`generatePdfHtml(formData)` — `src/features/documentation/case-notes/templates/case-notes-template.ts`; styles in `templates/case-notes-styles.ts`. Header: `<h1>Forensic Video Unit</h1>` / `<h2>CCTV Recovery Case Notes</h2>`. Eleven sections in fixed order, each silently omitted when its gate fails:

| # | Section title | Gate | Builder |
|---|---|---|---|
| 1 | Case Information | always; each optional row gated by `hasValue` (Requested By, Badge Number, Unit, Requester Phone/Email, Location Contact, Contact Phone) | inline key-value grid |
| 2 | Incident Location | `hasIncidentLocation()` | inline grid |
| 3 | Extraction Scope (As Entered) | always invoked | `generateRequestedScopesTable(scopes)` — 5 cols: `#`, Start, End, Time Type, Cameras |
| 4 | Adjusted Scope (Calculated Times) | `scopes.some(s => s.correctedStartDateTime && s.correctedEndDateTime)`; prefaced by a blue info banner | `generateAdjustedScopesTable(scopes)` — same 5 cols, corrected times, Time Type **inverted** |
| 5 | DVR Time Offset | `formData.timeOffsetData` present; prints "DVR time is CORRECT" or the signed difference via `isDvrTimeCorrect` | inline grid |
| 6 | DVR Information | `hasDvrInfo()` | inline grid, 13 fields |
| 7 | Individual Camera Details | `hasCameras()` | `generateCamerasTable(cameras)` — 4 cols + a child `GPS Location` row gated by `hasCapturedCoordinates` (6 dp, optional `±Xm`) |
| 8 | Export Information | `hasExportInfo()` | inline grid, 5 fields |
| 9 | Case Notes | `formData.notes` truthy | `<div class="notes">${escapeHtml(formData.notes)}</div>` — the assembled flat notes string from screen 12 |
| 10 | Arrival & Departure Times | `hasArrivalDeparture()` | `generateArrivalDepartureTable` — 4 cols, duration auto-calculated as `Xh Ym`; negative → `Invalid (departure before arrival)`; one timestamp missing → `N/A` |
| 11 | Completion Information | `hasCompletionInfo()` | inline grid |

Every user-entered cell passes through `escapeHtml()` (mandatory — a missed field corrupts the markup). `expo-print` strips `<a href>`, so GPS coords print as plain text in the PDF (links work only in the WebView preview).

#### Time-offset calibration PDF

`useTimeOffsetExport` (`src/features/documentation/time-offset-report/hooks/useTimeOffsetExport.ts`) mirrors the case-notes hook: `generatePreview()` returns a boolean (the screen shows the modal **only** on `true`), `exportAndShare()`, `clearDocument()` (which also deletes the temp PDF from disk), and its own `passwordModalProps`. Inputs are pulled from the store (`dvrDateTime`, `actualDateTime`, `timeDifference`, `timeOffsetData`, `dvrAppliesDST`, `timeSyncResult`, `lastSyncTimestamp`, `ocrConfidence`/`ocrRawText`/`ocrCleanedText`/`ocrParsedDateTime`, `captureMethod`, `occNumber`, `address`) **plus** the OCR evidence image, which is **not** in Zustand — `getOcrImageUri` queries SQLite `media_files` for `ImageCategory.DVR_CROPPED`. Import note: this surface is **not** re-exported by `@/features/documentation`; it must be imported from `@/features/documentation/time-offset-report`.

#### ZIP export — action sheet → validation → password → biometrics → share

`ExportActionSheet` options built in the screen:
| id | label | description | icon |
|---|---|---|---|
| `location` | `Export This Location` | `ZIP with documents and media for current location` | `location-outline` |
| `case` | `Export Full Case` | `ZIP with all locations, documents, and media` | `folder-outline` |
| `cancel` | `Cancel` | — | `close-outline` |

Title `Choose Export Scope`. `handleExportSheetSelect` closes the sheet then dispatches `handleExportLocationZip()` / `handleExportZip()` / nothing. The sheet is a custom `Modal` mimicking a native action sheet (250 ms slide+fade, backdrop tap to dismiss, `menu`/`menuitem` a11y roles).

`useExportFlow(currentCaseId, currentLocationId)` — `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/hooks/useExportFlow.ts` (the completion screen uses only `case` and `location`; the hook also serves `location-geojson`, `case-map`, `case-subset` for other screens):

- **`handleExportZip()` (full case):** entry guard (`isExporting || pendingExportType`) → no `caseId` → Alert `No Case Selected` → `setExportStage('validating')` → `validateLocationsForPdf(caseId)`.
  - `!result.allValid` → reset stage, arm `pendingValidatedExport = 'case'`, `setShowValidationModal(true)` and stop.
  - valid → `resolvePassword('case')` (uses `zipEncryptionEnabled`) → `'prompt'` shows `PasswordModal` prefilled with the saved default and returns; the export resumes from `handlePasswordSubmit`.
  - → `executeExport('case', password)`.
- **`handleExportLocationZip()`:** no validation step — entry guard → no `locationId` → Alert `No Location Selected` → password resolution → `executeExport('location', password)`.
- **`executeExport`** wraps the real service call in `executeProtectedExport(fn, 'export_zip')` (Face ID / Touch ID gate) and calls `exportAndShareCaseWithPdfs` / `exportAndShareLocationWithPdf` with `{ includePDFs, password, encryptionStrength, onProgress(current,total,name), onStageChange(stage) }`. `protectedResult === null` (auth cancelled) → silent return.
- **Result alert taxonomy** (independent caveats compose):
  - `shareWarning` present → `Export Complete (Not Shared)` — the ZIP was written but never left the phone (BUG-013: chain-of-custody must not read as transmitted).
  - PDF failures → `Export Complete (Partial)` / for a location, `Export Complete (No PDF)` with success/failure counts.
  - `geojsonFailures` / `caseMapFailed` → appended notes, `Export Complete (Partial)`.
  - otherwise → `Success` (`Case exported successfully with PDF notes{ (encrypted)}.`).
  - throw → `Alert('Export Error', getUserFriendlyMessage(error))`. `finally` always `resetExportState()`.
- **Validation modal** (`ExportModal mode='validation'`): warning/alert icon, title `Some Locations Missing PDF Data` or `All Locations Missing PDF Data`, a scrollable list of `• {locationName}` with `- Missing: {error}` lines, summary `{validCount} of {totalCount} locations will include PDF notes.` (or `The ZIP will be created without any PDF notes.`), buttons `Cancel` / `Continue` (or `Export Anyway`). Screen-reader announcement on appear. Backdrop tap = cancel unless exporting. `Continue` → `proceedWithExport()` which consumes the modal on every path and flips `exportStage` in the **same** synchronous batch so the modal goes validation → progress with no hidden frame.
- **Progress modal** (`ExportModal mode='progress'`): spinner + stage message from `STAGE_MESSAGES` — `validating: 'Validating locations...'`, `generating: 'Generating PDFs...'`, `zipping: 'Creating ZIP archive...'`, `sharing: 'Opening share dialog...'` — plus `Location {current} of {total}` and the quoted location name during `generating`. Not dismissible via the Android back button.
- **`PasswordModal`**: `MIN_PASSWORD_LENGTH = 8`; placeholder `Minimum 8 characters`; show/hide toggle; a "save as default" checkbox; a validation hint while `0 < length < 8`; a warning block; `Cancel` / `Export`. testIDs `password-modal`, `password-modal-input`, `password-modal-show-hide`, `password-modal-save-default`, `password-modal-validation-hint`, `password-modal-warning`, `password-modal-cancel`, `password-modal-export`, `password-modal-backdrop`. A failed "save as default" write shows a non-blocking Toast (`Couldn't save the default password` / `The export will continue; you may be asked for it again next time.`) and never blocks the export (BUG-015).

#### "Save Progress" flow — `handleSaveProgress()`

`setIsSaving(true)` → `setSaveStatus('saving')` → `await saveFormToLocation(true)` (**force** — bypasses the dirty check).
- success → `setSaveStatus('success')` → `Alert('Progress Saved', 'You can continue this location later from the Cases screen.', [OK → router.dismissTo('/(tabs)/cases')])`
- failure/throw → `setSaveStatus('error', …)` → `Alert('Save Error', 'Failed to save case data. Please check your connection and try again.', [OK])`
- `finally { setIsSaving(false) }`

#### "Complete Case" flow — `handleSubmit()`

1. `if (isSaving) return` — double-submit guard.
2. No `currentCaseId`/`currentLocationId` → `Alert('No Case Selected', 'Please create a case and location first.', [ 'Go to Home' → router.dismissTo('/(tabs)/home') ])`.
3. `validateRequiredFields()` fails → `Alert('Missing Required Fields', 'Please fill in all required fields to complete the case. Save progress instead?', [Cancel, 'Save Progress' → handleSaveProgress])`.
4. `setIsSaving(true)`, `setSaveStatus('saving')`, `await completeLocationWithSave(currentLocationId)` (`src/lib/services/form-persistence.ts:750`):
   - Preconditions: refuses while a location load is in progress (`{ skipped:true, reason:'Location load in progress' }`); `locationId !== currentLocationId` → hard error `Location ID mismatch…`; no location context → skipped.
   - Acquires `formSaveMutex`; snapshots state and `dirtyGeneration` **inside** the mutex; writes form data + `status: LocationStatus.COMPLETE` in **one** `updateLocation` statement (BUG-021: the old two-statement "transaction" ran on a separate connection and never was atomic); `clearDirty()` only if `dirtyGeneration` is unchanged.
   - Mutex not acquired → `{ success:false, skipped:true, reason:'Save already in progress' }`.
5. **Benign skip branch**: `!result.success && result.skipped` → `setSaveStatus('idle')` and `Alert('Still Saving', 'A save is still finishing in the background. Please try "Complete Case" again in a moment.', [OK])`. Nothing failed, nothing was lost — deliberately not routed into the scary error path.
6. `!result.success` → throw `result.error || 'Failed to complete location'`.
7. Success → `setSaveStatus('success')` → `Alert('Case Complete', 'Case has been saved successfully and marked as complete.', [ 'Start New Case' → router.dismissTo('/(tabs)/home'), 'Return to Cases' → router.dismissTo('/(tabs)/cases') ])`.
8. Catch → `console.error`, **`markDirty()`** (the transaction rolled back, so the form must stay dirty for the next auto-save), `setSaveStatus('error', message)`, `Alert('Save Error', 'Failed to save case data. Please check your connection and try again.', [OK])`.
9. `finally { setIsSaving(false) }`.

**Navigation rule (BUG-011).** Every exit from this screen uses `router.dismissTo('/(tabs)/…')`, never `push`/`replace` — `dismissTo` pops back to the existing tabs instance so the wizard truly unmounts (timers, listeners, Zustand subscriptions die and the layout `beforeRemove` guard fires). A push-exit leaked two fully-mounted navigators per open/exit cycle.

`handleBack()` → `nav.prevRoute && router.push(nav.prevRoute)` (default: back to Notes).

**Web-demo notes:**
- `finalSubmissionSchema` is plain Zod — port verbatim. Reproduce **both** failure surfaces (inline red card + dialog) and the auto-clear effect. The stale-`validationErrors` alert body on the PDF paths is real observed behavior; decide deliberately whether to replicate it.
- PDF generation: `generatePdfHtml` is a pure string builder — port it and render the HTML in an `<iframe srcdoc>` for the preview. Replace `expo-print.printToFileAsync` with the browser print dialog or a client-side html→pdf lib; replace `expo-sharing` with a download link or the Web Share API.
- The whole iOS modal-stacking deferral (`pendingPdfShare` + `onDismiss`) is a native-only workaround — a web demo can export directly, but if you keep the code path, note the `Platform.OS === 'ios'` fork.
- Biometrics (`useProtectedExport` → `expo-local-authentication`): mock as an always-pass gate, or simulate with a confirm dialog to keep the Face ID step visible in the demo.
- AES-encrypted ZIP (`react-native-zip-archive` / `stageAndZipSingleFile`) and the password policy: mock with JSZip (which supports zipping but not AES-256) or fake the whole step while still showing `PasswordModal`, the 8-char minimum, and the "save as default" toast failure path.
- ZIP export services (`exportAndShareCaseWithPdfs` / `exportAndShareLocationWithPdf`) touch SQLite + filesystem + share sheet — mock them to emit staged `onStageChange`/`onProgress` callbacks so the progress modal's four stages and the `Location N of M` counter are demonstrable, and to return the `shareWarning` / `pdfResults.failureCount` / `geojsonFailures` shapes so the four alert branches can be exercised.
- `completeLocationWithSave` + the save mutex: mock as an async IndexedDB write behind a simple in-JS mutex; keep the `skipped` branch (`Still Saving`) — it is a distinct, user-visible outcome.
- `useUserProfileStore` hydration (AsyncStorage) → localStorage; keep the autofill-once semantics.
- The time-offset PDF needs the OCR evidence image out of SQLite `media_files` — mock as a data URI.


---

## 4. Settings, Form Customization & Agency Cloud

Scope: every settings surface, the form-customization panel, and the agency-cloud (BYO-Supabase) wizard/modals. All paths absolute.

---

### 4.0 Entry point & modal shell

**Purpose.** Settings is NOT a route. It is a self-contained React Native `<Modal presentationStyle="pageSheet" animationType="slide">` that two tab screens own as local `useState` visibility.

**Entry points (only two):**
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/(tabs)/home.tsx` — `const [showSettingsModal, setShowSettingsModal] = useState(false)`; opened via a header prop `onSettingsPress` (line ~350); renders `<SettingsModal visible onClose>` (line ~356).
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/(tabs)/cases.tsx` — same pattern (lines 130, 1019, 1069).
- Import is deliberately from the **direct path** `@/features/settings/components/SettingsModal`, never the barrel (barrel would drag biometrics → `AuthenticatedSplashScreen` → `expo-av` into every consumer). Documented in `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/index.ts` header.

**Shell component:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/components/SettingsModal.tsx`
- Props: `{ visible: boolean; onClose: () => void }`.
- **Master/detail navigator** inside one sheet. Two absolutely-positioned panes over a `<GridBackground showScanLine={false}>` inside a `SafeAreaView`.
- Animation: Reanimated shared value `progress` (0 = master, 1 = detail).
  - Master pane: `translateX: interpolate(progress,[0,1],[0,-paneW*0.25])`, `opacity 1 → 0.55`.
  - Detail pane: `translateX: interpolate(progress,[0,1],[paneW, 0])`.
  - Scrim over master: `opacity 0 → 1`, color `rgba(2,8,18,0.5)` dark / `rgba(17,24,39,0.06)` light.
  - Enter timing `{duration:320, Easing.out(cubic)}`; exit `{duration:280, ...}`.
- **Interactive pop**: `Gesture.Pan().activeOffsetX(16).failOffsetY([-14,14])`. On update `progress = clamp(1 - translationX/paneWidth)`. On end, pops if `translationX > paneW*0.32 || velocityX > 650`.
- Back paths: nav-bar back button, right-swipe anywhere in detail, Android hardware back (`onRequestClose` → closes detail if one is open, else `onClose()`).
- `useEffect`: whenever `visible` goes false, resets `activeId = null`, `progress = 0`.
- **Auth gate** lives here, in `openCategory`: if `category.requiresAuth`, `await authenticateWithFallback('settings_access')`; abort (no navigation) on `!result.success`.
- Detail body renders inside a `<ScrollView keyboardShouldPersistTaps="handled">` with `padding: Layout.spacing.lg`, `paddingBottom: Layout.spacing.xxl`.

**Nav bar:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/components/SettingsNavBar.tsx`
- Discriminated union props: `{variant:'master', onClose}` | `{variant:'detail', title, badge?, onBack}`.
- Master: Ionicons `settings-sharp` (22px, primary) + bold "Settings" (`fontSize['2xl']`) on the left; a 30×30 circular close button with Ionicons `close` (20px) on the right (`testID="settings-close-button"`).
- Detail: left `chevron-back` (24px, primary) + the word "Settings" (`testID="settings-back-button"`); absolutely-centered category title (`fontSize.lg`, semibold) plus optional uppercase badge pill (10px bold, warning-colored, warning bg @16% alpha, warning border @40%); a 92px right spacer to balance.
- Opaque `backgroundColor: colors.background` with a `LinearGradient` glass sheen overlay (`GlassColors[scheme].elevated.gradient`), `borderBottomWidth: 1`, `minHeight: 52`.

**Master list:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/components/SettingsCategoryList.tsx`
- ScrollView, `padding: Layout.spacing.md`. Groups from `SETTINGS_GROUPS`, each rendered as: uppercase group label (xs+0.5 size, semibold, letterSpacing 0.6, textSecondary) above a `LinearGradient` glass card (`GlassColors[scheme].card.gradient`, `borderRadius: Layout.borderRadius.xl`, 1px border, `overflow:hidden`) containing the group's rows. Empty groups are filtered out.
- Footer line: `` `${appName} · v${version}` `` from `Constants.expoConfig` (fallbacks `DVR Extraction Notes` / `1.0.0`), centered, textTertiary, xs.

**Row:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/components/SettingsCategoryRow.tsx`
- `Pressable`, `minHeight: 56`, `gap: Layout.spacing.md`, `testID={`settings-row-${category.id}`}`, `accessibilityLabel={`${title} settings`}`, hint "Opens this settings category".
- Left: 36×36 rounded (radius 9) icon chip; bg `primary` at 18% (dark) / 12% (light) alpha; border `primary` @22%; Ionicons glyph 19px in `colors.primary` (single accent, no per-row rainbow).
- Middle: title, `fontSize.base`, medium weight, `numberOfLines={1}`.
- Right cluster (`maxWidth:'52%'`): optional preview value text (sm, textSecondary, 1 line) rendered inside a dedicated `<RowPreview>` component so exactly ONE hook runs per row (Rules of Hooks); optional `lock-closed` 13px glyph when `requiresAuth`; `chevron-forward` 17px.
- Hairline separator inset 58px from the left, except on the last row.
- Pressed state: `rgba(184,212,240,0.06)` dark / `rgba(30,58,138,0.06)` light.

**Web-demo notes:**
- Replicate as a two-pane sliding sheet (CSS transform) inside a bottom-sheet overlay; the pan-to-pop can be a simple back button + optional drag.
- `Constants.expoConfig.name/version/sdkVersion` → hardcode demo strings.
- `authenticateWithFallback` (expo-local-authentication) must be mocked — a confirm dialog or an always-succeed stub.
- Reanimated/gesture-handler → CSS transitions + pointer events.

---

### 4.1 Settings catalog (the registration model)

File: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/components/settings-catalog.tsx`

`SettingsCategory` shape (deep-frozen array `SETTINGS_CATEGORIES`):
```ts
{ id, title, group: 'account'|'capture'|'data'|'system',
  icon: Ionicons glyph, Component: ComponentType,
  usePreview?: () => string|null|undefined,
  requiresAuth?: boolean, devOnly?: boolean, badge?: string }
```
Helpers: `getVisibleCategories()` (filters `devOnly` unless `__DEV__`), `getCategoryById(id)`.

Groups, in order (`SETTINGS_GROUPS`): `account` "Account", `capture` "Capture & Time", `data` "Data & Security", `system` "System".

**Full catalog, in render order:**

| # | Group | id | Title | Ionicons | Detail component | Preview value | Flags |
|---|---|---|---|---|---|---|---|
| 1 | Account | `user-profile` | User Profile | `person-circle-outline` | `UserProfileSection` | profile `name` trimmed, else `"Not set"` | — |
| 2 | Account | `appearance` | Appearance | `contrast-outline` | `GeneralSettingsSection` | `"Dark"` / `"Light"` | — |
| 3 | Capture & Time | `media-capture` | Media Capture | `camera-outline` | `MediaCaptureSettingsSection` | `720p` / `1080p` / `4K` | — |
| 4 | Capture & Time | `location` | Location | `location-outline` | `LocationSettingsSection` | title-cased accuracy mode (`Quick`/`Balanced`/`Precise`) | — |
| 5 | Capture & Time | `time-sync` | Time Sync | `time-outline` | `TimeSyncSettingsSection` | `Canada (NRC)` / `USA (NIST)` / `Europe` / `Global` | — |
| 6 | Capture & Time | `form-customization` | Form Fields | `options-outline` | `FormCustomizationSection` (cross-feature) | `Forensic` / `Limited` / `Canvas` | — |
| 7 | Data & Security | `security` | Security | `shield-checkmark-outline` | `SecuritySettingsSection` (from `@/features/biometrics`) | biometric name (e.g. "Face ID") or `"Unavailable"` | **`requiresAuth: true`** (lock glyph) |
| 8 | Data & Security | `export-security` | Export Security | `lock-closed-outline` | `ExportSecuritySection` | `"On"` if **either** encryption flag on, else `"Off"` | — |
| 9 | Data & Security | `cloud-sync` | Cloud Sync | `cloud-upload-outline` | `CloudSyncSettingsSection` | `"Paused"` > `"Connected"` > `"On"`/`"Off"` | — |
| 10 | System | `about` | About | `information-circle-outline` | `AboutSection` | `v{version}` | — |
| 11 | System | `developer` | Developer | `code-slash-outline` | `DevSettingsSection` | (none) | **`devOnly: true`, `badge:'DEV'`** |

Preview-hook implementations (all in the same file): `useProfilePreview`, `useAppearancePreview` (reads `useTheme().isDark`), `useMediaPreview`, `useLocationPreview`, `useTimeSyncPreview`, `useSecurityPreview`, `useExportPreview`, `useCloudPreview` (combines `useCloudSyncSettings()` + `useCloudStatus()`), `useAboutPreview`, `useFormCustomizationPreview`.

**Web-demo notes:**
- Catalog is pure data — port 1:1 as a JS array; each `usePreview` becomes a selector on the demo store.
- Show the Developer row only behind a demo "dev mode" flag (or always, to expose the surface).

---

### 4.2 Settings store (persistence backbone)

File: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/store/settings-store.ts`

- Zustand + `persist`, `createJSONStorage(() => AsyncStorage)`, **key `cctv-app-settings`**, **`version: 12`**.
- Slices and defaults:

| Slice | Fields | Default |
|---|---|---|
| `location` | `gpsAccuracyMode`, `gpsTimeout`, `incidentReverseGeocode`, `locationReverseGeocode`, `showAccuracyWarning` | `balanced`, `30`, `true`, `true`, `true` |
| `mediaCapture` | `photoQuality`, `imageResolution`(deprecated), `skipProcessing`, `shutterSound`, `videoQuality`, `videoCodec`, `maxVideoDuration`, `gpsInMedia` | `0.9`, `'auto'`, `true`, `true`, `'1080p'`, `'auto'`, `300`, `true` |
| `encryption` | `zipEncryptionEnabled`, `singleFileEncryptionEnabled`, `promptMode`, `encryptionStrength` | `false`, `false`, `'auto'`, `'AES-256'` |
| `timeSync` | `ntpRegion` | `'canada'` |
| `cloudSync` | `cloudSyncEnabled` | `false` |
| `devSettings` | `verboseImportLogging` | `false` |
| `importUi` | `showProcessDetails` | **`true`** |

- Actions: `updateLocationSettings`/`resetLocationSettings`, `updateMediaCaptureSettings`/`resetMediaCaptureSettings`, `updateEncryptionSettings` (no reset), `updateTimeSyncSettings`/`resetTimeSyncSettings`, `updateCloudSyncSettings`/`resetCloudSyncSettings`, `updateDevSettings` (no reset), `updateImportUiSettings` (no reset).
- **Validation in-store:** `updateMediaCaptureSettings` clamps `photoQuality` to `[0.5, 1.0]`; drops an `imageResolution` failing `isValidImageResolutionSetting` (must be `'auto'` or `/^\d+x\d+$/`) with a `console.warn`.
- **Migrations** are cumulative fall-through v1→v12 (v8 split `autoReverseGeocode`; v9 seeded+validated `zipEncryptionStrength`; v10 seeded `singleFileEncryptionEnabled` from `zipEncryptionEnabled`; v11 renamed `zipPromptMode`/`zipEncryptionStrength` → `promptMode`/`encryptionStrength`; v12 added `importUi` with coerce-and-log on corrupt shape). A `??=` safety net backfills whole missing slices.
- **Hydration:** `useSettingsHydration()` — `true` once AsyncStorage rehydrates.

**Web-demo notes:** AsyncStorage → `localStorage` under the same key; keep the versioned migrate shape if you want to demo persistence fidelity, otherwise seed defaults. Hydration gate can resolve synchronously.

---

### 4.3 Appearance panel (`GeneralSettingsSection`)

File: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/components/GeneralSettingsSection.tsx`

Purpose: theme + import-terminal verbosity. Two switches, nothing else.

| Control | Type | Label | Default | Persisted where |
|---|---|---|---|---|
| Dark Mode | `Switch` (`testID="dark-mode-switch"`) | "Dark Mode" | follows `ThemeContext` | **`ThemeContext`**, NOT the settings store |
| Show import process details | `Switch` (`testID="import-process-details-switch"`) | "Show import process details" | `true` | `cctv-app-settings` → `importUi.showProcessDetails` |

- Dark-mode `onValueChange = toggleTheme` from `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/context/ThemeContext.tsx`.
- The import switch carries `accessibilityHint`: "Shows the on-device model's inputs and outputs while importing. Your data never leaves the phone."
- Shared `Switch` primitive: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/components/common/Switch.tsx` — label on the left, RN `Switch` on the right, `Haptics.impactAsync(Light)` on every change, `trackColor {false: colors.border, true: colors.primary}`, inner testID `${testID}-switch`.

**Web-demo notes:** haptics → no-op. Theme toggle should drive a `data-theme` attribute.

---

### 4.4 Location panel (GPS accuracy)

File: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/components/LocationSettingsSection.tsx`
Hook: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/hooks/useLocationSettings.ts` (internal — not in the feature barrel).

Body order:
1. Description: "Configure how the app acquires and processes location data for case documentation."
2. **GPS Accuracy Mode** — label + help ("Balances speed vs precision when acquiring GPS coordinates.") + `Picker` (`testID="gps-accuracy-picker"`, placeholder "Select accuracy mode"). Options: `Quick (Any Accuracy)`→`quick`, `Balanced (50m)`→`balanced` (default), `Precise (10m)`→`precise`. Handler validates the literal union; invalid → `console.error`.
3. **GPS Timeout** — help "Maximum time to wait for GPS signal before showing an error." + `Picker` (`testID="gps-timeout-picker"`). Options `15 seconds`/`30 seconds` (default)/`60 seconds`/`120 seconds`, values are stringified numbers; handler validates ∈ {15,30,60,120}.
4. **Accuracy Warning** — help "Warn when GPS accuracy exceeds 100 meters." + `Switch` labeled "Show accuracy warnings" (`testID="accuracy-warning-switch"`), default `true`.
5. Info box (info-colored): "Note: These settings affect location accuracy during case creation and site arrival documentation."

Not shown here (by design): reverse-geocode-on-capture toggles live inline next to each "Use Current Location" button.

Shared `Picker`: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/components/common/Picker.tsx` — a pressable selector that opens a `GlassBottomSheet` list; the *tappable* testID is `${testID}-selector`.

**Web-demo notes:** Picker → `<select>` or a custom bottom-sheet listbox. No native GPS involvement in this panel — it only writes preferences.

---

### 4.5 Media Capture panel

File: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/components/MediaCaptureSettingsSection.tsx`
Hook: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/hooks/useMediaCaptureSettings.ts` (public).
Types/labels: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/types/media-capture.types.ts`

Container `testID="media-capture-settings-section"`. Order:
1. Description: "Configure photo and video capture quality, codecs, and metadata options. These settings affect all media captured in the app."
2. **Photo Quality** — header row with the live `{percent}%` in primary color; help "JPEG compression quality…"; `@react-native-community/slider` (`testID="photo-quality-slider"`), `min 0.5 / max 1.0 / step 0.05`, rounded to 2dp and clamped; under-labels "50% (Smallest)" / "100% (Best)". Default `0.9` → 90%.
3. **Video Quality** — `Picker` `testID="video-quality-picker"`. Options: `HD (720p)`→`720p`, `Full HD (1080p)`→`1080p` (default), `4K UHD (2160p)`→`2160p`.
4. **Video Codec** — `Picker` `testID="video-codec-picker"`, **`disabled` on non-iOS**. Options: `Auto (Device Default)`→`auto` (default), `H.264 (AVC) - Maximum Compatibility`→`avc1`, `H.265 (HEVC) - Better Compression`→`hvc1`. On non-iOS an info note explains Android uses the device default.
5. **Maximum Video Duration** — `Picker` `testID="max-duration-picker"`. Options `1 minute`(60) / `2 minutes`(120) / `5 minutes`(300, default) / `10 minutes`(600) / `15 minutes`(900) / `30 minutes`(1800) / `Unlimited`(0). Selecting `Unlimited` renders a warning note about very large files.
6. **GPS Location in Media** — `Switch` "Include GPS coordinates" (`testID="gps-in-media-switch"`, default `true`). When on, an effect calls `Location.getForegroundPermissionsAsync()` and renders one of three status notes: DENIED → warning ("Location permission was denied…"), GRANTED → success ("Location permission granted…"), UNDETERMINED → info ("Location permission will be requested when capturing media."). Uses a `mounted` flag to avoid post-unmount `setState`.
7. **Shutter Sound** — `Switch` "Enable shutter sound" (`testID="shutter-sound-switch"`, default `true`). When OFF, warning note: "Silent capture may not be legal in all regions."
8. **Skip Image Processing** — `Switch` "Skip post-processing" (`testID="skip-processing-switch"`, default `true`), help mentions possible incorrect orientation.

**Web-demo notes:** `expo-location` permission read must be mocked (return `granted`/`denied` from a demo toggle to show all three note states). Slider → `<input type="range" min=0.5 max=1 step=0.05>`. Codec picker disabled state depends on `Platform.OS !== 'ios'` — pick one for the demo or expose a platform switcher.

---

### 4.6 Time Sync panel

Files:
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/time-sync/components/TimeSyncSettingsSection.tsx`
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/time-sync/types.ts`
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/time-sync/hooks/useTimeSyncSettings.ts`

Purpose: choose the NTP server region that the precision-time-sync feature uses for calibration.

**There is only ONE control.** No server hostname field, no "test sync" button, no accuracy readout in this panel — the sync test/accuracy UI lives in the time-offset wizard screen, not here.

| Control | Type | Options (label→value) | Default |
|---|---|---|---|
| NTP Server Region | `Picker` `testID="ntp-region-picker"` | `Canada (NRC)`→`canada`, `USA (NIST)`→`usa`, `Europe (PTB/METAS)`→`europe`, `Global (Cloudflare)`→`global` | `canada` |

- Description above: "Select the NTP server region used for time calibration. Choose the region matching your jurisdiction for optimal latency and forensic traceability."
- Field help: "Determines which atomic clock authority your timestamps are traceable to."
- Info box below: "This setting affects the forensic traceability chain documented in time calibration reports. Canada uses NRC atomic clocks, USA uses NIST, and Europe uses PTB/METAS. The Global option uses Cloudflare anycast servers."
- Handler validates against `['canada','usa','europe','global']` before writing.
- Persisted: `cctv-app-settings` → `timeSync.ntpRegion`. Consumer: `src/features/precision-time-sync/services/unified-sync.ts`.

**Web-demo notes:** No UDP in this panel; the actual NTP work (`react-native-udp`) belongs to the time-offset screen. Demo just persists the region string. Row preview reads back "Canada (NRC)" etc.

---

### 4.7 Export Security panel + PasswordModal

Files:
- Panel: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/export-security/components/ExportSecuritySection.tsx`
- Modal: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/export-security/components/PasswordModal.tsx`
- Types/constants: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/export-security/types.ts`
- Hook: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/export-security/hooks/useEncryptionSettings.ts`
- SecureStore service: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/export-security/services/secure-password-service.ts`
- Policy: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/export-security/services/resolve-password.ts`

**Panel structure** (`testID="export-security-section"`):
1. Description: "Password-protect exported evidence for secure handling. The two switches are independent and share one password, mode, and strength."
2. **Encrypt ZIP exports (case, location)** — raw RN `Switch` `testID="export-security-encryption-switch"`, default OFF → `encryption.zipEncryptionEnabled`.
3. **Encrypt single-file shares (GeoJSON, Map, reports)** — RN `Switch` `testID="export-security-singlefile-switch"`, default OFF → `encryption.singleFileEncryptionEnabled`.
4. Everything below renders only when **either** switch is on:
   - **Export Mode** (radio group, custom `Pressable` + outer/inner circle):
     - "Auto-use saved password" → `promptMode='auto'` (default), `testID="export-security-prompt-auto"`
     - "Prompt before every export" → `promptMode='always_prompt'`, `testID="export-security-prompt-always"`
     - Help: "Choose how passwords are handled during export."
   - **Encryption Strength** (radio group, `STRENGTH_OPTIONS` order):
     - `AES-256 — Recommended (strong)` (default) — `testID="export-security-strength-aes256"`
     - `AES-128 — iOS yields AES-256` — `testID="export-security-strength-aes128"`
     - `Standard — weak (ZipCrypto), legacy only` — `testID="export-security-strength-standard"`
     - Help: "AES requires 7-Zip or WinRAR to open the ZIP on Windows. Standard (ZipCrypto) is weak and provided only for legacy compatibility."
   - **Default Password** block:
     - Status line `testID="export-security-password-status"`: with password → green `checkmark-circle` + "Default password saved"; without → "No default password set".
     - Button `testID="export-security-set-password"` with `key-outline` icon: label is "Change Default Password" when one exists, else "Set Default Password". Opens an **inline** form (not a modal): a `TextInput` with `secureTextEntry` toggled by an eye button, placeholder "Minimum 8 characters", plus Cancel / Save. **Save is disabled while `newPassword.length < 8`** and its background is `colors.disabled` until valid. On failure to write SecureStore → `Alert.alert('Save Failed', 'Could not save the password to secure storage. Please try again.')`.
     - Button `testID="export-security-clear-password"` (only when a password exists and the form is closed), `trash-outline`, error-colored: "Clear Default Password" → `Alert.alert('Clear Default Password', 'Are you sure you want to clear the saved default password?', [Cancel, destructive Clear])`. Failure → `Alert.alert('Clear Failed', …)`.
   - **Warning box** `testID="export-security-warning"`: `lock-closed-outline` + "Password cannot be recovered. If you forget the password, the exported ZIP cannot be opened."

**Validation / policy constants:** `MIN_PASSWORD_LENGTH = 8`. `SECURE_STORE_KEYS.DEFAULT_ZIP_PASSWORD = 'cctv_default_zip_password'`. `saveDefaultPassword` additionally rejects empty/whitespace-only strings.

**Persistence split:** booleans/mode/strength → AsyncStorage (`cctv-app-settings.encryption`). **The password itself never touches AsyncStorage or SQLite** — it lives in `expo-secure-store` (Keychain/Keystore). `hasPassword` is derived local state refreshed on mount and after save/clear; `isLoading` covers the initial SecureStore probe. Disabling encryption deliberately does NOT clear the stored password.

**PasswordModal** (export-time prompt, `PasswordModalProps { visible, defaultPassword, onSubmit, onCancel }`):
- Transparent `Modal animationType="fade" statusBarTranslucent`, dark backdrop `rgba(0,0,0,0.6)` (`testID="password-modal-backdrop"`, tap = cancel), glass card 85% width / max 380 (`testID="password-modal"`), `LinearGradient` glass + 1px top highlight + heavy shadow (iOS) / elevation 24 (Android).
- Header "Encryption Password" + close `×`; gradient divider.
- Password `TextInput` `testID="password-modal-input"`, placeholder "Minimum 8 characters", `secureTextEntry` unless the eye toggle (`testID="password-modal-show-hide"`) is on, `returnKeyType="done"` submits.
- Validation hint `testID="password-modal-validation-hint"` "Minimum 8 characters" shows only when `0 < length < 8`. **No strength meter (explicit design decision).**
- Checkbox `testID="password-modal-save-default"` "Save as default password", **checked by default**, 20×20 rounded square with a `checkmark` glyph.
- Warning `testID="password-modal-warning"`: "Password cannot be recovered. If you forget the password, the encrypted file cannot be opened."
- Buttons: Cancel (`testID="password-modal-cancel"`) and a gradient Export button (`testID="password-modal-export"`, `shield-checkmark-outline` + "Export"), **disabled and 50% opacity while invalid**.
- State resets on every `visible` → true (`password = defaultPassword`, `saveAsDefault = true`, `showPassword = false`).
- Returns `{ password, saveAsDefault }` via `onSubmit`.

**Password-resolution policy** (`resolvePasswordPolicy(enabled, promptMode)`), shared by the ZIP flow and the single-file flow:
- `!enabled` → `{type:'none'}`
- `auto` + saved default → `{type:'password', value}`
- `auto` + no default, or `always_prompt` → `{type:'prompt'}` (show PasswordModal)

**Web-demo notes:**
- `expo-secure-store` must be mocked. Do **not** persist a demo password to `localStorage` in plaintext if it's user-typed — an in-memory mock is the right demo choice; expose `hasPassword` as state.
- `Alert.alert` → a modal confirm.
- The actual ZIP encryption (`react-native-zip-archive`) is out of this panel; the demo only needs the settings + the modal.

---

### 4.8 Security panel (biometrics)

File: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/biometrics/components/SecuritySettingsSection.tsx`
Store: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/biometrics/store/biometric-store.ts`
Types: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/biometrics/types.ts`
Hook: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/biometrics/hooks/useBiometric.ts`

Reached only after `authenticateWithFallback('settings_access')` succeeds (gate is in `SettingsModal`, not here).

**Three render states:**
1. **Loading** (`capability === null`): info-tinted box with `ActivityIndicator` + "Checking biometric availability…".
2. **Unavailable** (`!hasHardware || !isEnrolled`): description + warning box titled "{biometricName} Not Available" with body "Biometric authentication is not set up on this device…", plus an outlined "Open Device Settings" button (`Linking.openSettings()`, with an Alert fallback).
3. **Available**: description "Protect your case data with {biometricName} authentication…" then three toggles:

| Control | testID | Label | Default | Interaction |
|---|---|---|---|---|
| App Lock | `app-lock-switch` | "Enable app lock" | `false` | **Enabling first requires `authenticateUser('app_unlock')`**; on failure (and not user-cancelled) shows `Alert.alert('Authentication Required', 'Please authenticate to enable App Lock.')` and the toggle does not flip. Disabling is unguarded. |
| Protect Exports | `export-protection-switch` | "Enable export protection" | `false` | direct write |
| Allow Device Passcode | `device-fallback-switch` | "Enable passcode fallback" | `true` | direct write |

Help copy references `{biometricName}` ("Face ID"/"Touch ID"/"Biometrics" fallback) throughout. Closing info box: "Note: Security settings protect sensitive case data and exports with biometric authentication."

**Persistence:** Zustand + persist, **key `cctv-biometric-settings`**, `version: 1`, `partialize` persists ONLY `settings` — `capability`, `isAuthenticated`, `isPromptActive`, `lastAuthAttemptTime` are runtime-only and a custom `merge` guarantees they're never restored.

`AuthContext` union + prompt strings (`AUTH_PROMPTS`): `app_unlock` "Authenticate to open DVR Extraction Notes", `export_pdf`, `export_zip`, `settings_access` "Authenticate to access security settings", `agency_user_management` "Authenticate to manage agency users".

**Web-demo notes:**
- `expo-local-authentication` must be mocked. Simulate capability with a demo control so all three render states are reachable (loading / unavailable / available).
- `Linking.openSettings()` → no-op or toast.
- WebAuthn is a tempting real substitute but overkill; a fake "Authenticate" confirm dialog reproduces the flow.

---

### 4.9 Cloud Sync panel (status home)

File: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/cloud-sync/components/CloudSyncSettingsSection.tsx`
Hook: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/cloud-sync/hooks/useCloudSyncSettings.ts`
Status hook: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/agency-cloud/hooks/useCloudStatus.ts`
Types: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/cloud-sync/types.ts`

Container `testID="cloud-sync-settings-section"`. Always-present description: "Sync case data to your agency's own cloud database after each save. Your agency owns the database — nothing is shared with anyone else."

**State A — NOT configured** (`!status.configured`): exactly two buttons.
- primary "Set up agency cloud" (`testID="cloud-sync-setup-button"`) → opens `ProvisioningWizardModal`
- outline "Join agency cloud" (`testID="cloud-sync-join-button"`) → opens `EnrollDeviceModal` (scan phase)

**State B — configured:**
1. Status box `testID="cloud-sync-status"`: `cloud-done-outline` (success color) + "Connected to {projectRef}", plus a detail line `testID="cloud-sync-status-detail"` computed by `syncStateText` in this precedence:
   1. `skipReason === 'auth-required'` → "Sign in required"
   2. `skipReason === 'schema-stale'` → "Cloud needs an update — ask your admin"
   3. `mediaFailed > 0` → "{n} media file(s) not uploaded yet — will retry"
   4. `skippedMediaBacklog > 0` → "{n} file(s) not synced (plan limit)"
   5. `skippedMediaBacklog === null` (unknown) → "Checking sync status…"
   6. `lastSyncOk === true` → "Up to date"; `=== false` → "Last sync had errors"; `null` → "Waiting for first sync"
2. **Oversize-skipped banner** `testID="cloud-sync-skipped-oversize"` (warning box, `cloud-offline-outline`) when backlog > 0: "{n} file(s) skipped — over your plan's per-file upload limit. Keep video clips under ~30 seconds, or upgrade the plan and have your admin re-run setup; skipped files then retry the next time the app opens."
3. **Paused banner** `testID="cloud-sync-paused-banner"` when `status.paused`: `pause-circle-outline` + "Your agency cloud project is paused. Open the Supabase dashboard to restore it." + small outline "Open dashboard" (`testID="cloud-sync-paused-dashboard"`) → `Linking.openURL(projectDashboardUrl(projectRef))`.
4. **Sign-in prompt** when `skipReason === 'auth-required'`: primary "Sign in" (`testID="cloud-sync-sign-in-button"`) → `EnrollDeviceModal` with `initialPhase="sign-in"`.
5. **Enable cloud sync** `Switch` `testID="cloud-sync-toggle"` → `cloudSync.cloudSyncEnabled` (default `false`). `disabled={isLocked}` where **`isLocked = !configured && !__DEV__`** (production builds unlock the moment the device is enrolled; dev builds are always unlocked).
6. **Admin-only actions** when `status.isAdminDevice`:
   - outline "Enroll a device" (`testID="cloud-sync-show-qr-button"`) → `EnrollmentQRModal`
   - outline "Manage users" (`testID="cloud-sync-manage-users-button"`) → `UserManagementModal`
   - outline "Upgraded your plan? Re-run setup" (`testID="cloud-sync-rerun-setup-button"`) → re-opens the wizard (the only path that refreshes upload caps)
7. **Disconnect** danger button `testID="cloud-sync-disconnect-button"` "Disconnect this device" → `Alert.alert('Disconnect this device?', 'Case data stays on this phone, but sync stops until an admin re-enrolls it with the agency QR code.', [Cancel, destructive Disconnect])`. On confirm: `clearAgencyCloudConfig()`; success → `cloudSyncEnabled: false`; failure → visible error text `testID="cloud-sync-disconnect-error"` "Could not disconnect — try again".
8. `__DEV__` + sync enabled → info box `testID="cloud-sync-dev-indicator"`: "Dev mode: unenrolled builds fall back to the development Supabase instance."

An effect calls `status.checkPaused()` whenever `configured` becomes true.

**`useCloudStatus()` fields:** `configured`, `config`, `signedIn`, `isAdminDevice`, `skipReason`, `lastSyncOk`, `mediaFailed`, `skippedMediaBacklog` (**`null` means UNKNOWN, never render as 0**), `paused`, `checkPaused()`, `refresh()`. It subscribes to `subscribeConfigChange` and `subscribeSyncResult` from the sync barrel.

**Sync pipeline behind the toggle** (`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/sync/`):
- Push-only: local SQLite is the source of truth; Supabase is the mirror. Entry `syncToCloud()` in `services/sync-service.ts`; fire-and-forget trigger `onSaveComplete()` after every successful SQLite write; `triggerStartupSync()` + `startNetworkListener()` mounted once by `components/SyncBootstrap.tsx` at the app root.
- Gate order: **settings gate (`cloudSyncEnabled`)** → mutex (zombie reset after 5 min) → 30 s throttle → NetInfo network check → auth → push cases → push locations → upload media.
- Dirty detection: `synced_at IS NULL OR updated_at > synced_at` (cases/locations, capped 50/cycle); media `synced_at IS NULL` (immutable).
- Media: `FileSystem.uploadAsync` streaming (never reads video into JS heap); non-2xx is not thrown by `uploadAsync`, so the service checks `response.status` manually.
- Typed skips: `SyncResult.skipReason ∈ 'not-configured' | 'auth-required' | 'schema-stale'`. `SyncResult` also carries `casesUpserted`, `locationsUpserted`, `mediaUploaded`, `mediaFailed`, `mediaSkippedOversize` (per-cycle telemetry only), `errors`.
- Oversize skip: `media_files.sync_skip_reason='oversize'` (local column), detected either by the local `maxUploadBytes` pre-check or a server EntityTooLarge; retried once per app launch via `triggerStartupSync({retryOversize:true})`; the UI reads the DB-backed `countSkippedMedia()` backlog.
- Config custody: `AgencyCloudConfig` in **SecureStore under key `agency_cloud_config`** (`services/supabase-config-service.ts`); sessions encrypted via `LargeSecureStore` (AES-256-CTR ciphertext in AsyncStorage, key in SecureStore).

**Web-demo notes:** Everything here needs simulation — Supabase client, SecureStore, NetInfo, `Linking.openURL`. The right demo shape is a `cloudStatus` mock object with a control panel to flip `configured / signedIn / isAdminDevice / paused / skipReason / mediaFailed / skippedMediaBacklog / lastSyncOk` so all banner permutations are demoable. `isLocked` should be forced `false` in the demo so the toggle is interactive.

---

### 4.10 About panel

File: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/components/AboutSection.tsx`

- Header block: 80×80 primary-filled rounded square with Ionicons `videocam` (48px, inverse) + app name (`fontSize['2xl']` bold) + "Version {appVersion}".
- Build info rows (label/value, separated by a top border): **Platform:** iOS / Android / Unknown (from `Constants.platform`); **Expo SDK:** `Constants.expoConfig?.sdkVersion`.
- Description (centered): "A professional tool for law enforcement and forensic professionals to document CCTV/DVR evidence recovery with court-admissible documentation and precise time calibration."
- **Contact Support** row-button (`mail` icon + label + `chevron-forward`, `accessibilityRole="link"`): builds `mailto:fvadd.dev@gmail.com?subject={appName} v{version} - Support Request` and calls `Linking.openURL` **without a `canOpenURL` guard** (deliberate — `canOpenURL` needs `LSApplicationQueriesSchemes` and previously caused an uncaught-promise crash). On throw: `logError` + toast `{type:'error', text1:'Could not open email', text2:'No mail app is available on this device.'}`.
- Footer: "© {currentYear} DVR Extraction Notes" / "All rights reserved".

**Web-demo notes:** `mailto:` works natively in a browser; keep the same href. Platform/SDK rows → static demo values.

---

### 4.11 Developer panel (`__DEV__` only)

File: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/components/DevSettingsSection.tsx`

- Container `testID="dev-settings-section"`.
- Description: "Debug settings for development builds. These options have no effect in production."
- One `Switch` `testID="verbose-import-logging-toggle"` labeled "Verbose Import Logging", default `false` → `devSettings.verboseImportLogging`. Sub-caption: "Log full pipeline data for PDF and JSON imports. Useful for diagnosing field mapping issues."
- Row itself is hidden in production (`devOnly`) and carries the `DEV` badge in the detail nav bar.

**Web-demo notes:** Gate behind a demo `?dev=1` flag or show it always with the DEV badge to expose the surface.

---

### 4.12 User Profile (MOST DETAIL)

Files:
- Section body: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/user-profile/components/UserProfileSection.tsx`
- Editor modal: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/user-profile/components/UserProfileModal.tsx`
- Store: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/user-profile/store/user-profile-store.ts`
- Types: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/user-profile/types.ts`
- Duration util: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/user-profile/utils/compute-duration.ts`
- Barrel: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/user-profile/index.ts`

**Purpose.** One device-local analyst identity, entered once and reused. Feeds the completion screen's "Completed By" autofill (which then flows into the Case Notes PDF), and is the staging ground for future "Will Say" document generation.

**Multi-profile support: NONE.** There is exactly one profile per device — the store's state *is* the profile (`UserProfileState extends UserProfile`), not a collection. No profile id, no switching, no list. (Do not confuse this with `form-customization`'s "profiles", which are field-visibility presets — an unrelated concept.)

**Avatar / signature: NONE implemented.** `agencyLogoUri: string` exists on the type as a `[Future]` placeholder, is always `''`, has **no UI at all** (the modal's local `ProfileFormData` explicitly excludes it), and is never rendered. There is no avatar, no signature capture, no image picker in this feature.

#### Data model — all 8 fields, all `string`, all default `''`

| # | Field | Type | Default | Purpose |
|---|---|---|---|---|
| 1 | `name` | string | `''` | Analyst full name — autofills "Completed By" |
| 2 | `badgeNumber` | string | `''` | Badge / employee ID |
| 3 | `timeInFieldStart` | ISO date string or `''` | `''` | Date started in the forensic-video / investigative field `[Will Say]` |
| 4 | `timeAtAgencyStart` | ISO date string or `''` | `''` | Date started at the current agency `[Will Say]` |
| 5 | `currentAgency` | string | `''` | Employer / police service `[Will Say]` |
| 6 | `unitName` | string | `''` | Unit / section name `[Will Say]` |
| 7 | `qualifications` | string | `''` | Free-form qualifications / education / certifications `[Will Say]` |
| 8 | `agencyLogoUri` | string | `''` | `[Future]` — **no UI, never set** |

`DEFAULT_USER_PROFILE` is the literal above with every field `''`.

#### Store

```ts
interface UserProfileState extends UserProfile {
  updateProfile: (updates: Partial<UserProfile>) => void   // shallow merge
  isProfileComplete: () => boolean                          // name.trim().length > 0
}
```
- Zustand + `persist`, `createJSONStorage(() => AsyncStorage)`, **key `cctv-app-user-profile`**, **`version: 1`**.
- **No `migrate` callback exists yet** — bumping `version` without adding one would DISCARD every saved profile (documented pitfall).
- **No `resetProfile` action exists.** The sub-feature README and `src/features/README.md` both document `resetProfile()`; it is not in the store, and the only other references are a test-file comment. Treat as documentation drift — the demo should not implement a reset that the app doesn't have (or, if it does, mark it as an addition).
- Hydration gate: `useUserProfileHydration()` — same pattern as `useSettingsHydration` (`hasHydrated()` seed + `onFinishHydration` subscription). No fail-open deadline here (unlike form-customization).

#### Component tree (exact)

```
UserProfileSection                    (the settings detail body; testID="user-profile-section")
├── [hasName === true]
│   ├── Text  testID="user-profile-section-name"    "Name: {name}"
│   ├── Text  testID="user-profile-section-badge"   "Badge: {badgeNumber}"      (only if non-blank)
│   ├── Text  testID="user-profile-section-agency"  "Agency: {currentAgency}"   (only if non-blank)
│   ├── Text  testID="user-profile-section-unit"    "Unit: {unitName}"          (only if non-blank)
│   └── Button variant="outline" size="small" testID="user-profile-section-edit-button" → "Edit Profile"
├── [hasName === false]
│   ├── Text (textSecondary) "No profile configured."
│   └── Button variant="outline" size="small" testID="user-profile-section-edit-button" → "Set Up Profile"
└── UserProfileModal visible={showModal} onClose={…}      (owned by this component's local state)
```
`hasName` = `name.trim().length > 0`. The section subscribes to exactly four fields with separate selectors (`name`, `badgeNumber`, `currentAgency`, `unitName`). Note `timeInFieldStart` / `timeAtAgencyStart` / `qualifications` are **not** summarized in the section.

```
UserProfileModal  (Modal presentationStyle="pageSheet" animationType="slide"; testID="user-profile-modal")
└── SafeAreaView
    └── GridBackground showScanLine={false}
        ├── LinearGradient header (GlassColors[scheme].elevated, borderBottomWidth 1, padding lg, gap sm)
        │   ├── Ionicons "person-circle-outline" 24 primary
        │   ├── Text "User Profile"  (fontSize['2xl'], bold, flex 1)
        │   └── Pressable close  testID="user-profile-modal-close-button"  → Ionicons "close" 24
        └── KeyboardAwareScrollView (bottomOffset 40, keyboardShouldPersistTaps="handled", bounces)
            ├── 1. TextInput  label "Full Name"                    placeholder "Your full name"                                   testID="profile-name-input"
            ├── 2. TextInput  label "Badge / ID Number"            placeholder "Badge or employee number"                          testID="profile-badge-input"
            ├── 3. DateTimePickerInput mode="date" label "Start Date in Field"                                                     testID="profile-time-in-field"
            │      └── Text (duration, textSecondary) e.g. "12 years, 3 months"  — only when computeDuration() is non-null
            ├── 4. DateTimePickerInput mode="date" label "Start Date at Current Agency"                                            testID="profile-time-at-agency"
            │      └── Text (duration)                              — only when non-null
            ├── 5. TextInput  label "Current Agency"               placeholder "Police service or employer"                        testID="profile-agency-input"
            ├── 6. TextInput  label "Unit / Section Name"          placeholder "e.g., Forensic Video Unit, FVU, Forensic Multimedia" testID="profile-unit-input"
            ├── 7. TextInput  label "Qualifications & Education"   placeholder "Paste your qualifications, education, certifications..."
            │                 multiline numberOfLines={8}                                                                          testID="profile-qualifications-input"
            └── Footer (borderTopWidth 1, paddingTop lg)
                └── Button variant="primary" flex:1  testID="user-profile-save-button"  → "Save Profile"
```

#### Editing semantics

- **Local-state editing, commit-on-save.** `formData` (a `ProfileFormData` of the 7 editable fields) is seeded from `useUserProfileStore.getState()` in a `useEffect` on every `visible → true`. Closing without saving discards changes; **there is no Cancel button** — the header `×` is the discard path.
- Text fields are **uncontrolled**: `defaultValue={formData.x}` + `onEndEditing` reading `e.nativeEvent.text`. This means a value only lands in `formData` when the field **blurs**. (Consequence a web port must reproduce or deliberately fix: typing into a field and hitting Save while it still has focus can lose that field's edit on some platforms.)
- Date fields use `DateTimePickerInput` (`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/components/form/DateTimePicker.tsx`) with `mode="date"`; value converted via `toJSDate(iso)` and written back via `toStorageFormat(date)` (both from `@/lib/utils/datetime`).
- **Save** (`handleSave`): trims `name`, `badgeNumber`, `currentAgency`, `unitName`, `qualifications`; leaves the two date strings untouched; calls `updateProfile(trimmed)`; `Keyboard.dismiss()`; `onClose()`.

#### Validation

**There is no field-level validation and no required field.** No error text, no disabled Save, no email/phone/length rules. The only rules in the whole sub-feature:
- Whitespace trimming of the five text fields on save.
- `isProfileComplete()` = `name.trim().length > 0` — used only to decide the section's "Edit Profile" vs "Set Up Profile" label path (via `hasName`), never to block saving.
- `computeDuration` returns `null` for empty/unparseable/future dates, which simply hides the duration line.

#### `computeDuration(startDateISO): string | null`

- `''` or unparseable (`parseDateTime` returns falsy) → `null`.
- `totalMonths = (now.year - start.year)*12 + (now.month - start.month)`.
- `totalMonths < 0` → `null` (future date).
- `totalMonths === 0` → `'Less than 1 month'` if `start <= now`, else `null`.
- Else `displayYears = floor(total/12)`, `displayMonths = total % 12`; renders `"{n} months"` / `"{n} years"` / `"{y} years, {m} months"` with correct singular/plural.
- Uses Luxon `DateTime.now()` and the project's `parseDateTime` (wall-clock convention).

#### How the profile reaches PDFs / notes

**Indirectly, via exactly one field.** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/(form)/completion.tsx`:
```ts
const hydrated    = useUserProfileHydration()               // line 54
const profileName = useUserProfileStore(s => s.name)        // line 55
useEffect(() => {
  if (!hydrated) return
  if (!completedBy && profileName.trim()) updateField('completedBy', profileName.trim())
}, [hydrated])                                              // lines 128-133
```
- Fires **once per screen mount**, and **only when `completedBy` is still empty** — never overwrites a typed or SQLite-loaded value.
- `completedBy` then persists to the Location under the save mutex and renders as **Completed By** in the Case Notes PDF.
- Editing the profile later does NOT retroactively change `completedBy` on existing Locations.
- The `completion.completedBy` field is itself subject to form-customization visibility (`useFieldVisible('completion.completedBy')`, line 59).
- The other seven profile fields currently reach **no** output. `badgeNumber`, `currentAgency`, `unitName`, `qualifications`, and the two dates are stored for the not-yet-built "Will Say" generator.

**Web-demo notes:**
- Storage: `localStorage['cctv-app-user-profile']`, single object, no versioning needed beyond mirroring `{state: {...}, version: 1}` if you want zustand-persist shape parity.
- Nothing native here — no SecureStore, no biometrics, no camera. The only mock-worthy pieces are `KeyboardAwareScrollView` (→ plain scroll) and `DateTimePickerInput` (→ `<input type="date">`).
- Reproduce the blur-commit behavior faithfully or upgrade to controlled inputs and note the deviation.
- Reproduce the "autofill Completed By once, only when empty" rule — it is the profile's only real integration and the most demo-visible behavior.
- Duration strings are pure JS — port `computeDuration` verbatim (swap Luxon for `Date` math or keep Luxon).

---

### 4.13 Form Customization panel

Files:
- Panel: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/form-customization/components/FormCustomizationSection.tsx`
- Profile picker: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/form-customization/components/ProfilePicker.tsx`
- Store: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/form-customization/store/form-customization-store.ts`
- Resolver: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/form-customization/services/visibility-resolver.ts`
- Registries: `.../config/wizard-steps.ts`, `.../config/field-registry.ts`, `.../config/profiles.ts`, `.../config/invariants.ts`
- Hooks: `.../hooks/useFieldVisible.ts`, `useStepVisible.ts`, `useVisibleSteps.ts`, `useWizardNav.ts`

**Purpose.** Choose which wizard screens and fields appear in the `app/(form)/` drawer, via a preset profile plus sparse per-screen / per-field overrides.

#### Panel UI (`testID="fc-section"`), in order

1. Description: "Pick a profile for sensible defaults, then turn individual screens or fields on or off. Required screens and fields stay on. Changes apply to the wizard immediately."
2. **`FormCustomizationProfilePicker`**:
   - Label "Profile"; help "Sets the default fields. You can still toggle anything below; switching profiles resets to its defaults."
   - A `radiogroup` row of three equal-flex chips (`minHeight: Layout.touchTarget.medium`, 1px border, border+text turn `colors.primary` when active): **Forensic** (`fc-profile-forensic`), **Limited** (`fc-profile-limited`), **Canvas** (`fc-profile-canvas`).
   - Blurb under the row, for the ACTIVE profile: forensic → "Everything on — full forensic detail (FVA/FVT)."; limited → "Comprehensive, lightly reduced (SPC/SOCO)."; canvas → "Streamlined for canvassing — fewer technical fields."
   - Selecting a different profile when overrides exist → `Alert.alert('Apply profile?', "Switching to {Label} resets your custom field choices to that profile's defaults.", [Cancel, destructive Apply])`. With no overrides it applies immediately.
3. **Linear screen rows** (`LINEAR_STEPS` in order), each a bordered `group` card:
   - Header row (`minHeight: Layout.touchTarget.large`): a `Pressable` (`testID={`fc-group-${stepId}`}`) with a `▸`/`▾` chevron + the step label (tap toggles expand, `accessibilityState={{expanded}}`), then an optional **"Always on" pill** (`testID={`fc-screen-lock-${stepId}`}`, xs, bordered, full radius) for must-stay screens, then a `Switch` (`testID={`fc-screen-toggle-${stepId}`}`) that is `disabled` and forced `true` for must-stay screens.
   - Expanded body (indented to line up under the label):
     - not field-capable → a note from `SCREEN_NOTES` (`time-offset`: "Required time calibration — always shown. No individual fields to configure."; `extracted-video-scope`: "Auto-calculated from the time offset…"; `notes`: "Auto-generated from your entries…"; `media-capture`/`audio-recording`: "A capture tool opened from the wizard drawer…"), falling back to "This screen has no individual fields to configure."
     - screen hidden → "This screen is hidden. Turn it on above to customize its fields."
     - else → one `FieldRow` per field: label (flex, 1 line) + optional "Always on" pill (`fc-field-lock-{fieldId}`) + `Switch` (`fc-toggle-{fieldId}`, disabled+forced-on for always-on fields, `accessibilityHint` "Always on — this field is required and can't be turned off.").
4. Header "Additive tools" then the same `ScreenRow` treatment for `ADDITIVE_STEPS` (`media-capture`, `audio-recording`).
5. Footnote: "Hidden screens are removed from the wizard flow only — any data already entered is still saved and still appears in the generated report."

**Loop safety:** every visibility read is a per-instance **boolean** selector (`useFieldVisible`/`useStepVisible`); collapsed rows do not mount their bodies.

#### Step registry (order + classification)

| order | id | route label | classification | must-stay? |
|---|---|---|---|---|
| 1 | `submission` | Submission Details | field-capable | ✔ (hosts always-on fields) |
| 2 | `requested-scope` | Requested Scope | field-capable | ✔ |
| 3 | `arrival-departure` | Arrival/Departure | field-capable | — |
| 4 | `time-offset` | Time Offset | screen-only | ✔ |
| 5 | `extracted-video-scope` | Extracted Video Scope | screen-only | — |
| 6 | `dvr-information` | DVR Information | field-capable | — |
| 7 | `cameras` | Cameras | field-capable | — |
| 8 | `export-information` | Export Information | field-capable | — |
| 9 | `notes` | Notes | screen-only | — |
| 10 | `completion` | Completion | field-capable | ✔ (terminal) |
| 101 | `media-capture` | Capture Media | screen-only, `additive` | — |
| 102 | `audio-recording` | Record Audio | screen-only, `additive` | — |

`ocr-capture` is deliberately absent from the registry.

#### Field registry (57 entries, `<screen>.<key>` ids)

- `submission.*` (16): occNumber, requesterName, requesterBadgeNumber, requesterUnit, requesterPhone, requesterEmail, businessName, streetAddress, city, address, latitude, longitude, coordinateAccuracy, coordinateSource (last four grouped `gps:submission`), locationContact, locationPhone.
- `scope.*` (4): startDateTime, endDateTime, isActualTime, cameras.
- `arrival.*` (2): arrivalDateTime, departureDateTime.
- `timeoffset.*` (3): dvrDateTime, actualDateTime, dvrAppliesDST.
- `extracted.*` (3): startDateTime, endDateTime, cameras.
- `dvr.*` (13): dvrLocation, dvrTypeBrand, serialModelNumber, dvrUsername, dvrPassword, numberOfChannels, activeCameras, recordingSchedule, resolution, recordingFps, firstRecordedDate, totalDvrRetention, daysUntilOverwritten.
- `camera.*` (8): cameraName, resolution, recordingFps, latitude, longitude, coordinateAccuracy, coordinateSource, coordinateCapturedAt (last five grouped `gps:camera`).
- `export.*` (5): exportMedia, fileType, sizeGb, mediaPlayerIncluded, mediaProvidedVia.
- `notes.*` (2): notesSections, notesFreeText.
- `completion.*` (2): dateTimeCompleted, completedBy.

Each entry carries `{ id, storeKey, screen, label, group? }`. `getField`/`getStep` throw in `__DEV__` and `logError` in production on a registry miss.

#### Invariants (derived, never user-set)

`ALWAYS_ON_FIELDS` = `submission.occNumber`, `submission.address`, `submission.businessName`, `submission.streetAddress`, `submission.city`, `scope.startDateTime`, `scope.endDateTime`, `timeoffset.dvrDateTime`, `timeoffset.actualDateTime`.
`isStepMustStay(id)` = `id === 'completion'` **or** the step hosts an always-on field → `submission`, `requested-scope`, `time-offset`, `completion`.

#### Profiles

| Profile | Off-steps | Off-fields |
|---|---|---|
| `forensic` (DEFAULT) | none | none |
| `limited` | none | none (identical to forensic today) |
| `canvas` | `cameras` | 5 requester-contact fields (`requesterName/BadgeNumber/Unit/Phone/Email`), 7 DVR spec fields (`dvrLocation`, `serialModelNumber`, `numberOfChannels`, `activeCameras`, `recordingSchedule`, `resolution`, `recordingFps`), all 8 `camera.*` fields |

Defaults are authored as off-lists and expanded to full boolean maps by `buildDefaults()`.

#### Resolution rules

Precedence per item: **always-on/must-stay (forced `true`) > user override > profile default > `DEFAULT_PROFILE` fallback**. Composition: `resolveFieldVisible` short-circuits to `false` when its host step resolves hidden.

#### Store actions & guards

| Action | Behavior |
|---|---|
| `applyProfile(p)` | set `activeProfile`, **clear both override maps** |
| `setStepVisible(id, on)` | **no-op** if must-stay. When turning a removable screen back ON and nothing would show: first clears that screen's field overrides; if profile defaults still hide everything, force-writes `true` for every field on the screen (a re-enabled screen is never blank) |
| `setFieldVisible(id, on)` | **no-op** if always-on. Grouped (GPS) fields toggle **atomically** (all members set together). Turning off the last visible field on a *removable* screen also sets `stepOverrides[screen] = false` (one-way auto-hide; re-showing is always explicit) |
| `resetToProfileDefaults()` | clear both override maps, keep the profile |

#### Persistence & hydration

- Zustand + persist → AsyncStorage, **key `cctv-app-form-customization`**, **`version: 1`**.
- `migrateFormCustomization` validates `activeProfile` against `PROFILE_IDS` (falls back to `forensic`) and coerces both override maps to objects — a renamed/corrupted profile can never reach the resolver.
- `onRehydrateStorage` logs errors; note zustand persist leaves `hasHydrated()` **false forever** on a rehydrate error.
- **Hydration gate:** `useFormCustomizationHydration()` — mounted in `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/(form)/_layout.tsx`, which renders a spinner (`testID="form-customization-loading"`) until it's `true`, preventing a one-frame flash of forensic defaults. **Fails open** via `HYDRATION_FALLBACK_MS = 3000`.
- `__resetFormCustomizationForTests()` exists for the module-singleton store.

#### How it changes the wizard

- Route screens call `useFieldVisible('<screen>.<key>')` to conditionally render fields, and `useWizardNav('<stepId>')` for `{ next: {route, label: 'Next: <label>'} | null, prevRoute }` — hidden steps are skipped automatically, and the hook is robust to `currentId` itself being hidden (stale deep link).
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/components/layout/CustomDrawerContent.tsx` filters the drawer with `useVisibleSteps` + `useStepVisible`.
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/hooks/use-section-completion.ts` uses the resolver so hidden-and-empty fields don't keep a section "partial".
- **Output policy (invariant):** visibility hides **inputs only**. Hidden screens/fields never suppress already-stored data from PDF / GeoJSON / sync.
- Callback-isolation rule: only route screens and the settings panel call these hooks; shared feature components receive visibility via props.

**Web-demo notes:** Zero native dependency — pure JS + AsyncStorage. Port the three config registries and the resolver verbatim; they are the highest-value, lowest-risk part of this section to replicate exactly. `Alert.alert` → confirm modal. The hydration gate can be synchronous in a browser (keep the spinner for fidelity if desired).

---

### 4.14 Agency Cloud — the BYO-Supabase provisioning wizard

Feature root: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/agency-cloud/`

**Model.** The phone drives the Supabase **Management API** (`https://api.supabase.com`) directly with a pasted Personal Access Token (PAT, prefix `sbp_`) to build an agency-owned cloud: project → schema → RLS → storage buckets → realtime → auth lockdown → API keys → admin account. There is **no developer-hosted middle tier**. The PAT is then discarded and the admin is told to revoke it.

**Credential tiers** (custody rules the demo should narrate):

| Credential | Custody | Lifetime |
|---|---|---|
| PAT `sbp_…` | React **ref only** in `useProvisioningWizard` — never state, props, logs, or error strings | zeroed on done / reset / unmount |
| `sb_secret_` key | admin device SecureStore, key **`agency_cloud_secret_key`** | until rotated; **never in a QR** |
| project URL + `sb_publishable_` key | SecureStore via the sync config service (**`agency_cloud_config`**) | until re-enrollment; safe in a QR |
| auth sessions | `LargeSecureStore` (AES-256-CTR, sync feature) | supabase-js managed |
| investigator temp passwords | shown **once**, acknowledged, gone | never stored |

#### Wizard shell

File: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/agency-cloud/components/ProvisioningWizardModal.tsx`
Props: `{ visible, onClose, onShowEnrollmentQr }`.

- `Modal presentationStyle="pageSheet" animationType="slide"`, `SafeAreaView` + `GridBackground`, glass `LinearGradient` header with `cloud-upload-outline` (24, primary) + bold "Agency Cloud Setup" + close `×` (`TEST_IDS.wizard.cancel`), body in a `KeyboardAwareScrollView`.
- `actions.reset()` fires on every false→true `visible` transition (fresh state, no leaked PAT/consent).
- **Cancel semantics:** `holdsSecrets = step !== 'token' && step !== 'done'`. If holding, `Alert.alert('Cancel setup?', 'Setup will stop and your access token will be forgotten. You can start again any time.', ['Keep going', destructive 'Cancel setup'])`; either way `reset()` zeroes secrets.
- Render dispatch: `done` → `DoneStep`; else if `progress && progress.status !== 'blocked'` → `ProgressStep`; else switch on `step` (`token`, `org`|`plan-gate`, `project`, `admin-account`), default → `ProgressStep`.
- Deep links opened here: `DASHBOARD_TOKENS_URL = https://supabase.com/dashboard/account/tokens`, `billingUrlForOrg(slug)`, `projectDashboardUrl(ref)`.

#### State machine

File: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/agency-cloud/hooks/useProvisioningWizard.ts`
`PROVISIONING_STEPS = ['token','org','plan-gate','project','health','schema','storage','auth-config','admin-account','done']`.

State: `{ step, orgs, selectedOrg, orgProjects, progress, error, isBusy, completedConfig, adminToolsAvailable, planTier }`.
Actions: `submitToken`, `selectOrg`, `recheckPlan`, `continueOnFree`, `configureProject`, `submitAdminAccount`, `retry`, `reset`.
Refs (never state): `patRef`, `projectChoiceRef`, `adminRef`, `allowFreeOrgRef` (free-plan consent **bound to the org slug it was granted for**, so switching orgs cannot inherit consent).

#### Step-by-step UI

**Step 1 — Token** (`components/steps/TokenStep.tsx`, `TEST_IDS.wizard.token`)
- Heading "Connect your Supabase account".
- Body: "Your agency's cloud lives in your own Supabase account. Generate an access token, paste it below, and this app builds everything else. The token is used once and then forgotten — you should revoke it afterwards."
- Outline button "Get a token from Supabase" (`wizard.tokenOpenDashboard`) → opens `DASHBOARD_TOKENS_URL`.
- `TextInput` label "Access token", `secureTextEntry`, `autoCapitalize="none"`, `autoCorrect={false}`, placeholder `sbp_…`, helper "Starts with sbp_", error slot bound to `state.error` (`wizard.tokenInput`).
- Ghost "Paste" button → `Clipboard.getStringAsync()` trimmed into the field.
- Primary "Continue" (`wizard.tokenSubmit`), `disabled` until `token.trim().startsWith('sbp_')`, `loading={isBusy}`.
- Hook behavior: prefix-validates ("That doesn't look like a Supabase access token (it starts with sbp_)"), stores in `patRef`, `listOrganizations(pat)`. Zero orgs → error "This Supabase account has no organizations yet — finish creating your account first". **Exactly one org → auto-advances** through the plan gate. Multiple → `step='org'`.

**Step 2 — Org picker / free-plan gate** (`components/steps/OrgPlanStep.tsx`) — one component, two faces.
- *Picker face* (`TEST_IDS.wizard.org`): heading "Choose your organization"; body "Your agency cloud will be created inside this Supabase organization."; a bordered `Pressable` per org (`wizard.orgRow(slug)`) with `business-outline` (20, primary) + org name + `chevron-forward`.
- *Warn face* (`planBlocked === true`, `TEST_IDS.wizard.planGate`): `card-outline` 32px warning icon; heading "{orgName} is on the free plan"; body spelling out the three real limits — every upload capped at **50 MB** (videos > ~30 s won't sync), **1 GB** total storage, DB **pauses after a week of inactivity**; "For full field use, upgrade to Pro (about $25 USD/month) on the Supabase billing page; this app can't do it for you."
  - primary "Open billing page" (`wizard.planGateBilling`, disabled while busy)
  - outline "I upgraded — check again" (`wizard.planGateRecheck`)
  - **ghost** "Continue on the free plan (testing only)" (`wizard.planGateContinueFree`) — deliberately the lowest visual weight
  - Per-action busy tracking (`busyAction ∈ 'recheck'|'continue-free'|null`) so only the pressed button spins and the others disable.
- Gate logic: `checkOrgPlan(pat, slug, {allowFree})`; `planTierOf(plan)` maps `pro|team|enterprise|platform` → `'paid'`, **everything else including missing → `'free'` (fail-closed)**. Without consent it throws `PlanGateError` → `step='plan-gate'`, `planTier='free'`, `progress={step:'plan-gate', status:'blocked', detail}`.
- On pass, the hook best-effort loads adopt candidates: `listProjects(pat)` filtered by `projectBelongsToOrg` (slug↔slug, else deprecated id↔id, **never cross-family**); failures/empty-after-filter are logged, never blocking.

**Step 3 — Project** (`components/steps/ProjectStep.tsx`, `TEST_IDS.wizard.project`)
- Heading "Name your agency cloud"; body "A new database project will be created in Canada (ca-central-1)."
- `TextInput` label "Project name", default value **`'CCTV Recovery Cloud'`** (`wizard.projectNameInput`).
- Primary "Create project" (`wizard.projectCreate`) → `configureProject({mode:'create', name: trimmed || 'CCTV Recovery Cloud'})`.
- If `existingProjects.length > 0`, a link-styled toggle "Reconnecting? Use an existing project" reveals a bordered row per project (`wizard.projectAdoptRow(ref)`): `server-outline` + project name + its `status` → `configureProject({mode:'adopt', ref})`.

**Step 4 — Admin account** (`components/steps/AdminAccountStep.tsx`, `TEST_IDS.wizard.admin`)
- Heading "Create your admin account"; body "This is YOUR sign-in for the agency cloud. You'll also use this device to create accounts for your investigators. No email will be sent — remember these credentials."
- Fields: **Email** (`wizard.adminEmailInput`, `keyboardType="email-address"`, no autocap/autocorrect, placeholder "you@agency.ca"); **Password** (`wizard.adminPasswordInput`, `secureTextEntry`, placeholder "At least 12 characters"); **Confirm password** (`wizard.adminConfirmInput`, `secureTextEntry`, placeholder "Same password again", carries the shared error slot).
- **Validation, in order** (local, zod for email): invalid email → "Enter a valid email address"; `password.length < 12` → "Password must be at least 12 characters"; mismatch → "Passwords do not match". `MIN_PASSWORD_LENGTH = 12` here (note: the *export* password minimum is 8 — different constants).
- Primary "Build my agency cloud" (`wizard.adminSubmit`, `disabled`+`loading` while busy) → `submitAdminAccount(email.trim(), password)` → runs the engine.

**Step 5 — Progress** (`components/steps/ProgressStep.tsx`, `TEST_IDS.wizard.progress`)
- Heading "Building your agency cloud"; body "This usually takes two to five minutes. Keep the app open."
- Fixed display list of 7 engine steps with per-row status:
  1. `plan-gate` — "Checking plan"
  2. `project` — "Creating project"
  3. `health` — "Waiting for the database to come online"
  4. `schema` — "Building the agency database"
  5. `storage` — "Configuring keys and media storage"
  6. `auth-config` — "Locking down access"
  7. `admin-account` — "Creating your admin account"
- Row status derivation (`statusForRow`): rows before the current index = `done`; after = `pending`; the current row = `error` when `progress.status ∈ {error, blocked}`, `done` when `complete`, else `running`. `progress.step === 'done'` marks everything done.
- Glyphs: running → `ActivityIndicator`; done → `checkmark-circle` (success); error → `alert-circle` (error); pending → `ellipse-outline` (tertiary). Pending labels use `textTertiary`.
- `progress.detail` renders italic xs **only when there is no error**.
- On error: red message + primary "Try again" (`wizard.progressRetry`) → `retry()`, which **resumes from the failed step** (every `ensure*` executor is idempotent), not from the beginning.

**Step 6 — Done** (`components/steps/DoneStep.tsx`, `TEST_IDS.wizard.done`)
- `cloud-done-outline` 48px success icon; heading "Your agency cloud is ready".
- Body varies on `adminToolsAvailable`: with tools → "Project {ref} is live in Canada and this device is connected as the agency admin. Case data will now sync automatically."; without → the same minus the admin claim.
- If `planTier === 'free'`, a restated-limits paragraph (`wizard.doneFreePlanNote`): "Free plan: files over 50 MB won't sync (keep video clips under ~30 seconds), storage is capped at 1 GB, and the database pauses after a week of inactivity."
- If `!adminToolsAvailable`, an error-bordered box (`wizard.doneAdminKeyWarning`): "This device could not store the agency admin key, so user management … is unavailable. Sync still works. Re-run setup from Settings → Cloud Sync to restore admin tools."
- Always: a warning-bordered box with `key-outline` — "The access token you pasted is no longer needed — revoke it now so it can never be misused." + outline "Revoke my token" (`wizard.doneRevokeLink`) → `DASHBOARD_TOKENS_URL`.
- Primary "Enroll field devices" (`wizard.doneShowQr`) → closes the wizard and opens `EnrollmentQRModal`.
- Ghost "Done" → `onClose`.

#### Enrollment QR modal

File: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/agency-cloud/components/EnrollmentQRModal.tsx`
Props `{ visible, payload: string|null, onClose }` (pure props).
- pageSheet + glass header `qr-code-outline` + "Enroll a Device" + close (`TEST_IDS.qr.close`).
- With payload: instruction "On the investigator's phone: Settings → Cloud Sync → Join agency cloud, then scan this code. Turn your screen brightness up for a faster scan."; a `react-native-qrcode-svg` `<QRCode value={payload} size={240}/>` inside a **deliberately theme-independent white** padded box (`TEST_IDS.qr.code`) for scan contrast; a note box (`shield-checkmark-outline`): "This code only tells the phone WHERE the agency cloud lives. The investigator still needs the sign-in you created for them."
- Without payload: "Set up your agency cloud first — then this screen shows the code other devices scan to join it."
- **Payload contract** (`enrollmentPayloadSchema`, `types/index.ts`): `{ v: 1, url: https://*.supabase.co, key: sb_publishable_… | eyJ… (≤512 chars) }`. The zod `refine` rejects `sb_secret_`/`sbp_` at the outermost boundary. `buildEnrollmentPayload(config)` is `JSON.stringify` of exactly those three keys.

#### Join / enroll device modal

File: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/agency-cloud/components/EnrollDeviceModal.tsx`
Props `{ visible, onClose, onComplete, initialPhase?: 'scan'|'sign-in' }`. Header: `cloud-download-outline` + "Join Agency Cloud".

Two phases:
- **Scan phase**
  - No camera permission (`TEST_IDS.enroll.permission`): "Scanning the enrollment code needs camera access." + primary "Allow camera" (`useCameraPermissions().requestPermission`) + ghost "Open settings" (`Linking.openSettings()`).
  - Granted: instruction "Point the camera at the enrollment code on your admin's device." + `<CameraView barcodeScannerSettings={{barcodeTypes:['qr']}} onBarcodeScanned=… style={{height:280, borderRadius: lg}}/>` (`TEST_IDS.enroll.scanner`).
  - **Debounce-once**: `scannerArmed` ref accepts exactly ONE scan per arm cycle; a failed payload re-arms.
  - Manual fallback behind the toggle "Can't scan? Enter details manually" / "Scan a code instead" (`TEST_IDS.enroll.manualToggle`): "Cloud address" (`https://xxxxxxxxxxxxxxxxxxxx.supabase.co`, `enroll.manualUrlInput`) + "Publishable key" (`sb_publishable_…`, `enroll.manualKeyInput`) + primary "Connect" (`enroll.manualSubmit`). Validated by `enrollmentPayloadSchema.safeParse({v:1,url,key})`; on failure: "Enter the full https://….supabase.co address and the publishable key".
- **Sign-in phase**: heading "Connected — now sign in"; body "Use the email and temporary password your admin gave you."; Email (`enroll.signInEmailInput`) + Password (`enroll.signInPasswordInput`, `secureTextEntry`, placeholder "Temporary password"); primary "Sign in" (`enroll.signInSubmit`), `disabled` until both non-empty.
- Errors render as red text (`TEST_IDS.enroll.error`).
- **Full state reset on EVERY visibility transition** (phase, manual mode, both manual fields, email, password, error, busy, scanner arm) — the modal stays permanently mounted behind `visible`.
- Services: `parseEnrollmentPayload` → `enrollDevice(payload)` (anonymous PostgREST probe against `app_meta`, then `setAgencyCloudConfig({projectRef, url, publishableKey, authMode:'password'})`) → phase `sign-in` → `completeEnrollmentSignIn(email, password)` = `signInWithPassword` + `checkCloudSchemaVersion()`.
- On success `onComplete()` — the settings section then sets `cloudSyncEnabled: true`.

#### User management modal

File: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/agency-cloud/components/UserManagementModal.tsx`
Header: `people-outline` + "Agency Users".

- **Biometric gate on every open**: an effect keyed on `visible` only (with `onClose` read through a ref to avoid re-prompting on parent re-renders) runs `authenticateWithFallback('agency_user_management')`; failure or throw closes the modal.
- Roster access is gated `visible && authorized` (`useAgencyUsers(active)`), so the RLS-bypassing secret key is never used before the gate passes.
- Non-admin device (`TEST_IDS.users.nonAdmin`): `key-outline` 32px + "Investigator accounts are managed from the device that set up the agency cloud. This device doesn't hold the admin credentials."
- Admin device — header area (rendered as the FlatList `ListHeaderComponent`):
  - **One-shot temp-password box** (`TEST_IDS.users.tempPassword`, warning border) when present: "Temporary password for {email}", the password in large bold primary (`letterSpacing: 1`), hint "Hand this to the investigator now — it will not be shown again.", and a small primary "I've handed it over" (`users.tempPasswordAck`).
  - Create: primary "Add investigator" (`users.create`) expands into "Investigator email" (`users.createEmailInput`, placeholder `investigator@agency.ca`) + "Display name" (`users.createNameInput`, placeholder `Det. J. Smith`) + primary "Create account" (`users.createSubmit`, disabled until both non-empty).
- **Roster** — `FlatList` (the one unbounded list in the feature; it owns the scroll container). Each memoized `UserRow` (`users.row(id)`): email (base, medium), badges row (`ADMIN` / `INVESTIGATOR` uppercase xs; plus a red `DISABLED` badge), and for non-admin rows a `key-outline` reset-password press (`users.resetPassword(id)`) plus a `Switch` (`users.disableToggle(id)`) whose `value = !user.disabled` and whose `accessibilityLabel` names the account ("Enable/Disable account for {email}").
- Errors render as the list footer.
- Hook `useAgencyUsers`: optimistic disable/enable with rollback on failure, `tempPassword` handoff cleared only by `acknowledgeTempPassword()`, memoized `actions` identity so `React.memo` on rows actually fires. Temp-password entropy is a documented accepted risk (~30.5 bits: four words from a 64-word list + two digits).

#### Provisioning constants worth replicating

| Constant | Value |
|---|---|
| `MANAGEMENT_API_BASE` | `https://api.supabase.com` |
| `PAT_PREFIX` | `sbp_` |
| `DEFAULT_REGION` | `ca-central-1` (data residency: Canada) |
| `HEALTH_POLL_INTERVAL_MS` / `HEALTH_POLL_TIMEOUT_MS` | `5_000` / `300_000` |
| `GLOBAL_FILE_SIZE_LIMIT_BYTES` | `524_288_000` (500 MB) |
| `FREE_PLAN_FILE_SIZE_LIMIT_BYTES` | `52_428_800` (50 MB, platform hard cap) |
| `PLAN_TIER_UPLOAD_LIMIT_BYTES` | `{ paid: 500 MB, free: 50 MB }` |
| `SECURE_STORE_KEY_SECRET` | `agency_cloud_secret_key` |
| `BUCKET_SPECS` | three private buckets `images` / `video` / `audio`; `video` and `audio` carry **`fileSizeLimit: null`** (inherit the project global — a bucket limit above the global is rejected outright) |

**Web-demo notes:**
- Everything network here must be simulated: `api.supabase.com` (Management API), the agency project's PostgREST/GoTrue/Storage endpoints, `probeProjectPaused` (HTTP 540).
- `expo-camera` QR scanning must be mocked. Best demo approach: keep the manual-entry fallback as the primary path and offer a "simulate scan" button that feeds a canned `{v:1,url,key}` payload; a real browser demo could also use `getUserMedia` + a JS QR decoder, but that's optional fidelity.
- `react-native-qrcode-svg` → any JS QR generator producing an inline SVG; keep the white quiet-zone box.
- `expo-secure-store`, `expo-clipboard` (`Clipboard.getStringAsync` → `navigator.clipboard.readText()`), `expo-crypto` (temp passwords) all need shims.
- `authenticateWithFallback` for the user-management gate → the same biometric mock as §4.8.
- The wizard is the most demo-worthy flow in this section: script a fake engine that emits `ProvisioningProgress` events on a timer (e.g. one step per 600 ms) so `ProgressStep` animates, and expose failure injection so the "Try again" resume path is demoable.
- Model the free-plan gate faithfully: fail-closed `planTierOf` (unknown → `free`), org-bound consent, and the ghost-weight "continue on free" button.
- The PAT-in-a-ref discipline is worth mirroring in the demo (never render it, never put it in a URL/state you log) — it's a selling point of the flow.

---

### 4.15 Cross-cutting: persistence keys and native dependencies

**AsyncStorage keys (all zustand `persist`):**

| Key | Owner | Version |
|---|---|---|
| `cctv-app-settings` | `useSettingsStore` (7 slices) | 12 |
| `cctv-app-user-profile` | `useUserProfileStore` | 1 (no `migrate`) |
| `cctv-app-form-customization` | `useFormCustomizationStore` | 1 |
| `cctv-biometric-settings` | `useBiometricStore` (`partialize` → settings only) | 1 |

**SecureStore keys:** `cctv_default_zip_password` (export password), `agency_cloud_secret_key` (admin secret key), `agency_cloud_config` (`AgencyCloudConfig`), plus the `LargeSecureStore` AES key backing encrypted Supabase sessions.

**Native modules a web demo must mock/simulate across this whole section:**
`expo-local-authentication` (biometric gate + Security panel), `expo-secure-store` (export password, agency config, admin key), `@react-native-async-storage/async-storage` (→ `localStorage`), `expo-camera` (`CameraView` QR scan + `useCameraPermissions`), `expo-location` (`getForegroundPermissionsAsync` in Media Capture), `expo-clipboard`, `expo-crypto`, `expo-haptics` (Switch/Picker feedback), `expo-constants` (app name/version/SDK), `expo-linear-gradient` (→ CSS gradients), `react-native-reanimated` + `react-native-gesture-handler` (master/detail push + swipe), `react-native-keyboard-controller`, `react-native-qrcode-svg`, `@supabase/supabase-js` + the Supabase Management API, `@react-native-community/netinfo` (sync gate), `react-native-udp` (NTP — not in this section's UI, only the region preference), `Linking.openURL/openSettings`, `Alert.alert`, `react-native-toast-message`.

**Documentation drift found while inventorying (flag, do not "fix" in the demo silently):**
- `src/features/settings/user-profile/README.md` (lines 52, 107) and `src/features/README.md` (line 1038) document a `resetProfile()` store action that **does not exist** in `user-profile-store.ts`.
- `src/features/settings/cloud-sync/README.md` line 11 describes `isLocked` as `!__DEV__`; the actual hook is `!configured && !__DEV__` (unlocks in production once enrolled). The hook's own JSDoc is correct.


---

## 5. Import Flow (JSON + PDF)

Feature root: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/import/`
Sub-features: `json-import/` (deterministic agency-JSON parsing) and `pdf-import/` (on-device AI extraction — also serves pasted free text).

**One-sentence model:** an import always adds a **new Location to an EXISTING case**; it never creates a case. Two source pipelines (JSON parse, AI extract) converge on one Zod schema (`recoveryRequestImportSchema`), then one persist service (`persistMappedImport`) geocodes + writes a `locations` row inside a single SQLite transaction. One picker modal, one flow modal, one pure mode machine decides what the flow modal shows.

Key files (absolute):
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/import/README.md`
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/import/pdf-import/README.md`
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/import/json-import/README.md`
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/import/index.ts` (composite barrel)
- Redesign plans: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/docs/plans/import-terminal-progress/{01-research-and-options.md,02-implementation-plan.md,03-test-spec.md}`, `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/docs/plans/DVR Extraction PDF Import Sucsess redesign/plan/01-import-success-redesign-integration-plan.md`, `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/docs/plans/import-multi-result-card/01-multi-result-card-slice-plan.md`, `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/docs/code-reviews/import-terminal-tail-scroll-deep-dive-2026-07-13.md`

---

### 5.1 Entry point — Cases tab, expanded case card

**Purpose:** start an import into a specific case.

**Components (absolute paths):**
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/(tabs)/cases.tsx` — the ONLY consumer of the import feature. 1213 lines; owns all import state.
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/case-management/components/CaseList.tsx` → `SwipeableCaseCard.tsx` → `CaseCard.tsx`

**Interactions:** tap a case card to expand → an action row appears at the bottom of the card with two small buttons: **`Import`** (`variant="secondary"`, `testID="import-location-button"`, `CaseCard.tsx:149-159`) and **`Add Location`** (`variant="primary"`). Import is only rendered when `onImportPress` is supplied. Tapping calls `handleImportPress(caseId)` in cases.tsx:686 → `setImportCaseId(caseId)` + `setShowImportPicker(true)`.

There is **no import route**, no import tab, no deep link. Import is modal-only, always scoped to one `caseId`. `ImportPickerModal` is only mounted when `importCaseId` is non-null (`cases.tsx:1129`).

**State in cases.tsx (`:159-191`):**
```
showImportPicker: boolean
importCaseId: UUID | null
pdfTerminalAcknowledged: boolean      // the terminal dwell tap-gate
useImport()      → isImporting, progress, result, resetImport, isBatchImporting, batchProgress, batchResult, startImport, startBatchImport
usePdfImport()   → isPdfImporting, pdfProgress, pdfResult, pdfBatchResult, startPdfImport, startTextImport, startBatchPdfImport, resetPdfImport
```

**Web-demo notes:**
- Trivially replicable: a button on an expanded case row that opens a modal with the case id in scope.
- The demo must NOT offer "create case on import" — that path does not exist and the app fails with `CASE_NOT_FOUND` if the case id is unknown.
- All five callbacks (`onFileSelected`, `onBatchFilesSelected`, `onPdfFileSelected`, `onBatchPdfFilesSelected`, `onTextPasted`) are wired; each guards on `importCaseId` and closes the picker before starting.

---

### 5.2 ImportPickerModal — step 1 "picker"

**File:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/import/json-import/components/ImportPickerModal.tsx` (1015 lines; lives in json-import for historical reasons but hosts the PDF + paste-text entries too).

**Purpose:** choose the source. Layout: iOS `Modal presentationStyle="pageSheet" animationType="slide"`, inside `SafeAreaView` → `GridBackground showScanLine={false}`.

**Layout top→bottom:**
1. Header row (not sticky, just first): title **“Import Recovery Request”** (2xl bold) + close `Ionicons name="close"` (a11y "Close import picker").
2. `ScrollView` with `gap: Layout.spacing.lg`, padding lg:
   - **Error banner** (conditional) — `Card` with `colors.errorLight` bg, `alert-circle` icon + red text.
   - **Card 1 “Pick File”** — `TouchableOpacity` (minHeight 180) wrapping `<Card glass glassVariant="elevated" padding="lg">`; centered content: `document-outline` icon @48, title **“Pick File”** (xl semibold), description **“Choose a JSON or PDF recovery file from your device”** (when PDF handlers present) else **“Choose a recovery export file from your device”**; `ActivityIndicator` (testID `file-loading-indicator`) while reading.
   - **Card 2 “Paste from Clipboard”** — `clipboard-outline` @48, title **“Paste from Clipboard”**, description **“Paste recovery export from clipboard”**, spinner testID `clipboard-loading-indicator`. This is the **JSON** clipboard path only.
   - **Card 3 “Paste Text”** (rendered only when `onTextPasted` is provided; testID `paste-text-card`) — `sparkles-outline` @48, title **“Paste Text”**, description **“Paste a request email or notes — AI fills the form”**. Does not read anything; switches `step` to `'pasteText'`.
   - **Cancel button** — `Button variant="secondary" fullWidth`, label **“Cancel”**.

All cards disable (`colors.disabled`/`disabledText`) while `isLoading = isReadingFile || isReadingClipboard || isSubmittingText`.

**File-type routing (`getFileType`/`getSelectionType`, `:65-95`)** — mimeType first (`application/pdf`, `application/json`), then extension. `DocumentPicker.getDocumentAsync({ type: ['application/json','application/pdf'], copyToCacheDirectory: true, multiple: true })`.
Dispatch: 1 PDF → `onPdfFileSelected(uri, name)`; N PDFs → `onBatchPdfFilesSelected(files)`; 1 JSON → read text via `FileSystem.readAsStringAsync` then `onFileSelected(content)`; N JSON → read all, then `onBatchFilesSelected`. Picked JSON cache files are deleted after read; **PDF cache files are deliberately NOT deleted** (the orchestrator still needs the URI).

**Validation / error strings (exact):**
- mixed selection → `"Please select only one file type (all JSON or all PDF)."`
- unknown type → `"Unsupported file type. Please select JSON or PDF files."`
- PDF picked but no PDF handler → `"PDF import not available. Please select a JSON file."`
- all batch JSON files unreadable → `"Failed to read any of the selected files. Please try again."`
- any throw in the picker → `"Failed to read file. Please try again."`
- empty clipboard → `"Clipboard is empty. Copy JSON content first."`
- clipboard throw → `"Failed to read clipboard. Please try again."`
- >25 files (`BATCH_SIZE_WARNING_THRESHOLD = 25`) → native `Alert.alert("Large Batch Import", "You selected N files. Import may take several minutes. Continue?", [Cancel, Continue])`. Cancel deletes the cached files.

**Native deps:** `expo-document-picker`, `expo-file-system/legacy`, `expo-clipboard`, `react-native` `Alert`.

**Web-demo notes:**
- Replace `DocumentPicker` with `<input type="file" multiple accept=".json,.pdf">` and `Alert.alert` with a confirm dialog. Keep the exact mixed/unknown/threshold copy.
- The parent controls closing — the picker never calls `onClose` itself after a successful selection (comments call this out twice). Demo must mirror: pick → picker closes → flow modal opens.
- The three cards are the demo's most visible surface; keep icon+title+description verbatim.

---

### 5.3 ImportPickerModal — step 2 "pasteText"

**Purpose:** free-text entry that feeds the **PDF (AI) pipeline**, not the JSON one. Same `<Modal>` instance, content swap on local `step` state (`'picker' | 'pasteText'`).

**Layout:**
1. Header: back chevron (`chevron-back`, testID `paste-text-back-button`, a11y "Back to import options") · title **“Paste Request Text”** · close.
2. `KeyboardAwareScrollView` (from `react-native-keyboard-controller`, `bottomOffset={40}`, `keyboardShouldPersistTaps="handled"`, iOS `interactive` / Android `on-drag` dismiss). **Never** `KeyboardAvoidingView` — broken inside pageSheet.
   - error banner (same card as step 1)
   - hint text: **“Paste the recovery request — an email, form text, or notes. The on-device AI extracts the fields, just like a PDF import.”**
   - `TextInput` multiline, testID `paste-text-input`, placeholder **“Paste request text here…”**, `minHeight 240`, **`maxHeight 320`** (load-bearing: without the cap a pasted 2-page email grows to ~1800px and pushes the button off-screen; capped, the text scrolls inside the input), `autoCorrect={false} spellCheck={false}` (forensic: autocorrect must not rewrite a DVR model / OCC / badge number), `textAlignVertical="top"`.
   - `Button fullWidth` label **“Import with AI”**, testID `paste-text-import-button`, `disabled={!pastedText.trim() || isSubmittingText}`, `loading={isSubmittingText}`.
3. On submit → `onTextPasted(text)` → `cases.tsx handleTextPasted` → `startTextImport(text, importCaseId)`. On throw → `logError(...)` + `"Failed to start text import. Please try again."`.
4. `handleClose` resets `step`, `pastedText`, `error`.

**Web-demo notes:**
- A textarea with a hard max-height and internal scroll; disable submit on blank.
- Empty text is double-guarded: UI disables the button AND the service throws `PDF_EMPTY` ("Pasted text is empty. Paste the request text before importing.").
- Result of a text import flows through the **same** `pdfResult` channel; the flow modal renders it identically to a PDF import, with `sourceFileName: 'Pasted text'`.

---

### 5.4 Shared backend — universal schema + persist

**Universal schema:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/import/schemas/recovery-request-import.ts`
Flat Zod object, `formType: z.literal('recovery')`, fields:
`occurrenceNumber?`, `unit?`, `offenceType`(≤200), `requestingOfficerName`, `badgeNumber`, `requestingPhone?`(≤200), `requestingEmail?`(≤200), `businessName`(≤200), `locationAddress`(≤500), `city`, `locationContactName`, `locationContactPhone?`, `dvrMakeModel`, `dvrRetention?`(≤256), `hasVideoMonitor?: 'Yes'|'No'`, `dvrUsername`(≤256), `dvrPassword`(≤256), `extractionTimeFrames: [{ extractionStartTime, extractionEndTime, timePeriodType: 'Actual Time'|'DVR Time', cameraDetails }]`, `incidentDescription`(≤5000, preserved but **not mapped to any form field**). Exported `safeParseRecoveryImport(data)`.

**App-model mapper:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/import/json-import/parsers/agency-peel/mapper.ts` — `mapImportToAppModel(universal) → MappedImportData { locationInput, formData, warnings }`.
- `locationName` = businessName || locationAddress || `'Imported Location'`.
- `address` = `"street, city"`.
- `formData` gets **only** `scopes` (ScopeEntry[] with `Crypto.randomUUID()` ids, `isActualTime = timePeriodType === 'Actual Time'`, `correctedStartDateTime`/`correctedEndDateTime` left `''`) and `dvrInformation` (make/model + username/password). `timeOffset`, `cameras`, `arrivalDepartures`, `exportInformation` are deliberately left empty for the on-site technician.
- Datetime conversion `"YYYY-MM-DD HH:MM"` → `"YYYY-MM-DDTHH:MM:00"`; blank → `MISSING_OPTIONAL_FIELD` warning `"Scope N has empty datetime"`; off-format → `DATETIME_ASSUMED` warning `"Datetime \"X\" in scope N has unexpected format"` + suggestion `"Datetime was imported as-is. Please verify."`.

**Persist:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/import/services/persist-mapped-import.ts`
Order: `getProximityCoordinate()` → build geocode query (`street, city` → `business, city` → `street` → null; **city-only is skipped**) → `forwardGeocode` (Mapbox, non-blocking) → `deduplicateWarnings` (key `code:field`) → `executeTransaction`: `getCaseById` → `createLocation({... , onDuplicateName: 'suffix'})` → `updateLocation({formData})` → after tx `onSaveComplete()` (unless `notifySync:false`).
Progress emitted (JSON path only — the PDF orchestrator does not pass `onProgress` here): `geocoding` 45% "Looking up coordinates...", `loading_case` 55% "Loading existing case...", `creating_location` 65% "Creating location...", `saving_form_data` 80% "Saving form data...", `complete` 100% "Import complete".
Warnings it can add: `GEOCODING_NO_MATCH` ("Could not automatically geocode \"Q\". Coordinates not set." + suggestion "Open the location after import and use GPS or re-type the address."), `GEOCODING_FAILED` ("Geocoding service unavailable during import. Coordinates not set."), `DUPLICATE_LOCATION_NAME` ("A location named \"X\" already exists in this case. Imported as \"X (2)\"." + suggestion).
Failure codes: `CASE_NOT_FOUND`, `location_creation`, `form_data_save`, `TRANSACTION_INCOMPLETE`, `UNKNOWN`.

**Mode machine:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/import/utils/compute-import-flow-mode.ts`
```
shouldShowPdfTerminal(i) = i.isPdfImporting || ((i.pdfResult||i.pdfBatchResult) && !i.pdfTerminalAcknowledged)
computeImportFlowMode(i):
  shouldShowPdfTerminal → 'progress'
  isBatchImporting      → 'progress'
  pdfBatchResult        → 'result'
  pdfResult             → 'result'
  batchResult           → 'result'
  result                → 'result'
  else                  → 'hidden'
```
Note `isImporting` (single JSON) is deliberately NOT a progress trigger — JSON single imports complete sub-second and would flash.

**Web-demo notes:**
- Geocoding is a network call to Mapbox; the demo should stub it (return coords or a `GEOCODING_NO_MATCH` warning to show the warning UI).
- The mode machine is pure and directly portable — copy it verbatim; it is the spine of the whole modal experience.
- Warnings are ADVISORY. Nothing blocks the import. Every field lands in the wizard for review.

---

### 5.5 JSON import pipeline (Peel)

**Files:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/import/json-import/services/import-orchestrator.ts`, `.../parsers/agency-peel/{parser,schema,adapter,mapper,types}.ts`, hook `.../hooks/useImport.ts`.

**Stages + exact progress copy (`importRecoveryJson`):**
| % | stage | message | currentItem |
|---|---|---|---|
| 10 | `parsing` | "Parsing JSON..." | — |
| 20 | `validating` | "Validating data..." | occNumber |
| 30 | `mapping` | "Transforming data..." | businessName / address |
| 45–100 | (persist stages above) | | |
Errors report `{stage:'error', percent:0, message: err.message}`.

**Parser warnings:** `MULTIPLE_DVRS` ("Found N DVR groups. Only the first will be imported."), `EMPTY_SCOPES` ("No extraction time frames found."), `MISSING_OPTIONAL_FIELD` ("No business name or address provided." / "No requesting officer name provided.").
**Parser errors:** `JsonParseError` (INVALID_JSON), `SchemaValidationError` (SCHEMA_VALIDATION), plus `MissingRequiredFieldError`, `InvalidDateTimeError`, `ImportDatabaseError` in `.../errors/import-errors.ts`.

**Adapter (`mapPeelToUniversal`)** renames `occNumber→occurrenceNumber`, `rName→requestingOfficerName`, `badge→badgeNumber`, `locationContact→locationContactName`; flattens `dvrGroups[0]`; drops `isTimeDateCorrect`.

**`useImport` hook state machine:** `isImporting / progress / result / error`, `startImport / cancelImport / resetImport`, `canCancel` (true only in `parsing|validating|mapping`), batch: `isBatchImporting / batchProgress / batchResult / startBatchImport`. Synchronous `useRef` double-tap guards. **Ghost-location cleanup:** if the user cancels after the DB write already happened, the hook `deleteLocation`s the created location (single and batch). No toasts (they caused an iOS white flash through the pageSheet gap).

**Batch:** `importBatchRecoveryJson` loops files sequentially, each with its own transaction, partial success allowed, `notifySync:false` per file + one `onSaveComplete()` at the end. Progress stage `'batch_import'`, message `"Importing file N of M..."`, final `"Completed X of Y imports"`.
`dryRun: true` → parses/adapts/maps, skips persist, returns `ImportDryRunResult` with warnings only.

**Web-demo notes:**
- Fully deterministic and offline — the easiest half of the demo. Ship 2–3 Peel fixture JSONs (see `.../parsers/agency-peel/__tests__/fixtures/valid-full.json`, `valid-multiple-dvrs.json`, `invalid-missing-occ.json`) as demo "files".
- JSON imports never show the terminal; they use the classic bar + spinner.
- Cancel is only meaningful during the first ~30% — mirror `canCancel` if the demo shows a cancel affordance at all (note: `ImportFlowModal` currently exposes no cancel button in progress mode).

---

### 5.6 ImportFlowModal — the single unified modal shell

**File:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/import/json-import/components/ImportFlowModal.tsx`

One `Modal presentationStyle="pageSheet"`, `visible={true}` whenever `mode !== 'hidden'` (returns `null` for hidden). Unified deliberately: two modals transitioning at once froze iOS.

Props: `{ mode: 'hidden'|'progress'|'result', progress, result, onClose, onNavigateToLocation?, onRetry?, progressContent?: React.ReactNode }`.

**Branch table (`:423-458`):**
```
mode==='progress':
   progressContent ? progressContent                      ← the PDF/text live terminal
   : progress.stage==='batch_import' ? <BatchProgressContent>
   : <ProgressContent>
mode==='result':
   isBatchImportResult(result) ? <ResultHeader title={successCount>0?'Import Complete':'Import Failed'}/> + <BatchResultDetails>
   : isImportSuccessResult(single) ? <ResultHeader title="Import Complete"/> + <ImportResultDetails>
   : <ErrorOrDryRunContent>
```

**`ProgressContent` (JSON default):** centered glass `Card` (maxWidth 400) — title **“Importing Recovery Request”**, 8px rounded track with a Reanimated `withTiming(width, 300ms)` fill, big **“NN%”**, then either a 48px `checkmark-circle` (when `stage==='complete'`) or a large `ActivityIndicator`, the stage `message`, and optional `currentItem`.
**`BatchProgressContent`:** title **“Batch Import”**, **“File N of M”** (xl bold), same animated bar, percent, `currentFileName`, spinner + message.
**`ResultHeader`:** opaque glass strip attached to the top of the sheet — `LinearGradient` over `colors.background`, `checkmark-done` icon @20 in `colors.primary`, title (xl bold, `accessibilityRole="header"`), circular close button (30×30, testID `import-result-close`). Deliberately **no** big success checkmark (redesign requirement).
**`ERROR_MESSAGES` map** (`:82-94`) — friendly copy keyed by JSON error code: `INVALID_JSON`, `SCHEMA_VALIDATION`, `MISSING_REQUIRED_FIELD`, `INVALID_DATETIME`, `CASE_CREATION_FAILED`, `LOCATION_CREATION_FAILED`, `FORM_DATA_SAVE_FAILED`, `TRANSACTION_FAILED`, `TRANSACTION_INCOMPLETE`, `UNSUPPORTED_FORMAT`, `UNKNOWN`. **PDF error codes are intentionally absent**, so a PDF failure renders `result.error.message` verbatim (the honest pipeline string).

**Web-demo notes:**
- A single full-screen sheet with three content states is the correct architecture — do not split into two dialogs.
- `progressContent` is a slot; the demo should pass the terminal component only for AI imports.
- The animated bar is `withTiming(300ms)`; use a CSS `width` transition of 300ms.

---

### 5.7 PDF / AI import — **the redesigned screen** (main deliverable)

This is what the demo currently has in an old, basic form. What ships today is a **live terminal** that tails the actual pipeline dataflow, dwells on the finished log, and advances only on an explicit tap. It replaced a bar + spinner. Redesign intent doc: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/docs/plans/import-terminal-progress/02-implementation-plan.md`.

#### 5.7.1 Component tree (absolute paths)

```
app/(tabs)/cases.tsx                                     ← owns state; derives mode + outcome
└── ImportFlowModal   src/features/import/json-import/components/ImportFlowModal.tsx
    ├── (mode 'progress', progressContent set)
    │   └── ImportTerminalProgress  src/features/import/pdf-import/components/ImportTerminalProgress.tsx
    │       ├── headline <Text> (mono, live region)
    │       ├── progress track/fill <View>
    │       ├── terminal panel <View>
    │       │   ├── title bar (3 dots · "pdf-import · on-device" · live dot · "nothing leaves this phone")
    │       │   ├── FlatList (testID "terminal-log")
    │       │   │   └── TerminalLine  src/features/import/pdf-import/components/TerminalLine.tsx   (React.memo, key=event.seq)
    │       │   ├── ListFooterComponent: blinking-block cursor "▌" (while running)
    │       │   └── "jump to latest" pill (testID "jump-to-latest-pill", only when un-pinned)
    │       └── badge slot: <ActivityIndicator> processing badge  OR  morphing CTA Pressable (FadeIn 350ms)
    ├── (mode 'result', single success)
    │   ├── ResultHeader (in ImportFlowModal.tsx)
    │   └── ImportResultDetails  src/features/import/json-import/components/ImportResultDetails.tsx
    │       └── ImportResultBody  src/features/import/json-import/components/ImportResultBody.tsx
    ├── (mode 'result', batch)
    │   ├── ResultHeader
    │   └── BatchResultDetails  src/features/import/json-import/components/BatchResultDetails.tsx
    │       └── ImportResultBody (one per expanded success)
    └── (mode 'result', failure)
        └── ErrorOrDryRunContent (in ImportFlowModal.tsx)
```
Supporting non-UI modules:
```
src/features/import/pdf-import/hooks/usePdfImport.ts          ← flow state
src/features/import/pdf-import/hooks/useImportLog.ts          ← rAF-coalesced bus binding
src/features/import/pdf-import/services/import-log-bus.ts     ← retain-and-replay event bus (cap 400)
src/features/import/pdf-import/services/pdf-import-orchestrator.ts
src/features/import/pdf-import/services/pdf-extraction-service.ts
src/features/import/pdf-import/services/ai-extraction-service.ts
src/features/import/pdf-import/services/apple-intelligence-provider.ts
src/features/import/pdf-import/services/providers/{ai-extraction-provider,apple-foundation-provider,index}.ts
src/features/import/pdf-import/prompts/extract-fields-prompt.ts
src/features/import/pdf-import/normalization/*.ts
src/features/import/pdf-import/schemas/peel-ai-output-schema.ts
src/features/import/pdf-import/utils/{clean-ai-response,pdf-batch-to-import-batch}.ts
src/features/import/pdf-import/constants/index.ts
src/features/import/pdf-import/errors/pdf-import-errors.ts
src/features/import/pdf-import/types/index.ts
src/features/import/json-import/components/importResultUtils.ts   (withAlpha helper)
```

#### 5.7.2 The complete state machine

Two orthogonal axes: **modal mode** (from `computeImportFlowMode`) and **pipeline stage** (from `PdfImportProgress.stage`). Plus the **dwell gate** (`pdfTerminalAcknowledged`).

| # | State | Trigger in | What the user sees | Components rendered | Trigger out |
|---|---|---|---|---|---|
| S0 | **hidden / idle** | initial; after `handleImportResultClose` | nothing (card list) | — | tap Import |
| S1 | **picker** | `showImportPicker=true` | ImportPickerModal step 'picker' | ImportPickerModal | pick file / paste text / cancel |
| S1b | **paste-text entry** | tap "Paste Text" card | textarea + "Import with AI" | ImportPickerModal step 'pasteText' | submit / back / close |
| S2 | **stage: extracting_text (0–15%)** | `startPdfImport` / `startTextImport` sets `isPdfImporting=true`; picker already closed | terminal, headline `"Extracting text from PDF..."` (PDF) or `"Reading pasted text..."` (text); bar 0%; log lines `INIT reading document…`/`reading pasted text…`, then `PDF extract text ✓`, then `VERB extracted document text ▾` (if setting on); processing badge spinning | ImportFlowModal(progress) → ImportTerminalProgress → TerminalLine[] + processing badge | stage advances or throws |
| S3 | **stage: extracting_fields (15–55%)** | after Stage 1 | headline `"Extracting fields from document..."`; bar 15%; lines `AI AI Request → provider 'apple-foundation'`, `VERB system prompt ▾`, `VERB user prompt ▾`, `AI on-device model generating…` (this is where the seconds go), `AI AI Response`, `VERB raw response ▾`, `AI cleanJsonResponse: stripped code fences`, `AI captured occurrenceNumber pre-Zod → 'X'`, `OK Parsed output · peelAiOutputSchema ✓ 16 fields`, `VERB parsed output ▾`, `OK extract fields ✓` | same | success / retry / throw |
| S4 | **stage: normalizing (55–65%)** | after AI | headline `"Normalizing extracted data..."`; bar 55%; one `NORM <warning reason>` line per disambiguation, then `OK normalize ✓` (detail `warnings: N`) | same | — |
| S5 | **stage: case injection** (no separate progress band) | after normalize | lines `NORM OCC# mismatch: AI 'X' ≠ case 'Y' — verify` **or** `CASE OCC# cross-check: AI 'X' == case ✓`, then `CASE inject case data ← getCaseById` (detail `occurrenceNumber: 'Y'   ← case record, never AI`) | same | — |
| S6 | **stage: validating (65–80%)** | | headline `"Validating extracted data..."`; bar 65%; `OK validate ✓ · universal schema`, `VERB validated data ▾` | same | — |
| S7 | **stage: importing (80–100%)** | | headline `"Saving to database..."`; bar 80%; `OK import ✓ · location saved` (detail `locationId: …`) | same | — |
| S8 | **stage: complete (100%)** + **DWELL** | `pdfResult` set, `isPdfImporting=false`, `pdfTerminalAcknowledged=false` | terminal STAYS. Bar 100%. Cursor footer disappears. Processing badge morphs (FadeIn 350ms) into a tappable CTA. Headline switches to `cta.headline`. Log is fully scrollable. | ImportTerminalProgress with `outcome != null` | tap CTA |
| S9 | **result: single success** | `pdfTerminalAcknowledged=true` → mode flips to `'result'` | ResultHeader "Import Complete" + scrollable sectioned review card + pinned footer | ResultHeader + ImportResultDetails + ImportResultBody | Go to Location / Done |
| S10 | **result: batch (success/partial)** | same, `pdfBatchResult` converted by `pdfBatchToImportBatch` | ResultHeader + count summary + single-open accordion of successes + failure rows | ResultHeader + BatchResultDetails (+ ImportResultBody per open item) | Done / per-item Go to Location |
| S11 | **result: failure** | dwell released with a failure result | big red `close-circle` @64 + **“Import Failed”** + friendly-or-raw message + collapsible "Technical Details" + optional "Data Found" + Retry/Cancel | ErrorOrDryRunContent | Retry → reopen picker; Cancel → close |
| S12 | **committed / closed** | `handleImportResultClose` | list refreshed; `resetImport()`, `resetPdfImport()`, `resetImportLog()`, `pdfTerminalAcknowledged=false`, `importCaseId=null` | — | — |
| S13 | **navigate to imported location** | tap "Go to Location" | resets import state, `switchToLocation`, routes into the wizard | — | — |

Transitions worth pinning for the demo:
- A **non-null `pdfResult` does NOT mean results are showing.** The dwell keeps mode at `'progress'`. Gate everything on the computed mode.
- `pdfTerminalAcknowledged` resets in **two** places: an effect on `isPdfImporting → true` (`cases.tsx:858-860`) and in `handleImportResultClose`. Drop either and the next run skips its dwell.
- The dwell applies to failures too — "the log is most valuable when something broke."
- **Concurrency:** `usePdfImport` uses a synchronous `useRef` guard; a second `start*` while one is in flight returns immediately (before the `try`, so the `finally` can't clear the flag).
- **Unexpected throw:** the hook synthesizes a `PdfImportFailureResult` with `code:'UNKNOWN_ERROR'`, `stage:'extracting_text'`, preserving `err.message`, so the UI never lands in "nothing happened".

#### 5.7.3 Terminal UI anatomy — exact layout, copy, colors, sizes

`ImportTerminalProgress.tsx`. Root: `flex:1, padding: Layout.spacing.md, gap: Layout.spacing.sm`, testID `import-terminal`.

1. **Headline** (testID `terminal-status`) — one line, `numberOfLines={1}`, mono (`Typography.fontFamily.scannerMono` = ShareTechMono, bundled; `'monospace'` is deliberately NOT used — it renders differently on iOS/Android), `fontSize xs`, semibold, `letterSpacing 1`, `accessibilityLiveRegion="polite"`. Content = `cta.headline` when complete, else `inner?.message ?? progress?.message ?? 'Preparing…'`. A `useEffect` fires `AccessibilityInfo.announceForAccessibility(headline)` on each distinct **stage** change (not per log line).
2. **Progress track** — 3px tall, full-radius, `colors.border` bg; fill `colors.primary`, `width: ${percent}%`. `accessibilityRole="progressbar"`, label `Import progress: N percent`, `accessibilityValue={{now, min:0, max:100}}`. Percent is clamped 0..100 and non-finite → 0. (No `withTiming` here — instant width, unlike the JSON bar.)
3. **Terminal panel** — `flex:1`, radius lg, 1px border, `overflow:hidden`.
   - **Title bar** (bg `#0a0f18`, 12/8 padding, bottom border `#141c28`): three 8px dots `#242a31`; text **“pdf-import · on-device”** (mono 10, `#55606b`); right side: 5px live dot in `#4ECDC4` + text **“nothing leaves this phone”** (mono 9.5, `#4a7c76`).
   - **Log `FlatList`** (testID `terminal-log`), `contentContainerStyle {padding:12, flexGrow:1}`, `showsVerticalScrollIndicator={false}`, tuning from `TERMINAL_LIST_CONFIG` = `{initialNumToRender:16, maxToRenderPerBatch:12, updateCellsBatchingPeriod:50, windowSize:21, removeClippedSubviews:true}`.
   - **Footer cursor** while `outcome === null`: a single mono `▌` in `colors.primaryLight`.
   - **Jump pill** (only when `!pinned && events.length>0`): absolutely positioned bottom:10, center, `colors.primary` bg, full radius, `arrow-down` @13 white + text **“latest”** (mono 10, white, semibold), `hitSlop {12,12,10,10}`, a11y "Jump to latest log line".
   - Panel background: `#0b1420` in light scheme / `#060a12` in dark (i.e. the terminal is dark in BOTH themes by design; only accents are theme-seeded).
4. **Badge slot** (persistent height, minHeight 60, radius lg, 1px border, row, gap sm — no reflow when it morphs):
   - **Running** (testID `terminal-processing-badge`): `ActivityIndicator` + title **“Processing recovery request”** (or **“Processing recovery requests”** for a batch) + sub **“on-device · nothing leaves this phone”**, prefixed for batch with **“File N of M · ”**. Border `rgba(43,140,193,0.32)`, bg `rgba(26,45,68,0.55)`.
   - **Done** (testID `terminal-review-cta`, wrapped in `Animated.View entering={FadeIn.duration(350)}`, `Pressable` with `pressed && {opacity:0.7}`): icon + title + sub + trailing `chevron-forward` @18.

**`cta` switch (exhaustive with `const _exhaustive: never`) — exact copy:**

| outcome | icon | colors | headline | title | sub | a11y |
|---|---|---|---|---|---|---|
| `success` (single) | `checkmark-circle` | `colors.success` / title `#7fe6b6` / border `rgba(16,209,119,0.32)` / bg `rgba(16,209,119,0.10)` | "Import ready for review" | "Import ready for review" | **"Review import →"** | "Review the import before it saves" |
| `success` (batch) | same | same | "Batch complete" | ``Batch complete — {n} of {m} location(s)`` | "Review import →" | same |
| `partial` | `alert-circle` | `colors.warning` / border `rgba(255,217,61,0.36)` / bg `rgba(255,217,61,0.10)` | "Batch partially failed" | ``Batch partially failed — {n} of {m}, {m-n} need(s) attention`` | "Review import →" | "Review the import — some files failed" |
| `failure` | `alert-circle` | `colors.error` / border `rgba(255,71,87,0.32)` / bg `rgba(255,71,87,0.10)` | "Import failed" / "Batch failed" | same as headline | **"See error details →"** | "See error details" |

`TerminalOutcome` is derived in `cases.tsx:949-967`: batch `successCount===0` → failure; `successCount<totalFiles` → **partial** (amber — forensic honesty: a batch where one file's evidence never entered the record must never read as clean success); else success. A single import synthesizes `{successCount:1,totalFiles:1}`; failure carries **no counts**.

**`TerminalLine` row** (`TerminalLine.tsx`): `marginTop:5`; row = time gutter `T+{(tMs/1000).toFixed(2)}` (mono 10, width 44, `#3a475a`) · level tag (mono 10 semibold, width 38, accent-colored) · message (mono 10, `flex:1`, `lineHeight 15`, `#c6d2df`, or `colors.error` for level `error`). Optional detail block underneath: `marginLeft:52`, bg `#080b11`, 2px left border `#1c2733`, rounded on the right, text mono 9 / lineHeight 15 in `#6f8296`, testID `terminal-detail-{seq}`. A detail longer than `DETAIL_AT_HIDE_THRESHOLD = 120` chars is hidden from assistive tech (`accessibilityElementsHidden` / `importantForAccessibility='no-hide-descendants'`).

**Tag labels + accent colors:**
| level | tag | accent |
|---|---|---|
| init | `INIT` | `colors.textSecondary` |
| file | `FILE` | `#e0a878` |
| pdf | `PDF` | `colors.textSecondary` |
| ai | `AI` | `colors.primaryLight` |
| verbose | `VERB` | `#4ECDC4` |
| norm | `NORM` | `colors.warning` |
| case | `CASE` | `colors.primaryLight` |
| ok | `OK` | `colors.success` |
| done | `DONE` | `colors.success` |
| error | `ERR` | `colors.error` |

#### 5.7.4 Log-event catalogue (exact strings, in emit order)

From `usePdfImport.ts`, `pdf-import-orchestrator.ts`, `ai-extraction-service.ts`. `VERB` lines only when `importUi.showProcessDetails` (default **ON**). Details are `.slice()`d at the emit site (1200 chars for dumps, 800 for the user prompt, 1400 for the system prompt).

Single import:
```
INIT  reading document…                    (or "reading pasted text…")
PDF   extract text ✓                       detail: method: native · 3184 chars · 142ms
VERB  extracted document text ▾            detail: first 1200 chars of the document
AI    AI Request → provider 'apple-foundation'   detail: system: 3021 · user: 3210 chars · temp 0.2 · maxTokens 2000
VERB  system prompt ▾                      detail: first 1400 chars of EXTRACT_FIELDS_SYSTEM_PROMPT
VERB  user prompt ▾                        detail: first 800 chars of the wrapped document
AI    on-device model generating…          ← the long pause lives here
AI    AI Response                          detail: length: 812 · preview: {"occurrenceNumber":"PR25-…
VERB  raw response ▾                       detail: first 1200 chars of raw model output
AI    cleanJsonResponse: stripped code fences
AI    captured occurrenceNumber pre-Zod → 'PR25-123456'      (or '(none)')
OK    Parsed output · peelAiOutputSchema ✓ 16 fields
VERB  parsed output ▾                      detail: pretty JSON, 1200 chars
OK    extract fields ✓                     detail: timeFrames: 2 · 8213ms
NORM  <one line per normalization warning, message = warning.reason>   detail: field path
OK    normalize ✓                          detail: warnings: 3
NORM  OCC# mismatch: AI 'X' ≠ case 'Y' — verify        (only on mismatch)
CASE  OCC# cross-check: AI 'X' == case ✓               (only on match)
CASE  inject case data ← getCaseById       detail: occurrenceNumber: 'PR25-123456'   ← case record, never AI
OK    validate ✓ · universal schema
VERB  validated data ▾                     detail: pretty JSON, 1200 chars
OK    import ✓ · location saved            detail: locationId: <uuid>
```
Failure lines (mutually exclusive with the rest of the tail):
```
ERR   ✗ failed at normalizing
ERR   ✗ case not found — cannot inject occurrence number
ERR   ✗ failed at validating
ERR   ✗ failed at importing
ERR   ✗ failed at {stage}                   detail: err.message      (outer catch)
```
Batch adds:
```
INIT  batch import                         detail: 4 files
FILE  ▸ file 1/4  'request-a.pdf'          (before each file's own line stream)
DONE  batch complete                       detail: success: 3 · failed: 1 · 12483ms
```

**Bus semantics (`import-log-bus.ts`):** module-level singleton. `IMPORT_LOG_MAX_EVENTS = 400`. `emitImportLog({level,message,detail?,fileIndex?})` stamps `seq` (1-based) + `tMs` (ms since run start) and **always retains** (shift-evicting past 400), dispatching to listeners only if present. `subscribeImportLog(fn)` **replays the whole retained run first** — load-bearing, because `usePdfImport` emits the `init` line a tick before the modal mounts the terminal. `resetImportLog()` clears + broadcasts a `{reset:true}` marker. `hasImportLogListeners()` exists but has **no production call site** — a previous listener-gate on the verbose emits dropped the pasted-text fast path's opening lines; do not re-add.

**Coalescing (`useImportLog.ts`):** `useImportLog(active)` buffers events in a ref and flushes to state at most once per `requestAnimationFrame`, mirrors the 400 cap on its own committed buffer, clears on the `reset` marker / `active=false` / unmount (cancelling the pending frame). This is why the terminal stays smooth with verbose dumps on by default.

#### 5.7.5 Auto-follow / scroll behavior (the fiddliest part)

Documented in `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/docs/code-reviews/import-terminal-tail-scroll-deep-dive-2026-07-13.md`.
- Tail scrolls to the **exact measured bottom**: `scrollToOffset({ offset: max(0, contentHeight - viewportHeight), animated:true })`, driven by `onContentSizeChange` (fires *after* new rows measure) with viewport height captured in `onLayout`. `scrollToEnd` is deliberately **not** used — it targets an average-cell estimate and lands chronically short on this list's wildly non-uniform rows (a 1-line `ok` row vs a ~30-line verbose dump).
- The **first non-empty** content-size event is skipped so the mount replay burst paints at the **top**; then it follows each stage down. An empty log re-arms that skip for the next run.
- Pin state changes **only on real drag gestures**: `onScrollBeginDrag` → un-pin; `onScrollEndDrag` → `setPinned(isNearBottom(e.nativeEvent))` with `NEAR_BOTTOM_THRESHOLD = 80px`. `onMomentumScrollEnd` is deliberately **not** wired (iOS emits it for *programmatic* scrolls on both architectures — feeding it to the pin let the tail un-pin itself and killed tailing mid-run). Trade-off: a fling that coasts to the bottom stays un-pinned until a drag-release near the bottom or a pill tap.
- `jumpToLatest` re-pins and scrolls.
- `isNearBottom` is exported as a pure function for testing.

#### 5.7.6 AI extraction pipeline

**Provider abstraction** (`services/providers/ai-extraction-provider.ts`):
```ts
interface AiExtractionProvider {
  readonly capabilities: ProviderCapabilities   // { id, platform, modelName, requiresDownload }
  isAvailable(): Promise<boolean>
  extract(options: ExtractOptions): Promise<ExtractResult>   // { rawText, durationMs }
}
```
`extract()` returns **raw text only** — cleaning/parsing/Zod live in `extractFields`. Providers must never parse JSON.

**Shipped provider:** `AppleFoundationProvider` (`ProviderId 'apple-foundation'`, platform `'ios'`, modelName `"Apple Foundation Model (iOS 26+)"`, `requiresDownload:false`) → `apple-intelligence-provider.ts` → dynamic `require('@react-native-ai/apple')` + `require('ai')` (Vercel AI SDK `generateText({ model: apple(), system, prompt, temperature, maxOutputTokens, abortSignal })`). Dynamic requires keep non-iOS builds from crashing at module load. Availability is memoized only on `true` (a user can enable Apple Intelligence between imports). `getDefaultProvider()` is a lazy singleton; Phase D will add an executorch/Llama backend behind the same interface with **zero orchestrator change**.

**There is NO API key anywhere in this pipeline.** The model is fully on-device; nothing leaves the phone (hence the terminal's two "on-device / nothing leaves this phone" strings). No network call, no auth, no cloud provider.

**Call parameters:** `temperature: 0.2`, `maxOutputTokens: 2000`. **Timeout** `AI_TIMEOUT_MS = 30000` via `AbortController` + `setTimeout` (Hermes-safe; `AbortSignal.timeout` not assumed). A caller-supplied `abortSignal` is chained by an abort-event listener (not `AbortSignal.any`) so dismissing the modal cancels the native call before the 30s timer. **Retries:** `AI_MAX_RETRIES = 2` in `extractFields` (not in the provider): `AI_UNAVAILABLE` is rethrown immediately (hardware can't change mid-run); everything else retries. The terminal `AiProcessingError` carries `retryCount` + the last raw provider response.

**No streaming.** `extract()` returns one `rawText` blob; the terminal's "liveness" comes from stage-level log events, not token streaming (explicitly out of scope in the plan).

**Prompt** (`prompts/extract-fields-prompt.ts`, snapshot-locked): `EXTRACT_FIELDS_SYSTEM_PROMPT` ~3 KB — persona ("You read CCTV/DVR recovery requests — formal forms or casual emails from detectives…"), CORE RULES ("Better blank than guessed", no invented years/suffixes/model numbers, keep qualifying words), EMAIL-FORMAT REQUESTS section (From: header, digits-only local-part → badge), FIELDS list, and an OUTPUT JSON template with **only empty strings** (zero realistic example values — a 3B model once copy-pasted "Hikvision DS-7616NI" verbatim). Ends `"No code fences. No explanatory text. JSON only."`. `buildExtractFieldsUserPrompt(text)` wraps the doc in `---BEGIN DOCUMENT---`/`---END DOCUMENT---`; `sanitizeInputText` replaces those markers in the input with `[MARKER-REMOVED]` (prompt-injection guard).

**Response handling:** `cleanJsonResponse` strips code fences/chatter → `JSON.parse` → capture `parsed.occurrenceNumber` **before Zod strips it** → `peelAiOutputSchema.parse`.

**AI output schema** (`schemas/peel-ai-output-schema.ts`, aliased `aiImportOutputSchema`) — **16 fields**, each `.describe()`d (doubles as Apple guided-generation instructions) and `.max()`-capped as the primary untrusted-input boundary: `offenceType`(200) `requestingOfficerName`(200) `badgeNumber`(50) `requestingPhone`(50) `requestingEmail`(254) `businessName`(200) `locationAddress`(500) `city`(100) `locationContactName`(200) `locationContactPhone`(50) `dvrMakeModel`(300) `dvrRetention`(256) `hasVideoMonitor`(10) `dvrUsername`(256) `dvrPassword`(256) `extractionTimeFrames[]`{`extractionStartTime`(100) `extractionEndTime`(100) `timePeriodType`(50) `cameraDetails`(1000)}. `null`/`undefined` preprocess to `''` (small on-device models return `null` for blanks). **`occurrenceNumber` and `unit` are excluded** — the orchestrator injects both from the case record; the prompt still asks for OCC# only so the cross-check can run.

**Document budget:** `MAX_DOCUMENT_CHARS = 8000`; over budget the text is sliced and `\n[TRUNCATED]` appended, plus a prepended warning: *"Document text exceeded 8000-character AI input budget and was truncated. The model saw only the first 8000 characters. Please verify the extracted fields against the full document."*

#### 5.7.7 Normalization layer — how raw extraction becomes form fields

`normalization/normalize-peel-output.ts` `normalizeAiOutput(aiOutput, { currentTimeMs, sourceText })` → `{ normalized: Partial<RecoveryRequestImportInput>, warnings: NormalizationWarning[] }`. All pure functions; the orchestrator injects `Date.now()` and the source text so nothing touches global state.

- **Null coercion** (`normalize-null.ts`): `isNullValue`/`coerceField` map "n/a", "none", etc. → `''`; empty optional fields are dropped from the object entirely.
- **Officer decomposition** (`normalize-officer.ts`): splits `"Name #1234"` or a digit-only email local-part into `requestingOfficerName` + `badgeNumber`.
- **Dates — two independent disambiguators:**
  - **Year** (`year-disambiguation.ts`): corrects a hallucinated year on a year-less source date by proximity to today, but **first consults the source text** — if the officer wrote the year, it's trusted at any age (cold-case guard). `sourceContainsFullDate` uses a digit-only boundary `(?<!\d)…(?!\d)` (must NOT be widened to exclude `/`/`-`: a range written `02/05/2024-02/06/2024` would then be missed → live bug PR#78 H1). `findYearTokenNear` scans **every** occurrence of the fragment.
  - **Format** (`date-disambiguation.ts`): MM/DD vs DD/MM by proximity to today only — does **not** read the source. Beyond ~18 months, proximity is declared noise and it falls back to US MM-DD at `confidence:'low'` (known gap **DEF-034**).
- **Enums** (`normalize-enums.ts`): `normalizeTimePeriodType` → `'Actual Time'` (wall-clock) vs `'DVR Time'` (recorder clock); `normalizeYesNo` for `hasVideoMonitor`.
- **Phones** (`normalize-phone.ts`): formats, warns on change.
- Adds `formType: 'recovery'`.

**Confidence scores:** there is **no per-field confidence UI**. The only confidence concept is internal to date disambiguation (`'low'`), and the OCR path's `ocrConfidence` (typed but disabled). What surfaces instead is a **warning ledger**: every transformation pushes a `NormalizationWarning { field, originalValue, normalizedValue, reason, kind? }`. The `kind` discriminator routes each into a distinct `ImportWarningCode` (`year_correction→YEAR_CORRECTED`, `occurrence_mismatch→OCCURRENCE_MISMATCH`, everything else→`DATETIME_ASSUMED`) so the persist layer's `code:field` dedup never collapses two genuine warnings on the same field.

**Per-field review/edit UX:** there is **none inside the import flow**. Import is an explicit *prefill assist* — the result screen is read-only (values are `selectable` text). Editing happens later in the 13-screen wizard. There are no accept/reject controls, no per-field toggles, no diff view. The only "review" affordances are: the warnings accordion, and the "Go to Location" CTA that drops the operator into the wizard.

**OCC# cross-check:** normalized both sides (lowercase, strip spaces + hyphens) so `PR25-123456` == `pr25123456` == `PR25 123456`. On mismatch it adds an advisory warning (import is **not** blocked): *"The import appears to reference occurrence number \"X\" but is being added to case \"Y\". Please verify that this is the correct case to import into — wrong-case imports cannot be undone without manual cleanup."* Note the deliberately **source-neutral** "The import" — it used to say "The PDF" and shipped that to users who had pasted an email.

#### 5.7.8 Error handling UX — every failure path

`PdfImportResult` is a discriminated union; narrow with `isPdfImportSuccess`. Failure carries `error.code`, `error.stage`, optional `error.details`, and `partialResults`.

| Code | Stage | User-visible message (verbatim) | Cause |
|---|---|---|---|
| `PDF_OCR_UNAVAILABLE` | extracting_text | "This PDF appears to be scanned or image-only. Automated import requires a PDF with selectable, text-searchable content. Please type the request details into the case manually, or ask the requester to send a text-based PDF." | native text < `MIN_NATIVE_EXTRACTION_LENGTH` (50 chars). Expected user-input class — suppressed from telemetry. |
| `PDF_INVALID_FORMAT` | extracting_text | "Invalid file URI: must be a non-empty string" / "Invalid file URI: must start with file:// or content://" | bad URI |
| `PDF_EXTRACTION_FAILED` | extracting_text | native module's own message, or "Unknown extraction error" | generic extraction failure |
| `PDF_EMPTY` | extracting_text | "Pasted text is empty. Paste the request text before importing." | **text path only**; service-layer trust boundary |
| `AI_UNAVAILABLE` | extracting_fields | "Apple Foundation Model is not available on this device. Requires iOS 26+ with Apple Intelligence enabled." | **not retried** |
| `AI_EXTRACTION_FAILED` | extracting_fields | "Extraction failed after N retries: {lastError.message}" | retries exhausted; carries `rawResponse` + `retryCount` |
| `NORMALIZATION_FAILED` | normalizing | normalizer message | rare (normalizers are pure with fallbacks) |
| `SCHEMA_VALIDATION_FAILED` | validating | "Case record has no occurrence number. Please update the case before importing." (when the missing field is occurrenceNumber) / "Generated JSON failed schema validation" / "Case not found: {id}. Cannot inject occurrence number." | Zod failure or case-not-found |
| `DATABASE_IMPORT_FAILED` | importing | `persistResult.error.message` | geocode/SQLite persist failure |
| `UNKNOWN_ERROR` | extracting_text (flattened) | original `err.message` | orchestrator threw unexpectedly; synthesized by the hook |

Also defined but never raised today: `PDF_CORRUPTED`, `PDF_PASSWORD_PROTECTED`.

**Failure rendering path:** dwell first (S8 with a red CTA "See error details →"), then `cases.tsx:976-990` converts the `PdfImportFailureResult` into an `ImportFailureResult` **forwarding `stage` and `details`** (BUG-016 — dropping them hid the triage signal and kept the "Technical Details" panel from ever rendering). `ErrorOrDryRunContent` then shows:
- `close-circle` @64 in `colors.error`, title **“Import Failed”**
- error text = `ERROR_MESSAGES[code] || result.error.message`. **No PDF code is in the map**, so the pipeline's own honest string always renders.
- **“Technical Details”** collapsible (chevron up/down) rendering `JSON.stringify(error.details, null, 2)` in a mono font — for PDF failures that's `{ stage, detail }`.
- **“Data Found”** partial-data block (JSON path only): `Case Number: …`, `Business: …`.
- Buttons: **“Retry”** (primary, `handleImportRetry` → reset both hooks + reopen the picker) and **“Cancel”** (secondary).

**Offline behavior:** the AI is on-device, so no-network does **not** break extraction. The only network dependency is Mapbox geocoding in persist, which is non-blocking and degrades to a `GEOCODING_FAILED` / `GEOCODING_NO_MATCH` warning on the success screen. This is a good demo talking point.

**Partial extraction:** the model is instructed to return `""` for anything not stated; a date with no time is dropped rather than half-guessed. Blank bounds do **not** raise an adjustment warning (that would double-warn) — the separate `"Scope N has empty datetime"` completeness warning from the mapper is what tells the analyst to finish it.

#### 5.7.9 Batch (multi-PDF) specifics

`importBatchPdfRecovery` runs files **sequentially** (one on-device model at a time), forwards nested per-file progress as `PdfBatchImportProgress { stage:'batch_pdf_import', percent, message:"File i/N: <inner message>", currentFileIndex, totalFiles, currentFileName, fileProgress }`, and returns partial success — a failed file does not abort the batch. Per-file `notifySync:false`; one `onSaveComplete()` at batch end if `successCount>0`. Final progress: `"Completed X of Y imports"`. One `resetImportLog()` + one `init` for the whole batch (not per file).
The terminal reads batch progress via `isBatch(p)` → uses `p.fileProgress` for the headline, `p.percent` for the bar, and `File N of M · ` in the badge sub-line.
`pdfBatchToImportBatch` folds the PDF batch onto the canonical `BatchImportResult` at the app boundary so the result UI consumes exactly one type (no `as` cast).

#### 5.7.10 Verbose gate & privacy

Two independent gates, two threat models:
- **`importUi.showProcessDetails`** — user setting, **default ON**, in General settings (`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/settings/components/GeneralSettingsSection.tsx`): `Switch` label **“Show import process details”**, testID `import-process-details-switch`, a11y hint **“Shows the on-device model's inputs and outputs while importing. Your data never leaves the phone.”**. Gates the on-screen `VERB` blocks.
- **`devSettings.verboseImportLogging`** — `__DEV__`-only, default off; gates full-content `console.log` dumps (external log sinks are PII-bearing).
`handleImportResultClose` calls `resetImportLog()` so buffered document text / prompts / model output don't linger in the JS heap on a shared device.

**Web-demo notes (PDF import) — the important ones:**
1. **The terminal IS the screen.** Do not render a plain progress bar for the AI path. Reproduce: dark panel + fake-window title bar + monospace log rows with `T+x.xx` gutter and colored level tags + blinking cursor + morphing bottom badge.
2. **Fake the pipeline with timed emits.** Everything the terminal shows comes from a simple event stream; replay a scripted array of `{level, message, detail, delayMs}` and drive the bar off `PROGRESS_STAGES` (0 / 15 / 55 / 65 / 80 / 100). Weight the delay on `AI on-device model generating…` (real runs are several seconds) — that pause is the whole reason the terminal exists.
3. **Implement the dwell.** After the last line, keep the terminal up, morph the badge, and require a tap on "Review import →" / "See error details →". Skipping this makes the demo feel wrong and hides the log.
4. **Three outcomes, three colors** — green success / **amber partial** / red failure. The amber partial state is a deliberate forensic-honesty requirement, not decoration.
5. **Auto-follow + pin.** Tail while pinned; un-pin on user scroll; show a "latest" pill. On web this is `scrollTop = scrollHeight - clientHeight` on content growth, plus a wheel/touch listener to un-pin and an 80px near-bottom threshold to re-pin. Skip the first paint so the log starts at the top.
6. **Mock these natives:** `expo-document-picker` (file input), `expo-pdf-text-extract` (ship pre-extracted text for each demo PDF), `@react-native-ai/apple` + `ai` (canned JSON responses per fixture — see `pdf-import/__tests__/fixtures/{peel-form,casual-email}.txt` + `.expected.json`), `expo-sqlite` (in-memory store), Mapbox geocode (stub), `AccessibilityInfo`, Reanimated `FadeIn` (CSS fade 350ms).
7. **Demo-worthy failure scripts:** scanned PDF (`PDF_OCR_UNAVAILABLE`), no Apple Intelligence (`AI_UNAVAILABLE`), model garbage → retries exhausted (`AI_EXTRACTION_FAILED`, show the two retry rounds in the log), OCC# mismatch (amber `NORM` line + warning on the success card), truncated 20-page document, geocode failure.
8. **Copy is load-bearing.** Ship the strings verbatim — especially "nothing leaves this phone", "pdf-import · on-device", "Review import →", "Processing recovery request", and the scanned-PDF message.

---

### 5.8 Result surfaces — single success

**`ImportResultDetails`** (`/Users/.../json-import/components/ImportResultDetails.tsx`): a `View flex:1` containing a `ScrollView` (`padding md`, `paddingBottom xl`, `gap md`) → `<ImportResultBody>` → footer note **`Imported in {durationMs/1000}s · review the fields above, then continue`** (centered, xs, `colors.textTertiary`), and a **pinned action bar** (bg `colors.background`, 1px top border, padding md / bottom lg, gap sm) with **“Go to Location”** (primary, testID `import-result-go-to-location`, only when `onNavigateToLocation` is passed) and **“Done”** (secondary, testID `import-result-done`).

**`ImportResultBody`** (`/Users/.../json-import/components/ImportResultBody.tsx`) — returns a fragment so the parent owns scrolling; composed by BOTH the single view and the batch accordion. Sections top→bottom:
1. **Summary hero** — glass gradient card: location name (sm semibold, secondary, 1 line) over the **case number** (26px bold mono, `selectable`), then a stat chip row with `time-outline` + `"N scope(s)"`.
2. **“REQUESTING OFFICER”** (`ribbon-outline`) with a count pill `"N fields"` (derived from filled requester fields) — rows: Name, Badge # (mono), Unit, Phone, Email.
3. **“RECOVERY LOCATION”** (`business-outline`) — Business, Street, City, On-site Contact, Contact Phone.
4. **“DVR INFORMATION”** (`hardware-chip-outline`, only when make/model or credentials exist) — Make / Model, Username (mono), Password (mono).
5. **“EXTRACTION SCOPES”** (`time-outline`, count pill = scope count) — one `ScopeRow` per scope: index chip, a tag reading **“ACTUAL TIME”** (green) or **“DVR TIME”** (amber), a right-aligned duration (`"2h 15m"` / `"45m"`, computed from the ISO bounds, hidden if non-positive), a start → `arrow-forward` → end line in mono (`toDisplay()` formatted, `—` when blank), and an optional `videocam-outline` + camera text.
6. **Warnings** (collapsible, amber-bordered card) — header `warning-outline` + **“N Warning(s)”** + chevron; body lists each `message` with an italic `suggestion` beneath. Collapsed by default.

Section chrome: hand-built `LinearGradient` glass (NOT `<Card>`) reading the same `GlassColors[scheme].card` tokens plus a 1px top highlight edge; uppercase section titles with `letterSpacing 0.5`; `FieldRow` renders `null` for empty values (label 38% width left, value right-aligned, `selectable`). Helper `withAlpha` lives in `/Users/.../json-import/components/importResultUtils.ts`.

Deliberately NOT shown: geocoded coordinates, import provenance, offence/incident text.

**Web-demo notes:**
- This is a static read-only card — easy and high-impact. Reproduce the hero (mono case number is the visual anchor), the four sections, the ACTUAL/DVR tag colors, and the collapsible warnings.
- Both the JSON and PDF paths land here identically. `durationMs` shows real elapsed time — fake it plausibly (JSON ≈ 0.3s, AI ≈ 9–14s).

---

### 5.9 Result surfaces — batch

**`BatchResultDetails`** (`/Users/.../json-import/components/BatchResultDetails.tsx`), under a `ResultHeader` titled "Import Complete" or "Import Failed":
1. **Count summary card** — **“Imported X of Y”** (xl bold) + chips: green `checkmark` **“X imported”**, and when `failureCount>0` a red `close` **“N failed”**.
2. **Success accordions** — single-open (`expanded` index, `-1` = all collapsed, **all start collapsed**). Header row: 9px green status dot, location name (semibold, 1 line), case number (mono sm, secondary), chevron up/down; testID `batch-item-{i}`. Body: the full `<ImportResultBody>` plus its own primary **“Go to Location”** (testID `batch-goto-{i}`).
3. **Failure card** — red-bordered: header `alert-circle-outline` + **“N Failed”**, then one row per failed file: filename (1 line) + `error.message` (up to 3 lines).
4. **Pinned footer** — a single **“Done”** for the whole batch (testID `batch-result-done`).

Source-agnostic: it consumes only the canonical `BatchImportResult`; a PDF batch is converted by `pdfBatchToImportBatch` at the app boundary, which derives `successCount`/`failureCount` **from the mapped array** so the chips can never disagree with the rendered rows.

**Web-demo notes:** an accordion list plus a red failure block; keep single-open behavior and all-collapsed default.

---

### 5.10 Dry-run / validation-only view

Only reachable via `importRecoveryJson(json, { dryRun: true })` — **not wired to any UI today**. `ErrorOrDryRunContent` renders a green `checkmark-circle` @64, title **“Validation Successful”**, a card with `Validation Status: Data is valid` and italic **“Dry run completed successfully. No data was created.”**, an optional collapsible warnings card (`warning` icon + "N Warning(s)"), and a single **“Done”** button.

**Web-demo notes:** skip unless the demo wants a "validate without saving" toggle; the code exists and is trivially exposable.

---

### 5.11 Native-dependency / mocking matrix

| Concern | Module | Where | Demo substitute |
|---|---|---|---|
| File picking | `expo-document-picker` | ImportPickerModal | `<input type="file" multiple>` |
| File reading / cache cleanup | `expo-file-system/legacy` | ImportPickerModal | `FileReader.readAsText` |
| Clipboard | `expo-clipboard` | ImportPickerModal | `navigator.clipboard.readText()` |
| PDF text extraction | `expo-pdf-text-extract` (`extractTextWithInfo`) | pdf-extraction-service | ship pre-extracted `.txt` per demo PDF; or `pdf.js` |
| On-device LLM | `@react-native-ai/apple` + `ai` (`generateText`) | apple-intelligence-provider | canned JSON per fixture, with a scripted delay; optionally a real API call behind a key the demo owns |
| UUIDs | `expo-crypto` | mapper | `crypto.randomUUID()` |
| Persistence | `expo-sqlite` via case-management `executeTransaction` | persist-mapped-import | in-memory / localStorage store |
| Geocoding | Mapbox via `@/features/location` | persist-mapped-import | stub coords, or force the `GEOCODING_NO_MATCH` warning |
| Sync notify | `@/features/sync` `onSaveComplete()` | persist + batch loops | no-op |
| Animations | `react-native-reanimated` (`FadeIn`, `withTiming`) | terminal CTA, progress bars | CSS transitions (350ms fade, 300ms width) |
| Icons | `@expo/vector-icons` Ionicons | everywhere | any icon set with matching glyph names |
| Fonts | `Typography.fontFamily.scannerMono` (ShareTechMono TTF) | terminal | webfont ShareTechMono; do NOT fall back to generic `monospace` if fidelity matters |
| Keyboard | `react-native-keyboard-controller` | paste-text step | n/a on web |
| a11y announce | `AccessibilityInfo` | terminal | `aria-live="polite"` (already the pattern used) |
| Native confirm | `Alert.alert` | batch >25 files | `window.confirm` / modal |


---

## 6. Media, OCR & Location Features

Scope: feature-internal UI under `src/features/media/`, `src/features/ocr-time-capture/`, `src/features/location/`. Route wrappers in `app/(form)/` and `app/(tabs)/` are covered elsewhere; every component below is **presentational + callback-isolated** (never imports Zustand), which makes them directly portable to a web demo — the demo only has to supply the same `value` / `onChange` / `onComplete` / `onCancel` props.

All paths are absolute.

---

### 6.1 Video/Image Capture — `MediaCaptureFlow` (state machine)

**Purpose.** Capture a photo or video with the device camera, review it, attach a filename + caption, and hand a `MediaCaptureResult` to the route wrapper for persistence.

**File:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/media/video-image-capture/components/MediaCaptureFlow.tsx`

**Component tree**
```
MediaCaptureFlow                         (…/components/MediaCaptureFlow.tsx)
├─ [state 'camera']       VisionCameraScreen   (…/components/VisionCameraScreen.tsx)
│                          ├─ PermissionsView   (…/components/PermissionsView.tsx)
│                          ├─ RecordingIndicator(…/components/RecordingIndicator.tsx)
│                          ├─ ModeToggle        (…/components/ModeToggle.tsx)
│                          └─ CaptureButton     (…/components/CaptureButton.tsx)
├─ [state 'photo-preview'] FormLayout(title="Review Image", showExit) > PhotoPreview
│                          └─ MetadataForm      (…/media/shared/components/MetadataForm.tsx)
└─ [state 'video-preview'] FormLayout(title="Review Video", showExit) > VideoPreview
                           └─ MetadataForm
```

**Flow state machine** — `type FlowState = 'camera' | 'photo-preview' | 'video-preview'`, plus `capturedMedia: { uri, capturedAt, type, duration? } | null`.

| From | Trigger | To | Side effects |
|---|---|---|---|
| `camera` | `onPhotoCapture(uri, capturedAt)` | `photo-preview` | store `capturedMedia` |
| `camera` | `onVideoCapture(uri, capturedAt, duration)` | `video-preview` | store `capturedMedia` incl. duration |
| `*-preview` | **Retake / Record Again** (`handleRetry`) | `camera` | `deleteCaptureTempFiles([uri])` fire-and-forget, clear `capturedMedia` |
| `*-preview` | **Save Image / Save Video** | (stays; route navigates) | `onComplete(MediaCaptureResult)` |
| any | screen blur (`useIsFocused() === false`) | `camera` | clear `capturedMedia` (prevents stale preview on return) |
| any | header exit (`showExit` / `onCancel`) | — | `onCancel()` |

**Result contract** (canonical copy in `/Users/…/src/features/media/types.ts`, duplicate declaration in `MediaCaptureFlow.tsx`):
```ts
interface MediaCaptureResult {
  uri: string; type: 'photo' | 'video'; capturedAt: string /* ISO 8601 */;
  duration?: number /* seconds, video only */; userFilename: string; caption: string
}
```
`isSaving?: boolean` prop disables both preview buttons and shows a spinner on Save.

**Web-demo notes:**
- `react-native-vision-camera` → `navigator.mediaDevices.getUserMedia({video, audio})` + `<video>` preview; `MediaRecorder` for video mode; `canvas.drawImage` + `canvas.toBlob()` for photo.
- `expo-file-system` temp files → `URL.createObjectURL(blob)` object URLs held in component state; "delete temp file" → `URL.revokeObjectURL(url)`.
- `@react-navigation/native` `useIsFocused` → route-change effect or `document.visibilitychange`.
- `expo-haptics` → `navigator.vibrate()` (no-op on iOS Safari) or omit.
- SQLite persistence (route layer) → IndexedDB blob store.

---

### 6.2 `VisionCameraScreen` — capture surface

**File:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/media/video-image-capture/components/VisionCameraScreen.tsx`

**Layout** (full-bleed black `View`, camera fills `StyleSheet.absoluteFillObject`):

| Zone | Control | testID | Behavior |
|---|---|---|---|
| top-left | Close (`Ionicons "close"`, 28px, white, 48×48 circle, `rgba(0,0,0,0.4)`) | `camera-close-button` | `onCancel()` |
| top-right | Torch toggle (`flash` / `flash-off`, 24px) | `torch-toggle` | flips `torchEnabled`; drives Camera `torch` prop **and** `flash: 'on'` on capture; a11y label `"Turn flash off"`/`"Turn flash on"` |
| top-center | `RecordingIndicator` (only while recording, `top:60`) | `recording-indicator` | pulsing 12px red dot (`#FF3B30`, opacity 1↔0.3, 500ms each way, native driver) + `MM:SS` badge, `accessibilityRole="timer"`, `accessibilityLiveRegion="polite"` |
| bottom (above capture row) | `ModeToggle` pill | `mode-toggle` | two segments **Photo** / **Video**, container `rgba(0,0,0,0.5)` r=20 pad 4; active segment `rgba(255,255,255,0.2)` r=16; active text `#FFFFFF`, inactive `rgba(255,255,255,0.5)`; light haptic; disabled while recording |
| bottom-center | `CaptureButton` 80×80, border 4 | `capture-button` | photo mode: white fill `#FFFFFF` / border `#CCCCCC`, 64px white inner circle. video mode: transparent fill / white border; inner 64px red circle (`#FF3B30`, r=32) → morphs to 32px rounded square (r=6) while recording. `isCapturing` → `ActivityIndicator` (`#666666` photo / `#FF3B30` video). Medium haptic. a11y: "Take photo" / "Start recording" / "Stop recording" |
| bottom-right | Flip camera (`camera-reverse`, 28px) | `camera-flip-button` | toggles `back`↔`front`; disabled while recording |

**No zoom control exists** in this screen (no pinch handler, no zoom slider) — a web demo should not invent one unless deliberately extending.

**States**
1. `!settingsHydrated` → centered `ActivityIndicator` + `"Loading settings..."`.
2. `!hasPermissions` (camera **and** mic both required) → `PermissionsView`: `camera-outline` 64px, title **"Camera Access Required"**, body *"This app needs camera and microphone access to capture photos and videos."*, two rows (Camera / Microphone) each with `checkmark-circle` green `#34C759` or `close-circle` red `#FF3B30` and a blue **Grant** button (`#007AFF`) when missing, plus a **Cancel** text button.
3. `!device` → `camera-outline` 64px + `"No camera device available"` + **Go Back**.
4. Normal → camera + controls.

**Settings-driven behavior** (`useMediaCaptureSettings` from `@/features/settings`):
- `videoQuality` ∈ `720p|1080p|2160p` → `VIDEO_RESOLUTION_MAP` → `useCameraFormat(device, [{videoResolution}, {photoResolution:'max'}])`.
- `gpsInMedia` → requests location permission and sets `enableLocation` on `<Camera>` (EXIF GPS embed).
- `shutterSound` → `takePhoto({ enableShutterSound })`.
- `videoCodec` `auto|avc1|hvc1` → mapped to vision-camera `undefined|'h264'|'h265'`.
- `maxVideoDuration` (seconds, `0` = unlimited) → effect auto-calls `stopRecording()` when `recordingDuration >= max`.
- `isActive={isFocused}` is the **primary** camera-release mechanism (drawer uses `freezeOnBlur`), plus `photoQualityBalance="quality"`.

**Timer hook:** `/Users/…/src/features/media/video-image-capture/hooks/useRecordingTimer.ts` → `{ duration, formattedDuration (MM:SS), isRunning, start, stop, reset }`; `start()` is a no-op while running; interval cleaned on unmount.

**Capture services**
- `/Users/…/src/features/media/video-image-capture/services/vision-capture-service.ts` — `createPhotoCapture(photo, capturedAt)` / `createVideoCapture(video, capturedAt)`: copy the vision-camera file to a `media_capture_` temp path (`copyAsync` + best-effort `deleteAsync`, never `moveAsync`), read size, reject over `CAPTURE_SETTINGS.MAX_IMAGE_SIZE_BYTES` (50 MB) / `MAX_VIDEO_SIZE_BYTES` (500 MB) cleaning the temp file, return `PendingCapture` (photo carries `width`/`height`; video carries rounded `durationSeconds`).
- `/Users/…/src/features/media/video-image-capture/services/temp-file-manager.ts` — `generateTempFilePath('image'|'video')` → `documentDirectory/media_capture_<ts>.<ext>`; `deleteCaptureTempFiles(uris)` refuses paths inside `Paths.casesRoot` or containing `/cases/`, and refuses anything not prefixed `media_capture_`; `cleanupOldCaptureTempFiles()` (1 h) exists but **is never called** (BUG-040).
- Constants: `/Users/…/src/features/media/video-image-capture/constants/index.ts` — `TEMP_FILE_PREFIX: 'media_capture_'`, `MAX_TEMP_AGE_MS: 3600000`, `PHOTO_QUALITY 0.9`, `DEFAULT_VIDEO_QUALITY '1080p'`, `MAX_VIDEO_DURATION_SECONDS 300`.

**Error surfaces:** toasts — `"Photo capture failed"`, `"Video processing failed"`, `"Recording failed"` (each `text2` = error message).

**Web-demo notes:**
- vision-camera format selection → `getUserMedia` constraints `{ width: {ideal}, height: {ideal} }` mapped from the same 720/1080/2160 table; facingMode `environment`/`user` for flip.
- torch → `MediaStreamTrack.applyConstraints({ advanced:[{torch:true}] })` (Chrome/Android only); otherwise a UI-only toggle.
- shutter sound → `Audio` element; GPS embed → `navigator.geolocation` written to a sidecar metadata object (browsers cannot write EXIF into a canvas blob without a library).
- codec choice → `MediaRecorder` `mimeType` (`video/webm;codecs=vp9|h264`).
- size caps → check `blob.size` against the same byte constants.

---

### 6.3 `PhotoPreview` / `VideoPreview`

**Files:** `/Users/…/src/features/media/video-image-capture/components/PhotoPreview.tsx`, `…/VideoPreview.tsx`

`PhotoPreview` (testID `photo-preview`):
- `<Image>` `width = screenWidth − 2×Layout.screenPadding.horizontal`, `height = width × 0.75` (**4:3**), `resizeMode="contain"`, a11y "Captured image preview". Fixed pixel height (not `aspectRatio`) deliberately, to avoid keyboard-animation jitter.
- `MetadataForm mediaType="photo"`.
- Row of two flex-1 buttons: **Retake** (`variant="outline"`, testID `retry-photo-button`) and **Save Image** (testID `save-photo-button`, `disabled={!isFormValid || isSaving}`, `loading={isSaving}`).

`VideoPreview` (testID `video-preview`):
- `<VideoView>` (expo-video, `useVideoPlayer(uri, p => p.loop = false)`), `width` same, `height = width × 9/16` (**16:9**), `nativeControls`, `fullscreenOptions={{enable:true}}`, `contentFit="contain"`.
- Centered caption line `Duration: MM:SS` (via `formatPlaybackTime`; `'--:--'` when duration is undefined).
- `MetadataForm mediaType="video"`.
- Buttons: **Record Again** (outline, `retry-video-button`) / **Save Video** (`save-video-button`).

**Web-demo notes:** `<img>` / `<video controls>` with object-URL sources; `expo-video` player → native `<video>` element; aspect ratios reproduce with CSS `aspect-ratio: 4/3` and `16/9`.

---

### 6.4 Shared `MetadataForm`

**File:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/media/shared/components/MetadataForm.tsx`

Fully controlled; the parent owns state. Props: `value: {filename, caption}`, `onChange`, `onValidChange(isValid)`, `mediaType: 'photo'|'video'|'audio'`, `testID` (default `metadata-form`).

| Field | testID | Label | Placeholder | Rules |
|---|---|---|---|---|
| Filename | `metadata-filename-input` | `Filename` (marked `required`) | `Enter image filename` / `Enter video filename` / `Enter audio filename` | `autoCapitalize="none"`, `autoCorrect={false}`, `maxLength=100`, **sanitized on every keystroke**: `input.replace(/[<>:"/\\|?*]/g, '')`. Helper text: ``Required. File name for the ${mediaType === 'audio' ? 'audio note' : mediaType}.`` |
| Caption | `metadata-caption-input` | `Notes` | `Add a description (optional)` | `multiline`, `numberOfLines={3}`, `maxLength=500`. Helper: `Optional. Describe the content.` |

**Validation:** `isValid = value.filename.trim().length > 0 && trimmed.length <= 100`. Reported via `onValidChange` in a `useEffect` on mount and on every filename change — **push-only, there is no getter**. Caption is never validated. Save buttons in all three previews gate on this flag.

`formatPlaybackTime(seconds)` (`/Users/…/src/features/media/shared/utils/format.ts`): clamps negatives to 0, floors fractions, returns `MM:SS`, or `HH:MM:SS` past one hour (`0 → "00:00"`, `75 → "01:15"`, `3661 → "01:01:01"`).

**Web-demo notes:** pure DOM — two `<input>`/`<textarea>` with `maxlength` and the same regex `replace` in the change handler; no native deps at all. This is the single highest-fidelity component to port verbatim.

---

### 6.5 Audio Recording — `AudioRecordingFlow` (state machine)

**File:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/media/audio-recording/components/AudioRecordingFlow.tsx`

```
AudioRecordingFlow
├─ [state 'recorder']       RecorderScreen (key={recorderKey})
│                            ├─ CrtOverlay · TimerCard · SpectrumVisualizer · LevelMeter
│                            ├─ RecordButton
│                            └─ GlassPillButton ×2 (Pause|Resume, Stop)
└─ [state 'audio-preview']  FormLayout(title="Review Audio", showExit) > AudioPreview
                             └─ MetadataForm(mediaType="audio")
```

`type AudioFlowState = 'recorder' | 'audio-preview'` (`/Users/…/src/features/media/audio-recording/types.ts`).

| From | Trigger | To | Side effects |
|---|---|---|---|
| `recorder` | `onRecordingComplete(CapturedAudio)` | `audio-preview` | store `capturedAudio` |
| `audio-preview` | **Record Again** | `recorder` | `deleteAudioTempFiles([uri])`, clear audio, `recorderKey++` (forces remount → fresh native recorder connection) |
| `audio-preview` | **Save Audio** | — | `onComplete(AudioRecordingResult)` |
| any | blur (`!isFocused`) | `recorder` | clear audio, `recorderKey++` |

`CapturedAudio = { uri, capturedAt (ISO), durationMs, fileSize, mimeType, compressedUri? }`.
`AudioRecordingResult = CapturedAudio-derived + { userFilename, caption }`.

---

### 6.6 `RecorderScreen` — recording UI

**File:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/media/audio-recording/components/RecorderScreen.tsx`

**Local UI state** (mirrors the hook because the library's `isRecording` lags one render): `uiState: 'idle' | 'recording' | 'paused'`. `isActiveRecording = uiState !== 'idle'`.

Vertical layout inside a `SafeAreaView`:
1. **`CrtOverlay`** — non-interactive scan-line surveillance texture.
2. **Header** — 40×40 glass close button (`Ionicons "close"` 20px, testID `cancel-button`, a11y "Cancel recording") on the left; right badge = 5px primary dot + mono text `AUDIO CAPTURE` (10px, letterSpacing 1.5, `#5a7a9a`).
3. **`TimerCard`** (`/Users/…/components/TimerCard.tsx`) — `LinearGradient` glass card, r=xl, 1px border, top highlight line. Left: mono 46px bold duration via `formatDuration(durationMs)`. Right: animated status dot + status text — `READY` (`#5a7a9a`), `REC` (`colors.error`, dot pulses 1↔0.3 @500ms), `PAUSED` (`#ffd93d`, dot blinks square-wave @700ms); paused also tints the timer text gold. Bottom metadata row (mono 10px): `44.1kHz / AAC`, live wall clock `HH:MM:SS` (ticks 1/s only when not idle), `MONO / 128k`.
4. **`SpectrumVisualizer`** — 40 bars (`BAR_COUNT=40`, `BAR_GAP=3`), heights driven by Reanimated `useFrameCallback` on the UI thread, throttled ~80 ms, gated by `useIsFocused`; lerp 0.5 while recording, 0.06 decay when paused. Each bar has a top cap plus a mirrored reflection below the center line at 0.4× height. Blue while recording, gold when paused.
5. **`LevelMeter`** — visible only when `isActiveRecording`; horizontal fill bar width from a Reanimated shared value lerped every 50 ms; dB text (`-inf dB` initial) re-rendered every 200 ms; fill color `#2B8CC1` normal → `#ffd93d` above 70 % → `#ff4757` above 85 %; slides in/out (opacity + 5px translateY, 400/300 ms).
6. **Controls section**
   - **`RecordButton`** (90 px, testID `record-button`) — outer decorative ring (BUTTON+16) that pulses scale 1↔1.06 / opacity 0.3↔0.5 on a 1250 ms cycle while recording; middle glass ring (BUTTON+6); inner circle morphs `64px white #e8edf2` (idle) → `30px red #ff4757 r=7` (recording) → `64px red circle` with pulsing glow (paused), 450 ms bezier. Press-in spring scale 0.94. Medium haptic. a11y: "Start recording" / "Stop recording". `onPress = uiState === 'idle' ? handleRecord : handleStop`.
   - **Secondary controls** — animated in (opacity 0→1, translateY 12→0, 450 ms) only while active, `pointerEvents` gated. Two `GlassPillButton`s (42px tall, r=21, glass gradient, icon 14px + label): **Pause** (`pause`, blue border) shown when recording ⇄ **Resume** (`play`, green `#10d177`) when paused; and **Stop** (`stop`, red `#ff4757`), `disabled` until `durationMs >= 500` (`MIN_RECORDING_DURATION_MS`).

**Permission-denied state** (`!hasPermission && !permissionStatus.canAskAgain`, testID `permission-view`): `mic-off-outline` 64px, title **"Microphone Access Required"**, body *"Please enable microphone access in your device settings to record audio."*, **Cancel** outline button.

**Auto-stop:** effect calls `handleStop()` + info toast `"Maximum Duration Reached" / "Recording stopped at 1 hour maximum."` at `MAX_RECORDING_DURATION_MS = 3_600_000`.

**Error toasts:** `"Recording Failed" / "Unable to start recording. Please try again."`; `"Recording Error" / "Failed to save recording. Please try again."` (thrown stop, or `stopRecording()` returning `null` — UI state is deliberately left as-is so the user sees the failure).

**Hook:** `/Users/…/src/features/media/audio-recording/hooks/useAudioCapture.ts` wraps `@siteed/expo-audio-studio`'s `useAudioRecorder`; exposes `startRecording, stopRecording, pauseRecording, resumeRecording, isRecording, isPaused, durationMs, analysisData, permissionStatus{granted,canAskAgain}, requestPermission, hasPermission`. Three stop paths (user, blur cleanup, unmount) funnel through one `safeLibStop` flag so the native stop is called at most once. After each stop it calls `setAudioModeAsync({ playsInSilentMode: true })` so playback routes to the main speaker.

**Recording config:** `/Users/…/src/features/media/audio-recording/constants/index.ts` → `createRecordingConfig()`: 44 100 Hz, 1 channel, `pcm_16bit` source, **primary output disabled / compressed AAC @128 kbps enabled**, `keepAwake:true`, `interval: 100 ms`, `enableProcessing: true`, iOS session `PlayAndRecord` + `['AllowBluetooth','MixWithOthers','DefaultToSpeaker']`.
Temp files: prefix `audio_capture_`, `MAX_TEMP_AGE_MS` 1 h. `deleteAudioTempFiles` gates on **document-directory membership + not-in-case-hierarchy** (the prefix is *not* the gate — recorder-generated filenames don't carry it; register them with `trackExternalFile`).

**Web-demo notes:**
- `@siteed/expo-audio-studio` → `MediaRecorder` over `getUserMedia({audio:true})` with `mimeType:'audio/webm;codecs=opus'` (or `audio/mp4` on Safari); `pause()`/`resume()` exist natively on `MediaRecorder`.
- Live amplitude (`analysisData.dataPoints[].amplitude`) → Web Audio `AudioContext` + `AnalyserNode.getByteTimeDomainData()`/`getByteFrequencyData()` inside a `requestAnimationFrame` loop — this maps 1:1 onto the 40-bar spectrum and the dB meter.
- Reanimated UI-thread animation → `requestAnimationFrame` + direct style writes (or CSS transforms); keep the same 80 ms throttle / 0.5 & 0.06 lerp constants for identical feel.
- `expo-file-system` temp file → object URL / IndexedDB blob; `fileSize` from `blob.size`; `durationMs` from the recorder timer or a decoded `AudioBuffer.duration`.
- Mic permission `canAskAgain` → the browser has no equivalent; treat `NotAllowedError` from `getUserMedia` as the denied state and show the same copy.

---

### 6.7 `AudioPreview`

**File:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/media/audio-recording/components/AudioPreview.tsx`

Rendered inside `FormLayout`'s `KeyboardAwareScrollView` — must **not** nest another ScrollView.

- **Player card** (`Card`, testID `audio-player-controls`)
  - Centered 72 px round play/pause button (`colors.primary`, icon 36 px, testID `play-button`); replaced by a 72 px circle with an `ActivityIndicator` (testID `audio-loading-indicator`) until `status.isLoaded`.
  - **Progress bar**: 6 px track (`colors.border`) with `colors.primary` fill at `currentTime/duration`; testIDs `progress-bar` / `progress-track` / `progress-fill`. Tap-to-seek computed from `event.nativeEvent.locationX / barWidth` clamped 0–1. `hitSlop {16,16,0,0}`. `accessibilityRole="adjustable"` with `increment` / `decrement` actions that seek ±5 s.
  - Time row: `formatPlaybackTime(currentTime)` left / `formatPlaybackTime(duration)` right, mono font (`audio-elapsed-text`, `audio-duration-text`).
  - File-info row: `Duration: <formatDuration(durationMs)>` and `formatFileSize(fileSize)`.
  - Replay quirk: if `currentTime >= duration − 0.1`, `handlePlayPause` seeks to 0 before `play()` (`expo-audio` does not auto-reset).
  - **Never** manually `pause()`/`remove()` the player in cleanup — `useAudioPlayer` auto-releases via SharedObject (a manual cleanup crashed real devices, commit `aac2dc9`).
- `MetadataForm mediaType="audio"`.
- Buttons: **Record Again** (outline, `retry-audio-button`) / **Save Audio** (`save-audio-button`, gated on `isFormValid && !isSaving`).

**Web-demo notes:** `expo-audio` → `<audio>` element + `timeupdate` events; seek via `audio.currentTime`; `isLoaded` → `loadedmetadata`. Everything else is plain layout.

---

### 6.8 Media Library — `MediaLibrarySheet`

**Purpose.** Browse / preview / delete the photos, videos and audio saved against one Location.

**File:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/media/media-library/components/MediaLibrarySheet.tsx`

**Props:** `{ visible, onClose, locationId: UUID, initialTab?: 'photos'|'video'|'audio' }` — the only public export of the sub-feature.

**Component tree**
```
Modal(presentationStyle="pageSheet", animationType="slide", onRequestClose)
└─ SafeAreaView(accessibilityViewIsModal) > LinearGradient(full-sheet navy/light gradient)
   ├─ LinearGradient header  — "Media Library" (2xl bold) + "<N> items" subtitle
   │                            + 30×30 close button (testID media-library-close-button)
   ├─ LinearGradient accent strip (2 px, primary fading to transparent at both edges)
   ├─ MediaTabs                                   (…/components/MediaTabs.tsx)
   ├─ MediaPreview (when previewState !== 'closed')(…/components/MediaPreview.tsx)
   ├─ hairline separator
   ├─ content area → PhotoList | VideoList | AudioList | EmptyMediaState | loading | error
   └─ MediaPreviewFullscreen (mounted ONLY while previewState === 'fullscreen')
```
Backgrounds: dark `#0b1624` base, gradient `['#0f1f33','#0d1a2c','#0b1624']`; light `#e8eef4` base, `['#f8fafc','#f1f5f9','#e8eef4']`.

**`MediaTabs`** (`accessibilityRole="tablist"`): three `Pressable`s with `accessibilityRole="tab"` and `accessibilityState={{selected}}` — **Photos** (`images-outline`), **Video** (`videocam-outline`), **Audio** (`mic-outline`). Active tab = primary color + bottom border + bold label. Count badge pill rendered when `count > 0`, showing `99+` above `TAB_CONFIG.maxBadgeCount = 99`. a11y label ``${label} tab, ${count} items``.

**List rows** — all three lists share `LIST_CONFIG`: row height **76**, thumbnail **56×34** r=6, separator `0.5`, `initialNumToRender 12`, `maxToRenderPerBatch 9`, `getItemLayout`, `React.memo` rows fed primitive color props.
- `PhotoList` row: thumbnail `<Image resizeMode="cover">` with an error-placeholder overlay (`image-outline` 14px) and a bottom-left category badge; then filename (1 line, `ellipsizeMode="middle"`, bold when selected), meta row `size · date`, optional italic caption (1 line); trailing `chevron-forward`. Selected row: tinted surface + 2 px left border in primary.
- `VideoList` row: same skeleton, `Ionicons` glyph instead of an image thumbnail, meta `duration · size · date` where duration = `getFormattedDuration(metadata, 'duration', 1000)` (**video duration is in seconds**). a11y ``Video: ${filename}, ${duration}``.
- `AudioList` row: identical but `getFormattedDuration(metadata, 'durationMs', 1)` (**audio is already ms**). a11y ``Audio: ${filename}, ${duration}``.
- Category badges (`CATEGORY_BADGES`): `DVR_ORIGINAL → "DVR"`, `DVR_CROPPED → "Crop"`, `CAMERA_PHOTO → "Camera"`, `EVIDENCE`/`SUPPLEMENTAL` → no badge.

**`MediaPreview`** — three visual zones:
1. Recessed inset (rounded, 1 px border, inner shadow, `padding 8`) containing, keyed on `media.id` so the old player unmounts first:
   - image → `<Image resizeMode="contain">`, height `= (screenWidth − 16)/(4/3) − 16`;
   - video → `<VideoView nativeControls fullscreenOptions contentFit="contain">` at the same height (16:9 letterboxes);
   - audio → 56 px round play button (testID `audio-play-button`) + 4 px progress track with tap-seek (`audio-progress-bar`) + mono elapsed/total row, all bottom-aligned (`justifyContent: 'flex-end'`), upper area reserved for a future waveform.
2. `MediaItemInfo` — line 1 filename (2 lines, middle-ellipsis); line 2 `[badge] duration · size · date` (dot separator `·`); line 3 caption in italics, **line height always reserved** to prevent layout shift.
3. Action row (right-aligned, 36 px glass circles): **fullscreen** `expand-outline` (image/video only, testID `media-preview-fullscreen-button`) and **close** `chevron-down` (`media-preview-close-button`).

**`MediaPreviewFullscreen`** — full-screen black `Modal` (`animationType="fade"`, `statusBarTranslucent`), image or video filling the screen with `contain`, plus a 44 px close button top-right inside a `SafeAreaView`. Audio has **no** fullscreen. `useVideoPlayer` is called unconditionally with `null` source when not a video (rules of hooks).

**Empty states** (`EMPTY_STATE_CONFIG`, icon 40 px, centered):
| Tab | Message | Hint |
|---|---|---|
| photos | `No photos` | `Use Capture Media to take photos` |
| video | `No videos` | `Use Capture Media to record video` |
| audio | `No audio` | `Use Record Audio to capture audio` |

**Loading state:** spinner + `Loading media...` (testID `media-loading`). **Error state:** `alert-circle-outline` 40 px + error text + outlined **Retry** button (testID `media-error`).

**Hooks**
- `useMediaLibrary(locationId, initialTab)` — `getMediaByLocation()` → drop `MediaType.PDF` → partition photos/videos/audio → re-sort each by `createdAt` **descending** (the service returns ASC) → `counts {photos,video,audio,total}`, `totalStorageSize`, `activeTab/setActiveTab`, `activeMedia`, `isLoading`, `error`, `refresh`. `isMountedRef` guards all `setState`. `locationId === null` skips fetching.
- `useMediaPreview()` — `closed → inline → fullscreen` machine. `selectMedia(media)` works from any state → `inline`. `openFullscreen()` bails to `closed` if nothing selected, else only advances from `inline` (reads a synchronous `selectedMediaRef` to avoid nested setState). `closeFullscreen()` → `inline`, selection preserved. `closePreview()` → `closed`, selection cleared.
- `useMediaDelete({onDeleted, onRefresh})` — `requestDelete(media)` shows `Alert.alert("Delete Media", 'Are you sure you want to delete "<filename>"? This action cannot be undone.', [Cancel, Delete(destructive)])`; on confirm `deleteMedia(id)` → success haptic → toast `Media deleted` → `onDeleted(id)` → `await onRefresh()`. Failures → `logError` + toast `Failed to delete media`. `isDeletingRef` rejects overlapping deletes.

**Sheet-level behaviors:** re-fetch on `visible` false→true; auto-select the first item on load **and** on every tab switch; long-press a row → medium haptic → `requestDelete`; closing the sheet also closes the preview. **There is no rename UI** — delete is the only mutation.

**Web-demo notes:**
- pageSheet `Modal` → a `<dialog>` or fixed-position sheet with a slide-up transition; `onRequestClose` → Escape key.
- `expo-video`/`expo-audio` → `<video>` / `<audio>`; `expo-haptics` → `navigator.vibrate` or drop.
- `Alert.alert` → a custom confirm dialog (`window.confirm` loses the destructive styling and the filename formatting).
- SQLite `getMediaByLocation` / `deleteMedia` → IndexedDB object store keyed by `locationId`, or a static JSON fixture for a canned demo.
- `FlatList` + `getItemLayout` → plain list; only reach for virtualization (`react-window`) if the demo dataset is large.

---

### 6.9 OCR Time Capture — `OcrCaptureFlow` (state machine)

**Purpose.** Photograph a DVR's on-screen timestamp, OCR it, and produce a DVR-time-vs-real-time offset for the current Location.

**File:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/ocr-time-capture/components/OcrCaptureFlow.tsx`

Discriminated union — the confirmation payload is only representable in the confirmation state, so no runtime guard is needed:
```ts
type FlowState =
  | { step: 'camera' }
  | { step: 'confirmation'; capturedImageUri: string; croppedImageUri: string;
      calibratedTimestamp: number /* ms since epoch */; syncResult: SyncResult | null }
```

| From | Trigger | To |
|---|---|---|
| `camera` | `onNavigateToConfirmation(photoUri, croppedUri, calibratedTimestamp, syncResult)` | `confirmation` |
| `confirmation` | **Retry Capture** | `camera` |
| `confirmation` | **Confirm & Calculate** | `onComplete(OcrCaptureResult)` (route navigates on) |
| any | `useFocusEffect` fires (screen regains focus) | `camera` — mandatory because the drawer uses `freezeOnBlur` and the confirmation's temp images were already deleted |

The confirmation step is wrapped in `FormLayout title="Confirm OCR Result"` with `onBack = onCancel` (testID `ocr-confirmation-screen`).

---

### 6.10 `CameraScreen` (OCR capture surface)

**File:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/ocr-time-capture/components/CameraScreen.tsx`

Stack: black container → `<CameraView>` (expo-camera, `facing="back"`, `mode="picture"`, `enableTorch={flashEnabled}`, `pictureSize` = the **largest** entry returned by `getAvailablePictureSizesAsync()` by pixel count) rendered **only while `isFocused`** (expo-camera has no `isActive` prop, so conditional render is the HAL release) → absolute overlay container (`pointerEvents="none"`, `bottom: 90`) holding `BoundingBoxOverlay` + `CameraInstructions` → `CameraControls` bar pinned to the bottom.

**`BoundingBoxOverlay`** (`…/components/BoundingBoxOverlay.tsx`): four dark bands (`rgba(0,0,0,0.6)`) around a transparent guide box. The app is **portrait-locked but the operator holds the phone sideways**, so the on-screen guide is *tall and narrow* while the crop is *wide and short* — the axes are deliberately swapped. `boxWidth = screenWidth × BOX_HEIGHT_PERCENT (0.17)`; overlay height `= screenHeight − 90`; `fullBoxHeight = screenHeight × BOX_WIDTH_PERCENT (0.80)`; `bottomGap = max((overlayHeight − fullBoxHeight)/2, 0)`; `topClearance = max(insets.top + 8, bottomGap)`; `boxHeight = max(overlayHeight − bottomGap − topClearance, 0)`. Box border: 2 px **dashed white**; four 30×30 `colors.primary` corner brackets with 4 px borders offset `−2`.

**`CameraInstructions`**: black-70 % rounded panel, absolutely positioned `top:'45%', left:-140, width:360`, `transform: rotate(-90deg)` so it reads upright in the landscape hold. Line 1 (14 px, 600): **"Align DVR timestamp to fill the bounding box"**. Line 2 (11 px): `Tip: <tip>`, where the tip is picked once per mount at random from `CAPTURE_TIPS`:
> "Hold steady for 2 seconds before capturing" · "Ensure DVR timestamp is fully visible" · "Use flash in low light conditions" · "Get as close as possible without cutting off text" · "Avoid reflections from glass screens"

**`CameraControls`** (`memo`, 90 px tall bar, `colors.overlayLight` background, all icons `rotate(90deg)` for the landscape hold):
| Control | Icon | Behavior |
|---|---|---|
| Close | `close` 28px, 52×52 circle `rgba(0,0,0,0.4)` | haptic + `onCancel()`; a11y "Close camera" |
| Flash | `flash` / `flash-off` 28px | haptic + toggles `flashEnabled` (drives `enableTorch`); disabled while capturing; a11y "Turn on/off flash" |
| Shutter | `CaptureButton` 80×80 white, 4 px white border, 64 px white inner circle (`…/components/CaptureButton.tsx`) | medium haptic + `onCapture()`; while capturing shows a large `ActivityIndicator` in `colors.primary`; `opacity 0.5` when disabled. `marginLeft:'auto'` pushes it to the right edge |

**Volume-button shutter:** `useVolumeShutter({ enabled: permission.granted && isFocused && !isCapturing, onCapture, debounceMs: 300 })` — maps either volume key to the shutter, hides the native volume HUD, pins volume to 50 % so both directions stay detectable, restores on cleanup. Physical device only.

**Permission state:** `CameraPermissions` (`…/components/CameraPermissions.tsx`) on black — `"Loading camera..."` while `permission` is undefined, otherwise `"Camera permission is required to capture DVR timestamps"` + **Grant Camera Permission** button.

**Capture orchestration (order is load-bearing).** Inside `handleCapture`:
1. `const deviceTimeAtCapture = Date.now()` — **the very first line inside the try**, before any promise is created.
2. `const syncPromise = captureSyncRef.syncTime ? captureSyncRef.syncTime(true) : Promise.resolve(null)` — NTP fires **in parallel** with the image capture; total wait is `max(ntp, capture)`, not the sum.
3. `await processOcrCapture(cameraRef.current)`.
4. `const syncResult = await syncPromise`.
5. `calibratedTimestamp = syncResult?.success === true ? deviceTimeAtCapture + syncResult.offset : deviceTimeAtCapture` (positive offset = device slow).
6. `onNavigateToConfirmation(photoUri, croppedUri, calibratedTimestamp, syncResult)`.
Failure → toast `"Capture failed"` with the error message. `syncResult` is **never** written to the store here — the route is the single commit point.

**Crop math** (`/Users/…/src/features/ocr-time-capture/services/ocr-capture-service.ts`): `takePictureAsync({ quality: 1.0, skipProcessing: true, exif: false })`, then a centered crop that is **always wide × short** regardless of device orientation:
```
boxWidth  = photo.width  * (0.80 + 0.05*2)   // BOX_WIDTH_PERCENT + 2× CROP_BUFFER_PERCENT
boxHeight = photo.height * 0.17              // BOX_HEIGHT_PERCENT
originX   = (photo.width  - boxWidth ) / 2
originY   = (photo.height - boxHeight) / 2
// then floor + clamp to [0, photo.dim] and re-clamp width/height to remaining space
```
Throws `'Invalid crop region: width and height must be positive'` if the region degenerates.

**Image output** (`/Users/…/src/features/ocr-time-capture/services/image-processor.ts`): `manipulateAsync(uri, [{crop}], {format: SaveFormat.PNG})` (PNG = lossless, keeps OCR fidelity; **no** binarization/resize — ML Kit normalizes internally), then copies to
- `documentDirectory/dvr_capture_<ts>_full.png`
- `documentDirectory/dvr_capture_<ts>_cropped.png`

Cleanup: `cleanupOldOcrImages()` deletes `dvr_capture_*.png` older than **7 days**; `deleteSpecificTempFiles(uris)` deletes only URIs containing `dvr_capture_` **and** not containing `Paths.casesRoot` or `/cases/`, with per-file error isolation.

**Web-demo notes:**
- `expo-camera` `CameraView` → `getUserMedia` + `<video>`; largest picture size → `track.getCapabilities().width/height` max, or just capture at the video track's native resolution.
- Crop → draw the frame to an offscreen `<canvas>` using exactly the same origin/size formula, then `canvas.toBlob('image/png')`.
- `expo-image-manipulator` → canvas 2D `drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh)`.
- `react-native-volume-manager` → no web equivalent; bind the Space key or drop the feature.
- NTP via `precision-time-sync` → `fetch('https://worldtimeapi.org/...')` round-trip offset, or hardcode `offset = 0` and label it "device time".
- The rotated landscape HUD → CSS `transform: rotate(-90deg)`; on the web the demo may prefer a straight horizontal guide box (drop the axis swap, keep the 80 %×17 % crop ratio).

---

### 6.11 OCR text-cleaning pipeline — EXACT rules

This is the part a web demo must reimplement byte-for-byte. Two pure modules, no I/O:

- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/ocr-time-capture/utils/text-cleaning-pipeline.ts` (class `TextCleaningPipeline`, ~2 200 lines)
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/ocr-time-capture/utils/timestamp-parser.ts` (`parseTimestampFromText`, `validateDateTime`, `getConfidenceLevel`)
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/ocr-time-capture/utils/date-disambiguation.ts`

Orchestration in `/Users/…/services/ocr-service.ts`:
```
rawText = MLKit.recognize(croppedUri).text.trim()
pipeline = new TextCleaningPipeline(); pipeline.setCurrentTime(calibratedTimeMs?)
cleanedText = pipeline.clean(rawText)
parsedDateTime = parseTimestampFromText(cleanedText) ?? parseTimestampFromText(rawText)   // raw-text fallback
confidence     = mean(block.confidence) → else mean(line.confidence) → else 1.0
returns { rawText, cleanedText, confidence, detectedTimestamp, parsedDateTime, dateDisambiguation? }
```
`extractTimestampFromImage` **never throws** — on ML Kit unavailability / unreadable file it returns an error-shaped result with `confidence: 0` and an `error` string.

#### Stage 0 — trim
`if (!rawText) return ''`; `trimmed = rawText.trim()`.

#### Stage 0.5 — aggressive space normalization
Applied in this order:
1. `s.replace(/(\d)([PApa][A-Za-z]?)\b/g, '$1 $2')` — separates an attached meridiem, including OCR-mangled forms: `03:10:07PM → 03:10:07 PM`, `15PA → 15 PA`, `15PN → 15 PN`, `15P → 15 P`, `15AH → 15 AH`.
2. `s.replace(/\s+([PApa][A-Za-z]?)\b/g, ' $1')` — collapse whitespace before a meridiem-like token.
3. `s.replace(/(\d)\s+(:)\s*(\d)/g, '$1$2$3')` and `s.replace(/(\d)\s*(:)\s+(\d)/g, '$1$2$3')` — kill spaces around colons (`03: 10:07 → 03:10:07`).
4. `s.replace(/(\d)\s*([-/.])\s*(\d)/g, '$1$2$3')` — kill spaces around date separators (`11 - 09 - 2024 → 11-09-2024`).
5. `s.replace(/\s+/g, ' ').trim()`.

#### Stage 1 — OCR character corrections
Protected words are first swapped out for digit-free placeholders `<<KEEP{X}>>` (X cycles through the safe alphabet `ACDEFHJKMNPRTUVWXY`), matched **case-insensitively on word boundaries**:
> `Sun Mon Tue Wed Thu Fri Sat`, `Sunday…Saturday`, `Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec`, `January…December` (note: **`May` appears only in the short list**, and the long list omits `May`), `AM`, `PM`.

Then a **global, non-word-boundary** substitution over everything else (plain `split(old).join(new)`):

| From | To | | From | To |
|---|---|---|---|---|
| `O` | `0` | | `Z` | `2` |
| `o` | `0` | | `z` | `2` |
| `Q` | `0` | | `B` | `8` |
| `I` | `1` | | `G` | `6` |
| `l` | `1` | | `S` | `5` |
| `i` | `1` | | `s` | `5` |

Placeholders are then restored. (Consequence: any unprotected letter in the table is destroyed, e.g. `Sat`→`5at` if it were not protected — hence the protection list.)

#### Stage 1.5 — structural normalization (`normalizeDateStructure`), 6 steps in order
1. **Leading garbage:** `^[a-zA-Z]\s+(?=\d)` → `''` (strips a single stray OCR letter such as `"w "` before digits).
2. **TIME-DATE reorder** when the input starts with a meridiem-bearing time followed by a date:
   `^(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)\s+(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})(.*)$` (case-insensitive).
   - If the date is **ISO** (`^\d{4}[-/]`) → convert to 24-hour (`PM && h!==12 → h+12`; `AM && h===12 → 0`) and emit `DATE HH:MM:SS` (meridiem dropped, because the parser doesn't handle AM/PM with ISO).
   - Else → emit `DATE h:MM:SS MERIDIEM` (meridiem preserved).
3. **8-digit compressed date** `(?<![\/\-\d])(\d{2})(\d{2})(20[0-2][0-8])(?![\/\-\d])` → `$1/$2/$3`, **only if** both 2-digit parts are 1–31. (`12122025 → 12/12/2025`.) Year window is hard-coded **2000–2028**.
4. **One missing separator**, two patterns:
   - `(?<![\/\-\d])(\d{2})(\d{2})([\/\-])(20[0-2][0-8])(?![\/\-\d])` → `d1 sep d2 sep year` (`1212/2025 → 12/12/2025`), both parts 1–31.
   - `(?<![\/\-\d])(\d{1,2})([\/\-])(\d{2})(20[0-2][0-8])(?![\/\-\d])` → `d1 sep d2 sep year` (`12/122025 → 12/12/2025`), both parts 1–31.
5. **OCR-split date** `(?<![\/\-\d])(\d{2})(\d)\s+(\d)(20[0-2][0-8])(?![\/\-\d])` → `first/mid1mid2/year` (`121 22025 → 12/12/2025`), both components 1–31.
6. **Compressed times** — four patterns, each validated `h ≤ 23 && m ≤ 59 && s ≤ 59` and each preserving an optional trailing ` AM|PM`:
   - 6a `(?<![\/\-\d])(\d{2})(\d{2}):(\d{2})(\s+(?:AM|PM))?(?=\s|$)` → `HH:MM:SS` (`1404:05 → 14:04:05`)
   - 6b `(?<![\/\-\d])(\d{1,2}):(\d{2})(\d{2})(\s+(?:AM|PM))?(?![\/\-\d])` → `HH:MM:SS` (`14:0405 → 14:04:05`)
   - 6c `(?<![\/\-\d])(\d{2})8(\d{2}):(\d{2})…` → `HH:MM:SS` — **`8` misread as the first colon** (`14804:05 → 14:04:05`)
   - 6d `(?<![\/\-\d])(\d{2}):(\d{2})8(\d{2})…` → `HH:MM:SS` — `8` misread as the second colon

#### Stage 2 — token-based reconstruction (PRIMARY path, `tokenizeAndReconstruct`)
The design claim: **separators become irrelevant**.

**2.1 Tokenize.** `text.split(/[^a-zA-Z0-9]+/)` dropping empties. Then split attached meridiems: any token matching `^(\d+)(AM|PM|A|P)$/i` becomes two tokens with the meridiem upper-cased.

**2.2 Decompose digit blobs.**
- Token matching `^\d{5,}$` → `decomposeDigitBlob`.
- Token matching `^\d{4}$` → kept intact **if** `2000 ≤ n ≤ 2028` (a year), otherwise split `2+2`.
- Everything else passes through.

`decomposeDigitBlob(blob)`: returns `[blob]` for length ≤ 4. Finds the **first** match of `/20[0-2][0-8]/` as the year anchor; if none, `classifyByLength(blob)`. Otherwise `[...classifyByLength(before), year, ...classifyByLength(after)]`.

`classifyByLength(digits)` by length:
| len | Split |
|---|---|
| 1 | `[pad2(d)]` |
| 2 | `[d]` |
| 3 | `[pad2(d[0]), d.slice(1)]` (1+2) |
| 4 | `2+2` |
| 5 | `1+2+2` (assumes a dropped leading zero on HHMMSS) |
| 6 | `2+2+2` (HHMMSS) |
| 7 | `2+2+2+pad2(1)` |
| 8 | `YYYY+2+2` if the first 4 match `^20[0-2][0-8]$`, else `2+2+2+2` |
| 10 | `2+2+2+2+2` (MMDDHHMMSS) |
| 12 | `YYYY+2+2+2+2` if the first 4 are a year, else `2+2+YYYY+2+2` |
| other (incl. 9, 11, 13+) | greedy 2-char chunks left→right, trailing single digit padded |

**2.3 Split-year merge** (only when **no** 4-digit year token exists): scan adjacent pairs; if `tokens[i] === '20'` and `tokens[i+1]` matches `^(0[0-9]|1[0-9]|2[0-8])$`, merge into a 4-digit year and **break** (at most one merge).

**2.4 Split-time-component merge** (only when a year token exists and `tokens.length > 3`): starting at **fixed index 3** (time always starts at index 3 — after three date components in any order), merge adjacent single-digit tokens when the concatenation is ≤ 59, repeatedly (`i--` after each merge). Deliberately never applied to indices 0–2, so `2024-1-9` stays 1 Jan… 9, not `19`.

**2.5 Classify.** Token types: `YEAR | DAY_NAME | CHANNEL_ID | INDICATOR | PM | AM | DATE_COMPONENT | POTENTIAL_TIME | UNKNOWN`.
- `YEAR`: numeric, 4 chars, 2000 ≤ n ≤ 2028.
- `DAY_NAME` (discarded): `/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/i` or the full day names.
- `CHANNEL_ID` (discarded): `/^(CH|CAM)\d+$/i` (e.g. `CH01`), or standalone `/^(CH|CAM|Camera|Channel|IPcamera)$/i` — and the **next numeric token after a standalone channel keyword** is also classified `CHANNEL_ID`.
- `INDICATOR` (discarded): `/^REC$/i`.
- Everything else → `UNKNOWN` (value = number when numeric).

**2.6 Find the time sequence.** `skipCount = 2` when the `YEAR` is the **first data-bearing token** (ignoring DAY_NAME/CHANNEL_ID/INDICATOR noise) — i.e. YMD order, so month+day follow the year. Three passes, each looking for three consecutive numeric `UNKNOWN` tokens satisfying `0≤h≤23, 0≤m≤59, 0≤s≤59`:
1. from `yearPosition + 1 + skipCount` (or index 0 when no year);
2. if a year exists and `skipCount > 0`, retry from `yearPosition + 1` (handles `11-09 2024 16:38:39` where the date precedes the year);
3. if no year at all, scan from index 0.
The matched triple is re-typed `POTENTIAL_TIME`.

**2.7 Meridiem.** Any string-valued `UNKNOWN` positioned **after** the time sequence (or anywhere when no time was found) becomes `PM` if it starts with `P`, or `AM` if it starts with `A` and is not a channel keyword — i.e. `PA`, `PN`, `P`, `AH` all resolve correctly.

**2.8 Date components.** Remaining numeric `UNKNOWN` tokens with `1 ≤ n ≤ 31` and `≤ 2` characters, outside the time span, become `DATE_COMPONENT` (max 2 are kept).

**2.9 Reconstruct.**
- **ISO guard (critical):** compute `firstDateTokenIdx` = first token typed `YEAR` or `DATE_COMPONENT`; `yearIsFirst = classified[firstDateTokenIdx].type === 'YEAR'`.
- If `year != null && dateComps.length >= 2`:
  - if `!yearIsFirst && needsDisambiguation(d1,d2) && currentTimeMs !== null` → run `disambiguateDateFormat` and push `result.chosenDate`, storing the result for the UI warning;
  - else **structural**: `if (d1 > 12 && d2 <= 12) { day=d1; month=d2 } else { month=d1; day=d2 }` → `YYYY-MM-DD`, and clear the disambiguation result.
  - **Do not widen this branch.** Before the guard existed, `2026-11-07` (7 Nov) was handed to proximity, came back as `2026-07-11` with `confidence: 'high'`, so `DateDisambiguationWarning` stayed silent on a court-admissible calibration.
- `year && 1 date comp` → `YYYY-DD`; `year only` → `YYYY`; `no year, ≥2 comps` → `DD-MM`.
- Time: exactly 3 components → `HH:MM:SS` zero-padded. Meridiem appended to the last part (` AM`/` PM`). Time-only with meridiem and no date returns `HH:MM:SS AM|PM` directly.
- Parts joined with a single space.

**2.10 Completeness check (`isCompleteTimestamp`).** The token result is accepted (skipping the legacy path) when:
- non-empty, **and**
- `hasDate = /\d{4}-\d{2}(-\d{2})?/.test(result)` or `hasTime = /\d{2}:\d{2}:\d{2}/.test(result)`, **and**
- **not** (`hasDate && !hasTime && hasUncapturedTimePattern`), where `hasUncapturedTimePattern = /\d{4}:\d{2}/.test(input) || /\d{2}:\d{4}/.test(input) || (/\b\d{6}\b/.test(input) && !hasTime)`.

#### Stages 1.75–5 — LEGACY fallback (only when the token result is incomplete)
- **1.75 `normalizeText`:** strip spaces around `/ - :`; `(\d{2})8(\d{2}):(\d{2}) → $1:$2:$3`; `(\d{2}):(\d{2})8(\d{2}) → $1:$2:$3`; `HHMM:SS → HH:MM:SS` and `HH:MMSS → HH:MM:SS` (each range-validated, each with `(?<![\/\-])` / `(?![\/\-])` guards).
- **1.8 `normalizeTimeSeparatorsBeforeDetection`:** converts non-colon separators to colons **only inside valid time ranges**. Separator class `[;.,*|{]`. Three patterns: `H[sep]M[sep|:]S`, `H:M[sep]S`, and `H[;,*|{]M<space>S` (dot excluded from the last two to protect dates like `2024.11.09`). All require `h≤23,m≤59,s≤59`, otherwise the original text is preserved verbatim.
- **2-old `detectStructure`:** meridiem extracted via `\b(AM|PM)\b/i` and removed. Patterns:
  - `DATE_PATTERN_STRONG = /\d{1,4}[\-\/]\d{1,2}[\-\/]\d{1,4}/`
  - `DATE_PATTERN_WEAK = /\d{1,4}\.\d{1,2}\.\d{1,4}/`
  - `TIME_PATTERN_STRONG = /\d{1,2}:\d{1,2}[:\s]\d{1,2}/`, `TIME_PATTERN_WEAK = /\d{1,2}[.,;|*]\d{1,2}[.,;|*\s]\d{1,2}/`
  Strong date wins; the time is then searched in the remainder by `extractTimeFromRemainder` (4 ordered patterns: `H[:.]MM[:.]SS` → `H:MM SS` → three space-separated small numbers → standalone 6-digit `HHMMSS`; each range-validated). Dot-separated ambiguity is resolved by "does any part look like a year ≥ 2000". A time-only match with a `\b20\d{2}\b` year elsewhere reconstructs a `D1-D2-YYYY` / `D1-YYYY` / `YYYY` date from the digit tokens before the time.
  `parseLooseComponents` handles the rest: a single 14-digit token → `YYYY-MM-DD` + `HH:MM:SS`; a single 6-digit token → `HH:MM:SS`; otherwise year-anchored heuristics (year = 4 digits ≥ 2000, date parts 1–31, time parts 0–59, preferring the interpretation where a date component sits between the year and the time).
- **3 `cleanDatePortion`:** strip inner spaces, detect the separator (`/` > `.` > `-`), split on `[-/.]`, zero-pad any part that is not a 4-digit / ≥ 2000 year, rejoin.
- **4 `cleanTimePortion`:** if `\d[;.,*|{]\d` still matches, Stage 1.8 deliberately rejected it as invalid → **return the original unchanged**. Otherwise map `COLON_CHARS = ['.', ',', ';', '*', '{', '|']` to `:`, turn `(\d)\s+(\d)` into `$1:$2`, drop remaining spaces; a bare `^\d{6}$` becomes `HH:MM:SS`; otherwise require exactly 3 colon-separated parts, each 1–2 digits, all digits, zero-padded, and range-valid — anything else yields `''`.
- **5 `reconstructDateTime`:** `[date, time, meridiem].filter(Boolean).join(' ')`.

#### Stage 6 — `finalizeOutput`
`text.replace(/\s+/g,' ').trim()`; return `''` if it contains no digit; then `replace(/[^\d\s:\/\-\.;AMPM]/gi, ' ')` (semicolons preserved so invalid time-like patterns survive intact) and collapse spaces again.

#### `parseTimestampFromText` — accepted formats, **in evaluation order**
Pre-steps: `text.replace(/\s+/g,' ').trim()`, then `stripTimezone`:
- trailing `Z` (`/Z\s*$/i`), trailing offset `/[+-]\d{2}:?\d{2}\s*$/`, trailing `/\s+(UTC|GMT|EST|EDT|CST|CDT|MST|MDT|PST|PDT)\s*$/i`. DVR clocks are treated as **local time**; timezone info is discarded, never applied.

| # | Regex | Semantics |
|---|---|---|
| **1a** | `/(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM\|PM)/i` | ISO **with** meridiem. `PM && h!==12 → h+12`; `AM && h===12 → 0`. Seconds default `'00'` |
| **1** | `/(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/` | ISO 24-hour. Month/day zero-padded |
| **2** | `/(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/` | Slash date. `first>12 && second<=12 → DD/MM`, else `MM/DD`. Year normalized. **Consumes text that pattern 4 would also match**, so PM is silently dropped on the raw-text path (BUG-039) |
| **3b** | `/(\d{1,2})-(\d{1,2})-(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM\|PM)/i` | Dash date **with** meridiem — checked **before** 3. Same `>12` day/month inference + 12→24 conversion |
| **3** | `/(\d{1,2})-(\d{1,2})-(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/` | Dash date 24-hour. `first>12 && second<=12 → DD-MM`, else default **MM-DD (US)** |
| **4** | `/(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM\|PM)/i` | Slash + meridiem — **dead code** (pattern 2 matches first). Documented as BUG-039 |
| **5** | `cleanText.replace(/\D/g,'')` then `/(\d{2,4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?/` | All-digits fallback `YYYYMMDDHHMMSS` / `YYMMDDHHMMSS`, accepted only if `1≤month≤12`, `1≤day≤31`, `0≤hour≤23` |
| **6** | `/^(\d{2}):(\d{2}):(\d{2})$/` | Time-only (anchored). Valid if `h≤23, m≤59`. **Today's local date is supplied** |

Helpers: `normalizeYear(y)` — 2-digit years: `n ≤ 50 → 20xx`, else `19xx`. Output is always `` `${year}-${month}-${day} ${hour}:${minute}:${second}` ``. Returns `null` when nothing matches.

`validateDateTime(s)` — `new Date(s.replace(' ','T'))` must be valid and `2000 ≤ year ≤ currentYear + 10`.

`getConfidenceLevel(c)`:
| Range | level | message | color |
|---|---|---|---|
| ≥ 0.8 | `high` | "High confidence - result looks good" | `#10b981` |
| ≥ 0.6 | `medium` | "Medium confidence - please verify" | `#f59e0b` |
| ≥ 0.4 | `low` | "Low confidence - manual correction likely needed" | `#ef4444` |
| < 0.4 | `fail` | "OCR failed - please enter manually" | `#dc2626` |
(`OCR_CONFIDENCE_THRESHOLDS` in `constants/index.ts` mirrors HIGH 0.8 / MEDIUM 0.6 / LOW 0.4 / FAIL 0.0.)

#### Date disambiguation (`date-disambiguation.ts`)
`needsDisambiguation(a, b)` → `false` if either > 12; otherwise `true` when both are 1–12.

`isValidDateInterpretation(month, day, year)` → month 1–12, day 1–31, day ≤ `[31,28,31,30,31,30,31,31,30,31,30,31][month]`, with February = 29 in leap years (`(y%4===0 && y%100!==0) || y%400===0`).

`daysBetween(a, b)` → `|floor((UTC(b) − UTC(a)) / 86 400 000)|` using `Date.UTC(y, m, d)` (midnight-normalized).

`disambiguateDateFormat(first, second, year, todayMs)` — `today` is `new Date(todayMs)` with `setHours(0,0,0,0)`. Cases in order:
| Case | Result |
|---|---|
| only `MM-DD` valid | `chosenFormat 'MM-DD'`, `confidence 'high'`, `reason 'only_mm_dd_valid'`, alt distance `999` |
| only `DD-MM` valid | `'DD-MM'`, `'high'`, `'only_dd_mm_valid'`, alt distance `999` |
| neither valid | `'MM-DD'` fallback, `'low'`, `'close_call'`, both distances `999` |
| both valid, same month & day | `'MM-DD'`, `'high'`, `'only_mm_dd_valid'`, alt distance `0` |
| both valid, `mmddDistance < ddmmDistance` | `'MM-DD'`; `confidence 'high'` + reason `'mm_dd_closer_by_7plus'` when `|Δ| ≥ 7`, else `'low'` + `'close_call'` |
| both valid, `ddmmDistance < mmddDistance` | mirror of the above with `'DD-MM'` / `'dd_mm_closer_by_7plus'` |
| equidistant | `'MM-DD'`, `'low'`, `'equidistant'` |

`CONFIDENCE_THRESHOLD_DAYS = 7`. Result shape: `{chosenDate, chosenFormat, alternativeDate, confidence: 'high'|'low', reason, chosenDistanceDays, alternativeDistanceDays}`.

`generateDisambiguationWarning(result)` produces `{title: 'Date Format Ambiguity Detected', description, suggestion: 'Please verify the displayed date matches the DVR screen. If incorrect, edit the date manually.'}` — the description names both interpretations by month name and, for non-equidistant cases, quotes both day distances.

**Known defect to preserve or fix deliberately:** proximity-to-today is **inverted against this feature's purpose** — it assumes the DVR clock is roughly correct, so the further a clock has actually drifted, the more eagerly the heuristic "corrects" the drift away. A DVR 119 days out was recorded as −207 minutes out. The ISO guard is the only thing keeping year-first input away from it.

**Web-demo notes:**
- `@react-native-ml-kit/text-recognition` → **Tesseract.js** (`tesseract.js` worker, `tessedit_char_whitelist: '0123456789:/-. APM'` helps a lot) **or** a canned-data mode: ship 5–10 fixture strings (e.g. `"CH01 11-09 2024 Sat 16:38:39"`, `"12122025 11:42:40 AM"`, `"2024-1I-O9 I5:4l:35"`, `"11-09-202403-1005PM"`, `"05-21-2025 Vied 14;04:05"`) and let the user pick one.
- Tesseract has **no block-level confidence** shaped like ML Kit's; use `data.confidence / 100` and feed it into the identical `getConfidenceLevel` bands.
- `text-cleaning-pipeline.ts`, `timestamp-parser.ts`, `date-disambiguation.ts` are **pure TypeScript with zero React Native imports** — copy them verbatim into the web bundle (only `__DEV__` needs a shim, e.g. `const __DEV__ = false`). This is the single biggest fidelity win available.
- Caveat: the pipeline uses **lookbehind assertions** (`(?<![\/\-\d])`) — fine in modern Chrome/Firefox/Safari 16.4+, but a demo targeting older Safari needs a transpile or manual rewrite.

---

### 6.12 `ConfirmationScreen` (OCR review + offset calculation)

**File:** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/ocr-time-capture/components/ConfirmationScreen.tsx`

**Props:** `capturedImageUri`, `croppedImageUri`, `calibratedTimestamp` (ms), `syncResult`, `onComplete`, `onCancel`, `onRetryCapture`.

**Layout**
1. `FormSection "Captured Timestamp"` → `Card` containing the **cropped strip** `<Image source={{uri: croppedImageUri}}>`, `width = windowWidth − Layout.spacing.md*4`, `aspectRatio` initialized to **7** (a wide, short DVR strip) and then replaced by the image's real `width/height` on `onLoad`, capped at `maxHeight 200`, `resizeMode="contain"` (testID `cropped-image-preview`, a11y "Captured DVR timestamp"). On `onError` the image is replaced by italic red text **"Captured image unavailable — retry capture."** (testID `preview-unavailable`).
2. `DateDisambiguationWarning` — rendered only when `ocrResult.dateDisambiguation` exists, and it **self-suppresses when `confidence === 'high'`**. Bordered `Card` (2 px border, 4 px left border, `colors.warning`): circular `!` glyph + title **"Date Format Ambiguity Detected"**, description paragraph, italic suggestion box, then a two-column footer *Chosen Interpretation:* `Nov 7, 2026 (MM-DD)` / *Alternative:* `Jul 11, 2026` (dates formatted `MMM D, YYYY`).
3. `FormSection "OCR Detection Result"`:
   - `Card` with label **"Detected Text:"** and the raw OCR text in a **monospace** 18 px block (only when `ocrResult.rawText` is non-empty).
   - `DateTimePickerInput label="DVR Date/Time"` `mode="datetime"` (testID `dvr-datetime-confirm-input`). Editing it sets `manualEdit = true`, which **permanently stops OCR from overwriting the value**.
   - Italic caption **"Manually edited"** once `manualEdit` is true.
   - Info row (`backgroundTertiary`): label **"Actual Time (Recorded):"** with `toStorageFormat(new Date(calibratedTimestamp))` displayed with the ISO `T` swapped for a space (the stored value keeps the `T`).
4. `FormActions`: **Retry Capture** (`variant="outline"`, testID `retry-capture-button`) and **Confirm & Calculate** (testID `confirm-button`, `disabled` until `dvrDateTime` is set).

**OCR execution:** `useDebouncedOCR(croppedImageUri, { debounceMs: PREPROCESSING_CONFIG.OCR_DEBOUNCE_MS = 150, calibratedTimeMs: calibratedTimestamp })`. The hook debounces on `imageUri` change, uses a monotonic `requestIdRef` so only the newest request writes state, and holds `calibratedTimeMs` in a ref so changing it never reschedules an in-flight run. `runOCR(uri)` triggers manually; `reset()` clears and invalidates.

**Effects / toasts**
- OCR success + `validateDateTime(parsedDateTime)` → `new Date(parsed.replace(' ','T'))` into `dvrDateTime` **only if `!manualEdit`**; toast `success` (high confidence) or `info`: `"Timestamp detected" / "Review the result below."`.
- OCR ran but nothing parsed → info toast `"Manual entry required" / "Could not detect timestamp. Please enter DVR time manually."`.
- Hook error → error toast `"OCR failed" / "Could not process image. Please enter DVR time manually."`.

**Confirm handler**
- No `dvrDateTime` → `Alert.alert('DVR Time Required', 'Please enter the DVR timestamp before continuing.')`.
- Else format the picker date locally as `YYYY-MM-DD HH:MM:SS`, run `calculateTimeDifference(dvrStr, actualStr)` (`@/lib/utils/bidirectional-time`), and emit:
```ts
OcrCaptureResult = {
  dvrTime, actualTime, formattedDifference, timeDifferenceData,
  capturedImageUri, croppedImageUri,
  confidence, rawText, cleanedText, parsedDateTime,
  calibratedTimestamp, syncResult
}
```
- A throw from the calculation → `Alert.alert('Calculation Error', <message>)`.

**Web-demo notes:** all DOM except OCR itself. `DateTimePickerInput` → `<input type="datetime-local">` (note: it has no seconds by default — add `step="1"`). Toasts → any toast lib. `Alert.alert` → a modal confirm.

---

### 6.13 Location — GPS capture UI

**Files:**
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/location/components/GpsCaptureControl.tsx`
- `/Users/…/src/features/location/components/CoordinateDisplay.tsx`
- `/Users/…/src/features/location/hooks/useGpsCapture.ts`
- `/Users/…/src/features/location/services/gps-service.ts`
- `/Users/…/src/features/location/lib/accuracy-rating.ts`
- `/Users/…/src/features/location/constants/index.ts`

**`GpsCaptureControl`** — a row of: a flex-1 glass `LinearGradient` button (`minHeight 60`, r=10, hairline border) and a compact toggle to its right.
- Idle: `Ionicons "locate-outline"` 18 px in `colors.primary` + the `label` prop, up to 2 lines centered. `LocationForm` passes **"Use Current Location"**; `IncidentLocationForm` passes **"Use Current Location (Highest Accuracy)"** plus `accuracyOverride='precise'`.
- Busy: small `ActivityIndicator` + a single truncated line — **"Capturing…"** while `isCapturing`, **"Looking up address…"** while the parent is reverse-geocoding. Fixed min height, so the button never resizes between states.
- Toggle: uppercase 11 px label **"Geocode"** above a `<Switch>` (a11y "Reverse-geocode captured coordinates into an address", testIDs `${testID}-geocode-toggle` / `-geocode-switch`). Value comes from `useReverseGeocodePreference('incident' | 'location')`, which is settings-backed and remembers each context separately.
- Errors render inline below the row in `colors.error` (testID `${testID}-gps-error`).
- a11y: `accessibilityState={{disabled, busy}}`, hint "Captures your current GPS location". Light haptic on press.

**Capture state machine (`useGpsCapture`)** — states are `{ location, isCapturing, error }`; `capture(override?)` resolves `{ location, error }` so callers read the result directly rather than stale state.
```
idle ──capture()──► checking-permission ──granted──► capturing ──► success (location set)
                          │                              │
                          └─ denied → error PERMISSION_DENIED   └─ throw → error TIMEOUT | LOCATION_UNAVAILABLE | INVALID_COORDINATES | UNKNOWN
cancel() / unmount → abortRef = true, every await re-checks and discards the result
```
Concurrent `capture()` calls short-circuit (`{location:null, error:null}`). `reset()` clears location + error.

**Multi-sample capture (`captureLocation`)**
- Config: `maxAttempts 10`, `retryDelay 500 ms`; `targetAccuracy` from settings — `quick 100 m` / `balanced 50 m` / `precise 10 m`; `timeout = settings.gpsTimeout × 1000`.
- Forced override `PRECISE_GPS_CONFIG`: `targetAccuracy 10 m`, `maxAttempts 10`, `timeout 120 000 ms`, `retryDelay 500 ms`. `GpsAccuracyOverride` is the single-literal union `'precise'` — `'balanced'`/`'quick'` are compile errors.
- Loop: `getCurrentPositionAsync({accuracy: BestForNavigation, mayShowUserSettingsDialog: true})`, push sample, **break early** once `accuracy <= targetAccuracy`, else wait `retryDelay`. A failed sample increments attempts and continues while samples remain possible.
- Selects the **lowest** `accuracy` value across samples, validates `lat ∈ [−90,90]`, `lng ∈ [−180,180]`, returns `{latitude, longitude, accuracy, altitude?, timestamp: ISO-8601 UTC, source:'gps', sampleCount}`.
- Whole thing raced against the timeout; timer cleared on both paths. Throws a typed `GpsError`, never a raw `Error`.

**`getProximityCoordinate()`** — non-forensic bias read only: never requests permission; returns `null` if not granted; prefers `getLastKnownPositionAsync()` when younger than `PROXIMITY_CACHE_AGE_MS = 5 min`; else a `Accuracy.Lowest` read raced against `PROXIMITY_CAPTURE_TIMEOUT_MS = 5 s`; returns `null` on any failure, never throws. `useProximityCoordinate()` caches it in module memory for `PROXIMITY_CACHE_TTL_MS = 10 min` so every address field on a screen shares one read.

**`CoordinateDisplay`** — themed card (r=lg, 1 px border, theme-aware shadow), `Pressable` with **long-press to copy**:
- Row 1: 📍 emoji + monospace `lat, lng` at **6 decimal places** (`COORDINATE_CONFIG.decimalPlaces = 6`, ≈ 0.11 m).
- Row 2 (only when accuracy or source exists): `±<round(accuracy)>m` in the rating color · `|` · source label (`GPS` / `Manual` / `Geocoded`) · `|` · rating label.
- `getAccuracyRating(m)`: **≤5 → "Excellent" (success)**, **≤10 → "Good" (success)**, **≤25 → "Fair" (warning)**, **>25 → "Poor" (error)**.
- Long-press → medium haptic → `Clipboard.setStringAsync("lat, lng")` → success toast **"Coordinates Copied"** with the value, or error toast **"Copy Failed" / "Unable to copy coordinates to clipboard"** plus `logError` (MDM-locked law-enforcement phones genuinely deny clipboard writes).

**`CameraGpsCapture`** (`/Users/…/src/features/location/camera-gps/components/CameraGpsCapture.tsx`) — a compact **44×44** glass crosshairs button rendered next to each camera row. Icon `locate-outline` (no coords yet) / `locate` (recapture); `ActivityIndicator` while capturing. Always forces `CAMERA_ACCURACY_OVERRIDE = 'precise'`. On success calls `mapGpsLocationToCameraData(location)` → `{latitude, longitude, coordinateAccuracy, coordinateSource, coordinateCapturedAt}` and emits `onCaptureComplete(cameraIndex, data)`. Renders `CoordinateDisplay` beside the button once coords exist; errors show below, indented past the button.

**Web-demo notes:**
- `expo-location` → `navigator.geolocation.getCurrentPosition(cb, err, {enableHighAccuracy: true, timeout, maximumAge: 0})`. The multi-sample loop maps directly: call it up to 10 times 500 ms apart, keep the lowest `coords.accuracy`, break early at the target. Browsers do report `accuracy` in metres, so the Excellent/Good/Fair/Poor bands work unchanged.
- Permission → `navigator.permissions.query({name:'geolocation'})` for a `granted|prompt|denied` read; `PERMISSION_DENIED` maps to `GeolocationPositionError.PERMISSION_DENIED` (code 1), `TIMEOUT` to code 3, `LOCATION_UNAVAILABLE` to code 2.
- `getLastKnownPositionAsync` has **no** web equivalent — use `maximumAge: 300000` on `getCurrentPosition` to approximate the 5-minute cache.
- `expo-clipboard` → `navigator.clipboard.writeText()` (requires a secure context; the failure toast path is genuinely reachable).
- `expo-haptics` → `navigator.vibrate` or drop. `expo-linear-gradient` → CSS `linear-gradient`.

---

### 6.14 Location — Mapbox address autocomplete

**Files:** `/Users/…/src/features/location/components/AddressAutocomplete.tsx`, `…/AutocompleteSuggestionList.tsx`, `/Users/…/src/features/location/hooks/useGeocodingSearch.ts`, `/Users/…/src/features/location/services/mapbox-service.ts`

**`AddressAutocomplete`** — relative-positioned container with `zIndex 100`.
- A standard `TextInput` (`label` default **"Street Address"**, placeholder **"Start typing an address..."**, `required` optional, testID `${testID}-input`, a11y hint "Type to search for addresses").
- While a `retrieve()` is in flight: an absolutely-positioned overlay at `right:12, top:50%` with a small spinner + **"Loading address details..."**, and the input becomes non-editable.
- Dropdown shown when `showDropdown && suggestions.length > 0 && !isRetrieving`.
- On selection: `retrieve(mapboxId, sessionToken)` → write the street address back into the field → `onAddressSelect(GeocodingResult)` → hide dropdown → `resetSession()`. A failure sets an inline error and calls `onError(message)`.

**`AutocompleteSuggestionList`** — a full-screen transparent backdrop (`zIndex 99`, tap to dismiss, testID `${testID}-backdrop`) plus an absolutely-positioned panel at `top: '100%'` (`zIndex 100`, r=8, 1 px border, shadow) whose `maxHeight = min(screenHeight × 0.3, 250)`. Inside a `ScrollView` (`keyboardShouldPersistTaps="handled"`, `nestedScrollEnabled`): an optional loading row (spinner + **"Searching..."**), then one row per suggestion — 15 px semibold `suggestion.name` over 13 px secondary `suggestion.fullAddress`, both 1 line, 12 px padding, hairline divider except on the last. Row a11y: ``Select address: ${fullAddress}``. Returns `null` when there are no suggestions and no loading.

**`useGeocodingSearch({proximity})`** — `search(query)` clears any pending timer, **no-ops below `MAPBOX_CONFIG.defaults.minQueryLength = 3`** (and clears suggestions), then debounces **300 ms** (`defaults.debounceMs`) before calling `suggest(query, sessionToken, {proximity})`. `sessionToken` is an `expo-crypto` `randomUUID()`; `resetSession()` mints a new one and clears suggestions. Proximity is reconstructed from stable scalar deps so object identity churn doesn't re-create the callback. Debounce timer cleared on unmount.

**Mapbox endpoints** (`MAPBOX_CONFIG`, plain `fetch` — no SDK):
| Purpose | URL |
|---|---|
| suggest | `https://api.mapbox.com/search/searchbox/v1/suggest` |
| retrieve | `https://api.mapbox.com/search/searchbox/v1/retrieve` |
| reverse | `https://api.mapbox.com/search/geocode/v6/reverse` |
| forward | `https://api.mapbox.com/search/searchbox/v1/forward` |
Defaults: `language 'en'`, `limit 5`, `types 'address,place'`. Rate limit: token-bucket **10 req/s**, `retryDelayMs 100`, applied to `suggest`/`retrieve`/`reverseGeocode` but deliberately **bypassed** by `forwardGeocode` (which uses a dedicated 8 s timeout and returns `null` on no match). The access token comes from `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` (falls back to `''` after one `__DEV__` warning) and is stripped from every logged URL by `sanitizeUrl()`.

**`LocationForm`** (`/Users/…/src/features/location/components/LocationForm.tsx`) — fields in order:
1. `Business/Location Name` (placeholder "Optional", uncontrolled `defaultValue` + `onEndEditing`).
2. `AddressAutocomplete` (`required`, proximity-biased).
3. `City` (`required`, placeholder "City name", `onEndEditing`).
4. `GpsCaptureControl` label "Use Current Location", **no** accuracy override (settings-driven).
5. `CoordinateDisplay`, only when both lat and lng are defined.

On GPS capture it writes `{latitude, longitude, coordinateAccuracy, coordinateSource:'gps'}` immediately, then reverse-geocodes into `{streetAddress, city}` **only when the Geocode toggle is on**; a failure logs to Sentry, fires `onReverseGeocodeError`, and leaves the coordinates intact. On autocomplete selection it writes street/city/lat/lng/accuracy with `coordinateSource:'geocoded'` (preserving `businessName`).

**`IncidentLocationForm`** (`/Users/…/src/features/location/components/IncidentLocationForm.tsx`) — the case-level variant, only mounted by `case-management`'s `NewCaseModal` / `EditIncidentLocationModal`:
- `Business / Scene Name` (per-keystroke `onChangeText`, not blur — avoids the submit-race), `AddressAutocomplete`, `City` (also per-keystroke).
- `GpsCaptureControl` with `accuracyOverride='precise'` and the "(Highest Accuracy)" label.
- **A manual latitude / longitude row** (two flex-1 fields, `keyboardType="numbers-and-punctuation"`, placeholders `e.g., 43.65` / `e.g., -79.38`, `onEndEditing` because controlled number inputs break decimal typing). Validation via `strictParseNumber`:
  - `/^[-+]?(\d+\.?\d*|\.\d+)$/` on the trimmed string — accepts `43`, `43.65`, `-79.38`, `.5`, `-.5`, `+12`; rejects `43.6abc`, `abc`, `1e`, `""`. `parseFloat("43.6abc") === 43.6` is exactly the truncation this exists to prevent.
  - Range: lat ∈ [−90, 90] else inline error **"Latitude must be between -90 and 90"**; lng ∈ [−180, 180] else **"Longitude must be between -180 and 180"**; a non-numeric string gives **"Enter a valid number"**. A rejected value **writes nothing**.
  - Clearing a field writes `undefined` for that coordinate and `coordinateSource: undefined`.
  - An accepted value writes `coordinateSource: 'manual'`, then reverse-geocodes on blur **only if** the toggle is on, both coordinates exist, and the pair changed since the last lookup (`lastGeocodedRef`). Overlapping requests are guarded by a monotonic `geocodeRequestRef`; a stale response is discarded so the address always matches the newest coordinates.
- External `errors.latitude/longitude` (parent, submit-time) win over the internal real-time errors.
- `CoordinateDisplay` at the bottom when both coordinates exist.

**Web-demo notes:**
- Mapbox Search Box / Geocoding v6 are plain **HTTPS REST** — they work from a browser with `fetch` unchanged, subject to the token's URL restrictions. Keep the 300 ms debounce, the 3-character minimum, and the one-session-token-per-`suggest`+`retrieve` pairing (that's what Mapbox bills on).
- If you'd rather not ship a token, stub `suggest`/`retrieve` with a canned array of `{mapboxId, name, fullAddress, coordinates}` — the whole UI is prop-driven.
- `expo-crypto randomUUID()` → `crypto.randomUUID()`.
- The dropdown's absolute `top:'100%'` + backdrop pattern ports directly to CSS.

---

### 6.15 Map View — `MapHost` and the case map

**Files:** all under `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/features/location/map-view/`.

**`MapHost`** (`components/MapHost.tsx`) — the only mountable entry point; owns five hooks and threads everything down.
```
MapHost (props: caseId, onChangeCaseRequest?, onEditCase?, onExportMap?, reloadToken?)
├─ CaseMapView (forwardRef → { flyTo })          components/CaseMapView.tsx
│   ├─ Mapbox.MapView + Mapbox.Camera
│   ├─ ShapeSource "locations" (clustered) → CircleLayer + ClusterBadge
│   ├─ ShapeSource "incident"  → IncidentMarker MarkerView(s)   components/IncidentMarker.tsx
│   ├─ CameraMarker MarkerViews (gated)                          components/CameraMarker.tsx
│   ├─ ProximityRing (INTERNAL child, never a sibling)           components/ProximityRing.tsx
│   └─ MapScaleBar                                               components/MapScaleBar.tsx
├─ MapControls (floating overlay)                                components/MapControls.tsx
├─ "Change Case" pill (only when onChangeCaseRequest is given)
├─ error overlay + Retry
└─ MapBottomSheet                                                components/MapBottomSheet.tsx
    ├─ SheetBackground / SheetHandle
    ├─ [list]   LocationList → LocationRow[] + "Export Map" footer
    └─ [detail] LocationDetailCard
```

**Hooks**
- `useMapData(caseId, filters)` → `{collection, filteredCollection, isLoading, error, refresh, cameraBounds, initialCenter}`. Fetches on mount / `caseId` change via `getMapLocations()` (the only SQLite touch, through the `case-management` barrel); `filteredCollection` is a `useMemo` over `applyFilters` — filter changes never re-hit SQLite. Camera-fit values are derived from a **camera-stripped** view so toggling cameras never re-fits.
- `useMapFilter()` → `{filters, setStatusFilter, setSearchText, clearFilters, activeFilterCount}`; the single owner of filter state; empty arrays / strings normalise to `undefined` and don't count.
- `useProximity(collection)` → `{isActive, center, radiusKm, result, activate, deactivate, setRadius, setCenter}`; `result` recomputed by `useMemo`; `deactivate()` preserves centre + radius.
- `useBottomSheet()` → `{sheetRef, contentMode, selectedLocationId, selectLocation, showList, handleSheetChange, resetForNewCase, currentIndex}`.
- `useCameraVisibility()` — internal, host-only, session-scoped, default off.

**Bottom-sheet state machine.** Snap points `[88, '40%', '65%']` indexed `PEEK(0) / PARTIAL(1) / FULL(2)`, `enableDynamicSizing={false}` so imperative `snapToIndex` lands deterministically.
```
List@PEEK ──selectLocation(id)──► Detail@PARTIAL ──drag up──► Detail@FULL
List@PARTIAL ─selectLocation(id)─► Detail@PARTIAL ──showList()──► List@PARTIAL
Detail@PARTIAL ──drag to PEEK──► List@PEEK (selection cleared)
resetForNewCase() → List@PEEK
```
`handleSheetChange` resets to list mode **only** when the sheet collapses to PEEK while in detail mode.

**`MapControls`** — three rows of floating glass pills over a transparent, `pointerEvents="box-none"` container with `paddingTop = safeAreaTop`:
1. Three status pills **Started / Working / Complete** (each a colored dot + label; active → border and 13 %-alpha fill in `PIN_COLORS[status]`; `accessibilityState.selected`), followed by a count pill reading `N locations` or `M of N locations` when a filter narrows it.
2. A stretched search pill (`TextInput` placeholder **"Search locations..."**, testID `map-search-input`, `returnKeyType="search"`, no autocapitalize/autocorrect) plus a **Clear** pill that becomes `Clear (N)` and highlights when `activeFilterCount > 0`.
3. A **Proximity** toggle pill (label flips to **"Proximity ON"**, accent `#00BFFF` when active) and, only while active, the radius presets **0.5 / 1 / 2 / 5 km** (`PROXIMITY_PRESETS`, default 1 km).
`isDark` and `safeAreaTop` are passed as props (the component is deliberately context-free).

**`CaseMapView`** — style `mapbox://styles/mapbox/satellite-streets-v12`, initial zoom 12, animation duration **2500 ms** (tuned high so satellite tiles finish streaming along the flight curve).
- Three memoized `FeatureCollection`s split by `properties.featureType`: `location` (clustered), `incident`, `camera`. Memoization is load-bearing — inline `.filter()` made Mapbox re-upload the GeoJSON across the bridge on **every camera frame**.
- Clustering: `clusterRadius 50`, `clusterMaxZoom 14`; cluster circle radius is a Mapbox step expression `16 → 22 (≥10) → 28 (≥50)`, navy `Colors.dark.background` at 0.65 opacity, no stroke, with a white halo'd `ClusterBadge` count on top. Location pins: `CIRCLE_LAYER_STYLE` radius 8, 2 px white stroke, 0.9 opacity, colored by `STATUS_COLOR_EXPRESSION` (`started #FF9500`, `working #00BFFF`, `complete #34C759`, fallback `#FFFFFF`).
- `IncidentMarker`: red `#e53935` teardrop `MarkerView` anchored `{x:0.5, y:1}` so the **tip** marks the coordinate and the body floats above a co-located cluster.
- `CameraMarker`: 30 px white circular base (`#ffffff`, border `rgba(13,27,42,0.55)`) with an 18 px near-black CCTV glyph, anchored `{x:0.5,y:0.5}`, plus a navy callout bubble showing name + resolution/±accuracy. Rendered **only** for `visibleCameraLocationId` (selected location **and** its cameras toggled on).
- Both marker sets run through `isPlottablePointFeature` (Point geometry, ≥2-element coordinate, string `id`) and log dropped features via `logError` in an effect (never during render).
- `flyTo(coords, {duration?, zoomLevel?, minZoom?, paddingTop?, paddingBottom?})` via `useImperativeHandle`: explicit `zoomLevel` wins; otherwise `minZoom` acts as a floor against `currentZoomRef` (updated every camera move); padding or zoom routes through `setCamera({animationMode:'flyTo'})`.
- Scale bar: zoom written to a ref every frame (no re-render); `setState` throttled to ~10/s (`SCALE_UPDATE_THROTTLE_MS = 100`) and flushed exactly on `onMapIdle`.
- **Never add `followUserLocation`** — it silently overrides imperative `flyTo` (rnmapbox #3704).

**Interactions**
| Gesture | Handler | Effect |
|---|---|---|
| tap a pin / row | `flyToAndSelect(id, coord)` | `flyTo` with `duration 2500`, `paddingBottom = 0.65 × screenHeight`, `paddingTop = insets.top + 170`, `minZoom 18` (house level), then `selectLocation(id)` → sheet to detail@PARTIAL |
| tap a cluster | `cluster-press-service` | `getClusterExpansionZoom` from the ShapeSource ref → nudged, clamped target zoom → camera move |
| long-press the map | `handleLongPress` | activates proximity at that coordinate, or re-centres an active ring |
| proximity toggle with no centre | `handleProximityToggle` | first plottable `location`/`incident` feature → else `getProximityCoordinate()` → else `FALLBACK_GLOBE_CENTER = [-100, 45]`. Guarded by an in-flight ref against double-tap |
| "Show cameras (N)" in the detail card | `handleToggleCameras` | flips the selected Location's entry in `useCameraVisibility` |
| "Go to Location" | `handleGoToLocation` | `switchToLocation(locationId, caseId)` then `router.navigate('/(form)/submission')` (**navigate, not push** — BUG-011); failure → toast "Failed to Load Location" |

**Empty-state camera centring:** once data has *definitively* loaded empty (`!isLoading && collection !== null && no non-camera features && !cameraBounds && !initialCenter`), a one-shot effect fires `getProximityCoordinate()` and flies from the North-America globe to `INITIAL_USER_LOCATION_ZOOM = 10`; a `null` GPS read silently leaves the globe.

**Fit paddings:** initial fit uses `paddingTop = insets.top + 180` (clears the controls overlay) and `paddingBottom = SHEET_SNAP_POINTS.peek (88) + 50`. `CAMERA_BOUNDS_PADDING` = `{top 20, right 40, bottom 40, left 40}`. `computeCameraBounds` needs ≥2 spread features; `computeSingleLocationCamera` centres one feature (or a tight cluster) at a capped `MAX_FIT_ZOOM = 14`.

**Sheet content**
- `SheetHandle` — accent glow strip, drag pill, then in list mode a two-line summary: `"N Locations"` (singular `"Location"`) over a badge row of non-zero status counts; in detail mode a single `"Location Details"` line. Declared once at module scope (`ConnectedSheetHandle`) reading its summary from a feature-local context so the sheet re-renders it in place instead of remounting (the peek-bar flicker fix).
- `LocationRow` — memoized glass row with a status dot, name, optional business name, address, chevron; incident variant additionally shows a type chip and a coordinate line.
- `LocationList` — `BottomSheetFlatList` with a stable `keyExtractor` and `useCallback` `renderItem`, plus an **"Export Map"** footer (a11y "Export case map") when `onExportMap` is provided.
- `LocationDetailCard` — **"‹ All Locations"** back button; name row + status badge (incident variant: name + type chip); address card (📍 + business name / address / city, tap-to-copy coordinates row with a source chip, testIDs `detail-coordinates`, `detail-coordinates-text`, `detail-coordinates-source`); a **"Show cameras (N)" / "Hide cameras (N)"** toggle (`videocam-outline` / `videocam`, `accessibilityState.expanded`) rendered only when `cameraCount > 0`; a **Requested Scope** card of scope rows (range, kind chip, span label from `compute-span-label` e.g. `"2h 30m"`); optional **Requester** and **Contact** cards; and a gradient CTA — **"Go to Location"** for locations, **"Edit Incident Location"** for the incident variant.
- Coordinates are formatted to 6 dp by `utils/format-coordinates.ts` (finite-guarded) and copied by `utils/copy-coordinates.ts` (refuses non-finite, toasts on success/failure).

**Coordinate-order trap:** GeoJSON is `[longitude, latitude]` everywhere in this sub-feature, but `formatCoordinates(lat, lng)` takes **latitude first**. Passing a raw `[lng, lat]` tuple flips both the display and the flown-to point.

**Web-demo notes:**
- `@rnmapbox/maps` → **Mapbox GL JS** (`mapbox-gl`), which is a near 1:1 port: same style URL, same `ShapeSource`→`map.addSource({type:'geojson', cluster:true, clusterRadius:50, clusterMaxZoom:14})`, same `CircleLayer` paint with the identical `['match', ['get','status'], …]` and `['step', ['get','point_count'], 16, 10, 22, 50, 28]` expressions, same `flyTo({center, zoom, duration, padding})`, same `getClusterExpansionZoom`. MarkerViews → `new mapboxgl.Marker(customHTMLElement)`.
- Alternative without a token: **MapLibre GL JS** + a free raster/vector style; the expressions are compatible.
- `@gorhom/bottom-sheet` → a CSS-transform sheet driven by pointer events, or a library like `vaul`; keep the three detents 88 px / 40 vh / 65 vh and the same PEEK/PARTIAL/FULL transitions.
- Turf.js (`@turf/distance`, `@turf/circle`, `@turf/bbox`, `@turf/centroid`) runs **unchanged in the browser** — same packages, same imports.
- `expo-clipboard` → `navigator.clipboard`; `expo-haptics` → `navigator.vibrate`; `react-native-safe-area-context` → `env(safe-area-inset-top)`.
- SQLite → the GeoJSON `FeatureCollection` is the only thing the map layer actually consumes, so a static `.geojson` fixture (with `properties.featureType ∈ {location, incident, camera}`, `status`, `id`, `caseId`, `locationId`, `cameraName`, `resolution`, `coordinateAccuracy`) reproduces the full map experience with zero backend.

---

### 6.16 Native-dependency → web-substitute summary

| Native module | Used by | Web substitute |
|---|---|---|
| `react-native-vision-camera` | VisionCameraScreen | `getUserMedia` + `<video>` + `canvas.toBlob` + `MediaRecorder` |
| `expo-camera` (`CameraView`) | OCR CameraScreen | same `getUserMedia` + `<video>` |
| `@react-native-ml-kit/text-recognition` | ocr-service | **Tesseract.js**, or canned fixture strings |
| `expo-image-manipulator` | OCR image-processor | canvas 2D `drawImage(sx,sy,sw,sh)` + `toBlob('image/png')` |
| `@siteed/expo-audio-studio` | useAudioCapture | `MediaRecorder` + Web Audio `AnalyserNode` for amplitude |
| `expo-audio` | AudioPreview, MediaPreview | `<audio>` element + `timeupdate` |
| `expo-video` | VideoPreview, MediaPreview(Fullscreen) | `<video controls>` |
| `expo-file-system/legacy` | all three temp-file managers | `URL.createObjectURL` / `revokeObjectURL`, IndexedDB blobs |
| `expo-location` | gps-service | `navigator.geolocation` + `navigator.permissions` |
| `@rnmapbox/maps` | CaseMapView | **Mapbox GL JS** (or MapLibre GL JS) |
| `@gorhom/bottom-sheet` | MapBottomSheet | CSS-transform sheet / `vaul` |
| `expo-sqlite` (via case-management) | media-library, map-data-service | IndexedDB, or static JSON/GeoJSON fixtures |
| `expo-haptics` | capture buttons, delete, copy | `navigator.vibrate()` or omit |
| `expo-clipboard` | CoordinateDisplay, copy-coordinates | `navigator.clipboard.writeText` |
| `react-native-volume-manager` | useVolumeShutter | none — bind Space, or drop |
| `react-native-reanimated` | spectrum, level meter, record button | `requestAnimationFrame` + CSS transforms |
| `expo-linear-gradient` | all glass surfaces | CSS `linear-gradient` |
| `@turf/*` | proximity-service | **same packages, unchanged** |
| `@expo/vector-icons` (Ionicons) | everywhere | any icon font / inline SVG (`ionicons` npm package ships SVGs) |

**Zero-native modules (port verbatim):** `MetadataForm.tsx`, `shared/utils/format.ts`, `text-cleaning-pipeline.ts`, `timestamp-parser.ts`, `date-disambiguation.ts`, `accuracy-rating.ts`, `media-library/utils.ts`, `map-view/services/*` (except the one SQLite call in `map-data-service`), `map-view/utils/*`, `location/constants/index.ts`.


---

## 7. Cross-Cutting UI/UX, App Entry & Design System

Everything in this section is shared chrome that every other screen composes from. A web replica
that gets this layer right will look and feel like the app even before the screen logic matches.

---

### 7.1 App entry surfaces (before any tab renders)

Root layout: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/_layout.tsx`
Entry redirect: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/index.tsx` — `<Redirect href="/(tabs)/home" />`

**Module-scope init (runs at import, before React renders):**
1. `Sentry.init(...)` with a PII-scrubbing `beforeSend` (`src/lib/utils/sentry-sanitizer.ts`)
2. `Mapbox.setAccessToken(...)` (native SDK token)

**Startup sequence:**
1. `AuthenticatedSplashScreen` (biometric gate + splash video)
2. `initializeDatabase()` — SQLite schema/migrations (case-management)
3. `initializeDirectories()` — filesystem tree under `{DocumentDirectory}/cctv-app/`
4. `setAudioModeAsync({ playsInSilentMode: true })` — fire-and-forget, failure logged not fatal
5. `validateAndHydrateCaseContext()` — restores `currentCaseId` / `currentLocationId` from AsyncStorage and re-validates them against SQLite
6. Provider stack mounts

**Provider nesting (exact order):**
```
<GestureHandlerRootView>
  <ErrorBoundary>
    <SafeAreaProvider>
      <ThemeProvider>
        <KeyboardProvider>
          <AuthenticationProvider skipInitialAuth>
            <AppStateHandler />              {/* headless */}
            {__DEV__ && <DrizzleStudioDev />}
            <ThemedNavigationShell />        {/* theme-aware wrapper around the root <Stack> */}
            <Toast />                        {/* global toast host */}
```
`ThemedNavigationShell` exists to fix a corner-paint artifact (BUG-011) — it wraps the root `<Stack>`
with a nav background matching the active theme.

#### Splash / auth screens (feature: biometrics)

| Surface | File | Behavior |
|---|---|---|
| `AuthenticatedSplashScreen` | `src/features/biometrics/components/AuthenticatedSplashScreen.tsx` | Static door frame → biometric prompt (auto-trigger after 500 ms) → success → "doors-open" video (`expo-av`) → hold 500 ms → fade out 300 ms → app renders. Hardcodes `backgroundColor: '#000314'` to match the native launch screen. Falls through to the video on any error (auth failure never blocks app access). |
| `LockScreen` | `src/features/biometrics/components/LockScreen.tsx` | Full-screen **overlay** (children stay mounted at `opacity: 0`, `pointerEvents="none"`, so nav state survives). `GridBackground` + `BiometricScannerHUD`. Auto-prompts after 300 ms. Guards: module-level `globalAuthLock` (`MIN_AUTH_INTERVAL_MS` 1000 ms), a 2000 ms cooldown, and an `isPromptActive` flag. Lifecycle: `scanning → authorized → unmount`. |
| `BiometricsUnavailableScreen` | `src/features/biometrics/components/BiometricsUnavailableScreen.tsx` | **Replaces** children (early return, not an overlay) when App Lock is on but hardware/enrollment is missing. Two buttons: "Open Device Settings" (`Linking.openSettings()`) and "Disable App Lock" (runs `authenticateWithFallback('settings_access')`, destructive confirm Alert on failure). Fail-closed by design. |
| `BiometricScannerHUD` | `src/components/layout/BiometricScannerHUD.tsx` | Animated Face ID / fingerprint HUD. States + copy + timings in `src/components/layout/scanner-hud-constants.ts` (`ScannerState`, `BiometricType`, `AUTHORIZED_DISPLAY_MS`). |

Re-lock: `AuthenticationProvider` listens to AppState and re-locks **only** on `background → active`
(`inactive` is deliberately ignored, because the Face ID system sheet itself produces
`active → inactive → active`).

**Web-demo notes:**
- Replace `expo-local-authentication` with a fake gate (a "Scan" button that resolves after ~1.2 s, or WebAuthn if you want real theatre). Keep the HUD state machine — it is a big part of the app's identity.
- The splash video can be an MP4/WebM or a CSS "doors open" animation; keep the 500 ms hold + 300 ms fade.
- The overlay-vs-replace distinction matters: a lock overlay must not unmount the app behind it.

---

### 7.2 Design tokens (exact values — copy these into the web theme)

Source files:
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/constants/Colors.ts`
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/constants/Layout.ts`
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/constants/Typography.ts`
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/constants/FormOptions.ts`
- `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/constants/Routes.ts`
- barrel `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/constants/index.ts` (also exports `TIMING_CONSTANTS`)

#### Colors — light

| Token | Value | | Token | Value |
|---|---|---|---|---|
| primary | `#1e3a8a` | | success | `#10b981` |
| primaryLight | `#3b82f6` | | successLight | `#d1fae5` |
| primaryDark | `#1e40af` | | successDark | `#059669` |
| background | `#ffffff` | | error | `#ef4444` |
| backgroundSecondary | `#f9fafb` | | errorLight | `#fee2e2` |
| backgroundTertiary | `#f3f4f6` | | errorDark | `#dc2626` |
| text | `#111827` | | warning | `#f59e0b` |
| textSecondary | `#6b7280` | | warningLight / warningBackground | `#fef3c7` |
| textTertiary | `#9ca3af` | | warningDark | `#d97706` |
| textInverse | `#ffffff` | | info | `#3b82f6` |
| border | `#e5e7eb` | | infoLight | `#dbeafe` |
| borderLight | `#f3f4f6` | | infoDark | `#2563eb` |
| borderDark | `#d1d5db` | | link / linkHover | `#3b82f6` / `#2563eb` |
| card / modal | `#ffffff` | | overlay / overlayLight | `rgba(0,0,0,0.5)` / `rgba(0,0,0,0.25)` |
| disabled | `#d1d5db` | | disabledText | `#9ca3af` |

#### Colors — dark (the app's signature look: navy, NOT black)

| Token | Value | | Token | Value |
|---|---|---|---|---|
| primary | `#2B8CC1` | | success | `#10d177` |
| primaryLight | `#4BA3D4` | | successLight / successDark | `#1a8754` / `#0faa5e` |
| primaryDark | `#1F6B99` | | error | `#ff4757` |
| background | `#0d1b2a` | | errorLight / errorDark | `#b72136` / `#ee2f44` |
| backgroundSecondary | `#132236` | | warning | `#ffd93d` |
| backgroundTertiary | `#1a2d44` | | warningLight / warningDark | `#b38f2f` / `#ffc62b` |
| text | `#f0f4f8` | | warningBackground | `#3d3020` |
| textSecondary | `#99badd` (Carolina Blue) | | info | `#99badd` |
| textTertiary | `#7a9fc4` | | infoLight / infoDark | `#2a4a6f` / `#7a9fc4` |
| textInverse | `#0d1b2a` | | link / linkHover | `#b8d4f0` / `#d0e4f7` |
| border | `#1e3a5f` | | card | `#132236` |
| borderLight | `#2a4a6f` | | modal | `#1a2d44` |
| borderDark | `#152842` | | overlay / overlayLight | `rgba(13,27,42,0.9)` / `rgba(13,27,42,0.7)` |
| disabled | `#2a4a6f` | | disabledText | `#6b7f95` |

**Dark-only extended tokens** (absent from light — guard before reading):
`grid: rgba(153,186,221,0.08)`, `gridLight: rgba(153,186,221,0.15)`, `gridAccent: #1e3a5f`,
`accent: #ffd93d`, `accentLight: #ffe380`, `accentDark: #e6c235`,
`blueprint: #99badd`, `blueprintDim: rgba(153,186,221,0.3)`, `tech: #b8d4f0`, `techDim: rgba(184,212,240,0.3)`.

#### GlassColors — the faux-glassmorphism palette

`GlassColors[scheme][variant]`, variant ∈ `card | nestedCard | elevated | header`.
Each entry has `gradient` (2 stops, top→bottom), `border`, `highlightTop`, `innerShadow`.

**light**
| variant | gradient | border | highlightTop | innerShadow |
|---|---|---|---|---|
| card | `rgba(248,250,252,1)` → `rgba(241,245,249,1)` | `rgba(148,163,184,0.45)` | `rgba(148,163,184,0.45)` | `rgba(30,58,138,0.04)` |
| nestedCard | `rgba(241,245,249,0.85)` → `rgba(226,232,240,0.9)` | `rgba(148,163,184,0.35)` | same as border | `rgba(30,58,138,0.03)` |
| elevated | `rgba(255,255,255,1)` → `rgba(248,250,252,1)` | `rgba(100,116,139,0.35)` | same as border | `rgba(30,58,138,0.05)` |
| header | `rgba(255,255,255,0.98)` → `rgba(248,250,252,0.95)` | `rgba(148,163,184,0.4)` | same as border | `rgba(30,58,138,0.03)` |

**dark**
| variant | gradient | border | highlightTop | innerShadow |
|---|---|---|---|---|
| card | `rgba(19,34,54,0.85)` → `rgba(26,45,68,0.92)` | `rgba(30,58,95,0.5)` | `rgba(184,212,240,0.08)` | `rgba(0,0,0,0.2)` |
| nestedCard | `rgba(19,34,54,0.6)` → `rgba(26,45,68,0.7)` | `rgba(30,58,95,0.4)` | `rgba(184,212,240,0.06)` | `rgba(0,0,0,0.15)` |
| elevated | `rgba(26,45,68,0.88)` → `rgba(19,34,54,0.95)` | `rgba(43,140,193,0.25)` | `rgba(184,212,240,0.12)` | `rgba(0,0,0,0.25)` |
| header | `rgba(13,27,42,0.95)` → `rgba(19,34,54,0.98)` | `rgba(30,58,95,0.6)` | `rgba(153,186,221,0.1)` | `rgba(0,0,0,0.15)` |

**Primary button gradient** (`src/components/common/Button.tsx`, `PRIMARY_GRADIENT`):
dark `['#35A0D6', '#2580AD']`, light `['#2563eb', '#1d3584']`.

#### The glass recipe (three stacked layers — reproduce exactly)

```
outer View    → rounded corners, overflow:hidden, theme-aware drop shadow (heavier in light mode)
1px highlight → absolutely positioned top edge, color = glassStyle.highlightTop  (fake light reflection)
LinearGradient→ top→bottom glassStyle.gradient, 1px solid glassStyle.border, padding from Layout.spacing
```
CSS equivalent: `background: linear-gradient(180deg, <stop0>, <stop1>); border: 1px solid <border>;
border-radius: 12px; box-shadow: 0 6px 16px rgba(...)` plus a `::before` 1px top-edge line in `highlightTop`.
**No `backdrop-filter`** — the app deliberately avoids blur for performance on low-end Android. Match that
choice or the web version will look different (and heavier).

Used by: `Card` (`glass` prop), `FormSection` (`glass` prop), `Header` (`glass` prop), Button primary,
`GlassDot`, the wizard drawer.

#### Layout scale

`spacing`: xxs 2 · xs 4 · sm 8 · md 16 · lg 24 · xl 32 · xxl 48
`borderRadius`: none 0 · sm 4 · md 8 · lg 12 · xl 16 · full 9999
`touchTarget`: min 44 · medium 46 · comfortable 48 · large 56 (44 px = WCAG floor; honour it on web too)
`screenPadding`: horizontal 16, vertical 16
`iconSize`: xs 16 · sm 20 · md 24 · lg 32 · xl 40
`containerWidth`: sm 640 · md 768 · lg 1024 · xl 1280 (Tailwind-compatible — convenient for the web port)
`zIndex`: behind -1 · base 0 · dropdown 1000 · sticky 1020 · fixed 1030 · modalBackdrop 1040 · modal 1050 · popover 1060 · tooltip 1070
`headerPadding`: ios 50 / android 20 · `drawerHeaderPadding`: ios 60 / android 30
`drawer`: width 280, swipeEdgeWidth 50

#### Typography

Families: `regular/medium/semibold/bold` all map to the platform system font (SF Pro / Roboto) →
web equivalent: `-apple-system, "Segoe UI", Roboto, system-ui, sans-serif`.
`monospace` for technical data; **`scannerMono` = `ShareTechMono-Regular`** — used by the OCR scanner UI;
the web demo should load Share Tech Mono (Google Fonts) to match that surface.

fontSize: xs 12 · sm 14 · base 16 · lg 18 · xl 20 · 2xl 24 · 3xl 30 · 4xl 36
lineHeight: tight 1.25 · normal 1.5 · relaxed 1.75
fontWeight: `'400' | '500' | '600' | '700'`
letterSpacing: tight −0.5 · normal 0 · wide 0.5

#### Blueprint grid + scan line

`GridBackground` (`src/components/layout/GridBackground.tsx`) draws an SVG grid pattern (Carolina blue in
dark, navy in light) plus an optional Reanimated **scan line** that sweeps vertically. `Screen` renders it
by default (`showGrid`, `gridOpacity: 'subtle'|'normal'|'strong'`, `showScanLine` default true;
`FormLayout` turns the scan line off). Web equivalent: a repeating-linear-gradient background + a
CSS-animated 1–2 px translucent bar. This plus the navy palette *is* the "command center" aesthetic.

#### Picker option catalogs (verbatim — the demo's dropdowns must match)

- `EXPORT_MEDIA_OPTIONS`: USB Drive · External Hard Drive · DVD · Cloud Upload · Network Transfer · Other
- `FILE_TYPE_OPTIONS`: MP4 · AVI · MOV · MKV · Proprietary · Other
- `MEDIA_PROVIDED_OPTIONS`: Hand Delivered · Mailed · Left with Contact · Electronic Transfer · Other
- `RESOLUTION_OPTIONS`: 352x240 (CIF) · 704x480 (4CIF) · 960x480 (960H) · 1280x720 (720p) · 1920x1080 (1080p) · 2560x1440 (1440p) · 3840x2160 (4K) · Other (Custom)
- `FPS_OPTIONS`: 1 · 5 · 10 · 15 · 20 · 25 · 30 · Other (Custom)
- Helpers `isCustomResolution(v)` / `isCustomFps(v)`: true when `v` is neither the `'custom'` sentinel nor a member of the standard list → the UI then reveals a free-text input.

#### TIMING_CONSTANTS (time-sync UI thresholds)

`SYNCHRONIZED_THRESHOLD_MS = 10` (device considered synchronized at ≤10 ms offset) ·
`MIN_UNCERTAINTY_MS = 1` · `MIN_NTP_UNCERTAINTY_MS = 1` · `NTP_DEFAULT_UNCERTAINTY_MS = 50` ·
`AUTO_COLLAPSE_DELAY_MS = 10000` (SyncStatusCard collapses 10 s after a successful sync).

---

### 7.3 Shared component library

Root: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/components/`
(full catalog in `src/components/README.md`). **No top-level barrel** — every import is a direct path.
Components are presentational (props in / callbacks out) and never import the Zustand store; the only
wired exceptions are `AppStateHandler` and `CustomDrawerContent`.

#### `layout/`

| Component | File | Key props / behavior |
|---|---|---|
| `Screen` | `src/components/layout/Screen.tsx` | Root wrapper: safe area, `KeyboardAwareScrollView`, grid background. Props `scrollable`(t) `padding`(t) `safeArea`(t) `excludeBottomSafeArea` `keyboardAware`(t) `showGrid`(t) `gridOpacity`('subtle') `showScanLine`(t) + 4 scroll handlers. Keyboard-aware scroll gated on `useIsFocused()` (all wizard screens stay mounted). |
| `FormLayout` | `src/components/layout/FormLayout.tsx` | `Header`(glass) + `Screen` for wizard steps. Props `title`, `showExit`, `onBack`, `onExit`, `glassHeader`, `keyboardAware`. Scan line off by default. |
| `Header` | `src/components/layout/Header.tsx` | Glass/solid header with back / exit / menu. Menu opens the drawer via `DrawerActions.openDrawer()`. |
| `MainHeader` | `src/components/layout/MainHeader.tsx` | Tab dashboard header: title + new-case button (hidden if `onNewCasePress` omitted) + settings button. |
| `GridBackground` | `src/components/layout/GridBackground.tsx` | SVG grid + Reanimated scan line; unique pattern id per instance via `useId()`. |
| `CustomDrawerContent` | `src/components/layout/CustomDrawerContent.tsx` | Wizard drawer: visibility-filtered step list, per-step `GlassDot` completion indicator, media accordion, app version from `expo-constants`. Reads `useVisibleSteps` + `useSectionCompletion`. |
| `BiometricScannerHUD` | `src/components/layout/BiometricScannerHUD.tsx` | Scanner HUD (see 7.1). |
| `drawer-items.ts` | `src/components/layout/drawer-items.ts` | Pure config, store-free. See table below. |

**`DRAWER_ITEMS` — exact drawer list, order, labels and Ionicons names** (CI-guarded to match `WIZARD_STEPS`):

| # | route name | label | icon |
|---|---|---|---|
| 1 | `submission` | Submission Details | `document-text` |
| 2 | `requested-scope` | Requested Scope | `list` |
| 3 | `arrival-departure` | Arrival/Departure | `time` |
| 4 | `time-offset` | Time Offset | `sync` |
| 5 | `extracted-video-scope` | Extracted Video Scope | `film` |
| 6 | `dvr-information` | DVR Information | `videocam` |
| 7 | `cameras` | Cameras | `camera` |
| 8 | `export-information` | Export Information | `download` |
| 9 | `notes` | Notes | `pencil` |
| 10 | `completion` | Completion | `checkmark-circle` |

`ROUTE_TO_SECTION` maps each route name to its `SectionKey` (identity mapping). `ocr-capture`,
`media-capture` and `audio-recording` are **not** drawer steps — OCR launches from Time Offset; media/audio
are additive tools reached from the drawer's media accordion.

#### `common/`

| Component | File | Notes |
|---|---|---|
| `Button` | `src/components/common/Button.tsx` | variants `primary/secondary/outline/ghost/danger`, sizes `small/medium/large`, `loading`, `fullWidth`. Primary = `PRIMARY_GRADIENT` overlay. **Spinner only appears after a 500 ms delay** (no flash on fast taps). Light haptic on press. |
| `Card` | `src/components/common/Card.tsx` | `padding`, `techGlow`, `glass`, `glassVariant`. |
| `GlassDot` | `src/components/common/GlassDot.tsx` | Convex gradient status dot: `partial` = gold, `complete` = emerald, with glow shadow + top highlight. Drives drawer completion state. |
| `TextInput` | `src/components/common/TextInput.tsx` | `label`, `error`, `required`, `helperText`; `forwardRef`; border color reflects focus/error. |
| `ScrollableTextInput` | `src/components/common/ScrollableTextInput.tsx` | Multiline; tap-to-edit, scroll without summoning the keyboard (ref-based gesture guard). Parent must set `keyboardAware={false}`. Used by the Notes screen. |
| `Picker` | `src/components/common/Picker.tsx` | Modal dropdown over `PickerItem[]`. **Tap target is `${testID}-selector`**, not `testID`. |
| `Switch` / `Checkbox` / `RadioGroup<T>` | `src/components/common/…` | Labeled toggle / checkbox / generic single-select (`T extends string \| boolean`). |

#### `form/`

| Component | File | Notes |
|---|---|---|
| `FormSection` | `src/components/form/FormSection.tsx` | Titled (optionally glass) group; `collapsible`, `defaultCollapsed`, `required`. **Returns `null` when it has zero children** — a section whose fields are all hidden by form-customization disappears entirely. |
| `FormActions` | `src/components/form/FormActions.tsx` | Button row: 16 px top margin, 12 px gap. |
| `ArrayFieldManager<T>` | `src/components/form/ArrayFieldManager.tsx` | Generic add/remove list: `items`, `onAdd`, `onRemove`, `renderItem`, `addButtonText`, `minItems`, `maxItems`. Stable keys by `id` or content hash. This is the shared engine behind scopes / arrival-departure / cameras. |
| `DateTimePickerInput` | `src/components/form/DateTimePicker.tsx` | `mode: 'date' \| 'time' \| 'datetime'`; calendar via `react-native-ui-datepicker` + HH:MM:SS wheel; `min/maximumDate`; formats with Luxon. |
| `TimePicker` | `src/components/form/TimeWheelPicker/TimePicker.tsx` | Modal HH:MM:SS wheel (`react-native-timer-picker`); preserves the date component of `initialValue`; `useTimePickerState` gives `{initialHours, initialMinutes, initialSeconds, toDate(duration)}` (`toDate` re-applies h/m/s onto the original date and strips ms). |

**Seconds precision matters** — this is a forensic app; the time wheel is HH:MM:**SS**, not HH:MM. A web
demo using `<input type="datetime-local">` must set `step="1"`.

#### `error/` and `export/`

| Component | File | Notes |
|---|---|---|
| `ErrorBoundary` | `src/components/error/ErrorBoundary.tsx` | Class boundary (the app's only class component). Logs via `logError()`; default `ErrorFallback` shows the stack in `__DEV__`. Props `fallback`, `onReset`, `onError`. Wraps the root layout, the drawer content, and **every** form route. |
| `ExportModal` | `src/components/export/ExportModal.tsx` | One `Modal` with three modes: `hidden` / `progress` / `validation`. Deliberately a single modal that swaps content — two RN modals transitioning simultaneously is a known RN bug. Props `stage`, `progress`, `validationResult`, `onContinueAnyway`, `onCancel`, `isExporting`. Exported via the `@/components/export` sub-barrel. |
| `ExportActionSheet` | `src/components/export/ExportActionSheet.tsx` | Slide-up sheet choosing location-vs-case ZIP (and the other export types). **Not** in the barrel — import by path. |

#### Headless / dev

| Component | File | Notes |
|---|---|---|
| `AppStateHandler` | `src/components/AppStateHandler.tsx` | Headless. On `→ background`: `saveFormToLocation(true)` (force save, mutex-protected) + `setSaveStatus`. On `→ active`: `cleanupOldAudioTempFiles()`. |
| `DrizzleStudioDev` | `src/components/dev/DrizzleStudioDev.tsx` | `__DEV__`-only SQLite browser bridge. |

**Web-demo notes (component library):**
- Build a 1:1 primitive kit first (Button/Card/TextInput/Picker/Switch/Checkbox/RadioGroup/FormSection/ArrayFieldManager/DateTimePicker). Every screen is a composition of these; matching them buys most of the visual parity.
- Reproduce three specific behaviors or the demo will feel "off": the 500 ms delayed button spinner, `FormSection` vanishing when empty, and `ArrayFieldManager`'s min/max clamping.
- Haptics (`expo-haptics`) have no web equivalent — drop silently (`navigator.vibrate` on Android Chrome at most).

---

### 7.4 Theme (light / dark)

`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/context/ThemeContext.tsx`

- Plain React context (not Zustand) — feature components may consume it directly; callback isolation does not apply.
- Seeds from the OS via `useColorScheme()`, then on mount overrides with the saved preference read from AsyncStorage key **`app-color-scheme`**.
- `setColorScheme(scheme)` / `toggleTheme()`: update React state immediately (smooth toggle) → `Appearance.setColorScheme(...)` to sync native chrome (status bar) → persist async, fire-and-forget.
- Hook returns `{ colorScheme, colors, isDark, toggleTheme, setColorScheme }`. Throws if used outside the provider.
- Settings exposes theme as light / dark / auto (Appearance category).

**Web-demo notes:** `prefers-color-scheme` for the seed, `localStorage['app-color-scheme']` for the override,
a `data-theme` attribute on `<html>` driving CSS custom properties. Dark is the app's "hero" look — screenshot/demo in dark.

---

### 7.5 Toasts

Host: `<Toast />` mounted last inside `AuthenticationProvider` in `app/_layout.tsx:261`
(library: `react-native-toast-message`; `Toast.show({ type, text1, text2 })`).

Confirmed call sites (representative of the toast vocabulary the demo should reproduce):
- `src/features/location/components/CoordinateDisplay.tsx` — copy coordinates success/failure
- `src/features/location/map-view/utils/copy-coordinates.ts` — copy lat/long, copy address
- `src/features/location/map-view/components/MapHost.tsx`, `LocationDetailCard.tsx` — map actions
- `src/features/ocr-time-capture/components/CameraScreen.tsx`, `ConfirmationScreen.tsx` — OCR capture/parse feedback
- `src/features/settings/export-security/hooks/useEncryptedExportPrompt.ts` — password/encryption feedback
- `src/features/settings/components/AboutSection.tsx`

Everything heavier (destructive confirmations, save-failure retry/discard, export results) uses the native
`Alert.alert` with explicit button arrays — **not** toasts. A web replica needs both affordances: a
transient toast stack and a blocking confirm dialog with `Cancel / Retry / Discard`-style options
(including a `destructive` style for delete/discard).

---

### 7.6 Save architecture & save-status UI (the single most important cross-cutting system)

**4 layers, all funneling through one mutex-protected service:**

| Layer | Trigger | File | Blocking? |
|---|---|---|---|
| 1 — screen blur | `useFocusEffect` cleanup when a wizard step loses focus | `src/hooks/useScreenSave.ts` | Non-blocking, silent failures |
| 2 — layout `beforeRemove` | Leaving the whole wizard | `app/(form)/_layout.tsx` (NavigationSaveWrapper) | **Blocking** — `e.preventDefault()`, then save; on failure an Alert with `Retry` / `Discard`(destructive) / `Cancel` |
| 3 — interval | Every 5 minutes | `src/hooks/useAutoSave.ts` | Non-blocking |
| 4 — background | App → background | `src/components/AppStateHandler.tsx` | Force save |

`useAutoSave` skip conditions (all logged in dev): no `currentLocationId`; `!hasPendingChanges()`;
`saveStatus === 'saving'`; saved within the last 30 s (`MIN_SAVE_INTERVAL_MS`).

**Mutex** — `src/lib/services/save-mutex.ts`. Real API is `formSaveMutex.acquire(async () => {...})`, a
**try-lock**: a save arriving while one is in flight returns `{ executed: false }` and is simply skipped
(the dirty flag keeps the data queued for the next trigger). There is no `withSaveMutex()` wrapper despite
older docs.

**Dirty tracking** — every `updateField` / `updateFieldSafe` / `batchUpdate` / `updateArrayItem` calls
`markDirty()`. `form-persistence.ts` calls `clearDirty()` after a successful SQLite write, which stamps
`lastSaveTimestamp` and flips `saveStatus` to `'success'`.

**Save status** — `src/hooks/useSaveStatus.ts`; reactive `useSaveStatus()` returns
`{ status: 'idle'|'saving'|'success'|'error', error, lastSaveTimestamp, isDirty, isSaving, isSuccess, isError }`.
Imperative `getSaveStatus()` / `setSaveStatus()` for services. **`success` auto-clears to `idle` after 2 s
(`SUCCESS_DISPLAY_DURATION_MS`); `error` persists until explicitly changed** (deliberate UX). Note: the
status pipeline is fully wired but currently has no dedicated always-on indicator component — a web demo
can (and probably should) surface it as a small "Saved ✓ / Saving… / Save failed" chip in the wizard header.

**Section completion** — `src/hooks/use-section-completion.ts` returns
`Record<SectionKey, 'empty'|'partial'|'complete'>` for the 10 drawer steps and drives the `GlassDot`s.
Rules: string fields count as filled when truthy **and** not whitespace-only; array sections require *every*
entry to have *every* counted field for `complete`; the Notes section is two-state only (`empty` |
`complete`, never `partial`). Values are first filtered through `visibleValues(visibility, pairs)` so a
field hidden by form-customization never counts (otherwise an always-hidden, always-empty field would pin
the dot at `partial` forever); pairs are `[FieldId | null, value]` with `null` marking always-counted
computed fields such as `timeDifference`. `serialModelNumber` and `mediaPlayerIncluded` are deliberately
excluded from the calculus. Uses `useShallow` — cuts drawer re-renders ~60 → ~10 during data entry.

**Web-demo notes:**
- Mirror all four layers against IndexedDB/localStorage: save on step change, on wizard exit (with a blocking confirm on failure), on a 5-minute interval, and on `visibilitychange`/`pagehide`.
- Implement the try-lock mutex — a naive await-queue changes behavior (the app *skips*, it does not queue).
- Reproduce the tri-state completion dots; they are the wizard's primary progress affordance.

---

### 7.7 Store contract a web replica must mirror

`src/lib/store/` — Zustand, **12 slices**, SQLite is the source of truth and Zustand is the working copy
for exactly **one Location** at a time.

| Slice | Owns | Limits |
|---|---|---|
| submission | occNumber, requester{Name,BadgeNumber,Unit,Phone,Email}, businessName/streetAddress/city/address, latitude/longitude/coordinate*, locationContact/locationPhone, incident* | `incident*` is case-level and written **only** by `pdf-export-service` |
| scope | `scopes[]` (+add/remove) | max 10, min 1 |
| arrival | `arrivalDepartures[]` (+add/remove) | max 20, min 1 (README/app README say 10 in places — code limit is 20) |
| time-offset | dvrDateTime, actualDateTime, timeDifference, timeOffsetData, dvrAppliesDST, OCR fields, timeSyncResult, lastSyncTimestamp | |
| dvr | dvrLocation, dvrTypeBrand, serialModelNumber, dvrUsername, dvrPassword, numberOfChannels, activeCameras, recordingSchedule, resolution, recordingFps, firstRecordedDate, totalDvrRetention, daysUntilOverwritten | |
| camera | `cameras[]` (+add/remove) | max 50, min 1 |
| extracted-scope | `extractedScopes[]` (+add/remove/update/setExtractedScopes) | starts empty; regenerated by subscription; `isActualTime` **always false** (DVR Time) |
| export | exportMedia, fileType, sizeGb, mediaPlayerIncluded, mediaProvidedVia | |
| completion | notesSections, notesFreeText, notes?, notesManuallyEdited?, dateTimeCompleted, completedBy | |
| error | errors (field-level), globalError | runtime only |
| case-management | currentCaseId, currentLocationId, isLoadingCase | mirrored to AsyncStorage `LAST_CASE_ID` / `LAST_LOCATION_ID`, re-validated against SQLite on hydrate |
| persistence | isDirty, lastSaveTimestamp, saveStatus, saveError | runtime only |

**Shared actions:** `updateField` (no validation) · `updateFieldSafe` (validates, sets field error, rethrows
`ValidationError`) · `batchUpdate` (rejects `undefined`, rolls the whole batch back on failure) ·
`updateArrayItem(arrayField, index, partial)` · `resetForm()` (fresh entry UUIDs) · `clearPersistedData()` ·
`recoverFromStorageError()`.

**Persist middleware** mirrors only a *partialized crash-recovery slice* to AsyncStorage under
`cctv-recovery-form`: `currentCaseId`, `currentLocationId`, `occNumber`, `address`, `_version`. Never the
whole form. `useHydration()` gates first render.

**Scope-recalculation subscription** (`src/lib/store/subscriptions/scope-recalculation.ts` +
`src/lib/store/actions/recalculate-corrected-times.ts`) — the app's central derived-data engine:
1. Fires when a scope input changes (`startDateTime` / `endDateTime` / `isActualTime`) or when
   `timeOffsetData` / `actualDateTime` / `dvrAppliesDST` change.
2. Compares a composite key of **input** fields only (outputs excluded → no infinite loop).
3. Defers to `queueMicrotask()` and guards with a module-level `isRecalculating` flag.
4. `recalculateCorrectedTimes(state)` is **pure** (no Zustand import) and returns
   `{ scopeUpdates, newExtractedScopes? }`, which the subscription applies via `updateArrayItem('scopes', …)`
   and `setExtractedScopes()`.
It builds on `src/lib/utils/bidirectional-time.ts` (`calculateCorrectedTimeRange`,
`calculateDSTAdjustedTimeRange`) and `src/lib/utils/extracted-scope-generator.ts` (`generateExtractedScopes`).

**Corruption recovery** — `src/lib/store/utils/recovery.ts`: type-validates every field, drops invalid array
entries, returns a `RecoveryReport` with `corruptionSeverity: 'none' | 'partial' | 'complete'`; complete
corruption resets the form and surfaces `formatRecoveryReport()` as a `globalError`.

**Validation posture (important for the demo):** the wizard performs **no per-screen validation** — step
navigation is deliberately free. The **only** runtime validation gate is `finalSubmissionSchema.safeParse()`
on the Completion screen (`src/lib/schemas/form-schema.ts`). Per-screen Zod schemas exist in that file as
building blocks but are not wired to any screen (`useFormValidation` and `sectionSchemas` were deleted in
pitfall sweep PF-09).

---

### 7.8 Navigation rules (BUG-011 — replicate the semantics, not the RN API)

The root stack must only ever hold `[(tabs)]` or `[(tabs), (form)]`.

| Transition | API used | Web analogue |
|---|---|---|
| Enter the wizard | `router.navigate('/(form)/submission')` (idempotent — reuses an existing wizard instance) | Route replace-or-focus, never a duplicate mount |
| Exit the wizard | `router.dismissTo('/(tabs)/cases')` — pops to the *existing* tabs instance so the wizard truly unmounts (timers, listeners and Zustand subscriptions die, and `beforeRemove` fires) | Unmount the wizard subtree; run the exit save |
| Tab ↔ tab | `router.navigate(...)` | plain route change |
| Step ↔ step inside the drawer | `router.push(ROUTES.FORM.*)` | plain route change |

A `push` across the tabs/form boundary leaks two fully-mounted navigators (with live auto-save intervals)
per open/exit cycle. On the web the equivalent bug is leaving the wizard's intervals/listeners running after
"exiting" it — kill them explicitly.

Wizard next/back is **not** a static map: `useWizardNav(stepId)` from `@/features/form-customization`
derives next/prev from the *visible* step set (`WIZARD_STEPS`), so hidden steps are skipped automatically.
Linear order:
```
SUBMISSION → REQUESTED_SCOPE → ARRIVAL_DEPARTURE → TIME_OFFSET → EXTRACTED_VIDEO_SCOPE →
DVR_INFORMATION → CAMERAS → EXPORT_INFORMATION → NOTES → COMPLETION
```
(`OCR_CAPTURE` launches from Time Offset; `MEDIA_CAPTURE` / `AUDIO_RECORDING` are additive drawer tools and
never next/back targets.)

Media routes validate their `returnTo` query param against an allowlist of the valid form route names before
navigating (parameter-injection guard), then reopen the drawer after a `DRAWER_OPEN_DELAY` of 300 ms.

**Tab/drawer navigator options:** tabs use `headerShown: false`, active/inactive tint from theme, and
`lazy: false` (pre-render all tabs). The drawer uses `headerShown: false`, `drawerPosition: 'right'`,
`swipeEnabled: true`, `swipeEdgeWidth: 50`, and `freezeOnBlur: true` on the three media screens.

---

### 7.9 Native-module inventory → web substitutes (master list)

| Native dep | Used by | Web substitute |
|---|---|---|
| `expo-sqlite` (SQLCipher) | all case/location/media persistence | IndexedDB (Dexie) or sql.js/wa-sqlite; keep the cases→locations→media hierarchy and the `form_data` JSON blob |
| `expo-file-system` | media files, ZIP staging, temp-file managers | OPFS / File System Access API, or in-memory Blobs |
| `expo-sharing` + share sheet | every export | `<a download>` or `navigator.share()` |
| `expo-print` | PDF generation from HTML | print-to-PDF via `window.print()` on the same HTML template, or pdf-lib/jsPDF |
| `react-native-vision-camera` | photo/video capture | `getUserMedia` + `MediaRecorder` |
| `expo-camera` | OCR capture, QR scan | `getUserMedia` |
| `@react-native-ml-kit/text-recognition` | DVR timestamp OCR | Tesseract.js, or canned OCR results for the demo |
| `@siteed/expo-audio-studio` / `expo-audio` | audio record + playback, waveform | `MediaRecorder` + Web Audio `AnalyserNode` + `<audio>` |
| `react-native-udp` | NTP time sync | impossible in a browser → HTTP time API or a simulated offset |
| `expo-location` | GPS multi-sample capture | `navigator.geolocation.watchPosition` (browser gives no multi-sample accuracy control — simulate) |
| `@rnmapbox/maps` | case map | Mapbox GL JS (same tiles/styles, same GeoJSON) |
| `expo-local-authentication` | app lock, protected export | WebAuthn or a simulated prompt |
| `expo-secure-store` | Supabase session, agency-cloud credentials | `localStorage` (demo-only) — call out the downgrade |
| `@react-native-async-storage/async-storage` | settings, form-customization, user profile, theme, crash-recovery slice | `localStorage` |
| `@supabase/supabase-js` + `netinfo` | cloud sync | supabase-js works on web as-is; `navigator.onLine` for connectivity |
| `expo-haptics` | inputs, buttons | drop |
| `@react-native-ai/apple` (Apple Foundation Models) | PDF import AI extraction | server-side LLM call or a canned extraction fixture |
| `react-native-reanimated` / `react-native-svg` | scan line, drawer accordion, grid, HUD | CSS animations + inline SVG |
| `@sentry/react-native` | crash reporting | Sentry browser SDK, or omit |

**Web-demo notes:**
- Everything court-admissible about this app is *time*: NTP-traceable sync, DVR-vs-real offset, DST handling, seconds precision. The demo can fake the transport (no UDP) but must not fake the math.
- SQLite is the source of truth and Zustand is a working copy — reproduce that split, or the auto-save/dirty-tracking behavior will not be replicable.

---

### 7.10 Pure utility logic the web demo must reimplement (no native deps — port directly)

All under `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/lib/utils/`.
These are plain TypeScript (Luxon + expo-crypto only) and are the **highest-value, lowest-cost port** —
they carry the app's domain intelligence and run unchanged in a browser.

| Module | Key exports | What it does |
|---|---|---|
| `bidirectional-time.ts` | `calculateTimeDifference`, `calculateCorrectedTimeRange`, `calculateDSTAdjustedTimeRange`, `isInDST`, type `TimeDifference` | DVR Time ↔ Real Time offset math and DST-aware scope correction. The heart of the app. **DST resolves against the system zone** — pin a zone (e.g. `America/Toronto`) in the demo rather than relying on the host TZ. |
| `extracted-scope-generator.ts` | `generateExtractedScopes` | Projects requested scopes into DVR-time extracted scopes (feeds the Extracted Video Scope screen). |
| `time-rounding.ts` | `roundDown5Minutes`, `roundUp5Minutes` (+ nearest) | 5-minute boundary rounding used when widening extracted-scope boundaries. |
| `retention-calculation.ts` | `calculateRetentionInfo`, `getRetentionStatus` | DVR retention-window math → status `CRITICAL` / `WARNING` / `SAFE` / `OVERWRITTEN`. Drives urgency colouring on DVR Information. |
| `datetime.ts` | `toStorageFormat`, `toDisplay`, format constants | Luxon wrappers; the canonical storage-vs-display format split. Port these constants verbatim or dates will round-trip differently. |
| `date-formatting.ts` | `formatDashboardDate` | Relative dashboard labels: `Today` / `Yesterday` / `Jan 15` / `Jan 15, 2023` (local time). Used on the Home timeline and case cards. |
| `address-formatting.ts` | `formatAddress`, `formatLocationLabel`, `abbreviateStreetTypes` | Structured-address composition and the Location display label. |
| `filename-utils.ts` | `sanitizeFilename`, `generateCaseDirectoryName`, `generateLocationDirectoryName` | Sandbox-safe, **immutable** directory names (renaming a case must not churn the filesystem). |
| `format.ts` | `formatDuration`, `formatFileSize` | Human-readable durations and byte sizes. |
| `navigation.ts` | `VALID_FORM_ROUTES`, `validateReturnTo` | The `returnTo` allowlist guard used by the media routes. |
| `errors.ts` | `BaseError` + `ValidationError`, `StateError`, `StorageError`, `TimeCalculationError`, `InvalidDateError`, `NetworkError`, `isValidationError`, `createTypedError` | Typed error taxonomy. |
| `error-handler.ts` | `logError(error, context)` | Project-wide logging standard; ships PII-stripped context to Sentry. |
| `sentry-sanitizer.ts` | `sanitizeSentryEvent`, `SENTRY_EXTRA_ALLOWLIST` | Runtime PII allowlist for crash reports. |
| `deep-freeze.ts` / `assert-never.ts` / `safe-haptics.ts` | `deepFreeze`, `assertNever`, `safeImpactAsync` | Immutable config, exhaustiveness guard, no-op-on-failure haptics. |

#### The persistence service contract (`src/lib/services/form-persistence.ts`)

The **single authorized** save/load interface — a web replica should mirror this API shape exactly:

```typescript
saveFormToLocation(force?: boolean, retryCount?: number): Promise<SaveResult>
loadLocationIntoForm(locationId: UUID): Promise<LoadResult>
switchToLocation(newLocationId: UUID, newCaseId?: UUID): Promise<boolean>
completeLocationWithSave(locationId: UUID): Promise<SaveResult>
hasPendingChanges() / isSaveInProgress() / waitForSaveCompletion()
mapZustandToLocationFormData() / mapLocationFormDataToZustand()   // keep symmetric
```

- **`SaveResult` has three outcomes:** `success`, `skipped` (precondition not met — *not* an error), `error`. The demo's save UI must distinguish "skipped" from "failed" or the status chip will lie.
- Save preconditions: no `currentLocationId` → skip; `!hasPendingChanges()` → skip; inside the `MIN_SAVE_INTERVAL_MS` debounce → skip. `force` bypasses all three.
- The write is **one UPDATE statement**, deliberately *not* transaction-wrapped (BUG-021: the old exclusive-transaction wrapper ran BEGIN/COMMIT on a separate unkeyed connection while the statement autocommitted on the main one). Serialization comes from the mutex, atomicity from the single statement.
- Retries **once** on `DatabaseLockError`, inside the same mutex hold.
- After a successful commit: `clearDirty()` → `onSaveComplete()` (fire-and-forget cloud sync) → the location auto-promotes `started → working` when the content gate is met (non-fatal if it fails).
- `switchToLocation` force-saves the current location, then loads the new one **first**, and only updates `setCurrentLocation` / `setCurrentCase` after a successful load — a failed load never strands the wrong context.
- `completeLocationWithSave` writes form data **and** `status = COMPLETE` in one UPDATE; `clearDirty()` runs only after both succeed.

**Web-demo notes:**
- Port `src/lib/utils/**` almost verbatim — it is already browser-compatible (swap `expo-crypto.randomUUID` for `crypto.randomUUID`). This is where the demo gets real fidelity cheaply.
- Bring Luxon along rather than reimplementing DST logic with `Date`.

---

### 7.11 Canonical data model (`src/types/form.types.ts`) — the demo's schema

Source of truth: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/src/types/form.types.ts`
(re-exported by `src/lib/store/types.ts` and `src/features/case-management/types/index.ts`).
`LocationFormData` is persisted to SQLite as a **JSON blob on the location row** — a web demo can store the
identical object in IndexedDB and lose nothing.

```typescript
interface ScopeEntry {                    // requested video time ranges
  id: string
  startDateTime: string                   // ISO 8601
  endDateTime: string                     // ISO 8601
  isActualTime: boolean                   // true = Real Time, false = DVR Time
  cameras: string                         // comma-separated camera names/numbers
  correctedStartDateTime?: string         // DVR → actual conversion  (derived)
  correctedEndDateTime?: string           //                          (derived)
  dstAdjustedStartDateTime?: string       //                          (derived)
  dstAdjustedEndDateTime?: string         //                          (derived)
  dstAdjustmentApplied?: number           // DST offset in HOURS      (derived)
}

interface ArrivalDepartureEntry { id: string; arrivalDateTime: string; departureDateTime: string }

interface TimeOffsetData {
  dvrDateTime: string; actualDateTime: string
  timeDifference: string                  // human-readable, e.g. "2:15:30"
  dvrAppliesDST: boolean
  // OCR audit trail
  capturedImageUri?: string; croppedImageUri?: string
  ocrConfidence?: number                  // 0–1 from ML Kit
  ocrRawText?: string; ocrCleanedText?: string
  ocrParsedDateTime?: string              // "YYYY-MM-DD HH:MM:SS"
  captureMethod?: 'manual' | 'ocr'
  // Time-sync audit trail
  timeSyncResult?: SyncResult | null; lastSyncTimestamp?: number | null
  // Computed offset (persisted for session consistency)
  differenceMs?: number
  direction?: 'AHEAD OF' | 'BEHIND'
  isDvrAhead?: boolean
}

interface DVRInformation {
  dvrLocation, dvrTypeBrand, serialModelNumber, dvrUsername, dvrPassword,
  numberOfChannels, activeCameras, recordingSchedule, resolution, recordingFps,
  firstRecordedDate, totalDvrRetention, daysUntilOverwritten            // all string
}

interface CameraEntry {
  id: string; cameraName: string; resolution: string; recordingFps: string
  latitude?: number; longitude?: number; coordinateAccuracy?: number    // metres
  coordinateSource?: 'gps'                // literal 'gps' — no manual/geocoded path
  coordinateCapturedAt?: string           // ISO 8601
}

interface ExportInformation {
  exportMedia: string; fileType: string; sizeGb: string
  mediaPlayerIncluded: boolean; mediaProvidedVia: string
}

interface CaseMetadata {                  // CASE-level, shared across locations
  oicName: string                         // Officer in Charge      (optional in practice)
  oicBadgeNumber: string                  // (optional)
  videoCoordinatorName: string            // Video/Canvas Coordinator (optional)
  videoCoordinatorBadgeNumber: string     // (optional)
  unit: string                            // MANDATORY
  completedBy?: string
}

interface LocationFormData {              // the SQLite JSON blob
  scopes: ScopeEntry[]
  extractedScopes?: ExtractedScope[]      // optional for back-compat
  arrivalDepartures: ArrivalDepartureEntry[]
  timeOffset: TimeOffsetData
  dvrInformation: DVRInformation
  cameras: CameraEntry[]
  exportInformation: ExportInformation
  notesSections?: NoteSection[]           // structured per-section notes (PRIMARY)
  notesFreeText?: string
  notes?: string                          // assembled string (derived / back-compat)
  notesManuallyEdited?: boolean
  notesGeneratedFromHash?: string | null  // hash of the data the notes were generated from
  dateTimeCompleted?: string
  completedBy?: string
}
```

Notes for the web port:
- `ScopeEntry.isActualTime` is the pivot for the whole time system: the operator enters a range in either
  DVR Time or Real Time, and the recalculation subscription fills the four `corrected*` / `dstAdjusted*`
  fields plus `dstAdjustmentApplied`. **Never** write those four by hand.
- `ExtractedScope.isActualTime` is **always false** — extracted scopes are DVR Time by definition.
- Notes carry three parallel representations (`notesSections` structured, `notesFreeText`, and the assembled
  `notes` string) plus `notesManuallyEdited` + `notesGeneratedFromHash` for regeneration gating. Model all
  five, or the "your notes are stale, regenerate?" behavior cannot be reproduced.
- `CaseMetadata.unit` is the only mandatory metadata field; OIC / Video Coordinator name+badge are optional.
- `Case` / `CaseMetadata` / `CreateCaseInput` field additions touch 5 layers in the app (type, SQLite column
  + mappers, cloud-sync schema + push/pull mappers, the `createMockCase` test factory, UI + PDF). A web demo
  has fewer layers, but the sync-schema layer is the one that silently drifts (BUG-005).

---

### 7.12 Shared export machinery (used by several screens — described once here)

Three different screens (Completion, Map tab, Cases tab) all reach the same export pipeline. The reusable
pieces:

| Piece | File | Role |
|---|---|---|
| `useExportFlow(caseId, locationId)` | `src/hooks/useExportFlow.ts` | Orchestrates validate → biometric gate → generate → zip → share. Exposes `exportStage: 'idle'|'validating'|'generating'|'zipping'|'sharing'`, `validationResult`, `showValidationModal`, `exportProgress {current,total}`, `currentLocationName`, `showExportSheet`, `isExporting`, plus `handleExportZip` (case), `handleExportLocationZip`, `handleExportLocationGeoJSON`, `handleExportCaseMap`, `handleValidationContinue/Cancel`, and the password-modal quartet (`showPasswordModal`, `defaultPasswordForModal`, `handlePasswordSubmit`, `handlePasswordCancel`). |
| `ExportActionSheet` | `src/components/export/ExportActionSheet.tsx` | Slide-up chooser (location ZIP vs case ZIP vs GeoJSON vs case map). |
| `ExportModal` | `src/components/export/ExportModal.tsx` | Single modal, three modes: `hidden` / `progress` (stage + N-of-M) / `validation` (invalid-location list + "Continue anyway" / "Cancel"). |
| `PasswordModal` | `src/features/settings/export-security/…` | AES password prompt, pre-filled with the saved default password. Consumers must render it — hooks only return its props. |
| `useProtectedExport` | `src/features/biometrics/hooks/useProtectedExport.ts` | Face ID / Touch ID gate. **Returns `null` for three different reasons** (auth cancel, auth failure, concurrent-call rejection) — callers can't distinguish; errors thrown by the export fn itself propagate instead. |
| `useCaseNotesExport` | `src/features/documentation/case-notes/hooks/` | Case Notes PDF preview + share (same encryption + biometric shape). |
| `useTimeOffsetExport` | `src/features/documentation/time-offset-report/hooks/useTimeOffsetExport.ts` | Time Offset Calibration PDF preview + share. |

**Case-level export flow:** press → `validateLocationsForPdf(caseId)` → if any invalid, show the validation
modal listing `{locationName, errors[]}` with Continue/Cancel → biometric gate → `exportAndShareCaseWithPdfs()`
with `onProgress` / `onStageChange` callbacks driving the progress modal → system share sheet → success alert
("Case exported successfully with X PDF(s)") → reset to idle.
**Location-level export flow:** same minus the validation stage.

**Ordering rule that matters:** encryption is resolved **before** the biometric gate
(`requestEncryption()` → if `cancelled`, abort with no prompt → then `executeProtectedExport()`).

**iOS one-modal rule:** iOS presents only one modal at a time, so a screen showing a WebView PDF preview must
**dismiss the preview first** and resume the share from the preview modal's `onDismiss`; Android shares
directly. Any web replica that stacks dialogs should still model this as an explicit "pending share" state,
because it changes the observable button behaviour.

#### Time Offset Calibration PDF (the app's most distinctive document)

`src/features/documentation/time-offset-report/` — a court-admissible PDF proving how the DVR clock was
compared against a calibrated reference. Preview: `TimeOffsetPreviewModal.tsx` (full-screen `WebView` over the
generated HTML). Template: `templates/time-offset-template.ts` + `time-offset-styles.ts` (grayscale with a
single muted-red accent).

- **Hard-gates on exactly four fields** (`timeDifference`, `occNumber`, `dvrDateTime`, `actualDateTime`); everything else degrades to a non-blocking warning so a field officer can still produce documentation from a partial capture.
- **Conditional sections** driven by what was actually captured:
  - *Device calibration*: NTP → full atomic-clock reference + the responding server's definition (keyed off `syncResult.server`, not the region the user picked); HTTP → short IPGeolocation fallback note; `FALLBACK` method / failed / absent sync → routed to the unverified **"Manual Time Entry"** section **even when `success` is true** (a device-clock fallback is never a real calibration).
  - *DVR Time Offset Process*: OCR capture embeds the cropped evidence image as base64 (placeholder if load fails); manual entry renders a plain "entered manually" box.
  - The **DST adjustment box** renders only when `dvrAppliesDST`; the "Applying the Time Offset" formulas are **suppressed when the DVR clock is CORRECT** (a ~0 offset makes the convert-by-offset math moot).
- The OCR evidence image is read from **SQLite** (`media_files`, `ImageCategory.DVR_CROPPED`) — never from the Zustand working copy.
- Filename: `"{OCC#}-{location label}-Time Offset Calibration.pdf"`, sanitized; shares the OCC# prefix and `formatLocationLabel` segment with the Case Notes filename so both documents in an export read identically except for the trailing type.
- All user input is escaped through `escapeHtml()` before entering the template (XSS-tested).

**Web-demo notes:**
- The HTML templates are already HTML — a web demo can render them **natively in an iframe** and use `window.print()` for the PDF, which is higher fidelity than any of the other ports.
- Keep the conditional-section logic; the "Manual Time Entry" downgrade for a FALLBACK sync is a forensic-integrity behavior, not cosmetics.
- Model the export state machine (`idle → validating → generating → zipping → sharing`) explicitly — the progress modal is a visible part of the app.

---

### 7.13 Documentation-vs-code drift found during this audit (trust the code)

The repo READMEs are unusually good but a few statements are stale. Verified against source on 2026-07-30:

| Claim in docs | Reality in code | Source of truth |
|---|---|---|
| "Three-tier hierarchy → tab navigation (Home, Cases, Map)" (`app/README.md`) | **Four tabs**: home, cases, map, **export** | `src/constants/Routes.ts` (`ROUTES.TABS` = HOME/CASES/MAP/EXPORT), `app/(tabs)/_layout.tsx` |
| `ROUTES.TABS` includes `SETTINGS` (`src/constants/README.md`) | No `SETTINGS` route — **settings is a modal**, not a tab | `src/constants/Routes.ts:12` (explicit comment) |
| "arrival-departure — site visit timestamps (1-10 entries)" (`app/README.md`) | **max 20**, min 1 | `src/lib/store/slices/arrival.slice.ts:28` (`if (arrivalDepartures.length >= 20)`) |
| Scopes / cameras limits | scopes **max 10** (`scope.slice.ts:27`), cameras **max 50** (`camera.slice.ts:26`) — these match the docs | — |
| `withSaveMutex()` wrapper (older docs) | Does not exist; the API is `formSaveMutex.acquire(fn)` (try-lock) | `src/lib/services/save-mutex.ts` |
| `useFormValidation` hook / `sectionSchemas` per-screen validation | **Removed** (pitfall sweep PF-09). The only runtime gate is `finalSubmissionSchema` on Completion | `src/hooks/README.md`, `src/lib/schemas/form-schema.ts:137` |
| `FORM_BACK_NAVIGATION` static back-nav map | **Retired**; next/back is derived from the visible step set via `useWizardNav` | `src/constants/Routes.ts:53-56` |

`finalSubmissionSchema` verbatim (`src/lib/schemas/form-schema.ts:137-149`) — the demo's only blocking validation:
```typescript
z.object({
  occNumber: z.string().min(1, "OCC number is required"),
  address:   z.string().min(1, "Address is required"),
  scopes: z.array(z.object({ startDateTime: z.string(), endDateTime: z.string() }))
    .refine(s => s.some(x => x.startDateTime && x.endDateTime),
      { message: "At least one extraction scope with start and end times is required" }),
})
```


---

---

## 8. Master surface table (one row per screen/surface — join key for the demo-site inventory)

All paths relative to `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/`.
**Logic deps** = the domain logic a web replica must implement. **Native** = what must be mocked/substituted.
`§` points at the detailed section above.

### 8.1 App entry

| # | Surface | File | Logic deps | Native | § |
|---|---|---|---|---|---|
| A1 | Authenticated splash (doors-open video + biometric gate) | `src/features/biometrics/components/AuthenticatedSplashScreen.tsx` | phase machine (auth→video→hold 500ms→fade 300ms) | local-auth, expo-av | 7.1 |
| A2 | Lock screen (background re-auth overlay) | `src/features/biometrics/components/LockScreen.tsx` | globalAuthLock, 2s cooldown, HUD state machine | local-auth | 7.1 |
| A3 | Biometrics-unavailable (fail-closed) | `src/features/biometrics/components/BiometricsUnavailableScreen.tsx` | replaces children; disable-app-lock w/ passcode fallback | local-auth, Linking | 7.1 |
| A4 | Root provider stack + DB/dir init | `app/_layout.tsx`, `app/index.tsx` | init order, case-context hydrate+validate | SQLite, FS, Sentry, Mapbox token | 7.1 |

### 8.2 Tabs & case management

| # | Surface | File | Logic deps | Native | § |
|---|---|---|---|---|---|
| T1 | Tab shell (4 tabs, `lazy:false`) | `app/(tabs)/_layout.tsx` | theme tints, Ionicons | — | 1 |
| T2 | **Home / Dashboard** (timeline, 5 recent cases) | `app/(tabs)/home.tsx` | `useCases({pageSize:5})`, `switchToLocation`, complete/archive/reopen case, focus-refresh | SQLite, haptics, toast, Reanimated | 1 |
| T3 | TimelineItem (glow marker + connectors) | `src/features/case-management/components/TimelineItem.tsx` | status→marker colour | Reanimated `FadeInLeft` stagger | 1 |
| T4 | DashboardCaseCard + LocationPill / MoreLocationsPill / CompactLocationItem | `src/features/case-management/components/DashboardCaseCard.tsx`, `LocationPill.tsx`, `CompactLocationItem.tsx` | status→colour maps, display-text precedence, `formatDashboardDate` | Reanimated spring expand, LinearGradient, haptics | 1 |
| T5 | CaseActionsSheet (long-press menu + read-only case report) | `src/features/case-management/components/CaseActionsSheet.tsx` | `actionsForStatus` (assertNever), `hasCapturedCoordinates`, measured-overflow scroll gate | pageSheet Modal | 1 |
| T6 | **Cases screen** (full CRUD) | `app/(tabs)/cases.tsx` | `useCases()`, create/delete/duplicate case+location, `generateCopyName`, `ensureUniqueLocationName`, store ctx, `onSaveComplete` | SQLite, haptics, toast | 1 |
| T7 | CaseList / SwipeableCaseCard / CaseCard / LocationItem / SwipeableLocationItem / SwipeDeleteAction | `src/features/case-management/components/CaseList.tsx` + 5 siblings | ref-based single-open swipe map, `PERFORMANCE_CONFIG`, `SWIPE_CONFIG`, memo comparators, swipe off while expanded | gesture-handler `ReanimatedSwipeable`, Reanimated, haptics | 1 |
| T8 | DeleteConfirmationModal (case vs location) | `src/features/case-management/components/DeleteConfirmationModal.tsx` | discriminated `type`, sync `isDeletePending` ref, clears store ctx before delete | Modal | 1 |
| T9 | DuplicateLocationModal (6-action chooser) | `src/features/case-management/components/DuplicateLocationModal.tsx` | `isLocationNameTaken`, `DuplicateMode` → duplicate / new-address / ZIP / GeoJSON | Modal | 1 |
| T10 | NewLocationModal (create + pre-populated new-address) | `src/features/case-management/components/NewLocationModal.tsx` | `LocationForm`, `formatAddress`, live dup-name check, `requireAddress` | expo-location, Mapbox geocode | 1 |
| T11 | **NewCaseModal** (create **and** edit) | `src/features/case-management/components/NewCaseModal.tsx` | `caseToIncidentValues`/`incidentValuesToFields`, `DuplicateCaseNumberError` banner, immutable case number, confirm-Alert on create | GPS + reverse geocode, Alert | 1 |
| T12 | **Map tab** (route level) | `app/(tabs)/map.tsx` | tab-local `mapViewerCaseId` + `lastViewedCaseId`, 3-state render rule, `useExportFlow` | Mapbox, local-auth | 1 |
| T13 | MapPicker (in-screen case picker) | `src/features/location/map-view/components/MapPicker.tsx` | own `useCases`, focus-refresh, error-before-empty, stale banner, preselect highlight | SQLite | 1 |
| T14 | EditIncidentLocationModal | `src/features/location/map-view/components/EditIncidentLocationModal.tsx` | incident-only field emission, seed-once, reload-token bump | GPS + reverse geocode | 1 |
| T15 | **Export tab** (selection → 3 pipelines) | `app/(tabs)/export.tsx` | `ExportSelection` + `armedFullCase`, prune-on-refresh, `isFullCaseSelection`, loud dispatch backstops | SQLite | 1 |
| T16 | ExportHub / ExportCaseCard / ExportLocationRow | `src/features/case-management/export-hub/components/*` | single-open accordion, tri-state checkbox, frozen `TEST_IDS`, artifact-line contract strings | haptics, Animated, LinearGradient | 1 |
| T17 | Export engine `useExportFlow` | `src/hooks/useExportFlow.ts` | stage machine idle→validating→generating→zipping→sharing; `resolvePasswordPolicy`; alert taxonomy | local-auth, secure-store | 1, 7.12 |
| T18 | ExportModal (progress + validation modes) | `src/components/export/ExportModal.tsx` | `STAGE_MESSAGES`, validation strings from `validateLocationForPdf` | Modal, AccessibilityInfo | 1, 7.12 |
| T19 | ExportActionSheet | `src/components/export/ExportActionSheet.tsx` | location-vs-case option list | Modal | 7.12 |
| T20 | PasswordModal (AES) | `src/features/settings/export-security/components/PasswordModal.tsx` | 8-char min, save-as-default on by default, non-blocking save failure | secure-store | 1, 4.7 |
| T21 | ZIP export services (case v2.1 / location v2.2 / subset v2.3 + GeoJSON) | `src/features/case-management/services/pdf-export-service.ts`, `encrypted-share.ts` | sequential PDFs, GeoJSON injection, manifest shapes, local-time naming, AES-256 floor, partial-filename marker | FS, zip-archive, sharing, print | 1 |
| T22 | **Case Map export** (self-contained HTML) | `src/features/case-management/case-map-export/` | `generateCaseGeoJSON` + `buildCaseMapMeta` → 3-token injection into one HTML file | FS, sharing, Mapbox public token | 1 |

### 8.3 Form wizard (drawer)

| # | Surface | File | Store slice / key fields | Validation | Derived logic | Native | § |
|---|---|---|---|---|---|---|---|
| W0 | Drawer chrome + NavigationSaveWrapper | `app/(form)/_layout.tsx`, `src/components/layout/CustomDrawerContent.tsx` | persistence (`isDirty`, `saveStatus`), `currentLocationId` | none | section-completion dots (visibility-filtered) | Reanimated, expo-constants | 2 |
| W1 | **Submission Details** | `app/(form)/submission.tsx` | submission: `occNumber`(read-only), `requester{Name,BadgeNumber,Unit,Phone,Email}`, `businessName/streetAddress/city`, `address`, `lat/lon/coordinateAccuracy/coordinateSource`, `locationContact/Phone` | relaxed only; `finalSubmissionSchema` needs `occNumber`+`address` | `address = formatAddress(...)` + street-type abbreviation | expo-location (10-sample), Mapbox suggest/retrieve/reverse | 2 |
| W2 | **Requested Scope** (1–10) | `app/(form)/requested-scope.tsx` | scope: `scopes[]{startDateTime,endDateTime,isActualTime,cameras,corrected*,dstAdjusted*}` | relaxed; final needs ≥1 complete scope | triggers the store recalculation subscription | — | 2 |
| W3 | **Arrival / Departure** (1–20) | `app/(form)/arrival-departure.tsx` | arrival: `arrivalDepartures[]{arrivalDateTime,departureDateTime}` | none | — | — | 2 |
| W4 | **Time Offset** ★core | `app/(form)/time-offset.tsx` | time-offset: `dvrDateTime,actualDateTime,timeDifference,timeOffsetData,dvrAppliesDST,captureMethod,timeSyncResult,lastSyncTimestamp` + `scopes`, `extractedScopes` | Toast/Alert guards only | offset, corrected ranges, DST ranges, extracted scopes, 4 DST advisories | react-native-udp (NTP), HTTP time API | 2 |
| W5 | **OCR Capture** (route layer) | `app/(form)/ocr-capture.tsx` | time-offset + `capturedImageUri,croppedImageUri,ocr*` | none at route | reuses corrected/DST math; forces `saveFormToLocation(true)` | expo-camera, ML Kit, SQLite, FS, UDP | 2, 6 |
| W6 | **DVR Information** | `app/(form)/dvr-information.tsx` | dvr: 13 string fields incl. credentials | relaxed `dvrSchema` (creds absent) | retention days, per-scope days-until-overwritten + status, min-across-scopes | — | 2 |
| W7 | **Cameras** (1–50) | `app/(form)/cameras.tsx` | camera: `cameras[]{cameraName,resolution,recordingFps,lat,lon,coordinateAccuracy,coordinateSource:'gps',coordinateCapturedAt}` | relaxed `cameraSchema` (coord bounds) | — | expo-location forced-precise | 2, 6 |
| W8 | **Extracted Video Scope** ★derived | `app/(form)/extracted-video-scope.tsx` | extracted-scope: `extractedScopes[]{id,startDateTime,endDateTime,cameras,isActualTime:false}` | none | whole array derived: effective-time selection → filter → 5-min outward rounding → new UUIDs | SQLite (auto-save) | 3 |
| W9 | **Export Information** | `app/(form)/export-information.tsx` | export: `exportMedia,fileType,sizeGb,mediaPlayerIncluded,mediaProvidedVia` | `exportSchema` exists but **never invoked** | — | SQLite (auto-save) | 3 |
| W10 | Media Capture (route layer) | `app/(form)/media-capture.tsx` | reads `currentCaseId`, `currentLocationId` | `validateReturnTo` allowlist (13 routes) | filename `{user}.{jpg\|mp4}`; type/category from `result.type` | SQLite `saveMedia`, FS temp cleanup, toast, drawer | 3, 6 |
| W11 | Audio Recording (route layer) | `app/(form)/audio-recording.tsx` | same two ids | same allowlist | filename `{user}.m4a`; metadata `{capturedAt,durationMs,caption,fileSize,mimeType}` | SQLite `saveMedia`, FS `deleteAudioTempFiles`, toast, drawer | 3, 6 |
| W12 | **Notes** ★generated | `app/(form)/notes.tsx` | completion: `notesSections[]`, `notesFreeText`; derived `notes`, `notesManuallyEdited` | `notesSchema` never invoked | 7 auto-generated sections + output-comparison reconcile + staleness | Share sheet (Copy all) | 3 |
| W13 | **Completion & Review** | `app/(form)/completion.tsx` | completion: `dateTimeCompleted`, `completedBy` + read-only summary | **`finalSubmissionSchema`** (only runtime gate) + stricter `validatePdfGeneration` | PDF HTML (11 sections), filename, notes reconcile | expo-print, sharing, WebView, SQLite, FS, Face ID, AES zip | 3 |
| W14 | Time Offset Calibration PDF preview | `src/features/documentation/time-offset-report/components/TimeOffsetPreviewModal.tsx` | 4-field hard gate; NTP/HTTP/manual + OCR/DST conditional sections; `escapeHtml` | WebView, print, sharing, SQLite (`DVR_CROPPED`) | | 7.12 |

### 8.4 Media, OCR, location features

| # | Surface | File | States / logic | Native → web substitute | § |
|---|---|---|---|---|---|
| M1 | MediaCaptureFlow (state machine) | `src/features/media/video-image-capture/components/MediaCaptureFlow.tsx` | capture → preview → metadata → save | vision-camera → `getUserMedia`+`MediaRecorder` | 6.1 |
| M2 | VisionCameraScreen (capture surface) | `.../components/VisionCameraScreen.tsx` | shutter, photo/video toggle, flash/torch, flip, zoom; `isActive={isFocused}` | vision-camera | 6.2 |
| M3 | PhotoPreview / VideoPreview | `.../components/PhotoPreview.tsx`, `VideoPreview.tsx` | accept/retake, playback | expo-video / `<video>` | 6.3 |
| M4 | Shared MetadataForm | `src/features/media/shared/MetadataForm.tsx` | filename + caption + validation | — | 6.4 |
| M5 | AudioRecordingFlow (state machine) | `src/features/media/audio-recording/components/AudioRecordingFlow.tsx` | record → preview → metadata → save; `recorderKey` bump on blur | expo-audio-studio → `MediaRecorder` | 6.5 |
| M6 | RecorderScreen (waveform, timer, pause/resume/stop) | `.../components/RecorderScreen.tsx` | 500 ms min-duration guard, CRT overlay, spectrum analyzer | Web Audio `AnalyserNode` | 6.6 |
| M7 | AudioPreview (playback) | `.../components/AudioPreview.tsx` | player does not auto-reset on finish | expo-audio → `<audio>` | 6.7 |
| M8 | **MediaLibrarySheet** | `src/features/media/media-library/components/MediaLibrarySheet.tsx` | Photos/Videos/Audio tabs, grid vs list, inline+fullscreen preview, delete w/ confirm+haptics, auto-select first on tab switch | FS, SQLite | 6.8 |
| M9 | OcrCaptureFlow (state machine) | `src/features/ocr-time-capture/components/OcrCaptureFlow.tsx` | camera → crop → OCR → clean → parse → confirm | expo-camera + ML Kit | 6.9 |
| M10 | OCR CameraScreen (bounding box) | `.../components/CameraScreen.tsx` | 80% × 17% box, corner indicators, 5% crop buffer, volume-button shutter, `<CameraView>` gated on `useIsFocused()` | expo-camera; ML Kit → Tesseract.js/canned | 6.10 |
| M11 | **OCR text-cleaning + timestamp parsing** | `src/features/ocr-time-capture/services/` + utils | exact cleaning rules; 6 accepted formats; date disambiguation; timezone stripping | pure JS — port directly | 6.11 |
| M12 | OCR ConfirmationScreen | `.../components/ConfirmationScreen.tsx` | review parsed value, retake, offset calculation | — | 6.12 |
| M13 | GpsCaptureControl (multi-sample) | `src/features/location/components/GpsCaptureControl.tsx` | idle / capturing / reverse-geocoding / error; N samples, >2σ outlier filter, quick 100 m / balanced 50 m / precise 10 m, 15–120 s timeout | expo-location → `navigator.geolocation` (simulate multi-sample) | 6.13 |
| M14 | LocationForm / IncidentLocationForm | `src/features/location/components/LocationForm.tsx`, `IncidentLocationForm.tsx` | field-level validation; manual lat/lng strict parse | expo-location | 6.13 |
| M15 | CameraGpsCapture (per-camera, forced `precise`) | `src/features/location/camera-gps/components/CameraGpsCapture.tsx` | idle / capturing / captured / error | expo-location | 6.13 |
| M16 | Mapbox address autocomplete | `src/features/location/components/AddressAutocomplete.tsx` | typing / searching / dropdown / retrieving / error; Suggest (300 ms debounce) → Retrieve → Reverse; session billing; token bucket 10 @10/s | Mapbox Search Box REST — works on web unchanged | 6.14 |
| M17 | **MapHost + CaseMapView** (case map) | `src/features/location/map-view/components/MapHost.tsx`, `CaseMapView.tsx` | loading/error/empty/loaded; supercluster clustering, status/text filters, Turf.js proximity toggle, cameras shown/hidden; GeoJSON from case-management | `@rnmapbox/maps` → **Mapbox GL JS (near 1:1)** | 6.15 |
| M18 | MapBottomSheet | `src/features/location/map-view/components/MapBottomSheet.tsx` | list @PEEK/PARTIAL ⇄ detail @PARTIAL/FULL | `@gorhom/bottom-sheet` → CSS sheet / vaul | 6.15 |

### 8.5 Import

| # | Surface | File | States | Logic deps | Native | § |
|---|---|---|---|---|---|---|
| I1 | Import entry (expanded case card) | `src/features/case-management/components/CaseCard.tsx` + `app/(tabs)/cases.tsx` | collapsed / expanded-with-Import | `handleImportPress` → `importCaseId` | — | 5.1 |
| I2 | ImportPickerModal (picker step) | `src/features/import/json-import/components/ImportPickerModal.tsx` | idle / reading-file / reading-clipboard / error / large-batch-confirm | file-type detection, 5 callbacks | document-picker, FS, clipboard, Alert | 5.2 |
| I3 | ImportPickerModal (pasteText step) | same file | empty / typed / submitting / error | → AI pipeline | keyboard-controller | 5.3 |
| I4 | ImportFlowModal (shell) | `src/features/import/json-import/components/ImportFlowModal.tsx` | hidden / progress / result | `computeImportFlowMode` | — | 5.6 |
| I5 | JSON progress (single + batch) | same file | 0–100 %, complete | `useImport` | Reanimated | 5.5 |
| I6 | **ImportTerminalProgress (AI/PDF) ★redesign** | `src/features/import/pdf-import/components/ImportTerminalProgress.tsx` + `TerminalLine.tsx` | 5 pipeline stages + **dwell** (success/partial/failure), pinned/un-pinned scroll | `useImportLog` ← `import-log-bus`, `usePdfImport` | Reanimated, Ionicons, `scannerMono` font, AccessibilityInfo | 5.7 |
| I7 | Result — single success | `.../ImportResultDetails.tsx`, `ImportResultBody.tsx` | success; warnings collapsed/expanded | `isImportSuccessResult` | LinearGradient | 5.8 |
| I8 | Result — batch | `.../BatchResultDetails.tsx` | all-collapsed / one-open + failure rows | `pdfBatchToImportBatch` | — | 5.9 |
| I9 | Result — failure / dry-run | inside `ImportFlowModal.tsx` | failure / dry-run, collapsible details+warnings | `ERROR_MESSAGES` map | — | 5.10 |
| I10 | Shared persist pipeline | `src/features/import/services/persist-mapped-import.ts` | geocoding → loading_case → creating_location → saving_form_data → complete | universal Zod schema, `mapImportToAppModel` | SQLite, Mapbox, sync | 5.4 |

### 8.6 Settings, form customization, agency cloud

| # | Surface | File | Controls | Persistence | Native | § |
|---|---|---|---|---|---|---|
| S0 | **SettingsModal shell** (master/detail pageSheet; a MODAL, not a route) | `src/features/settings/components/SettingsModal.tsx`, `SettingsNavBar.tsx`, `SettingsCategoryList.tsx`, `SettingsCategoryRow.tsx` | master list, detail push, swipe-back, `requiresAuth` gate | — | Reanimated, gesture-handler, expo-constants, local-auth | 4.0 |
| S1 | Settings catalog (11 categories / 4 groups) | `.../components/settings-catalog.tsx` | rows + preview hooks | — | — | 4.1 |
| S2 | Appearance | `.../components/GeneralSettingsSection.tsx` | Dark Mode switch; "Show import process details" | ThemeContext / `cctv-app-settings.importUi` | — | 4.3 |
| S3 | Location | `.../components/LocationSettingsSection.tsx` | GPS accuracy (quick/balanced★/precise), timeout (15/30★/60/120 s), accuracy-warning switch | `cctv-app-settings.location` | — | 4.4 |
| S4 | Media Capture | `.../components/MediaCaptureSettingsSection.tsx` | photo quality 0.5–1.0★0.9, video 720/1080★/2160, codec auto★/avc1/hvc1 (iOS), max duration ★300 s, GPS-in-media, shutter sound, skip processing | `cctv-app-settings.mediaCapture` | location perms, slider | 4.5 |
| S5 | Time Sync | `src/features/settings/time-sync/components/TimeSyncSettingsSection.tsx` | **one** picker: NTP region Canada(NRC)★/USA/Europe/Global — no server field, no test button | `cctv-app-settings.timeSync.ntpRegion` | — | 4.6 |
| S6 | Export Security | `src/features/settings/export-security/components/ExportSecuritySection.tsx` | ZIP switch, single-file switch, mode auto★/always_prompt, strength AES-256★/AES-128/STANDARD, set/clear default password (min 8) | flags → AsyncStorage; **password → SecureStore `cctv_default_zip_password`** | expo-secure-store | 4.7 |
| S7 | Security (biometrics) | `src/features/biometrics/components/SecuritySettingsSection.tsx` | App Lock (auth to enable), Protect Exports, Allow Device Passcode★on; loading/unavailable/available | `cctv-biometric-settings` | expo-local-authentication | 4.8 |
| S8 | Cloud Sync | `src/features/settings/cloud-sync/components/CloudSyncSettingsSection.tsx` | unconfigured: Set up / Join · configured: status, oversize + paused banners, sign-in, `Enable cloud sync` (`isLocked = !configured && !__DEV__`), QR / Manage users / Re-run setup, Disconnect | `cctv-app-settings.cloudSync`; config → SecureStore `agency_cloud_config` | supabase-js, secure-store, netinfo, Linking | 4.9 |
| S9 | About | `.../components/AboutSection.tsx` | version/platform/SDK rows, Contact Support mailto | — | Linking, toast | 4.10 |
| S10 | Developer (`__DEV__`) | `.../components/DevSettingsSection.tsx` | Verbose Import Logging | `cctv-app-settings.devSettings` | — | 4.11 |
| S11 | **User Profile** | `src/features/settings/user-profile/` | 8 string fields (name, badgeNumber, timeInFieldStart, timeAtAgencyStart, currentAgency, unitName, qualifications, agencyLogoUri[unused]); no validation; uncontrolled `defaultValue`+`onEndEditing`; no Cancel; career-duration lines | **AsyncStorage `cctv-app-user-profile` v1, NO migrate** | — | 4.12 |
| S12 | Form Customization | `src/features/form-customization/components/FormCustomizationSection.tsx` + `ProfilePicker.tsx` | profile chips Forensic★/Limited/Canvas, 12 screen rows, 57 field toggles, "Always on" locks | `cctv-app-form-customization` v1 + hydration gate (fails open @3 s) | none — pure JS | 4.13 |
| S13 | **Agency Cloud provisioning wizard** (6 steps) | `src/features/agency-cloud/components/ProvisioningWizardModal.tsx` + `steps/*.tsx` | Token → Org/PlanGate → Project → AdminAccount → Progress (7 rows) → Done | PAT held in a ref only; config via sync barrel | Supabase Management API, secure-store, clipboard | 4.14 |
| S14 | Enrollment QR / Join device / User management | `.../EnrollmentQRModal.tsx`, `EnrollDeviceModal.tsx`, `UserManagementModal.tsx` | QR payload `{v,url,key}`; scan + manual fallback → sign-in; biometric-gated roster with one-shot temp passwords | SecureStore `agency_cloud_secret_key` | expo-camera, qrcode-svg, local-auth | 4.14 |

---

## 9. The logic systems a web replica must implement (ranked)

1. **Bidirectional DVR↔Real time math** (`src/lib/utils/bidirectional-time.ts`) — `diffMs = dvr − actual`; `isDvrAhead = diffMs > 0`; `direction = 'AHEAD OF' | 'BEHIND'`; `formattedDifference = HH:MM:SS` of `floor(|diffMs|/1000)` with **uncapped hours**; `isDvrTimeCorrect ⇔ formattedDifference === '00:00:00'` (string compare, not ms). Correction: `shouldAdd = (isActualTime && isDvrAhead) || (!isActualTime && !isDvrAhead)`, then `corrected = t ± |diffMs|` on both endpoints and `isActualTime` flips. All strings parsed as `new Date(s.replace(' ','T')+'Z')` (wall-clock, DST-immune) and re-emitted with `getUTC*`.
2. **DST adjustment** — `adjustmentHours = isInDST(collectionDateTime) ? −1 : +1` (device timezone), applied uniformly as ±3 600 000 ms to both already-corrected endpoints; gated on `dvrAppliesDST`. Pin a zone in the demo; never rely on the host TZ.
3. **Extracted-scope derivation** (`extracted-scope-generator.ts`) — effective range = raw times when `isActualTime === false` and non-empty, else `dstAdjusted*` ?? `corrected*`; drop scopes where either endpoint is unresolved (so indices shift); start `roundDown5`, end `roundUp5` (exact boundaries untouched; `>= 60` rolls the hour/date); emit fresh UUIDs; `isActualTime` always `false`. **No manual-override protection** — regeneration replaces the whole array behind confirm dialogs.
4. **Store recalculation subscription** — fires on composite key `scopes[start|end|isActualTime] :: actualDateTime :: JSON(timeOffsetData) :: dvrAppliesDST`; microtask-deferred; re-entry-guarded; **only refreshes an existing extracted array, never creates one**.
5. **Notes auto-generation** — 7 sections in registry order: `address` (progressive Tier 0–3) → `timeOffset` → `scopes` (extracted wins; requested fallback with requested/corrected dual form) → `retention` → `cameras` (**deliberately wired to `''`**) → `export` → `timeOnScene`. Assembly: `[content, userAddendum]` joined by `\n`, empty blocks dropped, blocks joined by `\n\n`, `notesFreeText` appended last. Reconcile by **output comparison**: un-edited sections auto-track; `manuallyEdited` sections freeze against `generatedContent`; stale ⇔ `manuallyEdited && fresh !== '' && fresh !== generatedContent`.
6. **4-layer mutex-protected auto-save + dirty tracking** — blur / `beforeRemove` (blocking, Retry–Discard–Cancel) / 5-min interval / background. **Try-lock** mutex (`formSaveMutex.acquire`) that *skips* rather than queues. `SaveResult` = success | skipped | error. Skip conditions: no location, not dirty, saving, saved <30 s ago.
7. **Tri-state section completion** — `empty|partial|complete` per drawer step; strings must be non-whitespace; arrays need every entry complete; Notes is two-state; values filtered by form-customization visibility first.
8. **Validation posture** — no per-screen validation anywhere; the single runtime gate is `finalSubmissionSchema` on Completion (OCC# non-empty, address non-empty, ≥1 scope with both times). PDF generation applies a stricter `validatePdfGeneration`.
9. **Export state machine + policy** — `idle → validating → generating → zipping → sharing`; encryption resolved **before** the biometric gate; case-level export validates all locations first and offers "Continue anyway"; AES-256 floor; iOS one-modal-at-a-time deferral.
10. **Time sync** — NTP `offset = [(T2−T1)+(T3−T4)]/2`, `rtt = (T4−T1)−(T3−T2)`, `uncertainty = max(1, rtt/2 + rootDispersion)`; HTTP `offset = serverTime + rtt/2 − deviceTime`, drop `rtt > median×1.5`, mean of survivors, `uncertainty = max(1, rtt/2)`. "Use Current Time" freezes `deviceTimeAtCapture = Date.now()` **before any await**, then `actualDateTime = deviceTimeAtCapture + offset`. Browser has no UDP → simulate.
11. **OCR clean + parse** (`src/features/ocr-time-capture/utils/text-cleaning-pipeline.ts` + `timestamp-parser.ts` + `date-disambiguation.ts`) — **zero RN imports; copy verbatim.** Cleaning: space-normalisation (incl. OCR-mangled meridiems `15PA`/`15PN`/`15P`/`15AH`) → char-fix (`O o Q→0`, `I l i→1`, `S s→5`, `Z z→2`, `B→8`, `G→6`, with day/month names and AM/PM protected behind digit-free placeholders) → structural repairs (reorder `TIME AM/PM DATE` → `DATE TIME`, `12122025→12/12/2025`, missing-separator and compressed-time repairs; **year window hard-coded 2000–2028**) → token reconstruction (decompose ≥5-digit blobs anchored on `/20[0-2][0-8]/`, classify YEAR / DAY_NAME / CHANNEL_ID / REC / AM|PM / DATE_COMPONENT / POTENTIAL_TIME, emit `YYYY-MM-DD HH:MM:SS [AM|PM]`) → legacy fallback → finalize. Parsing: strip trailing `Z` / `±HH:MM` / named US zones (DVR clocks are **local**), then match **in order** ISO+meridiem → ISO → `MM/DD/YYYY HH:MM[:SS]` → dash+meridiem → dash → slash+meridiem (**dead branch, BUG-039**) → all-digits `YYYYMMDDHHMMSS`/`YYMMDDHHMMSS` → anchored `^HH:MM:SS$`; 2-digit years `≤50→20xx` else `19xx`; output always `YYYY-MM-DD HH:MM:SS`; validity window 2000…currentYear+10; confidence bands ≥0.8 high / ≥0.6 medium / ≥0.4 low / else fail. Disambiguation runs only when both components are 1–12, the year is not first, and a calibrated clock exists — picks the interpretation closest to today; `high` only if one interpretation is invalid or the gap is ≥7 days.
12. **Retention math** (`retention-calculation.ts`) — retention window → per-scope days-until-overwritten → `CRITICAL | WARNING | SAFE | OVERWRITTEN`, min across scopes.
13. **Form-customization visibility** — precedence **always-on > user override > profile default**, plus composition (a field is hidden whenever its host screen is hidden); wizard next/back derives from the *visible* step set; hidden inputs never strip already-stored data from any output.
14. **Import pipelines** — JSON (deterministic Peel parser) and PDF (extract text → one on-device AI call → deterministic normalize → Zod validate → persist), both landing in the universal schema + `persist-mapped-import`. **No API key and no per-field review UI** — correction happens later in the wizard.

## 10. Highest-leverage wins for the web demo

- **Port `src/lib/utils/**` verbatim** — already browser-compatible (swap `expo-crypto.randomUUID` → `crypto.randomUUID`), and it carries items 1, 2, 3, 12 above.
- **The Case Map export is already a browser page** — `buildCaseMapHtml` is pure and produces one self-contained HTML file. Near-free.
- **The PDF templates are HTML** — render them in an iframe and use `window.print()`; higher fidelity than any other port.
- **The Export-tab selection state machine and `useExportFlow` password/validation policy are pure TypeScript** — port rather than re-derive.
- **Form-customization is pure JS + a persisted store** — no native dependency at all; it ports 1:1.
