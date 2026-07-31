'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'

import {
  DEFAULT_MEDIA_TAB,
  MEDIA_EXPIRED_NOTICE,
  MEDIA_LIBRARY_TABS,
  UNKNOWN_DURATION_LABEL,
  formatCapturedDate,
  isMediaAvailable,
  mediaDurationLabel,
  mediaForTab,
  mediaLibraryCounts,
  mediaLibrarySubtitle,
  mediaLibraryTab,
  mediaTabBadge,
  type MediaBuckets,
  type MediaLibraryTabId,
} from '@/features/demo/engine/logic/media'
import type { MediaItem } from '@/features/demo/engine/types'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import { ModalShell } from '@/features/demo/ui/screens/_shared'

/**
 * The Media Library sheet (phone `MediaLibrarySheet`, ui-mapping 09; matrix rows 57–66).
 *
 * P4.2 opened this surface with an honest interim body; P4.5 replaces that body with the real
 * library — Photos / Video / Audio tabs with count badges, the per-tab list, the empty state,
 * the inline preview with its item-info panel, the fullscreen preview and the long-press delete
 * confirmation. The sheet's TITLE and its always-clearing close path are P4.2's and are kept.
 *
 * Presentational, as everything below `DemoExperience` is: the location's three media buckets
 * arrive as a prop and deletion leaves as a callback. Selection, the active tab, fullscreen and
 * the pending delete are transient view state and live here — they are not in the snapshot, and
 * a reopen is a remount, which is what re-arms the phone's auto-select.
 *
 * DELIBERATE (owner ruling D-B6, do not "fix" toward the phone): every close path clears state.
 * The phone's `<Modal>` passes `onRequestClose` but no `onDismiss`, so an iOS swipe-away leaves
 * `showMediaLibrary` true and the drawer never reopens (ui-mapping 09:278, its own fact-check
 * calls this "a real state-sync gap"). Here there is exactly one exit — `onClose` — and the
 * sheet unmounts through it.
 *
 * NO METADATA EDITING, and that is the phone's shape, not an omission: the library DISPLAYS
 * metadata and never edits it. `MediaItemInfo` is read-only `<Text>` (`MediaItemInfo.tsx:88-147`,
 * ui-mapping 09:513 "None — display-only panel"), `MediaPreview`'s props are
 * `{ media, onFullscreen, onClose }` with no change callback (`MediaPreview.tsx:239`), and a
 * grep for `MetadataForm` across the phone's whole `media-library/` subtree returns nothing.
 * P4.4's form therefore keeps its two capture-side callers; this is not a third.
 */

export interface MediaLibrarySheetProps {
  /** The current location's three media buckets, straight off the store. */
  media: MediaBuckets
  onClose(): void
}

export function MediaLibrarySheet({ media, onClose }: MediaLibrarySheetProps) {
  const counts = mediaLibraryCounts(media)
  const [tab, setTab] = useState<MediaLibraryTabId>(DEFAULT_MEDIA_TAB)
  const items = mediaForTab(media, tab)
  /**
   * Auto-select-first (matrix row 58), as a state INITIALISER plus one line in the tab handler
   * rather than the phone's armed-ref-plus-three-effects (`MediaLibrarySheet.tsx:79-104`). That
   * machinery exists to survive an async fetch and a `visible` prop that toggles without
   * unmounting; the demo has neither — the media are already in the store and closing the sheet
   * unmounts it, so a reopen re-runs the initialiser. Same behaviour, no effects.
   */
  const [selectedId, setSelectedId] = useState<string | null>(() => firstIdOf(media, DEFAULT_MEDIA_TAB))

  // DERIVED, never a second copy of the item: a deleted row's id simply stops resolving and the
  // preview closes itself — the phone needs an explicit `onDeleted` → `closePreview` for this
  // (`MediaLibrarySheet.tsx:63-70`).
  const selected = items.find((m) => m.id === selectedId) ?? null

  const selectTab = (next: MediaLibraryTabId) => {
    setTab(next)
    setSelectedId(firstIdOf(media, next))
  }

  return (
    <ModalShell title="Media Library" subtitle={mediaLibrarySubtitle(counts.total)} onClose={onClose} fillBody>
      {/* Undo the shell's body padding so the tab bar and the list rows reach the sheet edges,
          as they do on the phone; the paddings below are each surface's own. */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, margin: -18 }}>
        <MediaTabs active={tab} counts={counts} onSelect={selectTab} />

        {/* Between the tabs and the list — the phone's content order (ui-mapping 09:285-296). */}
        {selected !== null && (
          <MediaPreview
            // Keyed so switching rows REMOUNTS the panel: the media element is torn down and
            // rebuilt rather than re-pointed, which is the same reason the phone keys its inset
            // on `media.id` (MediaPreview.tsx:320-322 — a re-pointed native player crashed).
            key={selected.id}
            item={selected}
            onClose={() => setSelectedId(null)}
          />
        )}

        <div data-testid="media-library-content" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>
          {items.length === 0 ? (
            <EmptyMediaState tab={tab} />
          ) : (
            <ul style={listReset}>
              {items.map((item) => (
                <li key={item.id}>
                  <MediaRow item={item} selected={item.id === selected?.id} onSelect={() => setSelectedId(item.id)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ModalShell>
  )
}

/** The first item of a tab, or null when that tab is empty. */
function firstIdOf(media: MediaBuckets, tab: MediaLibraryTabId): string | null {
  return mediaForTab(media, tab)[0]?.id ?? null
}

// ---- Tabs (matrix row 58) ---------------------------------------------------

function MediaTabs({
  active,
  counts,
  onSelect,
}: {
  active: MediaLibraryTabId
  counts: Record<MediaLibraryTabId, number>
  onSelect(tab: MediaLibraryTabId): void
}) {
  return (
    <div role="tablist" style={{ display: 'flex', borderBottom: GLASS.border, flex: '0 0 auto' }}>
      {MEDIA_LIBRARY_TABS.map((t) => {
        const isActive = t.id === active
        const count = counts[t.id]
        const badge = mediaTabBadge(count)
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            // Phone `MediaTabs.tsx:85`, verbatim: the count rides in the accessible name so a
            // screen reader hears how full a tab is without opening it.
            aria-label={`${t.label} tab, ${count} items`}
            onClick={() => onSelect(t.id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '11px 6px',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${isActive ? GLASS.accentFrom : 'transparent'}`,
              color: isActive ? GLASS.accentFrom : '#7a9fc4',
              fontSize: 13,
              fontWeight: isActive ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {t.label}
            {/* Only past zero — the phone renders no badge for an empty tab (MediaTabs.tsx:108),
                which is not the same as rendering a `0`. */}
            {badge !== null && (
              <span
                style={{
                  minWidth: 20,
                  borderRadius: 10,
                  padding: '1px 6px',
                  fontSize: 10,
                  fontWeight: 700,
                  background: isActive ? 'rgba(43,140,193,0.16)' : 'rgba(255,255,255,0.06)',
                  color: isActive ? GLASS.accentFrom : '#7a9fc4',
                }}
              >
                {badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ---- Inline preview + item info (matrix rows 63, 64) ------------------------

/**
 * The phone's three zones, in its order (`MediaPreview.tsx:286-353`): the recessed inset that
 * holds the media, the read-only info panel BELOW it, then the action row.
 *
 * Zone 1 uses the browser's own `<video controls>` / `<audio controls>`, which is the demo's
 * established treatment for playback (`MediaCaptureScreen`'s review stage does the same for
 * video) and, unlike a second hand-rolled transport, is keyboard-operable and announced without
 * any work — the phone's play/pause + seekable bar + elapsed/total IS what a native control is.
 * §63d records the choice and what would change it.
 */
function MediaPreview({ item, onClose }: { item: MediaItem; onClose(): void }) {
  const available = isMediaAvailable(item)

  return (
    <div data-testid="media-preview" style={{ flex: '0 0 auto', borderBottom: '1px solid rgba(43,140,193,0.12)', paddingBottom: 6 }}>
      {/* ---- Zone 1: the recessed inset ---- */}
      <div
        style={{
          margin: '10px 10px 0',
          padding: 8,
          borderRadius: 12,
          border: '1px solid rgba(0,0,0,0.5)',
          background: 'rgba(10,20,34,0.85)',
          boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.35)',
        }}
      >
        {available ? <MediaContent item={item} /> : <ExpiredMediaNotice />}
      </div>

      {/* ---- Zone 2: the info panel (read-only, exactly as the phone's is) ---- */}
      <MediaItemInfo item={item} />

      {/* ---- Zone 3: the action row ---- */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '0 12px 4px' }}>
        <button type="button" aria-label="Close preview" onClick={onClose} style={previewActionButton}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
    </div>
  )
}

/** The bytes themselves. Photos get a 4:3 box and videos 16:9, matching the phone's
 *  `PREVIEW_CONFIG` aspect ratios; audio has no picture, so its control sits in the same well. */
function MediaContent({ item }: { item: MediaItem }) {
  if (item.kind === 'photo') {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a blob: object URL cannot go
      // through next/image, and the bundled samples are served unoptimized from /public.
      <img
        src={item.url}
        alt={`Image preview: ${item.filename}`}
        style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'contain', background: '#0a1320', borderRadius: 8, display: 'block' }}
      />
    )
  }
  if (item.kind === 'video') {
    return (
      <video
        aria-label={`Video preview: ${item.filename}`}
        src={item.url}
        poster={item.poster}
        controls
        style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'contain', background: '#0a1320', borderRadius: 8, display: 'block' }}
      />
    )
  }
  return (
    <div style={{ padding: '18px 6px 10px' }}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- an operator's own audio note has
          no caption track; the filename and the visitor's notes are its transcript. */}
      <audio aria-label={`Audio preview: ${item.filename}`} src={item.url} controls style={{ width: '100%' }} />
    </div>
  )
}

/**
 * What a restored capture shows instead of a player (P4.1's refresh contract). It says the
 * MECHANISM, because "media unavailable" would read as a bug: the demo deliberately does not
 * write a visitor's photographs into browser storage, so the record of the capture survives a
 * refresh and the bytes do not.
 */
function ExpiredMediaNotice() {
  return (
    <div
      data-testid="media-expired-notice"
      style={{ padding: '22px 16px', textAlign: 'center', fontSize: 12, lineHeight: 1.55, color: '#ffd07a', background: 'rgba(255,200,90,0.06)', border: '1px solid rgba(255,200,90,0.25)', borderRadius: 8 }}
    >
      {MEDIA_EXPIRED_NOTICE}
    </div>
  )
}

/**
 * Phone `MediaItemInfo` (`MediaItemInfo.tsx`, ui-mapping 09:502) — three lines, DISPLAY ONLY.
 * Line 1 the filename, line 2 the badge/duration/date meta row, line 3 the caption, which
 * always reserves its height so selecting a captioned row after an uncaptioned one does not
 * shift the list under the pointer.
 *
 * The phone's badge slot carries an `ImageCategory` (`DVR`/`Crop`/`Camera`); the demo's
 * `MediaItem` has no category and instead knows whether the capture came from bundled sample
 * bytes, which is the fact a visitor here needs — so `Sample` takes that slot (§63b).
 */
function MediaItemInfo({ item }: { item: MediaItem }) {
  const duration = mediaDurationLabel(item)
  const date = formatCapturedDate(item.capturedAt)
  const segments = [duration, date === '' ? null : date].filter((s): s is string => s !== null)

  return (
    <div data-testid="media-preview-info" style={{ padding: '10px 12px 4px' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f4f8', wordBreak: 'break-all' }}>{item.filename}</div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
        {item.sample === true && <span style={sampleBadge}>Sample</span>}
        {segments.length > 0 && <span style={{ fontSize: 11, color: '#7a9fc4' }}>{segments.join(' · ')}</span>}
      </div>
      {/* ` ` when empty — the phone renders a bare space for the same reason
          (MediaItemInfo.tsx:138-146) and, like the phone's, the empty line carries no test id. */}
      <div
        data-testid={item.caption === '' ? undefined : 'media-item-caption'}
        style={{ fontSize: 12, fontStyle: 'italic', color: '#7a9fc4', marginTop: 4, minHeight: 16 }}
      >
        {item.caption === '' ? ' ' : item.caption}
      </div>
    </div>
  )
}

// ---- Empty state (matrix row 62) --------------------------------------------

function EmptyMediaState({ tab }: { tab: MediaLibraryTabId }) {
  const { empty } = mediaLibraryTab(tab)
  return (
    <div
      data-testid="empty-media-state"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '48px 32px', textAlign: 'center' }}
    >
      <div style={{ fontSize: 16, fontWeight: 500, color: '#7a9fc4' }}>{empty.message}</div>
      <div style={{ fontSize: 13, color: '#5d81a6' }}>{empty.hint}</div>
    </div>
  )
}

// ---- List rows (matrix rows 59–61) ------------------------------------------

/** Phone list-row accessible names (`PhotoList.tsx:115`, `VideoList`/`AudioList`): the kind,
 *  the filename, and — for the timed kinds — the duration. */
function rowLabel(item: MediaItem, duration: string | null): string {
  if (item.kind === 'photo') return `Photo: ${item.filename}`
  const kind = item.kind === 'video' ? 'Video' : 'Audio'
  return `${kind}: ${item.filename}, ${duration ?? UNKNOWN_DURATION_LABEL}`
}

function MediaRow({ item, selected, onSelect }: { item: MediaItem; selected: boolean; onSelect(): void }) {
  const duration = mediaDurationLabel(item)
  const date = formatCapturedDate(item.capturedAt)

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid rgba(30,58,95,0.35)' }}>
      <button
        type="button"
        aria-label={rowLabel(item, duration)}
        aria-current={selected ? 'true' : undefined}
        onClick={onSelect}
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          textAlign: 'left',
          background: selected ? 'rgba(43,140,193,0.08)' : 'transparent',
          border: 'none',
          borderLeft: `2px solid ${selected ? GLASS.accentFrom : 'transparent'}`,
          cursor: 'pointer',
        }}
      >
        <MediaThumbnail item={item} />

        <span style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: 'block',
              fontSize: 13,
              fontWeight: selected ? 700 : 500,
              color: '#f0f4f8',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.filename}
          </span>
          <span style={metaLine}>
            {/* The phone's row meta is `size · date`; the demo's has no size to show — nothing
                measures a stored item's bytes (`MediaItem` carries no `sizeBytes`, §63c) — so
                the timed kinds lead with their duration and a photo shows the date alone. */}
            {item.kind !== 'photo' && <span>{duration ?? UNKNOWN_DURATION_LABEL}</span>}
            {item.kind !== 'photo' && date !== '' && <span>{' · '}</span>}
            {date !== '' && <span>{date}</span>}
          </span>
          {item.caption !== '' && (
            <span
              style={{
                display: 'block',
                fontSize: 11,
                fontStyle: 'italic',
                color: '#7a9fc4',
                marginTop: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.caption}
            </span>
          )}
        </span>
      </button>
    </div>
  )
}

/**
 * The 56×34 thumbnail card (phone `LIST_CONFIG.thumbnailWidth/Height`). A photo shows its own
 * bytes; video and audio show their kind's glyph, as the phone's do. An item restored from a
 * snapshot has no bytes at all (P4.1's refresh contract) and gets the same glyph treatment
 * rather than a broken image — the preview panel is where that state is EXPLAINED.
 */
function MediaThumbnail({ item }: { item: MediaItem }) {
  const showImage = item.kind === 'photo' && item.url !== undefined && item.url !== ''
  return (
    <span
      style={{
        flex: '0 0 auto',
        width: 56,
        height: 34,
        borderRadius: 6,
        border: '1px solid rgba(255,255,255,0.04)',
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- a blob: object URL cannot go
        // through next/image, and the bundled samples are served unoptimized from /public.
        <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <KindGlyph kind={item.kind} />
      )}
    </span>
  )
}

function KindGlyph({ kind }: { kind: MediaItem['kind'] }) {
  const common = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: '#5d81a6', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  if (kind === 'audio') {
    return (
      <svg {...common}>
        <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    )
  }
  if (kind === 'video') {
    return (
      <svg {...common}>
        <path d="M9 8l7 4-7 4z" />
        <rect x="3" y="4" width="18" height="16" rx="2" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M21 16l-5-5-8 8" />
    </svg>
  )
}

// ---- Styles -----------------------------------------------------------------

const listReset: CSSProperties = { listStyle: 'none', margin: 0, padding: 0 }

const metaLine: CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: '#7a9fc4',
  marginTop: 2,
}

/** The 3D glass action button of the phone's preview action row (`MediaPreview.tsx:258-278`). */
const previewActionButton: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderTopColor: 'rgba(255,255,255,0.14)',
  borderBottomColor: 'rgba(0,0,0,0.3)',
  color: '#cdd9e6',
  cursor: 'pointer',
}

/** The demo's sample badge, shared in appearance with the two capture screens' — a bundled
 *  asset is labelled everywhere it appears, never only where it was made. */
const sampleBadge: CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 0.8,
  textTransform: 'uppercase',
  color: '#ffd07a',
  background: 'rgba(255,200,90,0.12)',
  border: '1px solid rgba(255,200,90,0.3)',
  borderRadius: 6,
  padding: '1px 6px',
}
