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

describe('runBeat — resilience', () => {
  it('skips a throwing step without aborting the rest of the beat', async () => {
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
    await expect(
      runBeat(store, beat, { onPulse: (e) => pulses.push(e.target) }).done,
    ).resolves.toBeUndefined()
    expect(pulses).toEqual(['after'])
  })
})
