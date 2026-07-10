# Demo Explorer — Architecture & Design

**Siblings:** `02-demo-explorer-implementation-plan.md` (the how) · `03-demo-explorer-test-spec.md` (the proof).

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-07-09 | Initial architecture (owner-approved direction, boot decision resolved: empty) |

## 1. Purpose

Convert the interactive demo from a two-mode experience (auto-played guided tour + free explore) into a single hands-on sandbox where the visitor does everything themselves, guided by an **exploration manifest**: a checklist beside the phone that lights up as screens/features are visited, with an exit dialog that surfaces what they haven't seen before they leave. A final pass restyles the page around the phone to the Case-File marketing surface (grid + top glow, no scan).

## 2. System Architecture

```
app/demo/page.tsx  (dynamic ssr:false — no more Suspense/useSearchParams)
        │
        ▼
┌────────────────────────────────────────────────────────────────────────┐
│ DemoExperience (ui/ — the ONLY store toucher; unchanged rule)          │
│                                                                        │
│  ┌──────────────┐   props/callbacks   ┌─────────────────────────────┐  │
│  │ PhoneFrame   │◀────────────────────│ StoryRail                   │  │
│  │  + screens   │                     │  eyebrow · narration · tips │  │
│  │  (UNTOUCHED) │                     │  "You're driving" card      │  │
│  └──────────────┘                     │  ┌───────────────────────┐  │  │
│         ▲                             │  │ ExploreChecklist  NEW │  │  │
│         │ setView / launch /          │  │ numbered · LED · jump │  │  │
│         │ openModal (visit choke pts) │  └───────────────────────┘  │  │
│         │                             └─────────────────────────────┘  │
│  ┌──────┴───────────────────────────┐  ┌────────────────────────────┐  │
│  │ engine/store (Zustand vanilla)   │  │ ExitDialog + BackToSite NEW│  │
│  │  + visited: Record<view, true>   │  │ unseen list · stay/leave   │  │
│  │  − mode/seedGuided/auth/isSeed   │  └────────────────────────────┘  │
│  └──────────────────────────────────┘                                  │
│  engine/content: CHAPTERS (ex-TOUR_CHAPTERS) · NARRATION · explore.ts  │
│  engine/director/ ──────────────── DELETED ─────────────────────────── │
└────────────────────────────────────────────────────────────────────────┘
        │
        ▼
ui/demo.css — [data-demo-root] backdrop: ink-900 base · 0.035 grid ·
::before glow (off-phone) · tuning knobs        (values duplicated from
the marketing tokens by convention — never imported across the boundary)
```

## 3. Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tour removal depth | **Delete** `engine/director/` (runner, beats, types) + all mode machinery — not disable | Dead-but-present code taxes every future change and test run; git history is the archive. *Rejected:* feature-flagging the tour — nobody asked for it back. |
| Boot state | **Empty** (`view: 'cases'`, no cases) — exactly today's free-explore | Owner decision: "the whole point is that it never fills itself." The AI import is the wow moment; marketing pages carry recorded videos for passive viewing. *Rejected:* seeded sample case — the guided tour *was* the seeded experience. |
| Chapters | **Survive**, renamed `TOUR_CHAPTERS` → `CHAPTERS` | Chapter order drives the in-phone wizard Next/Back and narration keying — it's the app's flow, not the tour. Owner will add chapters as screens land; the registry stays the single source of truth (array order = numbering, repo convention). |
| `currentChapter` | Survives unrenamed | Still load-bearing: `closeLaunch()` returns to it; narration follows it on non-chapter views (map/OCR). The doc comment is rewritten to drop tour language. |
| `auth`, `isSeed`, `DemoMode`, `SEED_CASE/SEED_LOCATION`, `GUIDED_NOW` | Removed | Each becomes a constant or unreachable once the director dies. Dead invariants mislead at 3am. `SAMPLE_REQUEST_DOC` survives — it is the live-import fallback (verified in `run-import.ts`). Retention clock becomes always-real. |
| Visited tracking | **In the store** (`visited: Record<string, true>`), written inside `setView`/`launch`/`openModal` | One choke point (only `DemoExperience` calls actions), pure-engine testable, survives re-renders, and modals (import) are trackable. Plain record over `Set` — serializable, structuredClone-safe. *Rejected:* component state (lost on remount, untestable in engine); localStorage (persistence not asked for — session-only v1). |
| Checklist registry | New `engine/content/explore.ts`: `ExploreItem { id, label, covers[], jumpTo }`, array order = numbering | **Extensibility is a requirement** (owner: "don't close the door on adding more as we iterate"). `covers[]` handles grouped screens (an item lights when ANY covered view/modal id is visited — easy to flip to ALL later); unbuilt screens just aren't listed yet. v1 list: dashboard, cases, AI import (modal), the 10 wizard screens, map — splash excluded (unreachable until the deferred splash-video entry). |
| Checklist UI | Numbered manifest pills + LED in the rail, replacing the progress dots | Visually rhymes with the marketing tab strip (same numbering language) — the "matches the main site" ask for free. Lit state uses the existing green-dot language from the wizard drawer. |
| Exit interception | In-app **Back to site** affordance + custom dialog listing unseen items. **No `beforeunload`** | The demo currently has no way back at all (real gap). `beforeunload` can't show custom text and punishes tab-closing — hostile on a marketing site. **Acceptable risk:** browser back/close bypasses the dialog; only the in-app path is controllable, and it's also the only path we create. All-seen → the link navigates directly, no dialog. |
| Backdrop home | `demo.css` targeting `[data-demo-root]` + `::before` glow, CSS custom-property knobs — inline styles stripped from the root div | Tunable design surface belongs in CSS with knobs (the proven scan-workflow); zero new DOM; mirrors the marketing wrapper+pseudo pattern. The inline-styles convention protects the *lifted phone chrome*, not the page surface. Values are duplicated, not imported (`@/features/demo` ↔ marketing boundary stays sealed). |
| Glow placement | Anchored top, centered over the **rail region** (box starting at the phone column's right edge) | Owner: grid + spotlight "just not over the phone." Adaptive to viewport width; one knob to slide. Requires `isolation: isolate` on the root + negative z on the pseudo (same stacking rule as marketing). |
| Scan | **Absent, by construction** | `/demo` sits outside `(default)` and inherits nothing; we add nothing. |

## 4. Data Flow

1. Visitor lands on `/demo` → store created once per mount → boots empty at `cases` (no URL params — `?mode`/`?step` are deleted; nothing links to them, verified).
2. Visitor drives the phone → every `setView`/`launch` records `visited[view]`; `openModal('import')` records `visited.import`.
3. `selectExploreStatus(state)` joins `EXPLORE_ITEMS × visited` → `{ id, number, label, visited }[]` → `ExploreChecklist` renders numbered rows; LED lit when any covered id is visited; row click → `onJump(item.jumpTo)` → `setView`.
4. Narration continues to follow `currentChapter` (map keeps its special-cased copy) — unchanged mechanism, now the only mode.
5. Visitor clicks **Back to site** → any unseen items? open `ExitDialog` (unseen list, "Keep exploring" primary, "Leave anyway" → `/`) : navigate directly.
6. Reload = fresh store = checklist resets (session-only by design).

## 5. Error Handling Strategy

- **Unknown ids:** `selectExploreStatus` tolerates registry ids with no visited entry (unlit) and visited ids not in any registry item (ignored) — the registry can lead or lag the screens safely while the owner iterates.
- **Zero-case map jump:** checklist can send a visitor to Map with no cases; `CaseMapPicker` already renders a "No cases yet" empty state — the plan adds a test that this state is escapable (not a trap).
- **Import fallback:** unchanged — live import falls back to the sample request with the existing notice.
- **Beat/degraded paths:** gone with the director; nothing replaces them (no auto-play = no degraded auto-play).

## 6. Rollout Plan

Four independently shippable slices, each a green-tree PR (details in the implementation plan): **1)** sandbox-only teardown → **2)** exploration manifest → **3)** exit dialog → **4)** Case-File backdrop. Polish lands last so it styles the final structure. No feature flags; each PR is the rollback unit.

## 7. Scope Boundaries (deferred, deliberate)

- **Splash-video entry** (owner: "we can do that after") — `splash` chapter + screen are kept but unreachable; boot stays at `cases` until then.
- **Media screens** (`mediaCapture`/`audioRecording`) — placeholders remain; they join `EXPLORE_ITEMS` when built.
- **Checklist persistence** across visits (localStorage) — session-only v1.
- **Deep links** (`?screen=`) — deleted with the tour; reintroduce only if marketing needs them.
- **Screen-resolution adaptation** — owner-parked; layout/proportions untouched in all four slices.
- **Completed-vs-visited shading** on checklist rows — v1 lights on visited; the wizard drawer already shows completion in-phone.

## 8. Dependencies

None new. Existing: Zustand (vanilla store), motion/react (drawer/dialog animation patterns already in the bundle), Vitest + RTL.

## 9. Open Questions

None — boot state (empty), "You're driving" card (keep), tips (promoted to always-on hints) were resolved with the owner before this document.
