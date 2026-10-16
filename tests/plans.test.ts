import { describe, expect, it } from "vitest";
import {
  ALL_SERVICES,
  GRACE_DAYS,
  PLAN_SERVICES,
  SILVER_RETENTION_DAYS,
  accessLabel,
  documentAccess,
  formatInr,
  freePeriodStart,
  isPaidPlan,
  lowestPlanFor,
  nextFreeReset,
  normalizeCycle,
  normalizePlan,
  planIncludes,
  subscriptionState,
} from "@/lib/agent/plans";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 14, 6, 0, 0); // 14 Oct 2026, 11:30 IST

describe("plan services", () => {
  it("Silver opens 3, Gold 4 and Platinum all 7 services", () => {
    expect(PLAN_SERVICES.silver).toHaveLength(2);
    expect(planIncludes("silver", "proforma")).toBe(false);
    expect(planIncludes("gold", "proforma")).toBe(true);
    expect(lowestPlanFor("proforma")).toBe("gold");
    expect(PLAN_SERVICES.gold).toHaveLength(4);
    expect(PLAN_SERVICES.platinum).toEqual(ALL_SERVICES);
    expect(ALL_SERVICES).toHaveLength(8);
  });

  it("keeps payment receipts Platinum-only", () => {
    expect(planIncludes("silver", "receipt")).toBe(false);
    expect(planIncludes("gold", "receipt")).toBe(false);
    expect(planIncludes("platinum", "receipt")).toBe(true);
    expect(lowestPlanFor("receipt")).toBe("platinum");
  });

  it("finds the cheapest plan for each service", () => {
    expect(lowestPlanFor("hotel_voucher")).toBe("silver");
    expect(lowestPlanFor("air_ticket")).toBe("gold");
    expect(lowestPlanFor("welcome_placard")).toBe("platinum");
  });
});

describe("plan and cycle parsing", () => {
  it("only Gold and Platinum are paid", () => {
    expect(isPaidPlan("gold")).toBe(true);
    expect(isPaidPlan("platinum")).toBe(true);
    expect(isPaidPlan("silver")).toBe(false);
    expect(isPaidPlan("diamond")).toBe(false);
  });

  it("falls back to Silver for anything unknown", () => {
    expect(normalizePlan("GOLD")).toBe("gold");
    expect(normalizePlan(undefined)).toBe("silver");
    expect(normalizePlan("hacker")).toBe("silver");
  });

  it("treats a missing cycle as yearly (plans sold before monthly billing)", () => {
    expect(normalizeCycle("monthly")).toBe("monthly");
    expect(normalizeCycle(undefined)).toBe("yearly");
    expect(normalizeCycle("weekly")).toBe("yearly");
  });
});

describe("subscriptionState", () => {
  it("Silver is free with no expiry", () => {
    expect(subscriptionState({ subscriptionPlan: "silver" }, NOW)).toMatchObject({ plan: "silver", status: "free", paidPlan: null });
  });

  it("an active plan counts the days left", () => {
    const s = subscriptionState({ subscriptionPlan: "gold", subscriptionCycle: "monthly", subscriptionExpiresAt: new Date(NOW + 10 * DAY) }, NOW);
    expect(s).toMatchObject({ plan: "gold", status: "active", daysLeft: 10 });
  });

  it("keeps the plan through the grace period after it ends", () => {
    const s = subscriptionState({ subscriptionPlan: "gold", subscriptionCycle: "monthly", subscriptionExpiresAt: new Date(NOW - 1 * DAY) }, NOW);
    expect(s.status).toBe("grace");
    expect(s.plan).toBe("gold"); // still usable
    expect(s.daysLeft).toBe(GRACE_DAYS.monthly - 1);
  });

  it("yearly plans get a longer grace period than monthly ones", () => {
    const ended = { subscriptionPlan: "platinum", subscriptionExpiresAt: new Date(NOW - 3 * DAY) };
    expect(subscriptionState({ ...ended, subscriptionCycle: "monthly" }, NOW).status).toBe("lapsed");
    expect(subscriptionState({ ...ended, subscriptionCycle: "yearly" }, NOW).status).toBe("grace");
  });

  it("drops to Silver once the grace period is over", () => {
    const s = subscriptionState({ subscriptionPlan: "platinum", subscriptionCycle: "yearly", subscriptionExpiresAt: new Date(NOW - 30 * DAY) }, NOW);
    expect(s).toMatchObject({ plan: "silver", paidPlan: "platinum", status: "lapsed" });
  });

  it("a paid plan with no end date never lapses", () => {
    expect(subscriptionState({ subscriptionPlan: "gold" }, NOW)).toMatchObject({ plan: "gold", status: "active", expiresAt: null });
  });
});

describe("documentAccess", () => {
  it("locks services the plan doesn't include and names the plan that does", () => {
    const a = documentAccess("silver", new Date(NOW), "air_ticket", NOW);
    expect(a).toMatchObject({ locked: true, reason: "plan", requiredPlan: "gold" });
    expect(accessLabel(a)).toBe("Gold plan");
  });

  it("paid plans keep every included document open", () => {
    expect(documentAccess("gold", new Date(NOW - 400 * DAY), "invoice", NOW)).toMatchObject({ locked: false, remainingDays: null });
  });

  it(`Silver keeps documents open for ${SILVER_RETENTION_DAYS} days, then closes them`, () => {
    const fresh = documentAccess("silver", new Date(NOW - 5 * DAY), "invoice", NOW);
    expect(fresh).toMatchObject({ locked: false, remainingDays: SILVER_RETENTION_DAYS - 5 });
    expect(accessLabel(fresh)).toBe(`${SILVER_RETENTION_DAYS - 5} days left`);

    const old = documentAccess("silver", new Date(NOW - (SILVER_RETENTION_DAYS + 1) * DAY), "invoice", NOW);
    expect(old).toMatchObject({ locked: true, reason: "history", remainingDays: 0 });
    expect(accessLabel(old)).toBe("Access closed");
  });
});

describe("free allowance month (India time)", () => {
  it("starts on the 1st at midnight IST", () => {
    expect(freePeriodStart(NOW).toISOString()).toBe("2026-09-30T18:30:00.000Z"); // 1 Oct 00:00 IST
    expect(nextFreeReset(NOW).toISOString()).toBe("2026-10-31T18:30:00.000Z"); // 1 Nov 00:00 IST
  });

  it("an evening in UTC that's already the next day in India counts toward the new month", () => {
    const lateUtc = Date.UTC(2026, 9, 31, 19, 0, 0); // 31 Oct 19:00 UTC = 1 Nov 00:30 IST
    expect(freePeriodStart(lateUtc).toISOString()).toBe("2026-10-31T18:30:00.000Z");
  });
});

describe("formatInr", () => {
  it("formats rupees the Indian way, without paise", () => {
    expect(formatInr(1999)).toBe("₹1,999");
    expect(formatInr(150000)).toBe("₹1,50,000");
  });
});
