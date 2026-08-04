import Link from 'next/link'

import { AppDemo } from '@/components/app-demo'
import { MarketingPhoneFrame } from '@/components/marketing/phone-frame'
import { siteConfig } from '@/lib/site-config'

// Hero copy transcribed from the design canvas (artboard 1a) — final intent.
// The H1 is siteConfig.tagline (one source for hero + metadata; resolves doc 07 Q6).
const SUB =
  'An iOS field tool built by a working CCTV analyst, not a vendor. The request imports itself, the DVR clock gets calibrated against atomic time, the media files itself by location, and the report writes itself. You verify. You leave.'

/**
 * Case-File split hero: credential chip, H1, sub, CTA row, narrative slot ⟷ bracketed phone.
 *
 * The three-cell credential strip that used to close this column was removed (owner
 * decision): it restated the eyebrow chip's "15 YEARS · 1,500+ EXTRACTIONS" verbatim,
 * and its third cell published a per-scene time saving that is NOT confirmed for
 * publication (see PRODUCT.md §Evidence on Hand). Its footprint is held below so the
 * replacement narrative — a summary of the features that hands off into the manifest —
 * can drop straight in without the column resizing.
 */
export function Hero() {
  return (
    // pt trimmed 84 → 48: with the tab strip gone the eyebrow chip already separates
    // the hero from the header, and every pixel here pushes the phone below the fold.
    <section className="flex flex-col items-start gap-14 px-10 pb-[72px] pt-12 lg:flex-row lg:justify-between lg:px-20">
      <div className="max-w-[640px]">
        {/* credential eyebrow chip */}
        <div className="mb-[26px] inline-flex items-center gap-[10px] rounded-[20px] border border-cyan/30 bg-cyan/5 px-[14px] py-[7px]">
          <span
            aria-hidden="true"
            className="h-[7px] w-[7px] animate-[blinkDot_2.4s_ease-in-out_infinite] rounded-full bg-cyan shadow-[0_0_9px_rgba(78,205,196,0.9)]"
          />
          <span className="font-stmono text-[11px] tracking-[2px] text-cyan">
            BUILT ON THE BENCH — 15 YEARS · 1,500+ EXTRACTIONS
          </span>
        </div>

        <h1 className="mb-[22px] font-nacelle text-5xl font-semibold leading-[1.02] tracking-[-1.5px] text-heading lg:text-[62px]">
          {siteConfig.tagline}
        </h1>
        <p className="mb-[34px] max-w-[560px] text-[17.5px] leading-[1.65] text-body">{SUB}</p>

        {/* CTA row */}
        <div className="mb-10 flex items-center gap-[14px]">
          <Link
            href={siteConfig.cta.href}
            className="inline-flex items-center gap-[9px] rounded-[11px] bg-[linear-gradient(180deg,#ffe06a,#f5c62e)] px-6 py-[14px] text-[15px] font-bold text-[#241d00] shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_14px_34px_-12px_rgba(255,217,61,0.55)] transition-colors hover:bg-[linear-gradient(180deg,#ffe786,#ffd93d)]"
          >
            Join the TestFlight beta
            <span aria-hidden="true" className="font-jbmono font-bold">
              -&gt;
            </span>
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center gap-[9px] rounded-[11px] border border-input bg-[rgba(12,23,39,0.6)] px-[22px] py-[14px] text-[15px] font-semibold text-carolina transition-colors hover:border-cyan hover:text-[#cfeeea]"
          >
            Drive the live demo
          </Link>
        </div>

        {/* NARRATIVE SLOT — reserved footprint of the removed cred strip (see the
            component doc above). Holds the column's height steady until the feature-
            summary copy that hands off into the evidence manifest lands here. */}
        <div aria-hidden="true" className="h-[71px] max-w-[620px]" />
      </div>

      {/* hero phone — the walkthrough loop (media file is local-pending the
          pre-launch media strategy: committed assets vs LFS vs blob storage) */}
      <MarketingPhoneFrame scale={0.68} label="LIVE CAPTURE · 378×786">
        <AppDemo
          src="demos/home/walkthrough.mp4"
          poster="demos/home/walkthrough.webp"
          label="Product walkthrough"
          className="absolute inset-0 h-full w-full rounded-none object-cover"
        />
      </MarketingPhoneFrame>
    </section>
  )
}
