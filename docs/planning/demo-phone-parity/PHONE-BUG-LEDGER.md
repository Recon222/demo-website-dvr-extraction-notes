# Phone-Repo Bug Ledger — found by building the demo replica

Consolidated 2026-07-31. File these as BUG-NNN in the phone repo's `docs/cleanup-audit/bug-list.md` on return (the phone repo is read-only for the parity effort). Sources cited per item; deeper writeups live in the demo's `docs/code-reviews/deferred.md` §§ noted.

## Genuine bugs

1. **Cameras: index-keyed custom-mode flags desync on row removal** — `app/(form)/cameras.tsx:36-61`; removing a row shifts flags to the wrong camera and can destroy typed data. Same defect fixed demo-side (P0 R-2, id-keyed).
2. **MediaLibrarySheet: no `onDismiss`** — iOS pageSheet swipe-to-dismiss strands `showMediaLibrary`; the drawer never re-opens. (ui-mapping `09-media.md` fact-check.)
3. **Import date pipeline ×3** — `sourceContainsFullDate` substring false-positive trusts a hallucinated year; `findYearTokenNear` inspects only the first occurrence; blank time-frame date emits a spurious "Empty datetime value" adjustment. Fixed demo-side; full notes in demo `docs/code-reviews/phone-app-debug.md`.
4. **`getDSTTransitionDates` never crosses a month boundary** — `bidirectional-time.ts:330-344`; a transition on the 1st is invisible and the DST advisory degrades. **Reachable in production 2026-11-01** (fall-back Sunday on the 1st). Demo port brackets month starts + binary-searches. (deferred §39.4)
5. **First blocked PDF tap shows an empty alert body** — `completion.tsx` `handlePreviewPdf` reads `validationErrors` state set in the same tick; the field list lands one render late. (P2.4 report; demo passes the fresh list.)
6. **Stale reverse-geocode overwrites a just-picked address** — `IncidentLocationForm.tsx:145-158` never consults `geocodeRequestRef` on address select; an in-flight lookup from the previous coordinates can settle afterward and clobber the pick, stranding "Looking up address…". (P3.6; demo abandons superseded lookups.)
7. **Silent reverse-geocode failure in NewLocationModal** — `onReverseGeocodeError` unwired at that call site (ui-mapping `11-case-modals.md:386`); failures log to Sentry only, zero user feedback. (deferred §51)
8. **OCR "assume today" is silent** — `timestamp-parser.ts:260-266` stamps `new Date()` for time-only frames and the confirm screen pre-fills it without telling the operator. Demo gates it behind explicit confirmation. (deferred §40b)
9. **Audio recorder: the big Stop button's 500ms min-duration guard is inert** — only the Stop *pill* is gated; the phone's own ui-mapping calls the big button's guard "currently inert" (`10-audio.md:62/70`), so a sub-500ms take stops through the big button and lands on an error toast instead of being prevented. Demo binds the shared 500ms `canStop` gate to BOTH controls. (P4.6 report; deferred §61b)
10. **Case Map export: the dev-only data-script strip never fires** — `scripts/build-template.mjs:73` splits on a `\n`-terminated key against a CRLF prototype, so `template/case-map.template.ts` (1542 CRLF pairs) still carries `<script src="assets/case-map.data.js">`; every exported `Case Map.html` 404s on an `assets/` dir that isn't in the ZIP. The post-build guards (`:79-83`) check only tokens + a leaked `pk.`. Fixed demo-side in `tools/port-case-map-template.mjs`. (P5.4 report; deferred §71c)
11. **Case Map export: every export is tab-titled with the sample case** — `template/case-map.template.html:6` hardcodes `<title>Case Map — OCC-2026-00417</title>` (the prototype's sample OCC) and nothing sets `document.title` at runtime (the only `.title` write is a tooltip, `case-map.app.js:796`). Fixed demo-side via a `__CASE_TITLE__` token. (P5.4 report; deferred §71c)

## Copy / UX nits

12. **CaseActionsSheet `Status:` line renders the raw lowercase enum** (`draft`/`complete`) instead of display copy. (deferred §49)
13. **NewCaseModal's disabled-submit predicate makes its own validation messages unreachable** — the `disabled` check IS the `validateForm` check, so "Case number is required"/"Unit is required" are dead copy. (deferred §50a)
14. **`DRAFT`→"Active" label rename** still deferred in `CaseStatusBadge` et al. (pre-existing, noted in ui-mapping cross-cutting patterns).

## Doc-drift (fix the docs, not code)

15. **The ">2σ GPS outlier filter" does not exist** — `gps-service.ts:276-282` picks the most accurate sample; the filter is documented fiction in `src/features/README.md:768` and `DOCUMENTATION-PLAN.md:2520` (accurate line: `location/README.md:276`). Do not implement it — it would change committed coordinates. (phone-inventory correction banner)
16. **`resetProfile()` documented but not implemented** (user-profile docs vs store).
17. **`app/README.md` says 3 tabs (actually 4); `constants/README.md` lists a ROUTES.TABS.SETTINGS that is a modal; arrival-departure documented 1–10 (store caps 20); `cloud-sync/README.md` `isLocked` formula wrong.** (phone-inventory audit flags)

## Back-port candidates (improvements, not bugs — matrix §4)

B2 clock-injected datetime parts · B3 `RetentionView` derivation · B4 incident-coordinate UX + strict `parseCoordinate` · B5 `motion.ts` as the Reanimated port template · the demo's D10 extracted-scope passthrough comments as documentation of intent · B6 `encodeJsonForScriptTag` (`</script>` in a location name closes the phone's data tag early; the map's bare `catch {}` at `case-map.app.js:109` then renders a blank map with zero feedback — demo escapes `<`; back-port is additive since `buildCaseMapHtml`'s signature is unchanged).

## Added by P7.3 (2026-08-01) — numbered after the existing list to keep every reference above stable

18. *(copy / UX nit)* **The `limited` form profile's blurb promises a reduction it does not make** — `form-customization/components/ProfilePicker.tsx:25` reads "Comprehensive, lightly reduced (SPC/SOCO)", while `config/profiles.ts:13` states and its off-lists confirm that limited drops nothing at all (its defaults are byte-identical to forensic). Either give `limited` an off-list or change the copy. Demo carries the copy verbatim and pairs it with a derived "Hides nothing" count. (deferred §82d)
19. *(genuine bug — dead control)* **The Settings grid's submission GPS group toggles nothing** — `submission.latitude` / `.longitude` / `.coordinateAccuracy` / `.coordinateSource` are a togglable group in `config/field-registry.ts:31-34`, and no screen reads them: the 35 `useFieldVisible` call sites across `app/(form)/*.tsx` cover every other switchable field, and `submission.tsx:54-60` gates the five requester fields plus the two contact fields only — the GPS capture control and coordinate card render unconditionally. Switching the group off in Settings appears to take (the store writes the override) and changes nothing on screen. Fix is one `showGps`-style gate in `submission.tsx` around `<LocationForm/>`'s GPS block. Demo gates it. (deferred §82b)

