"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/agent/client";
import { graceDays, planName, renewalReminder, subscriptionState, type RenewalReminder } from "@/lib/agent/plans";
import { useAgent } from "./AgentProvider";
import { Modal, primaryBtn, secondaryBtn } from "./ui";

/** Remembers the last day each reminder stage was shown, so it appears at most once a day. */
const SEEN_PREFIX = "vouchlio-renewal-popup:";
const istToday = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "—");

function seenToday(key: string) {
  try {
    return localStorage.getItem(SEEN_PREFIX + key) === istToday();
  } catch {
    return true; // storage blocked: don't risk showing it on every page
  }
}
function markSeen(key: string) {
  try {
    localStorage.setItem(SEEN_PREFIX + key, istToday());
  } catch {
    /* ignore */
  }
}

/**
 * Gold/Platinum renewal reminder. Shows once a day from RENEW_REMINDER_DAYS before the plan ends
 * until its grace period is over (the bell gets the same reminders from the daily cron job).
 * Skipped while a renewal payment is waiting for review.
 */
export default function RenewalPopup() {
  const { agent } = useAgent();
  const [reminder, setReminder] = useState<RenewalReminder | null>(null);
  const [open, setOpen] = useState(false);
  const checked = useRef(false);

  const sub = agent ? (agent.subscription ?? subscriptionState(agent)) : null;

  useEffect(() => {
    if (!agent || checked.current) return;
    checked.current = true;
    const r = renewalReminder(agent.subscription ?? subscriptionState(agent));
    if (!r || seenToday(r.key)) return;
    let live = true;
    void api<{ pending: unknown | null }>("/api/agent/plan").then((res) => {
      if (!live || !res.success || res.data?.pending) return;
      setReminder(r);
      window.setTimeout(() => {
        if (!live) return;
        setOpen(true);
        markSeen(r.key);
      }, 900);
    });
    return () => {
      live = false;
    };
  }, [agent]);

  if (!reminder || !sub?.paidPlan || !sub.cycle) return null;
  const inGrace = sub.status === "grace";
  const name = planName(sub.paidPlan);

  return (
    <Modal open={open} onOpenChange={setOpen} title={reminder.title} description={reminder.body}>
      <div className={cn("flex items-start gap-3 rounded-2xl p-4", reminder.urgent ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-900")}>
        {reminder.urgent ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /> : <CalendarClock className="mt-0.5 h-5 w-5 shrink-0" />}
        <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <dt className="opacity-75">Plan</dt>
          <dd className="text-right font-semibold">
            {name} · {sub.cycle === "monthly" ? "Monthly" : "Yearly"}
          </dd>
          <dt className="opacity-75">{inGrace ? "Ended on" : "Ends on"}</dt>
          <dd className="text-right font-semibold">{fmt(sub.expiresAt)}</dd>
          <dt className="opacity-75">Grace period</dt>
          <dd className="text-right font-semibold">
            {graceDays(sub.paidPlan, sub.cycle)} days · until {fmt(sub.graceEndsAt)}
          </dd>
        </dl>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Renewing now continues from your current end date, so you don&apos;t lose any days you&apos;ve paid for.
      </p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => setOpen(false)} className={secondaryBtn}>
          Remind me tomorrow
        </button>
        <Link href={reminder.href} onClick={() => setOpen(false)} className={primaryBtn}>
          Renew {name} now
        </Link>
      </div>
    </Modal>
  );
}
