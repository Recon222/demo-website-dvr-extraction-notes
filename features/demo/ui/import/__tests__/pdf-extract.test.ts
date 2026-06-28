import { describe, it, expect, vi, beforeEach } from 'vitest'

const getDocument = vi.fn()
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument,
}))

import { extractPdfText, PdfExtractionError } from '@/features/demo/ui/import/pdf-extract'

function mockDoc(pages: string[]) {
  return {
    promise: Promise.resolve({
      numPages: pages.length,
      getPage: (i: number) =>
        Promise.resolve({ getTextContent: () => Promise.resolve({ items: [{ str: pages[i - 1] }] }) }),
    }),
    destroy: () => Promise.resolve(),
  }
}

const file = { arrayBuffer: async () => new ArrayBuffer(8) } as unknown as File

beforeEach(() => getDocument.mockReset())

describe('extractPdfText', () => {
  it('joins page text from the document', async () => {
    getDocument.mockReturnValue(mockDoc(['This is a sufficiently long recovery request document.']))
    const text = await extractPdfText(file)
    expect(text).toContain('recovery request document')
  })

  it('throws PdfExtractionError for too little text (scanned/image-only)', async () => {
    getDocument.mockReturnValue(mockDoc(['tiny']))
    await expect(extractPdfText(file)).rejects.toBeInstanceOf(PdfExtractionError)
  })
})
