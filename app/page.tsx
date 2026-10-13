// Root page — renders the marketing home page.
// It sits outside the (marketing) route group, so it adds its own navbar and footer here
// (kept out of the root layout so they don't cover the dashboard and auth pages).
import type { Metadata } from "next";
import HomePage from "@/app/(marketing)/page";
import { NavBarDemo } from "@/components/ui/navbar-demo";
import Footer from "@/components/layout/Footer";
import SmoothScroll from "@/components/marketing/SmoothScroll";
import { faqs } from "@/components/marketing/faq-data";
import { jsonLd, organizationLd } from "@/lib/seo";
import { SITE } from "@/lib/site";

// Rebuild the page at most once an hour, so the live numbers in TrustSection stay current.
export const revalidate = 3600;

const TITLE ="Hotel Voucher, Air Ticket & Invoice Software for Travel Agents | Vouchlio";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/", title: TITLE, description: SITE.description },
};

/** Structured data: who we are, the site, the product, and the FAQ (eligible for rich results). */
const schema = {
  "@context": "https://schema.org",
  "@graph": [
    organizationLd,
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
      url: SITE.url,
      name: SITE.name,
      description: SITE.tagline,
      inLanguage: "en-IN",
      publisher: { "@id": `${SITE.url}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      name: SITE.name,
      url: SITE.url,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web browser",
      description: SITE.description,
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR", description: "Free plan" },
      publisher: { "@id": `${SITE.url}/#organization` },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
  ],
};

export default function RootPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <NavBarDemo />
      <main id="main">
        <HomePage />
      </main>
      <Footer />
      <SmoothScroll />
    </>
  );
}
