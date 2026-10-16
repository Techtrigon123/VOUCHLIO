import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Wraps skeletons so screen readers announce a single loading status, with a spinner centered on top. */
function Loading({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={cn("relative", className)}>
      <span className="sr-only">{label}</span>
      {children}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
        <span className="grid h-12 w-12 place-items-center rounded-full border border-slate-200 bg-white shadow-md">
          <Loader2 className="h-6 w-6 text-[var(--primary)] motion-safe:animate-spin" />
        </span>
      </div>
    </div>
  );
}

function ListRows({ rows }: { rows: number }) {
  return (
    <>
      <Skeleton className="mb-3 h-3 w-40" />
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="hidden gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-3 sm:flex">
          {[28, 18, 16, 14].map((w, i) => (
            <Skeleton key={i} className="h-3" style={{ width: `${w}%` }} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-0">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-3/5 sm:w-2/5" />
              <Skeleton className="h-3 w-2/5 sm:w-1/4" />
            </div>
            <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        ))}
      </div>
    </>
  );
}

/** Saved-document lists: vouchers, tickets, pickups, placards, invoices. */
export function ListSkeleton({ rows = 6, label = "Loading documents" }: { rows?: number; label?: string }) {
  return (
    <Loading label={label}>
      <ListRows rows={rows} />
    </Loading>
  );
}

/** Compact rows for lists inside dialogs and the search palette. */
export function RowsSkeleton({ rows = 4, label = "Loading", className }: { rows?: number; label?: string; className?: string }) {
  return (
    <Loading label={label} className={cn("divide-y divide-slate-100", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </Loading>
  );
}

/** Stat cards followed by a list — document access page. */
export function StatsListSkeleton({ cards = 3, label = "Loading" }: { cards?: number; label?: string }) {
  return (
    <Loading label={label} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-5 w-10" />
            </div>
          </div>
        ))}
      </div>
      <div>
        <ListRows rows={4} />
      </div>
    </Loading>
  );
}

/** Create/edit forms: header, sectioned fields and a preview column. */
export function FormSkeleton({ label = "Loading form", preview = true }: { label?: string; preview?: boolean }) {
  return (
    <Loading label={label} className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-72 max-w-full" />
        </div>
        <Skeleton className="hidden h-10 w-32 rounded-lg sm:block" />
      </div>
      <div className={cn("grid gap-6", preview && "lg:grid-cols-[1fr_380px]")}>
        <div className="space-y-5">
          {[4, 6, 2].map((fields, s) => (
            <div key={s} className="rounded-3xl border border-slate-200 bg-white p-5">
              <Skeleton className="mb-5 h-4 w-40" />
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: fields }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {preview && (
          <div className="hidden lg:block">
            <div className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-5">
              <Skeleton className="mb-4 h-4 w-24" />
              <Skeleton className="aspect-[1/1.414] w-full rounded-xl" />
            </div>
          </div>
        )}
      </div>
    </Loading>
  );
}

/** A single document view: action bar, details and a PDF preview. */
export function DetailSkeleton({ label = "Loading document" }: { label?: string }) {
  return (
    <Loading label={label} className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3.5 w-40" />
        </div>
        <div className="flex gap-2">
          {[112, 112, 96].map((w, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" style={{ width: w }} />
          ))}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="aspect-[1/1.414] w-full rounded-3xl" />
      </div>
    </Loading>
  );
}

/** Payment details block in the upgrade dialog. */
export function PaymentDetailsSkeleton() {
  return (
    <Loading label="Loading payment details" className="space-y-3 rounded-2xl border border-slate-200 p-4">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-7 w-28" />
      <Skeleton className="mx-auto h-44 w-44 rounded-xl" />
      <Skeleton className="h-3 w-3/4" />
    </Loading>
  );
}

/** Whole dashboard shell while the session loads: sidebar, top bar and page body. */
export function DashboardSkeleton() {
  return (
    <Loading label="Loading your dashboard" className="min-h-screen bg-slate-50">
      <div className="fixed inset-y-0 left-0 hidden w-64 space-y-3 border-r border-slate-200 bg-white p-5 lg:block">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-11 w-full rounded-xl" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded-xl" />
        ))}
      </div>
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6 lg:pl-[17rem]">
        <Skeleton className="h-10 w-full max-w-md rounded-xl" />
        <Skeleton className="ml-auto h-9 w-9 rounded-full" />
      </div>
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:pl-[17.5rem]">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    </Loading>
  );
}

/** Generic page body — used as the dashboard route Suspense fallback. */
export function PageBodySkeleton() {
  return (
    <Loading label="Loading page" className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3.5 w-80 max-w-full" />
      </div>
      <ListRows rows={5} />
    </Loading>
  );
}

/** Centered card — setup and auth-style forms. */
export function CardFormSkeleton({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <Loading label={label} className={cn("grid place-items-center px-4", className ?? "min-h-screen bg-slate-50")}>
      <div className="w-full max-w-lg space-y-5 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-3.5 w-full" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </Loading>
  );
}
