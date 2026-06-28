'use client'

/**
 * Browser-side PDF text extraction via pdf.js — the web analog of the phone app's native
 * `expo-pdf-text-extract`. The raw PDF bytes never leave the device; only the extracted text
 * is later sent to the model proxy. A scanned/image-only PDF (text under the min length)
 * throws a readable error — there is no OCR fallback (same as the app's v1).
 */

/** Below this many characters the PDF is treated as scanned/image-only. */
export const MIN_NATIVE_EXTRACTION_LENGTH = 50

export class PdfExtractionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PdfExtractionError'
  }
}

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  // Worker asset resolved by the bundler at runtime. (Inert in tests, where pdfjs is mocked.)
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const data = new Uint8Array(await file.arrayBuffer())
  // pdf.js v6 defaults isEvalSupported:false (CVE-2024-4367 patched) — no eval-based injection.
  const loadingTask = pdfjs.getDocument({ data })
  let text = ''
  try {
    // Inside the try so a load-time rejection (corrupt/encrypted PDF) still hits finally → destroy.
    const doc = await loadingTask.promise
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      text += (content.items as Array<{ str?: string }>).map((it) => it.str ?? '').join(' ') + '\n'
    }
  } finally {
    // Swallow teardown errors so they can't shadow the original page/load error.
    await loadingTask.destroy().catch(() => {})
  }

  const trimmed = text.trim()
  if (trimmed.length < MIN_NATIVE_EXTRACTION_LENGTH) {
    throw new PdfExtractionError(
      'This PDF looks scanned or image-only — no selectable text was found. Paste the request text instead.',
    )
  }
  return trimmed
}
