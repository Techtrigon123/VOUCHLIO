"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BedDouble,
  Building2,
  CalendarRange,
  Check,
  FileCheck2,
  Hash,
  IndianRupee,
  Loader2,
  Palette,
  Plus,
  ScrollText,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAgent } from "@/components/agent/AgentProvider";
import { ExtractUploader } from "@/components/agent/ExtractUploader";
import { LogoPromptDialog } from "@/components/agent/LogoPromptDialog";
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
  inputClass,
  primaryBtn,
  secondaryBtn,
} from "@/components/agent/ui";
import { api, openPdf } from "@/lib/agent/client";
import {
  CURRENCIES,
  CURRENCY_NAMES,
  FARE_MODES,
  GUEST_TITLES,
  MEAL_PLANS,
  VOUCHER_TEMPLATES,
  defaultHotelVoucher,
  newRoom,
  nights,
  resolvedRooms,
  num,
  validateHotelVoucher,
  voucherFare,
  money,
  type FareMode,
  type HotelVoucherData,
  type VoucherRoom,
} from "@/lib/agent/documents";
import type { ExtractedVoucher } from "@/lib/agent/extract";
import type { DocumentSummary } from "@/lib/agent/types";
import { FormSkeleton } from "@/components/agent/skeletons";
import { LivePreview } from "@/components/agent/LivePreview";

interface Suggestion {
  name: string;
  address: string;
  city: string;
  email: string;
  phone: string;
  rooms: string[];
}

const COLORS = ["#3b7d0c", "#2879f8", "#f97316", "#dc2626", "#db2777", "#7c3aed", "#1e3a8a", "#0ea5e9", "#0f766e", "#15803d", "#a16207", "#0f172a"];

function HotelNameInput({ value, onChange, onPick }: { value: string; onChange: (v: string) => void; onPick: (s: Suggestion) => void }) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [active, setActive] = useState(-1);
  const seq = useRef(0);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setItems([]);
      return;
    }
    const id = ++seq.current;
    setLoading(true);
    const t = window.setTimeout(async () => {
      const r = await api<Suggestion[]>(`/api/agent/hotel-suggestions?q=${encodeURIComponent(q)}`);
      if (seq.current !== id) return;
      setLoading(false);
      setErr(r.success ? "" : r.error?.message ?? "");
      setItems(r.success && r.data ? r.data : []);
      setActive(-1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [value]);

  const choose = (s: Suggestion) => {
    onPick(s);
    setOpen(false);
  };

  return (
    <div className="relative">
      <TextInput
        id="hotelName"
        value={value}
        autoComplete="off"
        placeholder="Start typing — hotels you have used before appear below"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!open || !items.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(items.length - 1, i + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            choose(items[active]);
          } else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && value.trim().length >= 2 ? (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {loading ? (
            <p className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading hotel suggestions…</p>
          ) : err ? (
            <p className="px-4 py-3 text-sm text-slate-500">Could not load hotel list. You can still type the name manually.</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">No matching hotels found. Continue typing or use your own details.</p>
          ) : (
            items.map((s, i) => (
              <button
                key={s.name}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s)}
                className={cn("flex w-full flex-col items-start px-4 py-2.5 text-left", i === active ? "bg-brand-50" : "hover:bg-slate-50")}
              >
                <span className="text-sm font-medium text-slate-900">{s.name}</span>
                <span className="text-xs text-slate-500">{[s.address, s.city].filter(Boolean).join(", ") || "—"}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function CurrencyInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => {
    setText(value);
  }, [value]);
  const commit = (v: string) => {
    const t = v.trim().toUpperCase();
    const byName = Object.entries(CURRENCY_NAMES).find(([, n]) => n.toLowerCase().startsWith(v.trim().toLowerCase()))?.[0];
    const code = /^[A-Z]{3}$/.test(t) ? t : byName;
    if (code) onChange(code);
    else setText(value);
  };
  return (
    <>
      <input
        list="currency-list"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), commit(text))}
        placeholder="Type INR, USD, Euro…"
        aria-label="Currency"
        className={inputClass(!!text)}
      />
      <datalist id="currency-list">
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>{CURRENCY_NAMES[c]}</option>
        ))}
      </datalist>
    </>
  );
}

function RoomCard({
  room,
  index,
  data,
  roomOptions,
  onChange,
  onRemove,
}: {
  room: VoucherRoom;
  index: number;
  data: HotelVoucherData;
  roomOptions: string[];
  onChange: (r: VoucherRoom) => void;
  onRemove?: () => void;
}) {
  const showRoomName = !data.sameRoomType || index === 0;
  const [other, setOther] = useState(roomOptions.length > 0 && !!room.roomName && !roomOptions.includes(room.roomName));
  const setChildren = (n: number) => {
    const ages = room.childAges.slice(0, n);
    while (ages.length < n) ages.push("");
    onChange({ ...room, children: n, childAges: ages });
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">Room {index + 1}</p>
        {onRemove ? (
          <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-rose-600">
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {showRoomName ? (
          <Field label="Room" required className="sm:col-span-2">
            {roomOptions.length > 0 ? (
              <div className="space-y-2">
                <NativeSelect
                  value={other ? "__other" : room.roomName}
                  onChange={(v) => {
                    if (v === "__other") {
                      setOther(true);
                      onChange({ ...room, roomName: "" });
                    } else {
                      setOther(false);
                      onChange({ ...room, roomName: v });
                    }
                  }}
                  placeholder="Choose a room"
                  options={[...roomOptions, { value: "__other", label: "Other — type room name" }]}
                />
                {other ? <TextInput value={room.roomName} onChange={(e) => onChange({ ...room, roomName: e.target.value })} placeholder="Room name" /> : null}
              </div>
            ) : (
              <TextInput value={room.roomName} onChange={(e) => onChange({ ...room, roomName: e.target.value })} placeholder="Room category or name" />
            )}
          </Field>
        ) : null}
        {!data.sameDates ? (
          <>
            <Field label="Check-in">
              <TextInput type="date" value={room.checkIn} onChange={(e) => onChange({ ...room, checkIn: e.target.value })} />
            </Field>
            <Field label="Check-out">
              <TextInput type="date" min={room.checkIn || undefined} value={room.checkOut} onChange={(e) => onChange({ ...room, checkOut: e.target.value })} />
            </Field>
          </>
        ) : null}
        <Field label="Adults">
          <Stepper label="adults" value={room.adults} min={1} max={10} onChange={(v) => onChange({ ...room, adults: v })} />
        </Field>
        <Field label="Children">
          <Stepper label="children" value={room.children} min={0} max={6} onChange={setChildren} />
        </Field>
        {room.children > 0 ? (
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-medium text-slate-700">Child ages <span className="text-brand-500">*</span></p>
            <div className="flex flex-wrap gap-2">
              {room.childAges.slice(0, room.children).map((age, ci) => (
                <select
                  key={ci}
                  aria-label={`Child ${ci + 1} age`}
                  value={age === "" ? "" : String(age)}
                  onChange={(e) => {
                    const ages = [...room.childAges];
                    ages[ci] = e.target.value === "" ? "" : Number(e.target.value);
                    onChange({ ...room, childAges: ages });
                  }}
                  className={cn(inputClass(age !== ""), "w-28")}
                >
                  <option value="">Age</option>
                  {Array.from({ length: 18 }, (_, a) => (
                    <option key={a} value={a}>{a} yr{a === 1 ? "" : "s"}</option>
                  ))}
                </select>
              ))}
            </div>
          </div>
        ) : null}
        <Field label="Meal plan">
          <NativeSelect value={room.mealPlan} onChange={(v) => onChange({ ...room, mealPlan: v })} options={MEAL_PLANS} />
        </Field>
        <Field label="Extra bed" hint="Optional — e.g. 1 rollaway bed">
          <TextInput value={room.extraBed} onChange={(e) => onChange({ ...room, extraBed: e.target.value })} placeholder="None" />
        </Field>
      </div>
    </div>
  );
}

function applyExtract(prev: HotelVoucherData, f: ExtractedVoucher): { data: HotelVoucherData; count: number } {
  const d = { ...prev };
  let count = 0;
  const setStr = (k: keyof HotelVoucherData, v?: string) => {
    if (v && v.trim()) {
      (d as unknown as Record<string, unknown>)[k] = v.trim();
      count++;
    }
  };
  setStr("hotelName", f.hotelName);
  setStr("hotelAddress", f.hotelAddress);
  setStr("city", f.city);
  setStr("hotelEmail", f.hotelEmail);
  setStr("hotelPhone", f.hotelPhone);
  setStr("bookingRef", f.bookingRef);
  setStr("hcn", f.hcn);
  if (/^\d{4}-\d{2}-\d{2}$/.test(f.checkIn)) setStr("checkIn", f.checkIn);
  if (/^\d{4}-\d{2}-\d{2}$/.test(f.checkOut)) setStr("checkOut", f.checkOut);
  if (/^\d{2}:\d{2}$/.test(f.checkInTime)) setStr("checkInTime", f.checkInTime);
  if (/^\d{2}:\d{2}$/.test(f.checkOutTime)) setStr("checkOutTime", f.checkOutTime);
  if (GUEST_TITLES.includes(f.guestTitle)) setStr("guestTitle", f.guestTitle);
  setStr("guestFirstName", f.guestFirstName);
  setStr("guestLastName", f.guestLastName);
  setStr("specialRequests", f.specialRequests);
  setStr("cancellationPolicy", f.cancellationPolicy);
  const roomsCount = Math.max(1, Math.min(10, Math.round(f.rooms || 1)));
  const meal = MEAL_PLANS.includes(f.mealPlan) ? f.mealPlan : prev.rooms[0]?.mealPlan ?? "Breakfast";
  d.rooms = Array.from({ length: roomsCount }, (_, i) => ({
    ...(prev.rooms[i] ?? newRoom()),
    roomName: f.roomName || prev.rooms[i]?.roomName || "",
    adults: f.adultsPerRoom > 0 ? Math.min(10, Math.round(f.adultsPerRoom)) : prev.rooms[i]?.adults ?? 2,
    children: f.childrenPerRoom > 0 ? Math.min(6, Math.round(f.childrenPerRoom)) : 0,
    childAges: Array.from({ length: f.childrenPerRoom > 0 ? Math.min(6, Math.round(f.childrenPerRoom)) : 0 }, () => "" as const),
    mealPlan: meal,
  }));
  if (f.roomName) count++;
  if (f.totalAmount > 0) {
    d.fareMode = "total";
    d.total = String(f.totalAmount);
    if (/^[A-Z]{3}$/.test(f.currency)) d.currency = f.currency;
    count++;
  }
  return { data: d, count };
}

export default function VoucherEditorPage() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const { agent, refresh } = useAgent();
  const [data, setData] = useState<HotelVoucherData>(defaultHotelVoucher);
  const [docId, setDocId] = useState<string | null>(id);
  const [loading, setLoading] = useState(!!id);
  const [saved, setSaved] = useState<string>(""); // JSON snapshot of the last saved form
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [roomOptions, setRoomOptions] = useState<string[]>([]);
  const [logoPrompt, setLogoPrompt] = useState<"entry" | "generate" | null>(null);
  const entryPromptShown = useRef(false);

  const patch = useCallback((p: Partial<HotelVoucherData>) => setData((d) => ({ ...d, ...p })), []);
  const dirty = JSON.stringify(data) !== saved;

  useEffect(() => {
    if (!id) return;
    void api<{ document: DocumentSummary; data: HotelVoucherData }>(`/api/agent/documents/${id}`).then((r) => {
      if (!r.success || !r.data) {
        toast.error(r.error?.code === "HISTORY_LOCKED" ? "Locked on Silver plan" : "Could not open this voucher", { description: r.error?.message });
        router.replace("/dashboard/vouchers");
        return;
      }
      const loaded = { ...defaultHotelVoucher(), ...r.data.data };
      setData(loaded);
      setSaved(JSON.stringify(loaded));
      setLoading(false);
    });
  }, [id, router]);

  // New voucher without a logo: nudge once on entry.
  useEffect(() => {
    if (!id && agent && !agent.brandLogo && !entryPromptShown.current) {
      // Mark as shown only when it actually opens — dev double-mounts cancel the first timer.
      const t = window.setTimeout(() => {
        entryPromptShown.current = true;
        setLogoPrompt("entry");
      }, 600);
      return () => window.clearTimeout(t);
    }
  }, [id, agent]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty && saved !== "") e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, saved]);

  const fare = useMemo(() => voucherFare(data), [data]);
  const stayNights = nights(data.checkIn, data.checkOut);

  // Same rules as validateHotelVoucher, grouped by section, so the checklist matches what Save needs.
  const progress = useMemo(() => {
    const has = (v: string) => !!v.trim();
    const rooms = resolvedRooms(data);
    const roomsNamed = data.sameRoomType ? has(rooms[0]?.roomName ?? "") : rooms.every((r) => has(r.roomName));
    const datesOk = !!data.checkIn && !!data.checkOut && new Date(data.checkOut) > new Date(data.checkIn) && (data.sameDates || rooms.every((r) => r.checkIn && r.checkOut));
    const agesOk = data.rooms.every((r) => r.childAges.slice(0, r.children).length === r.children && r.childAges.slice(0, r.children).every((a) => a !== ""));
    return [
      { label: "Hotel & city", done: has(data.hotelName) && has(data.city), target: "voucher-property" },
      { label: "Booking references", done: has(data.bookingRef) && has(data.hcn), target: "voucher-refs" },
      { label: "Dates & rooms", done: datesOk && roomsNamed && agesOk, target: "voucher-stay" },
      { label: "Lead guest", done: has(data.guestFirstName) && has(data.guestLastName), target: "voucher-guest" },
      { label: "Fare", done: data.fareMode === "hide" || (data.fareMode === "breakdown" ? num(data.baseFare) + num(data.taxes) : num(data.total)) > 0, target: "voucher-fare" },
      { label: "Your name", done: has(data.preparedBy), target: "voucher-generate" },
    ];
  }, [data]);

  const setRoom = (i: number, r: VoucherRoom) => setData((d) => ({ ...d, rooms: d.rooms.map((x, j) => (j === i ? r : x)) }));

  const persist = async (generatePdf: boolean): Promise<string | null> => {
    const invalid = validateHotelVoucher(data);
    if (invalid) {
      setError(invalid);
      toast.error("Could not save", { description: invalid });
      return null;
    }
    setError("");
    const r = docId
      ? await api<{ document: DocumentSummary }>(`/api/agent/documents/${docId}`, { method: "PATCH", json: { data, generatePdf } })
      : await api<{ document: DocumentSummary; becameActive: boolean }>("/api/agent/documents", { method: "POST", json: { kind: "hotel_voucher", data, generatePdf } });
    if (!r.success || !r.data) {
      setError(r.error?.message || "Could not save");
      toast.error("Could not save", { description: r.error?.message });
      return null;
    }
    const newId = r.data.document.id;
    if (!docId) {
      setDocId(newId);
      router.replace(`/dashboard/vouchers/new?id=${newId}`, { scroll: false });
    }
    setSaved(JSON.stringify(data));
    if ("becameActive" in r.data && r.data.becameActive) toast.success("Your account is now Active 🎉");
    void refresh();
    return newId;
  };

  const saveDraft = async () => {
    setSaving(true);
    const newId = await persist(false);
    setSaving(false);
    if (newId) toast.success("Voucher saved", { description: data.hcn.trim() ? `Saved under ${data.hcn.trim()}.` : "Your voucher is saved to your account." });
  };

  const generate = async (skipLogoCheck = false) => {
    if (!data.preparedBy.trim()) {
      setError("Please enter your name to generate the PDF.");
      toast.error("Your name is required", { description: "Please enter your name to generate the PDF." });
      document.getElementById("preparedBy")?.focus();
      return;
    }
    if (!skipLogoCheck && !agent?.brandLogo && !data.withoutLogo) {
      setLogoPrompt("generate");
      return;
    }
    setGenerating(true);
    const newId = await persist(true);
    if (newId) {
      const err = await openPdf(newId);
      if (err) toast.error("Could not generate PDF", { description: err });
      else toast.success("Voucher saved", { description: "PDF opened in a new tab." });
    }
    setGenerating(false);
  };

  if (loading || !agent) return <FormSkeleton label="Loading voucher" />;

  return (
    <PageShell wide>
      <PageHeader
        back={{ href: "/dashboard/vouchers", label: "Back to your voucher PDFs" }}
        eyebrow="Hotel voucher"
        title={docId ? "Edit voucher" : "Voucher form"}
        description="Upload a booking to fill the form for you, or type in the grey boxes. The checklist shows what's left — required fields use *."
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <ExtractUploader<ExtractedVoucher>
            type="voucher"
            onFields={(f) => {
              let count = 0;
              setData((prev) => {
                const r = applyExtract(prev, f);
                count = r.count;
                return r.data;
              });
              return count;
            }}
          />

          <SectionCard id="voucher-property" title="Property" icon={Building2}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Hotel name" htmlFor="hotelName" required className="md:col-span-2" hint="Suggestions are optional. Choosing one fills name, address and contact details from your earlier vouchers.">
                <HotelNameInput
                  value={data.hotelName}
                  onChange={(v) => patch({ hotelName: v })}
                  onPick={(s) => {
                    patch({ hotelName: s.name, hotelAddress: s.address || data.hotelAddress, city: s.city || data.city, hotelEmail: s.email || data.hotelEmail, hotelPhone: s.phone || data.hotelPhone });
                    setRoomOptions(s.rooms);
                  }}
                />
              </Field>
              <Field label="Hotel address" className="md:col-span-2">
                <TextInput value={data.hotelAddress} onChange={(e) => patch({ hotelAddress: e.target.value })} placeholder="Street, area, or full address" />
              </Field>
              <Field label="City" required>
                <TextInput value={data.city} onChange={(e) => patch({ city: e.target.value })} placeholder="City" />
              </Field>
              <Field label="Hotel email">
                <TextInput type="email" value={data.hotelEmail} onChange={(e) => patch({ hotelEmail: e.target.value })} placeholder="Property contact email (if you have it)" />
              </Field>
              <Field label="Hotel phone">
                <TextInput value={data.hotelPhone} onChange={(e) => patch({ hotelPhone: e.target.value })} placeholder="Property phone (if you have it)" />
              </Field>
            </div>
          </SectionCard>

          <SectionCard id="voucher-refs" title="Booking references" icon={Hash}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Your reference / booking ID" required hint="Use your platform booking ID or any internal reference.">
                <TextInput value={data.bookingRef} onChange={(e) => patch({ bookingRef: e.target.value })} placeholder="e.g. TD-20260409-01" />
              </Field>
              <Field label="HCN / voucher number" required>
                <TextInput value={data.hcn} onChange={(e) => patch({ hcn: e.target.value })} placeholder="Hotel confirmation number" />
              </Field>
            </div>
          </SectionCard>

          <SectionCard id="voucher-stay" title="Stay & guests" description="Adults, children, ages. Add rooms side by side; new rooms appear below. Fare is in the Fare section." icon={CalendarRange}>
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Check-in" required>
                <TextInput type="date" value={data.checkIn} onChange={(e) => patch({ checkIn: e.target.value })} />
              </Field>
              <Field label="Check-out" required>
                <TextInput type="date" min={data.checkIn || undefined} value={data.checkOut} onChange={(e) => patch({ checkOut: e.target.value })} />
              </Field>
              <Field label="Check-in time">
                <TextInput type="time" value={data.checkInTime} onChange={(e) => patch({ checkInTime: e.target.value })} />
              </Field>
              <Field label="Check-out time">
                <TextInput type="time" value={data.checkOutTime} onChange={(e) => patch({ checkOutTime: e.target.value })} />
              </Field>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {data.checkIn && data.checkOut ? `${stayNights} night${stayNights === 1 ? "" : "s"} · ${data.rooms.length} room${data.rooms.length === 1 ? "" : "s"}` : "Set check-in and check-out"}
            </p>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input type="checkbox" checked={data.sameDates} onChange={(e) => patch({ sameDates: e.target.checked })} className="mt-0.5 h-4 w-4 accent-brand-500" />
                <span>
                  <span className="font-medium text-slate-800">Same dates for all rooms</span>
                  {!data.sameDates ? <span className="block text-xs text-slate-500">Room 1 keeps the main check-in; the last room keeps the main check-out. Change the other dates per room.</span> : null}
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input type="checkbox" checked={data.sameRoomType} onChange={(e) => patch({ sameRoomType: e.target.checked })} className="mt-0.5 h-4 w-4 accent-brand-500" />
                <span>
                  <span className="font-medium text-slate-800">Same room type for all rooms</span>
                  <span className="block text-xs text-slate-500">If rooms are different, uncheck this to enter a room name for each room.</span>
                </span>
              </label>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {data.rooms.map((room, i) => (
                <RoomCard
                  key={i}
                  room={room}
                  index={i}
                  data={data}
                  roomOptions={roomOptions}
                  onChange={(r) => setRoom(i, r)}
                  onRemove={data.rooms.length > 1 ? () => patch({ rooms: data.rooms.filter((_, j) => j !== i) }) : undefined}
                />
              ))}
            </div>
            <button type="button" onClick={() => patch({ rooms: [...data.rooms, { ...newRoom(), mealPlan: data.rooms[0]?.mealPlan ?? "Breakfast" }] })} className={cn(secondaryBtn, "mt-3")}>
              <Plus className="h-4 w-4" /> Add room
            </button>
          </SectionCard>

          <SectionCard id="voucher-guest" title="Lead guest" icon={UserRound}>
            <div className="grid gap-4 md:grid-cols-[140px_1fr_1fr]">
              <Field label="Title" hint="Optional">
                <NativeSelect value={data.guestTitle} onChange={(v) => patch({ guestTitle: v })} options={GUEST_TITLES} placeholder="Choose title" />
              </Field>
              <Field label="First name" required>
                <TextInput value={data.guestFirstName} onChange={(e) => patch({ guestFirstName: e.target.value })} placeholder="Enter first name" />
              </Field>
              <Field label="Last name" required>
                <TextInput value={data.guestLastName} onChange={(e) => patch({ guestLastName: e.target.value })} placeholder="Enter last name" />
              </Field>
              <Field label="Special requests (printed in PDF)" hint="Optional — e.g. late check-in, floor preference (prints under booking details)." className="md:col-span-3">
                <TextArea rows={2} value={data.specialRequests} onChange={(e) => patch({ specialRequests: e.target.value })} />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Terms & policies (PDF)" description="PDF matches these blocks verbatim." icon={ScrollText}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Cancellation policy">
                <TextArea rows={3} value={data.cancellationPolicy} onChange={(e) => patch({ cancellationPolicy: e.target.value })} />
              </Field>
              <Field label="Child policy">
                <TextArea rows={3} value={data.childPolicy} onChange={(e) => patch({ childPolicy: e.target.value })} />
              </Field>
              <Field label="Payment terms">
                <TextArea rows={3} value={data.paymentTerms} onChange={(e) => patch({ paymentTerms: e.target.value })} />
              </Field>
              <Field label="Liability notes">
                <TextArea rows={3} value={data.liabilityNotes} onChange={(e) => patch({ liabilityNotes: e.target.value })} />
              </Field>
            </div>
            <details className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">Print preview</summary>
              <dl className="mt-3 space-y-2 text-xs">
                {[
                  ["Cancellation", data.cancellationPolicy],
                  ["Child", data.childPolicy],
                  ["Payment", data.paymentTerms],
                  ["Liability", data.liabilityNotes],
                ].map(([k, v]) =>
                  v.trim() ? (
                    <div key={k}>
                      <dt className="font-semibold text-slate-800">{k}</dt>
                      <dd className="whitespace-pre-wrap text-slate-600">{v}</dd>
                    </div>
                  ) : null
                )}
              </dl>
            </details>
          </SectionCard>

          <SectionCard id="voucher-fare" title="Fare on PDF" description="Choose what guests see, then pick a currency and enter amounts." icon={IndianRupee}>
            <Segmented<FareMode> value={data.fareMode} onChange={(v) => patch({ fareMode: v })} options={FARE_MODES.map((m) => ({ value: m.id, label: m.label, hint: m.hint }))} />
            {data.fareMode !== "hide" ? (
              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <Field label="Currency">
                  <CurrencyInput value={data.currency} onChange={(v) => patch({ currency: v })} />
                </Field>
                {data.fareMode === "breakdown" ? (
                  <>
                    <Field label="Base fare" required>
                      <TextInput inputMode="decimal" value={data.baseFare} onChange={(e) => patch({ baseFare: e.target.value })} placeholder="0.00" />
                    </Field>
                    <Field label="Taxes">
                      <TextInput inputMode="decimal" value={data.taxes} onChange={(e) => patch({ taxes: e.target.value })} placeholder="0.00" />
                    </Field>
                    <Field label="Total" hint="Auto">
                      <TextInput value={(num(data.baseFare) + num(data.taxes)).toFixed(2)} disabled />
                    </Field>
                  </>
                ) : (
                  <Field label="Total" required>
                    <TextInput inputMode="decimal" value={data.total} onChange={(e) => patch({ total: e.target.value })} placeholder="0.00" />
                  </Field>
                )}
                <Field label="Payment status">
                  <NativeSelect value={data.paymentStatus} onChange={(v) => patch({ paymentStatus: v as HotelVoucherData["paymentStatus"] })} options={["Confirmed", "Paid"]} />
                </Field>
                <Field label="Markup" className="md:col-span-2">
                  <Segmented
                    size="sm"
                    value={data.markupType}
                    onChange={(v) => patch({ markupType: v })}
                    options={[
                      { value: "none", label: "None" },
                      { value: "percent", label: "Percent (%)" },
                      { value: "fixed", label: `Fixed amount (${data.currency})` },
                    ]}
                  />
                </Field>
                {data.markupType !== "none" ? (
                  <Field label="Markup amount" hint={`Adds ${money(fare.markup, data.currency)} to the total shown.`}>
                    <TextInput inputMode="decimal" value={data.markupValue} onChange={(e) => patch({ markupValue: e.target.value })} placeholder="Value" />
                  </Field>
                ) : null}
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="PDF template" description="Pick a layout, then a colour for headers and highlights." icon={Palette}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {VOUCHER_TEMPLATES.map((t) => {
                const selected = data.template === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => patch({ template: t.id, color: t.color })}
                    className={cn("overflow-hidden rounded-2xl border text-left transition", selected ? "border-brand-400 ring-4 ring-brand-100" : "border-slate-200 hover:border-brand-200")}
                  >
                    <TemplateThumb id={t.id} color={selected ? data.color : t.color} />
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm font-semibold text-slate-900">{t.label}</span>
                      {selected ? <Check className="h-4 w-4 text-brand-500" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-slate-500">Selected: {VOUCHER_TEMPLATES.find((t) => t.id === data.template)?.description}</p>
            <div className="mt-5">
              <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
                Voucher colour <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-700">Beta</span>
              </p>
              <p className="text-xs text-slate-500">Pick a colour for headers, accents, and highlights on your PDF. Each template starts with its original colour — change it anytime.</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => patch({ color: c })} aria-label={`Colour ${c}`} className={cn("h-8 w-8 rounded-full ring-offset-2 transition", data.color === c && "ring-2 ring-slate-900")} style={{ background: c }} />
                ))}
                <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-full ring-1 ring-slate-300" title="Custom colour">
                  <input type="color" value={data.color} onChange={(e) => patch({ color: e.target.value })} className="absolute -inset-2 h-12 w-12 cursor-pointer" aria-label="Custom colour" />
                </label>
                <span className="font-mono text-xs text-slate-500">Selected: {data.color}</span>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Summary + generate */}
        {/* Sticky on wide screens; scrolls on its own when the panel is taller than the window. */}
        <aside className="space-y-4 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:self-start xl:overflow-y-auto xl:pb-2" aria-label="Voucher summary and generate PDF">
          <FormProgress steps={progress} />
          <LivePreview kind="hotel_voucher" data={data} />
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">Voucher summary</p>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ["Hotel", data.hotelName || "—"],
                ["Guest", [data.guestTitle, data.guestFirstName, data.guestLastName].filter(Boolean).join(" ") || "—"],
                ["Stay", data.checkIn && data.checkOut ? `${data.checkIn} → ${data.checkOut} · ${stayNights}N` : "Set check-in and check-out"],
                ["Rooms", `${data.rooms.length} · ${data.rooms.reduce((n, r) => n + r.adults, 0)} adults, ${data.rooms.reduce((n, r) => n + r.children, 0)} children`],
                ["HCN", data.hcn || "—"],
                ["Fare", data.fareMode === "hide" ? "Hidden on PDF" : money(fare.total, data.currency)],
                ["Template", VOUCHER_TEMPLATES.find((t) => t.id === data.template)?.label ?? ""],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right font-medium text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div id="voucher-generate" className="scroll-mt-28 rounded-3xl border border-brand-200 bg-white p-5">
            <Field label="Who is preparing this voucher?" htmlFor="preparedBy" required hint="Enter your name. It will appear on the PDF and in your saved voucher history.">
              <TextInput id="preparedBy" value={data.preparedBy} onChange={(e) => patch({ preparedBy: e.target.value })} placeholder="Your name" />
            </Field>
            {agent.brandLogo ? (
              <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-2 ring-1 ring-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={agent.brandLogo} alt="Brand logo" className="h-10 w-14 object-contain" />
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={!data.withoutLogo} onChange={(e) => patch({ withoutLogo: !e.target.checked })} className="h-4 w-4 accent-brand-500" />
                  Show my logo on this voucher
                </label>
              </div>
            ) : (
              <button type="button" onClick={() => setLogoPrompt("entry")} className="mt-3 w-full rounded-2xl border border-dashed border-brand-300 bg-white p-3 text-left text-xs text-slate-600 hover:bg-brand-50">
                Without your logo, the hotel voucher feels incomplete. <span className="font-semibold text-brand-600">Add brand logo</span>
              </button>
            )}
            {error ? <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}
            <div className="mt-4 grid gap-2">
              <button type="button" onClick={() => generate()} disabled={generating || saving} className={cn(primaryBtn, "h-11 w-full")}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
                {generating ? "Generating…" : "Save & Generate PDF"}
              </button>
              <button type="button" onClick={saveDraft} disabled={saving || generating} className={cn(secondaryBtn, "w-full")}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BedDouble className="h-4 w-4" />}
                {saving ? "Saving…" : dirty || !docId ? "Save draft" : "Saved"}
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-500">Ready to make a voucher? Fill details, then save &amp; generate a PDF.</p>
            {docId ? (
              <Link href="/dashboard/vouchers" className="mt-2 block text-center text-xs font-medium text-slate-500 hover:text-brand-600">Back to your vouchers</Link>
            ) : null}
          </div>
        </aside>
      </div>

      <LogoPromptDialog
        open={logoPrompt !== null}
        mode={logoPrompt ?? "entry"}
        onClose={() => setLogoPrompt(null)}
        onSkip={() => {
          const wasGenerate = logoPrompt === "generate";
          setLogoPrompt(null);
          if (wasGenerate) {
            patch({ withoutLogo: true });
            void generate(true);
          }
        }}
        onSaved={() => {
          const wasGenerate = logoPrompt === "generate";
          setLogoPrompt(null);
          if (wasGenerate) void generate(true);
        }}
      />
    </PageShell>
  );
}

function TemplateThumb({ id, color }: { id: string; color: string }) {
  return (
    <div className="aspect-[4/3] bg-slate-50 p-2.5">
      <div className="keep-light h-full rounded-lg bg-white p-2 shadow-sm ring-1 ring-slate-200">
        {id === "light" ? <div className="-m-2 mb-1.5 h-4 rounded-t-lg" style={{ background: color }} /> : null}
        {id === "corporate" ? <div className="mb-1 h-[3px] rounded" style={{ background: color }} /> : null}
        <div className="flex gap-1.5">
          <div className={cn("space-y-1", id === "bold" ? "w-2/3" : "w-full")}>
            <div className="h-1.5 w-1/2 rounded" style={{ background: id === "classic" ? color : "#cbd5e1" }} />
            <div className="h-1 w-3/4 rounded bg-slate-200" />
            <div className="h-1 w-2/3 rounded bg-slate-200" />
            {id === "light" || id === "bold" ? (
              <div className="grid grid-cols-2 gap-1 pt-1">
                <div className="h-4 rounded border border-slate-200" />
                <div className="h-4 rounded border border-slate-200" />
              </div>
            ) : (
              <div className="space-y-0.5 pt-1">
                <div className="h-1.5 rounded" style={{ background: color, opacity: 0.8 }} />
                <div className="h-1 rounded bg-slate-100" />
                <div className="h-1 rounded bg-slate-100" />
              </div>
            )}
          </div>
          {id === "bold" ? <div className="w-1/3 rounded" style={{ background: color }} /> : null}
        </div>
      </div>
    </div>
  );
}
