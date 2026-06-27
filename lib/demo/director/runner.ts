import type { StoreApi } from 'zustand/vanilla'
import type { DemoActions, DemoState } from '@/lib/demo/store/create-store'
import type { Beat, BeatStep, PulseEvent } from '@/lib/demo/director/types'
import { BEATS } from '@/lib/demo/director/beats'

type Store = StoreApi<DemoState & DemoActions>

/** Timing source — injected so tests can drive it deterministically. */
export interface Clock {
  setTimeout(fn: () => void, ms: number): () => void
}

export const realClock: Clock = {
  setTimeout: (fn, ms) => {
    const id = setTimeout(fn, ms)
    return () => clearTimeout(id)
  },
}

export interface RunBeatOptions {
  clock?: Clock
  onPulse?: (e: PulseEvent) => void
  typeSpeedMs?: number
}

export interface BeatHandle {
  cancel(): void
  done: Promise<void>
}

/**
 * Execute a chapter's beat against the store. In guided mode this auto-plays the whole
 * beat; the runner is simply not used in sandbox mode (the visitor drives the store). A
 * failing step is caught and skipped — a bad beat degrades, it never throws into React.
 */
export function runBeat(store: Store, beat: Beat, opts: RunBeatOptions = {}): BeatHandle {
  const clock = opts.clock ?? realClock
  const typeSpeedMs = opts.typeSpeedMs ?? 45
  let cancelled = false
  const cancels = new Set<() => void>()
  const waiters = new Set<() => void>()
  let resolveDone!: () => void
  const done = new Promise<void>((r) => (resolveDone = r))

  function wait(ms: number): Promise<void> {
    return new Promise((res) => {
      const settle = () => {
        waiters.delete(settle)
        res()
      }
      waiters.add(settle)
      cancels.add(clock.setTimeout(settle, ms))
    })
  }

  function callAction(action: keyof DemoActions, args?: unknown[]): void {
    const fn = store.getState()[action] as (...a: unknown[]) => unknown
    fn(...(args ?? []))
  }

  async function applyStep(step: BeatStep): Promise<void> {
    try {
      switch (step.kind) {
        case 'type': {
          const per = step.perCharMs ?? typeSpeedMs
          for (let i = 1; i <= step.value.length; i++) {
            if (cancelled) return
            store.getState().updateField(step.field, step.value.slice(0, i))
            if (i < step.value.length) await wait(per)
          }
          break
        }
        case 'field':
          store.getState().updateField(step.field, step.value)
          break
        case 'tap':
          opts.onPulse?.({ target: step.target })
          if (step.action) callAction(step.action, step.args)
          break
        case 'call':
          callAction(step.action, step.args)
          break
        case 'launch': {
          store.getState().launch(step.screen)
          const sub = BEATS[step.screen]
          if (sub) {
            for (const inner of sub.steps) {
              if (cancelled) return
              await applyStep(inner)
            }
          }
          store.getState().closeLaunch()
          break
        }
        case 'set':
          store.setState(step.patch)
          break
        case 'wait':
          await wait(step.ms)
          break
      }
    } catch (err) {
      // Resilience: a bad step (unknown action, throwing logic) is logged and skipped.
      if (typeof console !== 'undefined') console.warn('[director] step skipped:', err)
    }
  }

  async function run(): Promise<void> {
    for (const step of beat.steps) {
      if (cancelled) break
      await applyStep(step)
    }
    resolveDone()
  }

  void run()

  return {
    cancel() {
      cancelled = true
      cancels.forEach((c) => c())
      cancels.clear()
      // resolve any in-flight wait so run() can unwind and `done` settles
      waiters.forEach((w) => w())
      waiters.clear()
    },
    done,
  }
}
