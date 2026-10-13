import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import CookieSettingsButton from "@/components/consent/CookieSettingsButton";
import BrandMark from "@/components/brand/BrandMark";
import ThemeSwitch from "@/components/layout/ThemeSwitch";
import { SITE } from "@/lib/site";

// Only profiles that have been filled in (lib/site.ts) are shown, so there are never dead links.
const SOCIAL = Object.entries({ LinkedIn: SITE.social.linkedin, X: SITE.social.x, Instagram: SITE.social.instagram, YouTube: SITE.social.youtube }).filter(([, url]) => url);

const footerLinks = {
  Product: [
    { href: "/#services", label: "Services" },
    { href: "/#documents", label: "Documents" },
    { href: "/#how-it-works", label: "How It Works" },
    { href: "/#pricing", label: "Pricing" },
    { href: "/#faq", label: "FAQ" },
  ],
  "Free tools": [
    { href: "/tools/hotel-voucher", label: "Hotel voucher generator" },
    { href: "/tools/gst-invoice", label: "GST invoice generator" },
    { href: "/tools/proforma-invoice", label: "Proforma invoice" },
    { href: "/tools/payment-receipt", label: "Payment receipt" },
    { href: "/tools/travel-quotation", label: "Travel quotation" },
  ],
  Company: [
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
    { href: "/signup", label: "Start free" },
  ],
  Legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/cookies", label: "Cookie Policy" },
    { href: "/terms", label: "Terms and Conditions" },
    { href: "/refunds", label: "Refund Policy" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black text-slate-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-6">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <BrandMark variant="neon" className="h-9" />
              <span className="font-bold text-lg text-white">Vouchlio</span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs text-slate-400">
              Travel document software for travel agents, agencies and tour operators. Create professional travel documents from one centralized workspace.
            </p>
            {SOCIAL.length > 0 && (
              <div className="flex items-center gap-3 mt-6">
                {SOCIAL.map(([label, href]) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    aria-label={`${SITE.name} on ${label}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h2 className="text-white font-semibold text-sm mb-4">{section}</h2>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-400 hover:text-brand-neon transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {section === "Legal" && (
                  <li>
                    <CookieSettingsButton className="text-sm text-slate-400 hover:text-brand-neon transition-colors" />
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-10 bg-white/10" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Vouchlio. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <ThemeSwitch />
            <p className="hidden text-xs text-slate-400 sm:block">Built for travel professionals</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
