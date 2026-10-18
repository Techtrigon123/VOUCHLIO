"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Check, Crown, ShieldCheck, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/agent/client";
import { PLANS, planName, renewalReminder, subscriptionState, type BillingCycle } from "@/lib/agent/plans";
import { useAgent } from "@/components/agent/AgentProvider";
import type { PlanId } from "@/lib/agent/types";

/** Set by the login form; the dashboard shows this offer right after signing in. */
export const OFFER_FLAG = "vouchlio-show-upgrade-offer";
/** Free (Silver) agents also see the offer once a day; this remembers the last day it showed. */
const DAILY_KEY = "vouchlio-upgrade-offer-day";

const istToday = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
function readDay(): string | null {
  try {
    return localStorage.getItem(DAILY_KEY);
  } catch {
    return istToday(); // storage blocked: treat as already shown, so it can't appear on every page
  }
}
function markShownToday() {
  try {
    localStorage.setItem(DAILY_KEY, istToday());
  } catch {
    /* ignore */
  }
}

type Prices = { gold: { monthly: number; yearly: number }; platinum: { monthly: number; yearly: number } };
interface PlanInfo {
  plan: PlanId;
  prices: Prices;
  monthlyAvailable: boolean;
  pending: unknown | null;
}

/** What each upgrade unlocks — written for travel agents. */
const PITCH: Record<"gold" | "platinum", { headline: string; lead: string; points: string[] }> = {
  gold: {
    headline: "Upgrade to Vouchlio Gold",
    lead: "Send cleaner, branded documents and never hit the monthly limit again.",
    points: [
      "Unlimited new documents — no 4-per-month cap",
      "Your logo on every PDF, with no watermark",
      "Proforma invoices and airline e-tickets with PNR",
      "Document history kept forever + priority support",
    ],
  },
  platinum: {
    headline: "Upgrade to Vouchlio Platinum",
    lead: "Every service, plus vouchers designed only for your agency.",
    points: [
      "All 8 services — itinerary builder, receipts, pickup vouchers and welcome placards",
      "Exclusive voucher layouts, colours and fonts",
      "Unlimited new documents with your logo on every PDF",
      "Dedicated onboarding and template revisions",
    ],
  },
};

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/**
 * Plan offer. Shown right after signing in, and once a day to free (Silver) agents, including ones
 * whose paid plan has fully ended (then it offers to renew that plan). Paid plans that are ending
 * soon or in their grace period get RenewalPopup instead, so the two never stack.
 */
export default function UpgradePopup() {
  const { agent } = useAgent();
  const [info, setInfo] = useState<PlanInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [cycle, setCycle] = useState<BillingCycle>("yearly");
  const [renewPlan, setRenewPlan] = useState<"gold" | "platinum" | null>(null);
  const checked = useRef(false);

  useEffect(() => {
    if (!agent || checked.current) return;
    checked.current = true;
    let flagged = false;
    try {
      flagged = sessionStorage.getItem(OFFER_FLAG) === "1";
      sessionStorage.removeItem(OFFER_FLAG);
    } catch {
      /* storage blocked — rely on the daily check */
    }
    const sub = agent.subscription ?? subscriptionState(agent);
    if (renewalReminder(sub)) return; // RenewalPopup handles plans that are ending
    const free = sub.plan === "silver";
    if (!flagged && !(free && readDay() !== istToday())) return;
    let live = true;
    void api<PlanInfo>("/api/agent/plan").then((r) => {
      // Nothing to offer on Platinum, or while a payment is being reviewed.
      if (!live || !r.success || !r.data || r.data.plan === "platinum" || r.data.pending) return;
      setInfo(r.data);
      setRenewPlan(sub.status === "lapsed" ? sub.paidPlan : null);
      setCycle(sub.status === "lapsed" && sub.cycle ? sub.cycle : r.data.monthlyAvailable ? "monthly" : "yearly");
      window.setTimeout(() => {
        if (!live) return;
        setOpen(true);
        if (free) markShownToday();
      }, 600);
    });
    return () => {
      live = false;
    };
  }, [agent]);

  if (!info) return null;
  const target: "gold" | "platinum" = renewPlan ?? (info.plan === "gold" ? "platinum" : "gold");
  const pitch = renewPlan
    ? { ...PITCH[target], headline: `Your ${planName(target)} plan has ended`, lead: `Renew ${planName(target)} to unlock your documents and services again — your saved work is waiting.` }
    : PITCH[target];
  const plan = PLANS.find((p) => p.id === target)!;
  const price = info.prices[target];
  const save = Math.max(0, Math.round((1 - price.yearly / (price.monthly * 12)) * 100));
  const amount = price[cycle];
  const perMonth = cycle === "yearly" ? Math.round(price.yearly / 12) : price.monthly;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="anim-fade fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" />
        <DialogPrimitive.Content className="anim-pop fixed left-1/2 top-1/2 z-[80] max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-white/10 bg-[#0e0f12] text-white shadow-2xl shadow-black/50">
          {/* Header band */}
          <div className="sticky top-0 z-10 border-b border-white/5 bg-[#16120f]/95 px-6 py-6 text-center backdrop-blur sm:px-12">
            <DialogPrimitive.Title className="text-2xl font-bold tracking-tight sm:text-4xl">{pitch.headline}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-2 text-sm text-white/75 sm:text-lg">
              <span className="font-semibold text-[#ff6b75]">{plan.highlights[0]?.value} services</span> and{" "}
              <span className="font-semibold text-[#ff6b75]">{plan.highlights[1]?.value.toLowerCase()} documents</span> · pay by UPI · no auto-renewal.
            </DialogPrimitive.Description>
            <DialogPrimitive.Close aria-label="Close" className="absolute right-4 top-4 rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="grid gap-5 p-5 sm:p-8 lg:grid-cols-2">
            {/* Left: what you get */}
            <div className="flex flex-col rounded-2xl border border-[#e63946]/25 bg-gradient-to-b from-[#1d1214] to-[#131315] p-6">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#e63946]/40 bg-[#e63946]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#ff8a92]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ff6b75]" /> {planName(target)} plan
              </span>
              <p className="mt-4 text-[15px] leading-relaxed text-white/80">{pitch.lead}</p>
              <ul className="mt-5 space-y-3">
                {pitch.points.map((p) => (
                  <li key={p} className="flex items-center gap-3 rounded-xl border border-[#e63946]/20 bg-white/[0.03] p-3.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e63946]/40 bg-[#e63946]/15 text-[#ff8a92]">
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium text-white/90">{p}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-5 text-xs text-white/55">
                <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-[#ff8a92]" /> Built for Indian travel agents</span>
                <span className="flex items-center gap-1.5"><Crown className="h-3.5 w-3.5 text-[#ff8a92]" /> Upgrade or switch anytime</span>
              </div>
            </div>

            {/* Right: price and checkout */}
            <div className="flex flex-col rounded-2xl border border-white/10 bg-[#131315] p-5 sm:p-6">
              {info.monthlyAvailable ? (
                <div className="mx-auto flex w-fit items-center gap-1 rounded-full border border-white/10 bg-black/40 p-1">
                  {(["monthly", "yearly"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCycle(c)}
                      aria-pressed={cycle === c}
                      className={cn("flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition", cycle === c ? "bg-white text-black" : "text-white/60 hover:text-white")}
                    >
                      {c === "monthly" ? "Monthly" : "Yearly"}
                      {c === "yearly" && save > 0 ? <span className="rounded-full bg-[#e63946] px-2 py-0.5 text-[10px] font-bold text-black">SAVE {save}%</span> : null}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="mt-5 rounded-2xl border border-[#e63946]/25 bg-gradient-to-b from-[#1a1214] to-[#111113] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff8a92]">{planName(target)} · {cycle}</p>
                <p className="mt-1 text-2xl font-bold sm:text-3xl">{cycle === "monthly" ? "Monthly" : "Yearly"} plan</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {plan.highlights.slice(0, 2).map((h, i) => (
                    <span key={h.label} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold", i === 0 ? "bg-[#e63946] text-black shadow-[0_0_24px_-4px_rgba(230,57,70,0.7)]" : "border border-white/15 text-white/85")}>
                      <Check className="h-3.5 w-3.5" /> {h.value} {h.label.toLowerCase()}
                    </span>
                  ))}
                </div>
                <div className="mt-5 rounded-xl border border-white/5 bg-black/50 p-5">
                  <p className="flex items-baseline gap-2">
                    <span className="bg-gradient-to-r from-white to-[#ff8a92] bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl">{fmt(amount)}</span>
                    <span className="text-lg text-white/50">/{cycle === "monthly" ? "mo" : "yr"}</span>
                  </p>
                  <p className="mt-1 text-sm text-white/50">
                    {cycle === "yearly" ? `That's ${fmt(perMonth)} a month · ` : ""}GST inclusive · no auto-renewal
                  </p>
                </div>
              </div>

              <Link
                href={`/dashboard/pricing?plan=${target}&cycle=${cycle}`}
                onClick={() => setOpen(false)}
                className="mt-5 flex h-14 w-full items-center justify-center rounded-full bg-[#e63946] text-base font-bold text-black shadow-[0_10px_40px_-8px_rgba(230,57,70,0.7)] transition hover:bg-[#ec5662]"
              >
                {renewPlan ? "Renew" : "Upgrade to"} {planName(target)}
              </Link>
              <p className="mt-2 text-center text-xs text-white/50">
                Pay {fmt(amount)} by UPI · activated once we verify your payment
              </p>
              <button type="button" onClick={() => setOpen(false)} className="mx-auto mt-2 text-xs font-semibold text-white/60 hover:text-white">
                Maybe later
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 px-6 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div>
              <p className="font-semibold">Compare every plan side by side</p>
              <Link href="/dashboard/pricing" onClick={() => setOpen(false)} className="text-xs text-[#ff8a92] hover:underline">
                See Silver, Gold and Platinum →
              </Link>
            </div>
            <p className="flex items-center gap-2 text-white/75">
              <ShieldCheck className="h-5 w-5 text-white/60" /> Secure UPI payment · verified by our team
            </p>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
