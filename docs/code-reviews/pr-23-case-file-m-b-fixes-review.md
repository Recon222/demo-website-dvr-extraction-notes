# PR 23 — Case-File M-B — Fix-Delta Review (Round 1 fixes)

**PR:** #23 — Milestone B follow-ups
**Fix commit (single SHA):** `dc04a83` (test-only) — reviewed via `git show dc04a83` (not a range, not the working tree)
**Prior review:** `docs/code-reviews/pr-23-case-file-m-b-review.md`
**Date:** 2026-07-07

> Self-contained — does not require re-reading the initial review.

## Verdict
**clean — milestone approved. M-B is closed.** All 3 findings (1 HIGH, 1 MEDIUM, 1 LOW) verified closed; no new findings.

## Fix commit → finding
| Finding | Type | Status | Verification |
|---|---|---|---|
| H1 — chrome-scope guard passes on dead import | fix | **CLOSED** | JSX-anchored both ways; +UtilityStrip; mutation-verified |
| M1 — header wordmark untested | fix | **CLOSED** | wordmark + subline asserted |
| L1 — utility-strip untested | fix | **CLOSED** | parity test added |

## Verification detail

- **H1 CLOSED (correctly widened).** Positive assertions are now `toMatch(/<Header\b/)`, `/<(FeatureNav|ManifestTabStrip)\b/`, `/<Footer\b/`, `/<UtilityStrip\b/` — matching the JSX render tag, not the `import Header …` line. Negatives are anchored the same way, so a capitalized word in a root-layout comment can't false-fail. I verified against the source: `(default)/layout.tsx` contains `<Header`/`<UtilityStrip` (positives pass) and root `app/layout.tsx` contains neither (negatives pass) — and because `import Header …` has no `<`, dropping the `<Header />` render while keeping the import now makes the positive go RED. The exact silent regression is closed. The author also pinned `<UtilityStrip>` both ways (it joined the chrome after the original guard was written and had the same latent gap) — beyond the reported finding.
- **M1 CLOSED.** `header.test.tsx` now asserts `getByText(siteConfig.name)` and `getByText('CCTV RECOVERY · DOCUMENTED')` — both wordmark strings pinned.
- **L1 CLOSED.** New `components/ui/__tests__/utility-strip.test.tsx` renders `<UtilityStrip />` and asserts both the identity line and the recruiting status.

## Gates
Test-only change; each edit self-evidently correct on inspection. Author reports 696/696 green, tsc clean at `dc04a83`.

## New findings introduced by the fix
None.
