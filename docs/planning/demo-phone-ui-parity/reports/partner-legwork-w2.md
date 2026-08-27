# Partner legwork — W2 briefs (U2 control primitives · U3 status/notices/badges · U4 sheets/dialogs)

**Produced:** 2026-08-27 · seat: PARTNER (`dt-partner`, Opus)
**Base:** `feat/uiparity-u0` @ **`7099e54`** ("Merge uiparity/u0.guard into feat/uiparity-u0 — U0.4 drift guard repair + first anchor stage (18 keys / 33 rows, both halves)").
**Method:** `git archive 7099e54 features/demo | tar -x` into session scratch, then plain `grep -n` over the export. No worktree cut, nothing written to either repo. `worktrees/u0-*` and `u1-*` were not read.
**Phone repo:** not needed for this pass.

**Evidence grades** — **verified** (file opened at `7099e54`, text byte-copied) · **measured** (command given) · **inferred** (marked inline).
Everything below is verified or measured unless a line says otherwise.

**Shift map.** U0 added **one import line near the top** of most files it swept, so cited lines below
that import move **+1**. Exceptions measured from `git diff --numstat master 7099e54`:
`ExportCaseCard.tsx` **+2 before `:123`, +7 after** · `DvrInfoScreen.tsx` **+2** · `_pane-chrome.tsx` **+1** ·
`input-theme.ts` **+8** · `glass-tokens.ts` **+12**. Files U0 never touched keep their `master` numbers —
those are called out as ✓ below, and **several were already wrong on `master`**.

---

## 0. Corrections that change a brief

| # | Plan says | Reality at `7099e54` | Consequence |
|---|---|---|---|
| **C1** | A66/U2.2: "**six** hand-rolled outline recipes, and **every one** pairs a `#2B8CC1` border with `#4BA3D4` text" | **Only 4 of 6 match that description.** Two are a different recipe, one of those two is arguably out of scope. See §1.2. | U2.2's row and its brief must be re-cut into three groups, or the implementer "fixes" a disabled control and an accent-fill button into outline buttons. |
| **C2** | A66 names `ExportSecurityPane.tsx:131-158` as an outline site | It is `border: GLASS.borderBtn` + `color: '#7a9fc4'` on an **inert** button (`:57` comment: *"the inert Set-password button"*). **Zero occurrences** of `#2B8CC1`, `#4BA3D4`, `primaryLight` or the literal `border: '1px solid` in the whole file (measured). | A66's own carve-out — *"explicitly out of scope: the `disabledText` branches (WCAG 1.4.3 exempts inactive controls)"* — covers it. **Drop it from U2.2** or reclassify. |
| **C3** | A66 implies one recipe across the six | `OcrCaptureScreen.tsx:125-133` (`panelButton`) and `AudioRecorderScreen.tsx:508-516` (`sampleButton`) are **byte-identical to each other** and are a *tinted-fill* button: `border '1px solid #4BA3D4'` + `background 'rgba(43,140,193,0.14)'` + `color '#9fd4ee'`. | A de-dup U2.2 gets for free — and **`#9fd4ee` is an eighth light blue** that appears **12× in 5 files** and is named nowhere in the matrix. |
| **C4** | U2.3: switch off-track `#1e3a5f` → `#1c4e84` | **Already done by U0.1.** All four renderers read `colors.border` today (`_shared.tsx:553`, `TimeOffsetScreen.tsx:122`, `GpsCaptureControl.tsx:180`, and `FormFieldsPane`'s `RowSwitch`). | U2.3's colour half is closed. Its real work is `hideLabel`, the three deletions, and the thumb-off ruling. |
| **C5** | U2.2/A52: "two unshared danger buttons, both `background:'#ff4757'`" | Both now route through a **module const** — `DeleteConfirmationModal.tsx:66` and `RowActions.tsx:40`, each `const ERROR = '#ff4757'`, used at `:203` and `:107`. `DeleteConfirmationModal` spends `ERROR` on **three** things (icon `:126`, warning text `:183`, button `:203`). | U2.2 must change **only the button**. Re-pointing `ERROR` wholesale would recolour a 48px icon and an italic warning line, which is C.3 rule 1's "stop using red as text" in reverse. |
| **C6** | U4.3: "three byte-identical copies and **two** hand-rolled focus traps" | **Three focus-restore blocks, and none is a Tab-cycling trap.** `AlertDialog` has a capture-phase `activationOrigin` singleton (`:44`, `:60`); `DeleteConfirmationModal:83-86` and `ExportModal:226-229` each read `document.activeElement` at mount. | AlertDialog's docblock at `:31` says the `activeElement` approach fails *"when the opener disables itself"*. **Consolidating onto the other two would be a regression** — U4.3 must keep AlertDialog's mechanism as the shared one. |
| **C7** | A80/U3.4: "~10 inline empty states" | **20 `fontStyle: 'italic'` sites** in 17 non-test files (measured). Two of the ten cited (`LocationList:159-172`, `MapScreen:105-117`) carry **no italic** at all; nine unlisted sites do. | The matrix already flags A80 as an approximation needing a census re-run — §3.4 **is** that re-run. U3.4's size is roughly double the row. |
| **C8** | U3.1 premise | **Holds exactly.** `palette.ts` @ `7099e54` carries `success/successDark/error/errorLight/errorDark/warning/warningDark/info/infoDark`; it does **not** carry `successLight`, `warningLight`, `infoLight`, `warningAccent` or any `*OnLight`. Its docblock `:33-35` says so. | No change needed. Reported because the dispatch asked whether U3.1 was stale — **it is not**. |
| **C9** | §6.1 lists the U2∥U3 shared set | `DeleteConfirmationModal.tsx` is touched by **U2.2** (`:203`), **U4.3** (whole file) and **U4.4** (`:97`) — three packages across two phases, and it is absent from §6.1. | Add it. U2.2 → U4.3 crosses a phase boundary, so it is not covered by within-phase ordering. |
| **C10** | U4.4's file list | Omits **`inputs/PickerSheet.tsx:49`**, which paints `T.scrim` and is one of the seven `T.scrim` consumers. | Add it, or the scrim family lands with one consumer still on the old alpha. |

---

## 1. U2 — corrected `file:line` per package

### 1.1 U2.1 — export `fieldInput`, delete four copies

| Plan cite | At `7099e54` | Δ | Recipe still matches? |
|---|---|---|---|
| `_shared.tsx:186-195` (`fieldInput`) | **`:187-196`** — `const fieldInput: CSSProperties = {` at `:187` | +1 | ✓ |
| `_shared.tsx:262` (the error re-derive) | **`:263`** — `const boxStyle = error ? { ...fieldInput, borderColor: '#ff4757' } : fieldInput` | +1 | ✓ — and note it hardcodes `#ff4757` rather than `colors.error` |
| `AddressAutocomplete.tsx:35-44` (`inputStyle`) | **`:36-45`** | +1 | ✓ |
| `IncidentLocationFields.tsx:87-96` (`coordInput`) | **`:88-97`** | +1 | ✓ |
| `NewCaseModal.tsx:52-61` (`coordInput`) | **`:53-62`** — note it is `const coordInput = {` with **no `CSSProperties` annotation** | +1 | ✓ |
| `SubmissionScreen.tsx:146` label / `:147` value | **`:147` label / `:148` value** | +1 | ✓ — D10's reading is confirmed: `:148` is a **sibling** div carrying `opacity: 0.6`, not a wrapper |

**`SubmissionScreen.tsx:148` at `7099e54`** already reads `background: colors.background` (U0.1 swept it) but
still carries `fontSize: 15, padding: '11px 12px'` — the geometry half U2.1 owns is intact.

### 1.2 U2.2 — Button variants (the row needs re-cutting; see C1–C3)

**Group A — true outline (`border '1px solid #2B8CC1'` + `color '#4BA3D4'` + `background 'transparent'`). Four sites.**

| Plan cite | At `7099e54` | Δ |
|---|---|---|
| `CompletionScreen.tsx:123-126` | **`:123-126`** (untouched by U0) | ✓ |
| `TimeOffsetScreen.tsx:74` | **`:75`** | +1 |
| `TimeOffsetScreen.tsx:77-80` | **`:78-81`** (svg stroke `:79`, label `:80`) | +1 |
| `UserProfilePane.tsx:74-84` (`editButton`) | **`:74-84`** (untouched) | ✓ |

**Group B — tinted-fill, NOT outline. Two byte-identical sites.**
`border '1px solid #4BA3D4'` · `background 'rgba(43,140,193,0.14)'` · `color '#9fd4ee'` · `borderRadius 10`.

| Plan cite | At `7099e54` | Δ |
|---|---|---|
| `OcrCaptureScreen.tsx:112-133` | **`:125-133`** — `const panelButton` at `:125`; `:112-124` is unrelated | **wrong on `master` too** |
| `AudioRecorderScreen.tsx:508-518` | **`:508-516`** — `const sampleButton` | ✓ range |

**Group C — inert control, out of scope per A66's own carve-out (C2).** `ExportSecurityPane.tsx:131-158`.

**Danger fill (C5):** `DeleteConfirmationModal.tsx` — `const ERROR = '#ff4757'` at **`:66`**, button at **`:203`**
(plan said `:202`, +1); other `ERROR` consumers at `:126` (48px icon) and `:183` (italic warning text) **must not move**.
`RowActions.tsx` — `const ERROR` at **`:40`**, button at **`:107`** (plan's `:106-108` block ✓, untouched).

**Fragments:** `glass-tokens.ts` — `glassCard` **`:59`**, `glassBtnPrimary` **`:66`**, `glassBtnSecondary` **`:74`**
(plan cites `:54-67`; U0 shifted the module +12).

### 1.3 U2.3 — collapse the four switch renderers

| Plan cite | At `7099e54` | Δ |
|---|---|---|
| `_shared.tsx:479-557` (`Toggle`) | **`:480-558`** — `export function Toggle({` at `:480`; track at **`:553`** | +1 |
| `FormFieldsPane.tsx:151-198` (`RowSwitch`) | **`:152-199`** — `function RowSwitch({` at `:152` | +1 |
| `TimeOffsetScreen.tsx:111-124` (DST switch) | **`:112-125`** — track at `:122` | +1 |
| `GpsCaptureControl.tsx:179` (geocode toggle) | **`:180`** | +1 |

All four already paint `background: on ? '#2B8CC1' : colors.border` — **the off-track re-base is done (C4).**
What remains is genuinely U2.3's: `hideLabel`, deleting `RowSwitch`, adopting at the other two, and the
thumb-off decision (the plan keeps the demo's `#fff`/`#7a9fc4` pair as a recorded divergence).

### 1.4 U2.4 — pickers, radios, checkboxes, the recessed well

| Plan cite | At `7099e54` | Δ | Note |
|---|---|---|---|
| `TimeWheel.tsx:103-139` | **`:103-140`** ✓ untouched — drum `background: T.raised` `:112`; selection band `:127-129`; curvature fade `:138` | ✓ | |
| `Dropdown.tsx:68-159` | **✓ untouched** — `optionRow` `:68`, indicator zone `:117`, checkmark badge `:155-156` | ✓ | the four accent alphas are `:76` `0.08`, `:117` `0.06`, `:155` `0.2`, `:156` `0.15` |
| `Calendar.tsx:86-97` | **✓ untouched** — day cell `:89-91` (`borderRadius: 18`, `T.primaryEdge`, `T.primary`) | ✓ | |
| `DateField.tsx:64-92` | **✓ untouched** — trigger border `:68`, footer `:89` | ✓ | |
| `TimeField.tsx:39-57` | **✓ untouched** — `ghostBtn`/`primaryBtn` `:39-40`, trigger `:52` | ✓ | |
| `_pane-chrome.tsx:163-232` (`radioOption`) | **`:164-233`** — `const radioOption` `:164`, `PaneRadioGroup` `:183`, usage `:210` | +1 | |
| `RequestedScopeScreen.tsx:19-29` | **✓ untouched** — `TimeTypeButton` `:19`, style `:24` | ✓ | |
| `ExportCaseCard.tsx:68-82` (checkbox) | **`:70-84`** — `const boxBase` `:70` (`20×20`, `borderRadius: 5`, `borderWidth: 2`) | +2 | |
| `ExportLocationRow.tsx:42-79` | **✓ untouched** — `minHeight: 44` `:31`, separator `rgba(30,58,95,0.6)` `:36`, round indicator `:44-46` | ✓ | |

---

## 2. U3 — corrected `file:line`, and the D19 re-cut audited

### 2.1 U3.1 — nothing to correct (C8)

`palette.ts` @ `7099e54`, dark half, **32 keys**: `primary` `primaryLight` `primaryDark` `background`
`backgroundSecondary` `backgroundTertiary` `text` `textSecondary` `textTertiary` `textInverse` `border`
`borderLight` `borderDark` `success` `successDark` `error` `errorLight` `errorDark` `warning` `warningDark`
`info` `infoDark` `onPrimary` `onError` `link` `linkHover` `card` `modal` `overlay` `overlayLight`
`disabled` `disabledText`.

**U3.1 must still add, exactly as its row says:** `successLight #0f6b42` · `warningLight #7d5f10` ·
`infoLight #2e5f97` · `warningAccent #ffc62b` · `infoOnLight` / `warningOnLight` / `successOnLight` /
`errorOnLight` all `#f0f4f8`. `errorLight` is already present (`:77`) — the row is right about that too.
`PaletteToken` is `keyof typeof dark` (`:113`) and `palette = { light, dark }` (`:168`), `colors = palette.dark`
(`:179`), so **adding a key to one half only is a compile error** — U3.1 must add both halves.

### 2.2 U3.2 — the eight status-colour owners

| Plan cite | At `7099e54` | Δ |
|---|---|---|
| `screenData.ts:17-43` | **✓ untouched** — `caseStatusTheme` `:17`, `locationStatusTheme` `:34` | ✓ |
| `DvrInfoScreen.tsx:20-26` (`STATUS`) | **`:22-28`** | **+2** |
| `ExportHub.tsx:98-102` (`ARTIFACT_COLOR`) | **✓ untouched** — `:98`, consumed `:201` | ✓ |
| `_pane-chrome.tsx:68-72` (`NOTE_TONE`) | **`:69-73`** — consumed at `:98` | +1 |
| `CoordinateDisplay.tsx:23-27` (`TONE_COLOR`) | **✓ untouched** — `:23`, consumed `:140` | ✓ |
| `WizardDrawer.tsx:77-94` (`DOT`/`SAVE_STATUS_COLOR`) | **✓ untouched** — `dotBase` `:77`, `DOT` `:78`, `SAVE_STATUS_COLOR` `:89`, consumed `:394` | ✓ |

### 2.3 U3.3 — `Banner` and its six own-lane adoptions

| Plan cite | At `7099e54` | Δ |
|---|---|---|
| `ExtractedScopeScreen.tsx:23-25` | **`:23-25`** ✓ untouched — the info notice | ✓ |
| `ImportModal.tsx:190-197` | **`:191-197`** — the error banner (`GLASS.borderError` + `rgba(255,71,87,0.08)`) | **off by 1 on `master` too** |
| `ImportModal.tsx:266` | **unresolved** — the three `role="status"` blocks are `:248`, `:258`, `:275`; nothing notice-shaped sits at `:266`. **The brief must name which one it means.** | — |
| `PickerStage.tsx:317-323` | **`:317-323`** ✓ untouched | ✓ |
| `EditIncidentLocationModal.tsx:55-64` | **`:55-62`** — `const banner` (`border '1px solid #ff4757'` `:58`, `background 'rgba(255,71,87,0.12)'` `:59`, `color '#ff8a94'` `:60`); rendered at **`:72`** | range short by 2 |
| `DateDisambiguationWarning.tsx:36-46` | **`:36-46`** ✓ untouched — `role="alert"` `:37` | ✓ |
| `chrome/DemoErrorBoundary.tsx` | `role="alert"` wrapper **`:110`**; the detail block U3.3 re-bases is the `rgba(255,71,87,0.06)` card | ✓ |

### 2.4 U3.4 — the A80 sweep is bigger than the row (C7)

**Measured:** `grep -rn "fontStyle: 'italic'" features/demo/ui --include=*.tsx | grep -v __tests__` → **20 sites, 17 files.**

| Plan's ten | At `7099e54` | Verdict |
|---|---|---|
| `ArrivalDeparture:33` | `:33` | ✓ |
| `Cameras:83` | `:83` | ✓ |
| `CasesScreen:84` | **`:85`** | +1 |
| `CasesScreen:204` | **`:205`** | +1 |
| `DvrInfo:211-215` | **`:212`** | +1 |
| `ExtractedScope:27` | `:27` | ✓ |
| `ExportCaseCard:211` | **`:218`** | **+7** |
| `MediaLibrarySheet:494-505` | **`:484`** (and a second at **`:605`**) | **−10, plus one unlisted** |
| `LocationList:159-172` | **no italic in the file** | **cite does not match the idiom** |
| `MapScreen:105-117` | **no italic in the file** | **cite does not match the idiom** |

**Nine unlisted italic sites** (each needs a keep/convert ruling before U3.4 is briefed):
`DashboardScreen:61`, `DashboardScreen:187`, `DateDisambiguationWarning:71`, `DeleteConfirmationModal:183`,
`ExportModal:175`, `ExportModal:322`, `OcrCaptureScreen:427`, `SyncStatusCard:81`, `TimeOffsetScreen:106`,
plus `map/LocationRow.tsx:28` (`const biz`, an italic *business-name* style, not an empty state).

Several of these are **not empty states** — `DeleteConfirmationModal:183` is a red warning line,
`SyncStatusCard:81` is a status detail, `LocationRow:28` is a data field. **A blanket "no italic"
sweep would restyle live data.** U3.4's brief needs the keep-list, not just the convert-list.

Nested rows / header geometry: `map/LocationRow.tsx` card radius is **`:21` `borderRadius: 12`** (the
"card-radius row" A57 flags). `CasesScreen`/`DashboardScreen` nested rows and the 92→64 header block were
**not** independently re-verified in this pass — flag if the brief needs them.

### 2.5 D19 — the re-cut holds, with one addition

**Confirmed:** all six cross-lane `Banner` adoptions are out of U3.3 and appear in the rows the plan names —
`TimeOffsetScreen` + `CompletionScreen` → **U6.4b** · `NewCaseModal` → **U6.4a** · `_pane-chrome` → **U6.2** ·
`AudioRecorderScreen`/`AudioPreviewScreen` → **U7.2** · `OcrCaptureScreen` → **U7.3**. No U3 package touches
those files at `7099e54`.

**The two survivors are exactly the two the plan names**, and both are non-overlapping textual regions:

| File | U2 owns | U3 owns | Separation |
|---|---|---|---|
| `settings/panes/_pane-chrome.tsx` | **U2.4** — `radioOption` **`:164-233`** | **U3.2** — `NOTE_TONE` **`:69-73`** (+ its `:98` consumer) | 66 lines apart, no overlap |
| `screens/export/ExportCaseCard.tsx` | **U2.4** — `boxBase` **`:70-84`** | **U3.4** — empty state **`:218`** | 134 lines apart, no overlap |

`merge U2 before U3` is sound. **One addition (C9):** `DeleteConfirmationModal.tsx` is touched by
**U2.2** (`:203`), **U4.3** (whole file) and **U4.4** (`:97`) — a cross-*phase* pair §6.1 does not list.

---

## 3. U4.1 — the sheet seam, and the primitive it must extend

### 3.1 What the plan specifies (plan §5 U4.1, post plan-review V-8)

Two deliverables, because three packages consume this as a **mountable component**, not a constants module:

- **(a) `ui/controls/sheet-chrome.ts`** — the style constants, `SEAM(U4.1)`.
- **(b) `ui/controls/GlassBottomSheet.tsx`** — the mountable shell, `SEAM(U4.1b)`, with the contract:

```ts
{ visible: boolean; onClose: () => void; title: string; subtitle?: string;
  closeAccessibilityLabel: string;          // <- THE name. Not `closeLabel`.
  maxHeightRatio?: number /* 0.9 */; fillHeight?: boolean /* false */;
  showHandle?: boolean /* true */; showAccentStrip?: boolean /* true */;
  footer?: ReactNode; children: ReactNode }
```

Close routes on the web: backdrop click · swipe-down past `DRAG_THRESHOLD` · **`Escape`** (the Android-back
analog) · the caller's footer action — **one handler**. Portals through `PhoneOverlayPortal`.

**A naming inconsistency the brief must resolve:** plan §5 U4.1 and U4.2 and matrix A82 say
**`closeAccessibilityLabel`**; matrix A82's own body text and U5.3's row both write **`closeLabel="Close map
filters"`**. Pick `closeAccessibilityLabel` (it is the one U4.2 makes *required* across five sheets) and fix
A82's prose, or U5.3 ships a prop that does not exist.

### 3.2 The existing primitive it must extend, not duplicate — `inputs/PickerSheet.tsx`

**verified, `7099e54`:**

| Part | Line | Value |
|---|---|---|
| `PICKER_SHEET_Z` | `:25` | `31` (exported — the modal-over-modal upper bound) |
| component | `:35` | `export function PickerSheet({ title, onClose, children, footer })` |
| Escape handler | `:38` | `if (e.key === 'Escape') onClose()` |
| scrim | `:48-49` | `onClick={onClose}`, `zIndex: PICKER_SHEET_Z`, `background: T.scrim` |
| panel | `:55-73` | `onClick={(e) => e.stopPropagation()}`, `zIndex: PICKER_SHEET_Z + 1`, `maxHeight: '92%'`, `animation: 'sheetUp 0.28s ease'` |
| ✕ | `:104` | `onClick={onClose}` |

**It already implements three of `GlassBottomSheet`'s four close routes** (backdrop, Escape, ✕) and the
portal, and it is the only sheet in the demo with `title` + `footer` + a scrim + a slide-up animation.
`grep -rn "GlassBottomSheet" features/demo` still returns **zero hits**, so U4.1 is building it —
but building it *beside* `PickerSheet` would make **four** sheet implementations, not one.

**Recommendation (inferred, the orchestrator decides):** U4.1 builds `GlassBottomSheet` by **generalising
`PickerSheet` in place** — add `visible`, `subtitle`, `closeAccessibilityLabel`, `maxHeightRatio`,
`fillHeight`, `showHandle`, `showAccentStrip` and the swipe-down route, re-export `PickerSheet` as a thin
preset, and keep `PICKER_SHEET_Z` exactly where it is (three tests pin it —
`UserProfilePane.test.tsx:306,315,316`, and D14 says the numbers must not move). That is the
"mutate the recipe, never the consumer" shape and it keeps the seven `inputs/` consumers untouched.
The alternative — a fresh component plus a later fold — is what the phone did in P5 and had to adjudicate.

### 3.3 The other two sheet grounds U4.1 folds

| Plan cite | At `7099e54` | Δ |
|---|---|---|
| `ExportActionSheet.tsx:161-179` | **`:162-180`** — `boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'` at `:172` | +1 |
| `MapBottomSheet.tsx:116-132` | **✓ untouched** — `borderTopLeftRadius: 20` `:124`, `boxShadow: '0 -8px 24px rgba(0,0,0,0.45)'` `:127` | ✓ |

---

## 4. U4.2 / U4.3 / U4.4 — corrected anchors

### 4.1 U4.2 — `ModalShell` + the Settings copy

| Plan cite | At `7099e54` | Δ |
|---|---|---|
| `_shared.tsx:64-184` (`ModalShell`) | **`:65-185`** — `export function ModalShell({` `:65`; scrim `:111`; sheet `:123` | +1 |
| `MODAL_SCRIM_Z` / `MODAL_SHEET_Z` | **`:46` / `:47`** (plan/inventory say `:45`/`:46`) | +1 |
| `settings/SettingsModal.tsx:64-96` | **`:65-97`** — scrim `:69`, `borderTopLeftRadius: 24` `:80` | +1 |

### 4.2 U4.3 — the centred dialog (item 4 in full)

**The three byte-identical panels** (`position:absolute · left/right 24 · top 50% · translateY(-50%) ·
borderRadius 16 · GLASS.borderSoft · GLASS.gradientPanel · boxShadow '0 24px 60px rgba(0,0,0,0.55)' ·
padding '20px 20px 16px' · animation 'screenIn 0.2s ease'`):

| Component | Plan / inventory cite | At `7099e54` | Anchors |
|---|---|---|---|
| `controls/AlertDialog.tsx` | `:130-186` (plan) / `:141-156` (demo §4) | **`:141-156`** ✓ untouched | scrim `:131`, `top:'50%'` `:144`, `translateY` `:145`, `boxShadow` `:150` |
| `screens/DeleteConfirmationModal.tsx` | `:93-206` (plan) / `:98-121` (demo §4) | **`:99-122`** | scrim `:97`, `top` `:110`, `translateY` `:111`, `boxShadow` `:116` (**+1**) |
| `screens/ExportModal.tsx` | `:79-361` (plan) / `:253-268` (demo §4) | **`:254-268`** | scrim `:83`, `top` `:257`, `translateY` `:258`, `boxShadow` `:263` (**+1 vs the inventory, untouched by U0**) |

**The focus machinery — three implementations, not two (C6):**

| File | Lines | Mechanism |
|---|---|---|
| `controls/AlertDialog.tsx` | `:31` (rationale), `:42-44` `FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]'`, `:60` `activationOrigin = target.closest<HTMLElement>(FOCUSABLE)` | Module-scope **capture-phase** singleton records the real activating element on pointerdown/keydown. Survives an opener that disables itself. |
| `screens/DeleteConfirmationModal.tsx` | `:76` Escape → `onCancel()`; `:83` `const opener = document.activeElement`; `:84` `dialogRef.current?.focus()`; `:86` restore | Reads `activeElement` **at mount** — the weaker path `AlertDialog:31` documents as broken. |
| `screens/ExportModal.tsx` | `:219` Escape gated on `!isExporting`; `:226-229` identical `activeElement` block | Same weaker path. |

**None of the three cycles Tab** (`grep` for `'Tab'` → zero hits in all three). They are focus **restore**
blocks. So U4.3's row wording — "two hand-rolled focus traps", "one focus trap, not three" — should read
**"three focus-restore blocks → one, on `AlertDialog`'s capture-phase mechanism"**, and if a real Tab trap
is wanted that is new behaviour needing a D20 line of its own.

`PickerSheet` and `ModalShell` have **zero** focus machinery (measured) — worth knowing before U4.1/U4.2
"preserve" something that is not there.

### 4.3 U4.4 — the scrim family (11 cited + 1 missing)

| Plan cite | At `7099e54` | Δ |
|---|---|---|
| `input-theme.ts:31` (`T.scrim`) | **`:39`** — `scrim: 'rgba(4,8,14,0.55)'` | **+8** |
| `AlertDialog.tsx:131` | **`:131`** ✓ (`zIndex: 60`, `rgba(4,8,14,0.66)`) | ✓ |
| `DeleteConfirmationModal.tsx:95` | **`:97`** | +2 |
| `ExportModal.tsx:80` | **`:83`** — `background: 'rgba(4,8,14,0.66)'` | +3 |
| `ExitDialog.tsx:47` | **`:47`** ✓ — `position:'fixed'`, `zIndex:100`, `rgba(4,8,14,0.72)` | ✓ |
| `ExportActionSheet.tsx:91` | **`:92`** | +1 |
| `SettingsModal.tsx:68` | **`:69`** | +1 |
| `WizardDrawer.tsx:308` | **`:308`** ✓ (`zIndex: 41`) | ✓ |
| `_shared.tsx:110` | **`:111`** (`data-modal-scrim`) | +1 |
| `BootSequence.tsx:37` | **`:37`** ✓ | ✓ |
| `CallConfirmSheet.tsx:15` | **`:15`** ✓ | ✓ |
| **missing from the row** | **`inputs/PickerSheet.tsx:49`** — paints `T.scrim` | **add (C10)** |
| `MediaLibrarySheet.tsx:336-404`, `PdfPreview.tsx` | not re-verified this pass (they are the two *exceptions* that must NOT follow scrim) | — |

Three distinct alphas confirmed live: `0.55` (7 sites incl. `T.scrim`), `0.66` (`AlertDialog:131`,
`DeleteConfirmationModal:97`, `ExportModal:83`), `0.72` (`ExitDialog:47`).

---

## 5. Residual open items

1. **Re-cut U2.2's A66 row into Groups A/B/C** (C1–C3) and rule on `#9fd4ee` — 12 occurrences, 5 files, unnamed in the matrix.
2. **`ImportModal.tsx:266` is unresolvable** — name which `role="status"` block U3.3 means (`:248`, `:258` or `:275`).
3. **U3.4 needs an italic keep-list**, not just a convert-list (C7): 20 sites, several carrying live data.
4. **Settle `closeAccessibilityLabel` vs `closeLabel`** before U4.1 and U5.3 are briefed (§3.1).
5. **Decide `GlassBottomSheet` = generalised `PickerSheet` vs a fourth implementation** (§3.2).
6. **U4.3's row wording** — three focus-*restore* blocks, and `AlertDialog`'s must be the survivor (C6).
7. **Add `DeleteConfirmationModal.tsx` to §6.1's hotspot table** (C9): U2.2 → U4.3 → U4.4, crossing a phase.
8. `CasesScreen`/`DashboardScreen` nested rows and the 92→64 header block were **not** re-verified here — ask if U3.4's brief needs them.
