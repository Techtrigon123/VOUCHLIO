"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import NumberFlow from "@number-flow/react";
import { Check, Lock, Star } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

/**
 * Pricing cards with a monthly / annual switch (shadcn "pricing" block, adapted for Vouchlio):
 * prices in rupees, a real yearly price instead of a discounted monthly one, free plans shown as
 * "Free", and the brand red for the confetti and highlights.
 */
export interface PricingPlan {
  name: string;
  /** null = free plan. */
  monthly: number | null;
  yearly: number | null;
  /** Shown ticked; `included: false` shows it greyed out with a lock. */
  features: { label: string; included?: boolean }[];
  /** Short extras under the divider. */
  extras?: string[];
  description: string;
  buttonText: string;
  /** Link target, or use `onSelect` for an in-page action (e.g. open checkout). */
  href?: string;
  onSelect?: () => void;
  buttonDisabled?: boolean;
  /** Small chip above the plan name, e.g. "Current plan". */
  tag?: string;
  /** Replaces the "billed monthly" line under the price. */
  priceNote?: string;
  isPopular?: boolean;
}

export type BillingCycle = "monthly" | "yearly";

interface PricingProps {
  plans: PricingPlan[];
  /** Heading above the switch; leave out when the page has its own. */
  title?: string;
  description?: string;
  /** e.g. "Save 17%". Hidden when empty. */
  annualSaving?: string;
  /** Control the billing cycle from the page (the dashboard checkout uses it); otherwise it starts monthly. */
  cycle?: BillingCycle;
  onCycleChange?: (cycle: BillingCycle) => void;
  /** False locks the switch on annual billing. */
  monthlyAvailable?: boolean;
}

const CONFETTI = ["#e63946", "#ff8a92", "#ffd166", "#ffffff"];
const inr = { style: "currency", currency: "INR", maximumFractionDigits: 0 } as const;

export function Pricing({ plans, title, description, annualSaving, cycle, onCycleChange, monthlyAvailable = true }: PricingProps) {
  const [ownMonthly, setOwnMonthly] = useState(true);
  const isMonthly = monthlyAvailable && (cycle ? cycle === "monthly" : ownMonthly);
  const setIsMonthly = (monthly: boolean) => (onCycleChange ? onCycleChange(monthly ? "monthly" : "yearly") : setOwnMonthly(monthly));
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const switchRef = useRef<HTMLButtonElement>(null);

  const handleToggle = (checked: boolean) => {
    setIsMonthly(!checked);
    if (!checked || !switchRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = switchRef.current.getBoundingClientRect();
    void confetti({
      particleCount: 50,
      spread: 60,
      origin: { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight },
      colors: CONFETTI,
      ticks: 200,
      gravity: 1.2,
      decay: 0.94,
      startVelocity: 30,
      shapes: ["circle"],
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      {title || description ? (
        <div className="mb-12 space-y-4 text-center">
          {title ? <h2 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">{title}</h2> : null}
          {description ? <p className="mx-auto max-w-2xl whitespace-pre-line text-lg text-[var(--muted-foreground)]">{description}</p> : null}
        </div>
      ) : null}

      <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
        <span className={cn("text-sm font-semibold", isMonthly ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]")}>Monthly</span>
        <Switch ref={switchRef} checked={!isMonthly} onCheckedChange={handleToggle} disabled={!monthlyAvailable} aria-label="Annual billing" />
        <span className={cn("text-sm font-semibold", !isMonthly ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]")}>
          Annual billing {annualSaving ? <span className="text-[var(--primary)]">({annualSaving})</span> : null}
        </span>
        {!monthlyAvailable ? <p className="w-full text-center text-xs text-[var(--muted-foreground)]">Monthly billing is coming soon.</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 [perspective:1400px] md:grid-cols-3">
        {plans.map((plan, index) => {
          const price = isMonthly ? plan.monthly : plan.yearly;
          return (
            <motion.div
              key={plan.name}
              initial={{ y: 50, opacity: 1 }}
              whileInView={
                isDesktop
                  ? { y: plan.isPopular ? -20 : 0, opacity: 1, x: index === 2 ? -30 : index === 0 ? 30 : 0, scale: index === 0 || index === 2 ? 0.94 : 1 }
                  : {}
              }
              viewport={{ once: true }}
              transition={{ duration: 1.6, type: "spring", stiffness: 100, damping: 30, delay: 0.4, opacity: { duration: 0.5 } }}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-[var(--background)] p-6 text-center",
                plan.isPopular ? "border-2 border-[var(--primary)] shadow-2xl shadow-brand-500/15" : "border-[var(--border)]",
                !plan.isPopular && "mt-5",
                index === 0 || index === 2 ? "z-0 md:-translate-z-[50px]" : "z-10",
                index === 0 && "origin-right md:rotate-y-[10deg]",
                index === 2 && "origin-left md:-rotate-y-[10deg]"
              )}
            >
              {plan.isPopular ? (
                <div className="absolute right-0 top-0 flex items-center rounded-bl-xl rounded-tr-xl bg-[var(--primary)] px-2 py-0.5">
                  <Star className="h-4 w-4 fill-current text-white" />
                  <span className="ml-1 text-sm font-semibold text-white">Popular</span>
                </div>
              ) : null}

              <div className="flex flex-1 flex-col">
                {plan.tag ? <span className="mx-auto mb-2 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">{plan.tag}</span> : null}
                <p className="text-base font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">{plan.name}</p>
                <div className="mt-6 flex items-center justify-center gap-x-2">
                  <span className="text-5xl font-bold tracking-tight text-[var(--foreground)]">
                    {price == null ? (
                      "Free"
                    ) : (
                      <NumberFlow value={price} locales="en-IN" format={inr} transformTiming={{ duration: 500, easing: "ease-out" }} willChange className="tabular-nums" />
                    )}
                  </span>
                  {price != null ? <span className="text-sm font-semibold leading-6 tracking-wide text-[var(--muted-foreground)]">/ {isMonthly ? "month" : "year"}</span> : null}
                </div>
                <p className="text-xs leading-5 text-[var(--muted-foreground)]">
                  {plan.priceNote ?? (price == null ? "Free forever · no card needed" : isMonthly ? "billed monthly · incl. GST" : "billed yearly · incl. GST")}
                </p>

                <ul className="mt-5 flex flex-col gap-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f.label} className={cn("flex items-start gap-2", f.included === false && "text-[var(--muted-foreground)] opacity-60")}>
                      {f.included === false ? <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />}
                      <span className="text-left">{f.label}</span>
                    </li>
                  ))}
                </ul>

                {plan.extras?.length ? (
                  <>
                    <hr className="my-4 w-full border-[var(--border)]" />
                    <ul className="flex flex-col gap-2 text-sm">
                      {plan.extras.map((e) => (
                        <li key={e} className="flex items-start gap-2 text-[var(--muted-foreground)]">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                          <span className="text-left">{e}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}

                <hr className="my-4 w-full border-[var(--border)]" />

                {(() => {
                  const cls = cn(
                    buttonVariants({ variant: "outline" }),
                    "group relative mt-auto h-11 w-full gap-2 overflow-hidden text-base font-semibold tracking-tight",
                    "transform-gpu transition-all duration-300 ease-out",
                    !plan.buttonDisabled && "hover:bg-[var(--primary)] hover:text-white hover:ring-2 hover:ring-[var(--primary)] hover:ring-offset-1",
                    plan.isPopular ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "bg-[var(--background)] text-[var(--foreground)]"
                  );
                  return plan.href && !plan.onSelect ? (
                    <Link href={plan.href} className={cls}>
                      {plan.buttonText}
                    </Link>
                  ) : (
                    <button type="button" onClick={plan.onSelect} disabled={plan.buttonDisabled} className={cls}>
                      {plan.buttonText}
                    </button>
                  );
                })()}
                <p className="mt-6 text-xs leading-5 text-[var(--muted-foreground)]">{plan.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default Pricing;
