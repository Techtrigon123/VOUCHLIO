"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Bell, Crown, IndianRupee, PhoneCall, ShieldCheck, Ticket, Volume2, VolumeX, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/agent/client";
import { useAgent } from "./AgentProvider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/*
 * Agent notification bell. Notifications are written by the database when the Vouchlio team acts
 * on the account (migration 0013): profile verified, plan active, payment reviewed, ticket reply,
 * callback scheduled… The bell polls while the tab is visible, swings and chimes when something new
 * arrives, and marks everything read when opened. Read state lives on the server, so it follows
 * the agent across devices.
 */

type Kind = "verification" | "plan" | "payment" | "ticket" | "callback" | "account";
interface Item {
  id: string;
  kind: Kind;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
}

const POLL_MS = 30_000;
const MUTE_KEY = "vouchlio-notifications-muted";
/** Kinds that change what the dashboard shows (plan, verification, services), so the agent is reloaded. */
const REFRESHES_AGENT: Kind[] = ["verification", "plan", "account"];

const KIND: Record<Kind, { icon: LucideIcon; tone: string }> = {
  verification: { icon: BadgeCheck, tone: "bg-emerald-50 text-emerald-600" },
  plan: { icon: Crown, tone: "bg-amber-50 text-amber-600" },
  payment: { icon: IndianRupee, tone: "bg-sky-50 text-sky-600" },
  ticket: { icon: Ticket, tone: "bg-violet-50 text-violet-600" },
  callback: { icon: PhoneCall, tone: "bg-blue-50 text-blue-700" },
  account: { icon: ShieldCheck, tone: "bg-slate-100 text-slate-600" },
};

/* ─── Chime: generated with Web Audio, so there's no sound file to load ─────── */

let audio: AudioContext | null = null;
function audioContext(): AudioContext | null {
  try {
    audio ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return audio;
  } catch {
    return null;
  }
}

/** Two soft bell tones (E6 then B6), each with a quick attack and a gentle fade. */
function playChime() {
  const ctx = audioContext();
  if (!ctx) return;
  void ctx.resume().catch(() => {});
  const now = ctx.currentTime;
  const tone = (freq: number, start: number, length: number) => {
    const osc = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const gain = ctx.createGain();
    const soft = ctx.createGain();
    osc.frequency.value = freq;
    overtone.frequency.value = freq * 2.01;
    soft.gain.value = 0.25;
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(0.18, now + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + length);
    osc.connect(gain);
    overtone.connect(soft).connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + start);
    overtone.start(now + start);
    osc.stop(now + start + length + 0.05);
    overtone.stop(now + start + length + 0.05);
  };
  tone(1318.5, 0, 0.6);
  tone(1975.5, 0.14, 0.75);
}

function readMuted() {
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86_400) return `${Math.floor(s / 86_400)} d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function NotificationBell() {
  const router = useRouter();
  const { refresh } = useAgent();
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [muted, setMuted] = useState(readMuted);
  const [ringing, setRinging] = useState(false);
  /** Unread when the panel was last opened — still highlighted while it stays open. */
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const known = useRef<Set<string> | null>(null);
  const inFlight = useRef(false);
  const mutedRef = useRef(muted);

  // Browsers only allow sound after the user has interacted with the page; unlock on first input.
  useEffect(() => {
    const unlock = () => void audioContext()?.resume().catch(() => {});
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const ring = useCallback(() => {
    setRinging(false);
    requestAnimationFrame(() => setRinging(true));
    window.setTimeout(() => setRinging(false), 1400);
    if (!mutedRef.current) playChime();
  }, []);

  const poll = useCallback(async () => {
    if (inFlight.current || document.hidden) return;
    inFlight.current = true;
    try {
      const r = await api<{ items: Item[]; unread: number }>("/api/agent/notifications", { fresh: true });
      if (!r.success || !r.data) return;
      const next = r.data.items;
      const prev = known.current;
      known.current = new Set(next.map((n) => n.id));
      setItems(next);
      setUnread(r.data.unread);
      // First load: ring once if anything is waiting. Afterwards: ring for each new arrival.
      const arrived = prev === null ? next.filter((n) => !n.read) : next.filter((n) => !n.read && !prev.has(n.id));
      if (!arrived.length) return;
      ring();
      if (prev !== null && arrived.some((n) => REFRESHES_AGENT.includes(n.kind))) void refresh();
    } finally {
      inFlight.current = false;
    }
  }, [ring, refresh]);

  // Poll while visible; check straight away when the agent comes back to the tab.
  useEffect(() => {
    void poll();
    const t = window.setInterval(() => void poll(), POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [poll]);

  const onOpenChange = (open: boolean) => {
    if (!open) return setFresh(new Set());
    const waiting = items.filter((n) => !n.read);
    setFresh(new Set(waiting.map((n) => n.id)));
    if (!waiting.length) return;
    // Opening the panel reads everything in it.
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    setUnread(0);
    void api("/api/agent/notifications", { method: "POST", json: { all: true } });
  };

  const toggleMute = () => {
    const v = !muted;
    mutedRef.current = v;
    setMuted(v);
    try {
      window.localStorage.setItem(MUTE_KEY, v ? "1" : "0");
    } catch {
      /* storage blocked — muted for this page only */
    }
    if (!v) playChime(); // preview the sound when turning it back on
  };

  return (
    <DropdownMenu modal={false} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <Bell className={cn("h-[18px] w-[18px]", ringing && "bell-ring")} />
        {unread ? (
          <span key={unread} className="badge-pop absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-[min(92vw,24rem)] rounded-2xl p-0 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">Notifications</p>
          <button
            type="button"
            onClick={toggleMute}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-pressed={muted}
            title={muted ? "Turn the notification sound on" : "Mute the notification sound"}
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />} {muted ? "Sound off" : "Sound on"}
          </button>
        </div>
        {items.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Bell className="mx-auto h-6 w-6 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-700">You&apos;re all caught up</p>
            <p className="mt-1 text-xs text-slate-500">Profile approvals, plan updates and support replies from the Vouchlio team appear here.</p>
          </div>
        ) : (
          <div className="max-h-[min(70vh,28rem)] overflow-y-auto p-1.5">
            {items.map((n) => {
              const k = KIND[n.kind] ?? KIND.account;
              const isNew = fresh.has(n.id);
              return (
                <DropdownMenuItem
                  key={n.id}
                  onSelect={() => n.href && router.push(n.href)}
                  className={cn("flex cursor-pointer items-start gap-3 rounded-xl px-2.5 py-2.5", isNew && "bg-brand-50/60")}
                >
                  <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", k.tone)}>
                    <k.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-[13px] font-semibold leading-snug text-slate-900">{n.title}</span>
                      {isNew ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" aria-label="New" /> : null}
                    </span>
                    {n.body ? <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-slate-500">{n.body}</span> : null}
                    <span className="mt-1 block text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span>
                  </span>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
