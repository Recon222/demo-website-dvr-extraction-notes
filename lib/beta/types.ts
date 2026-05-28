/** Raw input from the beta signup form. */
export interface SignupInput {
  email: string
  consent: boolean
  /**
   * Honeypot field. Hidden from humans via CSS; bots tend to fill every field.
   * A non-empty value marks the submission as spam.
   */
  company?: string
  /** Where the signup came from (e.g. 'website', 'conference'). Defaults to 'website'. */
  source?: string
}

/** A persisted waitlist entry (email already normalized). */
export interface SignupRecord {
  email: string
  consent: boolean
  source: string
  /** ISO 8601 timestamp, injected by the caller for determinism/testability. */
  createdAt: string
}

export type SignupError = 'invalid_email' | 'consent_required' | 'spam_detected' | 'store_error'

export type SignupResult =
  | { ok: true; deduped: boolean }
  | { ok: false; error: SignupError }

/**
 * Persistence port for the waitlist. The domain logic depends on this interface,
 * not on Firebase directly — so the Firestore adapter (server-side, added when
 * credentials are available) and the in-memory adapter (tests/dev) are
 * interchangeable.
 */
export interface WaitlistStore {
  /** True if an entry with this (normalized) email already exists. */
  has(email: string): Promise<boolean>
  /** Persist a new signup record. */
  add(record: SignupRecord): Promise<void>
}
