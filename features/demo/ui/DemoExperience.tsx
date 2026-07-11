'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useStore } from 'zustand'
import { createDemoStore, type DemoStore } from '@/features/demo/engine/store/create-store'
import { NARRATION, MAP_NARRATION } from '@/features/demo/engine/content/narration'
import { nextChapter, prevChapter } from '@/features/demo/engine/content/screens'
import { runImport as runTextImport, runPdfImport, type ImportStageId as RunStageId, type ImportRunResult, type FallbackMode } from '@/features/demo/ui/import/run-import'
import { buildGeocodeQuery, forwardGeocode } from '@/features/demo/ui/import/geocode'
import { blankLocationForm } from '@/features/demo/engine/content/seed'
import { PhoneFrame } from '@/features/demo/ui/PhoneFrame'
import { StoryRail } from '@/features/demo/ui/StoryRail'
import { TabBar } from '@/features/demo/ui/controls/TabBar'
import { SplashScreen } from '@/features/demo/ui/screens/SplashScreen'
import { DashboardScreen } from '@/features/demo/ui/screens/DashboardScreen'
import { CasesScreen } from '@/features/demo/ui/screens/CasesScreen'
import { NewCaseModal, type NewCaseFields } from '@/features/demo/ui/screens/NewCaseModal'
import { NewLocationModal, type NewLocationFields } from '@/features/demo/ui/screens/NewLocationModal'
import { ImportModal, type ImportStage, type ImportResult, type ImportFailure } from '@/features/demo/ui/screens/ImportModal'
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
import { WizardDrawer } from '@/features/demo/ui/controls/WizardDrawer'
import { selectDrawerItems, selectDrawerStatus, selectCaseNotesData, selectAdjustedScopes, selectExploreStatus } from '@/features/demo/engine/store/selectors'
import { cleanOcrText, parseTimestampFromText, getConfidenceLevel } from '@/features/demo/engine/logic/ocr'
import { getCurrentFormattedTime } from '@/features/demo/engine/logic/time'
import { parseCoordinate } from '@/features/demo/engine/logic/coordinates'
import { simulateNtpSync } from '@/features/demo/engine/logic/time-sync'
import { generateCaseNotesDoc } from '@/features/demo/engine/logic/pdf/case-notes'
import { generateTimeOffsetDoc } from '@/features/demo/engine/logic/pdf/time-offset'
import { buildRetentionView, type RetentionView } from '@/features/demo/engine/logic/retention'
import { toCaseCards } from '@/features/demo/ui/screens/screenData'
import type { CameraEntry, ScopeEntry } from '@/features/demo/engine/types'
import '@/features/demo/ui/demo.css'

// Retention "today": the real clock — the demo boots empty and every case is
// visitor-created, so retention countdowns read against actual time.
const realNow = () => new Date()

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

const IMPORT_STAGE_ORDER: RunStageId[] = ['extracting_text', 'reading_model', 'normalizing', 'done']

/** Build the progress checklist from the active pipeline stage (PDF adds the text-extract step). */
function buildImportStages(active: RunStageId | null, isPdf: boolean): ImportStage[] {
  const steps: { id: RunStageId; label: string }[] = [
    ...(isPdf ? [{ id: 'extracting_text' as RunStageId, label: 'Extracting text from the PDF' }] : []),
    { id: 'reading_model', label: 'Reading the request with the model' },
    { id: 'normalizing', label: 'Mapping fields to the form' },
  ]
  const ai = active ? IMPORT_STAGE_ORDER.indexOf(active) : -1
  return steps.map((s) => {
    const si = IMPORT_STAGE_ORDER.indexOf(s.id)
    return { label: s.label, state: si < ai ? 'done' : si === ai ? 'active' : 'pending' }
  })
}

interface ImportState {
  stage: 'picker' | 'paste' | 'progress' | 'result'
  text: string
  result: ImportResult | null
  lastLocId: string | null
  activeStage: RunStageId | null
  isPdf: boolean
  batch: { current: number; total: number } | null
}
const blankImport: ImportState = { stage: 'picker', text: '', result: null, lastLocId: null, activeStage: null, isPdf: false, batch: null }

// Monotonic ids for UI-created scope/visit rows.
let uiSeq = 0
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
    storeRef.current = injectedStore ?? createDemoStore()
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
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  // Import cancellation token (H1): each run captures its own generation; cancelling —
  // or starting a newer run — bumps the counter, so a stale in-flight run fails its
  // checkpoint even after another run begins. A shared boolean is NOT enough: the
  // newer run's "reset" would un-cancel the stale one and let it mutate the store.
  const importGen = useRef(0)
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)
  const [pdf, setPdf] = useState<PdfState | null>(null)
  const [caseCompleted, setCaseCompleted] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [retentionView, setRetentionView] = useState<RetentionView>({ totalRetention: null, scopes: [] })

  // Clear a pending device-sync timer if the experience unmounts mid-sync.
  useEffect(() => () => {
    if (syncTimer.current) clearTimeout(syncTimer.current)
  }, [])

  // The Map tab is a tab view, not a chapter — show its contextual copy on the rail
  // while currentChapter stays on the last real chapter.
  const narration = view === 'map' ? MAP_NARRATION : NARRATION[currentChapter]
  // The manifest recomputes when the visit record or the active view changes.
  const explore = useMemo(
    () => selectExploreStatus(store.getState()),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- visited/view ARE the selector's inputs, read through getState
    [store, visited, view],
  )
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

  const openMenu = () => store.getState().setDrawerOpen(true)
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
  const onImportStage = (st: RunStageId) => setImp((s) => ({ ...s, activeStage: st }))

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
  ): Promise<string | null> => {
    const query = buildGeocodeQuery(res.patch.streetAddress, res.patch.city, res.patch.businessName)
    const coords = query ? await forwardGeocode(query) : null
    if (importGen.current !== myGen) return null // cancelled mid-geocode — do not touch the store
    const id = store.getState().addLocation(caseId, {
      locationName: res.patch.businessName || res.filename || 'Imported location',
      gps: coords ? { lat: coords.lat, lng: coords.lng, source: 'geocoded' } : undefined,
    })
    store.getState().applyImport(res.patch)
    return id
  }

  interface ImportTally {
    lastLocId: string | null
    notice: string | undefined
    locations: ImportedLocationView[]
    failures: ImportFailure[]
  }
  const recordSuccess = async (caseId: string, caseNumber: string, res: Extract<ImportRunResult, { ok: true }>, tally: ImportTally, myGen: number) => {
    const locId = await applySuccess(caseId, res, myGen)
    if (locId === null) return // run invalidated mid-geocode — nothing was written, tally untouched
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
  const finishImport = (t: ImportTally) => {
    // No successful locations → honest failure result (ok=false); the failure view shows the
    // per-file failures card. A success always carries at least one location.
    const result: ImportResult =
      t.locations.length === 0
        ? { ok: false, error: `${t.failures.length} import${t.failures.length === 1 ? '' : 's'} failed.`, failures: t.failures }
        : { ok: true, locations: t.locations, failures: t.failures, notice: t.notice }
    setImp((s) => ({ ...s, stage: 'result', activeStage: null, batch: null, result, lastLocId: t.lastLocId }))
  }

  const openFilePicker = () => fileInputRef.current?.click()

  const onFilesPicked = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = '' // allow re-picking the same file
    if (files.length) await processPdfFiles(files)
  }

  const processPdfFiles = async (files: File[]) => {
    const caseId = targetCaseId ?? store.getState().currentCaseId
    if (!caseId) {
      setImp((s) => ({ ...s, stage: 'result', result: { ok: false, error: 'Select a case first.' } }))
      return
    }
    const caseNumber = cases.find((c) => c.id === caseId)?.caseNumber ?? '—'
    const myGen = ++importGen.current // this run's token — any bump invalidates it
    const total = files.length
    const tally: ImportTally = { lastLocId: null, notice: undefined, locations: [], failures: [] }
    for (let i = 0; i < total; i++) {
      if (importGen.current !== myGen) return // cancelled, or a newer run started
      setImp((s) => ({ ...s, stage: 'progress', isPdf: true, batch: { current: i + 1, total }, activeStage: 'extracting_text' }))
      const res = await runPdfImport(files[i], { live: true, onStage: onImportStage })
      if (importGen.current !== myGen) return // cancelled while this file was processing
      if (res.ok) await recordSuccess(caseId, caseNumber, res, tally, myGen)
      else tally.failures.push({ filename: res.filename ?? 'file', error: res.error })
    }
    if (importGen.current !== myGen) return // invalidated during the last file's geocode — don't overwrite a newer run's result
    finishImport(tally)
  }

  const runPasteImport = async () => {
    const caseId = targetCaseId ?? store.getState().currentCaseId
    if (!caseId) {
      setImp((s) => ({ ...s, stage: 'result', result: { ok: false, error: 'Select a case first.' } }))
      return
    }
    if (!imp.text.trim()) {
      setImp((s) => ({ ...s, stage: 'result', result: { ok: false, error: 'Paste the request text first.' } }))
      return
    }
    const caseNumber = cases.find((c) => c.id === caseId)?.caseNumber ?? '—'
    const myGen = ++importGen.current // this run's token — any bump invalidates it
    setImp((s) => ({ ...s, stage: 'progress', isPdf: false, batch: null, activeStage: 'reading_model' }))
    const res = await runTextImport({ documentText: imp.text, live: true, onStage: onImportStage })
    if (importGen.current !== myGen) return // cancelled, or a newer run started
    const tally: ImportTally = { lastLocId: null, notice: undefined, locations: [], failures: [] }
    if (res.ok) await recordSuccess(caseId, caseNumber, res, tally, myGen)
    else tally.failures.push({ filename: res.filename ?? 'request', error: res.error })
    if (importGen.current !== myGen) return // invalidated during the geocode — don't overwrite a newer run's result
    finishImport(tally)
  }

  // ---- time offset + OCR (the marquee) ----
  const calcOffset = () => {
    store.getState().calculateOffset()
    store.getState().generateExtractedScopes()
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
  const runOcrSample = () => {
    const raw = '2025-03-08 12:05:30' // sample DVR clock
    const cleaned = cleanOcrText(raw)
    const parsed = parseTimestampFromText(cleaned)
    const conf = getConfidenceLevel(0.93)
    const st = store.getState()
    if (!st.capture.actualDateTime) st.updateField('capture.actualDateTime', '2025-03-08 12:00:00')
    st.updateField('capture.method', 'ocr')
    if (parsed) st.updateField('capture.dvrDateTime', parsed)
    setOcrResult(
      parsed
        ? { ok: true, dvrTime: parsed, confidence: { label: conf.message, color: conf.color }, actual: store.getState().capture.actualDateTime }
        : { ok: false, rawText: cleaned },
    )
  }
  const confirmOcr = () => {
    calcOffset()
    store.getState().closeLaunch()
    setOcrResult(null)
  }
  const cancelOcr = () => {
    store.getState().closeLaunch()
    setOcrResult(null)
  }

  // ---- PDF preview + completion ----
  const previewCaseNotes = () => setPdf({ title: 'Case Notes — PDF', html: generateCaseNotesDoc(selectCaseNotesData(store.getState())) })
  const previewTimeOffset = () => {
    const off = currentLocation?.form.timeOffset
    const addr = currentLocation ? [currentLocation.businessName, currentLocation.streetAddress, currentLocation.city].filter(Boolean).join(', ') : ''
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
        return <SubmissionScreen occNumber={currentCase?.caseNumber ?? ''} fields={fields} onChange={(f, v) => store.getState().updateField(f, v)} onPickCoords={(c) => store.getState().updateField('gps', { lat: c.lat, lng: c.lng, accuracyM: 0, source: 'geocoded' })} onNext={onNext} onBack={onPrev} onMenu={openMenu} />
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
              setOcrResult(null)
              store.getState().launch('ocr')
            }}
            sync={capture.sync}
            syncing={syncing}
            result={off ? { diff: off.formattedDifference, direction: off.direction, isCorrect: off.isCorrect } : null}
            correctedScopes={selectAdjustedScopes(store.getState())}
            dvrAppliesDST={capture.dvrAppliesDST}
            onToggleDst={() => store.getState().updateField('capture.dvrAppliesDST', !capture.dvrAppliesDST)}
            onNext={onNext}
            onBack={onPrev}
            onMenu={openMenu}
          />
        )
      }
      case 'ocr':
        return <OcrCaptureScreen result={ocrResult} onUseSample={runOcrSample} onCapture={runOcrSample} onCancel={cancelOcr} onRetake={() => setOcrResult(null)} onConfirm={confirmOcr} />
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
        return (
          <NotesScreen
            notes={currentLocation?.form.notesText ?? ''}
            onChange={(v) => {
              store.getState().updateField('form.notesText', v)
              store.getState().updateField('form.notesEdited', true)
            }}
            onRegenerate={() => store.getState().generateNotes()}
            onNext={onNext}
            onBack={onPrev}
            onMenu={openMenu}
          />
        )
      case 'completion': {
        const off = currentLocation?.form.timeOffset
        const summary: CompletionSummary = {
          occNumber: currentCase?.caseNumber ?? '—',
          location: currentLocation ? [currentLocation.businessName, currentLocation.streetAddress, currentLocation.city].filter(Boolean).join(', ') || currentLocation.locationName : '—',
          dvr: currentLocation?.form.dvr.dvrTypeBrand || '—',
          offset: off ? `${off.formattedDifference} ${off.direction}` : null,
          scopes: currentLocation?.form.scopes.length ?? 0,
          cameras: currentLocation?.form.cameras.length ?? 0,
          export: currentLocation?.form.export.exportMedia || '—',
        }
        return (
          <CompletionScreen
            summary={summary}
            isComplete={caseCompleted}
            dateTimeCompleted={currentLocation?.form.dateTimeCompleted ?? ''}
            completedBy={currentLocation?.form.completedBy ?? ''}
            onChange={(f, v) => store.getState().updateField(`form.${f}`, v)}
            onPreviewPdf={previewCaseNotes}
            onPreviewTimeOffsetPdf={previewTimeOffset}
            onComplete={() => setCaseCompleted(true)}
            onBackToDashboard={() => {
              setCaseCompleted(false)
              store.getState().setView('dashboard')
            }}
            onBackToCases={() => {
              setCaseCompleted(false)
              store.getState().setView('cases')
            }}
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
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              style={{ display: 'none' }}
              onChange={onFilesPicked}
            />
            <ImportModal
              stage={imp.stage}
              text={imp.text}
              stages={buildImportStages(imp.activeStage, imp.isPdf)}
              result={imp.result}
              batch={imp.batch}
              onPickPdf={openFilePicker}
              onChoosePaste={() => setImp((s) => ({ ...s, stage: 'paste', text: '' }))}
              onTextChange={(v) => setImp((s) => ({ ...s, text: v }))}
              onRun={runPasteImport}
              onBack={() => setImp((s) => ({ ...s, stage: 'picker' }))}
              onRetry={() => {
                // No token reset here: a retry simply starts a new run, which takes
                // its own generation. An untokened clear would revive stale runs (H1).
                setImp((s) => ({ ...s, stage: 'picker', result: null, batch: null, activeStage: null }))
              }}
              onOpenLocation={(locId) => {
                if (locId) openLocation(locId)
                store.getState().closeModal()
              }}
              onCancel={() => {
                importGen.current++ // invalidate any in-flight run's token (H1/H2)
                store.getState().closeModal()
              }}
            />
          </>
        )
      default:
        return null
    }
  }

  return (
    <div
      data-demo-root
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        background: '#060c14',
        backgroundImage:
          'linear-gradient(135deg,#0a1422 0%,#060c14 55%,#0b1320 100%),repeating-linear-gradient(0deg,rgba(153,186,221,0.028) 0 1px,transparent 1px 46px),repeating-linear-gradient(90deg,rgba(153,186,221,0.028) 0 1px,transparent 1px 46px)',
        color: '#e7eef6',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      }}
    >
      <div style={{ flex: '0 0 auto', position: 'sticky', top: 0, alignSelf: 'flex-start', padding: '28px 20px 28px 40px' }}>
        <PhoneFrame
          tabBar={showTabs ? <TabBar active={view === 'map' ? 'map' : view === 'dashboard' ? 'dashboard' : 'cases'} onSelect={(t) => store.getState().setView(t)} /> : undefined}
        >
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
          {pdf && <PdfPreview title={pdf.title} html={pdf.html} onClose={() => setPdf(null)} onSave={() => setPdf(null)} />}
        </PhoneFrame>
      </div>
      <StoryRail narration={narration} explore={explore} onJump={(v) => store.getState().setView(v)} />
    </div>
  )
}
