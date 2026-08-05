import Link from 'next/link'

import { AppDemo } from '@/components/app-demo'
import { MarketingPhoneFrame } from '@/components/marketing/phone-frame'
import { siteConfig } from '@/lib/site-config'

// The H1 is siteConfig.tagline (one source for hero + metadata; resolves doc 07 Q6).
// SUB + BULLETS are the owner's draft, in progress — dropped in verbatim to see the
// space it occupies. Not transcribed from the design canvas; that copy is superseded.
const SUB =
  'A field tool built by a working Forensic Video Analyst that provides an organized, efficient, accurate, secure and private way to create and manage all CCTV extraction documentation and supporting media, from the initial request through the export of comprehensive, court-ready disclosure packages.'

const BULLETS = [
  'Create and retain unlimited cases and locations, all clearly labeled and organized by completion status.',
  'Import submission information from requests, emails, text messages, briefings and phone transcripts using on-device small language models (SLMs).',
  'Autocomplete and geolocation map incident and recovery locations. An interactive on-device map of all case locations can be exported with current location details.',
] as const

/**
 * Case-File split hero: credential chip, H1, sub + bullets, CTA row ⟷ bracketed phone.
 *
 * The reserved narrative slot that used to close this column is gone: it was holding
 * the footprint of the removed credential strip for exactly this copy, and the copy
 * now sits above the CTA row where it belongs — a visitor should know what the product
 * is before being asked to act on it.
 */
export function Hero() {
  return (
    // pt trimmed 84 → 48: with the tab strip gone the eyebrow chip already separates
    // the hero from the header, and every pixel here pushes the phone below the fold.
    //
    // The copy column is `lg:flex-1`, NOT a fixed max-width — same as the feature-page
    // header (components/feature-page.tsx). It used to be `max-w-[640px]` inside a
    // `justify-between` row, which capped the column and then turned every surplus
    // pixel into a dead gap between the copy and the phone on a wide window. Growing
    // the column instead lets the H1 reflow onto fewer lines as the viewport widens,
    // which also shortens this column on big screens — welcome, since the phone has to
    // clear the fold. The sub-paragraph keeps its own 560px cap: body copy wants a
    // 65-75 character measure no matter how wide the window is.
    <section className="flex flex-col items-start gap-14 px-10 pb-[72px] pt-12 lg:flex-row lg:gap-16 lg:px-20">
      <div className="w-full lg:flex-1">
        {/* credential eyebrow chip */}
        <div className="mb-[26px] inline-flex items-center gap-[10px] rounded-[20px] border border-cyan/30 bg-cyan/5 px-[14px] py-[7px]">
          <span
            aria-hidden="true"
            className="h-[7px] w-[7px] animate-[blinkDot_2.4s_ease-in-out_infinite] rounded-full bg-cyan shadow-[0_0_9px_rgba(78,205,196,0.9)]"
          />
          <span className="font-stmono text-[11px] tracking-[2px] text-cyan">
            BUILT ON EXPERIENCE — 15 YEARS · 1,500+ EXTRACTIONS
          </span>
        </div>

        <h1 className="mb-[22px] font-nacelle text-5xl font-semibold leading-[1.02] tracking-[-1.5px] text-heading lg:text-[62px]">
          {siteConfig.tagline}
        </h1>
        {/* 720px, not the 560px used on feature pages and not the H1's full width. The
            headline is 62px, so its long line is still only ~40 characters; this copy at
            17.5px runs ~82 there, which is at the upper edge of a comfortable measure but
            fine for a hero intro nobody reads for minutes. Matching the H1 exactly would
            put ~145 characters on a line. */}
        <p className="mb-6 max-w-[720px] text-[17.5px] leading-[1.65] text-body">{SUB}</p>

        <ul className="mb-[34px] flex max-w-[720px] flex-col gap-[14px]">
          {BULLETS.map((bullet) => (
            <li key={bullet} className="flex gap-3 text-[15.5px] leading-[1.65] text-body-2">
              <span
                aria-hidden="true"
                className="mt-[9px] h-[5px] w-[5px] flex-none rounded-full bg-cyan"
              />
              {bullet}
            </li>
          ))}
        </ul>

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
