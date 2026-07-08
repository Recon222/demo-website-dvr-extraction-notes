import Link from "next/link";

import Logo from "./logo";
import { siteConfig } from "@/lib/site-config";

const FOOTER_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "Live demo", href: "/demo" },
  { label: "Join the beta", href: "/beta" },
  { label: "Privacy", href: "/privacy" },
] as const;

/**
 * Case-File footer: mini logo mark + copyright left, center links, and the
 * technical trust label right. The template's footer illustration is gone —
 * the Case-File design uses none.
 */
export default function Footer() {
  return (
    <footer className="flex flex-col items-center gap-4 border-t border-hairline px-10 py-7 md:flex-row md:justify-between">
      <div className="flex items-center gap-3">
        <Logo size={26} />
        <p className="text-[13px] text-muted">
          © {new Date().getFullYear()} FVA Development · {siteConfig.name}
        </p>
      </div>

      <nav aria-label="Footer">
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px]">
          {FOOTER_LINKS.map((item) => (
            <li key={item.href}>
              <Link
                className="text-carolina transition-colors hover:text-heading"
                href={item.href}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="font-stmono text-[10px] tracking-[2px] text-ghost">
        ON-DEVICE · NTP-CALIBRATED · ENCRYPTED
      </div>
    </footer>
  );
}
