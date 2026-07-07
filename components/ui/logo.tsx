import Link from "next/link";

import { siteConfig } from "@/lib/site-config";

/**
 * The Case-File logo mark: a rounded gradient square with a carolina crosshair
 * and a glowing gold center dot (recreated from the design canvas — no external
 * logo asset exists). Static inline markup, hoisted styling; the wordmark is the
 * header's concern so the mark can be reused at footer size.
 */
export default function Logo({ size = 34 }: { size?: number }) {
  return (
    <Link href="/" aria-label={siteConfig.name} className="inline-flex shrink-0">
      <span
        aria-hidden="true"
        className="relative block rounded-[9px] bg-[linear-gradient(135deg,#132236,#1a2d44)] shadow-[0_0_0_1px_#2a4a6f_inset]"
        style={{ width: size, height: size }}
      >
        <span className="absolute bottom-[6px] left-1/2 top-[6px] w-px bg-carolina/50" />
        <span className="absolute left-[6px] right-[6px] top-1/2 h-px bg-carolina/50" />
        <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold shadow-[0_0_10px_rgba(255,217,61,0.7)]" />
      </span>
    </Link>
  );
}
