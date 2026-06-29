'use client'

import { createContext, useContext, useEffect } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * A stable DOM node pinned to the phone SCREEN viewport, mounted by PhoneFrame OUTSIDE the
 * scrolling screen-content container. Overlay surfaces portal into it (via PhoneOverlayPortal) so
 * they anchor to the visible screen regardless of scroll. Defaults to null (e.g. in isolated
 * component tests), in which case PhoneOverlayPortal renders inline.
 */
export const PhoneOverlayContext = createContext<HTMLElement | null>(null)

/**
 * Portals `children` into the phone overlay root. Every overlay surface (ModalShell, WizardDrawer,
 * PdfPreview, PickerSheet) renders through this so it pins to the viewport instead of scrolling
 * with the screen — scrolling with the screen dragged panels off-viewport and revealed the screen
 * behind (the "scroll-lift" bug). Falls back to inline rendering when no overlay is in context
 * (isolated tests); warns in the dev server, since an inline overlay in the running app would
 * silently re-introduce that bug (e.g. a future open-on-mount path rendered outside <PhoneFrame>).
 */
export function PhoneOverlayPortal({ children }: { children: ReactNode }) {
  const overlay = useContext(PhoneOverlayContext)
  useEffect(() => {
    if (!overlay && process.env.NODE_ENV === 'development') {
      console.warn(
        '[demo] PhoneOverlayPortal: no PhoneOverlayContext root — rendering inline. Overlay ' +
          'surfaces will not be pinned to the viewport (scroll-lift bug). Ensure the surface ' +
          'renders inside <PhoneFrame>.',
      )
    }
  }, [overlay])
  return overlay ? createPortal(children, overlay) : <>{children}</>
}
