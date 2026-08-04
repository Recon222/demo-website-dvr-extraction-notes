import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import type { CapturedMedia } from '@/features/demo/engine/logic/media'
import { AudioPreviewScreen } from '@/features/demo/ui/screens/AudioPreviewScreen'

/**
 * Review Audio (matrix row 69). The auto-reset behaviour is pinned here rather than described
 * in a comment somewhere, because it is the one thing the plan asked P4.6 to DECIDE.
 */

const LIVE: CapturedMedia = {
  kind: 'audio',
  url: 'blob:demo/note-1',
  mimeType: 'audio/webm;codecs=opus',
  sizeBytes: 8192,
  durationSec: 4,
  capturedAt: '2026-07-31 14:05:09',
  sample: false,
}

const SAMPLE: CapturedMedia = {
  kind: 'audio',
  url: '/demo-media/sample-note.m4a',
  mimeType: 'audio/mp4',
  durationSec: 4,
  capturedAt: '2026-07-31 14:05:09',
  sample: true,
}

function view(over: Partial<React.ComponentProps<typeof AudioPreviewScreen>> = {}) {
  const handlers = {
    onSave: vi.fn(),
    onRecordAgain: vi.fn(),
    onCancel: vi.fn(),
  }
  render(<AudioPreviewScreen captured={LIVE} defaultFilenameBase="audio-note-1" notice={null} {...handlers} {...over} />)
  return handlers
}

const audio = () => screen.getByTestId('audio-element') as HTMLAudioElement

// jsdom implements neither play/pause nor a settable currentTime on HTMLMediaElement, so the
// three are installed for the duration of the suite and restored after it.
const originals = new Map<string, PropertyDescriptor | undefined>()
let play: ReturnType<typeof vi.fn>
let pause: ReturnType<typeof vi.fn>

beforeEach(() => {
  play = vi.fn(() => Promise.resolve())
  pause = vi.fn()
  for (const [key, value] of [
    ['play', { configurable: true, value: play }],
    ['pause', { configurable: true, value: pause }],
    ['currentTime', { configurable: true, writable: true, value: 0 }],
  ] as const) {
    originals.set(key, Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, key))
    Object.defineProperty(HTMLMediaElement.prototype, key, value)
  }
})

afterEach(() => {
  // `forEach`, not `for…of` — the repo's tsconfig target predates downlevel Map iteration
  // (the same note object-urls.ts carries for Set).
  originals.forEach((descriptor, key) => {
    if (descriptor) Object.defineProperty(HTMLMediaElement.prototype, key, descriptor)
    else delete (HTMLMediaElement.prototype as unknown as Record<string, unknown>)[key]
  })
  originals.clear()
})

describe('AudioPreviewScreen — the phone surface', () => {
  it('renders the review chrome and both actions', () => {
    view()
    expect(screen.getByText('Review Audio')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Record Again' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Audio' })).toBeInTheDocument()
    expect(screen.getByText('Duration: 00:04')).toBeInTheDocument()
    expect(screen.getByText('8.0 KB')).toBeInTheDocument()
  })

  it('opens the metadata form pre-filled and names the file it will write', () => {
    view({ defaultFilenameBase: 'audio-note-2' })
    expect(screen.getByLabelText('Filename')).toHaveValue('audio-note-2')
    // The base plus the container the browser really produced (§58c) — not `.m4a`.
    expect(screen.getByText('audio-note-2.webm')).toBeInTheDocument()
  })

  it('routes save, retake and exit to their callbacks, carrying the form’s value', () => {
    const handlers = view()
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'rear office' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Audio' }))
    fireEvent.click(screen.getByRole('button', { name: 'Record Again' }))
    fireEvent.click(screen.getByRole('button', { name: 'Exit audio recording' }))
    expect(handlers.onSave).toHaveBeenCalledTimes(1)
    expect(handlers.onSave).toHaveBeenCalledWith({ filename: 'audio-note-1', caption: 'rear office' })
    expect(handlers.onRecordAgain).toHaveBeenCalledTimes(1)
    expect(handlers.onCancel).toHaveBeenCalledTimes(1)
  })

  it('refuses to save an unnamed note — the phone’s gate, restored (P4.4)', () => {
    // Mutation probe for `if (!canSave) return`: drop it and `onSave` fires with an empty base,
    // which `mediaFilename` would turn into a file called `.webm`.
    const handlers = view()
    fireEvent.change(screen.getByLabelText('Filename'), { target: { value: '  ' } })

    const save = screen.getByRole('button', { name: 'Save Audio' })
    expect(save).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(save)

    expect(handlers.onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a file name')
  })

  it('labels a sample take as one and does not print a size it never measured (§58f)', () => {
    view({ captured: SAMPLE, defaultFilenameBase: 'sample-note' })
    expect(screen.getByText('Sample')).toBeInTheDocument()
    expect(screen.getByText(/no microphone was used/i)).toBeInTheDocument()
    expect(screen.getByText('Size not measured')).toBeInTheDocument()
  })

  it('shows no sample badge on a live take', () => {
    view()
    expect(screen.queryByText('Sample')).not.toBeInTheDocument()
  })
})

describe('AudioPreviewScreen — playback', () => {
  it('plays, and flips the control once the element says it started', () => {
    view()
    const button = screen.getByRole('button', { name: 'Play audio' })
    fireEvent.click(button)

    expect(play).toHaveBeenCalledTimes(1)
    // The label follows the ELEMENT, not the click: a play() that never starts must not leave
    // a Pause button over a silent player.
    expect(screen.getByRole('button', { name: 'Play audio' })).toBeInTheDocument()

    fireEvent.play(audio())
    expect(screen.getByRole('button', { name: 'Pause audio' })).toBeInTheDocument()
  })

  it('pauses through the element', () => {
    view()
    fireEvent.play(audio())
    fireEvent.click(screen.getByRole('button', { name: 'Pause audio' }))
    expect(pause).toHaveBeenCalledTimes(1)
  })

  it('tracks the head and exposes it to a screen reader', () => {
    view()
    audio().currentTime = 2
    fireEvent.timeUpdate(audio())

    expect(screen.getByTestId('audio-elapsed')).toHaveTextContent('00:02')
    expect(screen.getByRole('slider', { name: 'Audio progress' })).toHaveAttribute('aria-valuetext', '00:02 of 00:04')
  })

  it('seeks from the slider', () => {
    view()
    fireEvent.change(screen.getByRole('slider', { name: 'Audio progress' }), { target: { value: '3' } })
    expect(audio().currentTime).toBe(3)
    expect(screen.getByTestId('audio-elapsed')).toHaveTextContent('00:03')
  })

  it('says so when the browser refuses to start playback', async () => {
    play.mockImplementation(() => Promise.reject(new Error('NotAllowedError')))
    view()
    fireEvent.click(screen.getByRole('button', { name: 'Play audio' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('refused to start playback')
    // …and it says the take survived, because it did.
    expect(screen.getByRole('alert')).toHaveTextContent('still saveable')
  })
})

describe('AudioPreviewScreen — the auto-reset decision (plan §5 P4.6)', () => {
  it('does NOT rewind when playback finishes — a played take still reads as played', () => {
    view()
    audio().currentTime = 4
    fireEvent.timeUpdate(audio())
    fireEvent.ended(audio())

    expect(screen.getByTestId('audio-elapsed')).toHaveTextContent('00:04')
    expect(audio().currentTime).toBe(4)
    expect(screen.getByRole('button', { name: 'Play audio' })).toBeInTheDocument()
  })

  it('rewinds on the NEXT press instead, so the control is never dead (phone AudioPreview.tsx:106)', () => {
    view()
    audio().currentTime = 4
    fireEvent.timeUpdate(audio())
    fireEvent.ended(audio())

    fireEvent.click(screen.getByRole('button', { name: 'Play audio' }))

    expect(audio().currentTime).toBe(0)
    expect(play).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('audio-elapsed')).toHaveTextContent('00:00')
  })

  it('honours the phone’s 0.1s end tolerance', () => {
    view()
    audio().currentTime = 3.95
    fireEvent.timeUpdate(audio())
    fireEvent.click(screen.getByRole('button', { name: 'Play audio' }))
    expect(audio().currentTime).toBe(0)
  })

  it('does not rewind from the middle of a take', () => {
    view()
    audio().currentTime = 1.5
    fireEvent.timeUpdate(audio())
    fireEvent.click(screen.getByRole('button', { name: 'Play audio' }))
    expect(audio().currentTime).toBe(1.5)
  })
})

describe('AudioPreviewScreen — duration source', () => {
  it('prefers the RECORDED duration over the element’s, which WebM reports as Infinity', () => {
    // A MediaRecorder WebM blob reports `duration: Infinity` until it has been seeked. Trusting
    // the element first would put Infinity in the time row of most live takes.
    view()
    Object.defineProperty(audio(), 'duration', { configurable: true, value: Number.POSITIVE_INFINITY })
    fireEvent.loadedMetadata(audio())

    expect(screen.getByTestId('audio-total')).toHaveTextContent('00:04')
    expect(screen.getByRole('slider', { name: 'Audio progress' })).toHaveAttribute('max', '4')
  })

  it('falls back to the element when the capture states no duration, and disables a dead slider', () => {
    const { durationSec: _dropped, ...noDuration } = LIVE
    view({ captured: noDuration })
    expect(screen.getByRole('slider', { name: 'Audio progress' })).toBeDisabled()

    Object.defineProperty(audio(), 'duration', { configurable: true, value: 9 })
    fireEvent.loadedMetadata(audio())

    expect(screen.getByTestId('audio-total')).toHaveTextContent('00:09')
    expect(screen.getByRole('slider', { name: 'Audio progress' })).toBeEnabled()
  })
})
