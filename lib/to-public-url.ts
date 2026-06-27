/**
 * Normalise a /public-relative asset path (e.g. `demos/x.mp4`, `diagrams/y.svg`)
 * to a root-absolute URL. Already-absolute paths (`/...`) and remote URLs
 * (`http://`, `https://`) are returned unchanged, so callers can pass either an
 * author-friendly relative path or a full URL without producing `//x` or `//http`.
 *
 * Shared by every component that renders an asset from /public (AppDemo,
 * FeaturePage) so the leading-slash rule lives in exactly one place.
 */
export function toPublicUrl(path: string): string {
  return path.startsWith('/') || path.startsWith('http') ? path : `/${path}`
}
