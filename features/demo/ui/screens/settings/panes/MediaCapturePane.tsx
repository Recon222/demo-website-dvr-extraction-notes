'use client'

import { Toggle } from '@/features/demo/ui/screens/_shared'
import {
  MAX_DURATION_OPTIONS,
  VIDEO_CODEC_OPTIONS,
  VIDEO_QUALITY_OPTIONS,
  clampPhotoQuality,
  photoQualityPercent,
  type MaxVideoDurationOption,
  type VideoCodecOption,
  type VideoQualityOption,
} from '@/features/demo/engine/content/settings-values'
import {
  PaneDescription,
  PaneGroup,
  PaneNote,
  PaneSelect,
  PaneSlider,
  PaneStubNote,
} from '@/features/demo/ui/screens/settings/panes/_pane-chrome'
import type { SettingsPaneProps } from '@/features/demo/ui/screens/settings/panes/pane-props'

/**
 * Detail pane: **Media Capture** (matrix row 88; phone `MediaCaptureSettingsSection.tsx`).
 *
 * The phone's seven controls, in its order, with its verbatim labels, helper text and option
 * lists. Two of its conditional notes ARE ported and fire for real, because they describe what
 * the SETTING means rather than what the device did: the Unlimited-duration warning and the
 * shutter-sound-off legal note.
 *
 * Two of its conditionals are deliberately NOT ported:
 *
 * 1. **The three GPS-permission notes.** They are driven by a real
 *    `Location.getForegroundPermissionsAsync()` read, and the granted arm says "GPS coordinates
 *    will be embedded in captured media" — which would be flatly false here (the demo writes no
 *    EXIF). Reading the browser's geolocation permission just to print a sentence about
 *    something that never happens is the fabricated-capability trap, so the pane note carries
 *    the truth instead.
 * 2. **The non-iOS codec branch** (`disabled` picker + "only available on iOS. Android devices
 *    use their default codec"). The demo's frame is an iPhone — every other surface in this
 *    feature replicates the iOS build — and a browser is not Android, so printing the Android
 *    note here would be a third platform's story. The picker renders enabled, as it does on the
 *    device this demo mirrors.
 */
export function MediaCapturePane({ settings, onChange }: SettingsPaneProps) {
  return (
    <div data-testid="settings-pane-media-capture">
      <PaneStubNote>
        The demo captures through the browser (<code>getUserMedia</code> /{' '}
        <code>MediaRecorder</code>), which exposes none of these knobs — quality, codec, duration
        cap and shutter sound are the camera app&apos;s to choose, and nothing captured here
        carries EXIF, so no GPS is ever embedded. On the phone every one of these is applied at
        the capture itself.
      </PaneStubNote>

      <PaneDescription>
        Configure photo and video capture quality, codecs, and metadata options. These settings
        affect all media captured in the app.
      </PaneDescription>

      <PaneGroup
        label="Photo Quality"
        value={`${photoQualityPercent(settings.photoQuality)}%`}
        help="JPEG compression quality. Higher values produce larger files with better detail."
      >
        <PaneSlider
          label="Photo Quality"
          testId="photo-quality-slider"
          value={settings.photoQuality}
          // R-7: the announced value is the one on screen. The scalar this input is bound to
          // (0.5–1.0) is not a number this pane ever shows.
          valueText={`${photoQualityPercent(settings.photoQuality)}%`}
          min={0.5}
          max={1}
          step={0.05}
          onChange={(v) => onChange({ photoQuality: clampPhotoQuality(v) })}
          minLabel="50% (Smallest)"
          maxLabel="100% (Best)"
        />
      </PaneGroup>

      <PaneGroup
        label="Video Quality"
        help="Resolution for video recordings. Higher resolution requires more storage."
      >
        <PaneSelect
          a11yLabel="Video Quality"
          value={settings.videoQuality}
          options={VIDEO_QUALITY_OPTIONS}
          onChange={(videoQuality) => onChange({ videoQuality })}
        />
      </PaneGroup>

      <PaneGroup
        label="Video Codec"
        help="H.264 offers maximum compatibility. H.265 provides better compression."
      >
        <PaneSelect
          a11yLabel="Video Codec"
          value={settings.videoCodec}
          options={VIDEO_CODEC_OPTIONS}
          onChange={(videoCodec) => onChange({ videoCodec })}
        />
      </PaneGroup>

      <PaneGroup
        label="Maximum Video Duration"
        help={'Recording automatically stops after this duration. Select "Unlimited" for no limit.'}
      >
        <PaneSelect
          a11yLabel="Maximum Video Duration"
          value={settings.maxVideoDuration}
          options={MAX_DURATION_OPTIONS}
          onChange={(maxVideoDuration) => onChange({ maxVideoDuration })}
        />
        {/* R-34: this note APPEARS in response to the picker above it, so a focus-mode visitor
            gets no signal it arrived. `role="status"` is the repo's idiom for exactly that
            (`MediaCaptureScreen.tsx:530`) — polite, so it never interrupts the picker itself. */}
        {settings.maxVideoDuration === 0 && (
          <PaneNote tone="warning" role="status">
            Warning: Unlimited recording may result in very large files and storage issues.
          </PaneNote>
        )}
      </PaneGroup>

      <PaneGroup
        label="GPS Location in Media"
        help="Embed GPS coordinates in photo/video metadata (EXIF). Useful for documenting evidence location."
      >
        <Toggle
          label="Include GPS coordinates"
          on={settings.gpsInMedia}
          onClick={() => onChange({ gpsInMedia: !settings.gpsInMedia })}
        />
      </PaneGroup>

      <PaneGroup
        label="Shutter Sound"
        help="Play sound when capturing photos. Some regions require this to be enabled by law."
      >
        <Toggle
          label="Enable shutter sound"
          on={settings.shutterSound}
          onClick={() => onChange({ shutterSound: !settings.shutterSound })}
        />
        {!settings.shutterSound && (
          <PaneNote tone="warning" role="status">
            Note: Silent capture may not be legal in all regions. Check local laws.
          </PaneNote>
        )}
      </PaneGroup>

      <PaneGroup
        label="Skip Image Processing"
        help="When enabled, skips rotation/scaling for faster capture. May result in incorrect orientation."
      >
        <Toggle
          label="Skip post-processing"
          on={settings.skipProcessing}
          onClick={() => onChange({ skipProcessing: !settings.skipProcessing })}
        />
      </PaneGroup>
    </div>
  )
}
