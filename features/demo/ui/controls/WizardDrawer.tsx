'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'
import type { AdditiveFormStepId, WizardScreenId } from '@/features/demo/engine/types'
import { ADDITIVE_FORM_STEP_IDS } from '@/features/demo/engine/types'
import type { SaveStateKind, SaveStatusView } from '@/features/demo/engine/logic/save-status'
import { APP_NAME, DEMO_VERSION_LINE } from '@/features/demo/engine/content/app-info'
import { PhoneOverlayPortal } from '@/features/demo/ui/phone-overlay'
import { drawerTransition, DRAWER_W } from '@/features/demo/ui/motion'
import { glassHeaderBar, glassHeaderFooterBar } from '@/features/demo/ui/controls/header-chrome'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import { colors } from '@/features/demo/ui/tokens/palette'
import { withAlpha } from '@/features/demo/ui/tokens/scale'

export interface DrawerItem {
  id: WizardScreenId
  label: string
  icon?: ReactNode
  active: boolean
  /** Completion dot — green when complete, amber when partial; absent = no dot. */
  status?: 'complete' | 'partial'
}

export interface WizardDrawerProps {
  open: boolean
  items: DrawerItem[]
  onClose(): void
  onNavigate(id: WizardScreenId): void
  onBackToCases(): void
  /** Media accordion → `mediaCapture` (phone: push `/(form)/media-capture` + close drawer). */
  onCaptureMedia(): void
  /** Media accordion → `audioRecording` (phone: push `/(form)/audio-recording` + close drawer). */
  onRecordAudio(): void
  /** Media accordion → the Media Library sheet. The phone's caller decides whether the drawer
   *  closes: it stays OPEN behind a "No Location" toast when nothing is selected
   *  (`app/(form)/_layout.tsx:334-345`), so this row deliberately does not close it itself. */
  onOpenMediaLibrary(): void
  /**
   * The footer's save-status line, already worded by `describeSaveStatus` (the drawer is
   * presentational — it neither reads the persistence handle nor owns a clock).
   *
   * `null` renders NO line, and that is the honest reading of "not sampled yet": the bridge
   * samples on open, so the value is absent for the first frame of the slide-in. A placeholder
   * there would be a claim about a state nobody has looked at.
   */
  saveStatus: SaveStatusView | null
  /**
   * Which capture TOOLS the visitor's form profile leaves in the accordion (P7.3). The phone
   * gates the same two rows on step visibility (`CustomDrawerContent.tsx:61-62,312,342`); the
   * Media Library row is ungated on both sides — it browses what is already captured, so it
   * has nothing to do with which capture screens are in the flow.
   *
   * IMPORTED, not re-declared (R-20): the key space is the additive-tool id space, so a third
   * tool cannot be added to the registry and silently never reach this accordion.
   */
  mediaTools: Readonly<Record<AdditiveFormStepId, boolean>>
}

const itemButton: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  margin: '0 10px 8px',
  padding: '13px 15px',
  borderRadius: 10,
  border: GLASS.borderSoft,
  background: GLASS.gradientCard,
  cursor: 'pointer',
  width: 'calc(100% - 20px)',
  textAlign: 'left',
}

// Completion dot — filled green (complete) / filled amber (partial). Status is also exposed to
// assistive tech via the item button's aria-label (dots are aria-hidden). NOTE: the visual
// complete/partial distinction is colour-only by design choice (see deferred.md).
const STATUS_LABEL: Record<'complete' | 'partial', string> = { complete: 'complete', partial: 'partially complete' }
const dotBase: CSSProperties = { flex: '0 0 auto', width: 11, height: 11, borderRadius: 6 }

/** Phone `GlassDot.tsx:39` — `withAlpha(tint, colorScheme === 'dark' ? 0.35 : 0.4)`, dark branch. */
const DOT_GLOW_ALPHA = 0.35

/**
 * Phone `components/common/GlassDot.tsx:32` — `variant === 'partial' ? colors.warning :
 * colors.success`, and its own comment records that those two tokens replaced "eight hand-mixed
 * hexes and four glow rgbas across two themes".
 *
 * **NOT `STATUS_ACCENT`.** The completion bead's id space is `complete | partial`, not
 * `LocationStatus`, and the phone resolves it from the plain severity tokens rather than the
 * bare-mark accents. Both values already matched, so this is a tokenisation; the GLOW is the
 * one number that moves, from a hand-typed 0.55/0.6 to the phone's `withAlpha(tint, 0.35)`
 * (`GlassDot.tsx:39`, the dark branch). The blur stays the demo's 7px: the phone's is a native
 * `shadowRadius`, which is not the same unit as a CSS blur (plan §2, the platform carve-out).
 */
const DOT: Record<'complete' | 'partial', CSSProperties> = {
  complete: { background: colors.success, boxShadow: `0 0 7px ${withAlpha(colors.success, DOT_GLOW_ALPHA)}` },
  partial: { background: colors.warning, boxShadow: `0 0 7px ${withAlpha(colors.warning, DOT_GLOW_ALPHA)}` },
}

// ---- Footer chrome --------------------------------------------------------

/**
 * Save-status tone. Redundant with the wording (the text already says which state it is), so
 * this is emphasis, never the carrier — the same rule the completion dots' `aria-label` obeys.
 */
const SAVE_STATUS_COLOR: Record<SaveStateKind, string> = {
  // No phone counterpart — session persistence is demo-only, so D12's "follow the palette
  // inside the frame" applies rather than a lift. The two tokens are the phone's own vocabulary
  // for exactly these two meanings: `textSecondary` is what `TimerCard.getStatusColor:137` and
  // `dvr-information.tsx:176`'s Unknown branch both spend for "no severity", and `warning` is
  // the advisory amber. `#5d7a9a` and `#c9a227` were the last two members of the four-amber /
  // stray-slate families the U3 exit criterion collapses.
  //
  // NOT `colors.error` for `failed`: this is 11px text, and §C.3 rule 1 is that red stops being
  // a text colour. The wording already says which state it is; this is emphasis, never the
  // carrier — the same rule the completion dots' `aria-label` obeys.
  saved: colors.textSecondary,
  pending: colors.textSecondary,
  unavailable: colors.warning,
  failed: colors.warning,
}

// ---- Media accordion ------------------------------------------------------
// The phone's CustomDrawerContent.tsx:265-400 — THE entry point to every media surface.
// Copy, a11y labels and hints are lifted verbatim from there (and ui-mapping 14 §
// CustomDrawerContent). Icons are the web equivalents of the phone's Ionicons: this drawer
// has no icon font, and the media rows are the one place in it where the icon carries meaning
// (camera / mic / folder), so they are drawn as inline SVG in the drawer's existing stroke
// colour rather than dropped.

const iconStroke = '#99badd'

/** Ionicons `albums-outline` — two stacked cards. */
const AlbumsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="7" width="18" height="14" rx="3" />
    <path d="M6 4h12" />
  </svg>
)

/** Ionicons `camera`. */
const CameraIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </svg>
)

/** Ionicons `mic`. */
const MicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0014 0M12 18v3" />
  </svg>
)

/** Ionicons `folder-open-outline`. */
const FolderOpenIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 8V6a1 1 0 011-1h5l2 2h6a1 1 0 011 1v1" />
    <path d="M3 8h17.2a1 1 0 01.97 1.24l-1.75 8A1 1 0 0118.45 18H4a1 1 0 01-1-1V8z" />
  </svg>
)

/** The accordion's sub-rows. Indented and lighter than a step row, like the phone's. */
const mediaSubItem: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  margin: '0 10px 6px 24px',
  padding: '10px 13px',
  borderRadius: 10,
  border: GLASS.borderSoft,
  background: GLASS.gradientCard,
  cursor: 'pointer',
  width: 'calc(100% - 34px)',
  textAlign: 'left',
  fontSize: 14,
  fontWeight: 500,
  color: '#cdd9e6',
}

interface MediaRow {
  key: string
  label: string
  /** Verbatim phone `accessibilityLabel` (CustomDrawerContent.tsx:319/350/377). */
  ariaLabel: string
  icon: ReactNode
  onSelect(): void
}

/** The accordion's three `onSelect` handlers, passed as one object so `TOOL_ROWS` stays a
 *  declaration rather than a closure over component scope. */
interface MediaHandlers {
  onCaptureMedia(): void
  onRecordAudio(): void
  onOpenMediaLibrary(): void
}

/**
 * One row builder per additive capture tool — a TOTAL `Record` over `AdditiveFormStepId`
 * (fix-delta FD-1).
 *
 * R-20 keyed the visibility prop by this id space but left the drawer hand-building two
 * independent `...(mediaTools.x ? [row] : [])` spreads. Reading two of three keys off a total
 * record is not a TypeScript error — there is no unread-key check — so the drawer end had no
 * gate at all: a third tool compiled clean here and silently never reached the accordion, which
 * is §82b's exact phone defect (a grid switch that moves nothing). A total record makes "wired
 * at the drawer" a compile fact, and it is why the row defs stay in this file: they carry JSX,
 * which `ADDITIVE_STEP_LABELS`' own comment says cannot live in the engine.
 */
const TOOL_ROWS: Record<AdditiveFormStepId, (h: MediaHandlers) => MediaRow> = {
  mediaCapture: (h) => ({
    key: 'capture',
    label: 'Capture Media',
    ariaLabel: 'Open camera to capture media',
    icon: <CameraIcon />,
    onSelect: h.onCaptureMedia,
  }),
  audioRecording: (h) => ({
    key: 'audio',
    label: 'Record Audio',
    ariaLabel: 'Record audio note',
    icon: <MicIcon />,
    onSelect: h.onRecordAudio,
  }),
}

/** The library row is UNGATED on both sides — it browses what is already captured, so it has
 *  nothing to do with which capture screens are in the flow. Appended after the gated tools. */
const libraryRow = (h: MediaHandlers): MediaRow => ({
  key: 'library',
  label: 'Media Library',
  ariaLabel: 'Open media library',
  icon: <FolderOpenIcon />,
  onSelect: h.onOpenMediaLibrary,
})

/**
 * The drawer's Media section (matrix row 80's missing half).
 *
 * DEVIATION from the phone, deliberate: the sub-rows are UNMOUNTED while collapsed rather than
 * clipped to a 0-height container. The phone keeps them mounted (an animated height with a
 * measured/164px fallback) and therefore has to bolt three extra props onto the container —
 * `pointerEvents: 'none'`, `accessibilityElementsHidden`, `importantForAccessibility:
 * 'no-hide-descendants'` — to stop a collapsed row being focusable or announced. Not rendering
 * them achieves all three by construction, and on the web `aria-hidden` on a subtree containing
 * focusable buttons would be an a11y defect rather than a fix.
 */
function MediaAccordion({ rows }: { rows: readonly MediaRow[] }) {
  const reduce = useReducedMotion()
  const [expanded, setExpanded] = useState(false)
  return (
    <div data-media-accordion>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-label="Media section"
        aria-expanded={expanded}
        // The phone's accessibilityHint, verbatim. On the web `aria-expanded` already carries
        // the STATE, so this rides as the tooltip — the closest native analog to a hint.
        title={expanded ? 'Collapse media options' : 'Expand media options'}
        style={{ ...itemButton, gap: 10 }}
      >
        <AlbumsIcon />
        <span style={{ flex: '1 1 auto', minWidth: 0, fontSize: 15, fontWeight: 500, color: '#cdd9e6', textAlign: 'left' }}>Media</span>
        <motion.span
          aria-hidden="true"
          style={{ display: 'flex' }}
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={reduce ? { duration: 0 } : drawerTransition}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </motion.span>
      </button>
      {expanded && (
        <motion.div
          initial={reduce ? false : { height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={reduce ? { duration: 0 } : drawerTransition}
          style={{ overflow: 'hidden' }}
        >
          {rows.map((row) => (
            <button key={row.key} type="button" onClick={row.onSelect} aria-label={row.ariaLabel} style={mediaSubItem}>
              {row.icon}
              <span style={{ flex: '1 1 auto', minWidth: 0 }}>{row.label}</span>
            </button>
          ))}
        </motion.div>
      )}
    </div>
  )
}

/** The wizard navigation drawer — right-anchored, slides in from the right (the screen behind is
 *  pushed left by ScreenStage) with a backdrop fade; reverses on close via AnimatePresence. The
 *  backdrop and panel are separate stably-keyed children so rapid open/close can't strand one. */
export function WizardDrawer({
  open,
  items,
  onClose,
  onNavigate,
  onBackToCases,
  onCaptureMedia,
  onRecordAudio,
  onOpenMediaLibrary,
  saveStatus,
  mediaTools,
}: WizardDrawerProps) {
  const reduce = useReducedMotion()
  const mediaHandlers: MediaHandlers = { onCaptureMedia, onRecordAudio, onOpenMediaLibrary }
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  const fade = reduce ? { duration: 0 } : drawerTransition
  return (
    <PhoneOverlayPortal>
      <AnimatePresence>
        {open && (
          <motion.div
            key="drawer-backdrop"
            data-drawer-backdrop
            onClick={onClose}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
            style={{ position: 'absolute', inset: 0, zIndex: 41, background: 'rgba(4,8,14,0.55)', pointerEvents: 'auto' }}
          />
        )}
        {open && (
          <motion.div
            key="drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            initial={reduce ? false : { x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={fade}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              zIndex: 42,
              width: DRAWER_W,
              background: '#0b1626',
              boxShadow: '-24px 0 60px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              pointerEvents: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '54px 18px 14px',
                ...glassHeaderBar,
              }}
            >
              <div style={{ fontSize: 21, fontWeight: 700, color: '#f0f4f8' }}>Navigation</div>
              <button type="button" aria-label="Close" onClick={onClose} style={{ cursor: 'pointer', display: 'flex', padding: 2, background: 'transparent', border: 'none' }}>
                <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="#99badd" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div style={{ padding: '12px 12px 14px', borderBottom: GLASS.border }}>
              <button
                type="button"
                onClick={onBackToCases}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, background: '#101f33', cursor: 'pointer', border: 'none', width: '100%' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#99badd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                <span style={{ fontSize: 15, fontWeight: 500, color: '#99badd' }}>Back to Cases</span>
              </button>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: '10px 0 14px' }}>
              {items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => onNavigate(it.id)}
                  aria-label={it.status ? `${it.label}, ${STATUS_LABEL[it.status]}` : undefined}
                  style={itemButton}
                >
                  {it.active && <div aria-hidden="true" style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 4, borderRadius: '0 2px 2px 0', background: '#2B8CC1' }} />}
                  <span style={{ flex: '1 1 auto', minWidth: 0, fontSize: 15, fontWeight: 500, color: it.active ? '#f0f4f8' : '#cdd9e6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {it.label}
                  </span>
                  {it.status && <div data-dot={it.status} aria-hidden="true" style={{ ...dotBase, ...DOT[it.status] }} />}
                </button>
              ))}
              {/* Appended AFTER the step list, exactly like the phone (CustomDrawerContent.tsx:265). */}
              <MediaAccordion
                rows={[
                  // Derived from the id space, in registry order — never hand-listed (FD-1).
                  ...ADDITIVE_FORM_STEP_IDS.filter((id) => mediaTools[id]).map((id) => TOOL_ROWS[id](mediaHandlers)),
                  libraryRow(mediaHandlers),
                ]}
              />
            </div>

            {/* The drawer's foot is the header tier REVERSED, exactly as the phone's is
                (`CustomDrawerContent.tsx:436-440` - `[...gradient].reverse()` plus
                `borderTopColor`). Not a second gradient: a re-tint of the tier moves both. */}
            <div style={{ padding: '14px 18px', textAlign: 'center', ...glassHeaderFooterBar }}>
              {saveStatus && (
                <div data-save-status={saveStatus.kind} style={{ fontSize: 11, marginBottom: 8, color: SAVE_STATUS_COLOR[saveStatus.kind] }}>
                  {saveStatus.text}
                </div>
              )}
              <div style={{ fontSize: 13, fontWeight: 500, color: '#5d7a9a' }}>{APP_NAME}</div>
              {/* The phone renders `v{Constants.expoConfig?.version}` here — this is the same
                  chrome, labelled for what the visitor is actually looking at. The version is
                  the app's (phone `app.config.js:11`), and this is its demo, not a build of it;
                  a bare "v1.0.0" in a browser would imply otherwise. Both literals moved to
                  `engine/content/app-info.ts` at P7.1, when the About pane became a second
                  reader — see that module's note. */}
              <div style={{ fontSize: 11, color: '#46607e', marginTop: 3 }}>{DEMO_VERSION_LINE}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PhoneOverlayPortal>
  )
}
