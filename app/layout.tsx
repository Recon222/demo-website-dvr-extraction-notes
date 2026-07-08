import "./css/style.css";

import { Inter, JetBrains_Mono, Share_Tech_Mono } from "next/font/google";
import localFont from "next/font/local";

import { siteConfig } from "@/lib/site-config";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Case-File technical fonts: Share Tech Mono for ALL-CAPS eyebrows/labels,
// JetBrains Mono for numbers/stats. Hoisted here once (next/font self-hosts them)
// rather than the render-blocking CSS @import the demo prototype used.
const shareTechMono = Share_Tech_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-stmono",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbmono",
  display: "swap",
});

const nacelle = localFont({
  src: [
    {
      path: "../public/fonts/nacelle-regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/nacelle-italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../public/fonts/nacelle-semibold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/nacelle-semibolditalic.woff2",
      weight: "600",
      style: "italic",
    },
  ],
  variable: "--font-nacelle",
  display: "swap",
});

export const metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${nacelle.variable} ${shareTechMono.variable} ${jetbrainsMono.variable} bg-gray-950 font-inter text-base text-gray-200 antialiased`}
      >
        {/* Marketing chrome intentionally does NOT live here: /demo (outside the
            (default) route group) must render chrome-free. The header/tab-strip/
            footer are mounted in app/(default)/layout.tsx — guarded by
            app/(default)/__tests__/chrome-scope.test.tsx. */}
        <div className="flex min-h-screen flex-col overflow-hidden supports-[overflow:clip]:overflow-clip">
          {children}
        </div>
      </body>
    </html>
  );
}
