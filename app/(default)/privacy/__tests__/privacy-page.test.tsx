import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import PrivacyPage from '@/app/(default)/privacy/page'
import { siteConfig } from '@/lib/site-config'

describe('PrivacyPage (Case-File)', () => {
  it('renders the header with the legal-sign-off-pending chip', () => {
    render(<PrivacyPage />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'On your device, under your control.' }),
    ).toBeInTheDocument()
    expect(screen.getByText('ADAPTED FROM APP POLICY — LEGAL SIGN-OFF PENDING')).toBeInTheDocument()
  })

  it('renders the complete network ledger: three NEVER rows + the gold stays-home row', () => {
    render(<PrivacyPage />)
    for (const what of ['Time packets (NTP)', 'Map look-ups', 'Crash reports']) {
      expect(screen.getByText(what)).toBeInTheDocument()
    }
    expect(screen.getAllByText('NEVER')).toHaveLength(3)
    expect(screen.getByText('Everything else')).toBeInTheDocument()
    expect(screen.getByText('STAYS HOME')).toBeInTheDocument()
  })

  it('renders a sticky TOC whose links target the six section ids', () => {
    const { container } = render(<PrivacyPage />)
    const tocLinks = screen.getAllByRole('link', { name: /^0\d / })
    expect(tocLinks).toHaveLength(6)
    for (const link of tocLinks) {
      const target = link.getAttribute('href')!
      expect(target).toMatch(/^#/)
      expect(container.querySelector(target)).not.toBeNull()
    }
  })

  it('keeps each ledger row’s cells co-located — the privacy claim cannot scramble', () => {
    // The ledger is the page's core claim (exactly what leaves the device, when,
    // and what it contains). Label-only assertions would pass a scrambled table.
    render(<PrivacyPage />)
    const ROWS: ReadonlyArray<readonly [string, string, string]> = [
      [
        'Time packets (NTP)',
        'Only when you run a time calibration',
        'A clock query. No identifiers.',
      ],
      [
        'Map look-ups',
        'When you geocode an address or open the case map',
        'The address string you typed. Nothing else.',
      ],
      ['Crash reports', 'If the app crashes', 'Anonymous stack trace. No case content.'],
    ]
    for (const [what, when, contains] of ROWS) {
      const row = screen.getByText(what).closest('[class*="grid-cols"]') as HTMLElement
      expect(row).not.toBeNull()
      expect(within(row).getByText(when)).toBeInTheDocument()
      expect(within(row).getByText(contains)).toBeInTheDocument()
      expect(within(row).getByText('NEVER')).toBeInTheDocument()
    }
    const gold = screen.getByText('Everything else').closest('[class*="grid-cols"]') as HTMLElement
    expect(within(gold).getByText(/Encrypted on-device\. Face ID gated\./)).toBeInTheDocument()
    expect(within(gold).getByText('STAYS HOME')).toBeInTheDocument()
  })

  it('pairs each permission key with its own use description', () => {
    render(<PrivacyPage />)
    const PAIRS: ReadonlyArray<readonly [string, RegExp]> = [
      ['CAMERA', /reading DVR timestamps/],
      ['MICROPHONE', /recording audio notes/],
      ['LOCATION', /pinning sites and GPS-marking cameras/],
      ['FACE ID', /unlocking the app and gating encrypted exports/],
    ]
    for (const [key, use] of PAIRS) {
      const row = screen.getByText(key).closest('div') as HTMLElement
      expect(within(row).getByText(use)).toBeInTheDocument()
    }
  })

  it('uses the configured contact email', () => {
    render(<PrivacyPage />)
    const mail = screen.getByRole('link', { name: siteConfig.contactEmail })
    expect(mail).toHaveAttribute('href', `mailto:${siteConfig.contactEmail}`)
  })
})
