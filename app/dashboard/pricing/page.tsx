"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BackButton } from "@/components/ui/back-button";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Check, ChevronDown, CreditCard, Crown, FileUp, Loader2, Lock, PartyPopper, Pencil, QrCode, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAgent } from "@/components/agent/AgentProvider";
import { Field, Modal, PageShell, TextInput, primaryBtn, secondaryBtn } from "@/components/agent/ui";
import { api, fileToDataUrl } from "@/lib/agent/client";
import {
  ALL_SERVICES,
  formatInr,
  GRACE_DAYS,
  isBillingCycle,
  isPaidPlan,
  PLAN_COMPARISON,
  PLAN_PRICES_INR,
  PLANS,
  pricingFaq,
  SERVICE_LABELS,
  subscriptionState,
  type BillingCycle,
  type PaidPlanId,
  type SubscriptionState,
} from "@/lib/agent/plans";
import type { PlanId } from "@/lib/agent/types";
import { PaymentDetailsSkeleton } from "@/components/agent/skeletons";
import { Pricing } from "@/components/ui/pricing";
import { loadRazorpay, openRazorpay, type RazorpaySuccess } from "@/lib/payments/checkout-client";

interface PendingPayment {
  id: string;
  planId: PaidPlanId;
  billingCycle?: BillingCycle;
  amountInr: number;
  paymentTransactionId: string;
  proof: string;
  proofType: string;
  createdAt: string;
}

interface PlanInfo {
  plan: PlanId;
  subscriptionExpiresAt: string | null;
  subscription?: SubscriptionState;
  /** False until migration 0005 is run — then only yearly can be bought. */
  monthlyAvailable?: boolean;
  pending: PendingPayment | null;
  paymentConfig?: { planId: PaidPlanId; planName: string; cycle: BillingCycle; amountInr: number; upiId: string | null; payee: string; qr: string | null };
  /** Live prices (set by admins); falls back to PLAN_PRICES_INR. */
  prices?: Record<PaidPlanId, Record<BillingCycle, number>>;
  /** Ways to pay right now: Razorpay online checkout and/or UPI + proof upload. */
  methods?: { online: boolean; manualUpi: boolean };
}

interface RazorpayOrder {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
}

interface PaidResult {
  plan: string;
  cycle: string;
  expiresAt: string | null;
  paymentId: string;
}


const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** Yearly saving against paying monthly for 12 months, as a whole percentage. */
const yearlySaving = (plan: PaidPlanId, prices: Record<PaidPlanId, Record<BillingCycle, number>> = PLAN_PRICES_INR) => {
  const { monthly, yearly } = prices[plan];
  return Math.round((1 - yearly / (monthly * 12)) * 100);
};

function Cell({ value }: { value: boolean | string }) {
  if (typeof value === "string") return <span className="text-xs font-medium text-slate-700">{value}</span>;
  return value ? (
    <span aria-label="Included" className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-600"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>
  ) : (
    <span aria-label="Not included" className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400"><X className="h-3.5 w-3.5" /></span>
  );
}

export default function PricingPage() {
  const { agent, refresh } = useAgent();
  const router = useRouter();
  const params = useSearchParams();
  const [info, setInfo] = useState<PlanInfo | null>(null);
  const [checkout, setCheckout] = useState<PaidPlanId | null>(null);
  const [pickedCycle, setCycle] = useState<BillingCycle>(() => {
    const c = params.get("cycle");
    return isBillingCycle(c) ? c : "yearly";
  });
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  useEffect(() => {
    void api<PlanInfo>("/api/agent/plan").then((r) => r.success && r.data && setInfo(r.data));
  }, []);

  // Open checkout when the URL asks for a plan (?plan=gold), including later in-page navigations.
  const planParam = params.get("plan") ?? "";
  const [seenPlanParam, setSeenPlanParam] = useState("");
  if (planParam !== seenPlanParam) {
    setSeenPlanParam(planParam);
    if (isPaidPlan(planParam)) setCheckout(planParam);
  }

  const prices = info?.prices ?? PLAN_PRICES_INR;
  const monthlyAvailable = info?.monthlyAvailable !== false;
  const cycle: BillingCycle = monthlyAvailable ? pickedCycle : "yearly";

  if (!agent) return null;
  const sub = info?.subscription ?? agent.subscription ?? subscriptionState(agent);
  const current = sub.plan;

  return (
    <PageShell wide>
      <BackButton fallback="/dashboard" className="mb-4" />
      <section className="relative overflow-hidden rounded-[2rem] border border-brand-100 bg-white px-6 py-10 text-center sm:px-10">
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-brand-200/40 blur-3xl" aria-hidden />
        <p className="relative text-[11px] font-semibold uppercase tracking-widest text-brand-600">Built for travel agents who mean business</p>
        <h1 className="relative mx-auto mt-2 max-w-3xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Send vouchers &amp; tickets your clients actually trust</h1>
        <p className="relative mx-auto mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
          Hotel vouchers, invoices, air tickets, pickup PDFs &amp; welcome placards — create in minutes, not hours. Start free on Silver. Upgrade when your agency is ready to grow.
        </p>
        {info?.pending ? (
          <p className="relative mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-medium text-amber-800">
            <Loader2 className="h-4 w-4 animate-spin" /> Your {info.pending.planId} {info.pending.billingCycle ?? "yearly"} payment is under review.
          </p>
        ) : sub.status === "grace" ? (
          <p role="status" className="relative mx-auto mt-4 flex max-w-2xl items-start gap-2 rounded-2xl bg-amber-100 px-4 py-2.5 text-left text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Your <strong className="capitalize">{sub.paidPlan}</strong> plan ended on {fmtDate(sub.expiresAt!)}. You&apos;re in the {GRACE_DAYS[sub.cycle ?? "yearly"]}-day grace period
              until {fmtDate(sub.graceEndsAt!)} ({sub.daysLeft} day{sub.daysLeft === 1 ? "" : "s"} left) — renew monthly or yearly below and your new term continues from your old end date.
            </span>
          </p>
        ) : sub.status === "lapsed" ? (
          <p role="status" className="relative mx-auto mt-4 flex max-w-2xl items-start gap-2 rounded-2xl bg-slate-100 px-4 py-2.5 text-left text-sm text-slate-700">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Your <strong className="capitalize">{sub.paidPlan}</strong> plan ended on {fmtDate(sub.expiresAt!)} and you&apos;re on Silver now. Your saved documents are kept — renew to unlock them.
            </span>
          </p>
        ) : null}
      </section>

      <div className="mt-10">
        <Pricing
          cycle={cycle}
          onCycleChange={setCycle}
          monthlyAvailable={monthlyAvailable}
          annualSaving={`Save up to ${Math.max(yearlySaving("gold", prices), yearlySaving("platinum", prices))}%`}
          plans={PLANS.map((p) => {
            const isCurrent = p.id === current;
            const paidId = p.id === "silver" ? null : (p.id as PaidPlanId);
            return {
              name: p.name,
              monthly: paidId ? prices[paidId].monthly : null,
              yearly: paidId ? prices[paidId].yearly : null,
              features: ALL_SERVICES.map((k) => ({ label: SERVICE_LABELS[k], included: p.services.includes(k) })),
              extras: [...p.highlights.filter((h) => h.label !== "Services").map((h) => `${h.value} ${h.label.toLowerCase()}`), ...p.features],
              description: p.headline,
              tag: isCurrent ? "Current plan" : undefined,
              priceNote: !paidId
                ? "No subscription · no credit card"
                : cycle === "yearly"
                  ? `Save ${yearlySaving(paidId, prices)}% vs monthly · ${GRACE_DAYS.yearly}-day grace period`
                  : `Billed monthly · ${GRACE_DAYS.monthly}-day grace period`,
              buttonText: !paidId ? (isCurrent ? "Your current plan" : "Included") : info?.pending?.planId === p.id ? "View payment" : p.id === sub.paidPlan ? `Renew ${cycle}` : p.cta,
              onSelect: paidId ? () => setCheckout(paidId) : undefined,
              buttonDisabled: !paidId,
              isPopular: !!p.featured,
            };
          })}
        />
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">All prices in INR · GST inclusive · No auto-renew — you pay again only when you choose to</p>

      <section className="mt-12">
        <h2 className="text-center text-2xl font-bold text-slate-900">Compare plans</h2>
        <p className="mt-1 text-center text-sm text-slate-500">See exactly what you get at every tier.</p>
        <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200 bg-white">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-5 py-4 font-semibold text-slate-500">Feature</th>
                {PLANS.map((p) => (
                  <th key={p.id} className={cn("px-3 py-4 text-center font-bold", p.featured ? "text-brand-600" : "text-slate-900")}>{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PLAN_COMPARISON.map((row) => (
                <tr key={row.label}>
                  <td className="px-5 py-3 text-slate-700">{row.label}</td>
                  <td className="px-3 py-3 text-center"><Cell value={row.silver} /></td>
                  <td className="bg-brand-50/40 px-3 py-3 text-center"><Cell value={row.gold} /></td>
                  <td className="px-3 py-3 text-center"><Cell value={row.platinum} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-3xl">
        <h2 className="text-center text-2xl font-bold text-slate-900">Pricing questions</h2>
        <div className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-3xl border border-slate-200 bg-white">
          {pricingFaq(prices).map((f, i) => (
            <div key={f.q}>
              <button type="button" onClick={() => setFaqOpen(faqOpen === i ? null : i)} aria-expanded={faqOpen === i} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-medium text-slate-900 hover:bg-slate-50">
                {f.q}
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition", faqOpen === i && "rotate-180")} />
              </button>
              {faqOpen === i ? <p className="px-5 pb-4 text-sm text-slate-600">{f.a}</p> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-3xl border border-slate-200 bg-white px-6 py-8 text-center text-black shadow-sm">
        <h2 className="text-2xl font-bold">Ready to look more professional?</h2>
        <p className="mt-1 text-slate-500">Start free on Silver. Upgrade to Gold or Platinum when your business is ready.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link href="/dashboard" className="btn-glow inline-flex h-10 items-center rounded-xl px-5 text-sm">Go to workspace</Link>
          <Link href="/contact" className="inline-flex h-10 items-center rounded-xl bg-white px-5 text-sm font-semibold text-black ring-1 ring-slate-200 hover:ring-brand-300">Talk to sales</Link>
        </div>
      </section>

      {checkout ? (
        <CheckoutDialog
          planId={checkout}
          prices={prices}
          cycle={cycle}
          monthlyAvailable={monthlyAvailable}
          pending={info?.pending?.planId === checkout ? info.pending : null}
          onClose={() => {
            setCheckout(null);
            if (params.get("plan")) router.replace("/dashboard/pricing");
          }}
          onSubmitted={(p) => setInfo((i) => (i ? { ...i, pending: p } : i))}
          onPaid={async () => {
            // The plan is already active on the server; refresh the badge, sidebar and this page.
            await refresh();
            const r = await api<PlanInfo>("/api/agent/plan");
            if (r.success && r.data) setInfo(r.data);
          }}
        />
      ) : null}
    </PageShell>
  );
}

function CheckoutDialog({
  planId,
  prices,
  cycle: initialCycle,
  monthlyAvailable,
  pending,
  onClose,
  onSubmitted,
  onPaid,
}: {
  planId: PaidPlanId;
  prices: Record<PaidPlanId, Record<BillingCycle, number>>;
  cycle: BillingCycle;
  monthlyAvailable: boolean;
  pending: PendingPayment | null;
  onClose: () => void;
  onSubmitted: (p: PendingPayment) => void;
  onPaid: () => Promise<void>;
}) {
  const [cycle, setCycle] = useState<BillingCycle>(pending?.billingCycle ?? (monthlyAvailable ? initialCycle : "yearly"));
  const [config, setConfig] = useState<PlanInfo["paymentConfig"] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState<"checkout" | "submitted" | "edit" | "paid">(pending ? "submitted" : "checkout");
  const [methods, setMethods] = useState<PlanInfo["methods"] | null>(null);
  const [, setChoice] = useState<"online" | "upi" | null>(null);
  const [paying, setPaying] = useState<"" | "opening" | "verifying">("");
  const [paid, setPaid] = useState<PaidResult | null>(null);
  const [saved, setSaved] = useState<PendingPayment | null>(pending);
  const [txn, setTxn] = useState(pending?.paymentTransactionId ?? "");
  const [proof, setProof] = useState<{ dataUrl: string; name: string; type: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void api<PlanInfo>(`/api/agent/plan?plan=${planId}&cycle=${cycle}`).then((r) => {
      if (cancelled) return;
      if (r.success && r.data?.paymentConfig) {
        setConfig(r.data.paymentConfig);
        setMethods(r.data.methods ?? { online: false, manualUpi: true });
      }
      else setLoadError(r.error?.message || "Could not load payment details");
    });
    return () => {
      cancelled = true;
    };
  }, [planId, cycle]);

  const name = config?.planName ?? (planId === "gold" ? "Gold" : "Platinum");
  const editing = mode === "edit";
  // New payments go through Razorpay only. The UPI + proof form is kept just for editing a proof already submitted.
  const payWith: "online" | "upi" = editing ? "upi" : "online";
  const noMethod = !!methods && !methods.online && !methods.manualUpi;
  const amountDue = config?.cycle === cycle ? config.amountInr : prices[planId][cycle];

  const finishOnline = async (res: RazorpaySuccess) => {
    setPaying("verifying");
    const v = await api<PaidResult>("/api/agent/plan/razorpay/verify", { method: "POST", json: res });
    setPaying("");
    if (!v.success || !v.data) {
      setError(v.error?.message || "We couldn't confirm your payment. Please contact support with your payment ID.");
      return;
    }
    setPaid(v.data);
    setMode("paid");
    toast.success("Payment successful", { description: `Your ${name} plan is active.` });
    await onPaid();
  };

  const payOnline = async () => {
    setError("");
    setPaying("opening");
    const [order, ready] = await Promise.all([
      api<RazorpayOrder>("/api/agent/plan/razorpay/order", { method: "POST", json: { planId, billingCycle: cycle } }),
      loadRazorpay(),
    ]);
    if (!order.success || !order.data) {
      setPaying("");
      return setError(order.error?.message || "Couldn't start the payment. Please try again.");
    }
    if (!ready) {
      setPaying("");
      return setError("The payment window couldn't load. Check your internet connection, or turn off ad blockers for this site, and try again.");
    }
    const o = order.data;
    const opened = openRazorpay(
      {
        key: o.keyId,
        order_id: o.orderId,
        amount: o.amount,
        currency: o.currency,
        name: "Vouchlio",
        description: o.description,
        image: `${window.location.origin}/logo-mark.png`,
        prefill: o.prefill,
        theme: { color: "#e63946" },
        retry: { enabled: true, max_count: 3 },
        modal: { confirm_close: true, ondismiss: () => setPaying((p) => (p === "opening" ? "" : p)) },
        handler: (res) => void finishOnline(res),
      },
      (f) => setError(f.error?.description ? `Payment failed: ${f.error.description}. You can try again with another method.` : "Payment failed. You can try again with another method.")
    );
    if (!opened) {
      setPaying("");
      setError("The payment window couldn't open. Please refresh the page and try again.");
    }
  };

  const pickProof = async (f: File) => {
    if (!/^(image\/|application\/pdf)/.test(f.type)) return setError("Upload an image or PDF of your payment.");
    if (f.size > 3 * 1024 * 1024) return setError("File is larger than 3 MB.");
    setError("");
    setProof({ dataUrl: await fileToDataUrl(f), name: f.name, type: f.type });
  };

  const submit = async () => {
    setError("");
    if (!txn.trim()) return setError("Please enter the transaction ID from your payment app.");
    if (!editing && !proof) return setError("Please upload a screenshot of your payment.");
    setBusy(true);
    const r = await api<PendingPayment>("/api/agent/plan/submit", {
      method: "POST",
      json: { planId, billingCycle: cycle, paymentTransactionId: txn.trim(), proof: proof?.dataUrl },
    });
    setBusy(false);
    if (!r.success || !r.data) return setError(r.error?.message || "Upload failed. Please try again.");
    setSaved(r.data);
    onSubmitted(r.data);
    setProof(null);
    setMode("submitted");
    toast.success(editing ? "Payment details updated." : "Payment proof received", {
      description: "We will verify it and activate your plan on your account shortly.",
    });
  };

  return (
    <Modal
      open
      onOpenChange={(v) => !v && onClose()}
      size="md"
      title={mode === "paid" ? "Payment successful" : mode === "submitted" ? "Payment proof received" : editing ? `Edit ${name} payment` : `Choose ${name}`}
      description={
        mode === "paid"
          ? "Thank you! Your plan is active right away."
          : mode === "submitted"
            ? "Your payment is under review. You can view your details below or edit them if needed."
            : editing
              ? "Update your transaction ID or upload a new payment screenshot."
              : payWith === "online"
                ? "Pay securely with UPI, card, net banking or wallet. Your plan activates as soon as the payment goes through."
                : "Pay using the details below, enter your transaction ID, and upload a screenshot of your payment."
      }
    >
      {mode === "paid" && paid ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><PartyPopper className="h-4 w-4" /> {name} · {paid.cycle === "monthly" ? "Monthly" : "Yearly"} · Active</p>
            {paid.expiresAt ? <p className="mt-1 text-xs text-emerald-700">Valid until {fmtDate(paid.expiresAt)}</p> : null}
          </div>
          <div>
            <p className="text-xs text-slate-500">Payment ID</p>
            <p className="font-mono text-sm font-semibold text-slate-900">{paid.paymentId}</p>
            <p className="mt-1 text-xs text-slate-500">Razorpay also emails you a receipt. Keep the payment ID for any questions.</p>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className={primaryBtn}>Start using {name}</button>
          </div>
        </div>
      ) : mode === "submitted" && saved ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><Crown className="h-4 w-4" /> {name} · {saved.billingCycle === "monthly" ? "Monthly" : "Yearly"} · {formatInr(saved.amountInr)}</p>
            <p className="mt-1 text-xs text-emerald-700">Submitted {new Date(saved.createdAt).toLocaleString("en-IN")}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Transaction ID</p>
            <p className="font-mono text-sm font-semibold text-slate-900">{saved.paymentTransactionId || "—"}</p>
          </div>
          <div>
            <p className="mb-1 text-xs text-slate-500">Payment screenshot</p>
            {saved.proofType === "application/pdf" ? (
              <a href={saved.proof} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-600 hover:underline">View uploaded proof</a>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={saved.proof} alt="Uploaded payment proof" className="max-h-56 rounded-xl border border-slate-200" />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setMode("edit")} className={secondaryBtn}><Pencil className="h-4 w-4" /> Edit</button>
            <button type="button" onClick={onClose} className={primaryBtn}>Done</button>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {/* UPI + proof tab hidden for now — payments go straight to Razorpay. Re-enable with: !editing && methods?.online && methods.manualUpi */}
          {false ? (
            <div role="tablist" aria-label="Payment method" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              {([
                ["online", "Pay online", CreditCard],
                ["upi", "UPI + upload proof", QrCode],
              ] as const).map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={payWith === key}
                  onClick={() => {
                    setChoice(key);
                    setError("");
                  }}
                  className={cn("inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition", payWith === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          ) : null}
          {!editing && noMethod ? (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Payments are paused for a moment. Please contact support to upgrade.</p>
          ) : !editing && payWith === "online" && !loadError ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Amount due ({cycle === "monthly" ? "1 month" : "1 year"} · GST inclusive)</p>
              <p className="text-2xl font-bold text-slate-900">{formatInr(amountDue)}</p>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> UPI, cards, net banking &amp; wallets · Secured by Razorpay
              </p>
            </div>
          ) : !editing ? (
            loadError ? (
              <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{loadError}</p>
            ) : !config || config.cycle !== cycle ? (
              <PaymentDetailsSkeleton />
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Amount due ({config.cycle === "monthly" ? "1 month" : "1 year"} · GST inclusive)</p>
                <p className="text-2xl font-bold text-slate-900">{formatInr(config.amountInr)}</p>
                {config.qr ? (
                  <div className="mt-3 flex flex-col items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-brand-100 sm:flex-row sm:items-start">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={config.qr} alt={`Payment QR for ${name} plan`} className="h-40 w-40" />
                    <div className="text-sm text-slate-600">
                      <p className="font-medium text-slate-900">Scan with any UPI app (GPay, PhonePe, Paytm, etc.)</p>
                      <p className="mt-1">UPI ID: <span className="font-mono font-semibold text-slate-900">{config.upiId}</span></p>
                      <p>Payee: {config.payee}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">Online payment details are not configured yet. Please contact support to complete your upgrade.</p>
                )}
              </div>
            )
          ) : null}

          {monthlyAvailable ? (
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-700">Billing</p>
              <div role="radiogroup" aria-label="Billing cycle" className="grid grid-cols-2 gap-2">
                {(["monthly", "yearly"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={cycle === c}
                    onClick={() => setCycle(c)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left text-sm transition",
                      cycle === c ? "border-brand-400 bg-brand-50 ring-2 ring-brand-100" : "border-slate-200 hover:border-brand-200"
                    )}
                  >
                    <span className="block font-semibold capitalize text-slate-900">{c}</span>
                    <span className="block text-xs text-slate-500">
                      {formatInr(prices[planId][c])} · {GRACE_DAYS[c]}-day grace
                    </span>
                  </button>
                ))}
              </div>
              {editing ? <p className="mt-1 text-xs text-slate-500">Changing the billing also changes the amount — make sure it matches what you paid.</p> : null}
            </div>
          ) : null}

          {payWith === "upi" && !noMethod ? (
          <>
          <Field label="Transaction ID" htmlFor="txn" hint="Copy this from your payment app after you pay (UTR or transaction reference).">
            <TextInput id="txn" value={txn} onChange={(e) => setTxn(e.target.value)} placeholder="UPI / bank transaction reference" />
          </Field>

          <div>
            <p className="text-sm font-medium text-slate-700">{editing ? "Payment screenshot" : "Upload payment proof"}</p>
            <p className="mb-2 text-xs text-slate-500">{editing ? "Upload a new screenshot only if you want to replace the current one." : "After paying, upload a screenshot or photo of the successful payment."}</p>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 hover:border-brand-300">
              <FileUp className="h-5 w-5 text-brand-500" />
              <span className="text-sm font-medium text-slate-700">{proof ? "Change file" : editing ? "Upload new image or PDF" : "Choose image or PDF"}</span>
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void pickProof(f); }} />
            </label>
            {proof ? (
              <div className="mt-2 text-xs text-slate-500">
                Selected: {proof.name}
                {proof.type.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={proof.dataUrl} alt="Payment proof preview" className="mt-2 max-h-40 rounded-xl border border-slate-200" />
                ) : null}
              </div>
            ) : editing && saved ? (
              <p className="mt-2 text-xs text-slate-500">Current screenshot kept unless you upload a new one.</p>
            ) : null}
          </div>
          </>
          ) : null}

          {error ? <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => (editing ? setMode("submitted") : onClose())} className={secondaryBtn}>Cancel</button>
            {noMethod && !editing ? null : payWith === "online" ? (
              <button type="button" disabled={!!paying || !methods} onClick={payOnline} className={primaryBtn}>
                {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {paying === "verifying" ? "Confirming payment…" : paying === "opening" ? "Opening secure checkout…" : `Pay ${formatInr(amountDue)}`}
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={submit} className={primaryBtn}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {busy ? (editing ? "Saving…" : "Uploading…") : editing ? "Save changes" : "Submit payment proof"}
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
