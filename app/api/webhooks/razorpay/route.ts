import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/supabase";
import { confirmAndActivate, razorpayErrorText, verifyWebhookSignature } from "@/lib/payments/razorpay";

/**
 * Razorpay webhook. In the Razorpay dashboard → Settings → Webhooks, add
 *   URL:     https://<your domain>/api/webhooks/razorpay
 *   Secret:  the same value as RAZORPAY_WEBHOOK_SECRET
 *   Events:  payment.captured, payment.failed, order.paid, refund.processed, refund.failed
 *
 * Razorpay retries any non-2xx response, so:
 * - a bad signature → 400 (never processed);
 * - an event we've already processed → 200 straight away (x-razorpay-event-id dedup);
 * - a processing error → 500, so Razorpay retries later.
 */

type Json = Record<string, unknown>;
const entity = (payload: Json, key: string) => ((payload[key] as Json | undefined)?.entity ?? null) as Json | null;

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature)) {
    console.warn("[razorpay webhook] rejected: bad or missing signature");
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let event: Json;
  try {
    event = JSON.parse(raw) as Json;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const name = String(event.event ?? "");
  const payload = (event.payload ?? {}) as Json;
  const payment = entity(payload, "payment");
  const refund = entity(payload, "refund");
  const order = entity(payload, "order");
  const eventId = req.headers.get("x-razorpay-event-id") ?? `${name}:${String(refund?.id ?? payment?.id ?? order?.id ?? "")}`;

  const { data: seen } = await db().from("razorpay_events").select("processed_at").eq("id", eventId).maybeSingle();
  if (seen?.processed_at) return NextResponse.json({ ok: true, duplicate: true });
  if (!seen) {
    const { error } = await db()
      .from("razorpay_events")
      .insert({ id: eventId, event: name, entity_id: String(refund?.id ?? payment?.id ?? order?.id ?? ""), payload: event });
    if (error && !/duplicate key/i.test(error.message)) {
      console.error("[razorpay webhook] log failed", error.message);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  }

  try {
    await handle(name, payment, refund);
    await db().from("razorpay_events").update({ processed_at: new Date().toISOString(), error: null }).eq("id", eventId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = razorpayErrorText(err);
    console.error("[razorpay webhook]", name, message);
    await db().from("razorpay_events").update({ error: message.slice(0, 1000) }).eq("id", eventId);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

async function handle(name: string, payment: Json | null, refund: Json | null) {
  switch (name) {
    case "payment.captured":
    case "order.paid": {
      const orderId = String(payment?.order_id ?? "");
      const paymentId = String(payment?.id ?? "");
      if (!orderId || !paymentId) return;
      if (!(await isOurOrder(orderId))) return; // payments for other products on the same account
      await confirmAndActivate(orderId, paymentId);
      return;
    }
    case "payment.failed": {
      const orderId = String(payment?.order_id ?? "");
      if (!orderId) return;
      const reason = String(payment?.error_description ?? payment?.error_reason ?? "Payment failed").slice(0, 300);
      // Only note it on an unpaid order — the agent may retry and succeed on the same order.
      await db().from("plan_payments").update({ failure_reason: reason }).eq("razorpay_order_id", orderId).eq("status", "created");
      return;
    }
    case "refund.processed":
    case "refund.failed": {
      const paymentId = String(refund?.payment_id ?? "");
      if (!paymentId) return;
      await db()
        .from("plan_payments")
        .update({ refund_status: name === "refund.processed" ? "processed" : "failed", razorpay_refund_id: String(refund?.id ?? "") || null })
        .eq("razorpay_payment_id", paymentId);
      return;
    }
    default:
      return; // other events are logged only
  }
}

async function isOurOrder(orderId: string): Promise<boolean> {
  const { data } = await db().from("plan_payments").select("id").eq("razorpay_order_id", orderId).maybeSingle();
  return Boolean(data);
}
