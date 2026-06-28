'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { useStore } from 'zustand'
import { createDemoStore, type DemoStore } from '@/features/demo/engine/store/create-store'
import { runBeat } from '@/features/demo/engine/director/runner'
import { BEATS } from '@/features/demo/engine/director/beats'
import { NARRATION } from '@/features/demo/engine/content/narration'
import { TOUR_CHAPTERS, chapterNumber, nextChapter, prevChapter } from '@/features/demo/engine/content/screens'
import { runImport as runTextImport, runPdfImport, type ImportStageId as RunStageId, type ImportRunResult, type FallbackMode } from '@/features/demo/ui/import/run-import'
import { SAMPLE_REQUEST_DOC, blankLocationForm } from '@/features/demo/engine/content/seed'
import type { ChapterId, DemoMode } from '@/features/demo/engine/types'
import { PhoneFrame } from '@/features/demo/ui/PhoneFrame'
import { StoryRail, type RailDot } from '@/features/demo/ui/StoryRail'
import { TouchIndicator, type Pulse } from '@/features/demo/ui/TouchIndicator'
import { TabBar } from '@/features/demo/ui/controls/TabBar'
import { SplashScreen } from '@/features/demo/ui/screens/SplashScreen'
import { DashboardScreen } from '@/features/demo/ui/screens/DashboardScreen'
import { CasesScreen } from '@/features/demo/ui/screens/CasesScreen'
import { NewCaseModal, type NewCaseFields } from '@/features/demo/ui/screens/NewCaseModal'
import { NewLocationModal, type NewLocationFields } from '@/features/demo/ui/screens/NewLocationModal'
import { ImportModal, type ImportStage, type ImportResult, type ImportWarningView } from '@/features/demo/ui/screens/ImportModal'
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
import { selectDrawerItems, selectCaseNotesData, selectAdjustedScopes } from '@/features/demo/engine/store/selectors'
import { cleanOcrText, parseTimestampFromText, getConfidenceLevel } from '@/features/demo/engine/logic/ocr'
import { getCurrentFormattedTime } from '@/features/demo/engine/logic/time'
import { simulateNtpSync } from '@/features/demo/engine/logic/time-sync'
import { generateCaseNotesDoc } from '@/features/demo/engine/logic/pdf/case-notes'
import { generateTimeOffsetDoc } from '@/features/demo/engine/logic/pdf/time-offset'
import { buildRetentionView, type RetentionView } from '@/features/demo/engine/logic/retention'
import { toCaseCards } from '@/features/demo/ui/screens/screenData'
import type { CameraEntry, ScopeEntry } from '@/features/demo/engine/types'
import '@/features/demo/ui/demo.css'

// Module-level monotonic id source for pulse keys (Date.now()/Math.random() are avoided).
let pulseSeq = 0

// Retention "today": guided mode reads a fixed scenario date so the showcased numbers stay
// sensible against the demo's dated seed data (the guided flow itself is a deferred overhaul —
// see deferred.md); sandbox uses the real clock. Explicit-arg Date is deterministic.
const realNow = () => new Date()
const GUIDED_NOW = () => new Date(2025, 3, 12)

const isChapter = (v: string): v is ChapterId => (TOUR_CHAPTERS as readonly string[]).includes(v)

const blankCaseForm: NewCaseFields = { caseNumber: '', displayName: '', unit: '', oicName: '', oicBadge: '' }
const blankLocForm: NewLocationFields = { locationName: '', businessName: '', streetAddress: '', city: '' }

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

/** Map a kebab `?step` slug (e.g. `time-offset`) to its camelCase chapter id; warn (dev) on miss. */
function slugToChapter(slug: string): ChapterId | null {
  const camel = slug.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
  if (isChapter(camel)) return camel
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[demo] unknown ?step slug "${slug}" — staying on the opening chapter`)
  }
  return null
}

/** Seed (guided) / reset (sandbox) the store from the URL state. */
function applyUrlState(store: DemoStore, mode: DemoMode, step: string | null) {
  const st = store.getState()
  if (mode === 'sandbox') {
    st.reset()
  } else {
    st.seedGuided()
    const target = step ? slugToChapter(step) : null
    if (target) st.setView(target)
  }
}

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
 * The single store/director bridge. Creates the demo store once per mount (via ref), reads
 * ?mode/?step, subscribes selectively, plays the chapter's beat on enter in guided mode, gates
 * the phone's pointer-events, and renders the active screen + StoryRail. The ONLY component that
 * touches the store — every screen below it is presentational.
 *
 * Beat-play is keyed on the store's `currentChapter` (set only by chapter navigation), NOT raw
 * `view`, so a beat's own `launch('ocr')` (which moves `view`) can't re-trigger / restart it.
 */
export function DemoExperience({ store: injectedStore }: DemoExperienceProps = {}) {
  const params = useSearchParams()
  const mode: DemoMode = params.get('mode') === 'sandbox' ? 'sandbox' : 'guided'
  const step = params.get('step')

  const storeRef = useRef<DemoStore | null>(null)
  if (!storeRef.current) {
    storeRef.current = injectedStore ?? createDemoStore()
    // Seed before first render so the director's guided/sandbox gate is correct immediately.
    applyUrlState(storeRef.current, mode, step)
  }
  const store = storeRef.current

  const lastUrl = useRef(`${mode}|${step ?? ''}`)
  useEffect(() => {
    const key = `${mode}|${step ?? ''}`
    if (lastUrl.current === key) return
    lastUrl.current = key
    applyUrlState(store, mode, step)
  }, [store, mode, step])

  const currentChapter = useStore(store, (s) => s.currentChapter)
  const currentMode = useStore(store, (s) => s.mode)
  const view = useStore(store, (s) => s.view)
  const auth = useStore(store, (s) => s.auth)
  const cases = useStore(store, (s) => s.cases)
  const locations = useStore(store, (s) => s.locations)
  const modal = useStore(store, (s) => s.modal)
  const currentLocationId = useStore(store, (s) => s.currentLocationId)
  const currentCaseId = useStore(store, (s) => s.currentCaseId)
  const drawerOpen = useStore(store, (s) => s.drawerOpen)
  const capture = useStore(store, (s) => s.capture)

  const [pulses, setPulses] = useState<Pulse[]>([])
  const pulseTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null)
  const [targetCaseId, setTargetCaseId] = useState<string | null>(null)
  const [caseForm, setCaseForm] = useState<NewCaseFields>(blankCaseForm)
  const [locForm, setLocForm] = useState<NewLocationFields>(blankLocForm)
  const [imp, setImp] = useState<ImportState>(blankImport)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const importCancelled = useRef(false) // set when the modal is closed mid-import (H2)
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)
  const [pdf, setPdf] = useState<PdfState | null>(null)
  const [caseCompleted, setCaseCompleted] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [retentionView, setRetentionView] = useState<RetentionView>({ totalRetention: null, scopes: [] })

  // Play the chapter's beat on enter (guided only); cancel + clear its pulse timers on leave.
  useEffect(() => {
    if (currentMode !== 'guided') return
    const beat = BEATS[currentChapter]
    if (!beat) return
    const timers = pulseTimers.current
    const handle = runBeat(store, beat, {
      onPulse: (e) => {
        const id = `${e.target}-${pulseSeq++}`
        setPulses((p) => [...p, { id, x: 189, y: 393 }])
        const t = setTimeout(() => {
          timers.delete(t)
          setPulses((p) => p.filter((x) => x.id !== id))
        }, 650)
        timers.add(t)
      },
    })
    handle.done.then(() => {
      if (handle.degraded && process.env.NODE_ENV !== 'production') {
        console.error(`[demo] chapter "${currentChapter}" beat degraded:`, handle.warnings)
      }
    })
    return () => {
      handle.cancel()
      timers.forEach((t) => clearTimeout(t))
      timers.clear()
    }
  }, [store, currentMode, currentChapter])

  // Clear a pending device-sync timer if the experience unmounts mid-sync.
  useEffect(() => () => {
    if (syncTimer.current) clearTimeout(syncTimer.current)
  }, [])

  const guided = currentMode === 'guided'
  const narration = NARRATION[currentChapter]
  const dots: RailDot[] = TOUR_CHAPTERS.map((id) => ({ id, label: NARRATION[id].title }))
  const stepCaption = `Step ${chapterNumber(currentChapter)} of ${TOUR_CHAPTERS.length}`
  const nextLabel = currentChapter === 'splash' ? 'Start the tour' : nextChapter(currentChapter) ? 'Next' : 'Replay tour'
  const caseCards = useMemo(() => toCaseCards(cases, locations), [cases, locations])
  const currentLocation = locations.find((l) => l.id === currentLocationId) ?? null
  const currentCase = cases.find((c) => c.id === currentCaseId) ?? null

  // Derive DVR retention (total window + per-scope overwrite countdown) from the earliest
  // recorded date + scopes. Clock is read here (never at render): fixed in guided mode,
  // real in sandbox. The persisted totalDvrRetention (the PDF's source) is kept in sync —
  // written only while firstRecordedDate drives it, and cleared on a set→empty transition,
  // so an import-provided value (which leaves firstRecordedDate empty) is never clobbered.
  const prevFirstRecorded = useRef('')
  useEffect(() => {
    const fr = currentLocation?.form.dvr.firstRecordedDate ?? ''
    const now = currentMode === 'guided' ? GUIDED_NOW : realNow
    const view = buildRetentionView(currentLocation?.form.scopes ?? [], fr, now)
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
  }, [store, currentMode, currentLocation])

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
    const id = store.getState().createCase({ ...caseForm })
    setExpandedCaseId(id)
    store.getState().closeModal()
  }
  const submitLocation = () => {
    const caseId = targetCaseId ?? store.getState().currentCaseId
    if (caseId) store.getState().addLocation(caseId, { ...locForm })
    store.getState().closeModal()
  }
  // Live in sandbox (calls /api/extract → Ollama); deterministic SAMPLE in guided/tests.
  const importLive = () => currentMode === 'sandbox'
  const onImportStage = (st: RunStageId) => setImp((s) => ({ ...s, activeStage: st }))

  const fallbackNotice = (mode: FallbackMode): string | undefined => {
    if (mode === 'unavailable') return 'Live model not configured — imported the sample request instead.'
    if (mode === 'error') return 'Couldn’t reach the live model — imported the sample request instead.'
    return undefined
  }

  const applySuccess = (caseId: string, res: Extract<ImportRunResult, { ok: true }>): string => {
    const id = store.getState().addLocation(caseId, { locationName: res.patch.businessName || res.filename || 'Imported location' })
    store.getState().applyImport(res.patch)
    return id
  }

  interface ImportTally {
    total: number
    succeeded: number
    lastLocId: string | null
    notice: string | undefined
    warnings: ImportWarningView[]
    failures: string[]
    firstFieldCount: number
    firstTimeFrames: number
    firstName: string
  }
  const finishImport = (t: ImportTally) => {
    if (t.succeeded === 0) {
      setImp((s) => ({ ...s, stage: 'result', activeStage: null, batch: null, result: { ok: false, error: t.failures.join('; ') || 'Import failed.' } }))
      return
    }
    const result: ImportResult =
      t.total > 1
        ? { ok: true, fieldCount: t.firstFieldCount, timeFrames: t.firstTimeFrames, locName: `${t.succeeded} location${t.succeeded > 1 ? 's' : ''}`, warnings: t.warnings, notice: t.notice, batch: { succeeded: t.succeeded, total: t.total } }
        : { ok: true, fieldCount: t.firstFieldCount, timeFrames: t.firstTimeFrames, locName: t.firstName, warnings: t.warnings, notice: t.notice }
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
    importCancelled.current = false
    const live = importLive()
    const total = files.length
    const tally: ImportTally = { total, succeeded: 0, lastLocId: null, notice: undefined, warnings: [], failures: [], firstFieldCount: 0, firstTimeFrames: 0, firstName: '' }
    for (let i = 0; i < total; i++) {
      if (importCancelled.current) return // user closed the modal mid-batch
      setImp((s) => ({ ...s, stage: 'progress', isPdf: true, batch: { current: i + 1, total }, activeStage: 'extracting_text' }))
      const res = await runPdfImport(files[i], { live, onStage: onImportStage })
      if (importCancelled.current) return // cancelled while this file was processing
      if (res.ok) {
        tally.succeeded++
        tally.lastLocId = applySuccess(caseId, res)
        tally.notice = tally.notice ?? fallbackNotice(res.fallbackMode)
        tally.warnings.push(...res.warnings.map((w) => ({ field: w.field, reason: w.reason })))
        if (tally.succeeded === 1) {
          tally.firstFieldCount = res.fieldCount
          tally.firstTimeFrames = res.timeFrameCount
          tally.firstName = res.patch.businessName || res.filename || 'location'
        }
      } else {
        tally.failures.push(`${res.filename ?? 'file'}: ${res.error}`)
      }
    }
    finishImport(tally)
  }

  const runPasteImport = async () => {
    const caseId = targetCaseId ?? store.getState().currentCaseId
    if (!caseId) {
      setImp((s) => ({ ...s, stage: 'result', result: { ok: false, error: 'Select a case first.' } }))
      return
    }
    if (importLive() && !imp.text.trim()) {
      setImp((s) => ({ ...s, stage: 'result', result: { ok: false, error: 'Paste the request text first.' } }))
      return
    }
    importCancelled.current = false
    setImp((s) => ({ ...s, stage: 'progress', isPdf: false, batch: null, activeStage: 'reading_model' }))
    const res = await runTextImport({ documentText: imp.text, live: importLive(), onStage: onImportStage })
    if (importCancelled.current) return
    if (res.ok) {
      finishImport({ total: 1, succeeded: 1, lastLocId: applySuccess(caseId, res), notice: fallbackNotice(res.fallbackMode), warnings: res.warnings.map((w) => ({ field: w.field, reason: w.reason })), failures: [], firstFieldCount: res.fieldCount, firstTimeFrames: res.timeFrameCount, firstName: res.patch.businessName || 'location' })
    } else {
      finishImport({ total: 1, succeeded: 0, lastLocId: null, notice: undefined, warnings: [], failures: [res.error], firstFieldCount: 0, firstTimeFrames: 0, firstName: '' })
    }
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

  const showTabs = view === 'dashboard' || view === 'cases'

  function activeScreen() {
    switch (view) {
      case 'splash':
        return <SplashScreen authState={auth === 'authorized' ? 'authorized' : 'idle'} onScan={() => store.getState().setView('dashboard')} />
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
          requesterPhone: currentLocation?.requesterPhone ?? '',
          requesterEmail: currentLocation?.requesterEmail ?? '',
          businessName: currentLocation?.businessName ?? '',
          streetAddress: currentLocation?.streetAddress ?? '',
          city: currentLocation?.city ?? '',
          locationContact: currentLocation?.locationContact ?? '',
          locationPhone: currentLocation?.locationPhone ?? '',
        }
        // SubmissionFields keys are DemoLocation field names, so each key is a valid updateField path as-is.
        return <SubmissionScreen occNumber={currentCase?.caseNumber ?? ''} fields={fields} onChange={(f, v) => store.getState().updateField(f, v)} onNext={onNext} onBack={onPrev} onMenu={openMenu} />
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
      default:
        return placeholder(view)
    }
  }

  function activeModal() {
    switch (modal) {
      case 'newCase':
        return <NewCaseModal form={caseForm} onChange={(f, v) => setCaseForm((s) => ({ ...s, [f]: v }))} onSubmit={submitCase} onCancel={() => store.getState().closeModal()} />
      case 'newLocation':
        return <NewLocationModal form={locForm} onChange={(f, v) => setLocForm((s) => ({ ...s, [f]: v }))} onSubmit={submitLocation} onCancel={() => store.getState().closeModal()} onCaptureGps={() => undefined} />
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
              // Sandbox: blank textarea (paste your own). Guided: seed the sample request.
              onChoosePaste={() => setImp((s) => ({ ...s, stage: 'paste', text: currentMode === 'sandbox' ? '' : SAMPLE_REQUEST_DOC }))}
              onTextChange={(v) => setImp((s) => ({ ...s, text: v }))}
              onRun={runPasteImport}
              onBack={() => setImp((s) => ({ ...s, stage: 'picker' }))}
              onRetry={() => {
                importCancelled.current = false
                setImp((s) => ({ ...s, stage: 'picker', result: null, batch: null, activeStage: null }))
              }}
              onOpen={() => {
                if (imp.lastLocId) openLocation(imp.lastLocId)
                store.getState().closeModal()
              }}
              onCancel={() => {
                importCancelled.current = true // stop any in-flight import loop (H2)
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
          interactive={!guided}
          tabBar={showTabs ? <TabBar active={view === 'dashboard' ? 'dashboard' : 'cases'} onSelect={(t) => t !== 'map' && store.getState().setView(t)} /> : undefined}
        >
          {activeScreen()}
          {activeModal()}
          {drawerOpen && (
            <WizardDrawer
              open
              items={selectDrawerItems(store.getState()).map((d) => ({ id: d.id, label: d.label, active: d.id === view }))}
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
          )}
          {pdf && <PdfPreview title={pdf.title} html={pdf.html} onClose={() => setPdf(null)} onSave={() => setPdf(null)} />}
          <TouchIndicator pulses={pulses} />
        </PhoneFrame>
      </div>
      <StoryRail
        narration={narration}
        mode={currentMode}
        dots={dots}
        activeDot={currentChapter}
        stepCaption={stepCaption}
        canPrev={prevChapter(currentChapter) !== null}
        nextLabel={nextLabel}
        onNext={onNext}
        onPrev={onPrev}
        onJump={(id) => store.getState().setView(id)}
        onSetMode={(m) => (m === 'guided' ? store.getState().seedGuided() : store.getState().reset())}
      />
    </div>
  )
}
