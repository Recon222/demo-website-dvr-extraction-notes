import Header from "@/components/ui/header";
import { FeatureNav } from "@/components/ui/feature-nav";
import Footer from "@/components/ui/footer";

/**
 * Marketing group layout — owns ALL marketing chrome (header, feature tab strip,
 * footer) so that /demo, which lives outside this route group, renders none of it.
 * A server component by design: the only client island in the chrome is the tab
 * strip's active-route highlight. (AOS was removed with the Case-File redesign —
 * the design reads fine static; see docs/features/case-file-redesign/.)
 */
export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <FeatureNav />
      <main className="relative flex grow flex-col">{children}</main>
      <Footer />
    </>
  );
}
