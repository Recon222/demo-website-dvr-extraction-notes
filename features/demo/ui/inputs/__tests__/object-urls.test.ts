import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createObjectUrlRegistry,
  readBrowserObjectUrls,
  revokeCapturedUrls,
  type ObjectUrlIo,
} from '@/features/demo/ui/inputs/object-urls'

/** A counting stand-in for `URL.createObjectURL` / `revokeObjectURL`. */
function fakeIo() {
  const revoked: string[] = []
  let seq = 0
  const io: ObjectUrlIo = {
    create: () => `blob:test/${++seq}`,
    revoke: (url) => {
      revoked.push(url)
    },
  }
  return { io, revoked }
}

const blob = (): Blob => new Blob(['x'], { type: 'image/jpeg' })

describe('readBrowserObjectUrls', () => {
  const realCreate = URL.createObjectURL
  const realRevoke = URL.revokeObjectURL
  const setHalf = (key: 'createObjectURL' | 'revokeObjectURL', value: unknown): void => {
    ;(URL as unknown as Record<string, unknown>)[key] = value
  }

  afterEach(() => {
    URL.createObjectURL = realCreate
    URL.revokeObjectURL = realRevoke
  })

  it('wraps the runtime API when both halves exist', () => {
    // Under Vitest the global `URL` is Node's, which DOES implement object URLs (jsdom's own
    // `window.URL` does not). Verified in-environment — so this file's tests exercise real
    // minting, and the capability's `unavailable` state hangs off `mediaDevices`/
    // `MediaRecorder` instead, both of which really are absent.
    const io = readBrowserObjectUrls()
    expect(io).not.toBeNull()
    const url = io?.create(blob()) ?? ''
    expect(url.startsWith('blob:')).toBe(true)
    expect(() => io?.revoke(url)).not.toThrow()
  })

  it('delegates to whatever the runtime exposes rather than caching at module scope', () => {
    const create = vi.fn(() => 'blob:real')
    const revoke = vi.fn()
    setHalf('createObjectURL', create)
    setHalf('revokeObjectURL', revoke)

    const io = readBrowserObjectUrls()
    const b = blob()
    expect(io?.create(b)).toBe('blob:real')
    expect(create).toHaveBeenCalledWith(b)
    io?.revoke('blob:real')
    expect(revoke).toHaveBeenCalledWith('blob:real')
  })

  it.each(['createObjectURL', 'revokeObjectURL'] as const)(
    'returns null when %s is missing — half an API is no API',
    (missing) => {
      setHalf(missing, undefined)
      expect(readBrowserObjectUrls()).toBeNull()
    },
  )
})

describe('createObjectUrlRegistry', () => {
  it('tracks what it creates', () => {
    const { io } = fakeIo()
    const registry = createObjectUrlRegistry(io)
    const a = registry.create(blob())
    const b = registry.create(blob())
    expect(registry.size()).toBe(2)
    expect(registry.owns(a)).toBe(true)
    expect(registry.owns(b)).toBe(true)
  })

  it('revokes and forgets a URL it owns', () => {
    const { io, revoked } = fakeIo()
    const registry = createObjectUrlRegistry(io)
    const url = registry.create(blob())
    registry.revoke(url)
    expect(revoked).toEqual([url])
    expect(registry.size()).toBe(0)
    expect(registry.owns(url)).toBe(false)
  })

  it('never revokes a URL it does not own', () => {
    // A bundled sample path is a static file that must outlive every capture surface;
    // revoking someone else's blob blanks their image with no error anywhere.
    const { io, revoked } = fakeIo()
    const registry = createObjectUrlRegistry(io)
    registry.revoke('/demo-media/sample-photo.jpg')
    registry.revoke('blob:someone-elses')
    expect(revoked).toEqual([])
  })

  it('double-revoking is a no-op, not a second call into the browser', () => {
    const { io, revoked } = fakeIo()
    const registry = createObjectUrlRegistry(io)
    const url = registry.create(blob())
    registry.revoke(url)
    registry.revoke(url)
    expect(revoked).toEqual([url])
  })

  it('revokeAll sweeps everything still owned (the unmount path)', () => {
    const { io, revoked } = fakeIo()
    const registry = createObjectUrlRegistry(io)
    const a = registry.create(blob())
    const b = registry.create(blob())
    registry.revokeAll()
    expect(revoked.sort()).toEqual([a, b].sort())
    expect(registry.size()).toBe(0)
  })

  it('revokeAll is idempotent', () => {
    const { io, revoked } = fakeIo()
    const registry = createObjectUrlRegistry(io)
    registry.create(blob())
    registry.revokeAll()
    registry.revokeAll()
    expect(revoked).toHaveLength(1)
  })

  it('release forgets without revoking — the hand-off to the store', () => {
    // After a capture is saved, the store owns the URL. If unmount still revoked it, the
    // saved photo would blank; releasing is what makes the hand-off real.
    const { io, revoked } = fakeIo()
    const registry = createObjectUrlRegistry(io)
    const kept = registry.create(blob())
    const discarded = registry.create(blob())

    registry.release(kept)
    expect(registry.owns(kept)).toBe(false)
    expect(revoked).toEqual([])

    registry.revokeAll()
    expect(revoked).toEqual([discarded])
  })

  it('release on an unowned URL is harmless', () => {
    const { io, revoked } = fakeIo()
    const registry = createObjectUrlRegistry(io)
    registry.release('blob:unknown')
    expect(revoked).toEqual([])
    expect(registry.size()).toBe(0)
  })

  it('keeps two registries independent', () => {
    const { io, revoked } = fakeIo()
    const a = createObjectUrlRegistry(io)
    const b = createObjectUrlRegistry(io)
    const fromA = a.create(blob())
    b.revoke(fromA)
    expect(revoked).toEqual([])
    expect(a.owns(fromA)).toBe(true)
  })
})

describe('revokeCapturedUrls', () => {
  it('revokes the blob URLs a deleted item carried', () => {
    const { io, revoked } = fakeIo()
    revokeCapturedUrls(io, ['blob:one', 'blob:two'])
    expect(revoked).toEqual(['blob:one', 'blob:two'])
  })

  it('skips sample paths and absent URLs', () => {
    const { io, revoked } = fakeIo()
    revokeCapturedUrls(io, ['/demo-media/sample-photo.jpg', undefined, ''])
    expect(revoked).toEqual([])
  })
})
