import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  readBrowserDownloadIo,
  REVOKE_DELAY_MS,
  saveTextFile,
  type DownloadIo,
} from '@/features/demo/ui/inputs/download-file'

/** A fully-observable stand-in for the browser's save primitives. */
function stubIo(over: Partial<DownloadIo> = {}) {
  const revoked: string[] = []
  const clicks: Array<{ url: string; filename: string }> = []
  const blobs: Array<{ content: string; mimeType: string }> = []
  const deferred: Array<() => void> = []
  let seq = 0
  const io: DownloadIo = {
    urls: {
      create: () => `blob:stub/${seq++}`,
      revoke: (url) => {
        revoked.push(url)
      },
    },
    toBlob: (content, mimeType) => {
      blobs.push({ content, mimeType })
      return new Blob([content], { type: mimeType })
    },
    clickDownloadAnchor: (url, filename) => {
      clicks.push({ url, filename })
    },
    defer: (fn) => {
      deferred.push(fn)
    },
    ...over,
  }
  return { io, revoked, clicks, blobs, runDeferred: () => deferred.splice(0).forEach((fn) => fn()) }
}

afterEach(() => vi.restoreAllMocks())

describe('saveTextFile', () => {
  it('mints a typed blob URL and clicks a download anchor at it', () => {
    const { io, clicks, blobs, revoked, runDeferred } = stubIo()
    const outcome = saveTextFile({ content: '<html>map</html>', filename: 'Case-Map.html', mimeType: 'text/html' }, io)

    expect(outcome).toEqual({ requested: true, filename: 'Case-Map.html' })
    expect(blobs).toEqual([{ content: '<html>map</html>', mimeType: 'text/html' }])
    expect(clicks).toEqual([{ url: 'blob:stub/0', filename: 'Case-Map.html' }])
    // Not yet revoked — revoking in the click's own tick cancels the download in some browsers.
    expect(revoked).toEqual([])
    runDeferred()
    expect(revoked).toEqual(['blob:stub/0'])
  })

  it('reports `unavailable` where the browser cannot save at all', () => {
    expect(saveTextFile({ content: 'x', filename: 'x.html', mimeType: 'text/html' }, null)).toEqual({
      requested: false,
      reason: 'unavailable',
    })
  })

  it('reports `failed` — loudly — when the save throws, and still releases the blob', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { io, revoked, runDeferred } = stubIo({
      clickDownloadAnchor: () => {
        throw new Error('no user gesture')
      },
    })
    expect(saveTextFile({ content: 'x', filename: 'x.html', mimeType: 'text/html' }, io)).toEqual({
      requested: false,
      reason: 'failed',
    })
    expect(warn).toHaveBeenCalled()
    runDeferred()
    expect(revoked).toEqual(['blob:stub/0'])
  })

  it('does not schedule a revoke when the URL was never minted', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const defer = vi.fn()
    const { io } = stubIo({
      defer,
      urls: {
        create: () => {
          throw new Error('object URLs blocked')
        },
        revoke: () => undefined,
      },
    })
    expect(saveTextFile({ content: 'x', filename: 'x.html', mimeType: 'text/html' }, io).requested).toBe(false)
    expect(defer).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalled()
  })
})

describe('readBrowserDownloadIo — object-URL lifetime (review R-21)', () => {
  it('keeps the URL alive for the whole revoke window, then releases it', () => {
    vi.useFakeTimers()
    try {
      const io = readBrowserDownloadIo()!
      const revoke = vi.spyOn(URL, 'revokeObjectURL')
      saveTextFile({ content: 'x', filename: 'x.html', mimeType: 'text/html' }, io)

      // A one-macrotask fuse was the same race the module's own doc names: the browser fetches
      // the blob asynchronously after the click and reports nothing back.
      vi.advanceTimersByTime(REVOKE_DELAY_MS - 1)
      expect(revoke).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(revoke).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('sweeps on pagehide so a closed tab never leaves the blob pinned', () => {
    vi.useFakeTimers()
    try {
      const io = readBrowserDownloadIo()!
      const revoke = vi.spyOn(URL, 'revokeObjectURL')
      saveTextFile({ content: 'x', filename: 'x.html', mimeType: 'text/html' }, io)

      window.dispatchEvent(new Event('pagehide'))
      expect(revoke).toHaveBeenCalledTimes(1)
      // …and the cancelled timer cannot fire a second one.
      vi.advanceTimersByTime(REVOKE_DELAY_MS * 2)
      expect(revoke).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('readBrowserDownloadIo', () => {
  it('drives a real blob → object URL → anchor click → revoke round trip', async () => {
    const io = readBrowserDownloadIo()
    expect(io).not.toBeNull()

    const anchors: HTMLAnchorElement[] = []
    const createElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string, ...rest: unknown[]) => {
      const el = createElement(tag as 'a', ...(rest as []))
      if (tag === 'a') anchors.push(el as HTMLAnchorElement)
      return el
    })
    const revoke = vi.spyOn(URL, 'revokeObjectURL')

    const outcome = saveTextFile(
      { content: '<html>real</html>', filename: 'Real-Case-Map.html', mimeType: 'text/html' },
      io,
    )
    expect(outcome).toEqual({ requested: true, filename: 'Real-Case-Map.html' })

    // A genuine object URL was minted and put on a genuine `download` anchor…
    expect(anchors).toHaveLength(1)
    expect(anchors[0].download).toBe('Real-Case-Map.html')
    expect(anchors[0].getAttribute('href')).toMatch(/^blob:/)
    // …which is detached again straight away, leaving no stray node in the document.
    expect(anchors[0].isConnected).toBe(false)

    // The deferred revoke really runs — the `pagehide` backstop is the cheap way to observe it
    // without waiting out REVOKE_DELAY_MS.
    window.dispatchEvent(new Event('pagehide'))
    expect(revoke).toHaveBeenCalledWith(anchors[0].getAttribute('href'))
  })
})
