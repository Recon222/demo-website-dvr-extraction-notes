import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ImportResultBody } from '@/features/demo/ui/screens/ImportResultBody'
import type { ImportedLocationView } from '@/features/demo/ui/screens/importResultData'
import { colors } from '@/features/demo/ui/tokens/palette'
import { withAlpha } from '@/features/demo/ui/tokens/scale'

/** jsdom re-spaces the values it accepts, so every expectation goes through its own writer. */
const cssColor = (value: string): string => {
  const probe = document.createElement('div')
  probe.style.borderTopColor = value
  return probe.style.borderTopColor
}

const view: ImportedLocationView = {
  locId: 'L',
  title: "Kim's Convenience",
  caseNumber: 'PR25-0098213',
  fieldCount: 9,
  timeFrameCount: 1,
  sections: [
    { heading: 'Requesting Officer', rows: [{ label: 'Name', value: 'Det. Liam McHugh' }, { label: 'Badge', value: '4471' }] },
    { heading: 'Recovery Location', rows: [{ label: 'Business', value: "Kim's Convenience" }] },
  ],
  scopes: [{ label: 'Scope 1', range: '2025-03-08 23:45 → 2025-03-09 01:30', isActualTime: false, cameras: 'cameras 3, 4 and 7' }],
  warnings: [{ field: 'badgeNumber', reason: 'Extracted badge "4471"' }],
  isSample: false,
}

describe('ImportResultBody', () => {
  it('renders the header, case number, and stat line', () => {
    render(<ImportResultBody view={view} />)
    expect(screen.getByText('PR25-0098213')).toBeInTheDocument()
    expect(screen.getByText(/9 fields · 1 time range/)).toBeInTheDocument()
  })
  it('renders each section heading and its rows', () => {
    render(<ImportResultBody view={view} />)
    expect(screen.getByText('Requesting Officer')).toBeInTheDocument()
    expect(screen.getByText('Det. Liam McHugh')).toBeInTheDocument()
    expect(screen.getByText('Recovery Location')).toBeInTheDocument()
  })
  it('renders scope rows with the time tag and the canonical range', () => {
    render(<ImportResultBody view={view} />)
    expect(screen.getByText('DVR TIME')).toBeInTheDocument()
    expect(screen.getByText('2025-03-08 23:45 → 2025-03-09 01:30')).toBeInTheDocument()
    expect(screen.getByText('cameras 3, 4 and 7')).toBeInTheDocument()
  })
  it('shows the warnings disclosure with the reasons', () => {
    render(<ImportResultBody view={view} />)
    expect(screen.getByText(/1 automatic adjustment/)).toBeInTheDocument()
    expect(screen.getByText(/Extracted badge/)).toBeInTheDocument()
  })
  it('renders the ACTUAL-TIME badge for a real-time scope', () => {
    render(<ImportResultBody view={{ ...view, scopes: [{ label: 'Scope 1', range: '2025-03-08 23:45', isActualTime: true, cameras: '' }] }} />)
    expect(screen.getByText('ACTUAL TIME')).toBeInTheDocument()
  })

  /**
   * Matrix row 79 — "two chip labels neutralised", and it is a CONTRAST fix, not a palette
   * preference. The phone's `ScopeRow` (`ImportResultBody.tsx:145-159`) records the measurement:
   * those five words "are the ONLY thing in the row that says whether a requested video window is
   * on the DVR's clock or on real time", and painted with `tone` they measured 1.81-1.88:1 (DVR)
   * and 2.09-2.17:1 (ACTUAL) in light, 4.02-4.48:1 for ACTUAL in dark.
   *
   * ADDED AFTER A SURVIVED PROBE. The neutralisation shipped with nothing pinning it: the file's
   * only chip coverage was `getByText('DVR TIME')`, which is green whatever colour the chip is,
   * so re-pointing the label back at `tone` was invisible to the whole suite. That is the
   * change-detector trap in reverse — presence asserted, treatment unasserted.
   */
  it('neutralises the scope-tag LABEL while the tint and border keep the colour coding', () => {
    render(<ImportResultBody view={view} />)
    const dvr = screen.getByText('DVR TIME')
    expect(dvr.style.color).toBe(cssColor(colors.text))
    expect(dvr.style.color).not.toBe(cssColor(colors.warning))
    // The tone survives where the phone kept it: the fill and all four border sides.
    expect(dvr.style.backgroundColor).toBe(cssColor(withAlpha(colors.warning, 0.16)))
    for (const side of ['borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'] as const) {
      expect(dvr.style[side], side).toBe(cssColor(withAlpha(colors.warning, 0.4)))
    }
  })

  it('carries the tone through to the ACTUAL-TIME chip, on the same three channels', () => {
    render(<ImportResultBody view={{ ...view, scopes: [{ label: 'Scope 1', range: '2025-03-08 23:45', isActualTime: true, cameras: '' }] }} />)
    const actual = screen.getByText('ACTUAL TIME')
    expect(actual.style.color).toBe(cssColor(colors.text))
    // `#7fe3b4` was matrix row 79's "fourth green"; the chip must not paint a green LABEL again.
    expect(actual.style.color).not.toBe(cssColor(colors.success))
    expect(actual.style.backgroundColor).toBe(cssColor(withAlpha(colors.success, 0.16)))
    expect(actual.style.borderTopColor).toBe(cssColor(withAlpha(colors.success, 0.4)))
  })
})
