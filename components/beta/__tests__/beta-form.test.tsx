import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BetaForm } from '@/components/beta/beta-form'
import type { BetaResult } from '@/lib/beta/submit-signup'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const ok = async (): Promise<BetaResult> => ({ ok: true })
const invalid = async (): Promise<BetaResult> => ({ ok: false, error: 'invalid' })
const server = async (): Promise<BetaResult> => ({ ok: false, error: 'server' })

async function fillAndSubmit() {
  const user = userEvent.setup()
  await user.type(screen.getByRole('textbox', { name: /email/i }), 'a@agency.gov')
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: 'Request invite' }))
  return user
}

describe('BetaForm', () => {
  it('renders the email field, consent checkbox (required), and gold submit', () => {
    render(<BetaForm action={ok} />)
    expect(screen.getByRole('textbox', { name: /email/i })).toHaveAttribute(
      'placeholder',
      'name@agency.gov',
    )
    expect(screen.getByRole('checkbox')).toBeRequired()
    expect(screen.getByRole('button', { name: 'Request invite' })).toBeInTheDocument()
  })

  it('keeps the honeypot out of the accessibility tree', () => {
    const { container } = render(<BetaForm action={ok} />)
    const honeypot = container.querySelector('input[name="website"]')
    expect(honeypot).not.toBeNull()
    expect(honeypot).toHaveAttribute('aria-hidden', 'true')
    expect(honeypot).toHaveAttribute('tabindex', '-1')
    // exactly one real textbox (email) — the honeypot must not surface as one
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
  })

  it('shows the success state after a successful submit', async () => {
    render(<BetaForm action={ok} />)
    await fillAndSubmit()
    expect(await screen.findByText(/You're on the list/)).toBeInTheDocument()
  })

  it('shows the validation message on {ok:false, error:"invalid"}', async () => {
    render(<BetaForm action={invalid} />)
    await fillAndSubmit()
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
  })

  it('shows the retry message on {ok:false, error:"server"}', async () => {
    render(<BetaForm action={server} />)
    await fillAndSubmit()
    expect(await screen.findByText(/try again/i)).toBeInTheDocument()
  })

  it('END-TO-END: the real action receives the form fields by name (no mock)', async () => {
    // The money path: field names (name="email"/"consent"/"website") and the
    // action's form.get keys are string-coupled — every other test stubs the
    // action, so ONLY this test would catch a rename silently breaking signups.
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    render(<BetaForm />)
    await fillAndSubmit()

    const success = await screen.findByText(/You're on the list/)
    expect(success).toBeInTheDocument()
    // The real action logged the normalised email — proof the wiring carried it.
    expect(info).toHaveBeenCalledWith('[beta] signup', 'a@agency.gov')
    // Success state replaces the controls and announces politely.
    expect(success.closest('[aria-live="polite"]')).not.toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('disables the controls and shows "Sending…" while the action is in flight', async () => {
    let release!: (value: BetaResult) => void
    const slow = () => new Promise<BetaResult>((resolve) => (release = resolve))

    render(<BetaForm action={slow} />)
    await fillAndSubmit()

    expect(await screen.findByRole('button', { name: 'Sending…' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: /email/i })).toBeDisabled()

    release({ ok: true })
    expect(await screen.findByText(/You're on the list/)).toBeInTheDocument()
  })
})
