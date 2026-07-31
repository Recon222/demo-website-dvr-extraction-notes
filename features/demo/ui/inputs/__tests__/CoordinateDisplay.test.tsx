import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

import { CoordinateDisplay, COPY_LABELS, COPY_RESET_MS } from '@/features/demo/ui/inputs/CoordinateDisplay'
import { pickFromReverseFeature } from '@/features/demo/ui/inputs/reverse-geocode'

describe('CoordinateDisplay', () => {
  it('renders 6-decimal coordinates and the full metadata row', () => {
    render(<CoordinateDisplay lat={43.6} lng={-79.65} accuracyM={3.4} source="gps" />)

    expect(screen.getByTestId('coordinate-display-coords')).toHaveTextContent('43.600000, -79.650000')
    expect(screen.getByTestId('coordinate-display-accuracy')).toHaveTextContent('±3m')
    expect(screen.getByTestId('coordinate-display-source')).toHaveTextContent('GPS')
    expect(screen.getByTestId('coordinate-display-rating')).toHaveTextContent('Excellent')
  })

  it('colours accuracy and rating together by tone', () => {
    render(<CoordinateDisplay lat={0} lng={0} accuracyM={40} source="gps" />)
    const accuracy = screen.getByTestId('coordinate-display-accuracy')
    const rating = screen.getByTestId('coordinate-display-rating')

    expect(rating).toHaveTextContent('Poor')
    expect(accuracy.style.color).toBe(rating.style.color)
    expect(accuracy.style.color).toBe('rgb(255, 71, 87)')
  })

  it('omits the accuracy and rating when no accuracy was measured', () => {
    render(<CoordinateDisplay lat={43.6} lng={-79.65} source="geocoded" />)

    expect(screen.getByTestId('coordinate-display-source')).toHaveTextContent('Geocoded')
    expect(screen.queryByTestId('coordinate-display-accuracy')).not.toBeInTheDocument()
    expect(screen.queryByTestId('coordinate-display-rating')).not.toBeInTheDocument()
  })

  it('exposes accuracy, rating and provenance in the accessible name (R-6)', () => {
    // `button` descendants are children-presentational and aria-label overrides the name
    // computation, so the metadata spans alone are inaudible. The name must carry them.
    render(<CoordinateDisplay lat={43.6} lng={-79.65} accuracyM={7} source="gps" />)

    expect(screen.getByRole('button')).toHaveAccessibleName(
      'GPS coordinates: 43.600000, -79.650000. accuracy ±7m, Good. source GPS. Copy to clipboard.',
    )
  })

  it('omits the accuracy clause from the name when nothing measured one', () => {
    render(<CoordinateDisplay lat={43.6} lng={-79.65} source="geocoded" />)

    expect(screen.getByRole('button')).toHaveAccessibleName(
      'GPS coordinates: 43.600000, -79.650000. source Geocoded. Copy to clipboard.',
    )
  })

  it('renders the copy live region OUTSIDE the button so AT can announce it (R-6)', async () => {
    const writeClipboard = vi.fn(async () => {
      throw new Error('clipboard blocked')
    })
    render(<CoordinateDisplay lat={43.6} lng={-79.65} writeClipboard={writeClipboard} />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('coordinate-display'))
    })

    const status = screen.getByTestId('coordinate-display-copy-status')
    expect(status).toHaveAttribute('role', 'status')
    expect(screen.getByTestId('coordinate-display').contains(status)).toBe(false)
  })

  it('copies the coordinate pair and confirms', async () => {
    const writeClipboard = vi.fn(async () => undefined)
    render(<CoordinateDisplay lat={43.6} lng={-79.65} accuracyM={3} source="gps" writeClipboard={writeClipboard} />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('coordinate-display'))
    })

    expect(writeClipboard).toHaveBeenCalledWith('43.600000, -79.650000')
    expect(screen.getByRole('status')).toHaveTextContent(COPY_LABELS.success)
  })

  it('says the copy failed rather than showing a false confirmation', async () => {
    const writeClipboard = vi.fn(async () => {
      throw new Error('clipboard blocked')
    })
    render(<CoordinateDisplay lat={43.6} lng={-79.65} writeClipboard={writeClipboard} />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('coordinate-display'))
    })

    expect(screen.getByRole('status')).toHaveTextContent(COPY_LABELS.failure)
  })
})

describe('CoordinateDisplay — copy confirmation resets (R-31)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns to idle after the reset window instead of claiming "Copied" forever', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<CoordinateDisplay lat={43.6} lng={-79.65} writeClipboard={async () => undefined} />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('coordinate-display'))
    })
    expect(screen.getByRole('status')).toHaveTextContent(COPY_LABELS.success)

    await act(async () => {
      vi.advanceTimersByTime(COPY_RESET_MS)
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('a second copy is not cut short by the first copy\'s timer', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<CoordinateDisplay lat={43.6} lng={-79.65} writeClipboard={async () => undefined} />)
    const card = screen.getByTestId('coordinate-display')

    await act(async () => {
      fireEvent.click(card)
    })
    await act(async () => {
      vi.advanceTimersByTime(COPY_RESET_MS - 200) // nearly expired
    })
    await act(async () => {
      fireEvent.click(card) // re-arm
    })
    await act(async () => {
      vi.advanceTimersByTime(300) // the FIRST timer's deadline passes here
    })

    // Untracked, the stale timer would have wiped this confirmation mid-display.
    expect(screen.getByRole('status')).toHaveTextContent(COPY_LABELS.success)
  })

  it('clears its timer on unmount', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout')
    const { unmount } = render(<CoordinateDisplay lat={43.6} lng={-79.65} writeClipboard={async () => undefined} />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('coordinate-display'))
    })
    unmount()

    expect(clearSpy).toHaveBeenCalled()
    clearSpy.mockRestore()
  })
})

describe('pickFromReverseFeature', () => {
  it('extracts street + city from the v6 context (phone transformReverseResult)', () => {
    expect(
      pickFromReverseFeature({
        properties: { context: { address: { name: '1450 Eglinton Ave W' }, place: { name: 'Mississauga' } } },
      }),
    ).toEqual({ streetAddress: '1450 Eglinton Ave W', city: 'Mississauga' })
  })

  it('returns null for a feature with nothing usable, so a typed address is never blanked', () => {
    expect(pickFromReverseFeature({ properties: { context: {} } })).toBeNull()
    expect(pickFromReverseFeature({})).toBeNull()
    expect(pickFromReverseFeature(undefined)).toBeNull()
  })
})
