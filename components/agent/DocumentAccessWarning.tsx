"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Hotel,
  Lock,
  Plane,
  Car,
  Receipt,
  Signpost,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/agent/client";
import { accessLabel } from "@/lib/agent/plans";
import type { DocumentKind } from "@/lib/agent/types";
import { useAgent } from "./AgentProvider";
import { useActivation } from "./ActivationGuide";
import { delayFor, snooze } from "./prompt-timing";

const KEY = "document_access_expiry_prompt";
/** Document pages — the warning only appears while working with files. */
const DOC_PATHS = ["/dashboard/vouchers", "/dashboard/flights", "/dashboard/pickup", "/dashboard/placards", "/dashboard/invoices"];

export interface AccessSample {
  id: string;
  title: string;
  documentType: DocumentKind;
  documentTypeLabel: string;
  createdAt: string;
  accessUntil: string | null;
  remainingDays: number | null;
  locked: boolean;
}

export interface AccessSummary {
  plan: string;
  retentionDays: number;
  showWarning: boolean;
  headline: string;
  message: string;
  expiringSoonCount: number;
  urgentCount: number;
  lockedCount: number;
  totalAtRiskCount: number;
  samples: AccessSample[];
  openCount: number;
  totalCount: number;
}

const Ctx = createContext<{ openDialog: () => void; summary: AccessSummary | null }>({ openDialog: () => {}, summary: null });
export const useDocumentAccess = () => useContext(Ctx);

export const KIND_ICONS: Record<DocumentKind, React.ComponentType<{ className?: string }>> = {
  hotel_voucher: Hotel,
  air_ticket: Plane,
  pickup_voucher: Car,
  welcome_placard: Signpost,
  invoice: FileText,
  proforma: FileText,
  receipt: Receipt,
};

export function DocumentAccessProvider({ children }: { children: React.ReactNode }) {
  const { agent } = useAgent();
  const pathname = usePathname();
  const activation = useActivation();
  const [summary, setSummary] = useState<AccessSummary | null>(null);
  const [open, setOpen] = useState(false);
  const onDocPage = DOC_PATHS.some((p) => pathname.startsWith(p));
  const silver = agent?.subscriptionPlan === "silver";

  useEffect(() => {
    if (!silver || !onDocPage) {
      setSummary(null);
      return;
    }
    let cancelled = false;
    void api<AccessSummary>("/api/agent/document-access").then((r) => {
      if (!cancelled) setSummary(r.success && r.data ? r.data : null);
    });
    return () => {
      cancelled = true;
    };
  }, [silver, onDocPage, pathname]);

  // The activation guide takes priority; never show both.
  const show = !!summary?.showWarning && silver && onDocPage && !activation.needsPrompt;

  const onOpenChange = useCallback((v: boolean) => {
    setOpen(v);
    if (!v) snooze(KEY);
  }, []);

  useEffect(() => {
    if (!show || open || activation.isOpen) {
      if (!show) setOpen(false);
      return;
    }
    const t = window.setTimeout(() => setOpen(true), delayFor(KEY));
    return () => window.clearTimeout(t);
  }, [show, open, activation.isOpen]);

  return (
    <Ctx.Provider value={{ openDialog: () => setOpen(true), summary }}>
      {children}
      {show && summary ? (
        <>
          <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-[2px] anim-fade" />
              <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[70] flex max-h-[min(90dvh,660px)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl anim-pop">
                <DialogPrimitive.Title className="sr-only">{summary.headline}</DialogPrimitive.Title>
                <DialogPrimitive.Description className="sr-only">{summary.message}</DialogPrimitive.Description>
                <AccessSummaryPanel summary={summary} onDismiss={() => onOpenChange(false)} variant="dialog" />
                <DialogPrimitive.Close className="absolute right-4 top-4 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
          {!open ? (
            <div className="pointer-events-none fixed bottom-20 left-1/2 z-40 -translate-x-1/2 sm:bottom-16">
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Your documents are losing access — open warning"
                className="on-accent prompt-glow-amber pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-lg hover:bg-slate-800"
              >
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span>Files losing access</span>
                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-slate-900">{summary.totalAtRiskCount}</span>
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </Ctx.Provider>
  );
}

function Pill({ label, value, tone, icon: Icon }: { label: string; value: number; tone: "amber" | "red" | "slate"; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ring-1",
        tone === "amber" && "bg-amber-50 text-amber-700 ring-amber-200",
        tone === "red" && "bg-rose-50 text-rose-700 ring-rose-200",
        tone === "slate" && "bg-slate-100 text-slate-600 ring-slate-200"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="font-bold tabular-nums">{value}</span>
      <span>{label}</span>
    </div>
  );
}

function FileStrip({ items, locked }: { items: AccessSample[]; locked?: boolean }) {
  const ref = useRef<HTMLUListElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 200, behavior: "smooth" });
  return (
    <div className="relative">
      {items.length > 2 ? (
        <>
          <button type="button" onClick={() => scroll(-1)} aria-label="Scroll to previous files" className="absolute -left-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="Scroll to more files" className="absolute -right-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      ) : null}
      <ul ref={ref} className="no-scrollbar flex snap-x gap-2 overflow-x-auto px-6 pb-1">
        {items.map((item) => {
          const Icon = KIND_ICONS[item.documentType] ?? FileText;
          const urgent = !item.locked && (item.remainingDays ?? 99) <= 3;
          return (
            <li
              key={item.id}
              className={cn(
                "flex w-44 shrink-0 snap-start flex-col rounded-2xl border p-3",
                locked ? "border-dashed border-slate-300 bg-slate-50" : urgent ? "border-rose-200 bg-white" : "border-slate-200 bg-white"
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", locked ? "bg-slate-200 text-slate-500" : urgent ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600")}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-[11px] font-medium text-slate-500">{item.documentTypeLabel}</span>
              </div>
              <p className={cn("mt-2 line-clamp-3 flex-1 text-sm font-medium", locked ? "text-slate-500" : "text-slate-900")} title={item.title}>
                {item.title}
              </p>
              <span
                className={cn(
                  "mt-2 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  locked ? "bg-slate-200 text-slate-600" : urgent ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"
                )}
              >
                {accessLabel({ locked: item.locked, remainingDays: item.remainingDays, accessUntil: item.accessUntil })}
              </span>
            </li>
          );
        })}
      </ul>
      {items.length > 3 ? <p className="mt-1 text-center text-[11px] text-slate-400">Swipe or scroll sideways to see all {items.length} files</p> : null}
    </div>
  );
}

export function AccessSummaryPanel({ summary, onDismiss, variant = "default" }: { summary: AccessSummary; onDismiss?: () => void; variant?: "dialog" | "default" }) {
  const open = summary.samples.filter((s) => !s.locked);
  const locked = summary.samples.filter((s) => s.locked);
  return (
    <>
      <div className="relative shrink-0 border-b border-slate-100 bg-white px-5 pb-4 pt-5 pr-12">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Clock className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Free Silver · {summary.retentionDays} days to view &amp; download</p>
            <p className="mt-1 text-xl font-bold leading-tight text-slate-900">{summary.headline}</p>
            <p className="mt-1 text-sm text-slate-500">{summary.message}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Pill label="Closing" value={summary.expiringSoonCount} tone="amber" icon={Clock} />
          <Pill label="Urgent" value={summary.urgentCount} tone="red" icon={AlertTriangle} />
          <Pill label="Locked" value={summary.lockedCount} tone="slate" icon={Lock} />
        </div>
      </div>
      <div className={cn("space-y-4 px-5 py-4", variant === "dialog" && "min-h-0 flex-1 overflow-y-auto")}>
        {open.length ? (
          <section>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Clock className="h-4 w-4 text-amber-500" /> Closing soon <span className="rounded-full bg-slate-100 px-2 text-xs">{open.length}</span>
            </h2>
            <FileStrip items={open} />
          </section>
        ) : null}
        {locked.length ? (
          <section>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Lock className="h-4 w-4 text-slate-400" /> Already locked <span className="rounded-full bg-slate-100 px-2 text-xs">{locked.length}</span>
            </h2>
            <FileStrip items={locked} locked />
          </section>
        ) : null}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">Gold &amp; Platinum</span> partners get forever file access — no {summary.retentionDays}-day limit. We&apos;d love to welcome you when you&apos;re ready.
        </div>
      </div>
      <div className="shrink-0 space-y-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/dashboard/pricing" onClick={onDismiss} className="inline-flex h-11 flex-1 items-center justify-center gap-2 btn-glow rounded-lg bg-slate-900 font-semibold text-white hover:bg-slate-800">
            Unlock my files <ArrowRight className="h-4 w-4" />
          </Link>
          {onDismiss ? (
            <button type="button" onClick={onDismiss} className="h-11 flex-1 rounded-full border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50">
              Remind me later
            </button>
          ) : null}
        </div>
        <p className="text-center text-xs text-slate-500">
          <Link href="/dashboard/document-access" onClick={onDismiss} className="underline-offset-2 hover:text-[var(--primary)] hover:underline">
            View full file access details
          </Link>
        </p>
      </div>
    </>
  );
}
