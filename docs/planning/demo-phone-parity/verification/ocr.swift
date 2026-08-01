import Foundation
import Vision
import AppKit
let args = CommandLine.arguments
guard args.count > 1, let img = NSImage(contentsOfFile: args[1]),
      let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    print("ERR: cannot load image"); exit(1)
}
let req = VNRecognizeTextRequest()
req.recognitionLevel = .accurate
req.usesLanguageCorrection = false
let handler = VNImageRequestHandler(cgImage: cg, options: [:])
try? handler.perform([req])
guard let obs = req.results else { print("(no text)"); exit(0) }
struct L { let y: Double; let x: Double; let s: String }
var lines: [L] = []
for o in obs {
    guard let c = o.topCandidates(1).first else { continue }
    let b = o.boundingBox
    let yc = 1.0 - (Double(b.origin.y) + Double(b.height)/2.0)
    let xc = Double(b.origin.x) + Double(b.width)/2.0
    lines.append(L(y: yc, x: xc, s: c.string))
}
lines.sort { abs($0.y - $1.y) > 0.006 ? $0.y < $1.y : $0.x < $1.x }
for l in lines {
    print(String(format: "%5.1f%% %5.1f%%  ", l.y*100, l.x*100) + l.s)
}
