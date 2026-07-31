import type { LocationForm } from '@/features/demo/engine/types'

/**
 * Demo content shared by the import pipeline and the store.
 *
 * `SAMPLE_REQUEST_DOC` is the detective email the AI import extracts from — it exercises
 * every field of the import mapper and is the fallback document when the live model is
 * unavailable (see ui/import/run-import.ts). The demo itself boots EMPTY (owner decision:
 * the visitor creates everything; the guided tour and its seed case were removed with it).
 *
 * `OCR_SAMPLE_FRAMES` is the same idea for the OCR chapter: a browser has no camera, so every
 * "capture" is one of these DVR-display strings put through the real `cleanOcrText` →
 * `readDvrTimestamp` path. Nothing about the result is faked — only the frame is.
 */

/** Which sample DVR display the OCR pipeline reads. */
export type OcrSampleFrame = 'clean' | 'ambiguous' | 'timeOnly'

/**
 * The sample DVR displays.
 *
 * `clean` is the marquee frame — year-first, unambiguous, and a stable 00:05:30 against the
 * demo's sample "actual" instant. The other two exist because the confirmation step's two hard
 * cases would otherwise be unreachable in a cameraless demo:
 *  - `ambiguous` — 06 vs 07, with a year deliberately outside the resolver's proximity window
 *    (`year < currentYear - 1`), which pins the resolution at `confidence: 'low'` so the
 *    warning actually renders for any visitor from 2026 on (deferred §37c). A DVR whose clock
 *    is a couple of years stale is the normal case in this domain, not a contrivance.
 *  - `timeOnly` — a clock with no date at all: the `assumedDate` path.
 */
export const OCR_SAMPLE_FRAMES: Record<OcrSampleFrame, string> = {
  clean: '2025-03-08 12:05:30',
  ambiguous: '06/07/2024 23:45:30',
  timeOnly: '12:05:30',
}

/** Fallback "actual" instant for the OCR chapter when no real sync has been run yet. */
export const SAMPLE_ACTUAL_TIME = '2025-03-08 12:00:00'

/** Fixed OCR score for the sample frames — there is no recogniser here to score against. */
export const OCR_SAMPLE_CONFIDENCE = 0.93

export const SAMPLE_REQUEST_DOC = `From: det.mchugh.4471@peelpolice.ca
To: Video Services Unit
Subject: Video request — Kim's Convenience break & enter

Hey,

Following up on occurrence PR25-0098213. I need to grab video from Kim's Convenience at 1450 Eglinton Ave W in Mississauga. The on-site manager is Sandeep Gill — best number for him is 905-555-0142.

We're after footage covering the rear entrance and the till area (cameras 3, 4 and 7) between 11:45 PM on March 8 2025 and 1:30 AM on March 9 2025. That's real / wall-clock time — the recorder clock might be off.

It's a Hikvision DS-7608 unit, holds about 35 days before it overwrites. Login is admin / Sp1ce2024 if you need it. There is a monitor on site.

Thanks,
Det. Liam McHugh #4471
Central Robbery`

/** A blank location form — empty arrays/strings.
 *  Exported so the store reuses one definition when creating new locations. */
export function blankLocationForm(): LocationForm {
  return {
    scopes: [],
    extractedScopes: [],
    extractedScopesPartial: false,
    arrivalDepartures: [],
    timeOffset: null,
    dvr: {
      dvrLocation: '',
      dvrTypeBrand: '',
      serialModelNumber: '',
      dvrUsername: '',
      dvrPassword: '',
      numberOfChannels: '',
      activeCameras: '',
      recordingSchedule: 'continuous',
      resolution: '',
      recordingFps: '',
      firstRecordedDate: '',
      totalDvrRetention: '',
    },
    cameras: [],
    export: {
      exportMedia: '',
      fileType: '',
      sizeGb: '',
      mediaPlayerIncluded: false,
      mediaProvidedVia: '',
    },
    notesText: '',
    notesEdited: false,
    dateTimeCompleted: '',
    completedBy: '',
    completed: false,
    media: { photos: [], videos: [], audios: [] },
  }
}

