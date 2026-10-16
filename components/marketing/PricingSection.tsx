import React from "react";
import Link from "next/link";
import { Pricing, type PricingPlan } from "@/components/ui/pricing";
import { ALL_SERVICES, GRACE_DAYS, PLANS, SERVICE_LABELS } from "@/lib/agent/plans";
import { getAppSettings } from "@/lib/settings";

/** Homepage pricing: live prices from Vouchlio Admin → Settings, shown in the animated pricing cards. */
export default async function PricingSection() {
  const { pricing } = await getAppSettings();
  const plans = PLANS.map((p) => (p.id === "silver" ? p : { ...p, prices: pricing[p.id] }));

  // The best yearly saving against paying monthly for twelve months, e.g. "Save up to 17%".
  const savings = plans.flatMap((p) => (p.prices ? [Math.round((1 - p.prices.yearly / (p.prices.monthly * 12)) * 100)] : [])).filter((n) => n > 0);
  const best = savings.length ? Math.max(...savings) : 0;
  const annualSaving = best ? `Save ${savings.every((n) => n === best) ? "" : "up to "}${best}%` : undefined;

  const cards: PricingPlan[] = plans.map((p) => ({
    name: p.name,
    monthly: p.prices?.monthly ?? null,
    yearly: p.prices?.yearly ?? null,
    features: ALL_SERVICES.map((k) => ({ label: SERVICE_LABELS[k], included: p.services.includes(k) })),
    extras: [...p.highlights.filter((h) => h.label !== "Services").map((h) => `${h.value} ${h.label.toLowerCase()}`), ...p.features],
    description: p.headline,
    buttonText: p.prices == null ? "Start free" : `Start free, upgrade to ${p.name}`,
    href: "/signup",
    isPopular: !!p.featured,
  }));

  return (
    <section id="pricing" className="overflow-hidden bg-white py-24">
      <p className="mb-3 text-center text-sm font-semibold uppercase tracking-wider text-[var(--primary)]">Pricing</p>
      <Pricing
        plans={cards}
        title="Simple pricing, monthly or yearly"
        description={"Start free on Silver. Upgrade to Gold or Platinum from your dashboard whenever you're ready."}
        annualSaving={annualSaving}
      />
      <p className="mx-auto mt-10 max-w-3xl px-4 text-center text-sm text-[var(--muted-foreground)]">
        Paid plans are paid by UPI and activated once we verify your payment. When a plan ends you get a {GRACE_DAYS.monthly}-day (monthly) or {GRACE_DAYS.yearly}-day (yearly) grace period to renew. See our{" "}
        <Link href="/refunds" className="underline underline-offset-2 hover:text-[var(--foreground)]">
          Refund Policy
        </Link>
        .
      </p>
    </section>
  );
}
