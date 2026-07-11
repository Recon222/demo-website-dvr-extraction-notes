'use client'

import type { ChapterNarration } from '@/features/demo/engine/types'
import type { AppView } from '@/features/demo/engine/store/create-store'
import type { ExploreStatus } from '@/features/demo/engine/store/selectors'
import { ExploreChecklist } from '@/features/demo/ui/controls/ExploreChecklist'

const mono = "'JetBrains Mono',monospace"

export interface StoryRailProps {
  narration: ChapterNarration
  /** The exploration manifest rows (registry × visited, from selectExploreStatus). */
  explore: ExploreStatus[]
  /** Row click → navigate the phone. */
  onJump(view: AppView): void
  /** Back-to-site click — the bridge decides: navigate, or preventDefault + dialog. */
  onBackToSite(e: React.MouseEvent<HTMLAnchorElement>): void
}

/**
 * The narrative rail beside the phone: walkthrough eyebrow, the standing "you're driving"
 * callout, the exploration manifest (what you've seen, click to jump), and the per-screen
 * narration + tip. The copy follows whatever screen the visitor lands on. Presentational —
 * all state arrives as props.
 */
export function StoryRail({ narration, explore, onJump, onBackToSite }: StoryRailProps) {
  return (
    <div style={{ flex: '1 1 auto', minWidth: 420, maxWidth: 680, padding: '52px 56px 80px 36px', color: '#e7eef6' }}>
      {/* the way back to the marketing site — the bridge gates it on unseen manifest rows */}
      <a
        href="/"
        onClick={onBackToSite}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: mono, fontSize: 11, letterSpacing: 1.5, color: '#5d7a9a', textTransform: 'uppercase', textDecoration: 'none', marginBottom: 20 }}
      >
        <span aria-hidden="true">←</span> Back to site
      </a>

      <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: 2, color: '#4ecdc4', textTransform: 'uppercase', marginBottom: 30 }}>
        DVR Extraction Notes · Interactive Walkthrough
      </div>

      {/* the standing "you're driving" callout — this is the whole premise of the demo */}
      <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start', padding: '16px 18px', borderRadius: 12, border: '1px solid rgba(78,205,196,0.28)', background: 'rgba(78,205,196,0.06)', marginBottom: 30 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ecdc4" strokeWidth="1.8" style={{ flex: '0 0 auto', marginTop: 1 }}>
          <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#cfeeea', marginBottom: 5 }}>You&apos;re driving</div>
          <div style={{ fontSize: 14.5, lineHeight: 1.6, color: '#aecbc8' }}>
            Tap through the phone like a real user — create a case, fill fields, run the AI import, calibrate time, capture the DVR clock. These notes just follow whatever screen you land on.
          </div>
        </div>
      </div>

      {/* exploration manifest — lights up as screens are visited; rows jump the phone */}
      <ExploreChecklist items={explore} onJump={onJump} />

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

      {/* per-screen tip — the tour's nudges promoted to always-on hints */}
      {narration.tip && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,217,61,0.3)', background: 'rgba(255,217,61,0.07)', marginBottom: 32 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffd93d" strokeWidth="2" style={{ flex: '0 0 auto', marginTop: 1 }}>
            <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2v.5h6V15.5c0-.8.3-1.3 1-2A6 6 0 0 0 12 3z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: '#e7d9a6' }}>{narration.tip}</div>
        </div>
      )}
    </div>
  )
}
