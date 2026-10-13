import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/** Sent on every response. */
const securityHeaders = [
  // Only this site may frame its pages (clickjacking); the ticket PDF preview is a same-origin iframe.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; form-action 'self'" },
  // Browsers must not guess content types (e.g. treat an upload as script).
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // payment: Razorpay Checkout's frame may use the Payment Request API (Google Pay, saved cards).
  { key: "Permissions-Policy", value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://api.razorpay.com" "https://checkout.razorpay.com"), usb=()' },
  // allow-popups: Razorpay opens bank / 3-D Secure / UPI windows that report back to this page.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  // HTTPS only, once deployed (never on localhost).
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Hide the Next.js "N" dev-tools badge in the corner during development.
  devIndicators: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Authenticated API data must never be cached by browsers or proxies.
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
  images: {
    remotePatterns: [],
  },
  // Suppress specific warnings that don't affect functionality
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
