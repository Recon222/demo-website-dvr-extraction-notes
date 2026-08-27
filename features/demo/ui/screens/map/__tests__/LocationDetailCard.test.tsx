import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocationDetailCard, cameraCountLabel, MAP_CONTACT_ROW } from '@/features/demo/ui/screens/map/LocationDetailCard'
import { cameraMarker, sheetIncident, sheetLocation } from '@/features/demo/ui/screens/map/__tests__/test-utils'
import { glassCard, glassCardNested } from '@/features/demo/ui/glass-tokens'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { MAP_PIN_COLORS } from '@/features/demo/ui/screens/map/mapTokens'
import { GLASS_TIER } from '@/features/demo/ui/tokens/glass-tiers'
import { colors, scheme } from '@/features/demo/ui/tokens/palette'
import { radius, touchTarget } from '@/features/demo/ui/tokens/scale'
import { severityTone, STATUS_SEVERITY } from '@/features/demo/ui/tokens/status'

const fullLoc = sheetLocation({
  businessName: 'Kim Convenience', address: '1450 Eglinton, Mississauga',
  status: 'working', coord: [-79.61, 43.61], streetAddress: '1450 Eglinton', city: 'Mississauga',
  requesterName: 'Liam McHugh', requesterBadge: '4471', requesterUnit: 'Central Robbery', requesterPhone: '905-555-1234', requesterEmail: 'det@peel.ca',
  locationContact: 'Sandeep Gill', locationPhone: '905-555-0142',
})
const bareLoc = sheetLocation({ ...fullLoc, id: 'l2', requesterName: '', requesterBadge: '', requesterUnit: '', requesterPhone: '', requesterEmail: '', locationContact: '', locationPhone: '' })
const incItem = sheetIncident({ displayName: 'Kim B&E', businessName: 'Kim', streetAddress: '1450 Eglinton', city: 'Mississauga', address: '1450 Eglinton, Mississauga' })

const cb = () => ({ onBack: vi.fn(), onCall: vi.fn(), onEmail: vi.fn(), onGoToLocation: vi.fn(), onEditIncident: vi.fn() })

describe('LocationDetailCard', () => {
  it('location variant renders requester + contact and fires call/email/go-to', () => {
    const c = cb()
    render(<LocationDetailCard item={fullLoc} {...c} />)
    expect(screen.getByText(/Liam McHugh/)).toBeInTheDocument()
    expect(screen.getByText('Central Robbery')).toBeInTheDocument()
    expect(screen.getByText('Sandeep Gill')).toBeInTheDocument()
    fireEvent.click(screen.getByText('905-555-1234'))
    expect(c.onCall).toHaveBeenCalledWith('905-555-1234')
    fireEvent.click(screen.getByText('det@peel.ca'))
    expect(c.onEmail).toHaveBeenCalledWith('det@peel.ca')
    fireEvent.click(screen.getByText('905-555-0142'))
    expect(c.onCall).toHaveBeenCalledWith('905-555-0142')
    fireEvent.click(screen.getByText('Go to Location'))
    expect(c.onGoToLocation).toHaveBeenCalledWith('l1')
  })

  it('hides the requester and contact cards when those fields are empty', () => {
    render(<LocationDetailCard item={bareLoc} {...cb()} />)
    expect(screen.queryByText('Requester')).not.toBeInTheDocument()
    expect(screen.queryByText('Contact')).not.toBeInTheDocument()
  })

  it('incident variant shows the headline + Incident chip and no Go to Location', () => {
    render(<LocationDetailCard item={incItem} {...cb()} />)
    expect(screen.getByText('Kim B&E')).toBeInTheDocument()
    expect(screen.getByText('Incident')).toBeInTheDocument()
    expect(screen.queryByText('Go to Location')).not.toBeInTheDocument()
  })

  // Matrix row 22's sole delta: the incident card is the ONLY entry to the incident editor
  // (row 23). Without this button the modal is unreachable.
  it('incident variant offers Edit Incident Location, firing with the case id', () => {
    const c = cb()
    render(<LocationDetailCard item={incItem} {...c} />)
    fireEvent.click(screen.getByText('Edit Incident Location'))
    expect(c.onEditIncident).toHaveBeenCalledWith('c1')
  })

  it('does NOT offer Edit Incident Location on a recovery location', () => {
    render(<LocationDetailCard item={fullLoc} {...cb()} />)
    expect(screen.queryByText('Edit Incident Location')).not.toBeInTheDocument()
  })

  it('back fires onBack', () => {
    const c = cb()
    render(<LocationDetailCard item={fullLoc} {...c} />)
    fireEvent.click(screen.getByText(/All Locations/))
    expect(c.onBack).toHaveBeenCalled()
  })
})

// ---- cameras toggle (P6.1) ------------------------------------------------------------------
describe('LocationDetailCard — cameras toggle', () => {
  const cam = (id: string, cameraName: string) => cameraMarker({ id, cameraName })
  const withCameras = sheetLocation({ ...fullLoc, cameras: [cam('l1:c1', 'Front'), cam('l1:c2', 'Rear')] })

  it('is absent when the location has no geolocated cameras', () => {
    render(<LocationDetailCard item={fullLoc} {...cb()} cameras={{ shown: false, onToggle: vi.fn() }} />)
    expect(screen.queryByTestId('detail-cameras-toggle')).not.toBeInTheDocument()
  })

  it('is absent when no handler can act on it — never a button that swallows the press', () => {
    render(<LocationDetailCard item={withCameras} {...cb()} />)
    expect(screen.queryByTestId('detail-cameras-toggle')).not.toBeInTheDocument()
  })

  it('cannot be shown without a way to hide it — the two are ONE prop (review R-16)', () => {
    // `{ shown, onToggle }` is a single object, so `shown: true` with no handler is
    // unrepresentable; omitting the object hides the row entirely.
    render(<LocationDetailCard item={withCameras} {...cb()} />)
    expect(screen.queryByTestId('detail-cameras-toggle')).not.toBeInTheDocument()
  })

  it('offers "Show cameras (N)" while hidden, with the phone accessibility label', () => {
    render(<LocationDetailCard item={withCameras} {...cb()} cameras={{ shown: false, onToggle: vi.fn() }} />)
    const toggle = screen.getByTestId('detail-cameras-toggle')
    expect(toggle).toHaveTextContent('Show cameras (2)')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(toggle).toHaveAccessibleName('Show 2 cameras on the map')
  })

  it('flips to "Hide cameras (N)" when shown', () => {
    render(<LocationDetailCard item={withCameras} {...cb()} cameras={{ shown: true, onToggle: vi.fn() }} />)
    const toggle = screen.getByTestId('detail-cameras-toggle')
    expect(toggle).toHaveTextContent('Hide cameras (2)')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(toggle).toHaveAccessibleName('Hide 2 cameras on the map')
  })

  it('singularises a lone camera in the accessibility label', () => {
    render(<LocationDetailCard item={sheetLocation({ ...fullLoc, cameras: [cam('l1:c1', 'Front')] })} {...cb()} cameras={{ shown: false, onToggle: vi.fn() }} />)
    expect(screen.getByTestId('detail-cameras-toggle')).toHaveAccessibleName('Show 1 camera on the map')
  })

  it('fires the toggle', () => {
    const onToggleCameras = vi.fn()
    render(<LocationDetailCard item={withCameras} {...cb()} cameras={{ shown: false, onToggle: onToggleCameras }} />)
    fireEvent.click(screen.getByTestId('detail-cameras-toggle'))
    expect(onToggleCameras).toHaveBeenCalledTimes(1)
  })

  it('never appears on the incident variant', () => {
    render(<LocationDetailCard item={incItem} {...cb()} cameras={{ shown: true, onToggle: vi.fn() }} />)
    expect(screen.queryByTestId('detail-cameras-toggle')).not.toBeInTheDocument()
  })
})

// ---- partial camera results (review R-19) ---------------------------------------------------
describe('LocationDetailCard — cameras without a GPS fix are counted, not hidden', () => {
  const cam = (id: string, cameraName: string) => cameraMarker({ id, cameraName })

  it('reads "N of M" when the wizard lists more cameras than the map can plot', () => {
    const item = sheetLocation({ ...fullLoc, cameras: [cam('l1:c1', 'Front'), cam('l1:c2', 'Till')], cameraTotal: 5 })
    render(<LocationDetailCard item={item} {...cb()} cameras={{ shown: false, onToggle: vi.fn() }} />)
    const toggle = screen.getByTestId('detail-cameras-toggle')
    expect(toggle).toHaveTextContent('Show cameras (2 of 5)')
    expect(toggle).toHaveAccessibleName('Show 2 cameras on the map (3 without a GPS fix)')
  })

  it('stays a plain count when every camera plots', () => {
    const item = sheetLocation({ ...fullLoc, cameras: [cam('l1:c1', 'Front'), cam('l1:c2', 'Till')] })
    render(<LocationDetailCard item={item} {...cb()} cameras={{ shown: false, onToggle: vi.fn() }} />)
    expect(screen.getByTestId('detail-cameras-toggle')).toHaveTextContent('Show cameras (2)')
  })

  it('formats the label directly', () => {
    expect(cameraCountLabel(2, 5)).toBe('2 of 5')
    expect(cameraCountLabel(2, 2)).toBe('2')
    // Never invent a bigger denominator than the numerator.
    expect(cameraCountLabel(3, 2)).toBe('3')
  })
})

// ---- U5.4 — surfaces (matrix rows 21/22; A55, A70, A68) --------------------------------------
describe('LocationDetailCard — surfaces', () => {
  /** jsdom rewrites an inline hex to `rgb(r, g, b)` and re-spaces `rgba(...)` on read-back. */
  const hexToJsdomRgb = (hex: string) =>
    `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`
  const respace = (value: string) => value.replace(/,(?=\S)/g, ', ')
  /** Both rewrites at once, for a gradient whose stops are hexes. */
  const norm = (value: string) => respace(value).replace(/#[0-9a-f]{6}/gi, hexToJsdomRgb)

  // A55. Phone `LocationDetailCard.tsx:323`, `:509`, `:595-597`, `:664-666`, `:749-751` — every
  // content card is `<Card glass glassVariant="nestedCard">`, which U5.1's R2 established as the
  // tier the map sheet's INFO cards take while its ROWS take `card`. Per side, because a
  // `border`/`borderColor` written after the fragment spread erases the lit edge silently.
  it('paints every info card on the nested tier, lit edge intact (A55)', () => {
    render(<LocationDetailCard item={fullLoc} {...cb()} />)
    const cards = [screen.getByTestId('detail-requester-card'), screen.getByTestId('detail-contact-card')]
    const side = respace(glassCardNested.borderRightColor)
    for (const card of cards) {
      expect(card.style.borderRightColor).toBe(side)
      expect(card.style.borderBottomColor).toBe(side)
      expect(card.style.borderLeftColor).toBe(side)
      expect(card.style.borderTopColor).toBe(respace(glassCardNested.borderTopColor))
      expect(card.style.borderTopColor).not.toBe(side)
      expect(card.getAttribute('style')).not.toMatch(/(^|;)\s*border(-color)?:/)
    }
    // The two tiers must not collapse into one another — U5.1's R2 in DOM form.
    expect(glassCardNested.background).not.toBe(glassCard.background)
    expect(cards[0].style.backgroundImage).not.toBe(respace(glassCard.background))
  })

  // A70 + phone `:493-505`. The badge is the severity trio plus a dot on the FOREGROUND token; it
  // was `${color}25` behind bare `PIN_COLORS` text.
  it('paints the status badge from the severity trio, not the tile pins (A70)', () => {
    render(<LocationDetailCard item={sheetLocation({ ...fullLoc, status: 'working' })} {...cb()} />)
    const badge = screen.getByTestId('detail-status-badge')
    const tone = severityTone(STATUS_SEVERITY.working)
    expect(badge.style.background).toBe(hexToJsdomRgb(tone.background))
    expect(badge.style.borderColor).toBe(hexToJsdomRgb(tone.borderColor))
    expect(badge.style.color).toBe(hexToJsdomRgb(tone.color))
    expect(badge.style.background).not.toBe(hexToJsdomRgb(MAP_PIN_COLORS.working))
    expect(screen.getByTestId('detail-status-dot').style.background).toBe(hexToJsdomRgb(tone.color))
  })

  it('fills the incident type chip from the error pair (A70)', () => {
    render(<LocationDetailCard item={incItem} {...cb()} />)
    const chip = screen.getByTestId('detail-type-chip')
    const tone = severityTone(STATUS_SEVERITY.incident)
    expect(chip.style.background).toBe(hexToJsdomRgb(tone.background))
    expect(chip.style.color).toBe(hexToJsdomRgb(tone.color))
    expect(chip.style.color).not.toBe(hexToJsdomRgb(MAP_PIN_COLORS.incident))
  })

  // A68 + PR #127 `e882912f`: no `size="large"` anywhere in the map view, and both CTAs are the
  // shared `<Button variant="primary" fullWidth>` (phone `:367-375`, `:797-808`). The hand-rolled
  // `linear-gradient(135deg,#1a8fc2,#0f6f9e)` was duplicated verbatim in two files.
  it.each([
    ['location', fullLoc, 'Go to Location'],
    ['incident', incItem, 'Edit Incident Location'],
  ] as const)('drives the %s CTA from buttonStyle at medium (A68)', (_kind, item, label) => {
    render(<LocationDetailCard item={item} {...cb()} />)
    const cta = screen.getByText(label)
    const primary = buttonStyle({ variant: 'primary' })
    expect(cta.style.backgroundImage).toBe(norm(primary.background as string))
    expect(cta.style.borderRadius).toBe(`${radius.control}px`)
    expect(cta.style.minHeight).toBe(`${touchTarget.comfortable}px`)
    expect(cta.style.backgroundImage).not.toContain('135deg')
  })

  // Phone `:256-268` — "A ghost <Button> rather than the hand-rolled tinted pill it replaces:
  // that pill was one of six local button implementations on this screen".
  it('drives the back affordance from the ghost variant (A64/A65)', () => {
    render(<LocationDetailCard item={fullLoc} {...cb()} />)
    const back = screen.getByTestId('detail-back-button')
    expect(back.style.background).toBe('transparent')
    expect(back.style.color).toBe(hexToJsdomRgb(colors.link))
    expect(back).toHaveAccessibleName('Back to all locations')
  })

  // Phone `:563-571`: "Active state switches the glass tier rather than overriding the card's
  // border: `elevated` is the variant whose border is already primary-tinted, so 'on' reads
  // brighter and bluer without a one-off colour." The demo had `rgba(43,140,193,0.5)`/`0.12`.
  it('switches the cameras toggle between the nested and elevated TIERS, not a one-off tint', () => {
    const withCameras = sheetLocation({ ...fullLoc, cameras: [cameraMarker({ id: 'l1:c1' })] })
    const { unmount } = render(<LocationDetailCard item={withCameras} {...cb()} cameras={{ shown: false, onToggle: vi.fn() }} />)
    const off = screen.getByTestId('detail-cameras-toggle')
    expect(off.style.borderRightColor).toBe(respace(GLASS_TIER[scheme].nestedCard.border))
    unmount()
    render(<LocationDetailCard item={withCameras} {...cb()} cameras={{ shown: true, onToggle: vi.fn() }} />)
    const on = screen.getByTestId('detail-cameras-toggle')
    expect(on.style.borderRightColor).toBe(respace(GLASS_TIER[scheme].elevated.border))
    // The lit edge moves with the tier rather than being erased by a shorthand.
    expect(on.style.borderTopColor).toBe(respace(GLASS_TIER[scheme].elevated.highlightTop))
    expect(on.getAttribute('style')).not.toMatch(/(^|;)\s*border(-color)?:/)
  })

  // The tappable contact rows. NOT `PIN_COLORS.working` (#00BFFF, a satellite-tile mark) and
  // NOT the phone's own `colors.primary` (`:713-716`, `:735-738`, `:786-789`) — W3/F52 measured
  // that at 2.88:1 on this ground, below WCAG 1.4.3's 4.5 and below even the #00BFFF it
  // replaced. See `MAP_CONTACT_ROW`'s docblock for the divergence.
  //
  // The RENDER half of the two-sided pin: this ties the DOM to the constant, and
  // `palette-contrast.test.ts`'s rows 46+47 tie the constant to the ratio. Neither alone
  // survives the edit it exists to catch (W2/F27).
  it('paints the tap-to-call/email rows from the exported contact-row constant', () => {
    render(<LocationDetailCard item={fullLoc} {...cb()} />)
    const phone = screen.getByText('905-555-1234')
    expect(phone.style.color).toBe(hexToJsdomRgb(MAP_CONTACT_ROW.color))
    expect(phone.style.color).not.toBe(hexToJsdomRgb(MAP_PIN_COLORS.working))
    expect(phone.style.color).not.toBe(hexToJsdomRgb(colors.primary))
  })

  // Phone `:987-996`: "Uppercase micro-label ... On `textSecondary`, not `textTertiary`: the
  // tertiary token is a documented sub-AA ceiling (M2b) and these labels are read, not skimmed."
  it('lifts the card micro-labels off textTertiary (M2b)', () => {
    render(<LocationDetailCard item={fullLoc} {...cb()} />)
    const label = screen.getByText('Requester')
    expect(label.style.color).toBe(hexToJsdomRgb(colors.textSecondary))
    expect(label.style.color).not.toBe(hexToJsdomRgb(colors.textTertiary))
    expect(label.style.fontSize).toBe('12px')
  })
})
