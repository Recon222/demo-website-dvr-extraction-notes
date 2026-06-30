'use client'

import { useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import type { SheetItem } from '@/features/demo/ui/screens/map/mapData'
import { SHEET_COLORS } from '@/features/demo/ui/screens/map/mapTokens'
import { SheetHandle } from '@/features/demo/ui/screens/map/SheetHandle'
import { LocationList } from '@/features/demo/ui/screens/map/LocationList'

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
const TAB_BAR_H = 52
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
  const dragging = dragStart.current !== null

  const onPointerDown = (e: PointerEvent) => {
    dragStart.current = e.clientY
    setDragOffset(0)
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: PointerEvent) => {
    if (dragStart.current === null) return
    setDragOffset(dragStart.current - e.clientY)
  }
  const onPointerUp = (e: PointerEvent) => {
    if (dragStart.current === null) return
    const delta = dragStart.current - e.clientY
    dragStart.current = null
    setDragOffset(0)
    if (delta > DRAG_THRESHOLD) onSnapChange(clampIndex(snapIndex + 1))
    else if (delta < -DRAG_THRESHOLD) onSnapChange(clampIndex(snapIndex - 1))
  }

  const base = SHEET_HEIGHTS[clampIndex(snapIndex)]
  const height = Math.max(SHEET_HEIGHTS[0], Math.min(SHEET_HEIGHTS[SHEET_HEIGHTS.length - 1], base + (dragging ? dragOffset : 0)))
  const locationCount = items.filter((i) => i.kind === 'location').length

  const sheet: CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: TAB_BAR_H,
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
    transition: dragging ? 'none' : 'height 0.26s cubic-bezier(0.32,0.72,0,1)',
  }

  return (
    <div data-map-sheet data-snap={snapIndex} style={sheet}>
      <div
        data-testid="sheet-handle"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ touchAction: 'none', cursor: 'grab' }}
      >
        <SheetHandle contentMode={contentMode} locationCount={locationCount} statusCounts={statusCounts} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {contentMode === 'detail' ? detail : <LocationList items={items} selectedId={selectedId} onSelect={onSelect ?? (() => undefined)} />}
      </div>
    </div>
  )
}
