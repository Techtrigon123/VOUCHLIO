import type { Agent, DocumentKind, PlanId } from "@/lib/agent/types";
import {
  defaultAirTicket,
  defaultHotelVoucher,
  defaultInvoice,
  defaultItinerary,
  defaultPickupVoucher,
  type AirTicketData,
  type HotelVoucherData,
  type InvoiceData,
  type ItineraryData,
  type PickupVoucherData,
} from "@/lib/agent/documents";
import { renderHotelVoucher } from "./hotelVoucher";
import { renderAirTicket } from "./airTicket";
import { renderPickupVoucher } from "./pickupVoucher";
import { renderInvoice } from "./invoice";
import { renderItinerary } from "./itinerary";

/**
 * Give `value` the shape of `shape` so a template never meets a missing field, a null or an empty
 * list row (half-filled previews, pasted text, documents saved by older versions).
 * Gaps get empty values — "", false, no rows — never the form's starter text, so a saved
 * document prints only what was saved. Numbers fall back to the default; extra keys are kept.
 */
export function conform(shape: unknown, value: unknown): unknown {
  if (Array.isArray(shape)) {
    if (!Array.isArray(value)) return [];
    const row: unknown = shape[0];
    const rowIsObject = row !== null && typeof row === "object";
    return value
      .filter((x) => x !== null && x !== undefined && (!rowIsObject || (typeof x === "object" && !Array.isArray(x))))
      .map((x) => (shape.length ? conform(row, x) : x));
  }
  if (shape !== null && typeof shape === "object") {
    const src = value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    const out: Record<string, unknown> = { ...src };
    for (const [k, v] of Object.entries(shape)) out[k] = conform(v, src[k]);
    return out;
  }
  if (typeof shape === "string") return typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? String(value) : "";
  if (typeof shape === "number") return typeof value === "number" || typeof value === "string" ? value : shape;
  if (typeof shape === "boolean") return typeof value === "boolean" ? value : false;
  return value;
}

const SHAPES: Partial<Record<DocumentKind, () => unknown>> = {
  hotel_voucher: defaultHotelVoucher,
  air_ticket: defaultAirTicket,
  pickup_voucher: defaultPickupVoucher,
  itinerary: defaultItinerary,
  invoice: () => defaultInvoice("invoice"),
  proforma: () => defaultInvoice("proforma"),
  receipt: () => defaultInvoice("receipt"),
};

/** Server-rendered PDFs. Welcome placards are drawn in the browser (custom fonts). */
export async function renderDocumentPdf(
  kind: DocumentKind,
  raw: Record<string, unknown>,
  agent: Agent,
  plan: PlanId,
  extra: { paidAmount?: number } = {}
): Promise<Uint8Array | null> {
  const shape = SHAPES[kind];
  const data = (shape ? conform(shape(), raw) : raw) as Record<string, unknown>;
  switch (kind) {
    case "hotel_voucher":
      return renderHotelVoucher(data as unknown as HotelVoucherData, agent, plan);
    case "air_ticket":
      return renderAirTicket(data as unknown as AirTicketData, agent, plan);
    case "pickup_voucher":
      return renderPickupVoucher(data as unknown as PickupVoucherData, agent, plan);
    case "itinerary":
      return renderItinerary(data as unknown as ItineraryData, agent, plan);
    case "invoice":
    case "proforma":
    case "receipt":
      return renderInvoice({ ...(data as unknown as InvoiceData), docType: kind }, agent, plan, extra);
    default:
      return null;
  }
}

export function pdfFileName(kind: DocumentKind, number: string | undefined, title: string): string {
  const base: Record<DocumentKind, string> = {
    hotel_voucher: "Hotel_Voucher",
    air_ticket: "E_Ticket",
    pickup_voucher: "Pickup_Voucher",
    welcome_placard: "Welcome_Placard",
    invoice: "Invoice",
    proforma: "Proforma_Invoice",
    receipt: "Receipt",
    itinerary: "Itinerary",
  };
  const tag = (number || title).replace(/[^a-zA-Z0-9-_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
  return `${base[kind]}_${tag || "document"}.pdf`;
}
