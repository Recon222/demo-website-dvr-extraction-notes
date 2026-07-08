'use client'

import { useActionState } from 'react'
import Link from 'next/link'

import { submitBetaSignup, type BetaResult } from '@/lib/beta/submit-signup'

/**
 * The working beta intake: email + required consent + hidden honeypot, submitted
 * through the server action via useActionState. Used on /beta (both phases) and
 * inside the home BetaCta panel. `action` is injectable for tests only.
 */
export function BetaForm({
  action = submitBetaSignup,
}: {
  action?: (prev: BetaResult | null, form: FormData) => Promise<BetaResult>
}) {
  const [result, formAction, pending] = useActionState(action, null)

  if (result?.ok) {
    return (
      <div
        aria-live="polite"
        className="flex items-center gap-3 rounded-[10px] border border-cyan/35 bg-cyan/[0.08] px-4 py-[13px] text-sm text-[#aecbc8]"
      >
        <span
          aria-hidden="true"
          className="h-[7px] w-[7px] flex-none rounded-full bg-cyan shadow-[0_0_9px_rgba(78,205,196,0.9)]"
        />
        You&apos;re on the list — the invite ships the moment a build clears review.
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex gap-[10px]">
        <input
          type="email"
          name="email"
          required
          disabled={pending}
          aria-label="Email"
          placeholder="name@agency.gov"
          className="min-w-0 flex-1 rounded-[10px] border border-input bg-[rgba(6,12,20,0.8)] px-4 py-[13px] font-jbmono text-[13px] text-heading placeholder:text-faint focus:border-cyan focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pending}
          className="whitespace-nowrap rounded-[10px] bg-[linear-gradient(180deg,#ffe06a,#f5c62e)] px-5 py-[13px] text-sm font-bold text-[#241d00] shadow-[0_1px_0_rgba(255,255,255,0.35)_inset] transition-colors hover:bg-[linear-gradient(180deg,#ffe786,#ffd93d)] disabled:opacity-60"
        >
          {pending ? 'Sending…' : 'Request invite'}
        </button>
      </div>

      {/* Honeypot — bots fill it, humans never see it; kept out of the a11y tree. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
        className="absolute -left-[9999px] h-px w-px opacity-0"
      />

      <label className="flex items-start gap-[9px] text-xs leading-normal text-muted">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-[1px] h-[15px] w-[15px] flex-none rounded border-input bg-[rgba(6,12,20,0.8)] text-gold focus:ring-0"
        />
        <span>
          Email me about the beta and nothing else.{' '}
          <Link href="/privacy" className="text-carolina underline transition-colors hover:text-[#cfe6f5]">
            Privacy
          </Link>
        </span>
      </label>

      {result && !result.ok ? (
        <p aria-live="polite" className="text-xs text-[#e7a1a1]">
          {result.error === 'invalid'
            ? 'Enter a valid email and tick the consent box.'
            : 'Something went wrong on our side — try again.'}
        </p>
      ) : null}
    </form>
  )
}
