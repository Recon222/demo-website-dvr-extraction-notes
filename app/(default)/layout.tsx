import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";

/**
 * Marketing group layout — owns the page-wide marketing chrome (header, footer,
 * ambient background) so that /demo, which lives outside this route group,
 * renders none of it. A pure server component. (AOS was removed with the
 * Case-File redesign — the design reads fine static.)
 *
 * The manifest tab strip used to mount here too. It now lives in
 * app/(default)/features/layout.tsx: it is feature navigation, it duplicated the
 * evidence manifest on the home page, and its wrapped rows cost ~96px above the
 * fold. The utility strip was removed entirely in the seamless-background pass.
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
      <main className="relative flex grow flex-col overflow-hidden">{children}</main>
      <Footer />
    </div>
  );
}
