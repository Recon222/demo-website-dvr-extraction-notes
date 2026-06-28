'use client'

/**
 * Thin client for the `/api/extract` model proxy. Returns raw model text on success, or a
 * typed failure: `notConfigured` (503 — no server key) lets the orchestrator fall back to the
 * deterministic SAMPLE extraction silently; any other failure is treated the same but flagged.
 */

export type ExtractClientResult = { ok: true; rawText: string } | { ok: false; notConfigured: boolean }

export async function requestExtraction(documentText: string): Promise<ExtractClientResult> {
  try {
    const res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentText }),
    })
    if (res.ok) {
      const data = (await res.json()) as { rawText?: unknown }
      if (typeof data.rawText === 'string' && data.rawText) return { ok: true, rawText: data.rawText }
      return { ok: false, notConfigured: false }
    }
    return { ok: false, notConfigured: res.status === 503 }
  } catch {
    return { ok: false, notConfigured: false }
  }
}
