"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  CheckCircle2,
  Circle,
  Eye,
  Loader2,
  Lock,
  MessageCircle,
  Pencil,
  Trash2,
  UploadCloud,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { accessLabel, effectivePlan, lowestPlanFor, planIncludes, planName } from "@/lib/agent/plans";
import type { DocumentAccess, DocumentKind } from "@/lib/agent/types";
import { isFeatureEnabled } from "@/lib/agent/features";
import { useAgent } from "./AgentProvider";
import { BackButton } from "@/components/ui/back-button";

/** `full`: document editors — nearly the whole screen width, like the navbar. */
export function PageShell({ children, className, wide, full }: { children: React.ReactNode; className?: string; wide?: boolean; full?: boolean }) {
  return (
    <div className={cn("mx-auto w-full px-4 py-6 sm:px-6 sm:py-8", full ? "max-w-[1760px] xl:px-10" : wide ? "max-w-[1400px]" : "max-w-6xl", className)}>{children}</div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  back,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Where the back button goes when there's no earlier page in the app. Defaults to the dashboard; `false` hides it. */
  back?: { href: string; label?: string } | false;
}) {
  const fallback = back === false ? null : back?.href ?? "/dashboard";
  // The eyebrow and description line up with the title text, not with the back button.
  const indent = fallback ? "pl-12" : "";
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className={cn("text-[11px] font-semibold uppercase tracking-widest text-[var(--primary)]", indent)}>{eyebrow}</p> : null}
        <div className="mt-0.5 flex items-center gap-3">
          {fallback ? <BackButton fallback={fallback} label={back && back.label ? `Back to ${back.label.replace(/^back to /i, "")}` : "Go back"} /> : null}
          <h1 className="min-w-0 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">{title}</h1>
        </div>
        {description ? <p className={cn("mt-1 max-w-2xl text-sm text-slate-500", indent)}>{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/**
 * "3 of 6 done" checklist for long forms: a progress bar plus one row per required step. Each row
 * jumps to its section (give the SectionCard a matching `id`), so agents always see what's left.
 */
export function FormProgress({ steps }: { steps: { label: string; done: boolean; target: string }[] }) {
  const done = steps.filter((s) => s.done).length;
  const complete = done === steps.length;
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">{complete ? "Ready to generate" : "Your progress"}</p>
        <p className={cn("text-xs font-semibold tabular-nums", complete ? "text-emerald-600" : "text-slate-500")}>
          {done} of {steps.length} done
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done} aria-label="Required steps completed">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", complete ? "bg-emerald-500" : "bg-brand-500")}
          style={{ width: `${(done / steps.length) * 100}%` }}
        />
      </div>
      <ul className="mt-3 space-y-0.5">
        {steps.map((s) => (
          <li key={s.label}>
            <button
              type="button"
              onClick={() => document.getElementById(s.target)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-slate-50"
            >
              {s.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <Circle className="h-4 w-4 shrink-0 text-slate-300" />}
              <span className={cn("flex-1", s.done ? "text-slate-500" : "font-medium text-slate-900")}>{s.label}</span>
              {s.done ? null : <span className="text-[11px] font-medium text-brand-600">Fill in</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SectionCard({
  title,
  description,
  icon: Icon,
  children,
  id,
  className,
  aside,
}: {
  title: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  children: React.ReactNode;
  id?: string;
  className?: string;
  aside?: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("scroll-mt-32 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] sm:p-7", className)}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {Icon ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Icon className="h-[18px] w-[18px]" />
            </span>
          ) : null}
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-500 sm:text-[15px]">{description}</p> : null}
          </div>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className,
  id,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} className={cn("space-y-1.5 scroll-mt-32", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-brand-500"> *</span> : null}
      </label>
      {children}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

/**
 * Native inputs styled for the panel: grey while empty, white once they hold a value. Filled boxes
 * stay neutral on purpose — red is kept for focus and errors, so a filled field never looks wrong.
 */
export const inputClass = (filled?: boolean, invalid?: boolean) =>
  cn(
    "h-10 w-full rounded-xl border px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60",
    filled ? "border-slate-300 bg-white" : "border-slate-200 bg-slate-50",
    invalid && "border-rose-300 bg-rose-50/40 focus:border-rose-400 focus:ring-rose-100"
  );

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  ({ className, invalid, ...props }, ref) => (
    <input ref={ref} {...props} className={cn(inputClass(!!props.value && String(props.value).length > 0, invalid), className)} />
  )
);
TextInput.displayName = "TextInput";

export const TextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} {...props} className={cn(inputClass(!!props.value && String(props.value).length > 0), "h-auto min-h-[84px] py-2.5", className)} />
));
TextArea.displayName = "TextArea";

export function NativeSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  id,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <select id={id} disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputClass(!!value), "pr-8", className)}>
      {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o, label: o } : o;
        return (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        );
      })}
    </select>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; hint?: string }[];
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" className={cn("inline-flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-xl text-left font-medium transition",
            size === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-sm",
            value === o.value ? "bg-white text-brand-600 shadow-sm ring-1 ring-brand-200" : "text-slate-600 hover:text-slate-900"
          )}
        >
          <span className="block">{o.label}</span>
          {o.hint ? <span className="block text-[11px] font-normal text-slate-500">{o.hint}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ label, value, onChange, min = 0, max = 99 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white">
      <button type="button" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className="h-full w-9 rounded-l-xl text-lg text-slate-500 hover:bg-slate-50 disabled:opacity-30">
        −
      </button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button type="button" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className="h-full w-9 rounded-r-xl text-lg text-slate-500 hover:bg-slate-50 disabled:opacity-30">
        +
      </button>
    </div>
  );
}

export function FileDrop({
  accept,
  onFile,
  title,
  description,
  buttonLabel,
  disabled,
  compact,
}: {
  accept: string;
  onFile: (f: File) => void;
  title: string;
  description?: string;
  buttonLabel: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const accepts = (f: File) =>
    accept.split(",").some((a) => {
      const t = a.trim();
      return t.endsWith("/*") ? f.type.startsWith(t.slice(0, -1)) : f.type === t;
    });
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (!f || disabled) return;
        if (!accepts(f)) toast.error("Wrong file type");
        else onFile(f);
      }}
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition",
        compact ? "gap-1 px-4 py-4" : "gap-2 px-6 py-8",
        over ? "border-brand-400 bg-brand-50" : "border-slate-200 bg-slate-50/60",
        disabled && "opacity-60"
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-500 shadow-sm ring-1 ring-slate-200">
        <UploadCloud className="h-5 w-5" />
      </span>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {description ? <p className="text-xs text-slate-500">{description}</p> : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => ref.current?.click()}
        className="mt-1 rounded-full border border-brand-200 bg-white px-4 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 disabled:opacity-50"
      >
        {buttonLabel}
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onFile(f);
        }}
      />
    </div>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  busyLabel,
  onConfirm,
  busy,
  destructive = true,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  busyLabel?: string;
  onConfirm: () => void;
  busy?: boolean;
  destructive?: boolean;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description} size="sm">
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={() => onOpenChange(false)} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50">
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className={cn("inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-60", destructive ? "bg-rose-600 hover:bg-rose-700" : "btn-glow rounded-lg")}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy ? busyLabel ?? confirmLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = "md",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-[2px] anim-fade" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[70] max-h-[90dvh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl anim-pop",
            size === "sm" ? "max-w-md" : size === "lg" ? "max-w-2xl" : "max-w-lg"
          )}
        >
          <DialogPrimitive.Title className="pr-8 text-lg font-bold text-slate-900">{title}</DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-1 text-sm text-slate-500">{description}</DialogPrimitive.Description>
          ) : (
            <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
          )}
          {children}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
        <Icon className="h-6 w-6" />
      </span>
      <p className="text-base font-semibold text-slate-900">{title}</p>
      <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function AccessBadge({ access }: { access: DocumentAccess }) {
  if (access.remainingDays == null && !access.locked) return null;
  if (access.locked && access.reason === "plan")
    return (
      <span
        title={`This document type is on the ${planName(access.requiredPlan ?? "gold")} plan. Upgrade to open it.`}
        className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
      >
        <Lock className="h-3 w-3" /> {accessLabel(access)}
      </span>
    );
  const urgent = !access.locked && (access.remainingDays ?? 99) <= 3;
  return (
    <span
      title={
        access.locked
          ? "Locked — Silver keeps documents open for 30 days from creation. Upgrade to Gold or Platinum to open this again."
          : "Access window"
      }
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        access.locked ? "bg-slate-100 text-slate-500" : urgent ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"
      )}
    >
      {access.locked ? <Lock className="h-3 w-3" /> : null}
      {access.locked ? "Locked" : `Open · ${accessLabel(access)}`}
    </span>
  );
}

export const primaryBtn =
  "btn-glow inline-flex h-10 items-center justify-center gap-2 rounded-lg px-5 text-sm disabled:opacity-50";
export const secondaryBtn =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50/50 disabled:opacity-50";
export const iconBtn =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-brand-50 hover:text-brand-600 disabled:opacity-40";

/** View / share / edit / delete actions for a saved document row. */
export function RowActions({
  locked,
  onView,
  onShare,
  onEdit,
  onDelete,
  extra,
}: {
  locked: boolean;
  onView?: () => void;
  onShare?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  extra?: React.ReactNode;
}) {
  if (locked) {
    return (
      <div className="flex items-center justify-end gap-1">
        <Link href="/dashboard/pricing" title="Locked on Silver plan" className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-brand-50 hover:text-brand-600">
          <Lock className="h-3.5 w-3.5" /> Locked
        </Link>
        {onDelete ? (
          <button type="button" onClick={onDelete} className={iconBtn} aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-end gap-0.5">
      {onView ? (
        <button type="button" onClick={onView} className={iconBtn} title="View PDF" aria-label="View PDF">
          <Eye className="h-4 w-4" />
        </button>
      ) : null}
      {extra}
      {onShare ? (
        <button type="button" onClick={onShare} className={cn(iconBtn, "hover:bg-emerald-50 hover:text-emerald-600")} title="Share PDF on WhatsApp" aria-label="Share PDF on WhatsApp">
          <MessageCircle className="h-4 w-4" />
        </button>
      ) : null}
      {onEdit ? (
        <button type="button" onClick={onEdit} className={iconBtn} title="Edit" aria-label="Edit">
          <Pencil className="h-4 w-4" />
        </button>
      ) : null}
      {onDelete ? (
        <button type="button" onClick={onDelete} className={cn(iconBtn, "hover:bg-rose-50 hover:text-rose-600")} title="Delete" aria-label="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

/** Bounce back to the dashboard when an admin has switched this document type off. */
export function useFeatureGate(kind: DocumentKind, label: string) {
  const { agent } = useAgent();
  const router = useRouter();
  const switchedOn = agent ? isFeatureEnabled(agent, kind) : true;
  const onPlan = agent ? planIncludes(effectivePlan(agent), kind) : true;
  const enabled = switchedOn && onPlan;
  useEffect(() => {
    if (!switchedOn) {
      toast.message(`${label} is not enabled for your account.`, { description: "Ask your admin to turn it on, or upgrade your plan if needed." });
      router.replace("/dashboard");
    } else if (!onPlan) {
      const need = lowestPlanFor(kind);
      toast.message(`${label} are on the ${need === "gold" ? "Gold and Platinum plans" : "Platinum plan"}.`, {
        description: "Upgrade to unlock this service.",
      });
      router.replace("/dashboard/pricing");
    }
  }, [switchedOn, onPlan, kind, label, router]);
  return enabled;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin text-brand-500" /> {label ?? "Loading…"}
    </div>
  );
}
