import "server-only";
import { db } from "@/lib/db/supabase";

/**
 * API rate limiting, applied to every /api request from proxy.ts.
 *
 * - "db" rules (auth & password endpoints) keep counters in Supabase so the
 *   limit holds across restarts and across multiple server instances.
 * - "memory" rules (general traffic) count in this server process only —
 *   fast, no extra database round trip, good enough for abuse throttling.
 * If Supabase is unreachable, db rules fall back to the in-memory counter
 * with the same limits rather than letting requests through unlimited.
 */

export interface RateRule {
  id: string;
  /** Matches the request path (and method, when given). */
  test: (path: string, method: string) => boolean;
  limit: number;
  windowSeconds: number;
  store: "db" | "memory";
  /** Count per signed-in user when possible, otherwise per client IP. */
  scope: "ip" | "user";
  /**
   * Daily caps: checked in addition to the first matching rule, so a request can be
   * held to both a burst limit (per minute) and a daily ceiling.
   */
  extra?: boolean;
}

const FIFTEEN_MIN = 15 * 60;
const DAY = 24 * 60 * 60;

/** A daily ceiling, stored in Supabase so it holds across restarts and server instances. */
const daily = (id: string, test: RateRule["test"], limit: number, scope: RateRule["scope"]): RateRule =>
  ({ id: `day:${id}`, test, limit, windowSeconds: DAY, store: "db", scope, extra: true });

/**
 * Daily ceilings. They stop scripted abuse that stays under the per-minute limits:
 * account farms, database-bloat attacks and runaway PDF/AI usage (hosting and API bills).
 * Generous for real agencies; raise them here if a customer legitimately needs more.
 */
const DAILY_RULES: RateRule[] = [
  daily("signup:ip", (p, m) => p === "/api/auth/signup" && m === "POST", 10, "ip"),
  daily("contact:ip", (p, m) => p === "/api/contact" && m === "POST", 20, "ip"),
  daily("documents:create", (p, m) => p === "/api/agent/documents" && m === "POST", 300, "user"),
  daily("documents:update", (p, m) => /^\/api\/agent\/documents\/[^/]+$/.test(p) && m === "PATCH", 1500, "user"),
  daily("payments:create", (p, m) => /^\/api\/agent\/documents\/[^/]+\/payments$/.test(p) && m === "POST", 300, "user"),
  daily("customers:create", (p, m) => p === "/api/agent/customers" && m === "POST", 200, "user"),
  daily("support:tickets", (p, m) => p === "/api/agent/support/tickets" && m === "POST", 15, "user"),
  daily("support:replies", (p, m) => /^\/api\/agent\/support\/tickets\/[^/]+$/.test(p) && m === "POST", 100, "user"),
  daily("support:bugs", (p, m) => p === "/api/agent/support/bugs" && m === "POST", 10, "user"),
  daily("support:callbacks", (p, m) => p === "/api/agent/support/callbacks" && m === "POST", 5, "user"),
  daily("plan:submit", (p, m) => p === "/api/agent/plan/submit" && m === "POST", 10, "user"),
  daily("plan:rzp-order", (p, m) => p === "/api/agent/plan/razorpay/order" && m === "POST", 40, "user"),
  daily("plan:rzp-verify", (p, m) => p === "/api/agent/plan/razorpay/verify" && m === "POST", 40, "user"),
  daily("profile:update", (p, m) => (p === "/api/agent/profile" || p === "/api/agent/setup") && m !== "GET", 100, "user"),
  daily("pdf", (p) => /^\/api\/agent\/documents\/[^/]+\/pdf$/.test(p), 1500, "user"),
  daily("export", (p) => p === "/api/agent/invoices/export", 100, "user"),
  daily("preview", (p, m) => p === "/api/agent/documents/preview" && m === "POST", 3000, "user"),
];
const AUTH_ROUTES = ["login", "signup", "forgot-password", "reset-password"];

export const RATE_RULES: RateRule[] = [
  // Max 5 attempts per 15 minutes on each auth route, per IP address.
  ...AUTH_ROUTES.map<RateRule>((name) => ({
    id: `auth:${name}`,
    test: (p, m) => p === `/api/auth/${name}` && m !== "GET",
    limit: 5,
    windowSeconds: FIFTEEN_MIN,
    store: "db",
    scope: "ip",
  })),
  {
    id: "auth:change-password",
    test: (p, m) => p === "/api/agent/change-password" && m !== "GET",
    limit: 5,
    windowSeconds: FIFTEEN_MIN,
    store: "db",
    scope: "user",
  },
  // Public contact form — stops spam floods.
  { id: "contact", test: (p, m) => p === "/api/contact" && m === "POST", limit: 5, windowSeconds: FIFTEEN_MIN, store: "db", scope: "ip" },
  // Expensive endpoints.
  { id: "export", test: (p) => p === "/api/agent/invoices/export", limit: 10, windowSeconds: 60, store: "memory", scope: "user" },
  { id: "pdf", test: (p) => /^\/api\/agent\/documents\/[^/]+\/pdf$/.test(p), limit: 60, windowSeconds: 60, store: "memory", scope: "user" },
  // Live form previews re-render about a second after typing stops.
  { id: "preview", test: (p, m) => p === "/api/agent/documents/preview" && m === "POST", limit: 40, windowSeconds: 60, store: "memory", scope: "user" },
  // Online plan payments: opening checkout and confirming it.
  { id: "plan:rzp", test: (p, m) => p.startsWith("/api/agent/plan/razorpay/") && m === "POST", limit: 10, windowSeconds: 60, store: "memory", scope: "user" },
  // Payment-gateway webhooks arrive from a few Razorpay IPs, in bursts after outages. Signed, so only a flood guard.
  { id: "webhooks", test: (p) => p.startsWith("/api/webhooks/"), limit: 600, windowSeconds: 60, store: "memory", scope: "ip" },
  // Everything else under /api.
  { id: "api", test: (p) => p.startsWith("/api/"), limit: 120, windowSeconds: 60, store: "memory", scope: "user" },
  ...DAILY_RULES,
];

/** The first matching burst rule, plus every matching daily ceiling. */
export function findRules(path: string, method: string): RateRule[] {
  if (method === "OPTIONS") return [];
  const primary = RATE_RULES.find((r) => !r.extra && r.test(path, method));
  const extras = RATE_RULES.filter((r) => r.extra && r.test(path, method));
  return primary ? [primary, ...extras] : extras;
}

export interface RateResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window resets. */
  resetIn: number;
}

/* ─── in-memory store (survives dev hot reloads via globalThis) ──────────── */

type Bucket = { count: number; resetAt: number };
const g = globalThis as unknown as { __rateBuckets?: Map<string, Bucket> };
const buckets = (g.__rateBuckets ??= new Map<string, Bucket>());

function hitMemory(key: string, limit: number, windowSeconds: number): RateResult {
  const now = Date.now();
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowSeconds * 1000 };
    buckets.set(key, b);
  }
  b.count += 1;
  return {
    allowed: b.count <= limit,
    limit,
    remaining: Math.max(0, limit - b.count),
    resetIn: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
  };
}

async function hitDb(key: string, limit: number, windowSeconds: number): Promise<RateResult> {
  const { data, error } = await db().rpc("rate_limit_hit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new Error(error.message);
  const row = (data as { allowed: boolean; remaining: number; reset_at: string }[] | null)?.[0];
  if (!row) throw new Error("rate_limit_hit returned no row");
  return {
    allowed: row.allowed,
    limit,
    remaining: row.remaining,
    resetIn: Math.max(1, Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 1000)),
  };
}

export async function checkRateLimit(rule: RateRule, identity: string): Promise<RateResult> {
  const key = `${rule.id}:${identity}`;
  if (rule.store === "db") {
    try {
      return await hitDb(key, rule.limit, rule.windowSeconds);
    } catch (e) {
      console.warn("[rate-limit] Supabase unavailable, using in-memory counter:", (e as Error).message);
    }
  }
  return hitMemory(key, rule.limit, rule.windowSeconds);
}

/**
 * Client IP for rate limiting. Prefers headers that the hosting platform sets itself
 * (clients can't forge them there), then the right-most X-Forwarded-For entry — the one
 * added by our own proxy. The left-most entry is whatever the client sent, so trusting it
 * would let an attacker pick a fresh "IP" for every request and dodge per-IP limits.
 */
export function clientIp(headers: Headers): string {
  // On Vercel, trust only Vercel's own headers: it overwrites them on every request, while any
  // other header (cf-connecting-ip included) arrives exactly as the client sent it, so an attacker
  // could rotate it on every request to dodge the per-IP limits.
  if (process.env.VERCEL) {
    const ip = headers.get("x-vercel-forwarded-for") ?? headers.get("x-real-ip");
    return ip?.split(",")[0].trim() || "unknown";
  }
  const platform = headers.get("cf-connecting-ip") ?? headers.get("x-vercel-forwarded-for") ?? headers.get("x-real-ip");
  if (platform) return platform.split(",")[0].trim();
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",").map((s) => s.trim()).filter(Boolean).pop() ?? "unknown";
  return "unknown";
}

export function retryMessage(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  return seconds < 90
    ? `Too many attempts. Please wait ${seconds} seconds and try again.`
    : `Too many attempts. Please wait ${minutes} minutes and try again.`;
}

/**
 * Per-account limits, checked inside the login / forgot-password routes (the
 * proxy can't see the email in the body). These still hold if an attacker
 * rotates IPs or spoofs X-Forwarded-For. Login gets a little more room than
 * the per-IP limit so a real user can still sign in while someone else is
 * guessing from elsewhere; the lockout lasts 15 minutes at most.
 */
const never = () => false;
export const ACCOUNT_RULES = {
  login: { id: "account:login", test: never, limit: 10, windowSeconds: FIFTEEN_MIN, store: "db", scope: "ip" } as RateRule,
  forgot: { id: "account:forgot", test: never, limit: 5, windowSeconds: FIFTEEN_MIN, store: "db", scope: "ip" } as RateRule,
};

export function accountKey(email: string): string {
  return `email:${email.trim().toLowerCase()}`;
}
