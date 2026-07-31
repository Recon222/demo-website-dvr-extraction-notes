/**
 * The media library's pure core (parity P4.5, matrix rows 57–66).
 *
 * The phone spreads these facts across a hook and a constants file
 * (`media-library/hooks/useMediaLibrary.ts`, `media-library/constants.ts`) because its lists
 * come from SQLite and have to be fetched. The demo's media are already in the store, so there
 * is nothing to fetch and nothing to be loading — what remains is derivation, and derivation
 * belongs in the engine where it can be tested without a DOM.
 *
 * Everything the sheet displays that is not a store field is decided here: which tabs exist and
 * in what order, which bucket each one reads, the counts and their badge cap, the newest-first
 * ordering, the per-tab empty copy, the date and duration strings, and the delete
 * confirmation's wording. The UI holds no copy of its own.
 */

import type { LocationForm, MediaItem, MediaKind } from '@/features/demo/engine/types'
import { formatDuration } from '@/features/demo/engine/logic/media/recording'

/** The three per-kind buckets a location's form carries. Aliased off the store shape rather
 *  than re-declared, so a bucket rename cannot leave this module describing the old one. */
export type MediaBuckets = LocationForm['media']

/**
 * Which bucket on `LocationForm.media` holds each media kind — THE mapping, consumed by both
 * the store's `mediaBucket` helper and this module's `mediaForTab` (R-26).
 *
 * It exists because the pairing used to be written twice: once here as a `kind`/`bucket` pair
 * on every tab entry, once in `store/helpers.ts`. Two independent spellings of one fact meant
 * `kind: 'audio', bucket: 'videos'` compiled — a tab that lists the wrong bucket's rows, whose
 * delete then writes to the kind the ROW carries, leaving an undeletable row on screen.
 */
export const MEDIA_BUCKET: Readonly<Record<MediaKind, keyof MediaBuckets>> = Object.freeze({
  photo: 'photos',
  video: 'videos',
  audio: 'audios',
})

export interface MediaLibraryTab {
  id: string
  /** Phone `TAB_CONFIG.tabs[].label` (`media-library/constants.ts:31-33`). */
  label: string
  /** The bucket is DERIVED from this via `MEDIA_BUCKET` — never stored beside it (R-26). */
  kind: MediaKind
  /** Phone `EMPTY_STATE_CONFIG` (`media-library/constants.ts:57-59`), verbatim. Both hints name
   *  a real row of the demo's own drawer Media accordion (`WizardDrawer.tsx:331-332`), so the
   *  instruction is followable here and not just copied. */
  empty: { message: string; hint: string }
}

/**
 * The tab registry — ARRAY ORDER IS DISPLAY ORDER, matching the phone's `TAB_CONFIG.tabs`
 * (Photos → Video → Audio). The house rule for every other registry in this engine
 * (`WIZARD_SCREENS`, `EXPLORE_ITEMS`, the notes sections): position carries the ordering, so
 * nothing hand-types an index.
 */
export const MEDIA_LIBRARY_TABS = [
  {
    id: 'photos',
    label: 'Photos',
    kind: 'photo',
    empty: { message: 'No photos', hint: 'Use Capture Media to take photos' },
  },
  {
    id: 'video',
    label: 'Video',
    kind: 'video',
    empty: { message: 'No videos', hint: 'Use Capture Media to record video' },
  },
  {
    id: 'audio',
    label: 'Audio',
    kind: 'audio',
    empty: { message: 'No audio', hint: 'Use Record Audio to capture audio' },
  },
] as const satisfies readonly MediaLibraryTab[]

export type MediaLibraryTabId = (typeof MEDIA_LIBRARY_TABS)[number]['id']

/** The tab the sheet opens on — the phone's `initialTab ?? 'photos'` default
 *  (`useMediaLibrary.ts:46`). Photos even when photos is the empty tab: the phone shows the
 *  empty state rather than hunting for a populated tab, and so does this. */
export const DEFAULT_MEDIA_TAB: MediaLibraryTabId = 'photos'

/** Returns the REGISTRY ENTRY, not the widened interface (R-33): callers keep the literal
 *  `label`/`kind` of the tab they asked for, so a `switch` over `mediaLibraryTab(id).kind` stays
 *  exhaustive and the entry's own copy is readable at the call site. */
export function mediaLibraryTab(id: MediaLibraryTabId): (typeof MEDIA_LIBRARY_TABS)[number] {
  // Total by construction — `MediaLibraryTabId` is derived FROM this array — but a lookup that
  // can return undefined would push a non-null assertion into every call site.
  const tab = MEDIA_LIBRARY_TABS.find((t) => t.id === id)
  if (tab === undefined) throw new Error(`[demo] unknown media library tab: ${id}`)
  return tab
}

export type MediaLibraryCounts = Record<MediaLibraryTabId, number> & { total: number }

/** Per-tab counts plus the header's total. `total` is the sum of the three tabs, not the
 *  location's whole media graph — the phone's subtitle counts exactly what the tabs can
 *  reach (`MediaLibrarySheet.tsx:257`, `useMediaLibrary.ts:132-137`). */
export function mediaLibraryCounts(media: MediaBuckets): MediaLibraryCounts {
  const photos = media.photos.length
  const video = media.videos.length
  const audio = media.audios.length
  return { photos, video, audio, total: photos + video + audio }
}

/**
 * The tab's items, NEWEST FIRST — the phone's `sortByCreatedAtDescending`
 * (`useMediaLibrary.ts:24-28`), which exists because its service returns `ORDER BY created_at
 * ASC` and a library is read newest-down.
 *
 * `capturedAt` is the demo's `YYYY-MM-DD HH:MM:SS`, which sorts chronologically as a STRING —
 * so no `Date` is constructed here and the ordering carries no timezone.
 *
 * Two captures inside the same second tie (§62h: the demo enforces no uniqueness, deliberately).
 * The reverse-then-stable-sort puts the LATER-ADDED of a tied pair first, which is the same
 * "newest first" the timestamps express when they differ — rather than the arbitrary order a
 * tie-blind sort would leave.
 */
export function mediaForTab(media: MediaBuckets, id: MediaLibraryTabId): MediaItem[] {
  const items = media[MEDIA_BUCKET[mediaLibraryTab(id).kind]]
  return [...items].reverse().sort((a, b) => (a.capturedAt < b.capturedAt ? 1 : a.capturedAt > b.capturedAt ? -1 : 0))
}

/** Phone `TAB_CONFIG.maxBadgeCount` (`media-library/constants.ts:35`): past 99 the badge stops
 *  counting and says so. Returns null below 1 — the phone renders no badge at all for zero
 *  (`MediaTabs.tsx:108`), which is different from rendering a `0`. */
export function mediaTabBadge(count: number): string | null {
  if (count < 1) return null
  return count > MAX_MEDIA_BADGE_COUNT ? '99+' : String(count)
}

export const MAX_MEDIA_BADGE_COUNT = 99

/** Phone header subtitle, verbatim (`MediaLibrarySheet.tsx:251-258`). Uncountable plural at
 *  every value including one — the phone's template, not a grammar decision (§63f). */
export function mediaLibrarySubtitle(total: number): string {
  return `${total} items`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

/**
 * The list/info date — the phone's `formatDate` output shape (`media-library/utils.ts:33-45`:
 * `toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })`), e.g.
 * `Jul 16, 2026`.
 *
 * Read off the STRING rather than through a `Date`, which is the whole point: the phone's
 * `createdAt` is an ISO instant and gets localized; the demo's `capturedAt` is already the
 * demo's own wall-clock (`YYYY-MM-DD HH:MM:SS`, from the injectable clock seam), so parsing it
 * into a `Date` would re-interpret it against the host timezone and could shift the DAY. An
 * unreadable value returns `''`, as the phone's does for an invalid date.
 */
export function formatCapturedDate(capturedAt: string): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(capturedAt)
  if (parts === null) return ''
  const month = Number(parts[2])
  const day = Number(parts[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return ''
  return `${MONTHS[month - 1]} ${day}, ${Number(parts[1])}`
}

/**
 * `MM:SS` for a timed item, or null when there is nothing to say.
 *
 * Null covers both a photo (never timed) and a video/audio whose duration was never measured —
 * the sample assets carry none by design (`samples.ts:127`). The two displays then differ, as
 * they do on the phone: a list row substitutes the phone's `'--:--'` placeholder
 * (`media-library/utils.ts:17-27`) to keep the row's meta line a fixed shape, while the info
 * panel simply omits the segment (`MediaItemInfo.tsx:46-64`).
 */
export function mediaDurationLabel(item: MediaItem): string | null {
  if (item.kind === 'photo') return null
  const seconds = item.durationSec
  if (seconds === undefined || !Number.isFinite(seconds)) return null
  return formatDuration(seconds * 1000)
}

/** Phone `media-library/utils.ts:24` — the placeholder a list row shows for an unmeasured
 *  duration, so the meta line does not change shape between rows. */
export const UNKNOWN_DURATION_LABEL = '--:--'

/** Phone `DELETE_CONFIG.confirmationTitle` (`media-library/constants.ts:48`). */
export const DELETE_MEDIA_TITLE = 'Delete Media'

/** Phone `DELETE_CONFIG.confirmationMessage` (`media-library/constants.ts:49-50`), verbatim
 *  including the quotes around the filename. */
export function deleteMediaMessage(filename: string): string {
  return `Are you sure you want to delete "${filename}"? This action cannot be undone.`
}

/** Phone `DELETE_CONFIG.successMessage` (`media-library/constants.ts:51`) — the toast fired
 *  after the row is gone. The demo's notice banner is its Toast. */
export const MEDIA_DELETED_NOTICE = 'Media deleted'
