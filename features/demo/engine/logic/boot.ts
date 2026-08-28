/**
 * The boot sequence's phase machine (P8.1 · matrix rows 1–2 · owner decision D7).
 *
 * The phone opens on `AuthenticatedSplashScreen`: a static doors frame, the biometric HUD, then
 * — on success — a doors-open video, a hold, a fade, and the app
 * (`src/features/biometrics/components/AuthenticatedSplashScreen.tsx:52`, whose `SplashPhase` is
 * `'authenticating' | 'playing_video' | 'fading_out' | 'complete'`, with the HUD's own
 * `ScannerState` layered inside the authenticating phase). This module is that machine, minus
 * the parts a browser tab cannot honestly claim.
 *
 * **The scan is simulated and says so.** There is no biometric sensor behind a browser tab, so
 * there is no `failed` branch here: a failure state would be theatre about an authentication that
 * never happened. The phone's auto-triggered OS prompt becomes an explicit visitor gesture
 * ("TAP TO SCAN"), and `SplashScreen` carries the standing disclosure. This is the same line
 * `SecurityPane` draws — it refuses to fake the Face ID *sheet* because a fake sheet would imply
 * a real gate — and the boot HUD stays on the right side of it by gating nothing: it protects no
 * data and no setting, it is the app's opening chrome.
 *
 * **Not wired to `settings.appLockEnabled`.** The phone skips its HUD entirely when app lock is
 * off (`AuthenticatedSplashScreen.tsx:126-130`), and the demo has a live `appLockEnabled` switch
 * in Settings. Binding them would give a *security* toggle authority over a *decorative*
 * animation, which is a worse lie than the animation is — and it would contradict
 * `SecurityPane`'s own note that none of those switches can do anything here. Recorded in
 * `docs/code-reviews/deferred.md` §87.
 *
 * Pure: no React, no timers, no clock reads. The UI owns the `setTimeout`s and asks this module
 * two questions — "how long do I sit in this phase" and "what comes next".
 */

/**
 * Where the sequence is. `video` / `holding` / `fading` exist whether or not a video source is
 * configured — `nextBootPhase` routes around them when `BOOT_VIDEO` is null — so dropping the
 * owner's intro video in later changes ONE constant, not this union.
 */
export type BootPhase = 'idle' | 'scanning' | 'authorized' | 'video' | 'holding' | 'fading' | 'done'

/**
 * The `SplashScreen` HUD's three branches.
 *
 * `SplashScreen`'s `AuthState` aliases this, which makes the NAME undriftable — no more. The
 * comment here used to claim the alias stopped the two from drifting at all (review R-9, the
 * §84a shape). What actually closes the BRANCH SET is one total record, and it is not in this
 * file: `HUD_STATE` below is keyed by `BootPhase`, so growing THIS union leaves it untouched.
 * `SplashScreen`'s `statusBody` is `Record<BootHudState, ReactNode>` and WAS the only thing that
 * turned a fourth member into a compile error. U8.1 added a second total record over this union
 * (`SCANNER_COLORS`, `ui/screens/scanner-hud-colors.ts`), so "the only thing" and "exactly one
 * `TS2741`" are both stale. Re-probed at the W4 head by adding a `'failed'` member: **five
 * diagnostics across three modules**, and the first one a compiler reports is no longer the
 * `TS2741` this comment named.
 *
 *   scanner-hud-colors.ts:104   TS1360  `SCANNER_COLORS` no longer satisfies the Record
 *   SplashScreen.tsx:61         TS7053  indexing `SCANNER_COLORS[authState]`
 *   SplashScreen.tsx:72         TS2741  `statusBody` is missing the new key
 *   SplashScreen.test.tsx:90    TS7053  the A87 text sweep indexes the same record
 *   SplashScreen.test.tsx:104   TS7053  the A87 bracket sweep, likewise
 *
 * What the union still guarantees is the property, not the count: **a fourth member cannot be
 * added silently.** Do not re-state a diagnostic count here — the next total record over this
 * union moves it again, and a stale count reads as a verified fact.
 */
export const BOOT_HUD_STATES = ['idle', 'scanning', 'authorized'] as const
export type BootHudState = (typeof BOOT_HUD_STATES)[number]

// ---------------------------------------------------------------------------
// Timing
// ---------------------------------------------------------------------------

/**
 * How long "SCANNING…" holds. Demo-derived, not lifted: the phone's scan lasts exactly as long
 * as the OS takes to answer a real Face ID prompt, which has no browser counterpart. The plan
 * specifies a "~1.2 s sequence" (`01-master-parity-plan.md` §5 P8.1); 1200 − the phone's 800 ms
 * AUTHORIZED hold leaves 400, which is also the phone's `DOTS_INTERVAL_MS`
 * (`src/components/layout/scanner-hud-constants.ts:82`) — so the status dots complete exactly one
 * cycle while it runs.
 */
export const SCAN_MS = 400

/** Phone `AUTHORIZED_DISPLAY_MS` (`src/components/layout/scanner-hud-constants.ts:91`). */
export const AUTHORIZED_MS = 800

/** Phone `HOLD_DURATION_MS` — the beat after the video ends
 *  (`src/features/biometrics/components/AuthenticatedSplashScreen.tsx:33`). */
export const HOLD_MS = 500

/** Phone `FADE_DURATION_MS` (`AuthenticatedSplashScreen.tsx:36`). */
export const FADE_MS = 300

/** The visible scan, end to end — the plan's "~1.2 s sequence". The fade is the exit, not part
 *  of it, and the video (when configured) runs on its own length. */
export const BOOT_SEQUENCE_MS = SCAN_MS + AUTHORIZED_MS

// ---------------------------------------------------------------------------
// The intro-video drop-in slot
// ---------------------------------------------------------------------------

/**
 * The intro video, as ONE value.
 *
 * Source and poster used to be two independent `string | null` constants, and a poster with no
 * source compiled clean and rendered nothing (review R-1d) — the §84f correlated-optional trap
 * this team closed by type one round ago, re-opened on the seam of the drop-in procedure that
 * created it. Bound together, a half-flip is `TS2741` at both the constant and the prop.
 *
 * `poster` stays nullable *inside* the pair because it is genuinely optional once a source
 * exists: the boot surface is already painted (`SCANNER_GROUND`, the phone's splash background
 * at `AuthenticatedSplashScreen.tsx:288`), so a late first frame reads as the gate's own navy
 * rather than as a flash of the wrong thing. The value named here used to be `#000314`; D8
 * ported it to `#002853` and the phone retired the old one entirely, so the literal is gone
 * from this comment rather than left as a fifth place to mine it from.
 */
export interface BootVideo {
  readonly src: string
  readonly poster: string | null
}

/**
 * The bunker-doors intro video (owner supplies later — decision D7).
 *
 * DROP-IN PROCEDURE, in full:
 *   1. Put the encoded file in `public/demo-media/` — e.g. `public/demo-media/boot-intro.mp4`,
 *      beside the existing `sample-clip.mp4`. H.264/AAC MP4, muted-autoplay-safe, portrait; the
 *      phone's own splash asset is 720×1280 (9:16, `AuthenticatedSplashScreen.tsx:30`) and the
 *      demo's screen is 378×786, so the same encode fits with `object-fit: cover`. Optionally
 *      drop its first frame beside it (`boot-intro-poster.jpg`, matching `sample-clip-poster.jpg`)
 *      — the phone holds a static frame until the video's first frame decodes
 *      (`AuthenticatedSplashScreen.tsx:235-247`).
 *   2. Change the ONE constant below:
 *      `{ src: '/demo-media/boot-intro.mp4', poster: '/demo-media/boot-intro-poster.jpg' }`
 *      (or `poster: null`).
 *
 * That is the whole code change. The `video` → `holding` → `fading` phases, the element, its
 * autoplay/`ended`/error/stall handling, the skip control and the reduced-motion opt-out are
 * already built and tested against a fake source.
 *
 * **One test needs the flip too** (review R-17, and the ledger's §87d amendment): the guard just
 * below announces the change, which is intended — but `DemoExperience.boot.test.tsx`'s
 * `runSequence` walks the phases and must fire the video's `ended` for the sequence to finish. It
 * already does that when a video element is present, so the flip is expected to leave it green;
 * if the bridge suite reds on the video path, that helper is where to look, not this file.
 */
export const BOOT_VIDEO: BootVideo | null = null

// ---------------------------------------------------------------------------
// The machine
// ---------------------------------------------------------------------------

export interface BootConfig {
  /** `BOOT_VIDEO`, a fake in tests, or the null the UI substitutes when the element has already
   *  failed to load (review R-1a). Null routes the sequence around the video phases. */
  video: BootVideo | null
  /** `prefers-reduced-motion: reduce`. Collapses the whole sequence — see `nextBootPhase`. */
  reduceMotion: boolean
}

/**
 * How long to sit in a phase before advancing, or `null` when the phase waits on something
 * outside the clock: `idle` waits for the visitor's gesture, `video` for the element's `ended`
 * event, `done` for nothing at all.
 *
 * A TOTAL record, so a phase added to the union cannot ship without a dwell decision.
 */
const PHASE_MS: Record<BootPhase, number | null> = {
  idle: null,
  scanning: SCAN_MS,
  authorized: AUTHORIZED_MS,
  video: null,
  holding: HOLD_MS,
  fading: FADE_MS,
  done: null,
}

export function bootPhaseDurationMs(phase: BootPhase): number | null {
  return PHASE_MS[phase]
}

/**
 * Every phase, read off the record the compiler already forces to be total (review R-11b).
 *
 * The tests that call themselves "total over the phase union" used to iterate a HAND list under a
 * `readonly BootPhase[]` annotation, which type-checks a SUBSET — probed: a stale list left all
 * three green while silently covering six of seven members. Derived, they are total for the same
 * reason `PHASE_MS` is: `Record<BootPhase, …>` cannot omit a key.
 */
export const BOOT_PHASES = Object.keys(PHASE_MS) as readonly BootPhase[]

/**
 * Which layer owns the screen in each phase (review R-11a).
 *
 * This was a deny-list in the component — `phase !== 'idle' && phase !== 'scanning' &&
 * phase !== 'authorized'` — the one partition in this feature pointing the UNSAFE way: a new
 * pre-video beat would have silently taken the surface early, showing the video before its turn.
 * As a total record it lives beside its siblings and a new phase has to say where it belongs.
 */
const SURFACE: Record<BootPhase, 'hud' | 'video'> = {
  idle: 'hud',
  scanning: 'hud',
  authorized: 'hud',
  video: 'video',
  holding: 'video',
  fading: 'video',
  done: 'video',
}

/** Which layer owns the screen — assuming there IS a video; with none the HUD holds throughout. */
export function bootSurface(phase: BootPhase): 'hud' | 'video' {
  return SURFACE[phase]
}

/**
 * The successor phase, or `null` when the sequence is over.
 *
 * Two branches shape it:
 * - **No video source** → `authorized` goes straight to `fading`. The three video phases stay in
 *   the union and stay implemented; they are simply not visited.
 * - **Reduced motion** → any phase collapses to `done`. `prefers-reduced-motion` is exactly the
 *   signal for a 1.2 s decorative dwell plus an autoplaying video, and the house idiom is
 *   instant-complete (`ScreenStage.tsx:39-49`). The collapse is written from ANY phase, not just
 *   `idle`, so a visitor who flips the OS setting mid-sequence lands on the app at the next
 *   advance instead of finishing an animation they just opted out of.
 */
export function nextBootPhase(phase: BootPhase, cfg: BootConfig): BootPhase | null {
  if (phase === 'done') return null
  if (cfg.reduceMotion) return 'done'
  switch (phase) {
    case 'idle':
      return 'scanning'
    case 'scanning':
      return 'authorized'
    case 'authorized':
      return cfg.video === null ? 'fading' : 'video'
    case 'video':
      return 'holding'
    case 'holding':
      return 'fading'
    case 'fading':
      return 'done'
  }
}

/** Which HUD branch a phase paints. Everything past the scan is `authorized` — the green HUD is
 *  what the video covers, and what stays up through the fade when there is no video. */
const HUD_STATE: Record<BootPhase, BootHudState> = {
  idle: 'idle',
  scanning: 'scanning',
  authorized: 'authorized',
  video: 'authorized',
  holding: 'authorized',
  fading: 'authorized',
  done: 'authorized',
}

export function bootHudState(phase: BootPhase): BootHudState {
  return HUD_STATE[phase]
}
