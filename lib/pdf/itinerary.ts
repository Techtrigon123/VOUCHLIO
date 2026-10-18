import type { PDFFont, RGB } from "pdf-lib";
import type { Agent, PlanId } from "@/lib/agent/types";
import {
  itineraryDayDate,
  itineraryDuration,
  itineraryLines,
  itineraryMeals,
  itineraryPrice,
  money,
  type ItineraryData,
  type ItineraryDay,
} from "@/lib/agent/documents";
import {
  agencyName,
  contentWidth,
  createDoc,
  ensure,
  finish,
  fmtDate,
  hr,
  kvGrid,
  letterhead,
  numberedList,
  rect,
  sectionTitle,
  table,
  text,
  textHeight,
  tint,
  wrap,
  GREY,
  INK,
  LINE,
  MARGIN,
  SOFT,
  WHITE,
  type Ctx,
} from "./kit";

/** Day text sits right of the day badge. */
const INDENT = 38;

const weekday = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
const dayLabel = (iso: string) => (iso ? `${weekday(iso)}, ${fmtDate(iso)}` : "");

/** "28 Dec - 31 Dec 2026", or both years when the trip crosses into a new year. */
function dateRange(start: string, end: string) {
  if (!start) return "";
  if (!end || end === start) return fmtDate(start);
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return `${sameYear ? fmtDate(start).replace(/ \d{4}$/, "") : fmtDate(start)} – ${fmtDate(end)}`;
}

/** Wrapped lines at `x`, breaking onto a new page as needed; optional bullet on each item's first line. */
function lines(c: Ctx, value: string, x: number, width: number, opts: { size?: number; font?: PDFFont; color?: RGB; bullet?: RGB } = {}) {
  const size = opts.size ?? 9;
  const font = opts.font ?? c.fonts.regular;
  const pad = opts.bullet ? 10 : 0;
  wrap(value, font, size, width - pad).forEach((line, i) => {
    ensure(c, size + 6);
    if (opts.bullet && i === 0) c.page.drawCircle({ x: x + 2.5, y: c.y + size * 0.32, size: 1.7, color: opts.bullet });
    text(c, line, x + pad, c.y, { size, font, color: opts.color ?? INK });
    c.y -= size + 3;
  });
}

function bulletList(c: Ctx, items: string[], color: RGB, x = MARGIN, width = contentWidth(c)) {
  for (const item of items) lines(c, item, x, width, { size: 9, bullet: color });
  c.y -= 8;
}

/** Tinted cover block: trip name, then destination and duration. */
function cover(c: Ctx, d: ItineraryData, titleFont: PDFFont) {
  const w = contentWidth(c);
  const title = d.title.trim() || "Your trip";
  const titleH = textHeight(c, title, 20, w - 32, titleFont, 3);
  const h = titleH + 46;
  ensure(c, h + 12);
  const top = c.y + 4;
  rect(c, MARGIN, top - h, w, h, tint(c.accent, 0.92));
  rect(c, MARGIN, top - h, 4, h, c.accent);
  const base = top - 30;
  text(c, title, MARGIN + 18, base, { size: 20, font: titleFont, color: c.accent, maxWidth: w - 32 });
  const sub = [d.destination.trim(), itineraryDuration(d.days.length)].filter(Boolean).join("   |   ");
  text(c, sub, MARGIN + 18, base - titleH - 2, { size: 10, font: c.fonts.bold, color: INK, maxWidth: w - 32 });
  c.y = top - h - 14;
}

function guests(d: ItineraryData) {
  const a = Math.max(0, Math.round(d.adults || 0));
  const k = Math.max(0, Math.round(d.children || 0));
  return [a ? `${a} adult${a === 1 ? "" : "s"}` : "", k ? `${k} child${k === 1 ? "" : "ren"}` : ""].filter(Boolean).join(", ");
}

/** Day heading in the template's style. Returns the y where the badge sits (for the timeline line). */
function dayHeading(c: Ctx, d: ItineraryData, day: ItineraryDay, i: number, titleFont: PDFFont): number {
  const date = itineraryDayDate(d.startDate, i);
  const label = `DAY ${i + 1}${date ? `   ${dayLabel(date)}` : ""}`;
  const w = contentWidth(c);
  const title = day.title.trim() || `Day ${i + 1}`;
  ensure(c, 70 + textHeight(c, title, 12.5, w - INDENT, titleFont));

  if (d.template === "modern") {
    rect(c, MARGIN, c.y - 8, w, 20, tint(c.accent, 0.9));
    rect(c, MARGIN, c.y - 8, 54, 20, c.accent);
    text(c, `DAY ${i + 1}`, MARGIN + 27, c.y - 1, { size: 8.5, font: c.fonts.bold, color: WHITE, align: "center" });
    if (date) text(c, dayLabel(date), MARGIN + 64, c.y - 1, { size: 8.5, font: c.fonts.bold, color: INK });
    if (day.city.trim()) text(c, day.city, MARGIN + w - 8, c.y - 1, { size: 8.5, color: GREY, align: "right" });
    c.y -= 28;
    c.y -= text(c, title, MARGIN, c.y, { size: 12.5, font: titleFont, maxWidth: w }) + 2;
    return c.y;
  }

  const cx = MARGIN + 14;
  const badgeY = c.y - 6;
  if (d.template === "elegant") {
    c.page.drawCircle({ x: cx, y: badgeY, size: 13, borderColor: c.accent, borderWidth: 1.2, color: WHITE });
    text(c, String(i + 1), cx, badgeY - 4, { size: 11, font: c.fonts.serifBold, color: c.accent, align: "center" });
  } else {
    c.page.drawCircle({ x: cx, y: badgeY, size: 13, color: c.accent });
    text(c, String(i + 1), cx, badgeY - 4, { size: 11, font: c.fonts.bold, color: WHITE, align: "center" });
  }
  text(c, label, MARGIN + INDENT, c.y + 1, { size: 7.5, font: c.fonts.bold, color: c.accent });
  c.y -= 15;
  c.y -= text(c, title, MARGIN + INDENT, c.y, { size: 12.5, font: titleFont, maxWidth: w - INDENT }) + 2;
  return badgeY;
}

function dayBody(c: Ctx, d: ItineraryData, day: ItineraryDay) {
  const x = d.template === "modern" ? MARGIN : MARGIN + INDENT;
  const width = c.width - MARGIN - x;
  if (day.description.trim()) {
    lines(c, day.description, x, width, { size: 9, color: INK });
    c.y -= 3;
  }
  const acts = itineraryLines(day.activities);
  const facts = [
    day.hotel.trim() ? `Stay: ${day.hotel.trim()}` : day.city.trim() && d.template !== "modern" ? `Overnight: ${day.city.trim()}` : "",
    `Meals: ${itineraryMeals(day.meals)}`,
    day.transfer.trim() ? `Transfer: ${day.transfer.trim()}` : "",
  ].filter(Boolean).join("     |     ");
  const h = textHeight(c, facts, 8, width - 16) + 10;
  if (acts.length) {
    const tail = Math.min(acts.length, 3);
    acts.forEach((a, k) => {
      if (k === acts.length - tail) ensure(c, tail * 13 + h + 12);
      lines(c, a, x, width, { size: 9, bullet: c.accent });
    });
    c.y -= 3;
  }
  ensure(c, h + 6);
  rect(c, x, c.y - h + 10, width, h, SOFT, LINE);
  text(c, facts, x + 8, c.y - 3.5, { size: 8, color: GREY, maxWidth: width - 16 });
  c.y -= h + 2;
}

export async function renderItinerary(d: ItineraryData, agent: Agent, plan: PlanId): Promise<Uint8Array> {
  const days = Array.isArray(d.days) && d.days.length ? d.days : [];
  const data: ItineraryData = { ...d, days, title: d.title ?? "", destination: d.destination ?? "" };
  const template = data.template ?? "journey";
  const c = await createDoc({ agent, plan, accent: data.color || "#0f766e", title: `Itinerary ${data.number} – ${data.title}` });
  c.footer = `Itinerary ${data.number} · Prepared by ${agencyName(agent)}`;
  const serif = template === "elegant";
  const titleFont = serif ? c.fonts.serifBold : c.fonts.bold;
  const headingOpts = serif ? { font: c.fonts.serifBold } : {};

  letterhead(c, {
    docTitle: "TRAVEL ITINERARY",
    docSubtitle: `Ref. ${data.number}`,
    variant: template === "modern" ? "band" : serif ? "serif" : "rule",
  });

  cover(c, data, titleFont);

  const last = itineraryDayDate(data.startDate, Math.max(0, days.length - 1));
  kvGrid(c, [
    ["Prepared for", [data.travellerTitle, data.travellerName].filter(Boolean).join(" ")],
    ["Travellers", guests(data)],
    ["Travel dates", dateRange(data.startDate, last)],
    ["Duration", days.length ? itineraryDuration(days.length) : ""],
  ], 4);

  if (days.length > 1) {
    sectionTitle(c, "Trip at a glance", headingOpts);
    table(
      c,
      [
        { header: "DAY", width: 0.09, align: "center" },
        { header: "DATE", width: 0.2 },
        { header: "PLAN", width: 0.46 },
        { header: "OVERNIGHT", width: 0.25 },
      ],
      days.map((day, i) => {
        const date = itineraryDayDate(data.startDate, i);
        return [String(i + 1), date ? dayLabel(date) : "–", day.title.trim() || `Day ${i + 1}`, day.hotel.trim() || day.city.trim() || "–"];
      }),
      { size: 8 }
    );
  }

  if (days.length) {
    sectionTitle(c, "Day-by-day plan", headingOpts);
    days.forEach((day, i) => {
      const page = c.page;
      const badgeY = dayHeading(c, data, day, i, titleFont);
      dayBody(c, data, day);
      // Journey: dashed line linking this day's badge to the next, when both are on the same page.
      if (template === "journey" && i < days.length - 1 && c.page === page) {
        c.page.drawLine({ start: { x: MARGIN + 14, y: badgeY - 16 }, end: { x: MARGIN + 14, y: c.y - 4 }, thickness: 1.2, color: tint(c.accent, 0.55), dashArray: [3, 3] });
      }
      c.y -= 10;
      if (template !== "journey" && i < days.length - 1) {
        hr(c, c.y + 4);
        c.y -= 8;
      }
    });
  }

  const inc = itineraryLines(data.inclusions ?? "");
  const exc = itineraryLines(data.exclusions ?? "");
  if (inc.length) {
    sectionTitle(c, "What's included", headingOpts);
    bulletList(c, inc, c.accent);
  }
  if (exc.length) {
    sectionTitle(c, "Not included", headingOpts);
    bulletList(c, exc, GREY);
  }

  const price = itineraryPrice(data);
  if (price.show) {
    sectionTitle(c, "Package price", headingOpts);
    const w = contentWidth(c);
    const pax = Math.max(1, Math.round((data.adults || 0) + (data.children || 0)));
    const detail = [
      data.priceMode === "per_person" ? `${money(price.price, data.currency)} per person × ${pax} = ${money(price.total ?? 0, data.currency)}` : "Total for the whole group",
      data.priceNote?.trim() ?? "",
      data.validUntil ? `Valid until ${fmtDate(data.validUntil)}` : "",
    ].filter(Boolean);
    const h = 44 + detail.length * 12;
    ensure(c, h + 8);
    rect(c, MARGIN, c.y - h + 10, w, h, tint(c.accent, 0.94), c.accent, 1);
    text(c, data.priceMode === "per_person" ? "PRICE PER PERSON" : "PACKAGE TOTAL", MARGIN + 12, c.y - 4, { size: 7.5, font: c.fonts.bold, color: GREY });
    text(c, money(data.priceMode === "per_person" ? price.price : price.total ?? 0, data.currency), MARGIN + 12, c.y - 24, { size: 17, font: c.fonts.bold, color: c.accent });
    detail.forEach((line, i) => text(c, line, MARGIN + 12, c.y - 40 - i * 12, { size: 8.5, color: INK, maxWidth: w - 24 }));
    c.y -= h + 8;
  }

  const notes = itineraryLines(data.notes ?? "");
  if (notes.length) {
    sectionTitle(c, "Important notes", headingOpts);
    numberedList(c, notes, 8.5);
  }

  if (data.preparedBy?.trim()) {
    ensure(c, 30);
    c.y -= 6;
    text(c, `Prepared by ${data.preparedBy.trim()}, ${agencyName(agent)}`, MARGIN, c.y, { size: 9, font: c.fonts.italic, color: GREY, maxWidth: contentWidth(c) });
    c.y -= 14;
  }
  return finish(c);
}
