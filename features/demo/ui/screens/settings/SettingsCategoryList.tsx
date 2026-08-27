'use client'

import type { CSSProperties } from 'react'
import type { SettingsCategoryId } from '@/features/demo/engine/content/settings-catalog'
import { DEMO_VERSION_LINE } from '@/features/demo/engine/content/app-info'
import { GLASS, glassCard } from '@/features/demo/ui/glass-tokens'
import { SettingsIcon } from '@/features/demo/ui/screens/settings/settings-icons'
import type { SettingsRowView, SettingsSectionView } from '@/features/demo/ui/screens/settings/settingsData'
import { colors } from '@/features/demo/ui/tokens/palette'

/**
 * The Settings master pane: grouped inset glass cards of tappable rows, iOS-Settings style
 * (phone `SettingsCategoryList.tsx` + `SettingsCategoryRow.tsx`).
 *
 * Presentational — selection is delegated upward. Rows are real `<button>`s rather than
 * `role="button"` divs so keyboard and AT reach them for free, which is also what makes the
 * back-focus restore in `SettingsModal` possible (it re-focuses by `data-settings-row`).
 *
 * Footer: the phone renders `"{appName} · v{version}"` (`SettingsCategoryList.tsx:74`). The
 * demo renders its own version line — the same chrome, labelled for what the visitor is
 * actually looking at (P4.2's precedent, shared through `app-info.ts`).
 */

const sectionLabel: CSSProperties = {
  fontSize: 11.5,
  fontWeight: 600,
  color: '#7a9fc4',
  textTransform: 'uppercase',
  letterSpacing: 0.6,
  padding: '0 4px 8px',
}

const rowBase: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  width: '100%',
  minHeight: 56,
  padding: '0 14px',
  background: 'transparent',
  border: 'none',
  textAlign: 'left',
  cursor: 'pointer',
}

/** Chip (36) + gap (14) + row padding — aligns the divider under the title, phone-style. */
const SEPARATOR_INSET = 64

export interface SettingsCategoryListProps {
  sections: readonly SettingsSectionView[]
  onSelect(id: SettingsCategoryId): void
}

export function SettingsCategoryList({ sections, onSelect }: SettingsCategoryListProps) {
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: 16 }}>
      {sections.map((section) => (
        <div key={section.id} style={{ marginBottom: 20 }}>
          <div style={sectionLabel}>{section.label}</div>
          <div style={{ ...glassCard, overflow: 'hidden' }}>
            {section.items.map((row, index) => (
              <CategoryRow
                key={row.id}
                row={row}
                isLast={index === section.items.length - 1}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      ))}
      <div style={{ textAlign: 'center', fontSize: 11, color: '#46607e', paddingTop: 4 }}>{DEMO_VERSION_LINE}</div>
    </div>
  )
}

function CategoryRow({
  row,
  isLast,
  onSelect,
}: {
  row: SettingsRowView
  isLast: boolean
  onSelect(id: SettingsCategoryId): void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(row.id)}
      // Phone-verbatim accessible name: `"{title} settings"` (`SettingsCategoryRow.tsx:60`).
      // Its `accessibilityHint` ("Opens this settings category") has no ported equivalent —
      // `aria-description` is ARIA 1.3 and effectively unimplemented, and the alternative
      // (`aria-describedby` at a visually-hidden node) would add DOM for a sentence a
      // chevroned row in a settings list already conveys. Deliberate omission, not a miss.
      aria-label={`${row.title} settings`}
      data-testid={`settings-row-${row.id}`}
      data-settings-row={row.id}
      style={rowBase}
    >
      <span
        style={{
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 9,
          border: GLASS.borderAccent,
          background: 'rgba(43,140,193,0.16)',
          color: '#2B8CC1',
        }}
      >
        <SettingsIcon id={row.icon} />
      </span>

      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 15,
          fontWeight: 500,
          color: '#f0f4f8',
          letterSpacing: 0.1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {row.title}
      </span>

      <span style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: '52%' }}>
        {row.preview && (
          <span
            data-testid={`settings-preview-${row.id}`}
            style={{ fontSize: 13, color: '#99badd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {row.preview}
          </span>
        )}
        {row.requiresAuth && (
          /* The phone's padlock (`SettingsCategoryRow.tsx:73-75`). It states a fact about the
             row ON THE DEVICE; the demo never fakes the prompt behind it — the pane explains. */
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7a9fc4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-testid={`settings-lock-${row.id}`}>
            <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
            <path d="M8.5 10.5V8a3.5 3.5 0 1 1 7 0v2.5" />
          </svg>
        )}
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#7a9fc4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </span>

      {!isLast && (
        <span
          aria-hidden="true"
          style={{ position: 'absolute', left: SEPARATOR_INSET, right: 0, bottom: 0, height: 1, background: colors.border }}
        />
      )}
    </button>
  )
}
