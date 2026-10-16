"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CopyPlus, Plus, Route, Search } from "lucide-react";
import { toast } from "sonner";
import { useDocuments } from "@/components/agent/useDocuments";
import { AccessBadge, ConfirmDialog, EmptyState, PageHeader, PageShell, RowActions, TextInput, iconBtn, primaryBtn, useFeatureGate } from "@/components/agent/ui";
import { api, formatDay, openPdf, sharePdfOnWhatsApp } from "@/lib/agent/client";
import { money } from "@/lib/agent/documents";
import type { DocumentSummary } from "@/lib/agent/types";
import { ListSkeleton } from "@/components/agent/skeletons";

export default function ItineraryListPage() {
  const enabled = useFeatureGate("itinerary", "Itineraries");
  const router = useRouter();
  const { docs, error, reload } = useDocuments("itinerary");
  const [q, setQ] = useState("");
  const [toDelete, setToDelete] = useState<DocumentSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return docs ?? [];
    return (docs ?? []).filter((d) => [d.title, d.subtitle, d.number].join(" ").toLowerCase().includes(t));
  }, [docs, q]);

  if (!enabled) return null;

  const remove = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const r = await api(`/api/agent/documents/${toDelete.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!r.success) return toast.error("Delete failed", { description: r.error?.message });
    toast.success("Itinerary deleted");
    setToDelete(null);
    void reload();
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Itinerary builder"
        title="Itineraries"
        description="Plan trips day by day — stays, meals, transfers, inclusions and price — and send a branded PDF your customers will love."
        actions={
          docs && docs.length ? (
            <Link href="/dashboard/itineraries/new" className={primaryBtn}>
              <Plus className="h-4 w-4" /> New itinerary
            </Link>
          ) : null
        }
      />

      {docs === null ? (
        <ListSkeleton label="Loading itineraries" />
      ) : error ? (
        <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>
      ) : docs.length === 0 ? (
        <EmptyState
          icon={Route}
          title="Build your first itinerary"
          description="Add the trip name and dates, plan each day, list what's included, set a price — and download a branded PDF. Duplicate it later for your next customer."
          action={<Link href="/dashboard/itineraries/new" className={primaryBtn}><Plus className="h-4 w-4" /> Create itinerary</Link>}
        />
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold text-slate-900">Saved itineraries <span className="ml-1 rounded-full bg-slate-100 px-2 text-xs">{docs.length}</span></p>
            <div className="relative sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <TextInput aria-label="Search itineraries" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search trip, traveller, destination…" className="pl-9" />
            </div>
          </div>
          {shown.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">No itineraries match your search.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {shown.map((d) => (
                <li key={d.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
                    <Route className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{d.title}</p>
                    <p className="truncate text-xs text-slate-500">{d.subtitle} · Created {formatDay(d.createdAt)}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">{d.number}</span>
                      {d.total ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{money(d.total, d.currency)}</span> : null}
                      {d.hasStoredPdf ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">PDF saved</span> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">Draft</span>}
                      <AccessBadge access={d.access} />
                    </div>
                  </div>
                  <RowActions
                    locked={d.access.locked}
                    onView={async () => {
                      const err = await openPdf(d.id);
                      if (err) toast.error("Could not open this itinerary", { description: err });
                    }}
                    onShare={async () => {
                      const r = await sharePdfOnWhatsApp({ id: d.id }, `Here is your travel itinerary: ${d.title}`);
                      if (r.error) toast.error("Could not share", { description: r.error });
                    }}
                    extra={
                      <button type="button" onClick={() => router.push(`/dashboard/itineraries/new?from=${d.id}`)} className={iconBtn} title="Duplicate for another customer" aria-label="Duplicate itinerary">
                        <CopyPlus className="h-4 w-4" />
                      </button>
                    }
                    onEdit={() => router.push(`/dashboard/itineraries/new?id=${d.id}`)}
                    onDelete={() => setToDelete(d)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Delete this itinerary?"
        description="This removes the saved itinerary from your account. It cannot be undone."
        confirmLabel="Delete"
        busyLabel="Deleting…"
        busy={deleting}
        onConfirm={remove}
      />
    </PageShell>
  );
}
