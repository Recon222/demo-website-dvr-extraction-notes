/** Shared helpers for the two court-document generators. Ported from the app. */

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }

export function escapeHtml(s: unknown): string {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ENTITIES[c] ?? c)
}

/** Render "YYYY-MM-DD HH:MM:SS" (UTC trick) → "MM/DD/YYYY HH:MM:SS"; passthrough otherwise. */
export function formatDocDate(s: unknown): string {
  if (!s) return 'N/A'
  const d = new Date(String(s).replace(' ', 'T') + 'Z')
  if (isNaN(d.getTime())) return String(s)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getUTCMonth() + 1)}/${p(d.getUTCDate())}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(
    d.getUTCMinutes(),
  )}:${p(d.getUTCSeconds())}`
}

export function nowStamp(): string {
  const n = new Date()
  const p = (x: number) => String(x).padStart(2, '0')
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())} ${p(n.getHours())}:${p(
    n.getMinutes(),
  )}:${p(n.getSeconds())}`
}
