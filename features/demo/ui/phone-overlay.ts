'use client'

import { createContext } from 'react'

/**
 * A stable DOM node pinned to the phone SCREEN viewport, mounted by PhoneFrame OUTSIDE the
 * scrolling screen-content container. Picker bottom-sheets portal into it so they anchor to
 * the visible screen bottom regardless of how far the screen has scrolled. Defaults to null
 * (e.g. in isolated component tests), in which case PickerSheet renders inline.
 */
export const PhoneOverlayContext = createContext<HTMLElement | null>(null)
