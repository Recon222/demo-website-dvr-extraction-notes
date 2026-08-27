'use client'

import { Fragment, useEffect, useRef } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { assertNever } from '@/features/demo/engine/logic/assert-never'
import { PhoneOverlayPortal } from '@/features/demo/ui/phone-overlay'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import { colors } from '@/features/demo/ui/tokens/palette'

/**
 * ExportActionSheet — the ZIP scope chooser (parity P5.3, matrix row 27). Web port of the
 * phone's `src/components/export/ExportActionSheet.tsx`.
 *
 * REACHED FROM COMPLETION, NOT THE EXPORT TAB. The ui-mapping doc is explicit about this
 * (`04-tab-export.md:3` — "A fourth in-scope component … is **not** rendered by this tab at
 * all"), and `completion.tsx:610-617` is its only call site on the phone.
 *
 * Presentational and OPTION-AGNOSTIC, like the phone's: the option list lives at the CALLER
 * (`completion.tsx:298-316`), so the sheet has no opinion about what can be exported. Icons are
 * named rather than passed as elements — the phone passes Ionicons names for the same reason,
 * and it keeps the caller's list plain data that a test can assert against.
 */

export type ExportSheetOptionId = 'location' | 'case' | 'cancel'
export type ExportSheetIcon = 'location' | 'folder' | 'close'

export interface ExportSheetOption {
  id: ExportSheetOptionId
  label: string
  description?: string
  icon?: ExportSheetIcon
  /** Renders in the error colour, like the phone's `destructive` flag. `cancel` is treated as
   *  destructive whether or not it sets this (phone `:209/:222`). */
  destructive?: boolean
}

export interface ExportActionSheetProps {
  /** Phone default (`ExportActionSheet.tsx:70`). Completion overrides it with
   *  `Choose Export Scope` — the only title a phone user ever sees. */
  title?: string
  options: readonly ExportSheetOption[]
  onSelect(id: ExportSheetOptionId): void
  /** Scrim, Escape, and (on the phone) Android back. */
  onCancel(): void
  /** Bound to `isExporting`: disables every option at once (phone `:392`). */
  disabled?: boolean
}

function OptionIcon({ icon, color }: { icon: ExportSheetIcon; color: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  switch (icon) {
    case 'location': // phone `location-outline`
      return (
        <svg {...common}>
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      )
    case 'folder': // phone `folder-outline`
      return (
        <svg {...common}>
          <path d="M4 6a2 2 0 0 1 2-2h3.5l2 2.5H18a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
        </svg>
      )
    case 'close': // phone `close-outline`
      return (
        <svg {...common}>
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      )
    // R-3: closed, not fallthrough. Without it a new `ExportSheetIcon` renders NOTHING —
    // a silently icon-less row rather than a compile error.
    default:
      return assertNever(icon)
  }
}

const scrim: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 30,
  background: 'rgba(4,8,14,0.55)',
  pointerEvents: 'auto',
}

export function ExportActionSheet({
  title = 'Export Options',
  options,
  onSelect,
  onCancel,
  disabled = false,
}: ExportActionSheetProps) {
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disabled) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [disabled, onCancel])

  /**
   * Focus in on mount, back to the opener on unmount (review R-7) — the two-effect idiom shared
   * with `AlertDialog`, `ExportModal`'s own `ValidationContent` and `MediaLibrarySheet`.
   *
   * Without it the Completion "Export Zip" button kept focus BEHIND the scrim, so Tab walked the
   * whole obscured form and the tab bar before reaching the sheet, and a screen reader was never
   * told a chooser had opened. It also makes the container's arrow-key handler reachable: keydown
   * dispatches at `document.activeElement`, which was outside the portal entirely — the promise
   * `role="menu"` makes was unkeepable on the only path that opens this sheet.
   */
  useEffect(() => {
    const opener = document.activeElement
    listRef.current?.focus()
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])

  // `role="menu"` promises arrow-key traversal, so it is implemented rather than claimed.
  const onListKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const items = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])
    if (items.length === 0) return
    const at = items.indexOf(document.activeElement as HTMLButtonElement)
    const step = e.key === 'ArrowDown' ? 1 : -1
    // A first press with focus still on the sheet lands on the first (or last) row.
    const next = at === -1 ? (step === 1 ? 0 : items.length - 1) : (at + step + items.length) % items.length
    e.preventDefault()
    items[next].focus()
  }

  return (
    <PhoneOverlayPortal>
      <div
        data-testid="export-sheet-scrim"
        onClick={() => {
          if (!disabled) onCancel()
        }}
        style={scrim}
      />
      <div
        ref={listRef}
        data-testid="export-action-sheet"
        role="menu"
        aria-label={title}
        // Focusable target for the mount effect above (R-7) — without a tabindex the container
        // cannot take focus, so neither the announcement nor the arrow keys would work.
        tabIndex={-1}
        onKeyDown={onListKeyDown}
        style={{
          outline: 'none',
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 12,
          zIndex: 31,
          borderRadius: 16,
          border: GLASS.borderSoft,
          background: GLASS.gradientPanel,
          boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          pointerEvents: 'auto',
          animation: 'sheetUp 0.28s ease',
        }}
      >
        <div style={{ padding: '14px 18px', borderBottom: GLASS.border }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#f0f4f8', textAlign: 'center' }}>{title}</div>
        </div>
        <div style={{ padding: '4px 0' }}>
          {options.map((option, index) => {
            const isCancel = option.id === 'cancel'
            const isLast = index === options.length - 1
            const tinted = option.destructive || isCancel
            const iconColor = tinted ? '#ff6b7a' : '#4BA3D4'
            return (
              <Fragment key={option.id}>
                <button
                  type="button"
                  role="menuitem"
                  data-testid={`export-option-${option.id}`}
                  onClick={() => {
                    if (!disabled) onSelect(option.id)
                  }}
                  disabled={disabled}
                  aria-label={option.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    minHeight: 58,
                    padding: '12px 18px',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.5 : 1,
                    // The cancel row is set apart with its own rule + inset, the phone's
                    // `cancelOption` (`:317-321`).
                    ...(isCancel ? { marginTop: 4, borderTop: GLASS.border } : {}),
                  }}
                >
                  {option.icon && <OptionIcon icon={option.icon} color={iconColor} />}
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 15,
                        fontWeight: 600,
                        color: tinted ? '#ff6b7a' : '#f0f4f8',
                      }}
                    >
                      {option.label}
                    </span>
                    {option.description && (
                      <span style={{ display: 'block', fontSize: 12.5, color: '#7a9fc4', marginTop: 2 }}>
                        {option.description}
                      </span>
                    )}
                  </span>
                </button>
                {/* Hairline between rows only — never after the last (phone `:242`). The cancel
                    row carries its own top rule, so it never gets two. */}
                {!isLast && options[index + 1].id !== 'cancel' && (
                  <div
                    data-export-sheet-separator
                    style={{ height: 1, background: colors.border, opacity: 0.6, marginLeft: 52 }}
                  />
                )}
              </Fragment>
            )
          })}
        </div>
      </div>
    </PhoneOverlayPortal>
  )
}
