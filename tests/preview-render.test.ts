import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { renderDocumentPdf } from "@/lib/pdf/render";
import { watermarkPreview } from "@/lib/pdf/watermark";
import { defaultAirTicket, defaultHotelVoucher, defaultInvoice, defaultItinerary, defaultPickupVoucher } from "@/lib/agent/documents";
import type { Agent, DocumentKind } from "@/lib/agent/types";

const agent = { id: "a", name: "Test Agent", email: "t@example.com", companyName: "Test Travels", state: "Maharashtra", status: "ACTIVE", isVerified: true } as unknown as Agent;

/** The live preview starts from an empty form, so every template must draw its defaults. */
const BLANK: [DocumentKind, unknown][] = [
  ["hotel_voucher", defaultHotelVoucher()],
  ["air_ticket", defaultAirTicket()],
  ["pickup_voucher", defaultPickupVoucher()],
  ["invoice", defaultInvoice("invoice")],
  ["proforma", defaultInvoice("proforma")],
  ["receipt", defaultInvoice("receipt")],
  ["itinerary", defaultItinerary()],
];

describe("live preview rendering", () => {
  it.each(BLANK)("renders a blank %s form and stamps it", async (kind, data) => {
    const bytes = await renderDocumentPdf(kind, data as Record<string, unknown>, agent, "platinum");
    expect(bytes).not.toBeNull();
    const out = await PDFDocument.load(await watermarkPreview(bytes!));
    expect(out.getPageCount()).toBeGreaterThan(0);
  });

  it("renders a half-filled hotel voucher (check-in set, no check-out)", async () => {
    const data = { ...defaultHotelVoucher(), hotelName: "Sea View", checkIn: "2026-11-02", checkOut: "" };
    const bytes = await renderDocumentPdf("hotel_voucher", data as unknown as Record<string, unknown>, agent, "silver");
    expect(bytes?.length).toBeGreaterThan(0);
  });
});
