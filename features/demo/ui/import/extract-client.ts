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
      console.warn('[demo/import] /api/extract replied 200 without rawText — falling back to the sample request')
      return { ok: false, notConfigured: false }
    }
    if (res.status !== 503) {
      // 503 = deliberately not configured (silent fallback). Anything else is a real failure
      // worth a breadcrumb — otherwise "every import shows the fallback notice" is undebuggable
      // from the client side (review M3).
      console.warn(`[demo/import] /api/extract failed with ${res.status} — falling back to the sample request`)
    }
    return { ok: false, notConfigured: res.status === 503 }
  } catch (e) {
    console.warn('[demo/import] could not reach /api/extract — falling back to the sample request:', e)
    return { ok: false, notConfigured: false }
  }
}
