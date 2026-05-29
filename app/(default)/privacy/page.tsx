import type { Metadata } from 'next'

import { siteConfig } from '@/lib/site-config'

export const metadata: Metadata = {
  title: `Privacy Policy — ${siteConfig.name}`,
  description: `How ${siteConfig.name} handles your data: on-device by default, with a clear account of the little that ever leaves your phone.`,
}

// Adapted from the app's privacy policy (FVA Development). The contact address is a
// placeholder pending confirmation — the app policy lists fvadd.dev@gmail.com while
// the working site contact is kcfva.dev@gmail.com (doc 07 Q2).
const COMPANY = 'FVA Development'
const CONTACT_EMAIL = 'kcfva.dev@gmail.com' // TODO(doc 07 Q2): confirm canonical privacy contact
const EFFECTIVE_DATE = 'April 1, 2026'

export default function PrivacyPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-20">
      <header className="mb-10">
        <h1 className="mb-2 font-nacelle text-4xl font-semibold text-gray-100 md:text-5xl">
          Privacy Policy
        </h1>
        <p className="text-sm text-indigo-200/50">
          {siteConfig.name} · {COMPANY} · Effective {EFFECTIVE_DATE}
        </p>
      </header>

      <div className="space-y-10 text-indigo-200/75">
        <section>
          <h2 className="mb-3 font-nacelle text-2xl font-semibold text-gray-100">Overview</h2>
          <p>
            {siteConfig.name} is a documentation tool for CCTV/DVR evidence recovery, built for law
            enforcement and forensic professionals. Privacy is fundamental to its design: all case
            data stays on your device unless you explicitly choose to export or share it.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-nacelle text-2xl font-semibold text-gray-100">
            Data that stays on your device
          </h2>
          <p className="mb-3">
            The following is created and stored only on your device. It is never transmitted to{' '}
            {COMPANY} or any third party:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Case data — occurrence numbers, addresses, business names, timestamps, DVR details, and all form entries</li>
            <li>Photos and videos captured through the app</li>
            <li>Audio recordings captured through the app</li>
            <li>GPS coordinates used to document sites and individual camera positions</li>
            <li>Generated PDF documents (case notes and time-offset calibration reports)</li>
            <li>The on-device SQLite database holding all records and metadata</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-nacelle text-2xl font-semibold text-gray-100">
            Device features the app uses
          </h2>
          <ul className="list-disc space-y-1 pl-6">
            <li><strong className="text-gray-200">Camera</strong> — capture DVR timestamps and evidence photos/videos</li>
            <li><strong className="text-gray-200">Microphone</strong> — record audio notes</li>
            <li><strong className="text-gray-200">Location (GPS)</strong> — document site and camera positions</li>
            <li><strong className="text-gray-200">Face ID / Touch ID</strong> — protect app access and exports</li>
          </ul>
          <p className="mt-3">
            Biometric data is processed entirely by your device&apos;s operating system (e.g. the iOS
            Secure Enclave). {siteConfig.name} never receives, stores, or transmits biometric data.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-nacelle text-2xl font-semibold text-gray-100">On-device AI</h2>
          <p>
            The app uses Apple Intelligence (Apple Foundation Models) to extract structured details
            from imported request documents. This runs entirely on your device. No document content
            is sent to any server, cloud service, or third party. The feature requires a compatible
            device and a recent iOS version.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-nacelle text-2xl font-semibold text-gray-100">Network services</h2>
          <p className="mb-3">
            The app contacts a small number of external services for specific functions. No case
            data, media, or personal information is sent to them:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong className="text-gray-200">Atomic-clock time servers</strong> (e.g. NRC, NIST,
              PTB, METAS, Cloudflare) — timestamp packets only, for forensic time calibration. No
              user data.
            </li>
            <li>
              <strong className="text-gray-200">Time API fallback</strong> — used only when the
              primary time protocol is unavailable; involves your device&apos;s IP address inherent
              to any network request. No user data.
            </li>
            <li>
              <strong className="text-gray-200">Mapbox</strong> — address autocomplete and geocoding;
              receives the search queries and coordinates you enter, subject to Mapbox&apos;s own
              privacy policy.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-nacelle text-2xl font-semibold text-gray-100">Crash reporting</h2>
          <p>
            We collect anonymized crash reports to improve stability — device model and OS version,
            error stack traces, and app version. Crash reports do not contain your case data, media,
            GPS coordinates, or any content you create in the app.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-nacelle text-2xl font-semibold text-gray-100">
            Beta program and this website
          </h2>
          <p>
            If you join the beta on this website, we collect the email address you submit. It is used
            only to send your TestFlight invitation and occasional beta updates, is stored with our
            hosting/database provider, and is never sold or shared. Ask us at any time and we will
            remove it.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-nacelle text-2xl font-semibold text-gray-100">
            Storage and security
          </h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>Case data is stored in an encrypted database on your device.</li>
            <li>Exported ZIP archives can be optionally protected with a password held in your device&apos;s secure keychain.</li>
            <li>The app supports biometric authentication with device-passcode fallback.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-nacelle text-2xl font-semibold text-gray-100">Data sharing</h2>
          <p>
            {siteConfig.name} does not sell, rent, or share your data. The only data that leaves your
            device is described above, plus any PDF or ZIP you choose to export and share through your
            device&apos;s share sheet — to recipients you select.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-nacelle text-2xl font-semibold text-gray-100">
            Retention and deletion
          </h2>
          <p>
            All case data is stored on your device and under your control. You can delete individual
            cases, locations, or media at any time in the app. Uninstalling the app removes all
            locally stored data.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-nacelle text-2xl font-semibold text-gray-100">
            Children&apos;s privacy
          </h2>
          <p>
            {siteConfig.name} is a professional tool and is not directed at children under 13. We do
            not knowingly collect information from children.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-nacelle text-2xl font-semibold text-gray-100">
            Changes to this policy
          </h2>
          <p>
            We may update this policy from time to time. Changes are reflected by updating the
            effective date above.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-nacelle text-2xl font-semibold text-gray-100">Contact</h2>
          <p>
            Questions about this policy or your data? Contact {COMPANY} at{' '}
            <a
              className="text-indigo-300 underline transition hover:text-indigo-200"
              href={`mailto:${CONTACT_EMAIL}`}
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>
    </section>
  )
}
