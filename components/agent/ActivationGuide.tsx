"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Lock, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgent } from "./AgentProvider";
import {
  activationProgress,
  needsActivationPrompt,
  type ActivationStep,
} from "@/lib/agent/profile";
import { delayFor, isTyping, snooze, TYPING_PAUSE_MS } from "./prompt-timing";

const KEY = "agent_activation_prompt";
/** After it is closed, the complete-your-profile reminder comes back every 4 minutes — on every page, including document forms — until the profile is complete. */
const REMIND_EVERY_MS = 4 * 60 * 1000;
/** Pages where the guide stays out of the way (the agent is already fixing things there). */
const QUIET_PATHS = ["/setup", "/dashboard/profile/edit"];

interface Ctx {
  openDialog: () => void;
  isOpen: boolean;
  needsPrompt: boolean;
  progressPercent: number;
}
const ActivationContext = createContext<Ctx>({ openDialog: () => {}, isOpen: false, needsPrompt: false, progressPercent: 0 });
export const useActivation = () => useContext(ActivationContext);

/** Scroll to an in-page anchor and focus its first field. */
export function focusAnchor(id: string) {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("ring-anchor-flash");
  setTimeout(() => el.classList.remove("ring-anchor-flash"), 2200);
  const input = el.querySelector<HTMLElement>("input:not([disabled]), textarea:not([disabled]), button:not([disabled])");
  if (input) setTimeout(() => input.focus(), 400);
  return true;
}

export function ActivationProvider({ children }: { children: React.ReactNode }) {
  const { agent } = useAgent();
  const pathname = usePathname();
  const quiet = QUIET_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const needs = needsActivationPrompt(agent);
  const show = !!agent && needs && !quiet;
  const [open, setOpen] = useState(false);
  const progress = useMemo(() => (agent ? activationProgress(agent) : null), [agent]);

  const onOpenChange = useCallback((v: boolean) => {
    setOpen(v);
    if (!v) snooze(KEY, REMIND_EVERY_MS);
  }, []);

  useEffect(() => {
    if (!show) {
      setOpen(false);
      return;
    }
    if (open) return;
    let t = 0;
    // When the reminder is due, wait while the agent is typing (so it doesn't steal focus mid-word)
    // or while another popup is open (so two dialogs never stack).
    const otherDialogOpen = () => !!document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');
    const tryOpen = () => {
      if (isTyping() || otherDialogOpen()) t = window.setTimeout(tryOpen, TYPING_PAUSE_MS);
      else setOpen(true);
    };
    t = window.setTimeout(tryOpen, delayFor(KEY));
    return () => window.clearTimeout(t);
  }, [show, open]);

  const value = useMemo(
    () => ({ openDialog: () => setOpen(true), isOpen: open, needsPrompt: show, progressPercent: progress?.percent ?? 0 }),
    [open, show, progress?.percent]
  );

  return (
    <ActivationContext.Provider value={value}>
      {children}
      {/* No floating "Activate account" button: the dialog opens from the dashboard's setup card. */}
      {show && agent && progress ? <ActivationDialog open={open} onOpenChange={onOpenChange} steps={progress.steps} progress={progress} /> : null}
    </ActivationContext.Provider>
  );
}

function firstOpenIndex(steps: ActivationStep[]) {
  const i = steps.findIndex((s) => !s.done && !s.locked);
  return i >= 0 ? i : Math.max(0, steps.length - 1);
}

function ActivationDialog({
  open,
  onOpenChange,
  steps,
  progress,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  steps: ActivationStep[];
  progress: ReturnType<typeof activationProgress>;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(() => firstOpenIndex(steps));
  useEffect(() => {
    if (open) setIndex(firstOpenIndex(steps));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const step = steps[index] ?? steps[0];
  const left = progress.total - progress.completed;
  const actionable = !step.done && !step.locked;

  const go = (s: ActivationStep) => {
    if (s.locked && !s.done) return;
    onOpenChange(false);
    const [path, hash] = s.href.split("#");
    router.push(s.href);
    if (hash) {
      // Same-page hash changes don't remount the page — scroll ourselves.
      window.setTimeout(() => focusAnchor(hash), path === window.location.pathname ? 50 : 700);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-[2px] anim-fade" />
        <DialogPrimitive.Content
          aria-describedby="activation-description"
          className="fixed inset-x-0 bottom-0 z-[70] flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-brand-100 bg-white shadow-2xl anim-sheet sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
        >
          <div className="relative border-b border-slate-100 bg-white px-5 pb-4 pt-6 sm:px-6">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[var(--primary)]">
              <Sparkles className="h-3.5 w-3.5" /> Activate your account
            </p>
            <DialogPrimitive.Title className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {left === 0 ? "Almost there — one last step" : `${left} step${left === 1 ? "" : "s"} left to go Active`}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description id="activation-description" className="mt-1 text-sm text-slate-500">
              Tap a step or <span className="font-medium text-slate-700">Take me there</span> — we open the page and scroll to the field.
            </DialogPrimitive.Description>

            <div className="mt-4 flex items-center justify-between text-xs font-medium text-slate-500">
              <span>
                Step {index + 1} of {steps.length}
              </span>
              <span className="tabular-nums text-[var(--primary)]">{progress.percent}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand-100">
              <div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${progress.percent}%` }} />
            </div>

            <div className="mt-4 grid grid-cols-5 gap-1" role="tablist" aria-label="Activation steps">
              {steps.map((s, i) => {
                const current = i === index;
                const locked = s.locked && !s.done;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={current}
                    aria-label={`${s.label}${s.done ? ", completed" : ""}${locked ? ", locked" : ""}`}
                    title={s.label}
                    onClick={() => setIndex(i)}
                    className="flex justify-center rounded-xl py-1 outline-none hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-300"
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border text-xs font-bold tabular-nums transition-colors",
                        current && "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm",
                        !current && s.done && "border-emerald-200 bg-emerald-50 text-emerald-700",
                        !current && !s.done && locked && "border-slate-200 bg-slate-100 text-slate-400",
                        !current && !s.done && !locked && "border-slate-200 bg-white text-slate-500"
                      )}
                    >
                      {s.done ? <Check className="h-4 w-4" /> : locked ? <Lock className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            <div
              className={cn(
                "rounded-2xl border p-4",
                step.done && "border-emerald-200 bg-emerald-50/60",
                actionable && "border-brand-200 bg-white ring-4 ring-brand-50",
                step.locked && !step.done && "border-slate-200 bg-slate-50"
              )}
            >
              <p className="text-base font-semibold text-slate-900">{step.label}</p>
              <p className="mt-1 text-sm text-slate-500">{step.hint}</p>
              {step.done ? (
                <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <Check className="h-4 w-4" /> Completed
                </p>
              ) : step.locked ? (
                <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                  <Lock className="h-4 w-4" /> Finish the profile steps first
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => go(step)}
                  className="mt-3 w-full rounded-xl border border-dashed border-brand-300 bg-brand-50/60 p-3 text-left transition hover:bg-brand-50"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">Where to find it</p>
                  <p className="mt-1 text-sm text-slate-700">
                    <span className="font-medium">{step.pageName}</span> → {step.sectionName} →{" "}
                    <span className="rounded bg-white px-1.5 py-0.5 font-medium text-slate-900 ring-1 ring-brand-200">{step.fieldName}</span>
                  </p>
                  {step.id !== "document" && step.id !== "mobile" ? (
                    <p className="mt-1 text-xs text-slate-500">Fill it in, then press Save Profile.</p>
                  ) : null}
                </button>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                type="button"
                disabled={index === steps.length - 1}
                onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}
                className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
            <button
              type="button"
              disabled={!actionable && !progress.nextStep}
              onClick={() => (actionable ? go(step) : progress.nextStep ? go(progress.nextStep) : onOpenChange(false))}
              className="inline-flex h-11 w-full items-center justify-center gap-2 btn-glow rounded-lg bg-[var(--primary)] font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {actionable ? (
                <>
                  Take me there <ArrowRight className="h-4 w-4" />
                </>
              ) : progress.nextStep ? (
                <>
                  Next: {progress.nextStep.fieldName} <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                "Done"
              )}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 w-full rounded-full text-sm text-slate-500 hover:text-slate-900"
            >
              Remind me later
            </button>
          </div>
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
