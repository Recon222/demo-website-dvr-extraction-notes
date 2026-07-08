import Link from "next/link";

import Logo from "./logo";
import { siteConfig } from "@/lib/site-config";

/** Case-File header: logo mark + wordmark left; nav links + the gold beta CTA right. */
export default function Header() {
  return (
    <header className="flex items-center justify-between px-10 py-[18px]">
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
  );
}
