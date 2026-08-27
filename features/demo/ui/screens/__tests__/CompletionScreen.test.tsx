import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { CompletionScreen, type CompletionScreenProps } from '@/features/demo/ui/screens/CompletionScreen'
import { glassCardNested } from '@/features/demo/ui/glass-tokens'
import { colors } from '@/features/demo/ui/tokens/palette'
import { severityTone } from '@/features/demo/ui/tokens/status'

/** What jsdom stores for a colour written into a declaration (it re-spaces and hex->rgb). */
const jsdomColor = (value: string): string => {
  const probe = document.createElement('div')
  probe.style.color = value
  return probe.style.color
}

/** jsdom re-spaces a gradient on read-back, so the expectation goes through the same pass. */
const jsdomBackground = (value: string): string => {
  const probe = document.createElement('div')
  probe.style.background = value
  return probe.style.background
}

/** Same again for a shadow — its `rgba()` stops are re-spaced identically. */
const jsdomShadow = (value: string): string => {
  const probe = document.createElement('div')
  probe.style.boxShadow = value
  return probe.style.boxShadow
}

const base: CompletionScreenProps = {
  summary: {
    occNumber: '2026-004417',
    location: '118 Bank St',
    dvr: 'Hikvision DS-7216',
    offset: '00:05:30 behind',
    scopes: 2,
    cameras: 4,
    export: 'USB 3.0',
  },
  isComplete: false,
  canComplete: true,
  validationErrors: [],
  dateTimeCompleted: '2026-06-01 12:00:00',
  completedBy: 'A. Analyst',
  onChange: vi.fn(),
  isFieldVisible: () => true,
  onPreviewPdf: vi.fn(),
  onPreviewTimeOffsetPdf: vi.fn(),
  onExportZip: vi.fn(),
  canExport: true,
  isExporting: false,
  onComplete: vi.fn(),
  onReviewAgain: vi.fn(),
  onBackToDashboard: vi.fn(),
  onBackToCases: vi.fn(),
  onBack: vi.fn(),
  onMenu: vi.fn(),
}

/** The summary panel — addressed by the one line only it renders. */
const summaryCard = () => screen.getByText(/^OCC #/).parentElement as HTMLElement

describe('CompletionScreen — M1(a): the summary card is plain nested glass', () => {
  it('carries NO glow shadow', () => {
    render(<CompletionScreen {...base} />)
    // The `techGlow` M1(a) removed: `0 0 22px rgba(43,140,193,0.12)`, a 22px accent bloom under
    // a summary panel. The phone's own card is a bare `<Card glass glassVariant="nestedCard">`
    // with `techGlow` never passed (`completion.tsx:532-536`), so it takes only the elevation
    // every glass card gets.
    expect(summaryCard().style.boxShadow).not.toMatch(/rgba\(43\s*,\s*140\s*,\s*193/)
    // ...and specifically it is the NESTED tier's inset, nothing more. Asserted positively
    // because "no accent bloom" alone is satisfied by any other stray shadow.
    expect(summaryCard().style.boxShadow).toBe(jsdomShadow(glassCardNested.boxShadow))
  })

  it('drops the `elevated` tier for `nestedCard`', () => {
    render(<CompletionScreen {...base} />)
    const card = summaryCard()
    expect(card.style.background).toBe(jsdomBackground(glassCardNested.background))
    expect(card.style.borderTopColor).toBe(jsdomColor(glassCardNested.borderTopColor))
    expect(card.style.borderRightColor).toBe(jsdomColor(glassCardNested.borderRightColor))
    // The lit edge against the three plain sides IS the tier. A `border`/`borderColor` shorthand
    // written after the spread flattens all four, and only this pair sees it.
    expect(card.style.borderTopColor).not.toBe(card.style.borderRightColor)
  })
})

describe('CompletionScreen — both error callouts are Banners (A71 / D19 hand-back)', () => {
  it('renders the blocked-gate messages as ONE error Banner, not a private red card', () => {
    render(<CompletionScreen {...base} validationErrors={['OCC number is required', 'At least one scope is required']} />)
    // The phone folds every failed rule into ONE banner and says why (`completion.tsx:475-477`):
    // "a Banner is a single status line, and each one is an assertive live region, so N banners
    // would mean N interruptions announcing one validation failure."
    const message = screen.getByText(/Required Fields Missing/)
    expect(message.textContent).toBe('Required Fields Missing:\n- OCC number is required\n- At least one scope is required')
    const tone = severityTone('error')
    expect(message.style.color).toBe(jsdomColor(tone.color))
    expect((message.parentElement as HTMLElement).style.backgroundColor).toBe(jsdomColor(tone.background))
    // What it used to render: `#ff6b7a` over `#ff9aa5` on a `rgba(255,71,87,0.06)` wash — two
    // reds with no palette sibling, invisible to `palette[scheme]`.
    expect(message.style.color).not.toBe(jsdomColor(colors.error))
  })

  it('renders the missing-case-context Banner, and only it, when both would fire', () => {
    render(<CompletionScreen {...base} canComplete={false} validationErrors={['OCC number is required']} />)
    // Phone `:504`: `{!missingCaseContext && validationErrors.length > 0 && …}`. Its reason
    // (`:482-487`): "one tap with no case selected used to mount the second assertive region
    // beside the first and the announcements cut each other off."
    expect(screen.getByText(/No Case Selected/)).toBeInTheDocument()
    expect(screen.queryByText(/Required Fields Missing/)).toBeNull()
  })

  it('shows no callout at all when nothing is blocked', () => {
    render(<CompletionScreen {...base} />)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('CompletionScreen — D10 / F39: blocked CTAs stay focusable and say why', () => {
  /**
   * The house rule, from `Toggle`'s docblock and `ModalActions.submitBlocked`: `aria-disabled`
   * plus an `aria-describedby` pointing at the reason, never the `disabled` attribute. Both
   * halves, because P7.1 shipped one of them and the report records why that was not enough —
   * `aria-disabled` announces a STATE ("dimmed") and carries no reason, and in focus mode a
   * screen reader reads only the focused node, never an unlabelled sibling. A `title` tooltip
   * is a mouse affordance and is not in the accessibility tree for a keyboard visitor at all.
   */
  it('marks Complete & Save `aria-disabled` and points it at the banner that explains', () => {
    render(<CompletionScreen {...base} canComplete={false} />)
    const cta = screen.getByRole('button', { name: /Complete & Save/ })
    expect(cta).toHaveAttribute('aria-disabled', 'true')
    expect(cta).not.toHaveAttribute('disabled')
    const reason = document.getElementById(cta.getAttribute('aria-describedby') ?? '')
    expect(reason?.textContent).toMatch(/No Case Selected/)
  })

  it('marks Export Zip `aria-disabled` too, and does not fire while blocked', () => {
    const onExportZip = vi.fn()
    render(<CompletionScreen {...base} canExport={false} onExportZip={onExportZip} />)
    const cta = screen.getByRole('button', { name: 'Export options' })
    expect(cta).toHaveAttribute('aria-disabled', 'true')
    expect(cta).not.toHaveAttribute('disabled')
    // `aria-disabled` is advisory to the browser — the handler has to refuse by itself, which is
    // exactly the half a `disabled`-attribute port gets for free and this idiom does not.
    cta.click()
    expect(onExportZip).not.toHaveBeenCalled()
  })
})

describe('CompletionScreen — the token census', () => {
  it('spells no bare hex — every colour is a palette or tier token', () => {
    const src = readFileSync(
      join(process.cwd(), 'features', 'demo', 'ui', 'screens', 'CompletionScreen.tsx'),
      'utf8',
    ).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')
    expect(src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([])
  })
})
