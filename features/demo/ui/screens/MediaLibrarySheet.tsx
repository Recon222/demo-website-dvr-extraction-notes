'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import {
  DEFAULT_MEDIA_TAB,
  DELETE_MEDIA_TITLE,
  MEDIA_EXPIRED_NOTICE,
  MEDIA_LIBRARY_TABS,
  UNKNOWN_DURATION_LABEL,
  deleteMediaMessage,
  formatCapturedDate,
  isMediaAvailable,
  mediaDurationLabel,
  mediaForTab,
  mediaLibraryCounts,
  mediaLibrarySubtitle,
  mediaLibraryTab,
  mediaTabBadge,
  type AvailableMedia,
  type MediaBuckets,
  type MediaLibraryTabId,
} from '@/features/demo/engine/logic/media'
import type { MediaItem } from '@/features/demo/engine/types'
import { AlertDialog } from '@/features/demo/ui/controls/AlertDialog'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import { PhoneOverlayPortal } from '@/features/demo/ui/phone-overlay'
import { LONG_PRESS_SURFACE_STYLE, useLongPress } from '@/features/demo/ui/primitives/useLongPress'
import { ModalShell } from '@/features/demo/ui/screens/_shared'
import { colors } from '@/features/demo/ui/tokens/palette'

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
  /** Confirmed deletion. The bridge revokes the item's object URLs and drops it from the
   *  store; nothing here writes. */
  onDelete(item: MediaItem): void
  onClose(): void
}

export function MediaLibrarySheet({ media, onDelete, onClose }: MediaLibrarySheetProps) {
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
  /** Which item is being viewed full-screen — an ID rather than a boolean, so it self-cancels
   *  the moment the selection moves or the item is deleted, with nothing to remember to reset. */
  const [fullscreenId, setFullscreenId] = useState<string | null>(null)
  /** What the delete confirmation is armed on — an id, like the bridge's own `PendingDelete`
   *  (`DemoExperience.tsx:280`), so the dialog's copy is read off the LIVE item at render and
   *  can never quote a filename that has moved on. */
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  // DERIVED, never a second copy of the item: a deleted row's id simply stops resolving and the
  // preview closes itself — the phone needs an explicit `onDeleted` → `closePreview` for this
  // (`MediaLibrarySheet.tsx:63-70`).
  const selected = items.find((m) => m.id === selectedId) ?? null
  const fullscreen = selected !== null && selected.id === fullscreenId ? selected : null
  const pendingDelete = items.find((m) => m.id === pendingDeleteId) ?? null

  const selectTab = (next: MediaLibraryTabId) => {
    setTab(next)
    setSelectedId(firstIdOf(media, next))
  }

  return (
    <ModalShell
      title="Media Library"
      subtitle={mediaLibrarySubtitle(counts.total)}
      // Verbatim, phone `MediaLibrarySheet.tsx:208` and `:231` - both spellings of the same
      // surface's close control agree on the words.
      closeAccessibilityLabel="Close media library"
      onClose={onClose}
      fillBody
    >
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
            onFullscreen={() => setFullscreenId(selected.id)}
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
                  <MediaRow
                    item={item}
                    selected={item.id === selected?.id}
                    onSelect={() => setSelectedId(item.id)}
                    onRequestDelete={() => setPendingDeleteId(item.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Mounted only while it is actually open — the phone does the same, so no player exists
          for a fullscreen nobody asked for (MediaLibrarySheet.tsx:343-351). */}
      {/* `canFullscreen` narrows as well as guards (R-24): the layer cannot be handed an item
          with no bytes, and now cannot be COMPILED that way either. */}
      {fullscreen !== null && canFullscreen(fullscreen) && (
        <MediaFullscreen item={fullscreen} onClose={() => setFullscreenId(null)} />
      )}

      {/* The phone's native `Alert.alert` (row 66) on the shared blocking-dialog primitive:
          title, message and both button styles verbatim, Escape dismissing to the safe arm. */}
      {pendingDelete !== null && (
        <AlertDialog
          title={DELETE_MEDIA_TITLE}
          message={deleteMediaMessage(pendingDelete.filename)}
          actions={[
            { label: 'Cancel', style: 'cancel', onPress: () => setPendingDeleteId(null) },
            {
              label: 'Delete',
              style: 'destructive',
              onPress: () => {
                // Clear the arming id BEFORE handing off: the item is about to stop existing,
                // and a dialog still armed on it would be a dialog with nothing behind it.
                setPendingDeleteId(null)
                onDelete(pendingDelete)
              },
            },
          ]}
          onDismiss={() => setPendingDeleteId(null)}
        />
      )}
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
    // `role="group"` + `aria-pressed`, NOT `role="tablist"`/`role="tab"` (R-18). The tab roles
    // promise the APG keyboard model — roving tabindex, arrow-key navigation between tabs, and
    // an `aria-controls`-linked `tabpanel` — none of which this implemented, so it announced a
    // contract it did not honour and left arrow keys dead for anyone who took it at its word.
    // Three mutually-exclusive toggle buttons is what this actually is, and it is the shape the
    // sibling segmented control in this same package already uses (`MediaCaptureScreen.tsx:440-456`,
    // the Photo/Video mode pill). Tab still reaches every tab; Enter/Space still switches.
    <div role="group" aria-label="Media type" style={{ display: 'flex', borderBottom: GLASS.border, flex: '0 0 auto' }}>
      {MEDIA_LIBRARY_TABS.map((t) => {
        const isActive = t.id === active
        const count = counts[t.id]
        const badge = mediaTabBadge(count)
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={isActive}
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
              // `link`, not the CTA gradient's top stop: this is the accent AS A MARK and AS
              // TEXT, and `GLASS.accentFrom` is a FILL shade (phone DEF-UI-018). Measured on
              // `colors.background`: accentFrom 2.54 (AA text 4.5), inactive `#7a9fc4` 5.31,
              // `link` 9.60 — the selected tab has to be the MOST legible thing in the control.
              borderBottom: `2px solid ${isActive ? colors.link : 'transparent'}`,
              color: isActive ? colors.link : '#7a9fc4',
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
                  // On its own wash: accentFrom 2.05, `link` 7.78.
                  color: isActive ? colors.link : '#7a9fc4',
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
function MediaPreview({ item, onFullscreen, onClose }: { item: MediaItem; onFullscreen(): void; onClose(): void }) {
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
        {/* Image and video only (phone `showFullscreenButton`, MediaPreview.tsx:255) — and only
            with bytes to show: an expired capture has nothing to fill a screen with, so the
            control is absent rather than present-and-empty. */}
        {canFullscreen(item) && (
          <button type="button" aria-label="View fullscreen" onClick={onFullscreen} style={previewActionButton}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M16 21h3a2 2 0 0 0 2-2v-3M8 21H5a2 2 0 0 1-2-2v-3" />
            </svg>
          </button>
        )}
        <button type="button" aria-label="Close preview" onClick={onClose} style={previewActionButton}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
    </div>
  )
}

/** Audio never opens fullscreen on the phone, and neither does a capture with no bytes left. */
function canFullscreen(item: MediaItem): item is AvailableMedia {
  return item.kind !== 'audio' && isMediaAvailable(item)
}

// ---- Fullscreen preview (matrix row 65) -------------------------------------

/**
 * Phone `MediaPreviewFullscreen` (ui-mapping 09:525): a black full-bleed layer with one floating
 * close button top-right, image or video contained inside it, audio never.
 *
 * It portals into the phone overlay root like every other overlay in this feature, so it pins to
 * the visible screen instead of scrolling with the sheet's list.
 *
 * FOCUS (R-8). `aria-modal="true"` prunes everything outside this container from the
 * accessibility tree, so leaving focus on the "View fullscreen" button that opened it stranded a
 * keyboard or screen-reader visitor OUTSIDE the only thing they could still perceive — Tab then
 * walked every hidden control behind the layer before reaching Close. The two effects below are
 * `AlertDialog`'s, verbatim in shape (`AlertDialog.tsx:55-61`): focus the container on mount
 * (`tabIndex={-1}`, so the label is announced rather than just the first button), hand focus back
 * to the opener on unmount, guarded by `isConnected` because the row that opened it may have been
 * deleted meanwhile.
 *
 * The video branch's `autoFocus` is gone with it: it solved half the problem (entry, not exit) for
 * one of the two media kinds, and two entry paths in one component is how the photo branch got
 * missed in the first place.
 */
function MediaFullscreen({ item, onClose }: { item: AvailableMedia; onClose(): void }) {
  const isPhoto = item.kind === 'photo'
  const layerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const opener = document.activeElement
    layerRef.current?.focus()
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])

  return (
    <PhoneOverlayPortal>
      <div
        ref={layerRef}
        data-testid="media-fullscreen"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        // Phone container label (`Fullscreen ${media.type}: ${media.filename}`,
        // MediaPreviewFullscreen.tsx:73-75) — with the demo's own kind word for the type.
        aria-label={`Fullscreen ${item.kind}: ${item.filename}`}
        style={{ position: 'absolute', inset: 0, zIndex: 40, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto', outline: 'none' }}
      >
        {isPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element -- see MediaContent.
          <img
            src={item.url}
            alt={`Fullscreen image: ${item.filename}`}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <video
            aria-label={`Fullscreen video: ${item.filename}`}
            src={item.url}
            poster={item.poster}
            controls
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        )}

        <button
          type="button"
          aria-label="Close fullscreen"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 44,
            right: 14,
            width: 40,
            height: 40,
            borderRadius: 20,
            border: 'none',
            background: 'rgba(0,0,0,0.5)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </PhoneOverlayPortal>
  )
}

/** The bytes themselves. Photos get a 4:3 box and videos 16:9, matching the phone's
 *  `PREVIEW_CONFIG` aspect ratios; audio has no picture, so its control sits in the same well. */
function MediaContent({ item }: { item: AvailableMedia }) {
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

function MediaRow({
  item,
  selected,
  onSelect,
  onRequestDelete,
}: {
  item: MediaItem
  selected: boolean
  onSelect(): void
  onRequestDelete(): void
}) {
  const duration = mediaDurationLabel(item)
  const date = formatCapturedDate(item.capturedAt)
  /**
   * The phone's long-press-to-delete (row 66), on the shared primitive — its THIRD call site.
   *
   * Consumed as-is. The DOM shape is deliberately the Cases one, not the Dashboard one (§57a):
   * the hook attaches to the row's own `<button>`, so `isNestedControl`'s
   * `closest(control) !== currentTarget` check resolves every press inside the row back to that
   * same button and ARMS, while the Delete button beside it is a SIBLING outside the gesture
   * surface and never reaches the hook at all. Nesting Delete inside the row button would both
   * be invalid HTML and make every hold bail.
   *
   * The visible Delete button is not optional decoration: a hold is undiscoverable, unreachable
   * from a keyboard and unannounced to a screen reader, so the primitive's own contract is that
   * it is an accelerator and never the only way in.
   *
   * `contextMenu: false` (R-19) — the ONE call site of the three whose callback is destructive.
   * The primitive's default treats a right-click as a second way to open what a hold opens,
   * which is right for the two tray callers and wrong here: an ordinary right-click, often just
   * reaching for Copy or Inspect, put a delete confirmation on screen with no hold and no press.
   * Opting out also gives the browser's own menu back on these rows — suppression exists to stop
   * the OS menu covering what the hold opened, and nothing opens on this path.
   */
  const longPress = useLongPress(onRequestDelete, { contextMenu: false })

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid rgba(30,58,95,0.35)' }}>
      <button
        type="button"
        aria-label={rowLabel(item, duration)}
        aria-current={selected ? 'true' : undefined}
        onClick={onSelect}
        {...longPress}
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
          borderLeft: `2px solid ${selected ? colors.link : 'transparent'}`,
          cursor: 'pointer',
          ...LONG_PRESS_SURFACE_STYLE,
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

      {/* SIBLING of the gesture surface, not a child — see the hook note above. */}
      <button
        type="button"
        aria-label={`Delete ${item.filename}`}
        onClick={onRequestDelete}
        style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', padding: '0 14px', background: 'transparent', border: 'none', color: '#7a9fc4', cursor: 'pointer' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        </svg>
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
  // The predicate, not a third hand-written copy of its rule (R-24).
  const showImage = item.kind === 'photo' && isMediaAvailable(item)
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
