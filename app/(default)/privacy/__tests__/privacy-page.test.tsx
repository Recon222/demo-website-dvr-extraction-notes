import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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

  it('renders the permissions definition list with cyan mono keys', () => {
    render(<PrivacyPage />)
    for (const key of ['CAMERA', 'MICROPHONE', 'LOCATION', 'FACE ID']) {
      expect(screen.getByText(key)).toBeInTheDocument()
    }
  })

  it('uses the configured contact email', () => {
    render(<PrivacyPage />)
    const mail = screen.getByRole('link', { name: siteConfig.contactEmail })
    expect(mail).toHaveAttribute('href', `mailto:${siteConfig.contactEmail}`)
  })
})
