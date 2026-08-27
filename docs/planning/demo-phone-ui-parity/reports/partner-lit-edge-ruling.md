# Partner ruling — the lit-edge composition rule (W1 F14 vs U4.1 T1)

**Seat:** `dt-partner` (Fable) · **Date:** 2026-08-27 · **Measured against:** `feat/uiparity-w1` @ `044578a` (includes `3c1eac3`), `uiparity/u4.sheet` @ `cf195e6` · **Environments:** jsdom 29.1.1 under the repo's vitest (inline `element.style`, the way every demo pin reads) AND real Chromium 148.0.7778.96 via Playwright 1.60 with react-dom **19.2.3** (the repo's exact version, dev build) reading `getComputedStyle`. **40 form x consumer cells, 3 paints each (expanded -> collapsed -> expanded). The two environments agree on every OK/FAIL flag.**

## 1. Ruling

**Fragment shape (the ONE shape):** longhands only, no border shorthand of any kind —

```ts
// glassCard / glassCardNested / sheetSurface alike. NO `border`, NO `borderColor`.
borderStyle: 'solid', borderWidth: 1, /* sheet: borderTopWidth: 2, */
borderRightColor: <tint>, borderBottomColor: <tint>, borderLeftColor: <tint>,
borderTopColor: <highlightTop>,
```

**Consumer rule (the ONE rule):** after spreading a fragment, a consumer may write only the colour **longhands** (`borderRightColor` / `borderBottomColor` / `borderLeftColor`, and `borderTopColor` only when the edge itself is meant to change). **Never `border`, `borderColor`, or `borderTop` after a spread** — no fragment shape survives them on every paint, in either environment.

**Why this shape and not the seats':** under the longhand rule every shape survives every paint (measured). The shape is chosen for what happens when the rule is *broken*: the longhand-only fragment is the **only** one of the five measured with **no first-paint-OK / update-FAIL trap**. Every violation fails on the FIRST paint, where the demo's ~95 pins live, and the one conditional pattern a consumer will actually write (adding the three side longhands only while `expanded`) **self-heals** on collapse instead of wiping the sides to `currentColor`.

## 2. Both seats measured correctly and both generalised wrongly

- **Claim A as relayed** ("the fragment emits only side longhands + `borderTopColor`, never `borderColor`") is **not what `3c1eac3` shipped.** `glassCard` at `044578a:192-197` is `{ borderRadius, border: GLASS.borderSoft, borderTopColor, background, boxShadow }` — a `border` **shorthand** then the edge (keys measured from the live module: `borderRadius,border,borderTopColor,background,boxShadow`). The seat's *consumer* rule (three side longhands) is right and is the rule adopted here. Its *fragment* still carries a shorthand slot, and that slot is a trap: `{ ...glassCard, border: '1px solid X' }` keeps the edge on first paint (the override collapses into slot 0, ahead of `borderTopColor`) and loses it on the next update (`rgb(2, 2, 2)`, React warns). Same class of bug as the one it refuted in the sheet.
- **Claim B (sheet, `sheet-chrome.ts@cf195e6:20-40`)** is true **for the first paint only.** `{ ...sheetSurface, borderColor: X }` keeps the edge at paint 1 (`borderColor` holds slot 3, `borderTopColor` slot 4 — measured `rgb(200,200,200)`) and loses it the moment `X` changes: paint 2 top = `rgb(2, 2, 2)`, paint 3 = `rgb(1, 1, 1)`, in jsdom and Chromium alike, with React's own `Updating a style property during rerender (borderColor) when a conflicting property is set (borderTopColor)` warning on both. React writes only the keys whose value changed (`setValueForStyles`), so the unchanged `borderTopColor` is skipped while the changed four-side shorthand is written — exactly the mechanism Claim A measured. **The sheet's update test (`sheet-chrome.test.tsx:129-136`) toggles `opacity`, not `borderColor`, so its suite never exercised the failing cell**; the pin at `:123-126` pins the trap, which is why "mutating into form A is KILLED by its suite" — the suite asserts first-paint behaviour of a form that is broken on update.
- **Both seats' "it survives" cells and "it fails" cells reproduce exactly.** The disagreement was never about React; each seat measured a different paint.

## 3. The hazards, per shape (from the full matrix in Appendix A)

| Shape | `{...f, borderColor:X}` | `{...f, border:...}` | conditional `borderColor` (present -> absent) | conditional side longhands (present -> absent) | side longhands always present |
|---|---|---|---|---|---|
| **A2 longhands-only (RULED)** | FAIL p1,p2,p3 (loud) | FAIL p1 (loud) | FAIL p1 (loud) | **OK — sides self-heal to the tint** | OK |
| A_card `border` + `borderTopColor` (W1 @044578a) | FAIL p1 | **OK p1, FAIL p2 (trap)** | FAIL p1; p2 ALL sides -> currentColor | top OK; **sides -> currentColor on collapse** | OK |
| B_sheet `borderColor` + `borderTopColor` (U4.1 @cf195e6) | **OK p1, FAIL p2 (trap)** | FAIL p1 | **OK p1, FAIL p2 (trap)** | top OK; **sides -> currentColor on collapse** | OK |
| A_sheet `border` + `borderTop: 2px` | FAIL p1 | **OK p1, FAIL p2 (trap)** | FAIL p1; p2 ALL sides -> currentColor | top OK; **sides -> currentColor on collapse** | OK |
| C single four-value `borderColor` | FAIL p1 | FAIL p1 | FAIL p1 (p2 self-heals) | top OK; **sides -> currentColor on collapse** | OK |

`currentColor` in Chromium read as `rgb(229, 231, 235)` (the page's text colour); in jsdom the inline longhand reads `""` — the same defect, different fallback. React's dev warning (`conflicting property`) fired in **every** update-clobber cell and in **no** cell that stayed correct under the ruled rule (the sole benign hit is B + a four-value `borderColor` override, a pairing nobody will write).

## 4. What this means for the two branches (options — the orchestrator decides)

1. **W1 `glassCard` / `glassCardNested`** (`glass-tokens.ts:192-197, 232-238`): replace `border: GLASS.borderSoft` with `borderStyle/borderWidth` + the three side longhands. The docblock's rule text (`:25-41`, `:176-181`) already prescribes the consumer form; only the "`borderTopColor` must come AFTER `border`" sentence changes to "no shorthand key exists in the fragment". Pins in `glass-card-recipe.test.tsx` that read `el.style.borderTopColor` keep passing (measured: the longhand-only form reads `rgb(200,200,200)` inline); add one negative control for `{ ...glassCard, border: ... }` now failing on **first** paint. `GLASS.borderSoft` stays as a token for non-fragment sites.
2. **U4.1 `sheetSurface`** (`sheet-chrome.ts:97-107`): delete the `borderColor` key; spell `sheet.border` on the three side longhands; keep `borderTopWidth: 2` + `borderTopColor`. Delete docblock option 3's claim (`:34-37`, false on update) and the pin at `sheet-chrome.test.tsx:123-126` (it pins the trap); replace with the longhand re-tint pinned across an update that actually toggles the tint. The `:146-147` key-order assertion becomes meaningless and goes.
3. **Guard (recommended, cheap):** (a) in `vitest.setup.ts`, turn React's own detector into a tripwire — fail the test on any `console.error` matching `/conflicting property/` (it fired in 100% of the measured update-clobber cells); (b) a static check in the existing `glass-tokens.test.ts` scan: no `border:` / `borderColor:` / `borderTop:` key in any object literal that spreads a fragment. (a) catches what tests exercise; (b) catches the rest.
4. **Not recommended:** form C (single four-value `borderColor`). It survives under the rule, but it is off the published recipe (A31 reads as `border-top-color`), opaque to the drift guard's anchor form, and still has the conditional-longhand trap.

Confidence: **high** — every cell is measured in both environments with zero disagreement. The one thing that would change the ruling: a React release that rewrites unchanged style keys on update (the W1 seat's negative controls in `glass-card-recipe.test.tsx` are the tripwire for that).

---

## Appendix A — the full matrix

Legend: `OK` = the top edge read the highlight (`rgb(200,200,200)`); `XX` = it did not; the value shown is what `border-top-color` read; `Wn` = n React `conflicting property` console errors during that paint. Paints: p1 = first render with X1 `rgb(1,1,1)`; p2 = update to X2 `rgb(2,2,2)`; p3 = update back to X1. Tint T = `rgb(10,10,10)`. Variants: `spreadColor` = `{...f, borderColor: X}`; `sides` = three side longhands; `quad` = `borderColor: 'HI X X X'`; `border` = `{...f, border: '1px solid X'}`; `borderTop` = `{...f, borderTop: '1px solid X'}` (the consumer deliberately recolours the top — shown for completeness); `removeKey` = `borderColor: X1` -> absent -> `borderColor: X1`; `removeSides` = side longhands present -> absent -> present (`L=` shows `border-left-color`).

### Chromium 148 + react-dom 19.2.3 (computed style)

| form | variant | p1 | p2 | p3 |
|---|---|---|---|---|
| A_card_border_then_top | plain | OK rgb(200, 200, 200) | — | — |
| A_card_border_then_top | spreadColor | XX rgb(1, 1, 1) | XX rgb(2, 2, 2) | XX rgb(1, 1, 1) |
| A_card_border_then_top | sides | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) |
| A_card_border_then_top | quad | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) |
| A_card_border_then_top | border | OK rgb(200, 200, 200) | XX rgb(2, 2, 2) W1 | XX rgb(1, 1, 1) W1 |
| A_card_border_then_top | borderTop | XX rgb(1, 1, 1) | XX rgb(2, 2, 2) | XX rgb(1, 1, 1) |
| A_card_border_then_top | removeKey | XX rgb(1, 1, 1) | XX rgb(229, 231, 235) W2 | XX rgb(1, 1, 1) |
| A_card_border_then_top | removeSides | OK rgb(200, 200, 200) L=rgb(1, 1, 1) | OK rgb(200, 200, 200) W3 L=rgb(229, 231, 235) | OK rgb(200, 200, 200) L=rgb(1, 1, 1) |
| A2_longhands_only | plain | OK rgb(200, 200, 200) | — | — |
| A2_longhands_only | spreadColor | XX rgb(1, 1, 1) | XX rgb(2, 2, 2) | XX rgb(1, 1, 1) |
| A2_longhands_only | sides | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) |
| A2_longhands_only | quad | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) |
| A2_longhands_only | border | XX rgb(1, 1, 1) | XX rgb(2, 2, 2) | XX rgb(1, 1, 1) |
| A2_longhands_only | borderTop | XX rgb(1, 1, 1) | XX rgb(2, 2, 2) | XX rgb(1, 1, 1) |
| A2_longhands_only | removeKey | XX rgb(1, 1, 1) | XX rgb(229, 231, 235) W4 | XX rgb(1, 1, 1) |
| A2_longhands_only | removeSides | OK rgb(200, 200, 200) L=rgb(1, 1, 1) | OK rgb(200, 200, 200) L=rgb(10, 10, 10) | OK rgb(200, 200, 200) L=rgb(1, 1, 1) |
| B_sheet_color_then_top | plain | OK rgb(200, 200, 200) | — | — |
| B_sheet_color_then_top | spreadColor | OK rgb(200, 200, 200) | XX rgb(2, 2, 2) W1 | XX rgb(1, 1, 1) W1 |
| B_sheet_color_then_top | sides | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) |
| B_sheet_color_then_top | quad | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) W1 | OK rgb(200, 200, 200) W1 |
| B_sheet_color_then_top | border | XX rgb(1, 1, 1) | XX rgb(2, 2, 2) | XX rgb(1, 1, 1) |
| B_sheet_color_then_top | borderTop | XX rgb(1, 1, 1) | XX rgb(2, 2, 2) | XX rgb(1, 1, 1) |
| B_sheet_color_then_top | removeKey | OK rgb(200, 200, 200) | XX rgb(10, 10, 10) W1 | XX rgb(1, 1, 1) W1 |
| B_sheet_color_then_top | removeSides | OK rgb(200, 200, 200) L=rgb(1, 1, 1) | OK rgb(200, 200, 200) W3 L=rgb(229, 231, 235) | OK rgb(200, 200, 200) L=rgb(1, 1, 1) |
| A_sheet_border_then_borderTop | plain | OK rgb(200, 200, 200) | — | — |
| A_sheet_border_then_borderTop | spreadColor | XX rgb(1, 1, 1) | XX rgb(2, 2, 2) | XX rgb(1, 1, 1) |
| A_sheet_border_then_borderTop | sides | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) |
| A_sheet_border_then_borderTop | quad | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) |
| A_sheet_border_then_borderTop | border | OK rgb(200, 200, 200) | XX rgb(2, 2, 2) W1 | XX rgb(1, 1, 1) W1 |
| A_sheet_border_then_borderTop | borderTop | XX rgb(1, 1, 1) | XX rgb(2, 2, 2) | XX rgb(1, 1, 1) |
| A_sheet_border_then_borderTop | removeKey | XX rgb(1, 1, 1) | XX rgb(229, 231, 235) W2 | XX rgb(1, 1, 1) |
| A_sheet_border_then_borderTop | removeSides | OK rgb(200, 200, 200) L=rgb(1, 1, 1) | OK rgb(200, 200, 200) W3 L=rgb(229, 231, 235) | OK rgb(200, 200, 200) L=rgb(1, 1, 1) |
| C_quad_single_key | plain | OK rgb(200, 200, 200) | — | — |
| C_quad_single_key | spreadColor | XX rgb(1, 1, 1) | XX rgb(2, 2, 2) | XX rgb(1, 1, 1) |
| C_quad_single_key | sides | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) |
| C_quad_single_key | quad | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) |
| C_quad_single_key | border | XX rgb(1, 1, 1) | XX rgb(2, 2, 2) | XX rgb(1, 1, 1) |
| C_quad_single_key | borderTop | XX rgb(1, 1, 1) | XX rgb(2, 2, 2) | XX rgb(1, 1, 1) |
| C_quad_single_key | removeKey | XX rgb(1, 1, 1) | OK rgb(200, 200, 200) | XX rgb(1, 1, 1) |
| C_quad_single_key | removeSides | OK rgb(200, 200, 200) L=rgb(1, 1, 1) | OK rgb(200, 200, 200) W3 L=rgb(229, 231, 235) | OK rgb(200, 200, 200) L=rgb(1, 1, 1) |

### jsdom 29.1.1 + react-dom 19.2.3 (inline element.style, as the demo pins read)

| form | variant | p1 | p2 | p3 |
|---|---|---|---|---|
| A_card_border_then_top | plain | OK rgb(200, 200, 200) | — | — |
| A_card_border_then_top | spreadColor | XX rgb(1, 1, 1) | XX rgb(2, 2, 2) | XX rgb(1, 1, 1) |
| A_card_border_then_top | sides | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) |
| A_card_border_then_top | quad | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) |
| A_card_border_then_top | border | OK rgb(200, 200, 200) | XX rgb(2, 2, 2) W1 | XX rgb(1, 1, 1) W1 |
| A_card_border_then_top | borderTop | XX rgb(1, 1, 1) | XX rgb(2, 2, 2) | XX rgb(1, 1, 1) |
| A_card_border_then_top | removeKey | XX rgb(1, 1, 1) | XX "" W2 | XX rgb(1, 1, 1) |
| A_card_border_then_top | removeSides | OK rgb(200, 200, 200) L="rgb(1, 1, 1)" | OK rgb(200, 200, 200) W3 L="" | OK rgb(200, 200, 200) L="rgb(1, 1, 1)" |
| A2_longhands_only | plain | OK rgb(200, 200, 200) | — | — |
| A2_longhands_only | spreadColor | XX rgb(1, 1, 1) | XX rgb(2, 2, 2) | XX rgb(1, 1, 1) |
| A2_longhands_only | sides | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) |
| A2_longhands_only | quad | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) |
| A2_longhands_only | border | XX rgb(1, 1, 1) | XX rgb(2, 2, 2) | XX rgb(1, 1, 1) |
| A2_longhands_only | borderTop | XX rgb(1, 1, 1) | XX rgb(2, 2, 2) | XX rgb(1, 1, 1) |
| A2_longhands_only | removeKey | XX rgb(1, 1, 1) | XX "" W4 | XX rgb(1, 1, 1) |
| A2_longhands_only | removeSides | OK rgb(200, 200, 200) L="rgb(1, 1, 1)" | OK rgb(200, 200, 200) L="rgb(10, 10, 10)" | OK rgb(200, 200, 200) L="rgb(1, 1, 1)" |
| B_sheet_color_then_top | plain | OK rgb(200, 200, 200) | — | — |
| B_sheet_color_then_top | spreadColor | OK rgb(200, 200, 200) | XX rgb(2, 2, 2) W1 | XX rgb(1, 1, 1) W1 |
| B_sheet_color_then_top | sides | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) |
| B_sheet_color_then_top | quad | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) W1 | OK rgb(200, 200, 200) W1 |
| B_sheet_color_then_top | border | XX rgb(1, 1, 1) | XX rgb(2, 2, 2) | XX rgb(1, 1, 1) |
| B_sheet_color_then_top | borderTop | XX rgb(1, 1, 1) | XX rgb(2, 2, 2) | XX rgb(1, 1, 1) |
| B_sheet_color_then_top | removeKey | OK rgb(200, 200, 200) | XX rgb(10, 10, 10) W1 | XX rgb(1, 1, 1) W1 |
| B_sheet_color_then_top | removeSides | OK rgb(200, 200, 200) L="rgb(1, 1, 1)" | OK rgb(200, 200, 200) W3 L="" | OK rgb(200, 200, 200) L="rgb(1, 1, 1)" |
| A_sheet_border_then_borderTop | plain | OK rgb(200, 200, 200) | — | — |
| A_sheet_border_then_borderTop | spreadColor | XX rgb(1, 1, 1) | XX rgb(2, 2, 2) | XX rgb(1, 1, 1) |
| A_sheet_border_then_borderTop | sides | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) |
| A_sheet_border_then_borderTop | quad | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) |
| A_sheet_border_then_borderTop | border | OK rgb(200, 200, 200) | XX rgb(2, 2, 2) W1 | XX rgb(1, 1, 1) W1 |
| A_sheet_border_then_borderTop | borderTop | XX rgb(1, 1, 1) | XX rgb(2, 2, 2) | XX rgb(1, 1, 1) |
| A_sheet_border_then_borderTop | removeKey | XX rgb(1, 1, 1) | XX "" W2 | XX rgb(1, 1, 1) |
| A_sheet_border_then_borderTop | removeSides | OK rgb(200, 200, 200) L="rgb(1, 1, 1)" | OK rgb(200, 200, 200) W3 L="" | OK rgb(200, 200, 200) L="rgb(1, 1, 1)" |
| C_quad_single_key | plain | OK rgb(200, 200, 200) | — | — |
| C_quad_single_key | spreadColor | XX rgb(1, 1, 1) | XX rgb(2, 2, 2) | XX rgb(1, 1, 1) |
| C_quad_single_key | sides | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) |
| C_quad_single_key | quad | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) | OK rgb(200, 200, 200) |
| C_quad_single_key | border | XX rgb(1, 1, 1) | XX rgb(2, 2, 2) | XX rgb(1, 1, 1) |
| C_quad_single_key | borderTop | XX rgb(1, 1, 1) | XX rgb(2, 2, 2) | XX rgb(1, 1, 1) |
| C_quad_single_key | removeKey | XX rgb(1, 1, 1) | OK rgb(200, 200, 200) | XX rgb(1, 1, 1) |
| C_quad_single_key | removeSides | OK rgb(200, 200, 200) L="rgb(1, 1, 1)" | OK rgb(200, 200, 200) W3 L="" | OK rgb(200, 200, 200) L="rgb(1, 1, 1)" |

OK/XX flags: **0 disagreements** across 40 rows between the two environments.

## Appendix B — the runnable proof

Three files. The runner is a plain script (no import/export) so the SAME file runs in vitest and in a browser.

**`zz-litedge-matrix.js`** (drop into any `__tests__/` dir):

```js
// Environment-agnostic lit-edge matrix. Plain script: no import/export so the SAME file runs
// under vitest (side-effect import) and in Chromium (addScriptTag). Never committed.
globalThis.__litedge = (function () {
  const HI = 'rgb(200, 200, 200)', T = 'rgb(10, 10, 10)', X1 = 'rgb(1, 1, 1)', X2 = 'rgb(2, 2, 2)';
  const forms = {
    // cards seat, glass-tokens.ts@044578a:192-195 — `border` shorthand, then the edge longhand
    A_card_border_then_top: () => ({ border: `1px solid ${T}`, borderTopColor: HI }),
    // Claim A as relayed by the coordinator — four longhands, no shorthand at all
    A2_longhands_only: () => ({ borderStyle: 'solid', borderWidth: 1, borderRightColor: T, borderBottomColor: T, borderLeftColor: T, borderTopColor: HI }),
    // sheet seat, sheet-chrome.ts@cf195e6:102-106 — `borderColor` at slot 3, edge at slot 4
    B_sheet_color_then_top: () => ({ borderStyle: 'solid', borderWidth: 1, borderTopWidth: 2, borderColor: T, borderTopColor: HI }),
    // the sheet in the cards seat's shape (sheet docblock option 1) — 2px top via `borderTop`
    A_sheet_border_then_borderTop: () => ({ border: `1px solid ${T}`, borderTop: `2px solid ${HI}` }),
    // partner's third form — ONE key, four-value `border-color`
    C_quad_single_key: () => ({ borderStyle: 'solid', borderWidth: 1, borderColor: `${HI} ${T} ${T} ${T}` }),
  };
  const variants = {
    plain:       (f, x) => ({ ...f }),
    spreadColor: (f, x) => ({ ...f, borderColor: x }),
    sides:       (f, x) => ({ ...f, borderRightColor: x, borderBottomColor: x, borderLeftColor: x }),
    quad:        (f, x) => ({ ...f, borderColor: `${HI} ${x} ${x} ${x}` }),
    border:      (f, x) => ({ ...f, border: `1px solid ${x}` }),
    borderTop:   (f, x) => ({ ...f, borderTop: `1px solid ${x}` }),
    removeKey:   (f, x) => (x === X2 ? { ...f } : { ...f, borderColor: x }),
    removeSides: (f, x) => (x === X2 ? { ...f } : { ...f, borderRightColor: x, borderBottomColor: x, borderLeftColor: x }),
  };
  const sequence = [X1, X2, X1]; // expanded -> collapsed -> expanded
  function run({ React, createRoot, flushSync, makeContainer, read }) {
    const rows = [];
    for (const [fn, mk] of Object.entries(forms)) {
      for (const [vn, v] of Object.entries(variants)) {
        const host = makeContainer();
        const root = createRoot(host);
        const paints = [];
        for (const x of sequence) {
          const style = v(mk(), x);
          const errs = [];
          const orig = console.error;
          console.error = (...a) => { errs.push(String(a[0])); };
          try { flushSync(() => root.render(React.createElement('div', { style }))); }
          finally { console.error = orig; }
          const r = read(host.firstChild);
          paints.push({ ...r, ok: r.top === HI, warn: errs.filter((m) => /conflicting property/.test(m)).length });
          if (vn === 'plain') break;
        }
        root.unmount();
        rows.push({ form: fn, variant: vn, keys: Object.keys(v(mk(), X1)).join(','), paints });
      }
    }
    return rows;
  }
  return { forms, variants, run, HI, T, X1, X2 };
})();
```

**`zz-litedge-probe.test.tsx`** (jsdom; `LITEDGE_OUT=<path>.json pnpm exec vitest run <file>`):

```tsx
import { it } from 'vitest'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { writeFileSync } from 'fs'
import { glassCard } from '../glass-tokens'
import './zz-litedge-matrix.js'

it('lit-edge matrix (jsdom) -> JSON', () => {
  const L = (globalThis as any).__litedge
  const rows = L.run({
    React, createRoot, flushSync,
    makeContainer: () => document.body.appendChild(document.createElement('div')),
    read: (el: HTMLElement) => ({
      top: el.style.borderTopColor, left: el.style.borderLeftColor,
      ctop: getComputedStyle(el).borderTopColor, css: el.getAttribute('style'),
    }),
  })
  const out = process.env.LITEDGE_OUT as string
  writeFileSync(out, JSON.stringify({ env: 'jsdom', glassCardKeys: Object.keys(glassCard), rows }, null, 1))
})
```

**`litedge-browser.js`** (Chromium; `NODE_PATH=<dir with playwright@1.60>/node_modules node litedge-browser.js <out.json>`; loads react-dom@19.2.3 dev from esm.sh so no bundler is needed):

```js
const { chromium } = require('playwright');
const fs = require('fs');
const WT = 'D:/Work Coding Projects/CCTV Recovery Notes App/worktrees/partner-litedge';
const OUT = process.argv[2];
const matrixSrc = fs.readFileSync(WT + '/features/demo/ui/__tests__/zz-litedge-matrix.js', 'utf8');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
  await page.goto('https://esm.sh/', { waitUntil: 'domcontentloaded' });
  await page.addScriptTag({ content: matrixSrc });
  const res = await page.evaluate(async () => {
    const React = await import('https://esm.sh/react@19.2.3?dev');
    const RDC = await import('https://esm.sh/react-dom@19.2.3/client?dev');
    const RD = await import('https://esm.sh/react-dom@19.2.3?dev');
    const L = globalThis.__litedge;
    const rows = L.run({
      React: React.default ?? React, createRoot: RDC.createRoot, flushSync: RD.flushSync,
      makeContainer: () => document.body.appendChild(document.createElement('div')),
      read: (el) => { const cs = getComputedStyle(el); return { top: cs.borderTopColor, left: cs.borderLeftColor, css: el.getAttribute('style') }; },
    });
    return { env: 'chromium', ua: navigator.userAgent, reactVersion: (React.default ?? React).version, rows };
  });
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  console.log('UA:', res.ua.match(/Chrome\/[\d.]+/)[0], 'react:', res.reactVersion, 'rows:', res.rows.length);
  await browser.close();
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
```
