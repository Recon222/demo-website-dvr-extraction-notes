import type { SignupRecord, WaitlistStore } from './types'

/**
 * In-memory {@link WaitlistStore} for tests and local development. Exposes the
 * underlying `records` array for assertions. Not for production — data is lost on
 * reload; the Firestore adapter replaces it server-side.
 */
export function createMemoryWaitlistStore(): WaitlistStore & { records: SignupRecord[] } {
  const records: SignupRecord[] = []

  return {
    records,
    async has(email: string): Promise<boolean> {
      return records.some((record) => record.email === email)
    },
    async add(record: SignupRecord): Promise<void> {
      records.push(record)
    },
  }
}
