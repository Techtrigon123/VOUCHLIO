"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Clock, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAgent } from "./AgentProvider";
import { ExtractUploader } from "./ExtractUploader";
import { LivePreview } from "./LivePreview";
import { Field, NativeSelect, PageHeader, PageShell, Segmented, TextArea, TextInput, primaryBtn, secondaryBtn } from "./ui";
import { api } from "@/lib/agent/client";
import {
  AIRLINES,
  CURRENCIES,
  FARE_MODES,
  PASSENGER_TITLES,
  TRAVEL_CLASSES,
  defaultAirTicket,
  flightDuration,
  money,
  newPassenger,
  newSegment,
  segmentError,
  ticketTotal,
  validateAirTicket,
  type AirTicketData,
  type FareMode,
  type FlightSegment,
  type Passenger,
  type PassengerType,
  type TicketStatus,
} from "@/lib/agent/documents";
import type { ExtractedTicket } from "@/lib/agent/extract";
import type { DocumentSummary } from "@/lib/agent/types";

const STEPS = ["Flight", "Passengers", "Payment", "PNR & tickets", "Review"] as const;

function applyExtract(prev: AirTicketData, f: ExtractedTicket): { data: AirTicketData; count: number; unknownAirline: boolean } {
  const d: AirTicketData = { ...prev };
  let count = 0;
  let unknownAirline = false;
  if (f.segments?.length) {
    d.segments = f.segments.map((s) => {
      const code = s.airlineCode.trim().toUpperCase();
      const known = AIRLINES.find((a) => a.code === code);
      if (!known) unknownAirline = true;
      return {
        ...newSegment(),
        airlineCode: known ? known.code : "",
        airlineName: known ? known.name : s.airlineName,
        otherAirline: false,
        flightNumber: s.flightNumber.replace(/\s+/g, "").toUpperCase(),
        from: s.from.toUpperCase().slice(0, 3),
        to: s.to.toUpperCase().slice(0, 3),
        departure: s.departure.slice(0, 16),
        arrival: s.arrival.slice(0, 16),
        depTerminal: s.depTerminal,
        arrTerminal: s.arrTerminal,
        travelClass: TRAVEL_CLASSES.includes(s.travelClass) ? s.travelClass : "Economy",
        bookingClass: s.bookingClass.toUpperCase().slice(0, 1),
      };
    });
    count++;
  }
  if (f.passengers?.length) {
    d.passengers = f.passengers.map((p) => ({
      ...newPassenger(),
      title: PASSENGER_TITLES.includes(p.title) ? p.title : "",
      type: p.type,
      firstName: p.firstName,
      lastName: p.lastName,
      ticketNumber: p.ticketNumber,
      seat: p.seat,
      meal: p.meal,
      cabinBaggage: p.cabinBaggage || "7 kg",
      checkedBaggage: p.checkedBaggage || "15 kg",
    }));
    count++;
  }
  if (f.airlinePnr || f.crsPnr) {
    d.airlinePnr = f.airlinePnr.toUpperCase();
    d.crsPnr = f.crsPnr.toUpperCase();
    count++;
  }
  if (f.grandTotal > 0 || f.baseFare > 0) {
    d.baseFare = f.baseFare ? String(f.baseFare) : String(f.grandTotal);
    d.taxes = f.taxes ? String(f.taxes) : "";
    if (/^[A-Z]{3}$/.test(f.currency)) d.currency = f.currency;
    count++;
  }
  return { data: d, count, unknownAirline };
}

function SegmentForm({ seg, index, onChange, onRemove, showErrors }: { seg: FlightSegment; index: number; onChange: (s: FlightSegment) => void; onRemove?: () => void; showErrors: boolean }) {
  const dur = flightDuration(seg.departure, seg.arrival);
  const err = showErrors ? segmentError(seg) : null;
  return (
    <div className={cn("rounded-2xl border bg-slate-50/50 p-4", err ? "border-rose-200" : "border-slate-200")}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">Segment {index + 1}</p>
        {onRemove ? (
          <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /> Remove</button>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Airline" required>
          <NativeSelect
            value={seg.otherAirline ? "__other" : seg.airlineCode}
            onChange={(v) => {
              if (v === "__other") onChange({ ...seg, otherAirline: true, airlineCode: "", airlineName: "" });
              else onChange({ ...seg, otherAirline: false, airlineCode: v, airlineName: AIRLINES.find((a) => a.code === v)?.name ?? "" });
            }}
            placeholder="Select airline"
            options={[...AIRLINES.map((a) => ({ value: a.code, label: `${a.name} (${a.code})` })), { value: "__other", label: "Other airline (not in list)" }]}
          />
        </Field>
        {seg.otherAirline ? (
          <>
            <Field label="Airline name" required>
              <TextInput value={seg.airlineName} onChange={(e) => onChange({ ...seg, airlineName: e.target.value })} />
            </Field>
            <Field label="Airline code" required hint="2 letters or digits">
              <TextInput maxLength={2} value={seg.airlineCode} onChange={(e) => onChange({ ...seg, airlineCode: e.target.value.toUpperCase() })} />
            </Field>
          </>
        ) : null}
        <Field label="Flight number" required>
          <TextInput value={seg.flightNumber} onChange={(e) => onChange({ ...seg, flightNumber: e.target.value.toUpperCase() })} placeholder="AI2871" />
        </Field>
        <Field label="From (IATA)" required>
          <TextInput maxLength={3} value={seg.from} onChange={(e) => onChange({ ...seg, from: e.target.value.toUpperCase() })} placeholder="DEL" />
        </Field>
        <Field label="To (IATA)" required>
          <TextInput maxLength={3} value={seg.to} onChange={(e) => onChange({ ...seg, to: e.target.value.toUpperCase() })} placeholder="HYD" />
        </Field>
        <Field label="Departure" required>
          <TextInput type="datetime-local" value={seg.departure} onChange={(e) => onChange({ ...seg, departure: e.target.value })} />
        </Field>
        <Field label="Arrival" required>
          <TextInput type="datetime-local" min={seg.departure || undefined} value={seg.arrival} onChange={(e) => onChange({ ...seg, arrival: e.target.value })} />
        </Field>
        <div className="flex items-end">
          <p className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
            <Clock className="h-3.5 w-3.5 text-brand-500" />
            {dur ? <>Flight duration: <span className="font-semibold">{dur}</span></> : "Duration appears after you set departure and arrival times."}
          </p>
        </div>
        <Field label="Dep terminal">
          <TextInput value={seg.depTerminal} onChange={(e) => onChange({ ...seg, depTerminal: e.target.value })} placeholder="T2 or airport name" />
        </Field>
        <Field label="Arr terminal">
          <TextInput value={seg.arrTerminal} onChange={(e) => onChange({ ...seg, arrTerminal: e.target.value })} placeholder="T1 or airport name" />
        </Field>
        <Field label="Travel class">
          <NativeSelect value={seg.travelClass} onChange={(v) => onChange({ ...seg, travelClass: v })} options={TRAVEL_CLASSES} />
        </Field>
        <Field label="Booking class (barcode)">
          <TextInput maxLength={1} value={seg.bookingClass} onChange={(e) => onChange({ ...seg, bookingClass: e.target.value.toUpperCase() })} placeholder="Y" />
        </Field>
      </div>
      {err ? <p className="mt-2 text-xs font-medium text-rose-600">{err}</p> : null}
    </div>
  );
}

function PassengerForm({ p, index, onChange, onRemove }: { p: Passenger; index: number; onChange: (p: Passenger) => void; onRemove?: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">Passenger {index + 1}</p>
        {onRemove ? (
          <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /> Remove</button>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Title">
          <NativeSelect value={p.title} onChange={(v) => onChange({ ...p, title: v })} options={PASSENGER_TITLES} placeholder="Select title" />
        </Field>
        <Field label="Type">
          <NativeSelect value={p.type} onChange={(v) => onChange({ ...p, type: v as PassengerType })} options={[{ value: "ADULT", label: "Adult" }, { value: "CHILD", label: "Child" }, { value: "INFANT", label: "Infant" }]} />
        </Field>
        <Field label="First name" required>
          <TextInput value={p.firstName} onChange={(e) => onChange({ ...p, firstName: e.target.value })} />
        </Field>
        <Field label="Last name" required>
          <TextInput value={p.lastName} onChange={(e) => onChange({ ...p, lastName: e.target.value })} />
        </Field>
        <Field label="Gender">
          <NativeSelect value={p.gender} onChange={(v) => onChange({ ...p, gender: v })} options={["Male", "Female", "Other"]} placeholder="Select gender" />
        </Field>
        <Field label="Date of birth" hint="Optional — today or earlier.">
          <TextInput type="date" max={new Date().toISOString().slice(0, 10)} value={p.dob} onChange={(e) => onChange({ ...p, dob: e.target.value })} />
        </Field>
        <Field label="Seat">
          <TextInput value={p.seat} onChange={(e) => onChange({ ...p, seat: e.target.value.toUpperCase() })} placeholder="12A" />
        </Field>
        <Field label="Meal">
          <TextInput value={p.meal} onChange={(e) => onChange({ ...p, meal: e.target.value })} placeholder="VGML" />
        </Field>
        <Field label="Cabin baggage">
          <TextInput value={p.cabinBaggage} onChange={(e) => onChange({ ...p, cabinBaggage: e.target.value })} />
        </Field>
        <Field label="Checked baggage">
          <TextInput value={p.checkedBaggage} onChange={(e) => onChange({ ...p, checkedBaggage: e.target.value })} />
        </Field>
        <Field label="Special service">
          <TextInput value={p.specialService} onChange={(e) => onChange({ ...p, specialService: e.target.value })} placeholder="WCHR" />
        </Field>
        <Field label="Frequent flyer">
          <TextInput value={p.frequentFlyer} onChange={(e) => onChange({ ...p, frequentFlyer: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

export function AirTicketComposer({ editId }: { editId?: string }) {
  const router = useRouter();
  const { agent, refresh } = useAgent();
  const [data, setData] = useState<AirTicketData>(() => ({ ...defaultAirTicket(), agencyGstin: agent?.gstNumber ?? "", agencyIata: agent?.iataNumber ?? "" }));
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState("");
  const patch = (p: Partial<AirTicketData>) => setData((d) => ({ ...d, ...p }));

  useEffect(() => {
    if (!editId) return;
    void api<{ document: DocumentSummary; data: AirTicketData }>(`/api/agent/documents/${editId}`).then((r) => {
      if (!r.success || !r.data) {
        toast.error("Failed to load booking", { description: r.error?.message });
        router.replace("/dashboard/flights");
        return;
      }
      setData({ ...defaultAirTicket(), ...r.data.data });
      setLoading(false);
    });
  }, [editId, router]);

  const stepKey = step === 0 ? "flight" : step === 1 ? "passengers" : step === 3 ? "pnr" : undefined;
  const next = () => {
    setError("");
    const err = stepKey ? validateAirTicket(data, stepKey) : null;
    if (err) {
      setShowErrors(true);
      setError(err);
      return;
    }
    setShowErrors(false);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    const err = validateAirTicket(data);
    if (err) {
      setError(err);
      toast.error("Could not save booking", { description: err });
      return;
    }
    setSaving(true);
    // GSTIN / IATA typed here are remembered on the agent profile.
    const profilePatch: Record<string, string> = {};
    if (data.agencyGstin.trim() && data.agencyGstin.trim() !== (agent?.gstNumber ?? "")) profilePatch.gstNumber = data.agencyGstin.trim();
    if (data.agencyIata.trim() && data.agencyIata.trim() !== (agent?.iataNumber ?? "")) profilePatch.iataNumber = data.agencyIata.trim();
    if (Object.keys(profilePatch).length) await api("/api/agent/profile", { method: "PATCH", json: profilePatch });
    const clean: AirTicketData = { ...data, crsPnr: data.crsPnr.toUpperCase(), airlinePnr: data.airlinePnr.toUpperCase() };
    const r = editId
      ? await api<{ document: DocumentSummary }>(`/api/agent/documents/${editId}`, { method: "PATCH", json: { data: clean } })
      : await api<{ document: DocumentSummary; becameActive: boolean }>("/api/agent/documents", { method: "POST", json: { kind: "air_ticket", data: clean } });
    setSaving(false);
    if (!r.success || !r.data) {
      setError(r.error?.message || "Could not save booking");
      toast.error("Could not save booking", { description: r.error?.message });
      return;
    }
    toast.success(editId ? "Ticket updated" : "Booking saved", { description: "Download the PDF, email it, or share on WhatsApp." });
    if ("becameActive" in r.data && r.data.becameActive) toast.success("Your account is now Active 🎉");
    void refresh();
    router.push(`/dashboard/flights/${r.data.document.id}`);
  };

  if (loading) return <PageShell><p className="py-16 text-center text-sm text-slate-500">Loading…</p></PageShell>;
  const total = ticketTotal(data);

  return (
    <PageShell>
      <PageHeader
        back={{ href: editId ? `/dashboard/flights/${editId}` : "/dashboard/flights", label: "Airline tickets" }}
        eyebrow="Flights"
        title={editId ? "Edit airline ticket" : "New airline ticket"}
        description="Upload an e-ticket or itinerary to fill the form automatically, or enter details manually. Always review before saving."
      />

      {!editId ? (
        <div className="mb-5">
          <ExtractUploader<ExtractedTicket>
            type="ticket"
            onFields={(f) => {
              const r = applyExtract(data, f);
              setData(r.data);
              if (r.unknownAirline) toast.message("Some airlines from the file were not in your list. Please select the airline for each flight segment.");
              return r.count;
            }}
          />
        </div>
      ) : null}

      <ol className="mb-5 grid grid-cols-5 gap-1.5" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={cn("flex w-full flex-col items-start rounded-2xl border px-3 py-2 text-left transition", i === step ? "border-brand-300 bg-brand-50" : i < step ? "border-emerald-200 bg-white hover:bg-emerald-50/50" : "border-slate-200 bg-white opacity-60")}
            >
              <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold", i === step ? "bg-[var(--primary)] text-white" : i < step ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500")}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className="mt-1 hidden text-xs font-semibold text-slate-700 sm:block">{s}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        {step === 0 ? (
          <div className="space-y-3">
            <h2 className="text-base font-semibold">Flight details</h2>
            {data.segments.map((g, i) => (
              <SegmentForm
                key={i}
                seg={g}
                index={i}
                showErrors={showErrors}
                onChange={(s) => patch({ segments: data.segments.map((x, j) => (j === i ? s : x)) })}
                onRemove={data.segments.length > 1 ? () => patch({ segments: data.segments.filter((_, j) => j !== i) }) : undefined}
              />
            ))}
            <button type="button" onClick={() => patch({ segments: [...data.segments, { ...newSegment(), from: data.segments[data.segments.length - 1]?.to ?? "" }] })} className={secondaryBtn}>
              <Plus className="h-4 w-4" /> Add segment
            </button>
          </div>
        ) : step === 1 ? (
          <div className="space-y-3">
            <h2 className="text-base font-semibold">Passengers</h2>
            {data.passengers.map((p, i) => (
              <PassengerForm
                key={i}
                p={p}
                index={i}
                onChange={(np) => patch({ passengers: data.passengers.map((x, j) => (j === i ? np : x)) })}
                onRemove={data.passengers.length > 1 ? () => patch({ passengers: data.passengers.filter((_, j) => j !== i) }) : undefined}
              />
            ))}
            <button type="button" onClick={() => patch({ passengers: [...data.passengers, newPassenger()] })} className={secondaryBtn}>
              <Plus className="h-4 w-4" /> Add passenger
            </button>
          </div>
        ) : step === 2 ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold">Agency details on ticket PDF</h2>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <Field label="Agency GSTIN" hint="Saved to your agent profile.">
                  <TextInput value={data.agencyGstin} onChange={(e) => patch({ agencyGstin: e.target.value.toUpperCase() })} />
                </Field>
                <Field label="Agency IATA No." hint="Shown on the PDF when IATA No. is enabled on the ticket.">
                  <TextInput value={data.agencyIata} onChange={(e) => patch({ agencyIata: e.target.value })} />
                </Field>
              </div>
            </div>
            <div>
              <h2 className="text-base font-semibold">Fare on PDF</h2>
              <Segmented<FareMode> className="mt-3" value={data.fareMode} onChange={(v) => patch({ fareMode: v })} options={FARE_MODES.map((m) => ({ value: m.id, label: m.id === "breakdown" ? "With fare breakdown" : m.id === "total" ? "Total only (no breakdown)" : "Hide fare on PDF" }))} />
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Field label="Currency">
                  <NativeSelect value={data.currency} onChange={(v) => patch({ currency: v })} options={CURRENCIES} />
                </Field>
                <Field label="Base fare">
                  <TextInput inputMode="decimal" value={data.baseFare} onChange={(e) => patch({ baseFare: e.target.value })} placeholder="0.00" />
                </Field>
                <Field label="Taxes">
                  <TextInput inputMode="decimal" value={data.taxes} onChange={(e) => patch({ taxes: e.target.value })} placeholder="0.00" />
                </Field>
                <Field label="GST (fare amount)">
                  <TextInput inputMode="decimal" value={data.gst} onChange={(e) => patch({ gst: e.target.value })} placeholder="0.00" />
                </Field>
                <Field label="Convenience fee">
                  <TextInput inputMode="decimal" value={data.convenienceFee} onChange={(e) => patch({ convenienceFee: e.target.value })} placeholder="0.00" />
                </Field>
                <Field label="Discount">
                  <TextInput inputMode="decimal" value={data.discount} onChange={(e) => patch({ discount: e.target.value })} placeholder="0.00" />
                </Field>
              </div>
              <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                Grand total: <span className="font-bold text-brand-700">{money(total, data.currency)}</span>
              </p>
            </div>
          </div>
        ) : step === 3 ? (
          <div className="space-y-5">
            <h2 className="text-base font-semibold">CRS PNR, Airline PNR &amp; e-ticket numbers</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="CRS PNR (GDS locator)" hint="Exactly 6 letters or numbers from your booking system.">
                <TextInput maxLength={6} value={data.crsPnr} onChange={(e) => patch({ crsPnr: e.target.value.toUpperCase() })} placeholder="ABC123" className="font-mono" />
              </Field>
              <Field label="Airline PNR" required hint="Exactly 6 letters or numbers from the airline.">
                <TextInput maxLength={6} value={data.airlinePnr} onChange={(e) => patch({ airlinePnr: e.target.value.toUpperCase() })} placeholder="GW0L90" className="font-mono" />
              </Field>
              <Field label="Booking status">
                <NativeSelect value={data.status} onChange={(v) => patch({ status: v as TicketStatus })} options={[{ value: "CONFIRMED", label: "Confirmed" }, { value: "PENDING", label: "Pending" }, { value: "CANCELLED", label: "Cancelled" }]} />
              </Field>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">E-ticket number (optional) — per passenger</p>
              {data.passengers.map((p, i) => (
                <div key={i} className="grid items-center gap-2 sm:grid-cols-[1fr_260px]">
                  <p className="text-sm text-slate-700">{`${p.title} ${p.firstName} ${p.lastName}`.trim() || `Passenger ${i + 1}`}</p>
                  <TextInput value={p.ticketNumber} onChange={(e) => patch({ passengers: data.passengers.map((x, j) => (j === i ? { ...x, ticketNumber: e.target.value } : x)) })} placeholder="As printed on the airline ticket" className="font-mono" />
                </div>
              ))}
              <p className="text-xs text-slate-500">Leave blank if the airline has not issued an e-ticket number yet.</p>
            </div>
            <Field label="Notes">
              <TextArea rows={3} value={data.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="Web check-in, fare rules, reporting time…" />
            </Field>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <h2 className="text-base font-semibold">Review</h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                ["CRS PNR:", data.crsPnr || "—"],
                ["Airline PNR:", data.airlinePnr],
                ["Segments:", data.segments.map((g) => `${g.flightNumber} ${g.from}→${g.to}`).join(" · ")],
                ["Passengers:", data.passengers.map((p) => `${p.firstName} ${p.lastName}`).join(", ")],
                ...(data.fareMode === "hide"
                  ? [["Fare:", "Hidden on PDF"]]
                  : [
                      ["Base fare:", money(+data.baseFare || 0, data.currency)],
                      ["Taxes:", money(+data.taxes || 0, data.currency)],
                      ["GST (fare amount):", money(+data.gst || 0, data.currency)],
                      ["Convenience fee:", money(+data.convenienceFee || 0, data.currency)],
                      ["Discount:", money(+data.discount || 0, data.currency)],
                      ["Grand total:", money(total, data.currency)],
                    ]),
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <dt className="text-xs text-slate-500">{k}</dt>
                  <dd className="font-semibold text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
            <LivePreview kind="air_ticket" data={{ ...data, crsPnr: data.crsPnr.toUpperCase(), airlinePnr: data.airlinePnr.toUpperCase() }} className="mx-auto w-full max-w-2xl" />
            <p className="text-xs text-slate-500">After saving you can download the PDF, email it, or share on WhatsApp.</p>
          </div>
        )}

        {error ? <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <div className="mt-6 flex justify-between gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={() => { setError(""); setStep((s) => Math.max(0, s - 1)); }} disabled={step === 0} className={secondaryBtn}>
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className={primaryBtn}>
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={save} disabled={saving} className={primaryBtn}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? "Saving…" : editId ? "Save changes" : "Save booking"}
            </button>
          )}
        </div>
      </div>
    </PageShell>
  );
}
