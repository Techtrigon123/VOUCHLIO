"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Crown,
  Gauge,
  Layers,
  Users,
  FileText,
  Hotel,
  Plus,
  Printer,
  X,
  type LucideIcon,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAgent } from "@/components/agent/AgentProvider";
import { useActivation, focusAnchor } from "@/components/agent/ActivationGuide";
import { useDocumentAccess } from "@/components/agent/DocumentAccessWarning";
import { PageShell } from "@/components/agent/ui";
import { api } from "@/lib/agent/client";
import {
  isActive,
  isSuspended,
  missingActivationFields,
} from "@/lib/agent/profile";
import { effectivePlan, lowestPlanFor, planIncludes, planLabel, planName, subscriptionState } from "@/lib/agent/plans";
import { isFeatureEnabled } from "@/lib/agent/features";
import type { Agent, DocumentKind } from "@/lib/agent/types";
import { Skeleton } from "@/components/ui/skeleton";
import VerificationBanner from "@/components/agent/VerificationBanner";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { documentHref } from "@/components/agent/nav-config";
import { DOC_ICONS, DOC_TONES } from "@/components/agent/doc-style";

interface Summary {
  documentCounts: { key: DocumentKind; count: number }[];
  totalDocuments: number;
  customers: number;
  planPaymentPending: boolean;
  /** Silver only: new documents this month against the free allowance. */
  freeUsage: { used: number; limit: number; resetsAt: string } | null;
  ranking: { activityScore: number; rank: number | null; topTier: "top_10" | "top_20" | "top_30" | null };
  /** Last eight weeks, oldest first. */
  weekly: { weekStart: string; created: number; pdfs: number }[];
  recent: { id: string; kind: DocumentKind; title: string; number: string | null; version: number; createdAt: string; updatedAt: string }[];
}

const CHART_CONFIG: ChartConfig = {
  created: { label: "Documents created", color: "#e63946" },
  pdfs: { label: "PDFs generated", color: "#0ea5e9" },
};

interface Tile {
  key: DocumentKind;
  label: string;
  href: string;
  icon: LucideIcon;
}

const TILES: Tile[] = [
  { key: "hotel_voucher", label: "Hotel vouchers", href: "/dashboard/vouchers/new", icon: DOC_ICONS.hotel_voucher },
  { key: "air_ticket", label: "Air tickets", href: "/dashboard/flights/new", icon: DOC_ICONS.air_ticket },
  { key: "pickup_voucher", label: "Pickup vouchers", href: "/dashboard/pickup/new", icon: DOC_ICONS.pickup_voucher },
  { key: "welcome_placard", label: "Welcome placards", href: "/dashboard/placards", icon: DOC_ICONS.welcome_placard },
  { key: "invoice", label: "Invoices", href: "/dashboard/invoices?type=invoice&new=1", icon: DOC_ICONS.invoice },
  { key: "proforma", label: "Proforma", href: "/dashboard/invoices?type=proforma&new=1", icon: DOC_ICONS.proforma },
  { key: "receipt", label: "Receipts", href: "/dashboard/invoices?type=receipt&new=1", icon: DOC_ICONS.receipt },
];

const TILE_TONES = DOC_TONES;

const TIER_LABEL = { top_10: "Top 10", top_20: "Top 20", top_30: "Top 30" } as const;

function rankCopy(r?: Summary["ranking"]) {
  if (!r || r.activityScore <= 0) return { title: "Not ranked yet", detail: "Create your first document to join the activity board." };
  if (r.topTier) return { title: TIER_LABEL[r.topTier], detail: `You're in the ${TIER_LABEL[r.topTier]} among active agents on Vouchlio` };
  if (r.rank != null) return { title: "On the activity board", detail: "Keep creating documents to reach Top 30 among active agents." };
  return { title: "Activity tracked", detail: "Save more documents to climb the activity board." };
}

const titleWords = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

function setupProgress(agent: Agent, totalDocs: number) {
  const missing = missingActivationFields(agent);
  const profileDone = 4 - missing.length;
  const hasDocs = totalDocs > 0;
  const percent = Math.round(((profileDone + (hasDocs ? 1 : 0)) / 5) * 100);
  let detail =
    missing.length === 0
      ? "All required fields added"
      : `Still needed: ${missing.length === 1 ? titleWords(missing[0]) : `${missing.slice(0, -1).map(titleWords).join(", ")}, and ${titleWords(missing[missing.length - 1])}`}`;
  if (missing.length && hasDocs) detail += ` · ${totalDocs.toLocaleString("en-IN")} document${totalDocs === 1 ? "" : "s"} already saved`;
  return { percent, detail, profileComplete: missing.length === 0, hasDocs };
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function planStatus(agent: Agent, pending: boolean) {
  const sub = agent.subscription ?? subscriptionState(agent);
  const paid = sub.paidPlan ? planLabel(sub.paidPlan) : null;
  const cycle = sub.cycle === "monthly" ? "monthly" : "yearly";
  if (pending) return { detail: `We are reviewing your payment. You can keep using your account meanwhile.`, badge: "In review", tone: "warn" as const };
  if (sub.status === "grace")
    return {
      detail: `Your ${cycle} ${paid} ended on ${shortDate(sub.expiresAt!)}. It keeps working until ${shortDate(sub.graceEndsAt!)} — renew monthly or yearly to keep your services.`,
      badge: `Grace · ${sub.daysLeft} day${sub.daysLeft === 1 ? "" : "s"} left`,
      tone: "warn" as const,
    };
  if (sub.status === "lapsed")
    return { detail: `Your ${paid} ended on ${shortDate(sub.expiresAt!)}. You're on Silver now — renew to unlock your services again.`, badge: "Ended", tone: "warn" as const };
  if (sub.status === "active")
    return { detail: sub.expiresAt ? `Your ${cycle} ${paid} is active until ${shortDate(sub.expiresAt)}.` : `Your ${paid} is active.`, badge: "Active", tone: "ok" as const };
  return { detail: "Hotel vouchers, invoices and proforma invoices are included.", badge: "Active", tone: "ok" as const };
}

function NewDocumentMenu({ tiles, children }: { tiles: Tile[]; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64 rounded-2xl p-1.5 shadow-xl">
        {tiles.length === 0 ? (
          <DropdownMenuItem disabled>No document tools are enabled yet</DropdownMenuItem>
        ) : (
          tiles.map((t) => (
            <DropdownMenuItem key={t.key} onSelect={() => router.push(t.href)} className="cursor-pointer gap-3 rounded-xl py-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <t.icon className="h-4 w-4" />
              </span>
              {t.label}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function DashboardPage() {
  const { agent } = useAgent();
  const activation = useActivation();
  const access = useDocumentAccess();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void api<Summary>("/api/agent/dashboard/summary").then((r) => {
      if (cancelled) return;
      if (r.success && r.data) setSummary(r.data);
      else setError(r.error?.message ?? "We could not load your stats. Please try again.");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [agent?.status]);

  // Deep links such as /dashboard#agent-activation-documents.
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) window.setTimeout(() => focusAnchor(hash), 250);
  }, []);

  const allTiles = useMemo(() => (agent ? TILES.filter((t) => isFeatureEnabled(agent, t.key)) : []), [agent]);
  const currentPlan = agent ? effectivePlan(agent) : "silver";
  const tiles = useMemo(() => allTiles.filter((t) => planIncludes(currentPlan, t.key)), [allTiles, currentPlan]);
  if (!agent) return null;

  const counts = new Map(summary?.documentCounts.map((c) => [c.key, c.count]) ?? []);
  const total = summary?.totalDocuments ?? 0;
  const setup = setupProgress(agent, total);
  const active = isActive(agent.status);
  const suspended = isSuspended(agent.status);
  const plan = planStatus(agent, !!summary?.planPaymentPending);
  const usage = summary?.freeUsage ?? null;
  const usageFull = !!usage && usage.used >= usage.limit;
  const rank = rankCopy(summary?.ranking);

  let docAction: { detail: string; label: string } | null = null;
  if (loading) docAction = { detail: "Checking documents…", label: "Create now" };
  else if (active) docAction = { detail: `${total.toLocaleString("en-IN")} documents created`, label: "View documents" };
  else if (setup.profileComplete)
    docAction = setup.hasDocs
      ? { detail: `${total.toLocaleString("en-IN")} on file — your account should go Active soon`, label: "View documents" }
      : { detail: "Create a voucher, invoice, or other document", label: "Create a document" };

  const stats: { label: string; value: string; hint: string; icon: LucideIcon; href?: string }[] = [
    { label: "Total documents", value: total.toLocaleString("en-IN"), hint: rank.title, icon: FileText },
    { label: "Saved customers", value: (summary?.customers ?? 0).toLocaleString("en-IN"), hint: "Ready to reuse on invoices", icon: Users },
    usage
      ? { label: "Free this month", value: `${Math.min(usage.used, usage.limit)} / ${usage.limit}`, hint: usageFull ? "Limit reached — upgrade for unlimited" : `Resets ${new Date(usage.resetsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}`, icon: Gauge }
      : { label: "Services", value: `${tiles.length} / ${allTiles.length}`, hint: "Included on your plan", icon: Layers },
    { label: "Your plan", value: planLabel(currentPlan), hint: plan.badge, icon: Crown, href: "/dashboard/pricing" },
  ];
  const weekly = (summary?.weekly ?? []).map((w) => ({
    week: new Date(w.weekStart).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    created: w.created,
    pdfs: w.pdfs,
  }));
  const recent = summary?.recent ?? [];

  return (
    <PageShell wide className="space-y-6">
      <VerificationBanner />

      {/* Account status: only while something needs attention */}
      {suspended ? (
        <Card className="border-rose-200 bg-rose-50">
          <CardHeader>
            <CardTitle className="text-base text-rose-700">Your account is suspended</CardTitle>
            <CardDescription>Please contact support if you need help getting back in.</CardDescription>
          </CardHeader>
        </Card>
      ) : !active ? (
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="space-y-1.5">
              <CardTitle className="text-base">Finish setting up your account</CardTitle>
              <CardDescription>{setup.detail}</CardDescription>
              {docAction ? (
                <p className="text-xs text-slate-500">
                  {docAction.detail}{" "}
                  <button type="button" onClick={() => focusAnchor("agent-activation-documents")} className="font-semibold text-brand-600 hover:underline">
                    {docAction.label}
                  </button>
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-2">
              {activation.needsPrompt ? (
                <Button variant="outline" size="sm" onClick={activation.openDialog}>
                  Show me where
                </Button>
              ) : null}
              <Button asChild size="sm">
                <Link href="/dashboard/profile/edit">Complete profile</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Progress value={setup.percent} aria-label="Account setup progress" />
            <span className="shrink-0 text-xs tabular-nums text-slate-500">{setup.percent}% to Active</span>
          </CardContent>
        </Card>
      ) : null}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const body = (
            <Card className={cn("h-full transition", s.href && "hover:border-brand-300")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">{s.label}</CardTitle>
                <s.icon aria-hidden className="h-5 w-5 text-slate-400" />
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-24" /> : <p className="truncate text-2xl font-semibold tabular-nums text-black">{error ? "—" : s.value}</p>}
                <p className="mt-0.5 truncate text-xs text-slate-500">{s.hint}</p>
              </CardContent>
            </Card>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
              {body}
            </Link>
          ) : (
            <div key={s.label}>{body}</div>
          );
        })}
      </div>
      {access.summary?.showWarning ? (
        <button type="button" onClick={access.openDialog} className="-mt-3 text-xs font-semibold text-rose-600 hover:underline">
          {access.summary.totalAtRiskCount} file(s) losing access when your plan changes →
        </button>
      ) : null}

      {/* Activity chart */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="text-lg">Document activity</CardTitle>
            <CardDescription>Documents created and PDFs generated over the last eight weeks</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : weekly.length === 0 ? (
            <p className="grid h-64 place-items-center text-sm text-slate-500">{error ?? "No activity to show yet."}</p>
          ) : (
            <ChartContainer config={CHART_CONFIG} className="h-64 w-full">
              <AreaChart data={weekly} margin={{ left: 4, right: 4, top: 8 }} accessibilityLayer>
                <defs>
                  <linearGradient id="dashCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-created)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--color-created)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={(l) => `Week of ${l}`} />} />
                <ChartLegend content={<ChartLegendContent />} />
                {/* The two series differ by form (dashed line vs filled area), not only by colour. */}
                <Area dataKey="pdfs" type="monotone" stroke="var(--color-pdfs)" strokeDasharray="4 4" fill="none" strokeWidth={2} />
                <Area dataKey="created" type="monotone" stroke="var(--color-created)" fill="url(#dashCreated)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Services */}
        <Card id="agent-activation-documents" className="scroll-mt-28">
          <CardHeader>
            <CardTitle as="h2" className="text-lg">Your services</CardTitle>
            <CardDescription>
              {tiles.length} of {allTiles.length} document types on your plan · share of your documents
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : allTiles.length === 0 ? (
              <p className="text-sm text-slate-500">No document tools are enabled for your account yet. Contact support if you need access.</p>
            ) : (
              allTiles.map((t) => {
                const included = planIncludes(currentPlan, t.key);
                const count = counts.get(t.key) ?? 0;
                const share = total ? Math.round((count / total) * 100) : 0;
                const tone = TILE_TONES[t.key];
                if (!included) {
                  // Locked on this plan: shown disabled, with one clear way to unlock it.
                  const need = planName(lowestPlanFor(t.key));
                  return (
                    <div key={t.key} aria-disabled="true" className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-200">
                          <t.icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-medium text-slate-500">{t.label}</h3>
                          <p className="flex items-center gap-1 text-xs text-slate-400">
                            <Lock className="h-3 w-3" /> Available on {need}
                          </p>
                        </div>
                      </div>
                      <Button asChild size="sm" variant="outline" className="shrink-0">
                        <Link href="/dashboard/pricing" aria-label={`Upgrade to ${need} to unlock ${t.label.toLowerCase()}`}>
                          Upgrade to unlock
                        </Link>
                      </Button>
                    </div>
                  );
                }
                return (
                  <div key={t.key} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="flex min-w-0 items-center gap-2.5 text-sm font-medium text-black">
                        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", tone.chip)}>
                          <t.icon className="h-4 w-4" />
                        </span>
                        <span className="truncate">{t.label}</span>
                      </h3>
                      <Badge variant="success">{count.toLocaleString("en-IN")} created</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={share} aria-label={`${t.label}: ${share}% of your documents`} />
                      <span className="w-9 shrink-0 text-right text-xs tabular-nums text-slate-500">{share}%</span>
                    </div>
                    <div className="flex justify-end">
                      <Link href={t.href} className="text-xs font-semibold text-brand-600 hover:underline">
                        + Create {t.label.toLowerCase().replace(/s$/, "")}
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-lg">Recent activity</CardTitle>
            <CardDescription>Your latest documents</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm text-slate-500">You haven&apos;t created any documents yet.</p>
                <NewDocumentMenu tiles={tiles}>
                  <Button size="sm">
                    <Plus className="h-4 w-4" /> Create your first document
                  </Button>
                </NewDocumentMenu>
              </div>
            ) : (
              <ol className="flex flex-col gap-1">
                {recent.map((doc) => {
                  const tile = TILES.find((t) => t.key === doc.kind);
                  const Icon = tile?.icon ?? FileText;
                  const edited = doc.version > 1 || new Date(doc.updatedAt).getTime() - new Date(doc.createdAt).getTime() > 60_000;
                  return (
                    <li key={doc.id}>
                      <Link href={documentHref(doc.kind, doc.id)} className="flex items-start gap-3 rounded-lg p-2 transition hover:bg-slate-50">
                        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", TILE_TONES[doc.kind]?.chip)}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm leading-snug">
                            <span className="font-medium text-black">{doc.title || "Untitled"}</span>{" "}
                            <span className="text-slate-500">
                              {edited ? "updated" : "created"} · {(tile?.label ?? "Document").toLowerCase().replace(/s$/, "")}
                              {doc.number ? ` ${doc.number}` : ""}
                            </span>
                          </p>
                          <p className="text-xs text-slate-400">{timeAgo(doc.updatedAt)}</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {!suspended && tiles.some((t) => t.key === "hotel_voucher") ? <QuickStartPopup /> : null}
    </PageShell>
  );
}

/** "just now", "5 min ago", "3h ago", "2 days ago", then a date. */
function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} day${s < 2 * 86400 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/* ─── Quick start: "Create a hotel voucher" corner popup ────────────────── */

const QS_KEY = "agent_dashboard_quick_start_snooze_until";
const QS_SNOOZE = 20 * 60 * 1000;

function QuickStartPopup() {
  const activation = useActivation();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"fill" | "print" | "ready">("fill");
  const blocked = activation.isOpen;

  const close = () => {
    try {
      sessionStorage.setItem(QS_KEY, String(Date.now() + QS_SNOOZE));
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  useEffect(() => {
    if (blocked) {
      setOpen(false);
      return;
    }
    let until = 0;
    try {
      until = Number(sessionStorage.getItem(QS_KEY)) || 0;
    } catch {
      /* ignore */
    }
    // Wait for the activation guide's own timing before showing a second nudge.
    const base = activation.needsPrompt ? 15_000 + 8_000 : 5_000;
    const t = window.setTimeout(() => setOpen(true), Math.max(base, until - Date.now()));
    return () => window.clearTimeout(t);
  }, [blocked, activation.needsPrompt]);

  useEffect(() => {
    if (!open) return;
    const order = ["fill", "print", "ready"] as const;
    const dur = { fill: 3600, print: 3000, ready: 2800 };
    let current: (typeof order)[number] = "fill";
    let t = 0;
    const tick = () => {
      t = window.setTimeout(() => {
        current = order[(order.indexOf(current) + 1) % order.length];
        setPhase(current);
        tick();
      }, dur[current]);
    };
    tick();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;
  const caption = phase === "fill" ? "Fill guest and hotel details" : phase === "print" ? "Generating hotel voucher…" : "Hotel voucher ready";
  return (
    <div role="dialog" aria-modal="false" aria-labelledby="qs-title" className="anim-rise fixed bottom-14 left-4 z-[45] w-[min(100vw-2rem,20rem)] rounded-3xl border border-brand-200 bg-white p-4 shadow-2xl shadow-brand-500/10">
      <button type="button" aria-label="Close quick start" onClick={close} className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 hover:bg-slate-100">
        <X className="h-4 w-4" />
      </button>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600">Quick start</p>
      <p id="qs-title" className="text-base font-semibold text-slate-900">Create a hotel voucher</p>
      <p className="mt-0.5 min-h-8 text-xs text-slate-500" aria-live="polite">{caption}</p>
      <div className="mt-2 rounded-2xl border border-slate-100 bg-white p-3" role="img" aria-label={`Voucher workflow: ${caption}`}>
        <div className={cn("rounded-xl border border-slate-200 bg-white p-2 transition-opacity", phase !== "fill" && "opacity-40")}>
          <p className="flex items-center gap-1 text-[10px] font-semibold text-slate-500"><Hotel className="h-3 w-3" /> Hotel voucher details</p>
          <div className="mt-1.5 space-y-1">
            <div className="h-1.5 w-4/5 rounded bg-brand-200" />
            <div className="h-1.5 w-3/5 rounded bg-slate-200" />
            <div className="h-1.5 w-2/3 rounded bg-slate-200" />
          </div>
        </div>
        <div className="on-accent relative mx-auto mt-2 flex h-7 w-4/5 items-center justify-center gap-1 rounded-lg bg-slate-800 text-[9px] font-semibold text-slate-300">
          <Printer className="h-3 w-3" /> Printer
          <span className={cn("absolute right-2 h-1.5 w-1.5 rounded-full", phase === "print" ? "animate-pulse bg-brand-400" : phase === "ready" ? "bg-emerald-400" : "bg-slate-500")} />
        </div>
        <div className="mx-auto h-14 w-3/4 overflow-hidden">
          {phase !== "fill" ? (
            <div key={phase} className={cn("rounded-b-lg border border-t-0 border-slate-200 bg-white p-1.5 shadow-sm", phase === "print" && "printer-sheet")}>
              <p className="flex items-center gap-1 text-[9px] font-bold text-brand-600"><Hotel className="h-2.5 w-2.5" /> Hotel voucher</p>
              <div className="mt-1 h-1 w-full rounded bg-slate-200" />
              <div className="mt-0.5 h-1 w-2/3 rounded bg-slate-200" />
              {phase === "ready" ? <p className="mt-1 text-right text-[8px] font-semibold text-emerald-600">Generated</p> : null}
            </div>
          ) : null}
        </div>
      </div>
      <Link href="/dashboard/vouchers/new" onClick={close} className="mt-3 flex h-10 w-full items-center justify-center btn-glow rounded-lg bg-[var(--primary)] text-[13px] font-semibold text-white hover:bg-brand-600">
        Create hotel voucher
      </Link>
    </div>
  );
}
