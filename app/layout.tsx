import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stock Cycle Compass — Where are we in the equity cycle?",
  description:
    "A live read on the equity cycle from valuation, sentiment, breadth and macro. Built for eToro retail traders. Not financial advice.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://stock-cycle-compass.etoro.app",
  ),
  openGraph: {
    title: "Stock Cycle Compass",
    description:
      "Where are we in the equity cycle? Cape, Buffett ratio, ERP and breadth on a single dial.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1012" },
  ],
};

const themeBootstrap = `
(function () {
  try {
    var key = 'scc:theme';
    var saved = localStorage.getItem(key);
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var mode = saved ? saved : (prefersDark ? 'dark' : 'light');
    if (mode === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = mode;
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="bg-bg text-fg antialiased">{children}</body>
    </html>
  );
}
