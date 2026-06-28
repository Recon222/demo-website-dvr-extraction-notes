'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useStore } from 'zustand'
import { createDemoStore, type DemoStore } from '@/lib/demo/store/create-store'
import { runBeat } from '@/lib/demo/director/runner'
import { BEATS } from '@/lib/demo/director/beats'
import { NARRATION } from '@/lib/demo/content/narration'
import { TOUR_CHAPTERS, chapterNumber, nextChapter, prevChapter } from '@/lib/demo/content/screens'
import { mapAiToForm, SAMPLE_EXTRACTION } from '@/lib/demo/logic/import'
import { SAMPLE_REQUEST_DOC, blankLocationForm } from '@/lib/demo/content/seed'
import type { ChapterId, DemoMode } from '@/lib/demo/types'
import { PhoneFrame } from '@/components/demo/PhoneFrame'
import { StoryRail, type RailDot } from '@/components/demo/StoryRail'
import { TouchIndicator, type Pulse } from '@/components/demo/TouchIndicator'
import { TabBar } from '@/components/demo/controls/TabBar'
import { SplashScreen } from '@/components/demo/screens/SplashScreen'
import { DashboardScreen } from '@/components/demo/screens/DashboardScreen'
import { CasesScreen } from '@/components/demo/screens/CasesScreen'
import { NewCaseModal, type NewCaseFields } from '@/components/demo/screens/NewCaseModal'
import { NewLocationModal, type NewLocationFields } from '@/components/demo/screens/NewLocationModal'
import { ImportModal, type ImportStage, type ImportResult } from '@/components/demo/screens/ImportModal'
import { SubmissionScreen, type SubmissionFields } from '@/components/demo/screens/SubmissionScreen'
import { RequestedScopeScreen } from '@/components/demo/screens/RequestedScopeScreen'
import { ArrivalDepartureScreen } from '@/components/demo/screens/ArrivalDepartureScreen'
import { TimeOffsetScreen, type CorrectedScope } from '@/components/demo/screens/TimeOffsetScreen'
import { OcrCaptureScreen, type OcrResult } from '@/components/demo/screens/OcrCaptureScreen'
import { ExtractedScopeScreen } from '@/components/demo/screens/ExtractedScopeScreen'
import { DvrInfoScreen } from '@/components/demo/screens/DvrInfoScreen'
import { CamerasScreen } from '@/components/demo/screens/CamerasScreen'
import { ExportInfoScreen } from '@/components/demo/screens/ExportInfoScreen'
import { NotesScreen } from '@/components/demo/screens/NotesScreen'
import { CompletionScreen, type CompletionSummary } from '@/components/demo/screens/CompletionScreen'
import { PdfPreview } from '@/components/demo/chrome/PdfPreview'
import { WizardDrawer } from '@/components/demo/controls/WizardDrawer'
import { selectDrawerItems, selectCaseNotesData } from '@/lib/demo/store/selectors'
import { cleanOcrText, parseTimestampFromText, getConfidenceLevel } from '@/lib/demo/logic/ocr'
import { getCurrentFormattedTime } from '@/lib/demo/logic/time'
import { generateCaseNotesDoc } from '@/lib/demo/logic/pdf/case-notes'
import { generateTimeOffsetDoc } from '@/lib/demo/logic/pdf/time-offset'
import { toCaseCards } from '@/components/demo/screens/screenData'
import type { CameraEntry, ScopeEntry } from '@/lib/demo/types'
import '@/components/demo/demo.css'

// Module-level monotonic id source for pulse keys (Date.now()/Math.random() are avoided).
let pulseSeq = 0

const isChapter = (v: string): v is ChapterId => (TOUR_CHAPTERS as readonly string[]).includes(v)

const blankCaseForm: NewCaseFields = { caseNumber: '', displayName: '', unit: '', oicName: '', oicBadge: '' }
const blankLocForm: NewLocationFields = { locationName: '', businessName: '', streetAddress: '', city: '' }

const IMPORT_STAGES: ImportStage[] = [
  { label: 'Reading the request', state: 'done' },
  { label: 'Extracting fields with the model', state: 'done' },
  { label: 'Mapping to the location form', state: 'done' },
]

interface ImportState {
  stage: 'picker' | 'paste' | 'progress' | 'result'
  text: string
  result: ImportResult | null
  lastLocId: string | null
}
const blankImport: ImportState = { stage: 'picker', text: '', result: null, lastLocId: null }

// Monotonic ids for UI-created scope/visit rows.
let uiSeq = 0
const blankScope = (): ScopeEntry => ({ id: `ui-s${uiSeq++}`, startDateTime: '', endDateTime: '', isActualTime: true, cameras: '' })
const blankVisit = () => ({ id: `ui-v${uiSeq++}`, arrival: '', departure: '' })
const blankCamera = (): CameraEntry => ({ id: `ui-c${uiSeq++}`, cameraName: '', resolution: '', recordingFps: '' })

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
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)
  const [pdf, setPdf] = useState<PdfState | null>(null)
  const [caseCompleted, setCaseCompleted] = useState(false)

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

  const guided = currentMode === 'guided'
  const narration = NARRATION[currentChapter]
  const dots: RailDot[] = TOUR_CHAPTERS.map((id) => ({ id, label: NARRATION[id].title, active: id === currentChapter }))
  const stepCaption = `Step ${chapterNumber(currentChapter)} of ${TOUR_CHAPTERS.length}`
  const nextLabel = currentChapter === 'splash' ? 'Start the tour' : nextChapter(currentChapter) ? 'Next' : 'Replay tour'
  const caseCards = useMemo(() => toCaseCards(cases, locations), [cases, locations])
  const currentLocation = locations.find((l) => l.id === currentLocationId) ?? null
  const currentCase = cases.find((c) => c.id === currentCaseId) ?? null

  const openMenu = () => store.getState().setDrawerOpen(true)
  const setScopes = (scopes: ScopeEntry[]) => store.getState().updateField('form.scopes', scopes)
  const setVisits = (visits: { id: string; arrival: string; departure: string }[]) =>
    store.getState().updateField('form.arrivalDepartures', visits)

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
  const runImport = () => {
    const caseId = targetCaseId ?? store.getState().currentCaseId
    if (!caseId) {
      setImp((s) => ({ ...s, stage: 'result', result: { ok: false, error: 'Select a case first.' } }))
      return
    }
    const patch = mapAiToForm(SAMPLE_EXTRACTION)
    const id = store.getState().addLocation(caseId, { locationName: patch.businessName || 'Imported location' })
    store.getState().applyImport(patch)
    const fieldCount = [
      patch.requesterName,
      patch.requesterBadgeNumber,
      patch.businessName,
      patch.streetAddress,
      patch.city,
      patch.requesterPhone,
      patch.requesterEmail,
      patch._import.dvrTypeBrand,
    ].filter(Boolean).length
    setImp((s) => ({
      ...s,
      stage: 'result',
      result: { ok: true, fieldCount, timeFrames: patch._import.timeFrames.length, locName: patch.businessName || 'location' },
      lastLocId: id,
    }))
  }

  // ---- time offset + OCR (the marquee) ----
  const calcOffset = () => {
    store.getState().calculateOffset()
    store.getState().generateExtractedScopes()
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
        return (
          <RequestedScopeScreen
            scopes={scopes}
            onChange={(i, patch) => setScopes(scopes.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))}
            onAdd={() => setScopes([...scopes, blankScope()])}
            onRemove={(i) => setScopes(scopes.filter((_, idx) => idx !== i))}
            onNext={onNext}
            onBack={onPrev}
            onMenu={openMenu}
          />
        )
      }
      case 'arrivalDeparture': {
        const visits = currentLocation?.form.arrivalDepartures ?? []
        return (
          <ArrivalDepartureScreen
            visits={visits}
            onChange={(i, patch) => setVisits(visits.map((v, idx) => (idx === i ? { ...v, ...patch } : v)))}
            onAdd={() => setVisits([...visits, blankVisit()])}
            onRemove={(i) => setVisits(visits.filter((_, idx) => idx !== i))}
            onNext={onNext}
            onBack={onPrev}
            onMenu={openMenu}
          />
        )
      }
      case 'timeOffset': {
        const off = currentLocation?.form.timeOffset ?? null
        const corrected: CorrectedScope[] = (currentLocation?.form.extractedScopes ?? []).map((ex, i) => {
          const req = currentLocation?.form.scopes[i]
          return { id: ex.id, reqLabel: req?.isActualTime ? 'real time' : 'DVR time', reqStart: req?.startDateTime ?? '', reqEnd: req?.endDateTime ?? '', adjStart: ex.startDateTime, adjEnd: ex.endDateTime, cameras: ex.cameras }
        })
        return (
          <TimeOffsetScreen
            dvrDateTime={capture.dvrDateTime}
            actualDateTime={capture.actualDateTime}
            onChangeDvr={(v) => store.getState().updateField('capture.dvrDateTime', v)}
            onChangeActual={(v) => store.getState().updateField('capture.actualDateTime', v)}
            onUseCurrentTime={() => {
              const now = getCurrentFormattedTime()
              store.getState().updateField('capture.dvrDateTime', now)
              store.getState().updateField('capture.actualDateTime', now)
            }}
            onCalculate={calcOffset}
            onCaptureOcr={() => {
              setOcrResult(null)
              store.getState().launch('ocr')
            }}
            captureMethod={off?.captureMethod ?? (capture.method === 'ocr' ? 'ocr' : null)}
            result={off ? { diff: off.formattedDifference, direction: off.direction, isCorrect: off.isCorrect } : null}
            correctedScopes={corrected}
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
        return (
          <ExtractedScopeScreen
            scopes={exs}
            onChange={(i, patch) => store.getState().updateField('form.extractedScopes', exs.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))}
            onRemove={(i) => store.getState().updateField('form.extractedScopes', exs.filter((_, idx) => idx !== i))}
            onRegenerate={() => store.getState().generateExtractedScopes()}
            onNext={onNext}
            onBack={onPrev}
            onMenu={openMenu}
          />
        )
      }
      case 'dvrInfo':
        return <DvrInfoScreen dvr={currentLocation?.form.dvr ?? EMPTY_FORM.dvr} onChange={(f, v) => store.getState().updateField(`form.dvr.${f}`, v)} onNext={onNext} onBack={onPrev} onMenu={openMenu} />
      case 'cameras': {
        const cams = currentLocation?.form.cameras ?? []
        return (
          <CamerasScreen
            cameras={cams}
            onChange={(i, patch) => store.getState().updateField('form.cameras', cams.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))}
            onAdd={() => store.getState().updateField('form.cameras', [...cams, blankCamera()])}
            onRemove={(i) => store.getState().updateField('form.cameras', cams.filter((_, idx) => idx !== i))}
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
          <ImportModal
            stage={imp.stage}
            text={imp.text}
            stages={IMPORT_STAGES}
            result={imp.result}
            onChoosePdf={() => setImp((s) => ({ ...s, stage: 'paste', text: SAMPLE_REQUEST_DOC }))}
            onChoosePaste={() => setImp((s) => ({ ...s, stage: 'paste', text: SAMPLE_REQUEST_DOC }))}
            onTextChange={(v) => setImp((s) => ({ ...s, text: v }))}
            onRun={runImport}
            onBack={() => setImp((s) => ({ ...s, stage: 'picker' }))}
            onRetry={() => setImp((s) => ({ ...s, stage: 'picker', result: null }))}
            onOpen={() => {
              if (imp.lastLocId) openLocation(imp.lastLocId)
              store.getState().closeModal()
            }}
            onCancel={() => store.getState().closeModal()}
          />
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
