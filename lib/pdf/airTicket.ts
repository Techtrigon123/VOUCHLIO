import type { Agent, PlanId } from "@/lib/agent/types";
import { type AirTicketData, ticketTotal, flightDuration, money, num } from "@/lib/agent/documents";
import {
  createDoc,
  letterhead,
  sectionTitle,
  kvGrid,
  table,
  paragraph,
  finish,
  text,
  rect,
  tint,
  fmtDate,
  contentWidth,
  ensure,
  barcode39,
  MARGIN,
  GREY,
  WHITE,
  LINE,
  type Ctx,
} from "./kit";

const STATUS: Record<string, string> = { CONFIRMED: "Confirmed", CANCELLED: "Cancelled", PENDING: "Pending" };

function time(v: string) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function paxName(p: AirTicketData["passengers"][number]) {
  return `${p.lastName.toUpperCase()}/${p.firstName.toUpperCase()}${p.title ? ` ${p.title.toUpperCase()}` : ""}`;
}

function airline(g: AirTicketData["segments"][number]) {
  return `${g.airlineName || g.airlineCode} (${g.airlineCode.toUpperCase()})`;
}

function segmentCard(c: Ctx, g: AirTicketData["segments"][number], i: number) {
  const w = contentWidth(c);
  const h = 78;
  ensure(c, h + 10);
  rect(c, MARGIN, c.y - h + 10, w, h, WHITE, LINE);
  rect(c, MARGIN, c.y - h + 10, 4, h, c.accent);
  text(c, `FLIGHT ${i + 1}  ·  ${airline(g)}  ·  ${g.flightNumber.toUpperCase()}`, MARGIN + 14, c.y - 4, { size: 8.5, font: c.fonts.bold, color: c.accent });
  text(c, `${g.travelClass}${g.bookingClass ? ` (${g.bookingClass.toUpperCase()})` : ""}`, c.width - MARGIN - 10, c.y - 4, { size: 8, color: GREY, align: "right" });

  const colW = (w - 28) / 3;
  const x0 = MARGIN + 14;
  text(c, g.from.toUpperCase(), x0, c.y - 30, { size: 22, font: c.fonts.bold });
  text(c, `${time(g.departure)}  ${fmtDate(g.departure)}`, x0, c.y - 44, { size: 8.5 });
  if (g.depTerminal) text(c, `Terminal ${g.depTerminal}`, x0, c.y - 56, { size: 7.5, color: GREY });

  const mid = x0 + colW * 1.5;
  const dur = flightDuration(g.departure, g.arrival);
  c.page.drawLine({ start: { x: mid - colW / 2 + 10, y: c.y - 24 }, end: { x: mid + colW / 2 - 10, y: c.y - 24 }, thickness: 1, color: tint(c.accent, 0.4), dashArray: [3, 3] });
  text(c, dur ?? "", mid, c.y - 38, { size: 8, color: GREY, align: "center" });
  text(c, "Non-stop", mid, c.y - 50, { size: 7, color: GREY, align: "center" });

  const xr = MARGIN + w - 14;
  text(c, g.to.toUpperCase(), xr, c.y - 30, { size: 22, font: c.fonts.bold, align: "right" });
  text(c, `${time(g.arrival)}  ${fmtDate(g.arrival)}`, xr, c.y - 44, { size: 8.5, align: "right" });
  if (g.arrTerminal) text(c, `Terminal ${g.arrTerminal}`, xr, c.y - 56, { size: 7.5, color: GREY, align: "right" });
  c.y -= h + 6;
}

function fare(c: Ctx, d: AirTicketData) {
  if (d.fareMode === "hide") return;
  ensure(c, 130); // keep the fare block on one page
  sectionTitle(c, "Fare");
  const rows: [string, number, boolean?][] =
    d.fareMode === "breakdown"
      ? [
          ["Base fare", num(d.baseFare)],
          ["Taxes", num(d.taxes)],
          ["GST", num(d.gst)],
          ["Convenience fee", num(d.convenienceFee)],
          ["Discount", -num(d.discount)],
        ]
      : [];
  const w = 230;
  // The total's tinted box reaches 8pt past the figures; keep it inside the right margin.
  const x = c.width - MARGIN - w - 8;
  for (const [k, v] of rows) {
    if (!v) continue;
    ensure(c, 16);
    text(c, k, x, c.y, { size: 9, color: GREY });
    text(c, v < 0 ? `– ${money(-v, d.currency)}` : money(v, d.currency), x + w, c.y, { size: 9, align: "right" });
    c.y -= 14;
  }
  ensure(c, 32);
  c.y -= 6;
  rect(c, x - 8, c.y - 8, w + 16, 22, tint(c.accent, 0.88));
  text(c, "Grand total", x, c.y, { size: 10, font: c.fonts.bold });
  text(c, money(ticketTotal(d), d.currency), x + w, c.y, { size: 11, font: c.fonts.bold, color: c.accent, align: "right" });
  c.y -= 28;
}

const NOTES =
  "Carry a valid government photo ID. Report at the check-in counter at least 2 hours before departure for domestic and 3 hours for international flights. Web check-in opens as per airline policy. Baggage allowance and fare rules are subject to airline terms.";

export async function renderAirTicket(d: AirTicketData, agent: Agent, plan: PlanId): Promise<Uint8Array> {
  const c = await createDoc({ agent, plan, title: `E-ticket ${d.airlinePnr}`, accent: d.layout === "confirmation" ? "#0f766e" : "#3b7d0c" });
  c.footer = `Airline e-ticket · Airline PNR ${d.airlinePnr.toUpperCase()}${d.crsPnr ? ` · CRS PNR ${d.crsPnr.toUpperCase()}` : ""}`;
  // The agency header honours the ticket's GST / IATA switches.
  c.agent = {
    ...agent,
    gstNumber: d.showGst ? d.agencyGstin || agent.gstNumber : undefined,
    iataNumber: d.showIata ? d.agencyIata || agent.iataNumber : undefined,
  };

  const title = d.layout === "itinerary" ? "ITINERARY RECEIPT" : d.layout === "confirmation" ? "BOOKING CONFIRMATION" : "E-TICKET";
  letterhead(c, {
    docTitle: title,
    docSubtitle: `Status: ${STATUS[d.status] ?? d.status}`,
    variant: d.layout === "confirmation" ? "band" : "rule",
  });

  // PNR strip with optional barcode.
  const w = contentWidth(c);
  ensure(c, 60);
  rect(c, MARGIN, c.y - 40, w, 50, tint(c.accent, 0.92), tint(c.accent, 0.6));
  text(c, "AIRLINE PNR", MARGIN + 12, c.y - 2, { size: 7, color: GREY });
  text(c, d.airlinePnr.toUpperCase(), MARGIN + 12, c.y - 22, { size: 18, font: c.fonts.mono, color: c.accent });
  if (d.crsPnr) {
    text(c, "CRS PNR", MARGIN + 150, c.y - 2, { size: 7, color: GREY });
    text(c, d.crsPnr.toUpperCase(), MARGIN + 150, c.y - 22, { size: 14, font: c.fonts.mono });
  }
  if (d.showBarcode) barcode39(c, d.airlinePnr, c.width - MARGIN - 150, c.y - 34, 30, 0.85);
  c.y -= 58;

  sectionTitle(c, "Flights");
  d.segments.forEach((g, i) => segmentCard(c, g, i));

  sectionTitle(c, "Passengers");
  if (d.layout === "itinerary") {
    for (const p of d.passengers) {
      kvGrid(c, [
        ["Passenger", paxName(p)],
        ["Type", p.type],
        ["E-ticket no.", p.ticketNumber || "Ticket number pending"],
        ["Seat", p.seat],
        ["Meal", p.meal],
        ["Cabin baggage", p.cabinBaggage],
        ["Checked baggage", p.checkedBaggage],
        ["Frequent flyer", p.frequentFlyer],
        ["Special service", p.specialService],
      ], 3);
    }
  } else {
    table(
      c,
      [
        { header: "Passenger", width: 0.3 },
        { header: "Type", width: 0.1 },
        { header: "E-ticket number", width: 0.24 },
        { header: "Seat", width: 0.08 },
        { header: "Baggage (cabin / checked)", width: 0.28 },
      ],
      d.passengers.map((p) => [
        paxName(p),
        p.type,
        p.ticketNumber || "Pending",
        p.seat || "–",
        [p.cabinBaggage, p.checkedBaggage].filter(Boolean).join(" / ") || "–",
      ])
    );
  }

  fare(c, d);
  sectionTitle(c, "Important information");
  paragraph(c, d.notes?.trim() ? `${d.notes}\n\n${NOTES}` : NOTES, { size: 8, color: GREY });
  return finish(c);
}
