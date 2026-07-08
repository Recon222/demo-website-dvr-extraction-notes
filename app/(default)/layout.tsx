import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import { ManifestTabStrip } from "@/components/ui/manifest-tab-strip";
import { getAllFeatures } from "@/lib/content/features";

// Minimal serialized props for the one client island in the chrome — never the
// whole Feature objects (RSC boundary serializes everything it's handed).
const tabItems = getAllFeatures().map(({ slug, navLabel }) => ({ slug, navLabel }));

/**
 * Marketing group layout — owns ALL marketing chrome (header, manifest tab
 * strip, footer — the utility strip was removed in the seamless-background
 * pass) so that /demo, which lives outside this route group, renders none of
 * it. A server component by design: the tab strip's active-route highlight is
 * the only client island. (AOS was removed with the Case-File redesign — the
 * design reads fine static.)
 */
export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate flex grow flex-col bg-ink-900 before:pointer-events-none before:fixed before:inset-0 before:-z-10 before:bg-[repeating-linear-gradient(0deg,rgba(153,186,221,0.035)_0_1px,transparent_1px_46px),repeating-linear-gradient(90deg,rgba(153,186,221,0.035)_0_1px,transparent_1px_46px)] before:content-['']">
      {/* Background scan: the phone's scan-sweep motif relocated to the page surface.
          Pure CSS, behind all content — knobs live under "Case-File background scan"
          in app/css/style.css. The resting grid above is `before:fixed` (viewport-
          anchored) so the scan's lit grid registers on exactly the same lines. */}
      <div aria-hidden className="case-scan">
        <div className="case-scan-band">
          <div className="case-scan-grid" />
          <div className="case-scan-line" />
        </div>
      </div>
      {/* Chrome glow: the blue top radial (artboard 1a), relocated from the home
          page (inside <main> it could never reach above main's overflow clip).
          Anchored to the very top of the page, it shines down over the header +
          tab strip into the content — one light for every marketing page. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[260px] w-[1100px] -translate-x-1/2 bg-[radial-gradient(550px_260px_at_50%_0%,rgba(43,140,193,0.16),transparent_70%)]"
      />
      <Header />
      <ManifestTabStrip items={tabItems} />
      <main className="relative flex grow flex-col overflow-hidden">{children}</main>
      <Footer />
    </div>
  );
}
