import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

/**
 * Manrope, self-hosted by next/font: built with the site, served from this domain, preloaded,
 * and paired with a metric-matched fallback so the swap does not move the layout. One variable
 * file covers every weight the CSS uses (400–800), including the 800 the old 400/600/700 import faked.
 */
const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "Andrei Tekhtelev · Interactive Portfolio",
  description: "A grounded, interactive portfolio and technical interview guide.",
  metadataBase: new URL("https://andreitekhtelev.dev"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://andreitekhtelev.dev/",
    title: "Andrei Tekhtelev · Interactive Portfolio",
    description: "Try the work, inspect the trade-offs and ask why.",
    siteName: "Andrei Tekhtelev",
    images: ["/images/andrei-tekhtelev-avatar-og.jpg"],
  },
  twitter: {
    card: "summary",
    title: "Andrei Tekhtelev · Interactive Portfolio",
    description: "Try the work, inspect the trade-offs and ask why.",
    images: ["/images/andrei-tekhtelev-avatar-og.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>{children}</body>
    </html>
  );
}
