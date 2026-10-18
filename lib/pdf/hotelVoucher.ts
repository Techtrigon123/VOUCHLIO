import type { Agent, PlanId } from "@/lib/agent/types";
import {
  type HotelVoucherData,
  resolvedRooms,
  voucherFare,
  nights,
  money,
} from "@/lib/agent/documents";
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
  hr,
  tint,
  fmtDate,
  fmtTime,
  contentWidth,
  ensure,
  textHeight,
  MARGIN,
  GREY,
  WHITE,
  LINE,
  SOFT,
  type Ctx,
} from "./kit";

function guestName(d: HotelVoucherData) {
  return [d.guestTitle, d.guestFirstName, d.guestLastName].filter(Boolean).join(" ");
}

function occupancy(r: { adults: number; children: number; childAges: (number | "")[] }) {
  const kids = r.children > 0 ? ` + ${r.children} child${r.children > 1 ? "ren" : ""} (${r.childAges.slice(0, r.children).join(", ")} yrs)` : "";
  return `${r.adults} adult${r.adults === 1 ? "" : "s"}${kids}`;
}

function stayStrip(c: Ctx, d: HotelVoucherData) {
  const w = contentWidth(c);
  const h = 54;
  ensure(c, h + 10);
  rect(c, MARGIN, c.y - h + 10, w, h, tint(c.accent, 0.9), tint(c.accent, 0.6));
  const cells: [string, string, string][] = [
    ["CHECK-IN", fmtDate(d.checkIn), d.checkInTime ? `from ${fmtTime(d.checkInTime)}` : ""],
    ["NIGHTS", String(nights(d.checkIn, d.checkOut)), `${d.rooms.length} room${d.rooms.length === 1 ? "" : "s"}`],
    ["CHECK-OUT", fmtDate(d.checkOut), d.checkOutTime ? `until ${fmtTime(d.checkOutTime)}` : ""],
  ];
  cells.forEach(([label, value, sub], i) => {
    const cx = MARGIN + (w / 3) * i + w / 6;
    text(c, label, cx, c.y - 2, { size: 7, color: GREY, align: "center" });
    text(c, value, cx, c.y - 18, { size: 13, font: c.fonts.bold, color: c.accent, align: "center" });
    text(c, sub, cx, c.y - 32, { size: 7.5, color: GREY, align: "center" });
  });
  c.y -= h + 8;
}

function roomsTable(c: Ctx, d: HotelVoucherData) {
  const rooms = resolvedRooms(d);
  table(
    c,
    [
      { header: "#", width: 0.05 },
      { header: "Room", width: 0.3 },
      { header: "Stay", width: 0.25 },
      { header: "Guests", width: 0.22 },
      { header: "Meal plan", width: 0.18 },
    ],
    rooms.map((r, i) => [
      String(i + 1),
      r.roomName + (r.extraBed ? `\nExtra bed: ${r.extraBed}` : ""),
      `${fmtDate(r.checkIn)} – ${fmtDate(r.checkOut)}`,
      occupancy(r),
      r.mealPlan,
    ])
  );
}

function roomCards(c: Ctx, d: HotelVoucherData) {
  const rooms = resolvedRooms(d);
  const w = contentWidth(c);
  const cardW = (w - 10) / 2;
  for (let i = 0; i < rooms.length; i += 2) {
    ensure(c, 80);
    [rooms[i], rooms[i + 1]].forEach((r, j) => {
      if (!r) return;
      const x = MARGIN + j * (cardW + 10);
      rect(c, x, c.y - 62, cardW, 72, WHITE, tint(c.accent, 0.55));
      rect(c, x, c.y + 6, cardW, 4, c.accent);
      text(c, `ROOM ${i + j + 1}`, x + 10, c.y - 6, { size: 7, color: c.accent, font: c.fonts.bold });
      text(c, r.roomName, x + 10, c.y - 19, { size: 10.5, font: c.fonts.bold, maxWidth: cardW - 20 });
      text(c, `${fmtDate(r.checkIn)} – ${fmtDate(r.checkOut)}`, x + 10, c.y - 34, { size: 8, color: GREY });
      text(c, occupancy(r), x + 10, c.y - 45, { size: 8, color: GREY, maxWidth: cardW - 20 });
      text(c, `Meal: ${r.mealPlan}${r.extraBed ? `  |  Extra bed: ${r.extraBed}` : ""}`, x + 10, c.y - 56, { size: 8, maxWidth: cardW - 20 });
    });
    c.y -= 84;
  }
}

function fareBlock(c: Ctx, d: HotelVoucherData) {
  if (d.fareMode === "hide") return;
  const f = voucherFare(d);
  ensure(c, 110); // keep the fare block on one page
  sectionTitle(c, "Fare");
  const rows: [string, string][] = [];
  if (d.fareMode === "breakdown") {
    rows.push(["Base fare", money(f.base, d.currency)], ["Taxes", money(f.taxes, d.currency)]);
    if (f.markup) rows.push(["Service charges", money(f.markup, d.currency)]);
  } else if (f.markup) {
    rows.push(["Fare", money(f.total - f.markup, d.currency)], ["Service charges", money(f.markup, d.currency)]);
  }
  const w = 230;
  // The total's tinted box reaches 8pt past the figures; keep it inside the right margin.
  const x = c.width - MARGIN - w - 8;
  for (const [k, v] of rows) {
    ensure(c, 16);
    text(c, k, x, c.y, { size: 9, color: GREY });
    text(c, v, x + w, c.y, { size: 9, align: "right" });
    c.y -= 14;
  }
  ensure(c, 32);
  c.y -= 6;
  rect(c, x - 8, c.y - 8, w + 16, 22, tint(c.accent, 0.88));
  text(c, `Total (${d.paymentStatus})`, x, c.y, { size: 10, font: c.fonts.bold });
  text(c, money(f.total, d.currency), x + w, c.y, { size: 11, font: c.fonts.bold, color: c.accent, align: "right" });
  c.y -= 28;
}

function policies(c: Ctx, d: HotelVoucherData) {
  const blocks: [string, string][] = [
    ["Cancellation policy", d.cancellationPolicy],
    ["Child policy", d.childPolicy],
    ["Payment terms", d.paymentTerms],
    ["Liability", d.liabilityNotes],
  ].filter(([, v]) => v?.trim()) as [string, string][];
  if (!blocks.length) return;
  sectionTitle(c, "Terms & policies");
  for (const [title, body] of blocks) {
    ensure(c, 30);
    text(c, title, MARGIN, c.y, { size: 8.5, font: c.fonts.bold });
    c.y -= 12;
    paragraph(c, body, { size: 8, color: GREY });
  }
}

function hotelBlock(c: Ctx, d: HotelVoucherData, big = false) {
  ensure(c, 60);
  text(c, d.hotelName, MARGIN, c.y, { size: big ? 18 : 13, font: c.fonts.bold, maxWidth: contentWidth(c) });
  c.y -= big ? 22 : 16;
  const addr = [d.hotelAddress, d.city].filter(Boolean).join(", ");
  if (addr) c.y -= text(c, addr, MARGIN, c.y, { size: 8.5, color: GREY, maxWidth: contentWidth(c) });
  const contact = [d.hotelPhone && `Phone: ${d.hotelPhone}`, d.hotelEmail && `Email: ${d.hotelEmail}`].filter(Boolean).join("   |   ");
  if (contact) c.y -= text(c, contact, MARGIN, c.y, { size: 8.5, color: GREY });
  c.y -= 8;
}

function preparedBy(c: Ctx, d: HotelVoucherData) {
  if (!d.preparedBy?.trim()) return;
  ensure(c, 30);
  c.y -= 6;
  text(c, `Prepared by ${d.preparedBy}`, MARGIN, c.y, { size: 8.5, color: GREY });
  c.y -= 14;
}

export async function renderHotelVoucher(d: HotelVoucherData, agent: Agent, plan: PlanId): Promise<Uint8Array> {
  const template = d.template ?? "classic";
  const c = await createDoc({
    agent,
    plan,
    accent: d.color,
    title: `Hotel voucher ${d.hcn}`,
    withLogo: !d.withoutLogo,
  });
  c.footer = `Hotel booking voucher ${d.hcn} · Please present this voucher at check-in.`;
  const subtitle = `HCN ${d.hcn}  |  Ref ${d.bookingRef}`;

  if (template === "bold") {
    // Right sidebar with the booking summary; main column with hotel + rooms.
    letterhead(c, { docTitle: "HOTEL VOUCHER", docSubtitle: subtitle, variant: "plain" });
    const sideW = 170;
    const top = c.y;
    const mainW = contentWidth(c) - sideW - 16;
    rect(c, c.width - MARGIN - sideW, MARGIN + 40, sideW, top - MARGIN - 30, c.accent);
    const sx = c.width - MARGIN - sideW + 14;
    let sy = top - 14;
    const side: [string, string][] = [
      ["LEAD GUEST", guestName(d)],
      ["HCN / VOUCHER NO.", d.hcn],
      ["BOOKING REF", d.bookingRef],
      ["CHECK-IN", `${fmtDate(d.checkIn)} ${fmtTime(d.checkInTime)}`],
      ["CHECK-OUT", `${fmtDate(d.checkOut)} ${fmtTime(d.checkOutTime)}`],
      ["NIGHTS", String(nights(d.checkIn, d.checkOut))],
      ["ROOMS", String(d.rooms.length)],
      ["STATUS", d.paymentStatus],
    ];
    if (d.fareMode !== "hide") side.push(["TOTAL", money(voucherFare(d).total, d.currency)]);
    for (const [k, v] of side) {
      text(c, k, sx, sy, { size: 6.5, color: tint(c.accent, 0.7) });
      sy -= 12;
      sy -= text(c, v, sx, sy, { size: 10, font: c.fonts.bold, color: WHITE, maxWidth: sideW - 28 }) + 6;
    }
    // Main column: temporarily narrow the page.
    const fullW = c.width;
    c.width = fullW - sideW - 16;
    hotelBlock(c, d, true);
    sectionTitle(c, "Rooms");
    roomCardsNarrow(c, d, mainW);
    if (d.specialRequests) {
      sectionTitle(c, "Special requests");
      paragraph(c, d.specialRequests, { size: 8.5 });
    }
    // Fare, terms and signature stay in the main column beside the sidebar.
    fareBlock(c, d);
    policies(c, d);
    preparedBy(c, d);
    c.width = fullW;
    return finish(c);
  }

  if (template === "light") {
    letterhead(c, { docTitle: "HOTEL VOUCHER", docSubtitle: subtitle, variant: "band" });
    hotelBlock(c, d, true);
    stayStrip(c, d);
    kvGrid(c, [
      ["Lead guest", guestName(d)],
      ["HCN / voucher no.", d.hcn],
      ["Booking reference", d.bookingRef],
    ]);
    sectionTitle(c, "Rooms");
    roomCards(c, d);
  } else if (template === "corporate") {
    letterhead(c, { docTitle: "HOTEL VOUCHER", docSubtitle: subtitle, variant: "rule" });
    kvGrid(c, [
      ["Lead guest", guestName(d)],
      ["HCN / voucher no.", d.hcn],
      ["Booking reference", d.bookingRef],
      ["Payment status", d.paymentStatus],
    ], 4);
    sectionTitle(c, "Property");
    hotelBlock(c, d);
    sectionTitle(c, "Stay summary");
    stayStrip(c, d);
    roomsTable(c, d);
  } else {
    letterhead(c, { docTitle: "HOTEL VOUCHER", docSubtitle: subtitle });
    sectionTitle(c, "Booking details");
    kvGrid(c, [
      ["HCN / voucher no.", d.hcn],
      ["Booking reference", d.bookingRef],
      ["Status", d.paymentStatus],
      ["Lead guest", guestName(d)],
      ["Check-in", `${fmtDate(d.checkIn)} ${fmtTime(d.checkInTime)}`],
      ["Check-out", `${fmtDate(d.checkOut)} ${fmtTime(d.checkOutTime)}`],
    ]);
    sectionTitle(c, "Hotel");
    hotelBlock(c, d);
    const n = nights(d.checkIn, d.checkOut);
    sectionTitle(c, n ? `Rooms (${d.rooms.length}) · ${n} night${n === 1 ? "" : "s"}` : `Rooms (${d.rooms.length})`);
    roomsTable(c, d);
  }

  if (d.specialRequests) {
    sectionTitle(c, "Special requests");
    paragraph(c, d.specialRequests, { size: 8.5 });
  }
  fareBlock(c, d);
  policies(c, d);
  preparedBy(c, d);
  return finish(c);
}

function roomCardsNarrow(c: Ctx, d: HotelVoucherData, width: number) {
  for (const [i, r] of resolvedRooms(d).entries()) {
    const body = `${fmtDate(r.checkIn)} – ${fmtDate(r.checkOut)}\n${occupancy(r)}\nMeal: ${r.mealPlan}${r.extraBed ? `\nExtra bed: ${r.extraBed}` : ""}`;
    const h = textHeight(c, body, 8, width - 20) + 30;
    ensure(c, h + 8);
    rect(c, MARGIN, c.y - h + 10, width, h, SOFT, LINE);
    text(c, `ROOM ${i + 1}  ·  ${r.roomName}`, MARGIN + 10, c.y - 2, { size: 9.5, font: c.fonts.bold, maxWidth: width - 20 });
    text(c, body, MARGIN + 10, c.y - 16, { size: 8, color: GREY, maxWidth: width - 20 });
    c.y -= h + 6;
  }
  hr(c, c.y + 4, LINE, MARGIN, MARGIN + width);
  c.y -= 6;
}
