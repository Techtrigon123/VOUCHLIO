import "server-only";
import { fail } from "@/lib/agent/server";
import { getAppSettings, type SupportSettings } from "@/lib/settings";

/** A support channel switched off in Vouchlio Admin answers 403, so turning it off takes effect at once. */
export async function channelOff(channel: keyof Omit<SupportSettings, "callbackHours">) {
  const { support } = await getAppSettings();
  return support[channel] ? null : fail("This support option is turned off right now. Please use another way to reach us.", 403, "CHANNEL_OFF");
}

/** One-line text: collapses whitespace and trims to `max` characters. */
export const clean = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
/** Multi-line text: keeps line breaks, trims to `max` characters. */
export const cleanBody = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** Writes before migration 0010 is run: a clear 503 instead of a stack trace. Returns null for other errors. */
export function notReady(error: unknown) {
  return error instanceof Error && error.name === "SupportNotReadyError"
    ? fail("Support tickets and callbacks aren't set up yet. Please use the Contact page for now.", 503, "SUPPORT_NOT_READY")
    : null;
}
