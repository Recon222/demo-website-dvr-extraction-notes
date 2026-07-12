# PR 15 — Aggregate Code Review

**PR:** [#15](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/15) — `feat(demo): live PDF import in the sandbox (pdf.js → Ollama Cloud proxy)`
**Branch:** `feat/demo-pdf-import-live` → `master` · **22 files, +1779 / −68**
**Reviewers (fresh fan-out):** typescript-reviewer · react-reviewer · security-reviewer · pr-test-analyzer · silent-failure-hunter · type-design-analyzer
**Date:** 2026-06-28

## Verdict
**REVISE.**

No CRITICAL/data-loss/RCE issues — the security fundamentals are sound (server-only key, no SSRF, bounded prompt-injection, no secret leakage). But there are **five HIGH findings** across four lanes that should be addressed before merge: a silent env-misconfig that breaks the entire live path, an async-cancel store-corruption bug, an unauthenticated paid-LLM proxy, an impossible-state result type, and a missing a11y live region. Most have one-line or small fixes; the code is otherwise well-structured and the keyless SAMPLE fallback is a genuinely good design.

## Pre-flight gates

| Gate | Result |
|---|---|
| `tsc --noEmit` | ✅ 0 errors |
| `pnpm test` | ✅ **61 files / 415 passed** (exit 0) |
| New dependency | `pdfjs-dist ^6.1.200` (browser PDF text extraction) |

*(No flaky baseline applies — this repo's vitest suite is deterministic.)*

## Reviewer lanes

Diff-driven triage. Production TS + a security-sensitive API route + heavy async → TS, React, security, tests, silent-failure, type-design. (comment-analyzer / code-simplifier intentionally skipped for this feature PR.) Docs under `docs/planning/demo-pdf-import/**` were not code-reviewed.

## Reviewer verdicts at a glance

| Lane | C | H | M | L | Verdict |
|---|---|---|---|---|---|
| typescript-reviewer | 0 | 1 | 0 | 1 | BLOCK (its lane) |
| react-reviewer | 0 | 2 | 1 | 2 | BLOCK (its lane) |
| security-reviewer | 0 | 1 | 1 | 1 | REVISE |
| type-design-analyzer | 0 | 1 | 1 | 2 | REVISE |
| silent-failure-hunter | 0 | 0 | 4 | 3 | REVISE |
| pr-test-analyzer | 0 | 0 | 6 | 4 | REVISE (incomplete coverage) |

**Aggregate decision: REVISE** (0 CRITICAL · 5 HIGH). Two lanes self-rated BLOCK; the strict aggregate rule lands on REVISE since no finding is CRITICAL.

## Findings (deduped, ranked by severity)

### CRITICAL
None.

### HIGH

**H1 — `OLLAMA_TIMEOUT_MS` non-numeric → NaN → every live request silently self-aborts.** _(3-lane convergence: typescript HIGH · silent-failure F3 · pr-test O1)_
`route.ts:48` `Number(process.env.OLLAMA_TIMEOUT_MS || '30000')`. The `||` gates on truthiness, not numeric validity: a plausible `OLLAMA_TIMEOUT_MS=30s` (or `off`, or a typo) → `Number('30s') = NaN` → `setTimeout(abort, NaN)` fires in ~3ms → `controller.abort()` runs before `fetch` can resolve → the `catch` returns generic 502 → the client treats it as a non-503 failure and silently falls back to SAMPLE. Every live request is dead and the operator gets **no signal**. Confirmed: the tests never set the env var, so the abort fires after the synchronously-resolved mock and they pass green over the bug.
→ **Fix:** `const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS) || 30000` (NaN is falsy → default), optionally `Math.max(1000, …)`; log + 500 on an invalid value rather than silently aborting.

**H2 — No cancellation guard: the import pipeline mutates the store after the user cancels.** _(react HIGH)_
`DemoExperience.tsx:356-399` (`processPdfFiles` / `runPasteImport`). `onCancel` calls `closeModal()` but the running async loop keeps going; after each `await runPdfImport(...)` it calls `addLocation` / `applyImport`. Scenario: user picks 3 PDFs, taps Cancel while PDF 1 is processing, the loop finishes in the background and creates 1–3 unexpected locations the user never confirmed.
→ **Fix:** a `useRef` cancelled flag (reset at run start, set in `onCancel`, checked before each `applyImportRun`).

**H3 — Unauthenticated, rate-unlimited LLM proxy (cost DoS).** _(security HIGH)_
`app/api/extract/route.ts` — no auth token, no rate limit, no origin/CORS check, no `middleware.ts`. Anyone who finds `/api/extract` on a public deployment can script 8000-char POSTs in parallel and drain the operator's paid Ollama Cloud budget, or use it as a free LLM gateway. HIGH (not CRITICAL) because the demo runs keyless by default — blast radius depends on a live key being deployed publicly.
→ **Fix (tiered):** shared-secret `Authorization` check (one line) · per-IP token bucket via middleware · `Origin`/`Referer` allowlist · a hard spend cap in the Ollama account as a backstop.

**H4 — `ImportRunResult` permits impossible states; forces double-guards.** _(type-design HIGH)_
`run-import.ts:18-30` — `ok: boolean` with `patch?`/`error?`/`fieldCount?` all optional regardless of `ok`. `{ok:true, patch:undefined}` and `{ok:false, patch:present}` are representable. Callers compensate: `DemoExperience.tsx:317` `if (res.ok && res.patch)`, plus `res.fieldCount ?? 0` everywhere. The implementation already constructs exactly two shapes (lines 73 / 76-82).
→ **Fix:** make it a discriminated union (`{ok:true; patch; fieldCount; timeFrameCount; …} | {ok:false; error; …}`) — zero runtime cost, removes every double-guard and `?? 0`.

**H5 — No `aria-live` region for the async progress/result.** _(react HIGH)_
`ImportModal.tsx:103-123` — the stage list and "Importing 2 of 3…" counter update reactively with no `role="status"`/`aria-live="polite"`, and the success/error result that replaces them isn't announced. Screen-reader users get no feedback that the import started, progressed, or finished.
→ **Fix:** wrap the dynamic progress + result region in `aria-live="polite"`.

### MEDIUM

**M1 — `notConfigured` is computed and tested but never read; keyless vs. genuine failure are indistinguishable.** _(2-lane: silent-failure F2 · type-design F3)_ `extract-client.ts:9,23` correctly sets `notConfigured` (503 vs other), but `run-import.ts:54-63` reads only `result.ok` — so a wrong/revoked key (401), rate-limit (429), upstream 502, and network timeout all produce the identical "Live model unavailable — imported the sample" notice as the expected keyless case. The JSDoc promises a "flagged" distinction that is dead code; `run-import.test.ts:43-50` asserts the buggy parity. → Read `notConfigured`; give genuine failures a distinct warning (and consider a `reason` enum over the boolean).

**M2 — Empty paste → 400 → SAMPLE with a misleading "Live model unavailable" message.** _(silent-failure F1)_ Empty textarea + "Extract & import" (live) POSTs `{documentText:""}` → route returns 400 → `extract-client` returns `{ok:false, notConfigured:false}` → degraded SAMPLE fallback. The live model was fine; the real cause (empty input) is hidden behind a wrong blame message. → Guard `imp.text.trim()` before `runTextImport`.

**M3 — No request-body-size cap before `req.json()`.** _(security MEDIUM)_ `route.ts:28` parses the full body (Next default 4MB) before `truncate()` bounds it to `MAX_DOCUMENT_CHARS=8000` — a 3.9MB body is allocated then discarded (resource amplification under load). → Early `content-length` check (≈50KB) → 413, or a route body-size config.

**M4 — `usedFallback`/`degraded` two booleans encode 3 valid states.** _(type-design F2)_ `run-import.ts:25-27` — the 4th combo (`degraded:true, usedFallback:false`) is impossible but representable, and `DemoExperience.tsx:372` only reads `degraded`. → Collapse to `fallbackMode: 'none' | 'guided' | 'degraded'` (one discriminant, both consumers shrink).

**M5 — `route.ts` logs nothing server-side on failure.** _(silent-failure F4)_ The `!res.ok` branch and outer `catch {}` return generic codes with no `console.error`; operators have zero visibility into 401/429/DNS/TLS/abort. → `console.error('[api/extract]', …)` in each failure branch.

**M6 — Test coverage: four zero-coverage production branches + four important gaps.** _(pr-test-analyzer)_ Untested branches that would survive a regression: `req.json()` throw → 400 (C1); empty model content → 502 (C2); `extract-client` 200-with-bad-body → generic failure (C3); `run-import` generic (non-`PdfExtractionError`) PDF error (C4). Important: `timeFrameCount` never asserted (I1), pdf multi-page join untested (I2), `timePeriodType` normalization warning unasserted (I3), the "Select a case first." guard untested (I4). The analyzer supplied ready-to-paste tests for each. → Add them; they pin real branches the suite currently can't catch.

### LOW

- **L1 — pdf.js `getDocument` doesn't set `isEvalSupported: false`** (`pdf-extract.ts:29`). v6 is past the CVE-2024-4367 patch (default is already false), but asserting it is self-documenting and immune to a future downgrade. _(security)_
- **L2 — pdf.js worker leak + masked diagnostic** (`pdf-extract.ts:29-40`). `await loadingTask.promise` is **outside** the try/finally, so a load-time rejection (corrupt/encrypted PDF) never calls `destroy()` → worker leak; and `destroy()` in `finally` can shadow the original page error. → Move `loadingTask.promise` inside the try; `await loadingTask.destroy().catch(()=>{})`. _(2-lane: typescript LOW · silent-failure F5/F6)_
- **L3 — Decorative status SVGs missing `aria-hidden="true"`** (`ImportModal.tsx:112,115,131,162`). _(react)_
- **L4 — `key={index}` on the stage/warnings lists** (`ImportModal.tsx:109,152`) — benign now (fixed-order lists), brittle if they ever reorder. _(react)_
- **L5 — Garbage-but-valid model JSON → all-blank "success".** Wrong-structure or all-null model output → `parseNormalizeMap` returns `{ok:true, fieldCount:0}` → green "Extracted 0 fields" with no data, indistinguishable from a legit empty request. Documented in `deferred.md #3` — but its un-defer trigger ("when the live model is wired") is exactly **this PR**, so the deferral window has closed and it's now actionable. _(silent-failure F7)_ → Surface a "no recognizable fields found — check the document" signal when `fieldCount === 0`.
- **L6 — `ImportStageId` name collision** (`run-import.ts:16` vs `ImportModal.tsx:26`, aliased `RunStageId` at the import) and `ExtractionTimeFrame.timePeriodType: string` doc-only note. _(type-design)_

## Architecture invariants checked & confirmed

- **Secrets:** `OLLAMA_API_KEY` is server-only — no `NEXT_PUBLIC_`, never in any response body, never logged; appears solely in the outbound `Authorization` header. `.env.example` ships blanks. ✅
- **SSRF:** `baseUrl`/`model`/`timeout` are env-only; no request-body field reaches the outbound URL. ✅
- **Prompt injection:** bounded — delimiter sanitization on input, `JSON.parse` (not `eval`), model output flows into React-escaped JSX (no `dangerouslySetInnerHTML`); worst case is attacker-chosen text in a visible, user-editable demo form. ✅
- **Store-bridge / `'use client'`:** only `DemoExperience` touches the store; `ImportModal` is prop-driven; all import utilities are `'use client'`. ✅
- **SSR boundary:** `/demo` is `next/dynamic({ssr:false})`; `import('pdfjs-dist')` + `import.meta.url` worker run browser-only. ✅
- **Async lifecycle:** `AbortController` + `clearTimeout` in `finally` is leak-free; `requestExtraction`/`parseNormalizeMap` can't throw into the orchestrator; file-input value reset allows re-selecting the same file. ✅
- **PDF privacy:** raw bytes never leave the browser — only extracted text is POSTed. ✅

## Recommended next steps

Two quick HIGH fixes unblock most of the risk: **H1** (one-line timeout parse) and **H4** (discriminated `ImportRunResult`, code already shaped for it). Then **H2** (cancel ref), **H3** (a deploy-appropriate proxy guard + spend cap), **H5** (aria-live). Fold **M1/M2/M5** (differentiate + log failures, guard empty paste) and the **M6** test additions into the same pass. The LOW items (pdf.js `isEvalSupported`/destroy hygiene, `aria-hidden`, the now-due `deferred.md #3` blank-success signal) are cheap follow-ups.

## Agent IDs
<!-- Used by a fix-delta re-review to resume these reviewers via SendMessage. -->
- typescript-reviewer: `a222d9aaf7611e46c`
- react-reviewer: `a2f8ad3bc66a564b9`
- security-reviewer: `aff28379ec756833c`
- pr-test-analyzer: `a2f0bacbd29a4081b`
- silent-failure-hunter: `a2e28c0ef456329fc`
- type-design-analyzer: `a2aa47cab202c0240`
- comment-analyzer: not dispatched
- code-simplifier: not dispatched

## Reviewer pipeline notes

- **Triple-lane convergence on H1** (TS + silent-failure + tests independently surfaced the `OLLAMA_TIMEOUT_MS`→NaN→instant-abort path) is the strongest signal in this review — a genuinely silent, operator-invisible break of the whole live feature, with the one-line fix agreed across lanes.
- **Two-lane dedupes:** `notConfigured` dead field (silent-failure M + type-design L → merged M1); pdf.js `destroy()`/worker-leak (typescript L + silent-failure F5/F6 → merged L2). Cross-lane agreement raised confidence on each.
- **A deferral came due:** `deferred.md #3` (garbage JSON → blank success) was parked "until the live model is wired" — this PR wires it, so silent-failure F7 correctly reactivates it (L5).
- **No conflicts/disputed findings** — the lanes were complementary, not contradictory.
