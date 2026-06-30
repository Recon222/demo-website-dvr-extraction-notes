'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  SearchBoxCore,
  SearchSession,
  type SearchBoxOptions,
  type SearchBoxSuggestion,
  type SearchBoxSuggestionResponse,
  type SearchBoxRetrieveResponse,
} from '@mapbox/search-js-core'

type AddressSession = SearchSession<SearchBoxOptions, SearchBoxSuggestion, SearchBoxSuggestionResponse, SearchBoxRetrieveResponse>

export interface AddressPick {
  streetAddress: string
  city: string
}

interface Suggestion {
  raw: SearchBoxSuggestion // passed back to retrieve()
  name: string
  detail: string
}

const inputStyle: CSSProperties = {
  width: '100%',
  borderRadius: 8,
  border: '1px solid #1e3a5f',
  background: '#0d1b2a',
  color: '#f0f4f8',
  fontSize: 15,
  padding: '11px 12px',
  outline: 'none',
}

/** Extract street + city from a Mapbox Search Box retrieve feature (pure; unit-tested). */
export function pickFromFeature(feature: { properties?: Record<string, unknown> } | undefined): AddressPick {
  const p = (feature?.properties ?? {}) as Record<string, unknown>
  const ctx = (p.context ?? {}) as { address?: { name?: string }; place?: { name?: string } }
  return {
    streetAddress: ctx.address?.name ?? (typeof p.name === 'string' ? p.name : '') ?? '',
    city: ctx.place?.name ?? '',
  }
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
}: {
  label: string
  value: string
  onChange(value: string): void
  onPick(parts: AddressPick): void
  placeholder?: string
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const sessionRef = useRef<AddressSession | null>(null)
  if (token && !sessionRef.current) {
    sessionRef.current = new SearchSession(new SearchBoxCore({ accessToken: token }), 300)
  }
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
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
      .suggest(value, { country: 'ca', types: 'address', limit: 5 })
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
      <div style={{ fontSize: 13, fontWeight: 500, color: '#cdd9e6', marginBottom: 6 }}>{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        style={inputStyle}
      />
      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          aria-label={`${label} suggestions`}
          style={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 50, listStyle: 'none', margin: '4px 0 0', padding: 4, background: '#0b1626', border: '1px solid #2a4a6f', borderRadius: 8, boxShadow: '0 12px 30px rgba(0,0,0,0.5)', maxHeight: 220, overflowY: 'auto' }}
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
