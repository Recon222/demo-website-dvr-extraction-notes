'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import type { SettingsCategoryId } from '@/features/demo/engine/content/settings-catalog'
import { PhoneOverlayPortal } from '@/features/demo/ui/phone-overlay'
import { SettingsNavBar } from '@/features/demo/ui/screens/settings/SettingsNavBar'
import { SettingsCategoryList } from '@/features/demo/ui/screens/settings/SettingsCategoryList'
import { findSettingsRow, type SettingsSectionView } from '@/features/demo/ui/screens/settings/settingsData'
import { MODAL_SHEET_Z, modalScrim, modalSheet } from '@/features/demo/ui/screens/_shared'

/**
 * The Settings sheet — the demo's port of the phone's `SettingsModal` (P7.1, matrix row 81,
 * decision D6): a master/detail navigator inside one overlay.
 *
 * ## Why this doesn't use `ModalShell`
 *
 * `ModalShell` is one header (title + close) over one body. The phone's Settings sheet has TWO
 * header variants that swap with the pane (`SettingsNavBar`), and its detail pane is a pushed
 * screen with its own back affordance. Wrapping that in `ModalShell` would mean either a second
 * header stacked under the first, or a "custom header" escape hatch on a component eight other
 * modals depend on. Plan §5's U4.2 row anticipates exactly this and names the alternative: the
 * sheet consumes the *scrim + sheet* seam and keeps only its own nav bar.
 *
 * ## The chrome is IMPORTED now, not copied (U4.2)
 *
 * It used to be shared "by value": `:64-96` re-declared `ModalShell`'s scrim and panel objects
 * byte for byte, which meant a change to one silently diverged the other (demo inventory §4,
 * leverage point 2, in those words). Both surfaces now spread `modalScrim` / `modalSheet` from
 * `_shared`, and `SettingsModal.test.tsx`'s `the modal chrome is ONE recipe` block asserts the
 * two rendered declaration strings are equal, so the copy cannot regrow quietly.
 *
 * ## Navigation state is local, exactly as on the phone
 *
 * `activeId` is `useState` here, not a store field — the phone holds it in `SettingsModal`'s
 * own `useState` too (`SettingsModal.tsx:53`), and it dies with the sheet on both sides: the
 * phone resets `activeId` whenever `visible` goes false (`SettingsModal.tsx:61-66`); the demo
 * unmounts. Nothing about which pane was open is worth a `ModalId` or a snapshot field.
 *
 * ## Dismissal
 *
 * - **Escape** — pops the detail if one is open, otherwise closes. This is the phone's
 *   `handleRequestClose` (`SettingsModal.tsx:87-90`), which is what the Android back button
 *   and the sheet gesture both route through.
 * - **Scrim** — closes the sheet outright, matching every other overlay in this feature
 *   (`ModalShell`'s scrim behaves this way and visitors have learned it). The phone's scrim is
 *   an internal dimming layer over the master pane and is not a dismiss target at all; a web
 *   sheet whose backdrop swallowed clicks would read as broken.
 *
 * ## Panes come from the caller
 *
 * `renderPane` rather than a pane registry held here: the two panes this package does NOT own
 * (User Profile → P7.2, Form Fields → P7.3) need data only the store bridge can supply, and
 * routing them through this component would drag store shape into a presentational file. The
 * bridge resolves; this renders. See `panes/index.tsx` for the default resolution and the two
 * `SEAM(P7.2)` / `SEAM(P7.3)` markers.
 */

/**
 * The layer this sheet paints its panel on — the shared `ModalShell` layer, by value, because
 * the whole sheet CHROME is shared by value (see the note above).
 *
 * Exported (review FD-2) because it is the lower bound of the modal-over-modal ordering: the User
 * Profile editor opens from inside this sheet at `SETTINGS_SHEET_Z + MODAL_LAYER.overSheet` and
 * must land above it and below `PICKER_SHEET_Z`. That invariant is only checkable if both ends
 * are read from the surfaces that own them instead of re-typed at the assertion.
 */
export const SETTINGS_SHEET_Z = MODAL_SHEET_Z

const pane: CSSProperties = {
  position: 'relative',
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  outline: 'none',
}

export interface SettingsModalProps {
  sections: readonly SettingsSectionView[]
  /** The detail body for a category. Called only for the open row. */
  renderPane(id: SettingsCategoryId): ReactNode
  onClose(): void
}

export function SettingsModal({ sections, renderPane, onClose }: SettingsModalProps) {
  const reduceMotion = useReducedMotion()
  const [activeId, setActiveId] = useState<SettingsCategoryId | null>(null)
  const detailRef = useRef<HTMLDivElement | null>(null)
  const sheetRef = useRef<HTMLDivElement | null>(null)
  /** The row a `back` should return focus to. Set on open, consumed and cleared on close. */
  const returnToRow = useRef<SettingsCategoryId | null>(null)
  const titleId = `${useId()}-settings-detail-title`

  const active = findSettingsRow(sections, activeId)

  const openDetail = useCallback((id: SettingsCategoryId) => {
    returnToRow.current = id
    setActiveId(id)
  }, [])

  const closeDetail = useCallback(() => setActiveId(null), [])

  // Phone `handleRequestClose` (`SettingsModal.tsx:87-90`): a detail pops first; only the
  // master list closes the sheet. Registered on `document` like every other overlay's Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (activeId) closeDetail()
      else onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [activeId, closeDetail, onClose])

  /**
   * The pane's focus contract, both directions, in ONE effect so it always runs after the pane
   * that focus is meant to land on has actually committed:
   *
   * - **opening** — focus the detail container (the `AlertDialog` idiom: `tabIndex={-1}` +
   *   `aria-labelledby` the pane title), so a screen reader hears WHICH pane opened rather than
   *   silently continuing from a row that is no longer on screen;
   * - **closing** — focus the row that opened it. Queried by `data-settings-row` rather than
   *   held as a ref, because the master list UNMOUNTS while the detail is up: any element ref
   *   captured at open time is detached by the time it would be used.
   *
   * A post-commit effect rather than a `requestAnimationFrame` inside the handler: the row does
   * not exist yet at handler time, and "next frame" is a guess about when React will have
   * re-rendered, not a guarantee.
   */
  useEffect(() => {
    if (activeId) {
      detailRef.current?.focus()
      return
    }
    const back = returnToRow.current
    if (!back) return
    returnToRow.current = null
    sheetRef.current?.querySelector<HTMLElement>(`[data-settings-row="${back}"]`)?.focus()
  }, [activeId])

  const enter = reduceMotion ? {} : { animation: 'slideFwd 0.22s ease' }
  const exit = reduceMotion ? {} : { animation: 'slideBack 0.22s ease' }

  return (
    <PhoneOverlayPortal>
      <div data-modal-scrim onClick={onClose} style={modalScrim} />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        data-testid="settings-modal"
        style={modalSheet}
      >
        {/* `role="group"` on the detail pane is load-bearing (R-10), not decoration: a role-less
            div maps to ARIA `generic`, whose name-from is PROHIBITED, so the `aria-labelledby`
            was discarded by the accessibility tree and the focus-time announcement this
            component's own doc promises never fired. The cited `AlertDialog` idiom is role +
            labelledby; only the second half had been ported. `group` rather than `region` — a
            landmark inside a dialog is noise. */}
        {active ? (
          <div key={active.id} ref={detailRef} role="group" tabIndex={-1} aria-labelledby={titleId} style={{ ...pane, ...enter }}>
            <SettingsNavBar variant="detail" title={active.title} titleId={titleId} onBack={closeDetail} />
            <div
              data-testid="settings-detail-body"
              style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: 18 }}
            >
              {renderPane(active.id)}
            </div>
          </div>
        ) : (
          <div key="master" style={{ ...pane, ...exit }}>
            <SettingsNavBar variant="master" onClose={onClose} />
            <SettingsCategoryList sections={sections} onSelect={openDetail} />
          </div>
        )}
      </div>
    </PhoneOverlayPortal>
  )
}
