import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";

/**
 * Plus Jakarta Sans carries the marketing site — a geometric grotesk in the
 * Aeonik/Söhne family of shapes. The display sizes are set at regular weight
 * rather than black: restraint is the point, and an ultra-bold face would
 * undercut a brand built on not shouting.
 *
 * Inter stays on the product UI, where legibility beats personality.
 *
 * Both are self-hosted by next/font at build time, so there's no runtime
 * request to Google and no layout shift.
 */
const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-jakarta",
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
