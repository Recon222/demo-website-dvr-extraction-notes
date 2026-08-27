import { describe, it, expect } from 'vitest'

import { palette, scheme, colors } from '@/features/demo/ui/tokens/palette'
import { radius, withAlpha } from '@/features/demo/ui/tokens/scale'
import {
  STATUS_SEVERITY,
  STATUS_ACCENT,
  SEVERITIES,
  severityTone,
  neutralTone,
  statusBadgeStyle,
  NEUTRAL_TINT_ALPHA,
} from '@/features/demo/ui/tokens/status'

const SCHEMES = ['dark', 'light'] as const

describe('STATUS_SEVERITY / STATUS_ACCENT', () => {
  // Transcribed from phone `map-view/utils/status-severity.ts:27-33` and `:66-72`. Written out
  // rather than derived: the phone writes both tables out, and a derived table would agree with
  // its own generator no matter which way the generator was wrong.
  it('maps the four statuses to the phone`s severities', () => {
    expect(STATUS_SEVERITY).toEqual({ started: 'warning', working: 'info', complete: 'success', incident: 'error' })
  })

  it('maps the four statuses to the phone`s ACCENT TOKEN NAMES, which are not the severity names', () => {
    expect(STATUS_ACCENT).toEqual({
      started: 'warningAccent',
      working: 'infoDark',
      complete: 'successDark',
      incident: 'error',
    })
    // `warningAccent` !== `warningDark` even where dark spells them the same hex, and
    // `infoDark`/`successDark` are NOT `info`/`success`. Naming the tokens is the point.
    expect(STATUS_ACCENT.started).not.toBe('warningDark')
  })

  it('keeps the two tables in step: a status`s accent is its SEVERITY`s accent', () => {
    // The one wiring error neither table can catch alone — e.g. `complete` severity `success`
    // but accent `warningAccent`. Checked through the recipe, in both schemes.
    for (const s of SCHEMES) {
      for (const status of Object.keys(STATUS_SEVERITY) as (keyof typeof STATUS_SEVERITY)[]) {
        expect(severityTone(STATUS_SEVERITY[status], s).accent).toBe(palette[s][STATUS_ACCENT[status]])
      }
    }
  })

  it('exposes exactly the four severities that own a *Light / *OnLight pair', () => {
    expect([...SEVERITIES].sort()).toEqual(['error', 'info', 'success', 'warning'])
    // `primary` is deliberately absent: D8(a) created the pair for the four severities only,
    // which is why the phone maps `working` to `info` and not to `primary`.
    expect(SEVERITIES).not.toContain('primary')
  })
})

describe('severityTone — THE severity recipe', () => {
  it('spends the *Light fill, the saturated border and the *OnLight foreground, in that wiring', () => {
    for (const s of SCHEMES) {
      const c = palette[s]
      expect(severityTone('warning', s)).toEqual({
        background: c.warningLight,
        borderColor: c.warning,
        color: c.warningOnLight,
        accent: c.warningAccent,
      })
    }
  })

  it('never hands the saturated accent to the foreground (phone Banner: 1.92-2.24:1)', () => {
    for (const s of SCHEMES) {
      for (const severity of SEVERITIES) {
        const tone = severityTone(severity, s)
        expect(tone.color).not.toBe(tone.borderColor)
        expect(tone.color).not.toBe(tone.accent)
      }
    }
  })

  it('paints an OPAQUE fill — a translucent one composites over an unknown parent', () => {
    for (const s of SCHEMES) {
      for (const severity of SEVERITIES) {
        expect(severityTone(severity, s).background).toMatch(/^#[0-9a-f]{6}$/i)
      }
    }
  })

  it('defaults to the scheme the demo renders, so no consumer spells a half by name', () => {
    expect(severityTone('success')).toEqual(severityTone('success', scheme))
    expect(severityTone('success').background).toBe(colors.successLight)
  })
})

describe('neutralTone — the ABSENCE of a severity', () => {
  it('is the 15% textSecondary tint, the border token and plain text (phone CaseStatusBadge.tsx:130-138)', () => {
    for (const s of SCHEMES) {
      const c = palette[s]
      expect(neutralTone(s)).toEqual({
        background: withAlpha(c.textSecondary, NEUTRAL_TINT_ALPHA),
        borderColor: c.border,
        color: c.text,
        accent: c.textSecondary,
      })
    }
    expect(NEUTRAL_TINT_ALPHA).toBe(0.15)
  })

  it('carries no hue — it is the one tint left, and deliberately grey', () => {
    for (const s of SCHEMES) {
      const neutral = neutralTone(s)
      for (const severity of SEVERITIES) {
        expect(neutral.background).not.toBe(severityTone(severity, s).background)
      }
    }
  })
})

describe('statusBadgeStyle — THE one status pill', () => {
  const tone = severityTone('success')

  it('takes the phone`s geometry: radius lg, a 1px border, weight 600', () => {
    const style = statusBadgeStyle(tone)
    expect(style.borderRadius).toBe(radius.lg)
    expect(radius.lg).toBe(12)
    expect(style.borderWidth).toBe(1)
    expect(style.borderStyle).toBe('solid')
    expect(style.fontWeight).toBe(600)
  })

  it('never SHOUTS — no textTransform and no letterSpacing (both absent on the phone)', () => {
    const style = statusBadgeStyle(tone)
    expect(style.textTransform).toBeUndefined()
    expect(style.letterSpacing).toBeUndefined()
  })

  it('takes the phone`s three sizes: 2/6 @12 - 4/8 @14 - 6/12 @16', () => {
    expect(statusBadgeStyle(tone, 'small')).toMatchObject({ padding: '2px 6px', fontSize: 12 })
    expect(statusBadgeStyle(tone, 'medium')).toMatchObject({ padding: '4px 8px', fontSize: 14 })
    expect(statusBadgeStyle(tone, 'large')).toMatchObject({ padding: '6px 12px', fontSize: 16 })
    // The phone's own default (`size = 'medium'`, CaseStatusBadge.tsx:52).
    expect(statusBadgeStyle(tone)).toEqual(statusBadgeStyle(tone, 'medium'))
  })

  it('wires the tone`s three parts to fill, border and text — never the accent', () => {
    const style = statusBadgeStyle(severityTone('warning'))
    expect(style.background).toBe(colors.warningLight)
    expect(style.borderColor).toBe(colors.warning)
    expect(style.color).toBe(colors.warningOnLight)
    expect(style.color).not.toBe(colors.warningAccent)
  })

  it('sets NO border shorthand — a consumer overriding one side must not erase the rest', () => {
    // The W1 hazard in this package's own terms: a shorthand written after a longhand wipes it,
    // and React only writes CHANGED keys on update, so the erasure survives a re-render.
    expect(statusBadgeStyle(tone)).not.toHaveProperty('border')
  })
})
