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
import { ElevatedEdges } from '@/features/demo/ui/controls/button-recipe'
import { SAMPLE_BADGE } from '@/features/demo/ui/controls/sample-badge'
import { GlassBottomSheet } from '@/features/demo/ui/controls/GlassBottomSheet'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import { PhoneOverlayPortal } from '@/features/demo/ui/phone-overlay'
import { LONG_PRESS_SURFACE_STYLE, useLongPress } from '@/features/demo/ui/primitives/useLongPress'
import { colors, scheme } from '@/features/demo/ui/tokens/palette'
import { iconSize, radius, spacing, touchTarget } from '@/features/demo/ui/tokens/scale'

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
    /*
     * SEAM(U4.1b) adoption — matrix rows 57-66, and P5's "fold" the phone's own implementer
     * refused once and was overruled on: `MediaLibrarySheet` `+122/-227`, "a whole parallel sheet
     * implementation was DELETED and replaced by the shared `<GlassBottomSheet>`". Every prop
     * below is the phone's call at `MediaLibrarySheet.tsx:214-231`, with its reason.
     *
     * `visible` is a constant: this component is MOUNTED by the bridge when the library opens
     * and unmounts through `onClose` (the D-B6 ruling in this file's docblock — exactly one
     * exit). `ModalShell`, which it replaces, had no exit animation either, so nothing is lost;
     * a `visible` prop threaded from `DemoExperience` would be new store-facing state for a
     * transition the surface has never had.
     */
    <GlassBottomSheet
      visible
      onClose={onClose}
      title="Media Library"
      subtitle={mediaLibrarySubtitle(counts.total)}
      headerRight={<LibraryCloseButton onClose={onClose} />}
      // Phone `:218-219`: "A browsing sheet, not a picker: it fills the screen and its lists
      // scroll inside it, so it needs the shell's definite-height mode."
      maxHeightRatio={1}
      fillHeight
      // Phone `:222-224`: "The lists own the vertical axis; a drag-to-dismiss on the chrome would
      // be the only way out besides the close button, and the close button is right there."
      showHandle={false}
      enableSwipeToDismiss={false}
      /*
       * `closeLabel` is DELIBERATELY NOT PASSED, and it is the one prop where this adoption
       * departs from the phone's call (`:227` passes it). `closeLabel` names the SCRIM;
       * `GlassBottomSheet`'s own docblock rules the case: "a sheet that renders a labelled ✕
       * already has one, and giving the scrim the same words would put two identically-named
       * controls in the tree. Pass it when the sheet has no visible close control; leave it off
       * when `headerRight` carries one." Measured — passing it here reds
       * `MediaLibrarySheet.test.tsx` with "Found multiple elements with the role button and name
       * Close media library". On the phone the scrim IS the only labelled dismiss, which is why
       * its call differs. At `maxHeightRatio={1}` the scrim is not reachable here anyway, which
       * is the phone's own note at `:225`.
       */
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
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
    </GlassBottomSheet>
  )
}

/**
 * A49 / DEF-UI-019 on the web: there is no `hitSlop`, so the PADDING is the hit area and an
 * equal negative margin hands the painted box back to the flex row that lays it out. The painted
 * glyph lands exactly where a bare `painted`-square box would put it, because the margin box is
 * still `painted` either way. `_shared.tsx`'s `modalHeaderIconBtn` is the same idiom.
 *
 * The arithmetic is spelled once, from `touchTarget.min`, rather than as two magic numbers per
 * call site — `SettingsCategoryList`'s `SEPARATOR_INSET` is the precedent for naming a derived
 * layout figure instead of inlining it.
 */
function hitTarget(painted: number): CSSProperties {
  const pad = (touchTarget.min - painted) / 2
  return {
    padding: pad,
    margin: -pad,
    background: 'transparent',
    border: 'none',
    display: 'flex',
    cursor: 'pointer',
  }
}

/**
 * The sheet's `headerRight` — phone `MediaLibrarySheet.tsx:194-211`, whose own comment reads:
 * "The 3D close button lives in the shell's `headerRight` slot. Its four hand-mixed alphas map
 * one-to-one onto the `nestedCard` tier's four fields."
 *
 * The shell owns NO close affordance of its own (`GlassBottomSheet.tsx`'s `headerRight`
 * docblock), which is why this is the caller's to render. 30x30 painted at `radius.md`
 * (`:2-9` of its stylesheet), `hitSlop: Layout.spacing.sm` on the phone -> a real 44 target here.
 */
function LibraryCloseButton({ onClose }: { onClose(): void }) {
  return (
    <button
      type="button"
      data-testid="media-library-close-button"
      // Verbatim, phone `:208` and `:231` — both spellings of this surface's close control agree
      // on the words.
      aria-label="Close media library"
      onClick={onClose}
      style={hitTarget(30)}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: radius.md,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...glassButtonFace,
        }}
      >
        <svg width={iconSize.sm} height={iconSize.sm} viewBox="0 0 24 24" fill="none" stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </span>
    </button>
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
      {/* Phone `styles.actionRow` `:459-466` — `gap: spacing.sm`. Each button's negative margin
          hands its painted 36-box back to this row, so the row lays out exactly as it did while
          the two targets abut across the 8px gap without overlapping. */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing.sm, padding: '0 12px 4px' }}>
        {/* Image and video only (phone `showFullscreenButton`, MediaPreview.tsx:255) — and only
            with bytes to show: an expired capture has nothing to fill a screen with, so the
            control is absent rather than present-and-empty. */}
        {canFullscreen(item) && (
          <button type="button" aria-label="View fullscreen" onClick={onFullscreen} style={hitTarget(PREVIEW_ACTION_SIZE)}>
            <span style={previewActionFace}>
              <svg width={ACTION_ICON_SIZE} height={ACTION_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M16 21h3a2 2 0 0 0 2-2v-3M8 21H5a2 2 0 0 1-2-2v-3" />
              </svg>
            </span>
          </button>
        )}
        <button type="button" aria-label="Close preview" onClick={onClose} style={hitTarget(PREVIEW_ACTION_SIZE)}>
          <span style={previewActionFace}>
            <svg width={ACTION_ICON_SIZE} height={ACTION_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
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
/**
 * The fullscreen close chip's ground. Deliberately NOT `colors.scrim`, and exported only so
 * `ui/__tests__/palette-contrast.test.ts` can pin the composited ratio against the value the UI
 * actually paints. Matrix A90; phone `MediaPreviewFullscreen.tsx:63`.
 *
 * `colors.scrim` is the SHEET-BACKDROP token and sits at 0.32 on purpose: a backdrop should dim
 * the app behind an open sheet, not black it out. Right for a backdrop, wrong for this chip. A
 * backdrop wants to be see-through; a 40px disc behind a 22px glyph, painted over whatever frame
 * the analyst is examining, does not. This replaces `rgba(0,0,0,0.5)`, which over a bright
 * daylight CCTV still composited to #808080 and left the glyph at 3.95:1 — under the 4.5:1 a
 * 22px icon-as-control wants, and the ✕ is the ONLY exit from this layer.
 *
 * This is not drift away from the token convergence; it is a contract the shared token cannot
 * satisfy at any single alpha. Do NOT "resync" it to `colors.scrim` — that is the PR #127
 * `3893169e` regression coming back by another route, and the contrast rows below it are what
 * catch the attempt.
 */
export const MEDIA_CLOSE_CHIP = 'rgba(0, 40, 83, 0.9)'

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
          // A49: 40 -> 44 and the glyph 22 -> 24, both the phone's own constants —
          // `MediaPreviewFullscreen.tsx:40-41`, `CLOSE_BUTTON_SIZE = 44` / `CLOSE_ICON_SIZE = 24`.
          // The chip is PAINTED at 44 here rather than slop-padded like the preview actions,
          // because the phone paints it at 44 too: it floats over a black layer with nothing
          // beside it to dominate.
          style={{
            position: 'absolute',
            top: 44,
            right: 14,
            width: touchTarget.min,
            height: touchTarget.min,
            borderRadius: radius.full,
            border: 'none',
            background: MEDIA_CLOSE_CHIP,
            color: colors.text,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <svg width={iconSize.md} height={iconSize.md} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
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
      // Phone `EmptyMediaState.tsx:56-59` — the container carries `${message}. ${hint}` as ONE
      // accessible name, so a screen reader gets the whole state in one utterance instead of two
      // orphaned lines.
      aria-label={`${empty.message}. ${empty.hint}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        // phone `styles.container` `:80-86` — `paddingHorizontal: spacing.xl` (32),
        // `paddingVertical: spacing.xxl` (48). Already matching; spelled through the scale now.
        padding: `${spacing.xxl}px ${spacing.xl}px`,
        textAlign: 'center',
      }}
    >
      {/* phone `styles.message` `:88-93` — `fontSize.lg` (18, was 16), `fontWeight.medium` (500,
          already matching), `colors.textSecondary`. Its `marginTop: spacing.md` is deliberately
          NOT ported: on the phone that 16 is the gap under the ICON (`:61-66`), and this state
          has no icon to sit under — see the U7.2 report's deferral proposal for the icon itself.
          The container's `gap: 8` goes with it; the hint carries the phone's own `marginTop`. */}
      <div style={{ fontSize: 18, fontWeight: 500, color: colors.textSecondary }}>{empty.message}</div>
      {/* phone `styles.hint` `:95-99` — `fontSize.sm` (14, was 13), `marginTop: spacing.sm` (8),
          and `colors.textSecondary` as well: the phone paints BOTH lines the same token
          (`:69`, `:74`). The demo's second line was a dimmer one-off that belonged to no token. */}
      <div style={{ fontSize: 14, color: colors.textSecondary, marginTop: spacing.sm }}>{empty.hint}</div>
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

// W3 r1 F61 — the module-level style tables ship readonly. `as const satisfies CSSProperties`
// and never a bare annotation: `satisfies` keeps the literal types while `as const` makes the
// object immutable, which an annotation alone does neither of.
const listReset = { listStyle: 'none', margin: 0, padding: 0 } as const satisfies CSSProperties

const metaLine = {
  display: 'block',
  fontSize: 11,
  color: '#7a9fc4',
  marginTop: 2,
} as const satisfies CSSProperties

/**
 * The 3D-glass face shared by the header close and the two preview action buttons — phone
 * `MediaPreview.tsx:276-291`'s `actionButtonGlassStyle`, dark arm.
 *
 * A51: the two EDGES are `ElevatedEdges`, imported rather than re-typed. `button-recipe.ts`'s
 * docblock already named this file as the demo's one hand-rolled copy ("byte-identical apart
 * from `rgba()` spacing, and left to U7.2, which opens that file whole") — this is that
 * import. The fill and the SIDE colour are not part of that pair and stay spelled, with the
 * phone's own line numbers: `:278` and `:279`.
 *
 * LONGHANDS ONLY, no `border` shorthand. What was here read `border: '1px solid <sides>'` and
 * then re-set `borderTopColor`/`borderBottomColor` after it — right on first paint and the
 * exact shape `partner-lit-edge-ruling.md` §3-§4 measured wrong on the next, because React
 * writes only the keys that CHANGED. It is inert today (a module const never updates) and it is
 * a live trap the moment anything spreads or conditions it.
 */
const glassButtonFace = {
  background: 'rgba(255,255,255,0.06)', // MediaPreview.tsx:278
  borderStyle: 'solid',
  borderWidth: 1,
  borderRightColor: 'rgba(255,255,255,0.08)', // :279
  borderLeftColor: 'rgba(255,255,255,0.08)', // :279
  borderTopColor: ElevatedEdges[scheme].top, // :280 — A51
  borderBottomColor: ElevatedEdges[scheme].bottom, // :281 — A51
  color: '#cdd9e6',
} as const satisfies CSSProperties

/**
 * The painted disc of a preview action button — phone `ACTION_BUTTON_SIZE = 36`
 * (`MediaPreview.tsx:69`), was 32 here.
 *
 * It stays 36 and the 44 target comes from `hitTarget`, which is the phone's ruling verbatim
 * (`:63-68`): "The painted circle stays 36 -- it sits in a tight row under the preview and a
 * 44px disc would dominate it -- so the 44x44 minimum is met with slop (DEF-UI-019). 4 a side
 * takes 36 to exactly 44, and the row's `gap` is 8, so the two targets abut without
 * overlapping." Growing the paint to 44 would meet the letter of A49 and lose the picture.
 */
const PREVIEW_ACTION_SIZE = 36
/** Phone `ACTION_ICON_SIZE = 20` (`MediaPreview.tsx:70`), was 18 here. */
const ACTION_ICON_SIZE = iconSize.sm

export const previewActionFace = {
  width: PREVIEW_ACTION_SIZE,
  height: PREVIEW_ACTION_SIZE,
  borderRadius: radius.full,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  ...glassButtonFace,
} as const satisfies CSSProperties

/**
 * The demo's sample badge — a bundled asset is labelled everywhere it appears, never only where
 * it was made.
 *
 * W3 r1 F51: the three COLOURS were re-typed here rather than imported, so D12's freeze-and-
 * defend arm rested on five hand-typed literals happening to agree while `SAMPLE_BADGE`'s
 * docblock claimed sole ownership of all of them. They come from the seam now. Zero rendered
 * bytes move — the three values are byte-identical to what this held.
 *
 * The chip GEOMETRY (9/700/0.8/uppercase, radius 6, `1px 6px`) stays local and is NOT part of
 * F51: the seam owns the defended colours, and the finding's own scope note excludes the wider
 * amber family. If a fourth surface ever needs the geometry too, that is the day to lift it —
 * `sample-badge.ts` is U7.3's file, not this package's.
 */
export const sampleBadge = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 0.8,
  textTransform: 'uppercase',
  color: SAMPLE_BADGE.foreground,
  background: SAMPLE_BADGE.background,
  border: `1px solid ${SAMPLE_BADGE.border}`,
  borderRadius: 6,
  padding: '1px 6px',
} as const satisfies CSSProperties
