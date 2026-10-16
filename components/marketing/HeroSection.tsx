"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { ArrowRight, Download, FileText, Printer, Share2 } from "lucide-react";
import GlyphPortal from "@/components/ui/glyph-portal";
import { useTheme } from "@/lib/theme";

const FALLBACK_FONT = '"Arial Black", Arial, sans-serif';

const NEON = [230, 57, 70], BLACK = [230, 57, 70]; // the field is brand red #e63946
const DEEP_LINE = "rgb(255,255,255)"; // soft white contour lines over the red field
const mix = (a: number[], b: number[], k: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(",")})`;
const smoothstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * The field seen through the letters, and behind the content once inside. Decorative.
 * Light theme: black with faint neon contour lines, so the wordmark reads black.
 * Dark theme: starts neon (glowing letters on a black page) and fades to black as the camera dives in.
 */
function NeonField({ dark, progress }: { dark: RefObject<boolean>; progress: RefObject<number> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const context = canvas.getContext("2d");
    if (!context) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, visible = false, width = 1, height = 1;
    const draw = (time: number) => {
      frame = 0;
      const t = motion.matches ? 0 : time / 9000;
      const k = dark.current ? smoothstep(0.12, 0.62, progress.current) : 1; // 0 = neon field, 1 = black field
      context.fillStyle = mix(NEON, BLACK, k);
      context.fillRect(0, 0, width, height);
      const glow = context.createRadialGradient(width * 0.78, height * 0.18, 0, width * 0.6, height * 0.4, width * 0.85);
      glow.addColorStop(0, "rgba(255,255,255,0.1)");
      glow.addColorStop(0.45, "rgba(255,255,255,0.03)");
      glow.addColorStop(1, "rgba(230,57,70,0)");
      context.fillStyle = glow;
      context.globalAlpha = k;
      context.fillRect(0, 0, width, height);
      for (let line = -6; line < 44; line++) {
        context.beginPath();
        for (let x = -8; x <= width + 8; x += 8) {
          const u = x / width;
          const bend = Math.sin(u * 4.6 + t + line * 0.04) * height * 0.12 + Math.cos(u * 8.5 - t * 0.7) * height * 0.04;
          const y = (line * height) / 34 + bend;
          if (x === -8) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        const major = line % 6 === 0;
        context.strokeStyle = k < 0.5 ? DEEP_LINE : "#ffffff";
        context.globalAlpha = k < 0.5 ? (major ? 0.35 : 0.15) * (1 - k * 2) : (major ? 0.5 : 0.22) * (k * 2 - 1);
        context.lineWidth = major ? 1.4 : 0.9;
        context.stroke();
      }
      context.globalAlpha = 1;
      if (visible && !motion.matches && !document.hidden) frame = requestAnimationFrame(draw);
    };
    const refresh = () => {
      cancelAnimationFrame(frame);
      const box = canvas.getBoundingClientRect();
      width = box.width;
      height = box.height;
      const ratio = Math.min(devicePixelRatio, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw(performance.now());
    };
    const resize = new ResizeObserver(refresh);
    resize.observe(canvas);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      refresh();
    });
    observer.observe(canvas);
    motion.addEventListener("change", refresh);
    document.addEventListener("visibilitychange", refresh);
    refresh();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      motion.removeEventListener("change", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [dark, progress]);
  return (
    <div style={{ position: "absolute", inset: 0, transform: "scale(var(--gp-field-scale,1))" }}>
      <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    </div>
  );
}

/** Opening frame around the wordmark: one line of context and the call to action. */
function OpeningFrame() {
  return (
    <>
      <div className="absolute inset-x-0 flex justify-center px-4" style={{ top: "calc(var(--gp-word-top, 30%) - 64px)" }}>
        <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-1.5 text-xs font-medium text-slate-600">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          Travel document software for travel agents
        </span>
      </div>
      <div
        className="absolute inset-x-0 flex flex-col items-center gap-5 px-4 text-center"
        style={{ top: "calc(var(--gp-word-bottom, 70%) + 28px)" }}
      >
        <p className="max-w-xl text-base text-slate-600 sm:text-lg">
          Branded hotel vouchers, e-tickets and GST invoices — as polished PDFs in seconds.
        </p>
      </div>
    </>
  );
}

export default function HeroSection() {
  const theme = useTheme();
  const dark = useRef(false);
  const progress = useRef(0);
  useEffect(() => {
    dark.current = theme === "dark";
  }, [theme]);

  // The portal measures the letters once per font. Swap to Inter only after it has loaded,
  // so the camera never flies into a letter whose shape is about to change.
  const [font, setFont] = useState(FALLBACK_FONT);
  useEffect(() => {
    const brandFont = getComputedStyle(document.documentElement).getPropertyValue("--font-inter").split(",")[0]?.trim();
    if (!brandFont) return;
    let live = true;
    document.fonts
      .load(`900 100px ${brandFont}`, "VOUCHLIO")
      .then((faces) => {
        if (live && faces.length) setFont(`${brandFont}, ${FALLBACK_FONT}`);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  return (
    <GlyphPortal
      word="VOUCHLIO"
      interactive={false}
      scrollLength={2.2}
      fontFamily={font}
      fontWeight={900}
      enterLabel="Scroll to explore"
      background={<NeonField dark={dark} progress={progress} />}
      onProgress={(p) => {
        progress.current = p;
      }}
      front={<OpeningFrame />}
      className="text-sm"
      style={{
        "--gp-paper": theme === "dark" ? "#0b0b0c" : "#ffffff",
        "--gp-ink": "#e63946",
        "--gp-field": "#e63946",
        "--gp-foreground": "#000000",
      }}
    >
      <div className="on-accent-text mx-auto w-full max-w-6xl">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-brand-neon">Vouchlio for travel businesses</p>
        <h1 className="mb-6 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-7xl">
          Travel documents, <span className="text-brand-neon">simplified.</span>
        </h1>
        <p className="mb-10 max-w-xl text-lg leading-relaxed text-neutral-300">
          Create branded hotel vouchers, e-tickets, itineraries, pickup vouchers, welcome placards and GST invoices — and download them as
          polished PDFs in seconds.
        </p>
        <div className="mb-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Link href="/signup" className="btn-neon h-14 rounded-xl px-8 text-base">
            Start free — create your first voucher
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/#how-it-works" className="text-sm text-neutral-300 underline underline-offset-4 hover:text-white">
            See how it works
          </Link>
        </div>
        <ul className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-neutral-400">
          {[
            { icon: FileText, label: "7+ document types" },
            { icon: Download, label: "Instant PDF download" },
            { icon: Printer, label: "Print ready" },
            { icon: Share2, label: "Share on WhatsApp & email" },
          ].map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-brand-neon" />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </GlyphPortal>
  );
}
