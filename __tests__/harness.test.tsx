import { useState } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Harness validation: proves the full unit/component testing stack is wired up
// correctly — Vitest runner, jsdom environment, React Testing Library render,
// user-event interaction, and jest-dom matchers. The component below is inline
// and exists only to exercise the stack; it is not production code.
function Toggle() {
  const [on, setOn] = useState(false)
  return <button onClick={() => setOn((value) => !value)}>{on ? 'on' : 'off'}</button>
}

describe('test harness', () => {
  it('evaluates pure assertions', () => {
    expect(1 + 1).toBe(2)
  })

  it('renders and interacts with a component (jsdom + RTL + user-event + jest-dom)', async () => {
    render(<Toggle />)

    const button = screen.getByRole('button', { name: 'off' })
    expect(button).toBeInTheDocument()

    await userEvent.click(button)

    expect(screen.getByRole('button', { name: 'on' })).toBeInTheDocument()
  })
})
