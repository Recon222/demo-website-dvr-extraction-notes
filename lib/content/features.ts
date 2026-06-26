import type { Feature } from './types'

/**
 * The feature catalog. Display/nav order is governed by each entry's `order` field —
 * `getAllFeatures()` sorts by it, not by array position (the two happen to coincide
 * today). Copy is first-draft, derived from docs/planning/02-app-feature-inventory.md,
 * utility-first per the forensic-restraint rule — `time-calibration` leans hardest into
 * the courtroom framing, with `reports` referencing court-readiness; the rest stay
 * utility-first.
 *
 * `navLabel` is the short second-row button text (provided by Kris). `title`/`eyebrow`
 * are being rewritten separately.
 *
 * STATUS NOTES (per Kris):
 *  - `notes` ("Notes Wizard") content is DRAFT — we discuss Notes before finalizing.
 *  - `reports` content is PROVISIONAL — finalized LAST, since it summarizes the output
 *    of the other features.
 *
 * Media/diagram paths point at intended /public locations; assets are produced
 * separately and the page renders placeholders until they exist.
 */
export const features: readonly Feature[] = [
  {
    slug: 'cases-locations',
    navLabel: 'Cases & Locations',
    eyebrow: 'Cases & locations',
    title: 'Every case, every location, in order',
    painLine:
      'One recovery job can span a dozen addresses, and the files for each scatter the moment you start.',
    rows: [
      {
        heading: 'One case, many locations',
        body: 'Open a case by occurrence number, then add a location for each address — every location keeps its own details, media, and report.',
        media: 'demos/cases-locations/cases.mp4',
      },
      {
        heading: 'Filed on disk, automatically',
        body: 'Each location gets its own folders for photos, video, audio, and documents — created as you go and named so nothing breaks when you rename a case.',
        media: 'demos/cases-locations/locations.mp4',
      },
      {
        heading: 'Duplicate a repeat visit',
        body: 'Going back to the same site? Duplicate a location — with or without its requested scopes — instead of re-typing everything.',
      },
    ],
    diagram: {
      src: 'diagrams/cases-locations.svg',
      caption: 'Case → locations → media & documents: one tidy tree per job.',
    },
    priority: 'p1',
    order: 1,
  },
  {
    slug: 'import',
    navLabel: 'Import Request',
    eyebrow: 'Request import',
    title: 'The case fills itself in',
    painLine:
      'Re-typing a recovery request — case number, address, requester, time windows — is slow and error-prone.',
    rows: [
      {
        heading: 'Drop in the request',
        body: 'Import an agency PDF or an email request and the app pulls out the details. Structured agency formats import instantly.',
        media: 'demos/import/select.mp4',
      },
      {
        heading: 'On-device AI — nothing leaves the phone',
        body: "Apple's on-device intelligence reads the document and pre-fills the submission. No document content is ever sent to a server.",
        media: 'demos/import/autofill.mp4',
      },
    ],
    diagram: {
      src: 'diagrams/import.svg',
      caption: 'Request (PDF or email) → on-device AI → structured case fields, entirely on your phone.',
    },
    priority: 'p0',
    order: 2,
  },
  {
    // PLACEHOLDER — Kris is writing the Notes copy. The notes screens hold a lot of
    // domain knowledge: captured fields partly feed the auto-generated bullets and
    // partly make up the report. Header is "Notes"; text areas are intentionally
    // "placeholder" until Kris's copy lands.
    slug: 'notes',
    navLabel: 'Notes Wizard',
    eyebrow: 'placeholder',
    title: 'Notes',
    painLine: 'placeholder',
    rows: [
      {
        heading: 'placeholder',
        body: 'placeholder',
        media: 'demos/notes/generate.mp4',
      },
      {
        heading: 'placeholder',
        body: 'placeholder',
        media: 'demos/notes/review.mp4',
      },
    ],
    diagram: {
      src: 'diagrams/notes.svg',
      caption: 'placeholder',
    },
    // Unfinished: stays visible in the nav/grid and renders a "Draft" badge, but is
    // exempt from the placeholder-copy guard until Kris's copy lands. Drop when done.
    draft: true,
    priority: 'p0',
    order: 3,
  },
  {
    slug: 'location',
    navLabel: 'Location',
    eyebrow: 'Location & GPS',
    title: 'Pin the site and every camera',
    painLine:
      "Back at the office, 'where exactly was this — and where were the cameras?' is hard to reconstruct from memory.",
    rows: [
      {
        heading: 'Use my location, or just the address',
        body: 'Drop the site with one tap using multi-sample GPS (accuracy-filtered), or type the address with autocomplete — it geocodes either way.',
        media: 'demos/location/use-location.mp4',
      },
      {
        heading: 'GPS-mark every camera on site',
        body: 'Stand under each camera and capture its position, tied to the location it belongs to.',
        media: 'demos/location/camera.mp4',
      },
    ],
    diagram: {
      src: 'diagrams/location.svg',
      caption: 'Address ⇄ coordinates, plus a GPS pin for every camera.',
    },
    priority: 'p1',
    order: 4,
  },
  {
    slug: 'map',
    navLabel: 'Map',
    eyebrow: 'Case map',
    title: 'Your whole case on a map',
    painLine:
      'Multi-location cases are hard to hold in your head — and reaching a contact means digging for a number.',
    rows: [
      {
        heading: 'Every location, one view',
        body: 'See all the locations in a case on a live map, so the shape of the job is obvious at a glance.',
        media: 'demos/map/map.mp4',
      },
      {
        heading: 'Contacts one tap away',
        body: 'Tap a pin to call or email the requesting investigator or the on-site contact, right from the map.',
        media: 'demos/map/contacts.mp4',
      },
    ],
    priority: 'p1',
    order: 5,
  },
  {
    slug: 'time-calibration',
    navLabel: 'Time Offset',
    eyebrow: 'Time calibration',
    title: 'The timestamp you can defend',
    painLine:
      "DVR clocks are almost always wrong — and proving your own device's time was right is the question that ends people on the stand.",
    rows: [
      {
        heading: "Read the DVR clock — don't retype it",
        body: 'Point your phone at the on-screen timestamp. On-device text recognition reads it for you: no transcription, no typos.',
        media: 'demos/time-calibration/ocr.mp4',
      },
      {
        heading: 'Calibrate against an atomic clock, at the moment of capture',
        body: 'The app reaches a regional atomic-clock time server the instant you capture, computes the offset between DVR time and real time, and falls back to an HTTP time source when the network blocks NTP.',
        media: 'demos/time-calibration/sync.mp4',
      },
    ],
    diagram: {
      src: 'diagrams/time-calibration.svg',
      caption:
        'The traceability chain printed into every Time Offset Report: DVR clock → phone OCR → NTP server → atomic clock → UTC → your offset.',
    },
    priority: 'p0',
    order: 6,
  },
  {
    slug: 'evidence-capture',
    navLabel: 'Media Capture',
    eyebrow: 'Evidence capture',
    title: 'Photos, video, and audio — filed for you',
    painLine: 'Scene media ends up scattered in your camera roll, cut off from the case.',
    rows: [
      {
        heading: 'Capture inside the case',
        body: "Shoot photo and video at native resolution and record audio with a live waveform — all from inside the location you're documenting.",
        media: 'demos/evidence-capture/capture.mp4',
      },
      {
        heading: 'Organized automatically',
        body: "Every file lands in the right location's folder, sorted into photos, videos, and audio. No renaming or sorting later.",
        media: 'demos/evidence-capture/library.mp4',
      },
    ],
    diagram: {
      src: 'diagrams/evidence-capture.svg',
      caption: 'Case → locations → photo, video, and audio folders, organized as you capture.',
    },
    priority: 'p1',
    order: 7,
  },
  {
    // PROVISIONAL — Reports content finalized LAST; it summarizes the other features' output (per Kris).
    slug: 'reports',
    navLabel: 'Reports',
    eyebrow: 'Reports',
    title: 'The report, generated for you',
    painLine: 'The court-ready write-up still has to be produced, formatted, and complete — every time.',
    rows: [
      {
        heading: 'One tap to the full report',
        body: 'Generate the complete case-notes PDF — every section assembled from the data you already captured.',
        media: 'demos/reports/pdf.mp4',
      },
      {
        heading: 'Calibration proof, attached',
        body: 'The Time Offset Report rides along: the cropped timestamp image, the sync details, and the traceability chain.',
        media: 'demos/reports/time-offset.mp4',
      },
    ],
    diagram: {
      src: 'diagrams/reports.svg',
      caption: 'All your captured data → the case-notes report, plus the time-offset report.',
    },
    priority: 'p0',
    order: 8,
  },
  {
    slug: 'secure-export',
    navLabel: 'Encrypted Export',
    eyebrow: 'Secure handoff',
    title: 'Package the whole case, encrypted',
    painLine: 'Delivering a case means bundling the report and all the media — securely.',
    rows: [
      {
        heading: 'One encrypted package',
        body: 'Export a location or an entire case as a password-protected archive — documents and media together, in a tidy folder structure.',
        media: 'demos/secure-export/export.mp4',
      },
      {
        heading: 'Your password, your control',
        body: 'You set the encryption password, and you can gate exports behind Face ID.',
        media: 'demos/secure-export/share.mp4',
      },
    ],
    diagram: {
      src: 'diagrams/secure-export.svg',
      caption: 'Case → password-protected encrypted archive → shared on your terms.',
    },
    priority: 'p1',
    order: 9,
  },
  {
    slug: 'on-device',
    navLabel: 'Security and Privacy',
    eyebrow: 'Privacy by design',
    title: 'On your device, under your control',
    painLine: 'Evidence software that quietly ships data to a vendor cloud is a non-starter.',
    rows: [
      {
        heading: 'It stays on the phone',
        body: 'Case data lives in an encrypted database on your device, behind a biometric lock. On-device AI means documents never leave.',
      },
      {
        heading: 'You decide what leaves',
        body: 'The only things that touch the network are time servers, map look-ups, and anonymous crash reports — never your case data.',
      },
    ],
    diagram: {
      src: 'diagrams/on-device.svg',
      caption: 'What stays on your device versus the little that leaves — and exactly what it is.',
    },
    priority: 'p2',
    order: 10,
  },
]

/** All features sorted by display order. */
export function getAllFeatures(): readonly Feature[] {
  return [...features].sort((a, b) => a.order - b.order)
}

/** All feature slugs (definition order). */
export function getFeatureSlugs(): string[] {
  return features.map((feature) => feature.slug)
}

/** Look up a single feature by slug. */
export function getFeatureBySlug(slug: string): Feature | undefined {
  return features.find((feature) => feature.slug === slug)
}

/** Previous/next features in display order (no wraparound). Empty for unknown slugs. */
export function getAdjacentFeatures(slug: string): { prev?: Feature; next?: Feature } {
  const ordered = getAllFeatures()
  const index = ordered.findIndex((feature) => feature.slug === slug)

  if (index === -1) {
    return { prev: undefined, next: undefined }
  }

  return {
    prev: index > 0 ? ordered[index - 1] : undefined,
    next: index < ordered.length - 1 ? ordered[index + 1] : undefined,
  }
}
