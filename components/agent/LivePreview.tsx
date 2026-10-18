"use client";

import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ExternalLink, Eye, FileSearch, Loader2 } from "lucide-react";
import type { DocumentKind } from "@/lib/agent/types";
import { cn } from "@/lib/utils";
import { secondaryBtn } from "./ui";
import { PreviewPanel } from "./editor";

/** Wait this long after the last keystroke before re-rendering, so typing stays smooth. */
const DEBOUNCE_MS = 900;
const OPEN_KEY = "vouchlio-live-preview";

/** Phones can't show a PDF inside the page, so below this width the preview opens in a new tab. */
const WIDE_QUERY = "(min-width: 768px)";
const subscribeWide = (cb: () => void) => {
  const mq = window.matchMedia(WIDE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useWide = () => useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE_QUERY).matches, () => false);

type Result = { blob: Blob } | { error: string };

async function fetchPreview(body: string, signal?: AbortSignal): Promise<Result> {
  try {
    const res = await fetch("/api/agent/documents/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body, signal, cache: "no-store" });
    if (res.ok) return { blob: await res.blob() };
    const j = await res.json().catch(() => null);
    return { error: j?.error?.message ?? "Could not build the preview." };
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    return { error: "Check your connection — the preview couldn't load." };
  }
}

function readOpen(fallback: boolean) {
  try {
    const v = window.localStorage.getItem(OPEN_KEY);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}

/**
 * The document as it will print, re-rendered (stamped "PREVIEW") a moment after the agent stops
 * typing. Uses the same server templates as the real PDF; nothing is saved.
 */
export function LivePreview({
  kind,
  data,
  documentId,
  defaultOpen = true,
  className,
  variant = "card",
}: {
  kind: DocumentKind;
  data: unknown;
  /** The saved document being edited, so the preview can include its recorded payments. */
  documentId?: string | null;
  defaultOpen?: boolean;
  className?: string;
  /** "panel": fills the pinned right-hand column of an editor (always shown on wide screens). */
  variant?: "card" | "panel";
}) {
  const wide = useWide();
  const [savedOpen, setOpen] = useState(() => readOpen(defaultOpen));
  const open = variant === "panel" || savedOpen;
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const urlRef = useRef<string | null>(null);
  const body = useMemo(() => JSON.stringify({ kind, data, documentId: documentId ?? undefined }), [kind, data, documentId]);

  const showBlob = (blob: Blob) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(blob);
    setUrl(urlRef.current);
  };

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  useEffect(() => {
    if (!open || !wide) return;
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      setLoading(true);
      fetchPreview(body, ctrl.signal)
        .then((r) => {
          if (ctrl.signal.aborted) return; // newer typing already started another render
          if ("blob" in r) {
            showBlob(r.blob);
            setError("");
          } else setError(r.error);
          setLoading(false);
        })
        .catch(() => {
          /* superseded by newer typing */
        });
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(t);
      ctrl.abort();
      setLoading(false); // otherwise hiding the panel mid-render leaves "Updating…" spinning
    };
  }, [body, open, wide]);

  const toggle = () => {
    const next = !savedOpen;
    setOpen(next);
    try {
      window.localStorage.setItem(OPEN_KEY, next ? "1" : "0");
    } catch {
      /* storage blocked — remember for this page only */
    }
  };

  /** Phones: open the preview in a new tab (opened first so pop-up blockers allow it). */
  const openInTab = async () => {
    const win = window.open("", "_blank");
    if (!win) {
      setError("Your browser blocked the preview tab. Allow pop-ups for this site and try again.");
      return;
    }
    setLoading(true);
    const r = await fetchPreview(body).catch(() => ({ error: "Could not build the preview." }) as Result);
    setLoading(false);
    if ("error" in r) {
      win.close();
      setError(r.error);
      return;
    }
    setError("");
    showBlob(r.blob);
    win.location.href = urlRef.current!;
  };

  if (variant === "panel" && wide) {
    const status = loading ? (
      <span className="flex items-center gap-1.5" role="status">
        <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" /> Updating…
      </span>
    ) : null;
    return (
      <PreviewPanel
        meta="A4 portrait · print-ready"
        status={status}
        footer={
          <p className="mt-2 px-1 text-[11px] leading-snug text-slate-500">
            {error && url ? <span className="mr-1 text-amber-700">{error}</span> : null}
            Updates as you type and is marked PREVIEW. Save for the final PDF.
          </p>
        }
      >
        <div className="mx-auto aspect-[1/1.414] w-full max-w-[760px] overflow-hidden rounded-md bg-white shadow-[0_10px_30px_rgba(15,23,42,0.12)] ring-1 ring-slate-200">
          {url ? (
            <iframe src={`${url}#toolbar=0&navpanes=0&view=FitH`} title="Live preview of the PDF" className={cn("h-full w-full transition-opacity", loading && "opacity-60")} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-slate-500">
              {loading ? <Loader2 className="h-6 w-6 text-brand-500 motion-safe:animate-spin" /> : <FileSearch className="h-6 w-6 text-slate-400" />}
              {loading ? "Drawing your document…" : error || "Start filling the form to see your document here."}
            </div>
          )}
        </div>
      </PreviewPanel>
    );
  }

  return (
    <section aria-label="Live preview" className={cn("rounded-3xl border border-slate-200 bg-white p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Eye className="h-4 w-4 text-brand-500" /> Live preview
        </p>
        <div className="flex items-center gap-3">
          {loading ? (
            <span className="flex items-center gap-1.5 text-xs text-slate-500" role="status">
              <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" /> Updating…
            </span>
          ) : null}
          {wide ? (
            <button type="button" onClick={toggle} aria-expanded={open} className="text-xs font-medium text-slate-500 hover:text-brand-600">
              {open ? "Hide" : "Show"}
            </button>
          ) : null}
        </div>
      </div>

      {!wide ? (
        <button type="button" onClick={() => void openInTab()} disabled={loading} className={cn(secondaryBtn, "mt-3 w-full")}>
          <ExternalLink className="h-4 w-4" /> Open preview
        </button>
      ) : open ? (
        <div className="keep-light relative mt-3 aspect-[1/1.414] w-full overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
          {url ? (
            <iframe src={`${url}#toolbar=0&navpanes=0&view=FitH`} title="Live preview of the PDF" className={cn("h-full w-full transition-opacity", loading && "opacity-60")} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-slate-500">
              {loading ? <Loader2 className="h-6 w-6 text-brand-500 motion-safe:animate-spin" /> : <FileSearch className="h-6 w-6 text-slate-400" />}
              {loading ? "Drawing your document…" : error || "Start filling the form to see your document here."}
            </div>
          )}
        </div>
      ) : null}

      {error && (url || !wide) ? <p className="mt-2 text-xs text-amber-700">{error}</p> : null}
      {open || !wide ? <p className="mt-2 text-[11px] leading-snug text-slate-500">Updates as you type and is marked PREVIEW. Save &amp; generate for the final PDF.</p> : null}
    </section>
  );
}
