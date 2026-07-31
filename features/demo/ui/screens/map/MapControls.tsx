'use client'

import type { CSSProperties } from 'react'
import type { LocationMapStatus } from '@/features/demo/engine/store/selectors'
import {
  MAP_GLASS_COLORS,
  MAP_PIN_COLORS,
  PROXIMITY_COLORS,
  PROXIMITY_PRESETS,
  STATUS_LABEL,
  type RadiusPreset,
} from '@/features/demo/ui/screens/map/mapTokens'
import { MAP_FILTER_STATUSES, type MapFilterState } from '@/features/demo/ui/screens/map/mapFilters'

/**
 * The floating pill overlay over the map — port of the phone's `MapControls.tsx`: three stacked
 * rows (status filters + count · search + clear · proximity + radius presets), each pill its own
 * translucent glass so map tiles show through, and the container transparent so map drags pass
 * between the pills (the phone's `pointerEvents="box-none"`; here `pointerEvents: 'none'` on the
 * container with `'auto'` restored per pill).
 *
 * Every label, aria-label and testid is lifted verbatim from the phone (`MapControls.tsx:111-303`,
 * cross-checked against ui-mapping 03:112-134).
 *
 * Presentational: state in via props, intent out via callbacks. Only DARK glass — the demo's
 * phone frame has no theme switch, unlike the phone's `isDark` prop.
 */

export interface MapControlsProps {
  filters: MapFilterState
  onToggleStatus(status: LocationMapStatus): void
  onSearchChange(text: string): void
  onClearFilters(): void
  activeFilterCount: number
  proximityActive: boolean
  proximityRadius: RadiusPreset
  onProximityToggle(): void
  onRadiusChange(radius: RadiusPreset): void
  /** Plottable locations before proximity narrowing — the "of M" half of the badge. */
  locationCount: number
  /** Locations actually on screen — the "N" half. */
  filteredCount: number
}

/**
 * The container clears the "Change Case" pill (top: 58, right: 12 in `MapScreen`) instead of
 * sharing its band. On the phone the pill and row 1 sit at the same height because a 390-430 pt
 * screen has room beside three status pills; the demo's screen slot is 378 px wide, where they
 * collide. Stacking below is the smallest honest adaptation — every control, label and order is
 * otherwise the phone's.
 */
const container: CSSProperties = {
  position: 'absolute',
  top: 92,
  left: 0,
  right: 0,
  zIndex: 15,
  padding: '0 10px',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  pointerEvents: 'none',
}

const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }

const pillBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  padding: '6px 12px',
  borderRadius: 20,
  borderWidth: 1,
  borderStyle: 'solid',
  fontSize: 12,
  fontWeight: 500,
  lineHeight: 1.2,
  cursor: 'pointer',
  boxShadow: `0 1px 4px ${MAP_GLASS_COLORS.shadow}`,
  pointerEvents: 'auto',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
}

const countPill: CSSProperties = {
  padding: '3px 10px',
  borderRadius: 20,
  border: `1px solid ${MAP_GLASS_COLORS.border}`,
  background: MAP_GLASS_COLORS.containerBg,
  boxShadow: `0 1px 4px ${MAP_GLASS_COLORS.shadow}`,
  fontSize: 11,
  fontWeight: 400,
  color: MAP_GLASS_COLORS.textTertiary,
  pointerEvents: 'auto',
  whiteSpace: 'nowrap',
}

const searchPill: CSSProperties = {
  flex: 1,
  minWidth: 120,
  display: 'flex',
  alignItems: 'center',
  height: 36,
  padding: '0 12px',
  borderRadius: 20,
  border: `1px solid ${MAP_GLASS_COLORS.border}`,
  background: MAP_GLASS_COLORS.inputBg,
  boxShadow: `0 1px 4px ${MAP_GLASS_COLORS.shadow}`,
  pointerEvents: 'auto',
}

const searchInput: CSSProperties = {
  flex: 1,
  height: 34,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: MAP_GLASS_COLORS.text,
  fontSize: 14,
  fontFamily: 'inherit',
  minWidth: 0,
}

const statusDot = (color: string): CSSProperties => ({ width: 7, height: 7, borderRadius: 4, background: color })

/** Phone `MapControls.tsx:164-167` — pluralised, and "N of M" only while something is narrowing. */
export function locationCountLabel(filteredCount: number, locationCount: number): string {
  const plural = locationCount !== 1 ? 's' : ''
  return filteredCount === locationCount
    ? `${locationCount} location${plural}`
    : `${filteredCount} of ${locationCount} location${plural}`
}

export function MapControls({
  filters,
  onToggleStatus,
  onSearchChange,
  onClearFilters,
  activeFilterCount,
  proximityActive,
  proximityRadius,
  onProximityToggle,
  onRadiusChange,
  locationCount,
  filteredCount,
}: MapControlsProps) {
  return (
    <div data-map-controls style={container}>
      {/* ---- Row 1: status filter pills + count ---- */}
      <div style={row}>
        {MAP_FILTER_STATUSES.map((status) => {
          const isActive = filters.statuses.includes(status)
          return (
            <button
              key={status}
              type="button"
              data-testid={isActive ? `status-toggle-${status}-active` : `status-toggle-${status}`}
              onClick={() => onToggleStatus(status)}
              aria-label={`Filter by ${STATUS_LABEL[status]}`}
              aria-pressed={isActive}
              style={{
                ...pillBase,
                borderColor: isActive ? MAP_PIN_COLORS[status] : MAP_GLASS_COLORS.border,
                background: isActive ? `${MAP_PIN_COLORS[status]}22` : MAP_GLASS_COLORS.containerBg,
                color: isActive ? MAP_GLASS_COLORS.text : MAP_GLASS_COLORS.textSecondary,
              }}
            >
              <span style={statusDot(MAP_PIN_COLORS[status])} />
              <span>{STATUS_LABEL[status]}</span>
            </button>
          )
        })}

        {locationCount > 0 && (
          <span data-testid="map-location-count" style={countPill}>
            {locationCountLabel(filteredCount, locationCount)}
          </span>
        )}
      </div>

      {/* ---- Row 2: search + clear ---- */}
      <div style={row}>
        <div style={searchPill}>
          <input
            data-testid="map-search-input"
            type="text"
            placeholder="Search locations..."
            aria-label="Search locations"
            value={filters.searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            style={searchInput}
          />
        </div>

        <button
          type="button"
          data-testid="clear-filters-button"
          onClick={onClearFilters}
          aria-label="Clear all filters"
          style={{
            ...pillBase,
            borderColor: activeFilterCount > 0 ? MAP_GLASS_COLORS.primary : MAP_GLASS_COLORS.border,
            background: activeFilterCount > 0 ? MAP_GLASS_COLORS.clearActiveBg : MAP_GLASS_COLORS.inputBg,
            color: activeFilterCount > 0 ? MAP_GLASS_COLORS.primaryLight : MAP_GLASS_COLORS.textSecondary,
          }}
        >
          {activeFilterCount > 0 ? `Clear (${activeFilterCount})` : 'Clear'}
        </button>
      </div>

      {/* ---- Row 3: proximity ---- */}
      <div style={row}>
        <button
          type="button"
          data-testid="proximity-toggle-button"
          onClick={onProximityToggle}
          aria-label={proximityActive ? 'Deactivate proximity mode' : 'Activate proximity mode'}
          aria-pressed={proximityActive}
          style={{
            ...pillBase,
            borderColor: proximityActive ? PROXIMITY_COLORS.accent : MAP_GLASS_COLORS.border,
            background: proximityActive ? PROXIMITY_COLORS.fillLight : MAP_GLASS_COLORS.inputBg,
            color: proximityActive ? PROXIMITY_COLORS.accent : MAP_GLASS_COLORS.textSecondary,
            fontWeight: proximityActive ? 600 : 500,
          }}
        >
          {proximityActive ? 'Proximity ON' : 'Proximity'}
        </button>

        {proximityActive &&
          PROXIMITY_PRESETS.map((preset) => {
            const selected = proximityRadius === preset
            return (
              <button
                key={preset}
                type="button"
                data-testid={`radius-preset-${preset}`}
                onClick={() => onRadiusChange(preset)}
                aria-label={`${preset} km radius`}
                aria-pressed={selected}
                style={{
                  ...pillBase,
                  borderColor: selected ? PROXIMITY_COLORS.accent : MAP_GLASS_COLORS.border,
                  background: selected ? PROXIMITY_COLORS.fillMedium : MAP_GLASS_COLORS.inputBg,
                  color: selected ? PROXIMITY_COLORS.accent : MAP_GLASS_COLORS.textSecondary,
                  fontWeight: selected ? 600 : 500,
                }}
              >
                {preset}km
              </button>
            )
          })}
      </div>
    </div>
  )
}
