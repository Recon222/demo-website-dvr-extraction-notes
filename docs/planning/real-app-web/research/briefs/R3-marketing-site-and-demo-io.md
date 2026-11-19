# R3: the marketing site, hosting, and the demo's reusable browser code

Read `00-shared-context.md` in this folder first.

## Questions
1. **Where the real app goes.** How `/demo` mounts today (`app/demo/`), the marketing site's phone frame
   (`components/marketing/phone-frame.tsx` and anything else that shows a phone), and where an iframe of the
   real app would sit. What marketing pages link to or embed the demo.
2. **Hosting a static Expo web build on the same origin.** How the site is built and deployed (look for
   Vercel config, `next.config.*`, headers, output mode, CI workflows). Options for serving a separately built
   static app on the same origin: copied into `public/app/`, a rewrite to another deployment, or a subdomain.
   For each: build-pipeline impact (two repos), cache and size limits, service-worker scope, whether
   cross-origin isolation headers could be set for that path only, and effect on the marketing pages.
3. **The AI import proxy.** `app/api/extract/*`: request/response contract, guards, env vars. Compare with
   the phone's AI provider seam in the PHONE repo (`src/features/import/pdf-import/`, its README and the
   provider interface): can the phone app's web build call this route as is, what adapter is needed, and how
   origin checks behave for a same-origin iframe.
4. **Reusable browser I/O in the demo.** For each module the substitutes inventory lists as a ready web answer
   (GPS loop, camera/microphone/media capture, audio meter, OCR with Tesseract and its self-hosted assets in
   `public/ocr/`, pdf.js text extraction, forward/reverse geocode and address autocomplete, Mapbox map canvas,
   clipboard, print-to-PDF, file download): its file(s), public interface, dependencies, tests, and the PHONE
   seam it would replace (read the phone counterpart and compare signatures). Say how much adaptation each
   needs to satisfy the phone's interface (drop-in / adapter / rewrite) and whether it depends on
   demo-only state or the demo's store.
5. **Demo-only features.** StoryRail narration and the explore checklist (`engine/content/explore.ts`,
   `narration.ts`): what app events they listen to, and whether they could run outside an iframe from
   messages posted by the app. The demo's error/"start fresh" handling.
6. **What retiring the hand-built demo removes.** Folders, test counts, dependencies that would become unused
   in the marketing site, assets to move, and docs/CLAUDE.md sections that would need changing.

## Output
Write `R3-marketing-site-and-demo-io.md` in the parent folder. Sections: Embedding, Hosting options, AI proxy
fit, Reusable I/O table, Demo-only features, Retirement inventory, Risks and unknowns, Recommendations (with
confidence).
