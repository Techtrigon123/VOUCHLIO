import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

type Entry = [path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]];

// Public, indexable pages only — the dashboard, setup and password-reset pages are noindex.
const PAGES: Entry[] = [
  ["", 1, "weekly"],
  ["/signup", 0.9, "monthly"],
  ["/about", 0.6, "monthly"],
  ["/contact", 0.6, "monthly"],
  ["/login", 0.4, "yearly"],
  ["/privacy", 0.3, "yearly"],
  ["/terms", 0.3, "yearly"],
  ["/refunds", 0.3, "yearly"],
  ["/cookies", 0.3, "yearly"],
];

// Legal pages change rarely: report their real "last updated" date instead of today.
const LEGAL = new Set(["/privacy", "/terms", "/refunds", "/cookies"]);
const legalUpdated = new Date(SITE.legal.lastUpdated);

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map(([path, priority, changeFrequency]) => ({
    url: `${SITE.url}${path}`,
    lastModified: LEGAL.has(path) && !Number.isNaN(legalUpdated.getTime()) ? legalUpdated : new Date(),
    changeFrequency,
    priority,
  }));
}
