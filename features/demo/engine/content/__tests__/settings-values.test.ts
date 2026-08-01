import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  DEFAULT_SETTINGS,
  ENCRYPTION_STRENGTH_OPTIONS,
  FORM_PROFILE_SHORT,
  GPS_ACCURACY_OPTIONS,
  GPS_TIMEOUT_OPTIONS,
  MAX_DURATION_OPTIONS,
  NTP_REGION_OPTIONS,
  PROMPT_MODE_OPTIONS,
  VIDEO_CODEC_OPTIONS,
  VIDEO_QUALITY_OPTIONS,
  clampPhotoQuality,
  photoQualityPercent,
  settingsPreview,
  type DemoSettings,
  type SettingsPreviewContext,
} from '@/features/demo/engine/content/settings-values'
import { SETTINGS_CATEGORY_IDS } from '@/features/demo/engine/content/settings-catalog'
import { PROFILES } from '@/features/demo/engine/types'
import { ACCURACY_MODE_TARGET_M } from '@/features/demo/engine/logic/gps'
import { APP_NAME, APP_VERSION, DEMO_VERSION_LINE, SUPPORT_EMAIL } from '@/features/demo/engine/content/app-info'

/**
 * Settings values (P7.1, D6). Three families of invariant:
 *
 * 1. **Defaults are the phone's**, field for field — a demo that opens on a different default
 *    than the device is a parity bug nobody would notice by eye.
 * 2. **Option lists are the phone's**, label AND value, in order — these are the strings a
 *    side-by-side check reads off the screen.
 * 3. **Previews match the phone's `usePreview` hooks**, including the two abbreviations that
 *    are NOT the picker's own labels (`4K`, `Europe`/`Global`).
 */

const ctx = (o: Partial<SettingsPreviewContext> = {}): SettingsPreviewContext => ({
  settings: DEFAULT_SETTINGS,
  profileName: '',
  formProfile: 'forensic',
  ...o,
})

const withSettings = (patch: Partial<DemoSettings>): SettingsPreviewContext =>
  ctx({ settings: { ...DEFAULT_SETTINGS, ...patch } })

describe('DEFAULT_SETTINGS', () => {
  it('is the phone’s defaults, field for field', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      // Appearance — `darkMode` has no phone default to copy (it reads ThemeContext); `true`
      // is the state of the demo's phone frame, which renders the dark theme and only that.
      darkMode: true,
      showImportProcessDetails: true,
      // DEFAULT_MEDIA_CAPTURE_SETTINGS (media-capture.types.ts:117-126)
      photoQuality: 0.9,
      videoQuality: '1080p',
      videoCodec: 'auto',
      maxVideoDuration: 300,
      gpsInMedia: true,
      shutterSound: true,
      skipProcessing: true,
      // DEFAULT_LOCATION_SETTINGS (settings-store.ts:67-75)
      gpsAccuracyMode: 'balanced',
      gpsTimeout: 30,
      showAccuracyWarning: true,
      // DEFAULT_TIME_SYNC_SETTINGS (time-sync/types.ts:26-28)
      ntpRegion: 'canada',
      // DEFAULT_ENCRYPTION_SETTINGS (export-security/types.ts:59-64)
      zipEncryptionEnabled: false,
      singleFileEncryptionEnabled: false,
      promptMode: 'auto',
      encryptionStrength: 'AES-256',
      // DEFAULT_BIOMETRIC_SETTINGS (biometrics/types.ts:29-33) — note fallback defaults TRUE
      appLockEnabled: false,
      exportProtectionEnabled: false,
      allowDeviceFallback: true,
      // DEFAULT_CLOUD_SYNC_SETTINGS (cloud-sync/types.ts:20-22)
      cloudSyncEnabled: false,
    })
  })

  it('is frozen — a pane that mutated it would change every later default in the tab', () => {
    expect(Object.isFrozen(DEFAULT_SETTINGS)).toBe(true)
  })

  it('opens on the same GPS accuracy target the capture engine already defaults to', () => {
    // `buildGpsConfig()`'s default mode is 'balanced' (gps.ts:136). The Location pane must open
    // showing what the demo's capture actually does today, or the pane is wrong on arrival —
    // the pane being cosmetic (deferred §80b) is about CHANGES, not about the initial reading.
    expect(DEFAULT_SETTINGS.gpsAccuracyMode).toBe('balanced')
    expect(ACCURACY_MODE_TARGET_M[DEFAULT_SETTINGS.gpsAccuracyMode]).toBe(50)
    expect(DEFAULT_SETTINGS.gpsTimeout).toBe(30)
  })
})

describe('option lists (phone labels + values, in order)', () => {
  it('Video Quality / Codec / Max Duration', () => {
    expect(VIDEO_QUALITY_OPTIONS).toEqual([
      { label: 'HD (720p)', value: '720p' },
      { label: 'Full HD (1080p)', value: '1080p' },
      { label: '4K UHD (2160p)', value: '2160p' },
    ])
    expect(VIDEO_CODEC_OPTIONS).toEqual([
      { label: 'Auto (Device Default)', value: 'auto' },
      { label: 'H.264 (AVC) - Maximum Compatibility', value: 'avc1' },
      { label: 'H.265 (HEVC) - Better Compression', value: 'hvc1' },
    ])
    expect(MAX_DURATION_OPTIONS).toEqual([
      { label: '1 minute', value: '60' },
      { label: '2 minutes', value: '120' },
      { label: '5 minutes', value: '300' },
      { label: '10 minutes', value: '600' },
      { label: '15 minutes', value: '900' },
      { label: '30 minutes', value: '1800' },
      { label: 'Unlimited', value: '0' },
    ])
  })

  it('GPS accuracy / timeout, NTP region', () => {
    expect(GPS_ACCURACY_OPTIONS).toEqual([
      { label: 'Quick (Any Accuracy)', value: 'quick' },
      { label: 'Balanced (50m)', value: 'balanced' },
      { label: 'Precise (10m)', value: 'precise' },
    ])
    expect(GPS_TIMEOUT_OPTIONS).toEqual([
      { label: '15 seconds', value: '15' },
      { label: '30 seconds', value: '30' },
      { label: '60 seconds', value: '60' },
      { label: '120 seconds', value: '120' },
    ])
    expect(NTP_REGION_OPTIONS).toEqual([
      { label: 'Canada (NRC)', value: 'canada' },
      { label: 'USA (NIST)', value: 'usa' },
      { label: 'Europe (PTB/METAS)', value: 'europe' },
      { label: 'Global (Cloudflare)', value: 'global' },
    ])
  })

  it('Export Mode + Encryption Strength, AES-256 first', () => {
    expect(PROMPT_MODE_OPTIONS).toEqual([
      { label: 'Auto-use saved password', value: 'auto' },
      { label: 'Prompt before every export', value: 'always_prompt' },
    ])
    expect(ENCRYPTION_STRENGTH_OPTIONS).toEqual([
      { label: 'AES-256 — Recommended (strong)', value: 'AES-256' },
      { label: 'AES-128 — iOS yields AES-256', value: 'AES-128' },
      { label: 'Standard — weak (ZipCrypto), legacy only', value: 'STANDARD' },
    ])
  })

  it('every default is a selectable value in its own list (no unreachable initial state)', () => {
    const has = (opts: readonly { value: string }[], v: string) => opts.some((o) => o.value === v)
    expect(has(VIDEO_QUALITY_OPTIONS, DEFAULT_SETTINGS.videoQuality)).toBe(true)
    expect(has(VIDEO_CODEC_OPTIONS, DEFAULT_SETTINGS.videoCodec)).toBe(true)
    expect(has(MAX_DURATION_OPTIONS, String(DEFAULT_SETTINGS.maxVideoDuration))).toBe(true)
    expect(has(GPS_ACCURACY_OPTIONS, DEFAULT_SETTINGS.gpsAccuracyMode)).toBe(true)
    expect(has(GPS_TIMEOUT_OPTIONS, String(DEFAULT_SETTINGS.gpsTimeout))).toBe(true)
    expect(has(NTP_REGION_OPTIONS, DEFAULT_SETTINGS.ntpRegion)).toBe(true)
    expect(has(PROMPT_MODE_OPTIONS, DEFAULT_SETTINGS.promptMode)).toBe(true)
    expect(has(ENCRYPTION_STRENGTH_OPTIONS, DEFAULT_SETTINGS.encryptionStrength)).toBe(true)
  })
})

describe('settingsPreview', () => {
  it('answers for every catalog row (no row can silently lose its value)', () => {
    for (const id of SETTINGS_CATEGORY_IDS) {
      expect(settingsPreview(id, ctx()), `no preview for "${id}"`).not.toBe('')
      expect(typeof settingsPreview(id, ctx())).toBe('string')
    }
  })

  it('reproduces the phone hooks on the defaults', () => {
    expect(settingsPreview('appearance', ctx())).toBe('Dark')
    expect(settingsPreview('media-capture', ctx())).toBe('1080p')
    expect(settingsPreview('location', ctx())).toBe('Balanced')
    expect(settingsPreview('time-sync', ctx())).toBe('Canada (NRC)')
    expect(settingsPreview('export-security', ctx())).toBe('Off')
    expect(settingsPreview('cloud-sync', ctx())).toBe('Off')
    expect(settingsPreview('about', ctx())).toBe(`v${APP_VERSION}`)
  })

  it('shortens 2160p to 4K and drops the NTP institute names — NOT the picker labels', () => {
    // The row abbreviations are a SECOND string table on the phone (settings-catalog.tsx:92-103);
    // reusing the picker labels here would be the easy, wrong port.
    expect(settingsPreview('media-capture', withSettings({ videoQuality: '2160p' }))).toBe('4K')
    expect(settingsPreview('media-capture', withSettings({ videoQuality: '720p' }))).toBe('720p')
    expect(settingsPreview('time-sync', withSettings({ ntpRegion: 'europe' }))).toBe('Europe')
    expect(settingsPreview('time-sync', withSettings({ ntpRegion: 'global' }))).toBe('Global')
    expect(settingsPreview('time-sync', withSettings({ ntpRegion: 'usa' }))).toBe('USA (NIST)')
  })

  it('reads Export Security as On when EITHER encryption switch is on (phone PR-67 L2)', () => {
    expect(settingsPreview('export-security', withSettings({ zipEncryptionEnabled: true }))).toBe('On')
    expect(settingsPreview('export-security', withSettings({ singleFileEncryptionEnabled: true }))).toBe('On')
  })

  it('title-cases the accuracy mode rather than reusing its picker label', () => {
    expect(settingsPreview('location', withSettings({ gpsAccuracyMode: 'quick' }))).toBe('Quick')
    expect(settingsPreview('location', withSettings({ gpsAccuracyMode: 'precise' }))).toBe('Precise')
  })

  it('reports Security as Unavailable — the phone’s own literal, and true in a browser', () => {
    expect(settingsPreview('security', ctx())).toBe('Unavailable')
  })

  it('SEAM(P7.2): User Profile shows the phone’s empty literal until a profile exists', () => {
    expect(settingsPreview('user-profile', ctx({ profileName: '' }))).toBe('Not set')
    expect(settingsPreview('user-profile', ctx({ profileName: '   ' }))).toBe('Not set')
    // …and the trimmed name once P7.2 supplies one.
    expect(settingsPreview('user-profile', ctx({ profileName: '  Kris  ' }))).toBe('Kris')
  })

  it('maps the ACTIVE PROFILE through FORM_PROFILE_SHORT itself — the caller passes no label (R-21)', () => {
    // Total over `Profile`, so every member has a label and none needs a fallback. A fourth
    // profile that reached this row unlabelled would be a compile error in the map, not a raw
    // id on screen — which is the whole reason the context carries the id and not a string.
    expect(settingsPreview('form-customization', ctx({ formProfile: 'forensic' }))).toBe('Forensic')
    expect(settingsPreview('form-customization', ctx({ formProfile: 'limited' }))).toBe('Limited')
    expect(settingsPreview('form-customization', ctx({ formProfile: 'canvas' }))).toBe('Canvas')
    for (const p of PROFILES) {
      expect(settingsPreview('form-customization', ctx({ formProfile: p }))).toBe(FORM_PROFILE_SHORT[p])
    }
  })
})

describe('photo-quality helpers (phone slider write path)', () => {
  it('formats the live percentage the way the phone does', () => {
    expect(photoQualityPercent(0.9)).toBe(90)
    expect(photoQualityPercent(0.5)).toBe(50)
    expect(photoQualityPercent(1)).toBe(100)
  })

  it('rounds to 2 decimals then clamps to [0.5, 1.0]', () => {
    expect(clampPhotoQuality(0.8499)).toBe(0.85)
    expect(clampPhotoQuality(0.2)).toBe(0.5)
    expect(clampPhotoQuality(3)).toBe(1)
    expect(clampPhotoQuality(0.55)).toBe(0.55)
  })
})

describe('app-info', () => {
  it('mirrors the phone’s name/version and builds the demo’s own version line', () => {
    expect(APP_NAME).toBe('DVR Extraction Notes')
    expect(APP_VERSION).toBe('1.0.0')
    expect(DEMO_VERSION_LINE).toBe('Interactive demo · v1.0.0')
  })

  it('keeps SUPPORT_EMAIL equal to the site’s published contact address', () => {
    // Held as a literal so `features/demo/` keeps importing nothing from the marketing half of
    // the repo (see app-info.ts). This is the pin that stops the copy drifting silently.
    const config = readFileSync(join(process.cwd(), 'lib', 'site-config.ts'), 'utf8')
    expect(config, 'lib/site-config.ts no longer declares this address').toContain(
      `contactEmail: '${SUPPORT_EMAIL}'`,
    )
  })
})
