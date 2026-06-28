'use client'

import { useLayoutEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { pad2 } from '@/features/demo/engine/logic/datetime-parts'
import { T } from '@/features/demo/ui/inputs/input-theme'

const ROW = T.rowH // 44
const VISIBLE = 5 // visible rows (2 padding above + selected + 2 below)
const PAD = ((VISIBLE - 1) / 2) * ROW // 2 rows of padding so first/last can center

/** Round scrollTop to the nearest row index, clamped to [0, count-1]. Pure (jsdom-testable). */
export function indexFromScrollTop(scrollTop: number, rowH: number, count: number): number {
  return Math.max(0, Math.min(count - 1, Math.round(scrollTop / rowH)))
}

interface ColumnProps {
  count: number
  value: number
  onChange(v: number): void
  dataCol: string
  label: string
}

function WheelColumn({ count, value, onChange, dataCol, label }: ColumnProps) {
  const ref = useRef<HTMLDivElement>(null)
  const lastEmitted = useRef(-1)

  // Reflect the controlled value as the scroll position — but skip when the change came
  // from our own scroll (lastEmitted === value), so we never fight an in-progress scroll.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (value !== lastEmitted.current) {
      el.scrollTop = value * ROW
      lastEmitted.current = value
    }
  }, [value])

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    const idx = indexFromScrollTop(el.scrollTop, ROW, count)
    if (idx !== value) {
      lastEmitted.current = idx
      onChange(idx)
    }
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <div
        ref={ref}
        data-wheel-col={dataCol}
        onScroll={onScroll}
        style={{
          height: VISIBLE * ROW,
          width: 64,
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          paddingTop: PAD,
          paddingBottom: PAD,
        }}
      >
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            style={{
              height: ROW,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              scrollSnapAlign: 'center',
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: 1,
              fontVariantNumeric: 'tabular-nums',
              color: i === value ? '#e8f0f8' : T.text,
            }}
          >
            {pad2(i)}
          </div>
        ))}
      </div>
      {/* engraved column label (h / m / s) */}
      <span style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 600, color: 'rgba(153,186,221,0.5)', pointerEvents: 'none' }}>
        {label}
      </span>
    </div>
  )
}

export interface TimeWheelProps {
  value: { h: number; mi: number; s: number }
  onChange(next: { h: number; mi: number; s: number }): void
}

const overlay: CSSProperties = { position: 'absolute', left: 0, right: 0, pointerEvents: 'none' }

/** HH:MM:SS drum: three scroll-snap columns with a center selection band + edge fade. */
export function TimeWheel({ value, onChange }: TimeWheelProps) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        borderRadius: 12,
        border: `1px solid rgba(0,0,0,0.4)`,
        background: T.raised,
        padding: '0 10px',
        overflow: 'hidden',
      }}
    >
      <WheelColumn count={24} value={value.h} onChange={(h) => onChange({ ...value, h })} dataCol="h" label="h" />
      <WheelColumn count={60} value={value.mi} onChange={(mi) => onChange({ ...value, mi })} dataCol="mi" label="m" />
      <WheelColumn count={60} value={value.s} onChange={(s) => onChange({ ...value, s })} dataCol="s" label="s" />

      {/* center selection band */}
      <div
        style={{
          ...overlay,
          top: `calc(50% - ${ROW / 2}px)`,
          height: ROW,
          background: T.primarySoft,
          borderTop: `1px solid ${T.primaryEdge}`,
          borderBottom: `1px solid ${T.primaryEdge}`,
        }}
      />
      {/* drum-curvature gradient fade (top + bottom) */}
      <div
        style={{
          ...overlay,
          top: 0,
          bottom: 0,
          background: `linear-gradient(180deg, ${T.raised} 0%, rgba(15,32,53,0) 42%, rgba(15,32,53,0) 58%, ${T.raised} 100%)`,
        }}
      />
    </div>
  )
}
