---
name: Case File
description: The evidence-dossier design system for DVR Extraction Notes — a dark, instrument-lit marketing site for a CCTV/DVR forensic-recovery iOS app.
colors:
  ink-950: "#03060b"
  ink-900: "#04070d"
  panel-800: "rgba(8, 16, 28, 0.55)"
  chip: "#1a2d44"
  hairline: "rgba(30, 58, 95, 0.55)"
  row-divider: "rgba(22, 40, 63, 0.6)"
  tab: "#16283f"
  input: "#2a4a6f"
  heading: "#f0f4f8"
  body: "#bcccde"
  body-2: "#a9bdd3"
  tab-label: "#cfe0f2"
  muted: "#7a9fc4"
  faint: "#5d7a9a"
  ghost: "#445e7d"
  carolina: "#99badd"
  blue: "#2b8cc1"
  cyan: "#4ecdc4"
  gold: "#ffd93d"
  gold-ink: "#241d00"
typography:
  display:
    fontFamily: "Nacelle, sans-serif"
    fontSize: "56px"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-1.5px"
  headline:
    fontFamily: "Nacelle, sans-serif"
    fontSize: "38px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.8px"
  title:
    fontFamily: "Nacelle, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "15.5px"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  label:
    fontFamily: "Share Tech Mono, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "2.4px"
  data:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  chip: "8px"
  control: "10px"
  card: "14px"
  panel: "16px"
  panel-lg: "20px"
  device: "58px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "20px"
  lg: "36px"
  gutter: "40px"
  gutter-lg: "80px"
  section-y: "72px"
  row-gap: "64px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.gold-ink}"
    rounded: "{rounded.control}"
    padding: "14px 24px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.gold-ink}"
  button-secondary:
    backgroundColor: "rgba(12, 23, 39, 0.6)"
    textColor: "{colors.carolina}"
    rounded: "{rounded.control}"
    padding: "14px 22px"
  button-secondary-hover:
    textColor: "#cfeeea"
  input-email:
    backgroundColor: "rgba(6, 12, 20, 0.8)"
    textColor: "{colors.heading}"
    rounded: "{rounded.control}"
    padding: "13px 16px"
    typography: "{typography.data}"
  chip-spec:
    backgroundColor: "{colors.chip}"
    textColor: "{colors.muted}"
    rounded: "{rounded.chip}"
    padding: "6px 12px"
    typography: "{typography.data}"
  tab-manifest:
    backgroundColor: "rgba(10, 20, 34, 0.7)"
    textColor: "{colors.tab-label}"
    rounded: "{rounded.chip}"
    padding: "7px 11px"
  tab-manifest-active:
    backgroundColor: "rgba(255, 217, 61, 0.1)"
    textColor: "#ffe786"
    rounded: "{rounded.chip}"
    padding: "7px 11px"
  card-panel:
    backgroundColor: "{colors.panel-800}"
    textColor: "{colors.body}"
    rounded: "{rounded.panel}"
    padding: "26px"
  tip-card-cyan:
    backgroundColor: "rgba(78, 205, 196, 0.06)"
    textColor: "#aecbc8"
    rounded: "{rounded.card}"
    padding: "18px 20px"
  tip-card-gold:
    backgroundColor: "rgba(255, 217, 61, 0.07)"
    textColor: "#e7d9a6"
    rounded: "{rounded.card}"
    padding: "18px 20px"
---

# Design System: Case File

## Overview

**Creative North Star: "The Case File"**

This is not a site *about* evidence work — it is filed like evidence work. The homepage's
feature catalog is a **feature manifest**: a table with `NO. / FEATURE / WHAT IT KILLS`
columns, one numbered row per feature. Feature pages open on a gold item line reading
`06 — TIME OFFSET` and caption their diagrams `FIG. 06-A`. The recruitment panel is tabbed
`EXHIBIT A — YOUR NEXT SCENE`. Numbering is never
typed by hand; it derives from array position in the catalog, so the file renumbers itself
when its contents change. A visitor who recovers footage for a living recognises the filing
system before they read a word of the pitch — and that recognition *is* the credibility
argument.

The filing is a claim about *order*, not about hierarchy. An earlier pass tagged every row
with a CORE / FIELD / TRUST / MARQUEE class chip and gave the flagship row its own gold
treatment; both were removed because the taxonomy was internal vocabulary a visitor had no
way to decode. What survives is the numbering, which is real.

The surface underneath is a dark room with instruments in it. The ground is near-black ink
(`#04070d`) carrying a faint blueprint grid at 46px, and a radar scan line travels down the
viewport every 14 seconds with the grid illuminating in a soft halo around it. Nothing on
the page casts a shadow; things *emit light* instead. A gold button pools warm light on the
page beneath itself. A cyan status dot blooms and blinks. The active tab glows. This is what
separates the system from the generic dark-SaaS look it superficially resembles: the depth
is lit, not stacked.

Typography does the technical register. Four families divide the labour strictly — Nacelle
states, Inter explains, Share Tech Mono labels, JetBrains Mono measures — and the discipline
is absolute enough that a stat in the wrong family reads as a bug. The tone is
practitioner-to-practitioner: dry, exact, no hype. The design's restraint carries the same
argument the copy does, which is that overclaiming would be the tell of someone who has not
done the job.

**Key Characteristics:**

- Dark by construction — every component draws on an ink ground and sets no background of its own
- Filed, not marketed — numbered items, class chips, exhibit tabs, figure captions
- Lit, not stacked — coloured glow and 1px hairlines instead of drop shadows
- Four strict type voices, one job each
- Warm gold used sparingly against an entirely cold palette
- Ambient motion (scan sweep, blinking dots, pulsing halos) that never blocks reading

## Colors

An entirely cold palette — ink, navy, steel blue, teal — with exactly one warm colour in the
whole system, spent deliberately.

### Primary

- **Evidence Gold** (`#ffd93d`): The one warm note. It marks the single next action (every
  CTA, gradient-filled `#ffe06a → #f5c62e` with near-black `#241d00` text), the active
  manifest tab, the manifest's FEATURE column, the `EXHIBIT` / `INTAKE` tabs, the tip card, and the
  logo's centre dot. Against a page with no other warmth it reads as heat, which is exactly
  the point.

### Secondary

- **Instrument Cyan** (`#4ecdc4`): Trust, liveness, and security. Corner-bracket framing and
  its label chips, the lock-icon tip card, TRUST class chips, live status dots
  (`0 0 9px` bloom), the radar scan line, the beta success confirmation, and input focus
  borders. Where gold says *act*, cyan says *this is verified and running*.
- **Field Blue** (`#2b8cc1`): Section eyebrows (`CHAIN OF WORK`, `FEATURE MANIFEST`, `UNDER
  THE HOOD`), row kickers, FIELD class chips, hover states on inactive tabs and manifest
  rows, and the ambient radial wash at the top of every marketing page. The system's
  workhorse accent — present far more often than gold, and quieter than cyan.

### Tertiary

- **Carolina** (`#99badd`): Not an accent so much as the system's link colour and its
  drafting ink. Every navigation link and footer link, the logo's crosshair at 50% opacity,
  and — at 3.5% opacity — the blueprint grid ruling the entire page background.

### Neutral

- **Ink** (`#04070d` page ground, `#03060b` deepest): Near-black with a blue cast, never
  pure black and never grey.
- **Panel** (`rgba(8,16,28,0.55)`): The translucent surface for tables, cards, and framed
  content — it lets the blueprint grid read faintly through, which is why it is translucent
  rather than solid.
- **Chip** (`#1a2d44`): The fill behind spec chips (`PDF`, `NTP`, `AES-256`).
- **Hairline** (`rgba(30,58,95,0.55)`) and **Row Divider** (`rgba(22,40,63,0.6)`): The 1px
  rules that do the work drop shadows do elsewhere.
- **Text ladder**, descending: **Heading** `#f0f4f8` (near-white, headings only) →
  **Tab Label** `#cfe0f2` → **Body** `#bcccde` → **Body-2** `#a9bdd3` (secondary paragraphs)
  → **Muted** `#7a9fc4` (chip text, captions) → **Faint** `#5d7a9a` (eyebrows, metadata) →
  **Ghost** `#445e7d` (the footer's trust label — the quietest text in the system).
- **Input Stroke** (`#2a4a6f`) and **Tab Stroke** (`#16283f`): Form and control borders.

### Named Rules

**The Gold Scarcity Rule.** Gold marks the one thing to *do*, and nothing else competes at
that weight. At most one gold call-to-action is visible in a viewport. Its rarity against an
entirely cold palette is the whole mechanism; spend it twice on a button and it stops
meaning anything.

The one sanctioned exception is the manifest's FEATURE column, where gold runs down every
row. It survives the rule on **weight, not colour**: those labels are 12.5px letterspaced
Share Tech Mono, so their ink coverage is a fraction of a button's or a heading's. Gold at
label weight is an accent; gold at heading weight is a claim. If a future use cannot say
which of the two it is, it is the wrong use.

**The Class Colour Rule.** Accents carry fixed meaning inherited from the manifest system:
**gold = core / flagship**, **blue = field**, **cyan = trust / security**. Choose the accent
that matches intent, never the one that looks better in the composition.

**The Cold Ground Rule.** Every component is built for a dark ground and sets no background
of its own; headings are near-white. Never place these components on a light surface. If a
lighter surface is genuinely needed, paint it on an inner subtree only — the body stays ink.

## Typography

**Display Font:** Nacelle (local `.woff2`, weights 400/600 + italics)
**Body Font:** Inter
**Label Font:** Share Tech Mono
**Data Font:** JetBrains Mono

**Character:** A geometric display face with tight negative tracking does the talking, plain
Inter does the explaining, and two distinct monospaces split the technical register between
*labels* and *numbers*. Most systems would use one mono for both; using two is what makes the
page read as instrumentation rather than as a developer landing page.

### Hierarchy

- **Display** (Nacelle 600, 52–56px, line-height 1.02, tracking −1.5px): Page H1 only — the
  hero (56px) and feature-page headlines (52px). Always ends in a period on feature pages; the period drops
  in card and nav contexts.
- **Headline** (Nacelle 600, 38px, tracking −0.8px): Section H2 — "From request to
  court-ready report", "Every feature kills a pain point".
- **Title** (Nacelle 600, 20–32px, tracking −0.5px to −0.6px): Feature-row headings (32px),
  trust-card headings (26px), callout headings (22px), step and card titles (20px).
- **Body** (Inter 400, 15.5–17.5px, line-height 1.65–1.7): Paragraphs, capped at 520–620px
  measure — roughly 65–75 characters. Intro paragraphs run 17px; row copy 15.5px; card copy
  14–15px.
- **Label** (Share Tech Mono 400, 9–11px, tracking 1.4–2.4px, ALWAYS uppercase): Section
  eyebrows, row kickers, class chips, corner-bracket labels, status lines, the footer trust
  strip. The tracking scales with the label's importance — 2.4px for section eyebrows, 1.4px
  for fine print.
- **Data** (JetBrains Mono, 10–22px): Every number and every machine-ish token — manifest
  item numbers, credential stats (22px bold), spec chips, figure numbers, timestamps, and
  the `→` arrows.

### The size ladder

**This system is not built on a modular scale.** Sizes are transcribed literally from the
design canvas, in half-pixel increments where the canvas used them, and the frontmatter
above records one representative size per role rather than a closed set. The sizes actually
in use, by band:

- **Labels (Share Tech Mono):** 8.5, 9, 9.5, 10, 10.5, 11 px
- **Data (JetBrains Mono):** 10, 11, 11.5, 12, 13, 13.5, 22 px
- **Body (Inter):** 12, 13, 13.5, 14, 14.5, 15, 15.5, 17, 17.5 px
- **Headings (Nacelle):** 16.5, 18, 20, 22, 26, 30, 32, 34, 38, 40, 52, 56, 62 px

Treat this as the palette, not as a prohibition on the values between them: a new surface
should reach for an existing step before inventing one, but the canvas is the authority. An
automated ramp check will flag most of this file's real sizes as off-scale; that is the
checker misreading a transcribed system as a generated one.

### Named Rules

**The Four Voices Rule.** Nacelle states it, Inter explains it, Share Tech Mono labels it,
JetBrains Mono measures it. A number never appears in Inter; a heading never appears in a
mono; a label is never sentence case. If you are unsure which family a string wants, ask what
the string *is* — a claim, an explanation, a label, or a measurement.

**The Canvas-Literal Rule.** Pixel values come from the design canvas, not from a formula.
Do not "tidy" 17.5px to 18px or 9.5px to 10px to satisfy a scale — the halves are deliberate
and the canvas is the source of truth.

**The Letterspaced Caps Rule.** Every Share Tech Mono string is uppercase and letterspaced
(1.4–2.4px). Lowercase Share Tech Mono does not exist in this system, and an un-tracked
all-caps label reads as a mistake.

## Layout

A single-column page at full bleed, gutters `40px` (`px-10`) rising to `80px` at `lg`. There
is no centred max-width container — sections span the viewport and constrain their *text*
instead (520–640px measures), which is what keeps a wide screen feeling like a spread rather
than a column.

Sections stack with a `1px` top hairline (`rgba(30,58,95,0.45)`) and breathe on `64px` top /
`72px` bottom padding. Each opens the same way: a Share Tech Mono eyebrow, a Nacelle H2, and
— pushed to the far right on `md`+ and hidden below it — a JetBrains Mono metadata line
(`9 ITEMS · TAP ANY ROW`, `NO DATES · NO PROMISES`, `ONE GUIDED PASS · NO LOOSE ENDS`). That
right-hand line is the system's signature layout beat: it makes each section read as a filed
record with a header.

Feature-page content rows alternate sides (`lg:flex-row` / `lg:flex-row-reverse` on odd
index), each pairing a bracketed phone at `0.62` scale against copy, separated by `72px` at
`lg` and stacked with `64px` gaps. The hero uses the same pattern at `0.78` scale. Below
`lg` everything collapses to a single stacked column; below `md` the metadata lines and
decorative icons drop out entirely rather than wrapping.

Grids are explicit and few: the chain of work is 4-up at `lg` and 2-up at `md`; the roadmap
and trust cards are 3-up and 2-up at `md`. The feature manifest is a fixed 4-column grid
(`70px 230px 1fr 46px`) shared by its header row and every data row, which is what makes
the columns actually line up as a table.

### Named Rules

**The Derived Number Rule.** Every item number, step number, and figure number is computed
from array position (`String(index + 1).padStart(2, '0')`) — never typed. Reordering the
feature catalog renumbers the manifest, the tab strip, the breadcrumbs, the figure captions,
and prev/next together. Hand-typing a number breaks that guarantee silently.

**The Right-Hand Record Rule.** Section headers carry a JetBrains Mono metadata line on the
far right at `md`+. It is a caption on the section-as-record, always terse, always
uppercase-ish, and always the first thing to disappear on small screens.

## Elevation & Depth

**This system does not cast shadows. It emits light.** Surfaces never lift off the page;
separation comes from `1px` hairline borders, translucent tonal layering
(`ink-950 → ink-900 → panel-800 → chip`), and subtle 135° gradients across card fills
(`rgba(19,34,54,0.6) → rgba(26,45,68,0.65)`). Where another system would reach for a grey
drop shadow, this one reaches for a coloured halo — which is why the page reads as lit
equipment in a dark room rather than as paper on a light table.

There is exactly **one** true drop shadow in the entire system, and it belongs to the phone
frame, because the phone is the one element meant to read as a physical object sitting on a
desk.

### Shadow Vocabulary

- **CTA halo** (`0 8px 24px -10px rgba(255,217,61,0.5)`, hero variant
  `0 14px 34px -12px rgba(255,217,61,0.55)`): Warm light pooling on the page under a gold
  button. Always paired with a `0 1px 0 rgba(255,255,255,0.35) inset` top highlight that
  gives the gradient fill its slight convexity.
- **Status bloom** (`0 0 9px rgba(78,205,196,0.9)` cyan, `0 0 10px rgba(255,217,61,0.7)`
  gold): Zero-offset halo on a small dot. Signals *live*.
- **Active glow** (`0 0 14px -4px rgba(255,217,61,0.4)`): The gold-lit active manifest tab.
- **Scan line** (`0 0 18px` + `0 0 48px` cyan, stacked): Two halos on a 2px core, softened
  for a full-viewport sweep.
- **Ambient wash** (`radial-gradient(550px 260px at 50% 0%, rgba(43,140,193,0.16),
  transparent 70%)`): Not a shadow — a fixed blue light source at the top of every marketing
  page, shining down across the header and tab strip. The beta page swaps it for the gold
  variant at `0.10`.
- **Device shadow** (`0 60px 100px -34px rgba(0,0,0,0.85)`) — *the sole exception*, on
  `MarketingPhoneFrame` only.

### Named Rules

**The Emitted Light Rule.** Depth is added with light the surface gives off, never with
shadow it blocks. Coloured, near-zero-offset `box-shadow` in a palette accent is sanctioned;
black or grey drop shadow is not, and neither is `translateY` card-lift on hover. If a new
element needs to feel closer to the viewer, brighten its border or give it a halo.

**The Hairline Rule.** One-pixel borders do the structural work: `hairline` between
sections and around panels, `row-divider` between table rows, `tab` and `input` on controls.
A container without a border and without a hairline is not a container.

## Shapes

Rectilinear and softly cornered — nothing in the system is circular except status dots, and
nothing is sharp-cornered except hairlines and the scan line.

The radius ladder tracks the size of the thing: **chips and tabs 8px**, **controls
(buttons, inputs) 10–11px**, **cards 14px**, **panels and tables 16px**, **the large
recruitment panels 20px**, and **the device 58px outer / 46px screen**. Corners get rounder
as surfaces get larger, which keeps a 24px chip and a 900px panel reading as the same family.

Two recurring silhouettes define the form language beyond radius:

**The corner bracket.** Four 20×20 cyan L-brackets at the corners of a framed region, with a
centred Share Tech Mono label chip notched into the top edge (its ink background punching
through the border line). This is the system's viewfinder — it marks a region as *presented
evidence*, and it wraps every phone recording on the site.

**The notched tab.** A coloured tab hanging off the top-left edge of a large panel
(`absolute -top-px left-11`, bottom-rounded `8px`), carrying an uppercase label in ink-dark
text on solid gold or cyan: `EXHIBIT A — YOUR NEXT SCENE`, `INTAKE FORM — 60 SECONDS`,
`LINK ACTIVE`. The roadmap uses the same shape on the right edge for its `ROADMAP · NOT IN
BETA` stamps.

One more texture carries state: **dashed borders** (`rgba(93,122,154,0.45)`) mark anything not
yet real — roadmap cards, pending diagrams, the prev/next cards at the manifest's edges.

A second, **45° hatching**, filled draft copy blocks so scaffolding could not be mistaken for
finished copy. It was removed with the rest of the draft machinery and no longer appears
anywhere; see The Honest Placeholder Rule below for what that costs.

### Named Rules

**The Corner Bracket Rule.** Anything presented as evidence — a screen recording, a captured
value, an exhibit — gets the four cyan brackets and a label chip. Nothing else does. The
brackets are a claim about what the content *is*, not decoration.

**The Honest Placeholder Rule.** Unfinished *structure* announces itself: a dashed border
means *not built* — roadmap cards, a diagram that has not been produced, the edges of the
manifest.

Unfinished **copy** no longer does. The hatched blocks and the gold `DRAFT` stamp were
removed (owner decision) once every page's copy was slated for a rewrite, which made a
"this one is a draft" distinction meaningless. The live cost: the Notes feature page renders
scaffolding as though it were finished prose, and nothing on screen says otherwise. That is
a deliberate, temporary state — not a licence to ship placeholder copy quietly. If unfinished
copy ever needs marking again, mark it; do not let this rule's absence become permission.

## Components

### Buttons

- **Shape:** Softly cornered (`10px` header / `11px` hero / `13px` the large TestFlight
  button).
- **Primary:** Vertical gold gradient (`#ffe06a → #f5c62e`) with near-black `#241d00` label
  text at `font-bold`, an inset white top highlight, and the CTA halo beneath. Padding
  `10px 18px` in the header, `14px 24px` in the hero, `18px 38px` for the TestFlight button.
  A JetBrains Mono `->` often rides at the end.
- **Hover:** The gradient brightens (`#ffe786 → #ffd93d`); nothing moves, nothing lifts.
- **Secondary:** `1px` input-stroke border on `rgba(12,23,39,0.6)`, Carolina label,
  semibold. Hover shifts the border to cyan and the text to `#cfeeea`.
- **Disabled:** `opacity: 0.6`, no other change.

### Chips

Two distinct chips, and mixing them is a category error:

- **Spec chip** — JetBrains Mono `11px` muted on solid `chip` fill, `8px` radius,
  `6px 12px`. Lists capabilities: `PDF`, `NTP`, `AES-256`, `MULTI-SAMPLE GPS`.
- **Eyebrow pill** — `20px` radius on `cyan/5` with a `cyan/30` border and a blinking dot,
  holding a letterspaced credential line.

A third — the **class chip** (CORE / FIELD / TRUST / MARQUEE on a tinted accent fill) — is
**retired from the UI entirely**: from the manifest table with the CLASS column, and from
the feature-page item line with the rest of the breadcrumb. `classLabel` remains in the
feature catalog as metadata but nothing renders it. Do not reintroduce it without a reason
a visitor would understand.

### Cards / Containers

- **Corner style:** `16px` for panels and tables; `18px` for trust cards; `14px` for tips.
- **Background:** Translucent — `panel-800` for tables, or a 135° gradient
  (`rgba(19,34,54,0.6) → rgba(26,45,68,0.65)`) for cards. The grid must stay faintly visible
  through them.
- **Border:** Always present, always `1px` — `hairline` for neutral containers, an accent at
  `30–40%` opacity when the card carries meaning (tip cards, trust cards, recruitment panels).
- **Shadow:** None. See Elevation & Depth.
- **Internal padding:** `26–36px` for cards; `52px` for the large recruitment panels.

### Inputs / Fields

- **Style:** `1px` input-stroke (`#2a4a6f`) on near-opaque `rgba(6,12,20,0.8)`, `10px`
  radius, `13px 16px` padding, **JetBrains Mono** value text — an email address is treated as
  data, not prose. Placeholders in `faint`.
- **Focus:** Border shifts to cyan; the default outline is removed and nothing else changes.
- **Error:** A `12px` muted-rose (`#e7a1a1`) message under the field, announced via
  `aria-live="polite"`.
- **Success:** The form is replaced by a cyan-bordered confirmation panel with a blooming
  cyan dot.
- **Consent checkbox:** `15px`, gold-checked, on the same dark fill.

### Navigation

Two tiers, both in the marketing chrome:

- **Header** — logo mark and stacked wordmark (Nacelle `16.5px` over a Share Tech Mono
  `CCTV RECOVERY · DOCUMENTED` at `2.4px` tracking) on the left; four Carolina text links at
  `30px` spacing plus the gold CTA on the right. Links hover to `heading` white.
- **Manifest tab strip** — one numbered tab per feature in catalog order, wrapping freely.
  Resting: `tab` border on `rgba(10,20,34,0.7)`, cyan JetBrains Mono number, `tab-label`
  text. Hover: blue border and a `blue/10` wash. Active: `gold/55` border, `gold/10` fill,
  the active glow, gold number, and `#ffe786` semibold label, with `aria-current="page"`.
  This is the only client component in the entire marketing chrome, and it exists solely for
  this active state.

### Signature Components

**The Feature Manifest table.** The homepage's feature catalog rendered as a filed table —
a `70px 230px 1fr 46px` grid with a `NO. / FEATURE / WHAT IT KILLS` header row on
`rgba(10,20,34,0.8)`, then one linked row per feature. Rows hover to `blue/7%`.

The FEATURE cell carries the feature's **nav label in gold letterspaced Share Tech Mono**,
never its page title — the title is a headline that should land for the first time on the
feature page, and the nav label is what the visitor already knows the feature as from the
tab strip. It is the table's only colour, and the reason the rows scan as an index.

**Every row is identical.** The table previously singled out the flagship feature with a
gold tint, gold number, gold arrow, brighter pain-line text, and a 3px inset gold left edge,
and tagged every row with a CLASS chip. All of it was removed: the taxonomy meant nothing to
a visitor, and once the column went there was nothing left to explain why one row looked
different. A draft item is marked only by its pain line going italic muted.

**The bracketed phone.** `MarketingPhoneFrame` — a 404×812 device (13px bezel, `58px` outer
radius) with a 378×786 screen at `46px` radius on `#0d1b2a`, its own 40px blueprint grid
inside, wrapped in corner brackets with a `REC 01 — …` label. Rendered at fixed scale (0.78
hero, 0.62 rows) inside a ceil'd footprint box so layout never depends on the transform. It
deliberately draws **no** screen chrome — no fake status bar, no dynamic island — because the
real recordings carry their own.

**The ambient background.** A fixed 46px blueprint grid at `3.5%` Carolina, plus a masked
34vh band sweeping down the viewport every 14s carrying a brighter `12%` grid and a 2px cyan
radar line. The band's inner grid counter-translates by the exact negation of the sweep, so
the lit grid stays pinned to the viewport and its lines land precisely on the resting grid.
Both animations are pure composited transforms — nothing repaints during the sweep. All
tuning lives in four custom properties (`--scan-duration`, `--scan-band-h`,
`--scan-lit-alpha`, `--scan-line-alpha`).

## Do's and Don'ts

### Do:

- **Do** build every surface for the ink ground. Components set no background of their own
  and their headings are near-white.
- **Do** reach for the accent that matches intent — **gold = core/flagship**,
  **blue = field**, **cyan = trust/security** — and use the token utilities
  (`text-cyan`, `border-gold/55`, `bg-chip`) rather than writing hex values inline.
- **Do** add depth with coloured light: a halo, a brighter border, a tonal step up the
  `ink-950 → ink-900 → panel-800 → chip` ladder.
- **Do** put every number and machine token in JetBrains Mono, and every label in
  uppercase letterspaced Share Tech Mono.
- **Do** derive item, step, and figure numbers from array position.
- **Do** give framed evidence the four cyan corner brackets and a label chip.
- **Do** mark unfinished structure honestly with a dashed border — a roadmap card, a
  diagram not yet produced. (Unfinished *copy* is no longer marked; see The Honest
  Placeholder Rule.)
- **Do** keep body measures at 520–640px even though sections run full bleed.
- **Do** gate new class-based animation behind the existing
  `@media (prefers-reduced-motion: reduce)` block in `app/css/style.css`.

### Don't:

- **Don't** add a black or grey drop shadow, and don't lift cards on hover with
  `translateY`. The phone frame is the only object in this system that casts a shadow.
- **Don't** spend gold twice in one viewport, or use it for anything that isn't the next
  action or the flagship item.
- **Don't** place these components on a light surface, and don't introduce a light theme —
  the ground is dark by construction.
- **Don't** use the leftover template styles: `.form-input` / `.btn` in
  `app/css/additional-styles/utility-patterns.css` are Cruip-era `gray-700` / `indigo-500`
  and belong to no part of this system, and the root `app/layout.tsx` body still carries
  `bg-gray-950 text-gray-200` which the `(default)` layout overrides with `bg-ink-900`.
  Neither is Case File.
- **Don't** import anything from `@/features/demo` into marketing code — that barrel pulls
  `mapbox-gl`, `pdfjs-dist`, and `motion` into marketing bundles. Duplicate the few pixel
  constants instead, as `MarketingPhoneFrame` deliberately does.
- **Don't** restyle the demo's lifted inline styles or "tidy" the phone's pixel maths — the
  404 = 378 + 13×2 arithmetic is load-bearing.
- **Don't** render feature diagrams through `next/image`; the catalog ships SVGs the
  optimiser won't serve without `dangerouslyAllowSVG`.
- **Don't** hand-type a manifest number, a step number, or a figure number.
- **Don't** let Share Tech Mono appear in sentence case or without letterspacing.
