// Pragmatic email shape check — intentionally not full RFC 5322. The goal is to
// catch obvious mistakes at the edge; deliverability is confirmed by the eventual
// confirmation email, not by regex. Hoisted to module scope (not recreated per call).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_EMAIL_LENGTH = 254

/** Trim and lowercase an email for consistent storage and de-duplication. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Whether an email is plausibly valid (normalized first). */
export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email)
  return normalized.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(normalized)
}
