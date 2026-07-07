/**
 * The top utility strip (Case-File chrome): FVA identity on the left, the live
 * recruiting status with a blinking cyan dot on the right. Pure server markup;
 * the blink animation is CSS (paused under prefers-reduced-motion globally).
 */
export function UtilityStrip() {
  return (
    <div className="flex items-center justify-between border-b border-hairline px-10 py-[9px] font-stmono text-[10.5px] tracking-[2px] text-faint">
      <div>FVA DEVELOPMENT · FIELD TOOLS</div>
      <div className="flex items-center gap-[9px]">
        <span
          aria-hidden="true"
          className="h-[6px] w-[6px] animate-[blinkDot_2.4s_ease-in-out_infinite] rounded-full bg-cyan shadow-[0_0_8px_rgba(78,205,196,0.8)]"
        />
        <span className="text-muted">IOS BETA — TESTFLIGHT · RECRUITING</span>
      </div>
    </div>
  );
}
