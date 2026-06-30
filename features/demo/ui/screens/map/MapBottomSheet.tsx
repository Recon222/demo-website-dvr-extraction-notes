'use client'

import { useCallback, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import type { SheetItem } from '@/features/demo/ui/screens/map/mapData'
import { SHEET_COLORS } from '@/features/demo/ui/screens/map/mapTokens'
import { SheetHandle } from '@/features/demo/ui/screens/map/SheetHandle'
import { LocationList } from '@/features/demo/ui/screens/map/LocationList'
import { TAB_BAR_HEIGHT } from '@/features/demo/ui/controls/TabBar'

export interface MapBottomSheetProps {
  items: SheetItem[]
  statusCounts: { started: number; working: number; complete: number }
  /** Controlled snap detent: 0 = peek, 1 = partial, 2 = full. */
  snapIndex: number
  onSnapChange(index: number): void
  contentMode: 'list' | 'detail'
  selectedId?: string | null
  onSelect?(id: string): void
  /** Detail-mode content (Slice 8 fills this in). */
  detail?: React.ReactNode
}

// Visible detent heights (px) within the 378×786 phone screen, above the tab bar.
const SHEET_HEIGHTS = [116, 340, 560]
const DRAG_THRESHOLD = 40

const clampIndex = (i: number) => Math.max(0, Math.min(i, SHEET_HEIGHTS.length - 1))

/**
 * The map's draggable bottom sheet — three detents (peek/partial/full), controlled snap index. Drag
 * the handle: the height follows the pointer, and on release a swipe past the threshold steps to the
 * adjacent detent. List mode renders the location list; detail mode renders the supplied detail node.
 */
export function MapBottomSheet({
  items,
  statusCounts,
  snapIndex,
  onSnapChange,
  contentMode,
  selectedId = null,
  onSelect,
  detail,
}: MapBottomSheetProps) {
  const dragStart = useRef<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // Single exit path for a drag: snap to the adjacent detent if the swipe crossed the threshold, then
  // fully reset. Called on pointerup/pointercancel AND from a move that finds the button released —
  // so a missed/off-element release can never strand the sheet stuck to the cursor.
  const endDrag = useCallback(
    (clientY: number) => {
      const start = dragStart.current
      dragStart.current = null
      setDragOffset(0)
      setIsDragging(false)
      if (start === null) return
      const delta = start - clientY
      if (delta > DRAG_THRESHOLD) onSnapChange(clampIndex(snapIndex + 1))
      else if (delta < -DRAG_THRESHOLD) onSnapChange(clampIndex(snapIndex - 1))
    },
    [snapIndex, onSnapChange],
  )

  const onPointerDown = (e: PointerEvent) => {
    dragStart.current = e.clientY
    setDragOffset(0)
    setIsDragging(true)
    // Capture so move/up fire on the handle even if the pointer leaves it (prevents missed releases).
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    } catch {
      /* jsdom / unsupported — the e.buttons guard below is the safety net */
    }
  }
  const onPointerMove = (e: PointerEvent) => {
    if (dragStart.current === null) return
    if (e.buttons === 0) {
      // The primary button is no longer down — a release we didn't get a pointerup for. End the drag.
      endDrag(e.clientY)
      return
    }
    setDragOffset(dragStart.current - e.clientY)
  }
  const onPointerUp = (e: PointerEvent) => endDrag(e.clientY)
  const onPointerCancel = (e: PointerEvent) => endDrag(e.clientY)

  const base = SHEET_HEIGHTS[clampIndex(snapIndex)]
  const height = Math.max(SHEET_HEIGHTS[0], Math.min(SHEET_HEIGHTS[SHEET_HEIGHTS.length - 1], base + (isDragging ? dragOffset : 0)))
  const locationCount = items.filter((i) => i.kind === 'location').length

  const sheet: CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: TAB_BAR_HEIGHT, // flush with the tab bar — no seam
    height,
    zIndex: 20,
    background: SHEET_COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTop: `1px solid ${SHEET_COLORS.border}`,
    boxShadow: '0 -8px 24px rgba(0,0,0,0.45)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: isDragging ? 'none' : 'height 0.26s cubic-bezier(0.32,0.72,0,1)',
  }

  return (
    <div data-map-sheet data-snap={snapIndex} style={sheet}>
      <div
        data-testid="sheet-handle"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{
          touchAction: 'none',
          // Stop the browser from starting a text selection on the handle's text (count/badges) —
          // that selection was both the visible "highlighting" and what stole the pointer mid-drag.
          userSelect: 'none',
          WebkitUserSelect: 'none',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <SheetHandle contentMode={contentMode} locationCount={locationCount} statusCounts={statusCounts} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {contentMode === 'detail' ? detail : <LocationList items={items} selectedId={selectedId} onSelect={onSelect ?? (() => undefined)} />}
      </div>
    </div>
  )
}
