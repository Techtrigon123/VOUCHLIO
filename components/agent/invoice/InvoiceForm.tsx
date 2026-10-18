"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck2,
  ChevronDown,
  Download,
  Loader2,
  MessageCircle,
  Plus,
  Printer,
  Settings2,
  Share2,
  Stamp,
  Trash2,
  UserRound,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAgent } from "@/components/agent/AgentProvider";
import { effectivePlan, planIncludes } from "@/lib/agent/plans";

import { Field, NativeSelect, SectionCard, TextArea, TextInput, inputClass, primaryBtn, secondaryBtn } from "@/components/agent/ui";
import { api, downloadPdf, imageFileToDataUrl, openPdf, sharePdfOnWhatsApp } from "@/lib/agent/client";
import {
  CURRENCIES,
  GST_TREATMENTS,
  INVOICE_LABELS,
  PLACES_OF_SUPPLY,
  TAX_RATES,
  defaultInvoice,
  invoiceChecklist,
  invoiceTotals,
  isInterState,
  newLine,
  today,
  type InvoiceData,
  type InvoiceKind,
} from "@/lib/agent/documents";
import type { Agent, DocumentSummary } from "@/lib/agent/types";
import { CustomerDetailsDialog, CustomerPickerDialog, NumberSettingsDialog, type NumberInfo, type SavedCustomer } from "./dialogs";
import { FormSkeleton } from "@/components/agent/skeletons";
import { LivePreview } from "@/components/agent/LivePreview";

/** Types the agent can switch between; ones their plan doesn't include are left out. */
const TYPE_OPTIONS: { value: InvoiceKind; label: string }[] = [
  { value: "invoice", label: "Invoice" },
  { value: "proforma", label: "Proforma Invoice" },
  { value: "receipt", label: "Receipt" },
];

const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function InvoiceForm({
  kind,
  editId,
  onBack,
  onSaved,
}: {
  kind: InvoiceKind;
  editId: string | null;
  onBack: () => void;
  onSaved: (id: string, kind: InvoiceKind) => void;
}) {
  const { agent, setAgent, refresh } = useAgent();
  const [data, setData] = useState<InvoiceData>(() => defaultInvoice(kind));
  const [docId, setDocId] = useState<string | null>(editId);
  const [loading, setLoading] = useState(!!editId);
  const [numbers, setNumbers] = useState<NumberInfo | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [stampBusy, setStampBusy] = useState(false);
  const patch = (p: Partial<InvoiceData>) => setData((d) => ({ ...d, ...p }));

  const loadNumbers = async () => {
    const r = await api<NumberInfo>("/api/agent/invoice-numbers");
    if (r.success && r.data) setNumbers(r.data);
    return r.data ?? null;
  };

  useEffect(() => {
    void loadNumbers().then((n) => {
      if (!editId && n) setData((d) => (d.number ? d : { ...d, number: n[d.docType].next }));
    });
    if (!editId) return;
    void api<{ document: DocumentSummary; data: InvoiceData }>(`/api/agent/documents/${editId}`).then((r) => {
      if (!r.success || !r.data) {
        toast.error("Could not open this saved invoice.", { description: r.error?.message });
        onBack();
        return;
      }
      setData({ ...defaultInvoice(r.data.document.kind as InvoiceKind), ...r.data.data, docType: r.data.document.kind as InvoiceKind });
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const totals = useMemo(() => invoiceTotals(data, agent?.state), [data, agent?.state]);
  const checklist = useMemo(() => invoiceChecklist(data, agent?.companyName, agent?.state), [data, agent?.companyName, agent?.state]);
  if (!agent) return null;
  if (loading) return <FormSkeleton label="Loading invoice" />;

  const labels = INVOICE_LABELS[data.docType];
  const inter = isInterState(agent.state, data.billTo.placeOfSupply);
  const treatment = GST_TREATMENTS.find((g) => g.id === data.billTo.gstTreatment);

  const changeType = (t: InvoiceKind) => {
    const wasSuggested = numbers && data.number === numbers[data.docType].next;
    patch({ docType: t, number: !editId && (wasSuggested || !data.number) && numbers ? numbers[t].next : data.number });
  };

  const applyCustomer = (c: SavedCustomer) => {
    patch({
      customerId: c.id,
      billTo: { name: c.name, company: c.company, email: c.email, phone: c.phone, gstTreatment: c.gstTreatment || "consumer", gstin: c.gstin, placeOfSupply: c.placeOfSupply, pan: c.pan, address: c.address },
    });
  };

  const setLine = (i: number, p: Partial<InvoiceData["items"][number]>) => patch({ items: data.items.map((l, j) => (j === i ? { ...l, ...p } : l)) });

  const persist = async (): Promise<string | null> => {
    setShowChecklist(true);
    if (checklist.length) {
      toast.error("Could not save this invoice.", { description: checklist[0] });
      document.getElementById("invoice-checklist")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return null;
    }
    const r = docId
      ? await api<{ document: DocumentSummary }>(`/api/agent/documents/${docId}`, { method: "PATCH", json: { data, generatePdf: true } })
      : await api<{ document: DocumentSummary; becameActive: boolean }>("/api/agent/documents", { method: "POST", json: { kind: data.docType, data, generatePdf: true } });
    if (!r.success || !r.data) {
      toast.error("Could not save this invoice.", { description: r.error?.message });
      return null;
    }
    const id = r.data.document.id;
    setDocId(id);
    if ("becameActive" in r.data && r.data.becameActive) toast.success("Your account is now Active 🎉");
    void refresh();
    void loadNumbers();
    return id;
  };

  const run = async (action: "download" | "print" | "share" | "whatsapp") => {
    setBusy(action);
    const id = await persist();
    if (id) {
      let err: string | null = null;
      if (action === "download") err = await downloadPdf(id);
      else if (action === "print") err = await openPdf(id);
      else {
        const r = await sharePdfOnWhatsApp({ id }, `${labels.title} ${data.number} · Bill to: ${data.billTo.name} · Total: ${fmt(totals.total)} ${data.currency}`);
        err = r.error ?? null;
        if (!err && !r.attached) toast.message("Please attach the downloaded PDF if WhatsApp does not include the file automatically.");
      }
      if (err) toast.error("PDF downloaded but did not save to your account. Try Save & Download again to manage it here.", { description: err });
      else toast.success(action === "download" ? "PDF saved to your library and downloaded." : "Saved to your library.");
      onSaved(id, data.docType);
    }
    setBusy(null);
  };

  const uploadStamp = async (f: File) => {
    setStampBusy(true);
    try {
      const url = await imageFileToDataUrl(f, 500);
      const r = await api<Agent>("/api/agent/profile", { method: "PATCH", json: { companyStamp: url } });
      if (!r.success || !r.data) throw new Error(r.error?.message);
      setAgent(r.data);
      toast.success("Company stamp saved to your profile.");
    } catch {
      toast.error("Could not save your company stamp. Please try again.");
    }
    setStampBusy(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="text-sm font-medium text-slate-500 hover:text-brand-600">← Back to list</button>
        <p className="text-xs text-slate-500">Customer, invoice details, and line items in order — labels on the left, same spacing as standard invoicing tools.</p>
      </div>

      <SectionCard title={docId ? `Edit ${labels.title.toLowerCase()}` : `${labels.title} form`} icon={UserRound}>
        <div className="grid gap-x-6 gap-y-4 lg:grid-cols-2">
          <Field label="Document type">
            <NativeSelect value={data.docType} disabled={!!editId} onChange={(v) => changeType(v as InvoiceKind)} options={TYPE_OPTIONS.filter((o) => o.value === data.docType || !agent || planIncludes(effectivePlan(agent), o.value))} />
          </Field>
          <Field label="Customer name" required hint={data.customerId ? `Using saved customer · ${data.billTo.email || data.billTo.phone || data.billTo.placeOfSupply || ""}` : "Pick from saved customers, or type a name and add details."}>
            <div className="flex gap-2">
              <TextInput value={data.billTo.name} onChange={(e) => patch({ billTo: { ...data.billTo, name: e.target.value }, customerId: data.customerId })} placeholder="Customer or company name" />
              <button type="button" onClick={() => setPickerOpen(true)} className={cn(secondaryBtn, "shrink-0 px-3")} title={data.customerId ? "Change saved customer" : "Pick from saved customers"}>
                <UserRound className="h-4 w-4" />
                <span className="hidden sm:inline">{data.customerId ? "Change" : "Select"}</span>
              </button>
            </div>
            <button type="button" onClick={() => setDetailsOpen(true)} className="mt-1 text-xs font-semibold text-brand-600 hover:underline">
              {data.customerId ? "Edit customer details" : "Customer details"}
            </button>
          </Field>

          <Field label="Place of supply" required={data.docType !== "receipt" && data.billTo.gstTreatment !== "overseas"} hint={data.billTo.placeOfSupply ? `PDF tax columns: ${inter ? "IGST (different state)" : "CGST + SGST (same state)"}` : "Select the state where GST applies for this customer."}>
            <NativeSelect value={data.billTo.placeOfSupply} onChange={(v) => patch({ billTo: { ...data.billTo, placeOfSupply: v } })} options={PLACES_OF_SUPPLY} placeholder="Select state" />
          </Field>
          <Field label="GST treatment" hint={treatment?.doc}>
            <NativeSelect value={data.billTo.gstTreatment} onChange={(v) => patch({ billTo: { ...data.billTo, gstTreatment: v } })} options={GST_TREATMENTS.map((g) => ({ value: g.id, label: g.label }))} />
          </Field>
          <Field label="Customer GST on PDF">
            <div className="flex gap-2">
              {[true, false].map((v) => (
                <button key={String(v)} type="button" onClick={() => patch({ showCustomerGst: v })} className={cn("h-10 flex-1 rounded-xl border text-sm font-medium", data.showCustomerGst === v ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600")}>
                  {v ? "Show" : "Hide"}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Customer GSTIN">
            <TextInput value={data.billTo.gstin} onChange={(e) => patch({ billTo: { ...data.billTo, gstin: e.target.value.toUpperCase() } })} placeholder="Customer GSTIN" />
          </Field>

          <Field label={`${labels.short} number`} required>
            <div className="flex gap-2">
              <TextInput value={data.number} onChange={(e) => patch({ number: e.target.value })} placeholder={data.docType === "invoice" ? "INV-0001" : data.docType === "proforma" ? "PI-0001" : "RCPT-0001"} className="font-mono" />
              <button type="button" onClick={() => setSettingsOpen(true)} className={cn(secondaryBtn, "shrink-0 px-3")} title="Edit prefixes and digit length for automatic numbers" aria-label="Document number settings">
                <Settings2 className="h-4 w-4" />
              </button>
            </div>
            {numbers && data.number !== numbers[data.docType].next && !editId ? (
              <button type="button" onClick={() => patch({ number: numbers[data.docType].next })} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
                <Wand2 className="h-3 w-3" /> Use next suggested number ({numbers[data.docType].next})
              </button>
            ) : null}
          </Field>
          <Field label="Order number">
            <TextInput value={data.orderNumber} onChange={(e) => patch({ orderNumber: e.target.value })} placeholder="TD-20260409-01" />
          </Field>
          <Field label={`${labels.short} date`}>
            <div className="flex gap-2">
              <TextInput type="date" value={data.date} onChange={(e) => patch({ date: e.target.value })} />
              <button type="button" onClick={() => patch({ date: today() })} className={cn(secondaryBtn, "shrink-0 px-3")} title="Use today">
                <CalendarCheck2 className="h-4 w-4" />
              </button>
            </div>
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Item details" description={`Amount fills in from quantity and rate for each row. Pick ${inter ? "an IGST" : "a GST"} rate per line.`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 font-semibold">Item details</th>
                <th className="w-24 pb-2 text-right font-semibold">Quantity</th>
                <th className="w-32 pb-2 pr-4 text-right font-semibold">Rate</th>
                <th className="w-40 pb-2 pl-1 font-semibold" title={inter ? "IGST rate applied to this line" : "GST rate applied to this line"}>Tax</th>
                <th className="w-32 pb-2 text-right font-semibold">Amount</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((l, i) => (
                <tr key={i} className="align-top">
                  <td className="py-1.5 pr-2">
                    <TextArea aria-label={`Item description ${i + 1}`} rows={1} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} placeholder="Type or click to select an item." className="min-h-10" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <TextInput aria-label={`Quantity row ${i + 1}`} inputMode="decimal" value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} className="text-right" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <TextInput aria-label={`Rate row ${i + 1}`} inputMode="decimal" value={l.rate} onChange={(e) => setLine(i, { rate: e.target.value })} placeholder="0.00" className="text-right" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <select aria-label={`Tax row ${i + 1}`} value={l.tax} onChange={(e) => setLine(i, { tax: e.target.value })} className={inputClass(true)}>
                      {TAX_RATES.map((t) => (
                        <option key={t.id} value={t.id}>{inter && t.rate ? t.label.replace("GST", "IGST") : t.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 pr-2 text-right font-semibold tabular-nums text-slate-900">{fmt(totals.lines[i]?.amount ?? 0)}</td>
                  <td className="py-1.5">
                    <button type="button" aria-label={`Remove row ${i + 1}`} disabled={data.items.length === 1} onClick={() => patch({ items: data.items.filter((_, j) => j !== i) })} className="mt-1 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => patch({ items: [...data.items, newLine()] })} className={cn(secondaryBtn, "mt-2")}>
          <Plus className="h-4 w-4" /> Add row
        </button>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <Field label="Customer notes" hint="Shown under amounts on the customer copy.">
              <TextArea rows={3} value={data.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="Short thank-you or note shown on the PDF" />
            </Field>
            <Field label="Terms & conditions" hint="Each line prints as its own numbered point (up to twelve lines).">
              <TextArea rows={4} value={data.terms} onChange={(e) => patch({ terms: e.target.value })} />
            </Field>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-slate-700"><Stamp className="h-4 w-4 text-brand-500" /> Company stamp</p>
              <p className="text-xs text-slate-500">Optional. Appears on the PDF above “Authorised signatory”. Saved to your profile for next time.</p>
              <div className="mt-3 flex items-center gap-3">
                {agent.companyStamp ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={agent.companyStamp} alt="Company stamp" className="h-14 w-20 rounded-lg object-contain ring-1 ring-slate-200" />
                ) : null}
                <label className={cn(secondaryBtn, "cursor-pointer")}>
                  {stampBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {stampBusy ? "Uploading…" : agent.companyStamp ? "Change" : "Choose stamp"}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void uploadStamp(f); }} />
                </label>
                {!agent.companyStamp ? <span className="text-xs text-slate-400">PNG with a clear seal works best.</span> : null}
              </div>
            </div>
          </div>

          <div className="h-fit rounded-2xl bg-slate-50 p-4" aria-label="Invoice totals and save">
            <Field label="Currency">
              <NativeSelect value={data.currency} onChange={(v) => patch({ currency: v })} options={CURRENCIES} />
            </Field>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Sub total</dt><dd className="tabular-nums">{fmt(totals.subtotal)}</dd></div>
              {totals.tax ? (
                inter ? (
                  <div className="flex justify-between"><dt className="text-slate-500">IGST</dt><dd className="tabular-nums">{fmt(totals.igst)}</dd></div>
                ) : (
                  <>
                    <div className="flex justify-between"><dt className="text-slate-500">CGST</dt><dd className="tabular-nums">{fmt(totals.cgst)}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">SGST</dt><dd className="tabular-nums">{fmt(totals.sgst)}</dd></div>
                  </>
                )
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Round off / adjustment</dt>
                <dd><TextInput aria-label="Round off amount" inputMode="decimal" value={data.roundOff} onChange={(e) => patch({ roundOff: e.target.value })} placeholder="0.00" className="h-8 w-24 text-right" /></dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold"><dt>Total ({data.currency})</dt><dd className="tabular-nums text-brand-600">{fmt(totals.total)}</dd></div>
              <div className="flex justify-between text-xs text-slate-500"><dt>Total qty (all rows)</dt><dd>{totals.qty}</dd></div>
            </dl>
          </div>
        </div>
      </SectionCard>

      <LivePreview kind={data.docType} data={data} documentId={docId} className="mx-auto w-full max-w-2xl" />

      {showChecklist && checklist.length ? (
        <div id="invoice-checklist" role="alert" className="rounded-3xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-800">Before you save</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-rose-700">
            {checklist.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </div>
      ) : null}

      <p className="text-right text-xs text-slate-500">Save &amp; Download stores the document and downloads the PDF. On mobile, WhatsApp can attach the PDF directly.</p>
      <div className="ml-auto flex w-fit">
        <div className="flex">
          <button type="button" onClick={() => run("download")} disabled={!!busy} className={cn(primaryBtn, "rounded-r-none")}>
            {busy === "download" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Save &amp; Download
          </button>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button type="button" disabled={!!busy} aria-label="More save options" className="inline-flex h-10 items-center btn-glow rounded-r-lg bg-[var(--primary)] px-2.5 text-white hover:bg-brand-600 disabled:opacity-50">
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
              <DropdownMenuItem className="cursor-pointer gap-2 rounded-xl py-2" onSelect={() => run("print")}><Printer className="h-4 w-4" /> Save &amp; Print (PDF)</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2 rounded-xl py-2" onSelect={() => run("share")}><Share2 className="h-4 w-4" /> Save &amp; Share (PDF)</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2 rounded-xl py-2" onSelect={() => run("whatsapp")}><MessageCircle className="h-4 w-4 text-emerald-600" /> Save &amp; WhatsApp (PDF)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CustomerPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(c) => {
          applyCustomer(c);
          setPickerOpen(false);
        }}
        onAdd={() => {
          setPickerOpen(false);
          patch({ customerId: "" });
          setDetailsOpen(true);
        }}
      />
      <CustomerDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        initial={data.billTo}
        customerId={data.customerId}
        onSaved={(c) => {
          applyCustomer(c);
          setDetailsOpen(false);
        }}
      />
      <NumberSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        info={numbers}
        kind={data.docType}
        onSaved={(n) => {
          setNumbers(n);
          setSettingsOpen(false);
          if (!editId) patch({ number: n[data.docType].next });
        }}
      />
    </div>
  );
}
