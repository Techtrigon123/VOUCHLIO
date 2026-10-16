import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { findUserByEmail, updateUser } from "@/lib/db/repo";
import { hashToken } from "@/lib/auth/jwt";
import { ACCOUNT_RULES, accountKey, checkRateLimit } from "@/lib/rate-limit";
import { emailConfigured, escapeHtml, sendEmail } from "@/lib/email";
import { SITE } from "@/lib/site";

function resetEmail(name: string, link: string) {
  const first = name.trim().split(/\s+/)[0] || "there";
  const subject = "Reset your Vouchlio password";
  const text = [
    `Hi ${first},`,
    "",
    "We received a request to reset the password for your Vouchlio account.",
    `Reset your password: ${link}`,
    "",
    "This link expires in 1 hour and can be used once.",
    "If you didn't ask for this, you can ignore this email — your password won't change.",
    "",
    "— The Vouchlio Team",
  ].join("\n");
  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
    <tr><td>
      <p style="margin:0 0 16px;font-size:16px">Hi ${escapeHtml(first)},</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6">We received a request to reset the password for your Vouchlio account.</p>
      <p style="margin:0 0 28px"><a href="${link}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px">Reset my password</a></p>
      <p style="margin:0 0 12px;font-size:13px;color:#6e6e73;line-height:1.6">This link expires in 1 hour and can be used once.</p>
      <p style="margin:0;font-size:13px;color:#6e6e73;line-height:1.6">If you didn't ask for this, you can ignore this email — your password won't change.<br>— The Vouchlio Team</p>
    </td></tr>
  </table>
</body></html>`;
  return { subject, text, html };
}

const forgotSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(200),
});

const GENERIC = "If an account exists for that email, a reset link has been sent.";
const RESET_TTL_MS = 1000 * 60 * 60; // 1 hour

export async function POST(req: NextRequest) {
  try {
    const parsed = forgotSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      const message = parsed.error.issues?.[0]?.message || "Invalid request.";
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    // Per-account limit: stops someone spamming one person's inbox from many IPs.
    // Over the limit we still answer generically so the response reveals nothing.
    const limit = await checkRateLimit(ACCOUNT_RULES.forgot, accountKey(parsed.data.email));
    if (!limit.allowed) return NextResponse.json({ success: true, message: GENERIC });

    const user = await findUserByEmail(parsed.data.email);
    // Same response whether or not the email exists, so accounts can't be probed.
    if (!user) return NextResponse.json({ success: true, message: GENERIC });

    // Only the hash is stored, so a database leak can't be used to reset passwords.
    const resetToken = randomBytes(32).toString("base64url");
    await updateUser(user.id, {
      resetToken: hashToken(resetToken),
      resetTokenExpiry: new Date(Date.now() + RESET_TTL_MS),
    });

    const link = `${SITE.url}/reset-password/${resetToken}`;
    // The token is never returned in the HTTP response. For local testing it is
    // also printed to the server terminal.
    if (process.env.NODE_ENV !== "production") {
      console.info(`[forgot-password] Reset link for ${user.email}: ${link}`);
    }
    if (emailConfigured()) {
      // A failed send is logged, not reported, so the response still reveals nothing.
      await sendEmail({ to: user.email, ...resetEmail(user.name, link) }).catch((err) =>
        console.error("[forgot-password] send failed", err)
      );
    } else {
      console.error("[forgot-password] Email isn't set up (SMTP_HOST / SMTP_USER / SMTP_PASS) — reset email not sent.");
    }

    return NextResponse.json({ success: true, message: GENERIC });
  } catch (error) {
    console.error("[POST /api/auth/forgot-password]", error);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}
