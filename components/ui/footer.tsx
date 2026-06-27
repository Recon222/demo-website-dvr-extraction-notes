import Image from 'next/image'
import Link from 'next/link'

import Logo from './logo'
import FooterIllustration from '@/public/images/footer-illustration.svg'
import { siteConfig } from '@/lib/site-config'

export default function Footer() {
  return (
    <footer>
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* Footer illustration */}
        <div
          className="pointer-events-none absolute bottom-0 left-1/2 -z-10 -translate-x-1/2"
          aria-hidden="true"
        >
          <Image className="max-w-none" src={FooterIllustration} width={1076} height={378} alt="" />
        </div>

        <div className="flex flex-col items-center gap-6 border-t border-gray-800/60 py-8 text-center md:flex-row md:justify-between md:py-12 md:text-left">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-indigo-200/50">© {siteConfig.name}</p>
          </div>
          <nav>
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
              <li>
                <Link className="text-indigo-200/65 transition hover:text-indigo-500" href="/features">
                  Features
                </Link>
              </li>
              <li>
                <Link className="text-indigo-200/65 transition hover:text-indigo-500" href="/beta">
                  Join the beta
                </Link>
              </li>
              <li>
                <Link className="text-indigo-200/65 transition hover:text-indigo-500" href="/privacy">
                  Privacy
                </Link>
              </li>
              {siteConfig.contactEmail ? (
                <li>
                  <a
                    className="text-indigo-200/65 transition hover:text-indigo-500"
                    href={`mailto:${siteConfig.contactEmail}`}
                  >
                    Contact
                  </a>
                </li>
              ) : null}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}
