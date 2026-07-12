# PR #12 (M4) — User-Testing Findings & Fix Plan

Five issues found while driving the live demo (guided tour + free sandbox). Each entry has the
**symptom**, the **verified root cause** (file:line), and the **best-path-forward fix** — proper
fixes, no band-aids. Nothing is applied yet; this is the diagnosis.

Source tags:
- 🟦 **demo-side bug** — my wiring, fix in this repo.
- 🟩 **portable** — the correct logic exists in the prototype (`09-App showcase website structure/`) and ports cleanly.
- 🟧 **phone-app parity (optional)** — portable version gets us to *prototype* parity now; *true* phone-app parity would need that module. Flagged, not guessed.

## TL;DR

| # | Issue | Root cause | Fix source | Effort |
|---|-------|-----------|-----------|--------|
| 1 | PDF & Paste both open the same pre-filled paste screen | both handlers hard-code `SAMPLE_REQUEST_DOC` | 🟦 + 🟩 (pdf.js picker) | M |
| 2 | "Use Current Time" overwrites DVR time, ignores device clock | handler sets **both** fields to un-synced now | 🟦 + 🟩 | S–M |
| 3 | NTP card is a one-liner, not prototype parity | `capture.sync` is never generated (wiring exists, generation doesn't) | 🟩 + 🟧 | M |
| 4 | Notes don't aggregate the mad-libs template | `generateNotes` is an M2 stub; no auto-gen on screen entry | 🟩 + 🟧 | S–M |
| 5 | Guided tour barely types anything (only DVR make) | most wizard screens have **no beat at all** + the few scripted fields are pre-filled by the seed | 🟦 | M |

---

## 1. Import — PDF and Paste both open the same pre-filled paste screen

**Symptom (yours):** In the sandbox, clicking Import → **PDF** *or* **Paste text** both land on the
same paste screen, already filled with the Kim's Convenience data. PDF should open a real file
picker; paste should be **blank**.

**Root cause** — `components/demo/DemoExperience.tsx:528-529`:
```ts
onChoosePdf={() => setImp((s) => ({ ...s, stage: 'paste', text: SAMPLE_REQUEST_DOC }))}
onChoosePaste={() => setImp((s) => ({ ...s, stage: 'paste', text: SAMPLE_REQUEST_DOC }))}
```
Both buttons do the identical thing and seed the textarea with `SAMPLE_REQUEST_DOC` (the guided-tour
email). There is **no PDF picker path at all**, and the paste textarea is never blank. (The import
chapter has no guided beat, so this pre-fill served no tour purpose — it's purely a sandbox bug.)

**The prototype does this correctly** (🟩):
- A hidden file input — `DVR Extraction Notes Tour.dc.html:630`:
  `<input type="file" accept="application/pdf,.pdf" onChange="{{ onPdfFile }}" style="display:none">`
- `extractPdfText` (HTML 2002-2015) loads **pdf.js**, `getDocument({data})`, walks every page's
  `getTextContent()`, returns the text.
- `onPdfFile` (HTML 2017-2030): read `files[0]` → `extractPdfText` → feed the text into the import
  pipeline (skipping the "extract" stage since text is already in hand).
- Paste binds the textarea to `importText`, which **starts empty** — the user pastes their own text.

**Best path forward:**
1. **Paste** → `onChoosePaste` opens the paste stage with `text: ''` (blank).
2. **PDF** → `onChoosePdf` triggers a hidden `<input type="file" accept="application/pdf,.pdf">`
   (ref-clicked from the PDF button in `ImportModal`). On `change`:
   - extract text with **pdf.js** — port `extractPdfText` into `lib/demo/logic/pdf-extract.ts`, add
     the `pdfjs-dist` npm package, and configure its worker for Next/Turbopack (the one fiddly bit —
     `pdfjs-dist/build/pdf.worker.min.mjs` via a `?url` import or `public/`),
   - drive the existing import stages (`progress` → `result`) with the extracted text.
3. The **model stays stubbed** (the pipeline still resolves to `SAMPLE_EXTRACTION`, per the M2
   decision) — but the *picker + extraction wiring is now real*, exactly as you asked. When a model
   is wired later, the extracted text is already flowing to the right place.
4. On extraction failure, surface "PDF read failed — try Paste instead" (the prototype's fallback),
   not a silent dead-end.

**Files:** `DemoExperience.tsx` (handlers + hidden input + ref), `ImportModal.tsx` (PDF button →
input ref; paste textarea defaults blank), new `lib/demo/logic/pdf-extract.ts`, `package.json`
(`pdfjs-dist`). **Risk:** low. **Decision needed:** see Decision A (real pdf.js extraction vs
picker-only stub).

---

## 2. "Use Current Time" overwrites the DVR time instead of stamping the device clock

**Symptom (yours):** On the Time Offset screen, "Use Current Time" just copies the DVR value above
instead of using the computer's actual current time.

**Root cause** — `components/demo/DemoExperience.tsx:401-405`:
```ts
onUseCurrentTime={() => {
  const now = getCurrentFormattedTime()
  store.getState().updateField('capture.dvrDateTime', now)   // ← wrong: clobbers the DVR field
  store.getState().updateField('capture.actualDateTime', now)
}}
```
It writes the current time into **both** fields, so it stomps whatever DVR time you captured (which
reads as "it copied the DVR row"), and it does **no NTP sync** — it's not the device-calibration
gesture at all. `getCurrentFormattedTime()` itself is correct (no-arg → device `new Date()`); the
bug is purely this handler.

**The prototype's `useCurrentTime`** (🟩, HTML 2083-2096) is the real gesture — and it's the **same
flow as the NTP card (#3)**:
```js
useCurrentTime = async () => {
  const deviceTimeAtCapture = Date.now();
  this.setState({ syncing: true });
  await this.delay(1300);                                   // simulated round-trip → spinner
  const offset = Math.round(Math.random()*170 - 85);       // ±85 ms device drift
  const rtt = 14 + Math.round(Math.random()*38);
  const calibrated = deviceTimeAtCapture + offset;
  this.setState({
    syncing: false,
    actualDateTime: getCurrentFormattedTime(calibrated),   // ← ONLY the actual field
    syncResult: { offset, rtt, uncertainty: Math.max(8, Math.round(rtt/2)),
                  server: 'time.nist.gov', method: 'NTP (UDP)', timestamp: calibrated },
  });
};
```
It sets **only `actualDateTime`** (the calibrated device time) and records the **sync metadata**. It
never touches the DVR time.

**Best path forward:**
1. Add a pure helper `simulateNtpSync()` → `{ calibratedMs, sync: SyncResult }` in
   `lib/demo/logic/` (`SyncResult` already exists, `types/index.ts:52-59`, and its shape matches:
   `offsetMs`/`uncertaintyMs`/`rttMs`/`server`/`method`/`traceability`).
2. Rewrite the handler: a component-local `syncing` flag → `true`, 1.3 s delay (the spinner), then
   `updateField('capture.actualDateTime', getCurrentFormattedTime(calibratedMs))` **and**
   `updateField('capture.sync', sync)` → `syncing` `false`. **Do not touch `capture.dvrDateTime`.**
3. `TimeOffsetScreen` takes a `syncing` prop to render the spinner state.

This fixes #2 and simultaneously generates the data #3 needs. `Date.now()`/`Math.random()` are fine
here (the workflow-script ban doesn't apply to runtime code). **Files:** `DemoExperience.tsx`,
`TimeOffsetScreen.tsx`, `lib/demo/logic/` helper. **Risk:** low.

---

## 3. NTP "atomic clock" card isn't at prototype parity

**Symptom (yours):** The sync card under the time inputs is just one line; the prototype shows a
proper readout. (And you noted the prototype itself isn't at phone-app parity — so this is step one.)

**Root cause:** Two parts.
- **Generation is missing.** Nothing ever sets `capture.sync`, so it's always `null`.
  `TimeOffsetScreen` falls back to my one-line `captureMethod === 'ocr'` placeholder.
- **The card markup is a stub.** I never ported the real card.

Importantly, **the rest of the chain already exists** — `calculateOffset` threads `sync` into
`TimeOffsetData` (`create-store.ts:253`), and the **PDF already renders the full NTP methodology**
when `sync` is present (`app-logic.js:651-688`: offset, uncertainty, RTT, server, traceability
chain, the whole BIPM/UTC explainer). So this is a *generate + display* gap, not a plumbing gap.

**The prototype card** (🟩, HTML 302-314): a "Syncing with atomic clock…" spinner, then a panel with
**Device offset / Round-trip / Uncertainty / Source** rows + the traceability line
`Device → {method} → Atomic clock → UTC → SI second`.

**Best path forward:**
1. Generate `capture.sync` via the `simulateNtpSync()` from #2 (sandbox "Use Current Time").
2. **Guided tour:** the `timeOffset` beat currently sets `actualDateTime` to a scripted
   `2025-03-08 12:00:00` (so the offset lands on a clean `00:05:30`). Keep that, and **also** set a
   scripted `capture.sync` in the beat (`beats.ts:50-57`) so the card shows in the tour without a
   real device sync. (The sync metadata is independent of the actual-time value, so the scripted
   5:30 offset is preserved.)
3. Port the full card markup (HTML 302-314) into `TimeOffsetScreen`, reading `capture.sync` +
   `syncing`. No PDF change needed — it already consumes `sync`.

**Files:** `TimeOffsetScreen.tsx` (card), `beats.ts` (scripted sync), `lib/demo/logic` (shared with
#2). **Risk:** low. **🟧 Phone-app flag:** this delivers *prototype parity* (simulated NTP). For
**true phone-app parity** (the app's real NTP exchange + its exact metadata/wording), point me at the
phone app's NTP/time-sync module and I'll port that instead of guessing — see Decision C.

---

## 4. Notes screen doesn't aggregate the mad-libs template

**Symptom (yours):** The Notes screen is meant to *write the bullets for the user* from the fields
they entered (a mad-libs template). Unsure if the wiring is even there.

**Root cause:** The wiring **is** there — `generateNotes` store action, `notesText`/`notesEdited`
state, the Regenerate button, and the guided `notes` beat all exist. Two gaps:
- **The template is an M2 stub.** `create-store.ts:307-335` emits only: occurrence #, location,
  "Requested by", offset, and requested-scope lines — plain, no bullets.
- **No auto-generate on screen entry** in the sandbox, so the textarea is blank until you hit
  Regenerate.

**The prototype's `generateNotes`** (🟩, HTML 2227-2241) is the real mad-libs template — bulleted,
and it pulls from *every* section the user filled:
```
CCTV / DVR RECOVERY — CASE NOTES
• Occurrence #: …
• Location: …
• Requested by: … #badge
• DVR: {brand} ({serial})                ← missing from my stub
• DVR time offset: CORRECT | … actual time
• Requested window N: … → … (real/DVR time)
• Extracted DVR-time window N: … → …     ← missing
• Cameras: …                              ← missing
• Export: {GB} via {media}, {provided}    ← missing
```
And it auto-runs on entry — `if (t.id === 'notes' && !notesEdited) generateNotes()` (HTML 1649),
same for `completion` (1650). The `!notesEdited` guard means manual edits are never clobbered.

**Best path forward:**
1. Replace the stub `generateNotes` with the **full template** (port HTML 2227-2241; add a
   `fmtDisplay` date helper). Reads case + location + `form.dvr`/`scopes`/`extractedScopes`/
   `cameras`/`export`.
2. **Auto-generate on entering `notes` and `completion`** when `!notesEdited` — an effect in
   `DemoExperience` keyed on `view`. This is what makes the notes "write themselves" after you fill
   the fields (the prototype's behavior). Manual edits still set `notesEdited` and are preserved.

**Files:** `create-store.ts` (`generateNotes` + helper), `DemoExperience.tsx` (auto-gen effect).
**Risk:** low. **🟧 Phone-app flag:** the prototype template is far richer than my stub and is
demo-appropriate, but may still be simpler than the phone app's. If you want the app's *exact* notes
sections/wording, point me at its notes generator — see Decision C.

> Note on "as the user fills in the fields": the prototype regenerates on **screen entry** (guarded
> by `notesEdited`), not on every keystroke — that's the app's actual model and it avoids fighting
> manual edits. I recommend matching it; live per-keystroke regen is possible but worse UX.

---

## 5. Guided tour barely types anything — only the DVR make animates

**Symptom (yours):** Almost all the fields across the guided tour are blank and aren't being filled
in by typing; only one field (the DVR make) typed.

**Correction to my first read:** I initially blamed only the seed pre-fill on the Submission screen.
That was too narrow. The verified, fuller picture:

**Root cause — the tour scripts almost no field-filling.** `director/beats.ts` authors typing for
**five fields total**, and most wizard screens have **no beat at all**:

| Screen | Beat? | What it fills |
|--------|-------|---------------|
| Submission | yes | types `businessName`, `streetAddress`, `city` — **but the seed already holds these** (`seed.ts:82-84`), so the typing is invisible. The other 6 identity fields aren't scripted (also seeded). |
| Requested Scope | yes | one scope via an **instant** `field` set (no typing) |
| Arrival / Departure | **none** | blank |
| Time Offset | yes | actual time + OCR-captured DVR time |
| Extracted Scope | yes | generated |
| DVR Information | yes | types `dvrTypeBrand` + `totalDvrRetention` — **the only visibly-typed fields**, because `blankLocationForm()` starts the form empty (`seed.ts:36-48`). The other ~9 DVR fields aren't scripted → blank. |
| Cameras | **none** | blank |
| Export Info | **none** | blank |
| Notes | yes | generated text |

So the lived experience is exactly what you saw: most screens are empty, and the only field that
visibly types is the DVR make (the one scripted field that starts blank). Two compounding causes:
(a) **sparse beat authoring** — Arrival, Cameras, Export and most of DVR have no beats; (b) **seed
masking** — the few Submission fields that *are* scripted are pre-filled by `SEED_LOCATION`, so their
typing produces no visible change.

> I could not get a live browser read to confirm whether Submission renders pre-filled vs. fully
> blank — the demo's continuous animations hang the screenshot/`read_page` tools on `document_idle`.
> By the code path Submission is pre-filled from the seed; if it's actually rendering blank, there's
> an extra binding issue to confirm on-screen. The fix below makes the field state deterministic
> either way — we verify together at the computer.

**Best path forward — make the scripted case a true blank that the tour fills live:**
1. **Blank the scripted dataset.** Strip `SEED_LOCATION` to what the dashboard/cases list needs
   (`locationName` + the case header) and blank every wizard field (identity + form). This is the
   architecture's stated intent — "the store is seeded blank for the scripted case; the guided tour
   types into it live" (`seed.ts:27`) — which the current pre-filled seed contradicts.
2. **Author `type` beats for every wizard screen**, so the visitor watches each screen fill in:
   - Submission — all 9 identity fields (requester block + location block).
   - Requested Scope — the cameras field types; datetimes via fast `field` set (pickers don't type
     char-by-char — realistic).
   - Arrival / Departure — one visit.
   - DVR Information — all the DVR fields, not just two.
   - Cameras — one or two cameras (name + specs).
   - Export Info — media / file type / size / provided-via.
3. Keep the existing generated steps (Extracted Scope, Notes) and the Time Offset capture.

This turns the tour from "mostly empty with one typing field" into a full watch-it-fill-in
walkthrough. **Files:** `content/seed.ts` (blank the scripted data), `director/beats.ts` (rich typing
beats for every screen). **Risk:** low (data/config only). **Effort:** M (authoring ~6 screens' beats).

---

## Decisions for you

**A — Issue #1 PDF extraction.** Real pdf.js text extraction (add `pdfjs-dist`, port `extractPdfText`,
configure the worker) **[recommended — this is the "picker wiring should be there" you asked for]**,
or a picker-only stub (file picks, extraction deferred)?

**B — Issue #5 scope + seed trade-off.** Go the full route — **blank the scripted dataset and author
typing beats for every wizard screen** so the whole tour fills in live **[recommended]** — accepting
that the cases list shows the scripted location by name until the Submission beat types its address
(`screenData.ts:61`). Or the narrower route — keep the cases list's address seeded (those two fields
won't animate) and only enrich the beats for the empty screens.

**C — Issues #3 & #4 parity depth.** Port the **prototype** versions now (simulated NTP card + full
notes template — portable, demo-appropriate) **[recommended]**, and treat **true phone-app parity**
(the app's real NTP module + its exact notes generator) as a follow-up — for which I'd need you to
point me at those two phone-app modules so I port rather than guess.

## What is NOT a guess vs. what needs the phone app

| Concern | Status |
|---|---|
| #1 PDF picker + pdf.js extraction | 🟩 portable from prototype (model intentionally stubbed) |
| #2 Use-Current-Time device sync | 🟩 portable from prototype |
| #3 simulated NTP card + generation | 🟩 portable from prototype; 🟧 *real* NTP needs phone app |
| #4 notes mad-libs template + auto-gen | 🟩 portable from prototype; 🟧 *exact* app template needs phone app |
| #5 guided typing | 🟦 pure seed/beats config — no external logic |

Only #3 (real NTP) and #4 (exact app notes) have an *optional* deeper tier that needs phone-app code.
Everything required to fix all five to prototype parity is already in-repo or in the prototype.
