/**
 * The OCR strip's crop geometry (parity P4.7) — the phone's bounding-box numbers, verified
 * against source, applied to a browser viewfinder.
 *
 * Phone constants (`src/features/ocr-time-capture/constants/index.ts:4-15`):
 *  - `BOX_WIDTH_PERCENT  = 0.80` — 80% of the frame's long axis;
 *  - `BOX_HEIGHT_PERCENT = 0.17` — 17% of the frame's short axis;
 *  - `CROP_BUFFER_PERCENT = 0.05` — 5% hand-shake buffer PER SIDE, applied to the WIDTH ONLY
 *    (`ocr-capture-service.ts:65-70`: `boxWidth = photo.width * (widthPercent + buffer * 2)`,
 *    `boxHeight = photo.height * heightPercent` — the height gets no buffer). The crop is
 *    centered in the frame.
 *
 * The one demo-specific step: the phone crops the RAW photo, whose full frame is what the
 * operator saw. The demo's viewfinder renders the stream with `object-fit: cover`, so when the
 * camera's aspect differs from the viewfinder's, part of the frame is NOT on screen — and a
 * crop taken of the raw frame would include pixels the operator never aimed at. `ocrCropRegion`
 * therefore computes the strip relative to the VISIBLE (cover-fitted) region and returns it in
 * normalized raw-frame coordinates, which is what `grabVideoFrame`'s `crop` option consumes.
 * When the aspects match, this reduces exactly to the phone's numbers:
 * `{ x: 0.05, y: 0.415, width: 0.90, height: 0.17 }`.
 */

/** Phone `BOX_WIDTH_PERCENT` (constants/index.ts:4). */
export const OCR_BOX_WIDTH_FRACTION = 0.8
/** Phone `BOX_HEIGHT_PERCENT` (constants/index.ts:5). */
export const OCR_BOX_HEIGHT_FRACTION = 0.17
/** Phone `CROP_BUFFER_PERCENT` (constants/index.ts:15) — per side, width only. */
export const OCR_CROP_BUFFER_FRACTION = 0.05

export interface NormalizedCrop {
  x: number
  y: number
  width: number
  height: number
}

/**
 * The normalized (0–1, raw-frame coordinates) crop rectangle for the DVR timestamp strip.
 *
 * @param frameWidth  the stream's intrinsic width (`video.videoWidth`)
 * @param frameHeight the stream's intrinsic height (`video.videoHeight`)
 * @param viewAspect  the viewfinder's width/height ratio (the demo's landscape frame)
 * @returns the crop, or `null` for degenerate inputs (a stream with no dimensions yet —
 *          the caller reports the honest grab failure rather than cropping a guess).
 */
export function ocrCropRegion(
  frameWidth: number,
  frameHeight: number,
  viewAspect: number,
): NormalizedCrop | null {
  if (!(frameWidth > 0) || !(frameHeight > 0) || !(viewAspect > 0)) return null

  // The fraction of the frame visible under `object-fit: cover`, centered: a frame wider than
  // the viewfinder loses its sides, a taller one its top and bottom.
  const frameAspect = frameWidth / frameHeight
  const visibleWidth = frameAspect > viewAspect ? viewAspect / frameAspect : 1
  const visibleHeight = frameAspect > viewAspect ? 1 : frameAspect / viewAspect

  const width = (OCR_BOX_WIDTH_FRACTION + OCR_CROP_BUFFER_FRACTION * 2) * visibleWidth
  const height = OCR_BOX_HEIGHT_FRACTION * visibleHeight
  return { x: (1 - width) / 2, y: (1 - height) / 2, width, height }
}
