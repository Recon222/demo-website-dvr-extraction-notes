import AVFoundation
import CoreGraphics
import CoreText
import Foundation

// Authoring-time generator for the demo's bundled SAMPLE video clip.
// Not shipped, not imported by the app — run once, commit the .mp4 it writes.

let outURL = URL(fileURLWithPath: CommandLine.arguments[1])
try? FileManager.default.removeItem(at: outURL)

let width = 640
let height = 360
let fps: Int32 = 12
let seconds = 4

let writer = try! AVAssetWriter(outputURL: outURL, fileType: .mp4)
let settings: [String: Any] = [
  AVVideoCodecKey: AVVideoCodecType.h264,
  AVVideoWidthKey: width,
  AVVideoHeightKey: height,
  AVVideoCompressionPropertiesKey: [
    AVVideoAverageBitRateKey: 200_000,
    AVVideoProfileLevelKey: AVVideoProfileLevelH264BaselineAutoLevel,
  ],
]
let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(
  assetWriterInput: input,
  sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA),
    kCVPixelBufferWidthKey as String: width,
    kCVPixelBufferHeightKey as String: height,
  ]
)
writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

let colorSpace = CGColorSpaceCreateDeviceRGB()

func drawText(_ ctx: CGContext, _ text: String, size: CGFloat, y: CGFloat, gray: CGFloat) {
  let font = CTFontCreateWithName("Menlo" as CFString, size, nil)
  let attrs: [CFString: Any] = [
    kCTFontAttributeName: font,
    kCTForegroundColorAttributeName: CGColor(colorSpace: colorSpace, components: [gray, gray, gray, 1.0])!,
    kCTKernAttributeName: size * 0.18,
  ]
  let attributed = CFAttributedStringCreate(nil, text as CFString, attrs as CFDictionary)!
  let line = CTLineCreateWithAttributedString(attributed)
  let bounds = CTLineGetBoundsWithOptions(line, [])
  ctx.textPosition = CGPoint(x: (CGFloat(width) - bounds.width) / 2, y: y)
  CTLineDraw(line, ctx)
}

let totalFrames = Int(fps) * seconds
for frame in 0..<totalFrames {
  var pxBuffer: CVPixelBuffer?
  CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pxBuffer)
  guard let buffer = pxBuffer else { fatalError("no pixel buffer") }
  CVPixelBufferLockBaseAddress(buffer, [])
  let ctx = CGContext(
    data: CVPixelBufferGetBaseAddress(buffer),
    width: width,
    height: height,
    bitsPerComponent: 8,
    bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
    space: colorSpace,
    bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
  )!

  // Backdrop: the demo's dark forensic slate.
  ctx.setFillColor(CGColor(colorSpace: colorSpace, components: [0.043, 0.067, 0.098, 1])!)
  ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))

  // Faint grid so the frame reads as a placeholder card, not footage.
  ctx.setStrokeColor(CGColor(colorSpace: colorSpace, components: [1, 1, 1, 0.05])!)
  ctx.setLineWidth(1)
  for x in stride(from: 0, through: width, by: 40) {
    ctx.move(to: CGPoint(x: CGFloat(x), y: 0)); ctx.addLine(to: CGPoint(x: CGFloat(x), y: CGFloat(height)))
  }
  for y in stride(from: 0, through: height, by: 40) {
    ctx.move(to: CGPoint(x: 0, y: CGFloat(y))); ctx.addLine(to: CGPoint(x: CGFloat(width), y: CGFloat(y)))
  }
  ctx.strokePath()

  // A sweep bar so it is unmistakably moving video, not a still.
  let progress = CGFloat(frame) / CGFloat(totalFrames)
  ctx.setFillColor(CGColor(colorSpace: colorSpace, components: [0.17, 0.55, 0.76, 0.55])!)
  ctx.fill(CGRect(x: 0, y: 0, width: CGFloat(width) * progress, height: 4))

  drawText(ctx, "SAMPLE CLIP", size: 34, y: CGFloat(height) / 2 + 10, gray: 0.88)
  drawText(ctx, "NO CAMERA AVAILABLE IN THIS BROWSER", size: 13, y: CGFloat(height) / 2 - 30, gray: 0.55)
  drawText(ctx, String(format: "%04.1fs", Double(frame) / Double(fps)), size: 12, y: 24, gray: 0.42)

  CVPixelBufferUnlockBaseAddress(buffer, [])

  while !input.isReadyForMoreMediaData { usleep(2000) }
  adaptor.append(buffer, withPresentationTime: CMTime(value: CMTimeValue(frame), timescale: fps))
}

input.markAsFinished()
let sem = DispatchSemaphore(value: 0)
writer.finishWriting { sem.signal() }
sem.wait()
if writer.status != .completed { fatalError("writer failed: \(String(describing: writer.error))") }
print("wrote \(outURL.path)")
