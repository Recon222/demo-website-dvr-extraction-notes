import CoreGraphics
import CoreText
import Foundation
import ImageIO
import UniformTypeIdentifiers

// Authoring-time generator for the demo's bundled SAMPLE still images.
// usage: swift make-sample-still.swift <out.jpg> <width> <height> <headline> <subline>

let outURL = URL(fileURLWithPath: CommandLine.arguments[1])
let width = Int(CommandLine.arguments[2])!
let height = Int(CommandLine.arguments[3])!
let headline = CommandLine.arguments[4]
let subline = CommandLine.arguments[5]

let colorSpace = CGColorSpaceCreateDeviceRGB()
let ctx = CGContext(
  data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
  space: colorSpace, bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue
)!

func drawText(_ text: String, size: CGFloat, y: CGFloat, gray: CGFloat) {
  let font = CTFontCreateWithName("Menlo" as CFString, size, nil)
  let attrs: [CFString: Any] = [
    kCTFontAttributeName: font,
    kCTForegroundColorAttributeName: CGColor(colorSpace: colorSpace, components: [gray, gray, gray, 1.0])!,
    kCTKernAttributeName: size * 0.18,
  ]
  let line = CTLineCreateWithAttributedString(CFAttributedStringCreate(nil, text as CFString, attrs as CFDictionary)!)
  let bounds = CTLineGetBoundsWithOptions(line, [])
  ctx.textPosition = CGPoint(x: (CGFloat(width) - bounds.width) / 2, y: y)
  CTLineDraw(line, ctx)
}

ctx.setFillColor(CGColor(colorSpace: colorSpace, components: [0.043, 0.067, 0.098, 1])!)
ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))

ctx.setStrokeColor(CGColor(colorSpace: colorSpace, components: [1, 1, 1, 0.05])!)
ctx.setLineWidth(1)
for x in stride(from: 0, through: width, by: 40) {
  ctx.move(to: CGPoint(x: CGFloat(x), y: 0)); ctx.addLine(to: CGPoint(x: CGFloat(x), y: CGFloat(height)))
}
for y in stride(from: 0, through: height, by: 40) {
  ctx.move(to: CGPoint(x: 0, y: CGFloat(y))); ctx.addLine(to: CGPoint(x: CGFloat(width), y: CGFloat(y)))
}
ctx.strokePath()

// Corner brackets — the forensic framing motif, and a visual cue that this is a placeholder card.
ctx.setStrokeColor(CGColor(colorSpace: colorSpace, components: [0.17, 0.55, 0.76, 0.7])!)
ctx.setLineWidth(3)
let m: CGFloat = 24, len: CGFloat = 44
let w = CGFloat(width), h = CGFloat(height)
for (cx, cy, dx, dy) in [(m, m, 1.0, 1.0), (w - m, m, -1.0, 1.0), (m, h - m, 1.0, -1.0), (w - m, h - m, -1.0, -1.0)] {
  ctx.move(to: CGPoint(x: cx + len * dx, y: cy)); ctx.addLine(to: CGPoint(x: cx, y: cy))
  ctx.addLine(to: CGPoint(x: cx, y: cy + len * dy))
}
ctx.strokePath()

drawText(headline, size: 34, y: h / 2 + 10, gray: 0.88)
drawText(subline, size: 13, y: h / 2 - 30, gray: 0.55)

let image = ctx.makeImage()!
let dest = CGImageDestinationCreateWithURL(outURL as CFURL, UTType.jpeg.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, image, [kCGImageDestinationLossyCompressionQuality: 0.72] as CFDictionary)
CGImageDestinationFinalize(dest)
print("wrote \(outURL.path)")
