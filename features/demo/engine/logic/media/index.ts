/**
 * The media-capture capability's pure core (parity P4.1) — permission states, device
 * selection, the recording lifecycle, the capture→`MediaItem` mapping and the sample
 * fallback. Browser I/O lives one layer up in `ui/inputs/capture-media.ts`; the hooks the
 * P4 screens actually mount are `ui/inputs/useMediaCapture.ts`.
 *
 * Internal barrel, mirroring `engine/logic/notes/`: source consumers import from HERE
 * (`snapshotOf`'s media sweep, the three `ui/inputs` modules); the co-located unit tests
 * import the specific module they exercise. Nothing outside `features/demo` imports any of
 * it — the feature's only public export is `DemoExperience`.
 *
 * Deliberately NOT re-exported from `engine/index.ts`, following the `import-log` precedent
 * (review R-10): every consumer already reaches it by its module path, and advertising a
 * second surface with no callers is exactly the orphaned-barrel drift that convention exists
 * to prevent. Add it there alongside a consumer that needs it, not before.
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
  canStopAtElapsed,
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
  captureAvailability,
  sampleFallbackNotice,
  type CaptureAvailability,
  type CaptureSupport,
} from '@/features/demo/engine/logic/media/capability'

export {
  MAX_CAPTION_LENGTH,
  MAX_FILENAME_LENGTH,
  MEDIA_EXPIRED_NOTICE,
  buildMediaItem,
  collectMediaUrls,
  defaultCaptureBasename,
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
  DEFAULT_MEDIA_TAB,
  DELETE_MEDIA_TITLE,
  MAX_MEDIA_BADGE_COUNT,
  MEDIA_DELETED_NOTICE,
  MEDIA_LIBRARY_TABS,
  UNKNOWN_DURATION_LABEL,
  deleteMediaMessage,
  formatCapturedDate,
  mediaDurationLabel,
  mediaForTab,
  mediaLibraryCounts,
  mediaLibrarySubtitle,
  mediaLibraryTab,
  mediaTabBadge,
  type MediaBuckets,
  type MediaLibraryCounts,
  type MediaLibraryTab,
  type MediaLibraryTabId,
} from '@/features/demo/engine/logic/media/library'

export {
  NO_CAPTURE_STORAGE_NOTICE,
  NO_RECORDER_NOTICE,
  SAMPLE_MEDIA,
  SAMPLE_MEDIA_BASE,
  SAMPLE_MEDIA_NOTICE,
  facilityForKind,
  suggestedFilenameBase,
  toSampleCapture,
  type SampleMediaAsset,
} from '@/features/demo/engine/logic/media/samples'

export {
  RECORDER_SCALE_LABELS,
  SPECTRUM_BAR_COUNT,
  SPECTRUM_BIN_FRACTION,
  channelLabel,
  codecLabel,
  formatSampleRate,
  levelDbLabel,
  levelFillColor,
  recorderStatusColor,
  recorderStatusLabel,
  spectrumBars,
  timeOfDay,
  waveformLevel,
} from '@/features/demo/engine/logic/media/audio-levels'
