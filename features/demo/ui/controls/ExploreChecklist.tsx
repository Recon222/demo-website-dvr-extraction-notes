'use client'

import { Fragment, useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import type { AppView } from '@/features/demo/engine/store/create-store'
import type { ExploreStatus } from '@/features/demo/engine/store/selectors'

const mono = "'JetBrains Mono',monospace"

export interface ExploreChecklistProps {
  items: ExploreStatus[]
  onJump(view: AppView): void
  /** Per-screen narration for the active row — rendered directly beneath it so the copy
   *  follows the manifest step the visitor is on instead of sitting below the whole list. */
  activeDetail?: ReactNode
}

const row: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '7px 12px',
  borderRadius: 8,
  border: '1px solid rgba(30,58,95,0.45)',
  cursor: 'pointer',
  textAlign: 'left',
  width: '100%',
  scrollMarginTop: 24, // gap above the row when it's scrolled to the top of the viewport
}

/**
 * The exploration manifest — the rail's numbered checklist of everything worth seeing.
 * Rows light green once visited (same LED language as the wizard drawer; state is also
 * announced via aria-label) and clicking any row jumps the phone to that screen — so a
 * visitor who hasn't found the Map yet can see the unlit row and go straight there.
 * Presentational: rows arrive as ExploreStatus (numbering derived from the registry).
 */
export function ExploreChecklist({ items, onJump, activeDetail }: ExploreChecklistProps) {
  const seen = items.filter((i) => i.visited).length
  const done = seen === items.length

  // Keep the active step + its copy in view as the visitor advances (deep rows would
  // otherwise sit low). Fires only when the active row *changes* — never on mount, and
  // StrictMode-safe (prev-id guard, not a mounted flag). Instant when reduced motion.
  const reduce = useReducedMotion()
  const activeRowRef = useRef<HTMLButtonElement | null>(null)
  const activeId = items.find((i) => i.active)?.id
  const prevActiveId = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (prevActiveId.current !== undefined && prevActiveId.current !== activeId) {
      activeRowRef.current?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
    }
    prevActiveId.current = activeId
  }, [activeId, reduce])
  return (
    <div style={{ marginBottom: 34 }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: mono, fontSize: 11, letterSpacing: 1.5, color: '#7a9fc4', textTransform: 'uppercase', marginBottom: 10 }}
      >
        <span>Exploration manifest</span>
        <span style={{ color: done ? '#10d177' : '#5d7a9a' }}>
          {seen}/{items.length} explored
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((it) => (
          <Fragment key={it.id}>
            <button
              type="button"
              ref={it.active ? activeRowRef : undefined}
              onClick={() => onJump(it.jumpTo)}
              aria-label={`${it.label}, ${it.visited ? 'visited' : 'not visited yet'}`}
              data-explore-active={it.active ? '' : undefined}
              style={{ ...row, background: it.active ? 'rgba(26,53,80,0.45)' : 'rgba(10,20,34,0.5)' }}
            >
              {it.active && (
                <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: 6, bottom: 6, width: 3, borderRadius: '0 2px 2px 0', background: '#2B8CC1' }} />
              )}
              <span aria-hidden="true" style={{ fontFamily: mono, fontSize: 10, color: it.visited ? '#4ecdc4' : '#46607e' }}>
                {it.number}
              </span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: it.visited ? '#cfe0f2' : '#7a9fc4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {it.label}
              </span>
              <span
                aria-hidden="true"
                data-led={it.visited ? 'on' : 'off'}
                style={{ width: 8, height: 8, borderRadius: 4, flexShrink: 0, background: it.visited ? '#10d177' : 'transparent', border: it.visited ? 'none' : '1px solid #2a4a6f', boxShadow: it.visited ? '0 0 7px rgba(16,209,119,0.6)' : 'none' }}
              />
            </button>
            {it.active ? activeDetail : null}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
