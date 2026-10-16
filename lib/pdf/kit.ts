import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  StandardFonts,
  degrees,
  rgb,
  type RGB,
} from "pdf-lib";
import type { Agent, PlanId } from "@/lib/agent/types";

/** A4 in points. */
export const A4: [number, number] = [595.28, 841.89];
export const A4_LANDSCAPE: [number, number] = [841.89, 595.28];
export const MARGIN = 40;

export const GREY = rgb(0.39, 0.45, 0.55);
export const INK = rgb(0.06, 0.09, 0.16);
export const LINE = rgb(0.88, 0.9, 0.93);
export const SOFT = rgb(0.97, 0.98, 0.99);
export const WHITE = rgb(1, 1, 1);

export function hexToRgb(hex: string, fallback = "#3b7d0c"): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex?.trim() ?? "") ?? /^#?([0-9a-f]{6})$/i.exec(fallback)!;
  const n = parseInt(m[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Pale tint of a colour for section backgrounds. */
export function tint(c: RGB, amount = 0.9): RGB {
  return rgb(c.red + (1 - c.red) * amount, c.green + (1 - c.green) * amount, c.blue + (1 - c.blue) * amount);
}

/**
 * Standard PDF fonts only cover WinAnsi. Swap common symbols and drop anything
 * else so a stray emoji or ₹ never breaks generation.
 */
export function clean(text: unknown): string {
  return String(text ?? "")
    .replace(/₹/g, "INR ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/→/g, "->")
    .replace(/…/g, "...")
    .replace(/·/g, "-")
    .replace(/\t/g, " ")
    .replace(/[^\x20-\x7E\n -ÿ]/g, "");
}

export interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  serif: PDFFont;
  serifBold: PDFFont;
  mono: PDFFont;
}

export interface Ctx {
  pdf: PDFDocument;
  page: PDFPage;
  fonts: Fonts;
  accent: RGB;
  y: number;
  /** Content area right edge + margin; may be narrowed for column layouts. */
  width: number;
  height: number;
  /** Physical page size — never changes after creation. */
  pageSize: [number, number];
  logo: PDFImage | null;
  stamp: PDFImage | null;
  agent: Agent;
  plan: PlanId;
  /** Footer drawn on every page. */
  footer: string;
}

async function embedDataUrl(pdf: PDFDocument, url?: string): Promise<PDFImage | null> {
  if (!url) return null;
  const m = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(url);
  if (!m) return null;
  try {
    const bytes = Buffer.from(m[2], "base64");
    return m[1].toLowerCase() === "png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  } catch {
    return null;
  }
}

export async function createDoc(opts: {
  agent: Agent;
  plan: PlanId;
  accent?: string;
  title: string;
  landscape?: boolean;
  withLogo?: boolean;
}): Promise<Ctx> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(clean(opts.title));
  pdf.setProducer("Vouchlio");
  pdf.setCreator(clean(opts.agent.brandName || opts.agent.companyName || "Vouchlio"));
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
    serif: await pdf.embedFont(StandardFonts.TimesRoman),
    serifBold: await pdf.embedFont(StandardFonts.TimesRomanBold),
    mono: await pdf.embedFont(StandardFonts.CourierBold),
  };
  const [w, h] = opts.landscape ? A4_LANDSCAPE : A4;
  const page = pdf.addPage([w, h]);
  const ctx: Ctx = {
    pdf,
    page,
    fonts,
    accent: hexToRgb(opts.accent ?? "#3b7d0c"),
    y: h - MARGIN,
    width: w,
    height: h,
    pageSize: [w, h],
    logo: opts.withLogo === false ? null : await embedDataUrl(pdf, opts.agent.brandLogo),
    stamp: await embedDataUrl(pdf, opts.agent.companyStamp),
    agent: opts.agent,
    plan: opts.plan,
    footer: "",
  };
  return ctx;
}

export const contentWidth = (c: Ctx) => c.width - MARGIN * 2;

export function addPage(c: Ctx) {
  c.page = c.pdf.addPage(c.pageSize);
  c.y = c.height - MARGIN;
}

/** Start a new page if fewer than `needed` points remain above the footer. */
export function ensure(c: Ctx, needed: number) {
  if (c.y - needed < MARGIN + 30) addPage(c);
}

export function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of clean(text).split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push("");
      continue;
    }
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        line = next;
        continue;
      }
      if (line) out.push(line);
      // Hard-break words longer than the column.
      let word = w;
      while (font.widthOfTextAtSize(word, size) > maxWidth && word.length > 1) {
        let cut = word.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(word.slice(0, cut), size) > maxWidth) cut--;
        out.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      line = word;
    }
    out.push(line);
  }
  return out;
}

export function text(
  c: Ctx,
  value: unknown,
  x: number,
  y: number,
  opts: { size?: number; font?: PDFFont; color?: RGB; maxWidth?: number; align?: "left" | "right" | "center"; lineGap?: number } = {}
): number {
  const size = opts.size ?? 10;
  const font = opts.font ?? c.fonts.regular;
  const lines = opts.maxWidth ? wrap(String(value ?? ""), font, size, opts.maxWidth) : [clean(value)];
  let cy = y;
  for (const line of lines) {
    let dx = x;
    if (opts.align === "right") dx = x - font.widthOfTextAtSize(line, size);
    if (opts.align === "center") dx = x - font.widthOfTextAtSize(line, size) / 2;
    c.page.drawText(line, { x: dx, y: cy, size, font, color: opts.color ?? INK });
    cy -= size + (opts.lineGap ?? 3);
  }
  return y - cy; // height consumed
}

export function textHeight(c: Ctx, value: unknown, size: number, maxWidth: number, font?: PDFFont, lineGap = 3) {
  return wrap(String(value ?? ""), font ?? c.fonts.regular, size, maxWidth).length * (size + lineGap);
}

export function rect(c: Ctx, x: number, y: number, w: number, h: number, color: RGB, border?: RGB, borderWidth = 0.75) {
  c.page.drawRectangle({ x, y, width: w, height: h, color, borderColor: border, borderWidth: border ? borderWidth : 0 });
}

export function hr(c: Ctx, y = c.y, color = LINE, x1 = MARGIN, x2 = c.width - MARGIN, thickness = 0.75) {
  c.page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color });
}

export function drawImageFit(c: Ctx, img: PDFImage, x: number, y: number, maxW: number, maxH: number, align: "left" | "right" | "center" = "left") {
  const scale = Math.min(maxW / img.width, maxH / img.height, 1);
  const w = img.width * scale;
  const h = img.height * scale;
  const dx = align === "right" ? x + maxW - w : align === "center" ? x + (maxW - w) / 2 : x;
  c.page.drawImage(img, { x: dx, y: y + (maxH - h) / 2, width: w, height: h });
  return { w, h };
}

export function agencyName(a: Agent) {
  return a.brandName?.trim() || a.companyName?.trim() || "Your Agency";
}

export function agencyContact(a: Agent): string[] {
  const addr = [a.address, a.city, a.state, a.pincode].map((v) => v?.trim()).filter(Boolean).join(", ");
  const contact = [a.mobile ? `+91 ${a.mobile}` : "", a.landlineNumber ?? "", a.email].filter(Boolean).join("  |  ");
  const tax = [a.gstNumber ? `GSTIN: ${a.gstNumber}` : "", a.iataNumber ? `IATA: ${a.iataNumber}` : ""].filter(Boolean).join("  |  ");
  return [addr, contact, tax].filter(Boolean);
}

/**
 * Agency letterhead: logo + agency name/contact on the left, document title on the right.
 * `variant` changes the treatment per template.
 */
export function letterhead(
  c: Ctx,
  opts: { docTitle: string; docSubtitle?: string; variant?: "band" | "plain" | "rule" | "serif" }
) {
  const variant = opts.variant ?? "plain";
  const top = c.y;
  const bandH = 86;
  const onBand = variant === "band";
  if (onBand) rect(c, 0, c.height - bandH - 10, c.width, bandH + 10, c.accent);
  const nameColor = onBand ? WHITE : INK;
  const subColor = onBand ? tint(c.accent, 0.75) : GREY;
  const titleFont = variant === "serif" ? c.fonts.serifBold : c.fonts.bold;

  let x = MARGIN;
  if (c.logo) {
    if (onBand) rect(c, MARGIN - 4, top - 58, 76, 62, WHITE);
    drawImageFit(c, c.logo, MARGIN, top - 54, 68, 54);
    x = MARGIN + 82;
  }
  const rightColW = 190;
  const leftW = c.width - MARGIN - rightColW - x - 10;
  text(c, agencyName(c.agent), x, top - 14, { size: 15, font: titleFont, color: nameColor, maxWidth: leftW });
  let ly = top - 30;
  for (const line of agencyContact(c.agent)) {
    ly -= text(c, line, x, ly, { size: 7.5, color: subColor, maxWidth: leftW, lineGap: 2 });
  }

  const rx = c.width - MARGIN;
  text(c, opts.docTitle, rx, top - 16, { size: 16, font: titleFont, color: onBand ? WHITE : c.accent, align: "right" });
  if (opts.docSubtitle) text(c, opts.docSubtitle, rx, top - 32, { size: 8.5, color: subColor, align: "right" });

  c.y = Math.min(ly, top - 60) - 14;
  if (variant === "rule") {
    rect(c, MARGIN, c.y + 4, contentWidth(c), 3, c.accent);
    c.y -= 12;
  } else if (variant === "serif") {
    hr(c, c.y + 6, c.accent, MARGIN, c.width - MARGIN, 1.2);
    hr(c, c.y + 3, c.accent, MARGIN, c.width - MARGIN, 0.4);
    c.y -= 12;
  } else if (!onBand) {
    hr(c, c.y + 4);
    c.y -= 10;
  } else {
    c.y = Math.min(c.y, c.height - bandH - 30);
  }
}

export function sectionTitle(c: Ctx, title: string, opts: { font?: PDFFont; color?: RGB } = {}) {
  ensure(c, 40);
  rect(c, MARGIN, c.y - 4, 3, 13, c.accent);
  text(c, title.toUpperCase(), MARGIN + 9, c.y, { size: 9, font: opts.font ?? c.fonts.bold, color: opts.color ?? INK });
  c.y -= 18;
}

/** Grid of label / value cells, `cols` per row. Empty values are skipped. */
export function kvGrid(c: Ctx, items: [string, unknown][], cols = 3, opts: { boxed?: boolean; valueSize?: number } = {}) {
  const rows = items.filter(([, v]) => String(v ?? "").trim() !== "");
  if (!rows.length) return;
  const w = contentWidth(c);
  const colW = w / cols;
  const valueSize = opts.valueSize ?? 9.5;
  for (let i = 0; i < rows.length; i += cols) {
    const slice = rows.slice(i, i + cols);
    const h = Math.max(...slice.map(([, v]) => textHeight(c, v, valueSize, colW - 16, c.fonts.bold))) + 16;
    ensure(c, h + 6);
    if (opts.boxed !== false) rect(c, MARGIN, c.y - h + 8, w, h, SOFT, LINE);
    slice.forEach(([label, value], j) => {
      const x = MARGIN + j * colW + 8;
      text(c, label.toUpperCase(), x, c.y - 2, { size: 6.5, color: GREY });
      text(c, value, x, c.y - 13, { size: valueSize, font: c.fonts.bold, maxWidth: colW - 16 });
    });
    c.y -= h + 4;
  }
  c.y -= 4;
}

export interface Column {
  header: string;
  width: number; // fraction of content width
  align?: "left" | "right" | "center";
}

export function table(c: Ctx, columns: Column[], rows: string[][], opts: { headerColor?: RGB; zebra?: boolean; size?: number } = {}) {
  const w = contentWidth(c);
  const size = opts.size ?? 8.5;
  const widths = columns.map((col) => col.width * w);
  const drawHeader = () => {
    ensure(c, 40);
    rect(c, MARGIN, c.y - 6, w, 18, opts.headerColor ?? c.accent);
    let x = MARGIN;
    columns.forEach((col, i) => {
      const tx = col.align === "right" ? x + widths[i] - 6 : col.align === "center" ? x + widths[i] / 2 : x + 6;
      text(c, col.header, tx, c.y, { size: 7.5, font: c.fonts.bold, color: WHITE, align: col.align });
      x += widths[i];
    });
    c.y -= 20;
  };
  drawHeader();
  rows.forEach((row, ri) => {
    const h = Math.max(...row.map((v, i) => textHeight(c, v, size, widths[i] - 12))) + 8;
    if (c.y - h < MARGIN + 30) {
      addPage(c);
      drawHeader();
    }
    if (opts.zebra !== false && ri % 2 === 1) rect(c, MARGIN, c.y - h + 10, w, h, SOFT);
    let x = MARGIN;
    row.forEach((v, i) => {
      const col = columns[i];
      const tx = col.align === "right" ? x + widths[i] - 6 : col.align === "center" ? x + widths[i] / 2 : x + 6;
      text(c, v, tx, c.y, { size, maxWidth: col.align ? undefined : widths[i] - 12, align: col.align });
      x += widths[i];
    });
    c.y -= h;
    hr(c, c.y + 8);
  });
  c.y -= 6;
}

export function paragraph(c: Ctx, value: string, opts: { size?: number; color?: RGB; font?: PDFFont } = {}) {
  const size = opts.size ?? 8.5;
  for (const line of wrap(value, opts.font ?? c.fonts.regular, size, contentWidth(c))) {
    ensure(c, size + 6);
    text(c, line, MARGIN, c.y, { size, color: opts.color ?? INK, font: opts.font });
    c.y -= size + 3;
  }
  c.y -= 4;
}

export function numberedList(c: Ctx, lines: string[], size = 8) {
  lines.forEach((l, i) => {
    const h = textHeight(c, l, size, contentWidth(c) - 16);
    ensure(c, h + 4);
    text(c, `${i + 1}.`, MARGIN, c.y, { size, color: GREY });
    c.y -= text(c, l, MARGIN + 14, c.y, { size, maxWidth: contentWidth(c) - 16 }) + 1;
  });
  c.y -= 4;
}

/** Credit on free (Silver) documents: the diagonal watermark and the footer line. */
export const FREE_PLAN_CREDIT = "Powered by Vouchlio";
const BRAND_RED = rgb(0.9, 0.22, 0.27);

/**
 * Footer on every page, plus the free-plan branding. Call last.
 * Silver: a light diagonal "Powered by Vouchlio" watermark and the same credit in the footer.
 * Gold and Platinum: clean pages — no watermark and no Vouchlio credit.
 */
export async function finish(c: Ctx): Promise<Uint8Array> {
  const pages = c.pdf.getPages();
  const free = c.plan === "silver";
  const mark = FREE_PLAN_CREDIT;
  const size7 = (s: string, font = c.fonts.regular) => font.widthOfTextAtSize(s, 7);
  pages.forEach((p, i) => {
    const { width, height } = p.getSize();
    if (free) {
      const size = 34;
      const tw = c.fonts.bold.widthOfTextAtSize(mark, size);
      for (let k = -1; k <= 1; k++) {
        p.drawText(mark, {
          x: width / 2 - (tw / 2) * 0.7 + k * 30,
          y: height / 2 - (tw / 2) * 0.7 + k * 230,
          size,
          font: c.fonts.bold,
          color: rgb(0.6, 0.62, 0.66),
          opacity: 0.12,
          rotate: degrees(35),
        });
      }
    }
    p.drawLine({ start: { x: MARGIN, y: 32 }, end: { x: width - MARGIN, y: 32 }, thickness: 0.5, color: LINE });

    // Right: "Powered by Vouchlio  |  Page 1 of 2" on Silver, just the page number on paid plans.
    const pn = `Page ${i + 1} of ${pages.length}`;
    let rx = width - MARGIN - size7(pn);
    p.drawText(pn, { x: rx, y: 20, size: 7, font: c.fonts.regular, color: GREY });
    if (free) {
      const sep = "  |  ";
      rx -= size7(sep);
      p.drawText(sep, { x: rx, y: 20, size: 7, font: c.fonts.regular, color: GREY });
      rx -= size7(FREE_PLAN_CREDIT, c.fonts.bold);
      p.drawText(FREE_PLAN_CREDIT, { x: rx, y: 20, size: 7, font: c.fonts.bold, color: BRAND_RED });
    }

    // Left: the document's own footer, shortened so it never runs into the right-hand text.
    let footer = clean(c.footer || agencyName(c.agent));
    const room = rx - MARGIN - 16;
    if (size7(footer) > room) {
      while (footer.length > 1 && size7(`${footer}...`) > room) footer = footer.slice(0, -1);
      footer = `${footer.trimEnd()}...`;
    }
    p.drawText(footer, { x: MARGIN, y: 20, size: 7, font: c.fonts.regular, color: GREY });
  });
  return c.pdf.save();
}

export function fmtDate(v?: string, withTime = false): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  if (!withTime) return date;
  return `${date}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export function fmtTime(v?: string): string {
  if (!v) return "";
  const [h, m] = v.split(":").map(Number);
  if (!Number.isFinite(h)) return v;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
}

/** Code 39 barcode (letters, digits, a few symbols). */
export function barcode39(c: Ctx, value: string, x: number, y: number, h = 28, unit = 0.9) {
  const P: Record<string, string> = {
    "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw", "5": "wnnwwnnnn",
    "6": "nnwwwnnnn", "7": "nnnwnnwnw", "8": "wnnwnnwnn", "9": "nnwwnnwnn", A: "wnnnnwnnw", B: "nnwnnwnnw",
    C: "wnwnnwnnn", D: "nnnnwwnnw", E: "wnnnwwnnn", F: "nnwnwwnnn", G: "nnnnnwwnw", H: "wnnnnwwnn",
    I: "nnwnnwwnn", J: "nnnnwwwnn", K: "wnnnnnnww", L: "nnwnnnnww", M: "wnwnnnnwn", N: "nnnnwnnww",
    O: "wnnnwnnwn", P: "nnwnwnnwn", Q: "nnnnnnwww", R: "wnnnnnwwn", S: "nnwnnnwwn", T: "nnnnwnwwn",
    U: "wwnnnnnnw", V: "nwwnnnnnw", W: "wwwnnnnnn", X: "nwnnwnnnw", Y: "wwnnwnnnn", Z: "nwwnwnnnn",
    "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn", "*": "nwnnwnwnn",
  };
  const data = `*${value.toUpperCase().replace(/[^0-9A-Z. -]/g, "")}*`;
  let cx = x;
  for (const ch of data) {
    const pat = P[ch];
    if (!pat) continue;
    for (let i = 0; i < 9; i++) {
      const w = (pat[i] === "w" ? 2.5 : 1) * unit;
      if (i % 2 === 0) c.page.drawRectangle({ x: cx, y, width: w, height: h, color: INK });
      cx += w;
    }
    cx += unit;
  }
  return cx - x;
}
