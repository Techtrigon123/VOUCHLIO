import React from "react";
import { Check, X } from "lucide-react";
import BrandMark from "@/components/brand/BrandMark";

/** "Why choose Vouchlio": what the product gives you next to the manual way most agencies work today. */
const WITH_VOUCHLIO = [
  "Ready-made, verified templates",
  "Professional, branded documents",
  "Your logo, stamp and colours on every page",
  "Instant PDF export and WhatsApp sharing",
  "Upload a voucher or ticket and the form fills itself",
  "Dedicated support when you need it",
];

const MANUAL_WAY = [
  "Spreadsheets",
  "Editing PDFs by hand",
  "Generic Word templates",
  "Time-consuming workflows",
  "Inconsistent branding",
  "Error-prone formatting",
];

export default function ComparisonSection() {
  return (
    <section id="why-vouchlio" className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--primary)]">Comparison</p>
          <h2 className="mb-4 text-3xl font-bold text-[var(--foreground)] sm:text-4xl">Why choose Vouchlio</h2>
          <p className="mx-auto max-w-2xl text-[var(--muted-foreground)]">
            A modern documentation layer for travel businesses that have outgrown spreadsheets and Word templates.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-brand-200 bg-[var(--card)] bg-gradient-to-br from-brand-50 to-transparent p-7 shadow-xl shadow-brand-500/10 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-brand-100">
                <BrandMark className="h-7" />
              </span>
              <h3 className="text-lg font-bold text-slate-900">Vouchlio</h3>
            </div>
            <ul className="space-y-3.5">
              {WITH_VOUCHLIO.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] text-slate-800">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 sm:p-8">
            <h3 className="mb-6 flex h-12 items-center text-lg font-bold text-slate-500">The traditional manual process</h3>
            <ul className="space-y-3.5">
              {MANUAL_WAY.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] text-slate-500">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <X className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
