import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

import { CoordinateDisplay, COPY_LABELS } from '@/features/demo/ui/inputs/CoordinateDisplay'
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
