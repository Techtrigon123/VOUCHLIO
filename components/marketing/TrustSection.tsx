import "server-only";
import React from "react";
import { db } from "@/lib/db/supabase";
import { ALL_SERVICES } from "@/lib/agent/plans";
import { PLACARD_THEMES, VOUCHER_TEMPLATES } from "@/lib/agent/documents";

/**
 * "Trusted by travel professionals" stats. Every number is real:
 * - live counts (agents, documents) appear only once they're big enough to mean something,
 *   rounded down (1,532 → 1,500+), and are refreshed at most once an hour;
 * - until then the cards show product facts that are true today.
 */

const SHOW_AGENTS_FROM = 100;
const SHOW_DOCUMENTS_FROM = 1000;
const TTL_MS = 60 * 60 * 1000;

let cache: { at: number; agents: number; documents: number } | null = null;

async function liveCounts(): Promise<{ agents: number; documents: number }> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
  try {
    const [agents, documents] = await Promise.all([
      db().from("users").select("id", { count: "exact", head: true }),
      db().from("agent_documents").select("id", { count: "exact", head: true }),
    ]);
    cache = { at: Date.now(), agents: agents.count ?? 0, documents: documents.count ?? 0 };
  } catch {
    cache = { at: Date.now(), agents: 0, documents: 0 }; // database unreachable: show the product facts
  }
  return cache;
}

/** Round down to two significant figures: 1,532 → "1,500+", 127 → "120+". */
function roundedPlus(n: number): string {
  const step = 10 ** Math.max(0, String(n).length - 2);
  return `${(Math.floor(n / step) * step).toLocaleString("en-IN")}+`;
}

export default async function TrustSection() {
  const { agents, documents } = await liveCounts();

  const stats: { value: string; label: string }[] = [
    agents >= SHOW_AGENTS_FROM ? { value: roundedPlus(agents), label: "Travel businesses" } : { value: String(ALL_SERVICES.length), label: "Document types" },
    documents >= SHOW_DOCUMENTS_FROM ? { value: roundedPlus(documents), label: "Documents created" } : { value: String(PLACARD_THEMES.length), label: "Welcome placard designs" },
    agents >= SHOW_AGENTS_FROM ? { value: String(ALL_SERVICES.length), label: "Document types" } : { value: String(VOUCHER_TEMPLATES.length), label: "Hotel voucher templates" },
    { value: "₹0", label: "To start on Silver" },
  ];

  return (
    <section id="trust" className="bg-slate-50 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--primary)]">Trust</p>
          <h2 className="mb-4 text-3xl font-bold text-[var(--foreground)] sm:text-4xl">Trusted by travel professionals</h2>
          <p className="mx-auto max-w-2xl text-[var(--muted-foreground)]">
            Join a growing network of travel businesses focused on professional operations and transparent practices.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-3xl border border-slate-200 bg-white px-4 py-7 text-center transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-500/5">
              <dt className="sr-only">{s.label}</dt>
              <dd className="text-3xl font-bold tabular-nums text-slate-900 sm:text-4xl">{s.value}</dd>
              <dd className="mt-1.5 text-sm text-slate-500">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
