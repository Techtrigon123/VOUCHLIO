import { afterEach, describe, expect, it, vi } from "vitest";

// These modules import the Supabase client; nothing here talks to the database.
vi.mock("@/lib/db/supabase", () => ({ db: () => ({}) }));

const { findRules, clientIp, retryMessage, accountKey } = await import("@/lib/rate-limit");
const { likePattern } = await import("@/lib/db/repo");

const ids = (path: string, method: string) => findRules(path, method).map((r) => r.id);

describe("rate-limit rules", () => {
  it("limits each auth route, per IP, in the database", () => {
    const [rule] = findRules("/api/auth/login", "POST");
    expect(rule).toMatchObject({ id: "auth:login", limit: 5, store: "db", scope: "ip" });
  });

  it("adds the daily signup ceiling on top of the burst limit", () => {
    expect(ids("/api/auth/signup", "POST")).toEqual(["auth:signup", "day:signup:ip"]);
  });

  it("gives online payments their own limits", () => {
    expect(ids("/api/agent/plan/razorpay/order", "POST")).toEqual(["plan:rzp", "day:plan:rzp-order"]);
    expect(ids("/api/agent/plan/razorpay/verify", "POST")).toEqual(["plan:rzp", "day:plan:rzp-verify"]);
  });

  it("lets Razorpay webhooks through a generous IP-only flood guard", () => {
    const [rule] = findRules("/api/webhooks/razorpay", "POST");
    expect(rule).toMatchObject({ id: "webhooks", scope: "ip", limit: 600 });
  });

  it("falls back to the general API limit", () => {
    expect(ids("/api/agent/profile", "GET")).toEqual(["api"]);
  });

  it("never limits CORS preflight requests", () => {
    expect(findRules("/api/auth/login", "OPTIONS")).toEqual([]);
  });

  it("explains how long to wait", () => {
    expect(retryMessage(30)).toBe("Too many attempts. Please wait 30 seconds and try again.");
    expect(retryMessage(600)).toBe("Too many attempts. Please wait 10 minutes and try again.");
  });

  it("keys per-account limits by the normalised email", () => {
    expect(accountKey("  Agent@Example.COM ")).toBe("email:agent@example.com");
  });
});

describe("clientIp", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the right-most X-Forwarded-For entry (the one our proxy added), not the client's", () => {
    const h = new Headers({ "x-forwarded-for": "1.1.1.1, 9.9.9.9" });
    expect(clientIp(h)).toBe("9.9.9.9");
  });

  it("prefers the hosting platform's own header", () => {
    const h = new Headers({ "x-real-ip": "5.5.5.5", "x-forwarded-for": "1.1.1.1" });
    expect(clientIp(h)).toBe("5.5.5.5");
  });

  it("on Vercel, ignores headers a client could forge", () => {
    vi.stubEnv("VERCEL", "1");
    const h = new Headers({ "cf-connecting-ip": "6.6.6.6", "x-vercel-forwarded-for": "7.7.7.7" });
    expect(clientIp(h)).toBe("7.7.7.7");
  });

  it("returns 'unknown' with no headers", () => {
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("likePattern (search filters)", () => {
  it("wraps the search in wildcards", () => {
    expect(likePattern("goa")).toBe("%goa%");
  });

  it("strips characters that could change the filter", () => {
    const p = likePattern('a,agent_id.neq.x),or(id.not.is.null"\\*');
    expect(p).not.toMatch(/[,()"*]/);
  });

  it("escapes LIKE wildcards so they match literally", () => {
    expect(likePattern("50%_off")).toBe("%50\\%\\_off%");
  });
});
