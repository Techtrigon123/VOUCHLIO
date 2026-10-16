import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import CookieConsent from "@/components/consent/CookieConsent";
import ThemedToaster from "@/components/ThemedToaster";
import { THEME_SCRIPT } from "@/lib/theme-script";
import { SITE } from "@/lib/site";
import { NavigationTracker } from "@/components/ui/back-button";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const defaultTitle = "Hotel Voucher, Air Ticket & Invoice Software for Travel Agents | Vouchlio";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: defaultTitle,
    template: "%s | Vouchlio",
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "travel document software",
    "travel agency software",
    "hotel voucher generator",
    "air ticket generator",
    "pickup voucher",
    "welcome placard maker",
    "travel GST invoice software",
    "proforma invoice for travel agents",
    "tour operator software India",
    "DMC software",
  ],
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  // No site-wide canonical or og:url here: child pages would inherit "/" and tell Google they are
  // copies of the home page. Each public page sets its own `alternates.canonical`.
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: SITE.name,
    title: defaultTitle,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/site.webmanifest",
  // Google Search Console: set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION to the code from the
  // "HTML tag" method (the content="..." value only), redeploy, then click Verify.
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export const viewport: Viewport = {
  themeColor: "#e63946",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Applies the saved light/dark choice before first paint, on every page. */}
        <Script id="theme" strategy="beforeInteractive">{THEME_SCRIPT}</Script>
      </head>
      <body className="min-h-screen bg-[var(--background)] antialiased">
        <NavigationTracker />
        {children}
        <CookieConsent />
        <ThemedToaster />
      </body>
    </html>
  );
}
