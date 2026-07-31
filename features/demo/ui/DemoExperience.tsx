'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from 'zustand'
import {
  createDemoStore,
  type DemoStore,
  type RestoreAllMode,
  type ScrapAllMode,
} from '@/features/demo/engine/store/create-store'
import { NARRATION, MAP_NARRATION, MODAL_NARRATION } from '@/features/demo/engine/content/narration'
import { isLaunchableId, nextChapter, prevChapter, WIZARD_SCREENS } from '@/features/demo/engine/content/screens'
import {
  runImport as runTextImport,
  runPdfImport,
  type ImportStageId as RunStageId,
  type ImportRealStageId,
  type ImportRunResult,
  type FallbackMode,
  type ImportErrorCode,
  type ImportErrorDetails,
  type ImportPartialData,
} from '@/features/demo/ui/import/run-import'
import { buildGeocodeQuery, forwardGeocode } from '@/features/demo/ui/import/geocode'
import { blankLocationForm } from '@/features/demo/engine/content/seed'
import { PhoneFrame } from '@/features/demo/ui/PhoneFrame'
import { StoryRail } from '@/features/demo/ui/StoryRail'
import { TabBar } from '@/features/demo/ui/controls/TabBar'
import { ExitDialog } from '@/features/demo/ui/controls/ExitDialog'
import { AlertDialog, type AlertDialogProps } from '@/features/demo/ui/controls/AlertDialog'
import { SplashScreen } from '@/features/demo/ui/screens/SplashScreen'
import { DashboardScreen } from '@/features/demo/ui/screens/DashboardScreen'
import { CaseActionsSheet } from '@/features/demo/ui/screens/CaseActionsSheet'
import { CasesScreen } from '@/features/demo/ui/screens/CasesScreen'
import { NewCaseModal } from '@/features/demo/ui/screens/NewCaseModal'
import {
  blankCaseForm,
  caseFormToEdits,
  caseFormToInput,
  caseToCaseForm,
  type NewCaseFields,
} from '@/features/demo/ui/screens/caseFormData'
import { NewLocationModal, type NewLocationFields } from '@/features/demo/ui/screens/NewLocationModal'
import { EditIncidentLocationModal } from '@/features/demo/ui/screens/EditIncidentLocationModal'
import {
  caseToIncidentValues,
  incidentValuesToPatch,
  type IncidentLocationValues,
} from '@/features/demo/engine/logic/incident-location'
import { DeleteConfirmationModal, type DeleteTarget } from '@/features/demo/ui/screens/DeleteConfirmationModal'
import { MediaLibrarySheet } from '@/features/demo/ui/screens/MediaLibrarySheet'
import { DuplicateLocationModal } from '@/features/demo/ui/screens/DuplicateLocationModal'
import { DemoNotification } from '@/features/demo/ui/screens/map/DemoNotification'
import { PhoneOverlayPortal } from '@/features/demo/ui/phone-overlay'
import { ensureUniqueLocationName, generateCopyName } from '@/features/demo/engine/logic/location-name'
import { ImportModal, type ImportResult, type ImportFailure } from '@/features/demo/ui/screens/ImportModal'
import { computeImportStage, type ImportUiStage } from '@/features/demo/engine/logic/import-flow-mode'
import { buildImportedLocationView, type ImportedLocationView } from '@/features/demo/ui/screens/importResultData'
import { ScreenStage } from '@/features/demo/ui/ScreenStage'
import { MapScreen } from '@/features/demo/ui/screens/map/MapScreen'
import { CaseMapPicker } from '@/features/demo/ui/screens/map/CaseMapPicker'
import { toMapData } from '@/features/demo/ui/screens/map/mapData'
import { slideDirection, type SlideDirection } from '@/features/demo/ui/motion'
import { SubmissionScreen, type SubmissionFields } from '@/features/demo/ui/screens/SubmissionScreen'
import { RequestedScopeScreen } from '@/features/demo/ui/screens/RequestedScopeScreen'
import { ArrivalDepartureScreen } from '@/features/demo/ui/screens/ArrivalDepartureScreen'
import { TimeOffsetScreen } from '@/features/demo/ui/screens/TimeOffsetScreen'
import { OcrCaptureScreen, type OcrLiveRead, type OcrResult } from '@/features/demo/ui/screens/OcrCaptureScreen'
import { MediaCaptureScreen, type SaveMediaRequest } from '@/features/demo/ui/screens/MediaCaptureScreen'
import { AudioRecordingFlow } from '@/features/demo/ui/screens/AudioRecordingFlow'
import type { MetadataFormValue } from '@/features/demo/ui/inputs/MetadataForm'
import { MEDIA_DELETED_NOTICE, buildMediaItem, collectMediaUrls, type CapturedMedia } from '@/features/demo/engine/logic/media'
import { readBrowserObjectUrls, revokeCapturedUrls } from '@/features/demo/ui/inputs/object-urls'
import { ExtractedScopeScreen } from '@/features/demo/ui/screens/ExtractedScopeScreen'
import { DvrInfoScreen } from '@/features/demo/ui/screens/DvrInfoScreen'
import { CamerasScreen } from '@/features/demo/ui/screens/CamerasScreen'
import { ExportInfoScreen } from '@/features/demo/ui/screens/ExportInfoScreen'
import { NotesScreen } from '@/features/demo/ui/screens/NotesScreen'
import { CompletionScreen, type CompletionSummary } from '@/features/demo/ui/screens/CompletionScreen'
import { PdfPreview } from '@/features/demo/ui/chrome/PdfPreview'
import { DemoErrorBoundary } from '@/features/demo/ui/chrome/DemoErrorBoundary'
import { WizardDrawer } from '@/features/demo/ui/controls/WizardDrawer'
import { selectDrawerItems, selectDrawerStatus, selectCaseNotesData, selectAdjustedScopes, selectExploreStatus } from '@/features/demo/engine/store/selectors'
import { loadSnapshot, persistDemoStore, type PersistenceHandle, type StorageLike } from '@/features/demo/engine/store/persistence'
import { maxIdSeq } from '@/features/demo/engine/store/helpers'
import { cleanOcrText, readDvrTimestamp, getConfidenceLevel, isDvrDraftCommittable } from '@/features/demo/engine/logic/ocr'
import { OCR_SAMPLE_FRAMES, OCR_SAMPLE_CONFIDENCE, SAMPLE_ACTUAL_TIME, type OcrSampleFrame } from '@/features/demo/engine/content/seed'
import { getCurrentFormattedTime } from '@/features/demo/engine/logic/time'
import { computeDstAdvisory } from '@/features/demo/engine/logic/dst-advisory'
import { formatAddress } from '@/features/demo/engine/logic/address-format'
import { simulateNtpSync } from '@/features/demo/engine/logic/time-sync'
import { toFinalSubmissionInput, validateFinalSubmission } from '@/features/demo/engine/logic/final-submission'
import { generateCaseNotesDoc } from '@/features/demo/engine/logic/pdf/case-notes'
import { generateTimeOffsetDoc } from '@/features/demo/engine/logic/pdf/time-offset'
import { assembleNotesString, buildNotesSectionMeta } from '@/features/demo/engine/logic/notes'
import { buildRetentionView, type RetentionView } from '@/features/demo/engine/logic/retention'
import { glassBtnSecondary } from '@/features/demo/ui/glass-tokens'
import { importLogBus, type ImportLogEmitter } from '@/features/demo/engine/logic/import-log'
import { clock } from '@/features/demo/ui/inputs/clock'
import { describeSaveStatus, type SaveStatusView } from '@/features/demo/engine/logic/save-status'
import { toCaseCards, toCaseSheet } from '@/features/demo/ui/screens/screenData'
import type { CameraEntry, CaseStatus, DuplicateMode, MediaItem, MediaKind, NoteSectionId, ScopeEntry } from '@/features/demo/engine/types'
import '@/features/demo/ui/demo.css'

// Retention "today": the real clock — the demo boots empty and every case is
// visitor-created, so retention countdowns read against actual time.
const realNow = () => new Date()

// Import-log run clock, read through the UI's wall-clock seam (spy-able in tests). The
// bus itself never touches Date.now() — elapsedMs comes from this injection (P1.3).
const logClock = () => clock.now().getTime()

const blankLocForm: NewLocationFields = { locationName: '', businessName: '', streetAddress: '', city: '', locationContact: '', locationPhone: '' }
/** Only ever a placeholder: `editIncident` seeds the real values from the case before opening. */
const blankIncidentForm: IncidentLocationValues = { businessName: '', streetAddress: '', city: '', latitude: '', longitude: '', coordinateSource: '' }

interface ImportState {
  /** The stored (driven) stage — displayed through computeImportStage (single union, R-31). */
  stage: ImportUiStage
  text: string
  result: ImportResult | null
  lastLocId: string | null
  activeStage: RunStageId | null
  /**
   * The last REAL stage the pipeline reached (never 'error') — tracked here, in the
   * functional updater, because React batches onStage('normalizing') with the
   * following onStage('error'|'done') from the same continuation: a stage that never
   * RENDERS would be invisible to any component-side "last rendered stage" ref, and a
   * normalize failure froze the bar at 15% (p1-review R-11). The terminal freezes its
   * bar/headline on this when activeStage is 'error'.
   */
  lastRealStage: ImportRealStageId | null
  batch: { current: number; total: number } | null
  /**
   * The visitor tapped the terminal's outcome CTA (phone `pdfTerminalAcknowledged`).
   * Reset in the same two places as the phone (§5.7.2): at run start and on close
   * (blankImport); onRetry clears it with the rest of the run state.
   */
  acknowledged: boolean
}
const blankImport: ImportState = { stage: 'picker', text: '', result: null, lastLocId: null, activeStage: null, lastRealStage: null, batch: null, acknowledged: false }

/**
 * An open in-phone alert (the phone's `Alert.alert(title, message, buttons)` payload):
 * everything `AlertDialog` takes except the dismissal, which the bridge owns (`closeAlert`).
 *
 * R-37: DERIVED from the primitive, never re-declared. Now that `AlertDialog` is the single
 * blocking-dialog primitive (R-5 deleted `ConfirmDialog`), a prop added to it has to reach
 * this state — a hand-written triple would keep compiling while the new prop was simply
 * unrepresentable in the bridge, so every alert the bridge opens would silently lack it.
 * Same rule as R-22's store-union import in `NotesScreen`.
 */
type AlertState = Omit<AlertDialogProps, 'onDismiss'>

/** Phone copy, verbatim — `app/(form)/completion.tsx:373-374`. */
const MISSING_FIELDS_TITLE = 'Missing Required Fields'
const MISSING_FIELDS_BODY = 'Please fill in all required fields to complete the case. Save progress instead?'
/**
 * Phone copy, verbatim (`completion.tsx:331-332`) plus ONE honest line. The phone's "Save
 * Progress" writes the location to SQLite; the demo's equivalent is the sessionStorage
 * snapshot (P0.4/D2) that is already being written continuously — true, but bounded by the
 * tab, and the demo says so rather than implying a database. Same language as the /demo error
 * page's "this tab's session snapshot".
 */
const PROGRESS_SAVED_TITLE = 'Progress Saved'
/**
 * True on BOTH arms below, and the reason the title still reads "Progress Saved" even when
 * nothing is being stored: the location is in the store either way, and Cases really does
 * reopen it. Only the persistence sentence differs.
 */
const PROGRESS_SAVED_SHARED = 'You can continue this location later from the Cases screen.\n\n'
const PROGRESS_SAVED_BODY =
  PROGRESS_SAVED_SHARED +
  'Your work stays in this browser tab — it survives a refresh, but closing the tab starts fresh.'
/**
 * R-2: the demoted arm. `sessionStorage` can be absent or blocked (enterprise policy, privacy
 * extension, sandboxed embed) — `persistDemoStore` answers that with a total no-op handle —
 * and a quota/security write failure deliberately CLEARS the snapshot, so the refresh the
 * visitor was just promised would boot empty. Saying nothing is not an option either: silence
 * leaves them assuming the demo's usual behaviour. Same shape as the FallbackMode / "Sample
 * data" honesty treatments.
 */
const PROGRESS_NOT_STORED_BODY =
  PROGRESS_SAVED_SHARED +
  "This browser isn't storing the session — your work will be lost if you refresh or close the tab."

/**
 * The location action chooser's toasts (P3.5), lifted from the phone's `cases.tsx` Toast calls
 * — `text1 — text2`, joined because the demo's banner is one line where the phone's Toast has
 * a title row and a body row.
 */
const LOCATION_NOT_FOUND_NOTICE = 'Error — Location not found.'
const duplicatedNotice = (name: string, mode: DuplicateMode) =>
  `Location Duplicated — ${name} ${mode === 'with-scopes' ? 'created with scopes.' : 'created.'}`
/** No phone counterpart: its service throws, this one returns null. Honest, not silent. */
const DUPLICATION_FAILED_NOTICE = "Duplication Failed — the source location couldn't be read."
const NEW_ADDRESS_SUBTITLE = 'Submission info copied — enter the new address.'
const newAddressCreatedNotice = (name: string, mode: DuplicateMode) =>
  `Location Created — ${name} created with copied submission info${mode === 'with-scopes' ? ' and scopes' : ''}`
/**
 * Same honest-backstop role as DUPLICATION_FAILED_NOTICE; the card stays open for a retry.
 *
 * The copy names the only cause that can actually reach it. `duplicateToNewAddress` returns a
 * bare `null` for three refusals — source gone, blank name, blank street — but the card's own
 * `newLocationBlock` gate holds the last two upstream, so a null here means the source location
 * went away. The old sentence ("a name and street address are required") described the two
 * unreachable arms and would have told a visitor to fix a form that was already valid (review
 * R-2's rider). If a cause is ever surfaced from the store (type-design's carried NIT: make the
 * refusal a discriminated result), this splits back into three sentences.
 */
const NEW_ADDRESS_FAILED_NOTICE = "Failed to Create Location — the source location couldn't be read."
/**
 * The chooser's two export actions (plan D4 / P3.5). They RENDER — this chooser is the phone's
 * location-level export entry point, and hiding the section would misrepresent the surface —
 * but they resolve to an honest notice instead of a fabricated download, the same treatment the
 * map gives Call/Email. Re-point them at the real flows when the Export tab lands (P5).
 */
const EXPORT_ZIP_NOTICE = "Export ZIP isn't available yet — it lands with the Export tab."
const EXPORT_GEOJSON_NOTICE = "Export GeoJSON isn't available yet — it lands with the Export tab."
/**
 * The drawer's Media Library guard (P4.2). Phone parity, verbatim from the Toast the drawer's
 * `onOpenMediaLibrary` fires with no location selected (`app/(form)/_layout.tsx:334-345`,
 * `text1: 'No Location'` / `text2: 'Select a location first.'`) — joined `text1 — text2` like
 * the P3.5 notices, because the demo's banner is one line. As on the phone, the drawer stays
 * OPEN behind it: the visitor's next move is to go pick a location, and closing the menu would
 * take the way there away.
 */
const NO_LOCATION_NOTICE = 'No Location — Select a location first.'
/**
 * The capture screen's save guard (P4.3). Phone verbatim, from the toast the media-capture
 * route wrapper fires when it has no location to attach the file to
 * (`app/(form)/media-capture.tsx:115`, `text1: 'Cannot Save Media'` / `text2: 'No location
 * selected. Please navigate from a case first.'`) — joined `text1 — text2` like the notices
 * above. As on the phone, the capture screen closes behind it: the drawer's Capture Media row
 * is deliberately UNGATED on an open location (deferred §59f, phone parity), so this is the
 * point where the flow discovers there is nowhere to put the photo, and `addMedia`'s silent
 * early-return is the thing this exists to make visible.
 */
const CANNOT_SAVE_MEDIA_NOTICE =
  'Cannot Save Media — No location selected. Please navigate from a case first.'
/** Phone verbatim (`media-capture.tsx:192-193`): `text1` is 'Photo Saved'/'Video Saved' and
 *  `text2` is the user's filename — WITHOUT the extension, which the wrapper appends after. */
const mediaSavedNotice = (kind: MediaKind, filename: string): string =>
  `${kind === 'photo' ? 'Photo' : 'Video'} Saved — ${filename} saved to case`

/** Clear the gate's error list. Empty→empty returns the SAME reference, so the effects below
 *  can call it every render without looping on a fresh array identity. */
const dropGateErrors = (prev: readonly string[]): readonly string[] => (prev.length === 0 ? prev : [])

// Monotonic ids for UI-created scope/visit rows.
let uiSeq = 0


/** `window.sessionStorage`, or null when unavailable (SSR, storage disabled) — never throws. */
function sessionStorageOrNull(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}
const blankScope = (): ScopeEntry => ({ id: `ui-s${uiSeq++}`, startDateTime: '', endDateTime: '', isActualTime: true, cameras: '' })
const blankVisit = () => ({ id: `ui-v${uiSeq++}`, arrival: '', departure: '' })
const blankCamera = (): CameraEntry => ({ id: `ui-c${uiSeq++}`, cameraName: '', resolution: '', recordingFps: '' })

/** change/add/remove handlers for an id-keyed list, written back through one setter. */
function listEditHandlers<T extends { id: string }>(list: T[], write: (next: T[]) => void) {
  return {
    change: (i: number, patch: Partial<T>) => write(list.map((it, idx) => (idx === i ? { ...it, ...patch } : it))),
    add: (item: T) => write([...list, item]),
    remove: (i: number) => write(list.filter((_, idx) => idx !== i)),
  }
}

interface PdfState {
  title: string
  html: string
}

/** What the delete confirmation is armed on (P3.1). Ids only — the dialog's copy is derived
 *  from live store entities at render, so it can never show a stale case number or a location
 *  list that has moved on. */
type PendingDelete = { kind: 'case'; id: string } | { kind: 'location'; id: string }
const EMPTY_FORM = blankLocationForm()

// Fallback for views without a screen yet. `mediaCapture` left it in P4.3; `audioRecording`
// is the last view that still reaches here, and it is a fast-follow (P4.6), not a bug.
const placeholder = (view: string) => (
  <div style={{ minHeight: 786, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center', color: '#5d7a9a', fontSize: 14, lineHeight: 1.6 }}>
    The “{view}” screen is a fast-follow.
  </div>
)

/** R-35: the honest empty state for a wizard screen reached with no location open — the same
 *  judgment loadSnapshot encodes at boot ("route to cases instead of a dead form"), applied
 *  in-session. Without it, 10 of the 11 wizard screens rendered fully interactive forms whose
 *  every keystroke was silently discarded (updateField early-returns with no location). */
const noLocationNotice = (onGoToCases: () => void) => (
  <div style={{ minHeight: 786, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center', color: '#5d7a9a', fontSize: 14, lineHeight: 1.6 }}>
    <div style={{ marginBottom: 18 }}>No location open — the wizard documents one recovery location at a time.</div>
    <button type="button" onClick={onGoToCases} style={{ padding: '12px 22px', ...glassBtnSecondary, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
      Open one from Cases
    </button>
  </div>
)

export interface DemoExperienceProps {
  /** Inject a store (test/SSR seam). Defaults to a fresh store created once per mount. */
  store?: DemoStore
}

/**
 * The single store bridge. Creates the demo store once per mount (via ref) — it boots
 * empty; the visitor creates everything — subscribes selectively, and renders the active
 * screen + StoryRail. The ONLY component that touches the store — every screen below it
 * is presentational.
 */
export function DemoExperience({ store: injectedStore }: DemoExperienceProps = {}) {
  const storeRef = useRef<DemoStore | null>(null)
  if (!storeRef.current) {
    if (injectedStore) {
      storeRef.current = injectedStore
    } else {
      // P0.4 (D2): rehydrate this tab's snapshot — sessionStorage is per-tab, so a fresh
      // visitor still boots empty. uiSeq must clear every rehydrated id so UI-minted row
      // ids can't collide with restored ones after a refresh.
      const snapshot = loadSnapshot(sessionStorageOrNull())
      if (snapshot) uiSeq = Math.max(uiSeq, maxIdSeq(snapshot) + 1)
      storeRef.current = createDemoStore(snapshot ?? undefined)
    }
  }
  const store = storeRef.current

  const currentChapter = useStore(store, (s) => s.currentChapter)
  const view = useStore(store, (s) => s.view)
  const visited = useStore(store, (s) => s.visited)
  const cases = useStore(store, (s) => s.cases)
  const locations = useStore(store, (s) => s.locations)
  const modal = useStore(store, (s) => s.modal)
  const currentLocationId = useStore(store, (s) => s.currentLocationId)
  const currentCaseId = useStore(store, (s) => s.currentCaseId)
  const drawerOpen = useStore(store, (s) => s.drawerOpen)
  const capture = useStore(store, (s) => s.capture)

  // Screen-transition direction: computed once per `view` change and held stable through the
  // animation (mutating refs during render = the "previous prop" pattern — no effect, no re-render,
  // so an unrelated re-render mid-slide can't flip the exiting screen's direction).
  const prevViewRef = useRef(view)
  const dirRef = useRef<SlideDirection>('none')
  if (prevViewRef.current !== view) {
    dirRef.current = slideDirection(prevViewRef.current, view)
    prevViewRef.current = view
  }

  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null)
  // The dashboard's long-press target (the phone's `actionSheetCase`, home.tsx:48). Held by
  // ID, not by the mapped object: the sheet then re-derives from live store data, so a case
  // edited or re-statused underneath it can never show a stale report.
  const [actionSheetCaseId, setActionSheetCaseId] = useState<string | null>(null)
  // Tab-local viewer case for the Map tab — distinct from the form's currentCaseId. The picker sets
  // it; null shows the mandatory picker. mapPickerOpen drives the dismissible "Change Case" overlay.
  const [mapViewerCaseId, setMapViewerCaseId] = useState<string | null>(null)
  const [mapPickerOpen, setMapPickerOpen] = useState(false)
  const [targetCaseId, setTargetCaseId] = useState<string | null>(null)
  const [caseForm, setCaseForm] = useState<NewCaseFields>(blankCaseForm)
  // Which case the New Case sheet is serving. One modal id, two modes — the phone's own
  // framing (`NewCaseModal` is a multi-caller component: Cases opens it to create, the
  // dashboard's actions sheet opens it to edit). Held here, not in the store, because it is
  // modal chrome: `modal` itself is deliberately not persisted, and neither is this.
  const [caseEditId, setCaseEditId] = useState<string | null>(null)
  const [locForm, setLocForm] = useState<NewLocationFields>(blankLocForm)
  // The New Location modal's write-guard identity (deferred §45f: every `LocationFields` caller
  // passes its OWN identity). The location does not exist yet, so what an in-flight lookup
  // belongs to is the DRAFT — minted fresh per open from the same monotonic counter the row ids
  // use, so a lookup left over from a cancelled draft can never write into the next one.
  const [locDraftId, setLocDraftId] = useState<string | null>(null)
  // Incident-location editor (matrix row 23). `incidentForm` is SEEDED ONCE per open, in
  // `editIncident` — the phone's `useState(() => caseToIncidentValues(initialCase))` semantics
  // lifted to the bridge so the modal itself stays store-free. `incidentCaseId` is the case the
  // seed came from; the save writes to THAT id, never to a separately-tracked selection.
  const [incidentCaseId, setIncidentCaseId] = useState<string | null>(null)
  const [incidentForm, setIncidentForm] = useState<IncidentLocationValues>(blankIncidentForm)
  /**
   * The open location action chooser (P3.5) — the phone's `duplicateState`. Resolved ONCE when
   * the chooser opens (source + sibling names + the pre-deduped suggestion), like the phone,
   * so the six actions all act on the row that was actually pressed.
   */
  const [dupState, setDupState] = useState<{ sourceId: string; existingNames: string[] } | null>(null)
  const [dupName, setDupName] = useState('')
  /**
   * The chooser's "New Location w/ Sub Info [+ Scopes]" hand-off (the phone's `newAddressState`):
   * the create-location card, mounted in its require-address variant against this source and
   * mode. Its form values live in `locForm` like the plain Add-Location caller's.
   */
  const [newAddrState, setNewAddrState] = useState<{ sourceId: string; mode: DuplicateMode; existingNames: string[] } | null>(null)
  /** The demo's Toast analog — an auto-dismissing in-phone banner (the map's idiom). */
  const [notice, setNotice] = useState<string | null>(null)
  const [imp, setImp] = useState<ImportState>(blankImport)
  // Import cancellation token (H1): each run captures its own generation; cancelling —
  // or starting a newer run — bumps the counter, so a stale in-flight run fails its
  // checkpoint even after another run begins. A shared boolean is NOT enough: the
  // newer run's "reset" would un-cancel the stale one and let it mutate the store.
  const importGen = useRef(0)
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)
  // The operator's working DVR date/time on the confirm step. Held here (not in the screen)
  // per the store-bridge rule, and committed to the store only by "Use this & calculate" —
  // so Cancel/Retake leave no trace of a read the operator rejected.
  const [ocrDraft, setOcrDraft] = useState('')
  const [ocrDateConfirmed, setOcrDateConfirmed] = useState(false)
  // Render-irrelevant OCR proof (raw/cleaned text + score, and for a live camera read the
  // cropped strip image) carried from the read to the commit, where it becomes
  // `capture.ocr` → `timeOffset.ocr`.
  const ocrProof = useRef<{ rawText: string; cleanedText: string; confidence: number; imageDataUrl?: string } | null>(null)
  const [pdf, setPdf] = useState<PdfState | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  // R-1: lets a COMPLETED location's confirmation flip back to the review form so the court
  // PDF is never a one-shot. UI-only escape hatch — the completed flag itself lives in the
  // store (location-scoped) and is never unset. Keyed by LOCATION ID (R-21): an un-keyed
  // boolean let a "Review / Export again" on location A suppress location B's confirmation
  // after any switch that bypassed openLocation's reset (e.g. switchLocation directly).
  const [reviewAgainFor, setReviewAgainFor] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [retentionView, setRetentionView] = useState<RetentionView>({ totalRetention: null, scopes: [] })

  // Clear a pending device-sync timer if the experience unmounts mid-sync.
  useEffect(() => () => {
    if (syncTimer.current) clearTimeout(syncTimer.current)
  }, [])

  // P0.4: mirror the store into sessionStorage (debounced) so a mid-wizard refresh restores
  // the tab's work. pagehide flushes a pending write — a refresh rarely waits out the
  // debounce. Injected stores (the test seam) are deliberately not persisted.
  // The handle is read at ALERT time by saveProgress (R-2), never at render — a value captured
  // once would keep promising refresh survival after a write failure revoked it.
  const persistenceRef = useRef<PersistenceHandle | null>(null)
  useEffect(() => {
    // Injected stores (the test seam) are still deliberately not persisted — but they are
    // wired with a NULL BACKEND rather than skipped, so every mount has a handle to ask about
    // persistence. An absent handle is exactly the unknown state the old unconditional
    // "survives a refresh" copy assumed away.
    const handle = persistDemoStore(store, injectedStore ? null : sessionStorageOrNull())
    persistenceRef.current = handle
    const onPageHide = () => handle.flush()
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      persistenceRef.current = null
      handle.dispose()
    }
  }, [injectedStore, store])

  /**
   * The drawer footer's save-status line (P4.2, matrix row 80).
   *
   * Sampled when the drawer OPENS, not continuously: the fact lives on the persistence handle
   * (a ref, deliberately — R-2's "read it when you're about to make a claim, never capture it
   * at mount"), and a status line is exactly such a claim. `flush()` first, so a write still
   * inside its 250ms debounce lands before we describe it — otherwise a visitor who types and
   * immediately opens the menu is told the age of the write BEFORE theirs.
   *
   * Cleared on close so the next open can never show a stale reading. A missing handle counts
   * as `unavailable` — same rule as `saveProgress`: never assume a wired handle.
   */
  const [saveStatus, setSaveStatus] = useState<SaveStatusView | null>(null)
  useEffect(() => {
    if (!drawerOpen) {
      setSaveStatus(null)
      return
    }
    const handle = persistenceRef.current
    handle?.flush()
    setSaveStatus(describeSaveStatus(handle?.saveState() ?? { kind: 'unavailable' }, clock.now().getTime()))
  }, [drawerOpen])

  // Rail copy, most-specific first (mirrors the manifest anchor in selectExploreStatus):
  // an open modal shows its own copy (Create a Case / Add a Location / Import Location),
  // else an open LAUNCH SCREEN with an entry shows its own (§60k — the OCR camera; the two
  // media launchables carry no entry by decision §59e and fall through), else the Map tab its
  // contextual copy, else the current chapter's. The ?? guards an id with no narration
  // entry — falls back to the chapter rather than blanking.
  const narration =
    (modal && MODAL_NARRATION[modal]) ??
    (isLaunchableId(view) ? MODAL_NARRATION[view] : undefined) ??
    (view === 'map' ? MAP_NARRATION : NARRATION[currentChapter])
  // The manifest recomputes when the visit record, the active view, or the open modal
  // changes — all three are selectExploreStatus inputs (read via store.getState()), and
  // the anchor is modal → view → chapter, so `modal` must be a dep or the active row goes
  // stale on modal close (only `modal` flips then; visited/view are reference-unchanged).
  const explore = useMemo(
    () => selectExploreStatus(store.getState()),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- visited/view/modal ARE the selector's inputs, read through getState
    [store, visited, view, modal],
  )
  // Exit flow: leaving with unlit manifest rows opens the before-you-go dialog;
  // all-explored lets the link navigate normally. Dialog state is UI-only.
  const [exitOpen, setExitOpen] = useState(false)
  const unseen = useMemo(() => explore.filter((i) => !i.visited).map((i) => ({ number: i.number, label: i.label })), [explore])
  const onBackToSite = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (unseen.length > 0) {
      e.preventDefault()
      setExitOpen(true)
    }
  }
  const caseCards = useMemo(() => toCaseCards(cases, locations), [cases, locations])
  // The open sheet's read-only report. Recomputed from the store, so a status action's
  // result is visible the instant it lands (the phone needs a refetch + toast for this).
  const actionSheetCase = useMemo(() => {
    const c = cases.find((x) => x.id === actionSheetCaseId)
    return c ? toCaseSheet(c, locations) : null
  }, [cases, locations, actionSheetCaseId])
  // Map projection for the viewer case (tab-local). Memoized so marker identity is stable across
  // unrelated re-renders (selection, etc.) — only a data or viewer-case change re-fits the camera.
  const mapViewerCase = useMemo(() => cases.find((c) => c.id === mapViewerCaseId) ?? null, [cases, mapViewerCaseId])
  const mapData = useMemo(
    () => toMapData(mapViewerCase, locations.filter((l) => l.caseId === mapViewerCaseId)),
    [mapViewerCase, locations, mapViewerCaseId],
  )
  const currentLocation = locations.find((l) => l.id === currentLocationId) ?? null
  const drawerStatus = selectDrawerStatus(currentLocation) // per-screen completion dots
  const currentCase = cases.find((c) => c.id === currentCaseId) ?? null

  // ---- DST advisory (P2.5) ---------------------------------------------------------------
  // The phone recomputes this on every render of the Time-Offset result block, so it tracks
  // the DVR-Applies-DST toggle and the scope edits live. Memoised here (review R-14) because
  // scenario A additionally scans the year for the zone's transition dates — ~23 `isDst`
  // probes — and the bridge re-renders on EVERY store write, doubled under StrictMode.
  //
  // Deps are exactly the advisory's inputs. `clock.now` / `clock.isDst` are module-level seam
  // singletons, stable by construction. Honest consequence of memoising a clock read: "today"
  // is frozen until one of these inputs changes — irrelevant at demo timescales, and the
  // alternative (recompute per render) is what this finding is about.
  const timeOffsetForAdvisory = currentLocation?.form.timeOffset ?? null
  const scopesForAdvisory = currentLocation?.form.scopes
  const dstAdvisory = useMemo(
    () =>
      timeOffsetForAdvisory
        ? computeDstAdvisory({
            scopes: scopesForAdvisory ?? [],
            actualDateTime: capture.actualDateTime,
            dvrAppliesDST: capture.dvrAppliesDST,
            now: clock.now,
            isDst: clock.isDst,
          })
        : null,
    [timeOffsetForAdvisory, scopesForAdvisory, capture.actualDateTime, capture.dvrAppliesDST],
  )

  // ---- Completion gate (P2.4, matrix G9) -------------------------------------------------
  // The phone's ONE runtime validation gate, evaluated against the OPEN LOCATION and the case
  // that OWNS it (`loc.caseId`) — never `currentCase` above, which is the selection-pair read.
  // Same R-19 law the completion action follows: trusting the pair here would validate an
  // unrelated case's occurrence number against this location's address and scopes.
  const gateOwnerCase = currentLocation ? (cases.find((c) => c.id === currentLocation.caseId) ?? null) : null
  const gateOutcome = useMemo(
    () => validateFinalSubmission(toFinalSubmissionInput(currentLocation, gateOwnerCase)),
    [currentLocation, gateOwnerCase],
  )
  /** Messages from the last BLOCKED attempt — the phone's `validationErrors` state. */
  const [gateErrors, setGateErrors] = useState<readonly string[]>([])
  const [alert, setAlert] = useState<AlertState | null>(null)
  // Stable identity: AlertDialog keys its Escape listener on `onDismiss`, so a fresh closure
  // per render would tear down and re-add the listener on every store update.
  const closeAlert = useCallback(() => setAlert(null), [])

  // Auto-clear, mirroring the phone's effect (`completion.tsx:115-125`): the card disappears
  // the moment the operator fixes the underlying data — they never have to re-tap to find out.
  useEffect(() => {
    if (gateOutcome.ok) setGateErrors(dropGateErrors)
  }, [gateOutcome])
  // Errors belong to the location they were computed for. On the phone the screen remounts per
  // location; here the bridge outlives the switch, so drop them rather than show location A's
  // list over location B's form.
  useEffect(() => {
    setGateErrors(dropGateErrors)
  }, [currentLocationId])
  // The phone's Alert is OS-modal — nothing can navigate under it. The demo's rail sits OUTSIDE
  // the phone and can jump views, so an alert left standing over another screen would misstate
  // what it is blocking. Leaving Completion closes it.
  useEffect(() => {
    if (view !== 'completion') setAlert(null)
  }, [view])
  // Same rule for the dashboard's actions sheet (the phone presents it as a pageSheet, under
  // which nothing can navigate): a sheet naming a case, left standing over the Map or the
  // wizard, would claim to be acting on a screen it has nothing to do with.
  useEffect(() => {
    if (view !== 'dashboard') setActionSheetCaseId(null)
  }, [view])

  // Derive DVR retention (total window + per-scope overwrite countdown) from the earliest
  // recorded date + scopes. Clock is read here (never at render). The persisted
  // totalDvrRetention (the PDF's source) is kept in sync — written only while
  // firstRecordedDate drives it, and cleared on a set→empty transition, so an
  // import-provided value (which leaves firstRecordedDate empty) is never clobbered.
  const prevFirstRecorded = useRef('')
  useEffect(() => {
    const fr = currentLocation?.form.dvr.firstRecordedDate ?? ''
    const view = buildRetentionView(currentLocation?.form.scopes ?? [], fr, realNow)
    setRetentionView(view)
    if (currentLocation) {
      if (fr) {
        const str = view.totalRetention != null ? `${view.totalRetention} days` : ''
        if (str !== currentLocation.form.dvr.totalDvrRetention) {
          store.getState().updateField('form.dvr.totalDvrRetention', str)
        }
      } else if (prevFirstRecorded.current && currentLocation.form.dvr.totalDvrRetention) {
        store.getState().updateField('form.dvr.totalDvrRetention', '')
      }
    }
    prevFirstRecorded.current = fr
  }, [store, currentLocation])

  // Flow A (phone parity: the Notes screen's focus reconcile): entering the Notes
  // screen reconciles stored sections against current wizard data — un-edited sections
  // silently pick up fresh output, edited ones are never clobbered. Keyed on the
  // location too, so switching locations while the screen is open re-reconciles.
  // The action itself is a no-op when nothing changed (reference-preserving).
  useEffect(() => {
    if (view === 'notes') store.getState().reconcileNotes()
  }, [store, view, currentLocationId])

  // Notes wiring (R-14): stable callback identities + memoised derivations, so
  // SectionBlock's memo actually holds — the store ref is stable, so these bind once.
  const notesMeta = useMemo(() => buildNotesSectionMeta(currentLocation), [currentLocation])
  const notesCopyAllText = useMemo(
    () =>
      currentLocation
        ? assembleNotesString(currentLocation.form.notesSections, currentLocation.form.notesFreeText)
        : '',
    [currentLocation],
  )
  const commitNoteSection = useCallback(
    (id: NoteSectionId, text: string) => store.getState().commitNoteSection(id, text),
    [store],
  )
  const commitNoteAddendum = useCallback(
    (id: NoteSectionId, text: string) => store.getState().commitNoteAddendum(id, text),
    [store],
  )
  const resetNoteSection = useCallback((id: NoteSectionId) => store.getState().resetNoteSection(id), [store])
  const scrapAllNotes = useCallback((mode: ScrapAllMode) => store.getState().scrapAllNotes(mode), [store])
  const restoreAllNotes = useCallback((mode: RestoreAllMode) => store.getState().restoreAllNotes(mode), [store])
  const commitNotesFreeText = useCallback((text: string) => store.getState().commitNotesFreeText(text), [store])

  const openMenu = () => store.getState().setDrawerOpen(true)

  // ---- media capture (P4.3, matrix rows 49-55) ----
  /**
   * The capture screen's accept path. Returns whether the store TOOK the item, because the
   * screen's object-URL hand-off hangs on the answer: a refused save must leave the `blob:`
   * URL owned by the capture hook so its unmount sweep frees it (deferred §58 carry-rule 1).
   *
   * The filename and caption are the metadata form's (P4.4) — a BASE name, never a finished
   * filename. `buildMediaItem` is what turns it into one, using `mediaFilename`, so the
   * extension names the container the browser actually produced rather than the phone's
   * `.jpg`/`.mp4` (§58c).
   */
  const saveCapturedMedia = ({ captured, filename, caption }: SaveMediaRequest): boolean => {
    const st = store.getState()
    // `addMedia` early-returns with no `currentLocationId`; without this the capture would
    // vanish into a no-op save and the visitor would be told nothing.
    if (!st.currentLocationId) {
      setNotice(CANNOT_SAVE_MEDIA_NOTICE)
      st.closeLaunch()
      return false
    }
    const item = buildMediaItem({ id: `ui-m${uiSeq++}`, captured, filename, caption })
    st.addMedia(item)
    setNotice(mediaSavedNotice(captured.kind, filename))
    st.closeLaunch()
    return true
  }

  // ---- drawer Media accordion (P4.2, matrix row 80) ----
  // The phone's three rows. Capture/Record push a route and close the drawer; both targets are
  // LAUNCHABLES here (`launch`, never `setView`), so they leave `currentChapter` alone and
  // `closeLaunch` returns to the wizard step the visitor came from — the OCR rule, applied to
  // the two media screens. Capture Media lands on the real screen (P4.3); Record Audio still
  // falls through to the honest `placeholder` until P4.6, which is correct interim behaviour,
  // not a dead click.
  const launchMediaCapture = () => {
    const st = store.getState()
    st.launch('mediaCapture')
    st.setDrawerOpen(false)
  }
  const launchAudioRecording = () => {
    const st = store.getState()
    st.launch('audioRecording')
    st.setDrawerOpen(false)
  }
  /**
   * Commit a finished audio note (P4.6). The ONLY store write in the audio flow — the flow and
   * both of its screens are pure, per the store-bridge rule.
   *
   * `meta` is the metadata form's value (P4.4): a filename BASE plus the visitor's notes. The
   * extension is `buildMediaItem`'s (via `mediaFilename`), never appended here (§58c).
   */
  const saveAudioNote = (captured: CapturedMedia, meta: MetadataFormValue) => {
    const st = store.getState()
    // `ui-m…` joins the other UI-minted ids, which `maxIdSeq` re-seeds past on rehydrate so a
    // restored session cannot collide with them.
    st.addMedia(buildMediaItem({ id: `ui-m${uiSeq++}`, captured, filename: meta.filename, caption: meta.caption }))
    st.closeLaunch()
  }
  /**
   * Confirmed deletion from the media library (P4.5, matrix row 66) — the ONLY store write the
   * library makes, and the first caller `revokeCapturedUrls` has ever had (§58g shipped it
   * tested and unused, on purpose, for exactly this).
   *
   * Revoke BEFORE the store drops the row. The store took ownership of the object URL when the
   * capture surface `release`d it at save time, so after this line nothing holds it and the
   * blob's bytes — a whole photo or clip — would otherwise stay pinned in the tab for as long
   * as it lives. `revokeCapturedUrls` no-ops on the bundled sample paths, which are static
   * files that must outlive every capture surface.
   */
  const deleteMediaItem = (item: MediaItem) => {
    const io = readBrowserObjectUrls()
    // Absent wherever the API is (jsdom, a hardened browser) — nothing to revoke, and the store
    // write is what actually removes the row, so it must not be gated on the revocation.
    if (io !== null) revokeCapturedUrls(io, [item.url, item.poster])
    store.getState().deleteMedia(item)
    setNotice(MEDIA_DELETED_NOTICE)
  }

  /** The one row the phone gates: no location selected → toast, and the drawer stays open. */
  const openMediaLibrary = () => {
    const st = store.getState()
    if (!st.currentLocationId) {
      setNotice(NO_LOCATION_NOTICE)
      return
    }
    st.openModal('mediaLibrary')
    st.setDrawerOpen(false)
  }

  // Error-boundary recovery: land back on Cases with every transient overlay cleared
  // (store AND local), so the re-rendered subtree can't immediately re-throw from a
  // stale overlay (open modal, PDF preview, OCR confirm stage, map picker).
  const returnToCases = () => {
    setPdf(null)
    setPendingDelete(null)
    resetOcr()
    setMapPickerOpen(false)
    setActionSheetCaseId(null)
    setDupState(null) // the chooser's source, cleared with every other transient overlay state
    setNewAddrState(null)
    setNotice(null)
    const st = store.getState()
    st.setDrawerOpen(false)
    st.closeModal()
    st.setView('cases')
  }
  const formList = <T extends { id: string }>(list: T[], path: string) =>
    listEditHandlers(list, (next) => store.getState().updateField(path, next))

  // ---- rail / chapter nav ----
  const onNext = () => {
    const n = nextChapter(currentChapter)
    if (n) store.getState().setView(n)
  }
  const onPrev = () => {
    const p = prevChapter(currentChapter)
    if (p) store.getState().setView(p)
  }

  // ---- screen interactions (sandbox) ----
  const openLocation = (locationId: string) => {
    setReviewAgainFor(null) // a fresh location visit starts from its own truthful gate (R-1)
    store.getState().switchLocation(locationId)
    store.getState().setView('submission')
  }
  const newCase = () => {
    setCaseEditId(null)
    setCaseForm(blankCaseForm)
    store.getState().openModal('newCase')
  }
  /**
   * Open the New Case sheet on an EXISTING case (phone: dashboard long-press →
   * CaseActionsSheet → "Edit Case", `app/(tabs)/home.tsx:168-173`). Seeds the form from the
   * stored case through the shared mapper, so the seed and the submit can't drift.
   *
   * Wired at the P3 assembly to the dashboard sheet's `onEdit` (§49a's one-line trigger,
   * §50e's). Do not inline a second copy of this — seed drift between two edit entry points is
   * exactly what `caseFormData.ts` exists to prevent.
   */
  const editCase = (caseId: string) => {
    const target = store.getState().cases.find((c) => c.id === caseId)
    if (!target) return
    setCaseEditId(caseId)
    setCaseForm(caseToCaseForm(target))
    store.getState().openModal('newCase')
  }
  // Closing always returns the sheet to create mode, so a later `openModal('newCase')` from
  // anywhere can never inherit a stale edit target — NOR a stale edit SEED. Clearing the id
  // alone left the previous case's values in `caseForm`: every UI entry happens to blank them
  // (`newCase` does it on open), so nothing was reachable, but the guarantee is worth having
  // at the close rather than resting on every future opener remembering to.
  const closeCaseModal = () => {
    setCaseEditId(null)
    setCaseForm(blankCaseForm)
    store.getState().closeModal()
  }

  // ---- dashboard case actions (P3.2, rows 8/9) ----
  const openCaseActions = (caseId: string) => setActionSheetCaseId(caseId)
  const closeCaseActions = () => setActionSheetCaseId(null)
  /**
   * Close the sheet, then act — the phone's `handleSheetComplete/Reopen/Archive` shape
   * (home.tsx:142-161), which captures the case into a local first for exactly this reason.
   *
   * No success/failure toast, unlike the phone: its write is an async SQLite round-trip
   * followed by a refetch, so the toast is the only confirmation the row will change. Here
   * the write is synchronous and the card behind the sheet re-renders green/grey on the same
   * tick — a toast would announce something the visitor is already looking at. There is no
   * failure arm to report either; an in-memory status write cannot fail.
   */
  const runCaseAction = (status: CaseStatus) => {
    const id = actionSheetCaseId
    if (!id) return
    setActionSheetCaseId(null)
    store.getState().setCaseStatus(id, status)
  }
  /** "Edit Case" — close the sheet, then open the editor. The phone additionally waits 350 ms
   *  for its pageSheet dismissal animation (`home.tsx:41,168-173`); the demo's overlays unmount
   *  synchronously, so there is nothing to wait for. Closes §49a. */
  const editCaseFromSheet = () => {
    const id = actionSheetCaseId
    if (!id) return
    setActionSheetCaseId(null)
    editCase(id)
  }
  const addLocation = (caseId: string) => {
    setTargetCaseId(caseId)
    setLocForm(blankLocForm)
    setLocDraftId(`draft-l${uiSeq++}`)
    store.getState().openModal('newLocation')
  }
  const openImport = (caseId: string) => {
    setTargetCaseId(caseId)
    setImp(blankImport)
    store.getState().openModal('import')
  }
  /**
   * Long-press (or the row's ⋯ button) on a location — the phone's `handleLocationLongPress`.
   * Resolves the source and its siblings from LIVE state, pre-dedupes the suggested name, and
   * opens the chooser. A source that no longer resolves gets the phone's "Location not found."
   * notice rather than an empty modal.
   */
  const openLocationActions = (locationId: string) => {
    const st = store.getState()
    const source = st.locations.find((l) => l.id === locationId)
    if (!source) {
      setNotice(LOCATION_NOT_FOUND_NOTICE)
      return
    }
    // Sibling names include the source's own — a duplicate may never reuse it.
    const existingNames = st.locations.filter((l) => l.caseId === source.caseId).map((l) => l.locationName)
    setDupState({ sourceId: locationId, existingNames })
    setDupName(generateCopyName(source.locationName, existingNames))
    st.openModal('duplicateLocation')
  }
  const closeLocationActions = () => {
    setDupState(null)
    store.getState().closeModal()
  }
  /** "Duplicate Location [with Scopes]" — creates the sibling and stays on the list, like the phone. */
  const submitDuplicate = (name: string, mode: DuplicateMode) => {
    if (!dupState) return
    const id = store.getState().duplicateLocation(dupState.sourceId, name, mode)
    closeLocationActions()
    if (id === null) {
      setNotice(DUPLICATION_FAILED_NOTICE)
      return
    }
    // Report the STORED name (trimmed by the action), not the raw field value.
    const created = store.getState().locations.find((l) => l.id === id)
    setNotice(duplicatedNotice(created?.locationName ?? name, mode))
  }

  /**
   * "New Location w/ Sub Info [+ Scopes]" — the phone's `handleNewAddress`: close the chooser,
   * open the create-location card pre-filled from the source (name pre-deduped from
   * "New Location", on-site contact carried) with the address left blank and REQUIRED. The
   * requester block is not seeded here at all: `duplicateToNewAddress` reads it from the source
   * (same mechanism as the phone, whose `NewAddressOverrides` also has no requester fields).
   */
  const openNewAddressCard = (mode: DuplicateMode) => {
    if (!dupState) return
    const st = store.getState()
    const source = st.locations.find((l) => l.id === dupState.sourceId)
    if (!source) {
      closeLocationActions()
      setNotice(LOCATION_NOT_FOUND_NOTICE)
      return
    }
    setNewAddrState({ sourceId: dupState.sourceId, mode, existingNames: dupState.existingNames })
    setLocDraftId(`draft-l${uiSeq++}`)
    setLocForm({
      ...blankLocForm,
      locationName: ensureUniqueLocationName('New Location', dupState.existingNames),
      locationContact: source.locationContact,
      locationPhone: source.locationPhone,
    })
    setDupState(null)
    st.openModal('newAddressLocation') // replaces the chooser
  }
  /** "Export ZIP" / "Export GeoJSON": close the chooser (phone does), then tell the truth. */
  const exportFromChooser = (message: string) => {
    closeLocationActions()
    setNotice(message)
  }
  const closeNewAddressCard = () => {
    setNewAddrState(null)
    store.getState().closeModal()
  }
  /** Creates the independent location and opens it — the phone navigates to the wizard here. */
  const submitNewAddressLocation = () => {
    if (!newAddrState) return
    const id = store.getState().duplicateToNewAddress(
      newAddrState.sourceId,
      {
        locationName: locForm.locationName,
        businessName: locForm.businessName,
        streetAddress: locForm.streetAddress,
        city: locForm.city,
        locationContact: locForm.locationContact,
        locationPhone: locForm.locationPhone,
        // The provenance stamp travels WITH the coordinates (P3.4, §52.4's seam): this card
        // mounts the SAME `NewLocationModal`, so its GPS button is the real multi-sample
        // capture and stamps `'gps'`, while an address pick stamps `'geocoded'`. Flattening
        // both to `'geocoded'` here — the shape P3.5 inherited from the no-op era — would
        // have relabelled every real fix as a geocode. `submitLocation` does the same.
        gps: locForm.coordinates,
      },
      newAddrState.mode,
    )
    if (id === null) {
      // Phone parity (`cases.tsx`: "Don't clear newAddressState on error — let the user retry"):
      // the card stays open. Only reachable if something bypasses the card's own gate.
      setNotice(NEW_ADDRESS_FAILED_NOTICE)
      return
    }
    const created = store.getState().locations.find((l) => l.id === id)
    const mode = newAddrState.mode
    closeNewAddressCard()
    openLocation(id)
    setNotice(newAddressCreatedNotice(created?.locationName ?? locForm.locationName, mode))
  }

  /**
   * THE New Case sheet's mode, derived ONCE (review R-11). The render arm and `submitCase` used
   * to derive it separately — the render from `cases.find(caseEditId)` with a deliberate
   * create-mode fallback for a case deleted out from under an open sheet, the submit from a
   * bare `caseEditId !== null`. When they disagreed the sheet said "Create Case", ran the create
   * confirmation, and then took the EDIT branch into a guarded no-op: confirming created
   * nothing, silently. No UI path reaches that today (the scrim covers the rows and every
   * opener re-seeds), which is why it was filed as latent — but the fallback exists precisely
   * for that scenario and applying it to only one of two discriminators is how it stops being
   * latent later.
   */
  const editingCase = caseEditId === null ? undefined : cases.find((c) => c.id === caseEditId)

  /** Create, or save an edit. Throws (`DuplicateCaseNumberError`) straight into the modal's
   *  catch — the banner is the modal's job, and swallowing it here would lose the case
   *  silently. Field trimming + the strict coordinate parse live in `caseFormToInput`. */
  const submitCase = () => {
    if (editingCase) {
      store.getState().updateCase(editingCase.id, caseFormToEdits(caseForm))
      closeCaseModal()
      return
    }
    const id = store.getState().createCase(caseFormToInput(caseForm))
    setExpandedCaseId(id)
    closeCaseModal()
  }
  /** Map incident card → the incident-only editor, seeded from the case (matrix rows 22 → 23).
   *  A missing case is a no-op rather than an empty modal — the phone's `handleEditCase` makes
   *  the same call (it toasts "Case Not Found"; the demo reads from the store it just rendered
   *  the pin from, so the miss is unreachable rather than merely handled). */
  const editIncident = (caseId: string) => {
    const target = store.getState().cases.find((c) => c.id === caseId)
    if (!target) return
    setIncidentCaseId(caseId)
    setIncidentForm(caseToIncidentValues(target))
    store.getState().openModal('editIncident')
  }
  /**
   * Persist the incident edit. The editor emits ONLY the incident fields, so the rest of the
   * case is untouched (phone map.tsx:163-176).
   *
   * The phone follows this with a `reloadToken` bump, because its MapHost re-reads SQLite. The
   * demo has no such indirection: `mapData` is a `useMemo` over the store's `cases`/`locations`,
   * and `updateIncidentLocation` produces a new `cases` array — so the store write IS the
   * refresh, and the incident pin, the sheet row and the open detail card all re-render from it.
   */
  const submitIncidentLocation = () => {
    if (incidentCaseId) store.getState().updateIncidentLocation(incidentCaseId, incidentValuesToPatch(incidentForm))
    closeIncidentModal()
  }
  /** The §56j hardening, applied to the sibling it missed (review R-12): both close paths clear
   *  the seed as well as the modal, so the guarantee lives at the close rather than resting on
   *  every future opener remembering to re-seed. Unreachable today — `editIncident` re-seeds on
   *  every open and `modal` is excluded from snapshots — which is exactly what §56j said about
   *  `closeCaseModal` before it was hardened. */
  const closeIncidentModal = () => {
    setIncidentCaseId(null)
    setIncidentForm(blankIncidentForm)
    store.getState().closeModal()
  }
  const submitLocation = () => {
    const caseId = targetCaseId ?? store.getState().currentCaseId
    if (caseId) {
      // The provenance stamp travels WITH the coordinates now (P3.4): `LocationFields` decides
      // it — `'gps'` for a real capture, `'geocoded'` for an address pick — so the bridge no
      // longer overwrites both sources with a flat `'geocoded'`.
      store.getState().addLocation(caseId, { ...locForm, gps: locForm.coordinates })
    }
    store.getState().closeModal()
  }

  // ---- delete (P3.1, matrix rows 10 CRUD + 15) -------------------------------------------
  // The row hands up an id; the dialog's copy is derived HERE from live store entities, so a
  // dialog can never outlive or misdescribe what it is about to destroy.
  const deleteTarget = useMemo<DeleteTarget | null>(() => {
    if (!pendingDelete) return null
    if (pendingDelete.kind === 'case') {
      const c = cases.find((x) => x.id === pendingDelete.id)
      return c
        ? {
            type: 'case',
            caseNumber: c.caseNumber,
            locationNames: locations.filter((l) => l.caseId === c.id).map((l) => l.locationName),
          }
        : null
    }
    const l = locations.find((x) => x.id === pendingDelete.id)
    return l
      ? {
          type: 'location',
          locationName: l.locationName,
          // Same composition as the row the visitor pressed (screenData's `locationsOf`), so
          // the dialog echoes what they were looking at rather than a differently-built string.
          address: formatAddress('', l.streetAddress, l.city),
        }
      : null
  }, [pendingDelete, cases, locations])

  /**
   * The store repairs the SELECTION pair (R-19). This repairs the delete's bridge-local
   * shadows of the same thing — state the store has no idea exists and that would otherwise
   * point at an entity that no longer does: the expanded card, the Map tab's viewer case, and
   * the Completion screen's per-location "review again" key.
   */
  const confirmDelete = () => {
    if (!pendingDelete) return
    const { kind, id } = pendingDelete
    // R-2: sweep the doomed locations' captures BEFORE the store drops them. The store is sole
    // owner of a saved capture's object URL (§58g), so once the rows are gone nothing in the
    // page can reach the blobs and their bytes stay pinned for the tab's life — the natural
    // demo loop (create → capture → delete → repeat) leaks a full photo or clip per cycle.
    // Same shape as `deleteMediaItem`: revoke first, and never gate the store write on it.
    const doomed = kind === 'case' ? locations.filter((l) => l.caseId === id) : locations.filter((l) => l.id === id)
    const io = readBrowserObjectUrls()
    if (io !== null) revokeCapturedUrls(io, collectMediaUrls(doomed))
    if (kind === 'case') {
      store.getState().deleteCase(id)
      setExpandedCaseId((prev) => (prev === id ? null : prev))
      setMapViewerCaseId((prev) => (prev === id ? null : prev)) // → the map's picker, not a dead case
      setReviewAgainFor((prev) => (prev !== null && locations.some((l) => l.id === prev && l.caseId === id) ? null : prev))
    } else {
      store.getState().deleteLocation(id)
      setReviewAgainFor((prev) => (prev === id ? null : prev))
    }
    setPendingDelete(null)
  }

  /**
   * Per-run stage forwarder. Token-guarded (p1-review R-24): every other import
   * checkpoint validates importGen, but the old bare setImp let a cancelled run's late
   * onStage('normalizing'|'done') drive a NEWER run's headline/bar — and, post-P1.5,
   * corrupt its frozen-on-failure stage. lastRealStage rides the same updater (R-11)
   * and is mirrored into a ref so event-scope code (the guardImportRun catch) can read
   * the run's real stage without an impure state read (fix-delta R-40).
   *
   * The mirror is RUN-scoped in meaning but mount-scoped in lifetime, so it must be
   * cleared wherever the run token moves (fix-delta R-45): its state twin
   * (`imp.lastRealStage`) is nulled by blankImport/onRetry, the ref was nulled nowhere,
   * and a throw landing in a new run's pre-seed window then published the PREVIOUS
   * run's stage as if it were this one's — strictly more stale-prone than the
   * `s.activeStage` read R-40 replaced. Cleared at both token bumps (the runs' own
   * entry points, so `openImport` is covered too) plus onCancel's bump, belt-and-braces.
   * With the clear, `?? 'extracting_text'` at the sole read reproduces exactly the
   * honest pre-R-40 default for a pre-seed throw.
   */
  const lastRealStageRef = useRef<ImportRealStageId | null>(null)
  const importStageFor = (myGen: number) => (st: RunStageId) => {
    if (importGen.current !== myGen) return // stale run — display writes drop too
    if (st !== 'error') lastRealStageRef.current = st
    setImp((s) => ({ ...s, activeStage: st, lastRealStage: st === 'error' ? s.lastRealStage : st }))
  }

  // Exhaustive by construction (review M2): every FallbackMode must decide its notice
  // here — a new variant is a compile error, not a silently-missing warning. Only
  // 'none' (the visitor's own document was used) legitimately renders nothing.
  const fallbackNotice = (mode: FallbackMode): string | undefined => {
    switch (mode) {
      case 'none':
        return undefined
      case 'sample':
        return 'Live import was disabled — imported the sample request instead.'
      case 'unavailable':
        return 'Live model not configured — imported the sample request instead.'
      case 'error':
        return 'Couldn’t reach the live model — imported the sample request instead.'
      default: {
        const exhaustive: never = mode
        return exhaustive
      }
    }
  }

  // Forward-geocode the imported address BEFORE creating the location (mirrors the phone's
  // persistMappedImport) so imported locations land on the map. Non-blocking: no token / no match
  // → the location is still created, just without a pin. The generation token is re-checked
  // AFTER the geocode await (review H2): a cancel landing during the round-trip must discard
  // the run — returns null and writes nothing.
  const applySuccess = async (
    caseId: string,
    res: Extract<ImportRunResult, { ok: true }>,
    myGen: number,
    emitter: ImportLogEmitter,
  ): Promise<string | null> => {
    const query = buildGeocodeQuery(res.patch.streetAddress, res.patch.city, res.patch.businessName)
    if (query) emitter.log('CASE', 'forward geocode → Mapbox', `query: '${query}'`)
    else emitter.log('CASE', 'geocode skipped — no usable address in the import')
    const coords = query ? await forwardGeocode(query) : null
    if (importGen.current !== myGen) return null // cancelled mid-geocode — do not touch the store
    if (query) {
      if (coords) emitter.log('CASE', 'geocode ✓', `lng ${coords.lng.toFixed(5)} · lat ${coords.lat.toFixed(5)}`)
      else emitter.log('CASE', 'geocode — no match; creating the location without a map pin')
    }
    const id = store.getState().addLocation(caseId, {
      locationName: res.patch.businessName || res.filename || 'Imported location',
      gps: coords ? { lat: coords.lat, lng: coords.lng, source: 'geocoded' } : undefined,
    })
    store.getState().applyImport(res.patch)
    return id
  }

  /**
   * A per-file failure plus the single-run enrichment fields (row 79) the card can
   * render. `code`/`details` are REQUIRED (fix-delta R-41): every source is the
   * post-R-29 failure arm (or the backstop's synthetic row), so optionality here was
   * the one layer where a future bare push could silently drop the enrichment.
   * `partialData` stays optional — honestly conditional.
   */
  interface RunFailure extends ImportFailure {
    code: ImportErrorCode
    details: ImportErrorDetails
    partialData?: ImportPartialData
  }
  interface ImportTally {
    lastLocId: string | null
    notice: string | undefined
    locations: ImportedLocationView[]
    failures: RunFailure[]
    /**
     * The run's files that have not been accounted for yet, in order — the head is the
     * file the run is AT (in flight, or the next one up before the loop's first seed),
     * drained as each lands in `locations` or `failures`. Exists so the
     * throw backstop can keep the tally COMPLETE (fix-delta R-46): every downstream count
     * is `locations.length + failures.length` (deriveTerminalOutcome, the result view's
     * "Imported N of M", the DONE line), a sum that is only sound while the tally accounts
     * for every file in the run. An aborted batch otherwise shrank its own denominator —
     * 3 files with a throw on file 2 reported "1 of 2" — and the casualty was spelled with
     * the 'import' sentinel. Empty on the paste path: one document, and no file to name.
     */
    unaccounted: string[]
  }
  const recordSuccess = async (caseId: string, caseNumber: string, res: Extract<ImportRunResult, { ok: true }>, tally: ImportTally, myGen: number, emitter: ImportLogEmitter) => {
    const locId = await applySuccess(caseId, res, myGen, emitter)
    if (locId === null) return // run invalidated mid-geocode — nothing was written, tally untouched
    // The demo's applyImport never writes the OCC# — mapAiToForm drops it and the case
    // record keeps its own number (same rule as the phone's case injection).
    emitter.log('CASE', 'inject case data ← case record', `occurrenceNumber: '${caseNumber}' — from the selected case, never the model`)
    emitter.log('OK', 'import ✓ · location created', `locationId: ${locId}`)
    tally.lastLocId = locId
    tally.notice = tally.notice ?? fallbackNotice(res.fallbackMode)
    tally.locations.push(
      buildImportedLocationView({
        patch: res.patch,
        caseNumber,
        warnings: res.warnings.map((w) => ({ field: w.field, reason: w.reason })),
        locId,
        fieldCount: res.fieldCount,
        timeFrameCount: res.timeFrameCount,
        filename: res.filename,
        fallbackMode: res.fallbackMode, // per-card sample attribution (review M1)
      }),
    )
  }
  const finishImport = (t: ImportTally, emitter: ImportLogEmitter, totalFiles: number) => {
    // No successful locations → honest failure result (ok=false); the failure view shows the
    // per-file failures card. A success always carries at least one location.
    // The log's last word matches: DONE only when something imported (an all-failed run
    // already ended in ERR lines); a partial batch truthfully reports its failed count.
    if (t.locations.length > 0) {
      if (totalFiles > 1) emitter.log('DONE', 'batch complete', `success: ${t.locations.length} · failed: ${t.failures.length} · ${emitter.elapsed()}ms`)
      else emitter.log('DONE', 'import complete', `${emitter.elapsed()}ms`)
    }
    // A single failed run surfaces ITS error directly, enriched (code → friendly copy,
    // details → Technical Details, partialData → Data Found); the per-file card would be
    // redundant for one file. A multi-file all-failed run keeps the aggregate + rows.
    const single = totalFiles === 1 && t.failures.length === 1 ? t.failures[0] : null
    const result: ImportResult =
      t.locations.length === 0
        ? single
          ? { ok: false, error: single.error, code: single.code, details: single.details, partialData: single.partialData }
          : { ok: false, error: `${t.failures.length} import${t.failures.length === 1 ? '' : 's'} failed.`, failures: t.failures }
        : { ok: true, locations: t.locations, failures: t.failures, notice: t.notice }
    // THE DWELL (P1.5, row 73): the stage stays 'progress' — computeImportStage keeps the
    // terminal up (its badge morphs into the outcome CTA) until onReviewImport acknowledges.
    // activeStage/batch are kept so the frozen bar and the batch-aware CTA copy stay truthful.
    // `stage: 'progress'` is pinned explicitly (fix-delta R-39): every result write must
    // land in a pairing computeImportStage renders — a backstop-reported throw can arrive
    // before the run's first stage flip (deferred §36 writer inventory).
    setImp((s) => ({ ...s, stage: 'progress', result, lastLocId: t.lastLocId }))
  }

  /**
   * Last-resort backstop for the whole run (p1-review R-23b; reworked by fix-delta
   * R-38/R-39). Nothing in the pipeline is EXPECTED to throw (every callee guards
   * internally), but if something ever does, the old shape hung the dwell forever:
   * PickerStage's catch is unmounted by the stage flip (R-23a, P1.2's half) and
   * finishImport was the only result writer.
   *
   * The catch tells the WHOLE truth (R-38): it takes the run's tally, pushes a
   * synthetic failure row, and reports through finishImport — so files that already
   * landed in the store are still shown (amber partial, per-file rows) instead of a
   * total-failure card that denies them and invites duplicating Retry. finishImport
   * also pins `stage: 'progress'` (R-39), so a throw landing before the first stage
   * flip still renders as the failure dwell instead of a nowhere-state; the dwell
   * then releases through the normal CTA path. Token-checked so a superseded run's
   * throw cannot clobber a newer run's state.
   */
  const guardImportRun = async (
    myGen: number,
    emitter: ImportLogEmitter,
    tally: ImportTally,
    totalFiles: number,
    run: () => Promise<void>,
  ) => {
    try {
      await run()
    } catch (e) {
      console.error('[demo/import] import run threw unexpectedly', e)
      const detail = e instanceof Error ? e.message : String(e)
      emitter.log('ERR', '✗ import run threw unexpectedly', detail) // no-op if superseded/reset
      if (importGen.current !== myGen) return
      const stage = lastRealStageRef.current ?? 'extracting_text'
      // Account for the WHOLE run (R-46): one synthetic row for the file that was in
      // flight, plus a row per file the aborted loop never reached. Without them the
      // unattempted files were in neither array and every derived count summed over a
      // tally that was incomplete by construction. `UNEXPECTED_ERROR` is right for both:
      // it is the bridge-only code (the phone's UNKNOWN_ERROR parity) and is deliberately
      // unmapped in ERROR_MESSAGES, so each row's own honest string renders verbatim.
      const [threw, ...skipped] = tally.unaccounted
      tally.failures.push({
        filename: threw ?? 'import', // the paste path has no filename — sentinel kept
        error: 'The import failed unexpectedly. Please try again.',
        code: 'UNEXPECTED_ERROR',
        details: { stage, detail },
      })
      for (const name of skipped) {
        tally.failures.push({
          filename: name,
          error: 'Not attempted — the import stopped after an unexpected failure.',
          code: 'UNEXPECTED_ERROR',
          details: { stage, detail: `The run stopped before this file was attempted: ${detail}` },
        })
      }
      setImp((s) => ({ ...s, activeStage: 'error' }))
      finishImport(tally, emitter, totalFiles)
    }
  }

  // PickerStage validates the selection (all-PDF, batch confirm) and hands File[] up here.
  const processPdfFiles = async (files: File[]) => {
    const caseId = targetCaseId ?? store.getState().currentCaseId
    if (!caseId) {
      setImp((s) => ({ ...s, stage: 'result', result: { ok: false, error: 'Select a case first.' } }))
      return
    }
    const caseNumber = cases.find((c) => c.id === caseId)?.caseNumber ?? '—'
    const myGen = ++importGen.current // this run's token — any bump invalidates it
    lastRealStageRef.current = null // R-45: the stage mirror is run-scoped — never inherit the last run's
    // One log run per import (a batch is ONE run, like the phone). beginRun clears the
    // previous run's retained lines; the emitter self-invalidates when superseded/reset.
    const emitter = importLogBus.beginRun(logClock)
    const total = files.length
    // Hoisted OUT of the guarded closure (R-38): the catch reports through this tally,
    // so already-landed files stay visible even when a later file's run throws. Seeded
    // with every selected filename (R-46) so an aborted run can still report its full size.
    const tally: ImportTally = { lastLocId: null, notice: undefined, locations: [], failures: [], unaccounted: files.map((f) => f.name) }
    await guardImportRun(myGen, emitter, tally, total, async () => {
      if (total > 1) emitter.log('INIT', 'batch import', `${total} files`)
      else emitter.log('INIT', 'reading document…')
      for (let i = 0; i < total; i++) {
        if (importGen.current !== myGen) return // cancelled, or a newer run started
        lastRealStageRef.current = 'extracting_text'
        setImp((s) => ({ ...s, stage: 'progress', batch: { current: i + 1, total }, activeStage: 'extracting_text', lastRealStage: 'extracting_text', acknowledged: false }))
        emitter.log('FILE', `▸ file ${i + 1}/${total} '${files[i].name}'`)
        const res = await runPdfImport(files[i], { live: true, onStage: importStageFor(myGen), emitter })
        if (importGen.current !== myGen) return // cancelled while this file was processing
        if (res.ok) await recordSuccess(caseId, caseNumber, res, tally, myGen, emitter)
        else tally.failures.push({ filename: res.filename ?? 'file', error: res.error, code: res.code, details: res.details, partialData: res.partialData })
        tally.unaccounted.shift() // this file is now in locations or failures (R-46)
      }
      if (importGen.current !== myGen) return // invalidated during the last file's geocode — don't overwrite a newer run's result
      finishImport(tally, emitter, total)
    })
  }

  // One text pipeline for both entry points: the paste stage's textarea AND the picker's
  // clipboard card (P1.2/D5 — clipboard text feeds the same AI path as pasted text).
  const runTextImportFlow = async (documentText: string) => {
    const caseId = targetCaseId ?? store.getState().currentCaseId
    if (!caseId) {
      setImp((s) => ({ ...s, stage: 'result', result: { ok: false, error: 'Select a case first.' } }))
      return
    }
    if (!documentText.trim()) {
      // Backstop only — the paste stage disables its submit on blank text and the clipboard
      // card rejects an empty clipboard before calling up (phone parity: UI + service guard).
      setImp((s) => ({ ...s, stage: 'result', result: { ok: false, error: 'Paste the request text first.' } }))
      return
    }
    const caseNumber = cases.find((c) => c.id === caseId)?.caseNumber ?? '—'
    const myGen = ++importGen.current // this run's token — any bump invalidates it
    lastRealStageRef.current = null // R-45: the stage mirror is run-scoped — never inherit the last run's
    const emitter = importLogBus.beginRun(logClock)
    // No `unaccounted` names: the paste path is one document with no filename, so its
    // backstop row keeps the 'import' sentinel and its totals were never derivable wrong.
    const tally: ImportTally = { lastLocId: null, notice: undefined, locations: [], failures: [], unaccounted: [] }
    await guardImportRun(myGen, emitter, tally, 1, async () => {
      emitter.log('INIT', 'reading pasted text…')
      lastRealStageRef.current = 'reading_model'
      setImp((s) => ({ ...s, stage: 'progress', batch: null, activeStage: 'reading_model', lastRealStage: 'reading_model', acknowledged: false }))
      const res = await runTextImport({ documentText, live: true, onStage: importStageFor(myGen), emitter })
      if (importGen.current !== myGen) return // cancelled, or a newer run started
      if (res.ok) await recordSuccess(caseId, caseNumber, res, tally, myGen, emitter)
      else tally.failures.push({ filename: res.filename ?? 'request', error: res.error, code: res.code, details: res.details, partialData: res.partialData })
      if (importGen.current !== myGen) return // invalidated during the geocode — don't overwrite a newer run's result
      finishImport(tally, emitter, 1)
    })
  }

  const runPasteImport = () => runTextImportFlow(imp.text)

  // ---- time offset + OCR (the marquee) ----
  // `regenerate: false` is the phone's "Keep My Edits" arm (`performOcrCalculation(result, false)`,
  // phone `ocr-capture.tsx:225-230`): recompute the offset, leave the edited extracted-scope list
  // alone. Defaults to true — the Time Offset screen's Calculate always regenerates, behind its
  // own confirmation.
  const calcOffset = (regenerate = true) => {
    store.getState().calculateOffset()
    if (regenerate) store.getState().generateExtractedScopes()
  }
  // "Use Current Time": simulated atomic-clock sync — stamps ONLY the real-time field with the
  // calibrated device time and records the sync metadata. Never touches the DVR time.
  const runTimeSync = () => {
    if (syncTimer.current) clearTimeout(syncTimer.current)
    setSyncing(true)
    syncTimer.current = setTimeout(() => {
      const { calibratedMs, sync } = simulateNtpSync()
      const st = store.getState()
      st.updateField('capture.actualDateTime', getCurrentFormattedTime(calibratedMs))
      st.updateField('capture.sync', sync)
      setSyncing(false)
      syncTimer.current = null
    }, 1100)
  }
  const resetOcr = () => {
    setOcrResult(null)
    setOcrDraft('')
    setOcrDateConfirmed(false)
    ocrProof.current = null
  }
  /**
   * ONE presentation path for every OCR read — sample frame or live camera. The raw text goes
   * through the ported clean/parse pipeline, the proof is staged (written to the store only on
   * commit — nothing about a rejected read survives Cancel), and the capture instant is frozen
   * here (the phone freezes it at the shutter).
   */
  const runOcrRead = (read: { rawText: string; confidence: number; measured: boolean; imageDataUrl?: string; fallbackActual: string }) => {
    const cleaned = cleanOcrText(read.rawText)
    const reading = readDvrTimestamp(cleaned, clock.now().getTime())
    const conf = getConfidenceLevel(read.confidence)
    const actual = store.getState().capture.actualDateTime || read.fallbackActual
    ocrProof.current = {
      rawText: read.rawText,
      cleanedText: cleaned,
      confidence: read.confidence,
      ...(read.imageDataUrl !== undefined ? { imageDataUrl: read.imageDataUrl } : {}),
    }
    setOcrDateConfirmed(false)
    setOcrDraft(reading?.dvrTime ?? '')
    setOcrResult(
      reading
        ? {
            ok: true,
            dvrTime: reading.dvrTime,
            confidence: { label: conf.message, color: conf.color, measured: read.measured },
            actual,
            resolution: reading.resolution,
          }
        : { ok: false, rawText: cleaned },
    )
  }
  const runOcrSample = (frame: OcrSampleFrame) =>
    runOcrRead({
      rawText: OCR_SAMPLE_FRAMES[frame],
      confidence: OCR_SAMPLE_CONFIDENCE, // the fixed sample score — badged, not measured
      measured: false,
      fallbackActual: SAMPLE_ACTUAL_TIME,
    })
  /** A live camera frame (P4.7): measured confidence, the strip image for the proof, and the
   *  device's calibrated "now" — a real frame must not borrow the sample's fixed instant. */
  const runOcrLive = (read: OcrLiveRead) =>
    runOcrRead({
      rawText: read.rawText,
      confidence: read.confidence,
      measured: true,
      imageDataUrl: read.imageDataUrl,
      fallbackActual: getCurrentFormattedTime(clock.now().getTime()),
    })
  /**
   * "Use this & calculate": the operator's (possibly corrected) value is what gets committed.
   * `regenerate` carries the answer to the phone's recalculate prompt — false is "Keep My Edits".
   */
  const confirmOcr = (regenerate: boolean) => {
    // Same gate the CTA is disabled by — enforced here too so the commit path, not just the
    // button, is what refuses an empty draft or an unconfirmed assumed date.
    if (!ocrResult?.ok || !isDvrDraftCommittable(ocrDraft, ocrResult.resolution, ocrDateConfirmed)) return
    const st = store.getState()
    st.updateField('capture.method', 'ocr')
    if (!st.capture.actualDateTime) st.updateField('capture.actualDateTime', ocrResult.actual)
    st.updateField('capture.dvrDateTime', ocrDraft)
    if (ocrProof.current) {
      // parsedDateTime records what OCR READ; capture.dvrDateTime records what the operator
      // COMMITTED. When they differ, the offset report can show the correction.
      st.updateField('capture.ocr', { ...ocrProof.current, parsedDateTime: ocrResult.dvrTime })
    }
    calcOffset(regenerate)
    store.getState().closeLaunch()
    resetOcr()
  }
  const cancelOcr = () => {
    store.getState().closeLaunch()
    resetOcr()
  }

  // ---- PDF preview + completion ----

  /**
   * Run the gate against LIVE store state, not the render-time snapshot above: a click handler
   * created in an earlier render would otherwise judge stale data. `gateOutcome` (render scope)
   * exists only to drive the auto-clear.
   */
  const runGate = () => {
    const st = store.getState()
    const loc = st.locations.find((l) => l.id === st.currentLocationId) ?? null
    const owner = loc ? (st.cases.find((c) => c.id === loc.caseId) ?? null) : null
    return validateFinalSubmission(toFinalSubmissionInput(loc, owner))
  }

  /** The blocked alert's second arm (`completion.tsx:377` → `handleSaveProgress`). */
  const saveProgress = () => {
    // Honesty rule (parity plan §4; review R-2): promise refresh survival ONLY when the
    // persistence layer is genuinely writing. Read here, at alert time, so a write failure
    // that revoked the promise mid-session demotes the very next alert. A missing handle is
    // treated as "not storing" — never assume.
    const stored = persistenceRef.current?.isLive() ?? false
    setAlert({
      title: PROGRESS_SAVED_TITLE,
      message: stored ? PROGRESS_SAVED_BODY : PROGRESS_NOT_STORED_BODY,
      actions: [
        {
          label: 'OK',
          onPress: () => {
            setAlert(null)
            store.getState().setView('cases') // phone: router.dismissTo('/(tabs)/cases')
          },
        },
      ],
    })
  }

  const previewCaseNotes = () => {
    // The phone gates the PDF on the same schema (`handlePreviewPdf`, completion.tsx:170-178).
    // DEVIATION (deliberate): the phone alerts with `validationErrors.join('\n')` read from
    // React state that `validateRequiredFields()` only just called `setValidationErrors` on —
    // so its FIRST blocked tap shows an empty alert body. We alert with the errors this run
    // produced. Logged for the phone-repo follow-up ledger; copying the bug is not parity.
    const outcome = runGate()
    if (!outcome.ok) {
      setGateErrors(outcome.errors)
      setAlert({
        title: MISSING_FIELDS_TITLE,
        message: outcome.errors.join('\n'),
        actions: [{ label: 'OK', onPress: closeAlert }],
      })
      return
    }
    setGateErrors(dropGateErrors)
    setPdf({ title: 'Case Notes — PDF', html: generateCaseNotesDoc(selectCaseNotesData(store.getState())) })
  }

  /** "Complete & Save" — gated, then the existing location-scoped completion, untouched. */
  const completeLocation = () => {
    const st = store.getState()
    const loc = st.locations.find((l) => l.id === st.currentLocationId)
    if (!loc) return // canComplete already disables the CTA; belt and braces for the R-19 law
    const outcome = runGate()
    if (!outcome.ok) {
      setGateErrors(outcome.errors)
      setAlert({
        title: MISSING_FIELDS_TITLE,
        message: MISSING_FIELDS_BODY,
        actions: [
          { label: 'Cancel', style: 'cancel', onPress: closeAlert },
          { label: 'Save Progress', onPress: saveProgress },
        ],
      })
      return
    }
    setGateErrors(dropGateErrors)
    st.completeCase(loc.caseId) // the case that OWNS the location — always coherent
    setReviewAgainFor(null) // re-completing from review-again returns to the confirmation
  }

  const previewTimeOffset = () => {
    const off = currentLocation?.form.timeOffset
    const addr = formatAddress(currentLocation?.businessName, currentLocation?.streetAddress, currentLocation?.city)
    setPdf({
      title: 'Time-Offset Calibration',
      html: generateTimeOffsetDoc({
        occNumber: currentCase?.caseNumber,
        address: addr,
        isCorrect: off?.isCorrect,
        formattedDiff: off?.formattedDifference,
        direction: off?.direction,
        dvrDateTime: off?.dvrDateTime,
        actualDateTime: off?.actualDateTime,
        captureMethod: off?.captureMethod,
        // The OCR evidence block (P4.7): raw/cleaned/parsed always travel with an OCR-method
        // offset; the strip image exists only for a live camera read — the template renders
        // no image block without it, which is the honest shape for a sample commit.
        ocrImageDataUrl: off?.ocr?.imageDataUrl,
        ocrRawText: off?.ocr?.rawText,
        ocrCleanedText: off?.ocr?.cleanedText,
        ocrParsedDateTime: off?.ocr?.parsedDateTime,
        dvrAppliesDST: off?.dvrAppliesDST,
        sync: off?.sync ?? null,
      }),
    })
  }

  const showTabs = view === 'dashboard' || view === 'cases' || view === 'map'

  function activeScreen() {
    // R-35: a wizard screen with no open location is a dead form (every keystroke silently
    // discarded) — show the honest notice instead. Completion is exempt: it has its own
    // reviewed no-location treatment (disabled CTA + truthful hint, R-19).
    if (!currentLocation && view !== 'completion' && (WIZARD_SCREENS as readonly string[]).includes(view)) {
      return noLocationNotice(() => store.getState().setView('cases'))
    }
    switch (view) {
      case 'splash':
        return <SplashScreen authState="idle" onScan={() => store.getState().setView('dashboard')} />
      case 'dashboard':
        return <DashboardScreen cases={caseCards} onOpenLocation={openLocation} onCaseActions={openCaseActions} />
      case 'cases':
        return (
          <CasesScreen
            cases={caseCards}
            expandedId={expandedCaseId}
            onToggle={(id) => setExpandedCaseId((prev) => (prev === id ? null : id))}
            onNewCase={newCase}
            onOpenLocation={openLocation}
            onAddLocation={addLocation}
            onImport={openImport}
            onDeleteCase={(id) => setPendingDelete({ kind: 'case', id })}
            onDeleteLocation={(id) => setPendingDelete({ kind: 'location', id })}
            onLocationActions={openLocationActions}
          />
        )
      case 'submission': {
        const fields: SubmissionFields = {
          requesterName: currentLocation?.requesterName ?? '',
          requesterBadge: currentLocation?.requesterBadge ?? '',
          requesterUnit: currentLocation?.requesterUnit ?? '',
          requesterPhone: currentLocation?.requesterPhone ?? '',
          requesterEmail: currentLocation?.requesterEmail ?? '',
          businessName: currentLocation?.businessName ?? '',
          streetAddress: currentLocation?.streetAddress ?? '',
          city: currentLocation?.city ?? '',
          locationContact: currentLocation?.locationContact ?? '',
          locationPhone: currentLocation?.locationPhone ?? '',
        }
        // SubmissionFields keys are DemoLocation field names, so each key is a valid updateField path as-is.
        // `onCoordinates` is the ONE coordinate write path for this screen — a GPS capture and an
        // address pick both arrive here already stamped with their own source (P2.3).
        return (
          <SubmissionScreen
            occNumber={currentCase?.caseNumber ?? ''}
            locationId={currentLocation?.id}
            fields={fields}
            coordinates={currentLocation?.gps}
            onChange={(f, v) => store.getState().updateField(f, v)}
            onCoordinates={(c) => store.getState().updateField('gps', { lat: c.lat, lng: c.lng, accuracyM: c.accuracyM, source: c.source })}
            onNext={onNext}
            onBack={onPrev}
            onMenu={openMenu}
          />
        )
      }
      case 'requestedScope': {
        const scopes = currentLocation?.form.scopes ?? []
        const sc = formList(scopes, 'form.scopes')
        return (
          <RequestedScopeScreen
            scopes={scopes}
            onChange={sc.change}
            onAdd={() => sc.add(blankScope())}
            onRemove={sc.remove}
            onNext={onNext}
            onBack={onPrev}
            onMenu={openMenu}
          />
        )
      }
      case 'arrivalDeparture': {
        const visits = currentLocation?.form.arrivalDepartures ?? []
        const v = formList(visits, 'form.arrivalDepartures')
        return (
          <ArrivalDepartureScreen
            visits={visits}
            onChange={v.change}
            onAdd={() => v.add(blankVisit())}
            onRemove={v.remove}
            onNext={onNext}
            onBack={onPrev}
            onMenu={openMenu}
          />
        )
      }
      case 'timeOffset': {
        const off = currentLocation?.form.timeOffset ?? null
        return (
          <TimeOffsetScreen
            dvrDateTime={capture.dvrDateTime}
            actualDateTime={capture.actualDateTime}
            onChangeDvr={(v) => store.getState().updateField('capture.dvrDateTime', v)}
            onChangeActual={(v) => store.getState().updateField('capture.actualDateTime', v)}
            onUseCurrentTime={runTimeSync}
            onCalculate={calcOffset}
            onCaptureOcr={() => {
              resetOcr()
              store.getState().launch('ocr')
            }}
            sync={capture.sync}
            syncing={syncing}
            result={off ? { diff: off.formattedDifference, direction: off.direction, isCorrect: off.isCorrect } : null}
            correctedScopes={selectAdjustedScopes(store.getState())}
            dvrAppliesDST={capture.dvrAppliesDST}
            onToggleDst={() => store.getState().updateField('capture.dvrAppliesDST', !capture.dvrAppliesDST)}
            dstAdvisory={dstAdvisory}
            hasExtractedScopes={(currentLocation?.form.extractedScopes.length ?? 0) > 0}
            onNext={onNext}
            onBack={onPrev}
            onMenu={openMenu}
          />
        )
      }
      case 'ocr':
        return (
          <OcrCaptureScreen
            result={ocrResult}
            dvrDraft={ocrDraft}
            onChangeDvrDraft={setOcrDraft}
            dateConfirmed={ocrDateConfirmed}
            onConfirmDate={() => setOcrDateConfirmed(true)}
            hasExtractedScopes={(currentLocation?.form.extractedScopes.length ?? 0) > 0}
            onUseSample={runOcrSample}
            onCapture={() => runOcrSample('clean')}
            onLiveRead={runOcrLive}
            onCancel={cancelOcr}
            onRetake={resetOcr}
            onConfirm={confirmOcr}
          />
        )
      case 'mediaCapture':
        return (
          <MediaCaptureScreen
            onCancel={() => store.getState().closeLaunch()}
            onSave={saveCapturedMedia}
          />
        )
      case 'extractedScope': {
        const exs = currentLocation?.form.extractedScopes ?? []
        const ex = formList(exs, 'form.extractedScopes')
        return (
          <ExtractedScopeScreen
            scopes={exs}
            onChange={ex.change}
            onRemove={ex.remove}
            onRegenerate={() => store.getState().generateExtractedScopes()}
            onNext={onNext}
            onBack={onPrev}
            onMenu={openMenu}
          />
        )
      }
      case 'dvrInfo':
        return <DvrInfoScreen dvr={currentLocation?.form.dvr ?? EMPTY_FORM.dvr} retention={retentionView} onChange={(f, v) => store.getState().updateField(`form.dvr.${f}`, v)} onNext={onNext} onBack={onPrev} onMenu={openMenu} />
      case 'cameras': {
        const cams = currentLocation?.form.cameras ?? []
        const cam = formList(cams, 'form.cameras')
        return (
          <CamerasScreen
            cameras={cams}
            onChange={cam.change}
            onAdd={() => cam.add(blankCamera())}
            onRemove={cam.remove}
            // NOT `cam.change` (P3.7): the list-edit handlers close over the camera array of the
            // render that created them, and a precise capture runs for up to 120 s. Writing that
            // captured list back would resurrect any row removed meanwhile — and an index
            // resolved before the await can name a different camera afterwards. `setCameraGps`
            // re-resolves the camera by id against current state and drops the write if it is
            // gone (the R-1/R-32 identity discipline, applied to a dynamic row list).
            onCaptureGps={(cameraId, gps) => store.getState().setCameraGps(cameraId, gps)}
            onNext={onNext}
            onBack={onPrev}
            onMenu={openMenu}
          />
        )
      }
      case 'exportInfo':
        return (
          <ExportInfoScreen
            data={currentLocation?.form.export ?? EMPTY_FORM.export}
            onChange={(f, v) => store.getState().updateField(`form.export.${f}`, v)}
            onToggleMediaPlayer={() => store.getState().updateField('form.export.mediaPlayerIncluded', !currentLocation?.form.export.mediaPlayerIncluded)}
            onNext={onNext}
            onBack={onPrev}
            onMenu={openMenu}
          />
        )
      case 'notes':
        // The seven-section editor (P2.1). Meta derives from the subscribed location;
        // copyAllText reads COMMITTED store values (the phone's documented micro-edge).
        return (
          <NotesScreen
            sections={notesMeta}
            freeText={currentLocation?.form.notesFreeText ?? ''}
            copyAllText={notesCopyAllText}
            onCommitSection={commitNoteSection}
            onCommitAddendum={commitNoteAddendum}
            onResetSection={resetNoteSection}
            onScrapAll={scrapAllNotes}
            onRestoreAll={restoreAllNotes}
            onCommitFreeText={commitNotesFreeText}
            onNext={onNext}
            onBack={onPrev}
            onMenu={openMenu}
          />
        )
      case 'completion': {
        const off = currentLocation?.form.timeOffset
        const summary: CompletionSummary = {
          occNumber: currentCase?.caseNumber ?? '—',
          location: currentLocation
            ? formatAddress(currentLocation.businessName, currentLocation.streetAddress, currentLocation.city) || currentLocation.locationName
            : '—',
          dvr: currentLocation?.form.dvr.dvrTypeBrand || '—',
          offset: off ? `${off.formattedDifference} ${off.direction}` : null,
          scopes: currentLocation?.form.scopes.length ?? 0,
          cameras: currentLocation?.form.cameras.length ?? 0,
          export: currentLocation?.form.export.exportMedia || '—',
        }
        return (
          <CompletionScreen
            summary={summary}
            // Truthful, LOCATION-scoped gate (R-1): the confirmation shows only for the
            // location that was actually completed — the case-level status only colors the
            // Cases/Dashboard cards green (G4). reviewAgain is the confirmation's way back
            // to the review form, so the court PDF is never a one-shot.
            isComplete={(currentLocation?.form.completed ?? false) && reviewAgainFor !== currentLocation?.id}
            // R-19: gate + action key on the OPEN LOCATION alone — never the selection pair.
            // Before b86cd46 only switchLocation wrote both halves, so currentCaseId could lag
            // the location and trusting it greened an unrelated case while stamping nothing.
            // Every store writer AND the rehydration repair (R-32) keep the pair coherent NOW —
            // this derivation stays as defense-in-depth (it is the R-19 law stated locally, and
            // it keeps the CTA correct even if a future writer slips). The only disabling
            // condition left is "no location open", which is exactly what the disabled hint says.
            canComplete={!!currentLocation}
            validationErrors={gateErrors}
            dateTimeCompleted={currentLocation?.form.dateTimeCompleted ?? ''}
            completedBy={currentLocation?.form.completedBy ?? ''}
            onChange={(f, v) => store.getState().updateField(`form.${f}`, v)}
            onPreviewPdf={previewCaseNotes}
            onPreviewTimeOffsetPdf={previewTimeOffset}
            onComplete={completeLocation}
            onReviewAgain={() => setReviewAgainFor(store.getState().currentLocationId)}
            onBackToDashboard={() => store.getState().setView('dashboard')}
            onBackToCases={() => store.getState().setView('cases')}
            onBack={onPrev}
            onMenu={openMenu}
          />
        )
      }
      case 'audioRecording':
        // Launch-only (P4.2 registered it, P4.6 gave it a screen). `closeLaunch` returns to the
        // wizard step the visitor came from — `currentChapter` was never touched.
        return (
          <AudioRecordingFlow
            // What the metadata form opens PRE-FILLED with for a live take — numbered off the
            // location's existing notes so two takes don't arrive with the same name. The
            // visitor is free to replace it; a sample take overrides it with the bundled
            // asset's own name (`suggestedFilenameBase`).
            defaultFilenameBase={`audio-note-${(currentLocation?.form.media.audios.length ?? 0) + 1}`}
            onSave={saveAudioNote}
            onClose={() => store.getState().closeLaunch()}
          />
        )
      case 'map':
        return <MapScreen viewerCaseId={mapViewerCaseId} mapData={mapData} onChangeCase={() => setMapPickerOpen(true)} onGoToLocation={openLocation} onEditIncident={editIncident} />
      default:
        return placeholder(view)
    }
  }

  function activeModal() {
    switch (modal) {
      case 'newCase': {
        // Generic per key, so R-13's provenance union survives the trip through the bridge —
        // a `(f, v: string)` signature is assignable to the generic prop by constraint
        // instantiation and would have erased it silently (TD-N1).
        const onChange = <K extends keyof NewCaseFields>(f: K, v: NewCaseFields[K]) =>
          setCaseForm((s) => ({ ...s, [f]: v }))
        // `editingCase` is the SAME derivation `submitCase` branches on (R-11), so the sheet
        // can never present one mode and commit the other. Its create-mode fallback — for a
        // case deleted out from under an open edit sheet — now governs both halves.
        return editingCase ? (
          <NewCaseModal mode="edit" existingCase={editingCase} form={caseForm} onChange={onChange} onSubmit={submitCase} onCancel={closeCaseModal} />
        ) : (
          <NewCaseModal form={caseForm} onChange={onChange} onSubmit={submitCase} onCancel={closeCaseModal} />
        )
      }
      case 'newLocation': {
        // Same case resolution `submitLocation` uses, so the duplicate check and the write can
        // never be looking at different cases. Names are per-case: siblings only.
        const intoCaseId = targetCaseId ?? currentCaseId
        return (
          <NewLocationModal
            form={locForm}
            draftId={locDraftId ?? undefined}
            existingNames={locations.filter((l) => l.caseId === intoCaseId).map((l) => l.locationName)}
            onChange={(patch) => setLocForm((s) => ({ ...s, ...patch }))}
            onSubmit={submitLocation}
            onCancel={() => store.getState().closeModal()}
          />
        )
      }
      case 'editIncident':
        return <EditIncidentLocationModal values={incidentForm} onChange={(patch) => setIncidentForm((s) => ({ ...s, ...patch }))} onSubmit={submitIncidentLocation} onCancel={closeIncidentModal} />
      case 'mediaLibrary':
        // P4.2 registered the id and the entry point; P4.5 gave the sheet its real body. The
        // row that opens it is gated on a location, so `currentLocation` is set here — the
        // `EMPTY_FORM.media` fallback exists only for the case where that location is deleted
        // out from under an open sheet, which shows an empty library rather than throwing.
        return (
          <MediaLibrarySheet
            media={currentLocation?.form.media ?? EMPTY_FORM.media}
            onDelete={deleteMediaItem}
            onClose={() => store.getState().closeModal()}
          />
        )
      case 'duplicateLocation':
        // Rendered only with an open dupState — the chooser's six actions all need the source
        // it was opened for, so a state-less mount would be a modal with nothing behind it.
        return dupState ? (
          <DuplicateLocationModal
            name={dupName}
            onChangeName={setDupName}
            existingNames={dupState.existingNames}
            onClose={closeLocationActions}
            onDuplicate={submitDuplicate}
            onNewAddress={openNewAddressCard}
            onExportZip={() => exportFromChooser(EXPORT_ZIP_NOTICE)}
            onExportGeoJSON={() => exportFromChooser(EXPORT_GEOJSON_NOTICE)}
          />
        ) : null
      case 'newAddressLocation':
        // The create-location card in its require-address variant (phone: a second
        // NewLocationModal instance). Same `locForm` state as the plain Add-Location caller —
        // the two are never mounted at once, exactly like the phone's pair.
        return newAddrState ? (
          <NewLocationModal
            form={locForm}
            // Its OWN write-guard identity (§45f), minted per open like the plain caller's —
            // the two share `locForm`, so a lookup left over from one must never land in the
            // other. §52.4's "the new-address card must use P3.4's REAL GPS capture, not the
            // inherited no-op" is discharged by mounting the same component with no
            // `onCaptureGps` override: the capture, the geocode toggle and the coordinate card
            // come with it.
            draftId={locDraftId ?? undefined}
            onChange={(patch) => setLocForm((s) => ({ ...s, ...patch }))}
            onSubmit={submitNewAddressLocation}
            onCancel={closeNewAddressCard}
            subtitle={NEW_ADDRESS_SUBTITLE}
            requireAddress
            existingNames={newAddrState.existingNames}
          />
        ) : null
      case 'import':
        return (
          <ImportModal
            // The dwell derivation (P1.5, row 73): the DISPLAYED stage comes from the
            // pure mode machine — a finished run keeps showing the terminal until the
            // CTA acknowledges it (phone computeImportFlowMode semantics).
            stage={computeImportStage(imp)}
            text={imp.text}
            activeStage={imp.activeStage}
            lastRealStage={imp.lastRealStage}
            result={imp.result}
            batch={imp.batch}
            // The dwell's ONLY exit: acknowledging morphs the derived stage to 'result'.
            // Guarded so a stray call mid-run (no result yet) can never fast-forward.
            onReviewImport={() => setImp((s) => (s.stage === 'progress' && s.result !== null ? { ...s, acknowledged: true } : s))}
            onPdfFilesSelected={processPdfFiles}
            onClipboardText={runTextImportFlow}
            onChoosePaste={() => setImp((s) => ({ ...s, stage: 'paste', text: '' }))}
            onTextChange={(v) => setImp((s) => ({ ...s, text: v }))}
            onRun={runPasteImport}
            onBack={() => setImp((s) => ({ ...s, stage: 'picker' }))}
            onRetry={() => {
              // No token reset here: a retry simply starts a new run, which takes
              // its own generation. An untokened clear would revive stale runs (H1).
              setImp((s) => ({ ...s, stage: 'picker', result: null, batch: null, activeStage: null, lastRealStage: null, acknowledged: false }))
            }}
            onOpenLocation={(locId) => {
              if (locId) openLocation(locId)
              store.getState().closeModal()
            }}
            onCancel={() => {
              importGen.current++ // invalidate any in-flight run's token (H1/H2)
              lastRealStageRef.current = null // R-45: the state twin is cleared by blankImport below — the mirror moves with it
              importLogBus.reset() // same rule for the log: a cancelled run's late lines must drop
              // Phone handleClose parity (ImportPickerModal.tsx:147-152): a reopen always
              // starts back at the picker step with empty text, even after a mid-run close.
              setImp(blankImport)
              store.getState().closeModal()
            }}
          />
        )
      default:
        return null
    }
  }

  return (
    <div
      data-demo-root
      // The Case-File backdrop (ink base, blueprint grid, top glow) lives in demo.css
      // under "Case-File backdrop" — with the tuning knobs. Only layout stays inline.
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        color: '#e7eef6',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      }}
    >
      <div style={{ flex: '0 0 auto', position: 'sticky', top: 0, alignSelf: 'flex-start', padding: '28px 20px 28px 40px' }}>
        <PhoneFrame
          tabBar={showTabs ? <TabBar active={view === 'map' ? 'map' : view === 'dashboard' ? 'dashboard' : 'cases'} onSelect={(t) => store.getState().setView(t)} /> : undefined}
        >
          {/* Catches render throws in the mounted screen subtree — screen/modal/drawer/
              overlay COMPONENT renders, incl. portaled modals (portal errors propagate
              through the React tree) — and shows a glass fallback INSIDE the frame.
              NOT covered (review R-5): the bridge's own frame — activeScreen()/
              activeModal() view-model derivation (toCaseCards, toMapData,
              selectDrawerItems, …) executes above this boundary; a throw there is
              caught by the route-level net, app/demo/error.tsx.
              Wrapper-without-reindent, same as PhoneOverlayContext.Provider in PhoneFrame. */}
          <DemoErrorBoundary view={view} onReturnToCases={returnToCases}>
          <ScreenStage view={view} direction={dirRef.current} drawerOpen={drawerOpen}>
            {activeScreen()}
          </ScreenStage>
          {activeModal()}
          {/* Map case picker — mandatory (non-dismissible) when no case is being viewed; opened as a
              dismissible overlay by the map's "Change Case" pill. Sets the tab-local viewer case only;
              never writes the form's currentCaseId. */}
          {view === 'map' && (mapViewerCaseId === null || mapPickerOpen) && (
            <CaseMapPicker
              cases={caseCards.map((c) => ({
                id: c.id,
                caseNumber: c.caseNumber,
                displayName: c.displayName,
                locationCountLabel: c.locationCountLabel,
                status: cases.find((sc) => sc.id === c.id)?.status ?? 'draft',
              }))}
              dismissible={mapViewerCaseId !== null}
              // Highlight the viewed case (or the form's case as a courtesy on first open).
              preselectedId={mapViewerCaseId ?? currentCaseId}
              onPick={(caseId) => {
                setMapViewerCaseId(caseId)
                setMapPickerOpen(false)
              }}
              onClose={() => setMapPickerOpen(false)}
            />
          )}
          <WizardDrawer
            open={drawerOpen}
            items={selectDrawerItems(store.getState()).map((d) => {
              const dot = drawerStatus[d.id]
              return { id: d.id, label: d.label, active: d.id === view, status: dot === 'empty' ? undefined : dot }
            })}
            onClose={() => store.getState().setDrawerOpen(false)}
            onNavigate={(id) => {
              store.getState().setView(id)
              store.getState().setDrawerOpen(false)
            }}
            onBackToCases={() => {
              store.getState().setView('cases')
              store.getState().setDrawerOpen(false)
            }}
            onCaptureMedia={launchMediaCapture}
            onRecordAudio={launchAudioRecording}
            onOpenMediaLibrary={openMediaLibrary}
            saveStatus={saveStatus}
          />
          {/* The dashboard's long-press sheet (P3.2). Mounted only while a case is open —
              the demo has no always-mounted screen to hold it, so the phone's caseData=null
              idle state (and its measure-reset guard) has no equivalent here. */}
          {actionSheetCase && (
            <CaseActionsSheet
              caseData={actionSheetCase}
              // P3.3 seam, wired at the P3 assembly (§49a + §50e): NewCaseModal has its edit
              // mode, so Edit Case is now a real button and renders FIRST, as on the phone.
              // The honest-rule consequence is the point — the button appeared the moment it
              // could do what it says, and not one merge earlier.
              onEdit={editCaseFromSheet}
              onComplete={() => runCaseAction('complete')}
              onReopen={() => runCaseAction('draft')}
              onArchive={() => runCaseAction('archived')}
              onClose={closeCaseActions}
            />
          )}
          {pdf && <PdfPreview title={pdf.title} html={pdf.html} onClose={() => setPdf(null)} />}
          {/* Delete confirmation (rows 10 CRUD + 15). Renders null once its subject is gone —
              the confirm clears `pendingDelete` in the same tick, so this is belt and braces
              for any path that removes the entity out from under an armed dialog. */}
          {deleteTarget && (
            <DeleteConfirmationModal target={deleteTarget} onConfirm={confirmDelete} onCancel={() => setPendingDelete(null)} />
          )}
          {/* The demo's Toast. Portaled into the phone overlay root so it is visible over an
              OPEN modal too — the new-address card deliberately stays up after a failed create
              (phone parity), and a notice hidden behind it would be a silent failure. The root
              is pointer-events:none and the banner is non-interactive, so nothing underneath
              becomes unclickable. */}
          {notice && (
            <PhoneOverlayPortal>
              <DemoNotification message={notice} onDismiss={() => setNotice(null)} />
            </PhoneOverlayPortal>
          )}
          {/* In-phone blocking alert (the phone's Alert.alert). Rendered last so it sits over
              every other overlay, like an OS alert does. */}
          {/* Spread, not a hand-listed triple: `AlertState` IS the primitive's props minus
              `onDismiss` (R-37), so a prop added there flows straight through. */}
          {alert && <AlertDialog {...alert} onDismiss={closeAlert} />}
          </DemoErrorBoundary>
        </PhoneFrame>
      </div>
      <StoryRail narration={narration} explore={explore} onJump={(v) => store.getState().setView(v)} onBackToSite={onBackToSite} />
      <ExitDialog open={exitOpen} unseen={unseen} leaveHref="/" onStay={() => setExitOpen(false)} />
    </div>
  )
}
