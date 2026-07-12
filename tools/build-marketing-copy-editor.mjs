// Build the single-file marketing copy editor (tools/marketing-copy-editor.html).
//
//   node tools/build-marketing-copy-editor.mjs
//
// Reads the REAL site source for the structured copy (byte-perfect, no transcription):
//   • lib/content/features.ts        → the 10 feature pages (~171 fields)
//   • lib/site-config.ts             → site metadata + nav + cta
//   • the section `const` arrays in the home/beta/privacy components + footer
// …and merges a small hand-authored manifest for the ~30 inline JSX strings (H1s,
// eyebrows, headings) that don't live in a const. Emits ONE sidebar HTML whose COPY
// tree is path-tagged, so an exported markdown maps straight back to source.
//
// ROUND-TRIP: edit in the browser → Export markdown → apply to source → re-run this
// script (refreshes the structured parts) and update INLINE[] for any inline string
// that changed. The editor's "Copy editor data" button also re-baselines in place.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(ROOT, p), 'utf8')

// ── extract a top-level `const <name> = <literal>` from a .ts/.tsx source ──────
// The values are pure data (strings/arrays/objects); type annotations and `as const`
// are stripped, and JSX after the literal is ignored by brace/bracket matching.
function extractConst(src, name) {
  const decl = new RegExp(`(?:export\\s+)?const\\s+${name}\\b[^=]*=`).exec(src)
  if (!decl) throw new Error(`const ${name} not found`)
  let i = decl.index + decl[0].length
  while (i < src.length && /\s/.test(src[i])) i++
  const first = src[i]
  // bare string const (e.g. hero SUB): scan to the matching unescaped quote
  if (first === '"' || first === "'" || first === '`') {
    let j = i + 1
    for (; j < src.length; j++) if (src[j] === first && src[j - 1] !== '\\') break
    // eslint-disable-next-line no-eval
    return eval(`(${src.slice(i, j + 1)})`)
  }
  const open = first
  const close = open === '[' ? ']' : '}'
  let depth = 0, end = -1, inStr = null
  for (let j = i; j < src.length; j++) {
    const c = src[j], prev = src[j - 1]
    if (inStr) { if (c === inStr && prev !== '\\') inStr = null; continue }
    // skip comments (string-aware: a `//` inside a real string never reaches here) —
    // otherwise an apostrophe in a comment ("design's") opens a phantom string.
    if (c === '/' && src[j + 1] === '/') { const nl = src.indexOf('\n', j); j = nl === -1 ? src.length : nl; continue }
    if (c === '/' && src[j + 1] === '*') { const e = src.indexOf('*/', j + 2); j = e === -1 ? src.length : e + 1; continue }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue }
    if (c === open) depth++
    else if (c === close) { depth--; if (depth === 0) { end = j; break } }
  }
  if (end === -1) throw new Error(`extractConst(${name}): '${open}' never closed`)
  const literal = src.slice(i, end + 1).replace(/\bas const\b/g, '')
  // eslint-disable-next-line no-eval
  return eval(`(${literal})`)
}

// ── load structured source ─────────────────────────────────────────────────────
const featuresSrc = read('lib/content/features.ts')
const features = extractConst(featuresSrc, 'features')
const siteConfig = extractConst(read('lib/site-config.ts'), 'siteConfig')

const heroSrc = read('components/home/hero.tsx')
const HERO_SUB = extractConst(heroSrc, 'SUB')
const CRED_CELLS = extractConst(heroSrc, 'CRED_CELLS')
const CHAIN_STEPS = extractConst(read('components/home/chain-of-work.tsx'), 'STEPS')
const ROADMAP_CARDS = extractConst(read('components/home/roadmap-tease.tsx'), 'CARDS')
const NEXT_STEPS = extractConst(read('components/beta/beta-next-steps.tsx'), 'STEPS')
const privacySrc = read('app/(default)/privacy/page.tsx')
const LEDGER_ROWS = extractConst(privacySrc, 'LEDGER_ROWS')
const PERMISSIONS = extractConst(privacySrc, 'PERMISSIONS')
const PRIVACY_SECTIONS = extractConst(privacySrc, 'SECTIONS')
const FOOTER_LINKS = extractConst(read('components/ui/footer.tsx'), 'FOOTER_LINKS')

// ── inline JSX strings (the ~30 that don't live in a const) ──────────────────────
// path = where it lives in source (file:anchor) so an exported edit is unambiguous.
const INLINE = [
  // home / hero
  { path: 'home.hero.credChip', label: 'Credential chip', value: 'BUILT ON THE BENCH — 15 YEARS · 1,500+ EXTRACTIONS' },
  { path: 'home.hero.ctaPrimary', label: 'Primary CTA button', value: 'Join the TestFlight beta' },
  { path: 'home.hero.ctaSecondary', label: 'Secondary CTA button', value: 'Drive the live demo' },
  { path: 'home.hero.phoneLabel', label: 'Phone frame label', value: 'LIVE CAPTURE · 378×786' },
  // home / chain of work
  { path: 'home.chain.eyebrow', label: 'Eyebrow', value: 'CHAIN OF WORK' },
  { path: 'home.chain.heading', label: 'Heading', value: 'From request to court-ready report', multiline: true },
  { path: 'home.chain.aside', label: 'Aside', value: 'ONE GUIDED PASS · NO LOOSE ENDS' },
  // home / evidence manifest
  { path: 'home.manifest.eyebrow', label: 'Eyebrow', value: 'EVIDENCE MANIFEST' },
  { path: 'home.manifest.heading', label: 'Heading', value: 'Every feature kills a pain point', multiline: true },
  { path: 'home.manifest.aside', label: 'Aside (n ITEMS …)', value: 'ITEMS · TAP ANY ROW' },
  // home / roadmap
  { path: 'home.roadmap.eyebrow', label: 'Eyebrow', value: 'SEALED — OPENS AFTER THE BETA' },
  { path: 'home.roadmap.heading', label: 'Heading', value: 'Where this is headed' },
  { path: 'home.roadmap.aside', label: 'Aside', value: 'NO DATES · NO PROMISES' },
  { path: 'home.roadmap.intro', label: 'Intro', value: 'The beta is the analyst app, complete. These are the pieces being built around it — teased here because people ask, sealed because they’re not done.', multiline: true },
  // home / beta CTA
  { path: 'home.betacta.tab', label: 'Tab', value: 'EXHIBIT A — YOUR NEXT SCENE' },
  { path: 'home.betacta.heading', label: 'Heading', value: 'Be first to run it in the field' },
  { path: 'home.betacta.body', label: 'Body', value: 'iOS beta via TestFlight. Leave your email — you’ll get the invite the moment a build clears review. No case data ever touches our servers; we only ever hold your address.', multiline: true },
  { path: 'home.betacta.trust', label: 'Trust line', value: 'IOS 26+ · TESTFLIGHT · UNSUBSCRIBE ANYTIME' },
  // beta page — header
  { path: 'beta.header.chip', label: 'Chip', value: 'MANIFEST / BETA ACCESS' },
  { path: 'beta.header.h1', label: 'H1', value: 'Be first in the field.' },
  { path: 'beta.header.sub', label: 'Sub', value: 'The beta is the full analyst app, on your phone, via TestFlight. Leave your email now — the invite ships the moment a build clears Apple’s beta review.', multiline: true },
  // beta page — phase A
  { path: 'beta.phaseA.tab', label: 'Phase A tab', value: 'INTAKE FORM — 60 SECONDS' },
  { path: 'beta.phaseA.h2', label: 'Phase A heading', value: 'Get on the invite list' },
  { path: 'beta.phaseA.body', label: 'Phase A body', value: 'One field. No account, no vendor onboarding call. When the build is approved you get a TestFlight link — until then, silence.', multiline: true },
  { path: 'beta.phaseA.trust', label: 'Phase A trust', value: 'WE KEEP YOUR ADDRESS AND NOTHING ELSE — CASE DATA NEVER TOUCHES OUR SERVERS' },
  { path: 'beta.phaseA.status', label: 'Phase A status', value: 'STATUS: AWAITING FIRST BUILD — BETA APP REVIEW PENDING' },
  // beta page — phase B
  { path: 'beta.phaseB.tab', label: 'Phase B tab', value: 'LINK ACTIVE' },
  { path: 'beta.phaseB.status', label: 'Phase B status', value: 'BUILD APPROVED FOR EXTERNAL TESTING' },
  { path: 'beta.phaseB.button', label: 'Phase B button', value: 'Join the TestFlight beta' },
  { path: 'beta.phaseB.reqs', label: 'Phase B requirements', value: 'REQUIRES IOS 26+ AND THE TESTFLIGHT APP · SEATS ARE CAPPED BY APPLE AT 10,000 — NOT A MARKETING LINE', multiline: true },
  { path: 'beta.phaseB.altLink', label: 'Phase B alt link', value: 'or email me about updates instead' },
  { path: 'beta.phaseB.secondaryH2', label: 'Secondary heading', value: 'Get update emails instead' },
  { path: 'beta.next.eyebrow', label: 'What-happens-next eyebrow', value: 'WHAT HAPPENS NEXT' },
  // privacy — header + labels
  { path: 'privacy.header.chip', label: 'Header chip', value: 'FVA DEVELOPMENT / PRIVACY POLICY' },
  { path: 'privacy.header.badge', label: 'Header badge', value: 'ADAPTED FROM APP POLICY — LEGAL SIGN-OFF PENDING' },
  { path: 'privacy.header.h1', label: 'H1', value: 'On your device, under your control.' },
  { path: 'privacy.header.intro', label: 'Intro (** = bold)', value: 'This app documents evidence. That only works if the tool itself is beyond question — so the architecture is blunt: **your case data lives in an encrypted database on your phone and stays there.** Below is the complete list of what ever touches a network.', multiline: true },
  { path: 'privacy.ledger.eyebrow', label: 'Ledger eyebrow', value: 'THE COMPLETE NETWORK LEDGER' },
  { path: 'privacy.ledger.goldRowWhat', label: 'Ledger gold row — what', value: 'Everything else' },
  { path: 'privacy.ledger.goldRowContains', label: 'Ledger gold row — contains', value: 'Cases, locations, media, documents, reports, the AI’s reading of your requests', multiline: true },
  { path: 'privacy.permissions.intro', label: 'Permissions intro', value: 'Each permission maps to one visible feature — nothing runs in the background:', multiline: true },
  { path: 'privacy.contact.body', label: 'Contact line', value: 'Questions about any of this:' },
  // global / footer
  { path: 'global.footer.trust', label: 'Footer trust line', value: 'ON-DEVICE · NTP-CALIBRATED · ENCRYPTED' },
]
const inline = (p) => {
  const hit = INLINE.find((x) => x.path === p)
  if (!hit) throw new Error(`inline string not registered: ${p}`)
  return { id: p, label: hit.label, path: p, value: hit.value, multiline: !!hit.multiline }
}

// ── field helpers ────────────────────────────────────────────────────────────
const F = (path, label, value, multiline = false) =>
  value == null || value === '' ? null : { id: path, label, path, value: String(value), multiline }
const clean = (fields) => fields.filter(Boolean)

// ── build the COPY tree (pages → sections → fields) ──────────────────────────
const featureSection = (f) =>
  ({
    id: f.slug,
    label: `${f.navLabel}${f.draft ? '  · DRAFT' : ''}`,
    fields: clean([
      F(`features.${f.slug}.navLabel`, 'Nav label', f.navLabel),
      F(`features.${f.slug}.eyebrow`, 'Eyebrow', f.eyebrow),
      F(`features.${f.slug}.title`, 'Title (card / prev-next)', f.title),
      F(`features.${f.slug}.headline`, 'Headline (page H1)', f.headline),
      F(`features.${f.slug}.painLine`, 'Pain line (WHAT IT KILLS)', f.painLine, true),
      F(`features.${f.slug}.intro`, 'Intro (** = bold)', f.intro, true),
      f.tip && F(`features.${f.slug}.tip.body`, `Tip card (${f.tip.variant})`, f.tip.body, true),
      ...f.rows.flatMap((r, i) => clean([
        F(`features.${f.slug}.rows.${i}.kicker`, `Row ${i + 1} — kicker`, r.kicker),
        F(`features.${f.slug}.rows.${i}.heading`, `Row ${i + 1} — heading`, r.heading),
        F(`features.${f.slug}.rows.${i}.body`, `Row ${i + 1} — body`, r.body, true),
        F(`features.${f.slug}.rows.${i}.recLabel`, `Row ${i + 1} — REC label`, r.recLabel),
      ])),
      f.diagram && F(`features.${f.slug}.diagram.heading`, 'Diagram heading', f.diagram.heading),
      f.diagram && F(`features.${f.slug}.diagram.caption`, 'Diagram caption', f.diagram.caption, true),
      F(`features.${f.slug}.betaStripLine`, 'Beta strip line', f.betaStripLine),
      f.draft && F(`features.${f.slug}.draftNote`, 'Draft banner note', f.draftNote, true),
    ]),
  })

const COPY = {
  title: 'DVR Extraction Notes — Marketing Copy',
  pages: [
    {
      id: 'global', label: 'Global', sections: [
        {
          id: 'site', label: 'Site & metadata', fields: clean([
            F('site-config.tagline', 'Tagline (hero H1 + <title>)', siteConfig.tagline, true),
            F('site-config.description', 'Meta description', siteConfig.description, true),
            F('site-config.cta.label', 'CTA button label', siteConfig.cta.label),
            ...siteConfig.nav.map((n, i) => F(`site-config.nav.${i}.label`, `Nav link ${i + 1}`, n.label)),
          ]),
        },
        {
          id: 'footer', label: 'Footer', fields: clean([
            inline('global.footer.trust'),
            ...FOOTER_LINKS.map((l, i) => F(`footer.links.${i}.label`, `Footer link ${i + 1}`, l.label)),
          ]),
        },
      ],
    },
    {
      id: 'home', label: 'Home', sections: [
        {
          id: 'hero', label: 'Hero', fields: clean([
            inline('home.hero.credChip'),
            F('home.hero.h1', 'H1 (= site tagline)', siteConfig.tagline, true),
            F('home.hero.sub', 'Sub-paragraph', HERO_SUB, true),
            inline('home.hero.ctaPrimary'), inline('home.hero.ctaSecondary'),
            ...CRED_CELLS.flatMap((c, i) => [
              F(`home.hero.cred.${i}.value`, `Credential ${i + 1} — value`, c.value),
              F(`home.hero.cred.${i}.label`, `Credential ${i + 1} — label`, c.label),
            ]),
            inline('home.hero.phoneLabel'),
          ]),
        },
        {
          id: 'chain', label: 'Chain of Work', fields: clean([
            inline('home.chain.eyebrow'), inline('home.chain.heading'), inline('home.chain.aside'),
            ...CHAIN_STEPS.flatMap((s, i) => [
              F(`home.chain.steps.${i}.title`, `Step ${i + 1} — title`, s.title),
              F(`home.chain.steps.${i}.body`, `Step ${i + 1} — body`, s.body, true),
            ]),
          ]),
        },
        { id: 'manifest', label: 'Evidence Manifest', fields: clean([inline('home.manifest.eyebrow'), inline('home.manifest.heading'), inline('home.manifest.aside')]) },
        {
          id: 'roadmap', label: 'Roadmap', fields: clean([
            inline('home.roadmap.eyebrow'), inline('home.roadmap.heading'), inline('home.roadmap.aside'), inline('home.roadmap.intro'),
            ...ROADMAP_CARDS.flatMap((c, i) => [
              F(`home.roadmap.cards.${i}.title`, `Card ${i + 1} — title`, c.title),
              F(`home.roadmap.cards.${i}.body`, `Card ${i + 1} — body`, c.body, true),
            ]),
          ]),
        },
        { id: 'betacta', label: 'Beta CTA', fields: clean([inline('home.betacta.tab'), inline('home.betacta.heading'), inline('home.betacta.body'), inline('home.betacta.trust')]) },
      ],
    },
    { id: 'features', label: 'Features', sections: features.map(featureSection) },
    {
      id: 'beta', label: 'Beta', sections: [
        { id: 'header', label: 'Header', fields: clean([inline('beta.header.chip'), inline('beta.header.h1'), inline('beta.header.sub')]) },
        { id: 'phaseA', label: 'Phase A (intake)', fields: clean([inline('beta.phaseA.tab'), inline('beta.phaseA.h2'), inline('beta.phaseA.body'), inline('beta.phaseA.trust'), inline('beta.phaseA.status')]) },
        { id: 'phaseB', label: 'Phase B (live link)', fields: clean([inline('beta.phaseB.tab'), inline('beta.phaseB.status'), inline('beta.phaseB.button'), inline('beta.phaseB.reqs'), inline('beta.phaseB.altLink'), inline('beta.phaseB.secondaryH2')]) },
        {
          id: 'next', label: "What's Next", fields: clean([
            inline('beta.next.eyebrow'),
            ...NEXT_STEPS.flatMap((s, i) => [
              F(`beta.next.${i}.kicker`, `Step ${i + 1} — kicker`, s.kicker),
              F(`beta.next.${i}.title`, `Step ${i + 1} — title`, s.title),
              F(`beta.next.${i}.body`, `Step ${i + 1} — body`, s.body, true),
            ]),
          ]),
        },
      ],
    },
    {
      id: 'privacy', label: 'Privacy', sections: [
        { id: 'header', label: 'Header', fields: clean([inline('privacy.header.chip'), inline('privacy.header.badge'), inline('privacy.header.h1'), inline('privacy.header.intro')]) },
        {
          id: 'ledger', label: 'Network Ledger', fields: clean([
            inline('privacy.ledger.eyebrow'),
            ...LEDGER_ROWS.flatMap((r, i) => [
              F(`privacy.ledger.${i}.what`, `Row ${i + 1} — what`, r.what),
              F(`privacy.ledger.${i}.when`, `Row ${i + 1} — when`, r.when, true),
              F(`privacy.ledger.${i}.contains`, `Row ${i + 1} — contains`, r.contains, true),
            ]),
            inline('privacy.ledger.goldRowWhat'), inline('privacy.ledger.goldRowContains'),
          ]),
        },
        {
          id: 'sections', label: 'Policy Sections', fields: clean(
            PRIVACY_SECTIONS.flatMap((s, i) => [
              F(`privacy.sections.${i}.title`, `Section ${i + 1} — title`, s.title),
              s.body && F(`privacy.sections.${i}.body`, `Section ${i + 1} — body`, s.body, true),
            ]),
          ),
        },
        {
          id: 'permissions', label: 'Permissions', fields: clean([
            inline('privacy.permissions.intro'),
            ...PERMISSIONS.flatMap((p, i) => [
              F(`privacy.permissions.${i}.key`, `Permission ${i + 1} — key`, p.key),
              F(`privacy.permissions.${i}.use`, `Permission ${i + 1} — use`, p.use, true),
            ]),
            inline('privacy.contact.body'),
          ]),
        },
      ],
    },
  ],
}

// ── stats + emit ────────────────────────────────────────────────────────────
const fieldCount = COPY.pages.reduce((n, p) => n + p.sections.reduce((m, s) => m + s.fields.length, 0), 0)
const template = read('tools/marketing-copy-editor.template.html')
const html = template.replace('/*__COPY_JSON__*/', () => JSON.stringify(COPY))
mkdirSync(join(ROOT, 'tools'), { recursive: true })
writeFileSync(join(ROOT, 'tools', 'marketing-copy-editor.html'), html)
console.log(`built tools/marketing-copy-editor.html · ${COPY.pages.length} pages · ${fieldCount} fields`)
