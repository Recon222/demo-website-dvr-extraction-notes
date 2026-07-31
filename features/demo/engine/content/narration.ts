import type { ChapterId, ChapterNarration, LaunchableId, ModalId } from '@/features/demo/engine/types'

/**
 * The story-rail copy, keyed by chapter. Lifted verbatim from the prototype (Kris's
 * copy) with one deliberate change: the "0N · " step number is stripped from every
 * eyebrow. Numbering is now derived from the screen registry (`chapterNumber`), so the
 * rail composes "01 · Secure entry" from the number + the eyebrow rather than baking it
 * into the text — which is what fixes the colliding-number bug.
 */
export const NARRATION: Record<ChapterId, ChapterNarration> = {
  splash: {
    eyebrow: 'Secure entry',
    title: 'Biometric lock',
    paras: [
      'Every session starts behind Face ID. Evidence work needs a hard gate, so the app opens to a surveillance-style scanner instead of a generic login screen.',
    ],
    bullets: [
      'Face ID / Touch ID gate before any case data loads',
      'The same biometric check guards PDF export later in the flow',
      'Animated scanner HUD — corner brackets, sweep line, status readout',
    ],
    tip: 'Tap the scanner to authenticate.',
  },
  dashboard: {
    eyebrow: 'Command center',
    title: 'The dashboard',
    paras: [
      'After unlock you land on a timeline of recent cases. Active cases glow gold, completed ones green — an instant read on what is still open.',
    ],
    bullets: [
      'Most-recent cases on a glowing command-center timeline',
      'Each card shows occurrence #, OIC / coordinator, unit and locations',
      'Tap any location pill to jump straight into its recovery form',
    ],
  },
  cases: {
    eyebrow: 'Case management',
    title: 'Cases & locations',
    paras: [
      'The Cases tab is the full library. One case can hold many locations — every business or address you pulled video from gets its own record under a single occurrence number.',
    ],
    bullets: [
      'Cases → Locations → media: one occurrence, many sites',
      'Create, duplicate, import a request (PDF or text), export ZIP archives',
      'SQLite-backed, transaction-safe, with four-layer auto-save',
    ],
    tip: 'Tap "New Case" in the phone to start one.',
  },
  submission: {
    eyebrow: 'Submission details',
    title: 'Submission details',
    paras: [
      "The recovery wizard opens here, already populated from the import. Requester details and the location's address and contact are filled; the DVR specs and time ranges carry on to the later screens.",
      "Requester fields are per-location — who asked for THIS site's video. The case owns the occurrence number, OIC and unit.",
    ],
    bullets: [
      'Pre-filled from the AI import — review and edit any field',
      'Per-location requester, plus location address and contact',
      'GPS captured on scene or geocoded from the address',
    ],
  },
  requestedScope: {
    eyebrow: 'Requested footage',
    title: 'Requested scope',
    paras: [
      'The window(s) the detective asked for. Each scope is a start/end range flagged as real (wall-clock) or DVR time — that flag drives the offset math.',
    ],
    bullets: [
      'One or many time ranges per location',
      'Real-time vs DVR-time toggle per scope',
      'Per-scope camera list',
    ],
  },
  arrivalDeparture: {
    eyebrow: 'On scene',
    title: 'Arrival / departure',
    paras: ['When the tech arrived and left the site — part of the chain-of-custody record.'],
    bullets: [
      'One or more arrival/departure pairs',
      'Timestamps for the site visit',
      'Feeds the case-notes timeline',
    ],
  },
  timeOffset: {
    eyebrow: 'Forensic calibration',
    title: 'Time offset',
    paras: [
      'The heart of the app. A DVR clock is almost never right — so you record what it reads, capture the true time from an atomic clock, and the app computes the offset to the second.',
      'Every requested window is then converted into DVR-clock time so the tech pulls exactly the right footage. Math is wall-clock (DST-agnostic), with a separate adjustment when the DVR observes daylight saving.',
    ],
    bullets: [
      'NTP atomic-clock sync — offset, RTT and uncertainty logged for court',
      'Real bidirectional math (ported from the app): requested ↔ DVR time',
      'DST-aware, with a forensic traceability readout',
    ],
    tip: 'Press "Use Current Time", then "Calculate" — or capture the DVR clock by camera.',
  },
  extractedScope: {
    eyebrow: 'Exported footage',
    title: 'Extracted video scope',
    paras: [
      'The windows actually exported off the DVR — in DVR-clock time, auto-generated from the calibrated offset and editable. This is what was physically pulled.',
    ],
    bullets: [
      'Auto-generated from the time-offset calculation',
      'Always DVR time (what the recorder shows)',
      'Editable if you rounded the boundaries',
    ],
  },
  dvrInfo: {
    eyebrow: 'Hardware',
    title: 'DVR information',
    paras: [
      "The recorder's make, model, login, channel count and recording config — plus retention, which the app derives from the earliest recorded date.",
    ],
    bullets: [
      'Make/model, serial, credentials',
      'Channels, active cameras, schedule, resolution, FPS',
      'Retention countdown per scope',
    ],
  },
  cameras: {
    eyebrow: 'Camera inventory',
    title: 'Cameras',
    paras: ['Each camera that captured relevant footage, with its resolution and frame rate.'],
    bullets: [
      'Up to 50 cameras per location',
      'Per-camera resolution and FPS',
      'Listed in the case notes and PDF',
    ],
  },
  exportInfo: {
    eyebrow: 'Export media',
    title: 'Export information',
    paras: [
      'How the footage left the site — media type, file format, size, and how it was handed over (chain of custody).',
    ],
    bullets: [
      'Media type and file format',
      'Size, and whether a player was included',
      'Delivery method for chain of custody',
    ],
  },
  notes: {
    eyebrow: 'Auto notes',
    title: 'Case notes',
    paras: [
      'Seven auto-generated sections — attendance, time offset, recovered footage, retention, export, time on scene — each tracked independently. Rewrite any section and it stays yours; the rest keep regenerating from your data.',
    ],
    bullets: [
      'Sections regenerate from the wizard data',
      'Your edits are never overwritten',
      'Becomes the body of the court PDF',
    ],
    tip: 'Tap any paragraph to edit it. If the data changes under an edited section, a reset offer appears.',
  },
  completion: {
    eyebrow: 'Review + export',
    title: 'Completion',
    paras: [
      'The finish line. Review the case summary, then preview the court-admissible PDF — assembled from everything captured — and export. Any data leaving the device passes a Face ID gate first.',
      'Two reports come out: the full Case Notes and a Time-Offset Calibration proof. The whole package exports as an encrypted ZIP with the PDFs, media and JSON metadata.',
    ],
    bullets: [
      'Biometric-gated PDF + ZIP export',
      'Court-ready Case Notes and Time-Offset Calibration reports',
      'Complete & Save marks the location done',
    ],
    tip: 'Press "Preview / Export PDF" — Face ID gates it, then the report opens.',
  },
}

/** Copy for the overlay modals + the OCR launch screen (not part of Next/Back flow). */
export const MODAL_NARRATION: Partial<Record<ModalId | LaunchableId, ChapterNarration>> = {
  newCase: {
    eyebrow: 'Case management',
    title: 'Create a case',
    paras: [
      'A case captures the occurrence number plus the people who own it: officer in charge, video coordinator, and unit. The case number is locked once created — it names the evidence folder on disk.',
    ],
    bullets: [
      'Occurrence # and unit are required; OIC / VC optional',
      'The incident location is captured here at the case level',
      'Duplicate-number detection stops you clobbering an existing case',
    ],
    // The scripted-tour era pre-filled this form; the hands-on demo boots empty, so the old
    // "The form is pre-filled — just press Create Case." tip was describing a demo that no
    // longer exists. Replaced with what the visitor actually has to do (P3.3).
    tip: 'Case number and unit are required — everything else can wait.',
  },
  newLocation: {
    eyebrow: 'Case management',
    title: 'Add a location',
    paras: [
      'Now add the site you recovered video from. Each location carries its own address, on-site contact, and GPS coordinates — captured live on scene or geocoded from the address.',
    ],
    bullets: [
      'Per-location address, contact and coordinates',
      'GPS capture with accuracy, or Mapbox address lookup',
      'Creating it drops you into the recovery form wizard',
    ],
    tip: 'Pre-filled — press Create Location to continue.',
  },
  import: {
    eyebrow: 'AI import',
    title: 'Import a request',
    paras: [
      'This is where the model actually lives. On a case, tap Import, then drop a PDF or paste any request — email or form — and an on-device model reads it and builds a pre-filled location.',
      'It runs as a staged pipeline: extract text → AI field extraction → normalize → validate → create. The occurrence number and unit come from the case, never the model.',
    ],
    bullets: [
      'Pick a PDF (parsed in your browser) or paste any text',
      'Live extraction → normalize → validate, shown stage by stage',
      'Creates a location and fills the whole wizard — not just one screen',
    ],
    tip: 'Press "Paste text" then "Extract & import" — or drop your own PDF.',
  },
  editIncident: {
    eyebrow: 'Case map',
    title: 'Move the incident pin',
    paras: [
      'The red marker is the occurrence scene, held on the case rather than on any one recovery location. This editor is the only place it can be corrected from the map — and it writes back nothing else: the case number, the officers and the notes stay exactly as they were.',
      'Type coordinates and the address is looked up for you; pick an address and the coordinates come with it. Either way the pin carries where the number came from.',
    ],
    bullets: [
      'Incident-only edit — the rest of the case is out of reach here',
      'Address lookup from typed coordinates, and coordinates from a picked address',
      'The pin, the sheet row and the card refresh the moment you save',
    ],
    tip: 'Try typing a latitude and longitude, then tab out of the field.',
  },
  duplicateLocation: {
    eyebrow: 'Case management',
    title: 'Location actions',
    paras: [
      'Hold a location row — or tap its ⋯ button — for everything you can do with that site. Canvassing a plaza means the same request against six DVRs, so duplicating the submission info beats retyping it six times.',
      'The suggested name is already de-duplicated the way Windows does it: "Main Store - Copy", then "- Copy (2)", "- Copy (3)". Duplicating a copy never yields "Copy - Copy".',
    ],
    bullets: [
      'Duplicate carries address, contact and the requesting officer — never the DVR data',
      '"with Scopes" also clones the requested time ranges',
      '"New Location w/ Sub Info" keeps the request but asks for a new address',
    ],
    tip: 'Try "Duplicate Location with Scopes", then re-open the chooser — the suggested name has moved on.',
  },
  newAddressLocation: {
    eyebrow: 'Case management',
    title: 'Copy the request to a new address',
    paras: [
      'Same request, different site. The requesting officer, badge, unit, phone and email come across from the location you pressed — you only enter the address you are standing at.',
      'The new location is independent, not a copy: it gets its own DVR data, its own time offset, its own scopes.',
    ],
    bullets: [
      'Street address is required here — that is the whole point of the flow',
      'The name is pre-filled with the first free "New Location"',
      'Creating it drops you straight into the recovery form',
    ],
    tip: 'Type an address (Mapbox suggests as you go), then press Create Location.',
  },
  mediaLibrary: {
    eyebrow: 'Media',
    title: 'Everything captured here',
    paras: [
      'Photos, video and audio notes taken at this location, split by kind and read newest first. Tap a row to preview it in place; expand a photo or clip to fill the screen.',
      'The bytes live in this tab and nowhere else — the demo never writes captured media into browser storage, so a refresh keeps the record of a capture and honestly says the file itself is gone.',
    ],
    bullets: [
      'Photos / Video / Audio tabs, each with its own count',
      'Inline preview with filename, notes and when it was taken',
      'Hold a row — or use its Delete button — to remove a capture',
    ],
    tip: 'Capture Media or Record Audio first, then come back — the library opens on the newest one.',
  },
  exportScope: {
    eyebrow: 'Export',
    title: 'One location, or the whole case',
    paras: [
      'The same request usually covers several sites, so export asks what you mean: just the location you are standing in, or every location on the case in one package. Either way the archive carries the documents, the media and a JSON copy of the data.',
      'Before it builds anything it checks every location against the four fields a Case Notes PDF needs. Anything short is named, one missing field at a time, and you decide whether to ship the package without those notes.',
    ],
    bullets: [
      'Location ZIP or full-case ZIP — the case one also carries the case map',
      'Pre-flight validation lists exactly which locations would ship without notes',
      'In a browser the archive itself is the one thing that cannot be produced — the demo says so instead of faking a download',
    ],
    tip: 'Pick either scope — the validation pass and the progress stages are the real ones.',
  },
  ocr: {
    eyebrow: 'OCR capture',
    title: 'Read the DVR clock',
    paras: [
      "Rather than type the DVR's on-screen time, point the camera at it. The app captures a frame, OCRs the timestamp, cleans the text and parses it — then applies the atomic-clock offset at the instant of capture.",
      'This runs real in-browser OCR. No camera? Use the sample DVR clock — same pipeline. The cleaning fixes typical OCR slips (O→0, l→1, missing colons) before parsing several timestamp formats.',
    ],
    bullets: [
      'Live webcam capture, or a generated sample DVR clock',
      'Real OCR → ported text cleaning → multi-format timestamp parse',
      'Confidence score; correct the parsed time before you commit it',
      'Warns when a date could read either MM/DD or DD/MM, and never accepts an assumed date silently',
    ],
    tip: 'Press "Use sample DVR clock" (works without a camera) — or try the awkward frames underneath it.',
  },
}

/**
 * Rail copy for the **Map** tab. The map is a sandbox tab destination, not a guided chapter, so this
 * lives outside the `NARRATION` record (which is keyed by `ChapterId`) and is shown contextually
 * whenever `view === 'map'`.
 */
export const MAP_NARRATION: ChapterNarration = {
  eyebrow: 'Case map',
  title: 'See the whole case on a map',
  paras: [
    'Every location you geocode drops a pin, colour-coded by how far its recovery has progressed; the occurrence scene is a red marker. One glance shows where the evidence is and what is still outstanding.',
    'Tap a pin to fly there and open its card — address, the requesting investigator, and the on-site contact, with one-tap call and email.',
  ],
  bullets: [
    'Status-coloured location pins + the red incident marker',
    'Draggable sheet: browse the list, then drill into a location',
    'Call / email the requester or contact straight from the card',
  ],
  tip: 'Pick a case, then tap a pin or a row to dive in.',
}
