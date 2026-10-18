import { describe, expect, it } from "vitest";
import { renderDocumentPdf } from "@/lib/pdf/render";
import { watermarkPreview } from "@/lib/pdf/watermark";
import { defaultAirTicket, defaultHotelVoucher, defaultInvoice, defaultItinerary, defaultPickupVoucher } from "@/lib/agent/documents";
import type { Agent, DocumentKind } from "@/lib/agent/types";

const agent = { id: "a", name: "Test Agent", email: "t@example.com", companyName: "Test Travels", state: "Maharashtra", status: "ACTIVE", isVerified: true } as unknown as Agent;

const BASE: [DocumentKind, () => unknown][] = [
  ["hotel_voucher", defaultHotelVoucher],
  ["air_ticket", defaultAirTicket],
  ["pickup_voucher", defaultPickupVoucher],
  ["invoice", () => defaultInvoice("invoice")],
  ["proforma", () => defaultInvoice("proforma")],
  ["receipt", () => defaultInvoice("receipt")],
  ["itinerary", defaultItinerary],
];

const LONG = "Supercalifragilisticexpialidocious".repeat(12);
const STRS = [
  "₹ 1,500 – “quoted” — café 😀 नमस्ते தமிழ் ✓ • … ←\t ",
  LONG,
  "line1\nline2\r\nline3\n\n\n",
  "2026-13-45",
  "2026-",
  "25:99",
  "abc",
  "-5",
  " ",
];
const NUMS = [NaN, -100, 1e12, 0.333333, Infinity];

type Json = unknown;
/** Replace every leaf with `f(leaf, key)`; also grow arrays of objects to many rows. */
function mapLeaves(v: Json, f: (leaf: Json, key: string) => Json, key = ""): Json {
  if (Array.isArray(v)) {
    const items = v.length && typeof v[0] === "object" ? Array.from({ length: 40 }, () => v[0]) : v;
    return items.map((x) => mapLeaves(x, f, key));
  }
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapLeaves(x, f, k)]));
  return f(v, key);
}

const cases: [string, DocumentKind, Json][] = [];
for (const [kind, make] of BASE) {
  cases.push([`${kind} empty object`, kind, {}]);
  for (const s of STRS) cases.push([`${kind} strings=${JSON.stringify(s).slice(0, 20)}`, kind, mapLeaves(make(), (l) => (typeof l === "string" ? s : l))]);
  for (const n of NUMS) cases.push([`${kind} numbers=${n}`, kind, mapLeaves(make(), (l) => (typeof l === "number" ? n : l))]);
  cases.push([`${kind} numbers as strings`, kind, mapLeaves(make(), (l) => (typeof l === "number" ? "12.5" : l))]);
  cases.push([`${kind} nulls`, kind, mapLeaves(make(), () => null)]);
  cases.push([`${kind} empty arrays`, kind, Object.fromEntries(Object.entries(make() as object).map(([k, x]) => [k, Array.isArray(x) ? [] : x]))]);
  cases.push([`${kind} arrays of nulls`, kind, Object.fromEntries(Object.entries(make() as object).map(([k, x]) => [k, Array.isArray(x) ? [null, {}] : x]))]);
}

/** Half-filled, pasted or old saved data must never break a preview or a PDF. */
describe("preview stress", () => {
  it.each(cases)("%s", async (_name, kind, data) => {
    const bytes = await renderDocumentPdf(kind, data as Record<string, unknown>, agent, "silver");
    expect(bytes).not.toBeNull();
    await watermarkPreview(bytes!);
  }, 30_000);
});
