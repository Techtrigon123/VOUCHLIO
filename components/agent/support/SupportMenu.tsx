"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Bug, ChevronRight, Headset, PhoneCall, Ticket, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/agent/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import BugReportDialog from "./BugReportDialog";
import CallbackDialog from "./CallbackDialog";

interface Center {
  channels: { tickets: boolean; bugReports: boolean; callbacks: boolean; callbackHours: string };
  openTickets: number;
  activeCallbacks: number;
}

const DEFAULT: Center = {
  channels: { tickets: true, bugReports: true, callbacks: true, callbackHours: "Mon–Sat, 10 am – 7 pm IST" },
  openTickets: 0,
  activeCallbacks: 0,
};

interface Option {
  key: keyof Omit<Center["channels"], "callbackHours">;
  title: string;
  text: string;
  icon: LucideIcon;
  tone: string;
}

/** "Facing any trouble?" — every way to reach support, in one menu in the top bar. */
export default function SupportMenu() {
  const router = useRouter();
  const [center, setCenter] = useState<Center>(DEFAULT);
  const [bugOpen, setBugOpen] = useState(false);
  const [callbackOpen, setCallbackOpen] = useState(false);

  // Refresh channel switches and counts each time the menu opens.
  const load = () =>
    void api<Center>("/api/agent/support/center").then((r) => {
      if (r.success && r.data) setCenter(r.data);
    });

  const options: Option[] = [
    {
      key: "tickets",
      title: "Support Ticket",
      text: center.openTickets ? `${center.openTickets} open · track replies or raise a new one.` : "Track your requests and get a written reply. Best for detailed issues.",
      icon: Ticket,
      tone: "bg-sky-50 text-sky-600 ring-sky-100",
    },
    { key: "bugReports", title: "Report a Bug", text: "Grab a screenshot, mark the issue, and we'll open a ticket.", icon: Bug, tone: "bg-rose-50 text-rose-600 ring-rose-100" },
    {
      key: "callbacks",
      title: "Request a Callback",
      text: center.activeCallbacks ? `${center.activeCallbacks} waiting · ${center.channels.callbackHours}` : `We'll call you back at your preferred time · ${center.channels.callbackHours}`,
      icon: PhoneCall,
      tone: "bg-violet-50 text-violet-600 ring-violet-100",
    },
  ];
  const visible = options.filter((o) => center.channels[o.key]);

  const choose = (key: Option["key"]) => {
    if (key === "tickets") router.push("/dashboard/support/tickets");
    else if (key === "bugReports") setBugOpen(true);
    else setCallbackOpen(true);
  };

  return (
    <>
      <DropdownMenu modal={false} onOpenChange={(o) => o && load()}>
        <DropdownMenuTrigger
          aria-label="Support options"
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-3 text-sm font-semibold text-black transition hover:border-brand-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          <Headset className="h-4 w-4 text-brand-500" />
          <span className="hidden sm:inline">Support</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={10} className="w-[min(92vw,26rem)] rounded-3xl p-3 shadow-2xl">
          <div className="px-2 pb-3 pt-2">
            <p className="text-xl font-bold tracking-tight text-black">Facing any trouble?</p>
            <p className="mt-0.5 text-sm text-slate-500">We&apos;re here to help. Choose how you&apos;d like to reach us.</p>
          </div>
          {visible.length === 0 ? (
            <p className="px-2 pb-3 text-sm text-slate-500">Support options are paused right now. Please email us and we&apos;ll get back to you.</p>
          ) : (
            <div className="space-y-2">
              {visible.map((o) => (
                <DropdownMenuItem
                  key={o.key}
                  onSelect={() => choose(o.key)}
                  className="group flex cursor-pointer items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-brand-200 hover:bg-slate-50 focus:bg-slate-50"
                >
                  <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1", o.tone)}>
                    <o.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-black">{o.title}</span>
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-slate-500">{o.text}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <BugReportDialog open={bugOpen} onOpenChange={setBugOpen} />
      <CallbackDialog open={callbackOpen} onOpenChange={setCallbackOpen} hours={center.channels.callbackHours} />
    </>
  );
}
