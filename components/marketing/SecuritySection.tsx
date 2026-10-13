import React from "react";
import { Cloud, Gauge, Lock, ShieldCheck, Shield, Users, type LucideIcon } from "lucide-react";

/**
 * Trust strip before pricing. Every point here is true of the product today:
 * HTTPS + HTTP-only sign-in, row-level-secured database, per-agency data, no data selling.
 */
const POINTS: { icon: LucideIcon; label: string; detail: string }[] = [
  { icon: Shield, label: "Privacy first", detail: "No ads and no tracking cookies" },
  { icon: Lock, label: "Encrypted in transit", detail: "HTTPS everywhere, secure sign-in" },
  { icon: Cloud, label: "Cloud storage", detail: "Your documents, safe and backed up" },
  { icon: Gauge, label: "Fast & reliable", detail: "PDFs ready in seconds" },
  { icon: Users, label: "Built for travel pros", detail: "Agents, agencies and DMCs" },
  { icon: ShieldCheck, label: "Your data stays yours", detail: "Only your account can see it" },
];

export default function SecuritySection() {
  return (
    <section id="security" className="bg-white px-4 pb-24 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#0b0b0c] px-6 ring-1 ring-white/10 py-14 text-center sm:px-10">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-64 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e63946]/25 blur-3xl" />

        <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
          <Shield className="h-7 w-7 fill-white text-white" />
        </span>
        <p className="relative mt-5 text-sm font-semibold uppercase tracking-wider text-[#ff6b75]">Security</p>
        <h2 className="relative mt-2 text-3xl font-bold text-white sm:text-4xl">Safe &amp; secure</h2>
        <p className="relative mx-auto mt-3 max-w-xl text-lg text-white/75">Your data. Your business. Fully protected.</p>

        <ul className="relative mt-10 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-3">
          {POINTS.map(({ icon: Icon, label, detail }) => (
            <li key={label} className="flex items-center gap-3 rounded-full border border-white/15 bg-white/[0.06] px-5 py-3 transition-colors hover:border-[#e63946]/60 hover:bg-white/[0.09]">
              <Icon className="h-5 w-5 shrink-0 text-[#ff6b75]" />
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-white">{label}</span>
                <span className="block truncate text-xs text-white/55">{detail}</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="relative mt-8 inline-flex items-center gap-2 text-sm text-white/75">
          <ShieldCheck className="h-4 w-4 text-[#ff6b75]" /> We never sell your information
        </p>
      </div>
    </section>
  );
}
