/**
 * SEAM(U7.2): the camera surfaces' own chrome palette. Matrix A91 (why it is a NAMED CONSTANT
 * BLOCK and not a theme token set), decision D17 (why its values are FROZEN).
 *
 * ## A91: named constants, never theme tokens
 *
 * The photo/video camera and the OCR camera are phone-camera-native rather than glass
 * navy/cyan: black scrims, white, and iOS system red. The phone agrees at `dd5551ec` —
 * `VisionCameraScreen` and friends are still hardcoded-dark with raw literals and did NOT adopt
 * `ForceColorScheme`. So, exactly as `screens/import/terminal-palette.ts`, these live in one
 * owned module beside the feature that paints them and are **not** resolved to `colors.*`.
 * A91's rider is binding: do not "tokenise" them to the app ground.
 *
 * ## D17: the values are FROZEN. This module moved none of them.
 *
 * Every literal below is byte-identical to the site it replaced, so the camera renders
 * pixel-for-pixel what it rendered before. D17 permitted exactly two value changes and **both
 * are no-ops for this codebase** (measured; U7.2 report R-3/R-4):
 *
 * 1. *"`PermissionsView`'s `#007AFF` → `primaryDark`"* — a case-insensitive sweep of the whole
 *    of `features/demo/` returns ZERO hits for that hex (control: the same sweep for the primary
 *    blue hits 30 files). The demo never invented a system blue; `MediaCaptureScreen`'s
 *    permission stage already grants through `buttonStyle()`, whose fill IS
 *    `PrimaryButtonGradient.dark` — i.e. `primaryDark` — since U2.2.
 * 2. *"`CameraControls`' button scrim → `overlay` at 90%"* — the phone component that changed is
 *    `ocr-time-capture/components/CameraControls.tsx:72,82`, whose 52pt control circles sit
 *    INSIDE a full-bleed camera preview; its own comment (`:131-137`) measures a white icon over
 *    a bright DVR monitor at 2.85:1 and deepens the fill to fix it. The demo's OCR aim stage has
 *    no such control: its viewfinder is a bounded `aspectRatio` box and Cancel / switch-camera
 *    sit BELOW it on the opaque shell, painted with no fill at all. There is nothing over the
 *    feed to deepen. The demo's one 40%-black control circle is the PHOTO/VIDEO camera's, which
 *    maps to `VisionCameraScreen.tsx:779` — still `rgba(0, 0, 0, 0.4)` on the phone today, so
 *    deepening it would be drift AWAY from the phone on the surface D17 froze.
 *
 * ## The count: SEVEN occurrences, FIVE distinct alphas — not four, and not six
 *
 * D17 says "the four black-scrim alphas"; `partner-legwork-w3.md` W3-C6 corrects it to six.
 * Measured at this base, case-insensitive, both `rgba()` spacings: SEVEN occurrences across the
 * two camera screens, at FIVE distinct alphas (0.4, 0.5, 0.6 twice, 0.88 twice, 0.9) — one of
 * them a gradient stop and one a `textShadow` rather than a flat fill. That census is history the
 * moment this module lands, so it is not asserted as a number; what
 * `__tests__/camera-chrome.test.ts` asserts instead is that ZERO of them come back, which is the
 * invariant a stale count was only ever standing in for.
 *
 * ## One frozen value that does NOT match the phone, recorded rather than fixed
 *
 * `guideMask` is a black wash. Its phone counterpart is `BoundingBoxOverlay.tsx:87` —
 * `withAlpha(colors.background, BOUNDING_BOX_UI.darkOverlayOpacity)`, i.e. the app background at
 * 60%, a navy wash inside a forced-dark subtree. The ALPHA agrees (`ocr-time-capture/constants/
 * index.ts:53`); the COLOUR does not. Changing it is a third value change D17 does not authorise
 * and this package did not take. See the U7.2 report's deferral proposal.
 *
 * ## Why these are not added to `glass-tokens.test.ts`'s banned-literal list
 *
 * That list's own rule, stated at the recessed-well entries: a value is banned only when it
 * "cannot be reached for innocently". These are ordinary blacks. The 50% one alone is live at
 * TEN further sites under `ui/` (measured, both spacings, comments excluded — four drop shadows,
 * a map halo, a preview border, and light's `overlay`/`scrim`), so a repo-wide ban would misfile
 * every one of them as camera re-drift. The guard here is SCOPED to the two camera screens
 * instead — same teeth, no false reds, and `TOKEN_MODULES` (whose docblock calls appending to it
 * "a reviewable act") is untouched.
 */
export const CAMERA_CHROME = {
  /**
   * The 48pt control circle behind the top-bar glyphs. Phone `VisionCameraScreen.tsx:779`,
   * byte-identical.
   */
  controlScrim: 'rgba(0,0,0,0.4)',
  /** The photo/video mode pill's track. Phone `ModeToggle.tsx:173`, byte-identical. */
  modePillScrim: 'rgba(0,0,0,0.5)',
  /** The recording-timer pill. Phone `RecordingIndicator.tsx:91`, byte-identical. */
  indicatorScrim: 'rgba(0,0,0,0.6)',
  /**
   * The mask outside the OCR guide box. Demo-only COLOUR — see the docblock; the phone washes
   * its app background at this same 0.6.
   *
   * SEAM(U7.3): U7.3 opens `OcrCaptureScreen` for the confirm-stage tiers, the assumed-date
   * Banner, D13's mono split and A93's copy sweep. It should NOT change this value — D17 froze
   * it and U7.2 deliberately left it — but it is the package standing next to the deferral, so
   * the marker lives here.
   */
  guideMask: 'rgba(0,0,0,0.6)',
  /**
   * Bottom edge of the fade under both cameras' control zones, used as the opaque stop of a
   * `linear-gradient(0deg, …, transparent)`. DEMO-ONLY: the phone's bottom controls carry no
   * scrim at all (`VisionCameraScreen.tsx:330-340` is bare positioning), so there is nothing to
   * lift and nothing to drift from.
   */
  controlBarFade: 'rgba(0,0,0,0.88)',
  /**
   * `textShadow` under the aim instruction, which is white text laid directly over the live
   * feed. Demo-only: the phone renders the same copy (`CameraInstructions.tsx:20`) on its own
   * surface and needs no shadow.
   */
  instructionShadow: 'rgba(0,0,0,0.9)',
  /**
   * Glyphs and labels ON the feed. Phone `VisionCameraScreen.tsx:651` spells `#FFFFFF`; the two
   * demo camera screens carry eleven white literals in BOTH spellings (8 short, 3 long,
   * measured) and the short form is kept, so this module moves no rendered byte — they are the
   * same colour, and every sweep in this repo is case-insensitive by construction (§4.7).
   */
  onCamera: '#fff',
  /**
   * iOS system red — deliberately NOT the demo's `error`, and D17 freezes it by name. The
   * recording dot and the record-button disc are camera hardware affordances, not status.
   * Phone `VisionCameraScreen`'s recording chrome, unchanged at `dd5551ec`.
   */
  recording: '#FF3B30',
} as const
