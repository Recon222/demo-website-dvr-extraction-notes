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
    <>
      <UtilityStrip />
      <Header />
      <ManifestTabStrip items={tabItems} />
      <main className="relative flex grow flex-col">{children}</main>
      <Footer />
    </>
  );
}
