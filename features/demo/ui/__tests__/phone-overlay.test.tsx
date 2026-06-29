import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PhoneOverlayContext, PhoneOverlayPortal } from '@/features/demo/ui/phone-overlay'

afterEach(() => vi.unstubAllEnvs())

describe('PhoneOverlayPortal', () => {
  it('portals children into the overlay node when present', () => {
    const overlay = document.createElement('div')
    document.body.appendChild(overlay)
    render(
      <PhoneOverlayContext.Provider value={overlay}>
        <PhoneOverlayPortal>
          <div>ported</div>
        </PhoneOverlayPortal>
      </PhoneOverlayContext.Provider>,
    )
    expect(overlay).toHaveTextContent('ported')
    document.body.removeChild(overlay)
  })

  it('renders inline and warns in development when there is no overlay', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <PhoneOverlayPortal>
        <div>inline</div>
      </PhoneOverlayPortal>,
    )
    expect(screen.getByText('inline')).toBeInTheDocument()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('stays silent in the test/prod env (no overlay)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <PhoneOverlayPortal>
        <div>inline</div>
      </PhoneOverlayPortal>,
    )
    expect(screen.getByText('inline')).toBeInTheDocument()
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
