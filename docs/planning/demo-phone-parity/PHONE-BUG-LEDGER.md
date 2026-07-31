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

## Copy / UX nits

9. **CaseActionsSheet `Status:` line renders the raw lowercase enum** (`draft`/`complete`) instead of display copy. (deferred §49)
10. **NewCaseModal's disabled-submit predicate makes its own validation messages unreachable** — the `disabled` check IS the `validateForm` check, so "Case number is required"/"Unit is required" are dead copy. (deferred §50a)
11. **`DRAFT`→"Active" label rename** still deferred in `CaseStatusBadge` et al. (pre-existing, noted in ui-mapping cross-cutting patterns).

## Doc-drift (fix the docs, not code)

12. **The ">2σ GPS outlier filter" does not exist** — `gps-service.ts:276-282` picks the most accurate sample; the filter is documented fiction in `src/features/README.md:768` and `DOCUMENTATION-PLAN.md:2520` (accurate line: `location/README.md:276`). Do not implement it — it would change committed coordinates. (phone-inventory correction banner)
13. **`resetProfile()` documented but not implemented** (user-profile docs vs store).
14. **`app/README.md` says 3 tabs (actually 4); `constants/README.md` lists a ROUTES.TABS.SETTINGS that is a modal; arrival-departure documented 1–10 (store caps 20); `cloud-sync/README.md` `isLocked` formula wrong.** (phone-inventory audit flags)

## Back-port candidates (improvements, not bugs — matrix §4)

B2 clock-injected datetime parts · B3 `RetentionView` derivation · B4 incident-coordinate UX + strict `parseCoordinate` · B5 `motion.ts` as the Reanimated port template · the demo's D10 extracted-scope passthrough comments as documentation of intent.
