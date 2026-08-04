// Re-exports the three marketing components that ship as `export default`.
//
// WHY THIS IS NEEDED. With no dist/, the converter synthesizes its entry as
// `export * from '<each src file>'` (lib/source-kit.mjs). `export *` does not
// re-export default bindings — so Header, Footer and Logo would be DISCOVERED
// (deriveComponentsFromSrc recovers a default's declared name via getName())
// but absent from the bundle, and every card for them would fail with
// "Element type is invalid". Discovery and the bundle disagree; this closes it.
//
// cfg.extraEntries pulls this in alongside the synth entry, so the three land on
// window.CaseFile.* as named exports like the other eighteen.
//
// NOT the place to add new components: the other 18 are already picked up by the
// synth entry's `export *`. This file exists solely to bridge `export default`.
// If one of these three ever converts to a named export, delete its line here.

export { default as Footer } from '../../components/ui/footer'
export { default as Header } from '../../components/ui/header'
export { default as Logo } from '../../components/ui/logo'
