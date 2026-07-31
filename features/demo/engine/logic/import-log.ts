/**
 * Import log bus — the retain-and-replay event bus behind the import terminal (parity P1.3).
 * Web port of the phone's `src/features/import/pdf-import/services/import-log-bus.ts`.
 *
 * Semantics (mirroring the phone, phone-inventory §5.7.2):
 * - Every emitted line is RETAINED (ring-capped at {@link IMPORT_LOG_MAX_LINES}, oldest
 *   evicted first) and dispatched to live subscribers.
 * - `subscribe` REPLAYS the whole retained run to the new listener first — load-bearing,
 *   because the run's opening lines are emitted before the terminal UI mounts.
 * - `beginRun` starts a fresh run: clears the retained log, bumps the epoch, broadcasts a
 *   reset marker, and returns an {@link ImportLogEmitter} bound to that run.
 *
 * Run isolation (the generation-token pattern, mirroring `importGen` in DemoExperience):
 * each `beginRun`/`reset` invalidates every previously issued emitter, so late lines from a
 * cancelled or superseded run are silently dropped — they can never leak into the next
 * run's log.
 *
 * Engine purity: no React, and NO `Date.now()` — the clock is injected per run via
 * `beginRun(now)` (the UI passes its wall-clock seam; tests pass a fixed/stepping clock).
 * `elapsedMs` is milliseconds since the run began, read through that injected clock.
 */

/**
 * The phone's level set, used verbatim as the on-screen tag (P1.4 renders these strings
 * in the terminal gutter with per-level accent colors).
 */
export type ImportLogLevel =
  | 'INIT' // run opening (reading document / pasted text, batch header)
  | 'FILE' // per-file marker in a PDF run
  | 'PDF' // pdf.js text extraction
  | 'AI' // model request/response events
  | 'VERB' // verbose dumps (document text, prompts, raw reply)
  | 'NORM' // normalization adjustments + warning-class lines (incl. sample fallback)
  | 'CASE' // apply stage: geocode + case-record injection
  | 'OK' // stage completion
  | 'DONE' // run completion
  | 'ERR' // failure

/**
 * One log line. All fields are readonly (R-34): the SAME object identity is shared by the
 * retained ring, every subscriber, replays, and React state — one consumer mutation would
 * corrupt the run for everyone, so the type forbids it.
 */
export interface ImportLogLine {
  /** 1-based within the run; keeps counting past cap eviction (stable React key). */
  readonly seq: number
  /** Milliseconds since the run began, from the injected clock — never `Date.now()`. */
  readonly elapsedMs: number
  readonly level: ImportLogLevel
  readonly text: string
  /** Optional expandable detail block (clipped at the emit site). */
  readonly detail?: string
}

export type ImportLogEvent =
  | { kind: 'line'; line: ImportLogLine }
  /** Broadcast on `beginRun`/`reset`: the retained log was cleared; `epoch` identifies the new run. */
  | { kind: 'reset'; epoch: number }

export type ImportLogListener = (event: ImportLogEvent) => void

/** Ring cap on retained lines (the phone's `IMPORT_LOG_MAX_EVENTS`). */
export const IMPORT_LOG_MAX_LINES = 400

/**
 * Handle bound to one run. `log` after the run has been superseded (a newer `beginRun`)
 * or cancelled (`reset`) is a silent no-op — stale-run isolation lives here, not at
 * call sites.
 */
export interface ImportLogEmitter {
  log(level: ImportLogLevel, text: string, detail?: string): void
  /** Ms since this run began, via the run's injected clock (for duration details). */
  elapsed(): number
  /** False once this run has been superseded or reset. */
  isLive(): boolean
}

export interface ImportLogBus {
  /**
   * Start a new run: clear the retained log, invalidate previous emitters, bump the
   * epoch, broadcast `{kind:'reset'}`, and return this run's emitter. `now` is the
   * run's clock seam (ms).
   */
  beginRun(now: () => number): ImportLogEmitter
  /** Cancel path: clear the retained log + invalidate emitters + broadcast reset. */
  reset(): void
  /** Replays the retained run to `listener` synchronously, then live events. Returns unsubscribe. */
  subscribe(listener: ImportLogListener): () => void
  /** Fresh readonly snapshot of the retained lines — never the live ring array. */
  getLines(): readonly ImportLogLine[]
  /** Increments on every `beginRun`/`reset` — the UI's stable reset signal. */
  getEpoch(): number
}

/** Clip an emit-site detail dump to `max` chars (appending an ellipsis marker). */
export function clipDetail(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}…`
}

export function createImportLogBus(): ImportLogBus {
  let lines: ImportLogLine[] = []
  const listeners = new Set<ImportLogListener>()
  let epoch = 0
  let runToken = 0
  let seq = 0

  const broadcast = (event: ImportLogEvent) => {
    // Iterate a copy so a listener unsubscribing mid-dispatch can't skip a sibling.
    for (const listener of Array.from(listeners)) listener(event)
  }

  const clearRun = () => {
    runToken++
    epoch++
    lines = []
    seq = 0
    broadcast({ kind: 'reset', epoch })
  }

  return {
    beginRun(now: () => number): ImportLogEmitter {
      clearRun()
      const myToken = runToken
      const t0 = now()
      return {
        log(level, text, detail) {
          if (myToken !== runToken) return // stale run — drop, never leak
          const line: ImportLogLine = { seq: ++seq, elapsedMs: Math.max(0, now() - t0), level, text, ...(detail !== undefined ? { detail } : {}) }
          lines.push(line)
          if (lines.length > IMPORT_LOG_MAX_LINES) lines.shift()
          broadcast({ kind: 'line', line })
        },
        elapsed: () => Math.max(0, now() - t0),
        isLive: () => myToken === runToken,
      }
    },
    reset: clearRun,
    subscribe(listener) {
      listeners.add(listener)
      for (const line of lines) listener({ kind: 'line', line }) // retain-and-replay
      return () => {
        listeners.delete(listener)
      }
    },
    getLines: () => [...lines],
    getEpoch: () => epoch,
  }
}

/**
 * The module-level singleton (mirrors the phone's module-scope bus). The pipeline emits
 * into it; `useImportLog` subscribes to it. Tests create isolated buses via
 * `createImportLogBus()`.
 */
export const importLogBus: ImportLogBus = createImportLogBus()
