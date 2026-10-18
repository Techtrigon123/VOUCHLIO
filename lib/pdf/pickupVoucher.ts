import type { Agent, PlanId } from "@/lib/agent/types";
import type { PickupVoucherData } from "@/lib/agent/documents";
import {
  createDoc,
  letterhead,
  sectionTitle,
  kvGrid,
  paragraph,
  finish,
  text,
  rect,
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
  type Ctx,
} from "./kit";

function pickupPoint(d: PickupVoucherData) {
  const kind = d.pickupFrom === "Other" ? d.pickupFromOther || "Other" : d.pickupFrom;
  if (d.pickupFrom === "Airport") return [kind, d.airline, d.flightNumber].filter(Boolean).join(" · ");
  if (d.pickupFrom === "Railway Station")
    return [d.stationName || kind, d.trainName, d.trainNumber].filter(Boolean).join(" · ");
  return kind;
}

const vehicle = (d: PickupVoucherData) =>
  [d.vehicleType === "Other" ? d.vehicleOther : d.vehicleType, d.vehicleNumber].filter(Boolean).join("  |  ");

/** Numbered stops: pickup → drop. */
function timeline(c: Ctx, d: PickupVoucherData, numbered: boolean) {
  const stops: [string, string, string][] = [
    ["PICKUP", pickupPoint(d), [d.pickupLocation, d.pickupAddress].filter(Boolean).join(", ")],
    ["DROP", d.stayCity || d.city, d.stayAddress || "As instructed by the guest"],
  ];
  const w = contentWidth(c);
  stops.forEach(([label, title, body], i) => {
    const h = textHeight(c, body, 8.5, w - 70) + 32;
    ensure(c, h + 6);
    const cx = MARGIN + 14;
    c.page.drawCircle({ x: cx, y: c.y - 8, size: numbered ? 10 : 6, color: c.accent });
    if (numbered) text(c, String(i + 1), cx, c.y - 11.5, { size: 9, font: c.fonts.bold, color: WHITE, align: "center" });
    if (i === 0)
      c.page.drawLine({ start: { x: cx, y: c.y - 20 }, end: { x: cx, y: c.y - h - 2 }, thickness: 1.5, color: tint(c.accent, 0.5), dashArray: [3, 3] });
    text(c, label, MARGIN + 36, c.y - 2, { size: 7, color: GREY });
    text(c, title, MARGIN + 36, c.y - 14, { size: 11, font: c.fonts.bold, maxWidth: w - 70 });
    text(c, body, MARGIN + 36, c.y - 28, { size: 8.5, color: GREY, maxWidth: w - 70 });
    c.y -= h + 4;
  });
  c.y -= 4;
}

export async function renderPickupVoucher(d: PickupVoucherData, agent: Agent, plan: PlanId): Promise<Uint8Array> {
  const layout = d.layout ?? "journey";
  const accent = layout === "boarding" ? "#0f172a" : layout === "document" ? "#7c2d12" : "#3b7d0c";
  const c = await createDoc({ agent, plan, accent, title: `Pickup voucher ${d.voucherNumber}` });
  c.footer = `Pickup voucher ${d.voucherNumber} · Show this voucher to the driver.`;
  const guest = [d.guestTitle, d.guestName].filter(Boolean).join(" ");
  const driver = [d.driverTitle, d.driverName].filter(Boolean).join(" ");
  const schedule = `${fmtDate(d.pickupDate)}  ${fmtTime(d.pickupTime)}`;

  letterhead(c, {
    docTitle: "PICKUP VOUCHER",
    docSubtitle: `Voucher No. ${d.voucherNumber}`,
    variant: layout === "document" ? "serif" : layout === "boarding" ? "band" : "rule",
  });

  if (layout === "boarding") {
    // Ticket stub with the essentials.
    const w = contentWidth(c);
    const h = 86;
    ensure(c, h + 10);
    rect(c, MARGIN, c.y - h + 10, w, h, tint(c.accent, 0.95), LINE);
    const cols: [string, string, number][] = [
      ["GUEST", guest, 0.32],
      ["PAX", String(d.pax), 0.1],
      ["PICKUP", schedule, 0.34],
      ["CITY", d.city, 0.24],
    ];
    let cx = MARGIN + 14;
    for (const [k, v, share] of cols) {
      const cw = (w - 28) * share;
      text(c, k, cx, c.y - 6, { size: 7, color: GREY });
      text(c, v, cx, c.y - 24, { size: k === "GUEST" ? 13 : 12, font: c.fonts.bold, maxWidth: cw - 12 });
      cx += cw;
    }
    c.page.drawLine({ start: { x: MARGIN + 10, y: c.y - 52 }, end: { x: MARGIN + w - 10, y: c.y - 52 }, thickness: 0.8, color: GREY, dashArray: [4, 3] });
    text(c, `Driver: ${driver}  |  ${d.driverMobile}${d.altMobile ? ` / ${d.altMobile}` : ""}  |  ${vehicle(d)}`, MARGIN + 14, c.y - 68, { size: 9, maxWidth: w - 28 });
    c.y -= h + 10;
    sectionTitle(c, "Journey");
    timeline(c, d, true);
  } else {
    sectionTitle(c, "Guest details", { font: layout === "document" ? c.fonts.serifBold : undefined });
    kvGrid(c, [
      ["Guest name", guest],
      ["No. of pax", String(d.pax)],
      ["Pickup date & time", schedule],
    ]);
    sectionTitle(c, "Pickup & schedule", { font: layout === "document" ? c.fonts.serifBold : undefined });
    timeline(c, d, false);
    sectionTitle(c, "Driver & vehicle", { font: layout === "document" ? c.fonts.serifBold : undefined });
    kvGrid(c, [
      ["Driver / pickup person", driver],
      ["Driver mobile", d.driverMobile],
      ["Alternative mobile", d.altMobile],
      ["Vehicle", vehicle(d)],
    ], 2);
  }

  if (d.instructions?.trim()) {
    sectionTitle(c, "Note for guest", { font: layout === "document" ? c.fonts.serifBold : undefined });
    paragraph(c, d.instructions, { size: 9, font: layout === "document" ? c.fonts.serif : undefined });
  }
  return finish(c);
}
