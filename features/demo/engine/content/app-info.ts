/**
 * What the demo says about the app it mirrors — the two literals its chrome renders.
 *
 * The phone reads both from `Constants.expoConfig` (`app.config.js:10-11`); the demo is a
 * separate deployable with no Expo config to ask, so it pins the same values. Extracted here
 * (P7.1) because the About pane became a second reader: `WizardDrawer`'s footer had owned a
 * private `APP_VERSION` since P4.2, and a second private copy is how the two drift.
 *
 * `DEMO_VERSION_LINE` is the demo's own version chrome — P4.2's precedent, whose reasoning
 * still holds: the version is the APP's, and this is its demo rather than a build of it, so a
 * bare "v1.0.0" in a browser tab would claim something untrue.
 */

/**
 * The app's name. Renamed to `DVREN` at DP-3 by owner ruling — the app itself is being renamed,
 * so this single constant moves and every reader (the drawer footer, the About pane's title and
 * copyright, the support mailto's subject) follows it. Was `'DVR Extraction Notes'`, which is
 * still what the phone's `app.config.js:10` reads until the phone rename lands.
 */
export const APP_NAME = 'DVREN'

/** Phone `app.config.js:11` (`version`). */
export const APP_VERSION = '1.0.0'

/** The demo's version chrome (drawer footer + the About pane's version line). */
export const DEMO_VERSION_LINE = `Interactive demo · v${APP_VERSION}`

/**
 * Where a support request from the DEMO goes.
 *
 * NOT the phone's `fvadd.dev@gmail.com` (`AboutSection.tsx:29`): that is the address for
 * people running the app, and this is a marketing-site visitor. The site already publishes
 * this one on `/privacy` (`lib/site-config.ts` `contactEmail`), so it is the honest
 * destination — and a `mailto:` is one of the few things in this pane a browser does for
 * real, so it is wired for real rather than stubbed.
 *
 * Held here rather than imported from `lib/site-config.ts` on purpose: `features/demo/`
 * imports nothing from the marketing half of the repo today, and one constant is a cheaper
 * price than the first edge in that direction. Pinned against the site config by test, so
 * the copy cannot drift silently.
 */
export const SUPPORT_EMAIL = 'kcfva.dev@gmail.com'
