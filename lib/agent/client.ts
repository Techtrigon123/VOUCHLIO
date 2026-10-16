"use client";

import type { ApiResult } from "./types";

/**
 * Successful GET results are kept in this tab's memory (never on disk — the API still sends
 * no-store) so moving between dashboard pages doesn't refetch the same data. Any write clears
 * everything, so a page never shows data from before the agent's own change. Data changed
 * elsewhere (another tab, an admin) shows up within GET_TTL_MS or on a full reload.
 */
const GET_TTL_MS = 30_000;
const gets = new Map<string, { at: number; result: Promise<ApiResult<unknown>> }>();

/** Forget every cached GET — call after signing in or anything else the cache can't see. */
export function clearApiCache() {
  gets.clear();
}

/**
 * JSON fetch that never throws for HTTP errors — callers branch on `success`.
 * GETs are served from a short-lived cache; pass `fresh: true` to always hit the server.
 */
export async function api<T>(url: string, init?: RequestInit & { json?: unknown; fresh?: boolean }): Promise<ApiResult<T>> {
  const { fresh, ...rest } = init ?? {};
  if ((rest.method ?? "GET").toUpperCase() !== "GET") {
    gets.clear();
    // Clear again afterwards: a GET that started during the write may have cached older data.
    return request<T>(url, rest).finally(() => gets.clear());
  }
  const hit = gets.get(url);
  if (!fresh && hit && Date.now() - hit.at < GET_TTL_MS) return hit.result.then((r) => structuredClone(r) as ApiResult<T>);
  const result = request<T>(url, rest);
  gets.set(url, { at: Date.now(), result });
  // Errors (expired session, network) are never reused.
  void result.then((r) => {
    if (!r.success && gets.get(url)?.result === result) gets.delete(url);
  });
  return result.then((r) => structuredClone(r));
}

async function request<T>(url: string, init: RequestInit & { json?: unknown }): Promise<ApiResult<T>> {
  try {
    const { json, ...rest } = init;
    const res = await fetch(url, {
      cache: "no-store",
      ...rest,
      headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...(rest.headers ?? {}) },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
    const body = await res.json().catch(() => null);
    if (!body) return { success: false, error: { message: `Request failed (${res.status})` } };
    return body as ApiResult<T>;
  } catch {
    return { success: false, error: { message: "Check your connection and try again." } };
  }
}

export const pdfUrl = (id: string, download = false) =>
  `/api/agent/documents/${encodeURIComponent(id)}/pdf${download ? "?download=1" : ""}`;

async function fetchPdf(id: string): Promise<{ blob: Blob; name: string } | { error: string; code?: string }> {
  try {
    const res = await fetch(pdfUrl(id, true), { cache: "no-store" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { error: body?.error?.message ?? "Could not load the PDF. Please try again.", code: body?.error?.code };
    }
    const cd = res.headers.get("Content-Disposition") ?? "";
    const name = /filename="([^"]+)"/.exec(cd)?.[1] ?? "document.pdf";
    return { blob: await res.blob(), name };
  } catch {
    return { error: "Could not load the PDF. Please try again." };
  }
}

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Open a saved PDF in a new tab. Returns an error message on failure. */
export async function openPdf(id: string): Promise<string | null> {
  // Open the tab synchronously so pop-up blockers allow it, then point it at the PDF.
  const win = window.open("", "_blank");
  const r = await fetchPdf(id);
  if ("error" in r) {
    win?.close();
    return r.error;
  }
  const url = URL.createObjectURL(r.blob);
  if (win) win.location.href = url;
  else return "Pop-up blocked. Allow pop-ups to view the PDF.";
  return null;
}

export async function downloadPdf(id: string): Promise<string | null> {
  const r = await fetchPdf(id);
  if ("error" in r) return r.error;
  saveBlob(r.blob, r.name);
  return null;
}

/**
 * Share on WhatsApp: attach the file via the Web Share API where supported
 * (mostly mobile); otherwise download it and open WhatsApp with the message.
 */
export async function sharePdfOnWhatsApp(
  source: { id: string } | { blob: Blob; name: string },
  message: string
): Promise<{ attached: boolean; error?: string }> {
  let file: { blob: Blob; name: string };
  if ("id" in source) {
    const r = await fetchPdf(source.id);
    if ("error" in r) return { attached: false, error: r.error };
    file = r;
  } else file = source;

  const f = new File([file.blob], file.name, { type: "application/pdf" });
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [f] })) {
    try {
      await navigator.share({ files: [f], text: message });
      return { attached: true };
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return { attached: true };
    }
  }
  saveBlob(file.blob, file.name);
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  return { attached: false };
}

/** Read an image, downscale it to fit `max` px and return a PNG/JPEG data URL. */
export function imageFileToDataUrl(file: File, max = 800, type: "image/png" | "image/jpeg" = "image/png"): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Wrong file type"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unavailable"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL(type, 0.9));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export function formatDay(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
