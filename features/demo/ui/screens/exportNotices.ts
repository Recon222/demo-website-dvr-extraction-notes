import { assertNever } from '@/features/demo/engine/logic/assert-never'
import type { ExportRun } from '@/features/demo/engine/logic/export'
// TYPE-ONLY (erased at build) — the case-map module is a lazy chunk and must not enter the
// /demo First Load graph.
import type { CaseMapCoverage } from '@/features/demo/engine/logic/case-map'

/**
 * What the demo says when an export pipeline reaches its end (parity P5.3, decision D4).
 *
 * WHY THIS EXISTS AT ALL — deferred §70k. Two strings the P5.1 engine ports verbatim,
 * `resolveExportPlan`'s `CASE ZIP · CANONICAL · INCLUDES CASE MAP` and
 * `describeValidationPrompt`'s `The ZIP will be created without any PDF notes.`, describe an
 * artifact the browser cannot produce. They are lifted anyway because the visitor has to know
 * what they are agreeing to — and §70k makes the terminal notice the price of that: without it,
 * those two sentences become the demo's ONLY statement about the archive and the pair reads as
 * a fake success. So every ZIP pipeline ends HERE.
 *
 * The shape of the honesty is deliberate: name what the real app writes (so the artifact claim
 * is completed, not retracted), say plainly why there is no file, and point at what IS real.
 * Never "Export Complete" — the phone's own terminal title — over nothing.
 *
 * Pure data, no React: the bridge feeds these straight into `AlertDialog`, the same blocking
 * treatment the phone gives its own post-export alerts. A toast would let the one honest
 * sentence in the flow auto-dismiss unread.
 */

export interface ExportTerminalNotice {
  title: string
  message: string
}

/** Verbatim from decision D4's own wording ("the honest 'download isn't available in the
 *  demo' notice"), so a reviewer can match the shipped string to the ruling. */
export const EXPORT_DOWNLOAD_TITLE = "Downloads Aren't Available in the Demo"

const NO_FILE =
  'This demo runs entirely in a browser tab — no file system, no share sheet — so there is no file to hand you. Everything that would have gone into it is in this session and on screen.'

const REAL_DOCUMENTS =
  'The court documents are the exception, and they are real: preview the Case Notes or the Time-Offset Calibration from Completion and print or save either one as a PDF.'

const plural = (n: number): string => (n === 1 ? 'location' : 'locations')

/**
 * The runs whose terminal is the honest "no download here" notice — i.e. every run EXCEPT the
 * one a browser can genuinely produce.
 *
 * `case-map` is excluded structurally rather than by convention (review R-14): P5.4's download
 * is real, so it has its own terminal (`describeCaseMapTerminal`), and the interim sentence
 * that used to live in this file — "is being built; it just is not wired to this button yet" —
 * cannot come back, because the type no longer admits the member that carried it.
 */
export type SimulatedExportRun = Exclude<ExportRun, { type: 'case-map' }>

/** What the phone would have written, per pipeline. Present tense and specific — a vague
 *  "your export" would leave the artifact line above it unanswered. */
function artifactOf(run: SimulatedExportRun): string {
  switch (run.type) {
    case 'case':
      return "a ZIP of the whole case — every location's documents, media and JSON metadata, plus the interactive case map"
    case 'case-subset':
      return `a ZIP of the ${run.locationIds.length} selected ${plural(run.locationIds.length)} — their documents, media and JSON metadata`
    case 'location':
      return "a ZIP of this location — its documents, media and JSON metadata"
    case 'location-geojson':
      return "this location's canonical GeoJSON, with a feature per camera and per coordinate"
    default:
      return assertNever(run)
  }
}

/** The terminal notice for a finished SIMULATED run. The case-map run has its own, below. */
export function describeExportTerminal(run: SimulatedExportRun): ExportTerminalNotice {
  return {
    title: EXPORT_DOWNLOAD_TITLE,
    message: `The real app writes ${artifactOf(run)}, then hands it to the system share sheet.\n\n${NO_FILE}\n\n${REAL_DOCUMENTS}`,
  }
}

// ---- The one real export (decision D4) --------------------------------------------------

/** Phone title for a failed export (`useExportFlow.ts:301-305`). */
const EXPORT_ERROR_TITLE = 'Export Error'

/**
 * How the case-map run ended. Four arms, because the visitor acts differently on each and the
 * three failures are genuinely different causes — a builder that never arrived, a browser with
 * no file-saving primitives at all, and a save attempt that threw.
 */
export type CaseMapOutcome =
  | {
      kind: 'requested'
      filename: string
      coverage: CaseMapCoverage
      /** Nothing at all plots — the incident scene included. */
      mapIsEmpty: boolean
      hasToken: boolean
    }
  | { kind: 'builder-unavailable' }
  /** The case the run was authorised for is gone from the store by the time the arm reads it
   *  (delta D-3). Distinct from `builder-unavailable`: the builder is fine, the SUBJECT is not,
   *  and conflating them named the wrong cause and discarded a healthy module. */
  | { kind: 'case-unavailable' }
  | { kind: 'save-unavailable' }
  | { kind: 'save-failed' }

/**
 * What the map does NOT contain (review R-1).
 *
 * A location typed rather than picked has no coordinates, so the builder drops it — correctly;
 * a fabricated pin on a forensic artifact is worse. But the demo's NORMAL state is
 * some-typed/some-picked, and saying nothing handed the visitor a map missing most of their
 * case under the bare word "Success". Three arms: "3 of 3 dropped" and "1 of 3 dropped" are
 * different facts.
 */
function coverageClause(coverage: CaseMapCoverage): string {
  if (coverage.totalLocations === 0) return ' This case has no locations yet.'
  if (coverage.plottedLocations === 0) {
    return ` None of its ${coverage.totalLocations} ${plural(coverage.totalLocations)} have coordinates yet, so none of them are on the map.`
  }
  if (coverage.droppedLocationNames.length > 0) {
    return ` ${coverage.droppedLocationNames.length} of ${coverage.totalLocations} ${plural(coverage.totalLocations)} have no coordinates yet and are not on the map.`
  }
  return ''
}

/**
 * The Case Map terminal — the one export this demo does for real (decision D4).
 *
 * A REQUEST claim, never a completion claim (review R-2): `HTMLAnchorElement.click()` is
 * fire-and-forget, so download blocking, an extension, a hardened profile or an expired user
 * activation all look identical to success from here. The sentence says exactly what is
 * knowable — the browser was asked, this is the filename — and then everything true about the
 * artifact the visitor is walking away with.
 */
export function describeCaseMapTerminal(outcome: CaseMapOutcome): ExportTerminalNotice {
  switch (outcome.kind) {
    case 'requested':
      return {
        title: 'Case Map Ready',
        message:
          `Your browser was asked to save ${outcome.filename}. Check your downloads.` +
          coverageClause(outcome.coverage) +
          (outcome.mapIsEmpty ? ' Nothing plots yet, so it opens with an empty map.' : '') +
          (outcome.hasToken ? '' : ' Without a Mapbox token its basemap stays blank.') +
          `\n\nThis one is real: a self-contained interactive HTML map of the case — every location, its cameras and the incident scene — openable in any browser with no server. It is the same file the app writes into the case ZIP.`,
      }
    case 'builder-unavailable':
      return {
        title: EXPORT_ERROR_TITLE,
        message:
          "The Case Map builder could not be loaded, so nothing was generated.\n\nIt is fetched on demand; check your connection and try again.",
      }
    case 'case-unavailable':
      // The taxonomy's existing right copy — `EXPORT_ALERTS.caseUnavailable`, which the ZIP
      // path already raises for exactly this condition. Repeated as a terminal rather than
      // imported so this function stays a pure string table with no engine dependency; the
      // wording is pinned against the alert in the test.
      return {
        title: EXPORT_ERROR_TITLE,
        message:
          'The selected case is no longer available. Re-select and try again.\n\nNothing was generated.',
      }
    case 'save-unavailable':
      return {
        title: EXPORT_ERROR_TITLE,
        message:
          'This browser has no way to save a file from a page, so nothing was generated.\n\nEverything the map would have shown is still on screen in this session.',
      }
    case 'save-failed':
      return {
        title: EXPORT_ERROR_TITLE,
        message:
          'The map was built, but this browser refused to save it, so no file was handed over.\n\nA download blocker or a hardened profile is the usual cause.',
      }
    default:
      return assertNever(outcome)
  }
}
