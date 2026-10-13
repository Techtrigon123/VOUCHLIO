import type { DocumentAccess, DocumentKind, PlanId } from "./types";

/* ─── Plans, services, billing cycles and grace periods ─────────────────────
   Single source of truth for what each plan includes. The server enforces these
   rules (lib/agent/entitlements.ts); the screens read them to show locks and prices.
   Keep GRACE_DAYS in sync with approve_plan_payment() in supabase/migrations/0005. */

export type BillingCycle = "monthly" | "yearly";

/**
 * Prices in INR, GST inclusive.
 * TODO: the MONTHLY prices are placeholders — replace them with your real prices before launch.
 */
export const PLAN_PRICES_INR = {
  gold: { monthly: 199, yearly: 1999 },
  platinum: { monthly: 699, yearly: 6999 },
} as const;

/** Yearly prices (kept for pages that quote the yearly price). */
export const PAID_PLAN_PRICE_INR = { gold: PLAN_PRICES_INR.gold.yearly, platinum: PLAN_PRICES_INR.platinum.yearly } as const;
export type PaidPlanId = keyof typeof PAID_PLAN_PRICE_INR;

/** Days a paid plan keeps working after it ends, so the customer can renew without losing access. */
export const GRACE_DAYS: Record<BillingCycle, number> = { monthly: 2, yearly: 5 };

/** Silver (free) can create at most this many new documents per calendar month (India time). */
export const FREE_MONTHLY_DOCUMENTS = 4;

/** The 7 services, in display order. */
export const ALL_SERVICES: DocumentKind[] = [
  "hotel_voucher", "invoice", "proforma", "receipt", "air_ticket", "pickup_voucher", "welcome_placard",
];

export const SERVICE_LABELS: Record<DocumentKind, string> = {
  hotel_voucher: "Hotel vouchers",
  invoice: "Invoices",
  proforma: "Proforma invoices",
  receipt: "Payment receipts",
  air_ticket: "Air tickets",
  pickup_voucher: "Pickup vouchers",
  welcome_placard: "Welcome placards",
};

/** Services open on each plan: Silver 3 of 7, Gold 4 of 7, Platinum all 7 (payment receipts are Platinum-only). */
export const PLAN_SERVICES: Record<PlanId, readonly DocumentKind[]> = {
  silver: ["hotel_voucher", "invoice", "proforma"],
  gold: ["hotel_voucher", "invoice", "proforma", "air_ticket"],
  platinum: ALL_SERVICES,
};

export function planIncludes(plan: PlanId, kind: DocumentKind): boolean {
  return PLAN_SERVICES[plan].includes(kind);
}

/** The cheapest plan that opens a service. */
export function lowestPlanFor(kind: DocumentKind): PlanId {
  return (["silver", "gold", "platinum"] as const).find((p) => planIncludes(p, kind)) ?? "platinum";
}

export function planName(p: PlanId): string {
  return p === "silver" ? "Silver" : p === "gold" ? "Gold" : "Platinum";
}

export function isBillingCycle(v: unknown): v is BillingCycle {
  return v === "monthly" || v === "yearly";
}

/** Plans bought before monthly billing existed were yearly. */
export function normalizeCycle(v: unknown): BillingCycle {
  return v === "monthly" ? "monthly" : "yearly";
}

/** Silver keeps generated documents open for this many days from creation. */
export const SILVER_RETENTION_DAYS = 30;

/** Upload auto-fill allowances. */
export const EXTRACT_LIMITS = {
  silverVoucherPerDay: 2,
  silverAirTicketPerDay: 2,
  goldPerYear: 200,
} as const;

export function isPaidPlan(p: string): p is PaidPlanId {
  return p === "gold" || p === "platinum";
}

export function normalizePlan(p: unknown): PlanId {
  const v = String(p ?? "silver").toLowerCase();
  return v === "gold" || v === "platinum" ? v : "silver";
}

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SubscriptionState {
  /** The plan the account can use right now. */
  plan: PlanId;
  /** The paid plan on the account (even if it has lapsed), or null for Silver. */
  paidPlan: PaidPlanId | null;
  cycle: BillingCycle | null;
  /** free: Silver · active: paid and current · grace: ended, still usable · lapsed: grace over, back on Silver. */
  status: "free" | "active" | "grace" | "lapsed";
  expiresAt: string | null;
  graceEndsAt: string | null;
  /** Whole days until the plan ends (active) or until the grace period ends (grace). */
  daysLeft: number | null;
}

type SubscriptionFields = {
  subscriptionPlan?: string;
  subscriptionExpiresAt?: string | Date | null;
  subscriptionCycle?: string | null;
};

export function subscriptionState(a: SubscriptionFields, now = Date.now()): SubscriptionState {
  const plan = normalizePlan(a.subscriptionPlan);
  if (plan === "silver") return { plan: "silver", paidPlan: null, cycle: null, status: "free", expiresAt: null, graceEndsAt: null, daysLeft: null };
  const cycle = normalizeCycle(a.subscriptionCycle);
  const expires = a.subscriptionExpiresAt ? new Date(a.subscriptionExpiresAt).getTime() : NaN;
  // A paid plan with no end date (set by hand) never lapses.
  if (Number.isNaN(expires)) return { plan, paidPlan: plan, cycle, status: "active", expiresAt: null, graceEndsAt: null, daysLeft: null };
  const graceEnds = expires + GRACE_DAYS[cycle] * DAY_MS;
  const base = { paidPlan: plan, cycle, expiresAt: new Date(expires).toISOString(), graceEndsAt: new Date(graceEnds).toISOString() };
  if (now < expires) return { ...base, plan, status: "active", daysLeft: Math.ceil((expires - now) / DAY_MS) };
  if (now < graceEnds) return { ...base, plan, status: "grace", daysLeft: Math.max(1, Math.ceil((graceEnds - now) / DAY_MS)) };
  return { ...base, plan: "silver", status: "lapsed", daysLeft: null };
}

/** The plan the account can use now: a paid plan stays usable through its grace period, then falls back to Silver. */
export function effectivePlan(a: SubscriptionFields): PlanId {
  return subscriptionState(a).plan;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // India: UTC+5:30, no daylight saving

/** Start of the current free-allowance month: the 1st at 00:00 India time. */
export function freePeriodStart(now = Date.now()): Date {
  const local = new Date(now + IST_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - IST_OFFSET_MS);
}

/** When the free allowance next resets. */
export function nextFreeReset(now = Date.now()): Date {
  const local = new Date(now + IST_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - IST_OFFSET_MS);
}

export function planLabel(p: PlanId): string {
  return `${p.charAt(0).toUpperCase()}${p.slice(1)} plan`;
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Whether a saved document can be opened and downloaded on the current plan: its service must be
 * open on the plan, and on Silver it must still be inside the history window.
 */
export function documentAccess(plan: PlanId, createdAt: Date | string, kind?: DocumentKind, now = Date.now()): DocumentAccess {
  if (kind && !planIncludes(plan, kind))
    return { locked: true, remainingDays: null, accessUntil: null, reason: "plan", requiredPlan: lowestPlanFor(kind) };
  if (plan !== "silver") return { locked: false, remainingDays: null, accessUntil: null };
  const until = new Date(new Date(createdAt).getTime() + SILVER_RETENTION_DAYS * DAY_MS);
  const remaining = Math.ceil((until.getTime() - now) / DAY_MS);
  return {
    locked: until.getTime() <= now,
    ...(until.getTime() <= now ? { reason: "history" as const } : {}),
    remainingDays: Math.max(0, remaining),
    accessUntil: until.toISOString(),
  };
}

export function accessLabel(a: DocumentAccess): string {
  if (a.locked && a.reason === "plan") return `${planName(a.requiredPlan ?? "gold")} plan`;
  if (a.locked) return "Access closed";
  if (a.remainingDays == null) return "Open";
  if (a.remainingDays <= 0) return "Closes today";
  if (a.remainingDays === 1) return "Last day";
  return `${a.remainingDays} days left`;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  headline: string;
  /** null for the free plan. */
  prices: { monthly: number; yearly: number } | null;
  cta: string;
  featured?: boolean;
  badge?: string;
  subscriptionNote?: string;
  highlights: { value: string; label: string }[];
  /** The document services open on this plan. */
  services: readonly DocumentKind[];
  features: string[];
}

export const PLANS: PlanDefinition[] = [
  {
    id: "silver",
    name: "Silver",
    headline: "Start free with the everyday documents.",
    prices: null,
    cta: "Get started free",
    subscriptionNote: "No credit card · upgrade anytime",
    highlights: [
      { value: "3 of 7", label: "Services" },
      { value: `${FREE_MONTHLY_DOCUMENTS}/month`, label: "New documents" },
      { value: "30 days", label: "History saved" },
    ],
    services: PLAN_SERVICES.silver,
    features: ["Ready-made professional templates", "2 hotel voucher upload fills a day", "Watermarked PDFs"],
  },
  {
    id: "gold",
    name: "Gold",
    headline: "Add air tickets. Clean PDFs with your logo.",
    prices: PLAN_PRICES_INR.gold,
    cta: "Choose Gold",
    featured: true,
    badge: "Popular",
    highlights: [
      { value: "4 of 7", label: "Services" },
      { value: "Unlimited", label: "New documents" },
      { value: "Forever", label: "Document history" },
    ],
    services: PLAN_SERVICES.gold,
    features: ["No watermark · your logo on every document", `${EXTRACT_LIMITS.goldPerYear} upload fills a year`, "All library template styles", "Priority support"],
  },
  {
    id: "platinum",
    name: "Platinum",
    headline: "Every service, plus vouchers designed only for your agency.",
    prices: PLAN_PRICES_INR.platinum,
    cta: "Choose Platinum",
    badge: "Everything",
    subscriptionNote: "Your design is never shared with other agents",
    highlights: [
      { value: "7 of 7", label: "Services" },
      { value: "Unlimited", label: "Upload fills" },
      { value: "Custom", label: "Voucher design" },
    ],
    services: PLAN_SERVICES.platinum,
    features: ["Everything in Gold", "Exclusive layouts, colours & fonts", "Template revisions included", "Dedicated onboarding"],
  },
];

const serviceRow = (label: string, kind: DocumentKind) => ({
  label,
  silver: planIncludes("silver", kind),
  gold: planIncludes("gold", kind),
  platinum: planIncludes("platinum", kind),
});

export const PLAN_COMPARISON: { label: string; silver: boolean | string; gold: boolean | string; platinum: boolean | string }[] = [
  serviceRow("Hotel vouchers", "hotel_voucher"),
  serviceRow("Invoices", "invoice"),
  serviceRow("Proforma invoices", "proforma"),
  serviceRow("Payment receipts", "receipt"),
  serviceRow("Air tickets", "air_ticket"),
  serviceRow("Pickup vouchers", "pickup_voucher"),
  serviceRow("Welcome placards", "welcome_placard"),
  { label: "New documents", silver: `${FREE_MONTHLY_DOCUMENTS} / month`, gold: "Unlimited", platinum: "Unlimited" },
  { label: "Document history", silver: `${SILVER_RETENTION_DAYS} days`, gold: "Forever", platinum: "Forever" },
  { label: "Upload to auto-fill", silver: `${EXTRACT_LIMITS.silverVoucherPerDay}/day (hotel)`, gold: `${EXTRACT_LIMITS.goldPerYear} / year`, platinum: "Unlimited" },
  { label: "Clean PDFs (no watermark)", silver: false, gold: true, platinum: true },
  { label: "Your logo on documents", silver: false, gold: true, platinum: true },
  { label: "Custom-designed templates", silver: false, gold: false, platinum: true },
  { label: "Priority support", silver: false, gold: true, platinum: true },
  { label: "Grace period after the plan ends", silver: "—", gold: `${GRACE_DAYS.monthly} days (monthly) · ${GRACE_DAYS.yearly} days (yearly)`, platinum: `${GRACE_DAYS.monthly} days (monthly) · ${GRACE_DAYS.yearly} days (yearly)` },
];

type PriceTable = Record<PaidPlanId, Record<BillingCycle, number>>;

const price = (plan: PaidPlanId, prices: PriceTable = PLAN_PRICES_INR) =>
  `${formatInr(prices[plan].monthly)} a month or ${formatInr(prices[plan].yearly)} a year`;

/** Pricing FAQ, worded with the given prices (the live ones come from /api/agent/plan). */
export const pricingFaq = (prices: PriceTable = PLAN_PRICES_INR) => [
  {
    q: "What is included in the Silver plan?",
    a: `Silver is free and opens 3 of the 7 services: hotel vouchers, invoices and proforma invoices. You can create up to ${FREE_MONTHLY_DOCUMENTS} new documents each calendar month (the count resets on the 1st, India time); editing a saved document doesn't count. History is kept for ${SILVER_RETENTION_DAYS} days and PDFs carry a watermark.`,
  },
  {
    q: "What does Gold add?",
    a: `Gold (${price("gold", prices)}, GST inclusive) opens air tickets as a fourth service, removes the monthly document limit and the watermark, adds your logo, keeps history forever and includes ${EXTRACT_LIMITS.goldPerYear} upload auto-fills a year.`,
  },
  {
    q: "What does Platinum add?",
    a: `Platinum (${price("platinum", prices)}, GST inclusive) opens all 7 services — including payment receipts, pickup vouchers and welcome placards — with unlimited upload auto-fill and vouchers designed only for your agency.`,
  },
  {
    q: "Monthly or yearly — what's the difference?",
    a: "Same features, different billing. Monthly runs for one month from activation, yearly for one year. Plans don't renew automatically: you pay again when you want to continue, and you can switch between monthly and yearly when you renew.",
  },
  {
    q: "What happens when my plan ends?",
    a: `You get a grace period so nothing stops suddenly: ${GRACE_DAYS.monthly} days for monthly plans and ${GRACE_DAYS.yearly} days for yearly plans. Your plan keeps working during the grace period and you can renew monthly or yearly. Renew during the grace period and your new term continues from your old end date. After the grace period your account moves to Silver: services outside Silver lock until you renew, and your saved documents are kept.`,
  },
  {
    q: "What are upload auto-fills?",
    a: `Upload a hotel voucher or airline e-ticket and we read the details to fill your form automatically. Silver gets ${EXTRACT_LIMITS.silverVoucherPerDay} hotel voucher uploads a day. Gold includes ${EXTRACT_LIMITS.goldPerYear} uploads a year. Platinum is unlimited.`,
  },
  {
    q: "What payment methods do you accept?",
    a: "Pay online with UPI, debit or credit card, net banking or a wallet through Razorpay's secure checkout — your plan activates instantly. You can also pay by UPI QR code and upload the payment screenshot; we verify it and activate your plan.",
  },
  {
    q: "How is my data kept private?",
    a: "Your account, customer details, and documents are stored securely and used only to run the service. We do not sell personal data. See our Privacy Policy.",
  },
];

export const PRICING_FAQ = pricingFaq();
