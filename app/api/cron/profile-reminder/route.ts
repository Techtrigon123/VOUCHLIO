import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { db } from "@/lib/db/supabase";
import { hasColumn } from "@/lib/db/repo";
import { needsQuickSetup } from "@/lib/agent/profile";
import type { PartnerType } from "@/lib/agent/types";
import { emailConfigured, escapeHtml, sendEmail } from "@/lib/email";
import { SITE } from "@/lib/site";

/**
 * Scheduled job: emails agents who signed up but never finished quick setup (/setup).
 * Each agent gets the reminder at most once — profile_reminder_sent_at is claimed
 * atomically before sending, so overlapping runs can't email anyone twice.
 *
 * Called by Vercel Cron (see vercel.json) or any scheduler with
 * `Authorization: Bearer <CRON_SECRET>`.
 */

export const dynamic = "force-dynamic";

/** How long after signup to wait before reminding. */
const REMIND_AFTER_MS = 24 * 60 * 60 * 1000;
/** Don't email accounts older than this — they signed up long before the reminder existed. */
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const BATCH = 50;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const given = req.headers.get("authorization") ?? "";
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(hash(given), hash(`Bearer ${secret}`));
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  company_name: string | null;
  partner_type: PartnerType | null;
  partner_type_other: string | null;
  mobile: string | null;
  state: string | null;
  city: string | null;
}

function reminderEmail(name: string) {
  const link = `${SITE.url}/setup`;
  const first = name.trim().split(/\s+/)[0] || "there";
  const subject = "You're almost there — complete your Vouchlio profile";
  const text = [
    `Hi ${first},`,
    "",
    "You created your Vouchlio account but haven't finished setting up your profile yet.",
    "It takes about a minute, and then you can start creating branded hotel vouchers, air tickets and invoices.",
    "",
    `Complete your profile: ${link}`,
    "",
    "Need help? Just reply to this email.",
    "— The Vouchlio Team",
  ].join("\n");
  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
    <tr><td>
      <p style="margin:0 0 16px;font-size:16px">Hi ${escapeHtml(first)},</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6">You created your Vouchlio account but haven't finished setting up your profile yet.</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6">It takes about a minute, and then you can start creating branded hotel vouchers, air tickets and invoices.</p>
      <p style="margin:0 0 28px"><a href="${link}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px">Complete my profile</a></p>
      <p style="margin:0;font-size:13px;color:#6e6e73;line-height:1.6">Need help? Just reply to this email.<br>— The Vouchlio Team</p>
    </td></tr>
  </table>
</body></html>`;
  return { subject, text, html };
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!emailConfigured()) return NextResponse.json({ success: false, error: "Email isn't set up — add SMTP_HOST, SMTP_USER and SMTP_PASS." }, { status: 503 });
  if (!(await hasColumn("users", "profile_reminder_sent_at"))) {
    return NextResponse.json(
      { success: false, error: "Run supabase/migrations/0008_profile_reminders.sql first." },
      { status: 503 }
    );
  }

  try {
    const now = Date.now();
    // Coarse filter in SQL (a quick-setup field is empty); needsQuickSetup() below is the exact check.
    const { data, error } = await db()
      .from("users")
      .select("id,name,email,company_name,partner_type,partner_type_other,mobile,state,city")
      .is("profile_reminder_sent_at", null)
      .neq("status", "SUSPENDED")
      .lt("created_at", new Date(now - REMIND_AFTER_MS).toISOString())
      .gt("created_at", new Date(now - MAX_AGE_MS).toISOString())
      .or("partner_type.is.null,company_name.is.null,mobile.is.null,state.is.null,city.is.null")
      .order("created_at", { ascending: true })
      .limit(BATCH);
    if (error) throw new Error(`Supabase: ${error.message}`);

    let sent = 0;
    let failed = 0;
    for (const u of (data ?? []) as Candidate[]) {
      const incomplete = needsQuickSetup({
        name: u.name,
        companyName: u.company_name ?? undefined,
        partnerType: u.partner_type ?? undefined,
        partnerTypeOther: u.partner_type_other ?? undefined,
        mobile: u.mobile ?? undefined,
        state: u.state ?? undefined,
        city: u.city ?? undefined,
      });
      if (!incomplete) continue;

      // Claim first: only the run that flips NULL → now() sends the email.
      const claimed = await db()
        .from("users")
        .update({ profile_reminder_sent_at: new Date().toISOString() })
        .eq("id", u.id)
        .is("profile_reminder_sent_at", null)
        .select("id");
      if (claimed.error) throw new Error(`Supabase: ${claimed.error.message}`);
      if (!claimed.data?.length) continue;

      try {
        await sendEmail({ to: u.email, ...reminderEmail(u.name) });
        sent++;
      } catch (err) {
        failed++;
        console.error(`[cron/profile-reminder] send failed for ${u.id}`, err);
        // Release the claim so the next run retries this agent.
        await db().from("users").update({ profile_reminder_sent_at: null }).eq("id", u.id);
      }
    }

    return NextResponse.json({ success: true, checked: data?.length ?? 0, sent, failed });
  } catch (error) {
    console.error("[GET /api/cron/profile-reminder]", error);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}
