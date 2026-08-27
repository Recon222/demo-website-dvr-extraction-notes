# DoD clause-12 light-flip scratch test — orchestrator evidence (def2aec + one-site flip)

Flip: palette.ts:261 'dark' -> 'light'. Plan §9 clause 12 predicted EXACTLY THREE objectors. Observed:

## tsc (cold) — exit 2
features/demo/ui/__tests__/palette-contrast.test.ts(816,5): error TS2367: This comparison appears to be unintentional because the types '"light"' and '"dark"' have no overlap.
features/demo/ui/controls/__tests__/sheet-chrome.test.tsx(259,18): error TS2367: This comparison appears to be unintentional because the types '"light"' and '"dark"' have no overlap.
features/demo/ui/controls/button-recipe.ts(181,13): error TS2367: This comparison appears to be unintentional because the types '"light"' and '"dark"' have no overlap.
features/demo/ui/controls/button-recipe.ts(186,13): error TS2367: This comparison appears to be unintentional because the types '"light"' and '"dark"' have no overlap.
features/demo/ui/controls/sheet-chrome.ts(227,14): error TS2367: This comparison appears to be unintentional because the types '"light"' and '"dark"' have no overlap.
features/demo/ui/controls/sheet-chrome.ts(242,15): error TS2367: This comparison appears to be unintentional because the types '"light"' and '"dark"' have no overlap.

## vitest — failing files
     12  FAIL  features/demo/ui/controls/__tests__/button-recipe.test.tsx
     10  FAIL  features/demo/ui/__tests__/glass-card-recipe.test.tsx
      8  FAIL  features/demo/ui/screens/__tests__/shared.test.tsx
      7  FAIL  features/demo/ui/controls/__tests__/sheet-chrome.test.tsx
      5  FAIL  features/demo/ui/__tests__/palette-contrast.test.ts
      4  FAIL  features/demo/ui/screens/import/__tests__/ImportTerminalProgress.test.tsx
      4  FAIL  features/demo/ui/screens/__tests__/MediaLibrarySheet.test.tsx
      2  FAIL  features/demo/ui/screens/map/__tests__/mapTokens.test.ts
      2  FAIL  features/demo/ui/screens/__tests__/AudioRecorderScreen.test.tsx
      2  FAIL  features/demo/ui/controls/__tests__/CentredDialog.test.tsx
      2  FAIL  features/demo/ui/__tests__/glass-tokens.test.ts
      1  FAIL  features/demo/ui/tokens/__tests__/palette.test.ts
      1  FAIL  features/demo/ui/screens/settings/__tests__/UserProfilePane.test.tsx
      1  FAIL  features/demo/ui/screens/map/__tests__/LocationRow.test.tsx
      1  FAIL  features/demo/ui/screens/map/__tests__/CaseMapPicker.test.tsx
      1  FAIL  features/demo/ui/screens/export/__tests__/export-selection-marks.test.tsx
      1  FAIL  features/demo/ui/screens/__tests__/NotesScreen.test.tsx
      1  FAIL  features/demo/ui/screens/__tests__/ModalShell.test.tsx
      1  FAIL  features/demo/ui/screens/__tests__/ExportModal.reduced-motion.test.tsx
      1  FAIL  features/demo/ui/screens/__tests__/ExportHub.test.tsx
      1  FAIL  features/demo/ui/screens/__tests__/DeleteConfirmationModal.test.tsx
      1  FAIL  features/demo/ui/inputs/__tests__/TimeWheel.test.tsx
      1  FAIL  features/demo/ui/inputs/__tests__/PickerSheet.test.tsx
      1  FAIL  features/demo/ui/inputs/__tests__/CoordinateDisplay.test.tsx
      1  FAIL  features/demo/ui/controls/__tests__/GlassBottomSheet.test.tsx
      1  FAIL  features/demo/ui/chrome/__tests__/overlay-header.test.tsx
      1  FAIL  features/demo/ui/__tests__/glass-well-recipe.test.tsx
      1  FAIL  features/demo/ui/__tests__/DemoExperience.sandbox.test.tsx

⎯⎯⎯⎯⎯⎯ Failed Tests 75 ⎯⎯⎯⎯⎯⎯⎯
 Test Files  28 failed | 282 passed (310)
      Tests  75 failed | 4251 passed | 2 todo (4328)
