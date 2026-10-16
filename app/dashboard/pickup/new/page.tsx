"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Car, Copy, FileDown, Home, Loader2, MapPin, MessageSquareText, UserRound } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAgent } from "@/components/agent/AgentProvider";
import {
  Field,
  NativeSelect,
  PageHeader,
  PageShell,
  SectionCard,
  Stepper,
  TextArea,
  TextInput,
  primaryBtn,
  secondaryBtn,
  useFeatureGate,
} from "@/components/agent/ui";
import { api, downloadPdf } from "@/lib/agent/client";
import {
  PICKUP_LAYOUTS,
  PICKUP_POINTS,
  SALUTATIONS,
  VEHICLE_TYPES,
  defaultPickupVoucher,
  pickupErrors,
  pickupProgress,
  type PickupVoucherData,
} from "@/lib/agent/documents";
import type { DocumentSummary } from "@/lib/agent/types";
import { FormSkeleton } from "@/components/agent/skeletons";
import { LivePreview } from "@/components/agent/LivePreview";

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function PickupEditorPage() {
  const enabled = useFeatureGate("pickup_voucher", "Pickup vouchers");
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const { agent, refresh } = useAgent();
  const [data, setData] = useState<PickupVoucherData>(defaultPickupVoucher);
  const [docId, setDocId] = useState<string | null>(id);
  const [loading, setLoading] = useState(!!id);
  const [savedSnap, setSavedSnap] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const patch = (p: Partial<PickupVoucherData>) => setData((d) => ({ ...d, ...p }));

  useEffect(() => {
    if (!id) return;
    void api<{ document: DocumentSummary; data: PickupVoucherData }>(`/api/agent/documents/${id}`).then((r) => {
      if (!r.success || !r.data) {
        toast.error("Could not open this pickup voucher", { description: r.error?.message });
        router.replace("/dashboard/pickup");
        return;
      }
      const d = { ...defaultPickupVoucher(), ...r.data.data };
      setData(d);
      setSavedSnap(JSON.stringify(d));
      setLoading(false);
    });
  }, [id, router]);

  const errors = useMemo(() => (touched ? pickupErrors(data) : {}), [data, touched]);
  const progress = pickupProgress(data);
  const dirty = JSON.stringify(data) !== savedSnap;

  if (!enabled) return null;
  if (loading || !agent) return <FormSkeleton label="Loading pickup voucher" preview={false} />;

  const agencyMissing = !(agent.brandName?.trim() || agent.companyName?.trim());

  const generate = async () => {
    setTouched(true);
    if (agencyMissing) {
      toast.error("Add your brand or company name in Agent profile before generating a pickup voucher.");
      return;
    }
    const errs = Object.values(pickupErrors(data));
    if (errs.length) {
      toast.error("Please complete required fields", { description: errs[0] });
      return;
    }
    setBusy(true);
    const r = docId
      ? await api<{ document: DocumentSummary }>(`/api/agent/documents/${docId}`, { method: "PATCH", json: { data, generatePdf: true } })
      : await api<{ document: DocumentSummary; becameActive: boolean }>("/api/agent/documents", { method: "POST", json: { kind: "pickup_voucher", data, generatePdf: true } });
    if (!r.success || !r.data) {
      setBusy(false);
      toast.error("Could not save pickup voucher", { description: r.error?.message });
      return;
    }
    const newId = r.data.document.id;
    if (!docId) {
      setDocId(newId);
      router.replace(`/dashboard/pickup/new?id=${newId}`, { scroll: false });
    }
    setSavedSnap(JSON.stringify(data));
    const err = await downloadPdf(newId);
    setBusy(false);
    if (err) toast.error("PDF failed", { description: err });
    else toast.success("PDF saved and downloaded");
    if ("becameActive" in r.data && r.data.becameActive) toast.success("Your account is now Active 🎉");
    void refresh();
  };

  const isAirport = data.pickupFrom === "Airport";
  const isRail = data.pickupFrom === "Railway Station";

  return (
    <PageShell wide>
      <PageHeader
        back={{ href: "/dashboard/pickup", label: "Saved Vouchers" }}
        eyebrow="Transport Voucher"
        title={docId ? "Edit Pickup Voucher" : "Create Pickup Voucher"}
        description="Fill guest, pickup, and driver details. Your agency name and logo are added to the PDF automatically from your profile."
      />

      {agencyMissing ? (
        <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Add your brand or company name in <Link href="/dashboard/profile/edit" className="font-semibold underline">Agent profile</Link> before generating a pickup voucher.
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <SectionCard title="Guest Details" description="Who is travelling" icon={UserRound}>
            <div className="grid gap-4 md:grid-cols-[130px_1fr_auto]">
              <Field label="Title">
                <NativeSelect value={data.guestTitle} onChange={(v) => patch({ guestTitle: v })} options={SALUTATIONS} placeholder="Optional" />
              </Field>
              <Field label="Guest Name" required error={errors.guestName}>
                <TextInput value={data.guestName} invalid={!!errors.guestName} onChange={(e) => patch({ guestName: e.target.value })} placeholder="Rajesh Kumar" />
              </Field>
              <Field label="No. of Pax" hint="Total passengers for this pickup">
                <Stepper label="No. of Pax" value={data.pax} min={1} max={60} onChange={(v) => patch({ pax: v })} />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Pickup & Schedule" description="When and where to meet the guest" icon={MapPin}>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Pickup Date" required error={errors.pickupDate} hint="Past dates cannot be selected">
                <TextInput type="date" min={todayISO()} value={data.pickupDate} invalid={!!errors.pickupDate} onChange={(e) => patch({ pickupDate: e.target.value })} />
              </Field>
              <Field label="Pickup Time" required error={errors.pickupTime}>
                <TextInput type="time" value={data.pickupTime} invalid={!!errors.pickupTime} onChange={(e) => patch({ pickupTime: e.target.value })} />
              </Field>
              <Field label="City" required error={errors.city} hint="City where the guest is picked up">
                <TextInput value={data.city} invalid={!!errors.city} onChange={(e) => patch({ city: e.target.value })} placeholder="Mumbai" />
              </Field>
              <Field label="Pickup From" required error={errors.pickupFrom} hint="Airport, railway station, hotel, etc." className="md:col-span-3">
                <div className="flex flex-wrap gap-2">
                  {PICKUP_POINTS.map((p) => (
                    <button key={p} type="button" onClick={() => patch({ pickupFrom: p })} className={cn("rounded-full border px-3 py-1.5 text-sm font-medium transition", data.pickupFrom === p ? "border-brand-400 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600 hover:border-brand-200")}>
                      {p}
                    </button>
                  ))}
                </div>
              </Field>
              {data.pickupFrom === "Other" ? (
                <Field label="Pickup point" className="md:col-span-3">
                  <TextInput value={data.pickupFromOther} onChange={(e) => patch({ pickupFromOther: e.target.value })} placeholder="Describe the pickup point" />
                </Field>
              ) : null}
              {isAirport ? (
                <>
                  <Field label="Airline">
                    <TextInput value={data.airline} onChange={(e) => patch({ airline: e.target.value })} placeholder="IndiGo" />
                  </Field>
                  <Field label="Flight Number">
                    <TextInput value={data.flightNumber} onChange={(e) => patch({ flightNumber: e.target.value.toUpperCase() })} placeholder="6E 2143" />
                  </Field>
                  <Field label="Pickup Location" hint="Terminal or area where the driver will meet the guest">
                    <TextInput value={data.pickupLocation} onChange={(e) => patch({ pickupLocation: e.target.value })} placeholder="Terminal 2, Gate 5" />
                  </Field>
                </>
              ) : null}
              {isRail ? (
                <>
                  <Field label="Train Name">
                    <TextInput value={data.trainName} onChange={(e) => patch({ trainName: e.target.value })} placeholder="Rajdhani Express" />
                  </Field>
                  <Field label="Train Number">
                    <TextInput value={data.trainNumber} onChange={(e) => patch({ trainNumber: e.target.value })} placeholder="12951" />
                  </Field>
                  <Field label="Station Name" required error={errors.stationName} hint="Railway station where the guest will be picked up">
                    <TextInput value={data.stationName} invalid={!!errors.stationName} onChange={(e) => patch({ stationName: e.target.value })} placeholder="Mumbai Central" />
                  </Field>
                </>
              ) : null}
              <Field label="Full Pickup Address" required error={errors.pickupAddress} hint="Full address — hotel, station, or landmark" className="md:col-span-3">
                <TextArea rows={2} value={data.pickupAddress} onChange={(e) => patch({ pickupAddress: e.target.value })} placeholder={isRail ? "Chhatrapati Shivaji Terminus, Mumbai" : "Terminal 2, Chhatrapati Shivaji Airport, Mumbai"} />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Driver & Vehicle" description="Who will meet the guest and which vehicle" icon={Car}>
            <div className="grid gap-4 md:grid-cols-[130px_1fr_1fr]">
              <Field label="Title">
                <NativeSelect value={data.driverTitle} onChange={(v) => patch({ driverTitle: v })} options={SALUTATIONS} placeholder="Optional" />
              </Field>
              <Field label="Driver / Pickup Person" required error={errors.driverName}>
                <TextInput value={data.driverName} invalid={!!errors.driverName} onChange={(e) => patch({ driverName: e.target.value })} placeholder="Rajesh Singh" />
              </Field>
              <Field label="Driver Mobile" required error={errors.driverMobile}>
                <TextInput type="tel" value={data.driverMobile} invalid={!!errors.driverMobile} onChange={(e) => patch({ driverMobile: e.target.value })} placeholder="98XXXXXXXX" />
              </Field>
              <Field label="Alternative Mobile" hint="Backup number if the guest cannot reach the driver" className="md:col-start-2">
                <TextInput type="tel" value={data.altMobile} onChange={(e) => patch({ altMobile: e.target.value })} placeholder="Optional" />
              </Field>
              <Field label="Vehicle Type">
                <NativeSelect value={data.vehicleType} onChange={(v) => patch({ vehicleType: v })} options={[...VEHICLE_TYPES, { value: "Other", label: "Other (add your own)" }]} />
              </Field>
              {data.vehicleType === "Other" ? (
                <Field label="Vehicle name" hint="Type the vehicle make, model, or colour." className="md:col-start-2">
                  <TextInput value={data.vehicleOther} onChange={(e) => patch({ vehicleOther: e.target.value })} placeholder="White Toyota Etios" />
                </Field>
              ) : null}
              <Field label="Vehicle Number" hint="Registration plate">
                <TextInput value={data.vehicleNumber} onChange={(e) => patch({ vehicleNumber: e.target.value.toUpperCase() })} placeholder="MH 12 AB 1234" />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Stay Location" description="Where the guest will stay after pickup" icon={Home}>
            <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
              <Field label="Stay City">
                <TextInput value={data.stayCity} onChange={(e) => patch({ stayCity: e.target.value })} placeholder="Mumbai" />
              </Field>
              <Field label="Stay Address" hint="Hotel, homestay, or accommodation address">
                <TextInput value={data.stayAddress} onChange={(e) => patch({ stayAddress: e.target.value })} placeholder="Hotel Grand Hyatt, Santacruz East, Mumbai" />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Note for Guest" description="Short instructions printed on the voucher" icon={MessageSquareText}>
            <Field label="Instructions" hint="Where to wait, what to carry, helpline number">
              <TextArea rows={3} value={data.instructions} onChange={(e) => patch({ instructions: e.target.value })} placeholder="Please wait at the arrival gate with your name board. Call the driver if you cannot find the vehicle." />
            </Field>
          </SectionCard>
        </div>

        {/* Sticky on wide screens; scrolls on its own when the panel is taller than the window. */}
        <aside className="space-y-4 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:self-start xl:overflow-y-auto xl:pb-2" aria-label="Pickup Voucher Actions">
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Pickup Voucher</p>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", dirty ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>{dirty ? "Unsaved changes" : "Saved"}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <span className="flex-1 font-mono text-sm font-semibold text-slate-800">{data.voucherNumber}</span>
              <button type="button" aria-label="Copy Voucher Number" onClick={() => { void navigator.clipboard.writeText(data.voucherNumber); toast.success("Copied"); }} className="text-slate-400 hover:text-brand-600">
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs font-medium text-slate-500">
                <span>Form Progress</span>
                <span className="tabular-nums">{progress.done}/{progress.total}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand-100">
                <div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${progress.percent}%` }} />
              </div>
            </div>
          </div>

          <LivePreview kind="pickup_voucher" data={data} />

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">PDF Layout</p>
            <div className="mt-3 grid gap-2">
              {PICKUP_LAYOUTS.map((l) => (
                <button key={l.id} type="button" onClick={() => patch({ layout: l.id })} className={cn("rounded-2xl border px-3 py-2.5 text-left", data.layout === l.id ? "border-brand-300 bg-brand-50" : "border-slate-200 hover:border-brand-200")}>
                  <p className="text-sm font-semibold text-slate-900">{l.label}</p>
                  <p className="text-xs text-slate-500">{l.description}</p>
                </button>
              ))}
            </div>
            <button type="button" onClick={generate} disabled={busy} className={cn(primaryBtn, "mt-4 h-11 w-full")}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              {busy ? "Generating…" : "Save & Generate PDF"}
            </button>
            <Link href="/dashboard/pickup" className={cn(secondaryBtn, "mt-2 w-full")}>Saved Vouchers</Link>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
