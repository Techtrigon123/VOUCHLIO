import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, clearApiCache } from "@/lib/agent/client";

/** A fetch stub that answers every request with { success, data: <call number> }. */
function stubFetch(success = true) {
  let calls = 0;
  const fetchMock = vi.fn(async () => {
    calls += 1;
    return new Response(JSON.stringify(success ? { success: true, data: { n: calls } } : { success: false, error: { message: "no" } }), {
      status: success ? 200 : 401,
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("api() GET cache", () => {
  beforeEach(() => clearApiCache());
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("reuses a recent GET and shares one request between concurrent callers", async () => {
    const fetchMock = stubFetch();
    const [a, b] = await Promise.all([api<{ n: number }>("/api/x"), api<{ n: number }>("/api/x")]);
    const c = await api<{ n: number }>("/api/x");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect([a.data?.n, b.data?.n, c.data?.n]).toEqual([1, 1, 1]);
  });

  it("gives each caller its own copy, so one caller's edits can't leak into another's", async () => {
    stubFetch();
    const first = await api<{ n: number }>("/api/x");
    first.data!.n = 99;
    expect((await api<{ n: number }>("/api/x")).data?.n).toBe(1);
  });

  it("refetches after the TTL, with fresh: true, and after any write", async () => {
    vi.useFakeTimers();
    const fetchMock = stubFetch();
    await api("/api/x");
    vi.advanceTimersByTime(31_000);
    await api("/api/x");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await api("/api/x", { fresh: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await api("/api/y", { method: "POST", json: {} });
    await api("/api/x");
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("never reuses a failed response", async () => {
    const fetchMock = stubFetch(false);
    await api("/api/x");
    await api("/api/x");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
