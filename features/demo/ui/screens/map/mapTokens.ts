import type { LocationMapStatus } from '@/features/demo/engine/store/selectors'

/**
 * Map pin + sheet colours, lifted verbatim from the phone's `map-view` constants so the demo reads
 * identically. Location pins are coloured by derived status; the incident is the red marker.
 */
export const MAP_PIN_COLORS: Record<LocationMapStatus | 'incident', string> = {
  started: '#FF9500',
  working: '#00BFFF',
  complete: '#34C759',
  incident: '#e53935',
}

export const STATUS_LABEL: Record<LocationMapStatus, string> = {
  started: 'Started',
  working: 'Working',
  complete: 'Complete',
}

/** Always-dark "glass" surface tokens for the bottom sheet (the satellite tiles are dark). */
export const SHEET_COLORS = {
  background: 'rgb(10, 22, 36)',
  border: 'rgba(30, 58, 95, 0.55)',
  handle: 'rgba(255, 255, 255, 0.20)',
  divider: 'rgba(30, 58, 95, 0.50)',
  rowBg: 'rgba(19, 34, 54, 0.78)',
  rowBorder: 'rgba(30, 58, 95, 0.45)',
  infoBg: 'rgba(255, 255, 255, 0.04)',
  text: '#e7eef6',
  textDim: '#9fb6d0',
  textFaint: '#7a9fc4',
  accent: '#1a8fc2',
} as const
