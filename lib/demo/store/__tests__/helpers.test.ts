import { describe, it, expect, vi } from 'vitest'
import { setPath, mediaBucket } from '@/lib/demo/store/helpers'

describe('setPath', () => {
  it('immutably sets a nested path, cloning along the way', () => {
    const obj = { a: { b: { c: 1 } } }
    const out = setPath(obj, 'a.b.c', 2)
    expect(out.a.b.c).toBe(2)
    expect(obj.a.b.c).toBe(1) // original untouched
    expect(out.a).not.toBe(obj.a) // cloned reference
  })

  it('clones through an array on the path', () => {
    const obj = { list: [{ x: 1 }] }
    const out = setPath(obj, 'list.0.x', 9) as { list: { x: number }[] }
    expect(out.list[0].x).toBe(9)
    expect(obj.list[0].x).toBe(1)
  })

  it('handles an array root', () => {
    const out = setPath([{ x: 1 }], '0.x', 9) as { x: number }[]
    expect(out[0].x).toBe(9)
  })

  it('writes to a stray key (NOT a no-op) and warns in dev', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const out = setPath({ a: { b: 1 } }, 'a.typo', 2) as { a: Record<string, unknown> }
    expect(out.a.typo).toBe(2) // it wrote the stray key
    expect(out.a.b).toBe(1) // original leaf untouched
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('does not warn when the leaf key already exists', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    setPath({ a: { b: 1 } }, 'a.b', 2)
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('mediaBucket', () => {
  it('maps the singular kind to its plural bucket', () => {
    expect(mediaBucket('photo')).toBe('photos')
    expect(mediaBucket('video')).toBe('videos')
    expect(mediaBucket('audio')).toBe('audios')
  })
})
