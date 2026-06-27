'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useStore } from 'zustand'
import { createDemoStore, type DemoStore } from '@/lib/demo/store/create-store'
import { runBeat } from '@/lib/demo/director/runner'
import { BEATS } from '@/lib/demo/director/beats'
import { NARRATION } from '@/lib/demo/content/narration'
import { TOUR_CHAPTERS, chapterNumber, nextChapter, prevChapter } from '@/lib/demo/content/screens'
import type { ChapterId, DemoMode } from '@/lib/demo/types'
import { PhoneFrame } from '@/components/demo/PhoneFrame'
import { StoryRail, type RailDot } from '@/components/demo/StoryRail'
import { TouchIndicator, type Pulse } from '@/components/demo/TouchIndicator'
import '@/components/demo/demo.css'

// Module-level monotonic id source for pulse keys (Date.now()/Math.random() are avoided).
let pulseSeq = 0

const isChapter = (v: string): v is ChapterId => (TOUR_CHAPTERS as readonly string[]).includes(v)

/** Map a kebab `?step` slug (e.g. `time-offset`) to its camelCase chapter id. */
function slugToChapter(slug: string): ChapterId | null {
  const camel = slug.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
  return isChapter(camel) ? camel : null
}

/**
 * The single store/director bridge. Creates the demo store once, reads ?mode/?step, subscribes
 * selectively, runs the director on chapter-enter in guided mode, gates the phone's
 * pointer-events, and renders the StoryRail + PhoneFrame. The ONLY component that touches the
 * store — every screen below it (M4) is presentational.
 */
export function DemoExperience() {
  const storeRef = useRef<DemoStore | null>(null)
  if (!storeRef.current) storeRef.current = createDemoStore()
  const store = storeRef.current

  const params = useSearchParams()
  const mode: DemoMode = params?.get('mode') === 'sandbox' ? 'sandbox' : 'guided'
  const step = params?.get('step') ?? null

  // Seed (guided) / reset (sandbox) on mount + when the URL mode/step changes.
  useEffect(() => {
    const st = store.getState()
    if (mode === 'sandbox') {
      st.reset()
    } else {
      st.seedGuided()
      const target = step ? slugToChapter(step) : null
      if (target) st.setView(target)
    }
  }, [store, mode, step])

  const view = useStore(store, (s) => s.view)
  const currentMode = useStore(store, (s) => s.mode)

  const [pulses, setPulses] = useState<Pulse[]>([])

  // Play the chapter's beat on enter (guided only); cancel on leave.
  useEffect(() => {
    if (currentMode !== 'guided') return
    const beat = BEATS[view as ChapterId]
    if (!beat) return
    const handle = runBeat(store, beat, {
      onPulse: (e) => {
        const id = `${e.target}-${view}-${pulseSeq++}`
        // real per-target coords land with the screens (M4); centre the ripple for now.
        setPulses((p) => [...p, { id, x: 189, y: 393 }])
        setTimeout(() => setPulses((p) => p.filter((x) => x.id !== id)), 650)
      },
    })
    return () => handle.cancel()
  }, [store, currentMode, view])

  const guided = currentMode === 'guided'
  const chapterId: ChapterId = isChapter(view) ? view : 'splash'
  const narration = NARRATION[chapterId]
  const dots: RailDot[] = TOUR_CHAPTERS.map((id) => ({ id, label: NARRATION[id].title, active: id === chapterId }))
  const stepCaption = `Step ${chapterNumber(chapterId)} of ${TOUR_CHAPTERS.length}`
  const nextLabel = chapterId === 'splash' ? 'Start the tour' : nextChapter(chapterId) ? 'Next' : 'Replay tour'

  const onNext = () => {
    const n = nextChapter(chapterId)
    if (n) store.getState().setView(n)
  }
  const onPrev = () => {
    const p = prevChapter(chapterId)
    if (p) store.getState().setView(p)
  }
  const onJump = (id: ChapterId) => store.getState().setView(id)
  const onSetMode = (m: DemoMode) => {
    if (m === 'guided') store.getState().seedGuided()
    else store.getState().reset()
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
        <PhoneFrame interactive={!guided}>
          <TouchIndicator pulses={pulses} />
          {/* screens land in M4 — the frame renders empty for the shell milestone */}
        </PhoneFrame>
      </div>
      <StoryRail
        narration={narration}
        mode={currentMode}
        dots={dots}
        stepCaption={stepCaption}
        canPrev={prevChapter(chapterId) !== null}
        nextLabel={nextLabel}
        onNext={onNext}
        onPrev={onPrev}
        onJump={onJump}
        onSetMode={onSetMode}
      />
    </div>
  )
}
