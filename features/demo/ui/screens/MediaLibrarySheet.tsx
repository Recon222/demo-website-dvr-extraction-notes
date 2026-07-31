'use client'

import { ModalShell } from '@/features/demo/ui/screens/_shared'

/**
 * The Media Library sheet (phone `MediaLibrarySheet`, ui-mapping 09; matrix rows 57-66).
 *
 * INTERIM. P4.2 built the drawer row that opens it — the entry point that made every media
 * surface reachable — but the library itself (Photos / Video / Audio tabs, lists, inline and
 * fullscreen preview, long-press delete) is P4.5. Rather than wire the row to nothing, or
 * fake a library with no media in it, the sheet opens and says what it is: the same treatment
 * `placeholder()` gives the not-yet-built `mediaCapture`/`audioRecording` views.
 *
 * The title is the phone's verbatim (`Media Library`, ui-mapping 09) so the surface is
 * recognisable, and the modal id is registered through the normal registry discipline
 * (`ModalId` → `MODAL_IDS` → `activeModal()`), so P4.5 replaces this BODY and nothing else.
 *
 * DELIBERATE (do not "fix" in P4.5): closing always clears state through `onClose` — the demo
 * must not replicate the phone's missing-`onDismiss` bug (plan D-B6), where an iOS swipe-away
 * leaves `showMediaLibrary` true and the drawer never reopens.
 */
export function MediaLibrarySheet({ onClose }: { onClose(): void }) {
  return (
    <ModalShell title="Media Library" onClose={onClose}>
      <div style={{ padding: '28px 22px', color: '#99badd', fontSize: 14, lineHeight: 1.65 }}>
        <div style={{ fontWeight: 600, color: '#cdd9e6', marginBottom: 8 }}>The Media Library is a fast-follow.</div>
        <div>
          Photos, video and audio captured on scene list here — the tabs, the item preview and the
          delete flow land with the rest of the media package.
        </div>
      </div>
    </ModalShell>
  )
}
