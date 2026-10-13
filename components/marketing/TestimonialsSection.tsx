import React from "react";
import { Quote } from "lucide-react";
import { TESTIMONIALS } from "@/lib/testimonials";

/**
 * Three real customer quotes (lib/testimonials.ts). Renders nothing until real testimonials are added,
 * so the page never shows placeholder or invented reviews.
 */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export default function TestimonialsSection() {
  const items = TESTIMONIALS.slice(0, 3);
  if (items.length === 0) return null;

  return (
    <section id="testimonials" className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--primary)]">Testimonials</p>
          <h2 className="mb-4 text-3xl font-bold text-[var(--foreground)] sm:text-4xl">What travel agents say</h2>
          <p className="mx-auto max-w-xl text-[var(--muted-foreground)]">In their own words, from agencies using Vouchlio every day.</p>
        </div>

        <ul className={`grid gap-5 ${items.length === 1 ? "mx-auto max-w-xl" : items.length === 2 ? "mx-auto max-w-4xl md:grid-cols-2" : "md:grid-cols-3"}`}>
          {items.map((t) => (
            <li key={`${t.name}-${t.company}`}>
              <figure className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-7 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-500/5">
                <Quote className="h-7 w-7 fill-brand-100 text-[var(--primary)]" aria-hidden />
                <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-slate-700">“{t.quote}”</blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
                  <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-white">
                    {initials(t.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-slate-900">{t.name}</span>
                    <span className="block truncate text-sm text-slate-500">
                      {t.role}, {t.company}
                      {t.city ? ` · ${t.city}` : ""}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
