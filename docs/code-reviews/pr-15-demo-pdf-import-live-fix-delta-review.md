# PR 15 — Fix Delta Review

**PR:** [#15](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/15) — `feat(demo): live PDF import in the sandbox (pdf.js → Ollama Cloud proxy)`
**Branch:** `feat/demo-pdf-import-live` → `master` · **HEAD:** `0760f87`
**Scope:** Fix delta only — re-review of the **6 commits** landed in response to the initial review (`pr-15-demo-pdf-import-live-review.md`, verdict REVISE / 5 HIGH).
**Reviewers (resumed via SendMessage, full transcript context):** typescript-reviewer · react-reviewer · security-reviewer · pr-test-analyzer · silent-failure-hunter · type-design-analyzer
**Date:** 2026-06-28

> **For the implementing instance:** This document is self-contained. You do not need to reread `pr-15-demo-pdf-import-live-review.md`.

## Verdict
**APPROVE (with comments).**

All **5 HIGH** findings are closed and verified at the source (not just per the fix comment). The single security HIGH (open proxy) is downgraded to a MEDIUM residual — the same-origin + rate-limit guards are honest best-effort, and the code documents the Ollama spend cap as the real backstop. The remaining open items are MEDIUM/LOW: three test-coverage gaps (one originally-Critical branch whose fix landed in the wrong test file, plus two new branches in the added `guards.ts`) and a couple of LOW polish notes. None block merge; one small test commit would clean them up.

## Pre-flight gates (re-verified after fixes)

| Gate | Result |
|---|---|
| `tsc --noEmit` | ✅ 0 errors |
| `pnpm test` | ✅ **61 files / 431 passed** (was 415 → +16) |
| Coverage | ✅ 98% (gate ≥80%) |

## Fix commit → original finding mapping

| Commit | Findings | Lane(s) | Verdict |
|---|---|---|---|
| `deac26b` harden /api/extract proxy | H1 timeout · H3 proxy guards · M3 body cap · M5 logging | typescript, security, silent-failure | Closed (H3 → residual) |
| `d6eed1d` result type + cancel + fallback signals | H4 union · H2 cancel · M1 notConfigured · M2 empty-paste · M4 fallbackMode · L5 blank-success | type-design, react, silent-failure | Closed |
| `0e2dfba` import a11y | H5 aria-live · L3 aria-hidden · L4 keys | react | Closed |
| `bfe29c2` pdf.js teardown | L2 leak/shadow · L1 isEvalSupported (doc) | typescript, security, silent-failure | Closed |
| `d2bb965` coverage + deferred.md | I1 timeFrameCount · I3 timePeriodType · F7/L5 (deferred #3) | pr-test, silent-failure | Closed |
| `0760f87` env docs | H3 (ALLOWED_ORIGINS / RATE_LIMIT_*) | security | doc |

## Reviewer verdicts at a glance (fix delta)

| Lane | Closed | Residual / new | Lane verdict |
|---|---|---|---|
| typescript-reviewer | H1, L2 | — | APPROVE |
| react-reviewer | H2, H5, aria-hidden, keys | 1 LOW (persistent vs mount/unmount live region) | APPROVE |
| silent-failure-hunter | F1–F7 (all 7) | — | APPROVE |
| type-design-analyzer | F1, F2, F3 (+F4/F5 accept) | — | APPROVE |
| security-reviewer | M3, L1 | **H3 → MEDIUM residual**; 1 new LOW (bucket eviction) | closed-with-residual |
| pr-test-analyzer | C1, C2, C4, I1, I2, I3, I4 | **C3 still-open** + **N1, N2 new** (Important); N3 + H2-batch nice-to-have | mostly sound |

## Closed findings — verification detail

- **H1 timeout NaN → instant abort (typescript, silent-failure F3).** `route.ts:71` `Math.max(1000, Number(process.env.OLLAMA_TIMEOUT_MS) || 30_000)`. Every env input walked: unset/`'30s'`/`''`/`'0'` → 30000; `'-5'`/`'500'` → floored to 1000; `'45000'` → 45000. NaN-abort path fully closed, no residual.
- **H2 cancel guard (react).** `importCancelled` ref reset at each run start (and `onRetry`), set `true` on `onCancel` (reached by backdrop/✕/Escape), checked before the loop body, **after each `await runPdfImport` before `applySuccess`**, and after `await runTextImport`. No `await` between the final check and the store write — no slippage. Verified by `DemoExperience.sandbox.test.tsx` (deferred-promise cancel → 0 locations).
- **H4 `ImportRunResult` discriminated union (type-design).** Success requires `patch`/`fieldCount`/`timeFrameCount`; failure requires `error`. The `res.ok && res.patch` double-guard and every `?? 0`/`?? 'failed'` default are gone; `applySuccess` takes `Extract<…,{ok:true}>`.
- **H5 aria-live (react).** `role="status" aria-live="polite"` on both the progress and result regions; dynamic stage/batch/notice/error text all inside.
- **M1/M4 + F2 fallback signals (silent-failure, type-design).** `notConfigured` is now load-bearing → `FallbackMode = 'none'|'guided'|'unavailable'|'error'` → `fallbackNotice()` renders distinct text ("not configured" vs "couldn't reach the live model"). The full `notConfigured → fallbackMode → notice → modal` chain is live; all four enum values reachable, none redundant.
- **M2 empty-paste (silent-failure F1).** `if (importLive() && !imp.text.trim())` → "Paste the request text first." before the model call; guided mode unaffected.
- **M3 body cap (security).** `content-length > 50_000` → 413 before `req.json()`. (Residual: a headerless raw client still hits only Next's 4MB default — acceptable; browsers always send `Content-Length`.)
- **M5 logging (silent-failure F4).** `console.error('[api/extract] …')` on the non-OK (with status), empty-response, and catch (`e.name`) branches; no key/URL leakage.
- **L1/L2 pdf.js (typescript, security, silent-failure F5/F6).** `loadingTask.promise` moved inside `try` (load-time rejection now reaches `finally` → no worker leak); `destroy().catch(()=>{})` can't shadow the original error; `isEvalSupported` documented (v6 defaults false, absent from v6 types).
- **L5 / deferred.md #3 (silent-failure F7).** A genuine live reply (`fallbackMode==='none'`) with zero fields/time-frames now returns `ok:false` ("No recognizable fields found…") instead of a blank location; the SAMPLE paths are correctly exempt. `deferred.md #3`'s un-defer trigger ("when a real model is wired") is this PR — legitimately resolved, not deleted.
- **Test gaps C1, C2, C4, I1, I2, I3, I4 (pr-test).** All closed with genuine, regression-catching assertions (verified each would fail under the inverse mutation).

## New findings introduced by / surfaced after the fixes

**MEDIUM — H3 residual: the proxy guards are best-effort, not a ceiling (security).** `isAllowedOrigin` returns `true` when there's **no `Origin` header** — so the exact scripted-flood case from the original H3 (`curl`/scripts send no Origin) is not blocked, by deliberate design. `isRateLimited` is in-memory per server instance (serverless fan-out → effective limit = max × warm instances) and keys on the spoofable `x-forwarded-for`. Proportionate to a public demo; the operator's action is unchanged: **set a hard Ollama spend cap** and treat the guards as friction. Downgraded HIGH → MEDIUM, not fully closed.

**MEDIUM — three test-coverage gaps:**
- **C3 still open** (originally Critical, now Important). `extract-client.ts:20-21` (200 response with missing/empty `rawText` → `{ok:false, notConfigured:false}`) is still uncovered — `extract-client.test.ts` is unchanged. The fix comment attributed C3 to `d6eed1d`, but that work is in `run-import.test.ts`, which **mocks** `requestExtraction` and never exercises the real branch. Downstream the empty `rawText` would make `parseNormalizeMap('')` throw (observable failure, not silent), so it's Important, not Critical — but the `notConfigured:false` distinction is untested. Add the 3-line `extract-client.test.ts` case.
- **N1 (new, Important).** `guards.ts` `ALLOWED_ORIGINS` allowlist branch (`allow.includes(origin)`) is untested — the deployed-production path. A regression there would 403 real partners while passing CI.
- **N2 (new, Important).** `guards.ts` rate-limit **window reset** (`now > entry.reset`) is untested — a `||`→`&&` regression would permanently ban every IP after the first window. Needs a fake-timer test.

**LOW:**
- New: `guards.ts` `buckets` Map has **no eviction** — memory growth under forged-IP flooding (academic on serverless; add periodic eviction if ever deployed as a persistent Node process). _(security)_
- New/nice-to-have: the H2 **mid-batch inter-file** pre-call check (`run-import` loop top) is uncovered; N3 malformed-`origin` catch branch uncovered. _(pr-test)_
- The two aria-live regions are mount/unmount rather than a single persistent region — reliable on VoiceOver/JAWS, occasionally missed by NVDA/Chrome. A future a11y polish, not a regression. _(react)_

## Architecture invariants — re-verified clean

- Secrets: `OLLAMA_API_KEY` still server-only; new `console.error` logs only `status`/`e.name`/static strings — no key/URL leakage.
- SSRF: still env-only destination; user input never reaches the outbound URL.
- Store-bridge / `'use client'` / SSR (`ssr:false` + dynamic `import('pdfjs-dist')`): intact.
- Type honesty: discriminated `ImportRunResult` + `FallbackMode` remove the prior representable-invalid states; tsc clean.
- Determinism: `guards.ts` uses `Date.now()` but it's an API route (not the SSR/replay-bound demo engine) — correct.

## Recommended next steps

**Ready for merge.** Optional single test commit closes the comment-tier items: add `extract-client.test.ts` C3, the `guards.ts` N1 (allowlist) and N2 (window-reset, fake timers) tests, and correct the fix comment's C3 attribution. The H3 residual is an operational note (Ollama spend cap), and the `buckets` eviction + persistent-live-region items are LOW future polish.

## Reviewer pipeline notes

- **All 5 HIGH closed; clean REVISE → APPROVE transition.** The fixes were verified at the source by the resumed reviewers, each referencing its own original finding verbatim.
- **Honest residual on H3:** the security lane declined to mark it fully closed and downgraded to MEDIUM rather than rubber-stamp the guards — the no-`Origin` bypass means the headline abuse vector is mitigated by the rate limit + spend cap, not eliminated.
- **A fix-comment attribution caught:** C3 was reported fixed via `d6eed1d`, but the test lane verified that commit's work mocks the module and the real `extract-client` branch is still uncovered — a good example of the test lane catching a false-coverage claim no other lane would see.
- **New code begets new gaps:** `guards.ts` (the H3 fix) introduced two Important untested branches (N1, N2) and a LOW eviction issue — the fixes are correct but their own coverage trails them by one commit.
