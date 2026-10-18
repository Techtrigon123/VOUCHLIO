import { describe, expect, it } from "vitest";
import { GRACE_DAYS, renewalReminder, subscriptionState } from "@/lib/agent/plans";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-10-16T06:00:00Z");
const ends = (days: number) => new Date(NOW + days * DAY);
const state = (plan: string, expiresInDays: number | null, cycle = "yearly") =>
  subscriptionState({ subscriptionPlan: plan, subscriptionExpiresAt: expiresInDays == null ? null : ends(expiresInDays), subscriptionCycle: cycle }, NOW);

describe("renewal reminders", () => {
  it("says nothing to free agents, plans with no end date, or plans more than 7 days out", () => {
    expect(renewalReminder(state("silver", null))).toBeNull();
    expect(renewalReminder(state("gold", null))).toBeNull();
    expect(renewalReminder(state("gold", 8))).toBeNull();
  });

  it("steps through the 7, 3 and 1 day stages before the plan ends", () => {
    expect(renewalReminder(state("gold", 6.5))).toMatchObject({ stage: "7d", urgent: false, title: "Your Gold plan ends in 7 days" });
    expect(renewalReminder(state("gold", 2.5))).toMatchObject({ stage: "3d", title: "Your Gold plan ends in 3 days" });
    expect(renewalReminder(state("platinum", 0.5))).toMatchObject({ stage: "1d", urgent: true, title: "Your Platinum plan ends tomorrow" });
  });

  it("keeps reminding through the grace period, with a last-day warning", () => {
    // Gold: 2 grace days monthly, 5 yearly. Platinum: 5 monthly, 10 yearly.
    expect(GRACE_DAYS).toEqual({ gold: { monthly: 2, yearly: 5 }, platinum: { monthly: 5, yearly: 10 } });
    const graceStart = renewalReminder(state("gold", -0.5, "yearly"));
    expect(graceStart).toMatchObject({ stage: "grace", urgent: true });
    expect(graceStart?.title).toBe("Your Gold plan has ended — 5 days of grace left");
    expect(renewalReminder(state("gold", -4.5, "yearly"))).toMatchObject({ stage: "grace-last", title: "Last day to renew Gold" });
    expect(renewalReminder(state("gold", -1.5, "monthly"))).toMatchObject({ stage: "grace-last" });
    // Platinum gets longer grace: 10 days yearly, 5 monthly.
    expect(renewalReminder(state("platinum", -0.5, "yearly"))?.title).toBe("Your Platinum plan has ended — 10 days of grace left");
    expect(renewalReminder(state("platinum", -9.5, "yearly"))).toMatchObject({ stage: "grace-last" });
    expect(renewalReminder(state("platinum", -4.5, "monthly"))).toMatchObject({ stage: "grace-last" });
    expect(subscriptionState({ subscriptionPlan: "platinum", subscriptionCycle: "yearly", subscriptionExpiresAt: new Date(Date.now() - 8 * 86_400_000) }).plan).toBe("platinum");
    expect(subscriptionState({ subscriptionPlan: "gold", subscriptionCycle: "yearly", subscriptionExpiresAt: new Date(Date.now() - 8 * 86_400_000) }).plan).toBe("silver");
  });

  it("stops once the grace period is over (the plan has lapsed to Silver)", () => {
    const lapsed = state("gold", -6, "yearly");
    expect(lapsed.status).toBe("lapsed");
    expect(renewalReminder(lapsed)).toBeNull();
  });

  it("links to checkout for the same plan and cycle, and keys each stage once per plan period", () => {
    const r = renewalReminder(state("platinum", 2, "monthly"));
    expect(r?.href).toBe("/dashboard/pricing?plan=platinum&cycle=monthly");
    expect(r?.key).toBe(`renew:${ends(2).toISOString()}:3d`);
    // A renewal moves the end date, so the next period's reminders get new keys.
    expect(renewalReminder(state("platinum", 2.2, "monthly"))?.key).not.toBe(r?.key);
  });
});
