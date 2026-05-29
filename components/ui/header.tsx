import Link from 'next/link'

import Logo from './logo'
import { siteConfig } from '@/lib/site-config'
import { cn } from '@/lib/cn'

export default function Header() {
  return (
    <header className="z-30 mt-2 w-full md:mt-5">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative flex h-14 items-center justify-between gap-3 rounded-2xl bg-gray-900/90 px-3 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-transparent before:[background:linear-gradient(to_right,var(--color-gray-800),var(--color-gray-700),var(--color-gray-800))_border-box] before:[mask-composite:exclude_!important] before:[mask:linear-gradient(white_0_0)_padding-box,_linear-gradient(white_0_0)] after:absolute after:inset-0 after:-z-10 after:backdrop-blur-xs">
          {/* Site branding */}
          <div className="flex flex-1 items-center">
            <Logo />
          </div>

          {/* Primary navigation (driven by siteConfig) */}
          <nav className="flex flex-1 items-center justify-end">
            <ul className="flex items-center gap-2 sm:gap-3">
              {siteConfig.nav.map((item) => {
                const isCta = item.href === '/beta'
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'btn-sm px-3 py-[5px] text-sm',
                        isCta
                          ? 'bg-linear-to-t from-indigo-600 to-indigo-500 text-white shadow-[inset_0px_1px_0px_0px_--theme(--color-white/.16)] hover:bg-[length:100%_150%]'
                          : 'text-gray-300 transition-colors hover:text-white',
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  )
}
