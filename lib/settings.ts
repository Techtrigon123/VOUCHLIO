import "server-only";
import { db } from "@/lib/db/supabase";
import { PLAN_PRICES_INR } from "@/lib/agent/plans";

/**
 * Settings that master admins change in the Vouchlio Admin portal (table app_settings, migration
 * 0006). Read on the server, cached for a minute. Anything not set — or the whole table, before the
 * migration is run — falls back to the code defaults and environment variables.
 */

export type Prices = { gold: { monthly: number; yearly: number }; platinum: { monthly: number; yearly: number } };

/** Support channels agents can use, switched on/off in Vouchlio Admin → Settings → Support. */
export interface SupportSettings {
  tickets: boolean;
  bugReports: boolean;
  callbacks: boolean;
  /** Shown under "Request a Callback", e.g. "Mon–Sat, 10 am – 7 pm IST". */
  callbackHours: string;
}

export const DEFAULT_SUPPORT: SupportSettings = {
  tickets: true,
  bugReports: true,
  callbacks: true,
  callbackHours: "Mon–Sat, 10 am – 7 pm IST",
};

export interface AppSettings {
  /** onlineEnabled: Razorpay checkout (also needs the RAZORPAY_* keys). manualUpi: pay by UPI + upload proof. */
  payments: { upiId: string | null; payeeName: string; onlineEnabled: boolean; manualUpi: boolean };
  support: SupportSettings;
  pricing: Prices;
  ai: {
    enabled: boolean | null;
    dailyBudgetUsd: number | null;
    monthlyBudgetUsd: number | null;
    userDailyCalls: number | null;
    freePoolDailyCalls: number | null;
  };
}

const TTL_MS = 60_000;
let cache: { value: AppSettings; at: number } | null = null;

const posInt = (v: unknown): number | null => (Number.isInteger(v) && (v as number) > 0 ? (v as number) : null);
const nonNeg = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);

function build(rows: Map<string, Record<string, unknown>>): AppSettings {
  const pay = rows.get("payments") ?? {};
  const price = rows.get("pricing") as Record<string, Record<string, unknown>> | undefined;
  const ai = rows.get("ai") ?? {};
  const sup = rows.get("support") ?? {};
  const flag = (k: keyof Omit<SupportSettings, "callbackHours">) => (typeof sup[k] === "boolean" ? (sup[k] as boolean) : DEFAULT_SUPPORT[k]);
  const pick = (plan: "gold" | "platinum", cycle: "monthly" | "yearly") => posInt(price?.[plan]?.[cycle]) ?? PLAN_PRICES_INR[plan][cycle];
  return {
    payments: {
      upiId: (typeof pay.upiId === "string" && pay.upiId.trim()) || process.env.PLAN_PAYMENT_UPI_ID?.trim() || null,
      payeeName: (typeof pay.payeeName === "string" && pay.payeeName.trim()) || process.env.PLAN_PAYMENT_PAYEE_NAME?.trim() || "Vouchlio",
      onlineEnabled: pay.onlineEnabled !== false,
      manualUpi: pay.manualUpi !== false,
    },
    support: {
      tickets: flag("tickets"),
      bugReports: flag("bugReports"),
      callbacks: flag("callbacks"),
      callbackHours: (typeof sup.callbackHours === "string" && sup.callbackHours.trim().slice(0, 80)) || DEFAULT_SUPPORT.callbackHours,
    },
    pricing: {
      gold: { monthly: pick("gold", "monthly"), yearly: pick("gold", "yearly") },
      platinum: { monthly: pick("platinum", "monthly"), yearly: pick("platinum", "yearly") },
    },
    ai: {
      enabled: typeof ai.enabled === "boolean" ? ai.enabled : null,
      dailyBudgetUsd: nonNeg(ai.dailyBudgetUsd),
      monthlyBudgetUsd: nonNeg(ai.monthlyBudgetUsd),
      userDailyCalls: nonNeg(ai.userDailyCalls),
      freePoolDailyCalls: nonNeg(ai.freePoolDailyCalls),
    },
  };
}

export async function getAppSettings(): Promise<AppSettings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  let rows = new Map<string, Record<string, unknown>>();
  try {
    const { data, error } = await db().from("app_settings").select("key,value");
    if (!error) rows = new Map((data ?? []).map((r: { key: string; value: Record<string, unknown> }) => [r.key, r.value ?? {}]));
  } catch {
    /* table missing or database unreachable — use defaults */
  }
  cache = { value: build(rows), at: Date.now() };
  return cache.value;
}

/** Last loaded settings without waiting (null until getAppSettings() has run once in this process). */
export function cachedAppSettings(): AppSettings | null {
  return cache?.value ?? null;
}
