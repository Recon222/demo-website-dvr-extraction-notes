'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { createDemoStore, type DemoStore } from '@/features/demo/engine/store/create-store'
import { NARRATION, MAP_NARRATION, MODAL_NARRATION } from '@/features/demo/engine/content/narration'
import { nextChapter, prevChapter, WIZARD_SCREENS } from '@/features/demo/engine/content/screens'
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
import { AlertDialog, type AlertAction } from '@/features/demo/ui/controls/AlertDialog'
import { SplashScreen } from '@/features/demo/ui/screens/SplashScreen'
import { DashboardScreen } from '@/features/demo/ui/screens/DashboardScreen'
import { CasesScreen } from '@/features/demo/ui/screens/CasesScreen'
import { NewCaseModal, type NewCaseFields } from '@/features/demo/ui/screens/NewCaseModal'
import { NewLocationModal, type NewLocationFields } from '@/features/demo/ui/screens/NewLocationModal'
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
import { OcrCaptureScreen, type OcrResult } from '@/features/demo/ui/screens/OcrCaptureScreen'
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
import { loadSnapshot, persistDemoStore, type StorageLike } from '@/features/demo/engine/store/persistence'
import { maxIdSeq } from '@/features/demo/engine/store/helpers'
import { cleanOcrText, readDvrTimestamp, getConfidenceLevel, isDvrDraftCommittable } from '@/features/demo/engine/logic/ocr'
import { OCR_SAMPLE_FRAMES, OCR_SAMPLE_CONFIDENCE, SAMPLE_ACTUAL_TIME, type OcrSampleFrame } from '@/features/demo/engine/content/seed'
import { getCurrentFormattedTime } from '@/features/demo/engine/logic/time'
import { computeDstAdvisory } from '@/features/demo/engine/logic/dst-advisory'
import { parseCoordinate } from '@/features/demo/engine/logic/coordinates'
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
import { toCaseCards } from '@/features/demo/ui/screens/screenData'
import type { CameraEntry, ScopeEntry } from '@/features/demo/engine/types'
import '@/features/demo/ui/demo.css'

// Retention "today": the real clock — the demo boots empty and every case is
// visitor-created, so retention countdowns read against actual time.
const realNow = () => new Date()

// Import-log run clock, read through the UI's wall-clock seam (spy-able in tests). The
// bus itself never touches Date.now() — elapsedMs comes from this injection (P1.3).
const logClock = () => clock.now().getTime()

const blankCaseForm: NewCaseFields = {
  caseNumber: '',
  displayName: '',
  unit: '',
  oicName: '',
  oicBadge: '',
  vcName: '',
  vcBadge: '',
  incidentBusinessName: '',
  incidentStreetAddress: '',
  incidentCity: '',
  incidentLatitude: '',
  incidentLongitude: '',
  incidentCoordinateSource: '',
  notes: '',
}
const blankLocForm: NewLocationFields = { locationName: '', businessName: '', streetAddress: '', city: '', locationContact: '', locationPhone: '' }

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

/** An open in-phone alert (the phone's `Alert.alert(title, message, buttons)` payload). */
interface AlertState {
  title: string
  message: string
  actions: readonly AlertAction[]
}

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
const PROGRESS_SAVED_BODY =
  'You can continue this location later from the Cases screen.\n\n' +
  'Your work stays in this browser tab — it survives a refresh, but closing the tab starts fresh.'

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
const EMPTY_FORM = blankLocationForm()

// Fallback for views without a screen yet — only the not-yet-built media views
// (mediaCapture/audioRecording) reach this, and they're a deferred fast-follow (deferred.md §8).
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
  // Tab-local viewer case for the Map tab — distinct from the form's currentCaseId. The picker sets
  // it; null shows the mandatory picker. mapPickerOpen drives the dismissible "Change Case" overlay.
  const [mapViewerCaseId, setMapViewerCaseId] = useState<string | null>(null)
  const [mapPickerOpen, setMapPickerOpen] = useState(false)
  const [targetCaseId, setTargetCaseId] = useState<string | null>(null)
  const [caseForm, setCaseForm] = useState<NewCaseFields>(blankCaseForm)
  const [locForm, setLocForm] = useState<NewLocationFields>(blankLocForm)
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
  // Render-irrelevant OCR proof (raw/cleaned text + score) carried from the read to the
  // commit, where it becomes `capture.ocr` → `timeOffset.ocr`.
  const ocrProof = useRef<{ rawText: string; cleanedText: string; confidence: number } | null>(null)
  const [pdf, setPdf] = useState<PdfState | null>(null)
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
  useEffect(() => {
    if (injectedStore) return
    const handle = persistDemoStore(store, sessionStorageOrNull())
    const onPageHide = () => handle.flush()
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      handle.dispose()
    }
  }, [injectedStore, store])

  // Rail copy, most-specific first (mirrors the manifest anchor in selectExploreStatus):
  // an open modal shows its own copy (Create a Case / Add a Location / Import Location),
  // else the Map tab its contextual copy, else the current chapter's. The ?? guards a
  // modal with no narration entry — falls back to the chapter rather than blanking.
  const narration =
    (modal && MODAL_NARRATION[modal]) ?? (view === 'map' ? MAP_NARRATION : NARRATION[currentChapter])
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

  const openMenu = () => store.getState().setDrawerOpen(true)

  // Error-boundary recovery: land back on Cases with every transient overlay cleared
  // (store AND local), so the re-rendered subtree can't immediately re-throw from a
  // stale overlay (open modal, PDF preview, OCR confirm stage, map picker).
  const returnToCases = () => {
    setPdf(null)
    resetOcr()
    setMapPickerOpen(false)
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
    setCaseForm(blankCaseForm)
    store.getState().openModal('newCase')
  }
  const addLocation = (caseId: string) => {
    setTargetCaseId(caseId)
    setLocForm(blankLocForm)
    store.getState().openModal('newLocation')
  }
  const openImport = (caseId: string) => {
    setTargetCaseId(caseId)
    setImp(blankImport)
    store.getState().openModal('import')
  }
  const submitCase = () => {
    // Build incidentCoordinates only when BOTH lat & lng parse + range-validate. An invalid or
    // partial entry yields no coordinates (the case is still created — no required-field gate).
    const latR = parseCoordinate(caseForm.incidentLatitude, 'lat')
    const lngR = parseCoordinate(caseForm.incidentLongitude, 'lng')
    const incidentCoordinates =
      latR.ok && lngR.ok
        ? { lat: latR.value, lng: lngR.value, source: caseForm.incidentCoordinateSource === 'geocoded' ? ('geocoded' as const) : ('manual' as const) }
        : undefined
    const id = store.getState().createCase({ ...caseForm, incidentCoordinates })
    setExpandedCaseId(id)
    store.getState().closeModal()
  }
  const submitLocation = () => {
    const caseId = targetCaseId ?? store.getState().currentCaseId
    if (caseId) {
      const gps = locForm.coordinates ? { ...locForm.coordinates, source: 'geocoded' as const } : undefined
      store.getState().addLocation(caseId, { ...locForm, gps })
    }
    store.getState().closeModal()
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
  const runOcrSample = (frame: OcrSampleFrame) => {
    const raw = OCR_SAMPLE_FRAMES[frame]
    const cleaned = cleanOcrText(raw)
    const reading = readDvrTimestamp(cleaned, clock.now().getTime())
    const conf = getConfidenceLevel(OCR_SAMPLE_CONFIDENCE)
    // The capture instant is frozen here (the phone freezes it at the shutter) but written to
    // the store only on commit — nothing about a rejected read should survive Cancel.
    const actual = store.getState().capture.actualDateTime || SAMPLE_ACTUAL_TIME
    ocrProof.current = { rawText: raw, cleanedText: cleaned, confidence: OCR_SAMPLE_CONFIDENCE }
    setOcrDateConfirmed(false)
    setOcrDraft(reading?.dvrTime ?? '')
    setOcrResult(
      reading
        ? {
            ok: true,
            dvrTime: reading.dvrTime,
            confidence: { label: conf.message, color: conf.color },
            actual,
            resolution: reading.resolution,
          }
        : { ok: false, rawText: cleaned },
    )
  }
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
    setAlert({
      title: PROGRESS_SAVED_TITLE,
      message: PROGRESS_SAVED_BODY,
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
        return <DashboardScreen cases={caseCards} onOpenLocation={openLocation} />
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
        // DST advisory: the phone recomputes it on every render of the result block, so it
        // tracks the toggle and the scope edits live. `clock.now` is the UI's wall-clock seam
        // (spy-able in tests) — the engine helper never reads an argless clock itself.
        const dstAdvisory = off
          ? computeDstAdvisory({
              scopes: currentLocation?.form.scopes ?? [],
              actualDateTime: capture.actualDateTime,
              dvrAppliesDST: capture.dvrAppliesDST,
              now: clock.now,
            })
          : null
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
            onCancel={cancelOcr}
            onRetake={resetOcr}
            onConfirm={confirmOcr}
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
            sections={buildNotesSectionMeta(currentLocation)}
            freeText={currentLocation?.form.notesFreeText ?? ''}
            copyAllText={
              currentLocation
                ? assembleNotesString(currentLocation.form.notesSections, currentLocation.form.notesFreeText)
                : ''
            }
            onCommitSection={(id, text) => store.getState().commitNoteSection(id, text)}
            onCommitAddendum={(id, text) => store.getState().commitNoteAddendum(id, text)}
            onResetSection={(id) => store.getState().resetNoteSection(id)}
            onScrapAll={(mode) => store.getState().scrapAllNotes(mode)}
            onRestoreAll={(mode) => store.getState().restoreAllNotes(mode)}
            onCommitFreeText={(text) => store.getState().commitNotesFreeText(text)}
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
      case 'map':
        return <MapScreen viewerCaseId={mapViewerCaseId} mapData={mapData} onChangeCase={() => setMapPickerOpen(true)} onGoToLocation={openLocation} />
      default:
        return placeholder(view)
    }
  }

  function activeModal() {
    switch (modal) {
      case 'newCase':
        return <NewCaseModal form={caseForm} onChange={(f, v) => setCaseForm((s) => ({ ...s, [f]: v }))} onSubmit={submitCase} onCancel={() => store.getState().closeModal()} />
      case 'newLocation':
        return <NewLocationModal form={locForm} onChange={(f, v) => setLocForm((s) => ({ ...s, [f]: v }))} onSubmit={submitLocation} onCancel={() => store.getState().closeModal()} onCaptureGps={() => undefined} onPickCoords={(c) => setLocForm((s) => ({ ...s, coordinates: c }))} />
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
          />
          {pdf && <PdfPreview title={pdf.title} html={pdf.html} onClose={() => setPdf(null)} />}
          {/* In-phone blocking alert (the phone's Alert.alert). Rendered last so it sits over
              every other overlay, like an OS alert does. */}
          {alert && <AlertDialog title={alert.title} message={alert.message} actions={alert.actions} onDismiss={closeAlert} />}
          </DemoErrorBoundary>
        </PhoneFrame>
      </div>
      <StoryRail narration={narration} explore={explore} onJump={(v) => store.getState().setView(v)} onBackToSite={onBackToSite} />
      <ExitDialog open={exitOpen} unseen={unseen} leaveHref="/" onStay={() => setExitOpen(false)} />
    </div>
  )
}
