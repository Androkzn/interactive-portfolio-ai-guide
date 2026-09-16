import type { Metadata } from "next";
import "./globals.css";

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
    images: ["/images/andrei-tekhtelev-avatar.png"],
  },
  twitter: {
    card: "summary",
    title: "Andrei Tekhtelev · Interactive Portfolio",
    description: "Try the work, inspect the trade-offs and ask why.",
    images: ["/images/andrei-tekhtelev-avatar.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
