import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dropdown } from '@/features/demo/ui/inputs/Dropdown'
import { colors } from '@/features/demo/ui/tokens/palette'
import { radius, spacing, withAlpha } from '@/features/demo/ui/tokens/scale'

const OPTIONS = ['7', '10', '15', '24', '30', 'Other']

/** What jsdom stores for a colour written into a declaration (it re-spaces and hex->rgb). */
function jsdomColor(value: string): string {
  const probe = document.createElement('div')
  probe.style.color = value
  return probe.style.color
}

describe('Dropdown selector', () => {
  it('shows the placeholder when value is empty', () => {
    render(<Dropdown value="" onChange={vi.fn()} options={OPTIONS} placeholder="Select…" />)
    expect(screen.getByText('Select…')).toBeInTheDocument()
  })
  it('shows the selected option when value is set', () => {
    render(<Dropdown value="24" onChange={vi.fn()} options={OPTIONS} />)
    expect(screen.getByText('24')).toBeInTheDocument()
  })
  it('is closed by default (no menu in the DOM) and reports aria-expanded=false', () => {
    render(<Dropdown label="FPS" value="" onChange={vi.fn()} options={OPTIONS} />)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^FPS/ })).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('Dropdown open/select', () => {
  it('opens the menu when the selector is clicked and reports aria-expanded=true', async () => {
    const user = userEvent.setup()
    render(<Dropdown label="Recording FPS" value="" onChange={vi.fn()} options={OPTIONS} />)
    await user.click(screen.getByRole('button', { name: /^Recording FPS/ }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(OPTIONS.length)
    expect(screen.getByRole('button', { name: /^Recording FPS/ })).toHaveAttribute('aria-expanded', 'true')
  })

  it('calls onChange with the option value and closes when an option is clicked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Dropdown label="Recording FPS" value="" onChange={onChange} options={OPTIONS} />)
    await user.click(screen.getByRole('button', { name: /^Recording FPS/ }))
    await user.click(screen.getByRole('menuitemradio', { name: '15' }))
    expect(onChange).toHaveBeenCalledWith('15')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('marks the currently-selected option', async () => {
    const user = userEvent.setup()
    render(<Dropdown label="FPS" value="24" onChange={vi.fn()} options={OPTIONS} />)
    await user.click(screen.getByRole('button', { name: /^FPS/ }))
    expect(screen.getByRole('menuitemradio', { name: '24' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('menuitemradio', { name: '15' })).toHaveAttribute('aria-checked', 'false')
  })

  it('closes on Escape without calling onChange', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Dropdown label="FPS" value="" onChange={onChange} options={OPTIONS} />)
    await user.click(screen.getByRole('button', { name: /^FPS/ }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('Dropdown label/value options (phone-style annotated lists)', () => {
  const PAIRS = [
    { label: '1920x1080 (1080p)', value: '1920x1080' },
    { label: 'Other (Custom)', value: 'custom' },
  ]

  it('shows the LABEL of the selected value in the pill', () => {
    render(<Dropdown label="Resolution" value="1920x1080" onChange={vi.fn()} options={PAIRS} />)
    expect(screen.getByText('1920x1080 (1080p)')).toBeInTheDocument()
    expect(screen.queryByText(/^1920x1080$/)).not.toBeInTheDocument()
  })

  it('renders labels in the menu but reports the VALUE through onChange', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Dropdown label="Resolution" value="" onChange={onChange} options={PAIRS} />)
    await user.click(screen.getByRole('button', { name: /^Resolution/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Other (Custom)' }))
    expect(onChange).toHaveBeenCalledWith('custom')
  })

  it('marks the selected option by value, not label', async () => {
    const user = userEvent.setup()
    render(<Dropdown label="Resolution" value="custom" onChange={vi.fn()} options={PAIRS} />)
    await user.click(screen.getByRole('button', { name: /^Resolution/ }))
    expect(screen.getByRole('menuitemradio', { name: 'Other (Custom)' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('menuitemradio', { name: '1920x1080 (1080p)' })).toHaveAttribute('aria-checked', 'false')
  })

  it('degrades honestly for an unknown non-empty value: shows the raw value, not the placeholder', () => {
    render(<Dropdown label="Resolution" value="1440x900" onChange={vi.fn()} options={PAIRS} placeholder="Select…" />)
    expect(screen.getByText('1440x900')).toBeInTheDocument()
    expect(screen.queryByText('Select…')).not.toBeInTheDocument()
  })
})

describe('Dropdown accessible name (R-10, WCAG 4.1.2)', () => {
  const PAIRS = [
    { label: '1920x1080 (1080p)', value: '1920x1080' },
    { label: 'Other (Custom)', value: 'custom' },
  ]

  it('exposes the current selection through the accessible name, not just the label', () => {
    render(<Dropdown label="Resolution" value="custom" onChange={vi.fn()} options={PAIRS} />)
    expect(screen.getByRole('button', { name: 'Resolution Other (Custom)' })).toBeInTheDocument()
  })

  it('falls back to the placeholder in the accessible name when nothing is selected', () => {
    render(<Dropdown label="Resolution" value="" onChange={vi.fn()} options={PAIRS} placeholder="Select…" />)
    expect(screen.getByRole('button', { name: 'Resolution Select…' })).toBeInTheDocument()
  })

  it('uses the value text alone as the accessible name when no label is given', () => {
    render(<Dropdown value="1920x1080" onChange={vi.fn()} options={PAIRS} />)
    expect(screen.getByRole('button', { name: '1920x1080 (1080p)' })).toBeInTheDocument()
  })
})

/**
 * A73 — the picker chrome, transcribed from the phone's `Picker.tsx`.
 *
 * The four accent alphas the plan's row names (`0.08` selection wash, `0.06` indicator zone,
 * `0.2` / `0.15` check pill) route through `withAlpha` here rather than being spelled: the
 * phone's own `accentTint`/`inkTint` (`Picker.tsx:63-64`) exist because the concat idiom they
 * replaced appended two hex digits to whatever string it was handed and produced an
 * unparseable colour on any rgba token. Composing the expected value the same way is what
 * makes these pins move WITH `colors.primary` instead of freezing a rendered literal.
 */
describe('Dropdown chrome (A73)', () => {
  const tint = (a: number) => jsdomColor(withAlpha(colors.primary, a))

  async function open(user: ReturnType<typeof userEvent.setup>, value = '24') {
    render(<Dropdown label="Retention" value={value} onChange={vi.fn()} options={OPTIONS} />)
    await user.click(screen.getByRole('button', { name: /^Retention/ }))
  }

  it('gives the trigger the shared field geometry — 16px padding, 16px type', () => {
    render(<Dropdown label="Retention" value="24" onChange={vi.fn()} options={OPTIONS} />)
    const text = screen.getByText('24')
    expect(text.style.padding).toBe(`${spacing.md}px`)
    expect(text.style.fontSize).toBe('16px')
  })

  it('routes the indicator zone and its divider through the tokens', () => {
    const { container } = render(
      <Dropdown label="Retention" value="24" onChange={vi.fn()} options={OPTIONS} />,
    )
    const zone = container.querySelector('[data-indicator-zone]') as HTMLElement
    expect(zone.style.backgroundColor).toBe(tint(0.06))
    expect(zone.style.borderLeftColor).toBe(jsdomColor(withAlpha(colors.text, 0.04)))
  })

  it('washes and LIGHTS the selected option row; leaves the others transparent on all four sides', async () => {
    const user = userEvent.setup()
    await open(user)
    const selected = screen.getByRole('menuitemradio', { name: '24' })
    const other = screen.getByRole('menuitemradio', { name: '15' })
    expect(selected.style.backgroundColor).toBe(tint(0.08))
    expect(selected.style.borderLeftColor).toBe(tint(0.18))
    expect(selected.style.borderTopColor).toBe(tint(0.22))
    expect(other.style.backgroundColor).toBe('transparent')
    expect(other.style.borderTopColor).toBe('transparent')
    expect(other.style.borderLeftColor).toBe('transparent')
  })

  /**
   * `Picker.tsx:392-397` states the drift in the source: "The CLOSED state of this same control
   * renders at `fontSize.base`; the open state rendering one point smaller was drift, not
   * design." And `:257-264`: the 70%-alpha copy of `textSecondary` measured 5.00 on the
   * recessed drum against the flat token's 9.03.
   */
  it('renders option labels at the same size as the closed trigger, in the flat token', async () => {
    const user = userEvent.setup()
    await open(user)
    // Scoped to the ROW: the trigger prints the selected label too, so a bare `getByText('24')`
    // matches twice and would silently read the wrong element if it ever matched once.
    const labelOf = (name: string) =>
      screen.getByRole('menuitemradio', { name }).querySelector('[data-option-dot] + span') as HTMLElement
    expect(labelOf('15').style.fontSize).toBe('16px')
    expect(labelOf('15').style.color).toBe(jsdomColor(colors.textSecondary))
    expect(labelOf('24').style.color).toBe(jsdomColor(colors.text))
  })

  it('paints the check pill from the same accent, lit edge included', async () => {
    const user = userEvent.setup()
    await open(user)
    const pill = screen
      .getByRole('menuitemradio', { name: '24' })
      .querySelector('[data-check-pill]') as HTMLElement
    expect(pill.style.backgroundColor).toBe(tint(0.15))
    expect(pill.style.borderLeftColor).toBe(tint(0.2))
    expect(pill.style.borderTopColor).toBe(tint(0.28))
    expect(pill.style.borderRadius).toBe(`${radius.md}px`)
  })

  it('rings the unselected option dot in textSecondary at 20%', async () => {
    const user = userEvent.setup()
    await open(user)
    const dot = screen
      .getByRole('menuitemradio', { name: '15' })
      .querySelector('[data-option-dot]') as HTMLElement
    expect(dot.style.borderColor).toBe(jsdomColor(withAlpha(colors.textSecondary, 0.2)))
  })
})
