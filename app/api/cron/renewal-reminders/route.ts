import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db/supabase";
import { GRACE_DAYS, RENEW_REMINDER_DAYS, renewalReminder, subscriptionState } from "@/lib/agent/plans";

/**
 * Daily: put a renewal reminder in the bell of every Gold/Platinum agent whose plan ends within
 * RENEW_REMINDER_DAYS, or who is in the grace period. Each stage (7, 3, 1 days left; grace; last
 * grace day) is sent once per plan period (unique dedupe_key, migration 0014), so re-runs are safe.
 * Vercel Cron calls it with `Authorization: Bearer <CRON_SECRET>`.
 */
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const given = req.headers.get("authorization") ?? "";
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(hash(given), hash(`Bearer ${secret}`));
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const now = Date.now();
    const graceMax = Math.max(...Object.values(GRACE_DAYS).flatMap((c) => Object.values(c)));
    // Plans ending from "grace period already running" up to the reminder window.
    const { data, error } = await db()
      .from("users")
      .select("id,subscription_plan,subscription_expires_at,subscription_cycle,status")
      .in("subscription_plan", ["gold", "platinum"])
      .neq("status", "SUSPENDED")
      .gte("subscription_expires_at", new Date(now - (graceMax + 1) * DAY_MS).toISOString())
      .lte("subscription_expires_at", new Date(now + (RENEW_REMINDER_DAYS + 1) * DAY_MS).toISOString());
    if (error) throw new Error(error.message);

    const rows = ((data ?? []) as { id: string; subscription_plan: string; subscription_expires_at: string; subscription_cycle: string | null }[]).flatMap((u) => {
      const reminder = renewalReminder(
        subscriptionState({ subscriptionPlan: u.subscription_plan, subscriptionExpiresAt: u.subscription_expires_at, subscriptionCycle: u.subscription_cycle }, now)
      );
      return reminder ? [{ agent_id: u.id, kind: "plan", title: reminder.title, body: reminder.body, href: reminder.href, dedupe_key: reminder.key }] : [];
    });

    if (rows.length) {
      const { error: insertError } = await db().from("agent_notifications").upsert(rows, { onConflict: "agent_id,dedupe_key", ignoreDuplicates: true });
      if (insertError) {
        if (/dedupe_key|no unique|ON CONFLICT/i.test(insertError.message)) throw new Error("Run migration 0014_notification_dedupe.sql in Supabase first.");
        throw new Error(insertError.message);
      }
    }
    return NextResponse.json({ success: true, data: { checked: data?.length ?? 0, reminders: rows.length } });
  } catch (error) {
    console.error("[GET /api/cron/renewal-reminders]", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
