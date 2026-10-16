// Send one test email with the SMTP settings in .env.local, to check the mailbox works before deploying.
//
//   npm run test-email -- you@example.com
//
// Uses SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and EMAIL_FROM — the same settings the app uses
// for password resets (lib/email.ts).

import { readFileSync } from "node:fs";
import nodemailer from "nodemailer";

function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    console.error("No .env.local found in this folder.");
    process.exit(1);
  }
  return env;
}

const to = process.argv[2];
if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
  console.error("Usage: npm run test-email -- you@example.com");
  process.exit(1);
}

const env = loadEnv();
for (const k of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"]) {
  if (!env[k]) {
    console.error(`${k} is missing from .env.local.`);
    process.exit(1);
  }
}

const port = Number(env.SMTP_PORT || 465);
const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port,
  secure: port === 465,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

try {
  await transport.verify();
  console.log(`Signed in to ${env.SMTP_HOST}:${port} as ${env.SMTP_USER}.`);
  const info = await transport.sendMail({
    from: env.EMAIL_FROM || `Vouchlio <${env.SMTP_USER}>`,
    to,
    subject: "Vouchlio test email",
    text: "If you can read this, password-reset emails will work.",
  });
  console.log(`Sent to ${to} (message id ${info.messageId}). Check the inbox and the spam folder.`);
} catch (e) {
  console.error(`Failed: ${e.message}`);
  if (/auth|535|credentials/i.test(e.message)) console.error("→ Check SMTP_USER is the full email address and SMTP_PASS is that mailbox's password.");
  if (/timeout|ECONN|ENOTFOUND/i.test(e.message)) console.error("→ Check SMTP_HOST and SMTP_PORT (Hostinger: smtp.hostinger.com, 465).");
  process.exit(1);
}
