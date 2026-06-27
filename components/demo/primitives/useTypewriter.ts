import { useEffect, useState } from 'react'

/**
 * Progressive substring of `text`. When `active`, reveals one character per `perCharMs`;
 * otherwise returns the full text immediately. No caret — the caller styles the span.
 *
 * Note: in guided mode the director fills the store value char-by-char, so the M4 screens will
 * usually render the (already progressive) store value directly; this hook is for standalone
 * typed text (labels/narration) that isn't store-backed.
 */
export function useTypewriter(
  text: string,
  { active, perCharMs = 45 }: { active: boolean; perCharMs?: number },
): string {
  const [count, setCount] = useState(active ? 0 : text.length)

  useEffect(() => {
    if (!active) {
      setCount(text.length)
      return
    }
    setCount(0)
    let i = 0
    const id = setInterval(() => {
      i += 1
      setCount(i)
      if (i >= text.length) clearInterval(id)
    }, perCharMs)
    return () => clearInterval(id)
  }, [text, active, perCharMs])

  return text.slice(0, count)
}
