import React from "react";
import Link from "next/link";
import { AlignLeft, ArrowLeftRight, ArrowRight, Check, Keyboard, Layers, Repeat, Shuffle, type LucideIcon } from "lucide-react";
import AnimatedCard from "@/components/ui/AnimatedCard";
import TiltCard from "@/components/marketing/TiltCard";

/**
 * "The problem": six everyday pain points, each paired with how Vouchlio removes it,
 * then a short closing band. Same hover motion as the other home-page cards (tilt + spotlight).
 * Every "fix" line describes something the product does today.
 */
const PAINS: { pain: string; fix: string; icon: LucideIcon }[] = [
  { pain: "Recreating the same documents for every booking", fix: "Your business details fill in automatically on every document", icon: Repeat },
  { pain: "Switching between Word, Excel and PDF tools", fix: "Create, preview and download every PDF in one place", icon: ArrowLeftRight },
  { pain: "Maintaining templates across different formats", fix: "One ready-made template for each of 8 document types", icon: Layers },
  { pain: "Typing customer and booking details again and again", fix: "Save customers once, or upload a voucher to auto-fill", icon: Keyboard },
  { pain: "Losing time formatting and fixing layouts", fix: "Layouts are done for you, so you only fill in the details", icon: AlignLeft },
  { pain: "Sending documents that all look different", fix: "Every PDF carries your logo, stamp and business details", icon: Shuffle },
];

function PainCard({ pain, fix, icon: Icon, index }: { pain: string; fix: string; icon: LucideIcon; index: number }) {
  return (
    <TiltCard
      glow="rgba(0,0,0,0.04)"
      className="h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-black/5 transition-colors hover:border-brand-300"
    >
      <div className="relative z-[2] flex h-full flex-col">
        <div className="flex items-center justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50 text-brand-600 transition duration-300 group-hover:-translate-y-1 group-hover:bg-brand-500 group-hover:text-black">
            <Icon className="h-5 w-5" />
          </span>
          <span className="text-xs font-bold tabular-nums text-slate-300 transition group-hover:text-brand-600">0{index + 1}</span>
        </div>
        <p className="mt-5 text-[15px] font-semibold leading-snug text-slate-900">{pain}</p>
        <div className="mt-auto pt-5">
          <p className="flex items-start gap-2 border-t border-slate-100 pt-4 text-sm leading-snug text-slate-600">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white">
              <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
            </span>
            {fix}
          </p>
        </div>
      </div>
    </TiltCard>
  );
}

export default function ProblemSection() {
  return (
    <section id="problem" className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--primary)]">The Problem</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] sm:text-4xl">Stop creating travel documents manually.</h2>
          <p className="mt-4 text-[var(--muted-foreground)]">
            Your travel business already has enough to manage. Document preparation shouldn&apos;t slow you down.
          </p>
        </div>

        <div className="grid gap-5 [perspective:1200px] sm:grid-cols-2 lg:grid-cols-3">
          {PAINS.map((p, i) => (
            <AnimatedCard key={p.pain} delay={i * 80} className="h-full">
              <PainCard pain={p.pain} fix={p.fix} icon={p.icon} index={i} />
            </AnimatedCard>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-5 rounded-3xl bg-[#0b0b0c] px-7 py-6 text-center ring-1 ring-white/10 sm:flex-row sm:text-left">
          <p className="text-lg font-semibold text-white">
            Six problems, one workspace. <span className="font-normal text-white/70">Branded travel documents in minutes, not hours.</span>
          </p>
          <Link href="/signup" className="btn-glow inline-flex h-11 shrink-0 items-center gap-2 rounded-xl px-6 text-sm">
            Start free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
