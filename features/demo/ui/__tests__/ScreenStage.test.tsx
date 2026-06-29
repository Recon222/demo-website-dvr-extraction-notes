import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScreenStage } from '@/features/demo/ui/ScreenStage'

// Smoke coverage: the animation itself is jsdom-untestable (no layout), but the children
// pass-through must hold for both drawer states so a regression in the wrapper is caught.
describe('ScreenStage', () => {
  it('renders its children with the drawer closed', () => {
    render(
      <ScreenStage view="cases" direction="none" drawerOpen={false}>
        <div>screen body</div>
      </ScreenStage>,
    )
    expect(screen.getByText('screen body')).toBeInTheDocument()
  })

  it('renders its children with the drawer open (pushed)', () => {
    render(
      <ScreenStage view="submission" direction="forward" drawerOpen>
        <div>pushed body</div>
      </ScreenStage>,
    )
    expect(screen.getByText('pushed body')).toBeInTheDocument()
  })
})
