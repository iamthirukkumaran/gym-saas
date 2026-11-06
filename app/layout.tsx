import type { Metadata, Viewport } from "next";
import { Anton, Inter } from "next/font/google";

import "./globals.css";

/**
 * Anton carries the marketing site's display type — an ultra-bold condensed
 * face is the whole visual language of athletic design, and no system font
 * gets close. Inter handles body copy and the entire product UI, where
 * legibility beats personality.
 *
 * Both are self-hosted by next/font at build time, so there's no runtime
 * request to Google and no layout shift.
 */
const display = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Astryx — gym software that chases renewals for you",
    template: "%s · Astryx",
  },
  description:
    "Your members don't quit, they forget to renew. Astryx tracks every membership and chases the renewal on WhatsApp automatically. Built for independent gyms in India.",
  applicationName: "Astryx",
  keywords: [
    "gym management software",
    "gym software India",
    "WhatsApp renewal reminders",
    "membership management",
    "gym CRM",
  ],
  openGraph: {
    title: "Astryx — gym software that chases renewals for you",
    description:
      "Stop losing members to expired plans. Astryx sends the renewal reminders for you, on WhatsApp.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
