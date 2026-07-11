import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StoryRail } from '@/features/demo/ui/StoryRail'
import { storyRailProps, makeNarration } from './test-utils'

// Single-mode rail: eyebrow + narration + always-on tip + the standing driving card.
// The tour chrome (mode toggle, dots, step caption, Next/Back) was removed with the tour.
describe('StoryRail', () => {
  it('renders eyebrow/title/paras/bullets for the current chapter', () => {
    render(<StoryRail {...storyRailProps()} />)
    expect(screen.getByText('Secure entry')).toBeInTheDocument()
    expect(screen.getByText('Biometric lock')).toBeInTheDocument()
    expect(screen.getByText(/Every session starts/)).toBeInTheDocument()
    expect(screen.getByText('Face ID gate')).toBeInTheDocument()
  })

  it('renders the tip card whenever the narration has one', () => {
    render(<StoryRail {...storyRailProps()} />)
    expect(screen.getByText('Tap the scanner.')).toBeInTheDocument()
  })

  it('renders no tip card when the narration has none', () => {
    render(<StoryRail {...storyRailProps({ narration: makeNarration({ tip: undefined }) })} />)
    expect(screen.queryByText('Tap the scanner.')).toBeNull()
  })

  it('renders the standing “You’re driving” card', () => {
    render(<StoryRail {...storyRailProps()} />)
    expect(screen.getByText(/You.re driving/)).toBeInTheDocument()
  })

  it('renders the back-to-site link and routes its click through onBackToSite', () => {
    const onBackToSite = vi.fn()
    render(<StoryRail {...storyRailProps({ onBackToSite })} />)
    const link = screen.getByRole('link', { name: /back to site/i })
    expect(link).toHaveAttribute('href', '/')
    fireEvent.click(link)
    expect(onBackToSite).toHaveBeenCalledOnce()
  })

  it('renders the exploration manifest with its rows', () => {
    render(<StoryRail {...storyRailProps()} />)
    expect(screen.getByText(/Exploration manifest/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cases & Locations, visited' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dashboard, not visited yet' })).toBeInTheDocument()
  })

  it('renders the per-screen narration directly beneath the active manifest row', () => {
    const { container } = render(<StoryRail {...storyRailProps()} />)
    const pane = container.querySelector('[data-rail-pane]')
    expect(pane?.previousElementSibling).toBe(
      screen.getByRole('button', { name: 'Cases & Locations, visited' }),
    )
  })

  it('renders no tour chrome (toggle, dots, step caption, Next/Back)', () => {
    render(<StoryRail {...storyRailProps()} />)
    expect(screen.queryByText(/Guided tour/i)).toBeNull()
    expect(screen.queryByText(/Free explore/i)).toBeNull()
    expect(screen.queryByText(/Step \d+ of \d+/)).toBeNull()
    expect(screen.queryByRole('button', { name: /^(Next|Back|Start the tour)$/ })).toBeNull()
  })
})
