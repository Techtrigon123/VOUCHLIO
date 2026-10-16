"use client";

import { PDFDocument } from "pdf-lib";
import type { Agent } from "./types";
import { PLACARD_FONTS, PLACARD_THEMES, type PlacardCustom, type PlacardData, type PlacardTheme } from "./documents";

/** A4 at 150 dpi. */
const LANDSCAPE = { w: 1754, h: 1240 };
const PORTRAIT = { w: 1240, h: 1754 };

interface ThemeStyle extends Required<Omit<PlacardCustom, "backgroundImage">> {
  accent: string;
  guestFontCss: string;
  welcomeFontCss: string;
  agencyFontCss: string;
  gradient?: [string, string];
}

const font = (id: string) => PLACARD_FONTS.find((f) => f.id === id)?.css ?? "";

const THEMES: Record<PlacardTheme, ThemeStyle> = {
  minimal: {
    background: "#ffffff", border: "#e2e8f0", guestColor: "#0f172a", welcomeColor: "#3b7d0c", agencyColor: "#334155",
    guestFont: "montserrat", welcomeFont: "montserrat", agencyFont: "inter", spacing: "normal", frame: "thin", accent: "#3b7d0c",
    guestFontCss: "", welcomeFontCss: "", agencyFontCss: "",
  },
  corporate: {
    background: "#eff4ff", border: "#1e3a8a", guestColor: "#1e3a8a", welcomeColor: "#334155", agencyColor: "#1e3a8a",
    guestFont: "montserrat", welcomeFont: "plex", agencyFont: "plex", spacing: "normal", frame: "double", accent: "#1e3a8a",
    guestFontCss: "", welcomeFontCss: "", agencyFontCss: "",
  },
  digital: {
    background: "#0f766e", border: "#fb923c", guestColor: "#ffffff", welcomeColor: "#fed7aa", agencyColor: "#ccfbf1",
    guestFont: "quicksand", welcomeFont: "quicksand", agencyFont: "quicksand", spacing: "normal", frame: "none", accent: "#fb923c",
    guestFontCss: "", welcomeFontCss: "", agencyFontCss: "", gradient: ["#115e59", "#14b8a6"],
  },
  airport: {
    background: "#ffffff", border: "#3b7d0c", guestColor: "#0f172a", welcomeColor: "#3b7d0c", agencyColor: "#ffffff",
    guestFont: "bebas", welcomeFont: "montserrat", agencyFont: "montserrat", spacing: "normal", frame: "thin", accent: "#3b7d0c",
    guestFontCss: "", welcomeFontCss: "", agencyFontCss: "",
  },
  classic: {
    background: "#fdf6e3", border: "#1e3a8a", guestColor: "#1e3a8a", welcomeColor: "#b8860b", agencyColor: "#1e3a8a",
    guestFont: "playfair", welcomeFont: "cormorant", agencyFont: "cormorant", spacing: "relaxed", frame: "ornate", accent: "#b8860b",
    guestFontCss: "", welcomeFontCss: "", agencyFontCss: "",
  },
  journey: {
    background: "#fffaf5", border: "#f97316", guestColor: "#7c2d12", welcomeColor: "#f97316", agencyColor: "#431407",
    guestFont: "greatvibes", welcomeFont: "montserrat", agencyFont: "montserrat", spacing: "normal", frame: "none", accent: "#f97316",
    guestFontCss: "", welcomeFontCss: "", agencyFontCss: "",
  },
};

export function resolveStyle(d: PlacardData): ThemeStyle & { backgroundImage: string } {
  const base = THEMES[d.theme] ?? THEMES.minimal;
  const c = d.custom ?? {};
  const pick = <K extends keyof PlacardCustom>(k: K) => ((c[k] as string | undefined) || (base as unknown as Record<string, string>)[k]) as string;
  const guestFont = pick("guestFont");
  const welcomeFont = pick("welcomeFont");
  const agencyFont = pick("agencyFont");
  return {
    ...base,
    background: pick("background"),
    border: pick("border"),
    guestColor: pick("guestColor"),
    welcomeColor: pick("welcomeColor"),
    agencyColor: pick("agencyColor"),
    guestFont,
    welcomeFont,
    agencyFont,
    spacing: (c.spacing || base.spacing) as ThemeStyle["spacing"],
    frame: (c.frame || base.frame) as ThemeStyle["frame"],
    gradient: c.background ? undefined : base.gradient,
    guestFontCss: font(guestFont) || "Montserrat, Arial, sans-serif",
    welcomeFontCss: font(welcomeFont) || "Montserrat, Arial, sans-serif",
    agencyFontCss: font(agencyFont) || "Inter, Arial, sans-serif",
    backgroundImage: c.backgroundImage ?? "",
  };
}

export const isLandscape = (theme: PlacardTheme) => PLACARD_THEMES.find((t) => t.id === theme)?.landscape ?? false;

function loadImage(src: string, cors = false): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function ensureFonts(s: ThemeStyle) {
  if (typeof document === "undefined" || !document.fonts) return;
  const families = [s.guestFontCss, s.welcomeFontCss, s.agencyFontCss];
  await Promise.all(families.map((f) => document.fonts.load(`700 60px ${f}`).catch(() => undefined)));
}

/** Largest font size (≤ max) at which `text` fits in `width`. */
function fit(ctx: CanvasRenderingContext2D, text: string, family: string, weight: string, max: number, width: number) {
  let size = max;
  for (; size > 18; size -= 4) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= width) break;
  }
  ctx.font = `${weight} ${size}px ${family}`;
  return size;
}

function frame(ctx: CanvasRenderingContext2D, w: number, h: number, s: ThemeStyle) {
  ctx.strokeStyle = s.border;
  if (s.frame === "thin") {
    ctx.lineWidth = 6;
    ctx.strokeRect(36, 36, w - 72, h - 72);
  } else if (s.frame === "double") {
    ctx.lineWidth = 10;
    ctx.strokeRect(34, 34, w - 68, h - 68);
    ctx.lineWidth = 3;
    ctx.strokeRect(62, 62, w - 124, h - 124);
  } else if (s.frame === "ornate") {
    ctx.lineWidth = 14;
    ctx.strokeRect(30, 30, w - 60, h - 60);
    ctx.strokeStyle = s.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(62, 62, w - 124, h - 124);
    ctx.fillStyle = s.accent;
    for (const [x, y] of [[62, 62], [w - 62, 62], [62, h - 62], [w - 62, h - 62]]) {
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 40, y);
      ctx.lineTo(x + 40, y);
      ctx.moveTo(x, y - 40);
      ctx.lineTo(x, y + 40);
      ctx.stroke();
    }
  }
}

function ornamentLine(ctx: CanvasRenderingContext2D, cx: number, y: number, width: number, color: string) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - width / 2, y);
  ctx.lineTo(cx - 20, y);
  ctx.moveTo(cx + 20, y);
  ctx.lineTo(cx + width / 2, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, y - 12);
  ctx.lineTo(cx + 12, y);
  ctx.lineTo(cx, y + 12);
  ctx.lineTo(cx - 12, y);
  ctx.closePath();
  ctx.fill();
}

export async function drawPlacard(canvas: HTMLCanvasElement, d: PlacardData, agent: Agent) {
  const s = resolveStyle(d);
  const dims = isLandscape(d.theme) ? LANDSCAPE : PORTRAIT;
  canvas.width = dims.w;
  canvas.height = dims.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { w, h } = dims;
  const gap = s.spacing === "compact" ? 0.8 : s.spacing === "relaxed" ? 1.25 : 1;
  await ensureFonts(s);
  const [logo, bg] = await Promise.all([loadImage(agent.brandLogo ?? ""), loadImage(s.backgroundImage, true)]);

  // Background
  if (s.gradient) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, s.gradient[0]);
    g.addColorStop(1, s.gradient[1]);
    ctx.fillStyle = g;
  } else ctx.fillStyle = s.background;
  ctx.fillRect(0, 0, w, h);
  if (bg) {
    const scale = Math.max(w / bg.width, h / bg.height);
    ctx.globalAlpha = 0.22;
    ctx.drawImage(bg, (w - bg.width * scale) / 2, (h - bg.height * scale) / 2, bg.width * scale, bg.height * scale);
    ctx.globalAlpha = 1;
  }

  const agency = agent.brandName?.trim() || agent.companyName?.trim() || "Your Agency";
  const guest = [d.guestSalutation.trim(), d.guestName.trim().toUpperCase()].filter(Boolean).join(" ") || "GUEST NAME";
  const place = d.place.trim() || "Your destination";
  const welcome = d.welcomeTitle.trim() || "Welcome";
  const logoScale = Math.max(0.5, Math.min(1.8, (d.logoSize || 100) / 100));
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const cx = w / 2;

  const drawLogo = (x: number, y: number, maxW: number, maxH: number, align: "center" | "left" = "center") => {
    if (!logo) return 0;
    const sc = Math.min((maxW * logoScale) / logo.width, (maxH * logoScale) / logo.height);
    const lw = logo.width * sc;
    const lh = logo.height * sc;
    ctx.drawImage(logo, align === "center" ? x - lw / 2 : x, y, lw, lh);
    return lh;
  };

  if (d.theme === "airport") {
    // Agency band → destination → huge guest name.
    const band = 230;
    ctx.fillStyle = s.accent;
    ctx.fillRect(0, 0, w, band);
    let tx = 90;
    if (logo) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(70, 40, 300 * Math.min(logoScale, 1.2), 150);
      drawLogo(85, 50, 270 * Math.min(logoScale, 1.2) / logoScale, 130, "left");
      tx = 70 + 300 * Math.min(logoScale, 1.2) + 40;
    }
    ctx.textAlign = "left";
    ctx.fillStyle = s.agencyColor;
    fit(ctx, agency.toUpperCase(), s.agencyFontCss, "800", 84, w - tx - 90);
    ctx.fillText(agency.toUpperCase(), tx, 130);
    if (d.tagline.trim()) {
      ctx.font = `500 38px ${s.agencyFontCss}`;
      ctx.globalAlpha = 0.9;
      ctx.fillText(d.tagline.trim(), tx, 185);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = "center";
    ctx.fillStyle = s.welcomeColor;
    fit(ctx, `${welcome.toUpperCase()} TO ${place.toUpperCase()}`, s.welcomeFontCss, "700", 70, w - 200);
    ctx.fillText(`${welcome.toUpperCase()} TO ${place.toUpperCase()}`, cx, band + 150 * gap);
    if (d.flightNumber.trim()) {
      ctx.fillStyle = "#64748b";
      ctx.font = `600 44px ${s.welcomeFontCss}`;
      ctx.fillText(`Flight ${d.flightNumber.trim().toUpperCase()}`, cx, band + 215 * gap);
    }
    ctx.fillStyle = s.guestColor;
    fit(ctx, guest, s.guestFontCss, "400", 300, w - 180);
    ctx.fillText(guest, cx, h - 290 * gap + 60);
    ctx.fillStyle = s.accent;
    ctx.fillRect(cx - 160, h - 150, 320, 10);
  } else if (d.theme === "journey") {
    let y = 110;
    const lh = drawLogo(cx, y, 360, 150);
    y += (lh || 0) + 60 * gap;
    ctx.fillStyle = s.agencyColor;
    fit(ctx, agency.toUpperCase(), s.agencyFontCss, "800", 56, w - 300);
    ctx.fillText(agency.toUpperCase(), cx, y);
    if (d.tagline.trim()) {
      ctx.font = `500 32px ${s.agencyFontCss}`;
      ctx.fillStyle = "#9a3412";
      ctx.fillText(d.tagline.trim(), cx, y + 48);
    }
    ornamentLine(ctx, cx, y + 100 * gap, 700, s.accent);
    ctx.fillStyle = s.welcomeColor;
    ctx.font = `700 54px ${s.welcomeFontCss}`;
    ctx.fillText(welcome.toUpperCase(), cx, y + 200 * gap);
    ctx.fillStyle = s.guestColor;
    const nameText = [d.guestSalutation.trim(), d.guestName.trim()].filter(Boolean).join(" ") || "Guest Name";
    fit(ctx, nameText, s.guestFontCss, "400", 230, w - 240);
    ctx.fillText(nameText, cx, y + 430 * gap);
    ctx.fillStyle = s.agencyColor;
    fit(ctx, place.toUpperCase(), s.welcomeFontCss, "700", 64, w - 300);
    ctx.fillText(place.toUpperCase(), cx, h - 150);
    if (d.flightNumber.trim()) {
      ctx.font = `600 36px ${s.welcomeFontCss}`;
      ctx.fillStyle = "#9a3412";
      ctx.fillText(`Flight ${d.flightNumber.trim().toUpperCase()}`, cx, h - 95);
    }
    // Journey banner stripe
    ctx.fillStyle = s.accent;
    ctx.fillRect(0, h - 40, w, 40);
  } else {
    // Portrait themes + classic formal share a centred stack.
    const top = d.theme === "classic" ? 150 : 170;
    let y = top;
    const lh = drawLogo(cx, y, d.theme === "classic" ? 340 : 420, d.theme === "classic" ? 150 : 190);
    y += (lh || 0) + 70 * gap;
    ctx.fillStyle = s.agencyColor;
    fit(ctx, agency, s.agencyFontCss, "700", d.theme === "classic" ? 72 : 64, w - 260);
    ctx.fillText(agency, cx, y);
    if (d.tagline.trim()) {
      ctx.font = `500 34px ${s.agencyFontCss}`;
      ctx.globalAlpha = 0.8;
      ctx.fillText(d.tagline.trim(), cx, y + 52);
      ctx.globalAlpha = 1;
    }
    const mid = d.theme === "classic" ? h / 2 - 20 : h / 2 - 40;
    if (d.theme === "classic") ornamentLine(ctx, cx, mid - 110 * gap, 620, s.accent);
    else {
      ctx.fillStyle = s.accent;
      ctx.fillRect(cx - 90, mid - 120 * gap, 180, 8);
    }
    ctx.fillStyle = s.welcomeColor;
    ctx.font = `700 ${d.theme === "classic" ? 76 : 64}px ${s.welcomeFontCss}`;
    ctx.fillText(d.theme === "classic" ? welcome : welcome.toUpperCase(), cx, mid - 20 * gap);
    ctx.fillStyle = s.guestColor;
    fit(ctx, guest, s.guestFontCss, s.guestFont === "greatvibes" || s.guestFont === "bebas" ? "400" : "800", d.theme === "classic" ? 170 : 190, w - 200);
    ctx.fillText(guest, cx, mid + 170 * gap);
    if (d.theme === "classic") ornamentLine(ctx, cx, mid + 260 * gap, 620, s.accent);
    ctx.fillStyle = s.agencyColor;
    ctx.globalAlpha = 0.9;
    fit(ctx, place, s.welcomeFontCss, "700", 60, w - 260);
    ctx.fillText(place, cx, h - (d.theme === "classic" ? 190 : 250));
    ctx.globalAlpha = 1;
    if (d.flightNumber.trim()) {
      ctx.font = `600 36px ${s.welcomeFontCss}`;
      ctx.fillStyle = s.welcomeColor;
      ctx.fillText(`Flight ${d.flightNumber.trim().toUpperCase()}`, cx, h - (d.theme === "classic" ? 135 : 190));
    }
  }

  frame(ctx, w, h, s);

  // Free (Silver) placards carry the same branding as the server-rendered documents: a light
  // diagonal "Powered by Vouchlio" watermark and the credit along the bottom. Gold and Platinum are
  // clean. Uses the plan in effect now, so a lapsed paid plan counts as Silver.
  if ((agent.subscription?.plan ?? agent.subscriptionPlan) === "silver") {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "#0f172a";
    ctx.font = "800 96px Inter, Arial, sans-serif";
    ctx.textAlign = "center";
    for (const dy of [-360, 0, 360]) ctx.fillText("Powered by Vouchlio", 0, dy);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#e63946";
    ctx.font = "700 26px Inter, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Powered by Vouchlio", w / 2, h - 28);
    ctx.restore();
  }
}

function canvasBlob(canvas: HTMLCanvasElement, type = "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export failed"))), type, 0.95));
}

export async function placardPng(d: PlacardData, agent: Agent): Promise<Blob> {
  const c = document.createElement("canvas");
  await drawPlacard(c, d, agent);
  return canvasBlob(c);
}

export async function placardPdf(d: PlacardData, agent: Agent): Promise<Blob> {
  const c = document.createElement("canvas");
  await drawPlacard(c, d, agent);
  const png = new Uint8Array(await (await canvasBlob(c)).arrayBuffer());
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Welcome placard - ${d.guestName}`);
  const land = isLandscape(d.theme);
  const page = pdf.addPage(land ? [841.89, 595.28] : [595.28, 841.89]);
  const img = await pdf.embedPng(png);
  page.drawImage(img, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

export const placardFileName = (d: PlacardData, ext: "pdf" | "png") =>
  `Welcome_Placard_${(d.guestName || "Guest").replace(/[^a-zA-Z0-9]+/g, "_")}.${ext}`;
