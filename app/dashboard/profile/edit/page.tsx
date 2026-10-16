"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, CreditCard, ImageIcon, KeyRound, Loader2, LogOut, MapPin, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAgent } from "@/components/agent/AgentProvider";
import { focusAnchor } from "@/components/agent/ActivationGuide";
import { Field, FileDrop, NativeSelect, PageHeader, PageShell, SectionCard, TextArea, TextInput, primaryBtn, secondaryBtn } from "@/components/agent/ui";
import { api, imageFileToDataUrl } from "@/lib/agent/client";
import { ACTIVATION_ANCHORS, INDIAN_STATES, statusLabel } from "@/lib/agent/profile";
import type { Agent } from "@/lib/agent/types";
import VerificationBanner from "@/components/agent/VerificationBanner";

const FIELDS = [
  "name", "landlineNumber", "brandName", "companyName", "address", "city", "state", "country", "pincode",
  "gstNumber", "iataNumber", "bankAccountHolder", "bankName", "bankAccountNumber", "bankIfscCode",
  "bankBranchAddress", "paymentUpi",
] as const;
type FormKey = (typeof FIELDS)[number];
type Form = Record<FormKey, string>;

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

function ImageSlot({
  label,
  required,
  current,
  pending,
  onPick,
  onClear,
  help,
  dropTitle,
  dropDescription,
  button,
  anchor,
}: {
  label: string;
  required?: boolean;
  current?: string;
  pending: string | null | undefined;
  onPick: (f: File) => void;
  onClear: () => void;
  help: string;
  dropTitle: string;
  dropDescription: string;
  button: string;
  anchor?: string;
}) {
  // undefined = unchanged, null = marked for removal, string = new preview
  const shown = pending === undefined ? current : pending ?? undefined;
  return (
    <div id={anchor} className="scroll-mt-32 space-y-2 rounded-2xl">
      <p className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-brand-500"> *</span> : null}
      </p>
      <p className="text-xs text-slate-500">{help}</p>
      {shown ? (
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shown} alt={label} className="h-20 w-28 rounded-xl bg-white object-contain ring-1 ring-slate-200" />
          <div className="flex-1 text-xs text-slate-500">
            {pending ? <p className="font-medium text-brand-600">Preview only — saved when you click Save Profile.</p> : <p>Saved on your profile.</p>}
          </div>
          <label className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:border-brand-300">
            Change
            <input type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onPick(f); }} />
          </label>
          <button type="button" onClick={onClear} aria-label={`Remove ${label}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <FileDrop accept={IMAGE_ACCEPT} onFile={onPick} title={dropTitle} description={dropDescription} buttonLabel={button} compact />
      )}
    </div>
  );
}

export default function EditProfilePage() {
  const { agent, setAgent } = useAgent();
  const initial = useMemo(() => {
    const f = {} as Form;
    for (const k of FIELDS) f[k] = String((agent as unknown as Record<string, unknown>)?.[k] ?? "");
    if (!f.country) f.country = "India";
    return f;
  }, [agent]);
  const [form, setForm] = useState<Form>(initial);
  const [logo, setLogo] = useState<string | null | undefined>(undefined);
  const [stamp, setStamp] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(initial);
  }, [initial]);
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) window.setTimeout(() => focusAnchor(hash), 300);
  }, []);

  if (!agent) return null;
  const set = (k: FormKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const india = form.country.trim().toLowerCase() === "india";

  const pick = (setter: (v: string) => void) => async (file: File) => {
    try {
      setter(await imageFileToDataUrl(file, 700));
    } catch {
      toast.error("Wrong file type", { description: "Choose a PNG, JPG, WebP or GIF image." });
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.name.trim().length < 2) return setError("Name must be at least 2 characters.");
    setSaving(true);
    const body: Record<string, unknown> = { ...form };
    if (logo !== undefined) body.brandLogo = logo;
    if (stamp !== undefined) body.companyStamp = stamp;
    const r = await api<Agent>("/api/agent/profile", { method: "PATCH", json: body });
    setSaving(false);
    if (!r.success || !r.data) {
      setError(r.error?.message || "Failed to update profile");
      toast.error(r.error?.message || "Failed to update profile");
      return;
    }
    const becameVerified = !agent.isVerified && r.data.isVerified;
    setAgent(r.data);
    setLogo(undefined);
    setStamp(undefined);
    toast.success("Profile saved", { description: becameVerified ? "Your Verified badge is now on your profile." : "Your details are updated on every new document." });
  };

  return (
    <PageShell>
      <VerificationBanner className="mb-5" />
      <PageHeader
        back={{ href: "/dashboard/profile", label: "Back to Profile" }}
        title="Agent Profile"
        description="Update your profile information to increase your trust level"
        actions={
          <>
            <Link href="/dashboard/change-password" className={secondaryBtn}>
              <KeyRound className="h-4 w-4" /> Change password
            </Link>
            <a href="/api/auth/logout" className={secondaryBtn}>
              <LogOut className="h-4 w-4" /> Logout
            </a>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          ["Mobile", agent.mobile || "—"],
          ["Status", statusLabel(agent.status)],
          ["Agent Level", agent.agentLevel || "Normal"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs text-slate-500">{k}</p>
            <p className="truncate text-sm font-semibold text-slate-900">{v}</p>
          </div>
        ))}
      </div>

      <form onSubmit={save} className="space-y-5">
        <SectionCard title="Brand logo & stamp" description="Your brand appears on vouchers, tickets and invoices." icon={ImageIcon}>
          <div className="grid gap-5 md:grid-cols-2">
            <ImageSlot
              anchor={ACTIVATION_ANCHORS.brandLogo}
              label="Brand Logo"
              required
              current={agent.brandLogo}
              pending={logo}
              onPick={pick(setLogo)}
              onClear={() => setLogo(null)}
              help="Required for voucher PDFs. Pick an image to preview it, then click Save Profile."
              dropTitle="Drop your brand logo here"
              dropDescription="PNG, JPG, or WebP works best. You can preview before saving."
              button="Choose brand logo"
            />
            <ImageSlot
              label="Company stamp"
              current={agent.companyStamp}
              pending={stamp}
              onPick={pick(setStamp)}
              onClear={() => setStamp(null)}
              help="Optional. Shown on invoice PDFs above “Authorised signatory”."
              dropTitle="Drop your company stamp here"
              dropDescription="PNG with a transparent background works best."
              button="Choose company stamp"
            />
          </div>
        </SectionCard>

        <SectionCard title="Basic Information" icon={UserRound}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field id={ACTIVATION_ANCHORS.mobile} label="Mobile Number" htmlFor="mobile" hint="Set during quick setup and used for client contact. Contact support if you need to change it.">
              <TextInput id="mobile" value={agent.mobile ?? ""} disabled placeholder="Mobile number" />
            </Field>
            <Field label="Full Name" htmlFor="name" required>
              <TextInput id="name" value={form.name} onChange={set("name")} placeholder="Your full name" />
            </Field>
            <Field label="Company email" htmlFor="email" hint="Your sign-in email.">
              <TextInput id="email" type="email" value={agent.email} disabled />
            </Field>
            <Field label="City" htmlFor="city">
              <TextInput id="city" value={form.city} onChange={set("city")} placeholder="Your city" />
            </Field>
            <Field label="Landline Number" htmlFor="landlineNumber">
              <TextInput id="landlineNumber" value={form.landlineNumber} onChange={set("landlineNumber")} placeholder="Office landline" />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Business Information" icon={Building2}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field id={ACTIVATION_ANCHORS.companyName} label="Company Name" htmlFor="companyName" required>
              <TextInput id="companyName" value={form.companyName} onChange={set("companyName")} placeholder="Registered company name" />
            </Field>
            <Field label="Brand Name" htmlFor="brandName">
              <TextInput id="brandName" value={form.brandName} onChange={set("brandName")} placeholder="Brand / trading name" />
            </Field>
            <Field label="GST Number" htmlFor="gstNumber">
              <TextInput id="gstNumber" value={form.gstNumber} onChange={set("gstNumber")} placeholder="22AAAAA0000A1Z5" className="uppercase" />
            </Field>
            <Field label="IATA Number" htmlFor="iataNumber">
              <TextInput id="iataNumber" value={form.iataNumber} onChange={set("iataNumber")} placeholder="Agency IATA accreditation number" />
            </Field>
          </div>
        </SectionCard>

        <SectionCard id="profile-payment" title="Agent payment information" description="These details print below Notes on invoice and proforma PDFs." icon={CreditCard}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Account Name" htmlFor="bankAccountHolder">
              <TextInput id="bankAccountHolder" value={form.bankAccountHolder} onChange={set("bankAccountHolder")} placeholder="Account holder / agency name" />
            </Field>
            <Field label="Bank Name" htmlFor="bankName">
              <TextInput id="bankName" value={form.bankName} onChange={set("bankName")} placeholder="Bank name" />
            </Field>
            <Field label="Account Number" htmlFor="bankAccountNumber">
              <TextInput id="bankAccountNumber" value={form.bankAccountNumber} onChange={set("bankAccountNumber")} placeholder="Account number" />
            </Field>
            <Field label="IFSC" htmlFor="bankIfscCode">
              <TextInput id="bankIfscCode" value={form.bankIfscCode} onChange={set("bankIfscCode")} placeholder="IFSC code" className="uppercase" />
            </Field>
            <Field label="Branch" htmlFor="bankBranchAddress">
              <TextInput id="bankBranchAddress" value={form.bankBranchAddress} onChange={set("bankBranchAddress")} placeholder="Branch / branch address" />
            </Field>
            <Field label="UPI ID" htmlFor="paymentUpi">
              <TextInput id="paymentUpi" value={form.paymentUpi} onChange={set("paymentUpi")} placeholder="agency@upi" />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Address Details" icon={MapPin}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field id={ACTIVATION_ANCHORS.address} label="Full Address" htmlFor="address" required className="md:col-span-2">
              <TextArea id="address" value={form.address} onChange={set("address")} placeholder="Street address" rows={2} />
            </Field>
            <Field label="Country" htmlFor="country">
              <TextInput id="country" value={form.country} onChange={set("country")} placeholder="Country" />
            </Field>
            <Field label="State" htmlFor="state">
              {india ? (
                <NativeSelect id="state" value={form.state} onChange={(v) => setForm((f) => ({ ...f, state: v }))} options={INDIAN_STATES} placeholder="Select state / UT" />
              ) : (
                <TextInput id="state" value={form.state} onChange={set("state")} placeholder="State / Province" />
              )}
            </Field>
            <Field label="Pincode" htmlFor="pincode">
              <TextInput id="pincode" value={form.pincode} onChange={set("pincode")} placeholder={india ? "PIN code" : "PIN / ZIP code"} />
            </Field>
          </div>
        </SectionCard>

        {error ? <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
          <Link href="/dashboard/profile" className={secondaryBtn}>
            <ArrowLeft className="h-4 w-4" /> Cancel
          </Link>
          <button type="submit" disabled={saving} className={primaryBtn}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Saving…" : "Save Profile"}
          </button>
        </div>
      </form>
    </PageShell>
  );
}
