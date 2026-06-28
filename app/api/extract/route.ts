/**
 * Live model proxy for the sandbox PDF/text import. The browser POSTs extracted document
 * text; this server route holds the Ollama Cloud API key (never shipped to the client),
 * forwards a single chat completion, and returns the model's RAW reply text. Cleaning,
 * parsing, normalization, and mapping all happen client-side (see engine/logic/import*).
 *
 * This is the web realization of the phone app's `AiExtractionProvider.extract()` seam:
 * raw text only. When no key is configured it returns 503 NOT_CONFIGURED and the client
 * falls back to the deterministic SAMPLE extraction, so the demo works keyless.
 */

import {
  EXTRACT_FIELDS_SYSTEM_PROMPT,
  buildExtractFieldsUserPrompt,
  MAX_DOCUMENT_CHARS,
} from '@/features/demo/engine/logic/import'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function truncate(text: string): string {
  return text.length <= MAX_DOCUMENT_CHARS ? text : `${text.slice(0, MAX_DOCUMENT_CHARS)}\n[TRUNCATED]`
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body', code: 'BAD_REQUEST' }, { status: 400 })
  }

  const documentText =
    typeof (body as { documentText?: unknown })?.documentText === 'string'
      ? (body as { documentText: string }).documentText.trim()
      : ''
  if (!documentText) {
    return Response.json({ error: 'documentText is required', code: 'BAD_REQUEST' }, { status: 400 })
  }

  const apiKey = process.env.OLLAMA_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'Live model not configured', code: 'NOT_CONFIGURED' }, { status: 503 })
  }

  const baseUrl = process.env.OLLAMA_BASE_URL || 'https://ollama.com/v1'
  const model = process.env.OLLAMA_MODEL || 'llama3.2:3b'
  const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS || '30000')

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
      return Response.json({ error: `Upstream error (${res.status})`, code: 'UPSTREAM_ERROR' }, { status: 502 })
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: unknown } }> }
    const rawText = data?.choices?.[0]?.message?.content
    if (typeof rawText !== 'string' || !rawText) {
      return Response.json({ error: 'Empty model response', code: 'UPSTREAM_ERROR' }, { status: 502 })
    }
    return Response.json({ rawText })
  } catch {
    return Response.json({ error: 'Upstream request failed', code: 'UPSTREAM_ERROR' }, { status: 502 })
  } finally {
    clearTimeout(timer)
  }
}
