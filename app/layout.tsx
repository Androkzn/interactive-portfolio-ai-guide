import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Andrei Tekhtelev · Interactive Portfolio",
  description: "A grounded, interactive portfolio and technical interview guide.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
