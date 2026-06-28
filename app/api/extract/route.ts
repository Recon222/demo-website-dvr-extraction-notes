/**
 * Live model proxy for the sandbox PDF/text import. The browser POSTs extracted document
 * text; this server route holds the Ollama Cloud API key (never shipped to the client),
 * forwards a single chat completion, and returns the model's RAW reply text. Cleaning,
 * parsing, normalization, and mapping all happen client-side (see engine/logic/import*).
 *
 * This is the web realization of the phone app's `AiExtractionProvider.extract()` seam:
 * raw text only. When no key is configured it returns 503 NOT_CONFIGURED and the client
 * falls back to the deterministic SAMPLE extraction, so the demo works keyless.
 *
 * Abuse guards for a public deployment (the proxy spends a paid budget): an early
 * body-size cap, a same-origin allowlist, and a small in-memory per-IP rate limit. These
 * are best-effort — set a hard spend cap on the Ollama account as the real backstop.
 */

import {
  EXTRACT_FIELDS_SYSTEM_PROMPT,
  buildExtractFieldsUserPrompt,
  MAX_DOCUMENT_CHARS,
} from '@/features/demo/engine/logic/import'
import { MAX_BODY_BYTES, isAllowedOrigin, isRateLimited } from '@/app/api/extract/guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function truncate(text: string): string {
  return text.length <= MAX_DOCUMENT_CHARS ? text : `${text.slice(0, MAX_DOCUMENT_CHARS)}\n[TRUNCATED]`
}

function json(body: unknown, status: number): Response {
  return Response.json(body, { status })
}

export async function POST(req: Request): Promise<Response> {
  // Cheap guards first.
  const contentLength = Number(req.headers.get('content-length') || '0')
  if (contentLength > MAX_BODY_BYTES) {
    return json({ error: 'Request too large', code: 'TOO_LARGE' }, 413)
  }
  if (!isAllowedOrigin(req)) {
    return json({ error: 'Origin not allowed', code: 'FORBIDDEN' }, 403)
  }
  if (isRateLimited(req)) {
    return json({ error: 'Too many requests', code: 'RATE_LIMITED' }, 429)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body', code: 'BAD_REQUEST' }, 400)
  }

  const documentText =
    typeof (body as { documentText?: unknown })?.documentText === 'string'
      ? (body as { documentText: string }).documentText.trim()
      : ''
  if (!documentText) {
    return json({ error: 'documentText is required', code: 'BAD_REQUEST' }, 400)
  }

  const apiKey = process.env.OLLAMA_API_KEY
  if (!apiKey) {
    return json({ error: 'Live model not configured', code: 'NOT_CONFIGURED' }, 503)
  }

  const baseUrl = process.env.OLLAMA_BASE_URL || 'https://ollama.com/v1'
  const model = process.env.OLLAMA_MODEL || 'llama3.2:3b'
  // `Number(x) || default` so a non-numeric env (e.g. "30s") falls back instead of
  // becoming NaN and aborting every request in ~0ms. Floor at 1s.
  const timeoutMs = Math.max(1000, Number(process.env.OLLAMA_TIMEOUT_MS) || 30_000)

  const messages = [
    { role: 'system', content: EXTRACT_FIELDS_SYSTEM_PROMPT },
    { role: 'user', content: buildExtractFieldsUserPrompt(truncate(documentText)) },
  ]

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false, temperature: 0 }),
      signal: controller.signal,
    })
    if (!res.ok) {
      console.error('[api/extract] upstream non-OK', res.status)
      return json({ error: `Upstream error (${res.status})`, code: 'UPSTREAM_ERROR' }, 502)
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: unknown } }> }
    const rawText = data?.choices?.[0]?.message?.content
    if (typeof rawText !== 'string' || !rawText) {
      console.error('[api/extract] empty model response')
      return json({ error: 'Empty model response', code: 'UPSTREAM_ERROR' }, 502)
    }
    return json({ rawText }, 200)
  } catch (e) {
    console.error('[api/extract] request failed', e instanceof Error ? e.name : 'unknown')
    return json({ error: 'Upstream request failed', code: 'UPSTREAM_ERROR' }, 502)
  } finally {
    clearTimeout(timer)
  }
}
