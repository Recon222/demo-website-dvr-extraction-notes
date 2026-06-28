import { describe, it, expect, vi, afterEach } from 'vitest'
import { requestExtraction } from '@/features/demo/ui/import/extract-client'

afterEach(() => vi.unstubAllGlobals())

describe('requestExtraction', () => {
  it('returns rawText on 200', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ rawText: '{"x":1}' }) }) as unknown as Response))
    expect(await requestExtraction('doc')).toEqual({ ok: true, rawText: '{"x":1}' })
  })
  it('flags notConfigured on 503', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }) as unknown as Response))
    expect(await requestExtraction('doc')).toEqual({ ok: false, notConfigured: true })
  })
  it('returns a generic failure on 500', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as unknown as Response))
    expect(await requestExtraction('doc')).toEqual({ ok: false, notConfigured: false })
  })
  it('returns a generic failure when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await requestExtraction('doc')).toEqual({ ok: false, notConfigured: false })
  })

  it('returns a generic failure on a 200 with no rawText (C3)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }) as unknown as Response))
    expect(await requestExtraction('doc')).toEqual({ ok: false, notConfigured: false })
  })
})
