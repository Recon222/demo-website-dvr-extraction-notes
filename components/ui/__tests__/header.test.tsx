import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Header from '@/components/ui/header'
import { siteConfig } from '@/lib/site-config'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))
vi.mock('@/components/ui/logo', () => ({ default: () => <div data-testid="logo" /> }))

describe('Header', () => {
  it('renders the logo', () => {
    render(<Header />)
    expect(screen.getByTestId('logo')).toBeInTheDocument()
  })

  it('renders a link for every nav item in siteConfig', () => {
    render(<Header />)
    for (const item of siteConfig.nav) {
      expect(screen.getByRole('link', { name: item.label })).toHaveAttribute('href', item.href)
    }
  })

  it('no longer shows the template auth links', () => {
    render(<Header />)
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument()
    expect(screen.queryByText('Register')).not.toBeInTheDocument()
  })
})
