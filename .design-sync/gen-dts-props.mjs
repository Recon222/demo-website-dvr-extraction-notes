#!/usr/bin/env node
// Generates cfg.dtsPropsFor for every component in cfg.componentSrcMap, by reading
// the real props out of source with the TypeScript checker (ts-morph).
//
// Why: this is a Next.js app — no dist/, no package.json#types — so the converter's
// dts.mjs has no declaration tree to parse and every emitted <Name>.d.ts degrades to
// `{ [key: string]: unknown }`. The .d.ts IS the API contract the design agent codes
// against, so that's not shippable.
//
// Uses the checker (not raw source text) so referenced local types resolve to their
// structural form — e.g. TabBar's `active: TabId` becomes
// `active: "dashboard" | "cases" | "map"`. A raw-text lift would emit a .d.ts
// referencing TabId, which the emitted file never defines → [DTS_PARSE].
//
// Handles both prop shapes in this codebase:
//   export function Dropdown({...}: DropdownProps)                    <- named interface
//   export function TabBar({ active, onSelect }: { active: TabId … }) <- inline literal
//
// Regenerate: node .design-sync/gen-dts-props.mjs   (rewrites config.json in place)

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Project, ts } from 'ts-morph'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '..')
const CFG_PATH = join(HERE, 'config.json')

const cfg = JSON.parse(readFileSync(CFG_PATH, 'utf8'))
const pinned = Object.entries(cfg.componentSrcMap ?? {}).filter(([, p]) => p !== null)

const project = new Project({
  tsConfigFilePath: join(REPO, 'tsconfig.json'),
  skipAddingFilesFromTsConfig: true,
})
for (const [, p] of pinned) project.addSourceFileAtPath(resolve(REPO, p))
project.resolveSourceFileDependencies()

// Print types structurally and fully — no `import("…")` paths, no `...` truncation.
const FMT =
  ts.TypeFormatFlags.NoTruncation |
  ts.TypeFormatFlags.UseSingleQuotesForStringLiteralType |
  ts.TypeFormatFlags.InTypeAlias

// Strip any import("/abs/path").Foo that survives — an absolute path in a .d.ts is
// both unportable and a local-filesystem leak into an uploaded artifact.
const clean = (s) => s.replace(/import\("[^"]*"\)\./g, '').replace(/\s+/g, ' ').trim()

/** Is this type declared in @types/react? Those stay named, via the React.* namespace
 *  the emitted .d.ts already imports — expanding ReactNode inline is unreadable. */
function isReactType(type) {
  // Type ALIASES (ReactNode, CSSProperties) carry no getSymbol() — only an alias
  // symbol. Checking just getSymbol() misses them and they get expanded instead.
  const decls = [
    ...(type.getSymbol()?.getDeclarations() ?? []),
    ...(type.getAliasSymbol()?.getDeclarations() ?? []),
  ]
  return decls.some((d) => /[\\/]@types[\\/]react[\\/]/.test(d.getSourceFile().getFilePath()))
}

/**
 * Only types declared in THIS repo get expanded inline. Expanding anything else walks
 * into library internals: an array's prototype (FlatArray/ConcatArray/Intl…) or the
 * Promise inside React 19's ReactNode (then<TResult1, TResult2>), which bloated
 * DvrInfoScreen past 6KB and emitted type params that resolve to nothing.
 */
function isLocalType(type) {
  // Alias symbol too — `type GpsCoordinates = { … }` has no getSymbol(), so a
  // symbol-only check reports it non-local and leaves the name unresolved.
  const decls = [
    ...(type.getSymbol()?.getDeclarations() ?? []),
    ...(type.getAliasSymbol()?.getDeclarations() ?? []),
  ]
  if (!decls.length) return false
  return decls.every((d) => {
    const f = d.getSourceFile().getFilePath()
    return f.startsWith(REPO.replace(/\\/g, '/')) && !/[\\/]node_modules[\\/]/.test(f)
  })
}

/**
 * A plain data object: every member is declared in user code, not TypeScript's lib.
 * This is what lets `Partial<CameraEntry>` expand — its own symbol lives in lib.es5,
 * so isLocalType rejects it, yet TS's printer only expands the mapped type one level
 * and leaves nested names bare (`gps?: GpsCoordinates`). Array/Promise/String are
 * excluded here because their members (push/then/charAt) ARE lib-declared — expanding
 * those is what produced FlatArray/ConcatArray/TResult noise.
 */
function isPlainData(type) {
  if (!type.isObject() || type.isArray()) return false
  const props = type.getProperties()
  if (!props.length || props.length > 40) return false
  if (type.getCallSignatures().length) return false
  return !props.some((p) =>
    (p.getDeclarations() ?? []).some((d) => {
      const f = d.getSourceFile().getFilePath()
      return /[\\/]node_modules[\\/]typescript[\\/]lib[\\/]/.test(f) || /[\\/]lib\.[a-z0-9.]*d\.ts$/.test(f)
    }),
  )
}

/**
 * Print a type structurally, expanding LOCAL object types inline so the emitted .d.ts
 * is self-contained. Without this, screens emit `cameras: CameraEntry[]` — a name the
 * .d.ts never defines, so the design agent knows the prop exists but not its shape.
 * React types keep their name (React.ReactNode); depth is capped to stop recursive
 * domain types from exploding.
 */
function printType(type, node, depth = 0) {
  if (depth > 3) return 'unknown'
  // React FIRST: ReactNode & friends are aliased UNIONS, so the union branch below
  // would shred them into bare member names (ReactElement | ReactPortal | Iterable…)
  // that the emitted .d.ts never defines. Keep them namespaced and whole.
  if (isReactType(type)) {
    const alias = type.getAliasSymbol()?.getName() ?? type.getSymbol()?.getName()
    if (alias && alias !== '__type') return `React.${alias}`
  }
  if (type.isArray()) {
    const el = printType(type.getArrayElementType(), node, depth)
    // W4/F83 — PARENTHESISE. `X[]` binds tighter than both `|` and `=>`, so an unparenthesised
    // element that is a union or a function signature re-associates and the emitted contract is
    // wrong in BOTH directions. Shipped evidence: `MapFiltersSheet.activeStatuses` was
    //     'started' | 'working' | 'complete'[]
    // which TypeScript reads as `'started' | 'working' | ('complete'[])`. That contract REJECTS
    // the array the component actually takes AND ACCEPTS a bare `'started'` string — and the
    // component's own `.includes()` on a string is a SUBSTRING test, so the design agent's
    // "valid" call renders every status chip pressed. Same trap for `(() => void)[]`.
    //
    // Test for the operators on the PRINTED text rather than on the type: `printType` has
    // already flattened aliases and expanded locals, so the string is what actually lands in the
    // `.d.ts` and is the only thing whose precedence matters. A printed object literal
    // (`{ a: string; b: () => void }`) contains `=>` but is already bracketed, so leading `{`
    // exempts it — as do a leading `(` and an existing `React.X` name.
    const needsParens = /\||=>/.test(el) && !/^[{(]/.test(el) && !el.endsWith('[]')
    return needsParens ? `(${el})[]` : `${el}[]`
  }
  // W4/F83 — the INTERSECTION arm. Without it an intersection fell through to
  // `clean(type.getText(...))` and emitted bare local names the `.d.ts` never defines:
  // `SubmissionScreen.coordinates` shipped as `GpsCoordinates & { source: GpsSource; }`, with
  // neither name bound. Printing each member through `printType` expands the local halves the
  // same way every other object type is expanded.
  if (type.isIntersection()) {
    return type
      .getIntersectionTypes()
      .map((t) => printType(t, node, depth))
      .join(' & ')
  }
  // isBoolean() only catches the `boolean` keyword; the checker usually hands back the
  // union `true | false`, which would print as an unreadable `undefined | false | true`.
  if (type.isBoolean() || type.isBooleanLiteral()) return 'boolean'
  if (type.isUnion()) {
    const parts = [...new Set(type.getUnionTypes().map((t) => printType(t, node, depth)))]
    // Collapse the expanded boolean union back to the keyword.
    if (parts.includes('boolean')) {
      for (const b of ['true', 'false']) {
        let i
        while ((i = parts.indexOf(b)) !== -1) parts.splice(i, 1)
      }
    }
    return [...new Set(parts)].join(' | ')
  }
  // W4/F83 residue — `Promise<T>`. Its own symbol is lib-declared, so `isLocalType` rejects it
  // and `isPlainData` rejects it (`then`/`catch` are lib members); it fell through to
  // `getText()` and emitted the WRAPPER verbatim, carrying an unexpanded local name inside it:
  // `Promise<ReverseGeocodeResult | null>`, `Promise<OcrRecognizeOutcome>`. Unwrapping and
  // re-printing the argument routes the inner type back through the local-expansion branch.
  if (type.getSymbol()?.getName() === 'Promise') {
    const [inner] = type.getTypeArguments()
    if (inner) return `Promise<${printType(inner, node, depth + 1)}>`
  }

  const callSigs = type.getCallSignatures()
  if (callSigs.length === 1) {
    const s = callSigs[0]
    /**
     * W4/F83 — ERASE type parameters. `cfg.dtsPropsFor` is a plain interface BODY string
     * (`.ds-sync/package-build.mjs:821` passes `generics: ''` beside it), so there is nowhere to
     * declare a `<K extends …>` binder. A generic signature printed as written therefore emits an
     * UNBOUND name: `NewCaseModal.onChange` shipped as `(field: K, value: NewCaseFields[K]) => void`
     * with no `K` anywhere in the file — unresolvable in principle, not merely unexpanded, which
     * is why D-1's one-line intersection fix would never have covered it.
     *
     * Erasure, not invention: each parameter is replaced by its CONSTRAINT (`K extends keyof
     * NewCaseFields` -> the key union), which is the widest type the signature actually accepts
     * and the standard degradation for a contract that cannot carry binders. An unconstrained
     * parameter erases to `unknown` — honest, and narrower than the `any` the old path implied.
     * Applied to the printed text so it also catches `NewCaseFields[K]`, where `K` is nested
     * inside an indexed access the checker prints verbatim.
     */
    const typeParams = s.getTypeParameters?.() ?? []
    const erase = (text) => {
      let out = text
      for (const tp of typeParams) {
        const tpName = tp.getSymbol()?.getName() ?? tp.getText?.()
        if (!tpName) continue
        const constraint = tp.getConstraint?.()
        const replacement = constraint ? printType(constraint, node, depth + 1) : 'unknown'
        // Whole-word only: `K` must not eat the `K` inside `Key` or `NewCaseFields`.
        out = out.replace(new RegExp(`(?<![A-Za-z0-9_$])${tpName}(?![A-Za-z0-9_$])`, 'g'), replacement)
      }
      // `Fields[<union>]` after substitution is still an indexed access the emitted file cannot
      // resolve if the object half is a local name; collapse it to the value type when the
      // checker can give one, else leave it — `clean` already stripped import() paths.
      return out
    }
    /**
     * Resolve through the checker BEFORE printing, so an INDEXED ACCESS collapses.
     * Substituting `K`'s constraint textually fixes `field: K` but leaves
     * `value: NewCaseFields['caseNumber' | 'displayName' | …]` — still an unbound local name and
     * still unresolvable in the emitted file, just a longer one. `getApparentType()` on
     * `NewCaseFields[K]` gives the union of the property types the constraint selects, which is
     * the real erased parameter type.
     *
     * NARROWLY applied, because `getApparentType()` BOXES primitives (`string` -> the `String`
     * interface). Resolving every parameter of every generic signature would therefore trade one
     * mis-encoding for another — measured: `NewCaseModal.onChange`'s `value` came back as
     * `String`. So it runs only where the declared type actually MENTIONS one of this
     * signature's type parameters (the only place erasure is needed), and the boxed spellings
     * are mapped back for the case where the collapse itself lands on a primitive.
     */
    const tpNames = typeParams.map((tp) => tp.getSymbol()?.getName()).filter(Boolean)
    const mentionsTypeParam = (t) => {
      if (!tpNames.length) return false
      const text = t.getText?.(node) ?? ''
      return tpNames.some((n) => new RegExp(`(?<![A-Za-z0-9_$])${n}(?![A-Za-z0-9_$])`).test(text))
    }
    const UNBOX = { String: 'string', Number: 'number', Boolean: 'boolean', Symbol: 'symbol' }
    const resolve = (t) => (mentionsTypeParam(t) ? t.getApparentType() : t)
    const unbox = (text) => UNBOX[text] ?? text
    /**
     * W4/F83' — the erasure is KNOWN-LOSSY too, and now says so IN the contract.
     *
     * Erasing `<K extends keyof Fields>(field: K, value: Fields[K])` collapses the DEPENDENT
     * parameter to the union of every key's value type, so `value: string` re-admits exactly the
     * typo class review R-13 closed: `incidentCoordinateSource` is `IncidentCoordSource | ''`
     * (`caseFormData.ts:44`), not `string`, and the flattened contract accepts
     * `onChange('incidentCoordinateSource', 'geocodedd')`. The per-key correspondence is real and
     * the interface body cannot carry it — same wall as the union props type — so it is DECLARED
     * rather than left to look like the whole truth.
     *
     * Only the parameters that actually lost information are named, and a parameter that IS a
     * bare type parameter is not one of them: erasing `field: K` to `keyof Fields` yields exactly
     * the set of valid keys, which is lossless. The loss is in the DEPENDENT parameter — the one
     * whose type mentions `K` without being `K` (`value: Fields[K]`), because that is what
     * collapses fourteen per-key types into one union. Naming `field` too, as the first cut of
     * this notice did, would point the reader at the half that is fine.
     */
    const dependent = []
    const params = s.getParameters().map((p) => {
      const declared = p.getTypeAtLocation(node)
      if (mentionsTypeParam(declared) && !declared.isTypeParameter()) dependent.push(p.getName())
      return `${p.getName()}: ${unbox(erase(printType(resolve(declared), node, depth + 1)))}`
    })
    const sig = `(${params.join(', ')}) => ${unbox(erase(printType(resolve(s.getReturnType()), node, depth + 1)))}`
    if (!dependent.length) return sig
    // The bare-type-parameter parameter — the KEY the dependent one varies with.
    const keyParam = s
      .getParameters()
      .find((p) => p.getTypeAtLocation(node).isTypeParameter())
      ?.getName()
    return (
      `/* KNOWN-LOSSY (W4/F83): generic signature erased — ${dependent.join(', ')} ` +
      `${dependent.length === 1 ? 'is' : 'are'} the WIDENED union of every ` +
      `${keyParam ? `\`${keyParam}\`` : 'key'}'s type, not one type. The per-key correspondence ` +
      `holds at runtime and an interface body cannot express it: check the component's own props ` +
      `type before assuming a value is valid for a given ${keyParam ?? 'key'}. */ ${sig}`
    )
  }
  // A local object/interface -> expand to a literal so it needs no external name.
  if (type.isObject() && !type.isArray() && type.getProperties().length && (isLocalType(type) || isPlainData(type))) {
    const inner = type.getProperties().map((p) => {
      const pt = p.getTypeAtLocation(node)
      const isOpt = !!p.hasFlags?.(ts.SymbolFlags.Optional)
      let t = printType(pt, node, depth + 1)
      // Same redundancy as the top level: `?` already implies undefined.
      if (isOpt) t = t.replace(/^undefined \| /, '').replace(/ \| undefined$/, '')
      return `${p.getName()}${isOpt ? '?' : ''}: ${t}`
    })
    return `{ ${inner.join('; ')} }`
  }
  return clean(type.getText(node, FMT))
}

/** Find the exported component declaration by name (function or const). */
function findDecl(sf, name) {
  return (
    sf.getFunction(name) ??
    sf.getVariableDeclaration(name) ??
    sf.getFunctions().find((f) => f.getName() === name && f.isExported()) ??
    null
  )
}

/** Resolve the first parameter's type -> "a: X; b?: Y" */
function propsBody(decl, name) {
  let params = null
  if (typeof decl.getParameters === 'function') params = decl.getParameters()
  else {
    // const X = (props: P) => …  /  const X = forwardRef(...)
    const init = decl.getInitializer?.()
    if (init && typeof init.getParameters === 'function') params = init.getParameters()
  }
  if (!params || !params.length) return null // zero-prop component

  const param = params[0]
  const type = param.getType()
  const props = type.getProperties()
  if (!props.length) return null

  /**
   * W4/F83 — a UNION props type is KNOWN-LOSSY, and the loss is now stated instead of hidden.
   *
   * `cfg.dtsPropsFor` is an interface BODY (`export interface XProps { <body> }`,
   * `.ds-sync/package-build.mjs:821`), and a discriminated union is not expressible as one — not
   * by `extends` either, which takes an intersection but never a union. So this cannot be fixed
   * in the contract's own grammar, and F83's alternative is taken deliberately: record it.
   *
   * What was wrong before is not the loss, it is that the loss INVERTED the contract.
   * `type.getProperties()` on a union returns only the members common to every arm, with
   * optionality widened, so `OverlayHeaderProps` — `OverlayHeaderBase & ({ onBack(): void;
   * backLabel: string } | { onBack?: undefined; backLabel?: undefined })` — shipped as
   * `backLabel?: string; onBack?: () => void`. That is precisely the state W3/F74 closed:
   * `<OverlayHeader variant="glass" onBack={fn} />` with no `backLabel` renders an icon-only
   * button with NO accessible name. The generated contract told the design agent it was legal,
   * six lines below a source comment saying it is not.
   *
   * A comment is valid inside an interface body and survives into the emitted `.d.ts`, so the
   * constraint reaches the reader even though the type system cannot enforce it here. Only the
   * arms that DISAGREE are named — listing every shared prop would bury the one that matters.
   */
  let unionNote = ''
  if (type.isUnion()) {
    const arms = type.getUnionTypes()
    const namesPerArm = arms.map((a) => new Set(a.getProperties().map((p) => p.getName())))
    const everywhere = [...namesPerArm[0]].filter((n) => namesPerArm.every((s) => s.has(n)))
    const discriminating = [...new Set(namesPerArm.flatMap((s) => [...s]))]
      .filter((n) => !everywhere.includes(n))
      .concat(
        // A prop present in every arm but REQUIRED in some and absent-typed in others is the
        // `{ onBack(): void } | { onBack?: undefined }` shape — the pair, and the whole point.
        everywhere.filter((n) =>
          arms.some((a) => !a.getProperty(n)?.hasFlags?.(ts.SymbolFlags.Optional)) &&
          arms.some((a) => a.getProperty(n)?.hasFlags?.(ts.SymbolFlags.Optional)),
        ),
      )
    const listed = [...new Set(discriminating)].sort()
    if (listed.length) {
      unionNote =
        `/* KNOWN-LOSSY (W4/F83): the real props type is a UNION of ${arms.length} arms and an ` +
        `interface body cannot express one. ${listed.join(', ')} form a DISCRIMINATED GROUP — ` +
        `pass all of them or none. The '?' below is an artefact of flattening the union, NOT ` +
        `permission to pass one without the others. */ `
    }
  }

  const out = []
  for (const p of props) {
    const pt = p.getTypeAtLocation(param)
    let text = printType(pt, param)
    // A prop the checker can't resolve is worse than an honest unknown.
    if (!text || text === 'any' || text === 'error') text = 'unknown'
    const optional = p.hasFlags?.(ts.SymbolFlags.Optional) || p.isOptional?.() || false
    // `foo?: undefined | string` is redundant — the `?` already carries undefined.
    if (optional) text = text.replace(/^undefined \| /, '').replace(/ \| undefined$/, '')
    out.push(`${p.getName()}${optional ? '?' : ''}: ${text}`)
  }
  return unionNote + out.sort().join('; ')
}

const dtsPropsFor = {}
const report = []
for (const [name, srcPath] of pinned.sort(([a], [b]) => a.localeCompare(b))) {
  const sf = project.getSourceFile(resolve(REPO, srcPath))
  if (!sf) { report.push([name, 'SKIP', 'source file not loaded']); continue }
  const decl = findDecl(sf, name)
  if (!decl) { report.push([name, 'SKIP', `no export named ${name}`]); continue }
  try {
    const body = propsBody(decl, name)
    if (!body) { report.push([name, 'none', 'no props']); continue }
    dtsPropsFor[name] = body
    report.push([name, String(body.split(';').length), body.slice(0, 58) + (body.length > 58 ? '…' : '')])
  } catch (e) {
    report.push([name, 'ERR', e.message.slice(0, 60)])
  }
}

// GENERATED WINS; hand-written entries survive only where nothing was generated.
//
// This spread used to be the other way round (`{ ...dtsPropsFor, ...cfg.dtsPropsFor }`) to
// "preserve hand-written entries". That was self-defeating the moment this script first ran:
// its OWN output lands in config.json and is then indistinguishable from a hand-written entry,
// so every later run was a COMPLETE NO-OP that still printed "wrote dtsPropsFor for 33/33".
// Measured on `feat/uiparity-w4` @ 780399e: the run computed `ModalShell` with 10 props
// (including the required `closeAccessibilityLabel`) and `TabBar` with the four-tab union, then
// wrote a file `git diff --numstat` reported as ZERO lines changed, leaving the config on a
// 3-prop ModalShell and a 3-tab TabBar. A regeneration step that reports success and changes
// nothing is exactly the class of defect D7 exists to catch.
//
// The preserve intent still holds where it is meaningful: a component the generator SKIPPED
// (no props, no export found, or a checker error — see `report`) contributes no key here, so
// any entry a human wrote for it passes through untouched. What can no longer happen is a stale
// generated entry outliving the source it was generated from.
cfg.dtsPropsFor = { ...(cfg.dtsPropsFor ?? {}), ...dtsPropsFor }
writeFileSync(CFG_PATH, JSON.stringify(cfg, null, 2) + '\n')

for (const [n, c, s] of report) console.log(`  ${n.padEnd(24)} ${String(c).padEnd(5)} ${s}`)
console.log(`\nwrote dtsPropsFor for ${Object.keys(dtsPropsFor).length}/${pinned.length} components`)
