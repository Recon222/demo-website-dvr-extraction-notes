import { describe, it, expect } from 'vitest'
import {
  describeSaveStatus,
  formatSaveRecency,
  type SaveState,
} from '@/features/demo/engine/logic/save-status'

/**
 * P4.2 / matrix row 80 — the drawer's save-status wording.
 *
 * Two things are pinned here, and they are different in kind:
 *  1. the recency buckets and their boundaries (arithmetic), and
 *  2. the HONESTY of every string (parity plan §4): "this tab" is the ceiling of what the demo
 *     may claim, and only the `saved` arm may say the word "Saved" at all.
 */

const T0 = 1_700_000_000_000

describe('formatSaveRecency', () => {
  it('reads "just now" for anything under a minute, at both ends of the bucket', () => {
    expect(formatSaveRecency(T0, T0)).toBe('just now')
    expect(formatSaveRecency(T0, T0 + 59_999)).toBe('just now')
  })

  it('flips to minutes exactly at 60s, and floors within the bucket', () => {
    expect(formatSaveRecency(T0, T0 + 60_000)).toBe('1 min ago')
    expect(formatSaveRecency(T0, T0 + 119_999)).toBe('1 min ago')
    expect(formatSaveRecency(T0, T0 + 120_000)).toBe('2 min ago')
    expect(formatSaveRecency(T0, T0 + 3_599_999)).toBe('59 min ago')
  })

  it('flips to hours exactly at 60min, and floors within the bucket', () => {
    expect(formatSaveRecency(T0, T0 + 3_600_000)).toBe('1 hr ago')
    expect(formatSaveRecency(T0, T0 + 7_199_999)).toBe('1 hr ago')
    expect(formatSaveRecency(T0, T0 + 7_200_000)).toBe('2 hr ago')
  })

  it('clamps a backwards clock to "just now" rather than rendering a negative age', () => {
    // The write demonstrably happened; a host clock that moved backwards between the write
    // and the read makes the AGE unknowable, not the save.
    expect(formatSaveRecency(T0, T0 - 500_000)).toBe('just now')
  })
})

describe('describeSaveStatus', () => {
  it('names the tab — and the recency — when a write has landed', () => {
    expect(describeSaveStatus({ kind: 'saved', at: T0 }, T0 + 65_000)).toEqual({
      kind: 'saved',
      text: 'Saved to this tab · 1 min ago',
    })
  })

  it('distinguishes "nothing written yet" from "this browser is not storing"', () => {
    // The whole reason SaveState is wider than isLive(): both are `isLive() === false`, and
    // telling a visitor who simply has not typed yet that their browser is broken is a lie.
    const pending = describeSaveStatus({ kind: 'pending' }, T0).text
    const unavailable = describeSaveStatus({ kind: 'unavailable' }, T0).text
    expect(pending).not.toBe(unavailable)
    expect(pending).toContain('this tab stores your work as you go')
    expect(unavailable).toContain("this browser isn't storing the session")
  })

  it('says a failed write failed — the snapshot was cleared, so silence would be a lie', () => {
    expect(describeSaveStatus({ kind: 'failed' }, T0)).toEqual({
      kind: 'failed',
      text: 'Not saved · the last save to this tab failed',
    })
  })

  it('never claims a save on any arm but `saved`, and never claims more than this tab', () => {
    const states: SaveState[] = [
      { kind: 'unavailable' },
      { kind: 'pending' },
      { kind: 'saved', at: T0 },
      { kind: 'failed' },
    ]
    for (const state of states) {
      const { kind, text } = describeSaveStatus(state, T0)
      expect(kind).toBe(state.kind)
      // The phone's device-persistence framing is barred here (parity plan §4 honesty rule).
      expect(text).not.toMatch(/device|phone|disk|cloud|permanent/i)
      // "Saved" unqualified is a claim; only the arm that earned it may make it.
      expect(/^Saved\b/.test(text)).toBe(state.kind === 'saved')
    }
  })
})
