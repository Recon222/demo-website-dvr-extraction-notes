// Stands in for `node:path` in the browser bundle (wired via tsconfig.sync.json).
//
// One consumer: FeaturePage, which builds a filesystem path to hand to
// existsSync (see node-fs.ts — that always returns false here, so this join's
// result is never actually used for anything). It still has to compute a sane
// string rather than throw, since it runs before the existsSync call.
//
// posix semantics only: the sole caller joins URL-ish public/ asset paths.

export function join(...parts: string[]): string {
  const joined = parts
    .filter((p) => p !== '')
    .join('/')
    .replace(/\/{2,}/g, '/')

  // Resolve . and .. segments the way path.posix.join does, so a caller passing
  // '../foo' gets a normalised result instead of a literal '..' in the string.
  const isAbsolute = joined.startsWith('/')
  const out: string[] = []
  for (const seg of joined.split('/')) {
    if (seg === '' || seg === '.') continue
    if (seg === '..') {
      if (out.length && out[out.length - 1] !== '..') out.pop()
      else if (!isAbsolute) out.push('..')
      continue
    }
    out.push(seg)
  }
  return (isAbsolute ? '/' : '') + out.join('/') || '.'
}
