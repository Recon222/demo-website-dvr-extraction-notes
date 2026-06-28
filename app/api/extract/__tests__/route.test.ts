import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/extract/route'

function postReq(body: unknown): Request {
  // Minimal Request stand-in — POST only calls req.json().
  return { json: async () => body } as unknown as Request
}

const okOllama = (content: string) => ({
  ok: true,
  status: 200,
  json: async () => ({ choices: [{ message: { content } }] }),
})

beforeEach(() => {
  vi.stubEnv('OLLAMA_API_KEY', 'test-key')
  vi.stubEnv('OLLAMA_BASE_URL', 'https://ollama.test/v1')
  vi.stubEnv('OLLAMA_MODEL', 'llama3.2:3b')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('POST /api/extract', () => {
  it('returns 400 BAD_REQUEST for empty documentText', async () => {
    const res = await POST(postReq({ documentText: '   ' }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('BAD_REQUEST')
  })

  it('returns 503 NOT_CONFIGURED when no API key is set (and does not call fetch)', async () => {
    vi.stubEnv('OLLAMA_API_KEY', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const res = await POST(postReq({ documentText: 'a recovery request' }))
    expect(res.status).toBe(503)
    expect((await res.json()).code).toBe('NOT_CONFIGURED')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('calls Ollama with auth + messages and returns rawText', async () => {
    const fetchMock = vi.fn(async () => okOllama('{"businessName":"X"}') as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)
    const res = await POST(postReq({ documentText: 'recover footage from Store X' }))
    expect(res.status).toBe(200)
    expect((await res.json()).rawText).toBe('{"businessName":"X"}')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://ollama.test/v1/chat/completions')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-key')
    const sent = JSON.parse(init.body as string)
    expect(sent.model).toBe('llama3.2:3b')
    expect(sent.stream).toBe(false)
    expect(sent.messages[0].role).toBe('system')
    expect(sent.messages[1].content).toContain('---BEGIN DOCUMENT---')
  })

  it('truncates over-long documentText with a [TRUNCATED] marker', async () => {
    const fetchMock = vi.fn(async () => okOllama('{}') as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)
    await POST(postReq({ documentText: 'x'.repeat(9000) }))
    const sent = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(sent.messages[1].content).toContain('[TRUNCATED]')
    expect(sent.messages[1].content.length).toBeLessThan(9000)
  })

  it('returns 502 UPSTREAM_ERROR when Ollama responds non-OK', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as unknown as Response))
    const res = await POST(postReq({ documentText: 'recover footage' }))
    expect(res.status).toBe(502)
    expect((await res.json()).code).toBe('UPSTREAM_ERROR')
  })

  it('returns 502 UPSTREAM_ERROR when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network') }))
    const res = await POST(postReq({ documentText: 'recover footage' }))
    expect(res.status).toBe(502)
    expect((await res.json()).code).toBe('UPSTREAM_ERROR')
  })
})
