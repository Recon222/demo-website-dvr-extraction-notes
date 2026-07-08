import type { CSSProperties, ReactNode } from "react";

import { CornerBrackets } from "./corner-brackets";

/**
 * The marketing device shell. Pixel constants are COPIED from the demo's shell
 * (features/demo/ui/PhoneFrame.tsx: 404 frame · 378×786 screen) — deliberately
 * NOT imported: anything reached through the demo barrel drags
 * mapbox-gl/pdfjs-dist/motion into marketing bundles (bundle-barrel-imports,
 * CRITICAL), and the demo's frame is a client component with viewport-fit
 * scaling we don't want.
 *
 * Unlike the demo's shell, this one draws NO screen chrome (no fake status bar,
 * dynamic island, scan sweep, or home indicator) — owner decision after the
 * first real recording landed: the screen captures carry the device's REAL
 * chrome, and the mocked overlays doubled every element on top of it.
 *
 * A Server Component at a FIXED scale (ceil'd footprint boxes: hero 0.78 →
 * 316×634; feature rows 0.62 → 251×504), wrapped in the corner-bracket framing.
 * The only client leaf inside is whatever the caller renders in the screen slot
 * (typically <AppDemo/>, a looping muted video).
 */
const FRAME_W = 404;
const FRAME_H = 812;

// Static style objects hoisted to module scope (rendering-hoist-jsx) — these are
// the prototype-verbatim pixel values; do not "tidy" them.
const frameStyle: CSSProperties = {
  position: "relative",
  width: FRAME_W,
  padding: 13,
  borderRadius: 58,
  background: "linear-gradient(150deg,#4a4f57 0%,#23272e 42%,#191c22 58%,#3c4148 100%)",
  boxShadow:
    "0 60px 100px -34px rgba(0,0,0,0.85),0 0 0 1.5px rgba(255,255,255,0.05) inset,0 2px 3px rgba(255,255,255,0.10) inset",
};

const screenStyle: CSSProperties = {
  position: "relative",
  width: 378,
  height: 786,
  borderRadius: 46,
  overflow: "hidden",
  background: "#0d1b2a",
  boxShadow: "0 0 0 2px #05080d inset",
};

const gridStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage:
    "repeating-linear-gradient(0deg,rgba(153,186,221,0.05) 0 1px,transparent 1px 40px),repeating-linear-gradient(90deg,rgba(153,186,221,0.05) 0 1px,transparent 1px 40px)",
  pointerEvents: "none",
  zIndex: 0,
};

export interface MarketingPhoneFrameProps {
  /** Fixed display scale: 0.78 for the hero, 0.62 for feature rows. */
  scale: number;
  /** Corner-bracket label chip, e.g. `REC 01 — CASES` or `LIVE CAPTURE · 378×786`. */
  label: string;
  /** Screen content — typically an <AppDemo/> loop filling the slot. */
  children: ReactNode;
}

export function MarketingPhoneFrame({ scale, label, children }: MarketingPhoneFrameProps) {
  return (
    <CornerBrackets label={label}>
      {/* Fixed-footprint box so layout never depends on the transform. Ceil, not
          round: the box must never under-fit the scaled device (matches the
          design's hand-picked row box: 404×0.62 → 251, 812×0.62 → 504). */}
      <div
        style={{
          width: Math.ceil(FRAME_W * scale),
          height: Math.ceil(FRAME_H * scale),
        }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <div style={frameStyle}>
            <div style={screenStyle}>
              <div style={gridStyle} />
              {/* screen slot — the recording's own device chrome (status bar,
                  island, home indicator) is the only chrome; the frame adds none */}
              <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>{children}</div>
            </div>
          </div>
        </div>
      </div>
    </CornerBrackets>
  );
}
