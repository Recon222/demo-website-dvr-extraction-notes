// Stands in for `next/link` when the marketing components are bundled outside
// Next (wired via the `paths` map in .design-sync/tsconfig.sync.json).
//
// next/link's whole job in this repo is client-side navigation — nine components
// import it purely to render an anchor. The design runtime has no Next router,
// so an <a> IS the honest render: same DOM, same styling hooks, same a11y tree.
// This is a transport shim, not a reimplementation — no component's markup or
// classes are restated here.
//
// The Next-only props are destructured off deliberately: React would warn and
// emit them as literal attributes (prefetch="true") on the <a> otherwise.

import * as React from 'react'

type NextOnlyProps = {
  prefetch?: boolean | null
  replace?: boolean
  scroll?: boolean
  shallow?: boolean
  passHref?: boolean
  legacyBehavior?: boolean
  locale?: string | false
}

export type LinkProps = Omit<React.ComponentPropsWithoutRef<'a'>, 'href'> &
  NextOnlyProps & {
    href: string | { pathname?: string; query?: Record<string, string> }
  }

export default function Link({
  href,
  prefetch: _prefetch,
  replace: _replace,
  scroll: _scroll,
  shallow: _shallow,
  passHref: _passHref,
  legacyBehavior: _legacyBehavior,
  locale: _locale,
  children,
  ...rest
}: LinkProps) {
  // next/link accepts a UrlObject as well as a string. This repo only ever passes
  // strings, but resolving both keeps the shim honest against the real API.
  let resolved: string
  if (typeof href === 'string') {
    resolved = href
  } else {
    const query = href?.query ? `?${new URLSearchParams(href.query)}` : ''
    resolved = `${href?.pathname ?? ''}${query}` || '#'
  }

  return (
    <a href={resolved} {...rest}>
      {children}
    </a>
  )
}
