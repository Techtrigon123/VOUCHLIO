"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  CopyPlus,
  FileDown,
  IndianRupee,
  ListChecks,
  Loader2,
  MapPinned,
  Palette,
  Plus,
  Save,
  ScrollText,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAgent } from "@/components/agent/AgentProvider";
import {
  Field,
  FormProgress,
  NativeSelect,
  PageHeader,
  PageShell,
  SectionCard,
  Segmented,
  Stepper,
  TextArea,
  TextInput,
  iconBtn,
  primaryBtn,
  secondaryBtn,
  useFeatureGate,
} from "@/components/agent/ui";
import { api, downloadPdf } from "@/lib/agent/client";
import {
  CURRENCIES,
  EXCLUSION_SUGGESTIONS,
  INCLUSION_SUGGESTIONS,
  ITINERARY_MAX_DAYS,
  ITINERARY_PRICE_MODES,
  ITINERARY_TEMPLATES,
  SALUTATIONS,
  defaultItinerary,
  itineraryDayDate,
  itineraryDuration,
  itineraryLines,
  itineraryPrice,
  itinerarySteps,
  money,
  newItineraryDay,
  newItineraryNumber,
  validateItinerary,
  type ItineraryData,
  type ItineraryDay,
} from "@/lib/agent/documents";
import type { DocumentSummary } from "@/lib/agent/types";
import { FormSkeleton } from "@/components/agent/skeletons";
import { LivePreview } from "@/components/agent/LivePreview";
import { EditorLayout, LayoutPicker, SaveBar } from "@/components/agent/editor";

const COLOURS = ["#0f766e", "#1d4ed8", "#7c2d12", "#be123c", "#6d28d9", "#0f172a"];

/** Which section each checklist step scrolls to. */
const STEP_TARGET: Record<string, string> = {
  trip: "itn-trip",
  dates: "itn-trip",
  traveller: "itn-trip",
  days: "itn-days",
  price: "itn-price",
  preparedBy: "itn-generate",
};

const dayLabel = (iso: string) =>
  iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) : "";

/** Add a line to a one-item-per-line list, unless it's already there. */
const addLine = (list: string, line: string) => (itineraryLines(list).includes(line) ? list : [...itineraryLines(list), line].join("\n"));

export default function ItineraryBuilderPage() {
  const enabled = useFeatureGate("itinerary", "Itineraries");
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const from = params.get("from");
  const { agent, refresh } = useAgent();
  const [data, setData] = useState<ItineraryData>(defaultItinerary);
  const [docId, setDocId] = useState<string | null>(id);
  const [loading, setLoading] = useState(!!(id || from));
  const [savedSnap, setSavedSnap] = useState("");
  const [busy, setBusy] = useState<"" | "save" | "pdf">("");
  const patch = (p: Partial<ItineraryData>) => setData((d) => ({ ...d, ...p }));

  // Open a saved itinerary (?id=) or start a copy of one for another customer (?from=).
  useEffect(() => {
    const source = id || from;
    if (!source) return;
    void api<{ document: DocumentSummary; data: ItineraryData }>(`/api/agent/documents/${source}`).then((r) => {
      if (!r.success || !r.data) {
        toast.error("Could not open this itinerary", { description: r.error?.message });
        router.replace("/dashboard/itineraries");
        return;
      }
      const d = { ...defaultItinerary(), ...r.data.data };
      if (id) {
        setData(d);
        setSavedSnap(JSON.stringify(d));
      } else {
        setData({ ...d, number: newItineraryNumber(), travellerName: "", startDate: "", validUntil: "" });
        toast.success("Copy ready", { description: "Add the new traveller and dates, then save." });
      }
      setLoading(false);
    });
  }, [id, from, router]);

  const dirty = JSON.stringify(data) !== savedSnap;
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty && savedSnap !== "") e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, savedSnap]);

  const steps = useMemo(() => itinerarySteps(data).map((s) => ({ label: s.label, done: s.done, target: STEP_TARGET[s.key] })), [data]);
  const price = itineraryPrice(data);

  if (!enabled) return null;
  if (loading || !agent) return <FormSkeleton label="Loading itinerary" />;

  const agencyMissing = !(agent.brandName?.trim() || agent.companyName?.trim());

  const setDays = (fn: (days: ItineraryDay[]) => ItineraryDay[]) => setData((d) => ({ ...d, days: fn(d.days) }));
  const patchDay = (i: number, p: Partial<ItineraryDay>) => setDays((days) => days.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const moveDay = (i: number, dir: -1 | 1) =>
    setDays((days) => {
      const j = i + dir;
      if (j < 0 || j >= days.length) return days;
      const next = [...days];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const duplicateDay = (i: number) => setDays((days) => (days.length >= ITINERARY_MAX_DAYS ? days : [...days.slice(0, i + 1), structuredClone(days[i]), ...days.slice(i + 1)]));
  const removeDay = (i: number) => setDays((days) => (days.length <= 1 ? days : days.filter((_, j) => j !== i)));
  // A new day usually continues from the same place, so carry over the stay and transfer.
  const addDay = () =>
    setDays((days) => {
      if (days.length >= ITINERARY_MAX_DAYS) return days;
      const last = days[days.length - 1];
      return [...days, { ...newItineraryDay(), city: last?.city ?? "", hotel: last?.hotel ?? "", transfer: last?.transfer ?? "" }];
    });

  const persist = async (pdf: boolean) => {
    const invalid = validateItinerary(data);
    if (invalid) {
      toast.error("Almost there", { description: invalid });
      return;
    }
    if (pdf && agencyMissing) {
      toast.error("Add your brand or company name in your profile before generating an itinerary.");
      return;
    }
    setBusy(pdf ? "pdf" : "save");
    const r = docId
      ? await api<{ document: DocumentSummary }>(`/api/agent/documents/${docId}`, { method: "PATCH", json: { data, generatePdf: pdf } })
      : await api<{ document: DocumentSummary; becameActive: boolean }>("/api/agent/documents", { method: "POST", json: { kind: "itinerary", data, generatePdf: pdf } });
    if (!r.success || !r.data) {
      setBusy("");
      toast.error("Could not save the itinerary", { description: r.error?.message });
      return;
    }
    const newId = r.data.document.id;
    if (!docId) {
      setDocId(newId);
      router.replace(`/dashboard/itineraries/new?id=${newId}`, { scroll: false });
    }
    setSavedSnap(JSON.stringify(data));
    if (pdf) {
      const err = await downloadPdf(newId);
      if (err) toast.error("PDF failed", { description: err });
      else toast.success("Itinerary ready", { description: "Your PDF has been downloaded — share it with your customer." });
    } else toast.success("Itinerary saved");
    setBusy("");
    if ("becameActive" in r.data && r.data.becameActive) toast.success("Your account is now Active 🎉");
    void refresh();
  };

  return (
    <PageShell full>
      <PageHeader
        back={{ href: "/dashboard/itineraries", label: "Itineraries" }}
        title={docId ? "Edit itinerary" : "New itinerary"}
        description="Plan the trip day by day. The preview updates as you type. Required fields are marked *. Save when you are ready to download or share the PDF."
      />

      {agencyMissing ? (
        <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Add your brand or company name in <Link href="/dashboard/profile/edit" className="font-semibold underline">your profile</Link> — it heads every itinerary.
        </p>
      ) : null}

      <EditorLayout
        preview={<LivePreview kind="itinerary" data={data} variant="panel" />}
        form={
        <>
          <FormProgress steps={steps} />
          <SectionCard id="itn-trip" title="Trip details" icon={MapPinned}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Trip name" htmlFor="itn-title" required className="md:col-span-2" hint="The headline on the PDF — e.g. “Magical Goa: Beaches & Forts”.">
                <TextInput id="itn-title" value={data.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Trip name" maxLength={120} />
              </Field>
              <Field label="Destination" htmlFor="itn-dest" required>
                <TextInput id="itn-dest" value={data.destination} onChange={(e) => patch({ destination: e.target.value })} placeholder="e.g. Goa, India" maxLength={120} />
              </Field>
              <Field label="Start date" htmlFor="itn-start" required hint={data.startDate && data.days.length ? `Ends ${dayLabel(itineraryDayDate(data.startDate, data.days.length - 1))}` : "Each day's date is worked out from this."}>
                <TextInput id="itn-start" type="date" value={data.startDate} onChange={(e) => patch({ startDate: e.target.value })} />
              </Field>
              <div className="grid grid-cols-[110px_1fr] gap-3 md:col-span-2">
                <Field label="Title">
                  <NativeSelect value={data.travellerTitle} onChange={(v) => patch({ travellerTitle: v })} options={SALUTATIONS} />
                </Field>
                <Field label="Lead traveller" htmlFor="itn-traveller" required>
                  <TextInput id="itn-traveller" value={data.travellerName} onChange={(e) => patch({ travellerName: e.target.value })} placeholder="Full name" maxLength={120} />
                </Field>
              </div>
              <Field label="Adults">
                <Stepper label="adults" value={data.adults} min={1} max={50} onChange={(v) => patch({ adults: v })} />
              </Field>
              <Field label="Children">
                <Stepper label="children" value={data.children} min={0} max={30} onChange={(v) => patch({ children: v })} />
              </Field>
              <Field label="Reference number" htmlFor="itn-number" hint="Printed on the PDF. Change it to match your own numbering.">
                <TextInput id="itn-number" value={data.number} onChange={(e) => patch({ number: e.target.value })} maxLength={40} />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            id="itn-days"
            title="Day-by-day plan"
            description="One card per day. Each day's date follows from the start date."
            icon={CalendarDays}
            aside={<span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{itineraryDuration(data.days.length)}</span>}
          >
            <ol className="space-y-4">
              {data.days.map((day, i) => (
                <DayCard
                  key={i}
                  day={day}
                  index={i}
                  count={data.days.length}
                  date={itineraryDayDate(data.startDate, i)}
                  onChange={(p) => patchDay(i, p)}
                  onMove={(dir) => moveDay(i, dir)}
                  onDuplicate={() => duplicateDay(i)}
                  onRemove={() => removeDay(i)}
                />
              ))}
            </ol>
            <button
              type="button"
              onClick={addDay}
              disabled={data.days.length >= ITINERARY_MAX_DAYS}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Add day {data.days.length + 1}
            </button>
          </SectionCard>

          <SectionCard id="itn-inc" title="Inclusions & exclusions" description="One item per line. Tap a suggestion to add it." icon={ListChecks}>
            <div className="grid gap-5 lg:grid-cols-2">
              <SuggestList
                label="What's included"
                value={data.inclusions}
                suggestions={INCLUSION_SUGGESTIONS}
                onChange={(v) => patch({ inclusions: v })}
                placeholder={"Accommodation on twin sharing\nDaily breakfast"}
              />
              <SuggestList
                label="Not included"
                value={data.exclusions}
                suggestions={EXCLUSION_SUGGESTIONS}
                onChange={(v) => patch({ exclusions: v })}
                placeholder={"Airfare\nPersonal expenses"}
              />
            </div>
          </SectionCard>

          <SectionCard id="itn-price" title="Price" description="Show a per-person price, a package total, or no price at all." icon={IndianRupee}>
            <Segmented value={data.priceMode} onChange={(v) => patch({ priceMode: v })} options={ITINERARY_PRICE_MODES.map((m) => ({ value: m.id, label: m.label, hint: m.hint }))} />
            {data.priceMode !== "hide" ? (
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Field label="Currency">
                  <NativeSelect value={data.currency} onChange={(v) => patch({ currency: v })} options={CURRENCIES} />
                </Field>
                <Field label={data.priceMode === "per_person" ? "Price per person" : "Package total"} htmlFor="itn-price-input" required>
                  <TextInput id="itn-price-input" inputMode="decimal" value={data.price} onChange={(e) => patch({ price: e.target.value })} placeholder="0" />
                </Field>
                <Field label="Valid until" htmlFor="itn-valid" hint="Optional — when this price expires.">
                  <TextInput id="itn-valid" type="date" value={data.validUntil} onChange={(e) => patch({ validUntil: e.target.value })} />
                </Field>
                <Field label="Price note" htmlFor="itn-note" className="md:col-span-3" hint="Optional — e.g. “on twin sharing, excluding GST”.">
                  <TextInput id="itn-note" value={data.priceNote} onChange={(e) => patch({ priceNote: e.target.value })} maxLength={160} />
                </Field>
                {price.show && data.priceMode === "per_person" ? (
                  <p className="rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-800 md:col-span-3">
                    {money(price.price, data.currency)} × {data.adults + data.children} traveller{data.adults + data.children === 1 ? "" : "s"} = <strong>{money(price.total ?? 0, data.currency)}</strong>
                  </p>
                ) : null}
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="Important notes" description="Booking terms, cancellation rules, documents to carry — one point per line." icon={ScrollText}>
            <TextArea rows={5} value={data.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder={"50% advance to confirm the booking\nCheck-in 2 PM, check-out 11 AM\nCarry a valid photo ID"} />
          </SectionCard>

          <SectionCard title="PDF style" description="Pick a layout, then a colour for headings and highlights." icon={Palette}>
            <LayoutPicker
              options={ITINERARY_TEMPLATES.map((t) => ({ ...t, color: t.id === data.template ? data.color : t.color }))}
              value={data.template}
              onChange={(id) => patch({ template: id, color: ITINERARY_TEMPLATES.find((t) => t.id === id)?.color ?? data.color })}
            />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm font-medium text-slate-700">Colour</span>
              {COLOURS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Use colour ${c}`}
                  onClick={() => patch({ color: c })}
                  className={cn("h-8 w-8 rounded-full ring-offset-2 transition", data.color.toLowerCase() === c ? "ring-2 ring-slate-900" : "hover:scale-105")}
                  style={{ background: c }}
                />
              ))}
              <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-full ring-1 ring-slate-300" title="Custom colour">
                <input type="color" value={data.color} onChange={(e) => patch({ color: e.target.value })} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Custom colour" />
                <span className="flex h-full w-full items-center justify-center bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)] text-[10px] font-bold text-white">+</span>
              </label>
            </div>
          </SectionCard>

          <SectionCard id="itn-generate" title="Prepared by" description="Your name, printed at the end of the itinerary.">
            <Field label="Prepared by" htmlFor="itn-prepared" required>
              <TextInput id="itn-prepared" value={data.preparedBy} onChange={(e) => patch({ preparedBy: e.target.value })} placeholder="Your name" maxLength={80} />
            </Field>
          </SectionCard>

          <SaveBar description="Save your itinerary — we generate the PDF so you can download or share it.">
            {docId ? <Link href="/dashboard/itineraries" className={secondaryBtn}>Your itineraries</Link> : null}
            <button type="button" onClick={() => void persist(false)} disabled={!!busy} className={secondaryBtn}>
              {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {busy === "save" ? "Saving…" : dirty || !docId ? "Save" : "Saved"}
            </button>
            <button type="button" onClick={() => void persist(true)} disabled={!!busy} className={cn(primaryBtn, "h-11 px-6")}>
              {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              {busy === "pdf" ? "Generating…" : "Save & download PDF"}
            </button>
          </SaveBar>
        </>
        }
      />
    </PageShell>
  );
}

function DayCard({
  day,
  index,
  count,
  date,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
}: {
  day: ItineraryDay;
  index: number;
  count: number;
  date: string;
  onChange: (p: Partial<ItineraryDay>) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const n = index + 1;
  const meal = (k: keyof ItineraryDay["meals"]) => (
    <button
      type="button"
      aria-pressed={day.meals[k]}
      onClick={() => onChange({ meals: { ...day.meals, [k]: !day.meals[k] } })}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold capitalize transition",
        day.meals[k] ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
      )}
    >
      {day.meals[k] ? <Check className="h-3.5 w-3.5" /> : null} {k}
    </button>
  );

  return (
    <li className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">{n}</span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Day {n}</p>
            <p className="text-xs text-slate-500">{date ? dayLabel(date) : "Set a start date to see the date"}</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className={cn(iconBtn, "disabled:opacity-30")} aria-label={`Move day ${n} up`} title="Move up">
            <ArrowUp className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} className={cn(iconBtn, "disabled:opacity-30")} aria-label={`Move day ${n} down`} title="Move down">
            <ArrowDown className="h-4 w-4" />
          </button>
          <button type="button" onClick={onDuplicate} disabled={count >= ITINERARY_MAX_DAYS} className={cn(iconBtn, "disabled:opacity-30")} aria-label={`Duplicate day ${n}`} title="Duplicate day">
            <CopyPlus className="h-4 w-4" />
          </button>
          <button type="button" onClick={onRemove} disabled={count <= 1} className={cn(iconBtn, "hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30")} aria-label={`Remove day ${n}`} title="Remove day">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Title" required className="md:col-span-2">
          <TextInput value={day.title} onChange={(e) => onChange({ title: e.target.value })} placeholder={n === 1 ? "Arrival in Goa & evening at Calangute beach" : "What happens today?"} maxLength={140} />
        </Field>
        <Field label="Description" className="md:col-span-2" hint="Optional — a few lines that set the scene.">
          <TextArea rows={3} value={day.description} onChange={(e) => onChange({ description: e.target.value })} placeholder="Our representative meets you at the airport and drives you to your hotel…" />
        </Field>
        <Field label="Activities" className="md:col-span-2" hint="One per line — printed as a list.">
          <TextArea rows={3} value={day.activities} onChange={(e) => onChange({ activities: e.target.value })} placeholder={"Fort Aguada\nSunset cruise on the Mandovi"} />
        </Field>
        <Field label="Overnight in">
          <TextInput value={day.city} onChange={(e) => onChange({ city: e.target.value })} placeholder="City" maxLength={80} />
        </Field>
        <Field label="Hotel">
          <TextInput value={day.hotel} onChange={(e) => onChange({ hotel: e.target.value })} placeholder="Hotel name (optional)" maxLength={120} />
        </Field>
        <Field label="Transfer / transport">
          <TextInput value={day.transfer} onChange={(e) => onChange({ transfer: e.target.value })} placeholder="e.g. Private sedan" maxLength={120} />
        </Field>
        <Field label="Meals">
          <div className="flex flex-wrap gap-2">
            {meal("breakfast")}
            {meal("lunch")}
            {meal("dinner")}
          </div>
        </Field>
      </div>
    </li>
  );
}

function SuggestList({ label, value, suggestions, onChange, placeholder }: { label: string; value: string; suggestions: string[]; onChange: (v: string) => void; placeholder: string }) {
  const have = new Set(itineraryLines(value));
  const left = suggestions.filter((s) => !have.has(s));
  return (
    <Field label={label}>
      <TextArea rows={6} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {left.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {left.map((s) => (
            <button key={s} type="button" onClick={() => onChange(addLine(value, s))} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-brand-200 hover:text-brand-600">
              <Plus className="h-3 w-3" /> {s}
            </button>
          ))}
        </div>
      ) : null}
    </Field>
  );
}
