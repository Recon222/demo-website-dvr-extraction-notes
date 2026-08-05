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

/** The header element itself — it carries the fade and `inert` as a whole. */
const header = () => document.querySelector('header') as HTMLElement

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

  // The whole header fades, logo and CTA included. An earlier pass kept those two
  // pinned so the beta ask stayed reachable; two elements floating over the content
  // read worse than they were worth, and the page carries its own CTA at the foot.
  it('fades the ENTIRE header out once the header band scrolls out of view', () => {
    render(<Header />)
    expect(header()).not.toHaveAttribute('inert')

    setSentinelVisible(false)

    expect(header()).toHaveClass('opacity-0')
    // inert, not opacity alone: the logo, four nav links and the CTA would otherwise
    // stay focusable and in the a11y tree while invisible over the content.
    expect(header()).toHaveAttribute('inert')
    // Nothing is exempted from the fade — both were, before.
    expect(header()).toContainElement(screen.getByTestId('logo'))
    expect(header()).toContainElement(screen.getByRole('link', { name: siteConfig.cta.label }))
  })

  it('fades back in when scrolled to the top', () => {
    render(<Header />)
    setSentinelVisible(false)
    expect(header()).toHaveAttribute('inert')

    setSentinelVisible(true)
    expect(header()).not.toHaveAttribute('inert')
    expect(header()).not.toHaveClass('opacity-0')
  })
})
