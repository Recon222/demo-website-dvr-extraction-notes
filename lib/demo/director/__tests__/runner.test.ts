import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { runBeat } from '@/lib/demo/director/runner'
import {
  freshStore,
  seededStore,
  newCaseInput,
  newLocationInput,
} from '@/lib/demo/store/__tests__/test-utils'
import { selectCurrentLocation } from '@/lib/demo/store/selectors'
import type { Beat } from '@/lib/demo/director/types'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function storeWithLocation() {
  const store = freshStore()
  const c = store.getState().createCase(newCaseInput())
  store.getState().addLocation(c, newLocationInput({ businessName: '' }))
  return store
}

function offsetReady() {
  const store = seededStore()
  store.getState().updateField('capture.dvrDateTime', '2025-03-08 12:05:30')
  store.getState().updateField('capture.actualDateTime', '2025-03-08 12:00:00')
  return store
}

describe('runBeat — type step', () => {
  it('progressively fills the target field over time', async () => {
    const store = storeWithLocation()
    const beat: Beat = {
      chapter: 'submission',
      steps: [{ kind: 'type', field: 'businessName', value: 'Kim', perCharMs: 10 }],
    }
    const h = runBeat(store, beat)
    expect(selectCurrentLocation(store.getState())?.businessName).toBe('K') // first char synchronous
    await vi.advanceTimersByTimeAsync(10)
    expect(selectCurrentLocation(store.getState())?.businessName).toBe('Ki')
    await vi.advanceTimersByTimeAsync(10)
    expect(selectCurrentLocation(store.getState())?.businessName).toBe('Kim')
    await h.done
  })
})

describe('runBeat — tap step', () => {
  it('emits a touch pulse and invokes the bound action', async () => {
    const store = offsetReady()
    const pulses: string[] = []
    const beat: Beat = {
      chapter: 'timeOffset',
      steps: [{ kind: 'tap', target: 'calculate', action: 'calculateOffset' }],
    }
    await runBeat(store, beat, { onPulse: (e) => pulses.push(e.target) }).done
    expect(pulses).toEqual(['calculate'])
    expect(selectCurrentLocation(store.getState())?.form.timeOffset?.formattedDifference).toBe('00:05:30')
  })
})

describe('runBeat — call step', () => {
  it('invokes calculateOffset so timeOffset is populated', async () => {
    const store = offsetReady()
    const beat: Beat = { chapter: 'timeOffset', steps: [{ kind: 'call', action: 'calculateOffset' }] }
    await runBeat(store, beat).done
    expect(selectCurrentLocation(store.getState())?.form.timeOffset).toBeTruthy()
  })
})

describe('runBeat — launch step', () => {
  it('opens the launchable, plays its sub-beat, then closes back to the prior screen', async () => {
    const store = seededStore()
    store.getState().setView('timeOffset')
    const beat: Beat = { chapter: 'timeOffset', steps: [{ kind: 'launch', screen: 'ocr' }] }
    const h = runBeat(store, beat)
    await vi.runAllTimersAsync()
    await h.done
    expect(store.getState().view).toBe('timeOffset') // restored after closeLaunch
    expect(store.getState().capture.method).toBe('ocr') // ocr sub-beat ran
    expect(store.getState().capture.dvrDateTime).toBe('2025-03-08 12:05:30')
  })
})

describe('runBeat — ordering & cancel', () => {
  it('runs steps strictly in order', async () => {
    const store = storeWithLocation()
    const pulses: string[] = []
    const beat: Beat = {
      chapter: 'submission',
      steps: [
        { kind: 'tap', target: 'a' },
        { kind: 'tap', target: 'b' },
        { kind: 'tap', target: 'c' },
      ],
    }
    await runBeat(store, beat, { onPulse: (e) => pulses.push(e.target) }).done
    expect(pulses).toEqual(['a', 'b', 'c'])
  })

  it('cancel() stops the remaining steps', async () => {
    const store = storeWithLocation()
    const beat: Beat = {
      chapter: 'submission',
      steps: [
        { kind: 'wait', ms: 100 },
        { kind: 'field', field: 'businessName', value: 'LATE' },
      ],
    }
    const h = runBeat(store, beat)
    h.cancel()
    await vi.runAllTimersAsync()
    await h.done
    expect(selectCurrentLocation(store.getState())?.businessName).not.toBe('LATE')
  })
})

describe('runBeat — cancel mid-launch (review #2)', () => {
  it('restores the prior screen even when cancelled inside the sub-beat', async () => {
    const store = seededStore()
    store.getState().setView('timeOffset')
    // a launch sub-beat that waits then has another step, so cancel lands mid-sub-beat
    const beats = {
      ocr: { chapter: 'ocr' as const, steps: [{ kind: 'wait' as const, ms: 500 }, { kind: 'tap' as const, target: 'confirm' }] },
    }
    const beat: Beat = { chapter: 'timeOffset', steps: [{ kind: 'launch', screen: 'ocr' }] }
    const h = runBeat(store, beat, { beats })
    await vi.advanceTimersByTimeAsync(10)
    expect(store.getState().view).toBe('ocr') // launched, inside the wait
    h.cancel()
    await vi.runAllTimersAsync()
    await h.done
    expect(store.getState().view).toBe('timeOffset') // restored (would be stuck on 'ocr' without try/finally)
  })

  it('opens and closes a launch screen that has no beat', async () => {
    const store = seededStore()
    store.getState().setView('submission')
    const beat: Beat = { chapter: 'submission', steps: [{ kind: 'launch', screen: 'mediaCapture' }] }
    const h = runBeat(store, beat)
    await h.done
    expect(store.getState().view).toBe('submission')
    expect(h.degraded).toBe(false) // the if(sub) guard skipped cleanly, no swallowed error
    expect(h.warnings).toHaveLength(0)
  })
})

describe('runBeat — cancel mid-type', () => {
  it('stops part-way through the word', async () => {
    const store = storeWithLocation()
    const beat: Beat = {
      chapter: 'submission',
      steps: [{ kind: 'type', field: 'businessName', value: 'Mississauga', perCharMs: 10 }],
    }
    const h = runBeat(store, beat)
    expect(selectCurrentLocation(store.getState())?.businessName).toBe('M')
    await vi.advanceTimersByTimeAsync(10)
    expect(selectCurrentLocation(store.getState())?.businessName).toBe('Mi')
    h.cancel()
    await vi.runAllTimersAsync()
    await h.done
    expect(selectCurrentLocation(store.getState())?.businessName).toBe('Mi') // not the full word
  })
})

describe('runBeat — resilience & degraded signal', () => {
  it('skips a throwing step, records a warning, and still runs the rest', async () => {
    const store = seededStore()
    const pulses: string[] = []
    const beat: Beat = {
      chapter: 'timeOffset',
      steps: [
        { kind: 'field', field: 'capture.dvrDateTime', value: 'garbage' },
        { kind: 'field', field: 'capture.actualDateTime', value: 'garbage' },
        { kind: 'call', action: 'calculateOffset' }, // throws inside calculateTimeDifference
        { kind: 'tap', target: 'after' }, // must still run
      ],
    }
    const h = runBeat(store, beat, { onPulse: (e) => pulses.push(e.target) })
    await h.done
    expect(pulses).toEqual(['after'])
    expect(h.warnings).toHaveLength(1)
    expect(h.degraded).toBe(true)
  })

  it('a clean beat reports no warnings (degraded false)', async () => {
    const store = offsetReady()
    const h = runBeat(store, { chapter: 'timeOffset', steps: [{ kind: 'call', action: 'calculateOffset' }] })
    await h.done
    expect(h.warnings).toHaveLength(0)
    expect(h.degraded).toBe(false)
  })
})
