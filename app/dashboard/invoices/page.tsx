"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileSpreadsheet, FileText, Lock, Plus, Receipt, Upload, Wallet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDocuments } from "@/components/agent/useDocuments";
import { InvoiceForm } from "@/components/agent/invoice/InvoiceForm";
import { ExportDialog, RecordPaymentDialog, type NumberInfo } from "@/components/agent/invoice/dialogs";
import { AccessBadge, ConfirmDialog, EmptyState, PageHeader, PageShell, RowActions, iconBtn, primaryBtn, secondaryBtn } from "@/components/agent/ui";
import { api, formatDay, openPdf, sharePdfOnWhatsApp } from "@/lib/agent/client";
import { INVOICE_LABELS, type InvoiceKind } from "@/lib/agent/documents";
import { effectivePlan, lowestPlanFor, planIncludes, planName } from "@/lib/agent/plans";
import { useAgent } from "@/components/agent/AgentProvider";
import type { DocumentSummary } from "@/lib/agent/types";
import { ListSkeleton } from "@/components/agent/skeletons";

const TABS: { kind: InvoiceKind; label: string; icon: typeof FileText }[] = [
  { kind: "invoice", label: "Invoices", icon: FileSpreadsheet },
  { kind: "proforma", label: "Proforma", icon: FileText },
  { kind: "receipt", label: "Receipts", icon: Receipt },
];

const isKind = (v: string | null): v is InvoiceKind => v === "invoice" || v === "proforma" || v === "receipt";
const fmt = (n?: number) => (n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function InvoicesPage() {
  const router = useRouter();
  const params = useSearchParams();
  const kind: InvoiceKind = isKind(params.get("type")) ? (params.get("type") as InvoiceKind) : "invoice";
  const editId = params.get("id");
  const isNew = params.get("new") === "1";
  const { agent } = useAgent();
  const plan = agent ? effectivePlan(agent) : "silver";
  /** Plans that don't include a type (proforma needs Gold, receipts Platinum) see an upgrade card instead of the form. */
  const lockedKind = (k: InvoiceKind) => !!agent && !planIncludes(plan, k);
  const locked = lockedKind(kind);
  const showForm = !locked && (isNew || !!editId);

  const { docs, error, reload } = useDocuments(kind);
  const [toDelete, setToDelete] = useState<DocumentSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [paying, setPaying] = useState<DocumentSummary | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [nextReceipt, setNextReceipt] = useState("RCPT-0001");

  useEffect(() => {
    void api<NumberInfo>("/api/agent/invoice-numbers").then((r) => r.success && r.data && setNextReceipt(r.data.receipt.next));
  }, [paying]);

  // The list stays mounted while the form is open; refresh it when we come back.
  useEffect(() => {
    if (!showForm) void reload();
  }, [showForm, reload]);

  const go = (q: Record<string, string>) => router.push(`/dashboard/invoices?${new URLSearchParams(q).toString()}`);
  const labels = INVOICE_LABELS[kind];

  const remove = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const r = await api(`/api/agent/documents/${toDelete.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!r.success) return toast.error("Could not delete this PDF.", { description: r.error?.message });
    toast.success("Deleted");
    setToDelete(null);
    void reload();
  };

  const share = async (d: DocumentSummary) => {
    const r = await sharePdfOnWhatsApp({ id: d.id }, `${INVOICE_LABELS[d.kind as InvoiceKind].title} ${d.number} · ${d.subtitle} · Total: ${fmt(d.total)} ${d.currency ?? "INR"}`);
    if (r.error) toast.error("Could not share this PDF on WhatsApp. Try View PDF and share from your device.");
    else if (!r.attached) toast.message("Please attach the PDF if WhatsApp does not include the file automatically.");
  };

  return (
    <PageShell wide>
      <PageHeader
        eyebrow="Invoice"
        title="Invoices & receipts"
        description="Pick a tab below, then open a saved PDF or create a new document."
        actions={
          showForm ? null : (
            <>
              <button type="button" onClick={() => setExportOpen(true)} className={secondaryBtn}>
                <Upload className="h-4 w-4" /> Export
              </button>
            </>
          )
        }
      />

      <div role="tablist" className="mb-5 inline-flex gap-1 rounded-2xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.kind}
            role="tab"
            type="button"
            aria-selected={kind === t.kind}
            onClick={() => go({ type: t.kind })}
            className={cn("inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition", kind === t.kind ? "bg-white text-brand-600 shadow-sm ring-1 ring-brand-200" : "text-slate-600 hover:text-slate-900")}
          >
            <t.icon className="h-4 w-4" /> {t.label}
            {lockedKind(t.kind) ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500" title={`Needs the ${planName(lowestPlanFor(t.kind))} plan`}>
                <Lock className="h-3 w-3" /> {planName(lowestPlanFor(t.kind))}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {locked ? (
        <div className="rounded-3xl border border-brand-200 bg-white p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Lock className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-slate-900">{labels.plural} are on the {lowestPlanFor(kind) === "gold" ? "Gold and Platinum plans" : "Platinum plan"}</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            {kind === "proforma" ? "Send priced quotations your customers approve before paying." : "Give customers proof of every payment, linked to its invoice."} Upgrade to unlock {labels.plural.toLowerCase()}.
          </p>
          <Link href={`/dashboard/pricing?plan=${lowestPlanFor(kind)}`} className={cn(primaryBtn, "mt-5")}>
            Upgrade to {planName(lowestPlanFor(kind))}
          </Link>
        </div>
      ) : showForm ? (
        <InvoiceForm
          key={`${kind}-${editId ?? "new"}`}
          kind={kind}
          editId={editId}
          onBack={() => go({ type: kind })}
          onSaved={(_id, k) => {
            if (k !== kind || isNew) go({ type: k });
            else void reload();
          }}
        />
      ) : docs === null ? (
        <ListSkeleton label="Loading saved documents" />
      ) : error ? (
        <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>
      ) : docs.length === 0 ? (
        <EmptyState
          icon={kind === "receipt" ? Receipt : FileSpreadsheet}
          title={`No ${labels.plural.toLowerCase()} yet`}
          description={`Use Create new ${kind === "invoice" ? "invoice" : kind} to fill the form, then Save & Download — it appears here.`}
          action={<button type="button" onClick={() => go({ type: kind, new: "1" })} className={primaryBtn}><Plus className="h-4 w-4" /> Create new {kind}</button>}
        />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="font-semibold text-slate-900">Saved PDFs</p>
            <p className="text-sm text-slate-500">PDFs you saved with Save &amp; Download. View, share, edit, or delete them here.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Document number</th>
                  <th className="px-3 py-3 font-semibold">Bill to</th>
                  <th className="px-3 py-3 text-right font-semibold">Total</th>
                  <th className="px-3 py-3 font-semibold">Last updated</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docs.map((d) => {
                  const due = Math.max(0, (d.total ?? 0) - (d.paidAmount ?? 0));
                  return (
                    <tr key={d.id} className="hover:bg-brand-50/30">
                      <td className="px-5 py-3">
                        <p className="font-mono font-semibold text-slate-900">{d.number}</p>
                        <AccessBadge access={d.access} />
                      </td>
                      <td className="px-3 py-3 text-slate-700">{d.subtitle?.replace(/^Bill to: /, "")}</td>
                      <td className="px-3 py-3 text-right">
                        <p className="font-semibold tabular-nums">{fmt(d.total)} {d.currency}</p>
                        {kind !== "receipt" && (d.paidAmount ?? 0) > 0 ? (
                          <p className={cn("text-xs", due > 0 ? "text-brand-600" : "text-emerald-600")}>
                            {due > 0 ? `Paid ${fmt(d.paidAmount)} · Due ${due.toFixed(2)}` : `Paid ${fmt(d.paidAmount)}`}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{formatDay(d.updatedAt)}</td>
                      <td className="px-5 py-3">
                        <RowActions
                          locked={d.access.locked}
                          onView={async () => {
                            const err = await openPdf(d.id);
                            if (err) toast.error("Could not open PDF", { description: err });
                          }}
                          extra={
                            kind !== "receipt" ? (
                              <button type="button" onClick={() => setPaying(d)} className={iconBtn} title="Record payment against this invoice" aria-label="Record payment">
                                <Wallet className="h-4 w-4" />
                              </button>
                            ) : null
                          }
                          onShare={() => share(d)}
                          onEdit={() => go({ type: kind, id: d.id })}
                          onDelete={() => setToDelete(d)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!showForm ? (
        <p className="mt-4 text-xs text-slate-500">
          Receipts created with Record payment are listed under <Link href="/dashboard/invoices?type=receipt" className="font-semibold text-brand-600 hover:underline">Receipts</Link>.
        </p>
      ) : null}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Delete this PDF?"
        description="This removes the saved PDF and document from your account. It cannot be undone."
        confirmLabel="Delete PDF"
        busyLabel="Deleting…"
        busy={deleting}
        onConfirm={remove}
      />
      <RecordPaymentDialog
        doc={paying}
        onOpenChange={(v) => !v && setPaying(null)}
        suggestedNumber={nextReceipt}
        onSaved={() => {
          setPaying(null);
          void reload();
        }}
      />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} kind={kind} />
    </PageShell>
  );
}
