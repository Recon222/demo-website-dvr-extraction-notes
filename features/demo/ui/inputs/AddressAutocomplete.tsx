'use client'

import { useEffect, useRef, useState } from 'react'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import {
  SearchBoxCore,
  SearchSession,
  type SearchBoxOptions,
  type SearchBoxSuggestion,
  type SearchBoxSuggestionResponse,
  type SearchBoxRetrieveResponse,
} from '@mapbox/search-js-core'
import { fieldInputStyle } from '@/features/demo/ui/tokens/field-input'

type AddressSession = SearchSession<SearchBoxOptions, SearchBoxSuggestion, SearchBoxSuggestionResponse, SearchBoxRetrieveResponse>

export interface AddressPick {
  streetAddress: string
  city: string
  /** [lng, lat] from the Mapbox retrieve feature — geocoded coordinates, when present. */
  coordinates?: { lng: number; lat: number }
  /** Accuracy estimate in metres for those coordinates — present ONLY for a rooftop match.
   *  Verbatim port of phone `mapbox-service.ts:246-247` ("Set accuracy estimate for rooftop
   *  geocoding (approximately 5 meters)"); any other match quality carries no accuracy at all
   *  rather than a made-up number. */
  accuracyM?: number
}

interface Suggestion {
  raw: SearchBoxSuggestion // passed back to retrieve()
  name: string
  detail: string
}

/** Extract street + city + [lng, lat] from a Mapbox Search Box retrieve feature (pure; unit-tested).
 *  The retrieve feature carries the geocoded coordinates we plot on the map — `geometry.coordinates`
 *  (`[lng, lat]`), with `properties.coordinates` (`{ longitude, latitude }`) as a fallback. We keep
 *  `coordinates` only when a finite pair is present, so the no-token / property-only paths stay
 *  coord-less (the honest "no coordinate" case). */
// Accepts `unknown` (the Mapbox `SearchBoxFeatureSuggestion` properties type has no index signature,
// so it isn't assignable to a `Record<string, unknown>` param); we narrow structurally inside.
export function pickFromFeature(feature: unknown): AddressPick {
  const f = (feature ?? {}) as RetrieveFeature
  const p = (f.properties ?? {}) as Record<string, unknown>
  const ctx = (p.context ?? {}) as { address?: { name?: string }; place?: { name?: string } }
  return {
    streetAddress: ctx.address?.name ?? (typeof p.name === 'string' ? p.name : '') ?? '',
    city: ctx.place?.name ?? '',
    coordinates: extractCoordinates(f),
    accuracyM: p.accuracy === 'rooftop' ? 5 : undefined,
  }
}

interface RetrieveFeature {
  geometry?: { coordinates?: unknown }
  properties?: Record<string, unknown>
}

/** Pull a finite `{ lng, lat }` from the feature geometry or `properties.coordinates`; else undefined. */
function extractCoordinates(feature: RetrieveFeature): { lng: number; lat: number } | undefined {
  const geo = feature?.geometry?.coordinates
  if (Array.isArray(geo) && geo.length >= 2 && Number.isFinite(geo[0]) && Number.isFinite(geo[1])) {
    return { lng: geo[0] as number, lat: geo[1] as number }
  }
  const pc = feature?.properties?.coordinates as { longitude?: unknown; latitude?: unknown } | undefined
  if (pc && Number.isFinite(pc.longitude) && Number.isFinite(pc.latitude)) {
    return { lng: pc.longitude as number, lat: pc.latitude as number }
  }
  return undefined
}

/**
 * Street-address input with Mapbox forward-geocode autocomplete. Typing (≥3 chars) suggests
 * addresses; picking one fills street + city via `onPick`. Uses SearchSession (handles debouncing,
 * session tokens, and ordering). Degrades to a plain text input when NEXT_PUBLIC_MAPBOX_TOKEN is
 * absent (tests / a deploy without the token) — the field always works. Mapbox public (pk) tokens
 * are designed for client-side use.
 */
export function AddressAutocomplete({
  label,
  value,
  onChange,
  onPick,
  placeholder,
  required,
}: {
  label: string
  value: string
  onChange(value: string): void
  onPick(parts: AddressPick): void
  placeholder?: string
  /** Renders the shared `Field` required marker (" *"). Phone: Street Address is `required`
   *  on every LocationForm caller (LocationForm.tsx:188, ui-mapping 05:57). */
  required?: boolean
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const sessionRef = useRef<AddressSession | null>(null)
  if (token && !sessionRef.current) {
    sessionRef.current = new SearchSession(new SearchBoxCore({ accessToken: token }), 300)
  }
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const seq = useRef(0)
  const skipNext = useRef(false)

  useEffect(() => {
    const session = sessionRef.current
    if (!session || skipNext.current || value.trim().length < 3) {
      skipNext.current = false
      if (value.trim().length < 3) setOpen(false)
      return
    }
    const mine = ++seq.current
    session
      // proximity:'ip' biases results to the user's location via Mapbox IP geolocation —
      // closest-first results wherever the user is, no geolocation permission prompt or device API.
      // No country filter: the app is location-agnostic (used wherever the analyst is).
      .suggest(value, { types: 'address', limit: 5, proximity: 'ip' })
      .then((res) => {
        if (mine !== seq.current) return // a newer keystroke superseded this response
        const items: Suggestion[] = (res.suggestions ?? []).map((s) => ({
          raw: s,
          name: s.name ?? '',
          detail: s.place_formatted ?? '',
        }))
        setSuggestions(items)
        setOpen(items.length > 0)
      })
      .catch(() => {
        /* geocode/network failure → no suggestions; the field still works as plain text */
      })
  }, [value])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const choose = (s: Suggestion) => {
    const session = sessionRef.current
    if (!session) return
    skipNext.current = true // selecting sets the value; don't immediately re-query it
    setOpen(false)
    setSuggestions([])
    session
      .retrieve(s.raw)
      .then((res) => onPick(pickFromFeature((res.features ?? [])[0])))
      .catch(() => {
        /* retrieve failed → keep whatever the user typed */
      })
  }

  return (
    <div ref={boxRef} style={{ marginBottom: 14, position: 'relative' }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#cdd9e6', marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: '#ff4757' }}> *</span>}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          setFocused(true)
          if (suggestions.length > 0) setOpen(true)
        }}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        style={fieldInputStyle({ focused })}
      />
      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          aria-label={`${label} suggestions`}
          style={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 50, listStyle: 'none', margin: '4px 0 0', padding: 4, background: '#0b1626', border: GLASS.borderBtn, borderRadius: 8, boxShadow: '0 12px 30px rgba(0,0,0,0.5)', maxHeight: 220, overflowY: 'auto' }}
        >
          {suggestions.map((s, i) => (
            <li key={i} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s)}
                style={{ width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 6, border: 'none', background: 'transparent', color: '#e6eef6', fontSize: 13, cursor: 'pointer', display: 'block' }}
              >
                <span style={{ display: 'block', fontWeight: 500 }}>{s.name}</span>
                {s.detail && <span style={{ display: 'block', fontSize: 11, color: '#7a9fc4', marginTop: 1 }}>{s.detail}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
