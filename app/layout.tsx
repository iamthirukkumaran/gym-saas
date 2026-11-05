import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Astryx — WhatsApp-first gym management",
    template: "%s · Astryx",
  },
  description:
    "Astryx tracks your members, their plans and their expiry dates, then chases every renewal on WhatsApp automatically. Built for independent gyms in India.",
  applicationName: "Astryx",
  keywords: [
    "gym management software",
    "gym software India",
    "WhatsApp renewal reminders",
    "membership management",
    "gym CRM",
  ],
  openGraph: {
    title: "Astryx — WhatsApp-first gym management",
    description:
      "Stop losing members to expired plans. Astryx sends the renewal reminders for you, on WhatsApp.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6d4aff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
