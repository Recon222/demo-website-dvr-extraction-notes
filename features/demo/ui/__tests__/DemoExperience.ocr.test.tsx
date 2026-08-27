import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createDemoStore, type DemoStore } from '@/features/demo/engine/store/create-store'
import { SNAPSHOT_VERSION, loadSnapshot, snapshotOf, type StorageLike } from '@/features/demo/engine/store/persistence'
import { stubClock } from '@/features/demo/ui/inputs/__tests__/test-utils'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'

/**
 * The OCR confirm bridge (parity rows 38/39). The confirmation step is where an OCR read stops
 * being a machine's opinion and becomes evidence, so what gets committed — and what gets
 * committed when the operator disagrees with the read — is the thing worth pinning.
 *
 * The picker clock is stubbed at 2026-07-31 so the "today" the assumed-date path falls back to,
 * and the proximity window the disambiguation resolver uses, are both deterministic.
 */
const NOW = () => new Date(2026, 6, 31, 12, 0, 0)

function openOcr(): DemoStore {
  const store = createDemoStore()
  render(<DemoExperience store={store} />)
  act(() => {
    const c = store.getState().createCase({ caseNumber: 'PR26-OCR', displayName: 'X', unit: 'Robbery' })
    store.getState().addLocation(c, { locationName: 'Rear Door' })
    store.getState().launch('ocr')
  })
  return store
}

/**
 * Put the location in the state the recalculate guard exists for: a requested scope, an offset
 * already calculated, and the resulting extracted scope hand-edited on the Extracted Scope
 * screen. Returns the edited camera string so the assertion can name what would be destroyed.
 */
function seedEditedExtractedScope(store: DemoStore): string {
  act(() => {
    const st = store.getState()
    st.updateField('form.scopes', [
      { id: 'sc1', startDateTime: '2025-03-08 23:45:00', endDateTime: '2025-03-09 01:30:00', isActualTime: true, cameras: '3, 4, 7' },
    ])
    st.updateField('capture.dvrDateTime', '2025-03-08 12:05:30')
    st.updateField('capture.actualDateTime', '2025-03-08 12:00:00')
    st.calculateOffset()
    st.generateExtractedScopes()
  })
  const generated = store.getState().locations[0].form.extractedScopes
  expect(generated).toHaveLength(1)
  act(() => {
    store.getState().updateField('form.extractedScopes', [{ ...generated[0], cameras: 'HAND-EDITED 9' }])
  })
  return 'HAND-EDITED 9'
}

beforeEach(() => stubClock(NOW))
afterEach(() => vi.restoreAllMocks())

describe('DemoExperience — OCR rail narration (§60k)', () => {
  it('anchors the rail on the OCR copy while the capture screen is open', () => {
    // §60k: `MODAL_NARRATION.ocr` existed but was unreachable — the anchor read only `modal`,
    // and 'ocr' is a LaunchableId. The rail used to sit on the anchor chapter instead.
    openOcr()
    expect(screen.getByText('Read the DVR clock')).toBeInTheDocument()
  })

  it('an open modal still outranks the launchable — the anchor stays most-specific first', () => {
    const store = openOcr()
    act(() => store.getState().openModal('newCase'))
    expect(screen.getByText('Create a case')).toBeInTheDocument()
    expect(screen.queryByText('Read the DVR clock')).not.toBeInTheDocument()
  })

  it('launchables without narration entries still fall through to the anchor chapter (§59e)', () => {
    const store = openOcr()
    act(() => {
      store.getState().setView('dvrInfo')
      store.getState().launch('mediaCapture')
    })
    // No `mediaCapture` entry in MODAL_NARRATION — the rail stays on the chapter's copy.
    expect(screen.getByText('DVR information')).toBeInTheDocument()
  })
})

describe('DemoExperience — OCR confirmation', { timeout: 20000 }, () => {
  it('commits the read when the operator accepts it, and calculates the offset', () => {
    const store = openOcr()
    fireEvent.click(screen.getByText('Use sample DVR clock'))
    fireEvent.click(screen.getByText('Use this & calculate'))

    expect(store.getState().capture.dvrDateTime).toBe('2025-03-08 12:05:30')
    expect(store.getState().capture.method).toBe('ocr')
    const loc = store.getState().locations[0]
    expect(loc.form.timeOffset?.dvrDateTime).toBe('2025-03-08 12:05:30')
    expect(loc.form.timeOffset?.formattedDifference).toBe('00:05:30')
  })

  it('commits the CORRECTED value, not the read, when the operator edits it', async () => {
    const user = userEvent.setup()
    const store = openOcr()
    fireEvent.click(screen.getByText('Use sample DVR clock'))

    // Correct the date: Mar 8 → Mar 15 (the picker preserves the time).
    await user.click(screen.getByRole('button', { name: 'Set date' }))
    await user.click(screen.getByRole('button', { name: '15' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByText('Manually edited')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Use this & calculate'))
    expect(store.getState().capture.dvrDateTime).toBe('2025-03-15 12:05:30')
    // …while the OCR proof still records what the machine actually read.
    expect(store.getState().capture.ocr?.parsedDateTime).toBe('2025-03-08 12:05:30')
    expect(store.getState().capture.ocr?.rawText).toBe('2025-03-08 12:05:30')
  })

  it('writes nothing to the store until the operator commits', () => {
    const store = openOcr()
    fireEvent.click(screen.getByText('Use sample DVR clock'))
    expect(screen.getByText('Use this & calculate')).toBeInTheDocument()
    expect(store.getState().capture.dvrDateTime).toBe('')
    expect(store.getState().capture.method).toBe('manual')
  })

  it('a read that is abandoned (Retake → Cancel) leaves the capture untouched', () => {
    // The confirm stage's exits are Retake and commit; Cancel lives on the aim stage.
    const store = openOcr()
    fireEvent.click(screen.getByText('Use sample DVR clock'))
    fireEvent.click(screen.getByText('Retake'))
    fireEvent.click(screen.getByText('Cancel'))

    expect(store.getState().capture.dvrDateTime).toBe('')
    expect(store.getState().capture.ocr).toBeNull()
    expect(store.getState().view).not.toBe('ocr')
  })

  it('Retake drops the read and returns to the aim stage', () => {
    openOcr()
    fireEvent.click(screen.getByText('Use sample DVR clock'))
    fireEvent.click(screen.getByText('Retake'))

    expect(screen.getByText('AIM AT THE DVR CLOCK')).toBeInTheDocument()
    expect(screen.queryByText('Use this & calculate')).not.toBeInTheDocument()
  })

  it('the no-camera shutter SAYS it attaches a sample, and runs the same clean frame', () => {
    // P4.3's honesty rule applied here: with no live stream the shutter's accessible name is
    // 'Capture sample frame', never a bare 'Capture' over a bundled string.
    const store = openOcr()
    expect(screen.queryByLabelText('Capture')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Capture sample frame'))
    fireEvent.click(screen.getByText('Use this & calculate'))
    expect(store.getState().capture.dvrDateTime).toBe('2025-03-08 12:05:30')
  })

  it('warns on an ambiguous date and commits the resolver’s choice', () => {
    const store = openOcr()
    fireEvent.click(screen.getByText('Ambiguous date'))

    expect(screen.getByTestId('date-disambiguation-warning')).toHaveTextContent(
      'Date Format Ambiguity Detected',
    )
    expect(screen.getByText(/Jun 7, 2024 \(MM-DD\)/)).toBeInTheDocument()
    expect(screen.getByText('Jul 6, 2024')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Use this & calculate'))
    expect(store.getState().capture.dvrDateTime).toBe('2024-06-07 23:45:30')
  })

  it('no warning on the unambiguous sample frame', () => {
    openOcr()
    fireEvent.click(screen.getByText('Use sample DVR clock'))
    expect(screen.queryByTestId('date-disambiguation-warning')).not.toBeInTheDocument()
  })

  it('holds a dateless read until the assumed date is confirmed, then commits it', () => {
    const store = openOcr()
    fireEvent.click(screen.getByText('Time only'))

    // U7.3: the blocker became a `<Banner severity="error">` (A71/D19's hand-back) and its
    // prose is a message PROP, so a JSX-text selector no longer reaches it.
    expect(screen.getByTestId('ocr-assumed-date')).toHaveTextContent('No date on the DVR display.')
    fireEvent.click(screen.getByText('Use this & calculate'))
    expect(store.getState().capture.dvrDateTime).toBe('')

    fireEvent.click(screen.getByText('The date is correct'))
    fireEvent.click(screen.getByText('Use this & calculate'))
    expect(store.getState().capture.dvrDateTime).toBe('2026-07-31 12:05:30')
  })

  it('the committed OCR proof survives the persistence schema', () => {
    // capture.ocr had never been populated before this package, so this is the first time a
    // real OcrProof meets `ocrProofSchema` — a field the writer forgets fails validation and
    // silently drops the whole snapshot on reload.
    const store = openOcr()
    fireEvent.click(screen.getByText('Use sample DVR clock'))
    fireEvent.click(screen.getByText('Use this & calculate'))

    const raw = JSON.stringify({ version: SNAPSHOT_VERSION, state: snapshotOf(store.getState()) })
    const storage: StorageLike = { getItem: () => raw, setItem: () => {}, removeItem: () => {} }
    const restored = loadSnapshot(storage, { enabled: true })
    expect(restored?.capture.ocr).toEqual({
      rawText: '2025-03-08 12:05:30',
      cleanedText: '2025-03-08 12:05:30',
      parsedDateTime: '2025-03-08 12:05:30',
      confidence: 0.93,
    })
  })

  it('a LIVE proof keeps its strip image through the persistence schema (no version bump needed)', () => {
    // P4.7's decision (§64): `imageDataUrl` was in `ocrProofSchema` (optional string) since
    // the field was typed, so a data-URL-carrying proof persists under SNAPSHOT_VERSION 6 —
    // a data URL is self-contained, unlike the blob: URLs `snapshotOf` strips from media.
    // Its size is bounded at CAPTURE (grabVideoFrame targetWidth), not policed here.
    const store = createDemoStore()
    const proof = {
      rawText: '2025-03-08 12:05:30',
      cleanedText: '2025-03-08 12:05:30',
      parsedDateTime: '2025-03-08 12:05:30',
      confidence: 0.91,
      imageDataUrl: 'data:image/jpeg;base64,STRIP',
    }
    act(() => store.getState().updateField('capture.ocr', proof))

    const raw = JSON.stringify({ version: SNAPSHOT_VERSION, state: snapshotOf(store.getState()) })
    const storage: StorageLike = { getItem: () => raw, setItem: () => {}, removeItem: () => {} }
    expect(loadSnapshot(storage, { enabled: true })?.capture.ocr).toEqual(proof)
  })

  // R-4: `confirmOcr` → `calcOffset` → `generateExtractedScopes` replaces the extracted-scope
  // list wholesale. The phone stops and asks on exactly this path
  // (`app/(form)/ocr-capture.tsx:288-317`); the demo used to destroy the edits silently.
  describe('recalculate guard end to end', () => {
    it('does not touch edited scopes until the operator answers the prompt', () => {
      const store = openOcr()
      const edited = seedEditedExtractedScope(store)

      fireEvent.click(screen.getByText('Use sample DVR clock'))
      fireEvent.click(screen.getByText('Use this & calculate'))

      // still on the OCR screen, still asking, nothing committed
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      expect(store.getState().view).toBe('ocr')
      expect(store.getState().locations[0].form.extractedScopes[0].cameras).toBe(edited)
    })

    it('“Keep My Edits” recalculates the offset and leaves the edited scopes standing', () => {
      const store = openOcr()
      const edited = seedEditedExtractedScope(store)
      const before = store.getState().locations[0].form.timeOffset?.dvrDateTime

      fireEvent.click(screen.getByText('Time only')) // a read that differs from the seeded offset
      fireEvent.click(screen.getByText('The date is correct'))
      fireEvent.click(screen.getByText('Use this & calculate'))
      fireEvent.click(screen.getByText('Keep My Edits'))

      const loc = store.getState().locations[0]
      expect(loc.form.timeOffset?.dvrDateTime).toBe('2026-07-31 12:05:30')
      expect(loc.form.timeOffset?.dvrDateTime).not.toBe(before) // the offset DID recalculate
      expect(loc.form.extractedScopes[0].cameras).toBe(edited) // …and the edits survived
      expect(store.getState().view).not.toBe('ocr')
    })

    it('“Regenerate Scopes” rebuilds the list, dropping the edits the operator agreed to lose', () => {
      const store = openOcr()
      const edited = seedEditedExtractedScope(store)

      fireEvent.click(screen.getByText('Use sample DVR clock'))
      fireEvent.click(screen.getByText('Use this & calculate'))
      fireEvent.click(screen.getByText('Regenerate Scopes'))

      const loc = store.getState().locations[0]
      expect(loc.form.extractedScopes).toHaveLength(1)
      expect(loc.form.extractedScopes[0].cameras).not.toBe(edited)
      expect(loc.form.extractedScopes[0].cameras).toBe('3, 4, 7') // regenerated from the request
    })

    it('“Cancel” discards the read and commits nothing', () => {
      const store = openOcr()
      const edited = seedEditedExtractedScope(store)
      const before = store.getState().capture.dvrDateTime

      fireEvent.click(screen.getByText('Time only'))
      fireEvent.click(screen.getByText('The date is correct'))
      fireEvent.click(screen.getByText('Use this & calculate'))
      fireEvent.click(screen.getByText('Cancel'))

      expect(store.getState().capture.dvrDateTime).toBe(before)
      expect(store.getState().locations[0].form.extractedScopes[0].cameras).toBe(edited)
      expect(store.getState().view).not.toBe('ocr')
    })

    it('no prompt when there is nothing to lose — the phone regenerates directly', () => {
      const store = openOcr()
      fireEvent.click(screen.getByText('Use sample DVR clock'))
      fireEvent.click(screen.getByText('Use this & calculate'))

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      expect(store.getState().capture.dvrDateTime).toBe('2025-03-08 12:05:30')
    })
  })

  // P4.7: the Time-Offset report's OCR block was always empty — the bridge mapped none of the
  // proof fields into generateTimeOffsetDoc, so `captureMethod: 'ocr'` rendered the
  // methodology box with no evidence under it.
  it('carries the committed proof — raw, cleaned, parsed AND the strip image — into the PDF', () => {
    const store = openOcr()
    fireEvent.click(screen.getByText('Use sample DVR clock'))
    fireEvent.click(screen.getByText('Use this & calculate'))

    // The sample path stages no image; a live capture does. Attach one to the committed
    // proof exactly as `runOcrLive` would have, and recommit the offset.
    act(() => {
      const st = store.getState()
      st.updateField('capture.ocr', { ...st.capture.ocr!, imageDataUrl: 'data:image/jpeg;base64,STRIP' })
      st.calculateOffset()
      st.setView('completion')
    })
    fireEvent.click(screen.getByText('Preview Time-Offset Calibration'))

    const html = screen.getByTitle('Time-Offset Calibration').getAttribute('srcdoc') ?? ''
    expect(html).toContain('Raw OCR Output')
    expect(html).toContain('2025-03-08 12:05:30') // raw/cleaned/parsed all carry the read
    expect(html).toContain('Captured DVR Display')
    expect(html).toContain('data:image/jpeg;base64,STRIP')
  })

  it('an image-less (sample) proof still fills the text evidence, with no empty image block', () => {
    const store = openOcr()
    fireEvent.click(screen.getByText('Use sample DVR clock'))
    fireEvent.click(screen.getByText('Use this & calculate'))
    act(() => store.getState().setView('completion'))
    fireEvent.click(screen.getByText('Preview Time-Offset Calibration'))

    const html = screen.getByTitle('Time-Offset Calibration').getAttribute('srcdoc') ?? ''
    expect(html).toContain('Raw OCR Output')
    expect(html).not.toContain('Captured DVR Display')
  })

  it('a dateless read can be committed by correcting the date instead of confirming it', async () => {
    const user = userEvent.setup()
    const store = openOcr()
    fireEvent.click(screen.getByText('Time only'))

    await user.click(screen.getByRole('button', { name: 'Set date' }))
    await user.click(screen.getByRole('button', { name: '15' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))

    fireEvent.click(screen.getByText('Use this & calculate'))
    expect(store.getState().capture.dvrDateTime).toBe('2026-07-15 12:05:30')
  })
})
