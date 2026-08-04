// Preview for BetaForm — the working beta intake (email + consent + hidden
// honeypot). Rendered WITHOUT an action so it shows its default resting state:
// useActionState(submitBetaSignup, null) yields result=null / pending=false, so
// the fields, consent label, and gold "Request invite" button render statically.
// The server action is only invoked on submit, which never happens in capture.
import { BetaForm } from 'open-pro-next'

// Constrain to the panel width the form lives in on /beta so the input + gold
// button share a row exactly as production, instead of stretching the cell.
export function Intake() {
  return (
    <div style={{ width: 420, maxWidth: '100%' }}>
      <BetaForm />
    </div>
  )
}
