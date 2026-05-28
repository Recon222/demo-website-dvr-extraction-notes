import type { Feature } from './types'

/**
 * The feature catalog. Copy is first-draft, derived from
 * docs/planning/02-app-feature-inventory.md, and is utility-first per the
 * forensic-restraint rule — only `time-calibration` leans into the courtroom
 * framing, which is the one sanctioned exception. Numbers/claims are pending
 * sign-off; the one-liner and final wording are open decisions (doc 07).
 *
 * Media/diagram paths point at intended /public locations; assets are produced
 * separately and the page renders placeholders until they exist.
 */
export const features: readonly Feature[] = [
  {
    slug: 'time-calibration',
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
    order: 1,
  },
  {
    slug: 'import',
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
    slug: 'reports',
    eyebrow: 'Notes & reports',
    title: 'The write-up, already written',
    painLine:
      'After the field work, you still have to write the notes and the report — by hand, every time.',
    rows: [
      {
        heading: 'Notes generate themselves',
        body: 'Everything you enter across the wizard is aggregated into clean bullet-point notes — regenerated only when something actually changes.',
        media: 'demos/reports/notes.mp4',
      },
      {
        heading: 'One tap to a finished PDF',
        body: 'Produce a complete case-notes report from the data you already captured. You verify; the app types.',
        media: 'demos/reports/pdf.mp4',
      },
    ],
    diagram: {
      src: 'diagrams/reports.svg',
      caption: 'Every field you enter → aggregator → bullet notes plus a finished PDF report.',
    },
    priority: 'p0',
    order: 3,
  },
  {
    slug: 'evidence-capture',
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
    order: 4,
  },
  {
    slug: 'map',
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
    slug: 'camera-gps',
    eyebrow: 'Camera positions',
    title: 'GPS-mark every camera',
    painLine:
      "Back at the office, 'where exactly was each camera?' is hard to reconstruct from memory.",
    rows: [
      {
        heading: 'Mark them on site',
        body: 'Stand under each camera and capture its GPS position with multi-sample accuracy.',
        media: 'demos/camera-gps/mark.mp4',
      },
      {
        heading: 'Tied to the location',
        body: "Each camera's position is saved against the location it belongs to.",
        media: 'demos/camera-gps/list.mp4',
      },
    ],
    diagram: {
      src: 'diagrams/camera-gps.svg',
      caption: 'Walk the site, mark each camera, and keep every position tied to its location.',
    },
    priority: 'p1',
    order: 6,
  },
  {
    slug: 'secure-export',
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
    order: 7,
  },
  {
    slug: 'on-device',
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
    order: 8,
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
