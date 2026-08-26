// Renders a DVR-style clock frame and writes a looping .y4m for Chromium's
// --use-file-for-fake-video-capture, so the demo's OCR path has real text to read.
import Foundation
import AppKit

let args = CommandLine.arguments
let outPath = args.count > 1 ? args[1] : "dvrclock.y4m"
let text    = args.count > 2 ? args[2] : "2026-07-31 14:23:45"
let W = 640, H = 480

let cs = CGColorSpaceCreateDeviceRGB()
guard let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8,
                          bytesPerRow: W*4, space: cs,
                          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else {
    print("ERR: no context"); exit(1)
}
// Black DVR panel, bright monospace timestamp — high contrast for OCR.
ctx.setFillColor(CGColor(red: 0.04, green: 0.04, blue: 0.05, alpha: 1))
ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))

let ns = NSGraphicsContext(cgContext: ctx, flipped: false)
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = ns
let font = NSFont.monospacedSystemFont(ofSize: 54, weight: .bold)
let attrs: [NSAttributedString.Key: Any] = [
    .font: font,
    .foregroundColor: NSColor(calibratedWhite: 0.98, alpha: 1.0),
]
let s = NSAttributedString(string: text, attributes: attrs)
let sz = s.size()
s.draw(at: NSPoint(x: (CGFloat(W) - sz.width)/2, y: (CGFloat(H) - sz.height)/2))
NSGraphicsContext.restoreGraphicsState()

guard let data = ctx.data else { print("ERR: no data"); exit(1) }
let px = data.bindMemory(to: UInt8.self, capacity: W*H*4)

// BT.601 RGB -> YUV420 (planar), which is what C420 in the y4m header means.
var yP = [UInt8](repeating: 0, count: W*H)
var uP = [UInt8](repeating: 128, count: (W/2)*(H/2))
var vP = [UInt8](repeating: 128, count: (W/2)*(H/2))
for y in 0..<H {
    for x in 0..<W {
        let o = (y*W + x)*4
        let r = Double(px[o]), g = Double(px[o+1]), b = Double(px[o+2])
        yP[y*W + x] = UInt8(max(0, min(255, 0.299*r + 0.587*g + 0.114*b)))
        if y % 2 == 0 && x % 2 == 0 {
            let ci = (y/2)*(W/2) + (x/2)
            uP[ci] = UInt8(max(0, min(255, -0.169*r - 0.331*g + 0.500*b + 128)))
            vP[ci] = UInt8(max(0, min(255,  0.500*r - 0.419*g - 0.081*b + 128)))
        }
    }
}

var out = Data()
out.append("YUV4MPEG2 W\(W) H\(H) F30:1 Ip A1:1 C420jpeg\n".data(using: .ascii)!)
for _ in 0..<60 {                       // ~2 s; Chromium loops the file
    out.append("FRAME\n".data(using: .ascii)!)
    out.append(contentsOf: yP); out.append(contentsOf: uP); out.append(contentsOf: vP)
}
try! out.write(to: URL(fileURLWithPath: outPath))
print("wrote \(outPath) (\(out.count) bytes) text=\(text)")
