import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NARRATION, MODAL_NARRATION } from '@/features/demo/engine/content/narration'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'

// The sandbox-only boot: no URL modes, no director, no tour chrome. The visitor lands
// on an empty, fully interactive phone with the rail narration following the screen.
describe('DemoExperience (sandbox-only boot)', () => {
  it('boots on the Cases screen with an empty library', () => {
    render(<DemoExperience />)
    expect(screen.getByText(/No cases yet/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: NARRATION.cases.title })).toBeInTheDocument()
  })

  it('the phone is interactive immediately (New case opens the modal)', () => {
    render(<DemoExperience />)
    const screenEl = document.querySelector('[data-phone-screen]') as HTMLElement
    expect(screenEl.style.pointerEvents).not.toBe('none')
    fireEvent.click(screen.getByRole('button', { name: 'New case' }))
    expect(screen.getByText('New Case')).toBeInTheDocument() // the modal shell title
  })

  it('renders no tour chrome: no mode toggle, no step caption, no rail nav', () => {
    render(<DemoExperience />)
    expect(screen.queryByText(/Guided tour/i)).toBeNull()
    expect(screen.queryByText(/Free explore/i)).toBeNull()
    expect(screen.queryByText(/Step \d+ of \d+/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Start the tour' })).toBeNull()
  })

  it('narration follows the screen (Dashboard tab → dashboard narration)', () => {
    render(<DemoExperience />)
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }))
    expect(screen.getByRole('heading', { level: 2, name: NARRATION.dashboard.title })).toBeInTheDocument()
  })

  it('narration follows the open modal (New case → Create a Case copy on the rail)', () => {
    render(<DemoExperience />)
    fireEvent.click(screen.getByRole('button', { name: 'New case' }))
    // the rail shows the modal's own copy, not the underlying Cases screen copy
    expect(screen.getByRole('heading', { level: 2, name: MODAL_NARRATION.newCase!.title })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: NARRATION.cases.title })).toBeNull()
  })

  it('keeps the standing “You’re driving” card and shows the chapter tip', () => {
    render(<DemoExperience />)
    expect(screen.getByText(/You.re driving/)).toBeInTheDocument()
    expect(screen.getByText(NARRATION.cases.tip!)).toBeInTheDocument() // tips are always-on hints now
  })
})
