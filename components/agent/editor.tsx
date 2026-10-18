"use client";

/*
 * Building blocks for the document editors (air ticket, hotel voucher, pickup voucher, placard…):
 * the form on the left in white cards, the live preview pinned on the right, a large-card PDF
 * layout picker and a "Ready to save?" bar that stays above the footer while the form scrolls.
 */
import React from "react";
import { Check, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

/** Two equal columns on wide screens (form · live preview); stacked, form first, below that. */
export function EditorLayout({ form, preview }: { form: React.ReactNode; preview: React.ReactNode }) {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-2 xl:gap-12">
      <div className="min-w-0 space-y-6">{form}</div>
      <div className="min-w-0 xl:sticky xl:top-[108px]">{preview}</div>
    </div>
  );
}

/** The right-hand preview column: a heading row, then a soft panel that scrolls on its own. */
export function PreviewPanel({ meta, status, children, footer }: { meta?: React.ReactNode; status?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <section aria-label="Live preview">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Eye className="h-4 w-4 text-[var(--primary)]" /> Live preview
        </h2>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {status}
          {meta ? <span>{meta}</span> : null}
        </div>
      </div>
      <div className="keep-light overflow-y-auto rounded-3xl border border-slate-200 bg-slate-100/80 p-4 sm:p-6 xl:max-h-[calc(100vh-200px)]">{children}</div>
      {footer}
    </section>
  );
}

/** A grey panel inside a form card, e.g. "Flight 1 — airline, flight number, route and times". */
export function SubSection({
  title,
  description,
  aside,
  children,
  className,
  id,
}: {
  title: string;
  description?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} className={cn("scroll-mt-32 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-slate-900">{title}</p>
          {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
        </div>
        {aside}
      </div>
      {children}
    </div>
  );
}

/** A sketch of a PDF page for the layout picker; each position gets a different page shape. */
function LayoutSketch({ shape, accent }: { shape: number; accent: string }) {
  const bar = "h-2 rounded-full bg-slate-200";
  switch (shape % 4) {
    case 1:
      return (
        <div className="flex h-full flex-col p-4">
          <div className="flex items-center gap-3">
            <span className="h-8 w-8 rounded-full opacity-30" style={{ background: accent }} />
            <span className={cn(bar, "flex-1")} />
          </div>
          <div className="ml-2 flex flex-1 flex-col items-start justify-center">
            <span className="h-2.5 w-4 rounded-full opacity-80" style={{ background: accent }} />
            <span className="ml-[7px] h-8 w-px bg-slate-300" />
            <span className="h-2.5 w-4 rounded-full opacity-80" style={{ background: accent }} />
          </div>
          <span className="h-6 rounded-lg bg-slate-200/80" />
        </div>
      );
    case 2:
      return (
        <div className="flex h-full flex-col gap-2 p-4">
          <span className="h-4 rounded-md bg-slate-800" />
          <div className="flex gap-1.5">
            <span className={cn(bar, "w-1/3")} />
            <span className={cn(bar, "w-1/3")} />
            <span className="ml-auto h-6 w-1/4 rounded-md border border-slate-200 bg-white" />
          </div>
          <span className="flex-1 rounded-md border border-slate-200 bg-white" />
          <span className="h-8 rounded-md border border-dashed border-amber-200 bg-amber-50" />
        </div>
      );
    case 3:
      return (
        <div className="flex h-full gap-2 p-4">
          <div className="flex flex-1 flex-col gap-2">
            <span className={cn(bar, "w-1/2")} />
            <span className={bar} />
            <span className={bar} />
            <span className="mt-1 flex-1 rounded-md border border-slate-200 bg-white" />
          </div>
          <span className="w-1/3 rounded-md opacity-25" style={{ background: accent }} />
        </div>
      );
    default:
      return (
        <div className="flex h-full flex-col gap-2 p-4">
          <span className="h-3 w-2/5 rounded-full opacity-30" style={{ background: accent }} />
          <span className={bar} />
          <span className={bar} />
          <span className={bar} />
          <span className="mt-1 flex-1 rounded-md border border-dashed opacity-50" style={{ borderColor: accent, background: `${accent}14` }} />
        </div>
      );
  }
}

/** Big cards with a page sketch for choosing how the PDF looks. */
export function LayoutPicker<T extends string>({
  options,
  value,
  onChange,
  accent = "#e63946",
}: {
  options: { id: T; label: string; description: string; color?: string }[];
  value: T;
  onChange: (v: T) => void;
  accent?: string;
}) {
  return (
    <div role="radiogroup" aria-label="PDF layout" className={cn("grid gap-4 sm:grid-cols-2", options.length === 3 && "2xl:grid-cols-3")}>
      {options.map((o, i) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={cn(
              "flex flex-col rounded-2xl border bg-white p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
              on ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/25" : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
            )}
          >
            <span className="relative block aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <LayoutSketch shape={i} accent={o.color ?? accent} />
              {on ? (
                <span className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white shadow">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
              ) : null}
            </span>
            <span className="mt-3 px-1 text-[15px] font-semibold text-slate-900">{o.label}</span>
            <span className="mt-0.5 px-1 pb-1 text-sm leading-snug text-slate-500">{o.description}</span>
          </button>
        );
      })}
    </div>
  );
}

/** "Ready to save?" bar that stays at the bottom of the screen (above the footer) while the form scrolls. */
export function SaveBar({ title = "Ready to save?", description, children }: { title?: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="sticky bottom-14 z-20 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 px-5 py-4 shadow-[0_8px_30px_rgba(15,23,42,0.14)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-slate-900">{title}</p>
        {description ? <p className="text-sm text-slate-500">{description}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
