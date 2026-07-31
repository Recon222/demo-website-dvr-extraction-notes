import { assertNever } from '@/features/demo/engine/logic/assert-never'
import type { ExportRun } from '@/features/demo/engine/logic/export'

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

/** What the phone would have written, per pipeline. Present tense and specific — a vague
 *  "your export" would leave the artifact line above it unanswered. */
function artifactOf(run: ExportRun): string {
  switch (run.type) {
    case 'case':
      return "a ZIP of the whole case — every location's documents, media and JSON metadata, plus the interactive case map"
    case 'case-subset':
      return `a ZIP of the ${run.locationIds.length} selected ${plural(run.locationIds.length)} — their documents, media and JSON metadata`
    case 'location':
      return "a ZIP of this location — its documents, media and JSON metadata"
    case 'location-geojson':
      return "this location's canonical GeoJSON, with a feature per camera and per coordinate"
    case 'case-map':
      return 'a self-contained interactive HTML map of the case'
    default:
      return assertNever(run)
  }
}

/**
 * The terminal notice for a finished run.
 *
 * `case-map` is the one artifact a browser genuinely CAN produce (decision D4), and P5.4 builds
 * it. Until that lands this returns the honest interim rather than a silent no-op — see the
 * `SEAM(P5.4)` marker at the dispatch site.
 */
export function describeExportTerminal(run: ExportRun): ExportTerminalNotice {
  if (run.type === 'case-map') {
    return {
      title: EXPORT_DOWNLOAD_TITLE,
      message: `The real app writes ${artifactOf(run)} — every location, its cameras and the incident scene, openable in any browser with no server.\n\nThat one IS reproducible here and is being built; it just is not wired to this button yet. Nothing was generated.`,
    }
  }
  return {
    title: EXPORT_DOWNLOAD_TITLE,
    message: `The real app writes ${artifactOf(run)}, then hands it to the system share sheet.\n\n${NO_FILE}\n\n${REAL_DOCUMENTS}`,
  }
}
