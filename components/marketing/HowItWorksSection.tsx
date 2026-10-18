import React from "react";
import { Check, Download, Eye, FileText, Mail, MessageCircle, Pencil, Printer, Sparkles, type LucideIcon } from "lucide-react";
import AnimatedCard from "@/components/ui/AnimatedCard";

/**
 * The workflow as four numbered step cards, left to right (stacked on small screens).
 * Each card carries a tiny illustration of that step, so the flow reads at a glance.
 */
interface Step {
  number: number;
  icon: LucideIcon;
  title: string;
  description: string;
  demo: React.ReactNode;
}

/* ─── Mini illustrations ─────────────────────────────────────────────────── */

function ChooseDemo() {
  const docs = ["Hotel voucher", "Itinerary", "Air ticket", "Invoice"];
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {docs.map((d, i) => (
        <span
          key={d}
          className={
            i === 0
              ? "flex items-center gap-1 rounded-lg border border-brand-500 bg-white px-2 py-1.5 text-[11px] font-semibold text-brand-600 shadow-sm"
              : "rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-500"
          }
        >
          {i === 0 ? <Check className="h-3 w-3" /> : null}
          {d}
        </span>
      ))}
    </div>
  );
}

function DetailsDemo() {
  const fields: [string, string][] = [
    ["Guest", "Rahul Sharma"],
    ["Hotel", "Taj Exotica, Goa"],
    ["Check-in", "12 Dec · 2 nights"],
  ];
  return (
    <div className="space-y-1.5">
      {fields.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px]">
          <span className="text-slate-400">{label}</span>
          <span className="font-medium text-black">{value}</span>
        </div>
      ))}
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600">
        <Sparkles className="h-3 w-3" /> Filled from your saved customer
      </span>
    </div>
  );
}

function ReviewDemo() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="h-2 w-12 rounded bg-brand-500" />
        <span className="text-[9px] font-semibold text-slate-400">HCN 48213</span>
      </div>
      <div className="mt-2 space-y-1">
        <span className="block h-1.5 w-full rounded bg-slate-200" />
        <span className="block h-1.5 w-4/5 rounded bg-slate-200" />
        <span className="block h-1.5 w-3/5 rounded bg-slate-200" />
      </div>
      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
        <Check className="h-3 w-3" /> Looks good
      </span>
    </div>
  );
}

function ShareDemo() {
  return (
    <div className="space-y-1.5">
      <span className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-2 py-1.5 text-[11px] font-semibold text-black">
        <Download className="h-3.5 w-3.5" /> Download PDF
      </span>
      <div className="grid grid-cols-3 gap-1.5">
        {(
          [
            [MessageCircle, "WhatsApp", "text-emerald-600"],
            [Mail, "Email", "text-sky-600"],
            [Printer, "Print", "text-slate-600"],
          ] as const
        ).map(([Icon, label, tone]) => (
          <span key={label} className="flex flex-col items-center gap-0.5 rounded-lg border border-slate-200 bg-white py-1.5 text-[10px] text-slate-500">
            <Icon className={`h-3.5 w-3.5 ${tone}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

const steps: Step[] = [
  { number: 1, icon: FileText, title: "Choose a document", description: "Pick the travel document you need — voucher, itinerary, ticket, transfer, placard or invoice.", demo: <ChooseDemo /> },
  { number: 2, icon: Pencil, title: "Enter your details", description: "Add booking, customer and pricing details — pick saved customers in one tap and watch the PDF update as you type.", demo: <DetailsDemo /> },
  { number: 3, icon: Eye, title: "Review your document", description: "Check everything in the preview before you create the final PDF.", demo: <ReviewDemo /> },
  { number: 4, icon: Download, title: "Generate and share", description: "Download a professional PDF, print it, or share it with your customer.", demo: <ShareDemo /> },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--primary)]">How It Works</p>
          <h2 className="mb-4 text-3xl font-bold text-[var(--foreground)] sm:text-4xl">Create, Download, Share.</h2>
          <p className="mx-auto max-w-xl text-[var(--muted-foreground)]">From selecting a document type to sharing a professional PDF — four simple steps.</p>
        </div>

        {/* Step track (large screens): numbered circles joined by a line */}
        <div aria-hidden className="relative mx-auto mb-8 hidden max-w-[calc(100%-12rem)] lg:block">
          <span className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-slate-200" />
          <span className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-gradient-to-r from-brand-500 to-brand-300" />
          <div className="relative flex justify-between">
            {steps.map((s) => (
              <span key={s.number} className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-black shadow-lg shadow-brand-500/30 ring-4 ring-slate-50">
                {s.number}
              </span>
            ))}
          </div>
        </div>

        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={step.number} className="h-full">
                <AnimatedCard delay={i * 120} className="h-full">
                <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-xl hover:shadow-black/5 motion-reduce:hover:translate-y-0">
                  {/* Big faint step number */}
                  <span aria-hidden className="pointer-events-none absolute right-4 top-2 select-none text-[5.5rem] font-extrabold leading-none text-slate-100 transition group-hover:text-brand-50">
                    {step.number}
                  </span>

                  <div className="relative flex items-center gap-3">
                    {/* Number badge (small screens, where the track above is hidden) */}
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-black lg:hidden">{step.number}</span>
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-500 group-hover:text-black">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--primary)]">Step {String(step.number).padStart(2, "0")}</span>
                  </div>

                  <h3 className="relative mt-4 text-lg font-semibold text-black">{step.title}</h3>
                  <p className="relative mt-1.5 flex-1 text-sm leading-relaxed text-slate-500">{step.description}</p>

                  {/* Mini demonstration of the step */}
                  <div aria-hidden className="relative mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    {step.demo}
                  </div>
                </div>
                </AnimatedCard>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
