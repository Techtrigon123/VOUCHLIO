import { describe, expect, it } from "vitest";
import { inflateSync } from "node:zlib";
import { renderDocumentPdf } from "@/lib/pdf/render";
import { COPYRIGHT, FREE_PLAN_CREDIT } from "@/lib/pdf/kit";
import { defaultAirTicket, defaultHotelVoucher, defaultInvoice, defaultItinerary, defaultPickupVoucher } from "@/lib/agent/documents";
import type { Agent, DocumentKind, PlanId } from "@/lib/agent/types";

const agent = { id: "a", name: "Test Agent", email: "t@example.com", companyName: "Test Travels", state: "Maharashtra" } as unknown as Agent;

/** Every page content stream, unpacked. Standard-font text is written as hex strings. */
function pageText(pdf: Uint8Array): string {
  const raw = Buffer.from(pdf);
  const out: string[] = [];
  let at = 0;
  for (;;) {
    const start = raw.indexOf("stream", at, "latin1");
    if (start < 0) break;
    const body = start + (raw[start + 6] === 0x0d ? 8 : 7);
    const end = raw.indexOf("endstream", body, "latin1");
    if (end < 0) break;
    try {
      out.push(inflateSync(raw.subarray(body, end)).toString("latin1"));
    } catch {
      out.push(raw.subarray(body, end).toString("latin1"));
    }
    at = end + 9;
  }
  return out.join("\n");
}

const hasText = (pdf: Uint8Array, text: string) => {
  const content = pageText(pdf);
  // Standard fonts use WinAnsi, so © is one byte (latin1), not UTF-8.
  return content.includes(Buffer.from(text, "latin1").toString("hex").toUpperCase()) || content.includes(`(${text})`);
};

const DOCS: [DocumentKind, unknown][] = [
  ["hotel_voucher", defaultHotelVoucher()],
  ["air_ticket", defaultAirTicket()],
  ["pickup_voucher", defaultPickupVoucher()],
  ["invoice", defaultInvoice("invoice")],
  ["itinerary", defaultItinerary()],
];

const render = async (kind: DocumentKind, data: unknown, plan: PlanId) => (await renderDocumentPdf(kind, data as Record<string, unknown>, agent, plan))!;

describe("PDF branding by plan", () => {
  it.each(DOCS)("free (Silver) %s carries the Powered by Vouchlio watermark and footer", async (kind, data) => {
    expect(hasText(await render(kind, data, "silver"), FREE_PLAN_CREDIT)).toBe(true);
  });

  it.each(DOCS)("paid %s has no Powered by Vouchlio watermark or credit", async (kind, data) => {
    for (const plan of ["gold", "platinum"] as const) {
      const pdf = await render(kind, data, plan);
      expect(hasText(pdf, FREE_PLAN_CREDIT)).toBe(false);
      expect(hasText(pdf, "Powered by")).toBe(false);
    }
  });

  it.each(DOCS)("every plan prints the copyright line on %s", async (kind, data) => {
    for (const plan of ["silver", "gold", "platinum"] as const) expect(hasText(await render(kind, data, plan), COPYRIGHT)).toBe(true);
  });

  it("still prints the page number on paid plans", async () => {
    expect(hasText(await render("hotel_voucher", defaultHotelVoucher(), "gold"), "Page 1 of 1")).toBe(true);
  });
});
