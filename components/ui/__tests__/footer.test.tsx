import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import Footer from '@/components/ui/footer'
import { siteConfig } from '@/lib/site-config'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))
vi.mock('@/components/ui/logo', () => ({ default: () => <div data-testid="logo" /> }))

describe('Footer (Case-File)', () => {
  it('renders the FVA copyright line with the product name', () => {
    render(<Footer />)
    expect(
      screen.getByText(new RegExp(`© \\d{4} FVA Development · ${siteConfig.name}`)),
    ).toBeInTheDocument()
  })

  it('renders the center links: Features, Live demo, Join the beta, Privacy', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: 'Features' })).toHaveAttribute('href', '/#features')
    expect(screen.getByRole('link', { name: 'Live demo' })).toHaveAttribute('href', '/demo')
    expect(screen.getByRole('link', { name: 'Join the beta' })).toHaveAttribute('href', '/beta')
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy')
  })

  it('renders the technical trust label', () => {
    render(<Footer />)
    expect(screen.getByText('ON-DEVICE · NTP-CALIBRATED · ENCRYPTED')).toBeInTheDocument()
  })

  it('no longer ships the template footer illustration', () => {
    const source = readFileSync(join(process.cwd(), 'components', 'ui', 'footer.tsx'), 'utf8')
    expect(source).not.toMatch(/footer-illustration/)
  })
})
