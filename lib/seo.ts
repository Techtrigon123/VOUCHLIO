import type { Metadata } from "next";
import { SITE } from "@/lib/site";

/**
 * Metadata for one public page: title, description, canonical URL and matching Open Graph /
 * Twitter tags. Next.js doesn't copy `title` into og:title, so without this every shared link
 * would show the home page's title. Keep titles under ~60 characters and descriptions 140–160.
 */
export function pageMeta({ title, description, path, absoluteTitle = false }: { title: string; description: string; path: string; absoluteTitle?: boolean }): Metadata {
  const full = absoluteTitle ? title : `${title} | ${SITE.name}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", locale: "en_IN", siteName: SITE.name, url: path, title: full, description },
    twitter: { card: "summary_large_image", title: full, description },
  };
}

/** JSON-LD for search engines. Rendered as a <script type="application/ld+json">. */
export function jsonLd(data: Record<string, unknown>): string {
  // "<" is escaped so content can never close the script tag early.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export const organizationLd = {
  "@type": "Organization",
  "@id": `${SITE.url}/#organization`,
  name: SITE.name,
  url: SITE.url,
  logo: `${SITE.url}/brand/vouchlio-mark.png`,
  description: SITE.description,
  sameAs: Object.values(SITE.social).filter(Boolean),
};
