# PR 23 — Case-File Redesign, Milestone F (Slices 11+12, beta signup) — Aggregate Code Review

**PR:** [#23](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/23) — Case-File redesign, Milestone F (beta email capture)
**Commits reviewed (pushed):** `54aac01` (Slice 11 — zod schema + stubbed `'use server'` action) · `08eda21` (Slice 12 — two-phase `/beta` page + working `BetaForm`, home `beta-cta` rewire).
**Source of truth:** pushed blobs via `git show 08eda21:<path>`.
**Reviewers:** `typescript-reviewer` (security-focused), `pr-test-analyzer` (+ commit/test-consistency check) + orchestrator (trust-boundary security pass, copy fidelity, phase-swap reachability).
**Date:** 2026-07-07

---

## Verdict

**REVISE.**

This is the PR's **first real trust boundary, and it's well-built** — both the security lane and the orchestrator pass found **zero vulnerabilities**: input is validated server-side with zod (`safeParse`, fail-closed), the email is normalized before use/logging, consent is enforced at *both* the client and server layers, the honeypot is textbook, and no raw input, secret, or internal error leaks. The single **HIGH is a test-coverage gap, not a bug**: nothing exercises the real form→action wiring end-to-end, so a future field-name drift would silently break every signup with a green suite. One integration test closes it. The security **process check is clean** — unlike M-E, the M-F test files are committed and consistent at the SHA.

---

## Reviewer verdicts at a glance

| Lane | CRITICAL | HIGH | MEDIUM | LOW | Verdict |
|---|---|---|---|---|---|
| typescript-reviewer (security) | 0 | 0 | 0 | 2 | APPROVE |
| pr-test-analyzer | 0 | 1 | 1 | 2 | REVISE |
| orchestrator (trust boundary / fidelity) | 0 | 0 | 0 | 0 | — |
| **Total (deduped)** | **0** | **1** | **1** | **4** | **REVISE** |

---

## Pre-flight (verified at `08eda21`)

| Gate | Result |
|---|---|
| **Beta lane** | `lib/beta` + `components/beta` + `beta-cta` + `/beta` → **22/22 pass**, **0 tsc errors** in beta files, `/beta` build **111 kB** (matches claim). |
| Full-repo `tsc` / `vitest` | **NOT green at this SHA** — 8 tsc errors + 3 vitest failures, **all** in `components/__tests__/feature-page.test.tsx` (the **M-E** stale test, already flagged; fixed later at `fe920d1`). The claimed "722/722" doesn't hold at `08eda21`; M-F inherits the M-E red state because it stacks on top of it. **Not an M-F defect.** |
| Process check | `git diff 08eda21 HEAD` for the beta files is **empty** — no M-E-style uncommitted-test problem here. ✓ |

---

## Findings (deduped, ranked)

### CRITICAL / HIGH

**H1 — the real form→action wiring is never exercised end-to-end; a field-name drift fails closed silently on the money path.** *(pr-test-analyzer; orchestrator-CONFIRMED)*
Every `beta-form.test.tsx` interactive test does `render(<BetaForm action={ok|invalid|server} />)` — an **injected mock** that ignores the typed input. `submit-signup.test.ts` builds `FormData` with hardcoded keys. `beta-page`/`beta-cta` tests render the *real* pairing but assert only static structure. So **no test fills the real inputs and submits through the real action.** The form's `name="email"/"website"/"consent"` (`beta-form.tsx:40,58,68`) and the action's `form.get('email'/'consent'/'website')` (`submit-signup.ts:22-24`) are **string-coupled, not type-linked** — TypeScript can't catch a drift. They match today (verified), but a rename of either side would make every real submission return `{ok:false,error:'invalid'}` — silently losing every beta signup — while all 722 tests stay green, because each side is tested against its own hardcoded truth. This is the load-bearing path of the entire milestone.
*Fix:* one test — `render(<BetaForm />)` (no `action` override), spy `console.info`, `userEvent` fill + submit, assert the real success message renders. The `userEvent` helper already exists in the file; it just needs to run once against the un-mocked action.

### MEDIUM

**M1 — the `pending` state (disabled button / "Sending…") is asserted nowhere.** *(pr-test-analyzer)* All three mock actions resolve immediately, so `pending` (`beta-form.tsx:48,51`) is never observed — yet the commit claims "pending/success/invalid/server" are covered; pending is the one with zero assertions. *Fix:* a delayed mock (`new Promise(r => setTimeout(() => r({ok:true}), 20))`), click submit, assert the button is disabled / shows "Sending…" before awaiting.

### LOW

- **L1** — success/error `aria-live` regions are asserted by text content, not by the `aria-live` attribute; a refactor dropping it goes undetected. *(pr-test)*
- **L2** — the success branch doesn't assert the form controls are gone (guards a future refactor only; current code is a hard early-return). *(pr-test)*
- **L3** — `schema.ts:12` `website: z.literal('').optional()` — the `.optional()` is dead at the one production call site (`submit-signup.ts` always supplies `''`); harmless, documents schema-level intent. *(typescript)*
- **L4** — only the submit button is `disabled={pending}`; the email input isn't, so Enter during an in-flight submit could double-fire. Low blast radius (stub is a no-op log; the planned Firestore write is idempotent). *(typescript)*

---

## Verified clean — security (both lanes, concrete attacks tried)

- **Validation, fail-closed:** `betaSignupSchema.safeParse(...)` → invalid input returns `{ok:false,error:'invalid'}`; never throws; never leaks zod error detail to the client.
- **Email normalized before use/log:** `z.string().trim().toLowerCase().email()` runs trim/lowercase before the format check; only `parsed.data.email` is logged — no raw/unsanitized input reaches the log, no log-injection (newlines fail `.email()`).
- **Consent enforced server-side:** `consent` omitted / `"1"` / `"yes"` → coerces to `false` → fails `z.literal(true)` → rejected. Client `required` is not the only gate.
- **Honeypot correct:** `website` filled → fails `z.literal('')` → rejected; the input is `-left-[9999px]`, `h-px w-px opacity-0`, `tabIndex={-1}`, `aria-hidden`, `autoComplete="off"` — invisible to humans and AT, out of the tab order, immune to password-manager autofill.
- **Malformed FormData fails closed:** a `File`-typed `email` fails `z.string()`; oversized bodies bounded by Next.js's default 1 MB server-action limit.
- **Client/server boundary intact:** `beta-form.tsx` is `'use client'`, imports `type BetaResult` (type-only) + the `'use server'` action reference — no server code in the client bundle (build size confirms); `testflightUrl` is a public string, `.env.example` keeps `FIREBASE_*` reserved.
- **`useActionState` wiring:** button `disabled={pending}`, success replaces the form, `aria-live="polite"` on both messages.

## Verified clean — design & product

- **Copy fidelity vs canvas 2a — verbatim:** "Be first in the field", "Get on the invite list", "INTAKE FORM — 60 SECONDS", "SEATS ARE CAPPED BY APPLE AT 10,000", "the invite ships the moment".
- **Deliberate deviations — both correct:** the consent checkbox (the schema *requires* consent; a form without it always fails) and the generic Phase-B label "BUILD APPROVED FOR EXTERNAL TESTING" (the canvas's "BUILD 1.0 (26)" exists but would ship stale — verified: canvas has "BUILD 1.0", author correctly dropped it).
- **Phase swap:** email capture reachable in *both* phases; a single `#invite-form` per phase (no duplicate id); the same corrected `isolate`+`-z-10` glow pattern from the M-D fix.
- **beta-cta M4 inversion:** genuine — now asserts a real textbox/button/checkbox exist (not a deleted guard).

## Justified deferral / optional hardening (not blocking)

- **Rate limiting / anti-automation — justified deferral.** The honeypot only stops naive bots; a targeted bot (valid email + consent + empty honeypot) passes. This is **documented** (arch doc §9, `Q-BETA-2`) and out of scope for the log-only stub — the `BetaResult` type already reserves the `rate_limited` variant. **Must land before the Firestore persist** (so the "one-line swap" is really swap + rate-limit). Flagging so it isn't forgotten, not as an M-F blocker.
- **`email` has no `.max()`** — bounded by the 1 MB body limit today and the persist is stubbed; `.max(254)` (RFC) is worthwhile defense-in-depth before the persist. Optional.

---

## Recommended fix (single commit)

1. **H1 (blocker)** — add the one end-to-end `BetaForm` test (real action, fill + submit, assert success).
2. **M1** — assert the `pending` state via a delayed mock action.
3. **L1–L4** — optional, fold in if convenient.

Then push and send `type: fixes-done` with the single SHA.

---

## Pipeline notes

- **The security milestone is the strongest of the PR on the code axis** — two independent lanes attempted concrete bypasses (consent, honeypot, malformed/oversized FormData, boundary leak) and found none. The only real gap is *test coverage of the wiring*, not the wiring itself.
- **Cross-milestone:** at `08eda21` the repo is red purely from the M-E `feature-page.test.tsx` (fixed later at `fe920d1`); the beta lane is independently green. Once the M-E fix precedes M-F in the final history, the SHA goes green.
- **Process win:** M-F's tests are committed and consistent at the SHA (verified via `git diff 08eda21 HEAD`) — the M-E dirty-tree mistake was not repeated here.
