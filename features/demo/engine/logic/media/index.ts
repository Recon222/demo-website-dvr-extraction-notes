/**
 * The media-capture capability's pure core (parity P4.1) — permission states, device
 * selection, the recording lifecycle, the capture→`MediaItem` mapping and the sample
 * fallback. Browser I/O lives one layer up in `ui/inputs/capture-media.ts`; the hooks the
 * P4 screens actually mount are `ui/inputs/useMediaCapture.ts`.
 *
 * Internal barrel, mirroring `engine/logic/notes/`. Consumers inside the feature may import
 * either from here or from the specific module; nothing outside `features/demo` imports any
 * of it (the feature's only public export is `DemoExperience`).
 */

export {
  CAPTURE_ERROR_CODES,
  CAPTURE_FACILITIES,
  CAPTURE_PERMISSION_COPY,
  CAPTURE_PERMISSION_STATES,
  captureFailure,
  captureFailureMessage,
  classifyCaptureError,
  permissionAfterFailure,
  type CaptureErrorCode,
  type CaptureFacility,
  type CaptureFailure,
  type CapturePermission,
} from '@/features/demo/engine/logic/media/permissions'

export {
  facilityForDeviceKind,
  positionalDeviceLabel,
  selectCaptureDevice,
  toCaptureDevices,
  type CaptureDevice,
  type MediaDeviceInfoLike,
} from '@/features/demo/engine/logic/media/devices'

export {
  AUDIO_MIME_CANDIDATES,
  IDLE_RECORDING,
  MAX_RECORDING_DURATION_MS,
  MIN_RECORDING_DURATION_MS,
  PHONE_MEDIA_EXTENSIONS,
  VIDEO_MIME_CANDIDATES,
  beginRecording,
  canStopRecording,
  extensionForMimeType,
  formatDuration,
  formatFileSize,
  hasReachedMaxDuration,
  isActiveRecording,
  pauseRecording,
  pickRecorderMimeType,
  recordedMs,
  recorderMimeCandidates,
  resumeRecording,
  stopRecording,
  type RecordingPhase,
  type RecordingState,
} from '@/features/demo/engine/logic/media/recording'

export {
  MAX_FILENAME_LENGTH,
  MEDIA_EXPIRED_NOTICE,
  buildMediaItem,
  isDurableMediaUrl,
  isMediaAvailable,
  isValidFilename,
  mediaFilename,
  sanitizeFilename,
  withoutEphemeralMedia,
  withoutEphemeralMediaUrls,
  type CapturedMedia,
} from '@/features/demo/engine/logic/media/captured'

export {
  SAMPLE_MEDIA,
  SAMPLE_MEDIA_BASE,
  SAMPLE_MEDIA_NOTICE,
  facilityForKind,
  toSampleCapture,
  type SampleMediaAsset,
} from '@/features/demo/engine/logic/media/samples'
