# Lane: TYPESCRIPT — demo↔phone parity P2 (PR #31)

| | |
|---|---|
| **Lane** | `typescript-reviewer` (`.claude/agents/typescript-reviewer.md`) |
| **Mode** | INITIAL (resumable — this file is the fix-delta baseline) |
| **Worktree** | `.../scratchpad/worktrees/parity-p2` |
| **Branch / ref** | `feat/parity-p2` @ `9f5c01a` |
| **Diff** | `git diff master...feat/parity-p2` — 98 files, +9498 / −274 |
| **Gates run** | `pnpm exec tsc --noEmit` → **exit 0, zero diagnostics**. `pnpm vitest run` → **156 files / 1416 tests, all passing** (59.6 s). |
| **Counts** | 0 blockers · 1 major · 5 minors |
| **Verdict** | **REVISE** (one MAJOR; nothing blocking) |

Phase-context deliberate choices (D10, §M13 2σ refutation, `asyncUtilTimeout` 5000, AlertDialog
scrim-no-dismiss / no focus trap, uncopied phone bugs, snapshot v4 union, orchestrator merge
commits, the demo-ahead-of-phone OCR today-guess gate, sequential §29–§42) were read out of the
commit bodies and `docs/code-reviews/deferred.md` **before** review and are **not** re-flagged.

---

## TYPESCRIPT-1 [MAJOR] features/demo/ui/inputs/LocationFields.tsx:71-91 (write at :80)

**Claim.** `handleCapture` writes to the Zustand store **after an unguarded `await`**. There is no
abort flag, no mounted flag, and no generation token. If `currentLocationId` changes while the
reverse-geocode is in flight, the resolved street/city are written onto **a different location than
the one they were captured for** — silent cross-location contamination of an address field that
feeds the Case Notes PDF header, the notes `address` section, and the completion gate.

**Evidence.**

```ts
// features/demo/ui/inputs/LocationFields.tsx:71-91
const handleCapture = async (fix: GpsFix) => {
  onChange({ lat: fix.lat, lng: fix.lng, accuracyM: fix.accuracyM, coordinateSource: 'gps' })
  setLookupFailed(false)
  if (!geocodeEnabled) return

  setReverseGeocoding(true)
  try {
    const address = await reverseGeocode(fix.lat, fix.lng)
    if (address) onChange({ streetAddress: address.streetAddress, city: address.city })   // ← :80
    else setLookupFailed(true)
  } catch { setLookupFailed(true) }
  finally { setReverseGeocoding(false) }
}
```

That `onChange` is `SubmissionScreen.handleLocationChange` (`SubmissionScreen.tsx:109-121`) →
the bridge prop at `DemoExperience.tsx:974`:

```tsx
onChange={(f, v) => store.getState().updateField(f, v)}
```

and `updateField` resolves its target **at call time**, not at capture time:

```ts
// features/demo/engine/store/create-store.ts (updateField)
const id = get().currentLocationId
if (!id) return
set((s) => ({ locations: s.locations.map((l) => (l.id === id ? setPath(l, path, value) : l)) }))
```

Concrete failure: on location A's Submission screen, "Geocode" is ON (its default,
`LocationFields.tsx:67`). Tap **Use Current Location**; the fix lands and `reverseGeocode` is
awaited — a bare `GeocodingCore.reverse` fetch with **no client-side timeout**
(`ui/inputs/reverse-geocode.ts:34-47`). Before it settles, navigate out to Cases and open
location B. The lookup resolves → `updateField('streetAddress', …)` / `updateField('city', …)`
overwrite **location B's** address with location A's geocoded one. No error, no notice, and the
overwritten value is exactly the string the completion gate validates and the PDF header prints.

The repo already holds the required pattern, in two places, one of them added by this same PR:

- `DemoExperience.tsx:538` — `if (importGen.current !== myGen) return null // cancelled mid-geocode — do not touch the store` (the generation-token idiom the lane brief names as "live, hard-won"; the same check recurs at :498, :660, :710, :715, :720, :751, :754).
- `ui/inputs/useGpsCapture.ts:54-65, 91, 93, 97` — `abortedRef` gates every post-`await` state write for the **capture** half of this very flow. Its commit body claims "abort-on-unmount with no post-unmount state writes"; the sibling geocode `await` in `LocationFields` has no equivalent.
- `ui/inputs/AddressAutocomplete.tsx:118, 131` — a `seq` generation token for the suggest response, in the file `LocationFields` composes.

Blast radius grows on schedule: `LocationFields` is explicitly built for reuse by P3.4 (New
Location) and P3.7 (per-camera GPS) — see the module header and `GpsCaptureControl.tsx:15-19` —
and the New Location modal can be cancelled mid-lookup, which is a cheaper route to the same
cross-write than wizard navigation is.

**Suggested fix.** Give `LocationFields` the same guard shape the capture half already has: a
`useRef` abort flag set in a mount effect's cleanup, re-checked immediately after the
`await reverseGeocode(...)` before `onChange`/`setLookupFailed`/`setReverseGeocoding`. If a
mounted-only flag is judged insufficient (the component survives a location switch without
unmounting when the visitor never leaves Submission), capture `values`-identity or thread the
bridge's location id in and compare after the await — a generation token in the same spirit as
`importGen`. Either way the rule to satisfy is: no post-`await` store write without a token check.

**Confidence.** High on the mechanism (traced end-to-end: `LocationFields` → `SubmissionScreen`
→ bridge → `updateField`'s call-time `currentLocationId` read; no guard anywhere on the path, and
no test pins it — `__tests__/submission-gps.test.tsx` covers the happy path, the toggle-off path
and the null-result path only). Medium on frequency: it needs a slow/stalled Mapbox response
overlapping a deliberate location switch. Severity rests on the lane's explicit rule ("New async
flows that write to the store after an await **must** carry an equivalent token check") plus the
forensic-provenance stakes of a silently mis-attributed address, not on how often it fires.

---

## TYPESCRIPT-2 [MINOR] features/demo/ui/inputs/GpsCaptureControl.tsx:165 (+ features/demo/engine/logic/gps.ts:144-146)

**Claim.** The sample-counter denominator hand-types `10` instead of reading
`GPS_CONFIG_STATIC.maxAttempts`, so the readout and the loop can drift. Same class, folded per the
completeness sweep: `PRECISE_GPS_CONFIG` re-types `10` / `500` rather than deriving them from the
same constant that `buildGpsConfig` uses.

**Evidence.**

```tsx
// GpsCaptureControl.tsx:165
{`Sample ${progress.samplesTaken} of ${config?.maxAttempts ?? 10} · best ${formatAccuracy(progress.bestAccuracyM)}`}
```

```ts
// engine/logic/gps.ts:111
export const GPS_CONFIG_STATIC = { maxAttempts: 10, retryDelayMs: 500 } as const
// :128-138  buildGpsConfig()  →  maxAttempts: GPS_CONFIG_STATIC.maxAttempts,  retryDelayMs: GPS_CONFIG_STATIC.retryDelayMs
// :142-147  PRECISE_GPS_CONFIG = Object.freeze({ targetAccuracyM: 10, maxAttempts: 10, timeoutMs: 120_000, retryDelayMs: 500 })
```

When `config` is omitted the hook falls back to `buildGpsConfig()` (`useGpsCapture.ts:86`), whose
`maxAttempts` comes from `GPS_CONFIG_STATIC`. The control's own `?? 10` is a **second, independent
default for the same number**. Change `GPS_CONFIG_STATIC.maxAttempts` to 8 and the loop takes 8
readings while the live readout says "Sample 8 of 10" — a demo whose stated contract is that
"every number on that line is measured" (`GpsCaptureControl.tsx:23-28`) then prints one that isn't.
No current test would catch it. `PRECISE_GPS_CONFIG` carries the same latent divergence for the
P3.6/P3.7 consumers it exists for.

**Suggested fix.** Import `GPS_CONFIG_STATIC` in `GpsCaptureControl` and use
`config?.maxAttempts ?? GPS_CONFIG_STATIC.maxAttempts`; build `PRECISE_GPS_CONFIG` from
`...GPS_CONFIG_STATIC` with only `targetAccuracyM` / `timeoutMs` overridden.

**Confidence.** High (mechanical; the constant is exported from the module the file already imports
`formatAccuracy` from).

---

## TYPESCRIPT-3 [MINOR] features/demo/engine/logic/final-submission.ts:85-90 — deferred §38 is stale-on-arrival

**Claim.** `docs/code-reviews/deferred.md` §38 (added by P2.4 **on this branch**) lists four
hand-rolled address joins and states its own strike condition: "when P2.3's `formatAddress` port
lands, make it the single producer: the gate's `toFinalSubmissionInput`, `selectCaseNotesData`,
`generateNotes` and the bridge's two summary joins all call it, and this entry is struck."
P2.3 landed on this same branch and three of the four converted — `toFinalSubmissionInput` did
not, and §38 was not updated. The ledger therefore ships describing a state that no longer holds.

**Evidence.**

| §38 site | State on `9f5c01a` |
|---|---|
| `selectCaseNotesData` | ✅ `formatAddress(loc?.businessName, loc?.streetAddress, loc?.city)` — `selectors.ts:249` |
| `generateNotes` | ✅ replaced by the notes module, which routes through `formatAddress` — `notes/address-formatter.ts:15, 26` |
| bridge summary joins (×2) | ✅ `DemoExperience.tsx` Completion summary + `previewTimeOffset` both call `formatAddress` |
| `toFinalSubmissionInput` | ❌ still `[businessName, streetAddress, city].map(trim).filter(Boolean).join(', ')` — `final-submission.ts:85-90` |

Behaviourally this is currently inert: the gate only asks whether the composed address is
non-empty, and `formatAddress` trims + drops blanks identically (`address-format.ts:90-100`), so
the only difference is street-type abbreviation, which cannot change emptiness. The cost is
process, not output: a second live definition of "the address" survives the very commit that was
supposed to end it, and §38's own §42 cross-reference ("Remaining hand-join sites OUTSIDE the PDF
path … are P2.4's §37 table") now points at sites that no longer exist.

**Suggested fix.** Either convert `toFinalSubmissionInput` to `formatAddress(...)` — keeping its
in-file note that the `locationName` fallback must **not** apply here — and strike §38; or amend
§38 to record that it is now a one-site entry with its own trigger. Do not merge it in the current
shape.

**Confidence.** High (both the ledger text and all five call sites read directly).

---

## TYPESCRIPT-4 [MINOR] features/demo/ui/screens/NotesScreen.tsx:96-156 vs features/demo/ui/controls/AlertDialog.tsx:25-40

**Claim.** This PR adds **two** blocking-dialog primitives with **opposite** scrim semantics, and
the one that dismisses on scrim click contradicts the reason given for the one that doesn't.

**Evidence.** `AlertDialog` documents its decision explicitly:

```
 * - The scrim does NOT dismiss. A native alert is answered by choosing a button, and this
 *   is the demo's blocking-dialog primitive; a click-away escape hatch would let a visitor
 *   skip a decision the phone forces.
```

and commit `e4c15ea` deletes `TimeOffsetScreen`'s screen-local `RecalculateDialog` for exactly
that consolidation ("§39.1 … RESOLVED"). `NotesScreen.ConfirmDialog`, landed on the same branch,
is a second screen-local dialog whose scrim **does** dismiss:

```tsx
// NotesScreen.tsx:117-119
<div data-notes-dialog-scrim onClick={onCancel} style={{ position: 'absolute', inset: 0, … }}>
```

It also re-implements the Escape listener, `role="alertdialog"`, `aria-modal`, and the portal —
but not the focus-move / focus-restore that `AlertDialog` carries (`AlertDialog.tsx:55-61`). Its
divergent shape is defensible on its own terms (three stacked actions + an explicit Cancel row,
matching an iOS `Alert.alert` with >2 buttons), but the divergence is undocumented in-file and
unlogged in `deferred.md` §39/§42, so a future reader hits two contradictory answers to "does a
scrim click dismiss a demo dialog?".

**Suggested fix.** Either extend `AlertDialog` with a stacked-actions variant and delete
`ConfirmDialog`, or leave `ConfirmDialog` as-is and record the divergence (and the deliberate
scrim difference) in `deferred.md` §42 with a trigger — the same treatment §39.1 gave the
recalculate dialog.

**Confidence.** High on the facts; medium on whether the team wants the consolidation now versus
a ledger entry.

---

## TYPESCRIPT-5 [MINOR] features/demo/ui/screens/NotesScreen.tsx:343-351

**Claim.** `copyAll`'s reset timer is neither tracked nor cleared, so overlapping clicks let an
earlier timer wipe a later confirmation, and the timer outlives unmount.

**Evidence.**

```tsx
const copyAll = async () => {
  try { await navigator.clipboard.writeText(copyAllText); setCopied('done') }
  catch { setCopied('failed') }
  setTimeout(() => setCopied('idle'), 1600)      // ← :350, never stored, never cleared
}
```

Click Copy all at t=0 (timer A → fires t≈1600) and again at t=1500 (timer B → t≈3100). Timer A
fires 100 ms into the second confirmation and resets the label to "Copy all" while the second
copy has only just happened — the visitor sees the confirmation for a copy that succeeded blink
out, and no confirmation for the copy they just made. Leaving the Notes screen inside the window
leaves a pending timer holding the closure (harmless in React 19, but the bridge's own
`syncTimer` is cleared on unmount, so this is the odd one out).

**Suggested fix.** Hold the handle in a `useRef`, `clearTimeout` it at the top of `copyAll`, and
clear it in an unmount effect — the `syncTimer` shape already used in `DemoExperience`.

**Confidence.** High (deterministic, reproducible with two clicks).

---

## TYPESCRIPT-6 [MINOR] features/demo/ui/inputs/GpsCaptureControl.tsx:122-126

**Claim.** A new async click handler with no terminal `.catch()`, plus a floating promise from the
`onCapture` callback. Distinct from `deferred.md` §18 (which covers the *import* handlers), so it
is a new instance of the pattern rather than a re-file of a tracked one.

**Evidence.**

```tsx
const onClick = () => {
  void capture().then((fix) => {
    if (fix) onCapture(fix)     // onCapture is LocationFields.handleCapture — an async fn; its
  })                            // promise is dropped here
}
```

`capture()` (`useGpsCapture.ts:76-109`) has `try/finally` but no `catch`, so anything thrown below
it propagates: `toGpsFix` ends in `new Date(best.timestampMs).toISOString()`
(`engine/logic/gps.ts:204`), which throws `RangeError` for a non-finite `timestampMs`, and an
injected `deps.delay` can reject. Either becomes an unhandled rejection here, and
`handleCapture`'s own returned promise is likewise unobserved (its `onChange` call at
`LocationFields.tsx:73` sits outside its `try`, so a throwing store write rejects it silently).
The UI does recover — `capture`'s `finally` resets `isCapturing` — so the practical cost is a lost
diagnostic rather than a stuck spinner, which is why this is a MINOR and not folded into
TYPESCRIPT-1.

**Suggested fix.** Terminate the chain: `.catch((e) => console.warn('[demo/gps] capture failed', e))`
— the same operator-breadcrumb treatment `reverse-geocode.ts:45` and `extract-client.ts` already
use — and make `onCapture`'s return type `void | Promise<void>` observed (or have `handleCapture`
own its own `.catch`).

**Confidence.** Medium-high on the mechanism; low on it firing in a real browser (`position.timestamp`
is a spec-guaranteed number). Filed because the lane brief asks for *new* handlers repeating the
§18 pattern to be flagged.

---

## Checked and cleared (no finding — recorded so the fix-delta doesn't re-litigate)

**Hard rules — all preserved.**
- **Store bridge**: `grep -rn "useStore" features/demo/ui` → zero hits outside `DemoExperience.tsx`. Every new screen/control (`NotesScreen`, `OcrCaptureScreen`, `AlertDialog`, `CoordinateDisplay`, `GpsCaptureControl`, `LocationFields`, `DateDisambiguationWarning`) is props-in/callbacks-out. `buildNotesSectionMeta` is a pure derivation the bridge calls, not a store read from below.
- **Engine purity**: no `from 'react'`, no `'use client'`, no module-scope `window`/`document` under `features/demo/engine/**` (only doc-comment prose matches). New engine modules `gps.ts`, `dst-advisory.ts`, `final-submission.ts`, `address-format.ts`, `logic/notes/**` are all plain TS; browser I/O correctly lives in `ui/inputs/capture-gps.ts` / `reverse-geocode.ts`.
- **Single barrel / marketing isolation**: `grep -rn "features/demo" components app/\(default\) lib` → only the guard test and a prose comment. No new `@/features/demo/ui|engine` import from `app/`, `components/`, `lib/`.
- **Registry-derived ordering**: `SECTION_DEFINITIONS` is the single order source; `assembleNotesString` derives `SECTION_ORDER` from it (`notes-assembler.ts:11`) rather than re-typing; `section-registry.ts:74-79` adds a compile-time exhaustiveness guard (`MissingRegistryEntry extends never`) that makes a new `NoteSectionId` without a registry entry a build break. `NOTE_SECTION_IDS` is consumed by the zod guard via `z.enum(NOTE_SECTION_IDS)` (`persistence.ts:220`), so the union and the schema cannot drift.
- **Determinism seam**: no `Date.now()`/`Math.random()` in ids, keys or unsandboxed render scope. `computeDstAdvisory` *does* evaluate at render scope (`DemoExperience.tsx:1018-1024`) but only through the injectable `clock` seam (`ui/inputs/clock.ts`), touches no id/key, and `/demo` is `ssr: false` — deliberate and documented; not flagged. `readDvrTimestamp(cleaned, clock.now().getTime())` reads the clock at event scope. `date-disambiguation`, `dst-advisory`, `import-normalize` all take injected clocks.
- **`as any` / `: any` / `<any>`**: zero in the diff. One widening cast, `(navigator as Navigator & { geolocation?: GeolocationLike })` (`capture-gps.ts:44`), is correct and justified. Two non-null assertions (`LocationFields.tsx:141-142`) sit directly under the `hasCoordinates` guard TS can't narrow through.
- **`isolatedModules`**: every type-only re-export in `engine/index.ts` and `logic/notes/index.ts` uses `type`. `logic/notes/types.ts:14` imports `OFFSET_DIRECTIONS` under `import type` and uses it only in `typeof` position — legal, and `tsc` agrees.

**XSS / secrets.** `generateCaseNotesDoc`'s new notes path escapes: `assembleNotesString(...)` →
`e(notesFlat)` where `e = escapeHtml` (`pdf/case-notes.ts:125, 222-226`). Visitor-typed section
content and addenda cannot reach the document unescaped. No new `dangerouslySetInnerHTML`, no
server-secret read moved client-side, no change to `app/api/extract/route.ts`'s guard order.

**Async correctness elsewhere.** The import-run generation token survives the R-45/R-46 changes
intact (`lastRealStageRef` now nulled at both token bumps and on cancel; `tally.unaccounted`
drained per file). `useGpsCapture` is correct: a ref mutex for re-entry (state can't guard within
a tick), `abortedRef` gating every post-`await` write, `finally` restoring `runningRef`.
`captureGps`'s deadline arithmetic is sound — permission denial is terminal, per-call `timeout` is
the remaining budget, samples in hand are committed rather than discarded on expiry, and
`isAborted` is polled both before each attempt and after the loop.

**Notes subsystem.** Reconciliation is reference-preserving, so `changed` (which gates the store
write) is exact rather than heuristic; unknown stored ids are dropped **and** counted as a change
(the phone PR-85 C1 secondary), so a healed array actually persists. `isSectionStale` correctly
refuses to badge a section whose fresh output is empty. All five store flows (A–E2) read fresh
state at call time and short-circuit when nothing changed. `resetNoteSection` is the only path
clearing `manuallyEdited`; addenda survive reset and restore, and are dropped by `scrapAll` — each
matching the documented phone flow. Flow F (`selectCaseNotesData`) reconciles read-only, so the
PDF can't embed stale auto-notes even if Notes was never opened.

**Store / persistence.** `SNAPSHOT_VERSION` 4 + key `dvr-demo-state-v4` correctly supersede both
parallel v3 bumps; `accuracyM` widened to optional in both gps shapes with matching `.optional()`
in the zod guard; `noteSectionSchema` is `satisfies FullShape<NoteSection>`. `roundTo5Min`'s new
throw has exactly one caller (`generateExtractedScopes`), already inside per-entry isolation that
counts, flags (`extractedScopesPartial`) and dev-warns — verified by grep, not assumed.
`requireCanonicalTime` gives the D10 passthrough branch the same guard.

**OCR.** `parseTimestampFromText`'s widened return type (`string | null` → `TimestampParse | null`)
is fully absorbed by callers — `tsc` clean and every date part is `p2()`-padded, so
`readDvrTimestamp`'s `parse.value.slice(10)` date-splice can't misalign. `readDvrTimestamp` runs
its ambiguity regexes against the raw `text` while the parser normalizes first; I checked this can
diverge — whitespace collapse and `stripTimezone` cannot create or destroy a `d/d/dddd` match, so
it is harmless today. `isDvrDraftCommittable` is enforced at both the button and the commit path
(`DemoExperience.tsx:814`), so the gate is not UI-only.

**DST advisory.** The month-start bracket + binary search resolves the phone's missed
month-boundary transition and reads correctly in both hemispheres (`before === false` ⇒ spring
forward) and for zones with no DST (both `null` → the literal `spring`/`fall` fallbacks the phone
uses). Branch order A→B→C→D matches the ported gate.

**Deliberately not flagged (other lanes).** `buildNotesSectionMeta` returning fresh object
identities each render, which defeats `SectionBlock`'s `memo`; `computeDstAdvisory`'s ~23
`isInDST` probes per render of the Time-Offset result block; `AlertDialog`'s missing focus trap and
its lack of re-announcement when its content is swapped in place; `CoordinateDisplay`'s `copied`
state never returning to idle — all `web-reviewer`. Test shape, `asyncUtilTimeout`, and the new
suites — `test-analyzer`. The `~35` new `engine/index.ts` exports whose only consumer is
`barrel.test.ts` are the established norm here (the demo UI imports engine modules by aliased
internal path), not a new deviation from the R-10 note.

---

## Inventory — what was read

**Full reads (source, not just hunks):** `engine/logic/gps.ts`, `dst-advisory.ts`,
`final-submission.ts`, `address-format.ts`, `date-disambiguation.ts`, `ocr.ts`;
`engine/logic/notes/{types,index,section-registry,section-meta,section-reconciler,notes-assembler,notes-relevant-data,address-formatter,time-offset-formatter,scopes-formatter,retention-formatter,export-formatter,time-on-scene-formatter,camera-formatter,format-timestamp}.ts`;
`ui/inputs/{capture-gps,useGpsCapture,reverse-geocode,clock,CoordinateDisplay,GpsCaptureControl,LocationFields,AddressAutocomplete}.ts(x)`;
`ui/controls/AlertDialog.tsx`; `ui/screens/{NotesScreen,OcrCaptureScreen,SubmissionScreen,DateDisambiguationWarning}.tsx`.

**Diff + surrounding context:** `ui/DemoExperience.tsx` (bridge, in full for the gate / OCR /
notes / import regions), `engine/store/create-store.ts`, `selectors.ts`, `persistence.ts`,
`engine/types/index.ts`, `engine/index.ts`, `engine/content/{seed,narration}.ts`,
`engine/logic/{time,pdf/case-notes}.ts`, `ui/screens/{TimeOffsetScreen,CompletionScreen,ImportModal,NewLocationModal,screenData,map/mapData}.ts(x)`,
`ui/chrome/PdfPreview.tsx`, `vitest.setup.ts`.

**Docs:** `.claude/agents/typescript-reviewer.md`, `features/demo/CLAUDE.md`,
`docs/code-reviews/deferred.md` §15 / §18 / §38 / §39 / §40 / §41 / §42, all 56 commit bodies on
`master..feat/parity-p2`.

**Commands:** `pnpm exec tsc --noEmit` (exit 0); `pnpm vitest run` (156/156 files, 1416/1416
tests); store-bridge sweep, engine-purity sweep, marketing/demo isolation sweep, deep-import
sweep, `as any` / non-null-assertion / `console.*` sweeps over added lines only; caller greps for
`roundTo5Min`, `parseTimestampFromText`, `readDvrTimestamp`, `isDvrDraftCommittable`,
`computeDstAdvisory`, `validateFinalSubmission`, `freshSectionContent`, `reconcileSections`,
`assembleNotesString`, `maxAttempts`, `joinAddress`, `@/features/demo/engine`.
