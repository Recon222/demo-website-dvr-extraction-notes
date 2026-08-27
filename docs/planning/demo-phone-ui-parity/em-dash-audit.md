# Em-dash audit — the phone's remaining inventory, and how the demo's sweep was done

**For:** the owner, ahead of directing a phone-side sweep.
**Written:** 2026-08-27 · **Seat:** `dt-partner-opus` (legwork) · **Scope:** both repos, read-only on the phone.
**Phone measured at:** `extraction_case_notes_react_native_expo` @ `main` = `dd5551ec` (the same commit U7.3 measured — main has not moved since).
**Demo sweep measured at:** branch `uiparity/u7.ocr`, commit `aab81ca`.

---

## Summary — five lines

1. **The phone has 47 user-facing em-dash lines left** (48 occurrences), across 21 files. That is the whole job if you direct a sweep.
2. **Another 31 lines are not user-facing** and should be left alone: 13 dev-log diagnostics, 8 SQL comments inside migration strings, 6 lines of an LLM system prompt, 2 HTML comments inside report templates, 2 auto-generated bundles.
3. **Six of the 47 are load-bearing for the demo.** They are frozen in the demo (deferral D-1) *because* the phone still carries the dash. Fixing those six upstream unfreezes the demo's copies automatically.
4. **The demo side is done and guarded.** 82 strings across 37 files swept; a standing test (`features/demo/ui/__tests__/copy-rules.test.ts`) now reds on any new em dash under `features/demo/ui/**`. The demo's `engine/` is *not* swept (deferral D-2, triggers at U8).
5. **En dashes are a separate, smaller thing and are all correct:** 6 rendered en dashes on the phone, every one a numeric or alphabetic range (`1–10 milliseconds`, `A–Z`). The standing rule bans em dashes only. No action.

### Counts at a glance

| | phone (`src/` + `app/`) | demo (`features/demo/ui/**`) |
|---|---|---|
| Raw em dashes in source, comments included | 1,932 | — |
| After stripping comments | 90 occurrences | 120 lines (pre-sweep census) |
| After the two standing exemptions (dev logs, data glyphs) | **83 occurrences / 78 lines / 35 files** | 82 real offenders |
| **User-facing** | **48 occurrences / 47 lines / 21 files** | 82, all swept |
| Not user-facing (leave alone) | 35 occurrences / 31 lines / 14 files | exempt by the guard |
| Rendered **en** dashes (U+2013) | 6, all correct ranges | not scanned (rule is em-dash-only) |

> **Note on one number you may have seen.** The U7.3 report's headline is "82 strings / 37 files"; the *39 files* figure that circulates is the **census** (files containing any em dash before the sweep, including files whose only hits were exempt). Measured on the commit: 58 files changed = 37 under `ui/` + 1 under `engine/` + 20 test files.

---

# Part 1 — Phone-side inventory

Everything below is **measured**: a Node scanner that mirrors the demo guard's mechanism (strip comments, blank `console.*( … )` calls by matching parens, then scan for U+2014), verified against a planted control fixture before it was pointed at the phone. The control had 4 real em dashes, 2 in comments, 2 inside a multi-line `console.warn(`, 1 data glyph, plus test files — the scanner returned exactly 4. A bare `grep "—"` in Git Bash is **not** trustworthy here; use `rg -n $'—'` or a script.

## 1.1 The six that unfreeze the demo — fix these first

These are the demo's deferral **D-1**. The demo carries each string byte-for-byte and has deliberately *kept* the dash, because rewriting it would manufacture new demo↔phone copy drift inside a parity port. The moment the phone string changes, the demo's copy can follow and the freeze list shrinks. Each is one line on each side.

| # | phone `file:line` | demo `file:line` (under `features/demo/ui/`) | string | suggested rewrite |
|---|---|---|---|---|
| F1 | `src/features/import/json-import/components/ImportPickerModal.tsx:920` | `screens/import/PickerStage.tsx:31` | `Paste a request email or notes — AI fills the form` | `Paste a request email or notes, and AI fills the form` |
| F2 | `src/features/import/json-import/components/ImportPickerModal.tsx:721` | `screens/import/PasteStage.tsx:22` | `Paste the recovery request — an email, form text, or notes.` | `Paste the recovery request: an email, form text, or notes.` |
| F3 | `src/features/documentation/notes/components/SectionBlock.tsx:283` | `screens/NotesScreen.tsx:244` | `SOURCE DATA CHANGED — AUTO-GENERATED WOULD NOW READ` | `SOURCE DATA CHANGED. AUTO-GENERATED WOULD NOW READ` |
| F4 | `src/features/documentation/notes/components/NotesSectionEditor.tsx:212` | `screens/NotesScreen.tsx:420` | `Auto-generation is off — restore anytime` | `Auto-generation is off. Restore anytime` |
| F5 | `src/features/form-customization/components/FormCustomizationSection.tsx:187` | `screens/settings/panes/FormFieldsPane.tsx:80` | `Hidden screens are removed from the wizard flow only — any data already entered is still saved and still appears in the generated report.` | `…from the wizard flow only. Any data already entered is still saved…` |
| F6 | `src/features/settings/cloud-sync/components/CloudSyncSettingsSection.tsx:128` | `screens/settings/panes/CloudSyncPane.tsx:50` | `Your agency owns the database — nothing is shared with anyone else.` | `Your agency owns the database. Nothing is shared with anyone else.` |

**Mechanics of unfreezing:** the demo's guard keys its exemption on the *exact string*, and a second test asserts every frozen string is still present. So when the phone string changes and the demo follows, the implementer deletes the row from `FROZEN_PHONE_VERBATIM` in `features/demo/ui/__tests__/copy-rules.test.ts` and the guard immediately starts enforcing that line. The list cannot silently rot into a blanket file exemption.

## 1.2 The remaining 41 user-facing lines

Grouped by where they surface. "Surfaces" is verified at source, not inferred, except where marked.

### App-launch failure screen (4)

`src/components/error/InitFailureScreen.tsx` — full-screen `<Text>` blocks the operator sees when the app cannot start.

| line | string (trimmed) | suggested rewrite |
|---|---|---|
| 76 | `…or contact the developer — this is a build fault, not a problem with your data.` | `…or contact the developer. This is a build fault, not a problem with your data.` |
| 94 | `The evidence database on this device cannot be decrypted — the encryption key is missing or incorrect.` | `…cannot be decrypted: the encryption key is missing or incorrect.` |
| 99 | `If it may hold real case data, do NOT delete the app — contact the developer first.` | `…do NOT delete the app. Contact the developer first.` |
| 118 | `If retrying does not help, restart the app — and if it persists, contact the developer.` | `…restart the app, and if it persists, contact the developer.` |

### Agency-cloud provisioning wizard and enrollment (19)

The wizard renders thrown-error `message` values directly — verified at `useProvisioningWizard.ts:87` (`error instanceof Error ? error.message : String(error)`) and `EnrollDeviceModal.tsx:102,140`. So the service-layer `throw new …Error('…')` strings below are rendered copy, not internal text.

| `file:line` | string (trimmed) | surfaces as | suggested rewrite |
|---|---|---|---|
| `components/EnrollDeviceModal.tsx:235` | `Connected — now sign in` | step heading | `Connected. Now sign in` |
| `components/EnrollmentQRModal.tsx:70` | `Set up your agency cloud first — then this screen shows the code other devices scan to join it.` | empty-state body | `Set up your agency cloud first. This screen then shows the code other devices scan to join it.` |
| `components/steps/AdminAccountStep.tsx:56` | `No email will be sent — remember these credentials.` | step body | `No email will be sent, so remember these credentials.` |
| `components/steps/OrgPlanStep.tsx:67` **(2 dashes on one line)** | `every upload is capped at 50 MB — videos longer than about 30 seconds won't sync — total cloud storage is 1 GB, …` | plan-gate body | `every upload is capped at 50 MB, so videos longer than about 30 seconds won't sync; total cloud storage is 1 GB, …` |
| `components/steps/OrgPlanStep.tsx:92` | `I upgraded — check again` | button label | `I upgraded, check again` |
| `components/steps/TokenStep.tsx:59` | `The token is used once and then forgotten — you should revoke it afterwards.` | step body | `The token is used once and then forgotten. You should revoke it afterwards.` |
| `hooks/useProvisioningWizard.ts:194` | `This Supabase account has no organizations yet — finish creating your account first` | wizard error | `…no organizations yet. Finish creating your account first` |
| `hooks/useProvisioningWizard.ts:215` | `Your access token is no longer available — start again` | wizard error | `Your access token is no longer available. Start again` |
| `hooks/useProvisioningWizard.ts:226` | *(same string)* | wizard error | *(same)* |
| `hooks/useProvisioningWizard.ts:236` | *(same string)* | wizard error | *(same)* |
| `hooks/useProvisioningWizard.ts:257` | `Setup information is incomplete — start again` | wizard error | `Setup information is incomplete. Start again` |
| `hooks/useProvisioningWizard.ts:299` | *(same as :215)* | wizard error | *(same)* |
| `services/enrollment-service.ts:97` | `Could not reach the agency cloud — check the connection and try again` | thrown → enroll modal | `Could not reach the agency cloud. Check the connection and try again` |
| `services/provisioning-service.ts:311` | `The project has no publishable API key — cannot configure devices` | thrown → wizard | `The project has no publishable API key, so devices cannot be configured` |
| `services/provisioning-service.ts:437` | `That project belongs to a different Supabase organization than the one just checked — pick a project from the selected organization` | thrown → wizard | `…than the one just checked. Pick a project from the selected organization` |
| `services/management-api.ts:147` | `response shape mismatch — ${issues}` | thrown → wizard (**developer-grade content**) | `response shape mismatch: ${issues}` |
| `services/management-api.ts:324` | `invalid api key name '${input.name}' — must match ^[a-z_][a-z0-9_]+$ (4-64 chars)` | thrown → wizard (**developer-grade content**) | `invalid api key name '${input.name}': must match …` |
| `utils/errors.ts:37` | `Supabase rejected this access token — check it was copied completely and has not been revoked` | `InvalidTokenError` → wizard | `…access token. Check it was copied completely and has not been revoked` |
| `utils/errors.ts:54` | `Organization is on the '${plan}' plan — video sync requires the Pro plan` | `PlanGateError` → wizard | `Organization is on the '${plan}' plan. Video sync requires the Pro plan` |

*(All 19 live under `src/features/agency-cloud/`.)*

### Import pipeline (8)

| `file:line` | string (trimmed) | surfaces as | suggested rewrite |
|---|---|---|---|
| `src/features/import/json-import/parsers/agency-peel/adapter.ts:29` | `${n} DVR groups found — only the first is imported` | import warning list | `${n} DVR groups found. Only the first is imported` |
| `src/features/import/pdf-import/normalization/normalize-datetime.ts:254` | `Ambiguous date "${value}" — both interpretations …` | import warning | `Ambiguous date "${value}": both interpretations …` |
| `src/features/import/pdf-import/normalization/normalize-datetime.ts:256` | `…Not imported — please enter manually.` | import warning | `…Not imported. Please enter manually.` |
| `src/features/import/pdf-import/services/pdf-import-orchestrator.ts:603` | `✗ case not found — cannot inject occurrence number` | import terminal log | `✗ case not found, cannot inject occurrence number` |
| `src/features/import/pdf-import/services/pdf-import-orchestrator.ts:660` | `Please verify that this is the correct case to import into — wrong-case imports cannot be undone without manual cleanup.` | confirmation prompt `reason` | `…import into. Wrong-case imports cannot be undone without manual cleanup.` |
| `src/features/import/pdf-import/services/pdf-import-orchestrator.ts:673` | `OCC# mismatch: AI '${a}' ≠ case '${b}' — verify` | import terminal log | `OCC# mismatch: AI '${a}' ≠ case '${b}', verify` |
| `…/ImportPickerModal.tsx:721` | see **F2** above | | |
| `…/ImportPickerModal.tsx:920` | see **F1** above | | |

### Documentation output (2, plus F3/F4)

Rendered inside the exported HTML **time-offset report** — an evidentiary artifact that leaves the device, so these are the highest-visibility strings on this list.

| `file:line` | string (trimmed) | suggested rewrite |
|---|---|---|
| `src/features/documentation/time-offset-report/templates/time-offset-template.ts:445` | `<strong>Yes</strong> — corrected to <strong>${date}</strong>` | `<strong>Yes</strong>, corrected to <strong>${date}</strong>` |
| `src/features/documentation/time-offset-report/templates/time-offset-template.ts:926` | `App → NTP → ${server} → (time source unrecognized — traceability not verified)` | `…(time source unrecognized: traceability not verified)` |

### Media capture, OCR, cloud-sync settings, and the route layer (8)

| `file:line` | string (trimmed) | surfaces as | suggested rewrite |
|---|---|---|---|
| `src/features/media/video-image-capture/components/VisionCameraScreen.tsx:679` | `No location permission — captures will have no GPS. Tap to grant.` | camera GPS banner `<Text>` | `No location permission. Captures will have no GPS. Tap to grant.` |
| `src/features/ocr-time-capture/services/ocr-service.ts:36` | `OCR image no longer exists on disk — skipping recognition` | thrown → `error` field at `:168` → OCR result | `OCR image no longer exists on disk, skipping recognition` |
| `src/features/settings/cloud-sync/components/CloudSyncSettingsSection.tsx:75` | `Could not disconnect — try again` | inline error | `Could not disconnect. Try again` |
| `src/features/settings/cloud-sync/components/CloudSyncSettingsSection.tsx:104` | `Cloud needs an update — ask your admin` | status line | `Cloud needs an update. Ask your admin` |
| `src/features/settings/cloud-sync/components/CloudSyncSettingsSection.tsx:109` | `${n} media file(s) not uploaded yet — will retry` | status line | `${n} media file(s) not uploaded yet, will retry` |
| `src/features/settings/cloud-sync/components/CloudSyncSettingsSection.tsx:128` | see **F6** above | | |
| `src/features/case-management/case-map-export/services/case-map-export-service.ts:205` | `Case Map template has unresolved injection tokens (${list}) — regenerate it with \`npm run build:case-map\`` | thrown → failed `ExportResult` (**developer-grade content**; reachable but the guidance is for a developer) | `…injection tokens (${list}): regenerate it with \`npm run build:case-map\`` |
| `src/features/case-management/utils/errors.ts:60` | `Database could not be decrypted — the encryption key is missing or incorrect` | `DatabaseEncryptionKeyError`; the failure screen renders its own copy at `InitFailureScreen.tsx:94` | `Database could not be decrypted: the encryption key is missing or incorrect` |
| `src/features/case-management/utils/errors.ts:101` | `This build was not compiled with SQLCipher — the database cannot be encrypted. Do not use this build.` | `DatabaseEncryptionUnavailableError`; screen copy at `InitFailureScreen.tsx:76` | `…with SQLCipher. The database cannot be encrypted. Do not use this build.` |

### Route layer (2)

| `file:line` | string (trimmed) | surfaces as | suggested rewrite |
|---|---|---|---|
| `app/(form)/time-offset.tsx:261` | `NTP unavailable — verify device clock accuracy` | toast `text2` | `NTP unavailable. Verify device clock accuracy` |
| `app/(tabs)/cases.tsx:1219` | `Submission info copied — enter the new address.` | modal `subtitle` prop | `Submission info copied. Enter the new address.` |

## 1.3 Per-directory breakdown (user-facing only)

| directory | lines |
|---|---|
| `src/features/agency-cloud/` | 19 |
| `src/features/import/` | 8 |
| `src/features/settings/` | 4 |
| `src/components/error/` | 4 |
| `src/features/documentation/` | 4 |
| `src/features/case-management/` | 3 |
| `app/` | 2 |
| `src/features/media/` | 1 |
| `src/features/ocr-time-capture/` | 1 |
| `src/features/form-customization/` | 1 |
| **Total** | **47 lines / 48 occurrences / 21 files** |

## 1.4 What is NOT user-facing — leave these alone (31 lines)

Listed so a sweeper does not "helpfully" fix them, and so the count reconciles.

| class | count | sites |
|---|---|---|
| **Dev-log diagnostics** (`logError(…)`, which writes to `console.error` under `__DEV__` only — verified at `src/lib/utils/error-handler.ts:162-176`) | 13 | `agency-cloud/hooks/useCloudStatus.ts:91` · `agency-cloud/hooks/useProvisioningWizard.ts:146,155` · `agency-cloud/services/user-admin-service.ts:125` · `agency-cloud/services/provisioning-service.ts:116,495` · `sync/services/media-upload-service.ts:213,272,278,285` · `sync/services/supabase-config-service.ts:202` · `case-map-export/services/case-map-export-service.ts:62` · `time-offset-report/templates/time-offset-template.ts:923` |
| **SQL comments** inside the migration template string (`-- …`) | 8 | `agency-cloud/services/provisioning-sql.ts:89,129,142,226,232,303,353,359` |
| **LLM system prompt** (model-facing, not user-facing; rewriting risks extraction quality) | 6 | `pdf-import/prompts/extract-fields-prompt.ts:45,49,51,59,69,84` |
| **HTML comments** inside report templates | 2 | `case-notes/templates/case-notes-template.ts:162` · `time-offset-report/templates/time-offset-template.ts:122` |
| **Auto-generated bundles** ("Do not edit by hand") | 2 | `case-map-export/template/case-map.template.ts:5` · `case-map.vendor.ts:9` |

**On `case-map.template.ts` specifically** — this is the one file where a naive count misleads badly, and where the "huge lines" hazard bites: the whole HTML export is a single 112 KB string literal on one line. Measured by decoding the literal: **57 em dashes inside it, 45 in CSS/HTML/JS comments, and all 12 that survive comment-stripping are data-glyph placeholders** (`'—'` for an empty value, `<span id="tl-range">—</span>`) — **exempt by the rule's own carve-out. Zero user-facing em dashes in the Case Map export.** No action.

## 1.5 En dashes (U+2013) — tallied separately, no action

**6 rendered.** All are correct typographic range separators; the standing rule bans em dashes only.

| site | usage |
|---|---|
| `time-offset-report/templates/time-offset-template.ts:819` | `1–10 milliseconds` |
| `time-offset-report/templates/time-offset-template.ts:820` | `10–100 milliseconds` |
| `location/map-view/components/LocationDetailCard.tsx:147` | `{startStr} {'–'} {endStr}` (time range) |
| `case-map.template.ts` (decoded, embedded JS) ×2 | `left + ' – ' + right`, and the timeline range label |
| `case-map.template.ts` (decoded, embedded JS) ×1 | `'A–Z'` sort-button label |

*(One further en dash, `LocationDetailCard.tsx:147`, is also the data-glyph idiom. The three inside `case-map.template.ts` are invisible to a line-based scanner because the file's own CSS comments swallow the line — they were found by decoding the string literal.)*

---

# Part 2 — How the demo sweep was done

Written so a Claude instance managing the **phone** repo can replicate it. Source: `docs/planning/demo-phone-ui-parity/reports/u7.3-implementation-report.md` (on branch `uiparity/u7.ocr`) plus the commit itself.

## 2.1 The rule, and where it came from

The rule is the phone campaign's own, at `docs/plans/ui-consistency/02-ui-consistency-owner-rulings.md:188` (phone repo), verbatim:

> *"**Standing rule (all user-facing copy, campaign-wide and beyond): no em dashes.** The owner considers them an AI-copy tell; use periods, commas, or parentheses. Data-glyph placeholders (a lone dash meaning no value) are exempt. A repo-wide sweep of existing copy is deferred to a future pass."*

Two things worth the owner's eye:

- **The last sentence is missing from the demo plan's restatement** (`01-master-ui-parity-plan.md` §4.3). The demo's U7.3 **was** that deferred pass, for the demo's own copy. If you now direct a phone sweep, that is the phone's version of the same deferred pass, and the clause is spent on both sides.
- **The phone has only ever enforced this per-PR, on copy it was already rewriting** (PRs P1, P2/D6, P3/D4, P8/D-10, P10 `98ffb98d`). That is precisely why 78 lines survive there. Nothing is broken; the repo-wide pass simply never ran.

## 2.2 Detection

Not `grep`. The demo used a **committed test** that is also the detector, so the census and the guard are the same code. Mechanism, in order:

1. Walk every `.ts`/`.tsx` under the scan root, **excluding `__tests__` directories**.
2. **Strip comments** — block then line — replacing each stripped character with a space so *every line number survives* and an offender's reported line is the real one.
3. **Blank every `console.<method>( … )` call by matching parentheses**, not by a line heuristic. This is the non-obvious part: four calls in the demo are multi-line string concatenations, and a line-scoped rule would let a rendered string on a continuation line through.
4. Scan what is left for U+2014, skipping **data-glyph placeholders** (the em dash is the whole string literal) and any string on the **frozen** list.
5. `expect(offenders).toEqual([])`.

Census result on the demo: **120 lines across 39 files**; after the two exemptions, **82 real offenders** — against a matrix row that had claimed "two demo-only sites" and was sized `S`. The census being two orders of magnitude short is the single biggest sizing lesson from that package.

## 2.3 The user-facing classification — three buckets

| bucket | definition | demo outcome |
|---|---|---|
| **SWEEP** | Copy the demo originated. No parity claim at stake, so the product rule governs alone. | 82 strings, all rewritten |
| **FREEZE** | Copy lifted byte-verbatim from a phone string that **still carries the dash** at `main`. Rewriting would manufacture new demo↔phone drift inside a parity port. | 6 strings (§1.1 above), each named with its phone `file:line` |
| **EXEMPT** | (a) Data-glyph placeholders — the rule's own carve-out. (b) Developer console diagnostics. | not counted as offenders |

The **exemption for console diagnostics is not a judgement call** and the same reasoning transfers to the phone's `logError`: the rule states its scope as "user-facing" four separate times; the phone itself left its `[MediaUpload]` / `[SupabaseConfig]` console strings em-dashed at `main`; and a PR-122 review adjudication explicitly dropped a finding about an added em dash *because it was not rendered*.

The **FREEZE bucket is not the implementer's invention either.** `phone-ui-delta-inventory.md:13300` rules it in the inventory's own words: *"**Em dashes that SURVIVE** (do not 'fix' them in the demo without an owner call — they are still in the phone strings at `main`)."* That instruction is what deferral **D-1** encodes, and its trigger is your call.

## 2.4 Rewrite style

The owner's allowed replacements are **period, comma, colon, parentheses**. The sweep applied them *for sense, never mechanically*:

- **Title + body flattened into one string → period.** This follows the phone's own precedent at `SecuritySettingsSection.tsx:117-120`.
- **Terminal / log lines → colon or comma.** e.g. the phone's own PR #117 fix, `Review the import; some files failed`, recorded in that PR's review lane as *"fixed from an em-dash … per the standing no-em-dash rule"*.
- **Parenthetical asides → parentheses**, where a dash pair was already acting as brackets (4 sites in the demo's settings panes).

**The known weakness, stated plainly:** these are ~82 independent editorial judgements and only their *absence* is tested. Nothing proves a replacement reads well. Two shapes deserve a human read on any sweep: title+body flattens (a period between a notification title and its body can read as a fragment on a narrow surface), and dash-pair → parenthesis conversions (the clause boundaries move).

## 2.5 The standing guard

**File:** `features/demo/ui/__tests__/copy-rules.test.ts` (58-file commit `aab81ca`; the test is 236 lines and carries the full ruling in its docblock).

**Four tests:**

1. **The scan** — `expect(scan()).toEqual([])`. The failure message names the three allowed replacements and points at the frozen list, so the next implementer does not have to find this document.
2. **The dead-exemption test** — every frozen string must still be **present** in its file. This is what stops the freeze list rotting into a permanent blanket exemption for a file whose copy has since changed.
3. **Unit pin on the data-glyph carve-out** — the exemption is "a lone dash meaning no value", *not* "a line containing a lone dash".
4. **Unit pin on the console stripper** — that it blanks a multi-line call whole **and stops at its closing paren** instead of eating the rest of the file.

Verified by mutation probe, not just by reading: a new em dash in rendered copy in an unnamed file → KILLED; deleting a frozen string → KILLED; an em dash on a line *following* `console.warn(` → KILLED.

### The portable recipe

Drop-in for the phone repo (Jest, but this is framework-agnostic — it is `node:fs` plus one assertion). Change the two constants and the frozen list; everything else transfers as-is.

```ts
import { readdirSync, readFileSync } from 'node:fs'
import { join, sep } from 'node:path'

// PHONE: point at the roots you want enforced. The demo used ONE root deliberately —
// widening the scan root is a one-line change and the guard then names every offender.
const SCAN_ROOTS = [join(process.cwd(), 'src'), join(process.cwd(), 'app')]
const EM_DASH = '—'

/**
 * Strings lifted verbatim from somewhere you cannot yet change, keyed by file AND by the
 * exact string. Value = the citation that justifies the freeze. On the phone this list
 * should normally be EMPTY: the phone is upstream.
 */
const FROZEN: Readonly<Record<string, ReadonlyArray<readonly [text: string, why: string]>>> = {}

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__' && entry.name !== 'node_modules') out.push(...sourceFiles(full))
    } else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

/** Block then line comments, replaced by spaces so every line number survives. */
const stripComments = (text: string): string =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length))

/**
 * Blank every developer-diagnostic call, PARENS MATCHED — not by a line heuristic, because
 * multi-line concatenations would leak a rendered string on a continuation line.
 * PHONE: `logError` is the phone's equivalent of the demo's `console.*` (it writes to
 * console.error under __DEV__ only — src/lib/utils/error-handler.ts:162-176), so both
 * belong in this pattern.
 */
function stripDiagnosticCalls(text: string): string {
  // `split('')`, not `[...text]`: keeps this compiling under es5 targets, and UTF-16 code
  // units are the CORRECT unit here — `m.index` is code-unit based, so blanking a surrogate
  // pair as two spaces keeps every later index and line number exact.
  const chars = text.split('')
  const re = /(?:console\.\w+|logError)\(/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    let depth = 0
    for (let i = m.index + m[0].length - 1; i < chars.length; i++) {
      if (chars[i] === '(') depth++
      else if (chars[i] === ')') {
        depth--
        if (depth === 0) break
      }
      if (chars[i] !== '\n') chars[i] = ' '
    }
  }
  return chars.join('')
}

/** A data-glyph placeholder: the em dash is the WHOLE string literal. Exempt by the rule. */
const isDataGlyph = (line: string, index: number): boolean => {
  const before = line[index - 1]
  return (before === "'" || before === '"' || before === '`') && before === line[index + 1]
}

interface Offender { file: string; line: number; text: string }

function scan(): Offender[] {
  const out: Offender[] = []
  for (const root of SCAN_ROOTS) {
    for (const full of sourceFiles(root)) {
      const file = full.slice(root.length + 1).split(sep).join('/')
      const frozen = FROZEN[file] ?? []
      const cleaned = stripDiagnosticCalls(stripComments(readFileSync(full, 'utf8')))
      cleaned.split('\n').forEach((line, i) => {
        for (let at = line.indexOf(EM_DASH); at !== -1; at = line.indexOf(EM_DASH, at + 1)) {
          if (isDataGlyph(line, at)) continue
          if (frozen.some(([text]) => line.includes(text))) continue
          out.push({ file, line: i + 1, text: line.trim() })
        }
      })
    }
  }
  return out
}

describe('no em dashes in user-facing copy', () => {
  it('carries none anywhere in the scanned roots, outside the named exemptions', () => {
    expect(scan()).toEqual([])   // the message should name the allowed replacements
  })

  it('keeps every FROZEN entry live — a stale exemption is a silent blanket exemption', () => {
    for (const [file, entries] of Object.entries(FROZEN)) {
      const text = stripComments(readFileSync(join(SCAN_ROOTS[0], ...file.split('/')), 'utf8'))
      for (const [needle, why] of entries) {
        expect(text.includes(needle)).toBe(true) // `${file}` lost "${needle}" (${why}) — delete its row
      }
    }
  })

  it('exempts the data glyph, and ONLY when it is the whole string', () => {
    expect(isDataGlyph(`x ?? '${EM_DASH}'`, 6)).toBe(true)
    expect(isDataGlyph(`'a ${EM_DASH} b'`, 4)).toBe(false)
  })

  it('blanks diagnostic calls whole, including multi-line concatenations', () => {
    const src = ['logError(', `  'a ${EM_DASH} b' +`, `  'c ${EM_DASH} d',`, ')', `const shown = 'e ${EM_DASH} f'`].join('\n')
    const cleaned = stripDiagnosticCalls(src)
    expect(cleaned).not.toContain(`a ${EM_DASH} b`)
    expect(cleaned).not.toContain(`c ${EM_DASH} d`)
    expect(cleaned).toContain(`e ${EM_DASH} f`)      // stops at the closing paren
    expect(cleaned.split('\n')).toHaveLength(5)      // line numbers survive
  })
})
```

**Four phone-specific adjustments a sweeper must make**, all identified in Part 1:

1. **Add `logError` to the diagnostic-call pattern** (done above). Without it the guard reds on 13 dev-log strings that the rule does not govern.
2. **`provisioning-sql.ts`'s SQL comments (`-- …`) live inside a template literal** and no JS comment-stripper sees them. Either exempt that file explicitly with a stated reason, or extend the stripper. 8 lines.
3. **`extract-fields-prompt.ts` is a model-facing LLM prompt**, not user copy. Exempt it explicitly — rewriting a prompt is an extraction-quality change, not a copy change. 6 lines.
4. **`case-map.template.ts` / `case-map.vendor.ts` are auto-generated** ("Do not edit by hand"; regenerate via `npm run build:case-map`). Exempt both by path. Any real fix belongs in `scripts/`, and per §1.4 there is nothing to fix.

## 2.6 What the demo deliberately did NOT sweep

| not swept | why | un-defer trigger |
|---|---|---|
| **The six phone-verbatim strings** (§1.1) | §4.3's copy rule collides with §4.1 rule 7 ("lift copy verbatim"); the inventory rules the tie at `:13300` — "do not fix without an owner call" | **Deferral D-1** — your call at the next device checkpoint, *or* the phone fixing any of the six upstream, whichever fires first |
| **`features/demo/engine/` — 82 lines, ~40 of them rendered** | The U7.3 row scoped the sweep to `ui/**`, which is the guard's scan root. Several engine strings are asserted by engine unit tests, and `content/seed.ts` is fixture prose whose dashes are *in character* for a detective's email — not an implementer's call | **Deferral D-2** — U8's closing fidelity pass, or the first review round that flags an engine string. Widening the guard is one line (`UI_ROOT` → both roots) |
| **Non-rendered text** — comments, docblocks, planning docs, test-only strings, console diagnostics | The rule's scope is "user-facing", stated four times | none; not a defect |

Three `engine/` strings **were** swept anyway — `content/settings-values.ts:217-219` (`AES-256 — Recommended (strong)` and two siblings) — because the phone had **already fixed exactly those strings** and the inventory's copy-changes table at `:13288` gives the before/after verbatim. That made them a copy *port* under §4.1 rule 7 rather than a judgement call.

## 2.7 Gates the demo sweep cleared

Recorded so the phone sweep can be held to the same bar: full suite `295 files / 3,959 passed / 4 todo`, exit 0 (branch-point baseline 3,932 — net +27, nothing deleted, nothing weakened); `tsc --noEmit --incremental false` exit 0; `.design-sync/check-rn-parity.mjs` exit 0 (135 anchor rows); `pnpm build` exit 0 with `/demo` First Load JS unmoved at 107 kB. Twenty test files carried updated copy assertions, every one **updated to the new copy, never weakened**.

---

## Appendix — reproducing Part 1's counts

The phone repo was **never written to**. The scanner lives outside both repos.

```bash
# Verify your matcher against a planted control BEFORE trusting any count.
# A bare `grep "—"` in Git Bash can mangle unicode; use `rg -n $'—'` or a Node script.
rg -n $'—' src/ --glob '!__tests__' --glob '!*.test.*'
```

The figures in §1 come from a Node script implementing exactly §2.2's mechanism, run against `src/` and `app/` at `dd5551ec`, after being validated on a fixture with a known answer (4 real dashes, 2 in comments, 2 inside a multi-line `console.warn(`, 1 data glyph, plus excluded test files — the scanner returned exactly 4). The `case-map.template.ts` figures come from `JSON.parse`-ing the exported string literal and re-scanning the decoded HTML, because that file's 112 KB single-line body defeats any line-based tool.

**Evidence grades.** Counts, file:line citations, `logError`'s dev-only behaviour, the demo commit's file list and the guard's mechanism: **measured**. "Where it surfaces" for the wizard/enroll error strings: **verified at source** (`useProvisioningWizard.ts:87`, `EnrollDeviceModal.tsx:102,140`, `ocr-service.ts:168`). The suggested rewrites are **editorial proposals**, not measurements — they follow the campaign's voice and the owner's four allowed replacements, and each is one line to accept, alter or reject.
