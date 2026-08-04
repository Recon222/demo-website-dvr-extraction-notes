'use client'

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import Logo from "./logo";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/cn";

/**
 * Case-File header: logo mark + wordmark left; nav links + the gold beta CTA right.
 *
 * STICKY, AND DELIBERATELY WITHOUT A BACKGROUND. The beta CTA is the point of the
 * whole site, and it used to scroll away exactly when a visitor started reading the
 * manifest. It now persists — but a sticky *bar* would draw a hard edge that content
 * slides under, so there is no bar: the gold button and the logo mark are opaque and
 * self-contained (the button carries its own gradient and halo), and everything else
 * fades out on scroll. Content passes under them with nothing in between.
 *
 * Do not add a background, border, or gradient scrim here — that is the exact edge
 * this design avoids.
 *
 * The condense state comes from an IntersectionObserver on a zero-footprint sentinel
 * spanning the header band, not a scroll listener: no scroll-frame work, same idiom
 * as AppDemo. Without IntersectionObserver (or in jsdom, where the setup installs a
 * no-op) the header simply stays expanded, which is the safe state.
 */
export default function Header() {
  const [condensed, setCondensed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver !== "function") {
      return; // no observer → stay expanded
    }
    const observer = new IntersectionObserver(
      ([entry]) => setCondensed(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Faded chrome is also removed from the tab order and the a11y tree: opacity alone
  // would leave invisible links focusable. `inert` (React 19) does both.
  const fade = cn(
    "transition-opacity duration-300 motion-reduce:transition-none",
    condensed && "opacity-0",
  );

  return (
    <>
      {/* Zero-footprint scroll sentinel: absolutely positioned, so it adds no height
          to the header band it spans. While any of it is in view we are at the top. */}
      <div
        ref={sentinelRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 h-20 w-full"
      />
      <header className="sticky top-0 z-50 flex items-center justify-between px-10 py-[18px]">
        <div className="flex items-center gap-[13px]">
          <Logo />
          <div className={cn("flex flex-col", fade)} inert={condensed}>
            <span className="font-nacelle text-[16.5px] font-semibold tracking-[0.2px] text-heading">
              {siteConfig.name}
            </span>
            <span className="font-stmono text-[9.5px] tracking-[2.4px] text-faint">
              CCTV RECOVERY · DOCUMENTED
            </span>
          </div>
        </div>

        <nav aria-label="Main" className="flex items-center gap-[30px]">
          <div className={cn("flex items-center gap-[30px]", fade)} inert={condensed}>
            {siteConfig.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-carolina transition-colors hover:text-heading"
              >
                {item.label}
              </Link>
            ))}
          </div>
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
