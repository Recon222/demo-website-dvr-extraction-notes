'use client'

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import Logo from "./logo";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/cn";

/**
 * Case-File header: logo mark + wordmark left; nav links + the gold beta CTA right.
 *
 * STICKY, WITHOUT A BACKGROUND, AND IT FADES OUT ENTIRELY ON SCROLL. An earlier pass
 * kept the logo and the CTA pinned while the rest faded, so the beta ask stayed
 * reachable — but two elements floating over the content read worse than they were
 * worth (owner decision), and the page carries its own beta CTA at the foot. The whole
 * header now dissolves in place and fades back in at the top.
 *
 * Do not add a background, border, or gradient scrim: content passes under this while
 * it fades, and any fill would draw a hard edge for it to slide beneath.
 *
 * The condense state comes from an IntersectionObserver on a zero-footprint sentinel
 * spanning the header band, not a scroll listener: no scroll-frame work, same idiom as
 * AppDemo. Without IntersectionObserver (or in jsdom, where the setup installs a no-op)
 * the header simply stays visible, which is the safe state.
 *
 * `inert` (React 19) rides with the fade so the faded header is not merely invisible:
 * opacity alone would leave the logo, four nav links, and the CTA focusable and in the
 * a11y tree, floating over content nobody can see them on top of.
 */
export default function Header() {
  const [condensed, setCondensed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver !== "function") {
      return; // no observer → stay visible
    }
    const observer = new IntersectionObserver(
      ([entry]) => setCondensed(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Zero-footprint scroll sentinel: absolutely positioned, so it adds no height
          to the header band it spans. While any of it is in view we are at the top. */}
      <div
        ref={sentinelRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 h-20 w-full"
      />
      <header
        inert={condensed}
        className={cn(
          "sticky top-0 z-50 flex items-center justify-between px-10 py-[18px]",
          "transition-opacity duration-300 motion-reduce:transition-none",
          condensed && "opacity-0",
        )}
      >
        <div className="flex items-center gap-[13px]">
          <Logo />
          <div className="flex flex-col">
            <span className="font-nacelle text-[16.5px] font-semibold tracking-[0.2px] text-heading">
              {siteConfig.name}
            </span>
            <span className="font-stmono text-[9.5px] tracking-[2.4px] text-faint">
              CCTV RECOVERY · DOCUMENTED
            </span>
          </div>
        </div>

        <nav aria-label="Main" className="flex items-center gap-[30px]">
          {siteConfig.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-carolina transition-colors hover:text-heading"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={siteConfig.cta.href}
            className="rounded-[10px] bg-[linear-gradient(180deg,#ffe06a,#f5c62e)] px-[18px] py-[10px] text-[13.5px] font-bold text-[#241d00] shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_8px_24px_-10px_rgba(255,217,61,0.5)] transition-colors hover:bg-[linear-gradient(180deg,#ffe786,#ffd93d)]"
          >
            {siteConfig.cta.label}
          </Link>
        </nav>
      </header>
    </>
  );
}
