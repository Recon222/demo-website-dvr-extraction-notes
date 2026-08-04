# Self-hosted Tesseract OCR runtime assets (parity P4.7)

The demo's OCR camera runs recognition entirely in the visitor's browser and must not
depend on third-party CDNs at runtime, so the three assets tesseract.js would otherwise
pull from jsdelivr are vendored here and referenced by explicit `/ocr/...` paths from
`features/demo/ui/inputs/ocr-recognize.ts`. They are fetched lazily — only when a live
camera capture actually runs recognition — and never enter the app bundle.

| File | Source | Version |
|------|--------|---------|
| `worker.min.js` | `tesseract.js/dist/worker.min.js` (npm) | tesseract.js 7.0.0 |
| `tesseract-core-simd-lstm.wasm.js` | `tesseract.js-core` (npm) — single-file build, wasm embedded; the SIMD+LSTM variant is pinned deliberately (see §64) | tesseract.js-core 7.0.0 |
| `eng.traineddata.gz` | `@tesseract.js-data/eng/4.0.0_best_int` (npm) — LSTM-only English model | @tesseract.js-data/eng 1.0.0 |

To refresh after a tesseract.js upgrade, re-copy all three from `node_modules` (the worker
and core versions must match the installed `tesseract.js`).

Licenses: tesseract.js and tesseract.js-core are Apache-2.0; the traineddata model files
are Apache-2.0 (tessdata).
