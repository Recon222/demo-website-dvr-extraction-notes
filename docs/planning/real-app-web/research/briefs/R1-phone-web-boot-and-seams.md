# R1: phone app on the web: boot blockers and the native seam map

Read `00-shared-context.md` in this folder first.

## Questions
1. **Does the app build and boot for the web, and what blocks it?** Work in your own copy, never in PHONE:
   `git clone --local <PHONE> <your scratch folder>/phone` (no shared `node_modules`), `npm ci` there, then
   add the web dependencies Expo needs (`npx expo install react-dom react-native-web @expo/metro-runtime`,
   versions matched to the SDK) in the copy only. Check `app.config.js` web settings (output mode, bundler,
   `experiments.baseUrl` for serving under a sub-path). Run `npx expo export -p web` and record every failure.
   Where a native module blocks the build, stub it in your copy just enough to get past it and record what
   you stubbed. Aim to reach a served build that renders its first screen in headless Chromium (Playwright
   is fine, installed in your scratch folder); record the console errors. Stop once the blocker list is
   clear; do not polish. Note build time and bundle size.
2. **Seam map.** For every source file (not tests) in `src/` and `app/` that imports a native-only or
   device module (for example: expo-sqlite, expo-file-system, expo-secure-store, expo-sharing, expo-print,
   expo-camera, react-native-vision-camera, @react-native-ml-kit/text-recognition, react-native-udp,
   expo-local-authentication, expo-location, @rnmapbox/maps, @siteed/expo-audio-studio, expo-audio,
   react-native-zip-archive, expo-pdf-text-extract, expo-pdf-attach, expo-document-picker,
   react-native-webview, @shopify/react-native-skia, @supabase/supabase-js, @sentry/react-native,
   expo-haptics, expo-clipboard, @react-native-community/netinfo, AsyncStorage; find any others), give:
   file, what it uses the module for, whether the **installed version** of the module ships a working web
   implementation (check its `node_modules` folder for `.web.js` files / web entry, and its docs), and the
   proposed web treatment: works as-is / small `.web.ts` stand-in / lift from the demo's browser code /
   simulated and labelled / not available. Group by feature. Note the narrowest seam (the one function or
   module to replace) for each.
3. **App-level flows that need a web answer:** the biometric splash / app-lock boot gate, permissions
   prompts, the drawer/wizard navigation on a narrow phone-sized viewport, deep links, anything reading
   `Platform.OS` that would take a wrong branch on web (grep `Platform.OS`, `Platform.select`).

## Output
Write `R1-phone-web-boot-and-seams.md` in the parent folder (`../R1-phone-web-boot-and-seams.md` relative to
this brief). Sections: Boot result (what happened, exact errors, what was stubbed, size/time), Seam map
table, App-level flows, Risks and unknowns, Recommendations (with confidence).
