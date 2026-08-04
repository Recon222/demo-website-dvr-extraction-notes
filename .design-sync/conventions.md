# DVR Extraction Notes — interactive demo UI (web)

A component library that reproduces a law-enforcement CCTV/DVR evidence-recovery **mobile
app** as an on-screen phone, in real React web. These are the demo's presentational
components: an iPhone-sized wizard (submission → scope → time calibration → cameras →
export → notes → completion), plus its inputs, modals, and chrome. Build with these to
compose on-brand phone screens and flows.

## Setup — two rules that make components render correctly

1. **Wrap the phone viewport in `<div data-demo-root>`.** The global stylesheet scopes
   every rule (box-sizing, fonts, keyframes) to `[data-demo-root]`. Outside it, components
   render unstyled. Put it on the phone-screen container.
2. **No provider, no store.** Every component here is purely presentational — **data in via
   props, intent out via callbacks**. There is no context to wrap and nothing global to
   initialize. (The one store-bridge component, `DemoExperience`, is intentionally NOT in
   this library.) Screens are phone-width (~378px) and set their own height.

```jsx
<div data-demo-root style={{ width: 378, background: '#0d1b2a' }}>
  <SubmissionScreen occNumber="PR-2026-0114-2287" fields={fields}
    onChange={update} onNext={next} onBack={back} onMenu={openDrawer} onPickCoords={setCoords} />
</div>
```

## The styling idiom — inline styles + a fixed dark palette

This DS is **inline-styled — there are no CSS classes and no utility framework** (do not
reach for Tailwind here). Components carry their own styles; for your own layout glue
around them, inline-style with the **same palette**, which mirrors the native app exactly:

| Role | Value |
|---|---|
| Screen background | `#0d1b2a` (navy — never pure black) |
| Elevated surface | `#132236` / `#1a2d44` |
| Border / hairline | `#1e3a5f` |
| Primary (buttons, active) | `#2B8CC1`, gradient `#35A0D6 → #2580AD` |
| Text | `#f0f4f8` primary · `#99badd` Carolina-blue secondary · `#7a9fc4` muted |
| Status | success `#10d177` · error `#ff4757` · gold accent `#ffd93d` |
| Radius / touch target | 8–12px · **44px minimum** (WCAG floor the app holds to) |

**Fonts:** system sans for body; **`'Share Tech Mono'`** for scanner/OCR/biometric readouts
and timestamps, `'JetBrains Mono'` for terminal/technical text. Both load from the bundle.

The shared input palette also lives as a token object at
`features/demo/ui/inputs/input-theme.ts` (`T.bg`, `T.primary`, `T.text`, `T.textMute`…) —
read it when styling around the input components.

## Component catalog (all render from the bundle)

- **Inputs**: `Dropdown`, `PickerSheet` (bottom-sheet chrome), `Calendar`, `DateField`,
  `TimeField`, `DateTimeField`, `TimeWheel` (HH:MM:SS drum), `AddressAutocomplete`.
- **Wizard screens**: `SubmissionScreen`, `RequestedScopeScreen`, `ArrivalDepartureScreen`,
  `TimeOffsetScreen`, `ExtractedScopeScreen`, `DvrInfoScreen`, `CamerasScreen`,
  `ExportInfoScreen`, `NotesScreen`, `CompletionScreen`, `OcrCaptureScreen`, `SplashScreen`.
- **Cases/dashboard**: `CasesScreen`, `DashboardScreen`.
- **Modals** (bottom-sheet): `ModalShell`, `NewCaseModal`, `NewLocationModal`, `ImportModal`.
- **Chrome/controls**: `WizardDrawer`, `TabBar`, `ExitDialog`, `ExploreChecklist`,
  `SyncStatusCard`, `PdfPreview`, `TypewriterText`.

**Overlays** (`ModalShell`, `PickerSheet`, `PdfPreview`, `WizardDrawer`, dialogs) portal to
a phone-overlay host if present and otherwise render inline — so give the phone frame
`position: relative` and a height, and they anchor to it.

## Where the truth lives

Each component's exact prop contract is in its bound `<Name>.d.ts` — read it before use;
props are fully typed (domain shapes like `CameraEntry`, `SyncResult`, `CaseCard` are
expanded inline). Screens take a data object + callbacks; pass real callbacks, not no-ops,
in a live app. `features/demo/CLAUDE.md` (in guidelines) documents the demo's architecture.

## One idiomatic build snippet

```jsx
<div data-demo-root style={{ position: 'relative', width: 378, height: 812, background: '#0d1b2a', overflow: 'hidden' }}>
  <DashboardScreen cases={cases} onOpenLocation={openLocation} />
  <TabBar active="dashboard" onSelect={setTab} />        {/* bottom bar, absolute */}
</div>
```
