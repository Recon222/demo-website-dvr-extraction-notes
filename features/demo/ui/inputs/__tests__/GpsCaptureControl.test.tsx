import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

import { GPS_CONFIG_STATIC, buildGpsConfig } from '@/features/demo/engine/logic/gps'
import type { GeolocationLike } from '@/features/demo/ui/inputs/capture-gps'
import { GpsCaptureControl } from '@/features/demo/ui/inputs/GpsCaptureControl'

const position = (accuracy: number) =>
  ({
    coords: { latitude: 43.6, longitude: -79.65, accuracy, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
    timestamp: Date.UTC(2026, 6, 30, 12, 0, 0),
  }) as GeolocationPosition

function renderControl(o: { geolocation: GeolocationLike; config?: ReturnType<typeof buildGpsConfig> }) {
  return render(
    <GpsCaptureControl
      config={o.config}
      onCapture={vi.fn()}
      geocodeEnabled
      onToggleGeocode={vi.fn()}
      deps={{ geolocation: o.geolocation, delay: async () => undefined }}
    />,
  )
}

describe('GpsCaptureControl — sample readout denominator (R-10)', () => {
  it('reports the ceiling the capture loop actually uses, not a second hardcoded default', async () => {
    // The default config's ceiling is GPS_CONFIG_STATIC.maxAttempts; the readout must track it
    // rather than a literal that silently drifts if the constant changes.
    let deliver!: (p: GeolocationPosition) => void
    const held: GeolocationLike = { getCurrentPosition: (onSuccess) => { deliver = onSuccess } }
    renderControl({ geolocation: held })

    fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }))
    await act(async () => {
      deliver(position(90)) // worse than the 50m balanced target: the loop keeps going
    })

    expect(screen.getByTestId('gps-capture-progress')).toHaveTextContent(
      `Sample 1 of ${GPS_CONFIG_STATIC.maxAttempts} · best ±90m`,
    )
  })

  it('follows a caller-supplied ceiling (P3.7 mounts its own config)', async () => {
    let deliver!: (p: GeolocationPosition) => void
    const held: GeolocationLike = { getCurrentPosition: (onSuccess) => { deliver = onSuccess } }
    renderControl({ geolocation: held, config: { ...buildGpsConfig('precise'), maxAttempts: 4 } })

    fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }))
    await act(async () => {
      deliver(position(60))
    })

    expect(screen.getByTestId('gps-capture-progress')).toHaveTextContent('Sample 1 of 4 · best ±60m')
  })
})
