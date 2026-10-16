import type { Agent, DocumentKind, PlanId } from "@/lib/agent/types";
import type { AirTicketData, HotelVoucherData, InvoiceData, ItineraryData, PickupVoucherData } from "@/lib/agent/documents";
import { renderHotelVoucher } from "./hotelVoucher";
import { renderAirTicket } from "./airTicket";
import { renderPickupVoucher } from "./pickupVoucher";
import { renderInvoice } from "./invoice";
import { renderItinerary } from "./itinerary";

/** Server-rendered PDFs. Welcome placards are drawn in the browser (custom fonts). */
export async function renderDocumentPdf(
  kind: DocumentKind,
  data: Record<string, unknown>,
  agent: Agent,
  plan: PlanId,
  extra: { paidAmount?: number } = {}
): Promise<Uint8Array | null> {
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
