'use client'

/**
 * rAF-coalesced binding of the import log bus to React state — the web port of the
 * phone's `useImportLog` (phone-inventory §5.7.2). P1.4's terminal renders from this.
 *
 * Coalescing: bus events buffer in a ref and flush to ONE state commit per animation
 * frame (setTimeout(16) fallback where rAF is unavailable), so a verbose emit burst
 * (prompt dumps, batch streams) can't storm React with per-line renders. The committed
 * list mirrors the bus's 400-line ring cap.
 *
 * Reset: a `reset` event (new run / cancel) clears the buffer and bumps `epoch` — the
 * stable per-run signal P1.4 keys its scroll/pin state on. `active=false` and unmount
 * clear committed lines and cancel any pending flush.
 *
 * Store-bridge note: this hook subscribes to the BUS, not the Zustand store — the bus
 * is engine-owned pipeline state outside the store, exactly like the `onStage` callback
 * it extends (pipeline → UI without store mediation), so the "only DemoExperience
 * touches the store" rule is untouched. The `bus` parameter is the test seam (mirrors
 * the injectable `store` prop); production consumers take the singleton default.
 */

import { useEffect, useRef, useState } from 'react'
import {
  importLogBus,
  IMPORT_LOG_MAX_LINES,
  type ImportLogBus,
  type ImportLogLine,
} from '@/features/demo/engine/logic/import-log'

export interface ImportLogView {
  lines: readonly ImportLogLine[]
  /** Bumps once per run/reset — P1.4's "new run started" signal. */
  epoch: number
}

interface PendingBatch {
  lines: ImportLogLine[]
  epoch: number | null
  cleared: boolean
}

/** One scheduled flush; rAF when available, 16ms timer fallback (jsdom/tests). */
function scheduleFrame(cb: () => void): () => void {
  if (typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function') {
    const id = requestAnimationFrame(() => cb())
    return () => cancelAnimationFrame(id)
  }
  const id = setTimeout(cb, 16)
  return () => clearTimeout(id)
}

export function useImportLog(active: boolean, bus: ImportLogBus = importLogBus): ImportLogView {
  const [view, setView] = useState<ImportLogView>(() => ({ lines: [], epoch: bus.getEpoch() }))
  const pendingRef = useRef<PendingBatch | null>(null)
  const cancelFrameRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!active) {
      // Keep the epoch; drop the lines (mirrors the phone's active=false clear).
      setView((v) => (v.lines.length ? { lines: [], epoch: v.epoch } : v))
      return
    }

    const flush = () => {
      cancelFrameRef.current = null
      const batch = pendingRef.current
      if (!batch || (!batch.cleared && batch.lines.length === 0 && batch.epoch === null)) return
      pendingRef.current = { lines: [], epoch: null, cleared: false }
      setView((prev) => {
        const base = batch.cleared ? [] : prev.lines
        let lines = batch.lines.length ? [...base, ...batch.lines] : base
        if (lines.length > IMPORT_LOG_MAX_LINES) lines = lines.slice(lines.length - IMPORT_LOG_MAX_LINES)
        return { lines, epoch: batch.epoch ?? prev.epoch }
      })
    }
    const schedule = () => {
      if (!cancelFrameRef.current) cancelFrameRef.current = scheduleFrame(flush)
    }

    // Start from scratch each (re)subscribe: `cleared` wipes any stale committed lines,
    // and the synchronous replay from subscribe() fills the first batch.
    pendingRef.current = { lines: [], epoch: bus.getEpoch(), cleared: true }
    const unsubscribe = bus.subscribe((event) => {
      const batch = pendingRef.current
      if (!batch) return
      if (event.kind === 'reset') {
        batch.cleared = true
        batch.lines = []
        batch.epoch = event.epoch
      } else {
        batch.lines.push(event.line)
      }
      schedule()
    })
    schedule() // commit the replay (or the empty clear) on the first frame

    return () => {
      unsubscribe()
      cancelFrameRef.current?.()
      cancelFrameRef.current = null
      pendingRef.current = null
    }
  }, [active, bus])

  return view
}
