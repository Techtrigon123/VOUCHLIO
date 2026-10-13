import "server-only";
import crypto from "node:crypto";
import Razorpay from "razorpay";
import { db } from "@/lib/db/supabase";

/**
 * Razorpay for plan payments. Keys live only in the environment (never in app_settings):
 *   RAZORPAY_KEY_ID          public key id, also sent to the browser checkout
 *   RAZORPAY_KEY_SECRET      server only — signs/verifies payments
 *   RAZORPAY_WEBHOOK_SECRET  server only — the secret set on the webhook in the Razorpay dashboard
 * Use rzp_test_… keys while testing; switching to rzp_live_… needs no code change.
 */

export const isRazorpayConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim());

export const razorpayKeyId = () => process.env.RAZORPAY_KEY_ID?.trim() ?? "";

let client: Razorpay | null = null;
export function razorpay(): Razorpay {
  if (!isRazorpayConfigured()) throw new Error("Razorpay keys are not set (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).");
  client ??= new Razorpay({ key_id: razorpayKeyId(), key_secret: process.env.RAZORPAY_KEY_SECRET!.trim() });
  return client;
}

/** Constant-time compare of two hex HMACs. */
function safeEqualHex(expected: string, received: string): boolean {
  if (!/^[0-9a-f]+$/i.test(received) || received.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}

/** Checkout callback signature: HMAC-SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC-SHA256(raw request body, webhook secret). The body must be the exact raw text. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Razorpay SDK errors carry { statusCode, error: { description } }; turn them into a loggable line. */
export function razorpayErrorText(err: unknown): string {
  const e = err as { statusCode?: number; error?: { description?: string; code?: string } } | null;
  if (e?.error?.description) return `Razorpay ${e.statusCode ?? ""} ${e.error.code ?? ""}: ${e.error.description}`.replace(/\s+/g, " ");
  return err instanceof Error ? err.message : String(err);
}

export interface CaptureResult {
  paymentId: string;
  agentId: string;
  plan: string;
  cycle: string;
  expiresAt: string | null;
  alreadyDone: boolean;
}

/**
 * Confirm a Razorpay payment with Razorpay itself, then activate the plan.
 * Never trusts the browser: the amount, order and status are read back from the Razorpay API.
 * An "authorized" payment (manual-capture accounts) is captured here for the exact order amount.
 * Safe to call from both the checkout callback and the webhook — the database function runs once.
 */
export async function confirmAndActivate(orderId: string, paymentId: string): Promise<CaptureResult> {
  const rzp = razorpay();
  let payment = await rzp.payments.fetch(paymentId);
  if (payment.order_id !== orderId) throw new Error(`Payment ${paymentId} belongs to order ${payment.order_id}, not ${orderId}`);
  if (payment.currency !== "INR") throw new Error(`Unexpected currency ${payment.currency}`);

  // Capture the payment's own amount: with "customer fee bearer" on, Razorpay adds its fee on top of the order.
  if (payment.status === "authorized") payment = await rzp.payments.capture(paymentId, Number(payment.amount), "INR");
  if (payment.status !== "captured" && payment.status !== "refunded") throw new Error(`Payment ${paymentId} is ${payment.status}, not captured`);

  // The order amount is what we charged for the plan (set on our server). The payment may be higher by the
  // gateway fee the customer paid, but never lower.
  const order = await rzp.orders.fetch(orderId);
  if (Number(payment.amount) < Number(order.amount)) throw new Error(`Payment ${paymentId} (${payment.amount}) is less than order ${orderId} (${order.amount})`);

  const { data, error } = await db().rpc("razorpay_capture_plan_payment", {
    p_order_id: orderId,
    p_payment_id: paymentId,
    p_amount_paise: Number(order.amount),
    p_method: String(payment.method ?? ""),
  });
  if (error) throw new Error(`Supabase: ${error.message}`);
  const row = (data as { payment_id: string; agent_id: string; plan: string; cycle: string; expires_at: string | null; already_done: boolean }[] | null)?.[0];
  if (!row) throw new Error(`Capture returned nothing for order ${orderId}`);
  return { paymentId: row.payment_id, agentId: row.agent_id, plan: row.plan, cycle: row.cycle, expiresAt: row.expires_at, alreadyDone: row.already_done };
}
