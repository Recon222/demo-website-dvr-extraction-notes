import type { DemoCase, DemoLocation, LocationForm } from '@/lib/demo/types'

/**
 * The canonical guided-tour content. Everything here is tagged `isSeed: true` so the
 * sandbox's `reset()` can drop it cleanly — seed and visitor-created data never mix.
 *
 * `SAMPLE_REQUEST_DOC` is the detective email the AI-import chapter extracts from; it
 * exercises every field of the import mapper.
 */

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

/** A blank location form — empty arrays/strings; the guided tour types into it live. */
function blankForm(): LocationForm {
  return {
    scopes: [],
    extractedScopes: [],
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
    media: { photos: [], videos: [], audios: [] },
  }
}

export const SEED_CASE: DemoCase = {
  id: 'seed-case',
  caseNumber: 'PR25-0098213',
  displayName: "Kim's Convenience — B&E",
  unit: 'Central Robbery',
  oicName: 'L. McHugh',
  oicBadge: '4471',
  vcName: '',
  vcBadge: '',
  status: 'draft',
  createdLabel: 'Mar 9, 2025',
  isSeed: true,
  locationIds: ['seed-loc'],
}

export const SEED_LOCATION: DemoLocation = {
  id: 'seed-loc',
  caseId: 'seed-case',
  locationName: "Kim's Convenience",
  businessName: "Kim's Convenience",
  streetAddress: '1450 Eglinton Ave W',
  city: 'Mississauga',
  requesterName: 'Liam McHugh',
  requesterBadge: '4471',
  requesterPhone: '',
  requesterEmail: 'det.mchugh.4471@peelpolice.ca',
  locationContact: 'Sandeep Gill',
  locationPhone: '905-555-0142',
  isSeed: true,
  form: blankForm(),
}
