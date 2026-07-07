import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import { UtilityStrip } from "@/components/ui/utility-strip";
import { ManifestTabStrip } from "@/components/ui/manifest-tab-strip";
import { getAllFeatures } from "@/lib/content/features";

// Minimal serialized props for the one client island in the chrome — never the
// whole Feature objects (RSC boundary serializes everything it's handed).
const tabItems = getAllFeatures().map(({ slug, navLabel }) => ({ slug, navLabel }));

/**
 * Marketing group layout — owns ALL marketing chrome (utility strip, header,
 * manifest tab strip, footer) so that /demo, which lives outside this route
 * group, renders none of it. A server component by design: the tab strip's
 * active-route highlight is the only client island. (AOS was removed with the
 * Case-File redesign — the design reads fine static.)
 */
export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex grow flex-col bg-ink-900 before:pointer-events-none before:absolute before:inset-0 before:bg-[repeating-linear-gradient(0deg,rgba(153,186,221,0.022)_0_1px,transparent_1px_46px),repeating-linear-gradient(90deg,rgba(153,186,221,0.022)_0_1px,transparent_1px_46px)] before:content-['']">
      <UtilityStrip />
      <Header />
      <ManifestTabStrip items={tabItems} />
      <main className="relative flex grow flex-col overflow-hidden">{children}</main>
      <Footer />
    </div>
  );
}
