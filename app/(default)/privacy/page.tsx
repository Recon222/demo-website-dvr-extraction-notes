import type { Metadata } from 'next'

import { BoldText } from '@/components/feature/bold-text'
import { siteConfig } from '@/lib/site-config'

export const metadata: Metadata = {
  title: `Privacy Policy — ${siteConfig.name}`,
  description: `How ${siteConfig.name} handles your data: on-device by default, with a complete ledger of the little that ever touches a network.`,
}

// ── Copy transcribed from the design canvas (artboard 3a) — adapted from the app
// policy; legal sign-off pending (the header chip says so on the page itself). ──

const LEDGER_GRID = 'grid grid-cols-[250px_1fr_320px_130px] items-center gap-4 px-[26px]'

const LEDGER_ROWS = [
  {
    what: 'Time packets (NTP)',
    when: 'Only when you run a time calibration',
    contains: 'A clock query. No identifiers.',
  },
  {
    what: 'Map look-ups',
    when: 'When you geocode an address or open the case map',
    contains: 'The address string you typed. Nothing else.',
  },
  {
    what: 'Crash reports',
    when: 'If the app crashes',
    contains: 'Anonymous stack trace. No case content.',
  },
] as const

const PERMISSIONS = [
  { key: 'CAMERA', use: 'reading DVR timestamps (OCR) and capturing scene photos/video' },
  { key: 'MICROPHONE', use: 'recording audio notes at a location' },
  { key: 'LOCATION', use: 'pinning sites and GPS-marking cameras, only while you use it' },
  { key: 'FACE ID', use: 'unlocking the app and gating encrypted exports' },
] as const

const SECTIONS = [
  {
    id: 'what-stays',
    title: 'What stays on the phone',
    body: 'Everything you create — cases, locations, photos, video, audio, documents, notes, and reports — is stored in an encrypted database on your device, behind your device passcode and Face ID. We operate no server that receives, stores, or can access your case data.',
  },
  {
    id: 'on-device-ai',
    title: 'The on-device AI',
    body: "Request import uses Apple's on-device intelligence (iOS 26+). The document is read on your phone's own hardware — its contents are not transmitted to Apple, to us, or to any third party. If your device doesn't support it, the feature is simply unavailable; nothing falls back to a cloud service.",
  },
  { id: 'permissions', title: 'Permissions we ask for', body: null }, // rendered specially
  {
    id: 'exports',
    title: 'What you export',
    body: 'Sharing is always your action: exports are password-protected encrypted archives, the password is set by you, and where they go is your call. The app never uploads a package anywhere on its own.',
  },
  {
    id: 'beta-emails',
    title: 'The beta email list',
    body: "If you sign up for the beta on this site, we store the email address you give us and use it for exactly one thing: beta invites and beta updates. Unsubscribe ends it; we don't share or sell the list.",
  },
  { id: 'contact', title: 'Contact', body: null }, // rendered specially
] as const

/** The Case-File privacy page: trust-story header, the network ledger, sticky TOC + sections. */
export default function PrivacyPage() {
  return (
    <div className="relative">
      {/* page header */}
      <div className="max-w-[900px] px-10 pb-12 pt-[72px] lg:px-20">
        <div className="mb-[22px] flex flex-wrap items-center gap-[10px] font-stmono text-[11px] tracking-[2px] text-faint">
          <span>FVA DEVELOPMENT</span>
          <span>/</span>
          <span className="text-cyan">PRIVACY POLICY</span>
          <span className="rounded-[10px] border border-[rgba(122,159,196,0.35)] bg-[rgba(122,159,196,0.08)] px-[9px] py-[3px] text-[9px] tracking-[1.6px] text-muted">
            ADAPTED FROM APP POLICY — LEGAL SIGN-OFF PENDING
          </span>
        </div>
        <h1 className="mb-5 font-nacelle text-4xl font-semibold leading-[1.04] tracking-[-1.2px] text-heading lg:text-[52px]">
          On your device, under your control.
        </h1>
        <p className="max-w-[640px] text-[17px] leading-[1.65] text-body">
          <BoldText text="This app documents evidence. That only works if the tool itself is beyond question — so the architecture is blunt: **your case data lives in an encrypted database on your phone and stays there.** Below is the complete list of what ever touches a network." />
        </p>
      </div>

      {/* the network ledger */}
      <div className="px-10 pb-14 lg:px-20">
        <div className="mb-[18px] font-stmono text-[11px] tracking-[2.4px] text-blue">
          THE COMPLETE NETWORK LEDGER
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[900px] overflow-hidden rounded-2xl border border-hairline bg-panel-800">
            <div
              className={`${LEDGER_GRID} border-b border-hairline bg-[rgba(10,20,34,0.8)] py-3 font-stmono text-[9.5px] tracking-[2px] text-faint`}
            >
              <div>WHAT</div>
              <div>WHEN</div>
              <div>WHAT IT CONTAINS</div>
              <div>CASE DATA?</div>
            </div>
            {LEDGER_ROWS.map((row) => (
              <div key={row.what} className={`${LEDGER_GRID} border-b border-row-divider py-[17px]`}>
                <div className="flex items-center gap-[9px]">
                  <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full bg-cyan" />
                  <span className="font-nacelle text-[15px] font-semibold text-heading">
                    {row.what}
                  </span>
                </div>
                <div className="text-[13.5px] text-body-2">{row.when}</div>
                <div className="font-jbmono text-[11.5px] text-muted">{row.contains}</div>
                <div className="font-stmono text-[11px] tracking-[1.5px] text-cyan">NEVER</div>
              </div>
            ))}
            {/* the gold stays-home row */}
            <div className={`${LEDGER_GRID} relative bg-gold/[0.04] py-[19px]`}>
              <div
                aria-hidden="true"
                className="absolute bottom-0 left-0 top-0 w-[3px] bg-[linear-gradient(180deg,#ffd93d,rgba(255,217,61,0.2))]"
              />
              <div className="flex items-center gap-[9px]">
                <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full bg-gold" />
                <span className="font-nacelle text-[15px] font-semibold text-[#ffe786]">
                  Everything else
                </span>
              </div>
              <div className="text-[13.5px] text-[#cdd9e6]">
                Cases, locations, media, documents, reports, the AI&apos;s reading of your requests
              </div>
              <div className="font-jbmono text-[11.5px] text-[#e7cf6a]">
                Encrypted on-device. Face ID gated.
              </div>
              <div className="font-stmono text-[11px] tracking-[1.5px] text-gold">STAYS HOME</div>
            </div>
          </div>
        </div>
      </div>

      {/* policy body: sticky TOC + sections */}
      <div className="flex flex-col gap-10 px-10 pb-[72px] pt-6 lg:flex-row lg:gap-[72px] lg:px-20">
        <nav aria-label="On this page" className="lg:w-60 lg:flex-none">
          <div className="flex flex-col gap-0.5 lg:sticky lg:top-6">
            <div className="mb-[10px] font-stmono text-[10px] tracking-[2px] text-faint">
              ON THIS PAGE
            </div>
            {SECTIONS.map((section, index) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-lg border-l-2 border-transparent px-3 py-2 font-jbmono text-xs text-muted transition-colors hover:border-blue hover:bg-blue/[0.07] hover:text-tab-label"
              >
                {String(index + 1).padStart(2, '0')} {section.title}
              </a>
            ))}
          </div>
        </nav>

        <div className="flex max-w-[760px] flex-1 flex-col gap-10">
          {SECTIONS.map((section, index) => (
            <section key={section.id} id={section.id}>
              <div className="mb-[10px] font-stmono text-[10.5px] tracking-[2.4px] text-blue">
                {String(index + 1).padStart(2, '0')}
              </div>
              <h2 className="mb-3 font-nacelle text-2xl font-semibold tracking-[-0.4px] text-heading">
                {section.title}
              </h2>
              {section.id === 'permissions' ? (
                <>
                  <p className="mb-[14px] text-[15px] leading-[1.7] text-body">
                    Each permission maps to one visible feature — nothing runs in the background:
                  </p>
                  <dl className="flex flex-col gap-[9px]">
                    {PERMISSIONS.map((permission) => (
                      <div key={permission.key} className="flex items-baseline gap-3">
                        <dt className="w-[110px] flex-none font-jbmono text-xs text-cyan">
                          {permission.key}
                        </dt>
                        <dd className="m-0 text-sm text-body-2">{permission.use}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : section.id === 'contact' ? (
                <p className="text-[15px] leading-[1.7] text-body">
                  Questions about any of this:{' '}
                  <a
                    href={`mailto:${siteConfig.contactEmail}`}
                    className="text-carolina underline transition-colors hover:text-[#cfe6f5]"
                  >
                    {siteConfig.contactEmail}
                  </a>
                </p>
              ) : (
                <p className="text-[15px] leading-[1.7] text-body">{section.body}</p>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
