import type { Feature } from './types'

/**
 * The feature catalog. Declaration order IS display order: the evidence manifest,
 * the manifest tab strip, and prev/next all follow array position (zero-padded
 * index = the design's item number), so reordering the catalog reorders the site.
 *
 * Copy is transcribed from the Case-File design canvas
 * (`Homepage and feature redesign/design_handoff_case_file_site/DVR Site Directions.dc.html`),
 * which is FINAL design intent (see the handoff README §Fidelity):
 *  - `painLine` = the manifest "WHAT IT KILLS" line (short).
 *  - `intro` = the feature-page paragraph; `**bold**` marks the emphasized phrase.
 *  - `title` = short card/prev-next title; `headline` = the page H1 when it differs.
 *
 * STATUS NOTES (per Kris):
 *  - `notes` (03) is DRAFT — hatched placeholder copy ships until Kris's copy lands.
 *  - `reports` (08) copy is PROVISIONAL — finalized last (the `COPY PROVISIONAL` chip
 *    in the canvas is a review annotation and stays OFF production).
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
      'A dozen addresses per job, files scattering the moment you start — one tidy tree instead.',
    intro:
      'One recovery job can span a dozen addresses, and the files for each scatter the moment you start. Here the case is the container: **every address gets its own place, and everything you capture knows where it belongs.**',
    classLabel: 'FIELD',
    tip: {
      variant: 'gold',
      body: 'This is the spine everything else hangs off — the wizard, the media, the map, and the report all read from the same case tree.',
    },
    rows: [
      {
        kicker: '01 — THE CONTAINER',
        heading: 'One case, many locations',
        body: 'Open a case by occurrence number, then add a location for each address — every location keeps its own details, media, and report. The dashboard shows the whole job as a timeline of cases and their sites.',
        chips: ['OCCURRENCE №', 'PER-LOCATION DETAIL', 'STATUS DOTS'],
        recLabel: 'REC 01 — CASES',
        media: 'demos/cases-locations/cases.mp4',
      },
      {
        kicker: '02 — FILED ON DISK',
        heading: 'Folders that build themselves',
        body: "Each location gets its own folders for photos, video, audio, and documents — created as you go and named so nothing breaks when you rename a case. What you see in the app is exactly what's on disk.",
        chips: ['AUTO-CREATED', 'RENAME-SAFE', 'PHOTO / VIDEO / AUDIO / DOCS'],
        recLabel: 'REC 02 — LOCATIONS',
        media: 'demos/cases-locations/locations.mp4',
      },
      {
        kicker: '03 — REPEAT VISITS',
        heading: 'Duplicate a repeat visit',
        body: 'Going back to the same site? Duplicate a location — with or without its requested scopes — instead of re-typing everything.',
        chips: ['ONE TAP', '± SCOPES'],
      },
    ],
    diagram: {
      src: 'diagrams/cases-locations.svg',
      heading: 'One tidy tree per job',
      caption: 'Case → locations → media & documents: one tidy tree per job.',
    },
    betaStripLine: 'Stop babysitting folders.',
    priority: 'p1',
  },
  {
    slug: 'import',
    navLabel: 'Import Request',
    eyebrow: 'Request import',
    title: 'The case fills itself in',
    painLine:
      'Re-typing case numbers, addresses, requesters, time windows — the case fills itself in, on-device.',
    intro:
      'Every job starts with a request — a PDF, an email — and ten minutes of re-typing case numbers, addresses, requesters, and time windows into a form. **That step is gone.** Import the document and the case is waiting for your verification.',
    classLabel: 'CORE',
    tip: {
      variant: 'cyan',
      body: "The reading happens with Apple's on-device intelligence. The request — names, case numbers, everything in it — **never leaves the phone.** Not to us, not to anyone.",
    },
    rows: [
      {
        kicker: '01 — DROP IT IN',
        heading: 'Import the PDF or the email',
        body: 'Share the request straight into the app from Mail or Files. Structured agency formats import instantly; everything else goes to the model. Either way you never open a blank form again.',
        chips: ['PDF', 'EMAIL', 'SHARE SHEET'],
        recLabel: 'REC 01 — SELECT THE REQUEST',
        media: 'demos/import/select.mp4',
      },
      {
        kicker: '02 — WATCH IT FILL',
        heading: 'On-device AI reads it — nothing leaves the phone',
        body: "Apple's on-device intelligence pulls the case number, addresses, requester, and time windows into the submission, field by field, and shows you exactly what it found so you can verify before anything is saved.",
        chips: ['APPLE INTELLIGENCE', 'ON-DEVICE', 'VERIFY BEFORE SAVE'],
        recLabel: 'REC 02 — AI AUTOFILL',
        media: 'demos/import/autofill.mp4',
      },
    ],
    diagram: {
      src: 'diagrams/import.svg',
      heading: 'Where the document goes (nowhere)',
      caption:
        'Request (PDF or email) → on-device Apple Intelligence → structured case fields — entirely on your phone.',
    },
    betaStripLine: 'Ten minutes of re-typing, gone. Want it?',
    priority: 'p0',
  },
  {
    // DRAFT — Kris is writing the Notes copy. The design ships an honest draft state:
    // gold banner + hatched placeholder blocks whose copy is the canvas's own
    // scaffolding explainers (exempt from the placeholder guard via `draft`).
    slug: 'notes',
    navLabel: 'Notes Wizard',
    eyebrow: 'Notes wizard',
    title: 'The wizard that walks the scene with you',
    painLine: 'Copy pending — the wizard that walks the scene with you, field by field.',
    intro:
      "PAIN LINE LANDS HERE — one sentence naming what the notes grind used to cost. Kris writes this; the wizard's fields feed both the auto-generated bullets and the final report.",
    classLabel: 'CORE',
    tip: {
      variant: 'gold',
      body: 'Known already: the wizard captures the fields, the app writes the bullet-point notes and the formal report from them. You verify, the app types.',
    },
    rows: [
      {
        kicker: '01 — SECTION PENDING',
        heading: 'Section pending',
        body: 'HEADING + STORY LAND HERE — what the wizard asks on scene, in what order, and why the order matches the way the job actually unfolds. Recording at left shows the generate step.',
        recLabel: 'REC 01 — NOTES GENERATE',
        media: 'demos/notes/generate.mp4',
      },
      {
        kicker: '02 — SECTION PENDING',
        heading: 'Section pending',
        body: 'HEADING + STORY LAND HERE — reviewing the auto-written bullets against the scene before they become the report. Recording at right shows the review step.',
        recLabel: 'REC 02 — NOTES REVIEW',
        media: 'demos/notes/review.mp4',
      },
    ],
    diagram: {
      src: 'diagrams/notes.svg',
      heading: 'Fields in, notes and report out',
      caption: "Caption pending — lands with Kris's copy.",
    },
    draft: true,
    draftNote:
      "Copy pending — the Notes screens hold the deepest domain knowledge in the app, so this page ships last, written with Kris. Layout, slots, and structure are final; the words below are scaffolding.",
    priority: 'p0',
  },
  {
    slug: 'location',
    navLabel: 'Location',
    eyebrow: 'Location & GPS',
    title: 'Pin the site and every camera',
    headline: 'Pin the site — and every camera on it.',
    painLine:
      '"Where exactly was this — and where were the cameras?" GPS-pin the site and every camera on it.',
    intro:
      'Back at the office, "where exactly was this — and where were the cameras?" is hard to reconstruct from memory. Here it\'s captured while you\'re standing there: **the site gets coordinates, and every camera gets its own pin.**',
    classLabel: 'FIELD',
    tip: {
      variant: 'cyan',
      body: 'GPS fixes are multi-sampled and accuracy-filtered — a bad fix gets thrown out before it ever lands in your case.',
    },
    rows: [
      {
        kicker: '01 — THE SITE',
        heading: 'Use my location — or just type the address',
        body: 'Drop the site with one tap using multi-sample GPS, or type the address with autocomplete — it geocodes either way, so the location carries both the human-readable address and the coordinates.',
        chips: ['MULTI-SAMPLE GPS', 'ACCURACY-FILTERED', 'ADDRESS ⇄ COORDS'],
        recLabel: 'REC 01 — USE MY LOCATION',
        media: 'demos/location/use-location.mp4',
      },
      {
        kicker: '02 — THE CAMERAS',
        heading: 'Stand under it, mark it',
        body: 'GPS-mark every camera on site — literally stand under each one and capture its position, tied to the location it belongs to. Months later, the coverage picture is still exact.',
        chips: ['PER-CAMERA PIN', 'TIED TO LOCATION'],
        recLabel: 'REC 02 — MARK A CAMERA',
        media: 'demos/location/camera.mp4',
      },
    ],
    diagram: {
      src: 'diagrams/location.svg',
      heading: 'Address to coordinates, and back',
      caption: 'Address ⇄ coordinates, plus a GPS pin for every camera.',
    },
    betaStripLine: 'Never reconstruct a scene from memory again.',
    priority: 'p1',
  },
  {
    slug: 'map',
    navLabel: 'Map',
    eyebrow: 'Case map',
    title: 'Your whole case on a map',
    painLine:
      'The whole case on one map — tap a pin to call or email the investigator or site contact.',
    intro:
      'Multi-location cases are hard to hold in your head — and reaching a contact means digging for a number. On the map, **the shape of the job is obvious, and every contact is one tap away.**',
    classLabel: 'FIELD',
    tip: {
      variant: 'cyan',
      body: 'The pins carry people, not just places — the requesting investigator and the on-site contact ride with each location.',
    },
    rows: [
      {
        kicker: '01 — THE SHAPE OF THE JOB',
        heading: 'Every location, one view',
        body: 'See all the locations in a case on a live map — which sites are done, which are pending, and how the job lays out across town before you commit to a driving order.',
        chips: ['LIVE MAP', 'STATUS PINS', 'PER-CASE VIEW'],
        recLabel: 'REC 01 — CASE MAP',
        media: 'demos/map/map.mp4',
      },
      {
        kicker: '02 — THE PEOPLE',
        heading: 'Contacts one tap away',
        body: "Tap a pin to call or email the requesting investigator or the on-site contact, right from the map — no digging through the case for a phone number while you're double-parked.",
        chips: ['TAP TO CALL', 'TAP TO EMAIL', 'OIC + SITE CONTACT'],
        recLabel: 'REC 02 — PIN CONTACTS',
        media: 'demos/map/contacts.mp4',
      },
    ],
    // No "under the hood" section for the map (none in the catalog / canvas).
    betaStripLine: 'Hold the whole job in one view.',
    priority: 'p1',
  },
  {
    slug: 'time-calibration',
    navLabel: 'Time Offset',
    eyebrow: 'Time calibration',
    title: 'The timestamp you can defend',
    painLine:
      'The DVR clock is wrong. Yours is provably right — calibrated against atomic time at capture.',
    intro:
      "DVR clocks are almost always wrong. That's fine — expected, even. What ends people on the stand is the other clock: proving **your own device's time** was right. This app answers that question before it's asked.",
    classLabel: 'MARQUEE',
    tip: {
      variant: 'gold',
      body: "The old way: an external time site, a manual reference check, and a hand-typed note you'll be asked about a year later. The new way is a receipt, printed into every report.",
    },
    rows: [
      {
        kicker: '01 — READ',
        heading: "Read the DVR clock — don't retype it",
        body: 'Point your phone at the on-screen timestamp. On-device text recognition reads it for you — no transcription, no typos, and the cropped image of the clock rides along as proof of exactly what you saw.',
        chips: ['VISION OCR', 'CONFIDENCE SCORED', 'CROP SAVED'],
        recLabel: 'REC 01 — OCR CAPTURE',
        media: 'demos/time-calibration/ocr.mp4',
      },
      {
        kicker: '02 — SYNC',
        heading: 'Calibrated against an atomic clock, at the moment of capture',
        body: 'The instant you capture, the app reaches a regional atomic-clock time server, computes the offset between DVR time and real time, and prints the whole traceability chain into the report. If the network blocks NTP, it falls back to an HTTP time source — and says so.',
        chips: ['NTP POOL', 'HTTP FALLBACK', 'OFFSET ±MS'],
        recLabel: 'REC 02 — NTP SYNC',
        media: 'demos/time-calibration/sync.mp4',
      },
    ],
    diagram: {
      src: 'diagrams/time-calibration.svg',
      heading: 'The traceability chain, in plain language',
      caption:
        'The chain printed into every Time Offset Report: DVR clock → phone OCR → NTP server → atomic clock → UTC → your offset.',
    },
    betaStripLine: 'Want the receipt on your next scene?',
    priority: 'p0',
  },
  {
    slug: 'evidence-capture',
    navLabel: 'Media Capture',
    eyebrow: 'Evidence capture',
    title: 'Photos, video, and audio — filed for you',
    headline: 'Photos, video, audio — filed for you.',
    painLine:
      'Scene media scattered through your camera roll — captured inside the case, filed automatically.',
    intro:
      "Scene media ends up scattered in your camera roll, cut off from the case it belongs to. Here you shoot from inside the location — **and every file lands in the right folder the moment it's captured.**",
    classLabel: 'FIELD',
    tip: {
      variant: 'cyan',
      body: 'Native resolution, no compression games — what the sensor saw is what the case keeps.',
    },
    rows: [
      {
        kicker: '01 — INSIDE THE CASE',
        heading: 'Capture inside the case',
        body: "Shoot photo and video at native resolution and record audio with a live waveform — all from inside the location you're documenting, so nothing has to be matched up later.",
        chips: ['NATIVE RES', 'LIVE WAVEFORM', 'PHOTO / VIDEO / AUDIO'],
        recLabel: 'REC 01 — CAPTURE',
        media: 'demos/evidence-capture/capture.mp4',
      },
      {
        kicker: '02 — NO SORTING LATER',
        heading: 'Organized automatically',
        body: 'Every file lands in the right location\'s folder, sorted into photos, videos, and audio. No renaming, no sorting, no "which site was IMG_4471 from?" at your desk a week later.',
        chips: ['AUTO-FILED', 'PER-LOCATION LIBRARY'],
        recLabel: 'REC 02 — LIBRARY',
        media: 'demos/evidence-capture/library.mp4',
      },
    ],
    diagram: {
      src: 'diagrams/evidence-capture.svg',
      heading: 'Filed as you shoot',
      caption: 'Case → locations → photo, video, and audio folders, organized as you capture.',
    },
    betaStripLine: 'Your camera roll stays yours. The case keeps its own.',
    priority: 'p1',
  },
  {
    // PROVISIONAL — Reports copy finalized LAST; it summarizes the other features'
    // output (per Kris). The canvas's COPY PROVISIONAL chip is a review annotation
    // and intentionally does NOT ship.
    slug: 'reports',
    navLabel: 'Reports',
    eyebrow: 'Reports',
    title: 'The report, generated for you',
    painLine:
      "The write-up you'd still owe after all the field work — generated from what you already captured.",
    intro:
      "After the scene work is done, the write-up still has to be produced — formatted, complete, every time. Here it's already waiting: **everything you captured, assembled into the finished PDF.** You verify, the app types.",
    classLabel: 'CORE',
    tip: {
      variant: 'gold',
      body: 'Nothing in the report is invented. Every section is assembled from fields you entered and verified during the job — the report is the receipt for the work.',
    },
    rows: [
      {
        kicker: '01 — ONE TAP',
        heading: 'One tap to the full case-notes PDF',
        body: 'Every section assembled from the data you already captured — the case, each location, the scopes, the personnel, the media inventory. Formatted the same way every time, complete every time.',
        chips: ['AUTO-WRITTEN NOTES', 'FORMAL PDF', 'EVERY SECTION'],
        recLabel: 'REC 01 — GENERATE PDF',
        media: 'demos/reports/pdf.mp4',
      },
      {
        kicker: '02 — THE PROOF RIDES ALONG',
        heading: 'Calibration proof, attached',
        body: 'The Time Offset Report travels with the case notes: the cropped image of the DVR timestamp, the sync details, and the full traceability chain — so the time story is answered inside the same document.',
        chips: ['TIMESTAMP CROP', 'SYNC DETAILS', 'TRACEABILITY CHAIN'],
        recLabel: 'REC 02 — TIME OFFSET REPORT',
        media: 'demos/reports/time-offset.mp4',
      },
    ],
    diagram: {
      src: 'diagrams/reports.svg',
      heading: 'Everything you captured, one document out',
      caption: 'All your captured data → the case-notes report, plus the time-offset report.',
    },
    betaStripLine: 'Leave the scene with the report done.',
    priority: 'p0',
  },
  {
    slug: 'secure-export',
    navLabel: 'Encrypted Export',
    eyebrow: 'Secure handoff',
    title: 'Package the whole case, encrypted',
    headline: 'The whole case, sealed for handoff.',
    painLine:
      'Handing off a case means the report plus every file — one password-protected archive, your password.',
    intro:
      'Delivering a case means the report and every file that backs it — together, intact, and not readable by whoever finds the USB stick. One export: **documents and media in a tidy folder structure, inside a password-protected archive.**',
    classLabel: 'FIELD',
    tip: {
      variant: 'cyan',
      body: 'The password is yours — set by you, known to you, **never stored by us.** Exporting itself can be gated behind Face ID.',
    },
    rows: [
      {
        kicker: '01 — ONE PACKAGE',
        heading: 'Export a location — or the entire case',
        body: "Pick the scope and the app assembles everything that belongs to it: the reports, the photos, the video, the audio, the documents — in the same folder structure the app keeps on disk, so the recipient isn't guessing.",
        chips: ['PER-LOCATION', 'WHOLE CASE', 'TIDY FOLDER TREE'],
        recLabel: 'REC 01 — BUILD THE PACKAGE',
        media: 'demos/secure-export/export.mp4',
      },
      {
        kicker: '02 — YOUR PASSWORD',
        heading: 'Sealed with a password only you know',
        body: "The archive is encrypted with a password you set — hand it to the requester however your agency moves files, and the contents stay sealed in transit. Face ID can gate the export action itself, so a borrowed phone can't ship your cases.",
        chips: ['PASSWORD-PROTECTED', 'FACE ID GATE', 'SHARE ANYWHERE'],
        recLabel: 'REC 02 — SEAL & SHARE',
        media: 'demos/secure-export/share.mp4',
      },
    ],
    diagram: {
      src: 'diagrams/secure-export.svg',
      heading: 'Case to sealed archive, step by step',
      caption: 'Case → password-protected encrypted archive → shared on your terms.',
    },
    betaStripLine: 'Hand off your next case sealed.',
    priority: 'p1',
  },
  {
    slug: 'on-device',
    navLabel: 'Security and Privacy',
    eyebrow: 'Privacy by design',
    title: 'On your device, under your control',
    painLine:
      'Evidence software that phones home is a non-starter. Case data lives on your device, encrypted, behind Face ID.',
    intro:
      'Evidence software that quietly ships data to a vendor cloud is a non-starter. This one was built by someone whose own cases would be in it.',
    classLabel: 'TRUST',
    // No tip card — the two trust cards carry the page (canvas 4f).
    layout: 'trust-cards',
    rows: [
      {
        kicker: '01 — IT STAYS ON THE PHONE',
        heading: 'Encrypted, local, biometric-locked',
        body: 'Case data lives in an encrypted database on your device, behind a biometric lock. On-device AI means even the request documents never leave. There is no vendor cloud to breach.',
        accent: 'cyan',
      },
      {
        kicker: '02 — YOU DECIDE WHAT LEAVES',
        heading: 'Three things touch the network',
        body: 'Time-server packets, map look-ups, and anonymous crash reports — never your case data. The complete ledger, item by item, is on the privacy page.',
        accent: 'gold',
      },
    ],
    diagram: {
      src: 'diagrams/on-device.svg',
      heading: 'What stays vs. the little that leaves',
      caption: 'What stays on your device versus the little that leaves — and exactly what it is.',
    },
    betaStripLine: "Run software you'd trust with your own cases.",
    priority: 'p2',
  },
]

/** All features in display order (i.e. declaration order). */
export function getAllFeatures(): readonly Feature[] {
  return features
}

/**
 * The feature page H1: the explicit display headline when the design's H1 differs
 * from the short card title (04/07/09), else the title with terminal punctuation —
 * every canvas H1 ends with a period that card/nav contexts drop.
 */
export function featureHeadline(feature: Feature): string {
  return feature.headline ?? `${feature.title}.`
}

/** All feature slugs (definition order). */
export function getFeatureSlugs(): readonly string[] {
  return features.map((feature) => feature.slug)
}

/** Look up a single feature by slug. */
export function getFeatureBySlug(slug: string): Feature | undefined {
  return features.find((feature) => feature.slug === slug)
}

/**
 * Previous/next features in display order (no wraparound). Returns `null` for an
 * unknown slug — distinct from a known feature at an edge, where `prev`/`next` is
 * `undefined`. Callers should resolve the slug (e.g. via getFeatureBySlug) first.
 */
export function getAdjacentFeatures(slug: string): { prev?: Feature; next?: Feature } | null {
  const ordered = getAllFeatures()
  const index = ordered.findIndex((feature) => feature.slug === slug)

  if (index === -1) {
    return null
  }

  return {
    prev: index > 0 ? ordered[index - 1] : undefined,
    next: index < ordered.length - 1 ? ordered[index + 1] : undefined,
  }
}
