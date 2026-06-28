import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StoryRail } from '@/features/demo/ui/StoryRail'
import { storyRailProps } from './test-utils'

describe('StoryRail', () => {
  it('renders eyebrow/title/paras/bullets for the current chapter', () => {
    render(<StoryRail {...storyRailProps()} />)
    expect(screen.getByText('Secure entry')).toBeInTheDocument()
    expect(screen.getByText('Biometric lock')).toBeInTheDocument()
    expect(screen.getByText(/Every session starts/)).toBeInTheDocument()
    expect(screen.getByText('Face ID gate')).toBeInTheDocument()
  })

  it('shows Rail Next/Prev in guided mode', () => {
    render(<StoryRail {...storyRailProps({ mode: 'guided', nextLabel: 'Next' })} />)
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
    expect(screen.getByText('Back')).toBeInTheDocument()
  })

  it('hides the guided Next in sandbox mode (shows the driving callout instead)', () => {
    render(<StoryRail {...storyRailProps({ mode: 'sandbox', nextLabel: 'Next' })} />)
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
    expect(screen.getByText(/You.re driving/)).toBeInTheDocument()
  })

  it('calls onNext when Rail Next is clicked', () => {
    const onNext = vi.fn()
    render(<StoryRail {...storyRailProps({ nextLabel: 'Next', onNext })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(onNext).toHaveBeenCalledOnce()
  })

  it('calls onPrev / onJump / onSetMode from the rail controls', () => {
    const onPrev = vi.fn()
    const onJump = vi.fn()
    const onSetMode = vi.fn()
    render(<StoryRail {...storyRailProps({ canPrev: true, nextLabel: 'Next', onPrev, onJump, onSetMode })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onPrev).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' })) // the inactive progress dot
    expect(onJump).toHaveBeenCalledWith('dashboard')
    fireEvent.click(screen.getByRole('button', { name: 'Free explore' }))
    expect(onSetMode).toHaveBeenCalledWith('sandbox')
  })
})
