'use client'

import type { CSSProperties } from 'react'
import type { ChapterId, ChapterNarration, DemoMode } from '@/lib/demo/types'
import { RailNav } from '@/components/demo/controls/RailNav'

const mono = "'JetBrains Mono',monospace"

export interface RailDot {
  id: ChapterId
  label: string
}

export interface StoryRailProps {
  narration: ChapterNarration
  mode: DemoMode
  dots: RailDot[]
  /** The single active chapter — "exactly one active" is structural, not a per-dot bool. */
  activeDot: ChapterId
  stepCaption: string
  canPrev: boolean
  nextLabel: string
  onNext(): void
  onPrev(): void
  onJump(id: ChapterId): void
  onSetMode(mode: DemoMode): void
}

const pill: CSSProperties = {
  padding: '8px 17px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}
const pillActive: CSSProperties = {
  ...pill,
  background: '#1a3550',
  color: '#cfe6f5',
  boxShadow: '0 1px 6px rgba(0,0,0,0.3)',
  cursor: 'default',
}
const pillIdle: CSSProperties = { ...pill, color: '#7a9fc4' }

/**
 * The narrative rail beside the phone (lifted from the prototype): walkthrough eyebrow, the
 * guided/explore mode toggle, progress dots, and the per-chapter narration. In guided mode it
 * shows Back/Next + a tip; in sandbox it shows the "you're driving" callout. Presentational —
 * all state arrives as props, all intent leaves as callbacks.
 */
export function StoryRail({
  narration,
  mode,
  dots,
  activeDot,
  stepCaption,
  canPrev,
  nextLabel,
  onNext,
  onPrev,
  onJump,
  onSetMode,
}: StoryRailProps) {
  const guided = mode === 'guided'
  return (
    <div style={{ flex: '1 1 auto', minWidth: 420, maxWidth: 680, padding: '52px 56px 80px 36px', color: '#e7eef6' }}>
      <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: 2, color: '#4ecdc4', textTransform: 'uppercase', marginBottom: 30 }}>
        DVR Extraction Notes · Interactive Walkthrough
      </div>

      {/* mode toggle */}
      <div style={{ display: 'inline-flex', padding: 4, borderRadius: 11, border: '1px solid #1e3a5f', background: '#0c1727', marginBottom: 26 }}>
        <button
          type="button"
          onClick={() => {
            if (!guided) onSetMode('guided')
          }}
          style={{ ...(guided ? pillActive : pillIdle), border: 'none', background: guided ? '#1a3550' : 'transparent' }}
        >
          Guided tour
        </button>
        <button
          type="button"
          onClick={() => {
            if (guided) onSetMode('sandbox')
          }}
          style={{ ...(!guided ? pillActive : pillIdle), border: 'none', background: !guided ? '#1a3550' : 'transparent' }}
        >
          Free explore
        </button>
      </div>

      {/* progress dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14, flexWrap: 'wrap' }}>
        {dots.map((d) =>
          d.id === activeDot ? (
            <div
              key={d.id}
              title={d.label}
              style={{ width: 28, height: 6, borderRadius: 3, background: '#2B8CC1', boxShadow: '0 0 10px rgba(43,140,193,0.7)' }}
            />
          ) : (
            <button
              key={d.id}
              type="button"
              title={d.label}
              aria-label={d.label}
              onClick={() => onJump(d.id)}
              style={{ width: 7, height: 7, borderRadius: 4, border: 'none', padding: 0, background: '#1e3a5f', cursor: 'pointer' }}
            />
          ),
        )}
      </div>
      <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: 1, color: '#7a9fc4', marginBottom: 34 }}>{stepCaption}</div>

      {/* narration pane */}
      <div data-rail-pane>
        <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: 2, color: '#2B8CC1', textTransform: 'uppercase', marginBottom: 14 }}>
          {narration.eyebrow}
        </div>
        <h2 style={{ fontSize: 38, fontWeight: 700, lineHeight: 1.1, margin: '0 0 22px', color: '#f4f8fc', letterSpacing: '-0.5px' }}>
          {narration.title}
        </h2>
        {narration.paras.map((p, i) => (
          <p key={i} style={{ fontSize: 16.5, lineHeight: 1.65, color: '#bcccde', margin: '0 0 18px' }}>
            {p}
          </p>
        ))}
        {narration.bullets.length > 0 && (
          <>
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: 1.5, color: '#7a9fc4', textTransform: 'uppercase', margin: '30px 0 14px' }}>
              On this screen
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 28 }}>
              {narration.bullets.map((b, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ flex: '0 0 auto', width: 6, height: 6, borderRadius: 3, background: '#4ecdc4', marginTop: 8 }} />
                  <div style={{ fontSize: 15, lineHeight: 1.5, color: '#cdd9e6' }}>{b}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {guided ? (
        <>
          {narration.tip && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,217,61,0.3)', background: 'rgba(255,217,61,0.07)', marginBottom: 32 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffd93d" strokeWidth="2" style={{ flex: '0 0 auto', marginTop: 1 }}>
                <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2v.5h6V15.5c0-.8.3-1.3 1-2A6 6 0 0 0 12 3z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div style={{ fontSize: 14, lineHeight: 1.5, color: '#e7d9a6' }}>{narration.tip}</div>
            </div>
          )}
          <RailNav canPrev={canPrev} nextLabel={nextLabel} onPrev={onPrev} onNext={onNext} />
          <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginTop: 26, color: '#5d7a9a', fontSize: 13 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5d7a9a" strokeWidth="2">
              <path d="M9 11l3 3 8-8M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>You can also tap directly inside the phone to explore.</span>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start', padding: '16px 18px', borderRadius: 12, border: '1px solid rgba(78,205,196,0.28)', background: 'rgba(78,205,196,0.06)', marginBottom: 22 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ecdc4" strokeWidth="1.8" style={{ flex: '0 0 auto', marginTop: 1 }}>
              <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#cfeeea', marginBottom: 5 }}>You&apos;re driving</div>
              <div style={{ fontSize: 14.5, lineHeight: 1.6, color: '#aecbc8' }}>
                Tap through the phone like a real user — open a case, fill fields, run the AI import, calibrate time, capture the DVR clock. These notes just follow whatever screen you land on.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSetMode('guided')}
            style={{ display: 'inline-flex', gap: 9, alignItems: 'center', padding: '12px 20px', borderRadius: 10, border: '1px solid #2a4a6f', background: 'transparent', color: '#99badd', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            Switch to guided tour
          </button>
        </>
      )}
    </div>
  )
}
