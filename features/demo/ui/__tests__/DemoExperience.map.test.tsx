import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createDemoStore } from '@/features/demo/engine/store/create-store'

const { searchParams } = vi.hoisted(() => ({
  searchParams: { get: vi.fn<(k: string) => string | null>(() => null) },
}))
vi.mock('next/navigation', () => ({ useSearchParams: () => searchParams }))
vi.mock('@/features/demo/engine/director/runner', () => ({
  runBeat: vi.fn(() => ({ cancel: vi.fn(), done: Promise.resolve(undefined), warnings: [], degraded: false })),
  realClock: {},
}))

import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import { MAP_NARRATION } from '@/features/demo/engine/content/narration'

beforeEach(() => {
  searchParams.get.mockReset()
  searchParams.get.mockImplementation((k) => (k === 'mode' ? 'sandbox' : null)) // interactive sandbox
})

describe('DemoExperience — Map tab', () => {
  it('clicking the Map tab opens the Map screen', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    fireEvent.click(screen.getByLabelText('Map'))
    expect(document.querySelector('[data-map-screen]')).toBeInTheDocument()
  })

  it('shows the map narration on the rail (not a wizard chapter)', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    fireEvent.click(screen.getByLabelText('Map'))
    expect(screen.getByText(MAP_NARRATION.title)).toBeInTheDocument()
  })

  it('keeps the tab bar visible on the map view', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    fireEvent.click(screen.getByLabelText('Map'))
    expect(screen.getByLabelText('Map')).toBeInTheDocument()
  })
})
