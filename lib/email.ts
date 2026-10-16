import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Transactional email (password resets, profile reminders).
 *
 * Sends through your own mailbox over SMTP — e.g. support@vouchlio.com on Hostinger:
 *   SMTP_HOST=smtp.hostinger.com  SMTP_PORT=465  SMTP_USER=support@vouchlio.com  SMTP_PASS=<mailbox password>
 * Falls back to Resend (https://resend.com) when only RESEND_API_KEY is set.
 */
const DEFAULT_FROM = "Vouchlio <support@vouchlio.com>";
const REPLY_TO = "support@vouchlio.com";

const env = (k: string) => process.env[k]?.trim() || "";
const smtpConfigured = () => !!(env("SMTP_HOST") && env("SMTP_USER") && env("SMTP_PASS"));

export function emailConfigured(): boolean {
  return smtpConfigured() || !!env("RESEND_API_KEY");
}

/** The sender. Most mailboxes (Hostinger included) reject a From address other than the signed-in mailbox. */
function fromAddress(): string {
  return env("EMAIL_FROM") || (env("SMTP_USER") ? `Vouchlio <${env("SMTP_USER")}>` : DEFAULT_FROM);
}

// One connection setup per server instance, reused across requests.
let transport: Transporter | null = null;
function smtp(): Transporter {
  if (transport) return transport;
  const port = Number(env("SMTP_PORT") || 465);
  transport = nodemailer.createTransport({
    host: env("SMTP_HOST"),
    port,
    secure: port === 465, // 465 = SSL from the start; 587 upgrades with STARTTLS
    auth: { user: env("SMTP_USER"), pass: env("SMTP_PASS") },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transport;
}

export async function sendEmail(input: { to: string; subject: string; html: string; text: string }): Promise<void> {
  if (smtpConfigured()) {
    await smtp().sendMail({ from: fromAddress(), replyTo: REPLY_TO, to: input.to, subject: input.subject, text: input.text, html: input.html });
    return;
  }

  const key = env("RESEND_API_KEY");
  if (!key) throw new Error("Email isn't set up. Add SMTP_HOST, SMTP_USER and SMTP_PASS (or RESEND_API_KEY).");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: fromAddress(), reply_to: REPLY_TO, ...input }),
  });
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
