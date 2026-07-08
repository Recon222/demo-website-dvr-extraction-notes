import type { ReactNode } from "react";

const BRACKET_BASE = "pointer-events-none absolute h-5 w-5 border-cyan/55";

/**
 * The Case-File corner-bracket framing: four 20×20 cyan brackets around the
 * content plus a centered top label chip (Share Tech Mono, letterspaced).
 * Server component; purely decorative markup around a slot.
 */
export function CornerBrackets({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="relative p-5">
      <span aria-hidden="true" className={`${BRACKET_BASE} left-0 top-0 border-l border-t`} />
      <span aria-hidden="true" className={`${BRACKET_BASE} right-0 top-0 border-r border-t`} />
      <span aria-hidden="true" className={`${BRACKET_BASE} bottom-0 left-0 border-b border-l`} />
      <span aria-hidden="true" className={`${BRACKET_BASE} bottom-0 right-0 border-b border-r`} />
      <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-ink-900 px-[10px] py-[2px] font-stmono text-[9px] tracking-[2px] text-cyan">
        {label}
      </span>
      {children}
    </div>
  );
}
