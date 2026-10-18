"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BedDouble, Car, ChevronLeft, ChevronRight, FileText, Landmark, Pause, Play, Plane, ReceiptText, Route, Signpost, Eye, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Services carousel in the style of Apple's home-page "TV" slider: one big slide in the centre,
 * its neighbours peeking in at the sides, autoplay with a progress pill, dots, swipe and arrow keys.
 * Informational: every slide's button leads to sign-up.
 */

interface Slide {
  title: string;
  category: string;
  tagline: string;
  icon: LucideIcon;
  image: string;
}

const img = (id: string) => `https://images.unsplash.com/${id}?w=1800&q=72&auto=format&fit=crop`;

const SLIDES: Slide[] = [
  { title: "Hotel Vouchers", category: "Stay", tagline: "Guest, room, meal plan and booking reference on one branded page", icon: BedDouble, image: img("photo-1520250497591-112f2f40a3f4") },
  { title: "Air Tickets", category: "Flights", tagline: "Offline e-tickets with PNR, ticket numbers, baggage and fare", icon: Plane, image: img("photo-1474302770737-173ee21bab63") },
  { title: "Pickup Vouchers", category: "Transfers", tagline: "Driver, vehicle, pickup time and drop — clear for everyone", icon: Car, image: img("photo-1544620347-c4fd4a3d5957") },
  { title: "Itinerary Builder", category: "Trip plans", tagline: "Day-by-day plans with stays, meals, inclusions and price", icon: Route, image: img("photo-1469854523086-cc02fe5d8800") },
  { title: "Welcome Placards", category: "Arrivals", tagline: "Airport and hotel boards with your guest's name and your brand", icon: Signpost, image: img("photo-1530521954074-e64f6810b32d") },
  { title: "GST Invoices", category: "Billing", tagline: "CGST, SGST and IGST worked out for you, with payments tracked", icon: Landmark, image: img("photo-1517245386807-bb43f82c33c4") },
  { title: "Proforma Invoices", category: "Quotes", tagline: "Priced quotations your customer approves before paying", icon: FileText, image: img("photo-1586281380349-632531db7ed4") },
  { title: "Payment Receipts", category: "Payments", tagline: "Proof of every payment, linked to its invoice", icon: ReceiptText, image: img("photo-1556742049-0cfed4f6a45d") },
  { title: "Live PDF Preview", category: "Preview", tagline: "See the finished PDF update as you type, before you save", icon: Eye, image: img("photo-1499951360447-b19be8fe80f5") },
];

/** Time each slide stays before the next one slides in. */
const INTERVAL_MS = 4000;
const GAP_PX = 16;

export default function FeaturesSection() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  // Paused only while someone moves through the slides with the keyboard (not on mouse hover or clicks).
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [reduced, setReduced] = useState(false);
  const drag = useRef<{ x: number; id: number } | null>(null);
  const count = SLIDES.length;
  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(m.matches);
    sync();
    m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, []);

  // Autoplay runs for everyone (with reduced motion the slide just switches without animating); the pause button stops it.
  const running = playing && !keyboardFocus;
  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => go(index + 1), INTERVAL_MS);
    return () => window.clearTimeout(t);
  }, [running, index, go]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") go(index + 1);
    if (e.key === "ArrowLeft") go(index - 1);
  };

  return (
    <section id="services" className="overflow-hidden bg-white py-24" aria-roledescription="carousel" aria-label="Vouchlio services">
      <div className="mx-auto mb-12 max-w-3xl px-4 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--primary)]">Services</p>
        <h2 className="mb-4 text-3xl font-bold text-[var(--foreground)] sm:text-5xl">Everything you need for travel documentation</h2>
        <p className="mx-auto max-w-xl text-[var(--muted-foreground)]">Every document your travel business sends — from one place.</p>
      </div>

      <div
        className="relative select-none [--sw:min(86vw,1180px)] sm:[--sw:min(78vw,1180px)]"
        onFocus={(e) => setKeyboardFocus((e.target as HTMLElement).matches(":focus-visible"))}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setKeyboardFocus(false);
        }}
        onKeyDown={onKey}
        onPointerDown={(e) => (drag.current = { x: e.clientX, id: e.pointerId })}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (!d || d.id !== e.pointerId) return;
          const dx = e.clientX - d.x;
          if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
        }}
      >
        {/* Track: the active slide is centred; neighbours peek in at both sides. */}
        <div
          className="flex transition-transform duration-700 ease-[cubic-bezier(.22,.8,.2,1)] motion-reduce:transition-none"
          style={{
            gap: GAP_PX,
            // Padding (a % of the container) centres slide 0; the transform then steps one slide at a time.
            paddingLeft: "calc(50% - var(--sw) / 2)",
            transform: `translateX(calc(-${index} * (var(--sw) + ${GAP_PX}px)))`,
          }}
        >
          {SLIDES.map((s, i) => {
            const active = i === index;
            return (
              <article
                key={s.title}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}: ${s.title}`}
                aria-hidden={!active}
                onClick={() => !active && go(i)}
                className={cn(
                  "relative aspect-[4/5] w-[var(--sw)] shrink-0 overflow-hidden rounded-2xl bg-black transition-opacity duration-700 sm:aspect-[16/8] lg:aspect-[16/7]",
                  active ? "opacity-100" : "cursor-pointer opacity-45 hover:opacity-70"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.image}
                  alt=""
                  loading={i < 2 ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                  className={cn("absolute inset-0 h-full w-full object-cover transition-transform duration-[6s] ease-out", active && !reduced && "scale-105")}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#000000]/80 via-[#000000]/25 to-[#000000]/10" aria-hidden />

                {/* Brand mark, top right (like the  tv badge) */}
                <span className="absolute right-5 top-5 inline-flex items-center gap-1.5 text-lg font-bold tracking-tight text-[#ffffff] drop-shadow sm:right-8 sm:top-7 sm:text-2xl">
                  <s.icon className="h-5 w-5 sm:h-6 sm:w-6" /> Vouchlio
                </span>

                {/* Big title */}
                <h3 className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-4xl font-extrabold leading-[1.02] tracking-tight text-[#ffffff] drop-shadow-lg sm:inset-x-12 sm:text-6xl lg:text-7xl">
                  {s.title}
                </h3>

                {/* Bottom bar: pill button + caption */}
                <div className="absolute inset-x-5 bottom-5 flex flex-col items-start gap-3 sm:inset-x-10 sm:bottom-8 sm:flex-row sm:items-center sm:gap-4">
                  <Link
                    href="/signup"
                    tabIndex={active ? 0 : -1}
                    className="inline-flex h-9 items-center rounded-full bg-[#ffffff] px-5 text-sm font-medium text-[#000000] shadow-sm transition hover:bg-[#ffffff]/85"
                  >
                    Create now
                  </Link>
                  <p className="text-sm text-[#ffffff]/90 sm:text-[15px]">
                    <span className="font-semibold text-[#ffffff]">{s.category}</span> · {s.tagline}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        {/* Side arrows (desktop) */}
        <button
          type="button"
          onClick={() => go(index - 1)}
          aria-label="Previous service"
          className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#ffffff]/80 text-[#000000] shadow-md backdrop-blur transition hover:bg-[#ffffff] md:flex"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          aria-label="Next service"
          className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#ffffff]/80 text-[#000000] shadow-md backdrop-blur transition hover:bg-[#ffffff] md:flex"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Dots with a progress pill, and play / pause */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2" role="tablist" aria-label="Choose a service">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={s.title}
              onClick={() => go(i)}
              className={cn("relative h-2 overflow-hidden rounded-full transition-all duration-500", i === index ? "w-10 bg-slate-300" : "w-2 bg-slate-400 hover:bg-slate-500")}
            >
              {i === index ? (
                <span
                  key={`${index}-${running}`}
                  className="absolute inset-y-0 left-0 rounded-full bg-[var(--foreground)]"
                  style={{ width: running ? undefined : "100%", animation: running ? `carousel-progress ${INTERVAL_MS}ms linear forwards` : undefined }}
                />
              ) : null}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Pause slideshow" : "Play slideshow"}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-black transition hover:bg-slate-200"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
      </div>
    </section>
  );
}
