import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import Header from '@/components/ui/header'
import { siteConfig } from '@/lib/site-config'

// vitest.setup installs a no-op IntersectionObserver, which never invokes its
// callback — fine for the expanded state, useless for testing the condensed one.
// This captures the callback so a scroll past the sentinel can be simulated.
type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void
let observerCallback: ObserverCallback | null = null
const realObserver = globalThis.IntersectionObserver

class CapturingObserver {
  constructor(callback: ObserverCallback) {
    observerCallback = callback
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

/** Simulate the sentinel scrolling out of view (or back in). */
function setSentinelVisible(visible: boolean) {
  act(() => observerCallback?.([{ isIntersecting: visible }]))
}

beforeEach(() => {
  observerCallback = null
  ;(globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = CapturingObserver
})

afterEach(() => {
  ;(globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = realObserver
})

/** The wordmark's fading wrapper (the element carrying `inert` when condensed). */
const wordmarkGroup = () => screen.getByText(siteConfig.name).parentElement as HTMLElement

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

  it('renders the gold beta CTA separate from the nav links', () => {
    render(<Header />)
    expect(screen.getByRole('link', { name: siteConfig.cta.label })).toHaveAttribute(
      'href',
      siteConfig.cta.href,
    )
  })

  it('exposes a labelled main navigation landmark', () => {
    render(<Header />)
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
  })

  it('renders the wordmark with its technical subline', () => {
    render(<Header />)
    expect(screen.getByText(siteConfig.name)).toBeInTheDocument()
    expect(screen.getByText('CCTV RECOVERY · DOCUMENTED')).toBeInTheDocument()
  })

  it('sticks with NO background, so content scrolls under it', () => {
    const { container } = render(<Header />)
    const header = container.querySelector('header') as HTMLElement
    expect(header.className).toContain('sticky')
    // The design invariant: a background, border, or scrim would draw the hard edge
    // this header exists to avoid. Only the logo and the CTA are opaque.
    expect(header.className).not.toMatch(/\bbg-/)
    expect(header.className).not.toMatch(/\bborder-b/)
  })

  it('condenses to logo + CTA once the header band scrolls out of view', () => {
    render(<Header />)
    expect(wordmarkGroup()).not.toHaveAttribute('inert')

    setSentinelVisible(false)

    // What survives: the logo mark and the beta CTA.
    expect(screen.getByTestId('logo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: siteConfig.cta.label })).toBeInTheDocument()

    // What goes: the wordmark and every nav link — faded AND pulled out of the tab
    // order, since opacity alone would leave invisible links focusable.
    expect(wordmarkGroup()).toHaveClass('opacity-0')
    expect(wordmarkGroup()).toHaveAttribute('inert')
    const navLinkGroup = screen.getByRole('link', { name: siteConfig.nav[0].label })
      .parentElement as HTMLElement
    expect(navLinkGroup).toHaveClass('opacity-0')
    expect(navLinkGroup).toHaveAttribute('inert')
  })

  it('expands again when scrolled back to the top', () => {
    render(<Header />)
    setSentinelVisible(false)
    expect(wordmarkGroup()).toHaveAttribute('inert')

    setSentinelVisible(true)
    expect(wordmarkGroup()).not.toHaveAttribute('inert')
    expect(wordmarkGroup()).not.toHaveClass('opacity-0')
  })
})
