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
  if (type.isArray()) return `${printType(type.getArrayElementType(), node, depth)}[]`
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
  const callSigs = type.getCallSignatures()
  if (callSigs.length === 1) {
    const s = callSigs[0]
    const params = s.getParameters().map((p) => {
      const pt = p.getTypeAtLocation(node)
      return `${p.getName()}: ${printType(pt, node, depth + 1)}`
    })
    return `(${params.join(', ')}) => ${printType(s.getReturnType(), node, depth + 1)}`
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
  return out.sort().join('; ')
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
