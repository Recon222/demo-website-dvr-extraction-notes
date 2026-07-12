# PR 23 — Case-File M-F — Fix-Delta Review (Round 1 fixes)

**Fix commit (single SHA):** `d16f02b` — reviewed via `git show d16f02b`.
**Prior review:** `docs/code-reviews/pr-23-case-file-m-f-review.md`
**Date:** 2026-07-07

## Verdict
**clean — milestone approved. M-F is closed.** The HIGH, the MEDIUM, and all LOWs are closed; the rate-limit deferral is now contractually recorded.

## Fix → finding
- **H1 (real form→action wiring untested) CLOSED — mutation-proven.** New test at `beta-form.test.tsx:66` — `render(<BetaForm />)` with **no `action` override**, `userEvent` fill + submit, `expect(info).toHaveBeenCalledWith('[beta] signup', 'a@agency.gov')` (the real action logged the normalised email → proof the live DOM field names satisfy the live schema). Mutation check confirmed: `name="email"` → `name="emailx"` fails **only** this test while the mock-action tests stay green — the exact silent-breakage scenario, now caught. Bonus: a new assertion pins that the honeypot does **not** surface as a second textbox.
- **M1 (pending state untested) CLOSED.** A manually-released promise pins the in-flight state — the submit button is `disabled` and shows "Sending…", and (LOW folded in) the email input is now disabled too.
- **LOWs CLOSED:** `aria-live` asserted by attribute; the success state asserts the controls are removed; the dead `.optional()` is dropped from the honeypot literal (with a comment on why it can't be `undefined`).
- **Rate limiting / `email.max(254)` — deferral recorded (not in this PR, by design).** The action's swap TODO now states non-negotiably that `Q-BETA-2` rate limiting lands **in** the Firestore-swap PR (`rate_limited` variant reserved), with `.max(254)` alongside it — one trust-boundary change-set, reviewed together. Correct scoping.

## Gates
Suite green + tsc clean at `d16f02b`, run against a verified-clean tracked tree (the M-E process fix now in standing practice). Beta files were consistent throughout (the narrow-add lesson held here).

## New findings
None.
